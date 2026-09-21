import { ArrowRight, CaretDown, CaretRight, Flask, Lock, WarningCircle } from "@phosphor-icons/react"
import { motion, useReducedMotion } from "motion/react"
import { Button as DsButton, Mark } from "@/design/primitives"
import { CyclingPlaceholder, riseIn, StepLoader } from "@/components/motion/MotionKit"
import type { WorkflowId } from "./initiatives"
import { intakeStatus, routeBrief, visiblePackage, type BriefRoute } from "./engine/engine"
import { matchScenario, SCENARIOS, WORKFLOW_IDS } from "./engine/scenarios"
import type { AgentixState } from "./engine/types"

const PROMPTS = [
	"Reconcile revenue between SQL Server and AWS every morning…",
	"Reconcile the August credit notes…",
	"Get every approved hire ready before day one…",
]
const BRIEF_LIMIT = 2000
const SETUP_STEPS = [
	{ id: "define", label: "Describe the work", detail: "In your words, or from a completed Discovery." },
	{ id: "review", label: "Review", detail: "Outcome, boundary, open questions and readiness." },
	{ id: "activate", label: "Activate", detail: "Work starts from then on; production still follows its policy." },
]

/* The ElevenLabs publishing stepper (mobbin stepper-details): a quiet rail of steps beside the form. */
export function EngagementSteps({ step }: { step: 1 | 2 | 3 }) {
	return <aside className="aop-setup-rail"><StepLoader steps={SETUP_STEPS} current={step - 1} label="Setup progress" /></aside>
}

const STATUS_TEXT = { proposal: "Ready to send", "in-review": "In review in Agentix", live: "Live in Agentix", unknown: "Unavailable" } as const

/*
 * Assigning work starts from the work, not from an agent type. A brief is
 * matched to what already runs: new work for a deployed team, the review of a
 * package that expands it, or, only if you choose, a separate engagement.
 * Discovery and a brief land on the same review.
 */
export function EngagementStart({ state, brief, scenario, onBrief, onScenario, onRoute, onSeparate, onImport, onOpen, onCancel }: {
	state: AgentixState; brief: string; scenario: WorkflowId | ""
	onBrief: (value: string) => void; onScenario: (value: WorkflowId | "") => void
	onRoute: (route: BriefRoute) => void; onSeparate: (scenario: WorkflowId) => void; onImport: (packageId: string) => void; onOpen: (engagementId: string) => void; onCancel: () => void
}) {
	const reduced = useReducedMotion()
	const enter = reduced ? {} : { initial: riseIn.initial, animate: riseIn.animate, transition: riseIn.transition }
	const matched = (scenario || matchScenario(brief)) as WorkflowId | null
	const route = routeBrief(state, brief, matched || null)
	const engagement = "engagementId" in route ? state.engagements[route.engagementId] : undefined
	/*
	 * The scenarios this workspace actually has. A customer demo's engagement exists only in that
	 * demo, so the everyday workspace keeps the four it has always had and a demo shows its own.
	 */
	const available = WORKFLOW_IDS.filter(id => state.engagements[id])
	return (
		<div className="aop-setup aop-engagement-start">
			<EngagementSteps step={1} />
			<div className="aop-setup-main">
				<header className="aop-create-head">
					<h1 tabIndex={-1}>What should an agent take on?</h1>
					<p>Describe the responsibility or the piece of work. Agentix finds the team that already does it, or proposes one. Nothing runs until you review it.</p>
				</header>
				<form className="aop-brief" onSubmit={event => { event.preventDefault(); if (route.kind !== "none" && route.kind !== "discovery") onRoute(route) }}>
					<label className="aop-field-label" htmlFor="aop-brief">Describe the work</label>
					<div className="aop-brief-card">
						<div className="aop-brief-field">
							<textarea autoFocus id="aop-brief" value={brief} onChange={event => onBrief(event.target.value)} maxLength={BRIEF_LIMIT} rows={4} aria-describedby="aop-brief-route" />
							<CyclingPlaceholder items={PROMPTS} active={!brief} />
						</div>
						<div className="aop-brief-bar"><span className="aop-hint">Say what should happen, when, and what needs your approval.</span><span className="aop-count">{brief.length}/{BRIEF_LIMIT}</span></div>
					</div>
					<motion.div key={`${route.kind}:${"engagementId" in route ? route.engagementId : ""}`} id="aop-brief-route" className={`aop-route${route.kind === "none" && brief.trim() ? " is-warning" : ""}`} role="status" {...enter}>
						{!brief.trim() ? <p className="aop-hint">As you type, this shows where the work would go.</p>
							: route.kind === "none" ? <p className="aop-brief-notice"><WarningCircle size={14} weight="bold" aria-hidden="true" /><span>No scripted scenario matches this yet, so nothing would be created. Your text is kept. Try naming the work: {available.map(id => SCENARIOS[id].name.toLowerCase()).join(", ")}.</span></p>
							: route.kind === "discovery" ? <p className="aop-brief-notice"><WarningCircle size={14} weight="bold" aria-hidden="true" /><span>{state.engagements[route.engagementId]?.name ?? "This engagement"} is created by its Discovery. Start it in Discover; its package opens here for review.</span></p>
							: route.kind === "package" ? (<>
								<p><Mark seed={route.engagementId} size="xs" /><strong>{engagement?.name}'s team takes this on.</strong> Discovery package {SCENARIOS[engagement!.workflowId].packages.find(pkg => pkg.id === route.packageId)?.title} covers it; you'll review outcome, boundary and questions before anything runs.</p>
								<DsButton type="submit" variant="primary">Review the proposal<ArrowRight size={14} /></DsButton>
							</>)
							: route.kind === "assign" ? (<>
								<p><Mark seed={route.engagementId} size="xs" /><strong>New work for {engagement?.name}:</strong> “{route.title}” for the {route.owner.toLowerCase()}. The deployed team takes it; nothing is rebuilt. <button type="button" className="aop-scope-action" onClick={() => onSeparate(engagement!.workflowId)}>Create a separate engagement instead</button></p>
								<DsButton type="submit" variant="primary">Assign to {engagement?.name}<ArrowRight size={14} /></DsButton>
							</>)
							: (<>
								<p><Mark seed={route.engagementId} size="xs" /><strong>{engagement?.name} already does this{engagement?.status === "active" ? " and is live" : ""}.</strong> Open it to assign specific work, or create a separate engagement if this is a different responsibility.</p>
								<div className="aop-actions"><DsButton type="button" onClick={() => onSeparate(engagement!.workflowId)}>Create a separate engagement</DsButton><DsButton type="button" variant="primary" onClick={() => onOpen(route.engagementId)}>Open {engagement?.name}<ArrowRight size={14} /></DsButton></div>
							</>)}
					</motion.div>
				</form>

				<section className="aop-start-section" aria-label="From Discovery">
					<div className="aop-subhead"><h2>From a completed Discovery</h2><span>Carries its sources, criteria and limitations</span></div>
					<ul className="aop-list aop-designs">
						{available.flatMap(id => {
							const pkg = visiblePackage(state, id)
							// The customer demo holds the revenue design back until its own Discovery sends it.
							if (!pkg) return []
							const status = intakeStatus(state, pkg.id)
							return (
								<li key={id}>
									<button type="button" className="aop-list-row" onClick={() => status === "live" ? onOpen(id) : onImport(pkg.id)}>
										<Mark seed={id} size="sm" />
										<span className="aop-list-text"><strong>{pkg.title} <span className="aop-subtle">v{pkg.version}</span></strong><small>{STATUS_TEXT[status]} · {pkg.evidence.length} sources · {SCENARIOS[id].name}</small></span>
										<span className="aop-row-action">{status === "live" ? "Open engagement" : status === "in-review" ? "Continue review" : "Review proposal"}<CaretRight size={12} /></span>
									</button>
								</li>
							)
						})}
					</ul>
				</section>

				<section className="aop-start-section" aria-label="Examples">
					<div className="aop-subhead"><h2>Or start from an example</h2><span>Then make it yours</span></div>
					<div className="aop-template-grid">
						{available.map(id => (
							<button key={id} type="button" className={`aop-template${brief === SCENARIOS[id].examples.brief ? " is-selected" : ""}`} aria-pressed={brief === SCENARIOS[id].examples.brief} onClick={() => { onBrief(SCENARIOS[id].examples.brief); document.getElementById("aop-brief")?.focus() }}>
								<Mark seed={id} size="sm" />
								<span><strong>{SCENARIOS[id].name}</strong><small>{SCENARIOS[id].examples.detail}</small></span>
							</button>
						))}
					</div>
				</section>

				<details className="aop-demo-area">
					<summary><Flask size={14} aria-hidden="true" />Controls<CaretDown size={12} aria-hidden="true" /></summary>
					<label className="aop-inline-select" htmlFor="aop-scenario">
						<span className="aop-inline-select-label">Scripted scenario for this brief</span>
						<span className="aop-select">
							<select id="aop-scenario" value={scenario} onChange={event => onScenario(event.target.value as WorkflowId | "")}>
								<option value="">Match from the text</option>
								{available.map(id => <option key={id} value={id}>{SCENARIOS[id].name}</option>)}
							</select>
							<CaretDown size={12} aria-hidden="true" />
						</span>
					</label>
					<p className="aop-hint">Demo only. No language model is connected, so a brief runs one of four scripted scenarios. This picks the scenario; it isn't an AI model setting.</p>
				</details>
				<p className="aop-footnote"><Lock size={12} />Saved in this browser. A brief never creates new integrations or broadens permissions.</p>
				<footer className="aop-setup-bar"><DsButton onClick={onCancel}>Cancel</DsButton></footer>
			</div>
		</div>
	)
}
