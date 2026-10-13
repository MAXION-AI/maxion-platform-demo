import type { Person } from "@/features/discovery-autonomous/model"

/*
 * What MAX says in a stakeholder's own interview (StakeholderInterviewPage), shared with the voice
 * render script so the lines a stakeholder hears can be pre-rendered like the owner's call.
 */

/* Each phrase of a stakeholder's focus is one thing MAX has to cover with them. */
export function topicsFor(person: Person) {
	return person.focus.split(/,\s*/).map(topic => topic.trim()).filter(Boolean)
}

/* MAX says why it is here once, not before every question. */
export function greetingFor(person: Person, title: string, count: number) {
	const first = person.name.split(" ")[0]
	return `${first}, thank you for the time. I am MAX, running the Discovery on ${title}. ${count} question${count === 1 ? "" : "s"} on your ground, then I will leave you to it. Nothing here is attributed to you by name.`
}

/* The topic is written as the scenario wrote it: a proper noun stays a proper noun. */
export function questionFor(topic: string, index: number, last: boolean) {
	if (index === 0) return `Start with ${topic}. How does it work today, and where does it go wrong?`
	if (last) return `Last one: ${topic}. Who decides when it is contested, and what would you change?`
	return `Now ${topic}. What does the record not show that I would need to know?`
}

/* A plausible answer in the stakeholder's own voice, so a presenter is never stuck for words. */
export function suggestionFor(topic: string, index: number, last: boolean) {
	if (index === 0) return `It works until month-end. Volume triples, we go from a rule to memory, and that is where ${topic} slips.`
	if (last) return `It comes to me informally today. I would rather it were written down and owned by one named person, rather than whoever happens to be on the close.`
	return `The record shows what was decided, never why. Nobody writes the judgement down, so it reads cleaner than it is.`
}

/* MAX's close of a stakeholder's voice interview. */
export const stakeholderClosing = (person: Person) => `That covers everything I needed, ${person.name.split(" ")[0]}. Thank you. You can submit whenever you’re ready.`
