import type { PlanArtifactRef } from "@/features/platform-prototype/contracts"
import type { StateCodec } from "@/features/platform-prototype/persistence/DemoStateRepository"

export const EXECUTE_STATE_SLICE = "execute-workspace"
export const EXECUTE_STATE_MAX_BYTES = 3_500_000
const EVENT_LIMIT = 10_000
const IDEMPOTENCY_LIMIT = 1_000
const MOUNT_LIMIT = 200

export type ExecutionRole = "owner" | "member" | "viewer"
export type ExecutionStatus = "idle" | "running" | "paused" | "failed" | "stopped" | "rolled-back" | "approval-held" | "completed"
export type ExecutionStageStatus = "queued" | "running" | "passed" | "failed"
export type ExecutionStage = { id: string; title: string; detail: string; expectedSeconds: number; status: ExecutionStageStatus }
export type ExecutionEvent = {
	id: string
	type: string
	label: string
	stageId: string | null
	createdAt: string
	correlationId: string
	environment: "local-simulation"
	evidenceClass: "simulated"
}
export type ExecutionResultRef = {
	version: 1
	id: string
	runId: string
	planArtifactId: string
	planArtifactVersion: number
	projectId: string
	completedAt: string
	environment: "local-simulation"
	evidenceClass: "simulated"
}
export type ExecutionRun = {
	id: string
	projectId: string
	projectName: string
	planRef: PlanArtifactRef
	role: ExecutionRole
	status: ExecutionStatus
	revision: number
	activeStageId: string | null
	stages: ExecutionStage[]
	events: ExecutionEvent[]
	idempotencyKeys: string[]
	resultRef: ExecutionResultRef | null
	notice: string | null
}
export type ExecuteSlice = { version: 1; activeRunId: string | null; runs: ExecutionRun[] }

type CommandMeta = { actorRole: ExecutionRole; expectedRevision: number; idempotencyKey: string; correlationId: string }
export type ExecutionCommand =
	| { type: "plan/ingested"; planRef: PlanArtifactRef; actorRole: ExecutionRole }
	| ({ type: "run/started" | "run/paused" | "run/resumed" | "run/stopped" | "run/failed" | "run/retried" | "run/rolled-back" | "run/approved" } & CommandMeta)
	| ({ type: "run/advanced"; operationId: string } & CommandMeta)
	| ({ type: "run/steered"; text: string } & CommandMeta)
	| { type: "notice/cleared" }

const STAGES: ReadonlyArray<Omit<ExecutionStage, "status">> = [
	{ id: "contract", title: "Data contract", detail: "Read the approved Plan boundary and pin source identifiers.", expectedSeconds: 45 },
	{ id: "api", title: "API boundary", detail: "Model tenant-scoped inputs, outputs, and failure contracts.", expectedSeconds: 75 },
	{ id: "workflow", title: "Portal workflow", detail: "Build the operator path and preserve recoverable state.", expectedSeconds: 120 },
	{ id: "proof", title: "Failure proof", detail: "Exercise denial, timeout, stale command, and recovery paths.", expectedSeconds: 90 },
	{ id: "receipt", title: "Result package", detail: "Seal the simulated result and evidence receipt for approval.", expectedSeconds: 30 },
]

const now = () => new Date().toISOString()
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const text = (value: unknown, max: number) => typeof value === "string" && value.length <= max ? value : null
const isRole = (value: unknown): value is ExecutionRole => value === "owner" || value === "member" || value === "viewer"
const isStatus = (value: unknown): value is ExecutionStatus => ["idle", "running", "paused", "failed", "stopped", "rolled-back", "approval-held", "completed"].includes(String(value))
const isStageStatus = (value: unknown): value is ExecutionStageStatus => value === "queued" || value === "running" || value === "passed" || value === "failed"

function validPlanRef(planRef: PlanArtifactRef) {
	return planRef.version === 1 && planRef.approvedByRole === "owner" && planRef.authority.boundedTo === "execute-input" && planRef.unresolvedGapIds.length === 0 && planRef.sourceIds.length > 0
}

function event(type: string, label: string, correlationId: string, stageId: string | null): ExecutionEvent {
	return { id: `${type}:${correlationId}`, type, label, stageId, createdAt: now(), correlationId: correlationId.slice(0, 160), environment: "local-simulation", evidenceClass: "simulated" }
}

function createRun(planRef: PlanArtifactRef, role: ExecutionRole): ExecutionRun {
	return {
		id: `run-${planRef.id}`,
		projectId: planRef.projectId,
		projectName: planRef.projectName,
		planRef,
		role,
		status: "idle",
		revision: 1,
		activeStageId: null,
		stages: STAGES.map((stage) => ({ ...stage, status: "queued" })),
		events: [event("plan.ingested", `Approved Plan v${planRef.artifactVersion} accepted as read-only input.`, `ingest-${planRef.id}`, null)],
		idempotencyKeys: [],
		resultRef: null,
		notice: null,
	}
}

export function createInitialExecuteSlice(): ExecuteSlice {
	return { version: 1, activeRunId: null, runs: [] }
}

function activeRun(state: ExecuteSlice) {
	return state.runs.find((run) => run.id === state.activeRunId) ?? null
}

function updateActive(state: ExecuteSlice, update: (run: ExecutionRun) => ExecutionRun): ExecuteSlice {
	return { ...state, runs: state.runs.map((run) => run.id === state.activeRunId ? update(run) : run) }
}

function apply(run: ExecutionRun, command: CommandMeta, type: string, label: string, patch: Partial<ExecutionRun>): ExecutionRun {
	return {
		...run,
		...patch,
		revision: run.revision + 1,
		idempotencyKeys: [...run.idempotencyKeys, command.idempotencyKey].slice(-IDEMPOTENCY_LIMIT),
		events: [...run.events, event(type, label, command.correlationId, patch.activeStageId === undefined ? run.activeStageId : patch.activeStageId)].slice(-EVENT_LIMIT),
		notice: null,
	}
}

function denied(run: ExecutionRun, message: string) {
	return { ...run, notice: message }
}

export function executeReducer(state: ExecuteSlice, command: ExecutionCommand): ExecuteSlice {
	if (command.type === "plan/ingested") {
		if (!validPlanRef(command.planRef)) return state
		const id = `run-${command.planRef.id}`
		const exact = state.runs.find((run) => run.id === id)
		if (exact) return { ...state, activeRunId: id, runs: state.runs.map((run) => run.id === id ? { ...run, role: command.actorRole } : run) }
		const projectRun = state.runs.find((run) => run.projectId === command.planRef.projectId)
		if (projectRun && command.actorRole === "viewer") return { ...state, activeRunId: projectRun.id, runs: state.runs.map((run) => run.id === projectRun.id ? denied({ ...run, role: "viewer" }, "Viewer access cannot replace this run's approved Plan input.") : run) }
		const next = createRun(command.planRef, command.actorRole)
		return { version: 1, activeRunId: next.id, runs: [...state.runs.filter((run) => run.projectId !== next.projectId), next].slice(-100) }
	}
	if (command.type === "notice/cleared") return updateActive(state, (run) => ({ ...run, notice: null }))
	const run = activeRun(state)
	if (!run) return state
	if (command.actorRole !== run.role || run.role === "viewer") return updateActive(state, (item) => denied(item, "This run is read-only for your project role."))
	if (command.idempotencyKey.length > 160 || command.correlationId.length > 160 || run.idempotencyKeys.includes(command.idempotencyKey)) return state
	if (command.expectedRevision !== run.revision) return updateActive(state, (item) => denied(item, `This command targeted run revision ${command.expectedRevision}; revision ${item.revision} is current.`))
	const stageIndex = run.stages.findIndex((stage) => stage.id === run.activeStageId)
	const currentStage = run.stages[stageIndex]
	const operational = run.role === "owner" || run.role === "member"

	return updateActive(state, (item) => {
		switch (command.type) {
			case "run/started": {
				if (!operational || !["idle", "stopped", "rolled-back"].includes(item.status)) return denied(item, "This run cannot start from its current state.")
				const stages = item.stages.map((stage, index) => ({ ...stage, status: index === 0 ? "running" as const : "queued" as const }))
				return apply(item, command, "run.started", "Local simulation started; no provider or deployment effect occurred.", { status: "running", stages, activeStageId: stages[0].id, resultRef: null })
			}
			case "run/paused": return item.status === "running" ? apply(item, command, "run.paused", "Run paused after the current safe boundary.", { status: "paused" }) : denied(item, "Only a running simulation can be paused.")
			case "run/resumed": return item.status === "paused" ? apply(item, command, "run.resumed", "Run resumed inside the approved Plan boundary.", { status: "running" }) : denied(item, "Only a paused simulation can resume.")
			case "run/stopped": return item.role === "owner" && ["running", "paused"].includes(item.status) ? apply(item, command, "run.stopped", "Run stopped; current evidence and Plan input were preserved.", { status: "stopped" }) : denied(item, "Only the project owner can stop an active run.")
			case "run/failed": {
				if (item.status !== "running" || !currentStage) return denied(item, "Only a running stage can enter the recovery simulation.")
				const stages = item.stages.map((stage) => stage.id === currentStage.id ? { ...stage, status: "failed" as const } : stage)
				return apply(item, command, "run.failed", `${currentStage.title} failed in the local simulation.`, { status: "failed", stages })
			}
			case "run/retried": {
				if (item.status !== "failed" || !currentStage) return denied(item, "Retry is available only for a failed stage.")
				const stages = item.stages.map((stage) => stage.id === currentStage.id ? { ...stage, status: "running" as const } : stage)
				return apply(item, command, "run.retried", `${currentStage.title} retry started with prior evidence preserved.`, { status: "running", stages })
			}
			case "run/rolled-back": {
				if (item.role !== "owner" || !["failed", "stopped"].includes(item.status)) return denied(item, "Rollback requires an owner and a failed or stopped run.")
				const stages = item.stages.map((stage) => ({ ...stage, status: "queued" as const }))
				return apply(item, command, "run.rolled-back", "Simulation rolled back to the approved Plan input; no external environment changed.", { status: "rolled-back", stages, activeStageId: null })
			}
			case "run/advanced": {
				if (item.status !== "running" || !currentStage || command.operationId !== `${item.id}:${currentStage.id}:${item.revision}`) return item
				const next = item.stages[stageIndex + 1]
				const stages = item.stages.map((stage, index) => index === stageIndex ? { ...stage, status: "passed" as const } : index === stageIndex + 1 ? { ...stage, status: "running" as const } : stage)
				return apply(item, command, "stage.completed", `${currentStage.title} produced simulated evidence.`, { status: next ? "running" : "approval-held", stages, activeStageId: next?.id ?? null })
			}
			case "run/steered": {
				const instruction = command.text.trim()
				return ["running", "paused"].includes(item.status) && instruction ? apply(item, command, "run.steered", `Direction recorded: ${instruction.slice(0, 500)}`, {}) : denied(item, "Enter a direction while the run is active or paused.")
			}
			case "run/approved": {
				if (item.role !== "owner" || item.status !== "approval-held") return denied(item, "Only the project owner can approve a completed simulation.")
				const completedAt = now()
				const resultRef: ExecutionResultRef = { version: 1, id: `result-${item.id}-r${item.revision + 1}`, runId: item.id, planArtifactId: item.planRef.artifactId, planArtifactVersion: item.planRef.artifactVersion, projectId: item.projectId, completedAt, environment: "local-simulation", evidenceClass: "simulated" }
				return apply(item, command, "run.approved", "Simulated result approved for downstream demonstration use.", { status: "completed", resultRef })
			}
			default: return item
		}
	})
}

export function selectActiveExecution(state: ExecuteSlice) {
	return activeRun(state)
}

export function selectExecutionEvents(run: ExecutionRun, limit = MOUNT_LIMIT) {
	const items = run.events.slice(-Math.min(Math.max(limit, 1), MOUNT_LIMIT)).reverse()
	return { items, total: run.events.length, mounted: items.length, omitted: Math.max(run.events.length - items.length, 0) }
}

function parsePlanRef(value: unknown): PlanArtifactRef | null {
	if (!isRecord(value) || value.version !== 1 || value.approvedByRole !== "owner" || !isRecord(value.authority) || value.authority.boundedTo !== "execute-input") return null
	const id = text(value.id, 180), artifactId = text(value.artifactId, 160), projectId = text(value.projectId, 160), projectName = text(value.projectName, 240), discoveryPackageId = text(value.discoveryPackageId, 160), approvedAt = text(value.approvedAt, 80), contentDigest = text(value.contentDigest, 160)
	if (!id || !artifactId || !projectId || !projectName || !discoveryPackageId || !approvedAt || !Number.isFinite(Date.parse(approvedAt)) || !contentDigest || !Number.isInteger(value.artifactVersion) || Number(value.artifactVersion) < 1 || !Array.isArray(value.sourceIds) || value.sourceIds.length === 0 || value.sourceIds.length > 1_000 || !Array.isArray(value.unresolvedGapIds) || value.unresolvedGapIds.length) return null
	const sourceIds = value.sourceIds.map((sourceId) => text(sourceId, 160))
	if (sourceIds.some((sourceId) => sourceId === null)) return null
	return { version: 1, id, artifactId, artifactVersion: Number(value.artifactVersion), projectId, projectName, discoveryPackageId, approvedAt, approvedByRole: "owner", sourceIds: sourceIds as string[], unresolvedGapIds: [], authority: { boundedTo: "execute-input" }, contentDigest }
}

function parseStage(value: unknown): ExecutionStage | null {
	if (!isRecord(value)) return null
	const id = text(value.id, 160), title = text(value.title, 240), detail = text(value.detail, 1_000)
	return id && title && detail !== null && Number.isInteger(value.expectedSeconds) && Number(value.expectedSeconds) > 0 && isStageStatus(value.status) ? { id, title, detail, expectedSeconds: Number(value.expectedSeconds), status: value.status } : null
}

function parseEvent(value: unknown): ExecutionEvent | null {
	if (!isRecord(value) || value.environment !== "local-simulation" || value.evidenceClass !== "simulated") return null
	const id = text(value.id, 240), type = text(value.type, 160), label = text(value.label, 800), createdAt = text(value.createdAt, 80), correlationId = text(value.correlationId, 160), stageId = value.stageId === null ? null : text(value.stageId, 160)
	return id && type && label && createdAt && Number.isFinite(Date.parse(createdAt)) && correlationId && (stageId !== null || value.stageId === null) ? { id, type, label, stageId, createdAt, correlationId, environment: "local-simulation", evidenceClass: "simulated" } : null
}

function parseRun(value: unknown): ExecutionRun | null {
	if (!isRecord(value) || !Array.isArray(value.stages) || !Array.isArray(value.events) || !Array.isArray(value.idempotencyKeys)) return null
	const id = text(value.id, 200), projectId = text(value.projectId, 160), projectName = text(value.projectName, 240), planRef = parsePlanRef(value.planRef)
	const stages = value.stages.slice(0, 20).map(parseStage), events = value.events.slice(-EVENT_LIMIT).map(parseEvent), idempotencyKeys = value.idempotencyKeys.slice(-IDEMPOTENCY_LIMIT).map((key) => text(key, 160))
	const activeStageId = value.activeStageId === null ? null : text(value.activeStageId, 160)
	if (!id || !projectId || !projectName || !planRef || planRef.projectId !== projectId || !isRole(value.role) || !isStatus(value.status) || !Number.isInteger(value.revision) || Number(value.revision) < 1 || stages.some((stage) => stage === null) || events.some((item) => item === null) || idempotencyKeys.some((key) => key === null) || activeStageId === null && value.activeStageId !== null) return null
	const resultRef = value.resultRef === null ? null : isRecord(value.resultRef) && value.resultRef.version === 1 && value.resultRef.runId === id && value.resultRef.planArtifactId === planRef.artifactId && value.resultRef.planArtifactVersion === planRef.artifactVersion && value.resultRef.projectId === projectId && value.resultRef.environment === "local-simulation" && value.resultRef.evidenceClass === "simulated" && text(value.resultRef.id, 240) && text(value.resultRef.completedAt, 80) ? value.resultRef as ExecutionResultRef : null
	if (value.resultRef !== null && resultRef === null) return null
	return { id, projectId, projectName, planRef, role: value.role, status: value.status, revision: Number(value.revision), activeStageId, stages: stages as ExecutionStage[], events: events as ExecutionEvent[], idempotencyKeys: idempotencyKeys as string[], resultRef, notice: value.notice === null ? null : text(value.notice, 500) }
}

export const executeStateCodec: StateCodec<ExecuteSlice> = {
	parse(value) {
		if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.runs)) return null
		const runs = value.runs.slice(-100).map(parseRun)
		if (runs.some((run) => run === null)) return null
		const activeRunId = value.activeRunId === null ? null : text(value.activeRunId, 200)
		if (activeRunId === null && value.activeRunId !== null) return null
		const parsedRuns = runs as ExecutionRun[]
		return { version: 1, activeRunId: activeRunId && parsedRuns.some((run) => run.id === activeRunId) ? activeRunId : parsedRuns[0]?.id ?? null, runs: parsedRuns }
	},
}
