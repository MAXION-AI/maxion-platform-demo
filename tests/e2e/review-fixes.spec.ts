import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

/*
 * Regressions found by the 2026-10-19 visual and interaction review. Each test pins one defect:
 * phone layouts that clipped inside an overflow-hidden ancestor (the page never scrolled, so the
 * old checks passed), controls that lost their names, overlays that ignored Escape, a search with
 * no empty state, and sections without an address.
 */
const PHONE = { width: 390, height: 844 }

/* Every painted element sits inside the viewport, unless it lives in a sideways scroller. */
async function overflowingElements(page: Page, root: string) {
	return page.evaluate(selector => {
		const scope = document.querySelector(selector)
		if (!scope) return ["(missing root)"]
		const inScroller = (node: Element) => {
			for (let parent = node.parentElement; parent; parent = parent.parentElement) {
				const style = getComputedStyle(parent)
				if ((style.overflowX === "auto" || style.overflowX === "scroll") && parent.scrollWidth > parent.clientWidth) return true
			}
			return false
		}
		return [...scope.querySelectorAll("*")]
			.filter(node => {
				const box = node.getBoundingClientRect()
				return box.width > 0 && box.right > innerWidth + 1 && getComputedStyle(node).visibility === "visible" && !inScroller(node)
			})
			.map(node => `${node.tagName.toLowerCase()}.${String(node.className).split(" ")[0]} → ${Math.round(node.getBoundingClientRect().right)}`)
	}, root)
}

test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
})

test("the stakeholder interview fits a phone with all four of its actions", async ({ page }) => {
	await page.setViewportSize(PHONE)
	await page.goto("/stakeholder-interview?demo=revenue&who=grace")
	await expect(page.getByRole("button", { name: "Start by voice" })).toBeVisible()
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
	expect(await overflowingElements(page, "main")).toEqual([])
	for (const name of ["Start by voice", "Start the interview", "Save for later", "I am not the right person"]) {
		const box = await page.getByRole("button", { name }).boundingBox()
		expect(box && box.x + box.width).toBeLessThanOrEqual(PHONE.width)
	}
	// Topics read as a list of items, each starting with a capital.
	const topics = await page.getByRole("region", { name: "What MAX will ask about" }).getByRole("listitem").allTextContents()
	expect(topics.length).toBeGreaterThan(1)
	for (const topic of topics) expect(topic.charAt(0)).toBe(topic.charAt(0).toUpperCase())
})

test("the dashboard lays out inside a phone instead of clipping its right side", async ({ page }) => {
	await page.setViewportSize(PHONE)
	await page.goto("/maxion-prototype")
	await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening), Root Admin$/ })).toBeVisible()
	expect(await overflowingElements(page, ".wh-page")).toEqual([])
	expect(await page.locator(".wh-page").evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
})

test("the phone navigation sheet keeps focus, closes on Escape and returns focus", async ({ page }) => {
	await page.setViewportSize(PHONE)
	await page.goto("/maxion-prototype")
	const trigger = page.getByRole("button", { name: "Open navigation" })
	await trigger.click()
	await expect(trigger).toHaveAttribute("aria-expanded", "true")
	const sidebar = page.getByRole("complementary", { name: "Main navigation" })
	for (let index = 0; index < 30; index++) {
		await page.keyboard.press("Tab")
		expect(await sidebar.evaluate(node => node.contains(document.activeElement))).toBe(true)
	}
	await page.keyboard.press("Escape")
	await expect(trigger).toHaveAttribute("aria-expanded", "false")
	await expect(trigger).toBeFocused()
})

test("each section has an address that Back, Forward and reload honour", async ({ page }) => {
	await page.goto("/maxion-prototype")
	const navigation = page.getByRole("navigation", { name: "Portal sections" })
	await navigation.getByRole("button", { name: "Projects", exact: true }).click()
	await expect(page).toHaveURL(/\/maxion-prototype\?section=projects$/)
	await navigation.getByRole("button", { name: "Integrations" }).click()
	await expect(page).toHaveURL(/section=integrations$/)
	await page.goBack()
	await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible()
	await page.goBack()
	await expect(page).toHaveURL(/\/maxion-prototype$/)
	await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening), Root Admin$/ })).toBeVisible()
	await page.goForward()
	await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible()
	await page.goto("/maxion-prototype?section=integrations")
	await expect(page.getByRole("heading", { name: "Integrations", level: 1 })).toBeVisible()
})

test("an integrations search with no match says so and can be cleared", async ({ page }) => {
	await page.goto("/maxion-prototype?section=integrations")
	await page.getByRole("searchbox", { name: "Search integrations" }).fill("zzqx")
	await expect(page.getByText("No matching integrations")).toBeVisible()
	await page.getByRole("button", { name: "Show all integrations" }).click()
	await expect(page.getByText("Salesforce", { exact: true })).toBeVisible()
})

test("Consult and Help no longer route to the disabled Plan and Execute modules", async ({ page }) => {
	await page.goto("/maxion-prototype?section=consult")
	await expect(page.getByText(/I can answer across your authorized MAXION context/)).toBeVisible()
	await expect(page.getByText(/Plan decisions|Execute state/)).toHaveCount(0)
	await page.getByRole("textbox", { name: "Message Consult MAX" }).fill("What needs my attention?")
	await page.getByRole("button", { name: "Send to Consult MAX" }).click()
	await expect(page.getByRole("button", { name: /Open the ERP plan|Open the Execute engagement/ })).toHaveCount(0)
	await expect(page.getByText(/Execute has not been given the work/)).toHaveCount(0)
	await page.goto("/maxion-prototype?section=help")
	await expect(page.getByRole("button", { name: /Move a Plan into Execute/ })).toHaveCount(0)
})

test("the team floor closes its talk bar and rooms on Escape, and a phone brings a room into view", async ({ page }) => {
	await page.clock.install({ time: new Date("2026-09-18T08:00:00Z") })
	await page.clock.pauseAt(new Date("2026-09-18T09:00:00Z"))
	await page.goto("/agentix-prototype")
	await page.locator(".aop-agent-card").filter({ hasText: "Revenue reconciliation" }).click()
	const floor = page.getByRole("region", { name: "Team floor" })
	const analyst = floor.getByRole("button", { name: /^Reconciliation analyst/ })
	await analyst.click()
	await expect(analyst).toHaveAttribute("aria-expanded", "true")
	const room = floor.getByRole("complementary", { name: /Reconciliation analyst/ })
	await expect(room).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(room).toHaveCount(0)
	await expect(analyst).toBeFocused()

	await floor.getByRole("button", { name: "Talk to the team" }).click()
	const talk = page.getByRole("dialog", { name: "Talk to the revenue coordinator" })
	await expect(talk).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(talk).toHaveCount(0)
	await expect(floor.getByRole("button", { name: "Talk to the team" })).toBeFocused()

	await page.setViewportSize(PHONE)
	await analyst.click()
	await expect(room).toBeInViewport()
	// Scrolled, the floor never paints over the sticky tab strip.
	const tabs = page.getByRole("tab", { name: /^Floor/ })
	const covered = await tabs.evaluate(node => {
		const box = node.getBoundingClientRect()
		const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
		return hit ? !node.contains(hit) && !hit.contains(node) : true
	})
	expect(covered).toBe(false)
})

test("phone screens pass axe: call controls are named, exhibits scroll by keyboard, quiet systems stay legible", async ({ page }) => {
	await page.setViewportSize(PHONE)
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: "New Discovery", exact: true }).click()
	await page.getByRole("textbox", { name: "Discovery brief" }).fill("Resolve the highest-risk vendor onboarding decision with evidence.")
	await page.getByRole("button", { name: "Start autonomous Discovery" }).click()
	await page.getByRole("checkbox", { name: "Mission authority reviewed" }).check()
	await page.getByRole("button", { name: "Create Discovery" }).click()
	await page.getByRole("button", { name: "Start the call" }).click({ timeout: 15_000 })
	await page.getByRole("button", { name: /Continue (with voice|by typing)/ }).click()
	for (const name of ["Mute", "Captions", "Type instead", "End call"]) await expect(page.getByRole("button", { name, exact: true })).toBeVisible()
	await expect(page.getByRole("button", { name: "End call" })).toContainText("End call")
	const serious = async () => (await new AxeBuilder({ page }).analyze()).violations.filter(violation => violation.impact === "critical" || violation.impact === "serious").map(violation => violation.id)
	expect(await serious()).toEqual([])

	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: /Resume NorthBridge acquisition diligence/ }).click()
	await page.getByRole("button", { name: "Package", exact: true }).click()
	await expect(page.getByRole("heading", { name: "Executive decision brief" })).toBeVisible()
	expect(await serious()).toEqual([])
})

/* Second pass: defects the independent review of the first pass found. */
test("the engagement header's facts never run under its actions, at any width", async ({ page }) => {
	await page.goto("/agentix-prototype")
	for (const name of ["Revenue reconciliation", "Inventory operations"]) {
		// Agentix reopens the last engagement, so each one starts from the list.
		await page.setViewportSize({ width: 1440, height: 900 })
		await page.evaluate(() => localStorage.removeItem("maxion-agentix-operations-v4"))
		await page.reload()
		await page.locator(".aop-agent-card").filter({ hasText: name }).click()
		for (const width of [700, 820, 1040, 1440]) {
			await page.setViewportSize({ width, height: 900 })
			const clash = await page.evaluate(() => {
				const facts = document.querySelector(".aop-engagement-facts")!.getBoundingClientRect()
				const actions = document.querySelector(".aop-engagement-actions")!.getBoundingClientRect()
				const items = [...document.querySelectorAll(".aop-engagement-facts > li")].filter(item => item.getClientRects().length)
				const right = Math.max(...items.map(item => item.getBoundingClientRect().right))
				const sameRow = actions.top < facts.bottom && actions.bottom > facts.top
				return { overflow: Math.round(right - facts.right), underActions: sameRow && right > actions.left }
			})
			expect(clash, `${name} at ${width}px`).toEqual({ overflow: expect.any(Number), underActions: false })
			expect(clash.overflow, `${name} at ${width}px`).toBeLessThanOrEqual(0)
		}
	}
})

test("the floor toolbar keeps clear of your seat with the briefing button", async ({ page }) => {
	await page.goto("/agentix-prototype")
	await page.locator(".aop-agent-card").filter({ hasText: "Inventory operations" }).click()
	await expect(page.locator(".tf-tools")).toBeVisible()
	for (const width of [1010, 1040, 1080, 1360]) {
		await page.setViewportSize({ width, height: 900 })
		const gap = await page.evaluate(() => {
			const tools = document.querySelector(".tf-tools")!.getBoundingClientRect()
			const seat = document.querySelector(".tf-owner")!.getBoundingClientRect()
			return tools.top < seat.bottom && tools.bottom > seat.top ? tools.left - seat.right : Infinity
		})
		expect(gap, `at ${width}px`).toBeGreaterThanOrEqual(8)
	}
})

test("Discovery's Details toggle shows only where its panel can open", async ({ page }) => {
	await page.goto("/discovery-prototype")
	await page.getByRole("button", { name: /Resume ServiceNow financial-control integration/ }).click()
	await page.getByRole("button", { name: "Autonomy", exact: true }).click()
	const details = page.locator(".workspace-header").getByRole("button", { name: "Details" })
	await details.click()
	await expect(page.getByRole("complementary", { name: "Needs you" })).toBeVisible()
	await page.setViewportSize({ width: 1200, height: 900 })
	await expect(details).toBeHidden()
	await expect(page.getByText(/^Decision forum · /).first()).toBeVisible()
})

test("the phone sheet hands the keyboard to the command menu and never leaves the page inert", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto("/maxion-prototype")
	await page.getByRole("button", { name: "Open navigation" }).click()
	await page.getByRole("button", { name: "Search workspace" }).click()
	const menu = page.getByRole("dialog", { name: "MAXION command menu" })
	await expect(menu).toBeVisible()
	// The open menu hides the page from the accessibility tree, so the trigger is found by its class.
	await expect(page.locator(".mxp-mobile-nav-trigger")).toHaveAttribute("aria-expanded", "false")
	await page.keyboard.press("Tab")
	expect(await menu.evaluate(node => node.contains(document.activeElement))).toBe(true)
	await page.keyboard.press("Escape")

	await page.setViewportSize({ width: 800, height: 900 })
	await page.getByRole("button", { name: "Open navigation" }).click()
	await page.setViewportSize({ width: 1280, height: 900 })
	await expect(page.locator(".mxp-stage")).not.toHaveAttribute("inert", "")
})

test("Consult's history sheet takes focus, closes on Escape and returns focus", async ({ page }) => {
	await page.goto("/maxion-prototype?section=consult")
	const history = page.getByRole("button", { name: "History" })
	await history.click()
	const sheet = page.getByRole("complementary", { name: "Consult MAX history" })
	await expect(sheet).toBeVisible()
	expect(await sheet.evaluate(node => node.contains(document.activeElement))).toBe(true)
	await page.keyboard.press("Escape")
	await expect(sheet).toHaveCount(0)
	await expect(history).toBeFocused()
})
