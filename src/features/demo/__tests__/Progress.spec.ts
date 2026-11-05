import { describe, expect, it } from "vitest"
import { activate, actOnEngagement, answerQuestion, receivePackage, tick } from "@/features/agentix/prototype/engine/engine"
import { demoInitialState } from "@/features/agentix/prototype/engine/seed"
import type { AgentixState } from "@/features/agentix/prototype/engine/types"
import { CLOSE_MAP_SUGGESTIONS, packageSuggestions } from "@/features/organization/discoverySuggestions"
import { approveSuggestion, readKnowledge, rejectSuggestion, resetKnowledgeStore, suggestFromDiscovery, type KnowledgeState } from "@/features/organization/knowledge"
import { demoSteps, nextAnswer, readDemoSnapshot, type DemoDiscovery } from "../progress"
import { DEMO_STEP_ORDER, KNOWLEDGE_STEP_ORDER, demoScript } from "../scripts"
import { DEMO_KEYS, demoKey, isDemoCommand } from "../session"

const REVENUE = demoScript("revenue")

const base = Date.parse("2026-11-23T10:30:00Z")
const record = (patch: Partial<DemoDiscovery> = {}): DemoDiscovery => ({
	id: "rec-1", title: "Revenue reconciliation: SQL Server to AWS", scenarioKey: "revenue", phase: 0, decision: "pending",
	interviewIndex: 0, interviewClosed: false, clarificationPending: false, charterApproval: null, handoff: null, updatedAt: "2026-11-23T10:31:00Z", ...patch,
})
const current = (discovery: DemoDiscovery | null, agentix: AgentixState | null = demoInitialState(base)) => {
	const { steps, current: index } = demoSteps(REVENUE, { discovery, agentix, knowledge: null })
	return steps[index]
}
const link = { recordId: "rec-1", packetId: "HP-ABC123", title: "Revenue reconciliation: SQL Server to AWS" }

describe("where the presenter is", () => {
	it("starts at the Discovery, with Discover as the way in", () => {
		const step = current(null)
		expect(step.id).toBe("start")
		expect(step.action?.run).toEqual({ kind: "discover" })
		expect(demoSteps(REVENUE, { discovery: null, agentix: null, knowledge: null }).steps).toHaveLength(DEMO_STEP_ORDER.length)
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
		expect(current(record({ interviewClosed: true, phase: 5, decision: "approved" })).detail).toBe("MAX is writing the selected documents.")
		// The package stays the step while the presenter reads it; approving the charter moves on to the handoff.
		const ready = current(record({ interviewClosed: true, phase: 7, decision: "approved" }))
		expect(ready.id).toBe("package")
		expect(ready.detail).toBe("The selected documents are ready.")
		const charterDone = record({ interviewClosed: true, phase: 7, decision: "modified", charterApproval: { reason: "ok", approvedAt: "x" } })
		expect(current(charterDone).id).toBe("approve")
	})

	it("holds at the interview briefs until none waits", () => {
		const closed = record({ interviewClosed: true, phase: 2, work: { briefs: [{ status: "draft" }, { status: "draft" }, { status: "approved" }] } })
		const step = current(closed)
		expect(step.id).toBe("briefs")
		expect(step.detail).toBe("2 interview briefs waiting for you.")
		expect(step.action?.run).toEqual({ kind: "discovery", recordId: "rec-1", jump: "briefs" })
		expect(current(record({ interviewClosed: true, phase: 2, work: { briefs: [{ status: "approved" }] } })).id).toBe("decision")
	})

	it("moves past the package approval only once the record says approved", () => {
		const charterApproval = { reason: "ok", approvedAt: "x" }
		const base = { interviewClosed: true, phase: 7, decision: "approved", charterApproval }
		const waiting = current(record({ ...base, work: { package: { status: "pending", version: 2 } } }))
		expect(waiting.id).toBe("approve")
		expect(waiting.detail).toBe("Package v2 is waiting for your approval.")
		expect(waiting.action?.run).toEqual({ kind: "discovery", recordId: "rec-1", jump: "package-approval" })
		expect(current(record({ ...base, work: { package: { status: "returned", version: 2 } } })).detail).toMatch(/back with MAX/)
		expect(current(record({ ...base, work: { package: { status: "withdrawn", version: 2 } } })).id).toBe("approve")
		const approved = current(record({ ...base, work: { package: { status: "approved", version: 2 } } }))
		expect(approved.id).toBe("handoff")
		expect(approved.detail).toBe("Package v2 approved.")
		// A package with no charter selected has no charter to wait for.
		expect(current(record({ interviewClosed: true, phase: 7, decision: "approved", excludedOutputs: ["Project charter and governance"] })).id).toBe("approve")
	})

	it("tells the fourteen beats, with both new approvals in order", () => {
		expect(DEMO_STEP_ORDER).toHaveLength(14)
		expect(DEMO_STEP_ORDER.slice(0, 7)).toEqual(["start", "interview", "briefs", "decision", "package", "approve", "handoff"])
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

/*
 * The close-mapping demo ends in Knowledge: after the same seven Discovery beats, its steps follow
 * the suggestions its package sent and what an Owner or Admin decided about them.
 */
describe("a demo that ends in Knowledge", () => {
	const script = demoScript("close-map")
	if (script.ending !== "knowledge") throw new Error("The close-map demo ends in Knowledge")
	const CLOSE_MAP = script
	const mapping = (patch: Partial<DemoDiscovery> = {}) => record({ title: "Month-end close: how it actually runs", scenarioKey: "closemap", ...patch })
	const at = (discovery: DemoDiscovery | null, knowledge: KnowledgeState | null) => {
		const { steps, current: index } = demoSteps(CLOSE_MAP, { discovery, agentix: null, knowledge })
		return steps[index]
	}
	const approved = mapping({ phase: 7, decision: "approved", interviewClosed: true, interviewIndex: 5, excludedOutputs: ["Project charter and governance"], work: { package: { status: "approved", version: 1 }, briefs: [{ status: "approved" }] } })
	const handedOff = { ...approved, handoff: { id: "HP-CLOSE1", createdAt: "2026-11-23T10:40:00Z", note: "", target: "knowledge", packageId: CLOSE_MAP.packageId, recordId: "rec-1" } }
	const arrive = () => {
		resetKnowledgeStore()
		suggestFromDiscovery({ id: "HP-CLOSE1", work: "Month-end close: how it actually runs", recordId: "rec-1" }, packageSuggestions(CLOSE_MAP.packageId, "approved") ?? [])
		return readKnowledge()
	}

	it("walks eleven beats, and a package without a charter needs no charter approval", () => {
		expect(demoSteps(CLOSE_MAP, { discovery: null, agentix: null, knowledge: null }).steps.map(step => step.id)).toEqual(KNOWLEDGE_STEP_ORDER)
		// The finished, unapproved package: reading it is done because the charter was never selected.
		expect(at(mapping({ phase: 7, decision: "approved", interviewClosed: true, interviewIndex: 5, excludedOutputs: ["Project charter and governance"], work: { package: { status: "draft", version: 1 }, briefs: [{ status: "approved" }] } }), null).id).toBe("approve")
	})

	it("sends the presenter to Knowledge once the suggestions have arrived, with how many wait", () => {
		expect(at(approved, null).id).toBe("handoff")
		const step = at(handedOff, arrive())
		expect(step.id).toBe("suggestions")
		expect(step.detail).toBe("8 suggestions waiting in Knowledge.")
		expect(step.action?.run).toEqual({ kind: "knowledge" })
		// The suggestions alone tell the story moved on, even when the Discovery record is gone.
		expect(at(null, readKnowledge()).id).toBe("suggestions")
	})

	it("moves through the procedure and the restricted item only as each is approved", () => {
		arrive()
		approveSuggestion(CLOSE_MAP_SUGGESTIONS.systems)
		const procedure = at(handedOff, readKnowledge())
		expect(procedure.id).toBe("procedure")
		expect(procedure.action?.run).toEqual({ kind: "knowledge", item: CLOSE_MAP.suggestions.procedure })
		// Rejecting the procedure is a decision, but not the one this beat waits for.
		rejectSuggestion(CLOSE_MAP_SUGGESTIONS.freeze)
		expect(at(handedOff, readKnowledge()).id).toBe("procedure")
		approveSuggestion(CLOSE_MAP.suggestions.procedure)
		const restricted = at(handedOff, readKnowledge())
		expect(restricted.id).toBe("restricted")
		expect(restricted.action?.run).toEqual({ kind: "knowledge", item: CLOSE_MAP.suggestions.restricted })
		approveSuggestion(CLOSE_MAP.suggestions.restricted)
		const close = at(handedOff, readKnowledge())
		expect(close.id).toBe("close")
		expect(close.detail).toBe("4 suggestions waiting in Knowledge.")
	})

	it("ends a beat when its suggestion is rejected, and the close says what was rejected", () => {
		arrive()
		approveSuggestion(CLOSE_MAP_SUGGESTIONS.systems)
		rejectSuggestion(CLOSE_MAP.suggestions.procedure)
		// The procedure is gone, so its beat can't wait on it.
		expect(at(handedOff, readKnowledge()).id).toBe("restricted")
		approveSuggestion(CLOSE_MAP.suggestions.restricted)
		const close = at(handedOff, readKnowledge())
		expect(close.id).toBe("close")
		expect(close.detail).toBe("5 suggestions waiting in Knowledge. You rejected Month-end close; restart from the finished package to show it published.")
	})

	it("reads the demo's saved library and ignores a broken one", () => {
		const library = arrive()
		const entries = (value: string): Pick<Storage, "getItem"> => ({ getItem: key => key === demoKey(DEMO_KEYS.knowledge, "close-map") ? value : null })
		expect(readDemoSnapshot(CLOSE_MAP, entries(JSON.stringify(library))).knowledge?.received).toEqual(["HP-CLOSE1"])
		expect(readDemoSnapshot(CLOSE_MAP, entries("{\"items\":[]}")).knowledge).toBeNull()
	})
})

describe("reading the saved demo", () => {
	const storage = (entries: Record<string, string>) => ({ getItem: (key: string) => entries[key] ?? null })

	it("tolerates missing, broken and foreign data", () => {
		expect(readDemoSnapshot(REVENUE, storage({}))).toEqual({ discovery: null, agentix: null, knowledge: null })
		expect(readDemoSnapshot(REVENUE, storage({ [demoKey(DEMO_KEYS.discovery)]: "{not json", [demoKey(DEMO_KEYS.agentix)]: "{\"version\":3}" }))).toEqual({ discovery: null, agentix: null, knowledge: null })
		expect(readDemoSnapshot(REVENUE, null)).toEqual({ discovery: null, agentix: null, knowledge: null })
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
