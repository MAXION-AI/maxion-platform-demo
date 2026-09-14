# UX reference sheet — Agentix run canvas

- **Status:** contract
- **Sheet id:** agentix-run-canvas
- **Owner (builder):** Codex session 2026-09-13 — implementation worktree
- **Verifier (independent):** unassigned — a separate session from the builder
- **QA:** unassigned — a separate session from the builder and the verifier

## 1. Surface

- **Module / screen:** Agentix — A07 Run (the run canvas) with A15 Conversation & human commands as its conversation layer
- **Surface class:** product
- **Target user:** the initiative owner (the north-star personas: a Revenue Operations Director, a Corporate Controller) watching and steering live operational work
- **Top jobs (1–3):** see what the initiative is doing right now and what it needs from me; steer, answer, or stop it in place; reach the evidence and the produced objects without leaving the run
- **Route(s) / component(s):** /maxion-prototype or /agentix-prototype → Agentix → deployed agent → case · DeployedAgentsPage, OperationsViews.RunDetail

## 2. References (examined, cited)

| Job the reference proves                                                               | App          | Mobbin link                                                     | Decision taken (words, not pixels)                                                                                                           |
| -------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Run canvas anatomy: conversation as the timeline, plain-word action log, presence line | Devin        | https://mobbin.com/screens/b427b367-6210-4200-972d-ead195327f97 | The conversation is the timeline; actions are logged in plain words with durations, collapsible; a one-line presence state is always visible |
| Context-aware composer while a run is live                                             | Devin        | https://mobbin.com/screens/b427b367-6210-4200-972d-ead195327f97 | The composer says what sending does ("Guide Agentix while it works") and carries a stop control while the run is live                        |
| Evidence in tabs beside the conversation                                               | Devin        | https://mobbin.com/screens/221b829d-3c18-44ae-b6bd-cb85c6569258 | Evidence lives in tabs beside the chat, never inside it; the ending shows the produced object, its evidence and a feedback row               |
| Details rail with per-run usage in units                                               | Relevance AI | https://mobbin.com/screens/db919f38-24cb-4151-b995-2781392d7db2 | A right rail carries status, actions used, units used, run time and linked tools                                                             |
| "Needs input" question card, distinct from approvals                                   | Cofounder    | https://mobbin.com/screens/52d55c74-ed5e-4f4f-adbf-40715cb4bb66 | Questions are cards with one recommended option, "something else", and decide-this-one vs decide-all                                         |
| Approval card with the full proposed object and one primary decision                   | Higgsfield   | https://mobbin.com/screens/f0ee7046-b34e-415a-a830-564baf6f902d | A proposed action is shown in full with one primary Approve and a Stop; approving never widens authority                                     |
| Working state with a floating status pill and a stop in the composer                   | Manus        | https://mobbin.com/screens/59dd33d5-6390-464e-a5b0-48ceced1b893 | Elapsed time and step count sit in a docked pill above the composer; stop is in the composer                                                 |
| Live connected-system operation as a collapsed step card                               | Lindy        | https://mobbin.com/screens/9f4affd5-f387-4149-860e-95c83f9bbba5 | A live external operation is a collapsible step card in the timeline, not a machine tab                                                      |
| Full session flow from brief to result                                                 | Devin        | https://mobbin.com/flows/1c40fdf3-a43d-4710-b636-77651c48f7f8   | Brief → working → paused-for-input → result object; the same canvas throughout                                                               |
| Failed tool operation with a recovery action                                           | Zapier       | https://mobbin.com/screens/0551ccd5-c726-4e4d-b61f-05aceac62501 | A failed step states the error in one line and offers one recovery action and one hand-off                                                   |

- **Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `46:933` ([Agentix run-canvas reference frame](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=46-933)) — editable replacement fetched and visually inspected through the Figma connector on 2026-09-13 after the inherited source file stopped being accessible to the implementation account.
- **Decisions rejected from the references and why:** Devin's mode selector (Agentix shows no model, effort or type controls — capability lives in the charter); Devin's dollar usage (units only); Devin's machine semantics — reboot, terminate, IDE and Shell tabs (no container per agent; evidence tabs are sources, decisions, tool operations, verification, artifacts, connected-system records); Devin's PR, CI and branch objects (Agentix objects are proposed change, verification, connected system, human step).

## 3. Token and component mapping (the look comes only from here)

| Element on screen                                                                          | Maxion component     | Tokens used                                                           | Reference decision it implements                              |
| ------------------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| Presence line ("Agentix is verifying the Salesforce record")                               | WorkspaceRunHeader   | --mxp-font-sans, --mxp-text-muted, --mxp-space-2                         | Status is a sentence, always visible (Devin)                  |
| Action log entries with durations                                                          | TimelineEvent        | --mxp-font-sans, --mxp-text-subtle, --mxp-divider, --mxp-space-3        | Plain-word actions, collapsible (Devin)                       |
| Composer with send / interrupt / resume / stop                                             | WorkspaceComposer    | --mxp-surface-raised, --mxp-border, --mxp-accent, --mxp-radius-md       | Context-aware composer with a stop control (Devin, Manus)     |
| Status pill above the composer                                                             | RunStatusPill        | --mxp-surface, --mxp-shadow-1, --mxp-font-mono                          | Docked elapsed time and step count (Manus)                    |
| Evidence tabs (Sources · Decisions · Tool operations · Verification · Artifacts · Records) | EvidenceTabs         | --mxp-divider, --mxp-text, --mxp-accent                                 | Evidence beside the chat, never inside it (Devin)             |
| Details rail (status, actions, units, run time, linked connections)                        | OperationsDetailRail | --mxp-surface, --mxp-text-muted, --mxp-font-tabular                     | Per-run usage in units (Relevance AI)                         |
| Question card                                                                              | DecisionCard         | --mxp-surface-raised, --mxp-accent, --mxp-radius-lg                     | One recommended option, decide-this vs decide-all (Cofounder) |
| Approval card                                                                              | ApprovalCard         | --mxp-surface-raised, --mxp-danger, --mxp-accent                        | Full object, one primary decision (Higgsfield)                |
| Status badge in the runs sidebar                                                           | StatusBadge          | --mxp-status-info/success/warning/danger/neutral                        | Status is a sentence plus a tone, never a bare dot (Devin)    |

- Raw colour, font, radius or shadow values are forbidden in components; `scripts/check_ux_tokens.py` enforces it.

## 4. Laws-check (one row per law, plus the interactivity floor)

| Law                   | Requirement for this screen                                                                                                                                                                                   | Number / acceptance                                                  | Verified how                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| Hick's                | One composer; one primary action per state (send while idle, stop while live, approve on an approval card); advanced options never on the canvas                                                              | ≤ 5 visible controls in the composer row; 1 filled button per card   | screenshot count per state          |
| Fitts's               | Composer, stop, approve and answer controls are large and adjacent to what they act on; the stop control sits inside the composer                                                                             | ≥ 44×44px; ≥ 8px gap between adjacent controls                       | inspect computed sizes              |
| Jakob's               | The canvas matches the run-canvas anatomy of Devin, Manus, Relevance AI, Cofounder and Lindy (§2): timeline left, evidence tabs right, composer bottom                                                        | 5 references named; side-by-side matches on layout roles             | side-by-side review against §2      |
| Proximity             | Timeline items group by "worked for" spans; the details rail groups usage fields; the composer's controls sit in one row                                                                                      | within-group 4–8px, between-group ≥ 16px                             | inspect                             |
| Miller's              | Evidence tabs ≤ 6; the action log collapses spans longer than 7 items                                                                                                                                         | ≤ 6 tabs; ≤ 7 visible items per open span                            | count                               |
| Doherty               | Send, stop, answer and approve acknowledge in place immediately; streaming starts before the first token lands                                                                                                | < 100ms press state; < 400ms visible acknowledgement on throttled 3G | throttled run, screenshot timeline  |
| Von Restorff          | Exactly one filled accent control per state; the presence line is the only other emphasised element                                                                                                           | 1 filled button; accent ≤ 10% of the surface                         | squint screenshot                   |
| Serial Position       | The presence line is the first element of the timeline column; the composer is the last; the details rail lists status first and linked connections last                                                      | order fixed in the layout spec                                       | screenshot                          |
| Peak-End              | The run ends on the produced object with evidence and next actions, never on a toast                                                                                                                          | completion state shows object + evidence + next action               | walk the flow to completion         |
| Zeigarnik             | Step N of M in the status pill; progress persists across refresh and reconnect                                                                                                                                | M fixed once the plan is committed; progress survives reload         | reload mid-run                      |
| Prägnanz              | Three top-level regions: timeline, evidence tabs, details rail                                                                                                                                                | ≤ 3 regions at thumbnail size                                        | thumbnail screenshot                |
| Similarity            | Question cards, approval cards and timeline items are visually distinct types; all approvals look the same everywhere in Agentix                                                                              | 1 appearance per card type across the module                         | inventory of card types             |
| Uniform Connectedness | Each card binds one object (one question, one proposed action); the evidence tabs bind one run                                                                                                                | no container mixes objects                                           | inventory                           |
| Tesler's              | The system names the step, the source and the verification; the user never types identifiers or picks tools                                                                                                   | 0 fields asking for what the system knows                            | walk the flow                       |
| Postel's              | The composer accepts any phrasing of steer, answer and stop; the timeline renders one consistent format for every action                                                                                      | paste-ugly-input test passes; 1 format per action type               | paste test                          |
| Parkinson's           | Every waiting state shows an expected duration or the reason it cannot                                                                                                                                        | expected duration or "waiting on" plus a named person on every wait  | walk each wait state                |
| Occam's               | Nothing on the canvas that a state does not need; machine-semantics tabs are absent                                                                                                                           | every element survives "what breaks if removed?"                     | review                              |
| Pareto                | The three top jobs (see now / act in place / reach evidence) are the largest, first and fastest elements                                                                                                      | jobs mapped to the three regions                                     | review                              |
| Interactivity floor   | Composer in context; every shown state actionable in place (question → answer, proposal → approve/amend, run → steer/stop, exception → assign/escalate, artifact → open/regenerate); live state; no dead ends | static-report test passes for 7 declared states                     | walk the flow and act on each state |

## 5. State matrices

### 5.1 Semantic surface-state matrix

| State ID | Fixture / event | Visible content | Permitted actions | Recovery / next state | Responsive evidence | Figma / textual authority |
| --- | --- | --- | --- | --- | --- | --- |
| run.idle | Run selected before work starts | Brief, authority, evidence scope, and one start action | Start or return to operations | run.live | Four viewport captures | §2 Devin full-session flow |
| run.live | Active deterministic run | Presence, timeline, current step, evidence tabs, details, and composer | Steer, stop, expand step, or inspect evidence | run.question, run.approval, run.failed, or run.completed | Four viewports | Figma 46:933 and §2 Devin |
| run.question | Agent needs irreducible input | Question card, progress, recommended option, and other-answer path | Answer one, answer all when safe, or stop | run.live | Four viewports | §2 Cofounder |
| run.approval | Proposed bounded action needs authority | Full object/version/consequence and explicit decision controls | Approve, amend, reject, or stop | run.live or run.failed | Four viewports | §2 Higgsfield |
| run.failed | Tool or verification fails | Plain error, retained passed work, evidence, and one recovery | Retry, reconnect, or hand off | run.live or run.disconnected | Four viewports | §2 Zapier |
| run.disconnected | Connection drops | Stale status, preserved draft, last event time, and reconnect | Reconnect, copy draft, or return | run.live or agentix-ops.today | Mobile and desktop captures | Textual authority: connection-loss contract |
| run.completed | Valid terminal event includes object/evidence | Produced object, verification, evidence, feedback, and next action | Edit, regenerate, inspect evidence, or return | Artifact owner or agentix-ops.today | Four viewports | Figma 46:933 and §2 Devin |

### 5.2 Control interaction-state matrix

| Control / region | default                       | hover              | focus-visible    | active                     | disabled                                                | loading                              | empty                                  | error                                                |
| ---------------- | ----------------------------- | ------------------ | ---------------- | -------------------------- | ------------------------------------------------------- | ------------------------------------ | -------------------------------------- | ---------------------------------------------------- |
| Composer send    | filled accent                 | accent hover token | 2px ring, offset | pressed scale 0.98         | muted when empty                                        | replaced by stop while live          | placeholder "Message Agentix"          | inline error under the field, field keeps text       |
| Stop control     | visible only while live       | hover token        | 2px ring         | pressed                    | n/a when idle                                           | "Stopping…" with spinner ≤ 1s        | n/a                                    | "Could not stop — retry" inline                      |
| Timeline item    | collapsed summary             | reveal chevron     | ring on the row  | expanded                   | n/a                                                     | skeleton row matched to final height | "No actions yet — Agentix is planning" | failed item with one-line error and recovery action  |
| Evidence tab     | text                          | underline hover    | ring             | active underline in accent | n/a                                                     | skeleton panel                       | "No sources used yet"                  | "Could not load — retry"                             |
| Question card    | one recommended option marked | option hover       | ring per option  | selected option            | after answering, card collapses to the answer           | n/a                                  | n/a                                    | "Answer not delivered — retry"                       |
| Approval card    | full object + Approve + Stop  | button hover       | ring             | pressed                    | after decision, card shows the decision and who made it | "Applying…" with progress            | n/a                                    | "Approval failed at the provider — see verification" |
| Details rail     | values                        | n/a                | n/a              | n/a                        | n/a                                                     | skeleton values                      | dashes with "not started"              | stale indicator with last-updated time               |

## 6. Interactivity floor (how this screen meets each item)

- **Composer in context:** the composer is docked to the run; it steers this run or starts a continuation, and says which; send, interrupt, resume and stop are its only controls.
- **Every shown state actionable in place:** question → answer on the card; proposed action → approve or amend on the card; live run → steer or stop from the composer; failed step → retry or hand off on the item; human step → assign or escalate on the item; artifact → open in the evidence tab or ask for regeneration from the composer.
- **Live, not snapshot:** the presence line and status pill update as the run progresses; the action log streams; the evidence tabs fill as sources, decisions, tool operations and verification arrive; simulated, sandbox and production-verified results carry distinct labels.
- **Direct manipulation:** evidence tabs are resizable against the timeline; the details rail collapses; nothing else is spatial on this screen.
- **No dead ends:** every state shows the next action; completion ends on the produced object with next actions and a way back to the initiative; a stopped run offers resume or a new continuation.
- **Approvals and questions separate from chat:** both are cards outside the message stream; approving never widens recipients, budget, connections or authority.

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

- **Builder:** Codex session 2026-09-13 — pending
- **Verifier:** unassigned — pending
- **QA:** unassigned — pending
