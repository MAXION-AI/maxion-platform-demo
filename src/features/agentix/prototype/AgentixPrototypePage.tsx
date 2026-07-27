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
	DotsThree,
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
	Sparkle,
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

const PLATFORM_NAV = [
	{ label: "Overview", icon: House },
	{ label: "Discovery", icon: MagnifyingGlass },
	{ label: "Plan", icon: ListChecks },
	{ label: "Execute", icon: Briefcase },
	{ label: "Agentix", icon: Sparkle, active: true },
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
			<div className="ax3-platform-profile">MC</div>
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

function AgentRail({ surface, selectedAgentId, attentionCount, approvalRecorded, questionAnswered, runControls, mobileOpen, onCloseMobile, onToday, onActivity, onCreate, onOpenAgent }: {
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
				<div className="ax3-rail-label"><span>Agents</span><button type="button" aria-label="Agent options"><DotsThree size={16} /></button></div>
				<div className="ax3-agent-list">
					{AGENT_SCENARIOS.map((agent) => {
						const state = agentPresentation(agent, approvalRecorded, questionAnswered, runControls[agent.id])
						return <button type="button" key={agent.id} className={surface === "agent" && selectedAgentId === agent.id ? "is-active" : ""} onClick={() => onOpenAgent(agent)}><span className="ax3-avatar">{agent.shortName}</span><span><strong>{agent.name}</strong><small><i className={`ax3-mini-dot ax3-mini-dot--${state.tone}`} />{state.label}</small></span></button>
					})}
				</div>
				<div className="ax3-rail-spacer" />
				<button className="ax3-connection-state" type="button"><span className="ax3-mini-dot ax3-mini-dot--success" /><span><strong>Connections ready</strong><small>4 services available</small></span><CaretRight size={12} /></button>
				<div className="ax3-user"><span className="ax3-avatar">MC</span><span><strong>Maya Chen</strong><small>Tenant admin</small></span></div>
			</aside>
		</>
	)
}

function Header({ label, mobileNavOpen, onMobileNav, onFocusComposer, onInspector, inspectorAvailable }: { label: string; mobileNavOpen: boolean; onMobileNav: () => void; onFocusComposer: () => void; onInspector: () => void; inspectorAvailable: boolean }) {
	return (
		<header className="ax3-header">
			<div><button className="ax3-mobile-nav" type="button" aria-label={mobileNavOpen ? "Close Agentix navigation" : "Open Agentix navigation"} aria-expanded={mobileNavOpen} onClick={onMobileNav}><SidebarSimple size={18} /></button><span>{label}</span></div>
			<div className="ax3-header-actions">
				<button type="button" aria-label="Focus Agentix command" onClick={onFocusComposer}><MagnifyingGlass size={15} /><span>Search or ask</span><kbd>⌘K</kbd></button>
				{inspectorAvailable ? <button type="button" aria-label="Open Agent inspector" onClick={onInspector}><SidebarSimple size={16} /></button> : null}
				<button type="button" aria-label="Notifications"><Bell size={16} /></button>
			</div>
		</header>
	)
}

function CommandComposer({ value, onChange, onSubmit, inputRef, placeholder, contextLabel = "Authorized tenant context" }: { value: string; onChange: (value: string) => void; onSubmit: () => void; inputRef: RefObject<HTMLTextAreaElement>; placeholder: string; contextLabel?: string }) {
	return (
		<div className="ax3-composer-wrap">
			<div className="ax3-composer">
				<label className="sr-only" htmlFor="agentix-command">Message Agentix</label>
				<textarea id="agentix-command" ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); onSubmit() } }} placeholder={placeholder} rows={1} />
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
				<span>Sunday, July 26</span>
				<h1>{attentionCount === 0 ? "You’re clear. The work is moving." : `${attentionCount === 1 ? "One decision" : "Two decisions"}. Three agents working.`}</h1>
				<p>{attentionCount === 0 ? "Agentix will bring the next material boundary here." : "Review the boundaries below, or give Agentix something new."}</p>
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
						return <motion.button layout key={agent.id} type="button" onClick={() => onOpenAgent(agent)}><span className="ax3-stream-line"><i className={`ax3-stream-dot ax3-stream-dot--${state.tone}`} /></span><span className="ax3-avatar">{agent.shortName}</span><span className="ax3-stream-copy"><span><strong>{agent.name}</strong><Status tone={state.tone} live={state.tone === "live"}>{state.label}</Status></span><p>{summary}</p><small>{state.detail}</small></span><CaretRight size={13} /></motion.button>
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

function ActivityGroup({ agent, approvalRecorded, questionAnswered }: { agent: AgentScenario; approvalRecorded: boolean; questionAnswered: boolean }) {
	const resolved = (agent.id === "finance" && approvalRecorded) || (agent.id === "tpm" && questionAnswered)
	return (
		<details className="ax3-activity-group" open>
			<summary><span><SpinnerGap className="ax3-spin" size={15} /><strong>{resolved ? "Continuing autonomously" : agent.runState}</strong></span><span>{agent.activity.length} steps<CaretRight size={12} /></span></summary>
			<div>{agent.activity.map((item, index) => { const isLast = index === agent.activity.length - 1; const isResolvedLast = isLast && resolved; const label = isResolvedLast ? agent.id === "finance" ? "Reconciling approved provider effects" : "Publishing the bounded steering brief" : item.title; const detail = isResolvedLast ? agent.id === "finance" ? "Receipts are being matched before the close summary is sent." : "Audience resolved. The decision register is updating now." : item.summary; return <details className="ax3-activity-step" key={item.id}><summary><span className={`ax3-step-icon${isLast && !resolved ? " is-current" : ""}`}>{isLast && !resolved ? <SpinnerGap className="ax3-spin" size={11} /> : <Check size={10} weight="bold" />}</span><span><strong>{label}</strong><small>{detail}</small></span><CaretRight size={11} /></summary><p>{item.detail}{item.evidence ? <button type="button"><FileText size={12} />{item.evidence}</button> : null}</p></details> })}</div>
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

function AgentSurface({ agent, approvalRecorded, questionAnswered, control, extraMessages, onAnswer, onApproval, onControl, onInspector }: { agent: AgentScenario; approvalRecorded: boolean; questionAnswered: boolean; control: RunControl; extraMessages: AgentMessage[]; onAnswer: (answer: string) => void; onApproval: () => void; onControl: (state: RunControl) => void; onInspector: () => void }) {
	const state = agentPresentation(agent, approvalRecorded, questionAnswered, control)
	const allMessages = [...agent.messages, ...extraMessages]
	return (
		<div className="ax3-session">
			<header className="ax3-session-head"><div><span className="ax3-avatar ax3-avatar--large">{agent.shortName}</span><div><div><h1>{agent.name}</h1><Status tone={state.tone} live={state.tone === "live"}>{state.label}</Status></div><p>{agent.mission}</p></div></div><div className="ax3-run-controls">{control === "interrupted" ? <button type="button" onClick={() => onControl("working")}><Play size={14} />Resume</button> : <button type="button" disabled={control === "stopped"} onClick={() => onControl("interrupted")}><Pause size={14} />Interrupt</button>}<button type="button" disabled={control === "stopped"} onClick={() => onControl("stopped")}><Stop size={14} /></button><button type="button" aria-label="Open Agent inspector" onClick={onInspector}><SidebarSimple size={15} /></button></div></header>
			<div className="ax3-thread">
				<div className="ax3-thread-date"><span>Current run</span></div>
				{allMessages.map((message) => <div className={`ax3-message ax3-message--${message.author === "You" ? "user" : "agent"}`} key={message.id}>{message.author === "Agentix" ? <div className="ax3-agent-glyph"><MaxionSpiralMark variant="current" className="ax3-agent-spiral" /></div> : null}<div><span>{message.author}<time>{message.time}</time></span><p>{message.text}</p></div></div>)}
				<ActivityGroup agent={agent} approvalRecorded={approvalRecorded} questionAnswered={questionAnswered} />
				<AnimatePresence initial={false}>
					{agent.id === "tpm" && !questionAnswered && control === "working" ? <Clarification key="clarification" onAnswer={onAnswer} /> : null}
					{agent.id === "finance" && !approvalRecorded && control === "working" ? <ApprovalRequest key="approval" onReview={onApproval} /> : null}
					{((agent.id === "tpm" && questionAnswered) || (agent.id === "finance" && approvalRecorded)) && control === "working" ? <motion.div key="resumed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ax3-resumed"><CheckCircle size={16} weight="fill" /><span><strong>{agent.id === "finance" ? "Approval recorded. Effects are reconciling." : "Audience resolved. The existing run resumed."}</strong><small>No authority or recipient boundary changed.</small></span></motion.div> : null}
				</AnimatePresence>
				<section className="ax3-result"><div className="ax3-result-heading"><CheckCircle size={17} weight="fill" /><span><small>Verified outcome</small><strong>{agent.latestOutcome}</strong></span></div><p>{agent.id === "finance" && approvalRecorded ? "The exact approved set is dispatching. Completion waits for reconciled QuickBooks and SAP receipts." : agent.outcomeDetail}</p><div>{agent.artifacts.slice(0, 2).map((artifact) => <button type="button" key={artifact.id}><FileText size={14} /><span><strong>{artifact.name}</strong><small>{artifact.verification}</small></span><CaretRight size={12} /></button>)}</div></section>
			</div>
		</div>
	)
}

function Inspector({ agent, onClose }: { agent: AgentScenario; onClose: () => void }) {
	return (
		<motion.aside initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} className="ax3-inspector" aria-label={`${agent.name} inspector`}>
			<header><strong>Inspector</strong><button type="button" aria-label="Close Agent inspector" onClick={onClose}><X size={15} /></button></header>
			<section><span>Current responsibility</span><h2>{agent.currentWork}</h2><p>{agent.nextDuty}</p></section>
			<dl><div><dt>Owner</dt><dd>{agent.owner}</dd></div><div><dt>Version</dt><dd>{agent.version}</dd></div><div><dt>Authority</dt><dd>Bounded</dd></div><div><dt>Usage</dt><dd>Inside limit</dd></div></dl>
			<section><span>Authority</span><div className="ax3-authority-note"><LockKey size={14} /><p>Narrowest policy wins. Conversation can steer work but cannot widen tools, recipients, or effects.</p></div><button type="button" className="ax3-text-action"><ShieldCheck size={14} />Review controls</button></section>
			<section><span>Sources</span>{agent.sources.slice(0, 3).map((source) => <div className="ax3-inspector-row" key={source.name}><Database size={13} /><span><strong>{source.name}</strong><small>{source.freshness}</small></span></div>)}</section>
			<section><span>Connections</span>{agent.connections.slice(0, 3).map((connection) => <div className="ax3-inspector-row" key={connection.name}><LinkSimple size={13} /><span><strong>{connection.name}</strong><small>{connection.state}</small></span></div>)}</section>
		</motion.aside>
	)
}

function ApprovalDrawer({ onApprove, onClose }: { onApprove: () => void; onClose: () => void }) {
	return (
		<motion.div className="ax3-drawer-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
			<motion.aside initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }} role="dialog" aria-modal="true" aria-labelledby="approval-drawer-title">
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

function CreateSurface({ need, stage, onStage, onBack, onExample, onActivate }: { need: string; stage: CreateStage; onStage: (stage: CreateStage) => void; onBack: () => void; onExample: (need: string) => void; onActivate: () => void }) {
	if (!need) {
		return <div className="ax3-create ax3-create--empty"><div><AgentixMark size={36} /><h1>What should this Agent own?</h1><p>Describe a responsibility or outcome. Agentix will research authorized context, propose the operating model, and only ask what materially changes the work.</p><span>Try an example</span><div className="ax3-create-examples">{NEED_EXAMPLES.map((example) => <button type="button" key={example.id} onClick={() => onExample(example.prompt)}>{example.label}<CaretRight size={12} /></button>)}</div></div></div>
	}
	return (
		<div className="ax3-create">
			<header><button type="button" onClick={onBack} aria-label="Back"><ArrowLeft size={15} /></button><div><span>New Agent</span><h1>Shape the operating model together</h1><p>Agentix researched first. It only asks what materially changes the work.</p></div></header>
			<div className="ax3-thread">
				<div className="ax3-message ax3-message--user"><div><span>You<time>Now</time></span><p>{need}</p></div></div>
				<div className="ax3-message ax3-message--agent"><div className="ax3-agent-glyph"><MaxionSpiralMark variant="current" className="ax3-agent-spiral" /></div><div><span>Agentix<time>Now</time></span><p>I found a workable operating model using the context and connections you already authorized.</p></div></div>
				<div className="ax3-research-line"><CheckCircle size={16} weight="fill" /><span><strong>Research complete</strong><small>5 approved sources · 21 memory items · 4 connections</small></span><button type="button">View sources</button></div>
				<AnimatePresence mode="wait">
					{stage === "interview" ? <motion.section key="interview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="ax3-interview"><span>Three choices materially change the work</span><h2>Finish the operating boundaries</h2><div className="ax3-question-row"><div><strong>Routine audience</strong><small>Who may receive follow-ups?</small></div><label><input type="radio" name="audience" defaultChecked />Project team only</label><label><input type="radio" name="audience" />Include sponsor with approval</label></div><div className="ax3-question-row"><div><strong>Commitment updates</strong><small>What may Agentix change?</small></div><label><input type="radio" name="updates" defaultChecked />Draft changes for approval</label><label><input type="radio" name="updates" />Update bounded fields</label></div><div className="ax3-question-row"><div><strong>Operating cadence</strong><small>When should it work?</small></div><label><input type="radio" name="cadence" defaultChecked />Weekdays at 8:00 AM</label><label><input type="radio" name="cadence" />On source change</label></div><button type="button" className="ax3-primary-action" onClick={() => onStage("proposal")}>Build operating model<ArrowRight size={14} /></button></motion.section> : <motion.section key="proposal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ax3-proposal"><span>Proposed Agent</span><div className="ax3-proposal-title"><span className="ax3-avatar ax3-avatar--large">AP</span><div><h2>Atlas program lead</h2><p>Keep the ERP modernization decision-ready and moving without masking delivery risk.</p></div></div><div className="ax3-proposal-grid"><section><span>Duties</span><ul><li><Check size={12} />Risk and dependency refresh</li><li><Check size={12} />Steering brief</li><li><Check size={12} />Overdue action follow-up</li></ul></section><section><span>Authority</span><ul><li><LockKey size={12} />Project sources only</li><li><LockKey size={12} />Project-team audience</li><li><LockKey size={12} />Exact approval at threshold</li></ul></section></div><div className="ax3-ready"><CheckCircle size={16} weight="fill" /><span><strong>Ready to activate</strong><small>Owner: Maya Chen · Agent v1 · first run queues once</small></span></div><button type="button" className="ax3-primary-action" onClick={onActivate}>Activate Agent<ArrowRight size={14} /></button></motion.section>}
				</AnimatePresence>
			</div>
		</div>
	)
}

function ActivitySurface({ onOpenAgent }: { onOpenAgent: (agent: AgentScenario) => void }) {
	return <div className="ax3-history"><header><span>Activity</span><h1>Everything Agentix committed</h1><p>Actions, effects, waits, receipts, and verified outcomes—without hidden reasoning.</p></header><div className="ax3-history-day"><span>Today</span>{AGENT_SCENARIOS.map((agent, index) => <button type="button" key={agent.id} onClick={() => onOpenAgent(agent)}><time>{index === 0 ? "9:18" : index === 1 ? "9:06" : "8:42"}</time><span className="ax3-history-line"><i /></span><span className="ax3-avatar">{agent.shortName}</span><span><strong>{agent.latestOutcome}</strong><small>{agent.name} · {agent.outcomeMetric} {agent.outcomeMetricLabel}</small></span><Status tone="success">Verified</Status></button>)}</div><div className="ax3-history-day"><span>Yesterday</span><button type="button"><time>4:32</time><span className="ax3-history-line"><i /></span><span className="ax3-avatar">RO</span><span><strong>Renewal risk register reconciled</strong><small>Revenue operations partner · 18 provider receipts</small></span><Status tone="success">Verified</Status></button></div></div>
}

export function AgentixPrototypePage({ embedded = false }: { embedded?: boolean }) {
	useDocumentTitle("Agentix · North-star prototype · Maxion")
	const location = useLocation()
	const standalone = !embedded && location.pathname === "/agentix-prototype"
	const prefersReducedMotion = useReducedMotion()
	const composerRef = useRef<HTMLTextAreaElement>(null)
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

	const selectedAgent = useMemo(() => AGENT_SCENARIOS.find((agent) => agent.id === selectedAgentId) ?? null, [selectedAgentId])
	const attentionCount = Number(!approvalRecorded) + Number(!questionAnswered)
	const label = surface === "today" ? "Today" : surface === "activity" ? "Activity" : surface === "create" ? "New Agent" : selectedAgent?.name ?? "Agentix"

	const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200) }
	const openAgent = (agent: AgentScenario) => { setSelectedAgentId(agent.id); setSurface("agent"); setMobileNavOpen(false); window.scrollTo({ top: 0, behavior: "auto" }) }
	const goToday = () => { setSelectedAgentId(null); setSurface("today"); setDrawer(null); setMobileNavOpen(false) }
	const goActivity = () => { setSelectedAgentId(null); setSurface("activity"); setDrawer(null); setMobileNavOpen(false) }
	const startCreate = () => { setCreateNeed(""); setCreateStage("interview"); setSurface("create"); setDrawer(null); setMobileNavOpen(false); window.setTimeout(() => composerRef.current?.focus(), 0) }

	const submitComposer = () => {
		const value = composerValue.trim()
		if (!value) return
		if (surface === "agent" && selectedAgent) {
			const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
			setExtraMessages((current) => ({ ...current, [selectedAgent.id]: [...current[selectedAgent.id], { id: `user-${Date.now()}`, author: "You", text: value, time: now }, { id: `agent-${Date.now()}`, author: "Agentix", text: "I attached that to the active run and will apply it at the next safe boundary. It does not widen my authority.", time: "Now", tone: "system" }] }))
			if (runControls[selectedAgent.id] === "stopped") setRunControls((current) => ({ ...current, [selectedAgent.id]: "working" }))
			notify("Agentix acknowledged the steering context.")
		} else {
			setCreateNeed(value); setCreateStage("interview"); setSurface("create")
		}
		setComposerValue("")
	}

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (surface === "create") goToday(); window.setTimeout(() => composerRef.current?.focus(), 0) }
			if (event.key === "Escape") { setDrawer(null); setMobileNavOpen(false) }
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [surface])

	const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const }

	return (
		<div className={`agentix-prototype ax3-root${embedded ? " ax3-root--embedded" : ""}`}>
			<div className={`ax3-shell${standalone ? "" : " ax3-shell--embedded"}`}>
				{standalone ? <PlatformRail /> : null}
				<AgentRail surface={surface} selectedAgentId={selectedAgentId} attentionCount={attentionCount} approvalRecorded={approvalRecorded} questionAnswered={questionAnswered} runControls={runControls} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} onToday={goToday} onActivity={goActivity} onCreate={startCreate} onOpenAgent={openAgent} />
				<div className="ax3-app">
					<Header label={label} mobileNavOpen={mobileNavOpen} onMobileNav={() => setMobileNavOpen((current) => !current)} onFocusComposer={() => composerRef.current?.focus()} onInspector={() => setDrawer(drawer === "inspector" ? null : "inspector")} inspectorAvailable={surface === "agent" && Boolean(selectedAgent)} />
					<div className="ax3-content-shell">
						<main className="ax3-main" id="agentix-main">
							<AnimatePresence mode="wait" initial={false}>
								<motion.div key={`${surface}-${selectedAgentId ?? "none"}`} initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -5 }} transition={transition}>
									{surface === "today" ? <TodaySurface approvalRecorded={approvalRecorded} questionAnswered={questionAnswered} runControls={runControls} onOpenAgent={openAgent} onApproval={() => openAgent(AGENT_SCENARIOS.find((agent) => agent.id === "finance")!)} onQuestion={() => openAgent(AGENT_SCENARIOS.find((agent) => agent.id === "tpm")!)} onActivity={goActivity} /> : null}
									{surface === "agent" && selectedAgent ? <AgentSurface agent={selectedAgent} approvalRecorded={approvalRecorded} questionAnswered={questionAnswered} control={runControls[selectedAgent.id]} extraMessages={extraMessages[selectedAgent.id]} onAnswer={(answer) => { setQuestionAnswered(true); setExtraMessages((current) => ({ ...current, tpm: [...current.tpm, { id: `answer-${Date.now()}`, author: "You", text: answer, time: "Now" }] })); notify("Decision committed. The existing run resumed.") }} onApproval={() => setDrawer("approval")} onControl={(control) => { setRunControls((current) => ({ ...current, [selectedAgent.id]: control })); notify(control === "interrupted" ? "Run preserved at a safe boundary." : control === "stopped" ? "Run stopped. Dispatched effects remain under reconciliation." : "Run resumed from its checkpoint.") }} onInspector={() => setDrawer(drawer === "inspector" ? null : "inspector")} /> : null}
									{surface === "create" ? <CreateSurface need={createNeed} stage={createStage} onStage={setCreateStage} onBack={goToday} onExample={(need) => { setCreateNeed(need); setCreateStage("interview") }} onActivate={() => { setQuestionAnswered(false); openAgent(AGENT_SCENARIOS.find((agent) => agent.id === "tpm")!); notify("Atlas program lead activated as Agent v1.") }} /> : null}
									{surface === "activity" ? <ActivitySurface onOpenAgent={openAgent} /> : null}
								</motion.div>
							</AnimatePresence>
						</main>
						<AnimatePresence>{drawer === "inspector" && selectedAgent ? <Inspector agent={selectedAgent} onClose={() => setDrawer(null)} /> : null}</AnimatePresence>
					</div>
					{surface !== "create" || !createNeed ? <CommandComposer value={composerValue} onChange={setComposerValue} onSubmit={submitComposer} inputRef={composerRef} placeholder={surface === "agent" && selectedAgent ? `Steer ${selectedAgent.name}, ask for an update, or add context…` : surface === "create" ? "Describe what this Agent should own…" : "What should Agentix take care of?"} contextLabel={surface === "agent" && selectedAgent ? `${selectedAgent.version} · authority unchanged` : "Authorized tenant context"} /> : null}
				</div>
			</div>
			<AnimatePresence>{drawer === "approval" ? <ApprovalDrawer onClose={() => setDrawer(null)} onApprove={() => { setApprovalRecorded(true); setDrawer(null); notify("Approval recorded. Effects are dispatching and reconciling.") }} /> : null}</AnimatePresence>
			<AnimatePresence>{toast ? <motion.div className="ax3-toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={transition}><CheckCircle size={15} weight="fill" />{toast}</motion.div> : null}</AnimatePresence>
		</div>
	)
}
