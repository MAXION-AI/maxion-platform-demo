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
		state = platformReducer(state, { type: "projects/replaced", projects: Array.from({ length: 120 }, (_, index) => ({ ...INITIAL_PROJECTS[0], id: `project-${index}` })) })
		state = platformReducer(state, { type: "plan/sent", snapshot: "v13" })
		state = platformReducer(state, { type: "execute/verified" })
		const persisted = selectPersistedPlatformState(state)
		expect(persisted.projects).toHaveLength(100)
		expect(persistedPlatformStateCodec.parse(persisted)).toEqual(persisted)
		expect(persistedPlatformStateCodec.parse({ ...persisted, projects: [{ ...INITIAL_PROJECTS[0], name: "x".repeat(161) }] })).toBeNull()
		expect(persistedPlatformStateCodec.parse({ ...persisted, executeVerified: "yes" })).toBeNull()
	})
})
