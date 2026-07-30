export type MaxionModuleId =
	| "dashboard"
	| "projects"
	| "discovery"
	| "plan"
	| "execute"
	| "agentix"
	| "consult"
	| "settings"
	| "integrations"
	| "approvals"
	| "usage"
	| "help"

export type PortalProject = {
	id: string
	name: string
	description: string
	status: "active" | "archived"
	role: "Owner" | "Member" | "Viewer"
	updated: string
	plan?: string
	discovery?: string
	members: Array<{ initials: string; name: string }>
}

export type ExecuteLaunchIntent = {
	source: "prompt" | "plan"
	title: string
	brief: string
	autoStart: boolean
}

export const INITIAL_PROJECTS: PortalProject[] = [
	{
		id: "erp-modernization",
		name: "ERP modernization",
		description: "Modernize finance operations across SAP, QuickBooks, Salesforce, and ServiceNow.",
		status: "active",
		role: "Owner",
		updated: "12 minutes ago",
		plan: "ERP modernization delivery plan",
		discovery: "Third-party onboarding control redesign",
		members: [
			{ initials: "RA", name: "Root Admin" },
			{ initials: "AR", name: "Andre Reyes" },
			{ initials: "SL", name: "Sarah Liu" },
		],
	},
	{
		id: "northbridge",
		name: "NorthBridge acquisition",
		description: "Operating diligence and 100-day value-creation planning for NorthBridge Analytics.",
		status: "active",
		role: "Member",
		updated: "Yesterday",
		plan: "NorthBridge 100-day plan",
		discovery: "NorthBridge acquisition diligence",
		members: [
			{ initials: "EP", name: "Elena Park" },
			{ initials: "MR", name: "Marcus Reed" },
		],
	},
	{
		id: "customer-360",
		name: "Customer 360",
		description: "Unify account, support, and adoption data into an owned customer intelligence model.",
		status: "active",
		role: "Viewer",
		updated: "4 days ago",
		plan: "Customer data foundation",
		members: [
			{ initials: "JT", name: "Jordan Taylor" },
			{ initials: "KM", name: "Kai Morgan" },
		],
	},
	{
		id: "pricing-transformation",
		name: "Pricing transformation",
		description: "Completed pricing governance and commercial operating-model redesign.",
		status: "archived",
		role: "Owner",
		updated: "Jun 18",
		plan: "Pricing transformation roadmap",
		discovery: "Pricing transformation",
		members: [{ initials: "RA", name: "Root Admin" }],
	},
]

export const PLAN_WORKSTREAMS = [
	{ id: "foundation", name: "Mission authority foundation", owner: "Platform architecture", items: 18, status: "Ready", confidence: 94 },
	{ id: "integration", name: "ServiceNow and controls integration", owner: "Enterprise integration", items: 24, status: "In review", confidence: 87 },
	{ id: "controls", name: "Financial control migration", owner: "Finance operations", items: 16, status: "Ready", confidence: 91 },
	{ id: "adoption", name: "Operating model and adoption", owner: "Transformation office", items: 12, status: "Needs owner", confidence: 76 },
] as const

export const EXECUTE_TASKS = [
	{ id: "authority", title: "Build mission authority API", status: "Working", detail: "Implement typed policy and approval boundaries", files: 7 },
	{ id: "adapter", title: "Add ServiceNow event adapter", status: "Queued", detail: "Map approved financial-change events", files: 5 },
	{ id: "reconcile", title: "Implement durable reconciliation", status: "Queued", detail: "Detect and repair cross-system drift", files: 9 },
	{ id: "replay", title: "Prove tenant-safe replay", status: "Queued", detail: "Exercise hostile retries and duplicate-effect prevention", files: 6 },
	{ id: "evidence", title: "Prepare release evidence", status: "Queued", detail: "Assemble audit, rollback, and release-owner evidence", files: 8 },
] as const

export type ExecuteWorkspaceId = (typeof EXECUTE_TASKS)[number]["id"]

// ——— Execute engagement blueprints ———————————————————————————————————————————
// An engagement carries its own workspaces, branches, seeds, suites, and evidence.
// The ERP set is the flagship and the default; the second approved Plan has its own
// full set; anything else is decomposed from the brief the viewer actually wrote.

export type ExecuteWorkspaceFile = { name: string; path: string; added: number; diff: readonly string[] }

export type ExecuteWorkspaceProfile = {
	branch: string
	seed: string
	agentIntro: string
	steerResponse: string
	steerTarget: string
	steps: readonly [string, string, string, string]
	command: string
	tests: number
	suites: ReadonlyArray<readonly [string, number]>
	files: readonly ExecuteWorkspaceFile[]
	result: string
	resultMeta: string
}

export type ExecuteWorkspaceSpec = { id: string; title: string; detail: string; files: number; profile: ExecuteWorkspaceProfile }

export type ExecuteBlueprint = {
	key: string
	scope: string
	artifact: string
	ambient: readonly string[]
	workspaces: readonly ExecuteWorkspaceSpec[]
}

const ERP_WORKSPACE_PROFILES: Record<ExecuteWorkspaceId, ExecuteWorkspaceProfile> = {
	authority: {
		branch: "execute/erp/authority",
		seed: "Implement the approved mission-authority boundary while preserving the public API.",
		agentIntro: "I mapped the outcome to the repository, approved Plan, and authority policy. I’ll implement the typed boundary, repair failures, and return with release evidence.",
		steerResponse: "I’ve applied that direction to the authority contract without widening repository or deployment scope.",
		steerTarget: "authority contract",
		steps: ["Read repository instructions and Plan evidence", "Implement mission authority contract", "Add hostile authority and replay tests", "Run cumulative release gate"],
		command: "pnpm test mission-authority --runInBand",
		tests: 48,
		suites: [["Authority unit suite", 18], ["Tenant isolation", 9], ["Service contracts", 13], ["Cumulative gate", 8]],
		files: [
			{ name: "missionPolicy.ts", path: "services/authority", added: 34, diff: ["export type MissionAuthority = {", "+ tenantId: TenantId", "+ permittedActions: Action[]", "+ approvalBoundary: Boundary", "}"] },
			{ name: "authority.ts", path: "services/authority", added: 18, diff: ["export async function execute(command, authority) {", "+ await policy.assert(command, authority)", "+ return effects.dispatch(command)", "}"] },
			{ name: "mission-policy.spec.ts", path: "tests/authority", added: 42, diff: ["describe(\"mission policy\", () => {", "+ it(\"rejects actions outside the approved boundary\")", "+ it(\"expires stale authority grants\")", "})"] },
			{ name: "tenant-isolation.spec.ts", path: "tests/authority", added: 27, diff: ["describe(\"tenant isolation\", () => {", "+ it(\"blocks cross-tenant authority reuse\")", "+ it(\"scopes receipts to the issuing tenant\")", "})"] },
		],
		result: "Mission authority API passed its release gate",
		resultMeta: "TypeScript clean · tenant isolation verified · no production effect",
	},
	adapter: {
		branch: "execute/erp/adapter",
		seed: "Implement the approved ServiceNow financial-change adapter with replay-safe event handling.",
		agentIntro: "I traced the existing connector contract and isolated the approved financial-change events. I’ll add typed translation, deduplication, and contract evidence inside this worktree.",
		steerResponse: "I’ve scoped that direction to the ServiceNow adapter and will prove it against the existing connector contract.",
		steerTarget: "ServiceNow adapter",
		steps: ["Read connector contracts and event fixtures", "Map approved ServiceNow events", "Implement replay-safe deduplication", "Run adapter contract suite"],
		command: "pnpm test servicenow-adapter --runInBand",
		tests: 36,
		suites: [["Event translation", 12], ["Signature validation", 9], ["Replay safety", 7], ["Connector contracts", 8]],
		files: [
			{ name: "serviceNowAdapter.ts", path: "services/connectors", added: 41, diff: ["export function translate(event: ServiceNowEvent) {", "+ const change = mapFinancialChange(event)", "+ return withDeduplication(change)", "}"] },
			{ name: "financialEvent.ts", path: "services/connectors/contracts", added: 23, diff: ["export type ApprovedFinancialEvent = {", "+ eventId: ServiceNowEventId", "+ approvedChange: FinancialChange", "+ deduplicationKey: string", "}"] },
			{ name: "deduplication.ts", path: "services/connectors", added: 19, diff: ["export function withDeduplication(change) {", "+ const key = deduplicationKey(change)", "+ if (journal.has(key)) return replaySafe(change)", "}"] },
			{ name: "servicenow-adapter.spec.ts", path: "tests/connectors", added: 38, diff: ["describe(\"servicenow adapter\", () => {", "+ it(\"drops replayed events by deduplication key\")", "+ it(\"rejects unsigned provider payloads\")", "})"] },
		],
		result: "ServiceNow adapter passed its contract gate",
		resultMeta: "36 tests passed · replay safety verified · provider writes disabled",
	},
	reconcile: {
		branch: "execute/erp/reconcile",
		seed: "Implement durable reconciliation across approved ERP effects and retained provider receipts.",
		agentIntro: "I found the receipt and effect boundaries for the approved providers. I’ll add a durable journal, drift detection, and repair planning without granting new effect authority.",
		steerResponse: "I’ve added that constraint to reconciliation planning; repair remains evidence-first and approval-bound.",
		steerTarget: "reconciliation journal",
		steps: ["Trace effect receipts and provider state", "Implement durable reconciliation journal", "Add drift detection and repair planning", "Run cross-provider failure suite"],
		command: "pnpm test reconciliation --runInBand",
		tests: 42,
		suites: [["Journal durability", 11], ["Drift detection", 13], ["Repair planning", 10], ["Provider failures", 8]],
		files: [
			{ name: "reconciliationJournal.ts", path: "services/reconciliation", added: 52, diff: ["export class ReconciliationJournal {", "+ append(receipt: EffectReceipt): JournalEntry", "+ replay(from: Checkpoint): AsyncIterable<Entry>", "}"] },
			{ name: "driftDetector.ts", path: "services/reconciliation", added: 37, diff: ["export function detectDrift(observed, journal) {", "+ const expected = journal.project(observed.provider)", "+ return diffStates(expected, observed)", "}"] },
			{ name: "repairPlan.ts", path: "services/reconciliation", added: 29, diff: ["export function planRepair(drift: DriftReport) {", "+ const steps = orderByDependency(drift.effects)", "+ return { steps, requiresApproval: true }", "}"] },
			{ name: "reconciliation.spec.ts", path: "tests/reconciliation", added: 45, diff: ["describe(\"reconciliation\", () => {", "+ it(\"survives a provider outage mid-journal\")", "+ it(\"never repairs without an approval\")", "})"] },
		],
		result: "Reconciliation workspace passed its failure gate",
		resultMeta: "42 tests passed · receipts retained · repairs remain approval-bound",
	},
	replay: {
		branch: "execute/erp/replay",
		seed: "Prove hostile retries cannot escape tenant boundaries or create duplicate effects.",
		agentIntro: "I isolated the retry, tenant, and idempotency boundaries. I’ll generate hostile replay cases and keep every provider effect mocked.",
		steerResponse: "I’ve folded that case into the replay matrix and kept the assertion tenant-scoped.",
		steerTarget: "replay matrix",
		steps: ["Map retry and tenant boundaries", "Generate hostile replay matrix", "Assert duplicate-effect prevention", "Run tenant-isolation suite"],
		command: "pnpm test hostile-replay --runInBand",
		tests: 31,
		suites: [["Tenant crossover", 8], ["Duplicate retries", 9], ["Expired authority", 7], ["Idempotency receipts", 7]],
		files: [
			{ name: "hostileReplay.spec.ts", path: "tests/security", added: 61, diff: ["describe(\"hostile replay\", () => {", "+ it(\"rejects a replayed grant from another tenant\")", "+ expect(effectDispatch).not.toRun()", "})"] },
			{ name: "idempotency.spec.ts", path: "tests/security", added: 44, diff: ["describe(\"idempotency\", () => {", "+ it(\"returns the original receipt on retry\")", "+ expect(receipt).toRemainUnique()", "})"] },
			{ name: "tenantBoundary.ts", path: "services/authority", added: 16, diff: ["export function assertTenant(scope: TenantScope) {", "+ if (scope.tenantId !== authority.tenantId) throw deny()", "}"] },
			{ name: "replayFixtures.ts", path: "tests/fixtures", added: 28, diff: ["// Hostile fixtures stay mocked — no provider effects.", "+ export const hostileTenantId = tenant(\"attacker\")", "+ export const replayedGrant = expired(hostileTenantId)"] },
		],
		result: "Hostile replay suite passed",
		resultMeta: "31 tests passed · no cross-tenant access · no duplicate effects",
	},
	evidence: {
		branch: "execute/erp/evidence",
		seed: "Prepare a release evidence package with rollback, provenance, and owner-ready review material.",
		agentIntro: "I’m assembling the verified workspace outputs into one reviewable package. I’ll retain source fingerprints, rollback instructions, and the exact production authority boundary.",
		steerResponse: "I’ve added that evidence request to the release package and preserved its source attribution.",
		steerTarget: "release evidence package",
		steps: ["Collect verified workspace outputs", "Bind source and actor provenance", "Generate rollback and release notes", "Validate owner review package"],
		command: "pnpm test release-evidence --runInBand",
		tests: 26,
		suites: [["Evidence integrity", 7], ["Source provenance", 8], ["Rollback package", 5], ["Owner review", 6]],
		files: [
			{ name: "releaseEvidence.ts", path: "services/release", added: 39, diff: ["export function buildEvidence(workspaces) {", "+ const fingerprints = workspaces.map(sourceFingerprint)", "+ return { fingerprints, productionAuthority: false }", "}"] },
			{ name: "rollbackPlan.ts", path: "services/release", added: 31, diff: ["export function rollbackManifest(release) {", "+ retainArtifact(release.previous)", "+ return compatibilityChecks(release)", "}"] },
			{ name: "provenance.ts", path: "services/audit", added: 22, diff: ["export function bindProvenance(entry: AuditEntry) {", "+ entry.actor = currentActor()", "+ entry.sourceFingerprint = hash(entry.artifact)", "}"] },
			{ name: "release-evidence.spec.ts", path: "tests/release", added: 35, diff: ["describe(\"release evidence\", () => {", "+ it(\"binds every artifact to a source fingerprint\")", "+ it(\"keeps the rollback package owner-ready\")", "})"] },
		],
		result: "Release evidence package is owner-ready",
		resultMeta: "26 tests passed · rollback retained · production authority not granted",
	},
}

const ERP_BLUEPRINT: ExecuteBlueprint = {
	key: "erp",
	scope: "5 flows · 17 evidence-linked build packages",
	artifact: "8f37c2",
	ambient: [
		"Watching main for drift · no divergence",
		"Evidence sealed · fingerprint 8f37c2",
		"Rollback package retained · one revision back",
		"5 worktrees held for review · production authority not granted",
	],
	workspaces: EXECUTE_TASKS.map((task) => ({ id: task.id, title: task.title, detail: task.detail, files: task.files, profile: ERP_WORKSPACE_PROFILES[task.id] })),
}

const CUSTOMER_BLUEPRINT: ExecuteBlueprint = {
	key: "customer",
	scope: "11 outcomes · 38 evidence-linked delivery items",
	artifact: "c41d90",
	ambient: [
		"Watching main for drift · no divergence",
		"Evidence sealed · fingerprint c41d90",
		"Consent boundary re-checked · zero exceptions",
		"5 worktrees held for review · production authority not granted",
	],
	workspaces: [
		{
			id: "identity",
			title: "Resolve customer identity",
			detail: "Merge account, support, and adoption records into one identity",
			files: 8,
			profile: {
				branch: "execute/customer/identity",
				seed: "Implement the approved customer identity resolution across CRM, support, and product records.",
				agentIntro: "I mapped the approved source systems and the survivorship rules the Plan settled. I’ll implement deterministic matching first, hold low-confidence pairs for review, and return with evidence.",
				steerResponse: "I’ve applied that direction to the identity resolver without widening the approved source systems.",
				steerTarget: "identity resolver",
				steps: ["Read source schemas and survivorship rules", "Implement deterministic identity matching", "Add probabilistic review and conflict tests", "Run cumulative identity gate"],
				command: "pnpm test identity-resolution --runInBand",
				tests: 39,
				suites: [["Deterministic matching", 12], ["Survivorship rules", 10], ["Review queue", 9], ["Cumulative gate", 8]],
				files: [
					{ name: "identityResolver.ts", path: "services/identity", added: 46, diff: ["export function resolveIdentity(records: SourceRecord[]) {", "+ const matched = matchOnVerifiedKeys(records)", "+ return survivorship.apply(matched)", "}"] },
					{ name: "survivorship.ts", path: "services/identity", added: 28, diff: ["export const survivorship = {", "+ order: [\"crm\", \"support\", \"product\"],", "+ apply: (candidates) => pickWinner(candidates, order)", "}"] },
					{ name: "reviewQueue.ts", path: "services/identity", added: 21, diff: ["export function queueForReview(pair: CandidatePair) {", "+ if (pair.confidence >= 0.94) return autoMerge(pair)", "+ return review.enqueue(pair)", "}"] },
					{ name: "identity-resolution.spec.ts", path: "tests/identity", added: 44, diff: ["describe(\"identity resolution\", () => {", "+ it(\"never merges across tenant boundaries\")", "+ it(\"holds low-confidence pairs for review\")", "})"] },
				],
				result: "Identity resolution passed its release gate",
				resultMeta: "39 tests passed · no cross-tenant merges · no source writes",
			},
		},
		{
			id: "adoption",
			title: "Ingest product adoption events",
			detail: "Stream approved product events into the customer model",
			files: 6,
			profile: {
				branch: "execute/customer/adoption",
				seed: "Implement the approved product-adoption event ingest with replay-safe ordering.",
				agentIntro: "I traced the published event contract and the customer model’s write boundary. I’ll add typed ingestion, ordering guarantees for late arrivals, and contract evidence inside this worktree.",
				steerResponse: "I’ve scoped that direction to the adoption ingest and will prove it against the published event contract.",
				steerTarget: "adoption ingest",
				steps: ["Read the event contract and fixtures", "Implement typed adoption ingest", "Guarantee ordering for late arrivals", "Run ingest contract suite"],
				command: "pnpm test adoption-events --runInBand",
				tests: 33,
				suites: [["Event translation", 11], ["Ordering guarantees", 8], ["Late arrivals", 7], ["Contract checks", 7]],
				files: [
					{ name: "adoptionIngest.ts", path: "services/adoption", added: 43, diff: ["export function ingest(event: AdoptionEvent) {", "+ const typed = toCanonicalEvent(event)", "+ return withWatermark(typed)", "}"] },
					{ name: "eventContract.ts", path: "services/adoption/contracts", added: 25, diff: ["export type CanonicalAdoptionEvent = {", "+ accountId: AccountId", "+ feature: FeatureKey", "+ observedAt: IsoTimestamp", "}"] },
					{ name: "watermark.ts", path: "services/adoption", added: 18, diff: ["export function withWatermark(event) {", "+ if (event.observedAt < watermark.floor) return late(event)", "+ return accept(event)", "}"] },
					{ name: "adoption-events.spec.ts", path: "tests/adoption", added: 36, diff: ["describe(\"adoption events\", () => {", "+ it(\"orders events behind the watermark\")", "+ it(\"rejects events for unapproved features\")", "})"] },
				],
				result: "Adoption ingest passed its contract gate",
				resultMeta: "33 tests passed · ordering proven · product writes disabled",
			},
		},
		{
			id: "consent",
			title: "Enforce the consent boundary",
			detail: "Honor consent and residency on every customer read",
			files: 7,
			profile: {
				branch: "execute/customer/consent",
				seed: "Enforce the approved consent and residency boundary on every customer read path.",
				agentIntro: "I found every read path into the customer model and the consent flags the Plan approved. I’ll enforce the boundary at the query layer so no surface can opt out of it.",
				steerResponse: "I’ve added that constraint to the consent boundary; enforcement stays at the query layer.",
				steerTarget: "consent boundary",
				steps: ["Trace every customer read path", "Enforce consent at the query layer", "Add residency and revocation tests", "Run cross-surface failure suite"],
				command: "pnpm test consent-boundary --runInBand",
				tests: 45,
				suites: [["Query enforcement", 14], ["Residency rules", 12], ["Revocation", 11], ["Surface coverage", 8]],
				files: [
					{ name: "consentGuard.ts", path: "services/consent", added: 51, diff: ["export function guard(query: CustomerQuery) {", "+ const consent = consentFor(query.subject)", "+ return consent.allows(query.purpose) ? query : deny()", "}"] },
					{ name: "residency.ts", path: "services/consent", added: 33, diff: ["export function assertResidency(subject: Subject) {", "+ if (subject.region !== request.region) throw outOfRegion()", "}"] },
					{ name: "revocation.ts", path: "services/consent", added: 26, diff: ["export function revoke(subject: Subject) {", "+ cache.invalidate(subject.id)", "+ return journal.append(revocationReceipt(subject))", "}"] },
					{ name: "consent-boundary.spec.ts", path: "tests/consent", added: 47, diff: ["describe(\"consent boundary\", () => {", "+ it(\"blocks reads the subject never consented to\")", "+ it(\"honors revocation inside the same session\")", "})"] },
				],
				result: "Consent boundary passed its failure gate",
				resultMeta: "45 tests passed · residency enforced · revocation honored in session",
			},
		},
		{
			id: "dedupe",
			title: "Prove replay-safe deduplication",
			detail: "Exercise duplicate feeds and out-of-order retries",
			files: 5,
			profile: {
				branch: "execute/customer/dedupe",
				seed: "Prove duplicate feeds and retries cannot create duplicate customers or lose updates.",
				agentIntro: "I isolated the retry, ordering, and idempotency boundaries. I’ll generate hostile duplicate feeds and keep every downstream effect mocked.",
				steerResponse: "I’ve folded that case into the duplicate-feed matrix and kept the assertion tenant-scoped.",
				steerTarget: "duplicate-feed matrix",
				steps: ["Map retry and ordering boundaries", "Generate hostile duplicate feeds", "Assert no duplicate customers", "Run tenant-isolation suite"],
				command: "pnpm test dedupe-replay --runInBand",
				tests: 29,
				suites: [["Duplicate feeds", 9], ["Out-of-order retries", 8], ["Idempotency receipts", 6], ["Tenant crossover", 6]],
				files: [
					{ name: "dedupeReplay.spec.ts", path: "tests/security", added: 58, diff: ["describe(\"dedupe replay\", () => {", "+ it(\"collapses a replayed feed into one customer\")", "+ expect(customerWrites).toHaveLength(1)", "})"] },
					{ name: "idempotencyKeys.ts", path: "services/identity", added: 22, diff: ["export function ingestKey(record: SourceRecord) {", "+ return hash(record.system, record.externalId, record.version)", "}"] },
					{ name: "orderingFixtures.ts", path: "tests/fixtures", added: 31, diff: ["// Hostile fixtures stay mocked — no downstream effects.", "+ export const duplicatedFeed = replay(sourceFeed, 3)", "+ export const reorderedFeed = shuffle(sourceFeed)"] },
					{ name: "tenantScope.spec.ts", path: "tests/security", added: 40, diff: ["describe(\"tenant scope\", () => {", "+ it(\"never merges records across tenants\")", "+ it(\"returns the original receipt on retry\")", "})"] },
				],
				result: "Duplicate-feed replay suite passed",
				resultMeta: "29 tests passed · no duplicate customers · no lost updates",
			},
		},
		{
			id: "modelevidence",
			title: "Package customer model evidence",
			detail: "Assemble lineage, rollback, and owner review material",
			files: 6,
			profile: {
				branch: "execute/customer/evidence",
				seed: "Prepare the customer data foundation evidence package with lineage, rollback, and owner review.",
				agentIntro: "I’m assembling the verified workspace outputs into one reviewable package. I’ll retain field-level lineage, rollback instructions, and the exact data authority boundary.",
				steerResponse: "I’ve added that evidence request to the release package and preserved its source attribution.",
				steerTarget: "release evidence package",
				steps: ["Collect verified workspace outputs", "Bind field-level lineage", "Generate rollback and release notes", "Validate owner review package"],
				command: "pnpm test model-evidence --runInBand",
				tests: 24,
				suites: [["Lineage integrity", 7], ["Source provenance", 6], ["Rollback package", 5], ["Owner review", 6]],
				files: [
					{ name: "modelEvidence.ts", path: "services/release", added: 37, diff: ["export function buildEvidence(workspaces) {", "+ const lineage = workspaces.flatMap(fieldLineage)", "+ return { lineage, productionAuthority: false }", "}"] },
					{ name: "lineage.ts", path: "services/release", added: 29, diff: ["export function fieldLineage(field: ModelField) {", "+ return field.sources.map(sourceFingerprint)", "}"] },
					{ name: "rollbackPlan.ts", path: "services/release", added: 24, diff: ["export function rollbackManifest(release) {", "+ retainSnapshot(release.previous)", "+ return compatibilityChecks(release)", "}"] },
					{ name: "model-evidence.spec.ts", path: "tests/release", added: 33, diff: ["describe(\"model evidence\", () => {", "+ it(\"binds every field to a source fingerprint\")", "+ it(\"keeps the rollback package owner-ready\")", "})"] },
				],
				result: "Customer model evidence package is owner-ready",
				resultMeta: "24 tests passed · lineage retained · production authority not granted",
			},
		},
	],
}

// Words that never name the work. Stripping them leaves the nouns a decomposition
// can be built from, so "Build the approved mission-authority boundary…" yields
// "mission-authority boundary" rather than "build the".
const BRIEF_STOPWORDS = new Set([
	"a", "an", "the", "and", "or", "but", "for", "with", "without", "to", "of", "in", "on", "into", "across", "from", "by", "at", "as", "that", "this", "its", "it", "our", "we", "us", "you", "your", "every", "all", "any", "so", "then", "when", "while", "is", "are", "be", "can", "will", "should", "must",
	"approved", "new", "please", "just", "also", "up", "out", "over", "under",
	"build", "implement", "create", "add", "make", "deliver", "ship", "wire", "write", "prove", "verify", "keep", "preserve", "return", "ensure", "run", "use", "set", "give", "let", "need", "want", "do", "fix", "update",
	"replace", "migrate", "refactor", "modernize", "rewrite", "extend", "harden", "remove", "delete", "expose", "enable", "automate", "connect", "integrate", "improve", "reduce", "split", "move", "port", "upgrade", "introduce", "design", "launch", "prepare", "finish", "complete",
])

// Identifiers are built from letters and digits only, so "tenant-safe billing" becomes
// tenantSafeBilling rather than tenant-safeBilling.
const identifierTokens = (words: readonly string[]) => words.flatMap((word) => word.split(/[^\p{L}\p{N}]+/u)).filter(Boolean)

const camelFrom = (words: readonly string[]) => words.map((word, index) => index === 0 ? word.toLowerCase() : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join("")
const pascalFrom = (words: readonly string[]) => words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join("")

function briefFingerprint(value: string) {
	let hash = 0
	for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0
	return hash
}

function splitSuites(total: number, names: readonly [string, string, string, string]): ReadonlyArray<readonly [string, number]> {
	const first = Math.max(3, Math.round(total * 0.34))
	const second = Math.max(3, Math.round(total * 0.26))
	const third = Math.max(3, Math.round(total * 0.22))
	return [[names[0], first], [names[1], second], [names[2], third], [names[3], Math.max(2, total - first - second - third)]]
}

// A prompt (or an approved Plan without a hand-authored set) is decomposed into three
// workspaces named after the brief itself — the branches, seeds, suites, and diffs all
// carry the viewer's own subject instead of replaying the ERP story.
function deriveBlueprint(brief: string): ExecuteBlueprint {
	const cleaned = brief.replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter(Boolean)
	const significant = cleaned.filter((word) => !BRIEF_STOPWORDS.has(word.toLowerCase()))
	const source = significant.length ? significant : cleaned
	// Two nouns name most outcomes; a third only earns its place when the first two are short.
	const takeThree = source.length > 2 && `${source[0]}${source[1]}`.length < 18
	const words = source.slice(0, takeThree ? 3 : 2)
	const subjectWords = words.length ? words : ["delivery", "outcome"]
	const subject = subjectWords.join(" ")
	const slug = subjectWords.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32) || "delivery-outcome"
	const tokens = identifierTokens(subjectWords)
	const camel = camelFrom(tokens)
	const pascal = pascalFrom(tokens)
	const fingerprint = briefFingerprint(slug)
	const core = 26 + (fingerprint % 14)
	const integrate = 19 + (fingerprint % 11)
	const prove = 16 + (fingerprint % 9)
	return {
		key: `derived-${slug}`,
		scope: "3 workspaces · decomposed from your brief",
		artifact: fingerprint.toString(16).padStart(6, "0").slice(0, 6),
		ambient: [
			"Watching main for drift · no divergence",
			`Evidence sealed · fingerprint ${fingerprint.toString(16).padStart(6, "0").slice(0, 6)}`,
			"Rollback package retained · one revision back",
			"3 worktrees held for review · production authority not granted",
		],
		workspaces: [
			{
				id: "derived-core",
				title: `Build ${subject}`,
				detail: "Implement the typed boundary this outcome describes",
				files: 7,
				profile: {
					branch: `execute/${slug}/core`,
					seed: brief.trim(),
					agentIntro: `I read the repository instructions and mapped your outcome onto ${subject}. I’ll implement the typed boundary, repair failures, and return with evidence.`,
					steerResponse: `I’ve applied that direction to the ${subject} contract without widening repository or deployment scope.`,
					steerTarget: `${subject} contract`,
					steps: ["Read repository instructions and existing contracts", `Implement the ${subject} contract`, "Add boundary and regression tests", "Run cumulative release gate"],
					command: `pnpm test ${slug} --runInBand`,
					tests: core,
					suites: splitSuites(core, ["Contract unit suite", "Boundary rules", "Regression coverage", "Cumulative gate"]),
					files: [
						{ name: `${camel}Contract.ts`, path: `services/${slug}`, added: 38, diff: [`export type ${pascal}Boundary = {`, "+ tenantId: TenantId", "+ permittedActions: Action[]", "+ evidence: EvidenceRef", "}"] },
						{ name: `${camel}.ts`, path: `services/${slug}`, added: 24, diff: [`export async function apply${pascal}(command, authority) {`, "+ await policy.assert(command, authority)", "+ return effects.dispatch(command)", "}"] },
						{ name: `${slug}.spec.ts`, path: `tests/${slug}`, added: 41, diff: [`describe("${subject}", () => {`, "+ it(\"rejects work outside the approved boundary\")", "+ it(\"keeps the existing public API stable\")", "})"] },
						{ name: `${slug}-regression.spec.ts`, path: `tests/${slug}`, added: 29, diff: ["describe(\"regression\", () => {", "+ it(\"preserves existing callers\")", "+ it(\"leaves unrelated modules untouched\")", "})"] },
					],
					result: `${subject.charAt(0).toUpperCase()}${subject.slice(1)} passed its release gate`,
					resultMeta: "TypeScript clean · boundary verified · no production effect",
				},
			},
			{
				id: "derived-integrate",
				title: `Integrate ${subject}`,
				detail: "Connect the approved systems and contracts",
				files: 5,
				profile: {
					branch: `execute/${slug}/integrate`,
					seed: `Wire ${subject} through the approved systems without widening effect authority.`,
					agentIntro: `I traced the systems this outcome touches and isolated their approved contracts. I’ll wire ${subject} through them and prove the boundary with contract tests.`,
					steerResponse: `I’ve scoped that direction to the ${subject} integration and will prove it against the existing contracts.`,
					steerTarget: `${subject} integration`,
					steps: ["Read the connected system contracts", `Map ${subject} onto approved contracts`, "Implement replay-safe translation", "Run integration contract suite"],
					command: `pnpm test ${slug}-integration --runInBand`,
					tests: integrate,
					suites: splitSuites(integrate, ["Translation", "Signature validation", "Replay safety", "Contract checks"]),
					files: [
						{ name: `${camel}Gateway.ts`, path: `services/${slug}/integration`, added: 33, diff: [`export function translate(event: ${pascal}Event) {`, "+ const change = mapApprovedChange(event)", "+ return withDeduplication(change)", "}"] },
						{ name: "contracts.ts", path: `services/${slug}/integration`, added: 19, diff: [`export type Approved${pascal}Event = {`, "+ eventId: EventId", "+ deduplicationKey: string", "}"] },
						{ name: `${slug}-integration.spec.ts`, path: `tests/${slug}`, added: 36, diff: ["describe(\"integration\", () => {", "+ it(\"drops replayed events by deduplication key\")", "+ it(\"rejects unsigned payloads\")", "})"] },
					],
					result: `${subject.charAt(0).toUpperCase()}${subject.slice(1)} integration passed its contract gate`,
					resultMeta: `${integrate} tests passed · replay safety verified · provider writes disabled`,
				},
			},
			{
				id: "derived-prove",
				title: `Prove ${subject}`,
				detail: "Exercise hostile paths and duplicate effects",
				files: 4,
				profile: {
					branch: `execute/${slug}/prove`,
					seed: `Prove hostile retries against ${subject} cannot escape tenant boundaries or duplicate effects.`,
					agentIntro: `I isolated the retry, tenant, and idempotency boundaries around ${subject}. I’ll generate hostile cases and keep every external effect mocked.`,
					steerResponse: `I’ve folded that case into the ${subject} failure matrix and kept the assertion tenant-scoped.`,
					steerTarget: `${subject} failure matrix`,
					steps: ["Map retry and tenant boundaries", "Generate the hostile case matrix", "Assert duplicate-effect prevention", "Run tenant-isolation suite"],
					command: `pnpm test ${slug}-replay --runInBand`,
					tests: prove,
					suites: splitSuites(prove, ["Tenant crossover", "Duplicate retries", "Expired authority", "Idempotency receipts"]),
					files: [
						{ name: `${slug}-replay.spec.ts`, path: "tests/security", added: 54, diff: [`describe("${subject} replay", () => {`, "+ it(\"rejects a replayed grant from another tenant\")", "+ expect(effectDispatch).not.toRun()", "})"] },
						{ name: `${camel}Fixtures.ts`, path: "tests/fixtures", added: 27, diff: ["// Hostile fixtures stay mocked — no external effects.", "+ export const hostileTenantId = tenant(\"attacker\")", "+ export const replayedGrant = expired(hostileTenantId)"] },
						{ name: "tenantScope.ts", path: `services/${slug}`, added: 15, diff: ["export function assertTenant(scope: TenantScope) {", "+ if (scope.tenantId !== authority.tenantId) throw deny()", "}"] },
					],
					result: `${subject.charAt(0).toUpperCase()}${subject.slice(1)} survived the hostile suite`,
					resultMeta: `${prove} tests passed · no cross-tenant access · no duplicate effects`,
				},
			},
		],
	}
}

const AUTHORED_BLUEPRINTS: Record<string, ExecuteBlueprint> = {
	"ERP modernization delivery": ERP_BLUEPRINT,
	"Customer data foundation": CUSTOMER_BLUEPRINT,
}

// Derived sets are cached by brief so re-entering an engagement keeps the same
// workspaces, branches, and fingerprints instead of regenerating them per render.
const derivedCache = new Map<string, ExecuteBlueprint>()

export function resolveExecuteBlueprint(engagement: ExecuteLaunchIntent): ExecuteBlueprint {
	const authored = AUTHORED_BLUEPRINTS[engagement.title]
	if (authored) return authored
	const brief = engagement.brief.trim() || engagement.title
	const cached = derivedCache.get(brief)
	if (cached) return cached
	const blueprint = deriveBlueprint(brief)
	derivedCache.set(brief, blueprint)
	return blueprint
}

export const EXECUTE_FLAGSHIP_ENGAGEMENT: ExecuteLaunchIntent = {
	source: "plan",
	title: "ERP modernization delivery",
	brief: "Implement the approved ERP modernization outcomes with tenant-safe authority boundaries.",
	autoStart: false,
}
