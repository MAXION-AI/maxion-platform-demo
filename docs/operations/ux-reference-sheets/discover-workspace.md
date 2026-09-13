# UX reference sheet — Discover — evidence interview and deliverable workspace

- **Status:** contract
- **Sheet id:** discover-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Discover — evidence interview and deliverable workspace
- **Surface class:** product
- **Target user:** Transformation lead collecting source-bound evidence before planning
- **Top jobs (1–3):** Start or resume an interview; resolve authority boundaries; review evidence-backed deliverables
- **Route(s) / component(s):** /maxion-prototype → Discover · DiscoveryAutonomousPrototypePage

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Review an interview object | Fireflies | https://mobbin.com/screens/3cd6c20c-a39e-4c44-be58-579510daf3b4 | Keep transcript, summary, and actions as one source-linked object. |
| Answer a bounded question | Perplexity | https://mobbin.com/screens/501351fa-f2ca-490a-93db-3bbda5d591a1 | Show numbered progress, clear options, and an awaiting-response state. |
| Conduct a voice interview | Codecademy | https://mobbin.com/screens/ee0a9184-c9e2-4a05-b12c-2f83c44de099 | Pair the transcript with an explicit microphone composer and live listening state. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `18:45` ([Discover reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=18-45)) — editable 1440 × 900 interview-and-evidence workspace built from the code-aligned Maxion variables and components on 2026-09-13.
- **Decisions rejected from the references and why:** Model selectors, token or cost controls, developer-machine metaphors, and chat-only approvals are rejected because capability belongs to authority, usage is in units, work is business work, and decisions must be explicit.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Interview transcript | DiscoveryConversation | --mxp-surface-base, --mxp-text-primary, --mxp-space-4 | Conversation and evidence remain together without hiding provenance. |
| Authority boundary | DecisionCard | --mxp-status-warning, --mxp-border-strong, --mxp-radius-md | A bounded question is visually separate from ordinary conversation. |
| Deliverable reader | DeliverableExhibit | --mxp-surface-raised, --mxp-text-muted, --mxp-space-6 | Summary, claims, sources, and next actions form one inspectable object. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited values are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Keep the primary job set bounded and move rare actions into contextual menus. | At most 5 primary choices in one region | Count visible choices at desktop and mobile widths |
| Fitts's | Primary and frequent targets are large and close to the object they affect. | Primary targets at least 44 px; no target under 24 px | Computed-style and pointer review |
| Jakob's | Follow the familiar product patterns examined in Fireflies, Perplexity, and Codecademy. | 3 named references applied; no novel core control | Side-by-side interaction audit |
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
| Interview composer | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Authority decision | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Deliverable tabs | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** The text or voice interview composer remains adjacent to the active transcript.
- **Every shown state actionable in place:** An evidence gap opens its source action; an authority question offers answer or decline; a deliverable opens its cited evidence.
- **Live, not snapshot:** Transcript progress, listening state, question number, and package readiness update in the workspace.
- **Direct manipulation:** Claims and source links can be opened from the deliverable; direct text editing is withheld because this demo preserves source-bound generation.
- **No dead ends:** Every incomplete state identifies the missing evidence or decision and exposes the next action plus a route back.
- **Approvals and questions separate from chat:** Authority questions use a dedicated decision card and never masquerade as chat messages.

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
