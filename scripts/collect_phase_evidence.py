#!/usr/bin/env python3
"""Collect the fixed five clean-candidate command reports for one program phase."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import program_ledger

ROOT = Path(__file__).resolve().parents[1]


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _unlink_if_exists(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        pass


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


def _publish_reports(paths: list[Path], reports: list[dict[str, Any]]) -> None:
    """Publish a complete report set or roll back every file created by this call."""

    if not paths:
        raise program_ledger.LedgerError("collector has no command reports to publish")
    if len(paths) != len(reports):
        raise program_ledger.LedgerError("collector report paths do not match the report set")
    paths[0].parent.mkdir(parents=True, exist_ok=True)
    staged: list[Path] = []
    published: list[Path] = []
    try:
        for path, report in zip(paths, reports):
            descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
            temporary = Path(temporary_name)
            staged.append(temporary)
            with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                json.dump(report, stream, indent=2, sort_keys=True)
                stream.write("\n")
                stream.flush()
                os.fsync(stream.fileno())
        for temporary, path in zip(staged, paths):
            # link() is an atomic, no-overwrite publication within this directory.
            os.link(temporary, path)
            published.append(path)
    except (OSError, ValueError) as exc:
        for path in reversed(published):
            _unlink_if_exists(path)
        raise program_ledger.LedgerError(
            f"collector could not publish the complete command report set: {exc}"
        ) from exc
    finally:
        for temporary in staged:
            _unlink_if_exists(temporary)


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
                result = subprocess.run(
                    argv,
                    cwd=repo,
                    env=environment,
                    capture_output=True,
                    timeout=2700,
                    check=False,
                )
            except (OSError, subprocess.SubprocessError) as exc:
                raise program_ledger.LedgerError(f"command {command_id!r} could not run: {exc}") from exc
            stdout.extend(result.stdout)
            stderr.extend(result.stderr)
            if len(stdout) > program_ledger.MAX_CAPTURE_BYTES or len(stderr) > program_ledger.MAX_CAPTURE_BYTES:
                raise program_ledger.LedgerError(
                    f"command {command_id!r} output exceeds {program_ledger.MAX_CAPTURE_BYTES} bytes"
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
    paths = [output_dir / f"command-{report['id']}.json" for report in reports]
    if any(path.exists() for path in paths):
        raise program_ledger.LedgerError("collector refuses to overwrite an existing command report")
    if len(paths) != len(reports):
        raise program_ledger.LedgerError("collector report paths do not match the canonical command set")
    _publish_reports(paths, reports)
    return paths


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
