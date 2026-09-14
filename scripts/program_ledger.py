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
from datetime import datetime, timezone
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
TARGET_REF = "refs/remotes/origin/main"
GITHUB_REPOSITORY = "MAXION-AI/maxion-platform-demo"
MAX_CAPTURE_BYTES = 1_048_576
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
CANONICAL_COMMANDS = {
    "check-program": "pnpm check:program",
    "build": "pnpm build",
    "audit-high": "pnpm audit --audit-level high",
    "phase-tests": "pnpm test && pnpm test:e2e",
    "diff-check": "git diff --check",
}
CANONICAL_EXECUTION = {
    "check-program": [["pnpm", "check:program"]],
    "build": [["pnpm", "build"]],
    "audit-high": [["pnpm", "audit", "--audit-level", "high"]],
    "phase-tests": [["pnpm", "test"], ["pnpm", "test:e2e"]],
    "diff-check": [["git", "diff", "--check"]],
}
PROTECTED_OBJECT_PATHS = {
    ".github/workflows", "src", "tests", "scripts", "package.json", "pnpm-lock.yaml",
    "playwright.config.ts", "vite.config.ts",
    "docs/operations/figma-code-map.json",
    "docs/operations/phase-acceptance-protocol.md",
    "docs/operations/ux-reference-sheet.template.md",
    "docs/operations/ux-laws-policy.md",
    "docs/operations/mobbin-ai-north-star.md",
    "docs/operations/ux-surface-inventory.md",
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
REVIEW_CHECKLISTS = {
    "ux": (
        "figma-context", "figma-screenshot", "mobbin-references", "laws-check",
        "interactivity-floor", "token-gate", "accessibility", "responsive-viewports",
    ),
    "qa": (
        "source-quality", "unit-integration", "browser-e2e", "failure-paths",
        "security-boundaries", "phase-acceptance",
    ),
}
COMMON_RECORD_FIELDS = {
    "phase", "status", "baseSha", "candidateSha", "prUrl", "prHeadSha", "mergeSha",
    "independentAcceptanceSha", "evidenceCommitSha", "sourceTreeSha1", "builder", "reviewers",
    "evidence", "evidenceQualification",
}
ACCEPTED_RECORD_FIELDS = {
    "lockSha256", "manifestSha256", "referenceSheetSha256",
    "referenceSheetContractSha256", "commands", "reviewReports", "protectedObjectSha1",
    "prNumber", "mergeCommitSubject", "targetRef", "postMergeCommands",
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


def _git_commit_tree(repo_root: Path, commit: str) -> str:
    try:
        return str(_git(repo_root, "rev-parse", f"{commit}^{{tree}}"))
    except LedgerError as exc:
        raise LedgerError(f"cannot resolve full tree at commit {commit}") from exc


def _git_object(repo_root: Path, commit: str, path: str) -> str:
    try:
        return str(_git(repo_root, "rev-parse", f"{commit}:{path}"))
    except LedgerError as exc:
        raise LedgerError(f"cannot resolve protected object {path} at commit {commit}") from exc


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


def _phase_artifact_path(value: Any, field: str, phase: int, *, suffix: str | None = None) -> str:
    safe_path = _repo_relative_path(value, field)
    prefix = f"artifacts/ux-audits/phase-{phase}/"
    if not safe_path.startswith(prefix) or safe_path == prefix:
        raise LedgerError(f"{field} must be inside {prefix}")
    if suffix is not None and not safe_path.endswith(suffix):
        raise LedgerError(f"{field} must end in {suffix}")
    return safe_path


def _validate_commands(record: dict[str, Any], *, accepted: bool) -> None:
    commands = record.get("commands", [])
    if not isinstance(commands, list):
        raise LedgerError("commands must be an array of structured results")
    ids: list[str] = []
    expected_keys = {
        "id", "command", "status", "exitCode", "runSha", "stdoutSha256",
        "stderrSha256", "evidencePath", "evidenceSha256",
    }
    for result in commands:
        if not isinstance(result, dict) or set(result) != expected_keys:
            raise LedgerError(
                "every command result must contain exactly id, command, status, exitCode, and evidencePath"
            )
        if not all(isinstance(result[key], str) and result[key].strip() for key in ("id", "command")):
            raise LedgerError("command id and command must be non-empty strings")
        command_id = result["id"]
        if command_id not in CANONICAL_COMMANDS:
            raise LedgerError(f"unknown mandatory command id: {command_id}")
        if result["command"] != CANONICAL_COMMANDS[command_id]:
            raise LedgerError(f"command {command_id!r} does not match its canonical invocation")
        if result["status"] not in {"PASS", "FAIL"}:
            raise LedgerError("command status must be PASS or FAIL")
        if not isinstance(result["exitCode"], int):
            raise LedgerError("command exitCode must be an integer")
        if (result["status"] == "PASS") != (result["exitCode"] == 0):
            raise LedgerError("command status and exitCode disagree")
        _validate_sha(result["runSha"], "command runSha")
        for field in ("stdoutSha256", "stderrSha256", "evidenceSha256"):
            if not isinstance(result[field], str) or not SHA256_RE.fullmatch(result[field]):
                raise LedgerError(f"command {field} must be a lowercase SHA-256")
        _phase_artifact_path(
            result["evidencePath"], "command evidencePath", record["phase"], suffix=".json"
        )
        ids.append(command_id)
    if len(ids) != len(set(ids)):
        raise LedgerError("command result IDs must be unique")
    if accepted:
        if set(ids) != REQUIRED_COMMAND_IDS:
            missing = REQUIRED_COMMAND_IDS - set(ids)
            extra = set(ids) - REQUIRED_COMMAND_IDS
            details = []
            if missing:
                details.append("missing " + ", ".join(sorted(missing)))
            if extra:
                details.append("unexpected " + ", ".join(sorted(extra)))
            raise LedgerError("accepted record command set is invalid: " + "; ".join(details))
        if any(result["status"] != "PASS" for result in commands):
            raise LedgerError("every accepted-record command must PASS")


def _validate_post_merge_commands(record: dict[str, Any], *, required: bool) -> None:
    results = record.get("postMergeCommands")
    if not required and results is None:
        return
    if not isinstance(results, list):
        raise LedgerError("postMergeCommands must be generated by the append coordinator")
    expected_keys = {
        "id", "command", "status", "exitCode", "runSha", "stdout", "stderr",
        "stdoutSha256", "stderrSha256",
    }
    ids: list[str] = []
    for result in results:
        if not isinstance(result, dict) or set(result) != expected_keys:
            raise LedgerError("every post-merge command receipt has an invalid schema")
        command_id = result.get("id")
        if command_id not in CANONICAL_COMMANDS or result.get("command") != CANONICAL_COMMANDS[command_id]:
            raise LedgerError("post-merge command does not match the canonical command set")
        if result.get("status") != "PASS" or result.get("exitCode") != 0:
            raise LedgerError("every post-merge command must PASS")
        if result.get("runSha") != record.get("mergeSha"):
            raise LedgerError("post-merge command runSha must equal mergeSha")
        for stream in ("stdout", "stderr"):
            if not isinstance(result.get(stream), str):
                raise LedgerError(f"post-merge command {stream} must be a string")
            if len(result[stream].encode("utf-8")) > MAX_CAPTURE_BYTES:
                raise LedgerError(f"post-merge command {stream} exceeds the persisted output limit")
            expected_hash = hashlib.sha256(result[stream].encode("utf-8")).hexdigest()
            if result.get(f"{stream}Sha256") != expected_hash:
                raise LedgerError(f"post-merge command {stream} content does not match its SHA-256")
        for field in ("stdoutSha256", "stderrSha256"):
            if not isinstance(result.get(field), str) or not SHA256_RE.fullmatch(result[field]):
                raise LedgerError(f"post-merge command {field} must be a lowercase SHA-256")
        ids.append(str(command_id))
    if len(ids) != len(set(ids)) or set(ids) != REQUIRED_COMMAND_IDS:
        raise LedgerError("postMergeCommands must contain the exact canonical command set once")


def _validate_review_report_shape(
    report: Any, *, record: dict[str, Any], role: str, repo_root: Path = ROOT
) -> None:
    expected = {
        "schemaVersion", "program", "phase", "role", "reviewer", "builder",
        "candidateSha", "sourceTreeSha1", "sessionId", "worktree", "cleanCheckout",
        "referenceSheets", "checks", "verdict",
    }
    if role == "qa":
        expected.add("browserRuns")
    if not isinstance(report, dict) or set(report) != expected:
        raise LedgerError(f"{role} review report has an invalid schema")
    expected_values = {
        "schemaVersion": 2,
        "program": PROGRAM,
        "phase": record["phase"],
        "role": role,
        "reviewer": record["reviewers"][role],
        "builder": record["builder"],
        "candidateSha": record["candidateSha"],
        "sourceTreeSha1": record["sourceTreeSha1"],
        "verdict": "PASS",
    }
    for field, expected_value in expected_values.items():
        if report.get(field) != expected_value:
            raise LedgerError(f"{role} review report {field} does not match the accepted record")
    expected_sheets = sorted(_phase_reference_sheets(record, repo_root))
    if report.get("referenceSheets") != expected_sheets:
        raise LedgerError(f"{role} review report does not bind the phase-owned reference sheets")
    if not isinstance(report.get("sessionId"), str) or not report["sessionId"].strip():
        raise LedgerError(f"{role} review report must bind a concrete sessionId")
    if not isinstance(report.get("worktree"), str) or not Path(report["worktree"]).is_absolute():
        raise LedgerError(f"{role} review report worktree must be an absolute path")
    if report.get("cleanCheckout") is not True:
        raise LedgerError(f"{role} review report must attest a clean checkout")
    checks = report.get("checks")
    expected_ids = REVIEW_CHECKLISTS[role]
    if not isinstance(checks, list) or [check.get("id") for check in checks if isinstance(check, dict)] != list(expected_ids):
        raise LedgerError(f"{role} review report must contain the exact ordered checklist")
    for check in checks:
        if set(check) != {"id", "status", "evidence"} or check.get("status") != "PASS":
            raise LedgerError(f"{role} review report checklist entry has an invalid schema or status")
        evidence = check.get("evidence")
        if not isinstance(evidence, list) or not evidence:
            raise LedgerError(f"{role} review checklist entry must bind concrete evidence")
        for path in evidence:
            safe_path = _phase_artifact_path(path, f"{role} review checklist evidence", record["phase"])
            _git_blob(repo_root, record["evidenceCommitSha"], safe_path)
            if safe_path not in record["evidence"]:
                raise LedgerError(f"{role} review checklist evidence must be listed in the accepted record")
    if role == "qa":
        runs = report.get("browserRuns")
        if not isinstance(runs, list) or len(runs) != 3:
            raise LedgerError("QA review report must bind exactly three browser runs")
        run_ids: list[str] = []
        artifact_paths: list[str] = []
        run_fields = {
            "runId", "browser", "browserVersion", "viewport", "fixture", "status",
            "exitCode", "artifactPath", "artifactSha256",
        }
        for run in runs:
            if not isinstance(run, dict) or set(run) != run_fields:
                raise LedgerError("QA browser run has an invalid schema")
            if run.get("status") != "PASS" or run.get("exitCode") != 0:
                raise LedgerError("every QA browser run must PASS")
            for field in ("runId", "browser", "browserVersion", "fixture"):
                if not isinstance(run.get(field), str) or not run[field].strip():
                    raise LedgerError(f"QA browser run {field} must be non-empty")
            viewport = run.get("viewport")
            if not isinstance(viewport, dict) or set(viewport) != {"width", "height"} or any(
                not isinstance(viewport.get(axis), int) or viewport[axis] <= 0 for axis in ("width", "height")
            ):
                raise LedgerError("QA browser run viewport is invalid")
            path = _phase_artifact_path(run.get("artifactPath"), "QA browser artifact", record["phase"])
            blob = _git_blob(repo_root, record["evidenceCommitSha"], path)
            if hashlib.sha256(blob).hexdigest() != run.get("artifactSha256"):
                raise LedgerError("QA browser artifact SHA-256 does not match committed evidence")
            if path not in record["evidence"]:
                raise LedgerError("QA browser artifact must be listed in the accepted record")
            run_ids.append(run["runId"])
            artifact_paths.append(path)
        if len(set(run_ids)) != 3:
            raise LedgerError("QA browser run IDs must be distinct")
        if len(set(artifact_paths)) != 3:
            raise LedgerError("QA browser runs must bind three distinct artifacts")


def _validate_command_report_shape(report: Any, *, record: dict[str, Any], result: dict[str, Any]) -> None:
    expected = {
        "schemaVersion", "program", "phase", "kind", "candidateSha", "sourceTreeSha1",
        "id", "command", "status", "exitCode", "runSha", "stdout", "stderr",
        "stdoutSha256", "stderrSha256", "worktree", "cleanBefore", "cleanAfter",
        "startedAt", "finishedAt",
    }
    if not isinstance(report, dict) or set(report) != expected:
        raise LedgerError(f"command report {result['id']!r} has an invalid schema")
    expected_values = {
        "schemaVersion": 2,
        "program": PROGRAM,
        "phase": record["phase"],
        "kind": "command-result",
        "candidateSha": record["candidateSha"],
        "sourceTreeSha1": record["sourceTreeSha1"],
        **{key: result[key] for key in (
            "id", "command", "status", "exitCode", "runSha", "stdoutSha256", "stderrSha256"
        )},
    }
    for field, expected_value in expected_values.items():
        if report.get(field) != expected_value:
            raise LedgerError(f"command report {result['id']!r} field {field} does not match the record")
    for stream in ("stdout", "stderr"):
        if not isinstance(report.get(stream), str):
            raise LedgerError(f"command report {result['id']!r} {stream} must be a string")
        actual_hash = hashlib.sha256(report[stream].encode("utf-8")).hexdigest()
        if actual_hash != result[f"{stream}Sha256"]:
            raise LedgerError(f"command report {result['id']!r} {stream} content does not match its SHA-256")
        if len(report[stream].encode("utf-8")) > MAX_CAPTURE_BYTES:
            raise LedgerError(f"command report {result['id']!r} {stream} exceeds the output limit")
    if not isinstance(report.get("worktree"), str) or not Path(report["worktree"]).is_absolute():
        raise LedgerError(f"command report {result['id']!r} worktree must be an absolute path")
    if report.get("cleanBefore") is not True or report.get("cleanAfter") is not True:
        raise LedgerError(f"command report {result['id']!r} must attest clean state before and after")
    for field in ("startedAt", "finishedAt"):
        if not isinstance(report.get(field), str) or not TIMESTAMP_RE.fullmatch(report[field]):
            raise LedgerError(f"command report {result['id']!r} {field} must be a UTC timestamp")
    if report["finishedAt"] < report["startedAt"]:
        raise LedgerError(f"command report {result['id']!r} timestamps are out of order")


def _phase_reference_sheets(record: dict[str, Any], repo_root: Path = ROOT) -> set[str]:
    try:
        manifest = json.loads(_git_blob(repo_root, record["candidateSha"], "docs/operations/figma-code-map.json"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise LedgerError("candidate Figma/code map is not valid JSON") from exc
    surfaces = manifest.get("surfaces", []) if isinstance(manifest, dict) else []
    all_sheets = {
        f"docs/operations/ux-reference-sheets/{item['referenceSheet']}"
        for item in surfaces
        if isinstance(item, dict) and isinstance(item.get("referenceSheet"), str)
    }
    scopes = manifest.get("acceptanceScopes", []) if isinstance(manifest, dict) else []
    matching = [scope for scope in scopes if isinstance(scope, dict) and scope.get("phase") == record["phase"]]
    if len(matching) > 1:
        raise LedgerError("candidate manifest contains duplicate acceptance scopes for a phase")
    if matching:
        scope = matching[0]
        if set(scope) != {"phase", "kind", "referenceSheets"}:
            raise LedgerError("candidate manifest acceptance scope has an invalid schema")
        paths = scope.get("referenceSheets")
        if not isinstance(paths, list) or any(not isinstance(path, str) for path in paths):
            raise LedgerError("candidate manifest acceptance scope referenceSheets is invalid")
        scoped = {f"docs/operations/ux-reference-sheets/{path}" for path in paths}
        if scope.get("kind") == "all-surfaces" and scoped != all_sheets:
            raise LedgerError("all-surfaces acceptance scope must cover exactly all reference sheets")
        if scope.get("kind") == "package" and scoped:
            raise LedgerError("package acceptance scope may not name user-facing reference sheets")
        if scope.get("kind") not in {"all-surfaces", "package"}:
            raise LedgerError("candidate manifest acceptance scope kind is invalid")
        return scoped
    return {
        f"docs/operations/ux-reference-sheets/{item['referenceSheet']}"
        for item in surfaces
        if isinstance(item, dict)
        and item.get("acceptancePhase") == record["phase"]
        and isinstance(item.get("referenceSheet"), str)
    }


def _validate_shape(record: Any, *, external: bool, require_post_merge: bool = True) -> None:
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
        required_fields = ACCEPTED_RECORD_FIELDS if require_post_merge else ACCEPTED_RECORD_FIELDS - {"postMergeCommands"}
        missing_accepted = required_fields - set(record)
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
        if accepted:
            _phase_artifact_path(path, "evidence path", record["phase"])
        else:
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
        review_reports = record["reviewReports"]
        if not isinstance(review_reports, dict) or set(review_reports) != {"ux", "qa"}:
            raise LedgerError("accepted record reviewReports must name exactly ux and qa")
        review_paths: list[str] = []
        for role in ("ux", "qa"):
            binding = review_reports[role]
            if not isinstance(binding, dict) or set(binding) != {"path", "sha256"}:
                raise LedgerError(f"accepted record {role} review report binding is invalid")
            review_paths.append(
                _phase_artifact_path(binding["path"], f"{role} review report path", record["phase"], suffix=".json")
            )
            if not isinstance(binding["sha256"], str) or not SHA256_RE.fullmatch(binding["sha256"]):
                raise LedgerError(f"accepted record {role} review report sha256 is invalid")
        if len(set(review_paths)) != 2:
            raise LedgerError("UX and QA must bind to distinct committed review reports")
        protected = record["protectedObjectSha1"]
        if not isinstance(protected, dict) or set(protected) != PROTECTED_OBJECT_PATHS:
            raise LedgerError("accepted record protectedObjectSha1 must cover the exact protected path set")
        if any(not isinstance(value, str) or not SHA1_RE.fullmatch(value) for value in protected.values()):
            raise LedgerError("every protectedObjectSha1 value must be a lowercase Git SHA-1")
        if not isinstance(record["prNumber"], int) or record["prNumber"] <= 0:
            raise LedgerError("accepted record prNumber must be a positive integer")
        if record["prUrl"] != f"https://github.com/MAXION-AI/maxion-platform-demo/pull/{record['prNumber']}":
            raise LedgerError("accepted record prNumber does not match prUrl")
        if not isinstance(record["mergeCommitSubject"], str) or not record["mergeCommitSubject"].strip():
            raise LedgerError("accepted record mergeCommitSubject must be non-empty")
        if record["targetRef"] != TARGET_REF:
            raise LedgerError(f"accepted record targetRef must be exactly {TARGET_REF}")
    else:
        if record["independentAcceptanceSha"] is not None:
            raise LedgerError("pending record independentAcceptanceSha must be null")
        if not isinstance(reason, str) or not reason.strip():
            raise LedgerError("pending record requires a non-empty reasonOpen")
        if qualification not in PENDING_EVIDENCE_QUALIFICATIONS:
            raise LedgerError("pending record has invalid evidenceQualification")
    _validate_commands(record, accepted=accepted)
    _validate_post_merge_commands(record, required=accepted and require_post_merge)
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
    if _git_commit_tree(repo_root, record["mergeSha"]) != _git_commit_tree(repo_root, record["prHeadSha"]):
        raise LedgerError("mergeSha full tree must equal the evidence/PR-head full tree")

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
        if result["runSha"] != record["independentAcceptanceSha"]:
            raise LedgerError("accepted command runSha must equal independentAcceptanceSha")
        report_blob = _git_blob(repo_root, record["evidenceCommitSha"], result["evidencePath"])
        if hashlib.sha256(report_blob).hexdigest() != result["evidenceSha256"]:
            raise LedgerError(f"command evidence SHA-256 does not match {result['evidencePath']}")
        try:
            report = json.loads(report_blob)
        except json.JSONDecodeError as exc:
            raise LedgerError(f"command evidence is not valid JSON: {result['evidencePath']}") from exc
        _validate_command_report_shape(report, record=record, result=result)
        if result["evidencePath"] not in record["evidence"]:
            raise LedgerError(f"command report {result['id']!r} must be listed in evidence")

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
        review_sessions: list[str] = []
        review_worktrees: list[str] = []
        for role, binding in record["reviewReports"].items():
            report_blob = _git_blob(repo_root, record["evidenceCommitSha"], binding["path"])
            if hashlib.sha256(report_blob).hexdigest() != binding["sha256"]:
                raise LedgerError(f"{role} review report SHA-256 does not match committed evidence")
            try:
                report = json.loads(report_blob)
            except json.JSONDecodeError as exc:
                raise LedgerError(f"{role} review report is not valid JSON") from exc
            _validate_review_report_shape(report, record=record, role=role, repo_root=repo_root)
            review_sessions.append(report["sessionId"])
            review_worktrees.append(report["worktree"])
            if binding["path"] not in record["evidence"]:
                raise LedgerError(f"{role} review report must be listed in evidence")
        if len(set(review_sessions)) != 2 or len(set(review_worktrees)) != 2:
            raise LedgerError("UX and QA reports must bind distinct sessions and worktrees")
        for path, expected_object in record["protectedObjectSha1"].items():
            for field in ("candidateSha", "prHeadSha", "mergeSha"):
                if _git_object(repo_root, record[field], path) != expected_object:
                    raise LedgerError(f"protected object {path} does not match at {field}")


def _validate_evidence_only(record: dict[str, Any], repo_root: Path) -> None:
    checker = repo_root / "scripts" / "check_phase_acceptance.py"
    environment = os.environ.copy()
    environment["PYTHONDONTWRITEBYTECODE"] = "1"
    result = subprocess.run(
        [
            sys.executable, str(checker), "--repo", str(repo_root),
            "--candidate", record["candidateSha"], "--evidence", record["evidenceCommitSha"],
            "--phase", str(record["phase"]),
        ],
        capture_output=True,
        text=True,
        env=environment,
        timeout=30,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stdout.strip() or result.stderr.strip() or "semantic evidence-only gate failed"
        raise LedgerError(f"semantic C-to-E validation failed: {detail}")


def _validate_merge_identity(record: dict[str, Any], repo_root: Path) -> None:
    """Require the Git object itself to prove the recorded PR merge identity."""

    parents = str(_git(repo_root, "rev-list", "--parents", "-n", "1", record["mergeSha"])).split()
    if len(parents) != 3:
        raise LedgerError("mergeSha must identify a two-parent merge commit")
    _, first_parent, second_parent = parents
    if first_parent != record["baseSha"]:
        raise LedgerError("mergeSha first parent must equal baseSha")
    if second_parent != record["prHeadSha"]:
        raise LedgerError("mergeSha second parent must equal prHeadSha")
    pr_number = str(record["prNumber"])
    subject = str(_git(repo_root, "show", "-s", "--format=%s", record["mergeSha"]))
    if not re.search(rf"\bMerge pull request #{re.escape(pr_number)}\b", subject):
        raise LedgerError("merge commit subject does not match prUrl")
    if subject != record["mergeCommitSubject"]:
        raise LedgerError("merge commit subject does not match recorded PR metadata")
    _attest_github_pull_request(record, repo_root)


def _attest_github_pull_request(record: dict[str, Any], repo_root: Path) -> None:
    """Fail closed unless GitHub binds the recorded PR, head, base, URL, and merge SHA."""

    try:
        result = subprocess.run(
            ["gh", "api", f"repos/{GITHUB_REPOSITORY}/pulls/{record['prNumber']}"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise LedgerError(f"GitHub PR attestation could not run: {exc}") from exc
    if result.returncode != 0:
        raise LedgerError(
            "GitHub PR attestation failed: "
            + (result.stderr.strip() or "gh api returned a non-zero status")
        )
    try:
        value = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise LedgerError("GitHub PR attestation returned invalid JSON") from exc
    expected = {
        "html_url": record["prUrl"],
        "state": "closed",
        "merge_commit_sha": record["mergeSha"],
    }
    if not isinstance(value, dict) or any(value.get(field) != expected_value for field, expected_value in expected.items()):
        raise LedgerError("GitHub PR identity/state/merge SHA does not match the accepted record")
    if not value.get("merged_at"):
        raise LedgerError("GitHub PR is not merged")
    if not isinstance(value.get("base"), dict) or value["base"].get("ref") != "main":
        raise LedgerError("GitHub PR base must be main")
    if value["base"].get("sha") != record["baseSha"]:
        raise LedgerError("GitHub PR base SHA does not match baseSha")
    if not isinstance(value.get("head"), dict) or value["head"].get("sha") != record["prHeadSha"]:
        raise LedgerError("GitHub PR head SHA does not match prHeadSha")


def validate_record(
    record: Any,
    *,
    external: bool,
    repo_root: Path = ROOT,
    require_post_merge: bool = True,
) -> None:
    _validate_shape(record, external=external, require_post_merge=require_post_merge)
    assert isinstance(record, dict)
    _validate_git_and_artifacts(record, repo_root)
    if external:
        _validate_merge_identity(record, repo_root)
        _validate_evidence_only(record, repo_root)
        if not SHA256_RE.fullmatch(str(record.get("previousRecordSha256", ""))):
            raise LedgerError("previousRecordSha256 must be a lowercase SHA-256")
        if not SHA256_RE.fullmatch(str(record.get("recordSha256", ""))):
            raise LedgerError("recordSha256 must be a lowercase SHA-256")
        if record["recordSha256"] != record_sha256(record):
            raise LedgerError("recordSha256 does not match the canonical record")


def _validate_external_chain(document: Any, *, repo_root: Path = ROOT) -> list[dict[str, Any]]:
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
    return records


def validate_external(document: Any, *, target_ref: str, repo_root: Path = ROOT) -> None:
    if target_ref != TARGET_REF:
        raise LedgerError(f"target ref must be exactly {TARGET_REF}")
    records = _validate_external_chain(document, repo_root=repo_root)
    if records:
        if records[-1]["targetRef"] != target_ref:
            raise LedgerError("external ledger targetRef does not match requested target ref")
        target_sha = str(_git(repo_root, "rev-parse", f"{target_ref}^{{commit}}"))
        if target_sha != records[-1]["mergeSha"]:
            raise LedgerError("external ledger latest mergeSha does not equal target ref")


def bootstrap_external(
    document: Any,
    *,
    expected_phase: int,
    target_ref: str,
    repo_root: Path = ROOT,
    require_clean: bool = True,
) -> str:
    """Authorize a successor only from the exact latest accepted merge."""

    if target_ref != TARGET_REF:
        raise LedgerError(f"target ref must be exactly {TARGET_REF}")
    validate_external(document, target_ref=target_ref, repo_root=repo_root)
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
    candidate_phase = document.get("candidatePhase")
    if not isinstance(candidate_phase, int) or candidate_phase < 0:
        raise LedgerError("tracked ledger candidatePhase must be a non-negative integer")
    if document.get("snapshotQualification") != "lagging-export-of-external-accepted-records-only":
        raise LedgerError("tracked ledger snapshotQualification is invalid")
    phases = document.get("phases")
    if not isinstance(phases, list):
        raise LedgerError("tracked ledger phases must be an array")
    previous_merge: str | None = None
    for expected_phase, phase in enumerate(phases):
        validate_record(phase, external=False, repo_root=repo_root)
        if phase["phase"] != expected_phase:
            raise LedgerError(
                f"tracked ledger expected phase {expected_phase}, got {phase['phase']}"
            )
        if phase["status"] != ACCEPTED_STATUS:
            raise LedgerError("tracked ledger may export only already accepted external records")
        if previous_merge is not None and phase["baseSha"] != previous_merge:
            raise LedgerError("tracked ledger adjacent phases must chain prior mergeSha to next baseSha")
        previous_merge = phase["mergeSha"]
    expected_snapshot = len(phases) - 1
    if document.get("snapshotThroughPhase") != expected_snapshot:
        raise LedgerError(
            f"tracked ledger snapshotThroughPhase must be {expected_snapshot} for its exported records"
        )
    if candidate_phase <= expected_snapshot:
        raise LedgerError("candidatePhase must be newer than the lagging accepted snapshot")


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


def _recoverable_records(raw: str, *, repo_root: Path) -> list[dict[str, Any]]:
    """Decode and verify the longest complete records prefix from a damaged ledger."""

    match = re.search(r'"records"\s*:\s*\[', raw)
    if not match:
        return []
    decoder = json.JSONDecoder()
    cursor = match.end()
    records: list[dict[str, Any]] = []
    while cursor < len(raw):
        while cursor < len(raw) and raw[cursor] in " \t\r\n,":
            cursor += 1
        if cursor >= len(raw) or raw[cursor] == "]":
            break
        try:
            value, end = decoder.raw_decode(raw, cursor)
        except json.JSONDecodeError:
            break
        if not isinstance(value, dict):
            break
        candidate = {
            "schemaVersion": 1,
            "program": PROGRAM,
            "repository": REPOSITORY,
            "records": [*records, value],
        }
        try:
            _validate_external_chain(candidate, repo_root=repo_root)
        except LedgerError:
            break
        records.append(value)
        cursor = end
    return records


def recover_external(path: Path, *, repo_root: Path = ROOT) -> tuple[Path, str]:
    """Preserve a corrupt ledger byte-for-byte and restore its last valid prefix."""

    with _locked(path):
        try:
            raw_bytes = path.read_bytes()
        except OSError as exc:
            raise LedgerError(f"cannot read ledger for recovery: {exc}") from exc
        raw = raw_bytes.decode("utf-8", errors="replace")
        records = _recoverable_records(raw, repo_root=repo_root)
        if not records:
            raise LedgerError("no checksum-valid accepted record can be recovered")
        digest = hashlib.sha256(raw_bytes).hexdigest()[:16]
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        recovery_dir = path.parent / "corrupt"
        recovery_dir.mkdir(parents=True, exist_ok=True)
        preserved = recovery_dir / f"{path.name}.{stamp}.{digest}.corrupt"
        descriptor = os.open(preserved, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(raw_bytes)
            stream.flush()
            os.fsync(stream.fileno())
        directory_fd = os.open(recovery_dir, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        recovered = {
            "schemaVersion": 1,
            "program": PROGRAM,
            "repository": REPOSITORY,
            "records": records,
        }
        _validate_external_chain(recovered, repo_root=repo_root)
        _atomic_write(path, recovered)
        return preserved, records[-1]["mergeSha"]


def _run_canonical_commands(record: dict[str, Any], repo_root: Path) -> list[dict[str, Any]]:
    """Execute the fixed command set at clean M and return coordinator-generated receipts."""

    environment = os.environ.copy()
    environment["MAXION_PROGRAM_PHASE"] = str(record["phase"])
    environment["MAXION_BUILD_REVISION"] = str(record["mergeSha"])
    receipts: list[dict[str, Any]] = []
    for command_id, command in CANONICAL_COMMANDS.items():
        stdout = bytearray()
        stderr = bytearray()
        exit_code = 0
        for argv in CANONICAL_EXECUTION[command_id]:
            try:
                result = subprocess.run(
                    argv,
                    cwd=repo_root,
                    env=environment,
                    capture_output=True,
                    timeout=2700,
                    check=False,
                )
            except (OSError, subprocess.SubprocessError) as exc:
                raise LedgerError(f"post-merge command {command_id!r} could not run: {exc}") from exc
            stdout.extend(result.stdout)
            stderr.extend(result.stderr)
            if len(stdout) > MAX_CAPTURE_BYTES or len(stderr) > MAX_CAPTURE_BYTES:
                raise LedgerError(
                    f"post-merge command {command_id!r} output exceeds {MAX_CAPTURE_BYTES} bytes; ledger unchanged"
                )
            exit_code = result.returncode
            if exit_code != 0:
                break
        if exit_code != 0:
            raise LedgerError(
                f"post-merge command {command_id!r} failed with exit code {exit_code}; ledger unchanged"
            )
        stdout_text = stdout.decode("utf-8", errors="replace")
        stderr_text = stderr.decode("utf-8", errors="replace")
        receipts.append({
            "id": command_id,
            "command": command,
            "status": "PASS",
            "exitCode": 0,
            "runSha": record["mergeSha"],
            "stdout": stdout_text,
            "stderr": stderr_text,
            "stdoutSha256": hashlib.sha256(stdout_text.encode("utf-8")).hexdigest(),
            "stderrSha256": hashlib.sha256(stderr_text.encode("utf-8")).hexdigest(),
        })
    return receipts


def _verify_append_checkout(record: dict[str, Any], target_ref: str, repo_root: Path) -> None:
    if target_ref != TARGET_REF or record.get("targetRef") != TARGET_REF:
        raise LedgerError(f"append target ref must be exactly {TARGET_REF}")
    target_sha = str(_git(repo_root, "rev-parse", f"{TARGET_REF}^{{commit}}"))
    if target_sha != record["mergeSha"]:
        raise LedgerError("append target ref must resolve exactly to mergeSha")
    head_sha = str(_git(repo_root, "rev-parse", "HEAD^{commit}"))
    if head_sha != record["mergeSha"]:
        raise LedgerError("append must run from HEAD exactly at mergeSha")
    if _git_commit_tree(repo_root, head_sha) != _git_commit_tree(repo_root, record["evidenceCommitSha"]):
        raise LedgerError("append HEAD full tree must equal the evidence full tree")
    if str(_git(repo_root, "status", "--porcelain=v1")):
        raise LedgerError("append must run from a clean merge checkout")


def append_record(
    path: Path,
    raw_record: Any,
    *,
    target_ref: str,
    repo_root: Path = ROOT,
) -> dict[str, Any]:
    if target_ref != TARGET_REF:
        raise LedgerError(f"append target ref must be exactly {TARGET_REF}")
    if not isinstance(raw_record, dict) or raw_record.get("targetRef") != target_ref:
        raise LedgerError("record targetRef must equal the append --target-ref")
    if raw_record.get("status") != ACCEPTED_STATUS:
        raise LedgerError("external ledger may contain only accepted phase records")
    if "postMergeCommands" in raw_record:
        raise LedgerError("postMergeCommands are coordinator-generated; input records may not supply them")
    validate_record(raw_record, external=False, repo_root=repo_root, require_post_merge=False)
    with _locked(path):
        if path.exists():
            document = _load(path)
            existing = _validate_external_chain(document, repo_root=repo_root)
            if existing and existing[-1]["mergeSha"] != raw_record["baseSha"]:
                raise LedgerError("append baseSha must equal the latest accepted mergeSha")
        else:
            document = {"schemaVersion": 1, "program": PROGRAM, "repository": REPOSITORY, "records": []}
            existing = []
        expected_phase = len(existing)
        if raw_record["phase"] != expected_phase:
            raise LedgerError(f"external ledger expected phase {expected_phase}, got {raw_record['phase']}")
        _validate_merge_identity(raw_record, repo_root)
        _validate_evidence_only(raw_record, repo_root)
        _verify_append_checkout(raw_record, target_ref, repo_root)
        previous = document["records"][-1]["recordSha256"] if document["records"] else "0" * 64
        record = dict(raw_record)
        record["postMergeCommands"] = _run_canonical_commands(record, repo_root)
        # Commands can mutate the checkout, move HEAD, or race a target-ref update.
        # Re-bind every append precondition after the last command and before bytes persist.
        _verify_append_checkout(record, target_ref, repo_root)
        record["previousRecordSha256"] = previous
        record["recordSha256"] = record_sha256(record)
        document["records"].append(record)
        validate_external(document, target_ref=target_ref, repo_root=repo_root)
        _atomic_write(path, document)
    return record


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("--ledger", type=Path, default=DEFAULT_EXTERNAL_LEDGER)
    validate_parser.add_argument("--target-ref", required=True)
    subparsers.add_parser("validate-tracked")
    bootstrap_parser = subparsers.add_parser("bootstrap")
    bootstrap_parser.add_argument("--ledger", type=Path, default=DEFAULT_EXTERNAL_LEDGER)
    bootstrap_parser.add_argument("--expected-phase", type=int, required=True)
    bootstrap_parser.add_argument("--target-ref", required=True)
    recover_parser = subparsers.add_parser("recover")
    recover_parser.add_argument("--ledger", type=Path, default=DEFAULT_EXTERNAL_LEDGER)
    append_parser = subparsers.add_parser("append")
    append_parser.add_argument("--ledger", type=Path, default=DEFAULT_EXTERNAL_LEDGER)
    append_parser.add_argument("--record", type=Path, required=True)
    append_parser.add_argument("--target-ref", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "validate":
            validate_external(_load(args.ledger), target_ref=args.target_ref)
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
        elif args.command == "recover":
            preserved, merge_sha = recover_external(args.ledger)
            print(f"Program ledger: recovered through merge {merge_sha}; corrupt bytes preserved at {preserved}")
        else:
            raw_record = _load(args.record)
            record = append_record(args.ledger, raw_record, target_ref=args.target_ref)
            print(f"Program ledger: appended phase {record['phase']} ({record['recordSha256']})")
    except LedgerError as exc:
        print(f"Program ledger: FAIL: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
