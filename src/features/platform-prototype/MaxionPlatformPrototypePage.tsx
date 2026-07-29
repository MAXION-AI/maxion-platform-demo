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
	Pulse,
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

import { PlanModule } from "./PlanAgenticModule"
import { MaxionSpiralMark, PortalSidebar, PRIMARY_NAVIGATION } from "./PortalChrome"
import {
	AccountUtilityModule,
	DashboardModule,
	ExecuteHubModule,
	IntegrationsModule,
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

function ExecuteModule({
	onCommand,
	planHandoff,
	planSnapshot,
	onVerified,
	onNavigate,
}: {
	onCommand: () => void
	planHandoff: boolean
	planSnapshot: string
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
		return <ExecuteHubModule onOpenRun={(intent) => { setEngagement(intent); setWorkspaceOpen(true) }} onNavigate={onNavigate} planHandoff={planHandoff} planSnapshot={planSnapshot} />
	}
	return <ExecuteWorkspaceModule key={`${engagement.source}-${engagement.title}-${String(engagement.autoStart)}`} onBack={() => setWorkspaceOpen(false)} onPlatform={() => onNavigate("dashboard")} onCommand={onCommand} engagement={engagement} onVerified={onVerified} />
}

function LegacyExecuteWorkspaceModule({ onBack, onCommand, planHandoff, onVerified }: { onBack: () => void; onCommand: () => void; planHandoff: boolean; onVerified: () => void }) {
	const [selectedTask, setSelectedTask] = useState("authority")
	const [runState, setRunState] = useState<ExecuteRunState>("idle")
	const task = EXECUTE_TASKS.find((item) => item.id === selectedTask)!
	useEffect(() => { if (runState !== "running") return; const timer = window.setTimeout(() => { setRunState("verified"); onVerified() }, 1100); return () => window.clearTimeout(timer) }, [onVerified, runState])
	return <div className="mxp-execute mxp-module-with-rail"><ContextRail title="Execute" kicker="Development" footer={<button type="button" className="mxp-rail-connection"><span className="mxp-live-dot" /><span><strong>Runtime ready</strong><small>Worktree isolated</small></span><CaretRight size={12} /></button>}><button type="button" onClick={onBack}><ArrowLeft size={14} />All engagements</button><button type="button" className="mxp-rail-primary"><Plus size={14} />New workspace</button><div className="mxp-rail-label">ERP modernization</div>{EXECUTE_TASKS.map((item) => <button type="button" key={item.id} className={selectedTask === item.id ? "is-active" : ""} onClick={() => { setSelectedTask(item.id); setRunState("idle") }}><span className="mxp-mini-glyph"><Code size={13} /></span><span><strong>{item.title}</strong><small>{item.status}</small></span></button>)}<div className="mxp-rail-label">Workspace</div><button type="button"><FileText size={15} /><span>Files</span><small>21</small></button><button type="button"><TerminalWindow size={15} /><span>Terminal</span></button><button type="button"><CheckCircle size={15} /><span>Tests</span><small>48</small></button></ContextRail><div className="mxp-module-area"><ModuleHeader label="Execute" title={task.title} detail="max-ai-platform · isolated worktree" onCommand={onCommand} actions={<Status tone={runState === "verified" ? "success" : runState === "running" ? "live" : "neutral"} live={runState === "running"}>{runState === "verified" ? "Verified" : runState === "running" ? "Running" : "Ready"}</Status>} /><main className="mxp-execute-main">{planHandoff ? <div className="mxp-handoff-banner"><LinkSimple size={16} /><span><strong>Plan handoff attached</strong><small>Mission authority foundation · 5 flows · 17 packages · evidence snapshot v12</small></span><button type="button">Inspect</button></div> : null}<section className="mxp-execute-head"><div><span>Current task</span><h1>{task.title}</h1><p>{task.detail}. The agent can edit, test, and iterate inside this workspace without widening repository or deployment authority.</p></div><div><button type="button"><Pause size={14} />Interrupt</button><button type="button" className="mxp-primary" disabled={runState === "running"} onClick={() => setRunState("running")}>{runState === "verified" ? <Check size={14} /> : <Play size={14} weight="fill" />}{runState === "verified" ? "Run verified" : runState === "running" ? "Running…" : "Start agent run"}</button></div></section><div className="mxp-execute-grid"><section className="mxp-agent-session"><div className="mxp-session-date"><span>Agent activity</span></div><article><MaxionMark size={27} /><div><span>MAX Execute<time>Now</time></span><p>I mapped the approved Plan outcome to the existing service boundaries. I’ll implement the typed authority contract, preserve the current API shape, then run the focused and cumulative gates.</p></div></article><details open><summary><span>{runState === "running" ? <SpinnerGap className="mxp-spin" size={15} /> : <CheckCircle size={15} />}<strong>{runState === "verified" ? "Implementation verified" : runState === "running" ? "Implementing and testing" : "Proposed work"}</strong></span><span>4 steps<CaretRight size={12} /></span></summary><div>{["Read plan evidence and repository boundaries", "Implement typed mission policy contract", "Add hostile authority and replay tests", "Run cumulative release gate"].map((item, index) => <div key={item}><span className={runState === "verified" || index === 0 ? "is-complete" : runState === "running" && index === 1 ? "is-current" : ""}>{runState === "verified" || index === 0 ? <Check size={10} /> : runState === "running" && index === 1 ? <SpinnerGap className="mxp-spin" size={10} /> : index + 1}</span><div><strong>{item}</strong><small>{runState === "verified" ? "Verified" : index === 0 ? "Complete" : index === 1 && runState === "running" ? "Editing 3 files" : "Waiting"}</small></div></div>)}</div></details>{runState === "verified" ? <div className="mxp-verified-result"><CheckCircle size={18} weight="fill" /><span><strong>Mission authority API passed its release gate</strong><small>48 tests · TypeScript clean · policy contract verified</small></span></div> : null}</section><aside className="mxp-code-panel"><header><span>missionPolicy.ts</span><button type="button"><DotsThree size={16} /></button></header><pre><code><span>export type MissionAuthority = {'{'}</span>{"\n"}<span className="is-added">+ tenantId: TenantId</span>{"\n"}<span className="is-added">+ missionVersion: number</span>{"\n"}<span className="is-added">+ permittedActions: Action[]</span>{"\n"}<span className="is-added">+ approvalBoundary: Boundary</span>{"\n"}<span className="is-added">+ expiresAt: ISODate</span>{"\n"}<span>{'}'}</span>{"\n\n"}<span>export async function execute(</span>{"\n"}<span>  command: MissionCommand,</span>{"\n"}<span className="is-added">+ authority: MissionAuthority,</span>{"\n"}<span>) {'{'}</span>{"\n"}<span className="is-added">+ await policy.assert(command, authority)</span>{"\n"}<span className="is-added">+ return effects.dispatch(command)</span>{"\n"}<span>{'}'}</span></code></pre><footer><TerminalWindow size={14} /><span>{runState === "verified" ? "48 passed in 6.8s" : runState === "running" ? "Running focused tests…" : "Terminal ready"}</span></footer></aside></div></main></div></div>
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
	return <div className="mxp-consult mxp-module-with-rail"><ContextRail title="Consult MAX" kicker="Cross-platform intelligence" footer={<div className="mxp-rail-user"><span>RA</span><div><strong>Root Admin</strong><small>Authorized tenant context</small></div></div>}><button type="button" className="mxp-rail-primary"><Plus size={14} />New conversation</button><div className="mxp-rail-label">Recent</div><button type="button" className="is-active"><ChatCircleText size={15} /><span><strong>What needs my attention?</strong><small>Just now</small></span></button><button type="button"><ChatCircleText size={15} /><span><strong>ERP decision history</strong><small>Yesterday</small></span></button><div className="mxp-rail-label">Scope</div><button type="button"><Database size={15} /><span>All MAXION context</span><i className="mxp-success-dot" /></button></ContextRail><div className="mxp-module-area"><ModuleHeader label="Consult MAX" title="Cross-platform conversation" detail="Answers preserve source, ownership, and authority" onCommand={onCommand} /><main className="mxp-consult-main"><header><MaxionMark size={34} /><span>Consult MAX</span><h1>Ask across the work, not around it.</h1><p>Consult MAX explains the current truth across modules. It can route you to work, but it cannot silently approve or execute it.</p></header><div className="mxp-consult-thread">{messages.map((message, index) => <article key={`${message.actor}-${index}`} className={message.actor === "You" ? "is-user" : "is-max"}>{message.actor === "MAX" ? <MaxionMark size={27} /> : <span className="mxp-user-avatar">RA</span>}<div><span>{message.actor}<time>Now</time></span><p>{message.text}</p>{message.actor === "MAX" && index > 0 ? <div className="mxp-answer-actions"><button type="button" onClick={() => onNavigate("agentix")}><Pulse size={13} />Open Agentix approval</button><button type="button" onClick={() => onNavigate("discovery")}><MagnifyingGlass size={13} />Open Discovery boundary</button></div> : null}</div></article>)}</div></main><div className="mxp-consult-composer"><div><textarea aria-label="Message Consult MAX" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder="Ask what changed, what needs attention, or why a decision was made…" rows={1} /><div><span><button type="button" aria-label="Attach context"><Paperclip size={15} /></button><small><Database size={13} />All authorized MAXION context</small></span><button type="button" aria-label="Send to Consult MAX" disabled={!input.trim()} onClick={submit}><ArrowRight size={15} /></button></div></div></div></div></div>
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
	const [planSnapshot, setPlanSnapshot] = useState("v12")
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
				<div className="mxp-stage-view" hidden={activeModule !== "plan"}><PlanModule projects={projects} onNavigate={navigate} onCommand={() => setCommandOpen(true)} onSendToExecute={(snapshot) => { setPlanSent(true); setPlanSnapshot(snapshot); navigate("execute") }} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "execute"}><ExecuteModule onNavigate={navigate} onCommand={() => setCommandOpen(true)} planHandoff={planSent} planSnapshot={planSnapshot} onVerified={() => setExecuteVerified(true)} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "agentix"}><AgentixPrototypePage embedded /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "consult"}><ConsultModule onCommand={() => setCommandOpen(true)} onNavigate={navigate} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "integrations"}><IntegrationsModule /></div>
				{(["settings", "approvals", "usage", "help"] as const).map((module) => <div key={module} className="mxp-stage-view" hidden={activeModule !== module}><AccountUtilityModule module={module} onNavigate={navigate} /></div>)}
			</div>
			<AnimatePresence>{commandOpen ? <CommandMenu open={commandOpen} active={activeModule} onClose={() => setCommandOpen(false)} onNavigate={navigate} /> : null}</AnimatePresence>
		</div>
	)
}
