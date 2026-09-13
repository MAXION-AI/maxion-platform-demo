# Mobbin AI apps — the product-surface north star

**Standing rule (owner, 2026-09-11):** the Mobbin library of **web apps in the AI category, sorted by
popularity** is the north star for every Maxion product surface, and **every module is interactive —
especially Agentix.**

Source: https://mobbin.com/search/apps/web?content_type=apps&sort=popularity&filter=appCategories.AI
(account required; Mobbin blocks unauthenticated fetchers). Harvested 2026-09-12 from the signed-in
library: **113 apps**, in Mobbin's popularity order. Re-harvest quarterly; the order shifts.

This is the repository copy (source of truth); the Claude Code and Codex `premium-ux` skills mirror it.
The laws it serves are in `docs/operations/ux-laws-policy.md`.

This file answers two questions the laws leave open:

1. **Jakob's Law says "follow familiar patterns" — familiar to whom?** To people who use these apps.
   For a Maxion product surface, "familiar" means "what the top of this list does".
2. **What does "interactive" mean, concretely, for a module?** §3 below.

---

## 1. How to use it

- **Use the Mobbin connector first.** The session has an official Mobbin MCP with three tools —
  `search_screens`, `search_flows`, `search_sections` (web or iOS). Describe one screen or one
  journey in plain language, name an app to filter, and read the returned images; every result
  carries a canonical `mobbin_url` to cite. This is the reproducible, session-free route for
  pattern grounding. (The popularity _ranking_ in §5 still needs the signed-in browser — the
  connector has no "list apps by popularity" tool.) §6 below is a starter set of cited screens.
- **The reference sheet is the artifact (maxion-platform-demo).** One sheet per screen from
  `docs/operations/ux-reference-sheet.template.md`: references (from here), Figma frame, token mapping,
  laws-check, state matrix, evidence, three sign-offs. `scripts/check_ux_reference_sheet.py` gates it;
  `docs/operations/ux-reference-sheets/agentix-run-canvas.md` is the filled example.
- **REQUIRE mode:** for every product surface, name the 3–5 reference apps it must feel familiar next
  to (pick from §2 by job), and list the patterns from §4 the surface adopts. Put them in the
  laws-check table's Jakob's row, each with a Mobbin screen link from §6 or a fresh search.
- **BUILD mode:** open the reference apps' Mobbin screens and flows for the job at hand _before_
  composing. Adopt the shared pattern; spend novelty only on the system (type, colour, motion
  quality, copy). Never invent an interaction pattern that none of the top apps use.
- **EVALUATE / AUDIT mode:** put the screen next to its reference apps. Every gap is a finding with a
  law and a named reference ("Manus and Devin show the plan as steps with live status; ours shows a
  static list — Zeigarnik, Doherty").
- **Precedence:** this file sits inside tier 5 (aesthetic direction) for _look_ and inside tier 3
  (the laws, via Jakob's) for _patterns_. It never overrides security, accessibility, or a law.

---

## 2. The reference set, by job (all 113 are in §5)

Pick references by the **job the surface does**, not by fame. Rank in parentheses = Mobbin
popularity rank on the harvest date.

**Assistant / chat workspaces** — Perplexity (8), Claude (14), Google Gemini (25), Grok (32),
ChatGPT (83), Microsoft Copilot (62), Pi (81), Sana AI (2), Qatalog (16), Langdock (101).
_Learn:_ persistent composer, streamed answers, inline citations with hover previews, suggested
next actions, thread history, an artifacts/canvas side panel, model-free UI (no knobs).

**Autonomous agent runs** — Manus (19), Devin (87), Cursor (33), Lovable (15), v0 (40), Replit (23),
Bolt.new (74), Emergent (107), Base44 (67), MagicPath (103), Obvious (71), Cofounder (98),
Firecrawl (11), Exa (89). _Learn:_ plan-as-steps with live status, collapsible activity/tool log,
preview pane beside the conversation, approve/steer/stop controls, checkpoints and restore, clear
"needs your input" cards distinct from approvals, usage shown in the product's unit.

**Agent builders and operations** — Lindy (57), Relevance AI (96), StackAI (68), Adaline (34),
Chatbase (63), Lemni (56), n8n (79), Airtable (12), WRITER (94), Vapi (92), ElevenLabs (17),
Hume AI (59), PlayAI (48). _Learn:_ agent card = charter + triggers + duties + connections with
health; runs list with status; approvals inbox; versioned configuration; test-before-activate.

**Work management and CRM** — ClickUp (3), Height (9), Motion (46), Current (41), folk (1), Clay (5),
Superhuman Mail (51), Threads (58), Frame (28), Cal.com (29). _Learn:_ dense tables with inline edit,
saved views and filters, command palette, an AI side panel that acts on the selected rows, keyboard
completeness.

**Meetings, notes, knowledge** — Otter AI (22), Grain (53), Fireflies (108), Amie (13), Reflect (27),
Craft (21), Strut (30), Elicit (72), Dropbox Dash (113). _Learn:_ transcript + summary + action items
as one object; playback linked to text; evidence links back to source; capture → structured output.

**Data, analytics, evals** — Amplitude (18), Hex (39), Supabase (31), Databricks (73), Rows (78),
Basedash (97), Braintrust (66), Peec AI (43), Profound (45), Aboard (44). _Learn:_ query → chart →
narrative in one flow; dense dashboards that stay legible at thumbnail size (Prägnanz); AI explains
a number on demand.

**Creative generation** — Runway (24), Midjourney (91), Luma AI (37), Krea AI (70), Sora (105),
Higgsfield (110), Magnific (104), Leonardo AI (95), VEED (35), Suno (60), FLORA (61), Visual
Electric (100), Weavy (93), Stitch (69), Gamma (111), Chronicle (84), Synthesia (86), Adobe
Express (99), Framer (20), Relume (50), Wix (88). _Learn:_ prompt → variations → refine loop;
generation progress that is real; versions kept; the output is the hero of the screen (Peak-End).

**GTM, hiring, marketplaces** — Jasper (10), Copy.ai (26), Wrangle (75), Contra (6), Shop (7),
Mercor (90), Pin (77), Braintrust hiring (76), Navattic (64), Arcade (82), Wayyy (54), Mindtrip (38),
PamPam (65), Ferndesk (106), Codecademy (109), Zoom (52), GitLab (102), Grammarly (49), OpenAI
Platform (4), Google AI Studio (85), Mistral AI (47), Cohere (80), Bard (42), Gemini Notebook (55),
Heidi (36), fal (112).

**Maxion mapping.** Discover ↔ meetings/notes + assistant; Plan ↔ assistant + creative "output is
the hero"; Execute ↔ autonomous agent runs; **Agentix ↔ autonomous agent runs + agent builders and
operations — Devin is the primary reference (owner decision, 2026-09-12; anatomy in §7)**, with
Manus, Relevance AI, Lindy, StackAI and Adaline as secondary neighbours; the portal shell ↔ work
management.

---

## 3. The interactivity floor — every module is interactive, especially Agentix

A module surface is **interactive** when the user can act on it in place. A module surface is a
**report** when it only shows. Reports fail this floor.

For every module screen (Discover, Plan, Execute, Agentix, Consult Max):

1. **A persistent composer or command surface in context.** The user can talk to the module about
   _this_ object without leaving it: ask, steer, amend. Agentix: the "Message Agentix" composer with
   send / interrupt / resume / stop, and a visible "steers this run vs starts new work" indicator
   (north-star prototype A15 / B04). No model, effort, or type knobs.
2. **Every shown state is actionable.** A gap has _resolve_; a question has _answer_; a proposal has
   _approve / amend_; a run has _steer / stop_; an artifact has _edit / regenerate_; an exception has
   _assign / escalate_. If the system can show it, the user can act on it from the same place.
3. **Live, not snapshot.** Streaming output, progress as Step N of M, a collapsible activity stream
   with sources, decisions, tool operations and verification. Simulated, observed, sandbox-executed
   and production-verified results are visibly distinct states.
4. **Direct manipulation where the object is spatial or orderable.** Reorder steps by drag, edit
   cells inline, resize panes, select rows and act on the selection.
5. **No dead ends.** Every screen has a next action and a way back. A completed flow ends on the
   produced object with what happens next (Peak-End).
6. **Approvals and questions are separate from chat.** Approving an action never silently widens a
   charter, budget, recipient list or authority (authority guardrail from the Agentix north star).

**The static-report test.** Screenshot the screen. If it could be printed to PDF with no loss of
capability, the module is not interactive yet. Run this on every module screen at the phase gate.

**Laws it enforces:** Doherty (acknowledge in place), Zeigarnik (progress visible), Tesler's (the
system carries the complexity, the user steers), Peak-End (the ending is an object, not a toast),
Von Restorff (one primary action per state), Postel's (accept a steer in any phrasing).

---

## 4. Patterns the top of the list shares (adopt these on product surfaces)

| Pattern                                                                                   | Seen in                                    | Maxion use                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------- |
| Persistent bottom composer with attachments and slash/@ commands                          | ChatGPT, Claude, Perplexity, Manus, Cursor | Every module's conversation layer  |
| Streamed response with a stop button and a "thinking / working" state that names the step | Claude, Perplexity, Manus, Devin           | Plan generation, Agentix runs      |
| Inline citations with hover previews; a sources rail                                      | Perplexity, Elicit, Exa                    | Discovery facts, Plan grounding    |
| Plan-as-steps with live per-step status and re-run per step                               | Manus, Devin, Replit, Bolt.new             | Execute, Agentix run canvas        |
| Collapsible activity / tool log, safe summaries, evidence links                           | Devin, Cursor, Manus, Lindy                | Agentix activity stream            |
| Preview pane beside the conversation (artifact, app, document)                            | Lovable, v0, Bolt.new, Claude              | Plan artifacts, Agentix outputs    |
| Approve / deny / amend cards distinct from ordinary messages                              | Devin, Lindy, StackAI, Relevance AI        | Approvals inbox, question cards    |
| Checkpoints, versions, restore                                                            | Lovable, v0, Cursor                        | Plan versions, agent charters      |
| Agent card: charter, triggers, duties, connections with health                            | Lindy, Relevance AI, Adaline, n8n          | Agentix agent and initiative cards |
| Runs list with status, filters and drill-down                                             | Lindy, n8n, Devin                          | Agentix Work views, Execute runs   |
| Dense table with inline edit, saved views, command palette                                | ClickUp, Height, Airtable, folk, Clay      | Portal lists, readiness tables     |
| Usage shown in the product's own unit, never raw tokens                                   | Cursor, Manus, Lovable                     | Units (never USD or tokens)        |
| Empty state that starts the job (templates, examples, one composer)                       | Manus, Lovable, Gamma, Sana                | First-run of every module          |
| Ending on the produced object with next actions                                           | Gamma, Lovable, v0, Runway                 | Peak-End for every flow            |

---

## 5. The full harvest — 113 apps, Mobbin popularity order (2026-09-12)

1. folk — Real relationships. Winning deals.
2. Sana AI — Your AI assistant for work
3. ClickUp — The everything app for work
4. OpenAI Platform — Build leading AI products
5. Clay — Build systems to grow revenue
6. Contra — The commission-free freelance platform
7. Shop — Shopping app & package tracker
8. Perplexity — AI search & chat
9. Height — The autonomous project management tool
10. Jasper — AI built for marketing
11. Firecrawl — The web data API for AI
12. Airtable — Build enterprise-ready AI workflows, apps & agents
13. Amie — AI note taker
14. Claude — AI assistant for life and work
15. Lovable — Build apps & websites with AI
16. Qatalog — Best AI assistant for work
17. ElevenLabs — AI voice generator and voice agents platform
18. Amplitude — Product analytics & event tracking platform
19. Manus — Hands on AI
20. Framer — AI website builder for professional sites
21. Craft — Notes, document, AI
22. Otter AI — AI notetaker, transcription, insights
23. Replit — Build apps and sites with AI
24. Runway — AI video generation
25. Google Gemini — Your AI assistant from Google
26. Copy.ai — The first AI-native GTM platform
27. Reflect — Reflect keeps track of your thoughts, books, and meetings
28. Frame — The future of work is focused
29. Cal.com — Open scheduling infrastructure
30. Strut — The all-in-one AI workspace for writing
31. Supabase — The Postgres development platform
32. Grok — The real-time AI assistant
33. Cursor — The best coding agent
34. Adaline — End-to-end AI agent platform
35. VEED — AI video editor
36. Heidi — The world's best AI medical scribe
37. Luma AI — Create, animate & innovate with AI
38. Mindtrip — Trip planner & local guide
39. Hex — Bring the magic of AI to data, for everyone
40. v0 — Build anything with AI
41. Current — All your team's work in one place
42. Bard — Chat based AI tool from Google
43. Peec AI — AI search analytics for marketing teams
44. Aboard — Data management for normies
45. Profound — AI answer engine optimization
46. Motion — Tasks and AI scheduling
47. Mistral AI — Frontier AI LLMs
48. PlayAI — Real-time voice intelligence
49. Grammarly — Free AI writing assistance
50. Relume — AI website builder
51. Superhuman Mail — AI-native email for high-performing teams
52. Zoom — One platform to connect
53. Grain — The AI notetaker built for growing teams
54. Wayyy — Create surveys to collect insights and feedback from your audience
55. Gemini Notebook — (listed as "Updated")
56. Lemni — Set up custom AI agents in minutes
57. Lindy — Meet your first AI employee
58. Threads — A Slack replacement designed for makers
59. Hume AI — Voice AI with emotional intelligence
60. Suno — Make any song you can imagine
61. FLORA — Your intelligent canvas
62. Microsoft Copilot — Your AI companion
63. Chatbase — AI agents for customer service
64. Navattic — Accelerate the buyer journey with demos
65. PamPam — Custom interactive maps
66. Braintrust — The evals and observability platform
67. Base44 — Turn your ideas into apps
68. StackAI — AI agents for the enterprise
69. Stitch — Design with AI
70. Krea AI — Delightful creative tools with AI inside
71. Obvious — AI agent that collaborates to build anything
72. Elicit — The AI research assistant
73. Databricks — Data and AI solutions for enterprises
74. Bolt.new — Build a web app in minutes
75. Wrangle — The AI sourcing and outbound platform
76. Braintrust — Transforming hiring with AI recruiting
77. Pin — Revolutionize recruitment
78. Rows — The new way to spreadsheet
79. n8n — AI workflow automation tool
80. Cohere — The leading AI platform for enterprise
81. Pi — The first emotionally intelligent AI
82. Arcade — Bring your product story to life in minutes
83. ChatGPT — Your everyday AI assistant
84. Chronicle — AI presentation tool for stories worth telling
85. Google AI Studio — The fastest path from prompt to production
86. Synthesia — AI video platform for business
87. Devin — The AI software engineer
88. Wix — Your website, your business, your future
89. Exa — Search built for AI
90. Mercor — Organize human intelligence to power the AI economy
91. Midjourney — Text to image AI
92. Vapi — Voice AI agents for developers
93. Weavy — AI-powered design workflows
94. WRITER — The enterprise AI platform for agentic work
95. Leonardo AI — Generative AI platform for images, art & video
96. Relevance AI — AI agents that drive business impact
97. Basedash — AI-native business intelligence platform
98. Cofounder — Run an entire company with AI agents
99. Adobe Express — Graphic design, editor & maker
100. Visual Electric — The new creative workflow
101. Langdock — The platform for AI adoption
102. GitLab — The most comprehensive AI-powered DevSecOps platform
103. MagicPath — The shared workspace for humans and agents
104. Magnific — The AI creative platform
105. Sora — Transform text and images into immersive videos
106. Ferndesk — The AI-native help center that updates itself
107. Emergent — Build apps with AI
108. Fireflies — AI teammate for meetings
109. Codecademy — Learn to code
110. Higgsfield — AI-native creative suite
111. Gamma — AI presentation maker & website builder
112. fal — (new listing)
113. Dropbox Dash — (new listing)

Harvest method: Mobbin renders this list as a windowed grid that only mounts the rows near the
scroll position, and it loads pages only on real frames, so the list was walked in 600px steps with
a forced frame per step and cards de-duplicated by app URL in first-seen order. Two entries (112, 113) carry a "New" badge in place of a tagline.

---

## 6. Cited screens and flows per pattern (Mobbin connector, 2026-09-12)

Read the screen before citing it; these were examined, not guessed. Each is the canonical Mobbin
link. Re-run the connector search when a fresher example is needed.

**Agent run view — plan as steps, live status, activity log, details rail**

- [Relevance AI — task timeline](https://mobbin.com/screens/db919f38-24cb-4151-b995-2781392d7db2):
  left task list grouped by day; centre timeline ("1 step performed in the background", tool used,
  agent update, "marked as complete"); right Details rail — created, status, actions used, credits
  used, run time, linked tools. _The Agentix run-canvas anatomy._
- [Lindy — computer-use run](https://mobbin.com/screens/9f4affd5-f387-4149-860e-95c83f9bbba5):
  collapsible "Start computer" step card, checklist of completed steps, "Processing…", composer.
- [Manus — working state](https://mobbin.com/screens/59dd33d5-6390-464e-a5b0-48ceced1b893):
  "Manus is working" collapsible with skill loads and "Thinking"; a floating status pill
  (elapsed time, step 1/1) docked above the composer; stop button in the composer.
- [Emergent — tool rows + pause](https://mobbin.com/screens/17d5580f-8268-4fec-a024-64e87a056e65):
  tool-call rows ("Created /app/…"), "Agent has been paused", composer with Save / Fork, credits
  badge, App Preview pane with Share / Deploy.
- [n8n — canvas + chat + logs](https://mobbin.com/screens/1562fe41-4f0a-48b9-b6da-ed9ebf8b9ec5):
  per-node success/running timings in a logs pane beside a test chat.
- Flow: [Relevance AI — Running an agent](https://mobbin.com/flows/15552b10-8c6a-49ef-a2b4-d92c80bd5b0f)
  (7 screens: empty run page with "Describe task…" composer, "Add a trigger / Run in bulk / Use in
  chat", re-run recent task, sending skeleton, timeline result, "Leave comment for your agent" /
  "Send new message to task"). Flow: [Replit — Editing an output](https://mobbin.com/flows/d3355324-0ea5-45af-aeda-ffe4d42a3692)
  (checkpoints with "Rollback to here", "Paused — agent is waiting for your response", suggested
  next-feature chips). Flow: [WRITER — Chatting with AI](https://mobbin.com/flows/05b3c653-52ee-4323-8170-2cb7e314c0da)
  (session list with a live "Developing…" status link, Computer | Deliverables tabs, "How did the
  agent do? Nailed it / Missed the mark").

**Questions and approvals — separate from chat, one primary choice**

- [Cofounder — "Ask User Question" card](https://mobbin.com/screens/52d55c74-ed5e-4f4f-adbf-40715cb4bb66):
  the run shows "Running tool: Ask User Question → Waited for the user's answer"; the card offers
  options with one marked _Recommended_, "Something else…", Decide all / Decide this one / Submit;
  a "1 agent update — Review" pill at the bottom. _The Agentix "needs input" card._
- [Higgsfield — "Approve create employee"](https://mobbin.com/screens/f0ee7046-b34e-415a-a830-564baf6f902d):
  approval card with the proposed object's full definition, Always allow / Stop / Approve.
- [Descript — "Approve plan"](https://mobbin.com/screens/58151c1c-fa16-45ec-92a3-f778e57c5080):
  plan presented in prose with a single primary "Approve plan" and a "Revert" link.
- [Rox — recommended action](https://mobbin.com/screens/3f692f59-31ca-4254-8d47-1112661613a1):
  insight + "Recommended action" + a Reasoning toggle + "1 source" + one action button.

**Composer-first workspaces — streaming, citations, sources rail**

- [ChatGPT — Activity | 23 Sources](https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e):
  right rail with an activity log and a sources tab; inline citation chips in the answer.
- [Perplexity — composer](https://mobbin.com/screens/c958df0d-640c-487b-a58c-2c96c8a3e93a): Search /
  Computer toggles, "+" menu (upload, connectors, spaces), suggestion chips (Report daily KPIs,
  Monitor AI releases, Schedule a recurring task, Write a PRD, Build a prototype).
- [Google Gemini — sources chooser](https://mobbin.com/screens/39f47b67-e68c-46cc-a952-dabfad7bf43c):
  Deep research toggle, "Choose one or more sources" (Search, Gmail, Drive, Chat).
- [Sana AI — sources under the answer](https://mobbin.com/screens/9098947d-d197-4f05-a54d-de310aa638be);
  [Customer.io — "Thought for 2s · Searched docs · 5 references"](https://mobbin.com/screens/fafcbfb9-fa85-4b4d-b17f-54df962305b5)
  with suggestion pills; [Cohere — reasoning rationale + tool call + citation chips](https://mobbin.com/screens/a51418f9-3eb4-470b-98cf-eebb757aa0c7).

**Preview pane beside the conversation**

- [Mistral Le Chat — canvas](https://mobbin.com/screens/76e16697-0e20-4bfc-8162-e93d6f1fc8ff):
  chat left, document right, "Ask about this" on a selection.
- [Google Gemini — Code | Preview](https://mobbin.com/screens/1784a2a4-743f-44f4-8a40-1b09ad4fcc86);
  [Dropbox Dash — attach sources → draft](https://mobbin.com/screens/f7b146fb-ea9a-4596-a37a-3f72b340ea1e);
  [Langdock — canvas skeleton while generating](https://mobbin.com/screens/579fb137-50fa-42d0-9222-4970f35648d5);
  [Lindy — "Next steps 1/2/3" ending](https://mobbin.com/screens/111149e0-4dff-4de8-b3c1-0f7d032ff105).

**Agent card / configuration — charter, tools, triggers, connections, test, publish**

- [Notion — agent chat + Settings rail](https://mobbin.com/screens/e173b891-b6af-4af8-9a64-532d1fbfec29):
  "Thought" steps on the left; Tools and access (web, pages, Slack), Advanced (model Auto), Trusted
  URLs on the right; Save.
- [Langdock — agent editor + live preview](https://mobbin.com/screens/fe71207d-0397-4ace-ac68-dd3bad98e3d9);
  [Chatbase — Playground: Trained, model, AI actions, instructions, preview](https://mobbin.com/screens/a6b1e44f-94fa-47e3-9101-fd9885c96b2a);
  [ElevenLabs — agent tabs incl. Tools, Tests, Security; Live badge; Publish](https://mobbin.com/screens/91e14363-35ec-4a12-8d4b-4b0d6a9c4ece);
  [PlayAI — Identity → Behavior → Knowledge → Actions → Deploy stepper](https://mobbin.com/screens/fb07bf7f-8d4a-42ea-9d60-15d607265efe);
  [Plain — "on standby" agent with knowledge / workflows / tone rows](https://mobbin.com/screens/284e6b56-3575-4070-b861-4f6ec0a85772).
- Flow: [Relevance AI — Creating an agent](https://mobbin.com/flows/b09653b2-00f8-45b8-9e39-491d7af45a2c)
  (Goal / Tools with "/" to mention / Rules; Refine with AI; Test agent; Publish). Flow:
  [Sana AI — Creating an agent](https://mobbin.com/flows/fc62b881-df54-4a27-8155-a6b18503cbe3)
  (Browse agents cards → Persona / Knowledge / Workflows / Visibility with a preview composer).
  Flow: [n8n — Creating a workflow](https://mobbin.com/flows/2a2c0894-abf7-49ca-a59f-b6d14a6738a2)
  (trigger picker, node config, model picker, run with per-node logs). Flow:
  [Langdock — Creating a workflow](https://mobbin.com/flows/05ce3c9c-e966-49ba-8976-d1b8e30ee976)
  (describe → canvas → Settings with spend limit, notify-at, per-execution limit, max runs/hour).

**Runs lists — status, filters, saved views, drill-down**

- [Relevance AI — Tasks](https://mobbin.com/screens/c9df4ae4-6265-48ac-8e16-95220d542fce): tabs All /
  To review / Escalated / Errored / Completed; Run by; Status; Save view. _Agentix Work view._
- [Copy.ai — table runs with status filter](https://mobbin.com/screens/fdd8be37-4e6c-4049-ad43-6e6448a380b0);
  [Twenty — workflow runs](https://mobbin.com/screens/6d881ec8-f065-40e0-a833-1699690f085a);
  [Databricks — job runs: chart + table + top error codes](https://mobbin.com/screens/06b7cd16-d98c-423c-970d-ead120b13b54);
  [LangChain — runs with latency, tokens, cost](https://mobbin.com/screens/8e8dd404-868c-4de4-b990-86b1a8210f26)
  (Maxion shows units, never tokens or USD).

**Request → result playground, options disclosure, usage overview (developer-console group — secondary reference)**

- [Firecrawl — Playground result](https://mobbin.com/screens/b14c32ee-8967-4d6a-95df-c90e1da3b5d1):
  one input → Start scraping → a result header (endpoint, status Success), Markdown | JSON Response
  tabs, download JSON / Markdown, "Copy as Markdown", Report issue, Get code. _The tight
  request→result loop and representation tabs are the reusable decision — for Plan artifact viewers
  and Execute / Agentix output panes._
- Flow: [Firecrawl — Scraping a URL](https://mobbin.com/flows/7638ac86-8005-47ff-9556-4035cbee25f0)
  (14 screens): centered composer with a Format dropdown, an Options popover (exclude / include
  tags, wait, timeout, max age, Reset settings) that keeps defaults sensible and advanced choices
  hidden (Hick's, Tesler's), a Format checklist with sub-choices (Cleaned | Raw, Viewport | Full page),
  inline "Invalid input" under the composer (Postel's), result view.
- Flow: [Firecrawl — Home](https://mobbin.com/flows/64274c27-54d2-45dc-8f98-78fbc3ed638f) (6 screens):
  Overview with endpoint cards, a 7-day usage chart, API key with reveal / copy, an MCP integration
  snippet, a LIVE concurrent-browsers meter, an integrations grid, example projects. _Borrow for the
  Integrations / Connections and usage-in-units screens._ Flow:
  [Firecrawl — Onboarding](https://mobbin.com/flows/3df34fec-dc57-43e2-804d-199b3b379927) (19 screens,
  "Step 2 of 4" stepper over a blurred dashboard).
- Related: [Exa — API playground with Code | Output pane](https://mobbin.com/screens/a6d5cd9a-8b6c-4bed-8284-9fddce909a53);
  [Chatbase — website data source with crawl links + retrain](https://mobbin.com/screens/752d429e-f1dc-4f35-a88e-108f31f16c0e);
  [Mistral — crawled URLs table with Fetched / Skipped / Failed states and reasons](https://mobbin.com/screens/003684d5-a229-4cff-a2a4-25dcbe87ad32).
- **Not a primary reference for any Maxion module:** Firecrawl is a developer API console. It has no
  conversation layer, no plan-as-steps, no activity stream, no approvals, and no multi-object work
  management — none of the interactivity-floor items a module needs. Use it for the four decisions
  above, nothing more.

**Empty states that start the job**

- [Cursor — "Ask Cursor to build, fix bugs, explore" + chips](https://mobbin.com/screens/b0eb16b6-7038-4d01-a59b-3a1e8a602dd4);
  [Microsoft Copilot — greeting + composer + chips](https://mobbin.com/screens/79f6aa12-4967-46a0-b6fa-43462f8c8294);
  [v0 — "What do you want to create?"](https://mobbin.com/screens/f14348f9-fcff-40bc-ab20-be39fa45ad95);
  [MagicPath — start cards](https://mobbin.com/screens/e7d8ce7d-d3bb-4c0b-b26e-00af76a3fc0d);
  [Langdock — "Describe your workflow" + templates + "No workflows yet"](https://mobbin.com/screens/da0d5367-4be8-41ae-a059-0d856a551066).

---

## 7. Devin — the primary reference for the Agentix run canvas (owner decision, 2026-09-12)

Examined through the Mobbin connector: ten screens and five flows. Devin is the closest shipped
product to what Agentix must feel like — an autonomous worker you brief, watch, steer, and review,
with the evidence beside the conversation. Work against this anatomy; the Agentix north-star
prototype screens it maps to are in brackets (A-series = primary flow, from the Figma north star).

### 7.1 The anatomy, screen by screen

**Shell and Work view** — [Sessions sidebar](https://mobbin.com/screens/92e0222c-8ba8-4abe-bc18-3ddef5b2e357).
Left nav: Sessions · Ask · Automations · Review · Wiki. The sidebar _is_ the runs list: every recent
session carries a one-line status under its name — "Working", "PR is ready · ⑂1", "Waiting for CI",
"Waiting for user response" — plus a blue dot for unread updates, and Pinned / TODO LIST folders
you drag sessions into. _[A11 Work views: status is a sentence, not a colour.]_

**New session** — [composer](https://mobbin.com/screens/86270f56-0ed5-4c18-958e-40bae621d178).
One centred composer ("Ask Devin to build features, fix bugs, or work on your code"), attachments,
and _context chips beneath it_ (repository, machine, plan). A "Get started with Devin — 4 of 6"
checklist with a progress bar and an earned reward sits below (Zeigarnik). Flow:
[Starting a session](https://mobbin.com/flows/b122b4f4-967e-4569-a4f7-7a126bf1535a) (onboarding
suggests five real sessions on the connected repo — "Kick off these 5 sessions / Skip").
_[A01: primary composer + context chips + first-run checklist.]_

**Brief improvement** — flow [Improving a prompt with AI](https://mobbin.com/flows/9e0d3247-8d07-40f3-b205-e4371200dba4);
screen [improved prompt](https://mobbin.com/screens/5c3e3312-4a67-496e-a986-5585b28cf5fd).
An "Improvement Opportunities Detected" banner explains what the brief lacks, rewrites it into
Requirements / Submission sections, and offers "Undo improvement". _The system carries the
complexity of a good brief and the user keeps control — Tesler's + Postel's in one component.
[A02/A03 intake: Agentix asks only what the evidence cannot answer; this is the pattern.]_

**Run canvas while working** — [working session](https://mobbin.com/screens/b427b367-6210-4200-972d-ead195327f97).
Left: the conversation is the timeline — user brief with attachment and repo chip, then a
collapsible action log in plain words ("Thought for 8s", "Clicked at (511, 387)", "Typed text",
shell commands with their output), a "Worked for 2m 13s" group with sub-steps ("7/7 Test the app
end-to-end"), and a one-line presence state ("Cooking", "Testing dashboard flow", "Devin went to
sleep", "Devin is awaiting instructions"). Bottom: the composer changes its prompt to **"Guide Devin
while it works"** and shows a stop button while the run is live. Right: evidence tabs — **Worklog ·
Changes · PR #5 · Desktop (● Live, with a scrubber) · test-report.md** — and a "+" menu naming the
other views (Shell, IDE, Agents = child sessions). _[A07 run canvas + A15 conversation & human
commands: the composer steers the live run; evidence lives in tabs beside it, never in the chat.]_

**Run result** — [PR-ready session](https://mobbin.com/screens/221b829d-3c18-44ae-b6bd-cb85c6569258)
and [test video](https://mobbin.com/screens/9ecbe8d4-8d1c-49dd-aae2-92f4e32f2744). The ending is
the produced object: a "PR ready" card, a coverage table, an artifact card ("test-report.md 2.3 KB"),
a recorded end-to-end test with "8 passed · All passed", and a thumbs-up/down + copy row. Flow:
[Creating features with AI](https://mobbin.com/flows/1c40fdf3-a43d-4710-b636-77651c48f7f8).
_[A08 outcome / Peak-End: end on the object and its evidence, with next actions.]_

**Session actions and metadata** — [session menu](https://mobbin.com/screens/b46a92a3-e1c2-4a26-bc04-6ca9785cc925).
One overflow menu: Archive, Pin, folders, Edit tags, Copy session ID, Rename, Hide from / Make
visible to team, Schedule Devin, Create playbook from session, Analyze session, Reboot, Terminate,
Focus mode, Knowledge suggestions, Session usage limits, Give feedback, View session insights — and a
metadata block (usage, user messages, session size, category). _[A11 tasks & versions: "Create
playbook from session" is the charter-from-run move; "Session usage limits" is the per-run budget.]_

**Post-run analysis** — [Session insights](https://mobbin.com/screens/a06da25d-f8cd-4fb3-8316-c581413a9106),
flow [Analyzing a session with AI](https://mobbin.com/flows/63639ea0-8326-4804-bd89-a74c295340af).
"Generate analysis | Investigate with Devin"; detected issues with a severity chip (Environment
issue _high_, Communication issue _medium_, Workflow issue _low_), each explained with what the user
could have provided up front; tabs Issue timeline / Actionable feedback / Knowledge usage; a
"What went well / No significant issues / Recommendation" assessment. _[New for Agentix: an
"Analyze this run" surface after every initiative cycle, feeding the charter.]_

**Review** — [Devin Review, PR #5](https://mobbin.com/screens/a9ce085f-6895-4df1-a892-25fc8dcc586b).
Description / Discussion / Commits tabs, a file tree with +/− counts, and a right rail with
"Run Devin's AI analysis", Checks, "Enable auto-fix", Reviewers, Assignees, Labels. _[A13 approvals
inbox: the reviewed object, its checks, and the decision live on one screen.]_

**Ask** — flow [Ask](https://mobbin.com/flows/74960b45-7785-49af-9807-8411e5a8a129): a second,
lighter composer ("What questions do you have?") scoped by repo and branch — questions never
become runs by accident. _[Consult Max vs Agentix: the same separation.]_

**Automations** — shown on the [onboarding screen](https://mobbin.com/flows/b122b4f4-967e-4569-a4f7-7a126bf1535a):
scheduled chores as a list with a live state each ("Run security scan — waiting for user
response", "Triage Datadog incident — waiting for CI", "Review last 5 PRs — idle") and a scheduled
task card ("Verify commits from the last 24 hours… Scheduled 10am every day"). Neighbours for the
same job: [Manus — Scheduled tasks](https://mobbin.com/screens/abb206db-33ee-4f1a-ad2e-1e55b4312151)
(Scheduled | Completed, toggle, Run now / Edit / Delete) and
[Grok — Tasks](https://mobbin.com/screens/1aa157e8-107c-4375-a59a-256a4469fd63) (cards with cadence,
a Test button, "No records yet"). _[A12 schedules / duties.]_

### 7.2 Decisions to take from Devin

1. Status is a sentence, everywhere: sidebar rows, the presence line, the composer prompt. Never a
   bare colour dot without words.
2. The conversation is the timeline; evidence is in tabs beside it. Actions are logged in plain
   words with durations, collapsible, never a raw log wall.
3. The composer is context-aware: it says what sending will do ("Guide Devin while it works")
   and carries a stop control while the run is live.
4. Endings are objects with evidence (artifact card, recorded test, PR card) plus a feedback row.
5. One overflow menu holds the lifecycle (pin, schedule, playbook-from-run, analyze, limits,
   terminate); the canvas stays clean.
6. Post-run analysis with severity-tagged, actionable findings, and a path to turn a run into a
   reusable playbook.
7. Intake improves the brief and lets the user undo it.
8. Questions ("Ask") and work ("Sessions") are different composers.

### 7.3 Decisions to reject for Agentix — and what to reference instead

| Rejected Devin decision                                                                                           | Why                                                                                                 | Reference instead (examined)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode selector** (Agent / Fast / Default / Auto) and "Advanced capabilities" in the composer                     | Agentix shows no model, effort, or type controls; capability lives in the charter, not the composer | [Manus — composer](https://mobbin.com/screens/59dd33d5-6390-464e-a5b0-48ceced1b893) (attach, mic, send, stop — nothing else); [Sana AI — "What would you like to do?" with Create / Sources only](https://mobbin.com/flows/fc62b881-df54-4a27-8155-a6b18503cbe3); Notion keeps the model under Advanced = Auto, off the composer ([agent settings rail](https://mobbin.com/screens/e173b891-b6af-4af8-9a64-532d1fbfec29)). Capability toggles that _are_ user decisions (e.g. Gemini's Deep research and sources chooser, [screen](https://mobbin.com/screens/39f47b67-e68c-46cc-a952-dabfad7bf43c)) belong to the initiative's authority, set once at design time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Dollar usage** ("On-demand usage $8.02") in the session menu                                                    | Maxion shows units, never USD or tokens                                                             | [Relevance AI — details rail: Actions used · Credits used · Run time](https://mobbin.com/screens/db919f38-24cb-4151-b995-2781392d7db2) — per-run, unit-based, beside the timeline; limits as _units per run / per hour_ on the Langdock settings pattern ([Creating a workflow](https://mobbin.com/flows/05ce3c9c-e966-49ba-8976-d1b8e30ee976), last screen: spend limit, notify-at, per-execution limit, max executions per hour).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Machine semantics** — Reboot / Terminate session, IDE and Shell tabs, a per-session VM, "Desktop" as a computer | Agentix provisions no container per agent; the user steers work, not a machine                      | Evidence tabs become **sources · decisions · tool operations · verification · artifacts · connected-system records**: [ChatGPT — Activity \| Sources rail](https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e); [n8n — per-node logs with status and timings](https://mobbin.com/screens/1562fe41-4f0a-48b9-b6da-ed9ebf8b9ec5); [Cohere — rationale + tool call + citations](https://mobbin.com/screens/a51418f9-3eb4-470b-98cf-eebb757aa0c7). A live connected-system operation is a _collapsed step card_, not a VM tab: [Lindy — "Start computer" card](https://mobbin.com/screens/9f4affd5-f387-4149-860e-95c83f9bbba5); the artifact/evidence split without machine semantics is WRITER's Computer \| Deliverables tabs ([Chatting with AI](https://mobbin.com/flows/05b3c653-52ee-4323-8170-2cb7e314c0da)). Lifecycle verbs become _pause, resume, stop, hand off_.                                                                                                                                                                                                                                                                        |
| **Developer-only objects** — PR, CI, branch, repo chips, Devin Review's diff                                      | Agentix's objects are proposed change, verification, connected system, human step                   | Proposed change as a full object definition with one primary decision: [Higgsfield — "Approve create employee"](https://mobbin.com/screens/f0ee7046-b34e-415a-a830-564baf6f902d), [Descript — "Approve plan" / Revert](https://mobbin.com/screens/58151c1c-fa16-45ec-92a3-f778e57c5080). Publish-style approvals without code: [StackAI — Pull Requests: "wants to publish… Pending / Approved / Rejected"](https://mobbin.com/screens/14ef38ed-3f04-4883-bac6-dbd277998f3c). Readiness rail: Graphite's "Ready to merge — all requirements met" becomes _Ready to activate — all checks and approvals met_ ([screen](https://mobbin.com/screens/43724524-d851-43d4-8272-721c43f8f032)). Verification records with reasons: [Mistral — Fetched / Skipped / Failed table with reasons](https://mobbin.com/screens/003684d5-a229-4cff-a2a4-25dcbe87ad32). Work view tabs: [Relevance AI — Tasks: All / To review / Escalated / Errored / Completed](https://mobbin.com/screens/c9df4ae4-6265-48ac-8e16-95220d542fce). Context chips beneath the composer stay, but name the _Discovery package, process scope and connected systems_, not a repo and a machine. |

### 7.4 Laws-check rows Devin satisfies (cite in the Agentix requirements)

Jakob's (the run-canvas anatomy users of Devin, Manus and Cursor already know) · Zeigarnik
(progress groups, first-run checklist) · Doherty (presence line and stop button acknowledge
instantly) · Peak-End (object-first ending with evidence) · Tesler's (brief improvement, playbook
from session) · Von Restorff (one primary control per state) · Hick's (one composer, context chips
instead of a settings form) · Serial Position (status first in every row, decision last in the
review rail) · Interactivity floor (every state on the canvas is steerable in place; the
static-report test fails only on the marketing screen).

---

## 8. Gap-closure pass — every module and every remaining Agentix state (2026-09-12)

A second reasoning pass listed every surface the Agentix north-star prompt, this week's Agentix
roadmap, and the other modules require, then checked each against the citations above. Everything
below was a gap; each is now grounded in an examined screen. The four items at the end are still
open on Mobbin and say so.

### 8.1 Discover

- **Transcript + summary + action items as one object.** [Fireflies](https://mobbin.com/screens/3cd6c20c-a39e-4c44-be58-579510daf3b4)
  (speaker-labelled transcript with timestamps beside a summary and notes; playback linked to
  text); [Grain](https://mobbin.com/screens/6bfcb4d4-ecae-4210-a8b2-42a2305c0a73) (Summary /
  Chapters / Transcript tabs, outcomes with timestamps, action items with an assignee, per-speaker
  talk-share bar); [Otter](https://mobbin.com/screens/e45230b1-1c9e-4075-b43a-255e6c21216f)
  (overview, action-item checkboxes, outline, a template picker that includes "Sales — Discovery"
  and "Candidate Interview", and an "Ask AI about this conversation" rail with suggested questions).
  _Discovery session and stakeholder-interview capture._
- **Honest empty summaries.** [Zoom](https://mobbin.com/screens/22f5c268-8140-4acb-a648-3342d5a0747c):
  "Next steps were not generated due to insufficient transcript." _Say why, never fake a summary._
- **Structured interview, one question at a time.** [Emergent — "Agent has questions for you",
  Question 1 of 4, Auto-answer / Next](https://mobbin.com/screens/99a1a63e-01dc-4310-b836-f110b0fc30a3);
  [Perplexity — numbered options, 1/3, Continue ⌘Enter, "Awaiting response"](https://mobbin.com/screens/501351fa-f2ca-490a-93db-3bbda5d591a1);
  [Obvious — 1/3 with Skip all / Back / Next question](https://mobbin.com/screens/b7cff3e2-fe78-4a9e-9f9f-0dd03e665560).
  _Owner Q&A and readiness questions: numbered, skippable, progress shown (Zeigarnik, Hick's)._
- **Voice interview.** [Codecademy — recruiter phone-screen mock: transcript bubbles + mic composer](https://mobbin.com/screens/ee0a9184-c9e2-4a05-b12c-2f83c44de099).
  _Discovery Voice's on-screen shape._
- **Facts with sources.** [Elicit — pipeline status (Gather 50 → Screen 10 → Extract 50 data points
  → Generate report) beside a table whose every cell carries a source marker, and a chat about the
  report](https://mobbin.com/screens/b47e8e34-0f94-4b9d-85b6-ffd42e1fa30c);
  [Gemini Notebook — sources rail with checkboxes, inline numbered citations, "8 sources" in the
  composer](https://mobbin.com/screens/860b3000-a0b9-4b09-b8ed-f8d0e4a0be9f);
  [Rox — insight with a Reasoning toggle and "1 source"](https://mobbin.com/screens/56ad311c-73ee-47d5-9c5a-7e1719bda12c).
  _The Discovery fact ledger and Plan grounding rows._

### 8.2 Plan

- **Generated document with an outline and section-level actions.**
  [Obvious — artifact with a selection toolbar (Rephrase, Shorten, Elaborate, More formal,
  Bulletize, Summarize), an "All Artifacts" tab and a table of contents](https://mobbin.com/screens/1f36e597-7677-4b85-a4bb-9a3825820cec);
  [Langdock — chat left ("Updated canvas — I've updated the title…") and the sectioned document
  right](https://mobbin.com/screens/2e08531d-644d-4ea8-8537-a21d04dd19a6);
  [Craft — outline rail, cards and toggles inside the document, an Assistant](https://mobbin.com/screens/f19df619-ca6e-4757-8866-fabe606c16a3);
  [Frame — select text → Content / Generate / Actions recommendations](https://mobbin.com/screens/ec034e5e-bf19-4521-ae9b-8f53733c20d7);
  [ClickUp Brain — "Ask Brain to edit or write" → Insert below](https://mobbin.com/screens/cbfe9a71-f5e4-48c4-b9d9-d195b8a41922).
  _Plan artifacts: regenerate and edit per section, in place._
- **"AI changed this" marker + regenerate.** [Upwork — "Milestones updated! A blue dot indicates
  terms updated by AI" with a Regenerate milestones button](https://mobbin.com/screens/26de30d4-c951-4024-a0a0-45016db1c23b).
  _Mark every field the model changed; offer regenerate next to it._
- **Plan approval.** [Descript — plan in prose with one "Approve plan" and a Revert link](https://mobbin.com/screens/58151c1c-fa16-45ec-92a3-f778e57c5080)
  (already in §6). _Section approvals in Plan follow this: one primary, one way back._
- **Decomposition board with ownership labels.** [Cofounder — stages as columns (Idea → Initial →
  Identity → Build) with cards labelled "Needs your input", "Agent can do this", "Needs approval",
  "Available"](https://mobbin.com/screens/f0cd27fc-87c3-49e8-95d7-b9dc0661c0a5). _Plan's backbone and
  the Agentix readiness table share this shape: who does each step, and what it is waiting on._

### 8.3 Execute

- **Run with gates and rollback.** [Vercel — production deployment with Instant Rollback, a
  "rolled back" banner with Undo Rollback, a 4-of-6 production checklist, observability
  tiles](https://mobbin.com/screens/d8e63884-5d43-4337-bf31-5667bc4ba5db). _Every irreversible-looking
  action has a named undo, and the reason for the rollback is recorded._
- **Runs overview.** [Attio — Runs tab: credits consumed, in progress, average runtime, completed,
  failed; run history list; canvas nodes badged Completed / Triggered](https://mobbin.com/screens/ac501533-24e3-49b1-a564-cf0ec2a1b145).
  _Execute's run dashboard in units._
- **Stage timeline with expectations.** [Hers — vertical stages, average duration per stage,
  "what happens next" copy under the current stage](https://mobbin.com/screens/86231ec9-1c2b-4255-bfe0-8f30a3c32e4d).
  _Parkinson's: state the expected duration at every waiting stage._
- Gates, questions and pauses: Emergent's question card, Replit's "Paused — waiting for your
  response" and Cofounder's decide-all card (§6) apply unchanged.

### 8.4 Consult Max

Composer-first assistant patterns in §6 (ChatGPT Activity | Sources, Perplexity composer, Gemini
sources chooser, Customer.io suggestion pills) — nothing new needed; the separation from work is
Devin's Ask vs Sessions (§7).

### 8.5 Agentix — the remaining states

- **Discovery handoff preview ("Send to Agentix").** A review step that lists what will be used and
  what will not, before anything is created: [Clay — Upload → Review → Import with validation
  checks](https://mobbin.com/screens/2f118fde-6fe3-4327-a6b5-98f495f50fbb);
  [Wix — "8 of 9 columns will be imported" with a mapping table](https://mobbin.com/screens/5992adf2-472e-4dc4-a36d-d4573b19716e);
  [Salesforce — "Review before importing" with explicit warnings and Go back / Continue](https://mobbin.com/screens/73812d44-61bc-4f24-a734-08d49137800c);
  [Rox — mappings with an "Invalid columns (0)" tab](https://mobbin.com/screens/071d4cdc-22dc-4a1d-851d-c818b51d54e3);
  [Midday — "We've mapped each column… please review"](https://mobbin.com/screens/4691bf94-e83d-4280-9406-3471248b8a4c).
  _Package version, processes used, inherited limitations, and "you can / cannot create an
  initiative" all belong on this one screen._
- **Operational-readiness checklist with blockers.** [Discord — onboarding review: each item GOOD or
  REQUIRED with Edit, and "Enable onboarding" gated on it](https://mobbin.com/screens/fcee967b-730f-411a-beba-42fc9d6ac753)
  — _the closest thing to "Ready to activate"_; [Stripe — Set up Connect: required vs optional
  steps, each with its own action, test-mode toggle in the header](https://mobbin.com/screens/032c6d85-93ec-4828-9fe4-8a86a631d654);
  [Klaviyo — steps with "About 3 minutes" and Skip for now](https://mobbin.com/screens/de46e885-efb7-4cd3-a574-b16c3dd5e1e6);
  [Oyster — numbered steps with status pills and one action each](https://mobbin.com/screens/b36e49cb-4dce-41aa-a161-696caedaef44).
- **Connections with principal, scopes and health.** [Relevance AI — Integrations & API Keys:
  connected account shown as the email, its scopes listed in plain words, a Triggers tab, "1
  connected"](https://mobbin.com/screens/68a8c248-6cb2-4e0e-b16a-19f0408106fd) — _the reference_;
  [Linear — connected accounts with a dependency message ("First, your workspace needs to be
  connected to GitHub")](https://mobbin.com/screens/3b7417c7-551f-4935-890f-4788e4d8d334);
  [MagicPath — "Connected as alexsmith@…" + Disconnect](https://mobbin.com/screens/d1209570-1bd3-49db-9c89-23bd6aa03f47).
- **Degraded and failed states.** [Zapier — failed step: the error in one line, "Help me fix it",
  an AI Troubleshoot tab, Retest step / Skip test](https://mobbin.com/screens/0551ccd5-c726-4e4d-b61f-05aceac62501)
  — _the shape for a failed tool operation_; [Mintlify — "Update failed" with the log showing
  every passed step and the one that failed, Redeploy](https://mobbin.com/screens/e9cf869a-e731-47fc-81e2-f21a66c25d7f);
  [Sentry — issue with Root Cause and Solution panels, Resolve / Archive](https://mobbin.com/screens/fcc6e08a-e647-449c-9a11-6ceef8332a89);
  [GitHub Actions — failed run with annotations and Re-run jobs](https://mobbin.com/screens/0690bb8b-3bbb-45be-9dfa-8cef91e2956f).
  _Each of the seven degraded states (provider down, permission revoked, budget exhausted,
  connection expired, human step overdue, verification failed, retry ceiling) gets: what happened,
  what it affected, one recovery action, one way to hand off._
- **Charter versions, publish and restore.** [ElevenLabs — Review Changes: published version vs
  current changes side by side, a version description, Publish](https://mobbin.com/screens/ff16450b-9de9-4c60-8738-770be8df0a5c)
  and [Mistral — Review your changes: v0 → v1, Instructions | Configuration tabs, "Describe this
  version", Save Agent Changes](https://mobbin.com/screens/782f5257-54b5-44df-aac7-4ffd42aa1d3c)
  — _the charter-publish gate_; [Adaline — History: config snapshots, Changes view, Restore](https://mobbin.com/screens/c29b13e3-a173-405b-98e0-63d54c4c86bd);
  [Google AI Studio — App versions with Restore](https://mobbin.com/screens/8470255e-7788-4b6e-a13c-3286d5df8dcd);
  [Notion — version history by time and author](https://mobbin.com/screens/780626a3-20f5-4795-ac3b-bdbaef325210).
- **Required human step with assignee and deadline.** [Asana — task with Approve / Changes requested /
  Reject, assignee, due date, dependencies](https://mobbin.com/screens/e94342b0-adf8-4b9e-85ce-c01c0909cf9a)
  — _the reference_; [incident.io — Assign dialog, "Due in 23h" chip on the follow-up](https://mobbin.com/screens/2702a94a-4779-4031-ac0d-4c1612a78dd4);
  [Workable — workflow task with a deadline relative to a date and instructions](https://mobbin.com/screens/19532263-2f36-4574-b908-fd6e80dbfe97);
  [Contractbook — "Assigned to me" with type Approval and due date](https://mobbin.com/screens/01f9bf2b-e1e5-4c0f-95be-14fbbb838194).
  _A human step is part of the process, not an agent failure._
- **Before / proposed record changes.** [Oyster — change summary with the old value struck through
  and an Undo per change](https://mobbin.com/screens/2c914344-72fd-4493-b80b-e16f922238fe) — _the
  business-record shape_; side-by-side structured diffs from the ElevenLabs and Mistral screens
  above; [Neon — side-by-side diff with "Proceed to restore"](https://mobbin.com/screens/9cb22cfd-3f04-4161-94b9-729266bc97b0).
  _Finance reconciliation (B06/B07): exact records, before and proposed, principal, expiry._
- **Outbound message preview to an allowed destination.** [Rox — Draft Email card that opens a
  To / Subject / body panel, "please review it and let me know"](https://mobbin.com/screens/3d205a5d-5ead-4787-af2c-9b0a36ed2fc7)
  — _the reference_; [ClickUp Brain — draft with "review or edit before I send it?" and follow-ups
  Send as is / Edit / Add a deadline](https://mobbin.com/screens/0ca0b550-c8f4-47eb-8d52-059738f8db48);
  [Asana — AI-drafted status update with recipients and Edit](https://mobbin.com/screens/d990abb6-ed7b-4a2e-a6d2-d2b619269080).
  _Destination and recipients are shown and locked to the allowlist; approving the message never
  widens recipients._
- **Simulated / sandbox / production results as distinct states.** [Gorgias — test mode: "Actions
  disabled — no changes will be made to live data"](https://mobbin.com/screens/b039e1c5-ba04-40a8-8dd2-70df35bc959e)
  — _the "simulated" label_; [Stripe — sandbox banner across the top with "Exit sandbox"](https://mobbin.com/screens/925177de-949b-48e6-97a6-c0cef39a0959);
  [Render — Production and Staging as separate sections](https://mobbin.com/screens/3e106d4a-c875-45d5-be51-387a519355f8).
- **Command palette.** [Superhuman](https://mobbin.com/screens/85dc5994-9360-428d-9092-7425e070ed7f),
  [Vapi](https://mobbin.com/screens/593d7acd-2e16-4365-bcd6-02ce52f48f3b),
  [v0](https://mobbin.com/screens/5f353fc3-d9ce-4d1c-be9b-cc1b4ad07578). _Jakob's for the portal shell._

### 8.6 Still open on Mobbin (design from the laws, then re-search)

- A **source-conflict flag** (two sources disagree on a fact) — no examined screen shows one.
  Design: both sources side by side with dates, the chosen one marked, the other kept (Postel's,
  Trustworthy axis).
- A **connection-expired banner** with reconnect — Linear's dependency message is the nearest.
- **Role-based control visibility** (owner vs collaborator vs viewer on the same run) — not visible
  in screenshots; follow the Agentix north-star rule (viewer sees only allowed controls).
- **Mobile run canvas** — the harvest was web only; the iOS library needs a separate pass.
