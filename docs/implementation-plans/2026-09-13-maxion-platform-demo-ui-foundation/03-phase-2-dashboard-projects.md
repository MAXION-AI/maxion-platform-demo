# Phase 2: Dashboard and Projects

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-06 | **Risk:** medium × medium | **Status:** Not started
- **Depends on:** Phase 1 accepted SHA

## Objective and scope

Make Dashboard the honest operating overview and Projects the durable work-entry surface. Dashboard
prioritizes continue work, resolve attention, and start an outcome; Projects supports create, search,
filter, empty, loading, error, permission, and open/resume states without duplicating module work.

## Entry criteria and UX contract

- [ ] Phase 1 DoD rerun passes.
- [ ] Dashboard sheet `platform-shell-dashboard.md` and Figma `UhLxGyXphdHHNLGMomBq6n:16:2` are accepted.
- [ ] Phase 0-created `projects-workspace.md` and its exact Figma node are accepted.
- [ ] Before code, fetch design context and screenshots for both exact nodes and record them.

These are **product** surfaces. Each reference sheet §2 is the sole binding Mobbin authority; this
phase must not carry or substitute another app list. The full one-row-per-law tables and state
matrices in both sheets are binding. Additional hard numbers: one filled
action per view, 44 px primary targets, 4–8/16–32 px spacing, no more than four top-level regions,
acknowledgement under 400 ms, and all first value paths within three actions.

- **Required surface state IDs (`platform-shell-dashboard`):** `shell.attention`, `shell.clear`, `shell.destination-error`, `shell.mobile-navigation`
- **Required surface state IDs (`projects-workspace`):** `projects.ready`, `projects.loading`, `projects.empty`, `projects.error`, `projects.permission-denied`, `projects.create-review`, `projects.selected`

## Architecture and non-functional impact

- **Scale:** Projects must handle 10,000 logical projects with filter/search p95 under 100 ms on the client fixture and ≤200 mounted rows.
- **Robustness:** stale/corrupt project state yields a recoverable empty/error surface; dashboard cards never infer completion.
- **Threat surface:** synthetic demo permissions remain explicit. Production ownership/role checks are displayed but never trusted from client state.

## Ordered tasks

1. **Bind dashboard selectors (2.1).** Refactor `DashboardModule` in `PortalReplicaModules.tsx` to consume typed summaries/attention selectors, never independent booleans.
2. **Match the accepted dashboard frame (2.2).** Implement hierarchy, responsive reflow, skeleton/empty/error states, and one primary attention action with shared primitives.
3. **Extract the Projects state/view seam (2.3).** Move project events/selectors from `PortalReplicaModules.tsx` into the shared kernel; preserve create/search/open behavior.
4. **Build the Projects frame and state matrix (2.4).** Implement list/grid density, filters, create/resume, permissions, loading/empty/error, keyboard, and mobile states from its sheet.
5. **Prove dashboard↔project continuity (2.5).** A created/updated project changes dashboard summaries and recent work through shared state, survives reload, and opens the correct object.
6. **Attach evidence and run independent gate (2.6).** Capture 375/768/1280/1536, Figma comparisons, state-matrix evidence, axe, timing, and separate verifier report.

## Data/contracts, tests, failures, rollback

No server schema/API change. Add only typed demo project events/selectors. Unit tests cover zero/one/
10,000 projects, filtering, permission states, malformed names, duplicate IDs, and summaries.
Playwright covers create→dashboard readback→open, no-permission denial, empty recovery, keyboard-only,
mobile overlay, and throttled acknowledgement. At 10,000 logical projects mounted DOM remains ≤200.

| Failure | Fallback |
| --- | --- |
| Project persistence invalid | isolate the record, show recovery, keep other work |
| Summary selector fails | render dashboard error boundary with retry; never show fabricated zero |
| Visual parity conflicts with accessibility | accessibility wins; document measured variance in the sheet |

Rollback reverts only Phase 2 while retaining Phase 1 contracts. No new dependency is planned.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Production | Modify `PortalReplicaModules.tsx#DashboardModule/#ProjectsModule`; create project domain/selectors under `src/features/platform-prototype/projects/`; delete superseded dashboard/project owners and selectors | One runtime owner per surface; manifest and sheet hashes updated |
| Tests/fixtures | Co-located project/selector tests; platform shell unit spec; `tests/e2e/maxion-platform-shell.spec.ts`; deterministic 0/1/10,000 fixtures | Create→Dashboard→open, denial, empty, keyboard/mobile, ≤200 mounted rows |
| Evidence/commands | `artifacts/ux-audits/phase-2/**`; both sheets §7/§8; `pnpm check:program && pnpm test && pnpm build && pnpm test:e2e && pnpm audit --audit-level high`; `git diff --check` | Exact exit codes, viewport/Figma diffs, timing/axe reports |
| PR lifecycle | Verify prior M as B; create isolated `phase-2/**` branch/worktree; commit C; push and open one PR; independent UX/QA audit clean C; optional evidence-only E; require program/build/audit/phase/E2E checks; merge; verify C ancestry in M; rerun clean-M gates; atomically update ledger | PR URL, B/C/E/M, source-tree equality, merge ancestry, post-merge results, successor pin |

## Definition of Done

- [ ] Dashboard and Projects implement every declared state and pass the static-report test.
- [ ] Project create/update is reflected on Dashboard through the shared authority and survives reload.
- [ ] 10,000-object fixture, axe, responsive, keyboard, timing, unit, E2E, visual, token, sheet, and build gates pass.
- [ ] Both sheets contain evidence and distinct verifier/QA sign-offs with no blocker/major finding.

## Hand-off

Phase 3 begins from the accepted Phase 2 SHA with project identity available as the parent context for
new or resumed Discover work.
