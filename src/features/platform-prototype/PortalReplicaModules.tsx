import {
	Activity,
	Archive,
	ArrowLeft,
	ArrowRight,
	ArrowsDownUp,
	BellRinging,
	CaretRight,
	ChartBar,
	Check,
	CheckCircle,
	Clock,
	Code,
	Compass,
	Cube,
	Database,
	DotsThree,
	FileText,
	FlowArrow,
	FolderPlus,
	GearSix,
	GridFour,
	Info,
	List,
	MagnifyingGlass,
	PaperPlaneTilt,
	Plug,
	Plus,
	Question,
	ShieldCheck,
	PencilSimpleLine,
	Pulse,
	Stack,
	TerminalWindow,
	Users,
	WarningCircle,
	X,
} from "@phosphor-icons/react"
import { motion, useReducedMotion } from "motion/react"
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"

import { MaxionSpiralMark, PRIMARY_NAVIGATION } from "./PortalChrome"
import { EXECUTE_TASKS, type ExecuteLaunchIntent, type MaxionModuleId, type PortalProject } from "./model"

type Navigate = (module: MaxionModuleId) => void

function PortalPageHeader({
	eyebrow,
	title,
	description,
	actions,
}: {
	eyebrow: string
	title: string
	description: string
	actions?: ReactNode
}) {
	return (
		<header className="mxp-portal-page-header">
			<div>
				<span>{eyebrow}</span>
				<h1>{title}</h1>
				<p>{description}</p>
			</div>
			{actions ? <div className="mxp-portal-page-actions">{actions}</div> : null}
		</header>
	)
}

function PortalStat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
	return (
		<article className="mxp-portal-stat">
			<span>{icon}</span>
			<div><small>{label}</small><strong>{value}</strong><p>{hint}</p></div>
		</article>
	)
}

export function DashboardModule({
	projects,
	onNavigate,
	discoveryReady,
	planSent,
	executeVerified,
}: {
	projects: PortalProject[]
	onNavigate: Navigate
	discoveryReady: boolean
	planSent: boolean
	executeVerified: boolean
}) {
	const prefersReducedMotion = useReducedMotion()
	const activeProjects = projects.filter((project) => project.status === "active")
	const dateLabel = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date())
	const activities = [
		{
			module: "discovery" as const,
			icon: Compass,
			title: discoveryReady ? "TPRM decision package generated" : "TPRM owner interview is active",
			detail: discoveryReady ? "5 deliverables · evidence lineage verified" : "One authority boundary needs review",
			time: "8m",
			tone: discoveryReady ? "success" : "attention",
		},
		{
			module: "plan" as const,
			icon: FlowArrow,
			title: planSent ? "ERP modernization plan sent to Execute" : "ERP modernization plan updated",
			detail: "5 flows · 17 build packages · v12",
			time: "24m",
			tone: "info",
		},
		{
			module: "execute" as const,
			icon: Cube,
			title: executeVerified ? "Mission authority engagement verified" : "Mission authority implementation progressing",
			detail: executeVerified ? "48 tests passed · release gate clean" : "5 isolated workspaces · no blockers",
			time: "41m",
			tone: executeVerified ? "success" : "live",
		},
		{
			module: "agentix" as const,
			icon: Pulse,
			title: "July close agent needs one exact approval",
			detail: "164 validated effects · QuickBooks and SAP",
			time: "1h",
			tone: "attention",
		},
	]

	return (
		<div className="mxp-portal-page mxp-dashboard-page">
			<motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.32 }}>
				<section className="mxp-dashboard-welcome">
					<p>{dateLabel}</p>
					<h1>Good afternoon, Root Admin</h1>
					<span>You have {activeProjects.length} active projects and 2 discoveries in progress.</span>
					<div>
						<button type="button" onClick={() => onNavigate("projects")}><Stack size={16} />New Project</button>
						<button type="button" onClick={() => onNavigate("discovery")}><Compass size={16} />Start Discovery</button>
						<button type="button" onClick={() => onNavigate("plan")}><FlowArrow size={16} />Create Plan</button>
						<button type="button" onClick={() => onNavigate("execute")}><Cube size={16} />Open Execute</button>
						<button type="button" onClick={() => onNavigate("consult")}><MaxionSpiralMark variant="current" className="mxp-inline-spiral" />Ask Max</button>
					</div>
				</section>
			</motion.div>

			<section className="mxp-portal-stats" aria-label="Workspace summary">
				<PortalStat icon={<Stack size={18} />} label="Active projects" value={String(activeProjects.length)} hint="Across this workspace" />
				<PortalStat icon={<Compass size={18} />} label="Active discoveries" value="2" hint="One needs your input" />
				<PortalStat icon={<FlowArrow size={18} />} label="Plans created" value="6" hint="Two ready for execution" />
				<PortalStat icon={<ChartBar size={18} />} label="Workspace units" value="38%" hint="62% remains this cycle" />
			</section>

			<div className="mxp-dashboard-grid">
				<div className="mxp-dashboard-main-column">
					<section className="mxp-portal-card mxp-activity-card">
						<header><div><h2>Workspace activity</h2><p>Current work across MAXION</p></div><button type="button">View all</button></header>
						<div>
							{activities.map((item) => {
								const Icon = item.icon
								return (
									<button type="button" key={item.title} onClick={() => onNavigate(item.module)}>
										<span className={`mxp-activity-icon is-${item.tone}`}><Icon size={16} weight="duotone" /></span>
										<span><strong>{item.title}</strong><small>{item.detail}</small></span>
										<time>{item.time}</time><CaretRight size={14} />
									</button>
								)
							})}
						</div>
					</section>

					<section className="mxp-portal-card mxp-dashboard-projects">
						<header><div><h2>Projects</h2><p>Recently active workspaces</p></div><button type="button" onClick={() => onNavigate("projects")}>View projects</button></header>
						<div>
							{activeProjects.slice(0, 3).map((project) => (
								<button type="button" key={project.id} onClick={() => onNavigate("projects")}>
									<span className="mxp-project-glyph"><Stack size={16} weight="duotone" /></span>
									<span><strong>{project.name}</strong><small>{project.description}</small></span>
									<div className="mxp-avatar-stack">{project.members.slice(0, 3).map((member) => <i key={member.name} title={member.name}>{member.initials}</i>)}</div>
									<time>{project.updated}</time>
								</button>
							))}
						</div>
					</section>
				</div>

				<aside className="mxp-dashboard-side-column">
					<section className="mxp-portal-card mxp-quick-nav">
						<header><h2>Quick navigation</h2></header>
						<div>
							{PRIMARY_NAVIGATION.filter((item) => item.id !== "dashboard" && item.id !== "agentix").map((item) => {
								const Icon = item.icon
								return <button type="button" key={item.id} onClick={() => onNavigate(item.id)}>{item.spiral ? <MaxionSpiralMark className="mxp-quick-icon" /> : Icon ? <Icon className="mxp-quick-icon" weight="duotone" /> : null}<span><strong>{item.label}</strong><small>{item.id === "projects" ? "Manage projects and members" : item.id === "discovery" ? "Run autonomous discovery work" : item.id === "plan" ? "Create and refine delivery plans" : item.id === "execute" ? "Run governed development workspaces" : "Work with MAX across the platform"}</small></span><CaretRight size={13} /></button>
							})}
						</div>
					</section>
					<section className="mxp-portal-card mxp-connected-context">
						<Plug size={18} weight="duotone" /><div><strong>6 systems connected</strong><small>Salesforce, Jira, SharePoint, SAP and more</small></div><button type="button" onClick={() => onNavigate("integrations")}>Manage</button>
					</section>
				</aside>
			</div>
		</div>
	)
}

type ProjectDetailsTab = "overview" | "team" | "activity" | "settings"

export function ProjectsModule({
	projects,
	onProjectsChange,
	onNavigate,
}: {
	projects: PortalProject[]
	onProjectsChange: (projects: PortalProject[]) => void
	onNavigate: Navigate
}) {
	const [query, setQuery] = useState("")
	const [sort, setSort] = useState<"updated" | "name">("updated")
	const [view, setView] = useState<"grid" | "list">("grid")
	const [showArchived, setShowArchived] = useState(false)
	const [createOpen, setCreateOpen] = useState(false)
	const [newName, setNewName] = useState("")
	const [newDescription, setNewDescription] = useState("")
	const [selected, setSelected] = useState<PortalProject | null>(null)
	const [detailsTab, setDetailsTab] = useState<ProjectDetailsTab>("overview")
	const [announcement, setAnnouncement] = useState("")
	const visible = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		return [...projects]
			.filter((project) => (showArchived || project.status === "active") && (!normalized || `${project.name} ${project.description}`.toLowerCase().includes(normalized)))
			.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : projects.indexOf(a) - projects.indexOf(b))
	}, [projects, query, showArchived, sort])

	const createProject = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const name = newName.trim()
		if (!name) return
		const project: PortalProject = {
			id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`,
			name,
			description: newDescription.trim() || "New MAXION project workspace.",
			status: "active",
			role: "Owner",
			updated: "Just now",
			members: [{ initials: "RA", name: "Root Admin" }],
		}
		onProjectsChange([project, ...projects])
		setNewName("")
		setNewDescription("")
		setCreateOpen(false)
		setAnnouncement(`${name} created.`)
	}

	const toggleArchive = (project: PortalProject) => {
		const nextStatus: PortalProject["status"] = project.status === "active" ? "archived" : "active"
		const next: PortalProject[] = projects.map((item) => item.id === project.id ? { ...item, status: nextStatus } : item)
		onProjectsChange(next)
		setSelected((current) => current?.id === project.id ? { ...project, status: nextStatus } : current)
		setAnnouncement(`${project.name} ${nextStatus === "archived" ? "archived" : "restored"}.`)
	}

	return (
		<div className="mxp-portal-page mxp-projects-page">
			<div className="mxp-breadcrumb"><button type="button" onClick={() => onNavigate("dashboard")}>Home</button><CaretRight size={12} /><span>Projects</span></div>
			<PortalPageHeader
				eyebrow="Workspace"
				title="Projects"
				description={`${projects.filter((project) => project.status === "active").length} active projects · ${projects.filter((project) => project.status === "archived").length} archived`}
				actions={<button type="button" className="mxp-primary" onClick={() => setCreateOpen(true)}><Plus size={16} />Create Project</button>}
			/>
			<div className="mxp-project-toolbar">
				<label><MagnifyingGlass size={16} /><span className="sr-only">Search projects</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects by name or description" /></label>
				<label className="mxp-project-sort"><ArrowsDownUp size={15} /><span className="sr-only">Sort projects</span><select value={sort} onChange={(event) => setSort(event.target.value as "updated" | "name")}><option value="updated">Recently updated</option><option value="name">Name</option></select></label>
				<label className="mxp-archive-toggle"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />Show archived</label>
				<div className="mxp-view-switcher" role="group" aria-label="Project view"><button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}><GridFour size={16} /><span className="sr-only">Grid view</span></button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={16} /><span className="sr-only">List view</span></button></div>
			</div>
			<div aria-live="polite" className="sr-only">{announcement}</div>
			{visible.length ? (
				<section className={`mxp-project-collection is-${view}`} aria-label="Projects">
					{visible.map((project) => (
						<article key={project.id} className={project.status === "archived" ? "is-archived" : ""}>
							<button type="button" className="mxp-project-open" onClick={() => { setSelected(project); setDetailsTab("overview") }}>
								<span className="mxp-project-card-icon"><Stack size={19} weight="duotone" /></span>
								<span className="mxp-project-copy"><span><strong>{project.name}</strong><i className={`mxp-project-status is-${project.status}`}>{project.status}</i></span><p>{project.description}</p><small>{project.role} · Updated {project.updated}</small></span>
								<span className="mxp-avatar-stack">{project.members.slice(0, 3).map((member) => <i key={member.name} title={member.name}>{member.initials}</i>)}</span>
							</button>
							<footer><span>{project.plan ? <><FlowArrow size={13} />Plan linked</> : <><Info size={13} />No plan</>}</span><span>{project.discovery ? <><Compass size={13} />Discovery linked</> : <><Info size={13} />No discovery</>}</span><button type="button" aria-label={`${project.status === "active" ? "Archive" : "Restore"} ${project.name}`} onClick={() => toggleArchive(project)}><Archive size={14} />{project.status === "active" ? "Archive" : "Restore"}</button></footer>
						</article>
					))}
				</section>
			) : (
				<section className="mxp-projects-empty"><Stack size={28} weight="duotone" /><h2>No matching projects</h2><p>Clear the search or include archived workspaces.</p><button type="button" onClick={() => { setQuery(""); setShowArchived(true) }}>Show all projects</button></section>
			)}

			{createOpen ? (
				<div className="mxp-dialog-layer" onMouseDown={(event) => { if (event.currentTarget === event.target) setCreateOpen(false) }}>
					<section role="dialog" aria-modal="true" aria-labelledby="create-project-title" className="mxp-portal-dialog">
						<header><div><span className="mxp-dialog-icon"><FolderPlus size={18} /></span><div><small>Workspace</small><h2 id="create-project-title">Create new project</h2></div></div><button type="button" aria-label="Close create project dialog" onClick={() => setCreateOpen(false)}><X size={17} /></button></header>
						<form onSubmit={createProject}><label>Project name<span>{newName.length}/80</span><input autoFocus maxLength={80} required value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g., Finance operating model" /></label><label>Description<textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} rows={3} placeholder="Describe the scope, stakeholders, or desired outcome." /></label><div><button type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="mxp-primary" disabled={!newName.trim()}>Create Project</button></div></form>
					</section>
				</div>
			) : null}

			{selected ? (
				<><button type="button" className="mxp-panel-scrim" aria-label="Close project details" onClick={() => setSelected(null)} /><aside className="mxp-project-panel" aria-label={`${selected.name} project details`}><header><div><span className="mxp-project-card-icon"><Stack size={19} /></span><div><small>Project</small><h2>{selected.name}</h2></div></div><button type="button" aria-label="Close project details" onClick={() => setSelected(null)}><X size={17} /></button></header><nav aria-label="Project details sections">{(["overview", "team", "activity", "settings"] as const).map((tab) => <button key={tab} type="button" className={detailsTab === tab ? "is-active" : ""} onClick={() => setDetailsTab(tab)}>{tab}</button>)}</nav><div className="mxp-project-panel-body">{detailsTab === "overview" ? <><p>{selected.description}</p><dl><div><dt>Status</dt><dd>{selected.status}</dd></div><div><dt>Your role</dt><dd>{selected.role}</dd></div><div><dt>Plan</dt><dd>{selected.plan || "Not created"}</dd></div><div><dt>Discovery</dt><dd>{selected.discovery || "Not started"}</dd></div></dl><div className="mxp-project-panel-actions"><button type="button" onClick={() => onNavigate("discovery")}><Compass size={15} />{selected.discovery ? "Open Discovery" : "Start Discovery"}</button><button type="button" onClick={() => onNavigate("plan")}><FlowArrow size={15} />{selected.plan ? "Open Plan" : "Create Plan"}</button></div></> : detailsTab === "team" ? <div className="mxp-team-list">{selected.members.map((member, index) => <div key={member.name}><span>{member.initials}</span><strong>{member.name}</strong><small>{index === 0 ? "Owner" : "Member"}</small></div>)}<button type="button"><Users size={15} />Add member</button></div> : detailsTab === "activity" ? <div className="mxp-project-activity"><p><CheckCircle size={15} />Plan evidence snapshot updated<time>12 minutes ago</time></p><p><Compass size={15} />Discovery interview completed<time>Yesterday</time></p><p><Users size={15} />Sarah Liu joined the project<time>4 days ago</time></p></div> : <div className="mxp-project-settings"><label>Project name<input value={selected.name} readOnly /></label><button type="button" onClick={() => toggleArchive(selected)}><Archive size={15} />{selected.status === "active" ? "Archive project" : "Restore project"}</button></div>}</div></aside></>
			) : null}
		</div>
	)
}

const PLAN_LIBRARY = [
	{ id: "erp", name: "ERP modernization delivery plan", project: "ERP modernization", status: "active", detail: "5 flows · 17 build packages", updated: "12 minutes ago" },
	{ id: "northbridge", name: "NorthBridge 100-day plan", project: "NorthBridge acquisition", status: "generated", detail: "Investment committee package ready", updated: "Yesterday" },
	{ id: "customer", name: "Customer data foundation", project: "Customer 360", status: "active", detail: "11 outcomes · 38 delivery items", updated: "4 days ago" },
	{ id: "pricing", name: "Pricing transformation roadmap", project: "Pricing transformation", status: "completed", detail: "Fully delivered", updated: "Jun 18" },
] as const

export function PlanLibraryModule({ projects, onOpenPlan, onStartPlan, onNavigate }: { projects: PortalProject[]; onOpenPlan: () => void; onStartPlan: () => void; onNavigate: Navigate }) {
	const [tab, setTab] = useState<"all" | "active" | "generated" | "completed">("all")
	const [createOpen, setCreateOpen] = useState(false)
	const [projectId, setProjectId] = useState(projects.find((project) => project.status === "active")?.id ?? "")
	const [objective, setObjective] = useState("")
	const [source, setSource] = useState<"discovery" | "documents" | "integrations" | "project" | "manual">("discovery")
	const filtered = PLAN_LIBRARY.filter((plan) => tab === "all" || plan.status === tab)
	const startPlan = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!projectId || (source === "manual" && !objective.trim())) return
		setCreateOpen(false)
		onStartPlan()
	}
	const planSources = [
		{ id: "discovery", label: "Verified Discovery", detail: "Recommended · 124 claims ready", icon: Compass },
		{ id: "documents", label: "Documents", detail: "Upload briefs, specs, or policies", icon: FileText },
		{ id: "integrations", label: "Connected systems", detail: "Jira, ServiceNow, SharePoint", icon: Plug },
		{ id: "project", label: "Project context", detail: "Use goals, members, and activity", icon: Stack },
		{ id: "manual", label: "Describe it", detail: "Start from a short objective", icon: PencilSimpleLine },
	] as const
	return (
		<div className="mxp-portal-page mxp-plan-library">
			<PortalPageHeader eyebrow="Plan" title="From evidence to implementation-ready" description="Give MAX a goal or verified context. It decomposes the work, draws every architecture flow, challenges the guidance, and returns only when your decision is needed." actions={<><button type="button" onClick={() => onNavigate("projects")}><FolderPlus size={16} />Create Project</button><button type="button" className="mxp-primary" onClick={() => setCreateOpen(true)}><Plus size={16} />Create Plan</button></>} />
			<section className="mxp-portal-stats" aria-label="Plan summary"><PortalStat icon={<FlowArrow size={18} />} label="Total plans" value="4" hint="Across all projects" /><PortalStat icon={<Activity size={18} />} label="Autonomous runs" value="2" hint="MAX is working" /><PortalStat icon={<ShieldCheck size={18} />} label="Needs your input" value="1" hint="One exact decision" /><PortalStat icon={<CheckCircle size={18} />} label="Execute-ready" value="2" hint="L3 and L4 complete" /></section>
			<section className="mxp-plan-resume"><span><MaxionSpiralMark className="mxp-plan-resume-spiral" /><div><small>MAX finished this run</small><strong>ERP modernization delivery plan</strong><p>Five implementation flows are decomposed through L2–L4 and critic-checked. The implementation boundary is ready for your approval.</p></div></span><button type="button" onClick={onOpenPlan}>Resume plan<ArrowRight size={14} /></button></section>
			<section className="mxp-portal-card mxp-plan-list-card"><header><div><h2>Plans</h2><p>Current plans across your projects</p></div></header><nav role="tablist" aria-label="Plan status">{(["all", "active", "generated", "completed"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)} <span>{value === "all" ? PLAN_LIBRARY.length : PLAN_LIBRARY.filter((plan) => plan.status === value).length}</span></button>)}</nav><div>{filtered.map((plan) => <button type="button" key={plan.id} onClick={onOpenPlan}><span className="mxp-plan-item-icon"><FlowArrow size={17} weight="duotone" /></span><span><strong>{plan.name}</strong><small>{plan.project} · {plan.detail}</small></span>{plan.status !== "active" ? <i className={`is-${plan.status}`}>{plan.status}</i> : null}<time>{plan.updated}</time><CaretRight size={14} /></button>)}</div></section>
			{createOpen ? (
				<div className="mxp-dialog-layer" onMouseDown={(event) => { if (event.currentTarget === event.target) setCreateOpen(false) }}>
					<section role="dialog" aria-modal="true" aria-labelledby="create-plan-title" className="mxp-portal-dialog mxp-plan-create-dialog">
						<header className="mxp-plan-create-header">
							<div><span className="mxp-dialog-icon"><MaxionSpiralMark variant="current" className="mxp-dialog-mark" /></span><div><small>Autonomous plan</small><h2 id="create-plan-title">Start a plan with MAX</h2><p>Choose the strongest context. MAX builds the implementation map from there.</p></div></div>
							<button type="button" aria-label="Close create plan dialog" onClick={() => setCreateOpen(false)}><X size={17} /></button>
						</header>
						<form onSubmit={startPlan}>
							<label className="mxp-plan-project-field">Project<select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>{projects.filter((project) => project.status === "active" && project.role !== "Viewer").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
							<fieldset className="mxp-plan-source-picker">
								<legend>Starting context</legend><p className="mxp-plan-source-description">MAX uses the strongest available source. Add more only when it changes the implementation boundary.</p>
								<div className="mxp-plan-source-options">
									{planSources.map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" aria-pressed={source === id} onClick={() => setSource(id)}><span className="mxp-plan-source-icon"><Icon size={16} /></span><span className="mxp-plan-source-copy"><strong>{label}</strong><small>{detail}</small></span>{source === id ? <CheckCircle className="mxp-plan-source-check" size={16} weight="fill" /> : <span className="mxp-plan-source-empty" aria-hidden="true" />}</button>)}
								</div>
							</fieldset>
							<label className="mxp-plan-steering-field">{source === "manual" ? "What should this plan accomplish?" : "Add a constraint (optional)"}<textarea autoFocus={source === "manual"} value={objective} onChange={(event) => setObjective(event.target.value)} rows={2} placeholder={source === "manual" ? "Describe the outcome and any hard constraints." : "For example: protect the October cutover, use the approved vendors, or make the architecture decision by Friday."} required={source === "manual"} /></label>
							<section className="mxp-plan-launch-summary" aria-label="What MAX will deliver"><div><MaxionSpiralMark /><span><small>MAX will deliver</small><strong>Implementation-ready guidance</strong></span></div><ul><li>Flows decomposed through L2–L4</li><li>Architecture diagrams for each flow</li><li>Owner-routed decisions and approvals</li></ul></section>
							<footer className="mxp-plan-create-actions"><p><ShieldCheck size={14} />Project membership, evidence policy, cost limits, and approvals are inherited.</p><div><button type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="mxp-primary" disabled={!projectId || (source === "manual" && !objective.trim())}>Start autonomous plan<ArrowRight size={14} /></button></div></footer>
						</form>
					</section>
				</div>
			) : null}
		</div>
	)
}

export function ExecuteHubModule({
	onOpenRun,
	onNavigate,
	planHandoff,
	planSnapshot,
	active,
	focusSignal,
	intent,
	onIntentConsumed,
	engagementState,
}: {
	onOpenRun: (intent: ExecuteLaunchIntent) => void
	onNavigate: Navigate
	planHandoff: boolean
	planSnapshot: string
	active: boolean
	focusSignal: number
	intent: "handoff" | "approvals" | null
	onIntentConsumed: () => void
	engagementState: "idle" | "running" | "verified"
}) {
	const prefersReducedMotion = useReducedMotion()
	const [view, setView] = useState<"engagements" | "approvals">("engagements")
	const [approved, setApproved] = useState(false)
	const [scopeOpen, setScopeOpen] = useState(false)
	const [handoffFresh, setHandoffFresh] = useState(false)
	const [source, setSource] = useState<"prompt" | "plan">(planHandoff ? "plan" : "prompt")
	const [prompt, setPrompt] = useState("")
	const [selectedPlanId, setSelectedPlanId] = useState("erp")
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const handoffChipRef = useRef<HTMLButtonElement>(null)

	// The Execute stage mounts hidden behind the shell, so an autoFocus on the composer
	// fires while it is invisible and is lost — focus when the stage actually becomes visible.
	useEffect(() => {
		if (!active || view !== "engagements" || source !== "prompt") return
		if (!composerRef.current?.offsetParent) return
		composerRef.current.focus()
		// Only stage visibility re-triggers the landing focus; view/source are entry-time guards.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active])

	// '/' or N anywhere in the hub returns the user to a fresh, focused composer.
	useEffect(() => {
		if (!focusSignal) return
		setView("engagements")
		setSource("prompt")
		window.setTimeout(() => composerRef.current?.focus(), 0)
	}, [focusSignal])

	// One-shot routing intents from the module shell: a workspace surface routing to
	// approvals, or a fresh "Send to Execute" landing acknowledged — banner up, plan
	// source preselected, and the handoff chip holding focus. Consumed immediately so
	// hub remounts never replay a stale intent.
	useEffect(() => {
		if (!intent) return
		if (intent === "approvals") {
			setView("approvals")
		} else {
			setView("engagements")
			setSource("plan")
			setSelectedPlanId("erp")
			setHandoffFresh(true)
			window.setTimeout(() => handoffChipRef.current?.focus(), 40)
		}
		onIntentConsumed()
		// Consumption callback is a stable-enough shell setter; only the intent drives this.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [intent])
	const availablePlans = PLAN_LIBRARY.filter((plan) => plan.status !== "completed")
	const selectedPlan = availablePlans.find((plan) => plan.id === selectedPlanId) ?? availablePlans[0]
	// The flagship engagement reflects the real lifted run state — no hardcoded progress.
	const activeRuns = [
		{
			name: "ERP modernization delivery",
			detail: engagementState === "verified" ? "Verified · evidence ready" : engagementState === "running" ? "Implementing and verifying" : "Ready to start",
			status: engagementState === "idle" ? "ready" : engagementState,
			autoStart: engagementState === "running",
			brief: "Implement the approved ERP modernization outcomes with tenant-safe authority boundaries.",
		},
		{ name: "Customer data foundation", detail: "Workspace ready", status: "ready", autoStart: false, brief: "Deliver the approved customer data foundation and verify every integration boundary." },
	]

	const launchEngagement = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (source === "prompt" && !prompt.trim()) return
		if (source === "plan" && !selectedPlan) return
		onOpenRun({
			source,
			title: source === "plan" ? (selectedPlan.id === "erp" ? "ERP modernization delivery" : selectedPlan.name) : "Autonomous delivery engagement",
			brief: source === "plan" ? `${selectedPlan.name} · ${selectedPlan.detail}` : prompt.trim(),
			autoStart: true,
		})
	}

	const openPlanHandoff = () => onOpenRun({
		source: "plan",
		title: "ERP modernization delivery",
		brief: "ERP modernization delivery plan · 5 flows · 17 evidence-linked build packages",
		autoStart: false,
	})

	return (
		<div className="aex-app aex-app--home">
			<aside className="aex-rail" aria-label="Execute tasks">
				<header>
					<button type="button" className="aex-brand" aria-label="Return to MAXION" onClick={() => onNavigate("dashboard")}>
						<MaxionSpiralMark className="aex-brand-mark" />
						<span><strong>Execute</strong><small>MAXION</small></span>
					</button>
					<button type="button" className="aex-new-task" onClick={() => { setView("engagements"); setSource("prompt"); window.setTimeout(() => composerRef.current?.focus(), 0) }}><Plus size={15} />New task<kbd>N</kbd></button>
				</header>
				<nav aria-label="Recent Execute tasks">
					<span>In progress</span>
					{activeRuns.map((run) => <button type="button" key={run.name} onClick={() => onOpenRun({ source: "plan", title: run.name, brief: run.brief, autoStart: run.autoStart })}><i className={`is-${run.status}`} /><span><strong>{run.name}</strong><small>{run.detail}</small></span></button>)}
					<span>Needs you</span>
					<button type="button" className="is-attention" onClick={() => setView("approvals")}><ShieldCheck size={15} /><span><strong>{approved ? "No decisions waiting" : "Approve workspace boundary"}</strong><small>{approved ? "MAX is continuing" : "Exact repository authority"}</small></span>{approved ? <Check size={13} /> : <b>1</b>}</button>
					<span>Completed</span>
					<div className="aex-rail-static"><CheckCircle size={15} /><span><strong>Auth policy hardening</strong><small>Verified yesterday</small></span></div>
				</nav>
				<footer><span><i />max-ai-platform</span><small>main · local workspace</small></footer>
			</aside>

			<main className="aex-home-main">
				<header className="aex-home-bar">
					<button type="button" className="aex-mobile-brand" aria-label="Return to MAXION" onClick={() => onNavigate("dashboard")}><MaxionSpiralMark className="aex-brand-mark" /><span>Execute</span></button>
					<div><button type="button" onClick={() => onNavigate("integrations")}><Plug size={15} />Tools</button><button type="button" aria-label="Open Execute notifications" onClick={() => setView("approvals")}><BellRinging size={16} /></button><button type="button" onClick={() => setView("approvals")}><ShieldCheck size={15} />{approved ? "Clear" : "1 decision"}</button></div>
				</header>
				<div className="aex-mobile-switcher" aria-label="Execute shortcuts"><button type="button" onClick={() => setView("engagements")}>New task</button><button type="button" onClick={() => setView("approvals")}>{approved ? "No decisions" : "Decision needed"}</button></div>

				{view === "engagements" ? (
					<motion.section className="aex-home-focus" aria-label="What should MAX deliver?" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32, ease: [0.16, 1, 0.3, 1] }}>
						{handoffFresh ? <motion.div className="aex-handoff-banner" role="status" initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, ease: [0.16, 1, 0.3, 1] }}><CheckCircle size={15} weight="fill" /><span><strong>Plan handoff received</strong><small>ERP modernization delivery plan · evidence snapshot {planSnapshot} · scope preselected below</small></span></motion.div> : null}
						<div className="aex-home-title"><MaxionSpiralMark className="aex-home-mark" /><span>Autonomous engineering</span><h1>What do you want built?</h1><p>Describe the outcome. MAX will inspect the repository, plan the work, create isolated workspaces, implement, test, repair, and return with evidence.</p></div>
						<form className="aex-prompt" onSubmit={launchEngagement}>
							{source === "prompt" ? <textarea ref={composerRef} aria-label="What should Execute deliver?" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} placeholder="Build the approved mission-authority boundary, preserve the public API, and return when the release gate is clean." /> : <fieldset className="aex-plan-picker"><legend>Choose an approved Plan</legend>{availablePlans.map((plan) => <button key={plan.id} type="button" aria-pressed={selectedPlanId === plan.id} onClick={() => setSelectedPlanId(plan.id)}><FlowArrow size={15} /><span><strong>{plan.name}</strong><small>{plan.project} · {plan.detail}</small></span>{selectedPlanId === plan.id ? <Check size={14} /> : null}</button>)}</fieldset>}
							<footer>
								<div className="aex-prompt-tools" role="group" aria-label="Engagement source"><button type="button" aria-pressed={source === "prompt"} onClick={() => { setSource("prompt"); window.setTimeout(() => composerRef.current?.focus(), 0) }}><PencilSimpleLine size={15} />Prompt</button><button type="button" aria-pressed={source === "plan"} onClick={() => setSource("plan")}><FlowArrow size={15} />Import from Plan</button><span><Code size={14} />max-ai-platform</span></div>
								<button type="submit" className="aex-send" aria-label="Start engagement" disabled={source === "prompt" ? !prompt.trim() : !selectedPlan}><ArrowRight size={17} /></button>
							</footer>
						</form>
						<div className="aex-autonomy-line"><span><ShieldCheck size={14} />Bounded authority</span><span><TerminalWindow size={14} />Live tool trace</span><span><CheckCircle size={14} />Self-repairing verification</span></div>
						{planHandoff ? <button type="button" ref={handoffChipRef} className={`aex-plan-handoff${handoffFresh ? " is-fresh" : ""}`} onClick={openPlanHandoff}><FlowArrow size={15} /><span><strong>Plan handoff attached</strong><small>ERP modernization · 5 flows · 17 packages · evidence snapshot {planSnapshot}</small></span><b>Inspect</b><ArrowRight size={14} /></button> : null}
					</motion.section>
				) : (
					<motion.section className="aex-approval" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28, ease: [0.16, 1, 0.3, 1] }}>
						<button type="button" className="aex-back" onClick={() => setView("engagements")}><ArrowLeft size={14} />Back to Execute</button>
						<div className="aex-approval-heading"><span><ShieldCheck size={18} /></span><small>Authority boundary</small><h1>{approved ? "All caught up" : "One decision needs you"}</h1><p>{approved ? "MAX can continue without your input." : "MAX prepared the workspace topology. Approve the exact repository boundary so it can continue autonomously."}</p></div>
						{approved ? <div className="aex-approval-clear"><CheckCircle size={22} />No pending approvals</div> : <article><header><span>Repository authority</span><strong>ERP modernization delivery</strong></header><dl><div><dt>Repository</dt><dd>max-ai-platform</dd></div><div><dt>Workspaces</dt><dd>5 isolated</dd></div><div><dt>Allowed effect</dt><dd>Files, terminal, tests</dd></div><div><dt>Deployment</dt><dd>Not granted</dd></div></dl>{scopeOpen ? <div className="aex-scope-detail"><span>Exact workspace binding</span>{EXECUTE_TASKS.map((task, index) => <div key={task.id}><code>execute/erp/{task.id}</code><small>Workspace {String(index + 1).padStart(2, "0")} · {task.title} · {task.files} allowed paths</small></div>)}</div> : null}<footer><button type="button" aria-expanded={scopeOpen} onClick={() => setScopeOpen((open) => !open)}>{scopeOpen ? "Hide scope" : "Inspect scope"}</button><button type="button" className="aex-approve" onClick={() => setApproved(true)}>Approve binding<ArrowRight size={14} /></button></footer></article>}
					</motion.section>
				)}
			</main>
		</div>
	)
}

function StatusSummary({ approved }: { approved: boolean }) {
	return <span className={`mxp-status-summary${approved ? " is-clear" : ""}`}><i />{approved ? "No pending approvals" : "1 pending approval"}</span>
}

type IntegrationRecord = {
	id: string
	name: string
	category: "CRM" | "File storage" | "Ticketing" | "HRIS" | "ERP"
	provider: "Nango" | "Merge Unified API" | "Native"
	account: string
	connected: boolean
	health: "Healthy" | "Needs attention"
	scope: string
}

const INITIAL_INTEGRATIONS: IntegrationRecord[] = [
	{ id: "salesforce", name: "Salesforce", category: "CRM", provider: "Nango", account: "northstar.my.salesforce.com", connected: true, health: "Healthy", scope: "Sales Operations" },
	{ id: "sharepoint", name: "SharePoint", category: "File storage", provider: "Nango", account: "Northstar Consulting", connected: true, health: "Healthy", scope: "Transformation Office" },
	{ id: "jira", name: "Jira", category: "Ticketing", provider: "Nango", account: "northstar.atlassian.net", connected: true, health: "Healthy", scope: "ERP Program" },
	{ id: "workday", name: "Workday", category: "HRIS", provider: "Merge Unified API", account: "Not connected", connected: false, health: "Healthy", scope: "Not selected" },
	{ id: "sap", name: "SAP S/4HANA", category: "ERP", provider: "Native", account: "Northstar Production", connected: true, health: "Needs attention", scope: "Finance and inventory" },
	{ id: "quickbooks", name: "QuickBooks Online", category: "ERP", provider: "Nango", account: "Northstar US", connected: true, health: "Healthy", scope: "Company 934771" },
]

export function IntegrationsModule() {
	const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS)
	const [query, setQuery] = useState("")
	const [selected, setSelected] = useState<IntegrationRecord | null>(null)
	const [testingId, setTestingId] = useState<string | null>(null)
	const [message, setMessage] = useState("")
	const [accessLogOpen, setAccessLogOpen] = useState(false)
	const filtered = integrations.filter((integration) => `${integration.name} ${integration.category}`.toLowerCase().includes(query.trim().toLowerCase()))
	const categories = Array.from(new Set(filtered.map((integration) => integration.category)))
	const toggleConnection = (integration: IntegrationRecord) => {
		setIntegrations((items) => items.map((item) => item.id === integration.id ? { ...item, connected: !item.connected, account: item.connected ? "Not connected" : `${item.name} workspace`, health: "Healthy" } : item))
		setMessage(`${integration.name} ${integration.connected ? "disconnected" : "connected"}.`)
	}
	const test = (integration: IntegrationRecord) => {
		setTestingId(integration.id)
		window.setTimeout(() => {
			setIntegrations((items) => items.map((item) => item.id === integration.id ? { ...item, health: "Healthy" } : item))
			setTestingId(null)
			setMessage(`${integration.name} connection test succeeded.`)
		}, 650)
	}
	return (
		<div className="mxp-portal-page mxp-integrations-page">
			<PortalPageHeader eyebrow="Workspace administration" title="Integrations" description="Connect workspace systems, manage provider access, and control how MAX uses external context." actions={<button type="button" onClick={() => setAccessLogOpen(true)}><FileText size={15} />Access log</button>} />
			<section className="mxp-portal-stats" aria-label="Integration summary"><PortalStat icon={<Plug size={18} />} label="Connected systems" value={String(integrations.filter((item) => item.connected).length)} hint="Across five categories" /><PortalStat icon={<CheckCircle size={18} />} label="Healthy" value={String(integrations.filter((item) => item.connected && item.health === "Healthy").length)} hint="Last tested today" /><PortalStat icon={<WarningCircle size={18} />} label="Needs attention" value={String(integrations.filter((item) => item.connected && item.health === "Needs attention").length)} hint="Existing access remains active" /><PortalStat icon={<ShieldCheck size={18} />} label="Policy owner" value="Tenant admin" hint="All changes are audited" /></section>
			<div className="mxp-integration-notice"><ShieldCheck size={17} /><div><strong>Connections remain user- and tenant-scoped</strong><p>Nango and Merge authorization never grants Agentix or other modules more access than the connected account already has.</p></div></div>
			<label className="mxp-integration-search"><MagnifyingGlass size={16} /><span className="sr-only">Search integrations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search integrations" /></label>
			<div className="mxp-integration-categories">
				{categories.map((category) => <section key={category} className="mxp-portal-card mxp-integration-category"><header><div><span><Plug size={17} weight="duotone" /></span><div><h2>{category}</h2><p>{category === "CRM" ? "Customer records and commercial workflows" : category === "File storage" ? "Documents, evidence, and collaborative files" : category === "Ticketing" ? "Delivery issues, approvals, and operating queues" : category === "HRIS" ? "People, roles, and workforce records" : "Financial and inventory systems"}</p></div></div><small>{filtered.filter((item) => item.category === category && item.connected).length} connected</small></header><div>{filtered.filter((item) => item.category === category).map((integration) => <article key={integration.id}><span className="mxp-integration-logo">{integration.name.split(/\s/).map((part) => part[0]).join("").slice(0, 2)}</span><div><span><strong>{integration.name}</strong>{integration.connected ? <i className={integration.health === "Healthy" ? "is-healthy" : "is-attention"}>{integration.health}</i> : <i>Available</i>}</span><p>{integration.connected ? integration.account : `Connect through ${integration.provider}`}</p><small>{integration.provider}{integration.connected ? ` · ${integration.scope}` : ""}</small></div><div>{integration.connected ? <><button type="button" disabled={testingId === integration.id} onClick={() => test(integration)}>{testingId === integration.id ? "Testing…" : "Test"}</button><button type="button" onClick={() => setSelected(integration)}>Scopes</button><button type="button" className="mxp-menu-button" aria-label={`Disconnect ${integration.name}`} onClick={() => toggleConnection(integration)}><DotsThree size={16} /></button></> : <button type="button" className="mxp-primary" onClick={() => toggleConnection(integration)}>Connect</button>}</div></article>)}</div></section>)}
			</div>
			<div className="mxp-live-message" aria-live="polite">{message}</div>
			{selected ? <><button type="button" className="mxp-panel-scrim" aria-label="Close integration scopes" onClick={() => setSelected(null)} /><aside className="mxp-integration-panel" aria-label={`${selected.name} available scopes`}><header><div><small>Connection scope</small><h2>{selected.name}</h2></div><button type="button" aria-label="Close integration scopes" onClick={() => setSelected(null)}><X size={17} /></button></header><div><p>Choose which workspace MAX may read through this connection. Provider permissions still apply.</p>{[selected.scope, "Transformation Office", "Finance Operations"].filter((scope, index, all) => all.indexOf(scope) === index).map((scope) => <label key={scope}><input type="radio" name="scope" defaultChecked={scope === selected.scope} /><span><strong>{scope}</strong><small>Authorized workspace scope</small></span></label>)}<button type="button" className="mxp-primary" onClick={() => { setMessage(`${selected.name} scope saved.`); setSelected(null) }}>Save scope</button></div></aside></> : null}
			{accessLogOpen ? <><button type="button" className="mxp-panel-scrim" aria-label="Close access log" onClick={() => setAccessLogOpen(false)} /><aside className="mxp-integration-panel" aria-label="Integration access log"><header><div><small>Immutable audit trail</small><h2>Integration access log</h2></div><button type="button" aria-label="Close access log" onClick={() => setAccessLogOpen(false)}><X size={17} /></button></header><div className="mxp-access-log"><p><Database size={15} /><span><strong>Salesforce records read</strong><small>Discovery · Root Admin · 8 minutes ago</small></span></p><p><ShieldCheck size={15} /><span><strong>SAP connection tested</strong><small>Tenant admin · 31 minutes ago</small></span></p><p><Plug size={15} /><span><strong>QuickBooks scope updated</strong><small>Tenant admin · Yesterday</small></span></p></div></aside></> : null}
		</div>
	)
}

export function AccountUtilityModule({ module, onNavigate }: { module: "settings" | "approvals" | "usage" | "help"; onNavigate: Navigate }) {
	const [approved, setApproved] = useState(false)
	const config = module === "settings" ? { icon: GearSix, eyebrow: "Account", title: "Settings", description: "Manage workspace identity, governance, notifications, and security." } : module === "approvals" ? { icon: ShieldCheck, eyebrow: "Governance", title: "My approvals", description: "Material decisions waiting for your explicit authority." } : module === "usage" ? { icon: ChartBar, eyebrow: "Account", title: "Usage", description: "Review workspace units and activity for the current billing cycle." } : { icon: Question, eyebrow: "Support", title: "Help", description: "Find guidance for MAXION workflows and platform administration." }
	const Icon = config.icon
	return <div className="mxp-portal-page mxp-utility-page"><PortalPageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} />{module === "settings" ? <section className="mxp-portal-card mxp-settings-card"><header><span><Icon size={18} /></span><div><h2>Workspace defaults</h2><p>Controls apply across MAXION modules.</p></div></header><label><span><strong>Agent notifications</strong><small>Notify owners when an autonomous run needs intervention.</small></span><input type="checkbox" defaultChecked /></label><label><span><strong>Weekly operating brief</strong><small>Send a verified summary every Monday.</small></span><input type="checkbox" defaultChecked /></label><button type="button" onClick={() => onNavigate("integrations")}><Plug size={15} />Manage integrations<ArrowRight size={14} /></button></section> : module === "approvals" ? <section className="mxp-approval-inbox"><header><div><h2>Pending decisions</h2><p>Approvals preserve the exact effect, owner, and evidence.</p></div><StatusSummary approved={approved} /></header>{approved ? <div className="mxp-approval-empty"><CheckCircle size={26} /><h3>All caught up</h3><p>No approvals are waiting for you.</p></div> : <article><span><ShieldCheck size={19} /></span><div><small>Agentix · July close</small><h3>Post 164 validated financial effects</h3><p>QuickBooks and SAP · $184,250 total value · reconciliation required.</p></div><div><button type="button" onClick={() => onNavigate("agentix")}>Inspect</button><button type="button" className="mxp-primary" onClick={() => setApproved(true)}>Approve once</button></div></article>}</section> : module === "usage" ? <section className="mxp-usage-layout"><div className="mxp-usage-ring"><strong>38%</strong><span>of workspace units used</span></div><div className="mxp-portal-card"><h2>Current cycle</h2><dl><div><dt>Discovery</dt><dd>12,480 units</dd></div><div><dt>Plan</dt><dd>8,140 units</dd></div><div><dt>Execute</dt><dd>14,620 units</dd></div><div><dt>Agentix</dt><dd>6,320 units</dd></div></dl></div></section> : <section className="mxp-help-layout"><label><MagnifyingGlass size={16} /><input aria-label="Search help" placeholder="Search MAXION help" /></label>{["Create and manage projects", "Run an autonomous Discovery", "Move a Plan into Execute", "Manage integration permissions", "Govern Agentix approvals"].map((title) => <button type="button" key={title}><Question size={15} /><span>{title}</span><CaretRight size={13} /></button>)}</section>}</div>
}
