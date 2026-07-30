export type ScenarioKey = "tprm" | "diligence" | "enterprise"

export type Person = {
	id: string
	name: string
	initials: string
	role: string
	department: string
	email: string
	influence: "High" | "Medium"
	focus: string
	channel: "Text" | "Voice" | "Workshop"
}

export type OwnerInterviewQuestion = {
	topic: string
	question: string
	evidenceHint: string
}

export type Scenario = {
	key: ScenarioKey
	shortLabel: string
	title: string
	kicker: string
	brief: string
	objective: string
	doneWhen: string
	decision: string
	deadline: string
	interviewer: string
	ownerInterview: OwnerInterviewQuestion[]
	people: Person[]
	sources: Array<{ name: string; system: string; scope: string; records: string }>
	inquiries: string[]
	exception: {
		title: string
		trigger: string
		evidenceGap: string
		consequence: string
		alternative: string
		approveLabel: string
		alternativeLabel: string
		approvedConfirmation: string
		alternativeConfirmation: string
	}
	summary: string
}

const person = (
	id: string,
	name: string,
	role: string,
	department: string,
	email: string,
	influence: Person["influence"],
	focus: string,
	channel: Person["channel"],
): Person => ({
	id,
	name,
	initials: name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase(),
	role,
	department,
	email,
	influence,
	focus,
	channel,
})

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
	tprm: {
		key: "tprm",
		shortLabel: "TPRM",
		title: "Third-party onboarding control redesign",
		kicker: "Vendor risk · Operating model",
		brief:
			"Design a practical TPRM process for onboarding strategic vendors. Use our connected policies, open risk tickets, vendor files, and current approval history. Interview the right internal owners and resolve conflicting requirements before recommending the target process.",
		objective: "Approve a defensible vendor onboarding process with clear decision rights and evidence requirements.",
		doneWhen: "The control owners agree on risk tiers, evidence, exceptions, SLAs, and an implementation sequence.",
		decision: "Which controls must be live before the next strategic vendor is onboarded?",
		deadline: "Executive review · 18 Sep",
		interviewer: "Vendor-risk operating model lead",
		ownerInterview: [
			{ topic: "Decision pressure", question: "Before I speak with the control owners, what vendor-onboarding failure is most costly today: accepting the wrong risk, delaying a critical vendor, or losing the audit trail?", evidenceHint: "I’ll compare that priority with approval history and the open risk backlog." },
			{ topic: "Risk segmentation", question: "Which vendor characteristics should change the depth of diligence, and where does the current tiering break down?", evidenceHint: "I’ll test the answer against the third-party register and policy thresholds." },
			{ topic: "Operating friction", question: "Where does a normal onboarding request wait the longest today, and who has to intervene to move it forward?", evidenceHint: "I’ll reconcile that with Jira aging and contract-approval timestamps." },
			{ topic: "Decision rights", question: "Who can accept residual risk, and which exceptions must still reach an executive or committee?", evidenceHint: "I’ll map the authority boundary before MAX sends any resolution request." },
			{ topic: "Minimum evidence", question: "What evidence must exist before Procurement can sign, even when the business sponsor wants to move quickly?", evidenceHint: "I’ll compare the stated minimum with Security, Privacy, and contract records." },
			{ topic: "Success measure", question: "Ninety days after launch, which measurable result would convince you that the new TPRM process is working?", evidenceHint: "I’ll bind that measure to the operating model and implementation roadmap." },
		],
		people: [
			person("maya", "Maya Rao", "Vendor Risk Lead", "Risk", "maya.rao@northstar.com", "High", "Risk tiers, control ownership, acceptance thresholds", "Text"),
			person("daniel", "Daniel Kim", "Security Architect", "Cybersecurity", "daniel.kim@northstar.com", "High", "Security evidence, data access, exception controls", "Voice"),
			person("priya", "Priya Shah", "Privacy Counsel", "Legal", "priya.shah@northstar.com", "High", "Data processing terms, transfer risk, retention", "Text"),
			person("jordan", "Jordan Lee", "Procurement Director", "Procurement", "jordan.lee@northstar.com", "Medium", "Commercial intake, vendor SLAs, operating friction", "Workshop"),
		],
		sources: [
			{ name: "TPRM policy library", system: "OneDrive", scope: "Policies / Vendor Risk", records: "43 documents" },
			{ name: "Vendor risk backlog", system: "Jira", scope: "VRM and SEC projects", records: "126 issues" },
			{ name: "Third-party register", system: "ServiceNow", scope: "Active and pending vendors", records: "284 records" },
			{ name: "Contract approvals", system: "SharePoint", scope: "Legal / Procurement", records: "68 decisions" },
		],
		inquiries: ["Risk segmentation", "Security evidence", "Privacy and data use", "Decision rights", "Exception handling", "Operating SLAs"],
		exception: {
			title: "One external interview needs your approval",
			trigger: "Priya Shah recommended validating the vendor-specific retention terms with the vendor’s privacy counsel.",
			evidenceGap: "MAX checked the TPRM policy library and contract approvals. Neither source contains the vendor’s retention commitment, so MAX cannot infer it safely from internal evidence.",
			consequence: "Allowing this sends one 30-minute interview invitation with the Discovery disclosure. No internal evidence or attachments leave the workspace.",
			alternative: "Continuing internally records the missing vendor confirmation as an explicit limitation in the final recommendation.",
			approveLabel: "Allow one external interview",
			alternativeLabel: "Continue with internal evidence",
			approvedConfirmation: "Approved. I sent one scoped interview invitation without internal evidence and resumed the affected branch.",
			alternativeConfirmation: "Understood. I kept all outreach inside the workspace, recorded the missing vendor confirmation as an explicit limitation, and resumed the affected branch.",
		},
		summary:
			"The proposed TPRM model moves control depth to a risk-tiered intake, establishes Risk as the accountable gate owner, and requires Security and Privacy evidence before contract approval. It replaces serial reviews with a shared evidence record and a time-bound exception path.",
	},
	diligence: {
		key: "diligence",
		shortLabel: "PE diligence",
		title: "NorthBridge acquisition diligence",
		kicker: "Private equity · Investment committee",
		brief:
			"Assess the operational and technology risks of acquiring NorthBridge Analytics. Read the data room and deal tracker, interview the functional owners, reconcile management claims against evidence, and prepare the investment committee package.",
		objective: "Give the investment committee an evidence-backed view of value creation, execution risk, and Day 1 priorities.",
		doneWhen: "Material assumptions are evidenced, conflicts are resolved or disclosed, and the 100-day plan has accountable owners.",
		decision: "Proceed, reprice, or pause the acquisition based on validated operating risk.",
		deadline: "IC meeting · 25 Sep",
		interviewer: "Operating diligence lead",
		ownerInterview: [
			{ topic: "Investment decision", question: "What would have to be true for this deal to remain attractive, and which single finding would make the committee pause or reprice?", evidenceHint: "I’ll use that as the threshold for every diligence workstream." },
			{ topic: "Thesis assumptions", question: "Which management claim carries the most value in the investment thesis but currently has the weakest evidence?", evidenceHint: "I’ll reconcile it against the data room, pipeline, and finance extracts." },
			{ topic: "Revenue quality", question: "How should we distinguish durable recurring revenue from implementation or services revenue in the committee view?", evidenceHint: "I’ll test the definition against contract and ledger classifications." },
			{ topic: "Execution risk", question: "Which operating constraint could prevent the value-creation plan even if the commercial thesis is right?", evidenceHint: "I’ll route that risk to the accountable functional owner." },
			{ topic: "Day 1 authority", question: "Which decisions must be made before signing, and which can safely move into the first 100 days?", evidenceHint: "I’ll separate deal conditions from post-close actions." },
			{ topic: "Committee standard", question: "What evidence standard and unresolved-risk tolerance should the final IC package use?", evidenceHint: "I’ll apply it to readiness and disclose any remaining uncertainty." },
		],
		people: [
			person("elena", "Elena Park", "Deal Partner", "Investments", "elena.park@harborpeak.com", "High", "Investment thesis, valuation assumptions, decision thresholds", "Text"),
			person("marcus", "Marcus Reed", "Target CFO", "Finance", "marcus.reed@northbridge.io", "High", "Revenue quality, margin bridge, working capital", "Voice"),
			person("nate", "Nate Brooks", "COO", "Operations", "nate.brooks@northbridge.io", "High", "Delivery capacity, customer concentration, 100-day actions", "Workshop"),
			person("lauren", "Lauren Diaz", "Technology Diligence Lead", "Technology", "lauren.diaz@harborpeak.com", "Medium", "Platform debt, security exposure, integration cost", "Text"),
		],
		sources: [
			{ name: "Virtual data room", system: "OneDrive", scope: "NorthBridge deal room", records: "316 documents" },
			{ name: "Deal issues tracker", system: "Jira", scope: "NB diligence", records: "92 issues" },
			{ name: "Customer pipeline", system: "Salesforce", scope: "Target opportunity history", records: "1,824 records" },
			{ name: "Finance extracts", system: "NetSuite", scope: "24-month actuals", records: "18 tables" },
		],
		inquiries: ["Revenue quality", "Customer concentration", "Operating leverage", "Technology debt", "Management capacity", "100-day value creation"],
		exception: {
			title: "Management claim conflicts with booked revenue",
			trigger: "The CFO cites 94% recurring revenue, while the finance extract classifies 17% of the same contracts as implementation services.",
			evidenceGap: "MAX reconciled the data room, pipeline, and ledger extracts. The remaining discrepancy is a management classification decision, not a missing calculation.",
			consequence: "Opening the workshop brings Finance and the deal team together before the investment committee package is frozen.",
			alternative: "Continuing without the workshop preserves the discrepancy as a disclosed pricing and diligence risk.",
			approveLabel: "Open evidence workshop",
			alternativeLabel: "Disclose conflict and continue",
			approvedConfirmation: "I opened the evidence workshop with Finance and the deal team and resumed every unaffected diligence branch.",
			alternativeConfirmation: "I preserved the revenue discrepancy as a disclosed investment risk and continued the package with no unsupported conclusion.",
		},
		summary:
			"NorthBridge has a credible growth engine, but recurring revenue quality is overstated and the 100-day plan must absorb platform modernization earlier than assumed. The revised thesis remains investable if the purchase agreement and integration budget reflect those two risks.",
	},
	enterprise: {
		key: "enterprise",
		shortLabel: "Enterprise IT",
		title: "ServiceNow financial-control integration",
		kicker: "Enterprise IT · Finance operations",
		brief:
			"Define how ServiceNow should integrate with the internal financial controls platform for change approvals, evidence capture, and reconciliation. Read connected architecture and incident sources, interview Finance and IT owners, and produce the target operating model and delivery plan.",
		objective: "Establish one auditable financial-change workflow without duplicating ownership between ServiceNow and the controls platform.",
		doneWhen: "Systems of record, integration events, control evidence, exception paths, and phased delivery are agreed.",
		decision: "Which platform owns each control decision and what must synchronize before go-live?",
		deadline: "Architecture council · 3 Oct",
		interviewer: "Financial-controls transformation lead",
		ownerInterview: [
			{ topic: "Business trigger", question: "Which financial-change event should begin this workflow, and what goes wrong today when ServiceNow and the controls platform disagree?", evidenceHint: "I’ll trace that event through incident history and the current architecture." },
			{ topic: "System authority", question: "For requests, approvals, evidence, and attestations, which system should be authoritative for each record?", evidenceHint: "I’ll turn the answer into an explicit system-of-record matrix." },
			{ topic: "Control boundary", question: "Which finance changes must fail closed, even if an integration or downstream service is unavailable?", evidenceHint: "I’ll compare that boundary with the SOX control catalog." },
			{ topic: "Reconciliation", question: "How quickly must mismatched workflow and control records be detected, owned, and corrected?", evidenceHint: "I’ll define the durable reconciliation and escalation path." },
			{ topic: "Segregation of duties", question: "Which role combinations must the target design prevent, including during manual fallback?", evidenceHint: "I’ll validate the design against current role and incident evidence." },
			{ topic: "Go-live proof", question: "What must the architecture council see to approve a phased launch, and which metric proves the first phase is safe?", evidenceHint: "I’ll bind those gates to the roadmap and acceptance criteria." },
		],
		people: [
			person("ravi", "Ravi Menon", "Financial Controls Product Owner", "Finance", "ravi.menon@northstar.com", "High", "Control intent, evidence, approvals, auditability", "Text"),
			person("sarah", "Sarah Liu", "Controller", "Finance", "sarah.liu@northstar.com", "High", "Period close risk, segregation of duties, sign-off", "Voice"),
			person("andre", "Andre Baker", "Platform Architect", "Technology", "andre.baker@northstar.com", "High", "System boundaries, event model, reliability", "Workshop"),
			person("tessa", "Tessa Grant", "Change Management Lead", "Operations", "tessa.grant@northstar.com", "Medium", "Adoption, support model, rollout sequencing", "Text"),
		],
		sources: [
			{ name: "Change and incident history", system: "ServiceNow", scope: "Finance services", records: "2,418 records" },
			{ name: "Integration architecture", system: "OneDrive", scope: "Finance platform", records: "57 documents" },
			{ name: "Delivery backlog", system: "Jira", scope: "FINCTRL and SNOW", records: "344 issues" },
			{ name: "Control evidence catalog", system: "Internal API", scope: "SOX controls", records: "176 controls" },
		],
		inquiries: ["System ownership", "Financial control intent", "Integration events", "Evidence lineage", "Failure recovery", "Adoption and support"],
		exception: {
			title: "Proposed ownership violates segregation of duties",
			trigger: "The current design lets the same ServiceNow role request and attest a high-risk finance change when the controls API is unavailable.",
			evidenceGap: "MAX checked the SOX catalog, incident history, and role model. None permits this fallback without an independent attestor.",
			consequence: "Opening a design resolution case pauses only the affected integration decision while the remaining architecture work continues.",
			alternative: "Keeping the fail-closed boundary blocks high-risk changes during an outage and records the operational trade-off for council review.",
			approveLabel: "Open design resolution",
			alternativeLabel: "Keep the fail-closed boundary",
			approvedConfirmation: "I opened the design resolution case, preserved the segregation-of-duties constraint, and continued every unaffected architecture branch.",
			alternativeConfirmation: "I kept the fail-closed boundary, recorded the outage trade-off, and continued the architecture without weakening the control.",
		},
		summary:
			"ServiceNow should orchestrate workflow while the financial controls platform remains the authority for control definitions, evidence, and attestation. An event-driven boundary with durable reconciliation removes duplicate approvals and preserves a fail-closed path for high-risk changes.",
	},
}

export const OPERATIONS = [
	{ label: "Frame mission", detail: "Objective, done condition, authority, and decision horizon established" },
	{ label: "Read connected sources", detail: "Inquiry-scoped evidence indexed with access controls and provenance" },
	{ label: "Map the right people", detail: "Required roles identified and outreach prepared within policy" },
	{ label: "Run the inquiry program", detail: "Text, voice, and workshop interviews adapt to evidence gaps" },
	{ label: "Resolve material conflicts", detail: "Contradictions become owned, auditable resolution cases" },
	{ label: "Decide readiness", detail: "One canonical readiness snapshot freezes the evidence set" },
	{ label: "Build the package", detail: "Synthesis and deliverables generate from one versioned manifest" },
	{ label: "Distribute and hand off", detail: "Approvers receive the package and downstream work is created" },
] as const

// Operation labels are imperatives; sentences about a running operation need the
// gerund instead ("MAX is running the inquiry program", not "handling run the…").
export const OPERATION_ACTIVITY = [
	"framing the mission",
	"reading the connected sources",
	"mapping the right people",
	"running the inquiry program",
	"resolving material conflicts",
	"deciding readiness",
	"building the decision package",
	"distributing the package and handing off",
] as const

// Minutes elapsed from the run's real start for each completed operation. The
// autonomy ledger derives clock times from these instead of hardcoded stamps.
export const OPERATION_ELAPSED_MINUTES = [0, 3, 7, 14, 22, 27, 32, 36] as const

// The rotating "now" line under Now handling: two or three concrete micro-actions
// per operation, built from the scenario's own sources, people, and inquiries.
export function nowActions(scenario: Scenario, phase: number, people: Person[]): string[] {
	const roster = people.length ? people : scenario.people
	const [first, second, third] = scenario.sources
	const records = scenario.sources.reduce((total, source) => total + Number(source.records.replace(/[^0-9]/g, "")), 0)
	const byPhase: string[][] = [
		[`Bounding the objective and completion condition`, `Setting the interruption boundary with the ${scenario.interviewer.toLowerCase()}`, `Locking the decision horizon · ${scenario.deadline}`],
		[`Reading ${first.name} · ${first.records}`, `Indexing ${second.name} · ${second.records}`, `Retaining record-level provenance on ${third.name}`],
		[`Matching ${scenario.inquiries[0].toLowerCase()} to an accountable owner`, `Preparing ${roster[0]?.channel.toLowerCase() ?? "text"} outreach for ${roster[0]?.name ?? "the control owner"}`, `Checking recipient policy for ${roster.length} stakeholders`],
		[`Interviewing ${roster[0]?.name ?? "the first owner"} · ${scenario.inquiries[0].toLowerCase()}`, `Follow-up queued for ${roster[1]?.name ?? "the second owner"}`, `Skipping questions already answered by ${second.name}`],
		[`Comparing ${scenario.inquiries[0].toLowerCase()} against ${first.name}`, `Reconciling ${roster[1]?.name ?? "Security"} and ${roster[2]?.name ?? "Legal"} on ${scenario.inquiries[3].toLowerCase()}`, `Isolating the exception before it reaches you`],
		[`Binding every claim to readiness snapshot v7`, `Confirming accountable owners for ${scenario.inquiries[4].toLowerCase()}`, `Freezing the evidence set · ${records.toLocaleString()} records`],
		[`Generating ${DELIVERABLES.length} linked deliverables from manifest v4`, `Binding citations back to ${first.system} and ${second.system}`, `Checking that every recommendation carries a source`],
		[`Routing each artifact to its approved recipient`, `Creating the downstream implementation work`, `Recording the handoff in the audit trail`],
	]
	return byPhase[Math.max(0, Math.min(phase, byPhase.length - 1))]
}

export const DELIVERABLES = [
	{ name: "Executive decision brief", audience: "Executive sponsor", rationale: "Decision, trade-offs, and unresolved exposure" },
	{ name: "Target operating model", audience: "Operating owners", rationale: "Decision rights, controls, roles, and handoffs" },
	{ name: "Requirements and controls", audience: "Delivery team", rationale: "Testable requirements with evidence lineage" },
	{ name: "RAID register", audience: "Program governance", rationale: "Risks, assumptions, issues, decisions, and owners" },
	{ name: "Implementation roadmap", audience: "Transformation lead", rationale: "Sequenced work, dependencies, and checkpoints" },
] as const

export type DeliverableBody = {
	heading: string
	lede: string
	sections: Array<{ heading: string; body: string }>
	findings: Array<{ label: string; detail: string }>
	citations: string[]
}

// Each deliverable in the package reads as its own document. Bodies are indexed
// parallel to DELIVERABLES so the reader switches content, not just the header.
export const DELIVERABLE_CONTENT: Record<ScenarioKey, DeliverableBody[]> = {
	tprm: [
		{
			heading: "The decision",
			lede: "Approve a risk-tiered onboarding gate that makes Vendor Risk the accountable gate owner and requires Security and Privacy evidence before contract signature. Four serial reviews collapse into one shared evidence record; nothing in the audit trail is weakened.",
			sections: [
				{ heading: "Why this reached you", body: "Sponsors bypass the process once a review passes ten days. Contract approval history shows 22 of 68 decisions were signed while at least one review was still open, which is the exposure this redesign closes." },
				{ heading: "What the decision costs", body: "One standing executive judgment: whether a strategic vendor may onboard on provisional evidence while Privacy completes retention review. Every tier below that threshold is delegated and does not return to you." },
			],
			findings: [
				{ label: "Recommended decision", detail: "Require tiering, security evidence, and privacy terms live before the next strategic vendor is onboarded. Defer SLA automation to phase three." },
				{ label: "Unresolved exposure", detail: "The vendor's retention commitment is not evidenced in any internal source. It is carried as an explicit limitation rather than inferred." },
			],
			citations: ["[SRC-014]", "[INT-MAYA-08]", "[CASE-003]", "Readiness v7"],
		},
		{
			heading: "The target model",
			lede: "Intake determines the tier, and the tier determines the depth of diligence. Risk owns the gate, Security and Privacy own their evidence, Procurement owns the commercial close, and no single role both requests and accepts residual risk.",
			sections: [
				{ heading: "Decision rights", body: "Tier 3 residual risk is accepted by the Vendor Risk Lead alone. Tier 2 requires Risk and Security jointly. Tier 1 residual acceptance reaches the executive committee, and only there — the current model has no such boundary, which is why exceptions accumulate." },
				{ heading: "Handoffs", body: "The four serial reviews become parallel checks against one shared evidence record. Procurement signs from that record rather than from an approval thread, so the audit trail is a by-product of the process instead of a reconstruction." },
			],
			findings: [
				{ label: "Accountable owner", detail: "Vendor Risk Lead owns the gate and its exception log; Procurement owns cycle time and intake quality." },
				{ label: "Escalation boundary", detail: "Only Tier 1 residual acceptance and policy exceptions leave the operating layer. Everything else is closed by the named owner." },
			],
			citations: ["[SRC-014]", "[SRC-031]", "[INT-JORDAN-04]", "Readiness v7"],
		},
		{
			heading: "Requirements and control points",
			lede: "Eighteen testable requirements bind the operating model to the systems that already hold the evidence. Each one names the control it satisfies, the system of record, and the test that proves it in production.",
			sections: [
				{ heading: "Control points", body: "Tiering is computed at intake from data class, access scope, and spend, and is immutable after gate entry. Security evidence, privacy terms, and residual acceptance are separate control points with separate owners; none can be satisfied by the same actor." },
				{ heading: "Evidence lineage", body: "Every gate decision writes an immutable record linking the tier, the evidence artifacts, the accepting role, and the timestamp. Records referencing a superseded policy version are flagged rather than silently re-pointed." },
			],
			findings: [
				{ label: "Highest-risk requirement", detail: "REQ-09: a Tier 1 vendor cannot reach contract signature without a privacy retention artifact or an explicit, time-bound exception." },
				{ label: "Test that proves it", detail: "Replay the 68 historical contract approvals through the new gate; every one that signed with an open review must fail closed." },
			],
			citations: ["[SRC-014]", "[SRC-088]", "[INT-DANIEL-03]", "Readiness v7"],
		},
		{
			heading: "Register summary",
			lede: "Nine risks, four assumptions, three issues, and six decisions carry a named owner and a response date. Two items sit at executive level; the remaining sixteen are owned and dated inside the operating layer.",
			sections: [
				{ heading: "Open at executive level", body: "R-02 — strategic vendors may still onboard on provisional evidence while retention review completes. D-05 — whether the exception window is 15 or 30 days remains undecided, and the roadmap assumes 15." },
				{ heading: "Assumptions under test", body: "A-01 assumes the third-party register is the authoritative vendor list; 284 records were reconciled and 11 were found only in contract approvals. A-03 assumes Security capacity supports parallel review at current volume." },
			],
			findings: [
				{ label: "Highest-rated risk", detail: "R-02, rated high/likely: without a hard retention gate, the audit trail breaks exactly where it is most often examined." },
				{ label: "Decision awaiting a date", detail: "D-05 must close before phase two, or the exception window becomes whatever the first exception sets." },
			],
			citations: ["[SRC-031]", "[SRC-088]", "[CASE-003]", "Readiness v7"],
		},
		{
			heading: "Sequenced implementation",
			lede: "Three phases across eleven weeks. Phase one makes the gate real for new vendors, phase two migrates the in-flight backlog, and phase three automates SLA and exception reporting once the manual path is proven.",
			sections: [
				{ heading: "Sequence", body: "Weeks 1–3: tiering at intake plus the shared evidence record. Weeks 4–8: parallel Security and Privacy review with the residual-acceptance boundary enforced. Weeks 9–11: SLA instrumentation and the exception dashboard." },
				{ heading: "Checkpoints", body: "Gate A at week 3 requires ten vendors tiered without a manual override. Gate B at week 8 requires zero contract signatures with an open review. Gate C at week 11 requires exception ageing to be visible to the committee without a report request." },
			],
			findings: [
				{ label: "Critical path", detail: "Tiering at intake blocks everything downstream; it depends only on the register reconciliation, which is complete." },
				{ label: "First measurable proof", detail: "Median time from intake to gate decision, measured at week 8 against the 126-issue backlog baseline." },
			],
			citations: ["[SRC-031]", "[INT-JORDAN-04]", "[CASE-007]", "Readiness v7"],
		},
	],
	diligence: [
		{
			heading: "The committee decision",
			lede: "Proceed, but reprice. The commercial thesis survives diligence; the recurring-revenue quality and the platform modernization timing do not survive it unchanged, and both belong in the purchase agreement rather than the first board pack after close.",
			sections: [
				{ heading: "Why this reached you", body: "Management describes 94% recurring revenue while the finance extract classifies 17% of the same contracts as implementation services. The gap is a classification decision, not a calculation error, and it moves the multiple." },
				{ heading: "What the decision costs", body: "Repricing requires reopening one term with the seller. Proceeding without it means the committee approves a thesis whose largest line item is defined differently by the two sides of the table." },
			],
			findings: [
				{ label: "Recommended decision", detail: "Proceed at a revised price with a recurring-revenue definition written into the agreement and modernization funded in the integration budget." },
				{ label: "Unresolved exposure", detail: "The revenue classification conflict is disclosed rather than resolved; no committee conclusion rests on the management figure." },
			],
			citations: ["[VDR-118]", "[INT-MARCUS-02]", "[LEDGER-24M]", "Readiness v7"],
		},
		{
			heading: "Post-close operating model",
			lede: "Delivery capacity, not demand, is the constraint. The operating model concentrates Day 1 authority in three named owners and defers everything that does not change the first 100 days.",
			sections: [
				{ heading: "Decision rights", body: "The COO owns delivery capacity and customer concentration response. The Technology Diligence Lead owns platform debt sequencing. The Deal Partner owns the value-creation plan and is the only role that can re-open a diligence conclusion." },
				{ heading: "Handoffs", body: "Finance integration runs on the target's ledger until the recurring-revenue definition is agreed in writing; reporting on the acquirer's definition before that point would restate the same conflict inside the acquirer's numbers." },
			],
			findings: [
				{ label: "Accountable owner", detail: "COO owns the 100-day plan; the Deal Partner owns the thesis and any change to it." },
				{ label: "Escalation boundary", detail: "Any variance that touches the repricing assumptions returns to the committee, not to the integration steering group." },
			],
			citations: ["[VDR-204]", "[INT-NATE-05]", "[PIPE-1824]", "Readiness v7"],
		},
		{
			heading: "Diligence requirements and evidence tests",
			lede: "Fourteen requirements convert diligence findings into conditions that can be tested before signing rather than discovered after close. Each names the evidence, the owner, and the state it must reach.",
			sections: [
				{ heading: "Control points", body: "Revenue classification, customer concentration disclosure, platform modernization cost, and key-person retention are separately evidenced. No condition may be satisfied by management representation alone where a system of record exists." },
				{ heading: "Evidence lineage", body: "Every conclusion links to the data-room document, ledger extract, or pipeline record it rests on. The 316 data-room documents were indexed with provenance, so any committee challenge resolves to a source rather than to a recollection." },
			],
			findings: [
				{ label: "Highest-risk requirement", detail: "REQ-04: recurring revenue must be defined contractually before signing, with the ledger classification as the tie-breaker." },
				{ label: "Test that proves it", detail: "Re-run the 24-month ledger under the agreed definition; the resulting recurring share must be the figure in the committee model." },
			],
			citations: ["[VDR-118]", "[LEDGER-24M]", "[INT-LAUREN-01]", "Readiness v7"],
		},
		{
			heading: "Register summary",
			lede: "Eleven risks, five assumptions, two issues, and four decisions carry owners and dates. Three items are committee-level; the rest belong to the integration plan and close before day 30.",
			sections: [
				{ heading: "Open at committee level", body: "R-01 — recurring revenue quality is overstated under the acquirer's definition. R-04 — the top five customers represent a concentration the value plan does not currently hedge. D-02 — whether modernization is funded from the integration budget or the purchase price." },
				{ heading: "Assumptions under test", body: "A-02 assumes delivery capacity scales with hiring alone; the COO interview indicates a tooling constraint that hiring does not remove. A-05 assumes no key-person dependency in the platform team, which the technology review contradicts for two roles." },
			],
			findings: [
				{ label: "Highest-rated risk", detail: "R-01, rated high/likely: it is the single finding most capable of changing the committee's answer." },
				{ label: "Decision awaiting a date", detail: "D-02 must close before the purchase agreement is drafted, or modernization is funded twice or not at all." },
			],
			citations: ["[VDR-204]", "[INT-NATE-05]", "[LEDGER-24M]", "Readiness v7"],
		},
		{
			heading: "First 100 days",
			lede: "Three phases from signing to day 100. Conditions that must be true before signing are separated from actions that can safely wait, so the committee approves a sequence rather than an intention.",
			sections: [
				{ heading: "Sequence", body: "Pre-signing: revenue definition agreed, modernization cost fixed, retention terms for two key roles. Days 1–45: delivery capacity plan and concentration response. Days 46–100: platform modernization start and reporting migration." },
				{ heading: "Checkpoints", body: "Day 1 requires the agreed revenue definition in the purchase agreement. Day 45 requires delivery capacity evidenced against the pipeline, not forecast. Day 100 requires modernization underway with its budget already committed." },
			],
			findings: [
				{ label: "Critical path", detail: "The revenue definition gates the committee model, the purchase agreement, and reporting migration — nothing else can be sequenced around it." },
				{ label: "First measurable proof", detail: "Recurring share reported on the agreed definition at day 45, compared to the diligence figure." },
			],
			citations: ["[VDR-118]", "[PIPE-1824]", "[INT-MARCUS-02]", "Readiness v7"],
		},
	],
	enterprise: [
		{
			heading: "The architecture decision",
			lede: "ServiceNow orchestrates the workflow; the financial controls platform stays authoritative for control definitions, evidence, and attestation. One event-driven boundary with durable reconciliation replaces the duplicate approval paths that produce today's mismatches.",
			sections: [
				{ heading: "Why this reached you", body: "Incident history shows finance changes recorded as approved in one system and pending in the other. The disagreement is structural: both platforms currently believe they own the approval record." },
				{ heading: "What the decision costs", body: "One boundary must fail closed. High-risk finance changes cannot proceed during a controls-API outage, and the council must accept that operational cost rather than permit a same-role fallback." },
			],
			findings: [
				{ label: "Recommended decision", detail: "Controls platform owns control definitions, evidence, and attestation. ServiceNow owns request, routing, and fulfilment. No record is authored twice." },
				{ label: "Unresolved exposure", detail: "The fail-closed boundary blocks high-risk changes during an outage. The trade-off is recorded for council review rather than engineered away." },
			],
			citations: ["[SOX-041]", "[INC-2418]", "[INT-RAVI-06]", "Readiness v7"],
		},
		{
			heading: "The target model",
			lede: "A system-of-record matrix, not a preference. For requests, approvals, evidence, and attestations, exactly one platform is authoritative and the other holds a reconciled copy with an explicit staleness bound.",
			sections: [
				{ heading: "Decision rights", body: "Requests and routing: ServiceNow. Control definitions, evidence, and attestation: the controls platform. Emergency changes: ServiceNow may record, but the attestation still originates in the controls platform and cannot be authored by the requester." },
				{ heading: "Handoffs", body: "Integration events carry the control identifier, not just the change identifier, so evidence can be located from either side. Mismatches raise a reconciliation case with a named owner within fifteen minutes instead of surfacing at period close." },
			],
			findings: [
				{ label: "Accountable owner", detail: "The Financial Controls Product Owner owns the matrix; the Platform Architect owns the event contract and its versioning." },
				{ label: "Escalation boundary", detail: "Any change to the matrix is an architecture-council decision. Reconciliation ownership and timing are operational." },
			],
			citations: ["[ARCH-057]", "[SOX-041]", "[INT-ANDRE-02]", "Readiness v7"],
		},
		{
			heading: "Requirements and control points",
			lede: "Twenty-two requirements bind the integration to the SOX control catalog. Each names the control it satisfies, the authoritative system, the event that carries it, and the reconciliation behaviour when the event is lost.",
			sections: [
				{ heading: "Control points", body: "Segregation of duties is enforced at attestation, not at request. The same identity may not both raise and attest a high-risk finance change under any fallback path, including manual entry during an outage." },
				{ heading: "Evidence lineage", body: "Every control decision links the change record, the control identifier, the evidence artifact, and the attesting identity. All 176 catalog controls were mapped; 14 currently have no automated evidence path and are listed explicitly rather than assumed covered." },
			],
			findings: [
				{ label: "Highest-risk requirement", detail: "REQ-11: manual fallback must preserve segregation of duties, which the current design does not — this is the exception that reached you." },
				{ label: "Test that proves it", detail: "Simulate a controls-API outage and attempt a high-risk change end to end; the attempt must fail closed and raise a reconciliation case." },
			],
			citations: ["[SOX-041]", "[ARCH-057]", "[INC-2418]", "Readiness v7"],
		},
		{
			heading: "Register summary",
			lede: "Ten risks, six assumptions, four issues, and five decisions carry owners and response dates. Two are council-level; the remainder are owned within the delivery backlog and dated before the phased launch.",
			sections: [
				{ heading: "Open at council level", body: "R-03 — the fail-closed boundary blocks high-risk changes during an outage, with no approved manual path. D-01 — whether attestation for emergency changes may be deferred by up to 24 hours, which the SOX catalog neither permits nor prohibits explicitly." },
				{ heading: "Assumptions under test", body: "A-01 assumes the controls API meets a 99.9% availability target; incident history shows two multi-hour outages in twelve months. A-04 assumes Change Management can absorb the new evidence step without added headcount." },
			],
			findings: [
				{ label: "Highest-rated risk", detail: "R-03, rated high/possible: the control is correct, but the operational impact has not been accepted by anyone yet." },
				{ label: "Decision awaiting a date", detail: "D-01 must close before phase one go-live, or emergency changes will define the rule by precedent." },
			],
			citations: ["[INC-2418]", "[SOX-041]", "[INT-SARAH-03]", "Readiness v7"],
		},
		{
			heading: "Phased delivery",
			lede: "Three phases across fourteen weeks. Phase one proves the event contract on low-risk changes, phase two moves high-risk changes behind the fail-closed boundary, and phase three retires the duplicate approval path.",
			sections: [
				{ heading: "Sequence", body: "Weeks 1–4: event contract, control identifiers, and reconciliation cases on low-risk change types. Weeks 5–10: high-risk changes with attestation in the controls platform. Weeks 11–14: duplicate approval path retired and period-close reporting migrated." },
				{ heading: "Checkpoints", body: "Gate A at week 4 requires zero unreconciled records over a full close cycle. Gate B at week 10 requires the outage simulation to fail closed. Gate C at week 14 requires no approval authored in both systems for thirty consecutive days." },
			],
			findings: [
				{ label: "Critical path", detail: "The event contract gates every later phase; it depends on the system-of-record matrix being ratified, which is this package's decision." },
				{ label: "First measurable proof", detail: "Unreconciled finance-change records per close cycle, measured at week 4 against the current baseline." },
			],
			citations: ["[ARCH-057]", "[INC-2418]", "[INT-TESSA-01]", "Readiness v7"],
		},
	],
}
