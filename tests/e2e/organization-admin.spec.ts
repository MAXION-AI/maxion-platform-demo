import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

/*
 * The planned surfaces the demo didn't have (maxion-agent-platform docs 08, 13, 21, 22): the
 * organization's own administration in Settings, Integrations on the plan's connection model,
 * organization Knowledge, the connection picker in Discover, and MAXION's staff admin panel.
 */
const PHONE = { width: 390, height: 844 }
const seriousViolations = async (page: Page) =>
	(await new AxeBuilder({ page }).analyze()).violations.filter(violation => violation.impact === "critical" || violation.impact === "serious")

/* Every painted element inside the root stays inside the viewport, unless it lives in a sideways scroller. */
async function overflowing(page: Page, root: string) {
	return page.evaluate(selector => {
		const scope = document.querySelector(selector)
		if (!scope) return ["(missing root)"]
		const inScroller = (node: Element) => {
			for (let parent = node.parentElement; parent; parent = parent.parentElement) {
				const style = getComputedStyle(parent)
				if ((style.overflowX === "auto" || style.overflowX === "scroll") && parent.scrollWidth > parent.clientWidth) return true
			}
			return false
		}
		return [...scope.querySelectorAll("*")]
			.filter(node => { const box = node.getBoundingClientRect(); return box.width > 0 && box.right > innerWidth + 1 && getComputedStyle(node).visibility === "visible" && !inScroller(node) })
			.map(node => `${node.tagName.toLowerCase()}.${String(node.className).split(" ")[0]}`)
	}, root)
}

test("Settings is the organization's administration: members, policy, keys and the audit log", async ({ page }) => {
	await page.goto("/maxion-prototype?section=settings")
	await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible()
	await expect(page.getByRole("tab", { name: "General", selected: true })).toBeVisible()
	expect(await seriousViolations(page)).toEqual([])

	await page.getByRole("tab", { name: "Members" }).click()
	await page.getByRole("button", { name: "Invite member" }).click()
	const invite = page.getByRole("dialog", { name: "Invite a member" })
	await invite.getByLabel("Email address").fill("lena.ortiz@northstar.com")
	await invite.getByRole("radio", { name: /^Admin/ }).check()
	await invite.getByRole("button", { name: "Send invitation" }).click()
	// Axe reads the page once the dialog has finished leaving, not mid-fade.
	await expect(invite).toBeHidden()
	await expect(page.getByText("lena.ortiz@northstar.com", { exact: true })).toBeVisible()
	expect(await seriousViolations(page)).toEqual([])

	await page.getByRole("tab", { name: "Policy" }).click()
	await page.getByRole("button", { name: "Change sandbox network" }).click()
	const network = page.getByRole("dialog", { name: "Change Agentix sandbox network" })
	await expect(network.getByRole("radio", { name: /Full internet/ })).toBeDisabled()
	await network.getByRole("radio", { name: /Named hosts/ }).check()
	await network.getByLabel("Reason").selectOption("Operational need")
	await network.getByRole("button", { name: "Publish change" }).click()
	await expect(network).toBeHidden()
	await expect(page.getByRole("status").filter({ hasText: "Sandbox network" })).toContainText(/saved; enforcement not yet reported|applied to new work/)
	await expect(page.getByRole("status").filter({ hasText: "Sandbox network" })).toContainText("applied to new work")

	await page.getByRole("tab", { name: "Audit log" }).click()
	const log = page.getByRole("table", { name: "Audit events" })
	await expect(log.getByRole("row").filter({ hasText: "Policy published" }).first()).toContainText("Sandbox network · revision 15")
	await expect(log.getByRole("row").filter({ hasText: "Invitation sent" }).first()).toContainText("Admin invitation")
	expect(await seriousViolations(page)).toEqual([])
})

test("an account connects, gets its projects, and the audit log records each step", async ({ page }) => {
	await page.goto("/maxion-prototype?section=integrations")
	await page.getByRole("button", { name: "Connect OneDrive" }).click()
	await page.getByRole("button", { name: /Continue to Microsoft 365/ }).click()
	await page.getByRole("dialog", { name: "Confirm the account" }).getByRole("button", { name: "Confirm account" }).click()
	await page.getByRole("button", { name: /Choose projects/ }).click()
	const sheet = page.getByRole("complementary", { name: "OneDrive connection" })
	await expect(sheet.getByRole("checkbox", { name: /Customer 360/ })).toBeDisabled()
	await sheet.getByRole("checkbox", { name: /ERP modernization/ }).check()
	await sheet.getByRole("button", { name: "Save projects" }).click()
	await expect(page.getByText("OneDrive can now be used in ERP modernization.")).toBeVisible()
	expect(await seriousViolations(page)).toEqual([])
	await page.keyboard.press("Escape")

	await page.getByRole("button", { name: "Audit log" }).click()
	await expect(page.getByRole("tab", { name: "Audit log", selected: true })).toBeVisible()
	const log = page.getByRole("table", { name: "Audit events" })
	await expect(log.getByRole("row").filter({ hasText: "Project access granted" }).first()).toContainText("OneDrive · personal")
	await expect(log.getByRole("row").filter({ hasText: "Connection activated" }).first()).toBeVisible()
})

test("Knowledge sits beside Integrations and its review queue is the one thing waiting", async ({ page }) => {
	await page.goto("/maxion-prototype")
	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: /^Knowledge/ }).click()
	await expect(page).toHaveURL(/section=knowledge$/)
	await expect(page.getByRole("heading", { name: "Knowledge", level: 1 })).toBeVisible()
	await expect(page.getByRole("region", { name: "Waiting on you" })).toBeVisible()
	expect(await seriousViolations(page)).toEqual([])
})

test("a new Discovery picks which connections it may read through", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	await page.getByRole("textbox", { name: "Discovery brief" }).fill("Resolve the highest-risk vendor onboarding decision with evidence.")
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	const picker = page.getByRole("region", { name: "Connections this Discovery may use" })
	await expect(picker).toBeVisible({ timeout: 15000 })
	await expect(picker.getByRole("checkbox", { name: /SAP S\/4HANA/ })).toBeDisabled()
	await picker.getByRole("checkbox", { name: /QuickBooks Online/ }).uncheck()
	await expect(page.locator(".authority-review")).toContainText("3 picked · SharePoint, Salesforce, ServiceNow")
	await picker.getByRole("button", { name: /Connect or fix an account in Integrations/ }).click()
	await expect(page.getByRole("heading", { name: "Integrations", level: 1 })).toBeVisible()
})

test("the organization pages fit a phone without clipping", async ({ page }) => {
	await page.setViewportSize(PHONE)
	for (const section of ["settings", "integrations", "knowledge"]) {
		await page.goto(`/maxion-prototype?section=${section}`)
		await page.waitForTimeout(400)
		expect(await overflowing(page, ".mxp-stage-view:not([hidden])"), section).toEqual([])
	}
	await page.goto("/maxion-prototype?section=integrations")
	await page.getByRole("button", { name: "Manage SharePoint" }).click()
	expect(await overflowing(page, ".acc-panel")).toEqual([])
})

test("MAXION's staff admin panel lists tenants and explains each control's effective value", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 })
	await page.goto("/maxion-admin")
	await expect(page.getByRole("heading", { name: "Tenants", level: 1 })).toBeVisible()
	expect(await seriousViolations(page)).toEqual([])
	await page.getByRole("button", { name: /Northstar Consulting/ }).first().click()
	await expect(page.getByRole("heading", { name: "Northstar Consulting", level: 1 })).toBeVisible()
	await page.getByRole("tab", { name: "Models" }).click()
	await expect(page.getByText(/The customer narrowed this to GPT-6 Luna/)).toBeVisible()
	expect(await seriousViolations(page)).toEqual([])
})
