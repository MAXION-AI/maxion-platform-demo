#!/usr/bin/env python3
"""Gate the inventory -> reference-sheet -> Figma-node -> implementation contract.

This is an offline structural gate. Figma node accessibility is verified through the Figma connector
and recorded in the program ledger; this script prevents the checked-in identities from drifting.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "docs" / "operations" / "figma-code-map.json"
DEFAULT_INVENTORY = ROOT / "docs" / "operations" / "ux-surface-inventory.md"
SHEETS_DIR = ROOT / "docs" / "operations" / "ux-reference-sheets"

EXPECTED_SURFACE_IDS = {
    "platform-shell-dashboard",
    "projects-workspace",
    "discover-workspace",
    "plan-workspace",
    "execute-workspace",
    "agentix-operations",
    "agentix-run-canvas",
    "consult-max-workspace",
    "settings-workspace",
    "integrations-workspace",
    "approvals-workspace",
    "usage-workspace",
    "help-workspace",
}

SHEET_ID_RE = re.compile(r"^- \*\*Sheet id:\*\*\s*([^\s]+)\s*$", re.M)
STATUS_RE = re.compile(r"^- \*\*Status:\*\*\s*(contract|built|gated)\s*$", re.M)
FIGMA_RE = re.compile(r"file `([0-9A-Za-z]{22,128})`.*?node `(\d+:\d+)`", re.S)
SYMBOL_RE_TEMPLATE = r"(?<![A-Za-z0-9_$]){}(?![A-Za-z0-9_$])"
IMPORT_RE = re.compile(
    r"(?:import|export)\s+(?:[^;\"']*?\s+from\s+)?[\"']([^\"']+)[\"']|import\(\s*[\"']([^\"']+)[\"']\s*\)",
    re.M,
)


def _load_json(path: Path) -> tuple[dict[str, Any] | None, list[str]]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return None, [f"{path}: cannot load manifest ({exc})"]
    if not isinstance(value, dict):
        return None, [f"{path}: manifest root must be an object"]
    return value, []


def _inventory_rows(path: Path) -> tuple[dict[str, tuple[str, str]], list[str]]:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        return {}, [f"{path}: cannot read inventory ({exc})"]

    rows: dict[str, tuple[str, str]] = {}
    findings: list[str] = []
    for line in text.splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 7 or not cells[0].isdigit():
            continue
        surface_id = cells[1]
        sheet = cells[4].strip("`")
        frame_status = cells[6]
        if surface_id in rows:
            findings.append(f"{path}: duplicate inventory surface id {surface_id!r}")
        rows[surface_id] = (sheet, frame_status)
    if not rows:
        findings.append(f"{path}: no surface rows found in seven-column inventory table")
    return rows, findings


def _duplicates(values: list[str]) -> list[str]:
    return sorted(value for value, count in Counter(values).items() if count > 1)


def _safe_source_path(relative: str) -> Path | None:
    candidate = (ROOT / relative).resolve()
    source_root = (ROOT / "src").resolve()
    try:
        candidate.relative_to(source_root)
    except ValueError:
        return None
    return candidate


def _resolve_source_import(source: Path, specifier: str) -> Path | None:
    if specifier.startswith("@/"):
        base = ROOT / "src" / specifier[2:]
    elif specifier.startswith("."):
        base = source.parent / specifier
    else:
        return None

    candidates = [base]
    if not base.suffix:
        candidates.extend(base.with_suffix(suffix) for suffix in (".ts", ".tsx", ".js", ".jsx", ".css"))
        candidates.extend(base / f"index{suffix}" for suffix in (".ts", ".tsx", ".js", ".jsx"))
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved.is_file():
            return resolved
    return None


def _production_source_graph(entry: Path | None = None) -> set[Path]:
    """Return files reachable from the browser production entry, excluding test-only reachability."""

    pending = [(entry or (ROOT / "src" / "main.tsx")).resolve()]
    reachable: set[Path] = set()
    while pending:
        source = pending.pop()
        if source in reachable or not source.is_file():
            continue
        reachable.add(source)
        if source.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        text = source.read_text(encoding="utf-8")
        for match in IMPORT_RE.finditer(text):
            target = _resolve_source_import(source, match.group(1) or match.group(2))
            if target is not None and target not in reachable:
                pending.append(target)
    return reachable


def check_contract(
    manifest_path: Path = DEFAULT_MANIFEST,
    inventory_path: Path = DEFAULT_INVENTORY,
) -> list[str]:
    manifest, findings = _load_json(manifest_path)
    inventory, inventory_findings = _inventory_rows(inventory_path)
    findings.extend(inventory_findings)
    if manifest is None:
        return findings

    if manifest.get("schemaVersion") != 1:
        findings.append(f"{manifest_path}: schemaVersion must be 1")
    if manifest.get("authority") != "docs/operations/ux-surface-inventory.md":
        findings.append(f"{manifest_path}: authority must name the UX surface inventory")

    surfaces = manifest.get("surfaces")
    if not isinstance(surfaces, list):
        return findings + [f"{manifest_path}: surfaces must be an array"]

    objects = [surface for surface in surfaces if isinstance(surface, dict)]
    production_sources = _production_source_graph()
    if len(objects) != len(surfaces):
        findings.append(f"{manifest_path}: every surface entry must be an object")

    ids = [str(surface.get("surfaceId", "")) for surface in objects]
    route_states = [str(surface.get("routeState", "")) for surface in objects]
    sheets = [str(surface.get("referenceSheet", "")) for surface in objects]
    figma_pairs: list[str] = []
    for surface in objects:
        figma = surface.get("figma")
        if isinstance(figma, dict):
            figma_pairs.append(f"{figma.get('fileKey', '')}:{figma.get('nodeId', '')}")

    for label, values in (
        ("surfaceId", ids),
        ("routeState", route_states),
        ("referenceSheet", sheets),
        ("Figma file/node", figma_pairs),
    ):
        for duplicate in _duplicates(values):
            findings.append(f"{manifest_path}: duplicate {label} {duplicate!r}")

    actual_ids = set(ids)
    for missing in sorted(EXPECTED_SURFACE_IDS - actual_ids):
        findings.append(f"{manifest_path}: missing required surface {missing!r}")
    for unexpected in sorted(actual_ids - EXPECTED_SURFACE_IDS):
        findings.append(f"{manifest_path}: unexpected surface {unexpected!r}")

    for surface in objects:
        surface_id = str(surface.get("surfaceId", ""))
        route = surface.get("route")
        route_state = surface.get("routeState")
        sheet_name = surface.get("referenceSheet")
        figma = surface.get("figma")
        implementation = surface.get("implementation")

        if not isinstance(route, str) or not route.startswith("/"):
            findings.append(f"{manifest_path}: {surface_id}: route must start with '/'")
        if not isinstance(route_state, str) or not route_state:
            findings.append(f"{manifest_path}: {surface_id}: routeState is required")
        if not isinstance(sheet_name, str) or not sheet_name.endswith(".md"):
            findings.append(f"{manifest_path}: {surface_id}: referenceSheet must be a markdown filename")
            continue

        sheet_path = SHEETS_DIR / sheet_name
        try:
            sheet_text = sheet_path.read_text(encoding="utf-8")
        except OSError as exc:
            findings.append(f"{manifest_path}: {surface_id}: cannot read {sheet_path} ({exc})")
            continue

        sheet_id_match = SHEET_ID_RE.search(sheet_text)
        if not sheet_id_match or sheet_id_match.group(1) != surface_id:
            found = sheet_id_match.group(1) if sheet_id_match else "none"
            findings.append(f"{sheet_path}: Sheet id {found!r} does not match {surface_id!r}")
        if not STATUS_RE.search(sheet_text):
            findings.append(f"{sheet_path}: missing recognized contract status")

        if not isinstance(figma, dict):
            findings.append(f"{manifest_path}: {surface_id}: figma must be an object")
        else:
            file_key = figma.get("fileKey")
            node_id = figma.get("nodeId")
            sheet_figma = FIGMA_RE.search(sheet_text)
            if not isinstance(file_key, str) or not re.fullmatch(r"[0-9A-Za-z]{22,128}", file_key):
                findings.append(f"{manifest_path}: {surface_id}: invalid Figma file key")
            if not isinstance(node_id, str) or not re.fullmatch(r"\d+:\d+", node_id):
                findings.append(f"{manifest_path}: {surface_id}: invalid Figma node id")
            if not sheet_figma or sheet_figma.groups() != (file_key, node_id):
                found = sheet_figma.groups() if sheet_figma else None
                findings.append(
                    f"{sheet_path}: Figma mapping {found!r} does not match manifest {(file_key, node_id)!r}"
                )

        inventory_entry = inventory.get(surface_id)
        if inventory_entry is None:
            findings.append(f"{inventory_path}: missing surface {surface_id!r}")
        else:
            inventory_sheet, frame_status = inventory_entry
            if inventory_sheet != sheet_name:
                findings.append(
                    f"{inventory_path}: {surface_id}: sheet {inventory_sheet!r} does not match {sheet_name!r}"
                )
            node_id = figma.get("nodeId") if isinstance(figma, dict) else ""
            if node_id and f"`{node_id}`" not in frame_status and node_id not in frame_status:
                findings.append(f"{inventory_path}: {surface_id}: frame status omits node {node_id}")

        if not isinstance(implementation, list) or not implementation:
            findings.append(f"{manifest_path}: {surface_id}: implementation must be a non-empty array")
            continue
        for owner in implementation:
            if not isinstance(owner, str) or owner.count("#") != 1:
                findings.append(f"{manifest_path}: {surface_id}: invalid implementation owner {owner!r}")
                continue
            relative, symbol = owner.split("#", 1)
            source_path = _safe_source_path(relative)
            if source_path is None:
                findings.append(f"{manifest_path}: {surface_id}: owner escapes src/ ({relative!r})")
                continue
            if not source_path.is_file():
                findings.append(f"{manifest_path}: {surface_id}: owner file missing ({relative})")
                continue
            if source_path not in production_sources:
                findings.append(
                    f"{manifest_path}: {surface_id}: owner is not reachable from src/main.tsx ({relative})"
                )
            source = source_path.read_text(encoding="utf-8")
            if not re.search(SYMBOL_RE_TEMPLATE.format(re.escape(symbol)), source):
                findings.append(f"{manifest_path}: {surface_id}: symbol {symbol!r} missing from {relative}")

    inventory_ids = set(inventory)
    for orphan in sorted(inventory_ids - actual_ids):
        findings.append(f"{inventory_path}: surface {orphan!r} is absent from the manifest")

    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--inventory", type=Path, default=DEFAULT_INVENTORY)
    args = parser.parse_args(argv)

    findings = check_contract(args.manifest.resolve(), args.inventory.resolve())
    if findings:
        print(f"UX contract coverage gate: {len(findings)} finding(s)")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    print(f"UX contract coverage gate: {len(EXPECTED_SURFACE_IDS)} surface(s) pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
