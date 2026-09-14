#!/usr/bin/env python3
"""Reject phase plans that cannot be executed cold from their ordered-task text."""

from __future__ import annotations

import re
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN_DIR = ROOT / "docs" / "implementation-plans" / "2026-09-13-maxion-platform-demo-ui-foundation"
ACCEPTANCE_PROTOCOL = ROOT / "docs" / "operations" / "phase-acceptance-protocol.md"
PHASE_GLOB = "[0-1][0-9]-phase-*.md"

TASK_RE = re.compile(r"^\d+\. \*\*.+?\((\d+\.\d+)\)\.\*\*", re.M)
ROW_RE = re.compile(
    r"^\|\s*(\d+\.\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$",
    re.M,
)
CODE_RE = re.compile(r"`([^`]+)`")
HANDOFF_RE = re.compile(
    r"^### Structured acceptance hand-off\s*\n\s*```json\s*\n(\{.*?\})\s*\n```\s*$",
    re.M | re.S,
)
PARENT_RANGE_RE = re.compile(r"\| (RC-[^|]+) \| Phase (\d+) tasks (\d+\.\d+)–(\d+\.\d+)(?:,[^|]*)? \|")


def _ordered_section(text: str) -> str:
    match = re.search(r"^## Ordered tasks\s*$([\s\S]*?)(?=^##\s|\Z)", text, re.M)
    return match.group(1) if match else ""


def check_plan(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    section = _ordered_section(text)
    if not section:
        return [f"{path}: missing Ordered tasks section"]
    tasks = TASK_RE.findall(section)
    rows = {task: (serves, files, prerequisite, verify) for task, serves, files, prerequisite, verify in ROW_RE.findall(section)}
    findings: list[str] = []
    if len(tasks) != len(set(tasks)):
        findings.append(f"{path}: duplicate ordered task id")
    phase_match = re.search(r"-phase-(\d+)(?:-|\.)", path.name)
    phase = int(phase_match.group(1)) if phase_match else -1
    expected_tasks = [f"{phase}.{index}" for index in range(1, len(tasks) + 1)]
    if tasks != expected_tasks:
        findings.append(f"{path}: ordered task ids must be contiguous: {expected_tasks}")
    missing = sorted(set(tasks) - set(rows))
    extra = sorted(set(rows) - set(tasks))
    if missing:
        findings.append(f"{path}: cold-executor contracts missing for {', '.join(missing)}")
    if extra:
        findings.append(f"{path}: cold-executor contracts have unknown tasks {', '.join(extra)}")
    if f"docs/operations/program-phase-ledger.json#phases[{phase}]" in text:
        findings.append(
            f"{path}: current phase may not claim its unknowable C/E/M in the lagging tracked ledger"
        )
    if "optional evidence-only E" in text:
        findings.append(f"{path}: evidence-only E is required and distinct, never optional")
    for task in tasks:
        if task not in rows:
            continue
        serves, files, prerequisite, verify = rows[task]
        if not re.search(r"\bRC-\d{2}\b", serves) or not re.search(r"\bADR-\d+\b", serves):
            findings.append(f"{path}: {task}: Serves must name at least one RC and ADR")
        exact_targets = CODE_RE.findall(files)
        if not exact_targets or any("*" in item or "{" in item or "}" in item for item in exact_targets):
            findings.append(f"{path}: {task}: files/symbols must be exact backticked targets without globs")
        if len(prerequisite.strip()) < 8 or prerequisite.strip().lower() in {"none", "n/a", "tbd"}:
            findings.append(f"{path}: {task}: prerequisite must name a concrete accepted state or prior task")
        commands = CODE_RE.findall(verify)
        if not commands or not any(
            command.startswith(("pnpm ", "python3 ", "git ")) for command in commands
        ):
            findings.append(f"{path}: {task}: focused verification must provide an exact runnable command")
    handoff_match = HANDOFF_RE.search(text)
    if not handoff_match:
        findings.append(f"{path}: missing structured acceptance hand-off")
    else:
        try:
            handoff = json.loads(handoff_match.group(1))
        except json.JSONDecodeError as exc:
            findings.append(f"{path}: structured acceptance hand-off is invalid JSON: {exc}")
        else:
            expected_keys = {"schemaVersion", "phase", "nextPhase", "status", "evidence", "reviewers"}
            if not isinstance(handoff, dict) or set(handoff) != expected_keys:
                findings.append(f"{path}: structured acceptance hand-off schema is invalid")
            elif (
                handoff.get("schemaVersion") != 1
                or handoff.get("phase") != phase
                or handoff.get("nextPhase") != (phase + 1 if phase < 11 else None)
                or handoff.get("status") not in {"pending", "accepted"}
            ):
                findings.append(f"{path}: structured acceptance hand-off identity/status is invalid")
    return findings


def check_parent_ranges(parent: Path, phase_paths: list[Path]) -> list[str]:
    text = parent.read_text(encoding="utf-8")
    actual: dict[int, tuple[str, str]] = {}
    for path in phase_paths:
        phase = int(re.search(r"-phase-(\d+)(?:-|\.)", path.name).group(1))
        tasks = TASK_RE.findall(_ordered_section(path.read_text(encoding="utf-8")))
        if tasks:
            actual[phase] = (tasks[0], tasks[-1])
    declared = {
        int(phase): (start, end)
        for _, phase, start, end in PARENT_RANGE_RE.findall(text)
    }
    findings: list[str] = []
    for phase, task_range in actual.items():
        if declared.get(phase) != task_range:
            findings.append(
                f"{parent}: Phase {phase} task range must be {task_range[0]}–{task_range[1]}"
            )
    return findings


def _normalized_text(path: Path) -> str:
    return " ".join(path.read_text(encoding="utf-8").casefold().split())


def check_qualification_contracts(
    plan_dir: Path = PLAN_DIR, protocol: Path = ACCEPTANCE_PROTOCOL
) -> list[str]:
    """Keep cold-path, Phase 10 run-count, and Phase 11 package invariants truthful."""

    phase_3 = plan_dir / "04-phase-3-discover.md"
    phase_10 = plan_dir / "11-phase-10-qualification.md"
    phase_11 = plan_dir / "12-phase-11-maxai-adoption.md"
    findings: list[str] = []
    required = {
        phase_3: (
            "`src/features/discovery-autonomous/domain/discoverystate.ts#discoverystate`",
            "`src/features/discovery-autonomous/domain/discoveryrepository.ts#discoveryrepository`",
            "`src/features/discovery-autonomous/domain/discoveryhandoff.spec.ts#package-provenance`",
            "`docs/operations/figma-code-map.json#surfaces[discover-workspace].statebinding.sourceowner`",
        ),
        phase_10: (
            "three separate clean invocations",
            "clean-m `phase-tests` group exactly once",
            "`strict-preview-runs.json` is parsed by the acceptance gate",
            "the same three ordered pass entries as qa's `browserruns`",
            "no six-run or precomputed m-artifact claim exists",
        ),
        phase_11: (
            "the exact ordered checklist `package-integrity`, `traceability`, `proof-boundary`, `rollback`, `bootstrap`",
            "qa `browserruns` is absent—not empty and not fabricated",
            "figma/mobbin comparison, the laws-check, browser ui proof",
        ),
        protocol: (
            "qa additionally binds exactly three independent browser runs",
            "clean-m is a separate coordinator qualification",
            "phase 11 `package` scope binds no sheet or browser run",
        ),
    }
    for path, phrases in required.items():
        if not path.is_file():
            findings.append(f"{path}: required qualification contract is missing")
            continue
        text = _normalized_text(path)
        for phrase in phrases:
            if phrase not in text:
                findings.append(f"{path}: missing qualification invariant: {phrase}")
    if phase_3.is_file() and "src/features/discovery-autonomous/discoverystate" in _normalized_text(phase_3):
        findings.append(f"{phase_3}: Discover domain state path may not be feature-root-owned")
    return findings


def check_all(plan_dir: Path = PLAN_DIR) -> list[str]:
    paths = sorted(plan_dir.glob(PHASE_GLOB))
    findings: list[str] = []
    if len(paths) != 12:
        findings.append(f"{plan_dir}: expected exactly 12 phase plans, found {len(paths)}")
    for path in paths:
        findings.extend(check_plan(path))
    parent = plan_dir / "00-parent-roadmap.md"
    if parent.is_file():
        findings.extend(check_parent_ranges(parent, paths))
        if "three complete independent strict-preview runs" not in parent.read_text(encoding="utf-8").lower():
            findings.append(f"{parent}: missing the three-run strict-preview qualification rule")
    else:
        findings.append(f"{plan_dir}: parent roadmap is missing")
    findings.extend(check_qualification_contracts(plan_dir))
    return findings


def main() -> int:
    findings = check_all()
    if findings:
        print(f"Implementation plan gate: {len(findings)} finding(s)")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    print("Implementation plan gate: pass (every ordered task has a cold-executor contract)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
