import {
	ArrowRight,
	CaretRight,
	ChartBar,
	CheckCircle,
	Database,
	FileText,
	GearSix,
	MagnifyingGlass,
	Plug,
	Question,
	ShieldCheck,
	WarningCircle,
	X,
} from "@phosphor-icons/react"
import { useState, type CSSProperties, type ReactNode } from "react"

import {
	WORKSPACE_CYCLE_RESET,
	WORKSPACE_UNIT_CAP,
	WORKSPACE_UNITS_PERCENT,
	WORKSPACE_UNITS_USED,
	WORKSPACE_USAGE_ROWS,
	workspaceUnitsLabel,
	type MaxionModuleId,
} from "./model"

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
	approvalOpen = false,
	onOpenApproval,
}: {
	module: "settings" | "approvals" | "usage" | "help"
	onNavigate: Navigate
	// The one open approval is Agentix's July close decision. This surface reports it and
	// routes to it; it never keeps a second copy that can disagree with the agent.
	approvalOpen?: boolean
	onOpenApproval?: () => void
}) {
	const [helpQuery, setHelpQuery] = useState("")
	const [openTopic, setOpenTopic] = useState<string | null>(null)
	const helpMatches = HELP_TOPICS.filter((topic) => `${topic.title} ${topic.answer}`.toLowerCase().includes(helpQuery.trim().toLowerCase()))
	const config = module === "settings" ? { icon: GearSix, eyebrow: "Account", title: "Settings", description: "Manage workspace identity, governance, notifications, and security." } : module === "approvals" ? { icon: ShieldCheck, eyebrow: "Governance", title: "My approvals", description: "Material decisions waiting for your explicit authority." } : module === "usage" ? { icon: ChartBar, eyebrow: "Account", title: "Usage", description: "Review workspace units and activity for the current billing cycle." } : { icon: Question, eyebrow: "Support", title: "Help", description: "Find guidance for MAXION workflows and platform administration." }
	const Icon = config.icon
	return <div className="mxp-portal-page mxp-utility-page"><PortalPageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} />{module === "settings" ? <section className="mxp-portal-card mxp-settings-card"><header><span><Icon size={18} /></span><div><h2>Workspace defaults</h2><p>Controls apply across MAXION modules.</p></div></header><label><span><strong>Agent notifications</strong><small>Notify owners when an autonomous run needs intervention.</small></span><input type="checkbox" defaultChecked /></label><label><span><strong>Weekly operating brief</strong><small>Send a verified summary every Monday.</small></span><input type="checkbox" defaultChecked /></label><button type="button" onClick={() => onNavigate("integrations")}><Plug size={15} />Manage integrations<ArrowRight size={14} /></button></section> : module === "approvals" ? <section className="mxp-approval-inbox"><header><div><h2>Pending decisions</h2><p>Approvals preserve the exact effect, owner, and evidence.</p></div><StatusSummary approved={!approvalOpen} /></header>{!approvalOpen ? <div className="mxp-approval-empty"><CheckCircle size={26} /><h3>All caught up</h3><p>No approvals are waiting for you.</p></div> : <article><span><ShieldCheck size={19} /></span><div><small>Agentix · Invoice exception</small><h3>Review a $240 invoice price variance</h3><p>Invoice INV-20841 v2 · price variance only. Payment release remains outside this initiative. Review the exact evidence and decision in Agentix.</p></div><div><button type="button" onClick={() => onNavigate("agentix")}>Inspect</button><button type="button" className="mxp-primary" onClick={() => onOpenApproval ? onOpenApproval() : onNavigate("agentix")}>Review invoice variance</button></div></article>}</section> : module === "usage" ? <section className="mxp-usage-layout"><div className="mxp-usage-ring" style={{ "--mxp-usage-arc": `${WORKSPACE_UNITS_PERCENT}%` } as CSSProperties}><strong>{WORKSPACE_UNITS_PERCENT}%</strong><span>of workspace units used</span><small>{workspaceUnitsLabel(WORKSPACE_UNITS_USED)} of {workspaceUnitsLabel(WORKSPACE_UNIT_CAP)} units · resets {WORKSPACE_CYCLE_RESET}</small></div><div className="mxp-portal-card"><h2>Current cycle</h2><dl>{WORKSPACE_USAGE_ROWS.map((row) => <div key={row.module}><dt>{row.module}</dt><dd>{workspaceUnitsLabel(row.units)} units<span className="mxp-usage-bar" aria-hidden="true"><i style={{ width: `${Math.round((row.units / WORKSPACE_UNITS_USED) * 100)}%` }} /></span></dd></div>)}</dl><p className="mxp-usage-total"><ChartBar size={13} />{workspaceUnitsLabel(WORKSPACE_UNIT_CAP - WORKSPACE_UNITS_USED)} units remain before the cycle resets on {WORKSPACE_CYCLE_RESET}.</p></div></section> : <section className="mxp-help-layout"><label><MagnifyingGlass size={16} /><input aria-label="Search help" value={helpQuery} onChange={(event) => { setHelpQuery(event.target.value); setOpenTopic(null) }} placeholder="Search MAXION help" /></label>{helpMatches.map((topic) => <div className="mxp-help-topic" key={topic.title}><button type="button" aria-expanded={openTopic === topic.title} onClick={() => setOpenTopic((current) => current === topic.title ? null : topic.title)}><Question size={15} /><span>{topic.title}</span><CaretRight size={13} /></button>{openTopic === topic.title ? <p>{topic.answer}</p> : null}</div>)}{helpMatches.length === 0 ? <p className="mxp-help-empty">No help topic matches “{helpQuery.trim()}”. Ask Consult MAX instead — it answers from the live workspace rather than a static article.</p> : null}</section>}</div>
}
