import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

async function enter(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.clock.install({ time: new Date("2026-09-11T08:00:00Z") })
  await page.clock.pauseAt(new Date("2026-09-11T09:00:00Z"))
  await page.goto("/agentix-prototype")
  await expect(page.getByRole("heading", { name: /decisions\. Everything else is moving\./ })).toBeVisible()
}

const ticks = (page: Page, count: number) => page.clock.runFor(count * 4000)
const caseRow = (page: Page, id: string) => page.locator(".aop-run-row").filter({ hasText: id })

async function openAgent(page: Page, name: string) {
  if (name === "Employee onboarding agent") {
    await page.getByRole("button", { name: "New agent", exact: true }).click()
    await page.getByLabel("Describe the responsibility").fill("Coordinate employee onboarding")
    await page.getByRole("button", { name: "Prepare agent" }).click()
    return
  }
  await page.locator(".aop-agent-line").filter({ hasText: name }).click()
}

test("portfolio opens a complete run canvas with in-context steering, artifact editing and approval", async ({ page }) => {
  await enter(page)
  await expect(page.getByRole("navigation", { name: "Agentix views" }).getByRole("button")).toHaveCount(5)
  await page.getByRole("button", { name: "Review" }).first().click()

  await expect(page.getByRole("region", { name: "Agentix run canvas" })).toBeVisible()
  await expect(page.getByRole("main", { name: "Run timeline" })).toBeVisible()
  await expect(page.getByRole("complementary", { name: "Run evidence" })).toBeVisible()
  await expect(page.getByRole("complementary", { name: "Run details" })).toBeVisible()

  await page.getByRole("textbox", { name: "GUIDE AGENTIX WHILE IT WORKS" }).fill("Check the source owner before proposing any write")
  await page.getByRole("button", { name: "Send steer" }).click()
  await expect(page.getByRole("status")).toContainText("Direction received for this run")

  await page.getByRole("button", { name: "Edit" }).click()
  await page.getByRole("textbox", { name: "Object title" }).fill("Northwind variance review draft")
  await page.getByRole("button", { name: "Save draft" }).click()
  await expect(page.getByRole("heading", { name: "Northwind variance review draft" })).toBeVisible()
  await page.getByRole("button", { name: "Approve variance" }).click()
  await expect(page.getByRole("region", { name: "Current run status" })).toContainText(/waiting for an available execution slot|working/i)

  await page.getByRole("button", { name: "View initiative" }).click()
  await expect(page.getByRole("heading", { name: "Invoice operations agent" })).toBeVisible()
})

test("operator can stop and continue a run without losing its evidence", async ({ page }) => {
  await enter(page)
  await page.getByRole("button", { name: /Contoso · receiving reconciliation/ }).click()
  await page.getByRole("button", { name: "Stop" }).first().click()
  await expect(page.getByRole("region", { name: "Stopped run" })).toBeVisible()
  await expect(page.getByRole("complementary", { name: "Run evidence" })).toContainText("Contoso · receiving reconciliation")
  await page.getByRole("button", { name: "Continue run" }).click()
  await expect(page.getByRole("region", { name: "Current run status" })).toContainText("waiting for an available execution slot")
})

test("readiness repair precedes onboarding deployment and the human question stays in the run", async ({ page }) => {
  await enter(page)
  await openAgent(page, "Employee onboarding agent")
  const deploy = page.getByRole("button", { name: "Deploy agent in demo" })
  await expect(deploy).toBeDisabled()
  await page.getByRole("button", { name: "Confirm mapping" }).click()
  await page.getByLabel("London analyst → approved access package").selectOption("london-standard")
  await page.getByRole("button", { name: "Recheck readiness" }).click()
  await ticks(page, 1)
  await expect(deploy).toBeEnabled()
  await deploy.click()
  await ticks(page, 5)
  await caseRow(page, "JOIN-306").click()
  await expect(page.getByRole("region", { name: "Question for operator" })).toBeVisible()
  await page.getByRole("button", { name: "Answer this question" }).click()
  await expect(page.getByRole("region", { name: "Current run status" })).toContainText(/waiting for an available execution slot|working/i)
})

test("connection recovery retries only the incomplete verification step", async ({ page }) => {
  await enter(page)
  await openAgent(page, "Invoice operations agent")
  await page.getByText("About this demo", { exact: true }).click()
  await page.getByRole("button", { name: "Simulate connection expiry" }).click()
  await ticks(page, 1)
  await caseRow(page, "INV-20844").click()
  await expect(page.getByRole("region", { name: "Run recovery" })).toBeVisible()
  await page.getByRole("button", { name: "Reconnect" }).click()
  await page.getByRole("button", { name: "Retry step" }).click()
  await ticks(page, 5)
  await expect(page.getByRole("region", { name: "Current run status" })).toContainText("verified")
  await expect(page.getByRole("complementary", { name: "Run evidence" })).toContainText("writes 1 · duplicates 0")
})

test("Discovery hands off context without bypassing deployment readiness", async ({ page }) => {
  await page.goto("/maxion-prototype")
  await page.getByRole("button", { name: "Discover", exact: true }).click()
  const packages = page.getByRole("region", { name: "Operational redesign packages" })
  await packages.locator("summary").click()
  await packages.getByRole("button", { name: /Employee onboarding/ }).click()
  await page.getByRole("button", { name: "Send to Agentix" }).click()
  await expect(page.getByRole("region", { name: "Deployment readiness" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Deploy agent in demo" })).toBeDisabled()
})

for (const width of [320, 1440]) {
  test(`Agentix portfolio and run canvas remain accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await enter(page)
    expect(await page.locator(".aop-root").evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false)
    await page.getByRole("button", { name: "Review" }).first().click()
    await expect(page.getByRole("textbox", { name: "GUIDE AGENTIX WHILE IT WORKS" })).toBeInViewport()
    const scan = await new AxeBuilder({ page }).include(".aop-root").analyze()
    expect(scan.violations.filter(violation => violation.impact === "serious" || violation.impact === "critical")).toEqual([])
    expect(await page.locator(".aop-root").evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false)
  })
}

test("Agentix timers pause outside the module and resume on return", async ({ page }) => {
  await enter(page)
  await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Dashboard", exact: true }).click()
  await ticks(page, 10)
  await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: /^Agentix/ }).click()
  await openAgent(page, "Invoice operations agent")
  await expect(caseRow(page, "INV-20842")).toContainText("Working")
  await ticks(page, 10)
  await page.getByRole("button", { name: /^History/ }).click()
  await expect(caseRow(page, "INV-20842")).toContainText("Verified")
})
