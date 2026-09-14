import {
	ArrowClockwise,
	ArrowRight,
	ChartBar,
	Check,
	CheckCircle,
	Database,
	Lifebuoy,
	MagnifyingGlass,
	Plug,
	ShieldCheck,
	WarningCircle,
	X,
} from "@phosphor-icons/react"
import { useEffect, useMemo, useState, type ReactNode } from "react"

import type { AgentixAttention, MaxionModuleId, PortalProject } from "./contracts"
import {
	buildUsageRecords,
	decideAdministrativeApproval,
	persistAdministrationState,
	persistApprovalOperations,
	readAdministrationState,
	readApprovalOperations,
	savePreferences,
	saveUsageAlert,
	searchHelpResults,
	selectAdministrativeApprovals,
	selectProjectIntegrations,
	selectUsageWindow,
	updateIntegration,
	validatePreferences,
	type AdministrativeApproval,
	type AdministrationState,
	type HelpResult,
	type IntegrationDescriptor,
	type UserPreference,
} from "./administrationState"
import { WORKSPACE_CYCLE_RESET, WORKSPACE_UNIT_CAP, WORKSPACE_UNITS_USED, workspaceUnitsLabel } from "./model"
import "./administration.css"

type Navigate = (module: MaxionModuleId) => void
type AdministrationModuleId = Extract<MaxionModuleId, "settings" | "integrations" | "approvals" | "usage" | "help">

const TITLES: Record<AdministrationModuleId, { eyebrow: string; title: string; summary: string; lead: string }> = {
	settings: { eyebrow: "Settings", title: "Workspace controls", summary: "Saved changes remain attributable and recoverable.", lead: "Set the defaults once." },
	integrations: { eyebrow: "Integrations", title: "Connected systems", summary: "Principals, scopes, health, and recovery stay visible.", lead: "Know who is connected—and what they can do." },
	approvals: { eyebrow: "My approvals", title: "Decisions assigned to you", summary: "Only bounded approvals assigned to you appear here.", lead: "Decide with the whole consequence in view." },
	usage: { eyebrow: "Usage", title: "Workspace units", summary: `${Math.round((WORKSPACE_UNITS_USED / WORKSPACE_UNIT_CAP) * 100)}% used · resets ${WORKSPACE_CYCLE_RESET}`, lead: "Usage in the unit people can act on." },
	help: { eyebrow: "Help", title: "Guidance in context", summary: "Systems operational · workspace context attached.", lead: "Get unstuck without leaving the work." },
}

function commandId(prefix: string) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ModuleHeader({ module, primary }: { module: AdministrationModuleId; primary?: ReactNode }) {
	const content = TITLES[module]
	return <header className="adm-header"><div><small>{content.eyebrow}</small><h2>{content.title}</h2><span>{content.summary}</span></div>{primary}</header>
}

function SurfaceIntro({ module, description }: { module: AdministrationModuleId; description: string }) {
	return <div className="adm-intro"><small>{module === "approvals" ? "APPROVALS · YOUR QUEUE" : module === "usage" ? "UNITS · CAPACITY" : module === "help" ? "HELP · RECOVERY" : module === "integrations" ? "CONNECTIONS · HEALTH" : "ACCOUNT · WORKSPACE"}</small><h1>{TITLES[module].lead}</h1><p>{description}</p></div>
}

function StatusBadge({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info"; children: ReactNode }) {
	return <span className={`adm-badge is-${tone}`}>{children}</span>
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return <button type="button" className="adm-primary" {...props}>{children}</button>
}

function SettingsModule() {
	const [state, setState] = useState<AdministrationState>(() => readAdministrationState())
	const [draft, setDraft] = useState<UserPreference>(state.preferences)
	const [notice, setNotice] = useState("")
	const [selected, setSelected] = useState<"profile" | "notifications" | "security">("profile")
	const validation = validatePreferences(draft)
	const dirty = JSON.stringify(draft) !== JSON.stringify(state.preferences)
	const save = () => {
		const latest = readAdministrationState()
		const outcome = savePreferences(latest, draft, commandId("settings"))
		if (outcome.result === "invalid") { setNotice("Fix the highlighted field. Your draft is preserved."); return }
		if (outcome.result !== "saved" || !persistAdministrationState(outcome.state)) { setNotice("Settings could not be saved. Your valid draft is still here—try again."); return }
		setState(outcome.state)
		setDraft(outcome.state.preferences)
		setNotice(`Saved by Root Admin · ${outcome.state.auditReceipt}`)
	}
	return <div className="adm-root">
		<ModuleHeader module="settings" primary={<PrimaryButton disabled={!dirty || Object.keys(validation.errors).length > 0} onClick={save}>Save changes</PrimaryButton>} />
		<main className="adm-body">
			<SurfaceIntro module="settings" description="Identity, notifications, and security stay explicit without turning routine work into configuration." />
			<div className="adm-toolbar"><label><MagnifyingGlass /><span className="sr-only">Find a setting</span><input value="Workspace settings" readOnly /></label><StatusBadge tone={Object.keys(validation.errors).length ? "danger" : dirty ? "warning" : "success"}>{Object.keys(validation.errors).length ? "INVALID DRAFT" : dirty ? "UNSAVED" : "SAVED"}</StatusBadge><StatusBadge tone="warning">ADMIN ONLY</StatusBadge></div>
			<div className="adm-grid">
				<section className="adm-list" aria-label="Settings groups"><header><h2>Settings</h2><p>Select a group to keep its state and actions attached.</p></header>
					<button className={selected === "profile" ? "is-selected" : ""} onClick={() => setSelected("profile")}><span><strong>Workspace profile</strong><small>{draft.workspaceName} · {draft.timeZone.replace("_", " ")}</small></span><StatusBadge tone="success">READY</StatusBadge></button>
					<button className={selected === "notifications" ? "is-selected" : ""} onClick={() => setSelected("notifications")}><span><strong>Notifications</strong><small>Intervention alerts · daily digest {draft.digestHour}</small></span><StatusBadge tone="accent">ACTIVE</StatusBadge></button>
					<button className={selected === "security" ? "is-selected" : ""} onClick={() => setSelected("security")}><span><strong>Security boundary</strong><small>SSO required · 8-hour administrator session</small></span><StatusBadge tone="success">ENFORCED</StatusBadge></button>
					<div className="adm-static-row"><span><strong>Data region</strong><small>US East · changes require a reviewed migration</small></span><StatusBadge tone="warning">LOCKED</StatusBadge></div>
				</section>
				<section className="adm-detail" aria-label="Selected setting">
					<StatusBadge tone="accent">SELECTED</StatusBadge>
					<h2>{selected === "profile" ? "Workspace profile" : selected === "notifications" ? "Notification defaults" : "Security boundary"}</h2>
					<p>Valid changes are preserved if saving fails.</p>
					{selected === "profile" ? <div className="adm-form">
						<label><span>Workspace name</span><input aria-label="Workspace name" value={draft.workspaceName} aria-invalid={Boolean(validation.errors.workspaceName)} onChange={event => setDraft(current => ({ ...current, workspaceName: event.target.value }))} maxLength={100} />{validation.errors.workspaceName ? <small className="is-error">{validation.errors.workspaceName}</small> : <small>Shown throughout this tenant.</small>}</label>
						<label><span>Time zone</span><select value={draft.timeZone} onChange={event => setDraft(current => ({ ...current, timeZone: event.target.value as UserPreference["timeZone"] }))}><option value="America/New_York">America / New York</option><option value="America/Los_Angeles">America / Los Angeles</option><option value="Europe/London">Europe / London</option></select></label>
						<label><span>Daily digest</span><select value={draft.digestHour} onChange={event => setDraft(current => ({ ...current, digestHour: event.target.value as UserPreference["digestHour"] }))}><option>08:00</option><option>09:00</option><option>17:00</option></select></label>
					</div> : selected === "notifications" ? <div className="adm-toggle-list">
						<label><span><strong>Agent intervention alerts</strong><small>Notify owners when a run needs a person.</small></span><input type="checkbox" checked={draft.agentNotifications} onChange={event => setDraft(current => ({ ...current, agentNotifications: event.target.checked }))} /></label>
						<label><span><strong>Weekly operating brief</strong><small>Send a verified summary every Monday.</small></span><input type="checkbox" checked={draft.weeklyBrief} onChange={event => setDraft(current => ({ ...current, weeklyBrief: event.target.checked }))} /></label>
					</div> : <div className="adm-facts"><span>Single sign-on · required for administrators</span><span>Session duration · 8 hours</span><span>Audit retention · 365 days</span><span>Region · US East</span></div>}
					<div className="adm-actions"><button type="button" disabled={!dirty || Object.keys(validation.errors).length > 0} onClick={save}>Save changes</button><button type="button" onClick={() => setDraft(state.preferences)}>Discard draft</button></div>
					<div className="adm-recovery"><small>SAFE RECOVERY</small><p>{notice || `Audit · ${state.auditReceipt}`}</p></div>
				</section>
			</div>
		</main>
	</div>
}

function IntegrationsModule({ project }: { project: PortalProject | null }) {
	const [state, setState] = useState<AdministrationState>(() => readAdministrationState())
	const [query, setQuery] = useState("")
	const [attentionOnly, setAttentionOnly] = useState(false)
	const [selectedId, setSelectedId] = useState("slack")
	const [confirmDisconnect, setConfirmDisconnect] = useState(false)
	const [notice, setNotice] = useState("")
	const projectId = project?.id ?? ""
	const canManage = project?.role === "Owner"
	const integrations = selectProjectIntegrations(state, projectId)
	const filtered = integrations.filter(item => (!attentionOnly || item.health === "degraded") && `${item.name} ${item.principal} ${item.scopes.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()))
	const selected = integrations.find(item => item.id === selectedId) ?? integrations[0]
	useEffect(() => { setState(readAdministrationState()); setSelectedId("slack"); setConfirmDisconnect(false) }, [projectId])
	const mutate = (item: IntegrationDescriptor, action: "test" | "reconnect" | "disconnect") => {
		const latest = readAdministrationState()
		const next = updateIntegration(latest, item.projectId, project?.role, item.id, action, commandId(`integration-${action}`))
		if (next === latest || !persistAdministrationState(next)) { setNotice("The connection did not change. Existing access and drafts are preserved—try again."); return }
		setState(next)
		setConfirmDisconnect(false)
		setNotice(action === "disconnect" ? `${item.name} disconnected. Existing product work remains available.` : action === "reconnect" ? `${item.name} reconnected without widening its scope.` : `${item.name} health check passed.`)
	}
	return <div className="adm-root">
		<ModuleHeader module="integrations" primary={<button type="button" disabled={!canManage} onClick={() => setNotice("Provider setup is ready. Choose a provider; credentials are never stored in this demo.")}>Add connection</button>} />
		<main className="adm-body"><SurfaceIntro module="integrations" description="Principals, scopes, health, and recovery stay visible before any module uses a connected system." />
			<div className="adm-toolbar"><label><MagnifyingGlass /><span className="sr-only">Search systems or principals</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search systems or principals" /></label><button aria-pressed={attentionOnly} onClick={() => setAttentionOnly(value => !value)}>Needs action</button><StatusBadge tone="success">{integrations.filter(item => item.health === "healthy").length} HEALTHY</StatusBadge></div>
			<div className="adm-grid"><section className="adm-list" aria-label="Connections"><header><h2>Connections</h2><p>{project ? `${project.name} · project-scoped access` : "Select a project to inspect connections."}</p></header>
				{filtered.map(item => <button key={item.id} className={selected?.id === item.id ? "is-selected" : ""} onClick={() => { setSelectedId(item.id); setConfirmDisconnect(false) }}><span><strong>{item.name}</strong><small>{item.principal} · {item.scopes.join(" · ") || "No active scope"}</small></span><StatusBadge tone={item.health === "healthy" ? "success" : item.health === "degraded" ? "warning" : "neutral"}>{item.health === "degraded" ? "EXPIRES IN 2D" : item.health.toUpperCase()}</StatusBadge></button>)}
				{!filtered.length ? <div className="adm-empty"><Plug /><strong>No matching connection</strong><p>Clear the filter or add a governed connection.</p></div> : null}
			</section>
			<section className="adm-detail" aria-label="Selected connection">{selected ? <><StatusBadge tone={selected.health === "degraded" ? "warning" : "accent"}>{selected.health === "degraded" ? "NEEDS ACTION" : "SELECTED"}</StatusBadge><h2>{selected.health === "degraded" ? `Reconnect ${selected.name}` : selected.name}</h2><p>{selected.failureBehavior}</p><div className="adm-facts"><span>Principal · {selected.principal}</span><span>Authority · {selected.scopes.join(" · ") || "none"}</span><span>Provider · {selected.provider}</span><span>Expiry · {selected.expiresAt ?? "No scheduled expiry"}</span></div><div className="adm-actions">{selected.health === "degraded" || selected.health === "disconnected" ? <PrimaryButton disabled={!canManage} onClick={() => mutate(selected, "reconnect")}><ArrowClockwise />Reconnect</PrimaryButton> : <PrimaryButton disabled={!canManage} onClick={() => mutate(selected, "test")}><Check />Test connection</PrimaryButton>}<button onClick={() => setConfirmDisconnect(true)} disabled={!canManage || selected.health === "disconnected"}>Disconnect</button></div>{confirmDisconnect ? <div className="adm-confirm" role="alertdialog" aria-label={`Disconnect ${selected.name}`}><WarningCircle /><div><strong>End this connection?</strong><p>MAX loses this project context immediately. No product record is deleted.</p></div><button onClick={() => setConfirmDisconnect(false)}>Keep connected</button><button className="is-danger" onClick={() => mutate(selected, "disconnect")}>Disconnect</button></div> : null}<div className="adm-recovery"><small>SAFE RECOVERY</small><p>{notice || (canManage ? "No scope or recipient authority widens during reconnection." : "Viewer and member access is read-only. A project owner must change connections.")}</p></div></> : <div className="adm-empty"><Database /><strong>No project selected</strong><p>Select a project to inspect connection authority.</p></div>}</section></div>
		</main>
	</div>
}

function ApprovalsModule({ project, onNavigate, onAttentionChange, onOpenApproval }: { project: PortalProject | null; onNavigate: Navigate; onAttentionChange: (attention: AgentixAttention) => void; onOpenApproval: () => void }) {
	const [operations, setOperations] = useState(() => readApprovalOperations(project))
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [amending, setAmending] = useState(false)
	const [amendment, setAmendment] = useState("")
	const [notice, setNotice] = useState("")
	useEffect(() => { const next = readApprovalOperations(project); setOperations(next); setSelectedId(null); setNotice("") }, [project])
	const approvals = selectAdministrativeApprovals(operations, project)
	const canDecide = project?.role === "Owner" && operations.role === "owner"
	const selected = approvals.find(item => item.id === selectedId) ?? approvals[0]
	const decide = (approval: AdministrativeApproval, decision: "approve" | "amend" | "reject" | "refresh") => {
		const next = decideAdministrativeApproval(operations, approval, decision, commandId(`approval-${decision}`), amendment)
		if (next === operations || next.notice) { setOperations(next); setNotice(next.notice ?? "This decision did not change."); return }
		setOperations(next)
		onAttentionChange(persistApprovalOperations(next))
		setAmending(false)
		setAmendment("")
		setNotice(decision === "approve" ? `${approval.object} approved for the stated variance only.` : decision === "reject" ? `${approval.object} rejected. No write was dispatched.` : decision === "amend" ? `Amendment attached to ${approval.object}; the proposal remains held.` : `${approval.object} refreshed to the current deployment version.`)
	}
	return <div className="adm-root"><ModuleHeader module="approvals" primary={<button type="button" disabled={!selected} onClick={() => selected && setSelectedId(selected.id)}>Review next</button>} />
		<main className="adm-body"><SurfaceIntro module="approvals" description="Questions remain in their owning workspace. This queue contains only bounded approvals assigned to you." />
			<div className="adm-toolbar"><label><ShieldCheck /><input aria-label="Approval filter" value="Assigned to me · Pending" readOnly /></label><StatusBadge tone="warning">PENDING {approvals.length}</StatusBadge><StatusBadge tone="danger">DUE TODAY {approvals.filter(item => item.due.startsWith("Today")).length}</StatusBadge></div>
			<div className="adm-grid"><section className="adm-list" aria-label="Assigned approvals"><header><h2>Assigned to me</h2><p>Oldest due approval appears first.</p></header>{approvals.map(item => <button key={item.id} className={selected?.id === item.id ? "is-selected" : ""} onClick={() => setSelectedId(item.id)}><span><strong>Approve {item.object} effects</strong><small>Agentix · v{item.objectVersion} · exact consequence attached</small></span><StatusBadge tone={item.status === "stale" ? "danger" : "warning"}>{item.status === "stale" ? "STALE" : "DUE TODAY"}</StatusBadge></button>)}{!approvals.length ? <div className="adm-empty"><CheckCircle /><strong>{canDecide ? "All caught up" : "Owner decision required"}</strong><p>{canDecide ? "No bounded approval is waiting for you." : "This project is read-only here. Approvals stay with its owner."}</p><button onClick={() => onNavigate("agentix")}>Open Agentix activity</button></div> : null}</section>
			<section className="adm-detail" aria-label="Selected approval">{selected ? <><StatusBadge tone={selected.status === "stale" ? "danger" : "accent"}>{selected.status === "stale" ? "STALE" : "SELECTED"}</StatusBadge><h2>{selected.object} · proposed effects</h2><p>{selected.consequence}</p><div className="adm-facts"><span>Object · {selected.object} v{selected.objectVersion}</span><span>Principal · {selected.principal}</span>{selected.evidence.map(item => <span key={item}>Evidence · {item}</span>)}<span>Expires · {selected.due}</span></div>{selected.status === "stale" ? <div className="adm-actions"><PrimaryButton onClick={() => decide(selected, "refresh")}>Refresh request</PrimaryButton></div> : <><div className="adm-actions"><PrimaryButton onClick={() => decide(selected, "approve")}>Approve</PrimaryButton><button onClick={() => setAmending(true)}>Amend</button><button className="is-danger-quiet" onClick={() => decide(selected, "reject")}>Reject</button></div>{amending ? <form className="adm-amend" onSubmit={event => { event.preventDefault(); decide(selected, "amend") }}><label><span>Requested amendment</span><textarea value={amendment} onChange={event => setAmendment(event.target.value)} maxLength={160} placeholder="Describe the bounded change…" /></label><div><button type="button" onClick={() => setAmending(false)}>Cancel</button><PrimaryButton type="submit" disabled={!amendment.trim()}>Request amendment</PrimaryButton></div></form> : null}</>}<div className="adm-recovery"><small>DECISION RECEIPT</small><p>{notice || "Reject remains available; every decision writes an attributable event."}</p><button onClick={onOpenApproval}>Open owning Agentix run <ArrowRight /></button></div></> : <div className="adm-empty"><ShieldCheck /><strong>Select an approval</strong><p>Its exact version, evidence, consequence, and authority appear here.</p></div>}</section></div>
		</main>
	</div>
}

const USAGE_SUMMARY = [
	{ module: "Agentix", units: 8140, share: 40 },
	{ module: "Execute", units: 6920, share: 34 },
	{ module: "Discover + Plan", units: 3780, share: 18 },
	{ module: "Consult MAX", units: 1560, share: 8 },
] as const

function UsageModule({ project }: { project: PortalProject | null }) {
	const projectId = project?.id ?? ""
	const records = useMemo(() => buildUsageRecords(projectId), [projectId])
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [offset, setOffset] = useState(0)
	const [administration, setAdministration] = useState<AdministrationState>(() => readAdministrationState())
	const [draftThreshold, setDraftThreshold] = useState(administration.usageAlertThreshold)
	const [editingAlert, setEditingAlert] = useState(false)
	const [notice, setNotice] = useState("")
	const windowed = selectUsageWindow(records, projectId, offset, 25)
	const used = USAGE_SUMMARY.reduce((sum, item) => sum + item.units, 0)
	const saveAlert = () => {
		const latest = readAdministrationState()
		const outcome = saveUsageAlert(latest, draftThreshold, commandId("usage-alert"))
		if (outcome.result !== "saved" || !persistAdministrationState(outcome.state)) { setNotice(outcome.result === "invalid" ? "Choose a threshold from 1 to 100. Your draft is preserved." : "The alert could not be saved. Your draft is preserved—try again."); return }
		setAdministration(outcome.state)
		setDraftThreshold(outcome.state.usageAlertThreshold)
		setEditingAlert(false)
		setNotice(`Alert saved at ${outcome.state.usageAlertThreshold}% · administrators · effective now.`)
	}
	return <div className="adm-root"><ModuleHeader module="usage" primary={<button type="button" onClick={() => setEditingAlert(true)}>Set alert</button>} />
		<main className="adm-body"><SurfaceIntro module="usage" description="Trace consumption by module and project, set warnings, and never expose raw tokens or surprise dollar totals." />
			<div className="adm-toolbar"><label><ChartBar /><input aria-label="Usage scope" value={`1–30 September · ${project?.name ?? "No project"}`} readOnly /></label><StatusBadge tone="warning">{Math.round((used / 30_000) * 100)}% USED</StatusBadge><StatusBadge tone="success">{workspaceUnitsLabel(30_000 - used)} LEFT</StatusBadge></div>
			<div className="adm-grid"><section className="adm-list" aria-label="Usage by module"><header><h2>By module</h2><p>Stable workspace units · current project.</p></header>{USAGE_SUMMARY.map(item => <button key={item.module} onClick={() => setDetailsOpen(true)}><span><strong>{item.module}</strong><small>{workspaceUnitsLabel(item.units)} units · {item.share}% of used</small></span><StatusBadge tone={item.share >= 40 ? "success" : item.share > 10 ? "info" : "neutral"}>{item.share}%</StatusBadge></button>)}</section>
			<section className="adm-detail" aria-label="Usage capacity"><StatusBadge tone="accent">CURRENT CYCLE</StatusBadge><h2>{workspaceUnitsLabel(used)} of 30,000 units</h2><p>Consumption is 4% above the expected pace; active work continues.</p><div className="adm-meter" aria-label={`${Math.round((used / 30_000) * 100)} percent of units used`}><i style={{ width: `${Math.round((used / 30_000) * 100)}%` }} /></div><div className="adm-facts"><span>Alert · administrators at {administration.usageAlertThreshold}%</span><span>Highest project · {project?.name ?? "None selected"} · 8,140 units</span><span>Reset · 1 October · no rollover</span><span>Bound · no unbounded usage query</span></div><div className="adm-actions"><PrimaryButton onClick={() => setEditingAlert(true)}>Set alert</PrimaryButton><button onClick={() => setDetailsOpen(value => !value)}>{detailsOpen ? "Hide records" : "View records"}</button></div>{editingAlert ? <form className="adm-inline-form" onSubmit={event => { event.preventDefault(); saveAlert() }}><label><span>Warning threshold</span><input type="number" min={1} max={100} value={draftThreshold} onChange={event => setDraftThreshold(Number(event.target.value))} /></label><PrimaryButton type="submit">Save alert</PrimaryButton></form> : null}<div className="adm-recovery"><small>SAFE RECOVERY</small><p>{notice || "Usage records are bounded by period, project, and module."}</p></div></section></div>
			{detailsOpen ? <section className="adm-records" aria-label="Bounded usage records"><header><div><h2>Usage records</h2><p>{windowed.total.toLocaleString("en-US")} records · {windowed.mounted} mounted · project scoped</p></div><button disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - 25))}>Previous 25</button><button disabled={offset + 25 >= windowed.total} onClick={() => setOffset(value => value + 25)}>Next 25</button></header>{windowed.records.map(record => <div key={record.id}><span>{record.module}</span><span>{record.units} units</span><time>{record.occurredAt.slice(0, 10)}</time></div>)}</section> : null}
		</main>
	</div>
}

function HelpModule({ onNavigate }: { onNavigate: Navigate }) {
	const [query, setQuery] = useState("How do I review an Agentix approval?")
	const results = searchHelpResults(query)
	const [selectedId, setSelectedId] = useState("approval")
	const [supportOpen, setSupportOpen] = useState(false)
	const selected = results.find(result => result.id === selectedId) ?? results[0]
	const open = (result: HelpResult) => onNavigate(result.module)
	return <div className="adm-root"><ModuleHeader module="help" primary={<button type="button" onClick={() => setSupportOpen(true)}>Contact support</button>} />
		<main className="adm-body"><SurfaceIntro module="help" description="Search task-shaped guidance, open the relevant object, or hand off with workspace and correlation context attached." />
			<div className="adm-toolbar"><label><MagnifyingGlass /><input aria-label="Search help" value={query} onChange={event => { setQuery(event.target.value); setSelectedId("") }} placeholder="Describe what you need to do" /></label><StatusBadge tone="success">TASK GUIDES</StatusBadge><StatusBadge tone="accent">SYSTEMS UP</StatusBadge></div>
			<div className="adm-grid"><section className="adm-list" aria-label="Recommended help"><header><h2>Recommended for your work</h2><p>Task guidance ranked from your query.</p></header>{results.map(result => <button key={result.id} className={selected?.id === result.id ? "is-selected" : ""} onClick={() => setSelectedId(result.id)}><span><strong>{result.title}</strong><small>{result.outcome}</small></span><StatusBadge tone="info">{result.minutes} MIN</StatusBadge></button>)}{!results.length ? <div className="adm-empty"><MagnifyingGlass /><strong>No guide matched that task</strong><p>Your query is preserved. Try “approval”, “integration”, “Execute”, or “usage”.</p></div> : null}</section>
			<section className="adm-detail" aria-label="Selected help guide">{selected ? <><StatusBadge tone="accent">SELECTED</StatusBadge><h2>{selected.title}</h2><p>{selected.outcome} · about {selected.minutes} minutes.</p><div className="adm-steps">{selected.steps.map((step, index) => <div key={step}><span>{index + 1}</span><p>{step}</p></div>)}</div><div className="adm-actions"><PrimaryButton onClick={() => open(selected)}>Open {selected.module === "approvals" ? "approval" : selected.module}</PrimaryButton><button onClick={() => setSupportOpen(true)}>Contact support</button></div><div className="adm-recovery"><small>SAFE RECOVERY</small><p>Context attached · workspace · module · object · correlation ID. No secrets included.</p></div></> : <div className="adm-empty"><Lifebuoy /><strong>Search for the task, not the feature</strong><p>Guidance keeps completed work intact and retries only the affected step.</p></div>}</section></div>
			{supportOpen ? <div className="adm-modal-layer"><section role="dialog" aria-modal="true" aria-label="Review support hand-off"><header><div><small>SUPPORT HAND-OFF</small><h2>Review attached context</h2></div><button aria-label="Close support hand-off" onClick={() => setSupportOpen(false)}><X /></button></header><div className="adm-facts"><span>Workspace · Northwind Group</span><span>Module · Help</span><span>Object · {selected?.id ?? "search"}</span><span>Correlation · help_{selected?.id ?? "query"}_2094</span></div><p>No credentials, message content, or source records are attached.</p><div className="adm-actions"><button onClick={() => setSupportOpen(false)}>Cancel</button><PrimaryButton onClick={() => setSupportOpen(false)}>Create support request</PrimaryButton></div></section></div> : null}
		</main>
	</div>
}

export type AdministrationModuleProps = { module: AdministrationModuleId; project: PortalProject | null; onNavigate: Navigate; onAttentionChange: (attention: AgentixAttention) => void; onOpenApproval: () => void }

export default function AdministrationModule({ module, project, onNavigate, onAttentionChange, onOpenApproval }: AdministrationModuleProps) {
	if (module === "settings") return <SettingsModule />
	if (module === "integrations") return <IntegrationsModule project={project} />
	if (module === "approvals") return <ApprovalsModule project={project} onNavigate={onNavigate} onAttentionChange={onAttentionChange} onOpenApproval={onOpenApproval} />
	if (module === "usage") return <UsageModule project={project} />
	return <HelpModule onNavigate={onNavigate} />
}
