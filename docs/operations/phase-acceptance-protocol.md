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
Their committed schema-v2 JSON reports use distinct reviewer labels and one common builder label, and
bind the program, phase, C, `C:src` tree, absolute verifier worktree, clean-checkout assertion, exact
manifest scope kind, reference-sheet scope, exact checklist, concrete evidence, and PASS verdict. For
`phase-surfaces` and `all-surfaces`, QA additionally binds exactly three independent browser runs. The
Phase 11 `package` scope binds no sheet or browser run; both reviewers instead use the exact package
integrity/traceability/proof-boundary/rollback/bootstrap checklist. These labels and session IDs make reports internally consistent; they
do not cryptographically authenticate a human. Separation of people/sessions, clean detached worktree
creation, and custody of the report remain coordinator obligations outside what Git can prove. The
mandatory schema-v3 command reports bind the exact invocation, timestamps, absolute worktree, clean state before
and after, exit code, C, source tree, resolved B/range-head revisions for the range-diff command, and
bounded SHA-256-addressed stdout/stderr. A report that names
only a branch, a dirty tree, a pre-implementation base, or an unbound identity string is not evidence.

## Evidence-only closure

After independent review, the builder creates E only when `git diff --name-status C..E` contains
paths in this allowlist:

- added regular JSON/artifact files under `artifacts/ux-audits/phase-N/`
- modified evidence cells and status/sign-off lines in only the sheets in the candidate manifest's
  authoritative acceptance scope for N (explicit scopes override per-surface acceptance phases)
- the one predetermined `NN-phase-N-*.md` document's status and structured hand-off fields

No tracked-ledger or hardening-log update belongs in E. Plan-gate hardening is candidate work at C.
E may not add/delete/rename/copy a plan or sheet. Every added artifact and every permitted modified
file must be a non-executable regular Git blob (`100644`); symlinks, executable bits, submodules, and
any Git mode/type change fail closed. E may not touch `src/`, tests, scripts, workflows, package
manifests/locks, build configuration, Figma mapping/acceptance scopes, state IDs, laws, reference
decisions, or acceptance thresholds. Before review and again at E, protected object identities for
workflows, source, tests, scripts, manifests/locks, build configuration, UX policy/north-star/inventory,
the reference-sheet template, the Figma map, and this protocol must match. If anything outside the
allowlist changes, the commit is a new C and both independent reviews restart.

`python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase N` is the
semantic authority for this boundary. It proves C exists and is an ancestor of E, rejects every
non-allowlisted path and every add/delete/rename/copy outside the phase artifact directory, discovers
the phase document and phase-owned sheets from C rather than from the changed-file list, and compares
permitted files by immutable projection rather than filename alone. It also requires exactly one UX
and one QA JSON report, distinct reviewers, a shared non-reviewer builder, and a pending→accepted
structured hand-off. Every phase-owned sheet must be updated at E to exactly `Status: gated`, bind all
seven rows to newly added exact C/sheet/check JSON evidence, and carry three distinct complete sign-offs.
Full sheet hashes in the accepted record identify those completed E blobs; separate immutable-contract
hashes bind the C/E invariant while allowing only artifact/result/sign-off cells to be filled.

### Machine-readable evidence schemas

All keys are mandatory and unknown keys are rejected.

| Artifact | Exact keys | Binding rule |
| --- | --- | --- |
| Surface/all-surfaces UX report | `schemaVersion`, `program`, `phase`, `role`, `reviewer`, `builder`, `candidateSha`, `sourceTreeSha1`, `sessionId`, `worktree`, `cleanCheckout`, `scopeKind`, `referenceSheets`, `checks`, `verdict` | `scopeKind` is `phase-surfaces` or `all-surfaces`; schemaVersion is 2; role/path are unique; reviewer labels differ from QA and builder; candidate/source/scope are exact; worktree is absolute and cleanCheckout is true; checks are exactly `figma-context`, `figma-screenshot`, `mobbin-references`, `laws-check`, `interactivity-floor`, `token-gate`, `accessibility`, `responsive-viewports`, in order, each with PASS and phase-scoped evidence; verdict is PASS |
| Surface/all-surfaces QA report | all surface UX-report keys plus `browserRuns` | checks are exactly `source-quality`, `unit-integration`, `browser-e2e`, `failure-paths`, `security-boundaries`, `phase-acceptance`, in order; `browserRuns` has exactly three distinct clean-C PASS records, each binding C as `runSha`, exact unfiltered `pnpm test:e2e`, UTC start/end, clean-before/after, run ID, browser/version, viewport, fixture, zero exit, a distinct artifact path, and distinct committed artifact content SHA-256. For Phase 10 `all-surfaces`, the three records cover exactly the Chromium and WebKit projects and `browser-e2e` also binds a schema-v2 `strict-preview-runs.json` whose exact three entries equal the report's records. |
| Package UX or QA report | the surface UX-report key set, without `browserRuns` | `scopeKind` is exactly `package`; `referenceSheets` is `[]`; both roles use exactly `package-integrity`, `traceability`, `proof-boundary`, `rollback`, `bootstrap`, in order, each with PASS and committed phase-scoped evidence. Figma, Mobbin, laws, accessibility, responsive, and browser claims are forbidden because Phase 11 owns no UI surface. |
| Clean-C command report | `schemaVersion`, `program`, `phase`, `kind`, `candidateSha`, `sourceTreeSha1`, `id`, `command`, `status`, `exitCode`, `runSha`, `rangeBaseSha`, `rangeHeadSha`, `stdout`, `stderr`, `stdoutSha256`, `stderrSha256`, `worktree`, `cleanBefore`, `cleanAfter`, `startedAt`, `finishedAt` | schemaVersion is 3; id-to-command is canonical; run SHA is C; `diff-check` records exact B and C and executes `git diff --check B C --`, while both range fields are null for other commands; worktree is absolute; checkout is clean before and after; PASS agrees with zero; bounded stream contents match hashes; blob hash/path are in ledger evidence |
| Gated sheet check | `schemaVersion`, `kind`, `phase`, `sheetId`, `check`, `candidateSha`, `verdict` | path is under matching `phase-N`; sheet belongs to N in C's manifest; blob is newly added at the single direct E child of C; check/sheet/verdict are exact, preventing reuse |
| Clean-M append receipt | `id`, `command`, `status`, `exitCode`, `runSha`, `rangeBaseSha`, `rangeHeadSha`, `stdout`, `stderr`, `stdoutSha256`, `stderrSha256` | generated only by append after executing the canonical command at clean M; `diff-check` records exact B and M and executes `git diff --check B M --`, with null ranges for other commands; complete stream contents match their hashes; input JSON may not provide it |

E cannot be written inside a blob that contributes to E's own Git hash. The gate binds E without a
self-reference by requiring E to be C's single direct child, requiring the report blob to be absent at
C and present at HEAD, and then binding that exact blob hash/path and E in the external record.
After merge M and in successor phases, the sheet gate resolves the unique commit that first added each
referenced evidence artifact, proves that commit was the direct E child of the report's C, and requires
the artifact bytes to remain unchanged. A completed sheet therefore remains verifiable on descendants
without weakening the original C→E boundary or requiring evidence to be rewritten at M.

## PR and merge lifecycle

1. Verify B is the target branch tip and create one isolated `phase-N/<slug>` branch/worktree from B.
2. Implement and run focused development checks. Commit the complete implementation, tests, and
   acceptance contracts as clean C and push the branch.
3. Open one PR with B, C, source-tree/lock/manifest/full-sheet/immutable-sheet hashes, evidence paths, rollback command, and
   the phase's RC/ADR/state coverage.
4. From a clean detached worktree at exact C, run
   `python3 scripts/collect_phase_evidence.py --base "$B" --candidate "$C" --phase N`. The collector alone runs
   the fixed five command groups using an incremental 1 MiB-per-stream process-group bound, rechecks
   exact HEAD/`C:src`/clean status after the last command, stages and fsyncs the complete command-report
   directory outside the tracked checkout on the same filesystem, and atomically renames it to the
   exact phase directory. Before rename no phase directory exists; after rename the complete set exists.
   A crash after rename leaves a complete idempotent result that a retry refuses to overwrite. Run the full strict-preview browser
   suite three independent times at C with a fresh server/context each time; QA records all three run
   bindings and their committed artifacts. An interrupted, filtered, retried-in-place, or pipe-masked
   run does not count.
5. Independent UX and engineering reviewers audit separate detached clean worktrees at C. No builder
   self-signoff. Their exact checklists and browser bindings become the phase-scoped schema-v2 reports.
6. Add E only under the evidence-only rule. Its commit message carries exactly one trailer in the
   exact form `Phase-Candidate: <40-character lowercase C>` as the only line of the final genuine Git
   trailer block; subject/body lookalikes, missing, duplicate, malformed, or wrong-C values fail. Run
   `check_phase_acceptance.py`; the hosted PR-head workflow uses that same parser to detect the
   distinct E/trailer, checks out `github.event.pull_request.head.sha`, asserts exact HEAD identity,
   runs qualification against that head, and refuses merge-readiness unless C→E passes.
7. Merge with a two-parent merge commit. M's first parent is exactly B and second parent is exactly E;
   its subject includes the recorded PR number. Fetch the explicit remote-tracking target ref and require
   `refs/remotes/origin/main` to resolve exactly to M. GitHub API attestation must independently report
   the exact URL, closed+merged state, base `main` at B, head E, and merge SHA M. Squash, rebase, octopus,
   synthetic test-merge, or an unmerged feature SHA cannot be recorded as M. M's full tree must equal E's.
8. In a fresh clean worktree pinned to fetched M, first generate the raw append input without hand
   editing: `python3 scripts/program_ledger.py prepare --phase N --base "$B" --candidate "$C" --evidence "$E" --merge "$M" --pr-number "$PR" --output "$RAW_RECORD"`.
   The generator derives committed reviewer/command reports, hand-off evidence, protected objects,
   full completed E-sheet hashes, immutable C-contract hashes, PR/merge metadata, and the deterministic
   merge timestamp. Then invoke `append`; under the ledger lock it verifies
   clean HEAD, full tree, and exact target ref both before and after rerunning the five canonical commands,
   then writes the
   resulting M-bound exit codes, B→M range revisions, and stdout/stderr hashes as
   coordinator-generated `postMergeCommands`.
   Input JSON cannot supply that field or inject a command runner. The independent reviewer obligations
   and, for a UI scope, three browser runs are C-bound evidence at E; clean-M is a separate coordinator qualification and
   does not retroactively rewrite reviewer reports. Post-merge receipts live in the external record.
   Only after atomic append may M become the successor's B. The per-phase export owner named below
   runs the exact command in the new branch before implementation; it exports the accepted prefix and
   refuses any `candidatePhase` except exactly the next integer.

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
record contains program/repository, phase, B/C/E/M, exact target ref, locally and GitHub-verified PR number/merge
subject, protected-object/source-tree/lock/manifest/completed-E-sheet/immutable-C-sheet hashes, reviewer-report bindings, phase-scoped
evidence, the exact canonical clean-C command set, coordinator-generated clean-M command receipts,
timestamp, and SHA-256 of the preceding record.
The external ledger root has exactly `schemaVersion`, `program`, `repository`, and `records`. Its
persisted records reject unknown keys and distinguish raw accepted input (timestamp but no
`postMergeCommands` or chain hashes), coordinator accepted state (adds `postMergeCommands`), and
persisted state (adds `previousRecordSha256` and `recordSha256`). Pending tracked records use their own
exact smaller schema and are never accepted externally. The tracked root has exactly `schemaVersion`,
`program`, `repository`, `externalAuthority`, `candidatePhase`, `snapshotQualification`,
`snapshotThroughPhase`, and `phases`. The external ledger contains exactly one accepted record per phase in strict `0..N` order; it never
contains pending records. Each record's B must equal the prior record's M. The new worktree fetches the
target branch, checks out M, and runs
`python3 scripts/program_ledger.py bootstrap --expected-phase N --target-ref refs/remotes/origin/main`. Bootstrap
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
only that prefix. It refuses to invent an empty or unverified ledger. The successor builder for every
phase owns the deterministic `export-tracked` step before changing runtime code. It exports the
accepted prefix into the tracked lagging snapshot, advances `candidatePhase` to exactly the number of
accepted records, and preserves adjacent prior-M→next-B continuity;
`pnpm check:program-ledger` validates that snapshot offline, including its external record-hash chain,
without re-attesting GitHub or treating it as current-phase authority.

| Accepted phase | Required export owner before any next-phase implementation | Exact candidate advance |
| ---: | --- | --- |
| 0 | Phase 1 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 1 --target-ref refs/remotes/origin/main` |
| 1 | Phase 2 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 2 --target-ref refs/remotes/origin/main` |
| 2 | Phase 3 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 3 --target-ref refs/remotes/origin/main` |
| 3 | Phase 4 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 4 --target-ref refs/remotes/origin/main` |
| 4 | Phase 5 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 5 --target-ref refs/remotes/origin/main` |
| 5 | Phase 6 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 6 --target-ref refs/remotes/origin/main` |
| 6 | Phase 7 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 7 --target-ref refs/remotes/origin/main` |
| 7 | Phase 8 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 8 --target-ref refs/remotes/origin/main` |
| 8 | Phase 9 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 9 --target-ref refs/remotes/origin/main` |
| 9 | Phase 10 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 10 --target-ref refs/remotes/origin/main` |
| 10 | Phase 11 builder | `python3 scripts/program_ledger.py export-tracked --candidate-phase 11 --target-ref refs/remotes/origin/main` |
| 11 | Demo release coordinator (final lagging export; no demo successor) | `python3 scripts/program_ledger.py export-tracked --candidate-phase 12 --target-ref refs/remotes/origin/main` |

The demo stream ends after the demo adoption-package PR. A separate MaxAI production-adoption ledger,
plan, branch chain, reviewers, and PRs begin from fetched `max-ai-platform/origin/main`; a MaxAI SHA
is never represented as a descendant of a demo SHA.
