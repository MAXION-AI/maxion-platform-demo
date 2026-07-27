import React, { FormEvent, useEffect, useRef, useState } from "react"
import { animate } from "animejs"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
	ArrowClockwise,
	ArrowRight,
	CaretDown,
	CaretRight,
	Check,
	CheckCircle,
	CircleNotch,
	Clock,
	Command,
	Database,
	DownloadSimple,
	EnvelopeSimple,
	GearSix,
	House,
	Lightning,
	ListChecks,
	MagnifyingGlass,
	Microphone,
	Moon,
	Package,
	Pause,
	Play,
	Plus,
	Rows,
	ShieldCheck,
	SpeakerHigh,
	Sparkle,
	Sun,
	UsersThree,
	Waveform,
	X,
} from "@phosphor-icons/react"

import { DELIVERABLES, OPERATIONS, SCENARIOS, type OwnerInterviewQuestion, type Person, type ScenarioKey } from "./model"
import "./styles.css"
import "./frontier.css"

type View = "thread" | "overview" | "package"
type Drawer = "people" | "sources" | "package" | null
type DecisionState = "pending" | "approved" | "modified"
type VoiceState = "consent" | "ready" | "listening" | "thinking" | "speaking" | "error"

type BrowserSpeechRecognitionEvent = {
	results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

type BrowserSpeechRecognition = {
	continuous: boolean
	interimResults: boolean
	lang: string
	onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
	onerror: (() => void) | null
	onend: (() => void) | null
	start: () => void
	stop: () => void
	abort: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type ChatMessage = {
	id: string
	actor: "max" | "user"
	text: string
	trace?: string[]
	question?: {
		current: number
		total: number
		topic: string
	}
}

function interviewMessage(scenarioKey: ScenarioKey, index: number, prefix?: string): ChatMessage {
	const scenario = SCENARIOS[scenarioKey]
	const prompt = scenario.ownerInterview[index]
	return {
		id: `interview-${index}-${Date.now()}`,
		actor: "max",
		text: `${prefix ? `${prefix} ` : ""}${prompt.question}`,
		question: { current: index + 1, total: scenario.ownerInterview.length, topic: prompt.topic },
	}
}

function initialInterviewMessages(scenarioKey: ScenarioKey, missionBrief = ""): ChatMessage[] {
	const scenario = SCENARIOS[scenarioKey]
	const missionContext = missionBrief.trim()
		? `I’ve captured your mission: “${conciseAnswer(missionBrief)}”. `
		: ""
	return [interviewMessage(
		scenarioKey,
		0,
		`${missionContext}I’ll lead this as the ${scenario.interviewer}. I’ve already bound ${scenario.sources.length} permitted sources, so I’ll ask only for judgment the records can’t supply.`,
	)]
}

function isUncertainAnswer(text: string) {
	return /^(not sure|i(?:'|’)m not sure|i do not know|i don(?:'|’)t know|don(?:'|’)t know|no idea|unsure|idk)\b/i.test(text.trim()) || text.trim().split(/\s+/).length < 3
}

function conciseAnswer(text: string) {
	const sentence = text.trim().split(/[.!?]\s/)[0]
	return sentence.length > 120 ? `${sentence.slice(0, 117).trim()}…` : sentence
}

function missionTitle(brief: string) {
	const title = conciseAnswer(brief).replace(/\s+/g, " ")
	return title || "New Discovery"
}

function referencedSource(text: string, scenarioKey: ScenarioKey) {
	const normalized = text.toLowerCase()
	const scenario = SCENARIOS[scenarioKey]
	return scenario.sources.find((source) => normalized.includes(source.system.toLowerCase()) || normalized.includes(source.name.toLowerCase()))
		?? (/\b(check|look|verify|source|records?|documents?)\b/i.test(text) ? scenario.sources[0] : undefined)
}

function isInterviewCloseIntent(text: string) {
	const normalized = text.trim().toLowerCase().replace(/[.!?]+$/g, "")
	return /^(?:please\s+)?(?:end|finish|close|stop|wrap up)(?:\s+(?:the|this|my))?(?:\s+owner)?(?:\s+(?:interview|conversation|session))?(?:\s+now)?$/.test(normalized)
}

function getSpeechRecognitionConstructor() {
	const voiceWindow = window as typeof window & {
		SpeechRecognition?: BrowserSpeechRecognitionConstructor
		webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
	}
	return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition
}

const viewMeta: Array<{ id: View; label: string; icon: React.ElementType }> = [
	{ id: "thread", label: "Thread", icon: Command },
	{ id: "overview", label: "Overview", icon: Rows },
	{ id: "package", label: "Package", icon: Package },
]

function joinNames(people: Person[]) {
	if (people.length === 0) return "No stakeholders are mapped yet."
	if (people.length === 1) return people[0].name
	return `${people.slice(0, -1).map((person) => person.name).join(", ")}, and ${people.at(-1)?.name}`
}

interface DiscoveryAutonomousPrototypePageProps {
	embedded?: boolean
	onPackageReady?: () => void
}

export function DiscoveryAutonomousPrototypePage({ embedded = false, onPackageReady }: DiscoveryAutonomousPrototypePageProps = {}) {
	const reducedMotion = Boolean(useReducedMotion())
	const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("tprm")
	const [missionBrief, setMissionBrief] = useState("")
	const [screen, setScreen] = useState<"setup" | "preparing" | "workspace">("setup")
	const [view, setView] = useState<View>("thread")
	const [drawer, setDrawer] = useState<Drawer>(null)
	const [phase, setPhase] = useState(0)
	const [paused, setPaused] = useState(false)
	const [decision, setDecision] = useState<DecisionState>("pending")
	const [people, setPeople] = useState<Person[]>(SCENARIOS.tprm.people)
	const [messages, setMessages] = useState<ChatMessage[]>(() => initialInterviewMessages("tprm"))
	const [commandText, setCommandText] = useState("")
	const [pendingPerson, setPendingPerson] = useState<Partial<Person> | null>(null)
	const [interviewIndex, setInterviewIndex] = useState(0)
	const [interviewClosed, setInterviewClosed] = useState(false)
	const [clarificationPending, setClarificationPending] = useState(false)
	const [traceOpen, setTraceOpen] = useState(false)
	const [dark, setDark] = useState(false)
	const [toast, setToast] = useState<string | null>(null)
	const [packageSelection, setPackageSelection] = useState(0)
	const [invitesSent, setInvitesSent] = useState(false)
	const scenario = SCENARIOS[scenarioKey]
	const currentMissionTitle = missionTitle(missionBrief)
	const needsDecision = screen === "workspace" && phase === 4 && decision === "pending"
	const complete = phase >= OPERATIONS.length - 1

	useEffect(() => {
		setPeople(scenario.people)
	}, [scenario])

	useEffect(() => {
		if (screen !== "workspace" || !interviewClosed || paused || needsDecision || complete) return
		const timer = window.setTimeout(() => setPhase((current) => Math.min(current + 1, OPERATIONS.length - 1)), 1650)
		return () => window.clearTimeout(timer)
	}, [complete, interviewClosed, needsDecision, paused, phase, screen])

	useEffect(() => {
		if (!complete) return
		setToast("Decision package ready and routed for approval")
		onPackageReady?.()
	}, [complete, onPackageReady])

	useEffect(() => {
		if (!toast) return
		const timer = window.setTimeout(() => setToast(null), 4200)
		return () => window.clearTimeout(timer)
	}, [toast])

	const start = () => {
		if (!missionBrief.trim()) return
		setScreen("preparing")
		setView("thread")
		setPhase(0)
		setDecision("pending")
		setPaused(false)
		setInterviewIndex(0)
		setInterviewClosed(false)
		setClarificationPending(false)
		setMessages(initialInterviewMessages(scenarioKey, missionBrief))
		setInvitesSent(false)
		window.setTimeout(() => setScreen("workspace"), reducedMotion ? 700 : 2400)
	}

	const restart = () => {
		setScreen("setup")
		setMissionBrief("")
		setView("thread")
		setDrawer(null)
		setPhase(0)
		setDecision("pending")
		setPaused(false)
		setInterviewIndex(0)
		setInterviewClosed(false)
		setClarificationPending(false)
		setMessages(initialInterviewMessages(scenarioKey))
		setPendingPerson(null)
		setPackageSelection(0)
		setInvitesSent(false)
	}

	const resolveDecision = (next: Exclude<DecisionState, "pending">) => {
		setDecision(next)
		setMessages((current) => [
			...current,
			{
				id: `decision-${Date.now()}`,
				actor: "max",
				text:
					next === "approved"
						? "Approved. I sent the scoped invitation without attaching internal evidence and resumed the resolution case."
						: "I kept the resolution internal and updated the case plan. The rest of the Discovery is continuing.",
				trace:
					next === "approved"
						? ["Validated the recipient against the approved exception", "Created one idempotent invitation", "Verified delivery and resumed the work graph"]
						: ["Changed the resolution channel", "Preserved the evidence boundary", "Resumed unaffected work"],
			},
		])
		setToast(next === "approved" ? "Exception approved · outreach verified" : "Resolution kept internal")
	}

	const addMessage = (message: ChatMessage) => setMessages((current) => [...current, message])

	const addPersonFromCommand = (text: string, retained: Partial<Person> | null) => {
		const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
		const withoutCommand = text.replace(/^\s*(please\s+)?add\s+(a\s+)?stakeholder\s*/i, "").trim()
		const beforeEmail = withoutCommand.replace(email ?? "", "").replace(/[,;]\s*$/, "").trim()
		const asParts = beforeEmail.split(/\s+as\s+/i)
		const commaParts = beforeEmail.split(",").map((part) => part.trim()).filter(Boolean)
		const name = retained?.name || (asParts.length > 1 ? asParts[0] : commaParts[0])
		const role = retained?.role || (asParts.length > 1 ? asParts.slice(1).join(" as ").replace(/[,;].*$/, "").trim() : commaParts[1])

		if (!name || !email || !role) {
			setPendingPerson({ ...retained, name: name || retained?.name, email: email || retained?.email, role: role || retained?.role })
			const missing = [!name && "name", !role && "role", !email && "email"].filter(Boolean).join(", ")
			addMessage({
				id: `clarify-${Date.now()}`,
				actor: "max",
				text: `I can add them. I still need the ${missing}. You can reply in one line; department, influence, and interview focus are optional.`,
			})
			return
		}

		const newPerson: Person = {
			id: `person-${Date.now()}`,
			name,
			initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
			role,
			department: commaParts[2] || "To confirm",
			email,
			influence: "Medium",
			focus: commaParts[3] || "MAX will adapt the interview focus from the mission and source gaps.",
			channel: "Text",
		}
		setPeople((current) => [...current, newPerson])
		setPendingPerson(null)
		addMessage({
			id: `added-${Date.now()}`,
			actor: "max",
			text: `${newPerson.name} is now in the stakeholder roster as ${newPerson.role}. I verified the record after creating it; the interview focus will adapt to the remaining mission gaps.`,
			trace: ["Checked the existing roster for duplicates", `Created ${newPerson.name}'s stakeholder record`, "Read the record back and updated coverage"],
		})
		setToast(`${newPerson.name} added and verified`)
	}

	const closeOwnerInterview = (prefix?: string) => {
		if (interviewClosed) return
		setInterviewClosed(true)
		setClarificationPending(false)
		setPhase((current) => Math.max(current, 2))
		addMessage({
			id: `interview-complete-${Date.now()}`,
			actor: "max",
			text: `${prefix ? `${prefix} ` : ""}That gives me enough owner context for this pass. I’ve closed the interview, preserved the conversation for later additions, and started source verification and stakeholder coordination. I won’t ask another interview question unless you reopen it.`,
			trace: ["Saved the owner interview as a versioned context snapshot", "Replanned the inquiry map from the captured answers", "Started the autonomous work graph"],
		})
		setToast("Owner interview complete · autonomous work started")
	}

	const advanceOwnerInterview = (text: string, prompt: OwnerInterviewQuestion) => {
		const source = referencedSource(text, scenarioKey)
		const uncertain = isUncertainAnswer(text)
		const finalQuestion = interviewIndex >= scenario.ownerInterview.length - 1

		if (uncertain && !clarificationPending) {
			setClarificationPending(true)
			addMessage({
				id: `interview-clarify-${Date.now()}`,
				actor: "max",
				text: `That uncertainty is useful; I’ll keep it as an explicit gap rather than inventing an answer. ${prompt.evidenceHint} For now, who would know or make that call in practice? A role is enough.`,
				question: { current: interviewIndex + 1, total: scenario.ownerInterview.length, topic: `${prompt.topic} · clarification` },
			})
			return
		}

		const nextIndex = interviewIndex + 1
		setClarificationPending(false)
		if (finalQuestion) {
			const prefix = uncertain
				? `I’ll carry ${prompt.topic.toLowerCase()} as an explicit unknown and verify it with ${scenario.sources[0].system}.`
				: `I’ve captured “${conciseAnswer(text)}” as the owner position on ${prompt.topic.toLowerCase()}.`
			closeOwnerInterview(prefix)
			return
		}

		setInterviewIndex(nextIndex)
		setPhase(Math.min(1, Math.floor(nextIndex / 3)))
		const nextPrompt = scenario.ownerInterview[nextIndex]
		const prefix = source
			? `I’ll verify ${prompt.topic.toLowerCase()} in ${source.name} instead of asking you to guess. I’ve preserved that source check in the inquiry map.`
			: uncertain
				? `I’ll keep ${prompt.topic.toLowerCase()} open and resolve it with the accountable stakeholder.`
				: `I’m treating “${conciseAnswer(text)}” as the working position on ${prompt.topic.toLowerCase()}. ${prompt.evidenceHint}`
		const nextMessage = interviewMessage(scenarioKey, nextIndex, prefix)
		if (source) {
			nextMessage.trace = [`Interpreted the answer as a request to verify ${prompt.topic.toLowerCase()}`, `Bound the check to ${source.system} · ${source.scope}`, `Advanced to ${nextPrompt.topic} without fabricating the missing detail`]
		}
		addMessage(nextMessage)
	}

	const submitCommand = (rawText: string) => {
		const text = rawText.trim()
		if (!text) return
		setCommandText("")
		addMessage({ id: `user-${Date.now()}`, actor: "user", text })
		const normalized = text.toLowerCase()

		window.setTimeout(() => {
			if (pendingPerson || normalized.includes("add") && normalized.includes("stakeholder")) {
				addPersonFromCommand(text, pendingPerson)
				return
			}
			if ((normalized.includes("who") || normalized.includes("which")) && normalized.includes("stakeholder")) {
				addMessage({
					id: `roster-${Date.now()}`,
					actor: "max",
					text: `${joinNames(people)} are currently mapped. ${invitesSent ? "Their invitations are recorded as sent." : "I’m preparing their invitations from the inquiry plan."}`,
					trace: ["Read the current stakeholder roster", "Checked invitation delivery state"],
				})
				return
			}
			if (normalized.includes("invite") || normalized.includes("send the interviews")) {
				setInvitesSent(true)
				addMessage({
					id: `invite-${Date.now()}`,
					actor: "max",
					text: `I sent ${people.length} invitations using each stakeholder's assigned channel. Delivery was verified and the chase cadence is now active.`,
					trace: ["Validated recipient policy and consent copy", `Queued ${people.length} idempotent invitations`, "Verified delivery receipts and scheduled follow-ups"],
				})
				setToast(`${people.length} invitations delivered`)
				return
			}
			if (normalized.includes("pause")) {
				setPaused(true)
				addMessage({ id: `pause-${Date.now()}`, actor: "max", text: "Paused. No new outreach or package work will start; in-flight writes remain safely recorded." })
				return
			}
			if (normalized.includes("resume")) {
				setPaused(false)
				addMessage({ id: `resume-${Date.now()}`, actor: "max", text: "Resumed from the last verified checkpoint." })
				return
			}
			if (normalized.includes("status")) {
				addMessage({
					id: `status-${Date.now()}`,
					actor: "max",
					text: `Status sent to the sponsor: ${phase + 1} of ${OPERATIONS.length} operations reached, ${people.length} stakeholders mapped, and ${needsDecision ? "one authority exception pending" : "no owner blocker"}.`,
					trace: ["Built the status from persisted mission state", "Applied the approved recipient list", "Sent and verified the sponsor update"],
				})
				setToast("Sponsor status sent")
				return
			}
			if (isInterviewCloseIntent(text)) {
				closeOwnerInterview("Understood.")
				return
			}
			if (!interviewClosed) {
				advanceOwnerInterview(text, scenario.ownerInterview[interviewIndex])
				return
			}
			addMessage({
				id: `answer-${Date.now()}`,
				actor: "max",
				text: `I’ve incorporated that direction into the mission. I’m applying it to ${OPERATIONS[phase].label.toLowerCase()} and will show any resulting record change in the work trace.`,
			})
		}, reducedMotion ? 50 : 420)
	}

	const sendCommand = (event: FormEvent) => {
		event.preventDefault()
		submitCommand(commandText)
	}

	return (
		<div className={`prototype${dark ? " dark" : ""}${embedded ? " embedded" : ""}`}>
			{screen === "setup" ? (
					<SetupScreen
						missionBrief={missionBrief}
						onMissionBriefChange={setMissionBrief}
						onStart={start}
						embedded={embedded}
						dark={dark}
					onToggleDark={() => setDark((current) => !current)}
				/>
			) : screen === "preparing" ? (
				<PreparingScreen missionTitle={currentMissionTitle} />
			) : (
					<WorkspaceShell
						scenarioKey={scenarioKey}
						missionTitle={currentMissionTitle}
						embedded={embedded}
					view={view}
					onViewChange={setView}
					phase={phase}
					paused={paused}
					interviewIndex={interviewIndex}
					interviewClosed={interviewClosed}
					onTogglePause={() => setPaused((current) => !current)}
					onRestart={restart}
					dark={dark}
					onToggleDark={() => setDark((current) => !current)}>
					{view === "overview" ? (
						<Overview
							scenarioKey={scenarioKey}
							missionBrief={missionBrief}
							phase={phase}
							paused={paused}
							decision={decision}
							people={people}
							traceOpen={traceOpen}
							onToggleTrace={() => setTraceOpen((current) => !current)}
							onResolveDecision={resolveDecision}
							onOpenDrawer={setDrawer}
							onOpenThread={() => setView("thread")}
						/>
					) : view === "thread" ? (
						<Thread
							scenarioKey={scenarioKey}
							missionBrief={missionBrief}
							phase={phase}
							people={people}
							decision={decision}
							interviewIndex={interviewIndex}
							interviewClosed={interviewClosed}
							messages={messages}
							commandText={commandText}
							onCommandTextChange={setCommandText}
							onSend={sendCommand}
							onVoiceSubmit={submitCommand}
							onResolveDecision={resolveDecision}
							onOpenPeople={() => setDrawer("people")}
							onOpenSources={() => setDrawer("sources")}
							onOpenPackage={() => setView("package")}
						/>
					) : (
						<Deliverables
							scenarioKey={scenarioKey}
							phase={phase}
							selected={packageSelection}
							onSelect={setPackageSelection}
							onManage={() => setDrawer("package")}
						/>
					)}
				</WorkspaceShell>
			)}

			<AnimatePresence>
				{drawer ? (
					<DrawerPanel
						type={drawer}
						scenarioKey={scenarioKey}
						people={people}
						onPeopleChange={setPeople}
						onClose={() => setDrawer(null)}
					/>
				) : null}
			</AnimatePresence>
			<AnimatePresence>
				{toast ? (
					<motion.div
						className="toast"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 8 }}
						role="status"
						aria-live="polite">
						<CheckCircle size={18} weight="fill" />
						{toast}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	)
}

function SetupScreen({
	missionBrief,
	onMissionBriefChange,
	onStart,
	embedded,
	dark,
	onToggleDark,
}: {
	missionBrief: string
	onMissionBriefChange: (value: string) => void
	onStart: () => void
	embedded: boolean
	dark: boolean
	onToggleDark: () => void
}) {
	const hasMission = Boolean(missionBrief.trim())
	return (
		<div className="setup-shell">
			<aside className="setup-header" hidden={embedded}>
				<div>
					<Brand />
					<button className="setup-new-button" type="button"><Plus size={16} /> New discovery</button>
				</div>
				<div className="setup-sidebar-copy">
					<span>Autonomous BA</span>
					<p>Give MAX an outcome. It plans, investigates, coordinates, and returns with a decision package.</p>
				</div>
				<div className="header-actions">
					<span className="prototype-badge">Prototype</span>
					<IconButton label={dark ? "Use light theme" : "Use dark theme"} onClick={onToggleDark}>
						{dark ? <Sun size={18} /> : <Moon size={18} />}
					</IconButton>
				</div>
			</aside>
			<main className="setup-main">
				<div className="setup-canvas">
					<section className="setup-intro">
						<img src="/maxion-logo-gradient.svg" alt="" />
						<p className="eyebrow">Start a Discovery</p>
						<h1>What should MAX accomplish?</h1>
						<p>Describe the decision and the outcome. MAX will work out the investigation.</p>
					</section>

					<div className="setup-grid">
						<section className="brief-editor" aria-labelledby="brief-heading">
						<div className="section-heading-row">
							<div>
								<p className="eyebrow">Mission brief</p>
								<h2 id="brief-heading">Describe the outcome</h2>
							</div>
							<span className="draft-status">Draft saved</span>
						</div>
						<textarea value={missionBrief} onChange={(event) => onMissionBriefChange(event.target.value)} aria-label="Discovery brief" placeholder="Describe the decision, outcome, or problem. MAX will form the investigation, bind relevant evidence, and return with a decision package." autoFocus />
						<div className="brief-context">
							<div><span>Decision</span><strong>{hasMission ? "MAX will establish the decision boundary from your brief." : "MAX will identify the decision boundary."}</strong></div>
							<div><span>Decision horizon</span><strong>MAX will confirm the right horizon from the evidence.</strong></div>
						</div>
						<div className="composer-action-row">
							<div><Database size={15} /><span>Connected sources will be scoped automatically</span></div>
							<button className="primary-button launch-button" type="button" onClick={onStart} disabled={!hasMission}>
								Start autonomous Discovery <ArrowRight size={17} weight="bold" />
							</button>
						</div>
						</section>

						<aside className="mission-preview" aria-label="MAX mission preview">
						<div className="section-heading-row">
							<div>
								<p className="eyebrow">Proposed operating brief</p>
								<h2>MAX will take it from here</h2>
							</div>
							<Sparkle size={18} weight="fill" />
						</div>
						<div className="preview-row">
							<span>Objective</span>
							<p>{hasMission ? "Turn your outcome into a bounded mission and evidence plan." : "Describe the outcome and MAX will turn it into a bounded mission."}</p>
						</div>
						<div className="preview-row">
							<span>Completion condition</span>
							<p>A decision package with cited evidence, accountable owners, and a clear next action.</p>
						</div>
						<div className="preview-metrics">
							<button type="button" aria-label="Review connected sources">
								<Database size={17} /><span><strong>Relevant</strong> sources auto-bound</span>
							</button>
							<button type="button" aria-label="Review proposed stakeholder roles">
								<UsersThree size={17} /><span><strong>Right</strong> roles identified</span>
							</button>
							<button type="button" aria-label="Review deliverable plan">
								<Package size={17} /><span><strong>{DELIVERABLES.length}</strong> outputs planned</span>
							</button>
						</div>
						<div className="authority-note">
							<ShieldCheck size={18} weight="fill" />
							<div>
								<strong>Routine work is pre-authorized</strong>
								<p>Routine work proceeds automatically. Novel recipients and material exceptions come back to you.</p>
							</div>
						</div>
						</aside>
					</div>
				</div>
			</main>
		</div>
	)
}

function PreparingScreen({ missionTitle }: { missionTitle: string }) {
	const orbitRef = useRef<HTMLDivElement>(null)
	const stepsRef = useRef<HTMLDivElement>(null)
	const reducedMotion = Boolean(useReducedMotion())

	useEffect(() => {
		if (reducedMotion || !orbitRef.current || !stepsRef.current) return
		const orbitAnimation = animate(orbitRef.current, { rotate: 360, duration: 2200, loop: true, ease: "linear" })
		const stepAnimation = animate(stepsRef.current.children, {
			opacity: [0.24, 1],
			translateY: [4, 0],
			delay: (_target: unknown, index = 0) => index * 420,
			duration: 520,
			ease: "out(3)",
		})
		return () => {
			orbitAnimation.cancel()
			stepAnimation.cancel()
		}
	}, [reducedMotion])

	return (
		<div className="preparing-shell">
			<Brand />
			<div className="preparing-center" role="status" aria-live="polite">
				<div className="mission-orbit" ref={orbitRef} aria-hidden="true">
					<span /><span /><span />
				</div>
				<img src="/maxion-logo-gradient.svg" alt="" className="preparing-mark" />
				<p className="eyebrow">Establishing the mission</p>
				<h1>{missionTitle}</h1>
				<div className="preparing-steps" ref={stepsRef}>
					<div><Check size={14} /> Normalizing the objective and authority envelope</div>
					<div><Check size={14} /> Binding permitted sources and evidence scopes</div>
					<div><CircleNotch size={14} className="spin" /> Creating the first work graph</div>
				</div>
				<p className="preparing-footnote">You can leave this screen. MAX will continue from the persisted mission state.</p>
			</div>
		</div>
	)
}

function WorkspaceShell({
	scenarioKey,
	missionTitle,
	embedded,
	view,
	onViewChange,
	phase,
	paused,
	interviewIndex,
	interviewClosed,
	onTogglePause,
	onRestart,
	dark,
	onToggleDark,
	children,
}: {
	scenarioKey: ScenarioKey
	missionTitle: string
	embedded: boolean
	view: View
	onViewChange: (view: View) => void
	phase: number
	paused: boolean
	interviewIndex: number
	interviewClosed: boolean
	onTogglePause: () => void
	onRestart: () => void
	dark: boolean
	onToggleDark: () => void
	children: React.ReactNode
}) {
	const scenario = SCENARIOS[scenarioKey]
	const businessStatus = !interviewClosed
		? `Owner interview · question ${interviewIndex + 1} of ${scenario.ownerInterview.length}`
		: paused
		? "Paused at a verified checkpoint"
		: phase <= 2
			? "Owner interview · building the decision context"
			: phase <= 4
				? `Interviewing and reconciling · ${Math.min(peopleCountForPhase(phase), scenario.people.length)} of ${scenario.people.length} complete`
				: phase <= 6
					? "Synthesizing findings · no action needed"
					: "Package ready · routed for approval"
	return (
		<div className="workspace-shell">
			<aside className="product-rail" aria-label="Product navigation" hidden={embedded}>
				<div className="rail-brand"><img src="/maxion-logo-gradient.svg" alt="" /><strong>MAXION</strong></div>
				<button className="rail-new" type="button" onClick={onRestart}><Plus size={16} /> New discovery</button>
				<nav className="rail-primary">
					<button type="button"><House size={17} /><span>Home</span></button>
					<button type="button" className="active"><MagnifyingGlass size={17} weight="bold" /><span>Discover</span></button>
					<button type="button"><ListChecks size={17} /><span>Plan</span></button>
					<button type="button"><Lightning size={17} /><span>Execute</span></button>
				</nav>
				<div className="rail-recents">
					<span>Current task</span>
					<button type="button" className="active" onClick={() => onViewChange(phase >= 7 ? "package" : "thread")}><i /><div><strong>{missionTitle}</strong><small>{phase >= 7 ? "Complete" : paused ? "Paused" : "Running"}</small></div></button>
					<span>Recent</span>
					<button type="button"><div><strong>AI governance operating model</strong><small>Package ready</small></div></button>
					<button type="button"><div><strong>ERP upgrade evaluation</strong><small>Waiting on people</small></div></button>
				</div>
				<div className="rail-bottom">
					<button type="button"><GearSix size={17} /><span>Settings</span></button>
					<div className="rail-profile"><div className="avatar" aria-label="Abhinav Shankar">AS</div><div><strong>Abhinav</strong><span>Admin workspace</span></div></div>
				</div>
			</aside>

			<div className="workspace-body">
				<header className="workspace-header">
					<div className="workspace-title">
						<div className={paused ? "live-indicator paused" : "live-indicator"} aria-hidden="true" />
						<div>
							<div className="title-line"><strong>{missionTitle}</strong></div>
								<p>{scenario.deadline}</p>
						</div>
					</div>
					<div className="header-actions">
						<button className="quiet-button" type="button" onClick={onTogglePause} disabled={phase >= OPERATIONS.length - 1}>
							{phase >= OPERATIONS.length - 1 ? <Check size={16} weight="bold" /> : paused ? <Play size={16} weight="fill" /> : <Pause size={16} weight="fill" />}
							{phase >= OPERATIONS.length - 1 ? "Complete" : paused ? "Resume" : "Pause"}
						</button>
						<IconButton label={dark ? "Use light theme" : "Use dark theme"} onClick={onToggleDark}>
							{dark ? <Sun size={18} /> : <Moon size={18} />}
						</IconButton>
						<IconButton label="Restart prototype" onClick={onRestart}><ArrowClockwise size={18} /></IconButton>
					</div>
				</header>

				<div className="workspace-subnav">
					<nav className="workspace-tabs" aria-label="Discovery views">
						{viewMeta.map((item) => {
							const Icon = item.icon
							return (
								<button key={item.id} type="button" className={view === item.id ? "active" : ""} onClick={() => onViewChange(item.id)} disabled={item.id === "package" && phase < 6}>
									<Icon size={15} weight={view === item.id ? "fill" : "regular"} />
									{item.label}
									{item.id === "package" && phase >= 6 ? <span className="tab-ready-dot" /> : null}
								</button>
							)
						})}
					</nav>
					<div className="business-status" role="status" aria-label="Discovery status">
							<span className={phase === 4 && interviewClosed ? "attention" : phase >= 7 ? "complete" : "working"} />
							<strong>{businessStatus}</strong>
							<small>{!interviewClosed ? scenario.ownerInterview[interviewIndex].topic : phase === 4 ? "1 decision needs you" : phase >= 7 ? "5 deliverables ready" : "MAX is continuing autonomously"}</small>
					</div>
				</div>

				<main className="workspace-content">{children}</main>
			</div>
		</div>
	)
}

function peopleCountForPhase(phase: number) {
	return Math.min(4, Math.max(0, phase - 2))
}

function Overview({
	scenarioKey,
	missionBrief,
	phase,
	paused,
	decision,
	people,
	traceOpen,
	onToggleTrace,
	onResolveDecision,
	onOpenDrawer,
	onOpenThread,
}: {
	scenarioKey: ScenarioKey
	missionBrief: string
	phase: number
	paused: boolean
	decision: DecisionState
	people: Person[]
	traceOpen: boolean
	onToggleTrace: () => void
	onResolveDecision: (decision: Exclude<DecisionState, "pending">) => void
	onOpenDrawer: (drawer: Drawer) => void
	onOpenThread: () => void
}) {
	const scenario = SCENARIOS[scenarioKey]
	const decisionPending = phase === 4 && decision === "pending"
	const progress = Math.round(((phase + 1) / OPERATIONS.length) * 100)
	const interviewed = Math.min(people.length, Math.max(0, phase - 2))

	return (
		<div className="overview-workspace">
			<section className="overview-main">
				<header className="overview-mission">
					<div>
						<p className="eyebrow">Mission outcome</p>
						<h1>{missionBrief || scenario.objective}</h1>
					</div>
					<div className="mission-deadline"><Clock size={16} /><span>{scenario.deadline}</span></div>
				</header>

				<div className="overview-priority-grid">
					<section className="overview-current" aria-labelledby="current-operation">
						<div className="operation-heading">
							<div>
								<p className="eyebrow">MAX is working on</p>
								<h2 id="current-operation">{paused ? "Work paused" : phase >= 7 ? "Package complete" : OPERATIONS[phase].label}</h2>
								<p>{paused ? "No new actions will start until you resume." : OPERATIONS[phase].detail}</p>
							</div>
							<span className="progress-number">{progress}%</span>
						</div>
						<div className="progress-track"><motion.span animate={{ width: `${progress}%` }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} /></div>
						<div className="work-trace compact-trace">
							<button type="button" onClick={onToggleTrace} aria-expanded={traceOpen}>
								<span className="trace-active-dot" />
								<strong>{paused ? "Checkpoint preserved" : phase >= 7 ? "All work verified" : "View verified work"}</strong>
								<span>{phase + 1} events</span>
								<CaretDown size={14} className={traceOpen ? "rotated" : ""} />
							</button>
							<AnimatePresence initial={false}>
								{traceOpen ? (
									<motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
										{OPERATIONS.slice(Math.max(0, phase - 1), phase + 1).map((operation, index, visible) => (
											<li key={operation.label} className={index === visible.length - 1 && !paused && phase < 7 ? "active" : "complete"}>
												<span>{index === visible.length - 1 && !paused && phase < 7 ? <CircleNotch size={13} className="spin" /> : <Check size={13} weight="bold" />}</span>
												<div><strong>{operation.label}</strong><p>{operation.detail}</p></div>
											</li>
										))}
									</motion.ol>
								) : null}
							</AnimatePresence>
						</div>
					</section>

					<section className={decisionPending ? "overview-attention needs-decision" : "overview-attention"}>
						<div className="rail-section-title">
							<div><p className="eyebrow">Needs you</p><h2>{decisionPending ? "1 decision" : "Nothing right now"}</h2></div>
							{decisionPending ? <span className="attention-count">1</span> : <CheckCircle size={20} weight="fill" />}
						</div>
						{decisionPending ? (
							<div className="exception-block compact-exception">
								<strong>{scenario.exception.title}</strong>
								<p>{scenario.exception.detail}</p>
								<div className="exception-actions">
									<button className="primary-button" type="button" onClick={() => onResolveDecision("approved")}>Approve once</button>
									<button className="quiet-button" type="button" onClick={() => onResolveDecision("modified")}>Keep internal</button>
								</div>
							</div>
						) : <p className="attention-clear-copy">MAX can continue inside the authority you granted. You’ll only be interrupted for a material exception.</p>}
					</section>
				</div>

				<section className="inquiry-snapshot" aria-labelledby="mission-health-heading">
					<div className="section-heading-row compact">
						<div><p className="eyebrow">Inquiry coverage</p><h2 id="mission-health-heading">What MAX is resolving</h2></div>
						<span>{scenario.inquiries.filter((_, index) => index < Math.max(2, phase)).length} of {scenario.inquiries.length} inquiry areas evidenced</span>
					</div>
					<div className="coverage-list compact-coverage">
						{scenario.inquiries.map((inquiry, index) => {
							const evidenced = index < Math.max(2, phase)
							const active = !evidenced && index === Math.max(2, phase)
							return (
								<div key={inquiry} className={active ? "active" : evidenced ? "evidenced" : ""}>
									<span>{evidenced ? <Check size={11} weight="bold" /> : index + 1}</span>
									<strong>{inquiry}</strong>
									<em>{evidenced ? "Evidence bound" : active ? "In progress" : "Queued"}</em>
								</div>
							)
						})}
					</div>
				</section>

				<section className="overview-log" aria-labelledby="operating-log-heading">
					<div className="section-heading-row compact">
						<div><p className="eyebrow">Verified changes</p><h2 id="operating-log-heading">Latest work</h2></div>
						<button className="text-button" type="button" onClick={onOpenThread}>Open thread <ArrowRight size={14} /></button>
					</div>
					<div className="overview-log-rows">
						<div className="log-row"><CheckCircle size={16} weight="fill" /><strong>Source scopes bound</strong><span>{scenario.sources.map((source) => source.system).join(" · ")}</span><time>now</time></div>
						<div className="log-row"><CheckCircle size={16} weight="fill" /><strong>Inquiry map adapted</strong><span>{scenario.inquiries.slice(0, 3).join(" · ")}</span><time>1m</time></div>
						<div className={phase >= 3 ? "log-row" : "log-row muted-row"}><EnvelopeSimple size={16} /><strong>Stakeholder program</strong><span>{phase >= 3 ? `${people.length} channels scheduled` : "Waiting for role map"}</span><time>{phase >= 3 ? "2m" : "—"}</time></div>
					</div>
				</section>
			</section>

			<aside className="overview-inspector" aria-label="Discovery details">
				<div><p className="eyebrow">At a glance</p><h2>Discovery details</h2></div>
				<section className="overview-list">
					<OverviewRow icon={<UsersThree size={17} />} label="People" detail={`${people.length} mapped · ${interviewed} complete`} onClick={() => onOpenDrawer("people")} />
					<OverviewRow icon={<Database size={17} />} label="Sources" detail={`${scenario.sources.length} connected · read automatically`} onClick={() => onOpenDrawer("sources")} />
					<OverviewRow icon={<Package size={17} />} label="Package" detail={phase >= 7 ? "5 deliverables ready" : "Plan refining with evidence"} onClick={() => onOpenDrawer("package")} />
				</section>

				<section className="authority-summary">
					<div><ShieldCheck size={17} weight="fill" /><strong>Authority envelope</strong></div>
					<p>Internal outreach · approved source scopes · 2 follow-ups · $45 model budget</p>
					<button className="text-button" type="button">Review policy</button>
				</section>
				<button className="overview-steer primary-button" type="button" onClick={onOpenThread}>Steer MAX <ArrowRight size={15} /></button>
			</aside>
		</div>
	)
}

function OverviewRow({ icon, label, detail, onClick }: { icon: React.ReactNode; label: string; detail: string; onClick: () => void }) {
	return <button type="button" onClick={onClick}><span>{icon}</span><div><strong>{label}</strong><p>{detail}</p></div><CaretRight size={14} /></button>
}

function Thread({
	scenarioKey,
	missionBrief,
	phase,
	people,
	decision,
	interviewIndex,
	interviewClosed,
	messages,
	commandText,
	onCommandTextChange,
	onSend,
	onVoiceSubmit,
	onResolveDecision,
	onOpenPeople,
	onOpenSources,
	onOpenPackage,
}: {
	scenarioKey: ScenarioKey
	missionBrief: string
	phase: number
	people: Person[]
	decision: DecisionState
	interviewIndex: number
	interviewClosed: boolean
	messages: ChatMessage[]
	commandText: string
	onCommandTextChange: (value: string) => void
	onSend: (event: FormEvent) => void
	onVoiceSubmit: (text: string) => void
	onResolveDecision: (decision: Exclude<DecisionState, "pending">) => void
	onOpenPeople: () => void
	onOpenSources: () => void
	onOpenPackage: () => void
}) {
	const scenario = SCENARIOS[scenarioKey]
	const decisionPending = phase === 4 && decision === "pending"
	const packageReady = phase >= 7
	const interviewing = !interviewClosed
	const currentInterviewPrompt = scenario.ownerInterview[Math.min(interviewIndex, scenario.ownerInterview.length - 1)]
	const scrollRef = useRef<HTMLDivElement>(null)
	const voiceButtonRef = useRef<HTMLButtonElement>(null)
	const [voiceOpen, setVoiceOpen] = useState(false)
	const lastMaxMessage = messages.slice().reverse().find((message) => message.actor === "max")
	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
	}, [messages, phase])

	return (
		<div className="thread-layout">
			<section className="conversation-panel thread-panel">
				<header>
					<div><p className="eyebrow">{interviewing ? "Owner interview" : "Mission thread"}</p><h1>{interviewing ? "Interview with MAX" : "Work with MAX"}</h1></div>
					<span className="context-badge"><span /> {interviewing ? `Question ${interviewIndex + 1} of ${scenario.ownerInterview.length}` : "Context stays active"}</span>
				</header>
				<div className="message-log" ref={scrollRef} role="log" aria-live="polite" aria-label="Discovery owner chat messages" tabIndex={0}>
					<div className="date-divider"><span>Today</span></div>
					{messages.map((message) => (
						<div key={message.id} className={message.actor === "user" ? "message user-message" : "message max-message"}>
							{message.actor === "max" ? <img src="/maxion-logo-gradient.svg" alt="" /> : null}
							<div className="message-body">
								{message.actor === "max" ? <span className="message-author">MAX</span> : null}
								{message.question ? <span className="interview-question-label">{message.question.topic} · {message.question.current} of {message.question.total}</span> : null}
								<p>{message.text}</p>
								{message.trace ? <MessageTrace steps={message.trace} /> : null}
							</div>
						</div>
					))}
					{decisionPending ? (
						<section className="thread-event decision-event" aria-labelledby="thread-decision-title">
							<div className="thread-event-kicker"><span /> Decision needed to continue one branch</div>
							<h2 id="thread-decision-title">{scenario.exception.title}</h2>
							<p>{scenario.exception.detail}</p>
							<div className="event-consequence"><strong>Effect</strong><span>{scenario.exception.consequence}</span></div>
							<div className="exception-actions">
								<button className="primary-button" type="button" onClick={() => onResolveDecision("approved")}>Approve once</button>
								<button className="quiet-button" type="button" onClick={() => onResolveDecision("modified")}>Keep internal</button>
							</div>
						</section>
					) : null}
					{phase === 6 ? (
						<section className="thread-event synthesis-event" aria-label="Synthesis ready">
							<div className="thread-event-kicker"><Check size={13} weight="bold" /> Synthesis ready</div>
							<h2>Findings reconciled. Building the package.</h2>
							<p>Claims, interview evidence, and unresolved tensions are bound to readiness snapshot v7. Five planned deliverables are generating in place.</p>
						</section>
					) : null}
					{packageReady ? (
						<section className="thread-event package-event" aria-labelledby="thread-package-title">
							<div className="thread-event-kicker"><Check size={13} weight="bold" /> Package ready</div>
							<h2 id="thread-package-title">Final plan and recommendations</h2>
							<p>Five deliverables were generated from the verified readiness snapshot and routed to the approved recipients.</p>
							<button className="primary-button" type="button" onClick={onOpenPackage}>Open package <ArrowRight size={15} /></button>
						</section>
					) : null}
					{phase < 7 ? (
						<div className="work-status-row" role="status">
							<span className="work-status-pulse" />
							<div><strong>{interviewing ? "Listening and building the inquiry map" : OPERATIONS[phase].label}</strong><p>{OPERATIONS[phase].detail}</p></div>
						</div>
					) : null}
				</div>
				<form className="command-composer" onSubmit={onSend}>
					<textarea
						value={commandText}
						onChange={(event) => onCommandTextChange(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault()
								event.currentTarget.form?.requestSubmit()
							}
						}}
						placeholder={interviewing ? "Answer MAX or give it an instruction..." : "Ask, direct, add context, or change the mission..."}
						aria-label="Message MAX"
					/>
					<div className="composer-footer">
						<div>
							<button type="button"><Plus size={16} /> Attach</button>
							<button ref={voiceButtonRef} className="voice-launch-button" type="button" onClick={() => setVoiceOpen(true)}><Microphone size={16} /> Voice</button>
							<span>MAX can read and act within the mission authority</span>
						</div>
						<button className="send-button" type="submit" aria-label="Send message" disabled={!commandText.trim()}><ArrowRight size={18} weight="bold" /></button>
					</div>
				</form>
			</section>

			<aside className="conversation-context thread-inspector">
				<div className="section-heading-row compact"><div><p className="eyebrow">Context inspector</p><h2>{interviewing ? "Interview context" : packageReady ? "Result context" : "Operating context"}</h2></div></div>
				<div className="context-section"><span>Current objective</span><p>{missionBrief || scenario.objective}</p></div>
				<button className="context-section interactive" type="button" onClick={onOpenPeople}><span>Stakeholders</span><strong>{people.length} mapped</strong><p>{joinNames(people)}</p><CaretRight size={14} /></button>
				<button className="context-section interactive" type="button" onClick={onOpenSources}><span>Connected sources</span><strong>{scenario.sources.length} reading automatically</strong><p>{scenario.sources.map((source) => source.system).join(" · ")}</p><CaretRight size={14} /></button>
				<div className="context-section"><span>{interviewing ? `Interview focus · ${interviewIndex + 1} of ${scenario.ownerInterview.length}` : "Current operation"}</span><strong>{interviewing ? currentInterviewPrompt.topic : OPERATIONS[phase].label}</strong><p>{interviewing ? currentInterviewPrompt.evidenceHint : OPERATIONS[phase].detail}</p>{interviewing ? <div className="interview-progress" role="progressbar" aria-label="Owner interview progress" aria-valuemin={1} aria-valuemax={scenario.ownerInterview.length} aria-valuenow={interviewIndex + 1}><span style={{ width: `${((interviewIndex + 1) / scenario.ownerInterview.length) * 100}%` }} /></div> : null}</div>
				{phase >= 6 ? <button className="context-section interactive package-context" type="button" onClick={onOpenPackage}><span>Decision package</span><strong>{packageReady ? "5 deliverables ready" : "Generating from synthesis"}</strong><p>{packageReady ? "Open the final reader and approval package." : "Outputs will appear without a separate blueprint task."}</p><CaretRight size={14} /></button> : null}
				<div className="context-section command-examples">
					<span>Direct MAX</span>
					{interviewing ? <button type="button" onClick={() => onCommandTextChange(`Check ${scenario.sources[0].system} and verify this`)}>“Verify this from {scenario.sources[0].system}”</button> : null}
					<button type="button" onClick={() => onCommandTextChange("Add a stakeholder")}>“Add a stakeholder”</button>
					<button type="button" onClick={() => onCommandTextChange(interviewing ? "End the owner interview" : "Send the sponsor a status update")}>{interviewing ? "“End the owner interview”" : "“Send the sponsor a status update”"}</button>
				</div>
			</aside>
			<VoiceInterview
				open={voiceOpen}
				onClose={() => {
					setVoiceOpen(false)
					window.requestAnimationFrame(() => voiceButtonRef.current?.focus())
				}}
				onSubmit={onVoiceSubmit}
				messages={messages}
				question={lastMaxMessage?.text ?? currentInterviewPrompt.question}
				interviewing={interviewing}
				questionNumber={interviewIndex + 1}
				questionTotal={scenario.ownerInterview.length}
			/>
		</div>
	)
}

function VoiceInterview({
	open,
	onClose,
	onSubmit,
	messages,
	question,
	interviewing,
	questionNumber,
	questionTotal,
}: {
	open: boolean
	onClose: () => void
	onSubmit: (text: string) => void
	messages: ChatMessage[]
	question: string
	interviewing: boolean
	questionNumber: number
	questionTotal: number
}) {
	const [state, setState] = useState<VoiceState>("consent")
	const [transcript, setTranscript] = useState("")
	const [notice, setNotice] = useState("")
	const [awaitingFromCount, setAwaitingFromCount] = useState<number | null>(null)
	const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
	const transcriptRef = useRef<HTMLTextAreaElement>(null)

	const stopAudio = () => {
		recognitionRef.current?.abort()
		recognitionRef.current = null
		window.speechSynthesis?.cancel()
	}

	useEffect(() => {
		if (!open) return
		setState("consent")
		setTranscript("")
		setNotice("")
		setAwaitingFromCount(null)
		return stopAudio
	}, [open])

	useEffect(() => {
		if (!open) return
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose()
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [onClose, open])

	useEffect(() => {
		if (awaitingFromCount === null || messages.length <= awaitingFromCount) return
		const latest = messages.at(-1)
		if (!latest || latest.actor !== "max") return
		setAwaitingFromCount(null)
		if (!("speechSynthesis" in window)) {
			setState("ready")
			return
		}
		window.speechSynthesis.cancel()
		const utterance = new SpeechSynthesisUtterance(latest.text)
		utterance.rate = 0.96
		utterance.pitch = 0.98
		utterance.onend = () => setState("ready")
		utterance.onerror = () => {
			setNotice("MAX’s response is in the thread. Audio playback wasn’t available.")
			setState("ready")
		}
		setState("speaking")
		window.speechSynthesis.speak(utterance)
	}, [awaitingFromCount, messages])

	if (!open) return null

	const beginListening = () => {
		setNotice("")
		const SpeechRecognition = getSpeechRecognitionConstructor()
		if (!SpeechRecognition) {
			setState("error")
			setNotice("Live speech recognition isn’t available in this browser. Type the transcript below to continue the same voice turn.")
			window.requestAnimationFrame(() => transcriptRef.current?.focus())
			return
		}
		const recognition = new SpeechRecognition()
		recognition.continuous = true
		recognition.interimResults = true
		recognition.lang = "en-US"
		recognition.onresult = (event) => {
			let nextTranscript = ""
			for (let index = 0; index < event.results.length; index += 1) {
				nextTranscript += `${event.results[index][0]?.transcript ?? ""} `
			}
			setTranscript(nextTranscript.trim())
		}
		recognition.onerror = () => {
			setState("error")
			setNotice("I couldn’t access the microphone. Type the transcript below or retry voice input.")
		}
		recognition.onend = () => setState((current) => current === "listening" ? "ready" : current)
		recognitionRef.current = recognition
		setState("listening")
		try {
			recognition.start()
		} catch {
			setState("error")
			setNotice("The microphone is already in use. Type the transcript below or try again.")
		}
	}

	const stopListening = () => {
		recognitionRef.current?.stop()
		recognitionRef.current = null
		setState("ready")
		window.requestAnimationFrame(() => transcriptRef.current?.focus())
	}

	const submitTranscript = () => {
		const answer = transcript.trim()
		if (!answer) return
		recognitionRef.current?.stop()
		recognitionRef.current = null
		window.speechSynthesis?.cancel()
		setAwaitingFromCount(messages.length)
		setState("thinking")
		setNotice("")
		onSubmit(answer)
		setTranscript("")
	}

	const voiceStatus = {
		consent: "Voice consent",
		ready: "Ready when you are",
		listening: "Listening",
		thinking: "MAX is considering your answer",
		speaking: "MAX is responding",
		error: "Voice input needs attention",
	}[state]

	return (
		<div className="voice-backdrop">
			<motion.section
				className="voice-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby="voice-dialog-title"
				initial={{ opacity: 0, y: 16, scale: 0.99 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: 10, scale: 0.99 }}>
				<header className="voice-header">
					<div><span className="voice-kicker">MAX voice</span><h2 id="voice-dialog-title">{interviewing ? "Owner interview" : "Mission conversation"}</h2></div>
					<div className="voice-header-meta">{interviewing ? `Question ${questionNumber} of ${questionTotal}` : "Context active"}</div>
					<button className="voice-close" type="button" aria-label="Close voice session" onClick={onClose}><X size={17} /></button>
				</header>

				{state === "consent" ? (
					<div className="voice-consent">
						<div className="voice-mark"><img src="/maxion-logo-gradient.svg" alt="" /></div>
						<p className="voice-state-label">Before we begin</p>
						<h3>Continue this interview by voice</h3>
						<p>Your speech is transcribed into the same owner thread. This prototype uses your browser’s voice services and does not retain the original audio.</p>
						<div className="voice-consent-details">
							<span><Check size={14} /> Transcript stays visible in the thread</span>
							<span><Check size={14} /> You can switch back to typing at any time</span>
						</div>
						<button className="primary-button voice-consent-button" type="button" onClick={() => setState("ready")}><Microphone size={17} /> Continue with voice</button>
					</div>
				) : (
					<>
						<div className="voice-stage">
							<div className={`voice-mark ${state === "listening" || state === "speaking" ? "active" : ""}`}><img src="/maxion-logo-gradient.svg" alt="" /></div>
							<div className={`voice-waveform ${state}`} aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <span key={index} style={{ animationDelay: `${index * 38}ms` }} />)}</div>
							<p className="voice-state-label" aria-live="polite">{voiceStatus}</p>
							<p className="voice-question">{question}</p>
						</div>
						<div className="voice-transcript">
							<label htmlFor="voice-transcript">Your response</label>
							<textarea
								ref={transcriptRef}
								id="voice-transcript"
								value={transcript}
								onChange={(event) => setTranscript(event.target.value)}
								placeholder={state === "listening" ? "Your words will appear here…" : "Speak or type your response…"}
								disabled={state === "thinking" || state === "speaking"}
							/>
							{notice ? <p className="voice-notice" role="status">{notice}</p> : null}
						</div>
						<footer className="voice-controls">
							<button className="quiet-button" type="button" onClick={onClose}>End voice session</button>
							<button
								className={`voice-mic-button ${state === "listening" ? "listening" : ""}`}
								type="button"
								aria-label={state === "listening" ? "Stop listening" : state === "speaking" ? "Stop MAX speaking" : "Start listening"}
								disabled={state === "thinking"}
								onClick={() => {
									if (state === "listening") stopListening()
									else if (state === "speaking") {
										window.speechSynthesis.cancel()
										setState("ready")
									} else beginListening()
								}}>
								{state === "speaking" ? <SpeakerHigh size={20} /> : state === "listening" ? <Waveform size={20} /> : <Microphone size={20} />}
							</button>
							<button className="primary-button" type="button" onClick={submitTranscript} disabled={!transcript.trim() || state === "thinking" || state === "speaking"}>Send response <ArrowRight size={15} /></button>
						</footer>
					</>
				)}
			</motion.section>
		</div>
	)
}

function MessageTrace({ steps }: { steps: string[] }) {
	const [open, setOpen] = useState(false)
	return (
		<div className="message-trace">
			<button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
				<CheckCircle size={14} weight="fill" /> {steps.at(-1)} <CaretRight size={13} className={open ? "rotated" : ""} />
			</button>
			<AnimatePresence initial={false}>
				{open ? <motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>{steps.map((step) => <li key={step}><Check size={12} /> {step}</li>)}</motion.ol> : null}
			</AnimatePresence>
		</div>
	)
}

function Deliverables({ scenarioKey, phase, selected, onSelect, onManage }: { scenarioKey: ScenarioKey; phase: number; selected: number; onSelect: (index: number) => void; onManage: () => void }) {
	const scenario = SCENARIOS[scenarioKey]
	const ready = phase >= 7
	const generating = phase >= 6
	return (
		<div className="deliverables-view">
			<header className="deliverables-header">
				<div><p className="eyebrow">Decision package</p><div className="deliverables-title"><h1>{ready ? "Final plan and recommendations" : "Package in preparation"}</h1><span className={ready ? "ready" : "working"}>{ready ? <CheckCircle size={15} weight="fill" /> : <CircleNotch size={15} className="spin" />}{ready ? "Ready" : generating ? "Generating" : "Waiting for readiness"}</span></div><p>{ready ? "Generated automatically from readiness snapshot v7 and manifest v4." : "The package plan is already established. Outputs will fill in place when evidence is ready."}</p></div>
				<div className="header-actions"><button className="quiet-button" type="button" onClick={onManage}><GearSix size={16} /> Manage package</button><button className="primary-button" type="button" disabled={!ready}><DownloadSimple size={17} /> Export all</button></div>
			</header>

			<div className="deliverables-layout">
				<nav className="deliverable-list" aria-label="Deliverable list">
					{DELIVERABLES.map((deliverable, index) => {
						const itemReady = ready || generating && index < Math.max(1, phase - 5)
						return <button key={deliverable.name} type="button" className={selected === index ? "selected" : ""} onClick={() => onSelect(index)}><span className={itemReady ? "document-status ready" : "document-status"}>{itemReady ? <Check size={11} weight="bold" /> : index + 1}</span><div><strong>{deliverable.name}</strong><p>{itemReady ? "Current · evidence bound" : generating ? "Queued" : "Waiting for interviews"}</p></div><CaretRight size={14} /></button>
					})}
				</nav>

				<section className="deliverable-reader">
					<div className="reader-heading"><div><p className="eyebrow">{DELIVERABLES[selected].audience}</p><h2>{DELIVERABLES[selected].name}</h2></div>{ready ? <button className="quiet-button" type="button">Open reader <ArrowRight size={14} /></button> : null}</div>
					{ready ? (
						<div className="reader-content">
							<h3>Decision summary</h3>
							<p>{scenario.summary}</p>
							<div className="key-finding"><span>01</span><div><strong>Operating decision</strong><p>{scenario.decision}</p></div></div>
							<div className="key-finding"><span>02</span><div><strong>Completion standard</strong><p>{scenario.doneWhen}</p></div></div>
							<div className="citation-row"><span>[SRC-014]</span><span>[INT-MAYA-08]</span><span>[CASE-003]</span><span>Readiness v7</span></div>
						</div>
					) : (
						<div className="reader-waiting">
							<div className={generating ? "document-animation active" : "document-animation"}><span /><span /><span /><span /></div>
							<h3>{generating ? "MAX is building this deliverable" : "This deliverable is planned"}</h3>
							<p>{generating ? "The output will appear here without another generate or blueprint step." : DELIVERABLES[selected].rationale}</p>
						</div>
					)}
				</section>
			</div>
		</div>
	)
}

function DrawerPanel({ type, scenarioKey, people, onPeopleChange, onClose }: { type: Exclude<Drawer, null>; scenarioKey: ScenarioKey; people: Person[]; onPeopleChange: (people: Person[]) => void; onClose: () => void }) {
	const scenario = SCENARIOS[scenarioKey]
	const [adding, setAdding] = useState(false)
	const [form, setForm] = useState({ name: "", email: "", role: "", department: "", influence: "Medium", focus: "" })
	const title = type === "people" ? "Stakeholder program" : type === "sources" ? "Connected sources" : "Deliverable manifest"

	const submitPerson = (event: FormEvent) => {
		event.preventDefault()
		if (!form.name || !form.email || !form.role) return
		onPeopleChange([...people, {
			id: `drawer-person-${Date.now()}`,
			name: form.name,
			initials: form.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
			role: form.role,
			department: form.department || "To confirm",
			email: form.email,
			influence: form.influence as Person["influence"],
			focus: form.focus || "MAX will adapt this from mission gaps.",
			channel: "Text",
		}])
		setAdding(false)
		setForm({ name: "", email: "", role: "", department: "", influence: "Medium", focus: "" })
	}

	return (
		<>
			<motion.button className="drawer-backdrop" type="button" aria-label="Close panel" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
			<motion.aside className="drawer" role="dialog" aria-modal="true" aria-label={title} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
				<header><div><p className="eyebrow">Discovery setup</p><h2>{title}</h2></div><IconButton label="Close panel" onClick={onClose}><X size={18} /></IconButton></header>
				{type === "people" ? (
					<div className="drawer-content people-drawer">
						<div className="drawer-intro"><p>MAX identified these roles from the mission and source gaps. Interview focus and channel remain editable.</p><button className="quiet-button" type="button" onClick={() => setAdding((current) => !current)}><Plus size={16} /> Add stakeholder</button></div>
						<AnimatePresence initial={false}>{adding ? <motion.form className="add-person-form" onSubmit={submitPerson} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}><label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label><span>Role</span><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required /></label><label><span>Department</span><input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label><label><span>Influence</span><select value={form.influence} onChange={(event) => setForm({ ...form, influence: event.target.value })}><option>High</option><option>Medium</option></select></label><label className="full"><span>Interview focus</span><textarea value={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.value })} /></label><div className="form-actions"><button className="quiet-button" type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary-button" type="submit">Add to program</button></div></motion.form> : null}</AnimatePresence>
						<div className="person-list">{people.map((person) => <div className="person-row" key={person.id}><div className="person-avatar">{person.initials}</div><div className="person-main"><strong>{person.name}</strong><p>{person.role} · {person.department}</p><span>{person.email}</span><div className="person-focus"><em>Interview focus</em>{person.focus}</div></div><div className="person-meta"><span>{person.influence} influence</span><strong>{person.channel}</strong><button type="button" aria-label={`Edit ${person.name}`}><GearSix size={15} /></button></div></div>)}</div>
					</div>
				) : type === "sources" ? (
					<div className="drawer-content"><div className="drawer-intro"><p>Available integrations are bound automatically when the mission is created. MAX reads only the scopes shown below.</p><span className="verified-label"><CheckCircle size={15} weight="fill" /> All healthy</span></div><div className="source-drawer-list">{scenario.sources.map((source) => <div key={source.name}><span className="source-icon"><Database size={18} /></span><div><strong>{source.name}</strong><p>{source.system} · {source.scope}</p><span>{source.records} · indexed incrementally</span></div><button className="text-button" type="button">Review scope</button></div>)}</div></div>
				) : (
					<div className="drawer-content"><div className="drawer-intro"><p>The manifest is internal operating state, not another artifact to generate. It refines with evidence and freezes at readiness.</p><span className="verified-label"><CheckCircle size={15} weight="fill" /> Auto-managed</span></div><div className="manifest-list">{DELIVERABLES.map((deliverable) => <label key={deliverable.name}><input type="checkbox" defaultChecked /><span><strong>{deliverable.name}</strong><p>{deliverable.audience} · {deliverable.rationale}</p></span></label>)}</div><div className="manifest-policy"><ShieldCheck size={18} weight="fill" /><div><strong>Material changes interrupt</strong><p>Removing a required output, expanding external distribution, or replacing an approved artifact creates an exception. Routine refinements apply automatically.</p></div></div></div>
				)}
			</motion.aside>
		</>
	)
}

function Brand() {
	return <div className="brand"><img src="/maxion-logo-gradient.svg" alt="" /><strong>MAXION</strong><span>Discovery</span></div>
}

function IconButton({ label, active = false, onClick, children }: { label: string; active?: boolean; onClick?: () => void; children: React.ReactNode }) {
	return <button className={active ? "icon-button active" : "icon-button"} type="button" aria-label={label} title={label} onClick={onClick}>{children}</button>
}
