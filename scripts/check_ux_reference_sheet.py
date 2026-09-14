#!/usr/bin/env python3
"""Gate: a UX reference sheet is complete (contract) or proven (gated).

The sheet (docs/operations/ux-reference-sheet.template.md) is the contract a screen is built
against. This script is the check that refuses a merge when the contract is unfilled or the
evidence is missing. It is dependency-free on purpose so it can run from any interpreter.

Usage:
  scripts/check_ux_reference_sheet.py <sheet.md> [<sheet.md> ...]
  scripts/check_ux_reference_sheet.py --all            # every sheet under docs/operations/ux-reference-sheets/
  scripts/check_ux_reference_sheet.py --stage gated ... # force the stage regardless of the sheet's Status

Stages (taken from the sheet's `- **Status:**` line unless --stage overrides):
  contract  §1–§6 complete, no placeholders, ≥3 examined Mobbin links, a Figma node or an explicit
            missing-frame reason, all 18 laws + the interactivity-floor row filled; §7 may be `pending`.
  built     as contract, plus every §7 artifact path exists.
  gated     as built, plus every §7 result is PASS and §8 carries three distinct sign-offs.

Exit code 0 = pass; 1 = findings (printed one per line); 2 = usage error.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHEETS_DIR = ROOT / "docs" / "operations" / "ux-reference-sheets"

LAWS = [
    "Hick's",
    "Fitts's",
    "Jakob's",
    "Proximity",
    "Miller's",
    "Doherty",
    "Von Restorff",
    "Serial Position",
    "Peak-End",
    "Zeigarnik",
    "Prägnanz",
    "Similarity",
    "Uniform Connectedness",
    "Tesler's",
    "Postel's",
    "Parkinson's",
    "Occam's",
    "Pareto",
    "Interactivity floor",
]

REQUIRED_SECTIONS = [
    "## 1. Surface",
    "## 2. References",
    "## 3. Token and component mapping",
    "## 4. Laws-check",
    "## 5. State",
    "## 6. Interactivity floor",
    "## 7. Evidence",
    "## 8. Sign-off",
]

EVIDENCE_CHECKS = [
    "Side-by-side",
    "Token lint",
    "State-matrix test",
    "Accessibility check",
    "Visual regression",
    "Independent audit report",
    "Static-report test",
]

STAGES = ("contract", "built", "gated")
MIN_MOBBIN_LINKS = 3
SEMANTIC_STATE_COLUMNS = 7
CONTROL_STATE_COLUMNS = 9  # control + 8 interaction states
STATE_ID_RE = re.compile(r"^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$")

PLACEHOLDER_RE = re.compile(r"<[^>\n]{1,120}>|\bTODO\b|\bTBD\b")
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
MOBBIN_RE = re.compile(r"https://mobbin\.com/(?:screens|flows)/[0-9a-fA-F-]{36}")
FIGMA_RE = re.compile(r"file `([0-9A-Za-z]{22,128})`.*?node `(\d+:\d+)`", re.S)
FIGMA_MISSING_RE = re.compile(r"Figma frame:\*\*\s*(?:unavailable|not supplied) because\s+.{12,}", re.I)
STATUS_RE = re.compile(r"^- \*\*Status:\*\*\s*(\w+)", re.M)
SIGNOFF_RE = re.compile(r"^- \*\*(Builder|Verifier|QA):\*\*\s*(.+?)\s*[—-]\s*(.+)$", re.M)


def _sections(text: str) -> dict[str, str]:
    """Split the sheet into {heading: body} on `## N.` headings."""
    parts: dict[str, str] = {}
    current = "__preamble__"
    buf: list[str] = []
    for line in text.splitlines():
        if line.startswith("## "):
            parts[current] = "\n".join(buf)
            current = line.strip()
            buf = []
        else:
            buf.append(line)
    parts[current] = "\n".join(buf)
    return parts


def _section(parts: dict[str, str], prefix: str) -> str | None:
    for heading, body in parts.items():
        if heading.startswith(prefix):
            return body
    return None


def _table_rows(body: str) -> list[list[str]]:
    """Return data rows of the first markdown table in `body` as lists of stripped cells."""
    rows: list[list[str]] = []
    in_table = False
    for line in body.splitlines():
        if not line.lstrip().startswith("|"):
            if in_table:
                break
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", c) for c in cells if c):
            in_table = True
            continue  # separator
        if not in_table:
            continue  # header row
        rows.append(cells)
    return rows


def _subsection(body: str, heading: str) -> str:
    """Return a level-three subsection body, stopping at the next level-three heading."""

    marker = f"### {heading}"
    if marker not in body:
        return ""
    remainder = body.split(marker, 1)[1]
    return remainder.split("\n### ", 1)[0]


def semantic_state_ids(text: str) -> list[str]:
    """Return the stable semantic state IDs declared by a sheet."""

    states = _section(_sections(HTML_COMMENT_RE.sub("", text)), "## 5. State") or ""
    semantic = _subsection(states, "5.1 Semantic surface-state matrix")
    return [row[0] for row in _table_rows(semantic) if row]


def check_sheet(path: Path, stage_override: str | None = None) -> list[str]:
    findings: list[str] = []
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:  # pragma: no cover - surfaced as a finding
        return [f"{path}: cannot read ({exc})"]

    text = HTML_COMMENT_RE.sub("", raw)
    try:
        rel = path.relative_to(ROOT)
    except ValueError:
        rel = path

    m = STATUS_RE.search(text)
    stage = (stage_override or (m.group(1).lower() if m else "")).strip()
    if stage not in STAGES:
        findings.append(f"{rel}: Status must be one of {STAGES}; found {stage or 'none'!r}")
        stage = "contract"

    for placeholder in PLACEHOLDER_RE.findall(text):
        findings.append(f"{rel}: unfilled placeholder {placeholder!r}")

    parts = _sections(text)
    for heading in REQUIRED_SECTIONS:
        if _section(parts, heading) is None:
            findings.append(f"{rel}: missing section {heading!r}")

    refs = _section(parts, "## 2. References") or ""
    links = MOBBIN_RE.findall(refs)
    if len(links) < MIN_MOBBIN_LINKS:
        findings.append(f"{rel}: §2 needs at least {MIN_MOBBIN_LINKS} examined Mobbin links; found {len(links)}")
    has_figma = bool(FIGMA_RE.search(refs))
    has_missing_reason = bool(FIGMA_MISSING_RE.search(refs))
    if not has_figma and not has_missing_reason:
        findings.append(
            f"{rel}: §2 must cite the Figma frame as file `<fileKey>` … node `<n:n>`, "
            "or say 'Figma frame: unavailable because …'"
        )
    if stage in ("built", "gated") and not has_figma:
        findings.append(f"{rel}: §2 needs an approved Figma file/node before stage {stage}")
    for row in _table_rows(refs):
        if len(row) < 4 or not all(row[:4]):
            findings.append(f"{rel}: §2 reference row incomplete: {row}")

    mapping = _section(parts, "## 3. Token and component mapping") or ""
    map_rows = _table_rows(mapping)
    if not map_rows:
        findings.append(f"{rel}: §3 token/component mapping has no rows")
    for row in map_rows:
        if len(row) < 4 or not all(row[:4]):
            findings.append(f"{rel}: §3 mapping row incomplete: {row}")

    laws = _section(parts, "## 4. Laws-check") or ""
    law_rows = {row[0]: row for row in _table_rows(laws) if row}
    for law in LAWS:
        row = law_rows.get(law)
        if row is None:
            findings.append(f"{rel}: §4 missing law row {law!r}")
            continue
        if len(row) < 4 or not all(cell for cell in row[:4]):
            findings.append(f"{rel}: §4 row {law!r} has an empty cell")
            continue
        for cell in row[1:4]:
            if cell.strip().upper() == "N/A":
                findings.append(f"{rel}: §4 row {law!r}: 'N/A' needs a reason ('N/A because …')")

    states = _section(parts, "## 5. State") or ""
    semantic_rows = _table_rows(_subsection(states, "5.1 Semantic surface-state matrix"))
    if not semantic_rows:
        findings.append(f"{rel}: §5.1 semantic surface-state matrix has no rows")
    semantic_ids = [row[0] for row in semantic_rows if row]
    for duplicate in sorted({state_id for state_id in semantic_ids if semantic_ids.count(state_id) > 1}):
        findings.append(f"{rel}: §5.1 duplicate semantic state id {duplicate!r}")
    for row in semantic_rows:
        if len(row) < SEMANTIC_STATE_COLUMNS or not all(row[:SEMANTIC_STATE_COLUMNS]):
            findings.append(
                f"{rel}: §5.1 semantic state row incomplete "
                f"({len(row)}/{SEMANTIC_STATE_COLUMNS} cells): {row[:1]}"
            )
            continue
        if not STATE_ID_RE.fullmatch(row[0]):
            findings.append(f"{rel}: §5.1 invalid semantic state id {row[0]!r}")
        for cell in row[1:SEMANTIC_STATE_COLUMNS]:
            if cell.strip().upper() == "N/A":
                findings.append(f"{rel}: §5.1 state {row[0]!r}: 'N/A' needs a reason ('N/A because …')")

    control_rows = _table_rows(_subsection(states, "5.2 Control interaction-state matrix"))
    if not control_rows:
        findings.append(f"{rel}: §5.2 control interaction-state matrix has no rows")
    for row in control_rows:
        if len(row) < CONTROL_STATE_COLUMNS or not all(row[:CONTROL_STATE_COLUMNS]):
            findings.append(
                f"{rel}: §5.2 control state row incomplete "
                f"({len(row)}/{CONTROL_STATE_COLUMNS} cells): {row[:1]}"
            )

    floor = _section(parts, "## 6. Interactivity floor") or ""
    for item in (
        "Composer in context",
        "Every shown state actionable",
        "Live, not snapshot",
        "Direct manipulation",
        "No dead ends",
        "Approvals and questions separate",
    ):
        if item not in floor:
            findings.append(f"{rel}: §6 missing interactivity-floor item {item!r}")

    evidence = _section(parts, "## 7. Evidence") or ""
    ev_rows = _table_rows(evidence)
    seen_checks = {row[0] for row in ev_rows if row}
    for check in EVIDENCE_CHECKS:
        if not any(check in c for c in seen_checks):
            findings.append(f"{rel}: §7 missing evidence row {check!r}")
    if stage in ("built", "gated"):
        for row in ev_rows:
            if len(row) < 3:
                findings.append(f"{rel}: §7 row incomplete: {row}")
                continue
            check, artifact, result = row[0], row[1], row[2]
            if artifact.lower() == "pending" or not artifact:
                findings.append(f"{rel}: §7 {check!r} has no artifact (stage {stage})")
            elif not (ROOT / artifact).exists():
                findings.append(f"{rel}: §7 {check!r} artifact not found: {artifact}")
            if stage == "gated" and result.strip().upper() != "PASS":
                findings.append(f"{rel}: §7 {check!r} result is {result!r}, not PASS")

    signoff = _section(parts, "## 8. Sign-off") or ""
    roles = {m.group(1): (m.group(2).strip(), m.group(3).strip()) for m in SIGNOFF_RE.finditer(signoff)}
    for role in ("Builder", "Verifier", "QA"):
        if role not in roles:
            findings.append(f"{rel}: §8 missing sign-off line for {role}")
    if stage == "gated":
        names = [roles[r][0] for r in ("Builder", "Verifier", "QA") if r in roles]
        if any(n.lower().startswith("unassigned") or n.lower() == "pending" for n in names):
            findings.append(f"{rel}: §8 gated sheet has an unassigned sign-off")
        if len(set(n.lower() for n in names)) != len(names):
            findings.append(f"{rel}: §8 sign-offs must be three distinct people or sessions: {names}")
        if any(d.lower() == "pending" for _, d in roles.values()):
            findings.append(f"{rel}: §8 gated sheet has a pending sign-off date")

    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("sheets", nargs="*", help="sheet paths")
    parser.add_argument("--all", action="store_true", help=f"check every sheet under {SHEETS_DIR.relative_to(ROOT)}")
    parser.add_argument("--stage", choices=STAGES, help="override the stage read from the sheet")
    args = parser.parse_args(argv)

    paths = [Path(p).resolve() for p in args.sheets]
    if args.all:
        paths += sorted(SHEETS_DIR.glob("*.md"))
    if not paths:
        parser.error("give at least one sheet path or --all")

    findings: list[str] = []
    for path in paths:
        findings += check_sheet(path, args.stage)

    if findings:
        print(f"UX reference sheet gate: {len(findings)} finding(s)")
        for f in findings:
            print(f"  - {f}")
        return 1
    print(f"UX reference sheet gate: {len(paths)} sheet(s) pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
