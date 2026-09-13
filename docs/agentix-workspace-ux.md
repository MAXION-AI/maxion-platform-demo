# Agentix — deployed agents, independent work
Updated 2026-09-11. This replaces the chat-first workspace design. It is a frontend demo contract, not a production runtime sign-off.

## Primary experience
The landing page shows deployed agents and a clearly marked setup draft. Each agent owns an ongoing responsibility. Its overview shows deployment health, event/schedule intake, concurrent cases, exceptions, cycle history and verified outcomes. A blocked case does not block the entire agent.

Conversation is a secondary steering drawer. The same drawer displays case decisions, activity/evidence or team/scope, one at a time. There is no second chat workspace, workflow-versus-role selector, canvas, model selector or agent-count setting. The existing MAXION sidebar and Discovery landing hierarchy remain unchanged.

Three questions define the hierarchy: what is operating, what needs me, and what outcome was achieved? Case details disclose the business outcome and exact boundary. A waiting invoice approval cannot imply every invoice is stopped; an applied record update cannot imply verification succeeded.

## Completed gaps
| Gap | Demonstrated journey |
|---|---|
| Deployed, ongoing agents | Three seeded deployments, one draft, independent case progression, periodic incoming events, separate intake/case pause |
| Operation readiness | Onboarding supported operations, missing mapping, recheck in progress, ready to deploy |
| Unsupported operation | Request automatic payroll provisioning; deployment blocks; a support request does not certify it |
| Guided configuration repair | Diagnose London mapping ambiguity → choose approved package → read-only recheck → deploy |
| Explicit scope alternative | Owner chooses human payroll fulfillment; required obligation is retained, not silently omitted |
| Runtime repair | Expire notification connection → partial outcome → reconnect/recheck → resume outstanding obligation without repeating record write |
| Recurring work | Separate inventory cycles, occurrence identities, missed-cycle result, next scheduled occurrence and cycle history |
| Verification | Applied-but-verifying, partial, human-dependent, declined/not-completed and verified outcomes remain distinct |
| Business usefulness | Derived verified/total results, eligible autonomous completion, median cycle time, illustrative cost; no invented ROI or savings baseline |

## Controls and responsibility
Pause intake prevents admission of queued cases; already-admitted work continues. Pause case stops its next simulated action. Neither recalls effects. High priority influences queued admission, not authorization. An agent-wide notification release does not override an explicit case-specific hold.

An exact $240 invoice approval remains attached to INV-20841 v2. General chat such as “continue” cannot approve it. Human payroll fulfillment requires a named reference and subsequent verification. Unsupported and negated instructions are not silently applied. Agent-level and case-level conversations and drafts are scoped separately.

Discovery and natural-language entry converge on one readiness proposal. Importing an already-deployed responsibility preserves its deployment, cases and history; it does not create another agent or restart existing work. The four fixtures are incident triage (one agent), invoice exceptions, onboarding and inventory (one accountable coordinator plus two scoped specialists).

## UX laws acceptance matrix
| Law | Applied decision | Acceptance |
|---|---|---|
| Hick’s | Stable fleet → overview → one contextual drawer | No competing operating modes; only relevant actions |
| Fitts’s | 44px controls; 8px minimum action gap | Keyboard and touch access at 320–1440px |
| Jakob’s | Familiar fleet/work list and side panel | Escape closes, focus returns, Enter sends and Shift-Enter adds a line |
| Proximity | Status, current action and outcome belong to a case | Approvals and supporting facts stay together |
| Miller’s | Four responsibility examples; five disclosed execution stages | Default view is scannable; history starts with 20 records |
| Doherty | Local immediate feedback; explicit checking state | No blocking animation; no production-latency claim |
| Von Restorff | Readiness repair or exact approval is the local primary action | Brand accent does not compete with decorative graphics |
| Serial Position | Agent state and current workload precede metrics | Discovery saved work precedes operational handoff packages |
| Peak-End | Durable verified or not-completed record | Completion shows the business boundary, not merely a success toast |
| Zeigarnik | Independent progress and remaining obligations | Progress survives navigation/refresh; pending work stays visible |
| Prägnanz | Platform navigation, overview and one optional drawer | No simultaneous chat/cockpit/canvas panels |
| Similarity | Shared status/button vocabulary | Same states across fleet, case list and details |
| Uniform connectedness | One container represents one object | Agent deployment is not confused with its case execution |
| Tesler’s | Readiness infers known context; recovery is automatic | User supplies only unresolved mapping/decision, not technical orchestration |
| Postel’s | Preserve incomplete/unsupported input | No unknown instruction becomes a successful action |
| Parkinson’s | Open existing work immediately | New responsibilities require only their unresolved setup and activation |
| Occam’s | Retire prior chat-first state and components | One active state model; no redundant “sample run” flow |
| Pareto | Prioritize ongoing status, exceptions and outcomes | Team mechanics, evidence and controls progressively disclosed |

## Engineering and limits
operationsState.ts owns transitions; OperationsViews.tsx owns reusable views; DeployedAgentsPage.tsx owns composition/persistence. AgentixInitiativesPage.tsx preserves shell contracts and Discovery handoff. Shared scenario evidence stays in initiatives.ts. Superseded workspaceState.ts and chat-first components were removed.

The demo uses existing React/Vite, CSS, Phosphor and MAXION branding. No new dependency or infrastructure. It makes no external provider calls and contains no credentials. React renders messages as text. Storage validates shape, bounds text/history and rejects malformed references. It is not an authorization or tenant-isolation layer.

Version 3 state uses maxion-agentix-operations-v3. Older demo keys and Discovery state are untouched. At most three cases are admitted per agent; the demo stops intake at 200 retained records rather than deleting evidence. This bounded frontend is not a demonstration of 10,000-user runtime capacity. A production implementation needs durable tenant-scoped workers, scheduler, authorization, audit/effect ledger and provider verification from the implementation plan.

Cases advance while the app remains open, including when Agentix or its conversation is hidden. Closing the browser stops the simulation. “Deploy” means a simulated deployment record, not an Azure deployment. Scheduled progression uses an explicit demo-clock control; production scheduling is not connected.

## Failure, verification and rollback
Readiness failure blocks deployment. Unsupported operations remain blocked after a support request. Connection expiry preserves applied work. Notification holds remain incomplete. Malformed storage falls back safely; storage-write failure warns that refresh persistence is unavailable. Declined and missed cases never become verified.

Verification covers state transitions, concurrent cases, readiness repair, unsupported scope, explicit human dependencies, exact approvals, history/idempotency, scoped steering, DOM interactions, focus handling, 320/375/768/1280/1440px layouts, dark/reduced-motion and axe serious/critical checks. Tests are deterministic frontend evidence, not provider qualification.

Rollback is the preceding source revision, c381e7e. No migration or external effect needs reversal. The original version-2 storage remains available. This revision is local until explicitly published.

## Verification record — 2026-09-11

- TypeScript and production build passed. The existing single-bundle warning remains: approximately 1.35 MB JavaScript, 380 kB gzip. Platform-wide cold-load optimization is not claimed by this change.
- 31 Agentix unit/component checks passed: 25 deployed-operations checks and six retained legacy-component regressions.
- The targeted platform integration test for Agentix and Consult MAX passed; nine unrelated platform unit tests were not rerun in that invocation.
- All 24 browser tests passed together: 15 Agentix journeys, five global-command tests and four platform-shell tests. Includes real UI interaction, module-background progression, mobile 320–1440px, dark/reduced-motion, scoped steering, focus containment/return and axe serious/critical checks.
- Desktop fleet/overview/decision drawer and a 375px decision drawer were visually inspected in the local app browser. No new production/provider qualification is implied.
- Review corrections included case-specific holds surviving agent-wide release, separate message drafts per scope, bounded recovery/approval admission, keyboard focus containment, and preventing a second command overlay above a native agent drawer.

Changes are local on codex/agentix-deployed-agents-20260911 in maxion-platform-demo. No production repository, implementation-plan worktree, cloud resource or GitHub Pages deployment was changed.
