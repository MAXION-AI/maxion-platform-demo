# UX reference sheet — MAXION platform shell and operating dashboard

- **Status:** contract
- **Sheet id:** platform-shell-dashboard
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** MAXION platform shell and operating dashboard
- **Surface class:** product
- **Target user:** Enterprise operator moving between Discover, Plan, Execute, Agentix, and Consult MAX
- **Top jobs (1–3):** See what needs attention; enter the right module; recover the last active context
- **Route(s) / component(s):** /maxion-prototype · MaxionPlatformPrototypePage · PortalChrome

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Start or route work | Cursor | https://mobbin.com/screens/b0eb16b6-7038-4d01-a59b-3a1e8a602dd4 | Lead with one intent entry and a short set of concrete starting jobs. |
| Orient across the product | Microsoft Copilot | https://mobbin.com/screens/79f6aa12-4967-46a0-b6fa-43462f8c8294 | Keep the familiar rail, greeting, composer, and suggested actions hierarchy. |
| Begin one primary job | v0 | https://mobbin.com/screens/f14348f9-fcff-40bc-ab20-be39fa45ad95 | Make the primary intent unmistakable and keep secondary destinations quiet. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `16:2` ([Dashboard reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=16-2)) — editable 1440 × 900 product frame built from the code-aligned Maxion variables and components on 2026-09-13.
- **Decisions rejected from the references and why:** Model selectors, token or cost controls, developer-machine metaphors, and chat-only approvals are rejected because capability belongs to authority, usage is in units, work is business work, and decisions must be explicit.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Product navigation destinations | PortalChrome product tier | --mxp-surface-raised, --mxp-text-muted, --mxp-control-lg | Seven frequent product destinations in the upper region, with 44 px rows and 20 px icons. |
| Administrative navigation | PortalChrome administration tier | --mxp-surface-raised, --mxp-text-muted, --mxp-control-md | Units and five compact administrative destinations are bottom-anchored, with 36 px rows and 16 px icons. |
| Attention summary | AttentionCard | --mxp-status-warning, --mxp-border-subtle, --mxp-radius-md | Actionable state with owner, consequence, and next step. |
| Cross-module command | CommandPalette | --mxp-focus-ring, --mxp-shadow-dialog, --mxp-space-4 | One searchable route into any important job. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited values are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Keep product work and administrative work in separate bounded regions. | 7 product destinations above; 5 administrative destinations below | Count named destinations at desktop and mobile widths |
| Fitts's | Product targets carry stronger weight while compact administrative targets remain accessible. | Product rows 44 px with 20 px icons; administration rows 36 px with 16 px icons; no target under 24 px | Computed-style and pointer review |
| Jakob's | Follow the familiar product patterns examined in Cursor, Microsoft Copilot, and v0. | 3 named references applied; no novel core control | Side-by-side interaction audit |
| Proximity | Keep labels, state, and actions with the object they describe; separate product and administration by flexible space. | 4 px within each group; administration begins in the lower half of a 900 px frame | Screenshot measurement |
| Miller's | Chunk the rail into product and administrative groups. | 7 product items and 5 administrative items; neither group exceeds 7 | DOM and screenshot count |
| Doherty | Acknowledge every interaction immediately and show durable progress for longer work. | Visual response within 400 ms | Playwright timing assertion |
| Von Restorff | Give one primary next action the strongest emphasis. | Exactly 1 primary action per decision state | Visual hierarchy audit |
| Serial Position | Put identity and current state first; put the terminal action after its evidence. | Primary context in first viewport; terminal action last | Keyboard and reading-order audit |
| Peak-End | End completed work with a result, evidence, and useful next action. | Completion receipt has all 3 elements | Completion-state test |
| Zeigarnik | Keep incomplete work and its remaining step visible. | Step N of M or explicit remaining item | State-transition assertion |
| Prägnanz | Preserve one dominant workspace with quiet supporting rails. | 1 dominant work region | Screenshot hierarchy review |
| Similarity | Product destinations share one treatment; administrative destinations share a smaller subordinate treatment. | Exactly 2 role-specific treatments: product and administration | Component inventory review |
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
| Module navigation | Seven registered destinations visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | N/A because registered product destinations are never disabled; a module failure stays recoverable behind the rail | N/A because the local route-state change is synchronous | N/A because the seven-destination product set is fixed by contract | Destination error boundary leaves the rail operable and offers Dashboard recovery |
| Administrative navigation | Five destinations bottom-anchored and ready | Subordinate role highlight | 2 px focus ring | Pressed feedback | N/A because authorized administrative destinations are never rendered disabled | N/A because the local route-state change is synchronous | N/A because the five-destination administration set is fixed by contract | Destination error boundary leaves the rail operable and offers Dashboard recovery |
| Primary attention action | Visible only when an actionable item exists | Role-consistent highlight | 2 px focus ring | Pressed feedback | N/A because unavailable or unauthorized actions are omitted, not shown disabled | N/A because the action routes synchronously to the owning module | The attention region explains that nothing needs the operator | Owning module error boundary preserves Dashboard recovery |
| Command palette | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | N/A because the local command registry has no unavailable command state | N/A because filtering the in-memory bounded registry is synchronous | “No commands match” preserves the query and dismissal path | N/A because the command registry has no network or fallible dependency |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** The global command composer stays reachable from every module.
- **Every shown state actionable in place:** Each alert routes directly to its decision or recovery surface.
- **Live, not snapshot:** Badges and summaries read the same lifted live session state as the modules.
- **Direct manipulation:** Module destinations and attention cards are actionable in place; cards are not decorative.
- **No dead ends:** Every destination offers global navigation, command search, and a route back to the dashboard.
- **Approvals and questions separate from chat:** Approvals open their dedicated decision card; exploratory questions remain in Consult MAX.

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
