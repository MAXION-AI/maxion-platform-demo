import type { DeliverableBody } from "../types"

// Northstar revenue reconciliation: the project plan and the use case catalog.
// Both are derived from the roadmap, requirements, process analysis, operating
// model and RAID register in ../revenue.ts. Values that package does not settle
// are written as "Open:" with the person who would settle them.

export const WBS: DeliverableBody = {
	heading: "Twelve work packages take the billing ledger to a verified dashboard, and the pipeline's release under an agreed policy is the one everything downstream waits for.",
	lede: "The plan breaks the roadmap's three milestones into packages with one named owner, a dependency and a check that ends them. Activation starts with two answers from the revenue owner. Gate A needs her rule for the 212 invoices without a region, Gate B needs the first production load within $50 in every region, and Gate C needs ten verified mornings before FP&A retires its spreadsheet. The currency decision recorded in the RAID register reaches one package only, because the pipeline converts at posting-date rates under either outcome.",
	metrics: [
		{ value: "3", label: "Gates", note: "Mapping, first load, ten mornings" },
		{ value: "9", label: "Pipeline checks before release", note: "Bound to each version" },
		{ value: "2", label: "Decisions the build waits on", note: "D-02 release policy, D-03 region rule" },
	],
	keyMessages: [
		{ label: "The order follows what each package needs, not its size", detail: "The mapping needs the region rule, the pipeline needs the tested mapping, the release needs nine passing checks and the policy, and the daily cycle needs Gate B. Packages with no such link, such as the controller's Week 1 confirmations, run alongside." },
		{ label: "Every package ends on a check someone can read", detail: "Exit criteria use the package's own figures: 212 invoices following the rule, 612 non-USD invoices matching the ledger, 37 late credits on the right day. A late package is waiting for evidence and says which." },
		{ label: "Two open questions sit with Olivia Hart, and each holds only what is behind it", detail: "D-02 is answered before activation, so the release is never left waiting at the end. D-03 is asked when the mapping reaches the 212 invoices, and only the work behind it waits." },
	],
	sections: [
		{
			heading: "Work breakdown",
			paragraphs: [
				"Phases follow the roadmap's lanes: proposal and set-up, then MS-1 mapping, MS-2 pipeline, MS-3 dashboard and the daily cycle. Agents do the build and run work; each package names the person who answers for it.",
				"Days are the roadmap's indicative working days, read from its timeline. Each package ends on its exit criterion, so a day moves only if a check or a decision does.",
			],
			exhibit: {
				kind: "table",
				title: "Gate B is the critical path: the mapping, nine checks and the release policy must all be done before the first production load",
				caption: "Twelve work packages with one owner, their dependencies and the check that ends each one.",
				source: "Implementation roadmap · Requirements specification · RAID register · [LEDGER-30D]",
				columns: ["ID", "Work package", "Owner", "Depends on", "Due", "Exit criterion"],
				rows: [
					{ cells: ["WBS-1.1", "Answer Agentix's two questions and activate", "Olivia Hart", "None", "D1", "Release policy (D-02) and test data answers recorded before activation"] },
					{ cells: ["WBS-1.2", "Provision the test workspace and load the synthetic sample", "Sam Okafor", "WBS-1.1", "Week 1, by D2", "30-day synthetic sample loaded; workspace holds no production credentials"] },
					{ cells: ["WBS-1.3", "Confirm FIN-DASH-2 coverage and create the finance channel", "Tom Whitfield", "None", "Week 1", "FIN-DASH-2 confirmed for the new dashboard; channel can return a receipt"] },
					{ cells: ["WBS-2.1", "Map the 18 approved fields and confirm the gateway session", "Grace Chen", "WBS-1.2", "Milestone 1", "18 of 31 columns mapped; 2 requested fields absent; 0 write grants"] },
					{ cells: ["WBS-2.2", "Answer the rule for invoices without a region (D-03)", "Olivia Hart", "WBS-2.1", "Milestone 1", "Rule recorded with the count of 212 and their value in front of her"], emphasis: true },
					{ cells: ["WBS-2.3", "Test the mapping with the rule applied", "Sam Okafor", "WBS-2.2", "Gate A, D3 to D5", "Four mapping checks pass; all 212 sample invoices follow the rule"] },
					{ cells: ["WBS-3.1", "Build the load and run the nine checks on the sample", "Sam Okafor", "WBS-2.3", "D5 to D7", "9 of 9 pass; 612 non-USD invoices match; 37 late credits on the right day"] },
					{ cells: ["WBS-3.2", "Release migration 0007 and the job under the policy", "Sam Okafor", "WBS-1.1, WBS-3.1", "Gate B, D7 to D10", "First production load within $50 of the ledger in every region, read back"], emphasis: true },
					{ cells: ["WBS-4.1", "Build the dashboard on the tested version, publish after release", "Sam Okafor", "WBS-1.3, WBS-3.1, WBS-3.2", "D10", "Tiles match the reconciled totals; access check limits it to the finance group"] },
					{ cells: ["WBS-5.1", "Run the daily cycle from the morning after publishing", "Olivia Hart", "WBS-3.2, WBS-4.1", "Gate C, D20", "Ten consecutive mornings with load, totals, 07:00 refresh and receipt evidenced"] },
					{ cells: ["WBS-5.2", "Retire the FP&A spreadsheet", "FP&A lead", "WBS-5.1", "Gate C, D20", "FP&A stops its own copy; one copy of the daily number remains"] },
					{ cells: ["WBS-5.3", "Carry the currency decision recorded in the RAID register into the close", "Tom Whitfield", "None", "Next close", "$126.24 on 14 invoices treated as recorded there; I-02 updated at that close"] },
				],
			},
		},
		{
			heading: "Sequence",
			paragraphs: [
				"The sequence matches the roadmap. The dashboard starts once the pipeline has a tested version and publishes after the release, so WBS-4.1 overlaps WBS-3.2 and finishes after it.",
				"WBS-5.3 is not drawn. It falls at the next close, and the roadmap gives no date for that close. Open: Tom Whitfield supplies the date.",
			],
			exhibit: {
				kind: "timeline",
				title: "The release at Gate B sets the pace; the dashboard runs alongside it and the ten mornings cannot start before it",
				caption: "Work packages by phase in indicative working days, with the three gates marked.",
				source: "Implementation roadmap · Readiness v7 · [INT-SAM-03]",
				ticks: ["D1", "D2", "D3", "D5", "D7", "D10", "D15", "D20"],
				lanes: [
					{ label: "1 Proposal, set-up", bars: [{ label: "WBS-1.1, 1.2", start: 0, span: 1, tone: "muted" }] },
					{ label: "1 Controller, Week 1", bars: [{ label: "WBS-1.3", start: 0, span: 3, tone: "muted" }] },
					{ label: "2 MS-1 Mapping", bars: [{ label: "WBS-2.1 to 2.3", start: 1, span: 1.5, tone: "brand" }] },
					{ label: "3 MS-2 Pipeline", bars: [{ label: "WBS-3.1, 3.2", start: 2.5, span: 2, tone: "brand" }] },
					{ label: "4 MS-3 Dashboard", bars: [{ label: "WBS-4.1", start: 3.5, span: 1.5, tone: "brand" }] },
					{ label: "5 Daily cycle", bars: [{ label: "WBS-5.1, 5.2", start: 5, span: 2, tone: "muted" }] },
				],
				markers: [
					{ label: "Gate A", at: 2.5 },
					{ label: "Gate B", at: 4.5 },
					{ label: "Gate C", at: 7 },
				],
			},
		},
		{
			heading: "What the plan depends on",
			paragraphs: [
				"Most dependencies are answers from named people rather than technical work, because the gateway, the ingestion account and the revenue schema already exist. Only one package waits on the decision recorded in the RAID register.",
			],
			bullets: [
				{ label: "Release policy, D-02", detail: "Olivia Hart chooses approval before each release or the standing Saturday 02:00 window. WBS-1.1 records it and WBS-3.2 cannot run without it." },
				{ label: "Missing-region rule, D-03", detail: "WBS-2.3 and everything after it wait for this answer, because the pipeline is not built on an untested mapping. Other work continues meanwhile." },
				{ label: "The decision recorded in the RAID register", detail: "Only WBS-5.3 waits on it. The pipeline converts at posting-date rates under either outcome, so WBS-3.1 and the 612-invoice check do not change." },
				{ label: "Tolerance in writing", detail: "Olivia Hart confirms $50 and $200 before handoff. Open: what a regional difference between $50 and $200 does, including to the ten-morning count. She settles it." },
				{ label: "Sample coverage, A-01", detail: "The 30-day sample has not seen a quarter-end. Tom Whitfield reviews it at the first quarter-end, which comes after this plan and does not hold Gate C." },
				{ label: "Web-channel fix, I-01", detail: "Grace Chen schedules it by Week 3 as separate billing systems work. Until it lands, the pipeline applies the owner's rule rather than inventing a region." },
			],
		},
	],
	findings: [
		{ label: "Critical path", detail: "WBS-2.2 through WBS-3.2, ending at the pipeline's release. It rests on two answers from one person: the region rule and the release policy WBS-1.1 records." },
		{ label: "One package waits on the decision recorded in the RAID register", detail: "WBS-5.3 alone. Treating the close workbooks is a close activity, so the first production load and the ten mornings are not held by it." },
		{ label: "Gate C has one undefined case", detail: "A morning counts only with regional totals within $50, and only variances above $200 reach the owner. Open: the band between them. Olivia Hart settles it." },
	],
	nextSteps: [
		{ action: "Send the package to Agentix and answer its two questions", owner: "Olivia Hart · Revenue Operations Director", due: "Day 1" },
		{ action: "Settle what a difference between $50 and $200 does when confirming the tolerance", owner: "Olivia Hart · Revenue Operations Director", due: "Before handoff" },
		{ action: "Supply the next close date so WBS-5.3 can be placed on the plan", owner: "Tom Whitfield · Financial Controller", due: "Week 1" },
	],
	citations: ["Implementation roadmap", "Requirements specification", "RAID register", "[INT-OLIVIA-01]", "[INT-SAM-03]", "[LEDGER-30D]", "[DP-064]", "Readiness v7"],
}

export const CATALOG: DeliverableBody = {
	heading: "Six use cases describe daily revenue from the ledger to the owner's desk: one runs today, three are proposed, and two cannot finish until Olivia Hart answers D-02 and D-03.",
	lede: "The catalog takes the current month-end process and the Option B target process and writes each as a start, an end, and steps with an exact rule. The rules are the package's own: $50 per region, $200 to the revenue owner, posting-date rates, 05:30, 06:00 and 07:00 London. Nothing here is marked Selected, because Option B and the charter still await Olivia Hart's approval. Where the source leaves a rule unsettled, the step says Open and names who settles it.",
	metrics: [
		{ value: "$50 · $200", label: "Tolerance and escalation", note: "Per region, per day" },
		{ value: "05:30 to 07:00", label: "Target daily window", note: "London time, load to verified dashboard" },
		{ value: "212", label: "Sample invoices with no region", note: "Unresolved until D-03 is answered" },
	],
	keyMessages: [
		{ label: "The current use case explains the target ones", detail: "UC-01 copies the number by hand and finds a difference 19 days later. UC-02 and UC-03 replace those copies with one read of the ledger and a comparison every morning." },
		{ label: "In the target process, people decide where a number changes", detail: "UC-04 to UC-06 are where Olivia Hart decides. In UC-02 and UC-03 agents work under stated rules and prove each step with a read-back, a timestamp or a receipt." },
		{ label: "The steps are written so an unknown stays visible", detail: "The band between $50 and $200, the owner's response time and the value of the 212 invoices are not in the package, so each is marked Open at the step it affects." },
	],
	sections: [
		{
			heading: "Catalog",
			paragraphs: [
				"Current means it runs today. Proposed means it is part of Option B, recommended and awaiting approval. Unresolved means a named decision must be answered before it can finish.",
			],
			exhibit: {
				kind: "table",
				title: "Only two use cases cannot finish today, and both wait on one person's answer rather than on technical work",
				caption: "Six use cases by trigger, accountable actor and status.",
				source: "As-Is / To-Be process analysis · Requirements specification · RAID register",
				columns: ["ID", "Use case", "Trigger", "Accountable actor", "Status"],
				rows: [
					{ cells: ["UC-01", "Month-end close reconciliation", "Saved queries each morning, reconciled at month-end", "Tom Whitfield", "Current"] },
					{ cells: ["UC-02", "Daily ledger load", "05:30 London", "Revenue coordinator (agent)", "Proposed"] },
					{ cells: ["UC-03", "Morning reconciliation and dashboard", "06:00 London, after the load", "Revenue coordinator (agent)", "Proposed"] },
					{ cells: ["UC-04", "Variance decision above $200", "A variance above $200", "Olivia Hart", "Proposed"] },
					{ cells: ["UC-05", "Invoices without a region", "Blank RegionCode in the mapping", "Olivia Hart", "Unresolved"], emphasis: true },
					{ cells: ["UC-06", "Production release", "A version with nine checks passed", "Olivia Hart", "Unresolved"], emphasis: true },
				],
			},
		},
		{
			heading: "UC-01: Month-end close reconciliation",
			paragraphs: [
				"Starts each morning when an analyst runs the saved queries, and ends after close when a monthly summary reaches the AWS revenue schema. Inputs are ledger totals and exchange rates. Outputs are the close workbook, FINOPS variance log entries and the monthly upload.",
				"This is the baseline: 418 variances in twelve months, 19 days to find a typical one and 31 hours a close. It stays in place until the target use cases pass their gates.",
			],
			exhibit: {
				kind: "table",
				title: "Today the daily number is copied by hand and tested against the ledger once a month",
				caption: "Current process steps with the variance each one lets in.",
				source: "As-Is / To-Be process analysis · [CLOSE-36] · [FINOPS-418]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-01.1", "Finance analyst", "Run saved queries, paste regional totals into the workbook", "Regional totals in that month's close workbook", "Keying errors stay until close: 46 in the log"] },
					{ cells: ["UC-01.2", "Finance analyst", "Convert non-USD invoices", "Invoice-date rate; 14 of 612 differ from the ledger by $126.24", "Treated as in the decision recorded in the RAID register"] },
					{ cells: ["UC-01.3", "FP&A analyst", "Take a separate copy for daily planning", "Parallel spreadsheet, not reconciled to the ledger", "Differences surface only when someone compares them"] },
					{ cells: ["UC-01.4", "Finance analyst", "Reconcile workbooks to the ledger at month-end", "Each difference logged in the variance log", "Found a median 19 days after it happened"] },
					{ cells: ["UC-01.5", "Tom Whitfield", "Sign off the close; monthly summary is uploaded by CSV", "Dashboards read the summary, up to 31 days old", "Nothing newer reaches the dashboards until the next close"] },
				],
			},
		},
		{
			heading: "UC-02: Daily ledger load",
			paragraphs: [
				"Starts at 05:30 London and ends when yesterday's rows are in revenue.daily_invoices and revenue.region_totals and have been read back. Inputs are four ledger tables through the existing gateway. Outputs are the two new tables, holding only the 18 approved fields.",
			],
			exhibit: {
				kind: "table",
				title: "The load applies three written rules in one tested job and never writes to the ledger",
				caption: "Target steps for the 05:30 load, with the failure each step is built to survive.",
				source: "Requirements specification REQ-01, REQ-03 to REQ-07, REQ-09 · [LEDGER-30D]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-02.1", "Data specialist", "Read yesterday's rows through the gateway", "0 write grants; only 18 of 31 columns mapped", "Gateway outage delays the load; it never guesses"] },
					{ cells: ["UC-02.2", "Data specialist", "Convert non-USD amounts", "Posting-date rate from dbo.FxRates", "An invoice-date join fails the check on 14 invoices"] },
					{ cells: ["UC-02.3", "Data specialist", "Assign each invoice a region", "Open: blank codes follow D-03. Olivia Hart settles", "Stops at Gate A until answered; see UC-05"] },
					{ cells: ["UC-02.4", "Data specialist", "Move late credit notes to their original day", "Matched on OriginalInvoiceId; 37 in the sample", "Credit notes before 2024 are out of scope"] },
					{ cells: ["UC-02.5", "Data specialist", "Load the two new tables", "Finishes within 20 minutes; measured 6 min 12 s", "Read back before any retry; a replay adds no duplicates"] },
				],
			},
		},
		{
			heading: "UC-03: Morning reconciliation and dashboard",
			paragraphs: [
				"Starts at 06:00 London after the load and ends when the daily summary has its channel receipt. Inputs are the loaded schema and the ledger. Outputs are regional comparisons, the refreshed dashboard and the summary.",
				"A morning counts as verified only when the load, the regional totals, the refresh time and the receipt all have evidence.",
			],
			exhibit: {
				kind: "table",
				title: "Differences reach a person the next morning instead of 19 days later, with one band still to be settled",
				caption: "Target steps from the 06:00 comparison to the channel receipt.",
				source: "Requirements specification REQ-02, REQ-08, REQ-12 to REQ-14 · Target operating model",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-03.1", "Reconciliation analyst", "Compare schema to ledger by region", "Every region within $50 of the ledger", "Any wider difference goes to UC-03.2"] },
					{ cells: ["UC-03.2", "Reconciliation analyst", "Sort any regional difference", "Above $200: UC-04. $50 or less: passes", "Open: $50 to $200 handling. Olivia Hart settles"], emphasis: true },
					{ cells: ["UC-03.3", "Dashboard specialist", "Refresh the dashboard for the finance group", "By 07:00; tiles match the reconciled totals", "Access check fails: nothing is published"] },
					{ cells: ["UC-03.4", "Revenue coordinator", "Post the daily summary to the finance channel", "States verification and anything waiting on a person", "Missing receipt: resend for the receipt alone"] },
				],
			},
		},
		{
			heading: "UC-04: Variance decision above $200",
			paragraphs: [
				"Starts when the morning comparison finds a variance above $200 and ends when Olivia Hart's decision is recorded and applied. Inputs are the invoice, the ledger row and the comparison. Output is a decision record for that variance.",
				"The rest of the morning does not stop, and only that case waits.",
			],
			exhibit: {
				kind: "table",
				title: "A variance above $200 waits for one person with its evidence attached, and nothing else waits with it",
				caption: "Target steps for an owner decision, including what is not yet agreed about her availability.",
				source: "Requirements specification REQ-09, REQ-12 · Target operating model · Business case",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-04.1", "Reconciliation analyst", "Prepare the evidence", "Invoice, ledger row and comparison attached", "The owner sees one question, not a queue of alerts"] },
					{ cells: ["UC-04.2", "Revenue coordinator", "Route the case to the revenue owner in Agentix", "Only variances above $200", "The rest of the cycle completes regardless"] },
					{ cells: ["UC-04.3", "Olivia Hart", "Approve or decline", "Open: response time, assumed a working day. She agrees it", "Open: deputy during absence. She names one in Week 1"], emphasis: true },
					{ cells: ["UC-04.4", "Revenue coordinator", "Apply the decision and prove it with a check", "Decision record kept; the ledger is never written", "Read the target back before any retry"] },
				],
			},
		},
		{
			heading: "UC-05: Invoices without a region",
			paragraphs: [
				"Starts when the mapping milestone reaches an invoice with a blank RegionCode and ends at Gate A, when the owner's rule has been applied to all 212 sample invoices. Input is the profiled sample of 4,812 invoices. Outputs are D-03 answered and the rule held in the mapping.",
				"The package gives the count but not the value of these invoices, which the question to the owner must include.",
			],
			exhibit: {
				kind: "table",
				title: "No rule exists for 4.4% of the sample, and the pipeline will not choose one on the owner's behalf",
				caption: "Steps for the D-03 question, which closes at Gate A.",
				source: "RAID register D-03, I-01 · Requirements specification REQ-04 · [LEDGER-30D]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-05.1", "Data specialist", "Profile the sample for blank region codes", "212 of 4,812, most from the legacy web channel", "Open: their value. The mapping milestone reports it"] },
					{ cells: ["UC-05.2", "Data specialist", "Ask the revenue owner with count and value", "One question with the evidence", "The build waits; nothing else does"] },
					{ cells: ["UC-05.3", "Olivia Hart", "Decide the rule (D-03)", "Open: the rule itself. Olivia Hart settles at Milestone 1", "No default region is filled in while it is open"], emphasis: true },
					{ cells: ["UC-05.4", "Data specialist", "Apply the rule and run the mapping checks", "Four checks pass; 212 invoices follow the rule", "Gate A stays closed; the pipeline is not built"] },
					{ cells: ["UC-05.5", "Grace Chen", "Schedule the web-channel fix", "Scheduled by Week 3, as separate work", "New blank codes keep following the owner's rule"] },
				],
			},
		},
		{
			heading: "UC-06: Production release",
			paragraphs: [
				"Starts when a version has passed all nine checks on the synthetic sample and ends when its first production load has been read back. Inputs are the tested version and the release policy. Outputs are migration 0007 applied, the nightly job registered and a release record.",
				"Dashboard publishing falls under FIN-DASH-2, which Tom Whitfield is confirming covers the new dashboard, so this use case concerns pipeline releases.",
			],
			exhibit: {
				kind: "table",
				title: "Nothing reaches production until its checks pass and Olivia Hart has set how releases are authorized",
				caption: "Steps for a pipeline release, including the limit stated in every release.",
				source: "RAID register D-02, R-02, R-05 · Requirements specification REQ-10, REQ-11 · Implementation roadmap",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-06.1", "Data specialist", "Build the change and run nine checks on the sample", "All nine pass, with results bound to the version", "A version with a failed check cannot be proposed"] },
					{ cells: ["UC-06.2", "Sam Okafor", "Review migration 0007 before its first release", "Reviewed at Milestone 2", "A change goes back through the same nine checks"] },
					{ cells: ["UC-06.3", "Revenue coordinator", "Apply the release policy", "Open: approval each time or Saturday 02:00. Olivia Hart sets", "No release until D-02 is answered"], emphasis: true },
					{ cells: ["UC-06.4", "Revenue coordinator", "Apply migration 0007 and register the job", "Two new tables; nothing that exists is altered", "Drop the tables and disable the job"] },
					{ cells: ["UC-06.5", "Revenue coordinator", "Read the first production load back", "Within $50 of the ledger in every region: Gate B", "Cycle does not start; reload. Seen figures cannot be recalled"] },
				],
			},
		},
	],
	findings: [
		{ label: "Two use cases are Unresolved, and both close with one answer", detail: "UC-05 needs D-03 and UC-06 needs D-02. Both are Olivia Hart's, and both are asked before the work that depends on them." },
		{ label: "The currency rule is stable in the target process", detail: "UC-02 converts at posting-date rates under either outcome. Only UC-01's workbook convention follows the decision recorded in the RAID register." },
		{ label: "Three values are still missing from the source", detail: "The $50 to $200 band and the owner's response time are Olivia Hart's to set. The value of the 212 invoices comes from the mapping milestone." },
	],
	nextSteps: [
		{ action: "Answer D-03 when the mapping milestone asks, with count and value", owner: "Olivia Hart · Revenue Operations Director", due: "Milestone 1" },
		{ action: "Agree the response time for variances above $200 and name a deputy", owner: "Olivia Hart · Revenue Operations Director", due: "Week 1" },
		{ action: "Validate UC-01 with the regional analysts", owner: "Tom Whitfield · Financial Controller", due: "Week 1" },
	],
	citations: ["As-Is / To-Be process analysis", "Requirements specification", "RAID register", "[CLOSE-36]", "[FINOPS-418]", "[LEDGER-30D]", "[INT-OLIVIA-01]", "[INT-GRACE-02]", "Readiness v7"],
}
