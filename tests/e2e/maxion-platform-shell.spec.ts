import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("preserves text contrast throughout dashboard and sidebar entrance frames", async ({ page }) => {
	await page.goto("/maxion-prototype", { waitUntil: "domcontentloaded" })
	await page.getByRole("heading", { name: "Work that moved. Decisions that wait." }).waitFor({ state: "attached" })

	for (let frame = 0; frame < 12; frame += 1) {
		const result = await new AxeBuilder({ page })
			.include(".mxp-root")
			.withRules(["color-contrast"])
			.analyze()
		expect(result.violations, `contrast at entrance sample ${frame}`).toEqual([])
		await page.waitForTimeout(20)
	}

	const inverseText = await page.locator(".mxp-account-divider span, .mxp-sidebar-user small").evaluateAll((elements) =>
		elements.map((element) => getComputedStyle(element).color),
	)
	expect(new Set(inverseText)).toEqual(new Set(["rgb(168, 179, 177)"]))
})

test("keeps product and administration geometry exact at every acceptance viewport", async ({ page }) => {
	for (const viewport of [
		{ width: 375, height: 812 },
		{ width: 768, height: 900 },
		{ width: 1280, height: 720 },
		{ width: 1280, height: 900 },
		{ width: 1536, height: 864 },
		{ width: 1536, height: 900 },
	]) {
		await page.setViewportSize(viewport)
		await page.goto("/maxion-prototype")
		const opener = page.getByRole("button", { name: "Open navigation" })
		if (await opener.isVisible()) await opener.click()
		const navigation = page.getByRole("navigation", { name: "Portal sections" })
		const geometry = await navigation.evaluate((element) => ({
			productRows: [...element.querySelectorAll<HTMLElement>('[data-navigation-tier="product"]')]
				.map((control) => control.getBoundingClientRect().height),
			adminRows: [...element.querySelectorAll<HTMLElement>('[data-navigation-tier="administration"]')]
				.map((control) => control.getBoundingClientRect().height),
			productIcons: [...element.querySelectorAll<HTMLElement>('[data-navigation-tier="product"] .mxp-portal-nav-icon')]
				.map((icon) => icon.getBoundingClientRect().width),
			adminIcons: [...element.querySelectorAll<HTMLElement>('[data-navigation-tier="administration"] .mxp-portal-nav-icon')]
				.map((icon) => icon.getBoundingClientRect().width),
			productGap: Number.parseFloat(getComputedStyle(element.querySelector(".mxp-product-nav ul")!).rowGap),
			adminGap: Number.parseFloat(getComputedStyle(element.querySelector(".mxp-administration-nav ul")!).rowGap),
			sidebarWidth: element.closest(".mxp-portal-sidebar")!.getBoundingClientRect().width,
			productBottom: element.querySelector<HTMLElement>(".mxp-product-nav")!.getBoundingClientRect().bottom,
			administrationTop: element.querySelector<HTMLElement>(".mxp-administration-nav")!.getBoundingClientRect().top,
			administrationBottom: element.querySelector<HTMLElement>(".mxp-administration-nav")!.getBoundingClientRect().bottom,
			scrollTop: element.getBoundingClientRect().top,
			scrollBottom: element.getBoundingClientRect().bottom,
			scrollOffset: element.scrollTop,
			unitBalanceDisplay: getComputedStyle(element.querySelector<HTMLElement>(".mxp-unit-balance")!).display,
			adminBounds: [...element.querySelectorAll<HTMLElement>('[data-navigation-tier="administration"]')]
				.map((control) => ({ top: control.getBoundingClientRect().top, bottom: control.getBoundingClientRect().bottom })),
		}))
		expect(geometry.productRows, `${viewport.width}px product rows`).toEqual(Array(7).fill(44))
		expect(geometry.adminRows, `${viewport.width}px administrative rows`).toEqual(Array(5).fill(viewport.width <= 860 ? 44 : 36))
		expect(geometry.productIcons, `${viewport.width}px product icons`).toEqual(Array(7).fill(24))
		expect(geometry.adminIcons, `${viewport.width}px administrative icons`).toEqual(Array(5).fill(16))
		expect(geometry.productGap).toBe(4)
		expect(geometry.adminGap).toBe(2)
		expect(geometry.sidebarWidth).toBe(viewport.width <= 860 ? Math.min(286, viewport.width * 0.88) : 232)
		expect(geometry.scrollBottom - geometry.administrationBottom, `${viewport.width}×${viewport.height} bottom gap`).toBeGreaterThanOrEqual(0)
		expect(geometry.scrollBottom - geometry.administrationBottom, `${viewport.width}×${viewport.height} bottom gap`).toBeLessThanOrEqual(16)
		for (const bounds of geometry.adminBounds) {
			expect(bounds.top, `${viewport.width}×${viewport.height} admin row top`).toBeGreaterThanOrEqual(geometry.scrollTop)
			expect(bounds.bottom, `${viewport.width}×${viewport.height} admin row bottom`).toBeLessThanOrEqual(geometry.scrollBottom)
		}
		if (viewport.width <= 860) {
			expect(geometry.scrollOffset, `${viewport.width}×${viewport.height} initial drawer scroll`).toBe(0)
			expect(geometry.unitBalanceDisplay, `${viewport.width}×${viewport.height} optional units card`).toBe("none")
		} else {
			expect(geometry.administrationTop - geometry.productBottom, `${viewport.width}×${viewport.height} tier gap`).toBeGreaterThanOrEqual(24)
		}

		const undersizedTargets = await page.locator(".mxp-root").evaluate((root, minimum) => {
			const selector = 'button, a[href], input, textarea, select, summary, [role="button"]'
			return [...root.querySelectorAll<HTMLElement>(selector)].flatMap((element) => {
				const style = getComputedStyle(element)
				const rect = element.getBoundingClientRect()
				if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) return []
				return rect.width + 0.01 < minimum || rect.height + 0.01 < minimum
					? [{ label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 50), width: rect.width, height: rect.height }]
					: []
			})
		}, viewport.width <= 860 ? 44 : 24)
		expect(undersizedTargets, `${viewport.width}px interactive target floor`).toEqual([])
	}
})

test("keeps the shell choice, target, response, and accessibility floor measurable", async ({ page }) => {
	await page.goto("/maxion-prototype")

	await expect(page.getByRole("button", { name: "Search or ask" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Open Agentix" })).toHaveClass(/mxp-primary/)
	await expect(page.getByRole("heading", { name: "Needs you" })).toBeVisible()
	await expect(page.getByRole("heading", { name: "Recent outcomes" })).toBeVisible()
	await expect(page.locator(".mxp-needs-you article")).toHaveCount(1)
	await expect(page.locator(".mxp-recent-outcomes button")).toHaveCount(1)

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	const targetHeights = await navigation.locator('[data-navigation-tier="product"]').evaluateAll((controls) =>
		controls.map((control) => control.getBoundingClientRect().height),
	)
	expect(Math.min(...targetHeights)).toBeGreaterThanOrEqual(44)
	const navigationGeometry = await navigation.evaluate((element) => {
		const product = element.querySelector<HTMLElement>(".mxp-product-nav")
		const administration = element.querySelector<HTMLElement>(".mxp-administration-nav")
		const productIcon = product?.querySelector<HTMLElement>(".mxp-portal-nav-icon")
		const administrationIcon = administration?.querySelector<HTMLElement>(".mxp-portal-nav-icon")
		if (!product || !administration || !productIcon || !administrationIcon) throw new Error("Navigation tiers are incomplete")
		const productRect = product.getBoundingClientRect()
		const administrationRect = administration.getBoundingClientRect()
		const shellRect = element.getBoundingClientRect()
		return {
			productBottom: productRect.bottom,
			administrationTop: administrationRect.top,
			administrationBottomGap: shellRect.bottom - administrationRect.bottom,
			administrationOffset: administrationRect.top - shellRect.top,
			shellHeight: shellRect.height,
			productIcon: productIcon.getBoundingClientRect().width,
			administrationIcon: administrationIcon.getBoundingClientRect().width,
			administrationTargets: [...administration.querySelectorAll<HTMLElement>('[data-navigation-tier="administration"]')].map((control) => control.getBoundingClientRect().height),
		}
	})
	// The flexible gap can collapse to zero on a short desktop viewport, but the
	// tiers must never overlap and the administrative group must stay bottom-anchored.
	expect(navigationGeometry.productBottom).toBeLessThanOrEqual(navigationGeometry.administrationTop)
	expect(navigationGeometry.administrationBottomGap).toBeLessThanOrEqual(16)
	expect(navigationGeometry.administrationOffset).toBeGreaterThan(navigationGeometry.shellHeight / 2)
	expect(navigationGeometry.productIcon).toBe(24)
	expect(navigationGeometry.administrationIcon).toBe(16)
	expect(Math.min(...navigationGeometry.administrationTargets)).toBeGreaterThanOrEqual(24)
	expect(Math.max(...navigationGeometry.administrationTargets)).toBeLessThan(44)

	const commandResponse = await page.evaluate(async () => {
		const startedAt = performance.now()
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
		return {
			elapsed: performance.now() - startedAt,
			visible: Boolean(document.querySelector('[role="dialog"][aria-label="MAXION command menu"]')),
		}
	})
	expect(commandResponse.visible).toBe(true)
	expect(commandResponse.elapsed).toBeLessThan(400)
	await page.keyboard.press("Escape")

	const accessibility = await new AxeBuilder({ page }).analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	await page.emulateMedia({ reducedMotion: "reduce" })
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Projects" }).click()
	const animationDuration = await page.locator(".mxp-stage-view.is-entering").evaluate((element) => getComputedStyle(element).animationDuration)
	expect(Number.parseFloat(animationDuration)).toBeLessThanOrEqual(0.001)
})

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

test("contains mobile navigation focus and restores it after Escape", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 })
	await page.goto("/maxion-prototype")

	const opener = page.getByRole("button", { name: "Open navigation" })
	await opener.click()
	const drawer = page.getByRole("dialog", { name: "Main navigation" })
	await expect(drawer).toBeVisible()
	await expect(drawer).toHaveAttribute("aria-modal", "true")
	await expect(drawer.getByRole("button", { name: "Close navigation" })).toBeFocused()
	expect(await page.locator(".mxp-stage").evaluate((stage) => ({ inert: stage.hasAttribute("inert"), hidden: stage.getAttribute("aria-hidden") }))).toEqual({ inert: true, hidden: "true" })

	const first = drawer.getByRole("button", { name: "Open MAXION dashboard" })
	const last = drawer.getByRole("button", { name: "Open command menu" })
	await last.focus()
	await page.keyboard.press("Tab")
	await expect(first).toBeFocused()
	await page.keyboard.press("Shift+Tab")
	await expect(last).toBeFocused()

	await page.keyboard.press("Escape")
	await expect(drawer).not.toBeVisible()
	await expect(opener).toBeFocused()
	expect(await page.locator(".mxp-stage").evaluate((stage) => ({ inert: stage.hasAttribute("inert"), hidden: stage.hasAttribute("aria-hidden") }))).toEqual({ inert: false, hidden: false })
})

test("keeps the canonical MAXION shell functional across core modules", async ({ page }) => {
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Work that moved. Decisions that wait." })).toBeVisible()
	await expect(page.getByRole("img", { name: "MAXION" })).toHaveAttribute("src", "/maxion-logo-lockup-white.svg")

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	for (const name of ["Dashboard", "Projects", "Discover", "Plan", "Consult Max", "Integrations"]) {
		await expect(navigation.getByRole("button", { name })).toBeVisible()
	}
	await expect(navigation.getByRole("button", { name: /^Execute/ })).toBeVisible()
	await expect(navigation.getByRole("button", { name: /^Agentix/ })).toBeVisible()
	await page.getByRole("button", { name: "Collapse navigation" }).click()
	await expect(page.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-pressed", "true")
	await expect(page.locator(".mxp-root")).toHaveClass(/mxp-root--sidebar-collapsed/)

	await navigation.getByRole("button", { name: "Projects" }).click()
	await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible()
	await expect(page.getByRole("region", { name: "Projects", exact: true })).toBeVisible()

	await navigation.getByRole("button", { name: "Discover" }).click()
	await expect(page.getByRole("region", { name: "Discover interview workspace" })).toBeVisible()
	await page.getByRole("button", { name: "New Discovery" }).click()
	const discoveryBrief = page.getByRole("textbox", { name: "Discovery brief" })
	await expect(discoveryBrief).toBeFocused()

	await navigation.getByRole("button", { name: "Plan" }).click()
	await expect(page.getByRole("heading", { name: "No evidence-backed plan yet" })).toBeVisible()
	await expect(page.getByText(/Complete a Discovery package first/)).toBeVisible()
	await navigation.getByRole("button", { name: /^Execute/ }).click()
	await expect(page.getByRole("heading", { name: "Approved Plan required" })).toBeVisible()
	await expect(page.getByText(/immutable Plan artifact/)).toBeVisible()
	await expect(page.getByRole("complementary", { name: "Main navigation" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-pressed", "true")
	await expect(page.getByRole("button", { name: "Operations" })).toHaveCount(0)
	const executeAccessibility = await new AxeBuilder({ page }).analyze()
	expect(executeAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	await navigation.getByRole("button", { name: "Integrations" }).click()
	await expect(page.getByRole("heading", { name: "Connected systems" })).toBeVisible()
	await page.getByPlaceholder("Search systems or principals").fill("Slack")
	await page.getByRole("button", { name: "Reconnect" }).click()
	await expect(page.getByText("Slack reconnected without widening its scope.")).toBeVisible()

	const accessibility = await new AxeBuilder({ page }).analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	expect(runtimeErrors).toEqual([])
})

test("keeps the full MAXION navigation usable on mobile", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Work that moved. Decisions that wait." })).toBeVisible()
	await page.getByRole("button", { name: "Open navigation" }).click()

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await expect(page.getByRole("img", { name: "MAXION" })).toBeVisible()
	await expect(navigation.getByRole("button", { name: /^Agentix/ })).toBeVisible()
	await navigation.getByRole("button", { name: "Projects" }).click()
	await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible()
	await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false")

	await page.getByRole("button", { name: "Open navigation" }).click()
	await navigation.getByRole("button", { name: "Plan" }).click()
	await expect(page.getByRole("heading", { name: "No evidence-backed plan yet" })).toBeVisible()
	const mobilePlanAccessibility = await new AxeBuilder({ page }).analyze()
	expect(mobilePlanAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	await page.getByRole("button", { name: "Open navigation" }).click()
	await navigation.getByRole("button", { name: /^Execute/ }).click()
	await expect(page.getByRole("heading", { name: "Approved Plan required" })).toBeVisible()
	const executeBoundary = page.getByRole("region", { name: "Execute requires an approved Plan" })
	await expect(executeBoundary).toBeVisible()
	const composerBox = await executeBoundary.boundingBox()
	expect(composerBox).not.toBeNull()
	expect(composerBox!.x).toBeGreaterThanOrEqual(0)
	expect(composerBox!.x + composerBox!.width).toBeLessThanOrEqual(390)
	const executeMobileAccessibility = await new AxeBuilder({ page }).analyze()
	expect(executeMobileAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])

	const dimensions = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}))
	expect(dimensions.scrollWidth).toBe(dimensions.clientWidth)
})
