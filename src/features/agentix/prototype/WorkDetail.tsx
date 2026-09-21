import { Bell, BellSlash, CaretRight, ChatCircleText, CheckCircle, Circle, FlagBanner, LinkSimple, Minus, MinusCircle, Pause, PauseCircle, Play, Receipt, WarningCircle, XCircle } from "@phosphor-icons/react"
import { Button as DsButton, Mark } from "@/design/primitives"
import { ShimmerText } from "@/components/motion/MotionKit"
import { useEffect, useRef, type ReactNode } from "react"
import { artifactBy, artifactSpec, isTerminal, itemBy, latest, releaseBy, releaseWindowFor, scenarioOf, templateOf, type ReleaseAction, type WorkAction } from "./engine/engine"
import { itemSentence, memberName, releaseSentence, releaseStatusLabel, shortTime, statusOf } from "./engine/selectors"
import type { AgentixState, Artifact, Tone, WorkItem } from "./engine/types"
import { DecisionCard, FailedStep, HumanFulfillment, ReleaseCard } from "./Decisions"
import { Status, WorkStatus } from "./OperationsViews"
import { MappingPreview } from "./ResultPreviews"

const KIND = { case: "Case", cycle: "Scheduled cycle", milestone: "Delivery milestone" } as const
const TRIGGER = { Event: "incoming event", Schedule: "on schedule", Assignment: "assigned", Setup: "from activation" } as const
const OBLIGATION = { met: { label: "Evidenced", tone: "positive" }, pending: { label: "Pending", tone: "neutral" }, outstanding: { label: "Outstanding", tone: "attention" }, not_met: { label: "Not met", tone: "danger" } } as const

export type DetailCallbacks = {
	onDecide: (decisionId: string, option: string) => void
	onFulfill: (reference: string) => void
	onWork: (action: WorkAction) => void
	onRelease: (releaseId: string, action: ReleaseAction) => void
	onRestore: () => void
	onReconnect: () => void
	onOpenResult: (artifactId: string) => void
	onOpenWork: (id: string) => void
	onMessage: () => void
}

/*
 * One work item: what it is doing, what it needs, what it produced and what is
 * evidenced. It reads like the ElevenLabs conversation overview (mobbin 0ce2e993
 * family): title and pills, the one decision as a card, then steps as a
 * timeline, each one sentence with its owner and evidence.
 */
export function WorkDetail({ state, workId, callbacks }: { state: AgentixState; workId: string; callbacks: DetailCallbacks }) {
	const heading = useRef<HTMLHeadingElement>(null)
	useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [workId])
	const item = itemBy(state, workId)
	if (!item) return <p className="aop-quiet" role="status">This work item is no longer in the demo.</p>
	const template = templateOf(state, item)!
	const engagement = state.engagements[item.engagementId]
	const status = statusOf(state, item)
	const live = item.status === "working" || item.status === "verifying"
	const decision = item.wait?.kind === "decision" ? item.wait.decisionId : state.decisions.find(entry => entry.workItemId === item.id && entry.status === "open")?.id
	const release = item.releaseIds.map(id => releaseBy(state, id)).filter(entry => entry && entry.status !== "superseded").at(-1)
	const produced = item.artifactIds.map(id => artifactBy(state, id)).filter((entry): entry is NonNullable<typeof entry> => !!entry)
	const dependencies = item.dependsOn.map(dependency => ({ dependency, other: itemBy(state, dependency.id) })).filter(entry => entry.other)
	const lead = template.steps.find(step => step.owner !== "owner")?.owner ?? "coordinator"
	// The milestone question shows the artifact it is about, whatever this scenario named that decision.
	const decisionTemplate = decision ? state.decisions.find(entry => entry.id === decision)?.template : undefined
	const mapping = decisionTemplate && scenarioOf(state, item.engagementId).decisions[decisionTemplate]?.artifact === "mapping" ? state.artifacts.find(entry => entry.id === `${item.engagementId}:mapping`) : undefined
	const pausable = !isTerminal(item) && item.status !== "failed"
	const holdable = !isTerminal(item) && template.steps.some(step => step.kind === "notify")
	return (
		<article className="aop-case" aria-labelledby="aop-work-title">
			<header className="aop-case-head">
				<p className="aop-case-kicker"><span className="aop-mono">{item.reference}</span> · {KIND[item.kind]} · {TRIGGER[item.trigger]} {shortTime(item.started)}</p>
				<h2 id="aop-work-title" ref={heading} tabIndex={-1}>{item.title}</h2>
				<ul className="aop-pill-row" aria-label="Work item details">
					<li><WorkStatus state={state} item={item} /></li>
					<li className="aop-pill"><Mark seed={`${engagement.workflowId}:${lead}`} size="xs" />{memberName(state, item.engagementId, lead)}</li>
					{item.priority === "High" && !isTerminal(item) ? <li className="aop-pill is-strong">High priority</li> : null}
					{item.held && !isTerminal(item) ? <li><Status label="Notification held" tone="attention" icon={<BellSlash size={12} weight="bold" />} /></li> : null}
					<li className="aop-pill">Deployment v{engagement.version}</li>
				</ul>
			</header>

			{!status.needsYou || item.status === "partial" ? (
				<p className={`aop-case-activity is-${status.tone}`} role="status">
					{live ? <span className="aop-live-dot" aria-hidden="true" /> : null}
					{live ? <ShimmerText>{itemSentence(state, item)}</ShimmerText> : <span>{itemSentence(state, item)}</span>}
				</p>
			) : null}

			{decision && release?.decisionId !== decision ? <DecisionCard state={state} decisionId={decision} onDecide={option => callbacks.onDecide(decision, option)} context={mapping ? <div className="aop-decision-context"><MappingPreview state={state} artifact={mapping} version={latest(mapping)} compact /></div> : undefined} /> : null}
			{item.status === "waiting" && item.wait?.kind === "human" ? <HumanFulfillment reference={item.reference} onAttach={callbacks.onFulfill} /> : null}
			{item.status === "failed" ? <FailedStep state={state} workId={item.id} onRetry={() => callbacks.onWork("retry")} onMessage={callbacks.onMessage} /> : null}
			{item.status === "partial" ? <PartialBlock state={state} item={item} onReconnect={callbacks.onReconnect} onRelease={() => callbacks.onWork("release-hold")} /> : null}
			{release ? (release.status === "awaiting_approval" && release.decisionId
				? <DecisionCard state={state} decisionId={release.decisionId} onDecide={option => callbacks.onDecide(release.decisionId!, option)} />
				: <ReleaseCard state={state} release={release} onAction={action => callbacks.onRelease(release.id, action)} onRequestAgain={() => callbacks.onWork("request-release")} onRestore={callbacks.onRestore} />) : null}

			{produced.length ? (
				<section className="aop-case-section" aria-label="Produced">
					<div className="aop-subhead"><h3>Produced</h3><span>{produced.length}</span></div>
					<ul className="aop-produced">
						{produced.map(artifact => {
							const version = latest(artifact)
							const passed = version.checks.filter(check => check.status === "passed").length
							return <li key={artifact.id}><button type="button" onClick={() => callbacks.onOpenResult(artifact.id)}><span className="aop-list-text"><strong>{artifact.title} v{version.version}</strong><small>{version.summary}{version.checks.length ? ` · ${passed}/${version.checks.length} checks` : ""}</small></span><Status label={artifact.productionVersion === version.version ? "Live" : version.status === "tested" ? "Tested" : version.status === "failed" ? "Failed checks" : version.status === "testing" ? "Testing" : "Draft"} tone={artifact.productionVersion === version.version || version.status === "tested" ? "positive" : version.status === "failed" ? "danger" : version.status === "testing" ? "live" : "neutral"} /></button></li>
						})}
					</ul>
				</section>
			) : null}

			<section className="aop-case-section" aria-label="Steps">
				<div className="aop-subhead"><h3>Steps</h3><span>{item.steps.filter(step => step.status === "done").length} of {item.steps.filter(step => step.status !== "skipped").length} done</span></div>
				<ol className="aop-timeline">
					{template.steps.map((spec, index) => {
						const step = item.steps[index]
						if (step.status === "skipped") return null
						const current = step.status === "working" || step.status === "waiting"
						const artifact = spec.artifact ? artifactBy(state, `${item.engagementId}:${spec.artifact}`) : undefined
						const repairs = artifact?.versions.filter(version => version.source === "repair").length ?? 0
						const effect = item.effects.find(entry => entry.id === `${item.id}:${spec.id}`)
						// A current release step reads from its release; any other current step that waits reads from the item's wait.
						const stepRelease = spec.kind === "release" && current && release?.artifactId === artifact?.id ? release : undefined
						const waitingHere = current && !stepRelease && (step.status === "waiting" || ((item.status === "waiting" || item.status === "partial") && item.wait?.kind !== "dependency"))
						const view: { label: string; tone: Tone } | undefined = stepRelease ? releaseStatusLabel[stepRelease.status] : waitingHere ? { label: status.label, tone: status.tone } : undefined
						const tone = view?.tone ?? (step.status === "done" ? "positive" : step.status === "failed" ? "danger" : current ? "live" : "neutral")
						const mark: ReactNode = step.status === "done" ? <CheckCircle size={16} weight="fill" /> : step.status === "failed" ? <XCircle size={16} weight="fill" /> : view && view.tone !== "live" ? <WarningCircle size={16} weight="fill" /> : current ? <span className="aop-live-dot" /> : isTerminal(item) ? <MinusCircle size={16} /> : <Circle size={16} />
						const text = step.status === "done" ? spec.done : stepRelease ? releaseSentence(state, stepRelease) : waitingHere ? itemSentence(state, item) : current ? spec.doing : spec.owner === "owner" ? "Needs a person when reached" : spec.doing
						return (
							<li key={spec.id} className={`is-${tone}${step.status === "pending" ? " is-future" : ""}`}>
								<span className="aop-timeline-mark" aria-hidden="true">{mark}</span>
								<div className="aop-timeline-body">
									<p className="aop-timeline-title"><strong>{spec.title}</strong>{step.doneAt ? <span className="aop-subtle">{shortTime(step.doneAt)}</span> : null}</p>
									<div className="aop-timeline-card">
										<p>{text.replace(/\.$/, "")}.</p>
										{spec.kind === "test" && artifact && step.status !== "pending" ? <TestHistory state={state} artifact={artifact} /> : null}
										<p className="aop-chips">
											<Status label={view?.label ?? (step.status === "done" ? "Done" : step.status === "failed" ? "Failed" : current ? "In progress" : isTerminal(item) ? "Not started" : "Pending")} tone={tone} icon={step.status === "pending" && isTerminal(item) ? <Minus size={12} weight="bold" /> : undefined} />
											<span className="aop-chip is-outline">{spec.owner === "owner" ? <FlagBanner size={12} /> : <Mark seed={`${engagement.workflowId}:${spec.owner}`} size="xs" />}{memberName(state, item.engagementId, spec.owner)}</span>
											{spec.kind === "test" && artifact ? <span className="aop-chip is-outline">{artifact.title} v{latest(artifact).version}{repairs ? ` · repaired ${repairs}×` : ""}</span> : null}
											{effect ? <span className="aop-chip is-outline"><Receipt size={12} />{effect.status === "unknown" ? "Outcome unknown · reconciling" : `${effect.sends} dispatch${effect.sends === 1 ? "" : "es"}${effect.reference ? ` · ${effect.reference}` : ""}${item.flags.reconciled ? " · reconciled, no duplicate" : ""}`}</span> : null}
											{spec.system ? <span className="aop-chip is-outline">{spec.system}</span> : null}
										</p>
									</div>
								</div>
							</li>
						)
					})}
				</ol>
			</section>

			<section className="aop-case-section" aria-label="Required outcomes">
				<div className="aop-subhead"><h3>{item.status === "verified" ? "Verified outcome" : "Required outcomes"}</h3><span>{item.obligations.filter(entry => entry.status === "met").length} of {item.obligations.length} evidenced</span></div>
				<ul className="aop-criteria">
					{item.obligations.map(obligation => {
						const spec = template.obligations.find(entry => entry.id === obligation.id)
						const view = OBLIGATION[obligation.status]
						return <li key={obligation.id}><span className="aop-check-text"><span>{spec?.label ?? obligation.id}</span><small>{obligation.status === "met" ? obligation.evidence ?? spec?.evidence : `Evidence: ${spec?.evidence ?? "read-back"}`}</small></span><Status label={view.label} tone={view.tone} /></li>
					})}
				</ul>
				{item.status === "verified" ? <p className="aop-case-note"><CheckCircle size={14} weight="fill" />Verified for {item.reference} only. {scenarioOf(state, item.engagementId).team.find(member => member.accountable)?.name ?? "The agent"} stays deployed for the next piece of work.</p> : null}
			</section>

			{dependencies.length ? (
				<section className="aop-case-section" aria-label="Depends on">
					<div className="aop-subhead"><h3>Depends on</h3></div>
					<ul className="aop-criteria">
						{dependencies.map(({ dependency, other }) => {
							const met = dependency.step ? other!.steps.find(step => step.id === dependency.step)?.status === "done" : other!.status === "verified"
							const stepTitle = dependency.step ? templateOf(state, other!)?.steps.find(step => step.id === dependency.step)?.title : undefined
							return <li key={dependency.id}><button type="button" className="aop-link-row" onClick={() => callbacks.onOpenWork(other!.id)}><LinkSimple size={14} /><span>{other!.reference} · {other!.title}{stepTitle ? ` · ${stepTitle.toLowerCase()}` : ""}</span></button><Status label={met ? "Ready" : "Waiting"} tone={met ? "positive" : "neutral"} /></li>
						})}
					</ul>
				</section>
			) : null}

			<details className="aop-case-disclosure">
				<summary><span>Authority for this work</span><CaretRight size={14} /></summary>
				<dl className="aop-rows is-stacked">
					<div><dt>May</dt><dd>{scenarioOf(state, item.engagementId).boundary}</dd></div>
					{produced.map(artifact => { const spec = artifactSpec(state, artifact); return spec?.release ? <div key={artifact.id}><dt>{artifact.title} releases</dt><dd>{spec.release.policy ?? (engagement.answers.release === "window" ? `In the ${releaseWindowFor(engagement.workflowId).label} window under your policy.` : "Only after your approval, with target, checks and recovery limits.")}</dd></div> : null })}
					{item.notes.length ? <div><dt>Record</dt><dd>{item.notes.join(" ")}</dd></div> : null}
				</dl>
				<small className="aop-footnote">A passed isolated test is not a production result, and a provider's acceptance isn't delivery.</small>
			</details>

			<div className="aop-actions aop-case-actions">
				<DsButton onClick={callbacks.onMessage}><ChatCircleText size={14} />Message about {item.reference}</DsButton>
				{pausable ? <DsButton onClick={() => callbacks.onWork(item.status === "paused" ? "resume" : "pause")}>{item.status === "paused" ? <Play size={14} /> : <Pause size={14} />}{item.status === "paused" ? "Resume work item" : "Pause work item"}</DsButton> : null}
				{!isTerminal(item) && item.priority !== "High" ? <DsButton onClick={() => callbacks.onWork("prioritize")}>Prioritize</DsButton> : null}
				{holdable ? <DsButton onClick={() => callbacks.onWork(item.held ? "release-hold" : "hold")}>{item.held ? <Bell size={14} /> : <BellSlash size={14} />}{item.held ? "Release notification" : "Hold notification"}</DsButton> : null}
			</div>
		</article>
	)
}

/* Each tested version of an artifact and how its checks went: a failure, the bounded repair, the recheck. */
function TestHistory({ state, artifact }: { state: AgentixState; artifact: Artifact }) {
	const spec = artifactSpec(state, artifact)
	const tested = artifact.versions.filter(version => version.checks.some(check => check.status === "passed" || check.status === "failed"))
	if (tested.length < 2 && !tested.some(version => version.checks.some(check => check.status === "failed"))) return null
	const label = (id: string) => spec?.checks.find(check => check.id === id)?.label ?? id
	return (
		<ul className="aop-test-history" aria-label={`Test runs for ${artifact.title}`}>
			{tested.map(version => {
				const failed = version.checks.filter(check => check.status === "failed")
				const passed = version.checks.filter(check => check.status === "passed").length
				const origin = version.source === "repair" ? "automatic repair" : version.source === "amendment" ? "your requested change" : version.source === "decision" ? "your decision" : "first build"
				return (
					<li key={version.version} className={failed.length ? "is-danger" : "is-positive"}>
						{failed.length ? <XCircle size={14} weight="fill" aria-hidden="true" /> : <CheckCircle size={14} weight="fill" aria-hidden="true" />}
						<span><strong>v{version.version}</strong> · {origin} · {failed.length ? `${failed.length} of ${version.checks.length} checks failed: ${failed.map(check => label(check.id)).join("; ")}` : `${passed} of ${version.checks.length} checks passed`}</span>
					</li>
				)
			})}
		</ul>
	)
}

/* Partial: what succeeded is kept; only the outstanding obligation waits, with the one thing that frees it. */
function PartialBlock({ state, item, onReconnect, onRelease }: { state: AgentixState; item: WorkItem; onReconnect: () => void; onRelease: () => void }) {
	const engagement = state.engagements[item.engagementId]
	const expired = engagement.connection === "expired"
	const checking = engagement.checking
	return (
		<section className={`aop-callout ${expired ? "is-danger" : "is-warning"}`} aria-label="Partial outcome">
			{expired ? <XCircle size={18} /> : <PauseCircle size={18} />}
			<div className="aop-callout-body">
				<h3>Record work is done and kept. The notification is outstanding.</h3>
				<p>{expired ? "The notification connection expired. Reconnecting resumes only the outstanding send; the recorded change is not repeated." : checking ? "Rechecking the restored connection; the send resumes on its own." : item.held ? "You held this notification. It stays incomplete until you release it." : "Notifications are held for the whole engagement. This resumes once they're released."}</p>
				<div className="aop-callout-actions">
					{expired ? <DsButton variant="primary" onClick={onReconnect}>Reconnect notification account (demo)</DsButton> : item.held ? <DsButton variant="primary" onClick={onRelease}><Bell size={14} />Release this notification</DsButton> : null}
				</div>
			</div>
		</section>
	)
}
