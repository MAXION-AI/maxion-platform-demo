import { ArrowLeft, ArrowsLeftRight, CaretRight, ChartBar, CheckCircle, FileText, MagnifyingGlass, PencilSimple, Receipt, Scales, TreeStructure } from "@phosphor-icons/react"
import { Button as DsButton, Mark } from "@/design/primitives"
import { useEffect, useRef, useState } from "react"
import { artifactBy, itemBy, latest } from "./engine/engine"
import { memberName, shortTime, statusOf } from "./engine/selectors"
import type { AgentixState, Artifact, ArtifactKind } from "./engine/types"
import { Status } from "./OperationsViews"
import { DashboardPreview, DataLabel, MappingPreview, PipelinePreview, ReconciliationPreview, RunbookPreview, VersionHistory } from "./ResultPreviews"

const ORDER: ArtifactKind[] = ["dashboard", "reconciliation", "pipeline", "mapping", "runbook"]
const ICON: Record<ArtifactKind, typeof ChartBar> = { dashboard: ChartBar, reconciliation: Scales, pipeline: TreeStructure, mapping: ArrowsLeftRight, runbook: FileText }

export type ResultCallbacks = { onSelect: (id: string | undefined) => void; onRequestChange: (artifactId: string) => void; onOpenWork: (id: string) => void }

/*
 * Results: what the engagement produced and what it verified. The list is the
 * Studio chapters panel; the preview is the document column (mobbin 0462ca01),
 * business view first with the technical detail one disclosure away.
 */
/*
 * Which preview draws each kind of artifact. Exhaustive by type: adding an ArtifactKind without a
 * preview will not compile, rather than silently falling back to another scenario's component.
 */
const PREVIEWS: Record<ArtifactKind, typeof RunbookPreview> = {
	mapping: MappingPreview,
	pipeline: PipelinePreview,
	dashboard: DashboardPreview,
	reconciliation: ReconciliationPreview,
	runbook: RunbookPreview,
}

export function ResultsView({ state, engagementId, resultId, callbacks }: { state: AgentixState; engagementId: string; resultId?: string; callbacks: ResultCallbacks }) {
	const artifacts = state.artifacts.filter(artifact => artifact.engagementId === engagementId).sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
	const verified = state.work.filter(item => item.engagementId === engagementId && item.status === "verified").sort((a, b) => (b.finished ?? 0) - (a.finished ?? 0))
	const outcomes = verified.slice(0, 12)
	const selected = resultId && (artifactBy(state, resultId) || itemBy(state, resultId)) ? resultId : undefined
	const empty = !artifacts.length && !outcomes.length
	return (
		<div className={`aop-results${selected ? " has-selection" : ""}`}>
			<nav className="aop-results-list" aria-label="Results">
				{artifacts.length ? (
					<section>
						<div className="aop-subhead"><h2>Produced</h2><span>{artifacts.length}</span></div>
						<ul>
							{artifacts.map(artifact => {
								const version = latest(artifact)
								const Icon = ICON[artifact.kind]
								const live = artifact.productionVersion
								return (
									<li key={artifact.id}>
										<button type="button" aria-current={selected === artifact.id ? "true" : undefined} onClick={() => callbacks.onSelect(artifact.id)}>
											<span className="aop-result-icon" aria-hidden="true"><Icon size={16} /></span>
											<span className="aop-list-text"><strong>{artifact.title}</strong><small>v{version.version}{live ? ` · live v${live}` : ""} · {version.status === "failed" ? "failed checks" : version.status === "testing" ? "testing" : version.status === "tested" ? "tested" : live === version.version ? "in production" : version.status}</small></span>
										</button>
									</li>
								)
							})}
						</ul>
					</section>
				) : null}
				<section>
					<div className="aop-subhead"><h2>Verified outcomes</h2><span>{verified.length > outcomes.length ? `latest ${outcomes.length} of ${verified.length}` : verified.length || "none yet"}</span></div>
					{outcomes.length ? (
						<ul>
							{outcomes.map(item => (
								<li key={item.id}>
									<button type="button" aria-current={selected === item.id ? "true" : undefined} onClick={() => callbacks.onSelect(item.id)}>
										<span className="aop-result-icon is-positive" aria-hidden="true"><CheckCircle size={16} weight="fill" /></span>
										<span className="aop-list-text"><strong>{item.title}</strong><small><span className="aop-mono">{item.reference}</span> · {shortTime(item.finished ?? item.started)}</small></span>
									</button>
								</li>
							))}
						</ul>
					) : <p className="aop-quiet">A result appears here only when every required outcome has evidence.</p>}
				</section>
			</nav>
			<div className="aop-results-preview">
				{selected && artifactBy(state, selected) ? <ArtifactResult key={selected} state={state} artifact={artifactBy(state, selected)!} callbacks={callbacks} />
					: selected ? <OutcomeResult key={selected} state={state} workId={selected} callbacks={callbacks} />
					: <div className="aop-empty"><span className="aop-empty-icon is-still" aria-hidden="true"><MagnifyingGlass size={18} /></span><strong>{empty ? "No results yet" : "Choose a result"}</strong><p>{empty ? "Results appear as work is verified. Nothing is shown as done before its evidence passes." : "Open a result to see its business view, evidence and versions."}</p></div>}
			</div>
		</div>
	)
}

function ArtifactResult({ state, artifact, callbacks }: { state: AgentixState; artifact: Artifact; callbacks: ResultCallbacks }) {
	const current = latest(artifact)
	// Until you pick a version, the preview follows what's in production (or the latest while nothing is live).
	const [picked, setPicked] = useState<number | null>(null)
	const shown = picked !== null && artifact.versions.some(entry => entry.version === picked) ? picked : artifact.productionVersion ?? current.version
	const [compare, setCompare] = useState<number | null>(null)
	const [evidence, setEvidence] = useState(false)
	const heading = useRef<HTMLHeadingElement>(null)
	useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [artifact.id])
	const version = artifact.versions.find(entry => entry.version === shown) ?? current
	const owner = itemBy(state, artifact.workItemId)
	const events = state.events.filter(event => event.artifactId === artifact.id).slice(-8).reverse()
	// Evidence is a record, not something to amend; everything the specialists built can take a change request.
	const changeable = artifact.kind !== "reconciliation"
	return (
		<article className="aop-result" aria-labelledby="aop-result-title">
			<DsButton variant="ghost" size="sm" className="aop-results-back" onClick={() => callbacks.onSelect(undefined)}><ArrowLeft size={14} />All results</DsButton>
			<header className="aop-result-head">
				<div>
					<p className="aop-case-kicker">{memberName(state, artifact.engagementId, current.author)} · {owner ? <span className="aop-mono">{owner.reference}</span> : null}</p>
					<h2 id="aop-result-title" ref={heading} tabIndex={-1}>{artifact.title} <span className="aop-subtle">v{version.version}</span></h2>
					<p className="aop-result-meta"><DataLabel state={state} artifact={artifact} version={version} />{artifact.productionVersion && artifact.productionVersion !== version.version ? <span>Production is on v{artifact.productionVersion}</span> : null}{current.version !== version.version ? <span>Latest is v{current.version}</span> : null}</p>
				</div>
				<div className="aop-actions">
					{changeable ? <DsButton onClick={() => callbacks.onRequestChange(artifact.id)}><PencilSimple size={14} />Request a change</DsButton> : null}
					<DsButton aria-pressed={evidence} onClick={() => setEvidence(value => !value)}><Receipt size={14} />{evidence ? "Hide evidence" : "Inspect evidence"}</DsButton>
					{owner ? <DsButton variant="ghost" onClick={() => callbacks.onOpenWork(owner.id)}>Open related work<CaretRight size={12} /></DsButton> : null}
				</div>
			</header>
			{evidence ? (
				<section className="aop-evidence" aria-label="Evidence">
					<div className="aop-subhead"><h3>Evidence</h3><span>{events.length} recorded</span></div>
					<ol className="aop-evidence-list">
						{events.map(event => <li key={event.id}><time>{shortTime(event.at)}</time><span>{event.text}</span>{event.operations?.length ? <small>{event.operations.join(" · ")}</small> : null}</li>)}
						{!events.length ? <li><span>No evidence recorded for this result yet.</span></li> : null}
					</ol>
				</section>
			) : null}
			<div className="aop-result-body">
				{(() => { const Preview = PREVIEWS[artifact.kind]; return <Preview state={state} artifact={artifact} version={version} /> })()}
			</div>
			<VersionHistory state={state} artifact={artifact} selected={version.version} onSelect={value => { setPicked(value); setCompare(null) }} compareWith={compare} onCompare={setCompare} />
		</article>
	)
}

function OutcomeResult({ state, workId, callbacks }: { state: AgentixState; workId: string; callbacks: ResultCallbacks }) {
	const item = itemBy(state, workId)!
	const heading = useRef<HTMLHeadingElement>(null)
	useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [workId])
	const engagement = state.engagements[item.engagementId]
	const minutes = item.finished ? Math.max(1, Math.round((item.finished - item.started) / 60000)) : null
	return (
		<article className="aop-result" aria-labelledby="aop-result-title">
			<DsButton variant="ghost" size="sm" className="aop-results-back" onClick={() => callbacks.onSelect(undefined)}><ArrowLeft size={14} />All results</DsButton>
			<header className="aop-result-head">
				<div>
					<p className="aop-case-kicker"><span className="aop-mono">{item.reference}</span> · {engagement.name}</p>
					<h2 id="aop-result-title" ref={heading} tabIndex={-1}>{item.title}</h2>
					<p className="aop-result-meta"><Status label={statusOf(state, item).label} tone="positive" /><span>Verified {shortTime(item.finished ?? item.started)}{minutes ? ` · ${minutes} min from start` : ""}</span></p>
				</div>
				<div className="aop-actions"><DsButton variant="ghost" onClick={() => callbacks.onOpenWork(item.id)}>Open work item<CaretRight size={12} /></DsButton></div>
			</header>
			<ul className="aop-criteria">
				{item.obligations.map(obligation => <li key={obligation.id}><span className="aop-check-text"><span>{obligation.id === "decision" ? "Decision bound to this record" : obligation.id === "notified" ? "Required notification accepted" : obligation.id === "recorded" || obligation.id === "assigned" || obligation.id === "requisition" ? "Record change verified by read-back" : `Required outcome: ${obligation.id}`}</span><small>{obligation.evidence ?? "Read-back"}</small></span><Status label="Evidenced" tone="positive" /></li>)}
			</ul>
			{item.effects.length ? <p className="aop-receipts"><Receipt size={14} />{item.effects.map(effect => `${effect.system}: ${effect.sends} dispatch${effect.sends === 1 ? "" : "es"}${effect.reference ? ` (${effect.reference})` : ""}`).join(" · ")}{item.flags.reconciled ? " · uncertain outcome reconciled, no duplicate" : ""}</p> : null}
			{item.humanReference ? <p className="aop-receipts"><Mark seed="owner" size="xs" />Owner confirmation {item.humanReference}</p> : null}
			<p className="aop-footnote">Simulated effects and receipts. “Notification accepted” is the provider's acceptance, not proof that someone read it.</p>
		</article>
	)
}
