import { SCENARIOS, type ArtifactSpec, type PreviewSpec } from "./scenarios"
import type { AgentixState, Artifact, ArtifactVersion } from "./types"

/*
 * Real files, generated from what a version actually contains. This is what a person downloads or
 * saves to OneDrive or SharePoint: a mapping or evidence as CSV, a dashboard as one self-contained
 * HTML page, and anything else as Markdown. Generated applications publish only this way (D-095).
 */

export type GeneratedFile = { name: string; mime: string; format: "csv" | "html" | "md"; content: string; bytes: number; hash: string }

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
const csvCell = (value: string | number) => { const text = String(value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text }
const csv = (rows: (string | number)[][]) => `${rows.map(row => row.map(csvCell).join(",")).join("\n")}\n`
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/* FNV-1a. A stable checksum of the bytes; this demo does not sign anything with it. */
export function checksum(content: string) {
	let hash = 0x811c9dc5
	for (const byte of new TextEncoder().encode(content)) { hash ^= byte; hash = Math.imul(hash, 0x01000193) }
	return (hash >>> 0).toString(16).padStart(8, "0")
}

/* What identifies a version's content, for the checkpoint that commits it. */
export const fingerprint = (artifact: Artifact, version: ArtifactVersion) => checksum(JSON.stringify([artifact.id, version.version, version.variant, version.summary, version.changes]))

const specOf = (state: AgentixState, artifact: Artifact): ArtifactSpec | undefined => SCENARIOS[state.engagements[artifact.engagementId]?.workflowId]?.artifacts[artifact.key]
const previewOf = (state: AgentixState, artifact: Artifact): PreviewSpec | undefined => SCENARIOS[state.engagements[artifact.engagementId]?.workflowId]?.preview

const CHECK_WORD = { passed: "Passed", failed: "Failed", pending: "Not run", running: "Running", invalidated: "Invalidated" } as const
function checksMarkdown(spec: ArtifactSpec | undefined, version: ArtifactVersion) {
	if (!version.checks.length) return []
	return ["", "## Checks", "", ...version.checks.map(check => `- ${CHECK_WORD[check.status]}: ${spec?.checks.find(entry => entry.id === check.id)?.label ?? check.id}${check.detail ? ` (${check.detail})` : ""}`)]
}

function genericMarkdown(artifact: Artifact, spec: ArtifactSpec | undefined, version: ArtifactVersion) {
	return [`# ${artifact.title} v${version.version}`, "", version.summary, ...version.changes.length ? ["", "## What it contains", "", ...version.changes.map(change => `- ${change}`)] : [], ...checksMarkdown(spec, version), ""].join("\n")
}

function pipelineMarkdown(artifact: Artifact, spec: ArtifactSpec | undefined, preview: PreviewSpec, version: ArtifactVersion) {
	const pipeline = preview.pipeline
	return [`# ${artifact.title} v${version.version}`, "", pipeline.lede(version.variant), "", "## Stages", "", ...pipeline.stages.map((stage, index) => `${index + 1}. ${stage.name}: ${stage.detail}`), "", "## Details", "", ...pipeline.rows(version.variant).map(row => `- ${row.label}: ${row.value}`), ...checksMarkdown(spec, version), "", "## Technical", "", "```", pipeline.technical(version.version, version.variant), "```", ""].join("\n")
}

function runbookMarkdown(artifact: Artifact, preview: PreviewSpec, version: ArtifactVersion, release: string) {
	const runbook = preview.runbook
	const sections: [string, string][] = [["What runs every day", runbook.daily(version.version > 1)], ["What is verified", runbook.verified], ["What needs a person", runbook.needsPerson(release)], ...version.version > 1 ? [[`What changed in v${version.version}`, `${version.summary}. ${version.changes.join(" ")}`] as [string, string]] : [], ["Recovery", runbook.recovery]]
	return [`# ${artifact.title} v${version.version}`, "", runbook.lede, ...sections.flatMap(([title, text]) => ["", `## ${title}`, "", text]), ""].join("\n")
}

function dashboardHtml(state: AgentixState, artifact: Artifact, preview: PreviewSpec, version: ArtifactVersion) {
	const dashboard = preview.dashboard
	const exceptions = state.work.filter(item => item.engagementId === artifact.engagementId && item.template === "exception" && item.status !== "verified" && item.status !== "not_completed").length
	const tiles = dashboard.tiles({ exceptions, loaded: `Snapshot of v${version.version}` })
	const max = Math.max(...dashboard.rows.map(row => row.value), 1)
	const title = `${escapeHtml(artifact.title)} v${version.version}`
	const drill = version.variant.includes(dashboard.drillVariant)
	const bar = (name: string, value: number, of: number, small = false) => `<tr${small ? ' class="sub"' : ""}><th>${escapeHtml(name)}</th><td><span class="bar" style="width:${Math.round((value / of) * 100)}%"></span></td><td class="num">${escapeHtml(dashboard.format(value))}</td></tr>`
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
body { margin: 32px auto; max-width: 720px; padding: 0 16px; font: 14px/20px system-ui, sans-serif; color: #0f0f10; }
h1 { font-size: 22px; line-height: 28px; font-weight: 600; margin: 0 0 4px; }
p { margin: 0 0 24px; color: #696969; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 24px; margin-bottom: 32px; }
.tiles strong { display: block; font-size: 22px; line-height: 28px; font-weight: 600; }
.tiles small { color: #696969; font-size: 12px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-weight: 500; padding: 6px 12px 6px 0; white-space: nowrap; }
td { padding: 6px 0; width: 60%; }
td.num { width: auto; text-align: right; font-variant-numeric: tabular-nums; padding-left: 12px; white-space: nowrap; }
.bar { display: block; height: 8px; background: #0f0f10; border-radius: 2px; }
.sub th { font-weight: 400; color: #696969; padding-left: 16px; }
.sub .bar { background: #8f8f8f; }
</style>
</head>
<body>
<h1>${title}</h1>
<p>${escapeHtml(version.summary)}. A published file version: it shows what was true when it was made, and it does not update.</p>
<section class="tiles">${tiles.map(tile => `<div><span>${escapeHtml(tile.label)}</span><strong>${escapeHtml(tile.value)}</strong><small>${escapeHtml(tile.note)}</small></div>`).join("")}</section>
<h2 style="font-size:14px;font-weight:600;margin:0 0 8px">${escapeHtml(dashboard.chartLabel)}</h2>
<table>${dashboard.rows.map(row => bar(row.name, row.value, max) + (drill && row.children ? row.children.map(([name, value]) => bar(name, value, row.value, true)).join("") : "")).join("")}</table>
</body>
</html>
`
}

export function fileFor(state: AgentixState, artifact: Artifact, version: ArtifactVersion): GeneratedFile {
	const spec = specOf(state, artifact)
	const preview = previewOf(state, artifact)
	const engagement = state.engagements[artifact.engagementId]
	let format: GeneratedFile["format"] = "md"
	let content = genericMarkdown(artifact, spec, version)
	if (preview && artifact.kind === "mapping") {
		format = "csv"
		const rows = preview.mapping.rows.filter(row => row.approved || !version.variant.includes(preview.approvedOnlyVariant))
		content = csv([[preview.mapping.sourceHeader, preview.mapping.targetHeader, "Rule", "On approved list"], ...rows.map(row => [row.source, row.target, row.rule(version.variant), row.approved ? "Yes" : "No"])])
	} else if (preview && artifact.kind === "reconciliation") {
		format = "csv"
		const spec = preview.reconciliation
		content = csv([[...spec.columns], ...spec.rows.map(row => [row.name, spec.format(row.value), spec.format(row.value), spec.format(0)]), [spec.totalLabel, spec.format(spec.total), spec.format(spec.total), spec.format(0)]])
	} else if (preview && artifact.kind === "dashboard") {
		format = "html"
		content = dashboardHtml(state, artifact, preview, version)
	} else if (preview && artifact.kind === "pipeline") {
		content = pipelineMarkdown(artifact, spec, preview, version)
	} else if (preview && artifact.kind === "runbook") {
		content = runbookMarkdown(artifact, preview, version, engagement?.answers.release === "window" ? "in the agreed window under your policy" : "after your approval, with their target, checks and recovery limits")
	}
	const mime = format === "csv" ? "text/csv" : format === "html" ? "text/html" : "text/markdown"
	return { name: `${slug(artifact.title)}-v${version.version}.${format}`, mime, format, content, bytes: new TextEncoder().encode(content).length, hash: checksum(content) }
}

/* Why a version can't be published as a file, in the owner's words, or null when it can. Only tested versions can. */
export function publishBlock(state: AgentixState, artifact: Artifact, version: ArtifactVersion): string | null {
	const spec = specOf(state, artifact)
	const label = (id: string) => spec?.checks.find(check => check.id === id)?.label ?? id
	const failed = version.checks.filter(check => check.status === "failed")
	if (failed.length) return `v${version.version} failed ${failed.length} of ${version.checks.length} checks: ${failed.map(check => label(check.id)).join("; ")}. Only a tested version can be published.`
	if (version.checks.some(check => check.status === "invalidated")) return `A later change invalidated the checks on v${version.version}. Only a tested version can be published.`
	if (version.checks.some(check => check.status !== "passed") || version.status === "testing") return `v${version.version} hasn't finished its checks. It can be published once they pass.`
	if (!version.checks.length && version.status === "draft") return `v${version.version} is still a draft. It can be published once it's finished.`
	const inTransit = state.work.some(item => item.saves?.some(save => save.artifactId === artifact.id && save.version === version.version))
	if (inTransit) return `v${version.version} is still being saved. It can be published once its bytes are confirmed.`
	return null
}
