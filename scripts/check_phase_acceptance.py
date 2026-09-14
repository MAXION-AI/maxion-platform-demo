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


def _git(repo: Path, *args: str, binary: bool = False) -> bytes | str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, check=False, timeout=10
    )
    if result.returncode != 0:
        raise ValueError(result.stderr.decode("utf-8", errors="replace").strip() or "Git command failed")
    return result.stdout if binary else result.stdout.decode("utf-8").strip()


def _blob(repo: Path, commit: str, path: str) -> bytes:
    return _git(repo, "show", f"{commit}:{path}", binary=True)  # type: ignore[return-value]


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
    try:
        manifest = json.loads(_blob(repo, candidate, MANIFEST_PATH))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return set()
    surfaces = manifest.get("surfaces", []) if isinstance(manifest, dict) else []
    return {
        f"{SHEET_PREFIX}{item['referenceSheet']}"
        for item in surfaces
        if isinstance(item, dict)
        and item.get("acceptancePhase") == phase
        and isinstance(item.get("referenceSheet"), str)
    }


def _handoff(text: str) -> tuple[str, dict[str, Any]]:
    match = HANDOFF_RE.search(text)
    if not match:
        raise ValueError("missing structured acceptance hand-off")
    value = json.loads(match.group(1))
    if not isinstance(value, dict):
        raise ValueError("structured acceptance hand-off must be an object")
    without = text[:match.start()] + "<structured-acceptance-hand-off>" + text[match.end():]
    without = re.sub(r"^(- \*\*Status:\*\*).*$", r"\1 <mutable>", without, flags=re.MULTILINE)
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
    for role, (_, report) in reports.items():
        expected = {
            "schemaVersion", "program", "phase", "role", "reviewer", "builder",
            "candidateSha", "sourceTreeSha1", "referenceSheets", "checks", "verdict",
        }
        if set(report) != expected:
            findings.append(f"independent {role} report has an invalid schema")
            continue
        exact = {
            "schemaVersion": 1,
            "program": program_ledger.PROGRAM,
            "phase": phase,
            "role": role,
            "candidateSha": candidate,
            "sourceTreeSha1": str(_git(repo, "rev-parse", f"{candidate}:src")),
            "referenceSheets": sorted(owned_sheets),
            "verdict": "PASS",
        }
        for field, expected_value in exact.items():
            if report.get(field) != expected_value:
                findings.append(f"independent {role} report field {field} does not match C/phase/sheets")
        if (
            not isinstance(report.get("checks"), list)
            or not report["checks"]
            or any(not isinstance(check, str) or not check.strip() for check in report["checks"])
        ):
            findings.append(f"independent {role} report has no completed checks")
        identities.append(str(report.get("reviewer", "")).strip().casefold())
        builders.append(str(report.get("builder", "")).strip().casefold())
    if not all(identities) or len(set(identities)) != 2:
        findings.append("independent UX and QA report identities must be non-empty and distinct")
    if len(set(builders)) != 1 or not builders[0] or builders[0] in identities:
        findings.append("independent reports must bind one distinct non-reviewer builder")
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
    owned_sheets = _phase_owned_sheets(repo, candidate, phase)
    if not owned_sheets and phase != 1:
        findings.append("candidate manifest does not assign any reference sheet to this phase")
    audit_prefix = f"artifacts/ux-audits/phase-{phase}/"
    added_audits: list[str] = []
    modified_paths: set[str] = set()
    for status, source, destination in entries:
        path = destination or source
        if status == "A" and path.startswith(audit_prefix):
            added_audits.append(path)
            continue
        if status == "M" and (path in owned_sheets or path == phase_doc):
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
