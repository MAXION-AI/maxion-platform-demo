#!/usr/bin/env python3
"""Run a child process with independent, incremental output bounds.

The command runs in a new process group. Exceeding either stream limit or the
deadline kills that entire group before the process is reaped, so a noisy or
hung descendant cannot outlive an evidence collection attempt.
"""

from __future__ import annotations

import os
import selectors
import signal
import subprocess
import time
from pathlib import Path
from typing import Mapping, NamedTuple, Optional, Sequence


class BoundedProcessError(RuntimeError):
    """Raised after the complete child process group has been terminated."""


class BoundedProcessResult(NamedTuple):
    returncode: int
    stdout: bytes
    stderr: bytes


def _terminate_process_group(process: subprocess.Popen) -> None:
    """SIGKILL the isolated process group and synchronously reap its leader."""

    # The group leader can exit while a descendant keeps an inherited pipe open.
    # Always address the process group, not just a still-running leader.
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except OSError:
        if process.poll() is None:
            try:
                process.kill()
            except OSError:
                pass
    try:
        process.wait()
    except OSError:
        pass


def run_bounded(
    argv: Sequence[str],
    *,
    cwd: Path,
    env: Mapping[str, str],
    timeout: float,
    stdout_limit: int,
    stderr_limit: int,
) -> BoundedProcessResult:
    """Run ``argv`` while retaining no more than each declared stream limit."""

    if timeout <= 0:
        raise ValueError("timeout must be positive")
    if stdout_limit < 0 or stderr_limit < 0:
        raise ValueError("output limits must be non-negative")
    try:
        process = subprocess.Popen(
            list(argv),
            cwd=str(cwd),
            env=dict(env),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
    except OSError as exc:
        raise BoundedProcessError(f"could not start child process: {exc}") from exc

    assert process.stdout is not None
    assert process.stderr is not None
    selector = selectors.DefaultSelector()
    streams = {
        process.stdout.fileno(): ("stdout", process.stdout, bytearray(), stdout_limit),
        process.stderr.fileno(): ("stderr", process.stderr, bytearray(), stderr_limit),
    }
    for file_descriptor, (name, _stream, _buffer, _limit) in streams.items():
        selector.register(file_descriptor, selectors.EVENT_READ, data=name)

    deadline = time.monotonic() + timeout
    failure: Optional[str] = None
    try:
        while selector.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                failure = f"timed out after {timeout:g} seconds"
                break
            events = selector.select(min(remaining, 0.1))
            if not events:
                continue
            for key, _mask in events:
                name, _stream, buffer, limit = streams[key.fd]
                available = limit - len(buffer)
                try:
                    chunk = os.read(key.fd, min(65_536, available + 1))
                except BlockingIOError:
                    continue
                if not chunk:
                    selector.unregister(key.fd)
                    continue
                buffer.extend(chunk[:available])
                if len(chunk) > available:
                    failure = f"{name} exceeds {limit} bytes"
                    break
            if failure is not None:
                break
        if failure is not None:
            _terminate_process_group(process)
            raise BoundedProcessError(failure)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            _terminate_process_group(process)
            raise BoundedProcessError(f"timed out after {timeout:g} seconds")
        try:
            returncode = process.wait(timeout=remaining)
        except subprocess.TimeoutExpired as exc:
            _terminate_process_group(process)
            raise BoundedProcessError(f"timed out after {timeout:g} seconds") from exc
        return BoundedProcessResult(
            returncode=returncode,
            stdout=bytes(streams[process.stdout.fileno()][2]),
            stderr=bytes(streams[process.stderr.fileno()][2]),
        )
    finally:
        selector.close()
        process.stdout.close()
        process.stderr.close()
        if process.poll() is None:
            _terminate_process_group(process)
