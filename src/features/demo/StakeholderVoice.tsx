import { useEffect, useMemo, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"
import { CheckCircle, Keyboard, Microphone } from "@phosphor-icons/react"

import { Button as DsButton, TextButton } from "@/design/primitives"
import { createEnvelope, createLevel } from "@/components/voice/audioLevel"
import { speak, type Speech } from "@/components/voice/voiceLibrary"
import { VoiceOrb, type OrbState } from "@/components/voice/VoiceOrb"

/*
 * The stakeholder interview as a call. A stakeholder whose channel is voice (Grace, in the revenue
 * demo) gets the same orb and turn-taking as the owner's call, in a page they open from a link:
 * MAX speaks each question, the stakeholder answers by voice (pause to send) or with the suggested
 * answer, and the topic ring fills. "Type instead" moves to the text interview with every answer
 * kept. Nothing is recorded; speech becomes text in the browser.
 */

type Turn = { id: string; from: "max" | "stakeholder"; text: string }
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; abort: () => void }
const recognizer = () => (typeof window === "undefined" ? null : (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition ?? null)

export function StakeholderVoice({ closing, topics, turns, onAnswer, suggest, onTypeInstead, onSubmit, done }: {
	/* What MAX says once every topic is covered. */
	closing: string
	topics: string[]
	turns: Turn[]
	onAnswer: (text: string) => void
	suggest: () => string
	onTypeInstead: () => void
	onSubmit: () => void
	done: boolean
}) {
	const reduced = Boolean(useReducedMotion())
	const [Recognizer] = useState(recognizer)
	const [state, setState] = useState<OrbState>("idle")
	const [spoken, setSpoken] = useState(0)
	const [heard, setHeard] = useState("")
	const speech = useRef<Speech | null>(null)
	const recognition = useRef<Recognition | null>(null)
	const timer = useRef(0)
	// The suggested answer's level loop: stopped with its timer, so no loop outlives the words.
	const envelopeRef = useRef<{ stop: () => void } | null>(null)
	const level = useRef(createLevel()).current
	const answered = turns.filter(turn => turn.from === "stakeholder").length
	const ring = useMemo(() => topics.map((topic, index) => ({ key: topic, label: topic, status: index < answered ? "done" as const : index === answered && !done ? "current" as const : "pending" as const })), [answered, done, topics])
	// What MAX says this turn: everything since the stakeholder last spoke (the greeting rides with the first question).
	const since = turns.slice(turns.map(turn => turn.from).lastIndexOf("stakeholder") + 1).filter(turn => turn.from === "max")
	const line = done ? closing : since.map(turn => turn.text).join(" ")
	const answerRef = useRef(onAnswer)
	answerRef.current = onAnswer

	const stopListening = () => { window.clearTimeout(timer.current); envelopeRef.current?.stop(); envelopeRef.current = null; const current = recognition.current; recognition.current = null; current?.abort() }
	const send = (text: string) => { stopListening(); setHeard(""); if (text.trim()) { setState("thinking"); answerRef.current(text.trim()) } }
	const listen = () => {
		if (!Recognizer) { setState("idle"); return }
		stopListening()
		const next = new Recognizer()
		next.continuous = true
		next.interimResults = true
		next.lang = "en-US"
		next.onresult = event => {
			let text = ""
			for (let index = 0; index < event.results.length; index += 1) text += `${event.results[index][0]?.transcript ?? ""} `
			setHeard(text.trim())
			window.clearTimeout(timer.current)
			timer.current = window.setTimeout(() => send(text), 1_200)
		}
		next.onerror = () => { if (recognition.current === next) { recognition.current = null; setState("idle") } }
		next.onend = () => { if (recognition.current === next) recognition.current = null }
		recognition.current = next
		setState("listening")
		try { next.start() } catch { recognition.current = null; setState("idle") }
	}

	// MAX speaks each new question (and the close), then it's the stakeholder's turn.
	const said = useRef("")
	useEffect(() => {
		if (!line || said.current === line) return
		said.current = line
		speech.current?.stop()
		stopListening()
		setSpoken(0)
		setState("speaking")
		const current = speak(line, { level, reduced, onProgress: setSpoken })
		speech.current = current
		void current.finished.then(outcome => { if (outcome !== "ended" || speech.current !== current) return; speech.current = null; if (done) setState("idle"); else listen() })
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [line])
	useEffect(() => () => { speech.current?.stop(); stopListening() }, [])

	// The suggested answer arrives as speech, then sends after the pause.
	const answerWithSuggestion = () => {
		speech.current?.stop()
		stopListening()
		const text = suggest()
		const words = text.split(/\s+/)
		if (reduced) { send(text); return }
		const envelope = createEnvelope(level)
		envelopeRef.current = envelope
		setState("listening")
		let index = 0
		const step = () => {
			index += 1
			setHeard(words.slice(0, index).join(" "))
			envelope.pulse(0.55)
			if (index >= words.length) { timer.current = window.setTimeout(() => { envelope.stop(); send(text) }, 900); return }
			timer.current = window.setTimeout(step, 230)
		}
		timer.current = window.setTimeout(step, 150)
	}

	const label = state === "speaking" ? "MAX is speaking" : state === "listening" ? "Listening · pause when you’re done" : state === "thinking" ? "MAX is thinking" : done ? "Interview complete" : "Your turn"
	return (
		<section className="mxd-sv" aria-label="Voice interview">
			<VoiceOrb state={state} level={level} size="md" ring={ring} ringLabel={`${Math.min(answered, topics.length)} of ${topics.length} topics covered`}>
				{done ? null : (
					<button type="button" className={`mxd-sv-mic${state === "listening" ? " is-listening" : ""}`} aria-label={state === "listening" ? "Stop listening" : state === "speaking" ? "Interrupt MAX and answer" : "Start listening"} aria-disabled={!Recognizer || state === "thinking" || undefined} onClick={() => { if (state === "listening") stopListening(); else { speech.current?.stop(); listen() } }}>
						<Microphone size={18} weight="fill" />
					</button>
				)}
			</VoiceOrb>
			<p className="mxd-sv-state" aria-live="polite">{label}</p>
			<p className="mxd-sv-caption">
				{state === "listening" && heard ? <span className="is-heard">{heard}</span>
					: spoken > 0 && spoken < line.length ? <><span>{line.slice(0, spoken)}</span><span className="is-coming">{line.slice(spoken)}</span></>
					: line}
			</p>
			{!Recognizer ? <p className="mxd-detail">This browser can’t transcribe speech. Use the suggested answer, or type instead.</p> : null}
			<div className="mxd-actions mxd-sv-actions">
				{done ? (
					<DsButton variant="primary" onClick={onSubmit}><CheckCircle size={14} />Finish and submit</DsButton>
				) : (
					<DsButton onClick={answerWithSuggestion} disabled={state === "thinking"}>Suggest an answer</DsButton>
				)}
				<TextButton onClick={() => { speech.current?.stop(); stopListening(); onTypeInstead() }}><Keyboard size={14} />Type instead</TextButton>
			</div>
		</section>
	)
}
