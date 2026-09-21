import React, { FormEvent, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ArrowUpRight,
	ArrowsSplit,
	CaretDown,
	CaretLeft,
	CaretRight,
	ChatCircleText,
	ChatsCircle,
	Check,
	CheckCircle,
	Circle,
	CircleNotch,
	Database,
	DotsThree,
	DownloadSimple,
	EnvelopeSimple,
	Flag,
	FlowArrow,
	GearSix,
	Globe,
	Info,
	Keyboard,
	MagnifyingGlass,
	Microphone,
	MicrophoneSlash,
	Package,
	Pause,
	PauseCircle,
	Play,
	Plus,
	Rows,
	SealCheck,
	ShieldCheck,
	SidebarSimple,
	SlidersHorizontal,
	SpeakerHigh,
	SpeakerSlash,
	SquaresFour,
	Target,
	UsersThree,
	Warning,
	Waveform,
	X,
} from "@phosphor-icons/react"

import { publicAsset } from "@/lib/publicAsset"
import { DEMO_FILL_EVENT, DEMO_OWNER_EVENT, DEMO_SAVE_EVENT, demoSession, moduleStorage, notifyDemoChange, resetDemoAgentix, storageKey } from "@/features/demo/session"
import { DEMO_SCRIPTS, demoScript, type DemoScript } from "@/features/demo/scripts"
import { CyclingPlaceholder, GeneratedWords, MovingBorder, Orb, ShimmerText, StepLoader, riseIn, useRiseIn, useSheetMotion, useWordStream } from "@/components/motion/MotionKit"
import {
	Badge as DsBadge,
	Button as DsButton,
	Dialog,
	EmptyState as DsEmptyState,
	Mark,
	SearchInput as DsSearchInput,
	SegmentedTabs as DsSegmentedTabs,
	Table as DsTable,
	TableRow as DsTableRow,
} from "@/design/primitives"

import { DeliverableExhibit } from "./deliverables"
import {
	DELIVERABLES,
	OPERATIONS,
	OPERATION_ACTIVITY,
	OPERATION_ELAPSED_MINUTES,
	SCENARIOS,
	deliverableBodies,
	nowActions,
	scenarioForBrief,
	CHARTER_DELIVERABLE_INDEX,
	DELIVERABLE_CATEGORY,
	DELIVERABLE_CATEGORY_ORDER,
	JOURNEY_STAGES,
	PREPARATION_STEPS,
	currentJourneyStage,
	journeyComplete,
	journeyNextAction,
	journeyProgress,
	journeyStageStatus,
	type JourneyContext,
	type JourneyStageId,
	type JourneyStageStatus,
	type PreparationStepId,
	type PreparationStepStatus,
	type OwnerInterviewQuestion,
	type Person,
	type Scenario,
	type ScenarioKey,
	handoffDestination,
	type HandoffDestination,
} from "./model"
import "./deliverable-reader.css"
import "./cockpit.css"

type View = "thread" | "autonomy" | "workshop" | "package"
type Drawer = "setup" | "people" | "sources" | "package" | null
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
	onerror: ((event: { error: string }) => void) | null
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

type DiscoveryStatus = "needs-input" | "active" | "completed" | "handed-off"

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
	// Who has an interview invitation, so a second send reaches only people added since.
	invited?: string[]
	// Added with the charter gate and the Plan handoff; older saved records lack them.
	charterApproval?: CharterApproval | null
	handoff?: HandoffPacket | null
	// Set when the owner finalizes the workshop; older saved records lack it.
	workshopFinalized?: boolean
	// Manifest entries the owner switched off, by name; older saved records include all nine.
	excludedOutputs?: string[]
	// The decision and deadline the owner confirmed at Create. Records saved before
	// Create kept them (and the seeds) read the scenario's own.
	missionDecision?: string
	deadline?: string
	createdAt: string
	updatedAt: string
}

type CharterApproval = { reason: string; approvedAt: string }
type ToastNote = { id: number; text: string }
/*
 * A frozen Discovery package. Packets for Plan carry only their id, time and note;
 * a packet for Agentix also names the operating package it delivers and the
 * Discovery it came from, so Agentix can show where its proposal came from.
 */
/*
 * The frozen packet a Discovery hands over. It always goes to Agentix. `packageId` names a
 * prebuilt operating design when the scenario has one; without it the brief opens engagement
 * creation in Agentix instead, so every Discovery reaches the same place.
 */
export type HandoffPacket = { id: string; createdAt: string; note: string; target: "agentix"; packageId?: string; recordId?: string; title?: string; brief?: string }

const DISCOVERY_STORAGE_KEY = "maxion.prototype.discovery-records.v1"
// The completed seed was approved before the prototype recorded approvals.
const SEED_CHARTER_APPROVAL: CharterApproval = { reason: "Charter scope and owners confirmed in the committee pre-read.", approvedAt: "2026-09-14T16:20:00.000Z" }
const MAX_SAVED_DISCOVERIES = 50

function discoveryStatus(record: DiscoveryRecord): DiscoveryStatus {
	if (record.handoff) return "handed-off"
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
			view: "autonomy",
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
			view: "autonomy",
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

/*
 * The customer demo's hub: two finished-looking Discoveries for context and none
 * waiting on the presenter, so the revenue Discovery is the only thing that asks
 * for attention. Started from the package, the revenue Discovery is already done.
 */
/* The finished Discovery a demo started from its package opens on; one per demo. */
export const demoRecordId = (script: DemoScript) => `demo-${script.id}-discovery`

function createDemoDiscoveryRecords(): DiscoveryRecord[] {
	const demo = demoSession()
	const context = createSeedDiscoveryRecords().filter((record) => record.scenarioKey !== "tprm")
	return demo?.start === "package" ? [createFinishedDemoRecord(demoScript(demo.id)), ...context] : context
}

/*
 * The demo's own Discovery, already investigated, decided and written up, for the short demo that
 * starts at the package. It is built from the same script the presenter would have typed, so the
 * interview reads exactly as it would have if they had run the long demo.
 */
function createFinishedDemoRecord(script: DemoScript): DiscoveryRecord {
	const key = script.scenarioKey
	const scenario = SCENARIOS[key]
	const id = script.id
	const interview: ChatMessage[] = initialInterviewMessages(key, scenario.brief).map((message) => ({ ...message, id: `demo-${id}-q1` }))
	script.answers.forEach((answer, index) => {
		interview.push({ id: `demo-${id}-a${index + 1}`, actor: "user", text: answer })
		const topic = scenario.ownerInterview[index].topic.toLowerCase()
		if (index < scenario.ownerInterview.length - 1) {
			interview.push({ ...interviewMessage(key, index + 1, `I’m treating “${echoOwner(answer)}” as the working position on ${topic}.`), id: `demo-${id}-q${index + 2}` })
		}
	})
	const messages: ChatMessage[] = [
		...interview,
		{ id: `demo-${id}-closed`, actor: "max", text: `I’ve captured “${echoOwner(script.answers.at(-1) ?? "")}” as the owner position on success measure. That gives me enough owner context for this pass. I’ve closed the interview and started source verification and stakeholder coordination.`, trace: ["Saved the owner interview as a versioned context snapshot", "Replanned the inquiry map from the captured answers", "Started the autonomous work graph"] },
		{ id: `demo-${id}-decision`, actor: "max", text: scenario.exception.approvedConfirmation, trace: ["Recorded the exact bounded authority", "Opened only the approved action", "Verified the action and resumed the affected branch"] },
		{ id: `demo-${id}-complete`, actor: "max", text: `The Discovery is complete. I verified the evidence set, recorded the decisions, generated all ${DELIVERABLES.length} deliverables, and prepared the operating package for Agentix.`, trace: ["Froze readiness snapshot v7", "Generated manifest v4", "Verified package routing"] },
	]
	return {
		id: demoRecordId(script),
		title: scenario.title,
		brief: scenario.brief,
		scenarioKey: key,
		view: "package",
		phase: OPERATIONS.length - 1,
		paused: false,
		decision: "approved",
		people: scenario.people,
		messages,
		interviewIndex: scenario.ownerInterview.length - 1,
		interviewClosed: true,
		clarificationPending: false,
		packageSelection: 0,
		invitesSent: true,
		invited: scenario.people.map((person) => person.id),
		charterApproval: null,
		handoff: null,
		workshopFinalized: true,
		excludedOutputs: [],
		missionDecision: scenario.objective,
		deadline: scenario.deadline,
		createdAt: minutesAgo(52),
		updatedAt: minutesAgo(4),
	}
}

// The customer demo keeps its own records under its own key, seeded for the point it starts from.
const seedRecords = () => demoSession() ? createDemoDiscoveryRecords() : createSeedDiscoveryRecords()

function readDiscoveryRecords(): DiscoveryRecord[] {
	if (typeof window === "undefined") return createSeedDiscoveryRecords()
	try {
		const stored = moduleStorage()?.getItem(storageKey(DISCOVERY_STORAGE_KEY)) ?? null
		if (!stored) return seedRecords()
		const parsed: unknown = JSON.parse(stored)
		if (!Array.isArray(parsed)) return seedRecords()
		const records = parsed.filter((candidate): candidate is DiscoveryRecord => {
			if (!candidate || typeof candidate !== "object") return false
			const record = candidate as Partial<DiscoveryRecord>
			return typeof record.id === "string"
				&& typeof record.title === "string"
				&& typeof record.brief === "string"
				&& typeof record.scenarioKey === "string"
				&& Object.prototype.hasOwnProperty.call(SCENARIOS, record.scenarioKey)
				// "overview" is the pre-rename key for Autonomy; saved records still carry it.
				&& (record.view === "thread" || record.view === "autonomy" || (record.view as string) === "overview" || record.view === "workshop" || record.view === "package")
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
				&& (record.invited === undefined || Array.isArray(record.invited) && record.invited.every((id) => typeof id === "string"))
				&& (record.excludedOutputs === undefined || Array.isArray(record.excludedOutputs) && record.excludedOutputs.every((name) => typeof name === "string"))
				&& (record.missionDecision === undefined || typeof record.missionDecision === "string")
				&& (record.deadline === undefined || typeof record.deadline === "string")
				&& typeof record.createdAt === "string" && Number.isFinite(new Date(record.createdAt).getTime())
				&& typeof record.updatedAt === "string" && Number.isFinite(new Date(record.updatedAt).getTime())
		})
		// Autonomy used to be called "overview"; migrate saved records on read.
		const migrated = records.map(record => (record.view as string) === "overview" ? { ...record, view: "autonomy" as View } : record)
		return migrated.length ? migrated.slice(0, MAX_SAVED_DISCOVERIES) : seedRecords()
	} catch {
		return seedRecords()
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
// the last word boundary before appending the ellipsis. The sentence's own end
// mark goes, so a quote never closes as `.”.`
function conciseAnswer(text: string, limit = 120) {
	const sentence = firstSentence(text)
	if (sentence.length <= limit) return sentence
	const clipped = sentence.slice(0, limit - 3)
	const lastBreak = clipped.lastIndexOf(" ")
	const stem = (lastBreak > limit * 0.5 ? clipped.slice(0, lastBreak) : clipped).replace(/[\s,;:—-]+$/, "")
	return `${stem}…`
}

function firstSentence(text: string) {
	return text.trim().split(/[.!?]\s/)[0].replace(/\s+/g, " ").replace(/[.!?]+$/, "")
}

/*
 * A mission name is a short noun phrase, not the brief: the lead-in ("Decide
 * whether we can…") goes, the sentence stops at its first clause break, and
 * anything still too long is cut at a connector or a word, never mid-word and
 * never on a dangling "of" or "the".
 */
/* What MAX aims for when it drafts a name from a brief. */
const MISSION_NAME_TARGET = 50
/* What the field accepts. A template names its own mission, and some read longer than MAX would
 * draft; the field has to hold them, or its counter reads over its own limit on the first screen. */
const MISSION_NAME_LIMIT = 70
const TITLE_LEAD = /^(?:please\s+)?(?:help (?:us|me)\s+)?(?:decide|determine|assess|evaluate|confirm|work out|figure out|understand)\s+(?:whether|if|how)\s+(?:to\s+|(?:we|it|(?:our|the)(?:\s+[\w-]+){1,4})\s+(?:can|could|should|must|will)\s+)/i
const TITLE_CLAUSE = /\s+(?:so that|so|without|because|while|in order to|which|that will)\s+|\s*[,;:(—–]\s*|\s+-\s+/
const TITLE_CONNECTOR = /\s+(?:and|with|for|across|using|by|through|from|into|against|within)\s+/g
const TITLE_TAIL = /\s+(?:a|an|and|the|of|for|to|with|our|in|on|at|by|from|or|whether|can|should|how)$/i

// The operating-design template, used as written, keeps its mission name. Other templates keep the
// drafted name, so a new Discovery never takes the exact title of a saved one.
function namedMission(brief: string) {
	const text = brief.trim()
	return Object.values(SCENARIOS).find((scenario) => scenario.handoff && scenario.brief === text)?.title
}

function missionTitle(brief: string) {
	const sentence = firstSentence(brief)
	const lead = sentence.replace(TITLE_LEAD, "")
	let title = lead.split(TITLE_CLAUSE)[0]
	if (title.split(" ").length < 2) title = lead
	if (title.length > MISSION_NAME_TARGET) {
		const breaks = [...title.matchAll(TITLE_CONNECTOR)].map(match => match.index ?? 0).filter(index => index <= MISSION_NAME_TARGET && index >= MISSION_NAME_TARGET * 0.6)
		if (breaks.length) title = title.slice(0, breaks.at(-1))
	}
	if (title.length > MISSION_NAME_TARGET) {
		title = title.slice(0, MISSION_NAME_TARGET + 1).replace(/\s+\S*$/, "")
		while (TITLE_TAIL.test(title)) title = title.replace(TITLE_TAIL, "")
	}
	title = title.trim()
	return title ? `${title[0].toUpperCase()}${title.slice(1)}` : "New Discovery"
}

/*
 * The decision horizon the owner wrote, as the cockpit pill shows it: the forum
 * ("the November board") and the date ("due 28 Nov"), joined by a dot.
 */
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*"
const DEADLINE_DATE = new RegExp(`\\b(?:due|by|before|on|until)\\s+(?:the\\s+)?(\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}|${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?)\\b`, "i")
const DEADLINE_FORUM = /\b(?:at|for|to|before|by)\s+the\s+((?:[A-Za-z]+\s+){0,2}?(?:board|committee|council|review|meeting|forum|steering group|IC))\b/i

function draftDeadline(text: string) {
	const date = text.match(DEADLINE_DATE)?.[1]?.replace(/(\d)(?:st|nd|rd|th)/i, "$1")
	const forum = text.match(DEADLINE_FORUM)?.[1]
	const label = (value: string) => `${value[0].toUpperCase()}${value.slice(1)}`
	const shortDate = date?.replace(new RegExp(`(${MONTH})`, "i"), month => label(month.slice(0, 3).toLowerCase()))
	if (forum && shortDate) return `${label(forum)} · ${shortDate}`
	if (forum) return label(forum)
	return shortDate ? `Decision due · ${shortDate}` : ""
}

// The owner's clarifying answer, as a decision sentence without its date clause.
function draftDecision(answer: string) {
	const sentence = firstSentence(answer).replace(new RegExp(`[,;]?\\s*${DEADLINE_DATE.source}.*$`, "i"), "").trim()
	return sentence ? `${sentence[0].toUpperCase()}${sentence.slice(1)}.` : ""
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

/* The owner's words inside MAX's reply, quoted without their own closing
 * punctuation so the sentence never ends in `.”.` */
function echoOwner(text: string) {
	return conciseAnswer(text, 90).replace(/[.!?]+$/, "")
}

function isQuestionIntent(text: string) {
	return /\?\s*$/.test(text) || /^\s*(?:please\s+|can you\s+|could you\s+)?(?:what|who|why|how|when|where|which|summari[sz]e|explain|tell me|give me)\b/i.test(text)
}

function isCancelIntent(text: string) {
	return /^\s*(?:please\s+)?(?:cancel|never\s?mind|forget (?:it|that)|scrap that|stop adding|don(?:'|’)t add)/i.test(text)
}

const TEXT_PERSON_FIELDS = ["name", "role"] as const
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

function listPhrase(items: string[]) {
	return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
}

function formatPacketTime(timestamp: string) {
	const date = new Date(timestamp)
	if (!Number.isFinite(date.getTime())) return "just now"
	const sameDay = date.toDateString() === new Date().toDateString()
	return sameDay
		? `Today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
		: date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
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
const PHONE_ACTIONS_QUERY = "(max-width: 430px)"

function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches)
	useEffect(() => {
		if (typeof window.matchMedia !== "function") return
		const list = window.matchMedia(query)
		const update = () => setMatches(list.matches)
		update()
		list.addEventListener("change", update)
		return () => list.removeEventListener("change", update)
	}, [query])
	return matches
}

/* Scrolls `container` just enough to show `item` (or, along a row, centres it), on
 * whichever axis the container actually scrolls, leaving every outer scroller
 * alone. Honours scroll-padding. */
function revealWithin(container: HTMLElement | null, item: HTMLElement | null, inline: "nearest" | "center" = "nearest", behavior?: ScrollBehavior) {
	if (!container || !item) return
	const box = container.getBoundingClientRect()
	const rect = item.getBoundingClientRect()
	const style = getComputedStyle(container)
	const inset = (value: string) => Number.parseFloat(value) || 0
	const top = box.top + inset(style.scrollPaddingTop), bottom = box.bottom - inset(style.scrollPaddingBottom)
	const left = box.left + inset(style.scrollPaddingLeft), right = box.right - inset(style.scrollPaddingRight)
	const dy = container.scrollHeight > container.clientHeight ? rect.top < top ? rect.top - top : rect.bottom > bottom ? Math.min(rect.bottom - bottom, rect.top - top) : 0 : 0
	const outside = rect.left < left || rect.right > right
	const dx = container.scrollWidth <= container.clientWidth || !outside ? 0
		: inline === "center" ? rect.left + rect.width / 2 - (left + right) / 2
		: rect.left < left ? rect.left - left : Math.min(rect.right - right, rect.left - left)
	if (!dx && !dy) return
	container.scrollTo({ top: container.scrollTop + dy, left: container.scrollLeft + dx, behavior: behavior ?? (prefersInstantMotion() ? "auto" : "smooth") })
}

/* A modal from anywhere on the page (the charter dialog, a shell sheet) that is actually shown. */
function visibleModalOpen() {
	return Array.from(document.querySelectorAll<HTMLElement>("[aria-modal='true']")).some((node) => node.getClientRects().length > 0)
}

function prefersInstantMotion() {
	return typeof window === "undefined" || typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// Sentence-aware word cadence: MAX holds a beat at a full stop or a question
// mark the way a person does, instead of typing on a metronome. `finalize`
// lands the remaining words instantly so only one message can ever be streaming.
function useStreamedWordCount(text: string, active: boolean, finalize = false) {
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
			timer = window.setTimeout(step, /[.?!]["”’)]?$/.test(settled) ? 180 : 34)
			}
			timer = window.setTimeout(step, 34)
			return () => window.clearTimeout(timer)
			}, [text, active, finalize])
			return active ? count : Number.MAX_SAFE_INTEGER
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

/*
 * The cockpit's four tabs, in the real module's order and wording. Workshop only
 * appears once a workshop session exists; see docs/discovery-flow-reference.md.
 */
const viewMeta: Array<{ id: View; label: string; icon: React.ElementType }> = [
	{ id: "thread", label: "Thread", icon: ChatCircleText },
	{ id: "autonomy", label: "Autonomy", icon: Rows },
	{ id: "workshop", label: "Workshop", icon: UsersThree },
	{ id: "package", label: "Package", icon: Package },
]

/* MAX convenes the workshop once the inquiry program is running. */
export function hasWorkshopSession(phase: number) {
	return phase >= 3
}

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
function countWord(count: number) {
	return COUNT_WORDS[count] ?? String(count)
}

function joinPhrases(items: readonly string[]) {
	if (items.length <= 1) return items.join("")
	if (items.length === 2) return `${items[0]} and ${items[1]}`
	return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`
}

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
	"handed-off": "Handed off",
}

/* Where a record's packet went. Every packet goes to Agentix; Plan is no longer a destination. */
function packetDestination(record: Pick<DiscoveryRecord, "scenarioKey" | "handoff">): HandoffDestination {
	return handoffDestination(record.scenarioKey)
}

function statusLabelOf(record: DiscoveryRecord) {
	const status = discoveryStatus(record)
	return status === "handed-off" ? `Handed to ${packetDestination(record)}` : DISCOVERY_STATUS_LABEL[status]
}

// The hub's filters: a handed-off Discovery is a completed one whose packet Plan now holds.
function discoveryFilterGroup(status: DiscoveryStatus): Exclude<DiscoveryStatus, "handed-off"> {
	return status === "handed-off" ? "completed" : status
}

// Cross-module jump registry (shell ⌘K): saved discoveries live in localStorage, so the
// shell reads them on demand rather than mirroring record state into a prop.
export type DiscoveryJumpRecord = { id: string; title: string; status: DiscoveryStatus; statusLabel: string; keywords: string; updatedAt: string; handoffId?: string; handoff?: HandoffPacket }
export type DiscoveryJump = "resume" | "decision" | "package" | "autonomy"
export type DiscoveryOpenSignal = { tick: number; recordId: string; jump: DiscoveryJump }

// A handed-off record still has a package to open, so the registry files it with the
// completed ones; its label and handoffId say where the packet went.
export function listDiscoveryJumpRecords(): DiscoveryJumpRecord[] {
	return readDiscoveryRecords().map((record) => {
		const status = discoveryStatus(record)
		return { id: record.id, title: record.title, status: discoveryFilterGroup(status), statusLabel: statusLabelOf(record), keywords: `${record.brief} ${SCENARIOS[record.scenarioKey].kicker}`, updatedAt: record.updatedAt, ...(record.handoff ? { handoffId: record.handoff.id, handoff: record.handoff } : {}) }
	})
}

type DiscoveryPaletteAction =
	| { type: "view"; view: View }
	| { type: "record"; recordId: string }
	| { type: "new" }
	| { type: "templates" }
	| { type: "pause" }
	| { type: "decision" }
	| { type: "plan" }
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
	canOpenHandoff,
	destination = "Agentix",
}: {
	records: DiscoveryRecord[]
	screen: Screen
	phase: number
	paused: boolean
	needsDecision: boolean
	complete: boolean
	activeRecordId: string | null
	canOpenHandoff: boolean
	destination?: HandoffDestination
}): DiscoveryPaletteItem[] {
	const items: DiscoveryPaletteItem[] = []
	const inWorkspace = screen === "workspace"
	if (inWorkspace && needsDecision) items.push({ id: "jump-decision", group: "Decisions", label: "Jump to decision", hint: "One bounded decision is waiting for you", keywords: "decision approve authority exception boundary review", action: { type: "decision" } })
	// Each group appears once: views, then sheets, then actions, then saved discoveries.
	if (inWorkspace) {
		items.push({ id: "view-thread", group: "Go to", label: "Thread", hint: "Owner conversation with MAX", keywords: "chat conversation messages owner interview thread", action: { type: "view", view: "thread" } })
		items.push({ id: "view-autonomy", group: "Go to", label: "Autonomy", hint: "Live autonomous work, ledger, and coordination", keywords: "autonomy overview workstreams ledger progress supervision", action: { type: "view", view: "autonomy" } })
		items.push({ id: "view-package", group: "Go to", label: "Deliverables", hint: phase >= 6 ? "Review documents and routing" : "Preview the planned deliverables", keywords: "package deliverables outputs decision reader", action: { type: "view", view: "package" } })
		items.push({ id: "open-people", group: "Open", label: "People", hint: "Stakeholder program drawer", keywords: "people stakeholders roster interviews program", action: { type: "drawer", drawer: "people" } })
		items.push({ id: "open-sources", group: "Open", label: "Sources", hint: "Connected evidence drawer", keywords: "sources evidence systems connected scopes", action: { type: "drawer", drawer: "sources" } })
		items.push({ id: "open-manifest", group: "Open", label: "Package manifest", hint: "Deliverable manifest drawer", keywords: "manifest deliverables manage package outputs", action: { type: "drawer", drawer: "package" } })
		if (canOpenHandoff) items.push({ id: "open-plan", group: "Actions", label: `Open in ${destination}`, hint: `${destination} holds this Discovery’s handoff packet`, keywords: `${destination.toLowerCase()} handoff packet continue next module`, action: { type: "plan" } })
		if (!complete) items.push({ id: "toggle-pause", group: "Actions", label: paused ? "Resume the run" : "Pause the run", hint: paused ? "Continue from the last verified checkpoint" : "Stop new autonomous work at a safe checkpoint", keywords: "pause resume checkpoint stop continue run", action: { type: "pause" } })
	}
	items.push({ id: "new-discovery", group: "Actions", label: "New discovery", hint: "Describe a new outcome for MAX", keywords: "new create start discovery brief mission", action: { type: "new" } })
	if (!inWorkspace) items.push({ id: "browse-templates", group: "Actions", label: "Browse templates", hint: "Start from a prepared mission", keywords: "templates browse examples starter gallery", action: { type: "templates" } })
	// Only the workspace has a discovery open; the hub and Create list every record by its status.
	for (const record of records) items.push({ id: `record-${record.id}`, group: "Discoveries", label: record.title, hint: inWorkspace && record.id === activeRecordId ? "Currently open" : statusLabelOf(record), keywords: `resume open ${record.brief} ${SCENARIOS[record.scenarioKey].kicker}`, action: { type: "record", recordId: record.id } })
	return items
}

/*
 * The command menu is the Conversations search dropdown (mobbin ff8a9252): a
 * search field, grouped result rows with a muted hint, and a footer of keys.
 */
function DiscoveryCommandPalette({
	records,
	screen,
	phase,
	paused,
	needsDecision,
	complete,
	activeRecordId,
	canOpenHandoff,
	destination,
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
	canOpenHandoff: boolean
	destination: HandoffDestination
	onRun: (action: DiscoveryPaletteAction) => void
	onDismiss: () => void
}) {
	const [query, setQuery] = useState("")
	const [active, setActive] = useState(0)
	const panelRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const idPrefix = useId()
	const listId = `${idPrefix}-list`
	const items = buildDiscoveryPaletteItems({ records, screen, phase, paused, needsDecision, complete, activeRecordId, canOpenHandoff, destination })
	const q = query.trim().toLowerCase()
	const filtered = q ? items.filter((item) => `${item.label} ${item.hint} ${item.keywords}`.toLowerCase().includes(q)).slice(0, 9) : items.slice(0, 9)
	const activeIndex = Math.min(active, Math.max(0, filtered.length - 1))
	const optionId = (item: DiscoveryPaletteItem) => `${idPrefix}-option-${item.id}`
	const activeItem = filtered[activeIndex]
	// Consecutive rows of one group read as one labelled group of options.
	const groups = filtered.reduce<Array<{ name: string; rows: Array<{ item: DiscoveryPaletteItem; index: number }> }>>((result, item, index) => {
		const last = result.at(-1)
		if (last && last.name === item.group) last.rows.push({ item, index })
		else result.push({ name: item.group, rows: [{ item, index }] })
		return result
	}, [])
	const iconFor = (action: DiscoveryPaletteAction) => action.type === "record" ? <Mark seed={action.recordId} size="xs" /> : action.type === "new" ? <Plus size={16} /> : action.type === "templates" ? <SquaresFour size={16} /> : action.type === "view" ? <Rows size={16} /> : action.type === "pause" ? <Pause size={16} /> : action.type === "decision" ? <ShieldCheck size={16} /> : action.type === "plan" ? <ArrowUpRight size={16} /> : <GearSix size={16} />
	// The highlighted row stays in view as the arrows move past the list's edge.
	useEffect(() => {
		const list = listRef.current
		const row = activeItem ? list?.querySelector<HTMLElement>(`[id="${optionId(activeItem)}"]`) : null
		if (!list || !row) return
		const top = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop
		if (top < list.scrollTop) list.scrollTop = top
		else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + row.offsetHeight - list.clientHeight
	})
	// The menu is modal: Tab and Shift+Tab cycle through its own controls, never the page behind the blur.
	const trapTab = (event: React.KeyboardEvent<HTMLElement>) => {
		if (event.key !== "Tab") return
		const panel = panelRef.current
		if (!panel) return
		// Rows are not Tab stops (tabIndex -1); the field steps through them with the arrows.
		const focusable = Array.from(panel.querySelectorAll<HTMLElement>(VOICE_FOCUSABLE)).filter((node) => node.tabIndex >= 0 && node.getClientRects().length > 0)
		const first = focusable[0], last = focusable.at(-1)
		const current = document.activeElement
		event.preventDefault()
		if (!first || !last) { inputRef.current?.focus(); return }
		if (!(current instanceof HTMLElement) || !focusable.includes(current)) { (event.shiftKey ? last : first).focus(); return }
		const next = focusable[(focusable.indexOf(current) + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length]
		next.focus()
	}
	const inWorkspace = screen === "workspace"
	return (
		<div className="dsc-palette-layer">
			<button type="button" className="dsc-palette-scrim" aria-label="Close command menu" tabIndex={-1} onClick={onDismiss} />
			<motion.div ref={panelRef} role="dialog" aria-modal="true" aria-label="Discovery command menu" className="dsc-palette" onKeyDown={trapTab} initial={{ y: -8, scale: 0.985 }} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 38 }}>
				<div className="dsc-palette-search">
					<MagnifyingGlass size={16} aria-hidden="true" />
					<input
						ref={inputRef}
						autoFocus
						value={query}
						placeholder="Jump to a discovery, view, sheet or action…"
						aria-label="Search Discovery"
						aria-controls={activeItem ? listId : undefined}
						aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
						autoComplete="off"
						onChange={(event) => { setQuery(event.target.value); setActive(0) }}
						onKeyDown={(event) => {
							if (event.key === "ArrowDown") { event.preventDefault(); setActive(Math.min(activeIndex + 1, filtered.length - 1)) }
							if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(activeIndex - 1, 0)) }
							if (event.key === "Enter" && activeItem) { event.preventDefault(); onRun(activeItem.action) }
							if (event.key === "Escape") { event.preventDefault(); onDismiss() }
						}}
					/>
				</div>
				{filtered.length ? <div ref={listRef} id={listId} className="dsc-palette-list" role="listbox" aria-label="Discovery commands">
					{groups.map((group) => (
						<div key={`${group.name}-${group.rows[0].index}`} role="group" aria-labelledby={`${idPrefix}-group-${group.rows[0].index}`}>
							<p id={`${idPrefix}-group-${group.rows[0].index}`} className="dsc-palette-group" role="presentation">{group.name}</p>
							{group.rows.map(({ item, index }) => (
								// Focus stays in the search field; the field points at the highlighted row.
								<button key={item.id} id={optionId(item)} type="button" role="option" tabIndex={-1} aria-selected={index === activeIndex} className={index === activeIndex ? "is-active" : ""} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => onRun(item.action)}>
									<span className="dsc-palette-icon" aria-hidden="true">{iconFor(item.action)}</span>
									<span className="dsc-palette-label">{item.label}</span>
									<small>{item.hint}</small>
								</button>
							))}
						</div>
					))}
				</div> : <p className="dsc-palette-empty" role="status">Nothing in Discovery matches “{query}”.</p>}
				{/* Only keys that do something here; view and composer keys belong to an open discovery. */}
				<footer>
					<span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
					<span><kbd>↵</kbd> Open</span>
					{inWorkspace ? <><span><kbd>1</kbd>–<kbd>4</kbd> Views</span><span><kbd>/</kbd> Composer</span></> : null}
					<span><kbd>esc</kbd> Close</span>
				</footer>
			</motion.div>
		</div>
	)
}

interface DiscoveryAutonomousPrototypePageProps {
	embedded?: boolean
	/* False while the shell shows another module; a voice session does not outlive the page being on screen. */
	active?: boolean
	setupSignal?: number
	openSignal?: DiscoveryOpenSignal | null
	onPackageReady?: () => void
	/* Called once the owner confirms the handoff; the shell shows the packet in Plan, or delivers an Agentix packet to Agentix. */
	onContinueToAgentix?: (packet?: HandoffPacket) => void
	operationalPackages?: React.ReactNode
}

export function DiscoveryAutonomousPrototypePage({ embedded = false, active = true, setupSignal = 0, openSignal = null, onPackageReady, onContinueToAgentix, operationalPackages }: DiscoveryAutonomousPrototypePageProps = {}) {
	const reducedMotion = Boolean(useReducedMotion())
	const [records, setRecords] = useState<DiscoveryRecord[]>(readDiscoveryRecords)
	const savedScenarios = useMemo(() => records.map((record) => record.scenarioKey), [records])
	const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
	const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("tprm")
	const [missionBrief, setMissionBrief] = useState("")
	const newBriefDraft = useRef("")
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
	const [toast, setToastNote] = useState<ToastNote | null>(null)
	// While a sheet is open it shows the confirmations; the page's own spot is behind its scrim.
	const pageToast = drawer ? null : toast
	const toastSeqRef = useRef(0)
	// Each confirmation is its own toast, so a replacement animates in rather than swapping text.
	const setToast = useCallback((text: string | null) => {
		toastSeqRef.current += 1
		setToastNote(text ? { id: toastSeqRef.current, text } : null)
	}, [])
	const [packageSelection, setPackageSelection] = useState(0)
	const [invitesSent, setInvitesSent] = useState(false)
	const [invitedIds, setInvitedIds] = useState<string[]>([])
	const [paletteOpen, setPaletteOpen] = useState(false)
	const [pendingReply, setPendingReply] = useState<string | null>(null)
	// The owner's last message when it was saved without MAX's reply (a reload inside the reply delay).
	const [recoverReply, setRecoverReply] = useState<string | null>(null)
	// A reply this page has already scheduled; reopening the Discovery meanwhile must not schedule a second.
	const replyInFlightRef = useRef(false)
	const [composerFocusTick, setComposerFocusTick] = useState(0)
	const [charterApproval, setCharterApproval] = useState<CharterApproval | null>(null)
	const [handoff, setHandoff] = useState<HandoffPacket | null>(null)
	const [handoffOpen, setHandoffOpen] = useState(false)
	const [charterDialogOpen, setCharterDialogOpen] = useState(false)
	// The handoff dialog's inline "Approve charter" comes back to the handoff once the charter dialog closes.
	const charterFromHandoffRef = useRef(false)
	const [excludedOutputs, setExcludedOutputs] = useState<string[]>([])
	// How far synthesis has written the package. It lives here, not in the Package view, so
	// leaving the tab never restarts it, and it only advances while the run is live.
	const [generationStep, setGenerationStep] = useState(0)
	const [workshopFinalized, setWorkshopFinalized] = useState(false)
	const [missionDecision, setMissionDecision] = useState(SCENARIOS.tprm.objective)
	const [missionDeadline, setMissionDeadline] = useState(SCENARIOS.tprm.deadline)
	// The hub's template tray stays dismissed across screens; the browser is a view over the hub.
	const [templatesTrayOpen, setTemplatesTrayOpen] = useState(true)
	const [browsingTemplates, setBrowsingTemplates] = useState(false)
	const rootRef = useRef<HTMLDivElement>(null)
	const paletteTriggerRef = useRef<HTMLElement | null>(null)
	const drawerTriggerRef = useRef<HTMLElement | null>(null)
	const sessionStartedRef = useRef(new Date().toISOString())
	const scenario = SCENARIOS[scenarioKey]
	// Plan for a plan, Agentix for an operating design; a sent packet names where it went.
	const destination = handoff ? packetDestination({ scenarioKey, handoff }) : handoffDestination(scenarioKey)
	const activeRecord = records.find((record) => record.id === activeRecordId)
	const currentMissionTitle = activeRecord?.title ?? missionTitle(missionBrief)
	const needsDecision = screen === "workspace" && phase === 4 && decision === "pending"
	const complete = phase >= OPERATIONS.length - 1

	// A customer demo moved to another tab saves this tab's run privately (see moduleStorage), never over
	// that tab's; taking the demo back saves what this tab shows to the shared run.
	const recordsRef = useRef(records)
	recordsRef.current = records
	const saveRecords = useCallback(() => {
		try {
			const storage = moduleStorage()
			if (!storage) return
			storage.setItem(storageKey(DISCOVERY_STORAGE_KEY), JSON.stringify(recordsRef.current))
			notifyDemoChange()
		} catch {
			// The work remains available for this session when browser storage is unavailable.
		}
	}, [])
	useEffect(() => { saveRecords() }, [records, saveRecords])
	// Saving again when ownership moves keeps a displaced tab's run in its own copy, so a reload there loses nothing.
	useEffect(() => {
		window.addEventListener(DEMO_SAVE_EVENT, saveRecords)
		window.addEventListener(DEMO_OWNER_EVENT, saveRecords)
		return () => { window.removeEventListener(DEMO_SAVE_EVENT, saveRecords); window.removeEventListener(DEMO_OWNER_EVENT, saveRecords) }
	}, [saveRecords])

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
			invited: invitedIds,
			charterApproval,
			handoff,
			workshopFinalized,
			excludedOutputs,
			missionDecision,
			deadline: missionDeadline,
			updatedAt: new Date().toISOString(),
		} : record))
	}, [activeRecordId, charterApproval, clarificationPending, currentMissionTitle, decision, excludedOutputs, handoff, interviewClosed, interviewIndex, invitedIds, invitesSent, messages, missionBrief, missionDeadline, missionDecision, packageSelection, paused, people, phase, scenarioKey, screen, view, workshopFinalized])

	// The package toast announces the moment the run finishes, not every reopening of a finished run.
	const finishedLiveRef = useRef(false)
	useEffect(() => {
		if (screen !== "workspace" || !interviewClosed || paused || needsDecision || complete) return
		const timer = window.setTimeout(() => setPhase((current) => {
			const next = Math.min(current + 1, OPERATIONS.length - 1)
			if (next === OPERATIONS.length - 1 && current !== next) finishedLiveRef.current = true
			return next
		}), 1650)
		return () => window.clearTimeout(timer)
	}, [complete, interviewClosed, needsDecision, paused, phase, screen])

	// Synthesis writes one document per step in list order, and holds while the run is paused.
	// Under reduced motion the whole set lands at once and nothing waits on this timer.
	useEffect(() => {
		if (screen !== "workspace" || phase !== GENERATION_PHASE || paused || reducedMotion || generationStep >= DELIVERABLES.length - 1) return
		const timer = window.setTimeout(() => setGenerationStep((step) => step + 1), MATERIALIZE_STEP_MS)
		return () => window.clearTimeout(timer)
	}, [generationStep, paused, phase, reducedMotion, screen])
	const writtenOutputs = phase < GENERATION_PHASE ? 0 : reducedMotion || phase > GENERATION_PHASE ? DELIVERABLES.length : generationStep + 1

	// A manifest edit is one change, however many switches it took: when the sheet closes,
	// MAX records what moved and raises an exception for each required output removed.
	const manifestBeforeRef = useRef<string[] | null>(null)
	const excludedRef = useRef(excludedOutputs)
	excludedRef.current = excludedOutputs
	useEffect(() => {
		if (drawer === "package") {
			manifestBeforeRef.current ??= excludedRef.current
			return
		}
		const before = manifestBeforeRef.current
		manifestBeforeRef.current = null
		const after = excludedRef.current
		if (!before) return
		const removed = after.filter((name) => !before.includes(name))
		const restored = before.filter((name) => !after.includes(name))
		if (!removed.length && !restored.length) return
		const exceptions = removed.filter((name) => REQUIRED_OUTPUTS.has(DELIVERABLES.findIndex((item) => item.name === name)))
		const included = DELIVERABLES.length - after.length
		const changes = [
			removed.length ? `removed ${joinPhrases(removed)}` : "",
			restored.length ? `restored ${joinPhrases(restored)}` : "",
		].filter(Boolean).join(" and ")
		addMessage({
			id: `manifest-${Date.now()}`,
			actor: "max",
			text: `You ${changes}. The package now holds ${included} of ${DELIVERABLES.length} documents.${exceptions.length ? ` ${exceptions.length === 1 ? `${exceptions[0]} is a required output, so I recorded an exception` : `${joinPhrases(exceptions)} are required outputs, so I recorded an exception for each`}; the handoff packet lists ${exceptions.length === 1 ? "it" : "them"} for ${destination}.` : ""}`,
			trace: ["Updated manifest v4", exceptions.length ? `Recorded ${exceptions.length} owner exception${exceptions.length === 1 ? "" : "s"}` : "Checked the change against the package policy", "Refreshed the handoff preview"],
		})
		setToast(exceptions.length ? `Manifest updated · ${exceptions.length} exception${exceptions.length === 1 ? "" : "s"} recorded` : `Manifest updated · ${included} of ${DELIVERABLES.length} included`)
		// Only the drawer's open state decides when an edit is complete; the rest is read through refs.
	}, [drawer])

	useEffect(() => {
		if (!complete) return
		onPackageReady?.()
		if (!finishedLiveRef.current) return
		finishedLiveRef.current = false
		setToast("Decision package ready and routed for approval")
	}, [complete, onPackageReady, setToast])

	useEffect(() => {
		if (!toast) return
		const timer = window.setTimeout(() => setToast(null), 4200)
		return () => window.clearTimeout(timer)
	}, [toast, setToast])

	const start = (draft?: MissionDraft) => {
		if (!missionBrief.trim()) return
		newBriefDraft.current = ""
		const recordId = createRecordId()
		const startedAt = new Date().toISOString()
		// The brief decides the investigation, so resolve it before anything is
		// seeded from a scenario the person did not describe.
		const nextScenario = scenarioForBrief(missionBrief).key
		const startingMessages = initialInterviewMessages(nextScenario, missionBrief)
		// What the owner confirmed at Review is the mission; the scenario only fills a blank decision.
		const nextDecision = draft?.decision.trim() || SCENARIOS[nextScenario].objective
		const nextDeadline = draft ? draft.deadline.trim() : SCENARIOS[nextScenario].deadline
		const newRecord: DiscoveryRecord = {
			id: recordId,
			title: draft?.title.trim() || missionTitle(missionBrief),
			brief: missionBrief,
			missionDecision: nextDecision,
			deadline: nextDeadline,
			scenarioKey: nextScenario,
			view: "thread",
			phase: 0,
			paused: false,
			decision: "pending",
			people: SCENARIOS[nextScenario].people,
			messages: startingMessages,
			interviewIndex: 0,
			interviewClosed: false,
			clarificationPending: false,
			packageSelection: 0,
			invitesSent: false,
			createdAt: startedAt,
			updatedAt: startedAt,
		}
		// In the customer demo a new revenue Discovery is a new run: it replaces the earlier revenue
		// Discovery and starts Agentix again from zero, so the whole process can be shown again.
		const newRun = !!demoSession() && !!SCENARIOS[nextScenario].handoff
		setActiveRecordId(recordId)
		setRecords((current) => [newRecord, ...(newRun ? current.filter((record) => record.scenarioKey !== nextScenario) : current)].slice(0, MAX_SAVED_DISCOVERIES))
		if (newRun) resetDemoAgentix()
		setScenarioKey(nextScenario)
		setMissionDecision(nextDecision)
		setMissionDeadline(nextDeadline)
		// Preparation is its step loader; with reduced motion there is nothing to watch, so the
		// workspace opens at once rather than after a timer.
		setScreen(reducedMotion ? "workspace" : "preparing")
		setView("thread")
		setPhase(0)
		setDecision("pending")
		setPaused(false)
		setInterviewIndex(0)
		setInterviewClosed(false)
		setClarificationPending(false)
		setPeople(SCENARIOS[nextScenario].people)
		setMessages(startingMessages)
		setInvitesSent(false)
		setInvitedIds([])
		setPendingPerson(null)
		setCharterApproval(null)
		setHandoff(null)
		setExcludedOutputs([])
		setGenerationStep(0)
		setWorkshopFinalized(false)
		registerStreamableMessages(startingMessages)
	}

	// Preparation calls this once its loader has landed on Ready, and "Enter Thread" skips ahead.
	const enterWorkspaceNow = () => setScreen((current) => current === "preparing" ? "workspace" : current)

	const openNewDiscovery = () => {
		setPendingReply(null)
		setBrowsingTemplates(false)
		setActiveRecordId(null)
		setScenarioKey("tprm")
		setScreen("setup")
		setMissionBrief(newBriefDraft.current)
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
		setInvitedIds([])
		setCharterApproval(null)
		setHandoff(null)
		setExcludedOutputs([])
		setGenerationStep(0)
		setWorkshopFinalized(false)
		setMissionDecision(SCENARIOS.tprm.objective)
		setMissionDeadline(SCENARIOS.tprm.deadline)
	}

	const openDiscoveryIndex = () => {
		setPendingReply(null)
		setBrowsingTemplates(false)
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
		// Records saved before invitations were tracked per person invited everyone they had.
		setInvitedIds(record.invited ?? (record.invitesSent ? record.people.map((person) => person.id) : []))
		setCharterApproval(record.charterApproval ?? (record.phase >= OPERATIONS.length - 1 && record.id.startsWith("seed-") ? SEED_CHARTER_APPROVAL : null))
		setHandoff(record.handoff ?? null)
		setExcludedOutputs(record.excludedOutputs ?? [])
		setGenerationStep(0)
		setCharterDialogOpen(false)
		setWorkshopFinalized(record.workshopFinalized ?? false)
		setMissionDecision(record.missionDecision ?? SCENARIOS[record.scenarioKey].objective)
		setMissionDeadline(record.deadline ?? SCENARIOS[record.scenarioKey].deadline)
		setHandoffOpen(false)
		setBrowsingTemplates(false)
		setScreen("workspace")
		// An answer saved just before a reload or exit never got its reply; MAX answers it now.
		const last = record.messages.at(-1)
		setRecoverReply(last?.actor === "user" && !replyInFlightRef.current ? last.text : null)
	}

	const openDrawer = (next: Exclude<Drawer, null>, trigger?: HTMLElement | null) => {
		// Setup's section buttons live inside the drawer and disappear when it
		// closes, so a drawer opened from within one keeps the original trigger.
		const candidate = trigger !== undefined ? trigger : document.activeElement instanceof HTMLElement ? document.activeElement : null
		const openedFromInsideDrawer = Boolean(candidate?.closest(".drawer"))
		if (!openedFromInsideDrawer || !drawerTriggerRef.current) drawerTriggerRef.current = candidate
		setDrawer(next)
	}

	const closeDrawer = () => {
		// A confirmation raised inside the sheet leaves with it.
		setToast(null)
		setDrawer(null)
		const trigger = drawerTriggerRef.current
		drawerTriggerRef.current = null
		window.requestAnimationFrame(() => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }) })
	}

	const openTemplateBrowser = () => {
		setScreen("index")
		setDrawer(null)
		setBrowsingTemplates(true)
	}

	const startFromTemplate = (brief: string) => {
		openNewDiscovery()
		newBriefDraft.current = brief
		setMissionBrief(brief)
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
		setView(next)
	}

	// Steering is a message to MAX, so it always lands in the Thread composer.
	const steerMax = () => {
		setView("thread")
		setComposerFocusTick((tick) => tick + 1)
	}

	// `pending` is passed when the record was only just opened and this render's state is not yet its own.
	const jumpToDecision = (from: View = view, pending = needsDecision) => {
		// Autonomy answers the decision in place, in its Human authority card.
		const authority = from === "autonomy" ? rootRef.current?.querySelector<HTMLElement>(".overview-attention.needs-decision") : null
		if (authority) {
			revealWithin(authority.closest<HTMLElement>(".overview-main"), authority, "nearest", reducedMotion ? "auto" : undefined)
			authority.focus({ preventScroll: true })
			return
		}
		// With nothing waiting, the owner thread's composer is where the owner acts.
		if (!pending) { steerMax(); return }
		setView("thread")
		window.setTimeout(() => {
			// Scroll the log itself rather than scrollIntoView — the page is also
			// embedded inside the portal and must not scroll ancestor containers.
			const log = rootRef.current?.querySelector<HTMLElement>(".message-log")
			const card = rootRef.current?.querySelector<HTMLElement>(".decision-event")
			if (!log || !card) { setComposerFocusTick((tick) => tick + 1); return }
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
		if (action.type === "templates") { openTemplateBrowser(); return }
		if (action.type === "view") { requestView(action.view); return }
		if (action.type === "pause") { setPaused((current) => !current); return }
		if (action.type === "decision") { jumpToDecision(); return }
		if (action.type === "plan") { openPlan?.(); return }
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
		resumeDiscovery(signal.jump === "package" && record.phase >= 6 ? { ...record, view: "package" } : signal.jump === "autonomy" ? { ...record, view: "autonomy" } : signal.jump === "decision" ? { ...record, view: "thread" } : record)
		if (signal.jump === "decision") jumpToDecision("thread", true)
	}
	const openSignalTickRef = useRef(0)
	useEffect(() => {
		if (!openSignal || openSignal.tick === openSignalTickRef.current) return
		openSignalTickRef.current = openSignal.tick
		openJumpRef.current(openSignal)
	}, [openSignal])

	// The customer demo's presenter can put the scripted answer in the composer; the presenter still sends it.
	const fillRef = useRef<(text: string, recordId?: string) => void>(() => undefined)
	fillRef.current = (text, recordId) => {
		const record = recordId ? records.find((item) => item.id === recordId) : undefined
		if (record && (record.id !== activeRecordId || screen !== "workspace")) resumeDiscovery({ ...record, view: "thread" })
		else if (screen !== "workspace") return
		setView("thread")
		setCommandText(text)
		setComposerFocusTick((tick) => tick + 1)
	}
	useEffect(() => {
		const onFill = (event: Event) => {
			const detail = (event as CustomEvent<{ text?: unknown; recordId?: unknown }>).detail
			if (typeof detail?.text === "string") fillRef.current(detail.text.slice(0, 600), typeof detail.recordId === "string" ? detail.recordId : undefined)
		}
		window.addEventListener(DEMO_FILL_EVENT, onFill)
		return () => window.removeEventListener(DEMO_FILL_EVENT, onFill)
	}, [])

	// MAX replies to an answer it never got to reply to, the same way it replies to a new one.
	useEffect(() => {
		if (!recoverReply || screen !== "workspace") return
		const text = recoverReply
		if (!reducedMotion) setPendingReply(thinkingLine(interviewClosed ? null : scenario.ownerInterview[Math.min(interviewIndex, scenario.ownerInterview.length - 1)].topic, phase))
		replyInFlightRef.current = true
		const timer = window.setTimeout(() => { replyInFlightRef.current = false; setRecoverReply(null); setPendingReply(null); replyToCommand(text) }, reducedMotion ? 50 : 720)
		return () => { window.clearTimeout(timer); replyInFlightRef.current = false }
		// Runs once per recovered message; the reply reads this render's state, as a sent message's reply does.
	}, [recoverReply, screen])

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// The portal keeps every module stage mounted behind `hidden` — only
			// the visible Discovery stage may own the keyboard.
			if (!rootRef.current?.offsetParent) return
			const target = event.target instanceof HTMLElement ? event.target : null
			const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
			// A voice session is modal: the page's shortcuts wait until it closes, and
			// the shell's menu must not open over it either. Escape is the session's own.
			if (document.querySelector(".voice-backdrop")) {
				if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !typing)) {
					event.preventDefault()
					event.stopPropagation()
				}
				return
			}
			// A sheet, dialog or the menu owns the keyboard while it is open: the view behind
			// it never changes and focus never leaves it. The menu is not opened over another modal.
			const modal = paletteOpen || Boolean(drawer) || handoffOpen || charterDialogOpen || Boolean(target?.closest("[role=dialog], [aria-modal=true]")) || visibleModalOpen()
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault()
				event.stopPropagation()
				if (paletteOpen) dismissPalette()
				else if (!modal) openPalette()
				return
			}
			if (event.key === "Escape") {
				if (paletteOpen) { event.stopPropagation(); dismissPalette(); return }
				if (drawer) { event.stopPropagation(); closeDrawer(); return }
				return
			}
			if (typing || modal) return
			if (event.key === "/" && screen === "workspace") {
				event.preventDefault()
				setView("thread")
				setComposerFocusTick((tick) => tick + 1)
				return
			}
			if (screen === "workspace" && ["1", "2", "3", "4"].includes(event.key)) {
				requestView((["thread", "autonomy", "workshop", "package"] as const)[Number(event.key) - 1])
			}
		}
		window.addEventListener("keydown", onKeyDown, { capture: true })
		return () => window.removeEventListener("keydown", onKeyDown, { capture: true })
	}, [charterDialogOpen, drawer, handoffOpen, paletteOpen, phase, reducedMotion, screen])

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
		setToast(next === "approved" ? "Decision recorded · affected work resumed" : "Boundary kept · limitation recorded")
		// The card that held focus is gone; the conversation takes it back.
		setComposerFocusTick((tick) => tick + 1)
	}

	const addMessage = (message: ChatMessage) => {
		registerStreamableMessages([message])
		setMessages((current) => [...current, message])
	}

	const reply = (text: string, trace?: string[]) => addMessage({ id: `reply-${Date.now()}`, actor: "max", text, trace })

	/*
	 * Adding a stakeholder is a short form MAX fills across turns. Every reply is
	 * merged with what it already has; the fields still missing decide how the
	 * next reply is read, so "Alex Morgan", then "Controller", then an email works.
	 */
	const addPersonFromCommand = (text: string, retained: Partial<Person> | null) => {
		const email = text.match(EMAIL_PATTERN)?.[0] ?? retained?.email
		const withoutCommand = text.replace(/^\s*(?:please\s+)?add\s+(?:a\s+)?(?:new\s+)?stakeholder\b[\s:,;-]*/i, "").trim()
		const rest = withoutCommand.replace(EMAIL_PATTERN, "").trim()
		const missingText = TEXT_PERSON_FIELDS.filter((field) => !retained?.[field])
		const values: Partial<Record<(typeof TEXT_PERSON_FIELDS)[number], string>> = {}
		let department: string | undefined
		let focus: string | undefined
		const asParts = rest.split(/\s+as\s+/i)
		if (asParts.length > 1 && missingText.length === TEXT_PERSON_FIELDS.length) {
			const [role, ...extra] = asParts.slice(1).join(" as ").split(/[,;]/).map((part) => part.trim()).filter(Boolean)
			values.name = asParts[0].replace(/[,;\s]+$/, "")
			values.role = role
			department = extra[0]
			focus = extra.slice(1).join(", ") || undefined
		} else if (missingText.length === 1 && email && rest) {
			// Only one thing is still needed, so the whole reply is that thing.
			values[missingText[0]] = rest.replace(/[,;.\s]+$/, "")
		} else if (missingText.length || EMAIL_PATTERN.test(text)) {
			const parts = rest.split(/[,;]/).map((part) => part.trim()).filter(Boolean)
			missingText.forEach((field, index) => { if (parts[index]) values[field] = parts[index] })
			department = parts[missingText.length]
			focus = parts.slice(missingText.length + 1).join(", ") || undefined
		}
		const name = retained?.name || values.name
		const role = retained?.role || values.role
		department = department ?? retained?.department
		focus = focus ?? retained?.focus

		if (!name || !role || !email) {
			setPendingPerson({ ...retained, name, role, email, department, focus })
			const missing = [!name && "name", !role && "role", !email && "email"].filter((field): field is string => Boolean(field))
			const firstName = name?.split(" ")[0]
			if (!name && !role && !email) {
				reply(`I can add them. I still need the ${missing.join(", ")}. You can reply in one line; department, influence, and interview focus are optional.`)
			} else if (missing.length === 1 && missing[0] === "email" && rest && !values.name && !values.role) {
				reply(`That doesn’t look like an email address. Reply with ${firstName ?? "their"}${firstName ? "’s" : ""} work email, or say “cancel” to stop.`)
			} else {
				const known = name ? `${name}${role ? ` as ${role}` : ""}` : role ? `the ${role} role` : email
				reply(`I have ${known}. I still need their ${listPhrase(missing)}. Reply with just that, or say “cancel” to stop.`)
			}
			return
		}

		const duplicate = people.find((person) => person.email.toLowerCase() === email.toLowerCase())
		setPendingPerson(null)
		if (duplicate) {
			reply(`${duplicate.name} is already in the roster as ${duplicate.role}, so I didn’t create a second record.`, ["Checked the existing roster for duplicates", `Matched ${email} to ${duplicate.name}`])
			return
		}
		const newPerson: Person = {
			id: `person-${Date.now()}`,
			name,
			initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
			role,
			department: department || "To confirm",
			email,
			influence: "Medium",
			focus: focus || "MAX will adapt the interview focus from the mission and source gaps.",
			channel: "Text",
		}
		setPeople((current) => [...current, newPerson])
		reply(
			`${newPerson.name} is now in the stakeholder roster as ${newPerson.role}. I verified the record after creating it; the interview focus will adapt to the remaining mission gaps.${invitesSent ? ` ${newPerson.name.split(" ")[0]} has no interview invitation yet; say “send the interviews” to invite them.` : ""}`,
			["Checked the existing roster for duplicates", `Created ${newPerson.name}'s stakeholder record`, "Read the record back and updated coverage"],
		)
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

	const interviewedCount = Math.min(people.length, Math.max(0, phase - 2))
	const uninvitedPeople = people.filter((person) => !invitedIds.includes(person.id))

	const rosterAnswer = () => {
		if (!people.length) return "No stakeholders are mapped yet."
		const invitations = !invitesSent
			? "I’m preparing their invitations from the inquiry plan."
			: uninvitedPeople.length
				? `${joinNames(uninvitedPeople)} ${uninvitedPeople.length === 1 ? "has" : "have"} no invitation yet; the others are recorded as sent.`
				: "Their invitations are recorded as sent."
		return `${joinNames(people)} ${people.length === 1 ? "is" : "are"} currently mapped. ${invitations}`
	}

	// Questions are answered from the record itself, never with a steering acknowledgement.
	const answerQuestion = (text: string) => {
		const lower = text.toLowerCase()
		const exception = scenario.exception
		const person = people.find((candidate) => lower.includes(candidate.name.toLowerCase()) || new RegExp(`\\b${escapeMentionToken(candidate.name.split(" ")[0].toLowerCase())}\\b`).test(lower))
		const source = scenario.sources.find((candidate) => lower.includes(candidate.system.toLowerCase()) || lower.includes(candidate.name.toLowerCase()))
		if (person) {
			const raised = exception.trigger.includes(person.name)
			const where = person.department && person.department !== "To confirm" ? ` in ${person.department}` : ""
			const status = raised
				? `${exception.trigger} ${needsDecision ? "That recommendation is the decision waiting for you." : "That recommendation is recorded with your decision."}`
				: people.indexOf(person) < interviewedCount
					? "Their interview is complete and reconciled against the evidence."
					: invitedIds.includes(person.id) ? "Their interview invitation is out; nothing is on record from them yet." : "They haven’t been invited yet."
			reply(`${person.name} is the ${person.role}${where}. Interview focus: ${person.focus.replace(/\.$/, "")}. ${status}`, ["Read the stakeholder record", "Checked interview notes and follow-ups"])
			return
		}
		if (source) {
			const read = interviewClosed && phase >= 2 ? "MAX has screened all of it within the approved scope." : "MAX reads it automatically within the approved scope once the owner interview closes."
			reply(`${source.name} in ${source.system} (${source.scope}) holds ${source.records}. ${read}`, ["Read the source binding and scope", "Checked screening progress"])
			return
		}
		if (/\b(?:risks?|exceptions?|decisions?|blockers?|conflicts?|issues?|tickets?|boundary)\b/.test(lower)) {
			const found = interviewClosed && phase >= 4
			const state = !found
				? `No material exception has surfaced yet. MAX is ${OPERATION_ACTIVITY[Math.min(phase, OPERATION_ACTIVITY.length - 1)]} and stops only if something crosses the authority you approved.`
				: needsDecision ? `The open one is “${exception.title}”. ${exception.trigger} It’s waiting on your decision; every unaffected branch keeps moving.`
				: decision === "modified" ? `The material one was “${exception.title}”. You kept the boundary, so it’s recorded as a limitation in the package.`
				: `The material one was “${exception.title}”. You allowed the bounded action, and MAX resumed the affected branch.`
			reply(state, ["Read the conflict and exception register", "Checked the authority boundary"])
			return
		}
		if (/\b(?:sources?|systems?|records?|evidence)\b/.test(lower)) {
			const read = interviewClosed && phase >= 2 ? "All of them are screened within the approved scopes." : "MAX starts reading them once the owner interview closes."
			reply(`MAX reads ${scenario.sources.length} governed sources: ${listPhrase(scenario.sources.map((candidate) => `${candidate.name} (${candidate.system}, ${candidate.records})`))}. ${read}`, ["Read the source bindings and scopes", "Checked screening progress"])
			return
		}
		if (/\b(?:stakeholders?|people|roster|invit\w*)\b/.test(lower)) {
			reply(rosterAnswer(), ["Read the current stakeholder roster", "Checked invitation delivery state"])
			return
		}
		if (/\b(?:package|deliverables?|documents?|plan|handoff|findings?)\b/.test(lower)) {
			// The answer counts what the manifest keeps, not every output MAX can build.
			const kept = includedOutputs(excludedOutputs).length
			const whole = kept === DELIVERABLES.length
			const state = handoff
				? `Packet ${handoff.id} went to ${destination} (${formatPacketTime(handoff.createdAt)}) with ${whole ? `all ${kept}` : `${kept} of ${DELIVERABLES.length}`} documents from readiness snapshot v7${decision === "modified" ? " and one recorded limitation" : ""}.`
				: complete
					? `${whole ? `All ${kept}` : `The ${kept} included`} deliverables are verified; start with the executive decision brief.${charterApproval ? "" : " The project charter still needs your approval before the handoff."}`
					: `The package isn’t built yet. ${DELIVERABLES.length} deliverables are planned and generate once readiness freezes.`
			reply(state, ["Read the package manifest", "Checked handoff state"])
			return
		}
		const where = complete
			? `the Discovery is complete${handoff ? ` and packet ${handoff.id} is with ${destination}` : " and the package is ready to review"}. ${scenario.summary.split(". ")[0]}.`
			: `MAX is ${OPERATION_ACTIVITY[Math.min(phase, OPERATION_ACTIVITY.length - 1)]} across ${people.length} stakeholders and ${scenario.sources.length} governed sources. ${needsDecision ? `One decision is waiting: ${scenario.exception.title}.` : "Nothing is waiting on you."}`
		reply(`On “${echoOwner(text)}”: ${where}`, ["Read persisted mission state", "Answered in the owner thread only"])
	}

	const statusLine = () => {
		const facts = [
			complete ? `all ${OPERATIONS.length} operations complete` : `${phase + 1} of ${OPERATIONS.length} operations reached`,
			`${people.length} stakeholders mapped`,
			needsDecision ? "one authority exception pending" : !interviewClosed ? "your interview still open" : "no owner blocker",
		]
		if (handoff) facts.push(`packet ${handoff.id} with ${destination}`)
		return listPhrase(facts)
	}

	const replyToCommand = (text: string) => {
		const normalized = text.toLowerCase()
		const question = isQuestionIntent(text)
		if (normalized.includes("status")) {
			const sendToSponsor = /^(?:please )?(?:send|share) (?:the sponsor (?:a |the )?status update|(?:a |the )?status(?: update)? to (?:the )?sponsor)[.!]?$/i.test(text)
			reply(
				`${sendToSponsor ? "Status update sent to the approved sponsor" : "Current Discovery status"}: ${statusLine()}.${sendToSponsor ? " The same update is logged in the sponsor thread." : " No sponsor update was sent."}`,
				sendToSponsor ? ["Read persisted mission state", "Matched the explicit send instruction to the approved sponsor", "Logged the update in the sponsor thread"] : ["Read persisted mission state", "Answered in the owner thread only"],
			)
			if (sendToSponsor) setToast("Status update sent to the sponsor")
			return
		}
		// Standing instructions come before any half-filled stakeholder form, so
		// "send the interviews" or "pause" is never read as someone's role.
		if (/\b(?:who|which)\b/.test(normalized) && /\b(?:stakeholders?|roster)\b/.test(normalized)) {
			reply(rosterAnswer(), ["Read the current stakeholder roster", "Checked invitation delivery state"])
			return
		}
		if (!question && (/\binvit/.test(normalized) || normalized.includes("send the interviews"))) {
			if (complete) {
				reply("The inquiry program is finished, so there’s no one left to invite.")
				return
			}
			if (!people.length) {
				reply("No stakeholders are mapped yet, so there’s no one to invite.")
				return
			}
			if (invitesSent && !uninvitedPeople.length) {
				reply(`All ${people.length} invitations were already delivered and no one has been added since, so I didn’t send them again.`, ["Checked delivery receipts for every stakeholder", "Found no stakeholder without an invitation"])
				return
			}
			const recipients = invitesSent ? uninvitedPeople : people
			setInvitesSent(true)
			setInvitedIds((current) => [...new Set([...current, ...recipients.map((person) => person.id)])])
			reply(
				invitesSent
					? `${people.length - recipients.length} stakeholders already had their invitations. I sent ${recipients.length === 1 ? "one" : recipients.length} to ${joinNames(recipients)} on ${recipients.length === 1 ? "their" : "each"} assigned channel and verified delivery.`
					: `I sent ${people.length} invitations using each stakeholder's assigned channel. Delivery was verified and the chase cadence is now active.`,
				["Validated recipient policy and consent copy", `Queued ${recipients.length} idempotent invitation${recipients.length === 1 ? "" : "s"}`, "Verified delivery receipts and scheduled follow-ups"],
			)
			setToast(`${recipients.length} invitation${recipients.length === 1 ? "" : "s"} delivered`)
			return
		}
		if (!question && /\bpause\b/.test(normalized)) {
			if (complete) reply("The run is already complete, so there’s nothing to pause.")
			else if (paused) reply("The run is already paused at the last verified checkpoint. Say “resume” when you’re ready.")
			else {
				setPaused(true)
				reply("Paused. No new outreach or package work will start; in-flight writes remain safely recorded.")
			}
			return
		}
		if (!question && /\b(?:resume|unpause)\b/.test(normalized)) {
			if (complete) reply("The run is already complete, so there’s nothing to resume.")
			else if (!paused) reply("The run isn’t paused; MAX is already working.")
			else {
				setPaused(false)
				reply(`Resumed from the last verified checkpoint.${needsDecision ? " The decision is still waiting for you." : ""}`)
			}
			return
		}
		if (pendingPerson && isCancelIntent(text)) {
			setPendingPerson(null)
			reply("Cancelled. I didn’t add anyone to the roster.")
			return
		}
		if (pendingPerson || !question && normalized.includes("add") && normalized.includes("stakeholder")) {
			if (handoff) {
				setPendingPerson(null)
				reply(`Packet ${handoff.id} is frozen, so its roster can’t change here. Raise the change in ${destination}, where the packet now lives.`)
				return
			}
			addPersonFromCommand(text, pendingPerson)
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
		if (question) {
			answerQuestion(text)
			return
		}
		if (handoff) {
			reply(
				`Packet ${handoff.id} is frozen, so I haven’t changed it. I can take “${echoOwner(text)}” to ${destination} as a change request against the packet; open ${destination} to raise it there.`,
				["Checked the packet state: frozen at handoff", "Left the package unchanged"],
			)
			return
		}
		const lower = text.toLowerCase()
		const source = scenario.sources.find((candidate) => lower.includes(candidate.system.toLowerCase()) || lower.includes(candidate.name.toLowerCase()))
		const person = people.find((candidate) => lower.includes(candidate.name.toLowerCase()))
		const action = complete
			? "The package is already verified, so I’ve logged it as a revision note for the next version instead of changing the documents."
			: source ? `I’ll check it against ${source.name} in ${source.system}${paused ? " once you resume" : ""}.`
			: person ? `I’ll raise it with ${person.name} in their next follow-up${paused ? " once you resume" : ""}.`
			: `I’m applying it to ${OPERATIONS[phase].label.toLowerCase()}${paused ? " once you resume" : ""}.`
		reply(`Noted: “${echoOwner(text)}”. ${action} Any resulting record change will show in the work trace.`, complete ? ["Recorded a revision note", "Left the verified package unchanged"] : ["Recorded the owner direction", `Applied it to ${OPERATIONS[phase].label.toLowerCase()}`])
	}

	const submitCommand = (rawText: string) => {
		const text = rawText.trim()
		if (!text) return
		setCommandText("")
		addMessage({ id: `user-${Date.now()}`, actor: "user", text })
		// A turn, not a form submit: MAX visibly considers the answer before it
		// replies. Reduced motion collapses the gap and skips the pending row.
		if (!reducedMotion) setPendingReply(thinkingLine(interviewClosed ? null : scenario.ownerInterview[Math.min(interviewIndex, scenario.ownerInterview.length - 1)].topic, phase))

		replyInFlightRef.current = true
		window.setTimeout(() => {
			replyInFlightRef.current = false
			setPendingReply(null)
			replyToCommand(text)
		}, reducedMotion ? 50 : 720)
	}

	const approveCharter = (reason: string) => {
		setCharterApproval({ reason, approvedAt: new Date().toISOString() })
		addMessage({
			id: `charter-${Date.now()}`,
			actor: "max",
			text: `I recorded your approval of the project charter with your reason. It travels with the handoff packet, so ${destination} starts from the scope and owners you committed to.`,
			trace: ["Recorded the owner approval and reason", "Marked the charter as owner approved in manifest v4", "Cleared the handoff blocker"],
		})
		setToast("Charter approved · handoff unblocked")
	}

	const finalizeWorkshop = () => {
		if (workshopFinalized) return
		setWorkshopFinalized(true)
		addMessage({
			id: `workshop-${Date.now()}`,
			actor: "max",
			text: `I closed the workshop and wrote all ${workshopAgenda(scenarioKey).length} agreed agenda items back as cited evidence. They are bound to readiness snapshot v7, so synthesis starts from what the room agreed.`,
			trace: ["Closed the workshop session", "Wrote the agreed positions back as cited evidence", "Bound them to readiness snapshot v7"],
		})
		setToast("Workshop finalized · bound to snapshot v7")
	}

	// The charter dialog is the page's, so the Package gate and the handoff's blocker row open
	// the same one. From the handoff, closing it returns the owner to the handoff.
	const requestCharterApproval = (fromHandoff = false) => {
		charterFromHandoffRef.current = fromHandoff
		if (fromHandoff) setHandoffOpen(false)
		setCharterDialogOpen(true)
	}

	const closeCharterDialog = () => {
		setCharterDialogOpen(false)
		if (!charterFromHandoffRef.current) return
		charterFromHandoffRef.current = false
		setHandoffOpen(true)
	}

	const confirmHandoff = (note: string) => {
		const target = scenario.handoff
		const packet: HandoffPacket = { id: `HP-${Date.now().toString(36).toUpperCase().slice(-6)}`, createdAt: new Date().toISOString(), note, target: "agentix", recordId: activeRecordId ?? undefined, title: currentMissionTitle, brief: scenario.brief, ...target ? { packageId: target.packageId } : {} }
		const included = includedOutputs(excludedOutputs)
		const exceptions = excludedOutputs.filter((name) => REQUIRED_OUTPUTS.has(DELIVERABLES.findIndex((item) => item.name === name))).length
		const carried = [
			"the mission decision",
			`the ${countWord(included.length)} documents with their hashes`,
			...(included.includes(CHARTER_DELIVERABLE_INDEX) ? ["your charter approval"] : []),
			...(exceptions ? [exceptions === 1 ? "the exception you recorded" : `the ${countWord(exceptions)} exceptions you recorded`] : []),
		]
		setHandoff(packet)
		setHandoffOpen(false)
		addMessage({
			id: `handoff-${Date.now()}`,
			actor: "max",
			text: `I created handoff packet ${packet.id} from readiness snapshot v7 and manifest v4. ${destination} now has ${joinPhrases(carried)}${note ? `, with your note: “${note}”` : ""}.${target ? " It opens there as a proposal, and nothing runs until you activate it." : ""}`,
			trace: ["Froze the package into an immutable packet", "Verified every document hash against the manifest", onContinueToAgentix ? `Opened ${destination} from the packet` : `Queued the packet for ${destination}`],
		})
		if (!onContinueToAgentix) { setToast(`Sent to ${destination} as ${packet.id}`); return }
		// Plan announces the packet it received, so nothing is left behind in the hidden Discovery
		// stage: the confirmation clears before Plan opens, and reduced motion goes straight there.
		if (reducedMotion) { setToast(null); onContinueToAgentix(packet); return }
		setToast(`Sent to ${destination} as ${packet.id}`)
		window.setTimeout(() => { setToast(null); onContinueToAgentix(packet) }, 900)
	}

	const openPlan = embedded && onContinueToAgentix && handoff ? () => onContinueToAgentix(handoff) : undefined
	// An included charter without the owner's approval is the one thing that blocks the handoff.
	const charterIncluded = !excludedOutputs.includes(DELIVERABLES[CHARTER_DELIVERABLE_INDEX].name)
	const handoffBlocked = charterIncluded && !charterApproval

	const sendCommand = (event: FormEvent) => {
		event.preventDefault()
		submitCommand(commandText)
	}

	return (
		<div ref={rootRef} className={`prototype ds-scope${embedded ? " embedded" : ""}`}>
			{screen === "index" ? (
				<DiscoveryIndex
					operationalPackages={operationalPackages}
					records={records}
					trayOpen={templatesTrayOpen}
					browsing={browsingTemplates}
					onTrayOpenChange={setTemplatesTrayOpen}
					onBrowseTemplates={() => setBrowsingTemplates(true)}
					onCloseTemplates={() => setBrowsingTemplates(false)}
					onOpenCommands={openPalette}
					onNew={openNewDiscovery}
					onNewFromTemplate={startFromTemplate}
					onResume={resumeDiscovery}
					onReviewDecision={(record) => resumeDiscovery({ ...record, view: "thread" })}
				/>
			) : screen === "setup" ? (
					<SetupScreen
						missionBrief={missionBrief}
						onMissionBriefChange={value => { newBriefDraft.current = value; setMissionBrief(value) }}
						onBack={openDiscoveryIndex}
						onStart={start}
						savedScenarios={savedScenarios}
					/>
			) : screen === "preparing" ? (
				<PreparingScreen scenarioKey={scenarioKey} missionTitle={currentMissionTitle} deadline={missionDeadline} onEnter={enterWorkspaceNow} onClose={openDiscoveryIndex} />
			) : (
					<WorkspaceShell
					scenarioKey={scenarioKey}
					missionTitle={currentMissionTitle}
					deadline={missionDeadline}
					view={view}
					onViewChange={setView}
					phase={phase}
					paused={paused}
					interviewClosed={interviewClosed}
					interviewIndex={interviewIndex}
					decision={decision}
					handoffId={handoff?.id ?? null}
					handoffBlocked={handoffBlocked}
					onTogglePause={() => setPaused((current) => !current)}
					onOpenIndex={openDiscoveryIndex}
					onNewDiscovery={openNewDiscovery}
					onJumpToDecision={() => jumpToDecision()}
					onSteer={steerMax}
					onOpenSetup={() => openDrawer("setup")}
					onContinueToAgentix={() => setHandoffOpen(true)}
					onOpenPlan={openPlan}
					onOpenSources={() => openDrawer("sources")}
					overlay={view === "thread" ? null : <ToastRegion toast={pageToast} className="is-floating" />}>
					{view === "autonomy" ? (
						<Overview
							scenarioKey={scenarioKey}
							missionTitle={currentMissionTitle}
							missionBrief={missionBrief}
							missionDecision={missionDecision}
							deadline={missionDeadline}
							startedAt={activeRecord?.createdAt ?? sessionStartedRef.current}
							phase={phase}
							paused={paused}
							decision={decision}
							people={people}
							interviewClosed={interviewClosed}
							interviewIndex={interviewIndex}
							handoffId={handoff?.id ?? null}
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
							missionDecision={missionDecision}
							phase={phase}
							paused={paused}
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
							onJumpToDecision={() => jumpToDecision("thread")}
							onOpenPeople={() => openDrawer("people")}
							onOpenSources={() => openDrawer("sources")}
							onOpenPackage={() => setView("package")}
							onOpenAutonomy={() => setView("autonomy")}
							onOpenHandoff={() => setHandoffOpen(true)}
							handoff={handoff}
							charterApproved={!!charterApproval}
							includedCount={includedOutputs(excludedOutputs).length}
							onOpenPlan={openPlan}
							toast={pageToast}
							active={active}
						/>
					) : view === "workshop" ? (
						<WorkshopRoom
							scenarioKey={scenarioKey}
							missionTitle={currentMissionTitle}
							phase={phase}
							paused={paused}
							finalized={workshopFinalized}
							handedOff={Boolean(handoff)}
							onFinalize={finalizeWorkshop}
							onOpenThread={() => setView("thread")}
						/>
					) : (
						<Deliverables
							scenarioKey={scenarioKey}
							phase={phase}
							paused={paused}
							written={writtenOutputs}
							decision={decision}
							interviewClosed={interviewClosed}
							excluded={excludedOutputs}
							selected={packageSelection}
							charterApproval={charterApproval}
							handoff={handoff}
							onSelect={setPackageSelection}
							onManage={() => openDrawer("package")}
							onRequestCharterApproval={() => requestCharterApproval()}
							onContinueToAgentix={() => setHandoffOpen(true)}
							onOpenPlan={openPlan}
							onOpenThread={() => setView("thread")}
							onToast={setToast}
						/>
					)}
				</WorkspaceShell>
			)}

			{screen === "workspace" ? (
				<>
					<HandoffDialog
						open={handoffOpen}
						scenarioKey={scenarioKey}
						missionDecision={missionDecision}
						decision={decision}
						excluded={excludedOutputs}
						charterApproval={charterApproval}
						onClose={() => setHandoffOpen(false)}
						onApproveCharter={() => requestCharterApproval(true)}
						onConfirm={confirmHandoff} />
					<CharterApprovalDialog
						open={charterDialogOpen}
						documentName={DELIVERABLES[CHARTER_DELIVERABLE_INDEX].name}
						audience={DELIVERABLES[CHARTER_DELIVERABLE_INDEX].audience}
						destination={destination}
						onClose={closeCharterDialog}
						onApprove={reason => { approveCharter(reason); closeCharterDialog() }} />
				</>
			) : null}
			{paletteOpen ? (
				<DiscoveryCommandPalette
					records={records}
					screen={screen}
					phase={phase}
					paused={paused}
					needsDecision={needsDecision}
					complete={complete}
					activeRecordId={activeRecordId}
					canOpenHandoff={Boolean(openPlan)}
					destination={destination}
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
						manifest={{ excluded: excludedOutputs, frozenIn: handoff?.id ?? null, destination, onChange: setExcludedOutputs }}
						toast={toast}
						onToast={setToast}
						onFocusSection={openDrawer}
						onClose={closeDrawer}
					/>
				) : null}
			</AnimatePresence>
			{/* In the workspace the shell places the toast (above the Thread composer, or beside the rail). */}
			{screen === "workspace" ? null : <ToastRegion toast={pageToast} className="is-floating" />}
		</div>
	)
}

/* The reference's dark confirmation. The live region stays mounted so every
 * replacement is announced; each toast is keyed, so a new one rises in. */
function ToastRegion({ toast, className }: { toast: ToastNote | null; className?: string }) {
	const reduced = useReducedMotion()
	const toastMotion = reduced ? {} : { initial: { y: 12, filter: "blur(3px)" }, animate: { y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: 8 }, transition: { duration: 0.24, ease: REVEAL_EASE } }
	return (
		<div className={`toast-region${className ? ` ${className}` : ""}`} role="status" aria-live="polite">
			<AnimatePresence initial={false}>
				{toast ? (
					<motion.div key={toast.id} className="toast" {...toastMotion}>
						<CheckCircle size={18} weight="fill" />
						{toast.text}
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
	if (record.handoff) return `Packet ${record.handoff.id} sent to ${packetDestination(record)} · ${formatPacketTime(record.handoff.createdAt)}`
	if (record.phase >= OPERATIONS.length - 1) return `MAX verified ${DELIVERABLES.length} deliverables and routed the decision package.`
	if (!record.interviewClosed) {
		const total = scenario.ownerInterview.length
		return `MAX is interviewing you · question ${Math.min(record.interviewIndex + 1, total)} of ${total}`
	}
	if (record.phase === 4 && record.decision === "pending") return `Decision waiting · ${scenario.exception.title}`
	if (record.paused) return "MAX preserved the last verified checkpoint. Resume when you’re ready."
	return `MAX is ${OPERATION_ACTIVITY[record.phase] ?? "working the mission"} · routine work is continuing autonomously.`
}

const HUB_STATUS_TONE: Record<DiscoveryStatus, "warning" | "positive" | "neutral"> = {
	"needs-input": "warning",
	active: "positive",
	completed: "neutral",
	"handed-off": "positive",
}

// The one action a waiting row offers beside Resume.
function waitingAction(record: DiscoveryRecord) {
	return record.interviewClosed ? "Review decision" : "Continue interview"
}

/*
 * The hub is the ElevenLabs Agents list (mobbin 02042d42): the module's top bar,
 * a title with its actions, a dismissible "Get started with a template" tray,
 * one search field with filters, and a quiet table whose rows each carry a
 * colour mark. "Browse templates" opens the template browser (templates-browse)
 * over the list, so the list keeps its place underneath.
 */
function DiscoveryIndex({
	operationalPackages,
	records,
	trayOpen,
	browsing,
	onTrayOpenChange,
	onBrowseTemplates,
	onCloseTemplates,
	onOpenCommands,
	onNew,
	onNewFromTemplate,
	onResume,
	onReviewDecision,
}: {
	operationalPackages?: React.ReactNode
	records: DiscoveryRecord[]
	trayOpen: boolean
	browsing: boolean
	onTrayOpenChange: (open: boolean) => void
	onBrowseTemplates: () => void
	onCloseTemplates: () => void
	onOpenCommands: () => void
	onNew: () => void
	onNewFromTemplate: (brief: string) => void
	onResume: (record: DiscoveryRecord) => void
	onReviewDecision: (record: DiscoveryRecord) => void
}) {
	const reduced = Boolean(useReducedMotion())
	const [filter, setFilter] = useState<"all" | Exclude<DiscoveryStatus, "handed-off">>("all")
	const [query, setQuery] = useState("")
	const hubRef = useRef<HTMLDivElement>(null)
	const browseTriggerRef = useRef<HTMLElement | null>(null)
	const rowMotion = useRiseIn()
	const trayMotion = reduced ? {} : { initial: { height: 0 }, animate: { height: "auto" }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.24, ease: REVEAL_EASE } }
	const layerMotion = reduced ? {} : { initial: { y: 12, filter: "blur(3px)" }, animate: { y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: 8 }, transition: { duration: 0.26, ease: REVEAL_EASE } }
	const statuses = records.map(record => discoveryStatus(record))
	const countOf = (status: DiscoveryStatus) => statuses.filter(item => item === status).length
	const countFor = (group: Exclude<DiscoveryStatus, "handed-off">) => statuses.filter(item => discoveryFilterGroup(item) === group).length
	const waitingCount = countOf("needs-input")
	const normalizedQuery = query.trim().toLowerCase()
	const filtered = [...records]
		.filter(record => {
			const matchesFilter = filter === "all" || discoveryFilterGroup(discoveryStatus(record)) === filter
			const matchesQuery = !normalizedQuery || `${record.title} ${record.brief} ${SCENARIOS[record.scenarioKey].kicker}`.toLowerCase().includes(normalizedQuery)
			return matchesFilter && matchesQuery
		})
		.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
	const waiting = records.filter(record => discoveryStatus(record) === "needs-input")

	// The list stays mounted under the browser, out of reach, and takes focus back when it closes.
	const wasBrowsing = useRef(browsing)
	useEffect(() => {
		hubRef.current?.toggleAttribute("inert", browsing)
		if (wasBrowsing.current && !browsing) {
			const trigger = browseTriggerRef.current
			browseTriggerRef.current = null
			window.requestAnimationFrame(() => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }) })
		}
		wasBrowsing.current = browsing
	}, [browsing])
	const browse = (event: React.MouseEvent<HTMLElement>) => {
		browseTriggerRef.current = event.currentTarget
		onBrowseTemplates()
	}

	return (
		<div className="discovery-index-shell">
			<div className="discovery-index-hub" ref={hubRef} aria-hidden={browsing || undefined}>
				<header className="ds-topbar hub-topbar">
					<div className="ds-topbar-start"><span className="ds-topbar-title">Discover</span></div>
					<div className="ds-topbar-end">
						<DsButton size="sm" className="hub-jump" onClick={onOpenCommands} aria-keyshortcuts="Meta+K Control+K"><MagnifyingGlass size={14} />Jump to<kbd aria-hidden="true">⌘K</kbd></DsButton>
					</div>
				</header>
				<main className="discovery-index-main">
					<div className="hub-page">
						<header className="hub-head">
							<div className="hub-head-text">
								<h1 className="ds-page-title">Continue where MAX left off.</h1>
								<p className="ds-page-desc">Resume a Discovery, or give MAX a new outcome to investigate.</p>
								<section className="hub-summary" aria-label="Discovery workload summary">
									<span className={waitingCount ? "is-warning" : undefined}><i aria-hidden="true" />{waitingCount ? <><strong>{waitingCount}</strong> {waitingCount === 1 ? "needs" : "need"} your input</> : "Nothing needs your input"}</span>
									{countOf("active") ? <span className="is-positive"><i aria-hidden="true" /><strong>{countOf("active")}</strong> working autonomously</span> : null}
									{countOf("completed") ? <span><i aria-hidden="true" /><strong>{countOf("completed")}</strong> completed</span> : null}
									{countOf("handed-off") ? <span className="is-positive"><i aria-hidden="true" /><strong>{countOf("handed-off")}</strong> handed off</span> : null}
								</section>
							</div>
							<div className="hub-actions">
								<DsButton onClick={browse}>Browse templates</DsButton>
								<DsButton variant="primary" onClick={onNew}><Plus size={16} />New Discovery</DsButton>
							</div>
						</header>

						<AnimatePresence initial={false}>
							{trayOpen ? (
								<motion.section key="tray" className="hub-templates" aria-labelledby="hub-templates-heading" {...trayMotion}>
									<div className="hub-templates-inner">
										<div className="hub-templates-head">
											<div><h2 id="hub-templates-heading">Get started with a template</h2><p>MAX drafts the mission from the template; you review it before anything runs.</p></div>
											<button type="button" className="hub-templates-close" aria-label="Hide templates" onClick={() => onTrayOpenChange(false)}><X size={14} /></button>
										</div>
										<div className="hub-template-grid">
											{templates().slice(0, 3).map(template => (
												<button key={template.name} type="button" onClick={() => onNewFromTemplate(template.brief)}>
													<span className="hub-template-name"><Mark seed={template.name} size="xs" />{template.name}</span>
													<span className="hub-template-detail">{template.detail}</span>
												</button>
											))}
										</div>
										<button type="button" className="hub-templates-all" onClick={browse}>Browse all templates<ArrowRight size={12} /></button>
									</div>
								</motion.section>
							) : null}
						</AnimatePresence>

						{waiting.length ? (
							<section className="hub-waiting" aria-label="Needs your input">
								<p className="callout-line"><ShieldCheck size={16} />{waiting.length === 1 ? "One Discovery needs your input" : `${waiting.length} Discoveries need your input`}</p>
								<div className="hub-waiting-list">
									{waiting.slice(0, 3).map(record => (
										<button key={record.id} type="button" className="hub-waiting-row" onClick={() => onReviewDecision(record)}>
											<Mark seed={record.id} size="xs" />
											<span className="hub-waiting-title">{record.title}</span>
											<span className="hub-waiting-meta">{discoveryActivity(record)}</span>
											<span className="hub-waiting-action">{waitingAction(record)}<ArrowRight size={14} /></span>
										</button>
									))}
								</div>
							</section>
						) : null}

						<div className="discovery-index-toolbar">
							<DsSearchInput label="Search discoveries" value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery("")} placeholder="Search discoveries…" />
							<DsSegmentedTabs
								label="Filter discoveries"
								className="hub-filters"
								value={filter}
								onChange={setFilter}
								options={[
									{ value: "all", label: "All", count: records.length },
									{ value: "needs-input", label: "Needs input", count: countFor("needs-input") },
									{ value: "active", label: "Active", count: countFor("active") },
									{ value: "completed", label: "Completed", count: countFor("completed") },
								]} />
						</div>

						<div className="discovery-index-results" aria-live="polite">
							<DsTable
								aria-label="Discoveries"
								columns={["Name", "Status", "Stage", "Updated", ""]}
								template="var(--dsc-hub-cols)">
								<AnimatePresence initial={false}>
									{filtered.length ? filtered.map(record => {
										const status = discoveryStatus(record)
										const label = DISCOVERY_STATUS_LABEL[status]
										const stage = journeyProgress(record.phase, { interviewOpen: !record.interviewClosed })
										const action = status === "needs-input" ? waitingAction(record) : null
										return (
											<motion.div key={record.id} className={`hub-row-wrap${action ? " has-action" : ""}`} {...rowMotion}>
												<DsTableRow
													className={`discovery-record-card is-${status}`}
													onClick={() => onResume(record)}
													aria-label={`Resume ${record.title}, ${label}`}>
													<span className="ds-cell ds-cell-primary hub-name-cell">
														<Mark seed={record.id} size="sm" />
														<span>
															<strong className="discovery-record-title">{record.title}</strong>
															<small className="discovery-record-activity" title={discoveryActivity(record)}>{discoveryActivity(record)}</small>
														</span>
													</span>
													<span className="ds-cell">
														<DsBadge tone={HUB_STATUS_TONE[status]} dot={status === "active"}>{status === "handed-off" ? <Check size={12} weight="bold" aria-hidden="true" /> : null}{label}</DsBadge>
													</span>
													<span className="ds-cell hub-stage-cell" title={stage.label}>
														<span className="hub-stage-bar" aria-hidden="true"><span style={{ width: `${Math.round(((record.phase + 1) / OPERATIONS.length) * 100)}%` }} /></span>
														<span className="ds-cell-num">{stage.index}/{stage.total}</span>
													</span>
													<span className="ds-cell ds-meta"><time dateTime={record.updatedAt}>{relativeDiscoveryTime(record.updatedAt)}</time></span>
													{/* A waiting row's action is its own button beside the row (buttons don't nest);
													    the cell keeps its exact width so the columns line up either way. */}
													<span className="ds-cell ds-cell-end">
														{action ? <span className="hub-row-action-space" aria-hidden="true">{action}<ArrowRight size={14} /></span> : <CaretRight size={16} aria-hidden="true" />}
													</span>
												</DsTableRow>
												{action ? (
													<button
														type="button"
														className="discovery-record-review ds-text-button"
														aria-label={`${action} · ${record.title}`}
														title={record.interviewClosed ? SCENARIOS[record.scenarioKey].exception.title : "MAX is waiting on your next interview answer"}
														onClick={() => onReviewDecision(record)}>
														{action}<ArrowRight size={14} aria-hidden="true" />
													</button>
												) : null}
											</motion.div>
										)
									}) : (
										<DsEmptyState key="empty" role="status" title="No discoveries match that search." action={<DsButton size="sm" onClick={() => { setQuery(""); setFilter("all") }}>Clear filters</DsButton>}>
											Clear the search or choose a different status.
										</DsEmptyState>
									)}
								</AnimatePresence>
							</DsTable>
						</div>
						{!query.trim() && (filter === "all" || filter === "completed") ? operationalPackages : null}
					</div>
				</main>
			</div>
			<AnimatePresence>
				{browsing ? (
					<motion.div key="templates" className="tpl-layer" {...layerMotion}>
						<TemplateBrowser onBack={onCloseTemplates} onUse={onNewFromTemplate} />
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	)
}

/*
 * The template browser is the ElevenLabs "Browse templates" page
 * (templates-browse): a title, one search field, category chips and a
 * two-column grid of marked cards, with the chosen template previewed beside
 * it and one filled "Use template" action.
 */
function TemplateBrowser({ onBack, onUse }: { onBack: () => void; onUse: (brief: string) => void }) {
	const [query, setQuery] = useState("")
	const [category, setCategory] = useState<"All" | TemplateCategory>("All")
	const [selected, setSelected] = useState<string>(() => templates()[0].name)
	const headingRef = useRef<HTMLHeadingElement>(null)
	const reduced = Boolean(useReducedMotion())
	const cardMotion = useRiseIn()
	const previewMotion = reduced ? {} : { initial: { y: 6, filter: "blur(3px)" }, animate: { y: 0, filter: "blur(0px)" }, transition: { duration: 0.22, ease: REVEAL_EASE } }
	useEffect(() => { headingRef.current?.focus({ preventScroll: true }) }, [])
	const normalized = query.trim().toLowerCase()
	const shown = templates().filter(template => (category === "All" || template.category === category) && (!normalized || `${template.name} ${template.detail} ${template.category} ${template.brief}`.toLowerCase().includes(normalized)))
	const current = shown.find(template => template.name === selected) ?? shown[0] ?? null
	const scenario = current ? SCENARIOS[scenarioForBrief(current.brief).key] : null
	const systems = scenario ? [...new Set(scenario.sources.map(source => source.system))] : []
	const roles = scenario ? scenario.people.map(person => person.role) : []

	return (
		<div className="tpl-browser" onKeyDown={event => {
			if (event.key !== "Escape" || event.defaultPrevented) return
			// Escape first clears a query, then leaves.
			if (event.target instanceof HTMLInputElement && event.target.value) return
			event.preventDefault()
			onBack()
		}}>
			<header className="ds-topbar hub-topbar">
				<div className="ds-topbar-start">
					<button type="button" className="ds-crumb" onClick={onBack}><ArrowLeft />Discoveries</button>
					<span className="ds-crumb-sep" aria-hidden="true">/</span>
					<span className="ds-crumb-current">Templates</span>
				</div>
			</header>
			<div className="tpl-body">
				<main className="tpl-main" aria-labelledby="tpl-heading">
					<h1 id="tpl-heading" ref={headingRef} tabIndex={-1} className="ds-page-title">Browse templates</h1>
					<DsSearchInput label="Search templates" value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery("")} placeholder="Search templates…" />
					<div className="tpl-chips" role="group" aria-label="Template category">
						{(["All", ...TEMPLATE_CATEGORIES] as const).map(item => (
							<button key={item} type="button" className="tpl-chip" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
						))}
					</div>
					{shown.length ? (
						<div className="tpl-grid">
							<AnimatePresence initial={false} mode="popLayout">
								{shown.map(template => (
									<motion.button
										key={template.name}
										type="button"
										className="tpl-card"
										aria-pressed={current?.name === template.name}
										aria-describedby={`tpl-${template.name.replace(/\W+/g, "-")}`}
										onClick={() => setSelected(template.name)}
										onDoubleClick={() => onUse(template.brief)}
										{...cardMotion}>
										<span className="tpl-card-name"><Mark seed={template.name} size="xs" />{template.name}</span>
										<span className="tpl-card-detail" id={`tpl-${template.name.replace(/\W+/g, "-")}`}>{template.detail}</span>
									</motion.button>
								))}
							</AnimatePresence>
						</div>
					) : (
						<DsEmptyState role="status" title={normalized ? `No templates match “${query.trim()}”.` : "No templates in this category."} action={<DsButton size="sm" onClick={() => { setQuery(""); setCategory("All") }}>Show all templates</DsButton>}>
							Try another word, or browse every category.
						</DsEmptyState>
					)}
				</main>
				<aside className="tpl-preview" aria-label="Template preview">
					{current && scenario ? (
						<motion.div key={current.name} className="tpl-preview-inner" {...previewMotion}>
							<div className="tpl-preview-head">
								<Mark seed={current.name} size="sm" />
								<div>
									<h2>{current.name}</h2>
									<p>{current.category}</p>
								</div>
							</div>
							<p className="tpl-preview-brief">{current.brief}</p>
							<dl className="tpl-facts">
								<div><dt><Database size={16} />Sources</dt><dd>{scenario.sources.length} connected · {systems.join(", ")}</dd></div>
								<div><dt><UsersThree size={16} />Stakeholders</dt><dd>{roles.slice(0, 3).join(", ")}{roles.length > 3 ? ` +${roles.length - 3}` : ""}</dd></div>
								<div><dt><ChatsCircle size={16} />Owner interview</dt><dd>{scenario.ownerInterview.length} questions · text or voice</dd></div>
								<div><dt><Package size={16} />Outputs</dt><dd>{DELIVERABLES.length} deliverables in one decision package</dd></div>
							</dl>
							<p className="tpl-preview-note">MAX drafts the mission from this template. You review it before anything runs.</p>
							<DsButton variant="primary" className="tpl-use" onClick={() => onUse(current.brief)}>Use template<ArrowRight size={14} /></DsButton>
						</motion.div>
					) : (
						<p className="tpl-preview-empty">Choose a template to see what MAX sets up.</p>
					)}
				</aside>
			</div>
		</div>
	)
}

/*
 * Create. max-ai-platform's brief intake is a state machine, not a wizard:
 * idle, drafting, an optional clarification round, reviewing with the Mission
 * Authority Review gate, then committing. The screens are the ElevenLabs
 * create-agent flow (mobbin 88ed2c5d, 664c7ce6, 49af5195): one centred column,
 * a close button, page dots, and Back beside the one filled action. The
 * template row is the Agents list's "Get started with a template" (02042d42),
 * and the authority confirmation is the audiobook submission check (e0c00815).
 */
type IntakeState = "idle" | "drafting" | "clarifying" | "reviewing" | "committing"
type MissionDraft = { title: string; decision: string; deadline: string }

const BRIEF_LIMIT = 600
const BRIEF_EXAMPLES = [
	"Decide whether we can automate month-end reconciliation without weakening controls…",
	"Redesign vendor onboarding so critical suppliers clear review in under ten days…",
	"Define how ServiceNow and the controls platform share change approvals…",
]
const TEMPLATE_CATEGORIES = ["Finance & IT", "Risk & compliance", "Deals"] as const
type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]
type DiscoveryTemplate = { name: string; category: TemplateCategory; detail: string; brief: string }
const REVENUE_TEMPLATE: DiscoveryTemplate = { name: "Revenue reconciliation", category: "Finance & IT", detail: "SQL Server ledger to AWS, reconciled every morning", brief: SCENARIOS.revenue.brief }
const SERVICENOW_TEMPLATE: DiscoveryTemplate = { name: "AP invoice exceptions", category: "Finance & IT", detail: "ServiceNow triage and approval authority", brief: SCENARIOS.servicenow.brief }
const ORDERSYNC_TEMPLATE: DiscoveryTemplate = { name: "Salesforce–SAP order sync", category: "Finance & IT", detail: "Customer master and posting integrity", brief: SCENARIOS.ordersync.brief }
const S4HANA_TEMPLATE: DiscoveryTemplate = { name: "S/4HANA conversion", category: "Finance & IT", detail: "Custom code disposition and readiness", brief: SCENARIOS.s4hana.brief }
// The first four are the ones Create features and the first three fill the hub tray; the browser shows all.
// The customer demo leads with its own template; everywhere else it sits with the other Finance & IT missions.
const EVERYDAY_TEMPLATES: ReadonlyArray<DiscoveryTemplate> = [
	{ name: "ERP modernization", category: "Finance & IT", detail: "Workday, MuleSoft and ServiceNow in one change process", brief: "Assess ERP modernization across ServiceNow, MuleSoft and Workday Financials. Define the future financial-change process, integration boundaries, controls and delivery roadmap." },
	{ name: "ServiceNow integration", category: "Finance & IT", detail: "Change approvals, evidence and reconciliation", brief: SCENARIOS.enterprise.brief },
	{ name: "Vendor risk & onboarding", category: "Risk & compliance", detail: "Tiering, due diligence and decision rights", brief: SCENARIOS.tprm.brief },
	{ name: "Acquisition diligence", category: "Deals", detail: "Value creation, execution risk and Day 1", brief: SCENARIOS.diligence.brief },
	{ name: "Month-end close automation", category: "Finance & IT", detail: "Automate reconciliations without weakening SOX controls", brief: "Decide whether we can automate month-end reconciliation for the close without weakening SOX controls. Read the close calendar, reconciliation evidence and control catalog, interview the Controller and control owners, and recommend the target close process." },
	{ name: "SOX control remediation", category: "Risk & compliance", detail: "Close open findings on financial change approvals", brief: "Resolve the open SOX findings on financial change approvals. Read the control catalog, incident history and audit workpapers, interview control owners and Internal Audit, and define the remediation plan and evidence standard." },
	{ name: "Supplier offboarding", category: "Risk & compliance", detail: "Access, data return and final payments in five days", brief: "Redesign supplier offboarding so access, data return and final payments close within five days of contract end. Read vendor files, access records and contract approvals, interview Procurement, Security and Legal, and recommend the control sequence." },
	{ name: "Carve-out Day 1 readiness", category: "Deals", detail: "Separation claims, TSAs and the first 100 days", brief: "Assess Day 1 readiness for the carve-out of the analytics business. Read the data room and deal tracker, interview functional owners, reconcile separation claims against evidence, and prepare the investment committee Day 1 plan." },
	REVENUE_TEMPLATE,
	SERVICENOW_TEMPLATE,
	ORDERSYNC_TEMPLATE,
	S4HANA_TEMPLATE,
]
/* A customer demo leads with its own template; everywhere else the order is the everyday one. */
const templates = () => {
	const demo = demoSession()
	if (!demo) return EVERYDAY_TEMPLATES
	const lead = EVERYDAY_TEMPLATES.find((template) => template.name === demoScript(demo.id).templateName)
	return lead ? [lead, ...EVERYDAY_TEMPLATES.filter((template) => template !== lead)] : EVERYDAY_TEMPLATES
}

/* A demo whose template is missing would open on someone else's mission; fail loudly instead. */
for (const script of Object.values(DEMO_SCRIPTS)) {
	if (!EVERYDAY_TEMPLATES.some((template) => template.name === script.templateName)) {
		throw new Error(`Demo "${script.id}" names template "${script.templateName}", which Discover does not offer`)
	}
}

// A brief that names no decision, or is too short to bound one, earns one clarifying round.
function briefNeedsClarification(brief: string) {
	const words = brief.trim().split(/\s+/).filter(Boolean)
	return words.length < 8 || !/\b(decide|decision|define|design|redesign|assess|approve|choose|evaluate|determine|establish|integrate|resolve|reduce|investigate|automate|improve)\w*/i.test(brief)
}

function SetupScreen({
	missionBrief,
	onMissionBriefChange,
	onBack,
	onStart,
	savedScenarios = [],
}: {
	missionBrief: string
	onMissionBriefChange: (value: string) => void
	onBack: () => void
	onStart: (draft: MissionDraft) => void
	/* The scenarios of the saved Discoveries, so the customer demo can say when a new one replaces a run. */
	savedScenarios?: ScenarioKey[]
}) {
	const [intake, setIntake] = useState<IntakeState>("idle")
	const [clarification, setClarification] = useState("")
	// The owner's answer to the clarifying question; it names the decision and its deadline.
	const [answered, setAnswered] = useState("")
	// The brief as it stood before an answer was appended to it; it states the outcome.
	const [outcomeBrief, setOutcomeBrief] = useState("")
	const [reviewed, setReviewed] = useState(false)
	const [draft, setDraft] = useState<MissionDraft>({ title: "", decision: "", deadline: "" })
	const [briefFocusedByPointer, setBriefFocusedByPointer] = useState(false)
	const briefRef = useRef<HTMLTextAreaElement | null>(null)
	// A step the owner moved to takes focus when it mounts, so nobody is left on <body>.
	const stepFocusPending = useRef(false)
	const hasMission = Boolean(missionBrief.trim())
	const route = scenarioForBrief(missionBrief)
	const scenario = SCENARIOS[route.key]
	const step = intake === "idle" ? 0 : intake === "committing" ? 2 : 1
	// In a customer demo, a new Discovery of the same scenario replaces the earlier one and starts
	// Agentix again from zero; when there is an earlier one, the row says so beside the button.
	const demo = demoSession()
	const restartsAgentix = !!demo && !!scenario.handoff && route.score > 0 && savedScenarios.includes(route.key)
	const demoNoteId = useId()
	useEffect(() => {
		// Focus the brief so typing can begin immediately — but never steal
		// focus while the Discovery stage is hidden inside the portal.
		const brief = briefRef.current
		if (!brief?.offsetParent) return
		brief.focus({ preventScroll: true })
	}, [])
	useEffect(() => {
		if (intake !== "drafting") return
		const timer = window.setTimeout(() => {
			// MAX drafts from what the owner wrote. A scenario only fills what they left
			// unsaid, and only when the brief is actually about that scenario.
			const matched = route.score > 0
			stepFocusPending.current = true
			setDraft({
				title: namedMission(outcomeBrief || missionBrief) ?? missionTitle(outcomeBrief || missionBrief),
				decision: answered ? draftDecision(answered) : matched ? scenario.objective : `${firstSentence(missionBrief)}.`,
				deadline: draftDeadline(`${answered} ${missionBrief}`) || (matched && !answered ? scenario.deadline : ""),
			})
			setReviewed(false)
			setIntake("reviewing")
		}, prefersInstantMotion() ? 0 : 1300)
		return () => window.clearTimeout(timer)
	}, [answered, intake, missionBrief, outcomeBrief, route.score, scenario])
	useEffect(() => {
		if (intake !== "committing") return
		const timer = window.setTimeout(() => onStart(draft), prefersInstantMotion() ? 0 : 520)
		return () => window.clearTimeout(timer)
	}, [intake, draft, onStart])

	const moveTo = (next: IntakeState) => {
		stepFocusPending.current = true
		setIntake(next)
	}
	const focusStep = useCallback((node: HTMLElement | null) => {
		if (!node || !stepFocusPending.current) return
		stepFocusPending.current = false
		node.focus({ preventScroll: true })
	}, [])
	const attachBrief = useCallback((node: HTMLTextAreaElement | null) => {
		briefRef.current = node
		focusStep(node)
	}, [focusStep])

	const beginDrafting = () => {
		if (!hasMission) return
		setAnswered("")
		setOutcomeBrief("")
		moveTo(briefNeedsClarification(missionBrief) ? "clarifying" : "drafting")
	}
	const answerClarification = () => {
		const answer = clarification.trim()
		if (!answer) return
		setOutcomeBrief(missionBrief)
		setAnswered(answer)
		onMissionBriefChange(`${missionBrief.trim().replace(/[.!?]*$/, ".")} ${answer}`)
		setClarification("")
		moveTo("drafting")
	}
	// Back returns the brief as the owner wrote it, without the appended answer.
	const backToBrief = () => {
		if (outcomeBrief) onMissionBriefChange(outcomeBrief)
		setAnswered("")
		setOutcomeBrief("")
		moveTo("idle")
	}

	const authority = [
		{ icon: <Target size={16} />, label: "Business outcome", value: firstSentence(outcomeBrief || missionBrief) },
		{ icon: <EnvelopeSimple size={16} />, label: "External sends", value: "Up to 3, each approved by you" },
		{ icon: <ChatsCircle size={16} />, label: "Interview modalities", value: "Text · Voice · Workshop" },
		{ icon: <ShieldCheck size={16} />, label: "Approval topology", value: "You approve exceptions; routine work runs" },
		{ icon: <Database size={16} />, label: "Evidence sources", value: `${scenario.sources.length} connected · ${scenario.sources.map(source => source.system).join(", ")}` },
		// The workspace MAX may contact is the one its stakeholders are in, not a fixed name.
		{ icon: <Globe size={16} />, label: "Recipient domains", value: recipientDomains(scenario) },
	]

	return (
		<div className="create-flow">
			<button className="create-close" type="button" aria-label="All discoveries" title="Close" onClick={onBack}><X size={16} /></button>
			<div className="create-scroll">
				<AnimatePresence mode="wait" initial={false}>
					{intake === "idle" ? (
						<motion.div key="idle" className="create-step" {...riseIn}>
							<header className="create-head">
								<h1>What should MAX accomplish?</h1>
								<p>Describe the decision and the outcome. MAX will work out the investigation.</p>
							</header>
							<div className="ds-field create-field">
								<label htmlFor="discovery-brief">Discovery brief <span aria-hidden="true">*</span></label>
								<div className={`brief-editor${briefFocusedByPointer ? " is-pointer-focused" : ""}`}>
									<textarea
										id="discovery-brief"
										ref={attachBrief}
										value={missionBrief}
										maxLength={BRIEF_LIMIT}
										onChange={(event) => onMissionBriefChange(event.target.value)}
										onPointerDown={() => setBriefFocusedByPointer(true)}
										onBlur={() => setBriefFocusedByPointer(false)}
										aria-label="Discovery brief"
										onKeyDown={event => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); beginDrafting() } }} />
									<CyclingPlaceholder items={BRIEF_EXAMPLES} active={!hasMission} />
									<span className="brief-count">{missionBrief.length}/{BRIEF_LIMIT}</span>
								</div>
							</div>

							<section className="create-templates" aria-labelledby="template-heading">
								<div className="create-templates-head">
									<div><h2 id="template-heading">Start from a template</h2><p>Each fills the brief; edit it before MAX drafts.</p></div>
								</div>
								<div className="create-template-grid">
									{templates().slice(0, 4).map((template) => (
										<button type="button" key={template.name} aria-label={template.name} aria-pressed={missionBrief === template.brief} aria-describedby={`template-${template.name.replace(/\W+/g, "-")}`} onClick={() => { onMissionBriefChange(template.brief); briefRef.current?.focus() }}>
											<Mark seed={template.name} size="xs" />
											<span className="template-name">{template.name}</span>
											<span className="template-detail" id={`template-${template.name.replace(/\W+/g, "-")}`}>{template.detail}</span>
										</button>
									))}
								</div>
							</section>

							<div className="create-note"><ShieldCheck size={16} /><p><strong>Routine work is pre-authorized</strong> Novel recipients and material exceptions come back to you.</p></div>

							<div className="create-actions">
								<span className="create-hint"><Database size={14} />Connected sources are scoped automatically</span>
								<DsButton variant="primary" onClick={beginDrafting} disabled={!hasMission}>Start autonomous Discovery</DsButton>
							</div>
						</motion.div>
					) : intake === "clarifying" ? (
						<motion.div key="clarifying" className="create-step" {...riseIn}>
							<header className="create-head">
								<h1>One question before MAX drafts</h1>
								<p>Your brief does not yet name the decision this Discovery must support.</p>
							</header>
							<div className="create-question">
								<img src={publicAsset("maxion-logo-gradient.svg")} alt="" />
								<p><strong>MAX</strong>Which decision should the package support, and by when does it need to be made?</p>
							</div>
							<div className="ds-field create-field">
								<label htmlFor="clarification-answer">Your answer</label>
								<textarea
									id="clarification-answer"
									ref={focusStep}
									className="ds-textarea"
									rows={3}
									value={clarification}
									onChange={event => setClarification(event.target.value)}
									onKeyDown={event => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && clarification.trim()) { event.preventDefault(); answerClarification() } }}
									placeholder="For example: approve the redesigned process at the October executive review, due 14 Oct" />
							</div>
							<div className="create-actions">
								<DsButton onClick={backToBrief}><CaretLeft size={14} />Back</DsButton>
								<DsButton variant="primary" disabled={!clarification.trim()} onClick={answerClarification}>Continue</DsButton>
							</div>
						</motion.div>
					) : intake === "drafting" ? (
						<motion.div key="drafting" className="create-step" {...riseIn} role="status" aria-live="polite">
							<header className="create-head">
								<h1 ref={focusStep} tabIndex={-1}><ShimmerText>MAX is drafting the mission</ShimmerText></h1>
								<p>Bounding the objective, the decision and the authority from your brief.</p>
							</header>
							<div className="create-skeleton" aria-hidden="true">
								{[0, 1, 2, 3].map(row => <div key={row}><span /><span /></div>)}
							</div>
						</motion.div>
					) : (
						<motion.div key="reviewing" className="create-step is-review" {...riseIn}>
							<header className="create-head">
								<h1 ref={focusStep} tabIndex={-1}>Review the mission</h1>
								<p>MAX drafted this from your brief. Edit anything before it becomes the mission.</p>
							</header>
							<div className="ds-field create-field">
								<label htmlFor="mission-name">Mission name <span aria-hidden="true">*</span></label>
								<div className="create-input"><input id="mission-name" className="ds-input" maxLength={MISSION_NAME_LIMIT} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /><span className="brief-count">{draft.title.length}/{MISSION_NAME_LIMIT}</span></div>
							</div>
							<div className="ds-field create-field">
								<label htmlFor="mission-decision">Decision to support <span aria-hidden="true">*</span></label>
								<textarea id="mission-decision" className="ds-textarea" rows={2} value={draft.decision} onChange={event => setDraft({ ...draft, decision: event.target.value })} />
							</div>
							<div className="create-pair">
								<div className="ds-field create-field">
									<label htmlFor="mission-deadline">Decision deadline</label>
									<input id="mission-deadline" className="ds-input" value={draft.deadline} placeholder="For example: Steering committee · 14 Oct" onChange={event => setDraft({ ...draft, deadline: event.target.value })} />
								</div>
								<div className="ds-field create-field">
									<span className="create-label">Completion criteria</span>
									<p className="create-static">A decision package with cited evidence, accountable owners and a clear next action.</p>
								</div>
							</div>

							<section className="authority-review" aria-labelledby="authority-review-heading">
								<div className="authority-review-head">
									<h2 id="authority-review-heading">Mission authority review</h2>
									<p>What MAX may do on its own once the Discovery starts.</p>
								</div>
								<ul>
									{authority.map(item => (
										<li key={item.label}>{item.icon}<span className="authority-label">{item.label}</span><span className="authority-value" title={item.value}>{item.value}</span></li>
									))}
								</ul>
							</section>

							{/* The confirmation is one row, as the reference's "Chat only" row: the check and what it confirms. */}
							<label className="create-confirm">
								<input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} aria-label="Mission authority reviewed" />
								<span><strong>I have reviewed what MAX may do without asking <span aria-hidden="true">*</span></strong></span>
							</label>

							<div className="create-actions">
								<DsButton onClick={backToBrief} disabled={intake === "committing"}><CaretLeft size={14} />Back</DsButton>
								{restartsAgentix && demo ? <p id={demoNoteId} className="create-demo-note" role="note">Customer demo: creating this replaces the earlier {demoScript(demo.id).replacesLabel} Discovery and starts Agentix again from zero.</p> : null}
								{/* This row is pinned; in a short window the tick that unlocks Create scrolls out of sight, so
								    the button has to say what it is waiting for rather than just sit there greyed out. */}
								{!reviewed && draft.title.trim() && draft.decision.trim() ? <p className="create-blocker">Tick the authority review above</p> : null}
								<DsButton variant="primary" aria-describedby={restartsAgentix ? demoNoteId : undefined} disabled={!reviewed || !draft.title.trim() || !draft.decision.trim() || intake === "committing"} onClick={() => setIntake("committing")}>
									{intake === "committing" ? <><CircleNotch size={14} className="spin" />Creating</> : "Create Discovery"}
								</DsButton>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
			<ol className="create-dots" aria-label={`Step ${step + 1} of 3`}>
				{["Brief", "Review", "Create"].map((label, index) => <li key={label} className={index === step ? "is-active" : index < step ? "is-done" : ""}><span className="sr-only">{label}</span></li>)}
			</ol>
		</div>
	)
}

// The real module runs a named preparation step machine and enters the workspace
// once it reaches "ready". Each step holds for a different beat — real work does
// not land on a metronome.
function preparingSteps(scenarioKey: ScenarioKey, deadline: string) {
	const scenario = SCENARIOS[scenarioKey]
	const records = scenario.sources.reduce((total, source) => total + Number(source.records.replace(/[^0-9]/g, "")), 0)
	const detail: Record<PreparationStepId, string> = {
		establishing_mission: deadline ? `Objective, completion condition and decision horizon normalized · ${deadline}` : "Objective and completion condition normalized · no deadline set",
		checking_authority: "Authority envelope, external-send ceiling and recipient domains confirmed",
		binding_sources: `${scenario.sources.length} permitted scopes · ${records.toLocaleString()} records in scope`,
		building_inquiry: `${scenario.inquiries.length} inquiries sequenced · ${DELIVERABLES.length} outputs planned`,
		starting_interview: "Owner thread opened with the first evidence-led question",
		mapping_people: `${scenario.people.length} accountable owners matched to the open evidence gaps`,
		ready: "Workspace ready",
	}
	// Each hold is how long a step stays current; "ready" is how long Ready shows before the workspace opens.
	const hold: Record<PreparationStepId, number> = {
		establishing_mission: 360, checking_authority: 300, binding_sources: 560, building_inquiry: 520,
		starting_interview: 420, mapping_people: 500, ready: 520,
	}
	return PREPARATION_STEPS.map(step => ({ id: step.id, label: step.label, detail: detail[step.id], hold: hold[step.id] }))
}

/*
 * Preparation is the ElevenLabs "being prepared" screen (mobbin 560e2903): the
 * orb, a large two-line title, one line of context and the one action, with the
 * close button every create step has. The step machine below it is Aceternity's
 * multi-step loader, and it decides when the workspace opens: once it has landed
 * on Ready and held it. "Enter Thread" skips ahead; closing leaves MAX working.
 */
function PreparingScreen({ scenarioKey, missionTitle, deadline, onEnter, onClose }: { scenarioKey: ScenarioKey; missionTitle: string; deadline: string; onEnter: () => void; onClose: () => void }) {
	const reducedMotion = Boolean(useReducedMotion())
	const steps = useMemo(() => preparingSteps(scenarioKey, deadline), [scenarioKey, deadline])
	const [landed, setLanded] = useState(reducedMotion ? steps.length : 1)
	const done = landed >= steps.length
	const onEnterRef = useRef(onEnter)
	onEnterRef.current = onEnter

	useEffect(() => {
		if (done) {
			const timer = window.setTimeout(() => onEnterRef.current(), reducedMotion ? 0 : steps[steps.length - 1].hold)
			return () => window.clearTimeout(timer)
		}
		const timer = window.setTimeout(() => setLanded((current) => current + 1), steps[landed - 1]?.hold ?? 520)
		return () => window.clearTimeout(timer)
	}, [done, landed, reducedMotion, steps])

	const current = done ? steps.length : landed - 1
	return (
		<div className="preparing-shell">
			<button className="create-close" type="button" aria-label="All discoveries" title="Close · MAX keeps preparing" onClick={onClose}><X size={16} /></button>
			<div className="preparing-scroll">
				<div className="preparing-center" role="status" aria-live="polite">
					<Orb active={!done} />
					<h1>MAX is preparing<br />the mission.</h1>
					<p className="preparing-mission">{missionTitle}</p>
					<p className="preparing-progress">{landed} of {steps.length} · {done ? steps[steps.length - 1].label : steps[current].label}</p>
					<div className="preparing-steps">
						<StepLoader label="Preparation steps" current={current} steps={steps.map((step, index) => ({ id: step.id, label: step.label, detail: index === current || (done && index === steps.length - 1) ? step.detail : undefined }))} />
					</div>
					<div className="preparing-actions">
						<DsButton variant="primary" className="preparing-enter" onClick={onEnter}>Enter Thread<ArrowRight size={14} /></DsButton>
						<p className="preparing-footnote">You can leave this screen. MAX continues from the saved mission state.</p>
					</div>
				</div>
			</div>
		</div>
	)
}

/*
 * The cockpit frame is the ElevenLabs agent page (mobbin 9785c0b7, 1610e881):
 * a breadcrumb with a status pill, quiet pills and outline actions on the right
 * ending in the one filled action, and an underline tab strip beneath. The
 * filled action here is the journey's end, "Continue to Plan", as "Publish" is
 * the agent's. Everything else lives behind the overflow menu.
 */
function WorkspaceShell({
	scenarioKey,
	missionTitle,
	deadline,
	view,
	onViewChange,
	phase,
	paused,
	interviewClosed,
	interviewIndex,
	decision,
	handoffId,
	handoffBlocked,
	onTogglePause,
	onOpenIndex,
	onNewDiscovery,
	onJumpToDecision,
	onSteer,
	onOpenSetup,
	onContinueToAgentix,
	onOpenPlan,
	onOpenSources,
	overlay,
	children,
}: {
	scenarioKey: ScenarioKey
	missionTitle: string
	deadline: string
	view: View
	onViewChange: (view: View) => void
	phase: number
	paused: boolean
	interviewClosed: boolean
	interviewIndex: number
	decision: DecisionState
	handoffId: string | null
	/* The charter still needs the owner: the handoff opens, but it is not the page's main action. */
	handoffBlocked: boolean
	onTogglePause: () => void
	onOpenIndex: () => void
	onNewDiscovery: () => void
	onJumpToDecision: () => void
	onSteer: () => void
	onOpenSetup: () => void
	onContinueToAgentix: () => void
	/* Only when a shell holds Plan; the standalone route has nowhere to send the owner. */
	onOpenPlan?: () => void
	onOpenSources: () => void
	/* Floats over the panes and keeps clear of the rail when it shows. */
	overlay?: React.ReactNode
	children: React.ReactNode
}) {
	const complete = phase >= OPERATIONS.length - 1
	const decisionPending = interviewClosed && phase === 4 && decision === "pending"
	const handedOff = Boolean(handoffId)
	const destination = handoffDestination(scenarioKey)
	// Something the owner must answer stays visible through their own pause. The handed state
	// keeps the green the Package reader gives it.
	const status = handedOff
		? { label: `Handed to ${destination}`, tone: "positive" as const }
		: complete ? { label: "Package ready", tone: "positive" as const }
		: !interviewClosed ? { label: "Owner interview", tone: "warning" as const }
		: decisionPending ? { label: "1 decision needs you", tone: "warning" as const }
		: paused ? { label: "Paused", tone: "neutral" as const }
		: { label: "Running", tone: "positive" as const }
	const showDock = view === "autonomy" || view === "workshop"
	const pauseLabel = paused ? "Resume" : "Pause"
	// A finished run takes questions, not direction.
	const steerLabel = complete ? "Ask MAX" : "Steer MAX"
	const readyNoteId = useId()
	// On a phone Pause and Setup ride in the overflow menu so the bar keeps one
	// row of actions; cockpit.css hides their bar buttons at the same query.
	const phoneActions = useMediaQuery(PHONE_ACTIONS_QUERY)
	return (
		<div className="workspace-shell">
			<div className="workspace-body">
				<header className="workspace-header ds-topbar">
					<div className="ds-topbar-start">
						<button className="workspace-crumb" type="button" onClick={onOpenIndex} aria-label="All discoveries" title="All discoveries"><ArrowLeft size={14} /><span>Discoveries</span></button>
						<span className="ds-crumb-sep" aria-hidden="true">/</span>
						<span className="workspace-mission" title={missionTitle}>{missionTitle}</span>
						<button type="button" className={`workspace-status is-${status.tone}`} aria-label="Discovery status" title={`${status.label} · ${decisionPending ? "Jump to the decision" : "Open the owner thread"}`} onClick={onJumpToDecision}>
							<span aria-hidden="true" /><span className="workspace-status-label">{status.label}</span>
						</button>
					</div>
					<div className="ds-topbar-end">
						{deadline ? <span className="workspace-pill">{deadline}</span> : null}
						<DsButton size="sm" className="workspace-action workspace-steer" title={steerLabel} onClick={onSteer}><ChatCircleText size={14} /><span className="workspace-action-label">{steerLabel}</span></DsButton>
						{/* A finished run has nothing to pause; the status pill already says so. */}
						{complete ? null : (
							<DsButton size="sm" className="workspace-action workspace-pause" title={pauseLabel} onClick={onTogglePause}>
								{paused ? <Play size={14} weight="fill" /> : <Pause size={14} weight="fill" />}
								<span className="workspace-action-label">{pauseLabel}</span>
							</DsButton>
						)}
						{/* After the handoff the packet is Plan's: the end of the bar becomes the way there. */}
						{handedOff
							? onOpenPlan ? <DsButton size="sm" className="workspace-open-plan" onClick={onOpenPlan}><ArrowUpRight size={14} />Open in {destination}</DsButton> : null
							: <DsButton
								size="sm"
								variant={complete && !handoffBlocked ? "primary" : "secondary"}
								disabled={!complete}
								title={!complete ? "Available once the package is verified" : handoffBlocked ? "The project charter needs your approval first" : undefined}
								onClick={onContinueToAgentix}>
								Continue to {destination}
							</DsButton>}
						<DsButton size="sm" icon className="workspace-setup" aria-label="Open setup" title="Setup" onClick={onOpenSetup}><GearSix size={16} /></DsButton>
						<OverflowMenu label="More Discovery actions" items={[
							...(phoneActions && !complete ? [{ label: pauseLabel, onSelect: onTogglePause }] : []),
							...(phoneActions ? [{ label: "Setup", onSelect: onOpenSetup }] : []),
							{ label: "New Discovery", onSelect: onNewDiscovery },
						]} />
					</div>
				</header>

				<nav className="workspace-tabs ds-tabstrip" aria-label="Discovery views">
					{viewMeta.filter((item) => item.id !== "workshop" || hasWorkshopSession(phase)).map((item) => (
						<button key={item.id} type="button" className={view === item.id ? "active" : ""} onClick={() => onViewChange(item.id)} aria-current={view === item.id ? "page" : undefined} aria-describedby={item.id === "package" && complete && !handedOff ? readyNoteId : undefined}>
							{item.label}
							{/* The dot is the tab's description, so the tab keeps its one-word name. */}
							{item.id === "package" && complete && !handedOff ? <><span className="tab-dot" aria-hidden="true" /><span id={readyNoteId} hidden>Ready to hand off</span></> : null}
							{view === item.id ? <motion.span layoutId="discovery-tab-underline" className="tab-underline" transition={{ type: "spring", stiffness: 520, damping: 40 }} /> : null}
						</button>
					))}
				</nav>

				<div className={`workspace-panes${showDock ? " has-dock" : ""}`}>
					<main className="workspace-content">{children}</main>
					{showDock ? (
						<NeedsYouDock
							scenarioKey={scenarioKey}
							phase={phase}
							paused={paused}
							decision={decision}
							interviewClosed={interviewClosed}
							interviewIndex={interviewIndex}
							handoffId={handoffId}
							onJumpToDecision={onJumpToDecision}
							onOpenThread={() => onViewChange("thread")}
							onOpenSources={onOpenSources} />
					) : null}
				</div>
				{overlay}
			</div>
		</div>
	)
}

/* The agent page's "…" menu (mobbin 9e0eefdb): a small popover list. */
function OverflowMenu({ label, items }: { label: string; items: Array<{ label: string; onSelect: () => void }> }) {
	const [open, setOpen] = useState(false)
	const rootRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	useEffect(() => {
		if (!open) return
		const onPointer = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return
			event.stopPropagation()
			setOpen(false)
			triggerRef.current?.focus()
		}
		document.addEventListener("pointerdown", onPointer)
		document.addEventListener("keydown", onKey, true)
		rootRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus()
		return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey, true) }
	}, [open])
	return (
		// Focus that moves anywhere outside the menu closes it, as a click outside does.
		<div className="overflow-menu" ref={rootRef} onBlur={event => { if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
			<DsButton ref={triggerRef} size="sm" icon aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(current => !current)}><DotsThree size={16} weight="bold" /></DsButton>
			{open ? (
				<div className="overflow-menu-list" role="menu" aria-label={label}
					onKeyDown={event => {
						// Menu items are one Tab stop: Tab moves on and closes the menu, Shift+Tab returns to its button.
						if (event.key === "Tab" && event.shiftKey) { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); return }
						if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
						event.preventDefault()
						const entries = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]"))
						const index = entries.indexOf(document.activeElement as HTMLElement)
						const next = event.key === "Home" ? 0 : event.key === "End" ? entries.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length
						entries[next]?.focus()
					}}>
					{/* Focus goes back to the trigger first, so a drawer an item opens restores focus there. */}
					{items.map(item => <button key={item.label} type="button" role="menuitem" tabIndex={-1} onClick={() => { triggerRef.current?.focus({ preventScroll: true }); setOpen(false); item.onSelect() }}>{item.label}</button>)}
				</div>
			) : null}
		</div>
	)
}

function peopleCountForPhase(phase: number) {
	return Math.min(4, Math.max(0, phase - 2))
}

/*
 * The decision in the fewest words that still let the owner choose: the
 * boundary MAX stopped at, one sentence of why, one sentence per option. The
 * full trigger and what MAX checked sit one disclosure away.
 */
/* The domains MAX may send to: the workspace its named stakeholders are in. */
function recipientDomains(scenario: Scenario) {
	const domains = [...new Set(scenario.people.map((person) => person.email.split("@")[1]).filter(Boolean))]
	return domains.length ? domains.join(", ") : "the approved workspace"
}

const DECISION_COPY: Record<ScenarioKey, { scope: string; detail: string; why: string; allow: string; keep: string; limitation: string }> = {
	tprm: {
		scope: "Discovery is internal by default",
		detail: "MAX stopped before contacting anyone outside the approved northstar.com workspace.",
		why: "Priya Shah wants the vendor’s privacy counsel to confirm its retention terms.",
		allow: "No internal evidence or attachments leave the workspace with the invitation.",
		keep: "The missing vendor confirmation becomes a stated limitation in the recommendation.",
		limitation: "The vendor’s retention terms are unconfirmed, and the recommendation says so.",
	},
	diligence: {
		scope: "MAX won’t change the investment view alone",
		detail: "The evidence conflict needs an explicit direction before this branch can influence the committee package.",
		why: "The CFO cites 94% recurring revenue, but the ledger books 17% as services.",
		allow: "Finance and the deal team meet before the committee package is frozen.",
		keep: "The discrepancy is disclosed as a pricing and diligence risk.",
		limitation: "The revenue classification conflict is disclosed as a pricing and diligence risk.",
	},
	s4hana: {
		scope: "MAX won’t change how the business works",
		detail: "For 374 of the 412 objects standard behaves identically, so MAX dispositioned those. The remaining 38 change what the business sees, so it stopped at this branch.",
		why: "The custom credit-exposure check counts open orders from quotation stage; standard counts them from order entry. €2,412,880.40 of orders a month would block differently.",
		allow: "All 412 objects go to standard, the 38 exceptions change behaviour at go-live, and 980 person-days come out of the remediation estimate.",
		keep: "The 38 are remediated and carried into S/4HANA with today’s behaviour; the other 374 still go to standard.",
		limitation: "The 38 behaviour exceptions stay custom, and the remediation estimate keeps the 980 person-days they cost.",
	},
	ordersync: {
		scope: "MAX won’t choose the system of record",
		detail: "Salesforce and SAP are each internally consistent about the customer. Which one is the master is finance and revenue policy, so MAX stopped at this branch.",
		why: "187 active accounts carry a different address and tax jurisdiction in each system, across $612,480.90 of orders.",
		allow: "The SAP business partner becomes the master, Salesforce syncs down from it, and every tax determination is tested against it.",
		keep: "The $612,480.90 is recorded as a known tax-determination exposure; the pipeline still posts against the business partner.",
		limitation: "Salesforce stays the customer master for now, and the $612,480.90 of orders with a disagreeing tax jurisdiction is a known exposure.",
	},
	servicenow: {
		scope: "MAX won’t choose commercial policy",
		detail: "The purchase-order tolerance and the negotiated contract tolerance are each applied consistently. Which one is authoritative is procurement and finance policy, so MAX stopped at this branch.",
		why: "ServiceNow clears at ±2% or $25; 212 supplier contracts negotiate a flat ±1.5%, disagreeing on 240 invoices.",
		allow: "The contract tolerance becomes authoritative, 240 invoices become exceptions at the first run, and every tolerance decision is tested against the contract register.",
		keep: "The $84,310.55 is recorded as accepted leakage against negotiated terms; the queue still records which rule cleared each invoice.",
		limitation: "The purchase-order tolerance stands for now, and the $84,310.55 against negotiated terms is recorded as accepted leakage.",
	},
	revenue: {
		scope: "MAX won’t choose finance policy",
		detail: "Two currency conventions are both applied consistently. Which one is the standard is the controller’s call, so MAX stopped at this branch.",
		why: "The close workbooks convert 14 invoices at invoice-date rates; the ledger uses posting-date rates.",
		allow: "The workbooks restate 14 invoices at the next close, and every conversion is tested against the ledger.",
		keep: "The $126.24 is recorded as a known reconciling item; the pipeline still matches the ledger.",
		limitation: "The close workbooks keep invoice-date rates for now, and the $126.24 sample difference is a known reconciling item.",
	},
	enterprise: {
		scope: "Controls stay fail-closed by default",
		detail: "The current design cannot move forward with an unapproved segregation-of-duties exception.",
		why: "One role could request and attest a high-risk change during a controls outage.",
		allow: "Only the affected integration decision pauses; other architecture work continues.",
		keep: "High-risk changes stay blocked in an outage; council reviews the trade-off.",
		limitation: "High-risk changes stay blocked during a controls outage, and the trade-off is logged for council review.",
	},
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
	const copy = DECISION_COPY[scenarioKey]

	return (
		<div className={`decision-boundary callout-card${compact ? " is-compact" : ""}`}>
			<p className="decision-boundary-scope"><ShieldCheck size={16} weight="fill" /><span>{copy.scope}</span></p>
			<div className="decision-boundary-head">
				<h2 id={headingId}>{exception.title}</h2>
				<p>{copy.why}</p>
			</div>
			<details className="decision-boundary-evidence">
				<summary><CaretRight size={12} />What MAX already checked</summary>
				<p>{exception.trigger} {copy.detail}</p>
				<p>{exception.evidenceGap}</p>
			</details>
			<div className="decision-options" role="group" aria-label="Choose how MAX continues">
				<div className="decision-option">
					<p>{copy.allow}</p>
					<DsButton size="sm" variant="primary" onClick={() => onResolve("approved")}>{exception.approveLabel}</DsButton>
				</div>
				<div className="decision-option">
					<p>{copy.keep}</p>
					<DsButton size="sm" onClick={() => onResolve("modified")}>{exception.alternativeLabel}</DsButton>
				</div>
			</div>
		</div>
	)
}

/*
 * Autonomy. The ElevenLabs Analysis tab (mobbin 7071365d) gives the page: a
 * title, expandable table rows with status pills, and a right column of titled
 * cards. The agent dashboard (a5f35d02) gives the figure card, whose metric
 * tabs switch the chart beneath them; here the first chart is the journey drawn
 * as the Workflow tab's node graph (1610e881).
 */
type MetricKey = "actions" | "records" | "interviews" | "interruptions"

/*
 * One reading of the run for the journey spine, shared by Autonomy, Thread and
 * the rail. Something the owner must answer outranks their own pause; a pause
 * on its own asks nothing of them and never reads as "needs you".
 */
function runJourney({ scenarioKey, phase, paused, decision, interviewClosed, handoffId = null }: { scenarioKey: ScenarioKey; phase: number; paused: boolean; decision: DecisionState; interviewClosed: boolean; handoffId?: string | null }): JourneyContext {
	const complete = journeyComplete(phase)
	const interviewOpen = !interviewClosed && !complete
	const decisionPending = interviewClosed && phase === 4 && decision === "pending"
	return { interviewOpen, decisionPending, handoffId, destination: handoffDestination(scenarioKey), hold: interviewOpen || decisionPending ? "blocked" : paused && !complete ? "paused" : null }
}

const JOURNEY_STATUS_LABEL: Record<JourneyStageStatus, string> = { complete: "Done", current: "In progress", blocked: "Waiting on you", paused: "Paused", pending: "Queued" }
const JOURNEY_EDGE_LABEL: Record<JourneyStageStatus | "parallel", string> = { complete: "Done", current: "In progress", blocked: "Needs you", paused: "Paused", pending: "", parallel: "" }
const JOURNEY_RAIL_LABEL: Record<JourneyStageStatus, string> = { complete: "Done", current: "Now", blocked: "Waiting", paused: "Paused", pending: "" }
const REVEAL_EASE = [0.2, 0, 0, 1] as const

/* Disclosures open by height alone, so text never fades up from nothing; under
 * reduced motion the content is simply there or gone, with no exit to wait on. */
function useReveal() {
	const reduced = useReducedMotion()
	return reduced ? {} : { initial: { height: 0 }, animate: { height: "auto" }, exit: { height: 0 }, transition: { duration: 0.24, ease: REVEAL_EASE } }
}

function Overview({
	scenarioKey,
	missionTitle,
	missionBrief,
	missionDecision,
	deadline,
	startedAt,
	phase,
	paused,
	decision,
	people,
	interviewClosed,
	interviewIndex,
	handoffId,
	invitesSent,
	traceOpen,
	onToggleTrace,
	onResolveDecision,
	onOpenDrawer,
	onOpenThread,
}: {
	scenarioKey: ScenarioKey
	missionTitle: string
	missionBrief: string
	missionDecision: string
	deadline: string
	startedAt: string
	phase: number
	paused: boolean
	decision: DecisionState
	people: Person[]
	interviewClosed: boolean
	interviewIndex: number
	handoffId: string | null
	invitesSent: boolean
	traceOpen: boolean
	onToggleTrace: () => void
	onResolveDecision: (decision: Exclude<DecisionState, "pending">) => void
	onOpenDrawer: (drawer: Exclude<Drawer, null>) => void
	onOpenThread: () => void
}) {
	const scenario = SCENARIOS[scenarioKey]
	const reducedMotion = Boolean(useReducedMotion())
	const reveal = useReveal()
	const journey = runJourney({ scenarioKey, phase, paused, decision, interviewClosed, handoffId })
	// Until the owner interview closes nothing autonomous has started, so nothing may claim it has.
	const awaitingOwner = Boolean(journey.interviewOpen)
	const decisionPending = Boolean(journey.decisionPending)
	const complete = journeyComplete(phase)
	const progress = Math.round(((phase + 1) / OPERATIONS.length) * 100)
	const stage = journeyProgress(phase, journey)
	const interviewTotal = scenario.ownerInterview.length
	const interviewStep = `Question ${Math.min(interviewIndex + 1, interviewTotal)} of ${interviewTotal} · ${scenario.ownerInterview[Math.min(interviewIndex, interviewTotal - 1)].topic}`
	const interviewed = Math.min(people.length, Math.max(0, phase - 2))
	const sourceRecords = scenario.sources.reduce((total, source) => total + Number(source.records.replace(/[^0-9]/g, "")), 0)
	const sourcesRead = interviewClosed && phase >= 2
	const followUps = phase >= 4 ? 4 : phase >= 3 ? 2 : 0
	// The run keeps working between phase changes: a micro-action rotates under
	// "Now handling" and each rotation is one more verified action. Reduced
	// motion never starts the timer, so the surface stays a static, true count.
	const microActions = nowActions(scenario, phase, people, deadline)
	const [microTick, setMicroTick] = useState(0)
	const running = interviewClosed && !paused && !complete
	useEffect(() => { setMicroTick(0) }, [phase])
	useEffect(() => {
		if (!running || prefersInstantMotion()) return
		const timer = window.setInterval(() => setMicroTick((current) => current + 1), 2400)
		return () => window.clearInterval(timer)
	}, [running, phase])
	const microAction = microActions[microTick % microActions.length]
	const autonomousActions = interviewClosed ? (phase + 1) * 6 + interviewed * 3 + (decision !== "pending" ? 4 : 0) + microTick : null
	// The open interview and the one material exception are the only times MAX stops for the owner.
	const interruptions = awaitingOwner || interviewClosed && phase >= 4 ? 1 : 0
	const [metric, setMetric] = useState<MetricKey>("actions")
	const metricTabs = useRef<Array<HTMLButtonElement | null>>([])
	const [briefOpen, setBriefOpen] = useState(false)
	const briefRef = useRef<HTMLDivElement>(null)
	const briefButtonRef = useRef<HTMLButtonElement>(null)
	const [openRow, setOpenRow] = useState<string | null>(null)
	const authorityRef = useRef<HTMLElement>(null)
	const toggleRow = (id: string) => setOpenRow(current => current === id ? null : id)

	// The brief is a popover: Escape closes it and hands focus back, and so does a press anywhere else.
	useEffect(() => {
		if (!briefOpen) return
		const onPointer = (event: PointerEvent) => { if (!briefRef.current?.contains(event.target as Node)) setBriefOpen(false) }
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return
			event.stopPropagation()
			setBriefOpen(false)
			briefButtonRef.current?.focus({ preventScroll: true })
		}
		document.addEventListener("pointerdown", onPointer)
		document.addEventListener("keydown", onKey, true)
		return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey, true) }
	}, [briefOpen])

	const notStarted = "Starts after your interview"
	const queuedLabel = awaitingOwner ? "After interview" : "Queued"
	const stateLabel = { complete: "Handled", active: paused ? "Paused" : "Working", attention: "Needs authority", queued: queuedLabel }
	const stateFor = (activeAt: number, completeAt: number) => awaitingOwner ? "queued" as const : phase >= completeAt ? "complete" as const : phase >= activeAt ? "active" as const : "queued" as const
	const evidenceState = stateFor(1, 2)
	const stakeholderState = stateFor(2, 5)
	const conflictState = decisionPending ? "attention" as const : stateFor(3, 5)
	const authorityState = decisionPending ? "attention" as const : stateFor(4, 6)
	const workstreams = [
		{ id: "evidence", label: "Evidence", state: evidenceState, title: evidenceState === "complete" ? `${sourceRecords.toLocaleString()} records screened` : awaitingOwner ? notStarted : "Reading governed sources", facts: [["scopes", `${scenario.sources.length} governed sources`], ["provenance", "retained per record"], ["systems", scenario.sources.map(source => source.system).join(", ")]] },
		{ id: "stakeholders", label: "Stakeholders", state: stakeholderState, title: stakeholderState === "complete" ? `${people.length} conversations coordinated` : stakeholderState === "active" ? `Coordinating ${people.length} conversations` : awaitingOwner ? notStarted : `${people.length} stakeholders mapped`, facts: [["interviews", String(interviewed)], ["follow_ups", String(followUps)], ["delivery", invitesSent ? "verified" : "preparing"]] },
		{ id: "conflicts", label: "Conflicts", state: conflictState, title: conflictState === "attention" || conflictState === "active" && phase >= 4 ? "Material tension isolated" : conflictState === "complete" ? "Material tension resolved" : conflictState === "active" ? "Comparing stakeholder positions" : awaitingOwner ? notStarted : "Starts once positions arrive", facts: [["method", "positions tested against source evidence"], ["escalation", interviewClosed && phase >= 4 ? "only the material exception" : "none yet"]] },
		{ id: "authority", label: "Risks and authority", state: authorityState, title: authorityState === "attention" ? "One exact decision routed" : authorityState === "complete" ? "Risks have accountable owners" : authorityState === "active" ? "Classifying exposure and decision rights" : awaitingOwner ? notStarted : "Starts with synthesis", facts: [["boundary", "material exceptions interrupt the owner"], ["unaffected_work", awaitingOwner ? "not started" : complete ? "finished" : paused ? "paused" : decisionPending ? "continues" : "running"]] },
	]
	const mappedPeople = people.length ? people : scenario.people
	const [lead, partner] = [mappedPeople[0]?.name ?? "the business owner", mappedPeople[1]?.name ?? "the control owner"]
	const queuedDetail = (work: string) => `${awaitingOwner ? "Starts after your interview." : "Queued."} ${work}`
	const positionsState = awaitingOwner ? "queued" as const : phase >= 4 ? "resolved" as const : phase >= 3 ? "active" as const : "queued" as const
	const assumptionsState = awaitingOwner ? "queued" as const : phase >= 5 ? "resolved" as const : phase >= 3 ? "active" as const : "queued" as const
	const boundaryState = decisionPending ? "attention" as const : interviewClosed && phase > 4 ? "resolved" as const : "queued" as const
	const coordinationThreads = [
		{
			id: "positions",
			people: [mappedPeople[0], mappedPeople[1]].filter(Boolean),
			title: `${scenario.inquiries[0]} versus ${scenario.inquiries[1]}`,
			detail: positionsState === "resolved"
				? `MAX compared the positions from ${lead} and ${partner}, checked the governing evidence, and sent two focused follow-ups instead of forwarding the disagreement to you.`
				: positionsState === "active"
					? `MAX is comparing the positions from ${lead} and ${partner} against the governing evidence and following up with each instead of forwarding the disagreement to you.`
					: queuedDetail(`MAX will compare the positions from ${lead} and ${partner} against the governing evidence before anything reaches you.`),
			meta: positionsState === "resolved" ? "Common position" : positionsState === "active" ? "Follow-ups in progress" : queuedLabel,
			exchanges: phase >= 4 ? 4 : phase >= 3 ? 2 : 0,
			state: positionsState,
		},
		{
			id: "assumptions",
			people: [mappedPeople[2], mappedPeople[3]].filter(Boolean),
			title: `${scenario.inquiries[2]} versus ${scenario.inquiries[4]}`,
			detail: assumptionsState === "resolved"
				? "MAX challenged the initial assumptions, returned cited evidence to both stakeholders, and converted the remaining uncertainty into an owned risk with a response deadline."
				: assumptionsState === "active"
					? "MAX is challenging the initial assumptions with cited evidence and will turn whatever stays uncertain into an owned risk."
					: queuedDetail("MAX will test the initial assumptions against cited evidence and turn whatever stays uncertain into an owned risk."),
			meta: assumptionsState === "resolved" ? "Risk owner confirmed" : assumptionsState === "active" ? "Comparing evidence" : queuedLabel,
			exchanges: phase >= 5 ? 3 : phase >= 3 ? 1 : 0,
			state: assumptionsState,
		},
		{
			id: "boundary",
			people: [] as Person[],
			title: "Owner authority boundary",
			detail: boundaryState === "attention"
				? `${scenario.exception.title}. MAX kept every unaffected inquiry moving and prepared only the evidence needed for the bounded decision.`
				: boundaryState === "resolved"
					? `${scenario.exception.title}. Your decision is recorded and MAX resumed the affected branch.`
					: queuedDetail("MAX interrupts you only when a material exception crosses the authority you granted."),
			meta: boundaryState === "attention" ? "Waiting on you" : boundaryState === "resolved" ? "Decision recorded" : awaitingOwner ? queuedLabel : "Monitoring",
			exchanges: boundaryState === "resolved" ? 1 : 0,
			state: boundaryState,
		},
	]
	const ledger = interviewClosed ? [
		{ phase: 0, title: "Mission and authority established", detail: "Converted the brief into an objective, completion condition, source scope, and interruption boundary." },
		{ phase: 1, title: "Source access verified", detail: `Bound ${scenario.sources.length} permitted systems and retained record-level provenance.` },
		{ phase: 2, title: "Stakeholder program launched", detail: `Mapped ${people.length} accountable roles and tailored each interview to a different evidence gap.` },
		{ phase: 3, title: "Interviews adapted in flight", detail: "Skipped questions already answered by records and sent targeted follow-ups where positions diverged." },
		{ phase: 4, title: "Conflict detected and contained", detail: "Reconciled the evidence, isolated the material exception, and kept unaffected work running." },
		{ phase: 5, title: "Risk and readiness snapshot frozen", detail: "Bound claims, unresolved tensions, decisions, and accountable owners into one canonical snapshot." },
		{ phase: 6, title: "Decision package generated", detail: `Built ${DELIVERABLES.length} linked deliverables from the verified manifest.` },
		{ phase: 7, title: "Approvals and handoff routed", detail: "Sent the right artifact and decision scope to each approved recipient." },
	].filter((event) => event.phase <= phase).reverse() : []
	// The trace lists every step the run has reached, so its count is the whole truth.
	const traced = interviewClosed ? OPERATIONS.slice(0, phase + 1) : []
	const traceCount = `${traced.length} ${traced.length === 1 ? "step" : "steps"}`
	const sourceSizes = scenario.sources.map(source => Number(source.records.replace(/[^0-9]/g, "")))
	const largestSource = Math.max(1, ...sourceSizes)
	const liveTone = complete ? "" : paused ? " is-paused" : awaitingOwner || decisionPending ? " is-waiting" : running ? " is-running" : ""
	const popoverMotion = reducedMotion ? {} : { initial: { y: -4, scale: 0.98 }, animate: { y: 0, scale: 1 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.16 } }
	const panelMotion = reducedMotion ? {} : { initial: { y: 6, filter: "blur(2px)" }, animate: { y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2 } }

	const metrics: Array<{ key: MetricKey; label: string; value: React.ReactNode; unit?: string }> = [
		{ key: "actions", label: "Verified actions", value: <AnimatedStat value={autonomousActions} />, unit: autonomousActions === null ? undefined : "actions" },
		{ key: "records", label: "Records screened", value: <AnimatedStat value={sourcesRead ? sourceRecords : null} />, unit: sourcesRead ? "records" : undefined },
		{ key: "interviews", label: "Interviews and follow-ups", value: <><AnimatedStat value={interviewed} /> + <AnimatedStat value={followUps} /></> },
		{ key: "interruptions", label: "Owner interruptions", value: <AnimatedStat value={interruptions} /> },
	]
	// A tablist moves with the arrow keys and holds one tab stop (the selected tab).
	const onMetricKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
		const last = metrics.length - 1
		const next = event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
			: event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
			: event.key === "Home" ? 0
			: event.key === "End" ? last
			: -1
		if (next < 0) return
		event.preventDefault()
		setMetric(metrics[next].key)
		metricTabs.current[next]?.focus()
	}

	const nowCard = (
		<section key="now" className="autonomy-card overview-current autonomy-current" aria-labelledby="current-operation" aria-live="polite">
			<div className="autonomy-card-head">
				<h2 className="autonomy-card-title">Now handling</h2>
				{complete ? <DsBadge tone="positive">Verified</DsBadge>
					: paused ? <DsBadge><Pause size={12} weight="fill" />Paused</DsBadge>
					: awaitingOwner ? <DsBadge tone="warning">Waiting on you</DsBadge>
					: <DsBadge dot>Running</DsBadge>}
			</div>
			<p id="current-operation" className="autonomy-card-value">{complete ? "Package complete" : paused ? "Work paused" : awaitingOwner ? "Framing the mission" : OPERATIONS[phase].label}</p>
			<p className="autonomy-card-desc">{complete
				? handoffId ? `The package went to ${handoffDestination(scenarioKey)} as ${handoffId}.` : OPERATIONS[phase].detail
				: paused ? "No new actions will start until you resume."
				: awaitingOwner ? "MAX turns your interview answers into the objective, done condition and authority boundary. Nothing else starts until the interview closes."
				: OPERATIONS[phase].detail}</p>
			{running ? (
				<p className="dsc-now-line" aria-hidden="true">
					<span className="dsc-now-dot" />
					<SwapPresence instant={reducedMotion}>
						<motion.span key={microAction} className="dsc-now-text" initial={{ y: 4, filter: "blur(3px)" }} animate={{ y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -4, filter: "blur(3px)" }} transition={{ duration: 0.28 }}>
							<ShimmerText>{microAction}</ShimmerText>
						</motion.span>
					</SwapPresence>
				</p>
			) : null}
			{traced.length ? (
				<div className="work-trace">
					<button type="button" className="work-trace-toggle" onClick={onToggleTrace} aria-expanded={traceOpen}>
						<CaretRight size={12} className={traceOpen ? "rotated" : ""} />
						<span className="work-trace-label">{complete ? "All work verified" : paused ? "Checkpoint preserved" : "Inspect the current work trace"}</span>
						<span className="work-trace-count">{traceCount}</span>
					</button>
					<SwapPresence instant={reducedMotion} mode="sync">
						{traceOpen ? (
							<motion.ol {...reveal}>
								{traced.map((operation, index) => {
									const status: JourneyStageStatus = index === traced.length - 1 && !complete ? journey.hold ?? "current" : "complete"
									return (
										<li key={operation.label} className={`is-${status}`}>
											<StageGlyph status={status} size={14} />
											{/* Finished steps stay one line; only the live step explains itself. */}
											<div><strong>{operation.label}</strong>{status === "complete" ? null : <span>{operation.detail}</span>}</div>
										</li>
									)
								})}
							</motion.ol>
						) : null}
					</SwapPresence>
				</div>
			) : null}
		</section>
	)

	const authorityCard = (
		<section key="authority" ref={authorityRef} tabIndex={-1} className={`autonomy-card overview-attention${decisionPending ? " needs-decision" : ""}`} aria-labelledby="authority-heading">
			<div className="autonomy-card-head">
				<h2 className="autonomy-card-title">Human authority</h2>
				{decisionPending || awaitingOwner ? <span className="ds-count">1</span> : <CheckCircle size={16} weight="fill" className="autonomy-clear-icon" />}
			</div>
			<p id="authority-heading" className="autonomy-card-value">{decisionPending ? "1 decision needs you" : awaitingOwner ? "Your interview answer" : complete ? "Nothing needs you" : "Nothing right now"}</p>
			{decisionPending ? (
				<DecisionBoundary scenarioKey={scenarioKey} compact onResolve={(next) => {
					onResolveDecision(next)
					// The chosen button leaves with the card; the card's outcome keeps focus.
					authorityRef.current?.focus({ preventScroll: true })
				}} />
			) : awaitingOwner ? (
				<>
					<p className="autonomy-card-desc">{interviewStep}. MAX needs your answer before it starts any autonomous work.</p>
					<div className="autonomy-card-actions"><DsButton size="sm" variant="primary" onClick={onOpenThread}>Answer in Thread<ArrowRight size={14} /></DsButton></div>
				</>
			) : (
				<p className="autonomy-card-desc">{complete
					? handoffId ? `MAX has finished and nothing is running. ${handoffDestination(scenarioKey)} holds handoff packet ${handoffId}.` : `MAX has finished and nothing is running. Review the package, then continue to ${handoffDestination(scenarioKey)}.`
					: paused ? "You paused the run. Nothing is waiting on you, and nothing new starts until you resume."
					: interruptions ? "Your decision is recorded. MAX is continuing inside the authority you granted."
					: "MAX is continuing inside the authority you granted. Follow-ups, source checks and routine conflict resolution do not need you."}</p>
			)}
		</section>
	)

	return (
		<div className="overview-workspace">
			<section className={`overview-main${decisionPending ? " is-gated" : ""}`} aria-label="Autonomy overview" tabIndex={0}>
				<div className="autonomy-page">
					<div className="autonomy-topline">
						<span className={`autonomy-live${liveTone}`}><i aria-hidden="true" /><span>{complete ? "Run complete" : paused ? "Paused" : decisionPending ? "Waiting on one decision" : running ? `Working · ${OPERATIONS[phase].label}` : "Interviewing you"}</span></span>
						<div className="autonomy-mission" ref={briefRef}>
							<DsButton ref={briefButtonRef} size="sm" aria-expanded={briefOpen} onClick={() => setBriefOpen(current => !current)}>Discovery brief</DsButton>
							<SwapPresence instant={reducedMotion} mode="sync">
								{briefOpen ? <motion.p {...popoverMotion}>{missionBrief || missionDecision}</motion.p> : null}
							</SwapPresence>
						</div>
					</div>

					<header className="autonomy-hero">
						<div>
							<p className="autonomy-eyebrow">{missionTitle}</p>
							<h1 className="ds-page-title">{complete ? "MAX ran the Discovery." : paused ? "The Discovery is paused." : interviewClosed ? "MAX is running the Discovery." : "MAX is forming the mission with you."}</h1>
							<p className="ds-page-desc">{journeyNextAction(phase, journey)}</p>
						</div>
						<div className="autonomy-progress-summary" role="progressbar" aria-label="Autonomous Discovery progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${stage.label}, ${progress}%`}>
							<span className="autonomy-progress-label"><span>{stage.label}</span><strong>{progress}%</strong></span>
							<div><motion.span initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: REVEAL_EASE }} /></div>
						</div>
					</header>

					{/* The waiting decision leads; otherwise the live work does. */}
					<div className={`overview-priority-grid${decisionPending ? " has-decision" : ""}`}>
						{decisionPending ? [authorityCard, nowCard] : [nowCard, authorityCard]}
					</div>

					<section className="autonomy-metrics" aria-label="Work handled by MAX">
						<div className="metric-card">
						<div className="autonomy-value-strip" role="tablist" aria-label="Work handled by MAX">
							{metrics.map((item, index) => (
								<div key={item.key} className={`metric-cell${metric === item.key ? " is-active" : ""}`}>
									<button
										ref={node => { metricTabs.current[index] = node }}
										type="button"
										role="tab"
										id={`metric-tab-${item.key}`}
										aria-selected={metric === item.key}
										aria-controls="metric-panel"
										tabIndex={metric === item.key ? 0 : -1}
										onClick={() => setMetric(item.key)}
										onKeyDown={event => onMetricKey(event, index)}>
										<span className="metric-label">{item.label}</span>
										<span className="metric-value"><strong>{item.value}</strong>{item.unit ? <small>{item.unit}</small> : null}</span>
									</button>
								</div>
							))}
						</div>
						<div className="metric-panel" id="metric-panel" role="tabpanel" aria-labelledby={`metric-tab-${metric}`}>
							<SwapPresence instant={reducedMotion}>
								<motion.div key={metric} {...panelMotion}>
									{metric === "actions" ? (
										<JourneyGraph phase={phase} context={journey} />
									) : metric === "records" ? (
										<ul className="metric-bars" aria-label="Records screened by source">
											{scenario.sources.map((source, index) => (
												<li key={source.name}>
													<motion.span className="metric-bar" initial={{ width: 0 }} animate={{ width: `${sourcesRead ? Math.max(8, (sourceSizes[index] / largestSource) * 100) : 4}%` }} transition={{ duration: 0.6, delay: index * 0.06, ease: REVEAL_EASE }} />
													<span className="metric-bar-label"><Mark seed={source.name} size="xs" />{source.name}<small>{source.system}</small></span>
													<span className="metric-bar-value">{sourcesRead ? source.records : awaitingOwner ? "bound" : "reading"}</span>
												</li>
											))}
										</ul>
									) : metric === "interviews" ? (
										<ul className="metric-people" aria-label="Stakeholder interviews">
											{mappedPeople.map((person, index) => {
												const status = index < interviewed ? "Interviewed" : index < interviewed + Math.ceil(followUps / 2) ? "Follow-up sent" : interviewClosed ? "Scheduled" : "After your interview"
												return (
													<li key={person.id}>
														<span className="person-chip" data-tint={index % 6} aria-hidden="true">{person.initials}</span>
														<span className="metric-person"><strong>{person.name}</strong><small>{person.role}</small></span>
														<DsBadge tone={status === "Interviewed" ? "positive" : "neutral"} dot={status === "Follow-up sent"}>{status}</DsBadge>
													</li>
												)
											})}
										</ul>
									) : (
										<div className="metric-empty">
											{awaitingOwner ? <ChatCircleText size={18} weight="fill" className="is-waiting" /> : decisionPending ? <ShieldCheck size={18} weight="fill" className="is-waiting" /> : <CheckCircle size={18} weight="fill" />}
											<p>
												{awaitingOwner ? <><strong>MAX is waiting on your interview answer</strong><span>{interviewStep}. Autonomous work starts once the interview closes.</span></>
													: decisionPending ? <><strong>One bounded decision is waiting</strong><span>Unaffected branches keep moving while you decide.</span></>
													: interruptions ? <><strong>One bounded decision, recorded</strong><span>{decision === "modified" ? scenario.exception.alternativeLabel : scenario.exception.approveLabel}. MAX resumed the affected branch.</span></>
													: <><strong>MAX has not interrupted you since your interview</strong><span>Routine work stays inside the approved authority.</span></>}
											</p>
										</div>
									)}
								</motion.div>
							</SwapPresence>
							<div className="metric-footer">
								<span>{metric === "actions" ? "Journey · frame to handoff" : metric === "records" ? `${scenario.sources.length} governed sources` : metric === "interviews" ? `${people.length} stakeholder threads` : awaitingOwner ? "Your interview, then material exceptions only" : "Material exceptions only"}</span>
								{metric === "records" ? <DsButton size="sm" onClick={() => onOpenDrawer("sources")}>Open sources<ArrowUpRight size={14} /></DsButton>
									: metric === "interviews" ? <DsButton size="sm" onClick={() => onOpenDrawer("people")}>Open stakeholder program<ArrowUpRight size={14} /></DsButton>
									: <DsButton size="sm" onClick={onOpenThread}>Open Thread<ArrowUpRight size={14} /></DsButton>}
							</div>
						</div>
						</div>
					</section>

					<section className="autonomy-section autonomy-workstreams" aria-labelledby="autonomy-workstreams-heading">
						<div className="autonomy-section-head">
							<h2 id="autonomy-workstreams-heading">What MAX is handling for you</h2>
							<p>{workstreams.filter(item => item.state === "complete").length} handled · {workstreams.filter(item => item.state === "active" || item.state === "attention").length} active</p>
						</div>
						<ul className="analysis-table" aria-labelledby="autonomy-workstreams-heading">
							<li className="analysis-head" aria-hidden="true"><span>Workstream</span><span>What MAX has</span><span className="is-end">State</span></li>
							{workstreams.map(item => (
								<li key={item.id} className={`analysis-row is-${item.state}${openRow === item.id ? " is-open" : ""}`}>
									<button type="button" className="analysis-row-main" aria-expanded={openRow === item.id} onClick={() => toggleRow(item.id)}>
										{/* Seeds checked to give the four rows four shapes in four tints. */}
										<span className="analysis-cell analysis-cell-name"><CaretRight size={12} className="analysis-caret" /><Mark seed={`workstream:${item.id}`} size="xs" /><strong>{item.label}</strong></span>
										<span className="analysis-cell">{item.title}</span>
										<span className="analysis-cell is-end"><DsBadge tone={item.state === "attention" ? "warning" : item.state === "complete" ? "positive" : "neutral"} dot={item.state === "active" && !paused}>{stateLabel[item.state]}</DsBadge></span>
									</button>
									<SwapPresence instant={reducedMotion} mode="sync">
										{openRow === item.id ? (
											<motion.dl className="analysis-facts" {...reveal}>
												{item.facts.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
											</motion.dl>
										) : null}
									</SwapPresence>
								</li>
							))}
						</ul>
					</section>

					<section className="autonomy-section autonomy-coordination" aria-labelledby="stakeholder-coordination-heading">
						<div className="autonomy-section-head">
							<h2 id="stakeholder-coordination-heading">Conversations MAX is managing</h2>
							<p>{interviewed + followUps} exchanges</p>
						</div>
						<ul className="analysis-table is-conversations" aria-labelledby="stakeholder-coordination-heading">
							<li className="analysis-head" aria-hidden="true"><span>Conversation</span><span>People</span><span className="is-end">State</span></li>
							{coordinationThreads.map(thread => (
								<li key={thread.id} className={`analysis-row is-${thread.state}${openRow === thread.id ? " is-open" : ""}`}>
									<button type="button" className="analysis-row-main" aria-expanded={openRow === thread.id} onClick={() => toggleRow(thread.id)}>
										<span className="analysis-cell analysis-cell-name"><CaretRight size={12} className="analysis-caret" /><strong>{thread.title}</strong></span>
										<span className="analysis-cell">
											{thread.people.length ? <span className="person-stack">{thread.people.map((person, index) => <span key={person.id} className="person-chip" data-tint={(index * 3 + 1) % 6} title={person.name}>{person.initials}</span>)}</span> : <span className="analysis-muted">Owner authority</span>}
										</span>
										<span className="analysis-cell is-end"><DsBadge tone={thread.state === "attention" ? "warning" : thread.state === "resolved" ? "positive" : "neutral"} dot={thread.state === "active" && !paused}>{thread.meta}</DsBadge></span>
									</button>
									<SwapPresence instant={reducedMotion} mode="sync">
										{openRow === thread.id ? (
											<motion.div className="analysis-detail" {...reveal}>
												<p>{thread.detail}</p>
												<span>{thread.exchanges} exchanges{thread.people.length ? ` · ${thread.people.map(person => person.name).join(", ")}` : ""}</span>
											</motion.div>
										) : null}
									</SwapPresence>
								</li>
							))}
						</ul>
					</section>

					<section className="autonomy-section autonomy-ledger" aria-labelledby="autonomy-ledger-heading">
						<div className="autonomy-section-head">
							<h2 id="autonomy-ledger-heading">What MAX did and why</h2>
							<p>Newest first</p>
						</div>
						{ledger.length ? (
							<div className="ledger-wrap">
								<motion.span className="ledger-beam" aria-hidden="true" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.9, ease: REVEAL_EASE }} />
								<ol className="ledger-timeline" tabIndex={0}>
									{ledger.map((event) => {
										const moment = ledgerMoment(startedAt, OPERATION_ELAPSED_MINUTES[event.phase] ?? 0)
										const current = event.phase === phase && !complete && !paused
										return (
											<li key={event.title} className={`ledger-item${current ? " is-current" : ""}`}>
												<time dateTime={moment.toISOString()}>{moment.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time>
												<span className="ledger-node" aria-hidden="true">{current ? <span className="ledger-node-live" /> : <Check size={10} weight="bold" />}</span>
												<div><strong>{event.title}</strong><p>{event.detail}</p></div>
											</li>
										)
									})}
								</ol>
							</div>
						) : <p className="ledger-empty">MAX records each verified step here once your interview closes.</p>}
					</section>
				</div>
			</section>
		</div>
	)
}

/*
 * The journey as the Workflow tab draws it (mobbin 1610e881): node cards on a
 * dot-grid canvas joined by labelled edges, the live node traced by a moving
 * border, and the selected node's settings in a panel beside the canvas.
 */
function JourneyGraph({ phase, context }: { phase: number; context: JourneyContext }) {
	const reducedMotion = Boolean(useReducedMotion())
	const current = currentJourneyStage(phase, context)
	const [selected, setSelected] = useState<JourneyStageId>(current)
	useEffect(() => { setSelected(current) }, [current])
	const stage = JOURNEY_STAGES.find(item => item.id === selected) ?? JOURNEY_STAGES[0]
	const statusOf = (id: JourneyStageId) => journeyStageStatus(id, phase, context)
	const stageStatus = statusOf(stage.id)
	// Inside the selected stage, finished operations are done, the live one
	// carries the stage's own state, and nothing runs ahead of it.
	const operationStatus = (operation: number): JourneyStageStatus => {
		if (stageStatus === "complete" || stageStatus === "pending" || context.interviewOpen) return stageStatus
		return phase > operation ? "complete" : phase === operation ? stageStatus : "pending"
	}
	const inspectorMotion = reducedMotion ? {} : { initial: { x: 8, filter: "blur(2px)" }, animate: { x: 0, filter: "blur(0px)" }, exit: { opacity: 0, x: -8 }, transition: { duration: 0.2 } }
	return (
		<div className="journey-flow">
			<ol className="journey-canvas" aria-label="Discovery journey">
				{JOURNEY_STAGES.map((item, index) => {
					const status = statusOf(item.id)
					const previous = index > 0 ? statusOf(JOURNEY_STAGES[index - 1].id) : null
					// An edge carries the state of the work arriving at its node. A node the
					// prototype finished ahead of an open parent gets a plain edge, so nothing
					// reads as flowing out of unfinished work into finished work.
					const edge = previous === null ? null : status === "complete" && previous !== "complete" ? "parallel" : status
					return (
						<li key={item.id} className={`journey-node is-${status}`} data-stage={item.id}>
							{edge ? (
								<span className={`journey-edge is-${edge}`} aria-hidden="true">
									{JOURNEY_EDGE_LABEL[edge] ? <span className="journey-edge-label">{JOURNEY_EDGE_LABEL[edge]}</span> : null}
								</span>
							) : null}
							<MovingBorder active={status === "current"} className="journey-node-card">
								<button type="button" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
									<JourneyIcon status={status} />
									<span><strong>{item.label}</strong><small>{JOURNEY_STATUS_LABEL[status]}</small></span>
								</button>
							</MovingBorder>
						</li>
					)
				})}
			</ol>
			<SwapPresence instant={reducedMotion}>
				<motion.div key={stage.id} className="journey-inspector" {...inspectorMotion}>
					<div className="journey-inspector-head">
						<p className="journey-inspector-title"><Flag size={16} />{stage.label}</p>
						<DsBadge tone={stageStatus === "complete" ? "positive" : stageStatus === "blocked" ? "warning" : "neutral"} dot={stageStatus === "current"}>{JOURNEY_STATUS_LABEL[stageStatus]}</DsBadge>
					</div>
					<div className="thread-callout"><Info size={16} /><p>{stage.purpose}</p></div>
					<p className="journey-inspector-desc">MAX runs these operations in order and verifies each one before the next starts.</p>
					<ul className="journey-ops">
						{stage.operations.map(operation => {
							const status = operationStatus(operation)
							return (
								<li key={operation} className={`is-${status}`}>
									<StageGlyph status={status} />
									<span><strong>{OPERATIONS[operation].label}</strong><small>{OPERATIONS[operation].detail}</small></span>
								</li>
							)
						})}
					</ul>
				</motion.div>
			</SwapPresence>
		</div>
	)
}

/* Right-column groups shared by the Thread details panel and the Needs-you rail.
 * The hero owns the next-action sentence; these groups never repeat it. */
function NeedsYouGroup({ items, headingId }: { items: NeedsYouItem[]; headingId: string }) {
	return (
		<section className="panel-group" aria-labelledby={headingId}>
			<h3 id={headingId}>Needs you{items.length ? <span className="ds-count">{items.length}</span> : null}</h3>
			{items.length ? (
				<div className="panel-card">
					{items.map(item => {
						const Icon = item.kind === "Interview" ? ChatCircleText : ShieldCheck
						return (
							<button key={item.id} type="button" className="panel-row is-wrapping needs-you-item" onClick={item.onOpen}>
								<Icon size={16} className="panel-row-icon is-warning" />
								<span className="panel-row-label">{item.title}</span>
								<span className="panel-row-sub">{item.kind === "Interview" ? `Interview · ${item.detail}` : item.kind}</span>
								<CaretRight size={14} className="panel-row-caret" />
							</button>
						)
					})}
				</div>
			) : <p className="panel-desc">Nothing is waiting on you.</p>}
		</section>
	)
}

function JourneyGroup({ phase, context, headingId }: { phase: number; context: JourneyContext; headingId: string }) {
	return (
		<section className="panel-group" aria-labelledby={headingId}>
			<h3 id={headingId}>Journey</h3>
			<p className="panel-desc">{journeyProgress(phase, context).label}</p>
			<ol className="panel-card journey-list">
				{JOURNEY_STAGES.map(stage => {
					const status = journeyStageStatus(stage.id, phase, context)
					return (
						<li key={stage.id} className={`panel-row is-${status}`} data-stage={stage.id}>
							<JourneyIcon status={status} />
							<span className="panel-row-label">{stage.label}</span>
							<span className="panel-row-value">{JOURNEY_RAIL_LABEL[status]}</span>
						</li>
					)
				})}
			</ol>
		</section>
	)
}

/* How far from the end of the log the reader may be and still be followed. */
const FOLLOW_DISTANCE = 180
const VOICE_OPEN_QUESTION = "What would you like to ask MAX about this Discovery?"

/* Thread events land like turns and leave by folding their height away, so the
 * log never snaps. Under reduced motion they are simply there or gone. */
function useEventMotion() {
	const reduced = useReducedMotion()
	return reduced ? {} : {
		initial: { y: 10, filter: "blur(3px)" },
		animate: { y: 0, filter: "blur(0px)" },
		exit: { opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, overflow: "hidden" },
		transition: { duration: 0.3, ease: REVEAL_EASE },
		layout: "position" as const,
	}
}

function latestTurn(log: HTMLElement, thinking: boolean) {
	if (thinking) return log.querySelector<HTMLElement>(".dsc-thinking-row")
	const turns = log.querySelectorAll<HTMLElement>(".thread-turn:not(.dsc-thinking-row)")
	return turns[turns.length - 1] ?? null
}

/* Brings the owner's latest turn and everything MAX has said since into view
 * together. When the exchange is taller than the log, the newest turn wins. */
function revealExchange(log: HTMLElement, thinking: boolean, behavior?: ScrollBehavior) {
	const latest = latestTurn(log, thinking)
	if (!latest) return
	const owners = log.querySelectorAll<HTMLElement>(".thread-turn.is-owner")
	const owner = owners[owners.length - 1]
	const style = getComputedStyle(log)
	const box = log.getBoundingClientRect()
	const top = box.top + (Number.parseFloat(style.scrollPaddingTop) || 0)
	const bottom = box.bottom - (Number.parseFloat(style.scrollPaddingBottom) || 0)
	const start = owner ? owner.getBoundingClientRect().top : Number.POSITIVE_INFINITY
	const end = latest.getBoundingClientRect().bottom
	if (!owner || start > latest.getBoundingClientRect().top || end - start > bottom - top) {
		revealWithin(log, latest, "nearest", behavior)
		return
	}
	const dy = start < top ? start - top : end > bottom ? end - bottom : 0
	if (dy) log.scrollTo({ top: log.scrollTop + dy, behavior: behavior ?? (prefersInstantMotion() ? "auto" : "smooth") })
}

/*
 * Thread. Composition follows two ElevenLabs screens:
 * - Test AI agent (mobbin 8dbb547d): a centred message column, an info callout
 *   above the first turn, and a floating composer card with the secondary action
 *   on the left and Attach / Send on the right.
 * - Conversation transcript (mobbin 0ce2e993): a speaker line above each
 *   bordered bubble, meta chips overlapping the bubble's bottom edge, the
 *   caller's turn right-aligned on a grey fill, and workflow events as a quiet
 *   full-width band.
 * The context column is the transcript's Metadata panel crossed with the agent
 * page's right column (mobbin 9785c0b7): titled groups, each a description and
 * one bordered card of rows. When the workspace is too narrow for it, the same
 * panel opens as a sheet over a scrim.
 */
function Thread({
	scenarioKey,
	missionBrief,
	missionDecision,
	phase,
	paused,
	people,
	decision,
	interviewIndex,
	interviewClosed,
	messages,
	pendingReply,
	commandText,
	composerFocusTick,
	handoff,
	charterApproved,
	includedCount,
	toast,
	onCommandTextChange,
	onSend,
	onVoiceSubmit,
	onResolveDecision,
	onJumpToDecision,
	onOpenPeople,
	onOpenSources,
	onOpenPackage,
	onOpenAutonomy,
	onOpenHandoff,
	onOpenPlan,
	active = true,
}: {
	scenarioKey: ScenarioKey
	missionBrief: string
	missionDecision: string
	phase: number
	paused: boolean
	people: Person[]
	decision: DecisionState
	interviewIndex: number
	interviewClosed: boolean
	messages: ChatMessage[]
	pendingReply: string | null
	commandText: string
	composerFocusTick: number
	handoff: HandoffPacket | null
	charterApproved: boolean
	/* Outputs the package keeps after the owner's manifest edits. */
	includedCount: number
	toast: ToastNote | null
	onCommandTextChange: (value: string) => void
	onSend: (event: FormEvent) => void
	onVoiceSubmit: (text: string) => void
	onResolveDecision: (decision: Exclude<DecisionState, "pending">) => void
	onJumpToDecision: () => void
	onOpenPeople: () => void
	onOpenSources: () => void
	onOpenPackage: () => void
	onOpenAutonomy: () => void
	onOpenHandoff: () => void
	/* Only a Discovery embedded beside Plan can open it. */
	onOpenPlan?: () => void
	active?: boolean
}) {
	const scenario = SCENARIOS[scenarioKey]
	const reduced = Boolean(useReducedMotion())
	const turnMotion = useRiseIn()
	const eventMotion = useEventMotion()
	const swapMotion = reduced ? {} : { initial: { y: 4, filter: "blur(3px)" }, animate: { y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.24, ease: REVEAL_EASE } }
	const interviewing = !interviewClosed
	const decisionPending = interviewClosed && phase === 4 && decision === "pending"
	const packageReady = phase >= OPERATIONS.length - 1
	const limitation = decision === "modified"
	const sourceRecords = scenario.sources.reduce((total, source) => total + Number(source.records.replace(/[^0-9]/g, "")), 0)
	const stakeholderInterviews = Math.min(people.length, Math.max(0, phase - 2))
	const currentInterviewPrompt = scenario.ownerInterview[Math.min(interviewIndex, scenario.ownerInterview.length - 1)]
	const decisionCopy = DECISION_COPY[scenarioKey]
	const scrollRef = useRef<HTMLDivElement>(null)
	const mainRef = useRef<HTMLElement>(null)
	const inspectorRef = useRef<HTMLElement>(null)
	const detailsToggleRef = useRef<HTMLButtonElement>(null)
	const voiceButtonRef = useRef<HTMLButtonElement>(null)
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const mountScrolledRef = useRef(false)
	const turnCountRef = useRef(messages.length)
	const thinkingShownRef = useRef(Boolean(pendingReply))
	const decisionPendingRef = useRef(decisionPending)
	decisionPendingRef.current = decisionPending
	// Where focus goes once the Details sheet has closed.
	const restoreFocusRef = useRef<"toggle" | "composer" | null>(null)
	const [voiceOpen, setVoiceOpen] = useState(false)
	// Leaving Discover ends the call: the microphone, playback and the inert page are released with it.
	useEffect(() => { if (!active) setVoiceOpen(false) }, [active])
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [detailsAsSheet, setDetailsAsSheet] = useState(false)
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
	// A streaming reply stays in view. While a decision holds the end of the log,
	// the reply is followed where it is instead of the log being pulled to its end.
	const followStream = useCallback(() => {
		const log = scrollRef.current
		if (!log) return
		if (decisionPendingRef.current) {
			const turn = latestTurn(log, false)
			if (!turn) return
			const box = log.getBoundingClientRect()
			const top = turn.getBoundingClientRect().top
			if (top >= box.top && top < box.bottom) revealExchange(log, false, "auto")
			return
		}
		if (log.scrollHeight - log.scrollTop - log.clientHeight < FOLLOW_DISTANCE) log.scrollTo({ top: log.scrollHeight })
	}, [])
	useEffect(() => {
		const log = scrollRef.current
		if (!log) return
		const grew = messages.length > turnCountRef.current
		const ownerSpoke = grew && messages.at(-1)?.actor === "user"
		turnCountRef.current = messages.length
		const thinkingStarted = Boolean(pendingReply) && !thinkingShownRef.current
		thinkingShownRef.current = Boolean(pendingReply)
		const card = log.querySelector<HTMLElement>(".decision-event")
		if (!mountScrolledRef.current) {
			// On mount — including resume — land instantly, and land ON the
			// decision when one is waiting instead of past it.
			mountScrolledRef.current = true
			if (card && decisionPending) {
				const top = card.getBoundingClientRect().top - log.getBoundingClientRect().top + log.scrollTop - Math.max(0, (log.clientHeight - card.clientHeight) / 2)
				log.scrollTo({ top: Math.max(0, top), behavior: "auto" })
				return
			}
			log.scrollTo({ top: log.scrollHeight, behavior: "auto" })
			return
		}
		const nearEnd = log.scrollHeight - log.scrollTop - log.clientHeight < FOLLOW_DISTANCE
		if (decisionPending) {
			// The gate keeps its place below the conversation, but the owner's own
			// turn and MAX's answer always come into view; the jump bar leads back.
			if (grew || thinkingStarted) revealExchange(log, Boolean(pendingReply))
			else if (card && nearEnd) revealWithin(log, card)
			return
		}
		// Anything the owner started follows; background progress only follows a
		// reader who is already at the end, so rereading is never interrupted.
		if (ownerSpoke || thinkingStarted || nearEnd) log.scrollTo({ top: log.scrollHeight, behavior: prefersInstantMotion() ? "auto" : "smooth" })
	}, [messages, pendingReply, phase, decisionPending])
	useEffect(() => {
		if (!decisionPending) { setDecisionInView(true); return }
		if (typeof IntersectionObserver === "undefined") return
		const log = scrollRef.current
		const card = log?.querySelector(".decision-event")
		if (!log || !card) return
		// The bar shows only while the whole card is below the strip the bar itself
		// covers, never while part of the card is readable.
		const reserve = Math.round(Number.parseFloat(getComputedStyle(log).scrollPaddingBottom) || 0)
		const observer = new IntersectionObserver(([entry]) => setDecisionInView(entry.isIntersecting), { root: log, rootMargin: `0px 0px -${reserve}px 0px`, threshold: 0 })
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

	// Details is a column while the workspace is wide enough and a sheet below
	// that; the toggle only shows in the sheet layout, so its display says which.
	useLayoutEffect(() => {
		const toggle = detailsToggleRef.current
		const layout = toggle?.closest<HTMLElement>(".thread-layout")
		if (!toggle || !layout) return
		const measure = () => setDetailsAsSheet(getComputedStyle(toggle).display !== "none")
		measure()
		if (typeof ResizeObserver === "undefined") return
		const observer = new ResizeObserver(measure)
		observer.observe(layout)
		return () => observer.disconnect()
	}, [])
	useEffect(() => {
		// Widening the workspace turns the sheet back into the column; its close
		// button disappears with it, so focus returns to the conversation.
		if (detailsAsSheet || !detailsOpen) return
		const active = document.activeElement
		// The close button may already have been blurred by the layout change.
		if (!active || active === document.body || inspectorRef.current?.contains(active)) restoreFocusRef.current = "composer"
		setDetailsOpen(false)
	}, [detailsAsSheet, detailsOpen])
	const closeDetails = useCallback(() => {
		restoreFocusRef.current = "toggle"
		setDetailsOpen(false)
	}, [])
	useLayoutEffect(() => {
		// The sheet is modal to the thread: the conversation behind it is inert,
		// focus moves in on open and returns to the toggle on close.
		mainRef.current?.toggleAttribute("inert", detailsOpen)
		if (detailsOpen) inspectorRef.current?.querySelector<HTMLElement>(".panel-close")?.focus({ preventScroll: true })
		else if (restoreFocusRef.current) {
			const target = restoreFocusRef.current === "toggle" ? detailsToggleRef.current : composerRef.current
			restoreFocusRef.current = null
			target?.focus({ preventScroll: true })
		}
	}, [detailsOpen])
	useEffect(() => {
		if (!detailsOpen) return
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return
			event.preventDefault()
			closeDetails()
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [detailsOpen, closeDetails])
	const trapDetailsFocus = (event: React.KeyboardEvent<HTMLElement>) => {
		if (!detailsOpen || event.key !== "Tab") return
		const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), summary, [href], [tabindex]:not([tabindex='-1'])")).filter((node) => node.getClientRects().length > 0)
		const first = focusable[0], last = focusable.at(-1)
		if (!first || !last) return
		if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
		else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
	}

	const destination = handoffDestination(scenarioKey)
	const title = interviewing ? "Your next step: answer MAX’s question"
		: decisionPending ? "Your next step: review the decision"
		: handoff ? `Handed to ${destination}`
		: packageReady ? "Your deliverables are ready to review"
		: paused ? "MAX paused the investigation"
		: "MAX is investigating"
	const subtitle = interviewing ? `Owner interview · question ${interviewIndex + 1} of ${scenario.ownerInterview.length}`
		: decisionPending ? paused ? "You paused the run. The decision is still waiting for you." : "Only the affected branch is waiting for you."
		: handoff ? `Packet ${handoff.id} · ${formatPacketTime(handoff.createdAt)}`
		: packageReady ? `${DELIVERABLES.length} evidence-linked documents, with owners and next steps.`
		: paused ? "Nothing new starts until you resume."
		: "Ask a question or steer the investigation. No decision is waiting."
	// One filled action per state; a finished package reads as a place to go, not a task.
	const toolbarAction = interviewing ? { label: "Answer question", primary: false, run: () => composerRef.current?.focus() }
		: decisionPending ? { label: "Review decision", primary: true, run: onJumpToDecision }
		: handoff && onOpenPlan ? { label: `Open in ${destination}`, primary: true, run: onOpenPlan }
		: packageReady ? { label: "Review deliverables", primary: false, run: onOpenPackage }
		: { label: "View progress", primary: false, run: onOpenAutonomy }
	const callout = interviewing ? <>MAX interviews you first. Each answer becomes the owner position; say “not sure” and MAX keeps it as an explicit gap instead of guessing.</>
		: handoff ? <>This Discovery is with {destination}. The packet is frozen: MAX answers questions from it, and any change goes to {destination} as a new request.</>
		: packageReady ? <>MAX finished inside the authority you approved. Ask about any finding before you hand the package to {destination}.</>
		: paused ? <>You paused the run. MAX holds the last verified checkpoint, and nothing new starts until you resume.</>
		: <>MAX runs the Discovery inside the authority you approved. Only material exceptions stop the work, and they appear here.</>
	const composer = interviewing ? { placeholder: "Answer MAX or add context…", scope: "Owner interview · approved scope only" }
		: handoff ? { placeholder: "Ask about this package…", scope: `Packet ${handoff.id} · read-only` }
		: packageReady ? { placeholder: "Ask about the findings…", scope: "Package ready · approved scope only" }
		: decisionPending ? { placeholder: "Ask about the decision or steer MAX…", scope: "This Discovery · approved scope only" }
		: paused ? { placeholder: "Ask a question, or say “resume”…", scope: "Paused · nothing new starts" }
		: { placeholder: "Guide MAX while it works…", scope: "This Discovery · approved scope only" }
	const suggestions = interviewing ? [`Check ${scenario.sources[0].system} and verify this`, "Add a stakeholder", "End the owner interview"]
		: handoff ? ["Summarise the decision package", "Who are the stakeholders?"]
		: ["Add a stakeholder", "Send the sponsor a status update"]
	const needsYou = needsYouItems({ scenarioKey, phase, decision, interviewClosed, interviewIndex, charterPending: packageReady && !charterApproved && !handoff, onJumpToDecision, onOpenThread: () => composerRef.current?.focus(), onOpenHandoff })
	const journey = runJourney({ scenarioKey, phase, paused, decision, interviewClosed, handoffId: handoff?.id ?? null })
	const digest = packageReady ? { key: "done", icon: <CheckCircle size={13} weight="fill" className="band-check" />, text: <>Discovery completed and routed for approval</> }
		: phase === 6 ? { key: "synthesis", icon: <CheckCircle size={13} weight="fill" className="band-check" />, text: <>Synthesis ready · building the package</> }
		: paused ? { key: "paused", icon: <PauseCircle size={13} weight="fill" />, text: <>Paused at the last verified checkpoint</> }
		: { key: `phase-${phase}`, icon: <ArrowsSplit size={13} />, text: <>MAX moved to <strong>{OPERATIONS[phase].label}</strong></> }
	const digestDetail = decisionPending ? "One decision needs you. Unaffected branches continue."
		: phase === 6 ? `Claims and interview evidence are reconciled. ${DELIVERABLES.length} deliverables are generating from readiness snapshot v7.`
		: OPERATIONS[phase].detail
	const showJumpChip = decisionPending && !decisionInView

	return (
		<div className={`thread-layout${detailsOpen ? " is-details-open" : ""}`}>
			<section ref={mainRef} className="thread-main" aria-label="Thread">
				<header className="thread-toolbar">
					<div className="thread-heading">
						<h1>{title}</h1>
						<p>{subtitle}</p>
					</div>
					<div className="thread-toolbar-actions">
						<DsButton ref={detailsToggleRef} size="sm" className="thread-details-toggle" aria-expanded={detailsOpen} onClick={() => setDetailsOpen(current => !current)}><SidebarSimple size={16} />Details</DsButton>
						<DsButton size="sm" variant={toolbarAction.primary ? "primary" : "secondary"} onClick={toolbarAction.run}>
							{toolbarAction.primary && handoff ? <ArrowUpRight size={14} /> : null}{toolbarAction.label}
						</DsButton>
					</div>
				</header>

				<div className="message-log" ref={scrollRef} role="log" aria-live="polite" aria-label="Discovery owner chat messages" tabIndex={0}>
					<div className="thread-column">
						<div className="thread-callout" role="note">
							<Info size={16} />
							<p>{callout}</p>
						</div>

						<AnimatePresence initial={false} mode="popLayout">
							{messages.map((message) => message.actor === "max" ? (
								<motion.article key={message.id} {...turnMotion} className="message max-message thread-turn">
									<div className="turn-speaker">
										<img className="turn-avatar" src={publicAsset("maxion-logo-gradient.svg")} alt="" />
										<span className="message-author">MAX</span>
										{message.question ? <><CaretRight size={12} className="turn-sep" aria-hidden="true" /><span className="interview-question-label">{message.question.topic} · {message.question.current} of {message.question.total}</span><span className="turn-chip"><ChatCircleText size={12} />Interview</span></> : null}
									</div>
									<MaxMessageBody message={message} fresh={STREAMABLE_MESSAGE_IDS.has(message.id) && !STREAMED_MESSAGE_IDS.has(message.id)} finalize={message.id !== streamingMessageId} onSettle={markStreamed} targets={mentionTargets} onJump={jumpFromMention} onGrow={followStream} />
								</motion.article>
							) : (
								<motion.article key={message.id} {...turnMotion} className="message user-message thread-turn is-owner">
									<div className="message-body turn-bubble">
										<p>{message.text}</p>
									</div>
									<span className="turn-meta-chip">Owner</span>
								</motion.article>
							))}
							{pendingReply ? (
								<motion.div key="thinking" {...turnMotion} className="thread-turn is-thinking dsc-thinking-row" role="status">
									<div className="turn-speaker"><img className="turn-avatar" src={publicAsset("maxion-logo-gradient.svg")} alt="" /><span className="message-author">MAX</span></div>
									<div className="turn-bubble"><span className="dsc-thinking-dots" aria-hidden="true"><i /><i /><i /></span><p><ShimmerText>{pendingReply}</ShimmerText></p></div>
								</motion.div>
							) : null}
						</AnimatePresence>

						<AnimatePresence initial={false}>
							{interviewing ? null : (
								<motion.section key="digest" {...eventMotion} className="thread-event thread-band autonomy-thread-digest" aria-label="Autonomous work summary">
									<p className="band-kicker"><FlowArrow size={13} />Autonomy <strong>{journeyProgress(phase, journey).label}</strong></p>
									<p className="band-line">
										<SwapPresence instant={reduced}>
											<motion.span key={digest.key} className="band-line-text" {...swapMotion}>{digest.icon}{digest.text}</motion.span>
										</SwapPresence>
									</p>
									<details className="band-more">
										<summary>Show more</summary>
										<p>{digestDetail}</p>
										<div className="band-facts">
											<button type="button" onClick={onOpenSources}><span>Records</span> <strong>{phase >= 2 ? sourceRecords.toLocaleString() : "—"}</strong></button>
											<button type="button" onClick={onOpenPeople}><span>Interviews</span> <strong>{stakeholderInterviews}</strong></button>
										</div>
									</details>
									<button className="band-link" type="button" onClick={onOpenAutonomy}>Open autonomy</button>
								</motion.section>
							)}

							{decisionPending ? (
								<motion.section key="decision" {...eventMotion} className="thread-event decision-event" aria-labelledby="thread-decision-title">
									<DecisionBoundary scenarioKey={scenarioKey} headingId="thread-decision-title" onResolve={onResolveDecision} />
								</motion.section>
							) : null}

							{packageReady && !handoff ? (
								<motion.section key="package" {...eventMotion} className="thread-event package-event" aria-labelledby="thread-package-title">
									<p className="callout-line"><CheckCircle size={16} weight="fill" />Package ready{limitation ? <DsBadge tone="warning">1 limitation recorded</DsBadge> : null}</p>
									<div className="callout-card">
										<div>
											<h2 id="thread-package-title">Final plan and recommendations</h2>
											<p>{DELIVERABLES.length} deliverables were generated from the verified readiness snapshot and routed to the approved recipients.{limitation ? ` ${decisionCopy.limitation}` : ""}</p>
										</div>
										<DsButton size="sm" onClick={onOpenPackage}>Open package</DsButton>
									</div>
								</motion.section>
							) : null}

							{handoff ? (
								<motion.section key="handoff" {...eventMotion} className="thread-event thread-band handoff-event" aria-label={`Handoff to ${destination}`}>
									<p className="band-kicker"><ArrowUpRight size={13} />Handoff <strong>{handoff.id}</strong></p>
									<span className="band-time">{formatPacketTime(handoff.createdAt)}</span>
									<p className="band-line"><CheckCircle size={13} weight="fill" className="band-check" />Packet sent to {destination} · {includedCount} documents · manifest v4{limitation ? <DsBadge tone="warning">1 limitation recorded</DsBadge> : null}</p>
									{handoff.note ? <p className="band-note">Your note: “{handoff.note}”</p> : null}
								</motion.section>
							) : null}
						</AnimatePresence>
					</div>
				</div>

				<div className="thread-dock">
					<div className="thread-dock-float">
						{showJumpChip ? (
							<button type="button" className="decision-jump-chip" onClick={onJumpToDecision}>
								<ShieldCheck size={14} weight="fill" /><span>1 decision needs you</span><span className="jump-action">Jump to it <ArrowRight size={12} weight="bold" /></span>
							</button>
						) : null}
						<ToastRegion toast={toast} className="is-docked" />
					</div>
					<details className="dsc-mobile-brief"><summary>Discovery brief<CaretDown size={14} /></summary><p>{missionBrief || missionDecision}</p></details>
					<ThreadComposer
						value={commandText}
						onChange={onCommandTextChange}
						onSubmit={onSend}
						inputRef={composerRef}
						voiceButtonRef={voiceButtonRef}
						onVoice={() => setVoiceOpen(true)}
						placeholder={composer.placeholder}
						scope={composer.scope} />
				</div>
			</section>

			{detailsOpen ? <button type="button" className="thread-scrim" aria-label="Close details" tabIndex={-1} onClick={closeDetails} /> : null}
			<aside
				ref={inspectorRef}
				className="conversation-context thread-inspector"
				aria-label="Discovery context"
				role={detailsOpen ? "dialog" : undefined}
				aria-modal={detailsOpen ? true : undefined}
				onKeyDown={trapDetailsFocus}>
				<header className="panel-head">
					<h2>Details</h2>
					<button type="button" className="panel-close" aria-label="Hide details" onClick={closeDetails}><X size={16} /></button>
				</header>

				<NeedsYouGroup items={needsYou} headingId="thread-needs-you" />
				<JourneyGroup phase={phase} context={journey} headingId="thread-journey" />

				<section className="panel-group" aria-labelledby="thread-brief">
					<h3 id="thread-brief">Discovery brief</h3>
					<p className="panel-desc panel-brief">{missionBrief || missionDecision}</p>
				</section>

				<section className="panel-group" aria-labelledby="thread-coverage">
					<h3 id="thread-coverage">Coverage</h3>
					<p className="panel-desc">Who MAX is talking to and what it is reading.</p>
					<div className="panel-card">
						<button className="panel-row is-stacked context-section interactive" type="button" onClick={onOpenPeople}>
							<UsersThree size={16} className="panel-row-icon" />
							<span className="panel-row-label">Stakeholders</span>{" "}
							<span className="panel-row-value">{people.length} mapped</span>{" "}
							<span className="panel-row-sub">{joinNames(people)}</span>
							<CaretRight size={14} className="panel-row-caret" />
						</button>
						<button className="panel-row is-stacked context-section interactive" type="button" onClick={onOpenSources}>
							<Database size={16} className="panel-row-icon" />
							<span className="panel-row-label">Connected sources</span>{" "}
							<span className="panel-row-value">{scenario.sources.length} reading automatically</span>{" "}
							<span className="panel-row-sub">{scenario.sources.map((source) => source.system).join(" · ")}</span>
							<CaretRight size={14} className="panel-row-caret" />
						</button>
						{phase >= 6 ? (
							<button className="panel-row is-stacked context-section interactive package-context" type="button" onClick={onOpenPackage}>
								<Package size={16} className="panel-row-icon" />
								<span className="panel-row-label">Decision package</span>{" "}
								<span className="panel-row-value">{handoff ? `With ${destination}` : packageReady ? `${includedCount} ready` : "Generating"}</span>{" "}
								<span className="panel-row-sub">{handoff ? `Packet ${handoff.id} · frozen` : packageReady ? "Open the reader and approvals." : "Outputs appear as synthesis lands."}</span>
								<CaretRight size={14} className="panel-row-caret" />
							</button>
						) : null}
					</div>
				</section>

				{interviewing ? (
					<section className="panel-group" aria-labelledby="thread-evidence">
						<h3 id="thread-evidence">Useful evidence</h3>
						<p className="panel-desc">{currentInterviewPrompt.evidenceHint}</p>
					</section>
				) : null}

				<section className="panel-group command-examples" aria-labelledby="thread-direct">
					<h3 id="thread-direct">{handoff ? "Ask MAX" : "Direct MAX"}</h3>
					<p className="panel-desc">Start from a suggestion. Nothing is sent until you press Send.</p>
					<div className="panel-card">
						{suggestions.map((suggestion) => (
							<button key={suggestion} type="button" className="panel-row is-suggestion" onClick={() => onCommandTextChange(suggestion)}>
								<Plus size={14} className="panel-row-icon" />“{suggestion.startsWith("Check ") ? `Verify this from ${scenario.sources[0].system}` : suggestion}”
							</button>
						))}
					</div>
				</section>
			</aside>

			<VoiceInterview
				open={voiceOpen}
				onClose={() => {
					setVoiceOpen(false)
					window.requestAnimationFrame(() => voiceButtonRef.current?.focus())
				}}
				onSubmit={onVoiceSubmit}
				messages={messages}
				question={interviewing ? lastMaxMessage?.prompt ?? lastMaxMessage?.text ?? currentInterviewPrompt.question : VOICE_OPEN_QUESTION}
				topicLabel={interviewing && lastMaxMessage?.question ? `${lastMaxMessage.question.topic} · ${lastMaxMessage.question.current} of ${lastMaxMessage.question.total}` : null}
				interviewing={interviewing}
				questionNumber={interviewIndex + 1}
				questionTotal={scenario.ownerInterview.length}
			/>
		</div>
	)
}

/* Only live work spins. Waiting on the owner is amber; the owner's own pause is a quiet grey. */
function StageGlyph({ status, size = 16, className }: { status: JourneyStageStatus; size?: number; className?: string }) {
	if (status === "complete") return <CheckCircle size={size} weight="fill" className={className} />
	if (status === "current") return <CircleNotch size={size} className={className ? `${className} spin` : "spin"} />
	if (status === "blocked") return <Warning size={size} weight="fill" className={className} />
	if (status === "paused") return <PauseCircle size={size} weight="fill" className={className} />
	return <Circle size={size} className={className} />
}

function JourneyIcon({ status }: { status: JourneyStageStatus }) {
	return <StageGlyph status={status} className={`panel-row-icon ${status === "blocked" ? "is-warning" : `is-${status}`}`} />
}

/*
 * The composer is the Test AI agent card: the text field on top, the scope on
 * the left of the bar where the reference keeps "End chat", and a ghost action
 * beside the filled Send on the right.
 */
function ThreadComposer({ value, onChange, onSubmit, inputRef, voiceButtonRef, onVoice, placeholder, scope }: {
	value: string
	onChange: (value: string) => void
	onSubmit: (event: FormEvent) => void
	inputRef: React.RefObject<HTMLTextAreaElement>
	voiceButtonRef: React.RefObject<HTMLButtonElement>
	onVoice: () => void
	placeholder: string
	scope: string
}) {
	useLayoutEffect(() => {
		const input = inputRef.current
		if (!input) return
		input.style.height = "auto"
		input.style.height = `${Math.min(160, input.scrollHeight)}px`
	}, [value, inputRef])
	return (
		<form className="thread-composer" onSubmit={event => { event.preventDefault(); if (value.trim()) onSubmit(event) }}>
			<textarea
				ref={inputRef}
				aria-label="Message MAX"
				value={value}
				rows={1}
				placeholder={placeholder}
				onChange={event => onChange(event.target.value)}
				onKeyDown={event => {
					if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
						event.preventDefault()
						if (value.trim()) event.currentTarget.form?.requestSubmit()
					}
				}} />
			<div className="thread-composer-bar">
				<span className="thread-composer-scope"><ShieldCheck size={14} />{scope}</span>
				<div className="thread-composer-actions">
					<button ref={voiceButtonRef} type="button" className="ds-button ds-button--ghost ds-button--sm" onClick={onVoice}><Microphone size={16} />Voice</button>
					<button type="submit" className="ds-button ds-button--primary ds-button--sm thread-send" disabled={!value.trim()}><ArrowUp size={14} weight="bold" />Send</button>
				</div>
			</div>
		</form>
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
	const wordCount = message.text.split(" ").length
	const revealed = useStreamedWordCount(message.text, freshRef.current, finalize)
	const done = revealed >= wordCount
	// The last words are still resolving from their blur when the count lands,
	// so the linked, final text replaces them a beat later.
	const [settled, setSettled] = useState(done)
	useEffect(() => {
		if (!done) { setSettled(false); return }
		if (finalize || prefersInstantMotion()) { setSettled(true); return }
		const timer = window.setTimeout(() => setSettled(true), 440)
		return () => window.clearTimeout(timer)
	}, [done, finalize])
	useEffect(() => { if (!done) onGrow() }, [revealed, done, onGrow])
	return (
		<>
			<div className="message-body turn-bubble">
				<p>{settled ? linkifyMentions(message.text, targets, onJump) : <GeneratedWords text={message.text} revealed={revealed} />}</p>
			</div>
			<AnimatePresence initial={false}>
				{message.trace && settled ? <motion.div key="trace" {...riseIn} className="message-trace-wrap"><MessageTrace steps={message.trace} /></motion.div> : null}
			</AnimatePresence>
		</>
	)
}

/*
 * Voice is the ElevenLabs agent voice preview (mobbin 5de031ac): a slim bar
 * with Back and the conversation's name, the orb with its call button in the
 * middle, and the running transcript on the right above a pill composer.
 *
 * The session is a modal over the whole viewport. It renders on document.body
 * so no transformed ancestor can trap it inside the stage, and everything else
 * on the page is inert while it is open.
 */
type VoiceIssue = "unsupported" | "blocked" | "no-mic" | "network" | "start"
type VoiceNotice = { tone: "warning" | "info"; icon: "warning" | "info" | "speaker"; title: string; detail: string }

const VOICE_ISSUES: Record<VoiceIssue, { label: string; title: string; detail: string }> = {
	unsupported: { label: "This browser can’t transcribe speech", title: "Type your answers here", detail: "MAX still reads each question aloud, and your answers go into the same owner thread." },
	blocked: { label: "Microphone access is blocked", title: "Allow the microphone, then retry", detail: "Use the site settings in your browser’s address bar, or type your answer below." },
	"no-mic": { label: "No microphone found", title: "Connect a microphone, then retry", detail: "Or type your answer below." },
	network: { label: "Voice transcription is offline", title: "Check your connection, then retry", detail: "Or type your answer below." },
	start: { label: "Voice input couldn’t start", title: "Retry voice input", detail: "Or type your answer below." },
}
const NOTHING_HEARD: VoiceNotice = { tone: "info", icon: "info", title: "I didn’t hear anything", detail: "Press the mic and try again, or type your answer." }
const PLAYBACK_FAILED: VoiceNotice = { tone: "info", icon: "speaker", title: "Audio playback isn’t available", detail: "MAX’s reply is in the transcript above." }
const QUESTION_UNREAD: VoiceNotice = { tone: "info", icon: "speaker", title: "Audio playback isn’t available", detail: "Read MAX’s question on screen and answer when you’re ready." }
const PLAYBACK_MISSING: VoiceNotice = { tone: "info", icon: "speaker", title: "MAX can’t speak in this browser", detail: "Questions and replies appear on screen." }
const VOICE_FOCUSABLE = "button:not(:disabled), textarea:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex='-1'])"
// A voice that has not started by now is silent; the turn goes back to the owner.
const VOICE_START_WATCHDOG_MS = 4_000

function recognitionIssue(error: string): VoiceIssue | "nothing-heard" | null {
	switch (error) {
		case "not-allowed":
		case "service-not-allowed": return "blocked"
		case "audio-capture": return "no-mic"
		case "network": return "network"
		case "no-speech": return "nothing-heard"
		// We abort recognition ourselves when the owner sends, stops or closes.
		case "aborted": return null
		default: return "start"
	}
}

function VoiceInterview(props: {
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
	// Each opening is a fresh session: state, audio and focus start over.
	return props.open ? <VoiceSession {...props} /> : null
}

function VoiceSession({
	onClose,
	onSubmit,
	messages,
	question,
	topicLabel,
	interviewing,
	questionNumber,
	questionTotal,
}: {
	onClose: () => void
	onSubmit: (text: string) => void
	messages: ChatMessage[]
	question: string
	topicLabel: string | null
	interviewing: boolean
	questionNumber: number
	questionTotal: number
}) {
	const reduced = useReducedMotion()
	const noticeMotion = useRiseIn()
	const [recognitionSupported] = useState(() => Boolean(getSpeechRecognitionConstructor()))
	const [synthesisSupported] = useState(() => typeof window !== "undefined" && Boolean(window.speechSynthesis) && typeof window.SpeechSynthesisUtterance === "function")
	// With no recognition the session is typed; its resting state carries that notice.
	const restState: VoiceState = recognitionSupported ? "ready" : "error"
	const [state, setState] = useState<VoiceState>("consent")
	const [issue, setIssue] = useState<VoiceIssue | null>(null)
	const [notice, setNotice] = useState<VoiceNotice | null>(null)
	const [transcript, setTranscript] = useState("")
	const [awaitingFromCount, setAwaitingFromCount] = useState<number | null>(null)
	// The opening utterance keeps the surface on "Ready when you are": the label
	// stays true (you may answer at any moment) while MAX reads the question.
	const [introSpeaking, setIntroSpeaking] = useState(false)
	const [spokenChars, setSpokenChars] = useState(0)
	const backdropRef = useRef<HTMLDivElement>(null)
	const dialogRef = useRef<HTMLElement>(null)
	const micRef = useRef<HTMLButtonElement>(null)
	const transcriptRef = useRef<HTMLTextAreaElement>(null)
	const panelRef = useRef<HTMLDivElement>(null)
	const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
	const playbackRef = useRef({ token: 0, timer: 0 })
	const voiceChosenRef = useRef(false)
	const focusCallRef = useRef(false)
	// What was already on screen when the session began renders whole; only what
	// arrives during the session streams in.
	const [knownIds] = useState(() => new Set(messages.map(message => message.id)))
	const openQuestionRef = useRef(question)
	const questionRef = useRef(question)
	questionRef.current = question

	const cancelPlayback = () => {
		playbackRef.current.token += 1
		window.clearTimeout(playbackRef.current.timer)
		if (synthesisSupported) window.speechSynthesis.cancel()
	}

	// Reads `text` aloud and calls `done` exactly once: when the voice ends, fails,
	// never starts, or runs past any sensible length without ending.
	const speak = (text: string, onBoundary: (upTo: number) => void, done: (played: boolean) => void) => {
		cancelPlayback()
		if (!synthesisSupported || !text.trim()) { done(false); return }
		const token = playbackRef.current.token
		const current = () => playbackRef.current.token === token
		const finish = (played: boolean) => {
			if (!current()) return
			cancelPlayback()
			done(played)
		}
		try {
			const utterance = new SpeechSynthesisUtterance(text)
			utterance.rate = 0.96
			utterance.pitch = 0.98
			utterance.onboundary = (event) => { if (current()) onBoundary(event.charIndex + (event.charLength || 0)) }
			utterance.onstart = () => {
				if (!current()) return
				window.clearTimeout(playbackRef.current.timer)
				// Some voices never fire onend; the waveform must not run forever.
				playbackRef.current.timer = window.setTimeout(() => finish(true), 3_000 + text.split(/\s+/).length * 450)
			}
			utterance.onend = () => finish(true)
			utterance.onerror = () => finish(false)
			window.speechSynthesis.speak(utterance)
			playbackRef.current.timer = window.setTimeout(() => finish(false), VOICE_START_WATCHDOG_MS)
		} catch {
			finish(false)
		}
	}

	const releaseRecognition = () => {
		const recognition = recognitionRef.current
		recognitionRef.current = null
		recognition?.abort()
	}

	// Focus goes back to the transcript only when it has nowhere better to be.
	const reclaimFocus = () => {
		const active = document.activeElement
		if (!active || active === document.body || !dialogRef.current?.contains(active)) transcriptRef.current?.focus({ preventScroll: true })
	}

	const settle = () => {
		setSpokenChars(0)
		setState(restState)
		reclaimFocus()
	}

	useLayoutEffect(() => {
		const backdrop = backdropRef.current
		if (!backdrop) return
		const shelved = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== backdrop && !node.inert && node.tagName !== "SCRIPT")
		for (const node of shelved) node.inert = true
		backdrop.querySelector<HTMLElement>(".voice-consent-button")?.focus({ preventScroll: true })
		return () => {
			for (const node of shelved) node.inert = false
		}
	}, [])

	useEffect(() => () => {
		releaseRecognition()
		cancelPlayback()
	}, [])

	// The caller passes an inline onClose. Reading it through a ref keeps the
	// listener registered once: a shell re-render during the same keydown would
	// otherwise swap it out mid-dispatch and the browser would skip it.
	const closeRef = useRef(onClose)
	useEffect(() => { closeRef.current = onClose })
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return
			event.preventDefault()
			closeRef.current()
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])

	useEffect(() => {
		const panel = panelRef.current
		if (panel) panel.scrollTop = panel.scrollHeight
	}, [messages, state])

	useLayoutEffect(() => {
		const field = transcriptRef.current
		if (!field) return
		field.style.height = "auto"
		field.style.height = `${field.scrollHeight}px`
	}, [transcript])

	// Consent unmounts the button that held focus; the call's own control takes it
	// in the same commit, so nothing waits on a frame.
	const consent = state === "consent"
	useLayoutEffect(() => {
		if (consent || !focusCallRef.current) return
		focusCallRef.current = false
		;(recognitionSupported ? micRef.current : transcriptRef.current)?.focus({ preventScroll: true })
	}, [consent, recognitionSupported])

	useEffect(() => {
		if (awaitingFromCount === null || messages.length <= awaitingFromCount) return
		const latest = messages.at(-1)
		if (!latest || latest.actor !== "max") return
		setAwaitingFromCount(null)
		if (!voiceChosenRef.current || !synthesisSupported) { settle(); return }
		// Voice reads the bare question, as the transcript shows it; the stage follows
		// the reading only when it shows those same words.
		const spoken = latest.prompt ?? latest.text
		const onStage = spoken === questionRef.current
		setSpokenChars(0)
		setState("speaking")
		speak(spoken, upTo => { if (onStage) setSpokenChars(upTo) }, played => {
			if (!played) setNotice(PLAYBACK_FAILED)
			settle()
		})
	}, [awaitingFromCount, messages])

	const endIntroSpeech = () => {
		setIntroSpeaking(false)
		setSpokenChars(0)
	}

	const readQuestion = () => {
		if (!synthesisSupported) return
		setSpokenChars(0)
		setIntroSpeaking(true)
		speak(question, setSpokenChars, played => {
			endIntroSpeech()
			if (!played) setNotice(QUESTION_UNREAD)
		})
	}

	const beginSession = () => {
		voiceChosenRef.current = true
		openQuestionRef.current = question
		focusCallRef.current = true
		setState(restState)
		readQuestion()
	}

	const beginListening = () => {
		voiceChosenRef.current = true
		setNotice(null)
		setIssue(null)
		cancelPlayback()
		endIntroSpeech()
		releaseRecognition()
		const SpeechRecognition = getSpeechRecognitionConstructor()
		if (!SpeechRecognition) {
			setState("error")
			setIssue("unsupported")
			transcriptRef.current?.focus({ preventScroll: true })
			return
		}
		const recognition = new SpeechRecognition()
		const current = () => recognitionRef.current === recognition
		recognition.continuous = true
		recognition.interimResults = true
		recognition.lang = "en-US"
		recognition.onresult = (event) => {
			if (!current()) return
			let nextTranscript = ""
			for (let index = 0; index < event.results.length; index += 1) {
				nextTranscript += `${event.results[index][0]?.transcript ?? ""} `
			}
			setTranscript(nextTranscript.trim())
		}
		recognition.onerror = (event) => {
			if (!current()) return
			const next = recognitionIssue(event.error)
			if (next === null) return
			recognitionRef.current = null
			if (next === "nothing-heard") {
				setNotice(NOTHING_HEARD)
				setState("ready")
				return
			}
			setIssue(next)
			setState("error")
			transcriptRef.current?.focus({ preventScroll: true })
		}
		recognition.onend = () => {
			if (!current()) return
			recognitionRef.current = null
			setState(state => state === "listening" ? "ready" : state)
		}
		recognitionRef.current = recognition
		setState("listening")
		try {
			recognition.start()
		} catch {
			recognitionRef.current = null
			setIssue("start")
			setState("error")
			transcriptRef.current?.focus({ preventScroll: true })
		}
	}

	const stopListening = () => {
		// stop() still delivers the final result, so the handlers stay attached until onend.
		recognitionRef.current?.stop()
		setState("ready")
		transcriptRef.current?.focus({ preventScroll: true })
	}

	const stopSpeaking = () => {
		cancelPlayback()
		endIntroSpeech()
		setState(restState)
	}

	const pressMic = () => {
		if (state === "thinking") return
		if (state === "listening") stopListening()
		else if (state === "speaking" || (!recognitionSupported && introSpeaking)) stopSpeaking()
		else if (recognitionSupported) beginListening()
	}

	const submitTranscript = () => {
		const answer = transcript.trim()
		if (!answer || state === "thinking") return
		releaseRecognition()
		cancelPlayback()
		endIntroSpeech()
		setAwaitingFromCount(messages.length)
		setState("thinking")
		setNotice(null)
		setIssue(null)
		onSubmit(answer)
		setTranscript("")
		transcriptRef.current?.focus({ preventScroll: true })
	}

	const trapTab = (event: React.KeyboardEvent<HTMLElement>) => {
		if (event.key !== "Tab") return
		const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(VOICE_FOCUSABLE)).filter(node => node.getClientRects().length > 0)
		const first = focusable[0], last = focusable.at(-1)
		const active = document.activeElement
		if (!first || !last) { event.preventDefault(); return }
		if (!(active instanceof HTMLElement) || !focusable.includes(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return }
		if (event.shiftKey && active === first) { event.preventDefault(); last.focus() }
		else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
	}

	const live = state === "listening" || state === "speaking" || introSpeaking
	const issueKey: VoiceIssue | null = state === "error" ? issue ?? "unsupported" : recognitionSupported ? null : "unsupported"
	const issueCopy = issueKey ? VOICE_ISSUES[issueKey] : null
	const callout: VoiceNotice | null = issueCopy && issueKey
		? { tone: "warning", icon: "warning", title: issueCopy.title, detail: issueKey === "unsupported" && !synthesisSupported ? "Questions and replies appear on screen, and your answers go into the same owner thread." : issueCopy.detail }
		: notice ?? (synthesisSupported ? null : PLAYBACK_MISSING)
	const pill = consent ? { label: "Not started", tone: "" }
		: !recognitionSupported ? { label: "Typing only", tone: " is-warning" }
		: state === "error" ? { label: "Voice unavailable", tone: " is-warning" }
		: live ? { label: "Live", tone: " is-positive" }
		: { label: "Connected", tone: "" }
	const stageLabel = {
		consent: "Before we begin",
		ready: "Ready when you are",
		listening: "Listening",
		thinking: "MAX is considering your answer",
		speaking: "MAX is responding",
		error: issueCopy?.label ?? VOICE_ISSUES.start.label,
	}[state]
	const stopsSpeech = state === "speaking" || (!recognitionSupported && introSpeaking)
	const micInert = state === "thinking" || (!recognitionSupported && !stopsSpeech)
	const micLabel = state === "listening" ? "Stop listening"
		: stopsSpeech ? "Stop MAX speaking"
		: !recognitionSupported ? "Voice input isn’t available in this browser"
		: state === "error" ? "Retry voice input"
		: "Start listening"
	const micIcon = state === "listening" ? <Waveform size={20} weight="bold" />
		: stopsSpeech ? <SpeakerHigh size={20} weight="fill" />
		: !recognitionSupported ? <MicrophoneSlash size={20} weight="fill" />
		: <Microphone size={20} weight="fill" />
	const highlightUpTo = (introSpeaking || state === "speaking") ? spokenChars : 0
	const recent = messages.slice(-4)
	const placeholder = state === "thinking" ? "Waiting for MAX…"
		: state === "listening" ? "Your words appear here…"
		: recognitionSupported ? "Speak or type your response…"
		: "Type your response…"
	const consentTitle = recognitionSupported
		? interviewing ? "Continue this interview by voice" : "Talk to MAX about this Discovery"
		: interviewing ? "Continue this interview by typing" : "Ask MAX about this Discovery by typing"
	const consentBody = recognitionSupported
		? "Your speech is transcribed into the same owner thread. This prototype uses your browser’s voice services and does not retain the original audio."
		: synthesisSupported
			? "This browser can’t transcribe speech, so you type your answers. MAX reads each question aloud, and nothing is recorded."
			: "This browser has no voice services, so this session is typed. Your answers go into the same owner thread."
	const consentDetails = recognitionSupported
		? ["The transcript stays visible in the thread", "You can switch back to typing at any time"]
		: ["Your answers stay visible in the thread", synthesisSupported ? "MAX reads its questions aloud" : "Questions appear on screen"]

	return createPortal(
		<div ref={backdropRef} className="prototype ds-scope voice-backdrop">
			<motion.section
				ref={dialogRef}
				className="voice-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby="voice-dialog-title"
				onKeyDown={trapTab}
				initial={reduced ? false : { y: 8, scale: 0.995, filter: "blur(3px)" }}
				animate={{ y: 0, scale: 1, filter: "blur(0px)" }}
				transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}>
				<header className="voice-bar">
					<button className="ds-button ds-button--ghost ds-button--sm voice-back" type="button" aria-label="Close voice session" onClick={onClose}><CaretLeft size={14} />Back</button>
					<div className="voice-bar-title">
						<h2 id="voice-dialog-title">{interviewing ? "Owner interview" : "Mission conversation"}</h2>
						<span className="voice-bar-sep" aria-hidden="true" />
						<span>{interviewing ? `Question ${questionNumber} of ${questionTotal}` : "Context active"}</span>
						<span className={`workspace-status${pill.tone}`}><span aria-hidden="true" />{pill.label}</span>
					</div>
					<span className="voice-bar-end" />
				</header>

				<div className={`voice-body${consent ? " is-consent" : ""}`}>
					<div className="voice-stage">
						<div className="voice-stage-main">
							{consent ? (
								<div className="voice-consent">
									<Orb size="lg" still={!recognitionSupported} className="voice-orb" />
									<p className="voice-state-label">{stageLabel}</p>
									<h3>{consentTitle}</h3>
									<p>{consentBody}</p>
									<ul className="voice-consent-details">
										{consentDetails.map(detail => <li key={detail}><CheckCircle size={16} weight="fill" />{detail}</li>)}
									</ul>
									<DsButton variant="primary" className="voice-consent-button" onClick={beginSession}>
										{recognitionSupported ? <><Microphone size={16} />Continue with voice</> : <><Keyboard size={16} />Continue by typing</>}
									</DsButton>
								</div>
							) : (
								<>
									<Orb size="lg" active={live} still={state === "error"} className="voice-orb">
										<button
											ref={micRef}
											className={`voice-mic-button${state === "listening" ? " listening" : ""}`}
											type="button"
											aria-label={micLabel}
											aria-disabled={micInert || undefined}
											title={!recognitionSupported && !stopsSpeech ? micLabel : undefined}
											onClick={pressMic}>
											{micIcon}
										</button>
									</Orb>
									<p className={`voice-state-label${state === "error" ? " is-warning" : ""}`} aria-live="polite">
										{state === "error" ? <Warning size={14} weight="fill" aria-hidden="true" /> : null}
										{state === "thinking" ? <ShimmerText>{stageLabel}</ShimmerText> : stageLabel}
									</p>
									{topicLabel ? <span className="turn-chip voice-question-topic">{topicLabel}</span> : null}
									<p className="voice-question"><VoiceWords key={question} text={question} fresh={question !== openQuestionRef.current} spokenUpTo={highlightUpTo} /></p>
								</>
							)}
						</div>
						{consent ? null : (
							<div className="voice-pill">
								<button type="button" onClick={onClose}>End voice session</button>
							</div>
						)}
					</div>

					<aside className="voice-panel" aria-label="Voice transcript">
						<div className="voice-log" ref={panelRef}>
							{consent ? (
								<div className="voice-empty"><span><ChatCircleText size={16} /></span><p>{interviewing ? "Start the call or type an answer to continue the interview" : "Start the call or type a message to ask MAX about this Discovery"}</p></div>
							) : (
								<>
									<p className="voice-panel-note">{recognitionSupported ? "Voice session started" : "Typed session started"}</p>
									{recent.map(message => message.actor === "max" ? (
										<div key={message.id} className="voice-turn is-max"><img src={publicAsset("maxion-logo-gradient.svg")} alt="" /><p><VoiceWords text={message.prompt ?? message.text} fresh={!knownIds.has(message.id)} /></p></div>
									) : (
										<div key={message.id} className="voice-turn is-owner"><p>{message.text}</p></div>
									))}
									{state === "thinking" ? <div className="voice-turn is-max"><img src={publicAsset("maxion-logo-gradient.svg")} alt="" /><p><span className="dsc-thinking-dots" aria-hidden="true"><i /><i /><i /></span></p></div> : null}
								</>
							)}
						</div>
						<div className="voice-transcript">
							<div role="status">
								<AnimatePresence initial={false} mode="wait">
									{callout ? (
										<motion.p key={issueKey ?? callout.title} className={`voice-notice is-${callout.tone}`} {...noticeMotion}>
											{callout.icon === "warning" ? <Warning size={16} weight="fill" aria-hidden="true" /> : callout.icon === "speaker" ? <SpeakerSlash size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />}
											<span><strong>{callout.title}</strong>{callout.detail}</span>
										</motion.p>
									) : null}
								</AnimatePresence>
							</div>
							<div className="voice-compose">
								<label htmlFor="voice-transcript" className="sr-only">Your response</label>
								<textarea
									ref={transcriptRef}
									id="voice-transcript"
									rows={1}
									value={transcript}
									readOnly={state === "thinking"}
									aria-busy={state === "thinking" || undefined}
									onChange={(event) => setTranscript(event.target.value)}
									onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submitTranscript() } }}
									placeholder={placeholder}
								/>
								<button className="voice-send" type="button" aria-label="Send response" onClick={submitTranscript} disabled={!transcript.trim() || state === "thinking"}><ArrowUp size={16} weight="bold" /></button>
							</div>
						</div>
					</aside>
				</div>
			</motion.section>
		</div>,
		document.body,
	)
}

/* Voice text streams in word by word when it arrives during the session, then
 * settles to plain words so the stage can follow MAX's reading. Freshness is
 * fixed when the words mount, so a re-render mid-stream never snaps it whole. */
function VoiceWords({ text, fresh, spokenUpTo = 0 }: { text: string; fresh: boolean; spokenUpTo?: number }) {
	const [streaming] = useState(fresh)
	const revealed = useWordStream(text, streaming)
	const done = revealed >= text.split(" ").length
	// The last words are still resolving from their blur when the count lands.
	const [settled, setSettled] = useState(done)
	useEffect(() => {
		if (!done || settled) return
		const timer = window.setTimeout(() => setSettled(true), 480)
		return () => window.clearTimeout(timer)
	}, [done, settled])
	if (!settled) return <GeneratedWords text={text} revealed={revealed} />
	if (spokenUpTo <= 0) return <>{text}</>
	return <>{spokenSegments(text, spokenUpTo).map((segment, index) => <span key={index} className={segment.spoken ? "is-spoken" : undefined}>{segment.text}</span>)}</>
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
			<button type="button" className="turn-meta-chip" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
				<CheckCircle size={12} weight="fill" /><span>Verified</span> <strong>{steps.length} steps</strong><CaretRight size={11} className={open ? "rotated" : ""} />
			</button>
			<AnimatePresence initial={false}>
				{open ? <motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>{steps.map((step) => <li key={step}><Check size={12} /> {step}</li>)}</motion.ol> : null}
			</AnimatePresence>
		</div>
	)
}

/*
 * Package. ElevenLabs Studio (mobbin 0462ca01) gives the composition: a
 * chapters panel of grouped cards on the left, the document in a centred column
 * on the right with its actions above it. The charter gate borrows the agent
 * page's "Expressive Mode" callout (9785c0b7) and the review dialog (ff16450b).
 */
const CHARTER_REASON_MIN = 20
// Outputs a handoff cannot quietly lose: the decision itself and the charter Plan starts
// from. Switching one off is an owner exception that the packet carries to Plan.
const REQUIRED_OUTPUTS: ReadonlySet<number> = new Set([0, 1, CHARTER_DELIVERABLE_INDEX])
// Synthesis writes the documents in the order the package lists them, one step at a
// time, and the last one lands inside the phase's window (1650ms).
const GENERATION_PHASE = OPERATIONS.length - 2
const MATERIALIZE_STEP_MS = 180
const DELIVERABLE_DISPLAY_ORDER = DELIVERABLE_CATEGORY_ORDER.flatMap(category => DELIVERABLES.flatMap((_, position) => DELIVERABLE_CATEGORY[position] === category ? [position] : []))

function includedOutputs(excluded: readonly string[]) {
	return DELIVERABLES.flatMap((item, position) => excluded.includes(item.name) ? [] : [position])
}

// The hash binds a document to the path the owner chose, so the approved and the
// alternative decision never share a fingerprint.
function deliverableHash(scenarioKey: ScenarioKey, index: number, decision: DecisionState) {
	const body = deliverableBodies(scenarioKey, decision)[index]
	const source = `${scenarioKey}:${decision}:${DELIVERABLES[index].name}:${body.heading}:${body.lede}`
	let hash = 0x811c9dc5
	for (let position = 0; position < source.length; position += 1) hash = Math.imul(hash ^ source.charCodeAt(position), 16777619) >>> 0
	return hash.toString(16).padStart(8, "0")
}

function Deliverables({ scenarioKey, phase, paused, written, decision, interviewClosed, excluded, selected, charterApproval, handoff, onSelect, onManage, onRequestCharterApproval, onContinueToAgentix, onOpenPlan, onOpenThread, onToast }: {
	scenarioKey: ScenarioKey
	phase: number
	paused: boolean
	/* How many documents synthesis has written so far, counted in list order. */
	written: number
	decision: DecisionState
	interviewClosed: boolean
	/* Outputs the owner switched off in the manifest; the Package never shows them. */
	excluded: string[]
	selected: number
	charterApproval: CharterApproval | null
	handoff: HandoffPacket | null
	onSelect: (index: number) => void
	onManage: () => void
	onRequestCharterApproval: () => void
	onContinueToAgentix: () => void
	onOpenPlan?: () => void
	onOpenThread: () => void
	onToast: (text: string) => void
}) {
	const ready = phase > GENERATION_PHASE
	const generating = phase === GENERATION_PHASE
	// The documents say what happened at the exception, so they follow the owner's decision.
	const bodies = deliverableBodies(scenarioKey, decision)
	const included = includedOutputs(excluded)
	const removedCount = DELIVERABLES.length - included.length
	const exportAll = () => {
		const text = included.map((position) => {
			const document = bodies[position]
			return "# " + DELIVERABLES[position].name + "\n\n" + document.heading + "\n\n" + document.lede + "\n\n" + document.metrics.map(metric => "- " + metric.label + ": " + metric.value + " — " + metric.note).join("\n") + "\n\n" + document.keyMessages.map(message => "## " + message.label + "\n\n" + message.detail).join("\n\n") + "\n\n" + document.sections.map(section => "## " + section.heading + "\n\n" + section.paragraphs.join("\n\n") + (section.bullets ? "\n\n" + section.bullets.map(bullet => "- " + bullet.label + ": " + bullet.detail).join("\n") : "") + (section.exhibit ? "\n\nExhibit data:\n" + JSON.stringify(section.exhibit, null, 2) : "")).join("\n\n") + "\n\n## Findings\n\n" + document.findings.map(finding => "- " + finding.label + ": " + finding.detail).join("\n") + "\n\n## Next steps\n\n" + document.nextSteps.map(step => "- " + step.action + " — " + step.owner + " — " + step.due).join("\n") + "\n\nSources: " + document.citations.join("; ")
		}).join("\n\n---\n\n")
		const url = URL.createObjectURL(new Blob(["MAXION Discovery · illustrative demo documents\n\n" + text], { type: "text/markdown;charset=utf-8" }))
		const link = document.createElement("a"); link.href = url; link.download = "discovery-" + scenarioKey + "-deliverables.md"; link.click()
		window.setTimeout(() => URL.revokeObjectURL(url), 1000)
		onToast(`Exported ${included.length} document${included.length === 1 ? "" : "s"} as Markdown`)
	}
	// The reader never opens a document the manifest has switched off.
	const index = included.includes(selected) ? selected : included[0] ?? 0
	const body = bodies[index]
	const deliverable = DELIVERABLES[index]
	// Exhibits are numbered per document in reading order, the way a consulting
	// pack numbers them, so a finding can be cited as "Exhibit 3" in review.
	const exhibitNumbers = useMemo(() => {
		const numbers = new Map<string, number>()
		let counter = 0
		for (const section of body.sections) {
			if (!section.exhibit) continue
			counter += 1
			numbers.set(section.heading, counter)
		}
		return numbers
	}, [body])
	// Synthesis writes the documents in the order this list shows them.
	const writeRank = new Map(DELIVERABLE_DISPLAY_ORDER.filter((position) => included.includes(position)).map((position, rank) => [position, rank]))
	const isWritten = (position: number) => ready || generating && (writeRank.get(position) ?? DELIVERABLES.length) < written
	const writtenCount = included.filter(isWritten).length
	const viewRef = useRef<HTMLDivElement>(null)
	const listRef = useRef<HTMLElement>(null)
	const readerRef = useRef<HTMLElement>(null)
	const reduced = useReducedMotion()
	const rise = useRiseIn()
	useEffect(() => {
		const view = viewRef.current, list = listRef.current, reader = readerRef.current
		if (!view || !list || !reader) return
		// Side by side the reader scrolls itself. Stacked (narrow), the whole view
		// scrolls under a sticky deliverable row, so a new document starts just below it.
		reader.scrollTo({ top: 0 })
		const readerTop = reader.getBoundingClientRect().top - list.getBoundingClientRect().bottom
		if (readerTop < 0 && getComputedStyle(list).position === "sticky") view.scrollTo({ top: view.scrollTop + readerTop })
		// The selected entry stays in sight: down the list, or along the chip row.
		const item = list.querySelector<HTMLElement>(".deliverable-item.selected")
		revealWithin(list, item)
		revealWithin(item?.closest<HTMLElement>(".deliverable-list") ?? null, item, "center")
	}, [index])
	// A row is Planned, then Queued and Writing while synthesis runs, and Current only once
	// the package is verified: nothing reads as finished before the reader can open it.
	const stateOf = (position: number) => {
		if (ready) {
			if (position === CHARTER_DELIVERABLE_INDEX) return charterApproval ? { label: "Owner approved", tone: "approved" as const } : { label: "Owner approval", tone: "approval" as const }
			return { label: "Current", tone: "current" as const }
		}
		if (!generating) return { label: "Planned", tone: "planned" as const }
		if (!isWritten(position)) return { label: "Queued", tone: "planned" as const }
		return paused ? { label: "Paused", tone: "paused" as const } : { label: "Writing…", tone: "writing" as const }
	}
	const readerState = ready ? "ready" : !generating ? "planned" : isWritten(index) ? "writing" : "queued"
	const charterSelected = index === CHARTER_DELIVERABLE_INDEX
	const title = ready ? "Final plan and recommendations" : generating ? "Generating deliverables" : "Planned deliverables"
	const subtitle = ready ? "Start with the decision brief, then inspect the supporting documents."
		: generating ? paused ? `Paused with ${writtenCount} of ${included.length} documents under way. Resume the run to finish the package.` : `MAX is writing ${included.length} documents from the frozen readiness snapshot.`
		: "The manifest refines as evidence lands. Nothing is generated until readiness freezes."
	const destination = handoffDestination(scenarioKey)
	const status = handoff ? `Handed to ${destination}` : ready ? "Verified" : generating ? paused ? "Paused" : "Generating" : "Planned"

	return (
		<div className="package-view" ref={viewRef}>
			<aside className="package-list" aria-label="Package contents" ref={listRef}>
				<div className="package-list-head">
					<h2>Deliverables<span className="ds-count">{included.length}</span></h2>
					<DsButton size="sm" icon aria-label="Manage package" title="Manage package" onClick={onManage}><SlidersHorizontal size={16} /></DsButton>
				</div>
				<p className="package-list-meta">{removedCount
					? `${ready ? "Manifest v4" : generating ? paused ? "Paused" : "Generating" : "Manifest refining"} · ${removedCount} removed by you`
					: ready ? "Readiness snapshot v7 · manifest v4" : generating ? paused ? "Paused mid-synthesis" : "Generating from the frozen snapshot" : "The manifest refines as evidence lands"}</p>
				<nav className="deliverable-list" aria-label="Deliverable list">
					{DELIVERABLE_CATEGORY_ORDER.map(category => {
						const entries = DELIVERABLE_DISPLAY_ORDER.filter(position => DELIVERABLE_CATEGORY[position] === category && included.includes(position))
						if (!entries.length) return null
						return (
							<div className="deliverable-group" key={category}>
								<p className="deliverable-group-label">{category}</p>
								<div className="deliverable-card">
									{entries.map((position) => {
										const item = DELIVERABLES[position]
										const state = stateOf(position)
										return (
											<button
												key={item.name}
												type="button"
												className={`deliverable-item is-${state.tone}${index === position ? " selected" : ""}`}
												aria-current={index === position ? "page" : undefined}
												onClick={() => onSelect(position)}>
												<Mark seed={item.name} size="xs" />
												<span className="deliverable-name">{item.name}</span>{" "}
												<span className="deliverable-state">{state.tone === "writing" ? <ShimmerText>{state.label}</ShimmerText> : state.label}</span>
												{state.tone === "approved" || (state.tone === "current" && index === position) ? <CheckCircle size={16} weight="fill" className="deliverable-check" /> : null}
											</button>
										)
									})}
								</div>
							</div>
						)
					})}
				</nav>
			</aside>

			<div className="package-pane">
				<header className="package-toolbar">
					<div className="package-heading">
						<h1>{title}</h1>
						{handoff ? (
							// The batch detail page (el-ref batch-detail) puts the object's ID under its title.
							<p className="package-packet">
								<code>{handoff.id}</code>
								<span>Sent {formatPacketTime(handoff.createdAt)} · snapshot v7</span>
								{handoff.note ? <span className="package-packet-note">“{handoff.note}”</span> : null}
							</p>
						) : <p>{subtitle}</p>}
					</div>
					<div className="package-actions">
						<DsBadge tone={ready ? "positive" : "neutral"} dot={!ready}>{ready ? <CheckCircle size={12} weight="bold" aria-hidden="true" /> : null}{status}</DsBadge>
						<DsButton size="sm" disabled={!ready} title={ready ? undefined : "Available once the package is verified"} onClick={exportAll}><DownloadSimple size={14} />Export all</DsButton>
						{handoff && onOpenPlan ? <DsButton size="sm" variant="primary" onClick={onOpenPlan}><ArrowUpRight size={14} />Open in {destination}</DsButton> : null}
					</div>
				</header>

				<section className="deliverable-reader" ref={readerRef} tabIndex={0} aria-label={`${deliverable.name} · decision package document`} aria-busy={readerState === "writing" && !paused ? true : undefined}>
					{/* Each state of a document rises in, so the finished text arrives rather than
					    swapping in place. Under reduced motion the swap is immediate and waits on no exit. */}
					<SwapPresence instant={Boolean(reduced)}>
						<motion.div key={`${index}:${readerState}`} className="reader-column" {...rise}>
							{charterSelected && ready ? (
								charterApproval ? (
									<div className="reader-approval is-approved" role="status">
										<CheckCircle size={16} weight="fill" />
										<p><strong>You approved this charter</strong><span>“{charterApproval.reason}”</span></p>
									</div>
								) : (
									<div className="reader-approval">
										<SealCheck size={18} />
										<div>
											<p><strong>Owner approval required</strong><span>The charter commits scope, owners and governance. {destination} cannot start until you approve it with a reason.</span></p>
											<div className="reader-approval-actions">
												<DsButton size="sm" variant="primary" onClick={onRequestCharterApproval}>Approve charter</DsButton>
											</div>
										</div>
									</div>
								)
							) : null}
							<div className={`reader-heading${ready ? "" : " is-pending"}`}>
								<Mark seed={deliverable.name} />
								<div>
									<p className="reader-audience">{deliverable.audience}</p>
									<h2>{deliverable.name}</h2>
								</div>
								{ready ? <span className="reader-verified-tag"><CheckCircle size={14} weight="fill" />Evidence bound<code>{deliverableHash(scenarioKey, index, decision)}</code></span> : null}
							</div>
							{ready ? (
								<article className="reader-content">
									<h3>{body.heading}</h3>
									<p className="reader-lede">{body.lede}</p>

									<dl className="reader-metrics" aria-label="Key figures">
										{body.metrics.map((metric) => <div key={metric.label}><dt>{metric.value}</dt><dd><strong>{metric.label}</strong><span>{metric.note}</span></dd></div>)}
									</dl>

									<section className="reader-messages" aria-label="What this document argues">
										<h4>What this document argues</h4>
										<ol>
											{body.keyMessages.map((message) => <li key={message.label}><strong>{message.label}</strong><p>{message.detail}</p></li>)}
										</ol>
									</section>

									{body.sections.map((section) => (
										<section className="reader-section" key={section.heading}>
											<h4>{section.heading}</h4>
											{section.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
											{section.bullets ? (
												<ul className="reader-bullets">
													{section.bullets.map((bullet) => <li key={bullet.label}><strong>{bullet.label}</strong><span>{bullet.detail}</span></li>)}
												</ul>
											) : null}
											{section.exhibit ? <DeliverableExhibit exhibit={section.exhibit} index={exhibitNumbers.get(section.heading) ?? 1} /> : null}
										</section>
									))}

									<section className="reader-findings" aria-label="Findings">
										<h4>Findings</h4>
										{body.findings.map((finding, position) => <div className="key-finding" key={finding.label}><span>{String(position + 1).padStart(2, "0")}</span><div><strong>{finding.label}</strong><p>{finding.detail}</p></div></div>)}
									</section>

									<section className="reader-next-steps" aria-labelledby={`next-steps-${index}`}>
										<h4 id={`next-steps-${index}`}>Next steps</h4>
										<div className="reader-table-scroll">
											<table>
												<thead><tr><th scope="col">Action</th><th scope="col">Owner</th><th scope="col">By when</th></tr></thead>
												<tbody>
													{body.nextSteps.map((step) => <tr key={step.action}><th scope="row">{step.action}</th><td>{step.owner}</td><td>{step.due}</td></tr>)}
												</tbody>
											</table>
										</div>
									</section>

									<div className="citation-row"><span className="citation-label">Sources</span>{body.citations.map((citation) => <span key={citation}>{citation}</span>)}</div>
								</article>
							) : readerState === "writing" ? (
								<div className="reader-waiting">
									<div className={`reader-skeleton${paused ? "" : " is-generating"}`} aria-hidden="true"><span /><span /><span /><span /><span /></div>
									<h3>{paused ? "Writing is paused" : <ShimmerText>MAX is writing this deliverable</ShimmerText>}</h3>
									<p>{paused ? "MAX picks this document up where it stopped when you resume the run." : "It opens here as soon as its evidence is bound, without another generate step."}</p>
								</div>
							) : (
								// Planned and queued documents show what they will contain, as the Studio
								// document column shows its blocks (mobbin 0462ca01), not a loader.
								<div className="reader-planned">
									<p className="reader-planned-lede">Covers {deliverable.rationale.charAt(0).toLowerCase()}{deliverable.rationale.slice(1)}.</p>
									<ol className="reader-outline" aria-label="Planned sections">
										{body.sections.map((section) => <li key={section.heading}>{section.heading}</li>)}
									</ol>
									<p className="reader-planned-when">
										<span>{readerState === "queued" ? paused ? "Queued · synthesis is paused" : "Queued · MAX writes this next" : interviewClosed ? "Generates when readiness freezes" : "Generates after your interview"}</span>
										{readerState === "planned" && !interviewClosed ? <button type="button" className="ds-text-button" onClick={onOpenThread}>Open Thread<ArrowRight size={14} /></button> : null}
									</p>
								</div>
							)}
						</motion.div>
					</SwapPresence>
				</section>
			</div>
		</div>
	)
}

/* AnimatePresence in "wait" mode holds the next child until the last one's exit
 * finishes; when motion is reduced there is no exit to wait on, so skip it. */
/* AnimatePresence only while motion is allowed. Under reduced motion content
 * mounts and unmounts at once, so nothing waits on an exit that never plays. */
function SwapPresence({ instant, mode = "wait", children }: { instant: boolean; mode?: "wait" | "sync"; children: React.ReactNode }) {
	return instant ? <>{children}</> : <AnimatePresence mode={mode} initial={false}>{children}</AnimatePresence>
}

function CharterApprovalDialog({ open, documentName, audience, destination, onClose, onApprove }: { open: boolean; documentName: string; audience: string; destination: HandoffDestination; onClose: () => void; onApprove: (reason: string) => void }) {
	const [reason, setReason] = useState("")
	useEffect(() => { if (open) setReason("") }, [open])
	const length = reason.trim().length
	const enough = length >= CHARTER_REASON_MIN
	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Approve the project charter"
			description={`Your approval and its reason are recorded in the handoff packet ${destination} receives.`}
			footer={<>
				<DsButton onClick={onClose}>Cancel</DsButton>
				<DsButton variant="primary" disabled={!enough} onClick={() => onApprove(reason.trim())}>Approve charter</DsButton>
			</>}>
			<div className="dialog-object">
				<Mark seed={documentName} />
				<div><strong>{documentName}</strong><span>{audience}</span></div>
				<DsBadge tone="warning">Owner approval</DsBadge>
			</div>
			<div className="ds-field">
				<label htmlFor="charter-reason">Approval reason</label>
				<textarea id="charter-reason" className="ds-textarea" data-autofocus value={reason} onChange={event => setReason(event.target.value)} placeholder="Why the scope, owners and governance are right to commit to" rows={3} />
				<span className={`ds-field-count${enough ? "" : " is-short"}`}>{enough ? `${length} characters` : `${length}/${CHARTER_REASON_MIN} minimum`}</span>
			</div>
		</Dialog>
	)
}

/*
 * The journey ends here: a handoff preview laid out like the review dialog's
 * two columns, then an immutable packet that opens Plan. A blocker is a fix the
 * owner can make, so it is amber and carries that fix inline.
 */
function HandoffDialog({ open, scenarioKey, missionDecision, decision, excluded, charterApproval, onClose, onApproveCharter, onConfirm }: {
	open: boolean
	scenarioKey: ScenarioKey
	missionDecision: string
	decision: DecisionState
	excluded: string[]
	charterApproval: CharterApproval | null
	onClose: () => void
	onApproveCharter: () => void
	onConfirm: (note: string) => void
}) {
	const scenario = SCENARIOS[scenarioKey]
	const destination = handoffDestination(scenarioKey)
	const [note, setNote] = useState("")
	useEffect(() => { if (open) setNote("") }, [open])
	const included = includedOutputs(excluded)
	const blocked = included.includes(CHARTER_DELIVERABLE_INDEX) && !charterApproval
	const exceptions = DELIVERABLES.filter((item, position) => REQUIRED_OUTPUTS.has(position) && excluded.includes(item.name)).map((item) => item.name)
	return (
		<Dialog
			open={open}
			size="lg"
			onClose={onClose}
			title={`Continue to ${destination}`}
			description={scenario.handoff ? "Agentix receives one immutable packet and opens it as a proposal. Nothing runs until you activate it." : "Plan receives one immutable packet. Nothing in it can change after you continue."}
			footer={<>
				<DsButton onClick={onClose}>Cancel</DsButton>
				<DsButton variant="primary" disabled={blocked} onClick={() => onConfirm(note.trim())}>Continue to {destination}</DsButton>
			</>}>
			<div className="handoff-compare">
				<div className="handoff-compare-head"><span>Discovery package <em>verified</em></span><span>{destination} receives <em>packet</em></span></div>
				{/* What stops the handoff comes first, so it is read before the contents and never scrolled past. */}
				{blocked ? (
					<div className="handoff-row is-blocked">
						<span className="handoff-key">Blockers</span>
						<span className="handoff-blocker">
							<Warning size={16} weight="fill" aria-hidden="true" />
							<span>The project charter needs your approval with a reason.</span>
							<DsButton size="sm" onClick={onApproveCharter}>Approve charter</DsButton>
						</span>
					</div>
				) : null}
				<div className="handoff-row"><span className="handoff-key">Mission decision</span><span>{missionDecision}</span></div>
				{scenario.handoff ? <div className="handoff-row"><span className="handoff-key">Opens in Agentix</span><span>{scenario.handoff.opensAs}</span></div> : null}
				<div className="handoff-row"><span className="handoff-key">Readiness</span><span>Snapshot v7 · frozen · {scenario.sources.length} sources · manifest v4</span></div>
				<div className="handoff-row is-list">
					<span className="handoff-key">Selected outputs</span>
					<ul>
						{included.map((position) => {
							const item = DELIVERABLES[position]
							return <li key={item.name}><Mark seed={item.name} size="xs" /><span className="handoff-name">{item.name}</span><span className="handoff-state">{position === CHARTER_DELIVERABLE_INDEX ? <DsBadge tone={charterApproval ? "positive" : "warning"}>{charterApproval ? "Approved" : "Needs approval"}</DsBadge> : null}</span><code>{deliverableHash(scenarioKey, position, decision)}</code></li>
						})}
					</ul>
				</div>
				{exceptions.length ? <div className="handoff-row"><span className="handoff-key">Exceptions</span><span>{joinPhrases(exceptions)} removed by you · recorded in the packet</span></div> : null}
				{blocked ? null : <div className="handoff-row"><span className="handoff-key">Blockers</span><span>None</span></div>}
			</div>
			<div className="ds-field">
				<label htmlFor="handoff-note">Handoff note (optional)</label>
				<input id="handoff-note" className="ds-input" data-autofocus value={note} onChange={event => setNote(event.target.value)} placeholder={`What ${destination} should know first`} />
			</div>
		</Dialog>
	)
}

/*
 * Setup and its sections are ElevenLabs side sheets (mobbin b87b3a86,
 * 72f049fe): an icon tile beside the title, one line of description, section
 * cards on a #fafafa fill with their action at the right, and the sheet's own
 * actions pinned to the bottom.
 */
/* The manifest selection is record state: the sheet edits it, the Package and the handoff read it,
 * and once a packet exists it is frozen with it. */
type ManifestControl = { excluded: string[]; frozenIn: string | null; destination: HandoffDestination; onChange: (excluded: string[]) => void }

/* One row per output, laid out like the Sources sheet (logo, name, detail) with the widget
 * tab's switch at the end (mobbin 618baeaf). Optional outputs switch at once. A required one
 * can be switched off too, and the sheet says what that costs before the edit is recorded. */
function ManifestSection({ manifest }: { manifest: ManifestControl }) {
	const { excluded, frozenIn, destination, onChange } = manifest
	const rise = useRiseIn()
	const includedCount = DELIVERABLES.length - excluded.filter((name) => DELIVERABLES.some((item) => item.name === name)).length
	const removedRequired = DELIVERABLES.filter((item, index) => REQUIRED_OUTPUTS.has(index) && excluded.includes(item.name))
	const toggle = (name: string) => onChange(excluded.includes(name) ? excluded.filter((item) => item !== name) : [...excluded, name])
	const status = frozenIn ? `Frozen in packet ${frozenIn}` : excluded.length ? "Adjusted by you" : "Auto-managed"
	const removedCount = countWord(removedRequired.length)
	const exceptionTitle = removedRequired.length === 1 ? `${removedRequired[0].name} is a required output` : `${removedCount.charAt(0).toUpperCase()}${removedCount.slice(1)} required outputs are off`
	return (
		<div className="manifest-drawer">
			<p className={`sheet-status${excluded.length && !frozenIn ? " is-adjusted" : ""}`} aria-live="polite">{frozenIn ? <SealCheck size={14} weight="fill" /> : excluded.length ? <SlidersHorizontal size={14} /> : <CheckCircle size={14} weight="fill" />}{status} · {includedCount} of {DELIVERABLES.length} included</p>
			<AnimatePresence initial={false}>
				{removedRequired.length && !frozenIn ? (
					<motion.div key="manifest-exception" className="manifest-exception" {...rise}>
						<Warning size={16} weight="fill" aria-hidden="true" />
						<p>
							<strong>{exceptionTitle}</strong>
							<span>Closing the manifest records {removedRequired.length === 1 ? "an exception for you" : "an exception for each"}, and the handoff lists {removedRequired.length === 1 ? "it" : "them"} for {destination}.</span>
						</p>
					</motion.div>
				) : null}
			</AnimatePresence>
			<ul className="sheet-list manifest-list">
				{DELIVERABLES.map((deliverable, index) => {
					const on = !excluded.includes(deliverable.name)
					// A package always keeps at least one document.
					const locked = Boolean(frozenIn) || on && includedCount === 1
					return (
						<li key={deliverable.name}>
							<label className={`manifest-row${on ? "" : " is-off"}${locked ? " is-locked" : ""}`}>
								<Mark seed={deliverable.name} size="sm" />
								<span className="manifest-text">
									<strong>{deliverable.name}{REQUIRED_OUTPUTS.has(index) ? <DsBadge>Required</DsBadge> : null}</strong>
									<small>{deliverable.audience} · {deliverable.rationale}</small>
								</span>
								<input type="checkbox" role="switch" className="ds-switch" checked={on} disabled={locked} onChange={() => toggle(deliverable.name)} />
							</label>
						</li>
					)
				})}
			</ul>
			<section className="sheet-card is-policy">
				<ShieldCheck size={16} weight="fill" />
				{frozenIn ? (
					<div className="sheet-card-text"><h3>Frozen with the handoff</h3><p>Packet {frozenIn} belongs to {destination} now. A change to its outputs goes there as a new request.</p></div>
				) : (
					<div className="sheet-card-text"><h3>Material changes interrupt</h3><p>Removing a required output, widening external distribution or replacing an approved artifact creates an exception for you. Routine refinements apply automatically.</p></div>
				)}
			</section>
		</div>
	)
}

const INTERVIEW_CHANNELS: Person["channel"][] = ["Text", "Voice", "Workshop"]
const CHANNEL_PHRASE: Record<Person["channel"], string> = { Text: "a text interview", Voice: "a voice interview", Workshop: "the workshop" }
// A whole field, not an address found inside a sentence.
const FULL_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY_PERSON_FORM = { name: "", email: "", role: "", department: "", influence: "Medium" as Person["influence"], channel: "Text" as Person["channel"], focus: "" }

/* A stakeholder row keeps its interview focus and channel editable in place, the
 * way the reference's member rows keep their seat select on the row. */
function PersonRow({ person, tint, onChange }: { person: Person; tint: number; onChange: (next: Person, note: string) => void }) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(person.focus)
	const editRef = useRef<HTMLButtonElement>(null)
	const fieldRef = useRef<HTMLTextAreaElement>(null)
	const returnFocus = useRef(false)
	const fieldId = useId()
	const rise = useRiseIn()
	useEffect(() => {
		if (editing) { fieldRef.current?.focus(); return }
		if (!returnFocus.current) return
		returnFocus.current = false
		editRef.current?.focus()
	}, [editing])
	const finish = () => {
		returnFocus.current = true
		setEditing(false)
	}
	const saveFocus = (event: FormEvent) => {
		event.preventDefault()
		const focus = draft.trim()
		if (focus && focus !== person.focus) onChange({ ...person, focus }, `Interview focus updated for ${person.name}`)
		finish()
	}
	return (
		<motion.li className="person-row" data-person-id={person.id} tabIndex={-1} {...rise}>
			<span className="person-chip" data-tint={tint} aria-hidden="true">{person.initials}</span>
			<div className="person-main">
				<strong>{person.name}</strong>
				<span>{person.role} · {person.department}</span>
				<small>{person.email}</small>
				{editing ? (
					<form className="person-focus-form" onSubmit={saveFocus}>
						<label htmlFor={fieldId}>Interview focus</label>
						<textarea id={fieldId} ref={fieldRef} className="ds-textarea" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} />
						<div className="person-focus-actions">
							<DsButton size="sm" onClick={finish}>Cancel</DsButton>
							<DsButton size="sm" variant="primary" type="submit" disabled={!draft.trim()}>Save</DsButton>
						</div>
					</form>
				) : (
					<div className="person-focus">
						<div className="person-focus-head">
							<em>Interview focus</em>
							<button ref={editRef} type="button" className="person-focus-edit" aria-label={`Edit interview focus for ${person.name}`} onClick={() => { setDraft(person.focus); setEditing(true) }}>Edit</button>
						</div>
						<p>{person.focus}</p>
					</div>
				)}
			</div>
			<div className="person-meta">
				<DsBadge tone={person.influence === "High" ? "warning" : "neutral"}>{person.influence} influence</DsBadge>
				<span className="person-channel">
					<select
						aria-label={`Interview channel for ${person.name}`}
						value={person.channel}
						onChange={(event) => {
							const channel = event.target.value as Person["channel"]
							onChange({ ...person, channel }, `${person.name} moved to ${CHANNEL_PHRASE[channel]}`)
						}}>
						{INTERVIEW_CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}
					</select>
					<CaretDown size={12} aria-hidden="true" />
				</span>
			</div>
		</motion.li>
	)
}

function DrawerPanel({ type, scenarioKey, people, onPeopleChange, manifest, toast, onToast, onFocusSection, onClose }: { type: Exclude<Drawer, null>; scenarioKey: ScenarioKey; people: Person[]; onPeopleChange: (people: Person[]) => void; manifest: ManifestControl; toast: ToastNote | null; onToast: (text: string) => void; onFocusSection: (target: Exclude<Drawer, null>) => void; onClose: () => void }) {
	const scenario = SCENARIOS[scenarioKey]
	const [adding, setAdding] = useState(false)
	const [form, setForm] = useState(EMPTY_PERSON_FORM)
	const [emailTouched, setEmailTouched] = useState(false)
	// Where focus lands once the add form has gone: the new row, or the Add button again.
	const [returnFocus, setReturnFocus] = useState<string | null>(null)
	const panelRef = useRef<HTMLElement | null>(null)
	const nameRef = useRef<HTMLInputElement>(null)
	const addRef = useRef<HTMLButtonElement>(null)
	const reduced = Boolean(useReducedMotion())
	const sheetMotion = useSheetMotion()
	const meta = {
		setup: { title: "Setup", icon: <GearSix size={16} />, description: "The mission's pack, its bound sources and its stakeholder roster. MAX configures these from the approved brief; you adjust the parts that need your judgment." },
		people: { title: "Stakeholder program", icon: <UsersThree size={16} />, description: "MAX identified these roles from the mission and the source gaps. Interview focus and channel stay editable." },
		sources: { title: "Connected sources", icon: <Database size={16} />, description: "Integrations are bound when the mission is created. MAX reads only the scopes shown here." },
		package: { title: "Deliverable manifest", icon: <SlidersHorizontal size={16} />, description: "The manifest is operating state, not another artifact. It refines with evidence and freezes at readiness." },
	}[type]

	// The drawer is a modal dialog: it takes initial focus and keeps Tab inside.
	useEffect(() => {
		const panel = panelRef.current
		if (!panel) return
		const first = panel.querySelector<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")
		;(first ?? panel).focus({ preventScroll: true })
		// Setup swaps the panel's contents in place rather than remounting, so the
		// focus has to follow the section the owner opened.
	}, [type])

	// Opening the form puts the cursor in its first field; closing it hands focus on
	// rather than dropping it to the page behind the sheet.
	useEffect(() => {
		if (adding) {
			panelRef.current?.querySelector(".sheet-body")?.scrollTo({ top: 0 })
			nameRef.current?.focus({ preventScroll: true })
			return
		}
		if (!returnFocus) return
		const target = returnFocus === "add" ? addRef.current : panelRef.current?.querySelector<HTMLElement>(`[data-person-id="${returnFocus}"]`)
		target?.focus()
		setReturnFocus(null)
	}, [adding, people, returnFocus])

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

	const email = form.email.trim()
	const emailValid = FULL_EMAIL_PATTERN.test(email)
	const duplicate = emailValid ? people.find((person) => person.email.toLowerCase() === email.toLowerCase()) : undefined
	const emailError = !email ? null : duplicate ? `${duplicate.name} is already in the program with this address.` : emailTouched && !emailValid ? "Enter a complete email address." : null
	const canAdd = Boolean(form.name.trim() && form.role.trim() && emailValid && !duplicate)

	const closeForm = (focusTarget: string) => {
		setAdding(false)
		setForm(EMPTY_PERSON_FORM)
		setEmailTouched(false)
		setReturnFocus(focusTarget)
	}

	const submitPerson = (event: FormEvent) => {
		event.preventDefault()
		if (!canAdd) return
		const name = form.name.trim()
		const id = `drawer-person-${Date.now()}`
		onPeopleChange([...people, {
			id,
			name,
			initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
			role: form.role.trim(),
			department: form.department.trim() || "To confirm",
			email,
			influence: form.influence,
			focus: form.focus.trim() || "MAX will adapt this from mission gaps.",
			channel: form.channel,
		}])
		onToast(`${name} added and verified`)
		closeForm(id)
	}

	const updatePerson = (next: Person, note: string) => {
		onPeopleChange(people.map((person) => person.id === next.id ? next : person))
		onToast(note)
	}

	const formMotion = reduced ? {} : { initial: { height: 0, filter: "blur(2px)" }, animate: { height: "auto", filter: "blur(0px)" }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.22, ease: REVEAL_EASE } }
	const sectionMotion = reduced ? {} : { initial: { y: 6, filter: "blur(2px)" }, animate: { y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.18 } }
	const backdropMotion = reduced ? { initial: false as const } : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }

	return (
		<>
			<motion.button className="drawer-backdrop" type="button" aria-label="Close panel" tabIndex={-1} onClick={onClose} {...backdropMotion} />
			<motion.aside ref={panelRef} className="drawer" role="dialog" aria-modal="true" aria-label={meta.title} tabIndex={-1} onKeyDown={trapTab} {...sheetMotion}>
				<header className="sheet-head">
					<span className="sheet-icon" aria-hidden="true">{meta.icon}</span>
					<h2>{meta.title}</h2>
					<button className="sheet-close" type="button" aria-label="Close panel" title="Close panel" onClick={onClose}><X size={16} /></button>
				</header>
				<p className="sheet-desc">{meta.description}</p>

				<div className="sheet-body" tabIndex={0}>
					<SwapPresence instant={reduced}>
						<motion.div key={type} className="sheet-sections" {...sectionMotion}>
							{type === "setup" ? (
								<div className="setup-sheet">
									<section className="sheet-card" aria-label="Pack">
										<div className="sheet-card-text">
											<h3>Pack</h3>
											<p>{DELIVERABLES.length} outputs planned. Routine work is pre-authorized; exceptions come back to you.</p>
										</div>
										<DsButton size="sm" onClick={() => onFocusSection("package")}>Open deliverable manifest</DsButton>
									</section>
									<section className="sheet-card" aria-label="Sources">
										<div className="sheet-card-text">
											<h3>Sources</h3>
											<p>{scenario.sources.length} connected, read automatically within the approved scopes.</p>
											<span className="sheet-marks">{scenario.sources.map(source => <Mark key={source.name} seed={source.name} size="xs" />)}</span>
										</div>
										<DsButton size="sm" onClick={() => onFocusSection("sources")}>Open connected sources</DsButton>
									</section>
									<section className="sheet-card" aria-label="Stakeholders">
										<div className="sheet-card-text">
											<h3>Stakeholders</h3>
											<p>{people.length} mapped to the open evidence gaps.</p>
											<span className="person-stack">{people.slice(0, 5).map((person, index) => <span key={person.id} className="person-chip" data-tint={index % 6} title={person.name}>{person.initials}</span>)}</span>
										</div>
										<DsButton size="sm" onClick={() => onFocusSection("people")}>Open stakeholder program</DsButton>
									</section>
								</div>
							) : type === "people" ? (
								<div className="people-drawer">
									<AnimatePresence initial={false}>
										{adding ? (
											<motion.form key="add-person" className="sheet-card sheet-form" aria-label="Add stakeholder" noValidate onSubmit={submitPerson} {...formMotion}>
												<div className="sheet-form-grid">
													<div className="ds-field"><label htmlFor="person-name">Name</label><input id="person-name" ref={nameRef} className="ds-input" autoComplete="off" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
													<div className="ds-field">
														<label htmlFor="person-email">Email</label>
														<input id="person-email" className="ds-input" type="email" autoComplete="off" value={form.email} aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? "person-email-error" : undefined} onChange={(event) => setForm({ ...form, email: event.target.value })} onBlur={() => setEmailTouched(true)} required />
														{emailError ? <small id="person-email-error" className="is-error">{emailError}</small> : null}
													</div>
													<div className="ds-field"><label htmlFor="person-role">Role</label><input id="person-role" className="ds-input" autoComplete="off" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required /></div>
													<div className="ds-field"><label htmlFor="person-department">Department</label><input id="person-department" className="ds-input" autoComplete="off" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></div>
													<div className="ds-field"><label htmlFor="person-influence">Influence</label><select id="person-influence" className="ds-input" value={form.influence} onChange={(event) => setForm({ ...form, influence: event.target.value as Person["influence"] })}><option>High</option><option>Medium</option></select></div>
													<div className="ds-field"><label htmlFor="person-channel">Interview channel</label><select id="person-channel" className="ds-input" value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value as Person["channel"] })}>{INTERVIEW_CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}</select></div>
													<div className="ds-field is-wide"><label htmlFor="person-focus">Interview focus</label><textarea id="person-focus" className="ds-textarea" rows={2} placeholder="MAX adapts this from the mission gaps if you leave it empty." value={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.value })} /></div>
												</div>
												<div className="sheet-form-actions"><DsButton size="sm" onClick={() => closeForm("add")}>Cancel</DsButton><DsButton size="sm" variant="primary" type="submit" disabled={!canAdd}>Add to program</DsButton></div>
											</motion.form>
										) : null}
									</AnimatePresence>
									<ul className="sheet-list">
										<AnimatePresence initial={false}>
											{people.map((person, index) => <PersonRow key={person.id} person={person} tint={index % 6} onChange={updatePerson} />)}
										</AnimatePresence>
									</ul>
								</div>
							) : type === "sources" ? (
								<div className="source-drawer">
									<p className="sheet-status"><CheckCircle size={14} weight="fill" />All sources healthy</p>
									<ul className="sheet-list">
										{scenario.sources.map((source) => (
											<li key={source.name} className="source-row">
												<Mark seed={source.name} size="sm" />
												<div><strong>{source.name}</strong><span>{source.system} · {source.scope}</span><small>{source.records} · indexed incrementally</small></div>
												<DsBadge tone="positive">Scope verified</DsBadge>
											</li>
										))}
									</ul>
								</div>
							) : (
								<ManifestSection manifest={manifest} />
							)}
						</motion.div>
					</SwapPresence>
				</div>

				<footer className="sheet-foot">
					{/* The page's own toast sits behind the sheet, so the sheet shows its confirmations above its actions. */}
					<ToastRegion toast={toast} className="is-sheet" />
					{type === "people" && !adding ? <DsButton ref={addRef} onClick={() => setAdding(true)}><Plus size={14} />Add stakeholder</DsButton> : <span />}
					<DsButton variant="primary" onClick={onClose}>Done</DsButton>
				</footer>
			</motion.aside>
		</>
	)
}

/*
 * The workshop agenda: the first contested inquiries, each argued by two
 * participants against two of the bound sources.
 */
const WORKSHOP_AGENDA_SIZE = 4

type WorkshopTurnData = { person: Person; source: string; text: string }

function workshopAgenda(scenarioKey: ScenarioKey) {
	const scenario = SCENARIOS[scenarioKey]
	const participants = scenario.people.slice(0, WORKSHOP_AGENDA_SIZE)
	return scenario.inquiries.slice(0, WORKSHOP_AGENDA_SIZE).map((title, index) => {
		const first = participants[index % participants.length]
		const second = participants[(index + 1) % participants.length]
		const primary = scenario.sources[index % scenario.sources.length]
		const secondary = scenario.sources[(index + 1) % scenario.sources.length]
		const turns: WorkshopTurnData[] = [
			{ person: first, source: primary.name, text: `${title} should sit with ${first.department}. ${primary.name} shows ${primary.records} where that team already signs off.` },
			{ person: second, source: secondary.name, text: `${second.department} has to be consulted before it changes. ${secondary.system} is where the exceptions surface first.` },
		]
		return {
			id: `agenda-${index}`,
			title,
			turns,
			reconciliation: `Both positions hold against ${primary.name}. ${first.department} owns the decision and ${second.department} is consulted; the agreement is written back as cited evidence.`,
		}
	})
}

/*
 * Workshop: the session room MAX convenes during the inquiry program. The
 * composition is the ElevenLabs test status view (mobbin d9cd8778): a list of
 * items with their state on the left, and the selected item's evaluation and
 * transcript on the right, agreed turns tinted green. Only agreed items carry a
 * reconciliation; the live item streams its latest position as it is argued,
 * and items the room has not reached yet say so.
 */
function WorkshopRoom({ scenarioKey, missionTitle, phase, paused, finalized, handedOff, onFinalize, onOpenThread }: {
	scenarioKey: ScenarioKey
	missionTitle: string
	phase: number
	paused: boolean
	finalized: boolean
	handedOff: boolean
	onFinalize: () => void
	onOpenThread: () => void
}) {
	const scenario = SCENARIOS[scenarioKey]
	const rise = useRiseIn()
	// Agreed positions are bound once the owner finalizes, or once the run has
	// moved past synthesis and the package is built from them.
	const bound = finalized || handedOff || phase >= 6
	const canFinalize = !bound && phase >= 4
	const participants = scenario.people.slice(0, WORKSHOP_AGENDA_SIZE)
	const agenda = workshopAgenda(scenarioKey).map((entry, index) => {
		const resolved = bound || index < phase - 2
		const live = !resolved && hasWorkshopSession(phase) && index === phase - 2
		const state = resolved ? "agreed" as const : live ? paused ? "paused" as const : "live" as const : "open" as const
		return { ...entry, resolved, state }
	})
	const resolvedCount = agenda.filter(entry => entry.resolved).length
	const liveIndex = agenda.findIndex(entry => entry.state === "live" || entry.state === "paused")
	// Until the owner picks an item, the room follows the one under discussion.
	const followRef = useRef(Math.max(0, liveIndex))
	if (liveIndex >= 0) followRef.current = liveIndex
	const [picked, setPicked] = useState<number | null>(null)
	const selected = Math.min(picked ?? followRef.current, agenda.length - 1)
	const item = agenda[selected]
	const liveEntry = liveIndex >= 0 ? agenda[liveIndex] : null
	// The live position streams the first time it is shown, never on a revisit.
	const streamedRef = useRef(new Set<string>())
	const streamLive = item.state === "live" && !streamedRef.current.has(item.id)
	useEffect(() => { if (item.state === "live") streamedRef.current.add(item.id) }, [item.id, item.state])
	const badge = item.state === "agreed" ? "Agreed" : item.state === "live" ? "Live" : item.state === "paused" ? "Paused" : "Waiting"
	return (
		<div className="workshop-room" aria-label="Workshop session">
			<div className="workshop-page">
				<header className="workshop-head">
					<div>
						<p className="autonomy-eyebrow">Workshop session · {missionTitle}</p>
						<h1 className="ds-page-title">Reconcile the contested evidence together</h1>
						<p className="ds-page-desc">MAX convenes a working session only where written evidence disagrees. Everything agreed here is written back as cited evidence.</p>
					</div>
					<div className="workshop-head-side">
						<div className="workshop-head-actions">
							<DsButton size="sm" onClick={onOpenThread}>Continue in Thread</DsButton>
							{bound ? (
								<span className="workshop-bound"><SealCheck size={16} weight="fill" aria-hidden="true" />Bound to snapshot v7</span>
							) : (
								<DsButton size="sm" variant="primary" onClick={onFinalize} disabled={!canFinalize} aria-describedby={canFinalize ? undefined : "workshop-finalize-note"}>Finalize workshop</DsButton>
							)}
						</div>
						{!bound && !canFinalize ? <p id="workshop-finalize-note" className="workshop-head-note">You can finalize once MAX starts resolving conflicts.</p> : null}
					</div>
				</header>

				<div className="workshop-board">
					<aside className="workshop-side">
						<section aria-label="Workshop agenda">
							<p className="workshop-pane-title">Agenda ({agenda.length})</p>
							<div className="workshop-agenda">
								{agenda.map((entry, index) => (
									<button key={entry.id} type="button" className={`workshop-agenda-item${index === selected ? " selected" : ""}`} aria-pressed={index === selected} onClick={() => setPicked(index)}>
										{entry.state === "agreed" ? <CheckCircle size={18} weight="fill" className="is-resolved" /> : entry.state === "live" ? <CircleNotch size={18} className="spin" /> : entry.state === "paused" ? <PauseCircle size={18} className="is-paused" /> : <Circle size={18} className="is-open" />}
										<span><strong>{entry.title}</strong><small>{entry.state === "agreed" ? "Resolved in session" : entry.state === "live" ? "In discussion" : entry.state === "paused" ? "Paused" : "Open"} · <span className="workshop-agenda-count">{entry.turns.length} positions</span></small></span>
									</button>
								))}
							</div>
						</section>
						<section aria-label="Workshop participants">
							<p className="workshop-pane-title">Participants ({participants.length})</p>
							<ul className="workshop-people">
								{participants.map((person, index) => (
									<li key={person.id}><span className="person-chip" data-tint={index % 6} aria-hidden="true">{person.initials}</span><span className="workshop-person"><strong>{person.name}</strong><small>{person.role}</small></span><DsBadge>{person.influence}</DsBadge></li>
								))}
							</ul>
						</section>
					</aside>

					<section className="workshop-session" aria-label="Workshop summary">
						<div className="workshop-session-head">
							<p className="workshop-pane-title">Evaluation</p>
							<DsBadge tone={item.state === "agreed" ? "positive" : "neutral"} dot={item.state === "live"}>{badge}</DsBadge>
						</div>
						<AnimatePresence mode="wait" initial={false}>
							<motion.div key={item.id} className="workshop-evaluation" {...rise}>
								{item.state === "open" ? (
									<DsEmptyState className="workshop-empty" icon={<Circle weight="bold" />} title="Not discussed yet">
										<p>{liveEntry ? `MAX brings this item to the room once “${liveEntry.title}” is agreed.` : "MAX brings this item to the room once the inquiry program reaches it."} Positions and their evidence appear here as they are argued.</p>
									</DsEmptyState>
								) : (
									<>
										<p className={`workshop-verdict is-${item.state}`}>
											{item.state === "agreed" ? <CheckCircle size={16} weight="fill" /> : item.state === "live" ? <CircleNotch size={16} className="spin" /> : <PauseCircle size={16} />}
											{item.state === "agreed" ? "Evaluation succeeded" : item.state === "live" ? <ShimmerText>MAX is comparing positions</ShimmerText> : "Paused at the last verified checkpoint"}
										</p>
										{item.resolved ? <p className="workshop-reconcile">{item.reconciliation}</p> : null}
										<div className="workshop-transcript">
											{item.turns.map((turn, index) => (
												<WorkshopTurn key={turn.person.id} turn={turn} tint={index * 2 % 6} agreed={item.resolved} stream={streamLive && index === item.turns.length - 1} />
											))}
										</div>
									</>
								)}
								<div className="workshop-evidence" aria-label="Workshop evidence">
									<p className="workshop-pane-title">Evidence in the room</p>
									<div>{scenario.sources.slice(0, 3).map(source => <span key={source.name} className="workshop-source"><Mark seed={source.name} size="xs" />{source.name}<small>{source.records}</small></span>)}</div>
								</div>
								<p className="workshop-foot">{bound
									? `All ${agenda.length} agenda items are agreed and bound to readiness snapshot v7 as cited evidence.`
									: `MAX has reconciled ${resolvedCount} of ${agenda.length} agenda items against their sources. Nothing is bound until you finalize.`}</p>
							</motion.div>
						</AnimatePresence>
					</section>
				</div>
			</div>
		</div>
	)
}

function WorkshopTurn({ turn, tint, agreed, stream }: { turn: WorkshopTurnData; tint: number; agreed: boolean; stream: boolean }) {
	// Captured once, so a parent re-render mid-stream never snaps the turn whole.
	const streamRef = useRef(stream)
	const revealed = useWordStream(turn.text, streamRef.current)
	return (
		<article className="thread-turn">
			<div className="turn-speaker"><span className="person-chip" data-tint={tint} aria-hidden="true">{turn.person.initials}</span>{turn.person.name}<CaretRight size={12} className="turn-sep" aria-hidden="true" /><span className="workshop-role">{turn.person.role}</span></div>
			<div className={`turn-bubble${agreed ? " is-agreed" : ""}`}><p>{streamRef.current ? <GeneratedWords text={turn.text} revealed={revealed} /> : turn.text}</p></div>
			<span className="workshop-cite turn-meta-chip">Evidence <strong>{turn.source}</strong></span>
		</article>
	)
}

type NeedsYouItem = { id: string; kind: "Approval" | "Authority" | "Decision" | "Interview" | "Recovery"; title: string; detail: string; onOpen: () => void }

function needsYouItems({ scenarioKey, phase, decision, interviewClosed, interviewIndex, charterPending, onJumpToDecision, onOpenThread, onOpenHandoff }: {
	scenarioKey: ScenarioKey
	phase: number
	decision: DecisionState
	interviewClosed: boolean
	interviewIndex: number
	/* The package is ready, the charter is not approved, and nothing has gone to Agentix yet. */
	charterPending?: boolean
	onJumpToDecision: () => void
	onOpenThread: () => void
	onOpenHandoff?: () => void
}): NeedsYouItem[] {
	const scenario = SCENARIOS[scenarioKey]
	const items: NeedsYouItem[] = []
	const prompt = scenario.ownerInterview[Math.min(interviewIndex, scenario.ownerInterview.length - 1)]
	if (!interviewClosed && !journeyComplete(phase)) items.push({ id: "owner-interview", kind: "Interview", title: "Answer MAX’s interview question", detail: prompt?.topic ?? "Owner interview", onOpen: onOpenThread })
	if (interviewClosed && phase === 4 && decision === "pending") items.push({ id: "authority", kind: "Authority", title: scenario.exception.title, detail: scenario.exception.trigger, onOpen: onJumpToDecision })
	// The charter is the one thing between a finished package and the handoff, so the rail must
	// name it. Saying nothing is waiting while the owner's approval is the only thing left is worse
	// than saying nothing at all.
	if (charterPending && onOpenHandoff) items.push({ id: "charter", kind: "Approval", title: "Approve the project charter", detail: "It travels with the handoff packet", onOpen: onOpenHandoff })
	return items
}

/*
 * Needs you: a persistent rail, not a screen. It carries the journey spine, the
 * owner's outstanding items and the health of the bound sources, so the owner
 * never has to change tab to learn whether anything is waiting on them.
 */
function NeedsYouDock({ scenarioKey, phase, paused, decision, interviewClosed, interviewIndex, handoffId, onJumpToDecision, onOpenThread, onOpenSources }: {
	scenarioKey: ScenarioKey
	phase: number
	paused: boolean
	decision: DecisionState
	interviewClosed: boolean
	interviewIndex: number
	handoffId: string | null
	onJumpToDecision: () => void
	onOpenThread: () => void
	onOpenSources: () => void
}) {
	const scenario = SCENARIOS[scenarioKey]
	const items = needsYouItems({ scenarioKey, phase, decision, interviewClosed, interviewIndex, onJumpToDecision, onOpenThread })
	const journey = runJourney({ scenarioKey, phase, paused, decision, interviewClosed, handoffId })
	const sourceState = !interviewClosed ? "Bound" : phase >= 2 ? "Read" : "Reading"
	// The same rail as the Thread's Details panel: one width, one inset, one title.
	return (
		<aside className="needs-you-dock" aria-label="Needs you">
			<header className="panel-head"><h2>Details</h2></header>
			<NeedsYouGroup items={items} headingId="dock-needs-you" />
			<JourneyGroup phase={phase} context={journey} headingId="dock-journey" />
			<section className="panel-group" aria-labelledby="dock-sources">
				<h3 id="dock-sources">Sources</h3>
				<p className="panel-desc">Read automatically within the approved scopes.</p>
				<div className="panel-card">
					{scenario.sources.map(source => (
						<button key={source.name} type="button" className="panel-row is-stacked" onClick={onOpenSources}>
							<Mark seed={source.name} size="xs" className="panel-row-icon" />
							<span className="panel-row-label">{source.name}</span>{" "}
							<span className="panel-row-value">{sourceState} · {source.records}</span>
							<CaretRight size={14} className="panel-row-caret" />
						</button>
					))}
				</div>
			</section>
		</aside>
	)
}
