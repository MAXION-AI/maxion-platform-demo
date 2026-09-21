import { ArrowLeft, ArrowRight, CaretDown, CaretRight, CheckCircle, FileArrowDown, ShieldCheck, WarningCircle, XCircle } from "@phosphor-icons/react"
import { Button as DsButton, Mark, TextButton } from "@/design/primitives"
import { useId } from "react"
import { activationBlockers, type DefinitionPatch } from "./engine/engine"
import { packageFor, SCENARIOS } from "./engine/scenarios"
import { readinessSplit, shortTime, teamOf } from "./engine/selectors"
import type { AgentixState, Engagement } from "./engine/types"
import { EngagementSteps } from "./EngagementStart"
import { ReadinessRows, Status } from "./OperationsViews"

const CAPABILITY = { read: "Read", build: "Build & test", production: "Production change", update: "Record update", notify: "Notify" } as const

/*
 * Preparation, review and activation: the same page whether the work came from
 * Discovery or from a brief. It leads with what activation starts, the
 * boundary, the systems and the questions only the owner can answer; duties,
 * milestones, coverage and the source package are one disclosure away. The
 * layout is the ElevenLabs publishing stepper (mobbin stepper-details) and the
 * create-agent "Complete your agent" column (mobbin 49af5195).
 */
export function ProposalReview({ state, engagement, onAnswer, onEdit, onAction, onActivate, onBack, onSetAside, onOpenDiscoveryRecord }: {
	state: AgentixState; engagement: Engagement
	onAnswer: (question: string, option: string) => void; onEdit: (patch: DefinitionPatch) => void
	onAction: (action: "recheck" | "use-human-payroll" | "request-payroll" | "support") => void
	onActivate: () => void; onBack: () => void; onSetAside?: () => void
	onOpenDiscoveryRecord?: (recordId: string) => void
}) {
	const id = useId()
	const scenario = SCENARIOS[engagement.workflowId]
	const proposal = engagement.proposal
	const pkg = proposal?.packageId ? packageFor(proposal.packageId) : undefined
	const expansion = engagement.status !== "draft"
	const blockers = activationBlockers(state, engagement.id)
	const readiness = readinessSplit(state, engagement)
	const ready = !blockers.length
	const team = teamOf({ ...engagement, packages: pkg ? [...engagement.packages, pkg.id] : engagement.packages })
	const reused = new Set(teamOf(engagement).map(member => member.id))
	const systems = scenario.systems.filter(system => !system.package || system.package === pkg?.id || engagement.packages.includes(system.package))
	const onboarding = engagement.workflowId === "onboarding"
	/*
	 * The read-only check is the last thing between a reviewed proposal and activation, and its
	 * button sat mid-page below the readiness rows. Offer it in the action bar, beside the disabled
	 * Activate, once it is the NEXT blocker -- while a question is still unanswered the bar names
	 * that instead, so it never advertises a step the owner cannot usefully take yet.
	 */
	const needsCheck = !expansion && !engagement.checking && blockers[0] === "Run the readiness check."
	// A package handed over by a Discovery names that Discovery and its packet, and leads back to it.
	const handedOver = proposal?.origin === "discovery" ? proposal.discovery : undefined
	const source = handedOver
		? <>From Discovery · {onOpenDiscoveryRecord ? <button type="button" className="aop-scope-action" onClick={() => onOpenDiscoveryRecord(handedOver.recordId)}>{handedOver.title}</button> : handedOver.title} · packet {handedOver.packetId}</>
		: proposal?.origin === "discovery" && pkg ? `From Discovery · ${pkg.title} v${pkg.version} · ${pkg.id}` : "From your brief"
	return (
		<div className="aop-setup aop-setup-review">
			<EngagementSteps step={ready ? 3 : 2} />
			<div className="aop-setup-main">
				<header className="aop-create-head">
					<p className="aop-case-kicker"><FileArrowDown size={12} aria-hidden="true" /> {source}{proposal ? ` · received ${shortTime(proposal.receivedAt)}` : ""}</p>
					<h1 tabIndex={-1}>{expansion ? `Expand ${engagement.name}` : `Review ${engagement.name}`}</h1>
					<p>{expansion ? `The deployed team takes on ${pkg?.title.toLowerCase() ?? "this work"}. Its current work and history stay as they are; nothing new runs until you activate.` : "A new engagement, saved as a draft. Nothing runs until you activate it."}</p>
				</header>

				<section className="aop-step-section" aria-label="What activation starts">
					<header className="aop-section-head"><div><h2>What activation starts</h2><p>The outcome, the boundary and the systems involved. Detailed duties and coverage are below.</p></div></header>
					<dl className="aop-terms">
						<div><dt>Outcome</dt><dd>{pkg?.outcome ?? scenario.outcome}</dd></div>
						<div><dt>Boundary</dt><dd>{scenario.boundary}</dd></div>
						<div><dt>Systems</dt><dd><span className="aop-chips">{systems.map(system => <span key={system.id} className="aop-chip is-outline"><Mark seed={system.name} size="xs" />{system.name} · {CAPABILITY[system.capability]}</span>)}</span></dd></div>
						{pkg?.milestones.length ? <div><dt>Starts</dt><dd>{pkg.milestones.map(milestone => milestone.title).join(", ")}{scenario.delivery ? `; then a daily ${scenario.delivery.cycle.noun} at ${String(scenario.delivery.cycle.hour).padStart(2, "0")}:00 London once delivery is verified.` : "."}</dd></div> : <div><dt>Starts</dt><dd>New work from activation onward. An existing backlog is only processed if you assign it.</dd></div>}
					</dl>
				</section>

				{pkg?.questions.length ? (
					<section className="aop-step-section" aria-label="Open questions">
						<header className="aop-section-head"><div><h2>Only you can answer these</h2><p>Everything else was worked out from the {proposal?.origin === "discovery" ? "Discovery package" : "brief and scenario"}.</p></div><Status label={pkg.questions.every(question => proposal?.answers[question.id]) ? "Answered" : `${pkg.questions.filter(question => !proposal?.answers[question.id]).length} open`} tone={pkg.questions.every(question => proposal?.answers[question.id]) ? "positive" : "attention"} /></header>
						<div className="aop-questions">
							{pkg.questions.map(question => (
								<fieldset key={question.id} className="aop-question">
									<legend>{question.label}</legend>
									<p className="aop-hint">{question.detail}</p>
									{question.options.map(option => (
										<label key={option.id} className={`aop-choice${proposal?.answers[question.id] === option.id ? " is-selected" : ""}`}>
											<input type="radio" name={`${id}-${question.id}`} value={option.id} checked={proposal?.answers[question.id] === option.id} onChange={() => onAnswer(question.id, option.id)} />
											<span className="aop-list-text"><strong>{option.label}{option.recommended ? <span className="aop-chip">Recommended</span> : null}</strong><small>{option.effect}</small></span>
										</label>
									))}
								</fieldset>
							))}
						</div>
					</section>
				) : null}

				{onboarding && !expansion ? (
					<section className="aop-step-section" aria-label="Payroll">
						{engagement.automaticPayroll ? (
							<div className="aop-callout is-danger">
								<XCircle size={18} />
								<div className="aop-callout-body">
									<h3>Automatic payroll provisioning isn't supported.</h3>
									<p>The integration has no certified provision-and-verify operation. A broader permission or mapping won't fix this, so the full outcome can't be marked ready.</p>
									<p className="aop-callout-meta">Owner: MAXION integrations · available instead: the payroll owner provisions access and Agentix tracks their confirmation.</p>
									<div className="aop-callout-actions">
										<DsButton variant="primary" onClick={() => onAction("use-human-payroll")}>Keep payroll with its owner</DsButton>
										<TextButton disabled={engagement.supportRequested} onClick={() => onAction("support")}>{engagement.supportRequested ? "Demo request AGX-104 recorded · still unsupported" : "Request this capability from MAXION"}</TextButton>
									</div>
								</div>
							</div>
						) : <p className="aop-callout"><ShieldCheck size={16} />Payroll access stays with its owner; Agentix tracks their confirmation. <TextButton className="aop-foot-link" onClick={() => onAction("request-payroll")}>What if payroll must be fully automated?</TextButton></p>}
					</section>
				) : null}

				<section className="aop-step-section" aria-label="Readiness">
					<header className="aop-section-head"><div><h2>Readiness</h2><p>{readiness.summary}</p></div><Status label={readiness.full ? "Ready" : readiness.rows.some(row => row.state === "blocked") ? "Partly blocked" : "Not ready"} tone={readiness.full ? "positive" : readiness.rows.some(row => row.state === "blocked") ? "danger" : "attention"} /></header>
					<ReadinessRows rows={readiness.rows} />
					{!expansion ? (
						<div className="aop-section-foot">
							{engagement.checking ? <p className="aop-hint" role="status"><span className="aop-live-dot" aria-hidden="true" /> Checking connections and read-back…</p>
								: engagement.checked ? <p className="aop-hint"><CheckCircle size={12} weight="fill" /> Read-only check passed. Nothing was written.</p>
								: <p className="aop-hint">The read-only check runs from the action bar below.</p>}
							<small>A read-only check, not a live provider certification.</small>
						</div>
					) : null}
				</section>

				{!expansion ? (
					<section className="aop-step-section" aria-label="Engagement details">
						<header className="aop-section-head"><div><h2>Engagement details</h2><p>Name it and name who is accountable. Scope changes need the check again.</p></div></header>
						<div className="aop-definition-fields">
							<div className="aop-field"><label htmlFor={`${id}-name`}>Engagement name</label><input id={`${id}-name`} className="ds-input" value={engagement.name} maxLength={80} onChange={event => onEdit({ name: event.target.value })} aria-invalid={!engagement.name.trim()} /></div>
							<div className="aop-field"><label htmlFor={`${id}-owner`}>Accountable owner</label><input id={`${id}-owner`} className="ds-input" value={engagement.owner} maxLength={80} onChange={event => onEdit({ owner: event.target.value })} aria-invalid={!engagement.owner.trim()} /></div>
							<div className="aop-field aop-definition-scope"><label htmlFor={`${id}-scope`}>Operating scope</label><textarea id={`${id}-scope`} className="ds-textarea" value={engagement.scope} maxLength={2000} rows={3} onChange={event => onEdit({ scope: event.target.value })} aria-invalid={!engagement.scope.trim()} /></div>
						</div>
					</section>
				) : null}

				<section className="aop-step-section aop-review-details" aria-label="Details">
					<details className="aop-case-disclosure">
						<summary><span>Team · {team.length === 1 ? "one agent" : expansion ? `${team.filter(member => reused.has(member.id)).length} already deployed, ${team.filter(member => !reused.has(member.id)).length} added` : `${team.length} specialists, one accountable`}</span><CaretRight size={14} /></summary>
						<p className="aop-sheet-desc">{scenario.teamReason}</p>
						<ul className="aop-list">
							{team.map(member => <li key={member.id} className="aop-list-row"><Mark seed={`${engagement.workflowId}:${member.id}`} size="sm" /><span className="aop-list-text"><strong>{member.name}{member.accountable ? <span className="aop-chip">Accountable</span> : null}</strong><small>{member.duty} · {member.tools}</small></span><Status label={reused.has(member.id) && expansion ? "Reused" : expansion ? "Added" : "Proposed"} tone={reused.has(member.id) && expansion ? "positive" : "neutral"} /></li>)}
						</ul>
					</details>
					{pkg?.milestones.length ? (
						<details className="aop-case-disclosure">
							<summary><span>Milestones · {pkg.milestones.length}, with dependencies</span><CaretRight size={14} /></summary>
							<ol className="aop-coverage">
								{pkg.milestones.map((milestone, index) => (
									<li key={milestone.reference}>
										<span className="aop-coverage-index">{index + 1}</span>
										<span className="aop-coverage-step"><strong>{milestone.reference} · {milestone.title}</strong><small>{milestone.dependsOn?.length ? `After ${milestone.dependsOn.map(dependency => `${dependency.reference}${dependency.step === "test" ? "'s validated schema" : ""}`).join(", ")}` : "Starts at activation"} · built and tested in isolation, released under your policy</small></span>
										<span className="aop-coverage-flow">{SCENARIOS[engagement.workflowId].templates[milestone.template]?.steps.map(step => step.owner).filter((owner, position, all) => owner !== "owner" && all.indexOf(owner) === position).map(owner => <span key={owner} className="aop-chip"><Mark seed={`${engagement.workflowId}:${owner}`} size="xs" />{scenario.team.find(member => member.id === owner)?.name}</span>)}</span>
									</li>
								))}
							</ol>
						</details>
					) : null}
					{pkg ? (
						<details className="aop-case-disclosure">
							<summary><span>Coverage · {pkg.criteria.length} of {pkg.criteria.length} outcomes have a duty and a check</span><CaretRight size={14} /></summary>
							<ul className="aop-criteria">{pkg.criteria.map(criterion => <li key={criterion.id}><span className="aop-check-text"><span>{criterion.label}</span><small>{scenario.team.find(member => member.id === criterion.duty)?.name} · verified by {criterion.verify.toLowerCase()}</small></span><Status label="Covered" tone="positive" /></li>)}</ul>
							{pkg.limitations.length ? <p className="aop-sheet-note"><WarningCircle size={12} /> Recorded limitations: {pkg.limitations.join(" ")}</p> : null}
						</details>
					) : null}
					{pkg ? (
						<details className="aop-case-disclosure">
							<summary><span>Source package · {pkg.evidence.length} sources, referenced not copied</span><CaretRight size={14} /></summary>
							<ul className="aop-source-list">{pkg.evidence.map(source => <li key={source.title}><Mark seed={source.title} size="xs" /><span className="aop-list-text"><strong>{source.title}</strong><small>{source.detail}</small></span></li>)}</ul>
							<dl className="aop-rows is-stacked"><div><dt>In scope</dt><dd>{pkg.inScope.join(" · ")}</dd></div><div><dt>Out of scope</dt><dd>{pkg.outScope.join(" · ")}</dd></div><div><dt>Execution needs</dt><dd>{pkg.needs.join(" · ")}</dd></div></dl>
						</details>
					) : null}
					{proposal?.brief ? <details className="aop-case-disclosure"><summary><span>{handedOver ? "Your handoff note" : "Your brief"}</span><CaretDown size={14} /></summary><p className="aop-sheet-desc">{proposal.brief}</p></details> : null}
				</section>

				<footer className="aop-setup-bar aop-deploy-bar">
					<div className="aop-actions">
						<DsButton onClick={onBack}><ArrowLeft size={14} />Back</DsButton>
						{expansion && onSetAside ? <TextButton onClick={onSetAside}>Set aside</TextButton> : null}
					</div>
					<div className="aop-setup-bar-end">
						<div className="aop-deploy-text" id={`${id}-activation`}>
							<strong>{ready ? (expansion ? `Ready to activate v${engagement.version + 1}` : "Ready for your activation") : "Before activation"}</strong>
							{/* Telling someone to press the button beside the words wastes the line; say what the check does instead. */}
							<span>{ready ? readiness.summary : needsCheck ? "Reads one record back. Nothing is written." : blockers[0]}</span>
						</div>
						{needsCheck ? <DsButton onClick={() => onAction("recheck")}>Run the read-only check</DsButton> : null}
						<DsButton variant="primary" disabled={!ready} aria-describedby={`${id}-activation`} onClick={onActivate}>{expansion ? "Activate expansion" : "Activate engagement"}<ArrowRight size={14} /></DsButton>
					</div>
				</footer>
			</div>
		</div>
	)
}
