# UX reference sheet — Connected systems

- **Status:** contract
- **Sheet id:** integrations-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Administration — integrations and connection health
- **Surface class:** product
- **Target user:** Workspace administrator connecting and recovering authorized external systems
- **Top jobs (1–3):** Verify connected principal and scope; recover a degraded connection; add or disconnect safely
- **Route(s) / component(s):** /maxion-prototype · IntegrationsModule

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Inspect principal, scopes, and health | Relevance AI | https://mobbin.com/screens/68a8c248-6cb2-4e0e-b16a-19f0408106fd | Name the connected account, list scopes in plain language, and show connection count and trigger context. |
| Explain a blocked dependency | Linear | https://mobbin.com/screens/3b7417c7-551f-4935-890f-4788e4d8d334 | State the prerequisite that prevents connection and give one direct recovery path. |
| Reconnect or disconnect an identity | MagicPath | https://mobbin.com/screens/d1209570-1bd3-49db-9c89-23bd6aa03f47 | Show Connected as identity beside an explicit Disconnect action. |
| Scan integrations with bounded operational context | Firecrawl | https://mobbin.com/flows/64274c27-54d2-45dc-8f98-78fbc3ed638f | Use a compact integrations collection with a live health meter while keeping developer snippets secondary. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `43:786` ([Integrations reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-786)) — fetched and visually inspected through the Figma connector on 2026-09-13.
- **Decisions rejected from the references and why:** API keys, copyable secrets, developer endpoint cards, and reconnect flows that silently widen scope are rejected because the demo records only synthetic principals, approved scopes, health, and safe recovery.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Connection collection | ConnectionRow, StatusBadge | --mxp-surface-subtle, --mxp-status-success, --mxp-status-warning | Every system shows principal, approved scopes, and health before an action. |
| Selected health detail | ContextRail, FactRow | --mxp-surface-raised, --mxp-border-subtle, --mxp-radius-md | Expiry, authority, and failure behavior stay attached to recovery. |
| Reconnect and disconnect | PrimaryButton, SecondaryButton, ConfirmDialog | --mxp-accent-primary, --mxp-status-danger, --mxp-control-lg | Reconnect is primary only in degraded state; disconnect is explicit and confirmed. |
| Failure recovery | InlineRecovery | --mxp-status-warning-soft, --mxp-focus-ring, --mxp-space-3 | Drafts remain safe and the exact unavailable effect is stated before retry. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited literals are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Keep search, health filter, and add connection visible; move provider options into the add flow. | 4 primary controls; provider chooser at most 7 per group | Control count |
| Fitts's | Put Manage, Reconnect, and Disconnect beside the connection they affect. | 44 px actions; 36 px rail rows; 8 px minimum gap | Computed-style and pointer audit |
| Jakob's | Follow the examined Relevance AI, Linear, MagicPath, and Firecrawl connection patterns. | 4 named references; familiar health and identity language | Side-by-side interaction audit |
| Proximity | Keep system, principal, scopes, health, expiry, and recovery together. | At most 12 px inside connection groups | Screenshot measurement |
| Miller's | Chunk connected, needs action, available, and selected detail. | 4 groups; no visible group over 7 items | DOM grouping audit |
| Doherty | Acknowledge selection, test, reconnect, and disconnect immediately. | Feedback within 400 ms | Playwright timing assertion |
| Von Restorff | Highlight Reconnect only for the selected degraded connection. | Exactly 1 primary action per state | Visual hierarchy audit |
| Serial Position | Put health and principal first; destructive disconnect last. | Health in first scan line; disconnect last | Reading-order audit |
| Peak-End | End connection work with principal, scopes, health, and next safe action. | Receipt has 4 elements | Completion-state test |
| Zeigarnik | Keep expiring, revoked, and testing state visible with remaining work. | State plus deadline or step N of M | State-transition test |
| Prägnanz | Preserve one connection list and one selected-health rail. | 1 dominant list plus 1 detail rail | Screenshot hierarchy review |
| Similarity | Healthy, degraded, unavailable, and testing states use consistent role treatments. | Exactly 4 health roles | Component inventory review |
| Uniform Connectedness | Actions are inside the selected connection or confirmation they change. | 100% mutating actions attached | DOM relationship audit |
| Tesler's | Resolve provider mechanics and show only principal, scope, consequence, and decision. | At most 1 authority decision per step | Flow review |
| Postel's | Normalize valid account identifiers and preserve connection drafts after provider failure. | 0 valid drafts lost | Unit and failure E2E |
| Parkinson's | Let health inspection take one selection and recovery start in one action. | Inspect within 1 action; reconnect within 2 | Action-count test |
| Occam's | Provide one add, one manage, one reconnect, and one confirmed disconnect path. | No duplicate connection action | Control inventory review |
| Pareto | Put connected identity, scope, health, and recovery ahead of catalog browsing. | All 3 top jobs in first viewport | Responsive screenshot audit |
| Interactivity floor | Search, filter, select, test, reconnect, and disconnect act in place with recovery. | Static-report test passes for 8 declared states | Walk every state and act on it |

## 5. State matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Connection row | Principal, scopes, health | Row emphasis | 2 px row ring | Detail selected | Permission reason | Health check progress | Add connection action | Scoped failure plus recover |
| Add connection | Provider chooser opens | Accent hover | 2 px focus ring | Bounded flow begins | Role reason | Step N of M | Provider guidance | Draft and prior state preserved |
| Reconnect | Visible for degraded state | Accent hover | 2 px focus ring | Confirmation opens | Authority reason | Provider check and cancel guard | Setup guidance | No writes; retry or hand off |
| Disconnect | Quiet secondary action | Danger intent appears | 2 px focus ring | Consequence confirmation | Dependency reason | Current access retained | No connected identity | Fail closed with correlation ID |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** N/A because integrations uses direct connection controls; help and command search stay available while credentials never enter chat.
- **Every shown state actionable in place:** Healthy opens Manage, expiring reconnects, failed tests retry, unavailable providers explain prerequisites, and disconnect confirms consequences.
- **Live, not snapshot:** Health, expiry, testing, reconnecting, and failure state update in the shared connection model.
- **Direct manipulation:** Search, filter, select, test, reconnect, and disconnect operate on the visible connection.
- **No dead ends:** Every failure provides retry, prerequisite, hand-off, or return to Dashboard while core modules remain usable.
- **Approvals and questions separate from chat:** Scope changes and disconnects use dedicated confirmations; contextual questions cannot grant authority.

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
