import { describe, expect, it } from "vitest"
import { DEMO_SCRIPTS } from "@/features/demo/scripts"
import { SCENARIOS } from "../model"
import { callOpener, closingText, heardFrom, isOwnerFact, settleFacts, topicRing, type OwnerFact } from "../interview"

/*
 * The owner interview's turn contract, shared by the Thread and the call: what MAX hears in each
 * answer, how the topic ring reads, what a call says first and last, and how a source check is
 * promoted once the sources are read.
 */
describe("what MAX heard", () => {
	it("keeps a plain answer as the owner's position on that topic", () => {
		const fact = heardFrom("revenue", 2, "Within $50 per region each day. Anything above $200 comes to me before it’s posted.", "m1")
		expect(fact).toMatchObject({ index: 2, topic: "Tolerance", status: "captured", value: "Within $50 per region each day", messageId: "m1" })
	})

	it("keeps “not sure” as an explicit gap, never an invented value", () => {
		expect(heardFrom("revenue", 0, "Not sure, honestly", "m1")).toMatchObject({ status: "gap" })
	})

	it("marks an answer that points at a source as being checked against it", () => {
		const fact = heardFrom("revenue", 1, "Mostly EMEA. Check the ledger; I suspect currency conversion.", "m1")
		expect(fact.status).toBe("checking")
		expect(fact.source).toBe("Billing ledger sample")
	})

	it("uses the demo's own reading of a scripted answer, open items included", () => {
		const script = DEMO_SCRIPTS.revenue
		expect(heardFrom("revenue", 1, script.answers[1], "m", script.heard[1])).toMatchObject({ label: "Where it breaks", status: "checking" })
		expect(heardFrom("revenue", 4, script.answers[4], "m", script.heard[4])).toMatchObject({ label: "Release authority", status: "gap" })
	})

	it("verifies a source check only once the sources have been read", () => {
		const facts: OwnerFact[] = [heardFrom("revenue", 1, "Check the ledger", "m1")]
		expect(settleFacts(facts, "revenue", false)).toBe(facts)
		const settled = settleFacts(facts, "revenue", true)
		expect(settled[0]).toMatchObject({ status: "verified", finding: "Checked in Billing ledger sample · 4,812 invoices" })
	})

	it("reads saved facts defensively", () => {
		expect(isOwnerFact(heardFrom("revenue", 0, "A number nobody can explain.", "m1"))).toBe(true)
		expect(isOwnerFact({ index: 0, topic: "x" })).toBe(false)
		expect(isOwnerFact({ ...heardFrom("revenue", 0, "A number.", "m1"), status: "maybe" })).toBe(false)
	})
})

describe("the topic ring", () => {
	it("shows captured, kept open, being asked and still to come", () => {
		const facts = [heardFrom("revenue", 0, "A number finance can’t explain.", "a"), heardFrom("revenue", 1, "not sure", "b")]
		expect(topicRing("revenue", facts, 2, false).map(segment => segment.status)).toEqual(["done", "gap", "current", "pending", "pending", "pending"])
		expect(topicRing("revenue", facts, 2, true).map(segment => segment.status)).toEqual(["done", "gap", "pending", "pending", "pending", "pending"])
	})
})

describe("what the call says", () => {
	it("opens with a greeting, how long it is, and the open question", () => {
		const opener = callOpener("revenue", 0)
		expect(opener).toMatch(/^Hi, I’m MAX\./)
		expect(opener).toContain("6 questions")
		expect(opener).toContain(SCENARIOS.revenue.ownerInterview[0].question)
		expect(callOpener("revenue", 2)).toMatch(/^Welcome back\. We’re on question 3 of 6, tolerance\./)
	})

	it("closes with the sentence the Thread has always shown, then says what happens next", () => {
		const text = closingText(SCENARIOS.revenue, SCENARIOS.revenue.people, "That’s a clear bar.")
		expect(text).toMatch(/^That’s a clear bar\. That gives me enough owner context for this pass\./)
		expect(text).toContain("talk to Olivia, Grace, Sam and Tom")
		expect(text).toContain("4 connected sources")
	})
})
