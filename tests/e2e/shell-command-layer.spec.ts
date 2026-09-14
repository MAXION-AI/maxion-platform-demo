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

test("autofocuses, contains focus, inerts the shell, and restores a meaningful opener on every close path", async ({ page }) => {
	await page.goto("/maxion-prototype")
	const opener = page.getByRole("button", { name: "Search or ask" })
	await opener.click()
	let menu = shellMenu(page)
	const search = menu.getByRole("textbox", { name: "Search MAXION commands" })
	await expect(search).toBeFocused()
	for (const selector of [".mxp-portal-sidebar", ".mxp-stage"]) {
		await expect(page.locator(selector)).toHaveAttribute("inert", "")
		await expect(page.locator(selector)).toHaveAttribute("aria-hidden", "true")
	}

	const last = menu.getByRole("button").last()
	await last.focus()
	await page.keyboard.press("Tab")
	await expect(search).toBeFocused()
	await page.keyboard.press("Shift+Tab")
	await expect(last).toBeFocused()
	await page.keyboard.press("Escape")
	await expect(menu).toHaveCount(0)
	await expect(opener).toBeFocused()
	for (const selector of [".mxp-portal-sidebar", ".mxp-stage"]) {
		await expect(page.locator(selector)).not.toHaveAttribute("inert", "")
		await expect(page.locator(selector)).not.toHaveAttribute("aria-hidden", "true")
	}

	await opener.click()
	menu = shellMenu(page)
	await page.locator(".mxp-command-layer").click({ position: { x: 4, y: 4 } })
	await expect(menu).toHaveCount(0)
	await expect(opener).toBeFocused()

	await opener.click()
	menu = shellMenu(page)
	await menu.getByRole("button", { name: /^Projects/ }).click()
	await expect(menu).toHaveCount(0)
	await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible()
	await expect(page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Projects" })).toBeFocused()
})

test("the global command menu filters, arrow-navigates, and runs the active item", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Work that moved. Decisions that wait." })).toBeVisible()

	await page.keyboard.press("ControlOrMeta+k")
	const menu = shellMenu(page)
	await expect(menu).toBeVisible()

	// Pinned survivors of the rebuild: navigation, Integrations, and both quick actions.
	for (const name of ["Dashboard", "Projects", "Discover", "Plan", "Execute", "Agentix", "Consult Max", "Integrations"]) {
		await expect(menu.getByRole("button", { name: new RegExp(`^${name}`) }).first()).toBeVisible()
	}
	await expect(menu.getByRole("button", { name: /Start a Discovery/ })).toBeVisible()
	await expect(menu.getByRole("button", { name: /New Agentix agent/ })).toBeVisible()
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
	await expect(page.getByRole("heading", { name: "MuleSoft" })).toBeVisible()

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
	await navigation.getByRole("button", { name: /^Agentix/ }).click()
	await expect(page.getByRole("main", { name: "Agentix workspace" })).toBeVisible()

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
	await expect(page.getByRole("heading", { name: "MuleSoft" })).toBeVisible()
	await expect(page.getByRole("textbox", { name: "Steer MuleSoft agent" })).toBeVisible()

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
	await expect(entering).toContainText("Work that moved. Decisions that wait.")

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: "Projects" }).click()
	await expect(entering).toHaveCount(1)
	await expect(entering).toContainText("3 active projects · 1 archived")

	await navigation.getByRole("button", { name: /^Execute/ }).click()
	await expect(page.locator(".mxp-stage-view--execute.is-entering")).toHaveCount(1)
	// The dark scrim is theater only: it must not stay painted over the module.
	await expect
		.poll(async () => page.locator(".mxp-stage-view--execute").evaluate((element) => getComputedStyle(element, "::before").opacity))
		.toBe("0")
	await expect(page.getByRole("heading", { name: "What do you want built?", exact: true })).toBeVisible()
})

test("reports live Agentix attention to the shell badge and the jump registry", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
	await page.goto("/maxion-prototype")
	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await expect(navigation.getByRole("button", { name: /^Agentix/ })).toBeVisible()
	let menu = await openShellMenu(page)
	await expect(menu.getByRole("button", { name: /Review invoice variance/ })).toBeVisible()
	await page.keyboard.press("Escape")
	await navigation.getByRole("button", { name: /^Agentix/ }).click()
	await expect(page.getByRole("heading", { name: "Deployed agents" })).toBeVisible()
	await expect(navigation.getByRole("button", { name: "Agentix 2 pending" })).toBeVisible()
	menu = await openShellMenu(page)
	await menu.getByRole("button", { name: /Review invoice variance/ }).click()
	await expect(page.getByRole("heading", { name: "Approve the $240 price variance?" })).toBeVisible()
	await page.getByRole("button", { name: "Approve $240 variance" }).click()
	await page.getByRole("button", { name: "Close details" }).click()
	await expect(navigation.getByRole("button", { name: "Agentix 1 pending" })).toBeVisible()
})

test("keeps the global command menu accessible", async ({ page }) => {
	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Work that moved. Decisions that wait." })).toBeVisible()
	await page.keyboard.press("ControlOrMeta+k")
	await expect(shellMenu(page)).toBeVisible()
	// Contrast is measured on the settled surface, not mid-entrance.
	await expect.poll(async () => shellMenu(page).evaluate((element) => getComputedStyle(element).opacity)).toBe("1")
	const accessibility = await new AxeBuilder({ page }).include(".mxp-command-layer").analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
})
