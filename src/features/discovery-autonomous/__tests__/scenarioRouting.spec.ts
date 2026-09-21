import { describe, expect, it } from "vitest"
import { DELIVERABLES } from "../deliverables"
import { SCENARIOS, scenarioForBrief } from "../model"

/*
 * The setup screen routes a written brief to a scenario by scoring match terms. A new scenario
 * whose terms overlap an existing one can quietly steal its brief, which would open the wrong
 * interview, the wrong stakeholders and the wrong package under the right title.
 */
describe("routing a brief to its scenario", () => {
	it("routes every scenario's own brief to itself", () => {
		for (const scenario of Object.values(SCENARIOS)) {
			expect(scenarioForBrief(scenario.brief).key, `${scenario.key} brief`).toBe(scenario.key)
		}
	})

	it("routes a brief that names no scenario to the fallback, with a score of zero", () => {
		const route = scenarioForBrief("Please look into the thing we discussed on Tuesday.")
		expect(route.score).toBe(0)
		expect(route.key).toBe("tprm")
	})

	it("keeps ServiceNow financial operations apart from the ServiceNow controls scenario", () => {
		// Both briefs mention ServiceNow; the AP one is about invoice exceptions and approval
		// authority, the enterprise one about financial controls and the close.
		expect(scenarioForBrief(SCENARIOS.servicenow.brief).key).toBe("servicenow")
		expect(scenarioForBrief(SCENARIOS.enterprise.brief).key).toBe("enterprise")
	})

	it("gives every scenario a complete package of documents", () => {
		for (const scenario of Object.values(SCENARIOS)) {
			expect(scenario.ownerInterview.length, `${scenario.key} interview`).toBeGreaterThanOrEqual(5)
			expect(scenario.people.length, `${scenario.key} people`).toBeGreaterThanOrEqual(3)
			expect(scenario.sources.length, `${scenario.key} sources`).toBeGreaterThanOrEqual(3)
		}
		expect(DELIVERABLES).toHaveLength(9)
	})
})
