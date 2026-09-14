# Phase 10: Whole-product qualification

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-15, RC-18, RC-19 | **Risk:** high × medium | **Status:** Not started
- **Depends on:** Phase 9 accepted SHA

## Objective and scope

Qualify the transformed demo as an executable UX foundation across every surface, state, viewport, and
cross-module journey. This is a fresh-evidence phase, not a feature phase. It may remediate defects found
by qualification, but cannot weaken thresholds, skip states, or represent deterministic browser proof as
10,000-user backend, live-provider, deployment, or production qualification.

## Entry criteria and UX contract

- [ ] Phases 0–9 each have an accepted SHA, closed reference sheets, and distinct sign-offs.
- [ ] The Figma/code manifest has no missing route/state/node/component mapping.
- [ ] Program gates, dependency audit, and current build pass before fresh evidence begins.

Every screen is a **product** surface. All accepted per-screen reference sheets and their named Jakob
references are binding. Qualification reruns all eighteen laws plus the interactivity floor; no inherited
screen evidence is accepted as fresh proof. Hard floors remain: no target below 24 px, page actions 44 px,
acknowledgement under 400 ms, no valid-input loss, no product-level complexity pushed to the user, and no
failed flow without recovery.

## Architecture, scale, security, and reliability

No new product architecture is introduced. Test fixtures and instrumentation must be deterministic,
bounded, tenant/project-isolated, and stripped of secrets/PII. Client load proof uses 10,000 logical
objects per large-list family with virtualization and ≤200 mounted rows; it does not claim concurrent
server capacity. Fresh production concurrency, API authorization, database, queue, provider, and SLO
proof are explicitly outside this repository and remain MaxAI release obligations.

## Ordered tasks

1. **Freeze the qualification candidate (10.1).** Record worktree, branch, SHA, dependency lock hash, Figma manifest hash, sheet hashes, test environment, browsers, and viewport matrix; register Chromium and WebKit Playwright projects before evidence collection.
2. **Run static and contract gates (10.2).** Run format/type/lint/unit/build, dependency/security scan, raw-token ratchet, reference-sheet gate, Figma mapping/drift check, and source scans for misleading evidence/deployment language. Require zero unused symbols, unreachable exports/files, unused dependencies, obsolete routes, compatibility aliases, legacy normalizers, hook-rule suppressions, or accepted source-quality exemptions.
3. **Run every state matrix (10.3).** Exercise each declared normal, empty, loading, error, offline/degraded, permission, destructive, long-content, and recovery state at required viewports.
4. **Run accessibility and interaction qualification (10.4).** Verify keyboard order, focus trap/return, screen-reader names, axe, contrast, zoom/reflow, reduced motion, target geometry, and <400 ms acknowledgement.
5. **Run performance and load-shaped qualification (10.5).** Measure INP/LCP/CLS, initial JS/CSS budgets, lazy loading, mounted-node bounds, memory growth, and 10,000-object fixtures under 4× CPU/Slow 4G.
6. **Run fresh end-to-end journeys and recovery (10.6).** Prove project creation plus Discover→Plan→Execute→Agentix→Consult, administrative approval/integration degradation, reload/resume, failure/retry/rollback, and no duplicate effects.
7. **Run independent final QA and freeze evidence (10.7).** A separate verifier audits sheets/code/Figma/evidence and returns GATE PASS only with no blocker/major finding; record limitations and the accepted SHA.

## Evidence and observability

Evidence includes command logs, browser traces, screenshots, accessibility reports, geometry/timing data,
bundle output, large-fixture counts, state/recovery IDs, and the immutable accepted SHA. All output uses
synthetic fixtures and redacts environment details that could contain secrets. No API/schema/package is
planned.

## Test and failure plan

Passing requires all registered unit/integration/E2E tests, all reference-sheet state matrices, Chromium
and WebKit primary journeys, required responsive captures, zero serious/critical axe violations, every
blocker law threshold, initial JS ≤250 kB gzip, CSS ≤60 kB gzip, INP p75 ≤200 ms, CLS ≤0.1, LCP ≤2.5 s,
and large-list mounted DOM ≤200. A failure is fixed and the affected gate plus dependent cross-product
journeys rerun from fresh state; evidence is never edited into a pass.

| Failure | Required fallback |
| --- | --- |
| Any blocker law or state-matrix case fails | Candidate is not qualified; fix and rerun affected/dependent evidence |
| Bundle/performance budget fails | Profile and reduce/split work; do not waive the number in-place |
| Browser behavior differs | Treat the least capable supported browser as binding or document a product decision before acceptance |
| 10,000-object client fixture passes but no server proof exists | State only client qualification; preserve RC-18 boundary in adoption docs |

Rollback reverts only qualification remediations to the Phase 9 accepted SHA. Evidence artifacts are
append-only so failed runs remain inspectable.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Production | No planned feature owner; qualification fixes name exact existing files and delete, never waive, the superseded owner | Final source graph has zero alias/stale-selector/suppression/legacy exemptions |
| Tests/fixtures | All unit and Playwright specs; WebKit project; deterministic every-state and 10,000-object fixtures | Every manifest state ID and cross-module recovery runs fresh |
| Evidence/commands | `artifacts/ux-audits/phase-10/**`; all sheets; standard program/test/build/E2E/audit/diff plus bundle/INP/LCP/CLS/DOM measurements | Fresh C-bound reports and every numeric threshold |
| PR lifecycle | Verify prior M as B; create isolated `phase-10/**` branch/worktree; commit C; push and open one PR; independent UX/QA audit clean C; optional evidence-only E; require program/build/audit/phase/E2E checks; merge; verify C ancestry in M; rerun clean-M gates; atomically update ledger | PR URL, B/C/E/M, source-tree equality, merge ancestry, post-merge results, successor pin |

## Definition of Done

- [ ] Every accepted sheet, Figma mapping, state, law, and primary/recovery journey has fresh evidence against one pinned SHA.
- [ ] Accessibility, performance, bundle, responsive, browser, load-shaped, security/dependency, token, sheet, and program gates all pass.
- [ ] The pinned route/import/export/dependency/style graph has one active owner per job and zero legacy,
  dead-code, or source-quality exemptions; browser traversal proves every retained route.
- [ ] The qualification report states exactly what the demo proves and does not claim backend concurrency, live providers, deployment, or production readiness.
- [ ] Independent final QA reports no blocker/major finding and records the accepted demo SHA.

## Hand-off

Phase 11 may use only the Phase 10 accepted SHA, frozen Figma/code manifest, accepted sheets, and fresh
qualification evidence as inputs to the demo-owned MaxAI adoption package. Production implementation
requires its own approved MaxAI plan, ledger, worktree chain, independent gates, and PR lifecycle.
