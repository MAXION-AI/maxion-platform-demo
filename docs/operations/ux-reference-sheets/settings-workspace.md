# UX reference sheet — Workspace settings

- **Status:** contract
- **Sheet id:** settings-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Administration — workspace settings
- **Surface class:** product
- **Target user:** Workspace administrator maintaining safe defaults and account controls
- **Top jobs (1–3):** Update workspace defaults; review security boundaries; confirm saved and audited state
- **Route(s) / component(s):** /maxion-prototype · AccountUtilityModule settings state

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Keep configuration attached to live context | Notion | https://mobbin.com/screens/e173b891-b6af-4af8-9a64-532d1fbfec29 | Group tools, access, advanced controls, and trusted boundaries in a quiet settings rail with one Save action. |
| Separate security from routine configuration | ElevenLabs | https://mobbin.com/screens/91e14363-35ec-4a12-8d4b-4b0d6a9c4ece | Use familiar configuration tabs, put Security in its own bounded area, and make publish/save status explicit. |
| Bound operational consumption | Langdock | https://mobbin.com/flows/05ce3c9c-e966-49ba-8976-d1b8e30ee976 | Keep spend or run limits under Settings with sensible defaults, notification thresholds, and per-run bounds. |
| Make configuration history recoverable | Notion | https://mobbin.com/screens/780626a3-20f5-4795-ac3b-bdbaef325210 | Show the author and time behind a version so a saved change is attributable and recoverable. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `43:559` ([Settings reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-559)) — fetched and visually inspected through the Figma connector on 2026-09-13.
- **Decisions rejected from the references and why:** Model knobs, API secrets, implicit publication, and one undifferentiated settings form are rejected because authority, credentials, and destructive changes require separate, explicit controls.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Settings navigation | UtilityNavItem, SegmentedTabs | --mxp-surface-raised, --mxp-surface-selected, --mxp-control-md | Settings remains compact in the bottom rail while its page uses familiar Workspace, Notifications, and Security groups. |
| Validated fields | FormField, InlineValidation | --mxp-border-strong, --mxp-focus-ring, --mxp-status-danger | Validation and recovery stay with the field and never erase a valid draft. |
| Security boundary | PolicyCard, StatusBadge | --mxp-surface-subtle, --mxp-status-success, --mxp-radius-md | SSO, session, retention, and region change controls are visible before save. |
| Save and audit state | PrimaryButton, AuditReceipt | --mxp-accent-primary, --mxp-text-muted, --mxp-control-lg | One Save action ends in attributable configuration state with a correlation reference. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited literals are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Show only the settings group and fields needed for the current job. | 3 groups; at most 6 visible fields per group | DOM and screenshot count |
| Fitts's | Keep Save beside the form ending and make every compact rail row wholly clickable. | 44 px page controls; 36 px rail rows; 8 px target gap | Computed-style and pointer test |
| Jakob's | Follow the examined Notion, ElevenLabs, and Langdock configuration patterns. | 3 named products across 4 examined references | Side-by-side interaction audit |
| Proximity | Keep labels, help, validation, and recovery with their field or policy. | At most 8 px inside a field; 18 px between sections | Screenshot measurement |
| Miller's | Chunk workspace, notification, security, and change history rather than one long form. | 4 bounded groups; no group over 7 controls | DOM grouping audit |
| Doherty | Acknowledge edits and Save immediately, then show durable progress. | Feedback within 400 ms | Playwright timing assertion |
| Von Restorff | Give Save the only primary treatment; migration and policy links remain secondary. | Exactly 1 primary action | Visual hierarchy audit |
| Serial Position | Put workspace identity first and audit/recovery last. | Identity in first group; receipt in final group | Reading-order audit |
| Peak-End | End save on persisted values, actor, time, and recovery path. | Receipt has 4 elements | Save-state test |
| Zeigarnik | Keep unsaved changes and invalid fields visible until resolved. | Dirty count and field status remain until save or discard | State-transition test |
| Prägnanz | Preserve one form and one quiet assurance rail. | 1 dominant form plus 1 audit rail | Screenshot hierarchy review |
| Similarity | Give editable fields, locked fields, and policies consistent role treatments. | Exactly 3 field roles | Component inventory review |
| Uniform Connectedness | Place the save action with the fields it commits and policies with their consequences. | 100% actions inside owning section | DOM relationship audit |
| Tesler's | Supply defaults and explain locked controls instead of asking users for internal values. | At most 4 editable values on first view | Form review |
| Postel's | Normalize valid names and time zones; preserve drafts on network or validation failure. | Trim outer whitespace; 0 valid drafts lost | Unit and failure E2E |
| Parkinson's | Keep routine edits short and reviewed migrations outside the common path. | Common save within 3 actions | Action-count test |
| Occam's | Provide one owner and one path for each setting. | No duplicate field or Save action | Source and control inventory |
| Pareto | Put workspace identity, time zone, and security status before rare controls. | Top 3 jobs in first viewport | Responsive screenshot audit |
| Interactivity floor | Fields edit, validate, save, fail, recover, and expose attributable state in place. | Static-report test passes for 6 declared states | Walk every state and act on it |

## 5. State matrices

### 5.1 Semantic surface-state matrix

| State ID | Fixture / event | Visible content | Permitted actions | Recovery / next state | Responsive evidence | Figma / textual authority |
| --- | --- | --- | --- | --- | --- | --- |
| settings.clean | Current settings loaded | Current values, security boundary, and history | Edit a permitted field | settings.dirty | Four viewport captures | Figma 43:559 |
| settings.dirty | Valid field changed | Dirty marker, validation, consequence, and Save | Save, reset, or cancel | settings.saving or settings.clean | Four viewports | §2 Notion |
| settings.saving | Save accepted | Current values retained and bounded progress | Wait or cancel only when safe | settings.saved or settings.error | Four viewports | Textual authority: Doherty row |
| settings.saved | Idempotent save succeeds | Receipt, actor, timestamp, and recovery/history path | Continue editing or open receipt | settings.clean | Four viewports | §2 Notion history |
| settings.error | Validation or save fails | Field/global reason, error ID, and preserved valid draft | Correct or retry | settings.dirty or settings.saving | Four viewports | Textual authority: Postel's row |
| settings.permission-denied | Non-admin opens settings | Safe read-only values or no protected detail plus role reason | Return or request access | shell.attention | Mobile and desktop captures | Textual authority: security boundary |

### 5.2 Control interaction-state matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Settings field | Current value and help | Border emphasis | 2 px focus ring | Draft marked dirty | Lock reason announced | Existing value retained | Prompt and safe default | Inline message; valid draft preserved |
| Save action | Ready when changed | Accent hover | 2 px focus ring | Pressed feedback | Reason announced | Saving plus cancel guard | No changes message | Retry with correlation ID |
| Security policy | Status and consequence | Local action highlight | 2 px action ring | Detail opens | Permission reason | Current policy retained | Setup guidance | Fail closed with support route |
| Change history | Latest events visible | Row emphasis | 2 px row ring | Receipt opens | Restricted reason | Bounded skeleton | No-change explanation | Last known state plus retry |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** N/A because settings is a direct-manipulation form; contextual help and command search remain available without turning configuration into chat.
- **Every shown state actionable in place:** Editable fields save, invalid fields correct, locked fields explain escalation, and failed saves retain the draft and retry.
- **Live, not snapshot:** Dirty, validating, saving, saved, policy, and audit states update from the shared administrative model.
- **Direct manipulation:** Workspace name, time zone, digest, and permitted policy values edit in place.
- **No dead ends:** Each state offers Save, retry, review policy, support, or return to Dashboard.
- **Approvals and questions separate from chat:** Sensitive setting changes open their own consequence-labelled confirmation; contextual questions grant no authority.

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
