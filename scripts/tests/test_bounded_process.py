"""Real-process regressions for the incremental bounded command runner."""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

from bounded_process import BoundedProcessError, run_bounded  # noqa: E402


class BoundedProcessTests(unittest.TestCase):
    def assert_process_stops(self, child_pid: int) -> None:
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            try:
                os.kill(child_pid, 0)
            except ProcessLookupError:
                return
            result = subprocess.run(
                ["ps", "-o", "stat=", "-p", str(child_pid)],
                check=False,
                capture_output=True,
                text=True,
                timeout=1,
            )
            status = result.stdout.strip()
            if not status or status.startswith("Z"):
                return
            time.sleep(0.05)
        try:
            os.kill(child_pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        self.fail("timed-out descendant remained alive outside the terminated process group")

    def test_sustained_stdout_and_stderr_are_stopped_at_independent_limits(self) -> None:
        for descriptor, label in ((1, "stdout"), (2, "stderr")):
            with self.subTest(stream=label), self.assertRaisesRegex(BoundedProcessError, label):
                run_bounded(
                    [
                        sys.executable,
                        "-c",
                        f"import os\nwhile True: os.write({descriptor}, b'x' * 65536)",
                    ],
                    cwd=REPO,
                    env=os.environ.copy(),
                    timeout=5,
                    stdout_limit=131_072,
                    stderr_limit=131_072,
                )

    def test_timeout_kills_the_spawned_process_group(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            pid_path = Path(temporary) / "child.pid"
            code = (
                "import pathlib, subprocess, sys, time\n"
                "child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'])\n"
                "pathlib.Path(sys.argv[1]).write_text(str(child.pid))\n"
                "time.sleep(60)\n"
            )
            started = time.monotonic()
            with self.assertRaisesRegex(BoundedProcessError, "timed out"):
                run_bounded(
                    [sys.executable, "-c", code, str(pid_path)],
                    cwd=REPO,
                    env=os.environ.copy(),
                    timeout=0.5,
                    stdout_limit=1024,
                    stderr_limit=1024,
                )
            self.assertLess(time.monotonic() - started, 3)
            child_pid = int(pid_path.read_text(encoding="utf-8"))
            self.assert_process_stops(child_pid)

    def test_timeout_kills_descendant_after_group_leader_exits(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            pid_path = Path(temporary) / "orphan.pid"
            code = (
                "import pathlib, subprocess, sys\n"
                "child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'])\n"
                "pathlib.Path(sys.argv[1]).write_text(str(child.pid))\n"
            )
            with self.assertRaisesRegex(BoundedProcessError, "timed out"):
                run_bounded(
                    [sys.executable, "-c", code, str(pid_path)],
                    cwd=REPO,
                    env=os.environ.copy(),
                    timeout=0.5,
                    stdout_limit=1024,
                    stderr_limit=1024,
                )
            self.assert_process_stops(int(pid_path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    unittest.main()
