import {
	ArrowRight,
	Bell,
	CaretRight,
	ChatCircleText,
	Check,
	Clock,
	Compass,
	Cube,
	Database,
	FileText,
	FlowArrow,
	Lightning,
	MagnifyingGlass,
	Paperclip,
	Plus,
	ShieldCheck,
	Pulse,
	SpinnerGap,
	Stack,
	Tray,
} from "@phosphor-icons/react"
import { motion } from "motion/react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { useLocation } from "react-router-dom"

import { useDocumentTitle } from "@/app/hooks/useDocumentTitle"
import { WORKFLOWS, type WorkflowId } from "@/features/agentix/prototype/initiatives"
import {
	type DiscoveryJump,
	type DiscoveryJumpRecord,
} from "@/features/discovery-autonomous/DiscoverWorkspace"

import { PLAN_JUMP_ENTRIES, PlanModule } from "./PlanAgenticModule"
import { DashboardModule } from "./DashboardModule"
import { ExecuteDeliveryWorkspace } from "./ExecuteDeliveryWorkspace"
import { ADMINISTRATION_NAVIGATION, MaxionSpiralMark, PortalSidebar, PRODUCT_NAVIGATION } from "./PortalChrome"
import { PlatformDemoProvider, usePlatformDispatch, usePlatformSelector } from "./PlatformDemoProvider"
import { ModuleErrorBoundary } from "./ModuleErrorBoundary"
import {
	AccountUtilityModule,
	IntegrationsModule,
} from "./PortalReplicaModules"
import { ProjectsModule } from "./ProjectsModule"
import type { AgentixAttention, AgentixIntent, MaxionModuleId, PlanArtifactRef, PortalProject } from "./contracts"
import type { AgentixModuleProps } from "./modules/AgentixModule"
import type { DiscoveryModuleProps } from "./modules/DiscoveryModule"
import {
	selectActiveModule,
	selectAgentixAttention,
	selectDiscoveryReady,
	selectDiscoveryPackage,
	selectExecuteVerified,
	selectPersistenceNotice,
	selectPlanHandoff,
	selectPlatformIntents,
	selectProjects,
	selectSelectedProject,
	selectSidebarCollapsed,
	selectVisitedModules,
} from "./platformState"
import { DeferredModule } from "./system/DeferredModule"
import "./maxion-platform-prototype.css"
import "./portal-replica.css"
import "./execute-agentic.css"
import "./platform-design-contract.css"

const loadAgentixModule = () => import("./modules/AgentixModule")
const loadDiscoveryModule = () => import("./modules/DiscoveryModule")

function MaxionMark({ size = 30 }: { size?: number }) {
	return <span className="mxp-mark" style={{ width: size, height: size }} aria-hidden="true"><MaxionSpiralMark className="mxp-mark-spiral" /></span>
}

// Header notifications are the shell's open boundaries, not a decoration: the bell carries
// the same count the sidebar does and routes to the surface that owns each decision.
type HeaderAlert = { id: string; title: string; detail: string; onOpen: () => void }

function ModuleHeader({ label, title, detail, onCommand, actions, alerts = [] }: { label: string; title: string; detail?: string; onCommand: () => void; actions?: ReactNode; alerts?: HeaderAlert[] }) {
	const [alertsOpen, setAlertsOpen] = useState(false)
	return (
		<header className="mxp-module-header">
			<div><span>{label}</span><strong>{title}</strong>{detail ? <small>{detail}</small> : null}</div>
			<div className="mxp-header-actions">
				<button type="button" className="mxp-search" aria-label="Search MAXION" onClick={onCommand}><MagnifyingGlass size={15} /><span>Search or ask</span><kbd>⌘K</kbd></button>
				{actions}
				<div className="mxp-header-bell" onKeyDown={(event) => { if (event.key === "Escape" && alertsOpen) setAlertsOpen(false) }}>
					<button type="button" aria-label={alerts.length ? `Notifications · ${alerts.length} waiting` : "Notifications"} aria-expanded={alertsOpen} onClick={() => setAlertsOpen((open) => !open)}><Bell size={16} />{alerts.length ? <b aria-hidden="true">{alerts.length}</b> : null}</button>
					{alertsOpen ? (
						<>
							<button type="button" className="mxp-bell-scrim" aria-label="Close notifications" onClick={() => setAlertsOpen(false)} />
							<div className="mxp-bell-menu" role="group" aria-label="Open boundaries">
								{alerts.length
									? alerts.map((alert) => <button type="button" key={alert.id} onClick={() => { setAlertsOpen(false); alert.onOpen() }}><span><strong>{alert.title}</strong><small>{alert.detail}</small></span><CaretRight size={12} /></button>)
									: <p>Nothing needs you right now. MAX is inside its authority everywhere.</p>}
							</div>
						</>
					) : null}
				</div>
			</div>
		</header>
	)
}

function ContextRail({ title, kicker, children, footer }: { title: string; kicker?: string; children: ReactNode; footer?: ReactNode }) {
	return <aside className="mxp-context-rail"><div className="mxp-context-brand"><MaxionMark size={27} /><div><strong>{title}</strong>{kicker ? <small>{kicker}</small> : null}</div></div><div className="mxp-context-body">{children}</div><div className="mxp-context-footer">{footer}</div></aside>
}

function ExecuteModule({
	planArtifact,
	projectRole,
	onVerified,
	onNavigate,
	onCommand,
}: {
	planArtifact: PlanArtifactRef | null
	projectRole: PortalProject["role"] | undefined
	onVerified: () => void
	onNavigate: (module: MaxionModuleId) => void
	onCommand: () => void
}) {
	return (
		<div className="exw-module">
			<ExecuteDeliveryWorkspace
				key={planArtifact?.id ?? "execute-empty"}
				onBack={() => onNavigate("dashboard")}
				onPlatform={() => onNavigate("dashboard")}
				onPlan={() => onNavigate("plan")}
				onCommand={onCommand}
				planArtifact={planArtifact}
				role={projectRole === "Owner" ? "owner" : projectRole === "Member" ? "member" : "viewer"}
				onVerified={onVerified}
			/>
		</div>
	)
}

function prefersReducedMotion() {
	return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function useStreamedText(text: string, active: boolean) {
	const [count, setCount] = useState(active && !prefersReducedMotion() ? 0 : Number.MAX_SAFE_INTEGER)
	useEffect(() => {
		if (!active || prefersReducedMotion()) { setCount(Number.MAX_SAFE_INTEGER); return }
		setCount(0)
		const total = text.split(" ").length
		const timer = window.setInterval(() => setCount((current) => {
			if (current >= total) { window.clearInterval(timer); return current }
			return current + 1
		}), 26)
		return () => window.clearInterval(timer)
	}, [text, active])
	const words = text.split(" ")
	return !active || count >= words.length ? text : words.slice(0, count).join(" ")
}

function StreamedText({ text }: { text: string }) {
	return <>{useStreamedText(text, true)}</>
}

// Consult reads the same lifted state the badges and the command registry read, so an
// answer cannot survive the decision it describes.
type ConsultShellState = {
	agentix: AgentixAttention
	discoveryReady: boolean
	planSent: boolean
	planSnapshot: string
	executeVerified: boolean
}

type ConsultMessage = { actor: "MAX" | "You"; text: string; stream?: boolean }
type ConsultThread = { id: string; title: string; time: string; messages: ConsultMessage[] }

const CONSULT_GREETING = "I can answer across the authorized MAXION context—Discovery evidence, Plan decisions, Execute state, and Agentix outcomes. What do you need to understand or decide?"
const CONSULT_NEW_THREAD = "New conversation"

function consultDeliveryLine(state: ConsultShellState) {
	if (state.executeVerified) return `Execute verified the ERP engagement against evidence snapshot ${state.planSnapshot}; only the release owner's approval is outstanding.`
	if (state.planSent) return `The ERP delivery plan is in Execute at evidence snapshot ${state.planSnapshot}, progressing inside its isolated worktree.`
	return "The ERP delivery plan is decision-ready; Execute has not been given the work yet."
}

function consultAttentionAnswer(state: ConsultShellState) {
	const open: string[] = []
	if (state.agentix.approval) open.push("the $240 invoice-variance approval in Agentix")
	if (state.agentix.audience) open.push("the payroll-owner fulfillment in Agentix")
	if (!state.discoveryReady) open.push("the external-counsel authority boundary in Discovery")
	const delivery = consultDeliveryLine(state)
	if (open.length === 0) return `Nothing is waiting on your authority right now. ${delivery} I can still walk any decision back to the evidence it was made on.`
	const list = open.length === 1 ? open[0] : `${open.slice(0, -1).join(", ")} and ${open[open.length - 1]}`
	const lead = open.length === 1 ? "One thing needs" : `${open.length === 2 ? "Two" : "Three"} things need`
	return `${lead} attention: ${list}. ${delivery} I can open ${open.length === 1 ? "it" : "any of them"} without changing its authority.`
}

// Four routes over the live state. The default stays attention-shaped, because that is what
// an unqualified question to a cross-platform agent is actually asking.
function consultAnswer(message: string, state: ConsultShellState) {
	const text = message.toLowerCase()
	if (/\b(discovery|discover|evidence|interview|claim|source|research|tprm)\b/.test(text)) {
		return state.discoveryReady
			? "Discovery closed its package: five deliverables, every claim still naming the source it came from, and the external-counsel boundary decided rather than assumed. Nothing in it was written past the evidence."
			: "Discovery is mid-interview on the third-party onboarding redesign. One authority boundary is still yours — whether MAX may interview external counsel — so the package is not evidence-complete yet. The internal path stays open either way."
	}
	if (/\b(plan|architecture|flow|decompose|design|blueprint|l2|l3|l4)\b/.test(text)) {
		return state.planSent
			? `The ERP modernization plan is decided and handed to Execute at snapshot ${state.planSnapshot}: five flows through L2–L4, three conflicts resolved, two owners interviewed. Any change from here reopens the approval routing.`
			: "The ERP modernization plan is decision-ready: five flows decomposed through L2–L4, three conflicts resolved, two owners interviewed. The implementation boundary is approved, so it can move to Execute whenever you send it."
	}
	if (/\b(execute|build|implement|test|deploy|release|workspace|worktree|ship)\b/.test(text)) {
		if (state.executeVerified) return "Execute finished the ERP engagement: 48 tests passed, the cumulative gate is clean, and the release is held at the release owner's approval. Deployment was never granted to the agent, so nothing left the worktree."
		return state.planSent
			? "Execute is holding the ERP plan across five isolated workspaces. Its authority is files, terminal, and tests only — deployment is not granted, and the cumulative gate has not been run yet."
			: "Execute has no ERP engagement yet; the plan is approved but has not been sent. Whenever it is, the authority stays files, terminal, and tests — deployment is a separate decision."
	}
	if (/\b(agent|agentix|close|approval|approve|effect|effects|finance|quickbooks|sap|reminder|reminders)\b/.test(text)) {
		if (state.agentix.approval) return "The deployed invoice agent has one case waiting for the AP owner to decide a $240 price variance on invoice v2. Its other cases continue independently. No ERP resolution is posted for this case until that exact decision is made. All effects in this demo are simulated."
		return state.agentix.audience
			? "The onboarding initiative is waiting for the payroll owner’s fulfillment reference. HR and IT results are preserved. Agentix cannot provision payroll access through the current connection and does not assume a broader permission."
			: "Agentix shows four agent responsibilities: incident triage with one agent, and invoice exceptions, employee onboarding and inventory replenishment with coordinated teams. Deployed agents accept ongoing work; each case or scheduled cycle has its own outcome. Discovery supplies a design, readiness is checked before activation, and conversation is for steering. An empty approval queue is not proof of completion."
	}
	return consultAttentionAnswer(state)
}

function ConsultModule({ state, onCommand, onNavigate }: { state: ConsultShellState; onCommand: () => void; onNavigate: (module: MaxionModuleId) => void }) {
	const [input, setInput] = useState("")
	const [threads, setThreads] = useState<ConsultThread[]>(() => [
		{ id: "attention", title: "What needs my attention?", time: "Just now", messages: [{ actor: "MAX", text: CONSULT_GREETING }] },
		{
			id: "erp-history",
			title: "ERP decision history",
			time: "Yesterday",
			messages: [
				{ actor: "MAX", text: CONSULT_GREETING },
				{ actor: "You", text: "Why did the ERP plan choose atomic posting for Workday journal batches?" },
				{ actor: "MAX", text: "Because a partially posted batch cannot be reconciled against the approved effects. Priya Shah accepted atomic posting on the finance boundary, and the plan records that decision against CLM-021 and the ServiceNow-to-Workday flow. MAX recommended it; it did not decide it." },
			],
		},
	])
	const [activeThreadId, setActiveThreadId] = useState("attention")
	const [thinking, setThinking] = useState(false)
	const [scope, setScope] = useState<"all" | "project">("all")
	const timersRef = useRef<number[]>([])
	useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), [])
	const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0]
	const append = (threadId: string, message: ConsultMessage, title?: string) => setThreads((items) => items.map((thread) => thread.id === threadId ? { ...thread, title: title ?? thread.title, time: "Just now", messages: [...thread.messages, message] } : thread))
	const submit = () => {
		const value = input.trim()
		if (!value) return
		const threadId = activeThread.id
		const reply = `${consultAnswer(value, state)}${scope === "project" ? " Answered inside the ERP modernization project only — nothing outside it was read." : ""}`
		append(threadId, { actor: "You", text: value }, activeThread.title === CONSULT_NEW_THREAD ? (value.length > 46 ? `${value.slice(0, 46)}…` : value) : undefined)
		setInput("")
		// Reduced motion answers in the same tick — no thinking beat, no streaming.
		if (prefersReducedMotion()) { append(threadId, { actor: "MAX", text: reply }); return }
		setThinking(true)
		timersRef.current.push(window.setTimeout(() => { setThinking(false); append(threadId, { actor: "MAX", text: reply, stream: true }) }, 620))
	}
	const startThread = () => {
		const id = `thread-${Date.now()}`
		setThreads((items) => [{ id, title: CONSULT_NEW_THREAD, time: "Just now", messages: [{ actor: "MAX", text: CONSULT_GREETING }] }, ...items])
		setActiveThreadId(id)
		setInput("")
		setThinking(false)
	}
	const alerts: HeaderAlert[] = []
	if (state.agentix.approval) alerts.push({ id: "approval", title: "Invoice variance needs a decision", detail: "Agentix · $240 · invoice v2", onOpen: () => onNavigate("agentix") })
	if (state.agentix.audience) alerts.push({ id: "audience", title: "Onboarding needs human fulfillment", detail: "Agentix · payroll owner confirmation", onOpen: () => onNavigate("agentix") })
	if (!state.discoveryReady) alerts.push({ id: "discovery", title: "An external interview needs your approval", detail: "Discover · third-party onboarding redesign", onOpen: () => onNavigate("discovery") })
	if (state.executeVerified) alerts.push({ id: "release", title: "A release is waiting on its owner", detail: "Execute · cumulative gate passed", onOpen: () => onNavigate("execute") })
	return <div className="mxp-consult mxp-module-with-rail"><ContextRail title="Consult MAX" kicker="Cross-platform intelligence" footer={<div className="mxp-rail-user"><span>RA</span><div><strong>Root Admin</strong><small>Authorized tenant context</small></div></div>}><button type="button" className="mxp-rail-primary" onClick={startThread}><Plus size={14} />New conversation</button><div className="mxp-rail-label">Recent</div>{threads.map((thread) => <button type="button" key={thread.id} className={thread.id === activeThread.id ? "is-active" : ""} aria-current={thread.id === activeThread.id ? "true" : undefined} onClick={() => { setActiveThreadId(thread.id); setThinking(false) }}><ChatCircleText size={15} /><span><strong>{thread.title}</strong><small>{thread.time}</small></span></button>)}<div className="mxp-rail-label">Scope</div><button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}><Database size={15} /><span>All MAXION context</span>{scope === "all" ? <i className="mxp-success-dot" /> : null}</button><button type="button" aria-pressed={scope === "project"} onClick={() => setScope("project")}><Stack size={15} /><span>ERP modernization only</span>{scope === "project" ? <i className="mxp-success-dot" /> : null}</button></ContextRail><div className="mxp-module-area"><ModuleHeader label="Consult MAX" title="Cross-platform conversation" detail="Answers preserve source, ownership, and authority" onCommand={onCommand} alerts={alerts} /><main className="mxp-consult-main"><header><MaxionMark size={34} /><span>Consult MAX</span><h1>Ask across the work, not around it.</h1><p>Consult MAX explains the current truth across modules. It can route you to work, but it cannot silently approve or execute it.</p></header><div className="mxp-consult-thread">{activeThread.messages.map((message, index) => <article key={`${activeThread.id}-${message.actor}-${index}`} className={message.actor === "You" ? "is-user" : "is-max"}>{message.actor === "MAX" ? <MaxionMark size={27} /> : <span className="mxp-user-avatar">RA</span>}<div><span>{message.actor}<time>Now</time></span><p>{message.stream ? <StreamedText text={message.text} /> : message.text}</p>{message.actor === "MAX" && index > 0 ? <div className="mxp-answer-actions">{state.agentix.approval ? <button type="button" onClick={() => onNavigate("agentix")}><Pulse size={13} />Open Agentix approval</button> : <button type="button" onClick={() => onNavigate("agentix")}><Pulse size={13} />Open Agentix activity</button>}{state.planSent ? <button type="button" onClick={() => onNavigate("execute")}><Cube size={13} />Open the Execute engagement</button> : <button type="button" onClick={() => onNavigate("plan")}><FlowArrow size={13} />Open the ERP plan</button>}{state.discoveryReady ? null : <button type="button" onClick={() => onNavigate("discovery")}><MagnifyingGlass size={13} />Open Discovery boundary</button>}</div> : null}</div></article>)}{thinking ? <article className="is-max mxp-consult-thinking"><MaxionMark size={27} /><div><span>MAX<time>Now</time></span><p><SpinnerGap className="mxp-spin" size={12} />Reading the live workspace…</p></div></article> : null}</div></main><div className="mxp-consult-composer"><div><textarea aria-label="Message Consult MAX" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder="Ask what changed, what needs attention, or why a decision was made…" rows={1} /><div><span><button type="button" aria-label="Attach context"><Paperclip size={15} /></button><small><Database size={13} />{scope === "all" ? "All authorized MAXION context" : "ERP modernization project only"}</small></span><button type="button" aria-label="Send to Consult MAX" disabled={!input.trim()} onClick={submit}><ArrowRight size={15} /></button></div></div></div></div></div>
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

type CommandCloseReason = "dismiss" | "action"

const COMMAND_FOCUSABLE_SELECTOR = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"

type ShellCommandContext = {
	active: MaxionModuleId
	agentix: AgentixAttention
	discoveries: DiscoveryJumpRecord[]
	navigate: (module: MaxionModuleId) => void
	startDiscovery: () => void
	openPlanArtifact: (artifactId: string) => void
	openDiscoveryRecord: (recordId: string, jump: DiscoveryJump) => void
	openAgentix: (intent: AgentixIntent) => void
}

function buildShellCommandItems(context: ShellCommandContext): ShellCommandItem[] {
	const items: ShellCommandItem[] = []
	// Open boundaries lead the list, and disappear from it the moment they are resolved.
	if (context.agentix.approval) items.push({ id: "decision-approval", group: "Decisions", label: "Review invoice variance", hint: "Agentix · $240 price variance · invoice v2", keywords: "approval approve invoice variance finance agentix", icon: ShieldCheck, run: () => context.openAgentix({ type: "decision", id: "approval" }) })
	if (context.agentix.audience) items.push({ id: "decision-audience", group: "Decisions", label: "Review onboarding fulfillment", hint: "Agentix · payroll owner confirmation needed", keywords: "onboarding payroll human fulfillment agentix", icon: ChatCircleText, run: () => context.openAgentix({ type: "decision", id: "audience" }) })
	for (const record of context.discoveries) {
		if (record.status !== "needs-input") continue
		items.push({ id: `discovery-decision-${record.id}`, group: "Decisions", label: `Review decision · ${record.title}`, hint: "Discover · a bounded decision is waiting", keywords: `discovery decision approve boundary ${record.keywords}`, icon: Compass, run: () => context.openDiscoveryRecord(record.id, "decision") })
	}

	for (const item of [...PRODUCT_NAVIGATION, ...ADMINISTRATION_NAVIGATION]) {
		const spiral = "spiral" in item && Boolean(item.spiral)
		const hint = item.id === context.active
			? "Current module"
			: item.id === "agentix" && context.agentix.count
				? `${context.agentix.count} decision${context.agentix.count === 1 ? "" : "s"} waiting`
				: item.id === "consult" ? "Ask across MAXION" : `Open ${item.label}`
		items.push({ id: `go-${item.id}`, group: "Go to", label: item.label, hint, keywords: `module navigate open ${item.label}`, icon: item.icon, spiral, current: item.id === context.active, run: () => context.navigate(item.id) })
	}

	items.push({ id: "action-discovery", group: "Actions", label: "Start a Discovery", hint: "Autonomous research and interviews", keywords: "new discovery start research interviews brief mission", icon: Plus, run: context.startDiscovery })
	items.push({ id: "action-agent", group: "Actions", label: "New Agentix agent", hint: "Describe an outcome or start from Discovery", keywords: "new agent create activate operational autonomy agentix", icon: Lightning, run: () => context.openAgentix({ type: "create" }) })

	for (const record of context.discoveries) {
		items.push({ id: `discovery-resume-${record.id}`, group: "Discover", label: `Resume ${record.title}`, hint: record.statusLabel, keywords: `discovery resume open continue ${record.keywords}`, icon: Compass, run: () => context.openDiscoveryRecord(record.id, "resume") })
		if (record.status === "completed") items.push({ id: `discovery-package-${record.id}`, group: "Discover", label: `Open package · ${record.title}`, hint: "Deliverables and routing", keywords: `discovery package deliverables outputs ${record.keywords}`, icon: FileText, run: () => context.openDiscoveryRecord(record.id, "package") })
	}

	for (const workflow of WORKFLOWS) {
		items.push({ id: `agentix-agent-${workflow.id}`, group: "Agentix", label: `Open ${workflow.title}`, hint: `${workflow.team.length} agents · ${workflow.category}`, keywords: `agentix initiative ${workflow.title} ${workflow.category}`, icon: Pulse, run: () => context.openAgentix({ type: "workflow", id: workflow.id }) })
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

function CommandMenu({ context, onClose, onAfterClose }: { context: ShellCommandContext; onClose: (reason: CommandCloseReason) => void; onAfterClose: () => void }) {
	const [query, setQuery] = useState("")
	const [active, setActive] = useState(0)
	const dialogRef = useRef<HTMLElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
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
	useLayoutEffect(() => {
		inputRef.current?.focus()
		return onAfterClose
	}, [onAfterClose])
	const run = (item: ShellCommandItem) => {
		// Mark the close before a command mutates navigation state. Some commands close
		// the menu as part of navigation, and cleanup must already know this is an action.
		onClose("action")
		item.run()
	}
	return (
		<div
			className="mxp-command-layer"
			onMouseDown={(event) => { if (event.currentTarget === event.target) { event.preventDefault(); onClose("dismiss") } }}
			onKeyDown={(event) => {
				if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose("dismiss"); return }
				if (event.key !== "Tab") return
				const dialog = dialogRef.current
				if (!dialog) return
				const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(COMMAND_FOCUSABLE_SELECTOR)).filter((element) => element.getClientRects().length > 0)
				if (focusable.length === 0) { event.preventDefault(); dialog.focus(); return }
				const first = focusable[0]
				const last = focusable[focusable.length - 1]
				if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus() }
				else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
				else if (!(document.activeElement instanceof HTMLElement) || !dialog.contains(document.activeElement)) { event.preventDefault(); first.focus() }
			}}
		>
			<motion.section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="MAXION command menu" initial={prefersReducedMotion() ? false : { opacity: 0, scale: 0.98, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}>
				<div className="mxp-command-search">
					<MagnifyingGlass size={16} />
					<input
						ref={inputRef}
						value={query}
						aria-label="Search MAXION commands"
						placeholder="Search modules, work, and actions…"
						onChange={(event) => { setQuery(event.target.value); setActive(0) }}
						onKeyDown={(event) => {
							if (event.key === "ArrowDown") { event.preventDefault(); setActive(Math.min(activeIndex + 1, filtered.length - 1)) }
							if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(activeIndex - 1, 0)) }
							if (event.key === "Enter" && filtered[activeIndex]) { event.preventDefault(); run(filtered[activeIndex]) }
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

// Shell pages own no keyboard of their own; the modules do. These are the surfaces where
// '/' is unclaimed, so the shell may map it to the one search the whole platform shares.
const SHELL_KEYBOARD_MODULES: MaxionModuleId[] = ["dashboard", "projects", "consult", "integrations", "settings", "approvals", "usage", "help"]

function canReceiveMeaningfulFocus(element: HTMLElement | null): element is HTMLElement {
	if (!element || element === document.body || element === document.documentElement || !element.isConnected) return false
	if (element.matches(":disabled") || element.closest("[hidden], [inert], [aria-hidden='true']")) return false
	const style = window.getComputedStyle(element)
	return style.display !== "none" && style.visibility !== "hidden"
}

function isMobileShell() {
	return window.matchMedia("(max-width: 860px)").matches
}

export function MaxionPlatformPrototypePage() {
	const location = useLocation()
	const initialModule: MaxionModuleId = location.pathname.includes("agentix") ? "agentix" : "dashboard"
	return <PlatformDemoProvider activeModule={initialModule}><MaxionPlatformPrototype /></PlatformDemoProvider>
}

function MaxionPlatformPrototype() {
	useDocumentTitle("MAXION · Unified platform prototype")
	const dispatch = usePlatformDispatch()
	const activeModule = usePlatformSelector(selectActiveModule)
	const sidebarCollapsed = usePlatformSelector(selectSidebarCollapsed)
	const visitedModules = usePlatformSelector(selectVisitedModules)
	const projects = usePlatformSelector(selectProjects)
	const selectedProject = usePlatformSelector(selectSelectedProject)
	const discoveryReady = usePlatformSelector(selectDiscoveryReady)
	const discoveryPackage = usePlatformSelector(selectDiscoveryPackage)
	const planHandoff = usePlatformSelector(selectPlanHandoff)
	const executeVerified = usePlatformSelector(selectExecuteVerified)
	const agentixAttention = usePlatformSelector(selectAgentixAttention)
	const intents = usePlatformSelector(selectPlatformIntents)
	const persistenceNotice = usePlatformSelector(selectPersistenceNotice)
	const [commandOpen, setCommandOpen] = useState(false)
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const [keyboardNavigation, setKeyboardNavigation] = useState(false)
	const [discoveryJumpRecords, setDiscoveryJumpRecords] = useState<DiscoveryJumpRecord[]>([])
	const setSidebarCollapsed = useCallback((collapsed: boolean) => dispatch({ type: "navigation/sidebar-collapsed", collapsed }), [dispatch])
	const setAgentixAttention = useCallback((attention: AgentixAttention) => dispatch({ type: "agentix/attention-changed", attention }), [dispatch])
	const { discoverySetupSignal, operationalDiscovery, planJump, discoveryOpen, agentixIntent } = intents
	const planArtifactRef = planHandoff.artifactRef
	const planSent = planArtifactRef !== null
	const planSnapshot = planArtifactRef ? `v${planArtifactRef.artifactVersion}` : "unapproved"
	// The shell keyboard reads the current module without re-subscribing the listener.
	const activeModuleRef = useRef(activeModule)
	activeModuleRef.current = activeModule
	// What the sidebar looked like before Execute borrowed the width, so leaving Execute
	// gives the viewer their own navigation back instead of an icon rail for good.
	const collapsedBeforeExecuteRef = useRef(sidebarCollapsed)
	const commandOpenRef = useRef(commandOpen)
	const commandOpenerRef = useRef<HTMLElement | null>(null)
	const restoreCommandFocusRef = useRef(false)
	const commandCloseReasonRef = useRef<CommandCloseReason>("dismiss")
	const pendingNavigationFocusRef = useRef<MaxionModuleId | null>(null)
	commandOpenRef.current = commandOpen

	const openCommand = useCallback(() => {
		if (!commandOpenRef.current && document.activeElement instanceof HTMLElement) {
			const activeElement = document.activeElement
			commandOpenerRef.current = activeElement === document.body || activeElement === document.documentElement ? null : activeElement
		}
		restoreCommandFocusRef.current = true
		commandCloseReasonRef.current = "dismiss"
		setMobileNavOpen(false)
		setCommandOpen(true)
		void import("@/features/discovery-autonomous/DiscoverWorkspace").then(
			({ listDiscoveryJumpRecords }) => setDiscoveryJumpRecords(listDiscoveryJumpRecords(selectedProject?.id)),
			() => setDiscoveryJumpRecords([]),
		)
	}, [selectedProject?.id])
	const restoreCommandFocus = useCallback(() => {
		window.requestAnimationFrame(() => {
			if (commandOpenRef.current || !restoreCommandFocusRef.current) return
			const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
			// Commands may establish a more useful destination focus (for example, a new
			// Discovery brief). Never overwrite that intentional hand-off.
			const actionEstablishedFocus = commandCloseReasonRef.current === "action"
				&& canReceiveMeaningfulFocus(activeElement)
				&& !activeElement.closest(".mxp-command-layer")
			if (!actionEstablishedFocus) {
				const currentDestination = document.querySelector<HTMLElement>('.mxp-portal-sidebar button[aria-current="page"]')
				const mobileTrigger = document.querySelector<HTMLElement>(".mxp-mobile-nav-trigger")
				const opener = commandOpenerRef.current
				const fallback = commandCloseReasonRef.current === "dismiss" && canReceiveMeaningfulFocus(opener)
					? opener
					: isMobileShell() && canReceiveMeaningfulFocus(mobileTrigger)
						? mobileTrigger
					: canReceiveMeaningfulFocus(currentDestination)
					? currentDestination
					: canReceiveMeaningfulFocus(mobileTrigger)
						? mobileTrigger
						: document.querySelector<HTMLElement>(".mxp-stage")
				if (canReceiveMeaningfulFocus(fallback)) fallback.focus()
			}
			commandOpenerRef.current = null
			restoreCommandFocusRef.current = false
			commandCloseReasonRef.current = "dismiss"
		})
	}, [])
	const closeCommand = useCallback((reason: CommandCloseReason = "dismiss") => {
		commandCloseReasonRef.current = reason
		setCommandOpen(false)
	}, [])
	const setMobileNavigationOpen = useCallback((open: boolean) => {
		setMobileNavOpen(open)
		if (open) return
		window.requestAnimationFrame(() => {
			if (commandOpenRef.current) return
			const trigger = document.querySelector<HTMLElement>(".mxp-mobile-nav-trigger")
			// This callback can only come from the mobile drawer. CSS makes the trigger
			// visible in that mode after close; jsdom has no media-query layout engine.
			if (trigger?.isConnected && !trigger.closest("[hidden], [inert], [aria-hidden='true']")) trigger.focus()
		})
	}, [])
	// The shell is the only owner of background isolation. Drawer and command-dialog
	// keyboard effects never restore these attributes, so one overlay cannot undo the
	// other overlay's safety state during a drawer -> command transition.
	useLayoutEffect(() => {
		const sidebar = document.querySelector<HTMLElement>(".mxp-portal-sidebar")
		const stage = document.querySelector<HTMLElement>(".mxp-stage")
		const isolate = (element: HTMLElement | null, isolated: boolean) => {
			if (!element) return
			if (isolated) {
				element.setAttribute("inert", "")
				element.setAttribute("aria-hidden", "true")
			} else {
				element.removeAttribute("inert")
				element.removeAttribute("aria-hidden")
			}
		}
		isolate(sidebar, commandOpen)
		isolate(stage, commandOpen || mobileNavOpen)
	}, [commandOpen, mobileNavOpen])
	useEffect(() => () => {
		for (const element of document.querySelectorAll<HTMLElement>(".mxp-portal-sidebar, .mxp-stage")) {
			element.removeAttribute("inert")
			element.removeAttribute("aria-hidden")
		}
	}, [])
	useEffect(() => {
		const target = pendingNavigationFocusRef.current
		if (commandOpen || target === null || target !== activeModule) return
		const frame = window.requestAnimationFrame(() => {
			const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
			if (commandCloseReasonRef.current === "action" && canReceiveMeaningfulFocus(activeElement) && !activeElement.closest(".mxp-command-layer")) {
				pendingNavigationFocusRef.current = null
				return
			}
			const railDestination = document.querySelector<HTMLElement>(`.mxp-portal-sidebar button[data-navigation-id="${target}"]`)
			const mobileTrigger = document.querySelector<HTMLElement>(".mxp-mobile-nav-trigger")
			const stage = document.querySelector<HTMLElement>(".mxp-stage")
			const destination = isMobileShell() && canReceiveMeaningfulFocus(mobileTrigger)
				? mobileTrigger
				: canReceiveMeaningfulFocus(railDestination)
					? railDestination
					: canReceiveMeaningfulFocus(stage)
						? stage
						: null
			if (!destination) return
			destination.focus()
			// Do not consume a pending hand-off until the browser confirms focus. A
			// detached or CSS-hidden stale ref must remain retryable, never look done.
			if (document.activeElement === destination) pendingNavigationFocusRef.current = null
		})
		return () => window.cancelAnimationFrame(frame)
	}, [activeModule, commandOpen])

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null
			const targetIsEditable = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable))
			// Text inputs match :focus-visible after a pointer click in Chromium. Track
			// modality at the shell instead so composers stay quiet for pointer users
			// and retain a precise focus cue for keyboard navigation and shortcuts.
			if (event.key === "Tab" || !targetIsEditable) setKeyboardNavigation(true)
			// Module palettes stop ⌘K in the capture phase, so this bubble-phase listener
			// only ever runs when no module owns the keyboard.
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault()
				if (document.querySelector(".aop-drawer[open]")) return
				if (commandOpenRef.current) closeCommand()
				else openCommand()
			}
			if (event.key === "Escape" && commandOpenRef.current) closeCommand()
			// '/' belongs to whichever surface is visible. Inside a module the module's own
			// capture-phase listener claims it and stops it here; on a shell page nothing
			// claims it, so it opens the one search this shell has.
			if (event.key === "/" && SHELL_KEYBOARD_MODULES.includes(activeModuleRef.current)) {
				if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
				event.preventDefault()
				openCommand()
			}
		}
		const onPointerDown = () => setKeyboardNavigation(false)
		window.addEventListener("keydown", onKeyDown)
		window.addEventListener("pointerdown", onPointerDown, true)
		return () => {
			window.removeEventListener("keydown", onKeyDown)
			window.removeEventListener("pointerdown", onPointerDown, true)
		}
	}, [closeCommand, openCommand])

	const navigate = (module: MaxionModuleId) => {
		// Execute is a focused, long-running workspace. Keep MAXION navigation one
		// action away without taking meaningful width away from the work surface — and
		// hand the sidebar back exactly as it was when the viewer leaves again.
		if (module === "execute") {
			if (activeModuleRef.current !== "execute") collapsedBeforeExecuteRef.current = sidebarCollapsed
			setSidebarCollapsed(true)
		} else if (activeModuleRef.current === "execute") {
			setSidebarCollapsed(collapsedBeforeExecuteRef.current)
		}
		dispatch({ type: "navigation/opened", module })
		setCommandOpen(false)
		setMobileNavOpen(false)
	}
	const startDiscoverySetup = () => {
		dispatch({ type: "discovery/setup-started" })
		navigate("discovery")
	}
	const openPlanArtifact = (artifactId: string) => { dispatch({ type: "plan/artifact-opened", artifactId }); navigate("plan") }
	const openDiscoveryRecord = (recordId: string, jump: DiscoveryJump) => { dispatch({ type: "discovery/record-opened", recordId, jump }); navigate("discovery") }
	const openAgentix = (intent: AgentixIntent) => { dispatch({ type: "agentix/opened", intent }); navigate("agentix") }
	const openOperationalDiscovery = (id: WorkflowId) => { dispatch({ type: "discovery/operational-opened", workflowId: id }); navigate("discovery") }
	const commandContext: ShellCommandContext = {
		active: activeModule,
		agentix: agentixAttention,
		discoveries: commandOpen ? discoveryJumpRecords : [],
		navigate: (module) => {
			// Execute owns an explicit visible-arrival focus effect for its composer.
			// Other destinations need the shell's rail/trigger hand-off.
			pendingNavigationFocusRef.current = module === "execute" ? null : module
			navigate(module)
		},
		startDiscovery: startDiscoverySetup,
		openPlanArtifact,
		openDiscoveryRecord,
		openAgentix,
	}
	// The entrance animation belongs to the stage that just became visible; `hidden`
	// semantics stay untouched because every module keeps its state and keyboard gate.
	const stageClass = (module: MaxionModuleId, modifier = "") => `mxp-stage-view${modifier ? ` ${modifier}` : ""}${activeModule === module ? " is-entering" : ""}`
	const currentLabel = [...PRODUCT_NAVIGATION, ...ADMINISTRATION_NAVIGATION].find((item) => item.id === activeModule)?.label ??
		"MAXION"

	return (
		<div className={`maxion-platform-prototype mxp-root${activeModule === "execute" ? " mxp-root--execute" : ""}${activeModule === "agentix" ? " mxp-root--agentix" : ""}${sidebarCollapsed ? " mxp-root--sidebar-collapsed" : ""}${keyboardNavigation ? " mxp-keyboard-navigation" : ""}`}>
			{persistenceNotice ? <p className="mxp-persistence-notice" role="status">{persistenceNotice}<button type="button" onClick={() => dispatch({ type: "persistence/notice-cleared" })}>Dismiss</button></p> : null}
			<PortalSidebar active={activeModule} onNavigate={navigate} onCommand={openCommand} mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavigationOpen} collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} badges={{ agentix: agentixAttention.count, approvals: agentixAttention.approval ? 1 : 0, execute: executeVerified ? 0 : 1 }} />
			<div className="mxp-stage" role="region" aria-label={`${currentLabel} module`} tabIndex={-1}>
				{visitedModules.has("dashboard") ? <div className={stageClass("dashboard")} hidden={activeModule !== "dashboard"}><ModuleErrorBoundary moduleName="Dashboard" resetKey={activeModule} onReturnToDashboard={() => navigate("dashboard")}><DashboardModule onNavigate={navigate} onCommand={openCommand} /></ModuleErrorBoundary></div> : null}
				{visitedModules.has("projects") ? <div className={stageClass("projects")} hidden={activeModule !== "projects"}><ModuleErrorBoundary moduleName="Projects" resetKey={activeModule} onReturnToDashboard={() => navigate("dashboard")}><ProjectsModule onNavigate={navigate} /></ModuleErrorBoundary></div> : null}
				{visitedModules.has("discovery") ? <div className={stageClass("discovery", "mxp-stage-view--discovery")} hidden={activeModule !== "discovery"}><DeferredModule<DiscoveryModuleProps> load={loadDiscoveryModule} moduleName="Discover" onReturnToDashboard={() => navigate("dashboard")} moduleProps={{ setupSignal: discoverySetupSignal, openSignal: discoveryOpen, operationalDiscovery, onPackageReady: (packageRef) => { dispatch({ type: "discovery/package-ready", packageRef }); navigate("plan") }, onOpenOperationalDiscovery: openOperationalDiscovery, onCloseOperationalDiscovery: () => dispatch({ type: "discovery/operational-closed" }), onOpenAgentix: openAgentix }} /></div> : null}
				{visitedModules.has("plan") ? <div className={stageClass("plan")} hidden={activeModule !== "plan"}><ModuleErrorBoundary moduleName="Plan" resetKey={activeModule} onReturnToDashboard={() => navigate("dashboard")}><PlanModule projects={projects} discoveryPackage={discoveryPackage} onNavigate={navigate} jumpSignal={planJump} onSendToExecute={(artifactRef) => { dispatch({ type: "plan/approved", artifactRef }); navigate("execute") }} /></ModuleErrorBoundary></div> : null}
				{visitedModules.has("execute") ? <div className={stageClass("execute", "mxp-stage-view--execute")} hidden={activeModule !== "execute"}><ModuleErrorBoundary moduleName="Execute" resetKey={activeModule} onReturnToDashboard={() => navigate("dashboard")}><ExecuteModule onNavigate={navigate} onCommand={openCommand} planArtifact={planArtifactRef} projectRole={projects.find((project) => project.id === planArtifactRef?.projectId)?.role} onVerified={() => dispatch({ type: "execute/verified" })} /></ModuleErrorBoundary></div> : null}
				{visitedModules.has("agentix") ? <div className={stageClass("agentix")} hidden={activeModule !== "agentix"}><DeferredModule<AgentixModuleProps> load={loadAgentixModule} moduleName="Agentix" onReturnToDashboard={() => navigate("dashboard")} moduleProps={{ active: activeModule === "agentix", intentSignal: agentixIntent, onAttentionChange: setAgentixAttention, onOpenDiscovery: openOperationalDiscovery }} /></div> : null}
				{visitedModules.has("consult") ? <div className={stageClass("consult")} hidden={activeModule !== "consult"}><ModuleErrorBoundary moduleName="Consult Max" resetKey={activeModule} onReturnToDashboard={() => navigate("dashboard")}><ConsultModule state={{ agentix: agentixAttention, discoveryReady, planSent, planSnapshot, executeVerified }} onCommand={openCommand} onNavigate={navigate} /></ModuleErrorBoundary></div> : null}
				{visitedModules.has("integrations") ? <div className={stageClass("integrations")} hidden={activeModule !== "integrations"}><ModuleErrorBoundary moduleName="Integrations" resetKey={activeModule} onReturnToDashboard={() => navigate("dashboard")}><IntegrationsModule /></ModuleErrorBoundary></div> : null}
				{(["settings", "approvals", "usage", "help"] as const).map((module) => visitedModules.has(module) ? <div key={module} className={stageClass(module)} hidden={activeModule !== module}><ModuleErrorBoundary moduleName={module[0].toUpperCase() + module.slice(1)} resetKey={activeModule} onReturnToDashboard={() => navigate("dashboard")}><AccountUtilityModule module={module} onNavigate={navigate} approvalOpen={agentixAttention.approval} onOpenApproval={() => openAgentix({ type: "decision", id: "approval" })} /></ModuleErrorBoundary></div> : null)}
			</div>
			{commandOpen ? <CommandMenu context={commandContext} onClose={closeCommand} onAfterClose={restoreCommandFocus} /> : null}
		</div>
	)
}
