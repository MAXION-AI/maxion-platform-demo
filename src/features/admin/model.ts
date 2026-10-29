/*
 * MAXION's staff admin panel (maxion-agent-platform docs 21, ADM-1 and ADM-2): tenants, the
 * typed controls MAXION publishes for each one, and the receipts those changes leave. A control
 * is read back in layers (platform or package baseline, the tenant amendment, the customer's
 * own restriction) and resolves to one effective value with the reason that limits it. Seeded
 * demo state only; nothing reaches a provider.
 */
import { CONNECTORS, INITIAL_MEMBERS, INITIAL_POLICY, NETWORK_LABEL, NETWORK_LEVELS, ORGANIZATION, SEATS, TOOL_CLASS_LABEL, type ConnectorKey, type NetworkLevel, type ToolClass } from "@/features/organization/model"

export { NETWORK_LABEL, NETWORK_LEVELS, TOOL_CLASS_LABEL }
export type { NetworkLevel, ToolClass }

export const STAFF = { name: "Maya Chen", initials: "MC", roles: ["Platform Owner", "Operator"] as const }
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
		usage: { allowance: 10_000, used: 6_420, reservations: 340, reservationJobs: 3, resets: "Nov 1", reconciliation: ["Agentix case AR-2291: the provider hasn't reported final usage. Its reservation stays held and the cost is unknown."], adjustments: [{ id: "adj-1", at: "Oct 14", units: 200, reason: "Commercial correction", ticket: "COM-118" }] },
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
		usage: { allowance: 10_000, used: 3_180, reservations: 120, reservationJobs: 1, resets: "Nov 1", reconciliation: [], adjustments: [] },
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
		usage: { allowance: 4_000, used: 3_940, reservations: 260, reservationJobs: 2, resets: "Nov 1", reconciliation: [], adjustments: [] },
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
		usage: { allowance: 12_000, used: 2_210, reservations: 0, reservationJobs: 0, resets: "Nov 1", reconciliation: [], adjustments: [] },
		stop: null,
		work: { discovery: 3, agentix: 0, voice: 1, asOf: "09:41" },
		revision: 11,
	},
	{
		id: "brightwater", name: "Brightwater Health", region: "US", packageName: "Enterprise · 2026 v3", packageRevision: 7, lifecycle: "pending", setupGap: "Model routes for Agentix aren't published yet, so setup is incomplete.", updated: "Today 07:20",
		modules: { discovery: { package: true, override: null }, agentix: { package: true, override: null }, voice: { package: false, override: null } },
		customerModes: { discovery: "normal", agentix: "normal" },
		seats: { package: 20, amendment: 0, until: "—", used: 1 },
		models: [discoveryModels(null, null), voiceModels(), { ...agentixModels(null, null), granted: [] }],
		research: { tenant: "on", customer: "on", domains: 0 },
		network: { tenant: "package_registries", customer: null },
		tools: { tenant: ["read"], customer: null },
		connectors: {},
		usage: { allowance: 10_000, used: 0, reservations: 0, reservationJobs: 0, resets: "Nov 1", reconciliation: [], adjustments: [] },
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
		usage: { allowance: 4_000, used: 1_090, reservations: 0, reservationJobs: 0, resets: "Nov 1", reconciliation: [], adjustments: [] },
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
