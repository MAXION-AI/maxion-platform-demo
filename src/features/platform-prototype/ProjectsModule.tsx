import { Archive, ArrowRight, CaretRight, Compass, FolderPlus, MagnifyingGlass, PaperPlaneTilt, Stack, WarningCircle, X } from "@phosphor-icons/react"
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"

import { usePlatformDispatch, usePlatformSelector } from "./PlatformDemoProvider"
import type { MaxionModuleId, PortalProject } from "./contracts"
import {
	selectProjectAttention,
	selectProjectPortfolio,
	selectProjects,
	selectProjectWorkspace,
	selectSelectedProject,
	type ProjectPortfolioFilter,
} from "./platformState"
import { useDialogFocus } from "./system/useDialogFocus"

type Navigate = (module: MaxionModuleId) => void
type CreateStep = "draft" | "review"

function projectStateLabel(project: PortalProject) {
	const attention = selectProjectAttention(project)
	return attention === "needs-you" ? "Needs you" : attention === "on-track" ? "On track" : attention === "complete" ? "Complete" : "View only"
}

function projectLineage(project: PortalProject) {
	return [project.discovery ? "Discovery linked" : "Discovery not started", project.plan ? "Plan linked" : "Plan not created", project.members[0]?.name ?? project.role].join(" · ")
}

export function ProjectsModule({ onNavigate }: { onNavigate: Navigate }) {
	const dispatch = usePlatformDispatch()
	const projects = usePlatformSelector(selectProjects)
	const workspace = usePlatformSelector(selectProjectWorkspace)
	const selected = usePlatformSelector(selectSelectedProject)
	const [query, setQuery] = useState("")
	const [filter, setFilter] = useState<ProjectPortfolioFilter>("active")
	const [createOpen, setCreateOpen] = useState(false)
	const [createStep, setCreateStep] = useState<CreateStep>("draft")
	const [name, setName] = useState("")
	const [description, setDescription] = useState("")
	const [showDetails, setShowDetails] = useState(false)
	const [composer, setComposer] = useState("")
	const [answer, setAnswer] = useState("")
	const dialogRef = useRef<HTMLElement>(null)
	const rootRef = useRef<HTMLDivElement>(null)
	useDialogFocus(dialogRef, createOpen)

	const result = useMemo(() => selectProjectPortfolio(projects, { query, filter, sort: "updated" }), [filter, projects, query])
	const counts = useMemo(() => ({
		all: projects.length,
		active: projects.filter((project) => project.status === "active").length,
		attention: projects.filter((project) => selectProjectAttention(project) === "needs-you").length,
		archived: projects.filter((project) => project.status === "archived").length,
	}), [projects])

	useEffect(() => {
		if (!createOpen) return
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key !== "Escape") return
			event.preventDefault()
			setCreateOpen(false)
			setCreateStep("draft")
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [createOpen])

	useEffect(() => {
		setShowDetails(false)
		setAnswer("")
	}, [selected?.id])

	const openCreate = () => {
		setCreateStep("draft")
		setCreateOpen(true)
	}
	const closeCreate = () => {
		setCreateOpen(false)
		setCreateStep("draft")
	}
	const reviewDraft = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!name.trim()) return
		setCreateStep("review")
	}
	const createProject = () => {
		const requestId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36)
		dispatch({ type: "projects/created", requestId, name, description })
		setName("")
		setDescription("")
		closeCreate()
	}
	const selectProject = (project: PortalProject) => {
		dispatch({ type: "projects/selected", projectId: project.id })
	}
	const resumeProject = (project: PortalProject, preferred?: "discovery") => {
		if (project.role === "Viewer") {
			dispatch({ type: "projects/action-denied", projectId: project.id, action: preferred ? "Opening Discovery" : "Resuming work" })
			return
		}
		onNavigate(preferred === "discovery" || !project.discovery ? "discovery" : project.plan ? "plan" : "discovery")
	}
	const askMax = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const question = composer.trim()
		if (!selected || !question) return
		setAnswer(`${selected.name} is ${projectStateLabel(selected).toLocaleLowerCase()}. ${projectLineage(selected)}. MAX has kept this answer scoped to the selected project and your current filters.`)
		setComposer("")
	}
	const onRowKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
		const rows = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>(".mxp-project-row-open") ?? [])
		const current = rows.indexOf(event.currentTarget)
		const next = event.key === "ArrowDown" ? Math.min(current + 1, rows.length - 1) : Math.max(current - 1, 0)
		if (next === current) return
		event.preventDefault()
		rows[next]?.focus()
	}
	const clearPortfolio = () => {
		setQuery("")
		setFilter("all")
	}

	return (
		<div className="mxp-projects-shell" ref={rootRef}>
			<header className="mxp-projects-module-header">
				<div><h1>Projects</h1><strong>Work, grouped by outcome</strong><span>{counts.active} active · {counts.attention} need attention</span></div>
				<button type="button" className="mxp-primary" onClick={openCreate}><FolderPlus size={17} />New project</button>
			</header>
			<div className="mxp-portal-page mxp-projects-page">
				<div className="mxp-projects-intro"><small>Project portfolio</small><h2>Resume the work that matters.</h2><p>Search, filter, create, and act on projects without losing their operating context.</p></div>
				<section className="mxp-project-controls" aria-label="Project controls">
					<label><span>Search</span><span className="mxp-project-search-field"><MagnifyingGlass size={16} /><input aria-label="Search projects, owners, or outcomes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, owners, or outcomes" /></span></label>
					<div className="mxp-project-filter-group" role="group" aria-label="Project filters">
						<button type="button" aria-pressed={filter === "all" || filter === "active"} onClick={() => setFilter(filter === "active" ? "all" : "active")}>Active {counts.active}</button>
						<button type="button" className="is-attention" aria-pressed={filter === "attention"} onClick={() => setFilter("attention")}>Needs you {counts.attention}</button>
						<button type="button" aria-pressed={filter === "archived"} onClick={() => setFilter("archived")}>Archived {counts.archived}</button>
					</div>
				</section>

				{workspace.notice ? <div className="mxp-project-notice" role="status"><span>{workspace.notice}</span><button type="button" aria-label="Dismiss project notice" onClick={() => dispatch({ type: "projects/notice-cleared" })}><X size={15} /></button></div> : null}

				<div className="mxp-projects-workspace">
					<section className="mxp-project-list" aria-label="Projects">
						<header><div><h2>{filter === "archived" ? "Archived projects" : filter === "attention" ? "Projects needing you" : "Active projects"}</h2><p>Saved view · Updated just now</p></div><span>{result.total} {result.total === 1 ? "project" : "projects"}</span></header>
						{workspace.status === "loading" ? <div className="mxp-project-loading" role="status" aria-label="Loading projects">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div> : workspace.status === "error" ? <div className="mxp-project-recovery" role="alert"><WarningCircle size={24} /><h3>Projects couldn’t be loaded</h3><p>{workspace.error}</p><button type="button" onClick={() => dispatch({ type: "projects/retry-requested" })}>Retry projects</button></div> : result.items.length ? <div className="mxp-project-rows">{result.items.map((project) => {
							const state = selectProjectAttention(project)
							return <article key={project.id} className={selected?.id === project.id ? "is-selected" : ""}><button type="button" className="mxp-project-row-open" aria-label={`Open ${project.name}, ${projectStateLabel(project)}`} onClick={() => selectProject(project)} onKeyDown={onRowKeyDown}><span><strong>{project.name}</strong><small>{projectLineage(project)}</small></span><i className={`is-${state}`}>{projectStateLabel(project)}</i><span className="mxp-project-row-action">Open<CaretRight size={14} /></span></button></article>
						})}{result.omitted ? <p className="mxp-project-limit" role="status">Showing the first {result.mounted} of {result.total} matching projects. Refine the search to narrow the portfolio.</p> : null}</div> : <div className="mxp-project-recovery is-empty"><Stack size={26} /><h3>{projects.length ? "No projects match this view" : "Create your first project"}</h3><p>{projects.length ? "Your query and filters are preserved. Clear them to return to the last safe portfolio." : "Use New project above to keep module work, evidence, and decisions attached to one outcome."}</p>{projects.length ? <button type="button" onClick={clearPortfolio}>Clear filters</button> : null}</div>}
					</section>

					<aside className="mxp-project-context" aria-label="Selected project context">
						<header><h2>Act on this view</h2><p>MAX keeps selection, filters, and project state in context.</p></header>
						{selected ? <>
							<section className="mxp-selected-project"><span className={`is-${selectProjectAttention(selected)}`}>{projectStateLabel(selected)}</span><h3>{selected.name}</h3><p>{selected.description}</p><small>{selected.role} · {selected.members[0]?.name ?? "Unassigned"} · Updated {selected.updated}</small>{showDetails ? <dl><div><dt>Discovery</dt><dd>{selected.discovery ?? "Not started"}</dd></div><div><dt>Plan</dt><dd>{selected.plan ?? "Not created"}</dd></div><div><dt>Members</dt><dd>{selected.members.length}</dd></div></dl> : null}</section>
							<div className="mxp-project-context-actions"><button type="button" className="mxp-primary" onClick={() => setShowDetails((current) => !current)}>{showDetails ? "Hide details" : "Review details"}</button><button type="button" onClick={() => resumeProject(selected)}>{selected.role === "Viewer" ? "Request resume access" : "Resume project"}<ArrowRight size={14} /></button><button type="button" onClick={() => resumeProject(selected, "discovery")}><Compass size={14} />Open in Discover</button></div>
							<form className="mxp-project-composer" onSubmit={askMax}><label htmlFor="mxp-project-question">Ask about selected project</label><textarea id="mxp-project-question" rows={3} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="What changed since the last decision?" /><button type="submit" className="mxp-primary" disabled={!composer.trim()}>Ask MAX<PaperPlaneTilt size={14} /></button>{answer ? <p role="status">{answer}</p> : null}</form>
							<footer><span>Live context</span><span>{[selected.discovery, selected.plan].filter(Boolean).length + 1} modules</span><button type="button" onClick={() => dispatch({ type: "projects/archive-toggled", projectId: selected.id })}><Archive size={13} />{selected.status === "active" ? "Archive" : "Restore"}</button></footer>
						</> : <div className="mxp-project-context-empty"><Stack size={24} /><strong>Select a project</strong><p>Its state, next safe action, and MAX context will appear here.</p></div>}
					</aside>
				</div>
			</div>

			{createOpen ? <div className="mxp-dialog-layer" onMouseDown={(event) => { if (event.currentTarget === event.target) closeCreate() }}><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="create-project-title" className="mxp-portal-dialog mxp-project-create-dialog"><header><div><span className="mxp-dialog-icon"><FolderPlus size={18} /></span><div><small>Project workspace</small><h2 id="create-project-title">{createStep === "draft" ? "Define the outcome" : "Review new project"}</h2></div></div><button type="button" aria-label="Close create project dialog" onClick={closeCreate}><X size={17} /></button></header>{createStep === "draft" ? <form onSubmit={reviewDraft}><label>Project name<span>{name.length}/80</span><input autoFocus maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Finance controls uplift" /></label><label>Description<span>{description.length}/600</span><textarea maxLength={600} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the outcome, scope, and hard constraints." /></label><p className="mxp-project-create-note">MAXION will inherit workspace membership and keep Discovery, Plan, Execute, and Agentix work attached to this project.</p><div><button type="button" onClick={closeCreate}>Cancel</button><button type="submit" className="mxp-primary" disabled={!name.trim()}>Review project</button></div></form> : <div className="mxp-project-review"><span>Step 2 of 2</span><h3>{name.trim()}</h3><p>{description.trim() || "Outcome and operating context are ready to define with MAX."}</p><dl><div><dt>Owner</dt><dd>Root Admin</dd></div><div><dt>Status</dt><dd>Active</dd></div><div><dt>External effects</dt><dd>None</dd></div></dl><footer><button type="button" onClick={() => setCreateStep("draft")}>Back</button><button type="button" className="mxp-primary" onClick={createProject}>Create project</button></footer></div>}</section></div> : null}
		</div>
	)
}
