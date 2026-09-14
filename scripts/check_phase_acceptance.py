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
MUTABLE_LEDGER_FIELDS = {
    "status", "prHeadSha", "mergeSha", "independentAcceptanceSha", "evidenceCommitSha",
    "reviewers", "evidence", "evidenceQualification", "reasonOpen", "commands", "timestamp",
    "lockSha256", "manifestSha256", "referenceSheetSha256", "referenceSheetContractSha256",
}


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


def _phase_contract(text: str) -> str:
    before_handoff = text.split("## Hand-off", 1)[0]
    return re.sub(
        r"^(.*\| \*\*Status:\*\*).*$", r"\1 <mutable>", before_handoff,
        flags=re.MULTILINE,
    ).strip()


def _check_ledger_delta(candidate: bytes, evidence: bytes, phase: int) -> list[str]:
    findings: list[str] = []
    try:
        before, after = json.loads(candidate), json.loads(evidence)
    except json.JSONDecodeError as exc:
        return [f"tracked ledger is not valid JSON: {exc}"]
    for field in ("schemaVersion", "program", "repository", "externalAuthority"):
        if before.get(field) != after.get(field):
            findings.append(f"tracked ledger immutable field {field!r} changed")
    before_phases = {item.get("phase"): item for item in before.get("phases", []) if isinstance(item, dict)}
    after_phases = {item.get("phase"): item for item in after.get("phases", []) if isinstance(item, dict)}
    if set(before_phases) != set(after_phases):
        findings.append("tracked ledger phase set changed during evidence-only closure")
        return findings
    for number in before_phases:
        if number != phase and before_phases[number] != after_phases[number]:
            findings.append(f"tracked ledger phase {number} changed during phase {phase} closure")
            continue
        if number == phase:
            changed = {
                key for key in set(before_phases[number]) | set(after_phases[number])
                if before_phases[number].get(key) != after_phases[number].get(key)
            }
            forbidden = changed - MUTABLE_LEDGER_FIELDS
            if forbidden:
                findings.append(
                    "tracked ledger immutable phase fields changed: " + ", ".join(sorted(forbidden))
                )
    return findings


def check_acceptance(repo: Path, candidate: str, evidence: str, phase: int) -> list[str]:
    findings: list[str] = []
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
        changed_text = str(_git(repo, "diff", "--name-only", candidate, evidence))
    except (OSError, subprocess.SubprocessError, ValueError) as exc:
        return [f"cannot verify C-to-E history: {exc}"]

    changed = [path for path in changed_text.splitlines() if path]
    phase_doc = _phase_document(changed, phase)
    allowed_exact = {LEDGER_PATH}
    if phase_doc:
        allowed_exact.add(phase_doc)
    audit_prefix = f"artifacts/ux-audits/phase-{phase}/"
    for path in changed:
        if path.startswith(audit_prefix) or path.startswith(SHEET_PREFIX) or path in allowed_exact:
            continue
        findings.append(f"non-evidence path changed from C to E: {path}")

    for path in changed:
        try:
            before = _blob(repo, candidate, path)
            after = _blob(repo, evidence, path)
        except ValueError:
            before, after = b"", b""
        if path.startswith(SHEET_PREFIX):
            try:
                before_hash = program_ledger.reference_sheet_contract_sha256(before)
                after_hash = program_ledger.reference_sheet_contract_sha256(after)
            except (UnicodeDecodeError, program_ledger.LedgerError) as exc:
                findings.append(f"cannot hash immutable sheet contract {path}: {exc}")
            else:
                if before_hash != after_hash:
                    findings.append(f"immutable reference-sheet contract changed from C to E: {path}")
        elif path == phase_doc and _phase_contract(before.decode()) != _phase_contract(after.decode()):
            findings.append(f"immutable phase plan changed from C to E: {path}")
        elif path == LEDGER_PATH:
            findings.extend(_check_ledger_delta(before, after, phase))
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
