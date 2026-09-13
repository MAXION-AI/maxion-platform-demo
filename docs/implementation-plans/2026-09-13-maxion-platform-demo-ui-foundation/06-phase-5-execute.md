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

This is a **product** surface. Binding references are Devin, Manus, Vercel, Attio, and Hers. The full
sheet laws-check/state matrix apply. One blocking decision appears at a time; consequential controls are
at least 44 px and name the exact object/environment/consequence; every command acknowledges within
400 ms; long stages show real deterministic progress and expected duration.

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

Rollback restores the accepted Phase 4 UI and retains the source plan plus any readable execution event
history. There is no infrastructure rollback because this phase performs no deployment.

## Definition of Done

- [ ] All legal states and controls work in place; illegal transitions fail closed and are tested.
- [ ] Every visible result names its environment and evidence class; no simulated action claims production truth.
- [ ] State-machine, integration, E2E, responsive, accessibility, timing, 10,000-event, token, sheet, and build gates pass.
- [ ] The sheet has evidence and distinct verifier/QA sign-offs with no blocker/major finding.

## Hand-off

Phase 6 starts from the accepted Phase 5 SHA and consumes typed execution results and decisions as inputs
to persistent agent responsibilities; it does not consume Execute component state.
