# Phase acceptance, PR, and orchestration protocol

This protocol is binding for every phase in the Maxion platform demo UI foundation program. A phase
is not accepted because a dirty worktree passed tests or because a PR merged; acceptance binds
independent evidence to an immutable implementation commit and then proves that the merge contains
exactly that implementation.

## Identities

- **B** — the prior phase's verified merge SHA. A new isolated worktree and branch start exactly at B.
- **C** — the candidate implementation SHA. C contains all production code, tests, scripts, contracts,
  and reference-sheet changes for the phase. The worktree must be clean at C.
- **E** — required, distinct evidence-only PR-head SHA and the single direct child of C. E adds only phase-scoped machine-readable
  audit/command artifacts, permitted sheet evidence/sign-off cells, and the phase hand-off transition
  after C; it may not change the reviewed implementation or acceptance contract.
- **M** — the verified merge SHA on the target branch.

The independent UX verifier and engineering QA both inspect separate clean worktrees detached at C.
Their committed JSON reports use distinct reviewer identities and one common builder identity, and bind
the program, phase, C, `C:src` tree, exact phase-owned reference sheets, completed checks, and PASS
verdict. The mandatory command reports bind the exact invocation, exit code, C, source tree, and
SHA-256 of stdout and stderr. A report that names only a branch, a dirty tree, a pre-implementation
base, an arbitrary prose file, or a reviewer string without its committed report is not evidence.

## Evidence-only closure

After independent review, the builder creates E only when `git diff --name-status C..E` contains
paths in this allowlist:

- added regular JSON/artifact files under `artifacts/ux-audits/phase-N/`
- modified evidence cells and status/sign-off lines in only the sheets whose candidate manifest
  declares `acceptancePhase: N`
- the one predetermined `NN-phase-N-*.md` document's status and structured hand-off fields

No tracked-ledger or hardening-log update belongs in E. Plan-gate hardening is candidate work at C.
E may not add/delete/rename/copy a plan or sheet, and may not touch `src/`, tests, scripts, workflows,
package manifests/locks, build configuration, Figma mappings, state IDs, laws, reference decisions,
or acceptance thresholds. Before review and again at E, protected object identities for workflows,
source, tests, scripts, manifests/locks, and build configuration must match. If anything outside the
allowlist changes, the commit is a new C and both independent reviews restart.

`python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase N` is the
semantic authority for this boundary. It proves C exists and is an ancestor of E, rejects every
non-allowlisted path and every add/delete/rename/copy outside the phase artifact directory, discovers
the phase document and phase-owned sheets from C rather than from the changed-file list, and compares
permitted files by immutable projection rather than filename alone. It also requires exactly one UX
and one QA JSON report, distinct reviewers, a shared non-reviewer builder, and a pending→accepted
structured hand-off. Full sheet hashes identify the accepted artifact; separate immutable-contract
hashes let artifact/result/sign-off cells be filled without disguising a contract edit.

### Machine-readable evidence schemas

All keys are mandatory and unknown keys are rejected.

| Artifact | Exact keys | Binding rule |
| --- | --- | --- |
| Independent UX/QA report | `schemaVersion`, `program`, `phase`, `role`, `reviewer`, `builder`, `candidateSha`, `sourceTreeSha1`, `referenceSheets`, `checks`, `verdict` | role/path are unique; reviewer identities differ from each other and builder; candidate/source/phase-owned sheets are exact; checks are non-empty strings; verdict is PASS |
| Clean-C command report | `schemaVersion`, `program`, `phase`, `kind`, `candidateSha`, `sourceTreeSha1`, `id`, `command`, `status`, `exitCode`, `runSha`, `stdout`, `stderr`, `stdoutSha256`, `stderrSha256` | id-to-command is canonical; run SHA is C; PASS agrees with zero; stream contents match hashes; blob hash and path are in the ledger evidence set |
| Gated sheet check | `schemaVersion`, `kind`, `phase`, `sheetId`, `check`, `candidateSha`, `verdict` | path is under matching `phase-N`; sheet belongs to N in C's manifest; blob is newly added at the single direct E child of C; check/sheet/verdict are exact, preventing reuse |
| Clean-M append receipt | `id`, `command`, `status`, `exitCode`, `runSha`, `stdout`, `stderr`, `stdoutSha256`, `stderrSha256` | generated only by append after executing the canonical command at clean M; complete stream contents match their hashes; input JSON may not provide it |

E cannot be written inside a blob that contributes to E's own Git hash. The gate binds E without a
self-reference by requiring E to be C's single direct child, requiring the report blob to be absent at
C and present at HEAD, and then binding that exact blob hash/path and E in the external record.

## PR and merge lifecycle

1. Verify B is the target branch tip and create one isolated `phase-N/<slug>` branch/worktree from B.
2. Implement and run the phase's exact gates. Commit the clean implementation as C and push the branch.
3. Open one PR with B, C, source-tree/lock/manifest/full-sheet/immutable-sheet hashes, evidence paths, rollback command, and
   the phase's RC/ADR/state coverage.
4. Independent UX and engineering reviewers audit detached clean worktrees at C. No builder self-signoff.
5. Add E only under the evidence-only rule. Its commit message carries the exact trailer
   `Phase-Candidate: <C>`. Run `check_phase_acceptance.py`; the hosted PR-head workflow detects the
   new phase artifacts, requires that trailer, checks out `github.event.pull_request.head.sha`, asserts
   exact HEAD identity, and runs the same C→E semantic gate before the general gates.
6. Merge with a two-parent merge commit. M's first parent is exactly B and second parent is exactly E;
   its subject includes the recorded PR number. Fetch the explicit remote-tracking target ref and require
   it to resolve exactly to M. Squash, rebase, octopus, synthetic test-merge, or an unmerged feature SHA
   cannot be recorded as M.
7. In a fresh clean worktree at C, run the exact mandatory command set—no omissions or extras:
   `check-program` = `pnpm check:program`, `build` = `pnpm build`, `audit-high` =
   `pnpm audit --audit-level high`, `phase-tests` = `pnpm test && pnpm test:e2e`, and `diff-check` =
   `git diff --check`. Store each structured JSON report in `artifacts/ux-audits/phase-N/` and commit it
   at E. The full strict-preview browser suite must complete cleanly three independent times at C; all
   three run IDs, exit results, browser/version, viewport, fixture, and artifact hashes are recorded in
   the QA report. An interrupted, filtered, retried-in-place, or pipe-masked run does not count.
8. In a fresh clean worktree pinned to fetched M, invoke `append`; under the ledger lock it verifies
   clean HEAD and the target ref at exact M, reruns the five canonical commands itself, and writes the
   resulting M-bound exit codes and stdout/stderr hashes as coordinator-generated `postMergeCommands`.
   Input JSON may not supply that field. Run the three-run strict-preview browser check before append as
   additional QA evidence. Post-merge receipts live truthfully in the external record rather than as
   fictional Git evidence inside M. Only after atomic append may M become the successor's B.

Failed checks, missing reviews, a mismatched source tree, an unclean verifier checkout, or an
unrecorded M leave the phase open.

## Rollback

Demo phases have one UI/runtime owner at merge. Rollback is a new PR that reverts the phase PR (or its
merge commit) and reruns the prior merge's post-merge gates. A feature flag may change provider
behavior only when both settings use the same route, UI, state, style, and persistence owners. It may
not preserve the predecessor UI as a hidden second runtime.

## Durable cross-worktree and cross-repository ledger

The tracked summary is `docs/operations/program-phase-ledger.json`. It is deliberately a lagging export
of already accepted external records plus the explicit current `candidatePhase`; it is never the
authority for its own phase and never claims that same-phase C/E/M are known. Because a commit cannot
contain its own eventual merge SHA, the sole current-phase operational authority is external:

`/Users/abhinavshankar/.codex/program-ledgers/maxion-platform-demo-ui-foundation/ledger.json`

The coordinator is the only writer. It takes an advisory lock, writes a complete next document to a
same-directory temporary file, `fsync`s the file and directory, then atomically renames it. Each
record contains program/repository, phase, B/C/E/M, exact target ref, locally verified PR number/merge
subject, protected-object/source-tree/lock/manifest/sheet hashes, reviewer-report bindings, phase-scoped
evidence, the exact canonical clean-C command set, coordinator-generated clean-M command receipts,
timestamp, and SHA-256 of the preceding record.
The external ledger contains exactly one accepted record per phase in strict `0..N` order; it never
contains pending records. Each record's B must equal the prior record's M. The new worktree fetches the
target branch, checks out M, and runs
`python3 scripts/program_ledger.py bootstrap --expected-phase N --target-ref origin/main`. Bootstrap
checks the complete hash chain and acceptance semantics, requires the target ref and checkout HEAD to
equal M, and rejects a dirty checkout. It then copies no mutable state from the predecessor. Recovery
chooses the last checksum-valid record and reconstructs from its M; a duplicate/skipped phase,
ambiguous writer, mismatched base, or broken hash chain stops the program.

`python3 scripts/program_ledger.py append --record <record.json> --target-ref refs/remotes/origin/main`
is the only supported external-ledger write path. Under the lock it rejects pending status,
duplicate/skipped phases, an invalid existing chain/record, target-ref drift, a false merge/PR identity,
uncommitted or mismatched artifacts/reports, noncanonical commands, protected-object drift, and a
failing semantic C→E gate. It runs the exact post-merge command set itself and refuses user-supplied
receipts; it then computes both chain hashes. `validate` also requires the explicit
target ref, and `bootstrap` additionally requires clean HEAD exactly at latest M.

If parsing fails after an interrupted write,
`python3 scripts/program_ledger.py recover --ledger <ledger.json>` preserves the corrupt bytes verbatim
under sibling `corrupt/`, verifies the longest checksum-valid accepted prefix, and atomically restores
only that prefix. It refuses to invent an empty or unverified ledger. The next candidate exports the
accepted prefix into the tracked lagging snapshot, with adjacent prior-M→next-B continuity;
`pnpm check:program-ledger` validates that snapshot without treating it as current-phase authority.

The demo stream ends after the demo adoption-package PR. A separate MaxAI production-adoption ledger,
plan, branch chain, reviewers, and PRs begin from fetched `max-ai-platform/origin/main`; a MaxAI SHA
is never represented as a descendant of a demo SHA.
