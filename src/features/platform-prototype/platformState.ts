import type { PlatformEvent, PlatformState, PortalProject } from "./contracts"
import { INITIAL_PROJECTS } from "./model"
import type { StateCodec } from "./persistence/DemoStateRepository"

export const PLATFORM_STATE_SLICE = "platform-shell"
export const PLATFORM_STATE_MAX_BYTES = 3_500_000
const MAX_PROJECT_RECORDS = 10_000

type PersistedPlatformState = {
	projects: PortalProject[]
	selectedProjectId: string | null
	discoveryReady: boolean
	planSent: boolean
	planSnapshot: string
	executeVerified: boolean
}

function boundedText(value: unknown, max: number) {
	return typeof value === "string" && value.length <= max ? value : null
}

function parseProject(value: unknown): PortalProject | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	const project = value as Partial<PortalProject>
	const id = boundedText(project.id, 80)
	const name = boundedText(project.name, 160)
	const description = boundedText(project.description, 2_000)
	const updated = boundedText(project.updated, 80)
	if (!id?.trim() || !name?.trim() || description === null || !updated?.trim()) return null
	if (project.status !== "active" && project.status !== "archived") return null
	if (project.role !== "Owner" && project.role !== "Member" && project.role !== "Viewer") return null
	if (!Array.isArray(project.members) || project.members.length > 100) return null
	const members = project.members.map((member) => {
		const initials = boundedText(member?.initials, 8)
		const memberName = boundedText(member?.name, 160)
		return initials && memberName ? { initials, name: memberName } : null
	})
	if (members.some((member) => member === null)) return null
	const plan = project.plan === undefined ? undefined : boundedText(project.plan, 240)
	const discovery = project.discovery === undefined ? undefined : boundedText(project.discovery, 240)
	if (plan === null || discovery === null) return null
	return { id, name, description, status: project.status, role: project.role, updated, plan, discovery, members: members as PortalProject["members"] }
}

function parsePersistedState(value: unknown): PersistedPlatformState | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	const state = value as Partial<PersistedPlatformState>
	if (!Array.isArray(state.projects) || state.projects.length > MAX_PROJECT_RECORDS) return null
	const projects = state.projects.map(parseProject)
	if (projects.some((project) => project === null)) return null
	const typedProjects = projects as PortalProject[]
	if (new Set(typedProjects.map((project) => project.id)).size !== typedProjects.length) return null
	if ([state.discoveryReady, state.planSent, state.executeVerified].some((item) => typeof item !== "boolean")) return null
	const planSnapshot = boundedText(state.planSnapshot, 80)
	if (!planSnapshot) return null
	const selectedProjectId = state.selectedProjectId === undefined || state.selectedProjectId === null
		? null
		: boundedText(state.selectedProjectId, 80)
	if (selectedProjectId === null && state.selectedProjectId !== undefined && state.selectedProjectId !== null) return null
	if (selectedProjectId && !typedProjects.some((project) => project.id === selectedProjectId)) return null
	return {
		projects: typedProjects,
		selectedProjectId,
		discoveryReady: state.discoveryReady as boolean,
		planSent: state.planSent as boolean,
		planSnapshot,
		executeVerified: state.executeVerified as boolean,
	}
}

export const persistedPlatformStateCodec: StateCodec<PersistedPlatformState> = {
	parse: parsePersistedState,
	migrate: (version, value) => version === 0 ? parsePersistedState(value) : null,
}

export function createInitialPlatformState(active: PlatformState["navigation"]["active"], persisted?: PersistedPlatformState, persistenceNotice: string | null = null): PlatformState {
	return {
		navigation: { active, sidebarCollapsed: false, visited: new Set([active]) },
		projects: {
			records: persisted?.projects ?? INITIAL_PROJECTS,
			selectedId: persisted?.selectedProjectId ?? INITIAL_PROJECTS[0]?.id ?? null,
			status: "ready",
			error: null,
			notice: null,
		},
		handoffs: {
			discovery: { ready: persisted?.discoveryReady ?? false, evidence: [], decisions: [], progress: { completed: 0, total: 1, status: persisted?.discoveryReady ? "verified" : "idle" } },
			plan: { sent: persisted?.planSent ?? false, snapshot: persisted?.planSnapshot ?? "v12" },
			execute: { verified: persisted?.executeVerified ?? false, environment: "development" },
		},
		agentix: { attention: { count: 0, audience: false, approval: false } },
		intents: { discoverySetupSignal: 0, operationalDiscovery: null, planJump: null, executeJump: null, discoveryOpen: null, agentixIntent: null, nextTick: 0 },
		persistenceNotice,
	}
}

export function selectPersistedPlatformState(state: Pick<PlatformState, "projects" | "handoffs">): PersistedPlatformState {
	return {
		projects: [...state.projects.records],
		selectedProjectId: state.projects.records.some((project) => project.id === state.projects.selectedId) ? state.projects.selectedId : null,
		discoveryReady: state.handoffs.discovery.ready,
		planSent: state.handoffs.plan.sent,
		planSnapshot: state.handoffs.plan.snapshot,
		executeVerified: state.handoffs.execute.verified,
	}
}

function withIntentTick(state: PlatformState) {
	const tick = state.intents.nextTick + 1
	return { tick, intents: { ...state.intents, nextTick: tick } }
}

function assertNever(event: never): never {
	throw new Error(`Unhandled platform event: ${JSON.stringify(event)}`)
}

const PROJECT_NAME_LIMIT = 80
const PROJECT_DESCRIPTION_LIMIT = 600
const MAX_MOUNTED_PROJECT_ROWS = 200

export type ProjectAttention = "needs-you" | "on-track" | "complete" | "view-only"
export type ProjectPortfolioFilter = "all" | "attention" | "active" | "archived"
export type ProjectPortfolioSort = "updated" | "name"
export type ProjectPortfolioQuery = { query: string; filter: ProjectPortfolioFilter; sort: ProjectPortfolioSort; limit?: number }
export type ProjectPortfolioResult = { items: PortalProject[]; total: number; mounted: number; omitted: number }

export function selectProjectAttention(project: PortalProject): ProjectAttention {
	if (project.status === "archived") return "complete"
	if (project.role === "Viewer") return "view-only"
	return !project.discovery || !project.plan ? "needs-you" : "on-track"
}

export function selectProjectPortfolio(projects: readonly PortalProject[], options: ProjectPortfolioQuery): ProjectPortfolioResult {
	const query = options.query.trim().toLocaleLowerCase()
	const seen = new Set<string>()
	const matches: PortalProject[] = []
	for (const project of projects) {
		if (!parseProject(project) || seen.has(project.id)) continue
		seen.add(project.id)
		const attention = selectProjectAttention(project)
		if (options.filter === "attention" && attention !== "needs-you") continue
		if (options.filter === "active" && project.status !== "active") continue
		if (options.filter === "archived" && project.status !== "archived") continue
		if (query) {
			const searchable = [project.name, project.description, project.plan, project.discovery, ...project.members.map((member) => member.name)]
				.filter(Boolean)
				.join(" ")
				.toLocaleLowerCase()
			if (!searchable.includes(query)) continue
		}
		matches.push(project)
	}
	if (options.sort === "name") matches.sort((left, right) => left.name.localeCompare(right.name))
	const limit = Math.min(Math.max(options.limit ?? MAX_MOUNTED_PROJECT_ROWS, 1), MAX_MOUNTED_PROJECT_ROWS)
	const items = matches.slice(0, limit)
	return { items, total: matches.length, mounted: items.length, omitted: Math.max(matches.length - items.length, 0) }
}

export function selectDashboardSummary(state: PlatformState) {
	const activeProjects = state.projects.records.filter((project) => project.status === "active")
	const projectAttention = activeProjects.filter((project) => selectProjectAttention(project) === "needs-you")
	const verifiedHandoffs = Number(state.handoffs.discovery.ready) + Number(state.handoffs.plan.sent) + Number(state.handoffs.execute.verified)
	const completedProjects = state.projects.records.filter((project) => project.status === "archived")
	return {
		activeProjects: activeProjects.length,
		attentionCount: projectAttention.length + state.agentix.attention.count,
		verifiedHandoffs,
		linkedProjects: activeProjects.filter((project) => project.discovery && project.plan).length,
		projectAttention: projectAttention.slice(0, 3),
		completedProjects: completedProjects.slice(0, 4),
	}
}

function projectNotice(state: PlatformState, notice: string): PlatformState {
	return { ...state, projects: { ...state.projects, notice } }
}

function projectIndex(state: PlatformState, projectId: string) {
	return state.projects.records.findIndex((project) => project.id === projectId)
}

export function platformReducer(state: PlatformState, event: PlatformEvent): PlatformState {
	switch (event.type) {
		case "navigation/opened": return { ...state, navigation: { ...state.navigation, active: event.module, visited: new Set([...state.navigation.visited, event.module]) } }
		case "navigation/sidebar-collapsed": return state.navigation.sidebarCollapsed === event.collapsed ? state : { ...state, navigation: { ...state.navigation, sidebarCollapsed: event.collapsed } }
		case "projects/created": {
			const name = event.name.trim()
			const description = event.description.trim()
			if (!name || name.length > PROJECT_NAME_LIMIT || description.length > PROJECT_DESCRIPTION_LIMIT) {
				return projectNotice(state, `Project names must be 1–${PROJECT_NAME_LIMIT} characters and descriptions at most ${PROJECT_DESCRIPTION_LIMIT}.`)
			}
			const slug = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "project"
			const requestId = event.requestId.replace(/[^a-zA-Z0-9]/g, "").slice(-20)
			if (!requestId) return projectNotice(state, "The project request was malformed. Review the draft and try again.")
			const id = `${slug}-${requestId}`.slice(0, 80)
			if (state.projects.records.some((project) => project.id === id)) return projectNotice(state, "This project request was already applied. No duplicate was created.")
			if (state.projects.records.length >= MAX_PROJECT_RECORDS) return projectNotice(state, `This workspace already contains the maximum of ${MAX_PROJECT_RECORDS.toLocaleString("en-US")} projects. Archive or remove a project before creating another.`)
			const project: PortalProject = {
				id,
				name,
				description: description || "Outcome and operating context are ready to define with MAX.",
				status: "active",
				role: "Owner",
				updated: "Just now",
				members: [{ initials: "RA", name: "Root Admin" }],
			}
			return { ...state, projects: { records: [project, ...state.projects.records], selectedId: id, status: "ready", error: null, notice: `${name} created.` } }
		}
		case "projects/selected": {
			if (event.projectId === null) return { ...state, projects: { ...state.projects, selectedId: null, notice: null } }
			if (projectIndex(state, event.projectId) < 0) return projectNotice(state, "That project is no longer available. Choose another project or retry the portfolio.")
			return { ...state, projects: { ...state.projects, selectedId: event.projectId, notice: null } }
		}
		case "projects/archive-toggled": {
			const index = projectIndex(state, event.projectId)
			if (index < 0) return projectNotice(state, "That project is no longer available.")
			const project = state.projects.records[index]
			if (project.role !== "Owner") return projectNotice(state, `Only a project owner can change ${project.name}'s lifecycle. Your ${project.role} access remains read-only.`)
			const records = state.projects.records.map((item, itemIndex) => itemIndex === index ? { ...item, status: item.status === "active" ? "archived" as const : "active" as const, updated: "Just now" } : item)
			return { ...state, projects: { ...state.projects, records, notice: `${project.name} ${project.status === "active" ? "archived" : "restored"}.` } }
		}
		case "projects/member-added": {
			const index = projectIndex(state, event.projectId)
			if (index < 0) return projectNotice(state, "That project is no longer available.")
			const project = state.projects.records[index]
			const name = event.name.trim()
			if (project.role !== "Owner") return projectNotice(state, `Only a project owner can add members to ${project.name}.`)
			if (!name || name.length > 60) return projectNotice(state, "Enter a member name between 1 and 60 characters.")
			if (project.members.some((member) => member.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return projectNotice(state, `${name} is already a member of ${project.name}.`)
			const initials = (name.split(/\s+/).map((part) => part[0] ?? "").join("") || name).slice(0, 2).toUpperCase()
			const records = state.projects.records.map((item, itemIndex) => itemIndex === index ? { ...item, members: [...item.members, { initials, name }], updated: "Just now" } : item)
			return { ...state, projects: { ...state.projects, records, notice: `${name} added to ${project.name}.` } }
		}
		case "projects/load-started": return { ...state, projects: { ...state.projects, status: "loading", error: null, notice: null } }
		case "projects/load-failed": return { ...state, projects: { ...state.projects, status: "error", error: boundedText(event.message, 240) ?? "Projects could not be loaded. Your saved work remains untouched.", notice: null } }
		case "projects/retry-requested": return { ...state, projects: { ...state.projects, status: "ready", error: null, notice: "Projects restored from the last safe local snapshot." } }
		case "projects/action-denied": {
			const project = state.projects.records.find((item) => item.id === event.projectId)
			return projectNotice(state, project ? `${event.action} isn't available with Viewer access to ${project.name}. Ask a project owner for Member access.` : "That project is no longer available.")
		}
		case "projects/notice-cleared": return state.projects.notice ? { ...state, projects: { ...state.projects, notice: null } } : state
		case "discovery/ready": return state.handoffs.discovery.ready ? state : { ...state, handoffs: { ...state.handoffs, discovery: { ...state.handoffs.discovery, ready: true, progress: { completed: 1, total: 1, status: "verified" } } } }
		case "discovery/setup-started": return { ...state, intents: { ...state.intents, operationalDiscovery: null, discoverySetupSignal: state.intents.discoverySetupSignal + 1 } }
		case "discovery/record-opened": {
			const next = withIntentTick(state)
			return { ...state, intents: { ...next.intents, operationalDiscovery: null, discoveryOpen: { tick: next.tick, recordId: event.recordId, jump: event.jump } } }
		}
		case "discovery/operational-opened": return { ...state, intents: { ...state.intents, operationalDiscovery: event.workflowId } }
		case "discovery/operational-closed": return { ...state, intents: { ...state.intents, operationalDiscovery: null } }
		case "plan/artifact-opened": {
			const next = withIntentTick(state)
			return { ...state, intents: { ...next.intents, planJump: { tick: next.tick, artifactId: event.artifactId } } }
		}
		case "plan/sent": return { ...state, handoffs: { ...state.handoffs, plan: { sent: true, snapshot: event.snapshot.slice(0, 80) || state.handoffs.plan.snapshot } } }
		case "execute/workspace-opened": {
			const next = withIntentTick(state)
			return { ...state, intents: { ...next.intents, executeJump: { tick: next.tick, target: { kind: "workspace", taskId: event.taskId } } } }
		}
		case "execute/hub-opened": {
			const next = withIntentTick(state)
			return { ...state, intents: { ...next.intents, executeJump: { tick: next.tick, target: { kind: event.target } } } }
		}
		case "execute/verified": return state.handoffs.execute.verified ? state : { ...state, handoffs: { ...state.handoffs, execute: { ...state.handoffs.execute, verified: true } } }
		case "agentix/attention-changed": {
			const current = state.agentix.attention
			const next = event.attention
			return current.count === next.count && current.audience === next.audience && current.approval === next.approval ? state : { ...state, agentix: { attention: next } }
		}
		case "agentix/opened": {
			const next = withIntentTick(state)
			return { ...state, intents: { ...next.intents, agentixIntent: { tick: next.tick, intent: event.intent } } }
		}
		case "persistence/failed": return state.persistenceNotice ? state : { ...state, persistenceNotice: "Browser storage is unavailable. Your work remains available in this session, but changes won't survive refresh." }
		case "persistence/notice-cleared": return { ...state, persistenceNotice: null }
		default: return assertNever(event)
	}
}

export const selectActiveModule = (state: PlatformState) => state.navigation.active
export const selectSidebarCollapsed = (state: PlatformState) => state.navigation.sidebarCollapsed
export const selectVisitedModules = (state: PlatformState) => state.navigation.visited
export const selectProjects = (state: PlatformState) => state.projects.records
export const selectProjectWorkspace = (state: PlatformState) => state.projects
export const selectSelectedProject = (state: PlatformState) => state.projects.records.find((project) => project.id === state.projects.selectedId) ?? null
export const selectDiscoveryReady = (state: PlatformState) => state.handoffs.discovery.ready
export const selectPlanHandoff = (state: PlatformState) => state.handoffs.plan
export const selectExecuteVerified = (state: PlatformState) => state.handoffs.execute.verified
export const selectAgentixAttention = (state: PlatformState) => state.agentix.attention
export const selectPlatformIntents = (state: PlatformState) => state.intents
export const selectPersistenceNotice = (state: PlatformState) => state.persistenceNotice
