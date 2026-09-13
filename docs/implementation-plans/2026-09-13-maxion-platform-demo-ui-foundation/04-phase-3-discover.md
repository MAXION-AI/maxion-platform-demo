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

This is a **product** surface. The binding Jakob references are Fireflies, Grain, Otter, Emergent,
Perplexity, and Elicit. The sheet's complete laws-check and state matrix apply. Discover must expose no
more than four regions, acknowledge input within 400 ms, keep the composer available in every active
state, preserve valid drafts, and place the next unresolved gap ahead of secondary evidence controls.

## Architecture, scale, security, and reliability

`DiscoveryAutonomousPrototypePage.tsx` becomes a composition root over typed interview, transcript,
evidence, fact, decision, gap, and package selectors. Module code may not read or write browser storage
directly. Transcript/evidence lists are bounded and virtualized beyond 100 entries; a 10,000-item fixture
must keep mounted rows at 200 or fewer and interactive filtering p95 below 100 ms. Imported text is
untrusted, length-bounded, rendered as text, and never treated as an authority grant. Invalid persisted
records are isolated with recovery rather than silently discarded. Provider loss is represented as a
degraded state with retry and manual continuation, never as a fabricated successful interview.

## Ordered tasks

1. **Characterize and model Discover (3.1).** Freeze current happy/unhappy behavior, then define typed events and invariants for interview turns, transcript entries, evidence, facts, decisions, gaps, and package readiness.
2. **Extract domain ownership (3.2).** Move persistence and transition logic out of `DiscoveryAutonomousPrototypePage.tsx` into pure reducers/selectors and the shared repository port.
3. **Implement the accepted composition (3.3).** Build the frame's conversation workspace, evidence/fact rail, progress model, persistent composer, and shared loading/empty/error primitives without one-off tokens.
4. **Complete the state matrix (3.4).** Implement new, active, paused, awaiting-answer, insufficient-evidence, offline/degraded, recoverable-error, complete, and read-only states in place.
5. **Bind the Plan handoff (3.5).** Emit one versioned `DiscoveryPackageRef` with project, provenance, unresolved gaps, authority, and evidence class; never infer readiness from a completion badge.
6. **Break it at scale and at trust boundaries (3.6).** Test hostile paste, oversized transcript, duplicate/out-of-order turns, corrupt persistence, refresh/resume, provider timeout, permission denial, and the 10,000-item fixture.
7. **Attach evidence and gate (3.7).** Capture 375/768/1280/1536 views, Figma comparison, keyboard/axe/reduced-motion results, timing, state-matrix journeys, and separate verifier/QA sign-offs.

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

Rollback reverts the Phase 3 candidate commit and repository migration while retaining the Phase 2
kernel. The migration must remain backward-readable until the next accepted release.

## Definition of Done

- [ ] Every Discover state is actionable in place and the static-report test fails nowhere.
- [ ] The handoff package has typed provenance, authority, unresolved-gap, and evidence-class fields.
- [ ] Unit, integration, browser, state-matrix, responsive, keyboard, axe, reduced-motion, load-shaped, token, sheet, and build gates pass.
- [ ] The sheet contains evidence plus distinct verifier and QA sign-offs with no blocker/major finding.

## Hand-off

Phase 4 starts from the accepted Phase 3 SHA and consumes only the versioned discovery package, never
Discover component internals or visual completion state.
