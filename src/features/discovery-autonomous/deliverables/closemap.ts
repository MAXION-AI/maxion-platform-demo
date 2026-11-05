import type { DeliverableBody, DeliverableRevision, DeliverableSection } from "./types"

// Month-end close: how it actually runs · Northstar Consulting
// A knowledge-mapping Discovery. Current state only: it designs no automation,
// builds nothing and hands nothing to Agentix. The approved package goes to
// Knowledge as eight suggestions the Controller approves one by one.
// Evidence base: Month-end close v4 in the SharePoint close folder (11 steps),
// 9,412 SAP S/4HANA P41 journal entries, 1,284 ServiceNow close tasks and 2,206
// QuickBooks Online entries for company 934771, across the last twelve closes, and
// interviews with the four people who do the work. The figures follow the
// Figures table in docs/demo-knowledge-mapping.md, so a number quoted here is the
// number the Knowledge suggestions carry. All data is synthetic.
//
// The steps people perform, numbered S-01 to S-25 in the Use case catalog, are the
// one list every document counts from: 9 match v4 and 16 are written nowhere; 11
// keep their record in P41, 3 in QuickBooks, 3 in ServiceNow, 7 in SharePoint and
// 1 in email.

const CITE = {
	procedure: "Close procedure and checklist · SharePoint Finance/Close · Month-end close v4, 11 steps · [CLOSE-V4]",
	journals: "Journal entry log · SAP S/4HANA P41 · 9,412 entries across the last 12 closes · [P41-JE-12]",
	tasks: "Close task list · ServiceNow Finance Operations · 1,284 tasks across the last 12 closes · [SN-CLOSE-12]",
	ledger: "US entity ledger · QuickBooks Online company 934771 · 2,206 entries across the last 12 closes · [QBO-934771-12]",
	interviews: "Interviews with Sarah Liu, Elena Ortiz, Luca Romano and Hannah Brooks",
}

const EXECUTIVE_BRIEF: DeliverableBody = {
	heading: "Northstar’s close has 25 steps, not the 11 its procedure names, and the steps nobody wrote down are where it runs late and where it depends on one person.",
	lede: "Sarah Liu asked MAX to map how the month-end close actually runs, current state only. MAX read the written procedure, twelve closes of the SAP journal log, the ServiceNow close task list and the US ledger in QuickBooks, and interviewed the four people who do the work. People perform 25 steps. Nine match Month-end close v4, 16 are written nowhere, and two written steps no longer happen. The close takes a median 5.5 working days against the four it is written for, and the US intercompany elimination runs from one workbook that Hannah Brooks ran in 11 of 12 closes. Nothing is built. The package goes to Knowledge as eight suggestions, and each one is published only when the Controller approves it.",
	metrics: [
		{ value: "25", label: "Steps people perform", note: "9 match v4; 16 are written nowhere" },
		{ value: "5.5 days", label: "Median close", note: "Written for 4; 9 of 12 closes ran past day 4" },
		{ value: "118", label: "Intercompany true-ups on day 4", note: "$4,812,330.17 gross across 12 closes" },
		{ value: "11 of 12", label: "Closes Hannah Brooks ran the US elimination", note: "April slipped 2 days when she was out" },
	],
	keyMessages: [
		{ label: "The procedure is accurate about what it names and silent about most of the close", detail: "Nine of the eleven written steps still happen as written. Sixteen steps people perform every month are in no document: all seven US entity steps, the four steps on day 4, two that replaced written steps, and three that coordinate the close and the flash report." },
		{ label: "The freeze is passed every month, in the open, and reviewed", detail: "The written rule freezes the ledger after day 3. The SAP journal log shows 118 intercompany true-ups posted by Group FP&A on day 4 across 12 closes, $4,812,330.17 gross, each reviewed by the Controller afterwards. The rule and the practice are each consistent. Which one is the procedure was the Controller’s call, not a fact MAX could find." },
		{ label: "The US elimination is the close’s single point of failure", detail: "It runs from one SharePoint workbook with three macros and a mapping tab only Hannah Brooks updates. She ran it in 11 of 12 closes. In April, the one close she did not run, the close slipped two days." },
	],
	sections: [
		{
			heading: "Situation",
			paragraphs: [
				"Northstar runs its group ledger on SAP S/4HANA P41 and its US entity on QuickBooks Online, company 934771. The close is coordinated as a task list in ServiceNow Finance Operations, and the written procedure lives in the SharePoint close folder as Month-end close v4: 11 steps over 4 working days.",
				"Sarah Liu, the Controller, asked for the close as it is, not as it should be: what is true, what is missing and who holds knowledge nobody else has. Her brief said “current state only, no automation design”, and MAX wrote that into the mission, so the package describes and cites. It does not propose.",
				"MAX compared every written step with what the ledgers and the task list show people did in the last twelve closes, then asked the four people who do the work about each difference.",
			],
			exhibit: {
				kind: "stack",
				title: "People perform 25 steps; the procedure names 11, and two of those no longer happen",
				caption: "Steps in Month-end close v4 against the steps people perform across the last twelve closes. The nine that match are the same steps on both rows.",
				source: "Close procedure v4 · [CLOSE-V4] · P41 journal log · ServiceNow close task list · interviews",
				unit: "steps",
				segments: [
					{ label: "Written and still done", tone: "brand" },
					{ label: "Written, no longer done", tone: "muted" },
					{ label: "Done, written nowhere", tone: "warn" },
				],
				rows: [
					{ label: "Month-end close v4", values: [9, 2, 0], note: "11 written steps" },
					{ label: "The close as performed", values: [9, 0, 16], note: "25 steps people perform" },
				],
			},
		},
		{
			heading: "Complication",
			paragraphs: [
				"Where the procedure and the practice disagree, the practice is regular, and in most cases somebody already knows. Group FP&A posts intercompany true-ups after the freeze every month, and the Controller reviews them. Finance Systems knows the bank feed replaced the manual upload. What nobody had was the whole picture in one place, with a source for each line.",
				"Two of the differences carry money or authority. The first is the day-4 true-ups: 118 of the 146 manual journals posted in SAP after day 3, worth $4,812,330.17 gross. The second is the approval threshold. v4 still says a Finance Director signs off payments and credits over $10,000, while the binding rule has said $25,000 since October 1. The September close, run in early October, followed v4 and routed 37 approvals between $10,000 and $25,000 to a Finance Director.",
				"The third difference is a person. The US elimination is in no document. It lives in Hannah Brooks’ workbook, and the one close she did not run slipped two days.",
			],
			exhibit: {
				kind: "table",
				title: "Six places where the written close and the evidence disagree, and two of them carry money or authority",
				caption: "Each row is a written statement in v4 or a step v4 omits, against what the ledgers, the task list and the interviews show.",
				source: "[CLOSE-V4] · [P41-JE-12] · [SN-CLOSE-12] · [QBO-934771-12] · interviews",
				columns: ["What v4 says", "What happens", "How often", "Where MAX saw it"],
				rows: [
					{ cells: ["No ledger changes after day 3", "Group FP&A posts intercompany true-ups on day 4; the Controller reviews them afterwards", "118 in 12 closes · $4,812,330.17 gross", "P41 journal log · Luca Romano"], emphasis: true },
					{ cells: ["A Finance Director signs off over $10,000", "The binding rule says $25,000 since Oct 1; the September close still routed by v4", "37 approvals between $10,000 and $25,000", "ServiceNow task list · Sarah Liu"], emphasis: true },
					{ cells: ["The close takes 4 working days", "It takes a median 5.5 working days", "9 of 12 closes ran past day 4", "ServiceNow task list"] },
					{ cells: ["Nothing on the US elimination", "One workbook, three macros and a mapping tab only Hannah Brooks updates", "11 of 12 closes run by her", "ServiceNow task list · Hannah Brooks"], emphasis: true },
					{ cells: ["Upload the bank statements by hand", "A bank feed loads them; the manual upload stopped in March", "Every close since March", "P41 journal log · Elena Ortiz"] },
					{ cells: ["The Controller signs the paper sheet", "Sign-off is a task in the ServiceNow close list", "No longer done", "ServiceNow task list · Sarah Liu"] },
				],
			},
		},
		{
			heading: "The decision",
			paragraphs: [
				"MAX stopped at one decision. The written rule “No ledger changes after day 3 of the close” and the day-4 practice are each consistent: the rule is approved, and the true-ups are regular and reviewed. Which one Northstar publishes as its procedure is a control decision, so it went to Sarah Liu.",
				"She kept the day-3 freeze as written. Month-end close v5 lists the four day-4 steps as they are performed and records each of the 118 true-ups as an exception to the freeze. Group FP&A owns that gap in the RAID register. The freeze rule’s v2 suggestion restates the rule as written and arrives as guidance, because a binding version would need a platform control in P41.",
				"Neither option permits the other 28 manual journals posted after day 3. They stay in the RAID register as an open question for Elena Ortiz.",
			],
			exhibit: {
				kind: "table",
				title: "Both options keep every other change frozen after day 3; they differ on whether the true-ups are a window or an exception",
				caption: "What each option would make Month-end close v5 and the freeze rule say. The evidence is the same under both.",
				source: "Exception record · [P41-JE-12] · interviews with Sarah Liu and Luca Romano",
				columns: ["Question", "Publish a controlled day-4 window", "Keep the day-3 freeze as written"],
				rows: [
					{ cells: ["Day 4 in Month-end close v5", "True-ups may post with the Controller’s approval", "Steps listed as performed, each an exception"], emphasis: true },
					{ cells: ["The 118 true-ups, $4,812,330.17", "Inside the documented window", "Recorded as exceptions to the freeze"] },
					{ cells: ["Every other change after day 3", "Stays frozen", "Stays frozen"] },
					{ cells: ["Who owns the gap", "No gap: the window is the procedure", "Group FP&A, in the RAID register"] },
					{ cells: ["The freeze rule, v2", "States the window, as guidance", "Restates the freeze, as guidance"] },
				],
			},
		},
		{
			heading: "What goes to Knowledge",
			paragraphs: [
				"Approving this package publishes nothing. MAX draws eight suggestions from the approved version, and each one cites the section of this package it came from: the procedure, the elimination and the glossary come from the Use case catalog, the systems from the Technical assessment, and the freeze rule from the decision in the RAID register. An Owner or Admin approves or withdraws each one in Knowledge, and work already running keeps the version it started with.",
			],
			bullets: [
				{ label: "Month-end close v5", detail: "Revises v4: 25 steps with an owner, a system and a source for each, the two obsolete steps removed, the approval threshold corrected to $25,000, and day 4 as the Controller decided." },
				{ label: "US intercompany elimination", detail: "A new procedure for the workbook, its three macros and the mapping tab. Visible only to Sarah Liu, Luca Romano and Hannah Brooks, as the owner asked." },
				{ label: "Key systems and who owns them v3", detail: "Adds the close task list in ServiceNow and the elimination workbook in SharePoint." },
				{ label: "No ledger changes after day 3 of the close v2", detail: "Arrives as guidance. A binding version needs a platform control in P41." },
				{ label: "Four glossary terms", detail: "Day-3 freeze, Intercompany true-up, Elimination workbook and Flash report." },
			],
		},
	],
	findings: [
		{ label: "The procedure names 9 of the 25 steps people perform", detail: "16 performed steps are written nowhere, and two written steps, the manual bank upload and the paper sign-off sheet, no longer happen." },
		{ label: "The day-4 true-ups stay an exception to the freeze", detail: "The day-3 freeze stands as written. The 118 true-ups, $4,812,330.17 gross, are recorded as exceptions to it, and Group FP&A owns the gap in the RAID register." },
		{ label: "The written approval threshold is out of date", detail: "v4 says $10,000; the binding rule says $25,000 since Oct 1. The September close, run in early October, still routed 37 approvals between $10,000 and $25,000 to a Finance Director." },
		{ label: "One person holds the US elimination", detail: "Hannah Brooks ran it in 11 of 12 closes from a workbook only she updates, and April’s close slipped two days when she was out." },
	],
	nextSteps: [
		{ action: "Approve this package version and send the eight suggestions to Knowledge", owner: "Sarah Liu, Controller", due: "At package approval" },
		{ action: "Review and publish Month-end close v5 and Key systems and who owns them v3", owner: "Sarah Liu, Controller", due: "Before the next close starts" },
		{ action: "Name who covers the US elimination when Hannah Brooks is out", owner: "Sarah Liu, Controller", due: "Before the next close starts" },
		{ action: "Say whether the freeze needs a platform control in P41 before it is published as binding", owner: "Elena Ortiz, Finance Systems Lead", due: "Before the freeze rule is published" },
	],
	citations: [CITE.procedure, CITE.journals, CITE.tasks, CITE.ledger, CITE.interviews],
}

const BUSINESS_CASE: DeliverableBody = {
	heading: "There is nothing to build and nothing to buy; the case for mapping the close is what an unknown close already costs: a day and a half late, one person deep, and approvals routed by a threshold that changed.",
	lede: "This Discovery changes no system and designs no automation, so there is no investment to appraise. The case is the cost Northstar already carries each month because its close is not written down as it runs. MAX measured that cost in days, approvals and exposure. It put no money value on it, because the evidence holds none.",
	metrics: [
		{ value: "1.5 days", label: "Median overrun per close", note: "5.5 working days against 4 written" },
		{ value: "9 of 12", label: "Closes that ran past day 4", note: "Across the last twelve months" },
		{ value: "37", label: "Approvals sent to a Finance Director", note: "September close, between $10,000 and $25,000" },
		{ value: "0", label: "Systems changed", note: "Read-only access to four sources" },
	],
	keyMessages: [
		{ label: "The cost is time and exposure, not a budget line", detail: "The close runs a median 1.5 working days past its written four, and 9 of 12 closes ran past day 4. What a late reporting pack costs Northstar is Sarah Liu’s figure to set, not an estimate MAX can evidence." },
		{ label: "One absence already showed what the dependency costs", detail: "April’s close slipped two days when Hannah Brooks was out, because the US elimination lives in her workbook and in no document." },
		{ label: "A procedure that is wrong still gets followed", detail: "The September close followed v4’s $10,000 threshold and sent 37 approvals between $10,000 and $25,000 to a Finance Director, work the binding rule no longer asks for." },
	],
	sections: [
		{
			heading: "Close length",
			paragraphs: [
				"Three of the last twelve closes finished by day 4. The other nine ran past it, and the median close took 5.5 working days. The task list shows where the days go: the US figures land after London’s day 3, and four steps on day 4 wait for them.",
			],
			exhibit: {
				kind: "bar",
				title: "Nine of the last twelve closes ran past the four days the procedure allows",
				caption: "Closes by whether the reporting pack went out by the end of day 4. The median close took 5.5 working days.",
				source: "Close task list · ServiceNow Finance Operations · [SN-CLOSE-12]",
				unit: "closes",
				data: [
					{ label: "Finished by day 4", value: 3, note: "As v4 is written" },
					{ label: "Ran past day 4", value: 9, note: "Median close 5.5 working days", emphasis: true },
				],
			},
		},
		{
			heading: "Options appraised",
			paragraphs: [
				"Three ways to get a procedure Northstar can trust were weighed. Only one is checked against what the ledgers show people did.",
			],
			exhibit: {
				kind: "table",
				title: "Only the mapped close is checked against the ledgers, and it still leaves one decision with the Controller",
				caption: "Options for getting a current procedure. No option changes a system.",
				source: "Discovery mission · owner interview with Sarah Liu",
				columns: ["Option", "What Northstar gets", "What it leaves open", "What it asks of people"],
				rows: [
					{ cells: ["Keep v4 as written", "Nothing changes", "16 steps unwritten; $10,000 threshold; one person on the US elimination", "Nothing"] },
					{ cells: ["Rewrite v4 in a workshop", "A new document from memory", "No check against the ledgers; no sources", "The four people, together"] },
					{ cells: ["Publish the mapped close to Knowledge", "25 steps with owners, systems and sources", "Cover for the US elimination still to be named", "One decision and eight approvals"], emphasis: true },
				],
			},
		},
		{
			heading: "What is not claimed",
			paragraphs: [
				"No saving is claimed and no headcount changes. The case does not assume the close gets shorter. It assumes the close becomes known: written as it runs, owned step by step and cited, so the next absence or the next audit question has an answer.",
			],
		},
	],
	findings: [
		{ label: "The close overruns most months", detail: "9 of 12 closes ran past day 4, and the median close took 5.5 working days against the 4 written." },
		{ label: "The dependency has already cost two days", detail: "April’s close slipped two days when Hannah Brooks was out." },
		{ label: "An out-of-date threshold creates work", detail: "37 approvals between $10,000 and $25,000 went to a Finance Director in the September close." },
	],
	nextSteps: [
		{ action: "Set what a late reporting pack costs Northstar, if a money view is wanted", owner: "Sarah Liu, Controller", due: "Optional; not needed for approval" },
		{ action: "Approve the package and send its suggestions to Knowledge", owner: "Sarah Liu, Controller", due: "At package approval" },
	],
	citations: [CITE.tasks, CITE.procedure, "Owner interview · Sarah Liu, Controller · her answers on why now and on success"],
}

const PROJECT_CHARTER: DeliverableBody = {
	heading: "This Discovery maps the close and builds nothing: it may read four sources and ask four people, and what it learns reaches Knowledge only through the Controller’s approval.",
	lede: "The charter records the boundaries the mission ran under. Unlike an automation Discovery, it carries no delivery mandate, so it is not part of the package: there is no engagement to start, no agent team to brief and nothing to release. It is kept so the scope and the decision owners are on record.",
	metrics: [
		{ value: "4", label: "Sources, read only", note: "SharePoint, SAP P41, ServiceNow, QuickBooks" },
		{ value: "4", label: "People interviewed", note: "Each under an approved brief" },
		{ value: "0", label: "Systems changed", note: "Nothing is built or configured" },
		{ value: "8", label: "Knowledge suggestions", note: "Each approved on its own" },
	],
	keyMessages: [
		{ label: "Current state only", detail: "The mission describes the close as it runs today. It designs no automation and proposes no target process. Sarah Liu’s brief said so, and MAX wrote it into the mission at the start." },
		{ label: "Read only, and narrower for each person", detail: "MAX read the four sources without changing them. Each interview brief carried its own grant. Hannah Brooks’ covered the close folder and not the group ledger." },
		{ label: "Publishing is a person’s decision, item by item", detail: "Approving the package publishes nothing. Each of the eight suggestions is approved or withdrawn in Knowledge, and the elimination procedure is visible only to Sarah Liu, Luca Romano and Hannah Brooks." },
	],
	sections: [
		{
			heading: "Scope and exclusions",
			paragraphs: [
				"In scope: reading Month-end close v4, twelve closes of the P41 journal log, the ServiceNow close task list and the QuickBooks ledger for company 934771; interviewing Sarah Liu, Elena Ortiz, Luca Romano and Hannah Brooks; and drafting suggestions for Knowledge.",
				"Out of scope, by decision: any automation design, any change to SAP, QuickBooks, ServiceNow or SharePoint, any handoff to Agentix, and publishing anything in Knowledge without an Owner or Admin approving it.",
			],
			exhibit: {
				kind: "table",
				title: "Every decision the mapping raises has one owner, and the Controller holds the ones about the procedure",
				caption: "Decision owners for the mission. A decision not listed here is recorded as an open question in the RAID register.",
				source: "Owner interview · Sarah Liu, Controller",
				columns: ["Decision", "Owner", "Consulted", "Escalates to"],
				rows: [
					{ cells: ["What becomes Northstar’s procedure", "Sarah Liu, Controller", "Luca Romano, Elena Ortiz", "CFO"], emphasis: true },
					{ cells: ["Day-4 true-ups: window or exception", "Sarah Liu, Controller", "Luca Romano, Group FP&A", "CFO"], emphasis: true },
					{ cells: ["Who may see the elimination procedure", "Sarah Liu, Controller", "Hannah Brooks, Luca Romano", "CFO"] },
					{ cells: ["Whether the freeze becomes a platform control", "Sarah Liu, Controller", "Elena Ortiz, Finance Systems", "CFO"] },
				],
			},
		},
		{
			heading: "Why the package has no charter",
			paragraphs: [
				"A charter is the mandate an engagement runs under. This mission ends in Knowledge, where each item carries its own approval, version and source. There is no mandate to approve, so the package leaves the charter out and keeps it here for the record.",
			],
		},
	],
	findings: [
		{ label: "No system was changed", detail: "MAX read four sources and changed none of them." },
		{ label: "The sensitive part stays with Finance", detail: "The elimination procedure is suggested as visible only to Sarah Liu, Luca Romano and Hannah Brooks." },
	],
	nextSteps: [
		{ action: "Confirm the four decision owners above", owner: "Sarah Liu, Controller", due: "At package approval" },
	],
	citations: ["Owner interview · Sarah Liu, Controller · her answers on publishing and on rules", "Interview briefs · four people, each with its own grant"],
}

/*
 * The close as people perform it, S-01 to S-25: the process map every document counts from.
 * The Use case catalog carries these sections (planning/closemap.ts), because doc 05 puts
 * current-state process maps there. The As-Is / To-Be analysis isn't selected for a mapping
 * with no to-be, so it summarises and points to the catalog instead of repeating the tables.
 */
export const CLOSE_AS_WRITTEN: DeliverableSection = {
	heading: "The close as written",
	paragraphs: [
		"Month-end close v4 sits in the SharePoint close folder and names 11 steps over 4 working days. Day 1 closes the subledgers and the banks, day 2 posts accruals and intercompany, day 3 is the Controller’s review and the Finance Director’s sign-off, and day 4 is the reporting pack to the CFO.",
		"Nine steps still happen as written. That includes the Finance Director’s sign-off over $10,000, which is performed exactly as v4 says, at a threshold the binding rule replaced on October 1.",
	],
	exhibit: {
		kind: "table",
		title: "Nine of the eleven written steps still happen as written, and two describe a close that no longer runs",
		caption: "Each v4 step against the performed step that matches it (S-numbers refer to the next table).",
		source: "Close procedure v4 · [CLOSE-V4] · [P41-JE-12] · [SN-CLOSE-12] · interviews",
		columns: ["ID", "Day", "Written step in v4", "What happens today", "Where MAX saw it"],
		rows: [
			{ cells: ["W-01", "Day 1", "Close the AP and AR subledgers", "As written (S-02)", "P41 journal log"] },
			{ cells: ["W-02", "Day 1", "Upload the bank statements to SAP by hand", "No longer done: a bank feed replaced it in March (S-03)", "P41 journal log · Elena Ortiz"], emphasis: true },
			{ cells: ["W-03", "Day 1", "Reconcile the bank accounts", "As written (S-04)", "ServiceNow task list"] },
			{ cells: ["W-04", "Day 2", "Post the month-end accruals", "As written (S-06)", "P41 journal log"] },
			{ cells: ["W-05", "Day 2", "Post the intercompany recharges", "As written (S-08)", "P41 journal log"] },
			{ cells: ["W-06", "Day 2", "Reconcile intercompany balances", "As written (S-09)", "ServiceNow task list"] },
			{ cells: ["W-07", "Day 3", "The Controller reviews the trial balance", "As written (S-10)", "ServiceNow task list · Sarah Liu"] },
			{ cells: ["W-08", "Day 3", "A Finance Director signs off payments and credits over $10,000", "As written, at a threshold the binding rule replaced on Oct 1 (S-11)", "ServiceNow task list · Sarah Liu"], emphasis: true },
			{ cells: ["W-09", "Day 3", "The Controller signs the paper sign-off sheet", "No longer done: sign-off is a ServiceNow task (S-13)", "ServiceNow task list · Sarah Liu"], emphasis: true },
			{ cells: ["W-10", "Day 4", "Prepare the reporting pack", "As written (S-23)", "ServiceNow task list"] },
			{ cells: ["W-11", "Day 4", "Send the reporting pack to the CFO", "As written; past day 4 in 9 of 12 closes (S-25)", "ServiceNow task list"] },
		],
	},
}

export const CLOSE_AS_PERFORMED: DeliverableSection = {
	heading: "The close as performed",
	paragraphs: [
		"MAX rebuilt the performed close from the task list, the two ledgers and the interviews. A step counts when it happened in the last twelve closes and someone could say who does it. Each step names one performer and the system that holds its record.",
		"The table marks the steps that drive this package’s findings. All seven of Hannah Brooks’ steps are written nowhere, and so are the four on day 4.",
	],
	exhibit: {
		kind: "table",
		title: "Of 25 steps people perform, 16 are written nowhere, including every US entity step and every step on day 4",
		caption: "The close as performed, in the order people do it. Day 3 in New York ends after London’s day 3, which is why the US results reach Group FP&A on day 4.",
		source: "[SN-CLOSE-12] · [P41-JE-12] · [QBO-934771-12] · [CLOSE-V4] · interviews",
		columns: ["ID", "Day", "Step as performed", "Who does it", "System of record", "In v4 · where MAX saw it"],
		rows: [
			{ cells: ["S-01", "Day 1", "Open the period’s close task list and assign each task", "Finance Operations, London", "ServiceNow", "Written nowhere · ServiceNow task list"] },
			{ cells: ["S-02", "Day 1", "Close the AP and AR subledgers", "Finance Operations, London", "SAP P41", "v4 step 1 · P41 journal log"] },
			{ cells: ["S-03", "Day 1", "Check the overnight bank feed loaded every account", "Finance Operations, London", "SAP P41", "Written nowhere · P41 journal log, Elena Ortiz"] },
			{ cells: ["S-04", "Day 1", "Reconcile the group bank accounts", "Finance Operations, London", "SAP P41", "v4 step 3 · ServiceNow task list"] },
			{ cells: ["S-05", "Day 1", "Close the US subledgers and reconcile the US bank accounts", "Hannah Brooks", "QuickBooks 934771", "Written nowhere · QuickBooks ledger, Hannah Brooks"] },
			{ cells: ["S-06", "Day 2", "Post the month-end accruals", "Finance Operations, London", "SAP P41", "v4 step 4 · P41 journal log"] },
			{ cells: ["S-07", "Day 2", "Post the US accruals", "Hannah Brooks", "QuickBooks 934771", "Written nowhere · QuickBooks ledger"] },
			{ cells: ["S-08", "Day 2", "Post the intercompany recharges", "Group FP&A", "SAP P41", "v4 step 5 · P41 journal log"] },
			{ cells: ["S-09", "Day 2", "Reconcile intercompany balances between group entities", "Group FP&A", "SAP P41", "v4 step 6 · ServiceNow task list"] },
			{ cells: ["S-10", "Day 3", "Review the group trial balance", "Sarah Liu", "SAP P41", "v4 step 7 · ServiceNow task list, Sarah Liu"] },
			{ cells: ["S-11", "Day 3", "Route payments and credits over $10,000 to a Finance Director", "Finance Operations; a Finance Director approves", "ServiceNow", "v4 step 8 · ServiceNow task list"], emphasis: true },
			{ cells: ["S-12", "Day 3", "Send the flash report to the CFO", "Luca Romano", "SharePoint close folder", "Written nowhere · ServiceNow task list, Luca Romano"] },
			{ cells: ["S-13", "Day 3", "Sign off the close in the task list", "Sarah Liu", "ServiceNow", "Written nowhere; replaced the paper sheet · ServiceNow task list"] },
			{ cells: ["S-14", "Day 3, New York", "Close the US period", "Hannah Brooks", "QuickBooks 934771", "Written nowhere · QuickBooks ledger"] },
			{ cells: ["S-15", "Day 3, New York", "Export the US trial balance into the elimination workbook", "Hannah Brooks", "SharePoint workbook", "Written nowhere · Hannah Brooks"] },
			{ cells: ["S-16", "Day 3, New York", "Update the mapping tab for new intercompany accounts", "Hannah Brooks", "SharePoint workbook", "Written nowhere · Hannah Brooks"], emphasis: true },
			{ cells: ["S-17", "Day 3, New York", "Run the three elimination macros", "Hannah Brooks", "SharePoint workbook", "Written nowhere · Hannah Brooks; 11 of 12 closes in the task list"], emphasis: true },
			{ cells: ["S-18", "Day 3, New York", "Send the elimination results to Group FP&A", "Hannah Brooks", "Email", "Written nowhere · Hannah Brooks, Luca Romano"], emphasis: true },
			{ cells: ["S-19", "Day 4", "Keep P41 open to intercompany postings", "Elena Ortiz", "SAP P41", "Written nowhere · Elena Ortiz, P41 journal log"] },
			{ cells: ["S-20", "Day 4", "Post the intercompany true-ups", "Group FP&A, Luca Romano", "SAP P41", "Written nowhere · P41 journal log: 118 in 12 closes"], emphasis: true },
			{ cells: ["S-21", "Day 4", "Review the true-ups after they post", "Sarah Liu", "SAP P41", "Written nowhere · P41 journal log, Luca Romano"] },
			{ cells: ["S-22", "Day 4", "Close the posting period", "Elena Ortiz", "SAP P41", "Written nowhere · P41 journal log, Elena Ortiz"] },
			{ cells: ["S-23", "After the true-ups", "Prepare the reporting pack", "Group FP&A", "SharePoint close folder", "v4 step 10 · ServiceNow task list"] },
			{ cells: ["S-24", "After the true-ups", "Reconcile the flash report to the final ledger", "Luca Romano", "SharePoint close folder", "Written nowhere · Luca Romano"] },
			{ cells: ["S-25", "After the true-ups", "Send the reporting pack to the CFO", "Sarah Liu", "SharePoint close folder", "v4 step 11 · ServiceNow task list"] },
		],
	},
}

export const WHO_PERFORMS: DeliverableSection = {
	heading: "Who performs the steps",
	paragraphs: [
		"Five people and teams perform the 25 steps. The written steps sit with the London teams and the Controller. Every step Hannah Brooks and Elena Ortiz perform is written nowhere, so the two people the close crosses through are the two the procedure does not mention.",
	],
	exhibit: {
		kind: "stack",
		title: "Every step Hannah Brooks and Elena Ortiz perform is written nowhere",
		caption: "The 25 performed steps by who performs them, split by whether v4 describes the step. Group FP&A’s steps include Luca Romano’s.",
		source: "The close as performed, S-01 to S-25 · [SN-CLOSE-12] · interviews",
		unit: "steps",
		segments: [
			{ label: "Written in v4", tone: "brand" },
			{ label: "Written nowhere", tone: "warn" },
		],
		rows: [
			{ label: "Finance Operations", values: [4, 2], note: "London · 6 steps" },
			{ label: "Hannah Brooks", values: [0, 7], note: "US Finance · 7 steps" },
			{ label: "Group FP&A", values: [3, 3], note: "Luca Romano · 6 steps" },
			{ label: "Sarah Liu", values: [2, 2], note: "Controller · 4 steps" },
			{ label: "Elena Ortiz", values: [0, 2], note: "Finance Systems · 2 steps" },
		],
	},
}

export const WHERE_THE_DAYS_GO: DeliverableSection = {
	heading: "Where the days go",
	paragraphs: [
		"The written close is four days because it is written for London alone. The US entity closes at the end of day 3 in New York, after London’s day 3 has ended. Hannah Brooks then runs the elimination and sends the results, Group FP&A posts the true-ups on day 4, and the reporting pack follows. Across twelve closes the median close took 5.5 working days.",
	],
	exhibit: {
		kind: "timeline",
		title: "The written close ends on day 4, and the performed close waits for New York before day 4 can start",
		caption: "The performed close by who works when, in working days, against v4’s four days. Positions show a typical close drawn from the task list, not any single month.",
		source: "[SN-CLOSE-12] · [QBO-934771-12] · [P41-JE-12] · interviews with Luca Romano and Hannah Brooks",
		ticks: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"],
		lanes: [
			{ label: "Written, v4", bars: [{ label: "11 steps over 4 working days", start: 0, span: 4, tone: "muted" }] },
			{ label: "Finance Operations", bars: [{ label: "Subledgers, bank, accruals", start: 0, span: 2, tone: "brand" }, { label: "Approvals", start: 2, span: 1, tone: "neutral" }] },
			{ label: "Hannah Brooks", bars: [{ label: "US close and elimination", start: 0, span: 3.3, tone: "warn" }] },
			{ label: "Group FP&A", bars: [{ label: "Recharges", start: 1, span: 1, tone: "brand" }, { label: "Flash", start: 2, span: 1, tone: "neutral" }, { label: "True-ups", start: 3.3, span: 0.9, tone: "warn" }, { label: "Pack", start: 4.2, span: 1.3, tone: "brand" }] },
			{ label: "Sarah Liu", bars: [{ label: "Review", start: 2, span: 1, tone: "brand" }, { label: "Review true-ups", start: 3.6, span: 0.6, tone: "warn" }] },
			{ label: "Elena Ortiz", bars: [{ label: "P41 held open", start: 3, span: 1.2, tone: "warn" }] },
		],
		markers: [{ label: "Day-3 freeze", at: 3 }, { label: "Median close", at: 5.5 }],
	},
}

/*
 * The words the people who run the close use, as they explained them: the Use case catalog's last
 * section. Each meaning is what a glossary suggestion carries to Knowledge, word for word
 * (organization/discoverySuggestions.ts reads GLOSSARY), so a suggestion and the passage it cites
 * can't drift apart. The freeze follows the Controller's decision, so the approved path rewrites it.
 */
export const TERMS_HEADING = "Terms the close uses"
export const GLOSSARY = {
	freeze: "The rule that nothing posts to the prior period from the third working day of the close until the Controller signs off.",
	freezeWindow: "The rule that nothing posts to the prior period from the third working day of the close until the Controller signs off, except intercompany true-ups on day 4 with the Controller’s approval.",
	trueUp: "A journal that corrects the balance between the group and the US entity once the US figures are final. Group FP&A posts them; 118 posted on day 4 over the last twelve closes.",
	workbook: "The SharePoint workbook that eliminates the US entity’s intercompany balances at close: three macros and a mapping tab, maintained by Hannah Brooks.",
	flash: "The first view of the month’s results that Group FP&A sends the CFO on day 3, before the intercompany true-ups. Group FP&A reconciles it to the final ledger once they post.",
} as const
const termParagraphs = (freeze: string) => [
	"Four words the close runs on, written down as the people who use them explained them. Month-end close v4 defines none of them.",
	`Day-3 freeze. ${freeze} From Sarah Liu’s answer on binding rules.`,
	`Intercompany true-up. ${GLOSSARY.trueUp} From Luca Romano’s answer on when the true-ups post.`,
	`Elimination workbook. ${GLOSSARY.workbook} From Hannah Brooks’ answer on how the US elimination runs.`,
	`Flash report. ${GLOSSARY.flash} From Luca Romano’s answer on the reporting pack.`,
]
export const TERMS: DeliverableSection = { heading: TERMS_HEADING, paragraphs: termParagraphs(GLOSSARY.freeze) }

const PROCESS_ANALYSIS: DeliverableBody = {
	heading: "People run the close in 25 steps; the written procedure names nine of them correctly, and the 16 it misses are the US entity, day 4 and the steps around the written ones.",
	lede: "This summarises the close as performed across the last twelve closes. The step-by-step map, S-01 to S-25 with who does each step, in which system and where MAX saw it, is in the Use case catalog with the paths those steps make. The mission designs no target process, so the to-be part of this document says only what changes in what is written. Nothing here changes what people do.",
	metrics: [
		{ value: "25", label: "Steps people perform", note: "Across the last 12 closes" },
		{ value: "9", label: "Match Month-end close v4", note: "Of its 11 written steps" },
		{ value: "16", label: "Written nowhere", note: "7 US, 4 on day 4, 5 elsewhere" },
		{ value: "2", label: "Written steps no longer done", note: "Manual bank upload, paper sign-off sheet" },
	],
	keyMessages: [
		{ label: "Nine of the eleven written steps still happen as written", detail: "Subledgers, bank reconciliation, accruals, intercompany recharges and reconciliation, the Controller’s review, the Finance Director’s sign-off, and preparing and sending the reporting pack all happen as v4 says. Two do not: a bank feed replaced the manual upload in March, and sign-off moved from a paper sheet to a ServiceNow task." },
		{ label: "The unwritten steps sit where the close crosses a boundary", detail: "All seven US entity steps run in New York, in QuickBooks and one workbook. Four day-4 steps exist because the US figures land after London’s day 3. Two replaced written steps, and three coordinate the close and the flash report." },
		{ label: "There is no to-be in this mission", detail: "Sarah Liu asked for the close as it runs. The only target here is a written procedure that matches it: Month-end close v5, suggested to Knowledge for her approval." },
	],
	sections: [
		WHERE_THE_DAYS_GO,
		{
			heading: "To-be: no target design in this mission",
			paragraphs: [
				"This mission has no to-be process. It does not redesign the close, shorten it or automate any step, and it proposes no change to who does what. That was the brief: current state only, no automation design.",
				"What changes is what is written. Month-end close v5 describes the 25 steps people already perform, with an owner, a system and a source for each. It drops the two steps that no longer happen and corrects the approval threshold to $25,000. If Northstar later wants to change how the close runs, that is a separate Discovery, and it starts from v5.",
			],
		},
	],
	findings: [
		{ label: "Every US entity step is written nowhere", detail: "Hannah Brooks performs seven steps in QuickBooks, the elimination workbook and email, and v4 mentions none of them." },
		{ label: "Four steps on day 4 are written nowhere", detail: "P41 is held open, the true-ups post, the Controller reviews them afterwards and the period closes, all after the written freeze." },
		{ label: "Two written steps describe a close that no longer runs", detail: "The manual bank upload stopped in March when a bank feed replaced it, and sign-off is a ServiceNow task, not a paper sheet." },
		{ label: "One hand-off has no system of record", detail: "The elimination results reach Group FP&A by email (S-18), so nothing but an inbox shows when the US figures arrived." },
	],
	nextSteps: [
		{ action: "Confirm the owner named for each of the 25 steps", owner: "Sarah Liu, Controller", due: "Before Month-end close v5 is published" },
		{ action: "Confirm the seven US entity steps as written here", owner: "Hannah Brooks, Senior Accountant, US Finance", due: "Before the elimination procedure is published" },
		{ action: "Confirm the four day-4 steps and when the US results usually arrive", owner: "Luca Romano, Group FP&A Manager", due: "Before Month-end close v5 is published" },
	],
	citations: [CITE.procedure, CITE.tasks, CITE.journals, CITE.ledger, "Interview with Hannah Brooks, Senior Accountant, US Finance · her answer on the elimination workbook", "Interview with Luca Romano, Group FP&A Manager · his answer on when the true-ups post"],
}

const REQUIREMENTS: DeliverableBody = {
	heading: "The published procedure has to pass the Controller’s own test: anyone on the team can open it and it matches what was done last month, and the close survives a holiday.",
	lede: "These are requirements on what Northstar publishes, not on a system. Seven were drawn from the owner interview and the evidence, and each has a check a person can run against the next close. Nothing here asks for a build.",
	metrics: [
		{ value: "7", label: "Requirements", note: "Each with a check against the next close" },
		{ value: "2", label: "From the owner’s success measure", note: "Matches last month; survives a holiday" },
		{ value: "25", label: "Steps that need an owner, system and source", note: "S-01 to S-25" },
		{ value: "0", label: "System changes required", note: "Requirements on the procedure only" },
	],
	keyMessages: [
		{ label: "The test is the Controller’s own sentence", detail: "Sarah Liu said the close is properly known when anyone on the team can open the procedure and it matches what was done last month, and when the close survives a holiday. R-05 and R-07 are those two sentences, made checkable." },
		{ label: "Every requirement can fail on the next close", detail: "Each one names what it is checked against: the next close’s journal log and task list, the binding approval rule, or who can see the restricted procedure." },
		{ label: "Day 4 follows the decision, whichever it was", detail: "R-04 asks only that v5 and the freeze rule agree with each other and with what the Controller decided. It holds under either option." },
	],
	sections: [
		{
			heading: "Requirements",
			paragraphs: [
				"Each requirement applies to the Knowledge items the package suggests, mainly Month-end close v5 and the US intercompany elimination procedure.",
			],
			exhibit: {
				kind: "table",
				title: "Every requirement names what it is checked against, so the next close can fail it",
				caption: "Requirements on the published procedure, each with its check.",
				source: "Owner interview · Sarah Liu · Use case catalog · RAID register",
				columns: ["ID", "Requirement", "Checked against", "Passes when"],
				rows: [
					{ cells: ["R-01", "Every step names who does it, the system and where it was seen", "The 25 steps in the Use case catalog", "All 25 carry an owner, a system and a source"] },
					{ cells: ["R-02", "The approval threshold matches the binding rule", "Payment approvals over $25,000 v3", "v5 says $25,000; nothing between $10,000 and $25,000 routes to a Finance Director"], emphasis: true },
					{ cells: ["R-03", "No written step that no longer happens", "Month-end close v4", "The manual bank upload and the paper sign-off sheet are gone"] },
					{ cells: ["R-04", "Day 4 says what the Controller decided", "The decision in the RAID register", "v5 and the freeze rule agree with each other and with it"] },
					{ cells: ["R-05", "A second person can run the US elimination from the procedure", "US intercompany elimination", "A named second person runs it in one close with Hannah Brooks reviewing"], emphasis: true },
					{ cells: ["R-06", "The elimination procedure is visible only to Finance", "Who can see it in Knowledge", "Sarah Liu, Luca Romano and Hannah Brooks only"] },
					{ cells: ["R-07", "The procedure matches what was done last month", "The next close’s journal log and task list", "Every performed step is in v5 and every v5 step was performed"], emphasis: true },
				],
			},
		},
		{
			heading: "What the requirements do not ask for",
			paragraphs: [
				"No requirement changes SAP, QuickBooks, ServiceNow or SharePoint. A freeze that can never be broken would need a platform control in P41. That is a system change, so it is recorded as an open question for Elena Ortiz rather than a requirement here.",
			],
		},
	],
	findings: [
		{ label: "Two requirements come straight from the owner’s success measure", detail: "R-05 and R-07 turn “survives a holiday” and “matches last month” into checks on the next close." },
		{ label: "R-05 cannot pass until someone else is named", detail: "No second person for the US elimination is named in any source today." },
	],
	nextSteps: [
		{ action: "Run R-07 against the first close after v5 is published", owner: "Sarah Liu, Controller", due: "After the next close" },
		{ action: "Name the second person R-05 needs", owner: "Sarah Liu, Controller", due: "Before the next close starts" },
	],
	citations: ["Owner interview · Sarah Liu, Controller · her answer on success", "Payment approvals over $25,000 v3 · Knowledge", CITE.tasks, CITE.journals],
}

const TECHNICAL_ASSESSMENT: DeliverableBody = {
	heading: "Four systems and one workbook hold the close’s record, and the record breaks in two places: where the US figures reach Group FP&A by email, and where the ledger accepts postings the freeze forbids.",
	lede: "This is a map of where each step keeps its record today, who owns each system, and how figures move between them. It proposes no architecture and no change. MAX read 12,902 entries and tasks across the three systems with records, plus the written procedure, and took the rest from the people who do the work.",
	metrics: [
		{ value: "4", label: "Systems in the close", note: "SAP P41, QuickBooks, ServiceNow, SharePoint" },
		{ value: "11 of 25", label: "Steps recorded in SAP P41", note: "The group ledger holds most of the record" },
		{ value: "1", label: "Hand-off with no system of record", note: "US results reach Group FP&A by email" },
		{ value: "146", label: "Manual journals after day 3", note: "Accepted by P41; the freeze is not enforced there" },
	],
	keyMessages: [
		{ label: "P41 holds most of the record, and the weakest links sit just outside it", detail: "Eleven of the 25 steps keep their record in the group ledger. The US elimination lives in a SharePoint workbook, and its results travel to Group FP&A by email, so the inputs to $4,812,330.17 of day-4 true-ups have no system of record until they post." },
		{ label: "The task list records that a step was done, not what it changed", detail: "No ServiceNow close task carries a journal reference. MAX matched tasks to journals by date and person, which is how it found who ran the US elimination in 11 of 12 closes." },
		{ label: "The freeze is a rule people follow, not a setting the ledger enforces", detail: "Elena Ortiz holds the P41 period open on day 4, so the ledger accepted 146 manual journals after day 3. A binding freeze would need a platform control. The freeze rule’s suggestion therefore arrives as guidance." },
	],
	sections: [
		{
			heading: "Systems of record",
			paragraphs: [
				"Each system below holds the record for some of the 25 steps. Owners are as Key systems and who owns them v2 names them in Knowledge. That item names no owner for the close task list or the elimination workbook, and its v3 suggestion adds both.",
			],
			exhibit: {
				kind: "table",
				title: "SAP P41 holds the record for 11 steps, and the workbook that feeds day 4 has no owner on record",
				caption: "Where each step keeps its record, who owns the system, and what MAX read. Step counts add up to the 25 in the Use case catalog.",
				source: "Key systems and who owns them v2 · Knowledge · [P41-JE-12] · [SN-CLOSE-12] · [QBO-934771-12] · [CLOSE-V4]",
				columns: ["ID", "System", "Holds for the close", "Owner", "Steps", "What MAX read"],
				rows: [
					{ cells: ["SYS-1", "SAP S/4HANA P41", "Subledgers, banks, accruals, intercompany, true-ups, posting periods", "Elena Ortiz, Finance Systems", "11", "9,412 journal entries"] },
					{ cells: ["SYS-2", "QuickBooks Online 934771", "The US subledgers, banks, accruals and period", "Sarah Liu, US Finance; worked by Hannah Brooks", "3", "2,206 entries"] },
					{ cells: ["SYS-3", "ServiceNow Finance Operations", "The close task list, approvals and the Controller’s sign-off", "Andre Reyes, IT and Finance Operations", "3", "1,284 tasks"] },
					{ cells: ["SYS-4", "SharePoint close folder", "Procedure v4, the flash report and the reporting pack", "Sarah Liu, Controller", "4", "Month-end close v4, 11 steps"] },
					{ cells: ["SYS-5", "Elimination workbook, SharePoint", "The mapping tab and three macros", "None on record; maintained by Hannah Brooks", "3", "Described by Hannah Brooks"], emphasis: true },
					{ cells: ["SYS-6", "Email", "The elimination results sent to Group FP&A", "None", "1", "Described by Hannah Brooks and Luca Romano"], emphasis: true },
				],
			},
		},
		{
			heading: "How figures move between them",
			paragraphs: [
				"The US trial balance leaves QuickBooks by export into the workbook. The workbook’s results leave by email. Group FP&A turns them into true-ups and posts them by hand in P41 on day 4. The reporting pack is built in the close folder from P41.",
				"The close task list stands apart from all of it. People mark tasks done in ServiceNow, and nothing links a task to the journal or file it produced.",
			],
			exhibit: {
				kind: "architecture",
				title: "The US figures reach the group ledger through a workbook and an inbox, and the task list connects to nothing",
				caption: "Current-state data flows only; nothing here is proposed. The dashed line is the hand-off with no system of record.",
				source: "Interviews with Hannah Brooks, Luca Romano and Elena Ortiz · [P41-JE-12] · [QBO-934771-12] · [SN-CLOSE-12]",
				lanes: ["US entity", "Group ledger", "Close record"],
				nodes: [
					{ id: "qbo", label: "QuickBooks Online", detail: "Company 934771 · 2,206 entries", lane: 0, row: 0 },
					{ id: "wb", label: "Elimination workbook", detail: "SharePoint · 3 macros", lane: 0, row: 1, tone: "warn" },
					{ id: "p41", label: "SAP S/4HANA P41", detail: "Group ledger · 9,412 entries", lane: 1, row: 1, tone: "brand" },
					{ id: "sn", label: "Close task list", detail: "ServiceNow · 1,284 tasks", lane: 2, row: 0, tone: "muted" },
					{ id: "sp", label: "Close folder", detail: "SharePoint · v4, flash, pack", lane: 2, row: 1 },
				],
				edges: [
					{ from: "qbo", to: "wb", label: "US trial balance" },
					{ from: "wb", to: "p41", label: "By email", tone: "warn", dashed: true },
					{ from: "p41", to: "sp", label: "Figures" },
				],
			},
		},
		{
			heading: "Data flows",
			paragraphs: [
				"Six flows carry the close. One is automatic, and five are moved by a person at a set point in the close.",
			],
			exhibit: {
				kind: "table",
				title: "Five of the six flows are moved by a person, and the one that feeds the true-ups goes by email",
				caption: "Every flow between the close’s systems as it runs today, with the person who moves it.",
				source: "Interviews · [P41-JE-12] · [QBO-934771-12] · [SN-CLOSE-12]",
				columns: ["ID", "From and to", "What moves", "How", "Who moves it"],
				rows: [
					{ cells: ["DF-1", "Bank to SAP P41", "Bank statements", "Overnight feed, since March", "Automatic; Elena Ortiz owns P41"] },
					{ cells: ["DF-2", "QuickBooks to the workbook", "The US trial balance", "Exported by hand, day 3 in New York", "Hannah Brooks"] },
					{ cells: ["DF-3", "Workbook to Group FP&A", "The elimination results", "Email", "Hannah Brooks"], emphasis: true },
					{ cells: ["DF-4", "Group FP&A to SAP P41", "Intercompany true-ups, 118 in 12 closes", "Manual journals, day 4", "Luca Romano’s team"], emphasis: true },
					{ cells: ["DF-5", "SAP P41 to the close folder", "Figures for the flash report and the pack", "Extracted by hand, day 3 and after", "Group FP&A"] },
					{ cells: ["DF-6", "People to ServiceNow", "Task completion and the Controller’s sign-off", "Marked by hand", "Each task’s assignee"] },
				],
			},
		},
		{
			heading: "Where each step keeps its record, by day",
			paragraphs: [
				"The record moves around the close as the day changes. Days 1, 2 and 4 live mostly in P41. Day 3 spreads across all five places, and the New York half of it sits almost entirely in SharePoint and email.",
			],
			exhibit: {
				kind: "stack",
				title: "Day 3 in New York keeps its record in a workbook and an inbox, not in either ledger",
				caption: "The 25 performed steps by close day and the system that holds each step’s record.",
				source: "Use case catalog S-01 to S-25 · systems of record above",
				unit: "steps",
				segments: [
					{ label: "SAP P41", tone: "brand" },
					{ label: "QuickBooks", tone: "neutral" },
					{ label: "ServiceNow", tone: "muted" },
					{ label: "SharePoint", tone: "warn" },
					{ label: "Email", tone: "danger" },
				],
				rows: [
					{ label: "Day 1", values: [3, 1, 1, 0, 0], note: "5 steps" },
					{ label: "Day 2", values: [3, 1, 0, 0, 0], note: "4 steps" },
					{ label: "Day 3, London", values: [1, 0, 2, 1, 0], note: "4 steps" },
					{ label: "Day 3, New York", values: [0, 1, 0, 3, 1], note: "5 steps" },
					{ label: "Day 4", values: [4, 0, 0, 0, 0], note: "4 steps" },
					{ label: "After the true-ups", values: [0, 0, 0, 3, 0], note: "3 steps" },
				],
			},
		},
		{
			heading: "Current-state technical risk",
			paragraphs: [
				"Three exposures come from how the systems are used today. The workbook is a SharePoint file, so its versions are kept, but its logic is written nowhere and its mapping tab changes without review. The email hand-off leaves no record of when the US figures arrived or which version Group FP&A used. And P41 does not enforce the freeze, so the ledger accepts any manual journal while the period is held open on day 4.",
				"None of these is designed against here, because the mission designs nothing. Each is in the RAID register with an owner, and the freeze is an open question for Elena Ortiz: a binding rule needs a platform control.",
			],
		},
	],
	findings: [
		{ label: "SAP P41 holds the record for 11 of the 25 steps", detail: "QuickBooks holds 3, ServiceNow 3, SharePoint 7 (four in the close folder, three in the workbook) and email 1." },
		{ label: "The workbook has no owner on record", detail: "Key systems and who owns them v2 names no owner for it. Hannah Brooks maintains it, and the v3 suggestion adds it." },
		{ label: "The ledger does not enforce the freeze", detail: "P41 is held open on day 4 for intercompany and accepted 146 manual journals after day 3." },
		{ label: "Tasks and journals are not linked", detail: "No ServiceNow close task carries a journal reference, so MAX matched them by date and person." },
	],
	nextSteps: [
		{ action: "Say whether P41 should enforce the freeze with a platform control", owner: "Elena Ortiz, Finance Systems Lead", due: "Before the freeze rule is published as binding" },
		{ action: "Read the posting users for the 28 manual journals after day 3 that are not true-ups", owner: "Elena Ortiz, Finance Systems Lead", due: "Within two weeks" },
		{ action: "Approve Key systems and who owns them v3 with the task list and the workbook added", owner: "Sarah Liu, Controller", due: "Before the next close starts" },
	],
	citations: [CITE.journals, CITE.tasks, CITE.ledger, CITE.procedure, "Key systems and who owns them v2 · Knowledge", "Interviews with Elena Ortiz, Luca Romano and Hannah Brooks"],
}

const TARGET_OPERATING_MODEL: DeliverableBody = {
	heading: "This mission designs no operating model; it records who decides and who does each part of the close today, and who approves what becomes Northstar’s procedure.",
	lede: "A target operating model belongs to a Discovery that changes how the close runs. This one maps it. What follows is today’s decision rights and duties, taken from the task list, the ledgers and the interviews, plus the one duty the mission adds: approving each Knowledge suggestion.",
	metrics: [
		{ value: "5", label: "People and teams performing steps", note: "Across the 25 steps" },
		{ value: "1", label: "Area with no cover named", note: "The US entity close and elimination" },
		{ value: "8", label: "Items to approve in Knowledge", note: "One at a time, by an Owner or Admin" },
	],
	keyMessages: [
		{ label: "Decision rights are clear, and cover is not", detail: "Sarah Liu decides the close, Luca Romano the intercompany and the pack, and Elena Ortiz the posting periods. Nobody is named to cover the US entity when Hannah Brooks is out." },
		{ label: "Nothing here is a proposal", detail: "The table records what happens. Changing it would be a decision for Sarah Liu, made outside this mission." },
		{ label: "The new duty is approval, not operation", detail: "The mission adds one duty: an Owner or Admin approves or withdraws each Knowledge suggestion, with its source in view." },
	],
	sections: [
		{
			heading: "Who decides and who does it today",
			paragraphs: [
				"The areas below cover all 25 performed steps. Cover is what the task list and the interviews show when the usual person is out.",
			],
			exhibit: {
				kind: "table",
				title: "Every area has a decision owner, and one has no cover",
				caption: "Today’s decision rights and duties by area of the close. Step counts add up to 25.",
				source: "[SN-CLOSE-12] · interviews · Use case catalog",
				columns: ["Area", "Decides", "Does it", "Steps", "Cover today"],
				rows: [
					{ cells: ["Task list, subledgers, banks, accruals, approval routing", "Sarah Liu", "Finance Operations, London", "6", "Within the team"] },
					{ cells: ["US entity close and elimination", "Sarah Liu", "Hannah Brooks", "7", "None named"], emphasis: true },
					{ cells: ["Intercompany, flash report and pack", "Luca Romano", "Group FP&A", "6", "Within the team"] },
					{ cells: ["Review, sign-off and sending the pack", "Sarah Liu", "Sarah Liu", "4", "Not in any document"] },
					{ cells: ["Posting periods in P41", "Elena Ortiz", "Elena Ortiz", "2", "Not in any document"] },
				],
			},
		},
		{
			heading: "Who approves knowledge",
			paragraphs: [
				"Sarah Liu approves what becomes Northstar’s procedure, and it is published in Knowledge for every project. The elimination steps stay with Finance: Sarah Liu, Luca Romano and Hannah Brooks. An approved item informs later work and grants no one any authority.",
			],
		},
	],
	findings: [
		{ label: "The US entity has no named cover", detail: "Hannah Brooks performs all seven US steps. April, the one close she did not run, slipped two days." },
		{ label: "Two areas rely on one person each", detail: "Review and sign-off sit with Sarah Liu, and posting periods with Elena Ortiz. Neither has cover in any document." },
	],
	nextSteps: [
		{ action: "Name cover for the US entity close and elimination", owner: "Sarah Liu, Controller", due: "Before the next close starts" },
	],
	citations: [CITE.tasks, "Owner interview · Sarah Liu, Controller · her answer on publishing", CITE.interviews],
}

const RAID_REGISTER: DeliverableBody = {
	heading: "The close’s live risk is a person, its issues are a procedure that fell behind, and its one decision was the Controller’s: what day 4 means.",
	lede: "The register carries what the mapping found and what Northstar has to watch. It goes to Knowledge with the package rather than to an engagement, so its owners are the people who run the close. One decision was taken at the exception. The key-person risk is live today, and every open question names who would know.",
	metrics: [
		{ value: "1", label: "Decision", note: "Taken by the Controller at the exception" },
		{ value: "3", label: "Risks", note: "The key-person risk is live today" },
		{ value: "4", label: "Issues", note: "Three fixed by publishing v5" },
		{ value: "5", label: "Open questions", note: "Each names who would know" },
	],
	keyMessages: [
		{ label: "The key-person risk has already happened once", detail: "Hannah Brooks ran the US elimination in 11 of 12 closes, from a workbook with three macros and a mapping tab only she updates. In April, the one close she did not run, the close slipped two days." },
		{ label: "Three of the four issues are fixed by publishing what is true", detail: "The $10,000 threshold, the two steps that no longer happen and the 16 unwritten steps all close when Month-end close v5 is published. The fourth, 28 manual journals after day 3 that are not true-ups, needs Elena Ortiz to read who posted them." },
		{ label: "The decision is recorded with its evidence", detail: "118 intercompany true-ups posted on day 4 across 12 closes, $4,812,330.17 gross. The Controller decided whether they are a window or an exception, and both options keep every other change frozen after day 3." },
	],
	sections: [
		{
			heading: "Register",
			paragraphs: [
				"The register below goes to Knowledge with the package. Issues marked as fixed in v5 close when Sarah Liu publishes it.",
			],
			exhibit: {
				kind: "table",
				title: "The one live risk is a person, and three of the four issues close when v5 is published",
				caption: "Risks, assumptions, issues and the decision, each with an owner. Open questions follow below.",
				source: "Discovery register · [P41-JE-12] · [SN-CLOSE-12] · [QBO-934771-12] · [CLOSE-V4] · interviews",
				columns: ["Type", "Item", "Owner", "Status"],
				rows: [
					{ cells: ["Decision", "Day-4 true-ups: a controlled window or an exception to the freeze (118, $4,812,330.17 gross)", "Sarah Liu", "Decided at the exception"], emphasis: true },
					{ cells: ["Risk", "The US elimination runs on one person and one workbook; 11 of 12 closes", "Sarah Liu", "Live; April slipped 2 days"], emphasis: true },
					{ cells: ["Risk", "Only Hannah Brooks updates the mapping tab", "Hannah Brooks", "Live; procedure suggested"] },
					{ cells: ["Risk", "The freeze is a rule, not a control; P41 accepts postings after day 3", "Elena Ortiz", "Open; rule suggested as guidance"] },
					{ cells: ["Issue", "v4 says $10,000; the binding rule says $25,000; 37 approvals in the September close", "Sarah Liu", "Fixed in v5"], emphasis: true },
					{ cells: ["Issue", "Two written steps no longer happen: manual bank upload, paper sign-off sheet", "Sarah Liu", "Fixed in v5"] },
					{ cells: ["Issue", "16 performed steps are written nowhere", "Sarah Liu", "Fixed in v5"] },
					{ cells: ["Issue", "28 manual journals after day 3 are not true-ups; neither option permits them", "Elena Ortiz", "Open"] },
					{ cells: ["Assumption", "The last 12 closes show how the close runs", "Sarah Liu", "Checked at the next close"] },
					{ cells: ["Assumption", "A completed ServiceNow task names the person who did the work", "Sarah Liu", "Confirmed for the US steps by Hannah Brooks"] },
				],
			},
		},
		{
			heading: "Risk: the US elimination runs on one person",
			paragraphs: [
				"The US intercompany elimination is the step the close cannot do without and the one nobody else can do. It runs from one SharePoint workbook. Hannah Brooks exports the US trial balance into it, keeps its mapping tab current, runs its three macros and emails the results to Group FP&A. She ran it in 11 of 12 closes. In April she was out, and the close slipped two days.",
				"The mitigation in this package is to write it down. The US intercompany elimination procedure is suggested to Knowledge, visible only to Sarah Liu, Luca Romano and Hannah Brooks. A written procedure is not cover, though. Until a second person has run it once, the risk stays live.",
			],
			exhibit: {
				kind: "table",
				title: "Every part of the US elimination is held by one person and written nowhere",
				caption: "The parts of the elimination as Hannah Brooks described them, with who runs or updates each today.",
				source: "Interview with Hannah Brooks · her answer on the elimination workbook · [SN-CLOSE-12]",
				columns: ["Part", "What it does", "Who runs or updates it", "Written down"],
				rows: [
					{ cells: ["Mapping tab", "Maps US QuickBooks accounts to the group’s intercompany accounts", "Hannah Brooks only", "Nowhere"], emphasis: true },
					{ cells: ["Three macros", "Turn the US trial balance into the elimination results", "Hannah Brooks, 11 of 12 closes", "Nowhere"], emphasis: true },
					{ cells: ["Results hand-off", "Sends the results to Group FP&A", "Hannah Brooks, by email", "Nowhere"] },
					{ cells: ["The workbook file", "Holds the tab and the macros in the close folder", "Maintained by Hannah Brooks", "Not in Key systems v2"] },
				],
			},
		},
		{
			heading: "Decided in Discovery",
			paragraphs: [
				"D-01 was the exception raised during synthesis. The written rule freezes the ledger after day 3. The journal log shows 118 intercompany true-ups posted on day 4 across 12 closes, $4,812,330.17 gross, each reviewed by the Controller afterwards.",
				"Sarah Liu kept the day-3 freeze as written. The 118 true-ups are recorded as exceptions to it, and Group FP&A owns the gap: Luca Romano carries it in this register until the rule or the practice changes. Every other change after day 3 stays frozen.",
			],
			exhibit: {
				kind: "bar",
				title: "118 of the 146 manual journals after day 3 are intercompany true-ups, and the other 28 fall outside both options",
				caption: "Manual journals posted in P41 after day 3 across the last twelve closes. The decision covers the true-ups only.",
				source: "Journal entry log · SAP S/4HANA P41 · [P41-JE-12]",
				unit: "journals",
				data: [
					{ label: "Intercompany true-ups, day 4", value: 118, note: "$4,812,330.17 gross", emphasis: true },
					{ label: "Other manual journals", value: 28, note: "Neither option permits these" },
				],
			},
		},
		{
			heading: "Issues: where v4 fell behind",
			paragraphs: [
				"The approval threshold moved to $25,000 on October 1, and v4 still says $10,000. The September close ran in early October and followed v4, so 37 approvals between $10,000 and $25,000 went to a Finance Director. In Knowledge the same mismatch is already open as the conflict “Two approval thresholds”, and publishing v5 resolves it.",
				"Two written steps describe a close that no longer runs. A bank feed replaced the manual bank upload in March, and sign-off is a ServiceNow task rather than the paper sheet. Sixteen performed steps are written nowhere. v5 writes all 25 down with an owner each.",
			],
		},
		{
			heading: "Open questions",
			paragraphs: [
				"Each question names the person who would know. None of them blocks publishing v5.",
			],
			bullets: [
				{ label: "Who covers the US elimination when Hannah Brooks is out?", detail: "Sarah Liu decides. Besides her and Hannah Brooks, Luca Romano is the only person the restricted procedure would be visible to." },
				{ label: "Who posted the 28 other manual journals after day 3, and were they reviewed?", detail: "Elena Ortiz can read the posting users in P41." },
				{ label: "Should P41 enforce the freeze?", detail: "Elena Ortiz owns the posting periods. A binding freeze rule needs a platform control." },
				{ label: "What do the macros do with an account missing from the mapping tab?", detail: "Hannah Brooks." },
				{ label: "When did the paper sign-off sheet stop?", detail: "Sarah Liu. The task list shows only that it no longer happens." },
			],
		},
	],
	findings: [
		{ label: "The key-person risk is live today", detail: "Hannah Brooks ran the US elimination in 11 of 12 closes, and the one close she did not run slipped two days." },
		{ label: "The day-4 true-ups are exceptions owned by Group FP&A", detail: "The day-3 freeze stands as written. The 118 true-ups, $4,812,330.17 gross, are recorded as exceptions to it, and Luca Romano carries the gap here." },
		{ label: "Three of four issues close with v5", detail: "The threshold, the two obsolete steps and the 16 unwritten steps are fixed when Month-end close v5 is published. The 28 other journals need Elena Ortiz." },
	],
	nextSteps: [
		{ action: "Name who covers the US elimination when Hannah Brooks is out", owner: "Sarah Liu, Controller", due: "Before the next close starts" },
		{ action: "Read the posting users for the 28 other manual journals after day 3", owner: "Elena Ortiz, Finance Systems Lead", due: "Within two weeks" },
		{ action: "Write the mapping tab rules into the elimination procedure", owner: "Hannah Brooks, Senior Accountant, US Finance", due: "Before the procedure is published" },
	],
	citations: [CITE.journals, CITE.tasks, CITE.ledger, CITE.procedure, "Interview with Hannah Brooks, Senior Accountant, US Finance · her answer on the elimination workbook", "Interview with Luca Romano, Group FP&A Manager · his answer on the true-ups", "Two approval thresholds · open conflict in Knowledge"],
}

const ROADMAP: DeliverableBody = {
	heading: "Nothing is built, so the roadmap keeps the procedure true: publish what was found, prove it on the next close, then keep it current after every close.",
	lede: "There is no delivery to sequence. The three checkpoints are about the procedure. Northstar approves the eight suggestions, the first close after v5 tests whether it matches what people did, and each close after that keeps it current. A second person running the US elimination is the one checkpoint that depends on someone being named.",
	metrics: [
		{ value: "3", label: "Checkpoints", note: "Publish, prove, keep current" },
		{ value: "8", label: "Suggestions to approve", note: "Each on its own" },
		{ value: "1", label: "Close as the test", note: "The first close after v5" },
	],
	keyMessages: [
		{ label: "Publishing comes first because everything else reads it", detail: "Every later Discovery or agent run reads the published version. Until v5 is approved, they read v4 with its $10,000 threshold." },
		{ label: "The next close is the test", detail: "The first close after v5 should match it step for step. A step performed but missing from v5, or written but not performed, is a correction to v5, not a failure of the close." },
		{ label: "Cover is the slowest checkpoint", detail: "A second person has to run the US elimination once with Hannah Brooks reviewing. That needs someone named first." },
	],
	sections: [
		{
			heading: "Checkpoints",
			paragraphs: [
				"The checkpoints follow the close calendar rather than a delivery plan. The second waits for a close to happen, so it cannot be hurried.",
			],
			exhibit: {
				kind: "timeline",
				title: "The procedure is published before the next close and proved by it, and cover takes the longest",
				caption: "The three checkpoints, with cover for the US elimination alongside them.",
				source: "Discovery package · RAID register · requirements",
				ticks: ["This week", "Before the close", "Next close", "After it"],
				lanes: [
					{ label: "1 Publish", bars: [{ label: "Eight approvals", start: 0, span: 1.5, tone: "brand" }] },
					{ label: "2 Prove", bars: [{ label: "Next close against v5", start: 2, span: 1, tone: "brand" }] },
					{ label: "3 Keep current", bars: [{ label: "After every close", start: 3, span: 1, tone: "muted" }] },
					{ label: "Cover", bars: [{ label: "Second person runs it", start: 1, span: 2, tone: "warn" }] },
				],
				markers: [{ label: "v5 published", at: 1.5 }],
			},
		},
	],
	findings: [
		{ label: "Nothing in the roadmap changes a system", detail: "Each checkpoint is an approval, a comparison or a person learning a step." },
		{ label: "Cover depends on a name", detail: "No second person for the US elimination is named in any source." },
	],
	nextSteps: [
		{ action: "Approve the eight suggestions in Knowledge", owner: "Sarah Liu, Controller", due: "Before the next close starts" },
		{ action: "Compare the next close with v5 and correct what differs", owner: "Sarah Liu, Controller", due: "After the next close" },
	],
	citations: ["Discovery package · this version", "Owner interview · Sarah Liu, Controller · her answer on success", CITE.tasks],
}

export const CLOSEMAP_DELIVERABLES: DeliverableBody[] = [EXECUTIVE_BRIEF, BUSINESS_CASE, PROJECT_CHARTER, PROCESS_ANALYSIS, REQUIREMENTS, TECHNICAL_ASSESSMENT, TARGET_OPERATING_MODEL, RAID_REGISTER, ROADMAP]

/*
 * Publishing a controlled day-4 window changes what these documents may say about the freeze:
 * the true-ups stop being exceptions and become a documented window, and the gap Group FP&A
 * would have owned closes with v5. Only the passages describing that decision are replaced; the
 * exhibits set out both options and read the same either way.
 */
export const CLOSEMAP_APPROVED_REVISIONS: Partial<Record<number, DeliverableRevision>> = {
	0: {
		sections: {
			"The decision": [
				"MAX stopped at one decision. The written rule “No ledger changes after day 3 of the close” and the day-4 practice are each consistent: the rule is approved, and the true-ups are regular and reviewed. Which one Northstar publishes as its procedure is a control decision, so it went to Sarah Liu.",
				"She chose to publish a controlled day-4 intercompany window. Month-end close v5 and the freeze rule’s v2 suggestion say what happens: intercompany true-ups may post on day 4 with the Controller’s approval, and every other change after day 3 stays frozen. The 118 true-ups stop being exceptions. The freeze rule arrives as guidance, because a binding version would need a platform control in P41.",
				"The window covers intercompany true-ups only. The other 28 manual journals posted after day 3 stay outside it, in the RAID register as an open question for Elena Ortiz.",
			],
		},
		findings: {
			"The day-4 true-ups stay an exception to the freeze": {
				label: "The day-4 true-ups become a controlled window",
				detail: "Intercompany true-ups may post on day 4 with the Controller’s approval, and every other change after day 3 stays frozen. Month-end close v5 and the freeze rule’s suggestion both say so.",
			},
		},
	},
	7: {
		sections: {
			"Decided in Discovery": [
				"D-01 was the exception raised during synthesis. The written rule freezes the ledger after day 3. The journal log shows 118 intercompany true-ups posted on day 4 across 12 closes, $4,812,330.17 gross, each reviewed by the Controller afterwards.",
				"Sarah Liu chose to publish a controlled day-4 intercompany window. True-ups may post on day 4 with the Controller’s approval, and every other change after day 3 stays frozen. Month-end close v5 and the freeze rule’s suggestion both say so, and the gap closes when v5 is published.",
			],
		},
		findings: {
			"The day-4 true-ups are exceptions owned by Group FP&A": {
				label: "The day-4 true-ups have a controlled window",
				detail: "True-ups may post on day 4 with the Controller’s approval, and every other change after day 3 stays frozen. The 118 true-ups, $4,812,330.17 gross, are no longer exceptions once v5 is published.",
			},
		},
	},
	10: {
		sections: {
			[TERMS_HEADING]: termParagraphs(GLOSSARY.freezeWindow),
			"UC-03: Day-4 intercompany true-up": [
				"Starts when the US elimination results reach Group FP&A after the US period closes in New York, and ends when Elena Ortiz closes the P41 posting period on day 4. Inputs are the elimination results and the group intercompany balances. Outputs are the true-ups in P41 and the Controller’s review of them. Across 12 closes this path posted 118 true-ups, $4,812,330.17 gross.",
				"Sarah Liu chose a controlled day-4 intercompany window, so Month-end close v5 documents this path as the window: true-ups may post on day 4 with the Controller’s approval, and every other change after day 3 stays frozen.",
			],
		},
		findings: {
			"The day-4 path is recorded as an exception to the freeze": {
				label: "The day-4 path is a controlled window",
				detail: "UC-03 runs as v5 documents it: true-ups may post on day 4 with the Controller’s approval. The steps are the same; what changed is what is written.",
			},
		},
	},
}
