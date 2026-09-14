import { expect, test } from "@playwright/test"

test("edits, enforces project authority, approves, and hands an immutable Plan reference to Execute", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()) })
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: "Discover" }).click()
	const composer = page.getByRole("textbox", { name: "Answer MAX" })
	await composer.fill("The project owner approves planning inputs; Execute authority remains separately bounded.")
	await composer.press("Enter")
	await page.getByRole("button", { name: /^Gaps 1$/ }).click()
	await page.getByRole("button", { name: "Resolve from policy source" }).click()
	await page.getByRole("button", { name: "Create package for Plan" }).click()

	await expect(page.getByRole("region", { name: "Plan artifact workspace" })).toBeVisible()
	await expect(page.getByRole("complementary", { name: "Plan outline" })).toBeVisible()
	await expect(page.getByRole("main")).toContainText("Sequence the control plane before automation")
	await page.getByRole("button", { name: "Edit section" }).click()
	const editor = page.getByRole("textbox", { name: "Edit Workstreams" })
	await editor.fill("Establish the shared exception ledger before any automated effect.")
	await page.getByRole("button", { name: "Save section" }).click()
	await expect(page.getByRole("main")).toContainText("Establish the shared exception ledger")
	await page.getByRole("button", { name: "Compare" }).click()
	await expect(page.getByText("Current v1")).toBeVisible()

	await page.evaluate(() => {
		const key = Object.keys(localStorage).find((item) => item.includes("platform-shell"))
		if (!key) throw new Error("platform state key missing")
		const envelope = JSON.parse(localStorage.getItem(key) ?? "null")
		const project = envelope.value.projects.find((item: { id: string }) => item.id === "erp-modernization")
		project.role = "Viewer"
		localStorage.setItem(key, JSON.stringify(envelope))
	})
	await page.reload()
	await navigation.getByRole("button", { name: "Plan" }).click()
	await expect(page.getByText("View-only access")).toBeVisible()
	await expect(page.getByRole("button", { name: "Approve plan" })).toBeDisabled()

	await page.evaluate(() => {
		const key = Object.keys(localStorage).find((item) => item.includes("platform-shell"))
		if (!key) throw new Error("platform state key missing")
		const envelope = JSON.parse(localStorage.getItem(key) ?? "null")
		const project = envelope.value.projects.find((item: { id: string }) => item.id === "erp-modernization")
		project.role = "Owner"
		localStorage.setItem(key, JSON.stringify(envelope))
	})
	await page.reload()
	await navigation.getByRole("button", { name: "Plan" }).click()
	await page.getByRole("button", { name: "Approve plan" }).click()
	await expect(page.getByText("Approved v1")).toBeVisible()
	await page.getByRole("button", { name: "Send to Execute" }).click()
	await expect(page.getByRole("button", { name: /Plan handoff attached/ })).toContainText(/v1 · fnv1a-/)
	await expect(page.getByRole("group", { name: "Choose an approved Plan" })).toBeVisible()
	await expect(page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Settings" })).toBeVisible()
	await expect(page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Integrations" })).toBeVisible()
	expect(runtimeErrors).toEqual([])
})
