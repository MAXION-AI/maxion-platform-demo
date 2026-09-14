# Phase 8: Consult Max and cross-module continuity

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-12, RC-14 | **Risk:** high × high | **Status:** Not started
- **Depends on:** Phase 7 accepted SHA

## Objective and scope

Make Consult Max a grounded question-and-routing surface, then prove that project, evidence, versions,
decisions, authority, and produced objects remain coherent across Discover → Plan → Execute → Agentix →
Consult. Consult can answer, cite, compare, and deep-link; it may propose an action but may not start,
approve, stop, publish, or otherwise mutate module work implicitly.

## Entry criteria and UX contract

- [ ] Phase 7 DoD rerun passes and representative objects exist for every upstream module.
- [ ] `docs/operations/ux-reference-sheets/consult-max-workspace.md` is independently accepted.
- [ ] Figma frame `UhLxGyXphdHHNLGMomBq6n:22:225` is frozen and fetched before code.

This is a **product** surface. The reference sheet §2 is the sole binding Mobbin authority; phase
prose must not declare a second app set. The sheet's complete laws-check and state matrices apply. The composer is persistent, sources remain
inspectable, one best next action is highlighted, all input acknowledges under 400 ms, and an answer
with insufficient grounding says so and provides a recovery path instead of manufacturing certainty.

- **Required surface state IDs (`consult-max-workspace`):** `consult.empty`, `consult.asking`, `consult.streaming`, `consult.grounded`, `consult.conflicting-source`, `consult.insufficient-source`, `consult.stale-source`, `consult.error`, `consult.permission-denied`

## Architecture, scale, security, and reliability

Extract `ConsultModule` from `MaxionPlatformPrototypePage.tsx` and bind it to read-only typed object and
evidence selectors plus explicit route intents. Conversation state is project/tenant-scoped and bounded;
10,000 logical source records must be searchable with p95 under 100 ms and at most 200 mounted results.
Sources are untrusted display content. Deep links validate the target project and object; mutation routes
require their owning module and authority boundary. Missing or stale evidence produces an honest partial
answer, never a fabricated citation.

## Ordered tasks

1. **Model Consult and continuity invariants (8.1).** Define question, answer, citation, source status, route proposal, and cross-module provenance/authority invariants.
2. **Extract Consult ownership (8.2).** Move shell-local conversation behavior into typed selectors/commands and a read-only object/evidence index.
3. **Implement the accepted frame (8.3).** Build the conversational workspace, source rail, grounded-answer states, command/composer behavior, responsive layout, and shared recovery primitives.
4. **Complete Consult states (8.4).** Implement empty, asking, streaming/simulated-progress, grounded, conflicting-source, insufficient-source, stale-source, error, and permission-denied states with actions.
5. **Prove end-to-end continuity (8.5).** Run Discover package→Plan version→Execute result→Agentix responsibility/run→Consult answer/deep-link and verify IDs, versions, evidence class, environment, authority, and return context at each seam.
6. **Break grounding and isolation (8.6).** Test prompt injection-shaped text, invalid/deleted source, conflicting versions, stale links, cross-project IDs, oversized questions, refresh, duplicate commands, and 10,000 sources.
7. **Attach evidence and gate (8.7).** Record exact-frame comparison, full continuity trace, all states at 375/768/1280/1536, accessibility/timing/load proof, and independent verifier/QA sign-offs.

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 8.1 | RC-12 and RC-14 via ADR-3 | `src/features/platform-prototype/consultState.ts#ConsultState`; `src/features/platform-prototype/consultState.spec.ts#grounding` | Accepted Phase 7 M and AgentixRunResultRef | `pnpm test -- consultState.spec.ts` |
| 8.2 | RC-04 and RC-12 via ADR-3 | `src/features/platform-prototype/MaxionPlatformPrototypePage.tsx#ConsultModule`; `src/features/platform-prototype/consultState.ts#selectConsultSources` | Task 8.1 continuity invariants | `pnpm test -- ConsultModule.spec.tsx` |
| 8.3 | RC-12 and RC-15 via ADR-4 | `src/features/platform-prototype/MaxionPlatformPrototypePage.tsx#ConsultModule`; `src/features/platform-prototype/portal-replica.css#consult-workspace` | Task 8.2 typed source index | `pnpm exec playwright test tests/e2e/maxion-platform-shell.spec.ts -g Consult` |
| 8.4 | RC-12 and RC-15 via ADR-2 | `src/features/platform-prototype/consultState.ts#consultCommand`; `tests/e2e/maxion-platform-shell.spec.ts#consult.empty` | Task 8.3 accepted frame | `pnpm exec playwright test tests/e2e/maxion-platform-shell.spec.ts -g consult-state` |
| 8.5 | RC-14 via ADR-5 | `tests/e2e/maxion-platform-shell.spec.ts#full-continuity`; `src/features/platform-prototype/contracts.ts#ObjectRef` | Task 8.4 all Consult states | `pnpm exec playwright test tests/e2e/maxion-platform-shell.spec.ts -g full-continuity` |
| 8.6 | RC-15 and RC-18 via ADR-4 | `src/features/platform-prototype/consultState.spec.ts#isolation`; `tests/fixtures/consult-sources-10000.json#sources` | Task 8.5 end-to-end identity chain | `pnpm test -- consultState.spec.ts -t isolation` |
| 8.7 | RC-15 and RC-16 via ADR-8 | `artifacts/ux-audits/phase-8/verification.md`; `docs/operations/program-phase-ledger.json#phases[8]` | Tasks 8.1 through 8.6 green at C | `python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase 8` |

## Contracts and observability

Add `ConsultThread`, `ConsultQuestion`, `GroundedAnswer`, `CitationRef`, `SourceStatus`, and
`RouteProposal`. `WorkObjectRef`, version, evidence, environment, and authority IDs remain unchanged
through all module handoffs. Synthetic telemetry records correlation, source count/status, route target,
and latency without prompt or answer body. No API/schema/package is expected.

## Test and failure plan

Unit tests cover citation integrity, source/version selection, route authorization, partial answers,
deduplication, limits, and cross-project isolation. Integration tests prove all typed handoffs and return
context. Playwright covers grounded answer→source→owner object, insufficient evidence recovery,
conflicting source selection, denied target, refresh, keyboard, mobile, reduced-motion, and the full
five-module continuity journey.

| Failure | Required fallback |
| --- | --- |
| A source is missing, stale, or conflicting | Label it, bound the answer, and route to the owning object for resolution |
| Deep link targets another project | Deny without revealing object existence |
| Answer generation fails | Preserve the question, show retry, and retain available source context |
| Proposed action needs mutation authority | Route to the owner module for explicit confirmation |

Rerun the Phase 1 copy-on-write suite for Consult history, including upgrade, downgrade, future-schema
preservation, crash-before-swap, quota, competing-writer, and rollback-pointer cases.

Rollback reverts the Phase 8 candidate while preserving prior objects and typed handoffs. Consult history
remains readable if its schema version is valid; invalid records recover without affecting source objects.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Production | Extract `ConsultModule` from `MaxionPlatformPrototypePage.tsx`; create `src/features/platform-prototype/consult/{domain,index,selectors,components}/**`; delete shell-local Consult state/styles | Read-only grounded owner with explicit route intents |
| Tests/fixtures | Consult unit/browser specs; conflict/stale/denied/injection-shaped/10,000-source fixtures; full continuity fixture | Exact nine state IDs and canonical five-module trace |
| Evidence/commands | `artifacts/ux-audits/phase-8/**`; Consult sheet; standard program/test/build/E2E/audit/diff plus focused/cross-module specs | State/viewport/Figma/axe/timing evidence and independent reports |
| PR lifecycle | Verify prior M as B; create isolated `phase-8/**` branch/worktree; commit C; push and open one PR; independent UX/QA audit clean C; optional evidence-only E; require program/build/audit/phase/E2E checks; merge; verify C ancestry in M; rerun clean-M gates; atomically update ledger | PR URL, B/C/E/M, source-tree equality, merge ancestry, post-merge results, successor pin |

## Definition of Done

- [ ] Consult answers are source-bound, uncertainty-aware, and mutation-free until explicit owner-module confirmation.
- [ ] The full Discover→Plan→Execute→Agentix→Consult trace preserves canonical IDs, versions, evidence, environment, authority, and return context.
- [ ] Unit, integration, cross-module E2E, responsive, accessibility, timing, load-shaped, token, sheet, and build gates pass.
- [ ] Sheet evidence and distinct verifier/QA sign-offs contain no blocker/major finding.

## Hand-off

Phase 9 starts from the accepted Phase 8 SHA with shared project, authority, connection-health, approval,
and usage concepts available to administrative screens without moving them into the product-module group.
