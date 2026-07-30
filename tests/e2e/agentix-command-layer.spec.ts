import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

async function enterAgentix(page: import("@playwright/test").Page) {
	await page.goto("/maxion-prototype")
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Agentix 2 pending" }).click()
	await expect(page.getByRole("heading", { name: "Two decisions. Three agents working." })).toBeVisible()
}

test("shell owns ⌘K on Dashboard even after Agentix has mounted", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await enterAgentix(page)
	// Park Agentix on a non-default surface so a hidden-state leak would be observable.
	await page.getByRole("button", { name: "New Agent ⌘K" }).click()
	await expect(page.getByRole("heading", { name: "What should this Agent own?" })).toBeVisible()

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: "Dashboard" }).click()
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toBeVisible()
	await expect(page.getByRole("dialog", { name: "Agentix command menu" })).toHaveCount(0)
	await page.keyboard.press("Escape")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toHaveCount(0)

	// The hidden Agentix stage kept its surface — the old ungated listener reset it to Today.
	await navigation.getByRole("button", { name: "Agentix 2 pending" }).click()
	await expect(page.getByRole("heading", { name: "What should this Agent own?" })).toBeVisible()
	expect(runtimeErrors).toEqual([])
})

test("⌘K inside Agentix opens the composer-anchored popover and the composer keeps focus", async ({ page }) => {
	await enterAgentix(page)
	await page.keyboard.press("ControlOrMeta+k")
	const palette = page.getByRole("dialog", { name: "Agentix command menu" })
	await expect(palette).toBeVisible()
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toHaveCount(0)

	// L1: the composer is the combobox — focus never leaves it for a detached input.
	const composer = page.getByRole("textbox", { name: "Message Agentix" })
	await expect(composer).toBeFocused()
	// New Agent leads the list, keeping the pinned "New Agent ⌘K" hint honest.
	await expect(palette.getByRole("button").first()).toContainText("New Agent")

	// Typing in the composer filters the popover; Enter runs the active item without a focus hop.
	await composer.fill("close")
	await expect(palette.getByRole("button", { name: /Review July close effects/ })).toBeVisible()
	await page.keyboard.press("Enter")
	await expect(palette).toHaveCount(0)
	await expect(page.getByRole("heading", { name: "Finance close operator" })).toBeVisible()
	await expect(composer).toHaveValue("")

	// Escape closes the popover and leaves the composer focused.
	await page.keyboard.press("ControlOrMeta+k")
	await expect(palette).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(palette).toHaveCount(0)
	await expect(composer).toBeFocused()
})

test("digits, slash, and the Escape ladder drive Agentix from the keyboard", async ({ page }) => {
	await enterAgentix(page)
	const composer = page.getByRole("textbox", { name: "Message Agentix" })

	// Digits typed into the composer never switch surfaces.
	await composer.click()
	await page.keyboard.press("2")
	await expect(page.getByRole("heading", { name: "Two decisions. Three agents working." })).toBeVisible()
	await composer.fill("")
	await composer.blur()

	await page.keyboard.press("2")
	await expect(page.getByRole("heading", { name: "Everything Agentix committed" })).toBeVisible()
	await page.keyboard.press("3")
	await expect(page.getByRole("heading", { name: "Atlas program lead" })).toBeVisible()
	await page.keyboard.press("5")
	await expect(page.getByRole("heading", { name: "Finance close operator" })).toBeVisible()
	await page.keyboard.press("1")
	await expect(page.getByRole("heading", { name: "Two decisions. Three agents working." })).toBeVisible()

	// Slash returns to the composer from anywhere.
	await page.keyboard.press("/")
	await expect(composer).toBeFocused()
	await expect(composer).toHaveValue("")

	// Escape ladder: the approval drawer consumes Escape before the shell ever sees it.
	await page.getByRole("button", { name: "Review effects" }).click()
	await page.getByRole("button", { name: "Review exact effects" }).click()
	await expect(page.getByRole("dialog", { name: "July close effects" })).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(page.getByRole("dialog", { name: "July close effects" })).toHaveCount(0)
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toHaveCount(0)
})

test("attention CTAs land with the decision card inside the viewport", async ({ page }) => {
	await enterAgentix(page)

	// "Answer" must land on the clarification card, not the top of the thread.
	await page.getByRole("button", { name: "Answer" }).click()
	const question = page.locator("#audience-question")
	await expect(question).toBeVisible()
	// The anchor scroll settles over a few hundred ms — poll the geometry.
	await expect
		.poll(async () => question.evaluate((node) => {
			const card = node.closest(".ax3-inline-decision")
			const main = node.closest(".ax3-main")
			if (!card || !main) return false
			const mainRect = main.getBoundingClientRect()
			const cardRect = card.getBoundingClientRect()
			return cardRect.top >= mainRect.top - 4 && cardRect.bottom <= mainRect.bottom + 4
		}))
		.toBe(true)

	// "Review effects" must land on the approval card with its CTA reachable.
	await page.keyboard.press("1")
	await expect(page.getByRole("heading", { name: "Two decisions. Three agents working." })).toBeVisible()
	await page.getByRole("button", { name: "Review effects" }).click()
	const approval = page.locator("#approval-question")
	await expect(approval).toBeVisible()
	await expect
		.poll(async () => approval.evaluate((node) => {
			const card = node.closest(".ax3-inline-decision")
			const main = node.closest(".ax3-main")
			if (!card || !main) return false
			const mainRect = main.getBoundingClientRect()
			const cardRect = card.getBoundingClientRect()
			return cardRect.top >= mainRect.top - 4 && cardRect.bottom <= mainRect.bottom + 4
		}))
		.toBe(true)
	await expect(page.getByRole("button", { name: "Review exact effects" })).toBeInViewport()
})

test("the Agentix stage passes an axe scan for serious and critical violations", async ({ page }) => {
	await enterAgentix(page)
	// Phase B landed the cascade armor and the Stop button name — the stage scan runs full rules.
	const today = await new AxeBuilder({ page }).include(".ax3-root").analyze()
	expect(today.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	// The ⌘K popover itself must be clean.
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("dialog", { name: "Agentix command menu" })).toBeVisible()
	const popover = await new AxeBuilder({ page }).include(".ax3-cmd-pop").disableRules(["color-contrast"]).analyze()
	expect(popover.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
})

test("primary CTAs keep white ink and their type scale after the shell cascade loads", async ({ page }) => {
	await enterAgentix(page)
	const readStyle = (locator: import("@playwright/test").Locator) =>
		locator.evaluate((node) => { const style = window.getComputedStyle(node); return `${style.color} ${style.fontSize}` })

	// P0-2: without the .ax3-root cascade armor these render ink-on-teal at 3.45:1 and 14px.
	expect(await readStyle(page.getByRole("button", { name: "Review effects" }))).toBe("rgb(255, 255, 255) 10px")
	expect(await readStyle(page.getByRole("button", { name: "Answer" }))).toBe("rgb(255, 255, 255) 10px")

	await page.getByRole("button", { name: "New Agent ⌘K" }).click()
	await page.getByRole("button", { name: "Own a program" }).click()
	const build = page.getByRole("button", { name: "Build operating model" })
	await expect(build).toBeVisible()
	expect(await readStyle(build)).toBe("rgb(255, 255, 255) 10px")
	await build.click()
	const activate = page.getByRole("button", { name: "Activate Agent" })
	await expect(activate).toBeVisible()
	expect(await readStyle(activate)).toBe("rgb(255, 255, 255) 10px")
})

test("the approval drawer takes focus, traps Tab in both directions, and returns focus to its trigger", async ({ page }) => {
	await enterAgentix(page)
	await page.getByRole("button", { name: "Review effects" }).click()
	const trigger = page.getByRole("button", { name: "Review exact effects" })
	await trigger.click()
	const dialog = page.getByRole("dialog", { name: "July close effects" })
	await expect(dialog).toBeVisible()
	await expect(dialog).toBeFocused()

	// Forward from the panel: first focusable is the close control.
	await page.keyboard.press("Tab")
	await expect(dialog.getByRole("button", { name: "Close approval" })).toBeFocused()
	// Backward from the first focusable wraps to the last.
	await page.keyboard.press("Shift+Tab")
	await expect(dialog.getByRole("button", { name: "Approve exact effects" })).toBeFocused()
	// Forward from the last wraps back to the first.
	await page.keyboard.press("Tab")
	await expect(dialog.getByRole("button", { name: "Close approval" })).toBeFocused()

	await page.keyboard.press("Escape")
	await expect(dialog).toHaveCount(0)
	await expect(trigger).toBeFocused()
})

test("evidence, artifacts, and connections deep-link into the inspector; the ledger records the session", async ({ page }) => {
	await enterAgentix(page)

	// Rail "Connections ready" opens the inspector at connections from Today.
	await page.getByRole("button", { name: "Connections ready 4 services available" }).click()
	const inspector = page.locator(".ax3-inspector")
	await expect(inspector).toBeVisible()
	await expect(inspector.getByText("Jira", { exact: true })).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(inspector).toHaveCount(0)

	// Approve the July close, then the Activity ledger carries the committed event and the
	// finance row stops claiming "awaiting approval".
	await page.getByRole("button", { name: "Review effects" }).click()
	await page.getByRole("button", { name: "Review exact effects" }).click()
	await page.getByRole("button", { name: "Approve exact effects" }).click()
	await page.keyboard.press("2")
	await expect(page.getByRole("heading", { name: "Everything Agentix committed" })).toBeVisible()
	await expect(page.getByText("July close effect set approved")).toBeVisible()
	await expect(page.getByText(/awaiting approval/)).toHaveCount(0)
	await expect(page.getByText("effects approved and reconciling")).toBeVisible()
	expect(await page.getByText("Verified", { exact: true }).count()).toBeGreaterThan(0)
})
