import type { WorkflowId } from "../initiatives"
import { EPOCH, LIMITS, log, newItem, openDecision, templateOf } from "./engine"
import { SCENARIOS, SCENARIO_ORDER, WORKFLOW_IDS } from "./scenarios"
import { demoInitialState, initialState, seedEngagement } from "./seed"
import { demoScript } from "@/features/demo/scripts"
import { demoSession, moduleStorage, storageKey } from "@/features/demo/session"
import type { AgentixState, Engagement, Message, WorkItem, WorkStatus } from "./types"

/*
 * Saved demo state. Version 4 lives under its own key. A browser that still
 * holds version 3 is migrated on first read: its engagements, cases, messages
 * and drafts carry over, and the version-3 record is left exactly where it was.
 * Discovery's storage is never read or written here.
 */

export const STORAGE_KEY = "maxion-agentix-operations-v4"
export const LEGACY_KEY = "maxion-agentix-operations-v3"

const STATUSES: WorkStatus[] = ["scheduled", "queued", "working", "waiting", "verifying", "verified", "partial", "failed", "not_completed", "paused"]
const str = (value: unknown, max = 4000) => typeof value === "string" && value.length <= max
const bool = (value: unknown) => typeof value === "boolean"
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)

/* ---- Version 4 ------------------------------------------------------------ */
function validEngagement(id: string, value: unknown): value is Engagement {
	if (!record(value)) return false
	const e = value as unknown as Engagement
	return e.id === id && (WORKFLOW_IDS.includes(id as WorkflowId) || /^eng-[a-z0-9-]{1,64}$/.test(id))
		&& WORKFLOW_IDS.includes(e.workflowId) && ["draft", "active", "paused"].includes(e.status)
		&& str(e.name, 80) && str(e.owner, 80) && str(e.scope, 2000) && str(e.brief, 2000) && ["Event", "Schedule", "Assignment"].includes(e.trigger)
		&& Number.isInteger(e.version) && e.version > 0 && record(e.origin) && ["discovery", "prompt"].includes(e.origin.kind)
		&& Array.isArray(e.packages) && e.packages.every(p => str(p, 80)) && record(e.answers)
		&& [e.checked, e.checking, e.automaticPayroll, e.supportRequested, e.holdNotifications].every(bool)
		&& ["ready", "expired"].includes(e.connection) && ["ready", "lost"].includes(e.permission) && ["off", "weekdays", "daily"].includes(e.cycles)
		&& str(e.mapping, 80) && Number.isFinite(Date.parse(e.nextOccurrence)) && Array.isArray(e.notes) && e.notes.every(n => str(n))
		&& (e.proposal === undefined || (record(e.proposal) && ["discovery", "prompt"].includes(e.proposal.origin) && record(e.proposal.answers) && str(e.proposal.brief, 2000)))
}

function validItem(state: AgentixState, value: unknown): value is WorkItem {
	if (!record(value)) return false
	const w = value as unknown as WorkItem
	const engagement = state.engagements[w.engagementId]
	const template = engagement && SCENARIOS[engagement.workflowId].templates[w.template]
	return !!template && str(w.id, 200) && str(w.reference, 80) && str(w.title, 200) && STATUSES.includes(w.status)
		&& Array.isArray(w.steps) && w.steps.length === template.steps.length && w.steps.every((step, index) => step?.id === template.steps[index].id && Number.isFinite(step.ticks))
		&& Array.isArray(w.obligations) && Array.isArray(w.effects) && w.effects.every(effect => Number.isInteger(effect.sends) && effect.sends >= 0 && effect.sends <= 1)
		&& Array.isArray(w.dependsOn) && Array.isArray(w.artifactIds) && Array.isArray(w.releaseIds) && Array.isArray(w.notes) && w.notes.every(n => str(n))
		&& Number.isFinite(w.started) && Number.isFinite(w.costCents) && w.costCents >= 0 && bool(w.held) && ["Normal", "High"].includes(w.priority) && record(w.flags)
}

export function validState(raw: unknown): raw is AgentixState {
	if (!record(raw)) return false
	const s = raw as unknown as AgentixState
	if (s.version !== 4 || !Number.isFinite(s.clock) || !Number.isInteger(s.seq) || !record(s.engagements) || !record(s.drafts) || !record(s.nav) || !record(s.ui) || !record(s.demo)) return false
	const ids = Object.keys(s.engagements)
	if (ids.length > LIMITS.engagements || !SCENARIO_ORDER.every(id => ids.includes(id)) || !ids.every(id => validEngagement(id, s.engagements[id]))) return false
	for (const list of [s.work, s.artifacts, s.releases, s.decisions, s.events, s.messages]) if (!Array.isArray(list)) return false
	if (s.work.length > LIMITS.work || s.events.length > LIMITS.events || s.messages.length > LIMITS.messages) return false
	if (!s.work.every(item => validItem(s, item)) || new Set(s.work.map(item => item.id)).size !== s.work.length) return false
	if (!s.artifacts.every(a => record(a) && Object.hasOwn(s.engagements, a.engagementId) && Array.isArray(a.versions) && a.versions.length > 0 && a.versions.every(v => Number.isInteger(v.version) && Array.isArray(v.variant) && Array.isArray(v.checks)))) return false
	if (!s.releases.every(r => record(r) && Object.hasOwn(s.engagements, r.engagementId) && str(r.reference, 40) && Number.isInteger(r.attempts))) return false
	if (!s.decisions.every(d => record(d) && Object.hasOwn(s.engagements, d.engagementId) && ["open", "resolved", "withdrawn"].includes(d.status))) return false
	if (!s.messages.every(m => record(m) && Object.hasOwn(s.engagements, m.engagementId) && ["owner", "agent"].includes(m.role) && str(m.text) && record(m.scope))) return false
	if (!s.events.every(e => record(e) && str(e.text) && Number.isFinite(e.at))) return false
	if (!Object.values(s.drafts).every(value => str(value, 2000))) return false
	return true
}

/* Keeps the saved navigation pointing at things that still exist. */
function tidy(state: AgentixState): AgentixState {
	const nav = { ...state.nav }
	if (nav.engagementId && !Object.hasOwn(state.engagements, nav.engagementId)) nav.engagementId = null
	if (nav.workId && !state.work.some(item => item.id === nav.workId)) nav.workId = undefined
	if (nav.resultId && !state.artifacts.some(item => item.id === nav.resultId) && !state.work.some(item => item.id === nav.resultId)) nav.resultId = undefined
	if (!["work", "results", "activity"].includes(nav.view)) nav.view = "work"
	const gated = Array.isArray(state.demo.gated) ? state.demo.gated.filter(id => typeof id === "string" && id.length <= 40) : undefined
	return { ...state, nav, demo: { ackLoss: !!state.demo.ackLoss, scenario: WORKFLOW_IDS.includes(state.demo.scenario as WorkflowId) ? state.demo.scenario : "", ...state.demo.quiet ? { quiet: true } : {}, ...gated?.length ? { gated } : {} } }
}

/* ---- Version 3, read-only ------------------------------------------------- */
type LegacyRun = { id: string; agentId: string; reference: string; title: string; phase: string; step: number; trigger: "Event" | "Schedule" | "Assignment"; occurrence: string; started: number; finished?: number; needsApproval: boolean; approved: boolean; humanReference: string; writes: number; costCents: number; held: boolean; priority: "Normal" | "High"; recovered: boolean; beforePause?: string; notes: string[] }
type LegacyAgent = { id: string; workflowId?: WorkflowId; name: string; owner: string; scope: string; trigger: "Event" | "Schedule" | "Assignment"; status: "draft" | "active" | "paused"; version: number; origin: "discovery" | "prompt"; brief: string; mapping: string; checked: boolean; checking: boolean; automaticPayroll: boolean; supportRequested: boolean; connection: "ready" | "expired"; holdNotifications: boolean; nextOccurrence: string; notes: string[]; messages: { id: string; role: "user" | "agent"; text: string; runId?: string }[]; draft: string; caseDrafts?: Record<string, string> }
type Legacy = { version: 3; selected: string | null; clock: number; agents: Record<string, LegacyAgent>; runs: LegacyRun[] }

const LEGACY_NAMES: Record<WorkflowId, { name: string; owner: string }> = { invoice: { name: "Invoice operations", owner: "Accounts payable owner" }, payables: { name: "AP exception operations", owner: "Head of accounts payable" }, orders: { name: "Order sync operations", owner: "Revenue operations owner" }, conversion: { name: "Conversion readiness operations", owner: "SAP programme owner" }, service: { name: "Service desk", owner: "Service desk manager" }, onboarding: { name: "Employee onboarding", owner: "People operations owner" }, inventory: { name: "Inventory operations", owner: "Supply chain owner" } }
const PHASES = ["queued", "working", "approval", "human", "recovering", "verifying", "verified", "partial", "not_completed", "paused"]

function readLegacy(raw: unknown): Legacy | null {
	if (!record(raw)) return null
	const data = raw as unknown as Legacy
	if (data.version !== 3 || !Number.isFinite(data.clock) || !Array.isArray(data.runs) || data.runs.length > 200 || !record(data.agents) || Object.keys(data.agents).length > 50) return null
	for (const [id, agent] of Object.entries(data.agents)) {
		if (!record(agent) || agent.id !== id || (!WORKFLOW_IDS.includes(id as WorkflowId) && !/^eng-[a-z0-9-]{1,64}$/.test(id))) return null
		const workflowId = (agent.workflowId ?? id) as WorkflowId
		if (!WORKFLOW_IDS.includes(workflowId) || !["draft", "active", "paused"].includes(agent.status) || !str(agent.name ?? LEGACY_NAMES[workflowId].name, 80) || !str(agent.draft, 2000) || !Array.isArray(agent.messages) || !agent.messages.every(m => record(m) && str(m.id) && str(m.text) && ["user", "agent"].includes(m.role)) || !Array.isArray(agent.notes)) return null
	}
	if (!data.runs.every(run => record(run) && Object.hasOwn(data.agents, run.agentId) && str(run.id) && str(run.reference) && str(run.title) && PHASES.includes(run.phase) && Number.isInteger(run.step) && run.step >= 0 && run.step <= 5 && Number.isFinite(run.started) && Number.isFinite(run.costCents) && [0, 1].includes(run.writes))) return null
	if (new Set(data.runs.map(run => run.id)).size !== data.runs.length) return null
	return data
}

const LEGACY_TEMPLATE: Record<WorkflowId, string> = { invoice: "exception", payables: "exception", orders: "exception", conversion: "exception", service: "incident", onboarding: "joiner", inventory: "cycle" }
/* How many of the new steps an old five-stage position had completed, per template. */
const LEGACY_STEPS: Record<string, number[]> = { exception: [0, 1, 2, 3, 4, 6], incident: [0, 1, 2, 2, 3, 5], joiner: [0, 1, 3, 3, 4, 6], cycle: [0, 1, 3, 3, 4, 6] }

export function migrateLegacy(legacy: Legacy): AgentixState {
	const state = initialState()
	state.work = []; state.decisions = []; state.events = []; state.artifacts = []; state.releases = []
	state.clock = legacy.clock
	state.engagements = {}
	for (const agent of Object.values(legacy.agents)) {
		const workflowId = (agent.workflowId ?? agent.id) as WorkflowId
		const seeded = WORKFLOW_IDS.includes(agent.id as WorkflowId)
		const base = seedEngagement(workflowId)
		const defaults = LEGACY_NAMES[workflowId]
		const origin = agent.origin === "prompt" ? { kind: "prompt" as const } : base.origin
		const engagement: Engagement = {
			...base, id: agent.id,
			// A default name follows the engagement's new name; a name the owner chose is theirs.
			name: seeded && (agent.name ?? defaults.name).trim() === defaults.name ? base.name : (agent.name ?? defaults.name).slice(0, 80),
			owner: seeded && agent.owner === defaults.owner ? base.owner : (agent.owner ?? base.owner).slice(0, 80),
			scope: seeded ? base.scope : (agent.scope ?? base.scope).slice(0, 2000),
			trigger: agent.trigger ?? base.trigger, status: agent.status, version: Number.isInteger(agent.version) && agent.version > 0 ? agent.version : 1,
			origin, brief: (agent.brief ?? "").slice(0, 2000),
			packages: agent.status === "draft" ? [] : base.packages,
			proposal: agent.status === "draft" ? { origin: agent.origin === "prompt" ? "prompt" : "discovery", packageId: SCENARIOS[workflowId].packages[0].id, brief: (agent.brief ?? "").slice(0, 2000), kind: "new", answers: {}, receivedAt: legacy.clock } : undefined,
			mapping: typeof agent.mapping === "string" ? agent.mapping.slice(0, 80) : base.mapping, checked: !!agent.checked, checking: !!agent.checking,
			automaticPayroll: !!agent.automaticPayroll, supportRequested: !!agent.supportRequested, connection: agent.connection === "expired" ? "expired" : "ready",
			holdNotifications: !!agent.holdNotifications, nextOccurrence: Number.isFinite(Date.parse(agent.nextOccurrence)) ? agent.nextOccurrence : base.nextOccurrence,
			notes: [...(agent.notes ?? []).filter(note => typeof note === "string").slice(-38), "Carried over from the earlier demo version."],
		}
		state.engagements[agent.id] = engagement
		if (agent.draft) state.drafts[`eng:${agent.id}`] = agent.draft.slice(0, 2000)
		for (const [runId, text] of Object.entries(agent.caseDrafts ?? {})) if (typeof text === "string" && text) state.drafts[`work:${runId}`] = text.slice(0, 2000)
	}
	for (const id of SCENARIO_ORDER) if (!state.engagements[id]) state.engagements[id] = seedEngagement(id)
	for (const run of [...legacy.runs].sort((a, b) => a.started - b.started)) {
		const engagement = state.engagements[run.agentId]
		if (!engagement) continue
		const templateId = LEGACY_TEMPLATE[engagement.workflowId]
		const item = newItem(state, engagement.id, templateId, { reference: run.reference, title: run.title, trigger: run.trigger, occurrence: run.occurrence, started: run.started, priority: run.priority === "High" ? "High" : "Normal", flags: { needsApproval: !!run.needsApproval, approved: !!run.approved, reconciled: !!run.recovered, writeTimeout: engagement.workflowId === "inventory" && run.phase === "recovering" } })
		if (!item) continue
		const template = templateOf(state, item)!
		const doneSteps = run.phase === "verified" ? template.steps.length : (LEGACY_STEPS[templateId] ?? [])[run.step] ?? 0
		for (let index = 0; index < Math.min(doneSteps, item.steps.length); index++) {
			const step = template.steps[index]
			item.steps[index] = { id: step.id, status: step.kind === "decision" && !item.flags.needsApproval ? "skipped" : "done", ticks: step.ticks ?? 1, doneAt: run.started }
			if (step.kind === "write" && run.writes) item.effects.push({ id: `${item.id}:${step.id}`, system: step.system ?? "System", operation: step.title, sends: 1, status: "applied" })
			if (step.obligation && step.kind !== "notify") { const obligation = item.obligations.find(entry => entry.id === step.obligation); if (obligation) obligation.status = "met" }
		}
		item.held = !!run.held; item.costCents = Math.max(0, run.costCents); item.humanReference = run.humanReference || undefined; item.finished = run.finished; item.notes = (run.notes ?? []).slice(-40)
		const phase = run.phase
		item.status = phase === "approval" || phase === "human" ? "waiting" : phase === "recovering" ? "working" : (phase as WorkStatus)
		if (phase === "approval") { const decision = openDecision(state, item, "variance", `${item.reference} v2 · $240`); item.wait = { kind: "decision", decisionId: decision.id } }
		if (phase === "human") item.wait = { kind: "human", owner: "Payroll owner" }
		if (phase === "recovering") { item.stage = "reconciling"; item.effects.push({ id: `${item.id}:requisition`, system: "ERP", operation: "Create one requisition", sends: 1, status: "unknown" }) }
		if (phase === "partial") { const obligation = item.obligations.find(entry => entry.id === "notified"); if (obligation) obligation.status = "outstanding" }
		if (phase === "paused") item.pausedFrom = (["queued", "working", "verifying"].includes(run.beforePause ?? "") ? run.beforePause : "queued") as WorkStatus
		if (phase === "verified") for (const obligation of item.obligations) obligation.status = "met"
		if (phase === "not_completed") { item.flags.declined = item.flags.needsApproval && !item.flags.approved; for (const step of item.steps) if (step.status === "pending") step.status = "skipped" }
	}
	for (const agent of Object.values(legacy.agents)) {
		for (const message of agent.messages.slice(-60)) {
			const scope = message.runId && state.work.some(item => item.id === message.runId) ? { kind: "work" as const, id: message.runId } : { kind: "engagement" as const }
			const at = Number(message.id.split("-")[0])
			const entry: Message = { id: `v3-${message.id}`.slice(0, 120), engagementId: agent.id, scope, role: message.role === "user" ? "owner" : "agent", text: message.text.slice(0, 4000), at: Number.isFinite(at) ? at : legacy.clock }
			if (entry.role === "owner") entry.instruction = { intent: "steer", status: "answered", links: [] }
			state.messages.push(entry)
		}
	}
	for (const engagement of Object.values(state.engagements)) {
		const count = state.work.filter(item => item.engagementId === engagement.id).length
		log(state, { engagementId: engagement.id, actor: "agentix", kind: "notice", text: `Carried over ${count} work item${count === 1 ? "" : "s"} from the earlier demo version. Nothing was re-run.`, tone: "neutral" })
	}
	state.nav = { ...state.nav, engagementId: legacy.selected && Object.hasOwn(state.engagements, legacy.selected) ? legacy.selected : null }
	return state
}

/* ---- Read and write -------------------------------------------------------- */
/* The customer demo keeps its own copy under a separate key (see features/demo/session.ts) and never migrates. */
/*
 * Reads go through the demo's storage routing: localStorage for the everyday prototype and the tab
 * that owns the customer demo, this tab's own copy while another tab owns it. A browser that blocks
 * storage yields none at all, and the fresh state is used.
 */
export function readState(storage: Pick<Storage, "getItem"> | undefined = moduleStorage()): AgentixState {
	const demo = demoSession()
	try {
		const raw: unknown = JSON.parse(storage?.getItem(storageKey(STORAGE_KEY, !!demo)) ?? "null")
		if (validState(raw)) return tidy(raw)
		const legacy = demo ? null : readLegacy(JSON.parse(storage?.getItem(LEGACY_KEY) ?? "null"))
		if (legacy && raw === null) {
			const migrated = migrateLegacy(legacy)
			if (validState(migrated)) return tidy(migrated)
		}
	} catch {
		// Unreadable storage falls back to the fresh demo; nothing is overwritten until the next save.
	}
	return demo ? demoInitialState(demo.startedAt, demoScript(demo.id).engagementId) : initialState()
}

/* Throws when storage is unavailable or full, so the caller can say that changes won't survive a refresh. */
export function writeState(state: AgentixState, storage: Pick<Storage, "setItem"> | undefined = moduleStorage()) {
	if (!storage) throw new Error("Browser storage is unavailable")
	storage.setItem(storageKey(STORAGE_KEY), JSON.stringify(state))
}

export { EPOCH }
