import { CaretDown, CaretRight, Check, Database, Minus, Warning } from "@phosphor-icons/react"
import { useState } from "react"
import { artifactSpec, isTerminal, latest, releaseWindowFor, scenarioOf } from "./engine/engine"
import type { MappingRow, PreviewSpec } from "./engine/scenarios"
import { dayLabel, memberName, releaseStatusLabel, shortTime } from "./engine/selectors"
import type { AgentixState, Artifact, ArtifactVersion, CheckState } from "./engine/types"
import { Status } from "./OperationsViews"

/*
 * Business previews of what the specialists produced. Each leads with what a
 * finance user needs; SQL, configuration and logs sit behind Details. Every
 * figure is synthetic, and a preview says whether it shows test or production
 * production data.
 */

const usd = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* Which data a preview shows: what's live, what was live before, or the isolated test sample. */
export function DataLabel({ state, artifact, version }: { state: AgentixState; artifact: Artifact; version: ArtifactVersion }) {
	const testData = previewOf(state, artifact.engagementId)?.testDataLabel ?? "Test data · synthetic sample"
	const production = artifact.productionVersion === version.version
	const wasLive = !production && state.releases.some(release => release.artifactId === artifact.id && release.version === version.version && (release.status === "applied" || release.status === "verified"))
	return <span className={`aop-data-label${production ? " is-production" : ""}`}><Database size={12} aria-hidden="true" />{production ? "Production" : wasLive ? "Previously in production" : testData}</span>
}

/* ---- Mapping ---------------------------------------------------------------- */
/* Which preview content applies here: an engagement without one draws nothing. */
export function previewOf(state: AgentixState, engagementId: string): PreviewSpec | undefined {
	return scenarioOf(state, engagementId).preview
}
export function mappingRows(preview: PreviewSpec, variant: string[]): MappingRow[] {
	return preview.mapping.rows.filter(row => row.approved || !variant.includes(preview.approvedOnlyVariant))
}

export function MappingPreview({ state, artifact, version, compact = false }: { state: AgentixState; artifact: Artifact; version: ArtifactVersion; compact?: boolean }) {
	const preview = previewOf(state, artifact.engagementId)
	if (!preview) return null
	const spec = preview.mapping
	const rows = mappingRows(preview, version.variant)
	const shown = compact ? rows.filter(row => spec.compactTargets.includes(row.target)) : rows
	// The row the milestone decision is about stays flagged until the owner has decided it.
	const undecided = !version.variant.some(value => value.startsWith(spec.decisionPrefix))
	return (
		<div className="aop-preview-block">
			{compact ? null : <p className="aop-preview-lede">{spec.lede(rows.length, rows.some(row => !row.approved))}</p>}
			<div className="aop-grid-table" role="table" aria-label="Source-to-target mapping">
				<div className="aop-grid-head" role="row"><span role="columnheader">{spec.sourceHeader}</span><span role="columnheader">{spec.targetHeader}</span><span role="columnheader">Rule</span></div>
				{shown.map(row => (
					<div key={row.target} role="row" className={`aop-grid-row${row.target === spec.decisionTarget && undecided ? " is-attention" : ""}${row.approved ? "" : " is-muted"}`}>
						<span role="cell" className="aop-code">{row.source}</span>
						<span role="cell" className="aop-code">{row.target}</span>
						<span role="cell">{row.rule(version.variant)}{row.approved ? null : <span className="aop-chip is-outline">Not on approved list</span>}</span>
					</div>
				))}
			</div>
			{compact ? null : (
				<details className="aop-inline-disclosure">
					<summary><CaretRight size={12} />Technical details</summary>
					<pre className="aop-code-block">{spec.technical(version.version, version.variant, rows)}</pre>
				</details>
			)}
		</div>
	)
}

/* ---- Pipeline ---------------------------------------------------------------- */
export function PipelinePreview({ state, artifact, version }: { state: AgentixState; artifact: Artifact; version: ArtifactVersion }) {
	const preview = previewOf(state, artifact.engagementId)
	if (!preview) return null
	const spec = preview.pipeline
	return (
		<div className="aop-preview-block">
			<p className="aop-preview-lede">{spec.lede(version.variant)}</p>
			<ol className="aop-flow" aria-label="Pipeline stages">
				{spec.stages.map((stage, index) => (
					<li key={stage.name}>
						<span className="aop-flow-index">{index + 1}</span>
						<span className="aop-list-text"><strong>{stage.name}</strong><small>{stage.detail}</small></span>
					</li>
				))}
			</ol>
			<dl className="aop-rows">
				{spec.rows(version.variant).map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
				<div><dt>In production</dt><dd>{artifact.productionVersion ? `v${artifact.productionVersion}` : "Not released yet"}</dd></div>
			</dl>
			<ChecksList state={state} artifact={artifact} version={version} />
			<details className="aop-inline-disclosure">
				<summary><CaretRight size={12} />Technical details</summary>
				<pre className="aop-code-block">{spec.technical(version.version, version.variant)}</pre>
				<p>Isolated run log: {version.checks.length} checks · {version.checks.filter(check => check.status === "passed").length} passed · synthetic data only · no production credentials.</p>
			</details>
		</div>
	)
}

/* ---- Checks, bound to one version ----------------------------------------- */
const CHECK_STATUS: Record<CheckState["status"], { label: string; tone: "positive" | "danger" | "neutral" | "live" | "attention" }> = { passed: { label: "Passed", tone: "positive" }, failed: { label: "Failed", tone: "danger" }, pending: { label: "Not run", tone: "neutral" }, running: { label: "Running", tone: "live" }, invalidated: { label: "Invalidated", tone: "attention" } }
export function ChecksList({ state, artifact, version }: { state: AgentixState; artifact: Artifact; version: ArtifactVersion }) {
	const spec = artifactSpec(state, artifact)
	if (!spec || !version.checks.length) return null
	const passed = version.checks.filter(check => check.status === "passed").length
	// When the owner left invoices without a region out of regional views, the sum check says what it really verifies.
	const excluded = artifact.kind === "dashboard" && state.artifacts.some(entry => entry.id === `${artifact.engagementId}:mapping` && latest(entry).variant.includes("region-excluded"))
	const labelOf = (id: string) => id === "sum" && excluded ? "Regions plus invoices without a region add up to the company total" : spec.checks.find(entry => entry.id === id)?.label ?? id
	return (
		<section className="aop-checks" aria-label={`Checks for ${artifact.title} v${version.version}`}>
			<div className="aop-subhead"><h3>Checks on v{version.version}</h3><span>{passed} of {version.checks.length} passed · isolated · synthetic data</span></div>
			<ul className="aop-criteria">
				{version.checks.map(check => {
					const status = CHECK_STATUS[check.status]
					const label = spec.checks.find(entry => entry.id === check.id)
					return (
						<li key={check.id}>
							<span className="aop-check-text"><span>{labelOf(check.id)}</span>{check.detail ? <small>{check.detail}</small> : <small>{label?.scope}</small>}</span>
							<Status label={status.label} tone={status.tone} icon={check.status === "pending" ? <Minus size={12} weight="bold" /> : check.status === "invalidated" ? <Warning size={12} weight="bold" /> : undefined} />
						</li>
					)
				})}
			</ul>
		</section>
	)
}

/* ---- Reconciliation evidence ------------------------------------------------ */
export function ReconciliationPreview({ state, artifact, version }: { state: AgentixState; artifact: Artifact; version: ArtifactVersion }) {
	const preview = previewOf(state, artifact.engagementId)
	const mapping = state.artifacts.find(entry => entry.engagementId === artifact.engagementId && entry.key === "mapping")
	const exceptions = state.work.filter(item => item.engagementId === artifact.engagementId && item.template === "exception" && !isTerminal(item))
	if (!preview) return null
	const spec = preview.reconciliation
	// A milestone decision can remove the optional row; revenue's "leave them out of regional views" does.
	const removed = !!spec.optionalRow && !!mapping && latest(mapping).variant.includes(spec.optionalRow.removedBy)
	const rows = [...spec.rows, ...spec.optionalRow && !removed ? [{ name: spec.optionalRow.name, value: spec.optionalRow.value }] : []]
	return (
		<div className="aop-preview-block">
			<p className="aop-preview-lede">{spec.lede(version.summary)}</p>
			<div className="aop-grid-table is-numbers" role="table" aria-label={`${spec.columns[0]} comparison`}>
				<div className="aop-grid-head" role="row">{spec.columns.map(column => <span key={column} role="columnheader">{column}</span>)}</div>
				{rows.map(row => (
					<div key={row.name} role="row" className="aop-grid-row">
						<span role="cell">{row.name}</span><span role="cell">{spec.format(row.value)}</span><span role="cell">{spec.format(row.value)}</span><span role="cell"><Status label={spec.format(0)} tone="positive" /></span>
					</div>
				))}
				<div role="row" className="aop-grid-row is-total"><span role="cell">{spec.totalLabel}</span><span role="cell">{spec.format(spec.total)}</span><span role="cell">{spec.format(spec.total)}</span><span role="cell">{spec.format(0)}</span></div>
			</div>
			{removed && spec.optionalRow ? <p className="aop-footnote"><Warning size={12} />{spec.optionalRow.footnote(spec.format(spec.optionalRow.value))}</p> : null}
			<div className="aop-subhead"><h3>{spec.exceptionsTitle}</h3><span>{exceptions.length} open</span></div>
			<ul className="aop-criteria">
				{exceptions.slice(0, 5).map(item => <li key={item.id}><span><span className="aop-mono">{item.reference}</span> · {item.title}</span><Status label={item.flags.needsApproval && !item.flags.approved ? "Needs you" : "In progress"} tone={item.flags.needsApproval && !item.flags.approved ? "attention" : "live"} /></li>)}
				{!exceptions.length ? <li><span>{spec.emptyLabel}</span><Status label="Clear" tone="positive" /></li> : null}
			</ul>
			<p className="aop-footnote"><Database size={12} />Evidence recorded {shortTime(version.createdAt)} by {memberName(state, artifact.engagementId, version.author)}. Production totals.</p>
		</div>
	)
}

/* ---- Dashboard ---------------------------------------------------------------- */
export function DashboardPreview({ state, artifact, version }: { state: AgentixState; artifact: Artifact; version: ArtifactVersion }) {
	const [open, setOpen] = useState<string | null>(null)
	const preview = previewOf(state, artifact.engagementId)
	const exceptions = state.work.filter(item => item.engagementId === artifact.engagementId && item.template === "exception" && !isTerminal(item)).length
	const production = artifact.productionVersion === version.version
	const mapping = state.artifacts.find(entry => entry.id === `${artifact.engagementId}:mapping`)
	// The load time is the last verified cycle, or the first production load before any cycle has run.
	const cycle = state.work.filter(item => item.engagementId === artifact.engagementId && item.kind === "cycle" && item.status === "verified").sort((a, b) => (b.finished ?? 0) - (a.finished ?? 0))[0]
	const firstLoad = state.work.find(item => item.engagementId === artifact.engagementId && item.template === "pipeline" && item.status === "verified")
	if (!preview) return null
	const spec = preview.dashboard
	const drill = version.variant.includes(spec.drillVariant)
	const removed = !!spec.optionalRow && !!mapping && latest(mapping).variant.includes(spec.optionalRow.removedBy)
	const loaded = !production ? "Synthetic test day" : cycle ? `Loaded ${shortTime(cycle.finished ?? cycle.started)}` : firstLoad ? `First load ${shortTime(firstLoad.finished ?? firstLoad.started)}` : "No production load yet"
	const occurrence = cycle && Number.isFinite(Date.parse(cycle.occurrence)) ? Date.parse(cycle.occurrence) : undefined
	const ledgerDay = occurrence ?? firstLoad?.finished ?? state.clock
	const max = Math.max(...spec.rows.map(entry => entry.value), spec.optionalRow && !removed ? spec.optionalRow.value : 0)
	return (
		<div className="aop-preview-block">
			<div className="aop-dash" aria-label={`${spec.subject} v${version.version} preview`}>
				<header className="aop-dash-head">
					<strong>{spec.subject} · {production ? dayLabel(ledgerDay - 86400000) : preview.sampleDay}</strong>
					<DataLabel state={state} artifact={artifact} version={version} />
				</header>
				<div className="aop-dash-tiles">
					{spec.tiles({ exceptions, loaded }).map(tile => <div key={tile.label}><span>{tile.label}</span><strong>{tile.value}</strong><small>{tile.note}</small></div>)}
				</div>
				{/* The chart had its name only in the aria-label, so a sighted viewer met a stack of bars
				    with nothing saying what they counted. */}
				<p className="aop-dash-chart-label">{spec.chartLabel}</p>
				<div className="aop-dash-chart" role="list" aria-label={spec.chartLabel}>
					{spec.rows.map(entry => (
						<div key={entry.name} role="listitem" className="aop-dash-bar-row">
							{drill && entry.children ? (
								<button type="button" className="aop-dash-region" aria-expanded={open === entry.name} onClick={() => setOpen(value => value === entry.name ? null : entry.name)}>{open === entry.name ? <CaretDown size={12} /> : <CaretRight size={12} />}{entry.name}</button>
							) : <span className="aop-dash-region">{entry.name}</span>}
							<span className="aop-dash-bar"><i style={{ width: `${Math.round((entry.value / max) * 100)}%` }} /></span>
							<span className="aop-dash-value">{spec.format(entry.value)}</span>
							{drill && entry.children && open === entry.name ? (
								<ul className="aop-dash-countries" aria-label={spec.childrenLabel(entry.name)}>
									{entry.children.map(([child, value]) => <li key={child}><span>{child}</span><span className="aop-dash-bar is-sub"><i style={{ width: `${Math.round((value / entry.value) * 100)}%` }} /></span><span className="aop-dash-value">{spec.format(value)}</span></li>)}
								</ul>
							) : null}
						</div>
					))}
					{spec.optionalRow && !removed ? <div role="listitem" className="aop-dash-bar-row is-muted"><span className="aop-dash-region">{spec.optionalRow.name}</span><span className="aop-dash-bar"><i style={{ width: `${Math.round((spec.optionalRow.value / max) * 100)}%` }} /></span><span className="aop-dash-value">{spec.format(spec.optionalRow.value)}</span></div> : null}
				</div>
			</div>
			{removed && spec.optionalRow ? <p className="aop-footnote">{spec.optionalRow.footnote(spec.format(spec.optionalRow.value))}</p> : null}
			{drill ? <p className="aop-footnote"><Check size={12} />{spec.drillNote}</p> : null}
			<ChecksList state={state} artifact={artifact} version={version} />
		</div>
	)
}

/* ---- Operating runbook ---------------------------------------------------- */
export function RunbookPreview({ state, artifact, version }: { state: AgentixState; artifact: Artifact; version: ArtifactVersion }) {
	const engagement = state.engagements[artifact.engagementId]
	const preview = previewOf(state, artifact.engagementId)
	const dashboard = state.artifacts.find(entry => entry.id === `${artifact.engagementId}:dashboard`)
	if (!preview) return null
	const spec = preview.runbook
	const release = engagement.answers.release === "window" ? `in the ${releaseWindowFor(engagement.workflowId).label} window under your policy` : "after your approval, with their target, checks and recovery limits"
	const live = dashboard?.versions.find(entry => entry.version === dashboard.productionVersion)
	const drill = !!live?.variant.includes(preview.dashboard.drillVariant) && version.version > 1
	return (
		<article className="aop-doc">
			<p className="aop-preview-lede">{spec.lede}</p>
			<h3>What runs every day</h3>
			<p>{spec.daily(drill)}</p>
			<h3>What is verified</h3>
			<p>{spec.verified}</p>
			<h3>What needs a person</h3>
			<p>{spec.needsPerson(release)}</p>
			{version.version > 1 ? <><h3>What changed in v{version.version}</h3><p>{version.summary}. {version.changes.join(" ")}</p></> : null}
			<h3>Recovery</h3>
			<p>{spec.recovery}</p>
		</article>
	)
}

/* ---- Versions, compare and releases ---------------------------------------- */
const SOURCE_LABEL: Record<ArtifactVersion["source"], string> = { build: "Built", repair: "Repaired automatically", amendment: "Changed on request", decision: "Your decision applied" }
const versionStatus = (artifact: Artifact, version: ArtifactVersion) => artifact.productionVersion === version.version ? { label: "Live", tone: "positive" as const }
	: version.status === "tested" ? { label: "Tested", tone: "positive" as const }
	: version.status === "failed" ? { label: "Failed checks", tone: "danger" as const }
	: version.status === "testing" ? { label: "Testing", tone: "live" as const }
	: version.status === "superseded" ? { label: "Superseded", tone: "neutral" as const }
	: version.status === "released" ? { label: "Released earlier", tone: "neutral" as const }
	: { label: "Draft", tone: "neutral" as const }

export function VersionHistory({ state, artifact, selected, onSelect, compareWith, onCompare }: { state: AgentixState; artifact: Artifact; selected: number; onSelect: (version: number) => void; compareWith: number | null; onCompare: (version: number | null) => void }) {
	const releases = state.releases.filter(release => release.artifactId === artifact.id)
	return (
		<section className="aop-versions" aria-label="Version and release history">
			<div className="aop-subhead"><h3>Versions</h3><span>{artifact.versions.length} · production {artifact.productionVersion ? `v${artifact.productionVersion}` : "not released"}</span></div>
			<ol className="aop-version-list">
				{[...artifact.versions].reverse().map(version => {
					const status = versionStatus(artifact, version)
					const passed = version.checks.filter(check => check.status === "passed").length
					return (
						<li key={version.version} className={version.version === selected ? "is-selected" : undefined}>
							<button type="button" aria-pressed={version.version === selected} onClick={() => onSelect(version.version)}>
								<span className="aop-version-number">v{version.version}</span>
								<span className="aop-list-text"><strong>{version.summary}</strong><small>{SOURCE_LABEL[version.source]} · {memberName(state, artifact.engagementId, version.author)} · {shortTime(version.createdAt)}{version.checks.length ? ` · ${passed}/${version.checks.length} checks` : ""}</small></span>
								<Status label={status.label} tone={status.tone} />
							</button>
						</li>
					)
				})}
			</ol>
			{artifact.versions.length > 1 ? (
				<div className="aop-compare-bar">
					<label className="aop-inline-select">Compare v{selected} with
						<span className="aop-select">
							<select value={compareWith ?? ""} onChange={event => onCompare(event.target.value ? Number(event.target.value) : null)}>
								<option value="">Choose a version</option>
								{artifact.versions.filter(version => version.version !== selected).map(version => <option key={version.version} value={version.version}>v{version.version}</option>)}
							</select>
							<CaretDown size={12} aria-hidden="true" />
						</span>
					</label>
				</div>
			) : null}
			{compareWith ? <VersionCompare state={state} artifact={artifact} left={compareWith} right={selected} /> : null}
			{releases.length ? (
				<>
					<div className="aop-subhead aop-release-history-head"><h3>Releases</h3><span>{releases.length}</span></div>
					<ul className="aop-criteria">
						{[...releases].reverse().map(release => { const status = releaseStatusLabel[release.status]; return <li key={release.id}><span><span className="aop-mono">{release.reference}</span> · v{release.version} → {release.target.split(" (")[0]}{release.appliedAt ? ` · ${shortTime(release.appliedAt)}` : ""}</span><Status label={status.label} tone={status.tone} /></li> })}
					</ul>
				</>
			) : null}
		</section>
	)
}

/*
 * What a variant means, in the words of the scenario that declared it: the decision option, the
 * amendment or the repair that introduced it, with the preview's own text for the ones a version
 * starts with. Without this a customer reads raw slugs like "tolerance-purchase-order".
 */
function variantText(state: AgentixState, engagementId: string): Record<string, string> {
	const scenario = scenarioOf(state, engagementId)
	const text: Record<string, string> = { ...scenario.preview?.variantText }
	for (const decision of Object.values(scenario.decisions)) {
		for (const option of decision.options) if (option.variant) text[option.variant.add] ??= option.variant.summary
	}
	for (const artifact of Object.values(scenario.artifacts)) {
		for (const amendment of artifact.amendments) text[amendment.variant] ??= amendment.summary
		for (const repair of Object.values(artifact.repair ?? {})) text[repair.variant] ??= repair.summary
	}
	return text
}
export function VersionCompare({ state, artifact, left, right }: { state: AgentixState; artifact: Artifact; left: number; right: number }) {
	const a = artifact.versions.find(version => version.version === left)
	const b = artifact.versions.find(version => version.version === right)
	const spec = artifactSpec(state, artifact)
	if (!a || !b) return null
	const [older, newer] = a.version < b.version ? [a, b] : [b, a]
	const text = variantText(state, artifact.engagementId)
	const added = newer.variant.filter(value => !older.variant.includes(value)).map(value => text[value] ?? value)
	const removed = older.variant.filter(value => !newer.variant.includes(value)).map(value => text[value] ?? value)
	const checks = spec?.checks.filter(check => older.checks.some(entry => entry.id === check.id) || newer.checks.some(entry => entry.id === check.id)) ?? []
	return (
		<section className="aop-compare" aria-label={`Compare v${older.version} and v${newer.version}`}>
			<div className="aop-subhead"><h3>v{older.version} → v{newer.version}</h3><span>{newer.changes[0] ?? newer.summary}</span></div>
			<ul className="aop-diff">
				{added.map(text => <li key={`+${text}`} className="is-added"><span aria-hidden="true">+</span>{text}</li>)}
				{removed.map(text => <li key={`-${text}`} className="is-removed"><span aria-hidden="true">−</span>{text}</li>)}
				{!added.length && !removed.length ? <li><span aria-hidden="true">=</span>Same content; rebuilt so its checks run again</li> : null}
			</ul>
			{checks.length ? (
				<div className="aop-grid-table is-compare" role="table" aria-label="Checks by version">
					<div className="aop-grid-head" role="row"><span role="columnheader">Check</span><span role="columnheader">v{older.version}</span><span role="columnheader">v{newer.version}</span></div>
					{checks.map(check => {
						const before = older.checks.find(entry => entry.id === check.id)
						const after = newer.checks.find(entry => entry.id === check.id)
						const cell = (value?: CheckState) => value ? <Status {...CHECK_STATUS[value.status]} /> : <span className="aop-subtle">—</span>
						return <div key={check.id} role="row" className="aop-grid-row"><span role="cell">{check.label}</span><span role="cell">{cell(before)}</span><span role="cell">{cell(after)}</span></div>
					})}
				</div>
			) : null}
		</section>
	)
}


