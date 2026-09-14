# Maxion platform demo UI foundation — implementation roadmap

- **Source:** `docs/operations/program-phase-ledger.json`, `docs/operations/phase-acceptance-protocol.md`, `docs/operations/ux-surface-inventory.md`, all UX reference sheets, editable Figma file `UhLxGyXphdHHNLGMomBq6n` including Agentix run node `46:933`, and the inspected demo/production portal source trees
- **Date:** 2026-09-13
- **Author:** Codex planning session 2026-09-13
- **Status:** PLAN GATE remediation in progress — Phase 0 PR merged, clean-SHA independent acceptance pending
- **Plan directory:** `docs/implementation-plans/2026-09-13-maxion-platform-demo-ui-foundation/`
- **Execution handoff:** `implementation-cadence`; every phase uses its own isolated implementation
  session and worktree, independent UX and engineering gates pinned to the candidate SHA, and one
  verified merged PR before its successor begins. Phase 1 waits for independent plan convergence and
  clean-SHA Phase 0 acceptance under `docs/operations/phase-acceptance-protocol.md`.

## 1. Executive summary

The program turns `maxion-platform-demo` into the executable UX reference for the Maxion product and
freezes a machine-checkable adoption package for a later, separately approved `max-ai-platform`
program. It has twelve dependency-ordered phases: accept and complete the design contracts, extract
the shared UI/state kernel, transform Dashboard/Projects and each product module as a vertical slice,
finish the administrative surfaces, qualify the whole demo, and publish the adoption package. Fully
complete means every user-facing state is interactive and independently gated against its reference
sheet, the demo has deterministic cross-module continuity and bounded performance, and the package
records exact production mapping decisions and open gaps without changing or qualifying MaxAI runtime.

## 2. Grounding

### Verified state

| Claim | Status | Evidence |
| --- | --- | --- |
| The isolated implementation worktree and branch existed for Phase 0 and preserved the owner checkout | Verified | `docs/operations/program-phase-ledger.json`; Phase 0 PR #2 history |
| Phase 0 PR #2 merged as `beae208b30ad31202c4ff92abbfbd6c1ef51af18` | Verified | `docs/operations/program-phase-ledger.json` |
| Existing Phase 0 UX/QA reports bind to the merged implementation SHA | False | Reports explicitly audited a dirty tree over `c381e7e`; clean detached reruns at `beae208` remain required |
| Thirteen editable 1440 × 900 product and administration frames exist | Verified | `docs/operations/figma-ux-reference-program-2026-09-13.md`; `figma-code-map.json` |
| Projects and the five administrative destinations have standalone contract-stage sheets and exact Figma frames | Verified | `docs/operations/ux-surface-inventory.md`; `docs/operations/ux-reference-sheets/` |
| The demo shell uses lifted booleans while Discover and Agentix also persist separate local state | Verified | `MaxionPlatformPrototypePage.tsx`, `DiscoveryAutonomousPrototypePage.tsx`, `operationsState.ts` |
| Core module implementations remain monolithic and CSS is split across large surface files | Verified | Discovery 2,707 TSX lines; Plan 1,972; Execute 724; production CSS inventory exceeds 12,000 lines combined |
| The current production portal already owns the real shell, primitives, auth/query boundary, and compact bottom navigation | Verified | `max-ai-platform/apps/max-user-portal/src/app/components/layout/PortalSidebar.tsx`, `components/ui/*`, `shell/usePortalCommands.ts` |
| Current local `max-ai-platform/main` is behind its `origin/main` by 19 commits and has owner untracked paths | Verified | read-only fetch/status on 2026-09-13 |
| Historical Phase 0 validation passed program gates, build, 38/38 unit tests, and 45/45 Chromium E2E journeys on a dirty pre-commit tree | Verified but non-accepting | Phase 0 evidence reports; clean detached reruns at `beae208` remain required |

### Inferred constraints

| Claim | Status | Resolution |
| --- | --- | --- |
| The thirteen candidate frames remain accessible from the merged Phase 0 revision | Inferred | Every later phase reopens its exact Figma node and records fresh evidence before build |
| Production APIs expose every state the accepted demo contract requires | Unknown | Phase 11 records this as an open adoption question; the separate MaxAI program pins fresh `origin/main` and answers it before production code |
| Existing demo behavior can be decomposed without changing every scenario at once | Inferred | Phase 1 characterization tests freeze current behavior before state extraction |

## 3. Root-cause and requirements register

| ID | Severity | What is needed and why | Evidence | Type | Status |
| --- | --- | --- | --- | --- | --- |
| RC-01 | Blocker | Candidate foundation and shell work requires independent clean-SHA acceptance plus a verified merged immutable SHA before later phases can inherit it | `program-phase-ledger.json`; Phase 0 reports | governance | Open — PR #2 merged at `beae208`; clean-SHA UX/QA reruns pending |
| RC-02 | Blocker | Projects, Settings, Integrations, My approvals, Usage, and Help are user-facing but lack standalone sheets and Figma frames | `ux-surface-inventory.md` | missing capability | Closed in Phase 0 candidate |
| RC-03 | Major | Shared visual primitives are not yet a portable contract; 1,357 raw colour literals remain under a ratchet | token baseline and large CSS surfaces | technical debt | Open |
| RC-04 | Major | Multi-thousand-line components and styles couple layout, state, copy, and scenarios, making reuse and review unsafe | module line counts and symbol inventory | architecture | Open |
| RC-05 | Blocker | Cross-module truth is fragmented across lifted booleans, component state, and module-local storage | `MaxionPlatformPrototypePage.tsx`, Discover storage, `operationsState.ts` | state integrity | Open |
| RC-06 | Major | Dashboard and Projects must become complete interactive product surfaces, not a shell plus an uncovered list view | current inventory and frame set | UX capability | Open |
| RC-07 | Major | Discover must unify conversation, interview, evidence, facts, decisions, package, recovery, and handoff | `discover-workspace.md` | UX capability | Open |
| RC-08 | Major | Plan must make the generated artifact primary and support section edit/regenerate, provenance, approval/revert, and Execute handoff | `plan-workspace.md` | UX capability | Open |
| RC-09 | Blocker | Execute must distinguish simulated, staged, and production-verified evidence and make pause/retry/rollback recoverable | `execute-workspace.md` | trust and safety | Open |
| RC-10 | Major | Agentix operations must unify deployed responsibilities, queues, approvals, activity, connections, versions, and degraded states | `agentix-operations.md` | UX capability | Open |
| RC-11 | Blocker | Agentix run canvas must be steerable in place with authority-bound approvals and object/evidence endings | `agentix-run-canvas.md` | trust and safety | Open |
| RC-12 | Major | Consult Max must stay a question surface, cite owning objects, and route into action without starting work implicitly | `consult-max-workspace.md` | UX capability | Open |
| RC-13 | Major | Administrative surfaces need complete information architecture, states, and reference contracts while staying visually subordinate | `AccountUtilityModule`, `IntegrationsModule` | UX capability | Open |
| RC-14 | Blocker | Discover → Plan → Execute → Agentix → Consult continuity has no single typed provenance and authority contract | lifted shell state and module handoffs | state integrity | Open |
| RC-15 | Blocker | Responsive, keyboard, reduced-motion, accessibility, state-matrix, and performance behavior is not yet proven for every surface | reference-sheet evidence tables remain pending | quality | Open |
| RC-16 | Major | Figma, reference sheets, code, and screenshots can drift because exact node/component mappings are recorded manually | current Figma ledger and docs | governance | Open |
| RC-17 | Blocker | A production adoption boundary is missing; directly importing demo code would bypass MaxAI's real primitives, query layer, auth, and tenancy | production portal inspection | architecture | Open |
| RC-18 | Major | A browser-only deterministic demo cannot itself prove 10,000-user backend behavior and must not be represented as production qualification | repository architecture | scope/trust | Open |
| RC-19 | Blocker | A transformed screen cannot retain a superseded route, component, export, dependency, stylesheet override, hook suppression, or unreachable branch; otherwise the demo keeps two authorities and cannot be the MaxAI reference | strict TypeScript baseline, import/route inventory, dependency audit, legacy-normalizer scan | source integrity | Open |

No register item is deferred. RC-18 is closed by an explicit proof boundary, not by pretending the
demo has server concurrency.

## 4. Architecture decisions

### ADR-1: the demo is the executable UX contract, not a production package dependency

- **Serves:** RC-03, RC-17, RC-18.
- **Decision:** the demo owns reference behavior, visual baselines, state semantics, token names, and
  interaction contracts. `max-ai-platform` ports accepted decisions into its own `theme.css`,
  `components/ui/*`, layout, query, and authorization seams.
- **Alternatives:** importing demo React/CSS directly couples production to a prototype and is
  rejected; treating Figma alone as authority loses interaction and failure behavior and is rejected.
- **Trade-off:** the production port has deliberate translation work, but avoids prototype/runtime
  coupling and forces every production state to meet real API, auth, and tenant contracts.
- **Monitoring:** contract-map coverage, visual comparison, and adoption-package drift reports.

### ADR-2: reference sheet + exact Figma node + live state matrix is the screen contract

- **Serves:** RC-01, RC-02, RC-16.
- **Decision:** no user-facing screen enters implementation without an examined-reference sheet, an
  exact frame/node, token/component mapping, all laws, a state matrix, and an independent verifier.
  Before coding, the executor fetches Figma design context and screenshot for the exact node; after
  coding, it captures the same viewport and records measured differences.
- **Alternatives:** visual approximation from memory and one shared moodboard are rejected because
  they cannot gate per-screen behavior.
- **Trade-off:** more design bookkeeping; materially less interpretation drift.
- **Monitoring:** `check_ux_reference_sheet.py`, a checked-in Figma/code map, missing-node and stale-
  evidence checks.

### ADR-3: one typed platform state kernel with replaceable persistence adapters

- **Serves:** RC-04, RC-05, RC-14.
- **Decision:** introduce pure versioned domain state/events/selectors and a `DemoStateRepository`
  port. The demo adapter uses bounded, validated browser persistence; production adapters remain API/
  React Query based. Views consume selectors and dispatch intent events instead of coordinating via
  booleans or reading storage directly.
- **Alternatives:** a global third-party state package is rejected unless profiling proves it needed;
  keeping local state per module is rejected because cross-module claims can diverge.
- **Trade-off:** an early refactor before visible module work; enables deterministic replay, cross-
  module proof, and production translation.
- **Monitoring:** invalid-state fallback telemetry in the demo, reducer invariant tests, persisted-
  schema version tests, and replay snapshots.

### ADR-4: transform by vertical surface slice, never by a global restyle

- **Serves:** RC-06 through RC-15.
- **Decision:** each phase completes domain state, UI composition, all interactive states, responsive
  behavior, accessibility, browser E2E, visual evidence, and independent audit for one surface before
  the next starts. Each candidate begins from the prior accepted SHA in a fresh worktree.
- **Alternatives:** changing all CSS first is rejected because it hides broken behavior until the end;
  parallel edits to shared CSS/state are rejected because they create collisions.
- **Trade-off:** sequential execution is slower on paper but makes every boundary reversible and
  prevents cross-module regressions from accumulating.
- **Monitoring:** disk-backed phase state, accepted SHA chain, and cross-phase E2E on every gate.

### ADR-5: evidence and environment are typed product concepts

- **Serves:** RC-09, RC-11, RC-14, RC-18.
- **Decision:** every result is labelled `simulated`, `observed`, `sandbox-executed`, or
  `production-verified`; evidence records their source, object, timestamp, verifier, and authority.
  UI language may never promote one class to another.
- **Alternatives:** colour-only badges and generic “complete” states are rejected.
- **Trade-off:** more explicit metadata; substantially stronger trust and safer production adoption.
- **Monitoring:** state-transition tests and a source scan for misleading completion/deployment copy.

### ADR-6: the demo chain ends with a versioned MaxAI adoption package

- **Serves:** RC-03, RC-16, RC-17.
- **Decision:** after demo qualification, this repository emits a versioned, machine-checked package
  containing accepted tokens, component/state mappings, evidence pointers, and open API/auth/tenancy
  gaps. A separate MaxAI program, ledger, plan, worktree chain, and PR lifecycle may later consume it
  from fetched `origin/main`; no MaxAI source change belongs to this demo chain.
- **Alternatives:** a cross-repository phase pretending to descend from the demo merge is rejected;
  copying screenshots without interaction contracts is also rejected.
- **Trade-off:** production adoption requires a second approval and gate sequence, but repository and
  rollback authority remain truthful.
- **Monitoring:** adoption-package schema/hash checks in this repository; production telemetry and
  rollback drills belong to the separate MaxAI program.

### ADR-7: every cutover has one runtime owner and deletes its predecessor

- **Serves:** RC-04, RC-16, RC-19.
- **Decision:** characterize the active path, migrate its callers and tests, prove the replacement through
  the route and browser, then delete the superseded component, export, style layer, dependency, fixture,
  and suppression in the same phase. Compatibility code may exist only inside an unfinished task and may
  not cross a phase gate.
- **Alternatives:** leaving aliases or hidden implementations “for safety” is rejected because it creates
  two sources of behavior; deleting solely from a static-tool result is also rejected because apparently
  unused demo code can still be route-, timer-, test-, or browser-reachable.
- **Trade-off:** each cutover needs explicit reachability evidence, but the accepted SHA remains a coherent
  implementation rather than an accumulation of abandoned paths.
- **Monitoring:** strict unused checks, route/import/export/dependency/style ownership checks, focused
  characterization tests, browser route traversal, and a zero-exemption source-quality report.

### ADR-8: candidate-SHA review, evidence-only closure, and commit-revert rollback

- **Serves:** RC-01, RC-16, RC-19.
- **Decision:** every phase follows `docs/operations/phase-acceptance-protocol.md`: independent
  reviewers audit a clean implementation commit C; a later E is evidence-only and preserves C's
  source tree; merge M is ancestry-verified and post-merge qualified. Demo rollback uses a reviewed
  revert PR, never a hidden predecessor UI or dual runtime.
- **Alternatives:** branch-name review, dirty-tree review, and feature-flagged old/new UI ownership
  are rejected because none binds evidence to the merged implementation.
- **Trade-off:** evidence may require a second commit and post-merge checks; the reviewed code identity
  remains unambiguous and each accepted SHA has one runtime owner.
- **Monitoring:** tracked and external hash-chained ledgers, source-tree equality C→E, PR checks,
  merge ancestry verification, and clean-M post-merge gates.

## 5. Cross-cutting contracts

- **State:** `PlatformDemoState@v1`, typed events, pure reducers, bounded lists, stable selectors, and
  validated persistence. No source module may infer another module's completion from UI presence.
- **Objects:** `WorkObjectRef`, `EvidenceRef`, `DecisionRequest`, `ProgressState`, `AuthorityBoundary`,
  and `ExecutionEnvironment` use the same vocabulary across modules.
- **Figma mapping:** schema-v2 `figma-code-map.json` maps each classified production route,
  truthful URL or interaction-only address, stable state ID, frame and component IDs (or an explicit
  frame-level ownership reason), sheet hash, implementation tree, runtime/style/timer owners, evidence,
  and last connector attestation.
- **Figma operation:** any execution session loads the repository Figma workflow before using Figma,
  fetches design context and a screenshot for the exact node before code, and records node/component IDs
  rather than relying on a visual memory or file-level link.
- **Visual tolerance:** exact-frame comparisons use the declared viewport and fixture; accepted geometry
  differs by no more than 2 px, text baselines by no more than 1 px, and screenshot pixel mismatch by no
  more than 1.5%, with zero tolerance for clipped content, missing states, wrong hierarchy, or accessibility
  regressions. Intentional differences are measured and signed in the owning sheet.
- **API/schema:** Phases 0–11 add no server API or schema. The separate MaxAI adoption stream may only
  map to existing `/v1/` contracts; any missing endpoint becomes a separate backend plan with
  backward-compatible schema and authorization work.
- **Auth/tenancy:** the demo uses synthetic tenant-scoped scenarios only. Production uses existing
  server-side authorization and tenant-scoped queries; client state never grants authority.
- **Rollback:** every demo phase has one merged runtime and is restored through a reviewed revert PR.
  A provider-behavior flag may remain only when both modes share the same UI/route/state/style owners.
  No phase deletes accepted evidence.
- **Source integrity:** `tsc` runs with unused-local and unused-parameter checks; the source-quality gate
  inventories entry routes, exports, imports, packages, styles, suppressions, and obsolete markers. A
  deletion is accepted only after route/import/runtime/test evidence identifies the replacement owner.
  Final acceptance permits no legacy or dead-code exemption.

### Program UX laws-check

All runtime surfaces are **product** surfaces. Target users are enterprise operators whose top jobs
are to understand current work, make the one decision blocking progress, and reach the produced
object/evidence. Surface-specific references and stricter numbers live in each reference sheet.

| Law | Program requirement | Number / acceptance | Verification |
| --- | --- | --- | --- |
| Hick's | One primary action; advanced actions disclosed contextually | 1 primary; no choice set over 7 | screenshot/control count |
| Fitts's | Primary actions and product nav are touch-sized; no control below AA minimum | 44×44 px product row; 20–24 px top icon; 36 px compact admin row; 24×24 px floor; 8 px gaps | computed geometry |
| Jakob's | Use the named Mobbin job references and conventional shell, composer, tabs, dialog, Esc, Enter, back, and Cmd/Ctrl+K behavior | 3–5 examined apps per sheet | side-by-side and keyboard E2E |
| Proximity | Space encodes grouping before borders | 4–8 px within; 16–32 px between | screenshot measurement |
| Miller's | Chunk navigation, actions, tables, and long content | exactly 7 top product destinations and 5 bottom administrative destinations; no group over 7 | DOM count |
| Doherty | Every action acknowledges immediately; longer work exposes real progress | <100 ms press; <400 ms acknowledgement; >1 s progress; >10 s leave-able | throttled INP test |
| Von Restorff | Exactly one action carries filled accent emphasis | 1 per view; accent under 10% | squint test |
| Serial Position | Identity/status first and next/terminal action last | first and last order fixed per sheet | reading/tab-order audit |
| Peak-End | Every top flow ends on the produced object, evidence, and next action | all 3 present | completion journey |
| Zeigarnik | Multi-step work shows durable position and remaining work | Step N of fixed M; updates within 1 s | reload/resume test |
| Prägnanz | Keep a dominant workspace and few top-level regions; rail uses two unmistakable tiers | no more than 4 workspace regions; product cluster ≤50% of desktop rail; flexible spacer ≥24 px | thumbnail/geometry test |
| Similarity | Same role uses the same primitive; different roles remain distinct | 1 appearance per interactive type | component inventory |
| Uniform Connectedness | Every container binds one object or relationship | 0 mixed-object cards | DOM/content audit |
| Tesler's | The system infers and carries complexity; the user decides only irreducible boundaries | no more than 1 bounded decision per card | top-job walkthrough |
| Postel's | Accept reasonable input formats, preserve drafts, and emit one clean vocabulary | 0 valid-input loss; 1 output format per type | paste/failure tests |
| Parkinson's | State expected duration and shorten setup | no more than 3 typed fields before progress | timed journey |
| Occam's | One route and one primitive per job | 0 duplicate primary controls | control inventory |
| Pareto | The top three jobs receive first position and strongest testing | 3 named top jobs per sheet | screenshot and test map |
| Interactivity floor | Composer/command in context; every visible state actionable; live state; no dead ends | static-report test passes every declared state | full state-matrix walk |

### Non-functional targets

| Dimension | Target | Scope boundary |
| --- | --- | --- |
| Production concurrency | 10,000 concurrent users | The demo proves bounded client behavior only; Phase 11 records which MaxAI APIs require separate production qualification |
| Client data scale | 10,000 logical rows/cases with no more than 200 mounted DOM rows; virtualize beyond 100 | load-shaped browser fixtures |
| Interaction latency | INP p75 ≤200 ms; visible acknowledgement <400 ms | Chromium throttled 4× CPU and Slow 4G |
| Loading stability | CLS ≤0.1; LCP ≤2.5 s on representative entry routes | Lighthouse/Playwright profile |
| Bundle | initial JS ≤250 kB gzip and CSS ≤60 kB gzip; modules lazy-loaded | build artifact gate; current 387.56/85.90 kB are debt |
| Availability | No new availability claim in the static demo | The adoption package records required MaxAI SLO dependencies; it does not inherit or prove them |

### Security and threat review

- The demo accepts only synthetic data and must never contain credentials, tokens, real PII, or
  privileged endpoints. Browser persistence is tenant-keyed, length-bounded, version-validated, and
  treated as untrusted input.
- Approval, publish, activate, stop, rollback, recipient, and permission actions show the exact object
  and consequence. UI actions cannot widen authority; production authorization remains server-side.
- The adoption package introduces no endpoint and makes no production authorization claim. It records
  required auth, CSRF, tenant, request-ID, retry, and query contracts as verified mappings or explicit
  open gaps; any gap is owned by a separate versioned MaxAI plan.
- No new package is adopted without a pinned version, license check, and dependency vulnerability
  scan. Logs and screenshots use synthetic fixtures only.

### Standard verification commands

Run from the pinned worktree with the committed lockfile. A phase may add narrower suites, but it may not
replace these program-level commands with a piped command or ignore their exit status.

```bash
pnpm install --frozen-lockfile
pnpm check:program
pnpm check:source-quality
pnpm test
pnpm build
pnpm test:e2e
pnpm audit --audit-level high
git diff --check
```

The execution session records command, exit code, duration, B/C/E/M identities, PR URL, and evidence
path under `docs/operations/phase-acceptance-protocol.md`. `.impl-cadence/` is disposable local
scratch, not cross-worktree authority. A successor begins only from the checksum-verified external
ledger record whose M is the fetched target-branch ancestor.
Phase 10 also records browser/version, CPU/network profile, viewport, fixture, Figma node, and sheet
hash for every visual or performance result.

## 6. Phase map and dependencies

| Phase | Objective | Closes | Depends on | Risk |
| --- | --- | --- | --- | --- |
| 0 | Accept current candidate work, close dependency/source-quality blockers, and create missing Projects/admin contracts and frames | RC-01, RC-02 | — | high × medium |
| 1 | Extract the typed state kernel, shared primitives, token ownership, and Figma/code manifest without visual drift; remove replaced code as each owner migrates | RC-03, RC-04, RC-05, RC-16 | 0 | high × high |
| 2 | Complete Dashboard and Projects | RC-06 | 1 | medium × medium |
| 3 | Transform Discover as one evidence-bound workspace | RC-07 | 2 | high × medium |
| 4 | Transform Plan as an artifact-first workspace | RC-08 | 3 | high × medium |
| 5 | Transform Execute with explicit gates, environments, verification, and rollback | RC-09 | 4 | high × high |
| 6 | Transform Agentix operations and persistent responsibility views | RC-10 | 5 | high × high |
| 7 | Transform the Agentix live run canvas | RC-11 | 6 | high × high |
| 8 | Transform Consult Max and prove cross-module provenance/authority continuity | RC-12, RC-14 | 7 | high × high |
| 9 | Complete Settings, Integrations, My approvals, Usage, and Help | RC-13 | 8 | medium × medium |
| 10 | Run whole-product accessibility, responsive, performance, state, drift, security, and zero-legacy qualification | RC-15, RC-18, RC-19 | 9 | high × medium |
| 11 | Freeze the qualified demo into a complete MaxAI adoption package; no MaxAI source changes | RC-17 | 10 | medium × high |

```text
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11
```

The graph is deliberately acyclic and sequential because all later surfaces consume the accepted
state vocabulary, primitives, and prior handoff objects. Parallelizing visual work against shared
state/CSS would trade calendar time for integration risk.

## 7. Master traceability matrix

| RC | Closed by |
| --- | --- |
| RC-01, RC-02 | Phase 0 tasks 0.1–0.5 |
| RC-03, RC-04, RC-05, RC-16 | Phase 1 tasks 1.1–1.7 |
| RC-06 | Phase 2 tasks 2.1–2.6 |
| RC-07 | Phase 3 tasks 3.1–3.7 |
| RC-08 | Phase 4 tasks 4.1–4.7 |
| RC-09 | Phase 5 tasks 5.1–5.7 |
| RC-10 | Phase 6 tasks 6.1–6.7 |
| RC-11 | Phase 7 tasks 7.1–7.7 |
| RC-12, RC-14 | Phase 8 tasks 8.1–8.7 |
| RC-13 | Phase 9 tasks 9.1–9.7 |
| RC-15, RC-18 | Phase 10 tasks 10.1–10.7 |
| RC-17 | Phase 11 tasks 11.1–11.7 |
| RC-19 | Phase 10 tasks 10.1–10.7, enforced incrementally in every earlier phase |

There are zero uncovered register rows and no deferred requirements.

## 8. Global risks, dependencies, and rollback

- **Acceptance-identity risk:** Phase 0's historical reports audited a dirty tree. Clean-`beae208`
  independent reruns are mandatory before Phase 1.
- **Reference risk:** all thirteen contract frames exist, but every later phase must re-attest its
  exact node and attach state-specific implementation evidence.
- **Bundle risk:** the current single-route bundle exceeds the target; Phase 1 must lazy-load by module
  before visual phases add code.
- **Production drift risk:** the demo chain cannot govern a different repository. Phase 11 emits only
  the demo-owned adoption package; a separately approved MaxAI plan starts from fresh `origin/main`.
- **Dependencies:** no new runtime package is assumed. Prefer current React, Motion, Phosphor, Vite,
  Vitest, Playwright, and axe stack.
- **Source-integrity risk:** static analysis can produce false positives and cannot prove route or timer
  reachability. Every removal is paired with an active-owner trace plus focused and browser coverage;
  final qualification requires zero accepted exemptions, not a hidden allowlist.
- **Rollback:** retain B/C/E/M per phase and revert only through a reviewed PR. No accepted merge
  keeps a dormant predecessor UI. Production feature-flag and deployment rollback belong to the
  separate MaxAI adoption plan.

## 9. Definition of fully transformed

- Every inventory surface has an accepted sheet, exact Figma node, token/component map, full laws
  table, state matrix, evidence, and three distinct sign-offs.
- Every visible state can be acted on in place and passes the static-report test.
- The typed state kernel is the only authority for cross-module demo truth; reload/replay cannot
  duplicate effects or invent completion.
- All unit, integration, security-boundary, load-shaped browser, E2E, axe, keyboard, reduced-motion,
  responsive, token, sheet, and production-build gates pass from a clean install.
- No blocker/major independent audit finding remains; residual minors are recorded.
- No superseded runtime path, dead export/import/package/style, hook-rule suppression, or source-quality
  exemption remains. The accepted route graph has one implementation owner per job.
- The MaxAI adoption package is complete, internally hashed, machine-checked, and contains no claim
  that production code, authorization, tenancy, deployment, or rollback has been qualified.
- The demo is described honestly as an executable UX contract, not 10,000-user runtime proof.
