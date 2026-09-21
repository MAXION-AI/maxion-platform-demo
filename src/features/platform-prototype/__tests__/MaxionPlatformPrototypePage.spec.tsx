import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

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
	it("opens on the canonical MAXION dashboard and exposes the complete platform shell", () => {
		renderPrototype()

		expect(screen.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeInTheDocument()
		expect(screen.getByRole("complementary", { name: "Main navigation" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Open MAXION dashboard" })).toHaveTextContent("MAXION")
		for (const module of ["Dashboard", "Projects", "Discover", "Consult Max", "Integrations"]) {
			expect(screen.getByRole("button", { name: module })).toBeInTheDocument()
		}
		expect(portalNavigation().getByRole("button", { name: /^Agentix/ })).toBeInTheDocument()
		// Plan and Execute are disabled: Discovery hands its package straight to Agentix.
		expect(portalNavigation().queryByRole("button", { name: "Plan" })).toBeNull()
		expect(portalNavigation().queryByRole("button", { name: /^Execute/ })).toBeNull()
		fireEvent.click(screen.getByRole("button", { name: "Collapse navigation" }))
		expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByRole("complementary", { name: "Main navigation" })).toHaveClass("is-collapsed")
		fireEvent.click(screen.getByRole("button", { name: "Expand navigation" }))
		expect(screen.getByRole("button", { name: "Start Discovery" })).toBeInTheDocument()
	})

	it("creates, searches, and opens a project without losing platform context", async () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Projects" }))
		expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Create Project" }))
		const dialog = screen.getByRole("dialog", { name: "Create new project" })
		fireEvent.change(screen.getByLabelText(/Project name/), { target: { value: "Finance controls uplift" } })
		fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Tighten close controls across finance systems." } })
		fireEvent.click(within(dialog).getByRole("button", { name: "Create Project" }))
		const projectCollection = await screen.findByRole("region", { name: "Projects" })
		expect(within(projectCollection).getByText("Finance controls uplift")).toBeInTheDocument()

		fireEvent.change(screen.getByPlaceholderText("Search projects by name or description"), { target: { value: "Finance controls" } })
		fireEvent.click(within(projectCollection).getByRole("button", { name: /Finance controls uplift active/ }))
		expect(screen.getByRole("complementary", { name: "Finance controls uplift project details" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Start Discovery" })).toBeInTheDocument()
	})

	it("runs the autonomous Discovery interview through a verified package", async () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Discover" }))
		expect(await screen.findByRole("heading", { name: "Continue where MAX left off." })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "New Discovery" }))
		const discoveryBrief = await screen.findByRole("textbox", { name: "Discovery brief" })
		fireEvent.change(discoveryBrief, { target: { value: "Reduce finance-close exceptions with a decision-ready control redesign." } })
		expect(discoveryBrief).toHaveValue("Reduce finance-close exceptions with a decision-ready control redesign.")
		expect(screen.queryByRole("tab", { name: "TPRM" })).not.toBeInTheDocument()
		fireEvent.click(await screen.findByRole("button", { name: "Start autonomous Discovery" }))
		// Intake drafts the mission; the authority review gates creation.
		fireEvent.click(await screen.findByRole("checkbox", { name: "Mission authority reviewed" }))
		fireEvent.click(screen.getByRole("button", { name: "Create Discovery" }))

		expect(await screen.findByRole("heading", { name: "Your next step: answer MAX’s question" }, { timeout: 20_000 })).toBeInTheDocument()
		const discoveryComposer = screen.getByRole("textbox", { name: "Message MAX" })
		fireEvent.change(discoveryComposer, { target: { value: "End the owner interview" } })
		fireEvent.keyDown(discoveryComposer, { key: "Enter", code: "Enter" })
		expect(await screen.findByRole("region", { name: "Autonomous work summary" }, { timeout: 20_000 })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Open autonomy" })).toBeInTheDocument()
		expect(await screen.findByRole("heading", { name: "One external interview needs your approval" }, { timeout: 25_000 })).toBeInTheDocument()
		expect(screen.getByText("Discovery is internal by default")).toBeInTheDocument()
		expect(screen.getByText(/Neither source contains the vendor’s retention commitment/)).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Allow one external interview" }))

		expect(await screen.findByRole("heading", { name: "Final plan and recommendations" }, { timeout: 30_000 })).toBeInTheDocument()
		fireEvent.click(screen.getAllByRole("button", { name: /Review deliverables/ })[0])
		expect(screen.getByText("Readiness snapshot v7 · manifest v4")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /Executive decision brief Current/ })).toBeInTheDocument()
		fireEvent.click(portalNavigation().getByRole("button", { name: /^Agentix/ }))
		fireEvent.click(screen.getByRole("button", { name: "Discover" }))
		expect(screen.getByRole("heading", { name: "Final plan and recommendations" })).toBeInTheDocument()
	}, 120_000)

	it("opens previous Discoveries at their saved point of work", async () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Discover" }))

		expect(await screen.findByRole("region", { name: "Discovery workload summary" })).toHaveTextContent("1 needs your input")
		expect(screen.getByRole("button", { name: "Resume Third-party onboarding control redesign, Needs your input" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Resume ServiceNow financial-control integration, Working autonomously" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Resume NorthBridge acquisition diligence, Completed" })).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Resume Third-party onboarding control redesign, Needs your input" }))
		expect(screen.getByRole("heading", { name: "One external interview needs your approval" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Continue with internal evidence" }))
		expect(screen.getByText("Nothing right now")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Thread" }))
		expect(screen.getByText(/kept all outreach inside the workspace/)).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "All discoveries" }))
		fireEvent.click(screen.getByRole("button", { name: "Resume NorthBridge acquisition diligence, Completed" }))
		expect(screen.getByRole("heading", { name: "Final plan and recommendations" })).toBeInTheDocument()
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
