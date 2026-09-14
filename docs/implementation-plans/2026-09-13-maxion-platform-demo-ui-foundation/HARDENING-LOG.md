# Hardening log — Maxion platform demo UI foundation plan

- **Plan:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Started:** 2026-09-13
- **Status:** PLAN GATE FAIL under remediation; independent convergence count restarts after revision
- **Writer:** Primary Codex planning session

## Review protocol

Each round examines the complete roadmap and every phase document against four lenses:

1. Completeness and traceability: every RC, decision, state, test, failure, rollback, and handoff is owned.
2. Correctness and architecture: contracts, dependency order, authority, trust labels, production boundary, and NFRs are internally consistent.
3. Executability: a fresh implementation session can act without guessing at files, entry criteria, commands, evidence, or pass/fail criteria.
4. Final sign-off: an independent reviewer reopens the plan if any blocker/major ambiguity remains.

All blocker and major findings are resolved in the plan, not merely acknowledged here. Minor findings may
remain only when they do not change implementation behavior or acceptance and have a named owner.

## Round register

| Round | Reviewer lens | Blockers | Majors | Minors | Disposition |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Primary fresh-eyes completeness / correctness / executability | 0 | 4 | 1 | Four majors revised; one execution-baseline minor owned by Phase 0 |
| 2 | Primary clean rerun after revision | 0 | 0 | 1 | Clean for blocker/major; baseline minor remains explicitly owned |
| 3 | Primary traceability and contradiction rerun | 0 | 0 | 1 | Second consecutive blocker/major-clean self-review |
| 4 | Independent full-plan gate | 3 | 9 | 0 | PLAN GATE FAIL; all twelve findings require author remediation; not a clean convergence round |
| C | Independent final sign-off | — | — | — | Not run; Phase 0's historical dirty-tree reports are not immutable acceptance |

## Finding register

| ID | Severity | Finding and risk | Applied change | Verification |
| --- | --- | --- | --- | --- |
| H-01 | Major | Phase 11 used an unverified `maxion/main` ref although the inspected production checkout tracks `origin/main`; execution could pin the wrong source | Replaced it with a fresh fetched `origin/main` requirement and retained the dirty-owner-checkout prohibition | Repository text scan contains no `maxion/main` |
| H-02 | Major | Phase 0 expected an inventory/Figma coverage failure before any manifest/checker owner existed, while Phase 1 also claimed it would create that authority | Phase 0 now creates the initial route→sheet→node manifest and coverage gate; Phase 1 extends that same authority with code/evidence mappings | Task and DoD review shows one owner and no circular dependency |
| H-03 | Major | Verification and visual parity lacked executable commands, browser matrix ownership, and numeric tolerance | Added standard commands, candidate/evidence identity requirements, 2 px/1 px/1.5% visual tolerances, and explicit WebKit registration in Phase 10 | Structural scan and roadmap review pass |
| H-04 | Major | The user's sidebar requirement was described semantically but not measurable, allowing administrative destinations to drift into the primary module cluster | Added exact seven/five destinations, 44/36 px rows, 20–24 px primary icons, ≤50% product-cluster height, ≥24 px flexible spacer, and mobile/focus checks | Phase 0, program laws table, and Phase 9 agree |
| H-05 | Minor | The initial full Vitest command stopped producing progress for more than two minutes while the platform-page suite was active and was interrupted; it was not valid pass evidence | Recorded it in roadmap grounding, reran it without truncating or piping its exit status, and retained the slow-suite observation as Phase 1 performance debt | Post-audit `pnpm test` passes 3 files and 38 active-runtime tests in 370.97 seconds; no pass is inferred from the interrupted run |
| H-06 | Blocker | Default Knip treated a component imported only by its own unit test as reachable, allowing the manifest to falsely name a dead Agentix predecessor as runtime owner | Deleted the predecessor closure, remapped the run canvas to `DeployedAgentsPage` → `RunDetail`, added production-mode Knip classification, production-entry reachability validation, and two regression tests | Program gate and production-source gate passed with the then-current discovered self-test suite and full unit/browser suites |
| H-07 | Blocker | Mobile navigation did not receive or contain focus, ignored Escape, and left the obscured stage interactive | Added modal semantics, stage inertness, Tab/Shift+Tab containment, Escape dismissal, opener restoration, and a real 375 px browser regression | Independent UX rerun passes at 375/768/1280/1536 with zero WCAG A/AA Axe findings; full 45-test browser suite passes |
| H-08 | Blocker | Phase 0 reports were not bound to the merged implementation SHA | Status corrected to open; PR #2 retained as historical lineage; superseding hardening C/E/final M and evidence-only protocol made mandatory | Clean-C and clean-M independent reruns remain required before Phase 1 |
| H-09 | Blocker | Phase 1 rollback required a predecessor runtime forbidden by its DoD | Removed dual-runtime flag; rollback is a reviewed revert PR with one runtime owner | Phase 1 text/DoD scan |
| H-10 | Blocker | Routes, addressable states, styles, timers, suppressions, and legacy aliases lacked executable ownership | Added manifest schema v2 and executable checks with explicit alias/stale-selector debt expiring in Phase 1 | Negative self-tests and coverage gate |
| H-11 | Major | Phase docs omitted the required PR/merge lifecycle | Added binding B/C/E/M protocol and explicit lifecycle to every phase | Structural phase-doc scan |
| H-12 | Major | Ignored `.impl-cadence/` state could not cross worktrees | Added tracked summary plus atomic locked hash-chained external ledger contract | Protocol and ledger parse |
| H-13 | Major | Phase prose contradicted sheets' Mobbin references | Made sheet §2 the sole authority and removed alternate app lists; corrected Obvious label | Duplicate declaration scan |
| H-14 | Major | Generic control matrices did not trace domain states | Added keyed semantic matrices to all sheets and exact manifest/phase equality | Sheet and coverage negative tests |
| H-15 | Major | Figma schema lacked component/frame ownership, hashes, evidence, and verification | Implemented schema v2 with explicit frame-level ownership when component IDs are unattested | Schema-v2 coverage gate |
| H-16 | Major | Phase 9 allowed 32 px administrative rows | Locked 36 px rows and 16 px icons at all required viewports | Phase 9/program-law scan |
| H-17 | Major | MaxAI work could not descend from the demo merge chain | Scoped Phase 11 to demo adoption package; separate MaxAI plan/ledger/PR stream required | Phase map and Phase 11 |
| H-18 | Major | Phase docs lacked concrete file/output/command/evidence ownership | Added a phase execution table to every remaining phase | Structural phase-doc scan |
| H-19 | Major | Phase 1 bundle budget had an unowned waiver | Made 250 kB JS / 60 kB CSS a hard merge gate; rebaseline needs prior roadmap-amendment PR | Phase 1 scan |
| H-20 | Blocker | The first ledger remediation still permitted duplicate phase numbers and pending records in the external authority | External records are accepted-only, exactly ordered `0..N`, chained by prior M→next B, serialized under one lock, and successor bootstrap binds clean HEAD plus target ref to the latest M | Concurrent duplicate, skipped-phase, pending-record, base-continuity, and bootstrap negative tests |
| H-21 | Blocker | The first hosted run asked `setup-node` to initialize pnpm caching before pnpm existed on PATH, so CI stopped before installation | Removed the order-dependent setup-node cache input; pinned Node is installed first and pinned pnpm is activated explicitly next | Hosted PR check must pass from the revised clean candidate |
| H-22 | Blocker | The second hosted run used a shallow checkout that omitted the manifest's pinned source commit, so provenance validation correctly stopped | Set the pinned checkout action to `fetch-depth: 0`; source-commit ancestry and tree equality now run against complete repository history | Hosted PR check must pass from the revised clean candidate |
| H-23 | Blocker | The external ledger accepted invented command prose, arbitrary evidence files, unbound reviewer strings, fictional PR numbers, and an unmerged SHA represented as M | Bound the exact five-command set to phase-scoped committed JSON reports with complete stdout/stderr content hashes; append rejects supplied post-merge receipts and executes the same fixed commands at clean M; bound distinct reviewers to committed role reports; require local Git objects to prove the two-parent B+E merge, PR-number subject, protected object equality, and exact fetched target ref | Fake command/README/reviewer/PR/unmerged-M and protected-tree break-it tests |
| H-24 | Blocker | The tracked file tried to describe current-phase C/E/M that cannot be known inside C or E | Made the external ledger the sole current-phase authority; tracked state is an explicitly lagging accepted-record export plus `candidatePhase`, and adjacent exported phases must chain prior M to next B | Tracked snapshot and adjacent-chain negative tests |
| H-25 | Blocker | C→E validation allowed unrelated changes and could lose or invent the phase document | Discover the phase document and owned sheets from C, reject all nonallowlisted paths and all add/delete/rename/copy operations outside phase artifacts, compare immutable projections, and require one machine-bound UX plus QA report and structured hand-off transition | Unrelated-52-path, add/delete/rename, report-reuse, immutable-contract and hand-off break-it tests |
| H-26 | Blocker | Sheet evidence accepted absolute host files such as `/etc/passwd` | Require safe repository-relative POSIX paths under `artifacts/ux-audits/phase-N/`; gated artifacts are regular committed JSON files binding sheet/check/C/E/verdict | Absolute/traversal/symlink/missing/reused report negative tests |
| H-27 | Blocker | Phase/debt deadlines followed the latest accepted predecessor, letting Phase 1 and Phase 10 inherit waivers | Select the candidate phase explicitly from CLI, CI environment, or tracked `candidatePhase`, reject selector disagreement, and apply hard Phase 1/10 limits independently of snapshot lag | Phase-1 stale-selector and bundle tests; Phase-10 raw-colour-zero test |
| H-28 | Blocker | Dashboard links briefly measured 4.41:1 because entrance opacity blended text with white | Removed ancestor opacity animation and retained transform-only entrance motion; added immediate repeated contrast sampling during the entrance interval | Twelve-sample entrance axe regression plus full browser run |
| H-29 | Major | Sidebar inverse secondary text used `#657270`/`#687573`, which lacked safe contrast on the rail gradient | Added the semantic `--mxp-text-inverse-subtle` token with contrast headroom and migrated both sidebar owners | Computed-token assertion and repeated axe samples |
| H-30 | Major | Hosted PR checks could qualify GitHub's synthetic merge SHA instead of the reviewed PR head | Checkout `github.event.pull_request.head.sha`, assert it through `EXPECTED_SHA`, load the explicit candidate phase, and run semantic C→E when independent reports appear | Workflow source assertion and hosted PR-head run |
| H-31 | Major | Route prose treated `/agentix-prototype` as both canonical run authority and a temporary alias | Defined one canonical URL grammar/codec table; Phase 0 classifies the old routes as aliases and Phase 1 deletes them while adding responsibility/case-addressed URLs | Canonical/alias classification negative tests and route-codec round trip |
| H-32 | Major | Cold tasks allowed temporary adapters and predecessor owners to survive the shared-kernel gate | Bound final files/symbols and a task-local migration/deletion table; adapters, callers, tests, exports, keys, routes, styles, and suppressions must disappear in the same task and before C | Source-quality/import/route ownership gates |
| H-33 | Major | Agentix human-owned steps omitted deterministic deadline, time-zone, overdue, and escalation semantics | Added `HumanStep`, IANA display-zone, UTC due instant, injected Clock, derived overdue state, ordered idempotent escalation and DST/boundary tests to Phases 6–7 | Fixed-clock unit/integration/browser tests |
| H-34 | Major | Ledger recovery promised reconstruction without preserving corrupt bytes or proving a valid prefix | Implemented locked recovery that preserves the corrupt tail verbatim, validates the longest checksum-valid accepted prefix, atomically restores it, and refuses an invented empty ledger | Corrupt-tail preservation and no-valid-prefix tests |
| H-35 | Major | Parent traceability task ranges could silently disagree with phase documents | Corrected Phase 0/1/11 ranges and made the plan gate derive and compare every phase's first/last ordered task | Parent-range break-it test |
| H-36 | Major | Browser qualification could cite one lucky run or a filtered retry | Require three complete independent strict-preview runs on clean C and clean M, each with fresh context and its own result metadata; interrupted, filtered, retried-in-place, or pipe-masked runs do not count | Three-run evidence review and Phase 10 repetition gate |

Round 4's Figma review reopened all thirteen mapped frame nodes in file
`UhLxGyXphdHHNLGMomBq6n` and confirmed the recorded 1440 × 900 frame identities. It did not enumerate
independent component node IDs. Manifest schema v2 therefore records explicit frame-level ownership
with an empty component-node set; no component-level attestation is inferred.

Structural review found 12 phase documents, 18 registered requirements, 18 uniquely mapped requirements,
and thirteen exact accessible Figma nodes in the editable program file. The placeholder/stale-ref scan is
clean. The pinned CI and each candidate review run the dynamically discovered gate self-test suite;
counts are recorded with the tested SHA rather than copied into this plan. The program also gates thirteen
reference sheets, the 1,357-literal raw-colour ratchet, strict TypeScript, ESLint, default Knip, and
production-source Knip. The
production build passes but confirms existing debt at 387.56 kB gzip JS and 85.90 kB gzip CSS against the
Phase 1 targets of 250/60 kB.

## Convergence rule

The plan is hardened only after two consecutive independent rounds report zero blocker and zero major
findings, followed by an independent final sign-off. The maximum is five revision rounds. This session
completed self-review rounds that the failed independent Round 4 supersedes. The independent clean-round
count is zero. Two new consecutive independent rounds plus Reviewer C are required; until then this is
a `PLAN GATE remediation candidate`, never `independently hardened`.
