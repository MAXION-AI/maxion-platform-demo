#!/usr/bin/env python3
"""Gate: the look comes only from tokens — no raw colour literals outside the demo theme.

Raw hex / rgb() / hsl() values in components bypass the theme and are how one product ends up with
five blues. This is a RATCHET, not a big-bang ban: a committed baseline records today's occurrences
per file, any file that grows (or any new file with a literal) fails, and the baseline may only
shrink. `--update-baseline` rewrites it after a genuine clean-up.

Usage:
  scripts/check_ux_tokens.py                 # check against scripts/ux_tokens_baseline.json
  scripts/check_ux_tokens.py --update-baseline
  scripts/check_ux_tokens.py --list          # print every occurrence

Exit code 0 = pass; 1 = findings; 2 = usage error.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTAL_SRC = ROOT / "src"
BASELINE = ROOT / "scripts" / "ux_tokens_baseline.json"
LEDGER = ROOT / "docs" / "operations" / "program-phase-ledger.json"
MANIFEST = ROOT / "docs" / "operations" / "figma-code-map.json"
THEME_FILES = {ROOT / "src" / "styles.css"}

SCAN_SUFFIXES = {".ts", ".tsx", ".css"}
EXCLUDED_DIR_NAMES = {"styles", "__tests__", "__generated__", "node_modules"}
EXCLUDED_FILE_PATTERNS = (".spec.", ".test.", ".stories.")

# A hex colour literal: # followed by 3, 4, 6 or 8 hex digits, not followed by another word char.
# Word-boundary on the left keeps `#root`-style ids out (an id must start with a letter that is not
# a hex digit to be excluded; `#abc` still matches, which is why the baseline exists).
HEX_RE = re.compile(r"(?<![\w-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])")
FUNC_RE = re.compile(r"\b(?:rgba?|hsla?)\(")
LITERAL_RE = re.compile(f"{HEX_RE.pattern}|{FUNC_RE.pattern}")


def _is_excluded(path: Path, src: Path) -> bool:
    if path.resolve() in {p.resolve() for p in THEME_FILES}:
        return True
    if any(part in EXCLUDED_DIR_NAMES for part in path.relative_to(src).parts[:-1]):
        return True
    return any(p in path.name for p in EXCLUDED_FILE_PATTERNS)


def scan(src: Path = PORTAL_SRC) -> dict[str, list[tuple[int, str]]]:
    """Return {repo-relative path: [(line_no, literal), ...]} for every raw colour literal."""
    found: dict[str, list[tuple[int, str]]] = {}
    for path in sorted(src.rglob("*")):
        if not path.is_file() or path.suffix not in SCAN_SUFFIXES or _is_excluded(path, src):
            continue
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        hits = [(i, m.group(0)) for i, line in enumerate(lines, 1) for m in LITERAL_RE.finditer(line)]
        if hits:
            try:
                key = path.relative_to(ROOT)
            except ValueError:
                key = path.relative_to(src)
            found[str(key)] = hits
    return found


def load_baseline(path: Path = BASELINE) -> dict[str, int]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {k: int(v) for k, v in data.get("files", {}).items()}


def _git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=root, check=False, capture_output=True, text=True
    )
    if result.returncode != 0:
        raise ValueError(result.stderr.strip() or f"git {' '.join(args)} failed")
    return result.stdout.strip()


def accepted_predecessor(
    root: Path = ROOT, ledger_path: Path = LEDGER, manifest_path: Path = MANIFEST
) -> tuple[str, int]:
    """Return the latest accepted merge (or the Phase-0 source baseline) and phase."""

    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    accepted = [row for row in ledger.get("phases", []) if row.get("status") == "accepted"]
    if accepted:
        row = max(accepted, key=lambda item: int(item["phase"]))
        commit = str(row["mergeSha"])
        phase = int(row["phase"])
    else:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        commit = str(manifest["implementationTree"]["sourceCommit"])
        phase = 0
    _git(root, "cat-file", "-e", f"{commit}^{{commit}}")
    head = _git(root, "rev-parse", "HEAD")
    _git(root, "merge-base", "--is-ancestor", commit, head)
    return commit, phase


def load_baseline_at_commit(commit: str, root: Path = ROOT) -> dict[str, int]:
    raw = _git(root, "show", f"{commit}:scripts/ux_tokens_baseline.json")
    data = json.loads(raw)
    return {k: int(v) for k, v in data.get("files", {}).items()}


def compare(found: dict[str, list[tuple[int, str]]], baseline: dict[str, int]) -> list[str]:
    findings: list[str] = []
    counts = {k: len(v) for k, v in found.items()}
    for file, n in sorted(counts.items()):
        allowed = baseline.get(file, 0)
        if n > allowed:
            sample = ", ".join(f"L{ln} {lit}" for ln, lit in found[file][:3])
            findings.append(
                f"{file}: {n} raw colour literal(s), baseline allows {allowed} — use theme tokens ({sample})"
            )
    for file, allowed in sorted(baseline.items()):
        if file not in counts:
            findings.append(f"baseline rot: {file} has no literals left — run --update-baseline to shrink it")
    return findings


def validate_ratchet(
    found: dict[str, list[tuple[int, str]]],
    current: dict[str, int],
    predecessor: dict[str, int],
    accepted_phase: int,
) -> list[str]:
    """Bind today's exact scan to a baseline that can only shrink from accepted history."""

    findings = compare(found, current)
    counts = {key: len(hits) for key, hits in found.items()}
    if counts != current:
        findings.append("current token baseline must exactly match the source scan")
    for file, allowed in sorted(current.items()):
        previous = predecessor.get(file, 0)
        if allowed > previous:
            findings.append(
                f"baseline regain: {file} allows {allowed}, accepted predecessor allows {previous}"
            )
    if accepted_phase >= 10 and (sum(counts.values()) or sum(current.values())):
        findings.append("Phase 10 token target is zero raw colour literals")
    return findings


def write_baseline(found: dict[str, list[tuple[int, str]]], path: Path = BASELINE) -> None:
    payload = {
        "_comment": (
            "Ratchet for scripts/check_ux_tokens.py: raw colour literals per demo source file "
            "outside src/styles.css. May only shrink. Regenerate after a real clean-up."
        ),
        "files": {k: len(v) for k, v in sorted(found.items())},
    }
    path.write_text(json.dumps(payload, indent=2, sort_keys=False) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--update-baseline", action="store_true")
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args(argv)

    if not PORTAL_SRC.exists():
        print(f"demo source not found at {PORTAL_SRC}", file=sys.stderr)
        return 2

    found = scan()
    if args.list:
        for file, hits in found.items():
            for ln, lit in hits:
                print(f"{file}:{ln}: {lit}")
    try:
        predecessor_commit, accepted_phase = accepted_predecessor()
        predecessor = load_baseline_at_commit(predecessor_commit)
    except (KeyError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"UX token gate: predecessor baseline unavailable: {exc}", file=sys.stderr)
        return 2

    if args.update_baseline:
        next_baseline = {key: len(hits) for key, hits in found.items()}
        findings = validate_ratchet(found, next_baseline, predecessor, accepted_phase)
        if findings:
            print(f"UX token gate: refusing baseline update ({len(findings)} finding(s))")
            for finding in findings:
                print(f"  - {finding}")
            return 1
        write_baseline(found)
        print(f"baseline written: {len(found)} file(s), {sum(len(v) for v in found.values())} literal(s)")
        return 0

    findings = validate_ratchet(found, load_baseline(), predecessor, accepted_phase)
    if findings:
        print(f"UX token gate: {len(findings)} finding(s)")
        for f in findings:
            print(f"  - {f}")
        return 1
    total = sum(len(v) for v in found.values())
    print(f"UX token gate: pass ({len(found)} baselined file(s), {total} literal(s), none new)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
