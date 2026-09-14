import {
	deriveAgentixAttention,
	runEvents,
	type OperationCommand,
	type OperationsState,
	persistOperations,
	readOperations,
	updateRun,
} from "@/features/agentix/prototype/operationsState"

import type { AgentixAttention, MaxionModuleId, PortalProject } from "./contracts"
import { demoStateRepository, type StateCodec } from "./persistence/DemoStateRepository"

const ADMINISTRATION_SLICE = "administration"
const ADMINISTRATION_MAX_BYTES = 220_000
const MAX_ADMIN_RECORDS = 10_000
const MAX_MOUNTED_ADMIN_RECORDS = 100

export type UserPreference = {
	workspaceName: string
	timeZone: "America/New_York" | "America/Los_Angeles" | "Europe/London"
	digestHour: "08:00" | "09:00" | "17:00"
	agentNotifications: boolean
	weeklyBrief: boolean
}

export type IntegrationHealth = "healthy" | "degraded" | "disconnected" | "testing"
export type IntegrationDescriptor = {
	id: string
	name: string
	principal: string
	provider: "Nango" | "Merge" | "Native"
	projectId: string
	scopes: string[]
	health: IntegrationHealth
	expiresAt: string | null
	failureBehavior: string
}

export type AdministrativeApproval = {
	id: string
	runId: string
	projectId: string
	object: string
	objectVersion: number
	ownerModule: "agentix"
	status: "pending" | "stale" | "denied"
	due: string
	consequence: string
	evidence: string[]
	principal: string
}

export type UsageRecord = {
	id: string
	projectId: string
	module: "Agentix" | "Execute" | "Discover + Plan" | "Consult MAX"
	units: number
	occurredAt: string
}

export type HelpResult = {
	id: string
	title: string
	outcome: string
	minutes: number
	module: MaxionModuleId
	steps: string[]
}

export type AdministrationState = {
	version: 1
	preferences: UserPreference
	usageAlertThreshold: number
	integrationsByProject: Record<string, IntegrationDescriptor[]>
	processedCommands: string[]
	auditReceipt: string
	auditReceipts: string[]
}

export type PreferenceValidation = { value: UserPreference; errors: Partial<Record<keyof UserPreference, string>> }

const DEFAULT_PREFERENCES: UserPreference = {
	workspaceName: "Northwind Group",
	timeZone: "America/New_York",
	digestHour: "08:00",
	agentNotifications: true,
	weeklyBrief: true,
}

const INTEGRATION_FIXTURES: Omit<IntegrationDescriptor, "projectId">[] = [
	{ id: "salesforce", name: "Salesforce", principal: "maya.chen@northwind.example", provider: "Nango", scopes: ["Accounts read", "Opportunities write"], health: "healthy", expiresAt: null, failureBehavior: "Writes pause; current project evidence remains readable." },
	{ id: "slack", name: "Slack", principal: "ops@northwind.example", provider: "Nango", scopes: ["12 approved channels", "Messages draft only"], health: "degraded", expiresAt: "15 September at 17:00", failureBehavior: "No sends; hand off to Maya Chen." },
	{ id: "snowflake", name: "Snowflake", principal: "finance_ops role", provider: "Native", scopes: ["Reconciliation tables read only"], health: "healthy", expiresAt: null, failureBehavior: "Queries stop; no cached result becomes authoritative." },
	{ id: "drive", name: "Google Drive", principal: "alex.morgan@northwind.example", provider: "Merge", scopes: ["Approved folders read"], health: "healthy", expiresAt: null, failureBehavior: "Source reads pause; attached evidence stays visible." },
]

const HELP_RESULTS: HelpResult[] = [
	{ id: "approval", title: "Review an Agentix approval", outcome: "Exact object, version, consequence, evidence, and expiry", minutes: 4, module: "approvals", steps: ["Open the assigned approval", "Review object, evidence, authority, and expiry", "Approve, amend, or reject", "Return to Agentix with context intact"] },
	{ id: "integration", title: "Reconnect an integration", outcome: "Preserve work, then verify principal and scopes", minutes: 3, module: "integrations", steps: ["Select the degraded connection", "Confirm the existing principal and scope", "Reconnect without widening authority", "Run a scoped health check"] },
	{ id: "execute", title: "Recover an Execute step", outcome: "Keep the safe result and retry only the failed step", minutes: 5, module: "execute", steps: ["Open the failed verification", "Keep completed checks", "Retry the failed step", "Confirm source read-back"] },
	{ id: "usage", title: "Understand workspace units", outcome: "Trace units by module and project; set a warning", minutes: 2, module: "usage", steps: ["Review current capacity", "Open the highest-use module", "Inspect bounded records", "Set a warning threshold"] },
]

const clean = (value: string, max: number) => value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, max)
const validProjectId = (value: string) => /^[a-z0-9][a-z0-9-]{0,119}$/.test(value)
const commandAllowed = (commands: readonly string[], commandId: string) => commandId.length > 0 && commandId.length <= 160 && !commands.includes(commandId)

export function validatePreferences(input: UserPreference): PreferenceValidation {
	const workspaceName = clean(input.workspaceName, 80)
	const errors: PreferenceValidation["errors"] = {}
	if (workspaceName.length < 2) errors.workspaceName = "Use at least 2 characters for the workspace name."
	return { value: { ...input, workspaceName }, errors }
}

function createInitialAdministrationState(): AdministrationState {
	const auditReceipt = "CFG-2094 · Root Admin · 2 minutes ago"
	return { version: 1, preferences: DEFAULT_PREFERENCES, usageAlertThreshold: 80, integrationsByProject: {}, processedCommands: [], auditReceipt, auditReceipts: [auditReceipt] }
}

export function selectProjectIntegrations(state: AdministrationState, projectId: string): IntegrationDescriptor[] {
	if (!validProjectId(projectId)) return []
	return state.integrationsByProject[projectId] ?? INTEGRATION_FIXTURES.map(integration => ({ ...integration, projectId }))
}

export function savePreferences(state: AdministrationState, draft: UserPreference, commandId: string, fail = false) {
	if (!commandAllowed(state.processedCommands, commandId)) return { state, result: "duplicate" as const, validation: validatePreferences(draft) }
	const validation = validatePreferences(draft)
	if (Object.keys(validation.errors).length) return { state, result: "invalid" as const, validation }
	if (fail) return { state, result: "failed" as const, validation }
	const auditReceipt = `CFG-${commandId.slice(-4).toUpperCase()} · Root Admin · just now`
	return {
		state: { ...state, preferences: validation.value, processedCommands: [...state.processedCommands, commandId].slice(-1_000), auditReceipt, auditReceipts: [...state.auditReceipts, auditReceipt].slice(-1_000) },
		result: "saved" as const,
		validation,
	}
}

export function updateIntegration(
	state: AdministrationState,
	projectId: string,
	actorRole: PortalProject["role"] | undefined,
	integrationId: string,
	action: "test" | "reconnect" | "disconnect",
	commandId: string,
) {
	if (actorRole !== "Owner" || !validProjectId(projectId) || !commandAllowed(state.processedCommands, commandId)) return state
	const current = selectProjectIntegrations(state, projectId)
	if (!current.some(item => item.id === integrationId && item.projectId === projectId)) return state
	const next = current.map(item => item.id !== integrationId ? item : action === "disconnect"
		? { ...item, health: "disconnected" as const }
		: action === "test" && item.health === "degraded"
			? item
			: { ...item, health: "healthy" as const, expiresAt: null })
	const auditReceipt = `INT-${commandId.slice(-4).toUpperCase()} · Root Admin · ${action} ${integrationId} · ${projectId} · just now`
	return { ...state, integrationsByProject: { ...state.integrationsByProject, [projectId]: next }, processedCommands: [...state.processedCommands, commandId].slice(-1_000), auditReceipt, auditReceipts: [...state.auditReceipts, auditReceipt].slice(-1_000) }
}

export function selectAdministrativeApprovals(operations: OperationsState, project: PortalProject | null): AdministrativeApproval[] {
	if (!project || project.role !== "Owner" || operations.role !== "owner" || operations.projectId !== project.id) return []
	return operations.runs
		.filter(run => run.phase === "approval")
		.slice(0, MAX_MOUNTED_ADMIN_RECORDS)
		.map(run => {
			const events = runEvents(run)
			const completedSteps = events.filter(event => event.status === "done").length
			return {
			id: `approval:${run.reference}`,
			runId: run.id,
			projectId: project.id,
			object: run.reference,
			objectVersion: run.approvalVersion,
			ownerModule: "agentix",
			status: run.approvalVersion === operations.agents[run.agentId].version ? "pending" : "stale",
			due: "Today at 17:00",
			consequence: run.reference === "INV-20841" ? "Approve a $240 price variance for 120 units. Payment release and recipient changes remain excluded." : run.title,
			evidence: [`${completedSteps} of ${events.length} workflow steps complete`, `${run.writes} external writes dispatched`, run.notes.at(-1) ?? "No operator note attached"],
			principal: "Root Admin · project owner",
			}
		})
}

export function saveUsageAlert(state: AdministrationState, threshold: number, commandId: string) {
	if (!commandAllowed(state.processedCommands, commandId)) return { state, result: "duplicate" as const }
	if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100) return { state, result: "invalid" as const }
	const auditReceipt = `USG-${commandId.slice(-4).toUpperCase()} · Root Admin · alert ${threshold}% · just now`
	return {
		state: { ...state, usageAlertThreshold: threshold, processedCommands: [...state.processedCommands, commandId].slice(-1_000), auditReceipt, auditReceipts: [...state.auditReceipts, auditReceipt].slice(-1_000) },
		result: "saved" as const,
	}
}

export function decideAdministrativeApproval(
	operations: OperationsState,
	approval: AdministrativeApproval,
	decision: "approve" | "amend" | "reject" | "refresh",
	commandId: string,
	note = "",
) {
	if (approval.projectId !== operations.projectId || !commandAllowed(operations.processedCommands, commandId)) return operations
	const command: OperationCommand = { id: commandId, expectedDeploymentVersion: decision === "refresh" ? operations.agents.invoice.version : approval.objectVersion }
	return updateRun(operations, approval.runId, decision === "reject" ? "decline" : decision === "refresh" ? "refresh-approval" : decision, note, command)
}

export function readApprovalOperations(project: PortalProject | null) {
	return readOperations(project?.id, project?.role === "Owner" ? "owner" : project?.role === "Member" ? "member" : "viewer")
}

export function persistApprovalOperations(state: OperationsState): AgentixAttention {
	persistOperations(state)
	return deriveAgentixAttention(state)
}

export function buildUsageRecords(projectId: string, count = MAX_ADMIN_RECORDS): UsageRecord[] {
	if (!validProjectId(projectId)) return []
	const bounded = Math.max(0, Math.min(MAX_ADMIN_RECORDS, Math.floor(count)))
	const modules: UsageRecord["module"][] = ["Agentix", "Execute", "Discover + Plan", "Consult MAX"]
	return Array.from({ length: bounded }, (_, index) => ({
		id: `${projectId}:usage:${index}`,
		projectId,
		module: modules[index % modules.length],
		units: 8 + index % 83,
		occurredAt: `2026-09-${String(1 + index % 14).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:00:00Z`,
	}))
}

export function selectUsageWindow(records: readonly UsageRecord[], projectId: string, offset = 0, limit = 25) {
	const safeLimit = Math.max(1, Math.min(MAX_MOUNTED_ADMIN_RECORDS, Math.floor(limit)))
	const scoped = records.filter(record => record.projectId === projectId).slice(0, MAX_ADMIN_RECORDS)
	const safeOffset = Math.max(0, Math.min(Math.floor(offset), Math.max(0, scoped.length - 1)))
	return { records: scoped.slice(safeOffset, safeOffset + safeLimit), total: scoped.length, offset: safeOffset, mounted: Math.min(safeLimit, scoped.length - safeOffset) }
}

export function searchHelpResults(query: string, currentModule?: MaxionModuleId) {
	const normalized = clean(query, 240).toLowerCase()
	const terms = normalized.split(/\s+/).filter(term => term.length > 2 && !["the", "how", "does", "with", "this", "that"].includes(term))
	const ranked = HELP_RESULTS.map(result => ({
		result,
		score: result.module === currentModule ? 0 : !normalized ? 1 : terms.some(term => `${result.module} ${result.title} ${result.outcome} ${result.steps.join(" ")}`.toLowerCase().includes(term)) ? 1 : 2,
	})).filter(item => !normalized || item.score < 2).sort((a, b) => a.score - b.score)
	return ranked.map(item => item.result).slice(0, 4)
}

const bounded = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max
const isPreference = (value: unknown): value is UserPreference => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false
	const item = value as Partial<UserPreference>
	return bounded(item.workspaceName, 80) && ["America/New_York", "America/Los_Angeles", "Europe/London"].includes(item.timeZone ?? "") && ["08:00", "09:00", "17:00"].includes(item.digestHour ?? "") && typeof item.agentNotifications === "boolean" && typeof item.weeklyBrief === "boolean"
}

const administrationCodec: StateCodec<AdministrationState> = { parse: raw => {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
	const value = raw as Partial<AdministrationState>
	if (value.version !== 1 || !isPreference(value.preferences) || !Number.isInteger(value.usageAlertThreshold) || (value.usageAlertThreshold ?? 0) < 1 || (value.usageAlertThreshold ?? 0) > 100 || !value.integrationsByProject || typeof value.integrationsByProject !== "object" || Array.isArray(value.integrationsByProject) || !Array.isArray(value.processedCommands) || value.processedCommands.length > 1_000 || !bounded(value.auditReceipt, 240) || !Array.isArray(value.auditReceipts) || value.auditReceipts.length > 1_000 || value.auditReceipts.some(receipt => !bounded(receipt, 240))) return null
	if (value.processedCommands.some(command => !bounded(command, 160))) return null
	const entries = Object.entries(value.integrationsByProject)
	if (entries.length > 120 || entries.some(([projectId, integrations]) => !validProjectId(projectId) || !Array.isArray(integrations) || integrations.length > 40 || integrations.some(item => !item || item.projectId !== projectId || !bounded(item.id, 120) || !bounded(item.name, 120) || !bounded(item.principal, 200) || !["Nango", "Merge", "Native"].includes(item.provider) || !Array.isArray(item.scopes) || item.scopes.length > 20 || item.scopes.some(scope => !bounded(scope, 160)) || !["healthy", "degraded", "disconnected", "testing"].includes(item.health) || item.expiresAt !== null && !bounded(item.expiresAt, 120) || !bounded(item.failureBehavior, 300)))) return null
	return value as AdministrationState
} }

export function readAdministrationState() {
	return demoStateRepository.load(ADMINISTRATION_SLICE, administrationCodec, createInitialAdministrationState, ADMINISTRATION_MAX_BYTES).value
}

export function persistAdministrationState(state: AdministrationState) {
	return demoStateRepository.save(ADMINISTRATION_SLICE, state, ADMINISTRATION_MAX_BYTES).ok
}
