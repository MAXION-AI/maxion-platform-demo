# UX Laws Policy — mandatory frame for every UI/UX requirement

**Standing rule (set by the owner, 2026-09-11):** any time UI/UX requirements are asked for, produced,
or judged in this repository — a plan's "UI/UX considerations" section, a spec, a phase doc, a
component, a page, a flow, a design critique, an audit finding, a PR that touches a user-facing
surface — the work is checked against **every law below**. A requirement that cannot be tied to a law
is either decoration or unfinished. A finding that does not name the law it violates is a vibe, not a
finding. This binds every agent and every human working in the tree, whichever tool they use.

The laws are grouped by what they govern. Each has: the law · the one-line rule the owner uses ·
what it means in practice · the load-bearing numbers · the tells · how to check. `CLAUDE.md`
→ "UI/UX Standards" carries the pointer; this file is the depth. Section 0 states the **precedence**
when a law collides with a security, accessibility, craft, or aesthetic rule, the **surface class**
(product vs marketing) that sets how much latitude each surface gets, the **Mobbin AI north star**
that defines "familiar" for product surfaces, and the **interactivity floor** every module must meet
— read it first. The Claude Code `premium-ux` skill mirrors this file at
`~/.claude/skills/premium-ux/references/ux-laws.md`; this repository copy is the source of truth.

---

## Contents

0. [Precedence and surface classes — read first](#0-precedence-and-surface-classes)
1. [Decision & choice — Hick's Law, Miller's Law, Occam's Razor, Pareto Principle](#1-decision--choice)
2. [Reach & targets — Fitts's Law, minimize target distance](#2-reach--targets)
3. [Familiarity — Jakob's Law](#3-familiarity)
4. [Perception & grouping (Gestalt) — Proximity, Similarity, Uniform Connectedness, Prägnanz](#4-perception--grouping-gestalt)
5. [Attention & memory — Von Restorff, Serial Position, Zeigarnik](#5-attention--memory)
6. [Time & feel — Doherty Threshold, Peak-End Rule, Parkinson's Law](#6-time--feel)
7. [Complexity & tolerance — Tesler's Law, Postel's Law](#7-complexity--tolerance)
8. [The laws-check — how to run it on any requirement](#8-the-laws-check)
9. [Owner's imperative list → law map](#9-owners-imperative-list--law-map)

---

## 0. Precedence and surface classes

The laws sit inside a stack of other rules (security, accessibility, craft numbers, aesthetic
direction). This section says which wins when they collide and which surfaces get which latitude.
Every requirement and every critique names the **surface class** before applying a law.

### Surface classes

- **Product surface** — anything a user operates to get work done: app screens, dashboards,
  consoles, tables, forms, settings, multi-step flows, chat and agent workspaces. **Jakob's Law binds
  fully.** Interaction patterns, placements, and controls are conventional. Distinctiveness comes
  from the design system (type, colour, spacing, motion quality, copy), never from unfamiliar
  layouts or gestures. Atmosphere (aurora, beams, grain, spotlight) is off by default. Motion budget:
  state-change feedback plus one designed beat at the peak moment (Peak-End). Entrance choreography
  stays under ~300ms total and never gates reading or input.
- **Marketing surface** — landing pages, hero sections, campaign pages, brand moments, pitch and
  demo pages. Award-grade composition, atmosphere, and orchestrated reveals are allowed. The laws
  still bind: one CTA per section (Hick's, Von Restorff); headline readable and CTA usable from first
  paint even while a reveal runs (Doherty); targets ≥ 44px (Fitts's); nav, forms, and CTAs follow
  convention (Jakob's); structure legible at thumbnail size (Prägnanz).
- **Mixed pages** switch class at the boundary: the hero of a product landing page is marketing;
  the sign-up form beneath it is product.

### Precedence when rules collide (highest wins)

1. **Security, privacy, and confirmation rules** in the repository's `CLAUDE.md`. Input validation
   and authorisation are never relaxed by Postel's Law; destructive, bulk, irreversible, or
   privilege-changing operations always confirm and audit, whatever Tesler's Law or "undo over
   confirm" would prefer.
2. **Accessibility** — WCAG 2.1 AA, keyboard operability, `prefers-reduced-motion`, colour never the
   only carrier of meaning.
3. **The UX laws in this file** — structure: what is on screen, where, how many, how fast, and who
   carries the complexity.
4. **Craft numbers** (the `premium-ux` skill's `craft-laws.md`) — type scale, spacing grid, colour tokens, elevation, motion
   curves and durations.
5. **Aesthetic direction** (`frontier-design`) — Refero grounding, Godly composition, anime.js
   moments.

A lower tier never overrides a higher one; it only chooses _how_ to satisfy it. A Godly-worthy layout
that breaks Hick's or Fitts's is not shippable. A law applied so literally that it fails AA is applied
wrongly.

### Two clarifications that prevent most arguments

- **Familiar is not slop.** The slop tell is the _untouched default_ (default shadcn, default blue,
  no hierarchy, missing states), not the _convention_. A centered sign-in form, a left nav, a
  top-right account menu, and a three-column pricing table are Jakob's Law done right when executed
  with a crafted system. "Predictable" is not a finding unless a law names the defect.
- **Consistency scope.** "Never the same look twice" applies across _products and brands_. Inside
  one product every surface shares one system (Similarity, Uniform Connectedness, the Coherent
  axis). Varying looks between screens of the same product is a defect, not distinctiveness.

### The north star and the interactivity floor (owner rule, 2026-09-11)

- **"Familiar" has a definition.** For AI-product surfaces, the patterns users already know are the
  ones in the **Mobbin AI web-apps library, sorted by popularity** — harvested and grouped by job in
  `docs/operations/mobbin-ai-north-star.md`. Jakob's Law on a product surface means: adopt what the top of that list
  does for the same job; spend novelty only on the system.
- **Every module is interactive — especially Agentix.** A module surface the user can only read is a
  report and fails the floor. On every module screen: a persistent composer or command surface in
  context; every shown state actionable in place (gap → resolve, question → answer, proposal →
  approve / amend, run → steer / stop, artifact → edit / regenerate); live state (streaming, Step N
  of M, an activity stream) instead of snapshots; direct manipulation where the object is spatial or
  orderable; no dead ends. Approvals and questions stay separate from chat, and approving never
  silently widens authority. **Static-report test:** if a screenshot could be printed to PDF with no
  loss of capability, the module is not interactive yet. Full definition in
  `docs/operations/mobbin-ai-north-star.md` §3; it is a row in every laws-check for a module surface.

---

## 1. Decision & choice

### Hick's Law — _reduce choices per screen_

**Law.** Decision time grows logarithmically with the number and complexity of choices.
**Rule.** Reduce choices per screen. One decision per step where the stakes are high.
**In practice.**

- Break a long form or setup into steps; each step asks one question well.
- Progressive disclosure: advanced options behind "More", not inline.
- Recommend a default. A pre-selected sensible option turns a choice into a confirmation.
- Menus and command palettes: search over scroll once a list passes ~7 items.
- Never present two primary actions. If both matter, sequence them.
- A gate (approve / deny, keep / discard, continue / go back) is still one decision: the expected or
  safe choice is the primary button, the alternative is secondary. Two filled buttons is a Hick's
  _and_ a Von Restorff violation.
  **Numbers.** Aim for **≤ 5–7 options** visible in any one choice set; **one** primary action per view.
  **Tells.** A toolbar of 12 equal buttons; a settings page with 40 toggles on one plane; a modal with
  three buttons of equal weight; "Choose your plan" with 6 columns.
  **Check.** Count the decisions a first-time user must make before their first success. Can any be
  removed, deferred, or defaulted?

### Miller's Law — _break content into chunks_

**Law.** Working memory holds roughly 7 ± 2 items; people retain grouped content far better.
**Rule.** Break content into chunks. Group, label, and separate.
**In practice.**

- Chunk long content into labelled sections with clear headings and whitespace between.
- Format long identifiers (card numbers, IDs, phone numbers) in groups of 3–4.
- Nav with more than ~7 top-level items needs grouping or a second level.
- Tables: cap visible columns, group related columns, freeze the identifier column.
- Don't ask the user to remember something from a previous screen; carry it forward on screen.
  **Numbers.** **5–9 items per group**; **3–4 digits per chunk** in codes; **≤ 7 top-level nav items**.
  **Tells.** An unbroken 300-word paragraph in-product; a 20-item flat sidebar; a 16-digit ID as one
  string; a wizard that asks you to recall a value from two steps ago.
  **Check.** Point at any list, nav, or paragraph. Can a user hold it in their head? If not, chunk it.

### Occam's Razor — _the simplest design that meets the goal wins_

**Law.** Among competing designs that meet the same goal, prefer the one with the fewest assumptions
and elements.
**Rule.** Remove until it breaks, then add back one thing.
**In practice.**

- Every element must justify its presence against the user's task. "Might be useful" is not a reason.
- One way to do each thing. Two paths to the same outcome is complexity for the user, not power.
- Prefer defaults over settings, inference over questions, deletion over disclosure.
  **Tells.** Feature toggles nobody asked for; a filter bar with 9 filters where 2 are used; a "power
  user" mode that duplicates the main flow; a dashboard of 14 widgets.
  **Check.** For each element, ask "what breaks if this goes?" If the answer is "nothing", cut it.

### Pareto Principle — _design for the 20% of tasks that carry 80% of the use_

**Law.** A small share of features and paths accounts for most of the value and usage.
**Rule.** Put essentials first; optimise the primary path ruthlessly; let the long tail be reachable,
not prominent.
**In practice.**

- Identify the top 1–3 jobs per surface. Those get the primary action, first position, best motion,
  and the most testing.
- The remaining 80% of features live one level down: menus, "More", settings, command palette.
- Spend polish budget where users actually are (the empty state they all see, the loading state they
  all wait through), not on the admin page three people visit.
  **Tells.** A rarely-used bulk action sitting next to the primary CTA; equal effort on every page;
  the most common task takes the most clicks.
  **Check.** Name the top 3 jobs. Are they the fastest, largest, first things on screen? Is anything
  else competing with them?

---

## 2. Reach & targets

### Fitts's Law — _make targets large; minimize target distance_

**Law.** Time to hit a target is a function of the distance to it and its size. Big and close = fast;
small and far = slow and error-prone.
**Rule.** Make targets large. Minimize target distance. Place key actions nearby.
**In practice.**

- Hit areas grow with padding, never by shrinking the click area to the glyph.
- Put the action next to the thing it acts on: the row's actions in the row, the field's help beside
  the field, the "Save" near the form end, the confirm button near the trigger.
- Sequential actions sit near each other (the next button appears where the last one was).
- Screen edges and corners are infinite-size targets on desktop; use them for persistent controls.
- Thumb zone on mobile: primary actions in the bottom third; destructive ones out of the easy zone.
- Related to Hick's: spacing between adjacent targets prevents mis-hits — **≥ 8px gap**.
  **Numbers.** **≥ 44×44px** touch targets (Apple HIG / WCAG AAA); **≥ 24×24px** absolute minimum
  (WCAG 2.2 AA); **≥ 8px** between adjacent targets; pointer-travel for a primary sequence kept in one
  region, not corner-to-corner.
  **Tells.** A 16px icon button with no padding; a "Delete" link far from the item it deletes; a form
  whose submit button is at the top; a dropdown whose items are 24px tall on touch; actions in a
  top-right corner for a bottom-left flow.
  **Check.** Measure the primary controls. Trace the pointer path for the top job. Any leg that
  crosses the screen or lands on a target under 24px is a finding.

---

## 3. Familiarity

### Jakob's Law — _follow familiar patterns_

**Law.** Users spend most of their time on other products; they expect yours to work the same way.
**Rule.** Follow familiar patterns. Spend novelty only where it is the point.
**In practice.**

- Standard placements: logo top-left goes home; search top-right or top-center; primary nav left or
  top; account menu top-right; settings under a gear; destructive actions red and last.
- Standard behaviours: Esc closes, Enter submits, Cmd/Ctrl+K opens the palette, back goes back,
  drag reorders, ✕ dismisses, a link looks like a link.
- Use the platform's own controls where the platform does it better (native select on mobile, OS
  date pickers, system scrollbars).
- When you must innovate, do it on one element and make everything around it conventional so the
  novelty is learnable.
- Copy the mental model users already carry from category leaders (Linear for issues, Stripe for
  billing, Figma for canvases, Gmail for threads). For AI-product surfaces the leaders are named:
  the Mobbin AI set in `docs/operations/mobbin-ai-north-star.md` §2 — assistant workspaces (Perplexity, Claude,
  ChatGPT), agent runs (Manus, Devin, Cursor, Lovable), agent operations (Lindy, Relevance AI,
  StackAI), work management (ClickUp, Height, Airtable). Name the 3–5 references for the surface in
  the laws-check row.
  **Tells.** A hamburger on desktop with plenty of room; a custom scrollbar; a novel gesture with no
  affordance; "Save" on the left and "Cancel" on the right when the platform does the reverse;
  a redesigned link colour that isn't a link colour.
  **Check.** Show the screen to someone who has never seen it. Do they guess correctly what each control
  does before touching it? Anything they get wrong is either mis-patterned or under-signalled.

---

## 4. Perception & grouping (Gestalt)

### Law of Proximity — _group related information_

**Law.** Elements close together are perceived as related; elements far apart as unrelated.
**Rule.** Group related information with space before you reach for a border or a box.
**In practice.**

- Whitespace within a group is smaller than whitespace between groups — always, by a visible ratio.
- Labels sit closer to their own field than to the previous field.
- A section's heading is closer to its content than to the section above.
- Related actions cluster; unrelated actions separate. Destructive actions get distance from safe ones.
  **Numbers.** On the 4px grid: **within-group 4–8px**, **between-group 16–32px** — at least a
  **2× ratio**. Label-to-field **4–8px**; field-to-next-label **16–24px**.
  **Tells.** Evenly spaced everything (no grouping reads); a label floating equidistant between two
  fields; borders drawn to compensate for spacing that never grouped; "Delete" right beside "Save".
  **Check.** Squint. Do clusters appear that match the information structure? If it blurs into one
  even field, proximity isn't doing its job.

### Law of Similarity — _things that look alike are read as alike_

**Law.** Elements that share visual attributes (shape, colour, size, weight, style) are perceived as
belonging together and behaving alike.
**Rule.** Same role, same look. Different role, visibly different look.
**In practice.**

- All links look like links; all primary buttons look like the one primary button; all destructive
  actions share the destructive style.
- Don't let a decorative element borrow the accent colour, or it will read as interactive.
- Cards in a grid share dimensions, radius, and padding; a card that differs is read as special —
  make sure it is.
- Status uses one consistent vocabulary (colour + icon + word) across the whole product.
  **Tells.** Two button styles for the same action class; a heading in the accent colour next to real
  links; a "chip" that is sometimes a filter and sometimes a label; icons of mixed stroke weights.
  **Check.** List every interactive element type. Does each have exactly one appearance? Does any
  non-interactive element share it?

### Law of Uniform Connectedness — _visually connected elements are read as one unit_

**Law.** Elements linked by a common region, a line, or a shared container are perceived as more
related than by similarity or proximity alone.
**Rule.** Use containers and connectors to bind what must be read together; never to decorate.
**In practice.**

- A stepper's connecting line says "these are one sequence".
- A card binds a title, body, and actions into one object — so its actions act on _that_ object.
- A shared background region groups a toolbar's controls.
- Connecting lines in a diagram encode relationship; don't add them for style.
- Conversely, never put unrelated things in one container — the container will lie.
  **Tells.** A card that contains two unrelated widgets; a "grouping" border around a single element;
  lines between steps that aren't sequential; boxes-in-boxes-in-boxes.
  **Check.** For every container or connector, name the relationship it encodes. If you can't, remove it.

### Law of Prägnanz — _people perceive the simplest form; low visual complexity_

**Law.** People interpret ambiguous or complex forms as the simplest shape possible; simple forms are
processed faster and remembered better.
**Rule.** Low complexity. Simple geometry, clear silhouettes, few shapes on a plane.
**In practice.**

- Layouts resolve to a few clear rectangles, not a dozen overlapping regions.
- Charts: one clear shape per idea — a single line, a few bars. If a chart needs a legend of 8 to
  read, split it.
- Icons: simple, closed silhouettes at one stroke weight; recognisable at 16px.
- Diagrams and flows: minimise crossings and overlaps; align nodes to a grid.
- Reduce visual noise (extra borders, shadows, gradients) until the structure is the first thing seen.
  **Numbers.** **≤ 3–4 distinct visual regions** on a screen at the top level; **≤ 5 series** on one
  chart; icons legible at **16px** at one stroke weight. Density is allowed _inside_ a region — a
  12-column data table is one region — which is how a dense enterprise console stays simple at the top
  level (the HubSpot "dense but humane" bar in the `premium-ux` skill's `reference-bar.md` is Prägnanz applied, not an exception
  to it).
  **Tells.** A dashboard where the eye has nowhere to land; a spaghetti flow diagram; a chart with 12
  colours; a page where the grid can't be inferred.
  **Check.** Screenshot, downscale to a thumbnail. Can you still see the layout's structure? If it is
  mush, complexity is too high.

---

## 5. Attention & memory

### Von Restorff Effect (isolation effect) — _highlight the primary action_

**Law.** When several similar objects are present, the one that differs most is the one remembered
and noticed.
**Rule.** Highlight the primary action. Make exactly one thing different.
**In practice.**

- One filled accent button per view; everything else is secondary (outline/ghost) or tertiary
  (text). Two accents = zero accents.
- The single most important number or status on a dashboard gets size and colour; the rest stays
  neutral.
- Emphasis is a budget: the more you emphasise, the less any of it means.
- Don't rely on colour alone for the distinction (accessibility) — pair it with weight, size, or
  position.
  **Numbers.** **One** primary action per screen; accent covers **≤ 10%** of the surface (60-30-10).
  **Tells.** Three filled buttons in a row; badges on everything; every metric in a colour; a page
  where the primary CTA is the same weight as "Learn more".
  **Check.** Squint test. Does one thing pop? Is it the right thing?

### Serial Position Effect — _put essentials first (and last)_

**Law.** People best remember the first and last items in a sequence; the middle is forgotten.
**Rule.** Put essentials first. Put the second-most-important thing last. Bury nothing in the middle
that must be remembered.
**In practice.**

- Nav: the most-used destinations at the two ends (Home first, Settings/Account last); the middle
  holds the rest.
- Lists and menus: primary item first, escape/close or destructive last with a separator.
- Onboarding and summaries: lead with the key fact, end with the key action.
- Long forms: identity or essential fields first; the commit action last and visible.
- Notifications and toasts: the message's subject is the first words.
  **Tells.** The most-used nav item fourth of seven; a key setting in the middle of a long page; an
  error message that starts with a code and ends with the useful bit.
  **Check.** Read only the first and last item of every sequence on the screen. Did the user get the
  essentials?

### Zeigarnik Effect — _show progress; make completion gradual and visible_

**Law.** People remember incomplete tasks better than complete ones and are drawn to finish them.
**Rule.** Make completion gradual and visible. Show what's done, what's left, and where they are.
**In practice.**

- Progress indicators on any multi-step flow: step N of M, a bar, a checklist that fills.
- Onboarding checklists with real, meaningful steps that start partly complete ("2 of 5 done") —
  seeded by the account creation they already did.
- Profile or setup completeness meters with the next step named.
- Autosave and "drafts" so an interrupted task is visibly resumable, never lost.
- Never fake it: a bar that sits at 90% for a minute, or a "3 of 4" that then adds a fifth step,
  breaks trust (see Trustworthy axis). Real progress only.
  **Numbers.** Steps shown as **N of M** with M fixed up front; progress updates at **≤ 1s** cadence for
  long tasks; **never a bar that lies**.
  **Tells.** A wizard with no step indicator; a long task with an indeterminate spinner; a setup flow
  that forgets where you were; a "Complete your profile" nag with no percentage or next step.
  **Check.** In every flow longer than one step: can the user see position, remaining, and how to
  resume later?

---

## 6. Time & feel

### Doherty Threshold — _interactions within 400 milliseconds_

**Law.** Productivity and engagement soar when the system responds in under ~400ms; above it,
attention drifts.
**Rule.** Every interaction acknowledges within 400ms. Under 100ms feels instant. Above 400ms, mask
the wait with real state.
**In practice.**

- Acknowledge input immediately (press state, optimistic change) even when the real result is
  pending.
- Optimistic UI for reversible actions; skeletons matched to the final layout for loads; streaming
  for generation.
- Budget: **< 100ms** direct manipulation feel; **< 400ms** for a response to appear or a skeleton to
  be in place; **> 1s** needs a progress indicator; **> 10s** needs the user to be able to leave and
  come back.
- Prefetch on hover and intent; keep the app shell and swap content.
- Measure: interaction-to-next-paint, not just server time. A fast API with a 600ms React render is
  still a failure.
- Entrance choreography never gates reading or input. Content is readable and the primary control
  usable within 400ms of first paint even while a reveal is still running. Product surfaces keep
  entrance motion under ~300ms total; marketing reveals may run longer, but the headline and CTA are
  live from first paint (see §0). A staggered timeline that holds the page hostage is a Doherty
  violation dressed as craft.
  **Numbers.** **< 100ms** instant · **< 400ms** the threshold · **> 1s** show progress · **> 10s**
  allow leaving (background + notify).
  **Tells.** A click with no visual change for half a second; a full-page spinner on a filter change;
  a save button that goes dead until the round-trip returns.
  **Check.** Click every primary control with the network throttled to slow 3G. Does something visibly
  happen within 400ms, every time?

### Peak-End Rule — _end flows memorably_

**Law.** People judge an experience by its most intense moment and its end, not its average.
**Rule.** End flows memorably. Design the peak on purpose; make the ending clean and satisfying.
**In practice.**

- Toasts are for micro-actions _inside_ a flow (saved, copied, toggled, archived-with-undo). The
  **end of a flow** — the thing the user came for — gets a designed completion state: what was
  produced, what's next, a way back, one restrained beat of motion. A 2-second toast is the wrong
  tool for an ending.
- The last screen of onboarding shows the user something real they now have, not "Setup complete".
- Errors at the end of a flow are the most damaging place to fail — over-invest there (recovery,
  preserved input, one-click retry).
- Identify the peak: the moment the product does the thing the user came for (the plan generated,
  the deploy done, the answer streamed). Give it the best motion and copy in the product.
- Exits matter too: cancel, delete, and sign-out should feel respectful and final, never nagging.
  **Tells.** "Success!" in a generic toast; a completed flow that dumps you on an unrelated list;
  a payment that ends on a spinner; a fantastic setup flow that ends with a blank dashboard.
  **Check.** For each top job, screenshot the final screen. Is it the best-designed screen in the flow?
  Would a user screenshot it to show someone?

### Parkinson's Law — _work expands to fill the time allotted; constrain it_

**Law.** Any task will inflate until all of the available time is spent.
**Rule.** Constrain flows to the minimum time and effort they need. Set expectations; make finishing
the default.
**In practice.**

- Autofill, smart defaults, and inference shrink a 10-field form to 3 typed fields.
- Show estimated time ("About 2 minutes") on setup flows and keep the promise.
- Limit free-form input where a bounded control suffices; constrain lengths with visible counters.
- Streaming and progressive results let the user act before the task fully finishes.
- Time-box background jobs: a visible deadline or timeout with a next action, never an open-ended wait.
  **Numbers.** Any setup flow states its expected duration up front; forms ask **only** for fields with
  a use in the next step; timeouts are visible, not silent.
  **Tells.** A 12-field "quick start"; a form that asks for information it could infer or defer;
  a generation task with no time expectation; a review step that invites re-editing everything.
  **Check.** Time the top job from entry to success with a stopwatch. Then list every second that
  wasn't the user's decision. Remove those seconds.

---

## 7. Complexity & tolerance

### Tesler's Law (conservation of complexity) — _the system absorbs the complexity, not the user_

**Law.** Every system has an irreducible amount of complexity; the only question is who carries it —
the product or the user.
**Rule.** Move complexity into the system. Don't push it onto the user through configuration,
manual steps, or decisions the product could make.
**In practice.**

- Infer what can be inferred (timezone, locale, format, likely intent); ask only what cannot be.
- One good default over a settings page. Expose the setting only once a user has a reason to change it.
- Handle format tolerance, deduplication, retries, and ordering internally; never ask the user to
  "try again later" or "enter the date as YYYY-MM-DD".
- An agentic product's whole promise is Tesler's Law: the agent carries the complexity. A form-first
  UI that asks the user to specify everything is a Tesler violation at the product level.
- There is a floor: don't hide complexity the user _needs_ to see (approvals, costs, destructive
  consequences). Absorb complexity, don't conceal accountability. Never remove a confirmation or an
  audit step the repository's security rules require (§0 precedence tier 1).
  **Tells.** A required "configuration" step before first value; a wizard that asks what the product
  could detect; the user manually formatting input; "advanced" that's actually required.
  **Check.** For every question the UI asks, can the system answer it itself? For every step, could the
  system do it? Each "yes" is complexity leaking onto the user.

### Postel's Law (robustness principle) — _liberal in what you accept, conservative in what you send_

**Law.** Be tolerant of varied, imperfect input; be strict, predictable, and clean in what you output.
**Rule.** Accept whatever reasonable form the user gives; give back exactly one clean, consistent form.
**In practice.**

- Input: accept pasted phone numbers with spaces and dashes, dates in any common format, trailing
  whitespace, mixed case emails, URLs with or without scheme. Normalise silently; confirm visibly.
- Never reject on formatting the system can fix. Reject only on meaning it cannot resolve, and say
  exactly what and how to fix it.
- Output: one date format, one number format, one voice, one status vocabulary, everywhere.
- Autosave over "you have unsaved changes". Undo over confirm for _reversible_ actions. Destructive,
  bulk, irreversible, or privilege-changing actions always confirm (naming the object and the
  consequence) and audit — the repository's security rules outrank this law (§0). Never stack undo
  _and_ confirm on the same action; double-gating is nagging.
- Empathetic degradation: if the network is slow or a field is missing, the UI still renders
  something useful and says what is unknown.
- Security boundary: "liberal" is about _format_, not _trust_. Validation and authorisation stay
  strict (see CLAUDE.md security rules); Postel's Law shapes the UX of tolerance, not the threat model.
  **Tells.** "Invalid format" on a date a human wrote correctly; a form that clears on error; a phone
  field that rejects spaces; inconsistent date formats across two tables; a screen that goes blank on
  one missing field.
  **Check.** Paste the ugliest valid input you can into every field. Does it accept and normalise? Does
  every output of the same type look identical across the product?

---

## 8. The laws-check

Run this whenever UI/UX requirements are being written or judged. It is a **gate**, not a suggestion.

### When writing requirements (plan / spec / phase doc "UI/UX considerations" / CLAUDE.md Planning Requirements item 5)

For a _screen_ in the maxion-platform-demo repository the laws-check lives in its **reference sheet** (`docs/operations/ux-reference-sheet.template.md`, gated by `scripts/check_ux_reference_sheet.py`); the table below is what that sheet's §4 contains. Name the **surface class** first (product or marketing, §0) — it sets how much latitude the aesthetic
tier gets. Then, for the surface in question, produce a table with one row per law. Every row must
have a concrete, testable requirement or an explicit "N/A because …". No row may be empty.

```
| Law | Requirement for this surface | Number / acceptance | Verified how |
|---|---|---|---|
| Hick's | One primary action per view; advanced options behind "More" | ≤ 5 visible choices in the run panel | screenshot count |
| Fitts's | Row actions inline; primary CTA in thumb zone on mobile | ≥ 44×44px; ≥ 8px gaps | inspect computed size |
| Jakob's | Esc closes, Cmd+K palette, ✕ dismisses, standard nav placement; patterns match the named Mobbin references (e.g. Manus, Devin, Lindy for a run canvas) | matches convention table + 3–5 references named | keyboard test + side-by-side |
| Interactivity floor (module surfaces) | Composer in context; every shown state actionable in place; live state; no dead ends | static-report test passes on every screen | walk the flow, try to act on each state |
| Proximity | label→field 4–8px; between groups ≥ 16px | 2× ratio holds | inspect |
| Miller's | Nav ≤ 7 items; long IDs chunked 4-4-4-4 | counts | screenshot |
| Doherty | Every control acknowledges < 400ms on slow 3G | < 100ms press state | throttled run |
| Von Restorff | Exactly one filled accent button per view | 1 | squint test |
| Serial position | Most-used destination first, Settings last | order documented | screenshot |
| Peak-End | Completion screen shows the produced artifact + next action | designed, not a toast | walk the flow |
| Zeigarnik | Step N of M visible; drafts autosave | M fixed up front | walk the flow |
| Prägnanz | ≤ 4 top-level regions; charts ≤ 5 series | counts | thumbnail test |
| Similarity | One appearance per interactive type | audit list | inventory |
| Uniform connectedness | Cards bind one object's title/body/actions only | no mixed containers | inventory |
| Tesler's | System infers timezone/locale/format; asks only the 3 unanswerable fields | field count | walk the flow |
| Postel's | Accept any common date/phone format; one output format | paste test passes | paste test |
| Parkinson's | "About 2 minutes" stated and kept; ≤ 3 typed fields | timed | stopwatch |
| Occam's | Every element survives "what breaks if removed?" | inventory | review |
| Pareto | Top 3 jobs are first, largest, fastest | named | review |
```

### When judging a UI (critique / audit / phase-gate lived-experience pass / PR review of a user-facing change)

1. Walk the top 1–3 jobs as a first-time user.
2. For every friction point, name the **law violated** and the **rule** it breaks — "the primary
   action doesn't pop (Von Restorff)", "three equal buttons (Hick's)", "no step indicator (Zeigarnik)".
3. Every finding carries the law, the exact defect, and the exact fix with a number.
4. Add a **Laws** line to the critique verdict listing which laws are violated, in severity order.

### Severity mapping

- **Blocker:** Doherty (> 400ms with no acknowledgement), Fitts's (< 24px targets), Postel's (valid
  input rejected / input lost), Tesler's at product level (user forced to do what the system should),
  Peak-End (flow ends in failure with no recovery).
- **Major:** Hick's, Von Restorff, Jakob's, Zeigarnik, Proximity, Serial Position, Parkinson's.
- **Polish:** Similarity, Uniform Connectedness, Prägnanz, Miller's chunking of codes, Occam's
  trims, Pareto re-ordering.

Severity is by user impact on the top jobs; promote a Polish law to Major when it sits on the primary
path.

---

## 9. Owner's imperative list → law map

The owner's shorthand, as given, mapped to the law it invokes. Use the owner's phrasing in requirement
docs; it is the house vocabulary.

| Owner's imperative                                  | Law                          |
| --------------------------------------------------- | ---------------------------- |
| Reduce choices per screen                           | Hick's Law                   |
| Make targets large                                  | Fitts's Law                  |
| Minimize target distance / Place key actions nearby | Fitts's Law                  |
| Follow familiar patterns                            | Jakob's Law                  |
| Group related information                           | Law of Proximity             |
| Break content into chunks                           | Miller's Law                 |
| Interactions within 400 milliseconds                | Doherty Threshold            |
| Highlight the primary action                        | Von Restorff Effect          |
| Put essentials first                                | Serial Position Effect       |
| End flows memorably                                 | Peak-End Rule                |
| Gradually make completion (show progress)           | Zeigarnik Effect             |
| Low complexity (simple forms and graphs)            | Law of Prägnanz              |
| Same look, same role                                | Law of Similarity            |
| Connected = related                                 | Law of Uniform Connectedness |
| System carries the complexity                       | Tesler's Law                 |
| Accept liberally, output conservatively             | Postel's Law                 |
| Constrain time and effort                           | Parkinson's Law              |
| Simplest design that works                          | Occam's Razor                |
| Optimise the 20% that carries 80%                   | Pareto Principle             |

Spelling and naming as used here are canonical: **Jakob's** Law (Nielsen), **Fitts's** Law,
**Zeigarnik** Effect, **Tesler's** Law, **Prägnanz** (Pregnanz), **Von Restorff** Effect.

Source canon: Jon Yablonski, _Laws of UX_ (lawsofux.com), plus the Gestalt school, Doherty & Thadani
(IBM 1982), Kahneman & Fredrickson (peak-end), Miller (1956), Hick (1952) / Hyman (1953), Fitts (1954).
