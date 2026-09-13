# Phase 4: Plan workspace

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-08 | **Risk:** high × medium | **Status:** Not started
- **Depends on:** Phase 3 accepted SHA

## Objective and scope

Make Plan an artifact-first workspace: the plan itself dominates, source and AI provenance remain
inspectable, every section can be edited or regenerated, material decisions require explicit approval,
and an approved version becomes the only valid Execute input. This phase refactors `PlanAgenticModule.tsx`
and its domain seams; it does not add autonomous publishing or production execution.

## Entry criteria and UX contract

- [ ] Phase 3 DoD rerun passes and a versioned `DiscoveryPackageRef` fixture exists.
- [ ] `docs/operations/ux-reference-sheets/plan-workspace.md` is independently accepted.
- [ ] Figma frame `UhLxGyXphdHHNLGMomBq6n:19:86` is frozen in the mapping manifest and fetched before code.

This is a **product** surface. Binding references are Obvious, Langdock, Craft, ClickUp Brain, Upwork,
Descript, and Cofounder. The reference sheet's full laws table and state matrix apply. The artifact is
the dominant region; one version-level primary action is allowed; edit/regenerate targets are at least
44 px; all long operations acknowledge within 400 ms and expose progress after one second.

## Architecture, scale, security, and reliability

Split `PlanAgenticModule.tsx` into a typed plan domain, selectors, command handlers, and presentational
sections. A plan version is immutable after approval; edits fork a new draft. Generated and human-authored
content retain distinct provenance without using colour alone. A 1,000-section stress fixture must render
no more than 200 mounted section rows and preserve edit/search p95 below 100 ms. Imported discovery text
is untrusted and escaped. Approval and revert events identify actor role, object, version, consequence,
and synthetic correlation ID; the client never grants authority.

## Ordered tasks

1. **Model plan authority and versions (4.1).** Define plan artifact, section, source, revision, approval, and Execute-handoff invariants with characterization tests.
2. **Decompose the module (4.2).** Extract reducers/selectors/commands and split the monolith into artifact canvas, outline, provenance, review, and command surfaces.
3. **Implement the accepted artifact composition (4.3).** Match the exact frame with shared primitives, responsive reflow, skeletons, and a persistent contextual composer.
4. **Make every shown state operable (4.4).** Support section edit, regenerate, accept/reject, comment, compare, undo/revert, gap resolution, and keyboard navigation without dead ends.
5. **Bind source integrity and Execute readiness (4.5).** Preserve Discovery evidence links and L2/L3/L4 artifact lineage; emit an immutable approved `PlanArtifactRef` only when explicit gates pass.
6. **Break versioning and recovery (4.6).** Test concurrent-looking edits, stale approvals, duplicate commands, corrupt drafts, oversized content, interrupted regeneration, permission denial, and reload.
7. **Attach evidence and gate (4.7).** Record exact-node comparison, all state journeys, 375/768/1280/1536 captures, axe, keyboard, motion, timing, and independent verifier/QA results.

## Contracts and observability

Add `PlanArtifact`, `PlanSection`, `PlanRevision`, `PlanSourceRef`, `PlanApproval`, and `PlanArtifactRef`.
Each mutation includes an idempotency key inside the deterministic command layer so replay cannot create
duplicate versions. Structured synthetic events contain object/version IDs and timings, not artifact
body text. No server/API/schema or dependency is expected.

## Test and failure plan

Unit tests cover version immutability, stale commands, source retention, readiness, revert, ordering,
schema migration, and duplicate idempotency keys. Integration tests cover Discovery-package ingestion and
repository reload. Playwright covers edit→compare→approve→handoff, amend/reject, generation failure,
permission denial, refresh recovery, keyboard use, and responsive layouts.

| Failure | Required fallback |
| --- | --- |
| Generation fails or times out | Keep the prior section and draft; offer retry without duplicate revision |
| Approval targets a stale version | Block it, identify the current version, and preserve the review note |
| Source evidence is missing | Mark the section ungrounded and block approved handoff |
| Artifact is too large for direct rendering | Virtualize/chunk while preserving find and keyboard order |

Rollback reverts the Phase 4 candidate while keeping Phase 3 packages readable. No accepted plan version
may be deleted by rollback.

## Definition of Done

- [ ] Every declared Plan state and control works in context, including recovery and revert.
- [ ] Approved Execute handoff is immutable, evidence-linked, authority-bound, and cannot be produced from a stale draft.
- [ ] Unit, integration, browser, responsive, accessibility, timing, load-shaped, token, sheet, and build gates pass.
- [ ] Evidence and distinct verifier/QA sign-offs close the sheet with no blocker/major finding.

## Hand-off

Phase 5 begins from the accepted Phase 4 SHA and receives an approved `PlanArtifactRef`; it may not read
mutable Plan state or infer approval from route access.
