#!/usr/bin/env python3
"""Reject phase plans that cannot be executed cold from their ordered-task text."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN_DIR = ROOT / "docs" / "implementation-plans" / "2026-09-13-maxion-platform-demo-ui-foundation"
PHASE_GLOB = "[0-1][0-9]-phase-*.md"

TASK_RE = re.compile(r"^\d+\. \*\*.+?\((\d+\.\d+)\)\.\*\*", re.M)
ROW_RE = re.compile(
    r"^\|\s*(\d+\.\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$",
    re.M,
)
CODE_RE = re.compile(r"`([^`]+)`")


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
    missing = sorted(set(tasks) - set(rows))
    extra = sorted(set(rows) - set(tasks))
    if missing:
        findings.append(f"{path}: cold-executor contracts missing for {', '.join(missing)}")
    if extra:
        findings.append(f"{path}: cold-executor contracts have unknown tasks {', '.join(extra)}")
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
    return findings


def check_all(plan_dir: Path = PLAN_DIR) -> list[str]:
    paths = sorted(plan_dir.glob(PHASE_GLOB))
    findings: list[str] = []
    if len(paths) != 12:
        findings.append(f"{plan_dir}: expected exactly 12 phase plans, found {len(paths)}")
    for path in paths:
        findings.extend(check_plan(path))
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
