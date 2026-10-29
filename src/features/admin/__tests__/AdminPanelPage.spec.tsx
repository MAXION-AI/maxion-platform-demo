import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it } from "vitest"

import { AdminPanelPage } from "../AdminPanelPage"
import { resetAdminStore } from "../store"

function renderAdmin(path = "/maxion-admin") {
	return render(<MemoryRouter initialEntries={[path]}><AdminPanelPage /></MemoryRouter>)
}

const dialog = () => within(screen.getByRole("dialog"))
function commitWith(reason: string, ticket = "SUP-9001") {
	fireEvent.change(dialog().getByLabelText("Reason"), { target: { value: reason } })
	const ticketField = dialog().queryByLabelText(/^Ticket/)
	if (ticketField && ticket) fireEvent.change(ticketField, { target: { value: ticket } })
}

describe("MAXION admin panel", () => {
	beforeEach(() => resetAdminStore())

	it("lists tenants, searches them and opens one in the staff shell", () => {
		renderAdmin()
		expect(screen.getByRole("heading", { name: "Tenants", level: 1 })).toBeInTheDocument()
		expect(screen.getByRole("complementary", { name: "Admin navigation" })).toHaveTextContent("Production")
		const table = within(screen.getByRole("region", { name: "Tenants" }))
		expect(table.getByRole("button", { name: "Northstar Consulting · Active" })).toBeInTheDocument()
		expect(table.getByRole("button", { name: "Kestrel Logistics · Cleanup pending" })).toBeInTheDocument()

		fireEvent.change(screen.getByRole("searchbox", { name: "Search tenants" }), { target: { value: "halden" } })
		expect(table.getByRole("button", { name: /Halden Group/ })).toBeInTheDocument()
		expect(table.queryByRole("button", { name: /Northstar/ })).not.toBeInTheDocument()

		fireEvent.change(screen.getByRole("searchbox", { name: "Search tenants" }), { target: { value: "zzqx" } })
		expect(screen.getByText("No tenant matches")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Show all tenants" }))
		fireEvent.click(table.getByRole("button", { name: "Northstar Consulting · Active" }))
		expect(screen.getByRole("heading", { name: "Northstar Consulting", level: 1 })).toBeInTheDocument()
		expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("TenantsNorthstar Consulting")
	})

	it("reads Northstar's controls back in layers with the effective value and the reason that limits it", () => {
		renderAdmin("/maxion-admin?tenant=northstar&tab=models")
		const agentix = screen.getByText("Agentix · Reasoning and delegation").closest(".org-row") as HTMLElement
		// The customer's own Settings narrowed Agentix to GPT-6 Luna; the staff view shows the same layer.
		expect(agentix).toHaveTextContent("Customer: only GPT-6 Luna, prefers GPT-6 Luna")
		expect(agentix).toHaveTextContent("GPT-6 Luna")
		expect(agentix).toHaveTextContent("The customer narrowed this to GPT-6 Luna")

		fireEvent.click(screen.getByRole("tab", { name: "Modules" }))
		const network = screen.getByText("Agentix sandbox network").closest(".org-row") as HTMLElement
		expect(network).toHaveTextContent("Platform: Full internet · Tenant: Named hosts · Customer: Package registries")
		expect(network).toHaveTextContent("Limited by the customer's stricter limit")
	})

	it("never swaps in another model when the only route the customer allows is revoked", () => {
		renderAdmin("/maxion-admin?tenant=northstar&tab=models")
		fireEvent.click(screen.getByRole("button", { name: "Change Agentix Reasoning and delegation models" }))
		fireEvent.click(dialog().getByRole("checkbox", { name: /^GPT-6 Luna OpenAI/ }))
		expect(dialog().getByText(/New work pauses with a reason; no other model is substituted/)).toBeInTheDocument()
	})

	it("publishes a previewed change that lands in History as Published, then Applied", async () => {
		renderAdmin("/maxion-admin?tenant=northstar&tab=modules")
		fireEvent.click(screen.getByRole("button", { name: "Change Discovery web research" }))
		const publish = dialog().getByRole("button", { name: "Publish" })
		expect(publish).toBeDisabled()
		fireEvent.click(dialog().getByRole("radio", { name: /^Off/ }))
		expect(dialog().getByText("Choose a reason", { selector: "small" })).toBeInTheDocument()
		commitWith("customer_request", "SUP-9001")
		expect(publish).toBeEnabled()
		fireEvent.click(publish)

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		expect(screen.getByRole("status")).toHaveTextContent("Discovery web research · revision 15 published; enforcement not yet reported")
		const research = screen.getAllByText("Discovery web research").map((node) => node.closest(".org-row")).find(Boolean) as HTMLElement
		expect(research).toHaveTextContent("Turned off for this tenant by MAXION")

		fireEvent.click(screen.getByRole("tab", { name: "History" }))
		expect(screen.getByRole("article", { name: "Discovery web research · Published" })).toHaveTextContent("SUP-9001")
		expect(await screen.findByRole("article", { name: "Discovery web research · Applied" }, { timeout: 3000 })).toBeInTheDocument()
	})

	it("needs a reason before an emergency stop, but no ticket", () => {
		renderAdmin("/maxion-admin?tenant=northstar&tab=operations")
		fireEvent.click(screen.getByRole("button", { name: "Emergency stop" }))
		const stop = dialog().getByRole("button", { name: "Stop now" })
		expect(stop).toBeDisabled()
		expect(dialog().getByText("Choose a reason", { selector: "small" })).toBeInTheDocument()
		commitWith("incident_response", "")
		expect(stop).toBeEnabled()
		fireEvent.click(stop)
		const stops = within(screen.getByRole("region", { name: "Stops" }))
		expect(stops.getByText("In effect")).toBeInTheDocument()
		expect(stops.getByText("Pause new work · Whole tenant")).toBeInTheDocument()
	})

	it("shows over-cap when seats drop below use, and removes nobody", () => {
		renderAdmin("/maxion-admin?tenant=northstar")
		fireEvent.click(screen.getByRole("button", { name: "Change seats" }))
		fireEvent.change(dialog().getByLabelText(/Amendment to the package/), { target: { value: "-14" } })
		expect(dialog().getByText(/7 seats are in use, 1 over the new cap. Nobody is removed/)).toBeInTheDocument()
		commitWith("customer_agreement")
		fireEvent.click(dialog().getByRole("button", { name: "Publish" }))
		const seats = screen.getAllByText("Seats").map((node) => node.closest(".org-row")).find(Boolean) as HTMLElement
		expect(within(seats).getByText("Over cap")).toBeInTheDocument()
		expect(seats).toHaveTextContent("7 of 6 used")
		expect(seats).toHaveTextContent("New joins are blocked; nobody was removed")
	})

	it("holds a command until MFA is fresh", () => {
		resetAdminStore({ mfaMinutesAgo: 22 })
		renderAdmin("/maxion-admin?tenant=northstar&tab=modules")
		fireEvent.click(screen.getByRole("button", { name: "Change Discovery web research" }))
		fireEvent.click(dialog().getByRole("radio", { name: /^Off/ }))
		commitWith("security_review")
		expect(dialog().getByRole("button", { name: "Publish" })).toBeDisabled()
		fireEvent.click(dialog().getByRole("button", { name: "Verify with MFA" }))
		expect(dialog().getByRole("button", { name: "Publish" })).toBeEnabled()
	})

	it("stops a model route platform-wide and shows the tenant has no eligible model instead of a substitute", () => {
		renderAdmin("/maxion-admin?view=platform")
		fireEvent.click(screen.getByRole("button", { name: "Stop GPT-6 Luna" }))
		commitWith("incident_response", "")
		fireEvent.click(dialog().getByRole("button", { name: "Stop now" }))
		expect(screen.getByRole("article", { name: "GPT-6 Luna" })).toHaveTextContent("Stopped")
	})
})

describe("MAXION admin panel keyboard", () => {
	beforeEach(() => resetAdminStore())
	it("moves between tenant tabs with the arrow keys", () => {
		renderAdmin("/maxion-admin?tenant=northstar")
		fireEvent.keyDown(screen.getByRole("tablist", { name: "Northstar Consulting controls" }), { key: "ArrowRight" })
		expect(screen.getByRole("tab", { name: "Models" })).toHaveAttribute("aria-selected", "true")
		fireEvent.keyDown(screen.getByRole("tablist", { name: "Northstar Consulting controls" }), { key: "End" })
		expect(screen.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true")
	})
})
