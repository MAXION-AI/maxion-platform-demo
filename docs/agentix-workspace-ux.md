# Agentix — one place to work

Updated 2026-09-11. Product surface. This supersedes the screen-by-screen UX described in `agentix-initiative-demo.md`; it does not change production implementation status.

## The three jobs

1. Know what the agent is doing and whether anything needs me.
2. Steer the work without losing its context, progress or conversation.
3. Inspect the outcome and evidence without confusing a finished agent turn with a finished business task.

The previous experience violated Tesler's Law by making the viewer import, configure, activate and then manually start a “sample case” across separate screens. It violated Zeigarnik and Pareto by hiding the team and putting the conversation below long-form configuration. The Discovery promotion displaced the actual Discovery work list (Serial Position and Proximity).

## Implemented interaction model

One persistent workspace has a work list, a conversation/activity stream, a pinned composer and a context column. The existing MAXION navigation stays intact. On narrower screens the work list and context are explicit, closeable secondary views; neither becomes a new product step.

The demo opens on an already-authorized invoice case. Its analysts work independently, then the coordinator asks for the precise $240 decision inline. This is seeded demonstration work, not fabricated live customer activity. All four initiatives remain available: incident triage (one agent), invoice exceptions, onboarding and inventory (three agents each).

Discovery and natural-language entry converge on the same proposed scope inside this workspace. Activation starts the work; there is no operating-model/work/discovery tab tour. Reopening an existing running initiative does not restart it. The Discovery landing keeps its existing saved work, interview flow and nine-document deliverable reader. Completed operational designs sit in a secondary disclosure after that work, not in a promotional panel before it.

Working chat interactions: pause, resume, high priority and hold notifications. Questions explain sources, team choice, status and permission boundaries. Unknown instructions are retained in the conversation with an explicit “not applied” response; the frontend is not connected to a language model. Drafts, selected work, decisions, instructions and progress persist in versioned browser storage. No credentials or external systems are used.

ERP unknown-outcome recovery is autonomous in the simulation. It preserves the original request reference and demonstrates one create, not a retry button masquerading as autonomy. Financial approval cannot be bypassed by typing “continue.” Payroll fulfillment requires a reference. Held notification obligations remain incomplete until explicitly released. Reduced-motion preferences alter motion, never execution timing.

## UX laws acceptance matrix

| Law | Requirement | Acceptance | Verification |
|---|---|---|---|
| Hick's | Work, conversation and context, without mode selection | One primary business action in the active decision/proposal | Desktop and mobile walkthrough |
| Fitts's | Controls near their content; mobile actions comfortably tappable | Primary controls ≥44px; no target under24px; adjacent actions ≥8px gap | Browser geometry and keyboard test |
| Jakob's | Familiar left navigation, message input, Enter/Shift-Enter and Escape | Global Cmd/Ctrl-K remains the platform menu | E2E keyboard test |
| Proximity | Group each request with evidence and its action | 4–8px within groups, 16–32px between groups | CSS and screenshot review |
| Miller's | Small stable work list and scannable activity | 4 initiatives, 4–5 steps per process, 3 context sections | Fixture and screenshot checks |
| Doherty | Input and steering acknowledge immediately | <400ms feedback target; no blocking animation; long work has visible steps | Local browser walkthrough; no production latency claim |
| Von Restorff | Approval or activation is the dominant action | One filled brand action per business request; chat send uses neutral styling | Screenshot review |
| Serial Position | Current work first, steering always reachable | Invoice work opens directly; composer pinned; Discovery promotion follows existing work | Landing and viewport tests |
| Peak-End | A business result, not a toast | Durable outcome summary plus 3 inspectable record receipts | All four outcome journeys |
| Zeigarnik | Preserve and show progress | Fixed N-of-M step count; selected work and drafts survive refresh | Pause/reload E2E and state tests |
| Prägnanz | Four top-level visual regions including platform navigation | Platform nav, work list, conversation, context; compact views disclose secondary regions | 320/375/768/1280/1440px review |
| Similarity | One vocabulary for state and action | Shared status component and shared button variants | Component and screenshot review |
| Uniform connectedness | Each container represents one object | Approval facts/actions together; connectors only between process steps | Visual inspection |
| Tesler's | Agent chooses internal execution and handles recovery | No model, effort, agent-count or workflow/persona picker; no manual ERP reconciliation step | UI assertions and inventory journey |
| Postel's | Preserve imperfect input without silently applying it | Whitespace accepted; unsupported brief retained; no generic resume bypass | State and input tests |
| Parkinson's | Reach work without setup overhead | Existing work visible on entry; draft activation in one action | E2E entry and handoff tests |
| Occam's | Remove redundant product surfaces | No sample-run launcher, operating-model tabs or hidden-team requirement | UI assertions |
| Pareto | Spend attention on work, steering and verified results | These 3 jobs visible in common workspace; detailed policies/sources collapsed | Primary journey walkthrough |

## Boundaries and implementation choices

- This is a frontend simulation, not proof of OpenAI Agents SDK, Merge or Azure execution. A 3-agent screen does not prove runtime parallelism. No performance or cost savings are represented as measured business results.
- Reuse the existing React/Vite, Phosphor icons, MAXION spiral, typography and CSS token family. No new component framework, infrastructure, generated images or service dependency.
- `workspaceState.ts` owns bounded transitions and supported steering. `WorkspaceParts.tsx` owns common activity/team/decision/outcome views. `AgentixInitiativesPage.tsx` owns composition and persistence. The existing scenario evidence stays in `initiatives.ts`.
- State is version2 under a new browser-storage key. Version1 demo data is left untouched. A browser reload restores a checkpoint; no work executes while the browser is closed, and a scheduled trigger is illustrated rather than connected to a scheduler.
- User/provider text renders as React text, not raw HTML. Storage reads validate shape and bound histories. A storage failure remains usable in-memory and explicitly warns that refresh persistence is unavailable.
- Production scale, auth, tenant isolation, durable execution and provider receipts are intentionally out of this demo. The product-strength plan remains their authority. No new infrastructure is provisioned.
- Rollback: revert this UX change set. It has no migration, provider effects or cross-repository dependency; the old browser-storage key remains available.

## Verification record

See the updated unit and Playwright suites for executable coverage. Manual review covers desktop hierarchy, mobile navigation, the pinned input, actual steering and Discovery landing order. Automated checks include all four workflows, authority boundaries, partial outcomes, pause/reload, malformed storage, source handoff, keyboard behavior, responsive overflow and axe serious/critical violations. Passing a deterministic demo test is not production qualification.

Recorded checks: 18 Agentix unit tests (12 workspace and 6 legacy component regressions), 10 platform unit/integration tests, and 23 browser tests passed. Browser coverage includes 320, 375, 768, 1280 and 1440px widths, dark mode and reduced motion. A production-preview check at 125 kB/s with 150 ms latency reached the workspace in 5.48 s; opening New work after load took 90 ms in that observation. These are local observations, not production SLOs. The existing single-bundle size warning remains a cold-load limitation; this work does not claim to have solved platform-wide code splitting.
