import type { PlatformEvent, PlatformState, PortalProject } from "./contracts"
import { INITIAL_PROJECTS } from "./model"
import type { StateCodec } from "./persistence/DemoStateRepository"

export const PLATFORM_STATE_SLICE = "platform-shell"
const MAX_PERSISTED_PROJECTS = 100

type PersistedPlatformState = {
	projects: PortalProject[]
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
	if (!id || !name || description === null || !updated) return null
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
	if (!Array.isArray(state.projects) || state.projects.length > MAX_PERSISTED_PROJECTS) return null
	const projects = state.projects.map(parseProject)
	if (projects.some((project) => project === null)) return null
	if ([state.discoveryReady, state.planSent, state.executeVerified].some((item) => typeof item !== "boolean")) return null
	const planSnapshot = boundedText(state.planSnapshot, 80)
	if (!planSnapshot) return null
	return {
		projects: projects as PortalProject[],
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
		projects: persisted?.projects ?? INITIAL_PROJECTS,
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
		projects: state.projects.slice(0, MAX_PERSISTED_PROJECTS),
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

export function platformReducer(state: PlatformState, event: PlatformEvent): PlatformState {
	switch (event.type) {
		case "navigation/opened": return { ...state, navigation: { ...state.navigation, active: event.module, visited: new Set([...state.navigation.visited, event.module]) } }
		case "navigation/sidebar-collapsed": return state.navigation.sidebarCollapsed === event.collapsed ? state : { ...state, navigation: { ...state.navigation, sidebarCollapsed: event.collapsed } }
		case "projects/replaced": return { ...state, projects: event.projects.slice(0, MAX_PERSISTED_PROJECTS) }
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
export const selectProjects = (state: PlatformState) => state.projects
export const selectDiscoveryReady = (state: PlatformState) => state.handoffs.discovery.ready
export const selectPlanHandoff = (state: PlatformState) => state.handoffs.plan
export const selectExecuteVerified = (state: PlatformState) => state.handoffs.execute.verified
export const selectAgentixAttention = (state: PlatformState) => state.agentix.attention
export const selectPlatformIntents = (state: PlatformState) => state.intents
export const selectPersistenceNotice = (state: PlatformState) => state.persistenceNotice
