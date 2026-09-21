import { describe, expect, it } from "vitest"
import { activate, answerQuestion, receivePackage, tick } from "../engine/engine"
import { initialState } from "../engine/seed"
import { LEGACY_KEY, readState, STORAGE_KEY, validState, writeState } from "../engine/storage"

/* A small but realistic version-3 record, as the previous demo saved it. */
function legacyV3() {
	const agent = (id: string, workflowId: string, extra: Record<string, unknown> = {}) => ({
		id, workflowId, name: { invoice: "Invoice operations", service: "Service desk", onboarding: "Employee onboarding", inventory: "Inventory operations" }[workflowId], owner: "Accounts payable owner", scope: "Scope", trigger: workflowId === "inventory" ? "Schedule" : "Event",
		status: "active", version: 1, origin: "discovery", brief: "", mapping: "approved-v1", checked: true, checking: false, automaticPayroll: false, supportRequested: false,
		connection: "ready", repaired: false, messages: [], draft: "", holdNotifications: false, nextOccurrence: "2026-09-14T05:00:00Z", notes: ["Seed note"], caseDrafts: {}, ...extra,
	})
	const run = (agentId: string, reference: string, phase: string, extra: Record<string, unknown> = {}) => ({
		id: `${agentId}:${reference}`, agentId, reference, title: `${reference} title`, phase, step: phase === "verified" ? 5 : 2, trigger: "Event", occurrence: reference, started: Date.parse("2026-09-11T09:00:00Z"),
		needsApproval: false, approved: false, humanReference: "", writes: phase === "verified" ? 1 : 0, costCents: 12, held: false, priority: "Normal", verifyTicks: 0, recovered: false, notes: [], ...extra,
	})
	return {
		version: 3, selected: "eng-5d1c", newBrief: "", clock: Date.parse("2026-09-11T09:42:00Z"),
		agents: {
			service: agent("service", "service"),
			invoice: agent("invoice", "invoice", { messages: [{ id: "1757583720000-0-u", role: "user", text: "What needs my attention?" }, { id: "1757583720000-0-a", role: "agent", text: "INV-20841 needs your decision." }, { id: "1757583720000-1-u", role: "user", text: "Prioritize this case", runId: "invoice:INV-20841" }], draft: "Hold notifications", caseDrafts: { "invoice:INV-20841": "Explain the variance" } }),
			onboarding: agent("onboarding", "onboarding", { status: "draft", mapping: "", checked: false }),
			inventory: agent("inventory", "inventory"),
			"eng-5d1c": agent("eng-5d1c", "service", { name: "EMEA service desk", owner: "Dana Reyes", origin: "prompt", brief: "Triage EMEA incidents", scope: "Triage EMEA incidents" }),
		},
		runs: [
			run("invoice", "INV-20841", "approval", { needsApproval: true }),
			run("invoice", "INV-20838", "verified"),
			run("service", "INC-10482", "working", { step: 1 }),
			run("eng-5d1c", "INC-30000", "partial", { step: 4, writes: 1 }),
		],
	}
}

function memory(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial))
	const writes: string[] = []
	return { data, writes, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); data.set(key, value) } }
}

describe("saved state", () => {
	it("migrates version 3 once, keeping engagements, cases, conversations and drafts", () => {
		const store = memory({ [LEGACY_KEY]: JSON.stringify(legacyV3()), "maxion-discovery-autonomous-v9": "{\"keep\":true}" })
		const state = readState(store)
		expect(validState(state)).toBe(true)
		expect(state.engagements["eng-5d1c"]).toMatchObject({ name: "EMEA service desk", owner: "Dana Reyes", origin: { kind: "prompt" }, workflowId: "service" })
		// A default name follows the flagship's new name; the owner's own names are kept.
		expect(state.engagements.invoice.name).toBe("Revenue reconciliation")
		expect(state.engagements.onboarding.status).toBe("draft")
		expect(state.engagements.onboarding.proposal?.kind).toBe("new")
		const waiting = state.work.find(item => item.reference === "INV-20841")!
		expect(waiting.status).toBe("waiting")
		expect(state.decisions.find(decision => decision.workItemId === waiting.id)?.status).toBe("open")
		expect(state.work.find(item => item.reference === "INC-30000")?.status).toBe("partial")
		expect(state.messages.filter(message => message.engagementId === "invoice")).toHaveLength(3)
		expect(state.messages.find(message => message.text === "Prioritize this case")?.scope).toEqual({ kind: "work", id: "invoice:INV-20841" })
		expect(state.drafts).toMatchObject({ "eng:invoice": "Hold notifications", "work:invoice:INV-20841": "Explain the variance" })
		expect(state.nav.engagementId).toBe("eng-5d1c")
		// Reading never writes; Discovery and the version-3 record are untouched.
		expect(store.writes).toEqual([])
		expect(store.data.get(LEGACY_KEY)).toBe(JSON.stringify(legacyV3()))
		expect(store.data.get("maxion-discovery-autonomous-v9")).toBe("{\"keep\":true}")
	})

	it("saves only its own key", () => {
		const store = memory({ [LEGACY_KEY]: JSON.stringify(legacyV3()) })
		writeState(readState(store), store)
		expect(store.writes).toEqual([STORAGE_KEY])
		expect(store.data.get(LEGACY_KEY)).toBe(JSON.stringify(legacyV3()))
	})

	it("round-trips a state taken through the flagship journey", () => {
		let state = receivePackage(initialState(), "pkg_revenue_v2", "discovery")
		state = answerQuestion(answerQuestion(state, "invoice", "release", "approval"), "invoice", "testdata", "synthetic")
		state = activate(state, "invoice")
		for (let i = 0; i < 25; i++) state = tick(state)
		const store = memory()
		writeState(state, store)
		const read = readState(store)
		expect(read.work).toEqual(state.work)
		expect(read.artifacts).toEqual(state.artifacts)
		expect(read.releases).toEqual(state.releases)
	})

	it("falls back to a fresh demo on malformed version 4 without re-migrating or clearing anything", () => {
		const store = memory({ [STORAGE_KEY]: JSON.stringify({ version: 4, clock: "soon" }), [LEGACY_KEY]: JSON.stringify(legacyV3()) })
		const state = readState(store)
		expect(state.engagements["eng-5d1c"]).toBeUndefined()
		expect(Object.keys(state.engagements)).toHaveLength(4)
		expect(store.writes).toEqual([])
		expect(readState(memory({ [STORAGE_KEY]: "{not json" })).version).toBe(4)
	})

	it("rejects oversized or inconsistent records", () => {
		const state = initialState()
		expect(validState({ ...state, work: [...state.work, state.work[0]] })).toBe(false)
		expect(validState({ ...state, drafts: { "eng:invoice": "x".repeat(2001) } })).toBe(false)
		expect(validState({ ...state, engagements: { ...state.engagements, "../evil": state.engagements.service } })).toBe(false)
		expect(validState({ ...state, work: state.work.map((item, index) => index === 0 ? { ...item, effects: [{ id: "x", system: "ERP", operation: "write", sends: 2, status: "applied" }] } : item) })).toBe(false)
	})
})
