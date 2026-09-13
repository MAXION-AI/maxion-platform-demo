"""Self-tests for the UX reference-sheet, coverage, and token-ratchet gates."""

from __future__ import annotations

import re
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

import check_ux_reference_sheet as sheet_gate  # noqa: E402
import check_ux_contract_coverage as coverage_gate  # noqa: E402
import check_ux_tokens as token_gate  # noqa: E402
import check_production_sources as production_gate  # noqa: E402

TEMPLATE = REPO / "docs" / "operations" / "ux-reference-sheet.template.md"
EXAMPLE = REPO / "docs" / "operations" / "ux-reference-sheets" / "agentix-run-canvas.md"
MANIFEST = REPO / "docs" / "operations" / "figma-code-map.json"


def substitute(text: str, pattern: str, replacement: str, count: int = 1) -> str:
    """Replace an exact fixture anchor and fail if formatting drift makes it disappear."""

    changed, matches = re.subn(pattern, replacement, text, count=count, flags=re.M)
    if matches != count:
        raise AssertionError(f"fixture anchor matched {matches}x, expected {count}: {pattern!r}")
    return changed


class ReferenceSheetGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.tmp = Path(self.tempdir.name)

    def mutated(self, pattern: str, replacement: str) -> Path:
        path = self.tmp / "sheet.md"
        path.write_text(
            substitute(EXAMPLE.read_text(encoding="utf-8"), pattern, replacement),
            encoding="utf-8",
        )
        return path

    def test_template_fails_until_placeholders_are_filled(self) -> None:
        findings = sheet_gate.check_sheet(TEMPLATE)
        self.assertTrue(any("unfilled placeholder" in finding for finding in findings), findings)

    def test_committed_example_passes_contract_stage(self) -> None:
        self.assertEqual(sheet_gate.check_sheet(EXAMPLE), [])

    def test_committed_example_cannot_fake_gated_stage(self) -> None:
        findings = sheet_gate.check_sheet(EXAMPLE, stage_override="gated")
        self.assertTrue(any("has no artifact" in finding for finding in findings), findings)
        self.assertTrue(any("unassigned sign-off" in finding for finding in findings), findings)

    def test_missing_law_row_is_a_finding(self) -> None:
        path = self.mutated(r"^\| Zeigarnik\s+\|", "| Zeigarnick |")
        findings = sheet_gate.check_sheet(path)
        self.assertTrue(any("missing law row 'Zeigarnik'" in finding for finding in findings), findings)

    def test_bare_na_needs_a_reason(self) -> None:
        path = self.mutated(r"^\| Pareto\s+\|.*$", "| Pareto | N/A | N/A | N/A |")
        findings = sheet_gate.check_sheet(path)
        self.assertTrue(any("'N/A' needs a reason" in finding for finding in findings), findings)

    def test_fewer_than_three_mobbin_links_is_a_finding(self) -> None:
        path = self.tmp / "sheet.md"
        path.write_text(
            EXAMPLE.read_text(encoding="utf-8").replace(
                "https://mobbin.com/screens/", "https://example.com/screens/"
            ).replace("https://mobbin.com/flows/", "https://example.com/flows/"),
            encoding="utf-8",
        )
        findings = sheet_gate.check_sheet(path)
        self.assertTrue(any("at least 3 examined Mobbin links" in finding for finding in findings), findings)

    def test_explicit_missing_figma_reason_is_contract_only(self) -> None:
        path = self.mutated(
            r"^- \*\*Figma frame:\*\*.*$",
            "- **Figma frame:** unavailable because no approved frame exists for this inherited demo surface.",
        )
        self.assertEqual(sheet_gate.check_sheet(path), [])
        findings = sheet_gate.check_sheet(path, stage_override="built")
        self.assertTrue(any("needs an approved Figma" in finding for finding in findings), findings)

    def test_gated_stage_requires_artifacts_and_distinct_signoffs(self) -> None:
        text = EXAMPLE.read_text(encoding="utf-8")
        text = text.replace("- **Status:** contract", "- **Status:** gated")
        text = substitute(
            text,
            r"\| pending\s+\| pending\s+\|",
            "| artifacts/ux-audits/x.md | PASS |",
            count=7,
        )
        text = text.replace(
            "- **Builder:** Codex session 2026-09-13 — pending",
            "- **Builder:** alice — 2026-09-13",
        )
        text = text.replace("- **Verifier:** unassigned — pending", "- **Verifier:** alice — 2026-09-13")
        text = text.replace("- **QA:** unassigned — pending", "- **QA:** carol — 2026-09-13")
        path = self.tmp / "sheet.md"
        path.write_text(text, encoding="utf-8")

        findings = sheet_gate.check_sheet(path)
        self.assertTrue(any("artifact not found" in finding for finding in findings), findings)
        self.assertTrue(any("three distinct" in finding for finding in findings), findings)

        previous_root = sheet_gate.ROOT
        try:
            sheet_gate.ROOT = self.tmp
            artifact = self.tmp / "artifacts" / "ux-audits" / "x.md"
            artifact.parent.mkdir(parents=True)
            artifact.write_text("report", encoding="utf-8")
            path.write_text(text.replace("- **Verifier:** alice", "- **Verifier:** bob"), encoding="utf-8")
            self.assertEqual(sheet_gate.check_sheet(path), [])
        finally:
            sheet_gate.ROOT = previous_root

    def test_status_must_be_known(self) -> None:
        path = self.mutated(r"^- \*\*Status:\*\* contract$", "- **Status:** done")
        findings = sheet_gate.check_sheet(path)
        self.assertTrue(any("Status must be one of" in finding for finding in findings), findings)


class TokenGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.tmp = Path(self.tempdir.name)

    def source(self, files: dict[str, str]) -> Path:
        source = self.tmp / "src"
        for relative, body in files.items():
            path = source / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(body, encoding="utf-8")
        return source

    def test_theme_directory_and_tests_are_exempt_but_components_are_not(self) -> None:
        source = self.source(
            {
                "styles/theme.css": ":root { --primary: #0ea5a4; --bg: rgb(11, 13, 15); }",
                "components/Button.tsx": "const c = '#0ea5a4'; const d = 'rgba(0,0,0,.5)';",
                "components/__tests__/Button.spec.tsx": "expect(x).toBe('#ffffff')",
                "components/Ok.tsx": "const id = '#root'; const cls = 'bg-primary';",
            }
        )
        found = token_gate.scan(source)
        self.assertTrue(any(key.endswith("components/Button.tsx") for key in found), found)
        self.assertFalse(any("theme.css" in key for key in found), found)
        self.assertFalse(any("__tests__" in key for key in found), found)
        self.assertFalse(any(key.endswith("Ok.tsx") for key in found), found)
        self.assertEqual(sum(len(hits) for hits in found.values()), 2)

    def test_ratchet_fails_on_growth_and_new_files_but_allows_shrinking(self) -> None:
        found = {"a.tsx": [(1, "#fff"), (2, "#000")], "b.tsx": [(1, "#123456")]}
        self.assertEqual(token_gate.compare(found, {"a.tsx": 2, "b.tsx": 1}), [])
        self.assertNotEqual(token_gate.compare(found, {"a.tsx": 1, "b.tsx": 1}), [])
        self.assertNotEqual(token_gate.compare(found, {"a.tsx": 2}), [])
        rot = token_gate.compare({"a.tsx": [(1, "#fff")]}, {"a.tsx": 2, "b.tsx": 1})
        self.assertTrue(any("baseline rot" in finding for finding in rot), rot)
        self.assertFalse(any("raw colour" in finding for finding in rot), rot)

    def test_committed_baseline_matches_the_demo_exactly(self) -> None:
        findings = token_gate.compare(token_gate.scan(), token_gate.load_baseline())
        self.assertEqual(findings, [])


class ContractCoverageGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.tmp = Path(self.tempdir.name)
        self.manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    def check_mutation(self, mutate) -> list[str]:
        mutate(self.manifest)
        path = self.tmp / "figma-code-map.json"
        path.write_text(json.dumps(self.manifest), encoding="utf-8")
        return coverage_gate.check_contract(path)

    def test_committed_contract_map_is_complete(self) -> None:
        self.assertEqual(coverage_gate.check_contract(), [])

    def test_missing_surface_is_a_finding(self) -> None:
        findings = self.check_mutation(lambda value: value["surfaces"].pop())
        self.assertTrue(any("missing required surface" in finding for finding in findings), findings)

    def test_duplicate_route_state_is_a_finding(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][1]["routeState"] = value["surfaces"][0]["routeState"]

        findings = self.check_mutation(mutate)
        self.assertTrue(any("duplicate routeState" in finding for finding in findings), findings)

    def test_stale_figma_node_is_a_finding(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][0]["figma"]["nodeId"] = "999:999"

        findings = self.check_mutation(mutate)
        self.assertTrue(any("does not match manifest" in finding for finding in findings), findings)

    def test_missing_implementation_symbol_is_a_finding(self) -> None:
        def mutate(value) -> None:
            owner = value["surfaces"][0]["implementation"][0]
            path, _ = owner.split("#", 1)
            value["surfaces"][0]["implementation"][0] = f"{path}#MissingRuntimeOwner"

        findings = self.check_mutation(mutate)
        self.assertTrue(any("symbol 'MissingRuntimeOwner' missing" in finding for finding in findings), findings)

    def test_test_only_file_cannot_be_a_runtime_owner(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][0]["implementation"][0] = "src/test/setup.ts#cleanup"

        findings = self.check_mutation(mutate)
        self.assertTrue(any("not reachable from src/main.tsx" in finding for finding in findings), findings)


class ProductionSourceGateTests(unittest.TestCase):
    def test_test_infrastructure_is_classified_but_test_owned_product_code_fails(self) -> None:
        report = {
            "issues": [
                {"file": "src/test/setup.ts", "files": [{"name": "src/test/setup.ts"}]},
                {"file": "src/features/Dead.tsx", "files": [{"name": "src/features/Dead.tsx"}]},
            ]
        }
        self.assertEqual(
            production_gate.runtime_findings(report),
            ["production-unreachable file: src/features/Dead.tsx"],
        )


if __name__ == "__main__":
    unittest.main()
