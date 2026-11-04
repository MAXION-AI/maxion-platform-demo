/*
 * MAXION's staff admin panel (maxion-agent-platform docs 21, ADM-1 and ADM-2): tenants, the
 * typed controls MAXION publishes for each one, and the receipts those changes leave. A control
 * is read back in layers (platform or package baseline, the tenant amendment, the customer's
 * own restriction) and resolves to one effective value with the reason that limits it. Seeded
 * demo state only; nothing reaches a provider.
 */
import { CONNECTORS, INITIAL_INVITATIONS, INITIAL_KEYS, INITIAL_MEMBERS, INITIAL_POLICY, NETWORK_LABEL, NETWORK_LEVELS, ORGANIZATION, SEATS, TOOL_CLASS_LABEL, type ConnectorKey, type Invitation, type NetworkLevel, type ToolClass } from "@/features/organization/model"
import { WORKSPACE_CYCLE_RESET, WORKSPACE_UNIT_CAP, WORKSPACE_UNITS_USED, WORKSPACE_USAGE_ROWS } from "@/features/platform-prototype/model"

export { NETWORK_LABEL, NETWORK_LEVELS, TOOL_CLASS_LABEL }
export type { NetworkLevel, ToolClass }

/*
 * Fixed staff roles (doc 21, D-030). One launch operator may hold Platform Owner and Operator
 * together; there is no custom role builder. Customer roles never confer any of these.
 */
export type StaffRole = "Platform Owner" | "Operator" | "Support"
export const STAFF_ROLES: StaffRole[] = ["Platform Owner", "Operator", "Support"]
export const ROLE_DETAIL: Record<StaffRole, string> = {
	"Platform Owner": "Global catalog, defaults and ceilings, platform stops, staff grants and the first Owner of a new tenant, plus what an Operator can do.",
	Operator: "Manages a tenant: commercial grants and model policy within platform ceilings, scoped stops and recovery, usage and cost. Can't widen a global ceiling or appoint staff.",
	Support: "Reads tenant configuration, effective-policy explanations and health. Resends or revokes invitations and revokes sessions, each with a reason. No entitlement or model changes, no customer content, no impersonation.",
}

export type StaffMember = { id: string; name: string; initials: string; roles: StaffRole[]; scope: string; granted: string }
export const INITIAL_STAFF: StaffMember[] = [
	{ id: "maya-chen", name: "Maya Chen", initials: "MC", roles: ["Platform Owner", "Operator"], scope: "All tenants", granted: "Sep 8, initial setup" },
	{ id: "luis-ortega", name: "Luis Ortega", initials: "LO", roles: ["Operator"], scope: "All tenants", granted: "Sep 12, by Maya Chen" },
	{ id: "tessa-lind", name: "Tessa Lind", initials: "TL", roles: ["Support"], scope: "All tenants", granted: "Oct 6, by Maya Chen" },
]

/*
 * What each named staff action needs. Invitation commands belong to Support and Platform Owner
 * (IAM-3), not Operator. A new tenant authorizes its first Owner, which stays with Platform Owner
 * (IAM-2). Internal cost is outside Support's projection (COM-1).
 */
export type StaffAction = "tenant.bootstrap" | "tenant.change" | "tenant.stop" | "tenant.sessions" | "invitation.manage" | "platform.control" | "staff.manage" | "cost.read"
const ACTION_ROLES: Record<StaffAction, StaffRole[]> = {
	"tenant.bootstrap": ["Platform Owner"],
	"tenant.change": ["Platform Owner", "Operator"],
	"tenant.stop": ["Platform Owner", "Operator"],
	"tenant.sessions": ["Platform Owner", "Operator", "Support"],
	"invitation.manage": ["Platform Owner", "Support"],
	"platform.control": ["Platform Owner"],
	"staff.manage": ["Platform Owner"],
	"cost.read": ["Platform Owner", "Operator"],
}
export const can = (member: StaffMember | undefined, action: StaffAction) => Boolean(member?.roles.some((role) => ACTION_ROLES[action].includes(role)))
/* The reason a disallowed control shows in its place: what it needs, so the next step is plain. */
export const deniedReason = (action: StaffAction) => `Needs ${[...ACTION_ROLES[action]].reverse().join(" or ")}`
export const isLastPlatformOwner = (staff: StaffMember[], id: string) => {
	const owners = staff.filter((member) => member.roles.includes("Platform Owner"))
	return owners.length === 1 && owners[0].id === id
}

export const ENVIRONMENT = "Production"
export const RELEASE = "2026.10.27"

export type ModuleKey = "discovery" | "agentix" | "voice"
export const MODULE_LABEL: Record<ModuleKey, string> = { discovery: "Discovery", agentix: "Agentix", voice: "Voice interviews" }
export const MODULE_DETAIL: Record<ModuleKey, string> = {
	discovery: "Research, interviews and deliverables in each project's Discovery workspace.",
	agentix: "Design, activation and execution of agent teams.",
	voice: "Spoken interviews with the owner and stakeholders.",
}

export type Lifecycle = "active" | "suspended" | "pending" | "cleanup_pending"
export const LIFECYCLE_LABEL: Record<Lifecycle, string> = { active: "Active", suspended: "Suspended", pending: "Pending setup", cleanup_pending: "Cleanup pending" }

export type StopMode = "pause_new_work" | "read_only" | "block" | "suspend_tenant"
export const STOP_LABEL: Record<StopMode, string> = { pause_new_work: "Pause new work", read_only: "Read-only", block: "Block", suspend_tenant: "Suspend tenant" }
export const STOP_DETAIL: Record<StopMode, string> = {
	pause_new_work: "No new triggers or admissions. Admitted work continues under current checks.",
	read_only: "No design writes, activation, paid generation or new external effects. History and export stay readable.",
	block: "No customer use of the affected capability and no new dispatch. Recovery and audit continue.",
	suspend_tenant: "Rejects ordinary access across both modules, revokes sessions and pauses dispatch in one step.",
}

export type ReasonCode = "customer_agreement" | "customer_request" | "incident_response" | "security_review" | "commercial_correction" | "qualification_change"
export const REASON_LABEL: Record<ReasonCode, string> = {
	customer_agreement: "Customer agreement",
	customer_request: "Customer request",
	incident_response: "Incident response",
	security_review: "Security review",
	commercial_correction: "Commercial correction",
	qualification_change: "Qualification change",
}

export type ModelRoute = {
	route: string
	// The module task this route serves, matching ModelTask.id.
	task: string
	provider: string
	modules: string
	readiness: "qualified" | "staging" | "not_qualified"
	// Unknown cost stays unknown, never zero.
	cost: string | null
	stopped: boolean
}

export type ModelTask = {
	id: string
	module: "Discovery" | "Agentix"
	task: string
	// Routes MAXION enables for this tenant ("explicit_required": nothing is implied by the catalog).
	granted: string[]
	defaultRoute: string
	fallback: string | null
	// The customer's own subset and preference, read from their policy.
	customerAllowed: string[] | null
	customerPreferred: string | null
}

export type Adjustment = { id: string; at: string; units: number; reason: string; ticket: string }

/*
 * Internal provider cost against this tenant's usage (doc 12, ADM-2 P2.AC-06, COM-2). Simulated
 * figures in whole cents. A null amount is unknown, never zero; a held reservation isn't spend;
 * use on the customer's own key doesn't draw down the allowance (D-089). No customer price exists
 * here: the charging mode is set on the agreement (D-129) and rates stay open (P-061).
 */
export type CostEvidence = "final" | "estimate" | "unknown" | "customer_key"
export const COST_EVIDENCE_LABEL: Record<CostEvidence, string> = { final: "Provider reported, final", estimate: "Estimate, not final", unknown: "Unknown", customer_key: "Customer's account" }
export type CostLine = { id: string; source: string; meta: string; units: number; held?: number; cents: number | null; evidence: CostEvidence }
export type TenantCosts = { asOf: string; lines: CostLine[] }

export type StaffInvitation = Invitation & { delivery?: "unknown" }

export type FirstOwnerIdentity = { globalUser: string; issuer: string; subject: string; tid: string; oid: string }
/* The single-use first-Owner flow (IAM-2): the person issues their own code, and staff never look anyone up by name or email. */
export type SetupCode = { code: string; identity: FirstOwnerIdentity; issuedAt: number; consumedAt: number | null }
export type TenantSetup = { onboardingReference: string; firstOwner: FirstOwnerIdentity; bindingRevision: number; bindingExpiresAt: number; agreementVersion: number; agreementEnd: string }

export type TenantState = {
	id: string
	name: string
	region: string
	packageName: string
	packageRevision: number
	lifecycle: Lifecycle
	setupGap?: string
	updated: string
	modules: Record<ModuleKey, { package: boolean; override: boolean | null; expires?: string }>
	customerModes: { discovery: "normal" | "read_only"; agentix: "normal" | "read_only" }
	seats: { package: number; amendment: number; until: string; used: number }
	models: ModelTask[]
	research: { tenant: "on" | "off"; customer: "on" | "off" | "allowlist"; domains: number }
	network: { tenant: NetworkLevel; customer: NetworkLevel | null }
	tools: { tenant: ToolClass[]; customer: ToolClass[] | null }
	connectors: Partial<Record<ConnectorKey, boolean>>
	usage: { allowance: number; used: number; reservations: number; reservationJobs: number; resets: string; reconciliation: string[]; adjustments: Adjustment[] }
	costs: TenantCosts
	invitations: StaffInvitation[]
	sessions: number
	// Present while a tenant created in this panel is still being set up.
	setup?: TenantSetup
	stop: { mode: StopMode; scope: string; reason: ReasonCode; at: string } | null
	work: { discovery: number; agentix: number; voice: number; asOf: string }
	revision: number
}

export type PlatformState = {
	revision: number
	models: ModelRoute[]
	network: NetworkLevel
	tools: ToolClass[]
	blockedDomains: number
	stops: Record<"discovery" | "agentix" | "voice" | "integrations", { mode: StopMode; reason: ReasonCode; at: string } | null>
}

export type ReceiptStatus = "published" | "cleanup_pending" | "applied"
export const RECEIPT_LABEL: Record<ReceiptStatus, string> = { published: "Published", cleanup_pending: "Cleanup pending", applied: "Applied" }
export type Receipt = {
	id: string
	scope: string
	control: string
	change: string
	operator: string
	reason: ReasonCode
	ticket: string
	revision: number
	at: string
	status: ReceiptStatus
}

export const INITIAL_PLATFORM: PlatformState = {
	revision: 31,
	models: [
		{ route: "Claude Opus 5.5", task: "discovery-reasoning", provider: "Anthropic · Managed Agents", modules: "Discovery research, conversation and deliverables", readiness: "qualified", cost: "Est. 4.2 units per session-hour", stopped: false },
		{ route: "Claude Sonnet 5.5", task: "discovery-reasoning", provider: "Anthropic · Managed Agents", modules: "Discovery research, conversation and deliverables", readiness: "qualified", cost: "Est. 1.6 units per session-hour", stopped: false },
		{ route: "ElevenLabs conversational voice", task: "discovery-voice", provider: "ElevenLabs", modules: "Discovery voice interviews", readiness: "qualified", cost: "Est. 0.9 units per interview-minute", stopped: false },
		{ route: "GPT-6 Luna", task: "agentix-reasoning", provider: "OpenAI · Agents API", modules: "Agentix reasoning and delegation", readiness: "qualified", cost: "Est. 2.8 units per case-hour", stopped: false },
		{ route: "GPT-6 Luna mini", task: "agentix-reasoning", provider: "OpenAI · Agents API", modules: "Agentix reasoning and delegation", readiness: "staging", cost: null, stopped: false },
	],
	network: "full_internet",
	tools: ["read", "build", "update", "notify", "production"],
	blockedDomains: 37,
	stops: { discovery: null, agentix: null, voice: null, integrations: null },
}

const qualifiedConnectors = (keys: ConnectorKey[]) => Object.fromEntries(keys.map((key) => [key, true])) as Partial<Record<ConnectorKey, boolean>>
const discoveryModels = (customerAllowed: string[] | null, customerPreferred: string | null): ModelTask => ({ id: "discovery-reasoning", module: "Discovery", task: "Research, conversation and deliverables", granted: ["Claude Opus 5.5", "Claude Sonnet 5.5"], defaultRoute: "Claude Opus 5.5", fallback: "Claude Sonnet 5.5", customerAllowed, customerPreferred })
const voiceModels = (): ModelTask => ({ id: "discovery-voice", module: "Discovery", task: "Voice interviews", granted: ["ElevenLabs conversational voice"], defaultRoute: "ElevenLabs conversational voice", fallback: null, customerAllowed: null, customerPreferred: null })
const agentixModels = (customerAllowed: string[] | null, customerPreferred: string | null): ModelTask => ({ id: "agentix-reasoning", module: "Agentix", task: "Reasoning and delegation", granted: ["GPT-6 Luna", "GPT-6 Luna mini"], defaultRoute: "GPT-6 Luna", fallback: null, customerAllowed, customerPreferred })

/* Northstar's customer layer is the one its own Settings shows, so the two apps never disagree. */
const northstarCustomer = (id: string) => INITIAL_POLICY.models.find((model) => model.id === id)
const northstarCustomerModels = (id: string): [string[] | null, string | null] => {
	const model = northstarCustomer(id)
	return model && model.source.kind === "organization" ? [model.allowed, model.preferred] : [null, null]
}

/* Northstar's units are the customer's Usage page's own constants, so the two views can't disagree. */
const NORTHSTAR_AR_2291_HELD = 1_400
const NORTHSTAR_VOICE_UNITS = 1_240
const unitsFor = (module: (typeof WORKSPACE_USAGE_ROWS)[number]["module"]) => WORKSPACE_USAGE_ROWS.find((row) => row.module === module)!.units
const northstarKey = INITIAL_KEYS.find((key) => key.provider === "openai" && key.last4)
const northstarCosts = (): TenantCosts => ({
	asOf: "09:41",
	lines: [
		{ id: "discovery-claude", source: "Discovery · Claude", meta: "Anthropic Managed Agents, MAXION's account", units: unitsFor("Discovery") - NORTHSTAR_VOICE_UNITS, cents: 241_660, evidence: "final" },
		{ id: "discovery-voice", source: "Discovery · Voice interviews", meta: "ElevenLabs, MAXION's account", units: NORTHSTAR_VOICE_UNITS, cents: 18_600, evidence: "estimate" },
		{ id: "agentix-sandbox", source: "Agentix · Sandboxes and tools", meta: "MAXION's account", units: unitsFor("Agentix"), cents: 94_800, evidence: "final" },
		...(northstarKey ? [{ id: "agentix-key", source: "Agentix · GPT-6 Luna", meta: `Customer's OpenAI key, since ${northstarKey.addedAt}. Metered; doesn't draw down the allowance.`, units: 0, cents: null, evidence: "customer_key" as const }] : []),
		{ id: "ar-2291", source: "Agentix case AR-2291", meta: "The provider hasn't reported final usage", units: 0, held: NORTHSTAR_AR_2291_HELD, cents: null, evidence: "unknown" },
	],
})
const simpleCosts = (asOf: string, lines: Array<[string, string, number, number]>): TenantCosts => ({ asOf, lines: lines.map(([source, meta, units, cents]) => ({ id: source, source, meta, units, cents, evidence: "final" })) })
const NO_COSTS: TenantCosts = { asOf: "09:41", lines: [] }

const ALL_QUALIFIED = CONNECTORS.filter((connector) => connector.availability.state !== "not_qualified").map((connector) => connector.key)

export const initialTenants = (): TenantState[] => [
	{
		id: ORGANIZATION.id, name: ORGANIZATION.name, region: "US", packageName: ORGANIZATION.package, packageRevision: 7, lifecycle: "active", updated: "Today 09:40",
		modules: { discovery: { package: true, override: null }, agentix: { package: true, override: null }, voice: { package: false, override: true, expires: "Dec 31" } },
		customerModes: { discovery: INITIAL_POLICY.modules.discovery.mode, agentix: INITIAL_POLICY.modules.agentix.mode },
		seats: { package: SEATS.package, amendment: SEATS.amendment, until: "Agreement end, Jun 30", used: INITIAL_MEMBERS.filter((member) => member.status === "active").length },
		models: [discoveryModels(...northstarCustomerModels("discovery-reasoning")), voiceModels(), agentixModels(...northstarCustomerModels("agentix-reasoning"))],
		research: { tenant: "on", customer: INITIAL_POLICY.research.mode, domains: INITIAL_POLICY.research.domains.length },
		network: { tenant: "named_hosts", customer: INITIAL_POLICY.network.source.kind === "organization" ? INITIAL_POLICY.network.value : null },
		tools: { tenant: ["read", "build", "update", "notify", "production"], customer: null },
		connectors: qualifiedConnectors(ALL_QUALIFIED.filter((key) => key !== "netsuite")),
		usage: { allowance: WORKSPACE_UNIT_CAP, used: WORKSPACE_UNITS_USED, reservations: 3_400, reservationJobs: 3, resets: WORKSPACE_CYCLE_RESET, reconciliation: [`Agentix case AR-2291: the provider hasn't reported final usage. Its reservation of ${NORTHSTAR_AR_2291_HELD.toLocaleString("en-US")} units stays held and the cost is unknown.`], adjustments: [{ id: "adj-1", at: "Oct 14", units: 2_000, reason: "Commercial correction", ticket: "COM-118" }] },
		costs: northstarCosts(),
		invitations: INITIAL_INVITATIONS,
		sessions: 5,
		stop: null,
		work: { discovery: 2, agentix: 4, voice: 0, asOf: "09:41" },
		revision: 14,
	},
	{
		id: "calder", name: "Calder Industrial", region: "US", packageName: "Enterprise · 2026 v3", packageRevision: 7, lifecycle: "active", updated: "Today 08:05",
		modules: { discovery: { package: true, override: null }, agentix: { package: true, override: null }, voice: { package: false, override: null } },
		customerModes: { discovery: "normal", agentix: "normal" },
		seats: { package: 20, amendment: 0, until: "—", used: 14 },
		models: [discoveryModels(null, null), voiceModels(), agentixModels(null, null)],
		research: { tenant: "on", customer: "allowlist", domains: 12 },
		network: { tenant: "package_registries", customer: null },
		tools: { tenant: ["read", "build", "update", "notify", "production"], customer: ["read", "build", "update", "notify"] },
		connectors: qualifiedConnectors(["servicenow", "sharepoint", "onedrive", "teams"]),
		usage: { allowance: 100_000, used: 31_800, reservations: 1_200, reservationJobs: 1, resets: WORKSPACE_CYCLE_RESET, reconciliation: [], adjustments: [] },
		costs: simpleCosts("09:41", [["Discovery · Claude", "Anthropic Managed Agents, MAXION's account", 18_200, 382_200], ["Agentix · GPT-6 Luna and sandboxes", "OpenAI, MAXION's account", 13_600, 217_600]]),
		invitations: [{ id: "inv-calder", email: "r.okafor@calderindustrial.com", role: "Member", invitedBy: "A Calder Admin", status: "pending", expiresInDays: 6, generation: 1, delivery: "unknown" }],
		sessions: 9,
		stop: null,
		work: { discovery: 1, agentix: 6, voice: 0, asOf: "09:41" },
		revision: 9,
	},
	{
		id: "arcline", name: "Arcline Technologies", region: "US", packageName: "Growth · 2026 v2", packageRevision: 4, lifecycle: "active", updated: "Yesterday",
		modules: { discovery: { package: true, override: null }, agentix: { package: false, override: true, expires: "Pilot ends Nov 30" }, voice: { package: false, override: null } },
		customerModes: { discovery: "normal", agentix: "normal" },
		seats: { package: 15, amendment: 5, until: "Pilot ends Nov 30", used: 18 },
		models: [discoveryModels(["Claude Sonnet 5.5"], "Claude Sonnet 5.5"), voiceModels(), agentixModels(null, null)],
		research: { tenant: "on", customer: "on", domains: 0 },
		network: { tenant: "package_registries", customer: null },
		tools: { tenant: ["read", "build", "update", "notify"], customer: null },
		connectors: qualifiedConnectors(["salesforce", "sap", "sharepoint", "teams"]),
		usage: { allowance: 40_000, used: 39_400, reservations: 2_600, reservationJobs: 2, resets: WORKSPACE_CYCLE_RESET, reconciliation: [], adjustments: [] },
		costs: simpleCosts("09:41", [["Discovery · Claude", "Anthropic Managed Agents, MAXION's account", 16_000, 328_000], ["Agentix · GPT-6 Luna and sandboxes", "OpenAI, MAXION's account", 23_400, 351_000]]),
		invitations: [{ id: "inv-arcline", email: "d.vance@arcline.io", role: "Admin", invitedBy: "An Arcline Owner", status: "expired", expiresInDays: 0, generation: 1 }],
		sessions: 11,
		stop: null,
		work: { discovery: 1, agentix: 3, voice: 0, asOf: "09:41" },
		revision: 6,
	},
	{
		id: "halden", name: "Halden Group", region: "EU", packageName: "Enterprise · 2026 v3", packageRevision: 7, lifecycle: "active", updated: "Oct 25",
		modules: { discovery: { package: true, override: null }, agentix: { package: true, override: null }, voice: { package: false, override: true } },
		customerModes: { discovery: "normal", agentix: "read_only" },
		seats: { package: 30, amendment: -2, until: "Agreement end, Mar 31", used: 31 },
		models: [discoveryModels(null, null), voiceModels(), agentixModels(null, null)],
		research: { tenant: "on", customer: "off", domains: 0 },
		network: { tenant: "package_registries", customer: null },
		tools: { tenant: ["read", "build", "update", "notify", "production"], customer: null },
		connectors: qualifiedConnectors(["sap", "sharepoint", "onedrive"]),
		usage: { allowance: 120_000, used: 22_100, reservations: 0, reservationJobs: 0, resets: WORKSPACE_CYCLE_RESET, reconciliation: [], adjustments: [] },
		costs: simpleCosts("09:41", [["Discovery · Claude", "Anthropic Managed Agents, MAXION's account", 16_400, 344_400], ["Discovery · Voice interviews", "ElevenLabs, MAXION's account", 5_700, 74_100]]),
		invitations: [],
		sessions: 12,
		stop: null,
		work: { discovery: 3, agentix: 0, voice: 1, asOf: "09:41" },
		revision: 11,
	},
	{
		id: "brightwater", name: "Brightwater Health", region: "US", packageName: "Enterprise · 2026 v3", packageRevision: 7, lifecycle: "pending", setupGap: "Model routes for Agentix aren't published yet, so setup is incomplete.", updated: "Today 07:20",
		modules: { discovery: { package: true, override: null }, agentix: { package: true, override: null }, voice: { package: false, override: null } },
		customerModes: { discovery: "normal", agentix: "normal" },
		seats: { package: 20, amendment: 0, until: "—", used: 0 },
		models: [discoveryModels(null, null), voiceModels(), { ...agentixModels(null, null), granted: [] }],
		research: { tenant: "on", customer: "on", domains: 0 },
		network: { tenant: "package_registries", customer: null },
		tools: { tenant: ["read"], customer: null },
		connectors: {},
		usage: { allowance: 100_000, used: 0, reservations: 0, reservationJobs: 0, resets: WORKSPACE_CYCLE_RESET, reconciliation: [], adjustments: [] },
		costs: NO_COSTS,
		invitations: [],
		sessions: 0,
		stop: null,
		work: { discovery: 0, agentix: 0, voice: 0, asOf: "09:41" },
		revision: 1,
	},
	{
		id: "kestrel", name: "Kestrel Logistics", region: "US", packageName: "Growth · 2026 v2", packageRevision: 4, lifecycle: "cleanup_pending", updated: "Oct 22",
		modules: { discovery: { package: true, override: null }, agentix: { package: false, override: null }, voice: { package: false, override: null } },
		customerModes: { discovery: "read_only", agentix: "normal" },
		seats: { package: 15, amendment: 0, until: "—", used: 0 },
		models: [discoveryModels(null, null), voiceModels(), agentixModels(null, null)],
		research: { tenant: "off", customer: "on", domains: 0 },
		network: { tenant: "package_registries", customer: null },
		tools: { tenant: ["read"], customer: null },
		connectors: {},
		usage: { allowance: 40_000, used: 10_900, reservations: 0, reservationJobs: 0, resets: WORKSPACE_CYCLE_RESET, reconciliation: [], adjustments: [] },
		costs: simpleCosts("Oct 22", [["Discovery · Claude", "Anthropic Managed Agents, MAXION's account", 10_900, 228_900]]),
		invitations: [],
		sessions: 0,
		stop: { mode: "suspend_tenant", scope: "Whole tenant", reason: "customer_agreement", at: "Oct 22" },
		work: { discovery: 0, agentix: 0, voice: 0, asOf: "09:41" },
		revision: 8,
	},
]

export const initialReceipts = (): Receipt[] => [
	{ id: "r-1", scope: "Northstar Consulting", control: "Voice interviews", change: "Not entitled → Granted until Dec 31", operator: "Maya Chen", reason: "customer_agreement", ticket: "SAL-2207", revision: 13, at: "Oct 12", status: "applied" },
	{ id: "r-2", scope: "Northstar Consulting", control: "Seats", change: "20 → 25 until agreement end", operator: "Maya Chen", reason: "customer_agreement", ticket: "SAL-2140", revision: 12, at: "Oct 3", status: "applied" },
	{ id: "r-3", scope: "Northstar Consulting", control: "Agentix sandbox network ceiling", change: "Package registries → Named hosts", operator: "Luis Ortega", reason: "customer_request", ticket: "SUP-8812", revision: 11, at: "Sep 29", status: "applied" },
	{ id: "r-4", scope: "Kestrel Logistics", control: "Lifecycle", change: "Active → Suspended, offboarding", operator: "Maya Chen", reason: "customer_agreement", ticket: "SAL-1980", revision: 8, at: "Oct 22", status: "cleanup_pending" },
	{ id: "r-5", scope: "Platform", control: "GPT-6 Luna mini", change: "Not qualified → Staging", operator: "Maya Chen", reason: "qualification_change", ticket: "QUAL-77", revision: 31, at: "Oct 20", status: "applied" },
	{ id: "r-6", scope: "Staff access", control: "Staff roles · Tessa Lind", change: "No staff role → Support", operator: "Maya Chen", reason: "security_review", ticket: "OPS-311", revision: 3, at: "Oct 6", status: "applied" },
]

// ── Effective values ─────────────────────────────────────────────────────────────────────────

export type Effective = { value: string; reason: string; allowed: boolean }

export function moduleEffective(tenant: TenantState, key: ModuleKey, platform: PlatformState): Effective {
	const entry = tenant.modules[key]
	const granted = entry.override ?? entry.package
	if (!granted) return { value: "Not entitled", reason: entry.override === false ? "Revoked for this tenant by MAXION" : "Not in the package, and no tenant grant", allowed: false }
	const platformStop = platform.stops[key === "voice" ? "voice" : key]
	if (platformStop) return { value: STOP_LABEL[platformStop.mode], reason: "Stopped platform-wide by MAXION", allowed: false }
	if (tenant.stop) return { value: STOP_LABEL[tenant.stop.mode], reason: `Tenant stop since ${tenant.stop.at}`, allowed: false }
	if (key !== "voice" && tenant.customerModes[key] === "read_only") return { value: "Read-only", reason: "The customer set this module to read-only", allowed: false }
	return { value: "Allowed", reason: "No restriction applies", allowed: true }
}

export const seatCap = (tenant: TenantState) => tenant.seats.package + tenant.seats.amendment
export const overCap = (tenant: TenantState) => tenant.seats.used > seatCap(tenant)

export function modelEffective(task: ModelTask, platform: PlatformState): { routes: string[]; preferred: string | null; reason: string } {
	const ready = (route: string) => { const entry = platform.models.find((model) => model.route === route); return Boolean(entry && entry.readiness === "qualified" && !entry.stopped) }
	const tenantRoutes = task.granted.filter(ready)
	const routes = task.customerAllowed ? task.customerAllowed.filter((route) => tenantRoutes.includes(route)) : tenantRoutes
	const notReady = task.granted.filter((route) => !ready(route))
	if (!routes.length) {
		const why = !task.granted.length ? "No route is granted to this tenant" : task.customerAllowed?.length ? `The customer allows only ${task.customerAllowed.join(", ")}, which isn't available` : "No granted route is ready in Production"
		return { routes, preferred: null, reason: `${why}. New work pauses with a reason; no other model is substituted.` }
	}
	const preferred = task.customerPreferred && routes.includes(task.customerPreferred) ? task.customerPreferred : routes.includes(task.defaultRoute) ? task.defaultRoute : routes[0]
	const reason = task.customerAllowed ? `The customer narrowed this to ${task.customerAllowed.join(", ")}` : notReady.length ? `${notReady.join(", ")} isn't ready in Production` : "No restriction applies"
	return { routes, preferred, reason }
}

export function researchEffective(tenant: TenantState, platform: PlatformState): Effective {
	if (tenant.research.tenant === "off") return { value: "Off", reason: "Turned off for this tenant by MAXION", allowed: false }
	if (tenant.research.customer === "off") return { value: "Off", reason: "The customer turned web research off", allowed: false }
	if (tenant.research.customer === "allowlist") return { value: `Listed domains only (${tenant.research.domains})`, reason: `The customer limited research; MAXION's ${platform.blockedDomains} blocked domains still apply`, allowed: true }
	return { value: "On", reason: `MAXION's ${platform.blockedDomains} blocked domains apply`, allowed: true }
}

const levelIndex = (level: NetworkLevel) => NETWORK_LEVELS.indexOf(level)
export function networkEffective(tenant: TenantState, platform: PlatformState): Effective {
	const candidates: Array<[NetworkLevel, string]> = [[platform.network, "the platform ceiling"], [tenant.network.tenant, "the tenant ceiling MAXION set"]]
	if (tenant.network.customer) candidates.push([tenant.network.customer, "the customer's stricter limit"])
	const [level, source] = candidates.reduce((lowest, next) => levelIndex(next[0]) < levelIndex(lowest[0]) ? next : lowest)
	return { value: NETWORK_LABEL[level], reason: `Limited by ${source}`, allowed: true }
}

export function toolsEffective(tenant: TenantState, platform: PlatformState): { classes: ToolClass[]; reason: string } {
	const tenantSet = tenant.tools.tenant.filter((cls) => platform.tools.includes(cls))
	const classes = tenant.tools.customer ? tenant.tools.customer.filter((cls) => tenantSet.includes(cls)) : tenantSet
	const reason = tenant.tools.customer && classes.length < tenantSet.length ? "The customer narrowed the tool classes" : tenantSet.length < platform.tools.length ? "MAXION granted a subset for this tenant" : "No restriction applies"
	return { classes, reason }
}

export const unitsLabel = (units: number) => units.toLocaleString("en-US")
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
export const usdLabel = (cents: number) => USD.format(cents / 100)

export function costSummary(tenant: TenantState) {
	const { lines } = tenant.costs
	const sum = (evidence: CostEvidence) => lines.filter((line) => line.evidence === evidence).reduce((total, line) => total + (line.cents ?? 0), 0)
	const estimateCents = sum("estimate")
	const knownCents = sum("final") + estimateCents
	const settledUnits = lines.reduce((total, line) => total + line.units, 0)
	return { knownCents, estimateCents, unknown: lines.filter((line) => line.evidence === "unknown").length, settledUnits, perUnit: settledUnits ? knownCents / settledUnits / 100 : null }
}

/* A staff view gets enough of an address to identify the invitation with the customer, not the address. */
export const maskEmail = (email: string) => { const [local, domain] = email.split("@"); return `${local.slice(0, 1)}•••@${domain}` }
export const INVITATION_STATUS_LABEL: Record<StaffInvitation["status"], string> = { pending: "Pending", expired: "Expired", revoked: "Revoked", accepted: "Accepted" }
/* Why a new link can't go out now. A stop denies new sends, and an unknown send is repaired, never resent over. */
export function resendBlocked(tenant: TenantState, invitation: StaffInvitation): string | null {
	if (tenant.stop) return "A stop is in effect, so no invitation can be sent"
	if (invitation.delivery === "unknown") return "Delivery outcome unknown; repair it before sending again"
	return null
}

// ── Creating a tenant (doc 16 release journey step 1, ADM-2 P4.AC-03, IAM-2, COM-1) ─────────────

export type AgreementPackage = { name: string; revision: number; seats: number; allowance: number; modules: Record<ModuleKey, boolean> }
export const PACKAGES: AgreementPackage[] = [
	{ name: "Enterprise · 2026 v3", revision: 7, seats: 20, allowance: 100_000, modules: { discovery: true, agentix: true, voice: false } },
	{ name: "Growth · 2026 v2", revision: 4, seats: 15, allowance: 40_000, modules: { discovery: true, agentix: false, voice: false } },
]

export const SETUP_CODE_MINUTES = 10
export const OWNER_BINDING_MINUTES = 15
const SETUP_CODE = /^[A-Za-z0-9_-]{21}[AQgw]$/
/* One answer for every refusal, so the form can't be used to probe which codes exist. */
export const SETUP_CODE_REFUSED = "This code can't be used. Ask the person to issue a new one."
export type SetupCodeResult = { ok: true; entry: SetupCode; expiresAt: number } | { ok: false; error: string }
export function resolveSetupCode(codes: SetupCode[], input: string, now = Date.now()): SetupCodeResult {
	const code = input.trim()
	if (!SETUP_CODE.test(code)) return { ok: false, error: "A setup code is 22 letters, numbers, hyphens or underscores." }
	const entry = codes.find((item) => item.code === code)
	const expiresAt = entry ? entry.issuedAt + SETUP_CODE_MINUTES * 60_000 : 0
	if (!entry || entry.consumedAt !== null || now >= expiresAt) return { ok: false, error: SETUP_CODE_REFUSED }
	return { ok: true, entry, expiresAt }
}

export type TenantDraft = { name: string; onboardingReference: string; packageName: string; seats: string; allowance: string; modules: Record<ModuleKey, boolean>; agreementEnd: string }
export const packageFor = (name: string) => PACKAGES.find((item) => item.name === name) ?? PACKAGES[0]
export const normalizedName = (name: string) => name.normalize("NFC").trim()

export function draftProblems(draft: TenantDraft, tenants: TenantState[], today = new Date()): Partial<Record<"name" | "onboardingReference" | "seats" | "allowance" | "modules" | "agreementEnd", string>> {
	const problems: ReturnType<typeof draftProblems> = {}
	const name = normalizedName(draft.name)
	if (!name) problems.name = "Add the organization's name."
	else if ([...name].length > 128) problems.name = "Use 128 characters or fewer."
	else if (tenants.some((tenant) => tenant.name.toLowerCase() === name.toLowerCase())) problems.name = "A tenant with this name already exists."
	if (!draft.onboardingReference.trim()) problems.onboardingReference = "Add the onboarding reference."
	if (!/^[1-9]\d*$/.test(draft.seats)) problems.seats = "Enter a whole number of seats, at least 1."
	if (!/^[1-9]\d*$/.test(draft.allowance)) problems.allowance = "Enter a whole number of units, at least 1."
	if (!Object.values(draft.modules).some(Boolean)) problems.modules = "Grant at least one module."
	const end = draft.agreementEnd ? new Date(`${draft.agreementEnd}T00:00:00Z`) : null
	if (!end || Number.isNaN(end.getTime())) problems.agreementEnd = "Choose when the agreement ends."
	else if (end.getTime() <= today.getTime()) problems.agreementEnd = "Choose a date in the future."
	return problems
}

export const agreementEndLabel = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`))
export const clockLabel = (at: number) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(at))
export const moduleList = (modules: Record<ModuleKey, boolean>) => (Object.keys(MODULE_LABEL) as ModuleKey[]).filter((key) => modules[key]).map((key) => MODULE_LABEL[key]).join(", ") || "None"

/*
 * A new tenant starts Pending setup. Nothing is implied: no model route, connector or wide network
 * is granted by default, and each missing piece reads back as a specific gap (doc 21 "Setup").
 */
export function buildTenant(draft: TenantDraft, identity: FirstOwnerIdentity, id: string, now = Date.now()): TenantState {
	const pack = packageFor(draft.packageName)
	const seats = Number.parseInt(draft.seats, 10)
	const end = agreementEndLabel(draft.agreementEnd)
	const moduleEntry = (key: ModuleKey) => ({ package: pack.modules[key], override: draft.modules[key] === pack.modules[key] ? null : draft.modules[key] })
	const ungranted = (task: ModelTask): ModelTask => ({ ...task, granted: [] })
	return {
		id, name: normalizedName(draft.name), region: "US", packageName: pack.name, packageRevision: pack.revision, lifecycle: "pending", updated: "Just now",
		modules: { discovery: moduleEntry("discovery"), agentix: moduleEntry("agentix"), voice: moduleEntry("voice") },
		customerModes: { discovery: "normal", agentix: "normal" },
		seats: { package: pack.seats, amendment: seats - pack.seats, until: `Agreement end, ${end}`, used: 0 },
		models: [ungranted(discoveryModels(null, null)), ungranted(voiceModels()), ungranted(agentixModels(null, null))],
		research: { tenant: "on", customer: "on", domains: 0 },
		network: { tenant: "package_registries", customer: null },
		tools: { tenant: ["read"], customer: null },
		connectors: {},
		usage: { allowance: Number.parseInt(draft.allowance, 10), used: 0, reservations: 0, reservationJobs: 0, resets: WORKSPACE_CYCLE_RESET, reconciliation: [], adjustments: [] },
		costs: NO_COSTS,
		invitations: [],
		sessions: 0,
		setup: { onboardingReference: draft.onboardingReference.trim(), firstOwner: identity, bindingRevision: 1, bindingExpiresAt: now + OWNER_BINDING_MINUTES * 60_000, agreementVersion: 1, agreementEnd: end },
		stop: null,
		work: { discovery: 0, agentix: 0, voice: 0, asOf: "09:41" },
		revision: 1,
	}
}

const TASK_MODULE: Record<string, ModuleKey> = { "discovery-reasoning": "discovery", "discovery-voice": "voice", "agentix-reasoning": "agentix" }
export const missingModelTasks = (tenant: TenantState) => tenant.models.filter((task) => { const entry = tenant.modules[TASK_MODULE[task.id]]; return (entry.override ?? entry.package) && !task.granted.length })
export const ownerBindingExpired = (setup: TenantSetup, now = Date.now()) => now >= setup.bindingExpiresAt

/* Everything still open on a tenant created here, each with its own reason. Empty means nothing is left for staff to publish. */
export function setupGaps(tenant: TenantState, now = Date.now()): string[] {
	if (!tenant.setup) return tenant.setupGap ? [tenant.setupGap] : []
	const missing = missingModelTasks(tenant)
	return [
		ownerBindingExpired(tenant.setup, now) ? "The first Owner's binding expired. It needs a new setup code." : "The first Owner hasn't activated yet.",
		"The agreement is a draft: no charging mode is selected, and it's chosen before activation.",
		...(missing.length ? [`Model routes aren't published for ${missing.map((task) => `${task.module} ${task.task.toLowerCase()}`).join(", ")}.`] : []),
	]
}
