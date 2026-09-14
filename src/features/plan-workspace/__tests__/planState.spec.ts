import { describe, expect, it } from "vitest"

import type { DiscoveryPackageRef } from "@/features/platform-prototype/contracts"

import {
	createInitialPlanSlice,
	planReducer,
	planStateCodec,
	selectPlanArtifact,
	selectPlanReadiness,
	selectPlanRevision,
	selectPlanSections,
	type PlanCommand,
} from "../planState"

const discoveryPackage: DiscoveryPackageRef = {
	version: 1,
	id: "discovery-erp-v1",
	projectId: "erp-modernization",
	projectName: "ERP modernization",
	discoveryId: "discovery-erp",
	createdAt: "2026-09-14T12:00:00.000Z",
	provenance: [{ evidenceId: "evidence-1", source: "Owner interview", locator: "turn-4", evidenceClass: "operator-statement" }],
	unresolvedGapIds: [],
	authority: { level: "project-owner", boundedTo: "planning-input" },
	evidenceClasses: ["operator-statement"],
}

function stateWithPlan(packageRef = discoveryPackage) {
	return planReducer(createInitialPlanSlice(), { type: "discovery/ingested", packageRef, actorRole: "owner" })
}

function commandMeta(action: string) {
	return { idempotencyKey: `test-${action}`, correlationId: `correlation-${action}` }
}

describe("Plan state", () => {
	it("ingests Discovery provenance and blocks approval until material gaps close", () => {
		const packageWithGap = { ...discoveryPackage, unresolvedGapIds: ["gap-owner"] }
		let state = stateWithPlan(packageWithGap)
		let artifact = selectPlanArtifact(state, packageWithGap.projectId)!
		expect(artifact.sources[0]).toMatchObject({ id: "evidence-1", evidenceClass: "operator-statement" })
		expect(selectPlanReadiness(artifact)).toMatchObject({ ready: false })
		state = planReducer(state, { type: "gap/resolved", projectId: artifact.projectId, gapId: "gap-owner", sourceId: "evidence-1", actorRole: "owner", ...commandMeta("gap") })
		artifact = selectPlanArtifact(state, packageWithGap.projectId)!
		expect(selectPlanReadiness(artifact)).toEqual({ ready: true, reasons: [] })
		expect(artifact.gapResolutions).toEqual({ "gap-owner": "evidence-1" })
	})

	it("replaces stale project input and refuses unverified synthetic evidence", () => {
		let state = stateWithPlan()
		const replacement = { ...discoveryPackage, id: "discovery-erp-v2", provenance: discoveryPackage.provenance.map((source) => ({ ...source, evidenceClass: "synthetic-demo" as const })), evidenceClasses: ["synthetic-demo" as const] }
		state = planReducer(state, { type: "discovery/ingested", packageRef: replacement, actorRole: "owner" })
		expect(state.artifacts).toHaveLength(1)
		const artifact = selectPlanArtifact(state, replacement.projectId)!
		expect(artifact.discoveryPackageId).toBe(replacement.id)
		expect(selectPlanReadiness(artifact)).toMatchObject({ ready: false, reasons: expect.arrayContaining(["Every section needs a valid evidence source."]) })
	})

	it("denies Viewer mutation in the reducer", () => {
		let state = stateWithPlan()
		state = planReducer(state, { type: "section/edit-started", projectId: discoveryPackage.projectId, sectionId: "workstreams", actorRole: "viewer" })
		const artifact = selectPlanArtifact(state, discoveryPackage.projectId)!
		expect(artifact.drafts).toEqual({})
		expect(artifact.notice).toMatch(/read-only/i)
	})

	it("persists project authority and prevents Viewer ingestion or draft cancellation", () => {
		let state = stateWithPlan()
		state = planReducer(state, { type: "section/edit-started", projectId: discoveryPackage.projectId, sectionId: "workstreams", actorRole: "owner" })
		state = planReducer(state, { type: "section/draft-changed", projectId: discoveryPackage.projectId, sectionId: "workstreams", value: "Owner draft", actorRole: "owner" })
		state = planReducer(state, { type: "discovery/ingested", packageRef: discoveryPackage, actorRole: "viewer" })
		state = planReducer(state, { type: "section/edit-cancelled", projectId: discoveryPackage.projectId, sectionId: "workstreams", actorRole: "viewer" })
		expect(selectPlanArtifact(state, discoveryPackage.projectId)!.drafts.workstreams).toBe("Owner draft")

		const replacement = { ...discoveryPackage, id: "viewer-package" }
		state = planReducer(state, { type: "discovery/ingested", packageRef: replacement, actorRole: "viewer" })
		expect(selectPlanArtifact(state, discoveryPackage.projectId)!.discoveryPackageId).toBe(discoveryPackage.id)
	})

	it("keeps an evidence gap open when the supplied source is unverified", () => {
		const packageWithGap = { ...discoveryPackage, unresolvedGapIds: ["gap-owner"] }
		let state = stateWithPlan(packageWithGap)
		state = planReducer(state, { type: "gap/resolved", projectId: packageWithGap.projectId, gapId: "gap-owner", sourceId: "missing-source", actorRole: "owner", ...commandMeta("bad-gap") })
		const artifact = selectPlanArtifact(state, packageWithGap.projectId)!
		expect(artifact.unresolvedGapIds).toEqual(["gap-owner"])
		expect(artifact.notice).toMatch(/verified source/i)
	})

	it("approves an immutable version and forks a new draft on the next edit", () => {
		let state = stateWithPlan()
		state = planReducer(state, { type: "artifact/approved", projectId: discoveryPackage.projectId, baseVersion: 1, actorRole: "owner", ...commandMeta("approve") })
		let artifact = selectPlanArtifact(state, discoveryPackage.projectId)!
		expect(artifact.artifactRef).toMatchObject({ artifactVersion: 1, projectId: discoveryPackage.projectId, approvedByRole: "owner" })
		const approvedBody = selectPlanRevision(artifact, 1)!.sections.find((section) => section.id === "workstreams")!.body

		state = planReducer(state, { type: "section/edit-started", projectId: artifact.projectId, sectionId: "workstreams", actorRole: "owner" })
		state = planReducer(state, { type: "section/draft-changed", projectId: artifact.projectId, sectionId: "workstreams", value: "A newly bounded workstream.", actorRole: "owner" })
		state = planReducer(state, { type: "section/saved", projectId: artifact.projectId, sectionId: "workstreams", baseVersion: 1, actorRole: "owner", ...commandMeta("save") })
		artifact = selectPlanArtifact(state, discoveryPackage.projectId)!
		expect(artifact.currentVersion).toBe(2)
		expect(artifact.artifactRef).toBeNull()
		expect(selectPlanRevision(artifact, 1)!.status).toBe("approved")
		expect(selectPlanRevision(artifact, 1)!.sections.find((section) => section.id === "workstreams")!.body).toBe(approvedBody)
		expect(selectPlanRevision(artifact, 2)!.sections.find((section) => section.id === "workstreams")!.body).toBe("A newly bounded workstream.")
	})

	it("deduplicates commands and rejects stale writes without losing the draft", () => {
		let state = stateWithPlan()
		const artifact = selectPlanArtifact(state, discoveryPackage.projectId)!
		state = planReducer(state, { type: "comment/added", projectId: artifact.projectId, sectionId: "workstreams", body: "Keep rollback explicit.", actorRole: "owner", ...commandMeta("comment") })
		state = planReducer(state, { type: "comment/added", projectId: artifact.projectId, sectionId: "workstreams", body: "Duplicate", actorRole: "owner", ...commandMeta("comment") })
		expect(selectPlanArtifact(state, artifact.projectId)!.comments).toHaveLength(1)
		state = planReducer(state, { type: "section/edit-started", projectId: artifact.projectId, sectionId: "workstreams", actorRole: "owner" })
		state = planReducer(state, { type: "section/draft-changed", projectId: artifact.projectId, sectionId: "workstreams", value: "Preserve me", actorRole: "owner" })
		state = planReducer(state, { type: "section/saved", projectId: artifact.projectId, sectionId: "workstreams", baseVersion: 99, actorRole: "owner", ...commandMeta("stale") })
		expect(selectPlanArtifact(state, artifact.projectId)!.drafts.workstreams).toBe("Preserve me")
		expect(selectPlanArtifact(state, artifact.projectId)!.notice).toMatch(/version 99/i)
	})

	it("preserves content and draft when regeneration fails", () => {
		let state = stateWithPlan()
		const artifact = selectPlanArtifact(state, discoveryPackage.projectId)!
		const originalBody = selectPlanRevision(artifact)!.sections[1].body
		const operationId = "test-regen"
		const start: PlanCommand = { type: "section/regeneration-started", projectId: artifact.projectId, sectionId: "workstreams", baseVersion: 1, operationId, actorRole: "owner", ...commandMeta("regen") }
		state = planReducer(state, start)
		state = planReducer(state, { type: "section/regeneration-failed", projectId: artifact.projectId, sectionId: "workstreams", baseVersion: 1, operationId, message: "Provider timed out", actorRole: "owner" })
		const section = selectPlanRevision(selectPlanArtifact(state, artifact.projectId)!)!.sections[1]
		expect(section.body).toBe(originalBody)
		expect(section.generation).toMatchObject({ status: "failed", error: "Provider timed out" })
	})

	it("ignores a delayed regeneration response from an older operation", () => {
		let state = stateWithPlan()
		const projectId = discoveryPackage.projectId
		state = planReducer(state, { type: "section/regeneration-started", projectId, sectionId: "workstreams", baseVersion: 1, operationId: "operation-1", actorRole: "owner", ...commandMeta("regen-1") })
		state = planReducer(state, { type: "section/regeneration-started", projectId, sectionId: "workstreams", baseVersion: 1, operationId: "operation-2", actorRole: "owner", ...commandMeta("regen-2") })
		state = planReducer(state, { type: "section/regeneration-proposed", projectId, sectionId: "workstreams", baseVersion: 1, operationId: "operation-1", body: "Stale output", actorRole: "owner" })
		let generation = selectPlanRevision(selectPlanArtifact(state, projectId)!)!.sections[1].generation
		expect(generation).toMatchObject({ status: "running", operationId: "operation-2", proposedBody: null })
		state = planReducer(state, { type: "section/regeneration-proposed", projectId, sectionId: "workstreams", baseVersion: 1, operationId: "operation-2", body: "Current output", actorRole: "owner" })
		generation = selectPlanRevision(selectPlanArtifact(state, projectId)!)!.sections[1].generation
		expect(generation).toMatchObject({ status: "proposed", operationId: "operation-2", proposedBody: "Current output" })
	})

	it("quarantines one invalid nested row while preserving valid rows and an approved reference", () => {
		let state = stateWithPlan()
		state = planReducer(state, { type: "artifact/approved", projectId: discoveryPackage.projectId, baseVersion: 1, actorRole: "owner", ...commandMeta("approved-reload") })
		const persisted = JSON.parse(JSON.stringify(state))
		persisted.artifacts[0].revisions[0].sections[1].body = 42
		const parsed = planStateCodec.parse(persisted)!
		const artifact = selectPlanArtifact(parsed, discoveryPackage.projectId)!
		expect(selectPlanRevision(artifact)!.sections).toHaveLength(5)
		expect(artifact.artifactRef).toMatchObject({ artifactVersion: 1 })
		expect(parsed.quarantine).toContainEqual(expect.objectContaining({ reason: "invalid-section" }))
	})

	it("bounds a 1,000-section plan to 200 mounted rows under the local budget", () => {
		const state = stateWithPlan()
		const artifact = selectPlanArtifact(state, discoveryPackage.projectId)!
		const revision = selectPlanRevision(artifact)!
		revision.sections = Array.from({ length: 1_000 }, (_, index) => ({ ...revision.sections[0], id: `section-${index}`, title: `Section ${index}`, body: `Bounded content ${index}` }))
		const started = performance.now()
		const result = selectPlanSections(artifact)
		const elapsed = performance.now() - started
		expect(result).toMatchObject({ total: 1_000, mounted: 200, omitted: 800 })
		expect(elapsed).toBeLessThan(100)
	})
})
