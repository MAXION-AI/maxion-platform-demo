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
	Code,
	Compass,
	Database,
	FileText,
	FlowArrow,
	FolderPlus,
	GearSix,
	GridFour,
	List,
	MagnifyingGlass,
	Plug,
	Plus,
	Question,
	ShieldCheck,
	PencilSimpleLine,
	Stack,
	TerminalWindow,
	Users,
	WarningCircle,
	X,
} from "@phosphor-icons/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from "react"

import { useRiseIn } from "@/components/motion/MotionKit"
import { Button, Card, EmptyState, Mark, SearchInput } from "@/design/primitives"
import type { AgentixAttention, AgentixIntent, AgentixPendingCase } from "@/features/agentix/prototype/AgentixInitiativesPage"
import { listDiscoveryJumpRecords, type DiscoveryJump, type DiscoveryJumpRecord, type HandoffPacket } from "@/features/discovery-autonomous/DiscoveryAutonomousPrototypePage"
import { DELIVERABLES } from "@/features/discovery-autonomous/deliverables"

import { ActionArt, ActivityAvatar, ProjectArt, type ActionArtKind, type ActivityTone } from "./HomeArt"
import { NavGlyph, type NavGlyphName } from "./NavGlyphs"
import { MaxionSpiralMark } from "./PortalChrome"
import "./workspace-home.css"
import {
	EXECUTE_TASKS,
	WORKSPACE_CYCLE_RESET,
	WORKSPACE_UNIT_CAP,
	WORKSPACE_UNITS_PERCENT,
	WORKSPACE_UNITS_USED,
	WORKSPACE_USAGE_ROWS,
	workspaceUnitsLabel,
	type ExecuteLaunchIntent,
	type MaxionModuleId,
	type PortalProject,
} from "./model"

type Navigate = (module: MaxionModuleId) => void

// What a waiting Agentix case asks of its owner, in the words Agentix's own inbox uses.
export const agentixCaseAction = (item: AgentixPendingCase) => item.phase === "approval" ? "Review decision" : item.phase === "human" ? "Provide confirmation" : "Resolve notification"
// Every entry from outside Agentix opens the exact case it names, never whichever
// engagement happened to be open last.
export const agentixCaseIntent = (item: AgentixPendingCase): AgentixIntent => ({ type: "decision", id: item.phase === "human" ? "audience" : "approval", runId: item.id })

type OpenDiscoveryRecord = (recordId: string, jump: DiscoveryJump) => void
// A saved Discovery opens where it needs the viewer: the waiting decision, the finished
// package, or otherwise its saved point of work. Never whichever record was open last.
const discoveryJump = (record: DiscoveryJumpRecord): DiscoveryJump => record.status === "needs-input" ? "decision" : record.status === "completed" ? "package" : "resume"

// Relative time for a saved moment, in the dashboard's short form.
const sinceLabel = (iso: string) => {
	const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60000)
	return !Number.isFinite(minutes) || minutes < 1 ? "Just now" : minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`
}

// motion's hook settles a tick after mount; the media query is the truth jsdom forces,
// so timed theater checks both and takes the instant path if either says reduce.
function prefersReducedMotionQuery() {
	return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

const FOCUSABLE_SELECTOR = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"

// Ported from the Agentix dialog-focus contract: focus lands on the surface when it opens,
// Tab cycles inside it in both directions, and closing hands focus back to the trigger.
// `open` is a dependency because these surfaces mount and unmount inside a live module.
function useDialogFocus(panelRef: RefObject<HTMLElement | null>, open: boolean) {
	useEffect(() => {
		if (!open) return
		const panel = panelRef.current
		if (!panel) return
		const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
		// Capture the opener before moving focus; React autoFocus runs before this
		// effect and would otherwise make the field itself the return target.
		if (!panel.contains(document.activeElement)) (panel.querySelector<HTMLElement>("[data-dialog-autofocus]") ?? panel).focus()
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return
			const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
			if (focusable.length === 0) { event.preventDefault(); return }
			const first = focusable[0]
			const last = focusable[focusable.length - 1]
			const active = document.activeElement
			if (event.shiftKey && (active === first || active === panel)) { event.preventDefault(); last.focus() }
			else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
			else if (!(active instanceof HTMLElement) || !panel.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
		}
		panel.addEventListener("keydown", onKeyDown)
		return () => { panel.removeEventListener("keydown", onKeyDown); if (trigger && document.contains(trigger)) trigger.focus() }
	}, [panelRef, open])
}

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

type DashboardActivity = { module: MaxionModuleId; glyph: NavGlyphName; title: string; detail: string; time: string; tone: ActivityTone; open?: () => void }

export function DashboardModule({
	projects,
	active = true,
	onNavigate,
	onStartDiscovery,
	onOpenDiscoveryRecord,
	onOpenAgentix,
	agentix,
	discoveryReady,
	planSent,
	planPacket = null,
	executeVerified,
	onCommand,
	onCreateProject,
}: {
	projects: PortalProject[]
	// The stage stays mounted while hidden; saved Discoveries are read again each time it shows.
	active?: boolean
	onNavigate: Navigate
	onStartDiscovery: () => void
	onOpenDiscoveryRecord: OpenDiscoveryRecord
	onOpenAgentix: (intent: AgentixIntent) => void
	agentix: AgentixAttention
	discoveryReady: boolean
	planSent: boolean
	planPacket?: HandoffPacket | null
	executeVerified: boolean
	onCommand?: () => void
	onCreateProject?: () => void
}) {
	const [historyOpen, setHistoryOpen] = useState(false)
	const activeProjects = projects.filter((project) => project.status === "active")
	const dateLabel = new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date())
	// Saved Discoveries are the real record; the dashboard counts them instead of
	// asserting a number that stops being true the moment one is finished.
	const discoveries = useMemo(() => listDiscoveryJumpRecords(), [discoveryReady, active])
	const runningDiscoveries = discoveries.filter((record) => record.status !== "completed").length
	const waitingDiscoveries = discoveries.filter((record) => record.status === "needs-input")
	// The row follows the Discovery that most needs the viewer, then the one still working.
	const leadDiscovery = waitingDiscoveries[0] ?? discoveries.find((record) => record.status === "active") ?? discoveries[0]
	// What was already true when this session opened. Anything that has changed since is
	// something the viewer just did, and a row that says "41m" about it is a lie.
	const openedWith = useRef({ planSent, executeVerified })
	// Agentix reports a tick after the shell mounts. Its first report is what was already
	// true, so the seeded case reads as old work rather than as something that just happened.
	const agentixBaseline = useRef<{ approval: boolean; audience: boolean; pending: string[] | null } | null>(null)
	if (agentix.reported !== false && !agentixBaseline.current) agentixBaseline.current = { approval: agentix.approval, audience: agentix.audience, pending: agentix.pending ? agentix.pending.map((item) => item.id) : null }
	const since = (changed: boolean, resting: string) => changed ? "Just now" : resting
	// The row names the case that is waiting and opens exactly that case.
	const waiting = agentix.pending ?? []
	const leadCase = waiting.find((item) => item.phase === "approval") ?? waiting[0]
	const baseline = agentixBaseline.current
	// A case that was not waiting at the first report is new; an empty queue that was not
	// empty then is the viewer's own resolution.
	const agentixChanged = Boolean(baseline && (baseline.pending && agentix.pending
		? leadCase ? !baseline.pending.includes(leadCase.id) : baseline.pending.length > 0
		: baseline.approval !== agentix.approval || baseline.audience !== agentix.audience))
	const agentixIntent: AgentixIntent = leadCase
		? agentixCaseIntent(leadCase)
		: agentix.approval ? { type: "decision", id: "approval" } : agentix.audience ? { type: "decision", id: "audience" } : { type: "surface", id: "activity" }
	const discoveryActivity: DashboardActivity = leadDiscovery
		? {
			module: "discovery",
			glyph: "discovery",
			title: leadDiscovery.title,
			detail: leadDiscovery.status === "needs-input"
				? `Review decision · one authority boundary is waiting${waitingDiscoveries.length > 1 ? ` · ${waitingDiscoveries.length - 1} more waiting` : ""}`
				: leadDiscovery.status === "completed" ? `Decision package generated · ${DELIVERABLES.length} deliverables · evidence lineage verified` : "Working autonomously · MAX stops only at an authority boundary",
			// The record keeps its own last-worked time, as the Discovery hub shows it.
			time: sinceLabel(leadDiscovery.updatedAt),
			tone: leadDiscovery.status === "needs-input" ? "attention" : leadDiscovery.status === "completed" ? "success" : "live",
			open: () => onOpenDiscoveryRecord(leadDiscovery.id, discoveryJump(leadDiscovery)),
		}
		: { module: "discovery", glyph: "discovery", title: "Start a Discovery", detail: "Give MAX a brief · it researches, interviews owners and returns a decision package", time: "", tone: "info", open: onStartDiscovery }
	const activities: DashboardActivity[] = [
		discoveryActivity,
		{
			module: "agentix" as const,
			glyph: "agentix",
			title: leadCase ? leadCase.title : agentix.approval ? "Invoice variance needs one exact approval" : agentix.audience ? "Onboarding needs payroll-owner fulfillment" : agentixChanged ? "Nothing in Agentix needs you" : "View your engagements",
			detail: leadCase
				? `${agentixCaseAction(leadCase)} · ${leadCase.engagement} · ${leadCase.reference}${waiting.length > 1 ? ` · ${waiting.length - 1} more waiting` : ""}`
				: agentix.approval ? "$240 price variance · invoice v2" : agentix.audience ? "Completed HR and IT work is preserved" : agentixChanged ? "Your decisions are recorded · engagements continue" : "Agentix · active work, exceptions and verified outcomes",
			time: since(agentixChanged, "1h"),
			tone: leadCase || agentix.approval || agentix.audience ? "attention" : "success",
			open: () => onOpenAgentix(agentixIntent),
		},
	]
	// Older entries stay folded away until asked for, so "View all" moves something real.
	const history: DashboardActivity[] = [
		{ module: "integrations" as const, glyph: "integrations", title: "SAP S/4HANA connection flagged for review", detail: "Existing access remains active · tenant admin notified", time: "3h", tone: "attention" },
		{ module: "projects" as const, glyph: "projects", title: "Pricing transformation delivered and closed", detail: "Plan completed · evidence retained", time: "Yesterday", tone: "info" },
		{ module: "integrations" as const, glyph: "integrations", title: "QuickBooks scope updated", detail: "Tenant admin · Company 934771", time: "Yesterday", tone: "info" },
	]
	const visibleActivities = historyOpen ? [...activities, ...history] : activities

	const quickActions: Array<{ label: string; art: ActionArtKind; run: () => void }> = [
		{ label: "New project", art: "project", run: () => onCreateProject ? onCreateProject() : onNavigate("projects") },
		{ label: "Start Discovery", art: "discovery", run: onStartDiscovery },
		{ label: "New engagement", art: "agentix", run: () => onOpenAgentix({ type: "create" }) },
		{ label: "Ask MAX", art: "consult", run: () => onNavigate("consult") },
	]
	const attentionCount = activities.filter((item) => item.tone === "attention").length

	/*
	 * The Dashboard is the ElevenLabs Home (mobbin ec8402ae): a workspace kicker over
	 * the greeting, a row of illustrated actions, then two titled lists, the work
	 * that needs the viewer beside the projects to pick up again.
	 */
	return (
		<div className="mxp-dashboard-page wh-root ds-scope">
			<header className="ds-topbar wh-topbar">
				<div className="ds-topbar-start"><span className="ds-topbar-title">Dashboard</span></div>
				<div className="ds-topbar-end">
					{onCommand ? <Button size="sm" className="wh-jump" onClick={onCommand}><MagnifyingGlass aria-hidden="true" />Jump to<kbd>⌘K</kbd></Button> : null}
				</div>
			</header>
			<div className="wh-scroll">
				<div className="wh-page">
					<button type="button" className="wh-announce" onClick={() => onOpenAgentix({ type: "surface", id: "activity" })}>
						<span className="wh-announce-tag">New</span>
						<span>Agentix engagements keep working between your visits</span>
						<CaretRight aria-hidden="true" />
					</button>

					<section className="wh-hello">
						<p className="wh-kicker">Enterprise workspace · {dateLabel}</p>
						<h1>Good afternoon, Root Admin</h1>
					</section>

					<nav className="wh-actions" aria-label="Quick actions">
						{quickActions.map((action, index) => (
							<button type="button" key={action.label} className="wh-tile" style={{ "--wh-i": index } as CSSProperties} onClick={action.run}>
								<span className="wh-tile-art"><ActionArt kind={action.art} /></span>
								<span className="wh-tile-label">{action.label}</span>
							</button>
						))}
					</nav>

					<section className="wh-summary" aria-label="Workspace summary">
						<dl>
						<div><dt><NavGlyph name="projects" />Active projects</dt><dd><strong>{activeProjects.length}</strong><small>Across this workspace</small></dd></div>
						<div><dt><NavGlyph name="discovery" />Active discoveries</dt><dd><strong>{runningDiscoveries}</strong><small>{waitingDiscoveries.length ? `${waitingDiscoveries.length === 1 ? "One needs" : `${waitingDiscoveries.length} need`} your input` : "None need your input"}</small></dd></div>
						<div><dt><NavGlyph name="usage" />Workspace units</dt><dd><strong>{WORKSPACE_UNITS_PERCENT}%</strong><small>{100 - WORKSPACE_UNITS_PERCENT}% remains this cycle</small></dd></div>
						</dl>
					</section>

					<div className="wh-columns">
						<section className="wh-column" aria-labelledby="wh-activity-title">
							<header className="wh-column-head">
								<h2 id="wh-activity-title">Workspace activity</h2>
								{attentionCount ? <span className="wh-count">{attentionCount} waiting</span> : null}
							</header>
							<ul className="wh-list">
								{visibleActivities.map((item) => (
									<li key={`${item.module}-${item.title}`}>
										<button type="button" className="wh-row" onClick={() => item.open ? item.open() : onNavigate(item.module)}>
											<ActivityAvatar glyph={item.glyph} tone={item.tone} />
											<span className="wh-row-text"><strong>{item.title}</strong><small>{item.detail}</small></span>
											{item.time ? <time>{item.time}</time> : null}
										</button>
									</li>
								))}
							</ul>
							<Button className="wh-more" aria-expanded={historyOpen} onClick={() => setHistoryOpen((open) => !open)}>{historyOpen ? "Show less" : `View all activity`}</Button>
						</section>

						<section className="wh-column" aria-labelledby="wh-projects-title">
							<header className="wh-column-head"><h2 id="wh-projects-title">Pick up a project</h2></header>
							<ul className="wh-list is-feature">
								{activeProjects.slice(0, 3).map((project) => (
									<li key={project.id}>
										<button type="button" className="wh-feature" onClick={() => onNavigate("projects")}>
											<span className="wh-feature-art"><ProjectArt seed={project.id} compact /></span>
											<span className="wh-row-text">
												<strong>{project.name}</strong>
												<small>{project.description}</small>
												<span className="wh-feature-meta">
													<span className="wh-avatars">{project.members.slice(0, 3).map((member) => <i key={member.name} title={member.name}>{member.initials}</i>)}</span>
													Updated {project.updated}
												</span>
											</span>
										</button>
									</li>
								))}
							</ul>
							<Button className="wh-more" onClick={() => onNavigate("projects")}>View all projects</Button>
						</section>
					</div>

					<footer className="wh-foot">
						<span>MAX reads workspace context through your connected systems.</span>
						<Button variant="ghost" size="sm" onClick={() => onNavigate("integrations")}><NavGlyph name="integrations" />Manage connected systems<CaretRight aria-hidden="true" /></Button>
					</footer>
				</div>
			</div>
		</div>
	)
}

type ProjectDetailsTab = "overview" | "team" | "activity" | "settings"

export function ProjectsModule({
	projects,
	onProjectsChange,
	onNavigate,
	onStartDiscovery,
	onOpenDiscoveryRecord,
	onCommand,
	createSignal = 0,
}: {
	projects: PortalProject[]
	onProjectsChange: (projects: PortalProject[]) => void
	onNavigate: Navigate
	onStartDiscovery: () => void
	onOpenDiscoveryRecord: OpenDiscoveryRecord
	onCommand?: () => void
	// Bumped by the Dashboard's "New project" action: open the create dialog on arrival.
	createSignal?: number
}) {
	const [query, setQuery] = useState("")
	const [sort, setSort] = useState<"updated" | "name">("updated")
	const [view, setView] = useState<"grid" | "list">("list")
	const [showArchived, setShowArchived] = useState(false)
	const [createOpen, setCreateOpen] = useState(false)
	const [newName, setNewName] = useState("")
	const [newDescription, setNewDescription] = useState("")
	const [selected, setSelected] = useState<PortalProject | null>(null)
	const [detailsTab, setDetailsTab] = useState<ProjectDetailsTab>("overview")
	const [announcement, setAnnouncement] = useState("")
	const [inviteOpen, setInviteOpen] = useState(false)
	const [inviteName, setInviteName] = useState("")
	const rootRef = useRef<HTMLDivElement>(null)
	const dialogRef = useRef<HTMLElement>(null)
	const panelRef = useRef<HTMLElement>(null)
	useDialogFocus(dialogRef, createOpen)
	useDialogFocus(panelRef, Boolean(selected))
	// Escape closes the surface on top, the same ladder every module honours. The stage
	// stays mounted behind `hidden` when the viewer leaves, so only a visible Projects
	// page may own the key.
	useEffect(() => {
		if (!createOpen && !selected) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || !rootRef.current?.offsetParent) return
			event.preventDefault()
			if (createOpen) setCreateOpen(false)
			else setSelected(null)
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [createOpen, selected])
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

	// Adding a member is a real membership change: it lands on the project record the rest
	// of the shell reads, not on a local list that disappears with the panel.
	const addMember = () => {
		const name = inviteName.trim()
		if (!selected || !name) return
		const initials = (name.split(/\s+/).map((part) => part[0] ?? "").join("") || name).slice(0, 2).toUpperCase()
		const member = { initials, name }
		onProjectsChange(projects.map((item) => item.id === selected.id ? { ...item, members: [...item.members, member] } : item))
		setSelected((current) => current ? { ...current, members: [...current.members, member] } : current)
		setInviteName("")
		setInviteOpen(false)
		setAnnouncement(`${name} added to ${selected.name}.`)
	}
	// A half-typed invite never survives leaving the panel or the tab it belongs to.
	useEffect(() => { setInviteOpen(false); setInviteName("") }, [selected?.id, detailsTab])
	// A project's linked Discovery opens that saved record where it needs the viewer; a project
	// without one starts a fresh Discovery. The record is read again on click, so it is current.
	const linkedDiscoveryTitle = selected?.discovery
	const hasLinkedDiscovery = useMemo(() => Boolean(linkedDiscoveryTitle && listDiscoveryJumpRecords().some((record) => record.title === linkedDiscoveryTitle)), [linkedDiscoveryTitle])
	const openProjectDiscovery = () => {
		const record = linkedDiscoveryTitle ? listDiscoveryJumpRecords().find((item) => item.title === linkedDiscoveryTitle) : undefined
		if (record) onOpenDiscoveryRecord(record.id, discoveryJump(record))
		else onStartDiscovery()
	}

	useEffect(() => { if (createSignal) setCreateOpen(true) }, [createSignal])
	const reduced = useReducedMotion()
	const rise = useRiseIn()
	const activeCount = projects.filter((project) => project.status === "active").length
	const archivedCount = projects.filter((project) => project.status === "archived").length
	const openCreate = (template?: ProjectTemplate) => {
		if (template) { setNewName(template.name); setNewDescription(template.description) }
		setCreateOpen(true)
	}

	/*
	 * Projects is the ElevenLabs Studio page (mobbin ab7a5853) with the Productions
	 * table (mobbin 675595a6): the title and its one filled action, templates to
	 * start from, then recent work behind a full-width search, filter chips and a
	 * grid or list switch. Each project wears its own colour and logo.
	 */
	return (
		<div className="mxp-projects-page pj-root ds-scope" ref={rootRef}>
			<header className="ds-topbar pj-topbar">
				<div className="ds-topbar-start"><span className="ds-topbar-title">Projects</span></div>
				<div className="ds-topbar-end">
					{onCommand ? <Button size="sm" className="wh-jump" onClick={onCommand}><MagnifyingGlass aria-hidden="true" />Jump to<kbd>⌘K</kbd></Button> : null}
				</div>
			</header>
			<div className="pj-scroll">
				<div className="pj-page">
					<header className="pj-head">
						<div>
							<h1 className="ds-page-title">Projects</h1>
							<p className="ds-page-desc">{`${activeCount} active projects · ${archivedCount} archived`}</p>
						</div>
						<div className="ds-page-actions">
							<Button variant="primary" onClick={() => openCreate()}><Plus aria-hidden="true" />Create Project</Button>
						</div>
					</header>

					<section className="pj-section" aria-labelledby="pj-start-title">
						<h2 id="pj-start-title" className="pj-section-title">Start from a template</h2>
						<div className="pj-templates">
							{PROJECT_TEMPLATES.map((template) => (
								<button type="button" key={template.name} className="pj-template" onClick={() => openCreate(template)}>
									<span className="pj-template-art"><ProjectArt seed={template.name} /></span>
									<span className="pj-template-text"><strong>{template.name}</strong><small>{template.detail}</small></span>
								</button>
							))}
						</div>
					</section>

					<section className="pj-section" aria-labelledby="pj-recent-title">
						<h2 id="pj-recent-title" className="pj-section-title">Recently updated</h2>
						<div className="pj-toolbar">
							<SearchInput label="Search projects" className="pj-search" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} placeholder="Search projects by name or description" />
							<div className="pj-views" role="group" aria-label="Project view">
								<Button icon aria-pressed={view === "grid"} onClick={() => setView("grid")}><GridFour aria-hidden="true" /><span className="sr-only">Grid view</span></Button>
								<Button icon aria-pressed={view === "list"} onClick={() => setView("list")}><List aria-hidden="true" /><span className="sr-only">List view</span></Button>
							</div>
						</div>
						<div className="pj-filters">
							<label className="pj-chip pj-sort">
								<ArrowsDownUp aria-hidden="true" />
								<span className="sr-only">Sort projects</span>
								<select value={sort} onChange={(event) => setSort(event.target.value as "updated" | "name")}>
									<option value="updated">Recently updated</option>
									<option value="name">Name</option>
								</select>
							</label>
							<button type="button" className="pj-chip" aria-pressed={showArchived} onClick={() => setShowArchived((value) => !value)}>
								{showArchived ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}Archived<span className="pj-chip-count">{archivedCount}</span>
							</button>
						</div>
						<div aria-live="polite" className="sr-only">{announcement}</div>
						{visible.length ? (
							<section className={`mxp-project-collection pj-collection is-${view}`} aria-label="Projects">
								{view === "list" ? <div className="pj-table-head" aria-hidden="true"><span>Name</span><span>Linked work</span><span>Team</span><span>Updated</span><span /></div> : null}
								<AnimatePresence initial={false} mode="popLayout">
									{visible.map((project) => (
										<motion.article key={project.id} className={`pj-item${project.status === "archived" ? " is-archived" : ""}`} {...rise}>
											<span className="pj-item-art"><ProjectArt seed={project.id} compact={view === "list"} /></span>
											<span className="pj-item-main">
												<button type="button" className="mxp-project-open pj-open" onClick={() => { setSelected(project); setDetailsTab("overview") }}>
													<span className="pj-name"><strong>{project.name}</strong><i className={`pj-status is-${project.status}`}>{project.status}</i></span>
												</button>
												<small className="pj-desc">{project.description}</small>
											</span>
											<span className="pj-links">
												<span className={`pj-link${project.plan ? " is-on" : ""}`}><NavGlyph name="plan" />{project.plan ? "Plan" : "No plan"}</span>
												<span className={`pj-link${project.discovery ? " is-on" : ""}`}><NavGlyph name="discovery" />{project.discovery ? "Discovery" : "No discovery"}</span>
											</span>
											<span className="pj-team wh-avatars">{project.members.slice(0, 3).map((member) => <i key={member.name} title={member.name}>{member.initials}</i>)}</span>
											<span className="pj-updated">{project.role} · {project.updated}</span>
											<Button variant="ghost" size="sm" className="pj-archive" aria-label={`${project.status === "active" ? "Archive" : "Restore"} ${project.name}`} onClick={() => toggleArchive(project)}><Archive aria-hidden="true" /><span>{project.status === "active" ? "Archive" : "Restore"}</span></Button>
										</motion.article>
									))}
								</AnimatePresence>
							</section>
						) : (
							<EmptyState
								className="pj-empty"
								icon={<NavGlyph name="projects" />}
								title="No matching projects"
								action={<Button onClick={() => { setQuery(""); setShowArchived(true) }}>Show all projects</Button>}>
								<p>Clear the search or include archived projects.</p>
							</EmptyState>
						)}
					</section>
				</div>
			</div>

			{createOpen ? (
				<div className="mxp-dialog-layer pj-dialog-layer" onMouseDown={(event) => { if (event.currentTarget === event.target) setCreateOpen(false) }}>
					<motion.section role="dialog" aria-modal="true" aria-labelledby="create-project-title" aria-describedby="create-project-desc" className="pj-dialog" ref={dialogRef} tabIndex={-1} initial={reduced ? false : { y: 8, scale: 0.98 }} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 38 }}>
						<header className="pj-dialog-head">
							<span className="pj-dialog-icon" aria-hidden="true"><NavGlyph name="projects" /></span>
							<div>
								<h2 id="create-project-title">Create new project</h2>
								<p id="create-project-desc">One workspace for its Discovery, Plan and delivery.</p>
							</div>
							<button type="button" className="pj-dialog-close" aria-label="Close create project dialog" onClick={() => setCreateOpen(false)}><X aria-hidden="true" /></button>
						</header>
						<form className="pj-form" onSubmit={createProject}>
							<label className="pj-field">
								<span className="pj-field-row"><span>Project name</span><span className="pj-count">{newName.length}/80</span></span>
								<input className="ds-input" data-dialog-autofocus maxLength={80} required value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g., Finance operating model" />
							</label>
							<label className="pj-field">Description<textarea className="ds-textarea" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} rows={3} placeholder="Describe the scope, stakeholders, or desired outcome." /></label>
							<footer className="pj-dialog-foot">
								<Button onClick={() => setCreateOpen(false)}>Cancel</Button>
								<Button type="submit" variant="primary" disabled={!newName.trim()}>Create Project</Button>
							</footer>
						</form>
					</motion.section>
				</div>
			) : null}

			<AnimatePresence>
				{selected ? (
					<motion.div key="panel" className="pj-sheet-layer" initial={reduced ? false : { opacity: 1 }} exit={reduced ? undefined : { opacity: 1 }}>
						<motion.button type="button" className="mxp-panel-scrim pj-scrim" aria-label="Close project details" tabIndex={-1} onClick={() => setSelected(null)} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }} />
						<motion.aside className="mxp-project-panel pj-sheet" aria-label={`${selected.name} project details`} ref={panelRef} tabIndex={-1} initial={reduced ? false : { x: 32 }} animate={{ x: 0 }} exit={reduced ? undefined : { x: 32, opacity: 0 }} transition={{ type: "spring", stiffness: 420, damping: 40 }}>
							<header className="pj-sheet-head">
								<span className="pj-sheet-art"><ProjectArt seed={selected.id} compact /></span>
								<div>
									<p className="pj-kicker">Project</p>
									<h2>{selected.name}</h2>
								</div>
								<button type="button" className="pj-dialog-close" aria-label="Close project details" onClick={() => setSelected(null)}><X aria-hidden="true" /></button>
							</header>
							<ul className="pj-pills" aria-label="Project summary">
								<li className={`pj-status is-${selected.status}`}>{selected.status}</li>
								<li className="pj-pill">{selected.role}</li>
								<li className="pj-pill">Updated {selected.updated}</li>
							</ul>
							<nav className="pj-tabs" aria-label="Project details sections">
								{(["overview", "team", "activity", "settings"] as const).map((tab) => (
									<button key={tab} type="button" className={detailsTab === tab ? "is-active" : ""} aria-pressed={detailsTab === tab} onClick={() => setDetailsTab(tab)}>
										{tab}
										{detailsTab === tab ? <motion.span className="pj-tab-underline" layoutId="pj-tab-underline" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }} /> : null}
									</button>
								))}
							</nav>
							<div className="mxp-project-panel-body pj-sheet-body">
								{detailsTab === "overview" ? (
									<>
										<p className="pj-sheet-desc">{selected.description}</p>
										<dl className="pj-rows">
											<div><dt>Status</dt><dd>{selected.status}</dd></div>
											<div><dt>Your role</dt><dd>{selected.role}</dd></div>
											<div><dt>Plan</dt><dd>{selected.plan || "Not created"}</dd></div>
											<div><dt>Discovery</dt><dd>{selected.discovery || "Not started"}</dd></div>
										</dl>
										<div className="pj-next">
											<button type="button" className="pj-next-card" aria-label={hasLinkedDiscovery ? "Open Discovery" : "Start Discovery"} aria-describedby="pj-next-discovery" onClick={openProjectDiscovery}>
												<ActivityAvatar glyph="discovery" tone={hasLinkedDiscovery ? "success" : "info"} />
												<span><strong>{hasLinkedDiscovery ? "Open Discovery" : "Start Discovery"}</strong><small id="pj-next-discovery">{hasLinkedDiscovery ? selected.discovery : "Let MAX research and interview owners"}</small></span>
											</button>
											<button type="button" className="pj-next-card" aria-label={selected.plan ? "Open Plan" : "Create Plan"} aria-describedby="pj-next-plan" onClick={() => onNavigate("plan")}>
												<ActivityAvatar glyph="plan" tone={selected.plan ? "success" : "info"} />
												<span><strong>{selected.plan ? "Open Plan" : "Create Plan"}</strong><small id="pj-next-plan">{selected.plan || "Turn the Discovery package into delivery"}</small></span>
											</button>
										</div>
									</>
								) : detailsTab === "team" ? (
									<div className="pj-team-list">
										<ul>
											{selected.members.map((member, index) => (
												<li key={member.name}>
													<span className="pj-person">{member.initials}</span>
													<strong>{member.name}</strong>
													{index === 0 ? <span className="pj-owner">Owner</span> : <small>Member</small>}
												</li>
											))}
										</ul>
										{inviteOpen ? (
											<form className="pj-invite" onSubmit={(event) => { event.preventDefault(); addMember() }}>
												<label><span className="sr-only">New member name</span><input className="ds-input" autoFocus maxLength={60} value={inviteName} onChange={(event) => setInviteName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addMember() } }} placeholder="Full name" /></label>
												<Button onClick={() => { setInviteOpen(false); setInviteName("") }}>Cancel</Button>
												<Button type="submit" variant="primary" disabled={!inviteName.trim()}>Add</Button>
											</form>
										) : <Button className="pj-add" onClick={() => setInviteOpen(true)}><Users aria-hidden="true" />Add member</Button>}
									</div>
								) : detailsTab === "activity" ? (
									<ol className="pj-timeline">
										<li><ActivityAvatar glyph="plan" tone="success" /><span><strong>Plan evidence snapshot updated</strong><small>12 minutes ago</small></span></li>
										<li><ActivityAvatar glyph="discovery" tone="success" /><span><strong>Discovery interview completed</strong><small>Yesterday</small></span></li>
										<li><ActivityAvatar glyph="projects" tone="info" /><span><strong>Sarah Liu joined the project</strong><small>4 days ago</small></span></li>
									</ol>
								) : (
									<div className="pj-settings">
										<label className="pj-field">Project name<input className="ds-input" value={selected.name} readOnly /></label>
										<Button onClick={() => toggleArchive(selected)}><Archive aria-hidden="true" />{selected.status === "active" ? "Archive project" : "Restore project"}</Button>
									</div>
								)}
							</div>
						</motion.aside>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	)
}

type ProjectTemplate = { name: string; description: string; detail: string }
// Starting points for a new project; picking one fills the create dialog.
const PROJECT_TEMPLATES: ProjectTemplate[] = [
	{ name: "Finance transformation", description: "Modernize close, controls and reporting across finance systems.", detail: "ERP, controls and reporting" },
	{ name: "Acquisition integration", description: "Diligence, day-one readiness and the 100-day value plan for an acquisition.", detail: "Diligence to the 100-day plan" },
	{ name: "Customer data foundation", description: "Unify account, support and adoption data into one owned customer model.", detail: "One owned customer model" },
	{ name: "Vendor risk program", description: "Tier, onboard and monitor third parties with evidence-backed decisions.", detail: "Tiering, onboarding and monitoring" },
]

type PlanLibraryRow = { id: string; name: string; project: string; status: "active" | "generated" | "completed"; detail: string; updated: string }

const PLAN_LIBRARY: readonly PlanLibraryRow[] = [
	{ id: "erp", name: "ERP modernization delivery plan", project: "ERP modernization", status: "active", detail: "5 flows · 17 build packages", updated: "12 minutes ago" },
	{ id: "northbridge", name: "NorthBridge 100-day plan", project: "NorthBridge acquisition", status: "generated", detail: "Investment committee package ready", updated: "Yesterday" },
	{ id: "customer", name: "Customer data foundation", project: "Customer 360", status: "active", detail: "11 outcomes · 38 delivery items", updated: "4 days ago" },
	{ id: "pricing", name: "Pricing transformation roadmap", project: "Pricing transformation", status: "completed", detail: "Fully delivered", updated: "Jun 18" },
]

// The plan a Discovery handoff feeds. The Discovery registry names the record holding the
// packet and that record's project names its plan, which moves to the top as new. A packet
// no project claims becomes a new plan of its own rather than borrowing another's row.
function receivedPlanRow(packet: HandoffPacket, projects: PortalProject[]): { row: PlanLibraryRow; claimed: boolean } {
	const record = listDiscoveryJumpRecords().find((item) => "handoffId" in item && item.handoffId === packet.id)
	const project = record ? projects.find((item) => item.discovery === record.title) : undefined
	const plan = project ? PLAN_LIBRARY.find((item) => item.name === project.plan) : undefined
	const row: PlanLibraryRow = {
		id: plan?.id ?? `packet-${packet.id}`,
		name: plan?.name ?? (record ? `${record.title} plan` : `Plan from ${packet.id}`),
		project: plan?.project ?? project?.name ?? record?.title ?? "Discovery handoff",
		status: plan?.status ?? "generated",
		detail: `From Discovery packet ${packet.id}`,
		updated: sinceLabel(packet.createdAt),
	}
	return { row, claimed: Boolean(record) }
}

export function PlanLibraryModule({ projects, packet = null, packetLanded = false, onOpenPlan, onOpenPacketPlan, onStartPlan, onNavigate }: { projects: PortalProject[]; packet?: HandoffPacket | null; packetLanded?: boolean; onOpenPlan: () => void; onOpenPacketPlan?: () => void; onStartPlan: () => void; onNavigate: Navigate }) {
	const [tab, setTab] = useState<"all" | "active" | "generated" | "completed">("all")
	const [createOpen, setCreateOpen] = useState(false)
	const [projectId, setProjectId] = useState(projects.find((project) => project.status === "active")?.id ?? "")
	const [objective, setObjective] = useState("")
	const [source, setSource] = useState<"discovery" | "documents" | "integrations" | "project" | "manual">("discovery")
	const rise = useRiseIn()
	// Discovery writes the packet onto its record a beat after handing it over, so a packet no
	// record claims yet is looked up again briefly before it stands as a plan of its own.
	const [lookup, setLookup] = useState(0)
	const resolved = useMemo(() => packet ? receivedPlanRow(packet, projects) : null, [packet, projects, lookup])
	const received = resolved?.row ?? null
	const unclaimed = resolved !== null && !resolved.claimed
	useEffect(() => {
		if (!unclaimed) return
		let tries = 0
		const timer = window.setInterval(() => {
			tries += 1
			setLookup((value) => value + 1)
			if (tries >= 8) window.clearInterval(timer)
		}, 250)
		return () => window.clearInterval(timer)
	}, [unclaimed, packet?.id])
	const plans = received ? [received, ...PLAN_LIBRARY.filter((plan) => plan.id !== received.id)] : PLAN_LIBRARY
	const filtered = plans.filter((plan) => tab === "all" || plan.status === tab)
	const openPacketPlan = onOpenPacketPlan ?? onOpenPlan
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
			<section className="mxp-portal-stats" aria-label="Plan summary"><PortalStat icon={<FlowArrow size={18} />} label="Total plans" value={String(plans.length)} hint="Across all projects" /><PortalStat icon={<Activity size={18} />} label="Autonomous runs" value="2" hint="MAX is working" /><PortalStat icon={<ShieldCheck size={18} />} label="Needs your input" value="1" hint="One exact decision" /><PortalStat icon={<CheckCircle size={18} />} label="Execute-ready" value="2" hint="L3 and L4 complete" /></section>
			{packet ? (
				<section className="mxp-plan-received" aria-label="Discovery handoff">
					<CheckCircle size={16} weight="fill" />
					<span><strong>Received from Discovery · {packet.id}</strong><small>{packet.note ? `“${packet.note}” · ` : ""}Frozen decision package · {sinceLabel(packet.createdAt)}</small></span>
					<button type="button" onClick={openPacketPlan}>{packetLanded ? "Open plan" : "Plan from this package"}<ArrowRight size={14} /></button>
				</section>
			) : null}
			<section className="mxp-plan-resume"><span><MaxionSpiralMark className="mxp-plan-resume-spiral" /><div><small>MAX finished this run</small><strong>ERP modernization delivery plan</strong><p>Five implementation flows are decomposed through L2–L4 and critic-checked. The implementation boundary is ready for your approval.</p></div></span><button type="button" onClick={onOpenPlan}>Resume plan<ArrowRight size={14} /></button></section>
			<section className="mxp-portal-card mxp-plan-list-card"><header><div><h2>Plans</h2><p>Current plans across your projects</p></div></header><nav role="tablist" aria-label="Plan status">{(["all", "active", "generated", "completed"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)} <span>{value === "all" ? plans.length : plans.filter((plan) => plan.status === value).length}</span></button>)}</nav><div>{filtered.map((plan) => {
				const content = <><span className="mxp-plan-item-icon"><FlowArrow size={17} weight="duotone" /></span><span><strong>{plan.name}</strong><small>{plan.project} · {plan.detail}</small></span>{plan === received ? <i className="is-new">New</i> : plan.status !== "active" ? <i className={`is-${plan.status}`}>{plan.status}</i> : null}<time>{plan.updated}</time><CaretRight size={14} /></>
				return plan === received
					? <motion.button type="button" key={`${plan.id}-${packet?.id}`} onClick={openPacketPlan} {...rise}>{content}</motion.button>
					: <button type="button" key={plan.id} onClick={onOpenPlan}>{content}</button>
			})}</div></section>
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
	deployRequest,
	onApproveDeploy,
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
	deployRequest: { title: string; artifact: string; requestedAt: string | null; approved: boolean } | null
	onApproveDeploy: () => void
}) {
	const prefersReducedMotion = useReducedMotion()
	const [view, setView] = useState<"engagements" | "approvals">("engagements")
	// Approved Plan engagements arrive with repository and workspace bindings already signed.
	// Execute asks again only for a new environment effect, not for authority Plan already settled.
	const [approved, setApproved] = useState(true)
	const [scopeOpen, setScopeOpen] = useState(false)
	const [handoffFresh, setHandoffFresh] = useState(false)
	// The handoff arrives as a beat: Execute visibly carves the Plan into workspaces before
	// settling into the composer. -1 is "not playing" — the only state reduced motion sees.
	const [assemblyStep, setAssemblyStep] = useState(-1)
	const assemblyTimersRef = useRef<number[]>([])
	const deployPending = Boolean(deployRequest && !deployRequest.approved)
	const pendingDecisions = (approved ? 0 : 1) + (deployPending ? 1 : 0)
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
			// The beat is an overlay: the composer and the handoff chip stay mounted beneath it,
			// so the pinned 40ms focus still lands on the chip the viewer will see when it clears.
			if (!prefersReducedMotion && !prefersReducedMotionQuery()) {
				setAssemblyStep(0)
				EXECUTE_TASKS.forEach((_, index) => assemblyTimersRef.current.push(window.setTimeout(() => setAssemblyStep(index + 1), 90 + index * 120)))
				assemblyTimersRef.current.push(window.setTimeout(() => setAssemblyStep(EXECUTE_TASKS.length + 1), 930))
				assemblyTimersRef.current.push(window.setTimeout(() => setAssemblyStep(-1), 1220))
			}
			window.setTimeout(() => handoffChipRef.current?.focus(), 40)
		}
		onIntentConsumed()
		// Consumption callback is a stable-enough shell setter; only the intent drives this.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [intent])
	useEffect(() => () => assemblyTimersRef.current.forEach((timer) => window.clearTimeout(timer)), [])
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
					<button type="button" className="is-attention" onClick={() => setView("approvals")}><ShieldCheck size={15} /><span><strong>{!approved ? "Approve workspace boundary" : deployPending ? "Approve the release" : "No decisions waiting"}</strong><small>{!approved ? "Exact repository authority" : deployPending ? `Artifact ${deployRequest?.artifact} · release owner` : "MAX is continuing"}</small></span>{pendingDecisions ? <b>{pendingDecisions}</b> : <Check size={13} />}</button>
					<span>Completed</span>
					<div className="aex-rail-static"><CheckCircle size={15} /><span><strong>Auth policy hardening</strong><small>Verified yesterday</small></span></div>
				</nav>
				<footer><span><i />max-ai-platform</span><small>main · local workspace</small></footer>
			</aside>

			<main className="aex-home-main">
				<header className="aex-home-bar">
					<button type="button" className="aex-mobile-brand" aria-label="Return to MAXION" onClick={() => onNavigate("dashboard")}><MaxionSpiralMark className="aex-brand-mark" /><span>Execute</span></button>
					<div><button type="button" onClick={() => onNavigate("integrations")}><Plug size={15} />Tools</button><button type="button" aria-label="Open Execute notifications" onClick={() => setView("approvals")}><BellRinging size={16} /></button><button type="button" onClick={() => setView("approvals")}><ShieldCheck size={15} />{pendingDecisions ? `${pendingDecisions} decision${pendingDecisions === 1 ? "" : "s"}` : "Clear"}</button></div>
				</header>
				<div className="aex-mobile-switcher" aria-label="Execute shortcuts"><button type="button" onClick={() => setView("engagements")}>New task</button><button type="button" onClick={() => setView("approvals")}>{pendingDecisions ? "Decision needed" : "No decisions"}</button></div>

				{assemblyStep >= 0 ? (
					<div className={`aex-assembly${assemblyStep > EXECUTE_TASKS.length ? " is-clearing" : ""}`} aria-hidden="true">
						<div className="aex-assembly-inner">
							<header><FlowArrow size={16} /><span><strong>Carving the plan into workspaces</strong><small>ERP modernization delivery plan · 5 flows · 17 packages</small></span></header>
							<div className="aex-assembly-grid">
								{EXECUTE_TASKS.map((task, index) => <div key={task.id} className={`aex-assembly-card${index < assemblyStep ? " is-in" : ""}`}><span>Workspace {String(index + 1).padStart(2, "0")}</span><strong>{task.title}</strong><i>execute/erp/{task.id}</i></div>)}
							</div>
						</div>
					</div>
				) : null}
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
						<div className="aex-approval-heading"><span><ShieldCheck size={18} /></span><small>Authority boundary</small><h1>{pendingDecisions === 0 ? "All caught up" : pendingDecisions === 1 ? "One decision needs you" : "Two decisions need you"}</h1><p>{pendingDecisions === 0 ? "MAX can continue without your input." : !approved ? "MAX prepared the workspace topology. Approve the exact repository boundary so it can continue autonomously." : "The engagement is verified, and the release owner’s decision is the only thing left."}</p></div>
						{approved ? null : <article><header><span>Repository authority</span><strong>ERP modernization delivery</strong></header><dl><div><dt>Repository</dt><dd>max-ai-platform</dd></div><div><dt>Workspaces</dt><dd>5 isolated</dd></div><div><dt>Allowed effect</dt><dd>Files, terminal, tests</dd></div><div><dt>Deployment</dt><dd>Not granted</dd></div></dl>{scopeOpen ? <div className="aex-scope-detail"><span>Exact workspace binding</span>{EXECUTE_TASKS.map((task, index) => <div key={task.id}><code>execute/erp/{task.id}</code><small>Workspace {String(index + 1).padStart(2, "0")} · {task.title} · {task.files} allowed paths</small></div>)}</div> : null}<footer><button type="button" aria-expanded={scopeOpen} onClick={() => setScopeOpen((open) => !open)}>{scopeOpen ? "Hide scope" : "Inspect scope"}</button><button type="button" className="aex-approve" onClick={() => setApproved(true)}>Approve binding<ArrowRight size={14} /></button></footer></article>}
						{deployRequest ? <article className="aex-release-approval"><header><span>Release approval</span><strong>Deployment approval · {deployRequest.title}</strong></header><dl><div><dt>Artifact</dt><dd>{deployRequest.artifact}</dd></div><div><dt>Requested</dt><dd>Root Admin · {deployRequest.requestedAt ?? "just now"}</dd></div><div><dt>Evidence</dt><dd>41 E2E scenarios passed · rollback retained</dd></div><div><dt>Routed approver</dt><dd>Elena Ortiz · Release approver</dd></div></dl><footer>{deployRequest.approved ? <span className="aex-release-approved"><CheckCircle size={15} weight="fill" />Elena Ortiz approved · production sequence unlocked</span> : <button type="button" className="aex-approve" onClick={onApproveDeploy}>Record Elena’s approval<ArrowRight size={14} /></button>}</footer></article> : null}
						{pendingDecisions === 0 ? <div className="aex-approval-clear"><CheckCircle size={22} />No pending approvals</div> : null}
					</motion.section>
				)}
			</main>
		</div>
	)
}

// One row per Agentix case waiting on an approval, named for its engagement and case. Inspect
// opens the engagement that owns the case; Review decision opens the case itself.
function ApprovalInbox({ approvals, onOpenAgentix }: { approvals: AgentixPendingCase[]; onOpenAgentix: (intent: AgentixIntent) => void }) {
	return (
		<section className="ds-scope mxp-approvals" aria-label="Pending approvals">
			{approvals.length ? (
				<Card title="Pending approvals" count={approvals.length} description="Agentix stopped before each effect. Each opens with its exact change, owner and evidence.">
					<div className="ds-list">
						{approvals.map((item) => (
							<article key={item.id} className="ds-list-row mxp-approval-row" aria-label={`${item.title} · ${item.reference}`}>
								<span className="ds-list-row-mark"><Mark seed={item.agentId} size="sm" /></span>
								<span className="ds-list-row-main"><strong>{item.title}</strong><small>{item.engagement} · {item.reference}</small></span>
								<span className="ds-list-row-action mxp-approval-actions">
									<Button variant="ghost" size="sm" aria-label={`Inspect ${item.engagement}`} onClick={() => onOpenAgentix({ type: "engagement", id: item.agentId })}>Inspect</Button>
									<Button variant="primary" size="sm" aria-label={`${agentixCaseAction(item)} · ${item.reference}`} onClick={() => onOpenAgentix(agentixCaseIntent(item))}>{agentixCaseAction(item)}<ArrowRight aria-hidden="true" /></Button>
								</span>
							</article>
						))}
					</div>
				</Card>
			) : (
				// Nothing waiting is one quiet line, not an empty bordered card.
				<EmptyState className="mxp-approvals-empty" icon={<CheckCircle weight="fill" />} title="All caught up">No approvals are waiting for you.</EmptyState>
			)}
		</section>
	)
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
	// Disconnecting is destructive and irreversible from this surface, so it is an explicit
	// affordance with a confirm beat in the row — never a kebab that fires on first click.
	const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
	const filtered = integrations.filter((integration) => `${integration.name} ${integration.category}`.toLowerCase().includes(query.trim().toLowerCase()))
	const categories = Array.from(new Set(filtered.map((integration) => integration.category)))
	const connect = (integration: IntegrationRecord) => {
		setIntegrations((items) => items.map((item) => item.id === integration.id ? { ...item, connected: true, account: `${item.name} workspace`, health: "Healthy" } : item))
		setMessage(`${integration.name} connected.`)
	}
	const disconnect = (integration: IntegrationRecord) => {
		setIntegrations((items) => items.map((item) => item.id === integration.id ? { ...item, connected: false, account: "Not connected", health: "Healthy" } : item))
		setDisconnectingId(null)
		setMessage(`${integration.name} disconnected. Access ended immediately and the change is recorded in the access log.`)
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
				{categories.map((category) => <section key={category} className="mxp-portal-card mxp-integration-category"><header><div><span><Plug size={17} weight="duotone" /></span><div><h2>{category}</h2><p>{category === "CRM" ? "Customer records and commercial workflows" : category === "File storage" ? "Documents, evidence, and collaborative files" : category === "Ticketing" ? "Delivery issues, approvals, and operating queues" : category === "HRIS" ? "People, roles, and workforce records" : "Financial and inventory systems"}</p></div></div><small>{filtered.filter((item) => item.category === category && item.connected).length} connected</small></header><div>{filtered.filter((item) => item.category === category).map((integration) => <article key={integration.id}><span className="mxp-integration-logo">{integration.name.split(/\s/).map((part) => part[0]).join("").slice(0, 2)}</span><div><span><strong>{integration.name}</strong>{integration.connected ? <i className={integration.health === "Healthy" ? "is-healthy" : "is-attention"}>{integration.health}</i> : <i>Available</i>}</span><p>{integration.connected ? integration.account : `Connect through ${integration.provider}`}</p><small>{integration.provider}{integration.connected ? ` · ${integration.scope}` : ""}</small></div><div>{!integration.connected ? <button type="button" className="mxp-primary" onClick={() => connect(integration)}>Connect</button> : disconnectingId === integration.id ? <span className="mxp-disconnect-confirm" role="group" aria-label={`Confirm disconnecting ${integration.name}`}><small><WarningCircle size={13} />MAX loses this context immediately.</small><button type="button" onClick={() => setDisconnectingId(null)}>Keep connected</button><button type="button" className="mxp-disconnect-go" onClick={() => disconnect(integration)}>Disconnect</button></span> : <><button type="button" disabled={testingId === integration.id} onClick={() => test(integration)}>{testingId === integration.id ? "Testing…" : "Test"}</button><button type="button" onClick={() => setSelected(integration)}>Scopes</button><button type="button" aria-label={`Disconnect ${integration.name}`} onClick={() => setDisconnectingId(integration.id)}>Disconnect</button></>}</div></article>)}</div></section>)}
			</div>
			<div className="mxp-live-message" aria-live="polite">{message}</div>
			{selected ? <><button type="button" className="mxp-panel-scrim" aria-label="Close integration scopes" onClick={() => setSelected(null)} /><aside className="mxp-integration-panel" aria-label={`${selected.name} available scopes`}><header><div><small>Connection scope</small><h2>{selected.name}</h2></div><button type="button" aria-label="Close integration scopes" onClick={() => setSelected(null)}><X size={17} /></button></header><div><p>Choose which workspace MAX may read through this connection. Provider permissions still apply.</p>{[selected.scope, "Transformation Office", "Finance Operations"].filter((scope, index, all) => all.indexOf(scope) === index).map((scope) => <label key={scope}><input type="radio" name="scope" defaultChecked={scope === selected.scope} /><span><strong>{scope}</strong><small>Authorized workspace scope</small></span></label>)}<button type="button" className="mxp-primary" onClick={() => { setMessage(`${selected.name} scope saved.`); setSelected(null) }}>Save scope</button></div></aside></> : null}
			{accessLogOpen ? <><button type="button" className="mxp-panel-scrim" aria-label="Close access log" onClick={() => setAccessLogOpen(false)} /><aside className="mxp-integration-panel" aria-label="Integration access log"><header><div><small>Immutable audit trail</small><h2>Integration access log</h2></div><button type="button" aria-label="Close access log" onClick={() => setAccessLogOpen(false)}><X size={17} /></button></header><div className="mxp-access-log"><p><Database size={15} /><span><strong>Salesforce records read</strong><small>Discovery · Root Admin · 8 minutes ago</small></span></p><p><ShieldCheck size={15} /><span><strong>SAP connection tested</strong><small>Tenant admin · 31 minutes ago</small></span></p><p><Plug size={15} /><span><strong>QuickBooks scope updated</strong><small>Tenant admin · Yesterday</small></span></p></div></aside></> : null}
		</div>
	)
}

// Help answers live beside their titles: a row that only rotates a chevron teaches nothing.
const HELP_TOPICS = [
	{ title: "Create and manage projects", answer: "A project holds its members, its linked Discovery and Plan work, and its activity trail. Create one from Projects → Create Project. Archiving hides the workspace and keeps every piece of evidence attached to it." },
	{ title: "Run an autonomous Discovery", answer: "Start from Discover → New Discovery and give MAX a brief. It researches, interviews owners, and stops at any boundary it is not authorized to cross — an external interview always waits for your approval." },
	{ title: "Move a Plan into Execute", answer: "A plan becomes sendable once its implementation boundary is approved. Send to Execute carries the evidence snapshot with it, and Execute carves the plan into isolated workspaces before it touches anything." },
	{ title: "Manage integration permissions", answer: "Connections stay user- and tenant-scoped. Scopes controls which workspace MAX may read through a connection, and every read is written to the integration access log." },
	{ title: "Govern Agentix approvals", answer: "Agentix agents work inside a bounded authority and stop when an effect needs a person. An approval shows the exact effects, their value, and the systems they touch before anything is posted." },
] as const

export function AccountUtilityModule({
	module,
	onNavigate,
	approvals = [],
	onOpenAgentix,
}: {
	module: "settings" | "approvals" | "usage" | "help"
	onNavigate: Navigate
	// The Agentix cases waiting on an approval, as Agentix reports them. This surface lists
	// and routes to them; it never keeps a second copy that can disagree with the agent.
	approvals?: AgentixPendingCase[]
	onOpenAgentix?: (intent: AgentixIntent) => void
}) {
	const [helpQuery, setHelpQuery] = useState("")
	const [openTopic, setOpenTopic] = useState<string | null>(null)
	const helpMatches = HELP_TOPICS.filter((topic) => `${topic.title} ${topic.answer}`.toLowerCase().includes(helpQuery.trim().toLowerCase()))
	const config = module === "settings" ? { icon: GearSix, eyebrow: "Account", title: "Settings", description: "Manage workspace identity, governance, notifications, and security." } : module === "approvals" ? { icon: ShieldCheck, eyebrow: "Governance", title: "My approvals", description: "Material decisions waiting for your explicit authority." } : module === "usage" ? { icon: ChartBar, eyebrow: "Account", title: "Usage", description: "Review workspace units and activity for the current billing cycle." } : { icon: Question, eyebrow: "Support", title: "Help", description: "Find guidance for MAXION workflows and platform administration." }
	const Icon = config.icon
	return <div className="mxp-portal-page mxp-utility-page"><PortalPageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} />{module === "settings" ? <section className="mxp-portal-card mxp-settings-card"><header><span><Icon size={18} /></span><div><h2>Workspace defaults</h2><p>Controls apply across MAXION modules.</p></div></header><label><span><strong>Agent notifications</strong><small>Notify owners when an autonomous run needs intervention.</small></span><input type="checkbox" defaultChecked /></label><label><span><strong>Weekly operating brief</strong><small>Send a verified summary every Monday.</small></span><input type="checkbox" defaultChecked /></label><button type="button" onClick={() => onNavigate("integrations")}><Plug size={15} />Manage integrations<ArrowRight size={14} /></button></section> : module === "approvals" ? <ApprovalInbox approvals={approvals} onOpenAgentix={(intent) => onOpenAgentix ? onOpenAgentix(intent) : onNavigate("agentix")} /> : module === "usage" ? <section className="mxp-usage-layout"><div className="mxp-usage-ring" style={{ "--mxp-usage-arc": `${WORKSPACE_UNITS_PERCENT}%` } as CSSProperties}><strong>{WORKSPACE_UNITS_PERCENT}%</strong><span>of workspace units used</span><small>{workspaceUnitsLabel(WORKSPACE_UNITS_USED)} of {workspaceUnitsLabel(WORKSPACE_UNIT_CAP)} units · resets {WORKSPACE_CYCLE_RESET}</small></div><div className="mxp-portal-card"><h2>Current cycle</h2><dl>{WORKSPACE_USAGE_ROWS.map((row) => <div key={row.module}><dt>{row.module}</dt><dd>{workspaceUnitsLabel(row.units)} units<span className="mxp-usage-bar" aria-hidden="true"><i style={{ width: `${Math.round((row.units / WORKSPACE_UNITS_USED) * 100)}%` }} /></span></dd></div>)}</dl><p className="mxp-usage-total"><ChartBar size={13} />{workspaceUnitsLabel(WORKSPACE_UNIT_CAP - WORKSPACE_UNITS_USED)} units remain before the cycle resets on {WORKSPACE_CYCLE_RESET}.</p></div></section> : <section className="mxp-help-layout"><label><MagnifyingGlass size={16} /><input aria-label="Search help" value={helpQuery} onChange={(event) => { setHelpQuery(event.target.value); setOpenTopic(null) }} placeholder="Search MAXION help" /></label>{helpMatches.map((topic) => <div className="mxp-help-topic" key={topic.title}><button type="button" aria-expanded={openTopic === topic.title} onClick={() => setOpenTopic((current) => current === topic.title ? null : topic.title)}><Question size={15} /><span>{topic.title}</span><CaretRight size={13} /></button>{openTopic === topic.title ? <p>{topic.answer}</p> : null}</div>)}{helpMatches.length === 0 ? <p className="mxp-help-empty">No help topic matches “{helpQuery.trim()}”. Ask Consult MAX instead — it answers from the live workspace rather than a static article.</p> : null}</section>}</div>
}
