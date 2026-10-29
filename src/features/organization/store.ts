import { useSyncExternalStore } from "react"

import type { MaxionModuleId } from "@/features/platform-prototype/model"
import {
	connectorFor,
	INITIAL_CONNECTIONS,
	INITIAL_INVITATIONS,
	INITIAL_KEYS,
	INITIAL_MEMBERS,
	INITIAL_POLICY,
	initialAudit,
	ORGANIZATION,
	SEATS,
	type AuditCategory,
	type AuditEvent,
	type Connection,
	type ConnectorKey,
	type Invitation,
	type Member,
	type OperationClass,
	type OrgRole,
	type Policy,
	type ProviderKeyId,
	type ProviderKey,
} from "./model"

/*
 * One organization store for the Settings, Integrations and Knowledge pages and for the
 * connection pickers in Discovery and Agentix, so a change in one place is what every other
 * place reads. It lives in memory for the tab: each tab (and each customer demo) has its own.
 * Every mutation that the plan audits writes its metadata-only audit event in the same step.
 */

export type SectionIntent = {
	section: MaxionModuleId
	connect?: ConnectorKey
	tab?: "general" | "members" | "policy" | "keys" | "audit"
	auditCategory?: AuditCategory
	// Changes on every request, so the same intent asked for twice is consumed twice.
	tick: number
}

export type PolicyChangeStatus = { label: string; revision: number; state: "saved" | "applied" } | null

export type OrganizationState = {
	name: string
	members: Member[]
	invitations: Invitation[]
	connections: Connection[]
	policy: Policy
	policyStatus: PolicyChangeStatus
	keys: ProviderKey[]
	audit: AuditEvent[]
	// When the viewer last signed in. Privileged changes need a sign-in within 15 minutes (D-068).
	signedInAt: number
	intent: SectionIntent | null
}

const FRESH_MINUTES = 15
const initialState = (): OrganizationState => ({
	name: ORGANIZATION.name,
	members: INITIAL_MEMBERS,
	invitations: INITIAL_INVITATIONS,
	connections: INITIAL_CONNECTIONS,
	policy: INITIAL_POLICY,
	policyStatus: null,
	keys: INITIAL_KEYS,
	audit: initialAudit(),
	signedInAt: Date.now() - 6 * 60_000,
	intent: null,
})

let state = initialState()
const listeners = new Set<() => void>()
let sequence = 0
let tick = 0

const emit = () => { for (const listener of listeners) listener() }
const update = (next: Partial<OrganizationState>) => { state = { ...state, ...next }; emit() }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const audit = (category: AuditCategory, action: string, target: string, actor = "Root Admin", outcome: AuditEvent["outcome"] = "Succeeded"): AuditEvent =>
	({ id: `live-${++sequence}`, at: Date.now(), category, action, actor, target, outcome })
const withAudit = (...events: AuditEvent[]) => [...events.reverse(), ...state.audit]
const later = (ms: number, run: () => void) => { window.setTimeout(run, ms) }

export function useOrganization(): OrganizationState {
	return useSyncExternalStore(subscribe, () => state, () => state)
}
export const readOrganization = () => state

/** Tests start every case from the seed. */
export function resetOrganizationStore() { state = initialState(); sequence = 0; emit() }

// ── Navigation between modules ──────────────────────────────────────────────────────────────

export const SHELL_SECTION_EVENT = "maxion:open-section"

/* A page asks the shell for another section; the target page consumes the intent once. */
export function requestSection(intent: Omit<SectionIntent, "tick">) {
	update({ intent: { ...intent, tick: ++tick } })
	window.dispatchEvent(new CustomEvent(SHELL_SECTION_EVENT, { detail: intent.section }))
}
export function consumeIntent(intentTick: number) {
	if (state.intent?.tick === intentTick) update({ intent: null })
}

// ── Fresh sign-in ───────────────────────────────────────────────────────────────────────────

export const signedInMinutes = (now = Date.now()) => Math.max(0, Math.floor((now - state.signedInAt) / 60_000))
export const freshSignIn = (now = Date.now()) => signedInMinutes(now) < FRESH_MINUTES
export function signInAgain() {
	update({ signedInAt: Date.now(), audit: withAudit(audit("sign_ins", "Signed in again", state.name)) })
}

// ── Organization and members ────────────────────────────────────────────────────────────────

export function renameOrganization(name: string) {
	const clean = name.trim().replace(/\s+/g, " ")
	if (!clean || clean === state.name) return
	update({ name: clean, audit: withAudit(audit("settings", "Organization renamed", "Organization")) })
}

export const activeOwners = (members = state.members) => members.filter((member) => member.role === "Owner" && member.status === "active")
/* The organization always keeps one active Owner: that person can't be demoted, suspended or removed. */
export const isLastOwner = (member: Member, members = state.members) => member.role === "Owner" && member.status === "active" && activeOwners(members).length === 1
/* Seats are taken by active members; a suspended member's seat is released (IAM-3). */
export const seatsUsed = (members = state.members) => members.filter((member) => member.status === "active").length

export function changeRole(memberId: string, role: OrgRole) {
	const member = state.members.find((item) => item.id === memberId)
	if (!member || member.role === role) return
	if (isLastOwner(member)) return
	update({
		members: state.members.map((item) => item.id === memberId ? { ...item, role } : item),
		audit: withAudit(audit("membership", "Role changed", `${member.name} · ${role}`)),
	})
}

export function setMemberStatus(memberId: string, status: Member["status"]) {
	const member = state.members.find((item) => item.id === memberId)
	if (!member || member.status === status) return
	if (status === "suspended" && isLastOwner(member)) return
	if (status === "active" && seatsUsed() >= SEATS.package + SEATS.amendment) return
	update({
		members: state.members.map((item) => item.id === memberId ? { ...item, status } : item),
		audit: withAudit(audit("membership", status === "suspended" ? "Member suspended" : "Member restored", member.name)),
	})
}

export function removeMember(memberId: string) {
	const member = state.members.find((item) => item.id === memberId)
	if (!member) return
	if (isLastOwner(member)) return
	update({
		members: state.members.filter((item) => item.id !== memberId),
		audit: withAudit(audit("membership", "Member removed", member.name)),
	})
}

export function inviteMember(email: string, role: OrgRole) {
	const invitation: Invitation = { id: `inv-${++sequence}`, email: email.trim().toLowerCase(), role, invitedBy: "Root Admin", status: "pending", expiresInDays: 7, generation: 1 }
	update({ invitations: [invitation, ...state.invitations], audit: withAudit(audit("membership", "Invitation sent", `${role} invitation`)) })
	return invitation
}

export function resendInvitation(id: string) {
	const invitation = state.invitations.find((item) => item.id === id)
	if (!invitation) return
	update({
		invitations: state.invitations.map((item) => item.id === id ? { ...item, status: "pending", expiresInDays: 7, generation: item.generation + 1 } : item),
		audit: withAudit(audit("membership", "Invitation resent", `${invitation.role} invitation`)),
	})
}

export function revokeInvitation(id: string) {
	const invitation = state.invitations.find((item) => item.id === id)
	if (!invitation) return
	update({
		invitations: state.invitations.map((item) => item.id === id ? { ...item, status: "revoked" } : item),
		audit: withAudit(audit("membership", "Invitation revoked", `${invitation.role} invitation`)),
	})
}

// ── Connections ─────────────────────────────────────────────────────────────────────────────

const stateOf = (id: string) => state.connections.find((item) => item.id === id)?.state
const connectionTarget = (connection: Connection) => `${connectorFor(connection.connector).name} · ${connection.ownership}`
const patchConnection = (id: string, patch: Partial<Connection> | ((connection: Connection) => Partial<Connection>), ...events: AuditEvent[]) => {
	const connections = state.connections.map((item) => item.id === id ? { ...item, ...(typeof patch === "function" ? patch(item) : patch), revision: item.revision + 1 } : item)
	update({ connections, audit: events.length ? withAudit(...events) : state.audit })
}

/*
 * Connect: the provider's own sign-in happens away from MAXION. On return the connection is
 * verified, then waits for the person to confirm the account it came back with. It activates
 * with reads only and no projects; grants are a separate, deliberate step.
 */
export function startConnection(key: ConnectorKey): string {
	const connector = connectorFor(key)
	const id = `conn-${key}-${++sequence}`
	const connection: Connection = { id, connector: key, ownership: "personal", ownerId: "root-admin", ownerName: "Root Admin", accountLabel: `root.admin@northstar.com · ${connector.signIn}`, state: "verifying", classes: ["read"], projects: [], lastVerified: "Just now", cleanup: "none", revision: 1 }
	update({ connections: [connection, ...state.connections], audit: withAudit(audit("connections", "Connection started", `${connector.name} · personal`)) })
	// A timer only moves the connection on if it is still where the timer left it.
	later(1100, () => { if (stateOf(id) === "verifying") patchConnection(id, { state: "awaiting_confirmation", confirmMinutes: 30 }, audit("connections", "Account verified", `${connector.name} · personal`, "MAXION")) })
	return id
}

export function confirmConnection(id: string) {
	const connection = state.connections.find((item) => item.id === id)
	if (!connection || connection.state !== "awaiting_confirmation") return
	patchConnection(id, { state: "active", confirmMinutes: undefined, lastVerified: "Just now" }, audit("connections", "Connection activated", connectionTarget(connection)))
}

export function abandonConnection(id: string) {
	const connection = state.connections.find((item) => item.id === id)
	if (!connection || connection.state === "active") return
	update({ connections: state.connections.filter((item) => item.id !== id), audit: withAudit(audit("connections", "Connection cancelled; sign-in revoked", connectionTarget(connection))) })
}

/* Reconnect must return the same account; anything else is refused and nothing changes. */
export function reconnect(id: string) {
	const connection = state.connections.find((item) => item.id === id)
	if (!connection || connection.state !== "needs_reconnect") return
	patchConnection(id, { state: "verifying", reason: undefined }, audit("connections", "Reconnect started", connectionTarget(connection)))
	later(1100, () => { if (stateOf(id) === "verifying") patchConnection(id, { state: "active", lastVerified: "Just now" }, audit("connections", "Reconnected", connectionTarget(connection))) })
}

export function checkConnection(id: string, done?: () => void) {
	const connection = state.connections.find((item) => item.id === id)
	if (!connection) return
	later(700, () => { if (stateOf(id) === "active") patchConnection(id, { lastVerified: "Just now" }, audit("connections", "Connection checked", connectionTarget(connection))); done?.() })
}

export function setGrants(id: string, projects: string[]) {
	const connection = state.connections.find((item) => item.id === id)
	if (!connection) return
	const added = projects.filter((project) => !connection.projects.includes(project))
	const removed = connection.projects.filter((project) => !projects.includes(project))
	const events = [
		...(added.length ? [audit("connections", added.length === 1 ? "Project access granted" : `Project access granted to ${added.length} projects`, connectionTarget(connection))] : []),
		...(removed.length ? [audit("connections", removed.length === 1 ? "Project access revoked" : `Project access revoked from ${removed.length} projects`, connectionTarget(connection))] : []),
	]
	patchConnection(id, { projects }, ...events)
}

export function setClasses(id: string, classes: OperationClass[]) {
	const connection = state.connections.find((item) => item.id === id)
	if (!connection) return
	patchConnection(id, { classes }, audit("connections", classes.includes("write") ? "Writes allowed" : "Reads only", connectionTarget(connection)))
}

/* New use stops at once; work already sent completes; the provider-side cleanup is tracked. */
export function disconnect(id: string) {
	const connection = state.connections.find((item) => item.id === id)
	if (!connection) return
	// The verified account label goes with the connection (INT-1); only its connector and owner stay on record.
	patchConnection(id, { state: "disconnected", projects: [], accountLabel: "", cleanup: "pending" }, audit("connections", "Disconnected", connectionTarget(connection)), audit("connections", "Provider cleanup requested", connectionTarget(connection), "MAXION"))
	later(1600, () => { if (state.connections.find((item) => item.id === id)?.cleanup === "pending") patchConnection(id, { cleanup: "done" }, audit("connections", "Provider cleanup completed", connectionTarget(connection), "MAXION")) })
}

/* A connection a person can pick for new work: active, theirs, and allowed to read. */
export const selectableConnections = (connections = state.connections) =>
	connections.filter((connection) => connection.ownerId === "root-admin" && connection.state !== "disconnected")

// ── Policy ──────────────────────────────────────────────────────────────────────────────────

/*
 * Publishing stores a new customer revision with its audit event. Enforcement reports back on
 * its own; until it does the status says "Saved; enforcement not yet reported", never "applied".
 */
export function publishPolicy(label: string, change: (policy: Policy) => Policy) {
	const revision = state.policy.revision + 1
	const policy = { ...change(state.policy), revision }
	update({ policy, policyStatus: { label, revision, state: "saved" }, audit: withAudit(audit("settings", "Policy published", `${label} · revision ${revision}`)) })
	later(1400, () => { if (state.policyStatus?.revision === revision) update({ policyStatus: { label, revision, state: "applied" } }) })
}

// ── Provider keys ───────────────────────────────────────────────────────────────────────────

/* Write-only: the store keeps the last four characters and who set it, never the key. */
export function setProviderKey(provider: ProviderKeyId, last4: string) {
	const key = state.keys.find((item) => item.provider === provider)
	if (!key) return
	const replacing = Boolean(key.last4)
	update({
		keys: state.keys.map((item) => item.provider === provider ? { ...item, last4, addedBy: "Root Admin", addedAt: "Today", check: { state: "passed", at: "Just now" } } : item),
		audit: withAudit(audit("keys", replacing ? "Provider key replaced" : "Provider key added", `${key.name} · ${key.module}`)),
	})
}

export function removeProviderKey(provider: ProviderKeyId) {
	const key = state.keys.find((item) => item.provider === provider)
	if (!key?.last4) return
	update({
		keys: state.keys.map((item) => item.provider === provider ? { provider: item.provider, name: item.name, module: item.module, last4: null } : item),
		audit: withAudit(audit("keys", "Provider key removed", `${key.name} · ${key.module}`)),
	})
}
