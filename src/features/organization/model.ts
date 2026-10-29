/*
 * The customer organization as the platform plan defines it (maxion-agent-platform docs 08, 10, 13,
 * 21 and the INT-1, IAM-3, IAM-4 and ADM-4 program plans): members and invitations with fixed
 * Owner / Admin / Member roles, personal connections with project grants and read/write classes,
 * the customer policy layer over MAXION's grant, write-only provider keys, and a metadata-only
 * audit log. Everything here is seeded demo state; nothing reaches a provider.
 */
import { INITIAL_PROJECTS } from "@/features/platform-prototype/model"

export const ORGANIZATION = { id: "northstar", name: "Northstar Consulting", package: "Enterprise · 2026 v3" } as const

// ── People ────────────────────────────────────────────────────────────────────────────────────

export type OrgRole = "Owner" | "Admin" | "Member"
export const ORG_ROLES: OrgRole[] = ["Owner", "Admin", "Member"]
export const ROLE_DETAIL: Record<OrgRole, string> = {
	Owner: "Everything an Admin can do, plus owners, organization policy, spend ceilings and provider keys.",
	Admin: "Manages members who aren't owners, project setup, connections and knowledge.",
	Member: "Works in the projects they're given. No organization administration.",
}

export type Member = {
	id: string
	name: string
	initials: string
	email: string
	role: OrgRole
	status: "active" | "suspended"
	lastActive: string
}

export type InvitationStatus = "pending" | "expired" | "revoked" | "accepted"
export type Invitation = {
	id: string
	email: string
	role: OrgRole
	invitedBy: string
	status: InvitationStatus
	// Days until the link expires; a resend issues a new link and restarts the seven days.
	expiresInDays: number
	generation: number
}

export const VIEWER_ID = "root-admin"

export const INITIAL_MEMBERS: Member[] = [
	{ id: VIEWER_ID, name: "Root Admin", initials: "RA", email: "root.admin@northstar.com", role: "Owner", status: "active", lastActive: "Now" },
	{ id: "andre-reyes", name: "Andre Reyes", initials: "AR", email: "andre.reyes@northstar.com", role: "Admin", status: "active", lastActive: "12 minutes ago" },
	{ id: "elena-ortiz", name: "Elena Ortiz", initials: "EO", email: "elena.ortiz@northstar.com", role: "Admin", status: "active", lastActive: "Today" },
	{ id: "sarah-liu", name: "Sarah Liu", initials: "SL", email: "sarah.liu@northstar.com", role: "Member", status: "active", lastActive: "Today" },
	{ id: "elena-park", name: "Elena Park", initials: "EP", email: "elena.park@northstar.com", role: "Member", status: "active", lastActive: "Yesterday" },
	{ id: "marcus-reed", name: "Marcus Reed", initials: "MR", email: "marcus.reed@northstar.com", role: "Member", status: "active", lastActive: "Yesterday" },
	{ id: "kai-morgan", name: "Kai Morgan", initials: "KM", email: "kai.morgan@northstar.com", role: "Member", status: "active", lastActive: "4 days ago" },
	{ id: "jordan-taylor", name: "Jordan Taylor", initials: "JT", email: "jordan.taylor@northstar.com", role: "Member", status: "suspended", lastActive: "3 weeks ago" },
]

export const INITIAL_INVITATIONS: Invitation[] = [
	{ id: "inv-priya", email: "priya.nair@northstar.com", role: "Member", invitedBy: "Andre Reyes", status: "pending", expiresInDays: 5, generation: 1 },
	{ id: "inv-tom", email: "tom.becker@northstar.com", role: "Admin", invitedBy: "Root Admin", status: "expired", expiresInDays: 0, generation: 1 },
]

/*
 * Seats come from the commercial record, never from counting rows here: the package's 20 plus an
 * agreed amendment of five. Pending invitations take no seat.
 */
export const SEATS = { package: 20, amendment: 5, asOf: "09:40" } as const

// ── Connections ───────────────────────────────────────────────────────────────────────────────

export type OperationClass = "read" | "write"
export type ConnectorKey = "sharepoint" | "onedrive" | "salesforce" | "sap" | "servicenow" | "quickbooks" | "teams" | "jira" | "workday" | "outlook" | "netsuite"

export type ConnectorOperation = {
	label: string
	detail: string
	cls: OperationClass
	// A write is unavailable until it is qualified for this environment; a label is never a capability.
	qualified: boolean
	approval?: string
}

/*
 * Availability is the intersection of several checks, each with its own reason and one next
 * action. "Available" means the connector can be connected here; what a connection may then do
 * is still narrowed by the organization's policy, its classes and its project grants.
 */
export type ConnectorAvailability =
	| { state: "available" }
	| { state: "not_entitled"; reason: string; next: string }
	| { state: "not_qualified"; reason: string; next: string }

export type Connector = {
	key: ConnectorKey
	name: string
	category: string
	// Merge for what it supports, a MAXION native adapter where a requirement needs one (D-032).
	route: "merge" | "native"
	signIn: string
	operations: ConnectorOperation[]
	availability: ConnectorAvailability
}

const fileOperations = (store: string): ConnectorOperation[] => [
	{ label: "List files", detail: `Folders and files in ${store} this account can open`, cls: "read", qualified: true },
	{ label: "Describe a file", detail: "Name, size, version and who changed it last", cls: "read", qualified: true },
	{ label: "Read a file", detail: "The content of one file, as evidence with its version", cls: "read", qualified: true },
	{ label: "Publish a new file", detail: "Creates a new file; never overwrites, renames or shares", cls: "write", qualified: true, approval: "A project Manager approves each publish" },
]

export const CONNECTORS: Connector[] = [
	{ key: "sharepoint", name: "SharePoint", category: "Files", route: "merge", signIn: "Microsoft 365", operations: fileOperations("SharePoint sites"), availability: { state: "available" } },
	{ key: "onedrive", name: "OneDrive", category: "Files", route: "merge", signIn: "Microsoft 365", operations: fileOperations("OneDrive"), availability: { state: "available" } },
	{
		key: "salesforce", name: "Salesforce", category: "CRM", route: "merge", signIn: "Salesforce", availability: { state: "available" },
		operations: [
			{ label: "Search accounts and orders", detail: "Accounts, opportunities, quotes and booked orders", cls: "read", qualified: true },
			{ label: "Read an order", detail: "One order with its lines and owner", cls: "read", qualified: true },
			{ label: "Update an order record", detail: "Writes the SAP order number or a block reason", cls: "write", qualified: false },
		],
	},
	{
		key: "sap", name: "SAP S/4HANA", category: "ERP", route: "native", signIn: "SAP communication user", availability: { state: "available" },
		operations: [
			{ label: "Read business partners", detail: "Customer and supplier master records", cls: "read", qualified: true },
			{ label: "Read sales orders and billing", detail: "Orders, deliveries and billing documents", cls: "read", qualified: true },
			{ label: "Set a billing block", detail: "Places or clears one billing block", cls: "write", qualified: false },
		],
	},
	{
		key: "servicenow", name: "ServiceNow", category: "Service management", route: "native", signIn: "ServiceNow", availability: { state: "available" },
		operations: [
			{ label: "Search records", detail: "Cases, exceptions and their evidence", cls: "read", qualified: true },
			{ label: "Update a case", detail: "Closure code, rule applied and evidence", cls: "write", qualified: false },
		],
	},
	{
		key: "quickbooks", name: "QuickBooks Online", category: "Finance", route: "merge", signIn: "Intuit", availability: { state: "available" },
		operations: [
			{ label: "Read invoices and payments", detail: "Invoices, credits and received payments", cls: "read", qualified: true },
		],
	},
	{
		key: "teams", name: "Microsoft Teams", category: "Messaging", route: "merge", signIn: "Microsoft 365", availability: { state: "available" },
		operations: [
			{ label: "Post to a channel", detail: "A notification to a named channel", cls: "write", qualified: true, approval: "Covered by the engagement's notification rule" },
		],
	},
	{
		key: "jira", name: "Jira", category: "Work tracking", route: "merge", signIn: "Atlassian", availability: { state: "available" },
		operations: [
			{ label: "Search issues", detail: "Issues, epics and their history", cls: "read", qualified: true },
		],
	},
	{
		key: "workday", name: "Workday", category: "HR", route: "merge", signIn: "Workday", availability: { state: "available" },
		operations: [
			{ label: "Read workers and positions", detail: "Joiners, movers and leavers", cls: "read", qualified: true },
		],
	},
	{
		key: "outlook", name: "Outlook mailbox", category: "Email", route: "merge", signIn: "Microsoft 365",
		availability: { state: "not_qualified", reason: "Not available yet", next: "MAXION turns this on once it's qualified for agents that write to outside contacts." },
		operations: [
			{ label: "Send from your mailbox", detail: "A business message to an outside contact", cls: "write", qualified: false },
		],
	},
	{
		key: "netsuite", name: "NetSuite", category: "Finance", route: "merge", signIn: "Oracle NetSuite",
		availability: { state: "not_entitled", reason: "Not in your agreement", next: "Ask your MAXION contact to add it." },
		operations: [
			{ label: "Read transactions", detail: "Invoices, journals and payments", cls: "read", qualified: true },
		],
	},
]

export const connectorFor = (key: ConnectorKey) => CONNECTORS.find((connector) => connector.key === key) as Connector

export type ConnectionState = "verifying" | "awaiting_confirmation" | "active" | "needs_reconnect" | "suspended" | "disconnected" | "failed"
export type ConnectionReason = "consent_expired" | "account_mismatch" | "verification_failed"

export type Connection = {
	id: string
	connector: ConnectorKey
	ownership: "personal" | "organization"
	ownerId: string
	ownerName: string
	// The verified account. Owners and Admins see that another member's personal connection
	// exists, never its account label (INT-1).
	accountLabel: string
	state: ConnectionState
	reason?: ConnectionReason
	classes: OperationClass[]
	projects: string[]
	lastVerified: string
	// A local disconnect takes effect at once; deleting the credential at the provider is tracked apart.
	cleanup: "none" | "pending" | "done"
	// Minutes left to confirm the returned account before the connection falls back.
	confirmMinutes?: number
	revision: number
}

export const INITIAL_CONNECTIONS: Connection[] = [
	{ id: "conn-sharepoint", connector: "sharepoint", ownership: "personal", ownerId: VIEWER_ID, ownerName: "Root Admin", accountLabel: "root.admin@northstar.com · northstar.sharepoint.com", state: "active", classes: ["read", "write"], projects: ["erp-modernization", "northbridge"], lastVerified: "Today 08:12", cleanup: "none", revision: 6 },
	{ id: "conn-salesforce", connector: "salesforce", ownership: "personal", ownerId: VIEWER_ID, ownerName: "Root Admin", accountLabel: "root.admin@northstar.com · northstar.my.salesforce.com", state: "active", classes: ["read"], projects: ["erp-modernization", "northbridge"], lastVerified: "Today 08:12", cleanup: "none", revision: 3 },
	{ id: "conn-sap", connector: "sap", ownership: "personal", ownerId: VIEWER_ID, ownerName: "Root Admin", accountLabel: "MAXION_RA · Northstar Production (P41)", state: "needs_reconnect", reason: "consent_expired", classes: ["read"], projects: ["erp-modernization"], lastVerified: "Oct 26", cleanup: "none", revision: 4 },
	{ id: "conn-servicenow", connector: "servicenow", ownership: "personal", ownerId: VIEWER_ID, ownerName: "Root Admin", accountLabel: "root.admin · northstar.service-now.com", state: "active", classes: ["read"], projects: ["erp-modernization"], lastVerified: "Yesterday", cleanup: "none", revision: 2 },
	{ id: "conn-quickbooks", connector: "quickbooks", ownership: "personal", ownerId: VIEWER_ID, ownerName: "Root Admin", accountLabel: "Northstar US · company 934771", state: "active", classes: ["read"], projects: ["erp-modernization"], lastVerified: "Yesterday", cleanup: "none", revision: 2 },
	{ id: "conn-jira", connector: "jira", ownership: "personal", ownerId: VIEWER_ID, ownerName: "Root Admin", accountLabel: "", state: "disconnected", classes: ["read"], projects: [], lastVerified: "Oct 24", cleanup: "done", revision: 5 },
	{ id: "conn-onedrive-andre", connector: "onedrive", ownership: "personal", ownerId: "andre-reyes", ownerName: "Andre Reyes", accountLabel: "", state: "active", classes: ["read"], projects: ["erp-modernization"], lastVerified: "Today 07:55", cleanup: "none", revision: 1 },
	{ id: "conn-teams-elena", connector: "teams", ownership: "personal", ownerId: "elena-ortiz", ownerName: "Elena Ortiz", accountLabel: "", state: "active", classes: ["write"], projects: ["erp-modernization"], lastVerified: "Today 06:30", cleanup: "none", revision: 2 },
]

export const CONNECTION_STATE_LABEL: Record<ConnectionState, string> = {
	verifying: "Finishing the connection",
	awaiting_confirmation: "Confirm the account",
	active: "Active",
	needs_reconnect: "Needs reconnect",
	suspended: "Paused by MAXION",
	disconnected: "Disconnected",
	failed: "Couldn't connect",
}

export const REASON_TEXT: Record<ConnectionReason, string> = {
	consent_expired: "The sign-in expired on Oct 26. New work can't use it until you reconnect the same account.",
	account_mismatch: "The provider returned a different account from the one this connection uses, so nothing changed.",
	verification_failed: "The provider didn't confirm the account. Try connecting again.",
}

/* A personal owner may grant a project they work in; a Viewer can't hand a connection to a project. */
export type GrantableProject = { id: string; name: string; grantable: boolean; reason?: string }
export const grantableProjects = (): GrantableProject[] =>
	INITIAL_PROJECTS.filter((project) => project.status === "active").map((project) =>
		project.role === "Viewer"
			? { id: project.id, name: project.name, grantable: false, reason: `You're a Viewer on ${project.name}` }
			: { id: project.id, name: project.name, grantable: true })

export const projectName = (id: string) => INITIAL_PROJECTS.find((project) => project.id === id)?.name ?? id

// ── Policy (the customer layer over MAXION's grant) ────────────────────────────────────────────

export type PolicySource = { kind: "inherited" } | { kind: "organization"; by: string; at: string }
export type ModuleMode = "normal" | "read_only"
export type NetworkLevel = "package_registries" | "named_hosts" | "full_internet"
export const NETWORK_LEVELS: NetworkLevel[] = ["package_registries", "named_hosts", "full_internet"]
export const NETWORK_LABEL: Record<NetworkLevel, string> = { package_registries: "Package registries", named_hosts: "Named hosts", full_internet: "Full internet" }
export const NETWORK_DETAIL: Record<NetworkLevel, string> = {
	package_registries: "Agent sandboxes reach package registries only.",
	named_hosts: "Sandboxes may also reach hosts a Manager names for one case.",
	full_internet: "A Manager may open the full internet for one case, with a reason.",
}
export type ToolClass = "read" | "build" | "update" | "notify" | "production"
export const TOOL_CLASS_LABEL: Record<ToolClass, string> = { read: "Read records", build: "Build and test", update: "Governed record updates", notify: "Notifications", production: "Production change through a release" }

/* `granted` is what MAXION grants and has qualified here; a granted route that isn't ready yet is listed apart and can't be chosen. */
export type ModelPolicy = { id: string; module: "Discovery" | "Agentix"; task: string; granted: string[]; notReady?: string[]; allowed: string[]; preferred: string; source: PolicySource }

export type Policy = {
	revision: number
	modules: Record<"discovery" | "agentix", { mode: ModuleMode; source: PolicySource }>
	models: ModelPolicy[]
	research: { mode: "on" | "off" | "allowlist"; domains: string[]; blocked: number; source: PolicySource }
	tools: { granted: ToolClass[]; allowed: ToolClass[]; source: PolicySource }
	network: { ceiling: NetworkLevel; value: NetworkLevel; source: PolicySource }
	integrations: { classes: "read_write" | "read"; source: PolicySource }
}

export const INITIAL_POLICY: Policy = {
	revision: 14,
	modules: {
		discovery: { mode: "normal", source: { kind: "inherited" } },
		agentix: { mode: "normal", source: { kind: "inherited" } },
	},
	models: [
		{ id: "discovery-reasoning", module: "Discovery", task: "Research, conversation and deliverables", granted: ["Claude Opus 5.5", "Claude Sonnet 5.5"], allowed: ["Claude Opus 5.5", "Claude Sonnet 5.5"], preferred: "Claude Opus 5.5", source: { kind: "inherited" } },
		{ id: "discovery-voice", module: "Discovery", task: "Voice interviews", granted: ["ElevenLabs conversational voice"], allowed: ["ElevenLabs conversational voice"], preferred: "ElevenLabs conversational voice", source: { kind: "inherited" } },
		{ id: "agentix-reasoning", module: "Agentix", task: "Reasoning and delegation", granted: ["GPT-6 Luna"], notReady: ["GPT-6 Luna mini"], allowed: ["GPT-6 Luna"], preferred: "GPT-6 Luna", source: { kind: "organization", by: "Root Admin", at: "Oct 12" } },
	],
	research: { mode: "on", domains: [], blocked: 37, source: { kind: "inherited" } },
	tools: { granted: ["read", "build", "update", "notify", "production"], allowed: ["read", "build", "update", "notify", "production"], source: { kind: "inherited" } },
	network: { ceiling: "named_hosts", value: "package_registries", source: { kind: "organization", by: "Root Admin", at: "Oct 3" } },
	integrations: { classes: "read_write", source: { kind: "inherited" } },
}

/*
 * Rules that must never be broken are also platform controls (doc 22); Knowledge links each rule to
 * its control and Policy lists them. They're set with MAXION, not edited here.
 */
export const ENFORCED_RULES = [
	{ control: "Agentix approvals over $25,000", enforces: "Payments and credits above $25,000 wait for a Finance Director in every engagement.", knowledge: "Payment approvals over $25,000 need a Finance Director", since: "Oct 1" },
	{ control: "Allowed recipients for outside messages", enforces: "Agents send outside messages only to the approved domains and named contacts.", knowledge: "Allowed outside recipients", since: "Sep 12" },
] as const

// ── Provider keys (D-089) ─────────────────────────────────────────────────────────────────────

export type ProviderKeyId = "anthropic" | "openai"
export type ProviderKey = {
	provider: ProviderKeyId
	name: string
	module: "Discovery" | "Agentix"
	last4: string | null
	addedBy?: string
	addedAt?: string
	check?: { state: "passed" | "failed"; at: string; reason?: string }
}

export const INITIAL_KEYS: ProviderKey[] = [
	{ provider: "anthropic", name: "Anthropic", module: "Discovery", last4: null },
	{ provider: "openai", name: "OpenAI", module: "Agentix", last4: "7Kq2", addedBy: "Root Admin", addedAt: "Oct 3", check: { state: "passed", at: "Oct 3" } },
]

// ── Audit log (metadata only, D-092) ──────────────────────────────────────────────────────────

export type AuditCategory = "sign_ins" | "membership" | "approvals" | "connections" | "keys" | "settings"
export const AUDIT_CATEGORY_LABEL: Record<AuditCategory, string> = { sign_ins: "Sign-ins", membership: "Membership", approvals: "Approvals", connections: "Connections", keys: "Keys", settings: "Settings" }

export type AuditEvent = {
	id: string
	at: number
	category: AuditCategory
	action: string
	actor: string
	target: string
	outcome: "Succeeded" | "Denied" | "Failed"
}

const HOUR = 3_600_000
const DAY = 24 * HOUR
const seedEvent = (id: string, ago: number, category: AuditCategory, action: string, actor: string, target: string, outcome: AuditEvent["outcome"] = "Succeeded"): AuditEvent => ({ id, at: Date.now() - ago, category, action, actor, target, outcome })

export const initialAudit = (): AuditEvent[] => [
	seedEvent("a01", 0.1 * HOUR, "sign_ins", "Signed in", "Root Admin", "Northstar Consulting"),
	seedEvent("a02", 1.6 * HOUR, "connections", "Connection checked", "Root Admin", "SharePoint · personal"),
	seedEvent("a03", 2.4 * HOUR, "approvals", "Approval recorded", "Elena Ortiz", "Revenue reconciliation · release"),
	seedEvent("a04", 3.1 * HOUR, "sign_ins", "Sign-in refused", "Andre Reyes", "Northstar Consulting", "Denied"),
	seedEvent("a05", 5 * HOUR, "connections", "Project access granted", "Andre Reyes", "OneDrive · ERP modernization"),
	seedEvent("a06", 1 * DAY + 2 * HOUR, "membership", "Invitation sent", "Andre Reyes", "Member invitation"),
	seedEvent("a07", 1 * DAY + 5 * HOUR, "connections", "Disconnected", "Root Admin", "Jira · personal"),
	seedEvent("a08", 1 * DAY + 5.1 * HOUR, "connections", "Provider cleanup completed", "MAXION", "Jira · personal"),
	seedEvent("a09", 2 * DAY, "connections", "Needs reconnect", "MAXION", "SAP S/4HANA · personal"),
	seedEvent("a10", 4 * DAY, "membership", "Role changed", "Root Admin", "Elena Ortiz · Admin"),
	seedEvent("a11", 8 * DAY, "membership", "Member suspended", "Root Admin", "Jordan Taylor"),
	seedEvent("a12", 16 * DAY, "settings", "Policy published", "Root Admin", "Agentix models · revision 13"),
	seedEvent("a13", 25 * DAY, "keys", "Provider key added", "Root Admin", "OpenAI · Agentix"),
	seedEvent("a14", 25 * DAY + HOUR, "settings", "Policy published", "Root Admin", "Agentix sandbox network · revision 12"),
	seedEvent("a15", 41 * DAY, "membership", "Member joined", "Kai Morgan", "Northstar Consulting"),
]
