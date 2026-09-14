# UX reference sheet — Execute — delivery orchestration workspace

- **Status:** contract
- **Sheet id:** execute-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Execute — delivery orchestration workspace
- **Surface class:** product
- **Target user:** Delivery owner supervising bounded agents, tests, evidence, and release approval
- **Top jobs (1–3):** Start or steer a run; inspect workspace and test state; recover failure or approve release
- **Route(s) / component(s):** /maxion-prototype → Execute · ExecuteModule · ExecuteDeliveryWorkspace

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Monitor a live orchestration | n8n | https://mobbin.com/screens/1562fe41-4f0a-48b9-b6da-ed9ebf8b9ec5 | Combine a familiar work topology with contextual chat and inspectable execution logs. |
| Recover a failed operation | Zapier | https://mobbin.com/screens/0551ccd5-c726-4e4d-b61f-05aceac62501 | Name the failing step and offer retry, troubleshoot, or handoff in place. |
| Verify a delivery run | GitHub Actions | https://mobbin.com/screens/0690bb8b-3bbb-45be-9dfa-8cef91e2956f | Keep annotations, the failing job, and rerun action together. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `20:125` ([Execute reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=20-125)) — editable 1440 × 900 live delivery workspace with steering, run, gate, and deployment-boundary states built on 2026-09-13.
- **Decisions rejected from the references and why:** Model selectors, token or cost controls, developer-machine metaphors, and chat-only approvals are rejected because capability belongs to authority, usage is in units, work is business work, and decisions must be explicit.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Workspace topology | ExecuteWorkspaceTopology | --mxp-surface-base, --mxp-border-subtle, --mxp-status-live | Connected agents show state, ownership, and the cumulative gate. |
| Run timeline | ExecuteActivity | --mxp-text-primary, --mxp-text-muted, --mxp-space-3 | Plain-language actions, durations, and verification records stay inspectable. |
| Recovery or release decision | ExecuteDecisionCard | --mxp-status-danger, --mxp-accent-primary, --mxp-focus-ring | Failure recovery and release approval are separate explicit decisions. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited values are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Keep the primary job set bounded and move rare actions into contextual menus. | At most 5 primary choices in one region | Count visible choices at desktop and mobile widths |
| Fitts's | Primary and frequent targets are large and close to the object they affect. | Primary targets at least 44 px; no target under 24 px | Computed-style and pointer review |
| Jakob's | Follow the familiar product patterns examined in n8n, Zapier, and GitHub Actions. | 3 named references applied; no novel core control | Side-by-side interaction audit |
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
| Interactivity floor | Composer in context; every state actionable; live state; no dead ends. | Static-report test passes in all declared states | Walk the flow and act on each state |

## 5. State matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Run controls | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Workspace topology nodes | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Recovery and release decisions | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** A steering composer remains available while a run is active or paused.
- **Every shown state actionable in place:** Running work can be steered or stopped; failures can be retried or handed off; release-ready work can be inspected or approved.
- **Live, not snapshot:** Elapsed time, stage, workspace status, test counts, and activity update in the live canvas.
- **Direct manipulation:** Workspace nodes can be selected and panels changed without leaving the run.
- **No dead ends:** Idle, running, paused, failed, verified, and approval-held states each expose a next action and a route back.
- **Approvals and questions separate from chat:** Release approvals and execution questions use dedicated cards rather than chat inference.

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
