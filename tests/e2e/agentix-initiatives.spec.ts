import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function enter(page: Page, name: string) {
	await page.goto("/agentix-prototype")
	await page.getByRole("region", { name: "Enterprise workflow examples" }).getByRole("button", { name: new RegExp(name) }).click()
	await page.getByRole("button", { name: "Import Discovery package", exact: true }).click()
}
async function activate(page: Page) {
	await page.getByRole("button", { name: "Activate initiative", exact: true }).click()
	await page.getByRole("button", { name: "Run sample case", exact: true }).click()
}
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }) })

test("Discovery sends a versioned future-state draft to Agentix without activation", async ({ page }) => {
	await page.goto("/maxion-prototype")
	await page.getByRole("button", { name: "Discover", exact: true }).click()
	const packages = page.getByRole("region", { name: "Operational redesign packages" })
	await expect(packages.getByRole("button")).toHaveCount(4)
	await packages.getByRole("button", { name: /Invoice exception resolution/ }).click()
	await expect(page.getByText("AP emails procurement and the warehouse separately.")).toBeVisible()
	await expect(page.getByText("Investigate invoice and receiving evidence in parallel.")).toBeVisible()
	await page.getByRole("button", { name: "Send to Agentix", exact: true }).click()
	await expect(page.getByText("Discovery package INVOICE-v1", { exact: true })).toBeVisible()
	await expect(page.getByRole("heading", { name: "3 agents, one accountable coordinator" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Run sample case" })).toHaveCount(0)
	await page.getByRole("button", { name: "View source", exact: true }).click()
	await expect(page.getByRole("main", { name: "Agentix initiatives" }).getByText("Bind the approval to this invoice version and exact $240 variance.")).toBeVisible()
})

test("one agent verifies a handoff without claiming incident resolution, and survives refresh", async ({ page }) => {
	const errors: string[] = []
	page.on("pageerror", error => errors.push(error.message))
	await enter(page, "Incident triage")
	await expect(page.getByRole("heading", { name: "One agent is sufficient" })).toBeVisible()
	await activate(page)
	await expect(page.getByRole("heading", { name: "Incident assigned. The right team has the context." })).toBeVisible()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toContainText("INC-10482 · Workplace support · Open")
	await expect(page.getByRole("progressbar", { name: "Case completion" })).toHaveAttribute("aria-valuenow", "4")
	await page.reload()
	await page.getByRole("region", { name: "Enterprise workflow examples" }).getByRole("button", { name: /Incident triage/ }).click()
	await expect(page.getByRole("heading", { name: "Incident assigned. The right team has the context." })).toBeVisible()
	expect(errors).toEqual([])
})

test("financial checks join, wait for exact approval, then verify the scoped outcome", async ({ page }) => {
	await enter(page, "Invoice exception resolution")
	await activate(page)
	await expect(page.getByRole("heading", { name: "Approve the $240 price variance?" })).toBeVisible()
	await expect(page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Agentix 1 pending" })).toBeVisible()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toHaveCount(0)
	await page.getByRole("button", { name: "Approve this variance", exact: true }).click()
	await expect(page.getByRole("heading", { name: "Exception resolved. Payment controls preserved." })).toBeVisible()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toContainText("payment remains outside this initiative")
	await expect(page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Agentix", exact: true })).toBeVisible()
})

test("declining a variance keeps the exception open", async ({ page }) => {
	await enter(page, "Invoice exception resolution")
	await activate(page)
	await page.getByRole("button", { name: "Decline variance", exact: true }).click()
	await expect(page.getByRole("heading", { name: "Variance declined. No ERP resolution was posted." })).toBeVisible()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toHaveCount(0)
	await expect(page.getByRole("button", { name: "Replay sample case" })).toBeVisible()
})

test("onboarding uses a human step without widening permissions", async ({ page }) => {
	await enter(page, "Employee onboarding")
	await expect(page.getByRole("button", { name: "Activate initiative" })).toBeDisabled()
	await page.getByRole("button", { name: "Keep payroll access as a human step" }).click()
	await activate(page)
	await expect(page.getByRole("heading", { name: "Payroll access needs its human owner" })).toBeVisible()
	await page.getByRole("button", { name: "Simulate owner fulfillment" }).click()
	await expect(page.getByRole("heading", { name: "Day-one readiness verified across HR and IT." })).toBeVisible()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toContainText("PAYROLL-306 · owner confirmation attached")
})

test("inventory reconciles the original ERP request before resuming", async ({ page }) => {
	await enter(page, "Inventory replenishment")
	await activate(page)
	await expect(page.getByRole("heading", { name: "ERP response lost. No duplicate request sent." })).toBeVisible()
	await page.getByRole("button", { name: "Simulate ERP read-back" }).click()
	await expect(page.getByRole("heading", { name: "Replenishment verified. No duplicate requisition." })).toBeVisible()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toContainText("1 create · 0 duplicates")
})

test("chat, pause and keyboard ownership preserve the same case", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "no-preference" })
	await enter(page, "Inventory replenishment")
	await activate(page)
	await page.getByRole("button", { name: "Pause at next boundary" }).click()
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("textbox", { name: "Ask about this initiative" })).toBeFocused()
	await page.getByRole("textbox", { name: "Ask about this initiative" }).fill("Why are multiple agents needed?")
	await page.getByRole("button", { name: "Send message to Agentix" }).click()
	await expect(page.getByRole("region", { name: "Initiative conversation" })).toContainText("One coordinator owns quantity selection")
	await page.getByRole("button", { name: "Dashboard", exact: true }).click()
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toBeVisible()
	await page.keyboard.press("Escape")
	await page.getByRole("button", { name: "Agentix", exact: true }).click()
	await expect(page.getByRole("button", { name: "Resume case" })).toBeVisible()
})

for (const width of [320, 375, 768, 1280]) {
	test(`Agentix is accessible at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 })
		await enter(page, "Invoice exception resolution")
		await expect(page.getByRole("button", { name: "Activate initiative" })).toBeVisible()
		expect(await page.locator(".axi-root").evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false)
		const scan = await new AxeBuilder({ page }).include(".axi-root").analyze()
		expect(scan.violations.filter(v => v.impact === "critical" || v.impact === "serious")).toEqual([])
	})
}

test("dark theme preserves contrast and the completed outcome", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
	await enter(page, "Incident triage")
	await activate(page)
	await expect(page.getByRole("heading", { name: "Incident assigned. The right team has the context." })).toBeVisible()
	const scan = await new AxeBuilder({ page }).include(".axi-root").analyze()
	expect(scan.violations.filter(v => v.impact === "critical" || v.impact === "serious")).toEqual([])
})
