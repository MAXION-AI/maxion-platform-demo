#!/usr/bin/env python3
"""Atomically append to and validate the Maxion UI foundation phase ledger."""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import re
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

ROOT = Path(__file__).resolve().parents[1]
TRACKED_LEDGER = ROOT / "docs" / "operations" / "program-phase-ledger.json"
DEFAULT_EXTERNAL_LEDGER = Path(
    "/Users/abhinavshankar/.codex/program-ledgers/"
    "maxion-platform-demo-ui-foundation/ledger.json"
)
PROGRAM = "maxion-platform-demo-ui-foundation"
REPOSITORY = "https://github.com/MAXION-AI/maxion-platform-demo.git"
SHA1_RE = re.compile(r"^[0-9a-f]{40}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
REQUIRED_RECORD_FIELDS = {
    "phase",
    "status",
    "baseSha",
    "candidateSha",
    "prUrl",
    "prHeadSha",
    "mergeSha",
    "sourceTreeSha1",
    "lockSha256",
    "manifestSha256",
    "referenceSheetSha256",
    "reviewers",
    "evidence",
    "commands",
    "timestamp",
}


class LedgerError(ValueError):
    """Raised when durable program state is malformed or inconsistent."""


def _canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def record_sha256(record: dict[str, Any]) -> str:
    body = {key: value for key, value in record.items() if key != "recordSha256"}
    return hashlib.sha256(_canonical(body)).hexdigest()


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


def validate_record(record: Any, *, external: bool) -> None:
    if not isinstance(record, dict):
        raise LedgerError("every ledger record must be an object")
    missing = REQUIRED_RECORD_FIELDS - set(record)
    if missing:
        raise LedgerError(f"record is missing required fields: {', '.join(sorted(missing))}")
    if not isinstance(record["phase"], int) or record["phase"] < 0:
        raise LedgerError("phase must be a non-negative integer")
    if not isinstance(record["status"], str) or not record["status"].strip():
        raise LedgerError("status must be a non-empty string")
    for field in ("baseSha", "candidateSha", "prHeadSha", "mergeSha", "sourceTreeSha1"):
        _validate_sha(record[field], field)
    if not isinstance(record["prUrl"], str) or not re.fullmatch(
        r"https://github\.com/MAXION-AI/maxion-platform-demo/pull/\d+", record["prUrl"]
    ):
        raise LedgerError("prUrl must identify a Maxion platform demo pull request")
    for field in ("lockSha256", "manifestSha256"):
        if not isinstance(record[field], str) or not SHA256_RE.fullmatch(record[field]):
            raise LedgerError(f"{field} must be a lowercase SHA-256")
    sheet_hashes = record["referenceSheetSha256"]
    if not isinstance(sheet_hashes, dict) or not sheet_hashes:
        raise LedgerError("referenceSheetSha256 must be a non-empty object")
    if any(not isinstance(key, str) or not SHA256_RE.fullmatch(str(value)) for key, value in sheet_hashes.items()):
        raise LedgerError("every reference-sheet hash must be a lowercase SHA-256")
    reviewers = record["reviewers"]
    if not isinstance(reviewers, dict) or set(reviewers) != {"ux", "qa"}:
        raise LedgerError("reviewers must name exactly the independent UX and QA reviewers")
    if any(not isinstance(value, str) or not value.strip() for value in reviewers.values()):
        raise LedgerError("reviewer identities must be non-empty")
    for field in ("evidence", "commands"):
        if not isinstance(record[field], list) or not record[field]:
            raise LedgerError(f"{field} must be a non-empty array")
        if any(not isinstance(item, str) or not item.strip() for item in record[field]):
            raise LedgerError(f"{field} entries must be non-empty strings")
    if not isinstance(record["timestamp"], str) or not re.fullmatch(
        r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", record["timestamp"]
    ):
        raise LedgerError("timestamp must use UTC YYYY-MM-DDTHH:MM:SSZ")
    if external:
        if not SHA256_RE.fullmatch(str(record.get("previousRecordSha256", ""))):
            raise LedgerError("previousRecordSha256 must be a lowercase SHA-256")
        if not SHA256_RE.fullmatch(str(record.get("recordSha256", ""))):
            raise LedgerError("recordSha256 must be a lowercase SHA-256")
        if record["recordSha256"] != record_sha256(record):
            raise LedgerError("recordSha256 does not match the canonical record")


def validate_external(document: Any) -> None:
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
    previous_phase = -1
    for record in records:
        validate_record(record, external=True)
        if record["previousRecordSha256"] != previous:
            raise LedgerError("external ledger hash chain is broken")
        if record["phase"] < previous_phase:
            raise LedgerError("external ledger phases may not move backward")
        previous = record["recordSha256"]
        previous_phase = record["phase"]


def validate_tracked(document: Any) -> None:
    if not isinstance(document, dict) or document.get("schemaVersion") != 1:
        raise LedgerError("tracked ledger schemaVersion must be 1")
    if document.get("program") != PROGRAM or document.get("repository") != REPOSITORY:
        raise LedgerError("tracked ledger program/repository identity is invalid")
    if document.get("externalAuthority") != str(DEFAULT_EXTERNAL_LEDGER):
        raise LedgerError("tracked ledger externalAuthority is invalid")
    phases = document.get("phases")
    if not isinstance(phases, list) or not phases:
        raise LedgerError("tracked ledger phases must be a non-empty array")
    seen: set[int] = set()
    for phase in phases:
        if not isinstance(phase, dict) or not isinstance(phase.get("phase"), int):
            raise LedgerError("every tracked phase must be an object with an integer phase")
        if phase["phase"] in seen:
            raise LedgerError(f"tracked phase {phase['phase']} is duplicated")
        seen.add(phase["phase"])
        for field in ("baseSha", "candidateSha", "prHeadSha", "mergeSha", "sourceTreeSha1"):
            _validate_sha(phase.get(field), field)
        if phase.get("independentAcceptanceSha") is not None:
            _validate_sha(phase["independentAcceptanceSha"], "independentAcceptanceSha")
        if not isinstance(phase.get("evidence"), list) or not phase["evidence"]:
            raise LedgerError("every tracked phase needs at least one evidence path")


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


def append_record(path: Path, raw_record: Any) -> dict[str, Any]:
    validate_record(raw_record, external=False)
    with _locked(path):
        if path.exists():
            document = _load(path)
            validate_external(document)
        else:
            document = {
                "schemaVersion": 1,
                "program": PROGRAM,
                "repository": REPOSITORY,
                "records": [],
            }
        previous = document["records"][-1]["recordSha256"] if document["records"] else "0" * 64
        record = dict(raw_record)
        record["previousRecordSha256"] = previous
        record["recordSha256"] = record_sha256(record)
        document["records"].append(record)
        validate_external(document)
        _atomic_write(path, document)
    return record


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("--ledger", type=Path, default=DEFAULT_EXTERNAL_LEDGER)
    subparsers.add_parser("validate-tracked")
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
