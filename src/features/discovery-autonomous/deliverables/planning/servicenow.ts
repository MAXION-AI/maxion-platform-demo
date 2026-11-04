import type { DeliverableBody } from "../types"

// Calder Industrial AP invoice exceptions: the project plan and the use case
// catalog. Both are derived from the roadmap, requirements, process analysis,
// operating model and RAID register in ../servicenow.ts. Values that package does
// not settle are written as "Open:" with the person who would settle them.

export const WBS: DeliverableBody = {
	heading: "Eleven work packages put the taxonomy before the pipeline and the pipeline before the dashboard, and only one of them, the production release, cannot be undone.",
	lede: "The plan breaks the roadmap's three milestones into packages with one named owner, a dependency and a check that ends them. MS-1 agrees the taxonomy and the treatment of the 318 no-contract exceptions in Week 1. MS-2 proves the triage in the sub-production instance against eleven checks in Weeks 2 and 3. The production release lands in a Wednesday window, then MS-3 publishes the dashboard under FIN-AP-7 and starts the daily operation. The tolerance rule the checks test follows the decision recorded in the RAID register.",
	metrics: [
		{ value: "4 weeks", label: "Roadmap sequence", note: "To be confirmed against the change calendar" },
		{ value: "11", label: "Checks before release", note: "All must pass on one version" },
		{ value: "2", label: "Decisions open at handoff", note: "Production approver, 318 no-contract cases" },
	],
	keyMessages: [
		{ label: "The taxonomy comes first because everything is tested against it", detail: "No case can clear until a class and a rule exist for it, and the eleven checks cannot be signed off before the classes and the no-contract treatment are agreed." },
		{ label: "One package carries the irreversible step", detail: "Everything before WBS-3.1 happens in the sub-production instance on a synthetic sample. The release is the one thing an owner approves that cannot be undone." },
		{ label: "Exit criteria are written so they can fail", detail: "They use the package's own figures: 1,904 cases inside 45 minutes, 318 cases treated, 84 rows attested. A package without that evidence has not finished, whatever the calendar says." },
	],
	sections: [
		{
			heading: "Work breakdown",
			paragraphs: [
				"Phases follow the roadmap: activation and MS-1 taxonomy, MS-2 pipeline, then the release and MS-3 dashboard. Agents do the build and run work; each package names the person who answers for it.",
				"Weeks are the roadmap's sequence, which Marcus Bell still has to confirm against the change calendar. Packages due at activation or at a milestone keep the wording their source documents use.",
			],
			exhibit: {
				kind: "table",
				title: "The release cannot run until both the production approver is named and all eleven checks pass on one version",
				caption: "Eleven work packages with one owner, their dependencies and the check that ends each one.",
				source: "Implementation roadmap · Requirements specification · Technical assessment · RAID register",
				columns: ["ID", "Work package", "Owner", "Depends on", "Due", "Exit criterion"],
				rows: [
					{ cells: ["WBS-1.1", "Seed sub-production and provision the contract register read user", "Marcus Bell", "None", "Before MS-1", "Synthetic 30-day sample seeded; SAP Ariba register readable, not writable"] },
					{ cells: ["WBS-1.2", "Name who approves a production change; confirm the window", "Marcus Bell", "None", "At activation", "Approver recorded; Wednesday 22:00 to 02:00 London confirmed with change board"], emphasis: true },
					{ cells: ["WBS-1.3", "Agree the exception taxonomy and closure codes with the analysts", "Priya Raman", "None", "Week 1", "All 7 causes have a class and code; 13,530 cases fall in 4 mechanical classes"] },
					{ cells: ["WBS-1.4", "Rule how the 318 no-contract exceptions are treated", "Inés Duarte", "WBS-1.3", "Week 1", "Treatment recorded for all 318 open cases, worth $1,204,772.18"], emphasis: true },
					{ cells: ["WBS-2.1", "Sign off the eleven derived checks", "Priya Raman", "WBS-1.3, WBS-1.4", "Week 2", "11 signed off; tolerance check follows the decision recorded in the RAID register"] },
					{ cells: ["WBS-2.2", "Build triage, tolerance testing and routing in sub-production", "Marcus Bell", "WBS-1.1, WBS-2.1", "Week 3", "Closure keyed per case and version; a retry posts no second comment"] },
					{ cells: ["WBS-2.3", "Run the eleven checks and the sweep bound", "Marcus Bell", "WBS-2.2", "End of Week 3", "11 of 11 pass on one version; 1,904 cases swept within 45 minutes"] },
					{ cells: ["WBS-3.1", "Release the versioned update set to production", "Marcus Bell", "WBS-1.2, WBS-2.3", "Wednesday window, Week 3 to 4", "State read back in production; an overrun holds and re-reads, never resubmits"], emphasis: true },
					{ cells: ["WBS-3.2", "Agree what finance sees and publish the dashboard", "Priya Raman", "WBS-3.1", "Week 4", "Under FIN-AP-7 by 08:00: what came in, cleared, is waiting and on whom"] },
					{ cells: ["WBS-3.3", "Start the daily operation; agree the sweep overrun path", "Marcus Bell", "WBS-3.1, WBS-3.2", "End of Week 4", "06:00, 06:45, 07:00, 08:00 steps run; path past 45 minutes agreed"] },
					{ cells: ["WBS-3.4", "Re-attest the delegation of authority matrix", "David Osei", "None", "Within two weeks of go-live", "All 84 rows attested against HR records; R-09 can route instead of flag"] },
				],
			},
		},
		{
			heading: "Sequence",
			paragraphs: [
				"The sequence matches the roadmap. The re-attestation is drawn from the production release, the point this plan reads as go-live. Open: David Osei confirms that reading, since the source says only \"within two weeks of go-live\".",
				"The release marker is an indicative position. Open: which Wednesday, which Marcus Bell confirms against the change calendar.",
			],
			exhibit: {
				kind: "timeline",
				title: "Each phase ends with something a person can verify, and the matrix is re-attested after routing is already live",
				caption: "Work packages by phase in roadmap weeks, with the production release at the MS-2 boundary.",
				source: "Implementation roadmap · Change calendar · RAID register",
				ticks: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
				lanes: [
					{ label: "1 Activation", bars: [{ label: "WBS-1.1, 1.2", start: 0, span: 0.5, tone: "muted" }] },
					{ label: "1 MS-1 Taxonomy", bars: [{ label: "WBS-1.3, 1.4", start: 0, span: 1, tone: "brand" }] },
					{ label: "2 MS-2 Pipeline", bars: [{ label: "WBS-2.1 to 2.3", start: 1, span: 2, tone: "brand" }] },
					{ label: "3 MS-3 Dashboard", bars: [{ label: "WBS-3.2", start: 3, span: 1, tone: "brand" }] },
					{ label: "3 Daily operation", bars: [{ label: "WBS-3.3", start: 4, span: 1, tone: "muted" }] },
					{ label: "3 Matrix re-attestation", bars: [{ label: "WBS-3.4", start: 3, span: 2, tone: "warn" }] },
				],
				markers: [{ label: "Production release", at: 3 }],
			},
		},
		{
			heading: "What the plan depends on",
			paragraphs: [
				"The dependencies are mostly about authority. The technical assessment found no new platform, licence or environment is required, so what holds the plan is who may decide, and whether three assumptions survive their test at the first milestone.",
			],
			bullets: [
				{ label: "The decision recorded in the RAID register", detail: "WBS-2.1 and WBS-2.2 test tolerance against the rule it names: contract ±1.5% flat or purchase order ±2% or $25. David Osei owns tolerance authority." },
				{ label: "What that decision changes", detail: "Under the contract rule, 240 invoices worth $84,310.55 become exceptions in the first month. Under the purchase-order rule they stay as accepted leakage." },
				{ label: "Production approver", detail: "Marcus Bell answers this at the engagement proposal in WBS-1.2. WBS-3.1 cannot run without it, while building and testing can continue." },
				{ label: "No-contract treatment", detail: "Inés Duarte's ruling in WBS-1.4 holds MS-2, because the eleven checks cannot be signed off without it." },
				{ label: "Stale matrix", detail: "Routing goes live before WBS-3.4 is due, so R-09 flags stale rows rather than routing to them. Approvals on those rows wait until David Osei re-attests." },
				{ label: "Three assumptions tested at MS-1", detail: "Contract register current (Inés Duarte), payment run accepts an agent-closed case unchanged (Priya Raman), sub-production mirrors production flows (Marcus Bell)." },
			],
		},
	],
	findings: [
		{ label: "The release has two independent preconditions", detail: "WBS-1.2 names who may approve it and WBS-2.3 proves the version. Neither substitutes for the other, and a passing version still waits for its approver." },
		{ label: "Two packages test what the decision recorded in the RAID register names", detail: "WBS-2.1 and WBS-2.2 build the tolerance rule in. The taxonomy, the sweep bound and the release mechanics are the same under either outcome." },
		{ label: "Routing goes live ahead of the matrix", detail: "R-09 cannot be fully met until the 84 rows are re-attested, which is due within two weeks of go-live. Until then it flags rows rather than route to them." },
	],
	nextSteps: [
		{ action: "Confirm the four-week sequence and the release Wednesday against the change calendar", owner: "Marcus Bell, ServiceNow Platform Owner", due: "At engagement activation" },
		{ action: "Rule how the 318 no-contract exceptions are treated", owner: "Inés Duarte, Procurement Contracts Manager", due: "At the first milestone" },
		{ action: "Sign off the eleven derived checks before the first pipeline version", owner: "Priya Raman, Head of Accounts Payable", due: "At the second milestone" },
	],
	citations: [
		"Implementation roadmap · Discovery workshop with Finance Operations and Enterprise Systems",
		"Requirements workshop · Finance Operations and Procurement",
		"Discovery register · Finance Operations, Procurement, Enterprise Systems",
		"Change calendar · Enterprise Systems · production window Wednesday 22:00 to 02:00 London",
		"Delegation of authority matrix · SharePoint Finance/Controls · [DOA-84]",
	],
}

export const CATALOG: DeliverableBody = {
	heading: "Six use cases cover every path an exception can take: one runs today, three are proposed, and two wait on a named person's answer about authority.",
	lede: "The catalog takes the current queue and the target operating model and writes each path as a start, an end, and steps with an exact rule. The rules are the package's own: four escalation triggers, $5,000, 06:00 and 07:00 London, a Wednesday window. Nothing here is marked Selected, because the charter still awaits David Osei's approval. The price tolerance a step applies follows the decision recorded in the RAID register, and where the source leaves a rule unsettled, the step says Open and names who settles it.",
	metrics: [
		{ value: "13,530", label: "Mechanical exceptions in twelve months", note: "61% of 22,180, covered by UC-02" },
		{ value: "$5,000", label: "Escalation threshold", note: "Never auto-cleared above it" },
		{ value: "318", label: "Open cases with no contract", note: "$1,204,772.18, Unresolved in UC-04" },
	],
	keyMessages: [
		{ label: "The split happens when the case arrives", detail: "UC-01 keeps every case in one queue until an analyst reaches it. UC-02 to UC-05 divide the queue at the 06:00 sweep, so each case starts on the right path with its evidence gathered." },
		{ label: "An agent closes cases and never pays them", detail: "The target use cases end at the ServiceNow case or the existing payment run. No step writes to SAP, and no agent releases or schedules a payment." },
		{ label: "The steps are written so an unknown stays visible", detail: "The written rules for quantity, freight and tax, approver response time and what a decline does are not in the package, so each is marked Open at the step it affects." },
	],
	sections: [
		{
			heading: "Catalog",
			paragraphs: [
				"Current means it runs today. Proposed means it is part of the target design and awaits charter approval. Unresolved means a named decision must be answered before it can finish.",
			],
			exhibit: {
				kind: "table",
				title: "The two Unresolved use cases both turn on who holds authority, not on what the numbers say",
				caption: "Six use cases by trigger, accountable actor and status.",
				source: "As-Is / To-Be process analysis · Requirements specification · RAID register",
				columns: ["ID", "Use case", "Trigger", "Accountable actor", "Status"],
				rows: [
					{ cells: ["UC-01", "Analyst works an exception by hand", "Three-way match fails in SAP", "Priya Raman", "Current"] },
					{ cells: ["UC-02", "Mechanical exception clears the same day", "06:00 London sweep finds a mechanical class", "Priya Raman", "Proposed"] },
					{ cells: ["UC-03", "Approval routed to a current authority", "Above $5,000 or outside the applicable tolerance", "David Osei", "Proposed"] },
					{ cells: ["UC-04", "Exception with no contract on file", "Register holds no active terms for the supplier", "Inés Duarte", "Unresolved"], emphasis: true },
					{ cells: ["UC-05", "Disputed or duplicate invoice", "Open supplier dispute or a duplicate", "Priya Raman", "Proposed"] },
					{ cells: ["UC-06", "Production release", "A version passes all eleven checks", "Marcus Bell", "Unresolved"], emphasis: true },
				],
			},
		},
		{
			heading: "UC-01: Analyst works an exception by hand",
			paragraphs: [
				"Starts when an invoice fails three-way match in SAP and raises a ServiceNow case, and ends when the invoice is paid in the next weekly run. Inputs are the invoice, the purchase order and the goods receipt. Outputs are a closed case and, where one was needed, an approval pasted in from email.",
				"This is the baseline: 22,180 cases in twelve months and a median 6.4 days, of which 19.8 minutes is work. Discounts of $412,880.40 were forfeited while cases waited.",
			],
			exhibit: {
				kind: "table",
				title: "A mechanical case waits twice for 19.8 minutes of work, and an approval leaves the system of record",
				caption: "Current process steps with the median wait each one adds.",
				source: "As-Is / To-Be process analysis · [FINOPS-EXC-12M] · [AP-RUN-12M]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-01.1", "SAP S/4HANA", "Raise a case when three-way match fails", "Case joins one queue ordered by age", "Waits a median 2.9 days for an analyst"] },
					{ cells: ["UC-01.2", "AP analyst", "Read the purchase order and invoice, apply the rule", "ServiceNow clears to ±2% or $25; 19.8 minutes of work", "Outside a rule: go to UC-01.4"] },
					{ cells: ["UC-01.3", "AP analyst", "Close the case", "Invoice waits for the weekly payment run", "Waits a median 3.5 days; the discount window can close"] },
					{ cells: ["UC-01.4", "AP analyst", "Email an approver chosen from the matrix", "Matrix read as if current; 84 rows, reviewed two years ago", "2,140 approvals went without current authority"] },
					{ cells: ["UC-01.5", "Named approver", "Reply by email, pasted back into the case", "Median 2.1 days for an answer", "Audit trail depends on an analyst pasting it"] },
				],
			},
		},
		{
			heading: "UC-02: Mechanical exception clears the same day",
			paragraphs: [
				"Starts when the 06:00 London sweep classes a case as price within a band (6,214 in twelve months), quantity or unit rounding (3,908), freight or surcharge coding (2,190) or tax jurisdiction default (1,218). Ends when the case is closed with evidence and the clean invoice is back with the payment run that day.",
				"Inputs are the open queue, the contract register and the purchase order. Outputs are a closed case with its rule, the register tested against, both values and the sources. The agent team writes nothing to SAP.",
			],
			exhibit: {
				kind: "table",
				title: "A case clears only when no trigger applies and a written rule covers it, and the rule used stays on the case",
				caption: "Target steps for a mechanical exception, from the sweep to the payment run.",
				source: "Requirements specification R-04, R-05, R-12, R-17 · Target operating model · Technical assessment",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-02.1", "Exception specialist", "Sweep the open queue and class each case", "Taxonomy class; full queue inside 45 minutes", "Cannot classify: hand to analysts with evidence"] },
					{ cells: ["UC-02.2", "Exception specialist", "Check the four escalation triggers", "Above $5,000, out of tolerance, no contract or dispute: no clear", "Go to UC-03, UC-04 or UC-05"] },
					{ cells: ["UC-02.3", "Exception specialist", "Test a price difference at 06:45", "±1.5% flat or ±2% or $25, per the decision recorded in the RAID register", "Outside the band: go to UC-03"], emphasis: true },
					{ cells: ["UC-02.4", "Exception specialist", "Test quantity, freight or tax classes", "Open: their written rules. Priya Raman settles at MS-1", "No written rule: the case stays with analysts"] },
					{ cells: ["UC-02.5", "Exception specialist", "Close the case with its evidence", "Open: only the routing duty holds case write. Marcus Bell settles", "Retry keyed per case and version; no second comment"] },
					{ cells: ["UC-02.6", "ServiceNow", "Return the clean invoice to the payment run", "Same day; the payment run itself is unchanged", "Acceptance is an assumption Priya Raman tests at MS-1"] },
				],
			},
		},
		{
			heading: "UC-03: Approval routed to a current authority",
			paragraphs: [
				"Starts at 07:00 London for a case above $5,000 or outside the applicable tolerance. Ends when an approver who currently holds the authority has answered in ServiceNow and the case is closed or returned. Inputs are the matrix, the leaver record and the case evidence. Output is an approval on the case.",
				"The sources differ on one point. The requirements route these cases to a named approver, while the operating model hands above-$5,000 cases to analysts first. Open: Priya Raman settles whether the analyst sees them first.",
			],
			exhibit: {
				kind: "table",
				title: "The approver is resolved at the moment of routing, so a leaver or someone below the threshold never receives the request",
				caption: "Target steps for an approval, with the points the source leaves to Priya Raman.",
				source: "Requirements specification R-09, R-12 · Target operating model · [DOA-84]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-03.1", "Routing specialist", "Resolve the approver at 07:00", "In the matrix, not a leaver, at or above the threshold", "No valid approver: flag the row and raise a question"], emphasis: true },
					{ cells: ["UC-03.2", "Routing specialist", "Attach evidence and route", "Purchase order, contract and comparison on the case", "Unresolved escalation goes to a charter owner"] },
					{ cells: ["UC-03.3", "Named approver", "Answer in ServiceNow, not email", "Approve or decline on the case", "Open: response limit. Priya Raman settles"] },
					{ cells: ["UC-03.4", "Routing specialist", "Record the outcome on the case", "Approved: closes with evidence; invoice goes to the run", "Open: what a decline does. Priya Raman settles"] },
				],
			},
		},
		{
			heading: "UC-04: Exception with no contract on file",
			paragraphs: [
				"Starts when the contract register holds no active terms for the supplier, as on 318 open cases worth $1,204,772.18, and ends when the case is treated under Inés Duarte's ruling. Inputs are the case, the register lookup and the purchase order. Output is a case with its fallback recorded.",
				"Over twelve months, missing or expired contracts raised 3,806 exceptions. They stay with analysts until she rules.",
			],
			exhibit: {
				kind: "table",
				title: "With no negotiated terms to test against, no tolerance rule applies until procurement rules on how these cases are treated",
				caption: "Steps for a case with no contract, which MS-1 must settle before MS-2 starts.",
				source: "RAID register · Requirements specification R-05 · [ARIBA-CTR-212]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-04.1", "Exception specialist", "Look the supplier up in the contract register", "No active terms: the case is never auto-cleared", "Register stale: assumption tested by Inés Duarte at MS-1"] },
					{ cells: ["UC-04.2", "Exception specialist", "Gather the evidence and record the purchase order", "R-05 fallback recorded on the case", "The case goes to analysts either way"] },
					{ cells: ["UC-04.3", "AP analyst", "Hold the case with its evidence", "Stays with analysts while the ruling is open", "Escalates to Inés Duarte, then the Controller"] },
					{ cells: ["UC-04.4", "Inés Duarte", "Rule how the 318 cases are treated", "Open: the treatment. Inés Duarte settles at the first milestone", "MS-2 cannot start until she rules"], emphasis: true },
				],
			},
		},
		{
			heading: "UC-05: Disputed or duplicate invoice",
			paragraphs: [
				"Starts when the sweep finds an open supplier dispute or a duplicate, 1,960 in twelve months, and ends when an analyst closes the case. Inputs are the case and the receipt or dispute record. Output is a case worked by a person. An open dispute is never auto-cleared, whatever its class.",
			],
			exhibit: {
				kind: "table",
				title: "Disputes stay with analysts by design, and what changes is that the evidence arrives before they do",
				caption: "Target steps for the judgement work the design leaves with people.",
				source: "Requirements specification · Target operating model · [FINOPS-EXC-12M]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-05.1", "Exception specialist", "Class the case as disputed or duplicate", "Open dispute is an escalation trigger: no auto-clear", "Unclear class: treated as cannot classify"] },
					{ cells: ["UC-05.2", "Exception specialist", "Gather the evidence and hand over", "Evidence attached before the analyst opens the case", "Analysts still receive the case"] },
					{ cells: ["UC-05.3", "AP analyst", "Work the case with the supplier or buyer", "Case closed with evidence, by a person", "Contract question goes to Inés Duarte"] },
				],
			},
		},
		{
			heading: "UC-06: Production release",
			paragraphs: [
				"Starts when a version has passed all eleven checks in the sub-production instance and ends when the update set's state has been read back in production. Inputs are the tested version, the approver's decision and the window. Outputs are a released update set and its record.",
				"This is the engagement's one irreversible step, and it is the one the owner approves explicitly.",
			],
			exhibit: {
				kind: "table",
				title: "The irreversible step waits for a named approver and a shared Wednesday window, and survives being cut short",
				caption: "Steps for the production release, including how an overrun is handled.",
				source: "RAID register · Technical assessment · Implementation roadmap · Change calendar",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-06.1", "Agent team", "Build and run the checks in sub-production", "11 of 11 pass on a synthetic sample", "A failing check sends the version back"] },
					{ cells: ["UC-06.2", "Named approver", "Approve the release", "Open: who may approve. Marcus Bell answers at the proposal", "No release until answered; escalates to the CIO"], emphasis: true },
					{ cells: ["UC-06.3", "Release coordinator", "Move the update set to production", "Wednesday 22:00 to 02:00 London only", "Overrun: hold and re-read the change state"] },
					{ cells: ["UC-06.4", "Release coordinator", "Read the production state back", "Update set confirmed fully applied", "Lost acknowledgement: reconcile, never resubmit"] },
				],
			},
		},
	],
	findings: [
		{ label: "Two use cases are Unresolved, and both are about authority", detail: "UC-04 needs Inés Duarte's ruling on the 318 cases and UC-06 needs Marcus Bell's answer on who approves a production change." },
		{ label: "The tolerance rule sits in one step", detail: "UC-02.3 tests against the rule the decision recorded in the RAID register names. The rule used goes on the case, so the rest of the path is the same under either outcome." },
		{ label: "The source documents leave four gaps in the steps", detail: "Rules for quantity, freight and tax (Priya Raman), which duty writes closure (Marcus Bell), and approver response time and decline handling (Priya Raman)." },
	],
	nextSteps: [
		{ action: "Write the quantity, freight and tax rules into the taxonomy", owner: "Priya Raman, Head of Accounts Payable", due: "At the first milestone" },
		{ action: "Settle which duty holds write access to close a case", owner: "Marcus Bell, ServiceNow Platform Owner", due: "At engagement activation" },
		{ action: "Rule how the 318 no-contract exceptions are treated", owner: "Inés Duarte, Procurement Contracts Manager", due: "At the first milestone" },
	],
	citations: [
		"Invoice exception queue · ServiceNow case timestamps, 22,180 cases · [FINOPS-EXC-12M]",
		"Requirements workshop · Finance Operations and Procurement",
		"Target operating model workshop · Finance Operations and Enterprise Systems",
		"Supplier contracts · SAP Ariba · negotiated tolerance terms · [ARIBA-CTR-212]",
		"Delegation of authority matrix · SharePoint Finance/Controls · [DOA-84]",
		"Discovery register · Finance Operations, Procurement, Enterprise Systems",
	],
}
