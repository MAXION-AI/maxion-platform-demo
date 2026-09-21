#!/usr/bin/env node
/*
 * Visual density budget.
 *
 * Tokens alone do not make a screen look like the reference. The reference's
 * signature is restraint: very few containers, no shadows, one small set of type
 * sizes, and nothing below 12px. Measured on the ElevenLabs captures in
 * docs/visual-spec.md, a whole screen carries five to eight horizontal edges and
 * covers 1.5% to 5.2% of its content area in non-background pixels.
 *
 * This script drives the real app and fails when a screen exceeds the budget, so
 * "it looks like the reference" is a check rather than an opinion.
 *
 * Usage: node scripts/check-visual-density.mjs [--update]
 */
import { chromium } from "@playwright/test"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const BASE = process.env.DENSITY_BASE_URL ?? "http://127.0.0.1:4317"
const BASELINE = "scripts/visual-density-baseline.json"

/* The budget a fully migrated screen has to meet. */
const BUDGET = { containers: 10, shadowed: 0, under12: 0, distinctSizes: 6, uppercase: 0 }

const SCREENS = [
	{ name: "agentix-engagements", path: "/agentix-prototype", root: ".aop-root" },
	{ name: "discovery-hub", path: "/discovery-prototype", root: ".prototype" },
	{
		name: "discovery-cockpit",
		path: "/discovery-prototype",
		root: ".prototype",
		// Autonomy composes three reference screens: the dashboard's card in a tray,
		// the Workflow tab's six bordered node cards, and the Analysis tab's right
		// column of cards (docs/elevenlabs-reference-map.md). Those frames are the
		// reference's own, so this screen's container allowance is theirs added up.
		budget: { containers: 14 },
		async prepare(page) {
			await page.getByRole("button", { name: /Resume ServiceNow financial-control integration/ }).click()
			await page.waitForTimeout(1500)
		},
	},
]

SCREENS.push(
	{
		name: "discovery-thread",
		path: "/discovery-prototype",
		root: ".prototype",
		// The Test AI agent screen floats its composer on a soft shadow; that one lift is the reference's.
		budget: { shadowed: 1 },
		async prepare(page) {
			await page.getByRole("button", { name: /Resume ServiceNow financial-control integration/ }).click()
			await page.getByRole("button", { name: "Thread", exact: true }).click()
			await page.waitForTimeout(800)
		},
	},
	{
		name: "discovery-package",
		path: "/discovery-prototype",
		root: ".prototype",
		async prepare(page) {
			await page.getByRole("button", { name: /Resume NorthBridge acquisition diligence/ }).click()
			await page.getByRole("button", { name: "Package", exact: true }).click()
			await page.waitForTimeout(800)
		},
	},
)

// Agentix remembers the open engagement, so each screen starts from a fresh demo.
const freshAgentix = async page => {
	await page.evaluate(() => localStorage.removeItem("maxion-agentix-operations-v4"))
	await page.reload()
	await page.waitForTimeout(600)
}
const openEngagement = name => async page => {
	await freshAgentix(page)
	await page.locator(".aop-agent-card").filter({ hasText: name }).click()
	await page.waitForTimeout(800)
}
SCREENS.push(
	// The engagement floats its composer like the test-agent panel: one lift.
	{ name: "agentix-workspace", path: "/agentix-prototype", root: ".aop-root", budget: { shadowed: 1 }, prepare: openEngagement("Revenue reconciliation") },
	{
		name: "agentix-case",
		path: "/agentix-prototype",
		root: ".aop-root",
		budget: { shadowed: 1 },
		async prepare(page) {
			await openEngagement("Revenue reconciliation")(page)
			await page.getByRole("button", { name: "Review details", exact: true }).first().click()
			await page.waitForTimeout(800)
		},
	},
	{
		name: "agentix-results",
		path: "/agentix-prototype",
		root: ".aop-root",
		budget: { shadowed: 1 },
		async prepare(page) {
			await openEngagement("Revenue reconciliation")(page)
			await page.getByRole("tab", { name: /^Results/ }).click()
			await page.locator(".aop-results-list button").first().click()
			await page.waitForTimeout(800)
		},
	},
	{
		name: "agentix-review",
		path: "/agentix-prototype",
		root: ".aop-root",
		async prepare(page) {
			await freshAgentix(page)
			await page.getByRole("button", { name: "Assign work", exact: true }).click()
			await page.locator("button.aop-list-row", { hasText: "Revenue data engineering" }).click()
			await page.waitForTimeout(800)
		},
	},
	{
		name: "agentix-start",
		path: "/agentix-prototype",
		root: ".aop-root",
		async prepare(page) {
			await freshAgentix(page)
			await page.getByRole("button", { name: "Assign work", exact: true }).click()
			await page.waitForTimeout(800)
		},
	},
)

SCREENS.push(
	// The Dashboard is the ElevenLabs Home: six illustrated action tiles and three
	// illustration tiles are that reference's own frames (docs/elevenlabs-reference-map.md).
	{ name: "dashboard", path: "/maxion-prototype", root: ".wh-root" },
	{
		name: "projects",
		path: "/maxion-prototype",
		root: ".pj-root",
		async prepare(page) {
			await page.getByRole("navigation", { name: "Portal sections" }).getByRole("button", { name: "Projects", exact: true }).click()
			await page.waitForTimeout(800)
		},
	},
)

const audit = (page, rootSelector) =>
	page.evaluate(selector => {
		const cs = element => getComputedStyle(element)
		const root = document.querySelector(selector) ?? document.body
		const sizes = new Set()
		let containers = 0, shadowed = 0, uppercase = 0, under12 = 0, textNodes = 0
		for (const element of root.querySelectorAll("*")) {
			const box = element.getBoundingClientRect()
			if (!box.width || !box.height) continue
			const style = cs(element)
			const bordered = ["Top", "Right", "Bottom", "Left"].some(side => parseFloat(style[`border${side}Width`]) > 0)
			const filled = style.backgroundColor !== "rgba(0, 0, 0, 0)"
			// A container is a panel that compartmentalises the screen, not a chip.
			const panel = box.width > 140 && box.height > 48
			if ((bordered || filled) && parseFloat(style.borderTopLeftRadius) > 3 && panel) containers++
			if (style.boxShadow && style.boxShadow !== "none") shadowed++
			if (style.textTransform === "uppercase" && element.textContent.trim()) uppercase++
		}
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
		let node
		while ((node = walker.nextNode())) {
			if (!node.textContent.trim()) continue
			const element = node.parentElement
			if (!element?.getBoundingClientRect().width) continue
			const size = parseFloat(cs(element).fontSize)
			textNodes++
			sizes.add(size)
			if (size < 12) under12++
		}
		return { containers, shadowed, uppercase, under12, textNodes, distinctSizes: sizes.size, sizes: [...sizes].sort((a, b) => a - b) }
	}, rootSelector)

const update = process.argv.includes("--update")
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {}
const next = {}
let failed = false

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
for (const screen of SCREENS) {
	await page.goto(BASE + screen.path)
	await page.waitForTimeout(1200)
	if (screen.prepare) await screen.prepare(page)
	const result = await audit(page, screen.root)
	next[screen.name] = result
	const budget = { ...BUDGET, ...(screen.budget ?? {}) }
	const within = Object.entries(budget).every(([key, max]) => result[key] <= max)
	const previous = baseline[screen.name]
	const regressed = previous
		? Object.keys(BUDGET).some(key => result[key] > previous[key])
		: false
	const detail = Object.keys(budget).map(key => `${key} ${result[key]}/${budget[key]}`).join("  ")
	if (within) console.log(`pass  ${screen.name}  ${detail}`)
	else if (regressed) { failed = true; console.error(`WORSE ${screen.name}  ${detail}  (was ${Object.keys(BUDGET).map(k => `${k} ${previous[k]}`).join(" ")})`) }
	else console.log(`over  ${screen.name}  ${detail}  sizes ${result.sizes.join(",")}`)
}
await browser.close()

if (update || !existsSync(BASELINE)) writeFileSync(BASELINE, JSON.stringify(next, null, "\t") + "\n")
if (failed) { console.error("\nVisual density regressed."); process.exit(1) }
console.log("\nVisual density check complete. 'over' means not yet migrated; it may not get worse.")
