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
import program_ledger  # noqa: E402


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
        self.write("tests/existing.spec.ts", "test\n")
        self.write("scripts/existing.py", "pass\n")
        self.write(
            "docs/operations/figma-code-map.json",
            json.dumps({
                "surfaces": [{
                    "surfaceId": "sample",
                    "referenceSheet": "sample.md",
                    "acceptancePhase": 0,
                }]
            }),
        )
        self.phase_doc = (
            "docs/implementation-plans/2026-09-13-maxion-platform-demo-ui-foundation/"
            "01-phase-0-fixture.md"
        )
        self.write(self.phase_doc, self.phase_text("pending", []))
        self.write("docs/operations/program-phase-ledger.json", "{}\n")
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

    def phase_text(self, status: str, evidence: list[str]) -> str:
        handoff = {
            "schemaVersion": 1,
            "phase": 0,
            "nextPhase": 1,
            "status": status,
            "evidence": evidence,
            "reviewers": {"ux": "pending", "qa": "pending"} if status == "pending" else {
                "ux": "independent-ux", "qa": "independent-qa"
            },
        }
        return (
            "# Phase 0\n\n- **Status:** " + status + "\n\n## Hand-off\n\nImmutable handoff.\n\n"
            "### Structured acceptance hand-off\n\n```json\n"
            + json.dumps(handoff, indent=2)
            + "\n```\n"
        )

    def add_acceptance_reports(self) -> list[str]:
        source_tree = self.git("rev-parse", f"{self.candidate}:src")
        paths = []
        for role in ("ux", "qa"):
            path = f"artifacts/ux-audits/phase-0/independent-{role}.json"
            paths.append(path)
            self.write(path, json.dumps({
                "schemaVersion": 1,
                "program": program_ledger.PROGRAM,
                "phase": 0,
                "role": role,
                "reviewer": f"independent-{role}",
                "builder": "builder",
                "candidateSha": self.candidate,
                "sourceTreeSha1": source_tree,
                "referenceSheets": ["docs/operations/ux-reference-sheets/sample.md"],
                "checks": [f"{role}-acceptance"],
                "verdict": "PASS",
            }))
        self.write(self.phase_doc, self.phase_text("accepted", paths))
        return paths

    def commit(self, message: str = "evidence", *, reports: bool = True) -> str:
        if reports:
            self.add_acceptance_reports()
        self.git("add", ".")
        self.git("commit", "-qm", message)
        return self.git("rev-parse", "HEAD")

    def test_evidence_cells_and_signoffs_may_change_without_contract_hash_drift(self) -> None:
        changed = SHEET.replace("**Status:** contract", "**Status:** gated")
        changed = changed.replace("| pending | pending |", "| artifacts/ux-audits/phase-0/proof.json | PASS |")
        changed = changed.replace("unassigned — pending", "independent — 2026-09-13")
        self.write("docs/operations/ux-reference-sheets/sample.md", changed)
        evidence = self.commit()
        self.assertEqual(acceptance.check_acceptance(self.repo, self.candidate, evidence, 0), [])

    def test_source_test_script_manifest_config_and_bulk_changes_are_rejected(self) -> None:
        for path in (
            "src/App.tsx", "tests/existing.spec.ts", "scripts/existing.py", "package.json",
            "docs/operations/figma-code-map.json", "vite.config.ts",
        ):
            with self.subTest(path=path):
                self.git("reset", "--hard", self.candidate)
                self.write(path, "changed\n")
                evidence = self.commit(path)
                findings = acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)
                self.assertTrue(any("non-evidence path changed" in item or "forbidden" in item for item in findings), findings)

        self.git("reset", "--hard", self.candidate)
        for index in range(52):
            self.write(f"unowned/path-{index}.txt", "changed\n")
        evidence = self.commit("bulk bypass")
        findings = acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)
        self.assertGreaterEqual(sum("forbidden" in item for item in findings), 52)

    def test_add_delete_and_rename_of_phase_or_sheet_are_rejected(self) -> None:
        self.add_acceptance_reports()
        self.git("mv", self.phase_doc, self.phase_doc.replace("fixture", "renamed"))
        evidence = self.commit("rename", reports=False)
        self.assertTrue(any(
            "rename/copy is forbidden" in item or "is forbidden" in item
            for item in acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)
        ))

        self.git("reset", "--hard", self.candidate)
        self.git("rm", "docs/operations/ux-reference-sheets/sample.md")
        evidence = self.commit("delete")
        self.assertTrue(any("D is forbidden" in item for item in acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)))

        self.git("reset", "--hard", self.candidate)
        self.write(
            "docs/implementation-plans/2026-09-13-maxion-platform-demo-ui-foundation/"
            "99-phase-0-injected.md",
            self.phase_text("accepted", []),
        )
        evidence = self.commit("add phase")
        self.assertTrue(any("A is forbidden" in item for item in acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)))

    def test_non_phase_owned_sheet_is_rejected(self) -> None:
        self.write("docs/operations/ux-reference-sheets/other.md", SHEET.replace("sample", "other"))
        evidence = self.commit()
        findings = acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)
        self.assertTrue(any("forbidden" in item for item in findings), findings)

    def test_state_law_or_handoff_contract_change_is_rejected(self) -> None:
        self.write("docs/operations/ux-reference-sheets/sample.md", SHEET.replace("44 px", "32 px"))
        evidence = self.commit()
        self.assertTrue(any("immutable reference-sheet" in item for item in acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)))

        self.git("reset", "--hard", self.candidate)
        self.add_acceptance_reports()
        text = (self.repo / self.phase_doc).read_text(encoding="utf-8").replace("Immutable handoff", "Changed handoff")
        self.write(self.phase_doc, text)
        evidence = self.commit(reports=False)
        self.assertTrue(any("immutable phase plan" in item for item in acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)))

    def test_missing_or_reused_review_report_is_rejected(self) -> None:
        paths = self.add_acceptance_reports()
        (self.repo / paths[1]).unlink()
        evidence = self.commit(reports=False)
        self.assertTrue(any("UX report and one QA" in item for item in acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)))

        self.git("reset", "--hard", self.candidate)
        paths = self.add_acceptance_reports()
        qa = json.loads((self.repo / paths[1]).read_text(encoding="utf-8"))
        qa["role"] = "ux"
        self.write(paths[1], json.dumps(qa))
        evidence = self.commit(reports=False)
        findings = acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)
        self.assertTrue(any("multiple independent ux" in item or "UX report and one QA" in item for item in findings), findings)

    def test_structured_handoff_must_bind_the_exact_reports_and_reviewers(self) -> None:
        paths = self.add_acceptance_reports()
        self.write(self.phase_doc, self.phase_text("accepted", [paths[0]]).replace(
            '"ux": "independent-ux"', '"ux": "someone-else"'
        ))
        evidence = self.commit("mismatched handoff", reports=False)
        findings = acceptance.check_acceptance(self.repo, self.candidate, evidence, 0)
        self.assertTrue(any("omits the independent qa report" in item for item in findings), findings)
        self.assertTrue(any("ux identity does not match" in item for item in findings), findings)

    def test_exact_distinct_commits_and_ancestry_are_required(self) -> None:
        self.assertTrue(any("distinct" in item for item in acceptance.check_acceptance(self.repo, self.candidate, self.candidate, 0)))
        self.git("checkout", "-qb", "other", f"{self.candidate}^")
        self.write("unrelated.txt", "other\n")
        unrelated = self.commit("unrelated", reports=False)
        findings = acceptance.check_acceptance(self.repo, self.candidate, unrelated, 0)
        self.assertTrue(any("not an ancestor" in item for item in findings), findings)

    def test_evidence_report_cannot_be_reused_from_a_later_descendant(self) -> None:
        evidence = self.commit("first evidence")
        self.write("artifacts/ux-audits/phase-0/later.json", "{}\n")
        self.git("add", ".")
        self.git("commit", "-qm", "later descendant")
        later = self.git("rev-parse", "HEAD")
        findings = acceptance.check_acceptance(self.repo, self.candidate, later, 0)
        self.assertTrue(any("single direct child" in item for item in findings), findings)


if __name__ == "__main__":
    unittest.main()
