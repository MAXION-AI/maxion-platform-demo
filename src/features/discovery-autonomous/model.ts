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

export const DELIVERABLES = [
	{ name: "Executive decision brief", audience: "Executive sponsor", rationale: "Decision, trade-offs, and unresolved exposure" },
	{ name: "Target operating model", audience: "Operating owners", rationale: "Decision rights, controls, roles, and handoffs" },
	{ name: "Requirements and controls", audience: "Delivery team", rationale: "Testable requirements with evidence lineage" },
	{ name: "RAID register", audience: "Program governance", rationale: "Risks, assumptions, issues, decisions, and owners" },
	{ name: "Implementation roadmap", audience: "Transformation lead", rationale: "Sequenced work, dependencies, and checkpoints" },
] as const
