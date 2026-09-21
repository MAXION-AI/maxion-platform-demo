# Customer demo: AP invoice exceptions, Discovery to Agentix

One repeatable demo that tells a single story end to end. A head of accounts payable asks MAXION to clear the invoice exception queue in ServiceNow without losing control of who may approve what. Discovery investigates it and produces a nine-document decision package. Agentix receives that package and creates the engagement from nothing, and an agent team builds, tests, releases and then runs the work every morning.

Everything is simulated in the browser. No ServiceNow, Ariba, SAP, Teams or email action happens, and no real customer data is used. The company (Calder Industrial), the people and the figures are synthetic.

## Addresses

| What | Local (`pnpm dev`) | Hosted (GitHub Pages) |
| --- | --- | --- |
| Full demo, from a new Discovery | `http://127.0.0.1:4317/maxion-prototype?demo=servicenow` | `https://maxion-ai.github.io/maxion-platform-demo/#/maxion-prototype?demo=servicenow` |
| Short demo, from the finished Discovery package | `http://127.0.0.1:4317/maxion-prototype?demo=servicenow&start=package` | `…/#/maxion-prototype?demo=servicenow&start=package` |
| Presenter guide (second screen) | `http://127.0.0.1:4317/demo-guide?demo=servicenow` | `…/#/demo-guide?demo=servicenow` |

The demo behaves exactly like the revenue demo, because both run on the same harness: a new tab starts clean, a reload keeps your place, one tab owns the demo at a time, Exit demo is safe to undo, and the everyday prototype is untouched. Its storage is namespaced `…::demo-servicenow`, so the two demos never mix — you can have a revenue demo open in one tab and this one in another.

- **Each new AP invoice exceptions Discovery starts Agentix from zero.** Agentix has no AP exceptions engagement until a Discovery hands its package over. Creating another one in the same tab replaces the earlier one and starts Agentix again from zero. The setup says so beside **Create Discovery** when there is an earlier one.

## Before each customer

1. Open the demo address in a new tab. Use a window around 1440 × 900 at 100% zoom.
2. Open the presenter guide, either at `/demo-guide?demo=servicenow` or from **AP exceptions demo → Presenter window** in the sidebar, and move it to your second screen.
3. Share only the demo tab.
4. Leave the operating system's reduced-motion setting off.

## Timing

- **Full demo:** about 20 minutes, 10 of them in Discovery.
- **From the package:** about 10 minutes.
- **Agentix** moves one demo minute every 4 seconds while it is on screen, and pauses while you are in another module. Use **Demo → Skip five minutes**, and **Demo → Run the next scheduled cycle now** for the morning sweep.

## The story

The number on each heading matches the sidebar count.

### Discovery

**1 · Start the Discovery.** In Discover, choose the **AP invoice exceptions** template and **Start autonomous Discovery**. Tick the authority review and choose **Create Discovery**.
*Say:* Everything starts from a business outcome, not a ticket.

**2 · Answer the owner interview.** Six questions, filled from the sidebar with **Fill answer**, sent with Enter.
*Say:* MAX only asks for judgement the records can't supply.

**3 · Let MAX investigate, then decide.** MAX reads the four sources and interviews the four owners, then stops at one decision: ServiceNow clears invoices on the purchase-order band of ±2% or $25, while 212 supplier contracts negotiate a flat ±1.5%. The two disagree on 240 invoices worth $84,310.55. Choose **Make the contract tolerance authoritative**.
*Say:* Each rule is applied consistently; which one is authoritative is commercial policy, so MAX stops and asks.

**4 · Read the package and approve the charter.** Nine documents land. Show the **Executive decision brief** (22,180 exceptions, 61% mechanical), then the **RAID register** (the two decisions sent to Agentix). Choose **Continue to Agentix** and approve the project charter with a reason.

**5 · Hand the package to Agentix.** Add a note if you like and choose **Continue to Agentix**.

### Agentix

**6 · Create the engagement in Agentix.** Nothing existed in Agentix for this until the handoff. Answer the two questions (**Ask me before each pipeline release**, **The synthetic sweep of 1,904 cases**), choose **Run the read-only check**, then **Activate engagement**.
*Say:* Four agents with separate permissions, the systems they may touch, three milestones and a daily sweep. Discovery couldn't confirm who approves production changes, so that's the first question.

**7 · Decide the no-contract rule.** MS-1 asks about 318 open cases with no active contract to test against. Choose **Route them to the category buyer**.

**8 · Watch a check fail and the repair.** In MS-2, pipeline v1 tests price against the purchase order, so two of its eleven checks fail: tolerance and discount capture. Open v1 to show the 240 cases, $84,310.55 apart. The triage specialist repairs the lookup, and v2 passes all eleven.
*Say:* The Discovery decision became a test, and the test caught the mistake before anything reached production.

**9 · Approve the production release.** Review the target, checks and recovery limits, then choose **Approve release**. The adapter’s acknowledgement is lost on purpose; the coordinator reads the update set back instead of resubmitting it.

**10 · Open the verified dashboard.** MS-3 publishes under policy FIN-AP-7. Open **Results → AP exception dashboard**. When you're ready, choose **Demo → Run the next scheduled cycle now**.

**11 · Run tomorrow morning.** The morning sweep classifies, tests against contract terms, routes what needs a person and refreshes the dashboard. Use **Demo → Skip** until it is verified.

**12 · Close the story.** Open **Activity** to show the verified sweep and its evidence.
*Say:* One Discovery, one package, and an agent team that went from nothing to running the work. Finance made six decisions; everything else ran on its own and was verified.

## Scripted answers

1. The days it sits. An exception takes twenty minutes of work and a week of calendar, and we lose the early-payment discount while it waits.
2. Price inside a tolerance band, quantity rounding, freight coding and a wrong tax jurisdiction never need a question. Anything with no contract, or a supplier in dispute, always does.
3. The contract wins. If procurement negotiated ±1.5% then ±1.5% is the number, whatever the purchase order was set up with.
4. Anything above $5,000 comes to a named approver, and honestly we don't know they still hold it. The authority matrix hasn't been re-attested in two years.
5. Nobody owns production ServiceNow changes today, so treat that as open. Dashboard publishing to the finance group is already covered by policy FIN-AP-7.
6. Mechanical exceptions clear the same day, nothing above $5,000 clears on its own, and I open one dashboard at 08:00 instead of asking three analysts.

- **Charter approval reason:** Scope, owners and the five exclusions match what finance and procurement agreed.
- **Handoff note (optional):** Start with the taxonomy; the no-contract rule is Procurement's to decide.

## Figures (the same in every document and screen)

| Figure | Value |
| --- | --- |
| Exceptions raised in twelve months | 22,180: 6,214 price tolerance, 3,908 quantity rounding, 2,190 freight coding, 1,218 tax jurisdiction, 3,806 missing contract, 2,884 authority unresolved, 1,960 duplicate or disputed |
| Mechanical share | 13,530 of 22,180 (61%) |
| Open queue | 1,904 cases |
| Median time to close | 6.4 days, against 30-day terms |
| Early-payment discounts forfeited | $412,880.40 |
| Approvals routed without current authority | 2,140 of 38,410 payment-run invoices |
| Tolerance conflict | 240 invoices, $84,310.55 (PO ±2% or $25 against contract ±1.5%) |
| Exceptions with no contract | 318 of 1,904 open cases (16.7%), $1,204,772.18 |
| Escalation threshold | Above $5,000, or outside the applicable tolerance |
| Daily schedule (London) | 06:00 sweep, 06:45 tolerance testing, 07:00 routing, dashboard by 08:00 |
| Delegation of authority | 84 rows, last reviewed two years ago |
| People (Calder Industrial) | Priya Raman (Head of Accounts Payable), Marcus Bell (ServiceNow Platform Owner), Inés Duarte (Procurement Contracts Manager), David Osei (Financial Controller) |

## How it works

This demo is a script (`src/features/demo/scripts/servicenow.ts`) on the same harness as the revenue demo: the address picks the demo, and the session, storage, ownership, presenter dock and guide all read the script. Its Discovery lives in `SCENARIOS.servicenow` with nine documents in `deliverables/servicenow.ts`; its Agentix engagement is the `payables` scenario in `engine/scenarios.ts`, whose package `pkg_ap_exceptions_v2` is held back until this Discovery sends it.

Tests: `tests/e2e/servicenow-demo.spec.ts` covers the full journey, storage isolation from the revenue demo and the everyday prototype, and a second Discovery that starts Agentix again from zero. `src/features/agentix/prototype/__tests__/PayablesEngine.spec.ts` drives the engagement arc from nothing to a verified morning.
