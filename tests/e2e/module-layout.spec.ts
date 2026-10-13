import { expect, test } from "@playwright/test"

test("the Discovery library keeps every saved discovery readable on one row", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 960 })
	await page.emulateMedia({ reducedMotion: "reduce" })
	await page.goto("/discovery-prototype")
	await expect(page.getByRole("navigation", { name: "Portal sections" })).toBeVisible()
	const rows = page.locator(".discovery-record-card")
	await expect(rows).toHaveCount(3)
	for (const row of await rows.all()) {
		const box = await row.boundingBox(), title = await row.locator(".discovery-record-title").boundingBox()
		// One scannable row per record; see docs/visual-spec.md.
		expect(box!.height).toBeLessThanOrEqual(104)
		expect(title!.width).toBeGreaterThan(250)
	}
})

test("Dashboard metrics retain their category labels", async ({ page }) => {
	await page.goto("/maxion-prototype")
	const summary = page.getByRole("region", { name: "Workspace summary" })
	for (const label of ["Active projects", "Active discoveries", "Workspace units"]) await expect(summary.getByText(label, { exact: true })).toBeVisible()
	// Plan is disabled, so the dashboard no longer counts plans.
	await expect(summary.getByText("Plans created", { exact: true })).toHaveCount(0)
})

test("Discovery preserves ERP and ServiceNow starting templates", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	await page.getByRole("button", { name: "ERP modernization", exact: true }).click()
	const brief = page.getByRole("textbox", { name: "Discovery brief" })
	await expect(brief).toHaveValue(/ServiceNow.*MuleSoft.*Workday/)
	await page.getByRole("button", { name: "ServiceNow integration", exact: true }).click()
	await expect(brief).toHaveValue(/ServiceNow/)
	await expect(brief).toBeFocused()
})

test("Agentix direction stays beside work, persists, and retains scope through inspection", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/agentix-prototype")
  await page.locator(".aop-agent-card").filter({ hasText: "Revenue reconciliation" }).click()
  const composer = page.getByRole("textbox", { name: /^Message Revenue coordinator about Whole engagement/ })
  const box = await composer.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(720)
  await composer.fill("Pause intake")
  await composer.press("Enter")
  await expect(page.getByRole("button", { name: "Resume intake", exact: true })).toBeVisible()
  await expect(composer).toHaveValue("")
  await composer.fill("Draft for the revenue team")
  await page.getByRole("button", { name: "Details", exact: true }).click()
  await page.keyboard.press("Escape")
  await expect(composer).toHaveValue("Draft for the revenue team")
  await page.reload()
  await expect(composer).toHaveValue("Draft for the revenue team")
})
