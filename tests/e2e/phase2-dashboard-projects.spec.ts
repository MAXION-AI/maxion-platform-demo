import { expect, test } from "@playwright/test"

test("creates a project, reads it back on Dashboard, and resumes its selected context", async ({ page }) => {
	await page.goto("/maxion-prototype")
	await page.evaluate(() => localStorage.clear())
	await page.reload()
	await expect(page.getByRole("heading", { name: "Work that moved. Decisions that wait." })).toBeVisible()

	await page.getByRole("button", { name: "Projects", exact: true }).click()
	await expect(page.getByRole("heading", { name: "Resume the work that matters." })).toBeVisible()

	await page.getByRole("button", { name: "New project" }).click()
	await page.getByLabel(/Project name/).fill("Finance controls uplift")
	await page.getByLabel(/Description/).fill("Tighten close controls across finance systems.")
	await page.getByRole("button", { name: "Review project" }).click()
	await expect(page.getByRole("dialog", { name: "Review new project" })).toContainText("Finance controls uplift")
	await page.getByRole("button", { name: "Create project", exact: true }).click()

	const portfolio = page.getByRole("region", { name: "Projects", exact: true })
	await expect(portfolio.getByText("Finance controls uplift")).toBeVisible()
	await page.getByRole("button", { name: "Dashboard", exact: true }).click()
	const summary = page.getByRole("region", { name: "Workspace summary" })
	await expect(summary.locator("article").filter({ hasText: "Active projects" }).getByText("4", { exact: true })).toBeVisible()

	const attention = page.locator(".mxp-needs-you article").filter({ hasText: "Finance controls uplift" })
	await attention.getByRole("button", { name: "Review" }).click()
	await expect(page.getByRole("heading", { name: "Finance controls uplift" })).toBeVisible()

	await page.getByLabel("Ask about selected project").fill("What is the next safe action?")
	await page.getByRole("button", { name: "Ask MAX" }).click()
	await expect(page.getByRole("status").filter({ hasText: "Finance controls uplift is needs you" })).toBeVisible()

	const createdRow = page.getByRole("button", { name: /Open Finance controls uplift/ })
	const customerRow = page.getByRole("button", { name: /Open Customer 360/ })
	await createdRow.focus()
	await createdRow.press("ArrowDown")
	await expect(createdRow).not.toBeFocused()
	await expect(page.locator(".mxp-project-row-open:focus")).toBeVisible()
	await customerRow.click()
	await page.getByRole("button", { name: "Request resume access" }).click()
	await expect(page.getByRole("status")).toContainText("Resuming work isn't available with Viewer access")
})
