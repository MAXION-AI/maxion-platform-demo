import { beforeEach, describe, expect, it } from "vitest"

import type { PortalProject } from "../contracts"
import { INITIAL_PROJECTS } from "../model"
import { createDemoStateRepository } from "../persistence/DemoStateRepository"
import {
	PLATFORM_STATE_MAX_BYTES,
	PLATFORM_STATE_SLICE,
	createInitialPlatformState,
	persistedPlatformStateCodec,
	platformReducer,
	selectDashboardSummary,
	selectPersistedPlatformState,
	selectProjectPortfolio,
} from "../platformState"

function project(index: number): PortalProject {
	return {
		...INITIAL_PROJECTS[0],
		id: `project-${index}`,
		name: `Project ${String(index).padStart(5, "0")}`,
		description: index % 2 ? "Finance transformation" : "Customer operations",
		role: index % 13 === 0 ? "Viewer" : "Owner",
		discovery: index % 5 === 0 ? undefined : `Discovery ${index}`,
		plan: index % 7 === 0 ? undefined : `Plan ${index}`,
	}
}

describe("Phase 2 project authority", () => {
	beforeEach(() => localStorage.clear())

	it("filters 10,000 logical projects under 100 ms and mounts at most 200 rows", () => {
		const projects = Array.from({ length: 10_000 }, (_, index) => project(index))
		selectProjectPortfolio(projects, { query: "project", filter: "active", sort: "updated" })
		const durations = Array.from({ length: 5 }, () => {
			const started = performance.now()
			const result = selectProjectPortfolio(projects, { query: "finance", filter: "active", sort: "updated" })
			expect(result.mounted).toBe(200)
			expect(result.total).toBe(5_000)
			expect(result.omitted).toBe(4_800)
			return performance.now() - started
		}).sort((left, right) => left - right)
		expect(durations[4]).toBeLessThan(100)
	})

	it("isolates duplicate and malformed inputs before they reach the mounted list", () => {
		const valid = project(1)
		const duplicate = { ...valid, name: "Duplicate" }
		const malformed = { ...project(2), name: " ", role: "Administrator" } as unknown as PortalProject
		const result = selectProjectPortfolio([valid, duplicate, malformed], { query: "", filter: "all", sort: "updated" })
		expect(result.items).toEqual([valid])
		expect(result.total).toBe(1)
	})

	it("creates once, updates Dashboard from the same authority, and persists the selected project", () => {
		let state = createInitialPlatformState("projects")
		const before = selectDashboardSummary(state).activeProjects
		state = platformReducer(state, { type: "projects/created", requestId: "request-42", name: "  Finance controls uplift  ", description: "  Close-control redesign  " })
		expect(selectDashboardSummary(state).activeProjects).toBe(before + 1)
		expect(state.projects.records[0]).toMatchObject({ name: "Finance controls uplift", description: "Close-control redesign" })
		expect(state.projects.selectedId).toBe(state.projects.records[0].id)

		const afterDuplicate = platformReducer(state, { type: "projects/created", requestId: "request-42", name: "Finance controls uplift", description: "Close-control redesign" })
		expect(afterDuplicate.projects.records).toHaveLength(state.projects.records.length)
		expect(afterDuplicate.projects.notice).toMatch(/already applied/i)

		const persisted = selectPersistedPlatformState(state)
		expect(persistedPlatformStateCodec.parse(persisted)).toEqual(persisted)
		const restored = createInitialPlatformState("dashboard", persisted)
		expect(restored.projects.selectedId).toBe(state.projects.selectedId)
	})

	it("round-trips 10,000 projects through the production repository budget and rejects project 10,001", () => {
		let state = createInitialPlatformState("projects")
		state = { ...state, projects: { ...state.projects, records: Array.from({ length: 9_999 }, (_, index) => project(index)) } }
		state = platformReducer(state, { type: "projects/created", requestId: "capacity-project", name: "Capacity project", description: "The final supported project." })
		expect(state.projects.records).toHaveLength(10_000)

		const persisted = selectPersistedPlatformState(state)
		expect(persisted.projects).toHaveLength(10_000)
		const repository = createDemoStateRepository("maxion-demo", localStorage)
		expect(repository.save(PLATFORM_STATE_SLICE, persisted, PLATFORM_STATE_MAX_BYTES)).toEqual({ ok: true })
		const loaded = repository.load(PLATFORM_STATE_SLICE, persistedPlatformStateCodec, () => persisted, PLATFORM_STATE_MAX_BYTES)
		expect(loaded.status).toBe("loaded")
		expect(loaded.value.projects).toHaveLength(10_000)
		expect(createInitialPlatformState("dashboard", loaded.value).projects.selectedId).toBe(state.projects.selectedId)

		const atCapacity = state.projects.records
		state = platformReducer(state, { type: "projects/created", requestId: "over-capacity", name: "One too many", description: "Must be rejected explicitly." })
		expect(state.projects.records).toBe(atCapacity)
		expect(state.projects.records).toHaveLength(10_000)
		expect(state.projects.notice).toMatch(/maximum of 10,000 projects/i)
		expect(persistedPlatformStateCodec.parse({ ...persisted, projects: [...persisted.projects, project(10_001)] })).toBeNull()
	})

	it("rejects malformed mutations, explains permission denial, and recovers load errors", () => {
		let state = createInitialPlatformState("projects")
		const originalCount = state.projects.records.length
		state = platformReducer(state, { type: "projects/created", requestId: "", name: " ", description: "x" })
		expect(state.projects.records).toHaveLength(originalCount)
		expect(state.projects.notice).toMatch(/names must/i)

		const viewer = state.projects.records.find((item) => item.role === "Viewer")!
		state = platformReducer(state, { type: "projects/action-denied", projectId: viewer.id, action: "Resuming work" })
		expect(state.projects.notice).toMatch(/Viewer access/)

		state = platformReducer(state, { type: "projects/load-failed", message: "The local snapshot could not be decoded." })
		expect(state.projects).toMatchObject({ status: "error", error: "The local snapshot could not be decoded." })
		state = platformReducer(state, { type: "projects/retry-requested" })
		expect(state.projects).toMatchObject({ status: "ready", error: null })

		const empty = selectProjectPortfolio([], { query: "", filter: "all", sort: "updated" })
		expect(empty).toEqual({ items: [], total: 0, mounted: 0, omitted: 0 })
	})
})
