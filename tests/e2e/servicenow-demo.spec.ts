import { expect, test, type Page } from "@playwright/test"

/*
 * The ServiceNow customer demo, driven the way a presenter drives it: from the demo address,
 * through a new AP invoice exceptions Discovery, the handoff, and the Agentix engagement to a
 * verified morning, using the presenter row for the scripted answers. Discovery runs on its own
 * timers; Agentix is moved on with its Demo controls, as a presenter would.
 */
const DEMO = "/maxion-prototype?demo=servicenow"
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

async function startExceptionsDiscovery(page: Page, beforeCreate?: () => Promise<void>) {
	await page.getByRole("region", { name: /template/i }).getByRole("button", { name: /AP invoice exceptions/ }).first().click()
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await expect(page.getByRole("textbox", { name: "Mission name" })).toHaveValue("AP invoice exceptions: ServiceNow triage and approval authority")
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
	await expect(page.getByRole("heading", { name: "The purchase order and the supplier contract set different price tolerances" })).toBeVisible({ timeout: 25_000 })
	await page.getByRole("button", { name: "Make the contract tolerance authoritative" }).first().click()
	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible({ timeout: 30_000 })
}

/* The charter approval, then the packet to Agentix. */
async function handOff(page: Page) {
	await page.locator(".workspace-header").getByRole("button", { name: "Continue to Agentix" }).click()
	const handoff = page.getByRole("dialog", { name: "Continue to Agentix" })
	await handoff.getByRole("button", { name: "Approve charter" }).click()
	const charter = page.getByRole("dialog", { name: "Approve the project charter" })
	await charter.getByRole("textbox", { name: "Approval reason" }).fill("Scope, owners and the five exclusions match what finance and procurement agreed.")
	await charter.getByRole("button", { name: "Approve charter" }).click()
	await handoff.getByRole("button", { name: "Continue to Agentix" }).click()
}

const savedDemo = (page: Page) => page.evaluate(() => ({
	discovery: JSON.parse(localStorage.getItem("maxion.prototype.discovery-records.v1::demo-servicenow") ?? "[]") as { id: string; scenarioKey: string }[],
	agentix: JSON.parse(localStorage.getItem("maxion-agentix-operations-v4::demo-servicenow") ?? "null"),
}))

/* The handed-over package opens as a new engagement: answer, run the read-only check, activate. */
async function createEngagement(page: Page) {
	await expect(page.getByRole("heading", { name: "Review AP invoice exceptions" })).toBeVisible({ timeout: 10_000 })
	await expect(page.getByText(/From Discovery · AP invoice exceptions: ServiceNow triage and approval authority · packet HP-/)).toBeVisible()
	await expect(dockRow(page)).toContainText("6/12")
	const questions = page.locator(".aop-questions")
	await questions.getByText("Ask me before each pipeline release").click()
	await questions.getByText("The synthetic sweep of 1,904 cases").click()
	await page.getByRole("button", { name: "Run the read-only check" }).click()
	await expect(page.getByText("Read-only check passed. Nothing was written.")).toBeVisible({ timeout: 10_000 })
	await page.getByRole("button", { name: /Activate engagement/ }).click()
	await expect(page.locator('[data-work="MS-1"]').first()).toBeVisible()
}

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
})

test("the AP exceptions demo runs from a new Discovery to a verified morning in Agentix", async ({ page }) => {
	test.setTimeout(240_000)
	const errors: string[] = []
	page.on("pageerror", error => errors.push(error.message))
	page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })

	await page.goto(DEMO)
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await expect(dockRow(page)).toContainText("1/12")
	// The first AP exceptions Discovery replaces nothing, so the setup doesn't say it will.
	await startExceptionsDiscovery(page, () => expect(replaceNote(page)).toHaveCount(0))
	await expect(page.locator(".workspace-header")).toContainText("AP invoice exceptions: ServiceNow triage and approval authority")
	await expect(page.locator(".workspace-header").getByRole("button", { name: "Continue to Agentix" })).toBeDisabled()

	// The six scripted answers, each filled by the presenter row and sent with Enter.
	const topics = ["Exception mix · 2 of 6", "Tolerance authority · 3 of 6", "Approval routing · 4 of 6", "Release authority · 5 of 6", "Success measure · 6 of 6"]
	for (let index = 0; index < 6; index++) {
		await openDock(page)
		await expect(page.locator(".mxd-panel")).toContainText(`Question ${index + 1} of 6`)
		await page.locator(".mxd-panel").getByRole("button", { name: /Fill answer/ }).click()
		await expect(page.locator(".mxd-panel")).toHaveCount(0)
		await expect(composer(page)).toBeFocused()
		await expect(composer(page)).not.toHaveValue("")
		await composer(page).press("Enter")
		if (index < 5) await expect(page.getByText(topics[index])).toBeVisible()
	}
	await expect(page.getByText(/enough owner context for this pass/i)).toBeVisible()

	// One decision reaches the owner: two tolerance rules, each applied consistently.
	await expect(page.getByRole("heading", { name: "The purchase order and the supplier contract set different price tolerances" })).toBeVisible({ timeout: 25_000 })
	await expect(dockRow(page)).toContainText("3/12")
	await page.getByRole("button", { name: "Make the contract tolerance authoritative" }).first().click()

	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible({ timeout: 30_000 })
	await page.getByRole("button", { name: "Package", exact: true }).click()
	await expect(page.getByText(/Most AP exceptions are arithmetic the queue should never have raised/)).toBeVisible()
	// The package stays the step while it is read; the charter approval moves on to the handoff.
	await expect(dockRow(page)).toContainText("4/12")

	// The charter is the one blocker; the packet goes to Agentix.
	await page.locator(".workspace-header").getByRole("button", { name: "Continue to Agentix" }).click()
	const handoff = page.getByRole("dialog", { name: "Continue to Agentix" })
	await expect(handoff).toContainText("Opens in Agentix")
	// The design this packet opens is a new engagement, never an expansion of one already running.
	await expect(handoff).toContainText("A new Agentix engagement created from this package")
	await expect(handoff.getByRole("button", { name: "Continue to Agentix" })).toBeDisabled()
	await handoff.getByRole("button", { name: "Approve charter" }).click()
	const charter = page.getByRole("dialog", { name: "Approve the project charter" })
	await charter.getByRole("textbox", { name: "Approval reason" }).fill("Scope, owners and the five exclusions match what finance and procurement agreed.")
	await charter.getByRole("button", { name: "Approve charter" }).click()
	await expect(dockRow(page)).toContainText("5/12")
	await page.getByRole("textbox", { name: "Handoff note (optional)" }).fill("Start with the taxonomy; the no-contract rule is Procurement’s to decide.")
	await handoff.getByRole("button", { name: "Continue to Agentix" }).click()

	// Agentix receives the packet as a new engagement, built from zero, with its provenance.
	await createEngagement(page)

	// The no-contract rule, the repaired pipeline and the release the owner approves.
	await expect(dockRow(page)).toContainText("7/12")

	// The dock's own action must open THIS demo's engagement. Beats 7-12 all emit it, and it
	// used to fall through to the revenue engagement in every demo.
	await openDock(page)
	await page.locator(".mxd-panel").getByRole("button", { name: "Open the engagement" }).click()
	await expect(page.getByRole("heading", { name: "AP invoice exceptions", exact: true })).toBeVisible()
	await expect(page.getByRole("heading", { name: "Revenue reconciliation", exact: true })).toHaveCount(0)
	await demoControls(page, "Skip")
	await page.getByRole("button", { name: "Route them to the category buyer" }).click()
	await expect(dockRow(page)).toContainText("8/12")
	for (let i = 0; i < 6 && !(await page.getByRole("heading", { name: /Release triage and routing pipeline v2 to production\?/ }).count()); i++) await demoControls(page, "Skip")
	await expect(page.getByRole("heading", { name: /Release triage and routing pipeline v2 to production\?/ })).toBeVisible()
	await expect(dockRow(page)).toContainText("9/12")
	await page.getByRole("button", { name: "Approve release" }).first().click()

	// The dashboard publishes under policy and stays the step while it is shown; running the next cycle moves on.
	for (let i = 0; i < 8 && !(await page.getByText("3 of 3 milestones verified").count()); i++) await demoControls(page, "Skip")
	await expect(page.getByText("3 of 3 milestones verified")).toBeVisible()
	await expect(dockRow(page)).toContainText("10/12")
	await openDock(page)
	await expect(page.locator(".mxd-panel")).toContainText("Published under FIN-AP-7.")
	await page.keyboard.press("Escape")

	// The previews are the beat this demo builds to: they must show THIS demo's data, never another's.
	{
		await page.getByRole("tab", { name: /^Results/ }).click()
		await page.getByRole("button", { name: /AP exception dashboard/ }).first().click()
		const results = page.locator(".aop-results-preview")
		await expect(results.getByText("AP exceptions ·", { exact: false }).first()).toBeVisible()
		await expect(results.getByText("Cleared today", { exact: false }).first()).toBeVisible()
		await expect(results.getByText("Revenue ·", { exact: false })).toHaveCount(0)
		await expect(results.getByText("SQL Server field", { exact: false })).toHaveCount(0)
		await expect(results.getByText("$1,284,310.42", { exact: false })).toHaveCount(0)
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

test("the AP exceptions demo keeps its own storage, leaving the revenue demo and the everyday prototype untouched", async ({ page }) => {
	test.setTimeout(120_000)
	await page.goto(DEMO)
	await startExceptionsDiscovery(page)

	const keys = await page.evaluate(() => Object.keys(localStorage).sort())
	// Its own suffixed copies exist; nothing of the everyday prototype or the other demo is written.
	expect(keys).toContain("maxion.prototype.discovery-records.v1::demo-servicenow")
	expect(keys.some(key => key.endsWith("::demo-revenue"))).toBe(false)
	expect(keys).not.toContain("maxion.prototype.discovery-records.v1")
	expect(keys).not.toContain("maxion-agentix-operations-v4")

	const saved = await savedDemo(page)
	expect(saved.discovery.some(record => record.scenarioKey === "servicenow")).toBe(true)
	expect(saved.discovery.some(record => record.scenarioKey === "revenue")).toBe(false)

	// The everyday prototype opens on its own data, with no demo row.
	await page.goto("/maxion-prototype")
	await expect(dockRow(page)).toHaveCount(0)
	const everyday = await page.evaluate(([discovery, agentix]) => ({
		discovery: localStorage.getItem(discovery) !== null,
		agentix: localStorage.getItem(agentix) !== null,
	}), [EVERYDAY_DISCOVERY, EVERYDAY_AGENTIX])
	expect(everyday.discovery || everyday.agentix).toBe(true)
})

test("every new AP exceptions Discovery starts Agentix again from zero", async ({ page }) => {
	test.setTimeout(240_000)
	await page.goto(`${DEMO}&start=package`)
	await handOff(page)
	await createEngagement(page)

	// A second Discovery of the same scenario replaces the first and resets its Agentix.
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Discover", exact: true }).click()
	await page.locator(".workspace-header").getByRole("button", { name: "More Discovery actions" }).click()
	await page.getByRole("menuitem", { name: "New Discovery" }).click()
	await startExceptionsDiscovery(page, async () => {
		await expect(replaceNote(page)).toContainText("replaces the earlier AP invoice exceptions Discovery and starts Agentix again from zero")
		// The note describes the button that does it.
		expect(await page.getByRole("button", { name: "Create Discovery" }).getAttribute("aria-describedby")).toBe(await replaceNote(page).getAttribute("id"))
	})
	await expect(dockRow(page)).toContainText("2/12")

	const saved = await savedDemo(page)
	const records = saved.discovery.filter(record => record.scenarioKey === "servicenow")
	expect(records).toHaveLength(1)
	const agentix = saved.agentix as { engagements: Record<string, { status: string; packages: string[] }>; work: { engagementId: string }[] }
	expect(agentix.engagements.payables.status).toBe("draft")
	expect(agentix.engagements.payables.packages).toEqual([])
	expect(agentix.work.filter(entry => entry.engagementId === "payables")).toEqual([])
})
