import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("keeps the shell choice, target, response, and accessibility floor measurable", async ({ page }) => {
	await page.goto("/maxion-prototype")

	const primaryActions = page.getByRole("group", { name: "Primary workspace actions" })
	await expect(primaryActions.getByRole("button")).toHaveCount(3)
	await expect(primaryActions.getByRole("button", { name: /Review .* waiting items/ })).toHaveClass(/mxp-primary/)

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
	expect(navigationGeometry.productIcon).toBe(20)
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
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()
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
	await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible()
	await expect(page.getByRole("region", { name: "Projects", exact: true })).toBeVisible()

	await navigation.getByRole("button", { name: "Discover" }).click()
	await expect(page.getByRole("heading", { name: "Continue where MAX left off." })).toBeVisible()
	await page.getByRole("button", { name: "New Discovery" }).click()
	const discoveryBrief = page.getByRole("textbox", { name: "Discovery brief" })
	await discoveryBrief.click()
	expect(await discoveryBrief.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none")
	await expect(page.locator(".brief-editor")).toHaveClass(/is-pointer-focused/)

	await navigation.getByRole("button", { name: "Plan" }).click()
	await expect(page.getByRole("heading", { name: "From evidence to implementation-ready" })).toBeVisible()
	await page.getByRole("button", { name: "Resume plan" }).click()
	await expect(page.getByRole("heading", { name: "MAX built the implementation plan." })).toBeVisible()
	await expect(page.getByRole("region", { name: "Conversation with MAX" })).toBeVisible()
	await expect(page.getByText(/3 conflicts resolved · 2 owners interviewed/)).toBeVisible()
	const planComposer = page.getByRole("textbox", { name: "Steer the Plan agent" })
	await planComposer.fill("Keep the ServiceNow adapter behind the existing gateway.")
	await planComposer.press("Enter")
	const impactCard = page.getByRole("article", { name: "Steering impact preview" })
	await expect(impactCard).toBeVisible()
	await expect(impactCard).toContainText("Impact preview · 3 artifacts · nothing applied yet")
	await expect(impactCard).toContainText("Contained change")
	await impactCard.getByRole("button", { name: "Apply to plan" }).click()
	await expect(impactCard).toContainText("Applied · snapshot v13")
	await page.getByRole("navigation", { name: "Plan workspace" }).getByRole("button", { name: /Design/ }).click()
	await expect(page.getByRole("heading", { name: "See the flow. Understand the behavior. Know what to build." })).toBeVisible()
	await page.getByRole("navigation", { name: "Architecture flows" }).getByRole("button", { name: /ServiceNow to Workday financial integration/ }).click()
	const behaviorFlow = page.getByRole("region", { name: "Executable behavior flow for ServiceNow to Workday financial integration" })
	await expect(behaviorFlow).toBeVisible()
	await behaviorFlow.getByRole("button", { name: /MuleSoft Experience API.*Validate and durably accept ingress/ }).click()
	await expect(behaviorFlow.getByRole("region", { name: "Execute workspace context packet" })).toContainText("mulesoft-financial-change-api")
	await expect(behaviorFlow.getByRole("region", { name: "Execute workspace context packet" })).toContainText("INT-01 baselined")
	await expect(behaviorFlow.getByRole("region", { name: "Execute workspace context packet" })).toContainText("OAuth 2.0 client credentials + mTLS")
	await page.getByRole("button", { name: "L2 Solution" }).click()
	const l2Diagram = page.getByRole("group", { name: "L2 diagram for ServiceNow to Workday financial integration" })
	await expect(l2Diagram).toBeVisible()
	await l2Diagram.getByRole("button", { name: "Inspect MuleSoft" }).click()
	await expect(page.getByRole("region", { name: "Selected architecture node" })).toContainText("MuleSoft team")
	await page.getByRole("button", { name: "Steer MAX on this node" }).click()
	await expect(page.getByRole("region", { name: "Steer MAX" })).toContainText("CMP-INT-02 · L2 · MuleSoft")
	await expect(page.getByRole("textbox", { name: "Steer the Plan agent" })).toBeFocused()
	await expect(page.getByRole("region", { name: "L2 executable handoff" }).getByText("MuleSoft integration team")).toBeVisible()
	await page.getByRole("button", { name: "L3 Technical" }).click()
	await expect(page.getByRole("region", { name: "L3 executable handoff" }).getByText("INT-01")).toBeVisible()
	await expect(page.getByText("OAuth 2.0 client credentials + mTLS")).toBeVisible()
	await page.getByRole("button", { name: "L4 Build" }).click()
	await expect(page.getByRole("group", { name: "L4 diagram for ServiceNow to Workday financial integration" })).toBeVisible()
	await expect(page.getByRole("region", { name: "L4 executable handoff" }).getByText("INT-401").last()).toBeVisible()
	await page.getByRole("button", { name: "2 decisions need you" }).click()
	await expect(page.getByRole("heading", { name: "MAX asks only when the context cannot decide safely." })).toBeVisible()
	await expect(page.getByText("MAX recommends")).toBeVisible()
	await page.getByRole("button", { name: "Accept atomic posting" }).click()
	await expect(page.getByRole("button", { name: "1 decision needs you" })).toBeVisible()
	const planAccessibility = await new AxeBuilder({ page }).analyze()
	expect(planAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	await page.getByRole("button", { name: "1 decision needs you" }).click()
	await expect(page.getByRole("heading", { name: "MAX found the approvers and sent the work." })).toBeVisible()
	const approvalRequests = page.getByRole("region", { name: "Approval requests" })
	await expect(approvalRequests.getByText("Priya Shah")).toBeVisible()
	await expect(approvalRequests.getByText("Elena Ortiz")).toBeVisible()
	await expect(approvalRequests.getByText("Root Admin")).toBeVisible()
	await expect(page.getByText("3 messages delivered")).toBeVisible()
	const approvalAccessibility = await new AxeBuilder({ page }).analyze()
	expect(approvalAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	await page.getByRole("button", { name: "Approve implementation boundary" }).click()
	await expect(page.getByRole("button", { name: "Plan ready" })).toBeVisible()

	await page.keyboard.press("ControlOrMeta+k")
	const planPalette = page.getByRole("dialog", { name: "Plan command menu" })
	await expect(planPalette).toBeVisible()
	await planPalette.getByRole("textbox").fill("workday")
	await planPalette.getByRole("textbox").press("Enter")
	await expect(page.getByRole("heading", { name: "See the flow. Understand the behavior. Know what to build." })).toBeVisible()
	await page.keyboard.press("1")
	await expect(page.getByRole("heading", { name: "MAX built the implementation plan." })).toBeVisible()
	await page.getByRole("button", { name: "All plans" }).click()

	await page.getByRole("button", { name: "Create Plan" }).click()
	await page.getByRole("button", { name: "Start autonomous plan" }).click()
	await expect(page.getByLabel("MAX is assembling the plan")).toBeVisible()
	await expect(page.locator(".apn-assembly-flow")).toHaveCount(5, { timeout: 15000 })
	await page.getByRole("button", { name: "Skip to the finished plan" }).click()
	await expect(page.getByRole("heading", { name: "MAX built the implementation plan." })).toBeVisible()
	await page.getByRole("button", { name: "All plans" }).click()

	await navigation.getByRole("button", { name: /^Execute/ }).click()
	await expect(page.getByRole("heading", { name: "What do you want built?", exact: true })).toBeVisible()
	await expect(page.getByRole("complementary", { name: "Main navigation" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Expand navigation" })).toHaveAttribute("aria-pressed", "true")
	await expect(page.getByRole("button", { name: "Operations" })).toHaveCount(0)
	await expect(page.getByRole("textbox", { name: "What should Execute deliver?" })).toBeVisible()
	await page.getByRole("button", { name: "Import from Plan" }).click()
	await page.getByRole("button", { name: "Start engagement" }).click()
	await expect(page.getByRole("heading", { name: "Delivery Orchestrator" })).toBeVisible()
	await expect(page.getByRole("heading", { name: "Five boundaries. One outcome." })).toBeVisible()
	const workspaces = page.getByRole("navigation", { name: "Plan-compiled delivery workspaces" })
	await expect(workspaces.getByRole("button")).toHaveCount(5)
	await workspaces.getByRole("button", { name: /ServiceNow/ }).click()
	await expect(page.getByRole("heading", { name: "ServiceNow" })).toBeVisible()
	const workspaceComposer = page.getByRole("textbox", { name: "Steer ServiceNow agent" })
	await workspaceComposer.fill("Reuse the existing webhook signature verifier.")
	await workspaceComposer.press("Enter")
	await expect(page.getByText("Reuse the existing webhook signature verifier.")).toBeVisible()
	await workspaces.getByRole("button", { name: /MuleSoft/ }).click()
	await expect(page.getByRole("heading", { name: "MuleSoft" })).toBeVisible()
	await expect(page.getByText("Reuse the existing webhook signature verifier.")).toHaveCount(0)
	await workspaces.getByRole("button", { name: /ServiceNow/ }).click()
	await expect(page.getByText("Reuse the existing webhook signature verifier.")).toBeVisible()
	const executeAccessibility = await new AxeBuilder({ page }).analyze()
	expect(executeAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	await page.getByRole("button", { name: "Return to MAXION" }).click()

	await navigation.getByRole("button", { name: "Integrations" }).click()
	await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible()
	await page.getByRole("textbox", { name: "Search integrations" }).fill("Workday")
	await page.getByRole("button", { name: "Connect" }).click()
	await expect(page.getByText("Workday connected.")).toBeVisible()

	const accessibility = await new AxeBuilder({ page }).analyze()
	expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	expect(runtimeErrors).toEqual([])
})

test("keeps a running pass in command of its surface and shows what applied steering re-derived", async ({ page }) => {
	test.setTimeout(120_000)
	const runtimeErrors: string[] = []
	page.on("console", (message) => {
		if (message.type() === "error") runtimeErrors.push(message.text())
	})
	page.on("pageerror", (error) => runtimeErrors.push(error.message))

	await page.goto("/maxion-prototype")
	await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Plan" }).click()
	await page.getByRole("button", { name: "Create Plan" }).click()
	await page.getByRole("button", { name: "Start autonomous plan" }).click()
	await expect(page.getByRole("heading", { name: "MAX is building the implementation plan." })).toBeVisible()

	// A running pass owns ⌘K: the shell's menu must never open over a live run.
	await page.keyboard.press("ControlOrMeta+k")
	const runPalette = page.getByRole("dialog", { name: "Plan command menu" })
	await expect(runPalette).toBeVisible()
	await expect(page.getByRole("dialog", { name: "MAXION command menu" })).toHaveCount(0)
	await expect(runPalette.getByRole("button", { name: /Skip to the finished plan/ })).toBeVisible()
	await expect(runPalette.getByRole("button", { name: /Steer this pass/ })).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(runPalette).toHaveCount(0)

	// Design opens read-only as soon as the pass starts composing the system.
	const designTab = page.getByRole("navigation", { name: "Plan workspace" }).getByRole("button", { name: /Design/ })
	await expect(designTab).toBeDisabled()
	await expect(page.locator(".apn-assembly-flow")).toHaveCount(5, { timeout: 15_000 })
	await expect(designTab).toBeEnabled()
	await designTab.click()
	await expect(page.getByRole("heading", { name: "The delivery system is assembling." })).toBeVisible()
	await expect(page.locator(".apn-blueprint.is-assembling")).toHaveCount(1)
	await expect(page.getByRole("button", { name: /Mission authority and approval boundary · available when this pass lands/ })).toBeDisabled()
	await expect(page.getByRole("heading", { name: "See the flow. Understand the behavior. Know what to build." })).toBeVisible({ timeout: 20_000 })

	// The behavior flow executes itself on entry, and a click takes the walk over.
	await page.getByRole("navigation", { name: "Architecture flows" }).getByRole("button", { name: /ServiceNow to Workday financial integration/ }).click()
	const behaviorFlow = page.getByRole("region", { name: "Executable behavior flow for ServiceNow to Workday financial integration" })
	const lastStep = behaviorFlow.getByRole("button", { name: /Joint delivery flow.*Return status and prove the outcome/ })
	await expect(lastStep).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 })
	const secondStep = behaviorFlow.getByRole("button", { name: /MuleSoft Experience API.*Validate and durably accept ingress/ })
	await secondStep.click()
	await page.waitForTimeout(1_500)
	await expect(secondStep).toHaveAttribute("aria-pressed", "true")
	// One screen: the panel itself never scrolls, only the two detail panes do.
	expect(await page.locator(".apn-diagram-panel").evaluate((element) => element.scrollHeight - element.clientHeight)).toBe(0)

	// The schedule class is derived from the evidence graph, not the generic fallback.
	const composer = page.getByRole("textbox", { name: "Steer the Plan agent" })
	await composer.fill("Protect the October cutover window in the build order.")
	await composer.press("Enter")
	const impact = page.getByRole("article", { name: "Steering impact preview" })
	await expect(impact).toContainText("The build order absorbs the schedule constraint")
	await expect(impact.getByRole("button", { name: "CLM-021" })).toBeVisible()
	// The decision stays with its consequences: Apply is reachable without scrolling the card.
	const applyButton = impact.getByRole("button", { name: "Apply to plan" })
	const applyBox = await applyButton.boundingBox()
	expect(applyBox).not.toBeNull()
	expect(applyBox!.y + applyBox!.height).toBeLessThanOrEqual(720)

	// Applying re-derives real artifacts, and the surfaces they live on say so.
	await applyButton.click()
	const flowRail = page.getByRole("navigation", { name: "Architecture flows" })
	await expect(flowRail.getByText("re-checked · v13")).toHaveCount(2)
	await flowRail.getByRole("button", { name: /Tenant-safe retry and replay protection/ }).click()
	await expect(page.getByText("re-checked · v13")).toHaveCount(0)

	expect(runtimeErrors).toEqual([])
})

test("keeps the full MAXION navigation usable on mobile", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: "Good afternoon, Root Admin" })).toBeVisible()
	await page.getByRole("button", { name: "Open navigation" }).click()

	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await expect(page.getByRole("img", { name: "MAXION" })).toBeVisible()
	await expect(navigation.getByRole("button", { name: /^Agentix/ })).toBeVisible()
	await navigation.getByRole("button", { name: "Projects" }).click()
	await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible()
	await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false")

	await page.getByRole("button", { name: "Open navigation" }).click()
	await navigation.getByRole("button", { name: "Plan" }).click()
	await page.getByRole("button", { name: "Resume plan" }).click()
	await expect(page.getByRole("heading", { name: "MAX built the implementation plan." })).toBeVisible()
	await page.getByRole("navigation", { name: "Plan workspace" }).getByRole("button", { name: /Design/ }).click()
	await expect(page.getByRole("heading", { name: "See the flow. Understand the behavior. Know what to build." })).toBeVisible()
	await expect(page.getByRole("button", { name: "Plans", exact: true })).toBeVisible()
	const mobilePlanAccessibility = await new AxeBuilder({ page }).analyze()
	expect(mobilePlanAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([])
	await page.getByRole("button", { name: "Plans", exact: true }).click()

	await page.getByRole("button", { name: "Open navigation" }).click()
	await navigation.getByRole("button", { name: /^Execute/ }).click()
	await expect(page.getByRole("heading", { name: "What do you want built?", exact: true })).toBeVisible()
	const engagementComposer = page.getByRole("region", { name: "What should MAX deliver?" })
	await expect(engagementComposer).toBeVisible()
	const composerBox = await engagementComposer.boundingBox()
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
