import { expect, test, type Page } from "@playwright/test"

/*
 * The customer demo, driven the way a presenter drives it: from the demo
 * address, through a new revenue Discovery, the handoff, and the Agentix
 * engagement to a verified morning, using the presenter row for the scripted
 * answers. Discovery runs on its own timers; Agentix is moved on with its Demo
 * controls, as a presenter would.
 */
const DEMO = "/maxion-prototype?demo=revenue"
const EVERYDAY_DISCOVERY = "maxion.prototype.discovery-records.v1"
const EVERYDAY_AGENTIX = "maxion-agentix-operations-v4"

const dockRow = (page: Page) => page.locator(".mxd-dock-row")
const composer = (page: Page) => page.getByRole("textbox", { name: "Message MAX" })

async function openDock(page: Page) {
	if (await page.locator(".mxd-panel").count()) return
	await dockRow(page).click()
	await expect(page.locator(".mxd-panel")).toBeVisible()
}
async function demoControls(page: Page, button: string, times = 1) {
	await page.getByRole("button", { name: "Controls", exact: true }).click()
	for (let i = 0; i < times; i++) await page.getByRole("button", { name: button, exact: true }).click()
	await page.getByRole("button", { name: "Close controls" }).click()
}

const replaceNote = (page: Page) => page.getByRole("note").filter({ hasText: "Customer demo:" })

async function startRevenueDiscovery(page: Page, beforeCreate?: () => Promise<void>) {
	await page.getByRole("region", { name: /template/i }).getByRole("button", { name: /Revenue reconciliation/ }).first().click()
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await expect(page.getByRole("textbox", { name: "Mission name" })).toHaveValue("Revenue reconciliation: SQL Server to AWS")
	await beforeCreate?.()
	await page.getByRole("checkbox", { name: "Mission authority reviewed" }).check()
	await page.getByRole("button", { name: "Create Discovery" }).click()
	await expect(composer(page)).toBeVisible({ timeout: 10_000 })
}

/* The six scripted answers from the presenter row, the owner's one decision, and the finished package. */
async function finishDiscovery(page: Page) {
	for (let index = 0; index < 6; index++) {
		await openDock(page)
		await expect(page.locator(".mxd-panel")).toContainText(`Question ${index + 1} of 6`)
		await page.locator(".mxd-panel").getByRole("button", { name: /Fill answer/ }).click()
		await expect(composer(page)).toBeFocused()
		await composer(page).press("Enter")
	}
	await expect(page.getByRole("heading", { name: "The close workbooks convert currency on a different date than the ledger" })).toBeVisible({ timeout: 25_000 })
	await page.getByRole("button", { name: "Adopt posting-date rates" }).first().click()
	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible({ timeout: 30_000 })
}

/* The charter approval, then the packet to Agentix. */
async function handOff(page: Page) {
	await page.locator(".workspace-header").getByRole("button", { name: "Continue to Agentix" }).click()
	const handoff = page.getByRole("dialog", { name: "Continue to Agentix" })
	await handoff.getByRole("button", { name: "Approve charter" }).click()
	const charter = page.getByRole("dialog", { name: "Approve the project charter" })
	await charter.getByRole("textbox", { name: "Approval reason" }).fill("Scope, owners and the five exclusions match what finance leadership agreed.")
	await charter.getByRole("button", { name: "Approve charter" }).click()
	await handoff.getByRole("button", { name: "Continue to Agentix" }).click()
}

const savedDemo = (page: Page) => page.evaluate(() => ({
	discovery: JSON.parse(localStorage.getItem("maxion.prototype.discovery-records.v1::demo-revenue") ?? "[]") as { id: string; scenarioKey: string }[],
	agentix: JSON.parse(localStorage.getItem("maxion-agentix-operations-v4::demo-revenue") ?? "null"),
}))

/* The handed-over package opens as a new engagement: answer, run the read-only check, activate. */
async function createEngagement(page: Page) {
	await expect(page.getByRole("heading", { name: "Review Revenue reconciliation" })).toBeVisible({ timeout: 10_000 })
	await expect(page.getByText(/From Discovery · Revenue reconciliation: SQL Server to AWS · packet HP-/)).toBeVisible()
	await expect(dockRow(page)).toContainText("6/12")
	const questions = page.locator(".aop-questions")
	await questions.getByText("Ask me before each pipeline release").click()
	await questions.getByText("The synthetic 30-day sample").click()
	await page.getByRole("button", { name: "Run the read-only check" }).click()
	await expect(page.getByText("Read-only check passed. Nothing was written.")).toBeVisible({ timeout: 10_000 })
	await page.getByRole("button", { name: /Activate engagement/ }).click()
	await expect(page.locator('[data-work="MS-1"]').first()).toBeVisible()
}

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
})

test("the revenue demo runs from a new Discovery to a verified morning in Agentix", async ({ page }) => {
	test.setTimeout(240_000)
	const errors: string[] = []
	page.on("pageerror", error => errors.push(error.message))
	page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })

	await page.goto(DEMO)
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await expect(dockRow(page)).toContainText("1/12")
	// The first revenue Discovery replaces nothing, so the setup doesn't say it will.
	await startRevenueDiscovery(page, () => expect(replaceNote(page)).toHaveCount(0))
	await expect(page.locator(".workspace-header")).toContainText("Revenue reconciliation: SQL Server to AWS")
	await expect(page.locator(".workspace-header").getByRole("button", { name: "Continue to Agentix" })).toBeDisabled()

	// The six scripted answers, each filled by the presenter row and sent with Enter.
	const topics = ["Reconciliation gaps · 2 of 6", "Tolerance · 3 of 6", "Recognition rules · 4 of 6", "Release authority · 5 of 6", "Success measure · 6 of 6"]
	for (let index = 0; index < 6; index++) {
		await openDock(page)
		await expect(page.locator(".mxd-panel")).toContainText(`Question ${index + 1} of 6`)
		await page.locator(".mxd-panel").getByRole("button", { name: /Fill answer/ }).click()
		await expect(page.locator(".mxd-panel")).toHaveCount(0)
		await expect(composer(page)).toBeFocused()
		await expect(composer(page)).not.toHaveValue("")
		await composer(page).press("Enter")
		if (index < 5) await expect(page.getByText(topics[index])).toBeVisible()
		if (index === 1) await expect(page.getByText(/verify reconciliation gaps in Billing ledger sample instead of asking you to guess/i)).toBeVisible()
	}
	await expect(page.getByText(/enough owner context for this pass/i)).toBeVisible()

	// One decision reaches the owner; both paths keep the ledger's convention in the pipeline.
	await expect(page.getByRole("heading", { name: "The close workbooks convert currency on a different date than the ledger" })).toBeVisible({ timeout: 25_000 })
	await expect(dockRow(page)).toContainText("3/12")
	await page.getByRole("button", { name: "Adopt posting-date rates" }).first().click()

	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible({ timeout: 30_000 })
	await page.getByRole("button", { name: "Package", exact: true }).click()
	await expect(page.getByText(/Revenue can reconcile itself before finance arrives/)).toBeVisible()
	// The package stays the step while it is read; the charter approval moves on to the handoff.
	await expect(dockRow(page)).toContainText("4/12")

	// The charter is the one blocker; the packet goes to Agentix, not Plan.
	await page.locator(".workspace-header").getByRole("button", { name: "Continue to Agentix" }).click()
	const handoff = page.getByRole("dialog", { name: "Continue to Agentix" })
	await expect(handoff).toContainText("Opens in Agentix")
	await expect(handoff.getByRole("button", { name: "Continue to Agentix" })).toBeDisabled()
	await handoff.getByRole("button", { name: "Approve charter" }).click()
	const charter = page.getByRole("dialog", { name: "Approve the project charter" })
	await charter.getByRole("textbox", { name: "Approval reason" }).fill("Scope, owners and the five exclusions match what finance leadership agreed.")
	await charter.getByRole("button", { name: "Approve charter" }).click()
	await expect(dockRow(page)).toContainText("5/12")
	await page.getByRole("textbox", { name: "Handoff note (optional)" }).fill("Start with the mapping; the region rule is mine to decide.")
	await handoff.getByRole("button", { name: "Continue to Agentix" }).click()

	// Agentix receives the packet as a new engagement, built from zero, with its provenance.
	await createEngagement(page)

	// The region rule, the repaired pipeline and the release the owner approves.
	await expect(dockRow(page)).toContainText("7/12")
	await demoControls(page, "Skip")
	await page.getByRole("button", { name: "Show them as Unassigned" }).click()
	await expect(dockRow(page)).toContainText("8/12")
	for (let i = 0; i < 6 && !(await page.getByRole("heading", { name: /Release ingestion and transformation pipeline v2 to production\?/ }).count()); i++) await demoControls(page, "Skip")
	await expect(page.getByRole("heading", { name: /Release ingestion and transformation pipeline v2 to production\?/ })).toBeVisible()
	await expect(dockRow(page)).toContainText("9/12")
	await page.getByRole("button", { name: "Approve release" }).first().click()

	// The dashboard publishes under policy and stays the step while it is shown; running the next cycle moves on.
	for (let i = 0; i < 8 && !(await page.getByText("3 of 3 milestones verified").count()); i++) await demoControls(page, "Skip")
	await expect(page.getByText("3 of 3 milestones verified")).toBeVisible()
	await expect(dockRow(page)).toContainText("10/12")
	await openDock(page)
	await expect(page.locator(".mxd-panel")).toContainText("Published under FIN-DASH-2.")
	await page.keyboard.press("Escape")

	// The previews are the beat this demo builds to: they must show THIS demo's data, never another's.
	{
		await page.getByRole("tab", { name: /^Results/ }).click()
		await page.getByRole("button", { name: /Revenue dashboard/ }).first().click()
		const results = page.locator(".aop-results-preview")
		await expect(results.getByText("Revenue ·", { exact: false }).first()).toBeVisible()
		await expect(results.getByText("$1,284,310.42", { exact: false }).first()).toBeVisible()
		await expect(results.getByText("AP exceptions", { exact: false })).toHaveCount(0)
		await expect(results.getByText("Exception class", { exact: false })).toHaveCount(0)
		await expect(results.getByText("Orders ·", { exact: false })).toHaveCount(0)
		await expect(results.getByText("Salesforce field", { exact: false })).toHaveCount(0)
		await page.getByRole("tab", { name: /^Work/ }).click()
	}
	await demoControls(page, "Run")
	await expect(dockRow(page)).toContainText("11/12")
	for (let i = 0; i < 4 && !(await dockRow(page).textContent())?.includes("12/12"); i++) await demoControls(page, "Skip")
	await expect(dockRow(page)).toContainText("12/12")
	await openDock(page)
	await expect(page.locator(".mxd-panel")).toContainText("Close the story")

	expect(errors).toEqual([])
})

test("each new tab starts clean, a reload keeps the presenter's place, and the everyday prototype is untouched", async ({ page, context }) => {
	test.setTimeout(90_000)
	// The everyday prototype saves its own Discovery and Agentix state first.
	await page.goto("/maxion-prototype")
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: /^Agentix/ }).click()
	await expect(page.getByRole("heading", { name: "Engagements", exact: true })).toBeVisible()
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Discover", exact: true }).click()
	await expect.poll(() => page.evaluate(keys => keys.every(key => localStorage.getItem(key) !== null), [EVERYDAY_DISCOVERY, EVERYDAY_AGENTIX])).toBe(true)
	const everyday = await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), [EVERYDAY_DISCOVERY, EVERYDAY_AGENTIX])
	await expect(dockRow(page)).toHaveCount(0)

	// The demo in this tab: start a Discovery, answer once, reload, and it is still there.
	await page.goto(DEMO)
	await startRevenueDiscovery(page)
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: /Fill answer/ }).click()
	await composer(page).press("Enter")
	await expect(page.getByText("Reconciliation gaps · 2 of 6")).toBeVisible()
	await page.reload()
	await expect(dockRow(page)).toContainText("2/12")
	await expect(page.getByRole("button", { name: /Resume Revenue reconciliation: SQL Server to AWS/ })).toBeVisible()

	// A second tab is a fresh demo for the next customer.
	const next = await context.newPage()
	await next.emulateMedia({ reducedMotion: "reduce" })
	await next.goto(DEMO)
	await expect(dockRow(next)).toContainText("1/12")
	await expect(next.getByRole("button", { name: /Resume Revenue reconciliation/ })).toHaveCount(0)
	await next.close()

	// Nothing the demo did reached the everyday keys.
	expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), [EVERYDAY_DISCOVERY, EVERYDAY_AGENTIX])).toEqual(everyday)

	// Exit leaves the demo for the everyday prototype.
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: "Exit" }).click()
	await expect(page).toHaveURL(/\/maxion-prototype$/)
	await expect(dockRow(page)).toHaveCount(0)
})

test("restart from the finished package, hand off, and restart again from the beginning", async ({ page }) => {
	test.setTimeout(90_000)
	await page.goto(DEMO)
	await startRevenueDiscovery(page)
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: "Restart…" }).click()
	await page.locator(".mxd-panel").getByRole("button", { name: "From the finished package" }).click()

	// The finished Discovery opens at its package, one step from the handoff.
	await expect(page).toHaveURL(/start=package/)
	await expect(page.locator(".workspace-header")).toContainText("Revenue reconciliation: SQL Server to AWS")
	await expect(page.getByText(/Revenue can reconcile itself before finance arrives/)).toBeVisible()
	await expect(dockRow(page)).toContainText("4/12")
	await handOff(page)
	await expect(page.getByRole("heading", { name: "Review Revenue reconciliation" })).toBeVisible({ timeout: 10_000 })

	// Back in Discovery the record says where its packet went, and opening it again never duplicates it.
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Discover", exact: true }).click()
	await expect(page.locator(".workspace-header").getByRole("button", { name: "Discovery status" })).toContainText("Handed to Agentix")
	await page.locator(".workspace-header").getByRole("button", { name: "Open in Agentix" }).click()
	await expect(page.getByRole("heading", { name: "Review Revenue reconciliation" })).toBeVisible()
	const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("maxion-agentix-operations-v4::demo-revenue")!))
	expect(saved.engagements.invoice.proposal.discovery.title).toBe("Revenue reconciliation: SQL Server to AWS")
	expect(Object.keys(saved.engagements)).toHaveLength(4)

	// The Agentix Demo sheet restarts the whole story, not Agentix alone.
	await page.getByRole("button", { name: "Controls", exact: true }).click()
	await page.getByRole("button", { name: "Restart the customer demo…" }).click()
	await page.getByRole("button", { name: "From the beginning" }).click()
	await expect(page).toHaveURL(/demo=revenue$/)
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await expect(dockRow(page)).toContainText("1/12")
	// Agentix starts again from its seed: the revenue package is held back for the next Discovery.
	const fresh = await page.evaluate(() => JSON.parse(localStorage.getItem("maxion-agentix-operations-v4::demo-revenue") ?? "null"))
	expect(fresh === null || (fresh.engagements.invoice.proposal === undefined && fresh.demo.gated.includes("pkg_revenue_v2"))).toBe(true)
})

test("every new revenue Discovery starts Agentix again from zero and runs the whole process again", async ({ page }) => {
	test.setTimeout(240_000)
	const errors: string[] = []
	page.on("pageerror", error => errors.push(error.message))
	page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })

	// The first customer's run: the finished package handed over and the engagement created and working.
	await page.goto(`${DEMO}&start=package`)
	await expect(dockRow(page)).toContainText("4/12")
	await handOff(page)
	await createEngagement(page)
	await expect(dockRow(page)).toContainText("7/12")
	const first = await savedDemo(page)
	const firstRecord = first.discovery.find(record => record.scenarioKey === "revenue")!.id
	expect(first.agentix.engagements.invoice.status).toBe("active")

	// A new revenue Discovery: the setup says what creating it does before anything changes.
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Discover", exact: true }).click()
	await page.locator(".workspace-header").getByRole("button", { name: "More Discovery actions" }).click()
	await page.getByRole("menuitem", { name: "New Discovery" }).click()
	await startRevenueDiscovery(page, async () => {
		await expect(replaceNote(page)).toContainText("replaces the earlier revenue Discovery and starts Agentix again from zero")
		// The note describes the button that does it.
		expect(await page.getByRole("button", { name: "Create Discovery" }).getAttribute("aria-describedby")).toBe(await replaceNote(page).getAttribute("id"))
	})
	await expect(dockRow(page)).toContainText("2/12")

	// One revenue Discovery remains, the new one; Agentix holds nothing of the earlier run.
	const reset = await savedDemo(page)
	const revenue = reset.discovery.filter(record => record.scenarioKey === "revenue")
	expect(revenue).toHaveLength(1)
	expect(revenue[0].id).not.toBe(firstRecord)
	expect(reset.agentix.engagements.invoice.status).toBe("draft")
	expect(reset.agentix.engagements.invoice.proposal).toBeUndefined()
	expect(reset.agentix.engagements.invoice.packages).toEqual([])
	expect(reset.agentix.work.filter((item: { engagementId: string }) => item.engagementId === "invoice")).toEqual([])
	expect(reset.agentix.demo.gated).toContain("pkg_revenue_v2")
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: /^Agentix/ }).click()
	await expect(page.locator(".aop-fleet")).toBeVisible()
	await expect(page.locator(".aop-fleet")).not.toContainText("Revenue reconciliation")

	// The whole process runs again: interview, decision, package, handoff, and the engagement created from zero.
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Discover", exact: true }).click()
	await finishDiscovery(page)
	await handOff(page)
	await createEngagement(page)
	await expect(dockRow(page)).toContainText("7/12")
	const second = await savedDemo(page)
	// The engagement names the new Discovery as its source.
	expect(second.agentix.engagements.invoice.origin.discovery.recordId).toBe(revenue[0].id)
	// One set of milestones and one activation: the earlier run left nothing behind.
	expect(second.agentix.work.filter((item: { engagementId: string; reference: string }) => item.engagementId === "invoice" && /^MS-/.test(item.reference)).map((item: { reference: string }) => item.reference).sort()).toEqual(["MS-1", "MS-2", "MS-3"])
	expect(second.agentix.events.filter((event: { text: string }) => event.text.startsWith("You activated Revenue reconciliation"))).toHaveLength(1)
	expect(errors).toEqual([])
})

test("the presenter window opened from the product never takes the demo over", async ({ page, context }) => {
	test.setTimeout(120_000)
	await page.goto(DEMO)
	await startRevenueDiscovery(page)
	// Opening the guide the way a presenter does — its own button, which names the demo in the
	// address — must not make that window a demo tab and displace the tab being shown.
	await openDock(page)
	const opened = context.waitForEvent("page")
	await page.locator(".mxd-panel").getByRole("button", { name: /Presenter window/ }).click()
	const guide = await opened
	await expect(guide.getByRole("heading", { name: "Revenue reconciliation, Discovery to Agentix" })).toBeVisible()
	await expect(guide.getByText("Connected to the demo tab.")).toBeVisible({ timeout: 15_000 })
	// The demo tab still owns its run: no "Continues in another tab".
	await page.bringToFront()
	await expect(dockRow(page)).not.toContainText("Continues in another tab")
	await expect(dockRow(page)).toContainText("2/12")
	await guide.close()
})

test("the presenter window follows the demo and fills an answer in it", async ({ page, context }) => {
	test.setTimeout(90_000)
	await page.goto(DEMO)
	const guide = await context.newPage()
	await guide.goto("/demo-guide")
	await expect(guide.getByRole("heading", { name: "Revenue reconciliation, Discovery to Agentix" })).toBeVisible()
	// Opening the guide never starts or clears a demo.
	await expect(guide.getByRole("region", { name: "Current step" })).toContainText("Start the Discovery")

	await startRevenueDiscovery(page)
	await expect(guide.getByRole("region", { name: "Current step" })).toContainText("Answer the owner interview")
	await expect(guide.getByRole("region", { name: "Current step" })).toContainText("Question 1 of 6")
	await guide.getByRole("button", { name: "Fill in the demo" }).click()
	await expect(composer(page)).toHaveValue(/A number finance can’t explain/)
	await composer(page).press("Enter")
	await expect(guide.getByRole("region", { name: "Current step" })).toContainText("Question 2 of 6")

	// The guide can restart the demo tab for the next customer.
	await guide.getByRole("button", { name: "Restart…" }).click()
	await guide.getByRole("button", { name: "From the beginning" }).click()
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await expect(dockRow(page)).toContainText("1/12")
	await expect(guide.getByRole("region", { name: "Current step" })).toContainText("Start the Discovery")
})

test("only the newest demo tab saves; the older one says so and can take the demo back", async ({ page, context }) => {
	test.setTimeout(90_000)
	await page.goto(DEMO)
	await startRevenueDiscovery(page)
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: /Fill answer/ }).click()
	await composer(page).press("Enter")
	await expect(page.getByText("Reconciliation gaps · 2 of 6")).toBeVisible()

	// A second demo tab for the next customer takes the demo; the first stops saving and says so.
	const next = await context.newPage()
	await next.emulateMedia({ reducedMotion: "reduce" })
	await next.goto(DEMO)
	await expect(dockRow(next)).toContainText("1/12")
	await expect(dockRow(page)).toContainText("Continues in another tab")
	// Reloading the displaced tab straight away keeps its run: it was copied privately the moment it lost the demo.
	await page.reload()
	await expect(dockRow(page)).toContainText("Continues in another tab")
	await page.getByRole("button", { name: /Resume Revenue reconciliation: SQL Server to AWS/ }).click()
	await expect(page.getByText("Reconciliation gaps · 2 of 6")).toBeVisible()
	await composer(page).fill("Within $50 per region each day.")
	await composer(page).press("Enter")
	await expect(page.getByText("Tolerance · 3 of 6")).toBeVisible()
	await expect(dockRow(next)).toContainText("1/12")
	expect(await next.evaluate(() => localStorage.getItem("maxion.prototype.discovery-records.v1::demo-revenue") ?? "")).not.toContain("Revenue reconciliation: SQL Server to AWS")

	// Reloading the older tab keeps its own run (kept privately in that tab), still deferring to the newer one.
	await page.reload()
	await expect(dockRow(page)).toContainText("Continues in another tab")
	await expect(page.getByRole("button", { name: /Resume Revenue reconciliation: SQL Server to AWS/ })).toBeVisible()

	// Continue here brings this tab's run back and saves it; the other tab now defers.
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: "Continue here" }).click()
	await expect(dockRow(page)).toBeFocused()
	await expect(dockRow(page)).toContainText("2/12")
	await openDock(page)
	await expect(page.locator(".mxd-panel")).toContainText("Question 3 of 6")
	await expect(dockRow(next)).toContainText("Continues in another tab")
	await page.reload()
	await expect(page.getByRole("button", { name: /Resume Revenue reconciliation: SQL Server to AWS/ })).toBeVisible()
	await next.close()
})

test("exit is safe to undo, and the presenter panel stays on screen at tablet width", async ({ page }) => {
	test.setTimeout(90_000)
	await page.goto(DEMO)
	await startRevenueDiscovery(page)
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: "Exit" }).click()
	await expect(page).toHaveURL(/\/maxion-prototype$/)
	await expect(dockRow(page)).toHaveCount(0)
	await page.goBack()
	await expect(dockRow(page)).toContainText("2/12")

	// At 820px the sidebar is a drawer; the panel opens as a sheet inside the window, not inside the drawer.
	await page.setViewportSize({ width: 820, height: 900 })
	await page.getByRole("button", { name: "Open navigation" }).click()
	await dockRow(page).click()
	const panel = page.locator(".mxd-panel")
	await expect(panel).toBeVisible()
	const box = (await panel.boundingBox())!
	expect(box.x).toBeGreaterThanOrEqual(0)
	expect(box.x + box.width).toBeLessThanOrEqual(820)
	expect(box.width).toBeGreaterThan(400)
	await panel.getByRole("button", { name: /Fill answer/ }).click()
	await expect(composer(page)).toHaveValue(/A number finance can’t explain/)
})

test("the presenter window says when no demo tab is open, and opens one", async ({ page, context }) => {
	test.setTimeout(60_000)
	const guide = page
	await guide.goto("/demo-guide")
	await expect(guide.getByRole("status")).toContainText("No demo tab is open", { timeout: 5_000 })
	const [opened] = await Promise.all([context.waitForEvent("page"), guide.getByRole("button", { name: "Open the full demo" }).click()])
	await opened.waitForLoadState()
	await expect(dockRow(opened)).toContainText("1/12")
	await expect(opened).not.toHaveURL(/fresh=1/)
	await expect(guide.getByRole("status")).toContainText("Connected to the demo tab", { timeout: 8_000 })
})

test("a reload inside MAX's reply delay never strands the interview", async ({ page }) => {
	test.setTimeout(60_000)
	// Full motion keeps MAX's 0.7 s reply delay, so the reload lands inside it.
	await page.emulateMedia({ reducedMotion: "no-preference" })
	await page.goto(DEMO)
	await startRevenueDiscovery(page)
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: /Fill answer/ }).click()
	await composer(page).press("Enter")
	await page.reload()
	await openDock(page)
	await expect(page.locator(".mxd-panel")).toContainText("MAX is replying…")
	await page.locator(".mxd-panel").getByRole("button", { name: "Open the Discovery" }).click()
	await expect(page.getByText("Reconciliation gaps · 2 of 6")).toBeVisible({ timeout: 10_000 })
	// One owner answer, one reply: nothing was sent twice.
	await expect(page.getByText("A number finance can’t explain. The close slips about two days most months while we chase differences by hand.")).toHaveCount(1)
	await openDock(page)
	await expect(page.locator(".mxd-panel")).toContainText("Question 2 of 6")
})

test("back after a restart never wipes the run, and /demo keeps its start point", async ({ page }) => {
	test.setTimeout(60_000)
	await page.goto(DEMO)
	await startRevenueDiscovery(page)
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: "Restart…" }).click()
	await page.locator(".mxd-panel").getByRole("button", { name: "From the finished package" }).click()
	await expect(dockRow(page)).toContainText("4/12")
	// The restart replaced the history entry, so Back leaves the demo instead of landing on the cleared start.
	await page.goBack()
	await expect(page).not.toHaveURL(/demo=revenue/)
	await page.goForward()
	await expect(dockRow(page)).toContainText("4/12")
	await expect(page.getByText(/Revenue can reconcile itself before finance arrives/)).toBeVisible()

	await page.goto("/demo?start=package")
	await expect(page).toHaveURL(/demo=revenue&start=package/)
	await expect(dockRow(page)).toContainText("4/12")
	await page.reload()
	await expect(dockRow(page)).toContainText("4/12")
})

test("the presenter panel reads as part of its row for keyboard users", async ({ page }) => {
	test.setTimeout(60_000)
	await page.goto(DEMO)
	await dockRow(page).focus()
	await page.keyboard.press("Enter")
	const panel = page.locator(".mxd-panel")
	await expect(panel.getByRole("heading", { name: "Start the Discovery" })).toBeFocused()
	// Shift+Tab from the top of the panel returns to its row and closes it.
	await page.keyboard.press("Shift+Tab")
	await expect(panel).toHaveCount(0)
	await expect(dockRow(page)).toBeFocused()
	// Tab from its last control goes on to what follows the row, and closes it.
	await page.keyboard.press("Enter")
	await panel.getByRole("button", { name: "Exit" }).focus()
	await page.keyboard.press("Tab")
	await expect(panel).toHaveCount(0)
	await expect(page.getByRole("button", { name: /Workspace units/ })).toBeFocused()
})

test("the presenter window keeps its connection through a reload, and a double open never makes MAX reply twice", async ({ page, context }) => {
	test.setTimeout(60_000)
	await page.emulateMedia({ reducedMotion: "no-preference" })
	await page.goto(DEMO)
	await startRevenueDiscovery(page)
	const guide = await context.newPage()
	await guide.goto("/demo-guide")
	await expect(guide.getByRole("status")).toContainText("Connected to the demo tab", { timeout: 8_000 })
	await page.reload()
	for (let i = 0; i < 12; i++) {
		await expect(guide.getByRole("status")).not.toContainText("No demo tab is open")
		await guide.waitForTimeout(250)
	}

	// Opening the Discovery from the row while MAX is still replying leaves one reply, not two.
	await page.getByRole("button", { name: /Resume Revenue reconciliation: SQL Server to AWS/ }).click()
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: /Fill answer/ }).click()
	await composer(page).press("Enter")
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: "Open the Discovery" }).click()
	await expect(page.getByText("Reconciliation gaps · 2 of 6")).toBeVisible({ timeout: 10_000 })
	await page.waitForTimeout(1500)
	await expect(page.getByText("Reconciliation gaps · 2 of 6")).toHaveCount(1)
})

test("the presenter panel stays inside a laptop window with every step listed", async ({ page }) => {
	test.setTimeout(30_000)
	await page.setViewportSize({ width: 1280, height: 720 })
	await page.goto(DEMO)
	await openDock(page)
	const panel = page.locator(".mxd-panel")
	await panel.getByText("All steps").click()
	await expect(panel.getByText("12. Close the story")).toBeVisible()
	const box = (await panel.boundingBox())!
	expect(box.y + box.height).toBeLessThanOrEqual(720)
	await panel.getByRole("button", { name: "Exit" }).scrollIntoViewIfNeeded()
	await expect(panel.getByRole("button", { name: "Exit" })).toBeInViewport()
})
