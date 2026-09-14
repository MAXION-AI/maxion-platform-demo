# Phase 3: Discover workspace

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-07 | **Risk:** high × medium | **Status:** Not started
- **Depends on:** Phase 2 accepted SHA

## Objective and scope

Turn Discover into one evidence-bound workspace where an operator can conduct or resume an interview,
inspect the transcript, promote evidence into facts and decisions, resolve gaps, and hand an explicit
discovery package to Plan. The phase changes Discover domain state, composition, recovery, responsive
behavior, and tests; it does not alter a backend, call a live provider, or claim that synthetic evidence
was externally verified.

## Entry criteria and UX contract

- [ ] Phase 2 DoD rerun passes from its accepted SHA.
- [ ] `docs/operations/ux-reference-sheets/discover-workspace.md` is independently accepted.
- [ ] Figma frame `UhLxGyXphdHHNLGMomBq6n:18:45` and its component references are frozen in the mapping manifest.
- [ ] The executor fetches the exact-node design context and screenshot before changing code.

This is a **product** surface. The reference sheet §2 is the sole binding Mobbin authority; phase
prose must not declare a second app set. The sheet's complete laws-check and state matrices apply. Discover must expose no
more than four regions, acknowledge input within 400 ms, keep the composer available in every active
state, preserve valid drafts, and place the next unresolved gap ahead of secondary evidence controls.

- **Required surface state IDs (`discover-workspace`):** `discover.new`, `discover.active`, `discover.paused`, `discover.awaiting-answer`, `discover.insufficient-evidence`, `discover.degraded`, `discover.recoverable-error`, `discover.complete`, `discover.read-only`

## Architecture, scale, security, and reliability

`DiscoveryAutonomousPrototypePage.tsx` becomes a composition root over folder-owned
`src/features/discovery-autonomous/domain/` interview, transcript,
evidence, fact, decision, gap, and package selectors. Module code may not read or write browser storage
directly. Transcript/evidence lists are bounded and virtualized beyond 100 entries; a 10,000-item fixture
must keep mounted rows at 200 or fewer and interactive filtering p95 below 100 ms. Imported text is
untrusted, length-bounded, rendered as text, and never treated as an authority grant. Invalid persisted
records are isolated with recovery rather than silently discarded. Provider loss is represented as a
degraded state with retry and manual continuation, never as a fabricated successful interview.

## Ordered tasks

1. **Characterize and model Discover (3.1).** Freeze current happy/unhappy behavior, then define typed events and invariants for interview turns, transcript entries, evidence, facts, decisions, gaps, and package readiness.
2. **Extract domain ownership (3.2).** Move persistence and transition logic out of
   `DiscoveryAutonomousPrototypePage.tsx` into `domain/discoveryState.ts` pure reducers/selectors and
   `domain/discoveryRepository.ts`; after those production-reachable files exist, update the
   `discover-workspace` manifest `implementation.owners` and `stateBinding.sourceOwner` in the same
   task. Domain state/repository/handoff files may not be placed directly at the feature root;
   `src/features/discovery-autonomous/domain/` is the canonical folder.
3. **Implement the accepted composition (3.3).** Build the frame's conversation workspace, evidence/fact rail, progress model, persistent composer, and shared loading/empty/error primitives without one-off tokens.
4. **Complete the state matrices (3.4).** Implement the exact stable IDs above plus every control interaction state in sheet §5; no prose-only synonym counts as coverage.
5. **Bind the Plan handoff (3.5).** Emit one versioned `DiscoveryPackageRef` with project, provenance, unresolved gaps, authority, and evidence class; never infer readiness from a completion badge.
6. **Break it at scale and at trust boundaries (3.6).** Test hostile paste, oversized transcript, duplicate/out-of-order turns, corrupt persistence, refresh/resume, provider timeout, permission denial, and the 10,000-item fixture.
7. **Attach evidence and gate (3.7).** Capture 375/768/1280/1536 views, Figma comparison, keyboard/axe/reduced-motion results, timing, state-matrix journeys, and separate verifier/QA sign-offs.

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 3.1 | RC-07 and RC-14 via ADR-3 | `src/features/discovery-autonomous/domain/discoveryState.ts#DiscoveryState`; `src/features/discovery-autonomous/domain/discoveryState.spec.ts#invariants` | Accepted Phase 2 M and project identity contract | `pnpm test -- src/features/discovery-autonomous/domain/discoveryState.spec.ts` |
| 3.2 | RC-04 and RC-07 via ADR-3 | `src/features/discovery-autonomous/domain/discoveryState.ts#reduceDiscovery`; `src/features/discovery-autonomous/domain/discoveryRepository.ts#DiscoveryRepository`; `src/features/discovery-autonomous/DiscoveryAutonomousPrototypePage.tsx#DiscoveryAutonomousPrototypePage`; `docs/operations/figma-code-map.json#surfaces[discover-workspace].implementation.owners`; `docs/operations/figma-code-map.json#surfaces[discover-workspace].stateBinding.sourceOwner` | Task 3.1 characterization and invariants | `pnpm test -- src/features/discovery-autonomous/domain/discoveryState.spec.ts src/features/discovery-autonomous/domain/discoveryRepository.spec.ts` |
| 3.3 | RC-07 and RC-15 via ADR-4 | `src/features/discovery-autonomous/DiscoveryAutonomousPrototypePage.tsx#DiscoveryWorkspace`; `src/features/discovery-autonomous/frontier.css#discovery-workspace` | Task 3.2 selector-driven ownership | `pnpm exec playwright test tests/e2e/discovery-autonomous.spec.ts -g composition` |
| 3.4 | RC-07 and RC-15 via ADR-2 | `docs/operations/ux-reference-sheets/discover-workspace.md#5.1`; `tests/e2e/discovery-autonomous.spec.ts#discover.new` | Task 3.3 accepted composition | `pnpm exec playwright test tests/e2e/discovery-autonomous.spec.ts -g states` |
| 3.5 | RC-07 and RC-14 via ADR-3 | `src/features/platform-prototype/contracts.ts#DiscoveryPackageRef`; `src/features/discovery-autonomous/domain/discoveryState.ts#selectDiscoveryPackage`; `src/features/discovery-autonomous/domain/discoveryHandoff.spec.ts#package-provenance` | Task 3.4 exact state coverage | `pnpm test -- src/features/discovery-autonomous/domain/discoveryHandoff.spec.ts` |
| 3.6 | RC-15 and RC-18 via ADR-4 | `src/features/discovery-autonomous/domain/discoveryState.spec.ts#break-it`; `src/features/discovery-autonomous/domain/discoveryRepository.spec.ts#recovery`; `tests/fixtures/discovery-10000.json#items` | Task 3.5 versioned package contract | `pnpm test -- src/features/discovery-autonomous/domain/discoveryState.spec.ts -t break-it` |
| 3.7 | RC-15 and RC-16 via ADR-8 | `artifacts/ux-audits/phase-3/verification.md`; `docs/operations/phase-acceptance-protocol.md#Evidence-only-closure` | Tasks 3.1 through 3.6 green at C | `python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase 3` |

## Contracts and observability

Add `DiscoverySession`, `TranscriptEntry`, `EvidenceRef`, `DiscoveryFact`, `DecisionRequest`,
`DiscoveryGap`, and `DiscoveryPackageRef` to the versioned demo contract. Every significant transition
records a synthetic correlation ID, event type, object reference, and evidence class without message
content or PII. No server/API/schema or new package is expected.

## Test and failure plan

Unit tests cover reducer invariants, deduplication, ordering, readiness, migration, corrupt input, and
package provenance. Integration tests cover repository reload and project-scoped isolation. Playwright
covers ask/answer, resolve-gap, pause/resume, reload, package creation, keyboard-only use, mobile layout,
and graceful provider loss. Axe must report zero serious/critical violations; input acknowledgement must
remain under 400 ms under the phase throttle profile.

| Failure | Required fallback |
| --- | --- |
| Transcript or evidence record is invalid | Quarantine only that record, explain recovery, preserve the rest |
| Provider becomes unavailable | Preserve the draft and current evidence; expose retry and manual continuation |
| Package readiness changes during review | Recompute from canonical selectors and identify the blocking gap |
| Figma fidelity conflicts with keyboard or contrast requirements | Accessibility wins; record the measured variance in the sheet |

Rerun the Phase 1 copy-on-write suite for the Discover slice, including upgrade, downgrade, future-schema
preservation, crash-before-swap, quota, competing-writer, and rollback-pointer cases.

Rollback reverts the Phase 3 candidate commit and repository migration while retaining the Phase 2
kernel. The migration must remain backward-readable until the next accepted release.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Production | Refactor `src/features/discovery-autonomous/DiscoveryAutonomousPrototypePage.tsx`; create `src/features/discovery-autonomous/domain/discoveryState.ts` and `src/features/discovery-autonomous/domain/discoveryRepository.ts`; update `docs/operations/figma-code-map.json` implementation/state owners to those exact production-reachable symbols; migrate/delete direct storage, timers, stale selectors/styles | One canonical Discover state/repository/view owner under `domain/`; zero feature-root domain alternative |
| Tests/fixtures | `src/features/discovery-autonomous/domain/discoveryState.spec.ts`; `src/features/discovery-autonomous/domain/discoveryRepository.spec.ts`; `src/features/discovery-autonomous/domain/discoveryHandoff.spec.ts`; existing Discovery Playwright specs; hostile/corrupt/offline and 10,000-entry fixtures | Exact nine state IDs, package handoff, reload/isolation, ≤200 rows |
| Evidence/commands | `artifacts/ux-audits/phase-3/**`; Discover sheet; standard program/test/build/E2E/audit/diff commands plus focused Discovery specs | State/viewport/Figma/axe/timing evidence and independent reports |
| PR lifecycle | Verify prior M as B; create isolated phase branch/worktree; commit clean C; independent UX/QA audit C; commit required distinct evidence-only E; merge only as a true B+E two-parent M; rerun clean-M gates; append under lock to the external authority | PR URL, B/C/E/M, protected-object equality, exact target ref, merge/PR identity, post-merge results, successor pin |

## Definition of Done

- [ ] Every Discover state is actionable in place and the static-report test fails nowhere.
- [ ] The handoff package has typed provenance, authority, unresolved-gap, and evidence-class fields.
- [ ] Unit, integration, browser, state-matrix, responsive, keyboard, axe, reduced-motion, load-shaped, token, sheet, and build gates pass.
- [ ] The sheet contains evidence plus distinct verifier and QA sign-offs with no blocker/major finding.

## Hand-off

Phase 4 starts from the accepted Phase 3 SHA and consumes only the versioned discovery package, never
Discover component internals or visual completion state.

### Structured acceptance hand-off

```json
{"schemaVersion":1,"phase":3,"nextPhase":4,"status":"pending","evidence":[],"reviewers":{"ux":"pending","qa":"pending"}}
```
