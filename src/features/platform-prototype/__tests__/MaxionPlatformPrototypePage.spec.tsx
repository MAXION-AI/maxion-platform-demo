import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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

		expect(screen.getByRole("heading", { name: "Good afternoon, Maya" })).toBeInTheDocument()
		expect(screen.getByRole("complementary", { name: "Main navigation" })).toBeInTheDocument()
		expect(screen.getByRole("img", { name: "MAXION" })).toHaveAttribute("src", "/maxion-logo-lockup-white.svg")
		for (const module of ["Dashboard", "Projects", "Discover", "Plan", "Consult Max", "Integrations"]) {
			expect(screen.getByRole("button", { name: module })).toBeInTheDocument()
		}
		expect(portalNavigation().getByRole("button", { name: /^Execute/ })).toBeInTheDocument()
		expect(portalNavigation().getByRole("button", { name: /^Agentix/ })).toBeInTheDocument()
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
		const discoveryBrief = await screen.findByRole("textbox", { name: "Discovery brief" })
		fireEvent.change(discoveryBrief, { target: { value: "Reduce finance-close exceptions with a decision-ready control redesign." } })
		expect(discoveryBrief).toHaveValue("Reduce finance-close exceptions with a decision-ready control redesign.")
		expect(screen.queryByRole("tab", { name: "TPRM" })).not.toBeInTheDocument()
		fireEvent.click(await screen.findByRole("button", { name: "Start autonomous Discovery" }))

		expect(await screen.findByRole("heading", { name: "Interview with MAX" }, { timeout: 4_000 })).toBeInTheDocument()
		const discoveryComposer = screen.getByRole("textbox", { name: "Message MAX" })
		fireEvent.change(discoveryComposer, { target: { value: "End the owner interview" } })
		fireEvent.keyDown(discoveryComposer, { key: "Enter", code: "Enter" })
		expect(await screen.findByRole("region", { name: "Autonomous work summary" }, { timeout: 6_000 })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Open autonomy" })).toBeInTheDocument()
		expect(await screen.findByRole("heading", { name: "External counsel is outside the authority envelope" }, { timeout: 6_000 })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Approve once" }))

		expect(await screen.findByRole("heading", { name: "Final plan and recommendations" }, { timeout: 7_000 })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /Open package/ }))
		expect(screen.getByText("Generated automatically from readiness snapshot v7 and manifest v4.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /Executive decision brief Current/ })).toBeInTheDocument()
		fireEvent.click(portalNavigation().getByRole("button", { name: /^Agentix/ }))
		fireEvent.click(screen.getByRole("button", { name: "Discover" }))
		expect(screen.getByRole("heading", { name: "Final plan and recommendations" })).toBeInTheDocument()
	}, 35_000)

	it("preserves the Plan handoff in development-only Execute and verifies the agent run", async () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Plan" }))
		expect(screen.getByRole("heading", { name: "From evidence to implementation-ready" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Resume plan" }))
		expect(screen.getByRole("heading", { name: "MAX built the implementation plan." })).toBeInTheDocument()
		expect(screen.getByText(/resolved the architecture, security, and program decision rights/i)).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "1 approval needed" }))
		expect(screen.getByRole("heading", { name: "MAX found the approvers and sent the work." })).toBeInTheDocument()
		const approvalRequests = screen.getByRole("region", { name: "Approval requests" })
		expect(within(approvalRequests).getByText("Priya Shah")).toBeInTheDocument()
		expect(within(approvalRequests).getByText("Elena Ortiz")).toBeInTheDocument()
		expect(within(approvalRequests).getByText("Maya Chen")).toBeInTheDocument()
		expect(screen.getByText("3 messages delivered")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Approve implementation boundary" }))
		expect(screen.getByRole("button", { name: "3 approvals complete" })).toBeInTheDocument()
		fireEvent.click(await screen.findByRole("button", { name: "Send to Execute" }))

		expect(await screen.findByText("Plan handoff attached")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /Plan handoff attached.*Inspect/ }))
		fireEvent.click(screen.getByRole("button", { name: "Start agent run" }))
		expect(screen.getByText("Running focused tests…")).toBeInTheDocument()
		await waitFor(() => expect(screen.getByRole("button", { name: "Run verified" })).toBeInTheDocument(), { timeout: 2_500 })
		expect(screen.getAllByText("Mission authority API passed its release gate").length).toBeGreaterThan(0)
		expect(screen.getByText("48 passed in 6.8s")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Return to MAXION" }))
		fireEvent.click(portalNavigation().getByRole("button", { name: "Consult Max" }))
		fireEvent.click(portalNavigation().getByRole("button", { name: /^Execute/ }))
		expect(screen.getByRole("button", { name: "Run verified" })).toBeInTheDocument()
	}, 35_000)

	it("creates an autonomous Plan from existing context and provides L2, L3, and L4 guidance for every flow", () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Plan" }))
		fireEvent.click(screen.getByRole("button", { name: "Create Plan" }))
		const dialog = screen.getByRole("dialog", { name: "Start a plan with MAX" })
		expect(within(dialog).getByRole("button", { name: /Verified Discovery/ })).toHaveAttribute("aria-pressed", "true")
		expect(within(dialog).getByRole("group", { name: "Starting context" })).toBeInTheDocument()
		expect(within(dialog).getByRole("region", { name: "What MAX will deliver" })).toBeInTheDocument()
		for (const source of ["Verified Discovery", "Documents", "Connected systems", "Project context", "Describe it"]) {
			expect(within(dialog).getByRole("button", { name: new RegExp(source) })).toBeInTheDocument()
		}
		expect(within(dialog).getByRole("button", { name: "Start autonomous plan" })).toBeEnabled()
		fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
		fireEvent.click(screen.getByRole("button", { name: "Resume plan" }))

		expect(screen.getByText("MAX is active")).toBeInTheDocument()
		expect(screen.getByText("15 architecture diagrams")).toBeInTheDocument()
		const planComposer = screen.getByRole("textbox", { name: "Steer the Plan agent" })
		fireEvent.change(planComposer, { target: { value: "Keep the ServiceNow adapter behind the existing gateway." } })
		fireEvent.keyDown(planComposer, { key: "Enter", code: "Enter" })
		expect(screen.getByText("Keep the ServiceNow adapter behind the existing gateway.")).toBeInTheDocument()
		expect(screen.getByText(/re-checked the affected L3 contracts and L4 acceptance criteria/)).toBeInTheDocument()
		fireEvent.click(within(screen.getByRole("navigation", { name: "Plan workspace" })).getByRole("button", { name: /Architecture/ }))
		expect(screen.getByRole("heading", { name: "Every flow, from intent to code." })).toBeInTheDocument()
		expect(screen.queryByText("Generated flows")).not.toBeInTheDocument()
		expect(screen.getByText("15 / 15")).toBeInTheDocument()
		const flows = screen.getByRole("navigation", { name: "Architecture flows" })
		for (const flowTitle of ["Mission authority and approval boundary", "ServiceNow financial-change event intake", "Durable reconciliation and drift repair", "Tenant-safe retry and replay protection", "Release evidence and deployment approval"]) {
			expect(within(flows).getByRole("button", { name: new RegExp(flowTitle) })).toBeInTheDocument()
		}
		const l2Diagram = screen.getByRole("img", { name: "L2 diagram for Mission authority and approval boundary" })
		expect(l2Diagram).toHaveClass("apn-architecture-diagram", "is-l2")
		expect(l2Diagram.querySelector("svg")).toBeInTheDocument()
		expect(l2Diagram.querySelectorAll(".apn-diagram-node")).toHaveLength(4)
		fireEvent.click(screen.getByRole("button", { name: "L3 Contracts" }))
		const l3Diagram = screen.getByRole("img", { name: "L3 diagram for Mission authority and approval boundary" })
		expect(l3Diagram).toHaveClass("apn-architecture-diagram", "is-l3")
		expect(l3Diagram.querySelectorAll(".apn-diagram-link")).toHaveLength(3)
		fireEvent.click(within(flows).getByRole("button", { name: /ServiceNow financial-change event intake/ }))
		fireEvent.click(screen.getByRole("button", { name: "L4 Build" }))
		const l4Diagram = screen.getByRole("img", { name: "L4 diagram for ServiceNow financial-change event intake" })
		expect(l4Diagram).toHaveClass("apn-architecture-diagram", "is-l4")
		expect(l4Diagram.querySelectorAll(".apn-diagram-lifeline")).toHaveLength(4)
		expect(screen.getAllByText(/one transaction for receipt, dedupe claim, and outbox/i).length).toBeGreaterThan(0)
		expect(screen.getByText("Runnable")).toBeInTheDocument()
	})

	it("starts an autonomous engagement from a prompt or an approved Plan and exposes workspace topology", async () => {
		renderPrototype()
		fireEvent.click(portalNavigation().getByRole("button", { name: /^Execute/ }))
		expect(screen.getByRole("complementary", { name: "Main navigation" })).toHaveClass("is-collapsed")
		expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByRole("textbox", { name: "What should Execute deliver?" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Import from Plan" }))
		expect(screen.getByRole("button", { name: /ERP modernization delivery plan/ })).toHaveAttribute("aria-pressed", "true")
		fireEvent.click(screen.getByRole("button", { name: "Start engagement" }))

		expect(await screen.findByRole("heading", { name: "Workspace topology" })).toBeInTheDocument()
		expect(screen.getByText("MAX is working autonomously")).toBeInTheDocument()
		const topology = screen.getByRole("group", { name: "Workspace dependency topology" })
		expect(topology).toBeInTheDocument()
		fireEvent.click(within(topology).getByRole("button", { name: "Open Workspace 02: Add ServiceNow event adapter" }))
		expect(screen.getByRole("heading", { name: "Add ServiceNow event adapter" })).toBeInTheDocument()
		const adapterComposer = screen.getByRole("textbox", { name: "Steer Workspace 02: Add ServiceNow event adapter" })
		fireEvent.change(adapterComposer, { target: { value: "Reuse the existing webhook signature verifier." } })
		fireEvent.keyDown(adapterComposer, { key: "Enter", code: "Enter" })
		expect(screen.getByText("Reuse the existing webhook signature verifier.")).toBeInTheDocument()
		expect(screen.getByText(/scoped that direction to the ServiceNow adapter/)).toBeInTheDocument()

		const workspaces = within(screen.getByRole("navigation", { name: "Engagement workspaces" }))
		fireEvent.click(workspaces.getByRole("button", { name: "Open Workspace 01: Build mission authority API" }))
		expect(screen.queryByText("Reuse the existing webhook signature verifier.")).not.toBeInTheDocument()
		fireEvent.click(workspaces.getByRole("button", { name: "Open Workspace 02: Add ServiceNow event adapter" }))
		expect(screen.getByText("Reuse the existing webhook signature verifier.")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /^Changes/ }))
		expect(await screen.findByText("serviceNowAdapter.ts")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Terminal" }))
		expect(await screen.findByLabelText("Workspace 02 terminal")).toHaveTextContent("servicenow-adapter")
		fireEvent.click(screen.getByRole("button", { name: /^Tests/ }))
		expect(await screen.findByRole("heading", { name: "Tests and release gates" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /^Deploys/ }))
		expect(await screen.findByRole("heading", { name: "Deploys" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Audit" }))
		expect(await screen.findByRole("heading", { name: "Audit" })).toBeInTheDocument()
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
		expect(await screen.findByRole("heading", { name: "Two decisions. Three agents working." })).toBeInTheDocument()
		expect(screen.getByRole("complementary", { name: "Main navigation" })).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Consult Max" }))
		const composer = await screen.findByLabelText("Message Consult MAX")
		fireEvent.change(composer, { target: { value: "What needs my attention?" } })
		fireEvent.click(screen.getByRole("button", { name: "Send to Consult MAX" }))
		expect(screen.getByText(/July close exact-effect approval in Agentix/)).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Open Agentix approval" }))
		expect(await screen.findByRole("heading", { name: "Two decisions. Three agents working." })).toBeInTheDocument()
	})
})
