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
	files: ReadonlyArray<{ name: string; path: string; added: number; diff: readonly string[] }>
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

const EXECUTE_VIEW_ORDER = ["topology", "changes", "tests", "terminal", "deploys", "audit"] as const

// Ported from PlanAgenticModule — the family's motion discipline: every timed behavior
// keeps an instant path when the viewer prefers reduced motion (jsdom forces this in vitest).
function prefersReducedMotion() {
	return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function useStreamedText(text: string, active: boolean) {
	const [count, setCount] = useState(active && !prefersReducedMotion() ? 0 : Number.MAX_SAFE_INTEGER)
	useEffect(() => {
		if (!active || prefersReducedMotion()) { setCount(Number.MAX_SAFE_INTEGER); return }
		setCount(0)
		const total = text.split(" ").length
		const timer = window.setInterval(() => {
			setCount((current) => {
				if (current >= total) { window.clearInterval(timer); return current }
				return current + 1
			})
		}, 26)
		return () => window.clearInterval(timer)
	}, [text, active])
	if (!active) return text
	const words = text.split(" ")
	return count >= words.length ? text : words.slice(0, count).join(" ")
}

function useCountUp(target: number, started: boolean, animate: boolean, duration = 1400) {
	const [value, setValue] = useState(started && !animate ? target : 0)
	useEffect(() => {
		if (!started) return
		if (!animate || prefersReducedMotion()) { setValue(target); return }
		let frame = 0
		const startedAt = performance.now()
		const tick = (now: number) => {
			const progress = Math.min(1, (now - startedAt) / duration)
			setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))))
			if (progress < 1) frame = requestAnimationFrame(tick)
		}
		frame = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(frame)
	}, [target, started, animate, duration])
	return started ? value : 0
}

function ExecuteStreamedText({ text }: { text: string }) {
	const streamed = useStreamedText(text, true)
	return <>{streamed}</>
}

// Elapsed labels shown once a step completes; they mirror the staged-run durations below.
const EXECUTE_STEP_TIMES = ["0.7s", "1.4s", "1.5s", "0.8s"] as const

// Engagement progress lives on ExecuteModule so the hub reflects real state and
// re-entering a verified engagement restores it instead of replaying the run.
type ExecuteEngagementProgress = {
	runState: ExecuteRunState
	steering: Record<string, string[]>
	deployRequested: boolean
	deployRequestedAt: string | null
	auditExported: boolean
}

type ExecuteWorkspaceCommand =
	| { type: "workspace"; taskId: ExecuteWorkspaceId }
	| { type: "view"; view: (typeof EXECUTE_VIEW_ORDER)[number] }
	| { type: "run" }
	| { type: "interrupt" }
	| { type: "deploy" }
	| { type: "export-audit" }
	| { type: "focus-steer" }
type ExecutePaletteAction = Exclude<ExecuteWorkspaceCommand, { type: "focus-steer" }> | { type: "module"; module: MaxionModuleId } | { type: "new-task" } | { type: "engagements" }
type ExecutePaletteItem = { id: string; group: string; label: string; hint: string; keywords: string; action: ExecutePaletteAction }

const EXECUTE_VIEW_META: Record<(typeof EXECUTE_VIEW_ORDER)[number], { label: string; hint: string }> = {
	topology: { label: "Topology", hint: "Workspaces and the cumulative gate" },
	changes: { label: "Changes", hint: "Files and diffs in this workspace" },
	tests: { label: "Tests", hint: "Suites and release gates" },
	terminal: { label: "Terminal", hint: "Worktree command output" },
	deploys: { label: "Deploys", hint: "Governed release" },
	audit: { label: "Audit", hint: "Immutable evidence chain" },
}

const EXECUTE_PALETTE_MODULES: ReadonlyArray<{ id: MaxionModuleId; label: string; hint: string }> = [
	{ id: "dashboard", label: "Dashboard", hint: "Portal overview" },
	{ id: "projects", label: "Projects", hint: "Delivery portfolio" },
	{ id: "discovery", label: "Discover", hint: "Autonomous discovery" },
	{ id: "plan", label: "Plan", hint: "Implementation plans" },
	{ id: "agentix", label: "Agentix", hint: "Operational agents" },
	{ id: "consult", label: "Consult MAX", hint: "Ask across MAXION" },
	{ id: "integrations", label: "Integrations", hint: "Connected systems" },
]

function buildExecutePaletteItems(): ExecutePaletteItem[] {
	const items: ExecutePaletteItem[] = []
	EXECUTE_TASKS.forEach((task, index) => items.push({ id: `workspace-${task.id}`, group: "Workspaces", label: task.title, hint: `Open Workspace ${String(index + 1).padStart(2, "0")}`, keywords: `${task.detail} workspace agent session`, action: { type: "workspace", taskId: task.id } }))
	EXECUTE_VIEW_ORDER.forEach((view, index) => items.push({ id: `view-${view}`, group: "Views", label: EXECUTE_VIEW_META[view].label, hint: `${EXECUTE_VIEW_META[view].hint} · ${index + 1}`, keywords: `inspector panel view ${view}`, action: { type: "view", view } }))
	items.push({ id: "run-start", group: "Run", label: "Start agent run", hint: "MAX implements, tests, and repairs", keywords: "start run launch verify agent", action: { type: "run" } })
	items.push({ id: "run-interrupt", group: "Run", label: "Interrupt run", hint: "Pause the working agent", keywords: "interrupt pause stop halt", action: { type: "interrupt" } })
	items.push({ id: "deploy-request", group: "Actions", label: "Request deploy approval", hint: "Route the release to its owner", keywords: "deploy release approval production request", action: { type: "deploy" } })
	items.push({ id: "export-audit", group: "Actions", label: "Export audit package", hint: "Evidence with source attribution", keywords: "audit export evidence attribution package", action: { type: "export-audit" } })
	items.push({ id: "new-task", group: "Actions", label: "New task", hint: "Describe a new outcome · N", keywords: "new task engagement compose prompt", action: { type: "new-task" } })
	items.push({ id: "all-engagements", group: "Actions", label: "All engagements", hint: "Back to the Execute hub", keywords: "engagements hub home overview back", action: { type: "engagements" } })
	for (const module of EXECUTE_PALETTE_MODULES) items.push({ id: `module-${module.id}`, group: "Go to", label: module.label, hint: module.hint, keywords: `module navigate go ${module.label}`, action: { type: "module", module: module.id } })
	return items
}

function ExecuteCommandPalette({ onRun, onClose }: { onRun: (action: ExecutePaletteAction) => void; onClose: () => void }) {
	const [query, setQuery] = useState("")
	const [active, setActive] = useState(0)
	const items = buildExecutePaletteItems()
	const q = query.trim().toLowerCase()
	const filtered = q ? items.filter((item) => `${item.label} ${item.hint} ${item.keywords}`.toLowerCase().includes(q)).slice(0, 9) : items.slice(0, 9)
	const activeIndex = Math.min(active, Math.max(0, filtered.length - 1))
	return (
		<div className="aex-app aex-palette-layer">
			<button type="button" className="aex-palette-scrim" aria-label="Close command menu" onClick={onClose} />
			<div role="dialog" aria-label="Execute command menu" className="aex-palette">
				<input
					autoFocus
					value={query}
					placeholder="Jump to a workspace, view, run action, or module…"
					aria-label="Search Execute commands"
					onChange={(event) => { setQuery(event.target.value); setActive(0) }}
					onKeyDown={(event) => {
						if (event.key === "ArrowDown") { event.preventDefault(); setActive((current) => Math.min(current + 1, filtered.length - 1)) }
						if (event.key === "ArrowUp") { event.preventDefault(); setActive((current) => Math.max(current - 1, 0)) }
						if (event.key === "Enter" && filtered[activeIndex]) { event.preventDefault(); onRun(filtered[activeIndex].action); onClose() }
						if (event.key === "Escape") { event.preventDefault(); onClose() }
					}}
				/>
				<div className="aex-palette-list">
					{filtered.map((item, index) => (
						<button type="button" key={item.id} className={index === activeIndex ? "is-active" : ""} onMouseEnter={() => setActive(index)} onClick={() => { onRun(item.action); onClose() }}>
							<i>{item.group}</i><span>{item.label}</span><small>{item.hint}</small>
						</button>
					))}
					{filtered.length === 0 ? <p className="aex-palette-empty">Nothing in Execute matches “{query}”.</p> : null}
				</div>
				<footer><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> run</span><span><kbd>esc</kbd> close</span><span><kbd>1–6</kbd> views</span><span><kbd>/</kbd> composer</span></footer>
			</div>
		</div>
	)
}

function ExecuteModule({
	active,
	planHandoff,
	planSnapshot,
	onVerified,
	onNavigate,
}: {
	active: boolean
	planHandoff: boolean
	planSnapshot: string
	onVerified: () => void
	onNavigate: (module: MaxionModuleId) => void
}) {
	const rootRef = useRef<HTMLDivElement>(null)
	const [workspaceOpen, setWorkspaceOpen] = useState(false)
	const [paletteOpen, setPaletteOpen] = useState(false)
	const [hubFocusSignal, setHubFocusSignal] = useState(0)
	const [engagement, setEngagement] = useState<ExecuteLaunchIntent>({
		source: "plan",
		title: "ERP modernization delivery",
		brief: "Implement the approved ERP modernization outcomes with tenant-safe authority boundaries.",
		autoStart: false,
	})
	const [progress, setProgress] = useState<Record<string, ExecuteEngagementProgress>>({})
	// One-shot hub intent, consumed on arrival — the hub remounts whenever a workspace
	// closes, so a persistent signal would keep re-firing on every re-entry.
	const [hubIntent, setHubIntent] = useState<"handoff" | "approvals" | null>(null)
	const previousHandoffRef = useRef(planHandoff)
	const workspaceCommandRef = useRef<((command: ExecuteWorkspaceCommand) => void) | null>(null)
	const pendingCommandRef = useRef<ExecuteWorkspaceCommand | null>(null)
	const paletteReturnRef = useRef<HTMLElement | null>(null)

	// A fresh Plan handoff is the marquee cross-module moment — land on the hub with
	// the handoff acknowledged instead of inside a stale previous workspace.
	useEffect(() => {
		if (planHandoff && !previousHandoffRef.current) {
			setWorkspaceOpen(false)
			setHubIntent("handoff")
		}
		previousHandoffRef.current = planHandoff
	}, [planHandoff])

	const registerWorkspaceCommands = (handler: ((command: ExecuteWorkspaceCommand) => void) | null) => {
		workspaceCommandRef.current = handler
		if (handler && pendingCommandRef.current) { handler(pendingCommandRef.current); pendingCommandRef.current = null }
	}
	const dispatchWorkspace = (command: ExecuteWorkspaceCommand) => {
		if (workspaceCommandRef.current) { workspaceCommandRef.current(command); return }
		pendingCommandRef.current = command
		setWorkspaceOpen(true)
	}
	const openPalette = () => {
		paletteReturnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
		setPaletteOpen(true)
	}
	const closePalette = () => {
		setPaletteOpen(false)
		paletteReturnRef.current?.focus?.()
	}
	const newTask = () => {
		setWorkspaceOpen(false)
		setHubFocusSignal((signal) => signal + 1)
	}
	const focusComposer = () => {
		if (workspaceOpen) dispatchWorkspace({ type: "focus-steer" })
		else setHubFocusSignal((signal) => signal + 1)
	}
	const runPaletteAction = (action: ExecutePaletteAction) => {
		if (action.type === "module") { onNavigate(action.module); return }
		if (action.type === "new-task") { newTask(); return }
		if (action.type === "engagements") { setWorkspaceOpen(false); return }
		dispatchWorkspace(action)
	}

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// Every module stage stays mounted behind `hidden` — only the visible stage may own the keyboard.
			if (!rootRef.current?.offsetParent) return
			const target = event.target as HTMLElement | null
			const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				// Capture phase + stopPropagation so the shell palette never opens on top.
				event.preventDefault()
				event.stopPropagation()
				if (paletteOpen) closePalette()
				else openPalette()
				return
			}
			if (event.key === "Escape") { if (paletteOpen) closePalette(); return }
			if (typing) return
			if (event.key === "/") { event.preventDefault(); focusComposer(); return }
			if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); newTask(); return }
			if (workspaceOpen && ["1", "2", "3", "4", "5", "6"].includes(event.key)) dispatchWorkspace({ type: "view", view: EXECUTE_VIEW_ORDER[Number(event.key) - 1] })
		}
		window.addEventListener("keydown", onKeyDown, { capture: true })
		return () => window.removeEventListener("keydown", onKeyDown, { capture: true })
		// Handlers close over workspaceOpen/paletteOpen; everything else they touch is a stable ref or setter.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [workspaceOpen, paletteOpen])

	const openApprovals = () => {
		setWorkspaceOpen(false)
		setHubIntent("approvals")
	}

	return (
		<div className="aex-module" ref={rootRef}>
			{workspaceOpen
				? <ExecuteWorkspaceModule key={`${engagement.source}-${engagement.title}-${String(engagement.autoStart)}`} onBack={() => setWorkspaceOpen(false)} onPlatform={() => onNavigate("dashboard")} onCommand={openPalette} onOpenApprovals={openApprovals} engagement={engagement} planSnapshot={planSnapshot} progress={progress[engagement.title]} onProgress={(next) => setProgress((items) => ({ ...items, [engagement.title]: next }))} onVerified={onVerified} registerCommands={registerWorkspaceCommands} />
				: <ExecuteHubModule onOpenRun={(intent) => { setEngagement(intent); setWorkspaceOpen(true) }} onNavigate={onNavigate} planHandoff={planHandoff} planSnapshot={planSnapshot} active={active} focusSignal={hubFocusSignal} intent={hubIntent} onIntentConsumed={() => setHubIntent(null)} engagementState={progress["ERP modernization delivery"]?.runState ?? "idle"} />}
			{paletteOpen ? <ExecuteCommandPalette onRun={runPaletteAction} onClose={closePalette} /> : null}
		</div>
	)
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
	completedWorkspaces = 0,
	gateVerifying = false,
	onSelectTask,
	onOpenTests,
}: {
	runState: ExecuteRunState
	selectedTask: string
	steeringCounts?: Record<string, number>
	completedWorkspaces?: number
	gateVerifying?: boolean
	onSelectTask: (taskId: string) => void
	onOpenTests: () => void
}) {
	const workspaceStatus = (taskId: string, index: number) => {
		if (runState === "verified") return "Verified"
		if (steeringCounts?.[taskId]) return "Directed"
		if (runState === "running") return index < completedWorkspaces ? "Verified" : index === completedWorkspaces ? "Working" : "Queued"
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
				<span><small>Cumulative gate</small><strong>Verify, audit, and prepare release</strong><i>{runState === "verified" ? "Passed" : gateVerifying ? "Verifying" : "Waiting"}</i></span>
			</button>
		</div>
	)
}

function ExecuteWorkspaceModule({
	onBack,
	onPlatform,
	onCommand,
	onOpenApprovals,
	engagement,
	planSnapshot,
	progress,
	onProgress,
	onVerified,
	registerCommands,
}: {
	onBack: () => void
	onPlatform: () => void
	onCommand: () => void
	onOpenApprovals: () => void
	engagement: ExecuteLaunchIntent
	planSnapshot: string
	progress?: ExecuteEngagementProgress
	onProgress: (next: ExecuteEngagementProgress) => void
	onVerified: () => void
	registerCommands: (handler: ((command: ExecuteWorkspaceCommand) => void) | null) => void
}) {
	// A verified engagement re-enters as verified — evidence restored, run not replayed.
	const restoredVerified = progress?.runState === "verified"
	const [view, setView] = useState<ExecuteWorkspaceView>("topology")
	const [selectedTask, setSelectedTask] = useState<ExecuteWorkspaceId>("authority")
	const [runState, setRunState] = useState<ExecuteRunState>(restoredVerified ? "verified" : engagement.autoStart ? "running" : "idle")
	const [runStage, setRunStage] = useState(0)
	const [revealedFiles, setRevealedFiles] = useState(0)
	const [terminalLines, setTerminalLines] = useState(0)
	const [completedWorkspaces, setCompletedWorkspaces] = useState(0)
	const [deployRequested, setDeployRequested] = useState(progress?.deployRequested ?? false)
	const [deployRequestedAt, setDeployRequestedAt] = useState<string | null>(progress?.deployRequestedAt ?? null)
	const [auditExported, setAuditExported] = useState(progress?.auditExported ?? false)
	const [handoffOpen, setHandoffOpen] = useState(false)
	const [steerDrafts, setSteerDrafts] = useState<Record<string, string>>({})
	const [selectedFiles, setSelectedFiles] = useState<Record<string, number>>({})
	const [steeringMessages, setSteeringMessages] = useState<Record<string, string[]>>(progress?.steering ?? {})
	const [steerPending, setSteerPending] = useState<Record<string, boolean>>({})
	const threadScrollRef = useRef<HTMLDivElement>(null)
	const steerRef = useRef<HTMLTextAreaElement>(null)
	const steerTimersRef = useRef<number[]>([])
	const task = EXECUTE_TASKS.find((item) => item.id === selectedTask) ?? EXECUTE_TASKS[0]
	const workspaceIndex = EXECUTE_TASKS.findIndex((item) => item.id === task.id)
	const workspaceNumber = String(workspaceIndex + 1).padStart(2, "0")
	const workspaceProfile = EXECUTE_WORKSPACE_PROFILES[task.id]
	const steer = steerDrafts[selectedTask] ?? ""
	const workspaceMessages = steeringMessages[selectedTask] ?? []
	const steeringCounts = Object.fromEntries(EXECUTE_TASKS.map((item) => [item.id, steeringMessages[item.id]?.length ?? 0]))
	const liveTestCount = useCountUp(workspaceProfile.tests, runState === "verified" || (runState === "running" && runStage >= 2), !restoredVerified, 1300)

	// Report engagement progress up so the hub and re-entry reflect the real state.
	// The mount-time snapshot is skipped: it holds nothing new, and the extra parent
	// re-render would land inside the unit tests' tight reduced-motion timing window.
	const onProgressRef = useRef(onProgress)
	onProgressRef.current = onProgress
	const progressSyncedRef = useRef(false)
	useEffect(() => {
		if (!progressSyncedRef.current) { progressSyncedRef.current = true; return }
		onProgressRef.current({ runState, steering: steeringMessages, deployRequested, deployRequestedAt, auditExported })
	}, [runState, steeringMessages, deployRequested, deployRequestedAt, auditExported])

	const requestDeploy = () => {
		if (runState !== "verified" || deployRequested) return
		setDeployRequested(true)
		setDeployRequestedAt(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()))
	}

	const scrollThreadToEnd = () => {
		window.requestAnimationFrame?.(() => {
			const node = threadScrollRef.current
			if (!node) return
			node.scrollTo?.({ top: node.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" })
		})
	}

	// Staged run: boundaries resolve → files land one by one → focused tests with the
	// terminal appending → cumulative gate last. Under reduced motion the run collapses
	// to the tests snapshot and verifies almost immediately (the vitest jsdom path).
	useEffect(() => {
		if (runState !== "running") return
		const timers: number[] = []
		if (prefersReducedMotion()) {
			setRunStage(2)
			setRevealedFiles(workspaceProfile.files.length)
			setTerminalLines(3)
			setCompletedWorkspaces(1)
			timers.push(window.setTimeout(() => {
				setCompletedWorkspaces(EXECUTE_TASKS.length)
				setRunState("verified")
				onVerified()
			}, 1200))
		} else {
			setRunStage(0); setRevealedFiles(0); setTerminalLines(0); setCompletedWorkspaces(0)
			timers.push(window.setTimeout(() => setRunStage(1), 700))
			workspaceProfile.files.forEach((_, index) => timers.push(window.setTimeout(() => setRevealedFiles(index + 1), 900 + index * 240)))
			timers.push(window.setTimeout(() => setRunStage(2), 2100))
			;[0, 1, 2].forEach((index) => timers.push(window.setTimeout(() => setTerminalLines(index + 1), 2300 + index * 300)))
			;[1, 2, 3, 4].forEach((count) => timers.push(window.setTimeout(() => setCompletedWorkspaces(count), 600 + count * 700)))
			timers.push(window.setTimeout(() => setRunStage(3), 3600))
			timers.push(window.setTimeout(() => {
				setCompletedWorkspaces(EXECUTE_TASKS.length)
				setRunState("verified")
				onVerified()
			}, 4400))
		}
		return () => timers.forEach((timer) => window.clearTimeout(timer))
		// The parent callback is recreated by the shell, while a run must keep one staged timer chain.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [runState])

	useEffect(() => {
		if (runState === "verified") scrollThreadToEnd()
		// The scroll helper reads stable refs only.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [runState])

	useEffect(() => () => steerTimersRef.current.forEach((timer) => window.clearTimeout(timer)), [])

	const sendSteer = () => {
		const message = steer.trim()
		if (!message) return
		const taskId = selectedTask
		setSteeringMessages((items) => ({ ...items, [taskId]: [...(items[taskId] ?? []), message] }))
		setSteerDrafts((items) => ({ ...items, [taskId]: "" }))
		// A verified run stays verified: the direction folds into cumulative verification
		// instead of replaying the engagement.
		if (runState === "idle") setRunState("running")
		scrollThreadToEnd()
		if (prefersReducedMotion()) return
		setSteerPending((items) => ({ ...items, [taskId]: true }))
		steerTimersRef.current.push(window.setTimeout(() => {
			setSteerPending((items) => ({ ...items, [taskId]: false }))
			scrollThreadToEnd()
		}, 750))
	}
	const openWorkspace = (taskId: string) => {
		const nextTask = EXECUTE_TASKS.find((item) => item.id === taskId)
		if (!nextTask) return
		setSelectedTask(nextTask.id)
		window.requestAnimationFrame?.(() => {
			threadScrollRef.current?.scrollTo?.({ top: 0, behavior: "auto" })
		})
	}

	// Re-registered every render so the command handler always closes over current state.
	useEffect(() => {
		registerCommands((command) => {
			if (command.type === "workspace") { openWorkspace(command.taskId); return }
			if (command.type === "view") { setView(command.view); return }
			if (command.type === "run") { setRunState("running"); return }
			if (command.type === "interrupt") { setRunState((state) => state === "running" ? "idle" : state); return }
			if (command.type === "deploy") { setView("deploys"); requestDeploy(); return }
			if (command.type === "export-audit") { setView("audit"); setAuditExported(true); return }
			steerRef.current?.focus()
		})
		return () => registerCommands(null)
	})
	const workspaceStatus = runState === "verified" ? "Verified" : runState === "running" ? "Working" : "Ready"
	const visibleFiles = runState === "running" ? workspaceProfile.files.slice(0, Math.min(revealedFiles, workspaceProfile.files.length)) : workspaceProfile.files
	const selectedFileIndex = Math.min(selectedFiles[selectedTask] ?? 0, Math.max(0, visibleFiles.length - 1))
	const selectedFile = visibleFiles[selectedFileIndex]
	const stepState = (index: number): "complete" | "current" | "queued" => runState === "verified" ? "complete" : runState !== "running" ? "queued" : index < runStage ? "complete" : index === runStage ? "current" : "queued"
	const stepSub = (index: number, state: "complete" | "current" | "queued") => {
		if (state === "queued") return "Queued"
		if (index === 0) return state === "complete" ? "Boundaries resolved" : "Resolving boundaries…"
		if (index === 1) return state === "complete" ? `${workspaceProfile.files.length} files changed` : visibleFiles.length < workspaceProfile.files.length ? `Editing ${workspaceProfile.files[visibleFiles.length].name}` : `${workspaceProfile.files.length} files staged`
		if (index === 2) return state === "complete" ? `${workspaceProfile.tests} passed` : `${liveTestCount} of ${workspaceProfile.tests} passing`
		return state === "complete" ? "Gate passed" : "Cumulative gate running…"
	}
	const renderStep = (index: number) => {
		const state = stepState(index)
		return (
			<div className="aex-trace-row" key={workspaceProfile.steps[index]}>
				{state === "complete" ? <span className="aex-check-dot"><Check size={11} /></span> : state === "current" ? <span className="aex-live-dot"><SpinnerGap className="mxp-spin" size={11} /></span> : <span className="aex-step-dot">{index + 1}</span>}
				<span><strong>{workspaceProfile.steps[index]}</strong><small>{stepSub(index, state)}</small></span>
				<time>{state === "complete" ? EXECUTE_STEP_TIMES[index] : "—"}</time>
			</div>
		)
	}
	const panelItems: Array<{ id: Exclude<ExecuteWorkspaceView, "activity">; label: string; count?: string; icon: typeof CirclesThree }> = [
		{ id: "topology", label: "Topology", count: "5", icon: CirclesThree },
		{ id: "changes", label: "Changes", count: String(visibleFiles.length), icon: FileText },
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
					<button type="button" className="aex-new-task" onClick={onBack}><Plus size={15} />New task<kbd>N</kbd></button>
				</header>
				<nav aria-label="Engagement workspaces">
					<span>Current engagement</span>
					<button type="button" className="is-current" onClick={() => setView("topology")}><i className={runState === "running" ? "is-running" : runState === "verified" ? "is-verified" : "is-ready"} /><span><strong>{engagement.title}</strong><small>{workspaceStatus} · 5 workspaces</small></span></button>
					<span>Workspaces</span>
					{EXECUTE_TASKS.map((item, index) => <button type="button" key={item.id} aria-label={`Open Workspace ${String(index + 1).padStart(2, "0")}: ${item.title}`} className={selectedTask === item.id ? "is-selected" : ""} onClick={() => openWorkspace(item.id)}><Code size={14} /><span><strong>{item.title}</strong><small>Workspace {String(index + 1).padStart(2, "0")}{steeringCounts[item.id] ? ` · ${steeringCounts[item.id]} direction${steeringCounts[item.id] === 1 ? "" : "s"}` : ""}</small></span>{selectedTask === item.id ? <CaretRight size={13} /> : null}</button>)}
				</nav>
				<footer><span><i />max-ai-platform</span><small>{workspaceProfile.branch}</small></footer>
			</aside>

			<section className="aex-workspace">
				<header className="aex-workspace-bar">
					<div><button type="button" aria-label="All engagements" onClick={onBack}><ArrowLeft size={16} /></button><span><strong>{engagement.title}</strong><small>max-ai-platform · isolated worktree</small></span></div>
					<div><button type="button" className="aex-command" aria-label="Search Execute" onClick={onCommand}><MagnifyingGlass size={15} /><span>Search</span><kbd>⌘K</kbd></button><span className={`aex-run-status is-${runState}`}><i />{workspaceStatus}</span><button type="button" aria-label="Execute notifications" onClick={onOpenApprovals}><Bell size={16} /></button></div>
				</header>

				<div className="aex-workspace-body">
					<main className="aex-thread">
						<div className="aex-thread-scroll" ref={threadScrollRef}>
							<header className="aex-thread-title">
								<div><span>{workspaceStatus} · Workspace {workspaceNumber}</span><h1>{task.title}</h1><p>{task.detail}. MAX owns implementation and repair inside this workspace’s approved boundary.</p></div>
								<div><button type="button" disabled={runState !== "running"} onClick={() => setRunState("idle")}><Pause size={14} />Interrupt</button><ExecuteRunButton runState={runState} onRun={() => setRunState("running")} /></div>
							</header>

							{engagement.source === "plan" ? <button type="button" className="aex-thread-context" aria-expanded={handoffOpen} onClick={() => setHandoffOpen((open) => !open)}><FlowArrow size={14} /><span><strong>Imported from Plan</strong><small>{engagement.brief}</small></span><CaretRight size={13} className={`aex-context-caret${handoffOpen ? " is-open" : ""}`} /></button> : null}
							{engagement.source === "plan" && handoffOpen ? <div className="aex-handoff-detail"><dl><div><dt>Plan of record</dt><dd>ERP modernization delivery plan</dd></div><div><dt>Scope</dt><dd>5 flows · 17 evidence-linked build packages</dd></div><div><dt>Evidence snapshot</dt><dd>{planSnapshot}</dd></div><div><dt>Granted authority</dt><dd>Files, terminal, and tests · deployment not granted</dd></div></dl></div> : null}
							<article className="aex-message is-user"><span>RA</span><div><header><strong>You</strong><time>Just now</time></header><p>{workspaceProfile.seed}</p></div></article>
							<article className="aex-message is-agent"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p><ExecuteStreamedText text={workspaceProfile.agentIntro} /></p></div></article>

							<section className={`aex-live-run is-${runState}`} aria-live="polite">
								<header><span>{runState === "running" ? <SpinnerGap className="mxp-spin" size={15} /> : <CheckCircle size={15} />}<strong>{runState === "verified" ? "Implementation complete" : runState === "running" ? "MAX is working autonomously" : "Ready to execute"}</strong></span><small>{workspaceProfile.steps.length} actions</small></header>
								{renderStep(0)}
								{renderStep(1)}
								{renderStep(2)}
								<div className="aex-tool-call"><TerminalWindow size={14} /><code>{workspaceProfile.command}</code><span>{runState === "verified" || (runState === "running" && runStage >= 3) ? <><Check size={12} />{workspaceProfile.tests} passed</> : runState === "running" && runStage === 2 ? <><SpinnerGap className="mxp-spin" size={12} />Running focused tests…</> : runState === "running" ? "Waiting on implementation" : "Ready"}</span></div>
								{renderStep(3)}
							</section>

							{workspaceMessages.map((message, index) => <article key={`${message}-${index}`} className="aex-message is-user"><span>RA</span><div><header><strong>You</strong><time>Now</time></header><p>{message}</p></div></article>)}
							{steerPending[selectedTask] ? <article className="aex-message is-agent aex-steer-pending"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p><SpinnerGap className="mxp-spin" size={12} />Reading the direction…</p></div></article> : null}
							{workspaceMessages.length && !steerPending[selectedTask] ? <article className="aex-message is-agent"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p><ExecuteStreamedText key={workspaceMessages.length} text={`${workspaceProfile.steerResponse} It will be included in cumulative verification.`} /></p></div></article> : null}
							{runState === "verified" ? <motion.article className="aex-result" initial={prefersReducedMotion() ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28, ease: [0.16, 1, 0.3, 1] }}><CheckCircle size={18} weight="fill" /><div><strong>{workspaceProfile.result}</strong><p><b>{workspaceProfile.tests} passed in 6.8s</b> · {workspaceProfile.resultMeta}</p><button type="button" onClick={() => setView("tests")}>Review evidence<ArrowRight size={13} /></button></div></motion.article> : null}
						</div>
						<form className="aex-steer" onSubmit={(event) => { event.preventDefault(); sendSteer() }}>
							<div className="aex-steer-scope"><Code size={14} /><span><small>Steering Workspace {workspaceNumber}</small><strong>{task.title}</strong></span></div>
							<textarea ref={steerRef} aria-label={`Steer Workspace ${workspaceNumber}: ${task.title}`} value={steer} onChange={(event) => setSteerDrafts((items) => ({ ...items, [selectedTask]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendSteer() } }} rows={1} placeholder="Steer this workspace’s agent or ask about the work…" />
							<footer><div><span className="aex-steer-glyph" aria-hidden="true"><Paperclip size={15} /></span><span><ShieldCheck size={12} />Inside approved authority</span></div><button type="submit" aria-label="Send direction" disabled={!steer.trim()}><ArrowRight size={16} /></button></footer>
						</form>
					</main>

					<aside className="aex-inspector" aria-label="Engagement inspector">
						<nav aria-label="Execute workspace views">{panelItems.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" aria-label={item.label} aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}><Icon size={15} /><span>{item.label}</span>{item.count ? <b aria-hidden="true">{item.count}</b> : null}</button> })}</nav>
						<AnimatePresence initial={false}>
							{view === "topology" ? <motion.section key="topology" className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Live orchestration</span><h2>Workspace topology</h2><p>Five isolated workspaces, one cumulative gate. Select any workspace to open its agent session.</p></header><ExecuteWorkspaceTopology runState={runState} selectedTask={selectedTask} steeringCounts={steeringCounts} completedWorkspaces={completedWorkspaces} gateVerifying={runState === "running" && runStage >= 3} onSelectTask={openWorkspace} onOpenTests={() => setView("tests")} /><div className="aex-inspector-note"><ShieldCheck size={14} /><span><strong>Authority stays bounded</strong><small>Files, terminal, and tests only</small></span></div></motion.section> : null}
							{view === "changes" ? <motion.section key={`changes-${selectedTask}`} className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Workspace {workspaceNumber}</span><h2>Changes</h2><p>{runState === "running" ? `${visibleFiles.length} of ${workspaceProfile.files.length} files` : `${workspaceProfile.files.length} files · +${workspaceProfile.files.reduce((sum, file) => sum + file.added, 0)} −2`}</p></header><div className="aex-file-list">{visibleFiles.map((file, index) => <button type="button" key={file.name} className={index === selectedFileIndex ? "is-active" : ""} aria-pressed={index === selectedFileIndex} onClick={() => setSelectedFiles((items) => ({ ...items, [selectedTask]: index }))}><FileText size={14} /><span><strong>{file.name}</strong><small>{file.path}</small></span><b>+{file.added}</b></button>)}{visibleFiles.length === 0 ? <p className="aex-file-empty">Files land here as MAX edits them.</p> : null}</div>{selectedFile ? <pre className="aex-mini-diff"><code><span>{selectedFile.path}/{selectedFile.name} · +{selectedFile.added}</span>{"\n"}{selectedFile.diff.map((line) => line.startsWith("+") ? <b key={line}>{line}{"\n"}</b> : <span key={line}>{line}{"\n"}</span>)}</code></pre> : null}</motion.section> : null}
							{view === "tests" ? <motion.section key={`tests-${selectedTask}`} className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Workspace {workspaceNumber} evidence</span><h2>Tests and release gates</h2><p>{runState === "verified" ? `${workspaceProfile.tests} passed · 0 failed` : "Failures return to this workspace’s agent automatically."}</p></header><div className="aex-test-summary"><CheckCircle size={20} /><span><strong>{runState === "verified" ? "Workspace gate passed" : runState === "running" ? "Verification in progress" : "Gate ready"}</strong><small>No skipped or flaky tests</small></span></div><div className="aex-test-list">{workspaceProfile.suites.map(([name, count]) => <div key={name}><Check size={13} /><span>{name}</span><b>{runState === "verified" ? `${count} passed` : runState === "running" && runStage >= 2 ? `${count} running` : `${count} ready`}</b></div>)}</div></motion.section> : null}
							{view === "terminal" ? <motion.section key={`terminal-${selectedTask}`} className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Workspace {workspaceNumber}</span><h2>Terminal</h2><p>{workspaceProfile.branch}</p></header><pre className="aex-terminal" aria-label={`Workspace ${workspaceNumber} terminal`}><code>$ {workspaceProfile.command}{"\n\n"}{workspaceProfile.suites.slice(0, runState === "verified" ? 3 : runState === "running" ? Math.min(terminalLines, 3) : 0).map(([name]) => `PASS ${name.toLowerCase().replaceAll(" ", "-")}.spec.ts\n`)}{"\n"}<b>{runState === "verified" ? `${workspaceProfile.tests} passed · 0 failed · 6.8s` : runState === "running" ? (runStage >= 2 ? "Focused tests in progress…" : "Preparing the worktree…") : "Ready"}</b></code></pre></motion.section> : null}
							{view === "deploys" ? <motion.section key="deploys" className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Governed release</span><h2>Deploys</h2><p>Production authority is never implied.</p></header><article className="aex-deploy"><span className={deployRequested ? "is-waiting" : ""}><ArrowRight size={17} /></span><div><strong>{deployRequested ? "Approval requested" : "Release candidate ready"}</strong><small>8f37c2 · rollback retained</small></div></article><button type="button" className="aex-panel-action" disabled={deployRequested || runState !== "verified"} onClick={requestDeploy}>{deployRequested ? "Awaiting release owner" : "Request deployment approval"}</button>{deployRequested ? <div className="aex-deploy-receipt"><i /><div><strong>Approval requested · routed to the release owner</strong><small>Root Admin · artifact 8f37c2 · {deployRequestedAt ?? "just now"}</small><button type="button" onClick={onOpenApprovals}>View in approvals<ArrowRight size={12} /></button></div></div> : null}</motion.section> : null}
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

function CommandMenu({ open, active, onClose, onNavigate, onStartDiscovery }: { open: boolean; active: MaxionModuleId; onClose: () => void; onNavigate: (module: MaxionModuleId) => void; onStartDiscovery: () => void }) {
	if (!open) return null
	const items = [...PRIMARY_NAVIGATION, { id: "integrations" as const, label: "Integrations", icon: Plug }]
	return <div className="mxp-command-layer" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><motion.section role="dialog" aria-modal="true" aria-label="MAXION command menu" initial={{ opacity: 0, scale: 0.98, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}><div className="mxp-command-search"><MagnifyingGlass size={16} /><input autoFocus aria-label="Search MAXION commands" placeholder="Search modules, work, and actions…" /><kbd>Esc</kbd></div><div className="mxp-command-label">Go to</div>{items.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => onNavigate(item.id)}>{"spiral" in item && item.spiral ? <MaxionSpiralMark className="mxp-command-spiral" /> : Icon ? <Icon size={16} /> : null}<span><strong>{item.label}</strong><small>{item.id === active ? "Current module" : item.id === "consult" ? "Ask across MAXION" : `Open ${item.label}`}</small></span>{item.id === active ? <Check size={14} /> : <CaretRight size={13} />}</button> })}<div className="mxp-command-label">Quick actions</div><button type="button" onClick={onStartDiscovery}><Plus size={16} /><span><strong>Start a Discovery</strong><small>Autonomous research and interviews</small></span><CaretRight size={13} /></button><button type="button" onClick={() => onNavigate("agentix")}><Lightning size={16} /><span><strong>Create an operational Agent</strong><small>Activate bounded autonomous work</small></span><CaretRight size={13} /></button></motion.section></div>
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
	const [discoverySetupSignal, setDiscoverySetupSignal] = useState(0)
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
	const startDiscoverySetup = () => {
		// Signal Discovery to open its setup screen instead of dropping the user
		// wherever the module last was.
		setDiscoverySetupSignal((current) => current + 1)
		navigate("discovery")
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
				<div className="mxp-stage-view mxp-stage-view--discovery" hidden={activeModule !== "discovery"}><DiscoveryAutonomousPrototypePage embedded setupSignal={discoverySetupSignal} onPackageReady={() => setDiscoveryReady(true)} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "plan"}><PlanModule projects={projects} onNavigate={navigate} onCommand={() => setCommandOpen(true)} onSendToExecute={(snapshot) => { setPlanSent(true); setPlanSnapshot(snapshot); navigate("execute") }} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "execute"}><ExecuteModule active={activeModule === "execute"} onNavigate={navigate} planHandoff={planSent} planSnapshot={planSnapshot} onVerified={() => setExecuteVerified(true)} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "agentix"}><AgentixPrototypePage embedded /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "consult"}><ConsultModule onCommand={() => setCommandOpen(true)} onNavigate={navigate} /></div>
				<div className="mxp-stage-view" hidden={activeModule !== "integrations"}><IntegrationsModule /></div>
				{(["settings", "approvals", "usage", "help"] as const).map((module) => <div key={module} className="mxp-stage-view" hidden={activeModule !== module}><AccountUtilityModule module={module} onNavigate={navigate} /></div>)}
			</div>
			<AnimatePresence>{commandOpen ? <CommandMenu open={commandOpen} active={activeModule} onClose={() => setCommandOpen(false)} onNavigate={navigate} onStartDiscovery={startDiscoverySetup} /> : null}</AnimatePresence>
		</div>
	)
}
