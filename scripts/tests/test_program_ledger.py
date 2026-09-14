"""Break-it tests for the durable program ledger."""

from __future__ import annotations

import copy
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

import program_ledger as ledger  # noqa: E402


def canonical(value: object) -> bytes:
    return json.dumps(value, indent=2, sort_keys=True).encode("utf-8") + b"\n"


class ProgramLedgerTests(unittest.TestCase):
    def setUp(self) -> None:
        environment = mock.patch.dict(os.environ, {"MAXION_PROGRAM_PHASE": "0"})
        environment.start()
        self.addCleanup(environment.stop)
        self.real_github_attestation = ledger._attest_github_pull_request
        github = mock.patch.object(ledger, "_attest_github_pull_request", return_value=None)
        self.github_attestation = github.start()
        self.addCleanup(github.stop)
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        root = Path(self.tempdir.name)
        self.repo = root / "repo"
        self.repo.mkdir()
        self.path = root / "ledger.json"
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.email", "test@example.com")
        self.git("config", "user.name", "Test")
        self.write("src/app.ts", "export const value = 0\n")
        self.write("tests/fixture.txt", "test\n")
        self.write("package.json", "{}\n")
        self.write("pnpm-lock.yaml", "lockfileVersion: '9.0'\n")
        self.write("playwright.config.ts", "export default {}\n")
        self.write("vite.config.ts", "export default {}\n")
        self.write(".github/workflows/gates.yml", "name: gates\n")
        for path in ledger.PROTECTED_OBJECT_PATHS:
            if path.startswith("docs/operations/") and path != "docs/operations/figma-code-map.json":
                self.write(path, f"fixture for {path}\n")
        (self.repo / "scripts").mkdir(parents=True, exist_ok=True)
        shutil.copy(REPO / "scripts" / "program_ledger.py", self.repo / "scripts" / "program_ledger.py")
        shutil.copy(
            REPO / "scripts" / "check_phase_acceptance.py",
            self.repo / "scripts" / "check_phase_acceptance.py",
        )
        for index, path in enumerate(sorted(ledger.REFERENCE_SHEET_PATHS)):
            self.write(path, self.sheet(path))
        self.write(
            "docs/operations/figma-code-map.json",
            json.dumps({
                "surfaces": [
                    {
                        "surfaceId": f"surface-{index}",
                        "referenceSheet": Path(path).name,
                        "acceptancePhase": 0 if index == 0 else 99,
                    }
                    for index, path in enumerate(sorted(ledger.REFERENCE_SHEET_PATHS))
                ]
            }) + "\n",
        )
        self.write("docs/operations/program-phase-ledger.json", "{}\n")
        self.git("add", ".")
        self.git("commit", "-qm", "fixture base")
        self.base = self.git("rev-parse", "HEAD")
        self.records: dict[int, dict[str, object]] = {}
        self.records[0] = self.make_phase(0, self.base, 1)

    @staticmethod
    def sheet(path: str) -> str:
        return f"""# {Path(path).stem}

- **Sheet id:** {Path(path).stem}
- **Status:** contract

## 1. Job and route contract
contract

## 2. Examined references and decisions
references

## 3. Figma and token mapping
mapping

## 4. Laws-check
laws

## 5. State and interaction contract
states

## 6. Responsive and accessibility contract
responsive

## 7. Evidence plan
| Check | Artifact |
| --- | --- |
| proof | pending |

## 8. Sign-off
pending
"""

    @staticmethod
    def phase_doc(phase: int, status: str, evidence: list[str] | None = None) -> str:
        handoff = {
            "schemaVersion": 1,
            "phase": phase,
            "nextPhase": phase + 1 if phase < 11 else None,
            "status": status,
            "evidence": evidence or [],
            "reviewers": {"ux": "pending", "qa": "pending"} if status == "pending" else {
                "ux": f"ux-{phase}", "qa": f"qa-{phase}"
            },
        }
        return (
            f"# Phase {phase}\n\n- **Closes:** RC-{phase:02d} | **Risk:** high | **Status:** {status}\n\n## Hand-off\n\nImmutable.\n\n"
            "### Structured acceptance hand-off\n\n```json\n"
            + json.dumps(handoff, indent=2)
            + "\n```\n"
        )

    def write(self, relative: str, body: str | bytes) -> None:
        path = self.repo / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body if isinstance(body, bytes) else body.encode("utf-8"))

    def git(self, *args: str) -> str:
        return subprocess.run(
            ["git", "-C", str(self.repo), *args], check=True, capture_output=True, text=True
        ).stdout.strip()

    def make_phase(self, phase: int, base: str, pr_number: int) -> dict[str, object]:
        branch = f"phase-{phase}"
        self.git("checkout", "-qb", branch, base)
        self.write("src/app.ts", f"export const value = {phase + 1}\n")
        phase_doc = (
            f"docs/implementation-plans/2026-09-13-maxion-platform-demo-ui-foundation/"
            f"{phase + 1:02d}-phase-{phase}-fixture.md"
        )
        self.write(phase_doc, self.phase_doc(phase, "pending"))
        self.git("add", ".")
        self.git("commit", "-qm", f"phase {phase} candidate")
        candidate = self.git("rev-parse", "HEAD")
        source_tree = self.git("rev-parse", f"{candidate}:src")
        manifest = json.loads(self.git("show", f"{candidate}:docs/operations/figma-code-map.json"))
        owned_sheets = sorted(
            f"docs/operations/ux-reference-sheets/{item['referenceSheet']}"
            for item in manifest["surfaces"]
            if item["acceptancePhase"] == phase
        )
        prefix = f"artifacts/ux-audits/phase-{phase}"
        review_evidence = f"{prefix}/review-checks.txt"
        self.write(review_evidence, "independent review evidence\n")
        browser_paths = [f"{prefix}/browser-run-{index}.json" for index in range(1, 4)]
        for index, path in enumerate(browser_paths, 1):
            self.write(path, canonical({"run": index, "status": "PASS"}))
        review_paths: dict[str, str] = {}
        for role in ("ux", "qa"):
            report_path = f"{prefix}/independent-{role}.json"
            review_paths[role] = report_path
            report = {
                "schemaVersion": 2,
                "program": ledger.PROGRAM,
                "phase": phase,
                "role": role,
                "reviewer": f"{role}-{phase}",
                "builder": f"builder-{phase}",
                "candidateSha": candidate,
                "sourceTreeSha1": source_tree,
                "sessionId": f"session-{role}-{phase}",
                "worktree": str(self.repo / f"{role}-review-worktree"),
                "cleanCheckout": True,
                "referenceSheets": owned_sheets,
                "checks": [
                    {"id": check_id, "status": "PASS", "evidence": [review_evidence]}
                    for check_id in ledger.REVIEW_CHECKLISTS[role]
                ],
                "verdict": "PASS",
            }
            if role == "qa":
                report["browserRuns"] = [
                    {
                        "runId": f"phase-{phase}-run-{index}",
                        "browser": "chromium",
                        "browserVersion": "fixture",
                        "viewport": {"width": 1280, "height": 900},
                        "fixture": f"fixture-{index}",
                        "status": "PASS",
                        "exitCode": 0,
                        "artifactPath": path,
                        "artifactSha256": hashlib.sha256((self.repo / path).read_bytes()).hexdigest(),
                    }
                    for index, path in enumerate(browser_paths, 1)
                ]
            self.write(report_path, canonical(report))
        command_results: list[dict[str, object]] = []
        for command_id, command in sorted(ledger.CANONICAL_COMMANDS.items()):
            stdout_hash = hashlib.sha256(f"{command_id}:pass\n".encode()).hexdigest()
            stderr_hash = hashlib.sha256(b"").hexdigest()
            report_path = f"{prefix}/command-{command_id}.json"
            report = {
                "schemaVersion": 2,
                "program": ledger.PROGRAM,
                "phase": phase,
                "kind": "command-result",
                "candidateSha": candidate,
                "sourceTreeSha1": source_tree,
                "id": command_id,
                "command": command,
                "status": "PASS",
                "exitCode": 0,
                "runSha": candidate,
                "stdout": f"{command_id}:pass\n",
                "stderr": "",
                "stdoutSha256": stdout_hash,
                "stderrSha256": stderr_hash,
                "worktree": str(self.repo),
                "cleanBefore": True,
                "cleanAfter": True,
                "startedAt": f"2026-09-13T11:00:{phase:02d}Z",
                "finishedAt": f"2026-09-13T11:01:{phase:02d}Z",
            }
            report_bytes = canonical(report)
            self.write(report_path, report_bytes)
            command_results.append({
                **{key: report[key] for key in (
                    "id", "command", "status", "exitCode", "runSha", "stdoutSha256", "stderrSha256"
                )},
                "evidencePath": report_path,
                "evidenceSha256": hashlib.sha256(report_bytes).hexdigest(),
            })
        evidence_paths = [
            *review_paths.values(), review_evidence, *browser_paths,
            *[str(item["evidencePath"]) for item in command_results],
        ]
        self.write(phase_doc, self.phase_doc(phase, "accepted", evidence_paths))
        self.git("add", ".")
        self.git("commit", "-qm", f"phase {phase} evidence")
        evidence = self.git("rev-parse", "HEAD")
        self.git("checkout", "main")
        merge_subject = f"Merge pull request #{pr_number} from MAXION-AI/{branch}"
        self.git("merge", "--no-ff", "-qm", merge_subject, branch)
        merge = self.git("rev-parse", "HEAD")
        self.git("update-ref", "refs/remotes/origin/main", merge)
        record: dict[str, object] = {
            "phase": phase,
            "status": ledger.ACCEPTED_STATUS,
            "baseSha": base,
            "candidateSha": candidate,
            "prUrl": f"https://github.com/MAXION-AI/maxion-platform-demo/pull/{pr_number}",
            "prNumber": pr_number,
            "prHeadSha": evidence,
            "mergeSha": merge,
            "mergeCommitSubject": merge_subject,
            "targetRef": "refs/remotes/origin/main",
            "independentAcceptanceSha": candidate,
            "evidenceCommitSha": evidence,
            "sourceTreeSha1": source_tree,
            "protectedObjectSha1": {
                path: self.git("rev-parse", f"{candidate}:{path}")
                for path in ledger.PROTECTED_OBJECT_PATHS
            },
            "lockSha256": ledger._git_blob_sha256(self.repo, candidate, "pnpm-lock.yaml"),
            "manifestSha256": ledger._git_blob_sha256(
                self.repo, candidate, "docs/operations/figma-code-map.json"
            ),
            "referenceSheetSha256": {
                path: ledger._git_blob_sha256(self.repo, candidate, path)
                for path in ledger.REFERENCE_SHEET_PATHS
            },
            "referenceSheetContractSha256": {
                path: ledger.reference_sheet_contract_sha256(ledger._git_blob(self.repo, candidate, path))
                for path in ledger.REFERENCE_SHEET_PATHS
            },
            "builder": f"builder-{phase}",
            "reviewers": {"ux": f"ux-{phase}", "qa": f"qa-{phase}"},
            "reviewReports": {
                role: {"path": path, "sha256": ledger._git_blob_sha256(self.repo, evidence, path)}
                for role, path in review_paths.items()
            },
            "evidence": evidence_paths,
            "evidenceQualification": ledger.ACCEPTED_EVIDENCE_QUALIFICATION,
            "reasonOpen": None,
            "commands": command_results,
            "postMergeCommands": [
                {
                    "id": result["id"],
                    "command": result["command"],
                    "status": "PASS",
                    "exitCode": 0,
                    "runSha": merge,
                    "stdout": f"{result['id']}:pass\n",
                    "stderr": "",
                    "stdoutSha256": result["stdoutSha256"],
                    "stderrSha256": result["stderrSha256"],
                }
                for result in command_results
            ],
            "timestamp": f"2026-09-13T12:00:{phase:02d}Z",
        }
        return record

    def accepted_record(self, phase: int = 0) -> dict[str, object]:
        return copy.deepcopy(self.records[phase])

    def load(self) -> dict[str, object]:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def assert_invalid(self, record: dict[str, object], message: str) -> None:
        with self.assertRaisesRegex(ledger.LedgerError, message):
            ledger.validate_record(record, external=False, repo_root=self.repo)

    def append(self, record: dict[str, object]) -> dict[str, object]:
        raw = copy.deepcopy(record)
        receipts = raw.pop("postMergeCommands")
        with mock.patch.object(ledger, "_run_canonical_commands", return_value=copy.deepcopy(receipts)):
            return ledger.append_record(
                self.path,
                raw,
                target_ref=ledger.TARGET_REF,
                repo_root=self.repo,
            )

    def test_canonical_runner_executes_fixed_commands_and_hashes_complete_output(self) -> None:
        record = self.accepted_record()
        with mock.patch.object(
            ledger.subprocess,
            "run",
            return_value=SimpleNamespace(returncode=0, stdout=b"complete output\n", stderr=b""),
        ) as run:
            receipts = ledger._run_canonical_commands(record, self.repo)
        invoked = [call[0][0] for call in run.call_args_list]
        expected = [
            argv
            for command_id in ledger.CANONICAL_COMMANDS
            for argv in ledger.CANONICAL_EXECUTION[command_id]
        ]
        self.assertEqual(invoked, expected)
        self.assertEqual({item["id"] for item in receipts}, ledger.REQUIRED_COMMAND_IDS)
        self.assertTrue(all(item["runSha"] == record["mergeSha"] for item in receipts))
        self.assertTrue(all(
            item["stdout"] == "complete output\n" * len(ledger.CANONICAL_EXECUTION[item["id"]])
            for item in receipts
        ))

    def test_canonical_runner_rejects_oversized_persisted_output(self) -> None:
        record = self.accepted_record()
        with mock.patch.object(
            ledger.subprocess,
            "run",
            return_value=SimpleNamespace(
                returncode=0, stdout=b"x" * (ledger.MAX_CAPTURE_BYTES + 1), stderr=b""
            ),
        ):
            with self.assertRaisesRegex(ledger.LedgerError, "output exceeds"):
                ledger._run_canonical_commands(record, self.repo)

    def test_append_creates_and_validates_hash_chain(self) -> None:
        first = self.append(self.accepted_record())
        second_record = self.make_phase(1, str(first["mergeSha"]), 2)
        second = self.append(second_record)
        document = self.load()
        ledger.validate_external(document, target_ref="refs/remotes/origin/main", repo_root=self.repo)
        self.assertEqual(first["previousRecordSha256"], "0" * 64)
        self.assertEqual(second["previousRecordSha256"], first["recordSha256"])

    def test_concurrent_duplicate_append_has_one_winner(self) -> None:
        records = [self.accepted_record() for _ in range(4)]
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(self.append, item) for item in records]
        self.assertEqual(sum(future.exception() is None for future in futures), 1)
        self.assertEqual(len(self.load()["records"]), 1)

    def test_external_rejects_skip_pending_wrong_target_and_unmerged_sha(self) -> None:
        skipped = self.make_phase(1, str(self.records[0]["mergeSha"]), 2)
        with self.assertRaisesRegex(ledger.LedgerError, "expected phase 0"):
            self.append(skipped)
        pending = self.accepted_record()
        pending.update({
            "status": ledger.PENDING_STATUS,
            "independentAcceptanceSha": None,
            "reasonOpen": "review pending",
            "evidenceQualification": "clean-sha-review-pending",
            "commands": [],
        })
        with self.assertRaisesRegex(ledger.LedgerError, "only accepted"):
            self.append(pending)
        with self.assertRaisesRegex(ledger.LedgerError, "targetRef|target ref"):
            ledger.append_record(self.path, self.accepted_record(), target_ref=self.base, repo_root=self.repo)
        unmerged = self.accepted_record()
        unmerged["mergeSha"] = unmerged["prHeadSha"]
        for receipt in unmerged["postMergeCommands"]:
            receipt["runSha"] = unmerged["prHeadSha"]
        with self.assertRaisesRegex(ledger.LedgerError, "merge commit|ancestry"):
            ledger.validate_record(unmerged, external=True, repo_root=self.repo)
        with self.assertRaisesRegex(ledger.LedgerError, "exactly refs/remotes/origin/main"):
            ledger.validate_external(
                {"schemaVersion": 1, "program": ledger.PROGRAM, "repository": ledger.REPOSITORY, "records": []},
                target_ref="refs/remotes/upstream/main",
                repo_root=self.repo,
            )

    def test_fake_pr_command_evidence_and_reviewer_reports_are_rejected(self) -> None:
        item = self.accepted_record()
        item["prUrl"] = "https://github.com/MAXION-AI/maxion-platform-demo/pull/999999999"
        item["prNumber"] = 999999999
        with self.assertRaisesRegex(ledger.LedgerError, "merge commit subject"):
            ledger.validate_record(item, external=True, repo_root=self.repo)
        item = self.accepted_record()
        item["commands"][0]["command"] = "check-program"
        self.assert_invalid(item, "canonical invocation")
        item = self.accepted_record()
        item["postMergeCommands"][0]["command"] = "echo fabricated"
        self.assert_invalid(item, "post-merge command")
        item = self.accepted_record()
        item["commands"][0]["evidencePath"] = "README.md"
        self.assert_invalid(item, "must be inside")
        item = self.accepted_record()
        item["reviewReports"]["qa"] = copy.deepcopy(item["reviewReports"]["ux"])
        self.assert_invalid(item, "distinct committed")
        item = self.accepted_record()
        item["targetRef"] = "refs/remotes/upstream/main"
        self.assert_invalid(item, "exactly refs/remotes/origin/main")
        item = self.accepted_record()
        qa_path = item["reviewReports"]["qa"]["path"]
        qa = json.loads(self.git("show", f"{item['evidenceCommitSha']}:{qa_path}"))
        qa["browserRuns"].pop()
        self.write(qa_path, canonical(qa))
        # Schema validation is exercised directly because changing the committed fixture
        # would intentionally invalidate the record's evidence object hash first.
        with self.assertRaisesRegex(ledger.LedgerError, "exactly three browser runs"):
            ledger._validate_review_report_shape(qa, record=item, role="qa", repo_root=self.repo)
        qa = json.loads(self.git("show", f"{item['evidenceCommitSha']}:{qa_path}"))
        qa["browserRuns"][1]["artifactPath"] = qa["browserRuns"][0]["artifactPath"]
        qa["browserRuns"][1]["artifactSha256"] = qa["browserRuns"][0]["artifactSha256"]
        with self.assertRaisesRegex(ledger.LedgerError, "three distinct artifacts"):
            ledger._validate_review_report_shape(qa, record=item, role="qa", repo_root=self.repo)

    def test_github_attestation_fails_closed(self) -> None:
        record = self.accepted_record()
        with mock.patch.object(
            ledger.subprocess,
            "run",
            return_value=SimpleNamespace(returncode=1, stdout="", stderr="not authenticated"),
        ):
            with self.assertRaisesRegex(ledger.LedgerError, "GitHub PR attestation failed"):
                self.real_github_attestation(record, self.repo)

    def test_github_attestation_binds_exact_base_and_head_shas(self) -> None:
        record = self.accepted_record()
        payload = {
            "html_url": record["prUrl"],
            "state": "closed",
            "merge_commit_sha": record["mergeSha"],
            "merged_at": "2026-09-13T12:00:00Z",
            "base": {"ref": "main", "sha": record["baseSha"]},
            "head": {"sha": record["prHeadSha"]},
        }
        with mock.patch.object(
            ledger.subprocess,
            "run",
            return_value=SimpleNamespace(returncode=0, stdout=json.dumps(payload), stderr=""),
        ):
            self.real_github_attestation(record, self.repo)

        payload["base"]["sha"] = "0" * 40
        with mock.patch.object(
            ledger.subprocess,
            "run",
            return_value=SimpleNamespace(returncode=0, stdout=json.dumps(payload), stderr=""),
        ):
            with self.assertRaisesRegex(ledger.LedgerError, "base SHA"):
                self.real_github_attestation(record, self.repo)

    def test_append_rejects_user_supplied_or_invalid_post_merge_receipts(self) -> None:
        with self.assertRaisesRegex(ledger.LedgerError, "coordinator-generated"):
            ledger.append_record(
                self.path,
                self.accepted_record(),
                target_ref="refs/remotes/origin/main",
                repo_root=self.repo,
            )
        raw = self.accepted_record()
        raw.pop("postMergeCommands")
        with mock.patch.object(ledger, "_run_canonical_commands", return_value=[]):
            with self.assertRaisesRegex(ledger.LedgerError, "exact canonical command set"):
                ledger.append_record(
                    self.path,
                    raw,
                    target_ref=ledger.TARGET_REF,
                    repo_root=self.repo,
                )

    def test_append_rechecks_checkout_after_commands(self) -> None:
        raw = self.accepted_record()
        receipts = raw.pop("postMergeCommands")

        def dirty_runner(_record: dict[str, object], _repo: Path) -> list[dict[str, object]]:
            self.write("untracked-after-command.txt", "unexpected\n")
            return copy.deepcopy(receipts)

        with mock.patch.object(ledger, "_run_canonical_commands", side_effect=dirty_runner):
            with self.assertRaisesRegex(ledger.LedgerError, "clean merge checkout"):
                ledger.append_record(
                    self.path, raw, target_ref=ledger.TARGET_REF, repo_root=self.repo
                )
        self.assertFalse(self.path.exists())

    def test_merge_full_tree_must_equal_evidence_tree(self) -> None:
        record = self.accepted_record()
        self.write("merge-only-drift.txt", "must not be accepted\n")
        self.git("add", "merge-only-drift.txt")
        changed_tree = self.git("write-tree")
        result = subprocess.run(
            [
                "git", "-C", str(self.repo), "commit-tree", changed_tree,
                "-p", str(record["baseSha"]), "-p", str(record["prHeadSha"]),
            ],
            input=f"{record['mergeCommitSubject']}\n",
            capture_output=True,
            text=True,
            check=True,
        )
        hostile_merge = result.stdout.strip()
        record["mergeSha"] = hostile_merge
        for receipt in record["postMergeCommands"]:
            receipt["runSha"] = hostile_merge
        with self.assertRaisesRegex(ledger.LedgerError, "full tree"):
            ledger.validate_record(record, external=False, repo_root=self.repo)

    def test_command_report_must_be_listed_in_evidence_and_match_hash(self) -> None:
        item = self.accepted_record()
        command_path = item["commands"][0]["evidencePath"]
        item["evidence"].remove(command_path)
        self.assert_invalid(item, "must be listed")
        item = self.accepted_record()
        item["commands"][0]["evidenceSha256"] = "0" * 64
        self.assert_invalid(item, "evidence SHA-256")
        item = self.accepted_record()
        item["commands"][0]["stdoutSha256"] = "0" * 64
        self.assert_invalid(item, "stdoutSha256")
        item = self.accepted_record()
        item["postMergeCommands"][0]["stdout"] = "fabricated output\n"
        self.assert_invalid(item, "stdout content")

    def test_source_and_all_protected_objects_are_identity_bound(self) -> None:
        item = self.accepted_record()
        item["sourceTreeSha1"] = "0" * 40
        self.assert_invalid(item, "sourceTreeSha1")
        item = self.accepted_record()
        item["protectedObjectSha1"]["tests"] = "0" * 40
        self.assert_invalid(item, "protected object tests")

    def test_bootstrap_requires_exact_merge_and_clean_checkout(self) -> None:
        self.append(self.accepted_record())
        document = self.load()
        merge = self.accepted_record()["mergeSha"]
        self.assertEqual(
            ledger.bootstrap_external(
                document,
                expected_phase=0,
                target_ref="refs/remotes/origin/main",
                repo_root=self.repo,
                require_clean=False,
            ),
            merge,
        )
        with self.assertRaisesRegex(ledger.LedgerError, "expected accepted phase 1"):
            ledger.bootstrap_external(
                document,
                expected_phase=1,
                target_ref="refs/remotes/origin/main",
                repo_root=self.repo,
                require_clean=False,
            )

    def test_recovery_preserves_corrupt_bytes_and_restores_last_valid_prefix(self) -> None:
        self.append(self.accepted_record())
        good = self.path.read_bytes()
        damaged = good[:-3] + b', {"phase": 1, "truncated"'
        self.path.write_bytes(damaged)
        preserved, merge = ledger.recover_external(self.path, repo_root=self.repo)
        self.assertEqual(preserved.read_bytes(), damaged)
        self.assertEqual(merge, self.accepted_record()["mergeSha"])
        ledger.validate_external(self.load(), target_ref="refs/remotes/origin/main", repo_root=self.repo)

    def test_recovery_refuses_when_no_valid_record_exists(self) -> None:
        self.path.write_text('{"records": [{"bad":', encoding="utf-8")
        with self.assertRaisesRegex(ledger.LedgerError, "no checksum-valid"):
            ledger.recover_external(self.path, repo_root=self.repo)
        self.assertEqual(self.path.read_text(encoding="utf-8"), '{"records": [{"bad":')

    def test_committed_tracked_ledger_is_a_lagging_export(self) -> None:
        document = json.loads(ledger.TRACKED_LEDGER.read_text(encoding="utf-8"))
        ledger.validate_tracked(document)
        self.assertEqual(document["snapshotThroughPhase"], -1)
        self.assertEqual(document["phases"], [])


if __name__ == "__main__":
    unittest.main()
