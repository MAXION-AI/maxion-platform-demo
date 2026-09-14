import type { WorkflowId } from "@/features/agentix/prototype/initiatives"

import type { ExecuteWorkspaceId, MaxionModuleId, PortalProject } from "./model"

export type { MaxionModuleId, PortalProject } from "./model"

type PlatformAuthority = "viewer" | "member" | "owner" | "release-owner"
type PlatformEnvironment = "development" | "staging" | "production"

type PlatformEvidence = {
	id: string
	source: string
	verified: boolean
}

type PlatformDecision = {
	id: string
	status: "pending" | "approved" | "amended" | "rejected"
	authority: PlatformAuthority
}

type PlatformProgress = {
	completed: number
	total: number
	status: "idle" | "working" | "waiting" | "verified"
}

export type AgentixAttention = { count: number; audience: boolean; approval: boolean }
export type AgentixIntent =
	| { type: "workflow"; id: WorkflowId }
	| { type: "import"; id: WorkflowId }
	| { type: "surface"; id: "today" | "activity" }
	| { type: "decision"; id: "audience" | "approval" }
	| { type: "create" }

export type PlanJumpSignal = { tick: number; artifactId: string }
export type ExecuteJumpSignal = { tick: number; target: { kind: "workspace"; taskId: ExecuteWorkspaceId } | { kind: "approvals" | "engagements" } }
export type DiscoveryOpenSignal = { tick: number; recordId: string; jump: "resume" | "decision" | "package" }
export type AgentixIntentSignal = { tick: number; intent: AgentixIntent }

export type ProjectWorkspaceStatus = "ready" | "loading" | "error"

export type ProjectWorkspaceState = {
	records: PortalProject[]
	selectedId: string | null
	status: ProjectWorkspaceStatus
	error: string | null
	notice: string | null
}

export type PlatformState = {
	navigation: {
		active: MaxionModuleId
		sidebarCollapsed: boolean
		visited: ReadonlySet<MaxionModuleId>
	}
	projects: ProjectWorkspaceState
	handoffs: {
		discovery: { ready: boolean; evidence: PlatformEvidence[]; decisions: PlatformDecision[]; progress: PlatformProgress }
		plan: { sent: boolean; snapshot: string }
		execute: { verified: boolean; environment: PlatformEnvironment }
	}
	agentix: { attention: AgentixAttention }
	intents: {
		discoverySetupSignal: number
		operationalDiscovery: WorkflowId | null
		planJump: PlanJumpSignal | null
		executeJump: ExecuteJumpSignal | null
		discoveryOpen: DiscoveryOpenSignal | null
		agentixIntent: AgentixIntentSignal | null
		nextTick: number
	}
	persistenceNotice: string | null
}

export type PlatformEvent =
	| { type: "navigation/opened"; module: MaxionModuleId }
	| { type: "navigation/sidebar-collapsed"; collapsed: boolean }
	| { type: "projects/created"; requestId: string; name: string; description: string }
	| { type: "projects/selected"; projectId: string | null }
	| { type: "projects/archive-toggled"; projectId: string }
	| { type: "projects/member-added"; projectId: string; name: string }
	| { type: "projects/load-started" }
	| { type: "projects/load-failed"; message?: string }
	| { type: "projects/retry-requested" }
	| { type: "projects/action-denied"; projectId: string; action: string }
	| { type: "projects/notice-cleared" }
	| { type: "discovery/ready" }
	| { type: "discovery/setup-started" }
	| { type: "discovery/record-opened"; recordId: string; jump: DiscoveryOpenSignal["jump"] }
	| { type: "discovery/operational-opened"; workflowId: WorkflowId }
	| { type: "discovery/operational-closed" }
	| { type: "plan/artifact-opened"; artifactId: string }
	| { type: "plan/sent"; snapshot: string }
	| { type: "execute/workspace-opened"; taskId: ExecuteWorkspaceId }
	| { type: "execute/hub-opened"; target: "approvals" | "engagements" }
	| { type: "execute/verified" }
	| { type: "agentix/attention-changed"; attention: AgentixAttention }
	| { type: "agentix/opened"; intent: AgentixIntent }
	| { type: "persistence/failed" }
	| { type: "persistence/notice-cleared" }
