import { ArrowLeft, ArrowRight, Check, CheckCircle, Clock, FileText, FlowArrow, Info, LockKey, MagnifyingGlass, Pause, Play, ShieldCheck, Users, WarningCircle } from "@phosphor-icons/react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { MaxionSpiralMark } from "@/features/platform-prototype/PortalChrome"
import { WORKFLOWS, STORAGE_KEY, readInitiatives, transitionCase, type CaseAction, type InitiativeState, type WorkflowExample, type WorkflowId } from "./initiatives"
import "./agentix-initiatives.css"

export type AgentixAttention = { count: number; audience: boolean; approval: boolean }
export type AgentixIntent = { type: "workflow"; id: WorkflowId } | { type: "import"; id: WorkflowId } | { type: "surface"; id: "today" | "activity" } | { type: "decision"; id: "audience" | "approval" } | { type: "create" }
export type AgentixIntentSignal = { tick: number; intent: AgentixIntent }
type View = "work" | "model" | "discovery"
const STATUS_LABEL = { draft: "Not activated", ready: "Ready to run", running: "Working", waiting: "Needs attention", paused: "Paused", complete: "Outcome verified", declined: "Decision declined" }

function Button({ children, onClick, primary = false, disabled = false, label }: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean; label?: string }) {
	return <button type="button" className={`axi-button${primary ? " axi-button--primary" : ""}`} onClick={onClick} disabled={disabled} aria-label={label}>{children}</button>
}
function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "attention" }) {
	return <span className={`axi-badge axi-badge--${tone}`}>{children}</span>
}
function DemoLabel() { return <span className="axi-demo"><Info size={14} />Interactive demo · simulated systems</span> }

export function OperationalDiscoveryEntry({ onOpen }: { onOpen: (id: WorkflowId) => void }) {
	return <section className="axi-discovery-entry" aria-label="Operational redesign packages">
		<div><span className="axi-eyebrow">Discovery → Agentix</span><h2>From a better process to a working operation.</h2><p>Explore four approved example packages. The existing Discovery workspaces remain below.</p></div>
		<div className="axi-package-links">{WORKFLOWS.map(w => <button type="button" key={w.id} onClick={() => onOpen(w.id)}><FileText size={18} /><span><strong>{w.title}</strong><small>{w.category}</small></span><ArrowRight size={16} /></button>)}</div>
	</section>
}

function DiscoveryEvidence({ workflow: w }: { workflow: WorkflowExample }) {
	return <>
		<section className="axi-section"><span className="axi-eyebrow">The business outcome</span><h2>{w.outcome}</h2><p>Approved example package · v1 · owner: {w.owner}. All records and findings are illustrative, not customer evidence.</p></section>
		<section className="axi-section"><div className="axi-section-heading"><h2>What changes—and why</h2><Badge><Check size={13} />Future state approved in this example</Badge></div><div className="axi-change-list">{w.changes.map((change, i) => <article key={change.before}><span className="axi-step-number">0{i + 1}</span><div><span className="axi-eyebrow">Current state</span><p>{change.before}</p><small>Discovery finding: {change.finding}</small></div><ArrowRight className="axi-change-arrow" size={18} /><div><span className="axi-eyebrow">Approved future state</span><p>{change.after}</p></div></article>)}</div></section>
		<section className="axi-section"><h2>Evidence carried into Agentix</h2><div className="axi-source-list">{w.sources.map(source => <details key={source.title}><summary><FileText size={17} /><span>{source.title}</span></summary><p>{source.detail}</p><small>Illustrative source · package {w.id.toUpperCase()}-v1 · read-only snapshot</small></details>)}</div></section>
		<section className="axi-section"><h2>How success will be verified</h2><ul className="axi-check-list">{w.success.map(check => <li key={check}><ShieldCheck size={17} />{check}</li>)}</ul></section>
	</>
}

export function DiscoveryHandoffWorkspace({ workflowId, onBack, onSend }: { workflowId: WorkflowId; onBack: () => void; onSend: (id: WorkflowId) => void }) {
	const w = WORKFLOWS.find(item => item.id === workflowId)!
	return <div className="axi-root"><header className="axi-topbar"><Button onClick={onBack}><ArrowLeft size={16} />All discoveries</Button><DemoLabel /></header><main className="axi-main axi-main--reading"><header className="axi-page-heading"><span className="axi-eyebrow">Discovery / Operational redesign</span><h1>{w.title}</h1><p>Discovery establishes how the process should work. Agentix maps the approved design to actions, people and connected systems.</p></header><DiscoveryEvidence workflow={w} /><section className="axi-handoff"><div><FlowArrow size={24} /><h2>Ready to turn this design into an initiative?</h2><p>The package preserves its sources, owner, rules and success checks. Sending it creates a draft—not authority to act.</p></div><Button primary onClick={() => onSend(w.id)}>Send to Agentix<ArrowRight size={16} /></Button></section></main></div>
}

function Team({ workflow: w, state }: { workflow: WorkflowExample; state: InitiativeState }) {
	const actors = w.steps[state.stage].actors
	return <section className="axi-team" aria-label="Agent team"><div className="axi-section-heading"><h2>{w.team.length === 1 ? "One agent is sufficient" : `${w.team.length} agents, one accountable coordinator`}</h2></div><p>{w.teamReason}</p><div className="axi-team-grid">{w.team.map((agent, i) => <article key={agent.id} className={state.status === "running" && actors.includes(agent.id) ? "is-working" : ""}><div className="axi-agent-title"><span className="axi-agent-icon">{i === 0 ? <MaxionSpiralMark /> : <Users size={18} />}</span><div><h3>{agent.name}</h3><small>{i === 0 ? "Owns the outcome" : "Scoped specialist"}</small></div>{state.status === "running" && actors.includes(agent.id) ? <Badge>Working</Badge> : null}</div><p>{agent.responsibility}</p><details><summary>Inputs, outputs and tools</summary><dl><dt>Receives</dt><dd>{agent.input}</dd><dt>Returns</dt><dd>{agent.output}</dd><dt>Tool scope</dt><dd>{agent.tools}</dd></dl></details></article>)}</div>{w.team.length > 1 ? <div className="axi-join"><FlowArrow size={17} /><span>Specialist results join at the coordinator. Specialists cannot approve each other or widen their permissions.</span></div> : null}</section>
}

function OperatingModel({ workflow: w, state, onAction, onViewDiscovery }: { workflow: WorkflowExample; state: InitiativeState; onAction: (action: CaseAction) => void; onViewDiscovery: () => void }) {
	const blocked = Boolean(w.accessGap && !state.humanFallback)
	return <>
		<section className="axi-model-intro"><div className="axi-source-stamp"><FileText size={16} /><span>Discovery package {w.id.toUpperCase()}-v1</span><button type="button" onClick={onViewDiscovery}>View source<ArrowRight size={13} /></button></div><h2>The process is mapped. You review the boundaries.</h2><p>Agentix carries the approved future state forward. It chooses the team and execution method; you don’t configure an agent graph.</p></section>
		<Team workflow={w} state={state} />
		<section className="axi-section axi-operating-facts"><div><Clock size={18} /><span><strong>Starts when</strong><p>{w.trigger}</p></span></div><div><LockKey size={18} /><span><strong>Allowed to act, within these limits</strong><p>{w.boundary}</p></span></div><div><FlowArrow size={18} /><span><strong>Connected execution</strong><p>Merge Agent Handler · simulated operation bindings. No Nango or Merge Unified API fallback.</p></span></div></section>
		<details className="axi-mapping"><summary><span>Inspect the step-to-action mapping</span><span>{w.steps.length} stages covered</span></summary><div>{w.steps.map((step, i) => <article key={step.title}><span className="axi-step-number">{i + 1}</span><div><strong>{step.title}</strong><p>{step.detail}</p><small>{step.system} · {step.actors.map(id => w.team.find(agent => agent.id === id)?.name).join(" + ")}</small></div><Badge>{w.gate?.index === i ? w.gate.kind === "human" ? "Human step" : w.gate.kind === "approval" ? "Approval" : "Recovery" : "Automatic"}</Badge></article>)}</div></details>
		{blocked ? <section className="axi-boundary" aria-label="Activation blocker"><WarningCircle size={22} /><div><h3>One capability needs a different execution method</h3><p>{w.accessGap}</p><Button onClick={() => onAction("human-fallback")}>Keep payroll access as a human step</Button></div></section> : null}
		{state.humanFallback ? <p className="axi-inline-success"><CheckCircle size={18} />Payroll access is a tracked human step. No additional permission has been granted.</p> : null}
		{state.status === "draft" ? <section className="axi-activation"><div><strong>{blocked ? "Activation held until every step has a safe method" : "Ready for owner activation"}</strong><p>Owner: {w.owner}. Activation applies this example’s scope and controls. No live connections will be used.</p></div><Button primary disabled={blocked || !state.imported} onClick={() => onAction("activate")}>Activate initiative<ArrowRight size={16} /></Button></section> : <p className="axi-inline-success"><CheckCircle size={18} />Operating model v1 activated. Changes to scope or authority would require a new review.</p>}
	</>
}

function Workstream({ workflow: w, state, onAction }: { workflow: WorkflowExample; state: InitiativeState; onAction: (action: CaseAction) => void }) {
	const complete = state.status === "complete"
	const waiting = state.status === "waiting"
	const started = !["draft", "ready"].includes(state.status)
	const finished = complete ? w.steps.length : state.stage
	return <>
		<section className={`axi-outcome${complete ? " is-complete" : ""}`} aria-live="polite"><div className="axi-section-heading"><Badge tone={complete ? "success" : waiting || state.status === "declined" ? "attention" : "neutral"}>{complete ? <CheckCircle size={14} /> : <Clock size={14} />}{STATUS_LABEL[state.status]}</Badge><small>{w.caseId} · sample case</small></div><h2>{complete ? w.result : state.status === "declined" ? "Variance declined. No ERP resolution was posted." : w.caseName}</h2><p>{complete ? w.outcome : state.status === "declined" ? "The exception remains open for the AP owner. Completed evidence checks are retained; no payment was released." : w.description}</p>
			{state.status === "ready" ? <Button primary onClick={() => onAction("start")}><Play size={16} weight="fill" />Run sample case</Button> : null}
			{state.status === "running" ? <Button onClick={() => onAction("pause")}><Pause size={16} />Pause at next boundary</Button> : null}
			{state.status === "paused" ? <Button primary onClick={() => onAction("resume")}><Play size={16} />Resume case</Button> : null}
			{complete || state.status === "declined" ? <Button onClick={() => onAction("replay")}>Replay sample case</Button> : null}
		</section>
		{waiting && w.gate ? <section className="axi-boundary" aria-label="Case boundary"><WarningCircle size={22} /><div><span className="axi-eyebrow">{w.gate.kind === "reconcile" ? "Recovery checkpoint · demo control" : w.gate.kind === "human" ? "Human fulfillment · demo control" : "Business approval · AP owner"}</span><h3>{w.gate.title}</h3><p>{w.gate.detail}</p><div className="axi-actions"><Button primary onClick={() => onAction("resolve")}>{w.gate.action}<ArrowRight size={16} /></Button>{w.gate.kind === "approval" ? <Button onClick={() => onAction("decline")}>Decline variance</Button> : null}</div></div></section> : null}
		{complete ? <section className="axi-section" aria-label="Verified outcome evidence"><h2>What was verified</h2><ul className="axi-check-list">{w.success.map(check => <li key={check}><CheckCircle size={18} />{check}</li>)}</ul><div className="axi-records">{w.records.map(record => <div key={record.name}><strong>{record.name}</strong><p>{record.value}</p><small>Simulated read-back evidence</small></div>)}</div><p className="axi-footnote">This demonstrates the expected product behavior. It is not proof of a live provider action or a measured business improvement.</p></section> : null}
		{started ? <section className="axi-section" aria-label="Case activity"><div className="axi-section-heading"><h2>Activity</h2><span>{finished} of {w.steps.length} stages verified</span></div><div className="axi-progress" role="progressbar" aria-label="Case completion" aria-valuemin={0} aria-valuemax={w.steps.length} aria-valuenow={finished}><span style={{ width: `${finished / w.steps.length * 100}%` }} /></div><div className="axi-timeline">{w.steps.map((step, i) => {
			const done = complete || i < state.stage
			const current = !complete && i === state.stage
			return <details key={step.title} className={`${done ? "is-done" : current ? "is-current" : "is-pending"}`} open={current || undefined}><summary><span className="axi-timeline-dot">{done ? <Check size={13} /> : i + 1}</span><span><strong>{step.title}</strong><small>{step.actors.map(id => w.team.find(agent => agent.id === id)?.name).join(" + ")}{step.actors.length > 1 ? " · parallel" : ""}</small></span><span className="axi-step-status">{done ? "Verified" : current ? waiting ? "Waiting" : state.status === "paused" ? "Paused" : state.status === "declined" ? "Declined" : "Working" : "Next"}</span></summary><div className="axi-step-detail"><p>{step.detail}</p><code>{done ? step.evidence : current ? `Current step · ${step.system} · no completion receipt yet` : "This stage has not started."}</code></div></details>
		})}</div></section> : <section className="axi-section"><h2>Mostly autonomous. Human judgment where it matters.</h2><p>{w.teamReason}</p><p className="axi-footnote">About 30 seconds to explore this simulated case. You can pause, leave the module and return. Browser storage preserves demo progress.</p></section>}
		<details className="axi-audit"><summary>Decision and recovery record <span>{state.notes.length} events</span></summary><ol>{state.notes.map((note, i) => <li key={`${i}-${note}`}>{note}</li>)}</ol></details>
	</>
}

export function AgentixInitiativesPage({ intentSignal, onAttentionChange, onOpenDiscovery }: { intentSignal?: AgentixIntentSignal | null; onAttentionChange?: (attention: AgentixAttention) => void; onOpenDiscovery: (id: WorkflowId) => void }) {
	const [store, setStore] = useState(readInitiatives)
	const [selected, setSelected] = useState<WorkflowId | null>(null)
	const [view, setView] = useState<View>("model")
	const [teamOpen, setTeamOpen] = useState(false)
	const [input, setInput] = useState("")
	const [notice, setNotice] = useState("")
	const [storageError, setStorageError] = useState(false)
	const rootRef = useRef<HTMLDivElement>(null)
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const headingRef = useRef<HTMLHeadingElement>(null)
	const seen = useRef(0)
	const w = WORKFLOWS.find(item => item.id === selected)
	const s = w ? store[w.id] : null
	const act = (id: WorkflowId, action: CaseAction) => setStore(current => ({ ...current, [id]: transitionCase(current[id], WORKFLOWS.find(item => item.id === id)!, action) }))
	const open = (id: WorkflowId, imported = false) => { setSelected(id); setView(imported || store[id].status === "draft" ? "model" : "work"); setTeamOpen(false); setInput(""); setNotice(""); if (imported) act(id, "import") }
	useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); setStorageError(false) } catch { setStorageError(true) } }, [store])
	useEffect(() => {
		const waiting = Object.values(store).filter(state => state.status === "waiting")
		onAttentionChange?.({ count: waiting.length, approval: store.invoice.status === "waiting", audience: store.onboarding.status === "waiting" })
	}, [store, onAttentionChange])
	useEffect(() => {
		if (!Object.values(store).some(state => state.status === "running")) return
		const timer = window.setTimeout(() => setStore(current => Object.fromEntries(WORKFLOWS.map(example => [example.id, transitionCase(current[example.id], example, "tick")])) as typeof current), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 1700)
		return () => window.clearTimeout(timer)
	}, [store])
	useEffect(() => {
		if (!intentSignal || seen.current === intentSignal.tick) return
		seen.current = intentSignal.tick
		const intent = intentSignal.intent
		if (intent.type === "import" || intent.type === "workflow") { open(intent.id, intent.type === "import"); return }
		if (intent.type === "decision") { open(intent.id === "approval" ? "invoice" : "onboarding"); setView("work"); return }
		setSelected(null); setNotice("")
		if (intent.type === "create") window.requestAnimationFrame(() => composerRef.current?.focus())
	}, [intentSignal]) // Intent is consumed once; revisiting the module must not replay it.
	useEffect(() => { headingRef.current?.focus({ preventScroll: true }); rootRef.current?.querySelector(".axi-main")?.scrollTo?.({ top: 0 }) }, [selected, view])
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (rootRef.current?.closest("[hidden]")) return
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); event.stopImmediatePropagation(); composerRef.current?.focus() }
			if (event.key === "Escape" && teamOpen) { event.preventDefault(); event.stopImmediatePropagation(); setTeamOpen(false) }
		}
		window.addEventListener("keydown", onKey, true); return () => window.removeEventListener("keydown", onKey, true)
	}, [teamOpen])
	const submit = () => {
		const text = input.trim().replace(/\s+/g, " ")
		if (!text) return
		if (!w || !s) {
			const matched = /invoice|payable|three.way/i.test(text) ? "invoice" : /onboard|employee|hire|hr\b/i.test(text) ? "onboarding" : /stock|inventory|supply|replenish/i.test(text) ? "inventory" : /incident|triage|servicenow|ticket/i.test(text) ? "service" : null
			if (matched) { open(matched); setNotice("Matched your need to an illustrative Discovery package. Review the evidence before importing; no agent has been activated.") }
			else setNotice("This demo covers the four workflows below. Choose the closest example to explore its operating model; arbitrary task generation is not connected.")
			return
		}
		let reply = /why|agent|team|parallel/i.test(text) ? w.teamReason : /source|discovery|evidence/i.test(text) ? `This initiative uses Discovery package ${w.id.toUpperCase()}-v1. ${w.changes[0].finding} Open Discovery to inspect the approved changes and illustrative evidence.` : /permission|approval|allowed|scope|policy/i.test(text) ? w.boundary : `Current state: ${STATUS_LABEL[s.status]}. The intended outcome is: ${w.outcome} This demo can explain the team, sources and permissions, or pause and resume a running case.`
		if (/^pause\b/i.test(text)) { if (s.status === "running") { act(w.id, "pause"); reply = "The sample case is paused at its current boundary. Completed work is preserved." } else reply = "There is no running work to pause. The current case state is unchanged." }
		if (/^resume\b/i.test(text)) { if (s.status === "paused") { act(w.id, "resume"); reply = "Resuming the same sample case from its preserved step." } else reply = "This case is not paused. A waiting approval or human task must be resolved explicitly." }
		setStore(current => ({ ...current, [w.id]: { ...current[w.id], messages: [...current[w.id].messages, { role: "user" as const, text }, { role: "agent" as const, text: reply }].slice(-20) } }))
		setInput("")
	}
	const action = (actionName: CaseAction) => { if (!w) return; act(w.id, actionName); if (actionName === "activate") setView("work") }
	return <div className="axi-root" ref={rootRef}>
		<header className="axi-topbar"><div>{w ? <Button onClick={() => { setSelected(null); setNotice(""); setInput("") }}><ArrowLeft size={16} />Initiatives</Button> : <span className="axi-module-brand"><MaxionSpiralMark />Agentix</span>}</div><DemoLabel /></header>
		<main className="axi-main" aria-label="Agentix initiatives">
			{storageError ? <p className="axi-storage-warning" role="alert">Browser storage is unavailable. This demo will keep working, but progress will not survive a refresh.</p> : null}
			{!w || !s ? <>
				<header className="axi-home-heading"><span className="axi-eyebrow">Better processes. Verified outcomes.</span><h1 ref={headingRef} tabIndex={-1}>Put better processes to work.</h1><p>Discovery finds what needs to change. Agentix carries the approved process through your systems, with the smallest team needed.</p></header>
				<form className="axi-composer axi-home-composer" onSubmit={event => { event.preventDefault(); submit() }}><label htmlFor="axi-need">What should Agentix take care of?</label><textarea id="axi-need" ref={composerRef} rows={2} value={input} maxLength={2000} onChange={event => setInput(event.target.value)} placeholder="Resolve invoice exceptions, coordinate onboarding, keep inventory replenished…" /><div><small><LockKey size={13} />Outcome first. No model or agent-count settings.</small><button type="submit" className="axi-send" disabled={!input.trim()} aria-label="Explore operational need"><ArrowRight size={19} /></button></div></form>
				{notice ? <p className="axi-notice" role="status">{notice}</p> : null}
				<section className="axi-section" aria-label="Enterprise workflow examples"><div className="axi-section-heading"><div><h2>Explore four enterprise workflows</h2><p>One single-agent case. Three coordinated teams.</p></div><span className="axi-eyebrow">Illustrative examples</span></div><div className="axi-initiative-list">{WORKFLOWS.map(example => <button type="button" key={example.id} onClick={() => open(example.id)}><span className="axi-list-icon">{example.team.length === 1 ? <MaxionSpiralMark /> : <Users size={23} />}</span><span className="axi-list-copy"><small>{example.category}</small><strong>{example.title}</strong><span>{example.description}</span></span><span className="axi-list-meta"><Badge>{example.team.length} {example.team.length === 1 ? "agent" : "agents"}</Badge><small>{store[example.id].status === "draft" ? "Discovery package ready" : STATUS_LABEL[store[example.id].status]}</small></span><ArrowRight size={18} /></button>)}</div></section>
				<p className="axi-footnote">Every initiative has one owner and one outcome. Agents are an execution choice—not a separate product category.</p>
			</> : <>
				<header className="axi-page-heading"><div className="axi-section-heading"><span className="axi-eyebrow">{w.category} / Initiative</span><Badge>{w.team.length} {w.team.length === 1 ? "agent" : "agents"}</Badge></div><h1 ref={headingRef} tabIndex={-1}>{w.title}</h1><p>{w.outcome}</p></header>
				<nav className="axi-tabs" aria-label="Initiative views">{([ ["work", "Work"], ["model", "Operating model"], ["discovery", "Discovery"] ] as const).map(([id, label]) => <button type="button" key={id} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>{label}{id === "work" && s.status === "waiting" ? <span className="axi-attention-dot" /> : null}</button>)}{view !== "model" ? <button type="button" className="axi-team-toggle" aria-expanded={teamOpen} onClick={() => setTeamOpen(current => !current)}><Users size={16} />{teamOpen ? "Hide team" : "Show team"}</button> : null}</nav>
				{notice ? <p className="axi-notice" role="status">{notice}</p> : null}
				{teamOpen && view !== "model" ? <Team workflow={w} state={s} /> : null}
				{view === "discovery" ? <><DiscoveryEvidence workflow={w} /><Button onClick={() => onOpenDiscovery(w.id)}>Open in Discovery<ArrowRight size={16} /></Button></> : !s.imported ? <section className="axi-import-prompt"><FileText size={28} /><h2>Start with the approved Discovery package.</h2><p>The current-state findings, future-state process, controls and success measures are already prepared. Import them to see how Agentix proposes to execute the work.</p><Button primary onClick={() => action("import")}>Import Discovery package<ArrowRight size={16} /></Button><Button onClick={() => onOpenDiscovery(w.id)}>Review in Discovery</Button></section> : view === "model" ? <OperatingModel workflow={w} state={s} onAction={action} onViewDiscovery={() => setView("discovery")} /> : s.status === "draft" ? <section className="axi-import-prompt"><ShieldCheck size={28} /><h2>Review the operating model before activation.</h2><p>Imported evidence is not permission to act. Agentix has prepared the team, method and boundaries for your review.</p><Button primary onClick={() => setView("model")}>Review operating model<ArrowRight size={16} /></Button></section> : <Workstream workflow={w} state={s} onAction={action} />}
				{s.messages.length ? <section className="axi-conversation" aria-label="Initiative conversation">{s.messages.map((message, i) => <article key={i} className={message.role === "user" ? "is-user" : ""}><strong>{message.role === "user" ? "You" : "Agentix"}</strong><p>{message.text}</p></article>)}</section> : null}
				<form className="axi-composer axi-work-composer" onSubmit={event => { event.preventDefault(); submit() }}><label htmlFor="axi-message">Ask about this initiative</label><textarea ref={composerRef} id="axi-message" rows={1} maxLength={2000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit() } }} placeholder="Why this team? What is it allowed to do?" /><div><small>Contextual demo responses · ⌘K to focus</small><button type="submit" className="axi-send" disabled={!input.trim()} aria-label="Send message to Agentix"><ArrowRight size={19} /></button></div></form>
			</>}
		</main>
	</div>
}
