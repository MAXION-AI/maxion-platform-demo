#!/usr/bin/env python3
"""Atomically append to and validate the Maxion UI foundation phase ledger."""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path, PurePosixPath
from typing import Any, Iterator

ROOT = Path(__file__).resolve().parents[1]
TRACKED_LEDGER = ROOT / "docs" / "operations" / "program-phase-ledger.json"
DEFAULT_EXTERNAL_LEDGER = Path(
    "/Users/abhinavshankar/.codex/program-ledgers/"
    "maxion-platform-demo-ui-foundation/ledger.json"
)
PROGRAM = "maxion-platform-demo-ui-foundation"
REPOSITORY = "https://github.com/MAXION-AI/maxion-platform-demo.git"
PENDING_STATUS = "merged-awaiting-clean-sha-independent-acceptance"
ACCEPTED_STATUS = "accepted"
ALLOWED_STATUSES = {PENDING_STATUS, ACCEPTED_STATUS}
PENDING_EVIDENCE_QUALIFICATIONS = {
    "historical-pre-merge-only",
    "candidate-only",
    "clean-sha-review-pending",
}
ACCEPTED_EVIDENCE_QUALIFICATION = "clean-sha-independent-acceptance"
REQUIRED_COMMAND_IDS = {
    "check-program", "build", "audit-high", "phase-tests", "diff-check",
}
REFERENCE_SHEET_PATHS = {
    f"docs/operations/ux-reference-sheets/{name}.md"
    for name in (
        "agentix-operations", "agentix-run-canvas", "approvals-workspace",
        "consult-max-workspace", "discover-workspace", "execute-workspace",
        "help-workspace", "integrations-workspace", "plan-workspace",
        "platform-shell-dashboard", "projects-workspace", "settings-workspace",
        "usage-workspace",
    )
}
SHA1_RE = re.compile(r"^[0-9a-f]{40}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
TIMESTAMP_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
PR_URL_RE = re.compile(r"https://github\.com/MAXION-AI/maxion-platform-demo/pull/\d+")
COMMON_RECORD_FIELDS = {
    "phase", "status", "baseSha", "candidateSha", "prUrl", "prHeadSha", "mergeSha",
    "independentAcceptanceSha", "evidenceCommitSha", "sourceTreeSha1", "builder", "reviewers",
    "evidence", "evidenceQualification",
}
ACCEPTED_RECORD_FIELDS = {
    "lockSha256", "manifestSha256", "referenceSheetSha256",
    "referenceSheetContractSha256", "commands",
}


class LedgerError(ValueError):
    """Raised when durable program state is malformed or inconsistent."""


def _canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def record_sha256(record: dict[str, Any]) -> str:
    body = {key: value for key, value in record.items() if key != "recordSha256"}
    return hashlib.sha256(_canonical(body)).hexdigest()


def reference_sheet_contract_sha256(data: bytes) -> str:
    """Hash immutable sheet contract content while excluding evidence/sign-off mutations."""

    text = data.decode("utf-8")
    evidence_heading = re.search(r"^## 7\. Evidence[^\n]*$", text, re.MULTILINE)
    signoff_heading = re.search(r"^## 8\. Sign-off[^\n]*$", text, re.MULTILINE)
    if not evidence_heading or not signoff_heading or signoff_heading.start() <= evidence_heading.start():
        raise LedgerError("reference sheet is missing Section 7 evidence plan")
    before_evidence = text[:evidence_heading.start()]
    before_evidence = re.sub(r"^- \*\*Status:\*\*.*$", "", before_evidence, flags=re.MULTILINE)
    evidence_body = text[evidence_heading.end():signoff_heading.start()]
    projected_rows: list[str] = []
    for line in evidence_body.splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells:
            projected_rows.append(cells[0])
    canonical = before_evidence.strip() + "\n## 7. Evidence plan\n" + "\n".join(projected_rows)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _load(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise LedgerError(f"ledger does not exist: {path}") from None
    except (OSError, json.JSONDecodeError) as exc:
        raise LedgerError(f"cannot load ledger {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise LedgerError("ledger root must be an object")
    return value


def _validate_sha(value: Any, field: str, *, nullable: bool = False) -> None:
    if nullable and value is None:
        return
    if not isinstance(value, str) or not SHA1_RE.fullmatch(value):
        raise LedgerError(f"{field} must be a 40-character lowercase Git SHA-1")


def _repo_relative_path(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value or "\\" in value or ":" in value:
        raise LedgerError(f"{field} must use a safe repository-relative POSIX path")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts) or str(path) != value:
        raise LedgerError(f"{field} must use a safe repository-relative POSIX path")
    return value


def _git(repo_root: Path, *args: str, allow_status_one: bool = False) -> str | bool:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_root), *args], capture_output=True, text=True,
            timeout=10, check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise LedgerError(f"Git verification failed: {exc}") from exc
    if allow_status_one and result.returncode in {0, 1}:
        return result.returncode == 0
    if result.returncode != 0:
        raise LedgerError(f"Git verification failed: {result.stderr.strip() or 'Git command failed'}")
    return result.stdout.strip()


def _require_commit(repo_root: Path, sha: str, field: str) -> None:
    try:
        _git(repo_root, "cat-file", "-e", f"{sha}^{{commit}}")
    except LedgerError as exc:
        raise LedgerError(f"{field} does not identify an existing Git commit") from exc


def _require_ancestor(repo_root: Path, ancestor: str, descendant: str, relationship: str) -> None:
    if not _git(repo_root, "merge-base", "--is-ancestor", ancestor, descendant, allow_status_one=True):
        raise LedgerError(f"Git ancestry is invalid: expected {relationship}")


def _git_tree(repo_root: Path, commit: str, path: str) -> str:
    try:
        return str(_git(repo_root, "rev-parse", f"{commit}:{path}"))
    except LedgerError as exc:
        raise LedgerError(f"cannot resolve {path} tree at commit {commit}") from exc


def _git_blob(repo_root: Path, commit: str, path: str) -> bytes:
    safe_path = _repo_relative_path(path, "evidence/artifact path")
    try:
        kind = str(_git(repo_root, "cat-file", "-t", f"{commit}:{safe_path}"))
        if kind != "blob":
            raise LedgerError(f"{safe_path} at {commit} is not a file")
        result = subprocess.run(
            ["git", "-C", str(repo_root), "show", f"{commit}:{safe_path}"],
            capture_output=True, timeout=10, check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise LedgerError(f"cannot read {safe_path} at commit {commit}: {exc}") from exc
    if result.returncode != 0:
        raise LedgerError(f"{safe_path} does not exist as a file at commit {commit}")
    return result.stdout


def _git_blob_sha256(repo_root: Path, commit: str, path: str) -> str:
    return hashlib.sha256(_git_blob(repo_root, commit, path)).hexdigest()


def _validate_reviewers(record: dict[str, Any]) -> None:
    builder = record.get("builder")
    if not isinstance(builder, str) or not builder.strip():
        raise LedgerError("builder identity must be non-empty")
    reviewers = record.get("reviewers")
    if not isinstance(reviewers, dict) or set(reviewers) != {"ux", "qa"}:
        raise LedgerError("reviewers must name exactly the independent UX and QA reviewers")
    identities = [reviewers["ux"], reviewers["qa"]]
    if any(not isinstance(value, str) or not value.strip() for value in identities):
        raise LedgerError("reviewer identities must be non-empty")
    normalized = [value.strip().casefold() for value in identities]
    if normalized[0] == normalized[1]:
        raise LedgerError("UX and QA reviewer identities must be distinct")
    if builder.strip().casefold() in normalized:
        raise LedgerError("builder may not be an independent UX or QA reviewer")


def _validate_commands(record: dict[str, Any], *, accepted: bool) -> None:
    commands = record.get("commands", [])
    if not isinstance(commands, list):
        raise LedgerError("commands must be an array of structured results")
    ids: list[str] = []
    expected_keys = {"id", "command", "status", "exitCode", "evidencePath"}
    for result in commands:
        if not isinstance(result, dict) or set(result) != expected_keys:
            raise LedgerError(
                "every command result must contain exactly id, command, status, exitCode, and evidencePath"
            )
        if not all(isinstance(result[key], str) and result[key].strip() for key in ("id", "command")):
            raise LedgerError("command id and command must be non-empty strings")
        if result["status"] not in {"PASS", "FAIL"}:
            raise LedgerError("command status must be PASS or FAIL")
        if not isinstance(result["exitCode"], int):
            raise LedgerError("command exitCode must be an integer")
        if (result["status"] == "PASS") != (result["exitCode"] == 0):
            raise LedgerError("command status and exitCode disagree")
        _repo_relative_path(result["evidencePath"], "command evidencePath")
        ids.append(result["id"])
    if len(ids) != len(set(ids)):
        raise LedgerError("command result IDs must be unique")
    if accepted:
        missing = REQUIRED_COMMAND_IDS - set(ids)
        if missing:
            raise LedgerError(f"accepted record is missing required commands: {', '.join(sorted(missing))}")
        if any(result["status"] != "PASS" for result in commands):
            raise LedgerError("every accepted-record command must PASS")


def _validate_shape(record: Any, *, external: bool) -> None:
    if not isinstance(record, dict):
        raise LedgerError("every ledger record must be an object")
    missing = COMMON_RECORD_FIELDS - set(record)
    if external and "timestamp" not in record:
        missing.add("timestamp")
    if missing:
        raise LedgerError(f"record is missing required fields: {', '.join(sorted(missing))}")
    if not isinstance(record["phase"], int) or record["phase"] < 0:
        raise LedgerError("phase must be a non-negative integer")
    if record["status"] not in ALLOWED_STATUSES:
        raise LedgerError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}")
    accepted = record["status"] == ACCEPTED_STATUS
    if accepted:
        missing_accepted = ACCEPTED_RECORD_FIELDS - set(record)
        if missing_accepted:
            raise LedgerError(
                f"accepted record is missing required fields: {', '.join(sorted(missing_accepted))}"
            )
    for field in (
        "baseSha", "candidateSha", "prHeadSha", "mergeSha", "evidenceCommitSha", "sourceTreeSha1"
    ):
        _validate_sha(record[field], field)
    _validate_sha(record["independentAcceptanceSha"], "independentAcceptanceSha", nullable=True)
    if not isinstance(record["prUrl"], str) or not PR_URL_RE.fullmatch(record["prUrl"]):
        raise LedgerError("prUrl must identify a Maxion platform demo pull request")
    _validate_reviewers(record)
    evidence = record["evidence"]
    if not isinstance(evidence, list) or not evidence:
        raise LedgerError("evidence must be a non-empty array")
    for path in evidence:
        _repo_relative_path(path, "evidence path")
    reason = record.get("reasonOpen")
    qualification = record["evidenceQualification"]
    if accepted:
        if record["independentAcceptanceSha"] is None:
            raise LedgerError("accepted record requires independentAcceptanceSha")
        if reason is not None:
            raise LedgerError("accepted record reasonOpen must be null")
        if qualification != ACCEPTED_EVIDENCE_QUALIFICATION:
            raise LedgerError("accepted record has invalid evidenceQualification")
        for field in ("lockSha256", "manifestSha256"):
            if not isinstance(record[field], str) or not SHA256_RE.fullmatch(record[field]):
                raise LedgerError(f"{field} must be a lowercase SHA-256")
        for field in ("referenceSheetSha256", "referenceSheetContractSha256"):
            hashes = record[field]
            if not isinstance(hashes, dict) or set(hashes) != REFERENCE_SHEET_PATHS:
                raise LedgerError(f"accepted record {field} must cover exactly the 13 reference sheets")
            if any(not isinstance(value, str) or not SHA256_RE.fullmatch(value) for value in hashes.values()):
                raise LedgerError(f"every {field} value must be a lowercase SHA-256")
    else:
        if record["independentAcceptanceSha"] is not None:
            raise LedgerError("pending record independentAcceptanceSha must be null")
        if not isinstance(reason, str) or not reason.strip():
            raise LedgerError("pending record requires a non-empty reasonOpen")
        if qualification not in PENDING_EVIDENCE_QUALIFICATIONS:
            raise LedgerError("pending record has invalid evidenceQualification")
    _validate_commands(record, accepted=accepted)
    if external and (
        not isinstance(record["timestamp"], str) or not TIMESTAMP_RE.fullmatch(record["timestamp"])
    ):
        raise LedgerError("timestamp must use UTC YYYY-MM-DDTHH:MM:SSZ")


def _validate_git_and_artifacts(record: dict[str, Any], repo_root: Path) -> None:
    commit_fields = ["baseSha", "candidateSha", "prHeadSha", "mergeSha", "evidenceCommitSha"]
    if record["independentAcceptanceSha"] is not None:
        commit_fields.append("independentAcceptanceSha")
    for field in commit_fields:
        _require_commit(repo_root, record[field], field)
    _require_ancestor(repo_root, record["baseSha"], record["candidateSha"], "B -> C")
    _require_ancestor(repo_root, record["candidateSha"], record["prHeadSha"], "C -> E/PR head")
    _require_ancestor(repo_root, record["prHeadSha"], record["mergeSha"], "E/PR head -> M")
    if record["evidenceCommitSha"] != record["prHeadSha"]:
        raise LedgerError("evidenceCommitSha must equal prHeadSha (C or evidence-only E)")

    expected_tree = record["sourceTreeSha1"]
    for field in ("candidateSha", "prHeadSha", "mergeSha"):
        if _git_tree(repo_root, record[field], "src") != expected_tree:
            raise LedgerError(f"sourceTreeSha1 does not match {field}:src")
    acceptance = record["independentAcceptanceSha"]
    if acceptance is not None:
        _require_ancestor(repo_root, record["candidateSha"], acceptance, "C -> accepted commit")
        _require_ancestor(repo_root, acceptance, record["evidenceCommitSha"], "accepted commit -> E")
        if _git_tree(repo_root, acceptance, "src") != expected_tree:
            raise LedgerError("sourceTreeSha1 does not match independentAcceptanceSha:src")

    for path in record["evidence"]:
        _git_blob(repo_root, record["evidenceCommitSha"], path)
    for result in record.get("commands", []):
        _git_blob(repo_root, record["evidenceCommitSha"], result["evidencePath"])

    if record["status"] == ACCEPTED_STATUS:
        accepted_commit = record["independentAcceptanceSha"]
        assert isinstance(accepted_commit, str)
        expected_artifacts = {
            "pnpm-lock.yaml": record["lockSha256"],
            "docs/operations/figma-code-map.json": record["manifestSha256"],
            **record["referenceSheetSha256"],
        }
        for path, expected_hash in expected_artifacts.items():
            if _git_blob_sha256(repo_root, accepted_commit, path) != expected_hash:
                raise LedgerError(f"recorded SHA-256 does not match {path} at accepted commit")
        for path, expected_hash in record["referenceSheetContractSha256"].items():
            actual_hash = reference_sheet_contract_sha256(_git_blob(repo_root, accepted_commit, path))
            if actual_hash != expected_hash:
                raise LedgerError(f"recorded immutable-contract SHA-256 does not match {path}")


def validate_record(record: Any, *, external: bool, repo_root: Path = ROOT) -> None:
    _validate_shape(record, external=external)
    assert isinstance(record, dict)
    _validate_git_and_artifacts(record, repo_root)
    if external:
        if not SHA256_RE.fullmatch(str(record.get("previousRecordSha256", ""))):
            raise LedgerError("previousRecordSha256 must be a lowercase SHA-256")
        if not SHA256_RE.fullmatch(str(record.get("recordSha256", ""))):
            raise LedgerError("recordSha256 must be a lowercase SHA-256")
        if record["recordSha256"] != record_sha256(record):
            raise LedgerError("recordSha256 does not match the canonical record")


def validate_external(document: Any, *, repo_root: Path = ROOT) -> None:
    if not isinstance(document, dict):
        raise LedgerError("ledger root must be an object")
    if document.get("schemaVersion") != 1:
        raise LedgerError("external ledger schemaVersion must be 1")
    if document.get("program") != PROGRAM or document.get("repository") != REPOSITORY:
        raise LedgerError("external ledger program/repository identity is invalid")
    records = document.get("records")
    if not isinstance(records, list):
        raise LedgerError("external ledger records must be an array")
    previous = "0" * 64
    previous_record: dict[str, Any] | None = None
    for expected_phase, record in enumerate(records):
        validate_record(record, external=True, repo_root=repo_root)
        if record["status"] != ACCEPTED_STATUS:
            raise LedgerError("external ledger may contain only accepted phase records")
        if record["previousRecordSha256"] != previous:
            raise LedgerError("external ledger hash chain is broken")
        if record["phase"] != expected_phase:
            raise LedgerError(
                f"external ledger expected phase {expected_phase}, got {record['phase']}"
            )
        if previous_record is not None and record["baseSha"] != previous_record["mergeSha"]:
            raise LedgerError("external ledger phase baseSha must equal the prior phase mergeSha")
        previous = record["recordSha256"]
        previous_record = record


def bootstrap_external(
    document: Any,
    *,
    expected_phase: int,
    target_ref: str,
    repo_root: Path = ROOT,
    require_clean: bool = True,
) -> str:
    """Authorize a successor only from the exact latest accepted merge."""

    validate_external(document, repo_root=repo_root)
    records = document["records"]
    if not records:
        raise LedgerError("external ledger has no accepted phase to bootstrap from")
    latest = records[-1]
    if latest["phase"] != expected_phase:
        raise LedgerError(
            f"bootstrap expected accepted phase {expected_phase}, got {latest['phase']}"
        )
    target_sha = str(_git(repo_root, "rev-parse", f"{target_ref}^{{commit}}"))
    if target_sha != latest["mergeSha"]:
        raise LedgerError("bootstrap target ref does not equal the latest accepted mergeSha")
    head_sha = str(_git(repo_root, "rev-parse", "HEAD^{commit}"))
    if head_sha != latest["mergeSha"]:
        raise LedgerError("bootstrap checkout HEAD does not equal the latest accepted mergeSha")
    if require_clean and str(_git(repo_root, "status", "--porcelain=v1")):
        raise LedgerError("bootstrap checkout must be clean")
    return latest["mergeSha"]


def validate_tracked(document: Any, *, repo_root: Path = ROOT) -> None:
    if not isinstance(document, dict) or document.get("schemaVersion") != 1:
        raise LedgerError("tracked ledger schemaVersion must be 1")
    if document.get("program") != PROGRAM or document.get("repository") != REPOSITORY:
        raise LedgerError("tracked ledger program/repository identity is invalid")
    if document.get("externalAuthority") != str(DEFAULT_EXTERNAL_LEDGER):
        raise LedgerError("tracked ledger externalAuthority is invalid")
    phases = document.get("phases")
    if not isinstance(phases, list) or not phases:
        raise LedgerError("tracked ledger phases must be a non-empty array")
    for expected_phase, phase in enumerate(phases):
        validate_record(phase, external=False, repo_root=repo_root)
        if phase["phase"] != expected_phase:
            raise LedgerError(
                f"tracked ledger expected phase {expected_phase}, got {phase['phase']}"
            )


@contextmanager
def _locked(path: Path) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_suffix(path.suffix + ".lock")
    with lock_path.open("a", encoding="utf-8") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def _atomic_write(path: Path, document: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(document, stream, indent=2, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        directory_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if temporary.exists():
            temporary.unlink()


def append_record(path: Path, raw_record: Any, *, repo_root: Path = ROOT) -> dict[str, Any]:
    validate_record(raw_record, external=False, repo_root=repo_root)
    with _locked(path):
        if path.exists():
            document = _load(path)
            validate_external(document, repo_root=repo_root)
        else:
            document = {"schemaVersion": 1, "program": PROGRAM, "repository": REPOSITORY, "records": []}
        previous = document["records"][-1]["recordSha256"] if document["records"] else "0" * 64
        record = dict(raw_record)
        record["previousRecordSha256"] = previous
        record["recordSha256"] = record_sha256(record)
        document["records"].append(record)
        validate_external(document, repo_root=repo_root)
        _atomic_write(path, document)
    return record


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("--ledger", type=Path, default=DEFAULT_EXTERNAL_LEDGER)
    subparsers.add_parser("validate-tracked")
    bootstrap_parser = subparsers.add_parser("bootstrap")
    bootstrap_parser.add_argument("--ledger", type=Path, default=DEFAULT_EXTERNAL_LEDGER)
    bootstrap_parser.add_argument("--expected-phase", type=int, required=True)
    bootstrap_parser.add_argument("--target-ref", required=True)
    append_parser = subparsers.add_parser("append")
    append_parser.add_argument("--ledger", type=Path, default=DEFAULT_EXTERNAL_LEDGER)
    append_parser.add_argument("--record", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "validate":
            validate_external(_load(args.ledger))
            print(f"Program ledger: valid ({args.ledger})")
        elif args.command == "validate-tracked":
            validate_tracked(_load(TRACKED_LEDGER))
            print("Tracked program ledger: valid")
        elif args.command == "bootstrap":
            merge_sha = bootstrap_external(
                _load(args.ledger),
                expected_phase=args.expected_phase,
                target_ref=args.target_ref,
            )
            print(f"Program bootstrap: valid at phase {args.expected_phase} merge {merge_sha}")
        else:
            raw_record = _load(args.record)
            record = append_record(args.ledger, raw_record)
            print(f"Program ledger: appended phase {record['phase']} ({record['recordSha256']})")
    except LedgerError as exc:
        print(f"Program ledger: FAIL: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
