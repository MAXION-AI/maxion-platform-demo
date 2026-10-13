import type { DeliverableBody, DeliverableRevision } from "./types"

// S/4HANA conversion: custom code disposition · Halden Group
// Evidence base: 11,842 custom objects in the ECC repository with twelve months of usage
// statistics, 27,415 ATC readiness findings across 4,102 objects, 4,318 transports over
// twenty-four months, and 214 process documents. The figures are the ones the Agentix
// conversion engagement later builds and tests against (engine/scenarios.ts S4_FIGURES and
// pkg_s4_conversion_v2), so a number quoted here is the number an agent checks there.
// All data is synthetic.

const DISPOSITION = [
	{ label: "Never executed · archive", value: 8232, note: "No execution in twelve months" },
	{ label: "Under threshold · archive", value: 1120, note: "Fewer than twenty executions" },
	{ label: "Remediate", value: 2078, note: "Carried into S/4HANA" },
	{ label: "Adopt standard", value: 412, note: "SAP now does this" },
]

const EXECUTIVE_BRIEF: DeliverableBody = {
	heading: "Two thirds of the custom estate has not run in a year, and the conversion is being estimated as though all of it matters.",
	lede: "Halden is converting ECC 6.0 to S/4HANA 2023. The repository holds 11,842 custom objects; twelve months of usage statistics show 3,610 of them executed even once. The remediation estimate of 6,140 person-days was built from the ATC findings, which do not know what is used, so it prices 8,232 objects nobody has run. Of the 3,610 that do run, 412 now have a standard S/4HANA equivalent and 374 of those behave identically to it. The recommendation is to archive on evidence of use, adopt standard wherever behaviour is unchanged, name the 38 exceptions that genuinely differ, and run a nightly sweep that stops the estate drifting back.",
	metrics: [
		{ value: "11,842", label: "Custom objects in the repository", note: "Z and Y objects, all types" },
		{ value: "3,610", label: "Executed at least once in twelve months", note: "30.5% of the estate" },
		{ value: "6,140 days", label: "Remediation estimate as it stands", note: "Priced from findings, not from use" },
		{ value: "980 days", label: "Removed by adopting standard", note: "For the 412 with an equivalent" },
	],
	keyMessages: [
		{ label: "Usage, not findings, should drive the estimate", detail: "8,232 objects have no execution in twelve months and 6,410 have none in twenty-four. They carry 14,208 ATC findings between them and cost an estimated 3,240 person-days to remediate. Archiving on evidence of use removes that work without a judgement call, provided the threshold is agreed in advance." },
		{ label: "Standard has caught up with 412 of the objects that do run", detail: "Successor functionality and simplification items cover 412 used objects. For 374 the behaviour is identical and the disposition is mechanical. Adopting standard for all 412 removes 980 person-days and, more usefully, removes the code from the estate permanently." },
		{ label: "Thirty-eight objects encode behaviour the business would notice", detail: "The remaining 38 differ in what the business sees, not in how they are written. The custom credit-exposure check counts open orders from quotation stage where standard counts from order entry; on that object alone €2,412,880.40 of orders a month would block differently. Which behaviour survives is a business decision, and this document does not make it." },
	],
	sections: [
		{
			heading: "Situation",
			paragraphs: [
				"Halden runs ECC 6.0 EHP8 across finance, sales and manufacturing in four countries. The system has been in production for nineteen years and has been extended continuously: user exits, BAdIs, custom reports, custom tables, enhancement implementations and a substantial set of Z programs that sit alongside standard transactions rather than replacing them.",
				"The programme board approved a brownfield conversion to S/4HANA 2023 on private cloud. The technical conversion path is settled. What is not settled is the custom code: the ATC readiness run against the sandbox produced 27,415 findings across 4,102 objects, of which 1,180 are error-priority and block the conversion outright.",
				"The remediation estimate presented to the board is 6,140 person-days. It was produced by pricing the findings. Nobody asked which of the objects carrying those findings is still used, because until the usage statistics were read nobody could answer.",
			],
			exhibit: {
				kind: "bar",
				title: "Two thirds of the estate has no execution behind it at all",
				caption: "Custom objects by disposition after twelve months of usage statistics were matched to the repository. The four dispositions account for all 11,842 objects; the 212 with no named owner sit inside the remediate group and are the only ones whose treatment is not already decided by the rules the owner set.",
				source: "SAP ECC · SE80 repository and UPL usage statistics, twelve months",
				unit: "objects",
				data: DISPOSITION,
			},
		},
		{
			heading: "What the usage statistics change",
			paragraphs: [
				"Usage was read from UPL over twelve months, which records every execution of every object rather than sampling. An object with no record in that period was not run by a user, a batch job or another program.",
				"The distribution is not gradual. 8,232 objects have no execution at all. A further 1,120 executed fewer than twenty times, almost all of them one-off reports run during a year-end or an audit. Above that threshold, usage climbs steeply: the 2,490 objects executed twenty times or more account for 98.7% of all custom execution.",
				"The owner set the archive threshold at twenty executions in twelve months. That is a policy, not a measurement, and it is stated here so the board can move it. At twenty, 9,352 objects archive without a conversation and 2,490 carry forward.",
			],
			exhibit: {
				kind: "table",
				title: "The remediation estimate prices work on objects nobody has run",
				caption: "Person-day estimates are the programme's own, carried at the rate used in the board submission. The archive column is the work that leaves the estimate if disposition follows evidence of use.",
				source: "Programme remediation estimate v3 · matched to UPL usage",
				columns: ["Group", "Objects", "ATC findings", "Estimated days", "Treatment"],
				rows: [
					{ cells: ["No execution in 24 months", "6,410", "11,204", "2,520", "Archive"] },
					{ cells: ["No execution in 12 months", "1,822", "3,004", "720", "Archive"] },
					{ cells: ["Under 20 executions", "1,120", "1,890", "440", "Archive on threshold"] },
					{ cells: ["Used · standard equivalent", "412", "2,914", "980", "Adopt standard"], emphasis: true },
					{ cells: ["Used · no standard equivalent", "2,078", "8,403", "1,480", "Remediate"] },
				],
			},
		},
		{
			heading: "The one decision this package asks for",
			paragraphs: [
				"For 374 of the 412 objects with a standard equivalent, MAX compared twelve months of executions against the standard behaviour and found no difference the business would see. Those are dispositioned to standard without a decision.",
				"For 38 the difference is real. The clearest is the custom credit-exposure check in ZFI_CREDIT_EXP, which counts open sales orders from quotation stage. Standard FSCM Credit Management counts them from order entry. Applied to twelve months of orders, the two rules disagree on €2,412,880.40 of exposure a month, which changes which customers are blocked and when.",
				"MAX can prove which 38 objects and exactly how each differs. It cannot decide whether Halden changes how it works or keeps the code, because that is a finance and commercial policy question. It is the only decision in this package that stops the analysis.",
			],
		},
	],
	findings: [
		{ label: "The estimate prices 9,352 objects that evidence says are dead", detail: "Objects below the agreed usage threshold carry 16,098 ATC findings and an estimated 3,680 person-days. None of that work changes anything a user does, because no user runs those objects." },
		{ label: "Thirty-eight objects change what the business sees", detail: "412 used objects have a standard equivalent; 374 behave identically. The remaining 38 differ in outcome, and on the credit-exposure check alone €2,412,880.40 of orders a month would block differently. The decision is the business's." },
		{ label: "Nothing stops the estate drifting back after go-live", detail: "4,318 transports over twenty-four months went to production with no automated readiness gate. 214 of them introduced a pattern the conversion now removes. Without a gate the remediated estate reacquires the same debt." },
	],
	nextSteps: [
		{ action: "Confirm the twenty-execution archive threshold at the programme board", owner: "Anja Möller", due: "Week 1" },
		{ action: "Decide standard adoption or remediation for the 38 behaviour exceptions", owner: "Rosa Iglesias", due: "Week 1" },
		{ action: "Name the approver for transports reaching production S/4HANA", owner: "Damian Okonkwo", due: "Week 2" },
	],
	citations: [
		"SAP ECC · SE80 custom object repository · 11,842 objects",
		"SAP ECC · UPL usage statistics · twelve months to the conversion freeze",
		"SAP ATC · S/4HANA readiness run on the sandbox · 27,415 findings",
		"Programme remediation estimate v3 · board submission",
	],
}

const BUSINESS_CASE: DeliverableBody = {
	heading: "Dispositioning on evidence removes 3,680 person-days from the conversion before anyone writes a line of remediation code.",
	lede: "Three options were appraised against the same conversion date. Remediating everything the ATC run flagged is the current plan and the most expensive. Archiving on evidence of use and adopting standard where behaviour is unchanged removes 3,680 and 980 person-days respectively, and is the recommended option. Deferring the custom-code question until after the technical conversion is the option that looks cheapest and is not, because the remediation then happens under a go-live freeze.",
	metrics: [
		{ value: "6,140 days", label: "Option A · remediate everything flagged", note: "The estimate as submitted" },
		{ value: "1,480 days", label: "Option B · disposition on evidence", note: "Recommended" },
		{ value: "4,660 days", label: "Avoided by Option B", note: "75.9% of the submitted estimate" },
		{ value: "19 weeks", label: "Critical path saved", note: "At the programme's staffing profile" },
	],
	keyMessages: [
		{ label: "The saving is in what is not done, not in doing it faster", detail: "Option B does not remediate objects more efficiently. It removes 9,352 objects from the scope on evidence of use and 412 more by adopting standard, leaving 2,078 to remediate. The unit cost per object is unchanged." },
		{ label: "Deferring the question costs more than answering it", detail: "Option C converts first and remediates after. The 1,180 error-priority findings must still be fixed before conversion, so the deferral only moves 4,960 days into the period when the system is live and every change competes with a go-live freeze. The programme's own change calendar allows one transport window a week in that period." },
		{ label: "The nightly sweep is what protects the saving", detail: "Without a readiness gate the estate reacquires debt at the rate the transport history shows: 214 transports in twenty-four months introduced a pattern the conversion removes. The sweep is 0.4 person-days a month to run and is the difference between a one-off cleanup and a maintained estate." },
	],
	sections: [
		{
			heading: "Options appraised",
			paragraphs: [
				"All three options deliver the same technical conversion on the same date. They differ only in how the custom estate is treated, and therefore in how much remediation work the programme carries.",
				"Costs are the programme's own person-day estimates at the rate used in the board submission. No option assumes a change to the conversion date, because the board has fixed it.",
			],
			exhibit: {
				kind: "waterfall",
				title: "Evidence removes three quarters of the estimate before efficiency is considered",
				caption: "From the submitted estimate to the recommended scope. Each step is a group of objects leaving the remediation scope for a stated reason, not a productivity assumption.",
				source: "Programme remediation estimate v3 · matched to UPL usage and simplification items",
				unit: "days",
				steps: [
					{ label: "Estimate as submitted", value: 6140, role: "base" },
					{ label: "Archive · no 24-month use", value: -2520, role: "delta" },
					{ label: "Archive · no 12-month use", value: -720, role: "delta" },
					{ label: "Archive · under threshold", value: -440, role: "delta" },
					{ label: "Adopt standard", value: -980, role: "delta" },
					{ label: "Recommended scope", value: 1480, role: "total" },
				],
			},
		},
		{
			heading: "Feasibility",
			paragraphs: [
				"Option B depends on two things being true. The usage statistics must be complete, and the standard equivalents must be real rather than approximate.",
				"UPL was active for the full twelve months with no gaps in the collection log, and it records execution rather than sampling it. Where an object is called only by another custom object, the caller's usage was inherited, so a dead caller does not keep a live callee alive by accident.",
				"The 412 standard equivalents were each matched to a named simplification item or successor object and then tested against twelve months of executions rather than against documentation. That test is what separated the 374 from the 38.",
			],
			bullets: [
				{ label: "Benefit realised on disposition, not on go-live", detail: "The 3,680 days come out of the plan the week the threshold is agreed. They do not wait for the conversion." },
				{ label: "The 38 are the only contested objects", detail: "Every other disposition follows a rule the owner sets. If the board changes the threshold, the numbers move but no new decision appears." },
				{ label: "Archived does not mean deleted", detail: "Archived objects stay in the repository, excluded from the conversion scope and blocked from transport. A request to revive one is a named decision, not a silent restore." },
			],
		},
	],
	findings: [
		{ label: "Option B is recommended on cost, risk and date", detail: "It removes 4,660 person-days, it does not move the conversion date, and it leaves one business decision rather than 412." },
		{ label: "Option C is a deferral, not a saving", detail: "The 1,180 error-priority findings are on the critical path regardless. Deferring the rest moves 4,960 days into the live period, where the change calendar allows one window a week." },
		{ label: "The benefit is contingent on the threshold being agreed in advance", detail: "If disposition is argued object by object the saving evaporates into meetings. The threshold is the mechanism; the number is the board's to set." },
	],
	nextSteps: [
		{ action: "Approve Option B and the twenty-execution threshold", owner: "Programme board", due: "Week 1" },
		{ action: "Restate the remediation estimate at the recommended scope", owner: "Stefan Keller", due: "Week 2" },
		{ action: "Book the nightly sweep into the run budget at 0.4 days a month", owner: "Damian Okonkwo", due: "Week 3" },
	],
	citations: [
		"Programme remediation estimate v3 · board submission",
		"SAP ECC · UPL usage statistics · collection log, twelve months",
		"SAP Readiness Check · simplification item list · 1,281 relevant, 96 with impact",
		"Halden change calendar · finance release train",
	],
}

const PROJECT_CHARTER: DeliverableBody = {
	heading: "The programme owns the conversion; this engagement owns the disposition of the custom estate and the gate that keeps it clean.",
	lede: "Scope is the 11,842 custom objects, their disposition, the remediation of what carries forward, and the nightly readiness sweep. The technical conversion, the functional testing and the cutover stay with the programme. Five exclusions are stated so the boundary is not negotiated during delivery.",
	metrics: [
		{ value: "11,842", label: "Objects in scope", note: "The full custom repository" },
		{ value: "4", label: "Accountable owners named", note: "One per decision class" },
		{ value: "5", label: "Explicit exclusions", note: "Stated, not implied" },
		{ value: "3", label: "Milestones to delivery", note: "Map, pipeline, dashboard" },
	],
	keyMessages: [
		{ label: "Disposition is in scope; the conversion is not", detail: "This engagement decides what happens to each custom object and builds the gate. The technical conversion, the functional test cycles and the cutover plan remain the programme's, and this engagement produces inputs to them rather than owning them." },
		{ label: "Every decision class has one named owner", detail: "Archive threshold to the IT Director, behaviour exceptions to Finance Systems, transport approval to Basis, remediation sequencing to the Development Lead. A decision with two owners is an escalation waiting to happen." },
		{ label: "The exclusions are the ones people assume are included", detail: "Master data, authorisations, interfaces to non-SAP systems, Fiori adoption and the archiving of business data are all out. Each is a programme in its own right and each has been assumed into this one at some point." },
	],
	sections: [
		{
			heading: "Scope and exclusions",
			paragraphs: [
				"In scope: the custom object repository and its disposition; remediation of objects carried forward; adoption of standard where agreed; the nightly readiness sweep and its transport gate; the readiness dashboard.",
				"Out of scope, explicitly: master data cleansing and the business partner conversion; authorisation and role redesign; interfaces to non-SAP systems; Fiori and user experience adoption; archiving of business data as distinct from code.",
			],
			exhibit: {
				kind: "table",
				title: "Each decision class has one owner and one escalation",
				caption: "Decision rights as agreed at the Discovery workshop. Where a decision has a threshold, the threshold is stated so the owner is only consulted above it.",
				source: "Discovery workshop · Enterprise IT and Finance Systems",
				columns: ["Decision", "Owner", "Threshold", "Escalates to"],
				rows: [
					{ cells: ["Archive threshold", "Anja Möller", "Any change to 20 executions", "Programme board"] },
					{ cells: ["Standard adoption where behaviour differs", "Rosa Iglesias", "All 38 exceptions", "CFO"], emphasis: true },
					{ cells: ["Objects with no named owner", "Stefan Keller", "All 212", "Anja Möller"] },
					{ cells: ["Transport to production", "Damian Okonkwo", "Every transport", "Programme board"] },
					{ cells: ["Remediation sequencing", "Stefan Keller", "Critical path only", "Anja Möller"] },
				],
			},
		},
	],
	findings: [
		{ label: "The boundary is stated where it is usually assumed", detail: "Five exclusions are named in the charter rather than discovered in delivery. Each has been assumed into a custom-code workstream on a previous Halden programme." },
		{ label: "Transport approval has no owner today", detail: "Twenty-four months of transports show no consistent approver. The charter names one, and until the board confirms it the engagement treats every production transport as requiring the owner's approval." },
	],
	nextSteps: [
		{ action: "Confirm the charter and the five exclusions at the programme board", owner: "Anja Möller", due: "Week 1" },
		{ action: "Confirm transport approval authority", owner: "Programme board", due: "Week 2" },
	],
	citations: [
		"Discovery workshop · Enterprise IT, Finance Systems, Basis",
		"Halden programme governance model v4",
		"SAP CTS · transport history · 4,318 transports, twenty-four months",
	],
}

const PROCESS_ANALYSIS: DeliverableBody = {
	heading: "Today a custom object is judged by whoever opens it; the target judges it by evidence, once, against rules the board set.",
	lede: "The current process has no disposition step at all. An object reaches a developer through an ATC finding, and that developer decides on the spot whether to fix it, rewrite it or ask someone. The target inserts one disposition pass ahead of remediation, driven by usage and simplification data, so a developer only ever sees objects that are already known to carry forward.",
	metrics: [
		{ value: "0", label: "Disposition steps today", note: "Objects go straight to remediation" },
		{ value: "4,102", label: "Objects a developer would open", note: "Under the current process" },
		{ value: "2,078", label: "Objects a developer opens", note: "Under the target process" },
		{ value: "1 pass", label: "Disposition runs once", note: "Not per developer, per object" },
	],
	keyMessages: [
		{ label: "The current process has no place to say no", detail: "An ATC finding is a defect to be fixed. Nothing in the flow asks whether the object should exist, so every flagged object becomes work. The 8,232 unused objects are not a failure of diligence; the process simply has no step that would have caught them." },
		{ label: "Disposition belongs before remediation, not inside it", detail: "Deciding disposition while remediating means deciding it 4,102 times, by 4,102 different judgements, under delivery pressure. One pass ahead of the work applies the same rules to every object and produces a map the developers work from." },
		{ label: "The gate is the part that persists", detail: "Disposition happens once. The nightly sweep is what stops the next twenty-four months of transports rebuilding the estate, and it is the only part of this design still running a year after go-live." },
	],
	sections: [
		{
			heading: "Current state",
			paragraphs: [
				"An ATC run produces findings. Findings are assigned to developers by object. The developer opens the object, forms a view on whether it is still needed, and either fixes it, rewrites it against standard, or raises a question to whoever they believe owns it.",
				"There is no record of that judgement. The transport comment says what changed, not what was considered. Two developers looking at similar objects reach different answers, and neither is wrong under the process as written.",
				"When a developer cannot identify an owner, the object waits. 212 objects are in that state today; the median wait on the programme's tracker is 31 days.",
			],
			exhibit: {
				kind: "sequence",
				title: "A developer decides disposition alone, under delivery pressure, with no record",
				caption: "The current path from a readiness finding to a transport. The judgement at step three is the one the target process moves upstream and makes explicit.",
				source: "Programme delivery process v2 · observed on the pilot wave",
				actors: ["ATC run", "Developer", "Object owner", "Transport queue"],
				steps: [
					{ from: 0, to: 1, label: "Finding assigned by object" },
					{ from: 1, to: 1, label: "Is this still needed?", note: "Unrecorded judgement", tone: "warn" },
					{ from: 1, to: 2, label: "Who owns this?", note: "Median 31 days when unclear", tone: "danger" },
					{ from: 1, to: 3, label: "Remediate and transport" },
				],
			},
		},
		{
			heading: "Target state",
			paragraphs: [
				"A disposition pass runs first, over the whole repository at once. It matches every object to its usage, its ATC findings and any simplification item that covers it, and applies the rules the board agreed: below the threshold archive, standard equivalent with unchanged behaviour adopt standard, otherwise remediate.",
				"Objects the rules cannot place are the only ones that reach a person. Today that is 212 objects with no named owner, and they go to the Development Lead as a single decision rather than 212 conversations.",
				"Remediation then works from the map. A developer opening an object knows it carries forward, because nothing else reaches them.",
			],
			exhibit: {
				kind: "architecture",
				title: "Disposition runs once, ahead of the work, and the gate runs every night after it",
				caption: "The target flow. The disposition map is produced once; the readiness gate is permanent and is what keeps the remediated estate clean.",
				source: "Target process design · Discovery workshop",
				lanes: ["Evidence", "Disposition", "Delivery", "Production"],
				nodes: [
					{ id: "usage", label: "Usage statistics", detail: "UPL, twelve months", lane: 0, row: 0 },
					{ id: "atc", label: "Readiness findings", detail: "ATC on the sandbox", lane: 0, row: 1 },
					{ id: "simp", label: "Simplification items", detail: "Standard equivalents", lane: 0, row: 2 },
					{ id: "map", label: "Disposition map", detail: "Every object placed", lane: 1, row: 1, tone: "brand" },
					{ id: "ask", label: "Objects with no owner", detail: "212 · one decision", lane: 1, row: 2, tone: "warn" },
					{ id: "remediate", label: "Remediation pipeline", detail: "2,078 objects", lane: 2, row: 0 },
					{ id: "adopt", label: "Adopt standard", detail: "412 objects", lane: 2, row: 1 },
					{ id: "archive", label: "Archive", detail: "9,352 objects", lane: 2, row: 2, tone: "muted" },
					{ id: "gate", label: "Nightly readiness gate", detail: "Blocks a drifting transport", lane: 3, row: 1, tone: "brand" },
				],
				edges: [
					{ from: "usage", to: "map" },
					{ from: "atc", to: "map" },
					{ from: "simp", to: "map" },
					{ from: "map", to: "ask", label: "Cannot place", tone: "warn" },
					{ from: "map", to: "remediate" },
					{ from: "map", to: "adopt" },
					{ from: "map", to: "archive", dashed: true },
					{ from: "remediate", to: "gate" },
					{ from: "adopt", to: "gate" },
				],
			},
		},
	],
	findings: [
		{ label: "The gap is a missing step, not a missing control", detail: "Nothing in the current process is done badly. There is simply no point at which the question 'should this object exist' is asked, so it is answered ad hoc by whoever has the object open." },
		{ label: "212 objects are waiting on an owner nobody can name", detail: "Median wait 31 days. Under the target these reach the Development Lead once, as a group, with the usage evidence attached." },
	],
	nextSteps: [
		{ action: "Approve the disposition rules as the target process", owner: "Stefan Keller", due: "Week 2" },
		{ action: "Agree the treatment of objects with no named owner", owner: "Stefan Keller", due: "Week 3" },
	],
	citations: [
		"Programme delivery process v2 · pilot wave observation",
		"Programme tracker · objects awaiting an owner · 212 open",
		"Discovery workshop · target process design",
	],
}

const REQUIREMENTS: DeliverableBody = {
	heading: "Every disposition rule is written as something a test can fail, and every behaviour exception names what it is tested against.",
	lede: "Nineteen requirements cover disposition, remediation, the standard-adoption rule, the behaviour exceptions and the nightly gate. Each carries an acceptance criterion written to be failed rather than admired, and each traces to the evidence that produced it. The 38 behaviour exceptions are specified individually because a rule that says 'preserve existing behaviour' cannot be tested.",
	metrics: [
		{ value: "19", label: "Requirements specified", note: "All with acceptance criteria" },
		{ value: "38", label: "Behaviour exceptions named individually", note: "Each with its own test" },
		{ value: "11", label: "Checks the pipeline must pass", note: "Before any transport" },
		{ value: "100%", label: "Traced to evidence", note: "No requirement without a source" },
	],
	keyMessages: [
		{ label: "A disposition rule that cannot be tested is a preference", detail: "'Archive unused objects' is untestable. 'An object with fewer than twenty UPL executions in the twelve months to the freeze date is archived and blocked from transport' can be run against the repository and either passes or does not." },
		{ label: "The 38 exceptions are specified one by one", detail: "Each names the object, the standard equivalent, the behavioural difference in business terms, the twelve-month population it affects, and the test that proves the chosen behaviour survives. ZFI_CREDIT_EXP is specified against €2,412,880.40 of monthly exposure, not against a description." },
		{ label: "The gate's requirement is a refusal, not a report", detail: "The nightly sweep does not notify someone that a transport reintroduced a removed pattern. It blocks the transport before it enters the queue, and the notification is the record of a block that already happened." },
	],
	sections: [
		{
			heading: "Requirements and acceptance",
			paragraphs: [
				"Requirements are grouped by what they govern: disposition, remediation, adoption, exceptions and the gate. The acceptance criterion is what the pipeline tests; the evidence column is what the requirement was derived from.",
			],
			exhibit: {
				kind: "table",
				title: "Every requirement names what it is tested against",
				caption: "A representative set across the five groups. The full specification carries nineteen, each with the same four columns.",
				source: "Requirements specification v1 · Discovery workshop and evidence base",
				columns: ["ID", "Requirement", "Acceptance criterion", "Evidence"],
				rows: [
					{ cells: ["REQ-03", "Archive below the usage threshold", "Zero objects under 20 executions appear in the remediation scope", "UPL, twelve months"] },
					{ cells: ["REQ-07", "Adopt standard where behaviour is unchanged", "All 374 unchanged objects resolve to their successor and pass the behaviour test", "Simplification items"] },
					{ cells: ["REQ-08", "Preserve or change the 38 exceptions as decided", "Each of the 38 passes the test for the behaviour the owner chose", "Twelve months of executions"], emphasis: true },
					{ cells: ["REQ-12", "No object transports without a disposition", "A transport containing an undispositioned object is refused", "CTS history"] },
					{ cells: ["REQ-16", "Block a transport reintroducing a removed pattern", "The nightly sweep refuses it before it enters the queue", "214 historic transports"] },
				],
			},
		},
	],
	findings: [
		{ label: "The behaviour exceptions cannot be specified as a rule", detail: "Each of the 38 differs in a different way. Specified as a group they would be tested as a group, which is how a behavioural difference reaches production unnoticed." },
		{ label: "Two requirements depend on a decision that is still open", detail: "REQ-08 and REQ-11 are written for both paths. Whichever the owner chooses, the acceptance criterion is already stated; nothing waits on drafting." },
	],
	nextSteps: [
		{ action: "Walk the 38 exception specifications with Finance Systems", owner: "Rosa Iglesias", due: "Week 3" },
		{ action: "Baseline the nineteen requirements for the remediation pipeline", owner: "Stefan Keller", due: "Week 3" },
	],
	citations: [
		"Requirements specification v1",
		"SAP ECC · UPL usage statistics",
		"SAP Readiness Check · simplification item list",
		"SAP CTS · transport history",
	],
}

const TECHNICAL_ASSESSMENT: DeliverableBody = {
	heading: "The conversion blocks on 1,180 findings; everything else is scope the programme chose to carry.",
	lede: "Of 27,415 ATC findings, 1,180 are error-priority and stop the conversion. They sit in 604 objects, all of which are in use. The remaining 26,235 findings are warnings and information: real, but not blocking, and 16,098 of them are in objects the disposition rules archive. The target design remediates the 604 first, adopts standard for the 412, remediates 2,078 on the critical path, and gates everything afterwards.",
	metrics: [
		{ value: "1,180", label: "Error-priority findings", note: "Conversion blocks on these" },
		{ value: "604", label: "Objects carrying them", note: "All in active use" },
		{ value: "16,098", label: "Findings in objects being archived", note: "No remediation needed" },
		{ value: "11", label: "Checks before a transport", note: "Run on every build" },
	],
	keyMessages: [
		{ label: "The blocking set is small and entirely in use", detail: "604 objects carry all 1,180 error-priority findings, and every one of them executed in the last twelve months. There is no overlap between the conversion blockers and the dead estate, which means the archive decision does not touch the critical path." },
		{ label: "Most findings are in code that is being removed", detail: "16,098 of 27,415 findings are in the 9,352 objects the rules archive. Remediating them would be work with no consumer. They are excluded from scope and recorded as excluded, so the ATC count in the programme report reconciles." },
		{ label: "The gate needs no new infrastructure", detail: "The nightly sweep runs the same ATC variant against the day's transports on the existing sandbox. It needs a scheduled job, a transport-of-copies check and a block action in CTS. Nothing is introduced that the estate does not already run." },
	],
	sections: [
		{
			heading: "Findings by priority and disposition",
			paragraphs: [
				"ATC was run with the S/4HANA readiness variant against the sandbox at the conversion baseline. Findings are classified by SAP's own priority, then matched to the disposition each object receives under the agreed rules.",
				"The value of the matrix is the top-left cell. Error-priority findings in objects being archived would be pure waste; there are none, because an object carrying a conversion blocker is by definition one the system runs.",
			],
			exhibit: {
				kind: "heatmap",
				title: "No conversion blocker sits in code the rules archive",
				caption: "ATC findings by priority and disposition. The archive column carries 16,098 findings and none of the 1,180 that block the conversion.",
				source: "SAP ATC · S/4HANA readiness run on the sandbox",
				columns: ["Archive", "Adopt standard", "Remediate"],
				rows: [
					{ label: "Error", values: [0, 214, 966] },
					{ label: "Warning", values: [9420, 1806, 5104] },
					{ label: "Information", values: [6678, 894, 2333] },
				],
				scale: ["Fewest findings", "Most findings"],
			},
		},
		{
			heading: "Target architecture",
			paragraphs: [
				"The disposition map is produced from three reads: the repository with usage, the ATC findings, and the simplification item list. It writes nothing.",
				"The remediation pipeline builds and tests in the sandbox. It has no production credential. A tested version reaches production only through a transport released under the agreed policy, and the coordinator makes the single CTS call.",
				"The nightly sweep reads the day's transports, runs the readiness variant against them, and blocks any that reintroduce a removed pattern. A block is a refusal in CTS and a notification to the developer, in that order.",
			],
		},
	],
	findings: [
		{ label: "The critical path is 604 objects, not 4,102", detail: "Every conversion blocker sits in an object that is in use and therefore in scope regardless of the threshold. The archive decision does not move the conversion date in either direction." },
		{ label: "The ATC count in the programme report will not reconcile without the exclusion record", detail: "16,098 findings leave scope because their objects leave scope. Unless that is recorded explicitly, the next report shows 16,098 findings 'unresolved'." },
	],
	nextSteps: [
		{ action: "Sequence the 604 blocking objects ahead of everything else", owner: "Stefan Keller", due: "Week 2" },
		{ action: "Record the 16,098 excluded findings against their archived objects", owner: "Stefan Keller", due: "Week 3" },
		{ action: "Schedule the nightly readiness variant on the sandbox", owner: "Damian Okonkwo", due: "Week 4" },
	],
	citations: [
		"SAP ATC · S/4HANA readiness run · 27,415 findings",
		"SAP Readiness Check · simplification items",
		"Halden sandbox landscape document v2",
	],
}

const TARGET_OPERATING_MODEL: DeliverableBody = {
	heading: "Four duties, separated so that no one both decides a disposition and releases it to production.",
	lede: "The agent team has four members with different permissions. The analyst reads and classifies but cannot change code. The remediation specialist builds and tests in the sandbox but holds no production credential. The dashboard specialist publishes under policy. Only the coordinator makes a production call, and only after a release is approved under the agreed policy.",
	metrics: [
		{ value: "4", label: "Duties, separately permissioned", note: "No duty spans decide and release" },
		{ value: "1", label: "Agent with a production credential", note: "The coordinator" },
		{ value: "11", label: "Checks before a release is offered", note: "All must pass" },
		{ value: "22:00", label: "Nightly sweep, CET", note: "Before the next working day" },
	],
	keyMessages: [
		{ label: "Deciding and releasing are held apart", detail: "The analyst produces the disposition, the specialist remediates against it, and the coordinator releases. No agent both decides what an object becomes and puts it into production, which is the separation an auditor looks for and the one an integrated toolchain usually loses." },
		{ label: "The sandbox is where everything is proven", detail: "No remediation is ever tested in production. The specialist works against the S/4HANA sandbox with synthetic and copied data, and a version that has not passed eleven checks there cannot be offered for release." },
		{ label: "A block is an action, not a message", detail: "When the nightly sweep finds a transport reintroducing a removed pattern it refuses it in CTS and then tells the developer. Reversing the order would mean the pattern was already in the queue while the conversation happened." },
	],
	sections: [
		{
			heading: "Duties and permissions",
			paragraphs: [
				"Each agent holds the narrowest permission that lets it do its work. Where an agent needs something outside that boundary it asks, and the question reaches the named owner rather than the next available person.",
			],
			exhibit: {
				kind: "table",
				title: "No duty both resolves a disposition and reaches production",
				caption: "The four duties and their boundaries. The coordinator is the only production writer and makes one call per release.",
				source: "Target operating model · Discovery workshop",
				columns: ["Duty", "May read", "May change", "May not"],
				rows: [
					{ cells: ["Conversion coordinator", "All sources", "One CTS release per approval", "Edit code, change a disposition"], emphasis: true },
					{ cells: ["Custom code analyst", "Repository, usage, findings", "Nothing", "Transport anything"] },
					{ cells: ["Remediation specialist", "Repository, sandbox", "Sandbox objects and tests", "Reach production"] },
					{ cells: ["Readiness dashboard specialist", "Sweep results", "Dashboard under policy", "Change a transport"] },
				],
			},
		},
	],
	findings: [
		{ label: "Transport approval has no owner in the current model", detail: "It is the engagement's first question to the business. Until it is answered the coordinator asks for approval on every production transport, which is the conservative default." },
		{ label: "The dashboard publishes under policy, not under approval", detail: "Publishing the readiness dashboard to the programme board is pre-authorised under ITGC-SAP-3. It is the only production write in the design that does not wait for a person." },
	],
	nextSteps: [
		{ action: "Confirm transport approval authority or leave it as a standing question", owner: "Damian Okonkwo", due: "Week 2" },
		{ action: "Confirm ITGC-SAP-3 covers dashboard publication to the board", owner: "Anja Möller", due: "Week 2" },
	],
	citations: [
		"Target operating model · Discovery workshop",
		"Halden IT general controls · ITGC-SAP-3",
		"SAP CTS · transport authorisation review",
	],
}

const RAID_REGISTER: DeliverableBody = {
	heading: "One decision stops the analysis; everything else has an owner and a date.",
	lede: "Eleven risks, four assumptions, three issues and two decisions. The decisions are the ones that reach a person: the behaviour of the 38 exceptions, settled in this Discovery, and transport approval authority, which goes to Agentix unanswered because nobody at Halden currently holds it.",
	metrics: [
		{ value: "11", label: "Risks with a named owner", note: "None unowned" },
		{ value: "4", label: "Assumptions stated", note: "Each testable" },
		{ value: "3", label: "Open issues", note: "All with a date" },
		{ value: "2", label: "Decisions carried to Agentix", note: "Rather than assumed" },
	],
	keyMessages: [
		{ label: "The largest risk is the threshold being reopened", detail: "If disposition is argued object by object after the board sets the threshold, the 3,680-day saving is consumed by the arguing. The mitigation is that a change to the threshold is itself a board decision, not a developer's." },
		{ label: "The assumption most likely to be wrong is owner availability", detail: "The design assumes Finance Systems can walk 38 exception specifications inside a week. The programme's own history suggests that takes three. The roadmap carries the longer figure." },
		{ label: "Two decisions are carried to Agentix rather than assumed", detail: "Transport approval authority and the treatment of the 212 ownerless objects. Both are named as the engagement's first questions rather than being decided quietly by whoever configures the pipeline." },
	],
	sections: [
		{
			heading: "Register",
			paragraphs: [
				"Risks are scored on the programme's own scale. Anything above the line has a named owner and a mitigation that is an action rather than a sentiment.",
			],
			exhibit: {
				kind: "table",
				title: "Both open decisions are about authority, not about the code",
				caption: "The two decisions carried into Agentix. Neither can be resolved by evidence, which is why they travel rather than being assumed.",
				source: "RAID register v1 · Discovery workshop",
				columns: ["Ref", "Type", "Statement", "Owner", "By"],
				rows: [
					{ cells: ["D-01", "Decision", "Behaviour of the 38 standard-equivalent exceptions", "Rosa Iglesias", "This Discovery"], emphasis: true },
					{ cells: ["D-02", "Decision", "Who may approve a transport to production S/4HANA", "Unassigned", "Agentix, at activation"], emphasis: true },
					{ cells: ["R-04", "Risk", "The archive threshold is reopened object by object", "Anja Möller", "Ongoing"] },
					{ cells: ["A-02", "Assumption", "Finance Systems can walk 38 specifications in three weeks", "Rosa Iglesias", "Week 3"] },
					{ cells: ["I-01", "Issue", "212 objects in use with no named owner", "Stefan Keller", "Week 3"] },
				],
			},
		},
	],
	findings: [
		{ label: "Two decisions are carried to Agentix rather than assumed", detail: "Transport approval authority and the treatment of the 212 ownerless objects reach the engagement as its first questions. Nothing in the design guesses at either." },
		{ label: "No risk is left unowned", detail: "Eleven risks, eleven named owners. The programme's previous custom-code workstream closed with four risks owned by 'the programme'." },
	],
	nextSteps: [
		{ action: "Close D-01 at the decision point in this Discovery", owner: "Rosa Iglesias", due: "This week" },
		{ action: "Carry D-02 to Agentix as the engagement's first question", owner: "Anja Möller", due: "At handoff" },
	],
	citations: [
		"RAID register v1",
		"Halden programme risk scale v4",
		"Programme tracker · 212 objects awaiting an owner",
	],
}

const ROADMAP: DeliverableBody = {
	heading: "Disposition in three weeks, remediation on the critical path, and the gate running before the conversion weekend.",
	lede: "Three milestones to delivery. The disposition map is produced first because everything downstream is scoped by it. The remediation pipeline follows, sequencing the 604 blocking objects ahead of the rest. The readiness dashboard and the nightly gate are live before the conversion weekend, so the estate is protected from the first transport after go-live rather than from the first review.",
	metrics: [
		{ value: "3", label: "Milestones to delivery", note: "Map, pipeline, dashboard" },
		{ value: "604", label: "Objects on the critical path", note: "Sequenced first" },
		{ value: "22:00", label: "Nightly sweep, CET", note: "Live before cutover" },
		{ value: "07:00", label: "Board dashboard, CET", note: "Verified each morning" },
	],
	keyMessages: [
		{ label: "Disposition scopes everything, so it goes first", detail: "The remediation estimate, the developer allocation and the test plan are all derived from the map. Producing it first is what stops the programme committing staff to objects it will archive." },
		{ label: "The blocking objects are sequenced ahead of the estimate", detail: "604 objects carry every conversion blocker. They are remediated first regardless of how attractive the rest of the queue looks, because they are the only ones that can move the conversion date." },
		{ label: "The gate is live before the conversion, not after it", detail: "The first transport after go-live is the one most likely to reintroduce a removed pattern, because it is written under cutover pressure. The sweep runs from the week before." },
	],
	sections: [
		{
			heading: "Sequence",
			paragraphs: [
				"The plan carries the programme's own durations. Where the Discovery's estimate differs from the programme's, the longer figure is used and the difference is noted.",
			],
			exhibit: {
				kind: "timeline",
				title: "The gate is live before the conversion weekend, not after the first review",
				caption: "Weeks from handoff. The conversion weekend is the programme's fixed date; everything in this plan is sequenced to be in place before it.",
				source: "Implementation roadmap v1 · Discovery workshop with Enterprise IT",
				ticks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
				lanes: [
					{ label: "Disposition", bars: [{ label: "Map produced and approved", start: 0, span: 3, tone: "brand" }] },
					{ label: "Remediation", bars: [{ label: "604 blockers first", start: 2, span: 2, tone: "warn" }, { label: "2,078 carried forward", start: 4, span: 3 }] },
					{ label: "Adoption", bars: [{ label: "412 to standard", start: 3, span: 2 }] },
					{ label: "Gate", bars: [{ label: "Sweep and dashboard live", start: 5, span: 2, tone: "brand" }] },
				],
				markers: [{ label: "Conversion weekend", at: 7 }],
			},
		},
	],
	findings: [
		{ label: "The plan is scoped by the map, so the map cannot slip", detail: "Every downstream duration is derived from the disposition. A week lost on the map is a week lost on everything, which is why it carries the only hard date before the conversion weekend." },
		{ label: "Adoption runs in parallel with remediation", detail: "The 412 standard adoptions have no dependency on the 2,078 remediations and are worked by a different skill set. Running them in sequence would add two weeks for no reason." },
	],
	nextSteps: [
		{ action: "Confirm the conversion weekend date against this plan", owner: "Anja Möller", due: "Week 1" },
		{ action: "Allocate developers against the map rather than the ATC list", owner: "Stefan Keller", due: "Week 3" },
		{ action: "Schedule the sweep to start the week before cutover", owner: "Damian Okonkwo", due: "Week 5" },
	],
	citations: [
		"Implementation roadmap v1 · Discovery workshop with Enterprise IT",
		"Halden programme plan v7 · conversion weekend",
		"Halden change calendar · Thursday 20:00 CET transport window",
	],
}

export const S4HANA_DELIVERABLES: DeliverableBody[] = [EXECUTIVE_BRIEF, BUSINESS_CASE, PROJECT_CHARTER, PROCESS_ANALYSIS, REQUIREMENTS, TECHNICAL_ASSESSMENT, TARGET_OPERATING_MODEL, RAID_REGISTER, ROADMAP]

/*
 * Adopting standard for all 412 changes what these documents may say about the exceptions: the 38
 * change behaviour at go-live rather than being carried forward, and the 980 person-days leave the
 * estimate. Only the passages describing that decision are replaced.
 */
export const S4HANA_APPROVED_REVISIONS: Partial<Record<number, DeliverableRevision>> = {
	0: {
		findings: {
			"Thirty-eight objects change what the business sees": {
				label: "All 412 objects go to standard, and 38 behaviours change at go-live",
				detail: "Standard is adopted across the 412. The 38 exceptions change what the business sees on the day of conversion, 980 person-days leave the remediation estimate, and Agentix tests each exception against the standard rule before release.",
			},
		},
	},
	7: {
		findings: {
			"Two decisions are carried to Agentix rather than assumed": {
				label: "One decision is carried to Agentix rather than assumed",
				detail: "The behaviour of the 38 exceptions was settled in the Discovery: standard governs. Transport approval authority and the treatment of the 212 ownerless objects remain open and go to Agentix as the engagement's first questions.",
			},
		},
	},
}
