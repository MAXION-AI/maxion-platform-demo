import { ArrowRight, CaretDown, CaretRight, Check, CheckCircle, Clock, FileText, Pause, ShieldCheck, SpinnerGap, Users, WarningCircle } from "@phosphor-icons/react"
import { useState, type ReactNode } from "react"
import { MaxionSpiralMark } from "@/features/platform-prototype/PortalChrome"
import type { WorkflowExample } from "./initiatives"
import { statusLabel, type AgentWork, type WorkAction } from "./workspaceState"

export function Button({ children, onClick, primary = false, disabled = false }: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
	return <button type="button" className={`agw-button${primary ? " is-primary" : ""}`} onClick={onClick} disabled={disabled}>{children}</button>
}
export function WorkStatus({ work }: { work: AgentWork }) {
	const Icon = work.status === "running" ? SpinnerGap : work.status === "complete" ? CheckCircle : work.status === "waiting" || work.status === "declined" ? WarningCircle : work.status === "paused" ? Pause : Clock
	return <span className={`agw-status is-${work.status}`}><Icon size={14} className={work.status === "running" ? "agw-spin" : undefined} />{statusLabel(work)}</span>
}

export function DiscoveryEvidence({ workflow: w }: { workflow: WorkflowExample }) {
	return <>
		<section className="axi-section"><span className="axi-eyebrow">Target outcome</span><h2>{w.outcome}</h2><p>Design v1 · {w.owner} · Illustrative Discovery evidence.</p></section>
		<section className="axi-section"><h2>What changes—and why</h2><div className="axi-change-list">{w.changes.map((change, i) => <article key={change.before}><span className="axi-step-number">0{i + 1}</span><div><span className="axi-eyebrow">Current state</span><p>{change.before}</p><small>{change.finding}</small></div><ArrowRight className="axi-change-arrow" size={18} /><div><span className="axi-eyebrow">Approved future state</span><p>{change.after}</p></div></article>)}</div></section>
		<section className="axi-section"><h2>Supporting evidence</h2><div className="axi-source-list">{w.sources.map(source => <details key={source.title}><summary><FileText size={17} /><span>{source.title}</span></summary><p>{source.detail}</p><small>Illustrative source · {w.id.toUpperCase()}-v1 · Read-only snapshot</small></details>)}</div></section>
		<section className="axi-section"><h2>Success checks</h2><ul className="axi-check-list">{w.success.map(check => <li key={check}><ShieldCheck size={17} />{check}</li>)}</ul></section>
	</>
}

export function AgentTeam({ workflow, work }: { workflow: WorkflowExample; work: AgentWork }) {
	const actors = workflow.steps[work.stage].actors
	return <section className="agw-context-section" aria-label="Agent team"><div className="agw-section-heading"><h2>{workflow.team.length === 1 ? "Your agent" : "Your team"}</h2><span>{workflow.team.length} {workflow.team.length === 1 ? "agent" : "agents"}</span></div>
		<div className="agw-team">{workflow.team.map((agent, index) => {
			const finishedSpecialist = index > 0 && work.stage > 1
			const active = work.status === "running" && actors.includes(agent.id)
			const label = work.status === "complete" || finishedSpecialist ? "Done" : active ? "Working" : work.status === "running" && index === 0 ? "Coordinating" : work.status === "declined" ? "Stopped" : work.status === "paused" ? "Paused" : work.status === "waiting" && index === 0 ? "Waiting" : "Ready"
			return <details key={agent.id} className={`agw-agent is-${label.toLowerCase()}`}><summary><span className="agw-avatar">{index === 0 ? <MaxionSpiralMark variant="current" /> : <Users size={17} />}</span><span><strong>{agent.name}</strong><small>{index === 0 ? "Owns this outcome" : agent.id === "invoice" ? "Invoice & PO checks" : agent.id === "receipt" ? "Receiving evidence" : "Scoped specialist"}</small></span><span className="agw-agent-state">{active ? <SpinnerGap className="agw-spin" size={12} /> : label === "Done" ? <Check size={12} /> : null}{label}</span></summary><div className="agw-agent-detail"><p>{agent.responsibility}</p><dl><dt>Tool access</dt><dd>{agent.tools}</dd><dt>Produces</dt><dd>{agent.output}</dd></dl></div></details>
		})}</div>
		<details className="agw-quiet-detail"><summary>Why this team?<CaretDown size={14} /></summary><p>{workflow.teamReason}</p></details>
	</section>
}

export function OutcomeChecks({ workflow, work }: { workflow: WorkflowExample; work: AgentWork }) {
	const checked = work.status === "complete" ? 3 : workflow.id === "service" ? 0 : work.stage >= workflow.steps.length - 1 ? 2 : work.stage >= 2 ? 1 : 0
	return <section className="agw-context-section" aria-label="Outcome checks"><div className="agw-section-heading"><h2>Outcome checks</h2><span>{checked} of {workflow.success.length}</span></div><ul className="agw-checks">{workflow.success.map((check, i) => <li key={check} className={i < checked ? "is-done" : ""}>{i < checked ? <CheckCircle size={17} /> : <span className="agw-check-empty" />}<span>{check}</span></li>)}</ul><p className="agw-small">{work.status === "complete" ? "Verified against the demonstration records." : "Complete means every required check passes."}</p></section>
}

export function Activity({ workflow, work }: { workflow: WorkflowExample; work: AgentWork }) {
	const [expanded, setExpanded] = useState(true)
	const completed = work.status === "complete" ? workflow.steps.length : ["draft", "ready", "scheduled"].includes(work.status) ? 0 : work.stage
	return <section className="agw-activity" aria-label="Agent activity"><button type="button" className="agw-activity-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}><span>{expanded ? <CaretDown size={15} /> : <CaretRight size={15} />}Activity</span><span aria-live="polite">{completed} of {workflow.steps.length} steps complete</span></button>
		<div className="agw-timeline" hidden={!expanded}>{workflow.steps.map((step, i) => {
			const done = work.status === "complete" || i < work.stage
			const current = !["draft", "ready", "scheduled", "complete", "declined"].includes(work.status) && i === work.stage
			return <details key={step.title} className={`agw-step ${done ? "is-done" : current ? "is-current" : "is-next"}`}><summary><span className="agw-step-dot">{done ? <Check size={12} /> : current && work.status === "running" ? <SpinnerGap className="agw-spin" size={14} /> : <span />}</span><span><strong>{step.title}</strong><small>{step.actors.map(id => workflow.team.find(agent => agent.id === id)?.name).join(" + ")}{step.actors.length > 1 ? " · parallel" : ""}</small></span><span className="agw-step-meta">{done ? "Done" : current ? work.status === "running" ? "Working" : work.status === "paused" ? "Paused" : "Waiting" : "Next"}<CaretDown size={12} /></span></summary><div className="agw-step-detail"><p>{step.detail}</p><small>{done ? step.evidence : current ? `In progress · ${step.system} · no completion receipt yet` : `Planned action · ${step.system}`}</small></div></details>
		})}</div>
	</section>
}

export function Decision({ work, onAction }: { work: AgentWork; workflow: WorkflowExample; onAction: (action: WorkAction, evidence?: string) => void }) {
	const [receipt, setReceipt] = useState("")
	const [error, setError] = useState("")
	if (work.status !== "waiting") return null
	if (work.waitingFor === "notification") return <section className="agw-decision" aria-label="Held notification"><span className="agw-decision-kicker"><Pause size={15} />Your instruction is in effect</span><h2>Work is ready. Notifications are held.</h2><p>The record work is preserved. The outcome is only partially verified until the required notification is delivered to the approved audience.</p><Button primary onClick={() => onAction("release-notification")}>Allow the notification<ArrowRight size={16} /></Button></section>
	if (work.waitingFor === "human") return <section className="agw-decision" aria-label="Human fulfillment"><span className="agw-decision-kicker"><Users size={16} />Waiting on the payroll owner</span><h2>Payroll access still needs confirmation.</h2><p>HR and IT checks are complete. Payroll provisioning isn’t permitted by the connected account. Add the owner’s fulfillment reference to finish the readiness check.</p><form onSubmit={event => { event.preventDefault(); if (!receipt.trim()) { setError("Add a fulfillment reference before confirming."); return } onAction("fulfill", receipt.trim()) }}><label htmlFor="agw-receipt">Fulfillment reference <span>Demo: PAYROLL-306</span></label><div><input id="agw-receipt" value={receipt} onChange={event => { setReceipt(event.target.value); setError("") }} maxLength={120} placeholder="PAYROLL-306" aria-invalid={!!error} aria-describedby={error ? "agw-receipt-error" : undefined} /><button className="agw-button is-primary" type="submit">Confirm fulfillment</button></div>{error ? <p id="agw-receipt-error" role="alert">{error}</p> : null}</form></section>
	return <section className="agw-decision" aria-label="Approval request"><span className="agw-decision-kicker"><ShieldCheck size={16} />One decision for you · AP owner</span><h2>Approve the $240 price variance?</h2><p>All 120 units were received. The difference is price-only, on invoice <strong>INV-20841 v2</strong>.</p><div className="agw-decision-facts"><span><Check size={14} />Invoice and receipt checks agree</span><span><ShieldCheck size={14} />No payment release or bank-detail changes</span></div><div className="agw-actions"><Button primary onClick={() => onAction("approve")}>Approve $240 variance<ArrowRight size={16} /></Button><Button onClick={() => onAction("decline")}>Decline</Button></div><small>Approves this invoice version only. The decision is recorded with the case.</small></section>
}

export function Outcome({ workflow, work }: { workflow: WorkflowExample; work: AgentWork }) {
	if (work.status === "declined") return <section className="agw-result is-declined"><WarningCircle size={22} /><h2>Variance declined. The exception stays open.</h2><p>The evidence is retained for the AP owner. No ERP resolution or payment was posted.</p></section>
	if (work.status !== "complete") return null
	return <section className="agw-result" aria-label="Verified outcome evidence"><span className="agw-result-icon"><Check size={22} /></span><span className="agw-small">Outcome verified</span><h2>{workflow.result}</h2><p>{workflow.outcome}</p><div className="agw-results-list">{workflow.records.map(record => <details key={record.name}><summary><FileText size={16} /><span>{record.name}<strong>{record.value}</strong></span><CaretDown size={14} /></summary><p>Demonstration read-back receipt · {workflow.caseId} · linked to the completed steps below. No live provider action was performed.</p></details>)}</div></section>
}

export function Intro({ workflow, work }: { workflow: WorkflowExample; work: AgentWork }) {
	const intro = work.status === "draft" ? `I’ve read the ${work.origin === "prompt" ? "brief and relevant Discovery context" : "Discovery design"} and prepared the operating plan. ${workflow.team.length === 1 ? "One agent can handle this." : `I’ll coordinate ${workflow.team.length - 1} specialists and keep you in one conversation.`} Review the scope below, then I can start.` : work.status === "complete" ? "The work is complete, and I’ve checked the required outcomes. The records and activity below show what changed." : work.status === "declined" ? "I’ve recorded your decision and stopped the resolution. The investigation is preserved." : work.status === "ready" ? `I’ll triage ${workflow.caseId}, attach the relevant context and verify that the right team received it. The incident will stay open.` : work.status === "scheduled" ? "I’ll check stock and approved suppliers at 06:00 Europe/London, then create a requisition within your limit. You can also start the review now." : workflow.id === "invoice" ? "I’m reconciling this invoice against the purchase order and receiving records. My specialists check the evidence independently; I’ll bring you only the decision I can’t make." : workflow.id === "onboarding" ? "I’m coordinating HR and IT readiness. Each specialist sees only the information they need; I’ll keep the outstanding dependencies here." : workflow.id === "inventory" ? "I’m checking demand and supplier availability before creating one requisition. If the ERP response is uncertain, I’ll reconcile the original request before any retry." : "I’m checking the incident against the service ownership policy, then I’ll verify the assignment and notify the on-call team."
	return <article className="agw-message is-agent"><span className="agw-message-mark"><MaxionSpiralMark variant="current" /></span><div><div className="agw-message-author">Agentix<span>{workflow.team[0].name}</span></div><p>{intro}</p></div></article>
}
