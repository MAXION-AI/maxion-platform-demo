import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

// The shell command layer is the platform's cross-module spine: one registry every module
// feeds, reachable from the sidebar in any module and from ⌘K wherever no module palette
// owns the keyboard.
function shellMenu(page: import("@playwright/test").Page) {
	return page.getByRole("dialog", { name: "MAXION command menu" })
}

async function openShellMenu(page: import("@playwright/test").Page) {
	await page.getByRole("button", { name: "Open command menu" }).click()
	await expect(shellMenu(page)).toBeVisible()
	return shellMenu(page)
}

test("the global command menu filters, arrow-navigates, and runs the active item", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()

	await page.keyboard.press("ControlOrMeta+k")
	const menu = shellMenu(page)
	await expect(menu).toBeVisible()

	// Pinned survivors of the rebuild: navigation, Integrations, and both quick actions.
	for (const name of ["Dashboard", "Projects", "Discover", "Plan", "Execute", "Agentix", "Consult Max", "Integrations"]) {
		await expect(menu.getByRole("button", { name: new RegExp(`^${name}`) }).first()).toBeVisible()
	}
	await expect(menu.getByRole("button", { name: /Start a Discovery/ })).toBeVisible()
	await expect(menu.getByRole("button", { name: /Create an operational Agent/ })).toBeVisible()
	await expect(menu.getByText("navigate")).toBeVisible()

	const search = menu.getByRole("textbox", { name: "Search MAXION commands" })
	const restingRows = await menu.getByRole("button").count()
	expect(restingRows).toBeGreaterThanOrEqual(10)
	await search.fill("integrations")
	await expect(menu.locator("button.is-active")).toContainText("Integrations")
	expect(await menu.getByRole("button").count()).toBeLessThan(restingRows)

	// Nothing matching is stated, not implied by an empty list.
	await search.fill("zzzz-nothing-here")
	await expect(menu.getByText(/Nothing in MAXION matches/)).toBeVisible()

	// Filter → ArrowDown → Enter runs the second match, not the first.
	await search.fill("Open Workspace")
	await expect(menu.locator("button.is-active")).toContainText("Open Workspace 01")
	await search.press("ArrowDown")
	await expect(menu.locator("button.is-active")).toContainText("Open Workspace 02")
	await search.press("ArrowUp")
	await expect(menu.locator("button.is-active")).toContainText("Open Workspace 01")
	await search.press("ArrowDown")
	await search.press("ArrowDown")
	await expect(menu.locator("button.is-active")).toContainText("Open Workspace 03")
	await search.press("Enter")
	await expect(shellMenu(page)).toHaveCount(0)
	await expect(page.getByRole("heading", { name: "Implement durable reconciliation" })).toBeVisible()

	// Escape closes the menu from anywhere it can be opened.
	await openShellMenu(page)
	await page.keyboard.press("Escape")
	await expect(shellMenu(page)).toHaveCount(0)

	expect(runtimeErrors).toEqual([])
})

test("jumps across modules from wherever the viewer already is", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: "Agentix 2 pending" }).click()
	await expect(page.getByRole("heading", { name: "Two decisions. Three agents working." })).toBeVisible()

	// From Agentix, "INT-02" lands on the Plan contract — the plan opens itself at L3.
	let menu = await openShellMenu(page)
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).fill("INT-02")
	await expect(menu.locator("button.is-active")).toContainText("INT-02")
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).press("Enter")
	await expect(page.getByRole("heading", { name: "See the flow. Understand the behavior. Know what to build." })).toBeVisible()
	await expect(page.getByRole("group", { name: "L3 diagram for ServiceNow to Workday financial integration" })).toBeVisible()
	await expect(page.getByRole("region", { name: "L3 executable handoff" }).getByText("INT-01")).toBeVisible()

	// From Plan, an Execute workspace opens directly into its agent session.
	menu = await openShellMenu(page)
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).fill("Workspace 03")
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).press("Enter")
	await expect(page.getByRole("heading", { name: "Implement durable reconciliation" })).toBeVisible()
	await expect(page.getByRole("textbox", { name: "Steer Workspace 03: Implement durable reconciliation" })).toBeVisible()

	// A saved Discovery that needs input is registered too, and resumes at its decision.
	menu = await openShellMenu(page)
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).fill("Review decision")
	await expect(menu.locator("button.is-active")).toContainText("Third-party onboarding control redesign")
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).press("Enter")
	// The gate heading, not a loose text match: the seeded MAX message quotes the
	// same exception title, so a substring locator resolves to two nodes as soon
	// as the thread renders and only passed while the previous view was still up.
	await expect(page.getByRole("heading", { name: "One external interview needs your approval" })).toBeVisible()

	expect(runtimeErrors).toEqual([])
})

test("gives the newly visible stage its own entrance and clears the Execute scrim", async ({ page }) => {
	await page.goto("/maxion-prototype")
	const entering = page.locator(".mxp-stage-view.is-entering")
	await expect(entering).toHaveCount(1)
	await expect(entering).toContainText("Good afternoon, Root Admin")

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: "Projects" }).click()
	await expect(entering).toHaveCount(1)
	await expect(entering).toContainText("3 active projects · 1 archived")

	await navigation.getByRole("button", { name: "Execute 1 pending" }).click()
	await expect(page.locator(".mxp-stage-view--execute.is-entering")).toHaveCount(1)
	// The dark scrim is theater only: it must not stay painted over the module.
	await expect
		.poll(async () => page.locator(".mxp-stage-view--execute").evaluate((element) => getComputedStyle(element, "::before").opacity))
		.toBe("0")
	await expect(page.getByRole("heading", { name: "What do you want built?", exact: true })).toBeVisible()
})

test("reports live Agentix attention to the shell badge and the jump registry", async ({ page }) => {
	await page.goto("/maxion-prototype")
	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await expect(navigation.getByRole("button", { name: "Agentix 2 pending" })).toBeVisible()

	// Both open boundaries are registered while they are open.
	let menu = await openShellMenu(page)
	await expect(menu.getByRole("button", { name: /Answer the waiting question/ })).toBeVisible()
	await expect(menu.getByRole("button", { name: /Review July close effects/ })).toBeVisible()
	await page.keyboard.press("Escape")

	await navigation.getByRole("button", { name: "Agentix 2 pending" }).click()
	await page.getByRole("button", { name: "Answer" }).click()
	await expect(page.getByRole("heading", { name: "Who may receive overdue reminders?" })).toBeVisible()
	await page.getByRole("button", { name: "Use project team only" }).click()
	await expect(navigation.getByRole("button", { name: "Agentix 1 pending" })).toBeVisible()

	// The resolved decision leaves the registry; the open one stays and still routes.
	menu = await openShellMenu(page)
	await expect(menu.getByRole("button", { name: /Answer the waiting question/ })).toHaveCount(0)
	await menu.getByRole("button", { name: /Review July close effects/ }).click()
	await expect(page.getByRole("heading", { name: "Finance close operator" })).toBeVisible()
	await page.getByRole("button", { name: "Review exact effects" }).click()
	await page.getByRole("button", { name: "Approve exact effects" }).click()
	await expect(navigation.getByRole("button", { name: "Agentix", exact: true })).toBeVisible()
	await expect(navigation.getByRole("button", { name: /Agentix \d pending/ })).toHaveCount(0)
})

test("keeps the global command menu accessible", async ({ page }) => {
	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()
	await page.keyboard.press("ControlOrMeta+k")
	await expect(shellMenu(page)).toBeVisible()
	// Contrast is measured on the settled surface, not mid-entrance.
	await expect.poll(async () => shellMenu(page).evaluate((element) => getComputedStyle(element).opacity)).toBe("1")
	const accessibility = await new AxeBuilder({ page }).include(".mxp-command-layer").analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
})
