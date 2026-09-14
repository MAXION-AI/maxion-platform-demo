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
"""


class ImplementationPlanGateTests(unittest.TestCase):
    def check(self, text: str) -> list[str]:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "phase.md"
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


if __name__ == "__main__":
    unittest.main()
