# Phase 6: Agentix operations

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-10 | **Risk:** high × high | **Status:** Not started
- **Depends on:** Phase 5 accepted SHA

## Objective and scope

Make Agentix the persistent operating layer for deployed responsibilities: Today, Work, Approvals,
Activity, and Connections share one canonical model, while versions, readiness, degraded dependencies,
filters, and recovery remain visible. This phase owns the portfolio/queue experience, not the detailed
single-run canvas delivered in Phase 7.

## Entry criteria and UX contract

- [ ] Phase 5 DoD rerun passes with typed execution result fixtures.
- [ ] `docs/operations/ux-reference-sheets/agentix-operations.md` is independently accepted.
- [ ] Figma frame `UhLxGyXphdHHNLGMomBq6n:21:175` is frozen and fetched before code.

This is a **product** surface. Binding references are Relevance AI, Lindy, Stack AI, Copy.ai, and
Databricks. The sheet's complete laws-check and state matrix apply. Top navigation contains only product
modules plus Dashboard and Projects; Agentix views stay within one workspace; administrative destinations
remain in the compact bottom cluster. Queues acknowledge under 400 ms, virtualize beyond 100 rows, use
44 px primary controls, and expose one blocking decision per approval card.

## Architecture, scale, security, and reliability

Refactor `DeployedAgentsPage.tsx`, `OperationsViews.tsx`, and `operationsState.ts` around the shared
repository and typed responsibility/run/approval/connection events. The persistence cap remains explicit
and migratable; list selectors support 10,000 logical runs/activities with no more than 200 mounted rows.
All filters are deterministic and URL- or state-addressable. Connection health never exposes credentials.
Approval, activation, pause, archive, and permission changes identify object, version, role, and consequence;
production authority is not simulated by client state.

## Ordered tasks

1. **Unify the Agentix domain (6.1).** Define responsibility, deployment version, run summary, approval, activity, and connection-health invariants, preserving readable v3 state through migration.
2. **Extract selectors and commands (6.2).** Remove direct storage/view coordination; implement shared filters, counts, readiness, and degraded-state selectors plus idempotent commands.
3. **Implement the accepted operations composition (6.3).** Build Today, Work, Approvals, Activity, and Connections with shared primitives and responsive/empty/loading/error states.
4. **Complete persistent responsibility workflows (6.4).** Support deploy, pause, resume, filter, inspect version, resolve approval, diagnose connection, and recover failed state without dead ends.
5. **Bind upstream provenance (6.5).** Show source project/plan/execution object, version, environment, evidence class, and authority for every responsibility and result.
6. **Break queues, migration, and isolation (6.6).** Test 10,000 items, malformed persisted state, duplicate IDs/events, stale approvals, connection loss, permission denial, refresh, filters, and cross-project leakage attempts.
7. **Attach evidence and gate (6.7).** Capture declared states at 375/768/1280/1536, exact Figma comparison, axe/keyboard/motion/timing/load proof, and independent verifier/QA results.

## Contracts and observability

Add `AgentResponsibility`, `DeploymentVersion`, `RunSummary`, `ApprovalRequest`, `ActivityRecord`, and
`ConnectionHealth`. All collections are tenant/project-keyed in fixtures and bounded in browser storage.
Synthetic events record correlation/object/version/status/timing only. No credentials, real recipients,
API/schema, or new dependency are introduced.

## Test and failure plan

Unit tests cover migration, bounds, filters, counts, readiness, version transitions, stale approvals,
idempotency, and tenant/project isolation. Integration tests cover upstream artifact ingestion and reload.
Playwright covers deploy→Today, filter→run open, approval resolution, degraded connection recovery,
permission denial, empty/loading/error, keyboard, mobile, and 10,000-row fixture behavior.

| Failure | Required fallback |
| --- | --- |
| Persisted Agentix state is old or partly invalid | Migrate valid records, quarantine invalid records, explain recovery |
| Connection is degraded | Preserve work and show diagnosis/retry; never expose secret material |
| Approval becomes stale | Disable submission and link to the current version/state |
| A selector cannot calculate a count | Show scoped error, not a fabricated zero |

Rollback reverts the Phase 6 candidate while preserving a backward-readable persisted snapshot and all
accepted upstream artifacts.

## Definition of Done

- [ ] All five operations views and all declared states are interactive, reload-safe, and project-scoped.
- [ ] Every responsibility/run/approval exposes version, provenance, environment/evidence, and authority.
- [ ] Unit, migration, integration, browser, responsive, accessibility, timing, load-shaped, token, sheet, and build gates pass.
- [ ] Evidence and distinct verifier/QA sign-offs close the sheet without blocker/major findings.

## Hand-off

Phase 7 starts from the accepted Phase 6 SHA and opens a run through a typed `RunRef`, preserving filter
and return context without sharing view-local state.
