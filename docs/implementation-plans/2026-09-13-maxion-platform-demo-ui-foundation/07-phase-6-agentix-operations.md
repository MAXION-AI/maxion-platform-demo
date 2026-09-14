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

This is a **product** surface. The reference sheet §2 is the sole binding Mobbin authority; phase
prose must not declare a second app set. The sheet's complete laws-check and state matrices apply. Top navigation contains only product
modules plus Dashboard and Projects; Agentix views stay within one workspace; administrative destinations
remain in the compact bottom cluster. Queues acknowledge under 400 ms, virtualize beyond 100 rows, use
44 px primary controls, and expose one blocking decision per approval card.

- **Required surface state IDs (`agentix-operations`):** `agentix-ops.today`, `agentix-ops.work`, `agentix-ops.approvals`, `agentix-ops.activity`, `agentix-ops.connections`, `agentix-ops.empty`, `agentix-ops.degraded`, `agentix-ops.permission-denied`

## Architecture, scale, security, and reliability

Refactor `DeployedAgentsPage.tsx`, `OperationsViews.tsx`, and `operationsState.ts` around the shared
repository and typed responsibility/run/approval/connection events. The persistence cap remains explicit
and migratable; list selectors support 10,000 logical runs/activities with no more than 200 mounted rows.
All filters are deterministic and URL- or state-addressable. Connection health never exposes credentials.
Approval, activation, pause, archive, and permission changes identify object, version, role, and consequence;
production authority is not simulated by client state.

Human-owned work uses one `HumanStep` contract: immutable tenant/project/responsibility/run IDs;
`status` (`open`, `completed`, `cancelled`); `dueAt` as an RFC 3339 UTC instant; `displayTimeZone` as a
validated IANA zone; `assignee`; `escalationPolicy` with ordered level/delay/recipient records;
`escalatedThroughLevel`; and nullable `completedAt`/`cancelledAt`. `isOverdue` is derived only when
status is open and the injected `Clock.now()` is at or past `dueAt`; it is never persisted as competing
truth. Escalation is an idempotent domain command keyed by step and level, never sends to an unlisted
recipient, records one synthetic audit event, and does not widen approval authority. Tests use a fixed
clock and explicit time zones, including DST boundaries; production code may not call `Date.now()` in
the reducer or selectors.

## Ordered tasks

1. **Unify the Agentix domain (6.1).** Define responsibility, deployment version, run summary, approval,
   human-step/deadline/escalation, activity, clock, and connection-health invariants, preserving readable
   v3 state through migration.
2. **Extract selectors and commands (6.2).** Remove direct storage/view coordination; implement shared filters, counts, readiness, and degraded-state selectors plus idempotent commands.
3. **Implement the accepted operations composition (6.3).** Build Today, Work, Approvals, Activity, and Connections with shared primitives and responsive/empty/loading/error states.
4. **Complete persistent responsibility workflows (6.4).** Support deploy, pause, resume, filter, inspect version, resolve approval, diagnose connection, and recover failed state without dead ends.
5. **Bind upstream provenance (6.5).** Show source project/plan/execution object, version, environment, evidence class, and authority for every responsibility and result.
6. **Break queues, migration, and isolation (6.6).** Test 10,000 items, malformed persisted state, duplicate IDs/events, stale approvals, connection loss, permission denial, refresh, filters, and cross-project leakage attempts.
7. **Attach evidence and gate (6.7).** Capture declared states at 375/768/1280/1536, exact Figma comparison, axe/keyboard/motion/timing/load proof, and independent verifier/QA results.

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 6.1 | RC-10 and RC-14 via ADR-3 | `src/features/agentix/prototype/operationsState.ts#AgentixOperationsState`; `src/features/agentix/prototype/operationsState.ts#HumanStep`; `src/features/agentix/prototype/operationsState.ts#Clock`; `src/features/agentix/prototype/operationsState.spec.ts#migration` | Accepted Phase 5 M and ExecutionResultRef | `pnpm test -- operationsState.spec.ts` |
| 6.2 | RC-04 and RC-10 via ADR-3 | `src/features/agentix/prototype/operationsState.ts#reduceOperations`; `src/features/agentix/prototype/operationsState.ts#selectResponsibilities` | Task 6.1 versioned domain | `pnpm test -- operationsState.spec.ts -t selectors` |
| 6.3 | RC-10 and RC-15 via ADR-4 | `src/features/agentix/prototype/DeployedAgentsPage.tsx#DeployedAgentsPage`; `src/features/agentix/prototype/operations.css#agentix-operations` | Task 6.2 selector/command API | `pnpm exec playwright test tests/e2e/agentix-operations.spec.ts -g operations` |
| 6.4 | RC-10 and RC-15 via ADR-2 | `src/features/agentix/prototype/DeployedAgentsPage.tsx#ResponsibilityActions`; `tests/e2e/agentix-operations.spec.ts#agentix-ops.today` | Task 6.3 accepted composition | `pnpm exec playwright test tests/e2e/agentix-operations.spec.ts -g workflow` |
| 6.5 | RC-10 and RC-14 via ADR-5 | `src/features/platform-prototype/contracts.ts#ResponsibilityRef`; `src/features/agentix/prototype/operationsState.ts#selectResponsibilityProvenance` | Task 6.4 persistent workflows | `pnpm test -- agentixHandoff.spec.ts` |
| 6.6 | RC-15 and RC-18 via ADR-4 | `src/features/agentix/prototype/operationsState.spec.ts#isolation`; `tests/fixtures/agentix-items-10000.json#items` | Task 6.5 provenance contract | `pnpm test -- operationsState.spec.ts -t isolation` |
| 6.7 | RC-15 and RC-16 via ADR-8 | `artifacts/ux-audits/phase-6/verification.md`; `docs/operations/phase-acceptance-protocol.md#Evidence-only-closure` | Tasks 6.1 through 6.6 green at C | `python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase 6` |

## Contracts and observability

Add `AgentResponsibility`, `DeploymentVersion`, `RunSummary`, `ApprovalRequest`, `HumanStep`,
`EscalationPolicy`, `Clock`, `ActivityRecord`, and `ConnectionHealth`. All collections are
tenant/project-keyed in fixtures and bounded in browser storage.
Synthetic events record correlation/object/version/status/timing only. No credentials, real recipients,
API/schema, or new dependency are introduced.

## Test and failure plan

Unit tests cover migration, bounds, filters, counts, readiness, version transitions, stale approvals,
idempotency, deadline equality, UTC/IANA rendering, DST changes, overdue derivation, single-delivery
escalation, and tenant/project isolation. Integration tests cover upstream artifact ingestion and reload.
Playwright covers deploy→Today, filter→run open, approval resolution, degraded connection recovery,
permission denial, empty/loading/error, keyboard, mobile, and 10,000-row fixture behavior.

| Failure | Required fallback |
| --- | --- |
| Persisted Agentix state is old or partly invalid | Migrate valid records, quarantine invalid records, explain recovery |
| Connection is degraded | Preserve work and show diagnosis/retry; never expose secret material |
| Approval becomes stale | Disable submission and link to the current version/state |
| A selector cannot calculate a count | Show scoped error, not a fabricated zero |

Rerun the Phase 1 copy-on-write suite for Agentix v3 migration, including upgrade, downgrade,
future-schema preservation, crash-before-swap, quota, competing-writer, and rollback-pointer cases.

Rollback reverts the Phase 6 candidate while preserving a backward-readable persisted snapshot and all
accepted upstream artifacts.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Production | Refactor `DeployedAgentsPage.tsx`, `OperationsViews.tsx`, `operationsState.ts`; create Agentix domain/selectors/commands/components; delete replaced storage, timers, owners, selectors | One discriminated operations owner per view/state |
| Tests/fixtures | Agentix unit/browser specs; migration/stale/degraded/permission and 10,000-row fixtures | Exact eight state IDs, upstream provenance, ≤200 rows |
| Evidence/commands | `artifacts/ux-audits/phase-6/**`; operations sheet; standard program/test/build/E2E/audit/diff plus focused Agentix specs | State/viewport/Figma/axe/timing evidence and independent reports |
| PR lifecycle | Verify prior M as B; create isolated phase branch/worktree; commit clean C; independent UX/QA audit C; commit required distinct evidence-only E; merge only as a true B+E two-parent M; rerun clean-M gates; append under lock to the external authority | PR URL, B/C/E/M, protected-object equality, exact target ref, merge/PR identity, post-merge results, successor pin |

## Definition of Done

- [ ] All five operations views and all declared states are interactive, reload-safe, and project-scoped.
- [ ] Every responsibility/run/approval exposes version, provenance, environment/evidence, and authority.
- [ ] Unit, migration, integration, browser, responsive, accessibility, timing, load-shaped, token, sheet, and build gates pass.
- [ ] Evidence and distinct verifier/QA sign-offs close the sheet without blocker/major findings.

## Hand-off

Phase 7 starts from the accepted Phase 6 SHA and opens a run through a typed `RunRef`, preserving filter
and return context without sharing view-local state.

### Structured acceptance hand-off

```json
{"schemaVersion":1,"phase":6,"nextPhase":7,"status":"pending","evidence":[],"reviewers":{"ux":"pending","qa":"pending"}}
```
