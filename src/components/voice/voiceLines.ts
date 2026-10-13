import { DEMO_SCRIPTS } from "@/features/demo/scripts"
import { greetingFor, questionFor, stakeholderClosing, topicsFor } from "@/features/demo/stakeholderLines"
import { callOpener, closingText } from "@/features/discovery-autonomous/interview"
import { SCENARIOS } from "@/features/discovery-autonomous/model"
import { normalizeLine } from "./voiceLibrary"

/*
 * Every line MAX says that is fixed in advance, so `pnpm voice:render` can pre-render it with
 * ElevenLabs (scripts/render-voice.mjs). Lines composed from live state (an answer to an off-script
 * question, Agentix status, the morning briefing) aren't here: they use the browser's voice.
 *
 * For each customer demo: the call's opening (fresh and on return to each question), MAX's reply to
 * each scripted answer followed by its next question (exactly the text the call speaks), the close,
 * and the voice-channel stakeholder's interview.
 */
export type VoiceLine = { voice: string; text: string; demo: string; kind: "opener" | "reply" | "closing" | "stakeholder" | "conversation" }

export function voiceLines(): VoiceLine[] {
	const lines: VoiceLine[] = []
	for (const script of Object.values(DEMO_SCRIPTS)) {
		const key = script.scenarioKey
		const scenario = SCENARIOS[key]
		const demo = script.id
		scenario.ownerInterview.forEach((_, index) => lines.push({ voice: "max", demo, kind: "opener", text: callOpener(key, index) }))
		script.replies.forEach((reply, index) => {
			const next = scenario.ownerInterview[index + 1]
			lines.push(next ? { voice: "max", demo, kind: "reply", text: `${reply} ${next.question}` } : { voice: "max", demo, kind: "closing", text: closingText(scenario, scenario.people, reply) })
		})
		for (const person of scenario.people.filter(entry => entry.channel === "Voice")) {
			const topics = topicsFor(person)
			topics.forEach((topic, index) => lines.push({ voice: "max", demo, kind: "stakeholder", text: [index === 0 ? greetingFor(person, scenario.title, topics.length) : "", questionFor(topic, index, index === topics.length - 1)].filter(Boolean).join(" ") }))
			lines.push({ voice: "max", demo, kind: "stakeholder", text: stakeholderClosing(person) })
		}
	}
	lines.push({ voice: "max", demo: "all", kind: "conversation", text: "What would you like to ask me about this Discovery?" })
	const seen = new Set<string>()
	return lines.map(line => ({ ...line, text: normalizeLine(line.text) })).filter(line => { const id = `${line.voice}::${line.text}`; if (seen.has(id)) return false; seen.add(id); return true })
}
