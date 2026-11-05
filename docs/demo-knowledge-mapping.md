# Customer demo: month-end close mapping, Discovery to Knowledge

One repeatable demo that tells a single story end to end, and the one to show a customer who wants to know their own operation before they automate any of it. Northstar's Controller asks MAXION to map how the month-end close actually runs. Discovery reads the systems and the written procedure, interviews the people who do the work, and finds where they disagree. The approved package then goes to **Knowledge**, not Agentix. There, the Controller publishes what becomes Northstar's procedure, rules and glossary, one suggestion at a time, and every later Discovery and Agentix run starts from it.

Everything is simulated in the browser. No SAP, QuickBooks, ServiceNow, SharePoint or email action happens, and no real customer data is used. The company (Northstar), the people and the figures are synthetic. Northstar is the organization the Knowledge library already describes, so the story ends in a library the customer can see filling up.

## Addresses

| What | Local (`pnpm dev`) | Hosted (GitHub Pages) |
| --- | --- | --- |
| Full demo, from a new Discovery | `http://127.0.0.1:4317/maxion-prototype?demo=close-map` | `…/#/maxion-prototype?demo=close-map` |
| Short demo, from the finished Discovery package | `http://127.0.0.1:4317/maxion-prototype?demo=close-map&start=package` | `…/#/maxion-prototype?demo=close-map&start=package` |
| Presenter guide (second screen) | `http://127.0.0.1:4317/demo-guide?demo=close-map` | `…/#/demo-guide?demo=close-map` |
| Stakeholder interview (what a stakeholder receives) | `http://127.0.0.1:4317/stakeholder-interview?demo=close-map` | `…/#/stakeholder-interview?demo=close-map` |

The hosted addresses are on [maxion-ai.github.io/maxion-platform-demo](https://maxion-ai.github.io/maxion-platform-demo/#/maxion-prototype?demo=close-map).

It runs on the same harness as the other demos. A new tab starts clean, a reload keeps your place, one tab owns the demo at a time, and **Exit demo** is safe to undo. Its storage is namespaced `…::demo-close-map`, and that includes its own copy of the Knowledge library, so approving suggestions here never changes the everyday prototype's library.

- **Agentix stays out of it.** This Discovery hands nothing to Agentix. Say so if anyone asks: mapping comes first, and automation is a separate Discovery when the customer wants one.
- **Each new close-mapping Discovery starts Knowledge again from the seeded library.** Creating another one in the same tab replaces the earlier one, and anything you approved goes back to the seeded versions. The setup says so beside **Create Discovery** when there is an earlier one.

## Before each customer

1. Open the demo address in a new tab, in a window around 1440 × 900 at 100% zoom.
2. Open the presenter guide at `/demo-guide?demo=close-map`, or from **Close mapping demo → Presenter window** in the sidebar, and move it to your second screen.
3. To show a stakeholder's side, choose **Hannah Brooks** under "Show a stakeholder's side" in the presenter window. She runs the US elimination, and nobody else can explain it. It opens in its own window and never touches the demo.
4. Share only the demo tab.
5. Leave the operating system's reduced-motion setting off.

## Timing

- **Full demo:** about 15 minutes, 10 of them in Discovery.
- **From the package:** about 6 minutes.
- **Knowledge** has no clock. Nothing moves until you approve it.
- **Recent sign-in.** Publishing knowledge needs a sign-in in the last 15 minutes, and the demo counts the presenter as signed in 6 minutes before the page loaded. In the full demo the Knowledge beats usually come after that, so the sheet says so and offers **Sign in again**. Choose it, then approve. It's a real rule, and worth saying out loud.

## The story

The number on each heading matches the sidebar count. The first seven beats are the same moves as the other demos, so a presenter who knows one already knows these.

### Discovery

**1 · Start the Discovery.** In Discover, choose the **Month-end close mapping** template and **Start autonomous Discovery**. MAX drafts the mission ("Month-end close: how it actually runs", for the Controller, a week out). The brief ends with *current state only, no automation design*. Six documents are selected, with the **Use case catalog** as the process map, and there's no charter, because nothing is being built. Tick the authority review and choose **Create Discovery**.
*Say:* This isn't a project to build anything. The outcome is a description of our close that's true, owned and cited, and the brief says "current state only", so MAX doesn't drift into a design.

**2 · Answer the owner interview.** Six questions. Use **Fill answer** in the sidebar, or **Fill in the demo** in the presenter window, then press Enter. Or make it a call with **Start the call**. On the second answer, MAX says it will verify late postings in the journal log instead of asking you to guess.
*Say:* On the second answer I give MAX a suspicion, not a fact. It doesn't write my guess down as the procedure; it goes and reads twelve closes of the journal log.

**3 · Approve the interview briefs.** Choose **Review briefs**, show Hannah Brooks' brief (what MAX wants to learn, and the evidence her grant allows), then **Approve all**.
*Say:* Most of what a company knows isn't written down; it's in people like Hannah. Before MAX asks her anything, I see exactly what the interviewer will hold, and a person approves it.

**4 · Let MAX map, then decide.** Open **Autonomy** while MAX reads the four sources and talks to the four people. It stops at one decision. The written rule freezes the ledger after day 3, but the SAP journal log shows 118 intercompany true-ups posted on day 4 across twelve closes, $4,812,330.17 gross, each reviewed by the Controller afterwards. Choose **Publish a controlled day-4 intercompany window**.
*Say:* Both are real: the freeze is written and approved, and the true-ups are regular and reviewed. Which one Northstar publishes as its procedure is a control decision. MAX shows me the evidence; it doesn't make the call.

**5 · Watch the package land.** Open **Package** while MAX writes the six selected documents. There's no charter to approve, so the sidebar moves on to the next step as soon as they land.
*Say:* Six documents chosen for a mapping: how the close runs and who does each step, which system holds each record, what could go wrong, the test the procedure has to pass and the plan to prove it on the next close. Nothing about what to build.

**6 · Read the package, then approve the version.** Show the **Use case catalog**, at *The close as performed*: 25 steps people perform, 9 matching the written procedure, 16 written nowhere, and 2 written steps that no longer happen. Then show the **RAID register**'s key-person risk: Hannah ran the US elimination in 11 of 12 closes, and April's close slipped two days when she was out. Choose **Approve package**. The dialog names the exact version, the manifest and each document's hash, and says approving publishes nothing in Knowledge; confirm it.
*Say:* This is the map a new controller would take a month to piece together, and every step names who does it, in which system and where MAX saw it. Approval binds this exact version, and publishes nothing in Knowledge yet; that's the next step, one item at a time.

**7 · Send the findings to Knowledge.** Choose **Continue to Knowledge**. The dialog says Knowledge receives one immutable packet and lists its findings as suggestions, and that nothing is published until an Owner or Admin approves each one. Add a note if you like and confirm. Knowledge opens, and its sidebar badge goes up by eight.
*Say:* The package is a document. Knowledge is what every future Discovery and agent run reads first. The two meet only through suggestions a person approves.

### Knowledge

**8 · Review the suggestions.** Under **Waiting on you**, each suggestion reads **Suggested by Discovery · Month-end close: how it actually runs**. Open **Key systems and who owns them**. Its cited source is the Technical assessment's *Systems of record*, in package v1, and it shows **What changes from v2**: the close task list in ServiceNow, and the elimination workbook and its owner. Choose **Approve and publish**.
*Say:* Nothing Discovery learns becomes what we know until an Owner or Admin approves it, and every item says exactly where it came from.

**9 · Publish Month-end close v5.** Open the **Month-end close** suggestion (marked **Suggested v5**), or use **Open the procedure** in the sidebar row. It cites the Use case catalog's *The close as performed*, and **What changes from v4** lists 25 steps instead of 11, the $25,000 threshold the binding rule set, the day-4 window, and the two steps that no longer happen. The sheet also says publishing settles the open conflict "Two approval thresholds". Choose **Approve and publish**. The conflict leaves Waiting on you, and the library shows Month-end close at v5.
*Say:* An edit applies to new work only. Anything already running keeps v4 pinned, and the next Discovery or agent run reads v5.

**10 · Keep the sensitive part with Finance.** Open **US intercompany elimination** (or **Open the restricted procedure**), a procedure that didn't exist before today. **Visibility** reads "Only Sarah Liu, Luca Romano, Hannah Brooks", as the owner asked in the interview. Choose **Approve and publish**.
*Say:* Restricted knowledge reaches an agent only when the person it works for may see it. And Hannah's workbook is no longer the only copy of how the US elimination runs.

**11 · Close the story.** Show the library: three items published today and five still waiting (the freeze rule and four glossary terms), each with its source one click away. If you open the freeze rule, it's guidance: agents read it, and it never grants or approves anything. A rule that must never be broken is also a platform control.
*Say:* One Discovery, and Northstar's close is written down the way it actually runs: owned, cited, and no longer resting on one person's workbook. The Controller made one decision and approved what she chose; MAX did the rest and showed its sources. When Northstar does want to automate the close, that Discovery starts from this.

## Scripted answers

1. All three, honestly. The written close says four days, we never make it, and when one person is out it slips again.
2. Day 3 onwards. What happens between my review and the reporting pack is a guess on my part. Check the journal log; I suspect people post after the freeze.
3. Hannah in New York. She runs the US intercompany eliminations, and I couldn't tell you how.
4. The day-3 freeze is binding; it's my rule. The approval threshold moved to $25,000 on October 1, so anything that still says $10,000 is wrong.
5. I approve what becomes our procedure, and it's published in Knowledge for every project. The elimination steps stay with Finance: Hannah, Luca and me.
6. Anyone on the team can open the procedure and it matches what we did last month, and the close survives a holiday.

- **Handoff note (optional):** Start with the procedure and the elimination; the glossary can wait.

You can type your own answers instead. An answer that starts with "not sure" makes MAX record a gap and ask who would know. That's a good moment to show, but it adds a question.

## Stakeholder calls

| Person | What MAX asks | What MAX takes from it |
| --- | --- | --- |
| Sarah Liu | What does the day-3 freeze protect? | The freeze protects the Controller's review |
| Hannah Brooks | How does the US elimination run? | It runs from one person's workbook |
| Luca Romano | When do the intercompany true-ups post, and who approves them? | They post on day 4 and are reviewed after the fact |
| Elena Ortiz | Does anything post to P41 after day 3? | Intercompany posts to P41 after day 3, every month |

The decision comes from the disagreement between Sarah Liu and Luca Romano.

## Showing a failure

The same three simulations as every Discovery, from the **…** menu in the Discovery header or ⌘K "simulate". **Simulate: connection revoked** fits this story best: it pauses reads from one named source and lists the documents that rested on it. **Reconnect** resumes it.

## If something goes off script

- **Start again for the next customer.** Open a new tab, or use **Restart…** in the sidebar or the presenter window, from the beginning or from the finished package.
- **You rejected the procedure or the elimination.** The story moves on, and the last step in the sidebar says which one you rejected. To show it published, restart from the finished package.
- **Someone switches off a document in the manifest.** The Use case catalog, the Technical assessment and the RAID register are marked Required, because the suggestions cite them. Switching one off is recorded as an exception, and the suggestions that cite it aren't sent.
- **You approved the wrong item.** Publishing is real: there's no undo. **Withdraw** stops new work using an item, and work already started keeps its pinned version. To show the story again, restart.
- **"Can it just publish everything?"** No, on purpose. Each item is one approval, by the customer's Owner or Admin.
- **"Does it learn on its own later?"** Not today. Approved findings becoming organization context by themselves is planned, but it isn't part of the first release. For now, a person approves each item.
- **"Is this live?"** No. It's a faithful simulation of how the product behaves; the systems, people and figures are synthetic.

## Figures (the same in every document and screen)

| Figure | Value |
| --- | --- |
| Closes examined | 12 (the last twelve months) |
| Written procedure | Month-end close v4: 11 steps over 4 working days; 9 still happen as written, 2 no longer happen (the manual bank upload, replaced by a bank feed in March, and the paper sign-off sheet) |
| Steps people perform | 25: 9 match the procedure, 16 are written nowhere |
| Close length | Median 5.5 working days; 9 of 12 closes ran past day 4 |
| Journals after day 3 | 146 manual journals in SAP across 12 closes; 118 are intercompany true-ups posted on day 4, $4,812,330.17 gross |
| Approval threshold | Procedure v4 says $10,000; the binding rule says $25,000 since Oct 1; the September close, run in early October, still routed 37 approvals between $10,000 and $25,000 to a Finance Director |
| Key-person risk | The US elimination runs from one SharePoint workbook (3 macros) that Hannah Brooks ran in 11 of 12 closes; April's close slipped 2 days when she was out |
| Sources | Journal entry log (SAP S/4HANA P41, 9,412 entries) · Close procedure and checklist (SharePoint Finance/Close, v4, 11 steps) · Close task list (ServiceNow Finance Operations, 1,284 tasks) · US entity ledger (QuickBooks Online 934771, 2,206 entries) |
| Package | 6 documents: Executive decision brief, Requirements specification, Technical assessment, RAID register, Project plan and WBS, Use case catalog (the process map, S-01 to S-25); no charter |
| Knowledge suggestions | 8: Month-end close v5 (revises v4), US intercompany elimination (new, three named people), Key systems and who owns them v3, the freeze rule v2 (guidance), and four glossary terms (Day-3 freeze, Intercompany true-up, Elimination workbook, Flash report) |
| People (Northstar) | Sarah Liu (Controller, owner), Hannah Brooks (Senior Accountant, US Finance, New York), Luca Romano (Group FP&A Manager), Elena Ortiz (Finance Systems Lead, SAP) |

## How it works

- **The product rules it shows.** Discovery suggests additions to Knowledge, and a suggestion stays a draft until an Owner or Admin approves it (doc 22). Every item is versioned, attributed and dated; work pins the version it used; restricted items reach an agent only for someone who may see them; and knowledge informs agents without granting anything. Approved findings becoming organization context automatically is deferred, so each item takes one approval.
- **The script.** `src/features/demo/scripts/closeMap.ts` is a `knowledge` ending on the same harness as the other demos (`scripts/types.ts`). An ending decides the beats after the seven Discovery ones, and `progress.ts` reads them from the demo's own Knowledge library (`DEMO_KEYS.knowledge`).
- **The Discovery.** `SCENARIOS.closemap` in `discovery-autonomous/model.ts` hands its package to Knowledge (`handoff.target: "knowledge"`, `pkg_close_map_v1`). Its documents are in `deliverables/closemap.ts` and `deliverables/planning/closemap.ts`. A package going to Knowledge needs none of the three documents Agentix requires; it requires the documents its suggestions cite instead (`KNOWLEDGE_CITED_DOCUMENTS`).
- **Why these six documents.** They're the platform plan's first-release five (doc 05, D-122), plus the executive brief every customer demo tells its story from. The plan puts current-state process maps in the Use case catalog, so the catalog holds the 25 steps, the six paths they make and the close's glossary. The As-Is / To-Be analysis isn't selected, because this mission has no to-be; it still has a short body that points at the catalog, since every scenario carries all eleven documents.
- **The suggestions.** `organization/discoverySuggestions.ts` holds what the package sends, for either decision. Each one cites a section of a selected document (`cites`), never an interview or the decision on its own, and the sheet names it with the packet's package version. The glossary meanings are the catalog's own sentences (`GLOSSARY` in `deliverables/closemap.ts`). `knowledge.ts` receives a packet once (`suggestFromDiscovery`), and publishes a suggested next version onto the item it revises (`approveSuggestion`), within the essentials budget and settling the conflicts it corrects. In a demo the library is saved under the demo's key; everyday, it stays in memory as before.
- **Tests.** `tests/e2e/close-map-demo.spec.ts` covers the full journey, a reload, isolation from the everyday library, and the short demo. `src/features/demo/__tests__/Progress.spec.ts` and `Scripts.spec.ts` cover the eleven beats and the script, including that every suggestion's cited section exists in the documents the package selects, on both decision paths, and `src/features/organization/__tests__/DiscoverySuggestions.spec.ts` covers receiving and publishing suggestions.
