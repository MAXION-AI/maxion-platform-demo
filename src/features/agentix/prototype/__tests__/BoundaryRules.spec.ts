import { describe, expect, it } from "vitest"
import { SCENARIOS, WORKFLOW_IDS } from "../engine/scenarios"
import { boundaryRules } from "../engine/selectors"

/*
 * The boundary is the one statement of what an agent team may do. On screen it is split into
 * what the team does on its own, what it asks a person first, and what it never does. A split
 * that dropped a sentence, or filed a prohibition under "on its own", would misstate authority,
 * so every scenario is checked, not just the four demos.
 */
const sentences = (text: string) => text.split(/(?<=\.)\s+(?=[A-Z])/).filter(Boolean)

describe("boundaryRules", () => {
	it("splits the revenue boundary into its three kinds of rule, in order", () => {
		expect(boundaryRules(SCENARIOS.invoice.boundary)).toEqual([
			{ kind: "does", label: "On its own", text: "Read the billing ledger, build and test changes in an isolated environment, release tested versions under policy and record approved exception resolutions." },
			{ kind: "asks", label: "Asks first", text: "A variance above $200 needs the revenue owner." },
			{ kind: "never", label: "Never", text: "Ledger edits, payment release or customer messages." },
		])
	})

	it("drops the repeated 'no' inside a prohibition without losing an item", () => {
		const never = boundaryRules(SCENARIOS.conversion.boundary).find(rule => rule.kind === "never")
		expect(never?.text).toBe("Business data change, authorisation change, and cutover decision.")
		const orders = boundaryRules(SCENARIOS.orders.boundary).find(rule => rule.kind === "never")
		expect(orders?.text).toBe("Price, discount, quote or contract change, and invoicing or collections.")
	})

	for (const id of WORKFLOW_IDS) {
		it(`keeps every sentence of the ${id} boundary, each in exactly one row`, () => {
			const rules = boundaryRules(SCENARIOS[id].boundary)
			expect(rules.map(rule => sentences(rule.text).length).reduce((a, b) => a + b, 0)).toBe(sentences(SCENARIOS[id].boundary).length)
			// A prohibition never lands under "on its own", and "on its own" is always stated.
			expect(rules.find(rule => rule.kind === "does")).toBeDefined()
			for (const rule of rules.filter(entry => entry.kind !== "never")) expect(rule.text).not.toMatch(/^(No|Cannot)\b/)
			for (const rule of rules) expect(rule.text).toMatch(/^[A-Z$]/)
		})
	}

	it("files a sentence that waits on a person under 'asks first'", () => {
		for (const id of ["invoice", "payables", "orders", "conversion"] as const) {
			expect(boundaryRules(SCENARIOS[id].boundary).find(rule => rule.kind === "asks")?.text).toMatch(/needs|blocked for|held for/)
		}
	})
})
