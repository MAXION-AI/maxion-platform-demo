from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

import check_implementation_plan as gate  # noqa: E402


VALID = """# Phase

## Ordered tasks

1. **Do a bounded thing (1.1).** Implement it.

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 1.1 | RC-05 via ADR-3 | `src/state.ts#reduceState` | Accepted Phase 0 merge SHA | `pnpm test -- state.spec.ts` |

## Tests

### Structured acceptance hand-off

```json
{"schemaVersion":1,"phase":1,"nextPhase":2,"status":"pending","evidence":[],"reviewers":{"ux":"pending","qa":"pending"}}
```
"""


class ImplementationPlanGateTests(unittest.TestCase):
    def check(self, text: str) -> list[str]:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "02-phase-1-fixture.md"
            path.write_text(text, encoding="utf-8")
            return gate.check_plan(path)

    def test_complete_contract_passes(self) -> None:
        self.assertEqual(self.check(VALID), [])

    def test_missing_task_contract_fails(self) -> None:
        self.assertTrue(any("missing" in item for item in self.check(VALID.replace("| 1.1 |", "| 1.2 |"))))

    def test_serves_requires_rc_and_adr(self) -> None:
        findings = self.check(VALID.replace("RC-05 via ADR-3", "shared state"))
        self.assertTrue(any("Serves" in item for item in findings), findings)

    def test_files_must_be_exact(self) -> None:
        findings = self.check(VALID.replace("`src/state.ts#reduceState`", "`src/**`"))
        self.assertTrue(any("files/symbols" in item for item in findings), findings)

    def test_prerequisite_is_required(self) -> None:
        findings = self.check(VALID.replace("Accepted Phase 0 merge SHA", "TBD"))
        self.assertTrue(any("prerequisite" in item for item in findings), findings)

    def test_verification_must_be_runnable(self) -> None:
        findings = self.check(VALID.replace("`pnpm test -- state.spec.ts`", "run the tests"))
        self.assertTrue(any("verification" in item for item in findings), findings)

    def test_handoff_is_required_and_identity_bound(self) -> None:
        missing = VALID.split("### Structured acceptance hand-off", 1)[0]
        self.assertTrue(any("hand-off" in item for item in self.check(missing)))
        wrong_phase = VALID.replace('"phase":1', '"phase":9')
        self.assertTrue(any("identity/status" in item for item in self.check(wrong_phase)))

    def test_current_phase_tracked_record_and_optional_e_are_rejected(self) -> None:
        tracked = VALID.replace(
            "## Tests",
            "`docs/operations/program-phase-ledger.json#phases[1]`\n\n## Tests",
        )
        self.assertTrue(any("lagging tracked ledger" in item for item in self.check(tracked)))
        optional = VALID.replace("## Tests", "optional evidence-only E\n\n## Tests")
        self.assertTrue(any("never optional" in item for item in self.check(optional)))

    def test_parent_ranges_must_match_exact_phase_tasks(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            phase = root / "02-phase-1-fixture.md"
            phase.write_text(VALID, encoding="utf-8")
            parent = root / "00-parent-roadmap.md"
            parent.write_text("| RC-05 | Phase 1 tasks 1.1–1.2 |\n", encoding="utf-8")
            findings = gate.check_parent_ranges(parent, [phase])
            self.assertTrue(any("1.1–1.1" in item for item in findings), findings)


if __name__ == "__main__":
    unittest.main()
