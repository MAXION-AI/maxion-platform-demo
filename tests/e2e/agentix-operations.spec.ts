import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

/*
 * Agentix journeys, driven through the UI with the demo clock paused. The Demo
 * controls advance the simulation (Advance = one demo minute, Skip = five), so
 * every state below is reached the way a presenter would reach it.
 */
const KEY = "maxion-agentix-operations-v4"

async function enter(page: Page, path = "/agentix-prototype") {
	await page.emulateMedia({ reducedMotion: "reduce" })
	await page.clock.install({ time: new Date("2026-09-18T08:00:00Z") })
	await page.clock.pauseAt(new Date("2026-09-18T09:00:00Z"))
	await page.goto(path)
	if (path === "/agentix-prototype") await expect(page.getByRole("heading", { name: "Engagements", exact: true })).toBeVisible()
}
const tiles = (page: Page) => page.locator(".aop-agent-card")
const openEngagement = (page: Page, name: string) => tiles(page).filter({ hasText: name }).click()
const row = (page: Page, reference: string) => page.locator(`[data-work="${reference}"]`).first()
const tab = (page: Page, name: "Work" | "Results" | "Activity") => page.getByRole("tab", { name: new RegExp(`^${name}`) })
const composer = (page: Page) => page.locator("#aop-composer-input")

async function demo(page: Page, action: "Advance" | "Skip", times = 1) {
	await page.getByRole("button", { name: "Controls", exact: true }).click()
	for (let i = 0; i < times; i++) await page.getByRole("button", { name: action, exact: true }).click()
	await page.getByRole("button", { name: "Close controls" }).click()
}
async function demoAction(page: Page, button: string) {
	await page.getByRole("button", { name: "Controls", exact: true }).click()
	await page.getByRole("button", { name: button, exact: true }).click()
	await page.getByRole("button", { name: "Close controls" }).click()
}
async function send(page: Page, text: string) {
	await composer(page).fill(text)
	await page.getByRole("button", { name: "Send to the accountable agent" }).click()
}

/* From the landing: Discovery package → review → answers → activation on the deployed Revenue reconciliation team. */
async function activateFlagship(page: Page) {
	await page.getByRole("button", { name: "Assign work" }).first().click()
	await page.locator("button.aop-list-row", { hasText: "Revenue data engineering" }).click()
	await expect(page.getByRole("heading", { name: "Expand Revenue reconciliation" })).toBeVisible()
	await page.getByText("Ask me before each pipeline release").click()
	await page.getByText("The synthetic 30-day sample").click()
	await page.getByRole("button", { name: /Activate expansion/ }).click()
	await expect(row(page, "MS-1")).toBeVisible()
}
/* Answer the price variance and the region question, then run MS-2 to its release decision. */
async function toReleaseDecision(page: Page) {
	await demo(page, "Skip")
	await page.getByRole("button", { name: "Approve $240 variance" }).first().click()
	await page.getByRole("button", { name: "Show them as Unassigned" }).click()
	await demo(page, "Skip", 3)
	await expect(page.getByRole("heading", { name: /Release ingestion and transformation pipeline v2 to production\?/ })).toBeVisible()
}

test("both entry points reach the same review, and sending again never duplicates the engagement", async ({ page }) => {
	await enter(page, "/maxion-prototype")
	const nav = page.getByRole("navigation", { name: "Portal sections" })
	await nav.getByRole("button", { name: "Discover", exact: true }).click()
	const packages = page.getByRole("region", { name: "Operational redesign packages" })
	await packages.locator("summary").click()
	await packages.getByRole("button", { name: /Revenue data engineering/ }).click()
	await page.getByRole("button", { name: "Send to Agentix" }).click()
	await expect(page.getByRole("heading", { name: "Expand Revenue reconciliation" })).toBeVisible()
	await expect(page.getByText(/From Discovery · Revenue data engineering v2/)).toBeVisible()

	// Back to Discover (it stays mounted, so the disclosure is still open): the package continues its review instead of sending again.
	await nav.getByRole("button", { name: "Discover", exact: true }).click()
	await expect(packages.locator("summary")).toContainText("3 live · 1 in review")
	await packages.getByRole("button", { name: /Revenue data engineering/ }).click()
	await page.getByRole("button", { name: "Continue review in Agentix" }).click()
	await expect(page.getByRole("heading", { name: "Expand Revenue reconciliation" })).toBeVisible()

	// Direct entry: a brief about the same work routes to the same proposal.
	await page.getByRole("button", { name: "All engagements" }).click()
	await page.getByRole("button", { name: "Assign work" }).first().click()
	await page.locator("#aop-brief").fill("Reconcile revenue between the SQL Server ledger and AWS every morning, with a dashboard")
	await expect(page.locator("#aop-brief-route")).toContainText("Revenue reconciliation's team takes this on")
	await page.getByRole("button", { name: /Review the proposal/ }).click()
	await expect(page.getByRole("heading", { name: "Expand Revenue reconciliation" })).toBeVisible()
	await page.getByRole("button", { name: "All engagements" }).click()
	await expect(tiles(page)).toHaveCount(4)
	const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY)
	expect(Object.keys(saved.engagements)).toEqual(["invoice", "service", "onboarding", "inventory"])
	expect(saved.engagements.invoice.proposal.packageId).toBe("pkg_revenue_v2")

	// A prompt-origin brief never claims Discovery provenance.
	await page.getByRole("button", { name: "Assign work" }).first().click()
	await page.locator("#aop-brief").fill("Triage service desk incidents for the Leeds office")
	await page.getByRole("button", { name: "Create a separate engagement" }).click()
	await expect(page.getByText("From your brief").first()).toBeVisible()
	await expect(page.getByText(/From Discovery/)).toHaveCount(0)
})

test("activation reuses the team; parallel milestones wait on each other while other cases continue", async ({ page }) => {
	await enter(page)
	await activateFlagship(page)
	await expect(page.getByText("Team of 4").first()).toBeVisible()
	await expect(page.getByText("Deployment v2").first()).toBeVisible()
	await demo(page, "Skip")
	await expect(row(page, "MS-1")).toContainText("Needs you")
	await expect(row(page, "MS-2")).toContainText("Waiting for MS-1")
	await expect(row(page, "MS-3")).toContainText("Waiting for MS-2")
	// One blocked milestone doesn't stop the engagement or the other specialists.
	await expect(page.locator(".aop-now")).toContainText("in progress")
	await expect(page.getByRole("region", { name: "Team" })).toContainText("Reconciliation analyst")
	await expect(page.getByRole("region", { name: "Team" })).toContainText(/Waiting on your decision · MS-1/)
	await expect(page.getByRole("region", { name: "Team" })).toContainText(/Waiting for MS-2's validated schema/)
})

test("an existing specialist takes new work without rebuilding anything", async ({ page }) => {
	await enter(page)
	await openEngagement(page, "Revenue reconciliation")
	await page.getByRole("button", { name: "Assign work" }).click()
	const dialog = page.getByRole("dialog", { name: "Assign work to Revenue reconciliation" })
	await dialog.locator("#aop-assign-text").fill("Reconcile the August credit notes")
	await expect(dialog).toContainText("for the reconciliation analyst")
	await dialog.getByRole("button", { name: "Assign", exact: true }).click()
	// The new item opens for the deployed specialist; the deployment itself is unchanged.
	await expect(page.locator(".aop-case-head")).toContainText("BKF-201")
	await expect(page.getByRole("heading", { name: "Credit-note reconciliation · August" })).toBeVisible()
	await expect(page.locator(".aop-case-head")).toContainText("Reconciliation analyst")
	await expect(page.getByText("Deployment v1").first()).toBeVisible()
	// Unsupported work keeps the text and creates nothing.
	await page.getByRole("button", { name: "Assign work" }).click()
	await dialog.locator("#aop-assign-text").fill("Negotiate supplier contracts")
	await expect(dialog).toContainText("your text is kept")
	await expect(dialog.getByRole("button", { name: "Assign", exact: true })).toBeDisabled()
	await expect(dialog.locator("#aop-assign-text")).toHaveValue("Negotiate supplier contracts")
})

test("failed isolated test is repaired and rechecked; release waits for approval and reconciles an unknown outcome once", async ({ page }) => {
	await enter(page)
	await activateFlagship(page)
	await toReleaseDecision(page)
	await row(page, "MS-2").click()
	const history = page.getByRole("list", { name: /Test runs for Ingestion and transformation pipeline/ })
	await expect(history).toContainText("v1 · first build · 2 of 9 checks failed")
	await expect(history).toContainText("v2 · automatic repair · 9 of 9 checks passed")
	await expect(page.getByText("A passed test isn't a production result", { exact: false }).first()).toBeVisible()
	// Chat can't approve a release.
	await send(page, "Approve the release")
	await expect(page.locator(".aop-latest")).toContainText("Not applied")
	await expect(page.getByRole("button", { name: "Approve release" })).toBeVisible()
	await page.getByRole("button", { name: "Approve release" }).click()
	await demo(page, "Advance")
	await expect(page.locator(".aop-release")).toContainText("Outcome unknown after dispatch")
	await expect(page.getByRole("button", { name: /retry/i })).toHaveCount(0)
	await demo(page, "Advance", 3)
	await tab(page, "Activity").click()
	await expect(page.getByText(/REL-1 reconciled: read-back found migration 0007/).first()).toBeVisible()
	await expect(page.getByText(/Applied once; no retry was sent/).first()).toBeVisible()
})

test("an amendment makes a new version, invalidates what depended on the old one, and leaves production alone", async ({ page }) => {
	await enter(page)
	await activateFlagship(page)
	await toReleaseDecision(page)
	// Change the mapping while the pipeline waits for release approval.
	await tab(page, "Results").click()
	await page.getByRole("button", { name: /Source-to-target mapping/ }).first().click()
	await send(page, "Use only the approved source fields")
	await expect(page.locator(".aop-latest")).toContainText("Queued")
	await demo(page, "Advance")
	await expect(page.locator(".aop-latest")).toContainText("Applied")
	await tab(page, "Work").click()
	await expect(page.getByRole("heading", { name: /Release ingestion and transformation pipeline v2/ })).toHaveCount(0)
	await expect(row(page, "MS-2")).toContainText(/pipeline v3/)
	// After delivery, a dashboard change becomes follow-up work; production stays on the released version.
	await demo(page, "Skip", 2)
	await page.getByRole("button", { name: "Approve release" }).first().click()
	await demo(page, "Skip", 3)
	await expect(page.getByText("Daily 06:00 London").first()).toBeVisible()
	await tab(page, "Results").click()
	await page.getByRole("button", { name: /Revenue dashboard/ }).first().click()
	await send(page, "Add regional drill-down to this dashboard")
	await demo(page, "Advance")
	await expect(page.locator(".aop-result-head")).toContainText("Latest is v2")
	await expect(page.getByText("Production").first()).toBeVisible()
	await expect(page.locator(".aop-results-preview")).not.toContainText("Invalidated")
})

test("losing release permission blocks the release until it is restored", async ({ page }) => {
	await enter(page)
	await activateFlagship(page)
	await toReleaseDecision(page)
	await page.getByRole("button", { name: "Controls", exact: true }).click()
	await page.getByRole("button", { name: "Remove", exact: true }).click()
	await page.getByRole("button", { name: "Close controls" }).click()
	await page.getByRole("button", { name: "Approve release" }).first().click()
	await demo(page, "Advance")
	await expect(page.getByRole("region", { name: "Release permission", exact: true })).toBeVisible()
	await expect(page.getByText(/REL-1 is blocked/).first()).toBeVisible()
	await page.getByRole("button", { name: "Restore release permission (demo)" }).first().click()
	await demo(page, "Advance", 2)
	await expect(page.getByText(/REL-1 is blocked/)).toHaveCount(0)
})

test("a failed notification keeps the completed record change and resumes only the send", async ({ page }) => {
	await enter(page)
	await openEngagement(page, "Revenue reconciliation")
	await demoAction(page, "Expire")
	await demo(page, "Skip")
	await row(page, "INV-20844").click()
	await expect(page.getByRole("region", { name: "Partial outcome" })).toContainText("Record work is done and kept")
	await page.getByRole("region", { name: "Partial outcome" }).getByRole("button", { name: "Reconnect notification account (demo)" }).click()
	await demo(page, "Skip")
	await expect(page.locator(".aop-case-head")).toContainText("Verified")
	const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY)
	const item = saved.work.find((entry: { reference: string }) => entry.reference === "INV-20844")
	expect(item.effects.filter((effect: { operation: string }) => /record|ERP/i.test(effect.operation)).every((effect: { sends: number }) => effect.sends === 1)).toBe(true)
})

test("steering is scoped: a case instruction never touches another case, drafts stay with their scope", async ({ page }) => {
	await enter(page)
	await openEngagement(page, "Revenue reconciliation")
	await row(page, "INV-20842").click()
	await expect(page.locator(".ws-composer-context")).toContainText("INV-20842")
	await send(page, "Prioritize this case")
	await expect(page.locator(".aop-latest")).toContainText("Applied")
	await expect(page.locator(".aop-case-head")).toContainText("High priority")
	await send(page, "Pause INV-20843")
	await expect(page.locator(".aop-latest")).toContainText("Not applied")
	// The refused text is kept; clear it so the composer follows navigation again.
	await expect(composer(page)).toHaveValue("Pause INV-20843")
	await composer(page).fill("")
	await page.getByRole("button", { name: "Work", exact: true }).click()
	await expect(row(page, "INV-20843")).not.toContainText("Paused")
	await expect(row(page, "INV-20843")).not.toContainText("High priority")
	// A draft written about one case stays with it; navigation doesn't retarget it.
	await row(page, "INV-20843").click()
	await composer(page).fill("Hold the notification until Monday")
	await page.getByRole("button", { name: "Work", exact: true }).click()
	await expect(page.locator(".ws-composer-context")).toContainText("INV-20843")
	await expect(page.getByText(/Your unsent draft stays about INV-20843/)).toBeVisible()
	await page.reload()
	await row(page, "INV-20843").click()
	await expect(composer(page)).toHaveValue("Hold the notification until Monday")
	// An unsupported instruction keeps the text and says why.
	await composer(page).fill("Translate every invoice into French")
	await page.getByRole("button", { name: "Send to the accountable agent" }).click()
	await expect(page.locator(".aop-latest")).toContainText("Not applied")
	await expect(composer(page)).toHaveValue("Translate every invoice into French")
})

test("delivery becomes a daily operation with its own cycles and evidence", async ({ page }) => {
	await enter(page)
	await activateFlagship(page)
	await toReleaseDecision(page)
	await page.getByRole("button", { name: "Approve release" }).first().click()
	await demo(page, "Skip", 3)
	await expect(page.getByText("Daily 06:00 London").first()).toBeVisible()
	await expect(page.getByRole("region", { name: "Delivery" })).toContainText("3 of 3 milestones verified")
	await demoAction(page, "Run")
	await expect(row(page, "REC-1001")).toBeVisible()
	await demo(page, "Skip", 2)
	await tab(page, "Results").click()
	await page.getByRole("button", { name: /Reconciliation evidence/ }).first().click()
	await expect(page.locator(".aop-results-preview")).toContainText("REC-1001")
	await page.reload()
	await expect(tab(page, "Results")).toHaveAttribute("aria-selected", "true")
})

test("tabs, sheets and the conversation work from the keyboard; closing the conversation doesn't pause work", async ({ page }) => {
	await enter(page)
	await openEngagement(page, "Revenue reconciliation")
	await tab(page, "Work").focus()
	await page.keyboard.press("ArrowRight")
	await expect(tab(page, "Results")).toBeFocused()
	await expect(tab(page, "Results")).toHaveAttribute("aria-selected", "true")
	await page.keyboard.press("ArrowRight")
	await expect(tab(page, "Activity")).toHaveAttribute("aria-selected", "true")
	await page.getByRole("button", { name: "Details", exact: true }).click()
	await expect(page.getByRole("dialog", { name: "Revenue reconciliation details" })).toBeVisible()
	await page.keyboard.press("Escape")
	await expect(page.getByRole("button", { name: "Details", exact: true })).toBeFocused()
	await page.getByRole("button", { name: /^Conversation/ }).click()
	await expect(page.getByRole("region", { name: "Conversation" })).toBeVisible()
	await page.getByRole("button", { name: "Pin conversation open" }).click()
	await expect(page.locator(".aop-eng")).toHaveAttribute("data-panel", "pinned")
	await page.getByRole("button", { name: "Close conversation" }).click()
	await demo(page, "Skip", 2)
	await tab(page, "Work").click()
	await expect(row(page, "INV-20842")).toHaveCount(0)
	await page.getByRole("button", { name: /^History/ }).click()
	await expect(row(page, "INV-20842")).toContainText("Verified")
	await page.clock.resume()
	const scan = await new AxeBuilder({ page }).include(".aop-root").analyze()
	expect(scan.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
})

for (const width of [320, 390, 768, 1024, 1440]) {
	test(`the engagement stays usable without horizontal scroll at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 })
		await enter(page)
		expect(await page.locator(".aop-root").evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false)
		await openEngagement(page, "Revenue reconciliation")
		await expect(composer(page)).toBeInViewport()
		expect(await page.locator(".aop-root").evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false)
		await tab(page, "Results").click()
		await page.getByRole("button", { name: /Reconciliation evidence|INV-20838/ }).first().click()
		if (width < 1024) {
			await page.getByRole("button", { name: "All results" }).click()
			await expect(page.getByRole("button", { name: /INV-20838/ }).first()).toBeVisible()
		}
		expect(await page.locator(".aop-root").evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false)
		await page.clock.resume()
		const scan = await new AxeBuilder({ page }).include(".aop-root").analyze()
		expect(scan.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
	})
}

test("resetting the demo from inside a separate engagement returns to the seeded landing", async ({ page }) => {
	await enter(page)
	await page.getByRole("button", { name: "Assign work" }).first().click()
	await page.locator("#aop-brief").fill("Triage service desk incidents for the Leeds office")
	await page.getByRole("button", { name: /^Create a separate engagement/ }).first().click()
	await page.getByRole("button", { name: "Run the read-only check" }).click()
	await demo(page, "Advance")
	await page.getByRole("button", { name: "Activate engagement" }).click()
	await expect(page.getByRole("heading", { name: "Service desk 2", exact: true })).toBeVisible()
	await page.getByRole("button", { name: "Controls", exact: true }).click()
	await page.getByRole("button", { name: "Reset the Agentix demo…" }).click()
	await page.getByRole("button", { name: "Reset Agentix demo" }).click()
	await expect(page.getByRole("heading", { name: "Engagements", exact: true })).toBeVisible()
	await expect(tiles(page)).toHaveCount(4)
	await page.reload()
	await expect(tiles(page)).toHaveCount(4)
})

test("migrates a saved v3 demo without touching other storage", async ({ page }) => {
	await page.addInitScript(() => {
		if (sessionStorage.getItem("seeded")) return
		sessionStorage.setItem("seeded", "1")
		localStorage.setItem("maxion-discovery-keep", "unrelated")
		localStorage.setItem("maxion-agentix-operations-v3", JSON.stringify({ version: 3, clock: Date.parse("2026-09-11T09:00:00Z"), engagements: {}, runs: [], messages: [], drafts: {} }))
	})
	await enter(page)
	await expect(tiles(page)).toHaveCount(4)
	expect(await page.evaluate(() => localStorage.getItem("maxion-discovery-keep"))).toBe("unrelated")
	expect(await page.evaluate(() => localStorage.getItem("maxion-agentix-operations-v3"))).not.toBeNull()
})
