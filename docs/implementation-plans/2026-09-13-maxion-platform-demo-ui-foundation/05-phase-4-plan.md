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

This is a **product** surface. The reference sheet §2 is the sole binding Mobbin authority; phase
prose must not declare a second app set. The reference sheet's full laws table and state matrices apply. The artifact is
the dominant region; one version-level primary action is allowed; edit/regenerate targets are at least
44 px; all long operations acknowledge within 400 ms and expose progress after one second.

- **Required surface state IDs (`plan-workspace`):** `plan.draft`, `plan.section-editing`, `plan.regenerating`, `plan.approval-required`, `plan.stale-review`, `plan.approved`, `plan.generation-error`, `plan.read-only`

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

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 4.1 | RC-08 and RC-14 via ADR-3 | `src/features/platform-prototype/plan/domain.ts#PlanArtifact`; `src/features/platform-prototype/plan/domain.spec.ts#authority` | Accepted Phase 3 M and DiscoveryPackageRef | `pnpm test -- plan/domain.spec.ts` |
| 4.2 | RC-04 and RC-08 via ADR-3 | `src/features/platform-prototype/plan/PlanModule.tsx#PlanModule`; `src/features/platform-prototype/plan/domain.ts#reducePlan` | Task 4.1 authority invariants | `pnpm test -- plan/PlanModule.spec.tsx` |
| 4.3 | RC-08 and RC-15 via ADR-4 | `src/features/platform-prototype/plan/components/ArtifactCanvas.tsx#ArtifactCanvas`; `src/features/platform-prototype/plan/plan.css#plan-workspace` | Task 4.2 decomposed regions | `pnpm exec playwright test tests/e2e/maxion-platform-shell.spec.ts -g Plan` |
| 4.4 | RC-08 and RC-15 via ADR-2 | `src/features/platform-prototype/plan/commands.ts#applyPlanCommand`; `tests/e2e/maxion-platform-shell.spec.ts#plan.section-editing` | Task 4.3 accepted composition | `pnpm exec playwright test tests/e2e/maxion-platform-shell.spec.ts -g plan-state` |
| 4.5 | RC-08 and RC-14 via ADR-5 | `src/features/platform-prototype/contracts.ts#PlanArtifactRef`; `src/features/platform-prototype/plan/selectors.ts#selectExecuteReadyPlan` | Task 4.4 operable states | `pnpm test -- plan/handoff.spec.ts` |
| 4.6 | RC-15 via ADR-3 | `src/features/platform-prototype/plan/domain.spec.ts#recovery`; `tests/fixtures/plan-oversized.json#sections` | Task 4.5 immutable handoff | `pnpm test -- plan/domain.spec.ts -t recovery` |
| 4.7 | RC-15 and RC-16 via ADR-8 | `artifacts/ux-audits/phase-4/verification.md`; `docs/operations/phase-acceptance-protocol.md#Evidence-only-closure` | Tasks 4.1 through 4.6 green at C | `python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase 4` |

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

Rerun the Phase 1 copy-on-write suite for Plan drafts and revisions, including upgrade, downgrade,
future-schema preservation, crash-before-swap, quota, competing-writer, and rollback-pointer cases.

Rollback reverts the Phase 4 candidate while keeping Phase 3 packages readable. No accepted plan version
may be deleted by rollback.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Production | Create `src/features/platform-prototype/plan/{PlanModule,domain,selectors,commands}.ts{x,}`, `plan/components/**`, and `plan/plan.css`; replace `PlanAgenticModule.tsx` with the folder entry export and delete replaced Plan state/styles/exports | One folder-owned Plan owner; immutable approved artifact handoff |
| Tests/fixtures | Co-located version/command tests; Plan browser spec; stale/failed/permission/1,000-section fixtures | Exact eight state IDs; no duplicate revision; ≤200 mounted sections |
| Evidence/commands | `artifacts/ux-audits/phase-4/**`; Plan sheet; standard program/test/build/E2E/audit/diff commands plus focused Plan specs | State/viewport/Figma/axe/timing evidence and independent reports |
| PR lifecycle | Verify prior M as B; create isolated phase branch/worktree; commit clean C; independent UX/QA audit C; commit required distinct evidence-only E; merge only as a true B+E two-parent M; rerun clean-M gates; append under lock to the external authority | PR URL, B/C/E/M, protected-object equality, exact target ref, merge/PR identity, post-merge results, successor pin |

## Definition of Done

- [ ] Every declared Plan state and control works in context, including recovery and revert.
- [ ] Approved Execute handoff is immutable, evidence-linked, authority-bound, and cannot be produced from a stale draft.
- [ ] Unit, integration, browser, responsive, accessibility, timing, load-shaped, token, sheet, and build gates pass.
- [ ] Evidence and distinct verifier/QA sign-offs close the sheet with no blocker/major finding.

## Hand-off

Phase 5 begins from the accepted Phase 4 SHA and receives an approved `PlanArtifactRef`; it may not read
mutable Plan state or infer approval from route access.

### Structured acceptance hand-off

```json
{"schemaVersion":1,"phase":4,"nextPhase":5,"status":"pending","evidence":[],"reviewers":{"ux":"pending","qa":"pending"}}
```
