import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("crosses Consult and every administrative surface with bounded, recoverable state", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
	await page.goto("/maxion-prototype")
	const navigation = page.getByRole("navigation", { name: "Portal sections" })

	await navigation.getByRole("button", { name: "Consult Max" }).click()
	await page.getByRole("button", { name: "New conversation" }).click()
	await expect(page.getByRole("heading", { name: "What do you need to decide?" })).toBeVisible()
	await page.getByRole("button", { name: "What needs my attention?" }).click()
	await page.getByRole("button", { name: "Send to Consult MAX" }).click()
	await expect(page.locator(".cmx-max-message")).toBeVisible()
	await expect(page.getByRole("complementary", { name: "Consult sources" })).toContainText("ERP modernization only")

	await navigation.getByRole("button", { name: "Settings" }).click()
	await expect(page.getByRole("heading", { name: "Workspace controls" })).toBeVisible()
	await page.getByRole("textbox", { name: "Workspace name" }).fill("Northwind Operating Demo")
	await page.locator(".adm-header").getByRole("button", { name: "Save changes" }).click()
	await expect(page.getByText(/Saved by Root Admin/)).toBeVisible()

	await navigation.getByRole("button", { name: "Integrations" }).click()
	await expect(page.getByRole("heading", { name: "Connected systems" })).toBeVisible()
	await page.getByPlaceholder("Search systems or principals").fill("Slack")
	await page.getByRole("button", { name: "Reconnect" }).click()
	await expect(page.getByText("Slack reconnected without widening its scope.")).toBeVisible()

	await navigation.getByRole("button", { name: /^My approvals/ }).click()
	await expect(page.getByRole("heading", { name: "Decisions assigned to you" })).toBeVisible()
	await expect(page.getByRole("region", { name: "Selected approval" })).toContainText("INV-20841")

	await navigation.getByRole("button", { name: "Usage" }).click()
	await expect(page.getByRole("heading", { name: "Workspace units" })).toBeVisible()
	await page.getByRole("button", { name: "View records" }).click()
	await expect(page.getByRole("region", { name: "Bounded usage records" })).toContainText("10,000 records · 25 mounted")

	await navigation.getByRole("button", { name: "Help" }).click()
	await expect(page.getByRole("heading", { name: "Guidance in context" })).toBeVisible()
	await page.getByRole("textbox", { name: "Search help" }).fill("usage")
	await expect(page.getByRole("button", { name: /Understand workspace units/ })).toBeVisible()

	const accessibility = await new AxeBuilder({ page }).include(".adm-root").analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([])

	await page.reload()
	await navigation.getByRole("button", { name: "Settings" }).click()
	await expect(page.getByRole("textbox", { name: "Workspace name" })).toHaveValue("Northwind Operating Demo")
})

test("keeps the bottom administrative cluster usable on mobile", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto("/maxion-prototype")

	for (const [destination, heading] of [
		["Settings", "Workspace controls"],
		["Help", "Guidance in context"],
	] as const) {
		await page.getByRole("button", { name: "Open navigation" }).click()
		const navigation = page.getByRole("navigation", { name: "Portal sections" })
		await expect(navigation.getByRole("button", { name: destination })).toBeVisible()
		await navigation.getByRole("button", { name: destination }).click()
		await expect(page.getByRole("heading", { name: heading })).toBeVisible()
	}

	const dimensions = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}))
	expect(dimensions.scrollWidth).toBe(dimensions.clientWidth)
})
