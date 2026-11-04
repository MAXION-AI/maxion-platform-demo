import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"

import { MaxionPlatformPrototypePage } from "../MaxionPlatformPrototypePage"
import { discoveryInProject, engagementInProject, readScope, resetScope, selectProject, switchOrganization, linkEngagementToProject } from "../scope"

const renderShell = (path = "/maxion-prototype") => render(<MemoryRouter initialEntries={[path]}><MaxionPlatformPrototypePage /></MemoryRouter>)
const openSwitcher = () => fireEvent.click(screen.getByRole("button", { name: /^Working in / }))

afterEach(() => resetScope())

describe("organization and project scope", () => {
	it("says which organization and project the screen belongs to", () => {
		renderShell()
		expect(screen.getByRole("button", { name: "Working in Northstar Consulting, all projects. Change organization or project" })).toBeInTheDocument()
	})

	it("switches organization, clearing the project and showing none of the old organization's work", () => {
		selectProject("erp-modernization")
		renderShell()
		openSwitcher()
		fireEvent.click(within(screen.getByRole("group", { name: "Organization" })).getByRole("menuitemradio", { name: /Halden Logistics/ }))
		expect(readScope()).toMatchObject({ organizationId: "halden", projectId: null })
		expect(screen.getByRole("button", { name: /^Working in Halden Logistics, all projects/ })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: "Dashboard", level: 1 })).toBeInTheDocument()
		expect(screen.getAllByText("Warehouse network review").length).toBeGreaterThan(0)
		expect(screen.queryByText("ERP modernization")).toBeNull()
		// The units meter and the home organization's badges are not this person's to see here.
		expect(screen.queryByText("Workspace units")).toBeNull()
	})

	it("explains each restricted module, and leads back to the home organization", () => {
		renderShell()
		openSwitcher()
		fireEvent.click(screen.getByRole("menuitemradio", { name: /Halden Logistics/ }))
		fireEvent.click(screen.getByRole("button", { name: /^Agentix/ }))
		expect(screen.getByText("Agentix isn't in this organization's agreement")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Back to Northstar Consulting" }))
		expect(readScope().organizationId).toBe("northstar")
		expect(screen.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeInTheDocument()
	})

	it("picks a project from the same menu", () => {
		renderShell()
		openSwitcher()
		fireEvent.click(within(screen.getByRole("group", { name: "Project" })).getByRole("menuitemradio", { name: /ERP modernization/ }))
		expect(readScope().projectId).toBe("erp-modernization")
		expect(screen.getByRole("button", { name: /^Working in Northstar Consulting, ERP modernization/ })).toBeInTheDocument()
	})

	it("matches work to a project by its seed link or a later link", () => {
		switchOrganization("northstar")
		selectProject("erp-modernization")
		const state = readScope()
		expect(discoveryInProject(state, { id: "a", title: "Third-party onboarding control redesign" }, undefined)).toBe(true)
		expect(discoveryInProject(state, { id: "b", title: "Something else" }, undefined)).toBe(false)
		expect(engagementInProject(state, { id: "conversion", workflowId: "conversion" })).toBe(true)
		expect(engagementInProject(state, { id: "invoice", workflowId: "invoice" })).toBe(false)
		linkEngagementToProject("invoice", "erp-modernization")
		expect(engagementInProject(readScope(), { id: "invoice", workflowId: "invoice" })).toBe(true)
		selectProject(null)
		expect(engagementInProject(readScope(), { id: "invoice", workflowId: "invoice" })).toBe(true)
	})
})
