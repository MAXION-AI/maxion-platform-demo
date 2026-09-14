import type { AgentixAttention, DiscoveryPackageRef, MaxionModuleId, PlanArtifactRef, PortalProject } from "./contracts"
import { demoStateRepository, type StateCodec } from "./persistence/DemoStateRepository"

const MAX_CONSULT_SOURCES = 10_000
const MAX_MOUNTED_CONSULT_SOURCES = 200
const MAX_THREADS = 20
const MAX_MESSAGES = 60
const MAX_QUESTION_LENGTH = 2_000
const CONSULT_MAX_BYTES = 750_000

export type ConsultSourceStatus = "current" | "live" | "stale" | "missing" | "conflict" | "denied"
export type ConsultSourceModule = Extract<MaxionModuleId, "discovery" | "plan" | "execute" | "agentix">
export type ConsultSource = {
	id: string
	objectId: string
	projectId: string
	module: ConsultSourceModule
	title: string
	detail: string
	version: string
	status: ConsultSourceStatus
	evidenceClass: "connected-source" | "operator-statement" | "synthetic-demo"
	environment: "development" | "local-simulation"
	authority: string
}
export type CitationRef = Pick<ConsultSource, "id" | "objectId" | "projectId" | "module" | "title" | "version" | "status" | "evidenceClass" | "environment" | "authority">
export type RouteProposal = { module: ConsultSourceModule; label: string; objectId: string; projectId: string }
export type GroundedAnswer = {
	id: string
	status: "grounded" | "partial" | "conflict" | "denied" | "error"
	question: string
	summary: string
	reasons: Array<{ title: string; detail: string }>
	citations: CitationRef[]
	route: RouteProposal | null
	scope: string
}
export type ConsultContext = {
	tenantId: "maxion-demo"
	project: PortalProject | null
	discoveryPackage: DiscoveryPackageRef | null
	planArtifact: PlanArtifactRef | null
	executeVerified: boolean
	agentix: AgentixAttention
	agentixProjectId: string | null
}
export type ConsultMessage =
	| { id: string; actor: "user"; text: string }
	| { id: string; actor: "max"; answer: GroundedAnswer }
export type ConsultThread = { id: string; title: string; updatedAt: number; messages: ConsultMessage[] }
export type ConsultState = { version: 1; projectId: string; activeThreadId: string; threads: ConsultThread[]; processedCommands: string[] }

const clean = (value: string, max = 240) => value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max)
const sourceId = (module: ConsultSourceModule, projectId: string) => `${projectId}:${module}`

export function buildConsultSourceIndex(context: ConsultContext, additional: readonly ConsultSource[] = []) {
	const project = context.project
	if (!project) return { sources: [] as ConsultSource[], total: 0, mounted: 0, omitted: 0 }
	const projectId = project.id
	const discoveryCurrent = context.discoveryPackage?.projectId === projectId
	const planCurrent = context.planArtifact?.projectId === projectId
	const sources: ConsultSource[] = [
		{
			id: sourceId("discovery", projectId), objectId: context.discoveryPackage?.projectId === projectId ? context.discoveryPackage.discoveryId : "discovery-workspace", projectId, module: "discovery", title: project.discovery ?? "Discovery evidence",
			detail: discoveryCurrent ? `${context.discoveryPackage!.provenance.length} evidence signals · approved v${context.discoveryPackage!.version}` : "No approved Discovery package is attached to this project.",
			version: discoveryCurrent ? `v${context.discoveryPackage!.version}` : "unavailable",
			status: discoveryCurrent ? context.discoveryPackage!.unresolvedGapIds.length ? "stale" : "current" : "missing",
			evidenceClass: discoveryCurrent ? context.discoveryPackage!.evidenceClasses[0] ?? "operator-statement" : "synthetic-demo",
			environment: "development", authority: "planning-input",
		},
		{
			id: sourceId("plan", projectId), objectId: context.planArtifact?.projectId === projectId ? context.planArtifact.artifactId : "plan-workspace", projectId, module: "plan", title: project.plan ?? "Project rollout plan",
			detail: planCurrent ? `Version ${context.planArtifact!.artifactVersion} · approved for Execute` : "No approved Plan handoff is attached to this project.",
			version: planCurrent ? `v${context.planArtifact!.artifactVersion}` : "unavailable",
			status: planCurrent ? context.discoveryPackage && context.planArtifact!.discoveryPackageId !== context.discoveryPackage.id ? "conflict" : "current" : "missing",
			evidenceClass: planCurrent ? "connected-source" : "synthetic-demo", environment: "development", authority: "execute-input",
		},
		{
			id: sourceId("execute", projectId), objectId: planCurrent ? context.planArtifact!.id : "execute-workspace", projectId, module: "execute", title: "Shared exception ledger",
			detail: planCurrent && context.executeVerified ? "Cumulative checks verified · release still owner-controlled" : planCurrent ? "Isolated workspace · implementation in progress" : "No Execute engagement exists without an approved Plan handoff.",
			version: planCurrent ? context.planArtifact!.contentDigest.slice(0, 12) : "not-started",
			status: planCurrent ? context.executeVerified ? "current" : "live" : "missing", evidenceClass: "synthetic-demo", environment: "development", authority: "files-tests-only",
		},
		{
			id: sourceId("agentix", projectId), objectId: context.agentix.approval ? "approval:INV-20841" : context.agentix.audience ? "question:onboarding" : "agentix:today", projectId, module: "agentix", title: "Revenue operations partner",
			detail: context.agentixProjectId !== projectId ? "Agentix state for this project has not loaded." : context.agentix.count ? `${context.agentix.count} bounded decision${context.agentix.count === 1 ? "" : "s"} waiting` : "No bounded decision currently waiting",
			version: context.agentixProjectId === projectId ? "deployment-v1" : "unavailable", status: context.agentixProjectId === projectId ? "live" : "missing", evidenceClass: "synthetic-demo", environment: "local-simulation", authority: "bounded-responsibility",
		},
	]
	const seenIds = new Set(sources.map(source => source.id))
	let total = sources.length
	for (const item of additional) {
		if (total >= MAX_CONSULT_SOURCES) break
		if (item.projectId !== projectId || seenIds.has(item.id)) continue
		seenIds.add(item.id)
		total += 1
		if (sources.length >= MAX_MOUNTED_CONSULT_SOURCES) continue
		sources.push({ ...item, objectId: clean(item.objectId, 240), title: clean(item.title), detail: clean(item.detail, 500), version: clean(item.version, 120), authority: clean(item.authority, 160) })
	}
	return { sources, total, mounted: sources.length, omitted: Math.max(0, total - sources.length) }
}

function sourcesFor(modules: ConsultSourceModule[], sources: readonly ConsultSource[]) {
	return sources.filter(source => modules.includes(source.module))
}
const cite = (source: ConsultSource): CitationRef => ({ id: source.id, objectId: source.objectId, projectId: source.projectId, module: source.module, title: source.title, version: source.version, status: source.status, evidenceClass: source.evidenceClass, environment: source.environment, authority: source.authority })

export function answerConsultQuestion(rawQuestion: string, context: ConsultContext, sources: readonly ConsultSource[]): GroundedAnswer {
	const question = clean(rawQuestion, MAX_QUESTION_LENGTH)
	const project = context.project
	const base = { id: `answer-${hashText(`${project?.id ?? "none"}:${question}`)}`, question, scope: project ? `${project.name} only · ${context.tenantId}` : context.tenantId }
	if (!question) return { ...base, status: "error", summary: "Enter a question so MAX can bind an answer to evidence.", reasons: [], citations: [], route: null }
	if (rawQuestion.trim().length > MAX_QUESTION_LENGTH) return { ...base, status: "error", summary: `Questions are limited to ${MAX_QUESTION_LENGTH.toLocaleString("en-US")} characters. Your draft is preserved so you can shorten it.`, reasons: [], citations: [], route: null }
	if (!project) return { ...base, status: "partial", summary: "Select a project before asking across workspace evidence.", reasons: [{ title: "Scope required", detail: "Consult MAX never searches another project implicitly." }], citations: [], route: null }
	const requestedProject = question.match(/\bproject:([a-z0-9-]+)/i)?.[1]
	if (requestedProject && requestedProject !== project.id) return { ...base, status: "denied", summary: "That project is outside the active authorization scope. No record lookup was performed.", reasons: [{ title: "Project isolation", detail: "Switch projects explicitly before asking about another workspace." }], citations: [], route: null }

	const lower = question.toLocaleLowerCase()
	const agentixCurrent = context.agentixProjectId === project.id
	const planCurrent = context.planArtifact?.projectId === project.id
	let modules: ConsultSourceModule[] = ["discovery", "plan", "execute", "agentix"]
	let summary = planCurrent ? "Finish the shared exception ledger and ownership rollout first. Automating now would scale an unprovable handoff." : "The connected sources do not support automation yet because this project has no approved Plan handoff."
	let reasons = planCurrent ? [
		{ title: "Control before speed", detail: "The current sources do not show a completed system-of-record rollout for changed commitments." },
		{ title: "Sequence already approved", detail: "The current Plan keeps bounded automation behind the ledger adoption gate." },
		{ title: "Safe next move", detail: "Complete the verification path, then launch bounded exception triage." },
	] : [
		{ title: "Grounding is incomplete", detail: "MAX can see the project, but no approved Plan version is available to establish the sequence." },
		{ title: "Safe next move", detail: "Open Plan and approve an explicit handoff before treating an automation recommendation as actionable." },
	]
	let route: RouteProposal = { module: "plan", label: planCurrent ? "Open the rollout plan" : "Open Plan to establish the sequence", objectId: context.planArtifact?.artifactId ?? "plan-workspace", projectId: project.id }
	if (/\b(approval|invoice|agentix|agent|attention)\b/.test(lower)) {
		modules = ["agentix", "plan"]
		summary = !agentixCurrent ? "Agentix state for this project is unavailable. The current Plan remains visible, but MAX will not reuse another project’s run status." : context.agentix.approval ? "The $240 invoice variance is the current bounded decision. Other runs continue, and no payment authority is implied." : context.agentix.audience ? "Onboarding is waiting for its human-owned payroll evidence. Completed HR and IT work remains preserved." : "Agentix has no bounded decision waiting in this project right now."
		reasons = agentixCurrent ? [{ title: "Exact authority", detail: "Consult can explain and route, but the Agentix run owns the decision." }, { title: "Independent work", detail: "Unrelated runs do not wait behind this answer." }] : [{ title: "Project state unavailable", detail: "Open Agentix in this project to inspect current work; no status from another project was reused." }]
		route = { module: "agentix", label: context.agentix.approval && agentixCurrent ? "Open the Agentix approval" : "Open Agentix activity", objectId: context.agentix.approval && agentixCurrent ? "approval:INV-20841" : "agentix:today", projectId: project.id }
	} else if (/\b(discover|discovery|evidence|source|interview)\b/.test(lower)) {
		modules = ["discovery"]
		summary = context.discoveryPackage?.projectId === project.id ? "Discovery evidence is attached to the active project and remains bounded to planning input." : "Only the project’s workspace discovery record is available; no approved evidence package is attached yet."
		reasons = [{ title: "Evidence boundary", detail: "Claims stay attached to their source class and unresolved gaps." }]
		route = { module: "discovery", label: "Open Discovery evidence", objectId: context.discoveryPackage?.projectId === project.id ? context.discoveryPackage.discoveryId : "discovery-workspace", projectId: project.id }
	} else if (/\b(execute|build|implement|test|release|deploy)\b/.test(lower)) {
		modules = ["plan", "execute"]
		summary = context.planArtifact?.projectId === project.id && context.executeVerified ? "Execute verification is complete, but release remains an explicit owner decision." : context.planArtifact?.projectId === project.id ? "Execute is working from the approved Plan artifact inside development authority. Deployment is not granted." : "Execute has no approved Plan handoff for this project yet."
		reasons = [{ title: "Bounded execution", detail: "Files and tests are allowed; release and deployment stay owner-controlled." }]
		route = { module: planCurrent ? "execute" : "plan", label: planCurrent ? "Open the Execute engagement" : "Open the plan handoff", objectId: context.planArtifact?.id ?? "plan-workspace", projectId: project.id }
	} else if (!/\b(renewal|exception|control|rollout|status|change|decision|why|what|should|current)\b/.test(lower)) {
		modules = []
		summary = "The connected project sources do not support a reliable answer to that question. Ask about this project’s Discovery evidence, Plan, Execute engagement, or Agentix work."
		reasons = [{ title: "Insufficient grounding", detail: "MAX will not turn unrelated text into a workspace claim." }]
		route = { module: "discovery", label: "Open available evidence", objectId: context.discoveryPackage?.projectId === project.id ? context.discoveryPackage.discoveryId : "discovery-workspace", projectId: project.id }
	}

	const relevant = sourcesFor(modules, sources)
	const conflicts = relevant.filter(source => source.status === "conflict")
	const usable = relevant.filter(source => source.status === "current" || source.status === "live")
	if (conflicts.length) return { ...base, status: "conflict", summary: "The connected sources disagree on the current version. Resolve the owning record before acting on this answer.", reasons: [{ title: "Version conflict", detail: conflicts.map(source => `${source.title} ${source.version}`).join(" · ") }], citations: conflicts.map(cite), route: { module: conflicts[0].module, label: `Resolve in ${moduleLabel(conflicts[0].module)}`, objectId: conflicts[0].objectId, projectId: project.id } }
	const status = modules.length > 0 && usable.length === relevant.length ? "grounded" : "partial"
	return { ...base, status, summary, reasons, citations: usable.map(cite), route }
}

const moduleLabel = (module: ConsultSourceModule) => module === "discovery" ? "Discovery" : module[0].toUpperCase() + module.slice(1)
function hashText(value: string) { let hash = 2166136261; for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619); return (hash >>> 0).toString(36) }
function stateSlice(projectId: string) { return `consult-${hashText(projectId)}` }
const consultModules = new Set<ConsultSourceModule>(["discovery", "plan", "execute", "agentix"])
const answerStatuses = new Set<GroundedAnswer["status"]>(["grounded", "partial", "conflict", "denied", "error"])
const boundedString = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max

function validPersistedAnswer(value: unknown, projectId: string): value is GroundedAnswer {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false
	const answer = value as Partial<GroundedAnswer>
	if (!boundedString(answer.id, 200) || !answerStatuses.has(answer.status as GroundedAnswer["status"]) || !boundedString(answer.question, MAX_QUESTION_LENGTH) || !boundedString(answer.summary, 4_000) || !boundedString(answer.scope, 500)) return false
	if (!Array.isArray(answer.reasons) || answer.reasons.length > 20 || !answer.reasons.every(reason => reason && boundedString(reason.title, 240) && boundedString(reason.detail, 1_000))) return false
	if (!Array.isArray(answer.citations) || answer.citations.length > MAX_MOUNTED_CONSULT_SOURCES || !answer.citations.every(citation => citation && boundedString(citation.id, 200) && boundedString(citation.objectId, 240) && citation.projectId === projectId && consultModules.has(citation.module) && boundedString(citation.title, 240) && boundedString(citation.version, 120) && ["current", "live", "stale", "missing", "conflict", "denied"].includes(citation.status) && ["connected-source", "operator-statement", "synthetic-demo"].includes(citation.evidenceClass) && ["development", "local-simulation"].includes(citation.environment) && boundedString(citation.authority, 160))) return false
	if (answer.route === null) return true
	return Boolean(answer.route && consultModules.has(answer.route.module as ConsultSourceModule) && boundedString(answer.route.label, 240) && boundedString(answer.route.objectId, 240) && answer.route.projectId === projectId)
}

function createInitialConsultState(context: ConsultContext, sources: readonly ConsultSource[]): ConsultState {
	const projectId = context.project?.id ?? "no-project"
	const question = "Should we automate renewal exceptions now, or finish the control-plane rollout first?"
	const answer = answerConsultQuestion(question, context, sources)
	const messages: ConsultMessage[] = [
		{ id: "seed-question", actor: "user", text: question },
		{ id: answer.id, actor: "max", answer },
	]
	return { version: 1, projectId, activeThreadId: "renewal-sequence", processedCommands: [], threads: [{ id: "renewal-sequence", title: "Customer operations decision", updatedAt: 0, messages }] }
}

export function appendConsultExchange(state: ConsultState, rawQuestion: string, answer: GroundedAnswer, commandId: string): ConsultState {
	if (state.processedCommands.includes(commandId)) return state
	const question = clean(rawQuestion, MAX_QUESTION_LENGTH)
	if (!question || commandId.length > 160) return state
	const active = state.threads.find(thread => thread.id === state.activeThreadId)
	if (!active) return state
	const exchange: ConsultMessage[] = [
		{ id: `${commandId}:question`, actor: "user", text: question },
		{ id: `${commandId}:answer`, actor: "max", answer },
	]
	const messages = [...active.messages, ...exchange].slice(-MAX_MESSAGES)
	return { ...state, processedCommands: [...state.processedCommands, commandId].slice(-1_000), threads: state.threads.map(thread => thread.id === active.id ? { ...thread, title: active.title === "New conversation" ? question.slice(0, 64) : active.title, updatedAt: Date.now(), messages } : thread) }
}

export function startConsultThread(state: ConsultState, commandId: string): ConsultState {
	if (state.processedCommands.includes(commandId) || commandId.length > 160) return state
	const id = `thread-${hashText(commandId)}`
	return { ...state, activeThreadId: id, processedCommands: [...state.processedCommands, commandId].slice(-1_000), threads: [{ id, title: "New conversation", updatedAt: Date.now(), messages: [] }, ...state.threads].slice(0, MAX_THREADS) }
}

const consultStateCodec = (projectId: string): StateCodec<ConsultState> => ({ parse: (raw) => {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
	const value = raw as Partial<ConsultState>
	if (value.version !== 1 || value.projectId !== projectId || value.projectId.length > 120 || typeof value.activeThreadId !== "string" || !Array.isArray(value.threads) || value.threads.length > MAX_THREADS || !Array.isArray(value.processedCommands) || value.processedCommands.length > 1_000) return null
	if (!value.threads.every(thread => thread && boundedString(thread.id, 160) && boundedString(thread.title, 160) && Number.isFinite(thread.updatedAt) && Array.isArray(thread.messages) && thread.messages.length <= MAX_MESSAGES && thread.messages.every(message => message && boundedString(message.id, 200) && (message.actor === "user" ? boundedString(message.text, MAX_QUESTION_LENGTH) : message.actor === "max" && validPersistedAnswer(message.answer, value.projectId!))))) return null
	if (!value.threads.some(thread => thread.id === value.activeThreadId) || value.processedCommands.some(id => typeof id !== "string" || id.length > 160)) return null
	return value as ConsultState
} })

export function readConsultState(context: ConsultContext, sources: readonly ConsultSource[]) {
	const projectId = context.project?.id ?? "no-project"
	return demoStateRepository.load(stateSlice(projectId), consultStateCodec(projectId), () => createInitialConsultState(context, sources), CONSULT_MAX_BYTES).value
}
export function persistConsultState(state: ConsultState) { return demoStateRepository.save(stateSlice(state.projectId), state, CONSULT_MAX_BYTES).ok }
