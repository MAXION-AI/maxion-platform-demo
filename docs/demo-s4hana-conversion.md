# Customer demo: S/4HANA conversion, Discovery to Agentix

One repeatable demo that tells a single story end to end, and the one a system integrator recognises fastest. An IT director asks MAXION which of 11,842 custom objects survive an ECC to S/4HANA conversion, which SAP now does as standard, and which have to be kept because the business depends on how they behave. Discovery investigates it and produces a nine-document decision package. Agentix receives that package and creates the engagement from nothing, and an agent team dispositions, remediates, releases and then runs a readiness sweep every night.

Everything is simulated in the browser. No SAP, ATC, CTS or Teams action happens, and no real customer data is used. The company (Halden Group), the people and the figures are synthetic.

## Addresses

| What | Local (`pnpm dev`) | Hosted (GitHub Pages) |
| --- | --- | --- |
| Full demo, from a new Discovery | `http://127.0.0.1:4317/maxion-prototype?demo=s4hana` | `https://maxion-ai.github.io/maxion-platform-demo/#/maxion-prototype?demo=s4hana` |
| Short demo, from the finished Discovery package | `http://127.0.0.1:4317/maxion-prototype?demo=s4hana&start=package` | `…/#/maxion-prototype?demo=s4hana&start=package` |
| Presenter guide (second screen) | `http://127.0.0.1:4317/demo-guide?demo=s4hana` | `…/#/demo-guide?demo=s4hana` |
| Stakeholder interview (what a stakeholder receives) | `http://127.0.0.1:4317/stakeholder-interview?demo=s4hana` | `…/#/stakeholder-interview?demo=s4hana` |

The demo behaves exactly like the other three, because all four run on the same harness: a new tab starts clean, a reload keeps your place, one tab owns the demo at a time, Exit demo is safe to undo, and the everyday prototype is untouched. Its storage is namespaced `…::demo-s4hana`, so the four demos never mix — you can have all four open in four tabs.

- **Each new S/4HANA conversion Discovery starts Agentix from zero.** Agentix has no conversion engagement until a Discovery hands its package over. Creating another one in the same tab replaces the earlier one and starts Agentix again from zero.

## Who this demo is for

An SI audience recognises the work in the first sentence, and the punchline lands on their own economics: the analysis a team spends six weeks on runs in the session, the business makes **one** decision instead of 412, and the SI keeps the part that needs judgement. If you only have ten minutes, start from the package and open at beat 4.

## Timing

- **Full demo:** about 20 minutes, 10 of them in Discovery.
- **From the package:** about 10 minutes.
- **Agentix** moves one demo minute every 4 seconds while it is on screen. Use **Controls → Skip five minutes**, and **Controls → Run the next scheduled cycle now** for the nightly sweep.

## The story

The number on each heading matches the sidebar count. To show a stakeholder's side at any point, open **Stakeholder interview** from the sidebar row or the presenter window: it opens in its own window, carries this demo's own Discovery, and never touches the run.

### Discovery

**1 · Start the Discovery.** In Discover, choose the **S/4HANA conversion** template and **Start autonomous Discovery**. MAX drafts the mission ("S/4HANA conversion: custom code disposition"). Tick the authority review and choose **Create Discovery**.
*Say:* Everything starts from a business outcome, not a ticket.

**2 · Answer the owner interview.** Six questions. Use **Fill answer** in the sidebar, then press Enter. On the second answer MAX goes and reads the usage statistics rather than asking the owner to guess how much code is live.
*Say:* MAX only asks for judgement the records can't supply.

**3 · Let MAX investigate, then decide.** Open **Autonomy** while MAX reads the four sources and interviews the four owners. It stops at one decision: 412 used objects now have a standard S/4HANA equivalent, 374 behave identically, and **38 do not**. On the custom credit-exposure check alone, €2,412,880.40 of orders a month would block differently. Choose **Adopt SAP standard and change the process**.
*Say:* This is the part an SI bills six weeks for. MAX proved which 374 are mechanical and isolated the 38 that change what the business sees. That's finance policy, so it stops and asks, and keeps every other branch moving.

**4 · Read the package and approve the charter.** Nine documents land. Show the **Executive decision brief** (11,842 objects, 3,610 executed in a year), then the **Business case** (4,660 person-days leaving the estimate on evidence). Then choose **Continue to Agentix** and approve the project charter with a reason; it is the one thing that blocks the handoff.

**5 · Hand the package to Agentix.** Add a note if you like and choose **Continue to Agentix**.

### Agentix

**6 · Create the engagement in Agentix.** Nothing existed in Agentix for this until the handoff. Answer the two questions (**Ask me before each pipeline release**, **The sandbox copy of the repository**), choose **Run the read-only check**, then **Activate engagement**.
*Say:* Four agents with separate permissions, the systems they may touch, three milestones and a nightly sweep. Discovery couldn't confirm who approves production transports, so that's the first question.

**7 · Decide the ownerless objects.** MS-1 asks about 212 objects in use that nobody claims. Choose **Hold them for the Development Lead**.
*Say:* Remediating them quietly would carry someone else's debt into S/4HANA, so the specialist asks instead of choosing.

**8 · Watch a check fail and the repair.** In MS-2, pipeline v1 dispositions the exceptions in bulk, so two of its twelve checks fail: behaviour and credit exposure. Open v1 to show the 38 objects. The remediation specialist repairs the rule, and v2 passes. Use **Controls → Skip** to move faster.
*Say:* The Discovery decision became a test, and the test caught the pipeline applying the standard credit rule before anything reached production.

**9 · Approve the production release.** Review the target, checks and recovery limits, then choose **Approve release**. The adapter's acknowledgement is lost on purpose; the coordinator reads the transport back instead of releasing it twice.

**10 · Open the verified dashboard.** MS-3 publishes under policy ITGC-SAP-3. Open **Results → Conversion readiness dashboard**: 11,842 objects dispositioned, no drifting transports, and the time of the last sweep. The engagement now runs nightly at 22:00 CET. When you're ready, choose **Controls → Run the next scheduled cycle now**.

**11 · Run tonight's sweep.** The sweep reads the day's transports, tests each against the readiness variant, blocks what drifts and refreshes the dashboard. Use **Controls → Skip** until it is verified.

**12 · Close the story.** Open **Activity** to show the verified sweep and its evidence.
*Say:* One Discovery, one package, and an agent team that went from nothing to running the work. The programme made six decisions: the archive threshold, the 38 exceptions, the charter, the release policy, the test data and the ownerless objects. Everything else ran on its own and was verified.

## Scripted answers

1. The estimate. Six thousand person-days of remediation was priced off the ATC findings, and I have no idea how much of that code anyone still runs.
2. Anything with no execution behind it they would retire without asking. Anything where SAP standard does the job differently always needs a decision. Check the custom code inventory; I suspect most of the estate is dead.
3. Finance decides. If standard calculates something differently from the way we do it today, that is a business change, not a technical one.
4. If it has not run in a year, archive it. Under twenty executions in twelve months I would rather archive it and keep a way to bring it back.
5. Nobody owns production S/4HANA transports today, so treat that as open. Dashboard publishing to the programme board is already covered by policy ITGC-SAP-3.
6. Every transport is clean before it reaches the queue, nothing above the threshold is archived without me, and the board opens one dashboard at 07:00.

- **Charter approval reason:** Scope, owners and the five exclusions match what the programme board and Finance Systems agreed.
- **Handoff note (optional):** Start with the disposition map; the ownerless objects are the Development Lead's to decide.

## Figures (the same in every document and screen)

| Figure | Value |
| --- | --- |
| Custom objects in the repository | 11,842 |
| Executed at least once in twelve months | 3,610 (30.5%) |
| Archived on the agreed threshold | 9,352 · 8,232 never executed, 1,120 under twenty |
| Carried forward to remediate | 2,078, of which 212 have no named owner |
| Standard equivalents | 412 · 374 behave identically, 38 do not |
| Readiness findings | 27,415 across 4,102 objects · 1,180 error priority in 604 objects |
| Remediation estimate | 6,140 person-days submitted; 1,480 at the recommended scope |
| Credit exposure difference | €2,412,880.40 of orders a month |
| Transport history | 4,318 over twenty-four months, 214 of them drifting |
| Nightly schedule (CET) | 22:00 sweep, refusal by 23:00, dashboard by 07:00 |
| Change window | Thursday 20:00 CET |
| People (Halden Group) | Anja Möller (IT Director), Stefan Keller (SAP Development Lead), Rosa Iglesias (Finance Systems Manager), Damian Okonkwo (Basis and Platform Lead) |

## How it works

It is the same harness as the other three demos; only the script, the Discovery scenario and the Agentix engagement differ.

- `src/features/demo/scripts/s4hana.ts` is the twelve-beat script and the scripted answers.
- `src/features/discovery-autonomous/model.ts` holds the Discovery scenario, and `deliverables/s4hana.ts` its nine documents.
- `src/features/agentix/prototype/engine/scenarios.ts` holds the Agentix engagement (`conversion`), its three milestones, twelve pipeline checks, the nightly cycle and `pkg_s4_conversion_v2`.
- Tests: `tests/e2e/s4hana-demo.spec.ts` covers the full journey, its own storage, and a second Discovery that starts Agentix again from zero.
