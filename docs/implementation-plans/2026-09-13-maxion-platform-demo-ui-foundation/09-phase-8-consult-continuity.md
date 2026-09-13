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

This is a **product** surface. Binding references are ChatGPT, Perplexity, Sana, Claude, and Gemini.
The sheet's complete laws-check and state matrix apply. The composer is persistent, sources remain
inspectable, one best next action is highlighted, all input acknowledges under 400 ms, and an answer
with insufficient grounding says so and provides a recovery path instead of manufacturing certainty.

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

Rollback reverts the Phase 8 candidate while preserving prior objects and typed handoffs. Consult history
remains readable if its schema version is valid; invalid records recover without affecting source objects.

## Definition of Done

- [ ] Consult answers are source-bound, uncertainty-aware, and mutation-free until explicit owner-module confirmation.
- [ ] The full Discover→Plan→Execute→Agentix→Consult trace preserves canonical IDs, versions, evidence, environment, authority, and return context.
- [ ] Unit, integration, cross-module E2E, responsive, accessibility, timing, load-shaped, token, sheet, and build gates pass.
- [ ] Sheet evidence and distinct verifier/QA sign-offs contain no blocker/major finding.

## Hand-off

Phase 9 starts from the accepted Phase 8 SHA with shared project, authority, connection-health, approval,
and usage concepts available to administrative screens without moving them into the product-module group.
