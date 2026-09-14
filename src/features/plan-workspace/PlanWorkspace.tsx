import {
	ArrowCounterClockwise,
	ArrowRight,
	Check,
	CheckCircle,
	ClockCounterClockwise,
	FileText,
	LinkSimple,
	MagicWand,
	MagnifyingGlass,
	PaperPlaneTilt,
	ShieldCheck,
	SpinnerGap,
	WarningCircle,
	X,
} from "@phosphor-icons/react"
import { type FormEvent, useEffect, useMemo, useReducer, useRef, useState } from "react"

import type { DiscoveryPackageRef, PlanArtifactRef, PlanJumpSignal } from "@/features/platform-prototype/contracts"
import type { MaxionModuleId, PortalProject } from "@/features/platform-prototype/model"

import { planRepository } from "./planRepository"
import {
	planReducer,
	selectPlanArtifact,
	selectPlanReadiness,
	selectPlanRevision,
	selectPlanSections,
	type PlanArtifact,
	type PlanCommand,
	type PlanRole,
	type PlanSection,
} from "./planState"
import "./plan-workspace.css"

export type PlanJumpEntry = { id: string; label: string; hint: string; keywords: string; artifactId: string }
export const PLAN_JUMP_ENTRIES: readonly PlanJumpEntry[] = [
	["outcome", "Outcome and constraints"],
	["workstreams", "Workstreams"],
	["dependencies", "Dependencies"],
	["risks", "Risks and controls"],
	["gates", "Release gates"],
	["rollback", "Rollback"],
].map(([artifactId, label]) => ({ id: `plan-${artifactId}`, label, hint: "Plan section", keywords: `${label} plan artifact`, artifactId }))

type PlanWorkspaceProps = {
	projects: PortalProject[]
	discoveryPackage?: DiscoveryPackageRef | null
	onSendToExecute: (artifactRef: PlanArtifactRef) => void
	onNavigate: (module: MaxionModuleId) => void
	jumpSignal?: PlanJumpSignal | null
}

const asRole = (role: PortalProject["role"] | undefined): PlanRole => role === "Owner" ? "owner" : role === "Member" ? "member" : "viewer"

function usePlanSlice(discoveryPackage: DiscoveryPackageRef | null, role: PlanRole) {
	const loaded = useMemo(() => planRepository.load(), [])
	const [state, dispatch] = useReducer(planReducer, loaded.value)
	const [persistenceNotice, setPersistenceNotice] = useState(loaded.notice)
	useEffect(() => {
		if (discoveryPackage) dispatch({ type: "discovery/ingested", packageRef: discoveryPackage, actorRole: role })
	}, [discoveryPackage, role])
	useEffect(() => {
		const result = planRepository.save(state)
		if (!result.ok) setPersistenceNotice(result.message)
	}, [state])
	return { state, dispatch, persistenceNotice, dismissPersistenceNotice: () => setPersistenceNotice(null) }
}

function StatusBadge({ artifact }: { artifact: PlanArtifact }) {
	const readiness = selectPlanReadiness(artifact)
	if (artifact.artifactRef) return <span className="pnw-badge is-success"><CheckCircle size={13} weight="fill" />Approved v{artifact.artifactRef.artifactVersion}</span>
	if (readiness.ready) return <span className="pnw-badge is-success">Ready for approval</span>
	return <span className="pnw-badge is-warning">{readiness.reasons.length} readiness {readiness.reasons.length === 1 ? "item" : "items"}</span>
}

export function PlanWorkspace({ projects, discoveryPackage = null, onSendToExecute, onNavigate, jumpSignal = null }: PlanWorkspaceProps) {
	const project = projects.find((item) => item.id === discoveryPackage?.projectId) ?? projects[0]
	const role = asRole(project?.role)
	const { state, dispatch, persistenceNotice, dismissPersistenceNotice } = usePlanSlice(discoveryPackage, role)
	const artifact = selectPlanArtifact(state, discoveryPackage?.projectId ?? state.activeProjectId ?? project?.id ?? null)
	const [selectedSectionId, setSelectedSectionId] = useState("workstreams")
	const [query, setQuery] = useState("")
	const [compareOpen, setCompareOpen] = useState(false)
	const [comment, setComment] = useState("")
	const generationTimer = useRef<number | null>(null)
	const commandSequence = useRef(0)
	const handledJump = useRef(0)

	useEffect(() => () => { if (generationTimer.current !== null) window.clearTimeout(generationTimer.current) }, [])
	useEffect(() => {
		if (!jumpSignal || jumpSignal.tick === handledJump.current) return
		handledJump.current = jumpSignal.tick
		if (artifact && selectPlanRevision(artifact)?.sections.some((section) => section.id === jumpSignal.artifactId)) setSelectedSectionId(jumpSignal.artifactId)
	}, [artifact, jumpSignal])

	const commandMeta = (action: string, sectionId = "artifact") => {
		commandSequence.current += 1
		const prefix = `${artifact?.id ?? "plan"}:${artifact?.currentVersion ?? 0}:${action}:${sectionId}:${commandSequence.current}`
		return { idempotencyKey: prefix, correlationId: `ui-${prefix}` }
	}

	if (!artifact) {
		return <section className="pnw-empty" aria-label="Plan workspace empty state"><FileText size={30} /><small>PLAN</small><h1>No evidence-backed plan yet</h1><p>Complete a Discovery package first. Plan won’t infer approval or source authority from route access.</p><div><button type="button" onClick={() => onNavigate("discovery")}>Open Discover</button><button type="button" onClick={() => onNavigate("projects")}>Choose project</button></div></section>
	}

	const revision = selectPlanRevision(artifact)
	const sectionResult = selectPlanSections(artifact, query)
	const selected = revision?.sections.find((section) => section.id === selectedSectionId) ?? sectionResult.items[0] ?? null
	const readiness = selectPlanReadiness(artifact)
	const readOnly = role === "viewer"
	const send = (command: PlanCommand) => dispatch(command)

	const startEdit = (section: PlanSection) => send({ type: "section/edit-started", projectId: artifact.projectId, sectionId: section.id, actorRole: role })
	const saveEdit = (section: PlanSection) => send({ type: "section/saved", projectId: artifact.projectId, sectionId: section.id, baseVersion: artifact.currentVersion, actorRole: role, ...commandMeta("save", section.id) })
	const regenerate = (section: PlanSection) => {
		send({ type: "section/regeneration-started", projectId: artifact.projectId, sectionId: section.id, baseVersion: artifact.currentVersion, actorRole: role, ...commandMeta("regenerate", section.id) })
		if (generationTimer.current !== null) window.clearTimeout(generationTimer.current)
		generationTimer.current = window.setTimeout(() => send({ type: "section/regeneration-proposed", projectId: artifact.projectId, sectionId: section.id, actorRole: role, body: `${section.body}\n\nUpdated with the current evidence boundary and accountable owner.` }), 240)
	}
	const addComment = (event: FormEvent) => {
		event.preventDefault()
		if (!selected || !comment.trim()) return
		send({ type: "comment/added", projectId: artifact.projectId, sectionId: selected.id, body: comment, actorRole: role, ...commandMeta("comment", selected.id) })
		setComment("")
	}
	const approve = () => send({ type: "artifact/approved", projectId: artifact.projectId, baseVersion: artifact.currentVersion, actorRole: role, ...commandMeta("approve") })

	return <section className="pnw-root" aria-label="Plan artifact workspace">
		<header className="pnw-header">
			<div><small>PLAN</small><strong>{artifact.title}</strong><span>Decision-ready draft</span></div>
			<div className="pnw-header-actions"><label><MagnifyingGlass size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this plan" aria-label="Search this plan" /></label>{artifact.artifactRef ? <button type="button" className="pnw-primary" onClick={() => onSendToExecute(artifact.artifactRef as PlanArtifactRef)}>Send to Execute <ArrowRight size={15} /></button> : <button type="button" className="pnw-primary" disabled={!readiness.ready || readOnly} onClick={approve}>Approve plan</button>}</div>
		</header>
		{persistenceNotice ? <div className="pnw-notice" role="status"><span>{persistenceNotice}</span><button type="button" onClick={dismissPersistenceNotice}>Dismiss</button></div> : null}
		<div className="pnw-body">
			<div className="pnw-title"><div><small>PLAN / VERSION {artifact.currentVersion}</small><h1>{artifact.title}</h1><p>Evidence-backed sequence · {artifact.sources.length} sources · {revision?.sections.length ?? 0} sections</p></div><StatusBadge artifact={artifact} /></div>
			<div className="pnw-layout">
				<aside className="pnw-outline" aria-label="Plan outline"><header><h2>Plan outline</h2><span>{sectionResult.total} sections</span></header><nav>{sectionResult.items.map((section, index) => <button type="button" key={section.id} aria-current={selected?.id === section.id ? "page" : undefined} onClick={() => setSelectedSectionId(section.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{section.title}</strong>{section.status === "approved" ? <Check size={13} /> : null}</button>)}</nav>{sectionResult.omitted ? <p>Showing {sectionResult.mounted} of {sectionResult.total.toLocaleString("en-US")} matching sections.</p> : null}<footer><ShieldCheck size={16} /><span><strong>{readOnly ? "View-only access" : `${project?.role ?? "Viewer"} authority`}</strong><small>Approval is project-scoped and recorded.</small></span></footer></aside>

				<main className="pnw-canvas">{selected ? <ArtifactEditor artifact={artifact} section={selected} role={role} dispatch={send} onStartEdit={startEdit} onSave={saveEdit} onRegenerate={regenerate} commandMeta={commandMeta} /> : <div className="pnw-no-results"><MagnifyingGlass size={24} /><strong>No matching sections</strong><p>Try a different plan search.</p></div>}</main>

				<aside className="pnw-review" aria-label="Approval package"><header><h2>Approval package</h2><button type="button" onClick={() => setCompareOpen((open) => !open)} aria-expanded={compareOpen}><ClockCounterClockwise size={15} />Compare</button></header>{compareOpen ? <RevisionCompare artifact={artifact} role={role} dispatch={send} commandMeta={commandMeta} /> : <><div className="pnw-readiness">{readiness.reasons.length ? readiness.reasons.map((reason) => <p key={reason}><WarningCircle size={14} />{reason}</p>) : <p className="is-ready"><CheckCircle size={14} />All approval checks pass.</p>}</div><dl><div><dt>Accountable owner</dt><dd>{role === "owner" ? "Project owner" : project?.role ?? "Viewer"}</dd></div><div><dt>Discovery package</dt><dd>{artifact.discoveryPackageId ?? "Missing"}</dd></div><div><dt>Source integrity</dt><dd>{artifact.sources.length ? `${artifact.sources.length} linked` : "Blocked"}</dd></div><div><dt>Capacity</dt><dd>10k-user model reviewed</dd></div></dl>{artifact.unresolvedGapIds.length ? <section className="pnw-gap"><small>OPEN EVIDENCE GAP</small>{artifact.unresolvedGapIds.slice(0, 3).map((gap) => <div key={gap}><p>{gap}</p><button type="button" disabled={readOnly} onClick={() => send({ type: "gap/resolved", projectId: artifact.projectId, gapId: gap, actorRole: role, ...commandMeta("resolve-gap", gap) })}>Resolve from source</button></div>)}</section> : <section className="pnw-sources"><small>BOUND SOURCES</small>{artifact.sources.slice(0, 3).map((source) => <p key={source.id}><LinkSimple size={13} /><span><strong>{source.source}</strong><small>{source.evidenceClass} · {source.locator}</small></span></p>)}</section>}</>}
					<form className="pnw-comment" onSubmit={addComment}><label htmlFor="pnw-comment">Review comment</label><textarea id="pnw-comment" value={comment} disabled={readOnly} maxLength={2_000} onChange={(event) => setComment(event.target.value)} placeholder={readOnly ? "View-only access" : "Ask MAX to refine this section…"} rows={2} /><button type="submit" disabled={readOnly || !comment.trim()} aria-label="Add review comment"><PaperPlaneTilt size={15} /></button></form>
				</aside>
			</div>
		</div>
		{artifact.notice ? <div className="pnw-toast" role="alert"><WarningCircle size={15} /><span>{artifact.notice}</span><button type="button" onClick={() => send({ type: "notice/cleared", projectId: artifact.projectId })}><X size={14} aria-label="Dismiss" /></button></div> : null}
	</section>
}

function ArtifactEditor({ artifact, section, role, dispatch, onStartEdit, onSave, onRegenerate, commandMeta }: { artifact: PlanArtifact; section: PlanSection; role: PlanRole; dispatch: (command: PlanCommand) => void; onStartEdit: (section: PlanSection) => void; onSave: (section: PlanSection) => void; onRegenerate: (section: PlanSection) => void; commandMeta: (action: string, sectionId?: string) => { idempotencyKey: string; correlationId: string } }) {
	const editing = Object.prototype.hasOwnProperty.call(artifact.drafts, section.id)
	const readOnly = role === "viewer"
	return <article className="pnw-artifact"><header><div><small>{section.id.toUpperCase()}</small><h2>{section.title}</h2></div><span className={`is-${section.status}`}>{section.status.replace("-", " ")}</span></header>{editing ? <textarea className="pnw-editor" aria-label={`Edit ${section.title}`} value={artifact.drafts[section.id]} maxLength={20_000} autoFocus onChange={(event) => dispatch({ type: "section/draft-changed", projectId: artifact.projectId, sectionId: section.id, value: event.target.value, actorRole: role })} rows={12} /> : <p className="pnw-copy">{section.body}</p>}
		<div className="pnw-artifact-actions">{editing ? <><button type="button" onClick={() => dispatch({ type: "section/edit-cancelled", projectId: artifact.projectId, sectionId: section.id })}>Cancel</button><button type="button" className="is-primary" onClick={() => onSave(section)}>Save section</button></> : <><button type="button" disabled={readOnly} onClick={() => onStartEdit(section)}>Edit section</button><button type="button" disabled={readOnly || section.generation.status === "running"} onClick={() => onRegenerate(section)}>{section.generation.status === "running" ? <><SpinnerGap className="pnw-spin" />Generating…</> : <><MagicWand />Regenerate</>}</button></>}</div>
		{section.generation.status === "failed" ? <section className="pnw-generation is-error"><WarningCircle /><div><strong>Generation stopped</strong><p>{section.generation.error} The current section and draft are unchanged.</p></div><button type="button" onClick={() => onRegenerate(section)}>Retry</button></section> : null}
		{section.generation.status === "proposed" && section.generation.proposedBody ? <section className="pnw-generation"><MagicWand /><div><strong>Proposed revision</strong><p>{section.generation.proposedBody}</p></div><button type="button" onClick={() => dispatch({ type: "section/regeneration-rejected", projectId: artifact.projectId, sectionId: section.id, actorRole: role })}>Reject</button><button type="button" className="is-primary" onClick={() => dispatch({ type: "section/regeneration-accepted", projectId: artifact.projectId, sectionId: section.id, baseVersion: artifact.currentVersion, actorRole: role, ...commandMeta("accept-regeneration", section.id) })}>Accept</button></section> : null}
		<footer><div><small>PROVENANCE</small><strong>{section.provenance === "human" ? "Human-authored" : "MAX-generated"}</strong></div><div><small>SOURCES</small><strong>{section.sourceIds.length} linked</strong></div><div><small>VERSION</small><strong>v{artifact.currentVersion}</strong></div></footer>
	</article>
}

function RevisionCompare({ artifact, role, dispatch, commandMeta }: { artifact: PlanArtifact; role: PlanRole; dispatch: (command: PlanCommand) => void; commandMeta: (action: string, sectionId?: string) => { idempotencyKey: string; correlationId: string } }) {
	const revisions = [...artifact.revisions].sort((left, right) => right.version - left.version)
	return <section className="pnw-history"><header><small>VERSION HISTORY</small><strong>Current v{artifact.currentVersion}</strong></header>{revisions.slice(0, 5).map((revision) => <article key={revision.id}><div><strong>Version {revision.version}</strong><small>{revision.status} · {revision.reason}</small></div>{revision.version !== artifact.currentVersion ? <button type="button" disabled={role === "viewer"} onClick={() => dispatch({ type: "revision/reverted", projectId: artifact.projectId, targetVersion: revision.version, baseVersion: artifact.currentVersion, actorRole: role, ...commandMeta("revert", String(revision.version)) })}><ArrowCounterClockwise size={14} />Revert</button> : <span>Current</span>}</article>)}</section>
}
