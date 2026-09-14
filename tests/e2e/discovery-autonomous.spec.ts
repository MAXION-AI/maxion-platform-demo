import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("answers, resolves a gap, recovers offline, and hands a versioned package to Plan", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()) })
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Discover" }).click()
	await expect(page.getByRole("region", { name: "Discover interview workspace" })).toBeVisible()
	await expect(page.getByRole("complementary", { name: "Interview plan" })).toBeVisible()
	await expect(page.getByRole("main")).toBeVisible()
	await expect(page.getByRole("complementary", { name: "Evidence, facts, and gaps" })).toBeVisible()

	const composer = page.getByRole("textbox", { name: "Answer MAX" })
	await composer.fill("The project owner may approve planning inputs, but execution permissions stay unchanged.")
	await composer.press("Enter")
	await page.getByRole("button", { name: "Facts" }).click()
	await expect(page.getByRole("complementary", { name: "Evidence, facts, and gaps" }).getByText("The project owner may approve planning inputs, but execution permissions stay unchanged.")).toBeVisible()

	await page.getByRole("button", { name: /^Gaps 1$/ }).click()
	await page.getByRole("button", { name: "Resolve from policy source" }).click()
	await expect(page.getByText("Evidence boundary closed")).toBeVisible()

	await page.getByRole("button", { name: "Pause" }).click()
	await expect(page.getByText("Interview paused")).toBeVisible()
	await page.getByRole("button", { name: "Resume interview" }).click()
	await expect(page.getByRole("status")).toContainText("Interview active")

	await composer.fill("Preserve this draft while the provider is unavailable.")
	await page.getByRole("button", { name: "Test provider recovery" }).click()
	await expect(page.getByText("Provider connection lost")).toBeVisible()
	await expect(composer).toHaveValue("Preserve this draft while the provider is unavailable.")
	await page.getByRole("button", { name: "Retry connection" }).click()
	await expect(page.getByRole("status")).toContainText("Interview active")
	await expect(composer).toHaveValue("Preserve this draft while the provider is unavailable.")

	await page.getByRole("button", { name: "Create package for Plan" }).click()
	await expect(page.getByText(/Discovery package v1 · 3 sources/)).toBeVisible()
	await expect(page.getByText("ERP modernization delivery plan")).toBeVisible()

	const accessibility = await new AxeBuilder({ page }).analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	expect(runtimeErrors).toEqual([])
})
