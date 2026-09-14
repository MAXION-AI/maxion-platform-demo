# UX reference sheet — My approvals

- **Status:** contract
- **Sheet id:** approvals-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Administration — approvals assigned to the current operator
- **Surface class:** product
- **Target user:** Authorized reviewer deciding bounded changes across projects and modules
- **Top jobs (1–3):** Find the next assigned approval; understand exact consequence and evidence; approve, amend, or reject safely
- **Route(s) / component(s):** /maxion-prototype · AccountUtilityModule approvals state · Agentix decision hand-off

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Review a proposed object before action | Higgsfield | https://mobbin.com/screens/f0ee7046-b34e-415a-a830-564baf6f902d | Show the proposed object's full definition in an approval card with one emphasized decision. |
| Approve while keeping a way back | Descript | https://mobbin.com/screens/58151c1c-fa16-45ec-92a3-f778e57c5080 | Present the plan or change plainly, make Approve primary, and keep Revert or amend available but quiet. |
| Pair a recommendation with reasoning and evidence | Rox | https://mobbin.com/screens/3f692f59-31ca-4254-8d47-1112661613a1 | Keep recommended action, reasoning disclosure, source count, and action in one connected object. |
| Scan assigned approval work | Contractbook | https://mobbin.com/screens/01f9bf2b-e1e5-4c0f-95be-14fbbb838194 | Use an Assigned to me queue with approval type and due date visible before drill-down. |
| Keep approver, due date, and dependencies visible | Asana | https://mobbin.com/screens/e94342b0-adf8-4b9e-85ce-c01c0909cf9a | Put Approve, Changes requested, and Reject beside assignee, due date, and dependency context. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `43:1013` ([My approvals reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-1013)) — fetched and visually inspected through the Figma connector on 2026-09-13.
- **Decisions rejected from the references and why:** Always allow, chat-message approval, hidden recipient or scope changes, and bulk approval without per-object consequence are rejected because authority is bounded, server-validated, and attributable.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Assigned queue | ApprovalRow, StatusBadge | --mxp-surface-subtle, --mxp-status-warning, --mxp-control-lg | Type, owner, version, due date, and consequence remain scannable before selection. |
| Selected decision | DecisionCard, FactRow | --mxp-surface-raised, --mxp-border-strong, --mxp-radius-md | Exact object, before/proposed state, evidence, principal, and expiry stay connected. |
| Decision actions | PrimaryButton, SecondaryButton, DestructiveButton | --mxp-accent-primary, --mxp-status-danger, --mxp-focus-ring | Approve is primary; amend and reject remain explicit and keyboard reachable. |
| Stale or denied state | InlineRecovery | --mxp-status-danger-soft, --mxp-text-secondary, --mxp-space-3 | Fail closed, reveal no inaccessible data, and return to the current queue safely. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited literals are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Filter the assigned queue and expose only approve, amend, and reject for one selected object. | At most 4 queue controls; 3 decision choices | DOM and screenshot count |
| Fitts's | Keep decisions beside their object and separate destructive targets. | 44 px actions; 36 px rail rows; 8 px minimum gap | Computed-style and pointer audit |
| Jakob's | Follow the examined Higgsfield, Descript, Rox, Contractbook, and Asana approval patterns. | 5 named references; familiar queue and decision grammar | Side-by-side interaction audit |
| Proximity | Keep object, version, consequence, evidence, principal, expiry, and actions together. | At most 12 px inside decision groups | Screenshot measurement |
| Miller's | Chunk queue, consequence, before/proposed state, evidence, and actions. | 5 groups; no group over 7 facts | DOM grouping audit |
| Doherty | Acknowledge selection and decisions immediately, then show authoritative progress. | Feedback within 400 ms | Playwright timing assertion |
| Von Restorff | Give Approve one primary treatment while Amend and Reject remain visible. | Exactly 1 primary action | Visual hierarchy audit |
| Serial Position | Put due status and object first; decision follows evidence and expiry. | Status first; action last | Reading-order audit |
| Peak-End | End on a decision receipt and route back to the owning work object. | Receipt plus owner route and next action | Completion-state test |
| Zeigarnik | Keep pending, stale, expiring, and submitting state visible until authoritative resolution. | State plus due time or progress | State-transition test |
| Prägnanz | Preserve one assigned queue and one selected decision. | 1 queue plus 1 detail | Screenshot hierarchy review |
| Similarity | Pending, due, stale, denied, and completed approvals use consistent roles. | Exactly 5 status roles | Component inventory review |
| Uniform Connectedness | Decision controls live inside the object and version they authorize. | 100% actions attached to one approval ID | DOM and event audit |
| Tesler's | The system calculates impact and assembles evidence before asking for one bounded decision. | At most 1 unresolved decision per card | Decision review |
| Postel's | Accept a plain-language amendment while never relaxing authority or losing the draft. | 0 valid amendments lost; fail closed | Unit and failure E2E |
| Parkinson's | Put the oldest due assigned item first and enable a safe decision quickly. | Decision reachable within 2 actions | Action-count test |
| Occam's | Keep one assigned queue and one decision owner; remove chat and duplicate module approvals. | No duplicate decision path | Route and control inventory |
| Pareto | Prioritize due approvals, exact consequence, and evidence before history. | All 3 top jobs in first viewport | Responsive screenshot audit |
| Interactivity floor | Filter, select, inspect, approve, amend, reject, recover, and return to owner in place. | Static-report test passes for 8 declared states | Walk every state and act on it |

## 5. State matrices

### 5.1 Semantic surface-state matrix

| State ID | Fixture / event | Visible content | Permitted actions | Recovery / next state | Responsive evidence | Figma / textual authority |
| --- | --- | --- | --- | --- | --- | --- |
| approvals.queue | Seeded assigned decisions | Status, object, owner, due state, and consequence summary | Filter or open one request | approvals.review | Four viewport captures | Figma 43:1013 and §2 Contractbook |
| approvals.review | Authorized request selected | Exact object/version/consequence, evidence, and actor scope | Approve, amend, reject, or return | approvals.submitting or approvals.queue | Four viewports | §2 Higgsfield and Asana |
| approvals.submitting | Idempotent decision accepted | Pending decision, preserved context, and progress | Wait or cancel only when safe | approvals.resolved or approvals.error | Four viewports | Textual authority: Doherty row |
| approvals.resolved | Decision succeeds | Receipt, actor, timestamp, result, and next request | Open owner, undo only if supported, or continue | approvals.queue | Four viewports | §2 Descript |
| approvals.stale | Object version changed during review | Reviewed/current versions and blocked submission | Open current request or return | approvals.review or approvals.queue | Four viewports | Textual authority: stale safety |
| approvals.empty | No assigned decisions | Honest queue state and owning-work links | Return to product work | shell.attention | Four viewports | Textual authority: empty-state law |
| approvals.error | Decision or list request fails | Last safe queue/draft, error ID, and no effect claim | Retry or return | approvals.queue or approvals.review | Four viewports | Textual authority: no duplicate effect |
| approvals.permission-denied | Unauthorized object/request | No inaccessible metadata; role reason | Return or request access | approvals.queue | Mobile and desktop captures | Textual authority: fail-closed rule |

### 5.2 Control interaction-state matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Approval queue | Assigned, due, and status visible | Row emphasis | 2 px row ring | Detail selected | Scope reason | Bounded skeleton | No-pending explanation | Last safe queue plus retry |
| Decision detail | Exact object and evidence | Evidence link emphasis | 2 px link ring | Fact or source opens | Inaccessible data withheld | Freshness check visible | Select an approval | Stale or denied state fails closed |
| Approve | Ready after review | Accent hover | 2 px focus ring | Confirmation or submit | Reason announced | Idempotent submission | No approval selected | No effect; retry with correlation ID |
| Amend or reject | Quiet explicit controls | Intent emphasis | 2 px focus ring | Draft or confirmation opens | Reason announced | Current decision preserved | Return to queue | Draft preserved or fail closed |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** Amendment input stays inside the selected approval; exploratory chat remains in the owning module and cannot authorize the decision.
- **Every shown state actionable in place:** Pending reviews, stale refreshes, denied returns, amendment drafts, failures retry, and completed receipts open the owner.
- **Live, not snapshot:** Queue status, expiry, freshness, submission, and final receipt update from one approval state owner.
- **Direct manipulation:** Reviewers filter, select, inspect evidence, approve, amend, or reject the visible object.
- **No dead ends:** Every state offers decide, refresh, retry, return to queue, or open the owning module.
- **Approvals and questions separate from chat:** The queue contains approval objects only; questions stay in their source workflow and never reuse the approve control.

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
