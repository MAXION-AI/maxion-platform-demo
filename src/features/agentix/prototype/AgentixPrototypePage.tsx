import {
	ArrowLeft,
	ArrowRight,
	Bell,
	Briefcase,
	CaretRight,
	ChatCircleText,
	Check,
	CheckCircle,
	CirclesThree,
	Clock,
	Database,
	FileText,
	House,
	LinkSimple,
	ListChecks,
	LockKey,
	MagnifyingGlass,
	Paperclip,
	Pause,
	Play,
	Plus,
	ShieldCheck,
	SidebarSimple,
	Pulse,
	SpinnerGap,
	Stop,
	Tray,
	X,
} from "@phosphor-icons/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"
import { useLocation } from "react-router-dom"

import { useDocumentTitle } from "@/app/hooks/useDocumentTitle"
import { MaxionSpiralMark } from "@/features/platform-prototype/PortalChrome"

import { AGENT_SCENARIOS, NEED_EXAMPLES, type AgentMessage, type AgentScenario } from "./model"
import "./agentix-prototype.css"

type Surface = "today" | "agent" | "create" | "activity"
type Drawer = "approval" | "inspector" | null
type RunControl = "working" | "interrupted" | "stopped"
type CreateStage = "interview" | "proposal"
type PaletteItem = { id: string; group: string; label: string; hint: string; keywords: string; run: () => void }
type InspectorSection = "sources" | "connections" | "artifacts"
type SessionEvent = { id: string; time: string; agentId: AgentScenario["id"]; title: string; detail: string }

const TODAY_LABEL = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())
const FOCUSABLE_SELECTOR = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"

// Dialog focus contract (P1-6): focus lands on the panel when it opens, Tab cycles inside it
// in both directions, and closing hands focus back to the trigger that opened it. The Tab
// listener lives on the panel itself, so the window key ladder is never involved.
function useDialogFocus(panelRef: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const panel = panelRef.current
		if (!panel) return
		const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
		panel.focus()
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return
			const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
			if (focusable.length === 0) { event.preventDefault(); return }
			const first = focusable[0]
			const last = focusable[focusable.length - 1]
			const active = document.activeElement
			if (event.shiftKey && (active === first || active === panel)) { event.preventDefault(); last.focus() }
			else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
			else if (!(active instanceof HTMLElement) || !panel.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
		}
		panel.addEventListener("keydown", onKeyDown)
		return () => { panel.removeEventListener("keydown", onKeyDown); if (trigger && document.contains(trigger)) trigger.focus() }
	}, [panelRef])
}

// Family motion discipline (Phase C, ported from the Execute/Plan recipe): every timed
// behavior keeps an instant path when the viewer prefers reduced motion. jsdom forces
// reduced motion TRUE in vitest and the unit specs assert final text SYNCHRONOUSLY after
// fireEvent.click (L4) — so the reduced-motion branches below carry no timer at all.
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

function useCountUp(target: number, started: boolean, animate: boolean, duration = 900) {
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

function StreamedText({ text, active = true }: { text: string; active?: boolean }) {
	const streamed = useStreamedText(text, active)
	return <>{streamed}</>
}

const PLATFORM_NAV = [
	{ label: "Overview", icon: House },
	{ label: "Discovery", icon: MagnifyingGlass },
	{ label: "Plan", icon: ListChecks },
	{ label: "Execute", icon: Briefcase },
	{ label: "Agentix", icon: Pulse, active: true },
	{ label: "Consult Max", icon: CirclesThree },
]

function AgentixMark({ size = 28 }: { size?: number }) {
	return <span className="ax3-mark" style={{ width: size, height: size }} aria-hidden="true"><MaxionSpiralMark className="ax3-mark-spiral" /></span>
}

function PlatformRail() {
	return (
		<aside className="ax3-platform" aria-label="Maxion modules">
			<div className="ax3-platform-brand"><AgentixMark size={30} /></div>
			<nav>{PLATFORM_NAV.map((item) => { const Icon = item.icon; return <div key={item.label} className={item.active ? "is-active" : ""} title={item.label} aria-label={item.label} aria-current={item.active ? "page" : undefined}><Icon size={17} weight={item.active ? "fill" : "regular"} /></div> })}</nav>
			<div className="ax3-platform-profile">RA</div>
		</aside>
	)
}

function Status({ children, tone = "neutral", live = false }: { children: ReactNode; tone?: "neutral" | "live" | "attention" | "success"; live?: boolean }) {
	return <span className={`ax3-status ax3-status--${tone}`}><i className={live ? "is-live" : ""} />{children}</span>
}

function agentPresentation(agent: AgentScenario, approvalRecorded: boolean, questionAnswered: boolean, control: RunControl) {
	if (control === "interrupted") return { label: "Interrupted", tone: "attention" as const, detail: "Preserved at a safe boundary" }
	if (control === "stopped") return { label: "Stopped", tone: "neutral" as const, detail: "No new work will start" }
	if (agent.id === "tpm" && !questionAnswered) return { label: "Needs input", tone: "attention" as const, detail: "Audience decision waiting" }
	if (agent.id === "finance" && !approvalRecorded) return { label: "Approval", tone: "attention" as const, detail: "Exact effects safely paused" }
	if (agent.id === "tpm") return { label: "Publishing", tone: "live" as const, detail: "Steering brief and decision register" }
	if (agent.id === "finance") return { label: "Reconciling", tone: "live" as const, detail: "QuickBooks and SAP receipts" }
	return { label: "Working", tone: "live" as const, detail: "Renewal follow-through" }
}

function AgentRail({ surface, selectedAgentId, attentionCount, approvalRecorded, questionAnswered, runControls, mobileOpen, onCloseMobile, onToday, onActivity, onCreate, onOpenAgent, onConnections }: {
	surface: Surface
	selectedAgentId: AgentScenario["id"] | null
	attentionCount: number
	approvalRecorded: boolean
	questionAnswered: boolean
	runControls: Record<AgentScenario["id"], RunControl>
	mobileOpen: boolean
	onCloseMobile: () => void
	onToday: () => void
	onActivity: () => void
	onCreate: () => void
	onOpenAgent: (agent: AgentScenario) => void
	onConnections: () => void
}) {
	return (
		<>
			{mobileOpen ? <button className="ax3-nav-scrim" type="button" aria-label="Close navigation" onClick={onCloseMobile} /> : null}
			<aside className={`ax3-agent-rail${mobileOpen ? " is-open" : ""}`} aria-label="Agentix workspace">
				<div className="ax3-agent-brand"><AgentixMark /><strong>Agentix</strong><button type="button" aria-label="Close Agentix navigation" onClick={onCloseMobile}><X size={16} /></button></div>
				<button className="ax3-new-agent" type="button" onClick={onCreate}><Plus size={15} weight="bold" /> New Agent <span>⌘K</span></button>
				<nav className="ax3-primary-nav" aria-label="Agentix navigation">
					<button type="button" className={surface === "today" ? "is-active" : ""} onClick={onToday}><Tray size={16} /><span>Today</span>{attentionCount > 0 ? <b>{attentionCount}</b> : null}</button>
					<button type="button" className={surface === "activity" ? "is-active" : ""} onClick={onActivity}><Clock size={16} /><span>Activity</span></button>
				</nav>
				<div className="ax3-rail-label"><span>Agents</span></div>
				<div className="ax3-agent-list">
					{AGENT_SCENARIOS.map((agent) => {
						const state = agentPresentation(agent, approvalRecorded, questionAnswered, runControls[agent.id])
						return <button type="button" key={agent.id} className={surface === "agent" && selectedAgentId === agent.id ? "is-active" : ""} onClick={() => onOpenAgent(agent)}><span className="ax3-avatar">{agent.shortName}</span><span><strong>{agent.name}</strong><small><i className={`ax3-mini-dot ax3-mini-dot--${state.tone}`} />{state.label}</small></span></button>
					})}
				</div>
				<div className="ax3-rail-spacer" />
				<button className="ax3-connection-state" type="button" onClick={onConnections}><span className="ax3-mini-dot ax3-mini-dot--success" /><span><strong>Connections ready</strong><small>4 services available</small></span><CaretRight size={12} /></button>
				<div className="ax3-user"><span className="ax3-avatar">RA</span><span><strong>Root Admin</strong><small>Tenant admin</small></span></div>
			</aside>
		</>
	)
}

function Header({ label, mobileNavOpen, onMobileNav, onCommand, onInspector, inspectorAvailable, onNotifications }: { label: string; mobileNavOpen: boolean; onMobileNav: () => void; onCommand: () => void; onInspector: () => void; inspectorAvailable: boolean; onNotifications: () => void }) {
	return (
		<header className="ax3-header">
			<div><button className="ax3-mobile-nav" type="button" aria-label={mobileNavOpen ? "Close Agentix navigation" : "Open Agentix navigation"} aria-expanded={mobileNavOpen} onClick={onMobileNav}><SidebarSimple size={18} /></button><span>{label}</span></div>
			<div className="ax3-header-actions">
				<button type="button" aria-label="Open Agentix command menu" onClick={onCommand}><MagnifyingGlass size={15} /><span>Search or ask</span><kbd>⌘K</kbd></button>
				{inspectorAvailable ? <button type="button" aria-label="Open Agent inspector" onClick={onInspector}><SidebarSimple size={16} /></button> : null}
				<button type="button" aria-label="Notifications" title="Decisions surface on Today" onClick={onNotifications}><Bell size={16} /></button>
			</div>
		</header>
	)
}

function CommandComposer({ value, onChange, onSubmit, inputRef, placeholder, contextLabel = "Authorized tenant context", palette = null, onPaletteHover, onPaletteRun, onPaletteDismiss }: { value: string; onChange: (value: string) => void; onSubmit: () => void; inputRef: RefObject<HTMLTextAreaElement>; placeholder: string; contextLabel?: string; palette?: { items: PaletteItem[]; activeIndex: number; query: string } | null; onPaletteHover?: (index: number) => void; onPaletteRun?: (item: PaletteItem) => void; onPaletteDismiss?: () => void }) {
	return (
		<div className="ax3-composer-wrap">
			{palette ? (
				<div className="ax3-cmd-pop" role="dialog" aria-label="Agentix command menu">
					<div className="ax3-cmd-pop-list">
						{palette.items.map((item, index) => <button type="button" key={item.id} className={index === palette.activeIndex ? "is-active" : ""} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => onPaletteHover?.(index)} onClick={() => onPaletteRun?.(item)}><i>{item.group}</i><span>{item.label}</span><small>{item.hint}</small></button>)}
						{palette.items.length === 0 ? <p className="ax3-cmd-pop-empty">Nothing in Agentix matches “{palette.query}”.</p> : null}
					</div>
					<footer><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> run</span><span><kbd>esc</kbd> close</span><span>Type to filter</span></footer>
				</div>
			) : null}
			<div className="ax3-composer">
				<label className="sr-only" htmlFor="agentix-command">Message Agentix</label>
				<textarea id="agentix-command" ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !palette) { event.preventDefault(); onSubmit() } }} onBlur={() => onPaletteDismiss?.()} placeholder={placeholder} rows={1} />
				<div className="ax3-composer-bar"><div><button type="button" aria-label="Attach context"><Paperclip size={15} /></button><span><Database size={13} />{contextLabel}</span></div><button className="ax3-send" type="button" aria-label="Send to Agentix" disabled={!value.trim()} onClick={onSubmit}><ArrowRight size={15} weight="bold" /></button></div>
			</div>
			<div className="ax3-composer-hint">Agentix can act inside activated authority. Material changes come back to you.</div>
		</div>
	)
}

function AttentionItem({ icon, eyebrow, title, detail, action, onAction }: { icon: ReactNode; eyebrow: string; title: string; detail: string; action: string; onAction: () => void }) {
	return (
		<motion.article layout exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="ax3-attention-item">
			<span className="ax3-attention-mark">{icon}</span><div><small>{eyebrow}</small><strong>{title}</strong><p>{detail}</p></div><button type="button" onClick={onAction}>{action}<ArrowRight size={13} /></button>
		</motion.article>
	)
}

function TodaySurface({ approvalRecorded, questionAnswered, runControls, onOpenAgent, onApproval, onQuestion, onActivity }: { approvalRecorded: boolean; questionAnswered: boolean; runControls: Record<AgentScenario["id"], RunControl>; onOpenAgent: (agent: AgentScenario) => void; onApproval: () => void; onQuestion: () => void; onActivity: () => void }) {
	const attentionCount = Number(!approvalRecorded) + Number(!questionAnswered)
	const finance = AGENT_SCENARIOS.find((agent) => agent.id === "finance")!
	const tpm = AGENT_SCENARIOS.find((agent) => agent.id === "tpm")!
	const revenue = AGENT_SCENARIOS.find((agent) => agent.id === "revenue")!
	return (
		<div className="ax3-today">
			<section className="ax3-today-lead">
				<span>{TODAY_LABEL}</span>
				<h1>{attentionCount === 0 ? "You’re clear. The work is moving." : `${attentionCount === 1 ? "One decision" : "Two decisions"}. Three agents working.`}</h1>
				<p><StreamedText text={attentionCount === 0 ? "Agentix will bring the next material boundary here." : "Review the boundaries below, or give Agentix something new."} /></p>
			</section>

			<section className="ax3-attention" aria-labelledby="needs-you-heading">
				<div className="ax3-section-heading"><div><h2 id="needs-you-heading">Needs you</h2><span>{attentionCount ? `${attentionCount} material ${attentionCount === 1 ? "boundary" : "boundaries"}` : "No decisions waiting"}</span></div></div>
				<AnimatePresence initial={false}>
					{!approvalRecorded ? <AttentionItem key="finance" icon={<ShieldCheck size={16} weight="fill" />} eyebrow="Finance close operator · exact approval" title="Post the validated July close effect set" detail="164 effects · $184,250 · no provider write has occurred" action="Review effects" onAction={onApproval} /> : null}
					{!questionAnswered ? <AttentionItem key="tpm" icon={<ChatCircleText size={16} weight="fill" />} eyebrow="Atlas program lead · clarification" title="Who may receive overdue reminders?" detail="Recommended: project team only · risk monitoring continues" action="Answer" onAction={onQuestion} /> : null}
				</AnimatePresence>
				{attentionCount === 0 ? <div className="ax3-clear-state"><CheckCircle size={17} weight="fill" /><div><strong>Nothing is blocked on you</strong><span>Routine work continues inside activated authority.</span></div></div> : null}
			</section>

			<section className="ax3-live-work" aria-labelledby="live-work-heading">
				<div className="ax3-section-heading"><div><h2 id="live-work-heading">Live work</h2><span>Committed activity, not hidden reasoning</span></div><button type="button" onClick={onActivity}>View activity</button></div>
				<div className="ax3-workstream">
					{[revenue, tpm, finance].map((agent) => {
						const state = agentPresentation(agent, approvalRecorded, questionAnswered, runControls[agent.id])
						const summary = agent.id === "revenue" ? "Preparing the Teams summary and 11 account-owner emails" : agent.id === "tpm" ? questionAnswered ? "Publishing the bounded steering brief" : "Risk monitoring continues while the audience waits" : approvalRecorded ? "Reconciling QuickBooks and SAP provider receipts" : "Validated effects remain safely paused"
						return <motion.button layout key={agent.id} type="button" title={state.detail} onClick={() => onOpenAgent(agent)}><span className="ax3-stream-line"><i className={`ax3-stream-dot ax3-stream-dot--${state.tone}`} /></span><span className="ax3-avatar">{agent.shortName}</span><span className="ax3-stream-copy"><span><strong>{agent.name}</strong><Status tone={state.tone} live={state.tone === "live"}>{state.label}</Status></span><p>{summary}</p></span><CaretRight size={13} /></motion.button>
					})}
				</div>
			</section>

			<section className="ax3-outcomes" aria-labelledby="outcomes-heading">
				<div className="ax3-section-heading"><div><h2 id="outcomes-heading">Completed today</h2><span>Verified against provider state</span></div></div>
				<button type="button" onClick={() => onOpenAgent(revenue)}><CheckCircle size={16} weight="fill" /><span><strong>14 renewal records are current</strong><small>Salesforce read-backs verified · $842,000 ARR reviewed</small></span><time>9:18 AM</time></button>
				<button type="button" onClick={() => onOpenAgent(tpm)}><CheckCircle size={16} weight="fill" /><span><strong>The critical dependency path is current</strong><small>17 dependencies reconciled · 2 exceptions preserved</small></span><time>9:06 AM</time></button>
			</section>
		</div>
	)
}

function ActivityGroup({ agent, approvalRecorded, questionAnswered, onEvidence }: { agent: AgentScenario; approvalRecorded: boolean; questionAnswered: boolean; onEvidence: () => void }) {
	const resolved = (agent.id === "finance" && approvalRecorded) || (agent.id === "tpm" && questionAnswered)
	return (
		<details className="ax3-activity-group" open>
			<summary><span><SpinnerGap className="ax3-spin" size={15} /><strong>{resolved ? "Continuing autonomously" : agent.runState}</strong></span><span>{agent.activity.length} steps<CaretRight size={12} /></span></summary>
			<div>{agent.activity.map((item, index) => { const isLast = index === agent.activity.length - 1; const isResolvedLast = isLast && resolved; const label = isResolvedLast ? agent.id === "finance" ? "Reconciling approved provider effects" : "Publishing the bounded steering brief" : item.title; const detail = isResolvedLast ? agent.id === "finance" ? "Receipts are being matched before the close summary is sent." : "Audience resolved. The decision register is updating now." : item.summary; return <details className="ax3-activity-step" key={item.id}><summary><span className={`ax3-step-icon${isLast && !resolved ? " is-current" : ""}`}>{isLast && !resolved ? <SpinnerGap className="ax3-spin" size={11} /> : <Check size={10} weight="bold" />}</span><span><strong>{label}</strong><small>{detail}</small></span><CaretRight size={11} /></summary><p>{item.detail}{item.evidence ? <button type="button" onClick={onEvidence}><FileText size={12} />{item.evidence}</button> : null}</p></details> })}</div>
		</details>
	)
}

function Clarification({ onAnswer }: { onAnswer: (answer: string) => void }) {
	return (
		<motion.section layout exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="ax3-inline-decision" aria-labelledby="audience-question">
			<div className="ax3-agent-glyph"><MaxionSpiralMark variant="current" className="ax3-agent-spiral" /></div><div><span>Agentix needs one decision</span><h2 id="audience-question">Who may receive overdue reminders?</h2><p>The brief is ready. This choice changes the communication audience, so I won’t infer it.</p><div className="ax3-recommendation"><ShieldCheck size={15} /><span><strong>Recommended: project team only.</strong> Executive outreach can remain a separate approval.</span></div><div className="ax3-decision-actions"><button type="button" onClick={() => onAnswer("Keep reminders with the project team.")}>Use project team only</button><button type="button" onClick={() => onAnswer("Prepare an executive note for approval.")}>Prepare executive note</button></div><small>If you wait, the brief pauses. Risk monitoring does not.</small></div>
		</motion.section>
	)
}

function ApprovalRequest({ onReview }: { onReview: () => void }) {
	return (
		<motion.section layout exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="ax3-inline-decision" aria-labelledby="approval-question">
			<div className="ax3-agent-glyph"><MaxionSpiralMark variant="current" className="ax3-agent-spiral" /></div><div><span>Exact approval required</span><h2 id="approval-question">Post the validated July close effect set</h2><p>I validated 126 journal lines and 38 SAP inventory adjustments. No provider write has occurred.</p><div className="ax3-effect-facts"><span><strong>$184,250</strong><small>aggregate effect</small></span><span><strong>164</strong><small>records</small></span><span><strong>0</strong><small>writes</small></span></div><div className="ax3-decision-actions"><button type="button" onClick={onReview}>Review exact effects</button></div><small>If you wait, the close remains safely paused.</small></div>
		</motion.section>
	)
}

// Staged provider receipts (Phase C): rows land one by one after Approve while the aggregate
// counts up. Under reduced motion the parent hands in the final stage inside the Approve
// commit, so every row and count renders complete with no timer (L4).
const RECEIPT_ROWS = [
	{ id: "quickbooks", pending: "Matching QuickBooks journal batch", done: "QuickBooks journal batch matched", detail: "126 balanced lines · JUL-SBX-04", amount: "$162,410" },
	{ id: "sap", pending: "Matching SAP inventory adjustments", done: "SAP inventory adjustments matched", detail: "38 bounded adjustments · 2 cost centers", amount: "$21,840" },
	{ id: "notify", pending: "Sending finance notifications", done: "Finance notifications sent", detail: "Controller email + Finance Operations Teams", amount: "2 sent" },
] as const

function ReconcileReceipts({ stage }: { stage: number }) {
	// animate flips off once the run settles so the totals snap true even if rAF never
	// ticked (backgrounded tab) — the settled surface may not understate the effects.
	const animate = !prefersReducedMotion() && stage < 3
	const amount = useCountUp(184250, true, animate, 1600)
	const records = useCountUp(164, true, animate, 1600)
	return (
		<section className="ax3-receipts" aria-label="Provider receipts">
			<header><span>{stage >= 3 ? <Check size={12} weight="bold" /> : <SpinnerGap className="ax3-spin" size={12} />}Provider receipts</span><div><strong>${amount.toLocaleString("en-US")}</strong><small>{records} records {stage >= 3 ? "reconciled" : "reconciling"}</small></div></header>
			<div>{RECEIPT_ROWS.map((row, index) => stage >= index ? <motion.div key={row.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion() ? 0 : 0.2 }} className={`ax3-receipt-row${stage > index ? " is-done" : ""}`}>{stage > index ? <Check size={11} weight="bold" /> : <SpinnerGap className="ax3-spin" size={11} />}<span><strong>{stage > index ? row.done : `${row.pending}…`}</strong><small>{row.detail}</small></span><b>{row.amount}</b></motion.div> : null)}</div>
		</section>
	)
}

function AgentSurface({ agent, approvalRecorded, questionAnswered, control, extraMessages, steerPending, streamingId, reconcileStage, onAnswer, onApproval, onControl, onInspector, onInspectorSection }: { agent: AgentScenario; approvalRecorded: boolean; questionAnswered: boolean; control: RunControl; extraMessages: AgentMessage[]; steerPending: boolean; streamingId: string | null; reconcileStage: number; onAnswer: (answer: string) => void; onApproval: () => void; onControl: (state: RunControl) => void; onInspector: () => void; onInspectorSection: (section: InspectorSection) => void }) {
	const state = agentPresentation(agent, approvalRecorded, questionAnswered, control)
	const allMessages = [...agent.messages, ...extraMessages]
	return (
		<div className="ax3-session">
			<header className="ax3-session-head"><div><span className="ax3-avatar ax3-avatar--large">{agent.shortName}</span><div><div><h1>{agent.name}</h1><Status tone={state.tone} live={state.tone === "live"}>{state.label}</Status></div><p>{agent.mission}</p></div></div><div className="ax3-run-controls">{control === "interrupted" ? <button type="button" onClick={() => onControl("working")}><Play size={14} />Resume</button> : <button type="button" disabled={control === "stopped"} onClick={() => onControl("interrupted")}><Pause size={14} />Interrupt</button>}<button type="button" aria-label="Stop run" disabled={control === "stopped"} onClick={() => onControl("stopped")}><Stop size={14} /></button><button type="button" aria-label="Open Agent inspector" onClick={onInspector}><SidebarSimple size={15} /></button></div></header>
			<div className="ax3-thread">
				<div className="ax3-thread-date"><span>Current run</span></div>
				{allMessages.map((message) => <div className={`ax3-message ax3-message--${message.author === "You" ? "user" : "agent"}`} key={message.id}>{message.author === "Agentix" ? <div className="ax3-agent-glyph"><MaxionSpiralMark variant="current" className="ax3-agent-spiral" /></div> : null}<div><span>{message.author}<time>{message.time}</time></span><p>{message.author === "Agentix" && message.id === streamingId ? <StreamedText text={message.text} /> : message.text}</p></div></div>)}
				{steerPending ? <div className="ax3-message ax3-message--agent ax3-message--pending"><div className="ax3-agent-glyph"><MaxionSpiralMark variant="current" className="ax3-agent-spiral" /></div><div><span>Agentix<time>Now</time></span><p>Attaching to the active run…</p></div></div> : null}
				<ActivityGroup agent={agent} approvalRecorded={approvalRecorded} questionAnswered={questionAnswered} onEvidence={() => onInspectorSection("sources")} />
				<AnimatePresence initial={false}>
					{agent.id === "tpm" && !questionAnswered && control === "working" ? <Clarification key="clarification" onAnswer={onAnswer} /> : null}
					{agent.id === "finance" && !approvalRecorded && control === "working" ? <ApprovalRequest key="approval" onReview={onApproval} /> : null}
					{((agent.id === "tpm" && questionAnswered) || (agent.id === "finance" && approvalRecorded)) && control === "working" ? <motion.div key="resumed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ax3-resumed"><CheckCircle size={16} weight="fill" /><span><strong>{agent.id === "finance" ? "Approval recorded. Effects are reconciling." : "Audience resolved. The existing run resumed."}</strong><small>No authority or recipient boundary changed.</small></span></motion.div> : null}
				</AnimatePresence>
				{agent.id === "finance" && approvalRecorded ? <ReconcileReceipts stage={reconcileStage} /> : null}
				<section className="ax3-result"><div className="ax3-result-heading"><CheckCircle size={17} weight="fill" /><span><small>Verified outcome</small><strong>{agent.latestOutcome}</strong></span></div><p>{agent.id === "finance" && approvalRecorded ? reconcileStage >= 3 ? "The exact approved set posted. QuickBooks and SAP receipts reconciled, and the close summary went to the controller." : "The exact approved set is dispatching. Completion waits for reconciled QuickBooks and SAP receipts." : agent.outcomeDetail}</p><div>{agent.artifacts.slice(0, 2).map((artifact) => <button type="button" key={artifact.id} onClick={() => onInspectorSection("artifacts")}><FileText size={14} /><span><strong>{artifact.name}</strong><small>{artifact.verification}</small></span><CaretRight size={12} /></button>)}</div></section>
			</div>
		</div>
	)
}

function Inspector({ agent, focusSection, onClose }: { agent: AgentScenario; focusSection: InspectorSection | null; onClose: () => void }) {
	const panelRef = useRef<HTMLElement>(null)
	useDialogFocus(panelRef)
	// Evidence rows, artifacts, and "Connections ready" deep-link here; land the caller's
	// section at the top of the panel (instant — no motion dependency, L5).
	useEffect(() => {
		if (!focusSection) return
		panelRef.current?.querySelector(`[data-section="${focusSection}"]`)?.scrollIntoView({ block: "start" })
	}, [focusSection])
	return (
		<motion.aside ref={panelRef} tabIndex={-1} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} className="ax3-inspector" aria-label={`${agent.name} inspector`}>
			<header><strong>Inspector</strong><button type="button" aria-label="Close Agent inspector" onClick={onClose}><X size={15} /></button></header>
			<section><span>Current responsibility</span><h2>{agent.currentWork}</h2><p>{agent.nextDuty}</p></section>
			<dl><div><dt>Owner</dt><dd>{agent.owner}</dd></div><div><dt>Version</dt><dd>{agent.version}</dd></div><div><dt>Authority</dt><dd>Bounded</dd></div><div><dt>Usage</dt><dd>Inside limit</dd></div></dl>
			<section><span>Authority</span><div className="ax3-authority-note"><LockKey size={14} /><p>Narrowest policy wins. Conversation can steer work but cannot widen tools, recipients, or effects.</p></div></section>
			<section data-section="sources"><span>Sources</span>{agent.sources.map((source) => <div className="ax3-inspector-row" key={source.name}><Database size={13} /><span><strong>{source.name}</strong><small>{source.detail} · {source.freshness}</small></span></div>)}</section>
			<section data-section="artifacts"><span>Artifacts</span>{agent.artifacts.map((artifact) => <div className="ax3-inspector-row" key={artifact.id}><FileText size={13} /><span><strong>{artifact.name}</strong><small>{artifact.freshness} · {artifact.verification}</small></span></div>)}</section>
			<section data-section="connections"><span>Connections</span>{agent.connections.map((connection) => <div className="ax3-inspector-row" key={connection.name}><LinkSimple size={13} /><span><strong>{connection.name}</strong><small>{connection.capability} · {connection.state}</small></span></div>)}</section>
		</motion.aside>
	)
}

function ApprovalDrawer({ onApprove, onClose }: { onApprove: () => void; onClose: () => void }) {
	const panelRef = useRef<HTMLElement>(null)
	useDialogFocus(panelRef)
	return (
		<motion.div className="ax3-drawer-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
			<motion.aside ref={panelRef} tabIndex={-1} initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }} role="dialog" aria-modal="true" aria-labelledby="approval-drawer-title">
				<header><div><Status tone="attention">Exact approval</Status><h2 id="approval-drawer-title">July close effects</h2></div><button type="button" aria-label="Close approval" onClick={onClose}><X size={16} /></button></header>
				<section><span>Bound outcome</span><p>Post the validated July close without changing accounts, values, principals, source versions, or recipients.</p></section>
				<section><span>Exact effect set</span><div className="ax3-effect-row"><div><strong>QuickBooks journal batch</strong><small>126 balanced lines · JUL-SBX-04</small></div><b>$162,410</b></div><div className="ax3-effect-row"><div><strong>SAP inventory adjustments</strong><small>38 bounded adjustments · 2 cost centers</small></div><b>$21,840</b></div><div className="ax3-effect-row"><div><strong>Finance notifications</strong><small>Controller email + Finance Operations Teams</small></div><b>2</b></div></section>
				<section><span>Approval does not allow</span><ul><li><X size={12} />Edit journal lines or values</li><li><X size={12} />Change principals or recipients</li><li><X size={12} />Create future or recurring authority</li></ul></section>
				<section><span>Identity and evidence</span><dl><div><dt>Agent owner</dt><dd>Elena Torres</dd></div><div><dt>SAP principal</dt><dd>Finance shared service</dd></div><div><dt>Before-state hash</dt><dd>7e4a…91cc</dd></div><div><dt>Expires</dt><dd>In 22 minutes</dd></div></dl></section>
				<footer><button type="button" onClick={onClose}>Keep paused</button><button type="button" onClick={onApprove}><Check size={14} />Approve exact effects</button></footer>
			</motion.aside>
		</motion.div>
	)
}

// One research reveal row: appears when its stage starts, counts up while running, and
// settles with a check when the next stage begins. Under reduced motion the row renders
// complete on first paint (useCountUp seeds the target with no timer).
function ResearchCountRow({ revealed, done, target, unit, detail }: { revealed: boolean; done: boolean; target: number; unit: string; detail: string }) {
	const value = useCountUp(target, revealed, !prefersReducedMotion() && !done, 700)
	if (!revealed) return null
	return <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion() ? 0 : 0.2 }} className={`ax3-research-row${done ? " is-done" : ""}`}>{done ? <Check size={11} weight="bold" /> : <SpinnerGap className="ax3-spin" size={11} />}<strong>{value}</strong><span>{unit}</span><small>{detail}</small></motion.div>
}

function CreateSurface({ need, stage, researchStage, onStage, onBack, onExample, onActivate, onViewSources }: { need: string; stage: CreateStage; researchStage: number; onStage: (stage: CreateStage) => void; onBack: () => void; onExample: (need: string) => void; onActivate: () => void; onViewSources: () => void }) {
	if (!need) {
		return <div className="ax3-create ax3-create--empty"><div><AgentixMark size={36} /><h1>What should this Agent own?</h1><p>Describe a responsibility or outcome. Agentix will research authorized context, propose the operating model, and only ask what materially changes the work.</p><span>Try an example</span><div className="ax3-create-examples">{NEED_EXAMPLES.map((example) => <button type="button" key={example.id} onClick={() => onExample(example.prompt)}>{example.label}<CaretRight size={12} /></button>)}</div></div></div>
	}
	return (
		<div className="ax3-create">
			<header><button type="button" onClick={onBack} aria-label="Back"><ArrowLeft size={15} /></button><div><span>New Agent</span><h1>Shape the operating model together</h1><p>Agentix researched first. It only asks what materially changes the work.</p></div></header>
			<div className="ax3-thread">
				<div className="ax3-message ax3-message--user"><div><span>You<time>Now</time></span><p>{need}</p></div></div>
				{researchStage < 3 ? (
					<div className="ax3-research-run" role="status" aria-label="Researching authorized context">
						<span className="ax3-research-run-title"><SpinnerGap className="ax3-spin" size={13} />Researching authorized context</span>
						<ResearchCountRow revealed={researchStage >= 0} done={researchStage >= 1} target={5} unit="approved sources" detail="Program brief · milestone plan · Jira · ADRs · Teams" />
						<ResearchCountRow revealed={researchStage >= 1} done={researchStage >= 2} target={21} unit="memory items" detail="Tenant memory scoped to this responsibility" />
						<ResearchCountRow revealed={researchStage >= 2} done={researchStage >= 3} target={4} unit="connections" detail="Jira · Teams · Microsoft 365 · SharePoint" />
					</div>
				) : (
					<>
						<div className="ax3-message ax3-message--agent"><div className="ax3-agent-glyph"><MaxionSpiralMark variant="current" className="ax3-agent-spiral" /></div><div><span>Agentix<time>Now</time></span><p><StreamedText text="I found a workable operating model using the context and connections you already authorized." /></p></div></div>
						<div className="ax3-research-line"><CheckCircle size={16} weight="fill" /><span><strong>Research complete</strong><small>5 approved sources · 21 memory items · 4 connections</small></span><button type="button" onClick={onViewSources}>View sources</button></div>
					</>
				)}
				{researchStage >= 3 ? <AnimatePresence mode="wait">
					{stage === "interview" ? <motion.section key="interview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="ax3-interview"><span>Three choices materially change the work</span><h2>Finish the operating boundaries</h2><div className="ax3-question-row"><div><strong>Routine audience</strong><small>Who may receive follow-ups?</small></div><label><input type="radio" name="audience" defaultChecked />Project team only</label><label><input type="radio" name="audience" />Include sponsor with approval</label></div><div className="ax3-question-row"><div><strong>Commitment updates</strong><small>What may Agentix change?</small></div><label><input type="radio" name="updates" defaultChecked />Draft changes for approval</label><label><input type="radio" name="updates" />Update bounded fields</label></div><div className="ax3-question-row"><div><strong>Operating cadence</strong><small>When should it work?</small></div><label><input type="radio" name="cadence" defaultChecked />Weekdays at 8:00 AM</label><label><input type="radio" name="cadence" />On source change</label></div><button type="button" className="ax3-primary-action" onClick={() => onStage("proposal")}>Build operating model<ArrowRight size={14} /></button></motion.section> : <motion.section key="proposal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ax3-proposal"><span>Proposed Agent</span><div className="ax3-proposal-title"><span className="ax3-avatar ax3-avatar--large">AP</span><div><h2>Atlas program lead</h2><p>Keep the ERP modernization decision-ready and moving without masking delivery risk.</p></div></div><div className="ax3-proposal-grid"><section><span>Duties</span><ul><li><Check size={12} />Risk and dependency refresh</li><li><Check size={12} />Steering brief</li><li><Check size={12} />Overdue action follow-up</li></ul></section><section><span>Authority</span><ul><li><LockKey size={12} />Project sources only</li><li><LockKey size={12} />Project-team audience</li><li><LockKey size={12} />Exact approval at threshold</li></ul></section></div><div className="ax3-ready"><CheckCircle size={16} weight="fill" /><span><strong>Ready to activate</strong><small>Owner: Root Admin · Agent v1 · first run queues once</small></span></div><button type="button" className="ax3-primary-action" onClick={onActivate}>Activate Agent<ArrowRight size={14} /></button></motion.section>}
				</AnimatePresence> : null}
			</div>
		</div>
	)
}

function ActivitySurface({ sessionEvents, approvalRecorded, onOpenAgent }: { sessionEvents: SessionEvent[]; approvalRecorded: boolean; onOpenAgent: (agent: AgentScenario) => void }) {
	return <div className="ax3-history"><header><span>Activity</span><h1>Everything Agentix committed</h1><p>Actions, effects, waits, receipts, and verified outcomes—without hidden reasoning.</p></header><div className="ax3-history-day"><span>Today</span>{sessionEvents.map((event) => { const agent = AGENT_SCENARIOS.find((candidate) => candidate.id === event.agentId)!; return <button type="button" key={event.id} onClick={() => onOpenAgent(agent)}><time>{event.time}</time><span className="ax3-history-line"><i /></span><span className="ax3-avatar">{agent.shortName}</span><span><strong>{event.title}</strong><small>{agent.name} · {event.detail}</small></span><Status tone="success">Committed</Status></button> })}{AGENT_SCENARIOS.map((agent, index) => <button type="button" key={agent.id} onClick={() => onOpenAgent(agent)}><time>{index === 0 ? "9:18" : index === 1 ? "9:06" : "8:42"}</time><span className="ax3-history-line"><i /></span><span className="ax3-avatar">{agent.shortName}</span><span><strong>{agent.latestOutcome}</strong><small>{agent.name} · {agent.outcomeMetric} {agent.id === "finance" && approvalRecorded ? "effects approved and reconciling" : agent.outcomeMetricLabel}</small></span><Status tone="success">Verified</Status></button>)}</div><div className="ax3-history-day"><span>Yesterday</span><button type="button" onClick={() => onOpenAgent(AGENT_SCENARIOS[1])}><time>4:32</time><span className="ax3-history-line"><i /></span><span className="ax3-avatar">RO</span><span><strong>Renewal risk register reconciled</strong><small>Revenue operations partner · 18 provider receipts</small></span><Status tone="success">Verified</Status></button></div></div>
}

export function AgentixPrototypePage({ embedded = false }: { embedded?: boolean }) {
	useDocumentTitle("Agentix · North-star prototype · Maxion")
	const location = useLocation()
	const standalone = !embedded && location.pathname === "/agentix-prototype"
	const reducedMotion = useReducedMotion()
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const rootRef = useRef<HTMLDivElement>(null)
	const mainRef = useRef<HTMLElement>(null)
	const [surface, setSurface] = useState<Surface>("today")
	const [selectedAgentId, setSelectedAgentId] = useState<AgentScenario["id"] | null>(null)
	const [composerValue, setComposerValue] = useState("")
	const [approvalRecorded, setApprovalRecorded] = useState(false)
	const [questionAnswered, setQuestionAnswered] = useState(false)
	const [drawer, setDrawer] = useState<Drawer>(null)
	const [mobileNavOpen, setMobileNavOpen] = useState(false)
	const [toast, setToast] = useState("")
	const [createNeed, setCreateNeed] = useState<string>(NEED_EXAMPLES[0].prompt)
	const [createStage, setCreateStage] = useState<CreateStage>("interview")
	const [extraMessages, setExtraMessages] = useState<Record<AgentScenario["id"], AgentMessage[]>>({ tpm: [], revenue: [], finance: [] })
	const [runControls, setRunControls] = useState<Record<AgentScenario["id"], RunControl>>({ tpm: "working", revenue: "working", finance: "working" })
	const [paletteOpen, setPaletteOpen] = useState(false)
	const [paletteActive, setPaletteActive] = useState(0)
	const [anchorTarget, setAnchorTarget] = useState<string | null>(null)
	const [inspectorSection, setInspectorSection] = useState<InspectorSection | null>(null)
	const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([])
	// Phase C theater state. researchStage/reconcileStage: 0-2 = staged beats, 3 = settled.
	// The reduced-motion paths jump straight to 3 inside the triggering commit (L4).
	const [researchStage, setResearchStage] = useState(3)
	const [reconcileStage, setReconcileStage] = useState(3)
	const [steerPendingId, setSteerPendingId] = useState<AgentScenario["id"] | null>(null)
	const [streamingId, setStreamingId] = useState<string | null>(null)
	const steerTimerRef = useRef<number | null>(null)
	useEffect(() => () => { if (steerTimerRef.current) window.clearTimeout(steerTimerRef.current) }, [])

	const selectedAgent = useMemo(() => AGENT_SCENARIOS.find((agent) => agent.id === selectedAgentId) ?? null, [selectedAgentId])
	const attentionCount = Number(!approvalRecorded) + Number(!questionAnswered)
	const label = surface === "today" ? "Today" : surface === "activity" ? "Activity" : surface === "create" ? "New Agent" : selectedAgent?.name ?? "Agentix"

	const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200) }
	const scrollMainTop = () => mainRef.current?.scrollTo({ top: 0, behavior: "auto" })
	// Thread append auto-scroll: the working scroll container is .ax3-main, never window.
	const scrollThreadEnd = () => { window.requestAnimationFrame?.(() => { const node = mainRef.current; if (!node) return; node.scrollTo?.({ top: node.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" }) }) }
	const openAgent = (agent: AgentScenario) => { setSelectedAgentId(agent.id); setSurface("agent"); setMobileNavOpen(false); setStreamingId(null); scrollMainTop() }
	const goToday = () => { setSelectedAgentId(null); setSurface("today"); setDrawer(null); setMobileNavOpen(false); setStreamingId(null); scrollMainTop() }
	const goActivity = () => { setSelectedAgentId(null); setSurface("activity"); setDrawer(null); setMobileNavOpen(false); setStreamingId(null); scrollMainTop() }
	const startCreate = () => { setCreateNeed(""); setCreateStage("interview"); setSurface("create"); setDrawer(null); setMobileNavOpen(false); setStreamingId(null); scrollMainTop(); window.setTimeout(() => composerRef.current?.focus(), 0) }
	const openPalette = () => { setPaletteActive(0); setPaletteOpen(true); window.setTimeout(() => composerRef.current?.focus(), 0) }
	const closePalette = () => setPaletteOpen(false)
	const openDecision = (agentId: AgentScenario["id"], anchor: string) => { setAnchorTarget(anchor); openAgent(AGENT_SCENARIOS.find((agent) => agent.id === agentId)!) }
	const applyRunControl = (agentId: AgentScenario["id"], control: RunControl) => { setRunControls((current) => ({ ...current, [agentId]: control })); notify(control === "interrupted" ? "Run preserved at a safe boundary." : control === "stopped" ? "Run stopped. Dispatched effects remain under reconciliation." : "Run resumed from its checkpoint.") }
	// The Activity ledger records what this session actually committed (P1-9) — newest first.
	const recordEvent = (agentId: AgentScenario["id"], title: string, detail: string) => setSessionEvents((current) => [{ id: `event-${Date.now()}-${current.length}`, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), agentId, title, detail }, ...current])
	const openInspector = (section: InspectorSection | null = null) => { setInspectorSection(section); setDrawer("inspector"); setMobileNavOpen(false) }

	const submitComposer = () => {
		const value = composerValue.trim()
		if (!value) return
		if (surface === "agent" && selectedAgent) {
			const agent = selectedAgent
			const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
			const userMessage: AgentMessage = { id: `user-${Date.now()}`, author: "You", text: value, time: now }
			// Steer replies vary per agent (P0-4) — the revenue reply keeps the pinned
			// /I attached that to the active run/ text the unit spec asserts.
			const reply: AgentMessage = { id: `agent-${Date.now()}`, author: "Agentix", text: agent.steerReply, time: "Now", tone: "system" }
			if (runControls[agent.id] === "stopped") setRunControls((current) => ({ ...current, [agent.id]: "working" }))
			recordEvent(agent.id, "Steering context attached", "Applied at the next safe boundary")
			if (prefersReducedMotion()) {
				// L4: the steer spec asserts the echo AND the reply synchronously — one commit, no timer.
				setExtraMessages((current) => ({ ...current, [agent.id]: [...current[agent.id], userMessage, reply] }))
				notify("Agentix acknowledged the steering context.")
			} else {
				setExtraMessages((current) => ({ ...current, [agent.id]: [...current[agent.id], userMessage] }))
				setSteerPendingId(agent.id)
				if (steerTimerRef.current) window.clearTimeout(steerTimerRef.current)
				steerTimerRef.current = window.setTimeout(() => {
					setSteerPendingId(null)
					setStreamingId(reply.id)
					setExtraMessages((current) => ({ ...current, [agent.id]: [...current[agent.id], reply] }))
					notify("Agentix acknowledged the steering context.")
					scrollThreadEnd()
				}, 700)
			}
			scrollThreadEnd()
		} else {
			setCreateNeed(value); setCreateStage("interview"); setSurface("create")
		}
		setComposerValue("")
	}

	// The ⌘K popover is composer-anchored: focus stays in the textarea, its value is the
	// filter query, and arrows/Enter operate the list from the textarea (combobox pattern).
	const paletteItems: PaletteItem[] = [{ id: "new-agent", group: "Actions", label: "New Agent", hint: "Design and activate a bounded Agent", keywords: "new agent create activate design operating model", run: startCreate }]
	if (!questionAnswered) paletteItems.push({ id: "answer-question", group: "Decisions", label: "Answer the waiting question", hint: "Who may receive overdue reminders?", keywords: "answer question clarification audience overdue reminders atlas", run: () => openDecision("tpm", "audience-question") })
	if (!approvalRecorded) paletteItems.push({ id: "review-effects", group: "Decisions", label: "Review July close effects", hint: "164 effects · $184,250 held", keywords: "review approve approval exact effects finance close july", run: () => openDecision("finance", "approval-question") })
	if (surface === "agent" && selectedAgent && runControls[selectedAgent.id] === "interrupted") paletteItems.push({ id: "resume-run", group: "Run", label: "Resume run", hint: `${selectedAgent.name} continues from its checkpoint`, keywords: "resume continue run restart checkpoint", run: () => applyRunControl(selectedAgent.id, "working") })
	if (surface === "agent" && selectedAgent && runControls[selectedAgent.id] === "working") paletteItems.push({ id: "interrupt-run", group: "Run", label: "Interrupt run", hint: `Preserve ${selectedAgent.name} at a safe boundary`, keywords: "interrupt pause hold stop run boundary", run: () => applyRunControl(selectedAgent.id, "interrupted") })
	AGENT_SCENARIOS.forEach((agent, index) => { const state = agentPresentation(agent, approvalRecorded, questionAnswered, runControls[agent.id]); paletteItems.push({ id: `agent-${agent.id}`, group: "Agents", label: agent.name, hint: `${state.label} · ${index + 3}`, keywords: `agent open session ${agent.mission}`, run: () => openAgent(agent) }) })
	paletteItems.push({ id: "surface-today", group: "Surfaces", label: "Today", hint: "Decisions and live work · 1", keywords: "today home decisions overview needs you", run: goToday })
	paletteItems.push({ id: "surface-activity", group: "Surfaces", label: "Activity", hint: "Everything Agentix committed · 2", keywords: "activity ledger history receipts committed verified", run: goActivity })
	const paletteQuery = paletteOpen ? composerValue.trim().toLowerCase() : ""
	const paletteFiltered = paletteQuery ? paletteItems.filter((item) => `${item.label} ${item.hint} ${item.keywords}`.toLowerCase().includes(paletteQuery)) : paletteItems
	const paletteIndex = Math.min(paletteActive, Math.max(0, paletteFiltered.length - 1))
	const runPaletteItem = (item: PaletteItem) => { setPaletteOpen(false); setComposerValue(""); item.run() }

	// The window handler registers once (capture phase) and reads live state through this ref;
	// every action it calls touches only setters and refs, so first-render closures stay valid.
	const keyStateRef = useRef({ paletteOpen, paletteFiltered, paletteIndex, drawer, mobileNavOpen, surface, createNeed })
	keyStateRef.current = { paletteOpen, paletteFiltered, paletteIndex, drawer, mobileNavOpen, surface, createNeed }

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// Every module stage stays mounted behind `hidden` — only the visible stage may own the
			// keyboard. jsdom reports offsetParent null for every element, so "no offsetParent" counts
			// as hidden only when a hidden stage ancestor confirms it (the unit suite mounts the module
			// standalone and drives ⌘K from window).
			const root = rootRef.current
			if (!root || (!root.offsetParent && root.closest("[hidden]"))) return
			const state = keyStateRef.current
			const target = event.target as HTMLElement | null
			const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				// Capture phase + stopPropagation so the shell CommandMenu never opens on top of Agentix.
				event.preventDefault()
				event.stopPropagation()
				if (state.paletteOpen) { closePalette(); return }
				if (state.surface === "create" && state.createNeed) goToday()
				openPalette()
				return
			}
			if (state.paletteOpen) {
				if (event.key === "ArrowDown") { event.preventDefault(); event.stopPropagation(); setPaletteActive(Math.min(state.paletteIndex + 1, Math.max(0, state.paletteFiltered.length - 1))); return }
				if (event.key === "ArrowUp") { event.preventDefault(); event.stopPropagation(); setPaletteActive(Math.max(state.paletteIndex - 1, 0)); return }
				if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); const item = state.paletteFiltered[state.paletteIndex]; if (item) runPaletteItem(item); return }
				if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closePalette(); return }
			}
			if (event.key === "Escape") {
				// Escape ladder: palette (above) → drawer → mobile nav; consumed steps never reach the shell.
				if (state.drawer) { event.stopPropagation(); setDrawer(null); return }
				if (state.mobileNavOpen) { event.stopPropagation(); setMobileNavOpen(false); return }
				return
			}
			if (typing) return
			if (event.key === "/") { event.preventDefault(); composerRef.current?.focus(); return }
			if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); startCreate(); return }
			if (event.key === "1") { event.preventDefault(); goToday(); return }
			if (event.key === "2") { event.preventDefault(); goActivity(); return }
			if (["3", "4", "5"].includes(event.key)) { event.preventDefault(); openAgent(AGENT_SCENARIOS[Number(event.key) - 3]); return }
		}
		window.addEventListener("keydown", onKeyDown, { capture: true })
		return () => window.removeEventListener("keydown", onKeyDown, { capture: true })
		// Live state arrives through keyStateRef; the actions only touch stable setters and refs.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Attention-CTA arrivals anchor the decision card into view once the surface exchange
	// lands it in the DOM (instant under reduced motion). Polling beats transition-end
	// events, which the reduced-motion CSS kills.
	useEffect(() => {
		if (!anchorTarget) return
		let tries = 0
		const timer = window.setInterval(() => {
			const node = mainRef.current?.querySelector<HTMLElement>(`#${anchorTarget}`)
			tries += 1
			if (node) { (node.closest("section") ?? node).scrollIntoView?.({ block: "center", behavior: reducedMotion ? "auto" : "smooth" }); setAnchorTarget(null); window.clearInterval(timer) }
			else if (tries > 40) { setAnchorTarget(null); window.clearInterval(timer) }
		}, 40)
		return () => window.clearInterval(timer)
	}, [anchorTarget, reducedMotion])

	// Staged research theater (P0-4): sources → memory → connections reveal one by one with
	// count-ups before "Research complete" and the interview. Under reduced motion the run
	// resolves inside the submitting commit's effect flush — the unit spec asserts
	// "Research complete" synchronously after fireEvent.click (L4), with no timer at all.
	useEffect(() => {
		if (surface !== "create" || !createNeed) return
		if (prefersReducedMotion()) { setResearchStage(3); return }
		setResearchStage(0)
		const timers = [window.setTimeout(() => setResearchStage(1), 850), window.setTimeout(() => setResearchStage(2), 1650), window.setTimeout(() => setResearchStage(3), 2500)]
		return () => timers.forEach((timer) => window.clearTimeout(timer))
	}, [surface, createNeed])

	// Staged receipts after Approve: QuickBooks → SAP → notifications land in sequence and
	// the verified-outcome swap waits for the last one. The Approve handler seeds stage 3
	// directly under reduced motion, so this effect only ever runs the animated chain.
	useEffect(() => {
		if (!approvalRecorded || prefersReducedMotion()) return
		const timers = [window.setTimeout(() => setReconcileStage(1), 750), window.setTimeout(() => setReconcileStage(2), 1500), window.setTimeout(() => setReconcileStage(3), 2250)]
		return () => timers.forEach((timer) => window.clearTimeout(timer))
	}, [approvalRecorded])

	const transition = reducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const }

	return (
		<div ref={rootRef} className={`agentix-prototype ax3-root${embedded ? " ax3-root--embedded" : ""}`}>
			<div className={`ax3-shell${standalone ? "" : " ax3-shell--embedded"}`}>
				{standalone ? <PlatformRail /> : null}
				<AgentRail surface={surface} selectedAgentId={selectedAgentId} attentionCount={attentionCount} approvalRecorded={approvalRecorded} questionAnswered={questionAnswered} runControls={runControls} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} onToday={goToday} onActivity={goActivity} onCreate={startCreate} onOpenAgent={openAgent} onConnections={() => openInspector("connections")} />
				<div className="ax3-app">
					<Header label={label} mobileNavOpen={mobileNavOpen} onMobileNav={() => setMobileNavOpen((current) => !current)} onCommand={openPalette} onInspector={() => { setInspectorSection(null); setDrawer(drawer === "inspector" ? null : "inspector") }} inspectorAvailable={surface === "agent" && Boolean(selectedAgent)} onNotifications={goToday} />
					<div className="ax3-content-shell">
						<main className="ax3-main" id="agentix-main" ref={mainRef}>
							<AnimatePresence mode="wait" initial={false}>
								<motion.div key={`${surface}-${selectedAgentId ?? "none"}`} initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -5 }} transition={transition}>
									{surface === "today" ? <TodaySurface approvalRecorded={approvalRecorded} questionAnswered={questionAnswered} runControls={runControls} onOpenAgent={openAgent} onApproval={() => openDecision("finance", "approval-question")} onQuestion={() => openDecision("tpm", "audience-question")} onActivity={goActivity} /> : null}
									{surface === "agent" && selectedAgent ? <AgentSurface agent={selectedAgent} approvalRecorded={approvalRecorded} questionAnswered={questionAnswered} control={runControls[selectedAgent.id]} extraMessages={extraMessages[selectedAgent.id]} steerPending={steerPendingId === selectedAgent.id} streamingId={streamingId} reconcileStage={reconcileStage} onAnswer={(answer) => { setQuestionAnswered(true); setExtraMessages((current) => ({ ...current, tpm: [...current.tpm, { id: `answer-${Date.now()}`, author: "You", text: answer, time: "Now" }] })); recordEvent("tpm", "Audience decision committed", answer); notify("Decision committed. The existing run resumed.") }} onApproval={() => setDrawer("approval")} onControl={(control) => applyRunControl(selectedAgent.id, control)} onInspector={() => { setInspectorSection(null); setDrawer(drawer === "inspector" ? null : "inspector") }} onInspectorSection={openInspector} /> : null}
									{surface === "create" ? <CreateSurface need={createNeed} stage={createStage} researchStage={researchStage} onStage={setCreateStage} onBack={goToday} onExample={(need) => { setCreateNeed(need); setCreateStage("interview") }} onActivate={() => { const atlas = AGENT_SCENARIOS.find((agent) => agent.id === "tpm")!; setExtraMessages((current) => ({ ...current, tpm: [...current.tpm, { id: `activated-${Date.now()}`, author: "Agentix", text: "Agent v1 is active. The first run is queued: I will reconcile the approved program sources and prepare the steering brief inside the boundaries you set.", time: "Now", tone: "system" }] })); recordEvent("tpm", "Atlas program lead activated as Agent v1", "First run queued · authority bounded"); openAgent(atlas); notify("Atlas program lead activated as Agent v1.") }} onViewSources={() => openInspector("sources")} /> : null}
									{surface === "activity" ? <ActivitySurface sessionEvents={sessionEvents} approvalRecorded={approvalRecorded} onOpenAgent={openAgent} /> : null}
								</motion.div>
							</AnimatePresence>
						</main>
						<AnimatePresence>{drawer === "inspector" ? <Inspector agent={selectedAgent ?? AGENT_SCENARIOS[0]} focusSection={inspectorSection} onClose={() => setDrawer(null)} /> : null}</AnimatePresence>
					</div>
					{surface !== "create" || !createNeed ? <CommandComposer value={composerValue} onChange={setComposerValue} onSubmit={submitComposer} inputRef={composerRef} placeholder={surface === "agent" && selectedAgent ? `Steer ${selectedAgent.name}, ask for an update, or add context…` : surface === "create" ? "Describe what this Agent should own…" : "What should Agentix take care of?"} contextLabel={surface === "agent" && selectedAgent ? `${selectedAgent.version} · authority unchanged` : "Authorized tenant context"} palette={paletteOpen ? { items: paletteFiltered, activeIndex: paletteIndex, query: composerValue.trim() } : null} onPaletteHover={setPaletteActive} onPaletteRun={runPaletteItem} onPaletteDismiss={closePalette} /> : null}
				</div>
			</div>
			<AnimatePresence>{drawer === "approval" ? <ApprovalDrawer onClose={() => setDrawer(null)} onApprove={() => { setApprovalRecorded(true); setReconcileStage(prefersReducedMotion() ? 3 : 0); setDrawer(null); recordEvent("finance", "July close effect set approved", "164 effects · $184,250 dispatching"); notify("Approval recorded. Effects are dispatching and reconciling.") }} /> : null}</AnimatePresence>
			<AnimatePresence>{toast ? <motion.div className="ax3-toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={transition}><CheckCircle size={15} weight="fill" />{toast}</motion.div> : null}</AnimatePresence>
		</div>
	)
}
