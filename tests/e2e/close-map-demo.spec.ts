import { expect, test, type Page } from "@playwright/test"

/*
 * The close-mapping customer demo, driven the way a presenter drives it: from the demo address,
 * through a new Month-end close mapping Discovery and its approved package, into Knowledge, where
 * the package's findings wait as suggestions and are published one at a time. Nothing reaches
 * Agentix, and the everyday library is never touched.
 */
const DEMO = "/maxion-prototype?demo=close-map"
const DECISION = "The written close freezes the ledger after day 3; the ledger shows intercompany true-ups posting on day 4"

const dockRow = (page: Page) => page.locator(".mxd-dock-row")
const dock = (page: Page) => page.locator(".mxd-panel")
const composer = (page: Page) => page.getByRole("textbox", { name: "Message MAX" })
const waiting = (page: Page) => page.getByRole("region", { name: "Waiting on you" })

async function openDock(page: Page) {
	if (await dock(page).count()) return
	await dockRow(page).click()
	await expect(dock(page)).toBeVisible()
}
/* The presenter row's one action for the current beat. */
async function dockAction(page: Page, label: string) {
	await openDock(page)
	await dock(page).getByRole("button", { name: label, exact: true }).click()
}

/* The six scripted answers, the briefs, the owner's one decision, and the finished package. */
async function mapTheClose(page: Page) {
	await page.getByRole("region", { name: /template/i }).getByRole("button", { name: /Month-end close mapping/ }).first().click()
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await expect(page.getByRole("textbox", { name: "Mission name" })).toHaveValue("Month-end close: how it actually runs")
	await page.getByRole("checkbox", { name: "Mission authority reviewed" }).check()
	await page.getByRole("button", { name: "Create Discovery" }).click()
	await expect(composer(page)).toBeVisible({ timeout: 10_000 })
	for (let index = 0; index < 6; index++) {
		await openDock(page)
		await expect(dock(page)).toContainText(`Question ${index + 1} of 6`)
		await dock(page).getByRole("button", { name: /Fill answer/ }).click()
		await expect(composer(page)).toBeFocused()
		await composer(page).press("Enter")
		// The second answer is a suspicion; MAX goes to the journal log rather than writing the guess down.
		if (index === 1) await expect(page.getByText(/verify late postings in Journal entry log instead of asking you to guess/i)).toBeVisible()
	}
	await expect(dockRow(page)).toContainText("3/11")
	await page.locator('[data-notice="briefs"]').getByRole("button", { name: "Review briefs" }).click()
	const briefs = page.getByRole("dialog", { name: "Interview briefs" })
	await briefs.getByRole("button", { name: "Approve all" }).click()
	await briefs.getByRole("button", { name: "Done" }).click()
	await expect(page.getByRole("heading", { name: DECISION })).toBeVisible({ timeout: 25_000 })
	await expect(dockRow(page)).toContainText("4/11")
	await page.getByRole("button", { name: "Publish a controlled day-4 intercompany window" }).first().click()
	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible({ timeout: 30_000 })
}

/* One exact version approved (no charter to approve first), then the packet to Knowledge. */
async function sendToKnowledge(page: Page) {
	await page.getByRole("button", { name: "Package", exact: true }).click()
	// The six documents a mapping selects, with the Use case catalog as the process map and no charter.
	await expect(page.getByText("Use case catalog").first()).toBeVisible()
	const headerContinue = page.locator(".workspace-header").getByRole("button", { name: "Continue to Knowledge" })
	await expect(headerContinue).toBeDisabled()
	await page.locator(".package-actions").getByRole("button", { name: "Approve package v1" }).click()
	const approval = page.getByRole("dialog", { name: "Approve package v1" })
	await expect(approval.getByRole("button", { name: "Approve charter" })).toHaveCount(0)
	await approval.getByRole("button", { name: "Approve package v1" }).click()
	await expect(approval).toBeHidden()
	await expect(dockRow(page)).toContainText("7/11")
	await headerContinue.click()
	const handoff = page.getByRole("dialog", { name: "Continue to Knowledge" })
	await expect(handoff).toContainText("Opens in Knowledge")
	await expect(handoff).toContainText("Nothing is published until an Owner or Admin approves each one.")
	// A mapping needs none of the documents only Agentix requires.
	await expect(handoff).not.toContainText("removed by you")
	await handoff.getByRole("button", { name: "Continue to Knowledge" }).click()
	await expect(page.getByRole("heading", { name: "Knowledge", level: 1 })).toBeVisible({ timeout: 10_000 })
}

/* Approves the suggestion whose sheet is open. */
async function approveOpenSuggestion(page: Page, title: string) {
	const sheet = page.getByRole("complementary", { name: `${title} details` })
	await expect(sheet).toBeVisible()
	await sheet.getByRole("button", { name: "Approve and publish" }).click()
	await expect(sheet).toBeHidden()
}

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
})

test("the close-mapping demo runs from a new Discovery to published Knowledge", async ({ page, context }) => {
	test.setTimeout(240_000)
	const errors: string[] = []
	page.on("pageerror", error => errors.push(error.message))
	page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })

	await page.goto(DEMO)
	await expect(dockRow(page)).toContainText("1/11")
	await mapTheClose(page)
	// No charter is selected, so the package is read on the approval step itself.
	await expect(dockRow(page)).toContainText("6/11")
	await sendToKnowledge(page)

	// Eight suggestions wait, each citing where it came from; nothing was published by sending them.
	await expect(dockRow(page)).toContainText("8/11")
	const pending = waiting(page)
	for (const title of ["Month-end close", "US intercompany elimination", "Key systems and who owns them", "No ledger changes after day 3 of the close", "Day-3 freeze", "Intercompany true-up", "Elimination workbook", "Flash report"]) {
		await expect(pending.getByRole("button", { name: `Review suggestion: ${title}`, exact: true })).toBeVisible()
	}
	await expect(pending).toContainText("Suggested by Discovery · Month-end close: how it actually runs")

	// Beat 8: the first one reviewed, with its source.
	await pending.getByRole("button", { name: "Review suggestion: Key systems and who owns them", exact: true }).click()
	const systems = page.getByRole("complementary", { name: "Key systems and who owns them details" })
	await expect(systems).toContainText("Cited source: Technical assessment, package v1 · Systems of record")
	await expect(systems).toContainText("What changes from v2")
	await approveOpenSuggestion(page, "Key systems and who owns them")
	await expect(dockRow(page)).toContainText("9/11")

	// Beat 9: the corrected procedure, opened from the presenter row; it settles the threshold conflict.
	await expect(pending.getByRole("button", { name: "Review conflict: Two approval thresholds" })).toBeVisible()
	await dockAction(page, "Open the procedure")
	const procedure = page.getByRole("complementary", { name: "Month-end close details" })
	await expect(procedure).toContainText("Cited source: Use case catalog, package v1 · The close as performed")
	await expect(procedure).toContainText("What changes from v4")
	await expect(procedure).toContainText("Publishing makes this v5 of Month-end close")
	await expect(procedure).toContainText("It also settles the open conflict “Two approval thresholds”")
	await approveOpenSuggestion(page, "Month-end close")
	await expect(pending.getByRole("button", { name: "Review conflict: Two approval thresholds" })).toHaveCount(0)
	await expect(page.getByRole("button", { name: /^Month-end close · Published v5/ })).toBeVisible()
	await expect(dockRow(page)).toContainText("10/11")

	// Beat 10: the elimination arrives restricted to Finance, and stays that way.
	await dockAction(page, "Open the restricted procedure")
	const elimination = page.getByRole("complementary", { name: "US intercompany elimination details" })
	await expect(elimination).toContainText("Only Sarah Liu, Luca Romano, Hannah Brooks")
	await approveOpenSuggestion(page, "US intercompany elimination")
	await expect(dockRow(page)).toContainText("11/11")

	// A reload keeps what was approved, and the story's place.
	await page.reload()
	await expect(dockRow(page)).toContainText("11/11")
	await page.getByRole("navigation").getByRole("button", { name: /^Knowledge/ }).first().click()
	await expect(page.getByRole("button", { name: /^Month-end close · Published v5/ })).toBeVisible()
	await expect(waiting(page).getByRole("button", { name: /^Review suggestion: (Day-3 freeze|Flash report)$/ })).toHaveCount(2)

	// The everyday prototype's library is its own: still v4, with the conflict open.
	const everyday = await context.newPage()
	await everyday.goto("/maxion-prototype?section=knowledge")
	await expect(everyday.getByRole("button", { name: /^Month-end close · Published v4/ })).toBeVisible()
	await expect(everyday.getByRole("button", { name: "Review conflict: Two approval thresholds" })).toBeVisible()
	await expect(everyday.getByRole("button", { name: "Review suggestion: Flash report", exact: true })).toHaveCount(0)
	await everyday.close()

	expect(errors).toEqual([])
})

test("the short close-mapping demo starts at the finished package", async ({ page }) => {
	test.setTimeout(120_000)
	await page.goto(`${DEMO}&start=package`)
	await expect(page.getByRole("button", { name: "Package", exact: true })).toBeVisible({ timeout: 10_000 })
	await expect(dockRow(page)).toContainText("6/11")
	await sendToKnowledge(page)
	await expect(dockRow(page)).toContainText("8/11")
	await expect(waiting(page).getByRole("button", { name: "Review suggestion: Month-end close", exact: true })).toBeVisible()
})
