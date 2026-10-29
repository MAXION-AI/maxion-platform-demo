import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ConnectionPicker } from "../ConnectionPicker"
import { IntegrationsPage } from "../IntegrationsPage"
import { SettingsPage } from "../SettingsPage"
import { changeRole, readOrganization, requestSection, resetOrganizationStore, setMemberStatus, SHELL_SECTION_EVENT } from "../store"
import { publishDraft, readKnowledge, resetKnowledgeStore, saveItem } from "../knowledge"

const settingsTab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }))
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

describe("Organization: Integrations", () => {
	beforeEach(() => { resetOrganizationStore(); vi.useFakeTimers() })
	afterEach(() => { vi.useRealTimers() })

	it("connects with reads only and no projects, after the account is verified and confirmed", () => {
		render(<IntegrationsPage />)
		fireEvent.click(screen.getByRole("button", { name: "Connect OneDrive" }))
		const dialog = screen.getByRole("dialog", { name: "Connect OneDrive" })
		expect(within(dialog).getByRole("radio", { name: /Organization/ })).toBeDisabled()
		fireEvent.click(within(dialog).getByRole("button", { name: /Continue to Microsoft 365/ }))
		expect(screen.getByRole("dialog", { name: "Finishing the connection" })).toBeInTheDocument()
		advance(1200)
		fireEvent.click(within(screen.getByRole("dialog", { name: "Confirm the account" })).getByRole("button", { name: "Confirm account" }))
		const onedrive = readOrganization().connections.find((connection) => connection.connector === "onedrive" && connection.ownerId === "root-admin")
		expect(onedrive).toMatchObject({ state: "active", classes: ["read"], projects: [] })
		expect(readOrganization().audit[0]).toMatchObject({ category: "connections", action: "Connection activated" })
	})

	it("refuses to hand a connection to a project the viewer only views, and saves the grants it may give", () => {
		render(<IntegrationsPage />)
		fireEvent.click(screen.getByRole("button", { name: "Manage Salesforce" }))
		const sheet = screen.getByRole("complementary", { name: "Salesforce connection" })
		expect(within(sheet).getByRole("checkbox", { name: /Customer 360/ })).toBeDisabled()
		fireEvent.click(within(sheet).getByRole("checkbox", { name: /NorthBridge acquisition/ }))
		fireEvent.click(within(sheet).getByRole("button", { name: "Save projects" }))
		expect(readOrganization().connections.find((connection) => connection.id === "conn-salesforce")?.projects).toEqual(["erp-modernization"])
		expect(readOrganization().audit[0].action).toBe("Project access revoked")
	})

	it("asks for a fresh sign-in before allowing writes once the last one is too old", () => {
		vi.setSystemTime(Date.now() + 20 * 60_000)
		render(<IntegrationsPage />)
		fireEvent.click(screen.getByRole("button", { name: "Manage Salesforce" }))
		// Salesforce has no qualified writes yet, so its switch can't be turned on at all.
		expect(screen.getByRole("checkbox", { name: "Write" })).toBeDisabled()
		expect(screen.getByText("Update an order record").closest("li")).toHaveTextContent("Not available yet")
		fireEvent.click(within(screen.getByRole("complementary", { name: "Salesforce connection" })).getByRole("button", { name: "Close Salesforce" }))
		fireEvent.click(screen.getByRole("button", { name: "Manage SharePoint" }))
		fireEvent.click(screen.getByRole("checkbox", { name: "Write" }))
		expect(readOrganization().connections.find((connection) => connection.id === "conn-sharepoint")?.classes).toEqual(["read"])
		fireEvent.click(screen.getByRole("checkbox", { name: "Write" }))
		const dialog = screen.getByRole("dialog", { name: /Allow writes through SharePoint/ })
		expect(within(dialog).getByRole("button", { name: "Allow writes" })).toBeDisabled()
		fireEvent.click(within(dialog).getByRole("button", { name: "Sign in again" }))
		fireEvent.click(within(dialog).getByRole("button", { name: "Allow writes" }))
		expect(readOrganization().connections.find((connection) => connection.id === "conn-sharepoint")?.classes).toEqual(["read", "write"])
	})

	it("disconnects at once and tracks the provider cleanup separately", () => {
		render(<IntegrationsPage />)
		fireEvent.click(screen.getByRole("button", { name: "Manage ServiceNow" }))
		fireEvent.click(screen.getByRole("button", { name: "Disconnect ServiceNow" }))
		const dialog = screen.getByRole("dialog", { name: "Disconnect ServiceNow?" })
		expect(dialog).toHaveTextContent("New use stops now. Work already sent completes. Provider cleanup is tracked.")
		fireEvent.click(within(dialog).getByRole("button", { name: "Disconnect" }))
		expect(readOrganization().connections.find((connection) => connection.id === "conn-servicenow")).toMatchObject({ state: "disconnected", cleanup: "pending", projects: [] })
		advance(1700)
		expect(readOrganization().connections.find((connection) => connection.id === "conn-servicenow")?.cleanup).toBe("done")
	})

	it("never shows another member's account, and explains connectors it can't offer", () => {
		render(<IntegrationsPage />)
		const andre = screen.getByRole("article", { name: "OneDrive, Andre Reyes" })
		expect(andre).toHaveTextContent("Andre Reyes · personal")
		expect(andre).not.toHaveTextContent("@")
		expect(screen.getByRole("article", { name: "NetSuite" })).toHaveTextContent("Not in your agreement")
		expect(within(screen.getByRole("article", { name: "Outlook mailbox" })).queryByRole("button")).not.toBeInTheDocument()
	})
})

describe("Organization: Settings", () => {
	beforeEach(() => { resetOrganizationStore() })

	it("protects the last Owner and confirms a role change with its exact scope", () => {
		render(<SettingsPage onNavigate={() => undefined} />)
		settingsTab("Members")
		fireEvent.click(screen.getByRole("button", { name: "Manage Root Admin" }))
		expect(screen.getByText("You're the only Owner. Make someone else an Owner first.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Suspend" })).toBeDisabled()
		fireEvent.click(screen.getByRole("button", { name: "Done" }))
		fireEvent.click(screen.getByRole("button", { name: "Manage Sarah Liu" }))
		fireEvent.click(screen.getByRole("radio", { name: /^Admin/ }))
		fireEvent.click(screen.getByRole("button", { name: "Change role" }))
		const confirm = screen.getByRole("dialog", { name: "Change Sarah Liu's role?" })
		expect(confirm).toHaveTextContent(/RoleMember→changes toAdmin/)
		fireEvent.click(within(confirm).getByRole("button", { name: "Change role" }))
		expect(readOrganization().members.find((member) => member.id === "sarah-liu")?.role).toBe("Admin")
	})

	it("refuses an invitation to someone who is already a member", () => {
		render(<SettingsPage onNavigate={() => undefined} />)
		settingsTab("Members")
		fireEvent.click(screen.getByRole("button", { name: "Invite member" }))
		fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "Andre.Reyes@northstar.com " } })
		expect(screen.getByText("Andre Reyes is already a member.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Send invitation" })).toBeDisabled()
		fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "lena.ortiz@northstar.com" } })
		fireEvent.click(screen.getByRole("button", { name: "Send invitation" }))
		expect(readOrganization().invitations[0]).toMatchObject({ email: "lena.ortiz@northstar.com", role: "Member", status: "pending" })
	})

	it("publishes a narrowing policy change without a fresh sign-in and reports saved before applied", () => {
		vi.useFakeTimers()
		vi.setSystemTime(Date.now() + 20 * 60_000)
		render(<SettingsPage onNavigate={() => undefined} />)
		settingsTab("Policy")
		fireEvent.click(screen.getByRole("button", { name: "Change what connections may do" }))
		fireEvent.click(screen.getByRole("radio", { name: /Read only/ }))
		expect(screen.getByText("Narrowing access doesn't need a fresh sign-in.")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Publish change" }))
		expect(screen.getByRole("status")).toHaveTextContent("saved; enforcement not yet reported")
		expect(readOrganization().policy).toMatchObject({ revision: 15, integrations: { classes: "read" } })
		act(() => { vi.advanceTimersByTime(1500) })
		expect(screen.getByRole("status")).toHaveTextContent("applied to new work")
		vi.useRealTimers()
	})

	it("rejects a research allowlist that names a blocked or malformed domain", () => {
		render(<SettingsPage onNavigate={() => undefined} />)
		settingsTab("Policy")
		fireEvent.click(screen.getByRole("button", { name: "Change web research" }))
		fireEvent.click(screen.getByRole("radio", { name: /Only listed domains/ }))
		fireEvent.change(screen.getByLabelText("Domains"), { target: { value: "sec.gov\npastebin.com" } })
		expect(screen.getByRole("alert")).toHaveTextContent("pastebin.com is on MAXION's blocked list.")
		fireEvent.change(screen.getByLabelText("Domains"), { target: { value: "not a domain" } })
		expect(screen.getByRole("alert")).toHaveTextContent("isn't a domain")
		expect(screen.getByRole("button", { name: "Publish change" })).toBeDisabled()
	})

	it("keeps only the last four characters of a provider key, after a check that can refuse it", () => {
		vi.useFakeTimers()
		render(<SettingsPage onNavigate={() => undefined} />)
		settingsTab("Provider keys")
		fireEvent.click(screen.getByRole("button", { name: "Add Anthropic key" }))
		fireEvent.change(screen.getByLabelText("Anthropic API key"), { target: { value: "not-a-key" } })
		fireEvent.click(screen.getByRole("button", { name: "Check and save" }))
		act(() => { vi.advanceTimersByTime(900) })
		expect(screen.getByText(/Anthropic refused this key/)).toBeInTheDocument()
		fireEvent.change(screen.getByLabelText("Anthropic API key"), { target: { value: "sk-ant-test-0000000000000000wxyz" } })
		fireEvent.click(screen.getByRole("button", { name: "Check and save" }))
		act(() => { vi.advanceTimersByTime(900) })
		const key = readOrganization().keys.find((item) => item.provider === "anthropic")
		expect(key?.last4).toBe("wxyz")
		expect(JSON.stringify(readOrganization())).not.toContain("sk-ant-test")
		expect(screen.getByText(/•••• wxyz/)).toBeInTheDocument()
		vi.useRealTimers()
	})

	it("opens the audit log on the type another page asked for, and filters by person", () => {
		render(<SettingsPage onNavigate={() => undefined} />)
		act(() => requestSection({ section: "settings", tab: "audit", auditCategory: "membership" }))
		expect(screen.getByRole("tab", { name: "Audit log", selected: true })).toBeInTheDocument()
		const table = screen.getByRole("table", { name: "Audit events" })
		expect(within(table).queryByText("Connection checked")).not.toBeInTheDocument()
		expect(within(table).getByText("Invitation sent")).toBeInTheDocument()
		fireEvent.change(screen.getByRole("combobox", { name: "Type" }), { target: { value: "all" } })
		fireEvent.change(screen.getByRole("combobox", { name: "Person" }), { target: { value: "MAXION" } })
		expect(within(screen.getByRole("table", { name: "Audit events" })).getAllByRole("row").slice(1).every((row) => row.textContent?.includes("MAXION"))).toBe(true)
	})
})

describe("Organization: picking connections for new work", () => {
	beforeEach(() => { resetOrganizationStore() })

	it("offers the viewer's usable connections, holds back the ones that need fixing, and links to Integrations", () => {
		const onSection = vi.fn()
		window.addEventListener(SHELL_SECTION_EVENT, onSection)
		render(<ConnectionPicker work="Discovery" />)
		expect(screen.getByRole("checkbox", { name: /SharePoint/ })).toBeChecked()
		expect(screen.getByRole("checkbox", { name: /SAP S\/4HANA/ })).toBeDisabled()
		expect(screen.queryByRole("checkbox", { name: /Jira/ })).not.toBeInTheDocument()
		expect(screen.queryByText(/Andre Reyes/)).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole("checkbox", { name: /Salesforce/ }))
		expect(screen.getByText(/3 of 5 picked/)).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /Connect or fix an account in Integrations/ }))
		expect(onSection).toHaveBeenCalled()
		window.removeEventListener(SHELL_SECTION_EVENT, onSection)
	})
})

describe("Organization: review regressions", () => {
	beforeEach(() => { resetOrganizationStore(); resetKnowledgeStore() })
	afterEach(() => { vi.useRealTimers() })

	it("never saves a provider key when its dialog closes while the check is still running", () => {
		vi.useFakeTimers()
		render(<SettingsPage onNavigate={() => undefined} />)
		settingsTab("Provider keys")
		fireEvent.click(screen.getByRole("button", { name: "Add Anthropic key" }))
		fireEvent.change(screen.getByLabelText("Anthropic API key"), { target: { value: "sk-ant-test-0000000000000000wxyz" } })
		fireEvent.click(screen.getByRole("button", { name: "Check and save" }))
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
		act(() => { vi.advanceTimersByTime(1000) })
		expect(readOrganization().keys.find((key) => key.provider === "anthropic")?.last4).toBeNull()
	})

	it("audits a cancelled connection and ignores its verification timer", () => {
		vi.useFakeTimers()
		render(<IntegrationsPage />)
		fireEvent.click(screen.getByRole("button", { name: "Connect OneDrive" }))
		fireEvent.click(screen.getByRole("button", { name: /Continue to Microsoft 365/ }))
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
		advance(1500)
		expect(readOrganization().connections.some((connection) => connection.connector === "onedrive" && connection.ownerId === "root-admin")).toBe(false)
		expect(readOrganization().audit[0].action).toBe("Connection cancelled; sign-in revoked")
		expect(readOrganization().audit.some((event) => event.action === "Account verified")).toBe(false)
	})

	it("doesn't treat a suspended Owner as the last Owner, and releases a suspended member's seat", () => {
		render(<SettingsPage onNavigate={() => undefined} />)
		act(() => { changeRole("andre-reyes", "Owner"); setMemberStatus("andre-reyes", "suspended") })
		settingsTab("Members")
		expect(screen.getByText(/· 6 of 25 seats/)).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Manage Andre Reyes" }))
		expect(screen.queryByText(/is the only Owner/)).not.toBeInTheDocument()
		expect(screen.getByRole("radio", { name: /^Member/ })).toBeEnabled()
	})

	it("asks for a fresh sign-in to lower the sandbox network too", () => {
		vi.useFakeTimers()
		vi.setSystemTime(Date.now() + 20 * 60_000)
		render(<SettingsPage onNavigate={() => undefined} />)
		settingsTab("Policy")
		act(() => requestSection({ section: "settings", tab: "policy" }))
		fireEvent.click(screen.getByRole("button", { name: "Change sandbox network" }))
		fireEvent.click(screen.getByRole("radio", { name: /Named hosts/ }))
		fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Operational need" } })
		expect(screen.getByRole("button", { name: "Sign in again" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Publish change" })).toBeDisabled()
	})

	it("doesn't offer a connection for new work until it's given a project", () => {
		vi.useFakeTimers()
		render(<><IntegrationsPage /><ConnectionPicker work="engagement" /></>)
		fireEvent.click(screen.getByRole("button", { name: "Connect OneDrive" }))
		fireEvent.click(screen.getByRole("button", { name: /Continue to Microsoft 365/ }))
		advance(1200)
		fireEvent.click(within(screen.getByRole("dialog", { name: "Confirm the account" })).getByRole("button", { name: "Confirm account" }))
		const picker = screen.getByRole("region", { name: "Connections this engagement may use" })
		expect(within(picker).getByRole("checkbox", { name: /OneDrive/ })).toBeDisabled()
		expect(within(picker).getByText(/Not given to any project yet/)).toBeInTheDocument()
	})

	it("publishing an edited draft publishes it, under the same item", () => {
		const draft = saveItem({ section: "glossary", title: "Run rate", body: "Annualised revenue from the current month.", kind: "guidance", essential: false, visibility: "everyone" }, "draft")
		expect(draft).toMatchObject({ ok: true, state: "draft" })
		const id = draft.ok ? draft.id : ""
		const edited = saveItem({ section: "glossary", title: "Run rate", body: "Annualised revenue from the latest full month.", kind: "guidance", essential: false, visibility: "everyone" }, "draft", id)
		expect(edited).toMatchObject({ ok: true, id, state: "draft" })
		expect(publishDraft(id)).toMatchObject({ ok: true, id, state: "published" })
		expect(readKnowledge().items.filter((item) => item.title === "Run rate")).toHaveLength(1)
	})
})
