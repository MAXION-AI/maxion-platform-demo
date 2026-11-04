import type { DeliverableBody } from "../types"

// Project plan and use case catalog for the S/4HANA custom code disposition at Halden Group.
// Derived from the implementation roadmap, requirements, process analysis, RAID register and charter
// in ../s4hana.ts: the same milestones, figures, systems and owners. All data is synthetic.

export const WBS: DeliverableBody = {
	heading: "Twelve work packages get all 11,842 objects dispositioned by W3, the 604 blocking objects remediated by W4, and the gate live before the W8 conversion weekend.",
	lede: "This plan breaks the roadmap's three milestones (map, pipeline, dashboard) into packages with one owner, a dependency and an exit a person can check. It carries the programme's own durations, and where the Discovery's estimate differs it uses the longer figure. The map comes first because the remediation estimate, the developer allocation and the test plan are all derived from it.",
	metrics: [
		{ value: "3", label: "Milestones to delivery", note: "Map, pipeline, dashboard" },
		{ value: "604", label: "Objects on the critical path", note: "Sequenced first" },
		{ value: "11", label: "Checks before a transport", note: "All must pass" },
	],
	keyMessages: [
		{ label: "The map scopes everything, so it cannot slip", detail: "WBS-1.6 closes in W3 and every later duration is derived from it. It carries the only hard date before the conversion weekend." },
		{ label: "The blocking objects do not wait for the map", detail: "All 1,180 error-priority findings sit in 604 objects in active use, and none sits in code the rules archive. WBS-2.1 does not need the finished map, and no choice of threshold changes which objects are in it." },
		{ label: "The gate is live before the conversion", detail: "The first transport after go-live is the one most likely to reintroduce a removed pattern. WBS-3.1 has the 22:00 CET sweep running in the week before the conversion weekend." },
	],
	sections: [
		{
			heading: "Work breakdown",
			paragraphs: [
				"WBS-1 produces the map, WBS-2 is the remediation pipeline and adoption, and WBS-3 is the sweep and dashboard. Dues are roadmap weeks from handoff.",
				"The owner is the person accountable for the exit. The agent duties in the target operating model do the classification and sandbox work, and no agent duty owns a package here.",
			],
			exhibit: {
				kind: "table",
				title: "Every package ends in a figure that can be counted, and only WBS-2.3 waits on the behaviour decision",
				caption: "Work packages in dependency order, with owners and dues taken from the next steps in the source documents.",
				source: "Implementation roadmap v1 · Requirements specification v1 · RAID register v1",
				columns: ["ID", "Work package", "Owner", "Depends on", "Due", "Exit criterion"],
				rows: [
					{ cells: ["WBS-1.1", "Confirm the archive threshold, five exclusions and conversion weekend", "Anja Möller", "None", "W1", "Board record holds 20 executions, the five exclusions and the weekend date"] },
					{ cells: ["WBS-1.2", "Name the approver for production transports (D-02)", "Damian Okonkwo", "None", "W2", "D-02 names an approver, or stays open and every production transport asks"], emphasis: true },
					{ cells: ["WBS-1.3", "Approve the disposition rules as the target process", "Stefan Keller", "WBS-1.1", "W2", "Rules place 9,352 to archive and 2,078 to remediate; 412 have an equivalent"] },
					{ cells: ["WBS-1.4", "Walk the 38 exception specifications with Finance Systems", "Rosa Iglesias", "None", "W3", "Each of the 38 names object, equivalent, difference, population and test"] },
					{ cells: ["WBS-1.5", "Agree the treatment of the 212 objects with no named owner", "Stefan Keller", "WBS-1.3", "W3", "All 212 reach one decision with usage evidence attached; I-01 closes"] },
					{ cells: ["WBS-1.6", "Approve the map and baseline the nineteen requirements", "Stefan Keller", "WBS-1.3, WBS-1.5", "W3", "All 11,842 placed; 16,098 findings recorded as excluded; nineteen baselined"] },
					{ cells: ["WBS-2.1", "Remediate the 604 blocking objects first", "Stefan Keller", "WBS-1.2, WBS-1.3", "W4", "All 1,180 error-priority findings cleared; the 604 pass the eleven checks"] },
					{ cells: ["WBS-2.2", "Adopt standard for the 374 unchanged objects", "Stefan Keller", "WBS-1.6", "W5", "All 374 resolve to their successor and pass the behaviour test (REQ-07)"] },
					{ cells: ["WBS-2.3", "Carry out the 38 exceptions as the RAID register records", "Rosa Iglesias", "WBS-1.4, WBS-1.6", "W5", "Each of the 38 passes the test for the behaviour the owner chose (REQ-08)"], emphasis: true },
					{ cells: ["WBS-2.4", "Allocate developers to the map and remediate the 2,078 carried forward", "Stefan Keller", "WBS-1.2, WBS-1.6, WBS-2.1", "W7", "All 2,078 pass the eleven checks in the sandbox; none transports undispositioned"] },
					{ cells: ["WBS-3.1", "Schedule the readiness variant, then start the sweep and CTS block", "Damian Okonkwo", "WBS-1.6", "W7", "At 22:00 CET a transport with a removed pattern is refused (REQ-16)"] },
					{ cells: ["WBS-3.2", "Confirm ITGC-SAP-3 covers publication and publish the dashboard", "Anja Möller", "WBS-3.1", "W7", "The board sees a verified dashboard by 07:00 CET under ITGC-SAP-3"] },
				],
			},
		},
		{
			heading: "Sequence",
			paragraphs: [
				"Adoption runs in parallel with remediation because the two have no dependency and use different skills. Running them in sequence would add two weeks for no reason. The readiness variant is scheduled in W4 and the sweep's start in W5, ahead of the gate going live.",
			],
			exhibit: {
				kind: "timeline",
				title: "The map closes in W3 and the gate is live before the W8 conversion weekend",
				caption: "Weeks from handoff, using the same dues as the work breakdown; the conversion weekend is the programme's date.",
				source: "Implementation roadmap v1 · Discovery workshop with Enterprise IT",
				ticks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
				lanes: [
					{ label: "Disposition", bars: [{ label: "Map produced and approved", start: 0, span: 3, tone: "brand" }] },
					{ label: "Remediation", bars: [{ label: "604 blockers first", start: 2, span: 2, tone: "warn" }, { label: "2,078 carried forward", start: 4, span: 3 }] },
					{ label: "Adoption", bars: [{ label: "374 and the 38", start: 3, span: 2 }] },
					{ label: "Gate", bars: [{ label: "Variant scheduled", start: 3, span: 2 }, { label: "Sweep and dashboard live", start: 5, span: 2, tone: "brand" }] },
				],
				markers: [{ label: "Conversion weekend", at: 7 }],
			},
		},
		{
			heading: "What the plan depends on",
			paragraphs: [
				"Most of the plan does not wait on the behaviour decision. Only the packages that touch the 38 exceptions do, and their tests are already written for both paths.",
			],
			bullets: [
				{ label: "The decision recorded in the RAID register", detail: "D-01, the behaviour of the 38 exceptions, owned by Rosa Iglesias. WBS-2.3 waits on it, the 38 in the map take its answer, and how much of the 980 person-days leaves the estimate follows from it." },
				{ label: "What does not wait on that decision", detail: "WBS-1.4 goes ahead because REQ-08 and REQ-11 are written for both paths. The 374, the 604 blocking objects, the 2,078 and the gate also proceed." },
				{ label: "Transport approval authority (D-02)", detail: "Unassigned today. Until a name exists, the coordinator asks for approval on every production transport, so WBS-2.1 and WBS-2.4 can proceed but each release waits on a person." },
				{ label: "The archive threshold", detail: "20 executions in twelve months, confirmed at the board in WBS-1.1. If it is reopened object by object (R-04), the 3,680-day saving is consumed by the arguing." },
				{ label: "Finance Systems availability (A-02)", detail: "Walking the 38 specifications is carried at three weeks, the programme's longer figure. A slip in WBS-1.4 reaches WBS-2.3 directly." },
				{ label: "The conversion weekend date", detail: "The marker at W8 comes from the programme plan and has not been confirmed against this plan. Anja Möller confirms it in W1." },
			],
		},
	],
	findings: [
		{ label: "The plan is scoped by the map", detail: "A week lost on WBS-1.6 is a week lost on WBS-2.2, WBS-2.3, WBS-2.4 and the gate, while the 604 blocking objects are insulated from it." },
		{ label: "Adoption can run beside remediation", detail: "The standard adoptions have no dependency on the 2,078 remediations and use a different skill set, which saves two weeks against running them in sequence." },
		{ label: "Two sources give different dates for D-02", detail: "The executive brief asks for a name by W2 and the RAID register carries it to Agentix at activation. The plan uses W2 and falls back to approval on every transport." },
	],
	nextSteps: [
		{ action: "Confirm the conversion weekend date against this plan", owner: "Anja Möller", due: "W1" },
		{ action: "Name the approver for transports reaching production S/4HANA", owner: "Damian Okonkwo", due: "W2" },
		{ action: "Allocate developers against the map rather than the ATC list", owner: "Stefan Keller", due: "W3" },
	],
	citations: [
		"Implementation roadmap v1 · Discovery workshop with Enterprise IT",
		"Requirements specification v1",
		"RAID register v1",
		"Halden programme plan v7 · conversion weekend",
		"Halden change calendar · Thursday 20:00 CET transport window",
	],
}

export const CATALOG: DeliverableBody = {
	heading: "Six use cases cover the custom estate: one is how objects are judged today, three are proposed, and two wait on a person because evidence cannot settle them.",
	lede: "The catalog separates what a developer does now from what the target process proposes and from what nobody has settled yet. Each use case has one accountable actor, a stated trigger and steps whose decision rules come from the requirements. Where the source has no rule, the step says Open and names who settles it.",
	metrics: [
		{ value: "4,102", label: "Objects a developer opens in UC-01", note: "Against 2,078 under the target process" },
		{ value: "38", label: "Exceptions behind UC-03", note: "Each with its own test" },
		{ value: "212", label: "Objects behind UC-04", note: "Median wait of 31 days today" },
	],
	keyMessages: [
		{ label: "The current use case has no place to say no", detail: "An ATC finding is a defect to fix, so every flagged object becomes work and the judgement behind it goes unrecorded. UC-02 asks the question once, ahead of the work." },
		{ label: "The proposed use cases hold deciding and releasing apart", detail: "The analyst places objects, the specialist builds in the sandbox, and only the coordinator makes the one CTS call. The sweep refuses a transport before it enters the queue." },
		{ label: "The unresolved use cases need a person", detail: "UC-03 waits on the decision recorded in the RAID register and UC-04 waits on Stefan Keller. Usage statistics can size both, but neither can be decided from them." },
	],
	sections: [
		{
			heading: "Catalog",
			paragraphs: [
				"Status shows where each use case stands at handoff. Current is today's process, Proposed is the target process and Unresolved waits on a decision.",
			],
			exhibit: {
				kind: "table",
				title: "Two of the six use cases wait on a named person, not on more analysis",
				caption: "Every use case in the disposition engagement, with its trigger and the actor accountable for its outcome.",
				source: "As-Is / To-Be process analysis · Requirements specification v1 · RAID register v1",
				columns: ["ID", "Use case", "Trigger", "Accountable actor", "Status"],
				rows: [
					{ cells: ["UC-01", "Judge an object while remediating it", "ATC finding assigned by object", "Developer holding the object", "Current"] },
					{ cells: ["UC-02", "Run one disposition pass over the repository", "Board confirms the archive threshold", "Stefan Keller", "Proposed"] },
					{ cells: ["UC-03", "Settle a behaviour exception", "Standard equivalent behaves differently", "Rosa Iglesias", "Unresolved"], emphasis: true },
					{ cells: ["UC-04", "Place an object with no named owner", "Used object has no owner anyone can name", "Stefan Keller", "Unresolved"], emphasis: true },
					{ cells: ["UC-05", "Remediate and release a carried-forward object", "Map places the object in remediate", "Stefan Keller", "Proposed"] },
					{ cells: ["UC-06", "Refuse a drifting transport in the nightly sweep", "Sweep runs at 22:00 CET", "Damian Okonkwo", "Proposed"] },
				],
			},
		},
		{
			heading: "UC-01: Judge an object while remediating it",
			paragraphs: [
				"Starts when an ATC run assigns a finding to a developer and ends when a transport leaves for the queue, or when the object stops to wait for an owner. Inputs are the finding and the object. The output is a transport whose comment says what changed, not what was considered.",
			],
			exhibit: {
				kind: "table",
				title: "Whether an object should exist is decided alone, under delivery pressure, with no record",
				caption: "The current path from a readiness finding to a transport, as observed on the pilot wave.",
				source: "As-Is / To-Be process analysis · Programme delivery process v2",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-01.1", "ATC run", "Assigns findings to developers by object", "27,415 findings across 4,102 objects", "Nothing checks whether the object is used"] },
					{ cells: ["UC-01.2", "Developer", "Judges whether the object is still needed", "No rule; the judgement is unrecorded", "Two developers can reach different answers"] },
					{ cells: ["UC-01.3", "Developer", "Asks who owns the object", "No rule on who answers", "The object waits; median 31 days across 212 objects"] },
					{ cells: ["UC-01.4", "Developer", "Fixes or rewrites it and transports", "Transport comment records the change only", "No gate: 214 of 4,318 transports brought in a removed pattern"] },
				],
			},
		},
		{
			heading: "UC-02: Run one disposition pass over the repository",
			paragraphs: [
				"Starts once the board has confirmed the archive threshold and ends when Stefan Keller approves a map that places all 11,842 objects. Inputs are the repository with twelve months of UPL usage, the ATC findings and the simplification item list. The output is the disposition map, and the pass itself writes nothing.",
			],
			exhibit: {
				kind: "table",
				title: "The same rules place every object once, so a developer only sees what carries forward",
				caption: "The target disposition pass, applying the rules in order.",
				source: "As-Is / To-Be process analysis · Requirements specification v1",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-02.1", "Custom code analyst", "Matches each object to usage, findings and simplification items", "Three reads; the analyst changes nothing", "An object the rules cannot place goes to UC-04"] },
					{ cells: ["UC-02.2", "Custom code analyst", "Applies the archive threshold", "Under 20 UPL executions in twelve months: archive, block transport", "A threshold change is a board decision, via Anja Möller"] },
					{ cells: ["UC-02.3", "Custom code analyst", "Applies the standard rule", "Equivalent exists and behaviour is unchanged: adopt standard (374)", "Behaviour differs: goes to UC-03"] },
					{ cells: ["UC-02.4", "Custom code analyst", "Places what remains", "Used with no standard equivalent: remediate (2,078)", "16,098 findings in archived objects recorded as excluded"] },
					{ cells: ["UC-02.5", "Stefan Keller", "Approves the map", "All 11,842 placed; developers work from the map", "Escalates to Anja Möller"] },
				],
			},
		},
		{
			heading: "UC-03: Settle a behaviour exception",
			paragraphs: [
				"Starts when the twelve-month comparison shows a standard equivalent behaves differently from the custom object, and ends when that object passes a test for the behaviour chosen. Inputs are the object, its standard equivalent and twelve months of executions. Outputs are one specification and one test per exception.",
				"The clearest is ZFI_CREDIT_EXP, which counts open sales orders from quotation stage where FSCM Credit Management counts from order entry. The two rules disagree on €2,412,880.40 of exposure a month. Which behaviour survives is the decision recorded in the RAID register.",
			],
			exhibit: {
				kind: "table",
				title: "The 38 are proven and sized one by one, and the choice between behaviours stays with the owner",
				caption: "What is measured, and what stays open until D-01 closes; the tests are written for both paths.",
				source: "Requirements specification v1 · RAID register v1 · Project charter and governance",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-03.1", "MAX", "Compares the 412 against twelve months of executions", "374 identical: no decision. 38 differ: an exception each", "A difference is measured, never judged"] },
					{ cells: ["UC-03.2", "Rosa Iglesias", "Walks each of the 38 specifications", "Object, equivalent, difference, population and test (due W3)", "A-02: carried at three weeks, the longer figure"] },
					{ cells: ["UC-03.3", "Rosa Iglesias", "Decides which behaviour survives", "Open: the decision recorded in the RAID register, Rosa Iglesias settles it", "Escalates to the CFO"], emphasis: true },
					{ cells: ["UC-03.4", "Remediation specialist", "Tests each exception in the sandbox", "Each of the 38 passes the test for the chosen behaviour (REQ-08)", "Tested one by one, never as a group"] },
				],
			},
		},
		{
			heading: "UC-04: Place an object with no named owner",
			paragraphs: [
				"Starts when a used object reaches a point where someone must answer for it and nobody can be named, which is true of 212 objects today, all inside the remediate group. Ends when the map records a treatment for each one. Inputs are the objects and their usage evidence. The output is one decision covering the group rather than 212 conversations.",
			],
			exhibit: {
				kind: "table",
				title: "The 212 objects reach one person once, but the rule for treating them is not written yet",
				caption: "The target path for ownerless objects, with the treatment still open.",
				source: "As-Is / To-Be process analysis · RAID register v1 · Programme tracker",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-04.1", "Custom code analyst", "Groups the objects the rules cannot place", "212 today; usage evidence attached to each", "Today each waits a median 31 days"] },
					{ cells: ["UC-04.2", "Stefan Keller", "Decides the treatment", "Open: treatment of the 212, Stefan Keller agrees it by W3", "Escalates to Anja Möller"], emphasis: true },
					{ cells: ["UC-04.3", "Custom code analyst", "Records the treatment in the map", "Every one of the 212 carries a disposition", "No disposition: its transport is refused (REQ-12)"] },
				],
			},
		},
		{
			heading: "UC-05: Remediate and release a carried-forward object",
			paragraphs: [
				"Starts when the map places an object in remediate, with the 604 blocking objects sequenced first, and ends when the coordinator has made one CTS release for it. Inputs are the map, the repository and the sandbox. Outputs are a tested version and a released transport.",
				"The remediation specialist holds no production credential. The coordinator is the only production writer and cannot edit code or change a disposition.",
			],
			exhibit: {
				kind: "table",
				title: "A version reaches production only after eleven checks and one approval, and the approver is not yet named",
				caption: "The path from the map to production, with transport approval carried as D-02.",
				source: "Technical assessment · Target operating model · RAID register v1",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-05.1", "Stefan Keller", "Sequences the 604 blocking objects first", "All 1,180 error-priority findings sit in those 604", "Escalates to Anja Möller"] },
					{ cells: ["UC-05.2", "Remediation specialist", "Builds and tests in the sandbox", "Sandbox objects and tests only", "May not reach production"] },
					{ cells: ["UC-05.3", "Remediation specialist", "Runs the eleven checks", "All eleven must pass before a release is offered", "A version that has not passed cannot be offered"] },
					{ cells: ["UC-05.4", "Approver", "Approves the release", "Open: D-02, Damian Okonkwo names the approver by W2", "Until then every production transport asks for approval"], emphasis: true },
					{ cells: ["UC-05.5", "Conversion coordinator", "Makes the CTS release", "One release per approval, Thursday 20:00 CET window", "Open: a missed window, Damian Okonkwo settles it"] },
				],
			},
		},
		{
			heading: "UC-06: Refuse a drifting transport in the nightly sweep",
			paragraphs: [
				"Starts at 22:00 CET each night and ends when the board's dashboard is published by 07:00. Inputs are the day's transports and the readiness variant. Outputs are refusals in CTS, notifications to developers and the dashboard.",
				"A block is an action, not a message. The refusal comes first and the notification records a block that has already happened.",
			],
			exhibit: {
				kind: "table",
				title: "The sweep refuses first and reports second, which is what keeps the 214-transport pattern from recurring",
				caption: "The nightly gate, which is the only part of this design still running a year after go-live.",
				source: "Requirements specification v1 · Technical assessment · Target operating model",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-06.1", "Nightly sweep", "Runs the readiness variant on the day's transports", "22:00 CET on the existing sandbox", "Open: a sweep that fails to run, Damian Okonkwo settles it"] },
					{ cells: ["UC-06.2", "Nightly sweep", "Refuses a transport reintroducing a removed pattern", "Refused in CTS before it enters the queue (REQ-16)", "Open: who may override a block, Damian Okonkwo settles it"] },
					{ cells: ["UC-06.3", "Nightly sweep", "Refuses a transport with an undispositioned object", "Any such object in the transport: refused (REQ-12)", "Open: how it regains a disposition, Stefan Keller settles it"] },
					{ cells: ["UC-06.4", "Nightly sweep", "Notifies the developer", "Sent after the refusal, as its record", "Never sent in place of a refusal"] },
					{ cells: ["UC-06.5", "Dashboard specialist", "Publishes the readiness dashboard", "By 07:00 CET under ITGC-SAP-3", "Open: policy coverage, Anja Möller confirms it by W2"] },
				],
			},
		},
	],
	findings: [
		{ label: "Today's process has no step that asks whether an object should exist", detail: "Every flagged object becomes work, which is why 8,232 unused objects sit inside the estimate. UC-02 adds the step." },
		{ label: "The two unresolved use cases are about ownership", detail: "UC-03 and UC-04 turn on who decides. Everything else in the catalog can be built and tested without them." },
		{ label: "Four paths are missing from the sources", detail: "A missed transport window, a sweep that fails to run, an override of a block and a refused undispositioned object have no stated rule. Each step names who settles it." },
	],
	nextSteps: [
		{ action: "Close D-01 at the decision point so UC-03 can be tested", owner: "Rosa Iglesias", due: "This week" },
		{ action: "Agree the treatment of objects with no named owner", owner: "Stefan Keller", due: "W3" },
		{ action: "Name the transport approver and settle the UC-05 and UC-06 open paths", owner: "Damian Okonkwo", due: "W2" },
	],
	citations: [
		"Programme delivery process v2 · pilot wave observation",
		"Programme tracker · objects awaiting an owner · 212 open",
		"Requirements specification v1",
		"SAP ECC · UPL usage statistics",
		"SAP CTS · transport history",
		"RAID register v1",
		"Implementation roadmap v1 · Discovery workshop with Enterprise IT",
	],
}
