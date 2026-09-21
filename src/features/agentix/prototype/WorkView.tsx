import { ArrowRight, CaretDown, CaretRight, CheckCircle, Clock, Hourglass, LinkSimple, Pulse, RocketLaunch, UserCircle, Warning, WarningCircle } from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
import { Button as DsButton, Mark, TextButton } from "@/design/primitives"
import { ShimmerText, useRiseIn } from "@/components/motion/MotionKit"
import { forwardRef, useState } from "react"
import { artifactBy, isTerminal, itemBy, latest, releaseBy } from "./engine/engine"
import { achievements, dayLabel, itemSentence, measures, needsYou, releaseStatusLabel, shortTime, teamPresence, workSummary, type NeedsYouItem } from "./engine/selectors"
import { scopeKey, type AgentixState, type WorkItem } from "./engine/types"
import { DecisionCard } from "./Decisions"
import { WorkStatus, workIcon } from "./OperationsViews"
import { SCENARIOS } from "./engine/scenarios"
import { MappingPreview } from "./ResultPreviews"

export type WorkCallbacks = {
	onOpenWork: (id: string) => void
	onOpenResult: (id: string) => void
	onDecide: (decisionId: string, option: string) => void
	onTeam: () => void
	onRestore: () => void
}

/* A work item as one row: what it is, who has it, what it's doing, and the objects it's tied to. */
export const WorkRow = forwardRef<HTMLButtonElement, { state: AgentixState; item: WorkItem; onOpen: () => void }>(function WorkRow({ state, item, onOpen }, ref) {
	const rise = useRiseIn()
	const status = item.status
	const live = status === "working" || status === "verifying"
	const artifact = item.artifactIds.map(id => artifactBy(state, id)).find(Boolean)
	const version = artifact ? latest(artifact) : undefined
	const release = item.releaseIds.map(id => releaseBy(state, id)).filter(Boolean).at(-1)
	const dependency = item.wait?.kind === "dependency" ? itemBy(state, item.wait.on) : undefined
	const passed = version?.checks.filter(check => check.status === "passed").length ?? 0
	const draft = !!state.drafts[scopeKey(item.engagementId, { kind: "work", id: item.id })]
	return (
		<motion.button ref={ref} type="button" className={`aop-work-row${item.priority === "High" && !isTerminal(item) ? " is-priority" : ""}`} onClick={onOpen} {...rise} data-work={item.reference}>
			<span className={`aop-run-icon is-${live ? "live" : status === "verified" ? "positive" : ["waiting", "partial", "failed"].includes(status) && item.wait?.kind !== "dependency" ? (status === "failed" || item.wait?.kind === "permission" ? "danger" : "attention") : "neutral"}`} aria-hidden="true">{workIcon(state, item)}</span>
			<span className="aop-work-text">
				<strong>{item.title}</strong>
				<small><span className="aop-mono">{item.reference}</span> · {live ? <ShimmerText>{itemSentence(state, item)}</ShimmerText> : itemSentence(state, item)}</small>
				<span className="aop-work-chips">
					{dependency ? <span className="aop-chip is-outline"><LinkSimple size={12} />After {dependency.reference}</span> : null}
					{version && item.kind === "milestone" ? <span className="aop-chip is-outline">{artifact!.title} v{version.version}{version.checks.length ? ` · ${passed}/${version.checks.length} checks` : ""}</span> : null}
					{release && release.status !== "superseded" ? <span className="aop-chip is-outline"><RocketLaunch size={12} />{release.reference} · {releaseStatusLabel[release.status].label}</span> : null}
					{item.priority === "High" && !isTerminal(item) ? <span className="aop-chip">High priority</span> : null}
					{draft ? <span className="aop-chip is-outline">Unsent message</span> : null}
				</span>
			</span>
			<span className="aop-run-status"><WorkStatus state={state} item={item} /><CaretRight size={14} aria-hidden="true" /></span>
		</motion.button>
	)
})

function WorkSection({ title, note, items, state, onOpen, empty }: { title: string; note?: string; items: WorkItem[]; state: AgentixState; onOpen: (id: string) => void; empty?: string }) {
	const [limit, setLimit] = useState(12)
	return (
		<section className="aop-work-section" aria-label={title}>
			<div className="aop-subhead"><h2>{title}</h2>{note ? <span>{note}</span> : null}</div>
			{items.length ? (
				<div className="aop-work-list">
					<AnimatePresence initial={false} mode="popLayout">
						{items.slice(0, limit).map(item => <WorkRow key={item.id} state={state} item={item} onOpen={() => onOpen(item.id)} />)}
					</AnimatePresence>
					{items.length > limit ? <DsButton size="sm" className="aop-more" onClick={() => setLimit(value => value + 12)}>Show {Math.min(12, items.length - limit)} more</DsButton> : null}
				</div>
			) : <p className="aop-quiet">{empty}</p>}
		</section>
	)
}

const NEEDS_KIND: Partial<Record<NeedsYouItem["kind"], string>> = { human: "A person's confirmation", failed: "Stopped · needs a next step", partial: "Partly complete", permission: "Release blocked", setup: "Setup" }

/* Needs you inside an engagement: the first decision in full, the rest as one-line rows. */
function NeedsYouHere({ state, items, callbacks }: { state: AgentixState; items: NeedsYouItem[]; callbacks: WorkCallbacks }) {
	if (!items.length) return null
	const [first, ...rest] = items
	const decision = first.decisionId
	const mapping = first.kind === "question" ? state.artifacts.find(artifact => artifact.id === `${first.engagementId}:mapping`) : undefined
	return (
		<section className="aop-needs" aria-label="Needs you">
			{decision ? (
				<DecisionCard state={state} decisionId={decision} compact onDecide={option => callbacks.onDecide(decision, option)} onOpen={() => first.workId && callbacks.onOpenWork(first.workId)}
					context={mapping ? <div className="aop-decision-context"><MappingPreview state={state} artifact={mapping} version={latest(mapping)} compact /></div> : undefined} />
			) : (
				<section className="aop-decision is-compact" aria-label={first.title}>
					<header className="aop-decision-head">
						<span className={`aop-icon-tile ${first.kind === "permission" || first.kind === "failed" ? "is-danger" : "is-warning"}`} aria-hidden="true">{first.kind === "human" ? <UserCircle size={16} /> : <WarningCircle size={16} />}</span>
						<div>
							<p className="aop-decision-kicker">{NEEDS_KIND[first.kind] ?? "Needs you"}</p>
							<h3>{first.title}</h3>
							<p>{first.detail}</p>
						</div>
					</header>
					<footer className="aop-decision-foot">
						<small>{first.kind === "permission" ? "Build and test continue. Nothing is released until permission is back." : "Only this item waits; other work continues."}</small>
						<div className="aop-actions">
							{first.kind === "permission" ? <DsButton variant="primary" onClick={callbacks.onRestore}>Restore release permission (demo)</DsButton> : <DsButton variant="primary" onClick={() => first.workId && callbacks.onOpenWork(first.workId)}>{first.action}<ArrowRight size={14} /></DsButton>}
						</div>
					</footer>
				</section>
			)}
			{rest.length ? (
				<ul className="aop-needs-more" aria-label="Also needs you">
					{rest.map(entry => (
						<li key={entry.key}><button type="button" onClick={() => entry.workId ? callbacks.onOpenWork(entry.workId) : undefined}><Warning size={14} aria-hidden="true" /><span className="aop-list-text"><strong>{entry.title}</strong><small>{entry.detail}</small></span><span className="aop-row-action">{entry.action}<CaretRight size={12} /></span></button></li>
					))}
				</ul>
			) : null}
		</section>
	)
}

export function WorkView({ state, engagementId, callbacks, showHistory, onHistory }: { state: AgentixState; engagementId: string; callbacks: WorkCallbacks; showHistory: boolean; onHistory: (open: boolean) => void }) {
	const engagement = state.engagements[engagementId]
	const items = state.work.filter(item => item.engagementId === engagementId)
	const open = items.filter(item => !isTerminal(item))
	const milestones = open.filter(item => item.kind === "milestone").sort((a, b) => a.reference.localeCompare(b.reference))
	const cycles = open.filter(item => item.kind === "cycle")
	const cases = open.filter(item => item.kind === "case").sort((a, b) => Number(b.priority === "High") - Number(a.priority === "High") || b.started - a.started)
	const finished = items.filter(isTerminal).sort((a, b) => (b.finished ?? b.started) - (a.finished ?? a.started))
	const waiting = needsYou(state, engagementId).filter(entry => entry.kind !== "proposal")
	const achieved = achievements(state, engagementId, 2)
	const team = teamPresence(state, engagementId)
	const figures = measures(state, engagementId)
	const operating = engagement.cycles !== "off"
	// Stale: the previous scheduled occurrence should have finished (two hours' grace) and nothing has been verified since it.
	const lastVerified = figures.lastCycle ? figures.lastCycle.finished ?? figures.lastCycle.started : undefined
	const next = Date.parse(engagement.nextOccurrence)
	const previous = next - (engagement.cycles === "weekdays" && new Date(next).getUTCDay() === 1 ? 3 : 1) * 86400000
	const stale = operating && lastVerified !== undefined && state.clock > previous + 2 * 3600000 && lastVerified < previous
	const deliveredCount = items.filter(item => item.kind === "milestone" && item.status === "verified").length
	return (
		<div className="aop-work-layout">
			<div className="aop-work-main">
				<section className="aop-now" aria-label="Now">
					<div className="aop-now-part">
						<span className="aop-now-label"><Pulse size={14} aria-hidden="true" />Now</span>
						<p>{workSummary(state, engagement)}</p>
					</div>
					<div className="aop-now-part">
						<span className="aop-now-label"><CheckCircle size={14} aria-hidden="true" />Achieved</span>
						{achieved.length ? (
								<ul className="aop-achieved">
									{achieved.map(entry => <li key={entry.key}><button type="button" onClick={() => entry.artifactId ? callbacks.onOpenResult(entry.artifactId) : entry.workId && callbacks.onOpenWork(entry.workId)}><CheckCircle size={14} weight="fill" aria-hidden="true" /><span className="aop-list-text"><strong>{entry.title}</strong><small>{entry.detail.endsWith(dayLabel(entry.at)) ? entry.detail : `${entry.detail} · ${dayLabel(entry.at)}`}</small></span></button></li>)}
								</ul>
							) : <p>Nothing verified yet. Results appear here only once their evidence checks pass.</p>}
					</div>
				</section>
				<NeedsYouHere state={state} items={waiting} callbacks={callbacks} />
				{milestones.length || deliveredCount ? <WorkSection title="Delivery" note={`${deliveredCount} of ${deliveredCount + milestones.length} milestones verified`} items={milestones} state={state} onOpen={callbacks.onOpenWork} empty="Every delivery milestone is verified. The engagement now runs as a daily operation." /> : null}
				{operating || cycles.length ? <WorkSection title={SCENARIOS[engagement.workflowId].delivery ? `Daily ${SCENARIOS[engagement.workflowId].delivery!.cycle.noun}` : "Scheduled reviews"} note={`Next ${shortTime(Date.parse(engagement.nextOccurrence))}`} items={cycles} state={state} onOpen={callbacks.onOpenWork} empty={figures.lastCycle ? `Last cycle ${figures.lastCycle.reference} verified ${shortTime(figures.lastCycle.finished ?? figures.lastCycle.started)}. The next one starts on schedule.` : "The first cycle starts on schedule."} /> : null}
				<WorkSection title={SCENARIOS[engagement.workflowId].caseLabel} note={`${cases.length} open`} items={cases} state={state} onOpen={callbacks.onOpenWork} empty={engagement.status === "paused" ? "Intake is paused. Admitted work continues; new work waits until you resume." : "No open cases. New work arrives through the approved trigger; you don't need to keep a conversation open."} />
				<section className="aop-work-section" aria-label="History">
					<button type="button" className="aop-history-toggle" aria-expanded={showHistory} onClick={() => onHistory(!showHistory)}>{showHistory ? <CaretDown size={14} /> : <CaretRight size={14} />}History<span className="aop-tab-count">{finished.length}</span></button>
					{showHistory ? <div className="aop-work-list">{finished.slice(0, 20).map(item => <WorkRow key={item.id} state={state} item={item} onOpen={() => callbacks.onOpenWork(item.id)} />)}{finished.length > 20 ? <p className="aop-quiet">Showing the latest 20 of {finished.length}. Older records are kept.</p> : null}</div> : null}
				</section>
			</div>
			<aside className="aop-work-aside" aria-label="Team and operation">
				<section className="aop-aside-section" aria-label="Team">
					<div className="aop-subhead"><h2>Team</h2><TextButton className="aop-aside-link" onClick={callbacks.onTeam}>Duties & tools</TextButton></div>
					<ul className="aop-presence">
						{team.map(entry => (
							<li key={entry.member.id}>
								<button type="button" onClick={() => entry.workId ? callbacks.onOpenWork(entry.workId) : callbacks.onTeam()}>
									<Mark seed={`${engagement.workflowId}:${entry.member.id}`} size="xs" />
									<span className="aop-list-text">
										<strong>{entry.member.name}{entry.member.accountable ? <span className="aop-chip">Accountable</span> : null}</strong>
										<small className={`is-${entry.state}`}>{entry.state === "working" ? <span className="aop-live-dot" aria-hidden="true" /> : entry.state === "dependency" ? <Hourglass size={12} aria-hidden="true" /> : entry.state === "decision" ? <WarningCircle size={12} aria-hidden="true" /> : entry.state === "recovering" ? <Warning size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}{entry.sentence}{entry.more ? ` · +${entry.more} more` : ""}</small>
									</span>
								</button>
							</li>
						))}
					</ul>
				</section>
				<section className="aop-aside-section" aria-label="Operation">
					<div className="aop-subhead"><h2>Operation</h2></div>
					<dl className="aop-rows is-compact">
						{operating ? <div><dt>Next cycle</dt><dd>{shortTime(Date.parse(engagement.nextOccurrence))}</dd></div> : null}
						{figures.lastCycle ? <div><dt>Data freshness</dt><dd className={stale ? "is-stale" : undefined}>{stale ? "Stale · " : ""}{SCENARIOS[engagement.workflowId].delivery ? `Dashboard refreshed ${shortTime(lastVerified!)}` : `Last review ${shortTime(lastVerified!)}`}</dd></div> : null}
						<div><dt>Service health</dt><dd>{engagement.connection === "expired" ? "Notification connection expired" : engagement.permission === "lost" ? "Release permission lost" : engagement.checking ? "Rechecking the notification connection" : "All connections checked"}</dd></div>
						<div><dt>Verified results</dt><dd>{figures.total ? `${figures.verified} of ${figures.total} finished` : "None finished yet"}</dd></div>
						<div><dt>Median time to verify</dt><dd>{figures.medianMinutes === null ? "—" : `${figures.medianMinutes} min`}</dd></div>
					</dl>
					<p className="aop-footnote">Derived from this engagement's records. No savings or ROI is claimed without a measured baseline.</p>
				</section>
			</aside>
		</div>
	)
}
