import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
		expect(await screen.findByText(/Discovery package v1 · 3 sources/)).toBeInTheDocument()
	})

	it("preserves the Plan handoff in development-only Execute and verifies the agent run", async () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Plan" }))
		expect(screen.getByRole("heading", { name: "From evidence to implementation-ready" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Resume plan" }))
		expect(screen.getByRole("heading", { name: "MAX built the implementation plan." })).toBeInTheDocument()
		expect(screen.getByText(/3 conflicts resolved · 2 owners interviewed/)).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "2 decisions need you" }))
		expect(screen.getByRole("heading", { name: "Should a Workday journal batch fail atomically or allow partial posting?" })).toBeInTheDocument()
		expect(screen.getByText("MAX recommends")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Accept atomic posting" }))
		expect(screen.getByRole("button", { name: "1 decision needs you" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "1 decision needs you" }))
		expect(screen.getByRole("heading", { name: "MAX found the approvers and sent the work." })).toBeInTheDocument()
		const approvalRequests = screen.getByRole("region", { name: "Approval requests" })
		expect(within(approvalRequests).getByText("Priya Shah")).toBeInTheDocument()
		expect(within(approvalRequests).getByText("Elena Ortiz")).toBeInTheDocument()
		expect(within(approvalRequests).getByText("Root Admin")).toBeInTheDocument()
		expect(screen.getByText("3 messages delivered")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Approve implementation boundary" }))
		expect(screen.getByRole("button", { name: "Plan ready" })).toBeInTheDocument()
		fireEvent.click(await screen.findByRole("button", { name: "Send to Execute" }))

		expect(await screen.findByText("Plan handoff attached")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /Plan handoff attached.*Inspect/ }))
		expect(await screen.findByRole("heading", { name: "Delivery Orchestrator" })).toBeInTheDocument()
		const workspaces = within(screen.getByRole("navigation", { name: "Plan-compiled delivery workspaces" }))
		for (const workspace of ["Delivery Orchestrator", "ServiceNow", "MuleSoft", "Workday Financials", "Integration verification"]) {
			expect(workspaces.getByRole("button", { name: new RegExp(workspace) })).toBeInTheDocument()
		}
		vi.useFakeTimers()
		fireEvent.click(screen.getByRole("button", { name: "Coordinating" }))
		await act(async () => { await vi.runAllTimersAsync() })
		expect(screen.getByRole("button", { name: "Workspaces verified" })).toBeInTheDocument()
		expect(screen.getByRole("region", { name: "Delivery environment progression" })).toHaveTextContent("3/3 verified")
		fireEvent.click(workspaces.getByRole("button", { name: /MuleSoft/ }))
		expect(screen.getAllByText("mule-journal-api:2.4.1").length).toBeGreaterThan(0)
		fireEvent.click(screen.getByRole("button", { name: "Return to MAXION" }))
		fireEvent.click(portalNavigation().getByRole("button", { name: "Consult Max" }))
		fireEvent.click(portalNavigation().getByRole("button", { name: /^Execute/ }))
		expect(screen.getByRole("button", { name: "Verified" })).toBeInTheDocument()
	}, 150_000)

	it("creates an autonomous Plan from existing context and provides executable behavior plus L2, L3, and L4 guidance for every flow", async () => {
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

		expect(screen.getAllByText("MAX is maintaining this plan").length).toBeGreaterThan(0)
		expect(screen.getByText("Conversation with MAX")).toBeInTheDocument()
		expect(screen.getByText("Needs you first")).toBeInTheDocument()
		expect(screen.getByText(/124 claims · 3 conflicts resolved/)).toBeInTheDocument()
		const planComposer = screen.getByRole("textbox", { name: "Steer the Plan agent" })
		fireEvent.change(planComposer, { target: { value: "Keep the ServiceNow adapter behind the existing gateway." } })
		fireEvent.keyDown(planComposer, { key: "Enter", code: "Enter" })
		expect(screen.getByText("Keep the ServiceNow adapter behind the existing gateway.")).toBeInTheDocument()
		expect(screen.getByText(/Reading the active context/)).toBeInTheDocument()
		const impactCard = await screen.findByRole("article", { name: "Steering impact preview" }, { timeout: 4000 })
		expect(impactCard).toHaveTextContent("Impact preview · 3 artifacts · nothing applied yet")
		expect(impactCard).toHaveTextContent("Contained change")
		fireEvent.click(within(impactCard).getByRole("button", { name: "Apply to plan" }))
		expect(within(impactCard).getByText(/Applied · snapshot v13/)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Verified Discovery · snapshot v13" })).toBeInTheDocument()
		fireEvent.click(within(screen.getByRole("navigation", { name: "Plan workspace" })).getByRole("button", { name: /Design/ }))
		expect(screen.getByRole("heading", { name: "See the flow. Understand the behavior. Know what to build." })).toBeInTheDocument()
		expect(screen.queryByText("Generated flows")).not.toBeInTheDocument()
		expect(screen.getByText("20 / 20")).toBeInTheDocument()
		const flows = screen.getByRole("navigation", { name: "Architecture flows" })
		for (const flowTitle of ["Mission authority and approval boundary", "ServiceNow to Workday financial integration", "Durable reconciliation and drift repair", "Tenant-safe retry and replay protection", "Release evidence and deployment approval"]) {
			expect(within(flows).getByRole("button", { name: new RegExp(flowTitle) })).toBeInTheDocument()
		}
		// The applied direction re-derived INT-01 and MULE-201, so the flow that owns them
		// carries the snapshot it was re-checked against until the viewer navigates on.
		expect(within(flows).getByText("re-checked · v13")).toBeInTheDocument()
		const behaviorFlow = screen.getByRole("region", { name: "Executable behavior flow for ServiceNow to Workday financial integration" })
		expect(within(behaviorFlow).getByRole("list", { name: "Ordered application behavior" })).toBeInTheDocument()
		fireEvent.click(within(behaviorFlow).getByRole("button", { name: /MuleSoft Experience API.*Validate and durably accept ingress/ }))
		expect(within(behaviorFlow).getByRole("region", { name: "Selected behavior step" })).toHaveTextContent("Signed ApprovedFinancialChange v1 received")
		expect(within(behaviorFlow).getByRole("region", { name: "Execute workspace context packet" })).toHaveTextContent("mulesoft-financial-change-api")
		expect(within(behaviorFlow).getByRole("region", { name: "Execute workspace context packet" })).toHaveTextContent("MULE-201")
		expect(within(behaviorFlow).getByRole("region", { name: "Execute workspace context packet" })).toHaveTextContent("INT-01 baselined")
		expect(within(behaviorFlow).getByRole("region", { name: "Execute workspace context packet" })).toHaveTextContent("OAuth 2.0 client credentials + mTLS")
		fireEvent.click(screen.getByRole("button", { name: "L2 Solution" }))
		const l2Diagram = screen.getByRole("group", { name: "L2 diagram for ServiceNow to Workday financial integration" })
		expect(l2Diagram).toHaveClass("apn-architecture-diagram", "is-l2")
		expect(l2Diagram.querySelector("svg")).toBeInTheDocument()
		expect(l2Diagram.querySelectorAll(".apn-diagram-node")).toHaveLength(3)
		fireEvent.click(within(l2Diagram).getByRole("button", { name: "Inspect MuleSoft" }))
		expect(screen.getByRole("region", { name: "Selected architecture node" })).toHaveTextContent("Owning teamMuleSoft team")
		fireEvent.click(screen.getByRole("button", { name: "Steer MAX on this node" }))
		expect(screen.getByRole("region", { name: "Steer MAX" })).toHaveTextContent("CMP-INT-02 · L2 · MuleSoft")
		expect(screen.getByRole("textbox", { name: "Steer the Plan agent" })).toHaveFocus()
		fireEvent.click(screen.getByRole("button", { name: "Explain this architecture" }))
		fireEvent.keyDown(screen.getByRole("textbox", { name: "Steer the Plan agent" }), { key: "Enter", code: "Enter" })
		expect(await screen.findByText("MAX answered in context", {}, { timeout: 4_000 })).toBeInTheDocument()
		expect(screen.getByRole("region", { name: "L2 executable handoff" })).toHaveTextContent("ServiceNow team")
		expect(screen.getByRole("region", { name: "L2 executable handoff" })).toHaveTextContent("MuleSoft integration team")
		expect(screen.getByRole("region", { name: "L2 executable handoff" })).toHaveTextContent("Workday financials team")
		fireEvent.click(screen.getByRole("button", { name: "L3 Technical" }))
		const l3Diagram = screen.getByRole("group", { name: "L3 diagram for ServiceNow to Workday financial integration" })
		expect(l3Diagram).toHaveClass("apn-architecture-diagram", "is-l3")
		expect(l3Diagram.querySelectorAll(".apn-diagram-link")).toHaveLength(5)
		const l3Handoff = screen.getByRole("region", { name: "L3 executable handoff" })
		expect(within(l3Handoff).getByText("INT-01")).toBeInTheDocument()
		expect(within(l3Handoff).getByText("POST /v1/financial-change-events · 202")).toBeInTheDocument()
		expect(within(l3Handoff).getByText("OAuth 2.0 client credentials + mTLS")).toBeInTheDocument()
		expect(within(l3Handoff).getByRole("region", { name: "Canonical field mapping" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "L4 Build" }))
		const l4Diagram = screen.getByRole("group", { name: "L4 diagram for ServiceNow to Workday financial integration" })
		expect(l4Diagram).toHaveClass("apn-architecture-diagram", "is-l4")
		expect(l4Diagram.querySelectorAll(".apn-diagram-node")).toHaveLength(5)
		const l4Handoff = screen.getByRole("region", { name: "L4 executable handoff" })
		for (const packageId of ["SNOW-101", "MULE-201", "MULE-202", "WDAY-301", "INT-401"]) {
			expect(within(l4Handoff).getAllByText(packageId).length).toBeGreaterThan(0)
		}
		fireEvent.click(within(l4Handoff).getByRole("button", { name: "MuleSoft team" }))
		expect(within(l4Handoff).queryByText("SNOW-101")).not.toBeInTheDocument()
		expect(within(l4Handoff).getByText("MULE-201")).toBeInTheDocument()
		expect(screen.getByText("CMP-INT-02-L4")).toBeInTheDocument()

		const flowNavigation = screen.getByRole("navigation", { name: "Architecture flows" })
		fireEvent.click(within(flowNavigation).getByRole("button", { name: /System blueprint/ }))
		expect(screen.getByRole("group", { name: "System blueprint for the five implementation flows" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Open Mission authority and approval boundary" }))
		expect(screen.getByRole("region", { name: "Executable behavior flow for Mission authority and approval boundary" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "L2 Solution" }))
		const authorityDiagram = screen.getByRole("group", { name: "L2 diagram for Mission authority and approval boundary" })
		expect(authorityDiagram).toBeInTheDocument()
		expect(within(authorityDiagram).getByText("MAXION AUTHORITY PLANE")).toBeInTheDocument()
		expect(within(authorityDiagram).getByText("AUTH-01 · scope evaluation")).toBeInTheDocument()
	}, 120_000)

	it("runs a live Plan pass, previews steering impact honestly, and records revisions", async () => {
		renderPrototype()
		fireEvent.click(screen.getByRole("button", { name: "Plan" }))
		fireEvent.click(screen.getByRole("button", { name: "Create Plan" }))
		fireEvent.click(within(screen.getByRole("dialog", { name: "Start a plan with MAX" })).getByRole("button", { name: "Start autonomous plan" }))

		expect(screen.getByRole("heading", { name: "MAX is building the implementation plan." })).toBeInTheDocument()
		expect(screen.getByRole("textbox", { name: "Steer the Plan agent" })).toBeEnabled()
		expect(screen.getByRole("textbox", { name: "Steer the Plan agent" })).toHaveAttribute("placeholder", expect.stringContaining("while MAX works"))
		expect(within(screen.getByRole("navigation", { name: "Plan workspace" })).getByRole("button", { name: /Design/ })).toBeDisabled()
		fireEvent.click(screen.getByRole("button", { name: "Skip to the finished plan" }))
		expect(screen.getByRole("heading", { name: "MAX built the implementation plan." })).toBeInTheDocument()

		const composer = screen.getByRole("textbox", { name: "Steer the Plan agent" })
		fireEvent.change(composer, { target: { value: "Switch the integration to Boomi instead of MuleSoft — we lost the license." } })
		fireEvent.keyDown(composer, { key: "Enter", code: "Enter" })
		const impactCard = await screen.findByRole("article", { name: "Steering impact preview" }, { timeout: 4000 })
		expect(impactCard).toHaveTextContent("Structural change")
		expect(impactCard).toHaveTextContent(/exceeds the approved implementation boundary/)
		fireEvent.click(within(impactCard).getByRole("button", { name: "Apply to plan" }))
		expect(within(impactCard).getByText(/Applied · snapshot v13/)).toBeInTheDocument()
		expect(within(impactCard).getByText(/approval routing reopened/)).toBeInTheDocument()

		fireEvent.click(within(screen.getByRole("navigation", { name: "Plan workspace" })).getByRole("button", { name: /Ledger/ }))
		fireEvent.click(within(screen.getByRole("navigation", { name: "Ledger sections" })).getByRole("button", { name: /History/ }))
		expect(screen.getByRole("heading", { name: "Every pass is recorded. Nothing changes silently." })).toBeInTheDocument()
		expect(screen.getByText("The integration control plane moves — 12 artifacts re-derive")).toBeInTheDocument()
		expect(screen.getByText("Initial decomposition: five flows through behavior and L2–L4")).toBeInTheDocument()

		fireEvent.click(within(screen.getByRole("navigation", { name: "Ledger sections" })).getByRole("button", { name: /Sources/ }))
		expect(screen.getByText("CLM-014")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /^ServiceNow 19 contracts/ }))
		expect(screen.getByText("CLM-058")).toBeInTheDocument()
		expect(screen.getByText(/free-text and drift from the Workday hierarchy/)).toBeInTheDocument()

		// A schedule direction is a sequencing change the evidence graph already knows about:
		// it must cite CLM-021 rather than fall through to the generic integration answer.
		const scheduleComposer = screen.getByRole("textbox", { name: "Steer the Plan agent" })
		fireEvent.change(scheduleComposer, { target: { value: "Protect the October cutover window in the build order." } })
		fireEvent.keyDown(scheduleComposer, { key: "Enter", code: "Enter" })
		const scheduleImpact = await screen.findByRole("article", { name: "Steering impact preview" }, { timeout: 4000 })
		expect(scheduleImpact).toHaveTextContent("The build order absorbs the schedule constraint")
		expect(scheduleImpact).toHaveTextContent("Contained change")
		expect(within(scheduleImpact).getByRole("button", { name: "CLM-021" })).toBeInTheDocument()
		expect(scheduleImpact).toHaveTextContent("The October cutover is a hard program constraint")
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
