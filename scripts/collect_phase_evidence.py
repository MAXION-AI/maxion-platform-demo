#!/usr/bin/env python3
"""Collect the fixed five clean-candidate command reports for one program phase."""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bounded_process import BoundedProcessError, run_bounded
import program_ledger

ROOT = Path(__file__).resolve().parents[1]


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, text=True, timeout=10, check=False
    )
    if result.returncode != 0:
        raise program_ledger.LedgerError(result.stderr.strip() or "Git command failed")
    return result.stdout.strip()


def _assert_clean_candidate(repo: Path, candidate: str, source_tree: str) -> None:
    if _git(repo, "rev-parse", "HEAD^{commit}") != candidate:
        raise program_ledger.LedgerError("collector HEAD moved away from the exact candidate C")
    if _git(repo, "rev-parse", "HEAD:src") != source_tree:
        raise program_ledger.LedgerError("collector source tree changed while commands were running")
    if _git(repo, "status", "--porcelain=v1"):
        raise program_ledger.LedgerError("collector requires a clean candidate checkout")


def _fsync_directory(path: Path) -> None:
    descriptor = os.open(str(path), os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _publish_reports(repo: Path, output_dir: Path, reports: list[dict[str, Any]]) -> list[Path]:
    """Atomically publish one complete directory from external same-filesystem staging.

    Before the directory rename, consumers see no phase directory. After it, they see
    the complete fixed report set. If the process crashes after rename, the complete
    final directory is the durable outcome and a retry truthfully refuses to overwrite it.
    """

    if not reports:
        raise program_ledger.LedgerError("collector has no command reports to publish")
    filenames = [f"command-{report['id']}.json" for report in reports]
    if len(filenames) != len(set(filenames)):
        raise program_ledger.LedgerError("collector report IDs must be unique")
    output_parent = output_dir.parent
    lock_path = repo.parent / ".maxion-phase-evidence-publish.lock"
    staging: Path | None = None
    renamed = False
    try:
        output_parent.mkdir(parents=True, exist_ok=True)
        lock_path.touch(mode=0o600, exist_ok=True)
        if os.stat(repo.parent).st_dev != os.stat(output_parent).st_dev:
            raise program_ledger.LedgerError(
                "collector staging and final evidence directory must share one filesystem"
            )
        staging = Path(
            tempfile.mkdtemp(
                prefix=f".phase-{reports[0]['phase']}-evidence-", dir=str(repo.parent)
            )
        )
        for filename, report in zip(filenames, reports):
            path = staging / filename
            descriptor = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                json.dump(report, stream, indent=2, sort_keys=True)
                stream.write("\n")
                stream.flush()
                os.fsync(stream.fileno())
        _fsync_directory(staging)
        with lock_path.open("r+", encoding="utf-8") as lock:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
            if output_dir.exists():
                raise program_ledger.LedgerError(
                    "collector refuses to overwrite an existing phase evidence directory"
                )
            os.rename(str(staging), str(output_dir))
            renamed = True
            _fsync_directory(output_parent)
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)
    except program_ledger.LedgerError:
        raise
    except (OSError, TypeError, ValueError) as exc:
        suffix = (
            "; the complete final directory was published and retries will refuse to overwrite it"
            if renamed else "; no final report directory was published"
        )
        raise program_ledger.LedgerError(
            f"collector could not durably publish the complete command report set: {exc}{suffix}"
        ) from exc
    finally:
        if staging is not None and staging.exists():
            shutil.rmtree(str(staging), ignore_errors=True)
    return [output_dir / filename for filename in filenames]


def collect(repo: Path, candidate: str, phase: int) -> list[Path]:
    if not program_ledger.SHA1_RE.fullmatch(candidate):
        raise program_ledger.LedgerError("candidate must be an exact lowercase 40-character SHA-1")
    repo = repo.resolve()
    source_tree = _git(repo, "rev-parse", f"{candidate}:src")
    _assert_clean_candidate(repo, candidate, source_tree)
    environment = os.environ.copy()
    environment["MAXION_PROGRAM_PHASE"] = str(phase)
    environment["MAXION_BUILD_REVISION"] = candidate
    reports: list[dict[str, Any]] = []
    for command_id, command in program_ledger.CANONICAL_COMMANDS.items():
        _assert_clean_candidate(repo, candidate, source_tree)
        started_at = _timestamp()
        stdout = bytearray()
        stderr = bytearray()
        exit_code = 0
        for argv in program_ledger.CANONICAL_EXECUTION[command_id]:
            try:
                result = run_bounded(
                    argv,
                    cwd=repo,
                    env=environment,
                    timeout=program_ledger.COMMAND_TIMEOUT_SECONDS,
                    stdout_limit=program_ledger.MAX_CAPTURE_BYTES - len(stdout),
                    stderr_limit=program_ledger.MAX_CAPTURE_BYTES - len(stderr),
                )
            except (BoundedProcessError, OSError, ValueError) as exc:
                raise program_ledger.LedgerError(
                    f"command {command_id!r} could not complete safely: {exc}; no reports were written"
                ) from exc
            stdout.extend(result.stdout)
            stderr.extend(result.stderr)
            if len(stdout) > program_ledger.MAX_CAPTURE_BYTES or len(stderr) > program_ledger.MAX_CAPTURE_BYTES:
                raise program_ledger.LedgerError(
                    f"command {command_id!r} output exceeds {program_ledger.MAX_CAPTURE_BYTES} bytes; "
                    "no reports were written"
                )
            exit_code = result.returncode
            if exit_code != 0:
                break
        if exit_code != 0:
            raise program_ledger.LedgerError(
                f"command {command_id!r} failed with exit code {exit_code}; no reports were written"
            )
        _assert_clean_candidate(repo, candidate, source_tree)
        stdout_text = stdout.decode("utf-8", errors="replace")
        stderr_text = stderr.decode("utf-8", errors="replace")
        reports.append({
            "schemaVersion": 2,
            "program": program_ledger.PROGRAM,
            "phase": phase,
            "kind": "command-result",
            "candidateSha": candidate,
            "sourceTreeSha1": source_tree,
            "id": command_id,
            "command": command,
            "status": "PASS",
            "exitCode": 0,
            "runSha": candidate,
            "stdout": stdout_text,
            "stderr": stderr_text,
            "stdoutSha256": hashlib.sha256(stdout_text.encode("utf-8")).hexdigest(),
            "stderrSha256": hashlib.sha256(stderr_text.encode("utf-8")).hexdigest(),
            "worktree": str(repo),
            "cleanBefore": True,
            "cleanAfter": True,
            "startedAt": started_at,
            "finishedAt": _timestamp(),
        })
    _assert_clean_candidate(repo, candidate, source_tree)
    output_dir = repo / "artifacts" / "ux-audits" / f"phase-{phase}"
    if output_dir.exists():
        raise program_ledger.LedgerError(
            "collector refuses to overwrite an existing phase evidence directory"
        )
    return _publish_reports(repo, output_dir, reports)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--phase", required=True, type=int)
    parser.add_argument("--repo", type=Path, default=ROOT)
    args = parser.parse_args(argv)
    try:
        paths = collect(args.repo, args.candidate, args.phase)
    except program_ledger.LedgerError as exc:
        print(f"Phase evidence collector: FAIL: {exc}", file=sys.stderr)
        return 1
    for path in paths:
        print(path.relative_to(args.repo.resolve()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
