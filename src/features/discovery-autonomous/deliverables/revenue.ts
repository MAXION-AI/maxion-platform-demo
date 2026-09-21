import type { DeliverableBody, DeliverableRevision } from "./types"

// Revenue reconciliation: SQL Server to AWS · Northstar finance leadership
// Evidence base: a 30-day billing ledger sample (4,812 invoices), 36 month-end
// close workbooks, 418 logged variances and 64 data platform runbook pages.
// The figures are the ones the Agentix revenue engagement later builds and
// tests against (engine/scenarios.ts REVENUE_FIGURES and pkg_revenue_v2), so a
// number quoted here is the number an agent checks there. All data is synthetic.

const EXECUTIVE_BRIEF: DeliverableBody = {
	heading: "Revenue can reconcile itself before finance arrives, if the ledger stays the one source of truth and a person keeps every decision that changes a number.",
	lede: "Finance reconciles revenue once a month, by hand, and finds a typical difference nineteen days after it happens. The AWS revenue schema receives a monthly summary uploaded after close, so the dashboards finance opens can be a month old and FP&A keeps its own spreadsheet instead. The Discovery traced 418 variances in twelve months to four causes, three of them rules a pipeline can apply. The recommendation is a daily pipeline from the SQL Server billing ledger into the AWS revenue schema, reconciled at 06:00 London within $50 per region and run by an agent team that builds and tests in isolation and releases only under an agreed policy.",
	metrics: [
		{ value: "418", label: "Variances logged in twelve months", note: "89% from rules a pipeline can apply" },
		{ value: "19 days", label: "Median time to find a variance", note: "Found at month-end, not on the day" },
		{ value: "8 of 12", label: "Closes that slipped", note: "Average 1.9 days late" },
		{ value: "31 hours", label: "Manual reconciliation per close", note: "Three analysts · 372 hours a year" },
	],
	keyMessages: [
		{ label: "The differences are mechanical, so a pipeline can remove them", detail: "Currency converted on the wrong date, invoices without a region and credit notes posted after their invoice account for 372 of the 418 variances. Each is a rule, and a rule can be applied the same way every morning. The other 46 are keying errors, and a daily feed removes the keying." },
		{ label: "The ledger has to stay the only source of truth", detail: "The close workbooks convert currency at invoice-date rates while the ledger posts at posting-date rates, so two honest conventions produce two numbers. The design treats the SQL Server billing ledger as the system of record. Everything downstream reconciles to it, never the reverse." },
		{ label: "Agents build and run it; people keep the decisions that move money", detail: "The data specialist builds and tests in an isolated AWS workspace with synthetic data. Nothing reaches the production revenue schema without an agreed release policy, and every variance above $200 goes to the revenue owner. Region rules and source fields are business decisions, so the agents ask rather than assume." },
	],
	sections: [
		{
			heading: "Situation",
			paragraphs: [
				"Northstar bills from an on-prem SQL Server ledger, which is the system of record for every invoice, credit note and exchange rate. Finance reports revenue from month-end close workbooks, one per region, filled each morning from saved queries and reconciled to the ledger at close.",
				"The AWS data platform already has an ingestion account and a PostgreSQL revenue schema, but the schema holds only a monthly summary that an analyst uploads after close. The finance dashboards read that summary. FP&A, which needs a daily number, keeps a spreadsheet of its own.",
				"The variance log shows what that costs. In twelve months finance logged 418 differences between the workbooks and the ledger, found a median of nineteen days after the transaction. Eight of the last twelve closes slipped, by 1.9 days on average, while analysts traced them.",
			],
			exhibit: {
				kind: "bar",
				title: "Three rules explain 89% of the variances finance chases by hand",
				caption: "Variances in the FINOPS log by root cause over twelve months, 418 in total. Keying is the only cause a rule cannot remove, and a daily feed removes the keying.",
				source: "Revenue variance log · Jira FINOPS · [FINOPS-418]",
				unit: "variances",
				data: [
					{ label: "Currency on the wrong date", value: 163, note: "Invoice vs posting-date rates", emphasis: true },
					{ label: "Invoice without a region", value: 121, note: "RegionCode empty in the ledger", emphasis: true },
					{ label: "Credit note posted late", value: 88, note: "Adjusts a day already closed", emphasis: true },
					{ label: "Manual keying", value: 46, note: "Totals pasted into workbooks" },
				],
			},
		},
		{
			heading: "Complication",
			paragraphs: [
				"The obvious fix is a better workbook, and it would catch the keying errors sooner. It would not change when the other 372 variances are found, because the workbook is filled from the same queries and reconciled at the same month-end.",
				"The deeper problem is that the daily number exists in four places: the ledger, the regional workbooks, the monthly summary in AWS and the FP&A spreadsheet. Each is copied from the one before it, and each copy applies the currency and region rules slightly differently.",
				"The currency difference is the clearest example. The ledger posts non-USD invoices at the exchange rate on their posting date; the workbooks convert them at the rate on their invoice date. In the 30-day sample, 14 of 612 non-USD invoices posted on a later day than they were dated, and the two conventions disagree on them by $126.24.",
			],
			bullets: [
				{ label: "Four copies of one number", detail: "Ledger, regional workbooks, monthly AWS summary and the FP&A spreadsheet, each copied by hand from the one before." },
				{ label: "Differences found at close, not on the day", detail: "Median nineteen days after the transaction. Eight of twelve closes slipped while analysts traced them." },
				{ label: "Two currency conventions", detail: "The ledger converts at posting-date rates and the workbooks at invoice-date rates. Both are internally consistent; only one can be the standard." },
			],
		},
		{
			heading: "Recommendation",
			paragraphs: [
				"Load yesterday's ledger rows into the AWS revenue schema at 05:30 London every day, reconcile the schema to the ledger by region at 06:00 within a $50 tolerance, and refresh a verified finance dashboard by 07:00. The ledger stays read only; the schema gains two new tables and nothing existing changes.",
				"Run it as an engagement in Agentix. A coordinator agent owns the outcome, the releases and the decisions routed to people. A reconciliation analyst compares the numbers and prepares exception evidence, a data specialist builds and tests the mapping and pipeline in an isolated workspace, and a dashboard specialist builds and validates the dashboard. No agent can change production on its own.",
				"Delivery is three milestones: the source-to-target mapping, the ingestion and transformation pipeline, and the dashboard. Each is tested against the checks this package defines before anything is released, and the daily cycle starts only once the first production load matches the ledger.",
			],
			exhibit: {
				kind: "table",
				title: "Only a daily pipeline that someone operates removes the monthly lag; a better workbook finds the same variances faster",
				caption: "Three options assessed against the twelve-month variance log. Effort is Northstar's own time after the option is live.",
				source: "Options assessment · [FINOPS-418] · [CLOSE-36] · [DP-064]",
				columns: ["Option", "Variances removed", "Found", "Ongoing effort", "Verdict"],
				rows: [
					{ cells: ["A · Improve the close workbooks", "46 keying errors", "At month-end", "31 hours a close", "Rejected · treats the symptom"] },
					{ cells: ["B · Daily pipeline run by an agent team", "All four causes", "Next morning", "Owner decisions only", "Recommended"], emphasis: true },
					{ cells: ["C · Conventional ETL project", "All four causes", "Next morning, after six months", "Someone must run it daily", "Not preferred · slower and unowned"] },
				],
			},
		},
		{
			heading: "What the decision costs",
			paragraphs: [
				"Three things are asked of Northstar. Read-only access to the ledger through the existing gateway, an isolated AWS test workspace with the synthetic 30-day sample, and an answer to one question Discovery could not settle: who authorizes a pipeline change that reaches the production revenue schema.",
				"The currency conventions stay as they are in the close workbooks for now. The pipeline converts at posting-date rates to match the ledger, and the $126.24 difference on the sample's 14 invoices is carried as a known reconciling item until finance decides to restate.",
				"One cost cannot be engineered away. Once a loaded row has been read by a downstream report, a later fix corrects the row but not what someone already saw. Every release states that limit before it is approved.",
			],
		},
		{
			heading: "What this package does not claim",
			paragraphs: [
				"The figures come from a 30-day sample, not a full year. Quarter-end volumes and a year-end close have not been observed, and the RAID register carries that as an assumption to prove at the first quarter-end.",
				"212 of the 4,812 sample invoices, 4.4%, have no region code. Discovery did not choose how they should appear, because that is a business rule: the data specialist will ask the revenue owner, with the exact count, while building the mapping. Credit notes before 2024 lack reliable region and exchange-rate data and are out of scope.",
			],
		},
	],
	findings: [
		{ label: "Recommended decision", detail: "A daily pipeline from the SQL Server billing ledger to the AWS revenue schema, reconciled at 06:00 London within $50 per region and operated by an agent team in Agentix." },
		{ label: "Currency standard", detail: "The pipeline converts at posting-date rates to match the ledger. The close workbooks keep invoice-date rates for now, and the $126.24 sample difference is a known reconciling item." },
		{ label: "What leadership is actually deciding", detail: "Not whether to build a pipeline, but who owns the daily number: the ledger is the source, the agent team runs it, and the revenue owner decides every variance above $200." },
	],
	nextSteps: [
		{ action: "Confirm the billing ledger as the system of record for daily revenue", owner: "Tom Whitfield · Financial Controller", due: "Finance leadership review" },
		{ action: "Answer the release authority question in the Agentix proposal", owner: "Olivia Hart · Revenue Operations Director", due: "Before activation" },
		{ action: "Grant read-only ledger access through the existing gateway", owner: "Grace Chen · Billing Systems Manager", due: "Week 1" },
		{ action: "Provide the isolated AWS test workspace and synthetic sample", owner: "Sam Okafor · Data Platform Lead", due: "Week 1" },
	],
	citations: ["[FINOPS-418]", "[LEDGER-30D]", "[CLOSE-36]", "[INT-OLIVIA-01]", "Readiness v7"],
}

const BUSINESS_CASE: DeliverableBody = {
	heading: "A four-month payback on hours alone, but the case is a revenue number finance can act on the morning after, not the hours.",
	lede: "The quantified benefits are real and modest: $145k a year against about $38k of Northstar time, most of it access, review and three decisions. Presented alone that is a sensible efficiency project. The reason to act now is that finance currently learns about a revenue difference nineteen days after it happens, and a reconciled 07:00 dashboard changes what FP&A can do with the number the same day.",
	metrics: [
		{ value: "$145k", label: "Annual benefit", note: "From the first full month of operation" },
		{ value: "$38k", label: "One-off Northstar effort", note: "About 50 working days across four people" },
		{ value: "4 months", label: "Payback", note: "Option C needs six months just to build" },
		{ value: "19 → 1", label: "Days to find a variance", note: "The next morning instead of at close" },
	],
	keyMessages: [
		{ label: "The quantified case is strong and small", detail: "Hours recovered in the close, the FP&A spreadsheet retired and fewer variances investigated add up to $145k a year. Against $38k of Northstar effort that pays back in about four months. It is not a transformation budget; it is a few weeks of attention from four people." },
		{ label: "The larger return is a number finance can use the same day", detail: "FP&A plans on revenue it cannot see until close. A dashboard whose tiles match the reconciled ledger at 07:00 turns a monthly reconstruction into a daily fact, and that is the benefit leadership should weigh." },
		{ label: "A conventional build gets the same pipeline later and leaves it unowned", detail: "Option C designs the same pipeline and spends $412k building it over six months. After that someone still has to run it every morning, investigate the exceptions and approve every change." },
	],
	sections: [
		{
			heading: "Objectives and success measures",
			paragraphs: [
				"Three outcomes, each with a baseline from the variance log and the close workbooks. The primary measure is agreement between the ledger and the revenue schema, because a fast dashboard that disagrees with the ledger would only move the reconciliation from month-end to every morning.",
				"The second and third measures are what finance will notice: a dashboard it can open at 07:00 without asking for a manual check, and variances that arrive the next morning with their evidence instead of at close.",
			],
			bullets: [
				{ label: "Ledger and AWS agree every morning", detail: "Within $50 per region by 06:30 London. Baseline: reconciled monthly, by hand. Primary measure." },
				{ label: "Verified dashboard by 07:00", detail: "Tiles match the reconciled totals and show their load time. Baseline: a monthly summary up to 31 days old." },
				{ label: "Variances found the next morning", detail: "Median days to find a variance falls from 19 to 1, and every variance above $200 reaches the revenue owner with evidence." },
			],
		},
		{
			heading: "Options appraisal",
			paragraphs: [
				"Three options carried forward and scored against five criteria agreed with the Revenue Operations Director before scoring. Trust in the daily number carries 35% because it is the problem the Discovery found; ongoing effort carries 20% because an unowned pipeline recreates the monthly scramble within a quarter.",
				"Option C, a conventional ETL project, builds the same pipeline Option B does and scores well on trust once it exists. It loses on time to value and on ongoing effort: six months to build, then an operator nobody has been named for.",
				"Option B wins at 4.70 and is not sensitive to the trust weighting. With trust weighted at zero it still leads on time to value and ongoing effort.",
			],
			exhibit: {
				kind: "table",
				title: "The agent-run pipeline leads on the criteria that decide whether finance keeps using it",
				caption: "Weighted appraisal against criteria agreed before scoring. Scores are 1–5; weights sum to 100%.",
				source: "Options appraisal · [FINOPS-418] · [CLOSE-36] · [INT-OLIVIA-01]",
				columns: ["Criterion", "Weight", "A · Workbooks", "B · Agent team", "C · ETL project"],
				rows: [
					{ cells: ["Trust in the daily number", "35%", "2", "5", "4"] },
					{ cells: ["Time to value", "20%", "5", "4", "1"] },
					{ cells: ["Ongoing effort", "20%", "2", "5", "2"] },
					{ cells: ["Control and auditability", "15%", "3", "5", "4"] },
					{ cells: ["Reversibility", "10%", "5", "4", "2"] },
					{ cells: ["Weighted score", "100%", "3.05", "4.70", "2.80"], emphasis: true },
				],
			},
		},
		{
			heading: "Costs and benefits",
			paragraphs: [
				"The one-off cost is Northstar's time: the data platform team preparing the isolated workspace and reviewing releases, billing systems granting read access, and finance answering the region, release and currency questions. It totals about fifty working days, roughly $38k at the loaded rate. There is no new infrastructure; the ingestion account and revenue schema already exist, and the nightly job adds about $4,200 a year of AWS running cost.",
				"Benefits are led by the close. The last twelve closes slipped 15.2 days in total, and each slipped day holds six finance staff on reconciliation. Reconciliation effort falls from 31 hours a close to about four hours of review, and FP&A retires the spreadsheet two analysts maintain every morning.",
			],
			exhibit: {
				kind: "bar",
				title: "The close accounts for half the benefit, and every line is measurable from existing timesheets",
				caption: "Annual gross benefit by source at full run rate. No line is risk-weighted; the value of a same-day revenue number is argued separately and not counted.",
				source: "Benefits model · [CLOSE-36] · [FINOPS-418] · loaded rate $96/hour",
				unit: "$k",
				data: [
					{ label: "Close days recovered", value: 70, note: "15.2 slipped days a year", emphasis: true },
					{ label: "Reconciliation effort", value: 31, note: "31 → 4 hours a close" },
					{ label: "FP&A spreadsheet retired", value: 31, note: "320 analyst hours a year" },
					{ label: "Variance investigation", value: 13, note: "418 variances at 20 minutes" },
				],
			},
		},
		{
			heading: "Payback",
			paragraphs: [
				"Option B pays back in its fourth month. Its cost is front-loaded into the first three weeks, and the benefit starts with the first month of verified mornings.",
				"Option C spends for six months before the first load and then carries an operator's cost that Option B does not. On this model it does not pay back inside three years, which is the practical argument against it more than the build cost itself.",
			],
			exhibit: {
				kind: "line",
				title: "The agent-run pipeline is net positive in month four; a conventional build is still $370k behind at month twelve",
				caption: "Cumulative net position by month for Options B and C, including AWS running cost and, for Option C, a half-time operator from month seven.",
				source: "Benefits model · Option C build estimate from [DP-064] · Readiness v7",
				unit: "$k",
				ticks: ["M0", "M1", "M2", "M3", "M4", "M6", "M9", "M12"],
				series: [
					{ label: "B · Agent team", points: [-38, -26, -14, -2, 10, 34, 70, 107], tone: "brand" },
					{ label: "C · ETL project", points: [0, -69, -137, -206, -275, -412, -391, -370], tone: "muted", dashed: true },
				],
				band: { label: "Payback", value: 0 },
			},
		},
		{
			heading: "Feasibility",
			paragraphs: [
				"Feasibility is strong except for data quality, which is the same for every option: 4.4% of the sample has no region code and credit notes before 2024 are unreliable. Option B scores higher only because the agents ask for the region rule with the exact count instead of assuming one.",
				"Organisational readiness is the weakest dimension for Option B. It depends on a named person answering the release question and deciding variances above $200 within a working day, which Discovery could not yet confirm.",
			],
			exhibit: {
				kind: "heatmap",
				title: "Data quality limits every option equally; only schedule separates them",
				caption: "Feasibility by dimension and option (0 = not feasible, 100 = fully feasible with current capability).",
				source: "Feasibility assessment · [LEDGER-30D] · [DP-064] · [INT-SAM-03]",
				columns: ["A · Workbooks", "B · Agent team", "C · ETL project"],
				rows: [
					{ label: "Technical", values: [95, 86, 82] },
					{ label: "Data quality", values: [60, 78, 74] },
					{ label: "Operational", values: [70, 88, 55] },
					{ label: "Schedule", values: [92, 90, 35] },
					{ label: "Organisational readiness", values: [80, 72, 62] },
				],
				scale: ["Not feasible", "Fully feasible"],
			},
		},
	],
	findings: [
		{ label: "Recommended option", detail: "Option B, the daily pipeline operated by an agent team. Weighted score 4.70, leading on trust in the daily number and on ongoing effort." },
		{ label: "Honest statement of the case", detail: "The hours alone pay back in about four months. The reason to proceed is a daily revenue number finance can act on, which the hours do not capture." },
		{ label: "Cost most likely to move", detail: "Northstar's time on the release and access decisions. If the release authority stays unanswered, activation waits and the payback moves with it." },
	],
	nextSteps: [
		{ action: "Approve Option B and about fifty days of Northstar effort", owner: "Olivia Hart · Revenue Operations Director", due: "Finance leadership review" },
		{ action: "Baseline the 31 reconciliation hours per close from timesheets", owner: "Tom Whitfield · Financial Controller", due: "Week 1" },
		{ action: "Confirm the AWS running cost against the data platform budget", owner: "Sam Okafor · Data Platform Lead", due: "Week 2" },
		{ action: "Retire the FP&A spreadsheet after ten verified mornings", owner: "FP&A lead", due: "Gate C" },
	],
	citations: ["[CLOSE-36]", "[FINOPS-418]", "[DP-064]", "[INT-OLIVIA-01]", "Readiness v7"],
}

const PROJECT_CHARTER: DeliverableBody = {
	heading: "Three milestones to a verified first load, four named owners, and a scope that stops at daily revenue on purpose.",
	lede: "The charter covers one outcome: daily revenue reconciled between the SQL Server billing ledger and the AWS revenue schema, with a verified dashboard for finance. Ledger corrections, payment release, tax reporting and customer communication are out of scope, because each would let the agent team change money or speak to customers, and nothing in this Discovery supports that. Agentix runs the work; the people named here keep the decisions.",
	metrics: [
		{ value: "3", label: "Milestones", note: "Mapping, pipeline, dashboard" },
		{ value: "4", label: "Accountable owners", note: "One per decision area" },
		{ value: "5", label: "Named out-of-scope items", note: "None may be done by an agent" },
		{ value: "$50 · $200", label: "Tolerance and escalation", note: "Per region, per day" },
	],
	keyMessages: [
		{ label: "Scope is the daily number, not the finance data platform", detail: "Everything excluded touches the same ledger or the same AWS account and would be convenient to include. Each would also let an agent act on money or on customers, which is the line this charter exists to hold." },
		{ label: "The agents are accountable for the work, people for the decisions", detail: "The coordinator agent answers for each milestone and each morning's cycle. The revenue owner answers for variances, the region rule and the release policy, and the controller for currency and recognition." },
		{ label: "Changes to scope come back through Discovery", detail: "A request that moves the boundary, such as tax reporting or a second ledger, becomes a new version of this package rather than a message to the agent team." },
	],
	sections: [
		{
			heading: "Scope",
			paragraphs: [
				"In scope: read-only access to four ledger tables through the existing gateway, a nightly load into two new tables in the AWS revenue schema, a daily reconciliation by region, a revenue dashboard for the finance group, and routing variances above $200 to the revenue owner.",
				"Out of scope: edits or corrections to the billing ledger, payment release, tax and statutory reporting, messages to customers, and credit notes issued before 2024.",
				"The pre-2024 credit notes are the exclusion most likely to be challenged, because finance would like one history. They lack reliable region codes and exchange rates, and including them would put a known-bad reconciliation into the first month of a process whose value is that it can be trusted.",
			],
			exhibit: {
				kind: "table",
				title: "The scope stops where money would move or a customer would hear from us",
				caption: "Scope statement. Each exclusion carries the reason it is excluded rather than simply deferred.",
				source: "Project charter · [LEDGER-30D] · [INT-OLIVIA-01] · [INT-TOM-04]",
				columns: ["Area", "In scope", "Out of scope", "Why"],
				rows: [
					{ cells: ["Source", "Billing ledger, read only", "Ledger edits or corrections", "The ledger is the system of record"], emphasis: true },
					{ cells: ["Target", "Two new revenue schema tables", "Changes to existing tables", "Nothing downstream breaks"] },
					{ cells: ["Reporting", "Revenue dashboard for finance", "Tax and statutory reporting", "Different owners and controls"] },
					{ cells: ["Exceptions", "Routing variances to the owner", "Payment release", "Money never moves"] },
					{ cells: ["History", "Credit notes from 2024", "Credit notes before 2024", "No reliable region or FX data"] },
				],
			},
		},
		{
			heading: "Decision rights",
			paragraphs: [
				"Every decision that changes a reported number has a named person, and none of them is an agent. The agent team prepares the evidence, applies the decision and proves it with a check; it never makes the call.",
				"The release policy row is the one Discovery could not complete. The revenue owner decides the policy in the Agentix proposal, before activation, and the coordinator then releases under it.",
			],
			exhibit: {
				kind: "table",
				title: "Every decision that changes a number has a named person, and none of them is an agent",
				caption: "Decision rights for the engagement. The agent team column says what the agents do once a person has decided.",
				source: "Project charter · agreed with the four owners · [INT-OLIVIA-01] · [INT-TOM-04]",
				columns: ["Decision", "Revenue owner", "Controller", "Data platform", "Agent team"],
				rows: [
					{ cells: ["Variance above $200", "Decides", "Informed", "—", "Prepares the evidence"], emphasis: true },
					{ cells: ["Currency and recognition rules", "Consulted", "Decides", "—", "Applies and tests"] },
					{ cells: ["Rule for missing regions", "Decides", "Consulted", "—", "Asks, then applies"] },
					{ cells: ["Pipeline release policy", "Decides", "Informed", "Consulted", "Releases under it"] },
					{ cells: ["Dashboard publishing", "Informed", "—", "—", "Publishes under FIN-DASH-2"] },
				],
			},
		},
		{
			heading: "Stakeholders",
			paragraphs: [
				"Nine stakeholders mapped on influence against interest. The Revenue Operations Director and the Financial Controller hold the decisions; the Data Platform Lead holds the production environment the pipeline releases into.",
				"FP&A has the highest interest and little formal influence, and it is the group whose behaviour proves the outcome: the engagement succeeds when FP&A stops maintaining its own spreadsheet.",
			],
			exhibit: {
				kind: "quadrant",
				title: "FP&A proves the outcome: the engagement succeeds when it stops keeping its own spreadsheet",
				caption: "Nine stakeholders on influence against interest. The four interviewed owners are highlighted.",
				source: "Stakeholder analysis · Discovery interviews · [INT-OLIVIA-01] · [INT-SAM-03]",
				xAxis: ["Low interest", "High interest"],
				yAxis: ["Low influence", "High influence"],
				points: [
					{ label: "Revenue Operations Director", x: 90, y: 88, emphasis: true },
					{ label: "Financial Controller", x: 70, y: 80, emphasis: true },
					{ label: "Data Platform Lead", x: 64, y: 62, emphasis: true },
					{ label: "Billing Systems Manager", x: 52, y: 46, emphasis: true },
					{ label: "FP&A analysts", x: 92, y: 24 },
					{ label: "CFO", x: 30, y: 92 },
					{ label: "Regional finance leads", x: 78, y: 38 },
					{ label: "Internal audit", x: 28, y: 68 },
					{ label: "IT security", x: 22, y: 50 },
				],
			},
		},
		{
			heading: "Governance and cadence",
			paragraphs: [
				"The daily summary in the finance channel is the standing report; it says whether the morning's cycle was verified and names anything waiting on a person. For the first four weeks the four owners review the engagement together once a week.",
				"There is no steering group. Decisions are made in Agentix where the evidence sits, and anything that moves the scope comes back through Discovery as a new package version.",
			],
			bullets: [
				{ label: "Daily summary", detail: "Posted to the finance channel after each cycle, with its verification status." },
				{ label: "Weekly owner review", detail: "First four weeks only. Revenue owner, controller, billing systems and data platform." },
				{ label: "Scope changes", detail: "A new version of this package through Discovery, never an instruction to the agents." },
			],
		},
	],
	findings: [
		{ label: "Scope boundary", detail: "The agent team reads the ledger, builds and tests in isolation, and releases to the revenue schema and dashboard under policy. It never edits the ledger, releases payments or contacts customers." },
		{ label: "Owner of the daily number", detail: "Olivia Hart, Revenue Operations Director. The coordinator agent is accountable for the work; she is accountable for the decisions." },
		{ label: "Open governance question", detail: "Who authorizes pipeline releases to production. Discovery could not confirm it, so the Agentix proposal asks before anything is activated." },
	],
	nextSteps: [
		{ action: "Approve the charter and its five exclusions", owner: "Olivia Hart · Revenue Operations Director", due: "Before handoff" },
		{ action: "Name a deputy for variance decisions during absence", owner: "Olivia Hart · Revenue Operations Director", due: "Week 1" },
		{ action: "Confirm the controller's authority over currency and recognition", owner: "Tom Whitfield · Financial Controller", due: "Week 1" },
		{ action: "Hold the weekly owner review for the first four weeks", owner: "Sam Okafor · Data Platform Lead", due: "Weeks 1–4" },
	],
	citations: ["[INT-OLIVIA-01]", "[INT-TOM-04]", "[LEDGER-30D]", "[DP-064]", "Readiness v7"],
}

const PROCESS_ANALYSIS: DeliverableBody = {
	heading: "Today revenue is reconciled once a month by copying numbers. Tomorrow it is reconciled every morning by rules, and people see only what the rules cannot settle.",
	lede: "The current process copies the daily number four times, from the ledger into saved queries, workbooks, a monthly AWS upload and an FP&A spreadsheet, and reconciles the copies at month-end. The target process reads the ledger once, applies the currency, region and credit-note rules in one tested pipeline, compares the result to the ledger every morning and routes only real exceptions to a person.",
	metrics: [
		{ value: "4", label: "Copies of the daily number today", note: "Ledger, workbook, AWS, FP&A" },
		{ value: "1", label: "Copy after the change", note: "Reconciled to the ledger daily" },
		{ value: "31 → 4", label: "Hours per close", note: "Reconciliation becomes review" },
		{ value: "07:00", label: "Verified dashboard", note: "Every business day" },
	],
	keyMessages: [
		{ label: "Every variance starts at a copy", detail: "The ledger is internally consistent. Differences appear when a person copies a total, converts a currency or leaves out an invoice with no region, and each copy is another place for that to happen." },
		{ label: "The rules are already known; they are just applied by hand", detail: "Posting-date exchange rates, a rule for missing regions and credit notes that adjust their original day are all written down in the close workbooks. The target process applies them in code and tests them before every release." },
		{ label: "People move from reconciling to deciding", detail: "Analysts stop rebuilding the number and start reviewing the few differences a rule cannot settle. The revenue owner sees variances above $200 the next morning, with the evidence attached." },
	],
	sections: [
		{
			heading: "As-Is process",
			paragraphs: [
				"Each morning an analyst runs saved queries against the ledger and pastes regional totals into that month's close workbook, converting non-USD invoices at the invoice-date rate. FP&A takes its own copy for daily planning.",
				"At month-end the workbooks are reconciled to the ledger, differences are logged in the variance log, and a monthly summary is uploaded to the AWS revenue schema, which the finance dashboards read. The dashboards are therefore as old as the last close.",
			],
			exhibit: {
				kind: "architecture",
				title: "As-Is: the number is copied four times and reconciled once, at month-end",
				caption: "Current process. Every orange step is a manual copy or a monthly batch; the variance log fills at close rather than on the day.",
				source: "Process walk-through · [CLOSE-36] · [FINOPS-418] · [INT-GRACE-02]",
				lanes: ["Billing ledger", "Finance analysts", "Close workbooks", "AWS and dashboards"],
				nodes: [
					{ id: "ledger", label: "Billing ledger", detail: "SQL Server · on-prem", lane: 0, row: 0, tone: "neutral" },
					{ id: "queries", label: "Saved queries", detail: "Run by hand each morning", lane: 1, row: 0, tone: "warn" },
					{ id: "fpa", label: "FP&A spreadsheet", detail: "A parallel copy", lane: 1, row: 1, tone: "warn" },
					{ id: "workbook", label: "Close workbooks", detail: "Invoice-date FX", lane: 2, row: 0, tone: "warn" },
					{ id: "variances", label: "Variance log", detail: "418 in twelve months", lane: 2, row: 1, tone: "warn" },
					{ id: "upload", label: "Monthly upload", detail: "CSV after close", lane: 3, row: 0, tone: "warn" },
					{ id: "dashboards", label: "Finance dashboards", detail: "Up to 31 days old", lane: 3, row: 1, tone: "warn" },
				],
				edges: [
					{ from: "ledger", to: "queries", label: "copy totals", tone: "warn" },
					{ from: "queries", to: "workbook", label: "paste" },
					{ from: "queries", to: "fpa", label: "second copy", tone: "warn", dashed: true },
					{ from: "workbook", to: "variances", label: "at close", tone: "warn", dashed: true },
					{ from: "workbook", to: "upload" },
					{ from: "upload", to: "dashboards" },
				],
			},
		},
		{
			heading: "Gap analysis",
			paragraphs: [
				"Five gaps, one per cause of variance plus the frequency gap that lets them accumulate. Each change is traced to a requirement in the specification, so no requirement exists without a process defect behind it.",
			],
			exhibit: {
				kind: "table",
				title: "The frequency gap is the programme; the four rule gaps are what make the daily number trustworthy",
				caption: "Gap analysis against the twelve-month variance log. Variance counts are the ones each change removes.",
				source: "Gap analysis · [FINOPS-418] · [LEDGER-30D] · [CLOSE-36]",
				columns: ["Gap", "As-Is", "To-Be", "Change required", "Effect"],
				rows: [
					{ cells: ["Frequency", "Monthly, by hand", "Every morning, by rule", "05:30 load, 06:00 reconciliation", "19 days → next morning"], emphasis: true },
					{ cells: ["Currency", "Two conventions", "Posting-date rates", "FX joined on posting date", "163 variances removed"] },
					{ cells: ["Region", "Blank codes handled ad hoc", "The owner's rule, applied", "Region rule in the mapping", "121 variances removed"] },
					{ cells: ["Credit notes", "Adjust a closed day by hand", "Adjust their original day", "Late-credit handling in the load", "88 variances removed"] },
					{ cells: ["Keying", "Totals pasted into workbooks", "No copying", "Direct read of the ledger", "46 variances removed"] },
				],
			},
		},
		{
			heading: "To-Be process",
			paragraphs: [
				"At 05:30 London the pipeline reads yesterday's ledger rows through the existing gateway and loads them into the revenue schema, applying the currency, region and credit-note rules. At 06:00 the reconciliation analyst compares the schema to the ledger by region.",
				"If every region agrees within $50, the dashboard refreshes by 07:00 and the coordinator posts the daily summary. A variance above $200 goes to the revenue owner with its evidence; everything else keeps running.",
			],
			exhibit: {
				kind: "architecture",
				title: "To-Be: one read of the ledger, one tested pipeline, and a person only when a rule cannot settle it",
				caption: "Target process. The ledger is read, never written; the reconciliation compares the schema back to it every morning.",
				source: "Target process · [DP-064] · [INT-SAM-03] · Readiness v7",
				lanes: ["Billing ledger", "Agent team", "Revenue schema", "Finance"],
				nodes: [
					{ id: "source", label: "Billing ledger", detail: "Read only · gateway", lane: 0, row: 0, tone: "neutral" },
					{ id: "load", label: "Nightly load", detail: "05:30 · tested pipeline", lane: 1, row: 0, tone: "brand" },
					{ id: "reconcile", label: "Reconciliation", detail: "06:00 · $50 per region", lane: 1, row: 1, tone: "brand" },
					{ id: "schema", label: "Revenue schema", detail: "Two new tables", lane: 2, row: 0, tone: "brand" },
					{ id: "dashboard", label: "Dashboard", detail: "Verified by 07:00", lane: 3, row: 0, tone: "brand" },
					{ id: "owner", label: "Revenue owner", detail: "Variances above $200", lane: 3, row: 1, tone: "neutral" },
				],
				edges: [
					{ from: "source", to: "load", label: "read only" },
					{ from: "load", to: "schema", label: "load" },
					{ from: "schema", to: "reconcile", label: "compare" },
					{ from: "reconcile", to: "dashboard", label: "refresh" },
					{ from: "reconcile", to: "owner", label: "above $200", tone: "warn", dashed: true },
				],
			},
		},
		{
			heading: "What the process change does not fix",
			paragraphs: [
				"It does not fix data at the source. Invoices still arrive without a region code from the legacy web channel, and the pipeline applies the owner's rule to them rather than inventing a region; correcting the channel is billing systems work, scheduled separately.",
				"It does not make the ledger faster or move it to AWS. The ledger stays on-prem and remains the system of record, and a gateway outage delays the 05:30 load rather than letting the pipeline guess.",
			],
		},
	],
	findings: [
		{ label: "Root process defect", detail: "The daily number is copied four times and reconciled once. Every variance cause in the log enters at a copy." },
		{ label: "The rules already exist", detail: "Posting-date rates, a missing-region rule and late-credit handling are known; the change is that they are applied in tested code every morning instead of by hand at close." },
		{ label: "Smallest process change, largest trust change", detail: "Removing the copies removes the 46 keying errors outright, and the daily comparison to the ledger makes the other causes visible the next morning." },
	],
	nextSteps: [
		{ action: "Validate the As-Is map with the regional analysts", owner: "Tom Whitfield · Financial Controller", due: "Week 1" },
		{ action: "Schedule the web-channel fix for missing region codes", owner: "Grace Chen · Billing Systems Manager", due: "Week 3" },
		{ action: "Baseline the 31 reconciliation hours before the first load", owner: "Tom Whitfield · Financial Controller", due: "Week 1" },
		{ action: "Trace every requirement to one of the five gaps", owner: "Sam Okafor · Data Platform Lead", due: "Week 1" },
	],
	citations: ["[CLOSE-36]", "[FINOPS-418]", "[INT-GRACE-02]", "[INT-SAM-03]", "Readiness v7"],
}

const REQUIREMENTS: DeliverableBody = {
	heading: "Fourteen requirements, each traced to a variance cause or an owner's answer, and each proved by a check before anything is released.",
	lede: "The specification is short because the scope is. Eight functional requirements describe the daily load, reconciliation and dashboard; six control requirements describe what the agent team may and may not do. Every requirement names the check that proves it, and the checks run in an isolated workspace on the synthetic 30-day sample before any release is proposed.",
	metrics: [
		{ value: "14", label: "Requirements", note: "8 functional · 6 control" },
		{ value: "18", label: "Approved source fields", note: "Of 31 ledger columns" },
		{ value: "2", label: "Requested fields excluded", note: "Personal and free-text data" },
		{ value: "9", label: "Pipeline checks before release", note: "Run on synthetic data" },
	],
	keyMessages: [
		{ label: "Every requirement has a check, not a sign-off", detail: "A requirement that can only be approved by reading a document is not testable, and an agent team cannot prove it. Each one here names the check, the data it runs on and the result that counts as a pass." },
		{ label: "Only approved fields reach the revenue schema", detail: "Finance asked for customer email and sales-rep notes on the dashboard. Both are personal or free-text data and are not on the approved list, so the mapping excludes them and a check proves they are absent." },
		{ label: "Control requirements are as binding as functional ones", detail: "The ledger is never written, tests use synthetic data, and production changes follow the release policy. These are checked the same way the totals are." },
	],
	sections: [
		{
			heading: "Functional requirements",
			paragraphs: [
				"The functional requirements follow the morning: load, convert, reconcile, refresh. REQ-03 and REQ-04 carry the two rules most likely to be built wrong, and both have checks written from the Discovery evidence rather than from the pipeline's own output.",
			],
			exhibit: {
				kind: "table",
				title: "Each functional requirement names the check that proves it and the data that check runs on",
				caption: "Functional requirements REQ-01 to REQ-08 with their acceptance checks. Checks run in the isolated test workspace on the synthetic 30-day sample.",
				source: "Requirements specification · [LEDGER-30D] · [INT-OLIVIA-01] · [INT-TOM-04]",
				columns: ["ID", "Requirement", "Traces to", "Acceptance check"],
				rows: [
					{ cells: ["REQ-01", "Load yesterday's ledger rows from 05:30 London", "Frequency gap", "Load finishes within 20 minutes"] },
					{ cells: ["REQ-02", "Reconcile by region at 06:00", "Owner interview", "Every region within $50 of the ledger"], emphasis: true },
					{ cells: ["REQ-03", "Convert currency at posting-date rates", "Currency gap", "612 non-USD invoices match the ledger"], emphasis: true },
					{ cells: ["REQ-04", "Apply the owner's rule to missing regions", "Region gap", "212 invoices follow the decided rule"] },
					{ cells: ["REQ-05", "Late credit notes adjust their original day", "Credit-note gap", "37 late credits land on the right day"] },
					{ cells: ["REQ-06", "Re-running a day loads no duplicates", "Recovery", "Replay of one day changes nothing"] },
					{ cells: ["REQ-07", "Only the 18 approved fields are mapped", "Data policy", "Target tables match the mapping"] },
					{ cells: ["REQ-08", "Dashboard refreshed by 07:00 with load times", "Owner interview", "Tiles match the reconciled totals"] },
				],
			},
		},
		{
			heading: "Control requirements",
			paragraphs: [
				"The control requirements are what let an agent team do this work at all. They are written as things the team cannot do, because a prohibition can be checked and a good intention cannot.",
			],
			exhibit: {
				kind: "table",
				title: "What the agent team may never do is specified as precisely as what it must do",
				caption: "Control requirements REQ-09 to REQ-14. Each is enforced by permissions and verified by a check or a record.",
				source: "Requirements specification · [DP-064] · [INT-SAM-03] · [INT-OLIVIA-01]",
				columns: ["ID", "Requirement", "Enforced by", "Evidence"],
				rows: [
					{ cells: ["REQ-09", "The billing ledger is never written", "Gateway session with no write grants", "Session grants on record"], emphasis: true },
					{ cells: ["REQ-10", "Changes are tested in isolation first", "Test workspace, synthetic data only", "Checks bound to each version"] },
					{ cells: ["REQ-11", "Production releases follow the agreed policy", "Release adapter held by the coordinator", "Release record and read-back"] },
					{ cells: ["REQ-12", "Variances above $200 go to the revenue owner", "Decision routing", "Decision record per variance"] },
					{ cells: ["REQ-13", "Only the finance group sees the dashboard", "Workspace access policy", "Access check before publishing"] },
					{ cells: ["REQ-14", "A daily summary reaches the finance channel", "Notification step in each cycle", "Channel receipt kept"] },
				],
			},
		},
		{
			heading: "Source-to-target mapping",
			paragraphs: [
				"Eighteen of the ledger's 31 columns are approved for the revenue schema. The extract below shows the fields that carry a rule; the full mapping is the first milestone in Agentix and is tested before the pipeline is built on it.",
				"Two fields finance asked for in interview are deliberately absent. CustomerEmail is personal data and SalesRepNote is free text that can contain it; neither is needed to reconcile revenue.",
			],
			exhibit: {
				kind: "table",
				title: "The fields that carry a rule are the ones the checks concentrate on",
				caption: "Mapping extract from four ledger tables to revenue.daily_invoices. The full mapping has 18 approved fields.",
				source: "Mapping draft · [LEDGER-30D] · [INT-GRACE-02]",
				columns: ["Source field", "Target", "Rule"],
				rows: [
					{ cells: ["dbo.Invoices.InvoiceId", "invoice_id", "Unique key; re-runs never duplicate"] },
					{ cells: ["dbo.Invoices.PostingDate", "posting_date", "Recognition date for daily revenue"], emphasis: true },
					{ cells: ["Amount with dbo.FxRates", "amount_usd", "Converted at the posting-date rate"], emphasis: true },
					{ cells: ["dbo.Invoices.RegionCode", "region", "Blank codes follow the owner's rule"] },
					{ cells: ["dbo.Credits.OriginalInvoiceId", "adjusts original day", "Late credits land on their invoice's day"] },
					{ cells: ["CustomerEmail, SalesRepNote", "Not mapped", "Personal or free-text data"] },
				],
			},
		},
	],
	findings: [
		{ label: "Most important requirement", detail: "REQ-03, currency at posting-date rates. It is the largest cause of variance and the easiest rule to build wrong, because the obvious join is on invoice date." },
		{ label: "Requirement most likely to be challenged", detail: "REQ-07. Finance asked for customer email and sales-rep notes; they stay out because they are personal or free-text data and add nothing to reconciliation." },
		{ label: "What makes the specification agent-ready", detail: "Every requirement has a check that runs on synthetic data before release, so the agent team can prove it without touching production." },
	],
	nextSteps: [
		{ action: "Approve the 18-field mapping list and the two exclusions", owner: "Grace Chen · Billing Systems Manager", due: "Before handoff" },
		{ action: "Confirm the $50 tolerance and $200 escalation in writing", owner: "Olivia Hart · Revenue Operations Director", due: "Before handoff" },
		{ action: "Load the synthetic 30-day sample into the test workspace", owner: "Sam Okafor · Data Platform Lead", due: "Week 1" },
		{ action: "Confirm FIN-DASH-2 covers the new dashboard", owner: "Tom Whitfield · Financial Controller", due: "Week 1" },
	],
	citations: ["[LEDGER-30D]", "[INT-GRACE-02]", "[INT-OLIVIA-01]", "[DP-064]", "Readiness v7"],
}

const TECHNICAL_ASSESSMENT: DeliverableBody = {
	heading: "The pipeline is small. The hard parts are three rules inside it and a production release path that Discovery could not find an owner for.",
	lede: "Four ledger tables, one secure gateway that already exists, an S3 landing area, one transformation job and two new PostgreSQL tables: the build is modest and the measured daily load runs in 6 minutes 12 seconds against a 20-minute budget. The technical risk is concentrated in the currency join, the missing-region rule and late credit notes, each of which is tested before release. The one thing that cannot be tested in advance is who may approve a production change, and the design makes that a question the owner answers before activation.",
	metrics: [
		{ value: "6 min 12 s", label: "Measured daily load", note: "Budget 20 minutes" },
		{ value: "9", label: "Checks before any release", note: "Bound to each version" },
		{ value: "0007", label: "Schema migration", note: "Two new tables, nothing altered" },
		{ value: "0", label: "Write grants on the ledger", note: "Gateway session is read only" },
	],
	keyMessages: [
		{ label: "The build is small because the platform already exists", detail: "The gateway, the AWS ingestion account and the revenue schema are in place. The work is a mapping, one transformation job, one migration and a dashboard, all built and tested in an isolated workspace." },
		{ label: "The risk is in three rules, so the checks are written first", detail: "Currency on posting date, the missing-region rule and late credits each have a check derived from the Discovery evidence. A pipeline that follows the close workbooks' invoice-date convention fails the currency check on the sample's 14 affected invoices." },
		{ label: "Production needs a policy, not a person on call", detail: "Tests never need production access. The first release does, and it follows whichever policy the revenue owner chooses: approval before each release, or a standing Saturday 02:00 window." },
	],
	sections: [
		{
			heading: "Target architecture",
			paragraphs: [
				"The pipeline reads four ledger tables through the existing secure gateway using a session with no write grants, lands them in S3, transforms them in one job and loads two new tables in the revenue schema: revenue.daily_invoices and revenue.region_totals.",
				"Migration 0007 creates the tables and registers the nightly job. It alters nothing that exists, so the current monthly summary and the reports that read it keep working until finance retires them.",
			],
			exhibit: {
				kind: "architecture",
				title: "One read path through the existing gateway, one tested job, and two new tables that change nothing downstream",
				caption: "Target architecture. The isolated test workspace mirrors the landing and transform steps with the synthetic sample and has no production credentials.",
				source: "Data platform runbooks · [DP-064] · [INT-SAM-03]",
				lanes: ["On-prem", "Gateway", "AWS ingestion", "Revenue schema"],
				nodes: [
					{ id: "sql", label: "Billing ledger", detail: "SQL Server · 4 tables", lane: 0, row: 0, tone: "neutral" },
					{ id: "gateway", label: "Secure gateway", detail: "Existing · read only", lane: 1, row: 0, tone: "neutral" },
					{ id: "landing", label: "S3 landing", detail: "Invoices, credits, FX", lane: 2, row: 0, tone: "brand" },
					{ id: "transform", label: "Transform job", detail: "Posting-date FX", lane: 2, row: 1, tone: "brand" },
					{ id: "tables", label: "Two new tables", detail: "Migration 0007", lane: 3, row: 0, tone: "brand" },
					{ id: "sandbox", label: "Test workspace", detail: "Synthetic sample", lane: 3, row: 1, tone: "muted" },
				],
				edges: [
					{ from: "sql", to: "gateway", label: "read" },
					{ from: "gateway", to: "landing", label: "05:30" },
					{ from: "landing", to: "transform" },
					{ from: "transform", to: "tables", label: "load" },
					{ from: "transform", to: "sandbox", label: "tested first", tone: "muted", dashed: true },
				],
			},
		},
		{
			heading: "Data quality findings",
			paragraphs: [
				"The 30-day sample holds 4,812 invoices across four tables. Invoice lines and exchange rates are complete; the gaps are concentrated in two places.",
				"dbo.Invoices is 95.6% complete because 212 invoices have an empty RegionCode, most from the legacy web channel. dbo.Credits scores lowest on timeliness because 37 credit notes were posted after the day their invoice was reconciled, which is exactly the case the pipeline must move back to the original day.",
			],
			exhibit: {
				kind: "heatmap",
				title: "Quality is high except for missing regions and late credit notes, the two rules the pipeline must apply",
				caption: "Data quality by ledger table in the 30-day sample (0 = unusable, 100 = fully reliable).",
				source: "Profiling · [LEDGER-30D] · 4,812 invoices, 31 columns",
				columns: ["Completeness", "Validity", "Consistency", "Timeliness"],
				rows: [
					{ label: "dbo.Invoices", values: [96, 99, 97, 100] },
					{ label: "dbo.InvoiceLines", values: [100, 99, 99, 100] },
					{ label: "dbo.Credits", values: [100, 98, 81, 72] },
					{ label: "dbo.FxRates", values: [100, 100, 88, 100] },
				],
				scale: ["Unusable", "Fully reliable"],
			},
		},
		{
			heading: "Release path and recovery",
			paragraphs: [
				"Every change follows the same path. The data specialist builds it in the isolated workspace, the nine checks run against the synthetic sample and bind to that version, and only a version whose checks pass can be proposed for release. The coordinator releases it under the owner's policy and reads the first production load back against the ledger.",
				"Recovery is honest about its limits. Tables can be dropped and the job disabled, and loaded rows can be deleted and reloaded, but a figure a downstream report has already shown cannot be recalled. The ledger is never changed, so there is always a correct source to reload from.",
			],
			exhibit: {
				kind: "sequence",
				title: "Nothing reaches production until its checks pass and the release policy allows it",
				caption: "The release path for a pipeline change. Step 4 is the release policy the revenue owner chooses in the Agentix proposal.",
				source: "Release design · [DP-064] · REQ-10 · REQ-11",
				actors: ["Data specialist", "Test workspace", "Coordinator", "Revenue schema"],
				steps: [
					{ from: 0, to: 1, label: "Build the change set" },
					{ from: 1, to: 1, label: "Run 9 checks on the sample", note: "Results bound to the version" },
					{ from: 1, to: 2, label: "Propose the tested version" },
					{ from: 2, to: 2, label: "Apply the release policy", note: "Approval or Saturday window", tone: "warn" },
					{ from: 2, to: 3, label: "Apply migration and job" },
					{ from: 3, to: 2, label: "First load read back", note: "Compared with the ledger" },
				],
			},
		},
		{
			heading: "Capacity",
			paragraphs: [
				"The measured load of 6 minutes 12 seconds is for today's volume of about 160 invoices a day. Modelled against volume, the load stays inside its 20-minute budget up to roughly fifteen times that, and at eight times it still finishes in under 13 minutes, which covers quarter-end peaks with room to spare.",
			],
			exhibit: {
				kind: "line",
				title: "The nightly load has room for about fifteen times today's volume before it reaches its budget",
				caption: "Modelled load time against daily invoice volume, from the measured isolated run at today's volume.",
				source: "Isolated test run · [LEDGER-30D] · [DP-064]",
				unit: "minutes",
				ticks: ["160/day", "320", "640", "1,280", "2,560"],
				series: [
					{ label: "Load time", points: [6.2, 7.1, 9.0, 12.8, 20.4], tone: "brand" },
				],
				band: { label: "Budget · 20 min", value: 20 },
			},
		},
	],
	findings: [
		{ label: "Root technical risk", detail: "The currency join. Joining exchange rates on invoice date is the obvious choice and is wrong for 14 of the sample's 612 non-USD invoices, so the check that catches it is written before the pipeline is." },
		{ label: "Prerequisite for production", detail: "A release policy from the revenue owner. Testing never needs it; the first production release does." },
		{ label: "Capacity", detail: "6 minutes 12 seconds against a 20-minute budget leaves room for roughly fifteen times today's daily volume; eight times still loads in under 13 minutes." },
	],
	nextSteps: [
		{ action: "Confirm the gateway session carries no write grants", owner: "Grace Chen · Billing Systems Manager", due: "Week 1" },
		{ action: "Provision the isolated test workspace without production credentials", owner: "Sam Okafor · Data Platform Lead", due: "Week 1" },
		{ action: "Review migration 0007 before its first release", owner: "Sam Okafor · Data Platform Lead", due: "Milestone 2" },
		{ action: "Set the release policy in the Agentix proposal", owner: "Olivia Hart · Revenue Operations Director", due: "Before activation" },
	],
	citations: ["[DP-064]", "[LEDGER-30D]", "[INT-SAM-03]", "[INT-GRACE-02]", "Readiness v7"],
}

const TARGET_OPERATING_MODEL: DeliverableBody = {
	heading: "Four agents with separate permissions do the daily work, and one person decides anything that changes a number.",
	lede: "The operating model splits the work by permission, not by task size. The coordinator holds the only production release and the only notification rights; the analyst and the dashboard specialist are read only; the data specialist builds and tests without production credentials. The revenue owner decides variances above $200, the rule for missing regions and the release policy, and every other step runs on its own and is verified with evidence.",
	metrics: [
		{ value: "4", label: "Agents with separate permissions", note: "No agent can release alone" },
		{ value: "1", label: "Person for every money decision", note: "The revenue owner" },
		{ value: "06:00", label: "Daily reconciliation", note: "London time, every day" },
		{ value: "3", label: "Decisions reserved for people", note: "Variances, region rule, releases" },
	],
	keyMessages: [
		{ label: "Permissions follow risk", detail: "Building a pipeline, validating a dashboard and investigating a variance need different access. Splitting them means no specialist can change production on its own, and the coordinator can release only what has passed its checks." },
		{ label: "A cycle is verified only when every obligation has evidence", detail: "The load read-back, regional totals within $50, the dashboard refresh time and the channel receipt. A missing receipt leaves the cycle partial and is retried on its own; nothing else repeats." },
		{ label: "People are asked, not bypassed", detail: "When a rule needs a business decision, the work that depends on it waits and everything else continues. The owner sees one question with the evidence, not a queue of alerts." },
	],
	sections: [
		{
			heading: "Roles and permissions",
			paragraphs: [
				"The coordinator is accountable for every outcome and is the only role that can release to production or post to the finance channel. It cannot edit the ledger, release payments or contact customers.",
				"The three specialists each hold the least access their duty needs. The dashboard specialist can build and test the dashboard, but only the coordinator's release publishes it.",
			],
			exhibit: {
				kind: "table",
				title: "No specialist can change production; the coordinator can release only a tested version",
				caption: "Roles in the Agentix engagement with their access. The revenue owner is the only person in the daily loop.",
				source: "Operating design · [DP-064] · [INT-SAM-03] · [INT-OLIVIA-01]",
				columns: ["Role", "Owns", "Access", "Cannot"],
				rows: [
					{ cells: ["Revenue coordinator", "Outcomes, releases, routing", "Release adapter · finance channel", "Edit the ledger or release payments"], emphasis: true },
					{ cells: ["Reconciliation analyst", "Daily comparison, evidence", "Ledger and schema · read only", "Post a decision"] },
					{ cells: ["Data specialist", "Mapping and pipeline", "Ledger read only · test workspace", "Use production credentials"] },
					{ cells: ["Dashboard specialist", "Dashboard build and checks", "Reconciled schema · read only", "Publish on its own"] },
					{ cells: ["Revenue owner (person)", "Variances, region rule, policy", "Decisions in Agentix", "—"] },
				],
			},
		},
		{
			heading: "The daily cycle",
			paragraphs: [
				"The morning runs in four steps between 05:30 and 07:00 London. The load and the reconciliation are verified by reading back what they wrote; the dashboard refresh is verified by its timestamp; the summary by the channel's receipt.",
				"A variance above $200 does not stop the cycle. The rest of the morning completes, and the owner's decision is waiting in Agentix with the invoice, the ledger row and the comparison attached.",
			],
			exhibit: {
				kind: "timeline",
				title: "The morning completes by 07:00, and a decision for the owner never holds the rest of it",
				caption: "The daily cycle by role, London time. The owner's window runs alongside the cycle rather than inside it.",
				source: "Operating design · REQ-01 · REQ-02 · REQ-08 · REQ-14",
				ticks: ["05:00", "05:30", "06:00", "06:30", "07:00", "07:30"],
				lanes: [
					{ label: "Data specialist", bars: [{ label: "Load", start: 1, span: 0.5, tone: "brand" }] },
					{ label: "Analyst", bars: [{ label: "Reconcile by region", start: 2, span: 1, tone: "brand" }] },
					{ label: "Dashboard", bars: [{ label: "Refresh", start: 3, span: 0.8, tone: "brand" }] },
					{ label: "Coordinator", bars: [{ label: "Summary", start: 3.8, span: 0.6, tone: "muted" }] },
					{ label: "Revenue owner", bars: [{ label: "Variances above $200", start: 2.6, span: 2.4, tone: "warn" }] },
				],
				markers: [
					{ label: "Ready", at: 4 },
				],
			},
		},
		{
			heading: "What needs a person",
			paragraphs: [
				"Three decisions are reserved for people and never taken by an agent: a variance above $200, the rule for invoices without a region, and the release policy for production changes. Two more are asked once at activation: which test data the build may use, and whether pipeline releases wait for approval or go in the Saturday window.",
			],
			bullets: [
				{ label: "Variance above $200", detail: "The revenue owner approves or declines with the evidence attached. Only that case waits." },
				{ label: "Missing-region rule", detail: "Asked during the mapping milestone with the exact count and value. The build waits; nothing else does." },
				{ label: "Release policy", detail: "Approval before each pipeline release, or the Saturday 02:00 window. Dashboard publishing is covered by FIN-DASH-2." },
			],
		},
		{
			heading: "Recovery without repeating effects",
			paragraphs: [
				"An uncertain step is reconciled by reading the target back before any retry, so a release or a post is never applied twice. A cycle that misses only its channel receipt is resent for the receipt alone.",
				"The limits are stated in every release: tables can be dropped and the job disabled, rows can be reloaded from the ledger, and what a downstream reader has already seen cannot be recalled.",
			],
		},
	],
	findings: [
		{ label: "Operating principle", detail: "Permissions follow risk. No specialist can change production, and the coordinator releases only versions whose checks passed." },
		{ label: "The owner's load", detail: "One person, three kinds of decision, each arriving with its evidence. On the sample's variance rate that is a handful of decisions a week, not a queue." },
		{ label: "Evidence standard", detail: "A morning counts as done only when the load, the regional totals, the refresh time and the channel receipt all have evidence." },
	],
	nextSteps: [
		{ action: "Confirm the four agent roles and their access", owner: "Sam Okafor · Data Platform Lead", due: "Before activation" },
		{ action: "Agree the owner's response time for variances above $200", owner: "Olivia Hart · Revenue Operations Director", due: "Week 1" },
		{ action: "Create the finance channel for the daily summary", owner: "Tom Whitfield · Financial Controller", due: "Week 1" },
		{ action: "Review the operating runbook after the first ten mornings", owner: "Olivia Hart · Revenue Operations Director", due: "Gate C" },
	],
	citations: ["[DP-064]", "[INT-OLIVIA-01]", "[INT-SAM-03]", "[FINOPS-418]", "Readiness v7"],
}

const RAID_REGISTER: DeliverableBody = {
	heading: "Eighteen items, and the two that matter most are questions only Northstar can answer: who releases to production, and what a missing region means.",
	lede: "Seven risks, four assumptions, three issues and four decisions carry owners and closing conditions. The largest risks are both about rules applied silently: currency converted on the wrong date, and invoices without a region placed somewhere nobody chose. Both close with a check before release. The two open decisions travel to Agentix as questions for the revenue owner, so nothing is built on an assumption about them.",
	metrics: [
		{ value: "18", label: "Items with owner and closing condition", note: "7 risks · 4 assumptions · 3 issues · 4 decisions" },
		{ value: "2", label: "Decisions sent to Agentix", note: "Release policy and region rule" },
		{ value: "212", label: "Sample invoices without a region", note: "4.4% of 4,812" },
		{ value: "$126.24", label: "Currency difference in the sample", note: "14 of 612 non-USD invoices" },
	],
	keyMessages: [
		{ label: "The worst failures are silent ones", detail: "A pipeline that converts at invoice-date rates, or files regionless invoices under a default, produces numbers that look right. Both risks close with checks written from the Discovery evidence, not from the pipeline's own output." },
		{ label: "Two decisions are Northstar's and travel as questions", detail: "The release policy and the missing-region rule are business decisions. Agentix asks the revenue owner before the work that depends on them, and everything else continues meanwhile." },
		{ label: "One assumption can only be tested by time", detail: "The 30-day sample may not represent a quarter-end. The first quarter-end within tolerance closes it; until then it stays open and visible." },
	],
	sections: [
		{
			heading: "Risk profile",
			paragraphs: [
				"R-01 and R-02 sit in the act-now quadrant. R-01 is that currency is converted on invoice date, which the close workbooks do today; R-02 is that a production release happens without an agreed authority. Neither is mitigated by care; both are mitigated by a check or a question that blocks the step.",
				"R-05 is rated unlikely and severe and is the one risk that cannot be fully reversed: a row a downstream report has already shown cannot be recalled. It is managed by stating the limit in every release rather than by promising recovery.",
			],
			exhibit: {
				kind: "quadrant",
				title: "The two act-now risks both close with something that blocks the step, not with care",
				caption: "Seven risks scored on impact against likelihood. R-01 closes with the posting-date check; R-02 with the release question in the Agentix proposal.",
				source: "RAID register · [FINOPS-418] · [LEDGER-30D] · Readiness v7",
				xAxis: ["Unlikely", "Likely"],
				yAxis: ["Contained impact", "Severe impact"],
				points: [
					{ label: "R-01 FX on invoice date", x: 80, y: 78, emphasis: true },
					{ label: "R-02 Release authority", x: 58, y: 90, emphasis: true },
					{ label: "R-03 Missing regions", x: 86, y: 54 },
					{ label: "R-04 Late credit notes", x: 74, y: 30 },
					{ label: "R-05 Rows used before a fix", x: 26, y: 82 },
					{ label: "R-06 Personal data", x: 18, y: 60 },
					{ label: "R-07 Gateway outage", x: 44, y: 40 },
				],
			},
		},
		{
			heading: "Open items",
			paragraphs: [
				"D-02 and D-03 are the decisions Discovery could not take for Northstar. They close in Agentix: the release policy as a question in the proposal, the region rule when the mapping milestone reaches the 212 invoices.",
			],
			exhibit: {
				kind: "table",
				title: "Every item closes on a condition, and the two open decisions close before the work that needs them",
				caption: "Top eight items by severity from the 18-item register.",
				source: "RAID register · Readiness v7 · [LEDGER-30D] · [INT-OLIVIA-01]",
				columns: ["ID", "Type", "Item", "Owner", "Closes when", "Due"],
				rows: [
					{ cells: ["D-02", "Decision", "Who authorizes pipeline releases", "Olivia Hart", "Answered in the Agentix proposal", "Before activation"], emphasis: true },
					{ cells: ["D-03", "Decision", "Rule for invoices without a region", "Olivia Hart", "Answered when the mapping asks", "Milestone 1"], emphasis: true },
					{ cells: ["R-01", "Risk", "Currency converted on invoice date", "Sam Okafor", "Posting-date check passes on 612 invoices", "Milestone 2"] },
					{ cells: ["I-01", "Issue", "212 sample invoices without a region", "Grace Chen", "Rule applied; web-channel fix scheduled", "Milestone 1"] },
					{ cells: ["A-01", "Assumption", "The 30-day sample represents a full year", "Tom Whitfield", "First quarter-end within tolerance", "Quarter-end"] },
					{ cells: ["R-05", "Risk", "Rows used downstream before a fix", "Sam Okafor", "Recovery limits stated in each release", "Every release"] },
					{ cells: ["I-02", "Issue", "Workbooks convert at invoice-date rates", "Tom Whitfield", "D-01 carried into the close", "Next close"] },
					{ cells: ["R-06", "Risk", "Personal data reaches the schema", "Grace Chen", "Only the 18 approved fields mapped", "Milestone 1"] },
				],
			},
		},
		{
			heading: "Decided in Discovery",
			paragraphs: [
				"D-01, the currency standard, was the exception raised during synthesis. The ledger posts non-USD invoices at posting-date rates and the close workbooks convert them at invoice-date rates; in the sample the two disagree by $126.24 on 14 invoices.",
				"You chose to keep the workbooks' convention for now and record the difference. The pipeline converts at posting-date rates to match the ledger, and the $126.24 is carried as a known reconciling item until finance decides to restate. I-02 stays open until then.",
			],
		},
		{
			heading: "Assumptions under test",
			paragraphs: [
				"A-01 assumes the 30-day sample represents a full year. It has not seen a quarter-end, and quarter-end is when late credit notes and currency movements are largest. It closes at the first quarter-end reconciled within tolerance.",
				"A-03 assumes finance can live with $50 per region each day. The revenue owner stated it in interview and the close policy supports it; the first ten mornings will show whether real differences sit comfortably inside it or keep testing its edge.",
			],
		},
	],
	findings: [
		{ label: "Highest-rated risk", detail: "R-01, currency converted on invoice date. It is how the close workbooks work today, so it is the convention a pipeline is most likely to copy." },
		{ label: "Currency decision", detail: "D-01 kept both conventions for now. The pipeline matches the ledger at posting-date rates and the $126.24 sample difference is a known reconciling item." },
		{ label: "Decisions awaiting Northstar", detail: "D-02, the release policy, and D-03, the missing-region rule. Both travel to Agentix as questions for the revenue owner." },
	],
	nextSteps: [
		{ action: "Answer D-02 in the Agentix proposal", owner: "Olivia Hart · Revenue Operations Director", due: "Before activation" },
		{ action: "Answer D-03 when the mapping milestone asks", owner: "Olivia Hart · Revenue Operations Director", due: "Milestone 1" },
		{ action: "Schedule the web-channel fix for region codes", owner: "Grace Chen · Billing Systems Manager", due: "Week 3" },
		{ action: "Review A-01 at the first quarter-end", owner: "Tom Whitfield · Financial Controller", due: "Quarter-end" },
	],
	citations: ["[FINOPS-418]", "[LEDGER-30D]", "[CLOSE-36]", "[INT-TOM-04]", "Readiness v7"],
}

const ROADMAP: DeliverableBody = {
	heading: "Three milestones in Agentix, each gated by a check rather than a date, then ten verified mornings before FP&A retires its spreadsheet.",
	lede: "The roadmap is short because the platform exists and the work is bounded. Activation starts with two answers in the Agentix proposal. The mapping milestone waits for one business rule, the pipeline milestone for its checks and the release policy, and the dashboard milestone for the pipeline's tested version. The daily cycle then has to prove itself for ten consecutive mornings before anyone stops checking it by hand.",
	metrics: [
		{ value: "3", label: "Milestones", note: "Mapping · pipeline · dashboard" },
		{ value: "Gate B", label: "First production load", note: "Matches the ledger within $50 per region" },
		{ value: "10", label: "Verified mornings for Gate C", note: "Before the spreadsheet is retired" },
		{ value: "1 day", label: "Target time to find a variance", note: "From 19 days today" },
	],
	keyMessages: [
		{ label: "Each milestone is gated by evidence, not by a date", detail: "The mapping passes its checks with the owner's region rule, the pipeline passes nine checks and releases under policy, and the dashboard's tiles match the reconciled totals. A milestone that is late is waiting for evidence, and says which." },
		{ label: "The dashboard follows the pipeline's tested version", detail: "The dashboard is built on the pipeline's tested schema, so it starts before the pipeline is released and publishes only after it." },
		{ label: "Trust is earned over ten mornings", detail: "The first verified morning proves the pipeline works. Ten consecutive ones prove the operation does, and that is when FP&A can stop keeping its own copy." },
	],
	sections: [
		{
			heading: "Sequence",
			paragraphs: [
				"Day 1 is the proposal: the revenue owner answers the release policy and test data questions and activates. The mapping milestone profiles the sample, asks the region question and tests the mapping. The pipeline is built on the tested mapping, checked, released under the policy and verified against the ledger.",
				"The dashboard starts once the pipeline has a tested version and publishes after the pipeline is released. The daily cycle begins the next morning.",
			],
			exhibit: {
				kind: "timeline",
				title: "The pipeline's release is the critical path; the dashboard is built alongside it and published after it",
				caption: "Indicative sequence in working days. Each bar ends on evidence, so the dates move only if a check or a decision does.",
				source: "Implementation roadmap · Readiness v7 · [INT-SAM-03]",
				ticks: ["D1", "D2", "D3", "D5", "D7", "D10", "D15", "D20"],
				lanes: [
					{ label: "Proposal", bars: [{ label: "Two answers", start: 0, span: 1, tone: "muted" }] },
					{ label: "MS-1 Mapping", bars: [{ label: "Region rule and tests", start: 1, span: 1.5, tone: "brand" }] },
					{ label: "MS-2 Pipeline", bars: [{ label: "Build, test, release", start: 2.5, span: 2, tone: "brand" }] },
					{ label: "MS-3 Dashboard", bars: [{ label: "Build and publish", start: 3.5, span: 1.5, tone: "brand" }] },
					{ label: "Daily cycle", bars: [{ label: "06:00 every morning", start: 5, span: 3, tone: "muted" }] },
				],
				markers: [
					{ label: "Gate A", at: 2.5 },
					{ label: "Gate B", at: 4.5 },
					{ label: "Gate C", at: 7 },
				],
			},
		},
		{
			heading: "Checkpoints",
			paragraphs: [
				"Gate A: the mapping passes its four checks with the owner's rule for missing regions applied to all 212 sample invoices. The pipeline is not built on an untested mapping.",
				"Gate B: the first production load matches the ledger within $50 in every region, read back by the coordinator. The daily cycle does not start before it.",
				"Gate C: ten consecutive mornings verified, each with the load, the regional totals, the 07:00 refresh and the channel receipt evidenced. Only then is the FP&A spreadsheet retired.",
			],
		},
		{
			heading: "Trajectory",
			paragraphs: [
				"The measure that matters is how long a variance takes to reach someone who can act on it. It falls from nineteen days to one as soon as the first cycle runs, and it stays there because the comparison happens every morning.",
				"Analyst hours fall more slowly. For the first two weeks finance should keep checking the dashboard against its own numbers, and that effort is part of Gate C rather than a sign the programme is not working.",
			],
			exhibit: {
				kind: "line",
				title: "Variances reach a person the next morning from the first cycle; analyst hours follow as trust is earned",
				caption: "Median days to find a variance and weekly analyst hours on reconciliation, from the baseline through the first eight weeks.",
				source: "Baseline from [FINOPS-418] and [CLOSE-36] · Readiness v7",
				ticks: ["Base", "W1", "W2", "W3", "W4", "W6", "W8"],
				series: [
					{ label: "Days to find a variance", points: [19, 19, 1, 1, 1, 1, 1], tone: "brand" },
					{ label: "Analyst hours a week", points: [7.8, 7.8, 5, 3, 1.5, 1, 1], tone: "muted", dashed: true },
				],
			},
		},
	],
	findings: [
		{ label: "Critical path", detail: "The pipeline's release. It needs its nine checks to pass and the release policy the revenue owner sets at activation." },
		{ label: "First measurable proof", detail: "Gate B: the first production load matches the ledger within $50 in every region." },
		{ label: "Most likely misreading", detail: "Treating the first verified morning as done. Gate C asks for ten, because trust in a daily number is what the engagement is for." },
	],
	nextSteps: [
		{ action: "Send the package to Agentix and answer its two questions", owner: "Olivia Hart · Revenue Operations Director", due: "Day 1" },
		{ action: "Answer the region rule when the mapping asks", owner: "Olivia Hart · Revenue Operations Director", due: "Milestone 1" },
		{ action: "Review the first pipeline release", owner: "Sam Okafor · Data Platform Lead", due: "Milestone 2" },
		{ action: "Retire the FP&A spreadsheet after ten verified mornings", owner: "FP&A lead", due: "Gate C" },
	],
	citations: ["[INT-OLIVIA-01]", "[INT-SAM-03]", "[FINOPS-418]", "[CLOSE-36]", "Readiness v7"],
}

export const REVENUE_DELIVERABLES: DeliverableBody[] = [EXECUTIVE_BRIEF, BUSINESS_CASE, PROJECT_CHARTER, PROCESS_ANALYSIS, REQUIREMENTS, TECHNICAL_ASSESSMENT, TARGET_OPERATING_MODEL, RAID_REGISTER, ROADMAP]

// With the owner's approval posting-date rates become the standard everywhere:
// the close workbooks restate at the next close, so the brief and the register
// report an adopted standard instead of a known reconciling item.
export const REVENUE_APPROVED_REVISIONS: Partial<Record<number, DeliverableRevision>> = {
	0: {
		sections: {
			"What the decision costs": [
				"Three things are asked of Northstar. Read-only access to the ledger through the existing gateway, an isolated AWS test workspace with the synthetic 30-day sample, and an answer to one question Discovery could not settle: who authorizes a pipeline change that reaches the production revenue schema.",
				"Posting-date rates are now the standard everywhere. The close workbooks restate the sample's 14 affected invoices at the next close, a $126.24 movement between EMEA and APAC, and the pipeline converts at the same rates as the ledger.",
				"One cost cannot be engineered away. Once a loaded row has been read by a downstream report, a later fix corrects the row but not what someone already saw. Every release states that limit before it is approved.",
			],
		},
		findings: {
			"Currency standard": { label: "Currency standard", detail: "Posting-date rates everywhere. The close workbooks restate 14 invoices at the next close, and the pipeline converts at the ledger's rates." },
		},
	},
	7: {
		sections: {
			"Decided in Discovery": [
				"D-01, the currency standard, was the exception raised during synthesis. The ledger posts non-USD invoices at posting-date rates and the close workbooks convert them at invoice-date rates; in the sample the two disagree by $126.24 on 14 invoices.",
				"You adopted posting-date rates as the standard. The close workbooks restate the 14 invoices at the next close, the pipeline converts at the same rates as the ledger, and I-02 closes with that restatement.",
			],
		},
		findings: {
			"Currency decision": { label: "Currency decision", detail: "D-01 adopted posting-date rates everywhere. The workbooks restate 14 invoices at the next close and the pipeline matches the ledger." },
		},
	},
}
