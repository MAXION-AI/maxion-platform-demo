import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"
import { ArrowUp, Microphone, X } from "@phosphor-icons/react"

import { createLevel } from "@/components/voice/audioLevel"
import { speak, type Speech } from "@/components/voice/voiceLibrary"
import { VoiceOrb, type OrbState } from "@/components/voice/VoiceOrb"
import { accountable, clockLabel, needsYou, teamOf } from "./engine/selectors"
import { previewInstruction, sendInstruction } from "./engine/steering"
import type { AgentixState } from "./engine/types"
import { latestVerifiedCycle } from "./floor"

/*
 * Talking to the floor. The same orb as the Discovery call, docked on the team floor: the owner
 * asks out loud (or types, or picks a question), the accountable agent answers through the same
 * steering the conversation uses, and as the answer is spoken each teammate it names lights up on
 * the floor. The morning briefing plays through the same dock.
 *
 * Answers are composed from live state, so they can't be pre-rendered: they use the browser's voice
 * (or captions where there is none, and always under automation).
 *
 * Typed text and the prompts go through the same steering as the conversation: pressing Ask is the
 * owner sending it. Speech is heard, not trusted: a spoken question is answered at once, and anything
 * spoken that would change the work waits in the field until the owner sends it.
 */

const PROMPTS = ["What's the team doing?", "What needs me?", "Is anything failing?"]
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; abort: () => void }
const recognizer = () => (typeof window === "undefined" ? null : (window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition ?? null)

/* Who an answer names, and where: the floor lights each one as the voice reaches it. */
function mentions(state: AgentixState, engagementId: string, text: string) {
	const lower = text.toLowerCase()
	const found: { id: string; at: number }[] = []
	for (const member of teamOf(state.engagements[engagementId])) {
		let at = lower.indexOf(member.name.toLowerCase())
		while (at >= 0) { found.push({ id: member.id, at }); at = lower.indexOf(member.name.toLowerCase(), at + 1) }
	}
	return found.sort((a, b) => a.at - b.at)
}

/* The morning briefing: the latest verified cycle, who did what in it, and what (if anything) needs the owner. */
export function briefingFor(state: AgentixState, engagementId: string) {
	const cycle = latestVerifiedCycle(state, engagementId)
	if (!cycle) return "No morning cycle has been verified yet."
	const engagement = state.engagements[engagementId]
	const team = teamOf(engagement)
	const lead = accountable(engagement)
	// What each teammate did this morning, grouped by who did it, in the order it happened.
	const steps = state.events.filter(event => event.workItemId === cycle.id && event.kind === "step").slice(-5)
	const groups: { actor: string; done: string[] }[] = []
	for (const event of steps) {
		const done = event.text.replace(/^[A-Z]+-[\w-]+: /, "").replace(/\.$/, "").replace(/^./, char => char.toLowerCase())
		const last = groups.at(-1)
		if (last && last.actor === event.actor) last.done.push(done)
		else groups.push({ actor: event.actor, done: [done] })
	}
	const list = (items: string[]) => items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
	const said = groups.map(group => `${group.actor === lead.id ? "From me" : `From the ${(team.find(member => member.id === group.actor)?.name ?? lead.name).toLowerCase()}`}: ${list(group.done)}.`)
	const met = cycle.obligations.filter(obligation => obligation.status === "met").length
	const waiting = needsYou(state, engagementId).filter(entry => entry.kind !== "proposal")
	// Spoken, a title reads as words: "Daily reconciliation for 13 Oct", not a dot between them.
	const title = cycle.title.replace(/ · /g, " for ")
	const first = waiting[0]?.title.replace(/^[A-Z](?=[a-z])/, char => char.toLowerCase())
	const you = waiting.length ? `${waiting.length === 1 ? "One thing needs you" : `${waiting.length} things need you; the first`}: ${first}${/[?.!]$/.test(first ?? "") ? "" : "."}` : "Nothing needs you."
	return `Good morning. ${title} is verified: ${met} of ${cycle.obligations.length} required outcomes have their evidence${cycle.finished ? `, checked at ${clockLabel(cycle.finished)}` : ""}. ${said.join(" ")} ${you}`
}

export function FloorTalk({ state, engagementId, update, script, onSpotlight, onClose }: {
	state: AgentixState
	engagementId: string
	update: (recipe: (state: AgentixState) => AgentixState) => void
	/* A line to say on opening (the morning briefing), instead of waiting for a question. */
	script: string | null
	onSpotlight: (ids: string[]) => void
	onClose: () => void
}) {
	const reduced = Boolean(useReducedMotion())
	const [Recognizer] = useState(recognizer)
	const [orb, setOrb] = useState<OrbState>("idle")
	const [line, setLine] = useState<{ text: string; spoken: number } | null>(null)
	const [draft, setDraft] = useState("")
	const [asked, setAsked] = useState<string | null>(null)
	const [held, setHeld] = useState(false)
	const level = useRef(createLevel()).current
	const speech = useRef<Speech | null>(null)
	const recognition = useRef<Recognition | null>(null)
	const awaiting = useRef<number | null>(null)
	const field = useRef<HTMLInputElement>(null)
	const lead = accountable(state.engagements[engagementId])
	const main = state.messages.filter(message => message.engagementId === engagementId && !message.agentId)
	// Recognition ends after the render that started it: it reads the floor as it is now.
	const stateRef = useRef(state)
	stateRef.current = state

	const say = (text: string) => {
		speech.current?.stop()
		const marks = mentions(state, engagementId, text)
		setLine({ text, spoken: 0 })
		setOrb("speaking")
		const lit = new Set<string>()
		const current = speak(text, { level, reduced, onProgress: spoken => {
			setLine(value => value && value.text === text ? { text, spoken } : value)
			// Light each teammate as the voice reaches its name, and let it fade a moment later. A line that
			// arrives whole (captions under reduced motion) lights everyone it names at once.
			const reached = marks.filter(mark => mark.at <= spoken && !lit.has(`${mark.id}@${mark.at}`))
			for (const mark of reached) lit.add(`${mark.id}@${mark.at}`)
			if (reached.length) onSpotlight([...new Set(reached.map(mark => mark.id))])
		} })
		speech.current = current
		void current.finished.then(() => { if (speech.current === current) { speech.current = null; setOrb("idle"); window.setTimeout(() => onSpotlight([]), 1_200) } })
	}

	// Opening with a script (the briefing) says it straight away.
	useEffect(() => { if (script) say(script) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [script])
	useEffect(() => { field.current?.focus({ preventScroll: true }) }, [])
	useEffect(() => () => { speech.current?.stop(); stopListening(); onSpotlight([]) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

	// The accountable agent's reply arrives in the conversation; the dock speaks it.
	useEffect(() => {
		if (awaiting.current === null || main.length <= awaiting.current) return
		const reply = main.slice(awaiting.current).reverse().find(message => message.role === "agent")
		if (!reply) return
		awaiting.current = null
		say(reply.text)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [main.length])

	// Letting go of the microphone discards what it was hearing: only a finished utterance counts.
	function stopListening() { const current = recognition.current; recognition.current = null; current?.abort() }
	const ask = (text: string) => {
		const question = text.trim()
		if (!question) return
		speech.current?.stop()
		stopListening()
		setAsked(question)
		setHeld(false)
		setDraft("")
		setOrb("thinking")
		awaiting.current = main.length
		update(current => sendInstruction(current, engagementId, { kind: "engagement" }, question))
	}
	const askRef = useRef(ask)
	askRef.current = ask
	const heardByVoice = (heard: string) => {
		const text = heard.trim()
		if (!text) { setOrb("idle"); return }
		if (previewInstruction(stateRef.current, engagementId, { kind: "engagement" }, text)?.status === "answered") { askRef.current(text); return }
		setDraft(text)
		setHeld(true)
		setOrb("idle")
		field.current?.focus({ preventScroll: true })
	}
	const listen = () => {
		if (!Recognizer) return
		// The microphone button stops listening as well as starting it.
		if (recognition.current) { stopListening(); setOrb("idle"); return }
		speech.current?.stop()
		const next = new Recognizer()
		next.continuous = false
		next.interimResults = true
		next.lang = "en-US"
		let heard = ""
		next.onresult = event => { if (recognition.current !== next) return; heard = Array.from(event.results).map(result => result[0]?.transcript ?? "").join(" "); setDraft(heard) }
		next.onerror = () => { if (recognition.current !== next) return; recognition.current = null; setOrb("idle") }
		next.onend = () => { if (recognition.current !== next) return; recognition.current = null; heardByVoice(heard) }
		recognition.current = next
		setOrb("listening")
		try { next.start() } catch { setOrb("idle") }
	}

	const spokenText = line && line.spoken > 0 && line.spoken < line.text.length ? <><span>{line.text.slice(0, line.spoken)}</span><span className="is-coming">{line.text.slice(line.spoken)}</span></> : line?.text
	return (
		<div className="tf-talk" role="dialog" aria-label={`Talk to the ${lead.name.toLowerCase()}`}>
			<VoiceOrb state={orb} level={level} size="xs" />
			<div className="tf-talk-body">
				<p className="tf-talk-state" aria-live="polite">{orb === "speaking" ? `${lead.name} is answering` : orb === "thinking" ? "Asking the team…" : orb === "listening" ? "Listening…" : held ? "Check what was heard, then press Ask to send it" : asked || script ? "Ask another question" : `Ask the ${lead.name.toLowerCase()} anything about the team`}</p>
				{line ? <p className="tf-talk-line">{spokenText}</p> : <div className="tf-talk-prompts">{PROMPTS.map(prompt => <button key={prompt} type="button" onClick={() => ask(prompt)}>{prompt}</button>)}</div>}
				<form className="tf-talk-compose" onSubmit={event => { event.preventDefault(); ask(draft) }}>
					<label htmlFor="tf-talk-field" className="sr-only">Ask the team</label>
					<input ref={field} id="tf-talk-field" value={draft} placeholder="What’s the team doing?" onChange={event => { setDraft(event.target.value); setHeld(false) }} />
					{Recognizer ? <button type="button" className="tf-talk-mic" aria-label="Ask by voice" aria-pressed={orb === "listening"} onClick={listen}><Microphone size={14} weight="fill" /></button> : null}
					<button type="submit" className="tf-talk-send" aria-label="Ask" disabled={!draft.trim()}><ArrowUp size={14} weight="bold" /></button>
				</form>
			</div>
			<button type="button" className="tf-talk-close" aria-label="Close" onClick={onClose}><X size={14} /></button>
		</div>
	)
}
