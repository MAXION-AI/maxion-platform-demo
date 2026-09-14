"""Break-it tests for the durable program ledger."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

import program_ledger as ledger  # noqa: E402


def record(phase: int = 0) -> dict[str, object]:
    sha1 = f"{phase + 1:x}" * 40
    sha256 = f"{phase + 1:x}" * 64
    return {
        "phase": phase,
        "status": "accepted",
        "baseSha": sha1,
        "candidateSha": sha1,
        "prUrl": f"https://github.com/MAXION-AI/maxion-platform-demo/pull/{phase + 1}",
        "prHeadSha": sha1,
        "mergeSha": sha1,
        "sourceTreeSha1": sha1,
        "lockSha256": sha256,
        "manifestSha256": sha256,
        "referenceSheetSha256": {"sheet.md": sha256},
        "reviewers": {"ux": "independent-ux", "qa": "independent-qa"},
        "evidence": ["artifacts/audit.md"],
        "commands": ["pnpm check:program: PASS"],
        "timestamp": "2026-09-13T12:00:00Z",
    }


class ProgramLedgerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.path = Path(self.tempdir.name) / "ledger.json"

    def load(self) -> dict[str, object]:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def test_append_creates_and_validates_hash_chain(self) -> None:
        first = ledger.append_record(self.path, record())
        second = ledger.append_record(self.path, record(1))
        document = self.load()
        ledger.validate_external(document)
        self.assertEqual(first["previousRecordSha256"], "0" * 64)
        self.assertEqual(second["previousRecordSha256"], first["recordSha256"])
        self.assertFalse(any(self.path.parent.glob(f".{self.path.name}.*")))

    def test_tampering_is_rejected_before_an_append(self) -> None:
        ledger.append_record(self.path, record())
        document = self.load()
        document["records"][0]["status"] = "tampered"
        self.path.write_text(json.dumps(document), encoding="utf-8")
        with self.assertRaisesRegex(ledger.LedgerError, "recordSha256"):
            ledger.append_record(self.path, record(1))

    def test_invalid_record_cannot_create_a_ledger(self) -> None:
        invalid = record()
        invalid["candidateSha"] = "not-a-sha"
        with self.assertRaisesRegex(ledger.LedgerError, "candidateSha"):
            ledger.append_record(self.path, invalid)
        self.assertFalse(self.path.exists())

    def test_phase_order_cannot_move_backward(self) -> None:
        ledger.append_record(self.path, record(1))
        with self.assertRaisesRegex(ledger.LedgerError, "move backward"):
            ledger.append_record(self.path, record(0))

    def test_committed_tracked_ledger_is_valid(self) -> None:
        ledger.validate_tracked(json.loads(ledger.TRACKED_LEDGER.read_text(encoding="utf-8")))


if __name__ == "__main__":
    unittest.main()
