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

test("gives every engagement its own repository story and keeps the agent alive around the run", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Execute 1 pending" }).click()
	await page.getByRole("button", { name: "Import from Plan" }).click()
	await page.getByRole("button", { name: /Customer data foundation Customer 360/ }).click()
	await page.getByRole("button", { name: "Start engagement" }).click()

	// The second approved Plan is decomposed into its own workspaces — not the ERP set.
	await expect(page.getByRole("heading", { name: "Resolve customer identity" })).toBeVisible()
	const railWorkspaces = page.getByRole("navigation", { name: "Engagement workspaces" })
	await expect(railWorkspaces.getByRole("button", { name: "Open Workspace 03: Enforce the consent boundary" })).toBeVisible()
	await expect(railWorkspaces.getByRole("button", { name: /Build mission authority API/ })).toHaveCount(0)
	await expect(page.locator(".aex-rail > footer small")).toHaveText("execute/customer/identity")

	// Each workspace runs at its own offset, so mid-run they are provably not one session:
	// once 01 has resolved its boundaries, 05 is still resolving its own.
	await expect(page.locator(".aex-live-run .aex-trace-row").first()).toContainText("Boundaries resolved")
	await railWorkspaces.getByRole("button", { name: /Open Workspace 05/ }).click()
	await expect(page.locator(".aex-live-run .aex-trace-row").first()).toContainText("Resolving boundaries")

	await railWorkspaces.getByRole("button", { name: /Open Workspace 01/ }).click()
	await expect(page.getByRole("button", { name: "Run verified" })).toBeVisible({ timeout: 15_000 })

	// The run reads at tool-call granularity: one row per edited file, one terminal line per suite.
	await expect(page.locator(".aex-tool-call.is-edit").first()).toContainText("Edit services/identity/identityResolver.ts")
	await expect(page.locator(".aex-tool-call.is-edit")).toHaveCount(4)
	await page.getByRole("button", { name: "Terminal" }).click()
	const terminal = page.getByLabel("Workspace 01 terminal")
	await expect(terminal).toContainText("identity-resolution")
	await expect(terminal).toContainText("PASS  deterministic-matching.spec.ts")
	await expect(terminal).toContainText("Test Files  4 passed (4)")
	await expect(terminal).toContainText("39 passed · 0 failed · 6.8s")

	// The marquee topology panel never flashes light under the cursor, and it keeps talking
	// after the run lands.
	await page.getByRole("button", { name: "Topology" }).click()
	const node = page.getByRole("button", { name: "Open Workspace 03: Enforce the consent boundary" }).last()
	await node.hover()
	const hovered = await node.evaluate((element) => getComputedStyle(element).backgroundColor)
	const channels = hovered.match(/\d+/g)?.slice(0, 3).map(Number) ?? [255, 255, 255]
	expect(channels.reduce((sum, channel) => sum + channel, 0)).toBeLessThan(240)
	await expect(page.locator(".aex-ambient")).toContainText("Watching main for drift")

	expect(runtimeErrors).toEqual([])
})

test("makes steering, interruption, and the release decision leave marks", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Execute 1 pending" }).click()
	await page.getByRole("button", { name: "Import from Plan" }).click()
	await page.getByRole("button", { name: "Start engagement" }).click()
	await expect(page.getByRole("heading", { name: "Workspace topology" })).toBeVisible()

	// Interrupting is an event: the thread says where the worktree is held, and the primary
	// action becomes the resume.
	await page.getByRole("button", { name: "Interrupt" }).click()
	await expect(page.getByText(/Paused at step \d of 4/)).toBeVisible()
	await page.getByRole("button", { name: "Resume run" }).click()
	await expect(page.getByRole("button", { name: "Run verified" })).toBeVisible({ timeout: 15_000 })

	// Two directions, two different answers, and a mark on the run and on the file they became.
	const composer = page.getByRole("textbox", { name: "Steer Workspace 01: Build mission authority API" })
	await composer.fill("Add a test for expired authority grants.")
	await composer.press("Enter")
	await expect(page.getByText(/turned that into an assertion on the authority contract/)).toBeVisible()
	await composer.fill("Leave the published API and its contract unchanged.")
	await composer.press("Enter")
	await expect(page.getByText(/held the published contract fixed/)).toBeVisible()
	await expect(page.getByText(/turned that into an assertion on the authority contract/)).toBeVisible()
	await expect(page.locator(".aex-direction-row")).toContainText("Direction folded into the authority contract")
	await page.getByRole("button", { name: /^Changes/ }).click()
	await expect(page.locator(".aex-file-direction")).toHaveText("+2 directions")

	// The release request is a real decision that closes on the approvals surface.
	await page.getByRole("button", { name: /^Deploys/ }).click()
	await page.getByRole("button", { name: "Request deployment approval" }).click()
	await expect(page.locator(".aex-deploy-receipt")).toContainText("artifact 8f37c2")
	await page.getByRole("button", { name: /View in approvals/ }).click()
	await expect(page.getByRole("heading", { name: "Two decisions need you" })).toBeVisible()
	const release = page.locator(".aex-release-approval")
	await expect(release).toContainText("Deployment approval · ERP modernization delivery")
	await release.getByRole("button", { name: "Approve release" }).click()
	await expect(release).toContainText("Approved · scheduled by the release owner")
	await expect(page.getByRole("heading", { name: "One decision needs you" })).toBeVisible()

	// And the decision is waiting inside the workspace it came from.
	await page.getByRole("navigation", { name: "Recent Execute tasks" }).getByRole("button", { name: /ERP modernization delivery/ }).click()
	await page.getByRole("button", { name: /^Deploys/ }).click()
	await expect(page.locator(".aex-deploy")).toContainText("Approved · scheduled by the release owner")
	await page.getByRole("button", { name: "Audit" }).click()
	await expect(page.locator(".aex-audit")).toContainText("Release approved by the release owner")

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
