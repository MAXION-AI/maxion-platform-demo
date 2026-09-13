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

export const EXECUTE_TASKS = [
	{ id: "orchestrator", title: "Delivery Orchestrator", status: "Working", detail: "Coordinate packages, dependencies, decisions, and release", files: 6 },
	{ id: "servicenow", title: "ServiceNow", status: "Working", detail: "Publish governed financial-change events and retain delivery status", files: 5 },
	{ id: "mulesoft", title: "MuleSoft", status: "Working", detail: "Validate, transform, queue, retry, and orchestrate journal delivery", files: 7 },
	{ id: "workday", title: "Workday Financials", status: "Working", detail: "Secure, validate, and post the governed journal", files: 5 },
	{ id: "verification", title: "Integration verification", status: "Queued", detail: "Prove request-to-receipt behavior across exact staged artifacts", files: 6 },
] as const

export type ExecuteWorkspaceId = (typeof EXECUTE_TASKS)[number]["id"]

// ——— Execute engagement blueprints ———————————————————————————————————————————
// An engagement carries its own workspaces, branches, seeds, suites, and evidence.
// The ERP set is the flagship and the default; the second approved Plan has its own
// full set; anything else is decomposed from the brief the viewer actually wrote.

export type ExecuteWorkspaceFile = { name: string; path: string; added: number; diff: readonly string[]; repositoryId?: string }

export type ExecuteRepositoryProvider = "GitHub" | "GitLab" | "Bitbucket"

export type ExecuteRepositoryBinding = {
	id: string
	name: string
	provider: ExecuteRepositoryProvider
	mode: "existing" | "new"
	role: string
	branch: string
	defaultBranch: string
	access: "Read" | "Write" | "Review"
	ownerTeam: string
	allowedPaths: readonly string[]
	checks: number
	changedFiles: number
	changeRequest?: string
	status: "connected" | "provisioned" | "review"
}

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

export type ExecuteWorkspaceRole = "Owner" | "Orchestrator collaborator" | "Contributor" | "Reviewer" | "Release approver" | "Viewer"

export type ExecuteWorkspaceMember = {
	id: string
	name: string
	initials: string
	role: ExecuteWorkspaceRole
	presence: "online" | "away" | "offline"
	scope: string
}

export type ExecuteImplementationContext = {
	mission: string
	behavior: readonly string[]
	contracts: readonly string[]
	dependencies: readonly string[]
	doneWhen: readonly string[]
	evidence: readonly string[]
}

export type ExecuteEnvironmentBinding = {
	development: string
	staging: string
	production: string
}

export type ExecuteWorkspaceSpec = {
	id: string
	title: string
	detail: string
	files: number
	profile: ExecuteWorkspaceProfile
	kind?: "orchestrator" | "system" | "verification"
	system?: string
	team?: string
	packages?: readonly string[]
	repositories?: readonly ExecuteRepositoryBinding[]
	authority?: string
	members?: readonly ExecuteWorkspaceMember[]
	environment?: ExecuteEnvironmentBinding
	context?: ExecuteImplementationContext
	presence?: number
	unread?: number
}

export type ExecuteBlueprint = {
	key: string
	scope: string
	artifact: string
	ambient: readonly string[]
	workspaces: readonly ExecuteWorkspaceSpec[]
}

const ERP_WORKSPACE_PROFILES: Record<ExecuteWorkspaceId, ExecuteWorkspaceProfile> = {
	orchestrator: {
		branch: "execute/erp/orchestrator",
		seed: "Coordinate the approved ServiceNow to Workday delivery through MuleSoft without changing the Plan contract.",
		agentIntro: "I bound Plan snapshot PL-24.7 to five authority-scoped workspaces. I’m sequencing dependencies, watching evidence, and will interrupt only for a material decision or environment authority.",
		steerResponse: "I routed that direction to the owning workspace agents and added the result to the candidate gate.",
		steerTarget: "delivery graph",
		steps: ["Bind Plan packages and authority", "Coordinate platform workspaces", "Resolve dependency and evidence gaps", "Assemble the governed release candidate"],
		command: "max execute status --candidate RC-07",
		tests: 27,
		suites: [["Package integrity", 7], ["Dependency graph", 8], ["Authority scopes", 6], ["Candidate readiness", 6]],
		files: [
			{ name: "delivery-manifest.yaml", path: ".maxion/execute", added: 44, diff: ["candidate: RC-07", "+ plan_snapshot: PL-24.7", "+ workspaces: [servicenow, mulesoft, workday]", "+ promotion_policy: exact-artifacts"] },
			{ name: "release-sequence.yaml", path: ".maxion/execute", added: 31, diff: ["release:", "+ - mulesoft", "+ - workday", "+ - servicenow"] },
			{ name: "authority-map.json", path: ".maxion/execute", added: 29, diff: ["{", "+ \"orchestrator\": [\"coordinate\", \"propose\"],", "+ \"production\": \"approval_required\"", "}"] },
		],
		result: "Delivery organization is candidate-ready",
		resultMeta: "5 workspace contracts bound · 3 platform gates tracked · no provider effect",
	},
	servicenow: {
		branch: "execute/erp/servicenow",
		seed: "Implement Plan package SNOW-101: publish approved financial changes and retain delivery status.",
		agentIntro: "I traced the Business Rule, event contract, and callback state model. I’ll implement the publisher, protect replay boundaries, and return with the exact staging artifact.",
		steerResponse: "I applied that direction inside SNOW-101 and preserved the published MuleSoft contract.",
		steerTarget: "ServiceNow publisher",
		steps: ["Read SNOW-101 and instance contract", "Implement event publisher and callback state", "Prove signing, replay, and ACL behavior", "Package the ServiceNow update set"],
		command: "snc test --suite financial-change-publisher",
		tests: 36,
		suites: [["Business Rule", 10], ["Event signing", 9], ["Callback state", 8], ["ACL and replay", 9]],
		files: [
			{ name: "x_max_fin_change.js", path: "servicenow/business-rules", added: 41, diff: ["(function executeRule(current) {", "+ const event = FinancialChange.from(current)", "+ publisher.sendSigned(event)", "})(current)"] },
			{ name: "FinancialChangePublisher.js", path: "servicenow/script-includes", added: 53, diff: ["publish: function(change) {", "+ return this.outbox.enqueue(change, change.id)", "}"] },
			{ name: "financial-change-publisher.spec.js", path: "servicenow/atf", added: 38, repositoryId: "snow-atf", diff: ["describe(\"financial change publisher\", () => {", "+ it(\"does not publish an unapproved change\")", "+ it(\"retains MuleSoft delivery status\")", "})"] },
		],
		result: "ServiceNow update set passed its workspace gate",
		resultMeta: "36 tests passed · update set US-SNOW-101.8 · callback evidence retained",
	},
	mulesoft: {
		branch: "execute/erp/mulesoft",
		seed: "Implement MULE-201 and MULE-202: validate, transform, queue, retry, and deliver journals to Workday.",
		agentIntro: "I bound both Mule packages to the Workday journal contract. I’m implementing the API-led flow, durable retry, idempotency, and DLQ recovery as one owned integration boundary.",
		steerResponse: "I applied that constraint across MULE-201 and MULE-202 and kept the Workday schema pinned.",
		steerTarget: "MuleSoft integration flow",
		steps: ["Read RAML and Workday journal contract", "Implement validation, mapping, and durable queue", "Prove retry, idempotency, and DLQ recovery", "Package the deployable Mule application"],
		command: "mvn test -Dtest=JournalOrchestrationSuite",
		tests: 52,
		suites: [["RAML contract", 12], ["DataWeave mapping", 14], ["Retry and DLQ", 15], ["Duplicate replay", 11]],
		files: [
			{ name: "journal-orchestration.xml", path: "mule/src/main/mule", added: 67, diff: ["<flow name=\"journal-orchestration\">", "+ <validation:is-true expression=\"#[payload.approved]\" />", "+ <vm:publish queueName=\"journal.delivery\" />", "</flow>"] },
			{ name: "to-workday-journal.dwl", path: "mule/src/main/resources", added: 46, diff: ["%dw 2.0", "+ output application/json", "+ --- payload map JournalLine::from"] },
			{ name: "idempotency-policy.xml", path: "policies/idempotency", added: 28, repositoryId: "mule-policies", diff: ["<idempotent-message-validator", "+ idExpression=\"#[attributes.headers.'x-event-id']\"", "+ objectStore=\"journal-idempotency\" />"] },
			{ name: "duplicate-replay.spec.xml", path: "mule/src/test/munit", added: 51, diff: ["<munit:test name=\"duplicate-replay\">", "+ <munit-tools:verify-call processor=\"workday:post\" times=\"1\" />", "</munit:test>"] },
		],
		result: "MuleSoft application passed its workspace gate",
		resultMeta: "52 tests passed · mule-journal-api:2.4.1 · DLQ replay evidence retained",
	},
	workday: {
		branch: "execute/erp/workday",
		seed: "Implement WDAY-301: secure, validate, and post the governed Workday journal.",
		agentIntro: "I traced the integration system user, journal validation rules, and receipt contract. I’ll configure the endpoint, least-privilege security, and atomic posting evidence.",
		steerResponse: "I applied that direction within WDAY-301 without widening the integration system user’s domain access.",
		steerTarget: "Workday journal endpoint",
		steps: ["Read WDAY-301 and tenant security contract", "Configure journal endpoint and validation", "Prove atomic posting and least privilege", "Package the Workday configuration migration"],
		command: "wdx validate journal-integration --tenant impl",
		tests: 34,
		suites: [["Journal schema", 9], ["Business validation", 10], ["Atomic posting", 8], ["Security domains", 7]],
		files: [
			{ name: "Journal_Integration.xml", path: "workday/config", added: 48, diff: ["<Integration_System>", "+ <Name>MAXION Journal Delivery</Name>", "+ <Atomic_Posting>true</Atomic_Posting>", "</Integration_System>"] },
			{ name: "ISU_MAXION_JOURNAL.xml", path: "workday/security", added: 24, diff: ["<Integration_System_User>", "+ <Domain>Post Journals</Domain>", "+ <Domain>View Integration Events</Domain>", "</Integration_System_User>"] },
			{ name: "journal-validation.spec.xml", path: "workday/tests", added: 39, repositoryId: "workday-tests", diff: ["<Scenario name=\"journal validation\">", "+ <Assert path=\"Company_Reference\" required=\"true\" />", "+ <Assert effect=\"atomic-post\" />", "</Scenario>"] },
		],
		result: "Workday configuration passed its workspace gate",
		resultMeta: "34 tests passed · WDAY-JRN-301.5 · least-privilege domains verified",
	},
	verification: {
		branch: "execute/erp/verification",
		seed: "Prove INT-401 against exact staged ServiceNow, MuleSoft, and Workday artifacts.",
		agentIntro: "I’m preparing the cross-platform harness now. I’ll pin exact versions, run the request-to-receipt matrix, classify any failure to its owner, and retain a release-grade evidence pack.",
		steerResponse: "I added that scenario to INT-401 and kept the candidate manifest immutable.",
		steerTarget: "cross-platform E2E matrix",
		steps: ["Pin the candidate manifest", "Run request-to-receipt scenarios", "Classify and route defects", "Seal release and rollback evidence"],
		command: "max e2e run --candidate RC-07 --suite INT-401",
		tests: 41,
		suites: [["Happy path and schema", 11], ["Auth and timeout", 10], ["Retry, duplicate, and DLQ", 12], ["Callback and reconciliation", 8]],
		files: [
			{ name: "RC-07.yaml", path: "e2e/candidates", added: 33, diff: ["candidate: RC-07", "+ servicenow: US-SNOW-101.8", "+ mulesoft: mule-journal-api:2.4.1", "+ workday: WDAY-JRN-301.5"] },
			{ name: "request-to-receipt.spec.ts", path: "e2e/specs", added: 63, diff: ["test(\"approved change reaches a Workday receipt\", async () => {", "+ await expect(serviceNow.status(change)).toBe(\"posted\")", "})"] },
			{ name: "failure-routing.spec.ts", path: "e2e/specs", added: 41, diff: ["test(\"routes duplicate replay to MuleSoft\", async () => {", "+ expect(defect.owner).toBe(\"mulesoft\")", "})"] },
		],
		result: "Candidate RC-07 passed cross-platform verification",
		resultMeta: "41 scenarios passed · evidence EV-RC07-91 · rollback package retained",
	},
}

const ROOT_ADMIN: ExecuteWorkspaceMember = { id: "root-admin", name: "Root Admin", initials: "RA", role: "Owner", presence: "online", scope: "Entire engagement" }
const ANDRE_REYES: ExecuteWorkspaceMember = { id: "andre-reyes", name: "Andre Reyes", initials: "AR", role: "Orchestrator collaborator", presence: "online", scope: "Orchestrator" }
const PRIYA_NAIR: ExecuteWorkspaceMember = { id: "priya-nair", name: "Priya Nair", initials: "PN", role: "Contributor", presence: "online", scope: "ServiceNow" }
const MATEO_RUIZ: ExecuteWorkspaceMember = { id: "mateo-ruiz", name: "Mateo Ruiz", initials: "MR", role: "Contributor", presence: "online", scope: "MuleSoft" }
const MARCUS_LEE: ExecuteWorkspaceMember = { id: "marcus-lee", name: "Marcus Lee", initials: "ML", role: "Contributor", presence: "away", scope: "Workday Financials" }
const ELENA_ORTIZ: ExecuteWorkspaceMember = { id: "elena-ortiz", name: "Elena Ortiz", initials: "EO", role: "Release approver", presence: "offline", scope: "Staging and production" }

const ERP_WORKSPACE_META: Record<ExecuteWorkspaceId, Omit<ExecuteWorkspaceSpec, "id" | "title" | "detail" | "files" | "profile">> = {
	orchestrator: {
		kind: "orchestrator",
		system: "Cross-platform delivery",
		team: "Engagement leadership",
		packages: ["SNOW-101", "MULE-201", "MULE-202", "WDAY-301", "INT-401"],
		repositories: [{ id: "erp-delivery", name: "maxion/erp-modernization-delivery", provider: "GitHub", mode: "existing", role: "Delivery manifest", branch: "execute/erp/orchestrator", defaultBranch: "main", access: "Write", ownerTeam: "Engagement leadership", allowedPaths: [".maxion/execute/**"], checks: 27, changedFiles: 3, changeRequest: "PR 184", status: "review" }],
		authority: "Coordinate, pause, route, propose candidates, and request approvals; cannot alter Plan contracts or deploy silently.",
		members: [ROOT_ADMIN, ANDRE_REYES, ELENA_ORTIZ],
		environment: { development: "All bound worktrees", staging: "Cross-platform staging control", production: "Approval-gated release control" },
		context: {
			mission: "Deliver approved financial changes from ServiceNow to Workday Financials through MuleSoft with complete request-to-receipt evidence.",
			behavior: ["Coordinate workspace agents against Plan dependency order", "Route defects and evidence requests to the owning platform", "Assemble immutable candidates only from verified staged artifacts"],
			contracts: ["L2 SA-04 · governed journal delivery", "L3 TC-17 · signed event and callback", "L4 packages SNOW-101 through INT-401"],
			dependencies: ["ServiceNow publisher precedes cross-platform verification", "MuleSoft schema stays compatible with Workday WDAY-301", "All platform staging receipts required before RC assembly"],
			doneWhen: ["Every platform workspace passes its gate", "RC-07 passes INT-401", "Release approvals and rollback evidence are bound"],
			evidence: ["Plan snapshot PL-24.7", "Architecture decision ADR-118", "Control matrix CTL-09"],
		},
		presence: 3,
		unread: 1,
	},
	servicenow: {
		kind: "system",
		system: "ServiceNow",
		team: "ServiceNow delivery",
		packages: ["SNOW-101"],
		repositories: [
			{ id: "snow-app", name: "maxion/servicenow-financial-change", provider: "GitHub", mode: "existing", role: "Application source", branch: "execute/erp/servicenow", defaultBranch: "main", access: "Write", ownerTeam: "ServiceNow delivery", allowedPaths: ["servicenow/business-rules/**", "servicenow/script-includes/**"], checks: 24, changedFiles: 2, changeRequest: "PR 218", status: "review" },
			{ id: "snow-atf", name: "maxion/servicenow-atf", provider: "GitHub", mode: "existing", role: "Automated test pack", branch: "execute/erp/servicenow-atf", defaultBranch: "main", access: "Write", ownerTeam: "ServiceNow quality", allowedPaths: ["servicenow/atf/**"], checks: 12, changedFiles: 1, changeRequest: "PR #91", status: "review" },
		],
		authority: "Edit the scoped update set, run ATF, request staging, and inspect provider receipts.",
		members: [ROOT_ADMIN, PRIYA_NAIR],
		environment: { development: "PDI · snow-dev-04", staging: "UAT · snow-uat-02", production: "Prod · snow-prod" },
		context: {
			mission: "Publish only approved financial-change records and retain delivery status returned by MuleSoft.",
			behavior: ["Sign the outbound event", "Use the change record as the idempotency source", "Update delivered, rejected, or reconciliation-required status"],
			contracts: ["POST /financial-changes v3", "Header x-event-id is stable across retry", "Callback status follows TC-17 enum"],
			dependencies: ["Consumes approved change state from ServiceNow", "Publishes to MuleSoft journal API", "Receives signed delivery callback"],
			doneWhen: ["ATF suite passes", "Unsigned and replayed events are rejected", "Update set is import-preview clean"],
			evidence: ["SNOW-101 build contract", "CLM-021 approval rule", "ServiceNow ACL inventory"],
		},
		presence: 2,
		unread: 0,
	},
	mulesoft: {
		kind: "system",
		system: "MuleSoft Anypoint",
		team: "Enterprise integration",
		packages: ["MULE-201", "MULE-202"],
		repositories: [
			{ id: "mule-app", name: "maxion/mule-journal-orchestration", provider: "GitLab", mode: "new", role: "Deployable Mule application", branch: "execute/erp/mulesoft", defaultBranch: "main", access: "Write", ownerTeam: "Enterprise integration", allowedPaths: ["mule/**", "pom.xml"], checks: 41, changedFiles: 3, changeRequest: "MR !42", status: "provisioned" },
			{ id: "mule-policies", name: "maxion/mule-shared-policies", provider: "GitLab", mode: "existing", role: "Shared reliability policies", branch: "execute/erp/mulesoft-idempotency", defaultBranch: "main", access: "Write", ownerTeam: "Integration platform", allowedPaths: ["policies/idempotency/**"], checks: 11, changedFiles: 1, changeRequest: "MR !117", status: "review" },
		],
		authority: "Edit the Mule application, run MUnit, publish to Exchange, request staging, and operate the scoped DLQ.",
		members: [ROOT_ADMIN, MATEO_RUIZ],
		environment: { development: "CloudHub dev · us-east-2", staging: "CloudHub staging · us-east-2", production: "CloudHub prod · us-east-2" },
		context: {
			mission: "Validate, transform, queue, retry, and deliver the approved journal to Workday without duplicate financial effects.",
			behavior: ["Validate signed ServiceNow events", "Transform into Workday journal schema", "Retry transient failures and route terminal failures to the DLQ"],
			contracts: ["RAML journal-api v3", "DataWeave journal schema 2026.4", "Idempotency receipt retained for 30 days"],
			dependencies: ["Consumes ServiceNow SNOW-101", "Calls Workday WDAY-301", "Returns TC-17 delivery status"],
			doneWhen: ["MUnit suite passes", "Duplicate replay causes one Workday call", "DLQ recovery retains the original event identity"],
			evidence: ["MULE-201 API contract", "MULE-202 reliability contract", "Threat model TM-44"],
		},
		presence: 2,
		unread: 2,
	},
	workday: {
		kind: "system",
		system: "Workday Financials",
		team: "Workday delivery",
		packages: ["WDAY-301"],
		repositories: [
			{ id: "workday-config", name: "maxion/workday-journal-delivery", provider: "Bitbucket", mode: "existing", role: "Configuration migration", branch: "execute/erp/workday", defaultBranch: "main", access: "Write", ownerTeam: "Workday delivery", allowedPaths: ["workday/config/**", "workday/security/**"], checks: 25, changedFiles: 2, changeRequest: "PR #76", status: "review" },
			{ id: "workday-tests", name: "maxion/workday-contract-tests", provider: "Bitbucket", mode: "new", role: "Contract verification", branch: "execute/erp/workday-contracts", defaultBranch: "main", access: "Write", ownerTeam: "Workday quality", allowedPaths: ["workday/tests/**"], checks: 9, changedFiles: 1, changeRequest: "PR #1", status: "provisioned" },
		],
		authority: "Edit the scoped configuration migration, validate in implementation tenant, and request promotion.",
		members: [ROOT_ADMIN, MARCUS_LEE],
		environment: { development: "Implementation tenant · WD-IMPL", staging: "Preview tenant · WD-PREV", production: "Production tenant · WD-PROD" },
		context: {
			mission: "Accept the governed journal, validate its business dimensions, and post atomically with a durable receipt.",
			behavior: ["Authenticate the MuleSoft integration system user", "Validate company, ledger, balancing, and period", "Post all journal lines atomically"],
			contracts: ["Workday Journal Import v42.1", "Atomic batch semantics", "Receipt includes Workday journal and integration event references"],
			dependencies: ["Receives MULE-202 payload", "Uses approved finance security group", "Returns receipt to MuleSoft callback path"],
			doneWhen: ["Validation suite passes", "Partial posting is impossible", "Security domains contain no unrelated finance access"],
			evidence: ["WDAY-301 build contract", "Finance authority decision DEC-31", "Security review SEC-77"],
		},
		presence: 1,
		unread: 0,
	},
	verification: {
		kind: "verification",
		system: "Cross-platform verification",
		team: "Integration quality",
		packages: ["INT-401"],
		repositories: [{ id: "erp-e2e", name: "maxion/erp-integration-e2e", provider: "GitHub", mode: "existing", role: "Cross-platform verification", branch: "execute/erp/verification", defaultBranch: "main", access: "Write", ownerTeam: "Integration quality", allowedPaths: ["e2e/**"], checks: 41, changedFiles: 3, changeRequest: "PR #64", status: "review" }],
		authority: "Pin staged artifacts, run non-production E2E, route defects, and seal evidence; cannot modify platform workspaces.",
		members: [ROOT_ADMIN, ANDRE_REYES, ELENA_ORTIZ],
		environment: { development: "Ephemeral harness", staging: "Shared integration stage", production: "Post-release verification only" },
		context: {
			mission: "Prove the complete approved-change to Workday-receipt flow against an immutable release candidate.",
			behavior: ["Pin exact staged artifacts", "Run happy, hostile, recovery, and reconciliation scenarios", "Classify failures and route them with reproduction evidence"],
			contracts: ["INT-401 scenario catalog", "Candidate manifest is immutable", "Evidence pack EV-RC07-91"],
			dependencies: ["ServiceNow, MuleSoft, and Workday staging receipts", "Compatible Plan snapshot PL-24.7", "No unresolved platform workspace blockers"],
			doneWhen: ["41 scenarios pass", "Zero unclassified failures", "Rollback and release verification steps are retained"],
			evidence: ["INT-401 verification contract", "E2E risk matrix RM-12", "Release policy REL-08"],
		},
		presence: 3,
		unread: 1,
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
	workspaces: EXECUTE_TASKS.map((task) => ({ id: task.id, title: task.title, detail: task.detail, files: task.files, profile: ERP_WORKSPACE_PROFILES[task.id], ...ERP_WORKSPACE_META[task.id] })),
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

// Workspace units are one number with one denominator. The sidebar meter, the dashboard
// stat, and the Usage page all read this — a meter that disagrees with its own rows is the
// fastest way to lose a viewer's trust in everything else on the surface.
export const WORKSPACE_USAGE_ROWS = [
	{ module: "Discovery", units: 12_480 },
	{ module: "Plan", units: 8_140 },
	{ module: "Execute", units: 14_620 },
	{ module: "Agentix", units: 6_320 },
] as const

export const WORKSPACE_UNIT_CAP = 108_000
export const WORKSPACE_UNITS_USED = WORKSPACE_USAGE_ROWS.reduce((sum, row) => sum + row.units, 0)
export const WORKSPACE_UNITS_PERCENT = Math.round((WORKSPACE_UNITS_USED / WORKSPACE_UNIT_CAP) * 100)
export const workspaceUnitsLabel = (units: number) => units.toLocaleString("en-US")
// The cycle closes with the calendar month, so the reset never drifts into the past.
export const WORKSPACE_CYCLE_RESET = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
	.format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
