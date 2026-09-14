#!/usr/bin/env python3
"""Fail when Knip finds source that is unused by the production application graph."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
NON_PRODUCTION_PREFIXES = ("src/test/", "scripts/")


def runtime_findings(report: dict[str, Any]) -> list[str]:
    findings: list[str] = []
    for issue in report.get("issues", []):
        if not isinstance(issue, dict):
            findings.append("Knip returned a malformed issue entry")
            continue
        for unused in issue.get("files", []):
            name = unused.get("name", "") if isinstance(unused, dict) else str(unused)
            if name.startswith(NON_PRODUCTION_PREFIXES) or "/__tests__/" in name or ".spec." in name:
                continue
            findings.append(f"production-unreachable file: {name}")
        for category in ("dependencies", "exports", "unlisted", "unresolved"):
            for value in issue.get(category, []):
                name = value.get("name", "") if isinstance(value, dict) else str(value)
                findings.append(f"production {category}: {issue.get('file', '<unknown>')} -> {name}")
    return findings


def main() -> int:
    command = [
        "pnpm",
        "exec",
        "knip",
        "--production",
        "--include",
        "files,exports,dependencies,unlisted,unresolved",
        "--reporter",
        "json",
        "--no-exit-code",
    ]
    try:
        result = subprocess.run(
            command,
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
            timeout=120,
        )
        report = json.loads(result.stdout)
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as exc:
        print(f"Production source gate could not run: {exc}", file=sys.stderr)
        return 2

    findings = runtime_findings(report)
    if findings:
        print(f"Production source gate: {len(findings)} finding(s)")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    print("Production source gate: pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
