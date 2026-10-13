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
	for (const name of ["Dashboard", "Projects", "Discover", "Agentix", "Consult Max", "Integrations"]) {
		await expect(menu.getByRole("button", { name: new RegExp(`^${name}`) }).first()).toBeVisible()
	}
	// Plan and Execute are disabled, so the menu offers no way into them.
	for (const name of ["Plan", "Execute"]) {
		await expect(menu.getByRole("button", { name: new RegExp(`^${name}`) })).toHaveCount(0)
	}
	await expect(menu.getByRole("button", { name: /Start a Discovery/ })).toBeVisible()
	await expect(menu.getByRole("button", { name: /New Agentix engagement/ })).toBeVisible()
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

	// Filter → ArrowDown → Enter runs the second match, not the first. The saved Discoveries are
	// the multi-match group now that Plan and Execute are gone from the menu.
	await search.fill("Resume")
	const matches = menu.getByRole("button")
	expect(await matches.count()).toBeGreaterThanOrEqual(3)
	const firstMatch = (await matches.first().textContent()) ?? ""
	const secondMatch = (await matches.nth(1).textContent()) ?? ""
	expect(firstMatch).not.toBe(secondMatch)
	await expect(menu.locator("button.is-active")).toHaveText(firstMatch)
	await search.press("ArrowDown")
	await expect(menu.locator("button.is-active")).toHaveText(secondMatch)
	await search.press("ArrowUp")
	await expect(menu.locator("button.is-active")).toHaveText(firstMatch)
	await search.press("ArrowDown")
	await search.press("Enter")
	await expect(shellMenu(page)).toHaveCount(0)

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

	// A saved Discovery that needs input is registered, and resumes at its decision.
	let menu = await openShellMenu(page)
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).fill("Review decision")
	await expect(menu.locator("button.is-active")).toContainText("Third-party onboarding control redesign")
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).press("Enter")
	// The gate heading, not a loose text match: the seeded MAX message quotes the
	// same exception title, so a substring locator resolves to two nodes as soon
	// as the thread renders and only passed while the previous view was still up.
	await expect(page.getByRole("heading", { name: "One external interview needs your approval" })).toBeVisible()

	expect(runtimeErrors).toEqual([])
})

test("gives the newly visible stage its own entrance", async ({ page }) => {
	await page.goto("/maxion-prototype")
	const entering = page.locator(".mxp-stage-view.is-entering")
	await expect(entering).toHaveCount(1)
	await expect(entering).toContainText("Good afternoon, Root Admin")

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: "Projects" }).click()
	await expect(entering).toHaveCount(1)
	await expect(entering).toContainText("3 active projects · 1 archived")

	await navigation.getByRole("button", { name: /^Agentix/ }).click()
	await expect(entering).toHaveCount(1)
	await expect(page.getByRole("main", { name: "Agentix workspace" })).toBeVisible()
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
	await expect(page.getByRole("heading", { name: "Engagements", exact: true })).toBeVisible()
	await expect(navigation.getByRole("button", { name: "Agentix 2 pending" })).toBeVisible()
	menu = await openShellMenu(page)
	await menu.getByRole("button", { name: /Review invoice variance/ }).click()
	await expect(page.getByRole("heading", { name: "Approve the $240 price variance?" })).toBeVisible()
	await page.getByRole("button", { name: "Approve $240 variance" }).click()
	await page.getByRole("button", { name: "Work", exact: true }).click()
	await expect(navigation.getByRole("button", { name: "Agentix 1 pending" })).toBeVisible()
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
