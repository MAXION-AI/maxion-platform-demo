import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("scopes ⌘K to Execute and drives workspaces and views from the palette", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()

	// On the Dashboard the portal menu owns ⌘K; the Execute palette must stay closed.
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toBeVisible()
	await expect(page.getByRole("dialog", { name: "Execute command menu" })).toHaveCount(0)
	await page.keyboard.press("Escape")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toHaveCount(0)

	// Inside Execute, ⌘K opens the Execute-scoped palette and suppresses the portal menu.
	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: "Execute 1 pending" }).click()
	await expect(page.getByRole("heading", { name: "What do you want built?", exact: true })).toBeVisible()
	await page.keyboard.press("ControlOrMeta+k")
	const palette = page.getByRole("dialog", { name: "Execute command menu" })
	await expect(palette).toBeVisible()
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toHaveCount(0)
	const paletteAccessibility = await new AxeBuilder({ page }).include(".aex-palette-layer").analyze()
	expect(paletteAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	// Escape closes the palette without leaving Execute.
	await page.keyboard.press("Escape")
	await expect(palette).toHaveCount(0)
	await expect(page.getByRole("heading", { name: "What do you want built?", exact: true })).toBeVisible()

	// The palette jumps straight into a workspace agent session from the hub.
	await page.keyboard.press("ControlOrMeta+k")
	const paletteSearch = palette.getByRole("textbox", { name: "Search Execute commands" })
	await paletteSearch.fill("reconciliation")
	await paletteSearch.press("Enter")
	await expect(page.getByRole("heading", { name: "Implement durable reconciliation" })).toBeVisible()

	// Digits switch inspector views while the workspace is open.
	await page.keyboard.press("2")
	await expect(page.getByRole("heading", { name: "Changes" })).toBeVisible()
	await page.keyboard.press("6")
	await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible()

	// Slash focuses the steering composer, and digits typed there stay text.
	await page.keyboard.press("/")
	const composer = page.getByRole("textbox", { name: "Steer Workspace 03: Implement durable reconciliation" })
	await expect(composer).toBeFocused()
	await page.keyboard.press("3")
	await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible()
	await expect(composer).toHaveValue("3")

	// Module navigation from the palette, after which the shell owns ⌘K again.
	await page.keyboard.press("ControlOrMeta+k")
	await paletteSearch.fill("Dashboard")
	await paletteSearch.press("Enter")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toBeVisible()
	await expect(page.getByRole("dialog", { name: "Execute command menu" })).toHaveCount(0)
	await page.keyboard.press("Escape")

	expect(runtimeErrors).toEqual([])
})

test("focuses the hub composer on entry and gives N a real new-task action", async ({ page }) => {
	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Execute 1 pending" }).click()

	// Arriving lands typing-ready: the composer holds focus once the stage is visible.
	const composer = page.getByRole("textbox", { name: "What should Execute deliver?" })
	await expect(composer).toBeFocused()

	// '/' returns to a focused prompt composer after the source toggle removed it.
	await page.getByRole("button", { name: "Import from Plan" }).click()
	await expect(composer).toHaveCount(0)
	await page.keyboard.press("/")
	await expect(composer).toBeFocused()

	// N starts a new task whenever the user is not typing.
	await page.getByRole("button", { name: "Import from Plan" }).click()
	await expect(composer).toHaveCount(0)
	await page.keyboard.press("n")
	await expect(composer).toBeFocused()
})
