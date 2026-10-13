import { useEffect, useRef, useState } from "react"
import { ArrowRight, ArrowUp, CaretRight, X } from "@phosphor-icons/react"
import { CheckCircle, Prohibit, UserCircle } from "./glyphs"

import { Badge, Button as DsButton, Mark } from "@/design/primitives"
import { artifactSpec, latest, templateOf } from "./engine/engine"
import { SCENARIOS } from "./engine/scenarios"
import { accountable, clockLabel, needsYou, shortTime, teamOf, teamPresence } from "./engine/selectors"
import { sendToAgent } from "./engine/steering"
import type { AgentixState } from "./engine/types"
import { DecisionCard } from "./Decisions"
import { reachOf, systemsOf } from "./floor"
import { Prose, withoutReference } from "./prose"

/*
 * A teammate's room, beside the floor. The owner sees what this agent is for, what it may and may
 * never touch, what it is doing and has built, and can talk to it directly. A specialist answers
 * for its own work; anything that would steer the team goes through the accountable agent, and no
 * room can approve, release or widen authority. The owner's own seat opens what waits on them,
 * with each decision decidable in place.
 */

export type RoomSelection = { kind: "owner" } | { kind: "agent"; id: string }
const CAPABILITY_LABEL = { read: "read only", build: "build and test", production: "production", update: "record update", notify: "notify" } as const

export function AgentRoom({ state, engagementId, selection, update, onSelect, onClose, onDecide, onOpenWork, onOpenResult, onToast }: {
	state: AgentixState
	engagementId: string
	selection: RoomSelection
	update: (recipe: (state: AgentixState) => AgentixState) => void
	onSelect: (selection: RoomSelection) => void
	onClose: () => void
	onDecide: (decisionId: string, option: string) => void
	onOpenWork: (id: string) => void
	onOpenResult: (id: string) => void
	onToast: (text: string) => void
}) {
	const engagement = state.engagements[engagementId]
	const lead = accountable(engagement)
	const headingRef = useRef<HTMLHeadingElement>(null)
	const key = selection.kind === "owner" ? "owner" : selection.id
	// Choosing a seat moves the reader into its room. A room that opens by itself (a decision arriving)
	// doesn't take focus from someone typing elsewhere.
	useEffect(() => {
		const active = document.activeElement
		const onFloor = !active || active === document.body || !!active.closest(".tf-canvas, .tf-room")
		if (onFloor) headingRef.current?.focus({ preventScroll: true })
	}, [key])
	const close = <button type="button" className="tf-room-close" aria-label="Close room" onClick={onClose}><X size={14} /></button>

	if (selection.kind === "owner") {
		const waiting = needsYou(state, engagementId).filter(entry => entry.kind !== "proposal")
		const decided = state.events.filter(event => event.engagementId === engagementId && event.actor === "owner" && event.kind === "decision").slice(-3).reverse()
		return (
			<aside className="tf-room" aria-labelledby="tf-room-title">
				<header className="tf-room-head">
					<span className="tf-room-icon" aria-hidden="true"><UserCircle size={20} /></span>
					<div>
						<h2 id="tf-room-title" ref={headingRef} tabIndex={-1}>You</h2>
						<p>{engagement.owner} · decisions stay with you</p>
					</div>
					{close}
				</header>
				<section className="tf-room-section" aria-label="Waiting on you">
					<h3>{waiting.length ? `${waiting.length} waiting on you` : "Nothing waits on you"}</h3>
					{waiting.length ? waiting.map(entry => entry.decisionId ? (
						<DecisionCard key={entry.key} state={state} decisionId={entry.decisionId} compact onDecide={option => onDecide(entry.decisionId!, option)} onOpen={entry.workId ? () => onOpenWork(entry.workId!) : undefined} />
					) : (
						<div key={entry.key} className="tf-room-row">
							<div><strong>{entry.title}</strong><span>{entry.detail}</span></div>
							{entry.workId ? <DsButton size="sm" onClick={() => onOpenWork(entry.workId!)}>{entry.action}<ArrowRight size={12} /></DsButton> : null}
						</div>
					)) : <p className="tf-room-quiet">The team works inside the authority you approved. Anything that crosses it comes here, with its evidence.</p>}
				</section>
				{decided.length ? (
					<section className="tf-room-section" aria-label="Your recent decisions">
						<h3>Your recent decisions</h3>
						<ol className="tf-room-list">{decided.map(event => <li key={event.id}><CheckCircle size={14} weight="fill" aria-hidden="true" /><span>{event.text}<time>{shortTime(event.at)}</time></span></li>)}</ol>
					</section>
				) : null}
			</aside>
		)
	}

	const member = teamOf(engagement).find(entry => entry.id === selection.id) ?? lead
	const isLead = member.id === lead.id
	const presence = teamPresence(state, engagementId).find(entry => entry.member.id === member.id)
	const item = presence?.workId ? state.work.find(work => work.id === presence.workId) : undefined
	const template = item ? templateOf(state, item) : undefined
	const step = item && template ? template.steps.find((spec, index) => spec.owner === member.id && (item.steps[index]?.status === "working" || item.steps[index]?.status === "waiting")) : undefined
	const links = systemsOf(engagement)
	const reach = reachOf(state, engagementId).filter(entry => entry.agent === member.id).map(entry => links.find(link => link.id === entry.system)).filter((link): link is NonNullable<typeof link> => !!link)
	const built = state.artifacts.filter(artifact => artifact.engagementId === engagementId && artifactSpec(state, artifact)?.owner === member.id)
	const recent = state.events.filter(event => event.engagementId === engagementId && event.actor === member.id && event.kind !== "instruction").slice(-4).reverse()
	const thread = state.messages.filter(message => message.engagementId === engagementId && (isLead ? !message.agentId : message.agentId === member.id)).slice(-8)
	const suggestions = isLead ? ["What is the team doing?", "What needs me?"] : ["What are you doing?", "Why are you waiting?", "What may you touch?"]
	return (
		<aside className="tf-room" aria-labelledby="tf-room-title">
			<header className="tf-room-head">
				<Mark seed={`${engagement.workflowId}:${member.id}`} />
				<div>
					<h2 id="tf-room-title" ref={headingRef} tabIndex={-1}>{member.name}{isLead ? <Badge>Accountable</Badge> : null}</h2>
					<p>{member.duty}</p>
				</div>
				{close}
			</header>
			<section className="tf-room-section" aria-label="What it may touch">
				<h3>May use</h3>
				<ul className="tf-room-chips">{reach.map(link => <li key={link.id}>{link.name}<span>{CAPABILITY_LABEL[link.capability]}</span></li>)}</ul>
				<p className="tf-room-never"><Prohibit size={14} aria-hidden="true" />{member.scope}{isLead ? "" : ` Production changes go through the ${lead.name.toLowerCase()}.`}</p>
			</section>
			<section className="tf-room-section" aria-label="Now">
				<h3>Now</h3>
				<p className="tf-room-now">{presence?.sentence ?? "Ready for incoming work"}</p>
				{step?.tools?.length ? <ul className="tf-room-tools">{step.tools.map(tool => <li key={tool}>{tool}</li>)}</ul> : null}
				{item ? <button type="button" className="tf-room-link" onClick={() => onOpenWork(item.id)}>Open {item.reference}<CaretRight size={12} /></button> : null}
			</section>
			{built.length ? (
				<section className="tf-room-section" aria-label="What it built">
					<h3>Built</h3>
					<ul className="tf-room-list is-plain">
						{built.map(artifact => {
							const version = latest(artifact)
							const passed = version.checks.filter(check => check.status === "passed").length
							return <li key={artifact.id}><button type="button" className="tf-room-link" onClick={() => onOpenResult(artifact.id)}>{artifact.title} v{version.version}<span>{version.checks.length ? `${passed} of ${version.checks.length} checks` : version.status}{artifact.productionVersion ? ` · v${artifact.productionVersion} in production` : ""}</span></button></li>
						})}
					</ul>
				</section>
			) : null}
			{recent.length ? (
				<section className="tf-room-section" aria-label="Recently">
					<h3>Recently</h3>
					<ol className="tf-room-list">{recent.map(event => <li key={event.id}><span className={`tf-dot is-${event.tone}`} aria-hidden="true" /><span><Prose text={withoutReference(event.text)} /><time title={shortTime(event.at)}>{clockLabel(event.at)}</time></span></li>)}</ol>
				</section>
			) : null}
			<RoomChat key={member.id} state={state} engagementId={engagementId} memberId={member.id} memberName={member.name} lead={isLead} thread={thread} suggestions={suggestions}
				onSend={text => update(current => sendToAgent(current, engagementId, member.id, text))}
				onRouted={() => onToast(`Passed to the ${lead.name.toLowerCase()}; its answer is in the conversation.`)}
				onOpenTeam={() => onSelect({ kind: "agent", id: lead.id })} />
		</aside>
	)
}

function RoomChat({ state, engagementId, memberId, memberName, lead, thread, suggestions, onSend, onRouted }: {
	state: AgentixState; engagementId: string; memberId: string; memberName: string; lead: boolean
	thread: AgentixState["messages"]; suggestions: string[]; onSend: (text: string) => void; onRouted: () => void; onOpenTeam: () => void
}) {
	const [draft, setDraft] = useState("")
	const log = useRef<HTMLOListElement>(null)
	useEffect(() => { const node = log.current; if (node) node.scrollTop = node.scrollHeight }, [thread.length])
	// What happened to a message is read from its outcome, not guessed from its words: steering passed
	// to the accountable agent says so, and a declined message comes back to the field to be edited.
	const sent = thread.filter(message => message.role === "owner").at(-1)
	const seen = useRef(sent?.id)
	const mine = useRef<string | null>(null)
	useEffect(() => {
		if (!sent || sent.id === seen.current) return
		seen.current = sent.id
		const outcome = sent.instruction
		// Only what was written in this room (the coordinator's room shares the main conversation).
		if (!outcome || sent.text !== mine.current) return
		mine.current = null
		if (outcome.status === "declined") { setDraft(current => current || sent.text); return }
		if (!lead && outcome.intent !== "question" && outcome.intent !== "refuse") onRouted()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sent?.id])
	const send = (text = draft) => { if (!text.trim()) return; mine.current = text.trim(); onSend(text.trim()); setDraft("") }
	const workflow = state.engagements[engagementId].workflowId
	return (
		<section className="tf-room-chat" aria-label={`Conversation with ${memberName}`}>
			<h3>{lead ? "Conversation" : `Talk to the ${memberName.toLowerCase()}`}</h3>
			{thread.length ? (
				<ol ref={log} className="tf-chat-log">
					{thread.map(message => (
						<li key={message.id} className={message.role === "owner" ? "is-owner" : "is-agent"}>
							{message.role === "agent" ? <span className="tf-chat-who"><Mark seed={`${workflow}:${message.agentId ?? SCENARIOS[workflow].team.find(member => member.accountable)?.id ?? ""}`} size="xs" />{memberName}</span> : null}
							<p><Prose text={message.text} /></p>
						</li>
					))}
				</ol>
			) : <p className="tf-room-quiet">{lead ? "Ask about the team, or steer it. Decisions stay in their cards." : `Ask what it's doing, what it found, or why it waits. It answers for its own work; steering goes through the accountable agent.`}</p>}
			<div className="tf-chat-suggest">{suggestions.map(text => <button key={text} type="button" onClick={() => send(text)}>{text}</button>)}</div>
			<form className="tf-chat-compose" onSubmit={event => { event.preventDefault(); send() }}>
				<label htmlFor={`tf-chat-${memberId}`} className="sr-only">Message {memberName}</label>
				<textarea id={`tf-chat-${memberId}`} rows={1} value={draft} placeholder={`Message ${memberName.toLowerCase()}…`} onChange={event => setDraft(event.target.value.slice(0, 2000))} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() } }} />
				<button type="submit" className="tf-chat-send" aria-label={`Send to ${memberName}`} disabled={!draft.trim()}><ArrowUp size={14} weight="bold" /></button>
			</form>
		</section>
	)
}
