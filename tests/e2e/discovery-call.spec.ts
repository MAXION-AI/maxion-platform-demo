import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

/*
 * The owner interview as a call with MAX, driven the way a presenter drives it: Start the call from
 * the dock, then Fill answer, which arrives on the call as speech and sends after the pause. The
 * browser here has no microphone, so the call says it is typing only; everything else is the call.
 * Ending the interview lands on its summary, and Watch MAX work opens the stakeholder calls.
 */
const DEMO = "/maxion-prototype?demo=revenue"
const dockRow = (page: Page) => page.locator(".mxd-dock-row")
const panel = (page: Page) => page.locator(".mxd-panel")
const call = (page: Page) => page.getByRole("dialog", { name: "Owner interview" })
const heard = (page: Page) => call(page).getByRole("region", { name: "What MAX heard" })

async function openDock(page: Page) {
	if (await panel(page).count()) return
	await dockRow(page).click()
	await expect(panel(page)).toBeVisible()
}

async function startRevenueDiscovery(page: Page) {
	await page.goto(DEMO)
	await page.getByRole("region", { name: /template/i }).getByRole("button", { name: /Revenue reconciliation/ }).first().click()
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await page.getByRole("checkbox", { name: "Mission authority reviewed" }).check()
	await page.getByRole("button", { name: "Create Discovery" }).click()
	await expect(page.getByRole("textbox", { name: "Message MAX" })).toBeVisible({ timeout: 10_000 })
}

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
})

test("the owner interview runs as a call, and what MAX heard fills as the owner talks", async ({ page }) => {
	test.setTimeout(180_000)
	const errors: string[] = []
	page.on("pageerror", error => errors.push(error.message))
	await startRevenueDiscovery(page)

	// Voice-first: the Thread invites a call, and the dock offers it beside Fill answer.
	await expect(page.getByRole("heading", { name: "Talk it through with MAX" })).toBeVisible()
	await openDock(page)
	await panel(page).getByRole("button", { name: /Start the call/ }).click()
	await expect(call(page)).toBeVisible()
	await expect(call(page).getByText("Continue this interview by voice")).toBeVisible()
	await call(page).getByRole("button", { name: /Continue (with voice|by typing)/ }).click()

	// The platform sidebar stays usable during the call, so the presenter's dock works.
	for (let index = 0; index < 6; index++) {
		await openDock(page)
		await expect(panel(page)).toContainText(`Question ${index + 1} of 6`)
		await panel(page).getByRole("button", { name: /Fill answer/ }).click()
		await expect(heard(page)).toContainText(`${index + 1} of 6`, { timeout: 10_000 })
		if (index === 1) {
			// The owner pointed at the ledger: MAX reads it during the call and labels the result an early signal.
			await expect(heard(page)).toContainText("Where it breaks")
			await expect(heard(page)).toContainText(/Early signal · 612 of 4,812 sampled invoices are non-USD/)
		}
		if (index === 4) await expect(heard(page)).toContainText(/Open: nobody owns production releases/)
	}

	// The call ends on what it heard, and MAX's spoken close keeps the Thread's sentence.
	await expect(call(page).getByRole("heading", { name: "5 positions captured, 1 kept open" })).toBeVisible({ timeout: 15_000 })
	await expect(call(page).getByRole("complementary", { name: "Voice transcript" })).toContainText("That gives me enough owner context for this pass")
	const scan = await new AxeBuilder({ page }).include(".vc").analyze()
	expect(scan.violations.filter(violation => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	// Watch MAX work opens Autonomy on the stakeholder calls; the disagreement there becomes the decision.
	await call(page).getByRole("button", { name: "Watch MAX work" }).click()
	await expect(call(page)).toBeHidden()
	await expect(page.getByRole("region", { name: /stakeholders/ })).toBeVisible({ timeout: 10_000 })
	await expect(page.getByRole("heading", { name: "What the stakeholders told MAX" })).toBeVisible({ timeout: 25_000 })
	await expect(page.getByText(/Grace and Tom disagree\./)).toBeVisible()
	await expect(page.getByText("The close workbooks convert at invoice-date rates")).toBeVisible()
	await page.getByRole("button", { name: "Review the decision" }).click()
	await expect(page.getByRole("button", { name: "Adopt posting-date rates" }).first()).toBeVisible()

	// The Thread keeps the same record: spoken answers are marked, and Details holds what MAX heard.
	await page.getByRole("button", { name: "Thread", exact: true }).click()
	await expect(page.getByText("Owner · spoken").first()).toBeVisible()
	await expect(page.locator(".thread-inspector").getByRole("heading", { name: "What MAX heard" })).toBeAttached()
	expect(errors).toEqual([])
})

test("typing on the call works without a microphone, and the call fits a phone", async ({ page }) => {
	test.setTimeout(90_000)
	await page.setViewportSize({ width: 390, height: 844 })
	await startRevenueDiscovery(page)
	await page.getByRole("button", { name: "Start the call" }).click()
	await call(page).getByRole("button", { name: /Continue (with voice|by typing)/ }).click()
	await call(page).getByRole("textbox", { name: "Your response" }).fill("Not sure, honestly")
	await call(page).getByRole("button", { name: "Send response" }).click()
	// "Not sure" stays a gap; MAX asks who would know instead of inventing an answer.
	await expect(call(page).getByRole("complementary", { name: "Voice transcript" })).toContainText(/explicit gap rather than inventing an answer/, { timeout: 10_000 })
	const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, height: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight }))
	expect(size.width).toBe(size.client)
	expect(size.height).toBeLessThanOrEqual(size.clientHeight)
	// Nothing in the call itself is clipped sideways either: the page not scrolling is not enough.
	for (const selector of [".vc", ".vc-bar", ".vc-stage", ".vc-controls"]) {
		expect(await page.locator(selector).evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1)
	}
	await call(page).getByRole("button", { name: "Close voice session" }).click()
	await expect(call(page)).toBeHidden()
})

test("the dock starts the call after a reload, and an answer typed before it starts keeps the field open", async ({ page }) => {
	await startRevenueDiscovery(page)
	await page.reload()
	await openDock(page)
	await panel(page).getByRole("button", { name: "Start the call" }).click()
	await expect(call(page)).toBeVisible()
	// It stays open once the Discovery it names has loaded (switching records ends calls).
	await page.waitForTimeout(600)
	await expect(call(page).getByRole("button", { name: /Continue (with voice|by typing)/ })).toBeVisible()
	const field = call(page).getByRole("textbox", { name: "Your response" })
	await field.fill("Finance leadership owns the regional revenue view.")
	await call(page).getByRole("button", { name: "Send response" }).click()
	await expect(call(page).getByRole("complementary", { name: "Voice transcript" })).toContainText("Finance leadership owns the regional revenue view.")
	await expect(field).toBeEditable()
})

test("with motion on, a filled answer lands word by word and sends after the pause", async ({ page }) => {
	test.setTimeout(90_000)
	await page.emulateMedia({ reducedMotion: "no-preference" })
	await startRevenueDiscovery(page)
	await openDock(page)
	await panel(page).getByRole("button", { name: "Start the call" }).click()
	await call(page).getByRole("button", { name: /Continue (with voice|by typing)/ }).click()
	await expect(call(page)).toHaveAttribute("data-turn", /listening|ready|error/, { timeout: 40_000 })
	await openDock(page)
	await panel(page).getByRole("button", { name: /Fill answer/ }).click()
	await expect(call(page)).toHaveAttribute("data-simulating", "true")
	await expect(call(page)).toHaveAttribute("data-turn", /thinking|speaking/, { timeout: 20_000 })
	await expect(heard(page).getByRole("img", { name: /Captured|Verified|Kept open|Checking|Early signal/ }).first()).toBeVisible({ timeout: 10_000 })
})

test("a voice-channel stakeholder can take the interview by voice and still type instead", async ({ page }) => {
	test.setTimeout(90_000)
	await page.goto("/stakeholder-interview?demo=revenue&who=grace")
	const voice = page.getByRole("button", { name: "Start by voice" })
	await expect(voice).toBeDisabled()
	await page.getByRole("checkbox").check()
	await voice.click()
	const region = page.getByRole("region", { name: "Voice interview" })
	await expect(region).toBeVisible()
	await expect(region.getByText(/I am MAX, running the Discovery on Revenue reconciliation/)).toBeVisible()
	await region.getByRole("button", { name: "Suggest an answer" }).click()
	await expect(page.getByText("1 of 3 topics", { exact: false })).toBeVisible({ timeout: 10_000 })
	// Typing keeps every answer.
	await region.getByRole("button", { name: /Type instead/ }).click()
	await expect(page.getByRole("textbox", { name: "Your answer" })).toBeVisible()
	await expect(page.getByText("1 of 3 topics", { exact: false })).toBeVisible()
})
