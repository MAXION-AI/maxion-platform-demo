export type WorkflowId = "service" | "invoice" | "onboarding" | "inventory"
export interface TeamMember { id: string; name: string; responsibility: string; tools: string; input: string; output: string }
export interface WorkStep { title: string; detail: string; actors: string[]; evidence: string; system: string }
export interface WorkflowExample {
	id: WorkflowId; title: string; category: string; description: string; outcome: string; caseName: string; caseId: string
	owner: string; trigger: string; boundary: string; teamReason: string; team: TeamMember[]
	changes: { before: string; finding: string; after: string }[]
	sources: { title: string; detail: string }[]; success: string[]; steps: WorkStep[]
	gate?: { index: number; kind: "approval" | "human" | "reconcile"; title: string; detail: string; action: string; receipt: string }
	accessGap?: string; result: string; records: { name: string; value: string }[]
}

export const WORKFLOWS: WorkflowExample[] = [
	{
		id: "service", title: "Incident triage", category: "ServiceNow", description: "Get every incident to the right team, with the context to act.",
		outcome: "A correctly assigned incident, verified in ServiceNow, with the on-call team informed.", caseName: "Payroll portal access failure", caseId: "INC-10482", owner: "Service desk manager",
		trigger: "New ServiceNow incident in the payroll support queue", boundary: "May classify, assign and notify. Cannot close incidents, change access or execute a remediation.",
		teamReason: "One bounded decision, one authoritative record, one tool scope. Another agent would add handoffs without improving the outcome.",
		team: [{ id: "coordinator", name: "Incident coordinator", responsibility: "Classify the incident, resolve the assignment group and verify the handoff.", tools: "ServiceNow incident read/update · Teams channel notification", input: "Incident, routing policy v3, approved knowledge articles", output: "Assignment, triage note and notification receipt" }],
		changes: [
			{ before: "An analyst reads every ticket and searches for the owner.", finding: "Routing ownership is documented but applied manually.", after: "Use the approved service-to-group mapping automatically." },
			{ before: "The receiving team repeats the same investigation.", finding: "Relevant knowledge articles rarely travel with the ticket.", after: "Attach a source-linked triage summary and known-issue evidence." },
			{ before: "A sent message is treated as a completed handoff.", finding: "Assignment and notification are not verified together.", after: "Read back the incident assignment and retain the channel receipt." },
		],
		sources: [{ title: "Incident sample · 40 records", detail: "Illustrative ticket history and assignment changes" }, { title: "Service ownership matrix · v3", detail: "Payroll service → Workplace support" }, { title: "Owner interview · service desk", detail: "Confirmed: triage must not imply incident resolution" }],
		success: ["Assignment matches the approved routing policy", "Triage note references the applicable knowledge article", "On-call notification recorded; incident remains open"],
		steps: [
			{ title: "Read the incident and permitted context", detail: "Loaded INC-10482, the payroll service record and routing policy v3.", actors: ["coordinator"], evidence: "Source: ServiceNow / INC-10482 · Policy: ROUTING-v3", system: "ServiceNow" },
			{ title: "Choose the responsible team", detail: "Matched payroll portal access to Workplace support. No privileged access change is required for triage.", actors: ["coordinator"], evidence: "Decision: assignment_group=workplace-support · KB-204 linked", system: "Policy" },
			{ title: "Update the incident", detail: "Set the assignment group and added the evidence-linked triage note.", actors: ["coordinator"], evidence: "Simulated effect: INC-10482/update/1 · one write", system: "ServiceNow" },
			{ title: "Verify assignment and notify on-call", detail: "Read-back matches the selected group. Posted the handoff summary to the approved Teams channel.", actors: ["coordinator"], evidence: "Simulated receipts: INC-10482/readback · TEAMS-481 · status=open", system: "ServiceNow + Teams" },
		], result: "Incident assigned. The right team has the context.", records: [{ name: "ServiceNow", value: "INC-10482 · Workplace support · Open" }, { name: "Microsoft Teams", value: "Payroll support channel · handoff recorded" }],
	},
	{
		id: "invoice", title: "Invoice exception resolution", category: "ERP · Accounts payable", description: "Resolve a three-way-match exception without losing financial control.",
		outcome: "An evidence-backed invoice exception decision, recorded in ERP, ready for the existing payment process.", caseName: "Price variance on a supplier invoice", caseId: "INV-20841", owner: "Accounts payable owner",
		trigger: "Invoice enters the ERP three-way-match exception queue", boundary: "May reconcile and prepare an exception decision. A price variance needs AP approval. No payment release or supplier bank-detail changes.",
		teamReason: "Invoice validation and receipt investigation use different evidence and can run independently. The coordinator reconciles their findings and owns the single ERP write.",
		team: [
			{ id: "coordinator", name: "AP coordinator", responsibility: "Join the findings, request the exact decision and verify the ERP result.", tools: "ERP exception update · Outlook notification", input: "Invoice finding + receipt finding", output: "Approved exception resolution and audit packet" },
			{ id: "invoice", name: "Invoice analyst", responsibility: "Check arithmetic, supplier identity and purchase-order terms.", tools: "Invoice and purchase order · read only", input: "Invoice INV-20841 and PO-7204", output: "Quantity matches; price variance is $240" },
			{ id: "receipt", name: "Receipt analyst", responsibility: "Check delivered quantities against receiving evidence.", tools: "Goods receipts · read only", input: "PO-7204 lines and receiving history", output: "120 units received; no duplicate receipt" },
		],
		changes: [
			{ before: "AP emails procurement and the warehouse separately.", finding: "The same case waits for two independent evidence checks.", after: "Investigate invoice and receiving evidence in parallel." },
			{ before: "Reviewers approve an email summary without its document version.", finding: "A revised invoice can inherit an obsolete decision.", after: "Bind the approval to this invoice version and exact $240 variance." },
			{ before: "Resolution is re-entered manually in ERP.", finding: "The decision and source record can drift.", after: "One coordinator updates ERP and verifies the resulting exception status." },
		],
		sources: [{ title: "AP exception sample · 24 cases", detail: "Illustrative invoice, PO and receiving records" }, { title: "AP control policy · v5", detail: "Price variance approval retained; payment release excluded" }, { title: "AP and warehouse interviews", detail: "Validated independent evidence checks and decision ownership" }],
		success: ["Invoice, PO and receipt quantities reconcile", "AP decision is bound to invoice v2 and the $240 variance", "ERP exception is resolved; payment remains outside this initiative"],
		steps: [
			{ title: "Open the exception case", detail: "Bound invoice v2, purchase order PO-7204 and the applicable AP controls.", actors: ["coordinator"], evidence: "Case INV-20841 · invoice v2 · AP-POLICY-v5", system: "ERP" },
			{ title: "Investigate two evidence paths in parallel", detail: "Invoice analyst checks price and tax arithmetic while receipt analyst verifies the delivered quantities. Neither specialist may post changes.", actors: ["invoice", "receipt"], evidence: "Invoice: $240 variance · Receipt: 120/120 units · independent read-only scopes", system: "ERP + Receiving" },
			{ title: "Obtain the exact financial decision", detail: "A $240 price variance remains outside automatic authority. Only this case waits for the AP owner.", actors: ["coordinator"], evidence: "Approval request: INV-20841/v2/variance-240 · no payment authority", system: "Human decision" },
			{ title: "Record and verify the resolution", detail: "Recorded the approved price variance and read back the exception status. The existing payment process keeps control of payment release.", actors: ["coordinator"], evidence: "Simulated ERP receipt: EXC-20841/resolved · payment_released=false", system: "ERP" },
			{ title: "Publish the decision packet", detail: "Sent the AP owner the reconciliation, approval reference and ERP read-back.", actors: ["coordinator"], evidence: "Simulated Outlook receipt: MAIL-20841 · authorized AP audience only", system: "Outlook" },
		],
		gate: { index: 2, kind: "approval", title: "Approve the $240 price variance?", detail: "Invoice INV-20841 v2: 120 units received. The variance is price-only. Approval resolves this exception; it does not release payment or alter supplier details.", action: "Approve this variance", receipt: "AP owner approved INV-20841 v2 · $240 price variance only" },
		result: "Exception resolved. Payment controls preserved.", records: [{ name: "ERP exception", value: "INV-20841 · Resolved with approved variance" }, { name: "Financial decision", value: "$240 · invoice v2 · AP owner approval" }, { name: "Outlook", value: "Reconciliation packet delivered to AP owner" }],
	},
	{
		id: "onboarding", title: "Employee onboarding", category: "HR · IT service management", description: "Coordinate day-one readiness across HR, equipment and access.",
		outcome: "A complete readiness packet with equipment reserved, permitted access verified and payroll access confirmed by its human owner.", caseName: "New analyst joining the London office", caseId: "JOIN-306", owner: "People operations owner",
		trigger: "Approved new-hire record reaches the onboarding window", boundary: "Use the approved role package only. No privileged access, payroll data edits or disclosure of compensation to IT.",
		teamReason: "HR and IT need different sensitive context and work in parallel. The coordinator receives readiness results, not unrestricted copies of personnel records.",
		team: [
			{ id: "coordinator", name: "Onboarding coordinator", responsibility: "Track dependencies, obtain the missing human confirmation and verify readiness.", tools: "Onboarding case · Teams updates", input: "Start date and scoped HR/IT readiness results", output: "Day-one readiness packet with evidence" },
			{ id: "hr", name: "HR specialist", responsibility: "Validate the approved hire and required onboarding documents.", tools: "HRIS onboarding fields · read only", input: "Approved hire record and required-document checklist", output: "HR ready; no compensation data shared with IT" },
			{ id: "it", name: "IT specialist", responsibility: "Reserve equipment and request the approved standard access package.", tools: "ServiceNow requests · approved access package", input: "Role, location, start date and employee identifier", output: "Device reservation and standard-access receipts" },
		],
		changes: [
			{ before: "HR and IT work from separate onboarding lists.", finding: "A hire can be marked complete while an IT dependency is open.", after: "Use one case with separate HR and IT completion checks." },
			{ before: "The entire employee file travels with an IT request.", finding: "IT needs role and start date, not compensation details.", after: "Give each specialist only the fields required for its task." },
			{ before: "Missing payroll access is hidden in an email thread.", finding: "The connected account cannot provision payroll access.", after: "Track an explicit payroll-owner task; do not claim automatic fulfillment." },
		],
		sources: [{ title: "Joiner process · v4", detail: "Approved dependencies and day-one readiness definition" }, { title: "HRIS + service request sample", detail: "Illustrative hire and equipment records" }, { title: "IT access assessment", detail: "Standard package available; payroll provisioning is not permitted" }],
		success: ["Approved hire and required documents checked", "Device reservation and standard access verified", "Payroll owner confirmation attached before readiness is declared"],
		accessGap: "The connected account cannot provision payroll access. Agentix must not borrow an administrator’s authority or pretend the step succeeded.",
		steps: [
			{ title: "Open the joiner case", detail: "Read the approved hire record and pinned role package. No personnel data is sent to an unapproved audience.", actors: ["coordinator"], evidence: "JOIN-306 · ROLE-ANALYST-v4 · permitted field set", system: "HRIS" },
			{ title: "Prepare HR and IT in parallel", detail: "HR checks documents while IT reserves a laptop and requests standard access. IT receives no compensation or personal banking details.", actors: ["hr", "it"], evidence: "HR-CHECK-306 · DEVICE-306 · ACCESS-306 · scoped delegation results", system: "HRIS + ServiceNow" },
			{ title: "Wait for payroll-owner fulfillment", detail: "Payroll access remains a human step because the integration lacks that permission. All completed HR and IT work is preserved.", actors: ["coordinator"], evidence: "Human task PAYROLL-306 · requires fulfillment reference", system: "Human task" },
			{ title: "Verify the complete readiness packet", detail: "Checked HR, equipment, standard access and the payroll owner’s fulfillment reference against the checklist.", actors: ["coordinator"], evidence: "Readiness: 4/4 checks · human fulfillment reference retained", system: "Case verification" },
			{ title: "Notify the manager", detail: "Shared the readiness summary with the hiring manager. Restricted HR records remain private.", actors: ["coordinator"], evidence: "Simulated Teams receipt: JOIN-306/manager-summary", system: "Teams" },
		],
		gate: { index: 2, kind: "human", title: "Payroll access needs its human owner", detail: "In production, the payroll owner completes the task in the source system and supplies a verifiable reference. This demo supplies a clearly labeled sample receipt.", action: "Simulate owner fulfillment", receipt: "Sample human receipt: PAYROLL-306 · owner confirmed standard payroll access" },
		result: "Day-one readiness verified across HR and IT.", records: [{ name: "HRIS", value: "JOIN-306 · onboarding documents complete" }, { name: "ServiceNow", value: "Laptop reserved · standard access verified" }, { name: "Human fulfillment", value: "PAYROLL-306 · owner confirmation attached" }],
	},
	{
		id: "inventory", title: "Inventory replenishment", category: "ERP · Supply chain", description: "Turn a stock risk into a controlled replenishment action.",
		outcome: "One verified replenishment requisition within the approved limit, with the stock risk and purchasing owner updated.", caseName: "Warehouse stock below reorder threshold", caseId: "STOCK-902", owner: "Supply chain owner",
		trigger: "Weekday 06:00 warehouse stock review · Europe/London", boundary: "May create one requisition up to the approved $5,000 cap. Cannot release a purchase order, change supplier terms or post stock adjustments.",
		teamReason: "Demand and supplier availability are separate investigations with a shared join point. One coordinator owns quantity selection and the single requisition to prevent duplicate purchasing.",
		team: [
			{ id: "coordinator", name: "Replenishment coordinator", responsibility: "Combine demand and supply findings, enforce the cap and verify one requisition.", tools: "ERP requisition create/read · Teams notification", input: "Demand recommendation and supplier availability", output: "One requisition and verified risk update" },
			{ id: "demand", name: "Demand analyst", responsibility: "Check stock, reservations and recent consumption.", tools: "Inventory and demand history · read only", input: "SKU-481 stock and demand snapshot", output: "Recommend 200 units to restore coverage" },
			{ id: "supply", name: "Supply analyst", responsibility: "Check approved supplier availability and lead time.", tools: "Supplier catalogue and open orders · read only", input: "SKU-481 and approved supplier list", output: "200 units available · $4,200 · approved terms" },
		],
		changes: [
			{ before: "Planners check shortages and open orders in different spreadsheets.", finding: "The demand and supply snapshots are not reconciled together.", after: "Join independent demand and supply checks before creating a requisition." },
			{ before: "A timed-out submission is retried manually.", finding: "An accepted but unacknowledged request can be duplicated.", after: "Reconcile the original request reference before any retry." },
			{ before: "Requisition creation is confused with purchasing completion.", finding: "Purchase-order release remains a separate business control.", after: "Verify the requisition and hand it to the existing purchasing process." },
		],
		sources: [{ title: "Stock review sample · 30 days", detail: "Illustrative inventory, reservations and demand history" }, { title: "Purchasing policy · v6", detail: "$5,000 requisition cap; purchase-order release excluded" }, { title: "ERP reliability assessment", detail: "Submission can time out after the source system accepts it" }],
		success: ["Demand, available stock and open orders reconciled", "Exactly one 200-unit requisition at $4,200", "ERP read-back verified; purchase-order release remains separate"],
		steps: [
			{ title: "Start the scheduled stock review", detail: "Loaded the warehouse snapshot and purchasing policy v6 for SKU-481.", actors: ["coordinator"], evidence: "Scheduled case STOCK-902 · Europe/London · policy v6", system: "ERP" },
			{ title: "Check demand and supply in parallel", detail: "Demand recommends 200 units. Supply confirms availability at $4,200. The coordinator checks open orders and the $5,000 cap.", actors: ["demand", "supply"], evidence: "Demand result + supply result joined · no existing matching requisition", system: "Inventory + Supplier catalogue" },
			{ title: "Reconcile an uncertain ERP submission", detail: "The create request timed out after dispatch. It may have succeeded, so the coordinator pauses new writes and looks up the original request reference.", actors: ["coordinator"], evidence: "Effect STOCK-902/REQ/1 · outcome unknown · sends=1", system: "ERP recovery" },
			{ title: "Verify the original requisition", detail: "Read-back found REQ-72018 with the original request reference. Quantity and value match. No second create request was sent.", actors: ["coordinator"], evidence: "Simulated ERP receipt: REQ-72018 · 200 units · $4,200 · sends=1", system: "ERP" },
			{ title: "Update the purchasing owner", detail: "Published the stock-risk summary and requisition reference. Purchase-order release remains with purchasing.", actors: ["coordinator"], evidence: "Simulated Teams receipt: STOCK-902/update · PO_released=false", system: "Teams" },
		],
		gate: { index: 2, kind: "reconcile", title: "ERP response lost. No duplicate request sent.", detail: "The request has an unknown outcome, not a confirmed failure. Continue the demo to look up the original request. This recovery needs no new business approval.", action: "Simulate ERP read-back", receipt: "Reconciliation found REQ-72018 · original request matched · one create only" },
		result: "Replenishment verified. No duplicate requisition.", records: [{ name: "ERP requisition", value: "REQ-72018 · 200 units · $4,200" }, { name: "Recovery", value: "Original request reconciled · 1 create · 0 duplicates" }, { name: "Microsoft Teams", value: "Purchasing owner informed; PO release not performed" }],
	},
]

export type CaseStatus = "draft" | "ready" | "running" | "waiting" | "paused" | "complete" | "declined"
export interface InitiativeState { imported: boolean; humanFallback: boolean; status: CaseStatus; stage: number; gateResolved: boolean; notes: string[]; messages: { role: "user" | "agent"; text: string }[] }
export type InitiativeStore = Record<WorkflowId, InitiativeState>
export const STORAGE_KEY = "maxion-agentix-initiatives-v1"
export const emptyInitiative = (): InitiativeState => ({ imported: false, humanFallback: false, status: "draft", stage: 0, gateResolved: false, notes: [], messages: [] })
export const initialInitiatives = (): InitiativeStore => Object.fromEntries(WORKFLOWS.map(w => [w.id, emptyInitiative()])) as InitiativeStore
export function readInitiatives(): InitiativeStore {
	try {
		const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
		if (!data || typeof data !== "object") return initialInitiatives()
		const fresh = initialInitiatives()
		for (const w of WORKFLOWS) {
			const s = (data as Record<string, InitiativeState>)[w.id]
			if (s && typeof s.imported === "boolean" && typeof s.humanFallback === "boolean" && typeof s.gateResolved === "boolean" && ["draft", "ready", "running", "waiting", "paused", "complete", "declined"].includes(s.status) && Number.isInteger(s.stage) && s.stage >= 0 && s.stage < w.steps.length && Array.isArray(s.notes) && s.notes.every(n => typeof n === "string") && Array.isArray(s.messages) && s.messages.every(m => m && ["user", "agent"].includes(m.role) && typeof m.text === "string")) fresh[w.id] = { ...s, notes: s.notes.slice(-30), messages: s.messages.slice(-20) }
		}
		return fresh
	} catch { return initialInitiatives() }
}
export type CaseAction = "import" | "human-fallback" | "activate" | "start" | "tick" | "pause" | "resume" | "resolve" | "decline" | "replay"
export function transitionCase(s: InitiativeState, w: WorkflowExample, action: CaseAction): InitiativeState {
	if (action === "import") return s.imported ? s : { ...s, imported: true, notes: ["Discovery package v1 imported · approved example · source snapshot preserved"] }
	if (action === "human-fallback" && s.status === "draft") return { ...s, humanFallback: true, notes: [...s.notes, "Payroll access mapped to an explicit human task; no permission granted"] }
	if (action === "activate" && s.imported && s.status === "draft" && (!w.accessGap || s.humanFallback)) return { ...s, status: "ready", notes: [...s.notes, "Owner activated operating model v1 · demo authority only"] }
	if (action === "start" && s.status === "ready") return { ...s, status: "running", notes: [...s.notes, `Sample case ${w.caseId} started`] }
	if (action === "tick" && s.status === "running") {
		if (w.gate?.index === s.stage && !s.gateResolved) return { ...s, status: "waiting" }
		if (s.stage === w.steps.length - 1) return { ...s, status: "complete", notes: [...s.notes, "All sample postconditions verified · no external systems were changed"] }
		return { ...s, stage: s.stage + 1 }
	}
	if (action === "pause" && s.status === "running") return { ...s, status: "paused", notes: [...s.notes, "Paused at the current sample step; progress preserved"] }
	if (action === "resume" && s.status === "paused") return { ...s, status: "running" }
	if (action === "resolve" && s.status === "waiting" && w.gate) return { ...s, status: "running", gateResolved: true, notes: [...s.notes, w.gate.receipt] }
	if (action === "decline" && s.status === "waiting" && w.gate?.kind === "approval") return { ...s, status: "declined", notes: [...s.notes, "AP owner declined the variance · exception remains open · no resolution write or payment"] }
	if (action === "replay" && ["complete", "declined"].includes(s.status)) return { ...s, status: "ready", stage: 0, gateResolved: false, notes: [...s.notes.slice(-20), "Sample reset for replay; this is not a new production case"] }
	return s
}
