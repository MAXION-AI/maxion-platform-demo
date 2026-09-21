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
	await expect(page.getByRole("heading", { name: /MAX is investigating|Your next step/ })).toBeVisible()
	const composer = page.getByRole("textbox", { name: "Message MAX" })
	await expect(composer).toBeFocused()

	// Digits typed into an input never switch views.
	await page.keyboard.press("2")
	await expect(page.getByRole("heading", { name: /MAX is investigating|Your next step/ })).toBeVisible()
	await composer.blur()
	await page.keyboard.press("2")
	await expect(page.getByRole("heading", { name: "MAX is running the Discovery." })).toBeVisible()

	// 3 is the Workshop room, 4 the package. Planned deliverables stay
	// inspectable before synthesis.
	await page.keyboard.press("4")
	await expect(page.getByRole("heading", { name: "Planned deliverables" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Export all" })).toBeDisabled()

	// Slash returns to the composer from anywhere in the workspace.
	await page.keyboard.press("/")
	await expect(composer).toBeFocused()

	// The menu is modal: the field keeps focus, the arrows move the highlighted option, and Tab stays inside.
	await page.keyboard.press("ControlOrMeta+k")
	const palette = page.getByRole("dialog", { name: "Discovery command menu" })
	await expect(palette).toBeVisible()
	await expect(palette).toHaveAttribute("aria-modal", "true")
	const search = palette.getByRole("textbox", { name: "Search Discovery" })
	await page.keyboard.press("ArrowDown")
	const highlighted = palette.getByRole("option", { selected: true })
	await expect(highlighted).toHaveCount(1)
	await expect(search).toHaveAttribute("aria-activedescendant", (await highlighted.getAttribute("id")) ?? "")
	await page.keyboard.press("Tab")
	await expect(search).toBeFocused()
	await page.keyboard.press("Shift+Tab")
	await expect(search).toBeFocused()
	await expect(palette.locator("footer")).toContainText("Composer")

	// Escape closes the palette and hands focus back to the trigger.
	await page.keyboard.press("Escape")
	await expect(palette).toHaveCount(0)
	await expect(composer).toBeFocused()

	// On the hub nothing is open, and view keys have nothing to switch.
	await page.getByRole("button", { name: "All discoveries", exact: true }).click()
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await page.keyboard.press("ControlOrMeta+k")
	await expect(palette).toBeVisible()
	await expect(palette).not.toContainText("Currently open")
	await expect(palette.locator("footer")).not.toContainText("Composer")
	await page.keyboard.press("Escape")
})

test("keeps page shortcuts and the menu behind an open dialog or sheet", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "Resume NorthBridge acquisition diligence, Completed" }).click()
	const packageTab = page.getByRole("button", { name: "Package", exact: true })
	await packageTab.click()
	await expect(packageTab).toHaveClass(/active/)

	await page.getByRole("button", { name: "Review handoff" }).click()
	const dialog = page.getByRole("dialog", { name: "Continue to Agentix" })
	const cancel = dialog.getByRole("button", { name: "Cancel" })
	await cancel.focus()
	await page.keyboard.press("1")
	await page.keyboard.press("/")
	await page.keyboard.press("ControlOrMeta+k")
	await expect(cancel).toBeFocused()
	await expect(packageTab).toHaveClass(/active/)
	await expect(page.getByRole("dialog", { name: "Discovery command menu" })).toHaveCount(0)
	await page.keyboard.press("Escape")
	await expect(dialog).toHaveCount(0)

	await page.getByRole("button", { name: "Open setup" }).click()
	const sheet = page.getByRole("dialog", { name: "Setup" })
	await expect(sheet).toBeVisible()
	await page.keyboard.press("/")
	await page.keyboard.press("2")
	await expect.poll(() => sheet.evaluate((element) => element.contains(document.activeElement))).toBe(true)
	await expect(packageTab).toHaveClass(/active/)
})

test("routes the header to the composer, out of the menu, and on to Agentix after the handoff", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "Resume ServiceNow financial-control integration, Working autonomously" }).click()
	await page.getByRole("button", { name: "Thread", exact: true }).click()
	const composer = page.getByRole("textbox", { name: "Message MAX" })
	await page.getByRole("button", { name: "Steer MAX" }).click()
	await expect(composer).toBeFocused()
	await page.getByRole("button", { name: "Autonomy", exact: true }).click()
	await page.getByRole("button", { name: "Discovery status" }).click()
	await expect(composer).toBeFocused()

	// Tab leaves the overflow menu and closes it.
	await page.getByRole("button", { name: "More Discovery actions" }).click()
	await expect(page.getByRole("menuitem", { name: "New Discovery" })).toBeFocused()
	await page.keyboard.press("Tab")
	await expect(page.getByRole("menu", { name: "More Discovery actions" })).toHaveCount(0)

	// A finished run is handed off once, and then the header is the way to Agentix.
	await page.getByRole("button", { name: "All discoveries", exact: true }).click()
	await page.getByRole("button", { name: "Resume NorthBridge acquisition diligence, Completed" }).click()
	await expect(page.getByRole("button", { name: "Package", exact: true })).toHaveAccessibleDescription("Ready to hand off")
	await page.getByRole("button", { name: "Package", exact: true }).click()
	await page.getByRole("button", { name: "Review handoff" }).click()
	await page.getByRole("dialog", { name: "Continue to Agentix" }).getByRole("button", { name: "Continue to Agentix" }).click()
	// NorthBridge has no prebuilt operating design, so its packet opens engagement setup in Agentix.
	const agentixSetup = page.getByRole("heading", { name: "What should an agent take on?" })
	await expect(agentixSetup).toBeVisible()
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Discover" }).click()
	const header = page.locator(".workspace-header")
	await expect(header.getByRole("button", { name: "Continue to Agentix" })).toHaveCount(0)
	await expect(header.locator("button:disabled")).toHaveCount(0)
	await header.getByRole("button", { name: "Open in Agentix" }).click()
	await expect(agentixSetup).toBeVisible()
})

test("gives drawers initial focus, traps Tab, and restores focus on Escape", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "Resume Third-party onboarding control redesign, Needs your input" }).click()
	await expect(page.getByRole("heading", { name: "MAX is running the Discovery." })).toBeVisible()

	const peopleTrigger = page.getByRole("button", { name: "Open setup" })
	await peopleTrigger.click()
	await page.getByRole("button", { name: "Open stakeholder program" }).click()
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

test("keeps manifest edits on the record and clears the handoff blocker in place", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	// A finished run whose charter still waits for the owner.
	await page.evaluate(() => {
		const key = "maxion.prototype.discovery-records.v1"
		const records = JSON.parse(localStorage.getItem(key) ?? "[]")
		const done = records.find((record: { id: string }) => record.id === "seed-northbridge-diligence")
		localStorage.setItem(key, JSON.stringify([{ ...done, id: "gate-run", title: "Charter gate run", charterApproval: null, handoff: null }, ...records]))
	})
	await page.reload()
	await page.getByRole("button", { name: /Resume Charter gate run/ }).click()
	await page.getByRole("button", { name: "Package", exact: true }).click()
	const list = page.getByRole("navigation", { name: "Deliverable list" })
	await expect(list.getByRole("button")).toHaveCount(9)

	// Switching outputs off changes the record, and a required one says what it costs.
	await page.getByRole("button", { name: "Manage package" }).click()
	const sheet = page.getByRole("dialog", { name: "Deliverable manifest" })
	await sheet.getByRole("switch", { name: /Technical assessment/ }).click()
	await sheet.getByRole("switch", { name: /Executive decision brief/ }).click()
	await expect(sheet.getByText("Executive decision brief is a required output")).toBeVisible()
	await expect(sheet.getByText("Adjusted by you · 7 of 9 included")).toBeVisible()
	await sheet.getByRole("button", { name: "Done" }).click()
	await expect(sheet).toBeHidden()
	await expect(list.getByRole("button")).toHaveCount(7)
	await page.getByRole("button", { name: "Manage package" }).click()
	await expect(sheet.getByText("Adjusted by you · 7 of 9 included")).toBeVisible()
	await expect(sheet.getByRole("switch", { name: /Technical assessment/ })).not.toBeChecked()
	await page.keyboard.press("Escape")
	await expect(sheet).toBeHidden()

	// While the charter waits, the header's handoff is not the page's filled action.
	const headerContinue = page.locator(".workspace-header").getByRole("button", { name: "Continue to Agentix" })
	await expect(headerContinue).not.toHaveClass(/ds-button--primary/)
	await headerContinue.click()
	const handoff = page.getByRole("dialog", { name: "Continue to Agentix" })
	await expect(handoff.locator(".handoff-row.is-list li")).toHaveCount(7)
	await expect(handoff.getByText(/Executive decision brief removed by you/)).toBeVisible()
	await expect(handoff.getByRole("button", { name: "Continue to Agentix" })).toBeDisabled()

	// The blocker carries its own fix, and approving returns to the handoff.
	await handoff.getByRole("button", { name: "Approve charter" }).click()
	const charter = page.getByRole("dialog", { name: "Approve the project charter" })
	await charter.getByRole("textbox", { name: "Approval reason" }).fill("Scope and owners match the committee decision.")
	await charter.getByRole("button", { name: "Approve charter" }).click()
	await expect(charter).toBeHidden()
	await expect(handoff.getByRole("button", { name: "Continue to Agentix" })).toBeEnabled()
	await expect(page.getByRole("textbox", { name: "Handoff note (optional)" })).toBeFocused()
	await expect(headerContinue).toHaveClass(/ds-button--primary/)
})
