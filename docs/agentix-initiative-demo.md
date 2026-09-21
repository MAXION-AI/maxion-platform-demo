# Agentix walkthrough
Updated 2026-09-18. All data, systems, effects and costs are simulated. The demo clock advances every four seconds while MAXION is open; presenters can step it with Demo → Clock.

## Start here
Open /agentix-prototype (or Agentix in /maxion-prototype). The landing is the four engagements, plus a "Needs you" inbox with the two seeded decisions. Service desk is a single agent. Revenue reconciliation, Employee onboarding and Inventory operations are specialist teams, each with one accountable coordinator.

## Flagship: Revenue reconciliation → data engineering → daily operation
1. **Entry.** In Discover, open *Process designs for Agentix → Revenue data engineering v2*, then Send to Agentix. Alternatively, go to Agentix → Assign work and describe it ("Reconcile revenue between the SQL Server ledger and AWS every morning, with a dashboard"). Both open the same review, "Expand Revenue reconciliation", and repeating either reopens it.
2. **Review.** The outcome, the boundary, six systems with their capabilities, and what starts. Answer the two questions: pipeline releases (approval before each one, recommended; dashboard publishing is already pre-authorized by policy FIN-DASH-2) and test data (synthetic 30-day sample, recommended). Readiness then shows read, build & test, and production change as ready. Activate expansion.
3. **Parallel work.** Deployment v2 keeps the invoice team and adds a data specialist and a dashboard specialist. MS-1 (mapping) starts. MS-2 (pipeline) waits for MS-1, and MS-3 (dashboard) waits for MS-2's validated schema. Existing invoice cases keep running.
4. **A focused decision.** Profiling finds 212 invoices with no region code. The question card shows the mapping excerpt. Choose "Show them as Unassigned" (a business rule the agent won't pick for you).
5. **Test → repair → recheck.** Pipeline v1 fails two isolated checks: FX conversion uses the invoice date, and the regional totals are off. The data specialist repairs it (attempt 1 of 2), and v2 passes 9 of 9. Open MS-2 to see each tested version.
6. **Release decision.** REL-1 names its target (AWS PostgreSQL revenue schema, migration 0007 and the nightly load), changes, impact, checks, authority and recovery limits. Approve it, approve it for Saturday 02:00, or keep it in test.
7. **Unknown outcome.** The adapter loses the acknowledgement. REL-1 is *Reconciling*: nothing is resent, and the read-back finds the migration applied once. MS-2 then verifies the first production load against the ledger.
8. **Dashboard.** MS-3 publishes under policy FIN-DASH-2 and verifies its tiles. Results → Revenue dashboard shows totals by region with a country drill-down in v2. Results also hold the mapping, pipeline, reconciliation evidence, runbook and release history.
9. **Operation.** The header becomes "Daily 06:00 London". Demo → "Run the next scheduled cycle now" starts REC-1001 early (the clock doesn't jump); it loads, reconciles, refreshes and notifies. Its evidence becomes a new version of Reconciliation evidence.

## Steering to try (composer, any view)
- Open INV-20842 and send "Prioritize this case". It's applied to that case only. "Pause INV-20843" sent from there is refused, because it names another case.
- In Results → Revenue dashboard, send "Add regional drill-down to this dashboard". It's queued, then applied as v2 with a new drill-down check and a CHG follow-up. Production stays on v1 until v2 passes and releases.
- In Results → Source-to-target mapping (before the pipeline releases), send "Use only the approved source fields". The pipeline is rebuilt and retested, and the pending release decision is withdrawn.
- "Approve the release" in chat is refused; use the decision card. "Explain the failed check" answers from the test records. Unsupported text stays in the composer.

## Recovery to try (Demo sheet)
- **Remove release permission.** An approved release blocks before applying. Restore it and the release continues.
- **Expire the notification connection.** INV-20844 becomes partial: its ERP record change is kept and only the notification waits. Reconnect and it verifies without a second write.
- **Lose the next release acknowledgement.** The next release reconciles instead of retrying.

## Other showcases
- **Service desk (one agent).** It triages ServiceNow incidents and hands them to the owning team. Verified means the assignment and handoff were checked, not that the incident is resolved.
- **Employee onboarding (team).** The HR and IT specialists prepare a joiner in parallel. JOIN-306 waits for the payroll owner's fulfillment reference, which is a person's job and not automated. Attaching it lets verification finish.
- **Inventory operations (team).** Weekday 06:00 reviews run as independent occurrences. STOCK-902 reconciles an uncertain requisition write instead of creating a duplicate. A missed cycle stays in history with its reason.

## Checks
Run the following:
- `pnpm check-types`
- `pnpm build`
- `pnpm test`
- `PLAYWRIGHT_BROWSERS_PATH=0 pnpm test:e2e tests/e2e/agentix-operations.spec.ts`
- `pnpm check:design`
- `pnpm check:density`

See agentix-workspace-ux.md for the object model, rules, limits and the UX-law acceptance matrix.
