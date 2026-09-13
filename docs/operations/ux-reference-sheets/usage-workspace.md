# UX reference sheet — Workspace unit usage

- **Status:** contract
- **Sheet id:** usage-workspace
- **Owner (builder):** Codex session 2026-09-13
- **Verifier (independent):** unassigned independent session
- **QA:** unassigned QA session

## 1. Surface

- **Module / screen:** Administration — workspace units, pace, limits, and records
- **Surface class:** product
- **Target user:** Workspace operator understanding and bounding product consumption
- **Top jobs (1–3):** See current unit use and pace; find the module or project driving use; set a warning without blocking active work
- **Route(s) / component(s):** /maxion-prototype · AccountUtilityModule usage state

## 2. References (examined, cited)

| Job the reference proves | App | Mobbin link | Decision taken (words, not pixels) |
| --- | --- | --- | --- |
| Explain per-run consumption in product units | Relevance AI | https://mobbin.com/screens/db919f38-24cb-4151-b995-2781392d7db2 | Put actions used, product-unit use, and run time beside the work timeline rather than exposing implementation tokens. |
| Show recent usage and remaining capacity | Firecrawl | https://mobbin.com/flows/64274c27-54d2-45dc-8f98-78fbc3ed638f | Use a bounded period chart, capacity meter, and relevant project breakdown in the overview. |
| Set warnings and per-run bounds | Langdock | https://mobbin.com/flows/05ce3c9c-e966-49ba-8976-d1b8e30ee976 | Keep notification threshold, per-execution limit, and run-rate guardrails together under settings. |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `43:1234` ([Usage reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-1234)) — fetched and visually inspected through the Figma connector on 2026-09-13.
- **Decisions rejected from the references and why:** Raw tokens, raw provider costs, unbounded event tables, and automatic work stoppage at a warning threshold are rejected because workspace units are the stable user contract and active work needs explicit policy.

## 3. Token and component mapping (the look comes only from here)

| Element on screen | Maxion component | Tokens used | Reference decision it implements |
| --- | --- | --- | --- |
| Capacity summary | MetricCard, UsageProgress | --mxp-surface-raised, --mxp-accent-primary, --mxp-status-warning | Used, remaining, reset, and pace stay legible in the first viewport. |
| Period and scope controls | DateFilter, FilterChip | --mxp-border-strong, --mxp-focus-ring, --mxp-control-lg | Period, module, and project scope bound every query. |
| Usage breakdown | UsageRow, StatusBadge | --mxp-surface-subtle, --mxp-status-info, --mxp-radius-md | Module and project rows show product units and share, never tokens or dollars. |
| Alert action | PrimaryButton, InlineValidation | --mxp-accent-primary, --mxp-status-success, --mxp-space-3 | One warning threshold is editable, acknowledged, and recoverable. |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces the ratchet while inherited literals are removed.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law | Requirement for this screen | Number / acceptance | Verified how |
| --- | --- | --- | --- |
| Hick's | Keep period, module/project scope, and alert as the only first-line controls. | At most 4 controls; no filter group over 7 values | Control count |
| Fitts's | Put the alert action beside the capacity it controls and make every breakdown row selectable. | 44 px actions; 36 px rail rows; 8 px minimum gap | Computed-style and pointer audit |
| Jakob's | Follow the examined Relevance AI, Firecrawl, and Langdock usage patterns. | 3 named references; familiar metric, chart, and limit grammar | Side-by-side interaction audit |
| Proximity | Keep used, remaining, reset, pace, and alert together; keep row records with their scope. | At most 12 px inside summary groups | Screenshot measurement |
| Miller's | Chunk overview, trend, module breakdown, project detail, and alert. | 5 groups; at most 7 visible rows per group | DOM grouping audit |
| Doherty | Acknowledge scope and alert changes immediately before recalculation or save. | Feedback within 400 ms | Playwright timing assertion |
| Von Restorff | Give Set alert the only primary treatment. | Exactly 1 primary action | Visual hierarchy audit |
| Serial Position | Put used and remaining first; detailed records and policy caveat last. | Capacity first; records last | Reading-order audit |
| Peak-End | End alert changes on saved threshold, recipients, effective time, and next review. | Receipt has 4 elements | Save-state test |
| Zeigarnik | Keep pace warning, reset date, and asynchronous recalculation visible. | State plus time or progress | State-transition test |
| Prägnanz | Keep one capacity story, one trend, and one breakdown. | 3 dominant visual groups | Screenshot hierarchy review |
| Similarity | Module and project rows share one unit grammar and warning roles stay consistent. | 2 row levels; 4 status tones maximum | Component inventory review |
| Uniform Connectedness | Filters bind the whole result; alert controls bind only the selected workspace threshold. | 100% actions attached to visible scope | DOM relationship audit |
| Tesler's | Convert provider detail to stable units and calculate pace for the user. | 0 raw token or provider-cost fields | Data and copy audit |
| Postel's | Accept valid date and threshold forms and preserve a draft if save fails. | Threshold 1–100; 0 valid drafts lost | Unit and failure E2E |
| Parkinson's | Let an operator find the driver and set a warning quickly. | Driver within 2 actions; alert within 3 | Action-count test |
| Occam's | Keep one unit definition, one alert, and one record path. | No duplicate metric or limit controls | Control inventory review |
| Pareto | Put capacity, driver, and warning before detailed historical records. | All 3 top jobs in first viewport | Responsive screenshot audit |
| Interactivity floor | Filter, inspect, drill into records, set an alert, recover, and return in place. | Static-report test passes for 8 declared states | Walk every state and act on it |

## 5. State matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Period and scope | Current bounded range | Control emphasis | 2 px focus ring | Results update | Reason announced | Prior data retained with progress | Reset to current period | Scope preserved with retry |
| Capacity summary | Used, remaining, pace | Detail affordance | 2 px detail ring | Breakdown selected | Source unavailable reason | Stable skeleton | Zero-use explanation | Last known total and timestamp |
| Breakdown row | Units and share visible | Row emphasis | 2 px row ring | Records open | Permission reason | Bounded rows stream | No-use explanation | Row retry without blocking overview |
| Alert control | Current threshold | Accent hover | 2 px focus ring | Draft opens | Role reason | Saving state | Set first alert | Draft preserved and retryable |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** N/A because usage is a bounded analytical control surface; command search and contextual help remain available without making units conversational.
- **Every shown state actionable in place:** Filters update, rows drill down, pace warnings set alerts, unavailable data retries, and empty state returns to active work.
- **Live, not snapshot:** Used, remaining, pace, reset, recalculation, and saved alert state update from one bounded source.
- **Direct manipulation:** Period, module, project, record drill-down, and warning threshold change in place.
- **No dead ends:** Every state offers retry, reset filters, inspect records, set alert, or return to Dashboard.
- **Approvals and questions separate from chat:** Usage warnings are settings, not approvals; policy changes requiring authority use a dedicated confirmation.

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
