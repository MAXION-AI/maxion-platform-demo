import { expect, test, type Page } from "@playwright/test"

/*
 * The plan's Discovery gates, driven through the real UI on a new everyday mission and on the seeds.
 * Reduced motion takes the instant paths, so nothing here waits on the page's animations.
 */
const BRIEF = "Define how ServiceNow should integrate with the internal financial controls platform for change approvals, evidence capture, and reconciliation."
const notice = (page: Page, id: string) => page.locator(`[data-notice="${id}"]`)
const toolbar = (page: Page) => page.locator(".package-actions")
const continueButton = (page: Page) => page.locator(".workspace-header").getByRole("button", { name: "Continue to Agentix" })
const simulate = async (page: Page, label: string) => {
	await page.getByRole("button", { name: "More Discovery actions" }).click()
	await page.getByRole("menuitem", { name: label }).click()
}

async function startMission(page: Page) {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	await page.getByRole("textbox", { name: "Discovery brief" }).fill(BRIEF)
	await page.getByLabel("Upload documents").setInputFiles([
		{ name: "controls-catalog.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(700_000) },
		{ name: "installer.exe", mimeType: "application/octet-stream", buffer: Buffer.alloc(100) },
	])
	await expect(page.locator('[data-file-state="ready"]')).toContainText("controls-catalog.pdf")
	await expect(page.locator('[data-file-state="refused"]')).toContainText(".exe files aren’t supported")
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await expect(page.getByRole("region", { name: "Outputs for this mission" })).toContainText("5 of 11 selected")
	await page.getByRole("checkbox", { name: "Mission authority reviewed" }).check()
	await page.getByRole("button", { name: "Create Discovery" }).click()
	const composer = page.getByRole("textbox", { name: "Message MAX" })
	await expect(composer).toBeVisible({ timeout: 10_000 })
	return composer
}

async function runToPackage(page: Page) {
	const composer = await startMission(page)
	await composer.fill("End the owner interview")
	await composer.press("Enter")
	await expect(notice(page, "briefs")).toContainText("4 interview briefs need your review")
	return { composer }
}

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
})

test("a new mission waits on its briefs, then its package, and only an approved version continues", async ({ page }) => {
	test.setTimeout(180_000)
	await runToPackage(page)
	// The run stays at the brief gate however long it is left.
	await page.waitForTimeout(3_000)
	await expect(page.getByRole("heading", { name: "Proposed ownership violates segregation of duties" })).toHaveCount(0)

	await notice(page, "briefs").getByRole("button", { name: "Review briefs" }).click()
	const sheet = page.getByRole("dialog", { name: "Interview briefs" })
	await expect(sheet).toContainText("Everything the interviewer holds counts as shown to the participant.")
	await sheet.getByRole("button", { name: "Approve all" }).click()
	await sheet.getByRole("button", { name: "Done" }).click()

	await expect(page.getByRole("heading", { name: "Proposed ownership violates segregation of duties" })).toBeVisible({ timeout: 25_000 })
	await page.getByRole("button", { name: "Open design resolution" }).click()
	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible({ timeout: 30_000 })
	await expect(continueButton(page)).toBeDisabled()
	await notice(page, "package").getByRole("button", { name: "Review package" }).click()

	const list = page.getByRole("navigation", { name: "Deliverable list" })
	await expect(list.getByRole("button")).toHaveCount(5)

	// The two ways to read one version, bound to the same hash.
	await list.getByRole("button", { name: /Project plan and WBS/ }).click()
	const reader = page.locator(".deliverable-reader")
	const hash = await reader.locator(".reader-verified-tag code").textContent()
	await reader.getByRole("button", { name: "Structured" }).click()
	await expect(reader.locator('[data-row-id="WBS-1.1"]')).toBeVisible()
	await expect(reader.locator(".reader-structured-bound")).toContainText(`v1 · ${hash}`)
	await reader.getByRole("button", { name: "Readable" }).click()

	// A colleague's change lands while the review is open: the old version is refused, and it leads to the new one.
	await simulate(page, "Simulate: a colleague edits")
	await toolbar(page).getByRole("button", { name: "Approve package v1" }).click()
	const stale = page.getByRole("dialog", { name: "Approve package v1" })
	await expect(stale.getByTestId("package-bound").locator("li")).toHaveCount(5)
	await stale.getByRole("button", { name: "Approve package v1" }).click()
	await expect(stale.getByRole("alert")).toContainText("Package v1 can no longer be approved")
	await stale.getByRole("button", { name: "Review v2" }).click()
	const current = page.getByRole("dialog", { name: "Approve package v2" })
	await current.getByRole("button", { name: "Approve package v2" }).click()
	await expect(current).toBeHidden()
	await expect(continueButton(page)).toBeEnabled()

	// Withdrawing closes it again; approving that version again reopens it.
	await toolbar(page).getByRole("button", { name: "Withdraw approval" }).click()
	await page.getByRole("dialog", { name: /Withdraw approval of package v2/ }).getByRole("button", { name: "Withdraw approval" }).click()
	await expect(continueButton(page)).toBeDisabled()

	// An edit is a new revision to review, and an edit that lost a race keeps its text.
	await simulate(page, "Simulate: a colleague edits")
	await reader.getByRole("button", { name: "Edit" }).click()
	const edit = page.getByRole("dialog", { name: "Edit Project plan and WBS" })
	await edit.getByRole("textbox", { name: "Section text" }).fill("My attempted text.")
	await edit.getByRole("button", { name: /Save version/ }).click()
	await expect(edit.getByRole("alert")).toContainText("so nothing was saved")
	await expect(edit.getByRole("textbox", { name: "Section text" })).toHaveValue("My attempted text.")
	await edit.getByRole("button", { name: /Save on top of/ }).click()
	await expect(edit).toBeHidden()

	await reader.getByRole("button", { name: "History" }).click()
	const history = page.getByRole("dialog", { name: "Project plan and WBS versions" })
	await history.getByRole("button", { name: /Compare with/ }).first().click()
	await expect(history.getByRole("region", { name: /Changes from/ })).toContainText("My attempted text.")
	await history.getByRole("button", { name: "Done" }).click()
})

test("evidence and held runs say what they are, and resume", async ({ page }) => {
	test.setTimeout(120_000)
	await startMission(page)
	await simulate(page, "Simulate: budget exhausted")
	await expect(notice(page, "budget")).toContainText("Budget reached: 240 of 240 work units")
	await notice(page, "budget").getByRole("button", { name: "Raise the limit to 300 and resume" }).click()
	await expect(notice(page, "budget")).toHaveCount(0)

	await simulate(page, "Simulate: connection revoked")
	await expect(notice(page, "connection")).toContainText("lost its connection")
	await page.getByRole("button", { name: "Open setup" }).click()
	await page.getByRole("button", { name: "Open connected sources" }).click()
	const sheet = page.getByRole("dialog", { name: "Connected sources" })
	await expect(sheet).toContainText("1 source needs reconnecting")
	await expect(sheet).not.toContainText("All sources healthy")
	await expect(sheet.locator('[data-file-state="ready"]')).toContainText("Uploaded · version 1")
	await sheet.getByRole("button", { name: "Done" }).click()
	await notice(page, "connection").getByRole("button", { name: /^Reconnect / }).click()
	await expect(notice(page, "connection")).toHaveCount(0)
})

test("seeded work keeps moving, and the public web is labelled wherever evidence appears", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "Resume NorthBridge acquisition diligence, Completed" }).click()
	await page.getByRole("button", { name: "Package", exact: true }).click()
	await expect(page.getByTestId("package-review-line")).toContainText("approved by Elena Park")
	await expect(continueButton(page)).toBeEnabled()
	await expect(page.locator(".citation-row").getByText(/^Public web ·/).first()).toBeVisible()
	await page.getByRole("button", { name: "Open setup" }).click()
	await page.getByRole("button", { name: "Open connected sources" }).click()
	const row = page.getByRole("dialog", { name: "Connected sources" }).locator('[data-evidence="public-web"]').first()
	await expect(row).toContainText("Public web")
	await expect(row).toContainText("Retrieved")
	await expect(row.getByRole("link")).toHaveAttribute("href", /^https:\/\//)
})
