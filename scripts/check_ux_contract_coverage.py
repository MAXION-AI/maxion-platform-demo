#!/usr/bin/env python3
"""Gate route, state, Figma, runtime, style, timer, and legacy ownership."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import check_ux_reference_sheet as sheet_gate

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "docs" / "operations" / "figma-code-map.json"
DEFAULT_INVENTORY = ROOT / "docs" / "operations" / "ux-surface-inventory.md"
SHEETS_DIR = ROOT / "docs" / "operations" / "ux-reference-sheets"
PLAN_DIR = ROOT / "docs" / "implementation-plans" / "2026-09-13-maxion-platform-demo-ui-foundation"
EXPECTED_SURFACE_IDS = {
    "platform-shell-dashboard", "projects-workspace", "discover-workspace", "plan-workspace",
    "execute-workspace", "agentix-operations", "agentix-run-canvas", "consult-max-workspace",
    "settings-workspace", "integrations-workspace", "approvals-workspace", "usage-workspace",
    "help-workspace",
}
SHEET_ID_RE = re.compile(r"^- \*\*Sheet id:\*\*\s*([^\s]+)\s*$", re.M)
STATUS_RE = re.compile(r"^- \*\*Status:\*\*\s*(contract|built|gated)\s*$", re.M)
FIGMA_RE = re.compile(r"file \x60([0-9A-Za-z]{22,128})\x60.*?node \x60(\d+:\d+)\x60", re.S)
IMPORT_RE = re.compile(
    r"(?:import|export)\s+(?:[^;\"']*?\s+from\s+)?[\"']([^\"']+)[\"']|"
    r"import\(\s*[\"']([^\"']+)[\"']\s*\)", re.M
)
ROUTE_RE = re.compile(r"<Route\s+path=[\"']([^\"']+)[\"']")
REDIRECT_ROUTE_RE = re.compile(
    r"<Route\s+path=[\"']([^\"']+)[\"'][^>]*element=\{<Navigate\s+to=[\"']([^\"']+)[\"']"
)
TIMER_RE = re.compile(r"\b(?:window\.)?(?:setTimeout|setInterval|requestAnimationFrame)\s*\(")
SUPPRESSION_RE = re.compile(
    r"eslint-disable|@ts-ignore|@ts-expect-error|biome-ignore|prettier-ignore|istanbul\s+ignore"
)
CSS_CLASS_RE = re.compile(r"\.([A-Za-z_][A-Za-z0-9_-]*)")
SOURCE_TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_-]*")
PHASE_STATE_RE = re.compile(
    r"^- \*\*Required surface state IDs \(\x60([^\x60]+)\x60\):\*\*\s*(.+)$", re.M
)
STATE_TOKEN_RE = re.compile(r"\x60([a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+)\x60")
FORBIDDEN_LEGACY_MARKERS = ["@deprecated", "legacyOwner", "obsoleteRoute", "compatibilityShim"]
PHASE_0_STALE_SELECTOR_BASELINE = 339
ACCEPTANCE_PHASES = {
    "platform-shell-dashboard": 0,
    "projects-workspace": 2,
    "discover-workspace": 3,
    "plan-workspace": 4,
    "execute-workspace": 5,
    "agentix-operations": 6,
    "agentix-run-canvas": 7,
    "consult-max-workspace": 8,
    "settings-workspace": 9,
    "integrations-workspace": 9,
    "approvals-workspace": 9,
    "usage-workspace": 9,
    "help-workspace": 9,
}


def _load_json(path: Path) -> tuple[dict[str, Any] | None, list[str]]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return None, [f"{path}: cannot load manifest ({exc})"]
    return (value, []) if isinstance(value, dict) else (None, [f"{path}: root must be an object"])


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
        if cells[1] in rows:
            findings.append(f"{path}: duplicate inventory surface id {cells[1]!r}")
        rows[cells[1]] = (cells[4].strip(chr(96)), cells[6])
    return rows, findings


def _duplicates(values: list[str]) -> list[str]:
    return sorted(value for value, count in Counter(values).items() if value and count > 1)


def _safe_source_path(relative: str) -> Path | None:
    candidate = (ROOT / relative).resolve()
    try:
        candidate.relative_to((ROOT / "src").resolve())
    except ValueError:
        return None
    return candidate


def _safe_repo_path(relative: str) -> Path | None:
    candidate = (ROOT / relative).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        return None
    return candidate


def _git(*args: str, allow_status_one: bool = False) -> str | bool:
    try:
        result = subprocess.run(
            ["git", "-C", str(ROOT), *args],
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return False if allow_status_one else ""
    if allow_status_one and result.returncode in {0, 1}:
        return result.returncode == 0
    return result.stdout.strip() if result.returncode == 0 else ""


def _candidate_phase(explicit: int | None = None) -> int:
    """Resolve the phase under test; accepted-predecessor lag can never defer a deadline."""

    ledger_path = ROOT / "docs" / "operations" / "program-phase-ledger.json"
    try:
        ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        raise ValueError(f"cannot load candidate phase from {ledger_path}")
    declared = ledger.get("candidatePhase") if isinstance(ledger, dict) else None
    if not isinstance(declared, int) or declared < 0:
        raise ValueError("tracked ledger must declare a non-negative candidatePhase")
    env_value = os.environ.get("MAXION_PROGRAM_PHASE")
    selected = explicit if explicit is not None else int(env_value) if env_value is not None else declared
    if selected != declared:
        raise ValueError(
            f"candidate phase mismatch: selected {selected}, tracked ledger declares {declared}"
        )
    return selected


def _resolve_import(source: Path, specifier: str) -> Path | None:
    if specifier.startswith("@/"):
        base = ROOT / "src" / specifier[2:]
    elif specifier.startswith("."):
        base = source.parent / specifier
    else:
        return None
    candidates = [base]
    if not base.suffix:
        candidates += [base.with_suffix(s) for s in (".ts", ".tsx", ".js", ".jsx", ".css")]
        candidates += [base / f"index{s}" for s in (".ts", ".tsx", ".js", ".jsx")]
    return next((p.resolve() for p in candidates if p.resolve().is_file()), None)


def _production_graph(entry: Path | None = None) -> set[Path]:
    pending = [(entry or ROOT / "src" / "main.tsx").resolve()]
    reachable: set[Path] = set()
    while pending:
        source = pending.pop()
        if source in reachable or not source.is_file():
            continue
        reachable.add(source)
        if source.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        for match in IMPORT_RE.finditer(source.read_text(encoding="utf-8")):
            target = _resolve_import(source, match.group(1) or match.group(2))
            if target is not None and target not in reachable:
                pending.append(target)
    return reachable


def _phase_states(path: Path, surface_id: str) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return []
    return next(
        (STATE_TOKEN_RE.findall(body) for sid, body in PHASE_STATE_RE.findall(text) if sid == surface_id),
        [],
    )


def _stale_selector_count(sources: set[Path]) -> int:
    css = "\n".join(p.read_text(encoding="utf-8") for p in sources if p.suffix == ".css")
    code = "\n".join(
        p.read_text(encoding="utf-8") for p in sources if p.suffix in {".ts", ".tsx", ".js", ".jsx"}
    )
    return len(set(CSS_CLASS_RE.findall(css)) - set(SOURCE_TOKEN_RE.findall(code)))


def check_contract(
    manifest_path: Path = DEFAULT_MANIFEST,
    inventory_path: Path = DEFAULT_INVENTORY,
    entry_path: Path | None = None,
    candidate_phase: int | None = None,
    head_commit: str = "HEAD",
) -> list[str]:
    manifest, findings = _load_json(manifest_path)
    inventory, inventory_findings = _inventory_rows(inventory_path)
    findings += inventory_findings
    if manifest is None:
        return findings
    if manifest.get("schemaVersion") != 2:
        findings.append(f"{manifest_path}: schemaVersion must be 2")
    if manifest.get("authority") != "docs/operations/ux-surface-inventory.md":
        findings.append(f"{manifest_path}: authority must name the UX surface inventory")
    sources = _production_graph(entry_path)
    source_ownership = manifest.get("sourceOwnership", {})
    main_path = (entry_path or ROOT / "src" / "main.tsx").resolve()
    main_text = main_path.read_text(encoding="utf-8") if main_path.is_file() else ""
    production_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sources
        if path.suffix in {".ts", ".tsx", ".js", ".jsx"}
    )
    candidate_phase = _candidate_phase(candidate_phase)

    route_entries = manifest.get("routes")
    routes = route_entries if isinstance(route_entries, list) else []
    declared_routes = [str(item.get("path", "")) for item in routes if isinstance(item, dict)]
    actual_routes = ROUTE_RE.findall(production_text)
    actual_redirects = dict(REDIRECT_ROUTE_RE.findall(production_text))
    if Counter(declared_routes) != Counter(actual_routes):
        findings.append(f"{manifest_path}: declared routes do not match production routes")
    for item in routes:
        if not isinstance(item, dict):
            findings.append(f"{manifest_path}: every route entry must be an object")
            continue
        kind = item.get("classification")
        if kind not in {"canonical", "redirect", "compatibility-alias"}:
            findings.append(f"{manifest_path}: route {item.get('path')!r} has invalid classification")
        if kind == "compatibility-alias" and (
            not isinstance(item.get("removeByPhase"), int) or not item.get("reason")
        ):
            findings.append(f"{manifest_path}: compatibility alias needs removal phase and reason")
        if kind == "compatibility-alias" and isinstance(item.get("removeByPhase"), int):
            if candidate_phase >= item["removeByPhase"]:
                findings.append(f"{manifest_path}: compatibility alias {item.get('path')!r} missed its phase deadline")
        if kind == "redirect":
            target = item.get("target")
            if actual_redirects.get(item.get("path")) != target:
                findings.append(f"{manifest_path}: redirect {item.get('path')!r} does not match production Navigate target")

    raw_surfaces = manifest.get("surfaces")
    if not isinstance(raw_surfaces, list):
        return findings + [f"{manifest_path}: surfaces must be an array"]
    surfaces = [item for item in raw_surfaces if isinstance(item, dict)]
    ids = [str(item.get("surfaceId", "")) for item in surfaces]
    if set(ids) != EXPECTED_SURFACE_IDS:
        findings.append(f"{manifest_path}: surface set does not match the 13 required surfaces")
    for duplicate in _duplicates(ids):
        findings.append(f"{manifest_path}: duplicate surfaceId {duplicate!r}")
    canonical_routes = {
        item.get("path") for item in routes
        if isinstance(item, dict) and item.get("classification") == "canonical"
    }
    for item in routes:
        if not isinstance(item, dict):
            continue
        if item.get("classification") in {"canonical", "compatibility-alias"} and item.get("owner") not in ids:
            findings.append(f"{manifest_path}: route {item.get('path')!r} owner is not a declared surface")
        if item.get("classification") == "redirect" and item.get("target") not in canonical_routes:
            findings.append(f"{manifest_path}: redirect {item.get('path')!r} target is not a canonical route")
    exclusive: list[str] = []

    for surface in surfaces:
        sid = str(surface.get("surfaceId", ""))
        if surface.get("acceptancePhase") != ACCEPTANCE_PHASES.get(sid):
            findings.append(f"{manifest_path}: {sid}: acceptancePhase is missing or incorrect")
        sheet_name = surface.get("referenceSheet")
        if not isinstance(sheet_name, str):
            findings.append(f"{manifest_path}: {sid}: referenceSheet is required")
            continue
        sheet_path = SHEETS_DIR / sheet_name
        if not sheet_path.is_file():
            findings.append(f"{manifest_path}: {sid}: reference sheet missing")
            continue
        sheet_text = sheet_path.read_text(encoding="utf-8")
        match = SHEET_ID_RE.search(sheet_text)
        if not match or match.group(1) != sid or not STATUS_RE.search(sheet_text):
            findings.append(f"{sheet_path}: id/status does not match manifest")
        if surface.get("referenceSheetSha256") != hashlib.sha256(sheet_path.read_bytes()).hexdigest():
            findings.append(f"{manifest_path}: {sid}: reference-sheet hash drift")
        sheet_states = sheet_gate.semantic_state_ids(sheet_text)
        if surface.get("requiredStateIds") != sheet_states:
            findings.append(f"{manifest_path}: {sid}: semantic state IDs do not exactly match sheet")
        phase_name = surface.get("phaseDocument")
        if not isinstance(phase_name, str) or _phase_states(PLAN_DIR / phase_name, sid) != sheet_states:
            findings.append(f"{manifest_path}: {sid}: phase state IDs do not exactly match sheet")

        address = surface.get("addressing")
        if not isinstance(address, dict) or address.get("mode") not in {"url", "interaction-only"}:
            findings.append(f"{manifest_path}: {sid}: invalid addressing mode")
        elif address["mode"] == "url":
            url = address.get("canonicalUrl")
            marker = address.get("sourceMarker")
            if not isinstance(url, str) or url.split("?", 1)[0] not in actual_routes:
                findings.append(f"{manifest_path}: {sid}: URL address is not registered")
            elif url.split("?", 1)[0] not in canonical_routes:
                findings.append(f"{manifest_path}: {sid}: canonicalUrl cannot use a compatibility alias")
            if not isinstance(marker, str) or marker not in main_text:
                findings.append(f"{manifest_path}: {sid}: fictional URL address source marker")
        else:
            entry_route = address.get("entryRoute")
            if entry_route not in declared_routes:
                findings.append(f"{manifest_path}: {sid}: interaction entryRoute is not registered")
            elif entry_route not in canonical_routes:
                findings.append(f"{manifest_path}: {sid}: interaction entryRoute must be canonical")
            if not address.get("action"):
                findings.append(f"{manifest_path}: {sid}: interaction-only address needs an action")
            marker = address.get("sourceMarker")
            if not isinstance(marker, dict) or set(marker) != {"path", "token"}:
                findings.append(f"{manifest_path}: {sid}: interaction source/action marker is required")
            else:
                marker_path = _safe_source_path(str(marker.get("path", "")))
                if marker_path is None or marker_path not in sources or not marker_path.is_file():
                    findings.append(f"{manifest_path}: {sid}: interaction marker path is not production-reachable")
                elif not marker.get("token") or marker["token"] not in marker_path.read_text(encoding="utf-8"):
                    findings.append(f"{manifest_path}: {sid}: interaction action marker is missing from source")
            target_phase = address.get("targetPhase")
            if not isinstance(target_phase, int):
                findings.append(f"{manifest_path}: {sid}: interaction-only address needs targetPhase")
            elif candidate_phase >= target_phase:
                findings.append(f"{manifest_path}: {sid}: interaction-only address missed its phase deadline")

        figma = surface.get("figma")
        if not isinstance(figma, dict):
            findings.append(f"{manifest_path}: {sid}: figma is required")
        else:
            figma_match = FIGMA_RE.search(sheet_text)
            pair = (figma.get("fileKey"), figma.get("nodeId"))
            if not figma_match or figma_match.groups() != pair:
                findings.append(f"{sheet_path}: Figma mapping does not match manifest")
            if figma.get("ownershipMode") == "components":
                if not figma.get("componentNodeIds"):
                    findings.append(f"{manifest_path}: {sid}: component IDs are required")
            elif figma.get("ownershipMode") == "frame":
                if figma.get("componentNodeIds") != [] or not figma.get("frameOwnershipReason"):
                    findings.append(f"{manifest_path}: {sid}: frame-level ownership is incomplete")
            else:
                findings.append(f"{manifest_path}: {sid}: invalid Figma ownership mode")

        inv = inventory.get(sid)
        if inv is None or inv[0] != sheet_name:
            findings.append(f"{inventory_path}: {sid}: inventory/sheet mismatch")
        elif isinstance(figma, dict) and str(figma.get("nodeId", "")) not in inv[1]:
            findings.append(f"{inventory_path}: {sid}: frame node is missing")

        implementation = surface.get("implementation")
        if not isinstance(implementation, dict):
            findings.append(f"{manifest_path}: {sid}: implementation object is required")
            continue
        mode, owners = implementation.get("ownershipMode"), implementation.get("owners")
        if mode not in {"exclusive", "shared-discriminated"} or not isinstance(owners, list) or not owners:
            findings.append(f"{manifest_path}: {sid}: invalid implementation ownership")
            continue
        if mode == "shared-discriminated" and not implementation.get("stateDiscriminator"):
            findings.append(f"{manifest_path}: {sid}: shared owner needs stateDiscriminator")
        if mode == "exclusive":
            exclusive += owners
        for owner in owners:
            if not isinstance(owner, str) or owner.count("#") != 1:
                findings.append(f"{manifest_path}: {sid}: invalid owner {owner!r}")
                continue
            relative, symbol = owner.split("#")
            path = _safe_source_path(relative)
            if path is None or not path.is_file():
                findings.append(f"{manifest_path}: {sid}: owner file missing or outside src")
                continue
            if path not in sources:
                findings.append(f"{manifest_path}: {sid}: owner is not production-reachable")
            if not re.search(r"(?<![A-Za-z0-9_$])" + re.escape(symbol) + r"(?![A-Za-z0-9_$])", path.read_text()):
                findings.append(f"{manifest_path}: {sid}: symbol {symbol!r} missing")
        binding = surface.get("stateBinding")
        binding_keys = {
            "status", "targetPhase", "stateIds", "sourceOwner", "fixturePattern",
            "browserTestPattern", "evidencePattern",
        }
        if not isinstance(binding, dict) or set(binding) != binding_keys:
            findings.append(f"{manifest_path}: {sid}: complete semantic state binding is required")
        else:
            if binding.get("stateIds") != sheet_states:
                findings.append(f"{manifest_path}: {sid}: state binding IDs do not exactly match sheet")
            if binding.get("sourceOwner") not in owners:
                findings.append(f"{manifest_path}: {sid}: state binding source owner is not a runtime owner")
            for field in ("fixturePattern", "browserTestPattern", "evidencePattern"):
                if not isinstance(binding.get(field), str) or "{stateId}" not in binding[field]:
                    findings.append(f"{manifest_path}: {sid}: {field} must bind every stable state ID")
            status, target_phase = binding.get("status"), binding.get("targetPhase")
            if status not in {"scheduled", "implemented"} or not isinstance(target_phase, int):
                findings.append(f"{manifest_path}: {sid}: invalid semantic state binding status/phase")
            elif status == "scheduled":
                if candidate_phase >= target_phase:
                    findings.append(f"{manifest_path}: {sid}: scheduled semantic state binding missed its deadline")
                if STATUS_RE.search(sheet_text) and STATUS_RE.search(sheet_text).group(1) != "contract":
                    findings.append(f"{manifest_path}: {sid}: built/gated sheet may not claim scheduled states")
            else:
                for state_id in sheet_states:
                    fixture_relative = binding["fixturePattern"].replace("{stateId}", state_id)
                    fixture_path = _safe_repo_path(fixture_relative)
                    if fixture_path is None or not fixture_path.is_file():
                        findings.append(f"{manifest_path}: {sid}: implemented {state_id} fixturePattern is missing")
                    else:
                        try:
                            fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
                        except (OSError, json.JSONDecodeError):
                            fixture = None
                        if not isinstance(fixture, dict) or fixture.get("stateId") != state_id or fixture.get("deterministic") is not True:
                            findings.append(f"{manifest_path}: {sid}: {state_id} fixture is not deterministic and identity-bound")

                    browser_value = binding["browserTestPattern"].replace("{stateId}", state_id)
                    browser_relative, separator, browser_marker = browser_value.partition("#")
                    browser_path = _safe_repo_path(browser_relative)
                    if not separator or not browser_marker or browser_path is None or not browser_path.is_file():
                        findings.append(f"{manifest_path}: {sid}: implemented {state_id} browserTestPattern is missing")
                    elif browser_marker not in browser_path.read_text(encoding="utf-8"):
                        findings.append(f"{manifest_path}: {sid}: implemented {state_id} browser marker is absent")

                    evidence_relative = binding["evidencePattern"].replace("{stateId}", state_id)
                    evidence_path = _safe_repo_path(evidence_relative)
                    if evidence_path is None or not evidence_path.is_file():
                        findings.append(f"{manifest_path}: {sid}: implemented {state_id} evidencePattern is missing")
                    elif state_id not in evidence_path.read_text(encoding="utf-8"):
                        findings.append(f"{manifest_path}: {sid}: implemented {state_id} evidence is not identity-bound")
        evidence = surface.get("evidencePaths")
        if not isinstance(evidence, list):
            findings.append(f"{manifest_path}: {sid}: evidencePaths must be an array")
        elif any(not (ROOT / item).is_file() for item in evidence):
            findings.append(f"{manifest_path}: {sid}: evidence path missing")

    for duplicate in _duplicates(exclusive):
        findings.append(f"{manifest_path}: duplicate exclusive runtime owner {duplicate!r}")
    if set(inventory) != set(ids):
        findings.append(f"{inventory_path}: inventory and manifest surface sets differ")

    styles = source_ownership.get("styles", []) if isinstance(source_ownership, dict) else []
    style_paths = [item.get("path") for item in styles if isinstance(item, dict)]
    actual_styles = sorted(str(p.relative_to(ROOT)) for p in sources if p.suffix == ".css")
    if sorted(style_paths) != actual_styles or len(style_paths) != len(set(style_paths)):
        findings.append(f"{manifest_path}: style ownership does not exactly match production CSS graph")
    for item in styles:
        if not item.get("surfaceIds") or not set(item["surfaceIds"]).issubset(set(ids)):
            findings.append(f"{manifest_path}: invalid style ownership for {item.get('path')!r}")
    timers = sorted(
        str(p.relative_to(ROOT)) for p in sources
        if p.suffix in {".ts", ".tsx", ".js", ".jsx"} and TIMER_RE.search(p.read_text())
    )
    if source_ownership.get("timerOwnerFiles") != timers:
        findings.append(f"{manifest_path}: timer ownership does not exactly match production source")
    baseline = source_ownership.get("staleSelectorBaseline", {})
    stale_count = _stale_selector_count(sources)
    if not isinstance(baseline, dict) or stale_count > baseline.get("count", -1):
        findings.append(f"{manifest_path}: stale CSS selector debt grew to {stale_count}")
    if baseline.get("mustBeZeroByPhase") != 1:
        findings.append(f"{manifest_path}: stale selector baseline must expire in Phase 1")
    elif candidate_phase >= 1 and stale_count != 0:
        findings.append(
            f"{manifest_path}: stale selector deadline requires zero in Phase 1; found {stale_count}"
        )
    markers = source_ownership.get("forbiddenLegacyMarkers")
    if markers != FORBIDDEN_LEGACY_MARKERS:
        findings.append(f"{manifest_path}: forbidden legacy marker policy is immutable")
    for path in sources:
        if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        text = path.read_text(encoding="utf-8")
        if SUPPRESSION_RE.search(text):
            findings.append(f"{path}: production suppression is forbidden")
        for marker in FORBIDDEN_LEGACY_MARKERS:
            if marker in text:
                findings.append(f"{path}: forbidden legacy marker {marker!r}")

    attestation = manifest.get("remoteFigmaAttestation")
    if not isinstance(attestation, dict) or not all(
        attestation.get(key) for key in ("verifiedAt", "verifier", "evidencePath", "scope")
    ):
        findings.append(f"{manifest_path}: remote Figma attestation is incomplete")
    elif not (ROOT / attestation["evidencePath"]).is_file():
        findings.append(f"{manifest_path}: remote Figma attestation evidence is missing")
    tree = manifest.get("implementationTree")
    source_commit = tree.get("sourceCommit") if isinstance(tree, dict) else None
    if (
        not isinstance(tree, dict)
        or not re.fullmatch(r"[0-9a-f]{40}", str(source_commit or ""))
        or not re.fullmatch(r"[0-9a-f]{40}", str(tree.get("srcGitTreeSha1", "")))
    ):
        findings.append(f"{manifest_path}: implementation tree identity is incomplete")
    else:
        if not _git("cat-file", "-e", f"{source_commit}^{{commit}}", allow_status_one=True):
            findings.append(f"{manifest_path}: sourceCommit does not exist")
        elif not _git("merge-base", "--is-ancestor", source_commit, head_commit, allow_status_one=True):
            findings.append(f"{manifest_path}: sourceCommit is not an ancestor of {head_commit}")
        else:
            committed_tree = _git("rev-parse", f"{source_commit}:src")
            head_tree = _git("rev-parse", f"{head_commit}:src")
            if tree["srcGitTreeSha1"] != committed_tree:
                findings.append(f"{manifest_path}: src tree does not match sourceCommit:src")
            if tree["srcGitTreeSha1"] != head_tree:
                findings.append(f"{manifest_path}: implementation src tree does not match {head_commit}:src")
    baseline = source_ownership.get("staleSelectorBaseline", {})
    if baseline.get("count") != PHASE_0_STALE_SELECTOR_BASELINE:
        findings.append(f"{manifest_path}: stale selector baseline may not be inflated or rebaselined")
    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--inventory", type=Path, default=DEFAULT_INVENTORY)
    parser.add_argument("--phase", type=int)
    args = parser.parse_args(argv)
    try:
        findings = check_contract(
            args.manifest.resolve(), args.inventory.resolve(), candidate_phase=args.phase
        )
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"UX contract coverage gate: candidate phase unavailable: {exc}", file=sys.stderr)
        return 2
    if findings:
        print(f"UX contract coverage gate: {len(findings)} finding(s)")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    print(f"UX contract coverage gate: {len(EXPECTED_SURFACE_IDS)} surface(s) pass (schema v2)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
