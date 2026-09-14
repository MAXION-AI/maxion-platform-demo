"""Negative tests for the semantic C-to-E evidence-only gate."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

import check_phase_acceptance as acceptance  # noqa: E402


SHEET = """# Sheet

- **Sheet id:** sample
- **Status:** contract

## 1. Job and route contract
immutable job

## 2. Examined references and decisions
immutable references

## 3. Figma and token mapping
immutable mapping

## 4. Laws-check
| Law | Requirement | Number | Proof |
| --- | --- | --- | --- |
| Fitts's | Targets | 44 px | test |

## 5. State and interaction contract
immutable states

## 6. Responsive and accessibility contract
immutable thresholds

## 7. Evidence plan
| Viewport | State / fixture | Required proof | Artifact | Status |
| --- | --- | --- | --- | --- |
| 1280 | ready | screenshot | pending | pending |

## 8. Sign-off
- **Builder:** builder — pending
- **Verifier:** unassigned — pending
- **QA:** unassigned — pending
"""


class PhaseAcceptanceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.repo = Path(self.tempdir.name)
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.com")
        self.git("config", "user.name", "Test")
        self.write("README.md", "base\n")
        self.git("add", ".")
        self.git("commit", "-qm", "base")
        self.write("docs/operations/ux-reference-sheets/sample.md", SHEET)
        self.write("src/App.tsx", "export const App = () => null\n")
        self.write(
            "docs/operations/program-phase-ledger.json",
            json.dumps({
                "schemaVersion": 1, "program": "p", "repository": "r", "externalAuthority": "x",
                "phases": [{"phase": 0, "status": "pending", "candidateSha": "unchanged"}],
            }),
        )
        self.git("add", ".")
        self.git("commit", "-qm", "candidate")
        self.candidate = self.git("rev-parse", "HEAD")

    def git(self, *args: str) -> str:
        return subprocess.run(
            ["git", "-C", str(self.repo), *args], check=True, capture_output=True, text=True
        ).stdout.strip()

    def write(self, relative: str, body: str) -> None:
        path = self.repo / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")

    def commit(self, message: str = "evidence") -> str:
        self.git("add", ".")
        self.git("commit", "-qm", message)
        return self.git("rev-parse", "HEAD")

    def test_evidence_cells_and_signoffs_may_change_without_contract_hash_drift(self) -> None:
        changed = SHEET.replace("**Status:** contract", "**Status:** gated")
        changed = changed.replace("| pending | pending |", "| artifacts/ux-audits/phase-0/a.md | PASS |")
        changed = changed.replace("unassigned — pending", "independent — 2026-09-13")
        self.write("docs/operations/ux-reference-sheets/sample.md", changed)
        evidence = self.commit()
        self.assertEqual(acceptance.check_acceptance(self.repo, self.candidate, evidence, 0), [])

    def test_source_test_script_manifest_and_config_changes_are_rejected(self) -> None:
        for path in (
            "src/App.tsx", "tests/x.spec.ts", "scripts/x.py", "package.json",
            "docs/operations/figma-code-map.json", "vite.config.ts",
        ):
            with self.subTest(path=path):
                self.git("reset", "--hard", self.candidate)
                self.write(path, "changed\n")
                evidence = self.commit(path)
                findings = acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)
                self.assertTrue(any("non-evidence path changed" in item for item in findings), findings)

    def test_state_law_or_threshold_contract_change_is_rejected(self) -> None:
        self.write(
            "docs/operations/ux-reference-sheets/sample.md",
            SHEET.replace("44 px", "32 px").replace("immutable states", "different states"),
        )
        evidence = self.commit()
        findings = acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)
        self.assertTrue(any("immutable reference-sheet contract changed" in item for item in findings), findings)

    def test_immutable_ledger_identity_change_is_rejected(self) -> None:
        path = self.repo / "docs/operations/program-phase-ledger.json"
        document = json.loads(path.read_text())
        document["phases"][0]["candidateSha"] = "changed"
        path.write_text(json.dumps(document), encoding="utf-8")
        evidence = self.commit()
        findings = acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)
        self.assertTrue(any("immutable phase fields changed" in item for item in findings), findings)

    def test_candidate_must_be_ancestor_of_evidence(self) -> None:
        self.git("checkout", "-qb", "other", f"{self.candidate}^")
        self.write("unrelated.txt", "other\n")
        unrelated = self.commit("unrelated")
        findings = acceptance.check_acceptance(self.repo, self.candidate, unrelated, 0)
        self.assertTrue(any("not an ancestor" in item for item in findings), findings)


if __name__ == "__main__":
    unittest.main()
