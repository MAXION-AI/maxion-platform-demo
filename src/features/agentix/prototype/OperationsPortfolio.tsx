import { ArrowRight, CheckCircle, Clock, MagnifyingGlass, PaperPlaneTilt, PlugsConnected, WarningCircle } from "@phosphor-icons/react"
import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react"

import { AGENT_NAMES, MAX_MOUNTED_RUNS, agentLabel, isTerminal, matchAgent, messageAgent, needsAttention, phaseLabel, readiness, updateAgent, workflowFor, type Deployment, type OperationCommand, type OperationRun, type OperationsState } from "./operationsState"
import type { WorkflowId } from "./initiatives"

export type OperationsView = "today" | "work" | "approvals" | "activity" | "connections"

type Props = {
	state: OperationsState
	setState: Dispatch<SetStateAction<OperationsState>>
	view: OperationsView
	onView: (view: OperationsView) => void
	onOpenAgent: (id: WorkflowId) => void
	onOpenRun: (run: OperationRun) => void
	onCreate: () => void
}

let commandSequence = 0
function command(version: number, action: string): OperationCommand {
	commandSequence += 1
	return { id: `agentix:${action}:${Date.now()}:${commandSequence}`, expectedDeploymentVersion: version }
}

function RunRow({ run, state, onOpen }: { run: OperationRun; state: OperationsState; onOpen: (run: OperationRun) => void }) {
	const agent = state.agents[run.agentId]
	return <button type="button" className="aop-portfolio-row" onClick={() => onOpen(run)}>
		<span className={`aop-run-signal is-${run.phase}`}>{needsAttention(run) ? <WarningCircle /> : isTerminal(run) ? <CheckCircle /> : <Clock />}</span>
		<span><strong>{run.reference} · {run.title}</strong><small>{AGENT_NAMES[run.agentId]} · deployment v{agent.version} · {agent.provenance.sourceArtifactId}</small></span>
		<span><i>{phaseLabel(run.phase)}</i><small>{agent.environment} · {agent.evidenceClass}</small></span><ArrowRight />
	</button>
}

function DecisionCard({ run, state, onOpen }: { run: OperationRun; state: OperationsState; onOpen: (run: OperationRun) => void }) {
	const agent = state.agents[run.agentId]
	return <article className="aop-decision-card"><header><span>{AGENT_NAMES[run.agentId]}</span><i>{run.phase === "approval" ? "APPROVAL" : "QUESTION"}</i></header><h2>{run.phase === "approval" ? "Approve July close effects" : "Who owns this remaining step?"}</h2><p>{run.phase === "approval" ? `${run.reference} v${run.approvalVersion} · exact price variance only; payment release remains held.` : `${run.reference} · work is preserved while the named owner supplies evidence.`}</p><footer><small>{agent.provenance.sourceArtifactId} · v{agent.version}</small><button type="button" onClick={() => onOpen(run)}>Review</button></footer></article>
}

function ReadinessDecisionCard({ agent, onOpen }: { agent: Deployment; onOpen: (id: WorkflowId) => void }) {
	return <article className="aop-decision-card"><header><span>{AGENT_NAMES[agent.id]}</span><i>QUESTION</i></header><h2>Which approved access package should onboarding use?</h2><p>London analyst has two catalog labels. Confirm the bounded mapping before this responsibility can start.</p><footer><small>{agent.provenance.sourceArtifactId} · v{agent.version}</small><button type="button" onClick={() => onOpen(agent.id)}>Review</button></footer></article>
}

export function OperationsPortfolio({ state, setState, view, onView, onOpenAgent, onOpenRun, onCreate }: Props) {
	const [query, setQuery] = useState("")
	const [workFilter, setWorkFilter] = useState<"all" | "attention" | "running" | "failed" | "completed">("all")
	const [draft, setDraft] = useState("")
	const [composerStatus, setComposerStatus] = useState("")
	const agents = Object.values(state.agents)
	const attention = state.runs.filter(needsAttention)
	const readinessDecisions = agents.filter((agent) => readiness(agent) !== "ready")
	const decisionCount = attention.length + readinessDecisions.length
	const recent = useMemo(() => [...state.runs].sort((a, b) => (b.finished ?? b.started) - (a.finished ?? a.started)), [state.runs])
	const work = recent.filter((run) => {
		if (workFilter === "attention") return needsAttention(run)
		if (workFilter === "running") return ["queued", "working", "recovering", "verifying", "paused"].includes(run.phase)
		if (workFilter === "failed") return ["partial", "not_completed"].includes(run.phase)
		if (workFilter === "completed") return run.phase === "verified"
		return true
	}).filter((run) => `${run.reference} ${run.title} ${AGENT_NAMES[run.agentId]}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, MAX_MOUNTED_RUNS)

	const submit = (event: FormEvent) => {
		event.preventDefault()
		const text = draft.trim()
		if (!text) return
		const id = matchAgent(text) ?? "service"
		setState((current) => messageAgent(current, id, text))
		setDraft("")
		setComposerStatus(`Direction sent to ${AGENT_NAMES[id]}; its authority did not change.`)
	}

	return <section className="aop-portfolio" aria-label="Agentix operations">
		<header className="aop-portfolio-header"><div><small>AGENTIX</small><strong>{view[0].toUpperCase() + view.slice(1)}</strong><span>{agents.filter((agent) => agent.status === "active").length} active agents · {decisionCount} decisions</span></div><label><MagnifyingGlass /><input aria-label="Search Agentix" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search or ask" /></label><button type="button" disabled={state.role === "viewer"} onClick={onCreate}>New agent</button></header>
		<nav className="aop-portfolio-nav" aria-label="Agentix views">{(["today", "work", "approvals", "activity", "connections"] as OperationsView[]).map((item) => <button type="button" key={item} aria-current={view === item ? "page" : undefined} onClick={() => onView(item)}>{item[0].toUpperCase() + item.slice(1)}{item === "approvals" && decisionCount ? <span>{decisionCount}</span> : null}</button>)}</nav>
		{state.notice ? <p className="aop-notice" role="status">{state.notice}</p> : null}

		{view === "today" ? <div className="aop-today"><section className="aop-today-intro"><small>AUTONOMOUS OPERATIONS</small><h1>{decisionCount} decisions. Everything else is moving.</h1><p>Agents keep working inside their authority while exact approvals remain attached to each case.</p></section><div className="aop-decision-grid">{attention.slice(0, 2).map((run) => <DecisionCard key={run.id} run={run} state={state} onOpen={onOpenRun} />)}{readinessDecisions.slice(0, Math.max(0, 2 - attention.length)).map((agent) => <ReadinessDecisionCard key={agent.id} agent={agent} onOpen={onOpenAgent} />)}</div><div className="aop-today-grid"><section className="aop-panel"><header><h2>Active agents</h2><small>{agents.filter((agent) => agent.status === "active").length} operating</small></header>{agents.filter((agent) => agent.status !== "draft").slice(0, 4).map((agent) => <button type="button" className="aop-agent-line" key={agent.id} onClick={() => onOpenAgent(agent.id)}><b>{agent.id.slice(0, 2).toUpperCase()}</b><span><strong>{AGENT_NAMES[agent.id]}</strong><small>{workflowFor(agent.id).outcome}</small></span><i>{agentLabel(agent, state.runs.filter((run) => run.agentId === agent.id))}</i></button>)}</section><section className="aop-panel"><header><h2>Recent activity</h2><button type="button" onClick={() => onView("activity")}>View all</button></header>{recent.slice(0, 4).map((run) => <button type="button" className="aop-activity-line" key={run.id} onClick={() => onOpenRun(run)}><time>{new Date(run.finished ?? run.started).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><span><strong>{run.title}</strong><small>{run.reference} · {phaseLabel(run.phase)}</small></span><i>{isTerminal(run) ? "Verified" : "Live"}</i></button>)}</section></div><form className="aop-portfolio-composer" onSubmit={submit}><textarea aria-label="Steer Agentix" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What should Agentix take care of?" rows={2} /><footer><span>{composerStatus || "Authorized tenant context · valid instructions are preserved"}</span><button type="submit" disabled={!draft.trim() || state.role === "viewer"}><PaperPlaneTilt />Send</button></footer></form></div> : null}

		{view === "work" ? <div className="aop-view"><header><div><h1>Work</h1><p>Every case stays attached to its responsibility, version, source, and next action.</p></div><label className="aop-view-search"><MagnifyingGlass /><input aria-label="Search work" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a case" /></label></header><div className="aop-work-filters">{(["all", "attention", "running", "failed", "completed"] as const).map((item) => <button type="button" key={item} aria-pressed={workFilter === item} onClick={() => setWorkFilter(item)}>{item}</button>)}</div><section className="aop-portfolio-list">{work.length ? work.map((run) => <RunRow key={run.id} run={run} state={state} onOpen={onOpenRun} />) : <div className="aop-view-empty"><CheckCircle /><h2>No work matches this filter.</h2><button type="button" onClick={() => { setQuery(""); setWorkFilter("all") }}>Show all work</button></div>}</section>{recent.length > MAX_MOUNTED_RUNS ? <p className="aop-mount-note">Showing {MAX_MOUNTED_RUNS} of {recent.length} records. Refine the filter to narrow the list.</p> : null}</div> : null}

		{view === "approvals" ? <div className="aop-view"><header><div><h1>Approvals</h1><p>One bounded decision per case. Decisions never widen authority.</p></div></header><div className="aop-decision-grid">{decisionCount ? <>{attention.slice(0, MAX_MOUNTED_RUNS).map((run) => <DecisionCard key={run.id} run={run} state={state} onOpen={onOpenRun} />)}{readinessDecisions.slice(0, Math.max(0, MAX_MOUNTED_RUNS - attention.length)).map((agent) => <ReadinessDecisionCard key={agent.id} agent={agent} onOpen={onOpenAgent} />)}</> : <div className="aop-view-empty"><CheckCircle /><h2>Nothing needs your decision.</h2><button type="button" onClick={() => onView("work")}>Review active work</button></div>}</div></div> : null}

		{view === "activity" ? <div className="aop-view"><header><div><h1>Activity</h1><p>Latest case changes with explicit simulation evidence and source versions.</p></div></header><section className="aop-portfolio-list">{recent.slice(0, MAX_MOUNTED_RUNS).map((run) => <RunRow key={run.id} run={run} state={state} onOpen={onOpenRun} />)}</section></div> : null}

		{view === "connections" ? <div className="aop-view"><header><div><h1>Connections</h1><p>Health only—credentials and secret material are never exposed here.</p></div></header><div className="aop-connection-grid">{agents.map((agent) => { const setupRequired = readiness(agent) !== "ready" && agent.connection === "ready"; return <article key={agent.id}><header><PlugsConnected /><span><strong>{workflowFor(agent.id).category}</strong><small>{AGENT_NAMES[agent.id]} · v{agent.version}</small></span><i>{setupRequired ? "Setup required" : agent.connection === "ready" ? "Healthy" : "Degraded"}</i></header><p>{setupRequired ? "The connection is healthy; deployment waits for its required mapping or operation check." : agent.connection === "ready" ? "Approved operations and field mappings are available." : "Pending notifications are preserved; completed writes won’t be repeated."}</p><small>{agent.environment} · {agent.evidenceClass} · {agent.authority}</small><button type="button" disabled={state.role === "viewer" || agent.checking} onClick={() => setupRequired ? onOpenAgent(agent.id) : setState((current) => updateAgent(current, agent.id, agent.connection === "expired" ? "reconnect" : "recheck", command(agent.version, `connection-${agent.id}`)))}>{setupRequired ? "Resolve setup" : agent.checking ? "Checking…" : agent.connection === "expired" ? "Reconnect and verify" : "Test connection"}</button></article> })}</div></div> : null}
	</section>
}
