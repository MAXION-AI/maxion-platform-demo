# Phase 1: Shared UI, state, and Figma contract kernel

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-03, RC-04, RC-05, RC-16; advances RC-19 | **Risk:** high × high | **Status:** Not started
- **Depends on:** Phase 0 accepted SHA

## Objective and scope

Extract a portable contract layer without changing accepted visible behavior: semantic tokens,
shared primitives, typed cross-module objects/events/selectors, bounded persistence, lazy module
loading, and a checked Figma-to-code manifest. Module-specific recomposition remains in Phases 2–9.

## Entry criteria

- [ ] Phase 0 DoD rerun passes from its accepted SHA.
- [ ] Characterization screenshots and top-job E2E pass before refactoring.
- [ ] No unreviewed changes overlap `src/styles.css`, `MaxionPlatformPrototypePage.tsx`, or shared shell files.

## Architecture and contracts

Create `src/features/platform-prototype/contracts.ts`, `platformState.ts`,
`PlatformDemoProvider.tsx`, `persistence/DemoStateRepository.ts`, and shared primitives under
`src/features/platform-prototype/system/`. Views consume typed selectors/events; local adapters may
persist only versioned, validated, tenant-keyed, bounded synthetic state. `src/styles.css` remains
the semantic-token authority. The checked manifest lives at `docs/operations/figma-code-map.json`.

- **Scale:** reducer operations stay O(1) or O(log n) for lookup; lists are capped at 10,000 logical objects and no more than 200 mounted nodes. Initial bundle target is ≤250 kB gzip JS and ≤60 kB gzip CSS.
- **Robustness:** invalid persisted data resets only the affected slice with an accessible recovery notice; module load failure stays inside `ModuleErrorBoundary`.
- **Threat surface:** browser storage is hostile input—schema/version/length validation, synthetic data only, no authority derived from it.
- **UX source:** `platform-shell-dashboard.md`, the program laws table, and Figma `UhLxGyXphdHHNLGMomBq6n:16:2`. Visual output must remain within the recorded tolerance; this phase is architecture, not redesign.

## Phase-specific laws-check

| Law | Requirement | Number / acceptance | Verify |
| --- | --- | --- | --- |
| Hick's | Kernel adds no new visible choices | 0 new controls | inventory diff |
| Fitts's | Existing target geometry is unchanged | product 44 px; admin 36 px; floor 24 px | computed sizes |
| Jakob's | Shell/keyboard conventions survive extraction | Esc, Enter, back, Cmd/Ctrl+K unchanged | E2E |
| Proximity | Shared primitives retain tokenized spacing groups | 4–8 px within; ≥16 px between | visual diff |
| Miller's | Product/admin navigation remains chunked | 7 + 5 destinations | DOM count |
| Doherty | Dispatch acknowledges without waiting on persistence | <100 ms press; <400 ms state | throttled test |
| Von Restorff | Primary emphasis is unchanged | 1 filled action/view | screenshot |
| Serial Position | Product first and admin/footer last | fixed order | DOM order |
| Peak-End | Existing completion states remain visible after reload | object + evidence + next action | replay E2E |
| Zeigarnik | Progress survives provider extraction | Step N of fixed M after reload | persistence test |
| Prägnanz | No new top-level regions | ≤4 | thumbnail comparison |
| Similarity | One shared primitive per role | no duplicate Button/Status/Composer role | component inventory |
| Uniform Connectedness | Provider boundaries do not change object grouping | 0 mixed-object containers | screenshot/DOM audit |
| Tesler's | Persistence complexity stays internal | 0 migration prompts to user | recovery test |
| Postel's | Valid drafts normalize and survive; corrupt state fails safely | 0 valid-input loss | fuzz persistence test |
| Parkinson's | Existing top-job action counts do not grow | ≤3 before progress | E2E count |
| Occam's | Delete duplicate primitives after references migrate | 1 implementation per role | import graph |
| Pareto | Shell, state integrity, and top journeys receive first coverage | 3 top journeys | test map |
| Interactivity floor | Refactor preserves all existing actionable states | static-report regression count 0 | state-matrix walk |

## Ordered tasks

1. **Characterize current behavior (1.1).** Extend unit/E2E coverage around shell state, Discover/Plan/Execute/Agentix/Consult handoffs, reload, corrupt storage, hidden module timers, and error recovery.
2. **Define shared contracts (1.2).** Add typed object, evidence, authority, environment, progress, and decision contracts in `contracts.ts`; prove exhaustive discriminated unions in unit tests.
3. **Extract pure state/events/selectors (1.3).** Replace lifted booleans in `MaxionPlatformPrototypePage.tsx` and direct cross-module reads with `PlatformDemoProvider`; selectors are the only read path.
4. **Create bounded persistence port (1.4).** Consolidate module storage behind `DemoStateRepository`; add version migration, tenant key, length caps, malformed/cross-slice rejection, and replay tests.
5. **Extract shared primitives and tokens (1.5).** Move recurring status, decision, progress, composer, evidence, and empty/error patterns into `system/`; migrate callers before deleting duplicates; reduce raw-colour count.
6. **Split route/module bundles (1.6).** Lazy-load heavy module entry points with stable skeletons and error boundaries; assert hidden modules do not run timers.
7. **Extend the Figma/code contract map (1.7).** Extend Phase 0's route/sheet/node manifest with component IDs, route states, implementation symbols, and evidence paths; extend the gate to reject missing or duplicate code/evidence mappings.
8. **Complete single-owner cutovers (1.8).** For every migrated state, primitive, route, and stylesheet,
   prove the new runtime owner, then delete the predecessor and its tests/exports/imports/dependencies in
   the same task. Remove hook-rule suppressions by fixing effect ownership and callback stability, not by
   weakening checks. Delete the legacy CSS-normalization layer once all selectors have an explicit owner.

## Tests and passing bar

Unit tests cover reducers, selectors, migrations, invalid/cross-tenant state, caps, and exhaustive event
handling. Integration tests replay Discover→Plan→Execute→Agentix→Consult before and after extraction.
Playwright asserts accepted copy and the roadmap's measured visual tolerances where the reference is unchanged,
no serious axe violations, and no console/page errors. Build artifacts meet the bundle target or the
phase remains open with an explicit accepted exception from the owner.

## Failure modes and degraded behavior

| Failure | Detection | Fallback |
| --- | --- | --- |
| Persisted version invalid | repository validation | reset affected slice; preserve other slices; explain recovery |
| Lazy chunk fails | error boundary | inline retry and dashboard route; no blank screen |
| Refactor changes accepted behavior | characterization/visual diff | revert current task commit, not the accepted Phase 0 SHA |
| State grows past cap | repository invariant | retain newest bounded records and expose deterministic notice |

## Observability and rollback

Emit synthetic structured events for state rejection, migration, replay, module-load failure, and
interaction timing without values or PII. Ship as one phase-level feature flag inside the demo; off
uses the Phase 0 path. Rollback reverts Phase 1 and its persisted-schema version.

## Definition of Done

- [ ] Shared contracts/provider/repository/primitives exist at the named paths with tests.
- [ ] Direct module storage and cross-module completion booleans no longer define platform truth.
- [ ] Figma/code manifest has complete, unique mappings and passes its gate.
- [ ] Raw-color debt shrinks; no new literals or dependencies appear.
- [ ] Every migrated responsibility has one runtime owner; no duplicate component, route alias, CSS
  normalizer, stale export, or hook-rule suppression remains from the cutover.
- [ ] Characterization, cross-module, accessibility, bundle, and program gates pass.
- [ ] Separate reviewer records no blocker/major finding.

## Hand-off

Phase 2 consumes only the accepted provider/selectors/primitives and exact Figma mappings. It must not
re-introduce module-local cross-module truth.
