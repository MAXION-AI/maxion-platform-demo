import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEMO_TICK_MS, initialOperations, persistOperations } from "@/features/agentix/prototype/operationsState"
import { MaxionPlatformPrototypePage } from "../MaxionPlatformPrototypePage"

function renderPrototype(path = "/maxion-prototype") {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<MaxionPlatformPrototypePage />
		</MemoryRouter>,
	)
}

function portalNavigation() {
	return within(screen.getByRole("navigation", { name: "Portal sections" }))
}

describe("MaxionPlatformPrototypePage", () => {
	beforeEach(() => localStorage.clear())
	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	it("bootstraps persisted Agentix attention without mounting its UI or starting its timer", async () => {
		expect(persistOperations(initialOperations())).toBe(true)
		const intervalSpy = vi.spyOn(window, "setInterval")
		renderPrototype()

		const navigation = portalNavigation()
		await waitFor(() => expect(navigation.getByRole("button", { name: /^Agentix 2 pending$/ })).toBeInTheDocument())
		expect(navigation.getByRole("button", { name: /^My approvals 1 pending$/ })).toBeInTheDocument()
		expect(screen.queryByRole("main", { name: "Agentix workspace" })).not.toBeInTheDocument()
		expect(intervalSpy.mock.calls.some((call) => call[1] === DEMO_TICK_MS)).toBe(false)

		fireEvent.click(navigation.getByRole("button", { name: /^My approvals/ }))
		expect(screen.getByRole("heading", { name: "My approvals" })).toBeInTheDocument()
		expect(screen.getByText("Review a $240 invoice price variance")).toBeInTheDocument()
		expect(screen.queryByRole("main", { name: "Agentix workspace" })).not.toBeInTheDocument()
	})
	it("opens on the canonical MAXION dashboard and exposes the complete platform shell", () => {
		renderPrototype()

		expect(screen.getByRole("heading", { name: "Work that moved. Decisions that wait." })).toBeInTheDocument()
		expect(screen.getByRole("complementary", { name: "Main navigation" })).toBeInTheDocument()
		expect(screen.getByRole("img", { name: "MAXION" })).toHaveAttribute("src", "/maxion-logo-lockup-white.svg")
		const productDestinations = within(screen.getByRole("list", { name: "Product destinations" }))
		const administrativeDestinations = within(screen.getByRole("list", { name: "Administrative destinations" }))
		for (const module of ["Dashboard", "Projects", "Discover", "Plan", "Execute", "Agentix", "Consult Max"]) {
			expect(productDestinations.getByRole("button", { name: new RegExp(`^${module}`) })).toHaveAttribute("data-navigation-tier", "product")
		}
		for (const utility of ["Settings", "Integrations", "My approvals", "Usage", "Help"]) {
			expect(administrativeDestinations.getByRole("button", { name: new RegExp(`^${utility}`) })).toHaveAttribute("data-navigation-tier", "administration")
		}
		expect(productDestinations.queryByRole("button", { name: "Integrations" })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }))
		expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByRole("complementary", { name: "Main navigation" })).toHaveClass("is-collapsed")
		fireEvent.click(screen.getByRole("button", { name: "Expand navigation" }))
		expect(screen.getByRole("button", { name: "Search or ask" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Open Agentix" })).toBeInTheDocument()
		expect(screen.queryByRole("banner")).not.toBeInTheDocument()
		expect(screen.getByText("Nothing needs your decision")).toBeInTheDocument()
		expect(screen.queryByText("Quick navigation", { exact: true })).not.toBeInTheDocument()
	})

	it("contains mobile navigation focus, closes on Escape, and restores the opener", async () => {
		renderPrototype()
		const opener = screen.getByLabelText("Open navigation")
		fireEvent.click(opener)

		const drawer = screen.getByRole("dialog", { name: "Main navigation" })
		expect(drawer.tagName).toBe("DIV")
		const stage = screen.getByLabelText("Dashboard module")
		await waitFor(() => expect(screen.getByLabelText("Close navigation", { selector: ".mxp-mobile-nav-close" })).toHaveFocus())
		expect(drawer).toHaveAttribute("aria-modal", "true")
		expect(stage).toHaveAttribute("inert")
		expect(stage).toHaveAttribute("aria-hidden", "true")

		fireEvent.keyDown(document, { key: "Escape" })
		await waitFor(() => expect(opener).toHaveFocus())
		expect(screen.queryByRole("dialog", { name: "Main navigation" })).not.toBeInTheDocument()
		expect(stage).not.toHaveAttribute("inert")
		expect(stage).not.toHaveAttribute("aria-hidden")
	})

	it("transfers mobile drawer ownership to the command dialog without leaking isolation", async () => {
		vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
			matches: query.includes("max-width") || query.includes("prefers-reduced-motion"),
			media: query,
			onchange: null,
			addListener: () => undefined,
			removeListener: () => undefined,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			dispatchEvent: () => false,
		}))
		renderPrototype()
		const opener = screen.getByLabelText("Open navigation")
		opener.style.display = "grid"
		fireEvent.click(opener)
		const drawer = screen.getByRole("dialog", { name: "Main navigation" })
		fireEvent.click(within(drawer).getByRole("button", { name: "Open command menu" }))

		const command = screen.getByRole("dialog", { name: "MAXION command menu" })
		const search = within(command).getByRole("textbox", { name: "Search MAXION commands" })
		const sidebar = document.querySelector<HTMLElement>(".mxp-portal-sidebar")
		const stage = screen.getByLabelText("Dashboard module", { selector: ".mxp-stage" })
		expect(search).toHaveFocus()
		expect(sidebar).toHaveAttribute("inert")
		expect(sidebar).toHaveAttribute("aria-hidden", "true")
		expect(stage).toHaveAttribute("inert")
		expect(stage).toHaveAttribute("aria-hidden", "true")

		fireEvent.keyDown(command.parentElement!, { key: "Escape" })
		await waitFor(() => expect(opener).toHaveFocus())
		expect(screen.queryByRole("dialog", { name: "MAXION command menu" })).not.toBeInTheDocument()
		expect(sidebar).not.toHaveAttribute("inert")
		expect(sidebar).not.toHaveAttribute("aria-hidden")
		expect(stage).not.toHaveAttribute("inert")
		expect(stage).not.toHaveAttribute("aria-hidden")
	})

	it("reviews and creates a project, reads it back on Dashboard, and reopens its context", async () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Projects" }))
		expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "New project" }))
		let dialog = screen.getByRole("dialog", { name: "Define the outcome" })
		fireEvent.change(screen.getByLabelText(/Project name/), { target: { value: "Finance controls uplift" } })
		fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "Tighten close controls across finance systems." } })
		fireEvent.click(within(dialog).getByRole("button", { name: "Review project" }))
		dialog = screen.getByRole("dialog", { name: "Review new project" })
		expect(within(dialog).getByText("Finance controls uplift")).toBeInTheDocument()
		fireEvent.click(within(dialog).getByRole("button", { name: "Create project" }))
		const projectCollection = await screen.findByRole("region", { name: /^Projects$/ })
		expect(within(projectCollection).getByText("Finance controls uplift")).toBeInTheDocument()

		fireEvent.click(portalNavigation().getByRole("button", { name: "Dashboard" }))
		const workspaceSummary = screen.getByRole("region", { name: "Workspace summary" })
		expect(within(within(workspaceSummary).getByText("Active projects").closest("article")!).getByText("4")).toBeInTheDocument()
		const attention = screen.getByText("Complete Finance controls uplift's operating context").closest("article")!
		fireEvent.click(within(attention).getByRole("button", { name: "Review" }))
		expect(screen.getByRole("heading", { name: "Finance controls uplift" })).toBeInTheDocument()
		fireEvent.change(screen.getByRole("textbox", { name: "Search projects, owners, or outcomes" }), { target: { value: "Finance controls" } })
		expect(within(projectCollection).getByText("Finance controls uplift")).toBeInTheDocument()
	})

	it("keeps Viewer projects readable while explicitly denying resume authority", () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Projects" }))
		fireEvent.click(screen.getByRole("button", { name: /Open Customer 360, View only/ }))
		expect(screen.getByRole("heading", { name: "Customer 360" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Request resume access" }))
		expect(screen.getByRole("status")).toHaveTextContent("Viewer access to Customer 360")
		expect(screen.getByRole("heading", { name: "Customer 360" })).toBeInTheDocument()
	})

	it("binds the Discover interview package to Plan through shared state", async () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Discover" }))
		expect(await screen.findByRole("region", { name: "Discover interview workspace" })).toBeInTheDocument()
		const composer = screen.getByRole("textbox", { name: "Answer MAX" })
		fireEvent.change(composer, { target: { value: "Planning authority stays with the project owner." } })
		fireEvent.keyDown(composer, { key: "Enter", code: "Enter" })
		fireEvent.click(screen.getByRole("button", { name: /^Gaps 1$/ }))
		fireEvent.click(screen.getByRole("button", { name: "Resolve from policy source" }))
		fireEvent.click(screen.getByRole("button", { name: "Create package for Plan" }))
		expect(await screen.findByRole("region", { name: "Plan artifact workspace" })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: "ERP modernization rollout" })).toBeInTheDocument()
	})

	it("starts an autonomous engagement and makes collaboration, steering, evidence, environments, and Plan context coherent", async () => {
		renderPrototype()
		fireEvent.click(portalNavigation().getByRole("button", { name: /^Execute/ }))
		expect(screen.getByRole("complementary", { name: "Main navigation" })).toHaveClass("is-collapsed")
		expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByRole("textbox", { name: "What should Execute deliver?" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Import from Plan" }))
		expect(screen.getByRole("button", { name: /ERP modernization delivery plan/ })).toHaveAttribute("aria-pressed", "true")
		fireEvent.click(screen.getByRole("button", { name: "Start engagement" }))

		expect(await screen.findByRole("heading", { name: "Delivery Orchestrator" })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: "Five boundaries. One outcome." })).toBeInTheDocument()
		const workspaces = within(screen.getByRole("navigation", { name: "Plan-compiled delivery workspaces" }))
		fireEvent.click(workspaces.getByRole("button", { name: /ServiceNow/ }))
		expect(screen.getByRole("heading", { name: "ServiceNow" })).toBeInTheDocument()
		const adapterComposer = screen.getByRole("textbox", { name: "Steer ServiceNow agent" })
		fireEvent.change(adapterComposer, { target: { value: "Reuse the existing webhook signature verifier." } })
		fireEvent.keyDown(adapterComposer, { key: "Enter", code: "Enter" })
		expect(screen.getByText("Reuse the existing webhook signature verifier.")).toBeInTheDocument()
		await waitFor(() => expect(screen.getByText(/applied that direction inside SNOW-101/)).toBeInTheDocument())

		fireEvent.click(workspaces.getByRole("button", { name: /MuleSoft/ }))
		expect(screen.queryByText("Reuse the existing webhook signature verifier.")).not.toBeInTheDocument()
		fireEvent.click(workspaces.getByRole("button", { name: /ServiceNow/ }))
		expect(screen.getByText("Reuse the existing webhook signature verifier.")).toBeInTheDocument()
		const inspector = within(screen.getByRole("complementary", { name: "ServiceNow inspector" }))
		fireEvent.click(inspector.getByRole("button", { name: /^Changes$/ }))
		await waitFor(() => expect(inspector.getByText("x_max_fin_change.js")).toBeInTheDocument(), { timeout: 5_000 })
		fireEvent.click(inspector.getByRole("button", { name: /^Tests$/ }))
		await waitFor(() => expect(inspector.getByRole("heading", { name: "36 focused checks" })).toBeInTheDocument(), { timeout: 5_000 })
		fireEvent.click(inspector.getByRole("button", { name: /^Environments$/ }))
		await waitFor(() => expect(inspector.getByRole("heading", { name: "Environments & release" })).toBeInTheDocument(), { timeout: 5_000 })
		fireEvent.click(inspector.getByRole("button", { name: /^Plan context$/ }))
		await waitFor(() => expect(inspector.getByText("POST /financial-changes v3")).toBeInTheDocument(), { timeout: 5_000 })
		fireEvent.click(inspector.getByRole("button", { name: /^Audit$/ }))
		await waitFor(() => expect(inspector.getByRole("heading", { name: "Workspace history" })).toBeInTheDocument(), { timeout: 5_000 })
		fireEvent.click(inspector.getByRole("button", { name: /^Repositories$/ }))
		await waitFor(() => expect(inspector.getByRole("heading", { name: "2 connected repositories" })).toBeInTheDocument(), { timeout: 5_000 })
		expect(inspector.getByText("maxion/servicenow-financial-change")).toBeInTheDocument()
		expect(inspector.getByText("maxion/servicenow-atf")).toBeInTheDocument()
		const shareButtons = screen.getAllByRole("button", { name: /^Share$/ })
		fireEvent.click(shareButtons[shareButtons.length - 1])
		const share = screen.getByRole("dialog", { name: "Share ServiceNow" })
		expect(within(share).getByRole("button", { name: /ServiceNow workspace/ })).toHaveAttribute("aria-pressed", "true")
		expect(within(share).getByRole("radio", { name: /ServiceNow delivery team/ })).toHaveAttribute("aria-checked", "true")
		fireEvent.click(within(share).getByRole("button", { name: "Share ServiceNow with 4 people" }))
		expect(within(share).getByRole("status")).toHaveTextContent("4 people can open the workspace, converse with MAX, and steer within their authority")
		fireEvent.click(within(share).getByRole("button", { name: /Manage access/ }))
		expect(within(share).getByText("Priya Nair")).toBeInTheDocument()
	})

	it("manages an integration connection and exposes its governed access log", async () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Integrations" }))
		expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument()
		fireEvent.change(screen.getByPlaceholderText("Search integrations"), { target: { value: "Workday" } })
		fireEvent.click(screen.getByRole("button", { name: "Connect" }))
		expect(await screen.findByText("Workday connected.")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Access log" }))
		expect(screen.getByRole("complementary", { name: "Integration access log" })).toBeInTheDocument()
		expect(screen.getByText("Salesforce records read")).toBeInTheDocument()
	})

	it("embeds Agentix and lets Consult MAX route across platform boundaries", async () => {
		renderPrototype("/agentix-prototype")
		expect(await screen.findByRole("main", { name: "Agentix workspace" })).toBeInTheDocument()
		expect(screen.getByRole("complementary", { name: "Main navigation" })).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Consult Max" }))
		const composer = await screen.findByLabelText("Message Consult MAX")
		fireEvent.change(composer, { target: { value: "How does Agentix work?" } })
		fireEvent.click(screen.getByRole("button", { name: "Send to Consult MAX" }))
		expect(screen.getByText(/The deployed invoice agent has one case waiting/)).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Open Agentix approval" }))
		expect(await screen.findByRole("main", { name: "Agentix workspace" })).toBeInTheDocument()
	})
})
