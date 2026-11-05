import { CLOSE_AS_PERFORMED, CLOSE_AS_WRITTEN, TERMS, WHERE_THE_DAYS_GO, WHO_PERFORMS } from "../closemap"
import type { DeliverableBody } from "../types"

// Northstar month-end close mapping: the project plan and the use case catalog.
// This Discovery builds nothing, so the plan's work is publishing and proving the
// procedure. The catalog is the package's process map (doc 05 puts current-state
// maps there): the 25 steps people perform, S-01 to S-25, and the six paths they
// make, with the terms the people who run the close use. The procedure, the
// elimination and the glossary suggestions cite it. Values the package does not
// settle are written as "Open:" with the person who would settle them.

export const WBS: DeliverableBody = {
	heading: "Eleven work packages take the package into Knowledge and prove it on the next close, and none of them changes a system.",
	lede: "The plan has three phases, each broken into packages with one owner, a dependency and a check that ends each one. The package version is approved first, the eight suggestions are reviewed in Knowledge, and the first close after v5 tests whether it matches what people did. Cover for the US elimination runs alongside, because it needs a person named before it can start.",
	metrics: [
		{ value: "11", label: "Work packages", note: "Each with one owner and an exit check" },
		{ value: "8", label: "Suggestions reviewed in Knowledge", note: "WBS-2.1 to WBS-2.4" },
		{ value: "0", label: "System changes", note: "Approvals, comparisons and one handover" },
	],
	keyMessages: [
		{ label: "Approval comes first because the suggestions come from one exact version", detail: "WBS-1.1 approves the package version. Each suggestion cites a passage of that version, so nothing can be sent to Knowledge before it." },
		{ label: "The next close is the test, and it cannot be hurried", detail: "WBS-3.3 compares the first close after v5 with its 25 steps. It waits for the close to happen, whatever else is done." },
		{ label: "Cover for the US elimination is the longest thread", detail: "WBS-3.1 names a second person and WBS-3.2 has them run the three macros once with Hannah Brooks reviewing. Until then the key-person risk stays live." },
	],
	sections: [
		{
			heading: "Work breakdown",
			paragraphs: [
				"The three phases are the package, then Knowledge, then the next close. Every package is a person’s work. MAX drafted the suggestions and does nothing further until someone approves.",
				"Weeks count from package approval. The next close’s position is indicative, because it follows Northstar’s close calendar.",
			],
			exhibit: {
				kind: "table",
				title: "Nothing reaches Knowledge before the package version is approved, and the proof waits for the next close",
				caption: "Eleven work packages with one owner, their dependencies and the check that ends each one.",
				source: "RAID register · Requirements specification · Technical assessment · Use case catalog",
				columns: ["ID", "Work package", "Owner", "Depends on", "Due", "Exit criterion"],
				rows: [
					{ cells: ["WBS-1.1", "Approve the package version", "Sarah Liu", "None", "At package approval", "The version, the manifest and each document’s hash recorded"], emphasis: true },
					{ cells: ["WBS-1.2", "Send the eight suggestions to Knowledge", "Sarah Liu", "WBS-1.1", "At package approval", "8 suggestions waiting, each citing the passage it came from"] },
					{ cells: ["WBS-2.1", "Review Key systems and who owns them v3", "Sarah Liu", "WBS-1.2", "Week 1", "Published or withdrawn; v3 names the close task list and the elimination workbook"] },
					{ cells: ["WBS-2.2", "Review Month-end close v5", "Sarah Liu", "WBS-1.2", "Week 1", "25 steps with owners; $25,000 threshold; conflict “Two approval thresholds” resolved"], emphasis: true },
					{ cells: ["WBS-2.3", "Review the US intercompany elimination procedure", "Sarah Liu", "WBS-1.2", "Week 1", "Visible only to Sarah Liu, Luca Romano and Hannah Brooks"] },
					{ cells: ["WBS-2.4", "Review the freeze rule v2 and the four glossary terms", "Sarah Liu", "WBS-1.2", "Week 2", "Each published or left waiting; the freeze rule stays guidance"] },
					{ cells: ["WBS-2.5", "Say whether P41 should enforce the freeze", "Elena Ortiz", "WBS-1.2", "Week 2", "Answer recorded on the freeze rule; a binding rule needs a platform control"] },
					{ cells: ["WBS-3.1", "Name a second person for the US elimination", "Sarah Liu", "WBS-2.3", "Week 2", "Named; if outside the three, Sarah Liu widens who can see the procedure"], emphasis: true },
					{ cells: ["WBS-3.2", "Run the US elimination with the second person", "Hannah Brooks", "WBS-3.1", "Next close", "The second person runs the three macros and updates the mapping tab; Hannah Brooks reviews"] },
					{ cells: ["WBS-3.3", "Compare the next close with v5", "Sarah Liu", "WBS-2.2", "After the next close", "Every performed step is in v5 and every v5 step was performed"], emphasis: true },
					{ cells: ["WBS-3.4", "Read who posted the 28 other manual journals after day 3", "Elena Ortiz", "None", "Week 2", "Each of the 28 has a posting user and a reviewer, or is raised with Sarah Liu"] },
				],
			},
		},
		{
			heading: "Sequence",
			paragraphs: [
				"Knowledge reviews take the first two weeks. The second person can start learning the workbook once the procedure is published, but the handover itself waits for the next close, and so does the comparison with v5.",
				"Open: the date of the next close. Sarah Liu confirms it from the close calendar.",
			],
			exhibit: {
				kind: "timeline",
				title: "The suggestions are reviewed in two weeks, and the next close proves both v5 and the cover",
				caption: "Work packages by phase in weeks from package approval, with the next close as the proof point.",
				source: "RAID register · Requirements specification",
				ticks: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"],
				lanes: [
					{ label: "1 Package", bars: [{ label: "WBS-1.1, 1.2", start: 0, span: 0.5, tone: "muted" }] },
					{ label: "2 Knowledge", bars: [{ label: "WBS-2.1 to 2.5", start: 0.5, span: 1.5, tone: "brand" }] },
					{ label: "3 Cover", bars: [{ label: "WBS-3.1, 3.2", start: 1, span: 4, tone: "warn" }] },
					{ label: "3 Journals", bars: [{ label: "WBS-3.4", start: 1, span: 1, tone: "muted" }] },
					{ label: "3 Next close", bars: [{ label: "WBS-3.3", start: 4, span: 1, tone: "brand" }] },
				],
				markers: [{ label: "Next close", at: 4 }],
			},
		},
		{
			heading: "What the plan depends on",
			paragraphs: [
				"The dependencies are about people and the close calendar. The technical assessment found nothing to build, so nothing technical holds the plan.",
			],
			bullets: [
				{ label: "The decision recorded in the RAID register", detail: "WBS-2.2 and WBS-2.4 publish what the Controller decided about the 118 day-4 true-ups. Both packages are the same under either option." },
				{ label: "A name for cover", detail: "WBS-3.2 cannot start until WBS-3.1 names someone. Luca Romano is the only person besides Sarah Liu and Hannah Brooks who can see the procedure without widening it." },
				{ label: "The next close", detail: "WBS-3.2 and WBS-3.3 both need the next close to happen. Neither can finish early." },
				{ label: "The 28 other journals", detail: "WBS-3.4 depends on nothing else, and its answer may add an open question to v5." },
			],
		},
	],
	findings: [
		{ label: "One package proves the procedure", detail: "WBS-3.3 compares the next close with v5. Until it passes, v5 is what people said and the ledgers showed, not yet what a close followed." },
		{ label: "The key-person risk stays live until WBS-3.2", detail: "Writing the procedure down is not cover. A second person has to run it once." },
		{ label: "Approving v5 resolves a conflict already open in Knowledge", detail: "WBS-2.2 corrects the threshold to $25,000, which closes “Two approval thresholds”." },
	],
	nextSteps: [
		{ action: "Approve the package version and send the suggestions", owner: "Sarah Liu, Controller", due: "At package approval" },
		{ action: "Name the second person for the US elimination", owner: "Sarah Liu, Controller", due: "Week 2" },
		{ action: "Read who posted the 28 other manual journals after day 3", owner: "Elena Ortiz, Finance Systems Lead", due: "Week 2" },
	],
	citations: [
		"Requirements specification · this package",
		"Discovery register · RAID register, this package",
		"Close task list · ServiceNow Finance Operations · 1,284 tasks across the last 12 closes · [SN-CLOSE-12]",
		"Journal entry log · SAP S/4HANA P41 · 9,412 entries across the last 12 closes · [P41-JE-12]",
	],
}

export const CATALOG: DeliverableBody = {
	heading: "People run the close in 25 steps along six paths; the written procedure names nine of the steps, and the paths it misses are the US entity, day 4 and two exceptions nobody owns.",
	lede: "This is the close as people perform it across the last twelve closes: the 25 steps, who does each one, in which system and where MAX saw it, then the six paths those steps make, each with a start, an end and the rule or output that governs every step. It describes the close as performed and proposes nothing, so every path is Current or Unresolved. Where the evidence leaves a rule unsettled, the step says Open and names who settles it.",
	metrics: [
		{ value: "25", label: "Steps people perform", note: "S-01 to S-25; 9 match v4, 16 written nowhere" },
		{ value: "118", label: "Day-4 true-ups in 12 closes", note: "$4,812,330.17 gross, covered by UC-03" },
		{ value: "28", label: "Other manual journals after day 3", note: "Unresolved in UC-06" },
	],
	keyMessages: [
		{ label: "The written procedure covers parts of two paths", detail: "The nine steps v4 still describes sit in UC-01, the group close, and UC-04, approvals. UC-02, the US entity, and UC-03, day 4, are written nowhere." },
		{ label: "The exception paths are where nobody is named", detail: "UC-05 is the close when Hannah Brooks is out, which April showed costs two days. UC-06 is a manual journal after day 3 that is not a true-up. Neither has an owner in any document." },
		{ label: "Each step says where an unknown stays", detail: "What a rejected true-up does, what the macros do with an unmapped account and who reassigns a task are not in the evidence, so each is marked Open at the step it affects." },
	],
	sections: [
		{
			heading: "Catalog",
			paragraphs: [
				"Current means the path runs today. Unresolved means it happens, or has happened, and a named person must settle how it should run. Nothing is Proposed, because this mission designs nothing.",
			],
			exhibit: {
				kind: "table",
				title: "Four paths run every month, and the two Unresolved ones are where the close has no named owner",
				caption: "Six use cases by trigger, accountable actor and status, as the close runs today.",
				source: "The close as performed, below · Technical assessment · RAID register",
				columns: ["ID", "Use case", "Trigger", "Accountable actor", "Status"],
				rows: [
					{ cells: ["UC-01", "Group close, main path", "The period ends; day 1 of the close", "Sarah Liu", "Current"] },
					{ cells: ["UC-02", "US entity close and elimination", "The period ends in New York", "Hannah Brooks", "Current"] },
					{ cells: ["UC-03", "Day-4 intercompany true-up", "The US elimination results reach Group FP&A", "Luca Romano", "Current"], emphasis: true },
					{ cells: ["UC-04", "Approval of payments and credits at close", "A payment or credit over the written threshold", "A Finance Director", "Current"] },
					{ cells: ["UC-05", "The close when Hannah Brooks is out", "Hannah Brooks is away for the close", "Sarah Liu", "Unresolved"], emphasis: true },
					{ cells: ["UC-06", "Manual journal after day 3 that is not a true-up", "A manual journal posts to P41 after day 3", "Elena Ortiz", "Unresolved"], emphasis: true },
				],
			},
		},
		CLOSE_AS_WRITTEN,
		CLOSE_AS_PERFORMED,
		WHO_PERFORMS,
		WHERE_THE_DAYS_GO,
		{
			heading: "UC-01: Group close, main path",
			paragraphs: [
				"Starts on day 1 when Finance Operations opens the period’s close task list, and ends when Sarah Liu sends the reporting pack to the CFO. Inputs are the subledgers, the bank feed and the accruals. Outputs are the reviewed trial balance, the flash report and the reporting pack.",
				"This path holds eight of the nine steps v4 still describes; the ninth is the approval in UC-04. Across 12 closes it took a median 5.5 working days, and 9 of 12 closes ran past day 4.",
			],
			exhibit: {
				kind: "table",
				title: "The main path follows v4 until day 3 and then waits for the US figures before the pack can go",
				caption: "Steps of the group close as performed, condensed. The US steps are in UC-02 and the approvals in UC-04.",
				source: "The close as performed, above · [SN-CLOSE-12] · [P41-JE-12] · [CLOSE-V4]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-01.1", "Finance Operations", "Open the close task list and assign each task", "ServiceNow, day 1; written nowhere", "Open: who reassigns a task when its owner is out. Sarah Liu settles"] },
					{ cells: ["UC-01.2", "Finance Operations", "Close the subledgers, check the bank feed and reconcile the banks", "SAP P41, day 1; the manual upload stopped in March", "Open: the fallback if the feed misses an account. Elena Ortiz settles"] },
					{ cells: ["UC-01.3", "Finance Operations and Group FP&A", "Post accruals and recharges; reconcile intercompany", "SAP P41, day 2, as v4 says", "Intercompany differences wait for the day-4 true-ups in UC-03"] },
					{ cells: ["UC-01.4", "Sarah Liu", "Review the trial balance and sign off in the task list", "Day 3; no paper sheet; the freeze applies from here", "A change after sign-off goes to UC-03 or UC-06"], emphasis: true },
					{ cells: ["UC-01.5", "Group FP&A", "Send the flash report, then prepare the pack and reconcile flash to final", "SharePoint close folder, day 3 and after the true-ups", "The pack moves when the true-ups move"] },
					{ cells: ["UC-01.6", "Sarah Liu", "Send the reporting pack to the CFO", "Written for day 4; median close 5.5 working days", "Past day 4 in 9 of 12 closes"] },
				],
			},
		},
		{
			heading: "UC-02: US entity close and elimination",
			paragraphs: [
				"Starts when the period ends in New York, and ends when Hannah Brooks emails the elimination results to Group FP&A. Inputs are the QuickBooks ledger for company 934771 and the workbook’s mapping tab. Output is the set of elimination results that UC-03 posts.",
				"All seven steps on this path are written nowhere. Hannah Brooks ran it in 11 of 12 closes.",
			],
			exhibit: {
				kind: "table",
				title: "The US path runs from one ledger through one workbook to one inbox, and only one person runs it",
				caption: "Steps of the US entity close as performed, S-05, S-07 and S-14 to S-18.",
				source: "Interview with Hannah Brooks · [QBO-934771-12] · [SN-CLOSE-12]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-02.1", "Hannah Brooks", "Close the US subledgers, reconcile the US banks and post US accruals", "QuickBooks 934771, days 1 and 2", "She is out: UC-05"] },
					{ cells: ["UC-02.2", "Hannah Brooks", "Close the US period", "End of day 3 in New York, after London’s day 3", "This is why the true-ups land on day 4"] },
					{ cells: ["UC-02.3", "Hannah Brooks", "Export the US trial balance and update the mapping tab", "Into the SharePoint workbook; only she updates the tab", "Open: what happens to an unmapped account. Hannah Brooks settles"], emphasis: true },
					{ cells: ["UC-02.4", "Hannah Brooks", "Run the three elimination macros", "11 of 12 closes run by her", "She is out: UC-05"], emphasis: true },
					{ cells: ["UC-02.5", "Hannah Brooks", "Send the results to Group FP&A", "By email; no system holds the hand-off", "Late results move UC-03 and the pack"] },
				],
			},
		},
		{
			heading: "UC-03: Day-4 intercompany true-up",
			paragraphs: [
				"Starts when the US elimination results reach Group FP&A after the US period closes in New York, and ends when Elena Ortiz closes the P41 posting period on day 4. Inputs are the elimination results and the group intercompany balances. Outputs are the true-ups in P41 and the Controller’s review of them. Across 12 closes this path posted 118 true-ups, $4,812,330.17 gross.",
				"The day-3 freeze stands as written, so Month-end close v5 lists this path as performed and records each true-up as an exception to the freeze, with Group FP&A owning the gap in the RAID register.",
			],
			exhibit: {
				kind: "table",
				title: "The true-ups post after the Controller’s review and are reviewed again afterwards, so reviewed numbers move every month",
				caption: "Steps of the day-4 path as performed, S-18 to S-22. The steps are the same under either option at the decision.",
				source: "[P41-JE-12] · interviews with Luca Romano, Elena Ortiz and Sarah Liu",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-03.1", "Hannah Brooks", "Send the elimination results to Group FP&A", "By email, after the US period closes", "Results late: the true-ups wait, as in April"] },
					{ cells: ["UC-03.2", "Elena Ortiz", "Keep P41 open to intercompany postings", "Open on day 4; written nowhere", "Open: whether others may post while it is open. Elena Ortiz settles"] },
					{ cells: ["UC-03.3", "Group FP&A", "Post the intercompany true-ups", "118 in 12 closes, $4,812,330.17 gross", "Posted after the day-3 review, so reviewed numbers move"], emphasis: true },
					{ cells: ["UC-03.4", "Sarah Liu", "Review the true-ups after they post", "Every true-up reviewed afterwards", "Open: what a rejected true-up does. Sarah Liu settles"] },
					{ cells: ["UC-03.5", "Elena Ortiz", "Close the posting period", "After the true-ups, on day 4", "A late true-up keeps the period open and the close runs on"] },
				],
			},
		},
		{
			heading: "UC-04: Approval of payments and credits at close",
			paragraphs: [
				"Starts when a payment or credit over the written threshold reaches day 3, and ends when a Finance Director has signed it off before the period closes. Input is the item and its amount. Output is a signed-off approval task in ServiceNow.",
				"v4 sets the threshold at $10,000; the binding rule has said $25,000 since October 1. The September close, run in early October, followed v4 and routed 37 approvals between $10,000 and $25,000 to a Finance Director.",
			],
			exhibit: {
				kind: "table",
				title: "Approvals follow the written $10,000 threshold, not the binding $25,000 rule",
				caption: "Steps of the approval path as performed, S-11 and the Controller’s day-3 review.",
				source: "[SN-CLOSE-12] · [CLOSE-V4] · Payment approvals over $25,000 v3",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-04.1", "Finance Operations", "Route each payment or credit over the written threshold", "v4 says $10,000; ServiceNow, day 3", "37 between $10,000 and $25,000 routed in the September close"], emphasis: true },
					{ cells: ["UC-04.2", "A Finance Director", "Sign off before the period closes", "The binding rule requires it over $25,000", "Open: what a decline does to the close. Sarah Liu settles"] },
					{ cells: ["UC-04.3", "Sarah Liu", "Confirm the approvals are in at her day-3 review", "Part of the trial balance review", "Open: whether sign-off waits for a missing approval. Sarah Liu settles"] },
				],
			},
		},
		{
			heading: "UC-05: The close when Hannah Brooks is out",
			paragraphs: [
				"Starts when Hannah Brooks is away for a close, and ends when the US elimination results reach Group FP&A. It has happened once in 12 closes. In April, the one close she did not run, the close slipped two days.",
				"No document names who covers her, and the mapping tab is updated only by her. This path stays Unresolved until Sarah Liu names cover and that person has run the elimination once.",
			],
			exhibit: {
				kind: "table",
				title: "With no named cover, the whole close waits on the US elimination when its one operator is out",
				caption: "The exception path as April showed it.",
				source: "[SN-CLOSE-12] · interviews with Sarah Liu and Hannah Brooks · RAID register",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-05.1", "Sarah Liu", "Find someone to run the US elimination", "No cover named in any document", "Open: who covers. Sarah Liu settles"], emphasis: true },
					{ cells: ["UC-05.2", "The person covering", "Run the workbook without its author", "Three macros and a mapping tab only Hannah Brooks updates", "In April the close slipped two days"] },
					{ cells: ["UC-05.3", "Group FP&A", "Wait for the US results before posting the true-ups", "Day 4 moves when the results move", "The reporting pack moves with it"] },
				],
			},
		},
		{
			heading: "UC-06: Manual journal after day 3 that is not a true-up",
			paragraphs: [
				"Starts when a manual journal that is not an intercompany true-up posts to P41 after day 3, and ends when someone has reviewed it. The journal log shows 28 of them across 12 closes, the rest of the 146 manual journals after day 3.",
				"No procedure step or interview describes them, and neither option at the decision permits them. The path stays Unresolved until Elena Ortiz reads who posted them.",
			],
			exhibit: {
				kind: "table",
				title: "Twenty-eight journals pass the freeze with no step, owner or review that any source describes",
				caption: "The exception path as the journal log shows it.",
				source: "Journal entry log · SAP S/4HANA P41 · [P41-JE-12] · RAID register",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-06.1", "Not yet known", "Post a manual journal to P41 after day 3", "Not a true-up; 28 in 12 closes", "Open: who posted them. Elena Ortiz settles"], emphasis: true },
					{ cells: ["UC-06.2", "Elena Ortiz", "Hold the period open on day 4", "Held open for intercompany", "Open: whether P41 limits who may post. Elena Ortiz settles"] },
					{ cells: ["UC-06.3", "Sarah Liu", "Review the journal", "No review step in v4 or any interview", "Open: whether these are reviewed. Sarah Liu settles"] },
				],
			},
		},
		TERMS,
	],
	findings: [
		{ label: "Two paths that run every month are written nowhere", detail: "UC-02, the US entity close and elimination, and UC-03, the day-4 true-up, have no step in v4." },
		{ label: "The day-4 path is recorded as an exception to the freeze", detail: "UC-03 runs every month. Month-end close v5 lists its steps as performed and records each true-up as an exception, with Group FP&A owning the gap." },
		{ label: "Two exception paths are Unresolved", detail: "UC-05 needs Sarah Liu to name cover for Hannah Brooks, and UC-06 needs Elena Ortiz to read who posted the 28 other journals." },
		{ label: "The Current paths leave seven points Open", detail: "Task reassignment, a rejected true-up, a declined approval and a missing approval (Sarah Liu); the bank-feed fallback and posting while P41 is held open (Elena Ortiz); and an unmapped account (Hannah Brooks)." },
	],
	nextSteps: [
		{ action: "Name cover for the US elimination", owner: "Sarah Liu, Controller", due: "Before the next close starts" },
		{ action: "Read who posted the 28 other manual journals after day 3", owner: "Elena Ortiz, Finance Systems Lead", due: "Within two weeks" },
		{ action: "Write what happens to an unmapped account into the elimination procedure", owner: "Hannah Brooks, Senior Accountant, US Finance", due: "Before the procedure is published" },
	],
	citations: [
		"Close procedure and checklist · SharePoint Finance/Close · Month-end close v4, 11 steps · [CLOSE-V4]",
		"Journal entry log · SAP S/4HANA P41 · 9,412 entries across the last 12 closes · [P41-JE-12]",
		"Close task list · ServiceNow Finance Operations · 1,284 tasks across the last 12 closes · [SN-CLOSE-12]",
		"US entity ledger · QuickBooks Online company 934771 · 2,206 entries across the last 12 closes · [QBO-934771-12]",
		"Interviews with Sarah Liu, Elena Ortiz, Luca Romano and Hannah Brooks",
	],
}
