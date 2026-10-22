import { CaretRight } from "@phosphor-icons/react"
import { CheckCircle, Info, Pulse, Warning, WarningCircle, XCircle } from "./glyphs"
import { Mark, SegmentedTabs } from "@/design/primitives"
import { useState } from "react"
import { artifactBy, itemBy, releaseBy } from "./engine/engine"
import { clockLabel, memberName, shortTime } from "./engine/selectors"
import { Prose, withoutReference } from "./prose"
import type { ActivityEvent, AgentixState, Nav, ObjectRef } from "./engine/types"

const DECISIONS = new Set<ActivityEvent["kind"]>(["decision"])
const OPERATIONS = new Set<ActivityEvent["kind"]>(["step", "check", "repair", "effect", "release", "version", "cycle", "assignment", "handoff"])
const matches = (event: ActivityEvent, filter: Nav["activityFilter"]) => filter === "all" || (filter === "decisions" ? DECISIONS.has(event.kind) : filter === "operations" ? OPERATIONS.has(event.kind) : event.kind === "instruction" || event.actor === "owner")
/* Entries by one teammate within ten minutes of each other read as one run. */
const RUN_GAP = 10 * 60_000
const TONE_ICON = { positive: CheckCircle, attention: WarningCircle, danger: XCircle, live: Pulse, neutral: Info }

/*
 * Activity: every agent action, decision, tool operation and instruction, in
 * time order, each line naming what it touched. Tool operations are one
 * disclosure away; there is no private reasoning here, only what was done.
 * It reads as one quiet timeline: a status seal on a thread, who and when,
 * what happened in reading type, and what it touched as plain links.
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
			</div>
			{[...days.entries()].map(([day, list]) => (
				<section key={day} className="aop-activity-day" aria-label={day}>
					<h2 className="aop-activity-date">{day}</h2>
					<ol className="aop-activity-list">
						{list.map((event, index) => <ActivityRow key={event.id} state={state} event={event} continued={index > 0 && list[index - 1].actor === event.actor && list[index - 1].at - event.at <= RUN_GAP} onOpen={onOpen} />)}
					</ol>
				</section>
			))}
			{!events.length ? <p className="aop-quiet" role="status">Nothing recorded under this filter yet.</p> : null}
			{events.length > limit ? <button type="button" className="aop-history-toggle" onClick={() => setLimit(value => value + 50)}><CaretRight size={14} />Show older activity<span className="aop-tab-count">{events.length - limit}</span></button> : null}
		</div>
	)
}

/* Consecutive entries by the same teammate read as one run: the name once, then only the times. */
function ActivityRow({ state, event, continued, onOpen }: { state: AgentixState; event: ActivityEvent; continued: boolean; onOpen: (ref: ObjectRef) => void }) {
	const Icon = TONE_ICON[event.tone] ?? Info
	const engagement = state.engagements[event.engagementId]
	const work = event.workItemId ? itemBy(state, event.workItemId) : undefined
	const artifact = event.artifactId ? artifactBy(state, event.artifactId) : undefined
	const release = event.releaseId ? releaseBy(state, event.releaseId) : undefined
	const actor = memberName(state, event.engagementId, event.actor)
	// The work it belongs to is named once, as a link, so the sentence doesn't start with its reference too.
	const text = work ? withoutReference(event.text, work.reference) : event.text
	return (
		<li className={`aop-activity-row is-${event.tone}${continued ? " is-continued" : ""}`}>
			<span className="aop-activity-icon" aria-hidden="true"><Icon size={18} weight={event.tone === "positive" ? "fill" : "regular"} /></span>
			<div className="aop-activity-body">
				<p className="aop-activity-meta">
					{continued ? <span className="sr-only">{actor}</span> : event.actor === "owner" || event.actor === "demo" || event.actor === "agentix" ? <span className="aop-activity-actor">{actor}</span> : <span className="aop-activity-actor">{actor}</span>}
					<time dateTime={new Date(event.at).toISOString()} title={shortTime(event.at)}>{clockLabel(event.at)}</time>
				</p>
				<p className="aop-activity-text"><Prose text={text} /></p>
				{work || artifact || release ? (
					<p className="aop-refs">
						{work ? <button type="button" className="aop-ref" onClick={() => onOpen({ kind: "work", id: work.id })}>{work.reference}</button> : null}
						{artifact ? <button type="button" className="aop-ref" onClick={() => onOpen({ kind: "artifact", id: artifact.id })}>{artifact.title}</button> : null}
						{release ? <button type="button" className="aop-ref" onClick={() => onOpen({ kind: "work", id: release.workItemId })}>{release.reference}</button> : null}
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
