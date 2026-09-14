#!/usr/bin/env python3
"""Prove that C-to-E contains evidence only and preserves immutable contracts."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

import program_ledger

ROOT = Path(__file__).resolve().parents[1]
SHEET_PREFIX = "docs/operations/ux-reference-sheets/"
LEDGER_PATH = "docs/operations/program-phase-ledger.json"
MANIFEST_PATH = "docs/operations/figma-code-map.json"
PLAN_PREFIX = "docs/implementation-plans/2026-09-13-maxion-platform-demo-ui-foundation/"
HANDOFF_RE = re.compile(
    r"^### Structured acceptance hand-off\s*\n\s*```json\s*\n(\{.*?\})\s*\n```\s*$",
    re.M | re.S,
)
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
VISIBLE_STATUS_RE = re.compile(r"\*\*Status:\*\*\s*([^|\n]+)")
REGULAR_BLOB_MODE = "100644"


def _git(repo: Path, *args: str, binary: bool = False) -> bytes | str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, check=False, timeout=10
    )
    if result.returncode != 0:
        raise ValueError(result.stderr.decode("utf-8", errors="replace").strip() or "Git command failed")
    return result.stdout if binary else result.stdout.decode("utf-8").strip()


def _blob(repo: Path, commit: str, path: str) -> bytes:
    return _git(repo, "show", f"{commit}:{path}", binary=True)  # type: ignore[return-value]


def _tree_entry(repo: Path, commit: str, path: str) -> tuple[str, str, str]:
    raw = _git(repo, "ls-tree", "-z", commit, "--", path, binary=True)
    assert isinstance(raw, bytes)
    entries = [entry for entry in raw.split(b"\0") if entry]
    if len(entries) != 1:
        raise ValueError(f"{path} must resolve to exactly one Git tree entry at {commit}")
    try:
        metadata, actual_path = entries[0].split(b"\t", 1)
        mode, kind, _object_id = metadata.decode("ascii").split(" ")
        decoded_path = actual_path.decode("utf-8")
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError(f"cannot parse Git tree entry for {path} at {commit}") from exc
    if decoded_path != path:
        raise ValueError(f"Git tree entry path mismatch for {path} at {commit}")
    return mode, kind, decoded_path


def _require_regular_blob(repo: Path, commit: str, path: str) -> None:
    mode, kind, _ = _tree_entry(repo, commit, path)
    if mode != REGULAR_BLOB_MODE or kind != "blob":
        raise ValueError(f"{path} at {commit} must be a non-executable regular blob (mode 100644)")


def _phase_document(paths: list[str], phase: int) -> str | None:
    pattern = re.compile(rf"^docs/implementation-plans/[^/]+/\d+-phase-{phase}(?:-|\.md)")
    matches = [path for path in paths if pattern.match(path)]
    return matches[0] if len(matches) == 1 else None


def _tree_paths(repo: Path, commit: str, prefix: str) -> list[str]:
    output = str(_git(repo, "ls-tree", "-r", "--name-only", commit, "--", prefix))
    return [path for path in output.splitlines() if path]


def _phase_document_at(repo: Path, candidate: str, phase: int) -> str | None:
    return _phase_document(_tree_paths(repo, candidate, PLAN_PREFIX), phase)


def _phase_owned_sheets(repo: Path, candidate: str, phase: int) -> set[str]:
    return program_ledger._phase_reference_sheets(  # noqa: SLF001 - shared gate contract
        {"candidateSha": candidate, "phase": phase}, repo
    )


def _phase_scope_kind(repo: Path, candidate: str, phase: int) -> str | None:
    value = json.loads(_blob(repo, candidate, MANIFEST_PATH))
    scopes = value.get("acceptanceScopes", []) if isinstance(value, dict) else []
    matches = [scope for scope in scopes if isinstance(scope, dict) and scope.get("phase") == phase]
    return matches[0].get("kind") if len(matches) == 1 else None


def _handoff(text: str) -> tuple[str, dict[str, Any]]:
    status_matches = list(VISIBLE_STATUS_RE.finditer(text))
    if len(status_matches) != 1:
        raise ValueError("phase document must contain exactly one visible status marker")
    match = HANDOFF_RE.search(text)
    if not match:
        raise ValueError("missing structured acceptance hand-off")
    value = json.loads(match.group(1))
    if not isinstance(value, dict):
        raise ValueError("structured acceptance hand-off must be an object")
    without = text[:match.start()] + "<structured-acceptance-hand-off>" + text[match.end():]
    without = VISIBLE_STATUS_RE.sub(r"**Status:** <mutable>", without, count=1)
    return without.strip(), value


def _check_phase_delta(candidate: bytes, evidence: bytes, phase: int) -> list[str]:
    try:
        before_text = candidate.decode("utf-8")
        after_text = evidence.decode("utf-8")
        before_contract, before = _handoff(before_text)
        after_contract, after = _handoff(after_text)
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        return [f"cannot validate structured phase hand-off: {exc}"]
    findings: list[str] = []
    before_status = VISIBLE_STATUS_RE.search(before_text)
    after_status = VISIBLE_STATUS_RE.search(after_text)
    if not before_status or before_status.group(1).strip().casefold() != "pending":
        findings.append("visible phase status at C must be pending")
    if not after_status or after_status.group(1).strip().casefold() != "accepted":
        findings.append("visible phase status at E must be accepted")
    if before_contract != after_contract:
        findings.append("immutable phase plan changed from C to E")
    expected_keys = {"schemaVersion", "phase", "nextPhase", "status", "evidence", "reviewers"}
    if set(before) != expected_keys or set(after) != expected_keys:
        findings.append("structured phase hand-off has an invalid schema")
        return findings
    for key in ("schemaVersion", "phase", "nextPhase"):
        if before.get(key) != after.get(key):
            findings.append(f"structured phase hand-off immutable field {key} changed")
    if before.get("schemaVersion") != 1 or before.get("phase") != phase:
        findings.append("structured phase hand-off identity does not match the phase")
    if before.get("status") != "pending" or after.get("status") != "accepted":
        findings.append("structured phase hand-off must transition pending to accepted")
    reviewers = after.get("reviewers")
    if not isinstance(reviewers, dict) or set(reviewers) != {"ux", "qa"}:
        findings.append("structured phase hand-off must bind ux and qa reviewers")
    elif any(not isinstance(value, str) or not value.strip() or value == "pending" for value in reviewers.values()):
        findings.append("structured phase hand-off reviewer identities must be complete")
    evidence_paths = after.get("evidence")
    prefix = f"artifacts/ux-audits/phase-{phase}/"
    if not isinstance(evidence_paths, list) or len(evidence_paths) < 2:
        findings.append("structured phase hand-off requires UX and QA evidence paths")
    elif any(not isinstance(path, str) or not path.startswith(prefix) for path in evidence_paths):
        findings.append(f"structured phase hand-off evidence must be inside {prefix}")
    return findings


def _name_status(repo: Path, candidate: str, evidence: str) -> list[tuple[str, str, str | None]]:
    raw = _git(repo, "diff", "--name-status", "-z", "--find-renames=50%", candidate, evidence, binary=True)
    assert isinstance(raw, bytes)
    values = raw.split(b"\0")
    entries: list[tuple[str, str, str | None]] = []
    cursor = 0
    while cursor < len(values) and values[cursor]:
        status = values[cursor].decode("ascii", errors="replace")
        cursor += 1
        if cursor >= len(values):
            raise ValueError("truncated git name-status output")
        first = values[cursor].decode("utf-8", errors="strict")
        cursor += 1
        second = None
        if status.startswith(("R", "C")):
            if cursor >= len(values):
                raise ValueError("truncated git rename/copy output")
            second = values[cursor].decode("utf-8", errors="strict")
            cursor += 1
        entries.append((status, first, second))
    return entries


def _check_review_reports(
    repo: Path,
    evidence: str,
    paths: list[str],
    *,
    phase: int,
    candidate: str,
    owned_sheets: set[str],
) -> tuple[list[str], dict[str, tuple[str, dict[str, Any]]]]:
    findings: list[str] = []
    reports: dict[str, tuple[str, dict[str, Any]]] = {}
    for path in paths:
        if not path.endswith(".json"):
            continue
        try:
            value = json.loads(_blob(repo, evidence, path))
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
            continue
        if not isinstance(value, dict) or value.get("role") not in {"ux", "qa"}:
            continue
        role = value["role"]
        if role in reports:
            findings.append(f"multiple independent {role} reports were added")
            continue
        reports[role] = (path, value)
    if set(reports) != {"ux", "qa"}:
        return findings + ["evidence E must add one machine-readable UX report and one QA report"], reports
    identities: list[str] = []
    builders: list[str] = []
    sessions: list[str] = []
    worktrees: list[str] = []
    for role, (_, report) in reports.items():
        identities.append(str(report.get("reviewer", "")).strip().casefold())
        builders.append(str(report.get("builder", "")).strip().casefold())
        sessions.append(str(report.get("sessionId", "")).strip())
        worktrees.append(str(report.get("worktree", "")).strip())
    if not all(identities) or len(set(identities)) != 2:
        findings.append("independent UX and QA report identities must be non-empty and distinct")
    if len(set(builders)) != 1 or not builders[0] or builders[0] in identities:
        findings.append("independent reports must bind one distinct non-reviewer builder")
    if not all(sessions) or len(set(sessions)) != 2:
        findings.append("independent UX and QA reports must bind distinct session IDs")
    if not all(worktrees) or len(set(worktrees)) != 2:
        findings.append("independent UX and QA reports must bind distinct verifier worktrees")
    if set(reports) == {"ux", "qa"} and len(set(builders)) == 1 and builders[0]:
        record = {
            "phase": phase,
            "candidateSha": candidate,
            "sourceTreeSha1": str(_git(repo, "rev-parse", f"{candidate}:src")),
            "evidenceCommitSha": evidence,
            "evidence": paths,
            "builder": next(iter(reports.values()))[1].get("builder"),
            "reviewers": {role: reports[role][1].get("reviewer") for role in ("ux", "qa")},
        }
        for role, (_, report) in reports.items():
            try:
                program_ledger._validate_review_report_shape(  # noqa: SLF001 - one schema authority
                    report, record=record, role=role, repo_root=repo
                )
            except program_ledger.LedgerError as exc:
                findings.append(f"independent {role} report failed schema validation: {exc}")
    return findings, reports


def check_acceptance(repo: Path, candidate: str, evidence: str, phase: int) -> list[str]:
    findings: list[str] = []
    if not SHA_RE.fullmatch(candidate) or not SHA_RE.fullmatch(evidence):
        return ["candidate C and evidence E must be exact 40-character lowercase commit SHAs"]
    if candidate == evidence:
        return ["evidence E must be a distinct descendant of candidate C"]
    try:
        _git(repo, "cat-file", "-e", f"{candidate}^{{commit}}")
        _git(repo, "cat-file", "-e", f"{evidence}^{{commit}}")
        result = subprocess.run(
            ["git", "-C", str(repo), "merge-base", "--is-ancestor", candidate, evidence],
            capture_output=True, check=False, timeout=10,
        )
        if result.returncode != 0:
            findings.append("candidate C is not an ancestor of evidence E")
            return findings
        parents = str(_git(repo, "rev-list", "--parents", "-n", "1", evidence)).split()
        if len(parents) != 2 or parents[1] != candidate:
            findings.append("evidence E must be the single direct child of candidate C")
            return findings
        entries = _name_status(repo, candidate, evidence)
    except (OSError, subprocess.SubprocessError, ValueError) as exc:
        return [f"cannot verify C-to-E history: {exc}"]

    phase_doc = _phase_document_at(repo, candidate, phase)
    if phase_doc is None:
        findings.append("candidate C does not contain exactly one predetermined phase document")
    try:
        owned_sheets = _phase_owned_sheets(repo, candidate, phase)
        scope_kind = _phase_scope_kind(repo, candidate, phase)
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError, program_ledger.LedgerError) as exc:
        findings.append(f"candidate manifest acceptance scope is invalid: {exc}")
        owned_sheets = set()
        scope_kind = None
    if not owned_sheets and phase != 1 and scope_kind != "package":
        findings.append("candidate manifest does not assign any reference sheet to this phase")
    audit_prefix = f"artifacts/ux-audits/phase-{phase}/"
    added_audits: list[str] = []
    modified_paths: set[str] = set()
    for status, source, destination in entries:
        path = destination or source
        if status == "A" and path.startswith(audit_prefix):
            try:
                _require_regular_blob(repo, evidence, path)
            except ValueError as exc:
                findings.append(str(exc))
            added_audits.append(path)
            continue
        if status == "M" and (path in owned_sheets or path == phase_doc):
            try:
                before_mode = _tree_entry(repo, candidate, path)[:2]
                after_mode = _tree_entry(repo, evidence, path)[:2]
                if before_mode != (REGULAR_BLOB_MODE, "blob") or after_mode != before_mode:
                    findings.append(f"mode/type change is forbidden from C to E: {path}")
            except ValueError as exc:
                findings.append(str(exc))
            modified_paths.add(path)
            continue
        if status.startswith(("R", "C")):
            findings.append(f"rename/copy is forbidden from C to E: {source} -> {destination}")
        elif status in {"A", "D"}:
            findings.append(f"{status} is forbidden for non-audit path from C to E: {path}")
        else:
            findings.append(f"non-evidence path changed from C to E: {path}")
    report_findings, reports = _check_review_reports(
        repo,
        evidence,
        added_audits,
        phase=phase,
        candidate=candidate,
        owned_sheets=owned_sheets,
    )
    findings.extend(report_findings)
    if phase_doc is not None and phase_doc not in modified_paths:
        findings.append("evidence E must update the predetermined structured phase hand-off")
    elif phase_doc is not None:
        try:
            _, handoff = _handoff(_blob(repo, evidence, phase_doc).decode("utf-8"))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            findings.append(f"cannot bind reports to structured phase hand-off: {exc}")
        else:
            handoff_evidence = handoff.get("evidence", [])
            handoff_reviewers = handoff.get("reviewers", {})
            for role, (path, report) in reports.items():
                if path not in handoff_evidence:
                    findings.append(f"structured phase hand-off omits the independent {role} report")
                if not isinstance(handoff_reviewers, dict) or handoff_reviewers.get(role) != report.get("reviewer"):
                    findings.append(f"structured phase hand-off {role} identity does not match its report")

    for status, source, destination in entries:
        path = destination or source
        if status != "M":
            continue
        try:
            before = _blob(repo, candidate, path)
            after = _blob(repo, evidence, path)
        except ValueError as exc:
            findings.append(f"cannot compare modified evidence path {path}: {exc}")
            continue
        if path in owned_sheets:
            try:
                before_hash = program_ledger.reference_sheet_contract_sha256(before)
                after_hash = program_ledger.reference_sheet_contract_sha256(after)
            except (UnicodeDecodeError, program_ledger.LedgerError) as exc:
                findings.append(f"cannot hash immutable sheet contract {path}: {exc}")
            else:
                if before_hash != after_hash:
                    findings.append(f"immutable reference-sheet contract changed from C to E: {path}")
        elif path == phase_doc:
            findings.extend(_check_phase_delta(before, after, phase))
    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--evidence", required=True)
    parser.add_argument("--phase", required=True, type=int)
    parser.add_argument("--repo", type=Path, default=ROOT)
    args = parser.parse_args(argv)
    findings = check_acceptance(args.repo.resolve(), args.candidate, args.evidence, args.phase)
    if findings:
        print(f"Phase acceptance gate: {len(findings)} finding(s)")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    print(f"Phase acceptance gate: C-to-E evidence-only contract passes for phase {args.phase}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
