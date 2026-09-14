"""Break-it tests for the clean-candidate evidence collector."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

import collect_phase_evidence as collector  # noqa: E402
import program_ledger  # noqa: E402


class PhaseEvidenceCollectorTests(unittest.TestCase):
    def setUp(self) -> None:
        environment = mock.patch.dict(os.environ, {"MAXION_PROGRAM_PHASE": "99"})
        environment.start()
        self.addCleanup(environment.stop)
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.repo = Path(self.tempdir.name).resolve()
        self.candidate = "a" * 40
        self.source_tree = "b" * 40

    def fake_git(self, _repo: Path, *args: str) -> str:
        values = {
            ("rev-parse", f"{self.candidate}:src"): self.source_tree,
            ("rev-parse", "HEAD^{commit}"): self.candidate,
            ("rev-parse", "HEAD:src"): self.source_tree,
            ("status", "--porcelain=v1"): "",
        }
        return values[args]

    def test_collects_only_after_all_five_fixed_commands_pass(self) -> None:
        with mock.patch.object(collector, "_git", side_effect=self.fake_git), mock.patch.object(
            collector.subprocess,
            "run",
            return_value=SimpleNamespace(returncode=0, stdout=b"pass\n", stderr=b""),
        ) as run:
            paths = collector.collect(self.repo, self.candidate, 4)
        self.assertEqual(len(paths), 5)
        # Tuple-style access works on every supported Python 3 unittest.mock implementation.
        invoked = [call[0][0] for call in run.call_args_list]
        expected = [
            argv
            for command_id in program_ledger.CANONICAL_COMMANDS
            for argv in program_ledger.CANONICAL_EXECUTION[command_id]
        ]
        self.assertEqual(invoked, expected)
        report = json.loads(paths[0].read_text(encoding="utf-8"))
        self.assertEqual(report["schemaVersion"], 2)
        self.assertEqual(report["candidateSha"], self.candidate)
        self.assertEqual(report["sourceTreeSha1"], self.source_tree)
        self.assertEqual(report["worktree"], str(self.repo))
        self.assertTrue(report["cleanBefore"] and report["cleanAfter"])

    def test_failure_or_oversized_output_writes_nothing(self) -> None:
        for result in (
            SimpleNamespace(returncode=1, stdout=b"", stderr=b"failed"),
            SimpleNamespace(
                returncode=0,
                stdout=b"x" * (program_ledger.MAX_CAPTURE_BYTES + 1),
                stderr=b"",
            ),
        ):
            with self.subTest(returncode=result.returncode, size=len(result.stdout)):
                with mock.patch.object(collector, "_git", side_effect=self.fake_git), mock.patch.object(
                    collector.subprocess, "run", return_value=result
                ):
                    with self.assertRaises(program_ledger.LedgerError):
                        collector.collect(self.repo, self.candidate, 4)
                self.assertFalse((self.repo / "artifacts").exists())

    def test_successful_command_that_dirties_checkout_writes_nothing(self) -> None:
        status_checks = 0

        def dirty_after_first_command(_repo: Path, *args: str) -> str:
            nonlocal status_checks
            if args == ("status", "--porcelain=v1"):
                status_checks += 1
                return "" if status_checks < 3 else "?? unexpected.txt"
            return self.fake_git(_repo, *args)

        with mock.patch.object(collector, "_git", side_effect=dirty_after_first_command), mock.patch.object(
            collector.subprocess,
            "run",
            return_value=SimpleNamespace(returncode=0, stdout=b"pass\n", stderr=b""),
        ):
            with self.assertRaisesRegex(program_ledger.LedgerError, "clean candidate checkout"):
                collector.collect(self.repo, self.candidate, 4)
        self.assertFalse((self.repo / "artifacts").exists())

    def test_mid_publish_failure_rolls_back_the_complete_report_set(self) -> None:
        real_link = os.link
        link_calls = 0

        def fail_second_link(source: str | Path, target: str | Path) -> None:
            nonlocal link_calls
            link_calls += 1
            if link_calls == 2:
                raise OSError("injected publication failure")
            real_link(source, target)

        with mock.patch.object(collector, "_git", side_effect=self.fake_git), mock.patch.object(
            collector.subprocess,
            "run",
            return_value=SimpleNamespace(returncode=0, stdout=b"pass\n", stderr=b""),
        ), mock.patch.object(collector.os, "link", side_effect=fail_second_link):
            with self.assertRaisesRegex(program_ledger.LedgerError, "complete command report set"):
                collector.collect(self.repo, self.candidate, 4)

        output_dir = self.repo / "artifacts" / "ux-audits" / "phase-4"
        self.assertEqual(list(output_dir.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
