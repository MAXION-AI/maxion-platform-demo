# Customer demo: revenue reconciliation, Discovery to Agentix

One repeatable demo that tells a single story end to end. A finance owner asks MAXION to reconcile daily revenue between an on-prem SQL Server billing ledger and the AWS revenue schema. Discovery investigates it and produces a nine-document decision package. Agentix receives that package and creates the engagement from nothing, and an agent team builds, tests, releases and then runs the work every morning.

Everything is simulated in the browser. No ledger, AWS, ERP, Teams or email action happens, and no real customer data is used. The company (Northstar), the people and the figures are synthetic.

## Addresses

| What | Local (`pnpm dev`) | Hosted (GitHub Pages) |
| --- | --- | --- |
| Full demo, from a new Discovery | `http://127.0.0.1:4317/maxion-prototype?demo=revenue` (or `/demo`) | `https://maxion-ai.github.io/maxion-platform-demo/#/maxion-prototype?demo=revenue` |
| Short demo, from the finished Discovery package | `http://127.0.0.1:4317/maxion-prototype?demo=revenue&start=package` | `…/#/maxion-prototype?demo=revenue&start=package` |
| Presenter guide (second screen) | `http://127.0.0.1:4317/demo-guide` | `…/#/demo-guide` |

The hosted addresses work once a build containing the demo has been published; see Deploy in the README.

- **A new tab always starts clean.** Open the demo address in a fresh tab before each customer. Nothing from the last run carries over.
- **Each new revenue Discovery starts Agentix from zero.** Agentix has no revenue engagement until a Discovery hands its package over. If you create another revenue Discovery in the same demo tab, it replaces the earlier one and Agentix starts again from zero, so the whole process runs again. When there is an earlier revenue Discovery, the setup says so beside **Create Discovery**. Your other Discoveries and the other Agentix engagements stay as they were.
- **One demo tab at a time.** The newest demo tab owns the demo. An older demo tab still open stops saving, and its sidebar row says **Continues in another tab**. From there, **Continue here** moves the demo back into that tab.
- **Reloading the same tab keeps your place,** so an accidental refresh mid-demo loses nothing.
- **Exit demo is safe.** It opens the everyday prototype, and going back to the demo address in the same tab resumes where you were.
- **The everyday prototype is untouched.** The demo saves under its own keys (`…::demo-revenue`) and clears only those. `/maxion-prototype` without `?demo=revenue` is the everyday prototype with its own data.

## Before each customer

1. Open the demo address in a new tab. Use a window around 1440 × 900 at 100% zoom.
2. Open the presenter guide. Either open `/demo-guide` yourself or use **Revenue demo → Presenter window** in the sidebar, then move that window to your second screen. It shows **Connected to the demo tab** once it finds the demo; its **Open the full demo** buttons always start a clean demo.
3. Share only the demo tab.
4. Leave the operating system's reduced-motion setting off, so replies stream and documents land one by one.

The **Revenue demo** row in the sidebar shows the current step, for example `3/12`. Open it for what to do and what to say, and for the one button that moves the story on (**Fill answer**, **Open the decision**, **Open the proposal** and so on). It also has **Restart…** and **Exit demo**. It is small and quiet, but the customer can see it on a shared screen. If you'd rather they didn't, keep it closed and work from the presenter window.

## Timing

- **Full demo:** about 20 minutes, 10 of them in Discovery.
- **From the package:** about 10 minutes.
- **Discovery:** runs on its own after the interview. Each stage takes under two seconds: the decision arrives about 5 seconds after the last answer, and the package about 6 seconds after you decide.
- **Agentix:** moves one demo minute every 4 seconds while it is on screen, and pauses while you are in another module, so nothing moves on without you. To move faster, use **Demo → Skip five minutes**. For the morning cycle, use **Demo → Run the next scheduled cycle now**.

## The story

The number on each heading matches the sidebar count. A step stays current until you have done what it asks, so its notes are on screen while you need them.

### Discovery

**1 · Start the Discovery.** In Discover, choose the **Revenue reconciliation** template and **Start autonomous Discovery**. MAX drafts the mission ("Revenue reconciliation: SQL Server to AWS", a deadline a week out). Tick the authority review and choose **Create Discovery**.
*Say:* Everything starts from a business outcome, not a ticket. MAX drafts the mission and asks up front what it may do without asking.

**2 · Answer the owner interview.** Six questions. Use **Fill answer** in the sidebar, or **Fill in the demo** in the presenter window, then press Enter. On the second answer, MAX says it will check the ledger rather than ask you to guess.
*Say:* MAX only asks for judgement the records can't supply.

**3 · Let MAX investigate, then decide.** Open **Autonomy** while MAX reads the four sources and interviews the four owners. A few seconds later it stops at one decision: the close workbooks convert 14 invoices at invoice-date rates while the ledger uses posting-date rates, $126.24 apart. Choose **Adopt posting-date rates**.
*Say:* This is the part a consulting team spends weeks on. It's finance policy, so MAX stops and asks, and keeps every other branch moving.

**4 · Read the package and approve the charter.** Nine documents land. Show the **Executive decision brief** (418 variances, 89% mechanical), then the **RAID register** (the two decisions sent to Agentix). Then choose **Continue to Agentix** and approve the project charter with a reason; it is the one thing that blocks the handoff.

**5 · Hand the package to Agentix.** In the handoff, add a note if you like and choose **Continue to Agentix**.
*Say:* The packet is frozen, so the agents work from exactly what finance approved.

### Agentix

**6 · Create the engagement in Agentix.** Nothing existed in Agentix for this until the handoff. The proposal names the Discovery and packet it came from; the Discovery's title is a link back to it. Answer the two questions (**Ask me before each pipeline release**, **The synthetic 30-day sample**), choose **Run the read-only check**, then **Activate engagement**.
*Say:* Agentix turned the Discovery into an engagement: a team of four agents with separate permissions, the systems they may touch, three milestones and a daily operation. Discovery couldn't confirm who approves production releases, so that's the first question.

**7 · Decide the missing-region rule.** MS-1 asks about the 212 invoices without a region. Choose **Show them as Unassigned**.
*Say:* The agent found what Discovery flagged. It's a business rule, so the specialist asks instead of choosing.

**8 · Watch a check fail and the repair.** In MS-2, pipeline v1 converts at invoice-date rates, so two of its nine checks fail: currency conversion and totals by region. Open v1 to show the 14 rows, $126.24 apart. The data specialist repairs the join, and v2 passes all nine checks. Use **Demo → Skip** to move faster.
*Say:* The Discovery decision became a test, and the test caught the mistake before anything reached production.

**9 · Approve the production release.** Review the target, checks and recovery limits, then choose **Approve release**. The adapter's acknowledgement is lost on purpose. The coordinator reads the target back instead of sending the change twice.

**10 · Open the verified dashboard.** MS-3 publishes under policy FIN-DASH-2. Open **Results → Revenue dashboard**: $1,284,310.42 by region, $0.00 variance, and the time of the last load. Delivery is verified and the engagement now runs daily at 06:00 London. When you're ready, choose **Demo → Run the next scheduled cycle now**.

**11 · Run tomorrow morning.** The morning cycle loads, reconciles by region, refreshes the dashboard and posts the summary. Use **Demo → Skip** until it is verified.

**12 · Close the story.** Open **Activity** to show the verified morning and its evidence.
*Say:* One Discovery, one package, and an agent team that went from nothing to running the work: built, tested, released and verified every morning. Finance made six decisions: the currency standard, the charter, the release policy, the test data, the region rule and the release. Everything else ran on its own and was verified.

## Scripted answers

1. A number finance can't explain. The close slips about two days most months while we chase differences by hand.
2. Mostly EMEA and APAC, and the analysts only find it at month-end. Check the ledger; I suspect currency conversion.
3. Within $50 per region each day. Anything above $200 comes to me before it's posted.
4. Posting date, with the posting-date exchange rate. That's how the ledger closes.
5. Nobody owns pipeline releases to production today, so treat that as open. Dashboard publishing to finance is already covered by policy FIN-DASH-2.
6. The ledger and AWS agree every morning, and finance opens the dashboard at 07:00 without asking anyone to check it.

- **Charter approval reason:** Scope, owners and the five exclusions match what finance leadership agreed.
- **Handoff note (optional):** Start with the mapping; the region rule is mine to decide.

You can type your own answers instead. An answer that starts with "not sure" makes MAX record a gap and ask who would know. That's a good moment to show, but it adds a question.

## If something goes off script

- **Start again for the next customer.** Open a new tab, or use **Restart…** in the sidebar, the presenter window, or **Agentix → Demo**. You can restart from the beginning or from the finished package. The presenter window tells you if no demo tab answered.
- **Show the process again in the same tab.** Create a new revenue Discovery from **Discover → New Discovery**. It replaces the earlier revenue Discovery and Agentix starts again from zero. The sidebar row goes back to step 2.
- **Agentix seems slow.** Use **Demo → Skip five minutes**. Nothing is lost by skipping.
- **You left a step.** The sidebar row's button goes back to where the story is: the Discovery, its decision, its package, the proposal or the engagement.
- **Refreshing is safe.** The same tab reopens in Discover, or at the package for the short demo, with all progress kept. The sidebar row takes you back. If you refreshed straight after sending an answer, open the Discovery from the row and MAX replies to it.
- **Restart can't be undone by Back.** A restart replaces the page in the browser's history, so Back leaves the demo instead of landing on the run you cleared.
- **"Is this live?"** No. It is a faithful simulation of how the product behaves; the systems, people and figures are synthetic.

## Figures (the same in every document and screen)

| Figure | Value |
| --- | --- |
| Variances logged in twelve months | 418: 163 currency date, 121 missing region, 88 late credit notes, 46 manual keying |
| Median time to find a variance | 19 days |
| Closes that slipped | 8 of 12, 1.9 days late on average |
| 30-day ledger sample | 4,812 invoices; 612 non-USD; 212 without a region (4.4%, $1,236,258.92); 37 late credit notes |
| Currency difference | 14 invoices, $126.24 |
| Tolerance and escalation | $50 per region per day; variances above $200 go to the revenue owner |
| Daily schedule (London) | 05:30 load, 06:00 reconciliation, dashboard by 07:00 |
| A reconciled day | $1,284,310.42: AMER $588,409.12, EMEA $497,215.33, APAC $157,477.37, Unassigned $41,208.60 |
| Pipeline | 18 approved source fields, migration 0007, 9 checks, daily load measured at 6 min 12 s |
| People (Northstar) | Olivia Hart (Revenue Operations Director), Grace Chen (Billing Systems Manager), Sam Okafor (Data Platform Lead), Tom Whitfield (Financial Controller) |

## How it works

- `src/features/demo/session.ts` decides from the address whether this tab is the demo. It uses a per-tab session flag, so a new tab starts clean and a reload keeps its place, and it gives each module its storage key.
- The demo's Discovery hub has two context Discoveries and none waiting on you. Started from the package, the finished revenue Discovery is added.
- The demo's Agentix starts from zero at the moment the demo starts, with London-time schedules and no background intake. The revenue engagement is an empty draft with no work, results or history, and the revenue package is held back until its Discovery sends it (`demoInitialState`). The handoff then arrives as a new engagement, not an expansion of an existing one.
- Creating a revenue Discovery in the demo replaces any earlier revenue Discovery and resets the demo's Agentix to that from-zero state (`resetDemoAgentix`). Agentix stays mounted behind the other modules, so it resets at once, whichever module is on screen. The everyday prototype never does this.
- The handoff packet carries its target (`agentix`), the package (`pkg_revenue_v2`) and the Discovery it came from. Agentix records that provenance on the proposal and on the engagement.
- One tab owns the demo's saved state at a time. A shared owner token lets any other demo tab (a new one, or a duplicate) notice, stop saving, and offer **Continue here**.
- The sidebar row and `/demo-guide` both read the demo's saved state (`src/features/demo/progress.ts`), so they always agree. The guide sends **Fill** and **Restart** to the demo tab over a `BroadcastChannel`; the owning tab confirms each one. The guide never changes the saved state itself.
- Tests: `tests/e2e/customer-demo.spec.ts` covers the full journey, a second Discovery that starts Agentix again from zero and runs the process again, reuse and restart, and the presenter window. `src/features/demo/__tests__/` covers the session and progress logic, including the from-zero engagement.
