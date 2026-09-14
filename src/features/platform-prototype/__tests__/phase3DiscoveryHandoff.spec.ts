import { describe, expect, it } from "vitest"

import type { DiscoveryPackageRef } from "../contracts"
import { createInitialPlatformState, platformReducer, selectDiscoveryPackage, selectPersistedPlatformState } from "../platformState"

const packageRef: DiscoveryPackageRef = {
	version: 1,
	id: "discovery-a:package:v1",
	projectId: "project-a",
	projectName: "Project A",
	discoveryId: "discovery-a",
	createdAt: "2026-09-14T12:00:00.000Z",
	provenance: [{ evidenceId: "evidence-a", source: "Policy library", locator: "Controls / v4" }],
	unresolvedGapIds: [],
	authority: { level: "project-owner", boundedTo: "planning-input" },
	evidenceClasses: ["connected-source"],
}

describe("Phase 3 Discovery handoff", () => {
	it("binds the canonical package into shared platform state and persistence", () => {
		const state = platformReducer(createInitialPlatformState("discovery"), { type: "discovery/package-ready", packageRef })
		expect(selectDiscoveryPackage(state)).toEqual(packageRef)
		expect(state.handoffs.discovery).toMatchObject({ ready: true, progress: { completed: 1, total: 1, status: "verified" } })
		expect(selectPersistedPlatformState(state).discoveryPackage).toEqual(packageRef)
	})
})
