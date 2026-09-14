import { describe, expect, it } from "vitest"

import { INITIAL_PROJECTS } from "../model"
import {
	createInitialPlatformState,
	persistedPlatformStateCodec,
	platformReducer,
	selectActiveModule,
	selectAgentixAttention,
	selectPersistedPlatformState,
} from "../platformState"

const planArtifactRef = {
	version: 1 as const,
	id: "plan-project-1-approved-v1",
	artifactId: "plan-project-1",
	artifactVersion: 1,
	projectId: INITIAL_PROJECTS[0].id,
	projectName: INITIAL_PROJECTS[0].name,
	discoveryPackageId: "discovery-project-1-v1",
	approvedAt: "2026-09-14T12:00:00.000Z",
	approvedByRole: "owner" as const,
	sourceIds: ["source-1"],
	unresolvedGapIds: [],
	authority: { boundedTo: "execute-input" as const },
	contentDigest: "fnv1a-deadbeef",
}

describe("platform state kernel", () => {
	it("owns navigation and emits monotonically increasing one-shot handoffs", () => {
		let state = createInitialPlatformState("dashboard")
		state = platformReducer(state, { type: "navigation/opened", module: "plan" })
		state = platformReducer(state, { type: "plan/artifact-opened", artifactId: "PL-24.7" })
		const firstTick = state.intents.planJump?.tick
		state = platformReducer(state, { type: "agentix/opened", intent: { type: "decision", id: "approval" } })
		expect(selectActiveModule(state)).toBe("plan")
		expect(state.navigation.visited).toEqual(new Set(["dashboard", "plan"]))
		expect(state.intents.agentixIntent?.tick).toBe((firstTick ?? 0) + 1)
	})

	it("does not rerender provider consumers for identical derived attention", () => {
		const state = createInitialPlatformState("dashboard")
		const unchanged = platformReducer(state, { type: "agentix/attention-changed", attention: selectAgentixAttention(state) })
		expect(unchanged).toBe(state)
	})

	it("persists bounded synthetic state and rejects hostile project payloads", () => {
		let state = createInitialPlatformState("dashboard")
		state = { ...state, projects: { ...state.projects, records: Array.from({ length: 120 }, (_, index) => ({ ...INITIAL_PROJECTS[0], id: `project-${index}` })) } }
		state = platformReducer(state, { type: "plan/approved", artifactRef: planArtifactRef })
		state = platformReducer(state, { type: "execute/verified" })
		const persisted = selectPersistedPlatformState(state)
		expect(persisted.projects).toHaveLength(120)
		expect(persistedPlatformStateCodec.parse(persisted)).toEqual(persisted)
		expect(persistedPlatformStateCodec.parse({ ...persisted, projects: [{ ...INITIAL_PROJECTS[0], name: "x".repeat(161) }] })).toBeNull()
		expect(persistedPlatformStateCodec.parse({ ...persisted, executeVerified: "yes" })).toBeNull()
	})
})
