# Agentix — engagements that own ongoing work
Updated 2026-09-18. This replaces the 2026-09-11 deployed-agents contract. It describes the frontend demo only; nothing here is a production runtime sign-off.

## What the customer should understand
"This agent owns this responsibility. Here is its work, what needs me, and what it has achieved." A deployed specialist team keeps its responsibility. It can work through qualified business tools, build versioned engineering artifacts, test them in isolation, release them under policy, and then keep operating the result. These are capabilities inside one engagement, not separate modules or agent types. There is no workflow-versus-role selector, model or effort picker, agent count, sandbox picker or graph to configure.

## Navigation
MAXION sidebar → Agentix → engagement → a work item or a result. An engagement has three stable destinations:

| Destination | Answers | Contents |
|---|---|---|
| Work (default) | What is happening? Does it need me? | A "Now" line (open work by state, and whether anything needs you), the latest achievements, the first decision in full with the rest as rows, then Delivery milestones, recurring cycles, cases, and History. An aside shows team presence and operation facts. |
| Results | What has actually been achieved? | Artifacts with business previews first, and verified outcomes. |
| Activity | What did the agents do? | Actions, decisions, tool operations and evidence, grouped by day and filterable. Tool operations expand. No private reasoning is shown. |

Team, sources, connections and operating rules live in the Details sheet, not in standing panels. Breadcrumbs and Back restore the list with its scroll position and return focus to the row you opened. Under a 64rem workspace, Results switch from list-and-preview to list, then detail.

## One state model
`engine/` owns a single versioned store (`AgentixState` v4) and every transition: `engine.ts` (tick, decisions, releases, amendments, intake and demo controls), `steering.ts` (instructions), `selectors.ts` (derived views) and `scenarios.ts` (typed scenario data). Engagements, deployed specialists, work items (case, cycle, milestone), artifacts with versions and checks, releases and decisions are separate records linked by id. Conversation messages, work, results, activity and controls all read the same records, so they always agree. `seed.ts` builds the initial demo, and `storage.ts` validates, persists and migrates it.

## Entry and activation
Discovery ("Send to Agentix") and a direct brief ("Assign work") land on the same review. Sending a package again, or writing a brief that matches it, reopens the review in progress. It never creates a second engagement. A brief routes one of three ways: new work for the deployed team, the package that expands it, or, only if you choose it, a separate engagement.

The review leads with what activation starts: the outcome, the operating boundary, the systems with their capability (read, build & test, production change, record update, notify) and what starts. Next come the only questions the package can't answer. For the flagship these are how pipeline releases are authorized (dashboard publishing is already pre-authorized by policy FIN-DASH-2) and what data isolated tests may use. Then a readiness split: read sources, build and test in isolation, and change production. Each of the three is ready or not on its own, so the outcome is never labelled ready while a needed capability is missing. Team (reused versus added), milestones, coverage and the source package are disclosures. Provenance is exact: "From Discovery · title vN" or "From your brief". Activation is separate from any production release.

## Work model and visibility
Cases, scheduled cycles and bounded milestones share one work list. Milestones declare dependencies (MS-2 after MS-1; MS-3 after MS-2's test), and specialists work in parallel. One blocked item never stops the engagement: every row, and each specialist in Team, reads as working, waiting for a dependency, waiting for your decision, recovering or ready for incoming work. The words carry the meaning, not colour alone. New work for an existing team (Assign work, or the composer) creates a work item for the deployed specialist; nothing is rebuilt.

## Results, testing and release
The flagship previews are the source-to-target mapping, the pipeline stages (SQL is secondary), reconciliation evidence, the regional dashboard with country drill-down, the operating runbook, and version and release history with compare. Every preview is labelled either as synthetic test data or as simulated production. Its actions are real: request a change (scoped composer), inspect evidence, compare versions and open related work.

- **Testing.** Tests run in an isolated workspace on the synthetic 30-day sample, bound to one version. Pipeline v1 fails two checks and is repaired automatically (at most two attempts). v2 then passes all nine. The detail shows each tested version and what failed. A passed test is never presented as a production result.
- **Release.** A release names its target, changes, impact, checks, authority and recovery limits. Rollback is not promised for data a downstream reader has already used. The pipeline needs your approval (or the Saturday 02:00 window, if you chose that policy). Dashboard publishing is pre-authorised by policy FIN-DASH-2.
- **Authority.** A release applies only under a pre-authorising policy or a resolved approval. A hold only defers a release that is already allowed to proceed. Chat, holds and demo controls never stand in for approval. A stopped or kept-in-test release that needs approval comes back only through "Request release again", which asks for approval again. Reaching the window without approval asks again. Under the Saturday-window policy, stopping and resuming a release, or lifting your own hold, waits for the next window again. A release that has already been dispatched always finishes or reconciles; it is never left mid-release.
- **Unknown outcomes.** An unknown outcome (the first pipeline release loses its acknowledgement) enters reconciliation for three demo minutes. Nothing is resent, and it resolves as applied once.
- **Lost permission.** Removing release permission blocks a release before it applies.
- **Amendments.** A change creates a new version. While a release it would affect is applying or being reconciled, the change shows "Waiting to apply" and applies once that release settles. It invalidates results on unreleased versions and supersedes pending releases, withdrawing their decisions. Dependents that have checks are rebuilt and retested. A deployed version's record is never rewritten. A change to released work becomes a CHG follow-up item for the same specialist, and production stays on the released version until the new one passes and releases.

## Continuous operation
Once the pipeline and dashboard milestones are verified, the same engagement runs a daily 06:00 London reconciliation. Each cycle is an independent occurrence: it loads, reconciles, refreshes the dashboard and notifies. The Work view shows the next occurrence, data freshness (marked Stale when the last scheduled occurrence hasn't verified), service health, and derived measures (verified count, median time to verify). No savings or cost is claimed. A failed notification keeps the completed record change as a partial outcome and resumes only the outstanding send. A notification outage holds only notifications: new work is still admitted and progresses up to its send. Pause intake, pause a work item, and hold or stop a release are separate controls.

## Conversation and steering
One composer is always in the dock, in Work, Results and Activity alike, addressed to the accountable agent. It shows its scope: the whole engagement, a work item or a result. Drafts are kept per scope. Navigation never retargets an unsent draft; the composer offers to write about what you're viewing instead. The conversation panel opens as an overlay, can be pinned beside the work, collapses to the latest reply, and closing it never pauses work. Material progress posts a linked update in the conversation.

| Instruction | Result |
|---|---|
| Questions ("What needs me?", "Explain the failed check") | Answered from the records; nothing changes. If the question describes supported work, the reply offers it, and nothing happens until you accept. |
| Prioritize, pause or resume a case; hold a notification; pause or resume intake; hold a release until the window; stop a release | Applied immediately and visible in the work list, detail and activity |
| "Add regional drill-down to this dashboard", "Use only the approved source fields" | Queued, then applied on the next demo minute as a new version |
| "Reconcile the August credit notes" | Queued as new work for the reconciliation analyst |
| Approve or release | Refused. Decisions stay in their cards. |
| Widen permissions or grant access | Refused. A broader scope needs a new review. |
| "Hold this release until the agreed window" on a release still awaiting approval | Not applied. The reply points to "Approve for Saturday 02:00" on its card. |
| A change that names another case from inside a case | Not applied, with the reason; your text stays in the composer. From the whole engagement, naming a case ("Pause INV-20843") targets that case. |
| Anything the demo can't do | Not applied, with the reason; your text stays in the composer |

Instruction states are Queued, Waiting to apply, Applied, Not applied, Couldn't apply and Answered. Classification happens as you send, so there is no separate "received" state. Questions only read, so a question about a named item is answered about that item.

## Demo controls
The Demo button opens a labelled sheet with:
- clock controls: advance one minute, skip five, go to the release window;
- per-engagement controls: incoming work, run the next cycle now (early, without moving the clock), expire the notification connection, remove release permission, lose the next release acknowledgement;
- a reset with confirmation.

On the Assign work page, a "Demo controls" disclosure holds the scripted-scenario selector. It is not an AI model setting.

A view that fails to render shows "This view couldn't be shown" with a way back, instead of blanking the MAXION shell.

## Storage
The key is `maxion-agentix-operations-v4`. On first read, a saved v3 demo is migrated; the v3 key and all unrelated storage are left untouched. Reading never writes. Malformed state falls back to the seeded demo, and records are shape-checked and bounded (work 240, events 600, messages 400).

## Limits
Everything is simulated. There is no language model; four scripted scenarios stand in. No real SQL Server, AWS, ERP, HR, ServiceNow, Teams or email action occurs, and there are no credentials. Work advances only while MAXION is open in this browser and stops when it closes. A production runtime would need durable tenant-scoped workers, a scheduler, authorization, an effect ledger and provider verification.

## UX laws
| Law | Decision | Acceptance |
|---|---|---|
| Hick's | Three destinations; one filled action per decision | No mode pickers; demo controls live in their own sheet |
| Fitts's | 36px controls on desktop, 44px at 600px and narrower; 8px gaps | Checked at 320, 390, 768, 1024 and 1440px |
| Jakob's | Tabs, breadcrumbs, side sheet and composer match the Plan and Execute modules | Arrow keys move between tabs; Escape closes and returns focus |
| Proximity | A decision holds its facts, consequence and actions | Release facts sit beside approve, window and keep-in-test |
| Miller's | "Now" in one line, the first decision in full, the rest as rows | History starts collapsed with 20 records |
| Doherty | Every action updates local state immediately | Instructions show Queued, Applied or Not applied within the same frame |
| Von Restorff | Only the decision's primary action is filled | Assign work and header actions are outline buttons |
| Serial position | Needs-you comes first, then delivery, cycles and cases | The newest achievement leads the Now panel |
| Peak-end | A verified milestone reads as its evidence | Delivery ends in "runs as a daily operation" with the next cycle |
| Zeigarnik | Open obligations stay visible | Required outcomes show evidenced or pending per item |
| Prägnanz | At most main, aside and an optional conversation | No five-column cockpit; the aside moves below under 64rem |
| Similarity | One status vocabulary everywhere | The same words in rows, detail, team and activity |
| Uniform connectedness | One card per decision; one row per work item | Artifacts, releases and items link rather than nest |
| Tesler's | The review asks only what the package can't answer | Two questions for the flagship; the rest is derived |
| Postel's | Unsupported input is preserved | Declined instructions keep their text |
| Parkinson's | Existing work opens immediately | New work for a deployed team needs one sentence |
| Occam's | One store, one tick, one composer | The chat-first and case-drawer components were removed |
| Pareto | Status, decisions and results first | Team, sources, connections and rules are one sheet away |

## Verification record — 2026-09-18
- **Types and build.** `npx tsc --noEmit -p .` and `pnpm build` passed. The build's existing single-bundle warning remains (about 1.80 MB of JavaScript, 500 kB gzipped); code splitting is out of scope.
- **Unit and component tests.** `npx vitest run` passed: 351 tests in 10 files. Agentix accounts for 52: engine and steering, storage migration, view components, and the retained legacy prototype.
- **Browser journeys.** `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright test` passed all 68 tests, 17 of them in `agentix-operations.spec.ts`:
  - both entry points without duplicates, and a prompt-origin brief;
  - an existing specialist taking new work;
  - parallel milestones with one blocked;
  - failure → repair → recheck;
  - an unknown release reconciled once;
  - an amendment making a new version while production stays;
  - lost permission;
  - a partial notification;
  - scoped steering and drafts;
  - delivery → daily operation;
  - keyboard tabs, sheets and conversation;
  - 320–1440px with no overflow, plus axe serious/critical checks;
  - reset;
  - v3 migration.
- **Guards.** `node scripts/check-design-tokens.mjs` passed, with `engagement.css` now strict. `node scripts/check-visual-density.mjs` passed every screen; the Agentix baseline was updated to the v4 screens and adds `agentix-results`.
- **Independent audits.** There were three read-only rounds by separate agents. Every blocker and major now has a regression test; minor findings (copy, focus, contrast, target size) were fixed and re-checked in the next round.
  - Round 1 found two blockers: chat could reach production without approval, and Reset from inside a separate engagement crashed. It also found seven majors: a change during reconciliation, a decision resuming paused work, steering misreads, provenance, the notification outage, results claims and demo clock jumps.
  - Round 2 found one blocker, where stop/resume under the window policy released early, and two majors: a stranded dashboard release and review wording.
  - Round 3 found one major: a dashboard change waited for a kept-in-test pipeline release. It also found two minors: release-card wording, and a row that lagged one tick after Stop. All three were fixed afterwards, with a regression test for the major; no fourth round was run.
- **Visual review.** Desktop (1440×900, 1280×720) and phone (390×844) renders of the landing, review, Work, item detail, Results previews, Activity, the conversation (overlay, pinned and phone sheet), the Details and Demo sheets, and the other three engagements were inspected. The platform shell stays light under a dark colour-scheme preference (pre-existing).
