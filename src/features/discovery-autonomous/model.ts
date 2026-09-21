import { DELIVERABLES } from "./deliverables"

export { DELIVERABLES, DELIVERABLE_CONTENT, deliverableBodies } from "./deliverables"
export type { DeliverableBody, DeliverableDecision, DeliverableSection, Exhibit } from "./deliverables"

export type ScenarioKey = "tprm" | "diligence" | "enterprise" | "revenue" | "servicenow" | "ordersync"

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
	// Terms that route a written brief to this scenario. The setup screen takes
	// free text rather than a scenario picker, so the brief itself has to say
	// which investigation MAX is being asked to run.
	match: string[]
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
	/*
	 * Where the finished package goes. Most Discoveries hand a plan to Plan; an
	 * operational design goes to Agentix as the named package, which an agent team
	 * then runs. Absent means Plan.
	 */
	handoff?: { target: "agentix"; packageId: string; opensAs: string }
}

/*
 * Every Discovery hands its package to Agentix. Plan is no longer a destination from Discovery,
 * so this is a single value rather than a fork; it stays a named type because the copy reads
 * "Continue to {destination}" in a dozen places.
 */
export type HandoffDestination = "Agentix"
export const handoffDestination = (_key: ScenarioKey): HandoffDestination => "Agentix"

const DAY = 86_400_000
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const LONDON_DATE = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "numeric" })
/*
 * A date a number of days after today in London, where the revenue scenario's finance team
 * works and where Agentix keeps time, as the cockpit pill writes it ("25 Sep"). A live demo's
 * deadline is therefore always ahead of it, whatever the presenter's own time zone.
 */
const daysAhead = (days: number) => {
	const parts = Object.fromEntries(LONDON_DATE.formatToParts(new Date(Date.now() + days * DAY)).map(part => [part.type, part.value]))
	return `${Number(parts.day)} ${SHORT_MONTHS[Number(parts.month) - 1]}`
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
		match: ["vendor", "third-party", "third party", "tprm", "supplier", "onboarding", "due diligence questionnaire", "procurement", "vendor risk"],
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
		match: ["acquisition", "acquire", "diligence", "investment committee", "deal", "target company", "data room", "100-day", "northbridge", "buy-side", "valuation"],
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
		match: ["servicenow", "service now", "snow", "financial control", "financial controls", "controls platform", "sox", "journal", "reconciliation", "period close", "month-end", "month end", "period-end", "close process", "financial close", "segregation of duties", "change approval", "finance operations", "workday", "erp"],
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
	/*
	 * The customer demo's Discovery. Its figures are the ones the Agentix
	 * revenue engagement later works with (engine/scenarios.ts REVENUE_FIGURES and
	 * pkg_revenue_v2), so the story reads as one piece of work from the first
	 * interview question to the daily reconciliation.
	 */
	revenue: {
		key: "revenue",
		shortLabel: "Revenue data",
		match: ["revenue reconciliation", "reconcile revenue", "reconcile daily revenue", "daily revenue", "billing ledger", "revenue schema", "revenue dashboard", "sql server", "on-prem", "data pipeline", "data engineering", "to aws", "into aws", "the aws", "revenue", "ledger", "dashboard"],
		title: "Revenue reconciliation: SQL Server to AWS",
		kicker: "Finance data · Revenue operations",
		brief:
			"Reconcile daily revenue between our on-prem SQL Server billing ledger and the AWS revenue schema, and give finance a revenue dashboard they can trust by 07:00 London. Read the ledger sample, close workbooks and variance log, interview the finance and data owners, and design the daily operation an agent team will run.",
		objective: "Agree an operating design that keeps daily revenue in AWS within $50 per region of the billing ledger, with a verified dashboard by 07:00 London.",
		doneWhen: "The mapping, recognition rules, tolerance, exception routing and release authority are agreed, and every open question is recorded for Agentix.",
		decision: "What must be true before an agent team runs the daily revenue reconciliation, and which decisions stay with the revenue owner?",
		get deadline() { return `Finance leadership · ${daysAhead(7)}` },
		interviewer: "Revenue data operations lead",
		ownerInterview: [
			{ topic: "Decision pressure", question: "Before I read the ledger, what costs you most when revenue doesn’t reconcile today: a late close, a number finance can’t explain, or a dashboard nobody trusts?", evidenceHint: "I’ll compare that with the variance log and the last twelve close workbooks." },
			{ topic: "Reconciliation gaps", question: "Where do the billing ledger and the AWS numbers disagree today, and who usually finds it?", evidenceHint: "I’ll test that against the 30-day ledger sample and the variance log." },
			{ topic: "Tolerance", question: "What daily difference between the ledger and AWS can finance live with, and which variances must always reach you?", evidenceHint: "I’ll bind the tolerance to the close policy before any agent uses it." },
			{ topic: "Recognition rules", question: "Which date and exchange rate should daily revenue use: the invoice date, the posting date, or something else?", evidenceHint: "I’ll check the rule against how the ledger posts and how the close is signed off." },
			{ topic: "Release authority", question: "Who may approve a change that reaches the production revenue schema or the finance dashboard?", evidenceHint: "What you settle becomes the release policy the agent team follows; anything still open goes to Agentix as a question." },
			{ topic: "Success measure", question: "Thirty days after go-live, what would convince you the daily reconciliation is working?", evidenceHint: "I’ll turn it into the outcome criteria Agentix is measured against." },
		],
		people: [
			person("olivia", "Olivia Hart", "Revenue Operations Director", "Finance", "olivia.hart@northstar.com", "High", "Daily tolerance, variance decisions, who owns the outcome", "Text"),
			person("grace", "Grace Chen", "Billing Systems Manager", "Finance Systems", "grace.chen@northstar.com", "High", "SQL Server billing ledger, region codes, credit notes", "Voice"),
			person("sam", "Sam Okafor", "Data Platform Lead", "Data & Analytics", "sam.okafor@northstar.com", "High", "AWS revenue schema, isolated testing, production releases", "Workshop"),
			person("tom", "Tom Whitfield", "Financial Controller", "Finance", "tom.whitfield@northstar.com", "Medium", "Posting-date recognition, exchange rates, close sign-off", "Text"),
		],
		sources: [
			{ name: "Billing ledger sample", system: "SQL Server", scope: "30 days · read only via the existing gateway", records: "4,812 invoices" },
			{ name: "Month-end close workbooks", system: "SharePoint", scope: "Finance / Close", records: "36 workbooks" },
			{ name: "Revenue variance log", system: "Jira", scope: "FINOPS project", records: "418 variances" },
			{ name: "Data platform runbooks", system: "Confluence", scope: "Data platform and ingestion spaces", records: "64 pages" },
		],
		inquiries: ["Reconciliation gaps", "Source data quality", "Recognition and FX", "Tolerance and decision rights", "Release authority", "Dashboard use"],
		exception: {
			title: "The close workbooks convert currency on a different date than the ledger",
			trigger: "Tom Whitfield recommended one standard after his close workbooks converted 14 non-USD invoices at invoice-date rates while the ledger posts them at posting-date rates, $126.24 apart across EMEA and APAC.",
			evidenceGap: "MAX compared the 30-day ledger sample with the last twelve close workbooks. Each convention is applied consistently; which one is authoritative is a finance policy decision, not a calculation MAX can make.",
			consequence: "Adopting posting-date rates makes the ledger the single standard. The next close restates 14 invoices in the workbooks, and Agentix tests every conversion against posting-date rates.",
			alternative: "Keeping both conventions records the $126.24 as a known reconciling item. Agentix still converts at posting-date rates to match the ledger.",
			approveLabel: "Adopt posting-date rates",
			alternativeLabel: "Record the difference instead",
			approvedConfirmation: "Recorded. Posting-date rates are now the standard: the close workbooks restate 14 invoices at the next close, and Agentix will test every conversion against the ledger’s rates. I resumed the affected branch.",
			alternativeConfirmation: "Understood. The close workbooks keep their convention and the $126.24 is recorded as a known reconciling item. Agentix still converts at posting-date rates to match the ledger. I resumed the affected branch.",
		},
		summary:
			"Daily revenue can move from the SQL Server billing ledger to the AWS revenue schema under an agent team, provided the ledger stays the system of record, currency converts at posting-date rates and every production change is released under an agreed policy. Reconciliation runs at 06:00 London within $50 per region, variances above $200 go to the revenue owner, and finance sees a verified dashboard by 07:00.",
		handoff: { target: "agentix", packageId: "pkg_revenue_v2", opensAs: "A new Agentix engagement created from this package: four agents with separate permissions, three milestones and a daily operation" },
	},
	/*
	 * The second customer demo's Discovery. Calder Industrial runs accounts-payable
	 * invoice exceptions as ServiceNow Finance Operations cases. Its figures are the ones
	 * the Agentix AP exception engagement later works with (engine/scenarios.ts
	 * AP_FIGURES and pkg_ap_exceptions_v2).
	 */
	servicenow: {
		key: "servicenow",
		shortLabel: "AP exceptions",
		match: ["invoice exception", "invoice exceptions", "accounts payable", "three-way match", "three way match", "delegation of authority", "ap exception", "payment approval", "price tolerance", "purchase order", "early payment discount", "invoice approval", "supplier invoice", "finance operations queue", "ap analysts"],
		title: "AP invoice exceptions: ServiceNow triage and approval authority",
		kicker: "Finance operations · Accounts payable",
		brief:
			"Clear our accounts payable invoice exceptions in ServiceNow without losing control of who may approve what. Read the exception queue, the purchase-order tolerance rules, the supplier contracts and the delegation of authority matrix, interview the AP and procurement owners, and design the daily operation an agent team will run.",
		objective: "Agree an operating design that resolves mechanical AP invoice exceptions automatically and routes every approval to someone the delegation of authority actually names.",
		doneWhen: "The exception taxonomy, tolerance authority, routing rules, escalation thresholds and release authority are agreed, and every open question is recorded for Agentix.",
		decision: "What must be true before an agent team clears AP invoice exceptions, and which approvals stay with a person?",
		get deadline() { return `Finance leadership · ${daysAhead(7)}` },
		interviewer: "Finance operations lead",
		ownerInterview: [
			{ topic: "Decision pressure", question: "Before I read the queue, what costs you most today: the days an exception sits, the discounts you lose while it waits, or approvals landing on the wrong person?", evidenceHint: "I’ll compare that with the exception queue and the last twelve months of payment runs." },
			{ topic: "Exception mix", question: "Which invoice exceptions do your analysts resolve without ever asking a question, and which always need judgement?", evidenceHint: "I’ll test that against the 1,900-case queue and how each case was actually closed." },
			{ topic: "Tolerance authority", question: "When a purchase order and a supplier contract disagree on price tolerance, which one wins?", evidenceHint: "I’ll check the rule against the contracts and the tolerances ServiceNow applies today." },
			{ topic: "Approval routing", question: "Who may approve an invoice above tolerance, and how do you know that person still holds the authority?", evidenceHint: "I’ll reconcile the routing rules against the delegation of authority matrix and the HR leaver records." },
			{ topic: "Release authority", question: "Who may approve a change that reaches the production ServiceNow instance or releases a payment?", evidenceHint: "What you settle becomes the release policy the agent team follows; anything still open goes to Agentix as a question." },
			{ topic: "Success measure", question: "Ninety days after go-live, what would convince you the exception queue is under control?", evidenceHint: "I’ll turn it into the outcome criteria Agentix is measured against." },
		],
		people: [
			person("priya", "Priya Raman", "Head of Accounts Payable", "Finance Operations", "priya.raman@calderindustrial.com", "High", "Exception queue, payment runs, who may approve what", "Text"),
			person("marcus", "Marcus Bell", "ServiceNow Platform Owner", "Enterprise Systems", "marcus.bell@calderindustrial.com", "High", "Finance Operations tables, flows, production change windows", "Voice"),
			person("ines", "Inés Duarte", "Procurement Contracts Manager", "Procurement", "ines.duarte@calderindustrial.com", "High", "Supplier contracts, negotiated tolerances, category buyers", "Workshop"),
			person("david", "David Osei", "Financial Controller", "Finance", "david.osei@calderindustrial.com", "Medium", "Delegation of authority, escalation thresholds, audit evidence", "Text"),
		],
		sources: [
			{ name: "Invoice exception queue", system: "ServiceNow", scope: "Finance Operations · read only", records: "1,904 cases" },
			{ name: "Supplier contracts", system: "SAP Ariba", scope: "Active contracts, top 200 suppliers", records: "212 contracts" },
			{ name: "Delegation of authority matrix", system: "SharePoint", scope: "Finance / Controls", records: "1 matrix · 84 rows" },
			{ name: "Payment run history", system: "SAP S/4HANA", scope: "12 months of AP payment runs", records: "38,410 invoices" },
		],
		inquiries: ["Exception mix and causes", "Tolerance authority", "Approval routing integrity", "Discount capture", "Release authority", "Audit evidence"],
		exception: {
			title: "The purchase order and the supplier contract set different price tolerances",
			trigger: "Inés Duarte flagged that ServiceNow applies the purchase-order tolerance of ±2% or $25, while 212 active supplier contracts negotiate a flat ±1.5%. The two rules disagree on 240 invoices worth $84,310.55.",
			evidenceGap: "MAX reconciled the exception queue against the contract register. Each rule is applied consistently where it is used; which one is authoritative is a commercial policy decision, not a calculation MAX can make.",
			consequence: "Making the contract tolerance authoritative narrows the band on 212 suppliers. 240 invoices that auto-cleared under the purchase-order rule become exceptions the first month, and Agentix tests every tolerance decision against the contract.",
			alternative: "Keeping the purchase-order tolerance leaves the $84,310.55 as accepted leakage against negotiated terms. Agentix still records which rule cleared each invoice.",
			approveLabel: "Make the contract tolerance authoritative",
			alternativeLabel: "Keep the purchase-order tolerance",
			approvedConfirmation: "Recorded. The negotiated contract tolerance is now authoritative: 240 invoices become exceptions at the first run, and Agentix will test every tolerance decision against the contract register. I resumed the affected branch.",
			alternativeConfirmation: "Understood. The purchase-order tolerance stands and the $84,310.55 is recorded as accepted leakage against negotiated terms. Agentix will still record which rule cleared each invoice. I resumed the affected branch.",
		},
		summary:
			"AP invoice exceptions can be cleared by an agent team, provided the negotiated supplier contract is the authority for price tolerance, every approval routes to a person the delegation of authority currently names, and each production change is released under an agreed policy. Mechanical exceptions clear within the day, anything above $5,000 or outside tolerance reaches a named approver, and finance sees a verified exception dashboard by 08:00 London.",
		handoff: { target: "agentix", packageId: "pkg_ap_exceptions_v2", opensAs: "A new Agentix engagement created from this package: four agents with separate permissions, three milestones and a daily operation" },
	},
	/*
	 * The third customer demo's Discovery. Arcline Technologies books orders in Salesforce CPQ
	 * and posts them as SAP S/4HANA sales orders. Its figures are the ones the Agentix order-sync
	 * engagement later works with (engine/scenarios.ts ORDER_FIGURES and pkg_order_sync_v2).
	 */
	ordersync: {
		key: "ordersync",
		shortLabel: "Order sync",
		match: ["order sync", "order-to-cash", "quote-to-cash", "quote to cash", "sales order", "salesforce cpq", "s/4hana", "s4hana", "business partner", "customer master", "order failures", "unbilled bookings", "booked orders", "sap sales order", "cpq"],
		title: "Salesforce–SAP order sync: customer master and posting integrity",
		kicker: "Revenue operations · Order to cash",
		brief:
			"Stop our Salesforce orders failing on the way into SAP, and settle which system owns the customer master. Read the order records, the SAP sales order log, the integration failure queue and the customer master extract, interview the revenue and systems owners, and design the daily operation an agent team will run.",
		objective: "Agree an operating design that posts every booked Salesforce order into SAP the same day, from one authoritative customer master, without ever creating a duplicate sales order.",
		doneWhen: "The customer master authority, material mapping rule, posting-integrity rule, escalation thresholds and release authority are agreed, and every open question is recorded for Agentix.",
		decision: "What must be true before an agent team posts orders into SAP, and which decisions stay with revenue operations?",
		get deadline() { return `Finance leadership · ${daysAhead(7)}` },
		interviewer: "Revenue systems lead",
		ownerInterview: [
			{ topic: "Decision pressure", question: "Before I read the queue, what costs you most today: the bookings sitting unbilled at quarter end, the days each failed order takes to fix, or sales not trusting what the order status says?", evidenceHint: "I’ll compare that with twelve months of order records and the failure queue." },
			{ topic: "Failure mix", question: "Which sync failures does your team fix without asking anyone, and which always need a decision?", evidenceHint: "I’ll test that against the 1,340 failures and how each one was actually resolved." },
			{ topic: "Master authority", question: "When Salesforce and SAP disagree about a customer’s address or tax jurisdiction, which one wins?", evidenceHint: "I’ll check the rule against the customer master extract and how tax was actually determined." },
			{ topic: "Posting integrity", question: "When a post to SAP times out and you don’t know whether it landed, what must never happen?", evidenceHint: "I’ll turn what you say into a check the pipeline has to pass before anything reaches production." },
			{ topic: "Release authority", question: "Who may approve a change that reaches production SAP or the integration platform?", evidenceHint: "What you settle becomes the release policy the agent team follows; anything still open goes to Agentix as a question." },
			{ topic: "Success measure", question: "Ninety days after go-live, what would convince you order sync is under control?", evidenceHint: "I’ll turn it into the outcome criteria Agentix is measured against." },
		],
		people: [
			person("nadia", "Nadia Fournier", "VP Revenue Operations", "Revenue Operations", "nadia.fournier@arclinetech.com", "High", "Order flow, quarter-end close, who owns the outcome", "Text"),
			person("ryan", "Ryan Castellanos", "Salesforce Platform Lead", "Enterprise Systems", "ryan.castellanos@arclinetech.com", "High", "CPQ, account master, integration user", "Voice"),
			person("meilin", "Mei Lin Tan", "SAP Order-to-Cash Lead", "Finance Systems", "meilin.tan@arclinetech.com", "High", "S/4HANA sales orders, business partner, pricing conditions", "Workshop"),
			person("gordon", "Gordon Achebe", "Director of Internal Controls", "Finance", "gordon.achebe@arclinetech.com", "Medium", "SOX segregation of duties, release authority, audit evidence", "Text"),
		],
		sources: [
			{ name: "Salesforce order records", system: "Salesforce CPQ", scope: "12 months · read only", records: "18,942 orders" },
			{ name: "SAP sales order log", system: "SAP S/4HANA", scope: "12 months · read only", records: "17,602 orders" },
			{ name: "Integration failure queue", system: "Integration platform", scope: "12 months", records: "1,340 failures" },
			{ name: "Customer master extract", system: "Salesforce + SAP", scope: "Active accounts, both systems", records: "2,418 accounts" },
		],
		inquiries: ["Failure causes", "Customer master authority", "Material mapping", "Posting integrity", "Release authority", "Quarter-end impact"],
		exception: {
			title: "Salesforce and SAP disagree about who the customer is",
			trigger: "Mei Lin Tan found that 187 active accounts carry a different address and tax jurisdiction in Salesforce than in the SAP business partner record. Tax was determined from whichever system posted first, across $612,480.90 of orders.",
			evidenceGap: "MAX reconciled the customer master extract against twelve months of posted orders. Each system is internally consistent; which one is the master is a finance and revenue policy decision, not a calculation MAX can make.",
			consequence: "Making the SAP business partner authoritative means Salesforce syncs down from it. 187 accounts are corrected at the first run, and Agentix tests every tax determination against the business partner.",
			alternative: "Keeping Salesforce as the master records the $612,480.90 as a known tax-determination exposure. Agentix still posts against the business partner to match SAP.",
			approveLabel: "Make the SAP business partner authoritative",
			alternativeLabel: "Keep Salesforce as the master",
			approvedConfirmation: "Recorded. The SAP business partner is now the customer master: Salesforce syncs down from it, 187 accounts are corrected at the first run, and Agentix will test every tax determination against it. I resumed the affected branch.",
			alternativeConfirmation: "Understood. Salesforce stays the master and the $612,480.90 is recorded as a known tax-determination exposure. Agentix still posts against the business partner to match SAP. I resumed the affected branch.",
		},
		summary:
			"Salesforce orders can post into SAP under an agent team, provided the SAP business partner is the one customer master, every line maps to a real SAP material, and no timed-out post is ever retried into a duplicate sales order. Orders post the same day they are booked, anything above $50,000 or outside the agreed terms reaches revenue operations, and finance sees a verified order exception cockpit by 08:00 London.",
		handoff: { target: "agentix", packageId: "pkg_order_sync_v2", opensAs: "A new Agentix engagement created from this package: four agents with separate permissions, three milestones and a daily operation" },
	},
}

// The setup screen asks for an outcome, not a scenario. Route the written brief
// to the investigation it describes so the interview, sources, stakeholders, and
// deliverables match what the person actually asked for. Longer terms win over
// shorter ones so "financial controls" beats an incidental "vendor". A score of
// 0 means nothing in the brief matched and the fallback was used.
export function scenarioForBrief(brief: string, fallback: ScenarioKey = "tprm"): { key: ScenarioKey; score: number } {
	const text = brief.toLowerCase()
	let best: ScenarioKey = fallback
	let bestScore = 0
	for (const scenario of Object.values(SCENARIOS)) {
		let score = 0
		for (const term of scenario.match) {
			if (text.includes(term)) score += term.length
		}
		if (score > bestScore) {
			bestScore = score
			best = scenario.key
		}
	}
	return { key: best, score: bestScore }
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

/*
 * The journey spine. These six stages, their order and their next-action
 * sentences mirror the Discovery module in max-ai-platform; see
 * docs/discovery-flow-reference.md. Every screen reads the same spine, so the
 * hub, the cockpit and the package never disagree about where the work is.
 */
export type JourneyStageId = "frame" | "interview" | "evidence" | "synthesis" | "deliverables" | "handoff"
// "blocked" waits on the owner; "paused" is the owner's own stop and asks nothing of them.
export type JourneyStageStatus = "pending" | "current" | "complete" | "blocked" | "paused"
export type JourneyHold = "blocked" | "paused" | null

/*
 * What the run is doing besides its phase. The owner interview frames the
 * mission, so while it is open the Frame stage is the current one whatever the
 * phase says, and nothing downstream has started.
 */
export type JourneyContext = {
	interviewOpen?: boolean
	// Applies to the current stage only.
	hold?: JourneyHold
	decisionPending?: boolean
	handoffId?: string | null
	// The module the package goes to; Plan unless the scenario hands to Agentix.
	destination?: HandoffDestination
}

// `purpose` is what the stage is for; `nextAction` is the one live sentence the
// cockpit hero shows while the stage is current.
export const JOURNEY_STAGES: Array<{ id: JourneyStageId; label: string; purpose: string; nextAction: string; operations: readonly number[] }> = [
	{ id: "frame", label: "Frame", purpose: "Turns the brief and your interview into an objective, a done condition and an authority boundary.", nextAction: "MAX is establishing the mission, its authority and its decision horizon.", operations: [0] },
	{ id: "interview", label: "Interview", purpose: "Maps the accountable people and runs text, voice and workshop interviews around the evidence gaps.", nextAction: "MAX is conducting and reconciling stakeholder interviews.", operations: [2, 3] },
	{ id: "evidence", label: "Evidence", purpose: "Binds the governed sources and keeps record-level provenance for every claim.", nextAction: "MAX is binding and reading the governed sources.", operations: [1] },
	{ id: "synthesis", label: "Synthesis", purpose: "Turns contradictions into owned cases and freezes one readiness snapshot.", nextAction: "MAX is resolving conflicts and freezing the readiness snapshot.", operations: [4, 5] },
	{ id: "deliverables", label: "Deliverables", purpose: "Generates every selected document from one versioned manifest.", nextAction: "MAX is generating the selected deliverables.", operations: [6] },
	{ id: "handoff", label: "Handoff", purpose: "Routes the package to its approvers and prepares the handoff packet for the next module.", nextAction: "MAX is routing the package to its approvers.", operations: [7] },
]

export function journeyComplete(phase: number) {
	return phase >= OPERATIONS.length - 1
}

export function currentJourneyStage(phase: number, context: JourneyContext = {}): JourneyStageId {
	if (journeyComplete(phase)) return "handoff"
	if (context.interviewOpen) return "frame"
	const stage = JOURNEY_STAGES.find(item => item.operations.includes(phase))
	return stage?.id ?? "handoff"
}

/* The prototype binds sources before it interviews, so Evidence completes before
 * Interview does. Progress is therefore read per stage from its own operations
 * rather than from the stage's position in the list. A finished run is finished
 * everywhere: no stage keeps working once the last operation has run. */
export function journeyStageStatus(stageId: JourneyStageId, phase: number, context: JourneyContext = {}): JourneyStageStatus {
	const stage = JOURNEY_STAGES.find(item => item.id === stageId)
	if (!stage) return "pending"
	if (journeyComplete(phase)) return "complete"
	if (stageId === currentJourneyStage(phase, context)) return context.hold ?? "current"
	if (context.interviewOpen) return "pending"
	return phase > Math.max(...stage.operations) ? "complete" : "pending"
}

/* Where the run sits on the spine, in the spine's own terms. */
export function journeyProgress(phase: number, context: JourneyContext = {}) {
	const total = JOURNEY_STAGES.length
	if (journeyComplete(phase)) return { stage: JOURNEY_STAGES[total - 1], index: total, total, label: `All ${total} stages done` }
	const id = currentJourneyStage(phase, context)
	const index = JOURNEY_STAGES.findIndex(item => item.id === id)
	const stage = JOURNEY_STAGES[index]
	return { stage, index: index + 1, total, label: `${stage.label} · ${index + 1} of ${total}` }
}

export function journeyNextAction(phase: number, context: JourneyContext = {}): string {
	const destination = context.destination ?? "Plan"
	if (journeyComplete(phase)) return context.handoffId ? `Sent to ${destination} as ${context.handoffId}.` : `Package verified. Review it in Package, then continue to ${destination}.`
	if (context.interviewOpen) return "Answer MAX’s interview questions so it can frame the mission."
	if (context.decisionPending) return "One decision needs you. Unaffected work keeps moving."
	if (context.hold === "paused") return "Paused at the last verified checkpoint. Nothing new starts until you resume."
	return JOURNEY_STAGES.find(item => item.id === currentJourneyStage(phase, context))?.nextAction ?? ""
}

/*
 * Preparation runs a named step machine before the workspace opens. The step
 * names and the terminal "ready" state are the real module's.
 */
export type PreparationStepId =
	| "establishing_mission"
	| "checking_authority"
	| "binding_sources"
	| "building_inquiry"
	| "starting_interview"
	| "mapping_people"
	| "ready"
export type PreparationStepStatus = "pending" | "working" | "completed" | "needs_input" | "degraded" | "failed"

export const PREPARATION_STEPS: Array<{ id: PreparationStepId; label: string }> = [
	{ id: "establishing_mission", label: "Establishing mission" },
	{ id: "checking_authority", label: "Checking authority" },
	{ id: "binding_sources", label: "Binding sources" },
	{ id: "building_inquiry", label: "Building inquiry" },
	{ id: "starting_interview", label: "Starting interview" },
	{ id: "mapping_people", label: "Mapping people" },
	{ id: "ready", label: "Ready" },
]

/* Deliverable categories, in the real module's grouping order. Indexes match
 * DELIVERABLES; the check below fails loudly if the manifest changes length. */
export type DeliverableCategory = "Foundation" | "Decision package" | "Analysis" | "Risk and controls" | "Governance" | "Mobilization"

export const DELIVERABLE_CATEGORY: DeliverableCategory[] = [
	"Decision package",
	"Decision package",
	"Governance",
	"Foundation",
	"Foundation",
	"Analysis",
	"Governance",
	"Risk and controls",
	"Mobilization",
]

export const DELIVERABLE_CATEGORY_ORDER: DeliverableCategory[] = ["Foundation", "Decision package", "Analysis", "Risk and controls", "Governance", "Mobilization"]

/* The project charter needs an explicit owner approval before handoff. */
export const CHARTER_DELIVERABLE_INDEX = 2

if (DELIVERABLE_CATEGORY.length !== DELIVERABLES.length) {
	throw new Error(`Discovery package: ${DELIVERABLE_CATEGORY.length} categories for ${DELIVERABLES.length} deliverables`)
}

// The rotating "now" line under Now handling: three concrete micro-actions per
// operation, built from the scenario's own sources, people, and inquiries. Each
// stays near 40 characters so it reads at a glance inside the card.
export function nowActions(scenario: Scenario, phase: number, people: Person[], deadline = scenario.deadline): string[] {
	const roster = people.length ? people : scenario.people
	const [first, second, third] = scenario.sources
	const records = scenario.sources.reduce((total, source) => total + Number(source.records.replace(/[^0-9]/g, "")), 0)
	const [lead, partner, counsel] = [roster[0]?.name ?? "the control owner", roster[1]?.name ?? "the second owner", roster[2]?.name ?? "the third owner"]
	const topic = (index: number) => scenario.inquiries[index].toLowerCase()
	// The mission's own deadline, when the owner set one; a mission without one has no date to lock.
	const decisionDate = deadline.split(" · ").at(-1) ?? deadline
	const byPhase: string[][] = [
		["Setting the objective and done condition", "Drawing the interruption boundary", decisionDate ? `Locking the decision date · ${decisionDate}` : "Confirming the decision horizon"],
		[`Reading ${first.name}`, `Indexing ${second.name}`, `Tracing provenance in ${third.system}`],
		[`Matching ${topic(0)} to an owner`, `Preparing outreach for ${lead}`, `Checking recipient policy · ${roster.length} people`],
		[`Asking ${lead} about ${topic(0)}`, `Queuing a follow-up for ${partner}`, `Skipping what ${second.system} already answers`],
		[`Checking ${topic(0)} claims`, `Reconciling ${partner} and ${counsel}`, "Isolating one exception for your call"],
		["Binding each claim to snapshot v7", `Naming owners for ${topic(4)}`, `Freezing ${records.toLocaleString()} records as evidence`],
		[`Generating ${DELIVERABLES.length} linked deliverables`, `Citing ${first.system} and ${second.system}`, "Checking each recommendation’s source"],
		["Routing each document to its approver", scenario.handoff?.target === "agentix" ? "Preparing the Agentix operating package" : "Creating the downstream Plan work", "Recording the handoff in the audit trail"],
	]
	return byPhase[Math.max(0, Math.min(phase, byPhase.length - 1))]
}
