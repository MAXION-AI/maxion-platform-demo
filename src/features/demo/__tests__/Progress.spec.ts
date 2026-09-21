import { describe, expect, it } from "vitest"
import { activate, actOnEngagement, answerQuestion, receivePackage, tick } from "@/features/agentix/prototype/engine/engine"
import { demoInitialState } from "@/features/agentix/prototype/engine/seed"
import type { AgentixState } from "@/features/agentix/prototype/engine/types"
import { demoSteps, nextAnswer, readDemoSnapshot, type DemoDiscovery } from "../progress"
import { DEMO_STEP_ORDER, demoScript } from "../scripts"
import { DEMO_KEYS, demoKey, isDemoCommand } from "../session"

const REVENUE = demoScript("revenue")

const base = Date.parse("2026-11-23T10:30:00Z")
const record = (patch: Partial<DemoDiscovery> = {}): DemoDiscovery => ({
	id: "rec-1", title: "Revenue reconciliation: SQL Server to AWS", scenarioKey: "revenue", phase: 0, decision: "pending",
	interviewIndex: 0, interviewClosed: false, clarificationPending: false, charterApproval: null, handoff: null, updatedAt: "2026-11-23T10:31:00Z", ...patch,
})
const current = (discovery: DemoDiscovery | null, agentix: AgentixState | null = demoInitialState(base)) => {
	const { steps, current: index } = demoSteps(REVENUE, { discovery, agentix })
	return steps[index]
}
const link = { recordId: "rec-1", packetId: "HP-ABC123", title: "Revenue reconciliation: SQL Server to AWS" }

describe("where the presenter is", () => {
	it("starts at the Discovery, with Discover as the way in", () => {
		const step = current(null)
		expect(step.id).toBe("start")
		expect(step.action?.run).toEqual({ kind: "discover" })
		expect(demoSteps(REVENUE, { discovery: null, agentix: null }).steps).toHaveLength(DEMO_STEP_ORDER.length)
	})

	it("offers the scripted answer for the question MAX is asking, and none during a follow-up", () => {
		const step = current(record({ interviewIndex: 2 }))
		expect(step.id).toBe("interview")
		expect(step.detail).toBe("Question 3 of 6")
		expect(step.action?.run).toEqual({ kind: "fill", text: REVENUE.answers[2] })
		// Just after Enter, MAX hasn't replied and the saved question hasn't moved: nothing to fill, and
		// opening the Discovery lets MAX answer if a reload cut the reply off.
		const replying = current(record({ interviewIndex: 2, messages: [{ actor: "max" }, { actor: "user" }] }))
		expect(replying.detail).toBe("MAX is replying…")
		expect(replying.action?.run).toEqual({ kind: "discovery", recordId: "rec-1", jump: "resume" })
		const followUp = current(record({ interviewIndex: 2, clarificationPending: true }))
		expect(followUp.action?.run).toEqual({ kind: "discovery", recordId: "rec-1", jump: "resume" })
		expect(nextAnswer(REVENUE, record({ interviewClosed: true }))).toBeNull()
	})

	it("keeps each step current until the presenter has done it", () => {
		const investigating = current(record({ interviewClosed: true, phase: 2 }))
		expect(investigating.id).toBe("decision")
		expect(investigating.action?.run).toEqual({ kind: "discovery", recordId: "rec-1", jump: "autonomy" })
		const deciding = current(record({ interviewClosed: true, phase: 4 }))
		expect(deciding.detail).toBe("The decision is waiting for you.")
		expect(deciding.action?.run).toEqual({ kind: "discovery", recordId: "rec-1", jump: "decision" })
		expect(current(record({ interviewClosed: true, phase: 5, decision: "approved" })).detail).toBe("MAX is writing the nine documents.")
		// The package stays the step while the presenter reads it; approving the charter moves on to the handoff.
		const ready = current(record({ interviewClosed: true, phase: 7, decision: "approved" }))
		expect(ready.id).toBe("package")
		expect(ready.detail).toBe("The nine documents are ready.")
		expect(current(record({ interviewClosed: true, phase: 7, decision: "modified", charterApproval: { reason: "ok", approvedAt: "x" } })).id).toBe("handoff")
	})

	it("creates the engagement in Agentix step by step, then moves on to the mapping", () => {
		const handedOff = record({ interviewClosed: true, phase: 7, decision: "approved", handoff: { id: "HP-ABC123", createdAt: "2026-11-23T10:50:00Z", note: "", target: "agentix", packageId: "pkg_revenue_v2", recordId: "rec-1" } })
		let state = receivePackage(demoInitialState(base), "pkg_revenue_v2", "discovery", "", link)
		expect(current(handedOff, state).id).toBe("proposal")
		expect(current(handedOff, state).detail).toBe("Two questions to answer.")
		state = answerQuestion(state, "invoice", "release", "approval")
		state = answerQuestion(state, "invoice", "testdata", "synthetic")
		expect(current(handedOff, state).detail).toBe("Run the read-only check next.")
		state = actOnEngagement(state, "invoice", "recheck")
		expect(current(handedOff, state).detail).toBe("The read-only check is running.")
		state = tick(state)
		expect(current(handedOff, state).detail).toBe("Ready to activate.")
		state = activate(state, "invoice")
		expect(state.engagements.invoice.packages).toContain("pkg_revenue_v2")
		expect(current(handedOff, state).id).toBe("mapping")
		// A demo that went straight to Agentix (the Discovery record was cleared) still reads the Agentix side.
		expect(current(null, state).id).toBe("mapping")
	})
})

describe("reading the saved demo", () => {
	const storage = (entries: Record<string, string>) => ({ getItem: (key: string) => entries[key] ?? null })

	it("tolerates missing, broken and foreign data", () => {
		expect(readDemoSnapshot(REVENUE, storage({}))).toEqual({ discovery: null, agentix: null })
		expect(readDemoSnapshot(REVENUE, storage({ [demoKey(DEMO_KEYS.discovery)]: "{not json", [demoKey(DEMO_KEYS.agentix)]: "{\"version\":3}" }))).toEqual({ discovery: null, agentix: null })
		expect(readDemoSnapshot(REVENUE, null)).toEqual({ discovery: null, agentix: null })
	})

	it("reads the most recently worked revenue Discovery, never the everyday records", () => {
		const records = [record({ id: "old", updatedAt: "2026-11-23T10:00:00Z" }), record({ id: "new", updatedAt: "2026-11-23T11:00:00Z" }), { ...record({ id: "tprm" }), scenarioKey: "tprm" }]
		const snapshot = readDemoSnapshot(REVENUE, storage({ [demoKey(DEMO_KEYS.discovery)]: JSON.stringify(records), [DEMO_KEYS.discovery]: JSON.stringify([record({ id: "everyday", updatedAt: "2027-01-01T00:00:00Z" })]) }))
		expect(snapshot.discovery?.id).toBe("new")
	})
})

describe("commands from the presenter window", () => {
	it("accepts only a bounded answer or a known restart", () => {
		expect(isDemoCommand({ type: "fill", text: "Within $50 per region." })).toBe(true)
		expect(isDemoCommand({ type: "restart", start: "package" })).toBe(true)
		expect(isDemoCommand({ type: "restart", start: "everything" })).toBe(false)
		expect(isDemoCommand({ type: "fill", text: "x".repeat(601) })).toBe(false)
		expect(isDemoCommand({ type: "navigate", to: "https://example.com" })).toBe(false)
		expect(isDemoCommand({ type: "fill", text: "ok", id: "x".repeat(81) })).toBe(false)
		expect(isDemoCommand({ type: "fill", text: "ok", id: "abc", recordId: "rec-1" })).toBe(true)
		expect(isDemoCommand(null)).toBe(false)
	})
})
