import { SCENARIOS, type Person, type Scenario, type ScenarioKey } from "./model"

/*
 * The owner interview's turn contract, shared by the Thread (text), the call (voice) and the
 * voice render script, so the words MAX writes, speaks and pre-renders are one set:
 *
 * - each MAX turn is a ChatMessage whose `text` is everything MAX says (its reply to the last
 *   answer, then the next question) and whose `prompt` is the bare question;
 * - each owner answer becomes an OwnerFact, which is what MAX heard: a short label, the value it
 *   will hold the team to, and whether that value is captured, kept open as a gap, or being
 *   checked against a connected source.
 */

export type ChatMessage = {
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
	/* How the owner gave this answer: spoken on the call, or typed. Older records lack it. */
	via?: "voice" | "typed"
}

/*
 * What MAX heard in one answer.
 * - captured   the owner's position, held as the working answer for that topic
 * - gap        "not sure": kept open, with who would know when the owner names them
 * - checking   the owner pointed at a source; MAX is reading it during the call
 * - early      that read returned an early signal (full verification still follows the interview)
 * - verified   the evidence stage confirmed it against the source
 */
export type FactStatus = "captured" | "gap" | "checking" | "early" | "verified"
export type OwnerFact = {
	index: number
	topic: string
	label: string
	value: string
	status: FactStatus
	/* The owner's own words this fact came from, and the message that holds them. */
	quote: string
	messageId: string
	source?: string
	/* What the source read found, when it found something. */
	finding?: string
}

/* A demo's scripted reading of one answer; see DemoScript.heard. */
export type HeardSpec = { label: string; value: string; open?: boolean; check?: { finding: string } }

export function interviewMessage(scenarioKey: ScenarioKey, index: number, prefix?: string): ChatMessage {
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

export function initialInterviewMessages(scenarioKey: ScenarioKey, missionBrief = "", missionTitle = ""): ChatMessage[] {
	const scenario = SCENARIOS[scenarioKey]
	// MAX echoes the owner's own words when their first sentence fits. A longer one would be clipped
	// mid-phrase ("…and give finance a…"), which reads as a mistake, so it is named by its mission.
	const quotable = firstSentence(missionBrief).length <= 120 || !missionTitle.trim()
	const missionContext = !missionBrief.trim() ? ""
		: quotable ? `I’ve captured your mission: “${conciseAnswer(missionBrief)}”. `
		: `I’ve captured your mission, “${missionTitle.trim()}”. `
	return [interviewMessage(
		scenarioKey,
		0,
		`${missionContext}I’ll lead this as the ${scenario.interviewer}. I’ve already bound ${scenario.sources.length} permitted sources, so I’ll ask only for judgment the records can’t supply.`,
	)]
}

export function isUncertainAnswer(text: string) {
	return /^(not sure|i(?:'|’)m not sure|i do not know|i don(?:'|’)t know|don(?:'|’)t know|no idea|unsure|idk)\b/i.test(text.trim()) || text.trim().split(/\s+/).length < 3
}

// Echoes of what the owner wrote must never cut a word in half — trim back to
// the last word boundary before appending the ellipsis. The sentence's own end
// mark goes, so a quote never closes as `.”.`
export function conciseAnswer(text: string, limit = 120) {
	const sentence = firstSentence(text)
	if (sentence.length <= limit) return sentence
	const clipped = sentence.slice(0, limit - 3)
	const lastBreak = clipped.lastIndexOf(" ")
	const stem = (lastBreak > limit * 0.5 ? clipped.slice(0, lastBreak) : clipped).replace(/[\s,;:—-]+$/, "")
	return `${stem}…`
}

export function firstSentence(text: string) {
	return text.trim().split(/[.!?]\s/)[0].replace(/\s+/g, " ").replace(/[.!?]+$/, "")
}

export function referencedSource(text: string, scenarioKey: ScenarioKey) {
	const normalized = text.toLowerCase()
	const scenario = SCENARIOS[scenarioKey]
	return scenario.sources.find((source) => normalized.includes(source.system.toLowerCase()) || normalized.includes(source.name.toLowerCase()))
		?? (/\b(check|look|verify|source|records?|documents?)\b/i.test(text) ? scenario.sources[0] : undefined)
}

/* The owner's words inside MAX's reply, quoted without their own closing
 * punctuation so the sentence never ends in `.”.` */
export function echoOwner(text: string) {
	return conciseAnswer(text, 90).replace(/[.!?]+$/, "")
}

const firstName = (person: Person) => person.name.split(" ")[0]
function nameList(people: Person[]) {
	const names = people.map(firstName)
	return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
}

/*
 * The end of the owner interview, written to be heard as much as read. It keeps the sentence the
 * Thread has always shown ("That gives me enough owner context for this pass") and then says, in
 * plain terms, what MAX does next and when it will come back.
 */
export function closingText(scenario: Scenario, people: Person[], prefix?: string) {
	const who = people.length ? ` and talk to ${nameList(people)}` : ""
	return `${prefix ? `${prefix} ` : ""}That gives me enough owner context for this pass. I’ve closed the interview and kept the conversation for later additions. Next I’ll read the ${scenario.sources.length} connected sources${who}, and I’ll only come back to you if something needs your call. You can follow all of it in Autonomy.`
}

/*
 * What MAX says when the call starts. A call opens differently from a chat: MAX greets the owner,
 * says how long this takes and why it asks so little, then asks the question that is open now.
 */
export function callOpener(scenarioKey: ScenarioKey, index: number, clarifying?: string) {
	const scenario = SCENARIOS[scenarioKey]
	const total = scenario.ownerInterview.length
	const prompt = scenario.ownerInterview[Math.min(index, total - 1)]
	if (clarifying) return `Welcome back. We were on ${prompt.topic.toLowerCase()}. ${clarifying}`
	// Short on purpose: it is read as a caption and in the transcript at once (review, 2026-10-19).
	if (index === 0) return `Hi, I’m MAX. ${total} questions, only on what the ${scenario.sources.length} connected sources can’t tell me. ${prompt.question}`
	return `Welcome back. We’re on question ${index + 1} of ${total}, ${prompt.topic.toLowerCase()}. ${prompt.question}`
}

/* What MAX heard in an answer, when no script describes it: the topic and the owner's own words. */
export function heardFrom(scenarioKey: ScenarioKey, index: number, answer: string, messageId: string, scripted?: HeardSpec): OwnerFact {
	const scenario = SCENARIOS[scenarioKey]
	const prompt = scenario.ownerInterview[index]
	const source = referencedSource(answer, scenarioKey)
	if (scripted) {
		return {
			index, topic: prompt.topic, label: scripted.label, value: scripted.value, quote: answer, messageId,
			status: scripted.check ? "checking" : scripted.open ? "gap" : "captured",
			source: scripted.check ? source?.name ?? scenario.sources[0].name : undefined,
		}
	}
	if (isUncertainAnswer(answer)) return { index, topic: prompt.topic, label: prompt.topic, value: "Open · MAX will ask who would know", status: "gap", quote: answer, messageId }
	return { index, topic: prompt.topic, label: prompt.topic, value: conciseAnswer(answer, 72), status: source ? "checking" : "captured", quote: answer, messageId, source: source?.name }
}

export type RingStatus = "done" | "gap" | "current" | "pending"
/* One ring segment per interview topic: captured, kept open, being asked now, or still to come. */
export function topicRing(scenarioKey: ScenarioKey, facts: OwnerFact[], interviewIndex: number, closed: boolean) {
	return SCENARIOS[scenarioKey].ownerInterview.map((prompt, index) => {
		const fact = facts.find(entry => entry.index === index)
		const status: RingStatus = fact ? (fact.status === "gap" ? "gap" : "done") : !closed && index === interviewIndex ? "current" : "pending"
		return { key: prompt.topic, label: `${prompt.topic}: ${fact ? fact.status === "gap" ? "kept open" : fact.value : !closed && index === interviewIndex ? "being asked now" : "not yet"}`, status }
	})
}

/* Later evidence promotes what MAX heard: a source check becomes verified once sources are read. */
export function settleFacts(facts: OwnerFact[], scenarioKey: ScenarioKey, evidenceRead: boolean): OwnerFact[] {
	if (!evidenceRead) return facts
	let changed = false
	const next = facts.map(fact => {
		if (fact.status !== "checking" && fact.status !== "early") return fact
		changed = true
		const source = SCENARIOS[scenarioKey].sources.find(entry => entry.name === fact.source)
		return { ...fact, status: "verified" as const, finding: fact.finding ?? (source ? `Checked in ${source.name} · ${source.records}` : "Checked against the connected sources") }
	})
	return changed ? next : facts
}

export function isOwnerFact(value: unknown): value is OwnerFact {
	if (!value || typeof value !== "object") return false
	const fact = value as Partial<OwnerFact>
	return typeof fact.index === "number" && typeof fact.topic === "string" && typeof fact.label === "string" && typeof fact.value === "string"
		&& typeof fact.quote === "string" && typeof fact.messageId === "string"
		&& (fact.status === "captured" || fact.status === "gap" || fact.status === "checking" || fact.status === "early" || fact.status === "verified")
}
