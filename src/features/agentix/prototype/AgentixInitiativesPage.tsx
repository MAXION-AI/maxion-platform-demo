import { ArrowLeft, ArrowRight, ArrowUp, CaretDown, CaretRight, CheckCircle, FileText, Info, MagnifyingGlass, Pause, Play, Plus, ShieldCheck, Users, X } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { MaxionSpiralMark } from "@/features/platform-prototype/PortalChrome"
import { WORKFLOWS, type WorkflowId } from "./initiatives"
import { changeWork, initialWorkspace, matchWorkflow, newWork, readWorkspace, steerWork, STEP_INTERVAL, WORKSPACE_KEY, workFor, type WorkAction } from "./workspaceState"
import { Activity, AgentTeam, Button, Decision, DiscoveryEvidence, Intro, Outcome, OutcomeChecks, WorkStatus } from "./WorkspaceParts"
import "./agentix-initiatives.css"
import "./workspace.css"

export type AgentixAttention = { count: number; audience: boolean; approval: boolean }
export type AgentixIntent = { type: "workflow"; id: WorkflowId } | { type: "import"; id: WorkflowId } | { type: "surface"; id: "today" | "activity" } | { type: "decision"; id: "audience" | "approval" } | { type: "create" }
export type AgentixIntentSignal = { tick: number; intent: AgentixIntent }

export function OperationalDiscoveryEntry({ onOpen }: { onOpen: (id: WorkflowId) => void }) {
	return <section className="agw-discovery-packages" aria-label="Operational redesign packages"><details>
		<summary><span><FileText size={18} /><strong>Process designs ready for Agentix</strong></span><span>4 completed designs<CaretDown size={16} /></span></summary>
		<p>Review an approved process design, then carry its evidence and controls into Agentix.</p>
		<div>{WORKFLOWS.map(w => <button type="button" key={w.id} onClick={() => onOpen(w.id)}><span><strong>{w.title}</strong><small>{w.category} · Approved design</small></span><ArrowRight size={18} /></button>)}</div>
	</details></section>
}

export function DiscoveryHandoffWorkspace({ workflowId, onBack, onSend }: { workflowId: WorkflowId; onBack: () => void; onSend: (id: WorkflowId) => void }) {
	const w = workFor(workflowId)
	return <div className="axi-root agw-discovery-detail"><header className="axi-topbar"><Button onClick={onBack}><ArrowLeft size={16} />All discoveries</Button><span className="agw-demo-label"><Info size={14} />Demo workspace</span></header>
		<main className="axi-main axi-main--reading"><header className="axi-page-heading"><span className="axi-eyebrow">Discovery / Completed process design</span><h1>{w.title}</h1><p>The process, technical assessment and controls are ready. Agentix will prepare an operating plan from this approved design.</p></header>
		<section className="agw-handoff-summary"><div><span className="agw-status is-complete"><CheckCircle size={15} />Ready for handoff</span><p>Carry the process, {w.sources.length} evidence sources, owner and success checks forward. Review the proposed scope in the same workspace where the agents will work.</p></div><Button primary onClick={() => onSend(w.id)}>Send to Agentix<ArrowRight size={16} /></Button></section>
		<DiscoveryEvidence workflow={w} />
		</main></div>
}

export function AgentixInitiativesPage({ intentSignal, onAttentionChange, onOpenDiscovery }: { intentSignal?: AgentixIntentSignal | null; onAttentionChange?: (attention: AgentixAttention) => void; onOpenDiscovery: (id: WorkflowId) => void }) {
	const [state, setState] = useState(readWorkspace)
	const [query, setQuery] = useState("")
	const newInput = state.newDraft ?? ""
	const setNewInput = (newDraft: string) => setState(current => ({ ...current, newDraft }))
	const [notice, setNotice] = useState("")
	const [sourceOpen, setSourceOpen] = useState(false)
	const [showContext, setShowContext] = useState(false)
	const [showList, setShowList] = useState(false)
	const [chooseDiscovery, setChooseDiscovery] = useState(false)
	const [storageError, setStorageError] = useState(false)
	const [confirmReset, setConfirmReset] = useState(false)
	const rootRef = useRef<HTMLDivElement>(null)
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const scrollRef = useRef<HTMLDivElement>(null)
	const nearBottom = useRef(true)
	const seen = useRef(0)
	const workflow = state.selected ? workFor(state.selected) : null
	const work = state.selected ? state.works[state.selected] : null
	const input = work?.draft ?? newInput
	const open = (id: WorkflowId) => { setState(current => ({ ...current, selected: id })); setShowList(false); setShowContext(false); setSourceOpen(false); setChooseDiscovery(false); setNotice("") }
	const closeContext = () => { setShowContext(false); window.requestAnimationFrame(() => { const trigger = rootRef.current?.querySelector<HTMLButtonElement>(".agw-context-toggle"); if (trigger?.offsetParent) trigger.focus() }) }
	const startNew = () => { setState(current => ({ ...current, selected: null })); setShowList(false); setChooseDiscovery(false); setNotice(""); window.requestAnimationFrame(() => composerRef.current?.focus()) }
	const act = (action: WorkAction, evidence?: string) => { if (!workflow) return; setState(current => ({ ...current, works: { ...current.works, [workflow.id]: changeWork(current.works[workflow.id], workflow, action, evidence) } })) }
	const setInput = (text: string) => { if (!state.selected) setNewInput(text); else setState(current => ({ ...current, works: { ...current.works, [state.selected!]: { ...current.works[state.selected!], draft: text } } })) }
	useEffect(() => { try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state)); setStorageError(false) } catch { setStorageError(true) } }, [state])
	useEffect(() => {
		const timer = window.setInterval(() => setState(current => {
			let changed = false
			const works = { ...current.works }
			for (const w of WORKFLOWS) { const next = changeWork(works[w.id], w, "tick"); if (next !== works[w.id]) { works[w.id] = next; changed = true } }
			return changed ? { ...current, works } : current
		}), STEP_INTERVAL)
		return () => window.clearInterval(timer)
	}, [])
	useEffect(() => { onAttentionChange?.({ count: Object.values(state.works).filter(w => w.status === "waiting").length, approval: state.works.invoice.waitingFor === "approval", audience: state.works.onboarding.waitingFor === "human" }) }, [state.works, onAttentionChange])
	useEffect(() => {
		if (!intentSignal || seen.current === intentSignal.tick) return
		seen.current = intentSignal.tick
		const intent = intentSignal.intent
		if (intent.type === "workflow" || intent.type === "import") {
			open(intent.id)
			if (intent.type === "import") {
				const canPrepare = ["draft", "ready", "scheduled"].includes(state.works[intent.id].status)
				if (canPrepare && state.works[intent.id].status !== "draft") setState(current => ({ ...current, works: { ...current.works, [intent.id]: newWork() } }))
				setNotice(canPrepare ? "Discovery design received. The proposed scope is ready for your review; no authority to act has been granted." : "This design is already linked to the initiative. Existing work and decisions are preserved.")
			}
		}
		else if (intent.type === "decision") open(intent.id === "approval" ? "invoice" : "onboarding")
		else if (intent.type === "create") startNew()
		else { setShowList(true); setQuery("") }
	}, [intentSignal])
	useEffect(() => { scrollRef.current?.scrollTo?.({ top: 0 }); nearBottom.current = false }, [state.selected])
	useEffect(() => { if (nearBottom.current) scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: "auto" }) }, [work?.messages.length])
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => { if (rootRef.current?.closest("[hidden]")) return; if (event.key === "Escape") { if (showContext) closeContext(); setShowList(false); setChooseDiscovery(false) } }
		window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey)
	}, [showContext])
	useEffect(() => { if (rootRef.current?.closest("[hidden]")) return; window.requestAnimationFrame(() => { if (showList) rootRef.current?.querySelector<HTMLInputElement>(".agw-search input")?.focus(); else rootRef.current?.querySelector<HTMLHeadingElement>(".agw-work-heading h1")?.focus({ preventScroll: true }) }) }, [showList, state.selected])
	const prepare = (id: WorkflowId, brief: string) => {
		const current = state.works[id]
		if (!["draft", "ready", "scheduled"].includes(current.status)) { open(id); setNotice("There’s already work underway for this process. Continue in its existing workspace; nothing was restarted."); return }
		setState(value => ({ ...value, selected: id, works: { ...value.works, [id]: { ...newWork(), origin: brief ? "prompt" : "discovery", brief, messages: brief ? [{ id: `${Date.now()}-brief`, role: "user", text: brief }] : [] } } }))
		setNewInput(""); setShowList(false); setChooseDiscovery(false); setNotice("")
	}
	const submit = (value = input) => {
		const text = value.trim()
		if (!text) return
		if (!workflow || !work) {
			const id = matchWorkflow(text)
			if (id) prepare(id, text)
			else setNotice("This prototype supports incident triage, invoice exceptions, onboarding and inventory. Your brief is preserved; choose a process below to explore it. Arbitrary agent creation isn’t connected.")
			return
		}
		nearBottom.current = true
		setState(current => ({ ...current, works: { ...current.works, [workflow.id]: steerWork(current.works[workflow.id], workflow, text) } }))
	}
	const filtered = WORKFLOWS.filter(w => `${w.title} ${w.caseId} ${w.category}`.toLowerCase().includes(query.trim().toLowerCase()))
	return <div ref={rootRef} className={`agw-root${showList ? " is-list-open" : ""}${showContext ? " is-context-open" : ""}`}>
		<aside className="agw-work-rail" aria-label="Agentix work list"><header><span><MaxionSpiralMark />Agentix</span><button type="button" className="agw-icon-button" onClick={startNew} aria-label="Create new work" title="New work"><Plus size={19} /></button></header>
			<label className="agw-search"><MagnifyingGlass size={16} /><input aria-label="Search Agentix work" placeholder="Find work…" value={query} onChange={event => setQuery(event.target.value)} /></label>
			<div className="agw-rail-section-title">Your work<span>{filtered.length}</span></div><nav aria-label="Initiatives">{filtered.map(w => <button type="button" key={w.id} className={`agw-work-item${state.selected === w.id ? " is-selected" : ""}`} aria-current={state.selected === w.id ? "page" : undefined} onClick={() => open(w.id)}><span className="agw-work-title">{w.title}{state.works[w.id].priority === "High" ? <span title="High priority" aria-label="High priority">↑</span> : null}</span><span className="agw-work-category">{w.category}</span><WorkStatus work={state.works[w.id]} /></button>)}</nav>
			{!filtered.length ? <div className="agw-no-results"><p>No work matches “{query}”.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div> : null}
			<button type="button" className="agw-new-work" onClick={startNew}><Plus size={16} />New work</button>
			<footer><details><summary><Info size={15} />Demo workspace<CaretDown size={13} /></summary><p>Simulated agents and connected systems. Chat uses scripted responses. Changes stay in this browser; no external actions are performed.</p>{confirmReset ? <div className="agw-reset-confirm"><p>Reset all four Agentix demo items and their conversations? Discovery work is kept.</p><Button onClick={() => { setState(initialWorkspace()); setConfirmReset(false); setNotice(""); setShowList(false); setShowContext(false); setQuery("") }}>Reset demo workspace</Button><Button onClick={() => setConfirmReset(false)}>Keep my work</Button></div> : <button className="agw-reset-link" type="button" onClick={() => setConfirmReset(true)}>Reset demo</button>}</details></footer>
		</aside>
		<main className="agw-workspace" aria-label="Agentix workspace"><header className="agw-work-header"><button type="button" className="agw-icon-button agw-list-toggle" aria-label="Show all work" onClick={() => setShowList(true)}><ArrowLeft size={20} /></button><div className="agw-work-heading">{workflow ? <h1 tabIndex={-1}>{workflow.title}</h1> : <span>New work</span>}<small>{workflow ? `${workflow.caseId} · ${workflow.caseName}` : "Start with an outcome or a Discovery design"}</small></div><div className="agw-header-actions">{work ? <>{["waiting", "complete"].includes(work.status) ? <button type="button" className="agw-status-jump" aria-label={work.status === "complete" ? "View verified outcome" : "Review current request"} onClick={() => { setShowContext(false); window.requestAnimationFrame(() => scrollRef.current?.querySelector(work.status === "complete" ? ".agw-result" : ".agw-decision")?.scrollIntoView({ block: "start", behavior: "auto" })) }}><WorkStatus work={work} /><CaretDown size={12} /></button> : <WorkStatus work={work} />}<button type="button" className="agw-icon-button" disabled={!["running", "paused"].includes(work.status)} title={work.status === "paused" ? "Resume work" : work.status === "running" ? "Pause work" : "No active action to pause"} aria-label={work.status === "paused" ? "Resume work" : "Pause work"} onClick={() => act(work.status === "paused" ? "resume" : "pause")}>{work.status === "paused" ? <Play size={17} /> : <Pause size={17} />}</button><button type="button" className="agw-icon-button agw-context-toggle" aria-label="Show agent context" aria-expanded={showContext} onClick={() => setShowContext(value => !value)}><Users size={18} /><span>{workflow?.team.length} {workflow?.team.length === 1 ? "agent" : "agents"}</span></button></> : null}</div></header>
			<div className="agw-body"><section className="agw-conversation-pane" aria-label="Conversation and activity"><div className="agw-scroll" ref={scrollRef} onScroll={event => { const node = event.currentTarget; nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100 }}>
				{storageError ? <p className="agw-notice" role="alert">Browser storage is unavailable. You can keep working, but changes won’t survive a refresh.</p> : null}
				{notice ? <p className="agw-notice" role="status">{notice}</p> : null}
				{workflow && work ? <div className="agw-thread" key={workflow.id}>
					<button type="button" className="agw-source-link" onClick={() => { setSourceOpen(true); setShowContext(true) }}><FileText size={14} />{work.origin === "discovery" ? "From Discovery" : "Brief + relevant Discovery context"}<span>Design v1</span><CaretRight size={13} /></button>
					<Intro workflow={workflow} work={work} />
					{work.status === "draft" ? <section className="agw-proposal" aria-label="Proposed operating plan"><h2>Here’s what I’ll take care of.</h2><p>{workflow.outcome}</p><dl><dt>When to act</dt><dd>{workflow.trigger}</dd><dt>Within these limits</dt><dd>{workflow.boundary}</dd>{workflow.accessGap ? <><dt>Human dependency</dt><dd>Payroll access stays with the payroll owner. I’ll track that task and require a fulfillment reference before declaring readiness.</dd></> : null}</dl><div className="agw-proposal-footer"><span>Owner: {workflow.owner}<small>Activation confirms this scope, not unrestricted access.</small></span><Button primary onClick={() => act("activate")}>Activate and start<ArrowRight size={16} /></Button></div></section> : null}
					{work.status === "ready" || work.status === "scheduled" ? <div className="agw-start"><Button primary onClick={() => act("start")}>{work.status === "scheduled" ? "Run stock review now" : "Triage this incident"}<ArrowRight size={16} /></Button><span>{work.status === "scheduled" ? "The recurring schedule stays unchanged." : "Within the owner’s already-approved scope."}</span></div> : null}
					{work.status === "paused" ? <div className="agw-paused" role="status"><Pause size={16} /><div><strong>Paused before the next action</strong><p>Progress is saved. Tell me what to change, or resume when you’re ready.</p></div><Button onClick={() => act("resume")}>Resume<Play size={14} /></Button></div> : null}
					{work.holdNotifications && work.waitingFor !== "notification" && work.status !== "complete" ? <p className="agw-instruction"><Pause size={14} />Notifications held by your instruction</p> : null}
					<Decision workflow={workflow} work={work} onAction={act} />
					<Outcome workflow={workflow} work={work} />
					<Activity workflow={workflow} work={work} />
					<section className="agw-chat-messages" aria-label="Initiative conversation" aria-live="polite">{work.messages.map(message => <article className={`agw-message is-${message.role}`} key={message.id}>{message.role === "agent" ? <span className="agw-message-mark"><MaxionSpiralMark variant="current" /></span> : null}<div><span className="agw-message-author">{message.role === "user" ? "You" : "Agentix"}</span><p>{message.text}</p></div></article>)}</section>
				</div> : <section className="agw-new"><span className="agw-new-mark"><MaxionSpiralMark variant="current" /></span><h1>What can we take off your plate?</h1><p>Describe the outcome. Agentix finds the context, proposes how to operate, and brings you the decisions that need you.</p><button type="button" className="agw-discovery-choice" aria-expanded={chooseDiscovery} onClick={() => setChooseDiscovery(value => !value)}><FileText size={20} /><span>Start from Discovery<small>Use an approved process, its evidence and controls</small></span><CaretDown size={16} /></button>{chooseDiscovery ? <div className="agw-design-choices">{WORKFLOWS.map(w => <button type="button" key={w.id} onClick={() => prepare(w.id, "")}><span>{w.title}<small>{w.sources.length} sources · Design v1</small></span><ArrowRight size={16} /></button>)}</div> : <div className="agw-prompts"><span>Or try a brief</span>{["Triage new ServiceNow incidents", "Coordinate employee onboarding", "Keep warehouse inventory replenished"].map(prompt => <button type="button" key={prompt} onClick={() => { setNewInput(prompt); composerRef.current?.focus() }}>{prompt}<ArrowRight size={14} /></button>)}</div>}</section>}
			</div>
			<form className="agw-composer-wrap" onSubmit={event => { event.preventDefault(); submit() }}><div className="agw-composer">{workflow && work && work.messages.length === 0 ? <div className="agw-suggestions"><button type="button" onClick={() => submit("What needs me?")}>What needs me?</button><button type="button" onClick={() => submit("Why this team?")}>Why this team?</button></div> : null}<label className="agw-sr-only" htmlFor="agw-message">{workflow ? "Message Agentix" : "Describe your operational need"}</label><textarea id="agw-message" ref={composerRef} rows={2} maxLength={2000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit() } }} placeholder={workflow ? "Ask, give direction, or tell Agentix to pause…" : "Describe what you want Agentix to handle…"} /><div className="agw-composer-bottom"><span>{workflow ? <><ShieldCheck size={13} />Works within your approved scope</> : <><FileText size={13} />Relevant context comes with the work</>}</span><button type="submit" className="agw-send" aria-label={workflow ? "Send message to Agentix" : "Prepare operating plan"} disabled={!input.trim()} title={input.trim() ? "Send message" : "Write a message to send"}><ArrowUp size={18} weight="bold" /></button></div></div><div className="agw-composer-caption"><span>Demo · simulated actions and responses</span><span>Enter to send · Shift Enter for a new line</span></div></form>
			</section>
			{workflow && work ? <aside className="agw-context" aria-label="Agent context"><header><span>At a glance</span><button type="button" className="agw-icon-button agw-context-close" aria-label="Close agent context" onClick={closeContext}><X size={18} /></button></header><div className="agw-context-scroll"><AgentTeam workflow={workflow} work={work} /><OutcomeChecks workflow={workflow} work={work} /><section className="agw-context-section"><div className="agw-section-heading"><h2>Operating context</h2></div><dl className="agw-context-facts"><dt>Accountable owner</dt><dd>{workflow.owner}</dd><dt>Priority</dt><dd>{work.priority}</dd><dt>Trigger</dt><dd>{workflow.trigger}</dd></dl><details className="agw-quiet-detail"><summary><ShieldCheck size={14} />Permissions & limits<CaretDown size={14} /></summary><p>{workflow.boundary}</p><p>Connections use Merge Agent Handler in the planned product. This prototype uses no live credentials.</p></details><details className="agw-quiet-detail" open={sourceOpen} onToggle={event => setSourceOpen(event.currentTarget.open)}><summary><FileText size={14} />Discovery sources<CaretDown size={14} /></summary><div className="agw-context-sources">{workflow.sources.map(source => <div key={source.title}><strong>{source.title}</strong><p>{source.detail}</p></div>)}<button type="button" onClick={() => onOpenDiscovery(workflow.id)}>Open Discovery design<ArrowRight size={14} /></button></div></details><details className="agw-quiet-detail"><summary>Decision record<span>{work.notes.length}</span><CaretDown size={14} /></summary>{work.notes.length ? <ol>{work.notes.map((item, i) => <li key={`${i}-${item}`}>{item}</li>)}</ol> : <p>No decisions recorded yet.</p>}</details></section></div></aside> : null}
			</div>
		</main>
	</div>
}
