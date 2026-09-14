# UX reference sheet — Plan — agentic planning workspace

- **Status:** contract
- **Sheet id:** plan-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Plan — agentic planning workspace
- **Surface class:** product
- **Target user:** Transformation lead turning Discover evidence into approved implementation scope
- **Top jobs (1–3):** Inspect the plan backbone; edit a generated artifact; approve and hand the plan to Execute
- **Route(s) / component(s):** /maxion-prototype → Plan · PlanAgenticModule

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Edit a structured plan | Obvious | https://mobbin.com/screens/1f36e597-7677-4b85-a4bb-9a3825820cec | Keep outline, document actions, and generated artifacts in one workspace. |
| Inspect plan structure | Craft | https://mobbin.com/screens/f19df619-ca6e-4757-8866-fabe606c16a3 | Use a stable outline rail and connected cards rather than a flat report. |
| Approve a plan | Descript | https://mobbin.com/screens/58151c1c-fa16-45ec-92a3-f778e57c5080 | Show the proposal in full with one primary approval and a reversible amendment path. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `19:86` ([Plan reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=19-86)) — editable 1440 × 900 decision-ready planning workspace built from the code-aligned Maxion variables and components on 2026-09-13.
- **Decisions rejected from the references and why:** Model selectors, token or cost controls, developer-machine metaphors, and chat-only approvals are rejected because capability belongs to authority, usage is in units, work is business work, and decisions must be explicit.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Plan outline | PlanArtifactRail | --mxp-surface-raised, --mxp-text-muted, --mxp-space-3 | A persistent outline makes the current artifact and sequence legible. |
| Artifact canvas | PlanArtifactEditor | --mxp-surface-base, --mxp-text-primary, --mxp-space-6 | The runnable artifact is editable and source-bound rather than flattened metadata. |
| Approval footer | PlanDecisionBar | --mxp-accent-primary, --mxp-focus-ring, --mxp-shadow-float | One primary handoff action follows the complete proposal. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited values are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Keep the primary job set bounded and move rare actions into contextual menus. | At most 5 primary choices in one region | Count visible choices at desktop and mobile widths |
| Fitts's | Primary and frequent targets are large and close to the object they affect. | Primary targets at least 44 px; no target under 24 px | Computed-style and pointer review |
| Jakob's | Follow the familiar product patterns examined in Obvious, Craft, and Descript. | 3 named references applied; no novel core control | Side-by-side interaction audit |
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
| plan.draft | Accepted Discovery package opened | Artifact canvas, outline, provenance, gaps, and version | Edit section, regenerate, comment, or review | plan.section-editing, plan.regenerating, or plan.approval-required | Four viewport captures | Figma 19:86 and §2 Obvious/Craft |
| plan.section-editing | Operator selects a section | Editable bounded section with source markers and dirty state | Save, cancel, compare, or undo | plan.draft | 375 stacked and desktop split captures | §2 Obvious |
| plan.regenerating | Regenerate command accepted | Prior content retained with progress and source scope | Cancel when safe or continue elsewhere | plan.draft or plan.generation-error | Four viewports; zero layout shift | §2 Obvious |
| plan.approval-required | Draft satisfies readiness gates | Full proposal, consequence, evidence, and one primary approval | Approve, amend, reject, or inspect source | plan.approved or plan.draft | Four viewports | §2 Descript |
| plan.stale-review | Approval targets an older version | Stale warning, reviewed/current versions, and preserved note | Open current version or return to draft | plan.approval-required | Mobile and desktop captures | Textual authority: version invariant |
| plan.approved | Current version explicitly approved | Immutable version receipt, evidence, and Execute handoff | Open Execute or fork amendment | execute.queued or plan.draft | Four viewports | Figma 19:86 |
| plan.generation-error | Generation fails or times out | Prior section, preserved draft, failure reason, and retry | Retry or keep prior content | plan.regenerating or plan.draft | Four viewports | Textual authority: no-dead-end law row |
| plan.read-only | Viewer role or historical approved version | Artifact and provenance without mutation controls | Inspect sources or return | Owning project | Mobile and desktop captures | Textual authority: permission contract |

### 5.2 Control interaction-state matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Artifact navigation | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Artifact editor actions | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |
| Approve and hand off | Visible and ready | Role-consistent highlight | 2 px focus ring | Pressed feedback | Clear disabled reason | Spinner or progress text | Useful zero-state action | Inline error plus recovery |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** A planning composer stays beside the artifact being refined.
- **Every shown state actionable in place:** A gap opens the relevant interview or source; conflicts can be decided; proposed artifacts can be edited, regenerated, or approved.
- **Live, not snapshot:** Generation, conflict, approval, and handoff state update without leaving the workspace.
- **Direct manipulation:** Users select artifacts, edit supported fields, and act on conflicts in context.
- **No dead ends:** Every incomplete artifact explains the missing input and links to it; approval keeps an amend path.
- **Approvals and questions separate from chat:** Conflict decisions and plan approvals use dedicated controls outside the planning conversation.

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
