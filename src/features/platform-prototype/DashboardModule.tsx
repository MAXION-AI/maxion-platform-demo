import { CaretRight, CheckCircle, Compass, FlowArrow, MagnifyingGlass, Pulse, Stack } from "@phosphor-icons/react"

import { usePlatformDispatch, usePlatformSelector } from "./PlatformDemoProvider"
import type { MaxionModuleId, PortalProject } from "./contracts"
import {
	selectAgentixAttention,
	selectDashboardSummary,
	selectDiscoveryReady,
	selectExecuteVerified,
	selectPlanHandoff,
	selectProjectWorkspace,
} from "./platformState"

type Navigate = (module: MaxionModuleId) => void

type AttentionRow = {
	id: string
	module: MaxionModuleId
	project?: PortalProject
	label: string
	title: string
	detail: string
	tone: "warning" | "brand" | "neutral"
}

export function DashboardModule({ onNavigate, onCommand }: { onNavigate: Navigate; onCommand: () => void }) {
	const dispatch = usePlatformDispatch()
	const summary = usePlatformSelector(selectDashboardSummary)
	const projectWorkspace = usePlatformSelector(selectProjectWorkspace)
	const agentix = usePlatformSelector(selectAgentixAttention)
	const discoveryReady = usePlatformSelector(selectDiscoveryReady)
	const plan = usePlatformSelector(selectPlanHandoff)
	const executeVerified = usePlatformSelector(selectExecuteVerified)
	const dateLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())

	const attentionRows: AttentionRow[] = [
		...(agentix.count > 0 ? [{
			id: "agentix-attention",
			module: "agentix" as const,
			label: "Agentix",
			title: agentix.approval ? "Review the pending effect" : "Agentix needs a bounded decision",
			detail: `${agentix.count} ${agentix.count === 1 ? "item requires" : "items require"} accountable authority`,
			tone: "warning" as const,
		}] : []),
		...summary.projectAttention.map((project) => ({
			id: project.id,
			module: "projects" as const,
			project,
			label: "Project",
			title: `Complete ${project.name}'s operating context`,
			detail: `${project.discovery ? "Discovery linked" : "Discovery not started"} · ${project.plan ? "Plan linked" : "Plan not created"}`,
			tone: project.discovery || project.plan ? "brand" as const : "neutral" as const,
		})),
	].slice(0, 3)

	const outcomes = [
		...(executeVerified ? [{ id: "execute", module: "execute" as const, title: "Release evidence verified", detail: "Execute · development gate verified" }] : []),
		...(plan.sent ? [{ id: "plan", module: "plan" as const, title: "Plan handed to Execute", detail: `Plan · ${plan.snapshot}` }] : []),
		...(discoveryReady ? [{ id: "discovery", module: "discovery" as const, title: "Discovery package verified", detail: "Discover · evidence package ready" }] : []),
		...summary.completedProjects.map((project) => ({ id: project.id, module: "projects" as const, project, title: `${project.name} completed`, detail: `Projects · archived ${project.updated}` })),
	].slice(0, 4)

	const openAttention = (row: AttentionRow) => {
		if (row.project) dispatch({ type: "projects/selected", projectId: row.project.id })
		onNavigate(row.module)
	}
	const openOutcome = (outcome: (typeof outcomes)[number]) => {
		if ("project" in outcome && outcome.project) dispatch({ type: "projects/selected", projectId: outcome.project.id })
		onNavigate(outcome.module)
	}

	return (
		<div className="mxp-dashboard-shell">
			<div className="mxp-dashboard-module-header">
				<div><small>Operating overview</small><strong>Good morning, Root Admin</strong><span>{summary.attentionCount ? `${summary.attentionCount} ${summary.attentionCount === 1 ? "decision needs" : "decisions need"} you` : "No decisions waiting"}</span></div>
				<div>
					<button type="button" className="mxp-dashboard-search" aria-label="Search or ask" onClick={onCommand}><MagnifyingGlass size={16} /><span>Search or ask</span><kbd>⌘K</kbd></button>
					<button type="button" className="mxp-primary" onClick={() => onNavigate("agentix")}><Pulse size={17} />Open Agentix</button>
				</div>
			</div>
			<div className="mxp-portal-page mxp-dashboard-page">
				<div className="mxp-dashboard-intro">
					<small>{dateLabel}</small>
					<h1>Work that moved. Decisions that wait.</h1>
					<p>MAXION keeps each obligation attached to its owner, evidence, and next safe action.</p>
				</div>

				{projectWorkspace.status === "error" ? (
					<section className="mxp-dashboard-recovery" role="alert"><div><strong>Projects summary is unavailable</strong><p>{projectWorkspace.error}</p></div><button type="button" onClick={() => dispatch({ type: "projects/retry-requested" })}>Retry summary</button></section>
				) : (
					<section className={`mxp-dashboard-metrics${projectWorkspace.status === "loading" ? " is-loading" : ""}`} aria-label="Workspace summary" aria-busy={projectWorkspace.status === "loading"}>
						<article><strong>{summary.activeProjects}</strong><small>Active projects</small><span>Durable workspaces</span></article>
						<article><strong>{summary.attentionCount}</strong><small>Need your decision</small><span>{summary.attentionCount ? "Authority is preserved" : "No work blocked"}</span></article>
						<article><strong>{summary.verifiedHandoffs}</strong><small>Verified handoffs</small><span>Only observed module state</span></article>
						<article><strong>{summary.linkedProjects}</strong><small>Context linked</small><span>Discovery and Plan attached</span></article>
					</section>
				)}

				<div className="mxp-dashboard-grid">
					<section className="mxp-dashboard-panel mxp-needs-you" aria-labelledby="mxp-needs-you-title">
						<div className="mxp-dashboard-panel-header"><div><h2 id="mxp-needs-you-title">Needs you</h2><p>Exact decisions, with the work preserved around them.</p></div><span>{attentionRows.length}</span></div>
						{attentionRows.length ? <div>{attentionRows.map((row) => <article key={row.id}><i data-tone={row.tone} aria-hidden="true" /><div><small>{row.label}</small><h3>{row.title}</h3><p>{row.detail}</p></div><button type="button" onClick={() => openAttention(row)}>Review<CaretRight size={14} /></button></article>)}</div> : <div className="mxp-dashboard-empty"><CheckCircle size={24} weight="duotone" /><div><strong>Nothing needs your decision</strong><p>New questions and approvals will stay attached to their work here.</p></div><button type="button" onClick={() => onNavigate("projects")}>Open projects</button></div>}
					</section>

					<section className="mxp-dashboard-panel mxp-recent-outcomes" aria-labelledby="mxp-recent-outcomes-title">
						<div className="mxp-dashboard-panel-header"><div><h2 id="mxp-recent-outcomes-title">Recent outcomes</h2><p>Verified work across MAXION</p></div></div>
						{outcomes.length ? <div>{outcomes.map((outcome) => <button type="button" key={outcome.id} onClick={() => openOutcome(outcome)}><span className="mxp-activity-icon is-success">{outcome.module === "projects" ? <Stack size={16} /> : outcome.module === "discovery" ? <Compass size={16} /> : outcome.module === "plan" ? <FlowArrow size={16} /> : <CheckCircle size={16} />}</span><span><strong>{outcome.title}</strong><small>{outcome.detail}</small></span><CaretRight size={14} /></button>)}</div> : <div className="mxp-dashboard-empty is-compact"><Stack size={22} /><div><strong>No verified outcomes yet</strong><p>Completed, evidenced work will appear here.</p></div><button type="button" onClick={() => onNavigate("discovery")}>Start Discovery</button></div>}
					</section>
				</div>
			</div>
		</div>
	)
}
