"""Break-it tests for phase-aware initial bundle budgets."""

from __future__ import annotations

import json
import random
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

import check_bundle_budget as bundle  # noqa: E402


class BundleBudgetTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.dist = Path(self.tempdir.name)
        (self.dist / ".vite").mkdir()

    def write_build(self, js: bytes, css: bytes) -> None:
        assets = self.dist / "assets"
        assets.mkdir(exist_ok=True)
        (assets / "app.js").write_bytes(js)
        (assets / "app.css").write_bytes(css)
        (self.dist / ".vite" / "manifest.json").write_text(
            json.dumps({
                "src/main.tsx": {
                    "file": "assets/app.js", "css": ["assets/app.css"], "isEntry": True,
                }
            }),
            encoding="utf-8",
        )

    def test_small_build_passes_at_phase_one(self) -> None:
        self.write_build(b"small", b"small")
        result, findings = bundle.check_budget(self.dist, 1)
        self.assertIsNotNone(result)
        self.assertEqual(findings, [])

    def test_over_budget_build_is_measured_in_phase_zero_but_fails_phase_one(self) -> None:
        generator = random.Random(7)
        noisy_js = bytes(generator.randrange(256) for _ in range(bundle.JS_LIMIT + 32_000))
        noisy_css = bytes(generator.randrange(256) for _ in range(bundle.CSS_LIMIT + 16_000))
        self.write_build(noisy_js, noisy_css)
        _, phase_zero = bundle.check_budget(self.dist, 0)
        _, phase_one = bundle.check_budget(self.dist, 1)
        self.assertEqual(phase_zero, [])
        self.assertTrue(any("initial JS" in item for item in phase_one), phase_one)
        self.assertTrue(any("initial CSS" in item for item in phase_one), phase_one)

    def test_missing_or_escaping_build_metadata_fails(self) -> None:
        _, findings = bundle.check_budget(self.dist, 1)
        self.assertTrue(any("cannot load Vite build metadata" in item for item in findings), findings)
        (self.dist / ".vite" / "manifest.json").write_text(
            json.dumps({"entry": {"file": "../outside.js", "isEntry": True}}), encoding="utf-8"
        )
        _, findings = bundle.check_budget(self.dist, 1)
        self.assertTrue(any("escapes dist" in item for item in findings), findings)

    def test_pending_phase_one_activates_the_hard_gate(self) -> None:
        ledger = self.dist / "ledger.json"
        ledger.write_text(
            json.dumps({"phases": [{"phase": 0, "status": "accepted"}, {"phase": 1, "status": "merged-awaiting-clean-sha-independent-acceptance"}]}),
            encoding="utf-8",
        )
        self.assertEqual(bundle.active_phase(ledger), 1)


if __name__ == "__main__":
    unittest.main()
