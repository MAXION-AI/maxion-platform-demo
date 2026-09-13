# Agentix deployed-operations walkthrough
Updated 2026-09-11. All data, effects, certifications and costs are simulated.

## Start here
Open /agentix-prototype. The landing view is deployed agents, not a blank chat. Three agents are deployed; onboarding is a setup draft. The fleet shows open cases, attention and verified outcomes. Open an agent to inspect its independent workload.

## Invoice operations — coordinated team
Open Invoice operations agent. Several invoice cases progress independently. INV-20841 waits for its exact $240 approval while others continue; INV-20844 begins with a change applied and verification pending. Open any case for its outcome contract, authority boundary, decision and collapsible activity/evidence.

Message agent opens a secondary drawer. “Pause intake” stops new case admission; admitted cases continue. Open a case and choose Message about this case for “Pause this case” or “Prioritize this case.” Agent and case scope are explicit. “Continue” cannot approve an invoice.

From About this demo, simulate connection expiry. Pending notification obligations become partial outcomes. Reconnect the notification account; a recheck precedes recovery, and the original record write is not repeated. History and derived outcome measurements remain visible under the same agent.

## Incident triage — one agent
The service desk agent watches ServiceNow events, classifies and assigns incidents, and notifies the approved on-call audience. Verified means assignment/context/handoff were checked; the incident remains open. It does not imply technical remediation or incident resolution.

## Employee onboarding — readiness and human fulfillment
Open the onboarding draft or send its completed process design from Discovery. Confirm the approved London access mapping, recheck, then deploy the reviewed scope. The first new-hire case arrives automatically in the simulation.

Under Operation checks, ask what happens if payroll must be fully automated. The unsupported operation blocks deployment. Requesting the capability does not unblock it. Explicitly retain payroll with its human owner, recheck and deploy. HR/IT work is preserved while a fulfillment reference is required. Attaching it permits verification; it is not immediate business completion.

## Inventory — repeated cycles
Open Inventory operations agent. The active cycle reconciles an uncertain original ERP submission rather than creating another requisition. Cycle history contains independently verified cycles and a missed cycle with its reason. About this demo → Advance to next scheduled cycle creates a distinct occurrence and updates the next weekday schedule. It does not reset prior cycles.

## Discovery and natural language
Discovery keeps its saved-work landing, interview and artifact reader. Process designs ready for Agentix remains a secondary disclosure below existing discoveries. Review a design and Send to Agentix; this transfers design/evidence, not permission to execute.

New agent accepts a responsibility description and maps the four supported demo patterns into the same proposal. Existing deployed responsibilities are reused without duplicate agents. Unsupported input is preserved and clearly marked as not implemented; no live language model is connected.

## What to verify
The UX should answer: what is deployed; what is working now; which case needs me; what changes were applied; what remains unverified; and what verified business result was produced? Users should not need to manage specialist counts, model settings, infrastructure or a workflow canvas.

The frontend clock advances while MAXION is open, not after the browser closes. Service and invoice events arrive periodically. The 200-record cap preserves existing evidence and stops intake. Demo reset changes only Agentix version-3 state, with confirmation. No real email, ERP, HR, Teams, Merge or Azure action occurs.

See agentix-workspace-ux.md for controls, limits, acceptance criteria and rollback. Run pnpm check-types, pnpm test src/features/agentix/prototype/__tests__, and pnpm test:e2e tests/e2e/agentix-operations.spec.ts for the local checks.
