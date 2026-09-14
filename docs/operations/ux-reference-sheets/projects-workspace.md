# UX reference sheet — Projects workspace

- **Status:** contract
- **Sheet id:** projects-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Projects — portfolio and selected-project workspace
- **Surface class:** product
- **Target user:** Enterprise operator creating, finding, resuming, and governing outcome-based work
- **Top jobs (1–3):** Resume an active project; resolve project attention; create a project from a bounded outcome
- **Route(s) / component(s):** /maxion-prototype · ProjectsModule · project-scoped MAX context

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Filter and resume bounded work | Relevance AI | https://mobbin.com/screens/c9df4ae4-6265-48ac-8e16-95220d542fce | Put status filters and saved-view behavior above a dense list whose rows lead to one work object. |
| Review before creating durable work | Clay | https://mobbin.com/screens/2f118fde-6fe3-4327-a6b5-98f495f50fbb | Validate the incoming scope and show what will and will not be created before committing a project. |
| Start useful work from zero state | Cursor | https://mobbin.com/screens/b0eb16b6-7038-4d01-a59b-3a1e8a602dd4 | Give an empty portfolio one clear intent entry plus a short set of concrete starting jobs. |
| Keep projects and usage visible without becoming a console | Firecrawl | https://mobbin.com/flows/64274c27-54d2-45dc-8f98-78fbc3ed638f | Combine project entry points, recent state, and a bounded usage summary while keeping advanced configuration secondary. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `40:478` ([Projects reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=40-478)) — fetched and visually inspected through the Figma connector on 2026-09-13.
- **Decisions rejected from the references and why:** Developer-console API keys, raw cost/token controls, a context-free flat table, and a chat-only project experience are rejected because Projects is an outcome portfolio with tenant-scoped state, explicit decisions, and in-place actions.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Portfolio controls | SearchField, FilterChip, PrimaryButton | --mxp-surface-raised, --mxp-border-strong, --mxp-control-lg | Search, saved view, attention filter, and create stay in one bounded control row. |
| Project rows | ProjectRow, StatusBadge | --mxp-surface-subtle, --mxp-border-subtle, --mxp-status-warning | Every row carries project, owner, cross-module state, and its local action. |
| Selected-project rail | ContextRail, Composer | --mxp-surface-raised, --mxp-focus-ring, --mxp-radius-md | MAX acts on the selected project and preserves filter and module context. |
| Empty and recovery states | BrandedEmptyState, InlineRecovery | --mxp-surface-muted, --mxp-status-danger, --mxp-control-lg | Zero state starts a project; failures preserve valid input and the last safe view. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited literals are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Keep the portfolio controls bounded and put advanced filters one level down. | 4 primary controls; no menu over 7 items | DOM and screenshot count |
| Fitts's | Make project, create, filter, and context actions easy targets with local placement. | 44 px controls; 36 px compact rail rows; 8 px minimum target gap | Computed-style and pointer-path test |
| Jakob's | Follow the examined Relevance AI, Clay, Cursor, and Firecrawl work-entry patterns. | 4 named references; no novel core control | Side-by-side interaction audit |
| Proximity | Keep owner, state, consequence, and action inside the project row or selected detail. | At most 12 px inside groups; 18 px between list and context rail | Screenshot measurement |
| Miller's | Chunk controls, portfolio, and selected context; keep visible filters short. | 3 regions; at most 5 filters visible | DOM region and control count |
| Doherty | Acknowledge search, filters, selection, create, and composer input immediately. | Feedback within 400 ms | Playwright timing assertion |
| Von Restorff | Give create or the selected project's next action the sole primary treatment. | Exactly 1 primary action per state | Visual hierarchy audit |
| Serial Position | Put project identity and state first, then evidence, then the consequential action. | Identity in column 1; action last in row/detail | Reading-order and keyboard audit |
| Peak-End | End creation or recovery on the project object with its state and next action. | Receipt contains object, state, and 1 next action | Completion-state test |
| Zeigarnik | Keep incomplete work, blocking decision, and remaining module stage visible. | Every active project shows state plus one remaining item | State-transition assertion |
| Prägnanz | Preserve one dominant portfolio and one subordinate selected-project rail. | 1 primary list plus 1 context rail | Screenshot hierarchy review |
| Similarity | Give project rows one grammar and decision or error rows a distinct consistent grammar. | 2 role-specific row treatments | Component inventory review |
| Uniform Connectedness | Attach row actions and contextual MAX actions to the project they affect. | 100% of actions nested in row or selected detail | DOM relationship audit |
| Tesler's | Infer module lineage and defaults; ask only for the missing project definition. | At most 3 required create fields | Create-flow test |
| Postel's | Accept case-insensitive search and trimmed names while preserving valid drafts on failure. | Outer whitespace trimmed; 0 valid drafts lost | Unit and failure-path E2E |
| Parkinson's | Make resume, resolve, and create start progress quickly. | Top jobs begin within 3 actions; local filter p95 under 100 ms | Action-count and load-shaped test |
| Occam's | Keep one create path, one open path, and one selected-context assistant. | No duplicate primary action in a viewport | Control inventory review |
| Pareto | Prioritize resume, attention, and create over administration and secondary metadata. | All 3 top jobs in first viewport | Desktop and mobile screenshot audit |
| Interactivity floor | Search, filter, create, select, open, and ask in place; every state has recovery. | Static-report test passes for 7 declared states | Walk every state and act on it |

## 5. State matrices

### 5.1 Semantic surface-state matrix

| State ID | Fixture / event | Visible content | Permitted actions | Recovery / next state | Responsive evidence | Figma / textual authority |
| --- | --- | --- | --- | --- | --- | --- |
| projects.ready | Seeded accessible projects | Search, filters, bounded rows, attention, and resume action | Search, filter, select, resume, or create | projects.selected or projects.create-review | Four viewport captures | Figma 40:478 and §2 Relevance AI |
| projects.loading | Delayed repository read | Layout-matched skeleton and retained query | Cancel navigation or wait | projects.ready, projects.empty, or projects.error | Zero-CLS capture at four viewports | Textual authority: control matrix loading cells |
| projects.empty | Authorized tenant with zero projects | Why the list is empty and one create action | Create project or clear filters | projects.create-review or projects.ready | Four viewports | §2 Cursor decision |
| projects.error | Repository read fails | Last safe scope, error ID, and retry | Retry or return to Dashboard | projects.loading or shell.attention | Four viewports | Textual authority: no-dead-end law row |
| projects.permission-denied | Project exists outside current role | No protected metadata; plain denial and return path | Return to list or request access | projects.ready | Mobile and desktop denial captures | Textual authority: threat boundary |
| projects.create-review | Valid outcome draft submitted | Normalized project definition and what will be created | Confirm, amend, or cancel | projects.selected or projects.ready | Mobile stacked and desktop dialog captures | §2 Clay decision |
| projects.selected | Authorized row opened | Project context, current status, evidence, and MAX composer | Resume module work, ask MAX, or return | Owning module or projects.ready | Four viewports | Figma 40:478 |

### 5.2 Control interaction-state matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Search and filters | Current query/view shown | Target highlight | 2 px focus ring | Result set updates | Reason announced | Progress text without layout shift | Clear filters or create project | Query preserved with retry |
| Project row | Identity, owner, state visible | Row elevation | 2 px row/action ring | Selected detail updates | Permission reason | Bounded skeleton | Create-project action | Last safe row plus retry |
| Create project | Primary action ready | Accent hover | 2 px focus ring | Review step opens | Invalid reason inline | Creating with cancel disabled | Starts first project | Valid draft preserved and retryable |
| Selected-project MAX | Context and suggested action shown | Control highlight | Composer ring | Sends against selected project | Missing permission explained | Streaming with stop | Suggested questions | Draft preserved with retry |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** The selected-project rail keeps a MAX composer bound to the visible project, filters, and cross-module state.
- **Every shown state actionable in place:** Attention opens its decision, active work resumes, empty starts creation, errors retry, and a selected project can be opened or queried.
- **Live, not snapshot:** Project rows read the shared module state and update status, owner, progress, and attention without a reload.
- **Direct manipulation:** Search, saved views, inline selection, and project opening act on the portfolio without a separate report page.
- **No dead ends:** Every state offers create, clear, retry, open, ask, or a route back to Dashboard.
- **Approvals and questions separate from chat:** Approval badges route to the dedicated decision object; MAX questions never authorize an effect.

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
