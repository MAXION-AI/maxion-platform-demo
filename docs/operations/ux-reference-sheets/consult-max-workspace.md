# UX reference sheet — Consult MAX — cross-platform conversation

- **Status:** contract
- **Sheet id:** consult-max-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Consult MAX — cross-platform conversation
- **Surface class:** product
- **Target user:** Enterprise operator asking for current, authorized truth across all MAXION work
- **Top jobs (1–3):** Ask what changed; explain why a decision was made; route directly to the responsible module
- **Route(s) / component(s):** /maxion-prototype → Consult MAX · ConsultModule

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Inspect answer provenance | ChatGPT | https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e | Keep activity and sources accessible beside the answer. |
| Constrain answer sources | Perplexity | https://mobbin.com/screens/c958df0d-640c-487b-a58c-2c96c8a3e93a | Put the scope and source mode next to the composer. |
| Keep sources under the answer | Sana AI | https://mobbin.com/screens/9098947d-d197-4f05-a54d-de310aa638be | Attach source evidence to the claim it supports and retain a direct follow-up path. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `22:225` ([Consult MAX reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=22-225)) — editable 1440 × 900 grounded cross-platform conversation with sources, answer scope, action, and composer built on 2026-09-13.
- **Decisions rejected from the references and why:** Model selectors, token or cost controls, developer-machine metaphors, and chat-only approvals are rejected because capability belongs to authority, usage is in units, work is business work, and decisions must be explicit.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Conversation history | ConsultThread | --mxp-surface-base, --mxp-text-primary, --mxp-space-4 | A familiar thread keeps answers, source context, and follow-up actions together. |
| Scope selector | ConsultScopeControl | --mxp-surface-raised, --mxp-border-subtle, --mxp-focus-ring | The user explicitly chooses all authorized context or one project. |
| Contextual routes | AnswerAction | --mxp-accent-secondary, --mxp-text-muted, --mxp-radius-sm | Each answer can route to the exact approval, plan, execution, or evidence state. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited values are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Keep the primary job set bounded and move rare actions into contextual menus. | At most 5 primary choices in one region | Count visible choices at desktop and mobile widths |
| Fitts's | Primary and frequent targets are large and close to the object they affect. | Primary targets at least 44 px; no target under 24 px | Computed-style and pointer review |
| Jakob's | Follow the familiar product patterns examined in ChatGPT, Perplexity, and Sana AI. | 3 named references applied; no novel core control | Side-by-side interaction audit |
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
| Thread navigation | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Context scope | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Message composer and answer routes | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** The composer stays visible with its active authorization scope.
- **Every shown state actionable in place:** Each answer offers contextual routes to the relevant approval, evidence, plan, run, or activity.
- **Live, not snapshot:** Thinking and response state update in the active thread from lifted module state.
- **Direct manipulation:** Threads and scope are selected directly; source-bound module records open from answer actions.
- **No dead ends:** An empty thread offers prompts; a failed or unanswered request preserves the input and offers retry; global navigation remains available.
- **Approvals and questions separate from chat:** Consult MAX can explain and route but never embeds an approval inside ordinary chat.

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
