# UX reference sheet — Agentix — deployed agents and operations

- **Status:** contract
- **Sheet id:** agentix-operations
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Agentix — deployed agents and operations
- **Surface class:** product
- **Target user:** Operations owner supervising persistent agent responsibilities and individual cases
- **Top jobs (1–3):** Find deployed responsibilities; filter cases needing review; open and resolve a run
- **Route(s) / component(s):** /maxion-prototype → Agentix · DeployedAgentsPage · OperationsViews

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Triage agent work | Relevance AI | https://mobbin.com/screens/c9df4ae4-6265-48ac-8e16-95220d542fce | Use familiar work queues for all, review, escalated, errored, and completed states. |
| Scan run status | Copy.ai | https://mobbin.com/screens/fdd8be37-4e6c-4049-ad43-6e6448a380b0 | Keep status filters and run rows together with clear outcome language. |
| Inspect operational health | Databricks | https://mobbin.com/screens/06b7cd16-d98c-423c-970d-ead120b13b54 | Pair summary health with the detailed run table and top failure reason. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `21:175` ([Agentix operations reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=21-175)) — editable 1440 × 900 live operations surface with attached approvals, questions, agent status, activity, and steering composer built on 2026-09-13. The run canvas is separately governed by editable node `46:933` in the same file.
- **Decisions rejected from the references and why:** Model selectors, token or cost controls, developer-machine metaphors, and chat-only approvals are rejected because capability belongs to authority, usage is in units, work is business work, and decisions must be explicit.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Deployed responsibility list | DeployedAgentsPage | --mxp-surface-base, --mxp-text-primary, --mxp-space-4 | Responsibilities lead with purpose, live status, next run, and owner. |
| Operations queue | OperationsViews | --mxp-surface-raised, --mxp-border-subtle, --mxp-status-warning | Cases can be filtered by decision, failure, and completed outcome. |
| Run entry | AgentixRunCanvas | --mxp-accent-primary, --mxp-focus-ring, --mxp-radius-md | Each row opens the live case rather than a static report. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited values are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Keep the primary job set bounded and move rare actions into contextual menus. | At most 5 primary choices in one region | Count visible choices at desktop and mobile widths |
| Fitts's | Primary and frequent targets are large and close to the object they affect. | Primary targets at least 44 px; no target under 24 px | Computed-style and pointer review |
| Jakob's | Follow the familiar product patterns examined in Relevance AI, Copy.ai, and Databricks. | 3 named references applied; no novel core control | Side-by-side interaction audit |
| Proximity | Keep labels, state, and actions with the object they describe. | 8 px within a group; at least 16 px between groups | Screenshot measurement |
| Miller's | Chunk dense work into named, scannable groups. | 5 to 7 items per uncollapsed group | DOM and screenshot count |
| Doherty | Acknowledge every interaction immediately and show durable progress for longer work. | Visual response within 400 ms | Playwright timing assertion |
| Von Restorff | Give one primary next action the strongest emphasis. | Exactly 1 primary action per decision state | Visual hierarchy audit |
| Serial Position | Put identity and current state first; put the terminal action after its evidence. | Primary context in first viewport; terminal action last | Keyboard and reading-order audit |
| Peak-End | End completed work with a result, evidence, and useful next action. | Completion receipt has all 3 elements | Completion-state test |
| Zeigarnik | Keep incomplete work and its remaining step visible. | Step N of M or explicit remaining item | State-transition assertion |
| Prägnanz | Preserve one dominant workspace with quiet supporting rails. | 1 dominant work region | Screenshot hierarchy review |
| Similarity | Controls with the same role use the same component and wording. | 1 visual treatment per role | Component inventory review |
| Uniform Connectedness | Enclose related state and actions; separate unrelated decisions. | Every action is inside or immediately adjacent to its object | DOM relationship audit |
| Tesler's | Resolve system complexity before asking the user for a bounded decision. | At most 1 user decision per card | Decision-card review |
| Postel's | Accept forgiving text input and preserve it on recoverable failure. | Trim outer whitespace; never lose valid input | Unit and E2E failure test |
| Parkinson's | Keep the top jobs short and make long-running work autonomous. | Top job at most 3 actions before progress starts | Happy-path action count |
| Occam's | Remove duplicate routes and controls that do the same thing. | No duplicate primary control in one viewport | Control inventory review |
| Pareto | Put the top three jobs ahead of secondary metadata. | All 3 top jobs reachable in first viewport | Desktop and mobile screenshot audit |
| Interactivity floor | Composer in context; every state actionable; live state; no dead ends. | Static-report test passes for 8 declared states | Walk the flow and act on each state |

## 5. State matrices

### 5.1 Semantic surface-state matrix

| State ID | Fixture / event | Visible content | Permitted actions | Recovery / next state | Responsive evidence | Figma / textual authority |
| --- | --- | --- | --- | --- | --- | --- |
| agentix-ops.today | Seeded current responsibilities | Needs-you work, active runs, outcomes, and composer | Resolve item, inspect run, or start bounded work | agentix-ops.approvals or run.live | Four viewport captures | Figma 21:175 |
| agentix-ops.work | Work queue selected | Filtered runs with status, owner, and next action | Filter, open run, or return to Today | run.live or agentix-ops.today | Four viewports | §2 Relevance AI |
| agentix-ops.approvals | Approval queue selected | Exact request summaries, due state, and assignee | Open and decide one request | run.approval or agentix-ops.today | Four viewports | Textual authority: attached approvals |
| agentix-ops.activity | Activity selected | Bounded chronological events and object links | Filter or open owning object | Corresponding surface | Four viewports | Figma 21:175 |
| agentix-ops.connections | Connections selected | Principal, scopes, health, and dependencies | Diagnose or reconnect | agentix-ops.today or integrations.degraded | Four viewports | Textual authority: connection contract |
| agentix-ops.empty | No deployed responsibility fixture | Explanation and one deploy/create path | Start deployment or return to project | agentix-ops.today | Four viewports | Textual authority: empty-state law |
| agentix-ops.degraded | Connection or provider degraded | Affected work, last safe state, and recovery action | Retry, reconnect, or hand off | agentix-ops.connections or run.failed | Four viewports | §2 Databricks |
| agentix-ops.permission-denied | Viewer opens restricted operation | No protected detail; role explanation and return | Return or request access | agentix-ops.today | Mobile and desktop captures | Textual authority: permission contract |

### 5.2 Control interaction-state matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Responsibility navigation | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Case filters | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Case row and next action | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** The run canvas supplies the contextual composer; list screens expose direct create and search actions.
- **Every shown state actionable in place:** Approval, question, failure, scheduled, running, and completed cases each open the exact action needed.
- **Live, not snapshot:** Responsibility health and case status derive from the same in-session operations state.
- **Direct manipulation:** Users filter the queue and act on the selected case in place; decorative cards are avoided.
- **No dead ends:** Empty filters offer a reset; failed cases offer recovery; human fulfillment names the owner; all views retain navigation.
- **Approvals and questions separate from chat:** Questions and approvals have different queue states and different decision cards.

## 7. Evidence (filled at gate; pending is allowed only while Status is contract)

| Check | Artifact path (repo-relative) | Result |
| --- | --- | --- |
| Side-by-side: built screen vs Figma frame vs Mobbin reference | pending | pending |
| Token lint (`scripts/check_ux_tokens.py`) | pending | pending |
| State-matrix test (every §5 cell rendered) | pending | pending |
| Accessibility check (WCAG 2.1 AA, keyboard, reduced motion) | pending | pending |
| Visual regression vs approved frame (tolerance stated) | pending | pending |
| Independent audit report (law + reference per finding) | pending | pending |
| Static-report test on every state | pending | pending |

## 8. Sign-off (three distinct people or sessions; the builder never certifies)

- **Builder:** Codex session 2026-09-13 — 2026-09-13
- **Verifier:** unassigned independent session — pending
- **QA:** unassigned QA session — pending
