# Phase 5: Execute workspace

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-09 | **Risk:** high × high | **Status:** Not started
- **Depends on:** Phase 4 accepted SHA

## Objective and scope

Transform Execute into a controlled delivery workspace with explicit plan authority, environment and
evidence labels, expected durations, pause/resume/retry/rollback controls, and recoverable decision gates.
The demo remains deterministic: it visualizes simulated execution and must never describe it as a real
deployment, provider call, production verification, or rollback.

## Entry criteria and UX contract

- [ ] Phase 4 DoD rerun passes and an immutable approved `PlanArtifactRef` fixture exists.
- [ ] `docs/operations/ux-reference-sheets/execute-workspace.md` is independently accepted.
- [ ] Figma frame `UhLxGyXphdHHNLGMomBq6n:20:125` is frozen and its exact context/screenshot fetched before code.

This is a **product** surface. The reference sheet §2 is the sole binding Mobbin authority; phase
prose must not declare a second app set. The full sheet laws-check/state matrices apply. One blocking decision appears at a time; consequential controls are
at least 44 px and name the exact object/environment/consequence; every command acknowledges within
400 ms; long stages show real deterministic progress and expected duration.

- **Required surface state IDs (`execute-workspace`):** `execute.queued`, `execute.running`, `execute.paused`, `execute.blocked`, `execute.failed`, `execute.rolling-back`, `execute.completed`

## Architecture, scale, security, and reliability

Move execution behavior out of the shell's inner `ExecuteModule` and `ExecuteDeliveryWorkspace.tsx` into
a typed run state machine with idempotent commands. Environment and evidence class are enums, not badge
copy. Stage/event collections are append-only and bounded for persistence; the UI virtualizes beyond 100
events and passes a 10,000-event fixture with at most 200 mounted rows. Stop, retry, approve, and rollback
are authority-sensitive and auditable. Unknown or corrupt state fails closed; the UI never fabricates
success or promotes `simulated` evidence to `production-verified`.

## Ordered tasks

1. **Define the execution state machine (5.1).** Model queued/running/paused/blocked/failed/rolling-back/completed states, legal transitions, environments, evidence classes, and idempotent commands.
2. **Extract Execute ownership (5.2).** Remove shell-coupled booleans and timers; split timeline, decision, artifact, environment, evidence, and command components around selectors.
3. **Implement the accepted frame (5.3).** Build the dominant run workspace, compact evidence rail, stage timeline, expected-duration copy, shared states, and responsive reflow.
4. **Implement controls and recovery (5.4).** Make pause, resume, steer, stop, retry, approve/amend, and rollback actionable with pending, success, failure, disabled, and stale-command states.
5. **Bind plan and result provenance (5.5).** Require an approved source plan; emit typed result/evidence/object refs with explicit simulated environment and no unsupported release claim.
6. **Break transitions and load behavior (5.6).** Test duplicate/out-of-order events, refresh mid-run, stale approval, retry storms, timeout, permission denial, rollback failure, corrupt state, and 10,000 events.
7. **Attach evidence and gate (5.7).** Capture every state and recovery at 375/768/1280/1536, exact Figma comparison, axe/keyboard/motion/timing, and independent verifier/QA sign-offs.

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 5.1 | RC-09 and RC-14 via ADR-5 | `src/features/platform-prototype/execute/machine.ts#ExecutionState`; `src/features/platform-prototype/execute/machine.spec.ts#transitions` | Accepted Phase 4 M and approved PlanArtifactRef | `pnpm test -- execute/machine.spec.ts` |
| 5.2 | RC-04 and RC-09 via ADR-3 | `src/features/platform-prototype/execute/ExecuteWorkspace.tsx#ExecuteWorkspace`; `src/features/platform-prototype/execute/machine.ts#reduceExecution` | Task 5.1 state machine | `pnpm test -- execute/ExecuteWorkspace.spec.tsx` |
| 5.3 | RC-09 and RC-15 via ADR-4 | `src/features/platform-prototype/execute/components/ExecutionTimeline.tsx#ExecutionTimeline`; `src/features/platform-prototype/execute/execute.css#execute-workspace` | Task 5.2 selector-driven ownership | `pnpm exec playwright test tests/e2e/execute-command-layer.spec.ts -g composition` |
| 5.4 | RC-09 and RC-15 via ADR-5 | `src/features/platform-prototype/execute/commands.ts#executeCommand`; `tests/e2e/execute-command-layer.spec.ts#execute.paused` | Task 5.3 accepted composition | `pnpm exec playwright test tests/e2e/execute-command-layer.spec.ts -g recovery` |
| 5.5 | RC-09 and RC-14 via ADR-5 | `src/features/platform-prototype/contracts.ts#ExecutionResultRef`; `src/features/platform-prototype/execute/selectors.ts#selectExecutionEvidence` | Task 5.4 legal command transitions | `pnpm test -- execute/handoff.spec.ts` |
| 5.6 | RC-15 and RC-18 via ADR-4 | `src/features/platform-prototype/execute/machine.spec.ts#load`; `tests/fixtures/execute-events-10000.json#events` | Task 5.5 result provenance | `pnpm test -- execute/machine.spec.ts -t load` |
| 5.7 | RC-15 and RC-16 via ADR-8 | `artifacts/ux-audits/phase-5/verification.md`; `docs/operations/phase-acceptance-protocol.md#Evidence-only-closure` | Tasks 5.1 through 5.6 green at C | `python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase 5` |

## Contracts and observability

Add `ExecutionRun`, `ExecutionStage`, `ExecutionCommand`, `ExecutionEnvironment`, `ExecutionEvidence`,
`ExecutionDecision`, and `ExecutionResultRef`. Commands include idempotency key, expected source version,
actor role, and consequence. Synthetic structured telemetry records transition, latency, result, and
correlation ID without payload content. No API/schema/package is expected in the demo.

## Test and failure plan

Unit tests exhaust legal/illegal state transitions and evidence promotion rules. Integration tests prove
approved-plan ingestion, reload, idempotency, and result readback. Playwright runs start→pause→resume,
decision approve/amend, failure→retry, failure→rollback, stale control, keyboard-only, mobile, and reduced-
motion journeys under throttling.

| Failure | Required fallback |
| --- | --- |
| Command is duplicated or arrives stale | Apply at most once; show current canonical state |
| Simulated stage fails | Preserve evidence and source plan; expose retry/rollback without claiming release |
| Rollback simulation fails | End in explicit blocked state with preserved recovery path |
| Environment/evidence metadata is missing | Fail closed and suppress completion language |

Rerun the Phase 1 copy-on-write suite for execution history, including upgrade, downgrade, future-schema
preservation, crash-before-swap, quota, competing-writer, and rollback-pointer cases.

Rollback restores the accepted Phase 4 UI and retains the source plan plus any readable execution event
history. There is no infrastructure rollback because this phase performs no deployment.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Production | Create `src/features/platform-prototype/execute/{ExecuteWorkspace.tsx,machine.ts,selectors.ts,commands.ts,execute.css}` and `execute/components/**`; replace `ExecuteDeliveryWorkspace.tsx`/`ExecuteHubModule` with folder entry exports and delete replaced timers/styles/owners | One folder-owned Execute state machine and one owner per command |
| Tests/fixtures | State-machine/command tests; Execute unit/browser specs; stale/race/failure/rollback/10,000-event fixtures | Exact seven state IDs; evidence-class safety; ≤200 events |
| Evidence/commands | `artifacts/ux-audits/phase-5/**`; Execute sheet; standard program/test/build/E2E/audit/diff commands plus focused Execute specs | State/viewport/Figma/axe/timing evidence and independent reports |
| PR lifecycle | Verify prior M as B; create isolated phase branch/worktree; commit clean C; independent UX/QA audit C; commit required distinct evidence-only E; merge only as a true B+E two-parent M; rerun clean-M gates; append under lock to the external authority | PR URL, B/C/E/M, protected-object equality, exact target ref, merge/PR identity, post-merge results, successor pin |

## Definition of Done

- [ ] All legal states and controls work in place; illegal transitions fail closed and are tested.
- [ ] Every visible result names its environment and evidence class; no simulated action claims production truth.
- [ ] State-machine, integration, E2E, responsive, accessibility, timing, 10,000-event, token, sheet, and build gates pass.
- [ ] The sheet has evidence and distinct verifier/QA sign-offs with no blocker/major finding.

## Hand-off

Phase 6 starts from the accepted Phase 5 SHA and consumes typed execution results and decisions as inputs
to persistent agent responsibilities; it does not consume Execute component state.

### Structured acceptance hand-off

```json
{"schemaVersion":1,"phase":5,"nextPhase":6,"status":"pending","evidence":[],"reviewers":{"ux":"pending","qa":"pending"}}
```
