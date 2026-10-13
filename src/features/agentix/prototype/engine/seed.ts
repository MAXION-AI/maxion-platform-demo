import type { WorkflowId } from "../initiatives"
import { EPOCH, MINUTE, londonParts, log, newItem, nextSixAm, openDecision, previousWeekdayMorning, templateOf, type ItemOptions } from "./engine"
import { DEMO_SUBJECTS, SCENARIOS, SCENARIO_ORDER } from "./scenarios"
import type { AgentixState, Engagement, WorkItem } from "./types"

/*
 * The demo's first state: four engagements already at work. Revenue
 * reconciliation (the flagship) is live on its first package, invoice
 * exceptions, while Discovery has its data-engineering package ready to send.
 * Every record, name and figure is synthetic.
 */

const FIRST_PACKAGE: Record<WorkflowId, { id: string; title: string }> = {
	invoice: { id: "pkg_invoice_v1", title: "Invoice exception resolution" },
	payables: { id: "pkg_ap_exceptions_v2", title: "AP exception triage and approval authority" },
	orders: { id: "pkg_order_sync_v2", title: "Order sync and posting integrity" },
	conversion: { id: "pkg_s4_conversion_v2", title: "Custom code disposition and conversion readiness" },
	service: { id: "pkg_service_v1", title: "Incident triage" },
	onboarding: { id: "pkg_onboarding_v1", title: "Employee onboarding" },
	inventory: { id: "pkg_inventory_v1", title: "Inventory replenishment" },
}

const iso = (at: number) => new Date(at).toISOString().replace(".000Z", "Z")
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/* "8 Sep": the London calendar day of an occurrence, as the review titles name it. */
const dayMonth = (at: number) => { const parts = londonParts(at); return `${parts.day} ${MONTHS[parts.month - 1]}` }

export function seedEngagement(id: WorkflowId, base = EPOCH): Engagement {
	const scenario = SCENARIOS[id]
	const pkg = FIRST_PACKAGE[id]
	return {
		id, workflowId: id, name: scenario.name, owner: scenario.owner, scope: scenario.outcome,
		trigger: id === "inventory" ? "Schedule" : "Event", status: "active", version: 1,
		origin: { kind: "discovery", packageId: pkg.id, version: 1, title: pkg.title }, brief: "", packages: [pkg.id], answers: {},
		mapping: id === "onboarding" ? "london-standard" : "approved-v1", checked: true, checking: false, automaticPayroll: false, supportRequested: false,
		connection: "ready", permission: "ready", holdNotifications: false, cycles: id === "inventory" ? "weekdays" : "off",
		nextOccurrence: iso(nextSixAm(base, true)),
		notes: [`Discovery package ${pkg.title} v1 linked. Its approved boundaries are the maximum authority.`],
	}
}

/* Marks the first `done` steps complete at plausible past times and records them in the activity log. */
function progress(draft: AgentixState, item: WorkItem, done: number, spacing = 2) {
	const template = templateOf(draft, item)!
	const clock = draft.clock
	for (let index = 0; index < Math.min(done, item.steps.length); index++) {
		const step = template.steps[index]
		// An exception without a variance never had a decision to take.
		if (step.kind === "decision" && step.decision === "variance" && !item.flags.needsApproval) { item.steps[index] = { id: step.id, status: "skipped", ticks: 0 }; continue }
		const at = item.started + (index + 1) * spacing * MINUTE
		item.steps[index] = { id: step.id, status: "done", ticks: step.ticks ?? 1, startedAt: at - MINUTE, doneAt: at }
		if (step.obligation && step.kind !== "notify") { const obligation = item.obligations.find(entry => entry.id === step.obligation); if (obligation) { obligation.status = "met"; obligation.evidence = `${step.system ?? "Agentix"} · ${item.reference}` } }
		if (step.kind === "notify") { const obligation = item.obligations.find(entry => entry.id === "notified"); if (obligation) { obligation.status = "met"; obligation.evidence = `${step.system} acceptance receipt` } }
		if (step.kind === "write") item.effects.push({ id: `${item.id}:${step.id}`, system: step.system ?? "System", operation: step.title, sends: 1, status: "applied" })
		draft.clock = at
		log(draft, { engagementId: item.engagementId, workItemId: item.id, actor: step.owner, kind: "step", text: `${item.reference}: ${step.done}.`, tone: "positive", operations: step.tools })
		item.costCents += 3
	}
	draft.clock = clock
}

function seed(draft: AgentixState, engagementId: WorkflowId, template: string, options: ItemOptions, done: number, shape: (item: WorkItem) => void = () => undefined) {
	const item = newItem(draft, engagementId, template, options)!
	progress(draft, item, done)
	shape(item)
	return item
}

function history(draft: AgentixState, base: number, engagementId: WorkflowId, template: string, reference: string, title: string, started: number, minutes: number, extra: Partial<WorkItem> = {}) {
	const item = newItem(draft, engagementId, template, { reference, title, started, trigger: engagementId === "inventory" ? "Schedule" : "Event", occurrence: engagementId === "inventory" ? iso(started) : reference, flags: extra.flags })!
	Object.assign(item, extra)
	progress(draft, item, item.steps.length, Math.max(1, Math.floor(minutes / item.steps.length)))
	for (const step of item.steps) if (step.status !== "done") step.status = "skipped"
	for (const obligation of item.obligations) { obligation.status = "met"; obligation.evidence ??= `${reference} read-back` }
	item.status = "verified"; item.finished = started + minutes * MINUTE
	draft.clock = item.finished
	log(draft, { engagementId, workItemId: item.id, actor: "coordinator", kind: engagementId === "inventory" ? "cycle" : "step", text: `${reference} verified: ${title}. Every required outcome has evidence.`, tone: "positive" })
	draft.clock = base
	return item
}

/*
 * The seeded world is laid out relative to `base`: the everyday prototype uses
 * the fixed demo date (Friday 11 September, 10:00 London), and the customer demo
 * passes the moment it started, so every time it shows is today's. Warehouse
 * reviews fall on previous weekdays at 06:00 London; other history keeps its
 * spacing from the base.
 */
export function initialState(base = EPOCH): AgentixState {
	const draft: AgentixState = {
		version: 4, clock: base, seq: 0, engagements: {}, work: [], artifacts: [], releases: [], decisions: [], events: [], messages: [], drafts: {},
		nav: { engagementId: null, view: "work", activityFilter: "all", workFilter: "all", creating: false },
		ui: { conversationPinned: false }, demo: { ackLoss: false, scenario: "" },
	}
	for (const id of SCENARIO_ORDER) draft.engagements[id] = seedEngagement(id, base)
	const shifted = (at: string) => Date.parse(at) + (base - EPOCH)
	const review = (back: number) => previousWeekdayMorning(base, back)

	// History first, so the activity log reads in time order.
	history(draft, base, "inventory", "cycle", "STOCK-899", `London warehouse · ${dayMonth(review(3))} review`, review(3), 16, { costCents: 26 })
	history(draft, base, "service", "incident", "INC-10476", "Shared drive permission request", shifted("2026-09-08T10:14:00Z"), 9, { costCents: 21 })
	history(draft, base, "invoice", "exception", "INV-20834", "Litware · receiving reconciliation", shifted("2026-09-08T08:31:00Z"), 10, { costCents: 23 })
	history(draft, base, "inventory", "cycle", "STOCK-900", `London warehouse · ${dayMonth(review(2))} review`, review(2), 14, { costCents: 22 })
	history(draft, base, "invoice", "exception", "INV-20838", "Fourth Coffee · $240 price variance", shifted("2026-09-09T11:05:00Z"), 12, { costCents: 27, flags: { needsApproval: true, approved: true } })
	history(draft, base, "service", "incident", "INC-10479", "Outlook calendar sync failure", shifted("2026-09-09T13:42:00Z"), 7, { costCents: 19 })
	history(draft, base, "onboarding", "joiner", "JOIN-305", "Manchester engineer · day-one readiness", shifted("2026-09-10T08:00:00Z"), 26, { costCents: 31, humanReference: "PAYROLL-305" })
	const missedAt = review(1)
	const missed = newItem(draft, "inventory", "cycle", { reference: "STOCK-901", title: `London warehouse · ${dayMonth(missedAt)} review`, trigger: "Schedule", occurrence: iso(missedAt), started: missedAt, flags: { missed: true } })!
	missed.status = "not_completed"; missed.finished = missedAt + 30 * MINUTE; missed.notes = ["Missed cycle: the ERP outage outlasted the allowed start window. No catch-up write was attempted."]
	for (const step of missed.steps) step.status = "skipped"
	for (const obligation of missed.obligations) obligation.status = "not_met"
	draft.clock = missed.finished
	log(draft, { engagementId: "inventory", workItemId: missed.id, actor: "coordinator", kind: "cycle", text: "STOCK-901 not completed: the ERP outage outlasted the allowed start window. No catch-up write was attempted.", tone: "danger" })
	draft.clock = base

	// Live work at the base time (10:00 London on Friday 11 September in the everyday prototype).
	const at = (minutes: number) => base - minutes * MINUTE
	const northwind = seed(draft, "invoice", "exception", { reference: "INV-20841", title: "Northwind · $240 price variance", started: at(14), flags: { needsApproval: true } }, 2, item => { item.status = "waiting"; item.steps[2].status = "waiting" })
	const decision = openDecision(draft, northwind, "variance", "INV-20841 v2 · $240")
	northwind.wait = { kind: "decision", decisionId: decision.id }
	draft.clock = at(6)
	log(draft, { engagementId: "invoice", workItemId: northwind.id, decisionId: decision.id, actor: "analyst", kind: "decision", text: "Decision needed on INV-20841: Approve the $240 price variance?", tone: "attention" })
	draft.clock = base
	seed(draft, "invoice", "exception", { reference: "INV-20842", title: "Contoso · receiving reconciliation", started: at(5) }, 1, item => { item.status = "working"; item.steps[1] = { id: item.steps[1].id, status: "working", ticks: 1, startedAt: at(2) } })
	seed(draft, "invoice", "exception", { reference: "INV-20843", title: "Fabrikam · duplicate receipt check", started: at(1), flags: { writeTimeout: true } }, 0, item => { item.status = "working" })
	seed(draft, "invoice", "exception", { reference: "INV-20844", title: "Alpine · source-system read-back", started: at(12) }, 4, item => { item.status = "verifying"; item.steps[4] = { id: item.steps[4].id, status: "working", ticks: 1, startedAt: at(1) } })
	seed(draft, "invoice", "exception", { reference: "INV-20845", title: "Wingtip · new exception", started: base }, 0)

	seed(draft, "service", "incident", { reference: "INC-10482", title: "Payroll portal access failure", started: at(4) }, 1, item => { item.status = "working" })
	seed(draft, "service", "incident", { reference: "INC-10483", title: "New starter VPN connection", started: base }, 0)

	seed(draft, "onboarding", "joiner", { reference: "JOIN-306", title: "London analyst · day-one readiness", started: at(40) }, 3, item => { item.status = "waiting"; item.wait = { kind: "human", owner: "Payroll owner" }; item.steps[3].status = "waiting" })
	seed(draft, "onboarding", "joiner", { reference: "JOIN-307", title: "Leeds support analyst · day-one readiness", started: at(3) }, 1, item => { item.status = "working"; item.steps[1] = { id: "hr", status: "working", ticks: 1 }; item.steps[2] = { id: "it", status: "working", ticks: 1 } })

	seed(draft, "inventory", "cycle", { reference: "STOCK-902", title: "London warehouse · morning review", trigger: "Schedule", occurrence: iso(review(0)), started: at(22), flags: { writeTimeout: true } }, 3, item => {
		item.status = "working"; item.stage = "reconciling"
		item.steps[3] = { id: "requisition", status: "working", ticks: 0, startedAt: at(4) }
		item.effects.push({ id: `${item.id}:requisition`, system: "ERP", operation: "Create one requisition", sends: 1, status: "unknown" })
		draft.clock = at(3)
		log(draft, { engagementId: "inventory", workItemId: item.id, actor: "coordinator", kind: "effect", text: "STOCK-902: ERP didn't confirm the request. It may have succeeded, so nothing is resent; reconciling the original request.", tone: "attention", operations: ["ERP · 1 dispatch · no acknowledgement"] })
		draft.clock = base
	})
	draft.events.sort((a, b) => a.at - b.at)
	return draft
}

/*
 * The customer demo's first state: the same world laid out at the moment the
 * demo started, with intake quiet (the presenter adds work when they want to
 * show it), except that revenue reconciliation starts from zero. Its engagement
 * is an empty draft with no team at work and no history, both revenue designs
 * are held back, and only the Discovery that produces the design creates it.
 */
export function demoInitialState(base: number, engagementId: WorkflowId = "invoice"): AgentixState {
	const state = initialState(base)
	state.engagements[engagementId] = { ...seedEngagement(engagementId, base), status: "draft", origin: { kind: "prompt" }, packages: [], checked: false, notes: [] }
	/*
	 * A demo shows its own engagement being created from nothing, against a backdrop of unrelated
	 * work. Another demo's subject is not backdrop — the AP presenter should not find Northstar's
	 * revenue engagement running invoice exceptions in the fleet — so those are emptied to drafts
	 * too. A draft with no proposal is already hidden from the fleet, from what needs you and from
	 * the shell's work count (awaitingCreation), and keeping the key satisfies validState.
	 */
	for (const other of DEMO_SUBJECTS) {
		if (other === engagementId || !state.engagements[other]) continue
		state.engagements[other] = { ...seedEngagement(other, base), status: "draft", origin: { kind: "prompt" }, packages: [], checked: false, notes: [] }
	}
	const hidden = new Set<string>([engagementId, ...DEMO_SUBJECTS.filter(other => other !== engagementId)])
	const others = <T extends { engagementId: string }>(list: T[]) => list.filter(entry => !hidden.has(entry.engagementId))
	state.work = others(state.work)
	state.artifacts = others(state.artifacts)
	state.releases = others(state.releases)
	state.decisions = others(state.decisions)
	state.events = others(state.events)
	state.messages = others(state.messages)
	// Every design this engagement could run is held back until its own Discovery sends it -- and so
	// is every other demo's, or the opening screen offers to send another company's design to Agentix
	// while the presenter is saying nothing has happened yet.
	state.demo = { ...state.demo, quiet: true, gated: [engagementId, ...DEMO_SUBJECTS.filter(other => other !== engagementId)].flatMap(id => SCENARIOS[id].packages.map(pkg => pkg.id)) }
	return state
}
