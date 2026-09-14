import { describe, expect, it } from "vitest"

import {
	createInitialDiscoverySlice,
	discoveryStateCodec,
	discoveryReducer,
	selectActiveDiscoverySession,
	selectMountedTranscript,
	selectOpenDiscoveryGaps,
	selectPackageReady,
	type TranscriptEntry,
} from "../discoveryState"

function active(state: ReturnType<typeof createInitialDiscoverySlice>) {
	const session = selectActiveDiscoverySession(state)
	if (!session) throw new Error("Expected an active Discovery session")
	return session
}

describe("Discovery domain", () => {
	it("preserves the draft through provider loss, retry, pause, and resume", () => {
		let state = createInitialDiscoverySlice()
		state = discoveryReducer(state, { type: "draft/changed", value: "  Owner says <script>alert('x')</script>  " })
		state = discoveryReducer(state, { type: "provider/offline", message: "Timed out" })
		expect(active(state)).toMatchObject({ status: "offline", draft: "  Owner says <script>alert('x')</script>  ", provider: { status: "offline", lastError: "Timed out" } })

		state = discoveryReducer(state, { type: "provider/retry-started" })
		expect(active(state).provider).toMatchObject({ status: "retrying", attempt: 1 })
		state = discoveryReducer(state, { type: "provider/recovered" })
		state = discoveryReducer(state, { type: "session/paused" })
		state = discoveryReducer(state, { type: "session/resumed" })
		expect(active(state)).toMatchObject({ status: "active", draft: "  Owner says <script>alert('x')</script>  ", provider: { status: "online", lastError: null } })
	})

	it("creates one versioned Plan package only after answer and material-gap resolution", () => {
		let state = createInitialDiscoverySlice()
		expect(selectPackageReady(active(state))).toBe(false)
		state = discoveryReducer(state, { type: "interview/answered", answer: "The project owner approves planning inputs only.", now: "2026-09-14T13:00:00.000Z" })
		expect(selectPackageReady(active(state))).toBe(false)
		state = discoveryReducer(state, { type: "gap/resolved", gapId: active(state).gaps[0].id, now: "2026-09-14T13:01:00.000Z" })
		expect(selectOpenDiscoveryGaps(active(state))).toHaveLength(0)
		expect(selectPackageReady(active(state))).toBe(true)

		state = discoveryReducer(state, { type: "package/created", now: "2026-09-14T13:02:00.000Z" })
		expect(active(state).packageRef).toMatchObject({
			version: 1,
			projectId: "erp-modernization",
			discoveryId: active(state).id,
			authority: { level: "project-owner", boundedTo: "planning-input" },
			unresolvedGapIds: [],
		})
		expect(active(state).packageRef?.provenance.length).toBeGreaterThan(0)
		expect(active(state).packageRef?.evidenceClasses).toContain("connected-source")
	})

	it("quarantines invalid nested rows by field without discarding their session", () => {
		const valid = active(createInitialDiscoverySlice())
		const duplicateEntry = { ...valid.transcript[0] }
		const parsed = discoveryStateCodec.parse({ version: 2, activeSessionId: valid.id, sessions: [
			{
				...valid,
				interviewTurns: [...valid.interviewTurns, { nope: true }],
				transcript: [{ ...valid.transcript[0], sequence: 2 }, { ...valid.transcript[0], id: `${valid.id}:earlier`, sequence: 1 }, duplicateEntry, { ...valid.transcript[0], id: "oversized", text: "x".repeat(2_001) }],
				evidence: [...valid.evidence, { nope: true }],
				facts: [{ id: "fact-valid", statement: "Bound fact", evidenceIds: [], confidence: "supported" }, { nope: true }],
				decisions: [...valid.decisions, { nope: true }],
				gaps: [...valid.gaps, { nope: true }],
				audit: [...valid.audit, { nope: true }],
			},
		] })

		expect(parsed).not.toBeNull()
		expect(parsed?.sessions).toHaveLength(1)
		expect(parsed?.sessions[0].transcript.map((entry) => entry.sequence)).toEqual([1, 2])
		expect(parsed?.sessions[0].facts).toEqual([{ id: "fact-valid", statement: "Bound fact", evidenceIds: [], confidence: "supported" }])
		expect(parsed?.quarantine.map(({ field, index }) => ({ field, index }))).toEqual(expect.arrayContaining([
			{ field: "interviewTurns", index: 1 },
			{ field: "transcript", index: 2 },
			{ field: "transcript", index: 3 },
			{ field: "evidence", index: valid.evidence.length },
			{ field: "facts", index: 1 },
			{ field: "decisions", index: valid.decisions.length },
			{ field: "gaps", index: valid.gaps.length },
			{ field: "audit", index: valid.audit.length },
		]))
	})

	it("reloads a completed package and makes malformed nested state selector-safe", () => {
		let state = createInitialDiscoverySlice()
		state = discoveryReducer(state, { type: "interview/answered", answer: "The project owner approves planning inputs only." })
		state = discoveryReducer(state, { type: "gap/resolved", gapId: active(state).gaps[0].id })
		state = discoveryReducer(state, { type: "package/created", now: "2026-09-14T13:02:00.000Z" })
		const completed = active(state)
		const parsed = discoveryStateCodec.parse(JSON.parse(JSON.stringify(state)))

		expect(parsed).not.toBeNull()
		expect(active(parsed!)).toMatchObject({ status: "complete", packageRef: completed.packageRef })

		const malformed = discoveryStateCodec.parse({ ...state, sessions: [{ ...completed, interviewTurns: "bad", facts: [null], decisions: {}, gaps: [{ nope: true }], audit: "bad" }] })
		expect(malformed).not.toBeNull()
		expect(() => selectOpenDiscoveryGaps(active(malformed!))).not.toThrow()
		expect(selectMountedTranscript(active(malformed!)).items.length).toBeGreaterThan(0)
		expect(active(malformed!).packageRef).toEqual(completed.packageRef)
	})

	it("keeps manual offline notes provisional until provider recovery", () => {
		let state = createInitialDiscoverySlice()
		state = discoveryReducer(state, { type: "provider/offline", message: "Timed out" })
		state = discoveryReducer(state, { type: "provider/manual-continuation" })
		const before = active(state).transcript.length
		state = discoveryReducer(state, { type: "interview/answered", answer: "Manual note while offline." })

		expect(active(state)).toMatchObject({ status: "offline", provider: { status: "offline", manualContinuation: true } })
		expect(active(state).transcript).toHaveLength(before + 1)
		expect(active(state).transcript.at(-1)).toMatchObject({ actor: "operator", text: "Manual note while offline." })
		expect(active(state).transcript.filter((entry) => entry.actor === "max")).toHaveLength(1)
		state = discoveryReducer(state, { type: "provider/retry-started" })
		state = discoveryReducer(state, { type: "provider/recovered" })
		expect(active(state)).toMatchObject({ status: "active", provider: { status: "online", manualContinuation: false } })
	})

	it("enforces project-scoped open and viewer authorization in the reducer", () => {
		let state = createInitialDiscoverySlice()
		const erpSessionId = active(state).id
		state = discoveryReducer(state, { type: "project/selected", projectId: "viewer-project", permission: "owner" })
		state = discoveryReducer(state, { type: "session/started", brief: "Assess renewal risk", projectId: "viewer-project", projectName: "Viewer project", permission: "owner", now: "2026-09-14T14:00:00.000Z" })
		const viewerProjectSessionId = active(state).id

		state = discoveryReducer(state, { type: "project/selected", projectId: "erp-modernization", permission: "owner" })
		state = discoveryReducer(state, { type: "session/opened", sessionId: viewerProjectSessionId, projectId: "erp-modernization" })
		expect(active(state).id).toBe(erpSessionId)

		state = discoveryReducer(state, { type: "project/selected", projectId: "viewer-project", permission: "viewer" })
		expect(active(state)).toMatchObject({ id: viewerProjectSessionId, permission: "viewer", status: "read-only" })
		const sessionCount = state.sessions.length
		state = discoveryReducer(state, { type: "session/started", brief: "Forbidden", projectId: "viewer-project", projectName: "Viewer project", permission: "viewer" })
		state = discoveryReducer(state, { type: "draft/changed", value: "Forbidden edit" })
		expect(state.sessions).toHaveLength(sessionCount)
		expect(active(state)).toMatchObject({ permission: "viewer", draft: "" })
	})

	it("keeps a 10,000-entry transcript to 200 mounted rows with p95 selection below 100ms", () => {
		const session = active(createInitialDiscoverySlice())
		const transcript: TranscriptEntry[] = Array.from({ length: 10_000 }, (_, index) => ({ id: `entry-${index}`, actor: index % 2 ? "operator" : "max", text: `Entry ${index}`, sequence: 9_999 - index, createdAt: "2026-09-14T12:00:00.000Z", evidenceIds: [] }))
		const fixture = { ...session, transcript }
		const timings = Array.from({ length: 25 }, () => {
			const started = performance.now()
			const result = selectMountedTranscript(fixture)
			expect(result.items).toHaveLength(200)
			expect(result.omitted).toBe(9_800)
			return performance.now() - started
		}).sort((left, right) => left - right)
		const p95 = timings[Math.floor(timings.length * .95)]
		expect(p95).toBeLessThan(100)
	})
})
