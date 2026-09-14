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
	await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible()
	await expect(page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Projects" })).toBeFocused()
})

test("keeps drawer-to-command ownership and command navigation focus safe on mobile", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto("/maxion-prototype")
	const mobileTrigger = page.getByRole("button", { name: "Open navigation" })
	const openFromDrawer = async () => {
		await mobileTrigger.click()
		const drawer = page.getByRole("dialog", { name: "Main navigation" })
		await drawer.getByRole("button", { name: "Open command menu" }).click()
		const menu = shellMenu(page)
		await expect(menu).toBeVisible()
		await expect(menu.getByRole("textbox", { name: "Search MAXION commands" })).toBeFocused()
		return menu
	}

	let menu = await openFromDrawer()
	for (const selector of [".mxp-portal-sidebar", ".mxp-stage"]) {
		await expect(page.locator(selector)).toHaveAttribute("inert", "")
		await expect(page.locator(selector)).toHaveAttribute("aria-hidden", "true")
	}
	const search = menu.getByRole("textbox", { name: "Search MAXION commands" })
	const last = menu.getByRole("button").last()
	await last.focus()
	await page.keyboard.press("Tab")
	await expect(search).toBeFocused()
	await page.keyboard.press("Shift+Tab")
	await expect(last).toBeFocused()
	await page.keyboard.press("Escape")
	await expect(menu).toHaveCount(0)
	await expect(mobileTrigger).toBeVisible()
	await expect(mobileTrigger).toBeFocused()
	for (const selector of [".mxp-portal-sidebar", ".mxp-stage"]) {
		await expect(page.locator(selector)).not.toHaveAttribute("inert", "")
		await expect(page.locator(selector)).not.toHaveAttribute("aria-hidden", "true")
	}

	// A detached opener and document/body are never accepted as restored focus.
	await page.evaluate(() => {
		const stale = document.createElement("button")
		stale.dataset.testid = "stale-command-opener"
		document.querySelector(".mxp-stage")?.append(stale)
		stale.focus()
	})
	await page.keyboard.press("ControlOrMeta+k")
	await expect(shellMenu(page)).toBeVisible()
	await page.evaluate(() => document.querySelector('[data-testid="stale-command-opener"]')?.remove())
	await page.keyboard.press("Escape")
	await expect(mobileTrigger).toBeFocused()

	// Same-module and cross-module command navigation land on the visible trigger,
	// never the CSS-hidden rail button.
	for (const destination of ["Dashboard", "Projects"]) {
		menu = await openFromDrawer()
		const input = menu.getByRole("textbox", { name: "Search MAXION commands" })
		await input.fill(destination)
		await input.press("Enter")
		await expect(shellMenu(page)).toHaveCount(0)
		await expect(mobileTrigger).toBeFocused()
	}
	await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible()

	// Commands whose destination establishes focus keep that stronger hand-off.
	menu = await openFromDrawer()
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).fill("Start a Discovery")
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).press("Enter")
	await expect(page.getByRole("textbox", { name: "Discovery brief" })).toBeFocused()

	menu = await openFromDrawer()
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).fill("Execute")
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).press("Enter")
	await expect(page.getByRole("heading", { name: "Approved Plan required" })).toBeVisible()
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

	// Filter → ArrowDown → ArrowUp → Enter preserves keyboard selection and runs it.
	await search.fill("Agentix")
	await expect(menu.locator("button.is-active")).toContainText("Agentix")
	await search.press("ArrowDown")
	await expect(menu.locator("button.is-active")).not.toHaveText(/^AgentixCurrent moduleGo to$/)
	await search.press("ArrowUp")
	await expect(menu.locator("button.is-active")).toContainText("Agentix")
	await search.press("Enter")
	await expect(shellMenu(page)).toHaveCount(0)
	await expect(page.getByRole("region", { name: "Agentix operations" })).toBeVisible()

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
	await expect(page.getByRole("region", { name: "Agentix operations" })).toBeVisible()

	// From Agentix, a Plan section command lands on the evidence-gated Plan surface.
	let menu = await openShellMenu(page)
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).fill("Workstreams")
	await expect(menu.locator("button.is-active")).toContainText("Workstreams")
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).press("Enter")
	await expect(page.getByRole("heading", { name: "No evidence-backed plan yet" })).toBeVisible()

	// Without an approved Plan, an Execute jump fails closed on the intake boundary.
	menu = await openShellMenu(page)
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).fill("Execute")
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).press("Enter")
	await expect(page.getByRole("heading", { name: "Approved Plan required" })).toBeVisible()

	// A saved Discovery that needs input is registered too, and resumes at its decision.
	menu = await openShellMenu(page)
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).fill("Review decision")
	await expect(menu.locator("button.is-active")).toContainText("Redesign third-party onboarding controls")
	await menu.getByRole("textbox", { name: "Search MAXION commands" }).press("Enter")
	await expect(page.getByRole("complementary", { name: "Evidence, facts, and gaps" })).toContainText("Authority boundary")

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
	await expect(entering).toContainText("3 active · 0 need attention")

	await navigation.getByRole("button", { name: /^Execute/ }).click()
	await expect(page.locator(".mxp-stage-view--execute.is-entering")).toHaveCount(1)
	// The stage transition must not stay painted over the module.
	await expect
		.poll(async () => page.locator(".mxp-stage-view--execute").evaluate((element) => getComputedStyle(element, "::before").opacity))
		.toBe("0")
	await expect(page.getByRole("heading", { name: "Approved Plan required" })).toBeVisible()
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
	await expect(page.getByRole("heading", { name: /decisions\. Everything else is moving\./ })).toBeVisible()
	await expect(navigation.getByRole("button", { name: "Agentix 2 pending" })).toBeVisible()
	menu = await openShellMenu(page)
	await menu.getByRole("button", { name: /Review invoice variance/ }).click()
	await expect(page.getByRole("heading", { name: "Approve the proposed INV-20841 change?" })).toBeVisible()
	await page.getByRole("button", { name: "Approve variance" }).click()
	await page.getByRole("button", { name: "View initiative" }).click()
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
