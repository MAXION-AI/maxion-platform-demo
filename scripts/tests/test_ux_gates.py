"""Self-tests for the UX reference-sheet, coverage, and token-ratchet gates."""

from __future__ import annotations

import re
import json
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
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
        environment = mock.patch.dict(os.environ, {"MAXION_PROGRAM_PHASE": "0"})
        environment.start()
        self.addCleanup(environment.stop)
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

    def test_sheet_allows_a_valid_subset_for_manifest_to_enforce(self) -> None:
        text = substitute(EXAMPLE.read_text(encoding="utf-8"), r"^\| run\.failed\s+\|.*\n", "")
        text = text.replace("passes for 7 declared states", "passes for 6 declared states")
        path = self.tmp / "sheet.md"
        path.write_text(text, encoding="utf-8")
        findings = sheet_gate.check_sheet(path)
        self.assertEqual(len(sheet_gate.semantic_state_ids(path.read_text(encoding="utf-8"))), 6)
        self.assertEqual(findings, [])

    def test_malformed_semantic_surface_state_is_a_finding(self) -> None:
        path = self.mutated(r"^\| run\.failed\s+\|", "| failed |")
        findings = sheet_gate.check_sheet(path)
        self.assertTrue(any("invalid semantic state id" in finding for finding in findings), findings)

    def test_numeric_declared_state_count_must_match_matrix(self) -> None:
        path = self.mutated(r"passes for 7 declared states", "passes for 6 declared states")
        findings = sheet_gate.check_sheet(path)
        self.assertTrue(any("declares 6 states" in finding for finding in findings), findings)

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
        self.assertTrue(any("safe phase-scoped" in finding for finding in findings), findings)
        self.assertTrue(any("three distinct" in finding for finding in findings), findings)

        previous_root = sheet_gate.ROOT
        try:
            sheet_gate.ROOT = self.tmp
            subprocess.run(["git", "-C", str(self.tmp), "init", "-q"], check=True)
            subprocess.run(["git", "-C", str(self.tmp), "config", "user.email", "test@example.com"], check=True)
            subprocess.run(["git", "-C", str(self.tmp), "config", "user.name", "Test"], check=True)
            path.write_text(EXAMPLE.read_text(encoding="utf-8"), encoding="utf-8")
            manifest = self.tmp / "docs/operations/figma-code-map.json"
            manifest.parent.mkdir(parents=True, exist_ok=True)
            manifest.write_text(json.dumps({
                "surfaces": [{
                    "surfaceId": "agentix-run-canvas",
                    "referenceSheet": "agentix-run-canvas.md",
                    "acceptancePhase": 0,
                }]
            }), encoding="utf-8")
            subprocess.run(["git", "-C", str(self.tmp), "add", "."], check=True)
            subprocess.run(["git", "-C", str(self.tmp), "commit", "-qm", "candidate"], check=True)
            candidate = subprocess.run(
                ["git", "-C", str(self.tmp), "rev-parse", "HEAD"],
                check=True, capture_output=True, text=True,
            ).stdout.strip()
            gated = text.replace("- **Verifier:** alice", "- **Verifier:** bob")
            evidence_section = sheet_gate._section(sheet_gate._sections(gated), "## 7. Evidence") or ""
            for index, row in enumerate(sheet_gate._table_rows(evidence_section)):
                check = row[0]
                artifact_path = f"artifacts/ux-audits/phase-0/check-{index}.json"
                gated = gated.replace("artifacts/ux-audits/x.md", artifact_path, 1)
                artifact = self.tmp / artifact_path
                artifact.parent.mkdir(parents=True, exist_ok=True)
                artifact.write_text(json.dumps({
                    "schemaVersion": 1,
                    "kind": "ux-sheet-evidence",
                    "phase": 0,
                    "sheetId": "agentix-run-canvas",
                    "check": check,
                    "candidateSha": candidate,
                    "verdict": "PASS",
                }), encoding="utf-8")
            path.write_text(gated, encoding="utf-8")
            subprocess.run(["git", "-C", str(self.tmp), "add", "."], check=True)
            subprocess.run(["git", "-C", str(self.tmp), "commit", "-qm", "evidence"], check=True)
            self.assertEqual(sheet_gate.check_sheet(path), [])
            extra = self.tmp / "after-evidence.txt"
            extra.write_text("later commit\n", encoding="utf-8")
            subprocess.run(["git", "-C", str(self.tmp), "add", "."], check=True)
            subprocess.run(["git", "-C", str(self.tmp), "commit", "-qm", "later"], check=True)
            self.assertEqual(sheet_gate.check_sheet(path), [])
            first_artifact = self.tmp / "artifacts/ux-audits/phase-0/check-0.json"
            first_artifact.write_text(first_artifact.read_text(encoding="utf-8") + "\n", encoding="utf-8")
            subprocess.run(["git", "-C", str(self.tmp), "add", "."], check=True)
            subprocess.run(["git", "-C", str(self.tmp), "commit", "-qm", "tamper"], check=True)
            findings = sheet_gate.check_sheet(path)
            self.assertTrue(any("changed after" in finding for finding in findings), findings)
        finally:
            sheet_gate.ROOT = previous_root

    def test_absolute_external_or_reused_gated_evidence_is_rejected(self) -> None:
        text = EXAMPLE.read_text(encoding="utf-8").replace("- **Status:** contract", "- **Status:** gated")
        text = substitute(text, r"\| pending\s+\| pending\s+\|", "| /etc/passwd | PASS |", count=7)
        text = text.replace("- **Builder:** Codex session 2026-09-13 — pending", "- **Builder:** alice — 2026-09-13")
        text = text.replace("- **Verifier:** unassigned — pending", "- **Verifier:** bob — 2026-09-13")
        text = text.replace("- **QA:** unassigned — pending", "- **QA:** carol — 2026-09-13")
        path = self.tmp / "sheet.md"
        path.write_text(text, encoding="utf-8")
        findings = sheet_gate.check_sheet(path)
        self.assertTrue(any("safe phase-scoped" in finding for finding in findings), findings)

    def test_candidate_sheet_phase_includes_explicit_requalification_scopes(self) -> None:
        previous_root = sheet_gate.ROOT
        try:
            sheet_gate.ROOT = self.tmp
            subprocess.run(["git", "-C", str(self.tmp), "init", "-q"], check=True)
            subprocess.run(["git", "-C", str(self.tmp), "config", "user.email", "test@example.com"], check=True)
            subprocess.run(["git", "-C", str(self.tmp), "config", "user.name", "Test"], check=True)
            manifest = self.tmp / "docs/operations/figma-code-map.json"
            manifest.parent.mkdir(parents=True, exist_ok=True)
            manifest.write_text(json.dumps({
                "surfaces": [{
                    "surfaceId": "agentix-run-canvas",
                    "referenceSheet": "agentix-run-canvas.md",
                    "acceptancePhase": 0,
                }],
                "acceptanceScopes": [{
                    "phase": 1,
                    "kind": "phase-surfaces",
                    "referenceSheets": ["agentix-run-canvas.md"],
                }],
            }), encoding="utf-8")
            subprocess.run(["git", "-C", str(self.tmp), "add", "."], check=True)
            subprocess.run(["git", "-C", str(self.tmp), "commit", "-qm", "candidate"], check=True)
            candidate = subprocess.run(
                ["git", "-C", str(self.tmp), "rev-parse", "HEAD"],
                check=True, capture_output=True, text=True,
            ).stdout.strip()
            self.assertEqual(sheet_gate._candidate_sheet_phases(candidate, "agentix-run-canvas"), {0, 1})
        finally:
            sheet_gate.ROOT = previous_root

    def test_status_must_be_known(self) -> None:
        path = self.mutated(r"^- \*\*Status:\*\* contract$", "- **Status:** done")
        findings = sheet_gate.check_sheet(path)
        self.assertTrue(any("Status must be one of" in finding for finding in findings), findings)


class TokenGateTests(unittest.TestCase):
    def setUp(self) -> None:
        environment = mock.patch.dict(os.environ, {"MAXION_PROGRAM_PHASE": "0"})
        environment.start()
        self.addCleanup(environment.stop)
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

    def test_baseline_cannot_regain_debt_removed_by_the_accepted_predecessor(self) -> None:
        found = {"a.tsx": [(1, "#fff"), (2, "#000")]}
        findings = token_gate.validate_ratchet(found, {"a.tsx": 2}, {"a.tsx": 1}, 4)
        self.assertTrue(any("baseline regain" in finding for finding in findings), findings)

    def test_current_baseline_must_equal_the_scan_not_merely_bound_it(self) -> None:
        found = {"a.tsx": [(1, "#fff")]}
        findings = token_gate.validate_ratchet(found, {"a.tsx": 2}, {"a.tsx": 2}, 4)
        self.assertTrue(any("exactly match" in finding for finding in findings), findings)

    def test_phase_ten_requires_zero_token_debt(self) -> None:
        found = {"a.tsx": [(1, "#fff")]}
        findings = token_gate.validate_ratchet(found, {"a.tsx": 1}, {"a.tsx": 1}, 10)
        self.assertTrue(any("Phase 10" in finding for finding in findings), findings)


class ContractCoverageGateTests(unittest.TestCase):
    def setUp(self) -> None:
        environment = mock.patch.dict(os.environ, {"MAXION_PROGRAM_PHASE": "0"})
        environment.start()
        self.addCleanup(environment.stop)
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.tmp = Path(self.tempdir.name)
        self.manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    def check_mutation(self, mutate, **kwargs) -> list[str]:
        mutate(self.manifest)
        path = self.tmp / "figma-code-map.json"
        path.write_text(json.dumps(self.manifest), encoding="utf-8")
        return coverage_gate.check_contract(path, **kwargs)

    def test_committed_contract_map_is_complete(self) -> None:
        self.assertEqual(coverage_gate.check_contract(), [])

    def test_missing_surface_is_a_finding(self) -> None:
        findings = self.check_mutation(lambda value: value["surfaces"].pop())
        self.assertTrue(any("surface set does not match" in finding for finding in findings), findings)

    def test_omitted_production_route_is_a_finding(self) -> None:
        findings = self.check_mutation(lambda value: value["routes"].pop())
        self.assertTrue(any("declared routes do not match" in finding for finding in findings), findings)

    def test_non_redirect_route_owner_must_resolve_to_a_surface(self) -> None:
        findings = self.check_mutation(lambda value: value["routes"][0].update(owner="not-a-surface"))
        self.assertTrue(any("owner is not a declared surface" in finding for finding in findings), findings)

    def test_redirect_must_match_navigate_and_target_a_canonical_route(self) -> None:
        def mutate(value) -> None:
            redirect = next(item for item in value["routes"] if item["path"] == "/")
            redirect["target"] = "/agentix-prototype"

        findings = self.check_mutation(mutate)
        self.assertTrue(any("does not match production Navigate target" in finding for finding in findings), findings)
        self.assertTrue(any("target is not a canonical route" in finding for finding in findings), findings)

    def test_interaction_entry_route_must_be_registered(self) -> None:
        findings = self.check_mutation(
            lambda value: value["surfaces"][1]["addressing"].update(entryRoute="/fictional")
        )
        self.assertTrue(any("interaction entryRoute is not registered" in finding for finding in findings), findings)

    def test_surface_acceptance_phase_is_fixed(self) -> None:
        findings = self.check_mutation(
            lambda value: value["surfaces"][0].update(acceptancePhase=9)
        )
        self.assertTrue(any("acceptancePhase is missing or incorrect" in finding for finding in findings), findings)

    def test_phase_one_two_ten_and_eleven_acceptance_scopes_are_fixed(self) -> None:
        findings = self.check_mutation(lambda value: value["acceptanceScopes"][0]["referenceSheets"].pop())
        self.assertTrue(any("acceptanceScopes" in finding for finding in findings), findings)

        self.manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        findings = self.check_mutation(lambda value: value["acceptanceScopes"][1]["referenceSheets"].pop())
        self.assertTrue(any("acceptanceScopes" in finding for finding in findings), findings)

        self.manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        findings = self.check_mutation(lambda value: value["acceptanceScopes"][3].update(kind="all-surfaces"))
        self.assertTrue(any("acceptanceScopes" in finding for finding in findings), findings)

    def test_compatibility_alias_can_never_be_a_canonical_surface_url(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][5]["addressing"] = {
                "mode": "url",
                "canonicalUrl": "/agentix-prototype",
                "sourceMarker": 'path="/agentix-prototype"',
            }

        findings = self.check_mutation(mutate)
        self.assertTrue(any("canonicalUrl cannot use a compatibility alias" in finding for finding in findings), findings)

    def test_interaction_address_must_bind_to_production_action_source(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][1]["addressing"]["sourceMarker"] = {
                "path": "src/features/platform-prototype/PortalChrome.tsx",
                "token": "fictional-project-action",
            }

        findings = self.check_mutation(mutate)
        self.assertTrue(any("interaction action marker is missing" in finding for finding in findings), findings)

    def test_interaction_and_alias_deadlines_are_enforced_at_candidate_phase(self) -> None:
        with mock.patch.object(coverage_gate, "_candidate_phase", return_value=1):
            findings = self.check_mutation(lambda value: None)
        self.assertTrue(any("compatibility alias" in finding and "deadline" in finding for finding in findings), findings)
        self.assertTrue(any("interaction-only address missed" in finding for finding in findings), findings)
        self.assertTrue(any("stale selector deadline requires zero in Phase 1" in finding for finding in findings), findings)

    def test_fictional_url_state_is_a_finding(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][1]["addressing"] = {
                "mode": "url",
                "canonicalUrl": "/maxion-prototype?module=projects",
                "sourceMarker": "fictional-project-route-codec",
            }

        findings = self.check_mutation(mutate)
        self.assertTrue(any("fictional URL address" in finding for finding in findings), findings)

    def test_stale_figma_node_is_a_finding(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][0]["figma"]["nodeId"] = "999:999"

        findings = self.check_mutation(mutate)
        self.assertTrue(any("does not match manifest" in finding for finding in findings), findings)

    def test_missing_implementation_symbol_is_a_finding(self) -> None:
        def mutate(value) -> None:
            owner = value["surfaces"][0]["implementation"]["owners"][0]
            path, _ = owner.split("#", 1)
            value["surfaces"][0]["implementation"]["owners"][0] = f"{path}#MissingRuntimeOwner"

        findings = self.check_mutation(mutate)
        self.assertTrue(any("symbol 'MissingRuntimeOwner' missing" in finding for finding in findings), findings)

    def test_test_only_file_cannot_be_a_runtime_owner(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][0]["implementation"]["owners"][0] = "src/test/setup.ts#cleanup"

        findings = self.check_mutation(mutate)
        self.assertTrue(any("not production-reachable" in finding for finding in findings), findings)

    def test_duplicate_exclusive_owner_is_a_finding(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][1]["implementation"] = {
                "ownershipMode": "exclusive",
                "owners": [value["surfaces"][0]["implementation"]["owners"][0]],
            }

        findings = self.check_mutation(mutate)
        self.assertTrue(any("duplicate exclusive runtime owner" in finding for finding in findings), findings)

    def test_stale_css_selector_growth_is_a_finding(self) -> None:
        def mutate(value) -> None:
            value["sourceOwnership"]["staleSelectorBaseline"]["count"] = 0

        findings = self.check_mutation(mutate)
        self.assertTrue(any("stale CSS selector debt grew" in finding for finding in findings), findings)

    def test_stale_selector_baseline_cannot_be_inflated(self) -> None:
        def mutate(value) -> None:
            value["sourceOwnership"]["staleSelectorBaseline"]["count"] += 1

        findings = self.check_mutation(mutate)
        self.assertTrue(any("may not be inflated or rebaselined" in finding for finding in findings), findings)

    def test_forbidden_legacy_marker_policy_cannot_be_deleted(self) -> None:
        def mutate(value) -> None:
            value["sourceOwnership"]["forbiddenLegacyMarkers"] = []

        findings = self.check_mutation(mutate)
        self.assertTrue(any("marker policy is immutable" in finding for finding in findings), findings)

    def test_semantic_state_manifest_drift_is_a_finding(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][0]["requiredStateIds"].pop()

        findings = self.check_mutation(mutate)
        self.assertTrue(any("semantic state IDs do not exactly match" in finding for finding in findings), findings)

    def test_every_semantic_state_requires_a_complete_binding(self) -> None:
        def mutate(value) -> None:
            del value["surfaces"][0]["stateBinding"]

        findings = self.check_mutation(mutate)
        self.assertTrue(any("complete semantic state binding is required" in finding for finding in findings), findings)

    def test_scheduled_state_binding_cannot_outlive_its_phase(self) -> None:
        with mock.patch.object(coverage_gate, "_candidate_phase", return_value=2):
            findings = self.check_mutation(lambda value: None)
        self.assertTrue(any("scheduled semantic state binding missed" in finding for finding in findings), findings)

    def test_implemented_state_binding_requires_real_fixture_test_and_evidence(self) -> None:
        def mutate(value) -> None:
            value["surfaces"][0]["stateBinding"]["status"] = "implemented"

        findings = self.check_mutation(mutate)
        self.assertTrue(any("implemented shell.attention fixturePattern is missing" in finding for finding in findings), findings)

    def test_source_tree_identity_drift_is_a_finding(self) -> None:
        def mutate(value) -> None:
            value["implementationTree"]["srcGitTreeSha1"] = "0" * 40

        findings = self.check_mutation(mutate)
        self.assertTrue(any("src tree does not match" in finding for finding in findings), findings)

    def test_source_commit_must_exist_and_be_an_ancestor(self) -> None:
        source_commit = self.manifest["implementationTree"]["sourceCommit"]

        def mutate(value) -> None:
            value["implementationTree"]["sourceCommit"] = "f" * 40

        findings = self.check_mutation(mutate)
        self.assertTrue(any("sourceCommit does not exist" in finding for finding in findings), findings)

        self.manifest["implementationTree"]["sourceCommit"] = source_commit
        parent = coverage_gate._git("rev-parse", f"{source_commit}^")
        findings = self.check_mutation(lambda value: None, head_commit=str(parent))
        self.assertTrue(any("sourceCommit is not an ancestor" in finding for finding in findings), findings)


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
