"""Break-it tests for the durable program ledger."""

from __future__ import annotations

import copy
import functools
import json
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

import program_ledger as ledger  # noqa: E402

EVIDENCE = "artifacts/ux-audits/phase-0-foundation-independent-ux-2026-09-13.md"


@functools.lru_cache(maxsize=1)
def _accepted_template() -> dict[str, object]:
    head = str(ledger._git(REPO, "rev-parse", "HEAD"))
    source_tree = ledger._git_tree(REPO, head, "src")
    sheet_hashes = {
        path: ledger._git_blob_sha256(REPO, head, path)
        for path in ledger.REFERENCE_SHEET_PATHS
    }
    contract_hashes = {
        path: ledger.reference_sheet_contract_sha256(ledger._git_blob(REPO, head, path))
        for path in ledger.REFERENCE_SHEET_PATHS
    }
    commands = [
        {
            "id": command_id,
            "command": command_id,
            "status": "PASS",
            "exitCode": 0,
            "evidencePath": EVIDENCE,
        }
        for command_id in sorted(ledger.REQUIRED_COMMAND_IDS)
    ]
    return {
        "phase": 0,
        "status": ledger.ACCEPTED_STATUS,
        "baseSha": head,
        "candidateSha": head,
        "prUrl": "https://github.com/MAXION-AI/maxion-platform-demo/pull/1",
        "prHeadSha": head,
        "mergeSha": head,
        "independentAcceptanceSha": head,
        "evidenceCommitSha": head,
        "sourceTreeSha1": source_tree,
        "lockSha256": ledger._git_blob_sha256(REPO, head, "pnpm-lock.yaml"),
        "manifestSha256": ledger._git_blob_sha256(
            REPO, head, "docs/operations/figma-code-map.json"
        ),
        "referenceSheetSha256": sheet_hashes,
        "referenceSheetContractSha256": contract_hashes,
        "builder": "builder-session",
        "reviewers": {"ux": "independent-ux", "qa": "independent-qa"},
        "evidence": [EVIDENCE],
        "evidenceQualification": ledger.ACCEPTED_EVIDENCE_QUALIFICATION,
        "reasonOpen": None,
        "commands": commands,
        "timestamp": "2026-09-13T12:00:00Z",
    }


def accepted_record(phase: int = 0) -> dict[str, object]:
    result = copy.deepcopy(_accepted_template())
    result["phase"] = phase
    result["prUrl"] = f"https://github.com/MAXION-AI/maxion-platform-demo/pull/{phase + 1}"
    result["timestamp"] = f"2026-09-13T12:00:{phase:02d}Z"
    return result


class ProgramLedgerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.path = Path(self.tempdir.name) / "ledger.json"

    def load(self) -> dict[str, object]:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def assert_invalid(self, record: dict[str, object], message: str) -> None:
        with self.assertRaisesRegex(ledger.LedgerError, message):
            ledger.validate_record(record, external=False)

    def test_append_creates_and_validates_hash_chain(self) -> None:
        first = ledger.append_record(self.path, accepted_record())
        second = ledger.append_record(self.path, accepted_record(1))
        document = self.load()
        ledger.validate_external(document)
        self.assertEqual(first["previousRecordSha256"], "0" * 64)
        self.assertEqual(second["previousRecordSha256"], first["recordSha256"])
        self.assertFalse(any(self.path.parent.glob(f".{self.path.name}.*")))

    def test_concurrent_appends_preserve_atomic_hash_chain(self) -> None:
        records = [accepted_record() for _ in range(4)]
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(ledger.append_record, self.path, item) for item in records]
        successes = [future.result() for future in futures if future.exception() is None]
        failures = [future.exception() for future in futures if future.exception() is not None]
        document = self.load()
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(failures), 3)
        self.assertTrue(all(isinstance(error, ledger.LedgerError) for error in failures))
        self.assertEqual(len(document["records"]), 1)
        ledger.validate_external(document)

    def test_external_ledger_rejects_duplicate_skipped_and_pending_phases(self) -> None:
        ledger.append_record(self.path, accepted_record())
        with self.assertRaisesRegex(ledger.LedgerError, "expected phase 1"):
            ledger.append_record(self.path, accepted_record())

        skipped = Path(self.tempdir.name) / "skipped.json"
        with self.assertRaisesRegex(ledger.LedgerError, "expected phase 0"):
            ledger.append_record(skipped, accepted_record(1))
        self.assertFalse(skipped.exists())

        pending = accepted_record()
        pending["status"] = ledger.PENDING_STATUS
        pending["independentAcceptanceSha"] = None
        pending["reasonOpen"] = "independent review pending"
        pending["evidenceQualification"] = "clean-sha-review-pending"
        pending["commands"] = []
        pending_path = Path(self.tempdir.name) / "pending.json"
        with self.assertRaisesRegex(ledger.LedgerError, "only accepted"):
            ledger.append_record(pending_path, pending)
        self.assertFalse(pending_path.exists())

    def test_external_phase_base_must_equal_previous_merge(self) -> None:
        ledger.append_record(self.path, accepted_record())
        second = accepted_record(1)
        second["baseSha"] = str(ledger._git(REPO, "rev-parse", "HEAD^"))
        with self.assertRaisesRegex(ledger.LedgerError, "prior phase mergeSha"):
            ledger.append_record(self.path, second)

    def test_bootstrap_requires_latest_phase_exact_merge_and_checkout(self) -> None:
        ledger.append_record(self.path, accepted_record())
        document = self.load()
        head = str(ledger._git(REPO, "rev-parse", "HEAD"))
        self.assertEqual(
            ledger.bootstrap_external(
                document,
                expected_phase=0,
                target_ref=head,
                require_clean=False,
            ),
            head,
        )
        with self.assertRaisesRegex(ledger.LedgerError, "expected accepted phase 1"):
            ledger.bootstrap_external(
                document,
                expected_phase=1,
                target_ref=head,
                require_clean=False,
            )
        with self.assertRaisesRegex(ledger.LedgerError, "target ref"):
            ledger.bootstrap_external(
                document,
                expected_phase=0,
                target_ref="HEAD^",
                require_clean=False,
            )

    def test_tampering_is_rejected_before_an_append(self) -> None:
        ledger.append_record(self.path, accepted_record())
        document = self.load()
        document["records"][0]["builder"] = "tampered"
        self.path.write_text(json.dumps(document), encoding="utf-8")
        with self.assertRaisesRegex(ledger.LedgerError, "recordSha256"):
            ledger.append_record(self.path, accepted_record(1))

    def test_status_is_finite(self) -> None:
        item = accepted_record()
        item["status"] = "ship-it"
        self.assert_invalid(item, "status must be one of")

    def test_ux_and_qa_reviewers_must_be_distinct_and_not_builder(self) -> None:
        item = accepted_record()
        item["reviewers"] = {"ux": "same", "qa": "same"}
        self.assert_invalid(item, "must be distinct")
        item = accepted_record()
        item["reviewers"] = {"ux": "builder-session", "qa": "different"}
        self.assert_invalid(item, "builder may not")

    def test_pending_status_requires_reason_and_historical_qualification(self) -> None:
        item = accepted_record()
        item["status"] = ledger.PENDING_STATUS
        item["independentAcceptanceSha"] = None
        item["reasonOpen"] = ""
        item["evidenceQualification"] = "clean-sha-independent-acceptance"
        self.assert_invalid(item, "reasonOpen")
        item["reasonOpen"] = "review pending"
        self.assert_invalid(item, "evidenceQualification")

    def test_accepted_status_requires_acceptance_identity_and_hash_fields(self) -> None:
        item = accepted_record()
        item["independentAcceptanceSha"] = None
        self.assert_invalid(item, "requires independentAcceptanceSha")
        item = accepted_record()
        del item["manifestSha256"]
        self.assert_invalid(item, "missing required fields")

    def test_commands_must_be_structured_complete_and_passing(self) -> None:
        item = accepted_record()
        item["commands"] = ["pnpm check:program: PASS"]
        self.assert_invalid(item, "command result must contain exactly")
        item = accepted_record()
        item["commands"] = item["commands"][:-1]
        self.assert_invalid(item, "missing required commands")
        item = accepted_record()
        item["commands"][0]["status"] = "FAIL"
        item["commands"][0]["exitCode"] = 1
        self.assert_invalid(item, "every accepted-record command must PASS")

    def test_evidence_paths_are_safe_and_exist_at_recorded_commit(self) -> None:
        item = accepted_record()
        item["evidence"] = ["../outside.md"]
        self.assert_invalid(item, "safe repository-relative")
        item = accepted_record()
        item["evidence"] = ["artifacts/ux-audits/missing.md"]
        self.assert_invalid(item, "Git verification failed|does not exist")

    def test_every_recorded_commit_must_exist(self) -> None:
        item = accepted_record()
        item["candidateSha"] = "f" * 40
        self.assert_invalid(item, "candidateSha does not identify an existing Git commit")

    def test_b_to_c_to_e_to_m_ancestry_is_required(self) -> None:
        item = accepted_record()
        parent = str(ledger._git(REPO, "rev-parse", "HEAD^"))
        item["candidateSha"] = parent
        item["baseSha"] = item["mergeSha"]
        self.assert_invalid(item, "B -> C")
        item = accepted_record()
        item["evidenceCommitSha"] = item["mergeSha"]
        item["prHeadSha"] = str(ledger._git(REPO, "rev-parse", "HEAD^"))
        self.assert_invalid(item, "C -> E/PR head|evidenceCommitSha")

    def test_source_tree_is_verified_at_candidate_evidence_merge_and_acceptance(self) -> None:
        item = accepted_record()
        item["sourceTreeSha1"] = "0" * 40
        self.assert_invalid(item, "sourceTreeSha1 does not match")

    def test_lock_manifest_and_exact_sheet_hashes_are_verified_at_acceptance(self) -> None:
        for field in ("lockSha256", "manifestSha256"):
            with self.subTest(field=field):
                item = accepted_record()
                item[field] = "0" * 64
                self.assert_invalid(item, "recorded SHA-256 does not match")
        item = accepted_record()
        item["referenceSheetSha256"].pop(next(iter(ledger.REFERENCE_SHEET_PATHS)))
        self.assert_invalid(item, "exactly the 13")
        item = accepted_record()
        key = next(iter(ledger.REFERENCE_SHEET_PATHS))
        item["referenceSheetSha256"][key] = "0" * 64
        self.assert_invalid(item, "recorded SHA-256 does not match")
        item = accepted_record()
        item["referenceSheetContractSha256"][key] = "0" * 64
        self.assert_invalid(item, "immutable-contract SHA-256 does not match")

    def test_committed_tracked_ledger_is_valid(self) -> None:
        ledger.validate_tracked(json.loads(ledger.TRACKED_LEDGER.read_text(encoding="utf-8")))

    def test_tracked_ledger_requires_status_pr_reason_qualification_and_identities(self) -> None:
        original = json.loads(ledger.TRACKED_LEDGER.read_text(encoding="utf-8"))
        for field in (
            "status", "prUrl", "reasonOpen", "evidenceQualification", "builder", "reviewers",
            "baseSha", "candidateSha", "prHeadSha", "mergeSha", "evidenceCommitSha",
        ):
            with self.subTest(field=field):
                document = copy.deepcopy(original)
                del document["phases"][0][field]
                with self.assertRaises(ledger.LedgerError):
                    ledger.validate_tracked(document)


if __name__ == "__main__":
    unittest.main()
