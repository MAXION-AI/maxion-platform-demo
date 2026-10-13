import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import type { DiscoveryOpenSignal, HandoffPacket } from "@/features/discovery-autonomous/DiscoveryAutonomousPrototypePage"

import { MaxionPlatformPrototypePage } from "../MaxionPlatformPrototypePage"

// Discovery's own run is covered by its suites. Here it only needs to hand the shell a packet,
// so the shell's routing can be checked without replaying a full Discovery.
vi.mock("@/features/discovery-autonomous/DiscoveryAutonomousPrototypePage", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/features/discovery-autonomous/DiscoveryAutonomousPrototypePage")>()
	const packet: HandoffPacket = { id: "HP-TEST01", createdAt: new Date().toISOString(), note: "", target: "agentix", title: "A Discovery with no prebuilt design", brief: "Reconcile the supplier onboarding queue and decide who may approve an exception." }
	return {
		...original,
		DiscoveryAutonomousPrototypePage: ({ onContinueToAgentix, operationalPackages, setupSignal = 0, openSignal = null }: { onContinueToAgentix?: (packet?: HandoffPacket) => void; operationalPackages?: ReactNode; setupSignal?: number; openSignal?: DiscoveryOpenSignal | null }) => (
			<div>
				<h1>Discovery hub</h1>
				<p>Setup requests {setupSignal}</p>
				<p>Opened {openSignal ? `${openSignal.recordId} at ${openSignal.jump}` : "nothing"}</p>
				<button type="button" onClick={() => onContinueToAgentix?.(packet)}>Confirm handoff</button>
				{operationalPackages}
			</div>
		),
	}
})

function renderShell() {
	return render(
		<MemoryRouter initialEntries={["/maxion-prototype"]}>
			<MaxionPlatformPrototypePage />
		</MemoryRouter>,
	)
}

const navigation = () => within(screen.getByRole("navigation", { name: "Portal sections" }))

describe("MAXION shell routing", () => {
	it("sends a Discovery with no prebuilt design to Agentix, prefilled from its brief", async () => {
		renderShell()
		fireEvent.click(navigation().getByRole("button", { name: "Discover" }))
		fireEvent.click(screen.getByRole("button", { name: "Confirm handoff" }))
		// Plan is no longer a destination: the packet opens engagement setup in Agentix instead,
		// carrying the Discovery's brief so the work starts from what was investigated.
		expect(await screen.findByRole("heading", { name: "What should an agent take on?" })).toBeVisible()
		expect(screen.getByRole("textbox", { name: "Describe the work" })).toHaveValue("Reconcile the supplier onboarding queue and decide who may approve an exception.")
	})

	it("offers no Plan or Execute destination anywhere in the navigation", async () => {
		renderShell()
		expect(navigation().queryByRole("button", { name: "Plan" })).toBeNull()
		expect(navigation().queryByRole("button", { name: "Execute" })).toBeNull()
		expect(navigation().getByRole("button", { name: /^Agentix/ })).toBeVisible()
	})

	it("reopens Discover on its hub after a design is sent to Agentix", async () => {
		renderShell()
		fireEvent.click(navigation().getByRole("button", { name: "Discover" }))
		const packages = screen.getByRole("region", { name: "Operational redesign packages" })
		// Onboarding is already live from its package; the Revenue data engineering package is the one ready to send.
		fireEvent.click(within(packages).getByRole("button", { name: /Revenue data engineering/ }))
		fireEvent.click(await screen.findByRole("button", { name: "Send to Agentix" }))
		expect(await screen.findByRole("main", { name: "Agentix workspace" })).toBeVisible()
		fireEvent.click(navigation().getByRole("button", { name: "Discover" }))
		expect(screen.getByRole("heading", { name: "Discovery hub" })).toBeVisible()
		expect(screen.queryByRole("button", { name: "Send to Agentix" })).not.toBeInTheDocument()
	})

	it("opens the waiting Agentix case from the Dashboard and counts approvals exactly", async () => {
		renderShell()
		await waitFor(() => expect(navigation().getByRole("button", { name: /^My approvals/ })).toHaveTextContent("1"))
		const activity = screen.getByRole("heading", { name: "Workspace activity" }).closest("section")!
		const row = within(activity).getByRole("button", { name: /price variance|Invoice variance/ })
		// The seeded case was already waiting when the session opened.
		expect(row).toHaveTextContent("1h")
		fireEvent.click(row)
		expect(await screen.findByRole("heading", { name: "Approve the $240 price variance?" })).toBeVisible()
	})

	it("starts or opens the exact Discovery the Dashboard and a project name", async () => {
		renderShell()
		fireEvent.click(screen.getByRole("button", { name: "Start Discovery" }))
		expect(screen.getByText("Setup requests 1")).toBeVisible()
		fireEvent.click(navigation().getByRole("button", { name: "Dashboard" }))
		const activity = screen.getByRole("heading", { name: "Workspace activity" }).closest("section")!
		fireEvent.click(within(activity).getByRole("button", { name: /Third-party onboarding control redesign.*Review decision/ }))
		expect(screen.getByText("Opened seed-tprm-control-redesign at decision")).toBeVisible()
		fireEvent.click(navigation().getByRole("button", { name: "Projects" }))
		fireEvent.click(screen.getByRole("button", { name: /NorthBridge acquisition active/ }))
		fireEvent.click(within(screen.getByRole("complementary", { name: "NorthBridge acquisition project details" })).getByRole("button", { name: "Open Discovery" }))
		expect(screen.getByText("Opened seed-northbridge-diligence at package")).toBeVisible()
		expect(screen.getByText("Setup requests 1")).toBeVisible()
	})

	it("lists each pending approval and opens it in Agentix", async () => {
		renderShell()
		fireEvent.click(navigation().getByRole("button", { name: /^My approvals/ }))
		const inbox = screen.getByRole("region", { name: "Pending approvals" })
		await waitFor(() => expect(within(inbox).getAllByRole("article")).toHaveLength(1))
		const item = within(inbox).getByRole("article", { name: /INV-20841/ })
		expect(item).toHaveTextContent("Revenue reconciliation · INV-20841")
		fireEvent.click(within(item).getByRole("button", { name: /^Review decision/ }))
		expect(await screen.findByRole("heading", { name: "Approve the $240 price variance?" })).toBeVisible()
	})
})
