import { ArrowLeft, ArrowRight, Check, CheckCircle, FileText, PaperPlaneTilt, Pause, Play, PlugsConnected, Stop, Warning, XCircle } from "@phosphor-icons/react"
import { useMemo, useState, type FormEvent } from "react"

import { isTerminal, needsAttention, phaseLabel, runActivity, runEvents, workflowFor, type AgentAction, type Deployment, type OperationRole, type OperationRun, type RunAction } from "./operationsState"

type Props = {
	run: OperationRun
	agent: Deployment
	role: OperationRole
	clock: number
	draft: string
	onDraft: (value: string) => void
	onAction: (action: RunAction, evidence?: string) => void
	onAgentAction: (action: AgentAction) => void
	onSteer: (text: string) => void
	onBack: () => void
}

const livePhases = ["queued", "working", "recovering", "verifying"] as const

export function RunCanvas({ run, agent, role, clock, draft, onDraft, onAction, onAgentAction, onSteer, onBack }: Props) {
	const [evidenceTab, setEvidenceTab] = useState<"sources" | "decisions" | "verify">("sources")
	const [answer, setAnswer] = useState("Payroll operations owner")
	const [acknowledgement, setAcknowledgement] = useState("")
	const [editingArtifact, setEditingArtifact] = useState(false)
	const [artifactDraft, setArtifactDraft] = useState(run.artifactTitle)
	const events = useMemo(() => runEvents(run), [run])
	const workflow = workflowFor(run.agentId)
	const isLive = livePhases.includes(run.phase as (typeof livePhases)[number])
	const isStaleApproval = run.phase === "approval" && run.approvalVersion !== agent.version
	const readOnly = role === "viewer"
	const elapsedMinutes = Math.max(0, Math.round(((run.finished ?? clock) - run.started) / 60_000))

	const submit = (event: FormEvent) => {
		event.preventDefault()
		const text = draft.trim()
		if (!text || readOnly) return
		if (agent.connection === "expired") {
			setAcknowledgement("Connection unavailable. Your direction is preserved; reconnect before sending.")
			return
		}
		onSteer(text)
		onDraft("")
		setAcknowledgement("Direction received for this run. Its authority did not change.")
	}

	const acknowledge = (message: string, action?: () => void) => {
		setAcknowledgement(message)
		action?.()
	}

	return <section className="aop-run-canvas" aria-label="Agentix run canvas">
		<header className="aop-run-header"><button type="button" aria-label="Back to initiative" onClick={onBack}><ArrowLeft /></button><div><small>AGENTIX · LIVE RUN</small><strong>{run.title}</strong><span>{phaseLabel(run.phase)} · Step {Math.min(run.step + 1, 5)} of 5 · {elapsedMinutes}m</span></div><button type="button" onClick={onBack}>View initiative</button></header>
		<section className="aop-run-presence" aria-label="Current run status"><div><span className={`aop-run-pulse${isLive ? " is-live" : ""}`} /><span><strong>Agentix is {runActivity(run).toLowerCase()}.</strong><small>Step {Math.min(run.step + 1, 5)} of 5 · {needsAttention(run) ? "Waiting on your bounded decision" : isTerminal(run) ? "Run ended with evidence preserved" : "Expected update in under 3 minutes"}</small></span></div>{run.phase === "paused" ? <button type="button" disabled={readOnly} onClick={() => onAction("resume")}><Play />Resume</button> : isLive ? <button type="button" disabled={readOnly} onClick={() => onAction("pause")}><Pause />Pause</button> : null}</section>

		<div className="aop-run-layout">
			<main className="aop-run-timeline" aria-label="Run timeline"><header><div><h1>Run timeline</h1><p>Conversation and plain-word actions</p></div><span>{isLive ? "LIVE" : phaseLabel(run.phase).toUpperCase()}</span></header>
				<article className="aop-run-instruction"><small>OPERATOR · {new Date(run.started).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small><p>{run.priority === "High" ? "Prioritize this case within the approved responsibility." : `Complete ${run.reference} using the approved operating policy. Hold anything outside authority.`}</p></article>
				<section className="aop-run-events" aria-label="Run events"><small>WORKED FOR {elapsedMinutes}M</small>{events.map((item) => <details key={item.id} open={item.status === "live" || item.status === "failed"}><summary><span>{String(item.order + 1).padStart(2, "0")}</span><strong>{item.title}</strong><i className={`is-${item.status}`}>{item.status}</i></summary><p>{item.detail}</p><small>{item.correlationId} · {agent.environment} · {agent.evidenceClass}</small></details>)}</section>

				{isStaleApproval ? <section className="aop-run-decision" aria-label="Stale approval request"><span>STALE APPROVAL</span><h2>Refresh this request before deciding.</h2><p>It targets deployment v{run.approvalVersion}; the initiative now runs v{agent.version}. Amount and authority remain unchanged.</p><button type="button" className="is-primary" disabled={role !== "owner"} onClick={() => onAction("refresh-approval")}>Refresh request</button></section> : run.phase === "approval" ? <section className="aop-run-decision" aria-label="Approval request"><span>NEEDS YOU · APPROVAL</span><h2>Approve the proposed {run.reference} change?</h2><p>$240 price variance · 120 units · no payment or bank-detail authority · no write dispatched</p><div><button type="button" className="is-primary" disabled={role !== "owner"} onClick={() => onAction("approve")}>Approve variance</button><button type="button" disabled={role !== "owner"} onClick={() => onAction("amend", "Reconcile the renewal owner before proposing the write")}>Amend proposal</button><button type="button" disabled={readOnly} onClick={() => onAction("stop")}><Stop />Stop</button></div></section> : null}

				{run.phase === "human" ? <section className="aop-run-question" aria-label="Question for operator"><span>NEEDS INPUT · QUESTION</span><h2>Who owns the remaining payroll step?</h2><p>This answer assigns the human step. It is not an approval and grants no new access.</p><label><span>Recommended answer</span><input value={answer} disabled={readOnly} onChange={(event) => setAnswer(event.target.value)} maxLength={120} /></label><div><button type="button" className="is-primary" disabled={readOnly || !answer.trim()} onClick={() => onAction("fulfill", answer)}>Answer this question</button><button type="button" disabled={readOnly} onClick={() => { setAnswer(""); setAcknowledgement("Enter a different owner or fulfillment reference.") }}>Something else</button></div></section> : null}

				{run.phase === "partial" ? <section className="aop-run-recovery" aria-label="Run recovery"><Warning /><div><h2>Verification is incomplete.</h2><p>Matched records and prior writes are preserved. Retry only verification after the connection is healthy.</p></div>{agent.connection === "expired" ? <button type="button" disabled={readOnly} onClick={() => onAgentAction("reconnect")}><PlugsConnected />Reconnect</button> : <button type="button" disabled={readOnly} onClick={() => onAction("retry")}><Play />Retry step</button>}</section> : null}

				{run.phase === "not_completed" ? <section className="aop-run-recovery" aria-label="Stopped run"><XCircle /><div><h2>This run did not complete.</h2><p>The failure record and completed evidence remain attached. Start a bounded continuation when ready.</p></div><button type="button" className="is-primary" disabled={readOnly} onClick={() => onAction("continue")}><Play />Continue run</button></section> : null}

				<form className="aop-run-composer" onSubmit={submit}><label htmlFor="aop-run-steer">GUIDE AGENTIX WHILE IT WORKS</label><textarea id="aop-run-steer" value={draft} disabled={readOnly} onChange={(event) => onDraft(event.target.value)} rows={2} maxLength={2000} placeholder={readOnly ? "View-only access" : "Check the source owner before proposing any write…"} /><footer><span role="status">{acknowledgement || (agent.connection === "expired" ? "Connection lost · draft preserved" : `${run.reference} only · authority unchanged`)}</span><div>{isLive || run.phase === "approval" || run.phase === "human" ? <button type="button" disabled={readOnly} onClick={() => onAction("stop")}><Stop />Stop</button> : run.phase === "paused" ? <button type="button" disabled={readOnly} onClick={() => onAction("resume")}><Play />Resume</button> : null}<button type="submit" className="is-primary" disabled={readOnly || !draft.trim() || agent.connection === "expired"}><PaperPlaneTilt />Send steer</button></div></footer></form>
			</main>

			<aside className="aop-run-evidence" aria-label="Run evidence"><h2>Evidence</h2><nav aria-label="Evidence views">{(["sources", "decisions", "verify"] as const).map((tab) => <button type="button" key={tab} aria-current={evidenceTab === tab ? "page" : undefined} onClick={() => setEvidenceTab(tab)}>{tab.toUpperCase()} {tab === "sources" ? workflow.sources.length : tab === "decisions" ? Number(run.needsApproval) + Number(!!run.humanReference) : run.step * 8 + run.writes}</button>)}</nav>
				{evidenceTab === "sources" ? <section className="aop-evidence-card"><span><CheckCircle />VERIFIED</span><h3>{workflow.sources[0]?.title ?? "Approved operating source"}</h3><code>{agent.provenance.sourceArtifactId}</code><p>{workflow.sources[0]?.detail ?? "Source context is attached to this bounded run."}</p><button type="button" onClick={() => acknowledge("Source opened in this evidence workspace.")}>Open source</button></section> : null}
				{evidenceTab === "decisions" ? <section className="aop-evidence-card"><span><FileText />DECISION RECORD</span><h3>{run.needsApproval ? `$240 variance · deployment v${run.approvalVersion}` : "No approval required"}</h3><p>{run.approved ? "Approved for this object only. Payment authority did not change." : run.phase === "approval" ? "Held for the project owner." : "No unresolved approval is attached."}</p>{run.humanReference ? <code>{run.humanReference}</code> : null}</section> : null}
				{evidenceTab === "verify" ? <section className="aop-evidence-card"><span><Check />{run.phase === "verified" ? "VERIFIED" : "IN PROGRESS"}</span><h3>Source result and notification</h3><p>{run.phase === "verified" ? "Read-back matched. Required notification acceptance is evidenced; recipient reading is not claimed." : "No successful ending is claimed until every required check passes."}</p><code>{run.reference} · writes {run.writes} · duplicates 0</code></section> : null}
				<section className="aop-evidence-card"><small>{run.phase === "verified" ? "PRODUCED OBJECT" : "PROPOSED OBJECT"}</small>{editingArtifact ? <label className="aop-artifact-edit"><span>Object title</span><input aria-label="Object title" value={artifactDraft} maxLength={240} onChange={(event) => setArtifactDraft(event.target.value)} /></label> : <h3>{run.artifactTitle}</h3>}<p>Version {run.artifactVersion} · {run.phase === "verified" ? "verified outcome" : "held within run authority"}</p><span>{run.step * 4 + run.writes} RECEIPTS</span><div>{editingArtifact ? <><button type="button" className="is-primary" disabled={!artifactDraft.trim()} onClick={() => { onAction("edit-artifact", artifactDraft); setEditingArtifact(false); setAcknowledgement("Object draft saved in this run. No external write was made.") }}>Save draft</button><button type="button" onClick={() => { setArtifactDraft(run.artifactTitle); setEditingArtifact(false) }}>Cancel</button></> : <><button type="button" onClick={() => acknowledge("Object opened in the evidence workspace.")}>Open artifact</button><button type="button" disabled={readOnly} onClick={() => setEditingArtifact(true)}>Edit</button>{run.phase === "verified" ? <button type="button" disabled={readOnly} onClick={() => onAction("regenerate")}>Regenerate</button> : null}</>}</div></section>
				<section className="aop-evidence-card is-recovery"><span><Warning />RECOVERY READY</span><p>If verification fails, preserve matched records and retry only that step.</p><button type="button" onClick={() => setEvidenceTab("verify")}>View recovery</button></section>
			</aside>

			<aside className="aop-run-details" aria-label="Run details"><h2>Run details</h2><span>STEP {Math.min(run.step + 1, 5)} OF 5</span>{[["Status", phaseLabel(run.phase)], ["Run time", `${elapsedMinutes}m`], ["Actions", String(run.step * 43 + run.notes.length)], ["Units", String(Math.max(1, run.costCents * 10))], ["Connections", agent.connection === "ready" ? "Healthy" : "Needs repair"], ["Authority", agent.authority]].map(([label, value]) => <div key={label}><small>{label.toUpperCase()}</small><strong>{value}</strong></div>)}<button type="button" onClick={onBack}><ArrowRight />Open initiative</button><p>{agent.environment.toUpperCase()} · {agent.evidenceClass.toUpperCase()} DATA · NO LIVE WRITES</p></aside>
		</div>
	</section>
}
