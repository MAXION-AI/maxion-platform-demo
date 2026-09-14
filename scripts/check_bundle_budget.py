#!/usr/bin/env python3
"""Measure initial Vite assets from build metadata and enforce phase-aware gzip budgets."""

from __future__ import annotations

import argparse
import gzip
import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DIST = ROOT / "dist"
LEDGER = ROOT / "docs" / "operations" / "program-phase-ledger.json"
JS_LIMIT = 250 * 1024
CSS_LIMIT = 60 * 1024
ENFORCE_FROM_PHASE = 1


def active_phase(ledger_path: Path = LEDGER, explicit: int | None = None) -> int:
    """Resolve the candidate phase and refuse explicit/CI/ledger disagreement."""

    try:
        document = json.loads(ledger_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        raise ValueError(f"cannot load candidate phase from {ledger_path}")
    declared = document.get("candidatePhase") if isinstance(document, dict) else None
    if not isinstance(declared, int) or declared < 0:
        raise ValueError("tracked ledger must declare a non-negative candidatePhase")
    env_value = os.environ.get("MAXION_PROGRAM_PHASE")
    selected = explicit if explicit is not None else int(env_value) if env_value is not None else declared
    if selected != declared:
        raise ValueError(
            f"candidate phase mismatch: selected {selected}, tracked ledger declares {declared}"
        )
    return selected


def measure(dist: Path) -> tuple[dict[str, Any] | None, list[str]]:
    manifest_path = dist / ".vite" / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return None, [f"cannot load Vite build metadata {manifest_path}: {exc}"]
    if not isinstance(manifest, dict):
        return None, ["Vite build manifest root must be an object"]
    entries = [key for key, value in manifest.items() if isinstance(value, dict) and value.get("isEntry")]
    if len(entries) != 1:
        return None, [f"Vite build metadata must contain exactly one initial entry, found {len(entries)}"]
    pending = entries[:]
    visited: set[str] = set()
    assets: set[str] = set()
    while pending:
        key = pending.pop()
        if key in visited:
            continue
        chunk = manifest.get(key)
        if not isinstance(chunk, dict):
            return None, [f"Vite build metadata references missing chunk {key!r}"]
        visited.add(key)
        if isinstance(chunk.get("file"), str):
            assets.add(chunk["file"])
        assets.update(item for item in chunk.get("css", []) if isinstance(item, str))
        pending.extend(item for item in chunk.get("imports", []) if isinstance(item, str))
    sizes = {"js": 0, "css": 0}
    files: list[dict[str, Any]] = []
    findings: list[str] = []
    for relative in sorted(assets):
        path = (dist / relative).resolve()
        try:
            path.relative_to(dist.resolve())
        except ValueError:
            findings.append(f"build metadata asset escapes dist: {relative}")
            continue
        if not path.is_file():
            findings.append(f"build metadata asset is missing: {relative}")
            continue
        kind = "js" if path.suffix == ".js" else "css" if path.suffix == ".css" else None
        if kind is None:
            continue
        compressed = len(gzip.compress(path.read_bytes()))
        sizes[kind] += compressed
        files.append({"path": relative, "kind": kind, "gzipBytes": compressed})
    return {"entry": entries[0], "files": files, "gzipBytes": sizes}, findings


def check_budget(dist: Path, phase: int) -> tuple[dict[str, Any] | None, list[str]]:
    result, findings = measure(dist)
    if result is None or findings:
        return result, findings
    if phase >= ENFORCE_FROM_PHASE:
        sizes = result["gzipBytes"]
        if sizes["js"] > JS_LIMIT:
            findings.append(f"initial JS is {sizes['js']} bytes gzip; hard limit is {JS_LIMIT}")
        if sizes["css"] > CSS_LIMIT:
            findings.append(f"initial CSS is {sizes['css']} bytes gzip; hard limit is {CSS_LIMIT}")
    return result, findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dist", type=Path, default=DEFAULT_DIST)
    parser.add_argument("--metadata-out", type=Path)
    parser.add_argument("--phase", type=int)
    args = parser.parse_args(argv)
    try:
        phase = active_phase(explicit=args.phase)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Bundle budget gate: candidate phase unavailable: {exc}", file=sys.stderr)
        return 2
    result, findings = check_budget(args.dist.resolve(), phase)
    if result is not None:
        result = {
            **result,
            "activePhase": phase,
            "enforceFromPhase": ENFORCE_FROM_PHASE,
            "limits": {"jsGzipBytes": JS_LIMIT, "cssGzipBytes": CSS_LIMIT},
            "status": "FAIL" if findings else "PASS" if phase >= ENFORCE_FROM_PHASE else "MEASURED_DEBT",
        }
        if args.metadata_out:
            args.metadata_out.parent.mkdir(parents=True, exist_ok=True)
            args.metadata_out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    if findings:
        print(f"Bundle budget gate: {len(findings)} finding(s)")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    if result is None:
        return 1
    sizes = result["gzipBytes"]
    mode = "enforced" if phase >= ENFORCE_FROM_PHASE else "measured Phase 0 debt"
    print(f"Bundle budget gate: {mode}; JS {sizes['js']} bytes, CSS {sizes['css']} bytes gzip")
    return 0


if __name__ == "__main__":
    sys.exit(main())
