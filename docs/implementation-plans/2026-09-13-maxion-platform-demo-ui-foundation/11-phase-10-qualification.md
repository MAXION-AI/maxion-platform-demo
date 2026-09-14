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

Phase 10's explicit `all-surfaces` acceptance scope requalifies exactly these 13 sheets at C and binds
all 13 in both independent reports: `agentix-operations.md`, `agentix-run-canvas.md`,
`approvals-workspace.md`, `consult-max-workspace.md`, `discover-workspace.md`,
`execute-workspace.md`, `help-workspace.md`, `integrations-workspace.md`, `plan-workspace.md`,
`platform-shell-dashboard.md`, `projects-workspace.md`, `settings-workspace.md`, and
`usage-workspace.md`. Missing, extra, inherited-only, or partially sampled sheet coverage blocks E.

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
6. **Run fresh end-to-end journeys and recovery (10.6).** Execute the complete unfiltered
   strict-preview Playwright suite in three separate clean invocations, each with a fresh server and
   browser context, on C. Prove project creation plus
   Discover→Plan→Execute→Agentix→Consult, administrative approval/integration degradation,
   reload/resume, failure/retry/rollback, and no duplicate effects. A retry, filtered run, or continuation
   after interruption is not one of the three. After merge, the append coordinator runs the canonical
   clean-M `phase-tests` group exactly once (`pnpm test && pnpm test:e2e`) and records its M-bound receipt;
   that is a separate merge qualification, not three additional reviewer browser artifacts.
7. **Run independent final QA and freeze evidence (10.7).** A separate verifier audits sheets/code/Figma/evidence and returns GATE PASS only with no blocker/major finding; record limitations and the accepted SHA.

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 10.1 | RC-01 and RC-16 via ADR-8 | `docs/operations/program-phase-ledger.json#candidatePhase`; `playwright.config.ts#projects` | Accepted Phase 9 M and clean qualification worktree | `python3 scripts/program_ledger.py validate-tracked` |
| 10.2 | RC-03 and RC-19 via ADR-7 | `scripts/check_program_gates.sh#program-gates`; `scripts/check_production_sources.py#check_sources` | Task 10.1 frozen candidate C | `pnpm check:program` |
| 10.3 | RC-15 and RC-16 via ADR-2 | `docs/operations/figma-code-map.json#surfaces`; `tests/e2e/maxion-platform-shell.spec.ts#semantic-states` | Task 10.2 static gates green | `pnpm exec playwright test -g semantic-state` |
| 10.4 | RC-15 via ADR-4 | `tests/e2e/maxion-platform-shell.spec.ts#accessibility`; `artifacts/ux-audits/phase-10/accessibility.md` | Task 10.3 complete state runs | `pnpm exec playwright test -g accessibility` |
| 10.5 | RC-15 and RC-18 via ADR-1 | `scripts/check_bundle_budget.py#check_budget`; `artifacts/ux-audits/phase-10/performance.json` | Task 10.4 interaction qualification | `pnpm check:bundle` |
| 10.6 | RC-09 and RC-14 via ADR-5 | `tests/e2e/maxion-platform-shell.spec.ts#full-continuity`; `tests/e2e/execute-command-layer.spec.ts#rollback`; `artifacts/ux-audits/phase-10/strict-preview-runs.json#runs` | Task 10.5 performance budgets green | `pnpm test:e2e` |
| 10.7 | RC-01 and RC-15 via ADR-8 | `artifacts/ux-audits/phase-10/final-qa.md`; `docs/operations/phase-acceptance-protocol.md#Evidence-only-closure` | Tasks 10.1 through 10.6 green at C | `python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase 10` |

## Evidence and observability

Evidence includes command logs, browser traces, screenshots, accessibility reports, geometry/timing data,
bundle output, large-fixture counts, state/recovery IDs, and the immutable accepted SHA. All output uses
synthetic fixtures and redacts environment details that could contain secrets. No API/schema/package is
planned.
`strict-preview-runs.json` is parsed by the acceptance gate as schema version 2 and contains exactly
the same three ordered PASS entries as QA's `browserRuns`. Each binds C as run SHA, exact unfiltered
`pnpm test:e2e`, start/end UTC time, clean-before/after proof, run ID, browser/version, viewport,
fixture-set identity, exit code, and trace/report artifact path plus SHA-256. Duplicate run IDs or artifact
hashes, nonzero exits, a missing browser project, or fewer than three complete C runs fail qualification.
The external ledger's coordinator-generated `postMergeCommands` separately contains one PASS
`phase-tests` receipt whose `runSha` equals M; no E artifact may claim or predict that post-merge result.

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
| PR lifecycle | Verify prior M as B; create isolated phase branch/worktree; commit clean C; independent UX/QA audit C; commit required distinct evidence-only E; merge only as a true B+E two-parent M; rerun clean-M gates; append under lock to the external authority | PR URL, B/C/E/M, protected-object equality, exact target ref, merge/PR identity, post-merge results, successor pin |

## Definition of Done

- [ ] All 13 named sheets, Figma mappings, states, laws, and primary/recovery journeys have fresh evidence against one pinned SHA.
- [ ] Accessibility, performance, bundle, responsive, browser, load-shaped, security/dependency, token, sheet, and program gates all pass.
- [ ] The pinned route/import/export/dependency/style graph has one active owner per job and zero legacy,
  dead-code, or source-quality exemptions; browser traversal proves every retained route.
- [ ] The qualification report states exactly what the demo proves and does not claim backend concurrency, live providers, deployment, or production readiness.
- [ ] Independent final QA reports no blocker/major finding and records the accepted demo SHA.
- [ ] QA binds exactly three clean-C browser runs, while the external ledger binds the one canonical
  clean-M `phase-tests` rerun; no six-run or precomputed M-artifact claim exists.

## Hand-off

Phase 11 may use only the Phase 10 accepted SHA, frozen Figma/code manifest, accepted sheets, and fresh
qualification evidence as inputs to the demo-owned MaxAI adoption package. Production implementation
requires its own approved MaxAI plan, ledger, worktree chain, independent gates, and PR lifecycle.

### Structured acceptance hand-off

```json
{"schemaVersion":1,"phase":10,"nextPhase":11,"status":"pending","evidence":[],"reviewers":{"ux":"pending","qa":"pending"}}
```
