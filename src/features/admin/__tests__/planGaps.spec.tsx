import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it } from "vitest"

import { WORKSPACE_CYCLE_RESET, WORKSPACE_UNIT_CAP, WORKSPACE_UNITS_PERCENT, WORKSPACE_UNITS_USED, WORKSPACE_USAGE_ROWS } from "@/features/platform-prototype/model"
import { AdminPanelPage } from "../AdminPanelPage"
import { buildTenant, costSummary, initialTenants, isLastPlatformOwner, INITIAL_STAFF, resolveSetupCode, setupGaps, SETUP_CODE_REFUSED, type TenantDraft } from "../model"
import { createTenant, issueSetupCode, publish, readAdmin, resetAdminStore, SEEDED_EXPIRED_CODE, viewAs } from "../store"

const renderAdmin = (path = "/maxion-admin") => render(<MemoryRouter initialEntries={[path]}><AdminPanelPage /></MemoryRouter>)
const dialog = () => within(screen.getByRole("dialog"))
const rowOf = (text: string | RegExp) => screen.getAllByText(text).map((node) => node.closest(".org-row")).find(Boolean) as HTMLElement
function commitWith(reason: string, ticket = "ONB-1") {
	fireEvent.change(dialog().getByLabelText("Reason"), { target: { value: reason } })
	fireEvent.change(dialog().getByLabelText(/^Ticket/), { target: { value: ticket } })
}
const inAYear = () => { const date = new Date(); date.setUTCFullYear(date.getUTCFullYear() + 1); return date.toISOString().slice(0, 10) }
const DRAFT: TenantDraft = { name: "Marlow Freight", onboardingReference: "ONB-1042", packageName: "Enterprise · 2026 v3", seats: "25", allowance: "100000", modules: { discovery: true, agentix: true, voice: false }, agreementEnd: inAYear() }

function fillNewTenant(name = "Marlow Freight") {
	fireEvent.click(screen.getByRole("button", { name: "New tenant" }))
	fireEvent.change(dialog().getByLabelText("Organization name"), { target: { value: name } })
	fireEvent.change(dialog().getByLabelText("Onboarding reference"), { target: { value: "ONB-1042" } })
	fireEvent.change(dialog().getByLabelText("Agreement ends"), { target: { value: inAYear() } })
	fireEvent.click(dialog().getByRole("button", { name: "Issue a simulated code" }))
	return (dialog().getByLabelText("Setup code") as HTMLInputElement).value
}

beforeEach(() => resetAdminStore())

describe("usage figures", () => {
	it("gives Northstar the customer Usage page's own numbers, so the two views can't disagree", () => {
		const northstar = initialTenants().find((tenant) => tenant.id === "northstar")!
		expect(northstar.usage.allowance).toBe(WORKSPACE_UNIT_CAP)
		expect(northstar.usage.used).toBe(WORKSPACE_UNITS_USED)
		expect(northstar.usage.resets).toBe(WORKSPACE_CYCLE_RESET)

		renderAdmin("/maxion-admin?tenant=northstar&tab=usage")
		expect(screen.getByText(`${WORKSPACE_UNITS_PERCENT}%`)).toBeInTheDocument()
		expect(screen.getByText(new RegExp(`${WORKSPACE_UNITS_USED.toLocaleString("en-US")} of ${WORKSPACE_UNIT_CAP.toLocaleString("en-US")} units settled`))).toBeInTheDocument()
	})

	it("keeps every tenant's cost lines adding up to its settled usage, and the holds inside its reservations", () => {
		for (const tenant of initialTenants()) {
			expect(costSummary(tenant).settledUnits, tenant.name).toBe(tenant.usage.used)
			const held = tenant.costs.lines.reduce((total, line) => total + (line.held ?? 0), 0)
			expect(held, tenant.name).toBeLessThanOrEqual(tenant.usage.reservations)
		}
		const northstar = initialTenants().find((tenant) => tenant.id === "northstar")!
		const units = (prefix: string) => northstar.costs.lines.filter((line) => line.source.startsWith(prefix)).reduce((total, line) => total + line.units, 0)
		expect(units("Discovery")).toBe(WORKSPACE_USAGE_ROWS[0].units)
		expect(units("Agentix")).toBe(WORKSPACE_USAGE_ROWS[1].units)
	})
})

describe("costs", () => {
	it("shows provider cost against usage, with AR-2291 unknown instead of zero and no invented price", () => {
		renderAdmin("/maxion-admin?tenant=northstar&tab=usage")
		const costs = within(screen.getByRole("region", { name: "Costs" }))
		expect(costs.getByText(/Simulated figures/)).toBeInTheDocument()
		const total = rowOf("Provider cost this cycle")
		expect(total).toHaveTextContent("$3,550.60 known")
		expect(total).toHaveTextContent("Includes $186.00 estimated; 1 item unknown, so this isn't final")

		const unknown = costs.getByRole("article", { name: "Agentix case AR-2291" })
		expect(unknown).toHaveTextContent("1,400 held")
		expect(unknown).toHaveTextContent("Unknown")
		expect(unknown).not.toHaveTextContent("$")

		// The customer's own key pays its model calls: metered, not MAXION's cost, no draw-down.
		expect(costs.getByRole("article", { name: "Agentix · GPT-6 Luna" })).toHaveTextContent("Paid by customer")
		expect(rowOf("Customer charge")).toHaveTextContent("Charging mode is set on the agreement")
		expect(rowOf("Shared platform costs")).toHaveTextContent("Not allocated")
	})

	it("says no cost is recorded yet rather than showing a zero", () => {
		renderAdmin("/maxion-admin?tenant=brightwater&tab=usage")
		const total = rowOf("Provider cost this cycle")
		expect(total).toHaveTextContent("None recorded")
		expect(total).not.toHaveTextContent("$0")
	})

	it("keeps internal cost out of the Support view and says so", () => {
		viewAs("tessa-lind")
		renderAdmin("/maxion-admin?tenant=northstar&tab=usage")
		const costs = within(screen.getByRole("region", { name: "Costs" }))
		expect(costs.getByText("Not shown")).toBeInTheDocument()
		expect(costs.getByText("Needs Operator or Platform Owner")).toBeInTheDocument()
		expect(screen.getByRole("main")).not.toHaveTextContent("$3,550")
		// Units and reconciliation stay readable.
		expect(rowOf("Reconciliation")).toHaveTextContent("AR-2291")
	})
})

describe("tenant creation", () => {
	it("creates a tenant, its draft agreement and its first Owner binding, and lands in Pending setup", () => {
		renderAdmin()
		fireEvent.click(screen.getByRole("button", { name: "New tenant" }))
		const publishButton = dialog().getByRole("button", { name: "Publish" })
		expect(publishButton).toBeDisabled()
		expect(dialog().getByText("Add the organization's name.", { selector: "small" })).toBeInTheDocument()
		// The plan's only identifier for the first Owner is their own setup code.
		expect(dialog().queryByLabelText(/email|display name|user id/i)).not.toBeInTheDocument()
		fireEvent.click(dialog().getByRole("button", { name: "Cancel" }))

		const code = fillNewTenant()
		fireEvent.change(dialog().getByLabelText("Seats"), { target: { value: "25" } })
		fireEvent.change(dialog().getByLabelText("Usage allowance (units)"), { target: { value: "120000" } })
		fireEvent.click(dialog().getByRole("checkbox", { name: /Voice interviews/ }))

		const preview = within(dialog().getByRole("region", { name: "Preview" }))
		const entry = readAdmin().setupCodes.find((item) => item.code === code)!
		// Who the code resolves to is shown before anything commits.
		for (const value of [entry.identity.globalUser, entry.identity.issuer, entry.identity.subject, entry.identity.tid, entry.identity.oid]) expect(preview.getByText(value)).toBeInTheDocument()
		expect(preview.getByText("Pending setup")).toBeInTheDocument()
		expect(preview.getByText("Draft, version 1 · Enterprise · 2026 v3")).toBeInTheDocument()
		expect(preview.getByText(/\+5 seats, Voice interviews granted until/)).toBeInTheDocument()
		expect(preview.getByText(/Not selected\. It's set on the agreement/)).toBeInTheDocument()

		commitWith("customer_agreement", "SAL-2301")
		expect(dialog().getByRole("button", { name: "Publish" })).toBeEnabled()
		fireEvent.click(dialog().getByRole("button", { name: "Publish" }))

		expect(screen.getByRole("heading", { name: "Marlow Freight", level: 1 })).toBeInTheDocument()
		expect(screen.getByRole("status")).toHaveTextContent("Organization and first Owner · revision 1")
		expect(screen.getByText(/^Setup is incomplete/)).toHaveTextContent("The first Owner hasn't activated yet.")
		const setup = within(screen.getByRole("region", { name: "Setup" }))
		expect(setup.getByText("Waiting to activate")).toBeInTheDocument()
		expect(setup.getByText("Draft, version 1")).toBeInTheDocument()
		expect(rowOf("Seats")).toHaveTextContent("0 of 25 used")

		fireEvent.click(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole("button", { name: "Tenants" }))
		expect(within(screen.getByRole("region", { name: "Tenants" })).getByRole("button", { name: "Marlow Freight · Pending setup" })).toBeInTheDocument()

		const receipts = readAdmin().receipts.filter((receipt) => receipt.scope === "Marlow Freight")
		expect(receipts.map((receipt) => receipt.control)).toEqual(["Organization and first Owner", "Agreement draft"])
		expect(receipts.every((receipt) => receipt.ticket === "SAL-2301" && receipt.operator === "Maya Chen")).toBe(true)
		expect(JSON.stringify(receipts)).not.toContain(code)
	})

	it("grants no model routes by default, and the gap closes when staff publish them", () => {
		renderAdmin()
		fillNewTenant()
		commitWith("customer_agreement")
		fireEvent.click(dialog().getByRole("button", { name: "Publish" }))
		expect(rowOf("Model routes")).toHaveTextContent("Not published")
		fireEvent.click(screen.getByRole("button", { name: "Open Models" }))
		expect(screen.getAllByText("No eligible model").length).toBeGreaterThan(0)

		const tenantId = readAdmin().tenants[0].id
		publish({ action: "tenant.change", scope: "Marlow Freight", tenantId, control: "Models", change: "None → all", reason: "customer_agreement", ticket: "T-1", applyTenant: (tenant) => ({ ...tenant, models: tenant.models.map((task) => ({ ...task, granted: [task.defaultRoute] })) }) })
		const gaps = setupGaps(readAdmin().tenants[0])
		expect(gaps.join(" ")).not.toContain("Model routes")
		expect(gaps).toHaveLength(2)
		expect(readAdmin().tenants[0].lifecycle).toBe("pending")
	})

	it("uses a code once and refuses an expired or unknown code with the same answer", () => {
		const code = issueSetupCode()
		expect(createTenant(DRAFT, code, "customer_agreement", "T-1").ok).toBe(true)
		const before = readAdmin().tenants.length
		const reused = createTenant({ ...DRAFT, name: "Second Tenant" }, code, "customer_agreement", "T-1")
		expect(reused).toEqual({ ok: false, error: SETUP_CODE_REFUSED })
		expect(createTenant({ ...DRAFT, name: "Second Tenant" }, SEEDED_EXPIRED_CODE, "customer_agreement", "T-1")).toEqual({ ok: false, error: SETUP_CODE_REFUSED })
		expect(resolveSetupCode(readAdmin().setupCodes, "AAAAAAAAAAAAAAAAAAAAAQ")).toEqual({ ok: false, error: SETUP_CODE_REFUSED })
		expect(readAdmin().tenants).toHaveLength(before)

		const malformed = resolveSetupCode(readAdmin().setupCodes, "too-short")
		expect(malformed.ok).toBe(false)
		if (!malformed.ok) expect(malformed.error).toMatch(/22 letters/)
	})

	it("shows the refusal in the form and keeps what was entered", () => {
		renderAdmin()
		fireEvent.click(screen.getByRole("button", { name: "New tenant" }))
		fireEvent.change(dialog().getByLabelText("Organization name"), { target: { value: "Marlow Freight" } })
		fireEvent.change(dialog().getByLabelText("Setup code"), { target: { value: SEEDED_EXPIRED_CODE } })
		expect(dialog().getByText(SETUP_CODE_REFUSED)).toBeInTheDocument()
		expect(dialog().getByLabelText("Organization name")).toHaveValue("Marlow Freight")
		expect(dialog().getByRole("button", { name: "Publish" })).toBeDisabled()
	})

	it("refuses a duplicate name, a past end date and an agreement with no modules", () => {
		renderAdmin()
		fillNewTenant("northstar consulting")
		expect(dialog().getByLabelText("Organization name")).toHaveAttribute("aria-invalid", "true")
		expect(dialog().getAllByText("A tenant with this name already exists.").length).toBeGreaterThan(0)
		fireEvent.change(dialog().getByLabelText("Organization name"), { target: { value: "Sæther & Søn AS" } })
		fireEvent.change(dialog().getByLabelText("Agreement ends"), { target: { value: "2020-01-01" } })
		expect(dialog().getAllByText("Choose a date in the future.").length).toBeGreaterThan(0)
		fireEvent.change(dialog().getByLabelText("Agreement ends"), { target: { value: inAYear() } })
		fireEvent.click(dialog().getByRole("checkbox", { name: /^Discovery/ }))
		fireEvent.click(dialog().getByRole("checkbox", { name: /^Agentix/ }))
		expect(dialog().getAllByText("Grant at least one module.").length).toBeGreaterThan(0)
		expect(dialog().getByRole("button", { name: "Publish" })).toBeDisabled()
	})

	it("needs fresh MFA at commit, not only in the dialog", () => {
		resetAdminStore({ mfaMinutesAgo: 22 })
		expect(() => createTenant(DRAFT, issueSetupCode(), "customer_agreement", "T-1")).toThrow(/MFA/)
		expect(readAdmin().tenants.some((tenant) => tenant.name === DRAFT.name)).toBe(false)
	})

	it("reports an expired first Owner binding and replaces it with a new code", () => {
		const expired = buildTenant(DRAFT, readAdmin().setupCodes[0].identity, "x", Date.now() - 16 * 60_000)
		expect(setupGaps(expired)[0]).toMatch(/binding expired/)

		createTenant(DRAFT, issueSetupCode(), "customer_agreement", "T-1")
		const original = readAdmin().tenants[0].setup!
		renderAdmin(`/maxion-admin?tenant=${readAdmin().tenants[0].id}`)
		fireEvent.click(screen.getByRole("button", { name: "Replace the first Owner binding" }))
		fireEvent.click(dialog().getByRole("button", { name: "Issue a simulated code" }))
		expect(dialog().getByText(/different person from the current binding/)).toBeInTheDocument()
		commitWith("customer_request")
		fireEvent.click(dialog().getByRole("button", { name: "Publish" }))
		const replaced = readAdmin().tenants[0].setup!
		expect(replaced.bindingRevision).toBe(2)
		expect(replaced.firstOwner.globalUser).not.toBe(original.firstOwner.globalUser)
	})
})

describe("viewing as each staff role", () => {
	it("switches identity from the top bar and shows who is acting", () => {
		renderAdmin()
		const control = screen.getByRole("combobox", { name: "View as" })
		expect(control).toHaveValue("maya-chen")
		expect(within(control).getAllByRole("option").map((option) => option.textContent)).toEqual(["Maya Chen · Platform Owner, Operator", "Luis Ortega · Operator", "Tessa Lind · Support"])
		expect(screen.getByRole("button", { name: "New tenant" })).toBeInTheDocument()
		fireEvent.change(control, { target: { value: "tessa-lind" } })
		expect(screen.getByRole("complementary", { name: "Admin navigation" })).toHaveTextContent("Tessa Lind")
		expect(screen.getByText(/You're viewing as Support/)).toBeInTheDocument()
	})

	it("lets an Operator change a tenant but shows why global and bootstrap controls are out of reach", () => {
		viewAs("luis-ortega")
		renderAdmin()
		expect(screen.queryByRole("button", { name: "New tenant" })).not.toBeInTheDocument()
		expect(screen.getByText("Needs Platform Owner")).toBeInTheDocument()
		cleanupAndOpen("/maxion-admin?view=platform&tab=stops")
		expect(screen.queryByRole("button", { name: "Stop Discovery for every tenant" })).not.toBeInTheDocument()
		expect(rowOf("Discovery")).toHaveTextContent("Needs Platform Owner")
		cleanupAndOpen("/maxion-admin?tenant=northstar")
		expect(screen.getByRole("button", { name: "Change seats" })).toBeInTheDocument()
		// Invitation commands are Support's and Platform Owner's, not Operator's.
		expect(screen.queryByRole("button", { name: /Resend the invitation/ })).not.toBeInTheDocument()
		expect(screen.getAllByText("Needs Support or Platform Owner").length).toBeGreaterThan(0)
	})

	it("gives Support plain reasons in place of editors, never disabled pretend controls", () => {
		viewAs("tessa-lind")
		renderAdmin("/maxion-admin?tenant=northstar")
		expect(screen.queryByRole("button", { name: "Change seats" })).not.toBeInTheDocument()
		expect(rowOf("Seats")).toHaveTextContent("Needs Operator or Platform Owner")
		expect(rowOf("Seats")).toHaveTextContent("7 of 25 used")
		expect(rowOf("Lifecycle")).toHaveTextContent("Needs Operator or Platform Owner")
		const panel = screen.getByRole("tabpanel")
		expect(within(panel).getAllByRole("button").every((button) => !(button as HTMLButtonElement).disabled)).toBe(true)
		fireEvent.click(screen.getByRole("tab", { name: "Models" }))
		expect(screen.queryByRole("button", { name: /models$/ })).not.toBeInTheDocument()
		expect(screen.getByText("Agentix · Reasoning and delegation").closest(".org-row")).toHaveTextContent("The customer narrowed this to GPT-6 Luna")
	})

	it("refuses a command at commit if the role doesn't allow it, whatever the screen offered", () => {
		viewAs("tessa-lind")
		expect(() => publish({ action: "tenant.change", scope: "Northstar Consulting", tenantId: "northstar", control: "Seats", change: "x", reason: "customer_request", ticket: "T", applyTenant: (tenant) => tenant })).toThrow(/Needs Operator or Platform Owner/)
		expect(() => createTenant(DRAFT, issueSetupCode(), "customer_agreement", "T-1")).toThrow(/Needs Platform Owner/)
		expect(readAdmin().receipts.some((receipt) => receipt.ticket === "T")).toBe(false)
	})

	it("lets Support resend an invitation, which issues a new link under their own name", () => {
		viewAs("tessa-lind")
		renderAdmin("/maxion-admin?tenant=northstar")
		const expired = rowOf("Admin invitation")
		expect(expired).toHaveTextContent("t•••@northstar.com")
		expect(expired).not.toHaveTextContent("tom.becker")
		fireEvent.click(within(expired).getByRole("button", { name: /Resend the invitation/ }))
		commitWith("customer_request", "SUP-9100")
		fireEvent.click(dialog().getByRole("button", { name: "Publish" }))
		expect(rowOf("Admin invitation")).toHaveTextContent("link generation 2")
		expect(rowOf("Admin invitation")).toHaveTextContent("Pending")
		const receipt = readAdmin().receipts[0]
		expect(receipt).toMatchObject({ control: "Invitation resent", operator: "Tessa Lind", ticket: "SUP-9100" })
		expect(JSON.stringify(receipt)).not.toContain("tom.becker")
	})

	it("lets Support revoke an invitation and revoke sessions, each with a reason", () => {
		viewAs("tessa-lind")
		renderAdmin("/maxion-admin?tenant=northstar")
		fireEvent.click(screen.getByRole("button", { name: /Revoke the invitation to p•••/ }))
		commitWith("customer_request")
		fireEvent.click(dialog().getByRole("button", { name: "Publish" }))
		expect(readAdmin().tenants.find((tenant) => tenant.id === "northstar")!.invitations.find((item) => item.id === "inv-priya")!.status).toBe("revoked")
		expect(screen.queryByRole("button", { name: /Revoke the invitation to p•••/ })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Revoke sessions" }))
		expect(dialog().getByRole("button", { name: "Publish" })).toBeDisabled()
		commitWith("security_review")
		fireEvent.click(dialog().getByRole("button", { name: "Publish" }))
		expect(rowOf("Customer sessions")).toHaveTextContent("0 active")
		expect(screen.queryByRole("button", { name: "Revoke sessions" })).not.toBeInTheDocument()
	})

	it("won't resend over an unknown delivery or during a stop, and says why", () => {
		viewAs("tessa-lind")
		renderAdmin("/maxion-admin?tenant=calder")
		const row = rowOf("Member invitation")
		expect(row).toHaveTextContent("Delivery outcome unknown; repair it before sending again")
		expect(within(row).queryByRole("button", { name: /Resend/ })).not.toBeInTheDocument()
		expect(within(row).getByRole("button", { name: /Revoke/ })).toBeInTheDocument()
	})

	it("revokes customer sessions as part of suspending a tenant", () => {
		renderAdmin("/maxion-admin?tenant=northstar")
		fireEvent.click(screen.getByRole("button", { name: "Suspend tenant" }))
		fireEvent.change(dialog().getByLabelText("Reason"), { target: { value: "security_review" } })
		fireEvent.click(dialog().getByRole("button", { name: "Stop now" }))
		expect(rowOf("Customer sessions")).toHaveTextContent("0 active")
		expect(rowOf("Admin invitation")).toHaveTextContent("A stop is in effect, so no invitation can be sent")
	})
})

describe("staff access", () => {
	it("lists who holds which role", () => {
		renderAdmin("/maxion-admin?view=staff")
		expect(screen.getByRole("heading", { name: "Staff access", level: 1 })).toBeInTheDocument()
		expect(screen.getByRole("article", { name: "Maya Chen" })).toHaveTextContent("Platform Owner")
		expect(screen.getByRole("article", { name: "Luis Ortega" })).toHaveTextContent("Operator")
		expect(screen.getByRole("article", { name: "Tessa Lind" })).toHaveTextContent("Support")
		expect(within(screen.getByRole("region", { name: "What each role does" })).getByText(/no customer content, no impersonation/)).toBeInTheDocument()
	})

	it("explains itself to anyone but a Platform Owner, with a way back", () => {
		viewAs("luis-ortega")
		renderAdmin("/maxion-admin?view=staff")
		expect(screen.getByText("Staff access is for Platform Owners")).toBeInTheDocument()
		expect(screen.queryByRole("article", { name: "Maya Chen" })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "All tenants" }))
		expect(screen.getByRole("heading", { name: "Tenants", level: 1 })).toBeInTheDocument()
	})

	it("protects the last Platform Owner in the form and at commit", () => {
		renderAdmin("/maxion-admin?view=staff")
		expect(isLastPlatformOwner(INITIAL_STAFF, "maya-chen")).toBe(true)
		fireEvent.click(screen.getByRole("button", { name: "Manage Maya Chen" }))
		expect(dialog().getByRole("checkbox", { name: /Platform Owner/ })).toBeDisabled()
		expect(dialog().getByText(/The last Platform Owner can't lose this role/)).toBeInTheDocument()
		expect(() => publish({ action: "staff.manage", scope: "Staff access", control: "x", change: "x", reason: "security_review", ticket: "T", applyStaff: (staff) => staff.map((member) => ({ ...member, roles: [] })) })).toThrow(/last Platform Owner/)
	})

	it("changes a role at once, so the next command uses the new authority", () => {
		renderAdmin("/maxion-admin?view=staff")
		fireEvent.click(screen.getByRole("button", { name: "Manage Luis Ortega" }))
		fireEvent.click(dialog().getByRole("checkbox", { name: /^Operator/ }))
		fireEvent.click(dialog().getByRole("checkbox", { name: /^Support/ }))
		commitWith("security_review", "SEC-40")
		fireEvent.click(dialog().getByRole("button", { name: "Publish" }))
		expect(screen.getByRole("article", { name: "Luis Ortega" })).toHaveTextContent("Support")
		expect(screen.getByRole("article", { name: "Staff roles · Luis Ortega · Published" })).toHaveTextContent("Operator → Support")
		viewAs("luis-ortega")
		expect(() => publish({ action: "tenant.change", scope: "Northstar Consulting", tenantId: "northstar", control: "Seats", change: "x", reason: "customer_request", ticket: "T", applyTenant: (tenant) => tenant })).toThrow(/Needs Operator/)
	})

	it("shows someone with no staff role no tenant data", () => {
		renderAdmin("/maxion-admin?view=staff")
		fireEvent.click(screen.getByRole("button", { name: "Manage Tessa Lind" }))
		fireEvent.click(dialog().getByRole("checkbox", { name: /^Support/ }))
		commitWith("security_review", "SEC-41")
		fireEvent.click(dialog().getByRole("button", { name: "Publish" }))
		fireEvent.change(screen.getByRole("combobox", { name: "View as" }), { target: { value: "tessa-lind" } })
		expect(screen.getByText("No staff role")).toBeInTheDocument()
		expect(screen.queryByRole("heading", { name: "Staff access", level: 1 })).not.toBeInTheDocument()
	})
})

function cleanupAndOpen(path: string) {
	document.body.innerHTML = ""
	renderAdmin(path)
}
