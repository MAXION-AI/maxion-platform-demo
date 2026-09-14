import { initialOperations } from "@/features/agentix/prototype/operationsState"
import { describe, expect, it } from "vitest"

import { INITIAL_PROJECTS } from "../model"
import {
	buildUsageRecords,
	decideAdministrativeApproval,
	persistAdministrationState,
	readAdministrationState,
	savePreferences,
	saveUsageAlert,
	searchHelpResults,
	selectAdministrativeApprovals,
	selectProjectIntegrations,
	selectUsageWindow,
	updateIntegration,
	validatePreferences,
} from "../administrationState"

const project = INITIAL_PROJECTS[0]

describe("administration contracts", () => {
	it("normalizes a valid workspace name and preserves invalid or failed drafts", () => {
		const state = readAdministrationState()
		const draft = { ...state.preferences, workspaceName: "  Northwind   Operations  " }
		expect(validatePreferences(draft).value.workspaceName).toBe("Northwind Operations")
		expect(savePreferences(state, draft, "save-1", true)).toMatchObject({ state, result: "failed", validation: { value: { workspaceName: "Northwind Operations" } } })
		expect(savePreferences(state, { ...draft, workspaceName: " " }, "save-2")).toMatchObject({ state, result: "invalid", validation: { errors: { workspaceName: expect.any(String) } } })
		const saved = savePreferences(state, draft, "save-3")
		expect(saved.result).toBe("saved")
		expect(savePreferences(saved.state, draft, "save-3").state).toBe(saved.state)
	})

	it("keeps connection changes project scoped and idempotent", () => {
		const state = readAdministrationState()
		const slack = selectProjectIntegrations(state, project.id).find(item => item.id === "slack")!
		const wrongProject = updateIntegration(state, "customer-360", "Owner", slack.id, "disconnect", "disconnect-1")
		expect(selectProjectIntegrations(wrongProject, project.id).find(item => item.id === "slack")?.health).toBe("degraded")
		expect(updateIntegration(state, project.id, "Viewer", slack.id, "disconnect", "viewer-denied")).toBe(state)
		const disconnected = updateIntegration(state, project.id, "Owner", slack.id, "disconnect", "disconnect-2")
		expect(selectProjectIntegrations(disconnected, project.id).find(item => item.id === "slack")).toMatchObject({ health: "disconnected", principal: slack.principal, scopes: slack.scopes })
		expect(disconnected.auditReceipts.at(-1)).toContain(`Root Admin · disconnect slack · ${project.id}`)
		const reconnected = updateIntegration(disconnected, project.id, "Owner", slack.id, "reconnect", "reconnect-1")
		expect(selectProjectIntegrations(reconnected, project.id).find(item => item.id === "slack")).toMatchObject({ health: "healthy", principal: slack.principal, scopes: slack.scopes })
		expect(updateIntegration(disconnected, project.id, "Owner", slack.id, "disconnect", "disconnect-2")).toBe(disconnected)
	})

	it("maps Agentix approval authority and fails closed for stale or viewer decisions", () => {
		const owner = initialOperations(project.id, "owner")
		const approval = selectAdministrativeApprovals(owner, project)[0]
		expect(approval).toMatchObject({ object: "INV-20841", projectId: project.id, status: "pending" })
		expect(approval.evidence).toEqual(["2 of 5 workflow steps complete", "0 external writes dispatched", "No operator note attached"])
		const approved = decideAdministrativeApproval(owner, approval, "approve", "approval-1")
		expect(approved.runs.find(run => run.id === approval.runId)?.phase).not.toBe("approval")
		expect(decideAdministrativeApproval(approved, approval, "approve", "approval-1")).toBe(approved)

		const viewer = initialOperations(project.id, "viewer")
		expect(selectAdministrativeApprovals(viewer, { ...project, role: "Viewer" })).toEqual([])
		const denied = decideAdministrativeApproval(viewer, approval, "approve", "approval-viewer")
		expect(denied.notice).toMatch(/read-only|project owner/i)
		expect(denied.runs.find(run => run.id === approval.runId)?.phase).toBe("approval")

		const stale = { ...owner, agents: { ...owner.agents, invoice: { ...owner.agents.invoice, version: 2 } } }
		const staleApproval = selectAdministrativeApprovals(stale, project)[0]
		expect(staleApproval.status).toBe("stale")
		expect(decideAdministrativeApproval(stale, staleApproval, "reject", "approval-stale").notice).toMatch(/older deployment version/i)
	})

	it("persists a validated usage alert and rejects invalid thresholds", () => {
		const state = readAdministrationState()
		expect(saveUsageAlert(state, 0, "usage-invalid")).toMatchObject({ state, result: "invalid" })
		const saved = saveUsageAlert(state, 72, "usage-save")
		expect(saved).toMatchObject({ result: "saved", state: { usageAlertThreshold: 72 } })
		expect(saved.state.auditReceipts.at(-1)).toContain("Root Admin · alert 72%")
		expect(persistAdministrationState(saved.state)).toBe(true)
		expect(readAdministrationState().usageAlertThreshold).toBe(72)
		expect(saveUsageAlert(saved.state, 75, "usage-save")).toMatchObject({ state: saved.state, result: "duplicate" })
	})

	it("caps a 10,000-row usage source to a 100-row mounted window", () => {
		const records = buildUsageRecords(project.id, 50_000)
		expect(records).toHaveLength(10_000)
		const page = selectUsageWindow(records, project.id, 9_975, 1_000)
		expect(page).toMatchObject({ total: 10_000, offset: 9_975, mounted: 25 })
		expect(page.records).toHaveLength(25)
		expect(selectUsageWindow(records, "customer-360").records).toHaveLength(0)
	})

	it("ranks contextual help and preserves natural task phrasing", () => {
		expect(searchHelpResults("  reconnect my Slack integration  ")[0]).toMatchObject({ id: "integration", module: "integrations" })
		expect(searchHelpResults("usage")[0]).toMatchObject({ id: "usage", module: "usage" })
		expect(searchHelpResults("unrelated request")).toEqual([])
		expect(searchHelpResults("", "usage")[0].id).toBe("usage")
	})
})
