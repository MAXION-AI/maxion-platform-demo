import { expect, test, type Page } from "@playwright/test"

/*
 * What a stakeholder receives. MAX interviews the owner inside the Discovery; everyone else gets a
 * link of their own, and this is the page at the end of it. It is a window beside the demo, so the
 * rules that matter are: it shows the running demo's own scenario and people, it runs from the
 * invitation to a submission, and it never takes the demo's saved state.
 */
const DEMOS = [
	{ id: "revenue", title: "Revenue reconciliation: SQL Server to AWS", who: "grace", role: "Billing Systems Manager, Finance Systems", topic: "SQL Server billing ledger" },
	{ id: "servicenow", title: "AP invoice exceptions: ServiceNow triage and approval authority", who: undefined, role: undefined, topic: undefined },
	{ id: "salesforce-sap", title: "Salesforce–SAP order sync: customer master and posting integrity", who: undefined, role: undefined, topic: undefined },
]

const consent = (page: Page) => page.getByRole("checkbox")

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
})

for (const demo of DEMOS) {
	test(`the stakeholder interview carries the ${demo.id} demo's own Discovery`, async ({ page }) => {
		test.setTimeout(90_000)
		await page.goto(`/stakeholder-interview?demo=${demo.id}${demo.who ? `&who=${demo.who}` : ""}`)
		await expect(page.getByRole("heading", { name: demo.title })).toBeVisible()
		await expect(page.getByRole("img", { name: "MAXION" })).toBeVisible()
		if (demo.role) await expect(page.getByText(demo.role)).toBeVisible()
		if (demo.topic) await expect(page.getByRole("list").getByText(demo.topic)).toBeVisible()
		// No other demo's Discovery leaks into this one.
		for (const other of DEMOS.filter(entry => entry.id !== demo.id)) {
			await expect(page.getByRole("heading", { name: other.title })).toHaveCount(0)
		}
	})
}

test("the interview runs from the invitation to a submission", async ({ page }) => {
	test.setTimeout(120_000)
	await page.goto("/stakeholder-interview?demo=revenue&who=grace")

	// Consent gates the start, as it does in the platform.
	const start = page.getByRole("button", { name: "Start the interview" })
	await expect(start).toBeDisabled()
	await consent(page).check()
	await start.click()

	// MAX introduces itself once, then asks one question per topic.
	await expect(page.getByText(/I am MAX, running the Discovery on Revenue reconciliation/)).toBeVisible()
	await expect(page.getByText(/Start with SQL Server billing ledger/)).toBeVisible()
	await expect(page.getByText("0 of 3 topics", { exact: false })).toBeVisible()

	for (let i = 0; i < 3; i++) {
		await page.getByRole("button", { name: "Suggest an answer" }).click()
		await page.getByRole("button", { name: "Send" }).click()
		await expect(page.getByText(`${i + 1} of 3 topics`, { exact: false })).toBeVisible({ timeout: 10_000 })
	}
	await expect(page.getByText(/That covers everything MAX needed from you/)).toBeVisible()
	await expect(page.getByRole("button", { name: "Suggest an answer" })).toHaveCount(0)

	await page.getByRole("button", { name: "Finish and submit" }).click()
	await expect(page.getByRole("heading", { name: "Submitted" })).toBeVisible()
	await expect(page.getByText(/anonymised/)).toBeVisible()
})

test("a stakeholder who is the wrong person, or wants to come back, leaves cleanly", async ({ page }) => {
	test.setTimeout(90_000)
	await page.goto("/stakeholder-interview?demo=servicenow")
	await page.getByRole("button", { name: "I am not the right person" }).click()
	await expect(page.getByRole("heading", { name: "Thank you for saying so" })).toBeVisible()
	await page.getByRole("button", { name: /Show it again from the invitation/ }).click()

	await consent(page).check()
	await page.getByRole("button", { name: "Start the interview" }).click()
	await page.getByRole("button", { name: "Continue later" }).click()
	await expect(page.getByRole("heading", { name: "Progress saved" })).toBeVisible()
})

test("opening the interview never takes the demo's saved state", async ({ page, context }) => {
	test.setTimeout(90_000)
	await page.goto("/maxion-prototype?demo=revenue&fresh=1")
	await expect(page.locator(".mxd-dock-row")).toContainText("1/12")

	const interview = await context.newPage()
	await interview.goto("/stakeholder-interview?demo=revenue")
	await expect(interview.getByRole("heading", { name: "Revenue reconciliation: SQL Server to AWS" })).toBeVisible()
	// The demo tab still owns the demo: no "Continues in another tab", no lost place.
	await page.bringToFront()
	await expect(page.locator(".mxd-dock-row")).toContainText("1/12")
	await expect(page.getByText("Continues in another tab")).toHaveCount(0)
	await interview.close()
})

test("the presenter row opens the stakeholder interview for the running demo", async ({ page, context }) => {
	test.setTimeout(90_000)
	await page.goto("/maxion-prototype?demo=servicenow&fresh=1")
	await page.locator(".mxd-dock-row").click()
	const opened = context.waitForEvent("page")
	await page.locator(".mxd-panel").getByRole("button", { name: /Stakeholder interview/ }).click()
	const interview = await opened
	await expect(interview.getByRole("heading", { name: "AP invoice exceptions: ServiceNow triage and approval authority" })).toBeVisible()
	await interview.close()
})
