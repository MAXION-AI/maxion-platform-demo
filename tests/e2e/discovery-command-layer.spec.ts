import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("scopes ⌘K to the visible module and makes Start a Discovery open setup", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()

	// On the Dashboard the portal menu owns ⌘K; the Discovery palette must stay closed.
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toBeVisible()
	await expect(page.getByRole("dialog", { name: "Discovery command menu" })).toHaveCount(0)
	await page.keyboard.press("Escape")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toHaveCount(0)

	// Inside Discovery, ⌘K opens the Discovery-scoped palette and suppresses the portal menu.
	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: "Discover" }).click()
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await page.keyboard.press("ControlOrMeta+k")
	const palette = page.getByRole("dialog", { name: "Discovery command menu" })
	await expect(palette).toBeVisible()
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toHaveCount(0)
	const paletteAccessibility = await new AxeBuilder({ page }).include(".dsc-palette-layer").analyze()
	expect(paletteAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	// The palette resumes a saved discovery directly.
	const paletteSearch = palette.getByRole("textbox", { name: "Search Discovery" })
	await paletteSearch.fill("NorthBridge")
	await paletteSearch.press("Enter")
	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible()

	// The shell quick action opens Discovery setup, not wherever the module last was.
	await navigation.getByRole("button", { name: "Dashboard" }).click()
	await page.keyboard.press("ControlOrMeta+k")
	await page.getByRole("dialog", { name: "MAXION command menu" }).getByRole("button", { name: /Start a Discovery/ }).click()
	await expect(page.getByRole("heading", { name: "What should MAX accomplish?" })).toBeVisible()
	await expect(page.getByRole("textbox", { name: "Discovery brief" })).toBeFocused()

	expect(runtimeErrors).toEqual([])
})

test("drives the Discovery workspace from the keyboard", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "Resume ServiceNow financial-control integration, Working autonomously" }).click()
	await expect(page.getByRole("heading", { name: "MAX is running the Discovery." })).toBeVisible()

	// 1 opens the Thread and the composer takes focus.
	await page.keyboard.press("1")
	await expect(page.getByRole("heading", { name: "Work with MAX" })).toBeVisible()
	const composer = page.getByRole("textbox", { name: "Message MAX" })
	await expect(composer).toBeFocused()

	// Digits typed into an input never switch views.
	await page.keyboard.press("2")
	await expect(page.getByRole("heading", { name: "Work with MAX" })).toBeVisible()
	await composer.blur()
	await page.keyboard.press("2")
	await expect(page.getByRole("heading", { name: "MAX is running the Discovery." })).toBeVisible()

	// The locked Package tab explains itself instead of switching.
	await page.keyboard.press("3")
	await expect(page.getByText("Package unlocks at synthesis · MAX is still preparing the evidence")).toBeVisible()
	await expect(page.getByRole("heading", { name: "MAX is running the Discovery." })).toBeVisible()

	// Slash returns to the composer from anywhere in the workspace.
	await page.keyboard.press("/")
	await expect(composer).toBeFocused()

	// Escape closes the palette and hands focus back to the trigger.
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("dialog", { name: "Discovery command menu" })).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(page.getByRole("dialog", { name: "Discovery command menu" })).toHaveCount(0)
	await expect(composer).toBeFocused()
})

test("gives drawers initial focus, traps Tab, and restores focus on Escape", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "Resume Third-party onboarding control redesign, Needs your input" }).click()
	await expect(page.getByRole("heading", { name: "MAX is running the Discovery." })).toBeVisible()

	const peopleTrigger = page.getByRole("button", { name: /^People 4 mapped/ })
	await peopleTrigger.click()
	const drawer = page.getByRole("dialog", { name: "Stakeholder program" })
	await expect(drawer).toBeVisible()
	await expect(drawer.getByRole("button", { name: "Close panel" })).toBeFocused()

	// Tab stays inside the drawer in both directions.
	await page.keyboard.press("Shift+Tab")
	expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true)
	await page.keyboard.press("Tab")
	await expect(drawer.getByRole("button", { name: "Close panel" })).toBeFocused()

	await page.keyboard.press("Escape")
	await expect(drawer).toBeHidden()
	await expect(peopleTrigger).toBeFocused()
})

test("lands resumed needs-input discoveries on the waiting decision", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()

	// The inline card affordance resumes straight to the gate…
	await page.locator(".discovery-record-review", { hasText: "Review decision" }).click()
	const gate = page.locator(".decision-event")
	await expect(gate).toBeVisible()
	// …and the landing scroll must actually bring it into the log's viewport
	// (the scroll settles over a few hundred ms, so poll for placement).
	await expect
		.poll(async () => gate.evaluate((card) => {
			const log = card.closest(".message-log")
			if (!log) return false
			const logRect = log.getBoundingClientRect()
			const cardRect = card.getBoundingClientRect()
			return cardRect.top >= logRect.top - 4 && cardRect.top < logRect.bottom
		}))
		.toBe(true)
	await expect(page.getByRole("heading", { name: "One external interview needs your approval" })).toBeVisible()

	// Scrolling the gate out of view surfaces the pinned jump chip; the chip returns to it.
	await gate.evaluate((card) => card.closest(".message-log")?.scrollTo({ top: 0, behavior: "auto" }))
	const jumpChip = page.getByRole("button", { name: /decision needs you/ })
	await expect(jumpChip).toBeVisible()
	await jumpChip.click()
	await expect(jumpChip).toBeHidden()
	await expect
		.poll(async () => gate.evaluate((card) => {
			const log = card.closest(".message-log")
			if (!log) return false
			const logRect = log.getBoundingClientRect()
			const cardRect = card.getBoundingClientRect()
			return cardRect.bottom > logRect.top && cardRect.top < logRect.bottom
		}))
		.toBe(true)
})
