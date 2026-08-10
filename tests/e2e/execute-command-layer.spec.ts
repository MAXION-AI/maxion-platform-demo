import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

async function openExecute(page: Page) {
	await page.goto("/maxion-prototype")
	if ((page.viewportSize()?.width ?? 1280) < 700) await page.getByRole("button", { name: "Open navigation" }).click()
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: /^Execute/ }).click()
	await expect(page.getByRole("heading", { name: "What do you want built?", exact: true })).toBeVisible()
}

async function openErpWorkspace(page: Page) {
	await openExecute(page)
	await page.getByRole("navigation", { name: "Recent Execute tasks" }).getByRole("button", { name: /ERP modernization delivery/ }).click()
	await expect(page.getByRole("heading", { name: "Delivery Orchestrator" })).toBeVisible()
}

async function promoteToStaging(page: Page, workspaceName: RegExp) {
	const rail = page.getByRole("navigation", { name: "Plan-compiled delivery workspaces" })
	await rail.getByRole("button", { name: workspaceName }).click()
	await page.getByRole("button", { name: "Environments", exact: true }).click()
	await page.getByRole("button", { name: "Propose staging" }).click()
	const impact = page.getByRole("dialog", { name: /Promote .* to staging/ })
	await expect(impact.getByText("No production effect")).toBeVisible()
	await expect(impact.getByText(/rollback/i)).toBeVisible()
	await impact.getByRole("button", { name: "Apply promotion" }).click()
	await expect(page.getByText("Staged", { exact: true }).last()).toBeVisible()
}

test("scopes the command layer to Execute and makes every workspace keyboard reachable", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()) })
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await page.keyboard.press("ControlOrMeta+k")
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toBeVisible()
	await expect(page.getByRole("dialog", { name: "Execute command menu" })).toHaveCount(0)
	await page.keyboard.press("Escape")

	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: /^Execute/ }).click()
	await page.keyboard.press("ControlOrMeta+k")
	const palette = page.getByRole("dialog", { name: "Execute command menu" })
	await expect(palette).toBeVisible()
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toHaveCount(0)
	const paletteAccessibility = await new AxeBuilder({ page }).include(".aex-palette-layer").analyze()
	expect(paletteAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	const search = palette.getByRole("textbox", { name: "Search Execute commands" })
	await search.fill("MuleSoft")
	await search.press("Enter")
	await expect(page.getByRole("heading", { name: "MuleSoft" })).toBeVisible()

	await page.keyboard.press("2")
	await expect(page.getByRole("heading", { name: "Changed artifacts" })).toBeVisible()
	await page.keyboard.press("6")
	await expect(page.getByRole("heading", { name: "Workspace history" })).toBeVisible()
	await page.keyboard.press("/")
	const composer = page.getByRole("textbox", { name: "Steer MuleSoft agent" })
	await expect(composer).toBeFocused()
	await page.keyboard.press("3")
	await expect(composer).toHaveValue("3")
	await expect(page.getByRole("heading", { name: "Workspace history" })).toBeVisible()

	await page.keyboard.press("ControlOrMeta+k")
	await search.fill("Dashboard")
	await search.press("Enter")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()
	expect(runtimeErrors).toEqual([])
})

test("keeps a second Plan-derived engagement independently runnable and steerable", async ({ page }) => {
	test.setTimeout(60_000)
	const runtimeErrors: string[] = []
	page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()) })
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await openExecute(page)
	await page.getByRole("button", { name: "Import from Plan" }).click()
	await page.getByRole("group", { name: "Choose an approved Plan" }).getByRole("button", { name: /Customer data foundation/ }).click()
	await page.getByRole("button", { name: "Start engagement" }).click()

	await expect(page.getByRole("heading", { name: "Resolve customer identity" })).toBeVisible()
	const rail = page.getByRole("navigation", { name: "Plan-compiled delivery workspaces" })
	await expect(rail.getByRole("button", { name: /Enforce the consent boundary/ })).toBeVisible()
	await expect(rail.getByRole("button", { name: /ServiceNow|MuleSoft|Workday/ })).toHaveCount(0)
	await page.getByRole("button", { name: "Repositories", exact: true }).click()
	await expect(page.getByText("execute/customer/identity")).toBeVisible()
	await expect(page.getByRole("button", { name: "Verified" })).toBeVisible({ timeout: 15_000 })

	const composer = page.getByRole("textbox", { name: "Steer Resolve customer identity agent" })
	await composer.fill("Keep the identity threshold deterministic and explain the evidence.")
	await composer.press("Enter")
	await expect(page.getByText(/applied that direction inside Resolve customer identity/)).toBeVisible()
	await page.getByRole("button", { name: "Tests", exact: true }).click()
	await expect(page.getByRole("heading", { name: "39 focused checks" })).toBeVisible()
	expect(runtimeErrors).toEqual([])
})

test("runs the complete collaborative implementation, failure repair, E2E, approval, and production lifecycle", async ({ page }) => {
	test.setTimeout(120_000)
	const runtimeErrors: string[] = []
	page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()) })
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await openErpWorkspace(page)
	await expect(page.getByRole("complementary", { name: "Execute workspaces" })).toBeVisible()
	await expect(page.getByRole("navigation", { name: "Plan-compiled delivery workspaces" }).getByRole("button")).toHaveCount(5)

	await page.getByRole("button", { name: "Share", exact: true }).last().click()
	const share = page.getByRole("dialog", { name: "Share Delivery Orchestrator" })
	await expect(share.getByRole("button", { name: /Delivery Orchestrator workspace/ })).toHaveAttribute("aria-pressed", "true")
	await expect(share.getByRole("radio", { name: /Delivery leadership/ })).toBeChecked()
	await expect(share.getByRole("button", { name: "Share Delivery Orchestrator with 3 people" })).toBeVisible()
	await share.getByRole("button", { name: /Manage access/ }).click()
	for (const person of ["Root Admin", "Andre Reyes", "Elena Ortiz"]) await expect(share.getByText(person, { exact: true })).toBeVisible()
	await expect(share.getByText("Provider credentials never transfer to collaborators")).toBeVisible()
	await share.getByRole("button", { name: "Close sharing" }).click()

	await page.getByRole("button", { name: "Coordinating" }).click()
	await expect(page.getByRole("button", { name: "Workspaces verified" })).toBeVisible({ timeout: 15_000 })
	await promoteToStaging(page, /ServiceNow/)
	await promoteToStaging(page, /MuleSoft/)
	await promoteToStaging(page, /Workday/)

	const rail = page.getByRole("navigation", { name: "Plan-compiled delivery workspaces" })
	await rail.getByRole("button", { name: /Delivery Orchestrator/ }).click()
	await page.getByRole("button", { name: "Environments", exact: true }).click()
	await page.getByRole("button", { name: "Assemble RC-07" }).click()
	await expect(page.getByRole("heading", { name: "Integration verification" })).toBeVisible()
	await page.getByRole("button", { name: "Run cross-platform E2E" }).click()
	await expect(page.getByText("40 passed · 1 classified failure")).toBeVisible({ timeout: 10_000 })
	await expect(page.getByText("Duplicate replay produced a second Workday call")).toBeVisible()

	await page.getByRole("button", { name: "Open MuleSoft workspace" }).click()
	await page.getByRole("button", { name: "Repair & verify" }).click()
	await expect(page.getByText(/52 tests passed · mule-journal-api:2.4.2/)).toBeVisible({ timeout: 10_000 })
	await rail.getByRole("button", { name: /Integration verification/ }).click()
	await expect(page.getByText("Repair verified · rerun ready")).toBeVisible()
	await page.getByRole("button", { name: "Rerun RC-07.1" }).click()
	await expect(page.getByLabel("Integration verification inspector").getByText("41 scenarios passed", { exact: true })).toBeVisible({ timeout: 10_000 })

	await rail.getByRole("button", { name: /Delivery Orchestrator/ }).click()
	await page.getByRole("button", { name: "Environments", exact: true }).click()
	await page.getByRole("button", { name: "Request production approvals" }).click()
	await expect(page.getByRole("heading", { name: "One decision needs you" })).toBeVisible()
	const approval = page.locator(".aex-release-approval")
	await expect(approval).toContainText("Elena Ortiz · Release approver")
	await expect(approval).toContainText("41 E2E scenarios passed")
	await approval.getByRole("button", { name: "Record Elena’s approval" }).click()
	await expect(approval).toContainText("production sequence unlocked")

	await page.getByRole("button", { name: "Back to Execute" }).click()
	await page.getByRole("navigation", { name: "Recent Execute tasks" }).getByRole("button", { name: /ERP modernization delivery/ }).click()
	await page.getByRole("button", { name: "Environments", exact: true }).click()
	await page.getByRole("button", { name: "Run governed release" }).click()
	await expect(page.getByRole("button", { name: "Release verified" })).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText("Cross-platform outcome verified")).toBeVisible()
	await expect(page.getByRole("region", { name: "Delivery environment progression" })).toContainText("ProductionVerified")

	await page.getByRole("button", { name: "Topology", exact: true }).click()
	const accessibility = await new AxeBuilder({ page }).analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	expect(runtimeErrors).toEqual([])
})

test("coordinates multiple repositories per workspace and shares a team in one decision", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()) })
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await openErpWorkspace(page)
	await page.getByRole("navigation", { name: "Plan-compiled delivery workspaces" }).getByRole("button", { name: /MuleSoft/ }).click()
	await page.getByRole("button", { name: "Repositories", exact: true }).click()
	await expect(page.getByRole("heading", { name: "2 connected repositories" })).toBeVisible()
	await expect(page.getByText("maxion/mule-journal-orchestration")).toBeVisible()
	await expect(page.getByText("maxion/mule-shared-policies")).toBeVisible()
	await expect(page.getByText("GitLab · New repository")).toBeVisible()
	await expect(page.getByText("GitLab · Existing repository")).toBeVisible()

	await page.getByRole("button", { name: "Attach repository", exact: true }).click()
	const repositoryDialog = page.getByRole("dialog", { name: "Attach repository" })
	await expect(repositoryDialog.getByRole("textbox", { name: "Organization / repository" })).toBeFocused()
	await repositoryDialog.getByRole("button", { name: /Create new repository/ }).click()
	await repositoryDialog.getByRole("button", { name: "Bitbucket" }).click()
	await repositoryDialog.getByRole("textbox", { name: "Repository name" }).fill("mule-observability")
	await repositoryDialog.getByRole("button", { name: "Create and attach" }).click()
	await expect(page.getByRole("heading", { name: "3 connected repositories" })).toBeVisible()
	await expect(page.getByText("maxion/mule-observability")).toBeVisible()
	await expect(page.getByText("GitLab · Bitbucket")).toBeVisible()

	await page.getByRole("button", { name: "Share", exact: true }).last().click()
	const share = page.getByRole("dialog", { name: "Share MuleSoft" })
	await expect(share.getByRole("button", { name: /MuleSoft workspace/ })).toHaveAttribute("aria-pressed", "true")
	await expect(share.getByRole("radio", { name: /Enterprise integration team/ })).toBeChecked()
	await expect(share.getByRole("radio", { name: /Developer/ })).toBeChecked()
	await share.getByRole("button", { name: "Share MuleSoft with 5 people" }).click()
	await expect(share.getByRole("status")).toContainText("5 people can open the workspace, converse with MAX, and steer within their authority")

	const controlSizes = await page.locator(".exd-app").evaluate(() => {
		const size = (selector: string) => getComputedStyle(document.querySelector(selector) as Element).fontSize
		return {
			run: size(".exd-workspace-actions .exd-primary"),
			share: size(".exd-header-actions .exd-share"),
			panelHeading: size(".exd-panel > header h2"),
			panelBody: size(".exd-panel > header p"),
		}
	})
	expect(controlSizes).toEqual({ run: "12px", share: "12px", panelHeading: "18px", panelBody: "13px" })
	expect(runtimeErrors).toEqual([])
})

test("answers status, contains material deviations, and exposes implementation-grade Plan context", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()) })
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await openErpWorkspace(page)
	await page.getByRole("button", { name: "Collapse" }).click()
	await expect(page.getByRole("button", { name: "Expand", exact: true })).toBeVisible()
	await page.getByRole("button", { name: "Expand", exact: true }).click()
	const composer = page.getByRole("textbox", { name: "Steer Delivery Orchestrator agent" })
	await composer.fill("Where are we and what is blocked?")
	await composer.press("Enter")
	await expect(page.getByText(/0 of 3 platform workspaces are verified/)).toBeVisible()

	await composer.fill("Extend the Workday schema and add a new integration endpoint.")
	await composer.press("Enter")
	await expect(page.getByText("MAX contained the impact before implementation diverged")).toBeVisible()
	await expect(page.getByText(/prepared Plan change proposal PLD-14/)).toBeVisible()
	await page.getByRole("button", { name: "Create Plan proposal" }).click()
	await expect(page.getByText("PLD-14 sent to Plan")).toBeVisible()

	await page.getByRole("button", { name: "Plan context", exact: true }).click()
	await expect(page.getByRole("heading", { name: "Plan context" })).toBeVisible()
	await expect(page.getByText("L2 SA-04 · governed journal delivery")).toBeVisible()
	await expect(page.getByText("L3 TC-17 · signed event and callback")).toBeVisible()
	await expect(page.getByText("L4 packages SNOW-101 through INT-401")).toBeVisible()
	await expect(page.getByText("Architecture decision ADR-118")).toBeVisible()
	await page.getByRole("button", { name: "Audit", exact: true }).click()
	await expect(page.getByRole("region", { name: "Artifact history comparison" })).toContainText("Current artifact versus approved baseline")
	await expect(page.getByRole("region", { name: "Artifact history comparison" })).toContainText("Plan PL-24.6 baseline")
	expect(runtimeErrors).toEqual([])
})

test("keeps the Execute hub and workspace usable on a narrow viewport", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await openExecute(page)
	await page.getByRole("button", { name: "Import from Plan" }).click()
	await page.getByRole("button", { name: "Start engagement" }).click()
	await expect(page.getByRole("heading", { name: "Delivery Orchestrator" })).toBeVisible()
	const rail = page.getByRole("navigation", { name: "Plan-compiled delivery workspaces" })
	await rail.getByRole("button", { name: /MuleSoft/ }).click()
	await expect(page.getByRole("textbox", { name: "Steer MuleSoft agent" })).toBeVisible()
	await page.getByRole("button", { name: "Repositories", exact: true }).click()
	await expect(page.getByRole("heading", { name: "2 connected repositories" })).toBeVisible()
	await page.getByRole("button", { name: "Share", exact: true }).last().click()
	await expect(page.getByRole("dialog", { name: "Share MuleSoft" })).toBeVisible()
	await page.getByRole("dialog", { name: "Share MuleSoft" }).getByRole("button", { name: "Close sharing" }).click()
	await expect(page.getByRole("dialog", { name: "Share MuleSoft" })).toHaveCount(0)
	const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }))
	expect(dimensions.scrollWidth).toBe(dimensions.clientWidth)
	const accessibility = await new AxeBuilder({ page }).analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
})
