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
