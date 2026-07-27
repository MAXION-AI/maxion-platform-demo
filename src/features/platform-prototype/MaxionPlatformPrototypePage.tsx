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

type PlanView = "run" | "architecture" | "backlog" | "roadmap" | "evidence"
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
		nodes: ReadonlyArray<{ title: string; detail: string; tone: "source" | "core" | "store" | "effect" }>
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
		id: "adapter", number: "02", key: "CMP-INT-02", title: "ServiceNow financial-change event intake", owner: "Enterprise integration", evidence: "19 connector claims", items: 8, dependsOn: "CMP-AUTH-01", risk: "High",
		summary: "Translate only approved ServiceNow change events into normalized, replay-safe work requests.",
		levels: {
			L2: { name: "System context", focus: "How an approved workflow event enters the financial-controls boundary.", nodes: [{ title: "ServiceNow", detail: "Approved change event", tone: "source" }, { title: "Integration boundary", detail: "Authenticate + normalize", tone: "core" }, { title: "Mission authority", detail: "Scope verification", tone: "core" }, { title: "Work queue", detail: "Tenant-scoped request", tone: "store" }], guidance: ["Treat provider payloads as hostile", "Accept only allowlisted event types", "Retain the provider event ID and source fingerprint"] },
			L3: { name: "Service interaction", focus: "Connector, validation, translation, policy, and queue contracts.", nodes: [{ title: "Webhook gateway", detail: "Signature + rate limit", tone: "source" }, { title: "Event translator", detail: "Typed financial change", tone: "core" }, { title: "Deduplication store", detail: "Provider event key", tone: "store" }, { title: "Mission queue", detail: "Authorized command", tone: "effect" }], guidance: ["Acknowledge only after durable receipt", "Quarantine schema drift instead of guessing", "Bound retries with exponential backoff and dead-letter handling"] },
			L4: { name: "Implementation sequence", focus: "Signature verification through durable, duplicate-safe enqueue.", nodes: [{ title: "verifyWebhook()", detail: "Raw body + secret", tone: "source" }, { title: "parseEvent()", detail: "Discriminated union", tone: "core" }, { title: "claimEventId()", detail: "Atomic uniqueness", tone: "store" }, { title: "enqueueMission()", detail: "Outbox dispatch", tone: "effect" }], guidance: ["Preserve raw payload hash without logging payload data", "Use one transaction for receipt, dedupe claim, and outbox", "Acceptance: repeated delivery creates one mission request"] },
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

function PlanWorkspaceModule({ onBack, onCommand, onSendToExecute }: { onBack: () => void; onCommand: () => void; onSendToExecute: () => void }) {
	const [view, setView] = useState<PlanView>("run")
	const [approved, setApproved] = useState(false)
	const [selectedFlowId, setSelectedFlowId] = useState(PLAN_FLOWS[0].id)
	const [level, setLevel] = useState<PlanArchitectureLevel>("L2")
	const [steer, setSteer] = useState("")
	const [steering, setSteering] = useState<Array<{ role: "user" | "max"; text: string }>>([])
	const selectedFlow = PLAN_FLOWS.find((flow) => flow.id === selectedFlowId) ?? PLAN_FLOWS[0]
	const selectedDiagram = selectedFlow.levels[level]
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
				<header className="apn-topbar"><div><button type="button" className="apn-mobile-back" onClick={onBack}><ArrowLeft size={14} />Plans</button><span>ERP modernization delivery plan</span><small>Verified Discovery · snapshot v12</small></div><div><span className="apn-autonomy"><i />Autonomous</span><span className="apn-run-meta">8 passes · $3.82 · 18m</span><button type="button" className={approved ? "is-approved" : ""} onClick={() => setApproved(true)}>{approved ? <CheckCircle size={15} weight="fill" /> : <ShieldCheck size={15} />}{approved ? "Approved" : "Approve plan"}</button><button type="button" className="apn-execute" disabled={!approved} title={approved ? "Send approved L3 and L4 artifacts to Execute" : "Approve the plan before Execute handoff"} onClick={onSendToExecute}>Send to Execute<ArrowRight size={14} /></button></div></header>

				{view === "run" ? <PlanAgentRun steering={steering} steer={steer} onSteerChange={setSteer} onSubmitSteer={submitSteer} onOpenArchitecture={() => openArchitecture("authority", "L2")} onOpenImplementation={() => setView("backlog")} /> : null}
				{view === "architecture" ? <PlanArchitectureView selectedFlow={selectedFlow} level={level} onLevelChange={setLevel} onSelectFlow={setSelectedFlowId} /> : null}
				{view === "backlog" ? <PlanImplementationView onOpenArchitecture={openArchitecture} /> : null}
				{view === "roadmap" ? <PlanDependencyView onOpenArchitecture={openArchitecture} /> : null}
				{view === "evidence" ? <PlanEvidenceView /> : null}
			</section>

			<aside className="apn-inspector" aria-label="Plan inspector">
				<header><span>{view === "architecture" ? `${selectedFlow.number} · ${level}` : "Plan readiness"}</span><button type="button" aria-label="Plan options"><DotsThree size={17} /></button></header>
				{view === "architecture" ? <><section className="apn-inspector-intro"><span>{selectedFlow.key}</span><h2>{selectedFlow.title}</h2><p>{selectedFlow.summary}</p></section><dl className="apn-inspector-facts"><div><dt>Owner</dt><dd>{selectedFlow.owner}</dd></div><div><dt>Risk</dt><dd>{selectedFlow.risk}</dd></div><div><dt>Evidence</dt><dd>{selectedFlow.evidence}</dd></div><div><dt>L4 items</dt><dd>{selectedFlow.items} ready</dd></div></dl><section className="apn-contract"><header><ShieldCheck size={15} /><strong>Implementation contract</strong></header><p>L3 and L4 are authoritative for Execute. This flow cannot run if its contracts, acceptance criteria, or evidence become stale.</p><span><CheckCircle size={13} weight="fill" />Runnable</span></section><section className="apn-inspector-guidance"><span>{selectedDiagram.name}</span><strong>{selectedDiagram.focus}</strong>{selectedDiagram.guidance.map((item) => <p key={item}><Check size={12} />{item}</p>)}</section></> : <PlanReadiness approved={approved} onApprove={() => setApproved(true)} onOpenArchitecture={() => openArchitecture("authority", "L2")} />}
			</aside>
		</div>
	)
}

function PlanAgentRun({ steering, steer, onSteerChange, onSubmitSteer, onOpenArchitecture, onOpenImplementation }: { steering: Array<{ role: "user" | "max"; text: string }>; steer: string; onSteerChange: (value: string) => void; onSubmitSteer: () => void; onOpenArchitecture: () => void; onOpenImplementation: () => void }) {
	const steps = [
		["Grounded the plan", "124 verified claims across Discovery, project context, ServiceNow, SAP, and policy documents."],
		["Decomposed every implementation flow", "Generated five bounded flows, fifteen L2–L4 diagrams, and thirty-five implementation items."],
		["Challenged the architecture", "Security, reliability, and implementation critics found three gaps; MAX repaired all three."],
		["Prepared the Execute contract", "Every runnable workspace now binds to an L3 contract, L4 sequence, acceptance evidence, and rollback boundary."],
	] as const
	return <main className="apn-main apn-run"><div className="apn-run-column"><section className="apn-run-hero"><span><i />Autonomous plan run complete</span><h1>MAX built the implementation plan.</h1><p>It assembled the evidence, made the decomposition, drew every architecture flow, tested the guidance, and prepared the work for Execute. Your only required action is approval.</p></section><section className="apn-agent-thread" aria-label="Autonomous Plan activity"><div className="apn-agent-message"><MaxionSpiralMark /><div><strong>MAX</strong><p>I used the verified Discovery package as the decision source of truth. Where evidence was incomplete, I chose the safest reversible assumption and marked it in the plan.</p></div></div><ol>{steps.map(([title, detail], index) => <li key={title}><span><Check size={12} /></span><div><strong>{title}</strong><p>{detail}</p></div><time>{index === 0 ? "14:02" : index === 1 ? "14:08" : index === 2 ? "14:15" : "14:19"}</time></li>)}</ol>{steering.map((message, index) => message.role === "user" ? <div className="apn-user-message" key={`${message.text}-${index}`}><span>You</span><p>{message.text}</p></div> : <div className="apn-agent-message is-response" key={`${message.text}-${index}`}><MaxionSpiralMark /><div><strong>MAX</strong><p>{message.text}</p></div></div>)}</section><section className="apn-output"><header><div><span>Implementation package</span><strong>Ready for approval</strong></div><CheckCircle size={19} weight="fill" /></header><div><button type="button" onClick={onOpenArchitecture}><CirclesThree size={17} /><span><strong>15 architecture diagrams</strong><small>L2 context · L3 contracts · L4 sequences</small></span><ArrowRight size={14} /></button><button type="button" onClick={onOpenImplementation}><ListChecks size={17} /><span><strong>35 implementation items</strong><small>Acceptance, dependencies, tests, and rollback</small></span><ArrowRight size={14} /></button></div></section><form className="apn-composer" onSubmit={(event) => { event.preventDefault(); onSubmitSteer() }}><textarea aria-label="Steer the Plan agent" value={steer} onChange={(event) => onSteerChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmitSteer() } }} placeholder="Steer MAX only if something needs to change…" rows={2} /><footer><span><Sparkle size={13} />MAX will update affected artifacts and re-run critics</span><button type="submit" disabled={!steer.trim()} aria-label="Send Plan direction"><ArrowRight size={15} /></button></footer></form></div></main>
}

type PlanDiagramNode = PlanFlow["levels"][PlanArchitectureLevel]["nodes"][number]

function PlanArchitectureDiagram({ level, flowTitle, nodes }: { level: PlanArchitectureLevel; flowTitle: string; nodes: readonly PlanDiagramNode[] }) {
	const model = level === "L2" ? "Context boundary" : level === "L3" ? "Service contract map" : "Implementation sequence"
	const nodePositions = nodes.map((_, index) => `is-node-${Math.min(index, 3)}`)
	return (
		<div className="apn-diagram-viewport">
			<div className={`apn-architecture-diagram is-${level.toLowerCase()}`} role="img" tabIndex={0} aria-label={`${level} diagram for ${flowTitle}`}>
				<svg viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
					<defs>
						<marker id="apn-arrow" markerWidth="8" markerHeight="8" refX="6.4" refY="3.6" orient="auto"><path d="M0,0 L7,3.6 L0,7.2 Z" /></marker>
					</defs>
					{level === "L2" ? <>
						<rect className="apn-diagram-boundary" x="24" y="30" width="952" height="296" rx="16" />
						<text className="apn-diagram-svg-label" x="48" y="58">GOVERNED MISSION BOUNDARY</text>
						<rect className="apn-diagram-zone is-entry" x="42" y="82" width="190" height="208" rx="12" />
						<rect className="apn-diagram-zone is-control" x="256" y="82" width="470" height="208" rx="12" />
						<rect className="apn-diagram-zone is-effect" x="750" y="82" width="208" height="208" rx="12" />
						<text className="apn-diagram-zone-label" x="60" y="107">REQUEST</text>
						<text className="apn-diagram-zone-label" x="278" y="107">GOVERNED DECISION</text>
						<text className="apn-diagram-zone-label" x="770" y="107">APPROVED EFFECT</text>
						{[238, 488, 738].map((x) => <path key={x} className="apn-diagram-link" d={`M ${x} 192 H ${x + 24}`} markerEnd="url(#apn-arrow)" />)}
					</> : level === "L3" ? <>
						<rect className="apn-diagram-boundary" x="24" y="30" width="952" height="296" rx="16" />
						<text className="apn-diagram-svg-label" x="48" y="58">TENANT-SCOPED SERVICE PLANE</text>
						<path className="apn-diagram-link" d="M 210 206 C 270 206, 274 138, 330 138" markerEnd="url(#apn-arrow)" />
						<path className="apn-diagram-link" d="M 460 138 C 520 138, 534 244, 588 244" markerEnd="url(#apn-arrow)" />
						<path className="apn-diagram-link" d="M 714 244 C 772 244, 770 178, 820 178" markerEnd="url(#apn-arrow)" />
						<path className="apn-diagram-return" d="M 820 200 C 690 304, 368 304, 210 228" markerEnd="url(#apn-arrow)" />
						<text className="apn-diagram-edge-label" x="244" y="165">typed contract</text>
						<text className="apn-diagram-edge-label" x="520" y="194">durable decision</text>
						<text className="apn-diagram-edge-label" x="744" y="212">signed handoff</text>
					</> : <>
						<rect className="apn-diagram-boundary" x="24" y="30" width="952" height="296" rx="16" />
						<text className="apn-diagram-svg-label" x="48" y="58">IMPLEMENTATION SEQUENCE · DURABLE STATE AT EVERY BOUNDARY</text>
						{[130, 370, 610, 850].map((x) => <line key={x} className="apn-diagram-lifeline" x1={x} x2={x} y1="158" y2="314" />)}
						<path className="apn-diagram-link" d="M 130 184 H 364" markerEnd="url(#apn-arrow)" />
						<path className="apn-diagram-link" d="M 370 228 H 604" markerEnd="url(#apn-arrow)" />
						<path className="apn-diagram-link" d="M 610 272 H 844" markerEnd="url(#apn-arrow)" />
						<path className="apn-diagram-return" d="M 850 304 H 136" markerEnd="url(#apn-arrow)" />
						<text className="apn-diagram-edge-label" x="206" y="176">validate intent</text>
						<text className="apn-diagram-edge-label" x="450" y="220">persist decision</text>
						<text className="apn-diagram-edge-label" x="694" y="264">issue handoff</text>
						<text className="apn-diagram-edge-label" x="466" y="296">return receipt / evidence</text>
					</>}
				</svg>
				<div className="apn-diagram-model"><span>{level}</span><strong>{model}</strong></div>
				{nodes.map((node, index) => <section key={node.title} className={`apn-diagram-node ${nodePositions[index]} is-${node.tone}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{node.title}</strong><small>{node.detail}</small></section>)}
				<div className="apn-diagram-legend" aria-hidden="true"><span className="is-source">Entry</span><span className="is-core">Control</span><span className="is-store">Durable state</span><span className="is-effect">Effect / handoff</span></div>
			</div>
		</div>
	)
}

function PlanArchitectureView({ selectedFlow, level, onLevelChange, onSelectFlow }: { selectedFlow: PlanFlow; level: PlanArchitectureLevel; onLevelChange: (level: PlanArchitectureLevel) => void; onSelectFlow: (flowId: string) => void }) {
	const diagram = selectedFlow.levels[level]
	return <main className="apn-main apn-architecture-view"><header className="apn-view-heading"><div><span>Implementation architecture</span><h1>Every flow, from intent to code.</h1><p>L2 defines the boundary. L3 defines the service contracts. L4 is the implementation and acceptance guidance Execute must follow.</p></div><div><strong>15 / 15</strong><small>diagrams generated</small></div></header><div className="apn-architecture-layout"><nav aria-label="Architecture flows"><span>Architecture flows</span>{PLAN_FLOWS.map((flow) => <button key={flow.id} type="button" className={selectedFlow.id === flow.id ? "is-active" : ""} onClick={() => onSelectFlow(flow.id)}><i>{flow.number}</i><span><strong>{flow.title}</strong><small>{flow.key} · {flow.items} L4 items</small></span><CheckCircle size={14} weight="fill" /></button>)}</nav><section className="apn-diagram-panel"><header><div><span>{selectedFlow.key}</span><h2>{selectedFlow.title}</h2></div><div role="group" aria-label="Architecture level">{(["L2", "L3", "L4"] as const).map((item) => <button key={item} type="button" aria-pressed={level === item} onClick={() => onLevelChange(item)}><strong>{item}</strong><small>{item === "L2" ? "Context" : item === "L3" ? "Contracts" : "Build"}</small></button>)}</div></header><div className="apn-diagram-meta"><span>{diagram.name}</span><p>{diagram.focus}</p><i><CheckCircle size={12} weight="fill" />Generated and critic-checked</i></div><PlanArchitectureDiagram level={level} flowTitle={selectedFlow.title} nodes={diagram.nodes} /><footer><span>Guidance bound to this diagram</span><div>{diagram.guidance.map((item) => <p key={item}><Check size={12} />{item}</p>)}</div></footer></section></div></main>
}

function PlanImplementationView({ onOpenArchitecture }: { onOpenArchitecture: (flowId: string, level: PlanArchitectureLevel) => void }) {
	return <main className="apn-main apn-implementation-view"><header className="apn-view-heading"><div><span>Implementation guidance</span><h1>Thirty-five runnable items, not a strategy backlog.</h1><p>Each package is bound to its L3 service contract, L4 implementation sequence, acceptance evidence, test gate, and rollback instruction.</p></div><div><strong>35 / 35</strong><small>Execute-ready</small></div></header><section className="apn-implementation-table" aria-label="Implementation packages"><header><span>Package</span><span>Source artifacts</span><span>Acceptance gate</span><span>State</span></header>{PLAN_FLOWS.map((flow) => <button key={flow.id} type="button" onClick={() => onOpenArchitecture(flow.id, "L4")}><span><i>{flow.number}</i><span><strong>{flow.title}</strong><small>{flow.owner} · {flow.items} items</small></span></span><span><code>{flow.key}-L3</code><code>{flow.key}-L4</code></span><span><strong>{flow.id === "replay" ? "100 concurrent retries" : flow.id === "adapter" ? "One event, one mission" : flow.id === "reconcile" ? "Drift repaired once" : flow.id === "evidence" ? "Manifest hashes match" : "No mission without approval"}</strong><small>Tests + evidence attached</small></span><span><CheckCircle size={13} weight="fill" />Runnable</span></button>)}</section></main>
}

function PlanDependencyView({ onOpenArchitecture }: { onOpenArchitecture: (flowId: string, level: PlanArchitectureLevel) => void }) {
	return <main className="apn-main apn-dependency-view"><header className="apn-view-heading"><div><span>Dependency model</span><h1>MAX sequenced the work around risk.</h1><p>Authority and replay protection land before provider effects. Release evidence is assembled only from verified workspace outputs.</p></div><div><strong>0</strong><small>circular dependencies</small></div></header><section className="apn-dependency-map">{PLAN_FLOWS.map((flow, index) => <div key={flow.id} className="apn-dependency-row"><span>{flow.number}</span><button type="button" onClick={() => onOpenArchitecture(flow.id, "L3")}><div><small>{flow.key}</small><strong>{flow.title}</strong><p>{flow.summary}</p></div><span><small>Depends on</small><strong>{flow.dependsOn}</strong></span><i><CheckCircle size={13} weight="fill" />Ready</i><CaretRight size={14} /></button>{index < PLAN_FLOWS.length - 1 ? <div className="apn-dependency-line" /> : null}</div>)}</section></main>
}

function PlanEvidenceView() {
	const sources = [["Verified Discovery", "124 claims", "Snapshot v12 · decision source"], ["ServiceNow", "19 contracts", "Schema + event samples"], ["SAP and QuickBooks", "31 observations", "Provider capability snapshots"], ["Policy library", "14 controls", "Authority + retention rules"], ["Project workspace", "8 decisions", "Goals, owners, and constraints"]] as const
	return <main className="apn-main apn-evidence-view"><header className="apn-view-heading"><div><span>Evidence and provenance</span><h1>Every recommendation can explain itself.</h1><p>MAX retains the source, fingerprint, confidence, and exact plan artifacts influenced by every material claim.</p></div><div><strong>100%</strong><small>material claims traced</small></div></header><section className="apn-evidence-summary"><div><MaxionSpiralMark /><span><strong>Evidence graph is healthy</strong><p>No stale sources, unresolved contradictions, or ungrounded implementation decisions.</p></span></div><span><CheckCircle size={14} weight="fill" />Verified</span></section><section className="apn-evidence-list"><header><span>Source</span><span>Coverage</span><span>Used by</span><span>State</span></header>{sources.map(([name, coverage, detail], index) => <button type="button" key={name}><span><Database size={15} /><strong>{name}</strong></span><span>{coverage}</span><span><strong>{index === 0 ? "All 5 flows" : index === 1 ? "Flow 02" : index === 2 ? "Flows 03–05" : index === 3 ? "Flows 01, 04, 05" : "All 5 flows"}</strong><small>{detail}</small></span><span><Check size={12} />Current</span></button>)}</section></main>
}

function PlanReadiness({ approved, onApprove, onOpenArchitecture }: { approved: boolean; onApprove: () => void; onOpenArchitecture: () => void }) {
	return <><section className="apn-readiness"><div><span>Completion floor</span><strong>{approved ? "7 / 7" : "6 / 7"}</strong></div><i style={{ "--apn-progress": approved ? "100%" : "86%" } as CSSProperties} /><p>{approved ? "The approved Plan can be imported directly into Execute." : "MAX completed the work. Owner approval is the only remaining gate."}</p></section><section className="apn-gates"><span>Autonomous quality gates</span>{[["Evidence grounded", "124 claims"], ["Architecture complete", "15 diagrams"], ["Implementation ready", "35 items"], ["Critics passed", "3 repaired"]].map(([label, value]) => <p key={label}><CheckCircle size={13} weight="fill" /><span><strong>{label}</strong><small>{value}</small></span></p>)}</section><section className="apn-only-ask"><span>Only action needed</span><strong>{approved ? "Plan approved" : "Approve the implementation boundary"}</strong><p>{approved ? "No blocking questions remain." : "This grants Execute access to the approved L3 and L4 artifacts. It does not grant production authority."}</p>{approved ? <button type="button" onClick={onOpenArchitecture}>Review architecture<ArrowRight size={13} /></button> : <button type="button" onClick={onApprove}><ShieldCheck size={14} />Approve implementation boundary</button>}</section><section className="apn-scope-note"><ShieldCheck size={14} /><p><strong>Authority stays bounded</strong><small>Build authority only · no provider writes · no deployment approval</small></p></section></>
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
							<article className="aex-message is-user"><span>MC</span><div><header><strong>You</strong><time>9:41 AM</time></header><p>{workspaceProfile.seed}</p></div></article>
							<article className="aex-message is-agent"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p>{workspaceProfile.agentIntro}</p></div></article>

							<section className={`aex-live-run is-${runState}`} aria-live="polite">
								<header><span>{runState === "running" ? <SpinnerGap className="mxp-spin" size={15} /> : <CheckCircle size={15} />}<strong>{runState === "verified" ? "Implementation complete" : runState === "running" ? "MAX is working autonomously" : "Ready to execute"}</strong></span><small>4 actions</small></header>
								<div className="aex-trace-row"><Check size={13} /><span><strong>{workspaceProfile.steps[0]}</strong><small>Boundaries resolved</small></span><time>0.8s</time></div>
								<div className="aex-trace-row"><span className={runState === "running" ? "aex-live-dot" : "aex-check-dot"}>{runState === "running" ? <SpinnerGap className="mxp-spin" size={11} /> : <Check size={11} />}</span><span><strong>{workspaceProfile.steps[1]}</strong><small>{runState === "running" ? `Editing ${workspaceProfile.files.length} files` : runState === "verified" ? "Verified" : "Queued"}</small></span><time>{runState === "verified" ? "4.1s" : "—"}</time></div>
								<div className="aex-tool-call"><TerminalWindow size={14} /><code>{workspaceProfile.command}</code><span>{runState === "verified" ? <><Check size={12} />{workspaceProfile.tests} passed</> : runState === "running" ? <><SpinnerGap className="mxp-spin" size={12} />Running focused tests…</> : "Ready"}</span></div>
							</section>

							{workspaceMessages.map((message, index) => <article key={`${message}-${index}`} className="aex-message is-user"><span>MC</span><div><header><strong>You</strong><time>Now</time></header><p>{message}</p></div></article>)}
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

								<article className="mxp-thread-message is-user"><span className="mxp-thread-avatar">MC</span><div><header><strong>You</strong><time>9:41 AM</time></header><p>{engagement.brief}</p></div></article>
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
								{steeringMessages.map((message, index) => <article key={`${message}-${index}`} className="mxp-thread-message is-user"><span className="mxp-thread-avatar">MC</span><div><header><strong>You</strong><time>Now</time></header><p>{message}</p></div></article>)}
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
						<motion.main key="audit" className="mxp-execute-main mxp-execute-detail-view" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><header><small>Immutable evidence chain</small><h1>Audit</h1><p>Every agent decision, tool call, approval, test result, and artifact change carries source and actor attribution.</p><button type="button" onClick={() => setAuditExported(true)}><FileText size={14} />{auditExported ? "Audit export ready" : "Export audit package"}</button></header><section className="mxp-audit-timeline" aria-live="polite">{[{ time: "Now", title: "Cumulative release gate verified", detail: "MAX Execute · requested by Maya Chen · 48 results" }, { time: "2 min", title: "Mission authority contract updated", detail: "Workspace 01 · 3 files · artifact fingerprint retained" }, { time: "5 min", title: "Repository boundary evaluated", detail: "Policy engine · allowed paths matched · no widening" }, { time: "7 min", title: "Plan evidence bound to engagement", detail: "ERP modernization delivery plan · snapshot v7" }].map((event) => <article key={event.title}><span><i /></span><time>{event.time}</time><div><h2>{event.title}</h2><p>{event.detail}</p></div><CheckCircle size={15} /></article>)}</section>{auditExported ? <div className="mxp-verified-result"><CheckCircle size={18} /><span><strong>Audit package is ready</strong><small>Events, source bindings, approvals, and test evidence included</small></span></div> : null}</motion.main>
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
	return <div className="mxp-consult mxp-module-with-rail"><ContextRail title="Consult MAX" kicker="Cross-platform intelligence" footer={<div className="mxp-rail-user"><span>MC</span><div><strong>Maya Chen</strong><small>Authorized tenant context</small></div></div>}><button type="button" className="mxp-rail-primary"><Plus size={14} />New conversation</button><div className="mxp-rail-label">Recent</div><button type="button" className="is-active"><ChatCircleText size={15} /><span><strong>What needs my attention?</strong><small>Just now</small></span></button><button type="button"><ChatCircleText size={15} /><span><strong>ERP decision history</strong><small>Yesterday</small></span></button><div className="mxp-rail-label">Scope</div><button type="button"><Database size={15} /><span>All MAXION context</span><i className="mxp-success-dot" /></button></ContextRail><div className="mxp-module-area"><ModuleHeader label="Consult MAX" title="Cross-platform conversation" detail="Answers preserve source, ownership, and authority" onCommand={onCommand} /><main className="mxp-consult-main"><header><MaxionMark size={34} /><span>Consult MAX</span><h1>Ask across the work, not around it.</h1><p>Consult MAX explains the current truth across modules. It can route you to work, but it cannot silently approve or execute it.</p></header><div className="mxp-consult-thread">{messages.map((message, index) => <article key={`${message.actor}-${index}`} className={message.actor === "You" ? "is-user" : "is-max"}>{message.actor === "MAX" ? <MaxionMark size={27} /> : <span className="mxp-user-avatar">MC</span>}<div><span>{message.actor}<time>Now</time></span><p>{message.text}</p>{message.actor === "MAX" && index > 0 ? <div className="mxp-answer-actions"><button type="button" onClick={() => onNavigate("agentix")}><Sparkle size={13} />Open Agentix approval</button><button type="button" onClick={() => onNavigate("discovery")}><MagnifyingGlass size={13} />Open Discovery boundary</button></div> : null}</div></article>)}</div></main><div className="mxp-consult-composer"><div><textarea aria-label="Message Consult MAX" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder="Ask what changed, what needs attention, or why a decision was made…" rows={1} /><div><span><button type="button" aria-label="Attach context"><Paperclip size={15} /></button><small><Database size={13} />All authorized MAXION context</small></span><button type="button" aria-label="Send to Consult MAX" disabled={!input.trim()} onClick={submit}><ArrowRight size={15} /></button></div></div></div></div></div>
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
