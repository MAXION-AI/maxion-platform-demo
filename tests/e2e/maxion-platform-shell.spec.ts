import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("hides scrollbar chrome without disabling scrolling", async ({ page }) => {
	await page.goto("/maxion-prototype")

	const scrollbarBehavior = await page.evaluate(() => {
		const probe = document.createElement("div")
		const content = document.createElement("div")
		probe.style.cssText = "position:fixed;inset:0 auto auto 0;width:40px;height:40px;overflow:auto;"
		content.style.cssText = "width:120px;height:120px;"
		probe.append(content)
		document.body.append(probe)
		probe.scrollTo({ left: 24, top: 24 })

		const result = {
			scrollbarWidth: getComputedStyle(probe).scrollbarWidth,
			webkitScrollbarDisplay: getComputedStyle(probe, "::-webkit-scrollbar").display,
			scrolledHorizontally: probe.scrollLeft > 0,
			scrolledVertically: probe.scrollTop > 0,
		}
		probe.remove()
		return result
	})

	expect(scrollbarBehavior).toEqual({
		scrollbarWidth: "none",
		webkitScrollbarDisplay: "none",
		scrolledHorizontally: true,
		scrolledVertically: true,
	})
})

test("keeps the canonical MAXION shell functional across core modules", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()
	// The brand anchor carries the lockup artwork itself, the same one the platform's side panel uses.
	await expect(page.getByRole("button", { name: "Open MAXION dashboard", exact: true }).getByRole("img", { name: "MAXION" })).toBeVisible()

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	for (const name of ["Dashboard", "Projects", "Discover", "Consult Max", "Integrations"]) {
		await expect(navigation.getByRole("button", { name })).toBeVisible()
	}
	// Plan and Execute are disabled: a Discovery's package goes straight to Agentix.
	await expect(navigation.getByRole("button", { name: "Plan" })).toHaveCount(0)
	await expect(navigation.getByRole("button", { name: /^Execute/ })).toHaveCount(0)
	await expect(navigation.getByRole("button", { name: /^Agentix/ })).toBeVisible()
	await page.getByRole("button", { name: "Collapse navigation" }).click()
	await expect(page.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-pressed", "true")
	await expect(page.locator(".mxp-root")).toHaveClass(/mxp-root--sidebar-collapsed/)

	await navigation.getByRole("button", { name: "Projects" }).click()
	await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible()
	await expect(page.getByRole("region", { name: "Projects" })).toBeVisible()

	await navigation.getByRole("button", { name: "Discover" }).click()
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await page.getByRole("button", { name: "New Discovery" }).click()
	const discoveryBrief = page.getByRole("textbox", { name: "Discovery brief" })
	await discoveryBrief.click()
	expect(await discoveryBrief.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none")
	await expect(page.locator(".brief-editor")).toHaveClass(/is-pointer-focused/)

	await navigation.getByRole("button", { name: /^Agentix/ }).click()
	await expect(page.getByRole("main", { name: "Agentix workspace" })).toBeVisible()

	await navigation.getByRole("button", { name: "Integrations" }).click()
	await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible()
	await page.getByRole("textbox", { name: "Search integrations" }).fill("Workday")
	await page.getByRole("button", { name: "Connect" }).click()
	await expect(page.getByText("Workday connected.")).toBeVisible()

	const accessibility = await new AxeBuilder({ page }).analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	expect(runtimeErrors).toEqual([])
})

test("keeps the full MAXION navigation usable on mobile", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()
	await page.getByRole("button", { name: "Open navigation" }).click()

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await expect(page.getByRole("button", { name: "Open MAXION dashboard", exact: true })).toBeVisible()
	await expect(navigation.getByRole("button", { name: /^Agentix/ })).toBeVisible()
	await navigation.getByRole("button", { name: "Projects" }).click()
	await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false")

	await page.getByRole("button", { name: "Open navigation" }).click()
	await navigation.getByRole("button", { name: /^Agentix/ }).click()
	await expect(page.getByRole("main", { name: "Agentix workspace" })).toBeVisible()
	const mobileAgentixAccessibility = await new AxeBuilder({ page }).analyze()
	expect(mobileAgentixAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	const dimensions = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}))
	expect(dimensions.scrollWidth).toBe(dimensions.clientWidth)
})
