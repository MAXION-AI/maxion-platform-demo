# Customer demo: Salesforce–SAP order sync, Discovery to Agentix

One repeatable demo that tells a single story end to end. A VP of revenue operations asks MAXION to stop booked Salesforce orders failing on the way into SAP, and to settle which system owns the customer. Discovery investigates it and produces a nine-document decision package. Agentix receives that package and creates the engagement from nothing, and an agent team builds, tests, releases and then runs the work every morning.

Everything is simulated in the browser. No Salesforce, SAP, integration platform or Teams action happens, and no real customer data is used. The company (Arcline Technologies), the people and the figures are synthetic.

## Addresses

| What | Local (`pnpm dev`) | Hosted (GitHub Pages) |
| --- | --- | --- |
| Full demo, from a new Discovery | `http://127.0.0.1:4317/maxion-prototype?demo=salesforce-sap` | `https://maxion-ai.github.io/maxion-platform-demo/#/maxion-prototype?demo=salesforce-sap` |
| Short demo, from the finished Discovery package | `http://127.0.0.1:4317/maxion-prototype?demo=salesforce-sap&start=package` | `…/#/maxion-prototype?demo=salesforce-sap&start=package` |
| Presenter guide (second screen) | `http://127.0.0.1:4317/demo-guide?demo=salesforce-sap` | `…/#/demo-guide?demo=salesforce-sap` |

The demo behaves exactly like the other two, because all three run on the same harness: a new tab starts clean, a reload keeps your place, one tab owns the demo at a time, Exit demo is safe to undo, and the everyday prototype is untouched. Its storage is namespaced `…::demo-salesforce-sap`, so the three demos never mix — you can have all three open in three tabs.

- **Each new order sync Discovery starts Agentix from zero.** Agentix has no order sync engagement until a Discovery hands its package over. Creating another one in the same tab replaces the earlier one and starts Agentix again from zero.

## Timing

- **Full demo:** about 20 minutes, 10 of them in Discovery.
- **From the package:** about 10 minutes.
- **Agentix** moves one demo minute every 4 seconds while it is on screen. Use **Controls → Skip five minutes**, and **Controls → Run the next scheduled cycle now** for the morning sync.

## The story

The number on each heading matches the sidebar count.

### Discovery

**1 · Start the Discovery.** In Discover, choose the **Salesforce–SAP order sync** template and **Start autonomous Discovery**. Tick the authority review and choose **Create Discovery**.

**2 · Answer the owner interview.** Six questions, filled from the sidebar with **Fill answer**, sent with Enter.

**3 · Let MAX investigate, then decide.** MAX reads the four sources and interviews the four owners, then stops at one decision: 187 active accounts carry a different address and tax jurisdiction in Salesforce than in SAP, and tax was determined by whichever system posted first — $612,480.90 of orders. Choose **Make the SAP business partner authoritative**.
*Say:* Each system is internally consistent; which one is the master is finance policy, so MAX stops and asks.

**4 · Read the package and approve the charter.** Nine documents land. Show the **Executive decision brief** (1,340 failures, 4.2 days each), then the **RAID register**. Choose **Continue to Agentix** and approve the project charter with a reason.

**5 · Hand the package to Agentix.** Add a note if you like and choose **Continue to Agentix**.

### Agentix

**6 · Create the engagement in Agentix.** Nothing existed in Agentix for this until the handoff. Answer the two questions (**Ask me before each pipeline release**, **The synthetic 30-day order sample**), choose **Run the read-only check**, then **Activate engagement**.

**7 · Decide the unmapped-SKU rule.** MS-1 asks about 94 Salesforce SKUs with no SAP material. Choose **Block the order and raise it to product ops**.
*Say:* Posting them against a placeholder would bill the wrong thing, so the specialist asks rather than choosing.

**8 · Watch a check fail and the repair.** In MS-2, pipeline v1 resolves customers from Salesforce, so two of its twelve checks fail: tax determination and pricing. Open v1 to show the 187 accounts. The integration specialist repairs the resolution, and v2 passes all twelve.

**9 · Approve the production release.** Review the target, checks and recovery limits, then choose **Approve release**. The adapter times out *after* posting on purpose; the coordinator checks the idempotency key rather than creating a second sales order.

**10 · Open the verified cockpit.** MS-3 publishes under policy ITGC-SOX-4. Open **Results → Order exception cockpit**. When you're ready, choose **Controls → Run the next scheduled cycle now**.

**11 · Run tomorrow morning.** The morning sync reads the booked orders, resolves each one, posts under its key and refreshes the cockpit. Use **Controls → Skip** until it is verified.

**12 · Close the story.** Open **Activity** to show the verified sync and its evidence.

## Scripted answers

1. The bookings sitting unbilled. Two million dollars of signed business missed its billing run last quarter because a post failed, and we found out at quarter end.
2. Anything where the data is simply wrong in one system, they fix without asking. Anything where a SKU doesn't exist in SAP, or the price doesn't match the quote, always needs someone to decide.
3. SAP wins. The business partner is what we bill and pay tax against, so if Salesforce disagrees, Salesforce is the one that's wrong.
4. We must never create a second sales order. Cancelling a duplicate leaves a trail we have to explain at audit, so if a post times out, check before you post again.
5. Nobody owns production SAP changes today, so treat that as open. Cockpit publishing to the finance group is already covered by policy ITGC-SOX-4.
6. Every booked order has an SAP number the same day, nothing above $50,000 posts without me, and I stop hearing about duplicates entirely.

- **Charter approval reason:** Scope, owners and the five exclusions match what revenue operations and internal controls agreed.
- **Handoff note (optional):** Start with the mapping; the unmapped-SKU rule is product operations' to decide.

## Figures (the same in every document and screen)

| Figure | Value |
| --- | --- |
| Booked orders in twelve months | 18,942 Salesforce orders · 17,602 SAP sales orders |
| Sync failures | 1,340: 512 customer master, 341 unmapped SKU, 236 tax or incoterms, 148 pricing or currency, 103 duplicate after a timeout |
| Median time to fix a failed order | 4.2 days |
| Bookings unbilled at quarter end | $2,147,320.60 |
| Quarters needing a manual catch-up | 6 of 8 |
| Customer master conflict | 187 accounts of 2,418, $612,480.90 of orders |
| SKUs with no SAP material | 94, across 341 orders ($1,884,210.40) |
| Duplicate sales orders cancelled | 103 |
| Escalation threshold | Above $50,000, or terms differing from the quote |
| Daily schedule (London) | 06:00 sync, 07:00 write-back, cockpit by 08:00 |
| Release window | Thursday 21:00 London |
| People (Arcline Technologies) | Nadia Fournier (VP Revenue Operations), Ryan Castellanos (Salesforce Platform Lead), Mei Lin Tan (SAP Order-to-Cash Lead), Gordon Achebe (Director of Internal Controls) |

## How it works

This demo is a script (`src/features/demo/scripts/salesforceSap.ts`) on the same harness as the other two: the address picks the demo, and the session, storage, ownership, presenter dock and guide all read the script. Its Discovery lives in `SCENARIOS.ordersync` with nine documents in `deliverables/ordersync.ts`; its Agentix engagement is the `orders` scenario in `engine/scenarios.ts`, whose package `pkg_order_sync_v2` is held back until this Discovery sends it.

Tests: `tests/e2e/salesforce-sap-demo.spec.ts` covers the full journey, storage isolation from both other demos and the everyday prototype, and a second Discovery that starts Agentix again from zero. `src/features/agentix/prototype/__tests__/OrdersEngine.spec.ts` drives the engagement arc from nothing to a verified morning, and asserts this engagement carries its own Thursday 21:00 release window rather than another demo's.
