import type { DeliverableBody } from "../types"

// Derived from the NorthBridge roadmap, requirements, process analysis, RAID
// register, and charter. Written for the conservative path: the owner's exception
// decision is referred to, never stated as made.

export const WBS: DeliverableBody = {
	heading: "Twelve work packages run from pre-signing to day 100, and nothing after signing starts until the revenue definition is in the executed agreement.",
	lede: "This plan breaks the three-phase roadmap into packages with a named owner and an exit that can be checked against evidence. Pre-signing carries the four conditions whose failure changes the price, plus the funding decision that must close before drafting. Days 1 to 45 test delivery capacity against the 1,824 qualified pipeline records and fund the concentration response. Days 46 to 100 commit the $3.1m and prepare the reporting migration without executing it.",
	metrics: [
		{ value: "4", label: "Conditions before signing", note: "Failure changes price, not plan" },
		{ value: "Day 45", label: "First evidenced checkpoint", note: "Capacity against pipeline, not forecast" },
		{ value: "$3.1m", label: "Modernization committed", note: "Of the $8.4m estimate" },
	],
	keyMessages: [
		{ label: "The definition gates three workstreams", detail: "WBS-1.1 and WBS-1.6 feed the committee model, the purchase agreement, and the reporting migration. No other package can be sequenced around them." },
		{ label: "The first quarter tests capacity with evidence", detail: "WBS-2.2 runs one templated implementation against a live engagement, so A-02 is confirmed or falsified before the hiring plan is committed." },
		{ label: "Exits are binary", detail: "The definition is present in the executed document, and the budget is committed rather than planned. Neither can be met by a status report." },
	],
	sections: [
		{
			heading: "Work breakdown",
			paragraphs: [
				"Package IDs follow phase and package number: phase 1 is pre-signing, phase 2 is days 1 to 45, and phase 3 is days 46 to 100. Owners come from the charter RACI, the RAID register, and the next steps in the source documents.",
			],
			exhibit: {
				kind: "table",
				title: "Six of twelve packages close at or before signing, because those are the ones that can move the price",
				caption: "Work breakdown by phase and package, with the exit each owner is held to.",
				source: "Implementation roadmap · Requirements specification · RAID register · Project charter",
				columns: ["ID", "Work package", "Owner", "Depends on", "Due", "Exit criterion"],
				rows: [
					{ cells: ["WBS-1.1", "Agree the recurring-revenue definition", "Elena Park", "None", "Pre-signing", "24-month ledger re-run under the definition equals the committee model"], emphasis: true },
					{ cells: ["WBS-1.2", "Restate concentration on the reconciled base", "Marcus Reed", "None", "Before IC · 25 Sep", "Top-five concentration restated at 38% on evidenced ARR"] },
					{ cells: ["WBS-1.3", "Re-derive the modernization estimate", "Lauren Diaz", "None", "Pre-signing", "$8.4m re-derived independently within 10% variance, $3.1m pre-day-100"] },
					{ cells: ["WBS-1.4", "Close D-02, the modernization funding route", "Elena Park", "WBS-1.3", "Pre-signing", "Integration budget or price recorded before agreement drafting"] },
					{ cells: ["WBS-1.5", "Execute retention terms for two platform roles", "Elena Park with Lauren Diaz", "None", "Pre-signing", "Signed terms in the disclosure schedule, which closes A-05"] },
					{ cells: ["WBS-1.6", "Execute the definition in the purchase agreement", "Elena Park", "WBS-1.1, WBS-1.4, WBS-1.5", "Signing", "Definition present in the executed document, not a side letter"], emphasis: true },
					{ cells: ["WBS-2.1", "Model and fund the concentration response", "Nate Brooks", "WBS-1.2, WBS-1.6", "Day 30", "Response for the top five accounts modelled and funded"] },
					{ cells: ["WBS-2.2", "Run one templated implementation as the A-02 test", "Nate Brooks", "WBS-1.6", "Day 45", "Live engagement run; A-02 confirmed or falsified before hiring commits"] },
					{ cells: ["WBS-2.3", "Build the capacity plan against qualified pipeline", "Nate Brooks", "WBS-2.2", "Day 45", "Plan reconciles to 1,824 pipeline records and holds if A-02 is false"], emphasis: true },
					{ cells: ["WBS-2.4", "Report recurring share on the agreed definition", "Marcus Reed", "WBS-1.6", "Day 45", "Reported share compared with the $41.5m diligence figure"] },
					{ cells: ["WBS-3.1", "Commit the $3.1m and start modernization", "Lauren Diaz with Elena Park", "WBS-1.6", "Day 60, checked day 100", "Budget committed, not merely planned; reporting separation underway"] },
					{ cells: ["WBS-3.2", "Prepare the reporting migration", "Marcus Reed", "WBS-1.6", "Day 100", "Migration prepared, not executed; reporting stays on the target ledger"] },
				],
			},
		},
		{
			heading: "Sequence",
			paragraphs: [
				"The sequence keeps the price-relevant work ahead of the operating work. No source gives a signing date, so all post-close dues count from signing, and Elena Park sets that date.",
			],
			exhibit: {
				kind: "timeline",
				title: "Pre-signing conditions clear first, the capacity evidence lands at day 45, and migration stays in preparation",
				caption: "Packages by workstream from pre-signing to day 100, with the three checkpoints.",
				source: "Implementation roadmap · Project charter",
				ticks: ["Pre", "D1", "D15", "D30", "D45", "D60", "D75", "D100"],
				lanes: [
					{ label: "Deal conditions", bars: [{ label: "Definition, cost, retention", start: 0, span: 1, tone: "brand" }] },
					{ label: "Concentration", bars: [{ label: "Model and fund", start: 1, span: 2, tone: "muted" }] },
					{ label: "Delivery capacity", bars: [{ label: "A-02 test and capacity plan", start: 1, span: 3, tone: "brand" }] },
					{ label: "Recurring share", bars: [{ label: "Report", start: 3, span: 1, tone: "muted" }] },
					{ label: "Modernization", bars: [{ label: "Commit $3.1m", start: 4, span: 1, tone: "brand" }, { label: "Reporting separation + billing", start: 5, span: 3, tone: "brand" }] },
					{ label: "Reporting migration", bars: [{ label: "Prepare only", start: 5, span: 3, tone: "warn" }] },
				],
				markers: [
					{ label: "Signing", at: 1 },
					{ label: "Day 45", at: 4 },
					{ label: "Day 100", at: 8 },
				],
			},
		},
		{
			heading: "What the plan depends on",
			paragraphs: [
				"Five dependencies can move a date in the table. The revenue classification conflict is the one that waits on the decision recorded in the RAID register.",
			],
			bullets: [
				{ label: "Revenue classification", detail: "The CFO cites 94% recurring and the finance extract classes 17% of the same contracts as implementation services. How that reaches WBS-1.1 waits on the decision recorded in the RAID register. WBS-1.1 stays pre-signing either way." },
				{ label: "Definition and concentration", detail: "R-01 and R-04 resolve from the same question. WBS-1.2 restates at 38% on the reconciled base, and if the agreed definition differs from it, Marcus Reed restates again." },
				{ label: "Funding before drafting (D-02)", detail: "WBS-1.4 must close before the purchase agreement is drafted, or the $8.4m is funded twice or not at all." },
				{ label: "Template for the A-02 test", detail: "The 340 engineering and 200 consultant hours are budgeted by day 30 and the test runs by day 45. Whether a template can be ready in those 15 days is open, and Lauren Diaz settles it with Nate Brooks." },
				{ label: "Hiring re-plan", detail: "If the test holds, Nate Brooks re-plans hiring against the 8 FTE gap by day 60. If it does not, the 22 FTE gap and the 4.5-month ramp stand." },
			],
		},
	],
	findings: [
		{ label: "Dates that disagree", detail: "The roadmap's next step commits the $3.1m by day 60, while the charter milestone and roadmap checkpoint say day 100. This plan carries day 60 as the due date and day 100 as the check." },
		{ label: "Open scope at day 100", detail: "R-06 closes when billing extraction is complete by day 100, while the roadmap only starts extraction in days 46 to 100. Lauren Diaz settles which one governs." },
		{ label: "Date not in the sources", detail: "No document gives a signing date. Elena Park sets it, and every day-numbered due in the table counts from it." },
	],
	nextSteps: [
		{ action: "Clear the four pre-signing conditions in order of price impact", owner: "Elena Park · Deal Partner", due: "Pre-signing" },
		{ action: "Restate concentration on the reconciled ARR base for the committee pack", owner: "Marcus Reed · Target CFO", due: "Before IC · 25 Sep" },
		{ action: "Confirm whether a template can be ready for the A-02 test", owner: "Lauren Diaz · Technology Diligence Lead", due: "Day 30" },
	],
	citations: ["[VDR-118]", "[VDR-204]", "[LEDGER-24M]", "[PIPE-1824]", "[INT-MARCUS-02]", "[INT-NATE-05]", "[INT-LAUREN-01]", "Implementation roadmap", "Readiness v7"],
}

export const CATALOG: DeliverableBody = {
	heading: "Five use cases carry the first 100 days after close, and recurring-revenue reporting cannot run until the definition is agreed.",
	lede: "The requirements specification defines four post-close use cases, written from the operator's perspective because the people using them after day 100 will not have been in the diligence room. This catalog keeps those four and adds the charter's rule on reopening a diligence conclusion, because it is the path an operator will try first. Each entry gives its start and end conditions, its steps, and the exact rule at each step. A rule the sources leave undefined is marked open with the person who settles it.",
	metrics: [
		{ value: "14", label: "Conditions behind the catalog", note: "4 pre-signing, 7 by day 45" },
		{ value: "0.5 pts", label: "Recurring-share tolerance", note: "Against the ledger re-run" },
		{ value: "38%", label: "ARR in the top five accounts", note: "On the reconciled base" },
	],
	keyMessages: [
		{ label: "The ledger breaks ties", detail: "Where management representation and system of record disagree, the system of record governs. UC-02 applies that rule to every contract classification." },
		{ label: "Each rule can be failed", detail: "The rules below carry a number or a named state: 10% pipeline movement, 0.5 percentage points, five working days, blocked rather than pending." },
		{ label: "Authority sits with named owners", detail: "Nate Brooks decides capacity without escalation, Marcus Reed reports on the target ledger, and only Elena Park can reopen a diligence conclusion." },
	],
	sections: [
		{
			heading: "Catalog",
			paragraphs: [
				"Proposed means the use case sits in the recommended structure and has not been agreed. Unresolved means a rule inside it is still open. No entry is marked Current or Selected, because the committee has not yet chosen between proceed, reprice, and pause.",
			],
			exhibit: {
				kind: "table",
				title: "Four use cases come from the requirements, and revenue reporting is the one held open by the definition",
				caption: "Post-close use cases with their trigger, accountable actor, and current status.",
				source: "Requirements specification · Project charter · Target operating model",
				columns: ["ID", "Use case", "Trigger", "Accountable actor", "Status"],
				rows: [
					{ cells: ["UC-01", "Plan delivery capacity against pipeline", "Capacity plan is built, or qualified pipeline moves more than 10%", "Nate Brooks", "Proposed"] },
					{ cells: ["UC-02", "Report recurring revenue on the agreed definition", "Recurring share is due for reporting", "Marcus Reed", "Unresolved"], emphasis: true },
					{ cells: ["UC-03", "Onboard an enterprise customer", "Sales hands over an engagement to delivery", "Nate Brooks", "Proposed"] },
					{ cells: ["UC-04", "Escalate a concentration event", "A top-five account signals non-renewal", "Nate Brooks", "Proposed"] },
					{ cells: ["UC-05", "Reopen a diligence conclusion", "An operator disputes a finding, or a variance touches repricing", "Elena Park", "Proposed"] },
				],
			},
		},
		{
			heading: "UC-01: Plan delivery capacity against pipeline",
			paragraphs: [
				"Starts when the capacity plan is built, or when qualified pipeline moves more than 10%. Ends with a plan that reconciles to qualified pipeline and a reported variance.",
				"Inputs are the 1,824 pipeline records and delivery utilisation, now 87%, which the growth plan pushes to 118%. Output is the hiring and onboarding sequence.",
			],
			exhibit: {
				kind: "table",
				title: "The plan reconciles to qualified pipeline and must still hold if hiring alone does not close the gap",
				caption: "Steps from pipeline input to reported variance, with the 10% re-derivation rule.",
				source: "Requirements specification · Target operating model · As-Is / To-Be process analysis",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-01.1", "Nate Brooks", "Builds the plan from qualified pipeline", "Input: 1,824 pipeline records, not the forecast", "Plan built on forecast fails the day-45 checkpoint"] },
					{ cells: ["UC-01.2", "Nate Brooks", "Tests the plan against A-02", "Plan must hold if the tooling assumption is false", "Works only if hiring alone suffices: does not pass"] },
					{ cells: ["UC-01.3", "Nate Brooks", "Re-derives on pipeline movement", "Qualified pipeline moves over 10%: re-derive, report within one week", "Change to revenue phasing goes to the committee"] },
					{ cells: ["UC-01.4", "Nate Brooks", "Sets hiring and onboarding order", "Output: decided without escalation. Gap is 22 FTE, or 8 if the test holds", "Utilisation flat while headcount rises points to the tooling constraint"] },
				],
			},
		},
		{
			heading: "UC-02: Report recurring revenue on the agreed definition",
			paragraphs: [
				"Starts when recurring share is due for reporting. Ends when the reported share matches the ledger re-run within tolerance, or the variance has gone to the committee.",
				"Inputs are the agreed definition and the 24-month ledger. This is Unresolved because the definition is not yet agreed, and how the classification conflict is taken forward rests on the decision recorded in the RAID register.",
			],
			exhibit: {
				kind: "table",
				title: "Reported share must equal the ledger re-run within 0.5 points, and the definition itself is still open",
				caption: "Reporting steps, with the ledger as tie-breaker and the open rules named.",
				source: "Requirements specification · Implementation roadmap · RAID register",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-02.1", "Marcus Reed", "Applies the definition to contracts", "Open: definition wording. Elena Park settles it pre-signing (REQ-04)", "Until signed, reporting stays on the target ledger"], emphasis: true },
					{ cells: ["UC-02.2", "Marcus Reed", "Classifies an ambiguous contract", "Ledger classification is the tie-breaker", "Management representation alone cannot satisfy the condition"] },
					{ cells: ["UC-02.3", "Marcus Reed", "Reports recurring share", "Must equal the ledger re-run within 0.5 percentage points", "Variance touching repricing goes to the committee immediately"] },
					{ cells: ["UC-02.4", "Marcus Reed", "Compares at day 45", "Compare with the $41.5m diligence figure. Open: material threshold, Elena Park", "Differs materially: definition misapplied or reconciliation wrong"] },
				],
			},
		},
		{
			heading: "UC-03: Onboard an enterprise customer",
			paragraphs: [
				"Starts when sales hands over an engagement to delivery. Ends at go-live, with a target of 52 days and 214 consultant-hours against today's 84 days and 312 hours.",
				"Inputs are the structured handover record and the customer's data shape. The templated flow depends on a library that does not exist yet, so it stays Proposed until the A-02 test runs by day 45.",
			],
			exhibit: {
				kind: "table",
				title: "Design produces a configuration artifact, and a missing isolation proof blocks the opportunity outright",
				caption: "Target onboarding steps with their planned consultant-hours, which total 214.",
				source: "As-Is / To-Be process analysis · Requirements specification",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-03.1", "Sales", "Hands over in a structured CRM record", "Output: handover record, 15 hours", "Open: the record's required fields. Nate Brooks settles them"] },
					{ cells: ["UC-03.2", "Delivery lead", "Produces design as a configuration artifact", "Output: machine-readable artifact and validated data shape, 48 hours", "Data shape unworkable: resolved at design, with no return from migration"] },
					{ cells: ["UC-03.3", "Delivery lead", "Runs the security review", "Tenant isolation evidence must exist", "No evidence: opportunity flagged as blocked, never as pending"], emphasis: true },
					{ cells: ["UC-03.4", "Delivery lead", "Configures from template plus delta", "Output: customer-specific configuration only, 57 hours", "Open: path when no template fits. Nate Brooks settles it"] },
					{ cells: ["UC-03.5", "Delivery lead", "Migrates data, runs UAT, and goes live", "Output: migration 44 hours, UAT and go-live 50 hours", "Rework target is 0.6 loops per engagement, from 2.4 today"] },
				],
			},
		},
		{
			heading: "UC-04: Escalate a concentration event",
			paragraphs: [
				"Starts when a top-five account signals non-renewal. Ends when the committee has been notified and the funded concentration response is applied.",
				"The top five accounts hold 38% of reconciled ARR, so the rule runs outside the reporting cycle. The content of the response is modelled by day 30, so it is not stated here.",
			],
			exhibit: {
				kind: "table",
				title: "A top-five renewal risk reaches the committee within five working days, whatever the reporting cycle says",
				caption: "Escalation steps, with the contract constraint that applies through the first quarter.",
				source: "Requirements specification · Project charter · RAID register",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-04.1", "Nate Brooks", "Identifies the renewal risk", "Top-five account signals non-renewal", "Open: what counts as a signal. Nate Brooks settles it by day 30"] },
					{ cells: ["UC-04.2", "Nate Brooks", "Notifies the committee", "Within five working days, regardless of the reporting cycle", "Not waiting for the day-45 or day-100 checkpoint"] },
					{ cells: ["UC-04.3", "Nate Brooks", "Applies the concentration response", "Response modelled and funded by day 30 (R-04)", "No account team changes or platform migration commitments in quarter one"] },
					{ cells: ["UC-04.4", "Elena Park", "Holds the contract boundary", "No acquirer-initiated renegotiation before day 180", "Reconsidered at day 180 at the earliest, per the charter"] },
				],
			},
		},
		{
			heading: "UC-05: Reopen a diligence conclusion",
			paragraphs: [
				"Starts when an operator disputes a finding, or a variance touches the repricing assumptions. Ends when Elena Park records the outcome, or the committee has received the variance.",
				"Input is the disputed finding with its source document, ledger extract, or pipeline record. The integration steering group coordinates and takes no part in this decision.",
			],
			exhibit: {
				kind: "table",
				title: "Only the Deal Partner can reopen a conclusion, and repricing variances go straight to the committee",
				caption: "Steps for handling a dispute, with the charter's exception trigger applied.",
				source: "Project charter · Target operating model",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-05.1", "Operator", "Raises the dispute to Elena Park", "Conclusion traces to its document, ledger extract, or pipeline record", "Steering group cannot decide it; it is not a decision body"] },
					{ cells: ["UC-05.2", "Elena Park", "Tests for repricing impact", "Any variance touching the repricing assumptions goes to the committee", "Goes immediately, not at the next checkpoint"], emphasis: true },
					{ cells: ["UC-05.3", "Elena Park", "Decides a dispute with no repricing impact", "Only the Deal Partner can change a conclusion; committee is consulted", "Plan changes that touch no conclusion stay with Elena Park"] },
					{ cells: ["UC-05.4", "Elena Park", "Records the outcome", "Open: where the record is kept. Elena Park settles it by day 1", "Until then, the conclusion stands as written in the package"] },
				],
			},
		},
	],
	findings: [
		{ label: "Criterion that catches the gap", detail: "UC-02's 0.5 percentage point test against the ledger re-run. The classification gap persisted for three years because nobody had tested the representation against the ledger." },
		{ label: "Use case most likely to be tested", detail: "UC-05. Operators inheriting a business routinely renegotiate findings they were not present for, and the charter closes that path explicitly." },
		{ label: "Unresolved rule", detail: "The contractual definition of recurring revenue. Elena Park settles it pre-signing, and until it is signed, UC-02 reports on the target ledger." },
	],
	nextSteps: [
		{ action: "Settle the recurring-revenue definition with the ledger as tie-breaker", owner: "Elena Park · Deal Partner", due: "Pre-signing" },
		{ action: "Agree the exception trigger wording with the committee", owner: "Elena Park · Deal Partner", due: "Day 1" },
		{ action: "Define what counts as a non-renewal signal in the concentration response", owner: "Nate Brooks · COO", due: "Day 30" },
	],
	citations: ["[VDR-118]", "[VDR-204]", "[LEDGER-24M]", "[PIPE-1824]", "[INT-MARCUS-02]", "[INT-NATE-05]", "[INT-LAUREN-01]", "Implementation roadmap", "Readiness v7"],
}
