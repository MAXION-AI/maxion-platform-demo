import type { DeliverableBody } from "../types"

// Derived from the ServiceNow financial-control roadmap, requirements, process
// analysis, RAID register, and charter. Written for the conservative path: the
// owner's exception decision is referred to, never stated as made.

export const WBS: DeliverableBody = {
	heading: "Twelve work packages deliver single authorship in 14 weeks, and high-risk changes move only after reliability is evidenced.",
	lede: "This plan breaks the 14-week roadmap into packages with a named owner and a measurable exit. Phase one proves the event contract on low-risk change types by week 4. Phase two moves high-risk changes behind the fail-closed boundary by week 10, gated on the controls platform evidencing 99.9% availability over four consecutive weeks. Phase three retires the duplicate approval path and migrates period-close reporting by week 14. Two council items come before week 1.",
	metrics: [
		{ value: "14 weeks", label: "Planned duration", note: "Gates at weeks 4, 10, and 14" },
		{ value: "99.9%", label: "Availability required for phase two", note: "99.62% observed today" },
		{ value: "4 FTE", label: "Delivery allocation", note: "For confirmation at the council, 3 Oct" },
	],
	keyMessages: [
		{ label: "The matrix comes first", detail: "The event contract gates every later phase, and it depends on the seven-record system-of-record matrix being ratified on 3 Oct. WBS-1.1 is the root of the plan." },
		{ label: "Reliability is a dependency", detail: "WBS-2.4 does not close until WBS-2.1 has evidenced 99.9%. If reliability slips, phase two slips, and the boundary is not softened to hold the date." },
		{ label: "The rollback stays until it is safe to remove", detail: "The duplicate approval path stays alive through phases one and two as the only safe reversal. WBS-3.1 starts only after Gate B has passed." },
	],
	sections: [
		{
			heading: "Work breakdown",
			paragraphs: [
				"Package IDs follow phase and package number, and the IDs stay stable if dates move. Owners come from the charter RACI, the RAID register, and the next steps in the source documents.",
				"Baselining the 22 requirements runs alongside these packages and is carried in the use case catalog. WBS-2.1 starts in week 1 and is numbered in phase two because phase two is the work it gates.",
			],
			exhibit: {
				kind: "table",
				title: "Twelve packages close the 14-week plan, and each gate rests on a production measurement",
				caption: "Work breakdown by phase and package, with the exit each owner is held to.",
				source: "Implementation roadmap · RAID register · Requirements specification · Project charter",
				columns: ["ID", "Work package", "Owner", "Depends on", "Due", "Exit criterion"],
				rows: [
					{ cells: ["WBS-1.1", "Ratify the system-of-record matrix", "Architecture council", "None", "Council · 3 Oct", "Seven record types ratified with one writer each; R-03 put to the council"] },
					{ cells: ["WBS-1.2", "Transfer event-contract ownership", "Andre Baker", "WBS-1.1", "Week 2", "Contract ownership formally with the architect, which closes R-04"] },
					{ cells: ["WBS-1.3", "Assign reconciliation case ownership", "Tessa Grant", "WBS-1.1", "Week 3", "Every record type routes a case to its authoritative writer's team"] },
					{ cells: ["WBS-1.4", "Close D-01 on emergency attestation deferral", "Sarah Liu", "None", "Before phase one", "Council decision recorded and encoded in the attestation policy"] },
					{ cells: ["WBS-1.5", "Deliver six events, outbox, and control identifiers", "Andre Baker", "WBS-1.2", "Week 4", "Redelivery of every event type leaves state unchanged (REQ-19)"] },
					{ cells: ["WBS-1.6", "Prove the contract on low-risk changes", "Ravi Menon", "WBS-1.3, WBS-1.4, WBS-1.5", "Week 4", "Gate A: zero unreconciled records over a full close cycle, from 5.1"], emphasis: true },
					{ cells: ["WBS-2.1", "Fix failover and evidence availability", "Andre Baker", "None", "Week 8", "Four consecutive weeks evidenced at 99.9%, which closes A-01"] },
					{ cells: ["WBS-2.2", "Specify manual fallback", "Sarah Liu", "WBS-1.4", "Week 5", "No same-role path exists, including manual entry during an outage"] },
					{ cells: ["WBS-2.3", "Build the outage simulation", "Andre Baker", "WBS-1.5, WBS-2.2", "Week 7", "Runs a real high-risk change in pre-production on production-shaped data"] },
					{ cells: ["WBS-2.4", "Move high-risk changes behind the boundary", "Ravi Menon", "WBS-1.6, WBS-2.1, WBS-2.3", "Week 10", "Gate B: with the API truly unavailable, the change fails closed"], emphasis: true },
					{ cells: ["WBS-3.1", "Retire the duplicate approval path", "Tessa Grant", "WBS-2.4", "Week 14", "Gate C: no approval authored in both systems for 30 consecutive days"], emphasis: true },
					{ cells: ["WBS-3.2", "Migrate period-close reporting", "Sarah Liu", "WBS-2.4", "Week 14", "Unreconciled records per close cycle at zero, from the 5.1 baseline"] },
				],
			},
		},
		{
			heading: "Sequence",
			paragraphs: [
				"Council items come first and precede week 1. The calendar date for week 1 is open, and the Transformation lead sets it at the council on 3 Oct.",
			],
			exhibit: {
				kind: "timeline",
				title: "Reliability runs under phase two, and the duplicate path stays as the rollback until Gate B passes",
				caption: "Packages by workstream across 14 weeks, with the three measured gates.",
				source: "Implementation roadmap · RAID register",
				ticks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12", "W13", "W14"],
				lanes: [
					{ label: "Event contract", bars: [{ label: "Six events + outbox", start: 0, span: 4, tone: "brand" }] },
					{ label: "Reconciliation", bars: [{ label: "Case ownership", start: 0, span: 3, tone: "muted" }] },
					{ label: "Low-risk changes", bars: [{ label: "Prove the contract", start: 1, span: 3, tone: "muted" }] },
					{ label: "Reliability", bars: [{ label: "Failover fix, evidence 99.9%", start: 0, span: 8, tone: "brand" }] },
					{ label: "Fallback and proof", bars: [{ label: "Fallback spec", start: 3, span: 2, tone: "muted" }, { label: "Simulation", start: 5, span: 2, tone: "muted" }] },
					{ label: "High-risk changes", bars: [{ label: "Fail-closed boundary", start: 4, span: 6, tone: "brand" }] },
					{ label: "Duplicate path", bars: [{ label: "Kept as rollback", start: 0, span: 10, tone: "muted" }, { label: "Retire", start: 10, span: 4, tone: "warn" }] },
					{ label: "Reporting", bars: [{ label: "Close migration", start: 10, span: 4, tone: "muted" }] },
				],
				markers: [
					{ label: "Gate A", at: 4 },
					{ label: "Gate B", at: 10 },
					{ label: "Gate C", at: 14 },
				],
			},
		},
		{
			heading: "What the plan depends on",
			paragraphs: [
				"Five dependencies can move a date in the table. The outage boundary is the one that waits on the decision recorded in the RAID register.",
			],
			bullets: [
				{ label: "Outage boundary", detail: "WBS-2.2 and WBS-2.4 wait on the decision recorded in the RAID register. Until it is read, high-risk changes fail closed in an outage: roughly 7 blocked changes a year, falling to 2 after the reliability work." },
				{ label: "Reliability (A-01)", detail: "The design assumes 99.9% and the platform delivers 99.62%. The programme cannot compel the gap to close, which is why WBS-2.4 is gated on evidence." },
				{ label: "Emergency attestation (D-01)", detail: "WBS-1.4 must close before phase one. If it does not, the first emergency change after go-live sets the rule by precedent." },
				{ label: "Close calendar", detail: "Gate A needs a full close cycle inside weeks 1 to 4, and phase two must land outside a close window (R-05). No source gives the close dates, and Sarah Liu settles them by week 2." },
				{ label: "Change Management capacity (A-04)", detail: "Tessa Grant measures the new evidence step against a full close cycle by week 6. If it fails, retirement of the duplicate path slips and the control stays as designed." },
			],
		},
	],
	findings: [
		{ label: "Dates that disagree", detail: "The roadmap opens phase two in week 5, the charter says it cannot begin until 99.9% is evidenced, and the register dates that evidence at week 8. Andre Baker settles with Sarah Liu what may run before week 8." },
		{ label: "Gate C window", detail: "Retirement starts in week 11, and weeks 11 to 14 hold 28 days against the 30 consecutive days Gate C needs. Ravi Menon settles whether the count starts earlier or the gate moves." },
		{ label: "Most likely misreading", detail: "Gate A. Detection lag improves before the divergence rate does, so the programme will look finished at week 4 when it is a third done." },
	],
	nextSteps: [
		{ action: "Confirm the 14-week plan and 4 FTE, and set the week 1 date", owner: "Transformation lead", due: "Council · 3 Oct" },
		{ action: "Put R-03 to the council as an explicit acceptance", owner: "Ravi Menon · Controls Product Owner", due: "3 Oct" },
		{ action: "Schedule Gate A to span a complete close cycle and publish the close dates", owner: "Sarah Liu · Controller", due: "Week 2" },
	],
	citations: ["[ARCH-057]", "[INC-2418]", "[SOX-041]", "[INT-SARAH-03]", "[INT-TESSA-01]", "[INT-RAVI-06]", "Implementation roadmap", "Readiness v7"],
}

export const CATALOG: DeliverableBody = {
	heading: "Five use cases carry a finance change from request to attestation, and two of them hold rules that the council must close.",
	lede: "The requirements specification defines four use cases whose alternate flows come from the incident record. This catalog keeps those four and adds reconciliation from the target operating model, because in the To-Be process it watches read-model freshness and no longer repairs approvals. Each entry gives its start and end conditions, its steps, and what happens when an event is lost. A rule the sources leave undefined is marked open with the person who settles it.",
	metrics: [
		{ value: "684", label: "Finance changes per year", note: "137 of them high-risk" },
		{ value: "15 min", label: "Staleness bound on read models", note: "Breach raises an owned case" },
		{ value: "22", label: "Requirements behind the catalog", note: "92 in-scope SOX controls" },
	],
	keyMessages: [
		{ label: "One writer per record", detail: "ServiceNow writes requests, routing, and fulfilment. The controls platform writes evidence, attestation, and residual acceptance. Every step below stays inside that split." },
		{ label: "Lost events have defined behaviour", detail: "Each step names what happens when an event is not delivered, the condition behind all 61 observed divergences. A lost event holds the change, and it never approves it." },
		{ label: "Separation is enforced at attestation", detail: "UC-04 refuses a requester's attestation on every path, including manual entry during an outage. Request-time checks are what the emergency path bypasses today." },
	],
	sections: [
		{
			heading: "Catalog",
			paragraphs: [
				"Proposed means the use case sits in the recommended Option B and has not been baselined. Unresolved means a rule inside it is still open. No entry is marked Current or Selected, because the council has not yet ratified the matrix.",
			],
			exhibit: {
				kind: "table",
				title: "Five use cases follow the change from request to attestation, and the two high-risk paths remain unresolved",
				caption: "Use cases with their trigger, accountable actor, and current status.",
				source: "Requirements specification · Target operating model · RAID register",
				columns: ["ID", "Use case", "Trigger", "Accountable actor", "Status"],
				rows: [
					{ cells: ["UC-01", "Raise and route a finance change", "Requester raises a finance change in ServiceNow", "Tessa Grant", "Proposed"] },
					{ cells: ["UC-02", "Evaluate a control and attach evidence", "Controls platform receives change.requested", "Ravi Menon", "Proposed"] },
					{ cells: ["UC-03", "Fulfil a high-risk change", "Fulfilment team attempts a high-risk change", "Open: named fulfilment lead, Tessa Grant confirms", "Unresolved"], emphasis: true },
					{ cells: ["UC-04", "Attest an emergency change", "ServiceNow records an emergency change", "Sarah Liu", "Unresolved"], emphasis: true },
					{ cells: ["UC-05", "Reconcile a mismatch", "Read model breaches its staleness bound", "Ravi Menon", "Proposed"] },
				],
			},
		},
		{
			heading: "UC-01: Raise and route a finance change",
			paragraphs: [
				"Starts when a requester raises a finance change in ServiceNow. Ends when change.requested has been published with its control identifier, or the change has been rejected at intake with the control named.",
				"Inputs are the change details and a resolvable control identifier. ServiceNow writes the request and routing records and no approval.",
			],
			exhibit: {
				kind: "table",
				title: "A change with an unresolvable control is rejected at intake, and routing writes no approval",
				caption: "Steps from request to published event, with the delivery rule on the outbox.",
				source: "Requirements specification · As-Is / To-Be process analysis",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-01.1", "Change requester", "Raises the change in ServiceNow", "Control identifier must resolve", "Cannot resolve (23%): rejected at intake with the control named"] },
					{ cells: ["UC-01.2", "ServiceNow", "Routes the change", "Output: routing record only, with no approval written", "Any approval write here breaks the one-writer rule"] },
					{ cells: ["UC-01.3", "ServiceNow", "Publishes change.requested", "Event carries the control identifier as well as the change identifier", "Delivery lost: held in outbox and redelivered on recovery"] },
					{ cells: ["UC-01.4", "Controls platform", "Holds a copy of the request", "Copy stays within the 15-minute staleness bound", "Bound breached: reconciliation case (UC-05)"] },
				],
			},
		},
		{
			heading: "UC-02: Evaluate a control and attach evidence",
			paragraphs: [
				"Starts when the controls platform receives change.requested. Ends when the control has been evaluated and its evidence is addressable by control identifier from either side.",
				"Of the 92 in-scope controls, 78 have a fully automated evidence path and 14 do not. Those 14 are manual controls, and each needs a named attestor.",
			],
			exhibit: {
				kind: "table",
				title: "No approval is written without an evaluation, and a duplicate event changes nothing",
				caption: "Evaluation steps, with the idempotency rule and the 14 manual controls.",
				source: "Requirements specification · RAID register",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-02.1", "Controls platform", "Consumes change.requested", "Idempotent on a deterministic key (REQ-19)", "Duplicate delivery: state unchanged, no second evidence record"] },
					{ cells: ["UC-02.2", "Controls platform", "Evaluates and publishes control.evaluated", "No approval is written without a control evaluation (REQ-04)", "Event lost: change holds pending, no approval written"] },
					{ cells: ["UC-02.3", "Controls platform", "Attaches and publishes evidence.attached", "Evidence addressable by control identifier from either side (REQ-07)", "Event lost: reconciliation case within 15 minutes"] },
					{ cells: ["UC-02.4", "Ravi Menon", "States the 14 manual controls", "Open: attestor for each manual control. Ravi Menon names them, week 4", "Not counted as automated coverage in the audit position"] },
				],
			},
		},
		{
			heading: "UC-03: Fulfil a high-risk change",
			paragraphs: [
				"Starts when the fulfilment team attempts a high-risk change, of which there are 137 a year. Ends when attestation releases fulfilment, or the change is held pending with no approval written.",
				"The outage alternate flow occurred twice in twelve months. This use case is Unresolved because any change to the outage boundary rests on the decision recorded in the RAID register, and the council has not accepted R-03.",
			],
			exhibit: {
				kind: "table",
				title: "With the controls platform down, no approval is written and the change is held",
				caption: "Fulfilment steps, including the outage path and the residual the council must accept.",
				source: "Requirements specification · RAID register",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-03.1", "Fulfilment team", "Attempts fulfilment", "Released only by attestation.recorded", "No attestation exists: change stays blocked"] },
					{ cells: ["UC-03.2", "Controls platform", "Applies the fail-closed rule", "Platform unavailable: no approval written, change held pending (REQ-13)", "Held in outbox and redelivered on recovery"], emphasis: true },
					{ cells: ["UC-03.3", "Architecture council", "Accepts the residual (R-03)", "Open: acceptance of about 7 blocked changes a year, 2 after reliability work", "Unaccepted, the boundary risks being reversed under pressure"] },
					{ cells: ["UC-03.4", "ServiceNow", "Writes the fulfilment record", "Output: fulfilment record; copy held within the 15-minute bound", "Bound breached: reconciliation case (UC-05)"] },
				],
			},
		},
		{
			heading: "UC-04: Attest an emergency change",
			paragraphs: [
				"Starts when ServiceNow records an emergency change. Ends when a named attestor who is not the requester records the attestation in the controls platform.",
				"The emergency path uses the same process with ordering relaxed: fulfilment may precede attestation, and the rule on who may attest stays fixed. Of the 61 divergences, 23 occurred on this path.",
			],
			exhibit: {
				kind: "table",
				title: "Ordering may relax on an emergency, but the requester can never author the attestation",
				caption: "Emergency steps, with the deferral window that remains open under D-01.",
				source: "Requirements specification · RAID register · Target operating model",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-04.1", "ServiceNow", "Records the emergency change", "Fulfilment may precede attestation", "Recording does not create an eighth record type or a second writer"] },
					{ cells: ["UC-04.2", "Named attestor", "Attests in the controls platform", "Attestor identity must differ from the requester (REQ-11)", "Identities match (23 records): refused in every path, including manual entry"], emphasis: true },
					{ cells: ["UC-04.3", "Sarah Liu", "Sets the attestation window", "Open: deferral of up to 24 hours (D-01). Sarah Liu closes it before phase one", "Not closed: the first emergency change sets the rule by precedent"] },
					{ cells: ["UC-04.4", "Controls platform", "Publishes attestation.recorded", "Idempotency key includes the attestor", "Redelivery cannot change who attested"] },
					{ cells: ["UC-04.5", "Sarah Liu", "Applies the outage rule", "API unavailable: no attestation exists and the change stays blocked", "Any fallback rests on the decision recorded in the RAID register"] },
				],
			},
		},
		{
			heading: "UC-05: Reconcile a mismatch",
			paragraphs: [
				"Starts when a read model breaches its staleness bound, or when reconciliation.mismatched is raised. Ends when the authoritative writer's team closes the case, or the case has escalated to the Controller.",
				"Inputs are the seven record types and their bounds: 15 minutes for most copies and 24 hours for control definitions. Output is an owned case, which replaces 340 hours a year of manual reconciliation at period close.",
			],
			exhibit: {
				kind: "table",
				title: "A mismatch raises an owned case in 15 minutes and reaches the Controller after two cycles",
				caption: "Reconciliation steps, from detection to escalation.",
				source: "Target operating model · Requirements specification",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-05.1", "Reconciliation loop", "Checks read-model freshness", "15 minutes for most copies, 24 hours for control definitions", "Breach: raises reconciliation.mismatched (REQ-16)"] },
					{ cells: ["UC-05.2", "Reconciliation loop", "Raises and assigns the case", "Assigned by record type to the authoritative writer's team", "Case ownership is set by Tessa Grant by week 3 (WBS-1.3)"] },
					{ cells: ["UC-05.3", "Authoritative writer's team", "Resolves the mismatch", "Resolved within two reconciliation cycles, thirty minutes", "Unresolved after two cycles: escalates to the Controller"] },
					{ cells: ["UC-05.4", "Sarah Liu", "Handles the escalated case", "Treated as a control event. Open: required action, Sarah Liu settles it", "Any change to the matrix itself goes to the council"] },
				],
			},
		},
	],
	findings: [
		{ label: "Use case the current design fails", detail: "UC-04. Today the same ServiceNow role can request and attest a high-risk finance change when the controls API is unavailable, and REQ-11 forbids that on every path." },
		{ label: "Rule most likely to be relaxed", detail: "UC-03.2 under REQ-13. During a live outage with a quarter-end change waiting, someone will request a provisional approval, and the design must have no path that allows it." },
		{ label: "Unresolved rules", detail: "R-03 acceptance sits with the council on 3 Oct, and D-01 closes before phase one. The fulfilment lead for UC-03 is also unnamed, and Tessa Grant confirms it." },
	],
	nextSteps: [
		{ action: "Baseline all 22 requirements with Finance and Platform", owner: "Ravi Menon · Controls Product Owner", due: "Week 2" },
		{ action: "Close D-01 and encode the decision in the attestation policy", owner: "Sarah Liu · Controller", due: "Before phase one" },
		{ action: "State the 14 manual controls with named attestors in the audit position", owner: "Ravi Menon · Controls Product Owner", due: "Week 4" },
	],
	citations: ["[ARCH-057]", "[INC-2418]", "[SOX-041]", "[INT-SARAH-03]", "[INT-RAVI-06]", "[INT-ANDRE-02]", "Implementation roadmap", "Readiness v7"],
}
