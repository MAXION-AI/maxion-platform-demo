# Discovery flow reference

The target for the prototype's Discovery module is the Discovery module in
`max-ai-platform`, surveyed on 2026-09-16. Structure and screens come from there;
only the visual system comes from `docs/visual-spec.md`.

Everything below was read from `apps/max-user-portal` in that repository. Where the
product has two implementations, the one that actually renders is the target.

## Screens, in journey order

| # | Screen | Route in the real product | Purpose |
| --- | --- | --- | --- |
| 1 | Hub | `/portal/discovery` | Resume existing work, start new |
| 2 | Create, brief intake | `/portal/discovery/create` | Turn one sentence into an agreed mission |
| 3 | Preparation | `/portal/discovery/:id/preparation` | Watch MAX build the workspace |
| 4 | Cockpit | `/portal/discovery?dv=workspace&did=:id` | The long-running supervised middle |
| 5 | Publication viewer | `/portal/publications/discoveries/:id/:pub` | Read a published artifact |
| 6 | Stakeholder landing | `/stakeholder-interview?token=` | Public, token-gated |
| 7 | Stakeholder interview | same route, chat state | Public, token-gated |

Screens 6 and 7 are a separate public surface reached by an emailed link, not part of
the owner's own journey.

## 1. Hub

Eyebrow "Autonomous Discovery", title "Continue where MAX left off." A three-cell
summary reads "Needs your input", "Working autonomously", "Packages ready". Then one
primary action, "New Discovery", which locks to a read-only or no-project-available
state when it cannot run. Then a search field and four filters: All, Needs input,
Active, Completed. Then resume rows, each showing a state chip, title, project,
counts, the current activity, an objective excerpt, a progress bar, and an action
word that is "Open package", "Review" or "Resume" depending on state.

One Discovery per project is enforced in the real product.

## 2. Create, brief intake

Not a wizard. A state machine: `idle` to `drafting` to `reviewing` to `committing`
to `done`, with `failed` as an off-ramp.

- **idle** is a single composer asking for one sentence, with a banner listing drafts
  already in flight.
- **drafting** streams a brief while showing a live preview skeleton.
- **reviewing** has two shapes. If MAX has questions, a clarification round runs first
  and can repeat. Otherwise the owner gets an editable draft, a meta rail, and the
  Mission Authority Review panel.
- **Mission Authority Review** is a gate, not a summary. It covers business outcome,
  the decision the Discovery must support, expected outcomes, completion criteria,
  deadline, maximum external sends, interview modalities, approval topology,
  connected evidence sources and allowed recipient domains. "Create Discovery"
  stays disabled until it is marked reviewed.
- **committing** consumes credit and hands off to preparation.

## 3. Preparation

A server-driven step list, polled until it settles, then it enters the workspace on
its own. The steps are: establishing mission, checking authority, binding sources,
building inquiry, starting interview, mapping people, ready. Off-ramps are needs
input, degraded and failed; degraded can still continue, failed offers a retry that
does not create a second Discovery. The screen shows "MAX is preparing the mission.",
a count of completed steps, and an "Enter Thread" action.

## 4. Cockpit

The owner's cockpit wears its own chrome and hides the portal sidebar and
breadcrumbs. A command bar carries the back link, the discovery name, mission meta,
the next-action button, a pause and resume toggle, a "Steer MAX" action and a gear
that opens setup. Below it sits a tab list.

**Four tabs.** Thread, Autonomy, Workshop, Package. Workshop appears only when a
workshop session exists. They are freely navigable, not wizard steps, though the app
pre-selects a tab from the journey stage until the owner picks one by hand.

- **Thread** is the conversation with MAX, with an inner pair of tabs for
  Conversation and Activity, evidence citation chips, a coverage bar and the current
  interview question.
- **Autonomy** is the program board: the current operation, a figure row of verified
  actions, records screened, interviews and owner interruptions, a human authority
  section that steps through decisions, what MAX is handling now, and workstreams
  grouped as Evidence, Stakeholders, Conflicts and Risks and authority. Then a
  coordination roster, a ledger, an executive summary, a risk matrix and synthesis.
- **Package** is the decision package: a toolbar with a status badge, "Continue to
  Plan" and export actions, then a two-column reader with a grouped deliverable list
  on the left and the document on the right with a lineage strip.

**Needs you** is a persistent right rail, not a screen. Its items are material
approvals, authority exceptions, business decisions and work failures.

**Setup** is a right-hand sheet with three sections: Pack, Sources and Stakeholders.

## Journey spine

The server computes one spine that every screen reads:
`frame → interview → evidence → synthesis → deliverables → handoff`, each step
pending, current, complete or blocked, with a sentence naming the next action.

The hub rolls a Discovery up to one of: needs input, working, completed, degraded,
failed.

## Deliverables and the end of the journey

The terminal product is a decision package whose contents are chosen by a manifest
that freezes. The default set is a findings and recommendations report, a technical
assessment, a requirements spec, an executive presentation, a project charter, a
project plan and a RAID log. They are grouped as Foundation, Decision package,
Analysis, Risk and controls, Governance, Mobilization and Requested documents.

Each item is stated as current, planned, retained, owner approval required or owner
approved. The project charter needs an explicit owner approval with a written reason
before handoff.

The journey ends at "Continue to Plan": a handoff preview showing the mission
decision, readiness, the selected outputs, freshness hashes, credit impact and any
blockers, which on confirmation creates an immutable handoff packet and opens Plan.
The package can also be shared, published to storage as a verified publication with a
content hash, or exported per document or as a set.

## What the prototype has today

Hub, a setup screen, a preparing screen, and a workspace with three views: overview,
thread and package.

## Gap to close

1. The workspace has three views; the target has four tabs, named Thread, Autonomy,
   Workshop and Package. The prototype's "overview" is the target's Autonomy.
2. There is no persistent "Needs you" rail.
3. There is no Setup sheet with Pack, Sources and Stakeholders.
4. Create is a single form, not the intake state machine, and has no clarification
   round and no Mission Authority Review gate.
5. Preparation does not name the seven steps or show their states.
6. The journey spine is not modelled explicitly.
7. The package has no charter approval gate and no handoff preview before Plan.

## Caveats recorded during the survey

- The real hub has a second, unreachable legacy implementation. The target is the
  one that renders.
- Two root-level backend planning documents describe an older Discovery with
  different screens and routes. The code is authoritative; those documents are not.
- The workshop session is created by the backend. The owner-side affordance that
  starts one was not found.
