import type { DeliverableBody } from "../types"

// Derived from the TPRM roadmap, requirements, process analysis, RAID register,
// and charter. Written for the conservative path: the owner's exception decision
// is referred to, never stated as made.

export const WBS: DeliverableBody = {
	heading: "Twelve work packages deliver the gate in 11 weeks, and register reconciliation sits in front of everything that follows.",
	lede: "This plan breaks the 11-week roadmap into packages that a named owner can close against a measurable exit. Phase one makes the gate real for new vendors by week 3. Phase two moves Security and Privacy review into parallel and migrates the 41 onboarding items by week 8. Phase three adds SLA and exception reporting by week 11. Where the source documents name no owner or value, the cell says so and names who settles it.",
	metrics: [
		{ value: "11 weeks", label: "Planned duration", note: "Gates at weeks 3, 8, and 11" },
		{ value: "48", label: "Register records to clear", note: "Resolved or exempted by week 3" },
		{ value: "2.5 FTE", label: "Engineering allocation", note: "Not expandable within the window" },
	],
	keyMessages: [
		{ label: "Reconciliation comes first", detail: "Tiering cannot switch on until the 48 incomplete records are cleared and identifiers are minted. WBS-1.3 is the one package gated by sponsor response rather than engineering capacity." },
		{ label: "Each phase ends on a measurement", detail: "Gate A needs 10 vendors tiered with zero overrides. Gate B needs zero signatures with an open review over four weeks. Gate C needs exception ageing visible to the committee without a report request." },
		{ label: "Two open items can change the plan's shape", detail: "D-05 sets the exception window the gate encodes, and A-03 decides whether the 18-day target holds or Tier 2 returns to a scheduled queue at 24 days." },
	],
	sections: [
		{
			heading: "Work breakdown",
			paragraphs: [
				"Package IDs follow phase and package number, and the IDs stay stable if dates move. Owners come from the RACI, the RAID register, and the next steps in the source documents.",
				"Requirements baselining with Security, Privacy, and Procurement runs alongside these packages and is carried in the use case catalog.",
			],
			exhibit: {
				kind: "table",
				title: "Twelve packages close the 11-week plan, and three of them carry the gate measurements",
				caption: "Work breakdown by phase and package, with the exit each owner is held to.",
				source: "Implementation roadmap · RAID register · Requirements specification · Project charter",
				columns: ["ID", "Work package", "Owner", "Depends on", "Due", "Exit criterion"],
				rows: [
					{ cells: ["WBS-1.1", "Ratify tiering thresholds", "Maya Rao", "None", "Week 1", "Written thresholds for data class, access scope, and annual spend"] },
					{ cells: ["WBS-1.2", "Mint identifiers and enter orphan vendors", "Vendor Risk operations", "None", "Week 2", "Identifiers minted and all 11 orphan vendors entered in the register"] },
					{ cells: ["WBS-1.3", "Clear untierable register records", "Jordan Lee", "WBS-1.2", "Week 3", "All 48 records resolved or explicitly exempted"] },
					{ cells: ["WBS-1.4", "Build the gate record and tier new vendors at intake", "Daniel Kim", "WBS-1.1, WBS-1.3", "Week 3", "Gate A: 10 vendors tiered with zero manual overrides"], emphasis: true },
					{ cells: ["WBS-2.1", "Close D-05 and encode the exception window", "Maya Rao", "WBS-1.4", "Week 4", "Window ratified at 15 or 30 days and encoded in the gate record"] },
					{ cells: ["WBS-2.2", "Switch signature to fail closed", "Jordan Lee", "WBS-1.4", "Week 5", "Signature refused without a register key or a complete evidence set"] },
					{ cells: ["WBS-2.3", "Build the 68-decision replay harness", "Platform engineering", "WBS-2.2", "Week 5", "All 22 open-review signatures fail and name the missing artifact"] },
					{ cells: ["WBS-2.4", "Specify manual fallback", "Daniel Kim", "WBS-2.2", "Week 6", "Evidence service down: signature refused, no same-role path"] },
					{ cells: ["WBS-2.5", "Run Security and Privacy review in parallel", "Daniel Kim with Priya Shah", "WBS-1.4, WBS-2.1", "Week 8", "Gate B: zero signatures with an open review over the prior four weeks"], emphasis: true },
					{ cells: ["WBS-2.6", "Migrate 41 onboarding items from the backlog", "Open: Maya Rao names", "WBS-1.2, WBS-1.4", "Week 8", "All 41 items on the gate record; median measured against 34 days"] },
					{ cells: ["WBS-3.1", "Instrument SLA reporting", "Jordan Lee", "WBS-2.5, WBS-2.6", "Week 11", "Median intake to decision at 18 days, Tier 3 at 8 days"] },
					{ cells: ["WBS-3.2", "Build the exception dashboard", "Maya Rao", "WBS-2.1, WBS-2.5", "Week 11", "Gate C: exception ageing visible to the committee without a report request"], emphasis: true },
				],
			},
		},
		{
			heading: "Sequence",
			paragraphs: [
				"Automation comes last on purpose, because by week 9 the manual path has run for eight weeks and the dashboard encodes an observed process. The calendar date for week 1 is open, and the Transformation lead sets it at the executive review on 18 Sep.",
			],
			exhibit: {
				kind: "timeline",
				title: "Data remediation and tiering close by week 3, and automation waits until Gate B has been measured",
				caption: "Packages by workstream across 11 weeks, with the three measured gates.",
				source: "Implementation roadmap · RAID register",
				ticks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11"],
				lanes: [
					{ label: "Data remediation", bars: [{ label: "Identifiers + 48 records", start: 0, span: 3, tone: "brand" }] },
					{ label: "Gate record", bars: [{ label: "Tiering at intake", start: 0, span: 3, tone: "brand" }, { label: "Fail-closed signature", start: 3, span: 2, tone: "brand" }] },
					{ label: "Exception window", bars: [{ label: "D-05", start: 3, span: 1, tone: "warn" }] },
					{ label: "Proof and fallback", bars: [{ label: "Replay harness", start: 3, span: 2, tone: "muted" }, { label: "Fallback", start: 5, span: 1, tone: "muted" }] },
					{ label: "Parallel review", bars: [{ label: "Security and Privacy in parallel", start: 3, span: 5, tone: "brand" }] },
					{ label: "Backlog migration", bars: [{ label: "41 onboarding items", start: 4, span: 4, tone: "muted" }] },
					{ label: "Automation", bars: [{ label: "SLA + exception dashboard", start: 8, span: 3, tone: "muted" }] },
				],
				markers: [
					{ label: "Gate A", at: 3 },
					{ label: "Gate B", at: 8 },
					{ label: "Gate C", at: 11 },
				],
			},
		},
		{
			heading: "What the plan depends on",
			paragraphs: [
				"Five dependencies can move a date in the table. Only one of them waits on the decision recorded in the RAID register, and it does not sit on the critical path.",
			],
			bullets: [
				{ label: "Register before tiering", detail: "WBS-1.4 cannot start tiering until WBS-1.3 clears the 48 records. That package relies on sponsor responses, which the programme can chase but cannot compel." },
				{ label: "Security capacity (A-03)", detail: "Parallel review assumes capacity holds once 150 vendors move to the light path. If Gate A testing fails it, Tier 2 returns to a scheduled queue and the target rises from 18 days to 24." },
				{ label: "Exception window (D-05)", detail: "WBS-2.1 must close before phase two, and both fall in week 4, so it has no float. The roadmap assumes 15 days until Maya Rao closes it." },
				{ label: "Vendor retention artifact", detail: "This waits on the decision recorded in the RAID register, since no internal source holds the vendor's retention commitment. REQ-09 fails closed without it, so the first Tier 1 vendor either passes or becomes the first exception." },
				{ label: "Engineering capacity", detail: "All build packages share 2.5 FTE. WBS-1.4, WBS-2.2, and WBS-2.3 fall due within the first five weeks." },
			],
		},
	],
	findings: [
		{ label: "Least float", detail: "WBS-2.2 is due in week 5, and Gate B measures the four weeks up to week 8. A slip in fail-closed signature shortens that window and moves Gate B." },
		{ label: "Dates that disagree", detail: "The target operating model dates the capacity check at week 4, while the roadmap and the RAID register put Gate A at week 3. This plan uses week 3, and Maya Rao confirms it." },
		{ label: "Owner still open", detail: "No source names an owner for migrating the 41 onboarding items. Maya Rao holds register remediation in the RACI and names one before the work starts in week 5." },
	],
	nextSteps: [
		{ action: "Confirm the 11-week plan and 2.5 FTE, and set the week 1 date", owner: "Transformation lead", due: "Executive review · 18 Sep" },
		{ action: "Publish the expected week 1 to 3 cycle-time rise to sponsors", owner: "Jordan Lee · Procurement Director", due: "Week 1" },
		{ action: "Name the owner of WBS-2.6", owner: "Maya Rao · Vendor Risk Lead", due: "Week 4" },
	],
	citations: ["[SRC-014]", "[SRC-031]", "[SRC-088]", "[INT-JORDAN-04]", "[CASE-007]", "Implementation roadmap", "Readiness v7"],
}

export const CATALOG: DeliverableBody = {
	heading: "Five use cases carry the onboarding gate, and the exception path is the one whose rule is still open.",
	lede: "The requirements specification defines four use cases drawn from the observed process across 68 approval decisions and the 284-record register. This catalog keeps those four and adds the exception path from REQ-14 and D-05, because the gate refuses a Tier 1 signature without either a retention artifact or a time-bound exception. Each entry gives its start and end conditions, its steps, and the exact rule at each step. A rule the sources leave undefined is marked open with the person who settles it.",
	metrics: [
		{ value: "18", label: "Requirements behind the catalog", note: "6 load-bearing for audit" },
		{ value: "17%", label: "Requests with no data classification", note: "UC-01's alternate flow" },
		{ value: "22", label: "Historical signatures to refuse", note: "Replay of 68 approvals" },
	],
	keyMessages: [
		{ label: "Rules come from register fields", detail: "Tier and required evidence are computed from three intake inputs, so the steps below leave no room for reviewer discretion except the Tier 1 executive judgment." },
		{ label: "Separation holds on every path", detail: "UC-03 and UC-04 both refuse the action when the evidence or the identity check fails, including under manual fallback. No step offers a provisional signature." },
		{ label: "The open rules are named", detail: "The exception window (D-05), the mid-level tiering values, and behaviour at exception expiry remain open. Each has a named owner, and none is filled by assumption." },
	],
	sections: [
		{
			heading: "Catalog",
			paragraphs: [
				"Proposed means the use case sits in the recommended Option B and has not been baselined. Unresolved means a rule inside it is still open. No entry is marked Current or Selected, because today's process has no gate and the executive review has not yet approved the option.",
			],
			exhibit: {
				kind: "table",
				title: "Four use cases come from the observed process, and the fifth carries the open exception window",
				caption: "Use cases with their trigger, accountable actor, and current status.",
				source: "Requirements specification · Target operating model · RAID register",
				columns: ["ID", "Use case", "Trigger", "Accountable actor", "Status"],
				rows: [
					{ cells: ["UC-01", "Raise and tier an onboarding request", "Sponsor submits the structured intake form", "Maya Rao", "Proposed"] },
					{ cells: ["UC-02", "Attach evidence against a declared set", "Tier declares the required evidence set", "Daniel Kim (security), Priya Shah (privacy)", "Proposed"] },
					{ cells: ["UC-03", "Accept residual risk at a tier", "Required evidence is attached to the gate record", "Named acceptor by tier", "Proposed"] },
					{ cells: ["UC-04", "Sign the contract from the evidence record", "Procurement attempts signature", "Jordan Lee", "Proposed"] },
					{ cells: ["UC-05", "Record a time-bound exception", "Tier 1 vendor reaches signature with no retention artifact", "Maya Rao", "Unresolved"], emphasis: true },
				],
			},
		},
		{
			heading: "UC-01: Raise and tier an onboarding request",
			paragraphs: [
				"Starts when a business sponsor submits the structured intake form. Ends when the request holds an identifier, an immutable tier, and a declared evidence set, or is held at intake with the missing field named.",
				"Inputs are data class, access scope, and annual contracted spend. Applied to the register, the rule produces 38 Tier 1, 96 Tier 2, and 150 Tier 3 vendors.",
			],
			exhibit: {
				kind: "table",
				title: "A missing input holds the request at intake and is never defaulted to a tier",
				caption: "Steps from intake form to locked tier, with the rule applied at each.",
				source: "Requirements specification · Target operating model",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-01.1", "Business sponsor", "Submits the structured intake form", "Output: data class, access scope, annual contracted spend", "Input missing (17% of requests): held at intake with the field named"] },
					{ cells: ["UC-01.2", "Gate record", "Applies the Tier 1 rule", "Restricted data, privileged access, or spend over $1m sets Tier 1", "A manual override counts against the Gate A measurement"] },
					{ cells: ["UC-01.3", "Gate record", "Applies the Tier 2 and Tier 3 rules", "Two mid-level inputs set Tier 2; everything else is Tier 3", "Open: mid-level values, and whether confidential data alone sets Tier 2. Maya Rao"] },
					{ cells: ["UC-01.4", "Gate record", "Mints the identifier and locks the tier", "Output: immutable tier and the declared evidence set", "Scope expands after gate entry: exit and re-enter, never re-tier"] },
				],
			},
		},
		{
			heading: "UC-02: Attach evidence against a declared set",
			paragraphs: [
				"Starts when the tier declares the evidence set. Ends when every required artifact is attached to the gate record and visible to all reviewers.",
				"Inputs are the tier and the artifacts from Security and Privacy. Output is one shared evidence record, which removes the 61% of review questions that another reviewer's artifact already answers.",
			],
			exhibit: {
				kind: "table",
				title: "The tier declares the evidence up front, so an artifact is attached once and never re-requested",
				caption: "Evidence required by tier and the behaviour when an artifact changes.",
				source: "Target operating model · Requirements specification · As-Is / To-Be process analysis",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-02.1", "Gate record", "Declares the Tier 1 set", "Security assessment, privacy terms, retention artifact, continuity plan", "Missing artifact stays visible as outstanding on the gate record"] },
					{ cells: ["UC-02.2", "Gate record", "Declares the Tier 2 set", "Security questionnaire, standard privacy terms, control attestation", "Retention artifact applies only if the register shows personal data"] },
					{ cells: ["UC-02.3", "Gate record", "Declares the Tier 3 set", "Standard terms, self-attestation, annual re-check", "Open: spend ceiling for this path, settled with UC-01.3. Maya Rao"] },
					{ cells: ["UC-02.4", "Daniel Kim and Priya Shah", "Attach artifacts in parallel", "Output: artifact visible to all reviewers, no re-request", "Artifact supersedes an earlier one (9%): prior stays readable, decision re-evaluated"] },
				],
			},
		},
		{
			heading: "UC-03: Accept residual risk at a tier",
			paragraphs: [
				"Starts when the required evidence is attached. Ends when the named acceptor for that tier signs, and the gate record writes an immutable entry linking the tier, the artifacts, the accepting role, and the timestamp.",
			],
			exhibit: {
				kind: "table",
				title: "Acceptance authority is fixed by tier, and the requesting identity is refused on every path",
				caption: "Acceptance steps, with the identity check that holds under manual fallback.",
				source: "Target operating model · Requirements specification",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-03.1", "Gate record", "Checks security evidence", "Security artifact must be attached before acceptance (REQ-06)", "No artifact: acceptance fails closed"] },
					{ cells: ["UC-03.2", "Gate record", "Routes to the acceptor", "Tier 3: Maya Rao. Tier 2: Maya Rao and Daniel Kim. Tier 1: executive committee", "Only Tier 1 acceptance and policy exceptions leave the operating layer"] },
					{ cells: ["UC-03.3", "Gate record", "Compares acceptor to requester", "The requesting identity may not accept residual risk (REQ-11)", "Identities match (4%): refused in every path, including fallback"], emphasis: true },
					{ cells: ["UC-03.4", "Named acceptor", "Signs the acceptance", "Output: immutable entry with tier, artifacts, role, and timestamp", "Correction: a new decision supersedes the old, and both stay readable"] },
				],
			},
		},
		{
			heading: "UC-04: Sign the contract from the evidence record",
			paragraphs: [
				"Starts when Procurement attempts signature. Ends with a signature taken from the evidence record, or a refusal that names the missing artifact.",
				"The replay of all 68 historical approvals through this flow must produce 22 refusals, each naming the specific artifact that was absent.",
			],
			exhibit: {
				kind: "table",
				title: "Signature is a query against the gate, and an incomplete set is refused with the artifact named",
				caption: "Signature steps, including the behaviour when the evidence service is unavailable.",
				source: "Requirements specification · RAID register",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-04.1", "Gate record", "Checks the register key", "Contract signature needs a register key (R-07)", "No key: signature blocked"] },
					{ cells: ["UC-04.2", "Jordan Lee", "Queries the gate before signing", "Evidence set must be complete for the tier", "Artifact absent (32% historically): refused, missing artifact named"], emphasis: true },
					{ cells: ["UC-04.3", "Gate record", "Applies the Tier 1 retention rule", "Tier 1 needs a retention artifact or a time-bound exception (REQ-09)", "Neither present: refused, and the request may enter UC-05"] },
					{ cells: ["UC-04.4", "Gate record", "Handles an evidence service outage", "Service unavailable: signature refused", "No same-role fallback, provisional signature, or later attachment"] },
				],
			},
		},
		{
			heading: "UC-05: Record a time-bound exception",
			paragraphs: [
				"Starts when a Tier 1 vendor reaches signature with no retention artifact. Ends when an exception with a named owner and an expiry sits in the log and has been accepted, or the signature stays refused.",
				"How the retention commitment itself gets evidenced waits on the decision recorded in the RAID register. The window is open under D-05, so this use case is marked Unresolved until Maya Rao closes it.",
			],
			exhibit: {
				kind: "table",
				title: "The gate refuses an exception with no owner or expiry, but the window length is still undecided",
				caption: "Exception steps, with the two rules that remain open and who settles each.",
				source: "Requirements specification · RAID register · Target operating model",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-05.1", "Requesting owner", "Raises the exception", "Must carry a named owner and an expiry (REQ-14)", "Either missing: refused. 34 of last year's 57 exceptions had no expiry"] },
					{ cells: ["UC-05.2", "Gate record", "Sets the window", "Open: 15 or 30 days under D-05. Maya Rao closes it, week 4", "Until closed, the roadmap assumes 15 days"], emphasis: true },
					{ cells: ["UC-05.3", "Executive committee", "Accepts the exception", "Policy exceptions leave the operating layer; requester may not accept", "Identities match: refused, including under fallback"] },
					{ cells: ["UC-05.4", "Maya Rao", "Tracks the exception to expiry", "Output: ageing visible to the committee without a report request (Gate C)", "Open: behaviour at expiry. Maya Rao settles it with D-05"] },
				],
			},
		},
	],
	findings: [
		{ label: "Most common alternate flow", detail: "A sponsor with no data classification at intake, in 17% of requests. It is the most common cause of triage rework and is specified as a flow so it does not become an override." },
		{ label: "Use case most likely to be challenged", detail: "UC-03 under manual fallback. The pressure to allow a same-role signature during an outage is the pressure that produced the current exposure." },
		{ label: "Unresolved rule", detail: "The exception window. An exception window is the effective control standard, so until D-05 closes, the first exception would set the precedent." },
	],
	nextSteps: [
		{ action: "Baseline all 18 requirements with Security, Privacy, and Procurement", owner: "Daniel Kim with Priya Shah", due: "Week 2" },
		{ action: "Close D-05 and settle behaviour at exception expiry", owner: "Maya Rao · Vendor Risk Lead", due: "Week 4" },
		{ action: "Specify manual fallback and confirm no same-role path", owner: "Daniel Kim · Security Architect", due: "Week 6" },
	],
	citations: ["[SRC-014]", "[SRC-031]", "[SRC-088]", "[INT-JORDAN-04]", "[INT-DANIEL-03]", "[INT-PRIYA-06]", "[INT-MAYA-08]", "Implementation roadmap", "Readiness v7"],
}
