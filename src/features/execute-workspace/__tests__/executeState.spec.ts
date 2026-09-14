import { describe, expect, it } from "vitest"

import type { PlanArtifactRef } from "@/features/platform-prototype/contracts"

import { createInitialExecuteSlice, executeReducer, executeStateCodec, selectActiveExecution, selectExecutionEvents, type ExecuteSlice, type ExecutionCommand } from "../executeState"

const planRef: PlanArtifactRef = {
	version: 1,
	id: "plan-erp-approved-v1",
	artifactId: "plan-erp",
	artifactVersion: 1,
	projectId: "erp-modernization",
	projectName: "ERP modernization",
	discoveryPackageId: "discovery-erp-v1",
	approvedAt: "2026-09-14T12:00:00.000Z",
	approvedByRole: "owner",
	sourceIds: ["evidence-1"],
	unresolvedGapIds: [],
	authority: { boundedTo: "execute-input" },
	contentDigest: "fnv1a-12345678",
}

function withRun(role: "owner" | "member" | "viewer" = "owner") {
	return executeReducer(createInitialExecuteSlice(), { type: "plan/ingested", planRef, actorRole: role })
}

function meta(state: ExecuteSlice, action: string, role: "owner" | "member" | "viewer" = "owner") {
	const run = selectActiveExecution(state)!
	return { actorRole: role, expectedRevision: run.revision, idempotencyKey: `key-${action}`, correlationId: `correlation-${action}` }
}

function advance(state: ExecuteSlice, index: number) {
	const run = selectActiveExecution(state)!
	const command: ExecutionCommand = { type: "run/advanced", operationId: `${run.id}:${run.activeStageId}:${run.revision}`, ...meta(state, `advance-${index}`, run.role) }
	return executeReducer(state, command)
}

describe("Execute state", () => {
	it("accepts only an approved, sourced Plan input", () => {
		const invalid = { ...planRef, unresolvedGapIds: ["gap-1"] }
		expect(executeReducer(createInitialExecuteSlice(), { type: "plan/ingested", planRef: invalid, actorRole: "owner" }).runs).toEqual([])
		expect(selectActiveExecution(withRun())?.planRef).toEqual(planRef)
	})

	it("enforces persisted project role and stale-command rejection", () => {
		let state = withRun("viewer")
		state = executeReducer(state, { type: "run/started", ...meta(state, "viewer-start", "owner") })
		expect(selectActiveExecution(state)?.status).toBe("idle")
		expect(selectActiveExecution(state)?.notice).toMatch(/read-only/i)

		state = withRun("owner")
		state = executeReducer(state, { type: "run/started", ...meta(state, "start") })
		const started = selectActiveExecution(state)!
		state = executeReducer(state, { type: "run/paused", actorRole: "owner", expectedRevision: 1, idempotencyKey: "stale", correlationId: "stale" })
		expect(selectActiveExecution(state)?.status).toBe("running")
		expect(selectActiveExecution(state)?.notice).toMatch(/revision 1/i)
		expect(started.revision).toBe(2)
	})

	it("pauses, resumes, steers, fails, retries, and rolls back without external claims", () => {
		let state = withRun()
		state = executeReducer(state, { type: "run/started", ...meta(state, "start") })
		state = executeReducer(state, { type: "run/paused", ...meta(state, "pause") })
		expect(selectActiveExecution(state)?.status).toBe("paused")
		state = executeReducer(state, { type: "run/steered", text: " Preserve the API contract. ", ...meta(state, "steer") })
		expect(selectActiveExecution(state)?.events.at(-1)?.label).toContain("Preserve the API contract")
		state = executeReducer(state, { type: "run/resumed", ...meta(state, "resume") })
		state = executeReducer(state, { type: "run/failed", ...meta(state, "fail") })
		expect(selectActiveExecution(state)?.status).toBe("failed")
		state = executeReducer(state, { type: "run/retried", ...meta(state, "retry") })
		expect(selectActiveExecution(state)?.status).toBe("running")
		state = executeReducer(state, { type: "run/failed", ...meta(state, "fail-again") })
		state = executeReducer(state, { type: "run/rolled-back", ...meta(state, "rollback") })
		const run = selectActiveExecution(state)!
		expect(run.status).toBe("rolled-back")
		expect(run.events.at(-1)).toMatchObject({ environment: "local-simulation", evidenceClass: "simulated" })
		expect(run.events.at(-1)?.label).toMatch(/no external environment changed/i)
	})

	it("ignores delayed stage completions and emits an explicitly simulated result", () => {
		let state = withRun()
		state = executeReducer(state, { type: "run/started", ...meta(state, "start") })
		const running = selectActiveExecution(state)!
		state = executeReducer(state, { type: "run/advanced", operationId: `${running.id}:wrong-stage:${running.revision}`, ...meta(state, "wrong") })
		expect(selectActiveExecution(state)?.stages[0].status).toBe("running")
		for (let index = 0; index < 5; index += 1) state = advance(state, index)
		expect(selectActiveExecution(state)?.status).toBe("approval-held")
		state = executeReducer(state, { type: "run/approved", ...meta(state, "approve") })
		expect(selectActiveExecution(state)).toMatchObject({ status: "completed", resultRef: { environment: "local-simulation", evidenceClass: "simulated", planArtifactId: planRef.artifactId } })
	})

	it("bounds 10,000 persisted events to 200 mounted rows", () => {
		const state = withRun()
		const run = selectActiveExecution(state)!
		run.events = Array.from({ length: 10_000 }, (_, index) => ({ id: `event-${index}`, type: "stage.observed", label: `Event ${index}`, stageId: "contract", createdAt: "2026-09-14T12:00:00.000Z", correlationId: `correlation-${index}`, environment: "local-simulation" as const, evidenceClass: "simulated" as const }))
		const started = performance.now()
		const selection = selectExecutionEvents(run)
		expect(selection).toMatchObject({ total: 10_000, mounted: 200, omitted: 9_800 })
		expect(performance.now() - started).toBeLessThan(100)
		const parsed = executeStateCodec.parse(JSON.parse(JSON.stringify(state)))!
		expect(selectActiveExecution(parsed)?.events).toHaveLength(10_000)
	})
})
