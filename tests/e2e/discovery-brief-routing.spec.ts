import { expect, test } from "@playwright/test"

const SERVICENOW_BRIEF =
	"Define how ServiceNow should integrate with our internal financial controls platform for change approvals, evidence capture, and reconciliation."

async function startServiceNowDiscovery(page: import("@playwright/test").Page) {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	await expect(page.getByRole("heading", { name: "What should MAX accomplish?" })).toBeVisible()
	await page.getByRole("textbox", { name: "Discovery brief" }).fill(SERVICENOW_BRIEF)
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	const composer = page.getByRole("textbox", { name: "Message MAX" })
	await expect(composer).toBeVisible({ timeout: 10_000 })
	return composer
}

test("a ServiceNow financial brief runs the enterprise scenario end to end", async ({ page }) => {
	test.setTimeout(120_000)
	const runtimeErrors: string[] = []
	page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()) })
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	const composer = await startServiceNowDiscovery(page)

	// The interview must be the enterprise one, not the vendor-onboarding default.
	await expect(page.getByText(/Which financial-change event should begin this workflow/i)).toBeVisible()
	await expect(page.getByText(/vendor-onboarding failure/i)).toHaveCount(0)
	await expect(page.getByRole("button", { name: /Connected sources 4 reading automatically/ })).toBeVisible()

	await composer.fill("A finance master-data change on a cost centre. Today ServiceNow marks it approved while the controls platform still has it pending.")
	await composer.press("Enter")
	await expect(page.getByText("System authority · 2 of 6")).toBeVisible()

	await composer.fill("ServiceNow owns the request and routing. The controls platform must stay authoritative for evidence and attestation.")
	await composer.press("Enter")
	await expect(page.getByText("Control boundary · 3 of 6")).toBeVisible()

	await composer.fill("End the owner interview")
	await composer.press("Enter")
	await expect(page.getByText(/enough owner context for this pass/i)).toBeVisible()

	// The exception must be the segregation-of-duties one.
	await expect(page.getByRole("heading", { name: "Proposed ownership violates segregation of duties" })).toBeVisible({ timeout: 25_000 })
	await page.getByRole("button", { name: "Open design resolution" }).click()

	// And the package must be the enterprise package.
	await expect(page.getByRole("heading", { name: "Final plan and recommendations" })).toBeVisible({ timeout: 30_000 })
	await page.getByRole("button", { name: "Package", exact: true }).click()
	await expect(page.getByText(/Both platforms believe they own the approval record/)).toBeVisible()

	expect(runtimeErrors).toEqual([])
})

test("the enterprise interview refuses to invent an answer, verifies a source, and adds a stakeholder", async ({ page }) => {
	test.setTimeout(120_000)
	const composer = await startServiceNowDiscovery(page)

	// 1. An uncertain answer becomes an explicit gap rather than a guess.
	await composer.fill("not sure")
	await composer.press("Enter")
	await expect(page.getByText(/keep it as an explicit gap rather than inventing an answer/i)).toBeVisible()
	await expect(page.getByText(/who would know or make that call in practice/i)).toBeVisible()

	await composer.fill("The financial controls product owner would make that call.")
	await composer.press("Enter")
	await expect(page.getByText("System authority · 2 of 6")).toBeVisible()

	// 2. MAX can be told to verify against a connected source instead of guessing.
	await composer.fill("Check the ServiceNow change and incident history and verify the authority split there.")
	await composer.press("Enter")
	await expect(page.getByText(/verify system authority in Change and incident history/i)).toBeVisible()
	await expect(page.getByText("Control boundary · 3 of 6")).toBeVisible()

	// 3. A stakeholder can be added mid-interview and is verified after creation.
	await composer.fill("add a stakeholder")
	await composer.press("Enter")
	await expect(page.getByText(/I still need the name, role, email/)).toBeVisible()

	await composer.fill("Dana Whitfield, Internal Audit Lead, Audit, dana.whitfield@northstar.com, SOX evidence and attestation")
	await composer.press("Enter")
	await expect(page.getByText(/Dana Whitfield is now in the stakeholder roster/)).toBeVisible()
	await expect(page.getByRole("button", { name: /Stakeholders 5 mapped/ })).toBeVisible()
})

test("a vendor brief still runs the TPRM scenario", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	await page.getByRole("textbox", { name: "Discovery brief" }).fill("Redesign third-party vendor onboarding controls so MAX can return a defensible decision package.")
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await expect(page.getByRole("textbox", { name: "Message MAX" })).toBeVisible({ timeout: 10_000 })
	await expect(page.getByText(/what vendor-onboarding failure is most costly today/i)).toBeVisible()
})
