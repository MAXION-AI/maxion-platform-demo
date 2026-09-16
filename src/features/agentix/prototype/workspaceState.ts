import { WORKFLOWS, type WorkflowExample, type WorkflowId } from "./initiatives"

export type WorkStatus = "draft" | "ready" | "scheduled" | "running" | "waiting" | "paused" | "complete" | "declined"
export type WaitingFor = "approval" | "human" | "notification" | null
export interface WorkMessage { id: string; role: "user" | "agent"; text: string }
export interface AgentWork {
	status: WorkStatus
	stage: number
	gateResolved: boolean
	waitingFor: WaitingFor
	holdNotifications: boolean
	priority: "Normal" | "High"
	origin: "discovery" | "prompt"
	brief: string
	messages: WorkMessage[]
	notes: string[]
	draft: string
}
export interface WorkspaceState { version: 2; selected: WorkflowId | null; newDraft: string; works: Record<WorkflowId, AgentWork> }
export const WORKSPACE_KEY = "maxion-agentix-workspace-v2"
export const STEP_INTERVAL = 3600
export const workFor = (id: WorkflowId) => WORKFLOWS.find(work => work.id === id)!
export const newWork = (status: WorkStatus = "draft"): AgentWork => ({ status, stage: 0, gateResolved: false, waitingFor: null, holdNotifications: false, priority: "Normal", origin: "discovery", brief: "", messages: [], notes: [], draft: "" })

export function initialWorkspace(): WorkspaceState {
	return {
		version: 2,
		selected: "invoice",
		newDraft: "",
		works: {
			service: newWork("ready"),
			invoice: { ...newWork("running"), stage: 1, notes: ["Operating scope activated by the AP owner. Invoice and receipt checks dispatched with read-only access."] },
			onboarding: newWork(),
			inventory: newWork("scheduled"),
		},
	}
}

const statuses: WorkStatus[] = ["draft", "ready", "scheduled", "running", "waiting", "paused", "complete", "declined"]
function validWork(value: unknown, workflow: WorkflowExample): value is AgentWork {
	if (!value || typeof value !== "object") return false
	const w = value as AgentWork
	return statuses.includes(w.status) && Number.isInteger(w.stage) && w.stage >= 0 && w.stage < workflow.steps.length
		&& typeof w.gateResolved === "boolean" && typeof w.holdNotifications === "boolean"
		&& [null, "approval", "human", "notification"].includes(w.waitingFor)
		&& ["Normal", "High"].includes(w.priority) && ["discovery", "prompt"].includes(w.origin)
		&& typeof w.brief === "string" && typeof w.draft === "string"
		&& Array.isArray(w.notes) && w.notes.every(note => typeof note === "string")
		&& Array.isArray(w.messages) && w.messages.every(message => message && typeof message.id === "string" && ["user", "agent"].includes(message.role) && typeof message.text === "string")
}

export function readWorkspace(): WorkspaceState {
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(WORKSPACE_KEY) ?? "null")
		const state = initialWorkspace()
		if (!stored || typeof stored !== "object" || (stored as WorkspaceState).version !== 2) return state
		const data = stored as WorkspaceState
		state.newDraft = typeof data.newDraft === "string" ? data.newDraft.slice(0, 2000) : ""
		if (data.selected === null || WORKFLOWS.some(w => w.id === data.selected)) state.selected = data.selected
		for (const workflow of WORKFLOWS) {
			const work = data.works?.[workflow.id]
			if (validWork(work, workflow)) state.works[workflow.id] = { ...work, brief: work.brief.slice(0, 2000), draft: work.draft.slice(0, 2000), notes: work.notes.slice(-40), messages: work.messages.slice(-40).map(message => ({ ...message, text: message.text.slice(0, 4000) })) }
		}
		return state
	} catch { return initialWorkspace() }
}

export type WorkAction = "tick" | "activate" | "start" | "pause" | "resume" | "approve" | "decline" | "fulfill" | "release-notification" | "hold-notifications" | "prioritize"
const note = (work: AgentWork, text: string) => [...work.notes, text].slice(-40)

export function changeWork(work: AgentWork, workflow: WorkflowExample, action: WorkAction, evidence?: string): AgentWork {
	if (action === "prioritize") return { ...work, priority: "High", notes: note(work, "Owner marked this work high priority. Existing approval and access boundaries are unchanged.") }
	if (action === "hold-notifications" && !["complete", "declined"].includes(work.status)) return { ...work, holdNotifications: true, notes: note(work, "Owner asked to hold outbound notifications. Required delivery remains unverified until released.") }
	if (action === "activate" && work.status === "draft") return { ...work, status: "running", notes: note(work, `Owner activated the proposed scope${workflow.accessGap ? "; payroll access remains assigned to its human owner" : ""}.`) }
	if (action === "start" && ["ready", "scheduled"].includes(work.status)) return { ...work, status: "running", notes: note(work, `Started ${workflow.caseId}.`) }
	if (action === "pause" && work.status === "running") return { ...work, status: "paused", notes: note(work, "Paused before the next action. Completed work is preserved.") }
	if (action === "resume" && work.status === "paused") return { ...work, status: "running", notes: note(work, "Resumed from the preserved checkpoint; no completed action is repeated.") }
	if (action === "approve" && work.status === "waiting" && work.waitingFor === "approval") return { ...work, status: "running", waitingFor: null, gateResolved: true, notes: note(work, workflow.gate!.receipt) }
	if (action === "decline" && work.status === "waiting" && work.waitingFor === "approval") return { ...work, status: "declined", waitingFor: null, notes: note(work, "AP owner declined the $240 variance. The exception remains open; no ERP resolution or payment was posted.") }
	if (action === "fulfill" && work.status === "waiting" && work.waitingFor === "human" && evidence?.trim()) return { ...work, status: "running", waitingFor: null, gateResolved: true, notes: note(work, `Demonstration receipt ${evidence.trim().slice(0, 120)} attached by the payroll owner; fulfillment reference retained.`) }
	if (action === "release-notification" && work.status === "waiting" && work.waitingFor === "notification") return { ...work, status: "running", waitingFor: null, holdNotifications: false, notes: note(work, "Owner released the held notification to the already-approved audience.") }
	if (action !== "tick" || work.status !== "running") return work
	if (workflow.gate?.index === work.stage && !work.gateResolved) {
		// An uncertain provider response is a recovery job, not a customer approval.
		if (workflow.gate.kind === "reconcile") return { ...work, stage: work.stage + 1, gateResolved: true, notes: note(work, workflow.gate.receipt) }
		return { ...work, status: "waiting", waitingFor: workflow.gate.kind }
	}
	if (work.stage === workflow.steps.length - 1) {
		if (work.holdNotifications) return { ...work, status: "waiting", waitingFor: "notification" }
		return { ...work, status: "complete", notes: note(work, "All required outcome checks passed in the simulation. No external system was changed.") }
	}
	return { ...work, stage: work.stage + 1 }
}

export function statusLabel(work: AgentWork): string {
	if (work.status === "waiting") return work.waitingFor === "notification" ? "Notification held" : work.waitingFor === "human" ? "Waiting on payroll" : "Needs your decision"
	return { draft: "Ready for review", ready: "Ready", scheduled: "Scheduled", running: "Working", paused: "Paused", complete: "Outcome verified", declined: "Not completed" }[work.status]
}

export function currentActivity(work: AgentWork, workflow: WorkflowExample): string {
	if (work.status === "complete") return workflow.result
	if (work.status === "draft") return "Operating plan prepared from Discovery"
	if (work.status === "scheduled") return "Next review · 06:00 Europe/London"
	if (work.status === "ready") return "An incident is ready for triage"
	if (work.status === "declined") return "Variance declined · exception remains open"
	if (work.status === "paused") return `Paused before: ${workflow.steps[work.stage].title.toLowerCase()}`
	if (work.waitingFor === "notification") return "Records updated; required notification is held"
	if (work.waitingFor === "approval") return "A $240 price variance needs your approval"
	if (work.waitingFor === "human") return "Payroll owner must confirm access"
	return workflow.steps[work.stage].title
}

export function steerWork(work: AgentWork, workflow: WorkflowExample, input: string): AgentWork {
	const text = input.trim()
	if (!text) return work
	let next = work
	let reply: string
	if (/^(?:(?:please|can you|could you)\s+)?(pause|stop|hold off|wait a moment)\b/i.test(text) && !/notif|email|teams|message/i.test(text)) {
		next = changeWork(work, workflow, "pause")
		reply = next !== work ? "Paused. I won’t begin the next action. Everything already completed is preserved; resume here whenever you’re ready." : "There’s no active action to pause. I’ll keep the current state and any outstanding decision unchanged."
	} else if (/^(?:(?:please|can you|could you)\s+)?(resume|continue|carry on)\b/i.test(text)) {
		next = changeWork(work, workflow, "resume")
		reply = next !== work ? `Resuming from “${workflow.steps[work.stage].title}”. I won’t repeat completed actions.` : "I can’t use a general ‘continue’ to bypass an outstanding decision. Resolve the specific request in this workspace; the completed work is safe."
	} else if (/^(?:(?:please|can you|could you)\s+)?(hold|don.t send|do not send|skip|stop|pause).*(notif|email|teams|message)/i.test(text)) {
		next = changeWork(work, workflow, "hold-notifications")
		reply = next !== work ? "I’ll hold outbound notifications and continue the permitted record work. Delivery is part of the agreed outcome, so I’ll show it as pending—not claim the whole task is complete." : "The notification has already been sent in this simulated case. I can’t retroactively hold it or claim it was recalled."
	} else if (/^(?:(?:please|can you|could you)\s+)?(?:(?:make|mark|set|treat).*\b(urgent|high priority)\b|prioriti[sz]e\b|this is urgent)/i.test(text)) {
		next = changeWork(work, workflow, "prioritize")
		reply = "Marked high priority. The team’s work stays in this workspace, and approval requirements and permissions remain unchanged."
	} else if (/why|team|agents|parallel|specialist/i.test(text)) reply = workflow.teamReason
	else if (/permission|allowed|scope|policy|boundar/i.test(text)) reply = workflow.boundary
	else if (/source|discovery|evidence|context/i.test(text)) reply = `I’m using the approved ${workflow.title.toLowerCase()} design, version 1, with ${workflow.sources.length} source references. ${workflow.changes[0].finding} Open “Discovery sources” in the context panel to inspect the evidence and future-state design.`
	else if (/status|update|doing|left|need.*me|what.*next/i.test(text)) reply = `${currentActivity(work, workflow)}. ${work.status === "waiting" ? "The specific request is shown above. Only this case is waiting; the rest of the work is preserved." : `The outcome I’m working toward: ${workflow.outcome}`}`
	else reply = "This interactive prototype doesn’t run a language model, so I haven’t applied an instruction I can’t interpret. You can ask me to pause, resume, hold notifications, or mark this high priority—and see that change take effect. I can also explain the team, evidence, and permissions."
	const id = `${Date.now()}-${work.messages.length}`
	return { ...next, draft: "", messages: [...work.messages, { id: `${id}-u`, role: "user" as const, text }, { id: `${id}-a`, role: "agent" as const, text: reply }].slice(-40) }
}

export function matchWorkflow(text: string): WorkflowId | null {
	return /invoice|payable|three.way/i.test(text) ? "invoice" : /onboard|employee|hire|\bhr\b/i.test(text) ? "onboarding" : /stock|inventory|supply|replenish/i.test(text) ? "inventory" : /incident|triage|servicenow|ticket/i.test(text) ? "service" : null
}
