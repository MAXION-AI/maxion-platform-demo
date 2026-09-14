# Phase 9: Administrative surfaces

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-13 | **Risk:** medium × medium | **Status:** Not started
- **Depends on:** Phase 8 accepted SHA

## Objective and scope

Complete Settings, Integrations, My approvals, Usage, and Help as compact, coherent administrative
surfaces. They remain in the sidebar's bottom cluster, visually subordinate to Dashboard, Projects, and
the product modules; they do not become large top-half module icons. This phase replaces catch-all account
panels with one accepted contract per destination and does not add billing, identity, or integration APIs.

## Entry criteria and UX contract

- [ ] Phase 8 DoD rerun passes.
- [ ] Phase 0-created reference sheets for all five destinations are independently accepted.
- [ ] Phase 0-created exact Figma frames for all five destinations are frozen and fetched before code.
- [ ] The sidebar information architecture is accepted: Dashboard, Projects, and product modules above the flexible spacer; Settings, Integrations, My approvals, Usage, and Help below it.

These are **product** surfaces. Each reference sheet §2 is the sole binding Mobbin authority; this
phase must not carry or substitute another app list. Every sheet must name three to five examined links
and include its full laws/state tables. Page controls use 44 px targets; the compact rail uses an
immutable 36 px row with a 16 px icon and remains above the 24 px hard floor. One
primary action, no more than seven controls per group, and acknowledgement under 400 ms remain mandatory.

- **Required surface state IDs (`settings-workspace`):** `settings.clean`, `settings.dirty`, `settings.saving`, `settings.saved`, `settings.error`, `settings.permission-denied`
- **Required surface state IDs (`integrations-workspace`):** `integrations.connected`, `integrations.degraded`, `integrations.connecting`, `integrations.reconnecting`, `integrations.disconnect-confirmation`, `integrations.empty`, `integrations.error`, `integrations.permission-denied`
- **Required surface state IDs (`approvals-workspace`):** `approvals.queue`, `approvals.review`, `approvals.submitting`, `approvals.resolved`, `approvals.stale`, `approvals.empty`, `approvals.error`, `approvals.permission-denied`
- **Required surface state IDs (`usage-workspace`):** `usage.ready`, `usage.loading`, `usage.empty`, `usage.error`, `usage.alert-editing`, `usage.permission-denied`
- **Required surface state IDs (`help-workspace`):** `help.ready`, `help.searching`, `help.results`, `help.empty`, `help.error`, `help.recovery`, `help.support-handoff`, `help.offline`

## Architecture, scale, security, and reliability

Replace `AccountUtilityModule` and the catch-all `IntegrationsModule` in `PortalReplicaModules.tsx` with
route-level compositions over typed settings, integration-health, approval, usage, and help selectors.
Administrative state is project/tenant-scoped where applicable and never contains secrets. Approval and
permission mutations are explicit, idempotent, consequence-labelled, and fail closed. A 10,000-row
approval/usage fixture virtualizes beyond 100 rows with at most 200 mounted nodes. Non-critical usage or
help data may degrade without blocking product modules.

## Ordered tasks

1. **Bind the final information architecture (9.1).** Implement the top/bottom sidebar split and route semantics exactly, including compact labels, focus order, mobile overlay, and selected states.
2. **Model administrative contracts (9.2).** Define safe settings, integration metadata/health, approval, usage, and help/search state without storing credentials or granting client authority.
3. **Build Settings and Integrations (9.3).** Implement all accepted states, validation, save feedback, connection health, reconnect/disconnect confirmation, and error recovery from their sheets.
4. **Build My approvals (9.4).** Implement scoped queues, exact object/version/consequence, approve/amend/reject, stale and permission-denied handling, filters, and return-to-owner context.
5. **Build Usage and Help (9.5).** Implement bounded usage summaries/details plus searchable contextual help, offline/error/empty states, and deep links that do not block core work.
6. **Break authority, forms, and scale (9.6).** Test invalid input, valid-format tolerance, draft preservation, duplicate submit, stale approval, cross-project ID, integration outage, 10,000 rows, keyboard, and mobile.
7. **Attach evidence and gate (9.7).** Capture all sheet states and exact-frame comparisons at 375/768/1280/1536, axe/timing/motion/load proof, and separate verifier/QA sign-offs.

## Contracts and observability

Add `UserPreference`, `IntegrationDescriptor`, `IntegrationHealth`, `AdministrativeApproval`,
`UsageRecord`, and `HelpResult`. Secret fields are never persisted, logged, or shown after entry; the demo
uses named synthetic placeholders. Structured events record object/type/result/timing/correlation only.
No API/schema/package is expected.

## Test and failure plan

Unit tests cover validation, liberal valid input normalization, idempotency, stale/denied approvals,
health derivation, usage bounds, and project isolation. Integration tests cover shared approval and
connection objects. Playwright covers the sidebar split, each destination's primary journey and all
failure states, reload, keyboard-only, mobile overlay, focus return, and large-list behavior.

| Failure | Required fallback |
| --- | --- |
| Settings save fails | Preserve valid draft, identify field/global error, and allow retry |
| Integration is unavailable | Keep core modules usable; show scoped health and recovery |
| Approval is stale or unauthorized | Fail closed without disclosing inaccessible object data |
| Usage/help source fails | Show bounded unavailable state; do not block product work |

Rollback reverts the Phase 9 candidate and restores the accepted Phase 8 shell; typed administrative
records remain backward-readable and no actual external connection is changed.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Production | Replace `AccountUtilityModule`/`IntegrationsModule` with `src/features/platform-prototype/admin/{settings,integrations,approvals,usage,help}/**`; preserve `PortalChrome` geometry; delete catch-all owners/styles | Five exclusive route/state owners; admin rows exactly 36 px/16 px |
| Tests/fixtures | Admin domain/unit/browser specs; invalid/stale/denied/outage and 10,000 approval/usage fixtures | Exact five sheet state-ID sets; ≤200 rows |
| Evidence/commands | `artifacts/ux-audits/phase-9/**`; five admin sheets; standard program/test/build/E2E/audit/diff plus computed rail geometry at 375/768/1280/1536 | State/Figma/axe/timing/geometry evidence and independent reports |
| PR lifecycle | Verify prior M as B; create isolated `phase-9/**` branch/worktree; commit C; push and open one PR; independent UX/QA audit clean C; optional evidence-only E; require program/build/audit/phase/E2E checks; merge; verify C ancestry in M; rerun clean-M gates; atomically update ledger | PR URL, B/C/E/M, source-tree equality, merge ancestry, post-merge results, successor pin |

## Definition of Done

- [ ] The sidebar visibly and semantically separates the large top product destinations from the compact bottom administrative cluster.
- [ ] All five destinations implement their accepted state matrices with safe validation and recovery.
- [ ] Unit, integration, browser, responsive, accessibility, timing, load-shaped, token, sheet, and build gates pass.
- [ ] All five sheets contain evidence and distinct verifier/QA sign-offs with no blocker/major finding.

## Hand-off

Phase 10 starts from the accepted Phase 9 SHA with no uncontracted user-facing destination and no known
blocker/major sheet finding.
