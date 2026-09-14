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
from bounded_process import BoundedProcessError  # noqa: E402


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
            collector,
            "run_bounded",
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
                    collector, "run_bounded", return_value=result
                ):
                    with self.assertRaises(program_ledger.LedgerError):
                        collector.collect(self.repo, self.candidate, 4)
                self.assertFalse((self.repo / "artifacts").exists())

    def test_runner_timeout_or_overflow_writes_nothing(self) -> None:
        for detail in ("timed out after 1 seconds", "stdout exceeds 1048576 bytes"):
            with self.subTest(detail=detail), mock.patch.object(
                collector, "_git", side_effect=self.fake_git
            ), mock.patch.object(
                collector, "run_bounded", side_effect=BoundedProcessError(detail)
            ):
                with self.assertRaisesRegex(program_ledger.LedgerError, "no reports were written"):
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
            collector,
            "run_bounded",
            return_value=SimpleNamespace(returncode=0, stdout=b"pass\n", stderr=b""),
        ):
            with self.assertRaisesRegex(program_ledger.LedgerError, "clean candidate checkout"):
                collector.collect(self.repo, self.candidate, 4)
        self.assertFalse((self.repo / "artifacts").exists())

    def test_publish_is_absent_before_rename_and_complete_immediately_after(self) -> None:
        real_rename = os.rename
        observed: dict[str, object] = {}

        def probe_rename(source: str | Path, target: str | Path) -> None:
            source_path = Path(source)
            target_path = Path(target)
            observed["target_absent_before"] = not target_path.exists()
            observed["staged_names"] = sorted(path.name for path in source_path.iterdir())
            real_rename(source, target)
            observed["final_names"] = sorted(path.name for path in target_path.iterdir())

        with mock.patch.object(collector, "_git", side_effect=self.fake_git), mock.patch.object(
            collector,
            "run_bounded",
            return_value=SimpleNamespace(returncode=0, stdout=b"pass\n", stderr=b""),
        ), mock.patch.object(collector.os, "rename", side_effect=probe_rename):
            paths = collector.collect(self.repo, self.candidate, 4)

        expected = sorted(f"command-{command_id}.json" for command_id in program_ledger.CANONICAL_COMMANDS)
        self.assertTrue(observed["target_absent_before"])
        self.assertEqual(observed["staged_names"], expected)
        self.assertEqual(observed["final_names"], expected)
        self.assertEqual(sorted(path.name for path in paths), expected)

    def test_pre_rename_publication_failure_leaves_no_final_directory(self) -> None:
        with mock.patch.object(collector, "_git", side_effect=self.fake_git), mock.patch.object(
            collector,
            "run_bounded",
            return_value=SimpleNamespace(returncode=0, stdout=b"pass\n", stderr=b""),
        ), mock.patch.object(collector.os, "rename", side_effect=OSError("injected publication failure")):
            with self.assertRaisesRegex(program_ledger.LedgerError, "no final report directory"):
                collector.collect(self.repo, self.candidate, 4)

        output_dir = self.repo / "artifacts" / "ux-audits" / "phase-4"
        self.assertFalse(output_dir.exists())

    def test_staging_setup_failure_is_caught_and_leaves_no_final_directory(self) -> None:
        with mock.patch.object(collector, "_git", side_effect=self.fake_git), mock.patch.object(
            collector,
            "run_bounded",
            return_value=SimpleNamespace(returncode=0, stdout=b"pass\n", stderr=b""),
        ), mock.patch.object(
            collector.tempfile, "mkdtemp", side_effect=OSError("injected staging failure")
        ):
            with self.assertRaisesRegex(program_ledger.LedgerError, "no final report directory"):
                collector.collect(self.repo, self.candidate, 4)

        self.assertFalse((self.repo / "artifacts" / "ux-audits" / "phase-4").exists())

    def test_post_rename_sync_failure_keeps_complete_idempotent_result(self) -> None:
        real_fsync = collector._fsync_directory
        calls = 0

        def fail_parent_sync(path: Path) -> None:
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("injected parent sync failure")
            real_fsync(path)

        with mock.patch.object(collector, "_git", side_effect=self.fake_git), mock.patch.object(
            collector,
            "run_bounded",
            return_value=SimpleNamespace(returncode=0, stdout=b"pass\n", stderr=b""),
        ), mock.patch.object(collector, "_fsync_directory", side_effect=fail_parent_sync):
            with self.assertRaisesRegex(program_ledger.LedgerError, "complete final directory was published"):
                collector.collect(self.repo, self.candidate, 4)

        output_dir = self.repo / "artifacts" / "ux-audits" / "phase-4"
        self.assertEqual(len(list(output_dir.iterdir())), 5)
        with self.assertRaisesRegex(program_ledger.LedgerError, "refuses to overwrite"):
            with mock.patch.object(collector, "_git", side_effect=self.fake_git), mock.patch.object(
                collector,
                "run_bounded",
                return_value=SimpleNamespace(returncode=0, stdout=b"pass\n", stderr=b""),
            ):
                collector.collect(self.repo, self.candidate, 4)


if __name__ == "__main__":
    unittest.main()
