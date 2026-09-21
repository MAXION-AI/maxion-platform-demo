# ElevenLabs reference map

Every Dashboard, Projects, Discovery and Agentix surface is built from an ElevenLabs web screen captured on Mobbin.
Before a surface is designed, the matching screen is found with the Mobbin
connector (`search_screens`, platform `web`, "ElevenLabs …" in the query),
downloaded, scaled to its 1440px viewport and studied. The composition below is
what was taken from each screen. Numbers live in `src/design/tokens.css`; the
measured type and colour values are recorded in `docs/visual-spec.md`.

Captures are 1920px WebP images of a 1440×900 viewport. Decode with `dwebp`,
then scale by 0.75 to measure in CSS pixels.

## Surface → reference

| Discovery surface | ElevenLabs screen | Mobbin |
| --- | --- | --- |
| Hub | Agents list with the "Get started with a template" tray | [02042d42](https://mobbin.com/screens/02042d42-1cb8-47ba-89d5-c8c99e719d7c) |
| Hub rows, filters | Conversation history table | [9369bd47](https://mobbin.com/screens/9369bd47-0cec-4ff6-bc1e-0e087830e574) |
| Create, brief | Create agent: type choice | [88ed2c5d](https://mobbin.com/screens/88ed2c5d-b81f-4194-b364-e47aec63b506) |
| Create, templates | Create agent: use case cards | [664c7ce6](https://mobbin.com/screens/664c7ce6-a63d-4b9d-92ae-8e7224b4693f) |
| Create, review | Create agent: "Complete your agent" | [49af5195](https://mobbin.com/screens/49af5195-bf27-4544-a499-4775956e03c3) |
| Mission authority confirmation | Audiobook "Confirm your book submission for review" | [e0c00815](https://mobbin.com/screens/e0c00815-f7b1-4961-bc82-4baacdda1389) |
| Mission authority rows | Agent Security tab guardrails | [299c5bc7](https://mobbin.com/screens/299c5bc7-2a16-4862-8931-220c7d21f6a7) |
| Preparation | "Your Professional Voice Clone is being prepared" | [560e2903](https://mobbin.com/screens/560e2903-4186-4188-97f2-30811de6a4f7) |
| Cockpit frame | Agent page: breadcrumb, status pill, tab strip, Publish | [9785c0b7](https://mobbin.com/screens/9785c0b7-70e8-4c3d-9d59-10ecf468e65e) |
| Cockpit overflow menu | Agent "…" menu | [9e0eefdb](https://mobbin.com/screens/9e0eefdb-916a-45b2-adc1-71b04843ade0) |
| Thread column and composer | Test AI agent | [8dbb547d](https://mobbin.com/screens/8dbb547d-2795-4646-95de-1a49b6d4733d) |
| Thread turns and bands | Conversation transcript | [0ce2e993](https://mobbin.com/screens/0ce2e993-4b26-4e04-bfeb-ac0a44dc226c) |
| Thread details panel | Conversation Metadata panel | [b547338d](https://mobbin.com/screens/b547338d-1640-4ae4-a999-10ab8552ddeb) |
| Jump-to-decision bar | Workflow tab "Ready to go from start node…" prompt | [aa384f7c](https://mobbin.com/screens/aa384f7c-33b2-436e-a01a-3f20dff0b6e1) |
| Voice | Agent voice preview with transcript | [5de031ac](https://mobbin.com/screens/5de031ac-ea60-46c7-869a-32b443d38647) |
| Autonomy page and right column | Agent Analysis tab | [7071365d](https://mobbin.com/screens/7071365d-8de3-4587-bfb5-065632afb6d2) |
| Autonomy figure card | Agents dashboard metric tabs | [a5f35d02](https://mobbin.com/screens/a5f35d02-8fe2-4555-b346-e3d5b6b615cb) |
| Autonomy journey graph | Agent Workflow tab with node settings | [1610e881](https://mobbin.com/screens/1610e881-9759-4c93-96e4-9663fbccb9bf) |
| Records by source | Developers analytics "Top called paths" | [9c9027b7](https://mobbin.com/screens/9c9027b7-8476-468d-b975-2aec209f8c72) |
| Workshop | Test status for an agent | [d9cd8778](https://mobbin.com/screens/d9cd8778-5d88-4b16-92a0-c548cd1e67b6) |
| Package | Studio chapters and document | [0462ca01](https://mobbin.com/screens/0462ca01-d4d5-47ef-a4a3-2c6c2e51d195) |
| Charter gate | Agent page "Expressive Mode" callout | [9785c0b7](https://mobbin.com/screens/9785c0b7-70e8-4c3d-9d59-10ecf468e65e) |
| Charter approval, Continue to Plan | Review Changes dialog | [ff16450b](https://mobbin.com/screens/ff16450b-9de9-4c60-8738-770be8df0a5c) |
| Setup and its sections | Add webhook / Import phone number sheets | [b87b3a86](https://mobbin.com/screens/b87b3a86-8fb1-4c25-958c-967bd5c4aee6), [72f049fe](https://mobbin.com/screens/72f049fe-10f1-439b-86ed-6720ee053bac) |
| Manifest toggles | Agent Widget tab | [618baeaf](https://mobbin.com/screens/618baeaf-1522-4b97-92db-e61f36b76331) |
| Command menu | Conversations search dropdown | [ff8a9252](https://mobbin.com/screens/ff8a9252-a7ca-400c-9161-915aa868a91f) |
| Toast | Music publish confirmation | [ba477bee](https://mobbin.com/screens/ba477bee-b1fd-4c03-b512-7b1aa5191ee5) |

## What each screen contributed

**Test AI agent → Thread.** A message column 824px wide, centred. An info callout
on a #f5f5f5 fill above the first turn. The composer floats: a 648px card with a
20px radius, a hairline and a soft shadow; the text is 15px; the bar under it
has the secondary action on the left and a ghost action beside the filled Send
on the right. Send is solid #a1a1aa while empty.

**Conversation transcript → Thread turns.** A speaker line (16px avatar, name,
chevron, topic, a grey chip) above each bubble. Bubbles are white with a
hairline and a 16px radius, indented under the speaker; the caller's bubble is
right-aligned on #f5f5f5. Meta chips ("TTS 146 ms") sit on the bubble's bottom
edge. Workflow events are a quiet #fafafa band with a kicker at the left and a
centred line. The Metadata panel is a 286px column of label and value rows.

**Agent page → cockpit.** A 46px bar: breadcrumb, a tinted status pill beside the
name, grey pills and outline actions on the right ending in one filled action
("Publish" there, "Continue to Plan" here), then a "…" menu. A 40px tab strip on
a hairline, 13px labels with 12px padding and a 2px ink underline.

**Analysis tab → Autonomy.** A page title, rows 52px tall with a caret, a status
pill at the right, no dividers between rows, and expanded rows that hang key
and value lines from a tree connector. The right column is titled groups, each a
description and one bordered card of rows.

**Agents dashboard → figure card.** A white card with a 16px radius inside a
#fafafa tray. Metric tabs across the top on the tray colour; the active tab is
white with a 2px ink underline; labels 13px, values 17px.

**Workflow tab → journey.** Node cards on a dot grid joined by edges with
arrowheads; edge pills in green, ink and amber; the selected node has an ink
border; a settings panel beside the canvas with a titled callout and rows.

**Studio → Package.** A chapters panel of grouped cards, the selected row on
#f2f2f4 with a filled check; the document in a centred column about 700px wide
with quiet leading and a single rule beside the argument.

**Create agent → Create.** One 612px column centred on white, a round close
button at the top right, a 22px title with a 16px subtitle, 44px fields with a
character count inside, a grey toggle row, Back beside the filled action, and
page dots with the active dot drawn as a pill.

**Voice clone preparing → Preparation.** The orb, a 34px two-line title, one
line of context and one action.

**Voice preview → Voice.** A slim bar with Back and the conversation's name, the
orb with its call button overlapping the bottom, a floating pill of controls,
and a transcript panel with a pill composer. MAXION's orb uses its teal.

**Side sheets → Setup.** An icon tile beside the title, a line of description,
section cards on #fafafa with their action at the right, actions pinned below,
and a light scrim over the page.

**Review Changes → dialogs.** A 20px panel over a blurred white scrim; a title
with a close button; a two-column comparison with monospace headers; a field;
Cancel at the left, the filled action at the right.

## Agentix surface → reference

The engagements landing is unchanged. Inside an engagement the surfaces follow
`docs/agentix-workspace-ux.md`: Work, Results and Activity, one scoped composer,
and a Details sheet. The table cites only screens already examined for this map.
Where no ElevenLabs screen was examined, the row says so and the surface follows
the local direction.

| Agentix surface | ElevenLabs screen | Mobbin |
| --- | --- | --- |
| Setup rail (describe, review, activate) | Audiobook publishing stepper | [e0c00815](https://mobbin.com/screens/e0c00815-f7b1-4961-bc82-4baacdda1389) |
| Describe the work, route preview | Create agent: type choice and use cases | [88ed2c5d](https://mobbin.com/screens/88ed2c5d-b81f-4194-b364-e47aec63b506), [664c7ce6](https://mobbin.com/screens/664c7ce6-a63d-4b9d-92ae-8e7224b4693f) |
| Engagement header | Batch call detail: name, id, pill row, outline actions | [567dc229](https://mobbin.com/screens/567dc229-f5c7-47f9-8de0-7a9960dc11ce) |
| Work, Results, Activity tabs | Agent page tab strip | [9785c0b7](https://mobbin.com/screens/9785c0b7-70e8-4c3d-9d59-10ecf468e65e) |
| Work list rows | Batch call recipients table | [567dc229](https://mobbin.com/screens/567dc229-f5c7-47f9-8de0-7a9960dc11ce) |
| Readiness rows | Integration connected / connection failed | [59145d3d](https://mobbin.com/screens/59145d3d-bdda-4a24-b2f4-8f02acec3e3c), [e37ce067](https://mobbin.com/screens/e37ce067-3ae6-4212-81b0-5d65968f8fa5) |
| Decision and release cards, required outcomes, operation facts | Conversation overview: rows and criteria pills | [b547338d](https://mobbin.com/screens/b547338d-1640-4ae4-a999-10ab8552ddeb) |
| Activity | User sheet conversation timeline | [e5619492](https://mobbin.com/screens/e5619492-dfcd-4ad4-9fc9-d4c0cdd58c6d) |
| Composer and conversation panel | Test AI agent and test status transcript | [8dbb547d](https://mobbin.com/screens/8dbb547d-2795-4646-95de-1a49b6d4733d), [d9cd8778](https://mobbin.com/screens/d9cd8778-5d88-4b16-92a0-c548cd1e67b6) |
| Details sheet, Demo sheet | Side sheet holding the workspace members list | [b87b3a86](https://mobbin.com/screens/b87b3a86-8fb1-4c25-958c-967bd5c4aee6), [cfafeb9d](https://mobbin.com/screens/cfafeb9d-dc83-4a91-888e-32824c1c755f) |
| Toast | Members "Reminder email sent" toast | [cfafeb9d](https://mobbin.com/screens/cfafeb9d-dc83-4a91-888e-32824c1c755f) |
| Discovery handoff | Review Changes panel in a Studio reading column | [ff16450b](https://mobbin.com/screens/ff16450b-9de9-4c60-8738-770be8df0a5c), [0462ca01](https://mobbin.com/screens/0462ca01-d4d5-47ef-a4a3-2c6c2e51d195) |
| Result previews (mapping, pipeline, reconciliation, dashboard, runbook, versions) | None examined | Local direction: business view first, then checks, versions and releases |

**Batch call → engagement.** A 22px name with a subtle identifier beneath
(`agx_invoice`), a row of 24px grey pills for the facts, one tinted status pill,
and outline actions at the right. Only a decision's primary action is filled.
Work rows keep the batch table's quiet grouping: section labels over one
hairline, rows without dividers, and the status pill at the far right.

**Stepper → setup.** A 240px rail of steps with a filled check, a ring for the
current step and a connector, beside a 704px column of titled sections. The
filled action is pinned in a bar at the foot, with Back at the left.

**Connection failed → readiness.** One bordered card of rows: read sources, build
and test in isolation, change production. Each row has its own pill, so one
missing capability never reads as the whole outcome being ready.

**Conversation overview → decisions and work.** A decision is a white card with
its facts as label and sentence rows, the consequence in the foot, and the one
filled action at the right. Required outcomes are rows with their own pills.
Steps are an unboxed timeline with owner, system and receipt chips; test runs
list each version and what failed.

**Test agent → conversation.** The composer sits in the dock with its scope in
the bar's left slot, as in Plan and Execute. The panel is a 392px column with
speaker lines, white bubbles, and the owner's turns on grey at the right. It
opens as an overlay, pins beside the work, or becomes a full-screen sheet on
phones.

Agentix marks use the same seeded `Mark` as the landing, so an engagement, its
duties, its systems and its Discovery sources each keep one colourful logo.

## Portal surfaces → reference

| Surface | ElevenLabs screen | Mobbin |
| --- | --- | --- |
| Dashboard | Home: workspace kicker, greeting, illustrated action tiles, two titled lists | [ec8402ae](https://mobbin.com/screens/ec8402ae-42c3-432a-9f1c-066d27fd8c07) |
| Projects page | Studio: title with actions, "Get started" cards, recent projects with search, chips and a grid/list switch | [ab7a5853](https://mobbin.com/screens/ab7a5853-775f-4d02-a965-07dc33e03a3e) |
| Projects table | Productions: quiet column labels, status pills, tag chips | [675595a6](https://mobbin.com/screens/675595a6-28dc-4781-8805-85f41d319ff8) |
| Create project | Review Changes dialog over the blurred white scrim | [ff16450b](https://mobbin.com/screens/ff16450b-9de9-4c60-8738-770be8df0a5c) |
| Project details | Side sheet with the user-sheet rows | [b87b3a86](https://mobbin.com/screens/b87b3a86-8fb1-4c25-958c-967bd5c4aee6), [e5619492](https://mobbin.com/screens/e5619492-dfcd-4ad4-9fc9-d4c0cdd58c6d) |

**Home → Dashboard.** Measured on the capture: action tiles 172×171 on #f5f5f5
with a 20px radius and a 13px label beneath, a 26px greeting under a 13px kicker,
17px section titles, and "Create or clone" illustration tiles of 116×87. Each
MAXION action tile carries a small piece of product UI and one colourful badge
(HomeArt.tsx). The workspace summary is plain columns between two hairlines, and
the activity avatars are module glyphs on their tint with a status dot where the
reference shows its verified badge.

**Studio → Projects.** Templates are tinted art cards with a document sheet and
the project's logo. Recent projects sit behind a full-width search, 24px filter
chips and a square grid/list switch; the list is the Productions table, the grid
is bordered cards, and every project wears its own tint and Mark.

**Sidebar glyphs.** The sidebar and the command menu's module rows use abstract
figures from NavGlyphs.tsx (a board, stacked layers, a radar, a route, a build
block, one accountable agent over two duties, sliders, linked rings, a stamp,
rising bars, a ring buoy) instead of stock pictograms. Each has a receding back
layer and an accent that takes the module's tint on hover and when open, plus one
small hover gesture (the Agentix node pops and its lines draw down to the duties)
that only plays when the viewer allows motion.

## Motion

Motion follows motion.dev and Aceternity's patterns, implemented in
`src/components/motion/MotionKit.tsx`: streamed MAX text resolves word by word
from a blur (text generate), pending work shimmers, preparation uses a
multi-step loader, empty briefs cycle example prompts, the live journey node is
traced by a moving border, the tab underline slides, and new turns rise into
place. In Agentix, work rows rise into the list, live work carries a pinging dot
and a shimmering sentence, the sheets slide in, and activation confirms with a
toast. Entrances never fade text in, so accessibility contrast checks hold while
anything is moving. Everything honours reduced motion.
