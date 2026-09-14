# Phase acceptance, PR, and orchestration protocol

This protocol is binding for every phase in the Maxion platform demo UI foundation program. A phase
is not accepted because a dirty worktree passed tests or because a PR merged; acceptance binds
independent evidence to an immutable implementation commit and then proves that the merge contains
exactly that implementation.

## Identities

- **B** — the prior phase's verified merge SHA. A new isolated worktree and branch start exactly at B.
- **C** — the candidate implementation SHA. C contains all production code, tests, scripts, contracts,
  and reference-sheet changes for the phase. The worktree must be clean at C.
- **E** — optional evidence-only PR-head SHA. E may add only audit/evidence artifacts and sign-off
  metadata after C; it may not change the reviewed implementation tree.
- **M** — the verified merge SHA on the target branch.

The independent UX verifier and engineering QA both inspect a clean worktree detached at C. Their
reports record repository, branch/PR, C, `git status --short` output (empty), source-tree hash,
dependency-lock hash, manifest hash, reference-sheet hashes, commands, and exact results. A report
that names only a branch, a dirty tree, or a pre-implementation base is not acceptance evidence.

## Evidence-only closure

After independent review, the builder may create E only when `git diff --name-only C..E` contains
paths in this allowlist:

- `artifacts/ux-audits/<phase>/`
- evidence cells and status/sign-off lines in the phase's binding reference sheets
- `docs/operations/program-phase-ledger.json`
- the phase document's status/hand-off fields
- `HARDENING-LOG.md` for plan-gate rounds only

E may not touch `src/`, tests, scripts, package manifests/locks, build configuration, Figma mappings,
state IDs, laws, reference decisions, or acceptance thresholds. Before review and again at E, record
`git rev-parse C:src`; the values must match. If anything outside the allowlist changes, E becomes a
new candidate C and both independent reviews restart.

## PR and merge lifecycle

1. Verify B is the target branch tip and create one isolated `phase-N/<slug>` branch/worktree from B.
2. Implement and run the phase's exact gates. Commit the clean implementation as C and push the branch.
3. Open one PR with B, C, source-tree/lock/manifest/sheet hashes, evidence paths, rollback command, and
   the phase's RC/ADR/state coverage.
4. Independent UX and engineering reviewers audit detached clean worktrees at C. No builder self-signoff.
5. Add E only under the evidence-only rule. Required status checks run on E; reviewers confirm C→E is
   evidence-only and that E contains C.
6. Merge with the repository's configured method. Record PR URL, PR head E (or C), and M. Verify
   `git merge-base --is-ancestor C M` and that the target branch tip contains the PR head.
7. In a fresh clean worktree pinned to M, rerun `pnpm check:program`, `pnpm build`,
   `pnpm audit --audit-level high`, the phase test command, and `git diff --check`. Update the
   external ledger atomically. Only then may the successor use M as B.

Failed checks, missing reviews, a mismatched source tree, an unclean verifier checkout, or an
unrecorded M leave the phase open.

## Rollback

Demo phases have one UI/runtime owner at merge. Rollback is a new PR that reverts the phase PR (or its
merge commit) and reruns the prior merge's post-merge gates. A feature flag may change provider
behavior only when both settings use the same route, UI, state, style, and persistence owners. It may
not preserve the predecessor UI as a hidden second runtime.

## Durable cross-worktree and cross-repository ledger

The tracked summary is `docs/operations/program-phase-ledger.json`. Because a commit cannot contain
its own eventual merge SHA, the operational authority is external:

`/Users/abhinavshankar/.codex/program-ledgers/maxion-platform-demo-ui-foundation/ledger.json`

The coordinator is the only writer. It takes an advisory lock, writes a complete next document to a
same-directory temporary file, `fsync`s the file and directory, then atomically renames it. Each
record contains program/repository, phase, B/C/E/M, PR URL, source-tree/lock/manifest/sheet hashes,
reviewer identities, evidence paths, command results, timestamp, and SHA-256 of the preceding record.
The new worktree bootstraps by checking the previous-record hash, fetching M, verifying ancestry and a
clean checkout, then copying no mutable state from the predecessor. Recovery chooses the last
checksum-valid record and reconstructs from its M; ambiguous writers or a broken hash chain stop the
program.

`python3 scripts/program_ledger.py append --record <record.json>` is the only supported external-ledger
write path. It rejects an invalid existing chain or record, serializes concurrent writers with the
advisory lock, and computes both chain hashes itself. `python3 scripts/program_ledger.py validate`
must pass before a successor phase starts; `pnpm check:program-ledger` separately validates the tracked
summary's shape and immutable identities without depending on machine-local external state.

The demo stream ends after the demo adoption-package PR. A separate MaxAI production-adoption ledger,
plan, branch chain, reviewers, and PRs begin from fetched `max-ai-platform/origin/main`; a MaxAI SHA
is never represented as a descendant of a demo SHA.
