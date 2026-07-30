import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { animate } from "animejs"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
	ArrowLeft,
	ArrowRight,
	CaretDown,
	CaretRight,
	ChatCircleText,
	Check,
	CheckCircle,
	CircleNotch,
	Clock,
	Compass,
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
	Sun,
	UsersThree,
	Waveform,
	X,
} from "@phosphor-icons/react"

import { publicAsset } from "@/lib/publicAsset"

import {
	DELIVERABLES,
	DELIVERABLE_CONTENT,
	OPERATIONS,
	OPERATION_ACTIVITY,
	OPERATION_ELAPSED_MINUTES,
	SCENARIOS,
	nowActions,
	type OwnerInterviewQuestion,
	type Person,
	type ScenarioKey,
} from "./model"
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
	// The bare question inside the message, without MAX's acknowledgement
	// preamble — the voice surface reads and shows this, not the paragraph.
	prompt?: string
	question?: {
		current: number
		total: number
		topic: string
	}
}

type DiscoveryStatus = "needs-input" | "active" | "completed"

type DiscoveryRecord = {
	id: string
	title: string
	brief: string
	scenarioKey: ScenarioKey
	view: View
	phase: number
	paused: boolean
	decision: DecisionState
	people: Person[]
	messages: ChatMessage[]
	interviewIndex: number
	interviewClosed: boolean
	clarificationPending: boolean
	packageSelection: number
	invitesSent: boolean
	createdAt: string
	updatedAt: string
}

const DISCOVERY_STORAGE_KEY = "maxion.prototype.discovery-records.v1"
const MAX_SAVED_DISCOVERIES = 50

function discoveryStatus(record: DiscoveryRecord): DiscoveryStatus {
	if (record.phase >= OPERATIONS.length - 1) return "completed"
	if (!record.interviewClosed || record.phase === 4 && record.decision === "pending") return "needs-input"
	return "active"
}

function createRecordId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
	return `discovery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function minutesAgo(minutes: number) {
	return new Date(Date.now() - minutes * 60_000).toISOString()
}

function seededMessages(scenarioKey: ScenarioKey, state: "attention" | "active" | "complete"): ChatMessage[] {
	const scenario = SCENARIOS[scenarioKey]
	const stateMessage = state === "attention"
		? `I completed the evidence review and stakeholder reconciliation. ${scenario.exception.title}. I kept every unaffected branch moving and need only your bounded decision.`
		: state === "complete"
			? `The Discovery is complete. I verified the evidence set, recorded the decisions, generated all ${DELIVERABLES.length} deliverables, and routed the package to the approved recipients.`
			: `I’m coordinating the inquiry program across ${scenario.people.length} stakeholders. Source review is complete; follow-ups are running against the remaining evidence gaps.`
	return [
		{
			id: `seed-${scenarioKey}-context`,
			actor: "max",
			text: `I framed the mission, bound ${scenario.sources.length} governed sources, and mapped the accountable stakeholders. Routine work is proceeding without interruption.`,
			trace: ["Established the mission boundary", "Verified source access", "Created the stakeholder work graph"],
		},
		{
			id: `seed-${scenarioKey}-${state}`,
			actor: "max",
			text: stateMessage,
			trace: state === "complete"
				? ["Froze readiness snapshot v7", "Generated manifest v4", "Verified package routing"]
				: ["Compared stakeholder positions", "Checked claims against source evidence", "Updated the autonomous work graph"],
		},
	]
}

function createSeedDiscoveryRecords(): DiscoveryRecord[] {
	return [
		{
			id: "seed-tprm-control-redesign",
			title: "Third-party onboarding control redesign",
			brief: SCENARIOS.tprm.brief,
			scenarioKey: "tprm",
			view: "overview",
			phase: 4,
			paused: false,
			decision: "pending",
			people: SCENARIOS.tprm.people,
			messages: seededMessages("tprm", "attention"),
			interviewIndex: SCENARIOS.tprm.ownerInterview.length - 1,
			interviewClosed: true,
			clarificationPending: false,
			packageSelection: 0,
			invitesSent: true,
			createdAt: minutesAgo(188),
			updatedAt: minutesAgo(12),
		},
		{
			id: "seed-financial-integration",
			title: "ServiceNow financial-control integration",
			brief: SCENARIOS.enterprise.brief,
			scenarioKey: "enterprise",
			view: "overview",
			phase: 3,
			paused: false,
			decision: "pending",
			people: SCENARIOS.enterprise.people,
			messages: seededMessages("enterprise", "active"),
			interviewIndex: SCENARIOS.enterprise.ownerInterview.length - 1,
			interviewClosed: true,
			clarificationPending: false,
			packageSelection: 0,
			invitesSent: true,
			createdAt: minutesAgo(320),
			updatedAt: minutesAgo(47),
		},
		{
			id: "seed-northbridge-diligence",
			title: "NorthBridge acquisition diligence",
			brief: SCENARIOS.diligence.brief,
			scenarioKey: "diligence",
			view: "package",
			phase: OPERATIONS.length - 1,
			paused: false,
			decision: "approved",
			people: SCENARIOS.diligence.people,
			messages: seededMessages("diligence", "complete"),
			interviewIndex: SCENARIOS.diligence.ownerInterview.length - 1,
			interviewClosed: true,
			clarificationPending: false,
			packageSelection: 0,
			invitesSent: true,
			createdAt: minutesAgo(2_760),
			updatedAt: minutesAgo(1_465),
		},
	]
}

function readDiscoveryRecords(): DiscoveryRecord[] {
	if (typeof window === "undefined") return createSeedDiscoveryRecords()
	try {
		const stored = window.localStorage.getItem(DISCOVERY_STORAGE_KEY)
		if (!stored) return createSeedDiscoveryRecords()
		const parsed: unknown = JSON.parse(stored)
		if (!Array.isArray(parsed)) return createSeedDiscoveryRecords()
		const records = parsed.filter((candidate): candidate is DiscoveryRecord => {
			if (!candidate || typeof candidate !== "object") return false
			const record = candidate as Partial<DiscoveryRecord>
			return typeof record.id === "string"
				&& typeof record.title === "string"
				&& typeof record.brief === "string"
				&& typeof record.scenarioKey === "string"
				&& Object.prototype.hasOwnProperty.call(SCENARIOS, record.scenarioKey)
				&& (record.view === "thread" || record.view === "overview" || record.view === "package")
				&& typeof record.phase === "number" && Number.isFinite(record.phase)
				&& typeof record.paused === "boolean"
				&& (record.decision === "pending" || record.decision === "approved" || record.decision === "modified")
				&& Array.isArray(record.people)
				&& Array.isArray(record.messages)
				&& typeof record.interviewIndex === "number" && Number.isFinite(record.interviewIndex)
				&& typeof record.interviewClosed === "boolean"
				&& typeof record.clarificationPending === "boolean"
				&& typeof record.packageSelection === "number" && Number.isFinite(record.packageSelection)
				&& typeof record.invitesSent === "boolean"
				&& typeof record.createdAt === "string" && Number.isFinite(new Date(record.createdAt).getTime())
				&& typeof record.updatedAt === "string" && Number.isFinite(new Date(record.updatedAt).getTime())
		})
		return records.length ? records.slice(0, MAX_SAVED_DISCOVERIES) : createSeedDiscoveryRecords()
	} catch {
		return createSeedDiscoveryRecords()
	}
}

function interviewMessage(scenarioKey: ScenarioKey, index: number, prefix?: string): ChatMessage {
	const scenario = SCENARIOS[scenarioKey]
	const prompt = scenario.ownerInterview[index]
	return {
		id: `interview-${index}-${Date.now()}`,
		actor: "max",
		text: `${prefix ? `${prefix} ` : ""}${prompt.question}`,
		prompt: prompt.question,
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

// Echoes of what the owner wrote must never cut a word in half — trim back to
// the last word boundary before appending the ellipsis.
function conciseAnswer(text: string, limit = 120) {
	const sentence = text.trim().split(/[.!?]\s/)[0]
	if (sentence.length <= limit) return sentence
	const clipped = sentence.slice(0, limit - 3)
	const lastBreak = clipped.lastIndexOf(" ")
	const stem = (lastBreak > limit * 0.5 ? clipped.slice(0, lastBreak) : clipped).replace(/[\s,;:—-]+$/, "")
	return `${stem}…`
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

// What MAX shows while it is composing the reply — topic-aware during the owner
// interview, operation-aware afterwards. Never a bare spinner.
function thinkingLine(topic: string | null, phase: number) {
	if (topic) return `MAX is weighing that against the evidence on ${topic.toLowerCase()}…`
	return `MAX is folding that into ${OPERATION_ACTIVITY[Math.min(Math.max(phase, 0), OPERATION_ACTIVITY.length - 1)]}…`
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

// jsdom has no matchMedia — treat that environment like reduced motion so
// tests and unsupported browsers always get the instant path.
function prefersInstantMotion() {
	return typeof window === "undefined" || typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// Sentence-aware word cadence: MAX holds a beat at a full stop or a question
// mark the way a person does, instead of typing on a metronome. `finalize`
// lands the remaining words instantly so only one message can ever be streaming.
function useStreamedText(text: string, active: boolean, finalize = false) {
	const [count, setCount] = useState(active && !prefersInstantMotion() ? 0 : Number.MAX_SAFE_INTEGER)
	useEffect(() => {
		if (!active || finalize || prefersInstantMotion()) { setCount(Number.MAX_SAFE_INTEGER); return }
		const words = text.split(" ")
		setCount(0)
		let timer = 0
		let index = 0
		const step = () => {
			index += 1
			setCount(index)
			if (index >= words.length) return
			const settled = words[index - 1] ?? ""
			timer = window.setTimeout(step, /[.?!]["”’)]?$/.test(settled) ? 136 : 26)
		}
		timer = window.setTimeout(step, 26)
		return () => window.clearTimeout(timer)
	}, [text, active, finalize])
	if (!active) return text
	const words = text.split(" ")
	return count >= words.length ? text : words.slice(0, count).join(" ")
}

// Ticks from the previous value to the next one whenever the target changes;
// mounts (resume, view switches) render the final value instantly unless the
// caller asks for a from-zero entrance (the records landing does).
function useCountUp(target: number, fromZero = false) {
	const seed = fromZero && !prefersInstantMotion() ? 0 : target
	const [value, setValue] = useState(seed)
	const previousRef = useRef(seed)
	useEffect(() => {
		const from = previousRef.current
		previousRef.current = target
		if (from === target) return
		if (prefersInstantMotion()) { setValue(target); return }
		const startedAt = performance.now()
		let frame = 0
		const tick = (now: number) => {
			const progress = Math.min(1, (now - startedAt) / 700)
			setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - progress, 3))))
			if (progress < 1) frame = requestAnimationFrame(tick)
		}
		frame = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(frame)
	}, [target])
	return value
}

function AnimatedStat({ value, fromZero = false }: { value: number | null; fromZero?: boolean }) {
	const display = useCountUp(value ?? 0, fromZero)
	if (value === null) return <>—</>
	return <>{display.toLocaleString()}</>
}

// Messages created during this session stream once; anything loaded from a
// saved record or replayed on a later mount renders instantly.
const STREAMABLE_MESSAGE_IDS = new Set<string>()
const STREAMED_MESSAGE_IDS = new Set<string>()

function registerStreamableMessages(messages: ChatMessage[]) {
	for (const message of messages) if (message.actor === "max") STREAMABLE_MESSAGE_IDS.add(message.id)
}

type MentionTarget = "people" | "sources" | "package"

function escapeMentionToken(value: string) {
	return value.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")
}

function buildMentionTargets(scenarioKey: ScenarioKey, people: Person[]) {
	const scenario = SCENARIOS[scenarioKey]
	const targets = new Map<string, MentionTarget>()
	for (const source of scenario.sources) {
		targets.set(source.name, "sources")
		targets.set(source.system, "sources")
	}
	for (const person of people) targets.set(person.name, "people")
	targets.set("decision package", "package")
	targets.set("package", "package")
	return targets
}

function linkifyMentions(text: string, targets: Map<string, MentionTarget>, onJump: (target: MentionTarget) => void): React.ReactNode {
	if (targets.size === 0) return text
	const pattern = new RegExp(`\\b(${[...targets.keys()].sort((left, right) => right.length - left.length).map(escapeMentionToken).join("|")})\\b`, "g")
	const parts = text.split(pattern)
	if (parts.length === 1) return text
	return parts.map((part, index) => {
		const target = targets.get(part)
		return target
			? <button type="button" key={`${part}-${index}`} className="dsc-mention-chip" onClick={() => onJump(target)}>{part}</button>
			: <React.Fragment key={index}>{part}</React.Fragment>
	})
}

const viewMeta: Array<{ id: View; label: string; icon: React.ElementType }> = [
	{ id: "thread", label: "Thread", icon: ChatCircleText },
	{ id: "overview", label: "Autonomy", icon: Rows },
	{ id: "package", label: "Package", icon: Package },
]

function joinNames(people: Person[]) {
	if (people.length === 0) return "No stakeholders are mapped yet."
	if (people.length === 1) return people[0].name
	return `${people.slice(0, -1).map((person) => person.name).join(", ")}, and ${people.at(-1)?.name}`
}

type Screen = "index" | "setup" | "preparing" | "workspace"

const DISCOVERY_STATUS_LABEL: Record<DiscoveryStatus, string> = {
	"needs-input": "Needs your input",
	active: "Working autonomously",
	completed: "Completed",
}

// Cross-module jump registry (shell ⌘K): saved discoveries live in localStorage, so the
// shell reads them on demand rather than mirroring record state into a prop.
export type DiscoveryJumpRecord = { id: string; title: string; status: DiscoveryStatus; statusLabel: string; keywords: string }
export type DiscoveryJump = "resume" | "decision" | "package"
export type DiscoveryOpenSignal = { tick: number; recordId: string; jump: DiscoveryJump }

export function listDiscoveryJumpRecords(): DiscoveryJumpRecord[] {
	return readDiscoveryRecords().map((record) => {
		const status = discoveryStatus(record)
		return { id: record.id, title: record.title, status, statusLabel: DISCOVERY_STATUS_LABEL[status], keywords: `${record.brief} ${SCENARIOS[record.scenarioKey].kicker}` }
	})
}

type DiscoveryPaletteAction =
	| { type: "view"; view: View }
	| { type: "record"; recordId: string }
	| { type: "new" }
	| { type: "pause" }
	| { type: "decision" }
	| { type: "drawer"; drawer: Exclude<Drawer, null> }

type DiscoveryPaletteItem = { id: string; group: string; label: string; hint: string; keywords: string; action: DiscoveryPaletteAction }

function buildDiscoveryPaletteItems({
	records,
	screen,
	phase,
	paused,
	needsDecision,
	complete,
	activeRecordId,
}: {
	records: DiscoveryRecord[]
	screen: Screen
	phase: number
	paused: boolean
	needsDecision: boolean
	complete: boolean
	activeRecordId: string | null
}): DiscoveryPaletteItem[] {
	const items: DiscoveryPaletteItem[] = []
	const inWorkspace = screen === "workspace"
	if (inWorkspace && needsDecision) items.push({ id: "jump-decision", group: "Decisions", label: "Jump to decision", hint: "One bounded decision is waiting for you", keywords: "decision approve authority exception boundary review", action: { type: "decision" } })
	if (inWorkspace) {
		items.push({ id: "view-thread", group: "Go to", label: "Thread", hint: "Owner conversation with MAX", keywords: "chat conversation messages owner interview thread", action: { type: "view", view: "thread" } })
		items.push({ id: "view-overview", group: "Go to", label: "Autonomy", hint: "Live autonomous work, ledger, and coordination", keywords: "autonomy overview workstreams ledger progress supervision", action: { type: "view", view: "overview" } })
		items.push({ id: "view-package", group: "Go to", label: "Package", hint: phase >= 6 ? "Deliverables and routing" : "Unlocks at synthesis · MAX is preparing the evidence", keywords: "package deliverables outputs decision reader", action: { type: "view", view: "package" } })
		if (!complete) items.push({ id: "toggle-pause", group: "Actions", label: paused ? "Resume the run" : "Pause the run", hint: paused ? "Continue from the last verified checkpoint" : "Stop new autonomous work at a safe checkpoint", keywords: "pause resume checkpoint stop continue run", action: { type: "pause" } })
		items.push({ id: "open-people", group: "Open", label: "People", hint: "Stakeholder program drawer", keywords: "people stakeholders roster interviews program", action: { type: "drawer", drawer: "people" } })
		items.push({ id: "open-sources", group: "Open", label: "Sources", hint: "Connected evidence drawer", keywords: "sources evidence systems connected scopes", action: { type: "drawer", drawer: "sources" } })
		items.push({ id: "open-manifest", group: "Open", label: "Package manifest", hint: "Deliverable manifest drawer", keywords: "manifest deliverables manage package outputs", action: { type: "drawer", drawer: "package" } })
	}
	items.push({ id: "new-discovery", group: "Actions", label: "New discovery", hint: "Describe a new outcome for MAX", keywords: "new create start discovery brief mission", action: { type: "new" } })
	for (const record of records) items.push({ id: `record-${record.id}`, group: "Discoveries", label: record.title, hint: record.id === activeRecordId ? "Currently open" : DISCOVERY_STATUS_LABEL[discoveryStatus(record)], keywords: `resume open ${record.brief} ${SCENARIOS[record.scenarioKey].kicker}`, action: { type: "record", recordId: record.id } })
	return items
}

function DiscoveryCommandPalette({
	records,
	screen,
	phase,
	paused,
	needsDecision,
	complete,
	activeRecordId,
	onRun,
	onDismiss,
}: {
	records: DiscoveryRecord[]
	screen: Screen
	phase: number
	paused: boolean
	needsDecision: boolean
	complete: boolean
	activeRecordId: string | null
	onRun: (action: DiscoveryPaletteAction) => void
	onDismiss: () => void
}) {
	const [query, setQuery] = useState("")
	const [active, setActive] = useState(0)
	const items = buildDiscoveryPaletteItems({ records, screen, phase, paused, needsDecision, complete, activeRecordId })
	const q = query.trim().toLowerCase()
	const filtered = q ? items.filter((item) => `${item.label} ${item.hint} ${item.keywords}`.toLowerCase().includes(q)).slice(0, 9) : items.slice(0, 9)
	const activeIndex = Math.min(active, Math.max(0, filtered.length - 1))
	return (
		<div className="dsc-palette-layer">
			<button type="button" className="dsc-palette-scrim" aria-label="Close command menu" onClick={onDismiss} />
			<div role="dialog" aria-label="Discovery command menu" className="dsc-palette">
				<input
					autoFocus
					value={query}
					placeholder="Jump to a discovery, view, drawer, or action…"
					aria-label="Search Discovery"
					onChange={(event) => { setQuery(event.target.value); setActive(0) }}
					onKeyDown={(event) => {
						if (event.key === "ArrowDown") { event.preventDefault(); setActive((current) => Math.min(current + 1, filtered.length - 1)) }
						if (event.key === "ArrowUp") { event.preventDefault(); setActive((current) => Math.max(current - 1, 0)) }
						if (event.key === "Enter" && filtered[activeIndex]) { event.preventDefault(); onRun(filtered[activeIndex].action) }
						if (event.key === "Escape") { event.preventDefault(); onDismiss() }
					}}
				/>
				<div className="dsc-palette-list">
					{filtered.map((item, index) => (
						<button type="button" key={item.id} className={index === activeIndex ? "is-active" : ""} onMouseEnter={() => setActive(index)} onClick={() => onRun(item.action)}>
							<i>{item.group}</i><span>{item.label}</span><small>{item.hint}</small>
						</button>
					))}
					{filtered.length === 0 ? <p className="dsc-palette-empty">Nothing in Discovery matches “{query}”.</p> : null}
				</div>
				<footer><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span><span><kbd>1 2 3</kbd> views</span><span><kbd>/</kbd> composer</span></footer>
			</div>
		</div>
	)
}

interface DiscoveryAutonomousPrototypePageProps {
	embedded?: boolean
	setupSignal?: number
	openSignal?: DiscoveryOpenSignal | null
	onPackageReady?: () => void
}

export function DiscoveryAutonomousPrototypePage({ embedded = false, setupSignal = 0, openSignal = null, onPackageReady }: DiscoveryAutonomousPrototypePageProps = {}) {
	const reducedMotion = Boolean(useReducedMotion())
	const [records, setRecords] = useState<DiscoveryRecord[]>(readDiscoveryRecords)
	const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
	const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("tprm")
	const [missionBrief, setMissionBrief] = useState("")
	const [screen, setScreen] = useState<Screen>("index")
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
	const [paletteOpen, setPaletteOpen] = useState(false)
	const [pendingReply, setPendingReply] = useState<string | null>(null)
	const [composerFocusTick, setComposerFocusTick] = useState(0)
	const rootRef = useRef<HTMLDivElement>(null)
	const paletteTriggerRef = useRef<HTMLElement | null>(null)
	const drawerTriggerRef = useRef<HTMLElement | null>(null)
	const preparingTimerRef = useRef(0)
	const sessionStartedRef = useRef(new Date().toISOString())
	const scenario = SCENARIOS[scenarioKey]
	const activeRecord = records.find((record) => record.id === activeRecordId)
	const currentMissionTitle = activeRecord?.title ?? missionTitle(missionBrief)
	const needsDecision = screen === "workspace" && phase === 4 && decision === "pending"
	const complete = phase >= OPERATIONS.length - 1

	useEffect(() => {
		try {
			window.localStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(records))
		} catch {
			// The work remains available for this session when browser storage is unavailable.
		}
	}, [records])

	useEffect(() => {
		if (!activeRecordId || screen !== "workspace") return
		setRecords((current) => current.map((record) => record.id === activeRecordId ? {
			...record,
			title: currentMissionTitle,
			brief: missionBrief,
			scenarioKey,
			view,
			phase,
			paused,
			decision,
			people,
			messages,
			interviewIndex,
			interviewClosed,
			clarificationPending,
			packageSelection,
			invitesSent,
			updatedAt: new Date().toISOString(),
		} : record))
	}, [activeRecordId, clarificationPending, currentMissionTitle, decision, interviewClosed, interviewIndex, invitesSent, messages, missionBrief, packageSelection, paused, people, phase, scenarioKey, screen, view])

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

	useEffect(() => () => window.clearTimeout(preparingTimerRef.current), [])

	const start = () => {
		if (!missionBrief.trim()) return
		const recordId = createRecordId()
		const startedAt = new Date().toISOString()
		const startingMessages = initialInterviewMessages(scenarioKey, missionBrief)
		const newRecord: DiscoveryRecord = {
			id: recordId,
			title: missionTitle(missionBrief),
			brief: missionBrief,
			scenarioKey,
			view: "thread",
			phase: 0,
			paused: false,
			decision: "pending",
			people: SCENARIOS[scenarioKey].people,
			messages: startingMessages,
			interviewIndex: 0,
			interviewClosed: false,
			clarificationPending: false,
			packageSelection: 0,
			invitesSent: false,
			createdAt: startedAt,
			updatedAt: startedAt,
		}
		setActiveRecordId(recordId)
		setRecords((current) => [newRecord, ...current].slice(0, MAX_SAVED_DISCOVERIES))
		setScreen("preparing")
		setView("thread")
		setPhase(0)
		setDecision("pending")
		setPaused(false)
		setInterviewIndex(0)
		setInterviewClosed(false)
		setClarificationPending(false)
		setPeople(SCENARIOS[scenarioKey].people)
		setMessages(startingMessages)
		setInvitesSent(false)
		registerStreamableMessages(startingMessages)
		window.clearTimeout(preparingTimerRef.current)
		preparingTimerRef.current = window.setTimeout(() => setScreen("workspace"), reducedMotion ? 700 : 2400)
	}

	const enterWorkspaceNow = () => {
		window.clearTimeout(preparingTimerRef.current)
		setScreen("workspace")
	}

	const openNewDiscovery = () => {
		setPendingReply(null)
		window.clearTimeout(preparingTimerRef.current)
		setActiveRecordId(null)
		setScenarioKey("tprm")
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
		setPeople(SCENARIOS.tprm.people)
		setMessages(initialInterviewMessages("tprm"))
		setPendingPerson(null)
		setPackageSelection(0)
		setInvitesSent(false)
	}

	const openDiscoveryIndex = () => {
		setPendingReply(null)
		window.clearTimeout(preparingTimerRef.current)
		setScreen("index")
		setDrawer(null)
		setPendingPerson(null)
	}

	const resumeDiscovery = (record: DiscoveryRecord) => {
		setPendingReply(null)
		setActiveRecordId(record.id)
		setScenarioKey(record.scenarioKey)
		setMissionBrief(record.brief)
		setView(record.view)
		setDrawer(null)
		setPhase(record.phase)
		setPaused(record.paused)
		setDecision(record.decision)
		setPeople(record.people)
		setMessages(record.messages)
		setCommandText("")
		setPendingPerson(null)
		setInterviewIndex(record.interviewIndex)
		setInterviewClosed(record.interviewClosed)
		setClarificationPending(record.clarificationPending)
		setTraceOpen(false)
		setPackageSelection(record.packageSelection)
		setInvitesSent(record.invitesSent)
		setScreen("workspace")
	}

	const openDrawer = (next: Exclude<Drawer, null>, trigger?: HTMLElement | null) => {
		drawerTriggerRef.current = trigger !== undefined ? trigger : document.activeElement instanceof HTMLElement ? document.activeElement : null
		setDrawer(next)
	}

	const closeDrawer = () => {
		setDrawer(null)
		const trigger = drawerTriggerRef.current
		drawerTriggerRef.current = null
		window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }))
	}

	const openPalette = () => {
		paletteTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
		setPaletteOpen(true)
	}

	const dismissPalette = () => {
		setPaletteOpen(false)
		const trigger = paletteTriggerRef.current
		paletteTriggerRef.current = null
		window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }))
	}

	const requestView = (next: View) => {
		if (next === "package" && phase < 6) {
			setToast("Package unlocks at synthesis · MAX is still preparing the evidence")
			return
		}
		setView(next)
	}

	const jumpToDecision = () => {
		setView("thread")
		window.setTimeout(() => {
			// Scroll the log itself rather than scrollIntoView — the page is also
			// embedded inside the portal and must not scroll ancestor containers.
			const log = rootRef.current?.querySelector<HTMLElement>(".message-log")
			const card = rootRef.current?.querySelector<HTMLElement>(".decision-event")
			if (!log || !card) return
			const top = card.getBoundingClientRect().top - log.getBoundingClientRect().top + log.scrollTop - Math.max(0, (log.clientHeight - card.clientHeight) / 2)
			log.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? "auto" : "smooth" })
		}, 90)
	}

	const runPaletteAction = (action: DiscoveryPaletteAction) => {
		setPaletteOpen(false)
		if (action.type === "record") {
			const record = records.find((item) => item.id === action.recordId)
			if (record) resumeDiscovery(record)
			return
		}
		if (action.type === "new") { openNewDiscovery(); return }
		if (action.type === "view") { requestView(action.view); return }
		if (action.type === "pause") { setPaused((current) => !current); return }
		if (action.type === "decision") { jumpToDecision(); return }
		openDrawer(action.drawer, paletteTriggerRef.current)
	}

	// The shell ⌘K quick action asks Discovery to open a fresh setup screen.
	const openNewDiscoveryRef = useRef<() => void>(() => undefined)
	openNewDiscoveryRef.current = openNewDiscovery

	useEffect(() => {
		if (!setupSignal) return
		openNewDiscoveryRef.current()
	}, [setupSignal])

	// The shell's cross-module jump registry opens a saved discovery at its saved point of
	// work. Live actions arrive through a ref so the one-shot effect never reads stale state.
	const openJumpRef = useRef<(signal: DiscoveryOpenSignal) => void>(() => undefined)
	openJumpRef.current = (signal) => {
		const record = records.find((item) => item.id === signal.recordId)
		if (!record) return
		resumeDiscovery(signal.jump === "package" && record.phase >= 6 ? { ...record, view: "package" } : signal.jump === "decision" ? { ...record, view: "thread" } : record)
		if (signal.jump === "decision") jumpToDecision()
	}
	const openSignalTickRef = useRef(0)
	useEffect(() => {
		if (!openSignal || openSignal.tick === openSignalTickRef.current) return
		openSignalTickRef.current = openSignal.tick
		openJumpRef.current(openSignal)
	}, [openSignal])

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// The portal keeps every module stage mounted behind `hidden` — only
			// the visible Discovery stage may own the keyboard.
			if (!rootRef.current?.offsetParent) return
			const target = event.target instanceof HTMLElement ? event.target : null
			const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault()
				event.stopPropagation()
				if (paletteOpen) dismissPalette()
				else openPalette()
				return
			}
			if (event.key === "Escape") {
				if (paletteOpen) { event.stopPropagation(); dismissPalette(); return }
				if (drawer) { event.stopPropagation(); closeDrawer(); return }
				return
			}
			if (typing) return
			if (event.key === "/" && screen === "workspace") {
				event.preventDefault()
				setView("thread")
				setComposerFocusTick((tick) => tick + 1)
				return
			}
			if (screen === "workspace" && ["1", "2", "3"].includes(event.key)) {
				requestView((["thread", "overview", "package"] as const)[Number(event.key) - 1])
			}
		}
		window.addEventListener("keydown", onKeyDown, { capture: true })
		return () => window.removeEventListener("keydown", onKeyDown, { capture: true })
	}, [drawer, paletteOpen, phase, reducedMotion, screen])

	const resolveDecision = (next: Exclude<DecisionState, "pending">) => {
		const exception = scenario.exception
		setDecision(next)
		addMessage({
			id: `decision-${Date.now()}`,
			actor: "max",
			text: next === "approved" ? exception.approvedConfirmation : exception.alternativeConfirmation,
			trace:
				next === "approved"
					? ["Recorded the exact bounded authority", "Opened only the approved action", "Verified the action and resumed the affected branch"]
					: ["Recorded the alternative direction", "Preserved the evidence and authority boundary", "Resumed the affected branch with the limitation visible"],
		})
		setToast("Decision recorded · affected work resumed")
	}

	const addMessage = (message: ChatMessage) => {
		registerStreamableMessages([message])
		setMessages((current) => [...current, message])
	}

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
			text: `${prefix ? `${prefix} ` : ""}That gives me enough owner context for this pass. I’ve closed the interview, preserved the conversation for later additions, and started source verification and stakeholder coordination. I’ll keep the work visible in Autonomy and won’t ask another interview question unless you reopen it.`,
			trace: ["Saved the owner interview as a versioned context snapshot", "Replanned the inquiry map from the captured answers", "Started the autonomous work graph"],
		})
		setToast("Owner interview complete · Autonomy is now live")
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
				prompt: "For now, who would know or make that call in practice? A role is enough.",
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
		// A turn, not a form submit: MAX visibly considers the answer before it
		// replies. Reduced motion collapses the gap and skips the pending row.
		if (!reducedMotion) setPendingReply(thinkingLine(interviewClosed ? null : scenario.ownerInterview[Math.min(interviewIndex, scenario.ownerInterview.length - 1)].topic, phase))

		window.setTimeout(() => {
			setPendingReply(null)
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
		}, reducedMotion ? 50 : 720)
	}

	const sendCommand = (event: FormEvent) => {
		event.preventDefault()
		submitCommand(commandText)
	}

	return (
		<div ref={rootRef} className={`prototype${dark ? " dark" : ""}${embedded ? " embedded" : ""}`}>
			{screen === "index" ? (
				<DiscoveryIndex
					records={records}
					embedded={embedded}
					dark={dark}
					onToggleDark={() => setDark((current) => !current)}
					onNew={openNewDiscovery}
					onResume={resumeDiscovery}
					onReviewDecision={(record) => resumeDiscovery({ ...record, view: "thread" })}
				/>
			) : screen === "setup" ? (
					<SetupScreen
						missionBrief={missionBrief}
						onMissionBriefChange={setMissionBrief}
						onStart={start}
						embedded={embedded}
						dark={dark}
					onToggleDark={() => setDark((current) => !current)}
					onPreview={(target) => openDrawer(target)}
				/>
			) : screen === "preparing" ? (
				<PreparingScreen scenarioKey={scenarioKey} missionTitle={currentMissionTitle} onEnter={enterWorkspaceNow} />
			) : (
					<WorkspaceShell
						scenarioKey={scenarioKey}
						missionTitle={currentMissionTitle}
						embedded={embedded}
					view={view}
					onViewChange={setView}
					phase={phase}
					paused={paused}
					interviewClosed={interviewClosed}
						onTogglePause={() => setPaused((current) => !current)}
						onOpenIndex={openDiscoveryIndex}
						onNewDiscovery={openNewDiscovery}
						onJumpToDecision={jumpToDecision}
					dark={dark}
					onToggleDark={() => setDark((current) => !current)}>
					{view === "overview" ? (
						<Overview
							scenarioKey={scenarioKey}
							missionBrief={missionBrief}
							startedAt={activeRecord?.createdAt ?? sessionStartedRef.current}
							phase={phase}
							paused={paused}
							decision={decision}
							people={people}
							interviewClosed={interviewClosed}
							invitesSent={invitesSent}
							traceOpen={traceOpen}
							onToggleTrace={() => setTraceOpen((current) => !current)}
							onResolveDecision={resolveDecision}
							onOpenDrawer={openDrawer}
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
							pendingReply={pendingReply}
							commandText={commandText}
							composerFocusTick={composerFocusTick}
							onCommandTextChange={setCommandText}
							onSend={sendCommand}
							onVoiceSubmit={submitCommand}
							onResolveDecision={resolveDecision}
							onJumpToDecision={jumpToDecision}
							onOpenPeople={() => openDrawer("people")}
							onOpenSources={() => openDrawer("sources")}
							onOpenPackage={() => setView("package")}
							onOpenAutonomy={() => setView("overview")}
						/>
					) : (
						<Deliverables
							scenarioKey={scenarioKey}
							phase={phase}
							selected={packageSelection}
							onSelect={setPackageSelection}
							onManage={() => openDrawer("package")}
						/>
					)}
				</WorkspaceShell>
			)}

			{paletteOpen ? (
				<DiscoveryCommandPalette
					records={records}
					screen={screen}
					phase={phase}
					paused={paused}
					needsDecision={needsDecision}
					complete={complete}
					activeRecordId={activeRecordId}
					onRun={runPaletteAction}
					onDismiss={dismissPalette}
				/>
			) : null}
			<AnimatePresence>
				{drawer ? (
					<DrawerPanel
						type={drawer}
						scenarioKey={scenarioKey}
						people={people}
						onPeopleChange={setPeople}
						onClose={closeDrawer}
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

function relativeDiscoveryTime(timestamp: string) {
	const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60_000))
	if (elapsedMinutes < 1) return "Updated just now"
	if (elapsedMinutes < 60) return `Updated ${elapsedMinutes} min ago`
	const elapsedHours = Math.round(elapsedMinutes / 60)
	if (elapsedHours < 24) return `Updated ${elapsedHours} hr${elapsedHours === 1 ? "" : "s"} ago`
	const elapsedDays = Math.round(elapsedHours / 24)
	return `Updated ${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`
}

// Ledger entries are stamped from the run's own start time plus the elapsed
// minutes for that operation, clamped to now so nothing is ever dated ahead.
function ledgerMoment(startedAt: string, minutes: number) {
	const started = new Date(startedAt).getTime()
	const stamp = Number.isFinite(started) ? Math.min(started + minutes * 60_000, Date.now()) : Date.now()
	return new Date(stamp)
}

function discoveryActivity(record: DiscoveryRecord) {
	const scenario = SCENARIOS[record.scenarioKey]
	if (record.phase >= OPERATIONS.length - 1) return `MAX verified ${DELIVERABLES.length} deliverables and routed the decision package.`
	if (!record.interviewClosed) return `MAX is ready for your judgment · ${scenario.ownerInterview[record.interviewIndex].topic}`
	if (record.phase === 4 && record.decision === "pending") return `MAX isolated one authority boundary · ${scenario.exception.title}`
	if (record.paused) return "MAX preserved the last verified checkpoint. Resume when you’re ready."
	return `MAX is ${OPERATION_ACTIVITY[record.phase] ?? "working the mission"} · routine work is continuing autonomously.`
}

function DiscoveryIndex({
	records,
	embedded,
	dark,
	onToggleDark,
	onNew,
	onResume,
	onReviewDecision,
}: {
	records: DiscoveryRecord[]
	embedded: boolean
	dark: boolean
	onToggleDark: () => void
	onNew: () => void
	onResume: (record: DiscoveryRecord) => void
	onReviewDecision: (record: DiscoveryRecord) => void
}) {
	const [filter, setFilter] = useState<"all" | DiscoveryStatus>("all")
	const [query, setQuery] = useState("")
	const statusMeta: Record<DiscoveryStatus, { label: string; description: string }> = {
		"needs-input": {
			label: "Needs your input",
			description: "MAX has isolated the judgment or authority it cannot safely infer.",
		},
		active: {
			label: "Working autonomously",
			description: "Evidence, interviews, follow-ups, and synthesis are moving without your attention.",
		},
		completed: {
			label: "Completed",
			description: "Verified packages are ready to review, share, or hand into Plan.",
		},
	}
	const countFor = (status: DiscoveryStatus) => records.filter((record) => discoveryStatus(record) === status).length
	const normalizedQuery = query.trim().toLowerCase()
	const filtered = [...records].filter((record) => {
		const matchesFilter = filter === "all" || discoveryStatus(record) === filter
		const matchesQuery = !normalizedQuery || `${record.title} ${record.brief} ${SCENARIOS[record.scenarioKey].kicker}`.toLowerCase().includes(normalizedQuery)
		return matchesFilter && matchesQuery
	}).sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
	const sections = (["needs-input", "active", "completed"] as DiscoveryStatus[])
		.map((status) => ({ status, records: filtered.filter((record) => discoveryStatus(record) === status) }))
		.filter((section) => section.records.length > 0)

	return (
		<div className="discovery-index-shell">
			<aside className="discovery-index-rail" aria-label="Discovery navigation" hidden={embedded}>
				<div>
					<div className="rail-brand"><img src={publicAsset("maxion-logo-gradient.svg")} alt="" /><strong>MAXION</strong></div>
					<button className="rail-new" type="button" onClick={onNew}><Plus size={16} /> New discovery</button>
					<nav className="rail-primary">
						<button type="button"><House size={17} /><span>Home</span></button>
						<button type="button" className="active" aria-current="page"><MagnifyingGlass size={17} weight="bold" /><span>Discover</span></button>
						<button type="button"><ListChecks size={17} /><span>Plan</span></button>
						<button type="button"><Lightning size={17} /><span>Execute</span></button>
					</nav>
				</div>
				<div className="rail-bottom">
					<button type="button"><GearSix size={17} /><span>Settings</span></button>
					<div className="rail-profile"><div className="avatar" aria-label="Root Admin">RA</div><div><strong>Root Admin</strong><span>Admin workspace</span></div></div>
				</div>
			</aside>

			<main className="discovery-index-main">
				<header className="discovery-index-header">
					<div>
						<p className="eyebrow">Autonomous Discovery</p>
						<h1>Continue where MAX left off.</h1>
					</div>
					<section className="discovery-index-summary" aria-label="Discovery workload summary">
						<div className="is-attention"><span>Needs your input</span><strong><AnimatedStat value={countFor("needs-input")} fromZero /></strong></div>
						<div><span>Working autonomously</span><strong><AnimatedStat value={countFor("active")} fromZero /></strong></div>
						<div><span>Packages ready</span><strong><AnimatedStat value={countFor("completed")} fromZero /></strong></div>
					</section>
					<div className="discovery-index-actions">
						{!embedded ? <IconButton label={dark ? "Use light theme" : "Use dark theme"} onClick={onToggleDark}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconButton> : null}
						<button className="primary-button discovery-new-button" type="button" onClick={onNew}><Plus size={16} weight="bold" /> New Discovery</button>
					</div>
				</header>

				<div className="discovery-index-toolbar">
					<label className="discovery-search">
						<MagnifyingGlass size={16} aria-hidden="true" />
						<input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search discoveries" placeholder="Search discoveries" />
					</label>
					<div className="discovery-filters" role="group" aria-label="Filter discoveries">
						{([
							["all", "All", records.length],
							["needs-input", "Needs input", countFor("needs-input")],
							["active", "Active", countFor("active")],
							["completed", "Completed", countFor("completed")],
						] as const).map(([value, label, count]) => (
							<button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>
						))}
					</div>
				</div>

				<div className="discovery-index-results" aria-live="polite">
					{sections.length ? sections.map((section) => (
						<section key={section.status} className={`discovery-record-section is-${section.status}`} aria-labelledby={`discovery-${section.status}-heading`}>
							<div className="discovery-record-section-heading">
								<div><h2 id={`discovery-${section.status}-heading`}>{statusMeta[section.status].label}</h2><p>{statusMeta[section.status].description}</p></div>
								<span>{section.records.length}</span>
							</div>
							<div className="discovery-record-list">
								{section.records.map((record) => {
									const progress = Math.round(((record.phase + 1) / OPERATIONS.length) * 100)
									const status = discoveryStatus(record)
									return (
										<button key={record.id} type="button" className={`discovery-record-card is-${status}`} onClick={() => onResume(record)} aria-label={`Resume ${record.title}, ${statusMeta[status].label}`}>
											<span className="discovery-record-status"><i aria-hidden="true">{status === "completed" ? <Check size={10} weight="bold" /> : status === "needs-input" ? "!" : <CircleNotch size={10} className="spin" />}</i>{statusMeta[status].label}</span>
											<time dateTime={record.updatedAt}>{relativeDiscoveryTime(record.updatedAt)}</time>
											<strong className="discovery-record-title">{record.title}</strong>
											<span className="discovery-record-context">{SCENARIOS[record.scenarioKey].kicker}</span>
											<span className="discovery-record-activity">{discoveryActivity(record)}</span>
											{status === "needs-input" ? (
												<span
													className="discovery-record-review"
													title={record.interviewClosed ? SCENARIOS[record.scenarioKey].exception.title : "MAX is waiting on your next interview answer"}
													onClick={(event) => { event.stopPropagation(); onReviewDecision(record) }}>
													{record.interviewClosed ? "Review decision" : "Continue interview"} <ArrowRight size={12} weight="bold" />
												</span>
											) : null}
											<span className="discovery-record-progress" aria-label={`${progress}% complete`}><i><b style={{ width: `${progress}%` }} /></i><em>{progress}%</em></span>
											<span className="discovery-record-meta"><span>{record.phase + 1} of {OPERATIONS.length} stages</span><span>{record.people.length} stakeholders</span><span>{SCENARIOS[record.scenarioKey].sources.length} sources</span></span>
											<span className="discovery-record-resume">Resume workspace <ArrowRight size={15} weight="bold" /></span>
										</button>
									)
								})}
							</div>
						</section>
					)) : (
						<section className="discovery-empty-state">
							<MagnifyingGlass size={20} />
							<h2>No discoveries match that search.</h2>
							<p>Clear the search or choose a different status.</p>
							<button className="quiet-button" type="button" onClick={() => { setQuery(""); setFilter("all") }}>Show all discoveries</button>
						</section>
					)}
				</div>
			</main>
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
	onPreview,
}: {
	missionBrief: string
	onMissionBriefChange: (value: string) => void
	onStart: () => void
	embedded: boolean
	dark: boolean
	onToggleDark: () => void
	onPreview: (target: Exclude<Drawer, null>) => void
}) {
	const hasMission = Boolean(missionBrief.trim())
	const [briefFocusedByPointer, setBriefFocusedByPointer] = useState(false)
	const briefRef = useRef<HTMLTextAreaElement>(null)
	useEffect(() => {
		// Focus the brief so typing can begin immediately — but never steal
		// focus while the Discovery stage is hidden inside the portal.
		const brief = briefRef.current
		if (!brief?.offsetParent) return
		brief.focus({ preventScroll: true })
	}, [])
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
						<img src={publicAsset("maxion-logo-gradient.svg")} alt="" />
						<p className="eyebrow">Start a Discovery</p>
						<h1>What should MAX accomplish?</h1>
						<p>Describe the decision and the outcome. MAX will work out the investigation.</p>
					</section>

					<div className="setup-grid">
						<section className={`brief-editor${briefFocusedByPointer ? " is-pointer-focused" : ""}`} aria-labelledby="brief-heading">
						<div className="section-heading-row">
							<div>
								<p className="eyebrow">Mission brief</p>
								<h2 id="brief-heading">Describe the outcome</h2>
							</div>
							<span className="draft-status">Saved when started</span>
						</div>
						<textarea ref={briefRef} value={missionBrief} onChange={(event) => onMissionBriefChange(event.target.value)} onPointerDown={() => setBriefFocusedByPointer(true)} onBlur={() => setBriefFocusedByPointer(false)} aria-label="Discovery brief" placeholder="Describe the decision, outcome, or problem. MAX will form the investigation, bind relevant evidence, and return with a decision package." />
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
							<Compass size={18} weight="fill" />
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
							<button type="button" aria-label="Review connected sources" onClick={() => onPreview("sources")}>
								<Database size={17} /><span><strong>Relevant</strong> sources auto-bound</span>
							</button>
							<button type="button" aria-label="Review proposed stakeholder roles" onClick={() => onPreview("people")}>
								<UsersThree size={17} /><span><strong>Right</strong> roles identified</span>
							</button>
							<button type="button" aria-label="Review deliverable plan" onClick={() => onPreview("package")}>
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

// Each receipt carries the mission's own numbers and holds for a different beat
// — real work does not land on a metronome.
function preparingSteps(scenarioKey: ScenarioKey) {
	const scenario = SCENARIOS[scenarioKey]
	const records = scenario.sources.reduce((total, source) => total + Number(source.records.replace(/[^0-9]/g, "")), 0)
	return [
		{ label: "Mission boundary established", detail: `Objective, completion condition, and authority envelope normalized · ${scenario.deadline}`, hold: 360 },
		{ label: "Governed sources bound", detail: `${scenario.sources.length} permitted scopes · ${records.toLocaleString()} records in scope · provenance retained`, hold: 560 },
		{ label: "Stakeholder graph mapped", detail: `${scenario.people.length} accountable owners matched to the open evidence gaps`, hold: 780 },
		{ label: "First work graph created", detail: `${scenario.inquiries.length} inquiries sequenced · ${DELIVERABLES.length} outputs planned · routine work pre-authorized`, hold: 520 },
	]
}

function PreparingScreen({ scenarioKey, missionTitle, onEnter }: { scenarioKey: ScenarioKey; missionTitle: string; onEnter: () => void }) {
	const orbitRef = useRef<HTMLDivElement>(null)
	const reducedMotion = Boolean(useReducedMotion())
	const steps = useMemo(() => preparingSteps(scenarioKey), [scenarioKey])
	const [landed, setLanded] = useState(reducedMotion ? steps.length : 1)

	useEffect(() => {
		if (reducedMotion || landed >= steps.length) return
		const timer = window.setTimeout(() => setLanded((current) => current + 1), steps[landed - 1]?.hold ?? 520)
		return () => window.clearTimeout(timer)
	}, [landed, reducedMotion, steps])

	useEffect(() => {
		if (reducedMotion || !orbitRef.current) return
		const orbitAnimation = animate(orbitRef.current, { rotate: 360, duration: 2200, loop: true, ease: "linear" })
		return () => {
			orbitAnimation.cancel()
		}
	}, [reducedMotion])

	return (
		<div className="preparing-shell">
			<Brand />
			<div className="preparing-center" role="status" aria-live="polite">
				<div className="mission-orbit" ref={orbitRef} aria-hidden="true">
					<span /><span /><span />
				</div>
				<img src={publicAsset("maxion-logo-gradient.svg")} alt="" className="preparing-mark" />
				<p className="eyebrow">Establishing the mission</p>
				<h1>{missionTitle}</h1>
				<div className="preparing-receipts">
					{steps.slice(0, landed).map((step, index) => {
						const working = index === landed - 1 && landed < steps.length
						return (
							<div key={step.label} className={working ? "preparing-receipt is-working" : "preparing-receipt"}>
								<span>{working ? <CircleNotch size={13} className="spin" /> : <Check size={13} weight="bold" />}</span>
								<div><strong>{step.label}</strong><small>{step.detail}</small></div>
							</div>
						)
					})}
				</div>
				<div className="preparing-actions">
					<button className="quiet-button preparing-enter" type="button" onClick={onEnter}>Enter workspace now <ArrowRight size={14} weight="bold" /></button>
					<p className="preparing-footnote">You can leave this screen. MAX will continue from the persisted mission state.</p>
				</div>
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
	interviewClosed,
	onTogglePause,
	onOpenIndex,
	onNewDiscovery,
	onJumpToDecision,
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
	interviewClosed: boolean
	onTogglePause: () => void
	onOpenIndex: () => void
	onNewDiscovery: () => void
	onJumpToDecision: () => void
	dark: boolean
	onToggleDark: () => void
	children: React.ReactNode
}) {
	const scenario = SCENARIOS[scenarioKey]
	const businessStatus = !interviewClosed
		? "Owner interview underway"
		: paused
		? "Paused at a verified checkpoint"
		: phase <= 2
			? "MAX is mobilizing sources and stakeholders"
			: phase <= 4
				? `MAX is interviewing and reconciling · ${Math.min(peopleCountForPhase(phase), scenario.people.length)} of ${scenario.people.length} complete`
				: phase <= 6
					? "MAX is synthesizing findings · no action needed"
					: "Package ready · routed for approval"
	return (
		<div className="workspace-shell">
			<aside className="product-rail" aria-label="Product navigation" hidden={embedded}>
				<div className="rail-brand"><img src={publicAsset("maxion-logo-gradient.svg")} alt="" /><strong>MAXION</strong></div>
				<button className="rail-new" type="button" onClick={onNewDiscovery}><Plus size={16} /> New discovery</button>
				<nav className="rail-primary">
					<button type="button" onClick={onOpenIndex}><House size={17} /><span>Home</span></button>
					<button type="button" className="active" onClick={onOpenIndex}><MagnifyingGlass size={17} weight="bold" /><span>Discover</span></button>
					<button type="button"><ListChecks size={17} /><span>Plan</span></button>
					<button type="button"><Lightning size={17} /><span>Execute</span></button>
				</nav>
				<div className="rail-recents">
					<span>Current task</span>
					<button type="button" className="active" onClick={() => onViewChange(phase >= 7 ? "package" : "thread")}><i /><div><strong>{missionTitle}</strong><small>{phase >= 7 ? "Complete" : paused ? "Paused" : "Running"}</small></div></button>
					<button type="button" className="rail-all-discoveries" onClick={onOpenIndex}><div><strong>All discoveries</strong><small>Resume saved work</small></div></button>
				</div>
				<div className="rail-bottom">
					<button type="button"><GearSix size={17} /><span>Settings</span></button>
					<div className="rail-profile"><div className="avatar" aria-label="Abhinav Shankar">AS</div><div><strong>Abhinav</strong><span>Admin workspace</span></div></div>
				</div>
			</aside>

			<div className="workspace-body">
				<header className="workspace-header">
					<button className="workspace-back-button" type="button" onClick={onOpenIndex} aria-label="All discoveries"><ArrowLeft size={17} /><span>Discoveries</span></button>
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
						<IconButton label="New Discovery" onClick={onNewDiscovery}><Plus size={18} /></IconButton>
					</div>
				</header>

				<div className="workspace-subnav">
					<nav className="workspace-tabs" aria-label="Discovery views">
						{viewMeta.map((item) => {
							const Icon = item.icon
							return (
								<button key={item.id} type="button" className={view === item.id ? "active" : ""} onClick={() => onViewChange(item.id)} disabled={item.id === "package" && phase < 6} title={item.id === "package" && phase < 6 ? "Unlocks at synthesis · MAX is preparing the evidence" : undefined}>
									<Icon size={15} weight={view === item.id ? "fill" : "regular"} />
									{item.label}
									{item.id === "overview" && interviewClosed && phase < 7 ? <span className="autonomy-tab-pulse" aria-hidden="true" /> : null}
									{item.id === "package" && phase >= 6 ? <span className="tab-ready-dot" /> : null}
								</button>
							)
						})}
					</nav>
					<button type="button" className="business-status" aria-label="Discovery status" title={phase === 4 && interviewClosed ? "Jump to the decision" : "Open the owner thread"} onClick={onJumpToDecision}>
							<span className={phase === 4 && interviewClosed ? "attention" : phase >= 7 ? "complete" : "working"} />
							<strong>{businessStatus}</strong>
							<small>{!interviewClosed ? "MAX asks only for judgment the records can’t supply" : phase === 4 ? "1 decision needs you" : phase >= 7 ? "5 deliverables ready" : "MAX is continuing autonomously"}</small>
					</button>
				</div>

				<main className="workspace-content">{children}</main>
			</div>
		</div>
	)
}

function peopleCountForPhase(phase: number) {
	return Math.min(4, Math.max(0, phase - 2))
}

function DecisionBoundary({
	scenarioKey,
	compact = false,
	headingId,
	onResolve,
}: {
	scenarioKey: ScenarioKey
	compact?: boolean
	headingId?: string
	onResolve: (decision: Exclude<DecisionState, "pending">) => void
}) {
	const exception = SCENARIOS[scenarioKey].exception
	const boundaryCopy: Record<ScenarioKey, { title: string; detail: string }> = {
		tprm: {
			title: "Discovery is internal by default",
			detail: "MAX stopped before contacting anyone outside the approved northstar.com workspace.",
		},
		diligence: {
			title: "MAX stopped before changing the investment conclusion",
			detail: "The evidence conflict requires an explicit direction before this branch can influence the committee package.",
		},
		enterprise: {
			title: "MAX stopped before weakening a financial control",
			detail: "The current design cannot move forward with an unapproved segregation-of-duties exception.",
		},
	}
	const boundary = boundaryCopy[scenarioKey]

	return (
		<div className={`decision-boundary${compact ? " is-compact" : ""}`}>
			<div className="decision-boundary-scope">
				<ShieldCheck size={17} weight="fill" />
				<div><strong>{boundary.title}</strong><span>{boundary.detail}</span></div>
			</div>
			<h2 id={headingId}>{exception.title}</h2>
			<div className="decision-boundary-reasoning">
				<div><span>Why this surfaced</span><p>{exception.trigger}</p></div>
				<div><span>What MAX already checked</span><p>{exception.evidenceGap}</p></div>
			</div>
			<div className="decision-boundary-outcomes">
				<div><strong>If allowed</strong><span>{exception.consequence}</span></div>
				<div><strong>If kept within the current boundary</strong><span>{exception.alternative}</span></div>
			</div>
			<div className="exception-actions">
				<button className="primary-button" type="button" onClick={() => onResolve("approved")}>{exception.approveLabel}</button>
				<button className="quiet-button" type="button" onClick={() => onResolve("modified")}>{exception.alternativeLabel}</button>
			</div>
		</div>
	)
}

function Overview({
	scenarioKey,
	missionBrief,
	startedAt,
	phase,
	paused,
	decision,
	people,
	interviewClosed,
	invitesSent,
	traceOpen,
	onToggleTrace,
	onResolveDecision,
	onOpenDrawer,
	onOpenThread,
}: {
	scenarioKey: ScenarioKey
	missionBrief: string
	startedAt: string
	phase: number
	paused: boolean
	decision: DecisionState
	people: Person[]
	interviewClosed: boolean
	invitesSent: boolean
	traceOpen: boolean
	onToggleTrace: () => void
	onResolveDecision: (decision: Exclude<DecisionState, "pending">) => void
	onOpenDrawer: (drawer: Exclude<Drawer, null>) => void
	onOpenThread: () => void
}) {
	const scenario = SCENARIOS[scenarioKey]
	const decisionPending = phase === 4 && decision === "pending"
	const complete = phase >= OPERATIONS.length - 1
	const progress = Math.round(((phase + 1) / OPERATIONS.length) * 100)
	const interviewed = Math.min(people.length, Math.max(0, phase - 2))
	const sourceRecords = scenario.sources.reduce((total, source) => total + Number(source.records.replace(/[^0-9]/g, "")), 0)
	const followUps = phase >= 4 ? 4 : phase >= 3 ? 2 : 0
	// The run keeps working between phase changes: a micro-action rotates under
	// "Now handling" and each rotation is one more verified action. Reduced
	// motion never starts the timer, so the surface stays a static, true count.
	const microActions = nowActions(scenario, phase, people)
	const [microTick, setMicroTick] = useState(0)
	const running = interviewClosed && !paused && !complete
	useEffect(() => { setMicroTick(0) }, [phase])
	useEffect(() => {
		if (!running || prefersInstantMotion()) return
		const timer = window.setInterval(() => setMicroTick((current) => current + 1), 2400)
		return () => window.clearInterval(timer)
	}, [running, phase])
	const microAction = microActions[microTick % microActions.length]
	const autonomousActions = (phase + 1) * 6 + interviewed * 3 + (decision !== "pending" ? 4 : 0) + microTick
	const autonomyStateLabel = {
		complete: "Handled",
		active: "Working",
		attention: "Needs authority",
		queued: "Queued",
	} as const
	const stateFor = (activeAt: number, completeAt: number) => phase >= completeAt ? "complete" : phase >= activeAt ? "active" : "queued"
	const workstreams = [
		{
			label: "Evidence",
			icon: <Database size={17} />,
			state: stateFor(1, 2),
			title: phase >= 2 ? `${sourceRecords.toLocaleString()} records screened` : "Reading governed sources",
			detail: `${scenario.sources.length} source scopes · provenance retained`,
		},
		{
			label: "Stakeholders",
			icon: <UsersThree size={17} />,
			state: stateFor(2, 5),
			title: `${people.length} conversations coordinated`,
			detail: `${interviewed} interviews · ${followUps} follow-ups${invitesSent ? " · delivery verified" : ""}`,
		},
		{
			label: "Conflicts",
			icon: <EnvelopeSimple size={17} />,
			state: decisionPending ? "attention" : stateFor(3, 5),
			title: phase >= 4 ? "Material tension isolated" : "Comparing stakeholder positions",
			detail: phase >= 4 ? "Evidence reconciled before owner escalation" : "Contradictions are being tested against source evidence",
		},
		{
			label: "Risks and authority",
			icon: <ShieldCheck size={17} />,
			state: decisionPending ? "attention" : stateFor(4, 6),
			title: decisionPending ? "One exact decision routed" : phase >= 6 ? "Risks have accountable owners" : "Classifying exposure and decision rights",
			detail: decisionPending ? "All unaffected work continues" : "Only material exceptions interrupt the owner",
		},
	] as const
	const mappedPeople = people.length ? people : scenario.people
	const coordinationThreads = [
		{
			people: [mappedPeople[0], mappedPeople[1]].filter(Boolean),
			title: `${scenario.inquiries[0]} versus ${scenario.inquiries[1]}`,
			detail: `MAX compared the positions from ${mappedPeople[0]?.name ?? "the business owner"} and ${mappedPeople[1]?.name ?? "the control owner"}, checked the governing evidence, and sent two focused follow-ups instead of forwarding the disagreement to you.`,
			meta: phase >= 4 ? "4 exchanges · common position established" : "Follow-ups in progress",
			state: phase >= 4 ? "resolved" : phase >= 3 ? "active" : "queued",
		},
		{
			people: [mappedPeople[2], mappedPeople[3]].filter(Boolean),
			title: `${scenario.inquiries[2]} versus ${scenario.inquiries[4]}`,
			detail: `MAX challenged the initial assumptions, returned cited evidence to both stakeholders, and converted the remaining uncertainty into an owned risk with a response deadline.`,
			meta: phase >= 5 ? "3 exchanges · risk owner confirmed" : "Evidence comparison underway",
			state: phase >= 5 ? "resolved" : phase >= 3 ? "active" : "queued",
		},
		{
			people: [],
			title: "Owner authority boundary",
			detail: `${scenario.exception.title}. MAX kept every unaffected inquiry moving and prepared only the evidence needed for the bounded decision.`,
			meta: decisionPending ? "Waiting on one owner decision" : phase > 4 ? "Decision recorded · work resumed" : "Monitoring for material exceptions",
			state: decisionPending ? "attention" : phase > 4 ? "resolved" : "queued",
		},
	] as const
	const ledger = [
		{ phase: 0, title: "Mission and authority established", detail: "Converted the brief into an objective, completion condition, source scope, and interruption boundary." },
		{ phase: 1, title: "Source access verified", detail: `Bound ${scenario.sources.length} permitted systems and retained record-level provenance.` },
		{ phase: 2, title: "Stakeholder program launched", detail: `Mapped ${people.length} accountable roles and tailored each interview to a different evidence gap.` },
		{ phase: 3, title: "Interviews adapted in flight", detail: "Skipped questions already answered by records and sent targeted follow-ups where positions diverged." },
		{ phase: 4, title: "Conflict detected and contained", detail: "Reconciled the evidence, isolated the material exception, and kept unaffected work running." },
		{ phase: 5, title: "Risk and readiness snapshot frozen", detail: "Bound claims, unresolved tensions, decisions, and accountable owners into one canonical snapshot." },
		{ phase: 6, title: "Decision package generated", detail: `Built ${DELIVERABLES.length} linked deliverables from the verified manifest.` },
		{ phase: 7, title: "Approvals and handoff routed", detail: "Sent the right artifact and decision scope to each approved recipient." },
	].filter((event) => event.phase <= phase).slice(-5).reverse()

	return (
		<div className="overview-workspace">
			<section className={decisionPending ? "overview-main is-gated" : "overview-main"} aria-label="Autonomy overview" tabIndex={0}>
				<header className="autonomy-hero">
					<div>
						<p className="eyebrow"><span className={complete ? "autonomy-live-dot complete" : paused ? "autonomy-live-dot paused" : "autonomy-live-dot"} />Autonomy run</p>
						<h1>{complete ? "MAX ran the Discovery." : interviewClosed ? "MAX is running the Discovery." : "MAX is forming the mission with you."}</h1>
						<p>{missionBrief || scenario.objective}</p>
					</div>
					<div className="autonomy-progress-summary" role="progressbar" aria-label="Autonomous Discovery progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><strong>{progress}%</strong><span>{phase >= 7 ? "Complete" : paused ? "Paused" : "Working"}</span><div><motion.span animate={{ width: `${progress}%` }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} /></div></div>
				</header>

				<section className="autonomy-value-strip" aria-label="Work handled by MAX">
					<div><strong><AnimatedStat value={autonomousActions} /></strong><span>Verified actions</span><small>completed without prompting</small></div>
					<div><strong><AnimatedStat value={phase >= 2 ? sourceRecords : null} /></strong><span>Records screened</span><small>across {scenario.sources.length} governed sources</small></div>
					<div><strong><AnimatedStat value={interviewed} /> + <AnimatedStat value={followUps} /></strong><span>Interviews + follow-ups</span><small>{people.length} stakeholder threads managed</small></div>
					<div><strong>{decisionPending ? "1" : "0"}</strong><span>Owner interruptions</span><small>unaffected branches kept moving</small></div>
				</section>

				<div className={`overview-priority-grid${decisionPending ? " has-decision" : ""}`}>
					<section className="overview-current autonomy-current" aria-labelledby="current-operation" aria-live="polite">
						<div className="operation-heading">
							<div>
								<p className="eyebrow">Now handling</p>
								<h2 id="current-operation">{paused ? "Work paused" : phase >= 7 ? "Package complete" : OPERATIONS[phase].label}</h2>
								<p>{paused ? "No new actions will start until you resume." : OPERATIONS[phase].detail}</p>
							</div>
							<span className={paused ? "autonomy-state paused" : phase >= 7 ? "autonomy-state complete" : "autonomy-state working"}>{paused ? "Paused" : phase >= 7 ? "Verified" : "Running"}</span>
						</div>
						{/* Ambient, not announced — the section is already a live region and the
						    ledger below carries the durable record of the same work. */}
						{running ? <p className="dsc-now-line" aria-hidden="true"><span className="dsc-now-dot" /><span key={microAction} className="dsc-now-text">{microAction}</span></p> : null}
						<div className="work-trace compact-trace">
							<button type="button" onClick={onToggleTrace} aria-expanded={traceOpen}>
								<span className="trace-active-dot" />
								<strong>{paused ? "Checkpoint preserved" : phase >= 7 ? "All work verified" : "Inspect the current work trace"}</strong>
								<span>{phase + 1} stages</span>
								<CaretDown size={14} className={traceOpen ? "rotated" : ""} />
							</button>
							<AnimatePresence initial={false}>
								{traceOpen ? (
									<motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
										{OPERATIONS.slice(0, phase + 1).slice(-3).map((operation, index, visible) => (
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
							<div><p className="eyebrow">Human authority</p><h2>{decisionPending ? "1 decision needs you" : "Nothing right now"}</h2></div>
							{decisionPending ? <span className="attention-count">1</span> : <CheckCircle size={20} weight="fill" />}
						</div>
						{decisionPending ? (
							<DecisionBoundary scenarioKey={scenarioKey} compact onResolve={onResolveDecision} />
						) : <p className="attention-clear-copy">MAX is continuing inside the authority you granted. Stakeholder follow-ups, source checks, and routine conflict resolution do not need your attention.</p>}
					</section>
				</div>

				<section className="autonomy-workstreams" aria-labelledby="autonomy-workstreams-heading">
					<div className="section-heading-row compact">
						<div><p className="eyebrow">Autonomous workstreams</p><h2 id="autonomy-workstreams-heading">What MAX is handling for you</h2></div>
						<span>{workstreams.filter((item) => item.state === "complete").length} handled · {workstreams.filter((item) => item.state === "active" || item.state === "attention").length} active</span>
					</div>
					<div className="autonomy-workstream-grid">
						{workstreams.map((item) => <article key={item.label} className={`is-${item.state}`}><header><span>{item.icon}</span><div><small>{item.label}</small><i>{autonomyStateLabel[item.state]}</i></div><strong>{item.title}</strong></header><p>{item.detail}</p></article>)}
					</div>
				</section>

				<div className="autonomy-detail-grid">
					<section className="autonomy-coordination" aria-labelledby="stakeholder-coordination-heading">
						<div className="section-heading-row compact"><div><p className="eyebrow">Stakeholder coordination</p><h2 id="stakeholder-coordination-heading">Conversations MAX is managing</h2></div><span>{interviewed + followUps} exchanges handled</span></div>
						<div tabIndex={0}>
							{coordinationThreads.map((thread) => <article key={thread.title} className={`is-${thread.state}`}><header><span className="autonomy-avatar-stack">{thread.people.map((person) => <i key={person.id} title={person.name}>{person.initials}</i>)}</span><strong>{thread.title}</strong><em>{thread.state === "resolved" ? "Resolved" : thread.state === "attention" ? "Owner decision" : thread.state === "active" ? "Working" : "Queued"}</em></header><p>{thread.detail}</p><footer><EnvelopeSimple size={13} /><span>{thread.meta}</span></footer></article>)}
						</div>
					</section>

					<section className="autonomy-ledger" aria-labelledby="autonomy-ledger-heading">
						<div className="section-heading-row compact"><div><p className="eyebrow">Autonomy ledger</p><h2 id="autonomy-ledger-heading">What MAX did and why</h2></div><button className="text-button" type="button" onClick={onOpenThread}>Owner thread <ArrowRight size={14} /></button></div>
						<ol tabIndex={0}>{ledger.map((event) => {
							const moment = ledgerMoment(startedAt, OPERATION_ELAPSED_MINUTES[event.phase] ?? 0)
							return <li key={event.title} className={event.phase === phase && !complete ? "is-current" : "is-complete"}><span>{event.phase === phase && !complete ? <CircleNotch size={13} className={paused ? "" : "spin"} /> : <Check size={12} weight="bold" />}</span><div><strong>{event.title}</strong><p>{event.detail}</p></div><time dateTime={moment.toISOString()}>{moment.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></li>
						})}</ol>
					</section>
					</div>
			</section>

			<aside className="overview-inspector" aria-label="Discovery details">
				<div><p className="eyebrow">Supervision</p><h2>Discovery controls</h2></div>
				<section className="overview-list">
					<OverviewRow icon={<UsersThree size={17} />} label="People" detail={`${people.length} mapped · ${interviewed} complete`} onClick={() => onOpenDrawer("people")} />
					<OverviewRow icon={<Database size={17} />} label="Sources" detail={`${scenario.sources.length} connected · read automatically`} onClick={() => onOpenDrawer("sources")} />
					<OverviewRow icon={<Package size={17} />} label="Package" detail={phase >= 7 ? "5 deliverables ready" : "Plan refining with evidence"} onClick={() => onOpenDrawer("package")} />
				</section>

				<section className="autonomy-supervision-facts"><span>Intervention policy</span><dl><div><dt>Routine actions</dt><dd>Automatic</dd></div><div><dt>Material exceptions</dt><dd>{decisionPending ? "1 waiting" : "None"}</dd></div><div><dt>Blocked branches</dt><dd>0</dd></div><div><dt>Next owner update</dt><dd>{phase >= 7 ? "Delivered" : "At readiness"}</dd></div></dl></section>
				<section className="authority-summary">
					<div><ShieldCheck size={17} weight="fill" /><strong>Authority envelope</strong></div>
					<p>Internal outreach · approved source scopes · two follow-ups per stakeholder · $45 model budget</p>
					<span className="authority-summary-note">Material exceptions come back to you as bounded decisions</span>
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
	pendingReply,
	commandText,
	composerFocusTick,
	onCommandTextChange,
	onSend,
	onVoiceSubmit,
	onResolveDecision,
	onJumpToDecision,
	onOpenPeople,
	onOpenSources,
	onOpenPackage,
	onOpenAutonomy,
}: {
	scenarioKey: ScenarioKey
	missionBrief: string
	phase: number
	people: Person[]
	decision: DecisionState
	interviewIndex: number
	interviewClosed: boolean
	messages: ChatMessage[]
	pendingReply: string | null
	commandText: string
	composerFocusTick: number
	onCommandTextChange: (value: string) => void
	onSend: (event: FormEvent) => void
	onVoiceSubmit: (text: string) => void
	onResolveDecision: (decision: Exclude<DecisionState, "pending">) => void
	onJumpToDecision: () => void
	onOpenPeople: () => void
	onOpenSources: () => void
	onOpenPackage: () => void
	onOpenAutonomy: () => void
}) {
	const scenario = SCENARIOS[scenarioKey]
	const decisionPending = phase === 4 && decision === "pending"
	const packageReady = phase >= 7
	const interviewing = !interviewClosed
	const sourceRecords = scenario.sources.reduce((total, source) => total + Number(source.records.replace(/[^0-9]/g, "")), 0)
	const stakeholderInterviews = Math.min(people.length, Math.max(0, phase - 2))
	const autonomousActions = (phase + 1) * 6 + stakeholderInterviews * 3 + (decision !== "pending" ? 4 : 0)
	const currentInterviewPrompt = scenario.ownerInterview[Math.min(interviewIndex, scenario.ownerInterview.length - 1)]
	const scrollRef = useRef<HTMLDivElement>(null)
	const voiceButtonRef = useRef<HTMLButtonElement>(null)
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const mountScrolledRef = useRef(false)
	const [voiceOpen, setVoiceOpen] = useState(false)
	const [decisionInView, setDecisionInView] = useState(true)
	const lastMaxMessage = messages.slice().reverse().find((message) => message.actor === "max")
	// Exactly one caret can be live at a time: any MAX message that is no longer
	// the newest finalizes instantly instead of racing the reply beneath it.
	const streamingMessageId = pendingReply ? null : lastMaxMessage?.id ?? null
	const mentionTargets = useMemo(() => buildMentionTargets(scenarioKey, people), [scenarioKey, people])
	const jumpFromMention = useCallback((target: MentionTarget) => {
		if (target === "people") onOpenPeople()
		else if (target === "sources") onOpenSources()
		else onOpenPackage()
	}, [onOpenPeople, onOpenSources, onOpenPackage])
	const markStreamed = useCallback((id: string) => { STREAMED_MESSAGE_IDS.add(id) }, [])
	const followStream = useCallback(() => {
		const log = scrollRef.current
		if (!log) return
		if (log.scrollHeight - log.scrollTop - log.clientHeight < 180) log.scrollTo({ top: log.scrollHeight })
	}, [])
	useEffect(() => {
		const log = scrollRef.current
		if (!log) return
		if (!mountScrolledRef.current) {
			// On mount — including resume — land instantly, and land ON the
			// decision when one is waiting instead of past it.
			mountScrolledRef.current = true
			const card = log.querySelector<HTMLElement>(".decision-event")
			if (card && decisionPending) {
				const top = card.getBoundingClientRect().top - log.getBoundingClientRect().top + log.scrollTop - Math.max(0, (log.clientHeight - card.clientHeight) / 2)
				log.scrollTo({ top: Math.max(0, top), behavior: "auto" })
				return
			}
			log.scrollTo({ top: log.scrollHeight, behavior: "auto" })
			return
		}
		// While a decision is waiting, later updates must not steal the scroll
		// away from the gate — the jump chip handles wayfinding instead.
		if (decisionPending) return
		log.scrollTo({ top: log.scrollHeight, behavior: prefersInstantMotion() ? "auto" : "smooth" })
	}, [messages, pendingReply, phase, decisionPending])
	useEffect(() => {
		if (!decisionPending) { setDecisionInView(true); return }
		if (typeof IntersectionObserver === "undefined") return
		const log = scrollRef.current
		const card = log?.querySelector(".decision-event")
		if (!log || !card) return
		const observer = new IntersectionObserver(([entry]) => setDecisionInView(entry.isIntersecting), { root: log, threshold: 0.25 })
		observer.observe(card)
		return () => observer.disconnect()
	}, [decisionPending])
	useEffect(() => {
		// Autofocus only when the Discovery stage is actually visible — the
		// portal keeps hidden module stages mounted.
		const composer = composerRef.current
		if (!composer?.offsetParent) return
		composer.focus({ preventScroll: true })
	}, [composerFocusTick])

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
							{message.actor === "max" ? <img src={publicAsset("maxion-logo-gradient.svg")} alt="" /> : null}
							{message.actor === "max" ? (
								<MaxMessageBody message={message} fresh={STREAMABLE_MESSAGE_IDS.has(message.id) && !STREAMED_MESSAGE_IDS.has(message.id)} finalize={message.id !== streamingMessageId} onSettle={markStreamed} targets={mentionTargets} onJump={jumpFromMention} onGrow={followStream} />
							) : (
								<div className="message-body">
									<p>{message.text}</p>
								</div>
							)}
						</div>
					))}
					{pendingReply ? (
						<div className="dsc-thinking-row" role="status">
							<img src={publicAsset("maxion-logo-gradient.svg")} alt="" />
							<span className="dsc-thinking-dots" aria-hidden="true"><i /><i /><i /></span>
							<p>{pendingReply}</p>
						</div>
					) : null}
					{!interviewing ? (
						<section className="thread-event autonomy-thread-digest" aria-label="Autonomous work summary">
							<header><span><i />Autonomy live</span><button type="button" onClick={onOpenAutonomy}>Open autonomy <ArrowRight size={13} /></button></header>
							<h2>MAX is handling the Discovery in parallel.</h2>
							<p>Source checks, stakeholder interviews, follow-ups, conflict resolution, risk ownership, and approval preparation stay visible while they run.</p>
							<div className="autonomy-thread-metrics"><span><strong><AnimatedStat value={autonomousActions} /></strong> verified actions</span><span><strong><AnimatedStat value={phase >= 2 ? sourceRecords : null} /></strong> records screened</span><span><strong><AnimatedStat value={stakeholderInterviews} /></strong> interviews managed</span><span><strong>{decisionPending ? "1" : "0"}</strong> owner interruptions</span></div>
							<footer><span className="work-status-pulse" /><div><strong>{phase >= 7 ? "Autonomous run complete" : OPERATIONS[phase].label}</strong><small>{decisionPending ? "One bounded decision is waiting; every unaffected branch is still moving." : OPERATIONS[phase].detail}</small></div></footer>
						</section>
					) : null}
					{decisionPending ? (
						<section className="thread-event decision-event" aria-labelledby="thread-decision-title">
							<div className="thread-event-kicker"><span /> Decision needed to continue one branch</div>
							<DecisionBoundary scenarioKey={scenarioKey} headingId="thread-decision-title" onResolve={onResolveDecision} />
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
					{decisionPending && !decisionInView ? (
						<button type="button" className="decision-jump-chip" onClick={onJumpToDecision}>
							<ShieldCheck size={14} weight="fill" /> 1 decision needs you <span>Jump <ArrowRight size={12} weight="bold" /></span>
						</button>
					) : null}
				</div>
				<form className="command-composer" onSubmit={onSend}>
					<textarea
						ref={composerRef}
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
				question={lastMaxMessage?.prompt ?? lastMaxMessage?.text ?? currentInterviewPrompt.question}
				topicLabel={lastMaxMessage?.question ? `${lastMaxMessage.question.topic} · ${lastMaxMessage.question.current} of ${lastMaxMessage.question.total}` : null}
				interviewing={interviewing}
				questionNumber={interviewIndex + 1}
				questionTotal={scenario.ownerInterview.length}
			/>
		</div>
	)
}

function MaxMessageBody({
	message,
	fresh,
	finalize,
	onSettle,
	targets,
	onJump,
	onGrow,
}: {
	message: ChatMessage
	fresh: boolean
	finalize: boolean
	onSettle: (id: string) => void
	targets: Map<string, MentionTarget>
	onJump: (target: MentionTarget) => void
	onGrow: () => void
}) {
	// Capture freshness once — the message must stream exactly once, and a
	// parent re-render mid-stream must not snap it to the full text.
	const freshRef = useRef(fresh)
	useEffect(() => { onSettle(message.id) }, [message.id, onSettle])
	const streamed = useStreamedText(message.text, freshRef.current, finalize)
	const done = streamed === message.text
	useEffect(() => { if (!done) onGrow() }, [streamed, done, onGrow])
	return (
		<div className="message-body">
			<span className="message-author">MAX</span>
			{message.question ? <span className="interview-question-label">{message.question.topic} · {message.question.current} of {message.question.total}</span> : null}
			<p>{done ? linkifyMentions(message.text, targets, onJump) : <>{streamed}<i className="stream-caret" aria-hidden="true" /></>}</p>
			{message.trace && done ? <MessageTrace steps={message.trace} /> : null}
		</div>
	)
}

function VoiceInterview({
	open,
	onClose,
	onSubmit,
	messages,
	question,
	topicLabel,
	interviewing,
	questionNumber,
	questionTotal,
}: {
	open: boolean
	onClose: () => void
	onSubmit: (text: string) => void
	messages: ChatMessage[]
	question: string
	topicLabel: string | null
	interviewing: boolean
	questionNumber: number
	questionTotal: number
}) {
	const [state, setState] = useState<VoiceState>("consent")
	const [transcript, setTranscript] = useState("")
	const [notice, setNotice] = useState("")
	const [awaitingFromCount, setAwaitingFromCount] = useState<number | null>(null)
	// The opening utterance keeps the surface on "Ready when you are" — the label
	// stays true (you may answer at any moment) while MAX reads the question.
	const [introSpeaking, setIntroSpeaking] = useState(false)
	const [spokenChars, setSpokenChars] = useState(0)
	const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
	const transcriptRef = useRef<HTMLTextAreaElement>(null)
	const introTimerRef = useRef(0)

	const endIntroSpeech = useCallback(() => {
		window.clearTimeout(introTimerRef.current)
		setIntroSpeaking(false)
		setSpokenChars(0)
	}, [])

	const stopAudio = () => {
		recognitionRef.current?.abort()
		recognitionRef.current = null
		window.speechSynthesis?.cancel()
		endIntroSpeech()
	}

	const speakQuestion = (text: string) => {
		if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return
		try {
			window.speechSynthesis.cancel()
			const utterance = new SpeechSynthesisUtterance(text)
			utterance.rate = 0.96
			utterance.pitch = 0.98
			utterance.onboundary = (event) => setSpokenChars(event.charIndex + (event.charLength || 0))
			utterance.onend = endIntroSpeech
			utterance.onerror = endIntroSpeech
			setSpokenChars(0)
			setIntroSpeaking(true)
			window.speechSynthesis.speak(utterance)
			// Some voices never fire onend; the waveform must not run forever.
			window.clearTimeout(introTimerRef.current)
			introTimerRef.current = window.setTimeout(endIntroSpeech, 14_000)
		} catch {
			endIntroSpeech()
		}
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
		window.speechSynthesis?.cancel()
		endIntroSpeech()
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
		endIntroSpeech()
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
						<div className="voice-mark"><img src={publicAsset("maxion-logo-gradient.svg")} alt="" /></div>
						<p className="voice-state-label">Before we begin</p>
						<h3>Continue this interview by voice</h3>
						<p>Your speech is transcribed into the same owner thread. This prototype uses your browser’s voice services and does not retain the original audio.</p>
						<div className="voice-consent-details">
							<span><Check size={14} /> Transcript stays visible in the thread</span>
							<span><Check size={14} /> You can switch back to typing at any time</span>
						</div>
						<button className="primary-button voice-consent-button" type="button" onClick={() => { setState("ready"); speakQuestion(question) }}><Microphone size={17} /> Continue with voice</button>
					</div>
				) : (
					<>
						<div className="voice-stage">
							<div className={`voice-mark ${state === "listening" || state === "speaking" || introSpeaking ? "active" : ""}`}><img src={publicAsset("maxion-logo-gradient.svg")} alt="" /></div>
							<div className={`voice-waveform ${introSpeaking && state === "ready" ? "speaking" : state}`} aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <span key={index} style={{ animationDelay: `${index * 38}ms` }} />)}</div>
							<p className="voice-state-label" aria-live="polite">{voiceStatus}</p>
							{topicLabel ? <span className="voice-question-topic">{topicLabel}</span> : null}
							<p className="voice-question">{introSpeaking && spokenChars > 0 ? spokenSegments(question, spokenChars).map((segment, index) => <span key={index} className={segment.spoken ? "is-spoken" : undefined}>{segment.text}</span>) : question}</p>
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

// Splits the question so the words MAX has already said can be highlighted as
// it reads. Browsers without utterance boundary events simply never highlight.
function spokenSegments(text: string, upTo: number) {
	let offset = 0
	return text.split(/(\s+)/).map((part) => {
		const start = offset
		offset += part.length
		return { text: part, spoken: start < upTo }
	})
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
	const ready = phase >= 7
	const generating = phase >= 6
	const bodies = DELIVERABLE_CONTENT[scenarioKey]
	const body = bodies[Math.min(Math.max(selected, 0), bodies.length - 1)]
	// Deliverables materialize one at a time across the synthesis window instead
	// of appearing in a single jump. Reduced motion lands the whole set at once.
	const [materialized, setMaterialized] = useState(() => prefersInstantMotion() ? DELIVERABLES.length : 1)
	useEffect(() => {
		if (!generating || ready || prefersInstantMotion() || materialized >= DELIVERABLES.length) return
		const timer = window.setTimeout(() => setMaterialized((current) => current + 1), 260)
		return () => window.clearTimeout(timer)
	}, [generating, ready, materialized])
	return (
		<div className="deliverables-view">
			<header className="deliverables-header">
				<div><p className="eyebrow">Decision package</p><div className="deliverables-title"><h1>{ready ? "Final plan and recommendations" : "Package in preparation"}</h1><span className={ready ? "ready" : "working"}>{ready ? <CheckCircle size={15} weight="fill" /> : <CircleNotch size={15} className="spin" />}{ready ? "Ready" : generating ? "Generating" : "Waiting for readiness"}</span></div><p>{ready ? "Generated automatically from readiness snapshot v7 and manifest v4." : "The package plan is already established. Outputs will fill in place when evidence is ready."}</p></div>
				<div className="header-actions"><button className="quiet-button" type="button" onClick={onManage}><GearSix size={16} /> Manage package</button><button className="primary-button" type="button" disabled={!ready}><DownloadSimple size={17} /> Export all</button></div>
			</header>

			<div className="deliverables-layout">
				<nav className="deliverable-list" aria-label="Deliverable list">
					{DELIVERABLES.map((deliverable, index) => {
						const itemReady = ready || generating && index < materialized
						return <button key={deliverable.name} type="button" className={selected === index ? "selected" : ""} onClick={() => onSelect(index)}><span className={itemReady ? "document-status ready" : "document-status"}>{itemReady ? <Check size={11} weight="bold" /> : index + 1}</span><div><strong>{deliverable.name}</strong><p>{itemReady ? "Current · evidence bound" : generating ? "Queued" : "Waiting for interviews"}</p></div><CaretRight size={14} /></button>
					})}
				</nav>

				<section className="deliverable-reader">
					<div className="reader-heading"><div><p className="eyebrow">{DELIVERABLES[selected].audience}</p><h2>{DELIVERABLES[selected].name}</h2></div>{ready ? <span className="reader-verified-tag"><CheckCircle size={14} weight="fill" /> Evidence bound</span> : null}</div>
					{ready ? (
						<div className="reader-content" key={selected}>
							<h3>{body.heading}</h3>
							<p>{body.lede}</p>
							{body.sections.map((section) => <section className="reader-section" key={section.heading}><h4>{section.heading}</h4><p>{section.body}</p></section>)}
							{body.findings.map((finding, index) => <div className="key-finding" key={finding.label}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{finding.label}</strong><p>{finding.detail}</p></div></div>)}
							<div className="citation-row">{body.citations.map((citation) => <span key={citation}>{citation}</span>)}</div>
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
	const panelRef = useRef<HTMLElement | null>(null)
	const title = type === "people" ? "Stakeholder program" : type === "sources" ? "Connected sources" : "Deliverable manifest"

	// The drawer is a modal dialog: it takes initial focus and keeps Tab inside.
	useEffect(() => {
		const panel = panelRef.current
		if (!panel) return
		const first = panel.querySelector<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")
		;(first ?? panel).focus({ preventScroll: true })
	}, [])

	const trapTab = (event: React.KeyboardEvent) => {
		if (event.key !== "Tab") return
		const panel = panelRef.current
		if (!panel) return
		const focusable = Array.from(panel.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")).filter((element) => element.offsetParent !== null)
		if (!focusable.length) return
		const first = focusable[0]
		const last = focusable[focusable.length - 1]
		if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
			event.preventDefault()
			last.focus()
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault()
			first.focus()
		}
	}

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
			<motion.aside ref={panelRef} className="drawer" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={trapTab} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
				<header><div><p className="eyebrow">Discovery setup</p><h2>{title}</h2></div><IconButton label="Close panel" onClick={onClose}><X size={18} /></IconButton></header>
				{type === "people" ? (
					<div className="drawer-content people-drawer" tabIndex={0}>
						<div className="drawer-intro"><p>MAX identified these roles from the mission and source gaps. Interview focus and channel remain editable.</p><button className="quiet-button" type="button" onClick={() => setAdding((current) => !current)}><Plus size={16} /> Add stakeholder</button></div>
						<AnimatePresence initial={false}>{adding ? <motion.form className="add-person-form" onSubmit={submitPerson} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}><label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label><span>Role</span><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required /></label><label><span>Department</span><input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label><label><span>Influence</span><select value={form.influence} onChange={(event) => setForm({ ...form, influence: event.target.value })}><option>High</option><option>Medium</option></select></label><label className="full"><span>Interview focus</span><textarea value={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.value })} /></label><div className="form-actions"><button className="quiet-button" type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary-button" type="submit">Add to program</button></div></motion.form> : null}</AnimatePresence>
						<div className="person-list">{people.map((person) => <div className="person-row" key={person.id}><div className="person-avatar">{person.initials}</div><div className="person-main"><strong>{person.name}</strong><p>{person.role} · {person.department}</p><span>{person.email}</span><div className="person-focus"><em>Interview focus</em>{person.focus}</div></div><div className="person-meta"><span>{person.influence} influence</span><strong>{person.channel}</strong></div></div>)}</div>
					</div>
				) : type === "sources" ? (
					<div className="drawer-content" tabIndex={0}><div className="drawer-intro"><p>Available integrations are bound automatically when the mission is created. MAX reads only the scopes shown below.</p><span className="verified-label"><CheckCircle size={15} weight="fill" /> All healthy</span></div><div className="source-drawer-list">{scenario.sources.map((source) => <div key={source.name}><span className="source-icon"><Database size={18} /></span><div><strong>{source.name}</strong><p>{source.system} · {source.scope}</p><span>{source.records} · indexed incrementally</span></div><span className="scope-fact"><CheckCircle size={14} weight="fill" /> Scope verified</span></div>)}</div></div>
				) : (
					<div className="drawer-content" tabIndex={0}><div className="drawer-intro"><p>The manifest is internal operating state, not another artifact to generate. It refines with evidence and freezes at readiness.</p><span className="verified-label"><CheckCircle size={15} weight="fill" /> Auto-managed</span></div><div className="manifest-list">{DELIVERABLES.map((deliverable) => <label key={deliverable.name}><input type="checkbox" defaultChecked /><span><strong>{deliverable.name}</strong><p>{deliverable.audience} · {deliverable.rationale}</p></span></label>)}</div><div className="manifest-policy"><ShieldCheck size={18} weight="fill" /><div><strong>Material changes interrupt</strong><p>Removing a required output, expanding external distribution, or replacing an approved artifact creates an exception. Routine refinements apply automatically.</p></div></div></div>
				)}
			</motion.aside>
		</>
	)
}

function Brand() {
	return <div className="brand"><img src={publicAsset("maxion-logo-gradient.svg")} alt="" /><strong>MAXION</strong><span>Discovery</span></div>
}

function IconButton({ label, active = false, onClick, children }: { label: string; active?: boolean; onClick?: () => void; children: React.ReactNode }) {
	return <button className={active ? "icon-button active" : "icon-button"} type="button" aria-label={label} title={label} onClick={onClick}>{children}</button>
}
