import { ArrowRight, CheckCircle, Database, MagnifyingGlass, Plus, SpinnerGap, Warning, XCircle } from "@phosphor-icons/react"
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

import { MaxionSpiralMark } from "./PortalChrome"
import {
	answerConsultQuestion,
	appendConsultExchange,
	buildConsultSourceIndex,
	persistConsultState,
	readConsultState,
	startConsultThread,
	type ConsultContext,
	type ConsultSource,
	type GroundedAnswer,
	type RouteProposal,
} from "./consultState"
import "./consult.css"

type Props = {
	context: ConsultContext
	onCommand: () => void
	onRoute: (target: RouteProposal) => boolean
}

let commandSequence = 0
const moduleName = (module: ConsultSource["module"]) => module === "discovery" ? "Discover" : module === "agentix" ? "Agentix" : module[0].toUpperCase() + module.slice(1)
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

function AnswerStatus({ status }: { status: GroundedAnswer["status"] }) {
	const Icon = status === "grounded" ? CheckCircle : status === "denied" || status === "error" ? XCircle : Warning
	return <span className={`cmx-answer-status is-${status}`}><Icon />{status === "grounded" ? "Grounded" : status === "partial" ? "Limited evidence" : status === "conflict" ? "Sources conflict" : status === "denied" ? "Access denied" : "Needs revision"}</span>
}

export function ConsultModule({ context, onCommand, onRoute }: Props) {
	const sourceIndex = useMemo(() => buildConsultSourceIndex(context), [context])
	const [state, setState] = useState(() => readConsultState(context, sourceIndex.sources))
	const [input, setInput] = useState("")
	const [thinking, setThinking] = useState(false)
	const [notice, setNotice] = useState("")
	const timers = useRef<number[]>([])
	const project = context.project
	const activeThread = state.threads.find(thread => thread.id === state.activeThreadId) ?? state.threads[0]
	const connected = sourceIndex.sources.filter(source => source.status === "current" || source.status === "live").length
	const connectedLabel = `${connected} source${connected === 1 ? "" : "s"} connected`

	useEffect(() => { if (!persistConsultState(state)) setNotice("Conversation storage is unavailable. This session still works, but it may not survive refresh.") }, [state])
	useEffect(() => () => timers.current.forEach(timer => window.clearTimeout(timer)), [])

	const route = (target: GroundedAnswer["route"] | ConsultSource) => {
		if (!target || !project || target.projectId !== project.id || !target.objectId) {
			setNotice("That object is outside the active project. No record was opened.")
			return
		}
		const proposal = "label" in target ? target : { module: target.module, label: `Open ${moduleName(target.module)} source`, objectId: target.objectId, projectId: target.projectId }
		if (!onRoute(proposal)) setNotice("That source is no longer current for this project. Nothing was opened.")
	}

	const submitQuestion = (raw = input) => {
		const question = raw.trim()
		if (!question || thinking) return
		const answer = answerConsultQuestion(raw, context, sourceIndex.sources)
		commandSequence += 1
		const commandId = `consult:${state.projectId}:${Date.now()}:${commandSequence}`
		setInput("")
		setNotice("Question received. Reading the connected project sources.")
		const complete = () => {
			setState(current => appendConsultExchange(current, raw, answer, commandId))
			setThinking(false)
			setNotice(answer.status === "grounded" ? "Answer grounded in the sources shown." : "Answer is bounded to the available evidence.")
		}
		if (prefersReducedMotion()) complete()
		else {
			setThinking(true)
			timers.current.push(window.setTimeout(complete, 360))
		}
	}

	const newConversation = () => {
		commandSequence += 1
		setState(current => startConsultThread(current, `new:${current.projectId}:${Date.now()}:${commandSequence}`))
		setInput("")
		setThinking(false)
		setNotice("New project-scoped conversation ready.")
	}

	const latestTitle = activeThread?.title === "New conversation" ? "New project question" : activeThread?.title ?? "Project question"
	const firstQuestion = activeThread?.messages.find(message => message.actor === "user")
	return <div className="cmx-root" aria-label="Consult MAX workspace">
		<header className="cmx-header"><div><small>CONSULT MAX</small><strong>{latestTitle}</strong><span>{project ? `Grounded in ${project.name}` : "Choose a project to begin"}</span></div><div><button type="button" className="cmx-search" onClick={onCommand}><MagnifyingGlass />Search or ask <kbd>⌘K</kbd></button><button type="button" className="is-primary" onClick={newConversation}><Plus />New conversation</button></div></header>
		<main className="cmx-main">
			<header className="cmx-heading"><div><small>CROSS-PLATFORM CONVERSATION</small><h1>{firstQuestion?.actor === "user" ? firstQuestion.text : "What do you need to decide?"}</h1><p>MAX keeps source boundaries visible and routes action back to the module that owns it.</p></div><span>{connectedLabel}</span></header>
			{notice ? <p className="cmx-notice" role="status">{notice}</p> : null}
			<div className="cmx-layout">
				<section className="cmx-conversation" aria-label="Consult conversation">
					<div className="cmx-message-list" role="log" aria-live="polite">
						{activeThread?.messages.length ? activeThread.messages.map(message => message.actor === "user" ? <article key={message.id} className="cmx-user-message"><small>YOU</small><p>{message.text}</p></article> : <article key={message.id} className="cmx-max-message"><header><span className="cmx-mark"><MaxionSpiralMark /></span><small>MAX</small><AnswerStatus status={message.answer.status} /></header><p>{message.answer.summary}</p>{message.answer.reasons.length ? <ol>{message.answer.reasons.map((reason, index) => <li key={`${message.id}:${reason.title}`}><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{reason.title}</strong><small>{reason.detail}</small></span></li>)}</ol> : null}{message.answer.citations.length ? <div className="cmx-inline-citations" aria-label="Answer citations">{message.answer.citations.map(citation => { const current = sourceIndex.sources.some(source => source.id === citation.id && source.objectId === citation.objectId && source.version === citation.version && source.projectId === citation.projectId); return <button type="button" key={`${citation.id}:${citation.objectId}:${citation.version}`} onClick={() => route({ module: citation.module, label: `Open ${moduleName(citation.module)} source`, objectId: citation.objectId, projectId: citation.projectId })}>{moduleName(citation.module)} · {citation.version}{current ? "" : " · changed"}</button> })}</div> : null}{message.answer.route ? <div className="cmx-next-action"><span><small>RECOMMENDED NEXT ACTION</small><strong>{message.answer.route.label}</strong></span><button type="button" className="is-primary" onClick={() => route(message.answer.route!)}>Open in {moduleName(message.answer.route.module)}<ArrowRight /></button></div> : null}<small className="cmx-scope">{message.answer.scope} · explanation only · no module mutation</small></article>) : <section className="cmx-empty"><span className="cmx-mark"><MaxionSpiralMark /></span><h2>Ask across this project.</h2><p>Start with evidence, sequence, execution, or a live Agentix decision.</p><div><button type="button" onClick={() => setInput("What needs my attention right now?")}>What needs my attention?</button><button type="button" onClick={() => setInput("What evidence supports the current plan?")}>Show the evidence</button></div></section>}
						{thinking ? <article className="cmx-thinking"><SpinnerGap /><span><strong>MAX is reading the active project.</strong><small>Sources and authority remain visible while the answer is prepared.</small></span></article> : null}
					</div>
					<form className="cmx-composer" onSubmit={(event: FormEvent) => { event.preventDefault(); submitQuestion() }}><label htmlFor="cmx-question">Ask a follow-up or turn this into a routed next step</label><textarea id="cmx-question" aria-label="Message Consult MAX" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submitQuestion() } }} maxLength={2_000} rows={2} placeholder="Ask what changed, what needs attention, or why a decision was made…" /><footer><span><Database />{project?.name ?? "No project selected"} · {connectedLabel}</span><button type="submit" className="is-primary" aria-label="Send to Consult MAX" disabled={!input.trim() || thinking}>Send<ArrowRight /></button></footer></form>
				</section>
				<aside className="cmx-sources" aria-label="Consult sources"><header><h2>Sources</h2><span>{connected === sourceIndex.mounted ? "Grounded" : "Check sources"}</span></header>{sourceIndex.sources.map(source => <button type="button" key={source.id} onClick={() => route(source)}><span><small>{moduleName(source.module).toUpperCase()}</small><i className={`is-${source.status}`}>{source.status}</i></span><strong>{source.title}</strong><small>{source.detail}</small><code>{source.evidenceClass} · {source.environment} · {source.authority}</code></button>)}{sourceIndex.omitted ? <p>Showing {sourceIndex.mounted} of {sourceIndex.total} sources. Narrow the project question to reduce the set.</p> : null}<section><small>ANSWER SCOPE</small><p>{project ? `${project.name} only · no external provider writes.` : "No project selected · no source access."}</p></section></aside>
			</div>
		</main>
	</div>
}
