import type { DiscoveryPackageRef, DiscoveryPackageEvidenceClass } from "@/features/platform-prototype/contracts"
import type { StateCodec } from "@/features/platform-prototype/persistence/DemoStateRepository"

import { SCENARIOS, scenarioForBrief, type ScenarioKey } from "./model"

export const DISCOVERY_STATE_SLICE = "discovery-workspace"
export const LEGACY_DISCOVERY_STORAGE_KEYS = ["maxion.prototype.discovery-records.v1"] as const
export const DISCOVERY_STATE_MAX_BYTES = 3_500_000
const MAX_TRANSCRIPT_ENTRIES = 10_000
const MAX_EVIDENCE_REFS = 10_000
const MAX_MOUNTED_DISCOVERY_ROWS = 200
export const DISCOVERY_INPUT_LIMIT = 2_000

export type DiscoveryStatus =
	| "new"
	| "active"
	| "paused"
	| "awaiting-answer"
	| "insufficient-evidence"
	| "offline"
	| "recoverable-error"
	| "complete"
	| "read-only"

export type DiscoveryProviderState = {
	status: "online" | "offline" | "retrying"
	attempt: number
	lastError: string | null
}

export type InterviewTurn = {
	id: string
	questionId: string
	answer: string | null
	sequence: number
}

export type TranscriptEntry = {
	id: string
	actor: "max" | "operator" | "system"
	text: string
	sequence: number
	createdAt: string
	evidenceIds: string[]
}

export type EvidenceRef = {
	id: string
	label: string
	source: string
	locator: string
	evidenceClass: DiscoveryPackageEvidenceClass
	verified: boolean
	sequence: number
}

export type DiscoveryFact = {
	id: string
	statement: string
	evidenceIds: string[]
	confidence: "supported" | "provisional"
}

export type DecisionRequest = {
	id: string
	question: string
	status: "open" | "resolved" | "declined"
	authority: "project-owner" | "domain-owner"
	answer: string | null
}

export type DiscoveryGap = {
	id: string
	label: string
	detail: string
	status: "open" | "resolved"
	material: boolean
	evidenceIds: string[]
}

export type DiscoveryAuditEvent = {
	id: string
	type: string
	objectRef: string
	evidenceClass: DiscoveryPackageEvidenceClass
	correlationId: string
}

export type DiscoverySession = {
	version: 2
	id: string
	projectId: string
	projectName: string
	title: string
	scenarioKey: ScenarioKey
	status: DiscoveryStatus
	permission: "owner" | "member" | "viewer"
	questionIndex: number
	draft: string
	interviewTurns: InterviewTurn[]
	transcript: TranscriptEntry[]
	evidence: EvidenceRef[]
	facts: DiscoveryFact[]
	decisions: DecisionRequest[]
	gaps: DiscoveryGap[]
	provider: DiscoveryProviderState
	packageRef: DiscoveryPackageRef | null
	audit: DiscoveryAuditEvent[]
	createdAt: string
	updatedAt: string
}

export type QuarantinedDiscoveryRecord = {
	index: number
	reason: string
}

export type DiscoverySlice = {
	version: 2
	sessions: DiscoverySession[]
	activeSessionId: string | null
	quarantine: QuarantinedDiscoveryRecord[]
}

export type DiscoveryEvent =
	| { type: "session/started"; brief: string; projectId: string; projectName: string; now?: string }
	| { type: "session/opened"; sessionId: string }
	| { type: "draft/changed"; value: string }
	| { type: "interview/answered"; answer: string; now?: string }
	| { type: "gap/resolved"; gapId: string; now?: string }
	| { type: "session/paused" }
	| { type: "session/resumed" }
	| { type: "provider/offline"; message?: string }
	| { type: "provider/retry-started" }
	| { type: "provider/recovered" }
	| { type: "provider/manual-continuation" }
	| { type: "session/failed"; message?: string }
	| { type: "session/recovered" }
	| { type: "package/created"; now?: string }
	| { type: "permission/changed"; permission: DiscoverySession["permission"] }

const safeText = (value: unknown, limit: number) => typeof value === "string" && value.length <= limit ? value : null
const safeId = (value: unknown) => {
	const id = safeText(value, 120)
	return id && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(id) ? id : null
}
const safeDate = (value: unknown) => {
	const date = safeText(value, 80)
	return date && Number.isFinite(Date.parse(date)) ? date : null
}
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const uniqueById = <T extends { id: string }>(items: readonly T[]) => {
	const seen = new Set<string>()
	return items.filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)))
}
const bounded = <T>(items: readonly T[], max: number) => items.slice(Math.max(0, items.length - max))
const nowIso = (provided?: string) => provided && Number.isFinite(Date.parse(provided)) ? provided : new Date().toISOString()
const correlationId = (sessionId: string, type: string, sequence: number) => `${sessionId}:${type}:${sequence}`.slice(0, 160)

function initialEvidence(scenarioKey: ScenarioKey): EvidenceRef[] {
	return SCENARIOS[scenarioKey].sources.map((source, sequence) => ({
		id: `source-${scenarioKey}-${sequence + 1}`,
		label: source.name,
		source: source.system,
		locator: `${source.scope} · ${source.records}`,
		evidenceClass: "connected-source",
		verified: sequence < 2,
		sequence,
	}))
}

function createDiscoverySession(brief: string, projectId: string, projectName: string, now?: string): DiscoverySession {
	const cleanBrief = brief.trim().slice(0, DISCOVERY_INPUT_LIMIT)
	const scenarioKey = scenarioForBrief(cleanBrief)
	const scenario = SCENARIOS[scenarioKey]
	const timestamp = nowIso(now)
	const id = `discovery-${projectId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40) || "project"}-${Date.parse(timestamp)}`
	const question = scenario.ownerInterview[0]
	return {
		version: 2,
		id,
		projectId: projectId.slice(0, 120),
		projectName: projectName.trim().slice(0, 160) || "Untitled project",
		title: cleanBrief || scenario.title,
		scenarioKey,
		status: "awaiting-answer",
		permission: "owner",
		questionIndex: 0,
		draft: "",
		interviewTurns: [{ id: `${id}:turn:1`, questionId: `${scenarioKey}:q:1`, answer: null, sequence: 0 }],
		transcript: [{
			id: `${id}:message:1`, actor: "max", text: question.question, sequence: 0, createdAt: timestamp, evidenceIds: [],
		}],
		evidence: initialEvidence(scenarioKey),
		facts: [],
		decisions: [{ id: `${id}:decision:authority`, question: scenario.decision, status: "open", authority: "project-owner", answer: null }],
		gaps: [{
			id: `${id}:gap:authority`, label: "Authority boundary", detail: scenario.exception.evidenceGap, status: "open", material: true, evidenceIds: [],
		}],
		provider: { status: "online", attempt: 0, lastError: null },
		packageRef: null,
		audit: [{ id: `${id}:event:1`, type: "session.started", objectRef: id, evidenceClass: "synthetic-demo", correlationId: correlationId(id, "session.started", 1) }],
		createdAt: timestamp,
		updatedAt: timestamp,
	}
}

export function createInitialDiscoverySlice(): DiscoverySlice {
	const session = createDiscoverySession(
		"Redesign third-party onboarding controls so every recommendation is bound to a source and an accountable owner.",
		"erp-modernization",
		"ERP modernization",
		"2026-09-14T12:00:00.000Z",
	)
	return { version: 2, sessions: [session], activeSessionId: session.id, quarantine: [] }
}

export const selectActiveDiscoverySession = (state: DiscoverySlice) => state.sessions.find((session) => session.id === state.activeSessionId) ?? null
export const selectOpenDiscoveryGaps = (session: DiscoverySession) => session.gaps.filter((gap) => gap.status === "open")
export const selectPackageReady = (session: DiscoverySession) =>
	session.permission !== "viewer" &&
	session.provider.status === "online" &&
	session.transcript.some((entry) => entry.actor === "operator") &&
	selectOpenDiscoveryGaps(session).every((gap) => !gap.material)

export function selectMountedTranscript(session: DiscoverySession, limit = MAX_MOUNTED_DISCOVERY_ROWS) {
	const safeLimit = Math.min(Math.max(Math.floor(limit), 1), MAX_MOUNTED_DISCOVERY_ROWS)
	const ordered = [...session.transcript].sort((left, right) => left.sequence - right.sequence)
	const items = ordered.slice(-safeLimit)
	return { items, total: ordered.length, omitted: Math.max(0, ordered.length - items.length) }
}

export function selectMountedEvidence(session: DiscoverySession, limit = MAX_MOUNTED_DISCOVERY_ROWS) {
	const safeLimit = Math.min(Math.max(Math.floor(limit), 1), MAX_MOUNTED_DISCOVERY_ROWS)
	const ordered = [...session.evidence].sort((left, right) => left.sequence - right.sequence)
	return { items: ordered.slice(0, safeLimit), total: ordered.length, omitted: Math.max(0, ordered.length - safeLimit) }
}

function updateActive(state: DiscoverySlice, updater: (session: DiscoverySession) => DiscoverySession): DiscoverySlice {
	if (!state.activeSessionId) return state
	let changed = false
	const sessions = state.sessions.map((session) => {
		if (session.id !== state.activeSessionId) return session
		const next = updater(session)
		changed = next !== session
		return next
	})
	return changed ? { ...state, sessions } : state
}

function addAudit(session: DiscoverySession, type: string, objectRef: string, evidenceClass: DiscoveryPackageEvidenceClass): DiscoveryAuditEvent[] {
	const sequence = session.audit.length + 1
	return bounded([...session.audit, { id: `${session.id}:event:${sequence}`, type, objectRef, evidenceClass, correlationId: correlationId(session.id, type, sequence) }], 400)
}

function createPackage(session: DiscoverySession, now?: string): DiscoveryPackageRef {
	const evidenceClasses = [...new Set(session.evidence.filter((item) => item.verified).map((item) => item.evidenceClass))]
	return {
		version: 1,
		id: `${session.id}:package:v1`,
		projectId: session.projectId,
		projectName: session.projectName,
		discoveryId: session.id,
		createdAt: nowIso(now),
		provenance: session.evidence.filter((item) => item.verified).map((item) => ({ evidenceId: item.id, source: item.source, locator: item.locator })),
		unresolvedGapIds: selectOpenDiscoveryGaps(session).map((gap) => gap.id),
		authority: { level: session.permission === "owner" ? "project-owner" : "member", boundedTo: "planning-input" },
		evidenceClasses: evidenceClasses.length ? evidenceClasses : ["synthetic-demo"],
	}
}

export function discoveryReducer(state: DiscoverySlice, event: DiscoveryEvent): DiscoverySlice {
	switch (event.type) {
		case "session/started": {
			const session = createDiscoverySession(event.brief, event.projectId, event.projectName, event.now)
			return { ...state, sessions: bounded([session, ...state.sessions.filter((item) => item.id !== session.id)], 100), activeSessionId: session.id }
		}
		case "session/opened": return state.sessions.some((session) => session.id === event.sessionId) ? { ...state, activeSessionId: event.sessionId } : state
		case "draft/changed": return updateActive(state, (session) => ({ ...session, draft: event.value.slice(0, DISCOVERY_INPUT_LIMIT) }))
		case "interview/answered": return updateActive(state, (session) => {
			if (["paused", "offline", "recoverable-error", "complete", "read-only"].includes(session.status)) return session
			const answer = event.answer.trim().slice(0, DISCOVERY_INPUT_LIMIT)
			if (!answer) return session
			const timestamp = nowIso(event.now)
			const nextSequence = session.transcript.reduce((highest, item) => Math.max(highest, item.sequence), -1) + 1
			const scenario = SCENARIOS[session.scenarioKey]
			const turnIndex = Math.min(session.questionIndex, scenario.ownerInterview.length - 1)
			const nextQuestionIndex = Math.min(turnIndex + 1, scenario.ownerInterview.length - 1)
			const turns = session.interviewTurns.map((turn, index) => index === turnIndex ? { ...turn, answer } : turn)
			const hasNextTurn = nextQuestionIndex > turnIndex
			const interviewTurns = hasNextTurn ? [...turns, { id: `${session.id}:turn:${nextQuestionIndex + 1}`, questionId: `${session.scenarioKey}:q:${nextQuestionIndex + 1}`, answer: null, sequence: nextQuestionIndex }] : turns
			const nextQuestion = scenario.ownerInterview[nextQuestionIndex]
			const transcript = bounded(uniqueById([
				...session.transcript,
				{ id: `${session.id}:message:${nextSequence + 1}`, actor: "operator" as const, text: answer, sequence: nextSequence, createdAt: timestamp, evidenceIds: [] },
				{ id: `${session.id}:message:${nextSequence + 2}`, actor: "max" as const, text: hasNextTurn ? `I recorded that as a provisional fact. ${nextQuestion.question}` : "I recorded the answer. Resolve the remaining material gap to prepare the Plan handoff.", sequence: nextSequence + 1, createdAt: timestamp, evidenceIds: [] },
			]), MAX_TRANSCRIPT_ENTRIES)
			return {
				...session,
				status: "active",
				questionIndex: nextQuestionIndex,
				draft: "",
				interviewTurns,
				transcript,
				facts: bounded(uniqueById([...session.facts, { id: `${session.id}:fact:${turnIndex + 1}`, statement: answer, evidenceIds: [], confidence: "provisional" }]), 2_000),
				audit: addAudit(session, "interview.answered", `${session.id}:turn:${turnIndex + 1}`, "operator-statement"),
				updatedAt: timestamp,
			}
		})
		case "gap/resolved": return updateActive(state, (session) => {
			if (session.permission === "viewer" || session.provider.status !== "online") return session
			const gap = session.gaps.find((item) => item.id === event.gapId)
			if (!gap || gap.status === "resolved") return session
			const timestamp = nowIso(event.now)
			const evidenceId = `${gap.id}:resolution`
			const evidence: EvidenceRef = { id: evidenceId, label: "Authority matrix v4", source: "Policy library", locator: "Controls / authority-matrix-v4", evidenceClass: "connected-source", verified: true, sequence: session.evidence.length }
			const gaps = session.gaps.map((item) => item.id === gap.id ? { ...item, status: "resolved" as const, evidenceIds: [evidenceId] } : item)
			return { ...session, status: "active", gaps, evidence: bounded(uniqueById([...session.evidence, evidence]), MAX_EVIDENCE_REFS), facts: uniqueById([...session.facts, { id: `${gap.id}:fact`, statement: "Planning authority is bounded to the project owner and cannot widen execution permissions.", evidenceIds: [evidenceId], confidence: "supported" }]), audit: addAudit(session, "gap.resolved", gap.id, "connected-source"), updatedAt: timestamp }
		})
		case "session/paused": return updateActive(state, (session) => session.status === "complete" || session.permission === "viewer" ? session : { ...session, status: "paused", audit: addAudit(session, "session.paused", session.id, "synthetic-demo") })
		case "session/resumed": return updateActive(state, (session) => session.status !== "paused" ? session : { ...session, status: "active", audit: addAudit(session, "session.resumed", session.id, "synthetic-demo") })
		case "provider/offline": return updateActive(state, (session) => session.status === "complete" ? session : { ...session, status: "offline", provider: { status: "offline", attempt: session.provider.attempt, lastError: (event.message?.trim() || "The interview provider is unavailable.").slice(0, 240) }, audit: addAudit(session, "provider.offline", session.id, "synthetic-demo") })
		case "provider/retry-started": return updateActive(state, (session) => session.provider.status !== "offline" ? session : { ...session, provider: { ...session.provider, status: "retrying", attempt: session.provider.attempt + 1 } })
		case "provider/recovered": return updateActive(state, (session) => session.provider.status === "online" ? session : { ...session, status: "active", provider: { status: "online", attempt: session.provider.attempt, lastError: null }, audit: addAudit(session, "provider.recovered", session.id, "synthetic-demo") })
		case "provider/manual-continuation": return updateActive(state, (session) => session.provider.status === "online" ? session : { ...session, status: "insufficient-evidence", provider: { ...session.provider, status: "offline" }, audit: addAudit(session, "provider.manual-continuation", session.id, "operator-statement") })
		case "session/failed": return updateActive(state, (session) => ({ ...session, status: "recoverable-error", provider: { ...session.provider, lastError: (event.message?.trim() || "The last transition could not be saved.").slice(0, 240) }, audit: addAudit(session, "session.failed", session.id, "synthetic-demo") }))
		case "session/recovered": return updateActive(state, (session) => session.status !== "recoverable-error" ? session : { ...session, status: session.provider.status === "online" ? "active" : "offline", provider: { ...session.provider, lastError: null }, audit: addAudit(session, "session.recovered", session.id, "synthetic-demo") })
		case "package/created": return updateActive(state, (session) => {
			if (!selectPackageReady(session)) return { ...session, status: "insufficient-evidence" }
			const packageRef = createPackage(session, event.now)
			return { ...session, status: "complete", packageRef, decisions: session.decisions.map((decision) => ({ ...decision, status: "resolved", answer: "Bound to the versioned Discovery package." })), audit: addAudit(session, "package.created", packageRef.id, packageRef.evidenceClasses[0] ?? "synthetic-demo"), updatedAt: packageRef.createdAt }
		})
		case "permission/changed": return updateActive(state, (session) => ({ ...session, permission: event.permission, status: event.permission === "viewer" ? "read-only" : session.status === "read-only" ? "active" : session.status }))
		default: return state
	}
}

function parseEvidenceClass(value: unknown): DiscoveryPackageEvidenceClass | null {
	return value === "connected-source" || value === "operator-statement" || value === "synthetic-demo" ? value : null
}

function parseEvidence(value: unknown, index: number): EvidenceRef | null {
	if (!isRecord(value)) return null
	const id = safeId(value.id), label = safeText(value.label, 240), source = safeText(value.source, 160), locator = safeText(value.locator, 500), evidenceClass = parseEvidenceClass(value.evidenceClass)
	if (!id || !label?.trim() || !source?.trim() || locator === null || !evidenceClass || typeof value.verified !== "boolean") return null
	return { id, label, source, locator, evidenceClass, verified: value.verified, sequence: Number.isSafeInteger(value.sequence) ? Number(value.sequence) : index }
}

function parseTranscript(value: unknown, index: number): TranscriptEntry | null {
	if (!isRecord(value)) return null
	const id = safeId(value.id), text = safeText(value.text, DISCOVERY_INPUT_LIMIT), createdAt = safeDate(value.createdAt)
	if (!id || text === null || !createdAt || !["max", "operator", "system"].includes(String(value.actor))) return null
	const evidenceIds = Array.isArray(value.evidenceIds) ? value.evidenceIds.map(safeId).filter((item): item is string => Boolean(item)).slice(0, 50) : []
	return { id, text, createdAt, actor: value.actor as TranscriptEntry["actor"], sequence: Number.isSafeInteger(value.sequence) ? Number(value.sequence) : index, evidenceIds }
}

function parseCurrentSession(value: unknown): DiscoverySession | null {
	if (!isRecord(value) || value.version !== 2) return null
	const id = safeId(value.id), projectId = safeId(value.projectId), projectName = safeText(value.projectName, 160), title = safeText(value.title, DISCOVERY_INPUT_LIMIT), createdAt = safeDate(value.createdAt), updatedAt = safeDate(value.updatedAt)
	if (!id || !projectId || !projectName?.trim() || !title?.trim() || !createdAt || !updatedAt || !["tprm", "diligence", "enterprise"].includes(String(value.scenarioKey)) || !["new", "active", "paused", "awaiting-answer", "insufficient-evidence", "offline", "recoverable-error", "complete", "read-only"].includes(String(value.status)) || !["owner", "member", "viewer"].includes(String(value.permission))) return null
	if (!Array.isArray(value.transcript) || value.transcript.length > MAX_TRANSCRIPT_ENTRIES || !Array.isArray(value.evidence) || value.evidence.length > MAX_EVIDENCE_REFS) return null
	const transcript = value.transcript.map(parseTranscript).filter((item): item is TranscriptEntry => item !== null)
	const evidence = value.evidence.map(parseEvidence).filter((item): item is EvidenceRef => item !== null)
	if (transcript.length !== value.transcript.length || evidence.length !== value.evidence.length) return null
	const scenarioKey = value.scenarioKey as ScenarioKey
	return {
		...createDiscoverySession(title, projectId, projectName, createdAt),
		...value,
		version: 2,
		id,
		projectId,
		projectName,
		title,
		scenarioKey,
		status: value.status as DiscoveryStatus,
		permission: value.permission as DiscoverySession["permission"],
		draft: safeText(value.draft, DISCOVERY_INPUT_LIMIT) ?? "",
		questionIndex: Number.isSafeInteger(value.questionIndex) ? Math.min(Math.max(Number(value.questionIndex), 0), SCENARIOS[scenarioKey].ownerInterview.length - 1) : 0,
		transcript: uniqueById(transcript).sort((left, right) => left.sequence - right.sequence),
		evidence: uniqueById(evidence).sort((left, right) => left.sequence - right.sequence),
		provider: isRecord(value.provider) && ["online", "offline", "retrying"].includes(String(value.provider.status)) ? { status: value.provider.status as DiscoveryProviderState["status"], attempt: Number.isSafeInteger(value.provider.attempt) ? Math.max(0, Number(value.provider.attempt)) : 0, lastError: safeText(value.provider.lastError, 240) } : { status: "online", attempt: 0, lastError: null },
		packageRef: null,
		createdAt,
		updatedAt,
	} as DiscoverySession
}

function migrateLegacyRecord(value: unknown, index: number): DiscoverySession | null {
	if (!isRecord(value)) return null
	const id = safeId(value.id), title = safeText(value.title, DISCOVERY_INPUT_LIMIT), brief = safeText(value.brief, DISCOVERY_INPUT_LIMIT), createdAt = safeDate(value.createdAt), updatedAt = safeDate(value.updatedAt)
	if (!id || !title?.trim() || brief === null || !createdAt || !updatedAt || !["tprm", "diligence", "enterprise"].includes(String(value.scenarioKey))) return null
	const session = createDiscoverySession(brief || title, "erp-modernization", "ERP modernization", createdAt)
	return { ...session, id, title, scenarioKey: value.scenarioKey as ScenarioKey, status: value.paused === true ? "paused" : Number(value.phase) >= 7 ? "complete" : value.decision === "pending" ? "insufficient-evidence" : "active", updatedAt, transcript: Array.isArray(value.messages) ? value.messages.map((message, messageIndex) => isRecord(message) ? parseTranscript({ id: safeId(message.id) ?? `${id}:legacy:${messageIndex}`, actor: message.actor === "user" ? "operator" : "max", text: message.text, sequence: messageIndex, createdAt: updatedAt, evidenceIds: [] }, messageIndex) : null).filter((item): item is TranscriptEntry => item !== null) : session.transcript, audit: [{ id: `${id}:event:legacy`, type: "session.migrated", objectRef: `${index}`, evidenceClass: "synthetic-demo", correlationId: correlationId(id, "session.migrated", 1) }] }
}

function parseDiscoverySlice(value: unknown): DiscoverySlice | null {
	const rawSessions = Array.isArray(value) ? value : isRecord(value) && value.version === 2 && Array.isArray(value.sessions) ? value.sessions : null
	if (!rawSessions || rawSessions.length > 100) return null
	const sessions: DiscoverySession[] = []
	const quarantine: QuarantinedDiscoveryRecord[] = []
	rawSessions.forEach((item, index) => {
		const parsed = isRecord(item) && item.version === 2 ? parseCurrentSession(item) : migrateLegacyRecord(item, index)
		if (parsed) sessions.push(parsed)
		else quarantine.push({ index, reason: "Record failed schema, bounds, or provenance validation." })
	})
	const activeCandidate = isRecord(value) ? safeId(value.activeSessionId) : null
	const uniqueSessions = uniqueById(sessions)
	return { version: 2, sessions: uniqueSessions, activeSessionId: uniqueSessions.some((session) => session.id === activeCandidate) ? activeCandidate : uniqueSessions[0]?.id ?? null, quarantine }
}

export const discoveryStateCodec: StateCodec<DiscoverySlice> = {
	parse: parseDiscoverySlice,
	migrate: (_version, value) => parseDiscoverySlice(value),
}
