import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("runs an autonomous Discovery from brief to verified package", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/discovery-prototype")
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await expect(page.getByRole("button", { name: "Resume Third-party onboarding control redesign, Needs your input" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Resume ServiceNow financial-control integration, Working autonomously" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Resume NorthBridge acquisition diligence, Completed" })).toBeVisible()

	const indexAccessibility = await new AxeBuilder({ page }).analyze()
	expect(indexAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	await expect(page.getByRole("heading", { name: "What should MAX accomplish?" })).toBeVisible()
	await expect(page.getByText("Describe the decision and the outcome. MAX will work out the investigation.")).toBeVisible()

	const setupAccessibility = await new AxeBuilder({ page }).analyze()
	expect(setupAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	await page.getByRole("textbox", { name: "Discovery brief" }).fill("Redesign third-party onboarding controls so MAX can return a defensible decision package.")
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await expect(page.getByText("Establishing the mission")).toBeVisible()
	await expect(page.getByRole("textbox", { name: "Message MAX" })).toBeVisible({ timeout: 8_000 })
	await expect(page.getByRole("button", { name: "Thread" })).toHaveClass(/active/)
	await expect(page.getByRole("heading", { name: "Interview with MAX" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Package", exact: true })).toBeDisabled()
	await expect(page.getByText(/what vendor-onboarding failure is most costly today/i)).toBeVisible()

	const composer = page.getByRole("textbox", { name: "Message MAX" })
	await composer.fill("Delaying a critical vendor is the largest cost because business sponsors bypass the process when reviews take more than ten days.")
	await composer.press("Enter")
	await expect(page.getByText(/working position on decision pressure/i)).toBeVisible()
	await expect(page.getByText("Risk segmentation · 2 of 6")).toBeVisible()

	await composer.fill("not sure")
	await composer.press("Enter")
	await expect(page.getByText(/keep it as an explicit gap rather than inventing an answer/i)).toBeVisible()
	await expect(page.getByText(/who would know or make that call in practice/i)).toBeVisible()

	await composer.fill("Check OneDrive and verify the tiering rules there")
	await composer.press("Enter")
	await expect(page.getByText(/verify risk segmentation in TPRM policy library/i)).toBeVisible()
	await expect(page.getByText("Operating friction · 3 of 6")).toBeVisible()

	await page.getByRole("button", { name: /Connected sources 4 reading automatically/ }).click()
	await expect(page.getByRole("dialog", { name: "Connected sources" })).toBeVisible()
	await page.getByTitle("Close panel").click()

	await page.getByRole("button", { name: "“Add a stakeholder”" }).click()
	await expect(composer).toHaveValue("Add a stakeholder")
	await composer.fill("add a stakeholder")
	await composer.press("Enter")
	await expect(page.getByText(/I still need the name, role, email/)).toBeVisible()

	await composer.fill("Edward Pascal, Procurement Lead, Procurement, edward.pascal@northstar.com, contract intake and vendor governance")
	await composer.press("Enter")
	await expect(page.getByText(/Edward Pascal is now in the stakeholder roster/)).toBeVisible()
	await expect(page.getByRole("button", { name: /Stakeholders 5 mapped/ })).toBeVisible()
	await composer.fill("End the owner interview")
	await composer.press("Enter")
	await expect(page.getByText(/That gives me enough owner context for this pass/)).toBeVisible()
	await expect(page.getByText(/keep the work visible in Autonomy and won’t ask another interview question unless you reopen it/)).toBeVisible()
	await expect(page.getByRole("region", { name: "Autonomous work summary" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Open autonomy" })).toBeVisible()

	await expect(page.getByRole("heading", { name: SCENARIO_EXCEPTION_TITLE })).toBeVisible({ timeout: 15_000 })
	await expect(page.getByText("Discovery is internal by default")).toBeVisible()
	await expect(page.getByText(/Neither source contains the vendor’s retention commitment/)).toBeVisible()
	await expect(page.getByText(/No internal evidence or attachments leave the workspace/)).toBeVisible()
	await page.getByRole("button", { name: "Allow one external interview" }).click()
	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible({ timeout: 12_000 })
	await expect(page.getByRole("button", { name: "Thread" })).toHaveClass(/active/)
	await page.getByRole("button", { name: /Open package/ }).first().click()
	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible({ timeout: 12_000 })
	await expect(page.getByText("Generated automatically from readiness snapshot v7 and manifest v4.")).toBeVisible()
	await expect(page.getByRole("button", { name: /Executive decision brief Current/ })).toBeVisible()

	await page.getByRole("button", { name: "Autonomy" }).click()
	// The run is finished by this point, and the hero says so. The running
	// variant ("MAX is running the Discovery.") stays pinned by
	// discovery-command-layer.spec.ts against the in-flight seeded records.
	await expect(page.getByRole("heading", { name: "MAX ran the Discovery." })).toBeVisible()
	await expect(page.getByRole("region", { name: "Work handled by MAX" })).toBeVisible()
	await expect(page.getByRole("heading", { name: "What MAX is handling for you" })).toBeVisible()
	await expect(page.getByRole("heading", { name: "Conversations MAX is managing" })).toBeVisible()
	await expect(page.getByRole("heading", { name: "What MAX did and why" })).toBeVisible()
	await expect(page.getByText("Approvals and handoff routed")).toBeVisible()
	await page.getByRole("button", { name: "Package", exact: true }).click()

	await page.getByRole("button", { name: "Manage package" }).click()
	await expect(page.getByRole("dialog", { name: "Deliverable manifest" })).toBeVisible()
	await page.getByTitle("Close panel").click()
	await page.getByRole("button", { name: "All discoveries", exact: true }).click()
	await expect(page.getByRole("button", { name: /Resume Redesign third-party onboarding controls so MAX can return a defensible decision package\., Completed/ })).toBeVisible()
	await page.reload()
	await expect(page.getByRole("button", { name: /Resume Redesign third-party onboarding controls so MAX can return a defensible decision package\., Completed/ })).toBeVisible()

	const terminalAccessibility = await new AxeBuilder({ page }).analyze()
	expect(terminalAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	expect(runtimeErrors).toEqual([])
})

test("uses the written brief as the mission context without preset scenarios", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	const brief = "Decide whether the finance controls operating model can safely automate month-end reconciliation."
	const missionBrief = page.getByRole("textbox", { name: "Discovery brief" })
	await missionBrief.fill(brief)
	await expect(missionBrief).toHaveValue(brief)
	await expect(page.getByRole("tab", { name: "TPRM" })).toHaveCount(0)
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await expect(page.getByText(/I’ve captured your mission: “Decide whether the finance controls operating model can safely automate month-end reconciliation.”/i)).toBeVisible({ timeout: 8_000 })
	await expect(page.getByText(brief, { exact: true }).first()).toBeVisible()
})

test("continues the owner interview through the voice agent", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	await page.getByRole("textbox", { name: "Discovery brief" }).fill("Resolve the highest-risk vendor onboarding decision with evidence.")
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await expect(page.getByRole("button", { name: "Voice" })).toBeVisible({ timeout: 8_000 })

	await page.getByRole("button", { name: "Voice" }).click()
	const voiceDialog = page.getByRole("dialog", { name: "Owner interview" })
	await expect(voiceDialog).toBeVisible()
	await expect(voiceDialog.getByText("Continue this interview by voice")).toBeVisible()
	await expect(voiceDialog.getByText(/does not retain the original audio/i)).toBeVisible()

	await voiceDialog.getByRole("button", { name: "Continue with voice" }).click()
	await expect(voiceDialog.getByText("Ready when you are")).toBeVisible()
	const transcript = voiceDialog.getByRole("textbox", { name: "Your response" })
	await transcript.fill("Delaying strategic vendors is most costly because teams bypass controls after ten days and the audit trail breaks down.")
	await voiceDialog.getByRole("button", { name: "Send response" }).click()
	const ownerThread = page.getByLabel("Discovery owner chat messages")
	await expect(ownerThread.getByText(/working position on decision pressure/i)).toBeVisible({ timeout: 5_000 })
	await expect(ownerThread.getByText("Risk segmentation · 2 of 6")).toBeVisible()

	const accessibility = await new AxeBuilder({ page }).analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	await voiceDialog.getByRole("button", { name: "Close voice session" }).click()
	await expect(voiceDialog).toBeHidden()
	await expect(page.getByRole("button", { name: "Voice" })).toBeFocused()
})

test("keeps the launch experience usable at a mobile viewport", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto("/discovery-prototype")
	await expect(page.getByRole("tab", { name: "TPRM" })).toHaveCount(0)
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	await expect(page.getByRole("button", { name: "Start autonomous Discovery" })).toBeVisible()
	await page.getByRole("textbox", { name: "Discovery brief" }).fill("Investigate the operating decision and return the safest next action.")

	const dimensions = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}))
	expect(dimensions.scrollWidth).toBe(dimensions.clientWidth)

	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await expect(page.getByRole("button", { name: "Thread" })).toBeVisible({ timeout: 8_000 })
	await page.getByRole("button", { name: "Thread" }).click()
	await expect(page.getByRole("textbox", { name: "Message MAX" })).toBeVisible()

	const workspaceDimensions = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}))
	expect(workspaceDimensions.scrollWidth).toBe(workspaceDimensions.clientWidth)

	await page.getByRole("button", { name: "Voice" }).click()
	const voiceDialog = page.getByRole("dialog", { name: "Owner interview" })
	await expect(voiceDialog).toBeVisible()
	await voiceDialog.getByRole("button", { name: "Continue with voice" }).click()
	const voiceDimensions = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
		clientHeight: document.documentElement.clientHeight,
		scrollHeight: document.documentElement.scrollHeight,
	}))
	expect(voiceDimensions.scrollWidth).toBe(voiceDimensions.clientWidth)
	expect(voiceDimensions.scrollHeight).toBeLessThanOrEqual(voiceDimensions.clientHeight)
})

const SCENARIO_EXCEPTION_TITLE = "One external interview needs your approval"

test("preserves readable contrast in dark mode", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "Use dark theme" }).click()
	await expect(page.locator(".prototype.dark")).toBeVisible()

	const accessibility = await new AxeBuilder({ page }).analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
})
