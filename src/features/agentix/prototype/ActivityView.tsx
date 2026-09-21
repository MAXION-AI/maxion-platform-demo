import { CaretRight, CheckCircle, Info, Pulse, Warning, WarningCircle, XCircle } from "@phosphor-icons/react"
import { Mark, SegmentedTabs } from "@/design/primitives"
import { useState } from "react"
import { artifactBy, itemBy, releaseBy } from "./engine/engine"
import { memberName, shortTime } from "./engine/selectors"
import type { ActivityEvent, AgentixState, Nav, ObjectRef } from "./engine/types"

const DECISIONS = new Set<ActivityEvent["kind"]>(["decision"])
const OPERATIONS = new Set<ActivityEvent["kind"]>(["step", "check", "repair", "effect", "release", "version", "cycle", "assignment"])
const matches = (event: ActivityEvent, filter: Nav["activityFilter"]) => filter === "all" || (filter === "decisions" ? DECISIONS.has(event.kind) : filter === "operations" ? OPERATIONS.has(event.kind) : event.kind === "instruction" || event.actor === "owner")
const TONE_ICON = { positive: CheckCircle, attention: WarningCircle, danger: XCircle, live: Pulse, neutral: Info }

/*
 * Activity: every agent action, decision, tool operation and instruction, in
 * time order, each line naming what it touched. Tool operations are one
 * disclosure away; there is no private reasoning here, only what was done.
 * It reads like the Relevance AI task timeline (mobbin 83aa02a2).
 */
export function ActivityView({ state, engagementId, filter, onFilter, onOpen }: { state: AgentixState; engagementId: string; filter: Nav["activityFilter"]; onFilter: (filter: Nav["activityFilter"]) => void; onOpen: (ref: ObjectRef) => void }) {
	const [limit, setLimit] = useState(50)
	const events = state.events.filter(event => event.engagementId === engagementId && matches(event, filter)).sort((a, b) => b.at - a.at)
	const shown = events.slice(0, limit)
	const days = new Map<string, ActivityEvent[]>()
	for (const event of shown) {
		const day = new Date(event.at).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" })
		days.set(day, [...days.get(day) ?? [], event])
	}
	const counts = { all: 0, decisions: 0, operations: 0, instructions: 0 }
	for (const event of state.events) if (event.engagementId === engagementId) { counts.all++; if (matches(event, "decisions")) counts.decisions++; if (matches(event, "operations")) counts.operations++; if (matches(event, "instructions")) counts.instructions++ }
	return (
		<div className="aop-activity">
			<div className="aop-activity-tools">
				<SegmentedTabs label="Activity filter" value={filter} onChange={onFilter} options={[{ value: "all", label: "All", count: counts.all }, { value: "decisions", label: "Decisions", count: counts.decisions }, { value: "operations", label: "Operations", count: counts.operations }, { value: "instructions", label: "Instructions", count: counts.instructions }]} />
				<p className="aop-hint">No private reasoning is shown; only what was done and its evidence.</p>
			</div>
			{[...days.entries()].map(([day, list]) => (
				<section key={day} className="aop-activity-day" aria-label={day}>
					<h2 className="aop-activity-date">{day}</h2>
					<ol className="aop-activity-list">
						{list.map(event => <ActivityRow key={event.id} state={state} event={event} onOpen={onOpen} />)}
					</ol>
				</section>
			))}
			{!events.length ? <p className="aop-quiet" role="status">Nothing recorded under this filter yet.</p> : null}
			{events.length > limit ? <button type="button" className="aop-history-toggle" onClick={() => setLimit(value => value + 50)}><CaretRight size={14} />Show older activity<span className="aop-tab-count">{events.length - limit}</span></button> : null}
		</div>
	)
}

function ActivityRow({ state, event, onOpen }: { state: AgentixState; event: ActivityEvent; onOpen: (ref: ObjectRef) => void }) {
	const Icon = TONE_ICON[event.tone] ?? Info
	const engagement = state.engagements[event.engagementId]
	const work = event.workItemId ? itemBy(state, event.workItemId) : undefined
	const artifact = event.artifactId ? artifactBy(state, event.artifactId) : undefined
	const release = event.releaseId ? releaseBy(state, event.releaseId) : undefined
	const actor = memberName(state, event.engagementId, event.actor)
	return (
		<li className={`aop-activity-row is-${event.tone}`}>
			<span className="aop-activity-icon" aria-hidden="true"><Icon size={14} weight={event.tone === "positive" ? "fill" : "regular"} /></span>
			<div className="aop-activity-body">
				<p className="aop-activity-meta">
					{event.actor === "owner" || event.actor === "demo" || event.actor === "agentix" ? <span className="aop-activity-actor">{actor}</span> : <span className="aop-activity-actor"><Mark seed={`${engagement.workflowId}:${event.actor}`} size="xs" />{actor}</span>}
					<time dateTime={new Date(event.at).toISOString()}>{shortTime(event.at)}</time>
				</p>
				<p className="aop-activity-text">{event.text}</p>
				{work || artifact || release ? (
					<p className="aop-chips">
						{work ? <button type="button" className="aop-chip is-outline aop-link-chip" onClick={() => onOpen({ kind: "work", id: work.id })}>{work.reference}</button> : null}
						{artifact ? <button type="button" className="aop-chip is-outline aop-link-chip" onClick={() => onOpen({ kind: "artifact", id: artifact.id })}>{artifact.title}</button> : null}
						{release ? <button type="button" className="aop-chip is-outline aop-link-chip" onClick={() => onOpen({ kind: "work", id: release.workItemId })}>{release.reference}</button> : null}
					</p>
				) : null}
				{event.operations?.length ? (
					<details className="aop-inline-disclosure aop-operations">
						<summary><CaretRight size={12} />{event.operations.length} tool operation{event.operations.length === 1 ? "" : "s"}</summary>
						<ul>{event.operations.map((operation, index) => <li key={index}>{operation.startsWith("Failed") ? <Warning size={12} aria-hidden="true" /> : null}{operation}</li>)}</ul>
					</details>
				) : null}
			</div>
		</li>
	)
}
