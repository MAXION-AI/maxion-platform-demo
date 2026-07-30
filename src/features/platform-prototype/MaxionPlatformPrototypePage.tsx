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
	Compass,
	Cube,
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
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react"
import { useLocation } from "react-router-dom"

import { useDocumentTitle } from "@/app/hooks/useDocumentTitle"
import { AgentixPrototypePage, type AgentixAttention, type AgentixIntent, type AgentixIntentSignal } from "@/features/agentix/prototype/AgentixPrototypePage"
import {
	DiscoveryAutonomousPrototypePage,
	listDiscoveryJumpRecords,
	type DiscoveryJump,
	type DiscoveryJumpRecord,
	type DiscoveryOpenSignal,
} from "@/features/discovery-autonomous/DiscoveryAutonomousPrototypePage"

import { PLAN_JUMP_ENTRIES, PlanModule, type PlanJumpSignal } from "./PlanAgenticModule"
import { MaxionSpiralMark, PortalSidebar, PRIMARY_NAVIGATION } from "./PortalChrome"
import {
	AccountUtilityModule,
	DashboardModule,
	ExecuteHubModule,
	IntegrationsModule,
	ProjectsModule,
} from "./PortalReplicaModules"
import {
	EXECUTE_FLAGSHIP_ENGAGEMENT,
	EXECUTE_TASKS,
	INITIAL_PROJECTS,
	resolveExecuteBlueprint,
	type ExecuteBlueprint,
	type ExecuteLaunchIntent,
	type ExecuteWorkspaceId,
	type ExecuteWorkspaceProfile,
	type ExecuteWorkspaceSpec,
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

// Staged-run timing. One clock drives the whole run so every workspace can be read at its
// own offset — the selected workspace's numbers still match the timer chain exactly.
const EXECUTE_STAGE_MS = [0, 700, 2100, 3600] as const
const EXECUTE_RUN_MS = 4400
const EXECUTE_FILE_START_MS = 900
const EXECUTE_FILE_STEP_MS = 240
const EXECUTE_TERMINAL_START_MS = 2200
const EXECUTE_TERMINAL_STEP_MS = 200
const EXECUTE_WORKSPACE_LAG_MS = 400
const EXECUTE_SUITE_SECONDS = 6.8

const executeStageAt = (elapsed: number) => elapsed >= EXECUTE_STAGE_MS[3] ? 3 : elapsed >= EXECUTE_STAGE_MS[2] ? 2 : elapsed >= EXECUTE_STAGE_MS[1] ? 1 : 0
const executeFilesAt = (elapsed: number, total: number) => Math.max(0, Math.min(total, Math.floor((elapsed - EXECUTE_FILE_START_MS) / EXECUTE_FILE_STEP_MS) + 1))
const executeTerminalAt = (elapsed: number, suites: number) => Math.max(0, Math.min(suites * 2 + 1, Math.floor((elapsed - EXECUTE_TERMINAL_START_MS) / EXECUTE_TERMINAL_STEP_MS)))

// Suite durations are apportioned from the run's own reported total, so the terminal's
// per-suite timings add up to the number the result card prints.
function executeSuiteSeconds(suites: ExecuteWorkspaceProfile["suites"]) {
	const tests = suites.reduce((sum, [, count]) => sum + count, 0) || 1
	const budget = Math.round(EXECUTE_SUITE_SECONDS * 10)
	let remaining = budget
	return suites.map(([, count], index) => {
		if (index === suites.length - 1) return (Math.max(3, remaining) / 10).toFixed(1)
		const share = Math.max(3, Math.round((count / tests) * budget))
		remaining -= share
		return (share / 10).toFixed(1)
	})
}

// Steering answers vary with what was actually asked. Variant one is the workspace's own
// line, so the profile keeps owning its voice.
function executeSteerResponse(profile: ExecuteWorkspaceProfile, message: string) {
	const text = message.toLowerCase()
	if (/\b(tests?|assert|assertion|coverage|spec)\b/.test(text)) return `I’ve turned that into an assertion on the ${profile.steerTarget} rather than new behavior — the suite carries it from here.`
	if (/\b(api|contract|endpoint|interface|schema)\b/.test(text)) return `I’ve held the published contract fixed and applied that inside the ${profile.steerTarget}.`
	if (/\b(scope|boundary|authority|permission|deploy|production)\b/.test(text)) return `That sits outside this worktree’s authority, so I’ve recorded it against the ${profile.steerTarget} and left the boundary unchanged.`
	return profile.steerResponse
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
	deployRequestedMs: number | null
	deployArtifact: string
	deployApproved: boolean
	auditExported: boolean
}

type ExecuteWorkspaceCommand =
	| { type: "workspace"; taskId: string }
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

function buildExecutePaletteItems(workspaces: readonly ExecuteWorkspaceSpec[]): ExecutePaletteItem[] {
	const items: ExecutePaletteItem[] = []
	workspaces.forEach((task, index) => items.push({ id: `workspace-${task.id}`, group: "Workspaces", label: task.title, hint: `Open Workspace ${String(index + 1).padStart(2, "0")}`, keywords: `${task.detail} workspace agent session`, action: { type: "workspace", taskId: task.id } }))
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

function ExecuteCommandPalette({ workspaces, onRun, onClose }: { workspaces: readonly ExecuteWorkspaceSpec[]; onRun: (action: ExecutePaletteAction) => void; onClose: () => void }) {
	const [query, setQuery] = useState("")
	const [active, setActive] = useState(0)
	const items = buildExecutePaletteItems(workspaces)
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

type ExecuteJumpTarget = { kind: "workspace"; taskId: ExecuteWorkspaceId } | { kind: "approvals" } | { kind: "engagements" }
type ExecuteJumpSignal = { tick: number; target: ExecuteJumpTarget }

function ExecuteModule({
	active,
	planHandoff,
	planSnapshot,
	jumpSignal = null,
	onVerified,
	onNavigate,
}: {
	active: boolean
	planHandoff: boolean
	planSnapshot: string
	jumpSignal?: ExecuteJumpSignal | null
	onVerified: () => void
	onNavigate: (module: MaxionModuleId) => void
}) {
	const rootRef = useRef<HTMLDivElement>(null)
	const [workspaceOpen, setWorkspaceOpen] = useState(false)
	const [paletteOpen, setPaletteOpen] = useState(false)
	const [hubFocusSignal, setHubFocusSignal] = useState(0)
	const [engagement, setEngagement] = useState<ExecuteLaunchIntent>(EXECUTE_FLAGSHIP_ENGAGEMENT)
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

	// Every engagement carries its own workspaces, branches, and evidence.
	const blueprint = resolveExecuteBlueprint(engagement)
	// A requested release is a real approval item: it survives leaving the workspace and
	// is decided on the hub's approvals surface, beside the repository boundary.
	const deployEntry = Object.entries(progress).find(([, item]) => item.deployRequested)
	const deployRequest = deployEntry ? { title: deployEntry[0], artifact: deployEntry[1].deployArtifact, requestedAt: deployEntry[1].deployRequestedAt, approved: deployEntry[1].deployApproved } : null
	const approveDeploy = () => {
		if (!deployEntry) return
		setProgress((items) => ({ ...items, [deployEntry[0]]: { ...items[deployEntry[0]], deployApproved: true } }))
	}

	// Cross-module arrival from the shell palette. Workspace jumps ride the existing
	// dispatch seam, so a jump that lands before the workspace mounts is queued, not lost.
	const jumpActionsRef = useRef<(target: ExecuteJumpTarget) => void>(() => undefined)
	jumpActionsRef.current = (target) => {
		if (target.kind === "workspace") {
			// Shell jump targets name the flagship engagement's workspaces. If another
			// engagement is open, bring the flagship back first and let the command ride
			// the pending seam into the workspace that is about to mount.
			if (blueprint.workspaces.some((workspace) => workspace.id === target.taskId)) { dispatchWorkspace({ type: "workspace", taskId: target.taskId }); return }
			setEngagement(EXECUTE_FLAGSHIP_ENGAGEMENT)
			workspaceCommandRef.current = null
			pendingCommandRef.current = { type: "workspace", taskId: target.taskId }
			setWorkspaceOpen(true)
			return
		}
		if (target.kind === "approvals") { openApprovals(); return }
		setWorkspaceOpen(false)
	}
	const jumpTickRef = useRef(0)
	useEffect(() => {
		if (!jumpSignal || jumpSignal.tick === jumpTickRef.current) return
		jumpTickRef.current = jumpSignal.tick
		jumpActionsRef.current(jumpSignal.target)
	}, [jumpSignal])

	return (
		<div className="aex-module" ref={rootRef}>
			{workspaceOpen
				? <ExecuteWorkspaceModule key={`${engagement.source}-${engagement.title}-${String(engagement.autoStart)}`} onBack={() => setWorkspaceOpen(false)} onPlatform={() => onNavigate("dashboard")} onCommand={openPalette} onOpenApprovals={openApprovals} engagement={engagement} blueprint={blueprint} planSnapshot={planSnapshot} progress={progress[engagement.title]} onProgress={(next) => setProgress((items) => ({ ...items, [engagement.title]: next }))} onVerified={onVerified} registerCommands={registerWorkspaceCommands} />
				: <ExecuteHubModule onOpenRun={(intent) => { setEngagement(intent); setWorkspaceOpen(true) }} onNavigate={onNavigate} planHandoff={planHandoff} planSnapshot={planSnapshot} active={active} focusSignal={hubFocusSignal} intent={hubIntent} onIntentConsumed={() => setHubIntent(null)} engagementState={progress["ERP modernization delivery"]?.runState ?? "idle"} deployRequest={deployRequest} onApproveDeploy={approveDeploy} />}
			{paletteOpen ? <ExecuteCommandPalette workspaces={blueprint.workspaces} onRun={runPaletteAction} onClose={closePalette} /> : null}
		</div>
	)
}

function ExecuteRunButton({ runState, paused, onRun }: { runState: ExecuteRunState; paused: boolean; onRun: () => void }) {
	const label = runState === "verified" ? "Run verified" : runState === "running" ? "Running…" : paused ? "Resume run" : "Start agent run"
	return (
		<button type="button" className="mxp-primary" disabled={runState === "running"} onClick={onRun}>
			{runState === "verified" ? <Check size={14} /> : runState === "running" ? <SpinnerGap className="mxp-spin" size={14} /> : <Play size={14} weight="fill" />}
			{label}
		</button>
	)
}

// Post-verify the engagement is still a live system: one fact at a time, rotating slowly
// under the orchestrator. Reduced motion keeps the first fact and never starts a timer.
function ExecuteAmbientLine({ facts, active }: { facts: readonly string[]; active: boolean }) {
	const [index, setIndex] = useState(0)
	useEffect(() => {
		if (!active || prefersReducedMotion() || facts.length < 2) return
		const timer = window.setInterval(() => setIndex((current) => (current + 1) % facts.length), 6000)
		return () => window.clearInterval(timer)
	}, [active, facts])
	if (!active || facts.length === 0) return null
	return <p className="aex-ambient"><i aria-hidden="true" />{facts[index % facts.length]}</p>
}

// Minutes since this workspace was opened. Timestamps that never move are the loudest
// tell that nothing is running; under reduced motion they simply stay where they started.
function useElapsedMinutes() {
	const [minutes, setMinutes] = useState(0)
	useEffect(() => {
		if (prefersReducedMotion()) return
		const timer = window.setInterval(() => setMinutes((value) => value + 1), 60_000)
		return () => window.clearInterval(timer)
	}, [])
	return minutes
}

function ExecuteWorkspaceTopology({
	runState,
	workspaces,
	ambient,
	selectedTask,
	steeringCounts,
	runElapsed = null,
	gateVerifying = false,
	onSelectTask,
	onOpenTests,
}: {
	runState: ExecuteRunState
	workspaces: readonly ExecuteWorkspaceSpec[]
	ambient: readonly string[]
	selectedTask: string
	steeringCounts?: Record<string, number>
	runElapsed?: number | null
	gateVerifying?: boolean
	onSelectTask: (taskId: string) => void
	onOpenTests: () => void
}) {
	// Each workspace comes online at its own offset into the run, and the topology says so —
	// the same clock the thread reads, so a workspace is never "Verified" here while its own
	// session is still working over there.
	const workspaceStatus = (taskId: string, index: number) => {
		if (runState === "verified") return "Verified"
		if (steeringCounts?.[taskId]) return "Directed"
		if (runState === "running") {
			if (runElapsed === null) return index === 0 ? "Working" : "Queued"
			const elapsed = runElapsed - index * EXECUTE_WORKSPACE_LAG_MS
			return elapsed >= EXECUTE_RUN_MS ? "Verified" : elapsed >= 0 ? "Working" : "Queued"
		}
		return index === 0 ? "Ready" : "Queued"
	}
	return (
		<div className="mxp-topology-graph" role="group" aria-label="Workspace dependency topology">
			<div className="mxp-topology-node is-orchestrator">
				<MaxionMark size={27} />
				<span><small>Orchestrator</small><strong>MAX delivery lead</strong><i className={runState === "running" ? "is-coordinating" : runState === "verified" ? "is-verified" : ""}>{runState === "running" ? "Coordinating" : runState === "verified" ? "Verified" : "Ready"}</i></span>
			</div>
			<ExecuteAmbientLine facts={ambient} active={runState === "verified"} />
			<span className="mxp-topology-connector" aria-hidden="true" />
			<div className="mxp-topology-workspaces">
				{workspaces.map((item, index) => (
					<button type="button" key={item.id} aria-label={`Open Workspace ${String(index + 1).padStart(2, "0")}: ${item.title}`} className={`mxp-topology-node${selectedTask === item.id ? " is-selected" : ""}`} onClick={() => onSelectTask(item.id)}>
						<span className="mxp-mini-glyph"><Code size={13} /></span>
						<span><small>Workspace {String(index + 1).padStart(2, "0")}</small><strong>{item.title}</strong><i className={`is-${workspaceStatus(item.id, index).toLowerCase()}`}>{workspaceStatus(item.id, index)}</i></span>
					</button>
				))}
			</div>
			<span className="mxp-topology-connector is-lower" aria-hidden="true" />
			<button type="button" aria-label="Open cumulative tests and release gate" className="mxp-topology-node is-gate" onClick={onOpenTests}>
				<span className="mxp-mini-glyph"><ShieldCheck size={14} /></span>
				<span><small>Cumulative gate</small><strong>Verify, audit, and prepare release</strong><i className={runState === "verified" ? "is-verified" : gateVerifying ? "is-verifying" : ""}>{runState === "verified" ? "Passed" : gateVerifying ? "Verifying" : "Waiting"}</i></span>
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
	blueprint,
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
	blueprint: ExecuteBlueprint
	planSnapshot: string
	progress?: ExecuteEngagementProgress
	onProgress: (next: ExecuteEngagementProgress) => void
	onVerified: () => void
	registerCommands: (handler: ((command: ExecuteWorkspaceCommand) => void) | null) => void
}) {
	// A verified engagement re-enters as verified — evidence restored, run not replayed.
	const restoredVerified = progress?.runState === "verified"
	const workspaces = blueprint.workspaces
	const [view, setView] = useState<ExecuteWorkspaceView>("topology")
	const [selectedTask, setSelectedTask] = useState<string>(workspaces[0].id)
	const [runState, setRunState] = useState<ExecuteRunState>(restoredVerified ? "verified" : engagement.autoStart ? "running" : "idle")
	const [runStage, setRunStage] = useState(0)
	// Milliseconds into the current run. Sub-stage detail — files landing, terminal lines,
	// and each workspace's own offset — is derived from this single clock.
	const [runClock, setRunClock] = useState(0)
	const [pausedStage, setPausedStage] = useState<number | null>(null)
	const [deployRequested, setDeployRequested] = useState(progress?.deployRequested ?? false)
	const [deployRequestedAt, setDeployRequestedAt] = useState<string | null>(progress?.deployRequestedAt ?? null)
	const [deployRequestedMs, setDeployRequestedMs] = useState<number | null>(progress?.deployRequestedMs ?? null)
	const [auditExported, setAuditExported] = useState(progress?.auditExported ?? false)
	const [handoffOpen, setHandoffOpen] = useState(false)
	const [steerDrafts, setSteerDrafts] = useState<Record<string, string>>({})
	const [selectedFiles, setSelectedFiles] = useState<Record<string, number>>({})
	const [steeringMessages, setSteeringMessages] = useState<Record<string, string[]>>(progress?.steering ?? {})
	const [steerPending, setSteerPending] = useState<Record<string, boolean>>({})
	const threadScrollRef = useRef<HTMLDivElement>(null)
	const terminalRef = useRef<HTMLPreElement>(null)
	const steerRef = useRef<HTMLTextAreaElement>(null)
	const steerTimersRef = useRef<number[]>([])
	const deployApproved = progress?.deployApproved ?? false
	const elapsedMinutes = useElapsedMinutes()
	const task = workspaces.find((item) => item.id === selectedTask) ?? workspaces[0]
	const workspaceIndex = workspaces.findIndex((item) => item.id === task.id)
	const workspaceNumber = String(workspaceIndex + 1).padStart(2, "0")
	const workspaceProfile = task.profile
	const steer = steerDrafts[selectedTask] ?? ""
	const workspaceMessages = steeringMessages[selectedTask] ?? []
	const steeringCounts = Object.fromEntries(workspaces.map((item) => [item.id, steeringMessages[item.id]?.length ?? 0]))

	// Five agent sessions run concurrently, so each workspace reads at its own offset into
	// the run. Reduced motion — and every other state — collapses back to the shared stage.
	const staged = runState === "running" && !prefersReducedMotion()
	const workspaceElapsed = runClock - workspaceIndex * EXECUTE_WORKSPACE_LAG_MS
	const displayStage = staged ? executeStageAt(workspaceElapsed) : runStage
	const fileTotal = workspaceProfile.files.length
	const revealedFiles = runState !== "running" ? fileTotal : staged ? executeFilesAt(workspaceElapsed, fileTotal) : fileTotal
	const terminalEvents = runState === "verified" ? workspaceProfile.suites.length * 2 + 1 : runState !== "running" ? 0 : staged ? executeTerminalAt(workspaceElapsed, workspaceProfile.suites.length) : workspaceProfile.suites.length * 2 + 1
	const liveTestCount = useCountUp(workspaceProfile.tests, runState === "verified" || (runState === "running" && displayStage >= 2), !restoredVerified, 1300)

	// Report engagement progress up so the hub and re-entry reflect the real state.
	// The mount-time snapshot is skipped: it holds nothing new, and the extra parent
	// re-render would land inside the unit tests' tight reduced-motion timing window.
	const onProgressRef = useRef(onProgress)
	onProgressRef.current = onProgress
	const progressSyncedRef = useRef(false)
	useEffect(() => {
		if (!progressSyncedRef.current) { progressSyncedRef.current = true; return }
		onProgressRef.current({ runState, steering: steeringMessages, deployRequested, deployRequestedAt, deployRequestedMs, deployArtifact: blueprint.artifact, deployApproved, auditExported })
		// The blueprint is fixed for the life of this workspace; only real state changes report up.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [runState, steeringMessages, deployRequested, deployRequestedAt, deployRequestedMs, deployApproved, auditExported])

	const requestDeploy = () => {
		if (runState !== "verified" || deployRequested) return
		setDeployRequested(true)
		setDeployRequestedAt(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()))
		setDeployRequestedMs(Date.now())
	}
	const startRun = () => {
		setPausedStage(null)
		setRunState("running")
	}
	const interruptRun = () => {
		if (runState !== "running") return
		setPausedStage(displayStage)
		setRunState("idle")
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
		let clock = 0
		if (prefersReducedMotion()) {
			setRunStage(2)
			setRunClock(EXECUTE_RUN_MS)
			timers.push(window.setTimeout(() => {
				setRunState("verified")
				onVerified()
			}, 1200))
		} else {
			setRunStage(0); setRunClock(0)
			const startedAt = Date.now()
			// One interval carries sub-stage detail: files landing, terminal lines appending,
			// and the per-workspace offsets. The stage chain below stays authoritative.
			clock = window.setInterval(() => setRunClock(Date.now() - startedAt), 160)
			timers.push(window.setTimeout(() => setRunStage(1), EXECUTE_STAGE_MS[1]))
			timers.push(window.setTimeout(() => setRunStage(2), EXECUTE_STAGE_MS[2]))
			timers.push(window.setTimeout(() => setRunStage(3), EXECUTE_STAGE_MS[3]))
			timers.push(window.setTimeout(() => {
				setRunState("verified")
				onVerified()
			}, EXECUTE_RUN_MS))
		}
		return () => {
			timers.forEach((timer) => window.clearTimeout(timer))
			if (clock) window.clearInterval(clock)
		}
		// The parent callback is recreated by the shell, while a run must keep one staged timer chain.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [runState])

	// The terminal is a log: new lines arrive at the bottom and it follows them.
	useEffect(() => {
		if (view !== "terminal") return
		const node = terminalRef.current
		if (!node) return
		node.scrollTop = node.scrollHeight
	}, [view, terminalEvents, selectedTask])

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
		const nextTask = workspaces.find((item) => item.id === taskId)
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
			if (command.type === "run") { startRun(); return }
			if (command.type === "interrupt") { interruptRun(); return }
			if (command.type === "deploy") { setView("deploys"); requestDeploy(); return }
			if (command.type === "export-audit") { setView("audit"); setAuditExported(true); return }
			steerRef.current?.focus()
		})
		return () => registerCommands(null)
	})
	const workspaceStatus = runState === "verified" ? "Verified" : runState === "running" ? "Working" : "Ready"
	const visibleFiles = runState === "running" ? workspaceProfile.files.slice(0, Math.min(revealedFiles, fileTotal)) : workspaceProfile.files
	const selectedFileIndex = Math.min(selectedFiles[selectedTask] ?? 0, Math.max(0, visibleFiles.length - 1))
	const selectedFile = visibleFiles[selectedFileIndex]
	// A direction becomes an assertion, so it lands on this workspace's spec file.
	const directionCount = workspaceMessages.length
	const specFileIndex = workspaceProfile.files.reduce((found, file, index) => file.name.includes(".spec.") ? index : found, -1)
	const directionFileIndex = specFileIndex >= 0 ? specFileIndex : Math.max(0, fileTotal - 1)
	const suiteSeconds = executeSuiteSeconds(workspaceProfile.suites)
	// Evidence ages while you sit with it. The clock only advances for viewers who want motion.
	const deployAgeMinutes = deployRequestedMs ? Math.max(0, Math.floor((Date.now() - deployRequestedMs) / 60_000)) : 0
	const relativeMinutes = (minutes: number) => minutes === 0 ? "Now" : `${minutes} min`
	const auditShift = deployApproved ? 1 : 0
	const auditEntries: Array<[string, string]> = [
		...(deployApproved ? [["Now", "Release approved by the release owner"] as [string, string]] : []),
		[relativeMinutes(elapsedMinutes + auditShift), "Release gate verified"],
		[relativeMinutes(elapsedMinutes + auditShift + 2), `${workspaceProfile.steerTarget.charAt(0).toUpperCase()}${workspaceProfile.steerTarget.slice(1)} updated`],
		[relativeMinutes(elapsedMinutes + auditShift + 5), "Boundary evaluated"],
		[relativeMinutes(elapsedMinutes + auditShift + 7), "Plan evidence bound"],
	]
	const stepState = (index: number): "complete" | "current" | "queued" => runState === "verified" ? "complete" : runState !== "running" ? "queued" : index < displayStage ? "complete" : index === displayStage ? "current" : "queued"
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
		{ id: "topology", label: "Topology", count: String(workspaces.length), icon: CirclesThree },
		{ id: "changes", label: "Changes", count: String(visibleFiles.length), icon: FileText },
		{ id: "tests", label: "Tests", count: String(workspaceProfile.tests), icon: ListChecks },
		{ id: "terminal", label: "Terminal", icon: TerminalWindow },
		{ id: "deploys", label: "Deploys", count: runState === "verified" ? "1" : undefined, icon: ArrowRight },
		{ id: "audit", label: "Audit", icon: ShieldCheck },
	]
	// The terminal is a real log: the command, the worktree, every suite moving from RUNS to
	// PASS with its own timing, then the totals the result card quotes.
	const terminalBody = () => {
		const lines: string[] = [`$ ${workspaceProfile.command}`, "", `RUN  v2.1.4  max-ai-platform (worktree ${workspaceProfile.branch})`, ""]
		workspaceProfile.suites.forEach(([name, count], index) => {
			const spec = `${name.toLowerCase().replaceAll(" ", "-")}.spec.ts`
			if (terminalEvents > index * 2 + 1) lines.push(`PASS  ${spec}  ${count} tests · ${suiteSeconds[index]}s`)
			else if (terminalEvents > index * 2) lines.push(`RUNS  ${spec}`)
		})
		if (terminalEvents > workspaceProfile.suites.length * 2) lines.push("", `Test Files  ${workspaceProfile.suites.length} passed (${workspaceProfile.suites.length})`)
		return `${lines.join("\n")}\n`
	}

	return (
		<div className="aex-app aex-app--workspace">
			<aside className="aex-rail" aria-label="Execute tasks">
				<header>
					<button type="button" className="aex-brand" aria-label="Return to MAXION" onClick={onPlatform}><MaxionSpiralMark className="aex-brand-mark" /><span><strong>Execute</strong><small>MAXION</small></span></button>
					<button type="button" className="aex-new-task" onClick={onBack}><Plus size={15} />New task<kbd>N</kbd></button>
				</header>
				<nav aria-label="Engagement workspaces">
					<span>Current engagement</span>
					<button type="button" className="is-current" onClick={() => setView("topology")}><i className={runState === "running" ? "is-running" : runState === "verified" ? "is-verified" : "is-ready"} /><span><strong>{engagement.title}</strong><small>{workspaceStatus} · {workspaces.length} workspaces</small></span></button>
					<span>Workspaces</span>
					{workspaces.map((item, index) => <button type="button" key={item.id} aria-label={`Open Workspace ${String(index + 1).padStart(2, "0")}: ${item.title}`} className={selectedTask === item.id ? "is-selected" : ""} onClick={() => openWorkspace(item.id)}><Code size={14} /><span><strong>{item.title}</strong><small>Workspace {String(index + 1).padStart(2, "0")}{steeringCounts[item.id] ? ` · ${steeringCounts[item.id]} direction${steeringCounts[item.id] === 1 ? "" : "s"}` : ""}</small></span>{selectedTask === item.id ? <CaretRight size={13} /> : null}</button>)}
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
								<div><button type="button" disabled={runState !== "running"} onClick={interruptRun}><Pause size={14} />Interrupt</button><ExecuteRunButton runState={runState} paused={pausedStage !== null} onRun={startRun} /></div>
							</header>

							{engagement.source === "plan" ? <button type="button" className="aex-thread-context" aria-expanded={handoffOpen} onClick={() => setHandoffOpen((open) => !open)}><FlowArrow size={14} /><span><strong>Imported from Plan</strong><small>{engagement.brief}</small></span><CaretRight size={13} className={`aex-context-caret${handoffOpen ? " is-open" : ""}`} /></button> : null}
							{engagement.source === "plan" && handoffOpen ? <div className="aex-handoff-detail"><dl><div><dt>Plan of record</dt><dd>{engagement.brief.split(" · ")[0]}</dd></div><div><dt>Scope</dt><dd>{blueprint.scope}</dd></div><div><dt>Evidence snapshot</dt><dd>{planSnapshot}</dd></div><div><dt>Granted authority</dt><dd>Files, terminal, and tests · deployment not granted</dd></div></dl></div> : null}
							<article className="aex-message is-user"><span>RA</span><div><header><strong>You</strong><time>Just now</time></header><p>{workspaceProfile.seed}</p></div></article>
							<article className="aex-message is-agent"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p><ExecuteStreamedText text={workspaceProfile.agentIntro} /></p></div></article>

							<section className={`aex-live-run is-${runState}`} aria-live="polite">
								<header><span>{runState === "running" ? <SpinnerGap className="mxp-spin" size={15} /> : <CheckCircle size={15} />}<strong>{runState === "verified" ? "Implementation complete" : runState === "running" ? "MAX is working autonomously" : "Ready to execute"}</strong></span><small>{workspaceProfile.steps.length} actions</small></header>
								{renderStep(0)}
								{renderStep(1)}
								{runState !== "idle" ? visibleFiles.map((file) => <div className="aex-tool-call is-edit" key={`edit-${file.name}`}><FileText size={13} /><code>Edit {file.path}/{file.name}</code><span>+{file.added}</span></div>) : null}
								{renderStep(2)}
								<div className="aex-tool-call"><TerminalWindow size={14} /><code>{workspaceProfile.command}</code><span>{runState === "verified" || (runState === "running" && displayStage >= 3) ? <><Check size={12} />{workspaceProfile.tests} passed</> : runState === "running" && displayStage === 2 ? <><SpinnerGap className="mxp-spin" size={12} />Running focused tests…</> : runState === "running" ? "Waiting on implementation" : "Ready"}</span></div>
								{renderStep(3)}
								{directionCount ? <div className="aex-trace-row aex-direction-row"><span className="aex-direction-dot"><FlowArrow size={11} /></span><span><strong>Direction folded into the {workspaceProfile.steerTarget}</strong><small>{directionCount} assertion{directionCount === 1 ? "" : "s"} added · carried by cumulative verification</small></span><time>+{directionCount}</time></div> : null}
							</section>

							{pausedStage !== null && runState === "idle" ? <article className="aex-message is-agent"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p>Paused at step {pausedStage + 1} of {workspaceProfile.steps.length}. The worktree is held exactly where it stopped — nothing was discarded and no effects left this workspace. Resume when you are ready.</p></div></article> : null}

							{/* Every direction keeps its own answer, so two steers can be read against each other. */}
							{workspaceMessages.map((message, index) => (
								<Fragment key={`direction-${index}`}>
									<article className="aex-message is-user"><span>RA</span><div><header><strong>You</strong><time>Now</time></header><p>{message}</p></div></article>
									{index === workspaceMessages.length - 1 && steerPending[selectedTask]
										? <article className="aex-message is-agent aex-steer-pending"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p><SpinnerGap className="mxp-spin" size={12} />Reading the direction…</p></div></article>
										: <article className="aex-message is-agent"><MaxionSpiralMark className="aex-message-mark" /><div><header><strong>MAX · Workspace {workspaceNumber}</strong><time>Now</time></header><p><ExecuteStreamedText text={`${executeSteerResponse(workspaceProfile, message)} It will be included in cumulative verification.`} /></p></div></article>}
								</Fragment>
							))}
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
							{view === "topology" ? <motion.section key="topology" className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Live orchestration</span><h2>Workspace topology</h2><p>{workspaces.length} isolated workspaces, one cumulative gate. Select any workspace to open its agent session.</p></header><ExecuteWorkspaceTopology runState={runState} workspaces={workspaces} ambient={blueprint.ambient} selectedTask={selectedTask} steeringCounts={steeringCounts} runElapsed={staged ? runClock : null} gateVerifying={runState === "running" && runStage >= 3} onSelectTask={openWorkspace} onOpenTests={() => setView("tests")} /><div className="aex-inspector-note"><ShieldCheck size={14} /><span><strong>Authority stays bounded</strong><small>Files, terminal, and tests only</small></span></div></motion.section> : null}
							{view === "changes" ? <motion.section key={`changes-${selectedTask}`} className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Workspace {workspaceNumber}</span><h2>Changes</h2><p>{runState === "running" ? `${visibleFiles.length} of ${fileTotal} files` : `${fileTotal} files · +${workspaceProfile.files.reduce((sum, file) => sum + file.added, 0)} −2`}{directionCount ? ` · ${directionCount} direction${directionCount === 1 ? "" : "s"} applied` : ""}</p></header><div className="aex-file-list">{visibleFiles.map((file, index) => <button type="button" key={file.name} className={`${index === selectedFileIndex ? "is-active" : ""}${directionCount && index === directionFileIndex ? " has-direction" : ""}`} aria-pressed={index === selectedFileIndex} onClick={() => setSelectedFiles((items) => ({ ...items, [selectedTask]: index }))}><FileText size={14} /><span><strong>{file.name}</strong><small>{file.path}</small></span>{directionCount && index === directionFileIndex ? <em className="aex-file-direction">+{directionCount} direction{directionCount === 1 ? "" : "s"}</em> : null}<b>+{file.added}</b></button>)}{visibleFiles.length === 0 ? <p className="aex-file-empty">Files land here as MAX edits them.</p> : null}</div>{selectedFile ? <pre className="aex-mini-diff"><code><span>{selectedFile.path}/{selectedFile.name} · +{selectedFile.added}</span>{"\n"}{selectedFile.diff.map((line) => line.startsWith("+") ? <b key={line}>{line}{"\n"}</b> : <span key={line}>{line}{"\n"}</span>)}</code></pre> : null}</motion.section> : null}
							{view === "tests" ? <motion.section key={`tests-${selectedTask}`} className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Workspace {workspaceNumber} evidence</span><h2>Tests and release gates</h2><p>{runState === "verified" ? `${workspaceProfile.tests} passed · 0 failed` : "Failures return to this workspace’s agent automatically."}</p></header><div className="aex-test-summary"><CheckCircle size={20} /><span><strong>{runState === "verified" ? "Workspace gate passed" : runState === "running" ? "Verification in progress" : "Gate ready"}</strong><small>No skipped or flaky tests</small></span></div><div className="aex-test-list">{workspaceProfile.suites.map(([name, count]) => <div key={name}><Check size={13} /><span>{name}</span><b>{runState === "verified" ? `${count} passed` : runState === "running" && displayStage >= 2 ? `${count} running` : `${count} ready`}</b></div>)}</div></motion.section> : null}
							{view === "terminal" ? <motion.section key={`terminal-${selectedTask}`} className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Workspace {workspaceNumber}</span><h2>Terminal</h2><p>{workspaceProfile.branch}</p></header><pre className="aex-terminal" ref={terminalRef} aria-label={`Workspace ${workspaceNumber} terminal`}><code>{terminalBody()}<b>{runState === "verified" ? `${workspaceProfile.tests} passed · 0 failed · 6.8s` : runState === "running" ? (displayStage >= 2 ? "Focused tests in progress…" : "Preparing the worktree…") : "Ready"}</b></code></pre></motion.section> : null}
							{view === "deploys" ? <motion.section key="deploys" className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Governed release</span><h2>Deploys</h2><p>Production authority is never implied.</p></header><article className="aex-deploy"><span className={deployApproved ? "is-approved" : deployRequested ? "is-waiting" : ""}>{deployApproved ? <Check size={17} /> : <ArrowRight size={17} />}</span><div><strong>{deployApproved ? "Approved · scheduled by the release owner" : deployRequested ? "Approval requested" : "Release candidate ready"}</strong><small>{blueprint.artifact} · rollback retained</small></div></article><button type="button" className="aex-panel-action" disabled={deployRequested || runState !== "verified"} onClick={requestDeploy}>{deployApproved ? "Release approved" : deployRequested ? "Awaiting release owner" : "Request deployment approval"}</button>{deployRequested ? <div className={`aex-deploy-receipt${deployApproved ? " is-approved" : ""}`}><i /><div><strong>{deployApproved ? "Approved · release owner signed off" : "Approval requested · routed to the release owner"}</strong><small>Root Admin · artifact {blueprint.artifact} · {deployRequestedAt ?? "just now"}{deployAgeMinutes ? ` · ${deployAgeMinutes} min ago` : ""}</small><button type="button" onClick={onOpenApprovals}>View in approvals<ArrowRight size={12} /></button></div></div> : null}</motion.section> : null}
							{view === "audit" ? <motion.section key="audit" className="aex-inspector-panel" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}><header><span>Immutable evidence</span><h2>Audit</h2><p>Every action carries source and actor attribution.</p></header><div className="aex-audit">{auditEntries.map(([time, title]) => <div key={title}><i /><time>{time}</time><span><strong>{title}</strong><small>Evidence fingerprint retained</small></span></div>)}</div><button type="button" className="aex-panel-action" onClick={() => setAuditExported(true)}>{auditExported ? "Audit export ready" : "Export audit package"}</button></motion.section> : null}
						</AnimatePresence>
					</aside>
				</div>
			</section>
		</div>
	)
}

function ConsultModule({ onCommand, onNavigate }: { onCommand: () => void; onNavigate: (module: MaxionModuleId) => void }) {
	const [input, setInput] = useState("")
	const [messages, setMessages] = useState<Array<{ actor: "MAX" | "You"; text: string }>>([{ actor: "MAX", text: "I can answer across the authorized MAXION context—Discovery evidence, Plan decisions, Execute state, and Agentix outcomes. What do you need to understand or decide?" }])
	const submit = () => { const value = input.trim(); if (!value) return; setMessages((items) => [...items, { actor: "You", text: value }, { actor: "MAX", text: "Two things need attention: the July close exact-effect approval in Agentix and the external-counsel authority boundary in Discovery. The ERP delivery plan is decision-ready; Execute is progressing inside its isolated worktree. I can open either boundary without changing its authority." }]); setInput("") }
	return <div className="mxp-consult mxp-module-with-rail"><ContextRail title="Consult MAX" kicker="Cross-platform intelligence" footer={<div className="mxp-rail-user"><span>RA</span><div><strong>Root Admin</strong><small>Authorized tenant context</small></div></div>}><button type="button" className="mxp-rail-primary"><Plus size={14} />New conversation</button><div className="mxp-rail-label">Recent</div><button type="button" className="is-active"><ChatCircleText size={15} /><span><strong>What needs my attention?</strong><small>Just now</small></span></button><button type="button"><ChatCircleText size={15} /><span><strong>ERP decision history</strong><small>Yesterday</small></span></button><div className="mxp-rail-label">Scope</div><button type="button"><Database size={15} /><span>All MAXION context</span><i className="mxp-success-dot" /></button></ContextRail><div className="mxp-module-area"><ModuleHeader label="Consult MAX" title="Cross-platform conversation" detail="Answers preserve source, ownership, and authority" onCommand={onCommand} /><main className="mxp-consult-main"><header><MaxionMark size={34} /><span>Consult MAX</span><h1>Ask across the work, not around it.</h1><p>Consult MAX explains the current truth across modules. It can route you to work, but it cannot silently approve or execute it.</p></header><div className="mxp-consult-thread">{messages.map((message, index) => <article key={`${message.actor}-${index}`} className={message.actor === "You" ? "is-user" : "is-max"}>{message.actor === "MAX" ? <MaxionMark size={27} /> : <span className="mxp-user-avatar">RA</span>}<div><span>{message.actor}<time>Now</time></span><p>{message.text}</p>{message.actor === "MAX" && index > 0 ? <div className="mxp-answer-actions"><button type="button" onClick={() => onNavigate("agentix")}><Pulse size={13} />Open Agentix approval</button><button type="button" onClick={() => onNavigate("discovery")}><MagnifyingGlass size={13} />Open Discovery boundary</button></div> : null}</div></article>)}</div></main><div className="mxp-consult-composer"><div><textarea aria-label="Message Consult MAX" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder="Ask what changed, what needs attention, or why a decision was made…" rows={1} /><div><span><button type="button" aria-label="Attach context"><Paperclip size={15} /></button><small><Database size={13} />All authorized MAXION context</small></span><button type="button" aria-label="Send to Consult MAX" disabled={!input.trim()} onClick={submit}><ArrowRight size={15} /></button></div></div></div></div></div>
}

// The shell command layer: one registry every module feeds, so a jump target is reachable
// from anywhere without first navigating to the module that owns it.
type ShellCommandItem = {
	id: string
	group: string
	label: string
	hint: string
	keywords: string
	icon?: typeof MagnifyingGlass
	spiral?: boolean
	current?: boolean
	run: () => void
}

type ShellCommandContext = {
	active: MaxionModuleId
	agentix: AgentixAttention
	discoveries: DiscoveryJumpRecord[]
	navigate: (module: MaxionModuleId) => void
	startDiscovery: () => void
	openPlanArtifact: (artifactId: string) => void
	openExecuteWorkspace: (taskId: ExecuteWorkspaceId) => void
	openExecuteHub: (target: "approvals" | "engagements") => void
	openDiscoveryRecord: (recordId: string, jump: DiscoveryJump) => void
	openAgentix: (intent: AgentixIntent) => void
}

const AGENTIX_JUMP_AGENTS = [
	{ id: "tpm" as const, label: "Atlas program lead", keywords: "erp program modernization steering brief decisions atlas" },
	{ id: "revenue" as const, label: "Revenue operations partner", keywords: "renewal salesforce revenue pipeline follow-through" },
	{ id: "finance" as const, label: "Finance close operator", keywords: "close quickbooks sap journal effects reconciliation" },
]

function buildShellCommandItems(context: ShellCommandContext): ShellCommandItem[] {
	const items: ShellCommandItem[] = []
	// Open boundaries lead the list, and disappear from it the moment they are resolved.
	if (context.agentix.approval) items.push({ id: "decision-approval", group: "Decisions", label: "Review July close effects", hint: "Agentix · 164 effects · $184,250 held", keywords: "approval approve exact effects finance july close agentix", icon: ShieldCheck, run: () => context.openAgentix({ type: "decision", id: "approval" }) })
	if (context.agentix.audience) items.push({ id: "decision-audience", group: "Decisions", label: "Answer the waiting question", hint: "Agentix · who may receive overdue reminders", keywords: "answer question clarification audience overdue reminders atlas agentix", icon: ChatCircleText, run: () => context.openAgentix({ type: "decision", id: "audience" }) })
	for (const record of context.discoveries) {
		if (record.status !== "needs-input") continue
		items.push({ id: `discovery-decision-${record.id}`, group: "Decisions", label: `Review decision · ${record.title}`, hint: "Discover · a bounded decision is waiting", keywords: `discovery decision approve boundary ${record.keywords}`, icon: Compass, run: () => context.openDiscoveryRecord(record.id, "decision") })
	}

	for (const item of [...PRIMARY_NAVIGATION, { id: "integrations" as const, label: "Integrations", icon: Plug }]) {
		const spiral = "spiral" in item && Boolean(item.spiral)
		const hint = item.id === context.active
			? "Current module"
			: item.id === "agentix" && context.agentix.count
				? `${context.agentix.count} decision${context.agentix.count === 1 ? "" : "s"} waiting`
				: item.id === "consult" ? "Ask across MAXION" : `Open ${item.label}`
		items.push({ id: `go-${item.id}`, group: "Go to", label: item.label, hint, keywords: `module navigate open ${item.label}`, icon: item.icon, spiral, current: item.id === context.active, run: () => context.navigate(item.id) })
	}

	items.push({ id: "action-discovery", group: "Actions", label: "Start a Discovery", hint: "Autonomous research and interviews", keywords: "new discovery start research interviews brief mission", icon: Plus, run: context.startDiscovery })
	items.push({ id: "action-agent", group: "Actions", label: "Create an operational Agent", hint: "Activate bounded autonomous work", keywords: "new agent create activate operational autonomy agentix", icon: Lightning, run: () => context.openAgentix({ type: "create" }) })

	EXECUTE_TASKS.forEach((task, index) => items.push({
		id: `execute-workspace-${task.id}`,
		group: "Execute",
		label: `Open Workspace ${String(index + 1).padStart(2, "0")} · ${task.title}`,
		hint: `${task.detail} · isolated worktree`,
		keywords: `execute workspace agent session worktree ${task.id} ${task.detail}`,
		icon: Code,
		run: () => context.openExecuteWorkspace(task.id),
	}))
	items.push({ id: "execute-approvals", group: "Execute", label: "Execute approvals", hint: "Workspace boundary and release decisions", keywords: "execute approvals boundary release deploy governance", icon: ShieldCheck, run: () => context.openExecuteHub("approvals") })
	items.push({ id: "execute-engagements", group: "Execute", label: "All engagements", hint: "Back to the Execute hub", keywords: "execute engagements hub overview", icon: Cube, run: () => context.openExecuteHub("engagements") })

	for (const record of context.discoveries) {
		items.push({ id: `discovery-resume-${record.id}`, group: "Discover", label: `Resume ${record.title}`, hint: record.statusLabel, keywords: `discovery resume open continue ${record.keywords}`, icon: Compass, run: () => context.openDiscoveryRecord(record.id, "resume") })
		if (record.status === "completed") items.push({ id: `discovery-package-${record.id}`, group: "Discover", label: `Open package · ${record.title}`, hint: "Deliverables and routing", keywords: `discovery package deliverables outputs ${record.keywords}`, icon: FileText, run: () => context.openDiscoveryRecord(record.id, "package") })
	}

	for (const agent of AGENTIX_JUMP_AGENTS) {
		const hint = agent.id === "tpm" && context.agentix.audience ? "Needs input" : agent.id === "finance" && context.agentix.approval ? "Approval waiting" : "Working"
		items.push({ id: `agentix-agent-${agent.id}`, group: "Agentix", label: `Open ${agent.label}`, hint, keywords: `agentix agent session ${agent.keywords}`, icon: Pulse, run: () => context.openAgentix({ type: "agent", id: agent.id }) })
	}
	items.push({ id: "agentix-today", group: "Agentix", label: "Agentix today", hint: "Decisions and live work", keywords: "agentix today decisions live work needs you", icon: Tray, run: () => context.openAgentix({ type: "surface", id: "today" }) })
	items.push({ id: "agentix-activity", group: "Agentix", label: "Agentix activity", hint: "Everything Agentix committed", keywords: "agentix activity ledger receipts committed history", icon: Clock, run: () => context.openAgentix({ type: "surface", id: "activity" }) })

	for (const entry of PLAN_JUMP_ENTRIES) items.push({ id: entry.id, group: "Plan", label: entry.label, hint: entry.hint, keywords: `plan ${entry.keywords}`, icon: FlowArrow, run: () => context.openPlanArtifact(entry.artifactId) })

	return items
}

// Exact and prefix matches outrank keyword matches, so "INT-02" lands on the contract and
// "Workspace 03" lands on the workspace instead of whatever mentioned them first.
function rankShellCommandItem(item: ShellCommandItem, query: string) {
	const label = item.label.toLowerCase()
	if (label === query) return 0
	if (label.startsWith(query)) return 1
	if (label.includes(query)) return 2
	if (item.hint.toLowerCase().includes(query)) return 3
	return 4
}

function CommandMenu({ context, onClose }: { context: ShellCommandContext; onClose: () => void }) {
	const [query, setQuery] = useState("")
	const [active, setActive] = useState(0)
	const listRef = useRef<HTMLDivElement>(null)
	const items = buildShellCommandItems(context)
	const q = query.trim().toLowerCase()
	// The resting view is composed, not sliced: open boundaries first, then every module,
	// then the two things people start from. Jump targets arrive as soon as you type.
	const resting = [
		...items.filter((item) => item.group === "Decisions").slice(0, 3),
		...items.filter((item) => item.group === "Go to"),
		...items.filter((item) => item.group === "Actions"),
	]
	const matched = items.filter((item) => `${item.label} ${item.hint} ${item.keywords} ${item.group}`.toLowerCase().includes(q))
	const filtered = q ? [...matched].sort((a, b) => rankShellCommandItem(a, q) - rankShellCommandItem(b, q)).slice(0, 9) : resting
	const activeIndex = Math.min(active, Math.max(0, filtered.length - 1))
	useEffect(() => {
		listRef.current?.querySelector<HTMLElement>("button.is-active")?.scrollIntoView?.({ block: "nearest" })
	}, [activeIndex, q])
	const run = (item: ShellCommandItem) => { item.run(); onClose() }
	return (
		<div className="mxp-command-layer" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
			<motion.section role="dialog" aria-modal="true" aria-label="MAXION command menu" initial={prefersReducedMotion() ? false : { opacity: 0, scale: 0.98, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}>
				<div className="mxp-command-search">
					<MagnifyingGlass size={16} />
					<input
						autoFocus
						value={query}
						aria-label="Search MAXION commands"
						placeholder="Search modules, work, and actions…"
						onChange={(event) => { setQuery(event.target.value); setActive(0) }}
						onKeyDown={(event) => {
							if (event.key === "ArrowDown") { event.preventDefault(); setActive(Math.min(activeIndex + 1, filtered.length - 1)) }
							if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(activeIndex - 1, 0)) }
							if (event.key === "Enter" && filtered[activeIndex]) { event.preventDefault(); run(filtered[activeIndex]) }
							if (event.key === "Escape") { event.preventDefault(); onClose() }
						}}
					/>
					<kbd>Esc</kbd>
				</div>
				<div className="mxp-command-list" ref={listRef}>
					{filtered.map((item, index) => {
						const Icon = item.icon
						return (
							<button type="button" key={item.id} className={index === activeIndex ? "is-active" : ""} onMouseEnter={() => setActive(index)} onClick={() => run(item)}>
								{item.spiral ? <MaxionSpiralMark className="mxp-command-spiral" /> : Icon ? <Icon size={16} /> : <span className="mxp-command-dot" aria-hidden="true" />}
								<span><strong>{item.label}</strong><small>{item.hint}</small></span>
								<i>{item.group}</i>
								{item.current ? <Check size={14} /> : <CaretRight size={13} />}
							</button>
						)
					})}
					{filtered.length === 0 ? <p className="mxp-command-empty">Nothing in MAXION matches “{query}”.</p> : null}
				</div>
				<footer className="mxp-command-footer"><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></footer>
			</motion.section>
		</div>
	)
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
	// Lifted module state: the nav badge and the jump registry both read live attention,
	// and the seed matches what Agentix reports on mount (two open boundaries).
	const [agentixAttention, setAgentixAttention] = useState<AgentixAttention>({ count: 2, audience: true, approval: true })
	// One-shot cross-module intents. Each carries a tick so the receiving module consumes it
	// exactly once — re-entering a module never replays an old jump.
	const [planJump, setPlanJump] = useState<PlanJumpSignal | null>(null)
	const [executeJump, setExecuteJump] = useState<ExecuteJumpSignal | null>(null)
	const [discoveryOpen, setDiscoveryOpen] = useState<DiscoveryOpenSignal | null>(null)
	const [agentixIntent, setAgentixIntent] = useState<AgentixIntentSignal | null>(null)
	const jumpTickRef = useRef(0)

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// Module palettes stop ⌘K in the capture phase, so this bubble-phase listener
			// only ever runs when no module owns the keyboard.
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen((open) => !open) }
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
	const nextJumpTick = () => { jumpTickRef.current += 1; return jumpTickRef.current }
	const openPlanArtifact = (artifactId: string) => { setPlanJump({ tick: nextJumpTick(), artifactId }); navigate("plan") }
	const openExecuteWorkspace = (taskId: ExecuteWorkspaceId) => { setExecuteJump({ tick: nextJumpTick(), target: { kind: "workspace", taskId } }); navigate("execute") }
	const openExecuteHub = (target: "approvals" | "engagements") => { setExecuteJump({ tick: nextJumpTick(), target: { kind: target } }); navigate("execute") }
	const openDiscoveryRecord = (recordId: string, jump: DiscoveryJump) => { setDiscoveryOpen({ tick: nextJumpTick(), recordId, jump }); navigate("discovery") }
	const openAgentix = (intent: AgentixIntent) => { setAgentixIntent({ tick: nextJumpTick(), intent }); navigate("agentix") }
	// Saved discoveries live in localStorage, so the registry reads them when the menu opens.
	const commandContext: ShellCommandContext = {
		active: activeModule,
		agentix: agentixAttention,
		discoveries: commandOpen ? listDiscoveryJumpRecords() : [],
		navigate,
		startDiscovery: startDiscoverySetup,
		openPlanArtifact,
		openExecuteWorkspace,
		openExecuteHub,
		openDiscoveryRecord,
		openAgentix,
	}
	// The entrance animation belongs to the stage that just became visible; `hidden`
	// semantics stay untouched because every module keeps its state and keyboard gate.
	const stageClass = (module: MaxionModuleId, modifier = "") => `mxp-stage-view${modifier ? ` ${modifier}` : ""}${activeModule === module ? " is-entering" : ""}`
	const currentLabel = PRIMARY_NAVIGATION.find((item) => item.id === activeModule)?.label ??
		({ settings: "Settings", integrations: "Integrations", approvals: "My approvals", usage: "Usage", help: "Help" } as const)[activeModule as "settings" | "integrations" | "approvals" | "usage" | "help"] ??
		"MAXION"

	return (
		<div className={`maxion-platform-prototype mxp-root${activeModule === "execute" ? " mxp-root--execute" : ""}${sidebarCollapsed ? " mxp-root--sidebar-collapsed" : ""}`}>
			<PortalSidebar active={activeModule} onNavigate={navigate} onCommand={() => setCommandOpen(true)} mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} badges={{ agentix: agentixAttention.count }} />
			<div className="mxp-stage" aria-label={`${currentLabel} module`}>
				<div className={stageClass("dashboard")} hidden={activeModule !== "dashboard"}><DashboardModule projects={projects} onNavigate={navigate} discoveryReady={discoveryReady} planSent={planSent} executeVerified={executeVerified} /></div>
				<div className={stageClass("projects")} hidden={activeModule !== "projects"}><ProjectsModule projects={projects} onProjectsChange={setProjects} onNavigate={navigate} /></div>
				<div className={stageClass("discovery", "mxp-stage-view--discovery")} hidden={activeModule !== "discovery"}><DiscoveryAutonomousPrototypePage embedded setupSignal={discoverySetupSignal} openSignal={discoveryOpen} onPackageReady={() => setDiscoveryReady(true)} /></div>
				<div className={stageClass("plan")} hidden={activeModule !== "plan"}><PlanModule projects={projects} onNavigate={navigate} onCommand={() => setCommandOpen(true)} jumpSignal={planJump} onSendToExecute={(snapshot) => { setPlanSent(true); setPlanSnapshot(snapshot); navigate("execute") }} /></div>
				<div className={stageClass("execute", "mxp-stage-view--execute")} hidden={activeModule !== "execute"}><ExecuteModule active={activeModule === "execute"} onNavigate={navigate} planHandoff={planSent} planSnapshot={planSnapshot} jumpSignal={executeJump} onVerified={() => setExecuteVerified(true)} /></div>
				<div className={stageClass("agentix")} hidden={activeModule !== "agentix"}><AgentixPrototypePage embedded intentSignal={agentixIntent} onAttentionChange={setAgentixAttention} /></div>
				<div className={stageClass("consult")} hidden={activeModule !== "consult"}><ConsultModule onCommand={() => setCommandOpen(true)} onNavigate={navigate} /></div>
				<div className={stageClass("integrations")} hidden={activeModule !== "integrations"}><IntegrationsModule /></div>
				{(["settings", "approvals", "usage", "help"] as const).map((module) => <div key={module} className={stageClass(module)} hidden={activeModule !== module}><AccountUtilityModule module={module} onNavigate={navigate} /></div>)}
			</div>
			<AnimatePresence>{commandOpen ? <CommandMenu context={commandContext} onClose={() => setCommandOpen(false)} /> : null}</AnimatePresence>
		</div>
	)
}
