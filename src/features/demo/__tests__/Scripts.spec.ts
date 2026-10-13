import { describe, expect, it } from "vitest"
import { SCENARIOS } from "@/features/discovery-autonomous/model"
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

	it("keeps release authority as an open question for Agentix", () => {
		const index = scenario.ownerInterview.findIndex(prompt => prompt.topic === "Release authority")
		expect(script.heard[index].open).toBe(true)
	})

	it("calls only people the Discovery mapped, and names a real disagreement", () => {
		const people = scenario.people.map(person => person.id)
		expect(script.calls.map(call => call.person).sort()).toEqual([...people].sort())
		expect(script.conflict.between.every(id => people.includes(id))).toBe(true)
		expect(script.conflict.between[0]).not.toBe(script.conflict.between[1])
	})
})
