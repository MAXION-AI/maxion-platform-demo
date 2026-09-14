# UX reference sheet — Contextual help and recovery

- **Status:** contract
- **Sheet id:** help-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Administration — contextual help, task guidance, and support hand-off
- **Surface class:** product
- **Target user:** Enterprise operator recovering a task without losing its workspace context
- **Top jobs (1–3):** Find task-specific guidance; perform the recommended recovery; hand off with diagnostic context attached
- **Route(s) / component(s):** /maxion-prototype · AdministrationModules.HelpModule

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Recover a failed operation in place | Zapier | https://mobbin.com/screens/0551ccd5-c726-4e4d-b61f-05aceac62501 | State the failure in one line and keep Help me fix it, retest, and safe skip beside the failed step. |
| Explain cause and solution together | Sentry | https://mobbin.com/screens/fcc6e08a-e647-449c-9a11-6ceef8332a89 | Pair root-cause and solution panels with explicit Resolve and Archive outcomes. |
| Preserve passed work while retrying failure | GitHub Actions | https://mobbin.com/screens/0690bb8b-3bbb-45be-9dfa-8cef91e2956f | Keep annotations and passed steps visible, then re-run only the relevant failed work. |
| Offer contextual next questions | Customer.io | https://mobbin.com/screens/fafcbfb9-fa85-4b4d-b17f-54df962305b5 | Show what was searched, cite the relevant references, and provide short task-shaped next actions. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `43:1461` ([Help reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-1461)) — fetched and visually inspected through the Figma connector on 2026-09-13.
- **Decisions rejected from the references and why:** Generic documentation homepages, support forms that ask the user to reconstruct context, destructive retry-all, and assistant answers without owner links are rejected because help must recover the current task safely.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Task search | SearchField, SuggestionChip | --mxp-surface-raised, --mxp-border-strong, --mxp-focus-ring | Search accepts task language and ranks guidance using the current module and object. |
| Guidance results | HelpResultRow, StatusBadge | --mxp-surface-subtle, --mxp-status-info, --mxp-control-lg | Each result states the task, outcome, expected time, and one Open action. |
| Contextual recovery | ContextRail, PrimaryButton | --mxp-surface-raised, --mxp-accent-primary, --mxp-radius-md | The selected workspace, module, object, and next safe action stay attached. |
| Support and service health | ServiceStatus, SupportHandoff | --mxp-status-success, --mxp-status-warning, --mxp-text-muted | Non-critical help degradation never blocks modules; support receives synthetic diagnostic context, never secrets. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited literals are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Lead with search and at most four context-ranked task results. | 1 search plus at most 4 recommended results | DOM and screenshot count |
| Fitts's | Put Open and recovery beside the result or object they affect. | 44 px actions; 36 px rail rows; 8 px minimum gap | Computed-style and pointer audit |
| Jakob's | Follow the examined Zapier, Sentry, GitHub Actions, and Customer.io recovery patterns. | 4 named references; familiar search and task guidance | Side-by-side interaction audit |
| Proximity | Keep cause, impact, passed work, recovery, and expected time together. | At most 12 px inside guidance groups | Screenshot measurement |
| Miller's | Chunk recommendations, contextual recovery, service health, and support. | 4 groups; at most 7 items per group | DOM grouping audit |
| Doherty | Acknowledge search, result selection, retry, and support hand-off immediately. | Feedback within 400 ms | Playwright timing assertion |
| Von Restorff | Highlight the current task's next safe recovery action. | Exactly 1 primary action per selected result | Visual hierarchy audit |
| Serial Position | Put task and impact first; support escalation last. | Task first; escalation last | Reading-order audit |
| Peak-End | End recovery on the restored object or a support receipt with next expectation. | Object or receipt plus next action and timing | Completion-state test |
| Zeigarnik | Keep the failed task, remaining step, and support status visible. | Step N of M or explicit remaining action | State-transition test |
| Prägnanz | Preserve one result list and one contextual recovery rail. | 1 list plus 1 context rail | Screenshot hierarchy review |
| Similarity | Guides, recoveries, service notices, and support receipts use consistent roles. | Exactly 4 result roles | Component inventory review |
| Uniform Connectedness | Recovery actions remain inside the task or object context they change. | 100% actions attached to a context ID | DOM relationship audit |
| Tesler's | Attach diagnostics automatically instead of asking the user to reconstruct them. | 4 context fields attached automatically | Support payload test |
| Postel's | Accept natural task phrasing and preserve the query when search or support fails. | Trim outer whitespace; 0 valid queries lost | Unit and failure E2E |
| Parkinson's | Surface a likely recovery quickly and state expected reading or response time. | Recommended recovery within 2 actions; minutes shown | Action-count test |
| Occam's | Provide one search, one contextual recovery, and one escalation path. | No duplicate help entry or retry-all | Control inventory review |
| Pareto | Prioritize the current task, likely recovery, and system status before topic browsing. | All 3 top jobs in first viewport | Responsive screenshot audit |
| Interactivity floor | Search, select, open, recover, retry, inspect status, and hand off in place. | Static-report test passes for 8 declared states | Walk every state and act on it |

## 5. State matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Help search | Query and context shown | Border emphasis | 2 px focus ring | Ranked results update | Offline reason | Search progress with query retained | Suggested task starts | Query retained and retryable |
| Guidance result | Task, outcome, time | Row emphasis | 2 px row ring | Context selected | Permission reason | Bounded skeleton | Browse topics action | Last safe result and retry |
| Recovery action | One next safe action | Accent hover | 2 px focus ring | Owning object opens | State or role reason | Step N of M with cancel boundary | Return to module | Preserve passed work and retry one step |
| Support hand-off | Context preview visible | Secondary emphasis | 2 px focus ring | Review then send | Missing role reason | Submitting without secrets | Explain when support is unnecessary | Draft and correlation ID preserved |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** Task search accepts natural language while remaining bounded to help; it cannot mutate product state or approve work.
- **Every shown state actionable in place:** Results open, failures retry one step, service issues expose status, empty state browses tasks, and support hand-off preserves context.
- **Live, not snapshot:** Search, system status, recovery progress, and support receipt update without blocking product modules.
- **Direct manipulation:** Users search, select a guide, open the current object, retry, inspect status, and review the hand-off payload.
- **No dead ends:** Every state offers a guide, retry, owning-object route, status page, support receipt, or Dashboard return.
- **Approvals and questions separate from chat:** Help may explain an approval but can only open the decision object; it cannot display or trigger an approve control.

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
