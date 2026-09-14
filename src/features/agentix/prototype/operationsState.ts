import { WORKFLOWS, type WorkflowId } from "./initiatives"
import { demoStateRepository, type StateCodec } from "@/features/platform-prototype/persistence/DemoStateRepository"
import type { AgentixAttention } from "@/features/platform-prototype/contracts"

const OPERATIONS_SLICE = "agentix-operations"
const LEGACY_OPERATIONS_KEY = "maxion-agentix-operations-v3"
const DEFAULT_PROJECT_ID = "northwind-operations"
const OPERATIONS_MAX_BYTES = 3_500_000
export const MAX_RUN_RECORDS = 10_000
export const MAX_MOUNTED_RUNS = 200
export const DEMO_TICK_MS = 4000
export const workflowFor = (id: WorkflowId) => WORKFLOWS.find(item => item.id === id)!
export const AGENT_NAMES: Record<WorkflowId, string> = { service: "Service desk agent", invoice: "Invoice operations agent", onboarding: "Employee onboarding agent", inventory: "Inventory operations agent" }
export type RunPhase = "queued" | "working" | "approval" | "human" | "recovering" | "verifying" | "verified" | "partial" | "not_completed" | "paused"
export interface OperationRun {
  id: string; agentId: WorkflowId; reference: string; title: string; phase: RunPhase; step: number
  trigger: "Event" | "Schedule" | "Assignment"; occurrence: string; started: number; finished?: number
  needsApproval: boolean; approved: boolean; humanReference: string; writes: number; costCents: number
  held: boolean; priority: "Normal" | "High"; verifyTicks: number; recovered: boolean
  beforePause?: RunPhase; notes: string[]; approvalVersion: number
}
export interface AgentMessage { id: string; role: "user" | "agent"; text: string; runId?: string }
export interface Deployment {
  id: WorkflowId; status: "draft" | "active" | "paused"; version: number; origin: "discovery" | "prompt"; brief: string
  mapping: string; checked: boolean; checking: boolean; automaticPayroll: boolean; supportRequested: boolean
  connection: "ready" | "expired"; repaired: boolean; messages: AgentMessage[]; draft: string; holdNotifications: boolean
  nextOccurrence: string; notes: string[]
  caseDrafts?: Record<string, string>
  provenance: { projectId: string; sourceArtifactId: string }
  environment: "local-simulation"; evidenceClass: "simulated"; authority: "bounded-responsibility"
}
export type OperationRole = "owner" | "member" | "viewer"
export type OperationCommand = { id: string; expectedDeploymentVersion: number }
export interface OperationsState {
  version: 4; tenantId: "demo-tenant"; projectId: string; role: OperationRole
  selected: WorkflowId | null; newBrief: string; clock: number; agents: Record<WorkflowId, Deployment>; runs: OperationRun[]
  processedCommands: string[]; notice: string | null
}
const epoch = Date.parse("2026-09-11T09:00:00Z")
const minute = 60000
const makeRun = (agentId: WorkflowId, reference: string, title: string, phase: RunPhase, overrides: Partial<OperationRun> = {}): OperationRun => ({
  id: `${agentId}:${reference}`, agentId, reference, title, phase, step: phase === "verified" ? 5 : 0,
  trigger: agentId === "inventory" ? "Schedule" : "Event", occurrence: reference, started: epoch,
  needsApproval: false, approved: false, humanReference: "", writes: phase === "verified" ? 1 : 0,
  costCents: phase === "verified" ? 24 : 0, held: false, priority: "Normal", verifyTicks: 0, recovered: false, notes: [], approvalVersion: 1, ...overrides,
})

export function initialOperations(projectId = DEFAULT_PROJECT_ID, role: OperationRole = "owner"): OperationsState {
  const agents = Object.fromEntries(WORKFLOWS.map(w => [w.id, {
    id: w.id, status: w.id === "onboarding" ? "draft" : "active", version: 1, origin: "discovery", brief: "",
    mapping: w.id === "onboarding" ? "" : "approved-v1", checked: w.id !== "onboarding", checking: false,
    automaticPayroll: false, supportRequested: false, connection: "ready", repaired: false, messages: [], draft: "", holdNotifications: false,
    nextOccurrence: "2026-09-14T05:00:00Z", notes: ["Discovery design v1 linked. Existing approved boundaries preserved."],
    provenance: { projectId, sourceArtifactId: `discovery-${w.id}-v1` }, environment: "local-simulation", evidenceClass: "simulated", authority: "bounded-responsibility",
  }])) as unknown as Record<WorkflowId, Deployment>
  return { version: 4, tenantId: "demo-tenant", projectId, role, selected: null, newBrief: "", clock: epoch, agents, processedCommands: [], notice: null, runs: [
    makeRun("invoice", "INV-20841", "Northwind · $240 price variance", "approval", { step: 2, needsApproval: true, costCents: 14 }),
    makeRun("invoice", "INV-20842", "Contoso · receiving reconciliation", "working", { step: 1, costCents: 6 }),
    makeRun("invoice", "INV-20843", "Fabrikam · duplicate receipt check", "working", { step: 0 }),
    makeRun("invoice", "INV-20844", "Alpine · source-system read-back", "verifying", { step: 4, writes: 1, costCents: 19, verifyTicks: -2 }),
    makeRun("invoice", "INV-20845", "Wingtip · new exception", "queued"),
    makeRun("service", "INC-10482", "Payroll portal access failure", "working", { step: 1, costCents: 4 }),
    makeRun("service", "INC-10483", "New starter VPN connection", "queued"),
    makeRun("inventory", "STOCK-902", "London warehouse · morning review", "recovering", { step: 3, writes: 1, costCents: 18, occurrence: "2026-09-11T05:00:00Z" }),
    makeRun("inventory", "STOCK-901", "London warehouse · 10 Sep review", "not_completed", { started: epoch - 1440 * minute, finished: epoch - 1410 * minute, occurrence: "2026-09-10T05:00:00Z", notes: ["Missed cycle: ERP outage exceeded the allowed start window. No catch-up write was attempted."] }),
    ...(["service", "invoice", "inventory"] as WorkflowId[]).flatMap((id, index) => [0, 1].map(n => makeRun(id, `${id === "service" ? "INC" : id === "invoice" ? "INV" : "STOCK"}-H${index}${n}`, n ? "Previous verified outcome" : "Earlier verified outcome", "verified", { started: epoch - (n + 2) * 1440 * minute, finished: epoch - (n + 2) * 1440 * minute + (8 + index * 3) * minute, occurrence: `2026-09-0${9 - n}T05:00:00Z`, approved: id === "invoice", needsApproval: id === "invoice", notes: ["Seeded demonstration history. Source read-back and required notification recorded."] }))),
  ] }
}

export const isTerminal = (run: OperationRun) => ["verified", "not_completed"].includes(run.phase)
export const needsAttention = (run: OperationRun) => ["approval", "human", "partial"].includes(run.phase)
export const readiness = (agent: Deployment): "ready" | "checking" | "repair" | "unsupported" => agent.automaticPayroll ? "unsupported" : agent.checking ? "checking" : !agent.mapping || !agent.checked || agent.connection === "expired" ? "repair" : "ready"
export function agentLabel(agent: Deployment, runs: OperationRun[]) {
  if (agent.status === "draft") return readiness(agent) === "ready" ? "Ready to deploy" : "Setup needs attention"
  if (agent.status === "paused") return "Intake paused"
  if (agent.connection === "expired") return "Degraded"
  return runs.some(run => run.agentId === agent.id && ["working", "verifying", "recovering"].includes(run.phase)) ? "Active" : "Watching"
}
export const phaseLabel = (phase: RunPhase) => ({ queued: "Queued", working: "Working", approval: "Needs approval", human: "Waiting on owner", recovering: "Reconciling", verifying: "Verifying", verified: "Verified", partial: "Partially complete", not_completed: "Not completed", paused: "Case paused" })[phase]
export function runActivity(run: OperationRun) {
  if (run.phase === "approval") return "AP owner · exact $240 decision required"
  if (run.phase === "human") return "Payroll owner · fulfillment evidence required"
  if (run.phase === "verifying") return "Change applied · awaiting source read-back"
  if (run.phase === "recovering") return "Reconciling the original request · no duplicate submission"
  if (run.phase === "partial") return "Record work preserved · notification not yet verified"
  if (run.phase === "verified") return "All required outcome checks passed"
  if (run.phase === "not_completed") return run.notes.at(-1) ?? "Required outcome was not achieved"
  if (run.phase === "queued") return "Accepted · waiting for an available execution slot"
  if (run.phase === "paused") return "Paused before the next action · progress preserved"
  return run.step < 2 ? (run.agentId === "service" ? "Incident coordinator · validating routing context" : "Specialists · independent evidence checks") : "Coordinator · preparing the governed update"
}
const addNote = (notes: string[], text: string) => [...notes, text].slice(-40)
const deny = (state: OperationsState, notice: string): OperationsState => ({ ...state, notice })
const commandAllowed = (state: OperationsState, version: number, command?: OperationCommand) => !command || command.id.length <= 160 && command.expectedDeploymentVersion === version && !state.processedCommands.includes(command.id)
const recordCommand = (state: OperationsState, command?: OperationCommand): OperationsState => command ? { ...state, processedCommands: [...state.processedCommands, command.id].slice(-1_000), notice: null } : { ...state, notice: null }
export type AgentAction = "pause-intake" | "resume-intake" | "deploy" | "recheck" | "use-human-payroll" | "request-payroll" | "support" | "expire" | "reconnect" | "hold-notifications" | "release-notifications"
export function updateAgent(state: OperationsState, id: WorkflowId, action: AgentAction, command?: OperationCommand): OperationsState {
  const old = state.agents[id]
  if (state.role === "viewer") return deny(state, "Viewer access is read-only for Agentix operations.")
  if (!commandAllowed(state, old.version, command)) return command && state.processedCommands.includes(command.id) ? state : deny(state, "This command targeted a stale deployment version.")
  let agent = { ...old }
  let runs = state.runs
  if (action === "pause-intake" && old.status === "active") { agent.status = "paused"; agent.notes = addNote(agent.notes, "New intake paused. Already-admitted cases continue; no effects were recalled.") }
  else if (action === "resume-intake" && old.status === "paused" && readiness(old) === "ready") agent.status = "active"
  else if (action === "deploy" && old.status === "draft" && readiness(old) === "ready") {
    agent.status = "active"; agent.notes = addNote(agent.notes, "Owner deployed version 1 to the simulated environment. Hybrid payroll responsibility retained.")
    if (!runs.some(run => run.agentId === id && run.reference === "JOIN-306")) runs = [...runs, makeRun(id, "JOIN-306", "London analyst · day-one readiness", "queued", { started: state.clock })]
  } else if (action === "recheck" && old.mapping && !old.automaticPayroll && old.connection === "ready") { agent.checking = true; agent.checked = false }
  else if (action === "use-human-payroll" && old.status === "draft") { agent.automaticPayroll = false; agent.checked = false; agent.notes = addNote(agent.notes, "Owner retained payroll-owner fulfillment; automatic payroll provisioning is excluded, not silently dropped.") }
  else if (action === "request-payroll" && old.status === "draft") { agent.automaticPayroll = true; agent.checked = false }
  else if (action === "support") { agent.supportRequested = true; agent.notes = addNote(agent.notes, "Demonstration support request AGX-104 created. Capability remains unsupported.") }
  else if (action === "expire" && old.status !== "draft") { agent.connection = "expired"; agent.checked = false; agent.repaired = false; agent.notes = addNote(agent.notes, "Notification connection expired. Only affected delivery obligations are waiting.") }
  else if (action === "reconnect" && old.connection === "expired") { agent.connection = "ready"; agent.checking = true; agent.repaired = true }
  else if (action === "hold-notifications") agent.holdNotifications = true
  else if (action === "release-notifications") agent.holdNotifications = false
  else return state
  return recordCommand({ ...state, agents: { ...state.agents, [id]: agent }, runs }, command)
}
export function setMapping(state: OperationsState, id: WorkflowId, value: string): OperationsState {
  if (state.role !== "owner") return deny(state, "Only the project owner can change a deployment mapping.")
  if (!["", "london-standard"].includes(value) || state.agents[id].status !== "draft") return state
  return { ...state, agents: { ...state.agents, [id]: { ...state.agents[id], mapping: value, checked: false } } }
}
export type RunAction = "approve" | "decline" | "refresh-approval" | "fulfill" | "pause" | "resume" | "prioritize" | "hold" | "release"
export function updateRun(state: OperationsState, id: string, action: RunAction, evidence = "", command?: OperationCommand): OperationsState {
  const target = state.runs.find(run => run.id === id)
  if (!target) return state
  if (state.role === "viewer") return deny(state, "Viewer access is read-only for Agentix cases.")
  if ((action === "approve" || action === "decline") && state.role !== "owner") return deny(state, "Only the project owner can resolve this approval.")
  if ((action === "approve" || action === "decline") && target.approvalVersion !== state.agents[target.agentId].version) return deny(state, "This approval belongs to an older deployment version. Open the current request before deciding.")
  const commandVersion = action === "refresh-approval" ? state.agents[target.agentId].version : target.approvalVersion
  if (!commandAllowed(state, commandVersion, command)) return command && state.processedCommands.includes(command.id) ? state : deny(state, "This decision is stale. Open the current deployment version before deciding.")
  const next: OperationsState = { ...state, runs: state.runs.map(run => {
    if (run.id !== id || isTerminal(run)) return run
    const atCapacity = state.runs.filter(r => r.agentId === run.agentId && ["working", "recovering", "verifying"].includes(r.phase)).length >= 3
    if (action === "refresh-approval" && run.phase === "approval" && state.role === "owner") return { ...run, approvalVersion: state.agents[run.agentId].version, notes: addNote(run.notes, `Approval request refreshed for deployment v${state.agents[run.agentId].version}; authority and amount are unchanged.`) }
    if (action === "approve" && run.phase === "approval") return { ...run, approved: true, phase: atCapacity ? "queued" : "working", beforePause: atCapacity ? "working" : undefined, step: 3, notes: addNote(run.notes, `${run.reference} v2: AP owner approved the $240 variance only. No payment release.`) }
    if (action === "decline" && run.phase === "approval") return { ...run, phase: "not_completed", finished: state.clock, notes: addNote(run.notes, "Variance declined. ERP exception stays open; no resolution or payment posted.") }
    if (action === "fulfill" && run.phase === "human" && evidence.trim()) return { ...run, humanReference: evidence.trim().slice(0, 120), phase: atCapacity ? "queued" : "working", beforePause: atCapacity ? "working" : undefined, step: 3, notes: addNote(run.notes, `Owner attestation attached: ${evidence.trim().slice(0, 120)}. Verification still required.`) }
    if (action === "pause" && ["working", "queued", "recovering", "verifying"].includes(run.phase)) return { ...run, beforePause: run.phase, phase: "paused" }
    if (action === "resume" && run.phase === "paused") {
      const busy = state.runs.filter(r => r.agentId === run.agentId && ["working", "recovering", "verifying"].includes(r.phase)).length
      return busy >= 3 ? { ...run, phase: "queued" } : { ...run, phase: run.beforePause ?? "queued", beforePause: undefined }
    }
    if (action === "prioritize") return { ...run, priority: "High" }
    if (action === "hold") return { ...run, held: true }
    if (action === "release" && state.agents[run.agentId].checked && state.agents[run.agentId].connection === "ready" && !state.agents[run.agentId].holdNotifications) return { ...run, held: false }
    return run
  }) }
  return next === state || next.runs.every((run, index) => run === state.runs[index]) ? state : recordCommand(next, command)
}

export function tickOperations(state: OperationsState): OperationsState {
  const clock = state.clock + minute
  const agents = { ...state.agents }
  for (const workflow of WORKFLOWS) {
    const a = agents[workflow.id]
    if (a.checking) agents[a.id] = { ...a, checking: false, checked: !!a.mapping && !a.automaticPayroll && a.connection === "ready", notes: addNote(a.notes, "Read-only recheck passed in simulation. Scope, mapping and verification path are current.") }
  }
  const active: Record<WorkflowId, number> = { service: 0, invoice: 0, onboarding: 0, inventory: 0 }
  for (const run of state.runs) if (["working", "recovering", "verifying"].includes(run.phase)) active[run.agentId]++
  const runs = [...state.runs].sort((a, b) => Number(b.priority === "High") - Number(a.priority === "High")).map(run => {
    const agent = agents[run.agentId]
    if (isTerminal(run) || ["approval", "human", "paused"].includes(run.phase)) return run
    if (run.phase === "partial") {
      if (agent.connection !== "ready" || !agent.checked || agent.holdNotifications || run.held || active[agent.id] >= 3) return run
      active[agent.id]++
      return { ...run, phase: "verifying" as const, verifyTicks: 0, notes: addNote(run.notes, "Outstanding notification can resume. Record write is not repeated; verification is still required.") }
    }
    if (run.phase === "queued") {
      if (agent.status !== "active" || readiness(agent) !== "ready" || active[agent.id] >= 3) return run
      active[agent.id]++; return { ...run, phase: run.beforePause && run.beforePause !== "queued" ? run.beforePause : "working" as const, beforePause: undefined, started: run.beforePause ? run.started : clock }
    }
    if (run.phase === "recovering") return { ...run, phase: "verifying" as const, recovered: true, step: 4, verifyTicks: -1, notes: addNote(run.notes, `Original ${run.reference} submission found. One write; zero duplicate creates.`) }
    if (run.phase === "verifying") {
      if (run.held || agent.holdNotifications || agent.connection === "expired" || !agent.checked) return { ...run, phase: "partial" as const }
      if (run.verifyTicks < 2) return { ...run, verifyTicks: run.verifyTicks + 1, costCents: run.costCents + 1 }
      return { ...run, phase: "verified" as const, step: 5, finished: clock, notes: addNote(run.notes, `${run.reference}: source read-back matched and required notification acceptance was evidenced. Delivery/read acknowledgement is not claimed.`) }
    }
    if (run.step === 2 && run.needsApproval && !run.approved) return { ...run, phase: "approval" as const }
    if (run.step === 2 && run.agentId === "onboarding" && !run.humanReference) return { ...run, phase: "human" as const }
    if (run.step >= 3) return { ...run, writes: 1, phase: run.agentId === "inventory" && !run.recovered ? "recovering" as const : "verifying" as const, step: 4, costCents: run.costCents + 4 }
    return { ...run, step: run.step + 1, costCents: run.costCents + 3 }
  })
  const next = { ...state, clock, agents, runs }
  const minutes = Math.round((clock - epoch) / minute)
  const incomingAgent = minutes % 24 === 0 ? "invoice" : "service"
  return minutes % 12 === 0 && agents[incomingAgent].status === "active"
    ? admitOccurrence(next, incomingAgent, `incoming:${clock}`)
    : next
}

export function admitOccurrence(state: OperationsState, agentId: WorkflowId, occurrence: string, scheduled = false): OperationsState {
  const agent = state.agents[agentId]
  if (agent.status === "draft" || state.runs.length >= MAX_RUN_RECORDS || state.runs.some(run => run.agentId === agentId && run.occurrence === occurrence)) return state
  const count = state.runs.filter(run => run.agentId === agentId).length
  const reference = `${agentId === "inventory" ? "STOCK" : agentId === "service" ? "INC" : agentId === "onboarding" ? "JOIN" : "INV"}-${30000 + count}`
  const run = makeRun(agentId, reference, scheduled ? "London warehouse · scheduled review" : "New incoming work item", "queued", { occurrence, trigger: scheduled ? "Schedule" : "Event", started: state.clock })
  return { ...state, runs: [...state.runs, run] }
}
export function nextSchedule(state: OperationsState): OperationsState {
  const agent = state.agents.inventory
  if (agent.status !== "active" || readiness(agent) !== "ready" || state.runs.length >= MAX_RUN_RECORDS) return state
  const occurrence = agent.nextOccurrence
  const date = new Date(occurrence); do { date.setUTCDate(date.getUTCDate() + 1) } while ([0, 6].includes(date.getUTCDay()))
  const advanced = admitOccurrence({ ...state, clock: Math.max(state.clock, Date.parse(occurrence)) }, "inventory", occurrence, true)
  return { ...advanced, agents: { ...advanced.agents, inventory: { ...agent, nextOccurrence: date.toISOString() } } }
}
export function measures(runs: OperationRun[]) {
  const completed = runs.filter(run => run.phase === "verified")
  const eligible = runs.filter(run => !run.needsApproval && run.agentId !== "onboarding" && isTerminal(run))
  const durations = completed.map(run => Math.max(0, ((run.finished ?? run.started) - run.started) / minute)).sort((a, b) => a - b)
  return { verified: completed.length, total: runs.length, eligible: eligible.length, straightThrough: eligible.filter(run => run.phase === "verified").length, cost: runs.reduce((sum, run) => sum + run.costCents, 0) / 100, medianMinutes: durations.length ? (durations[Math.floor((durations.length - 1) / 2)] + durations[Math.floor(durations.length / 2)]) / 2 : null }
}
export function matchAgent(text: string): WorkflowId | null { return /invoice|payable/i.test(text) ? "invoice" : /onboard|employee|hire|payroll provisioning/i.test(text) ? "onboarding" : /inventory|stock|replenish/i.test(text) ? "inventory" : /incident|servicenow|triage/i.test(text) ? "service" : null }
export function messageAgent(state: OperationsState, id: WorkflowId, text: string, runId?: string): OperationsState {
  if (state.role === "viewer") return deny(state, "Viewer access cannot steer deployed responsibilities.")
  const input = text.trim().slice(0, 2000); if (!input) return state
  let next = state; let response = "This demo uses scripted responses. I’ve kept your message, but haven’t applied an unsupported instruction. You can pause/resume intake, or select a case to prioritize, pause or hold its notification."
  const run = runId ? state.runs.find(item => item.id === runId && item.agentId === id) : undefined
  if (runId && !run) return state
  if (/^(please )?(pause|stop)( intake| new work| the agent)?[.!]?$/i.test(input) && !run) { next = updateAgent(state, id, "pause-intake"); response = next.agents[id].status === "paused" ? "New intake is paused. Admitted cases continue; queued work waits. This does not undo or recall external changes." : "This agent is not deployed. Readiness and activation are still required." }
  else if (/^(please )?(resume|continue)( intake| new work| the agent)?[.!]?$/i.test(input) && !run) { next = updateAgent(state, id, "resume-intake"); response = next.agents[id].status === "active" ? "Intake is active. Outstanding approvals stay with their cases; I won’t bypass them." : "Intake cannot resume until readiness is restored. Existing cases and evidence are preserved." }
  else if (/^(please )?pause( this case)?[.!]?$/i.test(input) && run) { next = updateRun(state, run.id, "pause"); response = "Requested a pause for this case only. Other cases keep working; required approvals are unchanged." }
  else if (/^(please )?(resume|continue)( this case)?[.!]?$/i.test(input) && run) { next = updateRun(state, run.id, "resume"); response = run.phase === "paused" ? "Resumed this case from its checkpoint." : "A general continue cannot bypass this case’s approval or human dependency." }
  else if (/^(please )?(prioriti[sz]e( this case)?|make (this|it) high priority)[.!]?$/i.test(input) && run) { next = updateRun(state, run.id, "prioritize"); response = "This case is high priority. The agent’s authority and other cases are unchanged." }
  else if (/^(please )?hold notifications[.!]?$/i.test(input)) { next = run ? updateRun(state, run.id, "hold") : updateAgent(state, id, "hold-notifications"); response = `${run ? "This case’s" : "The agent’s"} pending notifications are held. Completed sends cannot be recalled; required notifications remain incomplete.` }
  else if (/^(please )?release notifications[.!]?$/i.test(input)) { next = run ? updateRun(state, run.id, "release") : updateAgent(state, id, "release-notifications"); response = "Eligible held notifications can resume within the existing audience and permissions. Connection checks and verification still apply." }
  else if (/why.*team|specialist|how many agents/i.test(input)) response = workflowFor(id).teamReason
  else if (/status|what.*doing|what.*needs|update/i.test(input)) { const runs = state.runs.filter(item => item.agentId === id); response = `${agentLabel(state.agents[id], runs)}. ${runs.filter(item => !isTerminal(item)).length} open cases; ${runs.filter(needsAttention).length} need attention. Each case keeps its own outcome and evidence. Closing this conversation does not pause work in the demo.` }
  else if (/scope|permission|allowed|boundar/i.test(input)) response = workflowFor(id).boundary
  const a = next.agents[id]; const key = `${state.clock}-${a.messages.length}`
  return { ...next, agents: { ...next.agents, [id]: { ...a, draft: run ? a.draft : "", caseDrafts: run ? { ...a.caseDrafts, [run.id]: "" } : a.caseDrafts, messages: [...a.messages, { id: `${key}-u`, role: "user" as const, text: input, runId: run?.id }, { id: `${key}-a`, role: "agent" as const, text: response, runId: run?.id }].slice(-60) } } }
}
function parseOperations(raw: unknown, projectId = DEFAULT_PROJECT_ID, role: OperationRole = "owner"): OperationsState | null {
  try {
    if (!raw || typeof raw !== "object") return null
    const candidate = raw as Omit<OperationsState, "version" | "runs"> & { version?: 3 | 4; runs?: Array<OperationRun & { approvalVersion?: number }> }
    if (candidate.version !== 3 && candidate.version !== 4) return null
    const data = {
      ...candidate,
      version: 4 as const,
      tenantId: candidate.version === 4 ? candidate.tenantId : "demo-tenant",
      projectId: candidate.version === 4 ? candidate.projectId : projectId,
      role,
      processedCommands: candidate.version === 4 && Array.isArray(candidate.processedCommands) ? candidate.processedCommands : [],
      notice: candidate.version === 4 ? candidate.notice : null,
      agents: Object.fromEntries(WORKFLOWS.map(w => { const agent = candidate.agents?.[w.id]; return [w.id, agent ? { ...agent, provenance: agent.provenance ?? { projectId, sourceArtifactId: `discovery-${w.id}-v1` }, environment: "local-simulation" as const, evidenceClass: "simulated" as const, authority: "bounded-responsibility" as const } : agent] })) as OperationsState["agents"],
      runs: Array.isArray(candidate.runs) ? candidate.runs.map(run => ({ ...run, approvalVersion: Number.isInteger(run.approvalVersion) ? run.approvalVersion : 1 })) : candidate.runs,
    } as OperationsState
    if (!Number.isFinite(data.clock) || !Array.isArray(data.runs) || data.runs.length > MAX_RUN_RECORDS || data.tenantId !== "demo-tenant" || data.projectId !== projectId) return null
    if (!WORKFLOWS.every(w => { const a = data.agents?.[w.id]; return a?.id === w.id && ["draft", "active", "paused"].includes(a.status) && typeof a.mapping === "string" && typeof a.draft === "string" && typeof a.brief === "string" && ["ready", "expired"].includes(a.connection) && [a.checked, a.checking, a.automaticPayroll, a.supportRequested, a.repaired, a.holdNotifications].every(v => typeof v === "boolean") && Array.isArray(a.notes) && a.notes.every(n => typeof n === "string") && Array.isArray(a.messages) && a.messages.every(m => m && typeof m.id === "string" && typeof m.text === "string" && ["user", "agent"].includes(m.role)) })) return null
    const phases = ["queued", "working", "approval", "human", "recovering", "verifying", "verified", "partial", "not_completed", "paused"]
    if (!data.runs.every(r => r && WORKFLOWS.some(w => w.id === r.agentId) && typeof r.id === "string" && typeof r.reference === "string" && typeof r.title === "string" && phases.includes(r.phase) && Number.isInteger(r.step) && r.step >= 0 && r.step <= 5 && Number.isFinite(r.started) && Number.isFinite(r.costCents) && r.costCents >= 0 && [0, 1].includes(r.writes) && typeof r.humanReference === "string" && Number.isFinite(r.verifyTicks) && Array.isArray(r.notes) && r.notes.every(n => typeof n === "string"))) return null
    if (!Object.values(data.agents).every(a => Number.isInteger(a.version) && a.version > 0 && ["discovery", "prompt"].includes(a.origin) && Number.isFinite(Date.parse(a.nextOccurrence)) && a.messages.every(m => !m.runId || data.runs.some(r => r.id === m.runId && r.agentId === a.id)) && a.provenance?.projectId === data.projectId && typeof a.provenance.sourceArtifactId === "string" && a.environment === "local-simulation" && a.evidenceClass === "simulated" && a.authority === "bounded-responsibility")) return null
    if (!data.runs.every(r => [r.needsApproval, r.approved, r.held, r.recovered].every(v => typeof v === "boolean") && Number.isInteger(r.approvalVersion) && r.approvalVersion > 0 && ["Event", "Schedule", "Assignment"].includes(r.trigger) && ["Normal", "High"].includes(r.priority) && typeof r.occurrence === "string" && (!r.beforePause || ["queued", "working", "verifying", "recovering"].includes(r.beforePause)) && (r.finished === undefined || Number.isFinite(r.finished)) && [r.id, r.reference, r.title, r.occurrence, r.humanReference, ...r.notes].every(s => s.length <= 4000))) return null
    if (new Set(data.runs.map(r => r.id)).size !== data.runs.length) return null
    if (!Object.values(data.agents).every(a => !a.caseDrafts || typeof a.caseDrafts === "object" && !Array.isArray(a.caseDrafts) && Object.entries(a.caseDrafts).every(([id, value]) => typeof value === "string" && value.length <= 2000 && data.runs.some(r => r.id === id && r.agentId === a.id)))) return null
    if (!Array.isArray(data.processedCommands) || data.processedCommands.length > 1_000 || data.processedCommands.some(id => typeof id !== "string" || id.length > 160) || data.notice !== null && typeof data.notice !== "string") return null
    return { ...data, processedCommands: data.processedCommands.slice(-1_000), notice: data.notice?.slice(0, 300) ?? null, selected: WORKFLOWS.some(w => w.id === data.selected) ? data.selected : null, newBrief: typeof data.newBrief === "string" ? data.newBrief.slice(0, 2000) : "", agents: Object.fromEntries(WORKFLOWS.map(w => { const a = data.agents[w.id]; return [w.id, { ...a, draft: a.draft.slice(0, 2000), brief: a.brief.slice(0, 2000), notes: a.notes.slice(-40), messages: a.messages.slice(-60).map(m => ({ ...m, text: m.text.slice(0, 4000) })) }] })) as OperationsState["agents"] }
  } catch { return null }
}

export const operationsCodec: StateCodec<OperationsState> = { parse: parseOperations }
const scopedOperationsCodec = (projectId: string, role: OperationRole): StateCodec<OperationsState> => ({ parse: (raw) => parseOperations(raw, projectId, role) })
function operationsSlice(projectId: string) {
  if (projectId === DEFAULT_PROJECT_ID) return OPERATIONS_SLICE
  let hash = 2166136261
  for (const character of projectId) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  const slug = projectId.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 32) || "project"
  return `agentix-${slug}-${(hash >>> 0).toString(36)}`
}

export function readOperations(projectId = DEFAULT_PROJECT_ID, role: OperationRole = "owner"): OperationsState {
  const slice = operationsSlice(projectId)
  const legacy = projectId === DEFAULT_PROJECT_ID ? [LEGACY_OPERATIONS_KEY] : []
  return demoStateRepository.load(slice, scopedOperationsCodec(projectId, role), () => initialOperations(projectId, role), OPERATIONS_MAX_BYTES, legacy).value
}

export function persistOperations(state: OperationsState) {
  return demoStateRepository.save(operationsSlice(state.projectId), state, OPERATIONS_MAX_BYTES).ok
}

export function deriveAgentixAttention(state: OperationsState): AgentixAttention {
  return {
    count: state.runs.filter(needsAttention).length + Object.values(state.agents).filter(agent => agent.status === "draft" && readiness(agent) !== "ready").length,
    approval: state.runs.some(run => run.phase === "approval"),
    audience: state.runs.some(run => run.phase === "human"),
  }
}

export function readAgentixAttention(projectId = DEFAULT_PROJECT_ID, role: OperationRole = "owner"): AgentixAttention {
  return deriveAgentixAttention(readOperations(projectId, role))
}
