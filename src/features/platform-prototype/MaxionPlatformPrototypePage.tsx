import {
	ArrowRight,
	ArrowLeft,
	Bell,
	CaretRight,
	ChatCircleText,
	Check,
	CheckCircle,
	CirclesThree,
	Clock,
	Code,
	Database,
	DotsThree,
	FileText,
	FlowArrow,
	Lightning,
	LinkSimple,
	ListChecks,
	MagnifyingGlass,
	Paperclip,
	Pause,
	Play,
	Plug,
	Plus,
	ShieldCheck,
	Sparkle,
	SpinnerGap,
	TerminalWindow,
	Tray,
	Users,
} from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useLocation } from "react-router-dom"

import { useDocumentTitle } from "@/app/hooks/useDocumentTitle"
import { AgentixPrototypePage } from "@/features/agentix/prototype/AgentixPrototypePage"
import { DiscoveryAutonomousPrototypePage } from "@/features/discovery-autonomous/DiscoveryAutonomousPrototypePage"

import { MaxionSpiralMark, PortalSidebar, PRIMARY_NAVIGATION } from "./PortalChrome"
import {
	AccountUtilityModule,
	DashboardModule,
	ExecuteHubModule,
	IntegrationsModule,
	PlanLibraryModule,
	ProjectsModule,
} from "./PortalReplicaModules"
import {
	EXECUTE_TASKS,
	INITIAL_PROJECTS,
	type ExecuteLaunchIntent,
	type MaxionModuleId,
	type PortalProject,
} from "./model"
import "./maxion-platform-prototype.css"
import "./portal-replica.css"
import "./execute-agentic.css"
import "./plan-agentic.css"
import "./maxion-unified-system.css"

type PlanView = "run" | "architecture" | "backlog" | "roadmap" | "questions" | "evidence" | "approvals"
type PlanArchitectureLevel = "L2" | "L3" | "L4"
type ExecuteRunState = "idle" | "running" | "verified"
type ExecuteWorkspaceView = "activity" | "topology" | "changes" | "tests" | "terminal" | "deploys" | "audit"
type ExecuteWorkspaceId = (typeof EXECUTE_TASKS)[number]["id"]

type ExecuteWorkspaceProfile = {
	branch: string
	seed: string
	agentIntro: string
	steerResponse: string
	steps: readonly [string, string, string, string]
	command: string
	tests: number
	suites: ReadonlyArray<readonly [string, number]>
	files: ReadonlyArray<{ name: string; path: string; added: number }>
	diff: readonly string[]
	result: string
	resultMeta: string
}

const EXECUTE_WORKSPACE_PROFILES: Record<ExecuteWorkspaceId, ExecuteWorkspaceProfile> = {
	authority: {
		branch: "execute/erp/authority",
		seed: "Implement the approved mission-authority boundary while preserving the public API.",
		agentIntro: "I mapped the outcome to the repository, approved Plan, and authority policy. I’ll implement the typed boundary, repair failures, and return with release evidence.",
		steerResponse: "I’ve applied that direction to the authority contract without widening repository or deployment scope.",
		steps: ["Read repository instructions and Plan evidence", "Implement mission authority contract", "Add hostile authority and replay tests", "Run cumulative release gate"],
		command: "pnpm test mission-authority --runInBand",
		tests: 48,
		suites: [["Authority unit suite", 18], ["Tenant isolation", 9], ["Service contracts", 13], ["Cumulative gate", 8]],
		files: [
			{ name: "missionPolicy.ts", path: "services/authority", added: 34 },
			{ name: "authority.ts", path: "services/authority", added: 18 },
			{ name: "mission-policy.spec.ts", path: "tests/authority", added: 42 },
			{ name: "tenant-isolation.spec.ts", path: "tests/authority", added: 27 },
		],
		diff: ["tenantId: TenantId", "permittedActions: Action[]", "approvalBoundary: Boundary"],
		result: "Mission authority API passed its release gate",
		resultMeta: "TypeScript clean · tenant isolation verified · no production effect",
	},
	adapter: {
		branch: "execute/erp/adapter",
		seed: "Implement the approved ServiceNow financial-change adapter with replay-safe event handling.",
		agentIntro: "I traced the existing connector contract and isolated the approved financial-change events. I’ll add typed translation, deduplication, and contract evidence inside this worktree.",
		steerResponse: "I’ve scoped that direction to the ServiceNow adapter and will prove it against the existing connector contract.",
		steps: ["Read connector contracts and event fixtures", "Map approved ServiceNow events", "Implement replay-safe deduplication", "Run adapter contract suite"],
		command: "pnpm test servicenow-adapter --runInBand",
		tests: 36,
		suites: [["Event translation", 12], ["Signature validation", 9], ["Replay safety", 7], ["Connector contracts", 8]],
		files: [
			{ name: "serviceNowAdapter.ts", path: "services/connectors", added: 41 },
			{ name: "financialEvent.ts", path: "services/connectors/contracts", added: 23 },
			{ name: "deduplication.ts", path: "services/connectors", added: 19 },
			{ name: "servicenow-adapter.spec.ts", path: "tests/connectors", added: 38 },
		],
		diff: ["eventId: ServiceNowEventId", "approvedChange: FinancialChange", "deduplicationKey: string"],
		result: "ServiceNow adapter passed its contract gate",
		resultMeta: "36 tests passed · replay safety verified · provider writes disabled",
	},
	reconcile: {
		branch: "execute/erp/reconcile",
		seed: "Implement durable reconciliation across approved ERP effects and retained provider receipts.",
		agentIntro: "I found the receipt and effect boundaries for the approved providers. I’ll add a durable journal, drift detection, and repair planning without granting new effect authority.",
		steerResponse: "I’ve added that constraint to reconciliation planning; repair remains evidence-first and approval-bound.",
		steps: ["Trace effect receipts and provider state", "Implement durable reconciliation journal", "Add drift detection and repair planning", "Run cross-provider failure suite"],
		command: "pnpm test reconciliation --runInBand",
		tests: 42,
		suites: [["Journal durability", 11], ["Drift detection", 13], ["Repair planning", 10], ["Provider failures", 8]],
		files: [
			{ name: "reconciliationJournal.ts", path: "services/reconciliation", added: 52 },
			{ name: "driftDetector.ts", path: "services/reconciliation", added: 37 },
			{ name: "repairPlan.ts", path: "services/reconciliation", added: 29 },
			{ name: "reconciliation.spec.ts", path: "tests/reconciliation", added: 45 },
		],
		diff: ["receiptId: EffectReceiptId", "observedState: ProviderState", "repairRequiresApproval: true"],
		result: "Reconciliation workspace passed its failure gate",
		resultMeta: "42 tests passed · receipts retained · repairs remain approval-bound",
	},
	replay: {
		branch: "execute/erp/replay",
		seed: "Prove hostile retries cannot escape tenant boundaries or create duplicate effects.",
		agentIntro: "I isolated the retry, tenant, and idempotency boundaries. I’ll generate hostile replay cases and keep every provider effect mocked.",
		steerResponse: "I’ve folded that case into the replay matrix and kept the assertion tenant-scoped.",
		steps: ["Map retry and tenant boundaries", "Generate hostile replay matrix", "Assert duplicate-effect prevention", "Run tenant-isolation suite"],
		command: "pnpm test hostile-replay --runInBand",
		tests: 31,
		suites: [["Tenant crossover", 8], ["Duplicate retries", 9], ["Expired authority", 7], ["Idempotency receipts", 7]],
		files: [
			{ name: "hostileReplay.spec.ts", path: "tests/security", added: 61 },
			{ name: "idempotency.spec.ts", path: "tests/security", added: 44 },
			{ name: "tenantBoundary.ts", path: "services/authority", added: 16 },
			{ name: "replayFixtures.ts", path: "tests/fixtures", added: 28 },
		],
		diff: ["tenantId: hostileTenantId", "expect(effectDispatch).not.toRun()", "expect(receipt).toRemainUnique()"],
		result: "Hostile replay suite passed",
		resultMeta: "31 tests passed · no cross-tenant access · no duplicate effects",
	},
	evidence: {
		branch: "execute/erp/evidence",
		seed: "Prepare a release evidence package with rollback, provenance, and owner-ready review material.",
		agentIntro: "I’m assembling the verified workspace outputs into one reviewable package. I’ll retain source fingerprints, rollback instructions, and the exact production authority boundary.",
		steerResponse: "I’ve added that evidence request to the release package and preserved its source attribution.",
		steps: ["Collect verified workspace outputs", "Bind source and actor provenance", "Generate rollback and release notes", "Validate owner review package"],
		command: "pnpm test release-evidence --runInBand",
		tests: 26,
		suites: [["Evidence integrity", 7], ["Source provenance", 8], ["Rollback package", 5], ["Owner review", 6]],
		files: [
			{ name: "releaseEvidence.ts", path: "services/release", added: 39 },
			{ name: "rollbackPlan.ts", path: "services/release", added: 31 },
			{ name: "provenance.ts", path: "services/audit", added: 22 },
			{ name: "release-evidence.spec.ts", path: "tests/release", added: 35 },
		],
		diff: ["sourceFingerprint: EvidenceHash", "rollbackPlan: RollbackManifest", "productionAuthority: false"],
		result: "Release evidence package is owner-ready",
		resultMeta: "26 tests passed · rollback retained · production authority not granted",
	},
}

function MaxionMark({ size = 30 }: { size?: number }) {
	return <span className="mxp-mark" style={{ width: size, height: size }} aria-hidden="true"><MaxionSpiralMark className="mxp-mark-spiral" /></span>
}

function Status({ children, tone = "neutral", live = false }: { children: ReactNode; tone?: "neutral" | "live" | "attention" | "success" | "info"; live?: boolean }) {
	return <span className={`mxp-status mxp-status--${tone}`}><i className={live ? "is-live" : ""} />{children}</span>
}

function ModuleHeader({ label, title, detail, onCommand, actions }: { label: string; title: string; detail?: string; onCommand: () => void; actions?: ReactNode }) {
	return (
		<header className="mxp-module-header">
			<div><span>{label}</span><strong>{title}</strong>{detail ? <small>{detail}</small> : null}</div>
			<div className="mxp-header-actions"><button type="button" className="mxp-search" aria-label="Search MAXION" onClick={onCommand}><MagnifyingGlass size={15} /><span>Search or ask</span><kbd>⌘K</kbd></button>{actions}<button type="button" aria-label="Notifications"><Bell size={16} /></button></div>
		</header>
	)
}

function ContextRail({ title, kicker, children, footer }: { title: string; kicker?: string; children: ReactNode; footer?: ReactNode }) {
	return <aside className="mxp-context-rail"><div className="mxp-context-brand"><MaxionMark size={27} /><div><strong>{title}</strong>{kicker ? <small>{kicker}</small> : null}</div></div><div className="mxp-context-body">{children}</div><div className="mxp-context-footer">{footer}</div></aside>
}

function PlanModule({
	projects,
	onCommand,
	onSendToExecute,
	onNavigate,
}: {
	projects: PortalProject[]
	onCommand: () => void
	onSendToExecute: () => void
	onNavigate: (module: MaxionModuleId) => void
}) {
	const [workspaceOpen, setWorkspaceOpen] = useState(false)
	if (!workspaceOpen) {
		return <PlanLibraryModule projects={projects} onOpenPlan={() => setWorkspaceOpen(true)} onNavigate={onNavigate} />
	}
	return <PlanWorkspaceModule onBack={() => setWorkspaceOpen(false)} onCommand={onCommand} onSendToExecute={onSendToExecute} />
}

type PlanFlow = {
	id: string
	number: string
	key: string
	title: string
	summary: string
	owner: string
	evidence: string
	items: number
	dependsOn: string
	risk: string
	levels: Record<PlanArchitectureLevel, {
		name: string
		focus: string
		nodes: ReadonlyArray<{
			title: string
			detail: string
			tone: "source" | "core" | "store" | "effect"
			team?: string
			artifact?: string
			x?: number
			y?: number
			width?: number
		}>
		guidance: readonly string[]
	}>
}

const PLAN_FLOWS: readonly PlanFlow[] = [
	{
		id: "authority", number: "01", key: "CMP-AUTH-01", title: "Mission authority and approval boundary", owner: "Platform architecture", evidence: "27 verified claims", items: 7, dependsOn: "Discovery decision D-14", risk: "High",
		summary: "Make authority explicit before any agent or integration can create an external financial effect.",
		levels: {
			L2: { name: "System context", focus: "Who can request, approve, and execute a governed mission.", nodes: [{ title: "Business owner", detail: "Requests outcome", tone: "source" }, { title: "MAXION authority", detail: "Evaluates scope + policy", tone: "core" }, { title: "Approval owner", detail: "Grants bounded authority", tone: "source" }, { title: "Execute", detail: "Receives signed mission", tone: "effect" }], guidance: ["Separate request intent from effect authority", "Fail closed when owner, tenant, or policy is absent", "Persist actor, source, scope, and approval provenance"] },
			L3: { name: "Service interaction", focus: "Services and contracts required to grant a runnable mission.", nodes: [{ title: "Plan API", detail: "Mission proposal", tone: "source" }, { title: "Policy service", detail: "Tenant-scoped evaluation", tone: "core" }, { title: "Approval ledger", detail: "Immutable decision", tone: "store" }, { title: "Execute API", detail: "Verified mission token", tone: "effect" }], guidance: ["Version the mission contract", "Authorize every read and mutation server-side", "Use an immutable approval ledger with correlation IDs"] },
			L4: { name: "Implementation sequence", focus: "Typed request, policy decision, durable approval, and verified handoff.", nodes: [{ title: "createMission()", detail: "Validate typed scope", tone: "source" }, { title: "evaluatePolicy()", detail: "Resolve tenant + role", tone: "core" }, { title: "recordApproval()", detail: "Idempotent transaction", tone: "store" }, { title: "issueMission()", detail: "Short-lived signed grant", tone: "effect" }], guidance: ["Require an idempotency key on create and approve", "Cover cross-tenant IDs, expired grants, and replay attempts", "Acceptance: no runnable mission exists without durable approval"] },
		},
	},
	{
		id: "adapter", number: "02", key: "CMP-INT-02", title: "ServiceNow to Workday financial integration", owner: "Enterprise integration", evidence: "19 connector claims", items: 8, dependsOn: "CMP-AUTH-01", risk: "High",
		summary: "Move an approved financial change from ServiceNow into Workday Financials through a governed MuleSoft integration, with an auditable receipt returned to the originating record.",
		levels: {
			L2: { name: "Solution architecture", focus: "The business outcome, system boundaries, integration pattern, and delivery-team ownership.", nodes: [{ title: "ServiceNow", detail: "Financial change workflow · source record", tone: "source", team: "ServiceNow team", artifact: "System of workflow", x: 5, y: 42, width: 22 }, { title: "MuleSoft", detail: "Validate, orchestrate, transform, and route", tone: "core", team: "MuleSoft team", artifact: "Integration control plane", x: 39, y: 42, width: 22 }, { title: "Workday Financials", detail: "Validate and post accounting journal", tone: "effect", team: "Workday team", artifact: "Financial system of record", x: 73, y: 42, width: 22 }], guidance: ["ServiceNow owns workflow intent; Workday owns the posted financial result", "MuleSoft is the only cross-system integration path", "A Workday journal ID and status return to the originating ServiceNow record"] },
			L3: { name: "Technical architecture", focus: "Deployable components, API contracts, security controls, data movement, and runtime failure behavior.", nodes: [{ title: "Outbound Flow", detail: "Approved record trigger", tone: "source", team: "ServiceNow team", artifact: "Flow Designer", x: 2, y: 43, width: 14 }, { title: "Experience API", detail: "POST event · validate JWT", tone: "core", team: "MuleSoft team", artifact: "financial-change-api", x: 19, y: 43, width: 14 }, { title: "Process API", detail: "Map, authorize, orchestrate", tone: "core", team: "MuleSoft team", artifact: "finance-process-api", x: 36, y: 43, width: 14 }, { title: "Anypoint MQ", detail: "Durable retry + DLQ", tone: "store", team: "MuleSoft team", artifact: "finance-change-q", x: 53, y: 43, width: 14 }, { title: "System API", detail: "Workday OAuth + adapter", tone: "core", team: "MuleSoft team", artifact: "workday-finance-api", x: 70, y: 43, width: 14 }, { title: "Journal API", detail: "Validate and post journal", tone: "effect", team: "Workday team", artifact: "Accounting Journal", x: 87, y: 43, width: 11 }], guidance: ["Lock the versioned event and journal contracts before teams build in parallel", "Use OAuth 2.0, mTLS, correlation IDs, and field-level data classification", "Persist retries in Anypoint MQ and send terminal failures to a monitored dead-letter queue"] },
			L4: { name: "Build architecture", focus: "Team-owned work packages, dependency order, configuration artifacts, tests, and acceptance evidence.", nodes: [{ title: "SNOW-101", detail: "Publish approved change event", tone: "source", team: "ServiceNow team", artifact: "Flow + REST message", x: 3, y: 23, width: 16 }, { title: "MULE-201", detail: "Build ingress contract", tone: "core", team: "MuleSoft team", artifact: "Experience API", x: 22, y: 23, width: 16 }, { title: "MULE-202", detail: "Transform + orchestrate", tone: "core", team: "MuleSoft team", artifact: "Process + System APIs", x: 41, y: 23, width: 16 }, { title: "WDAY-301", detail: "Secure journal endpoint", tone: "effect", team: "Workday team", artifact: "ISU + journal config", x: 60, y: 23, width: 16 }, { title: "INT-401", detail: "Prove end-to-end contract", tone: "store", team: "Joint delivery", artifact: "E2E evidence pack", x: 79, y: 23, width: 18 }], guidance: ["Each package names its owner, build artifact, prerequisite contract, and done condition", "Teams build in parallel only after INT-01 and INT-02 are baselined", "Acceptance: one approved ServiceNow change creates one Workday journal and returns one durable receipt"] },
		},
	},
	{
		id: "reconcile", number: "03", key: "CMP-REC-03", title: "Durable reconciliation and drift repair", owner: "Finance platform", evidence: "31 system claims", items: 9, dependsOn: "CMP-INT-02", risk: "High",
		summary: "Compare intended and observed provider state, then propose bounded repairs without silently widening authority.",
		levels: {
			L2: { name: "System context", focus: "How MAXION proves intended finance state matches provider reality.", nodes: [{ title: "Approved intent", detail: "Expected state", tone: "source" }, { title: "Reconciliation", detail: "Compare + classify", tone: "core" }, { title: "Provider state", detail: "SAP + QuickBooks", tone: "effect" }, { title: "Finance owner", detail: "Reviews material drift", tone: "source" }], guidance: ["Keep intent and observation independently durable", "Classify benign, repairable, and blocking drift", "Never auto-repair outside the original mission boundary"] },
			L3: { name: "Service interaction", focus: "Journals, provider readers, drift evaluation, and repair planning.", nodes: [{ title: "Effect journal", detail: "Expected receipts", tone: "store" }, { title: "Provider readers", detail: "Observed snapshots", tone: "source" }, { title: "Drift engine", detail: "Policy classification", tone: "core" }, { title: "Repair planner", detail: "Approval-bound action", tone: "effect" }], guidance: ["Page and checkpoint provider scans", "Make comparison deterministic and versioned", "Circuit-break failing providers without losing journal progress"] },
			L4: { name: "Implementation sequence", focus: "Checkpointed observation, deterministic comparison, and governed repair.", nodes: [{ title: "loadIntent()", detail: "Receipt + target", tone: "store" }, { title: "observeProvider()", detail: "Timed read", tone: "source" }, { title: "classifyDrift()", detail: "Pure rules", tone: "core" }, { title: "proposeRepair()", detail: "No implicit effect", tone: "effect" }], guidance: ["Store cursors and checkpoints outside process memory", "Test slow, partial, and contradictory provider responses", "Acceptance: repair plans remain idempotent and approval-bound"] },
		},
	},
	{
		id: "replay", number: "04", key: "CMP-SEC-04", title: "Tenant-safe retry and replay protection", owner: "Security engineering", evidence: "22 control claims", items: 6, dependsOn: "CMP-AUTH-01 · CMP-REC-03", risk: "Critical",
		summary: "Ensure retries, duplicate deliveries, and hostile identifiers cannot cross tenants or repeat an external effect.",
		levels: {
			L2: { name: "System context", focus: "Trust boundaries around every retried or replayed mission.", nodes: [{ title: "Caller", detail: "Tenant + idempotency key", tone: "source" }, { title: "Authority boundary", detail: "Authenticate + authorize", tone: "core" }, { title: "Replay ledger", detail: "Scoped uniqueness", tone: "store" }, { title: "Provider effect", detail: "Exactly-once outcome", tone: "effect" }], guidance: ["Scope all identities and keys to tenant", "Reject user-supplied resource IDs from another tenant", "Return the retained receipt for valid duplicate requests"] },
			L3: { name: "Service interaction", focus: "Gateway, policy, idempotency, outbox, and receipt contracts.", nodes: [{ title: "Execute gateway", detail: "JWT + request ID", tone: "source" }, { title: "Tenant policy", detail: "Resource ownership", tone: "core" }, { title: "Idempotency ledger", detail: "Tenant/key unique", tone: "store" }, { title: "Effect dispatcher", detail: "Receipt-aware call", tone: "effect" }], guidance: ["Use database uniqueness, not in-memory locks", "Bind stored responses to request fingerprints", "Audit denied cross-tenant access without sensitive payloads"] },
			L4: { name: "Implementation sequence", focus: "Atomic claim, safe dispatch, and replayed receipt response.", nodes: [{ title: "authorizeTenant()", detail: "Server-side scope", tone: "source" }, { title: "claimRequest()", detail: "Atomic insert", tone: "store" }, { title: "dispatchEffect()", detail: "Timeout + retry policy", tone: "effect" }, { title: "retainReceipt()", detail: "Immutable result", tone: "store" }], guidance: ["Hash the canonical request before comparing duplicates", "Exercise concurrent identical and conflicting requests", "Acceptance: 100 parallel retries produce one external effect"] },
		},
	},
	{
		id: "evidence", number: "05", key: "CMP-REL-05", title: "Release evidence and deployment approval", owner: "Release engineering", evidence: "25 governance claims", items: 5, dependsOn: "CMP-REC-03 · CMP-SEC-04", risk: "Medium",
		summary: "Assemble test, provenance, rollback, and authority evidence into one reviewable release decision.",
		levels: {
			L2: { name: "System context", focus: "How verified implementation becomes an owner-approved release.", nodes: [{ title: "Execute workspaces", detail: "Verified outputs", tone: "source" }, { title: "Evidence assembler", detail: "Bind + validate", tone: "core" }, { title: "Release package", detail: "Immutable manifest", tone: "store" }, { title: "Release owner", detail: "Approve deployment", tone: "effect" }], guidance: ["Bind every claim to a source fingerprint", "Include rollback before requesting approval", "Keep production authority separate from build completion"] },
			L3: { name: "Service interaction", focus: "Artifact registry, test evidence, provenance, and release policy.", nodes: [{ title: "Artifact registry", detail: "Workspace outputs", tone: "source" }, { title: "Evidence service", detail: "Integrity validation", tone: "core" }, { title: "Release manifest", detail: "Signed package", tone: "store" }, { title: "Approval service", detail: "Owner decision", tone: "effect" }], guidance: ["Reject stale or mismatched source revisions", "Represent missing evidence explicitly", "Generate a stable, reviewable diff between release candidates"] },
			L4: { name: "Implementation sequence", focus: "Verify inputs, assemble manifest, sign, and request bounded approval.", nodes: [{ title: "collectArtifacts()", detail: "Pinned revisions", tone: "source" }, { title: "verifyEvidence()", detail: "Checksums + gates", tone: "core" }, { title: "signManifest()", detail: "Immutable package", tone: "store" }, { title: "requestRelease()", detail: "Approval only", tone: "effect" }], guidance: ["Make manifest generation deterministic", "Prove rollback instructions against the release candidate", "Acceptance: approval identifies exact artifact hashes and target scope"] },
		},
	},
] as const

type PlanExecutionBrief = {
	outcome: string
	pattern: string
	teams: ReadonlyArray<{ id: string; name: string; system: string; owns: string; delivers: string }>
	contracts: ReadonlyArray<{ id: string; from: string; to: string; transport: string; payload: string; security: string; failure: string }>
	mappings?: ReadonlyArray<{ source: string; target: string; rule: string }>
	workPackages: ReadonlyArray<{ id: string; team: string; title: string; artifact: string; dependsOn: string; doneWhen: string }>
	buildOrder: readonly string[]
}

const PLAN_LEVEL_QUESTIONS: Record<PlanArchitectureLevel, { question: string; audience: string; output: string }> = {
	L2: { question: "Is this the right solution boundary and operating model?", audience: "Solution architect · business and platform owners", output: "Approved systems, responsibilities, integration pattern, and business outcome" },
	L3: { question: "Can every team implement its interfaces without inventing a contract?", audience: "Technical architects · API, security, data, and operations leads", output: "Deployable components, versioned contracts, mappings, security, and failure behavior" },
	L4: { question: "Can each delivery team start building and prove completion?", audience: "Engineering leads · developers · QA and release", output: "Assigned work packages, artifacts, dependencies, tests, evidence, and handoff order" },
}

const PLAN_EXECUTION_BRIEFS: Record<string, PlanExecutionBrief> = {
	authority: {
		outcome: "Only a named approver can grant bounded build authority, and every issued mission can be traced to that decision.",
		pattern: "Policy decision point with an immutable approval ledger and signed short-lived handoff",
		teams: [
			{ id: "product", name: "Plan product team", system: "Plan API", owns: "Mission proposal and scope schema", delivers: "Versioned MissionProposal contract" },
			{ id: "security", name: "Security platform team", system: "Policy service", owns: "Tenant, role, and authority evaluation", delivers: "Policy decision and denial reason" },
			{ id: "execute", name: "Execute platform team", system: "Execute API", owns: "Signed mission verification and consumption", delivers: "Runnable mission receipt" },
		],
		contracts: [
			{ id: "AUTH-01", from: "Plan API", to: "Policy service", transport: "POST /v1/mission-decisions", payload: "MissionProposal v2", security: "Service JWT · tenant claim", failure: "Fail closed; no grant on timeout" },
			{ id: "AUTH-02", from: "Approval ledger", to: "Execute API", transport: "Signed mission token", payload: "MissionGrant v1", security: "EdDSA signature · 15m TTL", failure: "Reject stale, replayed, or wrong-tenant token" },
		],
		workPackages: [
			{ id: "PLAN-101", team: "Plan product team", title: "Create typed mission proposal", artifact: "MissionProposal v2 schema + endpoint", dependsOn: "Discovery decision D-14", doneWhen: "Invalid scopes return a stable 4xx contract" },
			{ id: "AUTH-201", team: "Security platform team", title: "Evaluate and record authority", artifact: "Policy rules + immutable ledger write", dependsOn: "AUTH-01", doneWhen: "Cross-tenant and expired grants are denied and audited" },
			{ id: "EXEC-301", team: "Execute platform team", title: "Verify mission at workspace start", artifact: "MissionGrant verifier", dependsOn: "AUTH-02", doneWhen: "No workspace runs without a current signed grant" },
		],
		buildOrder: ["Baseline MissionProposal and MissionGrant schemas", "Build policy evaluation and ledger transaction", "Integrate Execute verification", "Run replay and cross-tenant release gate"],
	},
	adapter: {
		outcome: "One approved ServiceNow financial change creates one valid Workday accounting journal and writes the Workday journal ID and status back to the source record.",
		pattern: "Asynchronous API-led integration through MuleSoft with durable queueing, idempotency, and status callback",
		teams: [
			{ id: "servicenow", name: "ServiceNow team", system: "ServiceNow", owns: "Approval trigger, source fields, outbound event, and status update", delivers: "ApprovedFinancialChange v1 event" },
			{ id: "mulesoft", name: "MuleSoft integration team", system: "Anypoint Platform", owns: "Ingress, validation, mapping, orchestration, queue, retry, and observability", delivers: "Financial change and Workday system APIs" },
			{ id: "workday", name: "Workday financials team", system: "Workday Financials", owns: "ISU security, journal validation, worktags, posting rules, and response", delivers: "Accounting journal endpoint and receipt" },
		],
		contracts: [
			{ id: "INT-01", from: "ServiceNow", to: "MuleSoft Experience API", transport: "POST /v1/financial-change-events · 202", payload: "ApprovedFinancialChange v1 · JSON", security: "OAuth 2.0 client credentials + mTLS", failure: "3 bounded retries; retain correlation ID; no duplicate event" },
			{ id: "INT-02", from: "MuleSoft System API", to: "Workday Financials", transport: "POST /financialManagement/v1/accountingJournals", payload: "AccountingJournal v1 · JSON", security: "Workday ISU + OAuth 2.0 · least privilege", failure: "15s timeout; exponential retry; terminal errors to DLQ" },
			{ id: "INT-03", from: "MuleSoft callback", to: "ServiceNow source record", transport: "PATCH /api/now/table/u_financial_change/{id}", payload: "JournalReceipt v1 · JSON", security: "Scoped integration user + correlation ID", failure: "Replay-safe update; reconciliation alert after exhaustion" },
		],
		mappings: [
			{ source: "number", target: "External_Reference_ID", rule: "Required · preserve unchanged" },
			{ source: "u_cost_center", target: "Worktags.Cost_Center", rule: "Lookup reference ID; reject unknown values" },
			{ source: "u_amount + u_currency", target: "Journal_Line.Amount + Currency", rule: "Decimal(18,2); ISO 4217; no implicit conversion" },
			{ source: "effective_date", target: "Accounting_Date", rule: "ISO 8601; open-period validation" },
		],
		workPackages: [
			{ id: "SNOW-101", team: "ServiceNow team", title: "Publish approved financial change", artifact: "Flow Designer flow, event schema, OAuth profile, outbound REST message", dependsOn: "INT-01 baselined", doneWhen: "Approval emits one signed event and stores its correlation ID" },
			{ id: "MULE-201", team: "MuleSoft integration team", title: "Build financial-change Experience API", artifact: "RAML/OAS spec, validation policy, ingress flow, audit metadata", dependsOn: "INT-01 baselined", doneWhen: "Valid request returns 202 after durable receipt; invalid schema returns actionable 4xx" },
			{ id: "MULE-202", team: "MuleSoft integration team", title: "Orchestrate and transform the journal", artifact: "Process API, DataWeave mapping, Anypoint MQ, DLQ, Workday System API", dependsOn: "MULE-201 + INT-02", doneWhen: "Retry is durable and the same correlation ID produces one Workday request" },
			{ id: "WDAY-301", team: "Workday financials team", title: "Expose the governed journal capability", artifact: "ISU, security group, OAuth client, validation rules, journal configuration", dependsOn: "INT-02 baselined", doneWhen: "Authorized journals post; invalid worktags and closed periods return classified errors" },
			{ id: "INT-401", team: "Joint delivery", title: "Prove the cross-team integration", artifact: "Contract fixtures, E2E test pack, replay test, DLQ runbook, trace evidence", dependsOn: "SNOW-101 + MULE-202 + WDAY-301", doneWhen: "One approved change creates one journal, updates ServiceNow, and survives duplicate delivery" },
		],
		buildOrder: ["Architects baseline INT-01, INT-02, field mappings, and error taxonomy", "ServiceNow, MuleSoft, and Workday teams build their owned packages in parallel", "Deploy to connected test tenants and exchange contract fixtures", "Run happy path, schema drift, timeout, duplicate, DLQ, and reconciliation tests", "Attach evidence and release the approved L3/L4 package to Execute"],
	},
	reconcile: {
		outcome: "Observed provider state is continuously compared with approved intent and material drift becomes a bounded, reviewable repair proposal.",
		pattern: "Checkpointed reconciliation with independently durable intent, observations, and approval-bound repairs",
		teams: [
			{ id: "finance", name: "Finance platform team", system: "Effect journal", owns: "Expected state and receipts", delivers: "Versioned reconciliation target" },
			{ id: "provider", name: "Provider integration team", system: "ERP readers", owns: "Paged provider observations", delivers: "Checkpointed provider snapshot" },
			{ id: "controls", name: "Finance controls team", system: "Repair planner", owns: "Drift policy and repair decision", delivers: "Approval-bound repair plan" },
		],
		contracts: [
			{ id: "REC-01", from: "Effect journal", to: "Drift engine", transport: "Paged internal API", payload: "ExpectedState v1", security: "Tenant service identity", failure: "Resume from durable checkpoint" },
			{ id: "REC-02", from: "Provider readers", to: "Drift engine", transport: "Timed provider reads", payload: "ObservedState v1", security: "Read-only provider scopes", failure: "Circuit-break and retain last confirmed cursor" },
		],
		workPackages: [
			{ id: "FIN-101", team: "Finance platform team", title: "Persist reconciliation targets", artifact: "Effect journal reader + cursor model", dependsOn: "CMP-INT-02", doneWhen: "Every expected effect is replayable from durable state" },
			{ id: "INT-201", team: "Provider integration team", title: "Read provider state safely", artifact: "Paged readers + timeout/circuit-breaker policies", dependsOn: "REC-02", doneWhen: "Slow and partial provider responses preserve progress" },
			{ id: "CTL-301", team: "Finance controls team", title: "Classify drift and propose repair", artifact: "Versioned rules + approval request", dependsOn: "REC-01 + REC-02", doneWhen: "No repair escapes the originating mission boundary" },
		],
		buildOrder: ["Lock expected and observed state schemas", "Build journal and provider readers", "Implement deterministic drift rules", "Prove checkpoint recovery and approval-bound repair"],
	},
	replay: {
		outcome: "Duplicate, concurrent, and hostile retries return the retained result without crossing tenants or creating another external effect.",
		pattern: "Tenant-scoped database uniqueness with request fingerprints, transactional outbox, and immutable receipts",
		teams: [
			{ id: "gateway", name: "Execute platform team", system: "Execute gateway", owns: "Authentication and request envelope", delivers: "Tenant-scoped request" },
			{ id: "security", name: "Security engineering", system: "Authority and replay ledger", owns: "Authorization, idempotency, and audit", delivers: "Unique effect claim" },
			{ id: "integration", name: "Provider integration team", system: "Effect dispatcher", owns: "Bounded provider call and receipt", delivers: "Immutable provider receipt" },
		],
		contracts: [
			{ id: "SEC-01", from: "Execute gateway", to: "Replay ledger", transport: "Transactional command", payload: "EffectRequest v1 + fingerprint", security: "Tenant JWT + server-side resource check", failure: "Conflicting duplicate returns 409; valid duplicate returns receipt" },
			{ id: "SEC-02", from: "Outbox", to: "Provider dispatcher", transport: "At-least-once queue", payload: "ClaimedEffect v1", security: "Scoped workload identity", failure: "Bounded retry; one retained effect receipt" },
		],
		workPackages: [
			{ id: "EXEC-101", team: "Execute platform team", title: "Canonicalize the request", artifact: "Request envelope + stable fingerprint", dependsOn: "Mission authority", doneWhen: "Semantically identical inputs hash identically" },
			{ id: "SEC-201", team: "Security engineering", title: "Claim idempotency atomically", artifact: "Tenant/key unique index + transaction", dependsOn: "SEC-01", doneWhen: "100 concurrent claims yield one winner" },
			{ id: "INT-301", team: "Provider integration team", title: "Dispatch and retain the receipt", artifact: "Outbox worker + provider receipt store", dependsOn: "SEC-02", doneWhen: "Retries return one immutable external-effect receipt" },
		],
		buildOrder: ["Baseline request canonicalization", "Add tenant-scoped uniqueness and transactions", "Wire outbox dispatch and receipts", "Run 100-way concurrency and cross-tenant hostile tests"],
	},
	evidence: {
		outcome: "A release owner receives one immutable package that proves what changed, why it is safe, how it was tested, and how it will be rolled back.",
		pattern: "Content-addressed evidence assembly with signed manifest and decision-specific approval routing",
		teams: [
			{ id: "execute", name: "Execute delivery teams", system: "Verified workspaces", owns: "Build and test outputs", delivers: "Pinned artifacts and test receipts" },
			{ id: "release", name: "Release engineering", system: "Evidence service", owns: "Integrity, manifest, and rollback package", delivers: "Signed release candidate" },
			{ id: "owner", name: "Release owner", system: "Approval service", owns: "Deployment decision", delivers: "Scoped release approval" },
		],
		contracts: [
			{ id: "REL-01", from: "Artifact registry", to: "Evidence service", transport: "Pinned artifact references", payload: "WorkspaceEvidence v1", security: "Workload identity + checksum", failure: "Reject missing or stale evidence" },
			{ id: "REL-02", from: "Evidence service", to: "Approval service", transport: "Signed manifest", payload: "ReleaseManifest v1", security: "Signing key + approver RBAC", failure: "No approval when rollback or hashes are absent" },
		],
		workPackages: [
			{ id: "REL-101", team: "Execute delivery teams", title: "Publish verified outputs", artifact: "Artifact hashes + test receipts", dependsOn: "All flow gates", doneWhen: "Every output references the exact source revision" },
			{ id: "REL-201", team: "Release engineering", title: "Assemble and sign release package", artifact: "Manifest + rollback + provenance", dependsOn: "REL-01", doneWhen: "Manifest generation is deterministic and signature verifies" },
			{ id: "OWN-301", team: "Release owner", title: "Decide the bounded deployment", artifact: "Approval record", dependsOn: "REL-02", doneWhen: "Decision names exact hashes, environment, and authority" },
		],
		buildOrder: ["Collect pinned workspace evidence", "Validate completeness and rollback", "Sign the deterministic manifest", "Route the exact release decision to its owner"],
	},
}

function PlanWorkspaceModule({ onBack, onCommand, onSendToExecute }: { onBack: () => void; onCommand: () => void; onSendToExecute: () => void }) {
	const [view, setView] = useState<PlanView>("run")
	const [approved, setApproved] = useState(false)
	const [clarificationResolved, setClarificationResolved] = useState(false)
	const [selectedFlowId, setSelectedFlowId] = useState("adapter")
	const [level, setLevel] = useState<PlanArchitectureLevel>("L2")
	const [steer, setSteer] = useState("")
	const [steering, setSteering] = useState<Array<{ role: "user" | "max"; text: string }>>([])
	const selectedFlow = PLAN_FLOWS.find((flow) => flow.id === selectedFlowId) ?? PLAN_FLOWS[0]
	const selectedDiagram = selectedFlow.levels[level]
	const selectedBrief = PLAN_EXECUTION_BRIEFS[selectedFlow.id]
	const openArchitecture = (flowId = selectedFlowId, nextLevel: PlanArchitectureLevel = level) => {
		setSelectedFlowId(flowId)
		setLevel(nextLevel)
		setView("architecture")
	}
	const submitSteer = () => {
		const direction = steer.trim()
		if (!direction) return
		setSteering((current) => [...current, { role: "user", text: direction }, { role: "max", text: "Applied. I re-checked the affected L3 contracts and L4 acceptance criteria; the change stays inside the approved authority boundary." }])
		setSteer("")
	}
	const navigation = [
		["run", Sparkle, "Agent run", ""],
		["architecture", CirclesThree, "Architecture", "15"],
		["backlog", ListChecks, "Implementation", "35"],
		["roadmap", Clock, "Dependencies", "5"],
		["questions", ChatCircleText, "Questions", clarificationResolved ? "" : "1"],
		["approvals", ShieldCheck, "Approvals", approved ? "" : "1"],
		["evidence", LinkSimple, "Evidence", "124"],
	] as const

	return (
		<div className="apn-shell">
			<aside className="apn-rail">
				<header><button type="button" onClick={onBack}><ArrowLeft size={15} /><span>All plans</span></button><div><MaxionSpiralMark /><span><small>PLAN</small><strong>ERP modernization</strong></span></div></header>
				<nav aria-label="Plan workspace">{navigation.map(([id, Icon, label, count]) => <button key={id} type="button" className={view === id ? "is-active" : ""} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span>{count ? <small>{count}</small> : null}</button>)}</nav>
				<footer><div><span className="apn-live-dot" /><p><strong>MAX is active</strong><small>Monitoring evidence drift</small></p></div><button type="button" aria-label="Search plan" onClick={onCommand}><MagnifyingGlass size={15} /></button></footer>
			</aside>

			<section className="apn-workspace">
				<header className="apn-topbar"><div><button type="button" className="apn-mobile-back" onClick={onBack}><ArrowLeft size={14} />Plans</button><span>ERP modernization delivery plan</span><small>Verified Discovery · snapshot v12</small></div><div><span className="apn-autonomy"><i />MAX working independently</span><span className="apn-run-meta">8 passes · 18m · 3 conflicts resolved</span><button type="button" className={`apn-question-route${clarificationResolved ? " is-resolved" : ""}`} onClick={() => setView("questions")}><ChatCircleText size={15} />{clarificationResolved ? "Questions resolved" : "1 design decision"}</button><button type="button" className={`apn-approval-route${approved ? " is-approved" : ""}`} onClick={() => setView("approvals")}>{approved ? <CheckCircle size={15} weight="fill" /> : <ShieldCheck size={15} />}{approved ? "3 approvals complete" : "1 approval needed"}</button><button type="button" className="apn-execute" disabled={!approved || !clarificationResolved} title={!clarificationResolved ? "One design decision must be resolved before Execute handoff" : approved ? "Send approved L3 and L4 artifacts to Execute" : "Approval routing is still waiting on one decision"} onClick={onSendToExecute}>Send to Execute<ArrowRight size={14} /></button></div></header>

				{view === "run" ? <PlanAgentRun clarificationResolved={clarificationResolved} steering={steering} steer={steer} onSteerChange={setSteer} onSubmitSteer={submitSteer} onOpenArchitecture={() => openArchitecture("adapter", "L2")} onOpenImplementation={() => setView("backlog")} onOpenQuestions={() => setView("questions")} /> : null}
				{view === "architecture" ? <PlanArchitectureView selectedFlow={selectedFlow} level={level} onLevelChange={setLevel} onSelectFlow={setSelectedFlowId} onOpenImplementation={() => setView("backlog")} /> : null}
				{view === "backlog" ? <PlanImplementationView onOpenArchitecture={openArchitecture} /> : null}
				{view === "roadmap" ? <PlanDependencyView onOpenArchitecture={openArchitecture} /> : null}
				{view === "questions" ? <PlanQuestionsView resolved={clarificationResolved} onResolve={() => setClarificationResolved(true)} onOpenArchitecture={() => openArchitecture("adapter", "L3")} /> : null}
				{view === "approvals" ? <PlanApprovalView approved={approved} onApprove={() => setApproved(true)} /> : null}
				{view === "evidence" ? <PlanEvidenceView /> : null}
			</section>

			<aside className="apn-inspector" aria-label="Plan inspector">
				<header><span>{view === "architecture" ? `${selectedFlow.number} · ${level}` : "Plan readiness"}</span><button type="button" aria-label="Plan options"><DotsThree size={17} /></button></header>
				{view === "architecture" ? <><section className="apn-inspector-intro"><span>{selectedFlow.key}</span><h2>{selectedFlow.title}</h2><p>{selectedFlow.summary}</p></section><dl className="apn-inspector-facts"><div><dt>Lead architect</dt><dd>{selectedFlow.owner}</dd></div><div><dt>Delivery teams</dt><dd>{selectedBrief.teams.length}</dd></div><div><dt>Interfaces</dt><dd>{selectedBrief.contracts.length}</dd></div><div><dt>L4 items</dt><dd>{selectedFlow.items} ready</dd></div></dl><section className="apn-contract"><header><ShieldCheck size={15} /><strong>{level} handoff contract</strong></header><p>{PLAN_LEVEL_QUESTIONS[level].output}. L3 and L4 remain the runnable source artifacts for Execute.</p><span><CheckCircle size={13} weight="fill" />Traceability complete</span></section><section className="apn-inspector-guidance"><span>Review question</span><strong>{PLAN_LEVEL_QUESTIONS[level].question}</strong><p><Users size={12} />{PLAN_LEVEL_QUESTIONS[level].audience}</p>{selectedDiagram.guidance.map((item) => <p key={item}><Check size={12} />{item}</p>)}</section></> : <PlanReadiness approved={approved} clarificationResolved={clarificationResolved} onOpenApprovals={() => setView("approvals")} onOpenQuestions={() => setView("questions")} onOpenArchitecture={() => openArchitecture("adapter", "L2")} />}
			</aside>
		</div>
	)
}

function PlanAgentRun({ clarificationResolved, steering, steer, onSteerChange, onSubmitSteer, onOpenArchitecture, onOpenImplementation, onOpenQuestions }: { clarificationResolved: boolean; steering: Array<{ role: "user" | "max"; text: string }>; steer: string; onSteerChange: (value: string) => void; onSubmitSteer: () => void; onOpenArchitecture: () => void; onOpenImplementation: () => void; onOpenQuestions: () => void }) {
	const steps = [
		["Read the operating context", "Grounded the plan in 124 verified claims from Discovery, project decisions, ServiceNow, Workday, integration standards, and policy."],
		["Reconciled three conflicts without interrupting you", "Resolved field ownership, callback responsibility, and retry-policy differences against authoritative sources and recorded the rationale."],
		["Interviewed the domain owners", "Asked the Workday and MuleSoft owners two targeted questions, incorporated their answers, and preserved the transcripts with the affected contracts."],
		["Designed and challenged the implementation", "Generated five flows, fifteen L2–L4 views, and thirty-five items; security, reliability, and delivery critics repaired three gaps."],
		["Routed the work and its decisions", "Matched architecture, security, finance, and program decisions to named approvers and delivered evidence-scoped requests."],
	] as const
	return (
		<main className="apn-main apn-run">
			<div className="apn-run-column">
				<section className="apn-run-hero">
					<span><i />MAX is maintaining this plan</span>
					<h1>MAX built the implementation plan.</h1>
					<p>The architecture is executable, the team boundaries are explicit, and every contract traces back to evidence. MAX handled the research and coordination itself; it interrupts you only where a consequential decision cannot be inferred safely.</p>
				</section>
				<section className="apn-autonomy-ledger" aria-label="Work MAX handled autonomously">
					<header><span>Autonomy ledger</span><strong>What MAX handled without you</strong></header>
					<div><article><strong>124</strong><span>claims read</span></article><article><strong>3</strong><span>conflicts resolved</span></article><article><strong>2</strong><span>owners interviewed</span></article><article className={clarificationResolved ? "is-clear" : "is-attention"}><strong>{clarificationResolved ? "0" : "1"}</strong><span>{clarificationResolved ? "questions open" : "decision for you"}</span></article></div>
				</section>
				<section className="apn-agent-thread" aria-label="Autonomous Plan activity">
					<div className="apn-agent-message"><MaxionSpiralMark /><div><strong>MAX</strong><p>I compared the verified Discovery package with connected-system metadata and project governance. I used the safest reversible assumption where the evidence agreed, contacted domain owners where they held the answer, and isolated one remaining decision that changes financial posting behavior.</p></div></div>
					<ol>{steps.map(([title, detail], index) => <li key={title}><span><Check size={12} /></span><div><strong>{title}</strong><p>{detail}</p></div><time>{["14:02", "14:06", "14:11", "14:17", "14:21"][index]}</time></li>)}</ol>
					<section className={`apn-agent-question${clarificationResolved ? " is-resolved" : ""}`} aria-label="Plan clarification status"><div><span>{clarificationResolved ? <CheckCircle size={16} weight="fill" /> : <ChatCircleText size={16} />}</span><div><small>{clarificationResolved ? "Decision incorporated" : "Your input is needed"}</small><strong>{clarificationResolved ? "Atomic journal posting is now the approved contract." : "Should a journal batch fail atomically or allow partial posting?"}</strong><p>{clarificationResolved ? "MAX updated INT-02, MULE-202, WDAY-301, the error taxonomy, and the affected acceptance tests." : "ServiceNow approval intent and Workday line-level behavior conflict. MAX prepared a recommendation and limited the question to this one policy choice."}</p></div></div><button type="button" onClick={onOpenQuestions}>{clarificationResolved ? "Review decision" : "Review recommendation"}<ArrowRight size={14} /></button></section>
					{steering.map((message, index) => message.role === "user" ? <div className="apn-user-message" key={`${message.text}-${index}`}><span>You</span><p>{message.text}</p></div> : <div className="apn-agent-message is-response" key={`${message.text}-${index}`}><MaxionSpiralMark /><div><strong>MAX</strong><p>{message.text}</p></div></div>)}
				</section>
				<section className="apn-output"><header><div><span>Implementation package</span><strong>{clarificationResolved ? "Ready for final approval" : "One decision before final approval"}</strong></div><CheckCircle size={19} weight="fill" /></header><div><button type="button" onClick={onOpenArchitecture}><CirclesThree size={17} /><span><strong>15 visual architecture diagrams</strong><small>L2 solution · L3 technical · L4 build</small></span><ArrowRight size={14} /></button><button type="button" onClick={onOpenImplementation}><ListChecks size={17} /><span><strong>35 implementation items</strong><small>Team ownership, dependencies, tests, and done conditions</small></span><ArrowRight size={14} /></button></div></section>
				<form className="apn-composer" onSubmit={(event) => { event.preventDefault(); onSubmitSteer() }}><textarea aria-label="Steer the Plan agent" value={steer} onChange={(event) => onSteerChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmitSteer() } }} placeholder="Ask MAX to explain, revise, or test any part of the plan…" rows={2} /><footer><span><Sparkle size={13} />Affected diagrams and contracts are re-checked automatically</span><button type="submit" disabled={!steer.trim()} aria-label="Send Plan direction"><ArrowRight size={15} /></button></footer></form>
			</div>
		</main>
	)
}

type PlanDiagramNode = PlanFlow["levels"][PlanArchitectureLevel]["nodes"][number]

function PlanArchitectureDiagram({ level, flow, brief, nodes, selectedNodeTitle, onSelectNode }: { level: PlanArchitectureLevel; flow: PlanFlow; brief: PlanExecutionBrief; nodes: readonly PlanDiagramNode[]; selectedNodeTitle: string; onSelectNode: (title: string) => void }) {
	const model = level === "L2" ? "Solution and ownership" : level === "L3" ? "Components and contracts" : "Team build packages"
	const positionedNodes = nodes.map((node, index) => {
		const width = node.width ?? 18.5
		const available = 92 - width
		const x = node.x ?? (nodes.length === 1 ? 4 : 4 + (available * index) / (nodes.length - 1))
		const y = node.y ?? (level === "L4" ? 23 : level === "L3" && index % 2 ? 48 : 36)
		return { ...node, x, y, width }
	})
	const edgeLabels = flow.id === "adapter"
		? level === "L2" ? ["INT-01 · event", "INT-02 · journal"] : positionedNodes.slice(1).map(() => "")
		: positionedNodes.slice(1).map((_, index) => `${level}-${String(index + 1).padStart(2, "0")}`)
	const laneLayout = flow.id === "adapter"
		? level === "L2"
			? [{ x: 2, width: 30, label: "SERVICENOW TEAM" }, { x: 35, width: 30, label: "MULESOFT TEAM" }, { x: 68, width: 30, label: "WORKDAY TEAM" }]
			: level === "L3"
				? [{ x: 1, width: 17, label: "SERVICENOW TEAM" }, { x: 18, width: 68, label: "MULESOFT INTEGRATION TEAM" }, { x: 86, width: 13, label: "WORKDAY TEAM" }]
				: [{ x: 1, width: 20, label: "SERVICENOW" }, { x: 20, width: 39, label: "MULESOFT" }, { x: 58, width: 20, label: "WORKDAY" }, { x: 78, width: 21, label: "JOINT GATE" }]
		: brief.teams.map((team, index) => ({ x: 2 + (96 / brief.teams.length) * index, width: 94 / brief.teams.length, label: team.name.toUpperCase() }))
	return (
		<div className="apn-diagram-viewport">
			<div className={`apn-architecture-diagram is-${level.toLowerCase()}`} role="group" aria-label={`${level} diagram for ${flow.title}`}>
				<svg viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
					<defs>
						<marker id="apn-arrow" markerWidth="8" markerHeight="8" refX="6.4" refY="3.6" orient="auto"><path d="M0,0 L7,3.6 L0,7.2 Z" /></marker>
					</defs>
					<rect className="apn-diagram-boundary" x="14" y="20" width="972" height="320" rx="16" />
					<text className="apn-diagram-svg-label" x="32" y="47">{level === "L2" ? "SOLUTION OWNERSHIP AND SYSTEM BOUNDARIES" : level === "L3" ? "DEPLOYABLE COMPONENTS AND VERSIONED INTERFACES" : "TEAM BUILD PACKAGES AND DEPENDENCY ORDER"}</text>
					{laneLayout.map((lane, index) => <g key={lane.label}><rect className={`apn-diagram-zone ${index === 0 ? "is-entry" : index === laneLayout.length - 1 ? "is-effect" : "is-control"}`} x={lane.x * 10} y="66" width={lane.width * 10} height="244" rx="10" /><text className="apn-diagram-zone-label" x={(lane.x + 1.4) * 10} y="90">{lane.label}</text></g>)}
					{positionedNodes.slice(0, -1).map((node, index) => {
						const next = positionedNodes[index + 1]
						const startX = (node.x + node.width) * 10
						const endX = next.x * 10 - 5
						const startY = node.y * 3.6 + 45
						const endY = next.y * 3.6 + 45
						const midX = (startX + endX) / 2
						return <g key={`${node.title}-${next.title}`}><path className="apn-diagram-link" d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`} markerEnd="url(#apn-arrow)" />{edgeLabels[index] ? <text className="apn-diagram-edge-label" textAnchor="middle" x={midX} y={Math.min(startY, endY) - 9}>{edgeLabels[index]}</text> : null}</g>
					})}
					{flow.id === "adapter" ? <><path className="apn-diagram-return" d="M 925 286 C 760 318, 250 318, 80 286" markerEnd="url(#apn-arrow)" /><text className="apn-diagram-edge-label" textAnchor="middle" x="500" y="306">JournalReceipt v1 · status returned to ServiceNow</text></> : null}
				</svg>
				<div className="apn-diagram-model"><span>{level}</span><strong>{model}</strong></div>
				{positionedNodes.map((node, index) => <button type="button" key={node.title} aria-pressed={selectedNodeTitle === node.title} aria-label={`Inspect ${node.title}`} onClick={() => onSelectNode(node.title)} style={{ left: `${node.x}%`, top: `${node.y}%`, width: `${node.width}%` }} className={`apn-diagram-node is-${node.tone}`}><span>{node.team ?? `${level} · ${String(index + 1).padStart(2, "0")}`}</span><strong>{node.title}</strong><small>{node.detail}</small>{node.artifact ? <em>{node.artifact}</em> : null}</button>)}
				<div className="apn-diagram-legend" aria-hidden="true"><span className="is-source">Source / request</span><span className="is-core">Integration / control</span><span className="is-store">Durable state / gate</span><span className="is-effect">System of record / effect</span></div>
			</div>
		</div>
	)
}

function PlanNodeBrief({ level, node, nodeIndex, brief, onLevelChange, onOpenImplementation }: { level: PlanArchitectureLevel; node: PlanDiagramNode; nodeIndex: number; brief: PlanExecutionBrief; onLevelChange: (level: PlanArchitectureLevel) => void; onOpenImplementation: () => void }) {
	const relatedContract = brief.contracts[Math.min(nodeIndex, brief.contracts.length - 1)]
	const workPackage = brief.workPackages.find((item) => item.id === node.title) ?? brief.workPackages[Math.min(nodeIndex, brief.workPackages.length - 1)]
	const owner = node.team ?? brief.teams[Math.min(nodeIndex, brief.teams.length - 1)]?.name ?? "Architecture owner"
	const nextAction = level === "L2" ? `Baseline ${relatedContract?.id ?? "the first interface"} with every owning team.` : level === "L3" ? `Create ${workPackage?.artifact ?? "the assigned build artifact"} against the locked contract.` : workPackage?.doneWhen ?? "Attach acceptance evidence before handoff."
	return (
		<section className="apn-node-brief" aria-label="Selected architecture node">
			<header><div><small>Selected node</small><h3>{node.title}</h3><p>{node.detail}</p></div><span>{level}</span></header>
			<div className="apn-node-brief-grid">
				<article><small>Owning team</small><strong>{owner}</strong></article>
				<article><small>Build artifact</small><strong>{node.artifact ?? workPackage?.artifact ?? "Architecture decision record"}</strong></article>
				<article><small>{level === "L4" ? "Starts after" : "Interface contract"}</small><strong>{level === "L4" ? workPackage?.dependsOn : relatedContract ? `${relatedContract.id} · ${relatedContract.transport}` : "Internal contract"}</strong></article>
				<article className="is-next"><small>{level === "L4" ? "Done when" : "What happens next"}</small><strong>{nextAction}</strong></article>
			</div>
			<footer><span><CheckCircle size={14} weight="fill" />Evidence and rationale are attached</span>{level === "L2" ? <button type="button" onClick={() => onLevelChange("L3")}>Open technical contract<ArrowRight size={14} /></button> : level === "L3" ? <button type="button" onClick={() => onLevelChange("L4")}>Open build package<ArrowRight size={14} /></button> : <button type="button" onClick={onOpenImplementation}>Open implementation queue<ArrowRight size={14} /></button>}</footer>
		</section>
	)
}

function PlanExecutableHandoff({ level, flow, brief }: { level: PlanArchitectureLevel; flow: PlanFlow; brief: PlanExecutionBrief }) {
	const [teamFilter, setTeamFilter] = useState("all")
	const packages = teamFilter === "all" ? brief.workPackages : brief.workPackages.filter((item) => item.team === teamFilter)
	const title = level === "L2" ? "Solution decision and ownership" : level === "L3" ? "Interface contracts teams build against" : "Assigned build packages and completion gates"
	return (
		<section className={`apn-executable-handoff is-${level.toLowerCase()}`} aria-label={`${level} executable handoff`}>
			<header><div><span>Executable handoff</span><h3>{title}</h3><p>{PLAN_LEVEL_QUESTIONS[level].output}.</p></div><div className="apn-trace-chain" aria-label="Architecture traceability"><code>{flow.key}-L2</code><ArrowRight size={11} /><code>{flow.key}-L3</code><ArrowRight size={11} /><code>{flow.key}-L4</code></div></header>
			{level === "L2" ? <>
				<div className="apn-solution-summary"><article><small>Business outcome</small><strong>{brief.outcome}</strong></article><article><small>Approved integration pattern</small><strong>{brief.pattern}</strong></article></div>
				<div className="apn-team-ownership">{brief.teams.map((team) => <article key={team.id}><header><span>{team.name}</span><strong>{team.system}</strong></header><dl><div><dt>Owns</dt><dd>{team.owns}</dd></div><div><dt>Must deliver</dt><dd>{team.delivers}</dd></div></dl></article>)}</div>
			</> : null}
			{level === "L3" ? <>
				<div className="apn-contract-list">{brief.contracts.map((contract) => <article key={contract.id}><header><code>{contract.id}</code><span>{contract.from}<ArrowRight size={11} />{contract.to}</span></header><dl><div><dt>Transport</dt><dd>{contract.transport}</dd></div><div><dt>Payload</dt><dd>{contract.payload}</dd></div><div><dt>Security</dt><dd>{contract.security}</dd></div><div><dt>Failure contract</dt><dd>{contract.failure}</dd></div></dl></article>)}</div>
				{brief.mappings?.length ? <section className="apn-mapping-table" aria-label="Canonical field mapping"><header><span>Canonical field mapping</span><small>Source to target · schema-owned by MuleSoft</small></header><div className="apn-mapping-row is-heading"><span>ServiceNow</span><span>Workday Financials</span><span>Transformation rule</span></div>{brief.mappings.map((mapping) => <div className="apn-mapping-row" key={mapping.source}><code>{mapping.source}</code><code>{mapping.target}</code><span>{mapping.rule}</span></div>)}</section> : null}
			</> : null}
			{level === "L4" ? <>
				<div className="apn-team-filter" role="group" aria-label="Filter build packages by team"><button type="button" aria-pressed={teamFilter === "all"} onClick={() => setTeamFilter("all")}>All teams</button>{Array.from(new Set(brief.workPackages.map((item) => item.team))).map((team) => <button type="button" key={team} aria-pressed={teamFilter === team} onClick={() => setTeamFilter(team)}>{team.replace(" integration", "")}</button>)}</div>
				<div className="apn-work-package-list">{packages.map((item) => <article key={item.id}><header><code>{item.id}</code><span>{item.team}</span></header><h4>{item.title}</h4><dl><div><dt>Build artifact</dt><dd>{item.artifact}</dd></div><div><dt>Starts after</dt><dd>{item.dependsOn}</dd></div><div><dt>Done when</dt><dd>{item.doneWhen}</dd></div></dl></article>)}</div>
				<section className="apn-build-order"><header><span>Cross-team build order</span><small>MAX keeps blocked packages from starting early</small></header><ol>{brief.buildOrder.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></section>
			</> : null}
		</section>
	)
}

function PlanArchitectureView({ selectedFlow, level, onLevelChange, onSelectFlow, onOpenImplementation }: { selectedFlow: PlanFlow; level: PlanArchitectureLevel; onLevelChange: (level: PlanArchitectureLevel) => void; onSelectFlow: (flowId: string) => void; onOpenImplementation: () => void }) {
	const diagram = selectedFlow.levels[level]
	const brief = PLAN_EXECUTION_BRIEFS[selectedFlow.id]
	const [selectedNodeTitle, setSelectedNodeTitle] = useState(diagram.nodes[0]?.title ?? "")
	useEffect(() => setSelectedNodeTitle(diagram.nodes[0]?.title ?? ""), [diagram.nodes, level, selectedFlow.id])
	const nodeIndex = Math.max(0, diagram.nodes.findIndex((node) => node.title === selectedNodeTitle))
	const selectedNode = diagram.nodes[nodeIndex] ?? diagram.nodes[0]
	return <main className="apn-main apn-architecture-view"><header className="apn-view-heading"><div><span>Executable architecture</span><h1>See the system. Select a node. Know what to build.</h1><p>The diagram is the primary workspace. Follow the flow left to right, select any node for its owner and contract, then move from L2 solution intent to L3 technical interfaces and L4 build packages without losing context.</p></div><div><strong>15 / 15</strong><small>traceable architecture views</small></div></header><div className="apn-architecture-layout"><nav aria-label="Architecture flows"><span>Implementation flows</span>{PLAN_FLOWS.map((flow) => <button key={flow.id} type="button" className={selectedFlow.id === flow.id ? "is-active" : ""} onClick={() => onSelectFlow(flow.id)}><i>{flow.number}</i><span><strong>{flow.title}</strong><small>{flow.key} · {PLAN_EXECUTION_BRIEFS[flow.id].teams.length} teams · {flow.items} build items</small></span><CheckCircle size={14} weight="fill" /></button>)}</nav><section className="apn-diagram-panel"><header><div><span>{selectedFlow.key}</span><h2>{selectedFlow.title}</h2></div><div role="group" aria-label="Architecture level">{(["L2", "L3", "L4"] as const).map((item) => <button key={item} type="button" aria-pressed={level === item} onClick={() => onLevelChange(item)}><strong>{item}</strong><small>{item === "L2" ? "Solution" : item === "L3" ? "Technical" : "Build"}</small></button>)}</div></header><section className="apn-level-question"><div><small>This view answers</small><strong>{PLAN_LEVEL_QUESTIONS[level].question}</strong></div><span><Users size={13} />{PLAN_LEVEL_QUESTIONS[level].audience}</span></section><div className="apn-diagram-meta"><span>{diagram.name}</span><p>{diagram.focus}</p><i><CheckCircle size={12} weight="fill" />Generated, traced, and critic-checked</i></div><p className="apn-diagram-instruction"><Lightning size={14} weight="fill" />Select a node to see its owner, interface, build artifact, dependency, and completion condition.</p><PlanArchitectureDiagram level={level} flow={selectedFlow} brief={brief} nodes={diagram.nodes} selectedNodeTitle={selectedNodeTitle} onSelectNode={setSelectedNodeTitle} />{selectedNode ? <PlanNodeBrief level={level} node={selectedNode} nodeIndex={nodeIndex} brief={brief} onLevelChange={onLevelChange} onOpenImplementation={onOpenImplementation} /> : null}<footer><span>Architecture decisions shown in this view</span><div>{diagram.guidance.map((item) => <p key={item}><Check size={12} />{item}</p>)}</div></footer><PlanExecutableHandoff key={`${selectedFlow.id}-${level}`} level={level} flow={selectedFlow} brief={brief} /></section></div></main>
}

function PlanImplementationView({ onOpenArchitecture }: { onOpenArchitecture: (flowId: string, level: PlanArchitectureLevel) => void }) {
	const [teamFilter, setTeamFilter] = useState("All teams")
	const packages = PLAN_FLOWS.flatMap((flow) => PLAN_EXECUTION_BRIEFS[flow.id].workPackages.map((item) => ({ ...item, flow })))
	const teams = ["All teams", ...Array.from(new Set(packages.map((item) => item.team)))]
	const visiblePackages = teamFilter === "All teams" ? packages : packages.filter((item) => item.team === teamFilter)
	return (
		<main className="apn-main apn-implementation-view">
			<header className="apn-view-heading"><div><span>Implementation cockpit</span><h1>Start with your team. Keep the whole system in view.</h1><p>MAX converted the architecture into owned work packages. Each card tells an engineer what to create, which contract must exist first, and what evidence proves the work is done.</p></div><div><strong>35</strong><small>scoped implementation items</small></div></header>
			<section className="apn-implementation-intro" aria-label="Implementation starting point"><div><span>01</span><div><small>Start here</small><strong>Baseline the shared contracts before teams build in parallel.</strong><p>INT-01, INT-02, field mappings, and the error taxonomy are the only cross-team prerequisites. MAX will keep downstream packages visibly blocked until those contracts are accepted.</p></div></div><button type="button" onClick={() => onOpenArchitecture("adapter", "L3")}>Review shared contracts<ArrowRight size={14} /></button></section>
			<section className="apn-implementation-toolbar"><div><small>Show work for</small><div role="group" aria-label="Filter implementation packages by team">{teams.map((team) => <button type="button" key={team} aria-pressed={teamFilter === team} onClick={() => setTeamFilter(team)}>{team.replace(" integration", "")}</button>)}</div></div><span><CheckCircle size={14} weight="fill" />{visiblePackages.length} owned packages shown</span></section>
			<section className="apn-package-cockpit" aria-label="Implementation packages">
				{visiblePackages.map((item) => {
					const queued = item.dependsOn.includes(" + ") || item.dependsOn === "All flow gates"
					return <button key={`${item.flow.id}-${item.id}`} type="button" onClick={() => onOpenArchitecture(item.flow.id, "L4")}><header><code>{item.id}</code><span>{item.team}</span><i className={queued ? "is-queued" : "is-ready"}>{queued ? <Clock size={12} /> : <CheckCircle size={12} weight="fill" />}{queued ? "Sequenced" : "Ready"}</i></header><h2>{item.title}</h2><p>{item.flow.title}</p><dl><div><dt>Create</dt><dd>{item.artifact}</dd></div><div><dt>Starts after</dt><dd>{item.dependsOn}</dd></div><div><dt>Done when</dt><dd>{item.doneWhen}</dd></div></dl><footer><span>Open L4 package</span><ArrowRight size={14} /></footer></button>
				})}
			</section>
		</main>
	)
}

function PlanDependencyView({ onOpenArchitecture }: { onOpenArchitecture: (flowId: string, level: PlanArchitectureLevel) => void }) {
	return <main className="apn-main apn-dependency-view"><header className="apn-view-heading"><div><span>Dependency model</span><h1>MAX sequenced the work around risk.</h1><p>Authority and replay protection land before provider effects. Release evidence is assembled only from verified workspace outputs.</p></div><div><strong>0</strong><small>circular dependencies</small></div></header><section className="apn-dependency-map">{PLAN_FLOWS.map((flow, index) => <div key={flow.id} className="apn-dependency-row"><span>{flow.number}</span><button type="button" onClick={() => onOpenArchitecture(flow.id, "L3")}><div><small>{flow.key}</small><strong>{flow.title}</strong><p>{flow.summary}</p></div><span><small>Depends on</small><strong>{flow.dependsOn}</strong></span><i><CheckCircle size={13} weight="fill" />Ready</i><CaretRight size={14} /></button>{index < PLAN_FLOWS.length - 1 ? <div className="apn-dependency-line" /> : null}</div>)}</section></main>
}

function PlanEvidenceView() {
	const sources = [["Verified Discovery", "124 claims", "Snapshot v12 · decision source"], ["ServiceNow", "19 contracts", "Schema + event samples"], ["SAP and QuickBooks", "31 observations", "Provider capability snapshots"], ["Policy library", "14 controls", "Authority + retention rules"], ["Project workspace", "8 decisions", "Goals, owners, and constraints"]] as const
	return <main className="apn-main apn-evidence-view"><header className="apn-view-heading"><div><span>Evidence and provenance</span><h1>Every recommendation can explain itself.</h1><p>MAX retains the source, fingerprint, confidence, and exact plan artifacts influenced by every material claim.</p></div><div><strong>100%</strong><small>material claims traced</small></div></header><section className="apn-evidence-summary"><div><MaxionSpiralMark /><span><strong>Evidence graph is healthy</strong><p>No stale sources, unresolved contradictions, or ungrounded implementation decisions.</p></span></div><span><CheckCircle size={14} weight="fill" />Verified</span></section><section className="apn-evidence-list"><header><span>Source</span><span>Coverage</span><span>Used by</span><span>State</span></header>{sources.map(([name, coverage, detail], index) => <button type="button" key={name}><span><Database size={15} /><strong>{name}</strong></span><span>{coverage}</span><span><strong>{index === 0 ? "All 5 flows" : index === 1 ? "Flow 02" : index === 2 ? "Flows 03–05" : index === 3 ? "Flows 01, 04, 05" : "All 5 flows"}</strong><small>{detail}</small></span><span><Check size={12} />Current</span></button>)}</section></main>
}

function PlanQuestionsView({ resolved, onResolve, onOpenArchitecture }: { resolved: boolean; onResolve: () => void; onOpenArchitecture: () => void }) {
	const [answer, setAnswer] = useState("")
	const resolvedItems = [
		["Which system owns the cost-center reference?", "MAX compared ServiceNow samples with Workday metadata and selected the Workday reference ID as canonical.", "Resolved from evidence"],
		["Who owns the journal-status callback?", "MAX reconciled the project RACI with the integration catalogue and assigned the callback contract to MuleSoft.", "Resolved from governance"],
		["How should closed accounting periods fail?", "MAX asked Marcus Lee, Workday owner, then added a classified non-retryable response to INT-02.", "Owner answered · 14:11"],
	] as const
	return (
		<main className="apn-main apn-questions-view">
			<header className="apn-view-heading"><div><span>Clarifications and decisions</span><h1>MAX asks only when the context cannot decide safely.</h1><p>It resolves factual gaps from evidence, asks domain owners for system knowledge, and escalates only consequential choices that require business authority. Every answer updates the affected diagrams, contracts, tests, and approvals.</p></div><div><strong>{resolved ? "0" : "1"}</strong><small>decision waiting for you</small></div></header>
			<section className="apn-question-autonomy" aria-label="Clarification work completed by MAX"><div><MaxionSpiralMark /><span><small>Before asking you</small><strong>MAX read 124 claims, reconciled three conflicts, and contacted two domain owners.</strong><p>Three questions were resolved without interrupting the plan owner. One policy decision remains because it changes the financial outcome.</p></span></div><span><CheckCircle size={14} weight="fill" />3 handled autonomously</span></section>
			<div className="apn-questions-layout">
				<section className={`apn-primary-question${resolved ? " is-resolved" : ""}`} aria-label="Current Plan decision">
					<header><div><span>{resolved ? <CheckCircle size={17} weight="fill" /> : <ChatCircleText size={17} />}</span><div><small>{resolved ? "Decision recorded" : "Business authority required"}</small><h2>Should a Workday journal batch fail atomically or allow partial posting?</h2></div></div><i>{resolved ? "Resolved" : "Blocks INT-02"}</i></header>
					<p>ServiceNow approves the financial change as one business transaction, while Workday can return line-level errors. The knowledge base does not define whether valid lines may post when another line fails.</p>
					<section className="apn-evidence-conflict"><article><small>ServiceNow evidence</small><strong>Approval applies to the complete requested journal.</strong><span>Change policy FIN-18 · confidence 0.96</span></article><i>conflicts with</i><article><small>Workday capability</small><strong>The API can classify errors at individual journal-line level.</strong><span>Tenant metadata · confidence 0.99</span></article></section>
					<section className="apn-agent-recommendation"><span><Sparkle size={16} weight="fill" /></span><div><small>MAX recommends</small><strong>Fail the batch atomically before posting any journal line.</strong><p>This preserves the ServiceNow approval boundary, avoids unapproved partial financial effects, and produces one replay-safe result. MAX will classify the error, return it to ServiceNow, and require a corrected approval before retry.</p><div><code>INT-02</code><code>MULE-202</code><code>WDAY-301</code><code>6 acceptance tests</code></div></div></section>
					{resolved ? <footer className="apn-question-decision"><span><CheckCircle size={15} weight="fill" />Atomic posting approved · affected artifacts re-checked</span><button type="button" onClick={onOpenArchitecture}>Review updated L3 contract<ArrowRight size={14} /></button></footer> : <><form onSubmit={(event) => { event.preventDefault(); if (answer.trim()) onResolve() }}><label htmlFor="plan-clarification-answer">Use another decision</label><textarea id="plan-clarification-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Explain the required posting behavior or constraint…" rows={3} /><span>MAX will show which contracts and tests change before final handoff.</span><div><button type="button" onClick={onOpenArchitecture}>Inspect affected contract</button><button type="submit" disabled={!answer.trim()}>Apply my decision</button></div></form><footer><span>Recommended path</span><button type="button" onClick={onResolve}><Check size={14} />Accept atomic posting</button></footer></>}
				</section>
				<aside className="apn-resolved-questions" aria-label="Questions MAX resolved autonomously"><header><small>Handled without you</small><strong>Resolved questions</strong></header>{resolvedItems.map(([title, detail, source]) => <article key={title}><span><Check size={12} /></span><div><strong>{title}</strong><p>{detail}</p><small>{source}</small></div></article>)}</aside>
			</div>
		</main>
	)
}

function PlanApprovalView({ approved, onApprove }: { approved: boolean; onApprove: () => void }) {
	const requests = [
		{ id: "architecture", initials: "PS", name: "Priya Shah", role: "Director, Enterprise Architecture", scope: "L3 service contracts and the Execute build boundary", basis: "Project RACI · Architecture policy AP-19", channel: "Teams + email · delivered 14:19", status: "Approved" },
		{ id: "security", initials: "EO", name: "Elena Ortiz", role: "Security Controls Lead", scope: "Tenant isolation, replay protection, and evidence retention", basis: "Control owner registry · SEC-44", channel: "Teams + email · delivered 14:20", status: "Approved" },
		{ id: "program", initials: "RA", name: "Root Admin", role: "Program owner", scope: "Authorize Execute to build the approved L3 and L4 scope", basis: "Mission authority record · D-14", channel: "Teams + email · delivered 14:21", status: approved ? "Approved" : "Decision needed" },
	] as const
	return <main className="apn-main apn-approval-view"><header className="apn-view-heading"><div><span>Approval routing</span><h1>MAX found the approvers and sent the work.</h1><p>Each request is matched to the project RACI and policy owner, then sent with the exact scope, architecture artifacts, evidence, and rollback boundary that person needs to decide.</p></div><div><strong>{approved ? "3 / 3" : "2 / 3"}</strong><small>{approved ? "approvals complete" : "acknowledged"}</small></div></header><section className="apn-approval-summary"><div><MaxionSpiralMark /><span><strong>Approval messages are routed</strong><p>MAX used the decision-rights graph to avoid sending a blanket owner approval. The delivery record and response are retained with the plan.</p></span></div><span><CheckCircle size={14} weight="fill" />3 messages delivered</span></section><section className="apn-approval-requests" aria-label="Approval requests">{requests.map((request) => <article key={request.id} className={request.status === "Decision needed" ? "is-pending" : ""}><header><span className="apn-approval-avatar">{request.initials}</span><div><strong>{request.name}</strong><small>{request.role}</small></div><i className={request.status === "Approved" ? "is-approved" : "is-pending"}>{request.status === "Approved" ? <CheckCircle size={13} weight="fill" /> : <ShieldCheck size={13} />}{request.status}</i></header><dl><div><dt>Approval requested</dt><dd>{request.scope}</dd></div><div><dt>Why this approver</dt><dd>{request.basis}</dd></div></dl><div className="apn-approval-message"><ChatCircleText size={16} /><p><strong>MAXION approval request</strong> — approve this bounded implementation scope. The message includes the L2 boundary, L3 contracts, L4 sequence, test gates, evidence, and rollback instructions.</p></div><footer><span>{request.channel}</span>{request.status === "Decision needed" ? <button type="button" onClick={onApprove}><ShieldCheck size={14} />Approve implementation boundary</button> : <span><CheckCircle size={13} weight="fill" />Decision recorded</span>}</footer></article>)}</section></main>
}

function PlanReadiness({ approved, clarificationResolved, onOpenApprovals, onOpenQuestions, onOpenArchitecture }: { approved: boolean; clarificationResolved: boolean; onOpenApprovals: () => void; onOpenQuestions: () => void; onOpenArchitecture: () => void }) {
	const completed = 5 + Number(clarificationResolved) + Number(approved)
	const nextTitle = !clarificationResolved ? "Resolve one design decision" : !approved ? "Review your approval request" : "Plan is ready for Execute"
	const nextCopy = !clarificationResolved ? "MAX resolved every factual gap it could. Atomic versus partial journal posting still requires business authority because it changes the financial effect." : !approved ? "MAX already notified architecture and security. Your decision grants Execute access to the approved L3 and L4 scope, not production authority." : "All implementation questions and routed approvals are recorded."
	return <><section className="apn-readiness"><div><span>Completion floor</span><strong>{completed} / 7</strong></div><i style={{ "--apn-progress": `${Math.round((completed / 7) * 100)}%` } as CSSProperties} /><p>{approved && clarificationResolved ? "The Plan can now be imported directly into Execute." : "MAX keeps the plan moving and pauses only at the remaining authority boundaries."}</p></section><section className="apn-gates"><span>Autonomous quality gates</span>{[["Evidence grounded", "124 claims"], ["Architecture complete", "15 diagrams"], ["Implementation ready", "35 items"], ["Clarifications", clarificationResolved ? "4 resolved" : "3 resolved · 1 needed"], ["Approval routing", approved ? "3 recorded" : "3 delivered · 1 needed"], ["Critics passed", "3 repaired"]].map(([label, value]) => <p key={label}><CheckCircle size={13} weight="fill" /><span><strong>{label}</strong><small>{value}</small></span></p>)}</section><section className="apn-only-ask"><span>Next exact action</span><strong>{nextTitle}</strong><p>{nextCopy}</p>{!clarificationResolved ? <button type="button" onClick={onOpenQuestions}><ChatCircleText size={14} />Review MAX's recommendation</button> : !approved ? <button type="button" onClick={onOpenApprovals}><ShieldCheck size={14} />Review approval routing</button> : <button type="button" onClick={onOpenArchitecture}>Review architecture<ArrowRight size={13} /></button>}</section><section className="apn-scope-note"><ShieldCheck size={14} /><p><strong>Authority stays bounded</strong><small>Build authority only · no provider writes · no deployment approval</small></p></section></>
}

function ExecuteModule({
	onCommand,
	planHandoff,
	onVerified,
	onNavigate,
}: {
	onCommand: () => void
	planHandoff: boolean
	onVerified: () => void
	onNavigate: (module: MaxionModuleId) => void
}) {
	const [workspaceOpen, setWorkspaceOpen] = useState(false)
	const [engagement, setEngagement] = useState<ExecuteLaunchIntent>({
		source: "plan",
		title: "ERP modernization delivery",
		brief: "Implement the approved ERP modernization outcomes with tenant-safe authority boundaries.",
		autoStart: false,
	})
	if (!workspaceOpen) {
		return <ExecuteHubModule onOpenRun={(intent) => { setEngagement(intent); setWorkspaceOpen(true) }} onNavigate={onNavigate} planHandoff={planHandoff} />
	}
	return <ExecuteWorkspaceModule key={`${engagement.source}-${engagement.title}-${String(engagement.autoStart)}`} onBack={() => setWorkspaceOpen(false)} onPlatform={() => onNavigate("dashboard")} onCommand={onCommand} engagement={engagement} onVerified={onVerified} />
}

function LegacyExecuteWorkspaceModule({ onBack, onCommand, planHandoff, onVerified }: { onBack: () => void; onCommand: () => void; planHandoff: boolean; onVerified: () => void }) {
	const [selectedTask, setSelectedTask] = useState("authority")
	const [runState, setRunState] = useState<ExecuteRunState>("idle")
	const task = EXECUTE_TASKS.find((item) => item.id === selectedTask)!
	useEffect(() => { if (runState !== "running") return; const timer = window.setTimeout(() => { setRunState("verified"); onVerified() }, 1100); return () => window.clearTimeout(timer) }, [onVerified, runState])
	return <div className="mxp-execute mxp-module-with-rail"><ContextRail title="Execute" kicker="Development" footer={<button type="button" className="mxp-rail-connection"><span className="mxp-live-dot" /><span><strong>Runtime ready</strong><small>Worktree isolated</small></span><CaretRight size={12} /></button>}><button type="button" onClick={onBack}><ArrowLeft size={14} />All engagements</button><button type="button" className="mxp-rail-primary"><Plus size={14} />New workspace</button><div className="mxp-rail-label">ERP modernization</div>{EXECUTE_TASKS.map((item) => <button type="button" key={item.id} className={selectedTask === item.id ? "is-active" : ""} onClick={() => { setSelectedTask(item.id); setRunState("idle") }}><span className="mxp-mini-glyph"><Code size={13} /></span><span><strong>{item.title}</strong><small>{item.status}</small></span></button>)}<div className="mxp-rail-label">Workspace</div><button type="button"><FileText size={15} /><span>Files</span><small>21</small></button><button type="button"><TerminalWindow size={15} /><span>Terminal</span></button><button type="button"><CheckCircle size={15} /><span>Tests</span><small>48</small></button></ContextRail><div className="mxp-module-area"><ModuleHeader label="Execute" title={task.title} detail="max-ai-platform · isolated worktree" onCommand={onCommand} actions={<Status tone={runState === "verified" ? "success" : runState === "running" ? "live" : "neutral"} live={runState === "running"}>{runState === "verified" ? "Verified" : runState === "running" ? "Running" : "Ready"}</Status>} /><main className="mxp-execute-main">{planHandoff ? <div className="mxp-handoff-banner"><LinkSimple size={16} /><span><strong>Plan handoff attached</strong><small>Mission authority foundation · 18 outcomes · evidence snapshot v7</small></span><button type="button">Inspect</button></div> : null}<section className="mxp-execute-head"><div><span>Current task</span><h1>{task.title}</h1><p>{task.detail}. The agent can edit, test, and iterate inside this workspace without widening repository or deployment authority.</p></div><div><button type="button"><Pause size={14} />Interrupt</button><button type="button" className="mxp-primary" disabled={runState === "running"} onClick={() => setRunState("running")}>{runState === "verified" ? <Check size={14} /> : <Play size={14} weight="fill" />}{runState === "verified" ? "Run verified" : runState === "running" ? "Running…" : "Start agent run"}</button></div></section><div className="mxp-execute-grid"><section className="mxp-agent-session"><div className="mxp-session-date"><span>Agent activity</span></div><article><MaxionMark size={27} /><div><span>MAX Execute<time>Now</time></span><p>I mapped the approved Plan outcome to the existing service boundaries. I’ll implement the typed authority contract, preserve the current API shape, then run the focused and cumulative gates.</p></div></article><details open><summary><span>{runState === "running" ? <SpinnerGap className="mxp-spin" size={15} /> : <CheckCircle size={15} />}<strong>{runState === "verified" ? "Implementation verified" : runState === "running" ? "Implementing and testing" : "Proposed work"}</strong></span><span>4 steps<CaretRight size={12} /></span></summary><div>{["Read plan evidence and repository boundaries", "Implement typed mission policy contract", "Add hostile authority and replay tests", "Run cumulative release gate"].map((item, index) => <div key={item}><span className={runState === "verified" || index === 0 ? "is-complete" : runState === "running" && index === 1 ? "is-current" : ""}>{runState === "verified" || index === 0 ? <Check size={10} /> : runState === "running" && index === 1 ? <SpinnerGap className="mxp-spin" size={10} /> : index + 1}</span><div><strong>{item}</strong><small>{runState === "verified" ? "Verified" : index === 0 ? "Complete" : index === 1 && runState === "running" ? "Editing 3 files" : "Waiting"}</small></div></div>)}</div></details>{runState === "verified" ? <div className="mxp-verified-result"><CheckCircle size={18} weight="fill" /><span><strong>Mission authority API passed its release gate</strong><small>48 tests · TypeScript clean · policy contract verified</small></span></div> : null}</section><aside className="mxp-code-panel"><header><span>missionPolicy.ts</span><button type="button"><DotsThree size={16} /></button></header><pre><code><span>export type MissionAuthority = {'{'}</span>{"\n"}<span className="is-added">+ tenantId: TenantId</span>{"\n"}<span className="is-added">+ missionVersion: number</span>{"\n"}<span className="is-added">+ permittedActions: Action[]</span>{"\n"}<span className="is-added">+ approvalBoundary: Boundary</span>{"\n"}<span className="is-added">+ expiresAt: ISODate</span>{"\n"}<span>{'}'}</span>{"\n\n"}<span>export async function execute(</span>{"\n"}<span>  command: MissionCommand,</span>{"\n"}<span className="is-added">+ authority: MissionAuthority,</span>{"\n"}<span>) {'{'}</span>{"\n"}<span className="is-added">+ await policy.assert(command, authority)</span>{"\n"}<span className="is-added">+ return effects.dispatch(command)</span>{"\n"}<span>{'}'}</span></code></pre><footer><TerminalWindow size={14} /><span>{runState === "verified" ? "48 passed in 6.8s" : runState === "running" ? "Running focused tests…" : "Terminal ready"}</span></footer></aside></div></main></div></div>
}

function ExecuteRunButton({ runState, onRun }: { runState: ExecuteRunState; onRun: () => void }) {
	return (
		<button type="button" className="mxp-primary" disabled={runState === "running"} onClick={onRun}>
			{runState === "verified" ? <Check size={14} /> : runState === "running" ? <SpinnerGap className="mxp-spin" size={14} /> : <Play size={14} weight="fill" />}
			{runState === "verified" ? "Run verified" : runState === "running" ? "Running…" : "Start agent run"}
		</button>
	)
}

function ExecuteWorkspaceTopology({
	runState,
	selectedTask,
	steeringCounts,
	onSelectTask,
	onOpenTests,
}: {
	runState: ExecuteRunState
	selectedTask: string
	steeringCounts?: Record<string, number>
	onSelectTask: (taskId: string) => void
	onOpenTests: () => void
}) {
	const workspaceStatus = (taskId: string, index: number) => {
		if (runState === "verified") return "Verified"
		if (steeringCounts?.[taskId]) return "Directed"
		if (runState === "running") return index === 0 ? "Working" : index === 1 ? "Ready" : "Queued"
		return index === 0 ? "Ready" : "Queued"
	}
	return (
		<div className="mxp-topology-graph" role="group" aria-label="Workspace dependency topology">
			<div className="mxp-topology-node is-orchestrator">
				<MaxionMark size={27} />
				<span><small>Orchestrator</small><strong>MAX delivery lead</strong><i>{runState === "running" ? "Coordinating" : runState === "verified" ? "Verified" : "Ready"}</i></span>
			</div>
			<span className="mxp-topology-connector" aria-hidden="true" />
			<div className="mxp-topology-workspaces">
				{EXECUTE_TASKS.map((item, index) => (
					<button type="button" key={item.id} aria-label={`Open Workspace ${String(index + 1).padStart(2, "0")}: ${item.title}`} className={`mxp-topology-node${selectedTask === item.id ? " is-selected" : ""}`} onClick={() => onSelectTask(item.id)}>
						<span className="mxp-mini-glyph"><Code size={13} /></span>
						<span><small>Workspace {String(index + 1).padStart(2, "0")}</small><strong>{item.title}</strong><i className={`is-${workspaceStatus(item.id, index).toLowerCase()}`}>{workspaceStatus(item.id, index)}</i></span>
					</button>
				))}
			</div>
			<span className="mxp-topology-connector is-lower" aria-hidden="true" />
			<button type="button" aria-label="Open cumulative tests and release gate" className="mxp-topology-node is-gate" onClick={onOpenTests}>
				<span className="mxp-mini-glyph"><ShieldCheck size={14} /></span>
				<span><small>Cumulative gate</small><strong>Verify, audit, and prepare release</strong><i>{runState === "verified" ? "Passed" : "Waiting"}</i></span>
			</button>
		</div>
	)
}

function ExecuteWorkspaceModule({
	onBack,
	onPlatform,
	onCommand,
	engagement,
	onVerified,
}: {
	onBack: () => void
	onPlatform: () => void
	onCommand: () => void
	engagement: ExecuteLaunchIntent
	onVerified: () => void
}) {
	const [view, setView] = useState<ExecuteWorkspaceView>("topology")
	const [selectedTask, setSelectedTask] = useState<ExecuteWorkspaceId>("authority")
	const [runState, setRunState] = useState<ExecuteRunState>(engagement.autoStart ? "running" : "idle")
	const [deployRequested, setDeployRequested] = useState(false)
	const [auditExported, setAuditExported] = useState(false)
	const [steerDrafts, setSteerDrafts] = useState<Record<string, string>>({})
	const [steeringMessages, setSteeringMessages] = useState<Record<string, string[]>>({})
	const threadScrollRef = useRef<HTMLDivElement>(null)
	const task = EXECUTE_TASKS.find((item) => item.id === selectedTask) ?? EXECUTE_TASKS[0]
	const workspaceIndex = EXECUTE_TASKS.findIndex((item) => item.id === task.id)
	const workspaceNumber = String(workspaceIndex + 1).padStart(2, "0")
	const workspaceProfile = EXECUTE_WORKSPACE_PROFILES[task.id]
	const steer = steerDrafts[selectedTask] ?? ""
	const workspaceMessages = steeringMessages[selectedTask] ?? []
	const steeringCounts = Object.fromEntries(EXECUTE_TASKS.map((item) => [item.id, steeringMessages[item.id]?.length ?? 0]))

	useEffect(() => {
		if (runState !== "running") return
		const timer = window.setTimeout(() => {
			setRunState("verified")
			onVerified()
		}, 1600)
		return () => window.clearTimeout(timer)
		// The parent callback is recreated by the shell, while a run must keep one completion timer.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [runState])

	const sendSteer = () => {
		const message = steer.trim()
		if (!message) return
		setSteeringMessages((items) => ({ ...items, [selectedTask]: [...(items[selectedTask] ?? []), message] }))
		setSteerDrafts((items) => ({ ...items, [selectedTask]: "" }))
		setRunState("running")
	}
	const openWorkspace = (taskId: string) => {
		const nextTask = EXECUTE_TASKS.find((item) => item.id === taskId)
		if (!nextTask) return
		setSelectedTask(nextTask.id)
		window.requestAnimationFrame?.(() => {
			threadScrollRef.current?.scrollTo?.({ top: 0, behavior: "auto" })
		})
	}
	const workspaceStatus = runState === "verified" ? "Verified" : runState === "running" ? "Working" : "Ready"
	const panelItems: Array<{ id: Exclude<ExecuteWorkspaceView, "activity">; label: string; count?: string; icon: typeof CirclesThree }> = [
		{ id: "topology", label: "Topology", count: "5", icon: CirclesThree },
		{ id: "changes", label: "Changes", count: String(workspaceProfile.files.length), icon: FileText },
		{ id: "tests", label: "Tests", count: String(workspaceProfile.tests), icon: ListChecks },
		{ id: "terminal", label: "Terminal", icon: TerminalWindow },
		{ id: "deploys", label: "Deploys", count: "1", icon: ArrowRight },
		{ id: "audit", label: "Audit", icon: ShieldCheck },
	]

	return (
		<div className="aex-app aex-app--workspace">
			<aside className="aex-rail" aria-label="Execute tasks">
				<header>
					<button type="button" className="aex-brand" aria-label="Return to MAXION" onClick={onPlatform}><MaxionSpiralMark className="aex-brand-mark" /><span><strong>Execute</strong><small>MAXION</small></span></button>
					<button type="button" className="aex-new-task" onClick={onBack}><Plus size={15} />New task<kbd>⌘N</kbd></button>
				</header>
				<nav aria-label="Engagement workspaces">
					<span>Current engagement</span>
					<button type="button" className="is-current"><i className={runState === "running" ? "is-running" : runState === "verified" ? "is-verified" : "is-ready"} /><span><strong>{engagement.title}</strong><small>{workspaceStatus} · 5 workspaces</small></span></button>
					<span>Workspaces</span>
					{EXECUTE_TASKS.map((item, index) => <button type="button" key={item.id} aria-label={`Open Workspace ${String(index + 1).padStart(2, "0")}: ${item.title}`} className={selectedTask === item.id ? "is-selected" : ""} onClick={() => openWorkspace(item.id)}><Code size={14} /><span><strong>{item.title}</strong><small>Workspace {String(index + 1).padStart(2, "0")}{steeringCounts[item.id] ? ` · ${steeringCounts[item.id]} direction${steeringCounts[item.id] === 1 ? "" : "s"}` : ""}</small></span>{selectedTask === item.id ? <CaretRight size={13} /> : null}</button>)}
				</nav>
				<footer><span><i />max-ai-platform</span><small>{workspaceProfile.branch}</small></footer>
			</aside>

			<section className="aex-workspace">
				<header className="aex-workspace-bar">
					<div><button type="button" aria-label="All engagements" onClick={onBack}><ArrowLeft size={16} /></button><span><strong>{engagement.title}</strong><small>max-ai-platform · isolated worktree</small></span></div>
					<div><button type="button" className="aex-command" aria-label="Search Execute" onClick={onCommand}><MagnifyingGlass size={15} /><span>Search</span><kbd>⌘K</kbd></button><span className={`aex-run-status is-${runState}`}><i />{workspaceStatus}</span><button type="button" aria-label="Execute notifications"><Bell size={16} /></button></div>
				</header>

				<div className="aex-workspace-body">
					<main className="aex-thread">
						<div className="aex-thread-scroll" ref={threadScrollRef}>
							<header className="aex-thread-title">
								<div><span>{workspaceStatus} · Workspace {workspaceNumber}</span><h1>{task.title}</h1><p>{task.detail}. MAX owns implementation and repair inside this workspace’s approved boundary.</p></div>
								<div><button type="button" disabled={runState !== "running"} onClick={() => setRunState("idle")}><Pause size={14} />Interrupt</button><ExecuteRunButton runState={runState} onRun={() => setRunState("running")} /></div>
							</header>

							{engagement.source === "plan" ? <button type="button" className="aex-thread-context"><FlowArrow size={14} /><span><strong>Imported from Plan</strong><small>{engagement.brief}</small></span><ArrowRight size={13} /></button> : null}
							<article className="aex-message is-user"><span>RA</span><div><header><strong>You</strong><time>9:41 AM</time></header><p>{workspaceProfile.seed}</p></div></article>
							<article className="aex-message is-agent"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p>{workspaceProfile.agentIntro}</p></div></article>

							<section className={`aex-live-run is-${runState}`} aria-live="polite">
								<header><span>{runState === "running" ? <SpinnerGap className="mxp-spin" size={15} /> : <CheckCircle size={15} />}<strong>{runState === "verified" ? "Implementation complete" : runState === "running" ? "MAX is working autonomously" : "Ready to execute"}</strong></span><small>4 actions</small></header>
								<div className="aex-trace-row"><Check size={13} /><span><strong>{workspaceProfile.steps[0]}</strong><small>Boundaries resolved</small></span><time>0.8s</time></div>
								<div className="aex-trace-row"><span className={runState === "running" ? "aex-live-dot" : "aex-check-dot"}>{runState === "running" ? <SpinnerGap className="mxp-spin" size={11} /> : <Check size={11} />}</span><span><strong>{workspaceProfile.steps[1]}</strong><small>{runState === "running" ? `Editing ${workspaceProfile.files.length} files` : runState === "verified" ? "Verified" : "Queued"}</small></span><time>{runState === "verified" ? "4.1s" : "—"}</time></div>
								<div className="aex-tool-call"><TerminalWindow size={14} /><code>{workspaceProfile.command}</code><span>{runState === "verified" ? <><Check size={12} />{workspaceProfile.tests} passed</> : runState === "running" ? <><SpinnerGap className="mxp-spin" size={12} />Running focused tests…</> : "Ready"}</span></div>
							</section>

							{workspaceMessages.map((message, index) => <article key={`${message}-${index}`} className="aex-message is-user"><span>RA</span><div><header><strong>You</strong><time>Now</time></header><p>{message}</p></div></article>)}
							{workspaceMessages.length ? <article className="aex-message is-agent"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p>{workspaceProfile.steerResponse} It will be included in cumulative verification.</p></div></article> : null}
							{runState === "verified" ? <motion.article className="aex-result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28, ease: [0.16, 1, 0.3, 1] }}><CheckCircle size={18} weight="fill" /><div><strong>{workspaceProfile.result}</strong><p><b>{workspaceProfile.tests} passed in 6.8s</b> · {workspaceProfile.resultMeta}</p><button type="button" onClick={() => setView("tests")}>Review evidence<ArrowRight size={13} /></button></div></motion.article> : null}
						</div>
						<form className="aex-steer" onSubmit={(event) => { event.preventDefault(); sendSteer() }}>
							<div className="aex-steer-scope"><Code size={14} /><span><small>Steering Workspace {workspaceNumber}</small><strong>{task.title}</strong></span></div>
							<textarea aria-label={`Steer Workspace ${workspaceNumber}: ${task.title}`} value={steer} onChange={(event) => setSteerDrafts((items) => ({ ...items, [selectedTask]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendSteer() } }} rows={1} placeholder="Steer this workspace’s agent or ask about the work…" />
							<footer><div><button type="button" aria-label="Attach context"><Paperclip size={15} /></button><span><ShieldCheck size={12} />Inside approved authority</span></div><button type="submit" aria-label="Send direction" disabled={!steer.trim()}><ArrowRight size={16} /></button></footer>
						</form>
					</main>

					<aside className="aex-inspector" aria-label="Engagement inspector">
						<nav aria-label="Execute workspace views">{panelItems.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" aria-label={`${item.label}${item.count ? ` ${item.count}` : ""}`} aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}><Icon size={15} /><span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button> })}</nav>
						<AnimatePresence initial={false}>
							{view === "topology" ? <motion.section key="topology" className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Live orchestration</span><h2>Workspace topology</h2><p>Five isolated workspaces, one cumulative gate. Select any workspace to open its agent session.</p></header><ExecuteWorkspaceTopology runState={runState} selectedTask={selectedTask} steeringCounts={steeringCounts} onSelectTask={openWorkspace} onOpenTests={() => setView("tests")} /><div className="aex-inspector-note"><ShieldCheck size={14} /><span><strong>Authority stays bounded</strong><small>Files, terminal, and tests only</small></span></div></motion.section> : null}
							{view === "changes" ? <motion.section key={`changes-${selectedTask}`} className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Workspace {workspaceNumber}</span><h2>Changes</h2><p>{workspaceProfile.files.length} files · +{workspaceProfile.files.reduce((sum, file) => sum + file.added, 0)} −2</p></header><div className="aex-file-list">{workspaceProfile.files.map((file, index) => <button type="button" key={file.name} className={index === 0 ? "is-active" : ""}><FileText size={14} /><span><strong>{file.name}</strong><small>{file.path}</small></span><b>+{file.added}</b></button>)}</div><pre className="aex-mini-diff"><code><span>export type WorkspaceChange = {'{'}</span>{"\n"}{workspaceProfile.diff.map((line) => <b key={line}>+ {line}{"\n"}</b>)}<span>{'}'}</span></code></pre></motion.section> : null}
							{view === "tests" ? <motion.section key={`tests-${selectedTask}`} className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Workspace {workspaceNumber} evidence</span><h2>Tests and release gates</h2><p>{runState === "verified" ? `${workspaceProfile.tests} passed · 0 failed` : "Failures return to this workspace’s agent automatically."}</p></header><div className="aex-test-summary"><CheckCircle size={20} /><span><strong>{runState === "verified" ? "Workspace gate passed" : runState === "running" ? "Verification in progress" : "Gate ready"}</strong><small>No skipped or flaky tests</small></span></div><div className="aex-test-list">{workspaceProfile.suites.map(([name, count]) => <div key={name}><Check size={13} /><span>{name}</span><b>{count} passed</b></div>)}</div></motion.section> : null}
							{view === "terminal" ? <motion.section key={`terminal-${selectedTask}`} className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Workspace {workspaceNumber}</span><h2>Terminal</h2><p>{workspaceProfile.branch}</p></header><pre className="aex-terminal" aria-label={`Workspace ${workspaceNumber} terminal`}><code>$ {workspaceProfile.command}{"\n\n"}{workspaceProfile.suites.slice(0, 3).map(([name]) => `PASS ${name.toLowerCase().replaceAll(" ", "-")}.spec.ts\n`)}{"\n"}<b>{runState === "verified" ? `${workspaceProfile.tests} passed · 0 failed · 6.8s` : "Ready"}</b></code></pre></motion.section> : null}
							{view === "deploys" ? <motion.section key="deploys" className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Governed release</span><h2>Deploys</h2><p>Production authority is never implied.</p></header><article className="aex-deploy"><span className={deployRequested ? "is-waiting" : ""}><ArrowRight size={17} /></span><div><strong>{deployRequested ? "Approval requested" : "Release candidate ready"}</strong><small>8f37c2 · rollback retained</small></div></article><button type="button" className="aex-panel-action" disabled={deployRequested || runState !== "verified"} onClick={() => setDeployRequested(true)}>{deployRequested ? "Awaiting release owner" : "Request deployment approval"}</button></motion.section> : null}
							{view === "audit" ? <motion.section key="audit" className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Immutable evidence</span><h2>Audit</h2><p>Every action carries source and actor attribution.</p></header><div className="aex-audit">{[["Now","Release gate verified"],["2 min","Authority contract updated"],["5 min","Boundary evaluated"],["7 min","Plan evidence bound"]].map(([time,title]) => <div key={title}><i /><time>{time}</time><span><strong>{title}</strong><small>Evidence fingerprint retained</small></span></div>)}</div><button type="button" className="aex-panel-action" onClick={() => setAuditExported(true)}>{auditExported ? "Audit export ready" : "Export audit package"}</button></motion.section> : null}
						</AnimatePresence>
					</aside>
				</div>
			</section>
		</div>
	)
}

function LegacyTaskFirstExecuteWorkspaceModule({
	onBack,
	onCommand,
	engagement,
	onVerified,
}: {
	onBack: () => void
	onCommand: () => void
	engagement: ExecuteLaunchIntent
	onVerified: () => void
}) {
	const [view, setView] = useState<ExecuteWorkspaceView>("activity")
	const [selectedTask, setSelectedTask] = useState("authority")
	const [runState, setRunState] = useState<ExecuteRunState>(engagement.autoStart ? "running" : "idle")
	const [deployRequested, setDeployRequested] = useState(false)
	const [auditExported, setAuditExported] = useState(false)
	const [steer, setSteer] = useState("")
	const [steeringMessages, setSteeringMessages] = useState<string[]>([])
	const task = EXECUTE_TASKS.find((item) => item.id === selectedTask) ?? EXECUTE_TASKS[0]

	useEffect(() => {
		if (runState !== "running") return
		const timer = window.setTimeout(() => {
			setRunState("verified")
			onVerified()
		}, 1600)
		return () => window.clearTimeout(timer)
		// The parent callback is intentionally excluded: it is recreated by the shell on render,
		// but a running engagement must keep one durable completion timer instead of restarting it.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [runState])

	const openTask = (taskId: string) => {
		setSelectedTask(taskId)
		setView("activity")
	}
	const sendSteer = () => {
		const message = steer.trim()
		if (!message) return
		setSteeringMessages((items) => [...items, message])
		setSteer("")
	}
	const statusTone = runState === "verified" ? "success" : runState === "running" ? "live" : "neutral"
	const workspaceStatus = runState === "verified" ? "Verified" : runState === "running" ? "Working" : "Ready"
	const viewItems: Array<{ id: ExecuteWorkspaceView; label: string; count?: string }> = [
		{ id: "activity", label: "Activity" },
		{ id: "topology", label: "Topology", count: "5" },
		{ id: "changes", label: "Changes", count: "4" },
		{ id: "tests", label: "Tests", count: "48" },
		{ id: "terminal", label: "Terminal" },
		{ id: "deploys", label: "Deploys", count: "1" },
		{ id: "audit", label: "Audit" },
	]

	return (
		<div className="mxp-execute-workbench">
			<header className="mxp-execute-workbench-bar">
				<div>
					<button type="button" aria-label="All engagements" onClick={onBack}><ArrowLeft size={15} /><span>All engagements</span></button>
					<i aria-hidden="true" />
					<span><strong>{engagement.title}</strong><small>max-ai-platform · 5 isolated workspaces</small></span>
				</div>
				<div>
					<button type="button" aria-label="Search Execute" className="mxp-workbench-search" onClick={onCommand}><MagnifyingGlass size={15} /><span>Search or ask</span><kbd>⌘K</kbd></button>
					<Status tone={statusTone} live={runState === "running"}>{runState === "verified" ? "Verified" : runState === "running" ? "Working" : "Ready"}</Status>
					<button type="button" aria-label="Execute notifications"><Bell size={16} /></button>
				</div>
			</header>
			<nav className="mxp-execute-workbench-tabs" aria-label="Execute workspace views">
				{viewItems.map((item) => <button key={item.id} type="button" aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}>{item.label}{item.count ? <span>{item.count}</span> : null}</button>)}
			</nav>

			<div className={`mxp-workbench-layout is-${view}`}>
				<AnimatePresence mode="wait" initial={false}>
					{view === "activity" ? (
						<motion.main key="activity" className="mxp-agent-thread" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
							<div className="mxp-agent-thread-scroll">
								{engagement.source === "plan" ? <button type="button" className="mxp-thread-context"><LinkSimple size={15} /><span><strong>Plan handoff attached</strong><small>{engagement.brief}</small></span><CaretRight size={14} /></button> : null}
								<header className="mxp-thread-heading">
									<div><small>{workspaceStatus} · Workspace 01</small><h1>{task.title}</h1><p>{task.detail}. MAX owns implementation and repair inside the approved boundary.</p></div>
									<div><button type="button" disabled={runState !== "running"} onClick={() => setRunState("idle")}><Pause size={14} />Interrupt</button><ExecuteRunButton runState={runState} onRun={() => setRunState("running")} /></div>
								</header>

								<article className="mxp-thread-message is-user"><span className="mxp-thread-avatar">RA</span><div><header><strong>You</strong><time>9:41 AM</time></header><p>{engagement.brief}</p></div></article>
								<article className="mxp-thread-message is-max"><MaxionMark size={30} /><div><header><strong>MAX</strong><time>Now</time></header><p>I mapped the outcome to the approved Plan, repository boundaries, and release policy. I’ll coordinate the workspaces, repair failures, and return when the cumulative gate is clean.</p></div></article>

								<section className="mxp-run-trace" aria-live="polite">
									<header><span>{runState === "running" ? <SpinnerGap className="mxp-spin" size={16} /> : <CheckCircle size={16} />}<strong>{runState === "verified" ? "Implementation complete" : runState === "running" ? "MAX is working autonomously" : "Execution plan ready"}</strong></span><small>4 steps</small></header>
									<div>{["Read the approved outcome and repository boundaries", "Implement the typed mission policy contract", "Run hostile, integration, and cumulative tests", "Repair failures and package verified evidence"].map((step, index) => {
										const complete = runState === "verified" || index === 0
										const current = runState === "running" && index === 1
										return <div key={step} className={current ? "is-current" : complete ? "is-complete" : ""}><span>{complete ? <Check size={11} /> : current ? <SpinnerGap className="mxp-spin" size={11} /> : index + 1}</span><strong>{step}</strong><small>{runState === "verified" ? "Verified" : complete ? "Complete" : current ? "Editing 3 files" : "Queued"}</small></div>
									})}</div>
								</section>

								<div className="mxp-thread-command"><TerminalWindow size={15} /><code>pnpm test mission-authority --runInBand</code><span>{runState === "verified" ? <><Check size={13} />passed</> : runState === "running" ? <><SpinnerGap className="mxp-spin" size={13} />Running focused tests…</> : "ready"}</span></div>
								{steeringMessages.map((message, index) => <article key={`${message}-${index}`} className="mxp-thread-message is-user"><span className="mxp-thread-avatar">RA</span><div><header><strong>You</strong><time>Now</time></header><p>{message}</p></div></article>)}
								{steeringMessages.length ? <article className="mxp-thread-message is-max"><MaxionMark size={30} /><div><header><strong>MAX</strong><time>Now</time></header><p>I’ve folded that direction into the active workspace. I’ll preserve the current authority boundary and include the result in cumulative verification.</p></div></article> : null}
								{runState === "verified" ? <motion.article className="mxp-thread-result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><CheckCircle size={20} weight="fill" /><div><strong>Mission authority API passed its release gate</strong><p><b>48 passed in 6.8s</b> · TypeScript clean · tenant isolation verified · no production effect</p><button type="button" onClick={() => setView("tests")}>Review evidence<ArrowRight size={14} /></button></div></motion.article> : null}
							</div>
							<form className="mxp-agent-composer" onSubmit={(event) => { event.preventDefault(); sendSteer() }}>
								<textarea aria-label="Steer the active engagement" value={steer} onChange={(event) => setSteer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendSteer() } }} rows={1} placeholder="Steer MAX, add context, or ask about the work…" />
								<div><span><button type="button" aria-label="Attach context"><Paperclip size={16} /></button><small><ShieldCheck size={13} />Inside approved authority</small></span><button type="submit" aria-label="Send direction" disabled={!steer.trim()}><ArrowRight size={16} /></button></div>
							</form>
						</motion.main>
					) : view === "topology" ? (
						<motion.main key="topology" className="mxp-execute-main mxp-execute-detail-view" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><small>Orchestrated delivery graph</small><h1>Workspace topology</h1><p>Dependencies, isolation boundaries, and current state across the engagement.</p></header><section className="mxp-workspace-topology-card is-expanded"><ExecuteWorkspaceTopology runState={runState} selectedTask={selectedTask} onSelectTask={openTask} onOpenTests={() => setView("tests")} /></section><section className="mxp-workspace-scope-grid">{EXECUTE_TASKS.map((item, index) => <article key={item.id}><span>0{index + 1}</span><div><h2>{item.title}</h2><p>{item.detail}</p><dl><div><dt>Branch</dt><dd>execute/erp/{item.id}</dd></div><div><dt>Allowed paths</dt><dd>{item.files} scoped files</dd></div><div><dt>Depends on</dt><dd>{index === 0 ? "Orchestrator" : EXECUTE_TASKS[index - 1].title}</dd></div></dl></div><button type="button" onClick={() => openTask(item.id)}>Open workspace</button></article>)}</section></motion.main>
					) : view === "changes" ? (
						<motion.main key="changes" className="mxp-execute-main mxp-execute-detail-view" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><small>Workspace 01</small><h1>Changes</h1><p>Review the artifact directly. MAX keeps the reasoning in the thread and the code here.</p></header><div className="mxp-changes-layout"><nav aria-label="Changed files">{["missionPolicy.ts", "authority.ts", "mission-policy.spec.ts", "tenant-isolation.spec.ts"].map((file, index) => <button type="button" key={file} className={index === 0 ? "is-active" : ""}><FileText size={15} /><span><strong>{file}</strong><small>{index < 2 ? "services/authority" : "tests/authority"}</small></span><b>+{index === 0 ? 34 : index === 1 ? 18 : index === 2 ? 42 : 27}</b></button>)}</nav><aside className="mxp-code-panel"><header><span>missionPolicy.ts</span><button type="button" aria-label="Open file actions"><DotsThree size={16} /></button></header><pre><code><span>export type MissionAuthority = {'{'}</span>{"\n"}<span className="is-added">+ tenantId: TenantId</span>{"\n"}<span className="is-added">+ missionVersion: number</span>{"\n"}<span className="is-added">+ permittedActions: Action[]</span>{"\n"}<span className="is-added">+ approvalBoundary: Boundary</span>{"\n"}<span>{'}'}</span>{"\n\n"}<span>export async function execute(</span>{"\n"}<span>  command: MissionCommand,</span>{"\n"}<span className="is-added">+ authority: MissionAuthority,</span>{"\n"}<span>) {'{'}</span>{"\n"}<span className="is-added">+ await policy.assert(command, authority)</span>{"\n"}<span className="is-added">+ return effects.dispatch(command)</span>{"\n"}<span>{'}'}</span></code></pre><footer><CheckCircle size={14} /><span>TypeScript clean · 4 files changed</span></footer></aside></div></motion.main>
					) : view === "tests" ? (
						<motion.main key="tests" className="mxp-execute-main mxp-execute-detail-view" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><small>Verified evidence</small><h1>Tests and release gates</h1><p>Failures return to the repair loop automatically. You only see evidence that survived the cumulative gate.</p><ExecuteRunButton runState={runState} onRun={() => setRunState("running")} /></header><section className="mxp-evidence-summary"><div><CheckCircle size={22} /><span><strong>{runState === "verified" ? "48 tests passed" : runState === "running" ? "Verification in progress" : "48 gates prepared"}</strong><small>{runState === "verified" ? "No skipped or flaky tests" : "MAX will repair failures before returning"}</small></span></div><Status tone={statusTone} live={runState === "running"}>{runState === "verified" ? "Release gate passed" : runState === "running" ? "Running" : "Ready"}</Status></section><section className="mxp-test-matrix">{[{ name: "Authority unit suite", count: 18, detail: "Nulls, boundaries, expiry, replay" }, { name: "Tenant isolation", count: 9, detail: "Cross-tenant and hostile identifiers" }, { name: "Service contracts", count: 13, detail: "API, queue, and provider failures" }, { name: "Cumulative release gate", count: 8, detail: "Build, types, regression, accessibility" }].map((suite) => <article key={suite.name}><CheckCircle size={17} /><div><strong>{suite.name}</strong><small>{suite.detail}</small></div><span>{runState === "verified" ? `${suite.count} passed` : `${suite.count} ready`}</span></article>)}</section></motion.main>
					) : view === "terminal" ? (
						<motion.main key="terminal" className="mxp-execute-main mxp-execute-detail-view" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><small>Workspace 01</small><h1>Terminal</h1><p>Commands run inside the isolated worktree. Output is streamed and retained with the audit chain.</p></header><section className="mxp-terminal-surface" aria-label="Workspace terminal"><header><span><i />max-ai-platform · execute/erp/authority</span><small>zsh</small></header><pre><span>$ pnpm test mission-authority --runInBand</span>{"\n\n"}<span>PASS  tests/authority/mission-policy.spec.ts</span>{"\n"}<span>PASS  tests/authority/tenant-isolation.spec.ts</span>{"\n"}<span>PASS  tests/authority/replay.spec.ts</span>{"\n\n"}<b>{runState === "verified" ? "48 passed · 0 failed · 6.8s" : runState === "running" ? "Running focused tests…" : "Ready to run"}</b></pre></section></motion.main>
					) : view === "deploys" ? (
						<motion.main key="deploys" className="mxp-execute-main mxp-execute-detail-view" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><small>Governed release</small><h1>Deploys</h1><p>Execute prepares release evidence but never gains production authority silently.</p></header><section className="mxp-deploy-card"><div><span className={deployRequested ? "is-requested" : ""}><ArrowRight size={18} /></span><div><small>Production · max-ai-platform</small><h2>{deployRequested ? "Deployment approval requested" : "Release candidate ready"}</h2><p>Commit candidate 8f37c2 · 48 tests passed · rollback artifact retained.</p></div></div><Status tone={deployRequested ? "attention" : "success"}>{deployRequested ? "Awaiting authority" : "Verified"}</Status><button type="button" className="mxp-primary" disabled={deployRequested || runState !== "verified"} onClick={() => setDeployRequested(true)}>{deployRequested ? "Approval requested" : "Request deployment approval"}</button></section><section className="mxp-release-safeguards"><article><ShieldCheck size={17} /><div><h2>Approval boundary</h2><p>A release owner must approve the exact environment, artifact, and effect.</p></div></article><article><Clock size={17} /><div><h2>Rollback retained</h2><p>The previous artifact and compatibility checks are ready before deployment.</p></div></article><article><Database size={17} /><div><h2>Audit continuity</h2><p>Requester, approver, fingerprint, and provider receipt remain linked.</p></div></article></section></motion.main>
					) : (
						<motion.main key="audit" className="mxp-execute-main mxp-execute-detail-view" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><small>Immutable evidence chain</small><h1>Audit</h1><p>Every agent decision, tool call, approval, test result, and artifact change carries source and actor attribution.</p><button type="button" onClick={() => setAuditExported(true)}><FileText size={14} />{auditExported ? "Audit export ready" : "Export audit package"}</button></header><section className="mxp-audit-timeline" aria-live="polite">{[{ time: "Now", title: "Cumulative release gate verified", detail: "MAX Execute · requested by Root Admin · 48 results" }, { time: "2 min", title: "Mission authority contract updated", detail: "Workspace 01 · 3 files · artifact fingerprint retained" }, { time: "5 min", title: "Repository boundary evaluated", detail: "Policy engine · allowed paths matched · no widening" }, { time: "7 min", title: "Plan evidence bound to engagement", detail: "ERP modernization delivery plan · snapshot v7" }].map((event) => <article key={event.title}><span><i /></span><time>{event.time}</time><div><h2>{event.title}</h2><p>{event.detail}</p></div><CheckCircle size={15} /></article>)}</section>{auditExported ? <div className="mxp-verified-result"><CheckCircle size={18} /><span><strong>Audit package is ready</strong><small>Events, source bindings, approvals, and test evidence included</small></span></div> : null}</motion.main>
					)}
				</AnimatePresence>

				{view === "activity" ? <aside className="mxp-workbench-inspector">
					<header><div><small>Live orchestration</small><h2>Workspace topology</h2></div><button type="button" onClick={() => setView("topology")}>Open map<ArrowRight size={13} /></button></header>
					<ExecuteWorkspaceTopology runState={runState} selectedTask={selectedTask} onSelectTask={openTask} onOpenTests={() => setView("tests")} />
					<section className="mxp-inspector-section"><header><strong>Changes</strong><button type="button" onClick={() => setView("changes")}>4 files</button></header><button type="button" onClick={() => setView("changes")}><FileText size={15} /><span><strong>missionPolicy.ts</strong><small>+34 −2 · just now</small></span><CaretRight size={13} /></button><button type="button" onClick={() => setView("changes")}><FileText size={15} /><span><strong>mission-policy.spec.ts</strong><small>+42 · 1 min</small></span><CaretRight size={13} /></button></section>
					<section className="mxp-inspector-context"><div><ShieldCheck size={14} /><span><strong>Authority</strong><small>Files, terminal, tests</small></span></div><div><Database size={14} /><span><strong>Memory</strong><small>12 evidence-linked decisions</small></span></div></section>
				</aside> : null}
			</div>
		</div>
	)
}

function ConsultModule({ onCommand, onNavigate }: { onCommand: () => void; onNavigate: (module: MaxionModuleId) => void }) {
	const [input, setInput] = useState("")
	const [messages, setMessages] = useState<Array<{ actor: "MAX" | "You"; text: string }>>([{ actor: "MAX", text: "I can answer across the authorized MAXION context—Discovery evidence, Plan decisions, Execute state, and Agentix outcomes. What do you need to understand or decide?" }])
	const submit = () => { const value = input.trim(); if (!value) return; setMessages((items) => [...items, { actor: "You", text: value }, { actor: "MAX", text: "Two things need attention: the July close exact-effect approval in Agentix and the external-counsel authority boundary in Discovery. The ERP delivery plan is decision-ready; Execute is progressing inside its isolated worktree. I can open either boundary without changing its authority." }]); setInput("") }
	return <div className="mxp-consult mxp-module-with-rail"><ContextRail title="Consult MAX" kicker="Cross-platform intelligence" footer={<div className="mxp-rail-user"><span>RA</span><div><strong>Root Admin</strong><small>Authorized tenant context</small></div></div>}><button type="button" className="mxp-rail-primary"><Plus size={14} />New conversation</button><div className="mxp-rail-label">Recent</div><button type="button" className="is-active"><ChatCircleText size={15} /><span><strong>What needs my attention?</strong><small>Just now</small></span></button><button type="button"><ChatCircleText size={15} /><span><strong>ERP decision history</strong><small>Yesterday</small></span></button><div className="mxp-rail-label">Scope</div><button type="button"><Database size={15} /><span>All MAXION context</span><i className="mxp-success-dot" /></button></ContextRail><div className="mxp-module-area"><ModuleHeader label="Consult MAX" title="Cross-platform conversation" detail="Answers preserve source, ownership, and authority" onCommand={onCommand} /><main className="mxp-consult-main"><header><MaxionMark size={34} /><span>Consult MAX</span><h1>Ask across the work, not around it.</h1><p>Consult MAX explains the current truth across modules. It can route you to work, but it cannot silently approve or execute it.</p></header><div className="mxp-consult-thread">{messages.map((message, index) => <article key={`${message.actor}-${index}`} className={message.actor === "You" ? "is-user" : "is-max"}>{message.actor === "MAX" ? <MaxionMark size={27} /> : <span className="mxp-user-avatar">RA</span>}<div><span>{message.actor}<time>Now</time></span><p>{message.text}</p>{message.actor === "MAX" && index > 0 ? <div className="mxp-answer-actions"><button type="button" onClick={() => onNavigate("agentix")}><Sparkle size={13} />Open Agentix approval</button><button type="button" onClick={() => onNavigate("discovery")}><MagnifyingGlass size={13} />Open Discovery boundary</button></div> : null}</div></article>)}</div></main><div className="mxp-consult-composer"><div><textarea aria-label="Message Consult MAX" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder="Ask what changed, what needs attention, or why a decision was made…" rows={1} /><div><span><button type="button" aria-label="Attach context"><Paperclip size={15} /></button><small><Database size={13} />All authorized MAXION context</small></span><button type="button" aria-label="Send to Consult MAX" disabled={!input.trim()} onClick={submit}><ArrowRight size={15} /></button></div></div></div></div></div>
}

function CommandMenu({ open, active, onClose, onNavigate }: { open: boolean; active: MaxionModuleId; onClose: () => void; onNavigate: (module: MaxionModuleId) => void }) {
	if (!open) return null
	const items = [...PRIMARY_NAVIGATION, { id: "integrations" as const, label: "Integrations", icon: Plug }]
	return <div className="mxp-command-layer" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><motion.section role="dialog" aria-modal="true" aria-label="MAXION command menu" initial={{ opacity: 0, scale: 0.98, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}><div className="mxp-command-search"><MagnifyingGlass size={16} /><input autoFocus aria-label="Search MAXION commands" placeholder="Search modules, work, and actions…" /><kbd>Esc</kbd></div><div className="mxp-command-label">Go to</div>{items.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => onNavigate(item.id)}>{"spiral" in item && item.spiral ? <MaxionSpiralMark className="mxp-command-spiral" /> : Icon ? <Icon size={16} /> : null}<span><strong>{item.label}</strong><small>{item.id === active ? "Current module" : item.id === "consult" ? "Ask across MAXION" : `Open ${item.label}`}</small></span>{item.id === active ? <Check size={14} /> : <CaretRight size={13} />}</button> })}<div className="mxp-command-label">Quick actions</div><button type="button" onClick={() => onNavigate("discovery")}><Plus size={16} /><span><strong>Start a Discovery</strong><small>Autonomous research and interviews</small></span><CaretRight size={13} /></button><button type="button" onClick={() => onNavigate("agentix")}><Lightning size={16} /><span><strong>Create an operational Agent</strong><small>Activate bounded autonomous work</small></span><CaretRight size={13} /></button></motion.section></div>
}

export function MaxionPlatformPrototypePage() {
	useDocumentTitle("MAXION · Unified platform prototype")
	const location = useLocation()
	const initialModule: MaxionModuleId = location.pathname.includes("agentix") ? "agentix" : "dashboard"
	const [activeModule, setActiveModule] = useState<MaxionModuleId>(initialModule)
	const [commandOpen, setCommandOpen] = useState(false)
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const [projects, setProjects] = useState(INITIAL_PROJECTS)
	const [discoveryReady, setDiscoveryReady] = useState(false)
	const [planSent, setPlanSent] = useState(false)
	const [executeVerified, setExecuteVerified] = useState(false)

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true) }
			if (event.key === "Escape") setCommandOpen(false)
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [])

	const navigate = (module: MaxionModuleId) => {
		// Execute is a focused, long-running workspace. Keep MAXION navigation one
		// action away without taking meaningful width away from the work surface.
		if (module === "execute") {
			setSidebarCollapsed(true)
		}
		setActiveModule(module)
		setCommandOpen(false)
		setMobileNavOpen(false)
	}
	const currentLabel = PRIMARY_NAVIGATION.find((item) => item.id === activeModule)?.label ??
		({ settings: "Settings", integrations: "Integrations", approvals: "My approvals", usage: "Usage", help: "Help" } as const)[activeModule as "settings" | "integrations" | "approvals" | "usage" | "help"] ??
		"MAXION"

	return (
		<div className={`maxion-platform-prototype mxp-root${activeModule === "execute" ? " mxp-root--execute" : ""}${sidebarCollapsed ? " mxp-root--sidebar-collapsed" : ""}`}>
			<PortalSidebar active={activeModule} onNavigate={navigate} onCommand={() => setCommandOpen(true)} mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
			<div className="mxp-stage" aria-label={`${currentLabel} module`}>
				<div className="mxp-stage-view" hidden={activeModule !== "dashboard"}><DashboardModule projects={projects} onNavigate={navigate} discoveryReady={discoveryReady} planSent={planSent} executeVerified={executeVerified} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "projects"}><ProjectsModule projects={projects} onProjectsChange={setProjects} onNavigate={navigate} /></div>
				<div className="mxp-stage-view mxp-stage-view--discovery" hidden={activeModule !== "discovery"}><DiscoveryAutonomousPrototypePage embedded onPackageReady={() => setDiscoveryReady(true)} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "plan"}><PlanModule projects={projects} onNavigate={navigate} onCommand={() => setCommandOpen(true)} onSendToExecute={() => { setPlanSent(true); navigate("execute") }} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "execute"}><ExecuteModule onNavigate={navigate} onCommand={() => setCommandOpen(true)} planHandoff={planSent} onVerified={() => setExecuteVerified(true)} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "agentix"}><AgentixPrototypePage embedded /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "consult"}><ConsultModule onCommand={() => setCommandOpen(true)} onNavigate={navigate} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "integrations"}><IntegrationsModule /></div>
				{(["settings", "approvals", "usage", "help"] as const).map((module) => <div key={module} className="mxp-stage-view" hidden={activeModule !== module}><AccountUtilityModule module={module} onNavigate={navigate} /></div>)}
			</div>
			<AnimatePresence>{commandOpen ? <CommandMenu open={commandOpen} active={activeModule} onClose={() => setCommandOpen(false)} onNavigate={navigate} /> : null}</AnimatePresence>
		</div>
	)
}
