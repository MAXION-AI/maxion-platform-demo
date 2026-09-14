# Phase 7: Agentix run canvas

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-11 | **Risk:** high × high | **Status:** Not started
- **Depends on:** Phase 6 accepted SHA

## Objective and scope

Deliver the live Agentix run canvas as an operable workspace: the operator can inspect current work,
steer or stop it, answer questions, approve or amend proposals, recover failures, and open or revise the
resulting object. The phase replaces static-report behavior; it does not fabricate provider execution,
machine details, pull requests, spend, or production evidence.

## Entry criteria and UX contract

- [ ] Phase 6 DoD rerun passes and a typed `RunRef` opens from every applicable operations view.
- [ ] `docs/operations/ux-reference-sheets/agentix-run-canvas.md` is independently accepted.
- [ ] Editable Figma node `UhLxGyXphdHHNLGMomBq6n:46:933` and its local component mappings are frozen and fetched before code.

This is a **product** surface. The reference sheet §2 is the sole binding Mobbin authority; phase
prose must not declare a second app set. The sheet's nineteen-row laws/interactivity table and two state
matrices are binding. The composer remains in context, the live focus has one filled primary control,
targets are at least 44 px, acknowledgement is under 400 ms, and every terminal state ends on an object,
its evidence, and a next action.

- **Required surface state IDs (`agentix-run-canvas`):** `run.idle`, `run.live`, `run.question`, `run.approval`, `run.failed`, `run.disconnected`, `run.completed`

## Architecture, scale, security, and reliability

Refactor `DeployedAgentsPage.tsx` and `OperationsViews.RunDetail` over the shared run state machine. Timeline,
live focus, composer, question, approval, artifact, evidence, and command surfaces consume selectors and
dispatch idempotent intents. A 10,000-event fixture keeps mounted events at 200 or fewer; follow-tail may
not steal focus or override an operator who has scrolled away. Stop and approval actions are fail-closed,
authority-bound, and audit-shaped. Untrusted message/artifact content is rendered safely and bounded.
Connection loss preserves the draft and exposes reconnect/retry without inventing progress.
Question and approval waits reuse Phase 6 `HumanStep` and its injected `Clock`: the canvas renders the
same UTC deadline in its declared IANA display zone, derives overdue without a second stored flag, shows
the next escalation level/recipient without exposing secret contact data, and dispatches an idempotent
escalation command only when policy and authority allow it. Refresh/reconnect cannot duplicate an
escalation or move a deadline.

## Ordered tasks

1. **Model the run interaction contract (7.1).** Define run focus, timeline events, questions, proposals,
   approvals, HumanStep deadline/escalation links, composer intents, artifacts, evidence, and legal
   terminal states with invariants.
2. **Decompose the run canvas (7.2).** Extract direct timers/local state and split the page into independently testable selector-driven regions.
3. **Implement the exact-node composition (7.3).** Match the accepted canvas hierarchy, density, responsive behavior, shared tokens/primitives, skeletons, and error boundaries.
4. **Make every state actionable (7.4).** Implement steer, stop, answer, approve, amend, edit, regenerate, retry, reconnect, and return-to-operations flows with focus-safe keyboard behavior.
5. **Bind authority, provenance, and endings (7.5).** Separate questions from approvals; show exact object/version/consequence; end successful runs on the produced object, evidence, and next action.
6. **Break live behavior (7.6).** Test rapid/duplicate commands, stale approval, stop race, out-of-order events, disconnect/reconnect, corrupt event, hostile text, refresh, 10,000 events, and cross-project access attempts.
7. **Attach evidence and gate (7.7).** Capture all seven sheet states and recoveries at 375/768/1280/1536, exact-node comparison, axe/keyboard/motion/timing/load results, and independent verifier/QA sign-offs.

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 7.1 | RC-11 and RC-14 via ADR-5 | `src/features/agentix/prototype/runState.ts#AgentixRunState`; `src/features/agentix/prototype/runState.ts#RunHumanStepRef`; `src/features/agentix/prototype/runState.spec.ts#invariants` | Accepted Phase 6 M and ResponsibilityRef | `pnpm test -- runState.spec.ts` |
| 7.2 | RC-04 and RC-11 via ADR-3 | `src/features/agentix/prototype/DeployedAgentsPage.tsx#RunCanvas`; `src/features/agentix/prototype/runState.ts#reduceRun` | Task 7.1 interaction contract | `pnpm test -- DeployedAgentsPage.spec.tsx` |
| 7.3 | RC-11 and RC-15 via ADR-4 | `src/features/agentix/prototype/DeployedAgentsPage.tsx#RunCanvas`; `src/features/agentix/prototype/workspace.css#run-canvas` | Task 7.2 selector-driven regions | `pnpm exec playwright test tests/e2e/agentix-operations.spec.ts -g run-canvas` |
| 7.4 | RC-11 and RC-15 via ADR-2 | `src/features/agentix/prototype/runState.ts#runCommand`; `tests/e2e/agentix-operations.spec.ts#run.live` | Task 7.3 exact-node composition | `pnpm exec playwright test tests/e2e/agentix-operations.spec.ts -g run-state` |
| 7.5 | RC-11 and RC-14 via ADR-5 | `src/features/platform-prototype/contracts.ts#AgentixRunResultRef`; `src/features/agentix/prototype/runState.ts#selectRunEnding` | Task 7.4 actionable states | `pnpm test -- runHandoff.spec.ts` |
| 7.6 | RC-15 and RC-18 via ADR-4 | `src/features/agentix/prototype/runState.spec.ts#races`; `tests/fixtures/agentix-events-10000.json#events` | Task 7.5 terminal authority | `pnpm test -- runState.spec.ts -t races` |
| 7.7 | RC-15 and RC-16 via ADR-8 | `artifacts/ux-audits/phase-7/verification.md`; `docs/operations/phase-acceptance-protocol.md#Evidence-only-closure` | Tasks 7.1 through 7.6 green at C | `python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase 7` |

## Contracts and observability

Add `RunFocus`, `RunEvent`, `RunQuestion`, `RunProposal`, `RunApproval`, `RunArtifact`, and
`RunComposerIntent` while reusing `RunRef`, `AuthorityBoundary`, `EvidenceRef`, and environment types.
Synthetic transition events include correlation/run/object IDs, command latency, and result; they exclude
prompt body, artifact body, credentials, and PII. No server/API/schema/package is planned.

## Test and failure plan

Unit tests cover legal transitions, command idempotency, authority checks, event ordering, follow-tail,
terminal requirements, and schema migration. Integration tests prove operations→run→operations continuity.
Playwright covers steer/stop, question answer, proposal amend/approve, artifact edit/regenerate, failure
recovery, reconnect, refresh, exact-deadline/overdue/escalation states under a fixed clock and DST zone,
keyboard-only, mobile, reduced motion, and large-event behavior.

| Failure | Required fallback |
| --- | --- |
| Connection drops while composing | Preserve the draft and mark the run stale; reconnect explicitly |
| Stop and completion race | Resolve once from canonical ordering and explain the resulting terminal state |
| Approval is stale or unauthorized | Fail closed, retain the response draft, and open current context |
| Terminal event lacks object/evidence | Render incomplete/blocked, not successful completion |

Rerun the Phase 1 copy-on-write suite for run events and drafts, including upgrade, downgrade,
future-schema preservation, crash-before-swap, quota, competing-writer, and rollback-pointer cases.

Rollback reverts the Phase 7 candidate, retains Phase 6 summaries, and leaves all readable run history
available through the prior operations experience.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Production | Refactor `DeployedAgentsPage.tsx` and `OperationsViews.tsx#RunDetail`; create Agentix run domain/selectors/commands/components; delete direct timers/local-state/predecessor styles | Canonical URL-addressed RunRef opens one run owner |
| Tests/fixtures | Run unit/browser specs; race/stale/disconnect/hostile/10,000-event fixtures | Exact seven state IDs, authority-safe endings, ≤200 events |
| Evidence/commands | `artifacts/ux-audits/phase-7/**`; run sheet; standard program/test/build/E2E/audit/diff plus focused run specs | State/viewport/Figma/axe/timing evidence and independent reports |
| PR lifecycle | Verify prior M as B; create isolated phase branch/worktree; commit clean C; independent UX/QA audit C; commit required distinct evidence-only E; merge only as a true B+E two-parent M; rerun clean-M gates; append under lock to the external authority | PR URL, B/C/E/M, protected-object equality, exact target ref, merge/PR identity, post-merge results, successor pin |

## Definition of Done

- [ ] Every visible canvas state has an in-place action or explicit recovery; the static-report test passes.
- [ ] Question and approval semantics are distinct, authority-bound, and stale-safe.
- [ ] Every successful ending exposes object, evidence, next action, environment, and evidence class.
- [ ] Unit, integration, E2E, responsive, accessibility, timing, load-shaped, token, sheet, and build gates pass with distinct sign-offs.

## Hand-off

Phase 8 starts from the accepted Phase 7 SHA with Consult able to cite and deep-link to run objects and
evidence without acquiring run mutation authority.

### Structured acceptance hand-off

```json
{"schemaVersion":1,"phase":7,"nextPhase":8,"status":"pending","evidence":[],"reviewers":{"ux":"pending","qa":"pending"}}
```
