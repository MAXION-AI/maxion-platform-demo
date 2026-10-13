import { describe, expect, it } from "vitest"
import { matchScenario, SCENARIOS, WORKFLOW_IDS } from "../engine/scenarios"

/*
 * Agentix routes a written brief to a scenario by scoring the terms that scenario declared.
 * Before this was data-driven, a regex sent anything containing "invoice" or "payable" to the
 * revenue engagement, so the AP brief opened the wrong engagement and the order brief opened none.
 */
describe("routing a brief to an Agentix scenario", () => {
	it("routes every scenario's own example brief to itself", () => {
		for (const id of WORKFLOW_IDS) {
			expect(matchScenario(SCENARIOS[id].examples.brief), `${id} example`).toBe(id)
		}
	})

	it("keeps the three demo engagements apart even though their briefs share words", () => {
		// All three say "invoice" or "order" somewhere; specificity decides.
		expect(matchScenario("Reconcile daily revenue between the billing ledger and the revenue schema")).toBe("invoice")
		expect(matchScenario("Clear our AP invoice exceptions against the negotiated price tolerance")).toBe("payables")
		expect(matchScenario("Post booked Salesforce orders into SAP from one customer master")).toBe("orders")
	})

	it("keeps the plain words the engine has always routed on", () => {
		// A brief that just says "invoices" reached the revenue engagement before routing was
		// data-driven, and still must: the AP scenario only wins when the brief is about AP.
		expect(matchScenario("Review EMEA invoices against the approved purchasing policy")).toBe("invoice")
		expect(matchScenario("Triage service desk incidents for the Leeds office")).toBe("service")
	})

	it("matches nothing when a brief names no scenario", () => {
		expect(matchScenario("Please look into the thing we discussed on Tuesday")).toBeNull()
		expect(matchScenario("")).toBeNull()
	})

	it("gives every scenario terms to be found by", () => {
		for (const id of WORKFLOW_IDS) expect(SCENARIOS[id].match.length, id).toBeGreaterThan(0)
	})
})
