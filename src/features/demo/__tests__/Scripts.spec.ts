import { describe, expect, it } from "vitest"
import { DELIVERABLES, SCENARIOS, deliverableBodies } from "@/features/discovery-autonomous/model"
import { packageSuggestions } from "@/features/organization/discoverySuggestions"
import { readKnowledge, resetKnowledgeStore } from "@/features/organization/knowledge"
import { DEMO_SCRIPTS } from "../scripts"

/*
 * What each customer demo says on the call has to agree with the Thread and with its own figures:
 * one reply and one fact per answer, the second reply keeps the source-check sentence the Thread
 * has always shown, the last one closes, and every stakeholder call is with someone in the Discovery.
 */
describe.each(Object.values(DEMO_SCRIPTS))("the $id demo's interview", script => {
	const scenario = SCENARIOS[script.scenarioKey]
	it("has one spoken reply and one fact for every scripted answer", () => {
		expect(script.replies).toHaveLength(script.answers.length)
		expect(script.heard).toHaveLength(script.answers.length)
		for (const reply of script.replies) expect(reply.length).toBeLessThan(320)
	})

	it("keeps the source check on the second answer, naming the source the Thread names", () => {
		const second = scenario.ownerInterview[1].topic.toLowerCase()
		expect(script.replies[1]).toMatch(new RegExp(`verify (the )?${second} in ${scenario.sources[0].name} instead of asking you to guess`))
		expect(script.heard[1].check?.finding).toBeTruthy()
	})

	it.runIf(script.ending === "agentix")("keeps release authority as an open question for Agentix", () => {
		const index = scenario.ownerInterview.findIndex(prompt => prompt.topic === "Release authority")
		expect(script.heard[index].open).toBe(true)
	})

	it.runIf(script.ending === "knowledge")("settles who publishes to Knowledge in the interview, rather than leaving it open", () => {
		const index = scenario.ownerInterview.findIndex(prompt => prompt.topic === "Publishing")
		expect(index).toBeGreaterThan(-1)
		expect(script.heard[index].open).toBeFalsy()
	})

	it("hands its package to the module its story ends in", () => {
		expect(scenario.handoff?.target).toBe(script.ending)
		expect(scenario.handoff?.packageId).toBe(script.packageId)
	})

	it("names both approvals a person now gives, and doesn't promise nine documents", () => {
		expect(script.steps.briefs.does).toMatch(/Approve all/)
		expect(script.steps.approve.does).toMatch(/exact version/)
		expect(JSON.stringify(script.steps)).not.toMatch(/nine documents/i)
	})

	it("calls only people the Discovery mapped, and names a real disagreement", () => {
		const people = scenario.people.map(person => person.id)
		expect(script.calls.map(call => call.person).sort()).toEqual([...people].sort())
		expect(script.conflict.between.every(id => people.includes(id))).toBe(true)
		expect(script.conflict.between[0]).not.toBe(script.conflict.between[1])
	})
})

/*
 * A demo that ends in Knowledge builds nothing: it selects what describes the work as it runs
 * today, no charter, and its beats wait on suggestions its package really sends.
 */
describe.each(Object.values(DEMO_SCRIPTS).filter(script => script.ending === "knowledge"))("the $id demo's Knowledge ending", script => {
	it("selects real documents and no charter, so nothing asks for a charter approval", () => {
		const names = DELIVERABLES.map(item => item.name as string)
		expect(script.outputs?.length).toBeGreaterThan(0)
		for (const name of script.outputs ?? []) expect(names).toContain(name)
		expect(script.outputs).not.toContain("Project charter and governance")
		expect(script.charterReason).toBeUndefined()
	})

	it("waits on suggestions the package sends, and revises only items the library has", () => {
		resetKnowledgeStore()
		const suggestions = packageSuggestions(script.packageId, "approved") ?? []
		const ids = suggestions.map(suggestion => suggestion.id)
		expect(ids).toContain(script.suggestions.procedure)
		expect(ids).toContain(script.suggestions.restricted)
		const library = readKnowledge().items.map(item => item.id)
		for (const suggestion of suggestions) if (suggestion.revises) expect(library).toContain(suggestion.revises)
		// Both decision paths send the same suggestions; only what two of them say differs.
		expect((packageSuggestions(script.packageId, "modified") ?? []).map(suggestion => suggestion.id)).toEqual(ids)
	})

	/*
	 * Knowledge receives what a person approved, so every suggestion cites a section of a document
	 * the package selected, in the version the owner's decision produced: never an interview or a
	 * decision on its own. A glossary meaning is the cited passage word for word.
	 */
	it.each(["approved", "modified"] as const)("cites a section of a selected document on the %s path", decision => {
		const bodies = deliverableBodies(script.scenarioKey, decision)
		const suggestions = packageSuggestions(script.packageId, decision) ?? []
		expect(suggestions.length).toBeGreaterThan(0)
		for (const suggestion of suggestions) {
			const { document, section } = suggestion.cites
			expect(script.outputs, `${suggestion.title} cites ${document}`).toContain(document)
			const body = bodies[DELIVERABLES.findIndex(item => item.name === document)]
			const cited = body.sections.find(entry => entry.heading === section)
			expect(cited, `${suggestion.title} cites ${document} · ${section}`).toBeDefined()
			if (suggestion.section === "glossary") expect(cited!.paragraphs.join("\n")).toContain(suggestion.body)
		}
		// The procedure cites the map its 25 steps come from.
		const performed = bodies[DELIVERABLES.findIndex(item => item.name === "Use case catalog")].sections.find(entry => entry.heading === "The close as performed")
		expect(performed?.exhibit?.kind === "table" && performed.exhibit.rows.map(row => row.cells[0])).toEqual(Array.from({ length: 25 }, (_, index) => `S-${String(index + 1).padStart(2, "0")}`))
	})

	it("selects the process map the plan names, and no to-be document for a mapping", () => {
		expect(script.outputs).toContain("Use case catalog")
		expect(script.outputs).not.toContain("As-Is / To-Be process analysis")
	})
})
