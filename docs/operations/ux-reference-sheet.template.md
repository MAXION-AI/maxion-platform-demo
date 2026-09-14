# UX reference sheet — <Surface name>

<!--
One sheet per user-facing screen or flow. It is the CONTRACT the build is judged against; the GATE
(`scripts/check_ux_reference_sheet.py`) refuses the merge when the built screen does not meet it.

Lifecycle: `contract` (written BEFORE build; §1–§6 complete, §7 pending) → `built` (§7 artifacts
attached by the builder) → `gated` (§7 all PASS, §8 signed by three distinct people/sessions).

Rules:
- References supply DECISIONS in words (structure, states, controls, copy). Never colours, fonts,
  spacing, radius, shadows or motion values — those come only from §3 (Maxion tokens/components).
- Every Mobbin link must have been examined through the Mobbin connector, not guessed.
- Delete every <angle-bracket placeholder> and every "TODO"; the checker fails on them.
- Laws canon: docs/operations/ux-laws-policy.md · references: docs/operations/mobbin-ai-north-star.md
-->

- **Status:** contract
- **Sheet id:** <module>-<screen-slug>
- **Owner (builder):** <name or session id>
- **Verifier (independent):** <name or session id — not the builder>
- **QA:** <name or session id — not the builder>

## 1. Surface

- **Module / screen:** <e.g. Agentix — A07 Run canvas>
- **Surface class:** <product | marketing>
- **Target user:** <who, in one line>
- **Top jobs (1–3):** <job 1>; <job 2>; <job 3>
- **Route(s) / component(s):** <e.g. /agentix/initiatives/:id/run · AgentixRunCanvas>

## 2. References (examined, cited)

| Job the reference proves | App   | Mobbin link                       | Decision taken (words, not pixels) |
| ------------------------ | ----- | --------------------------------- | ---------------------------------- |
| <job>                    | <app> | https://mobbin.com/screens/<uuid> | <the decision in one sentence>     |
| <job>                    | <app> | https://mobbin.com/screens/<uuid> | <the decision in one sentence>     |
| <job>                    | <app> | https://mobbin.com/flows/<uuid>   | <the decision in one sentence>     |

- **Figma frame:** file `<fileKey>`, node `<n:n>` (<frame name>) — fetched via the Figma connector on <date>.
  At contract stage only, `unavailable because <specific reason>` is accepted; built/gated stages
  require a real approved file and node.
- **Decisions rejected from the references and why:** <one line each, or "none">

## 3. Token and component mapping (the look comes only from here)

| Element on screen                 | Maxion component            | Tokens used                                      | Reference decision it implements                        |
| --------------------------------- | --------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| <e.g. status line under each row> | <e.g. StatusBadge (5-tone)> | <e.g. --color-status-\*, --font-sans, --space-2> | <e.g. "status is a sentence, never a bare dot" (Devin)> |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces it.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law                   | Requirement for this screen                                             | Number / acceptance         | Verified how                       |
| --------------------- | ----------------------------------------------------------------------- | --------------------------- | ---------------------------------- |
| Hick's                | <requirement>                                                           | <number>                    | <method>                           |
| Fitts's               | <requirement>                                                           | <number>                    | <method>                           |
| Jakob's               | <requirement — name the 3–5 references from §2>                         | <number>                    | <method>                           |
| Proximity             | <requirement>                                                           | <number>                    | <method>                           |
| Miller's              | <requirement>                                                           | <number>                    | <method>                           |
| Doherty               | <requirement>                                                           | <number>                    | <method>                           |
| Von Restorff          | <requirement>                                                           | <number>                    | <method>                           |
| Serial Position       | <requirement>                                                           | <number>                    | <method>                           |
| Peak-End              | <requirement>                                                           | <number>                    | <method>                           |
| Zeigarnik             | <requirement>                                                           | <number>                    | <method>                           |
| Prägnanz              | <requirement>                                                           | <number>                    | <method>                           |
| Similarity            | <requirement>                                                           | <number>                    | <method>                           |
| Uniform Connectedness | <requirement>                                                           | <number>                    | <method>                           |
| Tesler's              | <requirement>                                                           | <number>                    | <method>                           |
| Postel's              | <requirement>                                                           | <number>                    | <method>                           |
| Parkinson's           | <requirement>                                                           | <number>                    | <method>                           |
| Occam's               | <requirement>                                                           | <number>                    | <method>                           |
| Pareto                | <requirement>                                                           | <number>                    | <method>                           |
| Interactivity floor   | <composer in context; every state actionable; live state; no dead ends> | <static-report test passes> | <walk the flow, act on each state> |

"N/A because <reason>" is a valid cell. An empty cell is not.

## 5. State matrices

### 5.1 Semantic surface-state matrix

These stable IDs are the binding screen states. The owning phase document and
`figma-code-map.json` must list this exact set; a control-state table cannot substitute for it.

| State ID | Fixture / event | Visible content | Permitted actions | Recovery / next state | Responsive evidence | Figma / textual authority |
| --- | --- | --- | --- | --- | --- | --- |
| <surface.state> | <deterministic fixture or triggering event> | <what the user sees> | <actions available in this state> | <recovery or next state> | <required viewport evidence> | <frame node or reference decision> |

### 5.2 Control interaction-state matrix

| Control / region | default | hover | focus-visible | active | disabled | loading | empty | error |
| ---------------- | ------- | ----- | ------------- | ------ | -------- | ------- | ----- | ----- |
| <control>        | <how>   | <how> | <how>         | <how>  | <how>    | <how>   | <how> | <how> |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** <how>
- **Every shown state actionable in place:** <state → action, for each state the screen shows>
- **Live, not snapshot:** <what streams / what shows Step N of M / what the activity stream contains>
- **Direct manipulation:** <what can be dragged, edited inline, resized> or "none — <why>"
- **No dead ends:** <the next action and the way back on every state>
- **Approvals and questions separate from chat:** <how> or "N/A because <reason>"

## 7. Evidence (filled at gate; `pending` is allowed only while Status is `contract`)

| Check                                                         | Artifact path (repo-relative) | Result  |
| ------------------------------------------------------------- | ----------------------------- | ------- |
| Side-by-side: built screen vs Figma frame vs Mobbin reference | pending                       | pending |
| Token lint (`scripts/check_ux_tokens.py`)                     | pending                       | pending |
| State-matrix test (every §5 cell rendered)                    | pending                       | pending |
| Accessibility check (WCAG 2.1 AA, keyboard, reduced motion)   | pending                       | pending |
| Visual regression vs approved frame (tolerance stated)        | pending                       | pending |
| Independent audit report (law + reference per finding)        | pending                       | pending |
| Static-report test on every state                             | pending                       | pending |

## 8. Sign-off (three distinct people or sessions; the builder never certifies)

- **Builder:** <name> — <date>
- **Verifier:** <name> — <date>
- **QA:** <name> — <date>
