import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function enter(page: Page) { await page.goto("/agentix-prototype"); await expect(page.getByRole("main", { name: "Agentix workspace" })).toBeVisible() }
async function selectWork(page: Page, title: string) {
	const show = page.getByRole("button", { name: "Show all work" })
	if (await show.isVisible()) await show.click()
	await page.getByRole("navigation", { name: "Initiatives" }).getByRole("button", { name: new RegExp(title) }).click()
}
async function send(page: Page, text: string) { await page.getByLabel("Message Agentix", { exact: true }).fill(text); await page.getByRole("button", { name: "Send message to Agentix" }).click() }

test("the default workspace shows team, activity and a pinned input without a setup tour", async ({ page }) => {
	await enter(page)
	await expect(page.getByRole("region", { name: "Agent team" })).toContainText("AP coordinator")
	await expect(page.getByRole("region", { name: "Agent activity" })).toContainText("Investigate two evidence paths")
	await expect(page.getByLabel("Message Agentix", { exact: true })).toBeInViewport()
	await expect(page.getByText(/sample run|run sample|replay sample/i)).toHaveCount(0)
	await page.getByRole("button", { name: "Activity 1 of 5 steps complete" }).click()
	await expect(page.getByRole("region", { name: "Agent activity" }).locator(".agw-timeline")).toBeHidden()
})

test("owner steering changes work and persists through navigation and reload", async ({ page }) => {
	await enter(page)
	await page.getByRole("button", { name: "Pause work", exact: true }).click()
	await send(page, "Make this high priority")
	await expect(page.getByRole("region", { name: "Initiative conversation" })).toContainText("Marked high priority")
	await page.getByLabel("Message Agentix", { exact: true }).fill("An unfinished direction")
	await page.reload()
	await expect(page.getByLabel("Message Agentix", { exact: true })).toHaveValue("An unfinished direction")
	await expect(page.getByRole("button", { name: "Resume work", exact: true })).toBeVisible()
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Dashboard", exact: true }).click()
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: /^Agentix/ }).click()
	await expect(page.getByLabel("Message Agentix", { exact: true })).toHaveValue("An unfinished direction")
	await send(page, "Resume")
	await expect(page.getByRole("heading", { name: "Approve the $240 price variance?" })).toBeVisible({ timeout: 15000 })
})

test("one agent completes a verified ServiceNow handoff, not incident resolution", async ({ page }) => {
	await enter(page)
	await selectWork(page, "Incident triage")
	await expect(page.getByRole("region", { name: "Agent team" })).toContainText("1 agent")
	await page.getByRole("button", { name: "Triage this incident" }).click()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toContainText("INC-10482 · Workplace support · Open", { timeout: 22000 })
	await expect(page.getByRole("region", { name: "Agent activity" })).toContainText("4 of 4 steps complete")
	await page.reload()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toBeVisible()
})

test("held notifications remain partial until explicitly released, without repeating completed work", async ({ page }) => {
	await enter(page)
	await send(page, "Hold notifications")
	await expect(page.getByRole("heading", { name: "Approve the $240 price variance?" })).toBeVisible({ timeout: 15000 })
	await send(page, "Continue")
	await expect(page.getByRole("button", { name: "Approve $240 variance" })).toBeVisible()
	await page.getByRole("button", { name: "Approve $240 variance" }).click()
	await expect(page.getByRole("region", { name: "Held notification" })).toBeVisible({ timeout: 22000 })
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toHaveCount(0)
	await expect(page.getByRole("region", { name: "Agent activity" })).toContainText("4 of 5 steps complete")
	await page.getByRole("button", { name: "Allow the notification" }).click()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toContainText("Payment controls preserved", { timeout: 8000 })
})

test("declining does not claim success", async ({ page }) => {
	await enter(page)
	await page.getByRole("button", { name: "Decline", exact: true }).click({ timeout: 15000 })
	await expect(page.getByRole("heading", { name: "Variance declined. The exception stays open." })).toBeVisible()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toHaveCount(0)
})

test("Discovery landing prioritizes its existing work and hands a design into the same Agentix workspace", async ({ page }) => {
	await page.goto("/maxion-prototype")
	await page.getByRole("button", { name: "Discover", exact: true }).click()
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	const index = page.locator(".discovery-index-results")
	const packages = page.getByRole("region", { name: "Operational redesign packages" })
	expect(await index.evaluate(node => !!(node.compareDocumentPosition(document.querySelector('.agw-discovery-packages')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true)
	await packages.locator("summary").click()
	await packages.getByRole("button", { name: /Employee onboarding/ }).click()
	await page.getByRole("button", { name: "Send to Agentix" }).click()
	await expect(page.getByRole("region", { name: "Proposed operating plan" })).toBeVisible()
	await expect(page.getByRole("region", { name: "Agent team" })).toContainText("HR specialist")
	await page.getByRole("button", { name: "Activate and start" }).click()
	await expect(page.getByRole("region", { name: "Human fulfillment" })).toBeVisible({ timeout: 18000 })
	await page.getByRole("button", { name: "Confirm fulfillment" }).click()
	await expect(page.getByRole("alert")).toContainText("Add a fulfillment reference")
	await page.getByLabel(/Fulfillment reference/).fill("PAYROLL-306/OWNER-2")
	await page.getByRole("button", { name: "Confirm fulfillment" }).click()
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toContainText("Day-one readiness verified", { timeout: 16000 })
})

test("inventory recovery is autonomous and visible", async ({ page }) => {
	await enter(page)
	await selectWork(page, "Inventory replenishment")
	await page.getByRole("button", { name: "Run stock review now" }).click()
	await expect(page.locator(".agw-step.is-current")).toContainText("Reconcile an uncertain ERP submission", { timeout: 12000 })
	await expect(page.getByRole("region", { name: "Verified outcome evidence" })).toContainText("1 create · 0 duplicates", { timeout: 18000 })
	await expect(page.getByRole("button", { name: /Simulate ERP/ })).toHaveCount(0)
})

test("new work accepts a brief, proposes a scope and preserves unsupported input", async ({ page }) => {
	await enter(page)
	await page.getByRole("button", { name: "New work", exact: true }).click()
	await page.getByLabel("Describe your operational need").fill("Manage something outside this prototype")
	await page.getByRole("button", { name: "Prepare operating plan" }).click()
	await expect(page.getByRole("status")).toContainText("Your brief is preserved")
	await page.getByLabel("Describe your operational need").fill("Coordinate employee onboarding")
	await page.getByRole("button", { name: "Prepare operating plan" }).click()
	await expect(page.getByRole("region", { name: "Proposed operating plan" })).toBeVisible()
	await expect(page.getByRole("region", { name: "Initiative conversation" })).toContainText("Coordinate employee onboarding")
})

for (const width of [320, 375, 768, 1280, 1440]) {
	test(`workspace remains usable and accessible at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 })
		await page.emulateMedia({ reducedMotion: "reduce" })
		await enter(page)
		await expect(page.getByLabel("Message Agentix", { exact: true })).toBeInViewport()
		expect(await page.locator(".agw-root").evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false)
		await selectWork(page, "Employee onboarding")
		await expect(page.getByRole("button", { name: "Activate and start" })).toBeVisible()
		const context = page.getByRole("button", { name: "Show agent context" })
		if (await context.isVisible()) { await context.click(); await expect(page.getByRole("region", { name: "Agent team" })).toBeVisible(); await page.getByRole("button", { name: "Close agent context" }).click() }
		const scan = await new AxeBuilder({ page }).include(".agw-root").analyze()
		expect(scan.violations.filter(v => v.impact === "critical" || v.impact === "serious")).toEqual([])
	})
}

test("dark theme and keyboard controls retain contrast and the same work", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
	await enter(page)
	await page.getByRole("button", { name: "Pause work", exact: true }).click()
	await page.getByLabel("Message Agentix", { exact: true }).fill("Why this team?")
	await page.getByLabel("Message Agentix", { exact: true }).press("Enter")
	await expect(page.getByRole("region", { name: "Initiative conversation" })).toContainText("single ERP write")
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toBeVisible()
	await page.keyboard.press("Escape")
	const scan = await new AxeBuilder({ page }).include(".agw-root").analyze()
	expect(scan.violations.filter(v => v.impact === "critical" || v.impact === "serious")).toEqual([])
})
