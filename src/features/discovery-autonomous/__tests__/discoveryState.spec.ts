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

	it("deduplicates persisted identities, orders entries, and quarantines only invalid sessions", () => {
		const valid = active(createInitialDiscoverySlice())
		const duplicateEntry = { ...valid.transcript[0] }
		const parsed = discoveryStateCodec.parse({ version: 2, activeSessionId: valid.id, sessions: [
			{ ...valid, transcript: [{ ...valid.transcript[0], sequence: 2 }, { ...valid.transcript[0], id: `${valid.id}:earlier`, sequence: 1 }, duplicateEntry] },
			{ ...valid, id: "bad-session", transcript: [{ ...valid.transcript[0], text: "x".repeat(2_001) }] },
		] })

		expect(parsed).not.toBeNull()
		expect(parsed?.sessions).toHaveLength(1)
		expect(parsed?.sessions[0].transcript.map((entry) => entry.sequence)).toEqual([1, 2])
		expect(parsed?.quarantine).toEqual([{ index: 1, reason: "Record failed schema, bounds, or provenance validation." }])
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
