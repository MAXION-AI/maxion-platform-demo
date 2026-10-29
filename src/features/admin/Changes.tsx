import { useState } from "react"

import { Select } from "@/features/organization/shared"
import { connectorFor, type ConnectorKey } from "@/features/organization/model"
import { CommitDialog, type Fact } from "./CommitDialog"
import {
	MODULE_LABEL,
	LIFECYCLE_LABEL,
	modelEffective,
	moduleEffective,
	NETWORK_LABEL,
	NETWORK_LEVELS,
	networkEffective,
	RELEASE,
	REASON_LABEL,
	researchEffective,
	seatCap,
	STOP_DETAIL,
	STOP_LABEL,
	TOOL_CLASS_LABEL,
	toolsEffective,
	unitsLabel,
	type ModuleKey,
	type NetworkLevel,
	type PlatformState,
	type Receipt,
	type StopMode,
	type TenantState,
	type ToolClass,
} from "./model"
import { publish, type Publication } from "./store"

type ChangeProps = { tenant: TenantState; platform: PlatformState; onClose: () => void; onPublished: (receipt: Receipt) => void }

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`
const workFact = (tenant: TenantState, note: string): Fact => ({
	label: "Work it reaches",
	value: `${plural(tenant.work.agentix, "Agentix case")}, ${plural(tenant.work.discovery, "Discovery session")} and ${plural(tenant.work.voice, "voice session")} running, as of ${tenant.work.asOf}. ${note}`,
})
const revisionFact = (tenant: TenantState): Fact => ({ label: "Revision", value: `${tenant.revision} → ${tenant.revision + 1}, checked against the ${RELEASE} release manifest` })

/* Publishing closes the dialog and hands the receipt back so the page can follow its status. */
const commit = (props: ChangeProps, publication: Omit<Publication, "reason" | "ticket" | "scope" | "tenantId">) => (reason: Publication["reason"], ticket: string) => {
	const receipt = publish({ ...publication, reason, ticket, scope: props.tenant.name, tenantId: props.tenant.id })
	props.onPublished(receipt)
	props.onClose()
}

export function ModuleChange(props: ChangeProps & { moduleKey: ModuleKey }) {
	const { tenant, platform, moduleKey } = props
	const entry = tenant.modules[moduleKey]
	const granted = entry.override ?? entry.package
	const [next, setNext] = useState(granted)
	const [expires, setExpires] = useState(entry.expires ?? "")
	const draft: TenantState = { ...tenant, modules: { ...tenant.modules, [moduleKey]: { ...entry, override: next === entry.package ? null : next, expires: next === entry.package ? undefined : expires.trim() || undefined } } }
	const before = moduleEffective(tenant, moduleKey, platform)
	const after = moduleEffective(draft, moduleKey, platform)
	const label = (value: boolean) => value ? "Granted" : "Not entitled"
	return (
		<CommitDialog title={`${MODULE_LABEL[moduleKey]} for ${tenant.name}`} description="A tenant grant is authorization for a shipped capability, not a rollout flag. Revoking it denies the next affected admission." ready={next !== granted || (next !== entry.package && expires.trim() !== (entry.expires ?? ""))}
			summary={[{ label: "Tenant grant", before: label(granted), after: label(next) }, { label: "Effective", before: before.value, after: after.value }]}
			facts={[
				{ label: "Inherited", value: `${label(entry.package)} by ${tenant.packageName} (package revision ${tenant.packageRevision})` },
				{ label: "Override", value: next === entry.package ? "None: the package value applies" : `${label(next)}${expires.trim() ? ` until ${expires.trim()}` : ", no expiry"}` },
				workFact(tenant, next ? "Nothing running changes." : "Running work stops at its next enforceable boundary; nothing already sent is recalled."),
				revisionFact(tenant),
			]}
			onPublish={commit(props, { control: MODULE_LABEL[moduleKey], change: `${label(granted)} → ${label(next)}${next !== entry.package && expires.trim() ? ` until ${expires.trim()}` : ""}`, applyTenant: () => draft })}
			onClose={props.onClose}>
			<fieldset className="org-choices adm-editor">
				<legend className="ds-label">Tenant grant</legend>
				{[true, false].map((value) => (
					<label key={String(value)} className="org-choice">
						<input type="radio" name="module-grant" checked={next === value} onChange={() => setNext(value)} />
						<span><strong>{label(value)}{value === entry.package ? " (package value)" : ""}</strong><small>{value ? "The tenant may use it, within its customer restrictions." : "No new use. Existing history stays readable."}</small></span>
					</label>
				))}
			</fieldset>
			{next !== entry.package ? (
				<div className="ds-field">
					<label htmlFor="module-expiry">Expires (optional)</label>
					<input id="module-expiry" className="ds-input" value={expires} placeholder="For example Dec 31, or the agreement end" onChange={(event) => setExpires(event.target.value)} />
				</div>
			) : null}
		</CommitDialog>
	)
}

export function SeatsChange(props: ChangeProps) {
	const { tenant } = props
	const [amendment, setAmendment] = useState(String(tenant.seats.amendment))
	const value = Number.parseInt(amendment, 10)
	const valid = Number.isFinite(value) && tenant.seats.package + value >= 1
	const cap = valid ? tenant.seats.package + value : seatCap(tenant)
	const over = tenant.seats.used > cap
	const draft: TenantState = { ...tenant, seats: { ...tenant.seats, amendment: valid ? value : tenant.seats.amendment } }
	return (
		<CommitDialog title={`Seats for ${tenant.name}`} description="Seats come from the agreement. A lower cap never removes anyone; it stops new joins until use is back under the cap." ready={valid && value !== tenant.seats.amendment}
			summary={[{ label: "Amendment", before: signed(tenant.seats.amendment), after: valid ? signed(value) : "—" }, { label: "Seat cap", before: String(seatCap(tenant)), after: String(cap) }, { label: "In use", after: `${tenant.seats.used} of ${cap}${over ? ", over cap" : ""}` }]}
			warning={over ? `${tenant.seats.used} seats are in use, ${tenant.seats.used - cap} over the new cap. Nobody is removed; new members and accepted invitations are blocked until use is under the cap.` : undefined}
			facts={[
				{ label: "Inherited", value: `${tenant.seats.package} seats from ${tenant.packageName} (package revision ${tenant.packageRevision})` },
				{ label: "Override", value: valid && value !== 0 ? `${signed(value)} until ${tenant.seats.until === "—" ? "the agreement end" : tenant.seats.until}` : "None" },
				{ label: "Pending invitations", value: "Take no seat until accepted" },
				revisionFact(tenant),
			]}
			onPublish={commit(props, { control: "Seats", change: `${seatCap(tenant)} → ${cap}${over ? " (over cap)" : ""}`, applyTenant: () => draft })}
			onClose={props.onClose}>
			<div className="ds-field adm-editor">
				<label htmlFor="seat-amendment">Amendment to the package's {tenant.seats.package} seats</label>
				<input id="seat-amendment" className="ds-input" inputMode="numeric" value={amendment} aria-invalid={!valid} onChange={(event) => setAmendment(event.target.value.replace(/[^\d-]/g, ""))} />
				<small>{valid ? `Cap ${cap}. Use a negative number to agree fewer seats.` : "Enter a whole number that leaves at least one seat."}</small>
			</div>
		</CommitDialog>
	)
}
const signed = (value: number) => value > 0 ? `+${value}` : value === 0 ? "None" : String(value)

export function ModelsChange(props: ChangeProps & { taskId: string }) {
	const { tenant, platform, taskId } = props
	const task = tenant.models.find((item) => item.id === taskId)!
	const catalog = platform.models.filter((model) => model.task === task.id)
	const [granted, setGranted] = useState<string[]>(task.granted)
	const [defaultRoute, setDefaultRoute] = useState(task.defaultRoute)
	const draftTask = { ...task, granted, defaultRoute: granted.includes(defaultRoute) ? defaultRoute : granted[0] ?? task.defaultRoute }
	const before = modelEffective(task, platform)
	const after = modelEffective(draftTask, platform)
	const draft: TenantState = { ...tenant, models: tenant.models.map((item) => item.id === taskId ? draftTask : item) }
	const describe = (result: ReturnType<typeof modelEffective>) => result.preferred ? `${result.preferred}${result.routes.length > 1 ? ` (+${result.routes.length - 1})` : ""}` : "No eligible model"
	const changed = granted.join() !== task.granted.join() || draftTask.defaultRoute !== task.defaultRoute
	return (
		<CommitDialog title={`${task.module} · ${task.task}`} description="Routes MAXION enables for this tenant. The customer chooses among them and may narrow them further; a default change never reconfigures an approved Agentix design." ready={changed}
			summary={[{ label: "Granted routes", before: task.granted.join(", ") || "None", after: granted.join(", ") || "None" }, { label: "Effective", before: describe(before), after: describe(after) }]}
			warning={!after.preferred ? after.reason : undefined}
			facts={[
				{ label: "Inherited", value: `Platform catalog revision ${platform.revision}; nothing is implied for a tenant until it is granted` },
				{ label: "Customer layer", value: task.customerAllowed ? `Allows ${task.customerAllowed.join(", ")}, prefers ${task.customerPreferred}` : "No restriction" },
				workFact(tenant, "Approved designs keep their pinned route; a revoked route is denied at its next send."),
				revisionFact(tenant),
			]}
			onPublish={commit(props, { control: `${task.module} models`, change: `${task.granted.join(", ") || "None"} → ${granted.join(", ") || "None"}`, applyTenant: () => draft })}
			onClose={props.onClose}>
			<fieldset className="org-choices adm-editor">
				<legend className="ds-label">Granted routes</legend>
				{catalog.map((model) => {
					const unavailable = model.readiness !== "qualified" || model.stopped
					return (
						<label key={model.route} className="org-choice">
							<input type="checkbox" checked={granted.includes(model.route)} onChange={(event) => setGranted((current) => event.target.checked ? [...current, model.route] : current.filter((route) => route !== model.route))} />
							<span><strong>{model.route}</strong><small>{model.provider}{unavailable ? ` · ${model.stopped ? "stopped platform-wide" : "not ready in Production"}, so it won't be used even if granted` : ""}</small></span>
						</label>
					)
				})}
			</fieldset>
			{granted.length > 1 ? (
				<div className="ds-field">
					<label htmlFor="model-default">Default route</label>
					<Select id="model-default" className="is-field" value={draftTask.defaultRoute} onChange={(event) => setDefaultRoute(event.target.value)}>
						{granted.map((route) => <option key={route}>{route}</option>)}
					</Select>
				</div>
			) : null}
		</CommitDialog>
	)
}

export function ResearchChange(props: ChangeProps) {
	const { tenant, platform } = props
	const [value, setValue] = useState(tenant.research.tenant)
	const draft: TenantState = { ...tenant, research: { ...tenant.research, tenant: value } }
	return (
		<CommitDialog title={`Discovery web research for ${tenant.name}`} description="On by default. MAXION's blocked domains always apply; the customer can turn research off or limit it to listed domains." ready={value !== tenant.research.tenant}
			summary={[{ label: "Tenant setting", before: tenant.research.tenant === "on" ? "On" : "Off", after: value === "on" ? "On" : "Off" }, { label: "Effective", before: researchEffective(tenant, platform).value, after: researchEffective(draft, platform).value }]}
			facts={[{ label: "Inherited", value: `On, platform revision ${platform.revision}` }, workFact(tenant, "Applies to the next Discovery session; running sessions keep their settings."), revisionFact(tenant)]}
			onPublish={commit(props, { control: "Discovery web research", change: `${tenant.research.tenant === "on" ? "On" : "Off"} → ${value === "on" ? "On" : "Off"}`, applyTenant: () => draft })}
			onClose={props.onClose}>
			<fieldset className="org-choices adm-editor">
				<legend className="ds-label">Tenant setting</legend>
				{(["on", "off"] as const).map((option) => <label key={option} className="org-choice"><input type="radio" name="research" checked={value === option} onChange={() => setValue(option)} /><span><strong>{option === "on" ? "On" : "Off"}</strong><small>{option === "on" ? "The customer's own setting decides." : "No web research for this tenant, whatever the customer sets."}</small></span></label>)}
			</fieldset>
		</CommitDialog>
	)
}

export function NetworkChange(props: ChangeProps) {
	const { tenant, platform } = props
	const [value, setValue] = useState<NetworkLevel>(tenant.network.tenant)
	const draft: TenantState = { ...tenant, network: { ...tenant.network, tenant: value } }
	const allowed = (level: NetworkLevel) => NETWORK_LEVELS.indexOf(level) <= NETWORK_LEVELS.indexOf(platform.network)
	return (
		<CommitDialog title={`Agentix sandbox network for ${tenant.name}`} description="The most permissive sandbox network this tenant's designs may use. It never widens a running session; lowering it below one checkpoints and restarts that session." ready={value !== tenant.network.tenant}
			summary={[{ label: "Tenant ceiling", before: NETWORK_LABEL[tenant.network.tenant], after: NETWORK_LABEL[value] }, { label: "Effective", before: networkEffective(tenant, platform).value, after: networkEffective(draft, platform).value }]}
			facts={[{ label: "Platform ceiling", value: `${NETWORK_LABEL[platform.network]}, platform revision ${platform.revision}` }, { label: "Customer layer", value: tenant.network.customer ? `${NETWORK_LABEL[tenant.network.customer]} (Owner's stricter limit)` : "No stricter limit" }, workFact(tenant, "Sessions above a lowered ceiling save a checkpoint and restart under it."), revisionFact(tenant)]}
			onPublish={commit(props, { control: "Agentix sandbox network ceiling", change: `${NETWORK_LABEL[tenant.network.tenant]} → ${NETWORK_LABEL[value]}`, applyTenant: () => draft })}
			onClose={props.onClose}>
			<fieldset className="org-choices adm-editor">
				<legend className="ds-label">Tenant ceiling</legend>
				{NETWORK_LEVELS.map((level) => (
					<label key={level} className={`org-choice${allowed(level) ? "" : " is-disabled"}`}>
						<input type="radio" name="network" disabled={!allowed(level)} checked={value === level} onChange={() => setValue(level)} />
						<span><strong>{NETWORK_LABEL[level]}</strong><small>{allowed(level) ? "At or below the platform ceiling." : "Above the platform ceiling."}</small></span>
					</label>
				))}
			</fieldset>
		</CommitDialog>
	)
}

export function ToolsChange(props: ChangeProps) {
	const { tenant, platform } = props
	const [classes, setClasses] = useState<ToolClass[]>(tenant.tools.tenant)
	const draft: TenantState = { ...tenant, tools: { ...tenant.tools, tenant: platform.tools.filter((cls) => classes.includes(cls)) } }
	const list = (items: ToolClass[]) => items.length ? `${items.length} of ${platform.tools.length}` : "None"
	return (
		<CommitDialog title={`Agentix tool classes for ${tenant.name}`} description="The kinds of action this tenant's agents may be designed to take. Each action still needs its own authority at dispatch." ready={draft.tools.tenant.join() !== tenant.tools.tenant.join()}
			summary={[{ label: "Tenant classes", before: list(tenant.tools.tenant), after: list(draft.tools.tenant) }, { label: "Effective", before: list(toolsEffective(tenant, platform).classes), after: list(toolsEffective(draft, platform).classes) }]}
			facts={[{ label: "Platform set", value: `${platform.tools.length} classes, platform revision ${platform.revision}` }, { label: "Customer layer", value: tenant.tools.customer ? `${tenant.tools.customer.length} classes` : "No restriction" }, workFact(tenant, "A removed class is denied at the next dispatch; approved designs are flagged for review, never changed silently."), revisionFact(tenant)]}
			onPublish={commit(props, { control: "Agentix tool classes", change: `${list(tenant.tools.tenant)} → ${list(draft.tools.tenant)}`, applyTenant: () => draft })}
			onClose={props.onClose}>
			<fieldset className="org-choices adm-editor">
				<legend className="ds-label">Tenant classes</legend>
				{platform.tools.map((cls) => <label key={cls} className="org-choice"><input type="checkbox" checked={classes.includes(cls)} onChange={(event) => setClasses((current) => event.target.checked ? [...current, cls] : current.filter((item) => item !== cls))} /><span><strong>{TOOL_CLASS_LABEL[cls]}</strong></span></label>)}
			</fieldset>
		</CommitDialog>
	)
}

export function ConnectorChange(props: ChangeProps & { connectorKey: ConnectorKey }) {
	const { tenant, connectorKey } = props
	const connector = connectorFor(connectorKey)
	const enabled = Boolean(tenant.connectors[connectorKey])
	const draft: TenantState = { ...tenant, connectors: { ...tenant.connectors, [connectorKey]: !enabled } }
	return (
		<CommitDialog title={`${enabled ? "Disable" : "Enable"} ${connector.name} for ${tenant.name}`} description={enabled ? "Disabling denies new dispatch through this connector at once. Work already sent completes and is reconciled; provider-side cleanup is tracked." : "Enabling makes the connector available to connect. Customers still sign in with their own accounts and grant projects; existing agent designs don't gain it."} ready
			summary={[{ label: connector.name, before: enabled ? "Enabled" : "Not enabled", after: enabled ? "Not enabled" : "Enabled" }]}
			facts={[{ label: "Route", value: connector.route === "merge" ? "Through Merge" : "MAXION native adapter" }, { label: "Qualified operations", value: `${connector.operations.filter((operation) => operation.qualified).length} of ${connector.operations.length}` }, workFact(tenant, enabled ? "Pending operations through it reconcile before anything else is sent." : "No running work changes."), revisionFact(tenant)]}
			onPublish={commit(props, { control: `Connector · ${connector.name}`, change: enabled ? "Enabled → Not enabled" : "Not enabled → Enabled", applyTenant: () => draft, settle: enabled ? ["cleanup_pending", "applied"] : ["applied"] })}
			onClose={props.onClose} />
	)
}

export function AdjustmentChange(props: ChangeProps) {
	const { tenant } = props
	const [units, setUnits] = useState("")
	const [note, setNote] = useState("")
	const value = Number.parseInt(units, 10)
	const valid = Number.isFinite(value) && value !== 0 && note.trim().length > 0
	const remaining = tenant.usage.allowance - tenant.usage.used
	const draft: TenantState = valid ? { ...tenant, usage: { ...tenant.usage, allowance: tenant.usage.allowance + value, adjustments: [{ id: `adj-${Date.now()}`, at: "Today", units: value, reason: note.trim(), ticket: "" }, ...tenant.usage.adjustments] } } : tenant
	return (
		<CommitDialog title={`Compensating adjustment for ${tenant.name}`} description="Past usage is never edited. An adjustment is a new entry that credits or debits this cycle's allowance." ready={valid}
			summary={[{ label: "Adjustment", after: valid ? `${value > 0 ? "+" : ""}${unitsLabel(value)} units` : "—" }, { label: "Remaining this cycle", before: `${unitsLabel(remaining)} units`, after: `${unitsLabel(valid ? remaining + value : remaining)} units` }]}
			facts={[{ label: "Settled usage", value: `${unitsLabel(tenant.usage.used)} units, unchanged` }, { label: "Open reservations", value: `${unitsLabel(tenant.usage.reservations)} units, unchanged` }, revisionFact(tenant)]}
			onPublish={(reason, ticket) => {
				const receipt = publish({ scope: tenant.name, tenantId: tenant.id, control: "Usage adjustment", change: `${value > 0 ? "+" : ""}${unitsLabel(value)} units · ${note.trim()}`, reason, ticket, applyTenant: () => ({ ...draft, usage: { ...draft.usage, adjustments: draft.usage.adjustments.map((item, index) => index === 0 ? { ...item, ticket: ticket.trim() } : item) } }) })
				props.onPublished(receipt)
				props.onClose()
			}}
			onClose={props.onClose}>
			<div className="adm-commit-fields adm-editor">
				<div className="ds-field">
					<label htmlFor="adjust-units">Units</label>
					<input id="adjust-units" className="ds-input" inputMode="numeric" value={units} placeholder="For example 200 or -50" onChange={(event) => setUnits(event.target.value.replace(/[^\d-]/g, ""))} />
				</div>
				<div className="ds-field">
					<label htmlFor="adjust-note">What it corrects</label>
					<input id="adjust-note" className="ds-input" maxLength={120} value={note} placeholder="For example duplicate reservation on AR-2291" onChange={(event) => setNote(event.target.value)} />
				</div>
			</div>
		</CommitDialog>
	)
}

const STOP_MODES: StopMode[] = ["pause_new_work", "read_only", "block", "suspend_tenant"]
const STOP_SCOPES = ["Whole tenant", "Discovery", "Agentix", "Voice interviews", "Integrations"] as const

/* One short command: what stops, where, and why. No approval chain; MFA and the reason are the check. */
export function StopChange(props: ChangeProps & { preset?: StopMode }) {
	const { tenant } = props
	const [mode, setMode] = useState<StopMode>(props.preset ?? "pause_new_work")
	const [scope, setScope] = useState<(typeof STOP_SCOPES)[number]>("Whole tenant")
	const effectiveScope = mode === "suspend_tenant" ? "Whole tenant" : scope
	return (
		<CommitDialog emergency title={`Stop work for ${tenant.name}`} description="Takes effect at the next enforceable boundary. It never recalls an action already sent, and deployment or rollback never resets it." ready publishLabel="Stop now"
			summary={[{ label: "Stop", before: tenant.stop ? STOP_LABEL[tenant.stop.mode] : "None", after: `${STOP_LABEL[mode]} · ${effectiveScope}` }, { label: "Lifecycle", before: LIFECYCLE_LABEL[tenant.lifecycle], after: mode === "suspend_tenant" ? LIFECYCLE_LABEL.suspended : LIFECYCLE_LABEL[tenant.lifecycle] }]}
			warning={mode === "suspend_tenant" ? "Suspension rejects ordinary access and new protected work across both modules and revokes sessions in the same step." : undefined}
			facts={[{ label: "What happens", value: STOP_DETAIL[mode] }, workFact(tenant, "Each is paused or cancelled where supported; receipts and recovery stay available."), revisionFact(tenant)]}
			onPublish={(reason, ticket) => commit(props, { control: "Emergency stop", change: `${STOP_LABEL[mode]} · ${effectiveScope}`, applyTenant: (current) => ({ ...current, stop: { mode, scope: effectiveScope, reason, at: "Just now" }, lifecycle: mode === "suspend_tenant" ? "suspended" : current.lifecycle }) })(reason, ticket)}
			onClose={props.onClose}>
			<fieldset className="org-choices adm-editor">
				<legend className="ds-label">Mode</legend>
				{STOP_MODES.map((option) => <label key={option} className="org-choice"><input type="radio" name="stop-mode" checked={mode === option} onChange={() => setMode(option)} /><span><strong>{STOP_LABEL[option]}</strong><small>{STOP_DETAIL[option]}</small></span></label>)}
			</fieldset>
			{mode !== "suspend_tenant" ? (
				<div className="ds-field">
					<label htmlFor="stop-scope">Applies to</label>
					<Select id="stop-scope" className="is-field" value={scope} onChange={(event) => setScope(event.target.value as (typeof STOP_SCOPES)[number])}>
						{STOP_SCOPES.map((option) => <option key={option}>{option}</option>)}
					</Select>
				</div>
			) : null}
		</CommitDialog>
	)
}

export function LiftStopChange(props: ChangeProps) {
	const { tenant } = props
	const stop = tenant.stop!
	return (
		<CommitDialog title={`Lift the stop for ${tenant.name}`} description="New work is admitted again when every other check passes. Paused or ambiguous external work is never replayed; it resumes through its own workflow after revalidation." ready
			summary={[{ label: "Stop", before: `${STOP_LABEL[stop.mode]} · ${stop.scope}`, after: "None" }, { label: "Lifecycle", before: LIFECYCLE_LABEL[tenant.lifecycle], after: tenant.lifecycle === "suspended" ? LIFECYCLE_LABEL.active : LIFECYCLE_LABEL[tenant.lifecycle] }]}
			warning={tenant.lifecycle === "cleanup_pending" ? "Offboarding continues. Lifting the stop doesn't reopen the tenant or restore anything already cleaned up." : undefined}
			facts={[{ label: "In effect since", value: stop.at }, workFact(tenant, "Paused work stays paused until its owner resumes it."), revisionFact(tenant)]}
			onPublish={commit(props, { control: "Stop lifted", change: `${STOP_LABEL[stop.mode]} → None`, applyTenant: (current) => ({ ...current, stop: null, lifecycle: current.lifecycle === "suspended" ? "active" : current.lifecycle }) })}
			onClose={props.onClose} />
	)
}

type PlatformTarget = { kind: "capability"; key: keyof PlatformState["stops"] } | { kind: "model"; route: string }
const CAPABILITY_LABEL: Record<keyof PlatformState["stops"], string> = { discovery: "Discovery", agentix: "Agentix", voice: "Voice interviews", integrations: "Integrations" }

/* A platform stop reaches every tenant at its next boundary; a stopped model route is never swapped for another. */
export function PlatformStopChange({ platform, target, onClose, onPublished }: { platform: PlatformState; target: PlatformTarget; onClose: () => void; onPublished: (receipt: Receipt) => void }) {
	const [mode, setMode] = useState<StopMode>("pause_new_work")
	const model = target.kind === "model" ? platform.models.find((item) => item.route === target.route)! : null
	const current = target.kind === "capability" ? platform.stops[target.key] : null
	const resuming = target.kind === "model" ? model!.stopped : Boolean(current)
	const label = target.kind === "capability" ? CAPABILITY_LABEL[target.key] : target.route
	const before = target.kind === "capability" ? (current ? STOP_LABEL[current.mode] : "Running") : model!.stopped ? "Stopped" : "Running"
	const after = resuming ? "Running" : target.kind === "capability" ? STOP_LABEL[mode] : "Stopped"
	const apply = (reason: Publication["reason"]) => (state: PlatformState): PlatformState => target.kind === "capability"
		? { ...state, stops: { ...state.stops, [target.key]: resuming ? null : { mode, reason, at: "Just now" } } }
		: { ...state, models: state.models.map((item) => item.route === target.route ? { ...item, stopped: !resuming } : item) }
	return (
		<CommitDialog emergency={!resuming} title={`${resuming ? "Resume" : "Stop"} ${label} for every tenant`} description={resuming ? "New work is admitted again where every other check passes. Nothing paused is replayed." : target.kind === "model" ? "Tenants that rely on this route get no substitute: their new work pauses with a reason until a route is granted." : "One short command for every tenant. It never recalls an action already sent."} ready publishLabel={resuming ? "Publish" : "Stop now"}
			summary={[{ label, before, after }]}
			facts={[{ label: "Scope", value: "Every tenant, at its next enforceable boundary" }, { label: "Current", value: current ? `${STOP_LABEL[current.mode]} since ${current.at} · ${REASON_LABEL[current.reason]}` : "No stop in effect" }, { label: "Revision", value: `Platform ${platform.revision} → ${platform.revision + 1}` }]}
			onPublish={(reason, ticket) => { onPublished(publish({ scope: "Platform", control: target.kind === "model" ? `Model route · ${label}` : `Platform stop · ${label}`, change: `${before} → ${after}`, reason, ticket, applyPlatform: apply(reason) })); onClose() }}
			onClose={onClose}>
			{target.kind === "capability" && !resuming ? (
				<fieldset className="org-choices adm-editor">
					<legend className="ds-label">Mode</legend>
					{STOP_MODES.filter((option) => option !== "suspend_tenant").map((option) => <label key={option} className="org-choice"><input type="radio" name="platform-stop" checked={mode === option} onChange={() => setMode(option)} /><span><strong>{STOP_LABEL[option]}</strong><small>{STOP_DETAIL[option]}</small></span></label>)}
				</fieldset>
			) : null}
		</CommitDialog>
	)
}
