import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowUp, CaretLeft, CheckCircle, CircleNotch, ClosedCaptioning, Database, Info, Keyboard, Microphone, MicrophoneSlash, PhoneDisconnect, ShieldCheck, Warning } from "@phosphor-icons/react"

import { publicAsset } from "@/lib/publicAsset"
import { Button as DsButton } from "@/design/primitives"
import { ShimmerText, useRiseIn } from "@/components/motion/MotionKit"
import { createEnvelope, createLevel, openMicMeter, type LevelRef, type MicIssue } from "@/components/voice/audioLevel"
import { speak, WORD_MS, type Speech, type SpeechSource } from "@/components/voice/voiceLibrary"
import { VoiceOrb, type OrbState, type RingSegment } from "@/components/voice/VoiceOrb"
import type { ChatMessage, OwnerFact } from "./interview"
import "./voice-call.css"

/*
 * The owner interview as a call with MAX. It replaces the earlier voice modal, which read only
 * the bare question in the browser's voice, waited for the owner to press the microphone and then
 * Send, and showed the last four messages.
 *
 * What a call does here:
 * - MAX greets the owner, then speaks every reply in full (what it heard, then the next question),
 *   from a pre-rendered ElevenLabs clip when there is one, else the browser's voice, else captions.
 * - Hands-free is the default: the microphone reopens when MAX finishes, and a pause of about a
 *   second after the owner stops talking sends the answer. Push to talk is one switch away.
 * - The orb shows whose turn it is, and its ring shows which topics are captured or kept open.
 * - "What MAX heard" fills as the owner talks, one fact per answer, each linked to their words.
 * - When the owner points at a source, the call shows MAX reading it while it answers.
 * - The presenter's Fill answer arrives as speech: the words land as if transcribed, then send.
 *
 * It covers the Discovery module, not the platform shell, so the sidebar (and the presenter's
 * dock) stays usable during a call. Nothing is recorded: the browser's speech recognition turns
 * speech into text and the audio is not kept.
 */

type Turn = "speaking" | "listening" | "thinking" | "ready" | "error"
type Mode = "hands-free" | "push-to-talk"
export type CallFill = { text: string; tick: number }
export type CallCheck = { source: string; records: string; status: "checking" | "early" | "verified"; finding?: string } | null

type Recognition = {
	continuous: boolean
	interimResults: boolean
	lang: string
	onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
	onerror: ((event: { error: string }) => void) | null
	onend: (() => void) | null
	start: () => void
	stop: () => void
	abort: () => void
}
function recognitionConstructor(): (new () => Recognition) | null {
	if (typeof window === "undefined") return null
	const candidate = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition })
	return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null
}

const ISSUES: Record<MicIssue | "network" | "nothing-heard", { label: string; title: string; detail: string }> = {
	blocked: { label: "Microphone access is blocked", title: "Allow the microphone, then retry", detail: "Use the site settings in your browser’s address bar, or type your answer below. MAX still speaks." },
	"no-mic": { label: "No microphone found", title: "Connect a microphone, then retry", detail: "Or type your answer below. MAX still speaks." },
	unsupported: { label: "Voice input isn’t available here", title: "This browser can’t transcribe speech", detail: "Type your answers below. MAX still speaks, and the call works the same." },
	network: { label: "Speech service unreachable", title: "Speech recognition needs a connection", detail: "Check the connection and retry, or type your answer below." },
	start: { label: "Couldn’t start listening", title: "Voice input didn’t start", detail: "Retry the microphone, or type your answer below." },
	"nothing-heard": { label: "Didn’t catch that", title: "Nothing was heard", detail: "Press the microphone and try again, or type your answer." },
}
const SILENCE_MS = 1_200
const SIMULATED_WORD_MS = 240
const MODE_KEY = "maxion.voice.mode"
const readMode = (): Mode => { try { return window.localStorage.getItem(MODE_KEY) === "push-to-talk" ? "push-to-talk" : "hands-free" } catch { return "hands-free" } }
const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`

export type VoiceCallProps = {
	open: boolean
	host: HTMLElement | null
	onClose: () => void
	onSubmit: (text: string) => void
	onOpenAutonomy: () => void
	messages: ChatMessage[]
	interviewing: boolean
	missionTitle: string
	questionNumber: number
	questionTotal: number
	topicLabel: string | null
	/* What MAX says first when the call starts. */
	opener: string
	facts: OwnerFact[]
	topics: string[]
	ring: RingSegment[]
	check: CallCheck
	fill: CallFill | null
	/* What MAX will do once the interview closes ("read 4 sources and talk to Olivia, Grace, Sam and Tom"). */
	nextUp: string
}

export function VoiceCall(props: VoiceCallProps) {
	// Each opening is a fresh session: state, audio and focus start over.
	if (!props.open || !props.host) return null
	return createPortal(<CallSession {...props} host={props.host} />, props.host)
}

function CallSession({ host, onClose, onSubmit, onOpenAutonomy, messages, interviewing, missionTitle, questionNumber, questionTotal, topicLabel, opener, facts, topics, ring, check, fill, nextUp }: VoiceCallProps & { host: HTMLElement }) {
	const reduced = Boolean(useReducedMotion())
	const rise = useRiseIn()
	const [Recognizer] = useState(recognitionConstructor)
	const [phase, setPhase] = useState<"consent" | "live" | "complete">("consent")
	const [turn, setTurn] = useState<Turn>("ready")
	const [mode, setModeState] = useState<Mode>(readMode)
	const [muted, setMuted] = useState(false)
	const [captions, setCaptions] = useState(true)
	const [issue, setIssue] = useState<keyof typeof ISSUES | null>(Recognizer ? null : "unsupported")
	const [line, setLine] = useState<{ text: string; spoken: number } | null>(null)
	const [source, setSource] = useState<SpeechSource | null>(null)
	const [answer, setAnswer] = useState("")
	const [simulating, setSimulating] = useState(false)
	const [elapsed, setElapsed] = useState(0)
	const [flash, setFlash] = useState<string | null>(null)
	const [conversation, setConversation] = useState(!interviewing)
	// What the owner just said, kept on stage while MAX thinks about it.
	const [said, setSaid] = useState("")

	const dialogRef = useRef<HTMLElement>(null)
	const answerRef = useRef<HTMLTextAreaElement>(null)
	const micRef = useRef<HTMLButtonElement>(null)
	const logRef = useRef<HTMLOListElement>(null)
	const speechRef = useRef<Speech | null>(null)
	const recognitionRef = useRef<Recognition | null>(null)
	const meterRef = useRef<{ stop: () => void } | null>(null)
	const timers = useRef<{ silence: number; fill: number }>({ silence: 0, fill: 0 })
	// The simulated voice's level loop, stopped with its timer so no loop outlives the words.
	const envelopeRef = useRef<{ stop: () => void } | null>(null)
	const aliveRef = useRef(true)
	const awaitingRef = useRef<number | null>(null)
	const closingRef = useRef(false)
	const micLevel = useRef<LevelRef>(createLevel()).current
	const speechLevel = useRef<LevelRef>(createLevel()).current
	const turnRef = useRef(turn)
	turnRef.current = turn
	const modeRef = useRef(mode)
	modeRef.current = mode
	const mutedRef = useRef(muted)
	mutedRef.current = muted
	const answerValue = useRef(answer)
	answerValue.current = answer
	const issueRef = useRef(issue)
	issueRef.current = issue
	// Timers and recognition callbacks outlive the render that created them, so they reach the
	// page through refs: an answer sent after a pause must go to the question asked now.
	const submitRef = useRef(onSubmit)
	submitRef.current = onSubmit
	const countRef = useRef(messages.length)
	countRef.current = messages.length
	// The orb follows whoever has the floor: MAX's voice while it speaks, the microphone while it listens.
	const orbLevel = useMemo<LevelRef>(() => ({
		get current() { return turnRef.current === "speaking" ? speechLevel.current : turnRef.current === "listening" ? micLevel.current : 0 },
		set current(_value: number) { /* read-only view */ },
	}), [micLevel, speechLevel])

	const setMode = (next: Mode) => { setModeState(next); try { window.localStorage.setItem(MODE_KEY, next) } catch { /* the choice lasts this call */ } }

	// ---- Sound out ---------------------------------------------------------
	const stopSpeaking = () => { speechRef.current?.stop(); speechRef.current = null }
	const stopFill = () => { window.clearTimeout(timers.current.fill); envelopeRef.current?.stop(); envelopeRef.current = null }
	const say = (text: string, then: () => void) => {
		stopSpeaking()
		setLine({ text, spoken: 0 })
		setTurn("speaking")
		const speech = speak(text, { level: speechLevel, reduced, onStart: setSource, onProgress: spoken => setLine(current => current && current.text === text ? { text, spoken } : current) })
		speechRef.current = speech
		void speech.finished.then(outcome => { if (speechRef.current === speech) speechRef.current = null; if (outcome === "ended") then() })
	}

	// ---- Sound in ----------------------------------------------------------
	const clearSilence = () => window.clearTimeout(timers.current.silence)
	const stopListening = () => {
		clearSilence()
		const recognition = recognitionRef.current
		recognitionRef.current = null
		recognition?.abort()
	}
	const listen = () => {
		if (!Recognizer || mutedRef.current) { setTurn("ready"); return }
		stopListening()
		const recognition = new Recognizer()
		const current = () => recognitionRef.current === recognition
		recognition.continuous = true
		recognition.interimResults = true
		recognition.lang = "en-US"
		recognition.onresult = event => {
			if (!current()) return
			let heard = ""
			for (let index = 0; index < event.results.length; index += 1) heard += `${event.results[index][0]?.transcript ?? ""} `
			setAnswer(heard.trim())
			clearSilence()
			// Hands-free: a short pause after real words ends the owner's turn.
			if (modeRef.current === "hands-free" && heard.trim()) timers.current.silence = window.setTimeout(() => sendRef.current(), SILENCE_MS)
		}
		recognition.onerror = event => {
			if (!current()) return
			if (event.error === "aborted") return
			recognitionRef.current = null
			const next = event.error === "not-allowed" || event.error === "service-not-allowed" ? "blocked" : event.error === "audio-capture" ? "no-mic" : event.error === "network" ? "network" : event.error === "no-speech" ? "nothing-heard" : "start"
			setIssue(next)
			setTurn(next === "nothing-heard" ? "ready" : "error")
		}
		recognition.onend = () => {
			if (!current()) return
			recognitionRef.current = null
			// Continuous recognition still ends on long silences; a hands-free call keeps listening.
			if (turnRef.current === "listening" && modeRef.current === "hands-free" && !answerValue.current.trim()) listen()
			else setTurn(turn => turn === "listening" ? "ready" : turn)
		}
		recognitionRef.current = recognition
		setIssue(null)
		setTurn("listening")
		try { recognition.start() } catch { recognitionRef.current = null; setIssue("start"); setTurn("error") }
	}

	// After MAX speaks: the owner's turn. Hands-free opens the microphone; push to talk waits for it.
	const yourTurn = () => {
		if (closingRef.current) { setPhase("complete"); setTurn("ready"); return }
		if (modeRef.current === "hands-free" && Recognizer && !mutedRef.current && issueRef.current !== "blocked" && issueRef.current !== "no-mic") listen()
		else setTurn(turn => turn === "error" ? turn : "ready")
	}

	// ---- Turns --------------------------------------------------------------
	const send = (text = answerValue.current) => {
		const value = text.trim()
		if (!value || turnRef.current === "thinking") return
		stopListening()
		stopSpeaking()
		stopFill()
		setSimulating(false)
		awaitingRef.current = countRef.current
		// Set now, not on the next render: a second send in the same tick is the same answer.
		turnRef.current = "thinking"
		setTurn("thinking")
		setLine(null)
		setSaid(value)
		setAnswer("")
		submitRef.current(value)
		// Push to talk and typing keep the keyboard where the owner is.
		if (modeRef.current === "push-to-talk" || document.activeElement === answerRef.current) answerRef.current?.focus({ preventScroll: true })
	}

	const sendRef = useRef(send)
	sendRef.current = send

	// MAX's reply arrives as a new message; the call speaks all of it.
	useEffect(() => {
		const from = awaitingRef.current
		if (from === null || messages.length <= from) return
		const latest = messages.at(-1)
		if (!latest || latest.actor !== "max") return
		awaitingRef.current = null
		// An answer typed before the call started: the reply lands in the transcript and the field reopens.
		if (phase === "consent") { setTurn("ready"); return }
		// The interview just closed: MAX says so, and the call ends on what it heard.
		if (interviewing === false && !conversation) closingRef.current = true
		say(latest.text, yourTurn)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages.length])

	// The presenter's scripted answer arrives as speech: words land as if transcribed, then send.
	const fillSeen = useRef(fill?.tick ?? 0)
	useEffect(() => {
		if (!fill || fill.tick === fillSeen.current) return
		fillSeen.current = fill.tick
		// Before the call starts the answer waits in the field, as typing would.
		if (phase === "consent") { setAnswer(fill.text); return }
		if (phase !== "live" || turnRef.current === "thinking") return
		// A second fill replaces the words still landing; two never interleave.
		stopFill()
		stopSpeaking()
		stopListening()
		setSimulating(true)
		setTurn("listening")
		const words = fill.text.split(/\s+/)
		const envelope = createEnvelope(micLevel)
		envelopeRef.current = envelope
		if (reduced) { setAnswer(fill.text); timers.current.fill = window.setTimeout(() => sendRef.current(fill.text), 0); return }
		let index = 0
		setAnswer("")
		const step = () => {
			index += 1
			setAnswer(words.slice(0, index).join(" "))
			envelope.pulse(0.5 + ((index * 7) % 5) / 10)
			if (index >= words.length) { timers.current.fill = window.setTimeout(() => sendRef.current(fill.text), SILENCE_MS * 0.8); return }
			timers.current.fill = window.setTimeout(step, SIMULATED_WORD_MS + (/[.?!,;]$/.test(words[index - 1]) ? 160 : 0))
		}
		timers.current.fill = window.setTimeout(step, 200)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fill?.tick])

	const begin = async () => {
		setPhase("live")
		say(opener, yourTurn)
		if (Recognizer) {
			const meter = await openMicMeter(micLevel)
			// The call can end while the browser is still asking for the microphone: release it at once.
			if (!aliveRef.current) { if (!("issue" in meter)) meter.stop(); return }
			if ("issue" in meter) { if (meter.issue === "blocked" || meter.issue === "no-mic") setIssue(meter.issue) }
			else meterRef.current = meter
		}
	}

	// Barge-in by voice: only over a recorded clip, whose sound the browser's echo cancellation can
	// subtract. The browser's own speech voice plays outside the page, so the microphone would hear
	// MAX and interrupt it; there the owner interrupts with the microphone button or by typing.
	useEffect(() => {
		if (turn !== "speaking" || source !== "recorded" || mode !== "hands-free" || !meterRef.current || muted) return
		let loud = 0
		const id = window.setInterval(() => {
			loud = micLevel.current > 0.32 ? loud + 1 : 0
			if (loud >= 3) { window.clearInterval(id); stopSpeaking(); listen() }
		}, 100)
		return () => window.clearInterval(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [turn, source, mode, muted])

	// ---- Controls -----------------------------------------------------------
	const pressMic = () => {
		if (turn === "thinking") return
		if (turn === "speaking") { stopSpeaking(); listen(); return }
		if (turn === "listening") {
			// Push to talk sends what it heard when the owner lets go of the turn.
			stopListening()
			if (answerValue.current.trim() && mode === "push-to-talk" && !simulating) send()
			else setTurn("ready")
			return
		}
		setMuted(false)
		listen()
	}
	const toggleMute = () => {
		const next = !muted
		setMuted(next)
		if (next) { stopListening(); setTurn(turn => turn === "listening" ? "ready" : turn) }
	}
	const typeInstead = () => { stopListening(); stopFill(); setSimulating(false); if (turn === "speaking") stopSpeaking(); setTurn(turn => turn === "thinking" ? turn : "ready"); answerRef.current?.focus() }
	const keepTalking = () => { closingRef.current = false; setConversation(true); setPhase("live"); say("What would you like to ask me about this Discovery?", yourTurn) }
	const watchWork = () => { onClose(); onOpenAutonomy() }

	// ---- Lifecycle ----------------------------------------------------------
	useEffect(() => {
		if (phase === "consent") return
		const id = window.setInterval(() => setElapsed(seconds => seconds + 1), 1000)
		return () => window.clearInterval(id)
	}, [phase === "consent"])
	useEffect(() => {
		aliveRef.current = true
		return () => {
			aliveRef.current = false
			stopListening()
			stopSpeaking()
			stopFill()
			meterRef.current?.stop()
			meterRef.current = null
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])
	// The rest of the Discovery is inert (and, under the call's opaque layer, unpainted) while the call
	// has it; the platform sidebar is not.
	useLayoutEffect(() => {
		const shelved = Array.from(host.children).filter((node): node is HTMLElement => node instanceof HTMLElement && !node.classList.contains("vc-layer") && !node.inert)
		for (const node of shelved) { node.inert = true; node.style.visibility = "hidden" }
		dialogRef.current?.querySelector<HTMLElement>(".vc-consent-button")?.focus({ preventScroll: true })
		return () => { for (const node of shelved) { node.inert = false; node.style.visibility = "" } }
	}, [host])
	const closeRef = useRef(onClose)
	useEffect(() => { closeRef.current = onClose })
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); closeRef.current() } }
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [])
	// The microphone takes focus once the call starts, so Space answers.
	const live = phase === "live"
	useLayoutEffect(() => { if (live) (Recognizer ? micRef.current : answerRef.current)?.focus({ preventScroll: true }) }, [live])
	// The microphone leaves with the live call; focus moves to what comes next instead of falling to the page.
	useLayoutEffect(() => { if (phase === "complete") dialogRef.current?.querySelector<HTMLElement>(".vc-complete-actions button")?.focus({ preventScroll: true }) }, [phase])
	useLayoutEffect(() => {
		const field = answerRef.current
		if (!field) return
		field.style.height = "auto"
		field.style.height = `${Math.min(140, field.scrollHeight)}px`
	}, [answer])
	useEffect(() => { const log = logRef.current; if (log) log.scrollTop = log.scrollHeight }, [messages.length, answer])

	const showFact = (fact: OwnerFact) => {
		setFlash(fact.messageId)
		logRef.current?.querySelector<HTMLElement>(`[data-message="${CSS.escape(fact.messageId)}"]`)?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" })
		window.setTimeout(() => setFlash(current => current === fact.messageId ? null : current), 1600)
	}

	// ---- What the screen says ----------------------------------------------
	const blocked = issue === "blocked" || issue === "no-mic" || issue === "unsupported"
	const orbState: OrbState = phase === "consent" ? "idle" : turn === "error" ? "off" : turn === "speaking" ? "speaking" : turn === "listening" ? "listening" : turn === "thinking" ? "thinking" : "idle"
	const issueCopy = issue ? ISSUES[issue] : null
	const stateLabel = phase === "consent" ? "Before we begin"
		: phase === "complete" ? "Interview complete"
		: turn === "speaking" ? "MAX is speaking"
		: turn === "listening" ? simulating ? "Listening" : mode === "hands-free" ? "Listening · pause when you’re done" : "Listening · press again to send"
		: turn === "thinking" ? "MAX is thinking"
		: turn === "error" ? issueCopy?.label ?? "Voice unavailable"
		: muted ? "Muted · type or unmute" : blocked ? "Type your answer" : "Your turn"
	const pill = phase === "consent" ? { label: "Not started", tone: "" } : turn === "error" || blocked ? { label: "Typing only", tone: " is-warning" } : { label: "Live", tone: " is-positive" }
	const title = conversation ? "Mission conversation" : "Owner interview"
	const heard = facts.length
	const open = facts.filter(fact => fact.status === "gap").length
	const latestMax = messages.slice().reverse().find(message => message.actor === "max")
	const stageText = line?.text ?? (phase === "consent" ? "" : latestMax?.text ?? opener)
	const spokenUpTo = line && turn === "speaking" ? line.spoken : 0
	const showOwner = turn === "listening" || (turn === "thinking" && !line)
	const ownerWords = turn === "thinking" ? said : answer
	const recordedNote = source === "recorded" ? "MAX’s voice is pre-rendered" : source === "browser" ? "MAX is using this browser’s voice" : source === "captions" ? "No voice available · captions only" : null

	return (
		<div className="vc-layer voice-backdrop ds-scope">
			<motion.section
				ref={dialogRef}
				className={`vc${phase === "consent" ? " is-consent" : ""}`}
				data-phase={phase}
				data-turn={turn}
				data-simulating={simulating || undefined}
				role="dialog"
				aria-labelledby="vc-title"
				initial={reduced ? false : { opacity: 0, scale: 0.995 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}>
				<header className="vc-bar">
					<DsButton variant="ghost" size="sm" className="vc-back" aria-label="Close voice session" onClick={onClose}><CaretLeft size={14} />Back</DsButton>
					<div className="vc-bar-title">
						<h2 id="vc-title">{title}</h2>
						<span className="vc-bar-mission">{missionTitle}</span>
					</div>
					<div className="vc-bar-meta">
						{interviewing && !conversation ? <span className="vc-bar-question">Question {questionNumber} of {questionTotal}</span> : null}
						<span className={`workspace-status${pill.tone}`}><span aria-hidden="true" />{pill.label}</span>
						{phase === "consent" ? null : <span className="vc-clock" aria-label={`Call time ${clock(elapsed)}`}>{clock(elapsed)}</span>}
						<span className="vc-private"><ShieldCheck size={14} aria-hidden="true" />Audio not kept</span>
					</div>
				</header>

				<div className="vc-body">
					<div className="vc-stage">
						{phase === "consent" ? (
							<div className="vc-consent">
								<VoiceOrb state="idle" size="lg" ring={ring} />
								<p className="vc-state">Before we begin</p>
								<h3>{interviewing ? "Continue this interview by voice" : "Talk to MAX about this Discovery"}</h3>
								<p>{interviewing ? `Talk it through instead of typing. MAX asks ${questionTotal - questionNumber + 1 === questionTotal ? `${questionTotal} short questions` : `the ${questionTotal - questionNumber + 1} questions left`}, listens, and writes down what it heard as you go.` : "Ask anything about the investigation. MAX answers out loud and in the thread."} Your speech is transcribed into the same owner thread; this prototype uses your browser’s voice services and does not retain the original audio.</p>
								<ul className="vc-consent-points">
									<li><CheckCircle size={16} weight="fill" />Hands-free: pause when you’re done and MAX answers</li>
									<li><CheckCircle size={16} weight="fill" />The transcript stays visible in the thread</li>
									<li><CheckCircle size={16} weight="fill" />You can switch to typing at any time</li>
								</ul>
								<DsButton variant="primary" className="vc-consent-button" onClick={() => void begin()}>
									{Recognizer ? <><Microphone size={16} />Continue with voice</> : <><Keyboard size={16} />Continue by typing</>}
								</DsButton>
							</div>
						) : phase === "complete" ? (
							<div className="vc-complete">
								<VoiceOrb state="idle" size="md" ring={ring} />
								<p className="vc-state">Interview complete</p>
								<h3>{heard - open} position{heard - open === 1 ? "" : "s"} captured{open ? `, ${open} kept open` : ""}</h3>
								<p>{nextUp}</p>
								<div className="vc-complete-actions">
									<DsButton variant="primary" onClick={watchWork}>Watch MAX work</DsButton>
									<DsButton onClick={keepTalking}>Keep talking</DsButton>
								</div>
							</div>
						) : (
							<>
								<VoiceOrb state={orbState} level={orbLevel} size="lg" ring={conversation ? undefined : ring}>
									<button
										ref={micRef}
										type="button"
										className={`vc-mic${turn === "listening" ? " is-listening" : ""}${muted ? " is-muted" : ""}`}
										aria-label={turn === "listening" ? (mode === "push-to-talk" ? "Stop and send" : "Stop listening") : turn === "speaking" ? "Interrupt MAX and answer" : muted ? "Unmute and answer" : !Recognizer ? "Voice input isn’t available in this browser" : turn === "error" ? "Retry voice input" : "Start listening"}
										aria-disabled={turn === "thinking" || !Recognizer || undefined}
										onClick={pressMic}>
										{muted || !Recognizer ? <MicrophoneSlash size={20} weight="fill" /> : <Microphone size={20} weight="fill" />}
									</button>
								</VoiceOrb>
								<p className={`vc-state${turn === "error" ? " is-warning" : ""}`} aria-live="polite">
									{turn === "error" ? <Warning size={14} weight="fill" aria-hidden="true" /> : null}
									{turn === "thinking" ? <ShimmerText>{stateLabel}</ShimmerText> : stateLabel}
								</p>
								{topicLabel && !conversation ? <span className="turn-chip vc-topic">{topicLabel}</span> : null}
								{captions ? (
									<div className="vc-caption" aria-live="off">
										{showOwner ? (
											<p className="vc-owner-words">{ownerWords || (turn === "listening" ? <span className="vc-listening-hint">{simulating ? " " : "Go ahead, I’m listening…"}</span> : null)}{turn === "listening" && !reduced ? <span className="vc-caret" aria-hidden="true" /> : null}</p>
										) : (
											<p className="vc-max-words"><Spoken text={stageText} upTo={spokenUpTo} /></p>
										)}
									</div>
								) : <p className="vc-caption-off">Captions are off</p>}
								<AnimatePresence initial={false}>
									{check ? (
										<motion.p key={`${check.source}-${check.status}`} {...rise} className={`vc-check is-${check.status}`} role="status">
											{check.status === "checking" ? <CircleNotch size={14} className="spin" aria-hidden="true" /> : check.status === "early" ? <Database size={14} aria-hidden="true" /> : <CheckCircle size={14} weight="fill" aria-hidden="true" />}
											{check.status === "checking" ? <>Reading {check.source} · {check.records}</> : <>{check.status === "early" ? "Early signal" : "Verified"} · {check.finding}</>}
										</motion.p>
									) : null}
								</AnimatePresence>
							</>
						)}
						{phase === "live" ? (
							<div className="vc-controls" role="group" aria-label="Call controls">
								<button type="button" className="vc-control" aria-pressed={muted} onClick={toggleMute}>{muted ? <MicrophoneSlash size={16} /> : <Microphone size={16} />}<span>{muted ? "Unmute" : "Mute"}</span></button>
								<button type="button" className="vc-control" aria-pressed={captions} onClick={() => setCaptions(value => !value)}><ClosedCaptioning size={16} /><span>Captions</span></button>
								<div className="vc-mode" role="radiogroup" aria-label="Turn-taking">
									{(["hands-free", "push-to-talk"] as Mode[]).map(option => (
										<button key={option} type="button" role="radio" aria-checked={mode === option} className={mode === option ? "is-on" : undefined} onClick={() => setMode(option)}>{option === "hands-free" ? "Hands-free" : "Push to talk"}</button>
									))}
								</div>
								<button type="button" className="vc-control" onClick={typeInstead}><Keyboard size={16} /><span>Type instead</span></button>
								<button type="button" className="vc-control is-end" onClick={onClose}><PhoneDisconnect size={16} /><span>End call</span></button>
							</div>
						) : null}
						{recordedNote && phase === "live" ? <p className="vc-source">{recordedNote}</p> : null}
					</div>

					<aside className="vc-rail" aria-label="Voice transcript">
						<section className="vc-heard" aria-labelledby="vc-heard-title">
							<header>
								<h3 id="vc-heard-title">What MAX heard</h3>
								<span>{heard} of {topics.length}</span>
							</header>
							<ol>
								{topics.map((topic, index) => {
									const fact = facts.find(entry => entry.index === index)
									const asking = !fact && interviewing && index === questionNumber - 1 && phase !== "consent"
									return (
										<li key={topic} className={`vc-fact${fact ? ` is-${fact.status}` : asking ? " is-asking" : " is-pending"}`}>
											{fact ? (
												<button type="button" onClick={() => showFact(fact)} title="Show the words this came from">
													<span className="vc-fact-label">{fact.label}</span>
													<span className="vc-fact-value">{fact.value}</span>
													{fact.finding ? <span className="vc-fact-finding">{fact.status === "early" ? "Early signal" : "Verified"} · {fact.finding}</span> : fact.status === "checking" ? <span className="vc-fact-finding">Checking {fact.source}…</span> : null}
												</button>
											) : (
												<div>
													<span className="vc-fact-label">{topic}</span>
													<span className="vc-fact-value">{asking ? turn === "listening" ? "Listening…" : "Being asked now" : "Not yet"}</span>
												</div>
											)}
											<FactMark status={fact?.status} asking={asking} />
										</li>
									)
								})}
							</ol>
						</section>
						<section className="vc-transcript" aria-labelledby="vc-transcript-title">
							<h3 id="vc-transcript-title">Transcript</h3>
							<ol ref={logRef} tabIndex={0} aria-labelledby="vc-transcript-title">
								{messages.map(message => (
									<li key={message.id} data-message={message.id} className={`vc-turn ${message.actor === "max" ? "is-max" : "is-owner"}${flash === message.id ? " is-flash" : ""}`}>
										{message.actor === "max" ? <img src={publicAsset("maxion-logo-gradient.svg")} alt="" /> : null}
										<p>{message.text}</p>
									</li>
								))}
							</ol>
						</section>
						<div className="vc-compose">
							<div role="status" className="vc-notice-slot">
								{issueCopy && (turn === "error" || blocked || issue === "nothing-heard") ? (
									<p className="vc-notice"><Warning size={16} weight="fill" aria-hidden="true" /><span><strong>{issueCopy.title}</strong>{issueCopy.detail}</span></p>
								) : phase === "consent" ? (
									<p className="vc-notice is-info"><Info size={16} aria-hidden="true" /><span>Start the call, or type an answer to continue the interview.</span></p>
								) : null}
							</div>
							<div className="vc-compose-field">
								<label htmlFor="vc-answer" className="sr-only">Your response</label>
								<textarea
									ref={answerRef}
									id="vc-answer"
									rows={1}
									value={answer}
									readOnly={turn === "thinking" || simulating}
									aria-busy={turn === "thinking" || undefined}
									placeholder={turn === "thinking" ? "Waiting for MAX…" : turn === "listening" ? "Your words appear here…" : Recognizer ? "Speak or type your response…" : "Type your response…"}
									onChange={event => { setAnswer(event.target.value); if (turn === "speaking") { stopSpeaking(); setTurn("ready") } if (turn === "listening") { stopListening(); setTurn("ready") } }}
									onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() } }}
								/>
								<button className="vc-send" type="button" aria-label="Send response" onClick={() => send()} disabled={!answer.trim() || turn === "thinking"}><ArrowUp size={16} weight="bold" /></button>
							</div>
						</div>
					</aside>
				</div>
			</motion.section>
		</div>
	)
}

/* MAX's words, with the ones already spoken in full ink and the rest still to come. */
function Spoken({ text, upTo }: { text: string; upTo: number }) {
	if (upTo <= 0 || upTo >= text.length) return <>{text}</>
	return <><span className="is-spoken">{text.slice(0, upTo)}</span><span className="is-coming">{text.slice(upTo)}</span></>
}

function FactMark({ status, asking }: { status?: OwnerFact["status"]; asking: boolean }) {
	if (status === "gap") return <span className="vc-fact-mark is-gap" role="img" aria-label="Kept open"><Warning size={14} weight="fill" /></span>
	if (status === "checking") return <span className="vc-fact-mark is-checking" role="img" aria-label="Checking"><CircleNotch size={14} className="spin" /></span>
	if (status === "early") return <span className="vc-fact-mark is-early" role="img" aria-label="Early signal"><Database size={14} /></span>
	if (status) return <span className="vc-fact-mark is-done" role="img" aria-label={status === "verified" ? "Verified" : "Captured"}><CheckCircle size={14} weight="fill" /></span>
	return <span className={`vc-fact-mark${asking ? " is-asking" : ""}`} aria-hidden="true" />
}

export const SIMULATED_SPEECH_MS = (text: string) => text.split(/\s+/).length * SIMULATED_WORD_MS + SILENCE_MS
export { WORD_MS }
