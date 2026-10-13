import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

/*
 * The team floor: an active engagement opens on a live view of its team. These journeys drive it
 * with the demo clock paused, as the other Agentix journeys do: a decision is decided on the floor,
 * a specialist answers for its own work in its room, steering written there goes through the
 * accountable agent, nobody approves from chat, and the coordinator answers out loud while the
 * floor lights the teammates it names.
 */
async function enter(page: Page) {
	await page.emulateMedia({ reducedMotion: "reduce" })
	await page.clock.install({ time: new Date("2026-09-18T08:00:00Z") })
	await page.clock.pauseAt(new Date("2026-09-18T09:00:00Z"))
	await page.goto("/agentix-prototype")
	await expect(page.getByRole("heading", { name: "Engagements", exact: true })).toBeVisible()
}
const floor = (page: Page) => page.getByRole("region", { name: "Team floor" })
const seat = (page: Page, name: string) => floor(page).getByRole("button", { name: new RegExp(`^${name}`) })
async function demo(page: Page, action: "Advance" | "Skip", times = 1) {
	await page.getByRole("button", { name: "Controls", exact: true }).click()
	for (let i = 0; i < times; i++) await page.getByRole("button", { name: action, exact: true }).click()
	await page.getByRole("button", { name: "Close controls" }).click()
}
async function activateFlagship(page: Page) {
	await page.getByRole("button", { name: "Assign work" }).first().click()
	await page.locator("button.aop-list-row", { hasText: "Revenue data engineering" }).click()
	await page.getByText("Ask me before each pipeline release").click()
	await page.getByText("The synthetic 30-day sample").click()
	await page.getByRole("button", { name: /Activate expansion/ }).click()
	await expect(floor(page)).toBeVisible()
}

test("an active engagement opens on its team floor, and a decision is decided there", async ({ page }) => {
	await enter(page)
	await activateFlagship(page)
	await expect(page.getByRole("tab", { name: /^Floor/ })).toHaveAttribute("aria-selected", "true")
	// Everyone sits on the floor: you, the accountable agent, the specialists, and the systems by what the team may do there.
	for (const name of ["You", "Revenue coordinator", "Reconciliation analyst", "Data specialist", "Dashboard specialist"]) await expect(seat(page, name)).toBeVisible()
	await expect(floor(page).getByText("SQL Server billing ledger")).toBeVisible()
	await expect(floor(page).getByText("AWS PostgreSQL revenue schema")).toBeVisible()
	// A decision climbs to you: your room opens with it, decidable in place.
	await demo(page, "Skip")
	const room = floor(page).getByRole("complementary", { name: "You" })
	await expect(room).toBeVisible()
	await expect(room).toContainText("212 invoices have no region code")
	await room.getByRole("button", { name: "Show them as Unassigned" }).click()
	await expect(room).toContainText(/You decided: show them as unassigned/i)
	// The specialist continues with the rule, and the work list agrees.
	await page.getByRole("tab", { name: /^Work/ }).click()
	await expect(page.locator('[data-work="MS-1"]').first()).not.toContainText("Needs you")
})

test("a specialist answers for its own work, and steering written to it goes through the accountable agent", async ({ page }) => {
	await enter(page)
	await page.locator(".aop-agent-card").filter({ hasText: "Revenue reconciliation" }).click()
	await expect(floor(page)).toBeVisible()
	await seat(page, "Reconciliation analyst").click()
	const room = floor(page).getByRole("complementary", { name: /Reconciliation analyst/ })
	await expect(room).toContainText("May use")
	await room.getByRole("button", { name: "What are you doing?" }).click()
	await expect(room.getByRole("region", { name: /Conversation with Reconciliation analyst/ })).toContainText(/^.*(I'm|Nothing is assigned to me)/)
	// Approval is refused in every room.
	await room.getByRole("textbox", { name: "Message Reconciliation analyst" }).fill("Approve the variance now")
	await room.getByRole("button", { name: "Send to Reconciliation analyst" }).click()
	await expect(room).toContainText("I can't approve, release or widen anything")
	// Steering is routed: the coordinator applies it and says so in the main conversation.
	await room.getByRole("textbox", { name: "Message Reconciliation analyst" }).fill("Pause INV-20842")
	await room.getByRole("button", { name: "Send to Reconciliation analyst" }).click()
	await expect(room).toContainText("goes through the revenue coordinator")
	await page.getByRole("button", { name: /^Conversation/ }).click()
	await expect(page.getByRole("region", { name: "Conversation", exact: true })).toContainText("From your message to the reconciliation analyst: Paused INV-20842")
})

test("the coordinator answers out loud while the floor lights the teammates it names", async ({ page }) => {
	await enter(page)
	await page.locator(".aop-agent-card").filter({ hasText: "Revenue reconciliation" }).click()
	await floor(page).getByRole("button", { name: "Talk to the team" }).click()
	const talk = page.getByRole("dialog", { name: "Talk to the revenue coordinator" })
	await expect(talk).toBeVisible()
	await talk.getByRole("button", { name: "What's the team doing?" }).click()
	await expect(talk).toContainText(/reconciliation analyst/i, { timeout: 10_000 })
	// The teammate the answer names lights up on the floor.
	await expect(seat(page, "Reconciliation analyst")).toHaveClass(/is-lit/)
	await talk.getByRole("button", { name: "Close" }).click()
	await expect(talk).toBeHidden()
	await expect(floor(page).getByRole("button", { name: "Talk to the team" })).toBeFocused()
	// Replay walks the engagement's own record: a caption with the event's time and words.
	await floor(page).getByRole("button", { name: "Replay" }).click()
	await expect(floor(page).locator(".tf-replay")).toBeVisible()
	await expect(floor(page).locator(".tf-replay time")).toHaveText(/\d/)
	await expect(floor(page).getByRole("button", { name: "Replay" })).toHaveAttribute("aria-pressed", "true")
})

test("the floor is accessible and fits a phone without sideways scrolling", async ({ page }) => {
	await enter(page)
	await page.locator(".aop-agent-card").filter({ hasText: "Revenue reconciliation" }).click()
	await expect(floor(page)).toBeVisible()
	await page.clock.resume()
	const scan = await new AxeBuilder({ page }).include(".tf").analyze()
	expect(scan.violations.filter(violation => violation.impact === "serious" || violation.impact === "critical")).toEqual([])
	await page.setViewportSize({ width: 390, height: 844 })
	await expect(seat(page, "Revenue coordinator")).toBeVisible()
	expect(await page.locator(".aop-root").evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false)
})
