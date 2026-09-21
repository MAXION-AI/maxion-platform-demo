#!/usr/bin/env node
// Design token guard.
// Strict files may not contain raw colors, and no sizes other than 0, 1px and 2px.
// Ratchet files may not gain raw values versus scripts/design-token-baseline.json.
// Run with --update after removing raw values to lower the baseline.
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const STRICT = ["src/design/primitives.css", "src/components/motion/motion-kit.css", "src/components/workspace/workspace-composer.css", "src/features/platform-prototype/portal-shell.css", "src/features/discovery-autonomous/cockpit.css", "src/features/agentix/prototype/operations.css", "src/features/agentix/prototype/handoff.css", "src/features/agentix/prototype/engagement.css", "src/features/platform-prototype/workspace-home.css", "src/features/demo/demo.css"]
const RATCHET = []
const BASELINE = "scripts/design-token-baseline.json"
const COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/gi
const SIZE = /(?<![\w.-])(?!0px|1px|2px)\d*\.?\d+px\b/g

// Media and container conditions are breakpoints, not sizes, so their px values are allowed.
const strip = css => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@(media|container)[^{]*\{/g, "@$1 {")
const count = file => { const css = strip(readFileSync(file, "utf8")); return { color: (css.match(COLOR) ?? []).length, size: (css.match(SIZE) ?? []).length } }
const offenders = file => strip(readFileSync(file, "utf8")).split("\n").map((line, index) => ({ line: index + 1, text: line })).filter(({ text }) => COLOR.test(text) || SIZE.test(text)).map(({ line, text }) => `  ${file}:${line}  ${text.trim().slice(0, 90)}`)

let failed = false
for (const file of STRICT) {
	const found = offenders(file)
	if (found.length) { failed = true; console.error(`Raw values in strict file ${file}:\n${found.join("\n")}`) }
	else console.log(`ok    ${file}  (tokens only)`)
}
const update = process.argv.includes("--update")
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {}
const next = {}
for (const file of RATCHET) {
	const current = count(file)
	next[file] = current
	const previous = baseline[file]
	if (!previous || update) { console.log(`base  ${file}  colors ${current.color}  sizes ${current.size}`); continue }
	if (current.color > previous.color || current.size > previous.size) { failed = true; console.error(`Raw values increased in ${file}: colors ${previous.color} -> ${current.color}, sizes ${previous.size} -> ${current.size}`) }
	else console.log(`ok    ${file}  colors ${current.color}/${previous.color}  sizes ${current.size}/${previous.size}`)
}
if (update || !existsSync(BASELINE)) writeFileSync(BASELINE, JSON.stringify(next, null, "\t") + "\n")
if (failed) { console.error("\nDesign token check failed."); process.exit(1) }
console.log("Design token check passed.")
