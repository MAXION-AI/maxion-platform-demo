import { useSyncExternalStore } from "react"

import { INITIAL_PROJECTS, type PortalProject } from "./model"

/*
 * The organization and project the shell is working in. It lives in memory for the tab: a
 * protected scope is never restored from browser storage (doc 13), so a reload starts in the
 * home organization. Everything that shows customer content reads the scope from here, and the
 * shell remounts the modules on an organization change, so nothing from the old one survives.
 */
export const HOME_ORGANIZATION_ID = "northstar"

export type OrganizationMembership = { id: string; name: string; role: "Owner" | "Admin" | "Member"; owner: string }

// A consultant can belong to a client's organization too (D-010). The home organization's name
// comes from its own store, because Settings can rename it.
export const OTHER_ORGANIZATIONS: readonly OrganizationMembership[] = [
	{ id: "halden", name: "Halden Logistics", role: "Member", owner: "Ingrid Solberg" },
]

export const OTHER_ORGANIZATION_PROJECTS: Readonly<Record<string, PortalProject[]>> = {
	halden: [
		{ id: "halden-network", name: "Warehouse network review", description: "Review of the regional warehouse network and its handoffs.", status: "active", role: "Viewer", updated: "3 days ago", members: [{ initials: "IS", name: "Ingrid Solberg" }, { initials: "RA", name: "Root Admin" }] },
	],
}

type ScopeState = {
	organizationId: string
	projectId: string | null
	// New work started inside a project stays with that project.
	discoveryLinks: Readonly<Record<string, string>>
	engagementLinks: Readonly<Record<string, string>>
}

const initialScope = (): ScopeState => ({ organizationId: HOME_ORGANIZATION_ID, projectId: null, discoveryLinks: {}, engagementLinks: {} })

let scope = initialScope()
const listeners = new Set<() => void>()
const update = (next: Partial<ScopeState>) => { scope = { ...scope, ...next }; for (const listener of listeners) listener() }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

export function useScope(): ScopeState {
	return useSyncExternalStore(subscribe, () => scope, () => scope)
}
export const readScope = () => scope
export const resetScope = () => { scope = initialScope(); for (const listener of listeners) listener() }

export const organizationMembership = (id: string) => OTHER_ORGANIZATIONS.find((organization) => organization.id === id) ?? null

// A project belongs to one organization, so changing organization always clears the project.
export function switchOrganization(organizationId: string) {
	if (organizationId !== scope.organizationId) update({ organizationId, projectId: null })
}
export function selectProject(projectId: string | null) {
	update({ projectId })
}
export function linkDiscoveryToProject(recordId: string, projectId: string) {
	update({ discoveryLinks: { ...scope.discoveryLinks, [recordId]: projectId } })
}
export function linkEngagementToProject(engagementId: string, projectId: string) {
	update({ engagementLinks: { ...scope.engagementLinks, [engagementId]: projectId } })
}

const homeProject = (projectId: string) => INITIAL_PROJECTS.find((project) => project.id === projectId)

// Whether a Discovery belongs in the current project view. With no project picked, everything does.
export function discoveryInProject(state: ScopeState, record: { id: string; title: string }, project: { id: string; discovery?: string } | undefined) {
	if (!state.projectId) return true
	const linked = state.discoveryLinks[record.id]
	if (linked) return linked === state.projectId
	return (project ?? homeProject(state.projectId))?.discovery === record.title
}

export function engagementInProject(state: ScopeState, engagement: { id: string; workflowId?: string }) {
	if (!state.projectId) return true
	const linked = state.engagementLinks[engagement.id]
	if (linked) return linked === state.projectId
	return Boolean(engagement.workflowId && homeProject(state.projectId)?.agentixWorkflows?.includes(engagement.workflowId))
}
