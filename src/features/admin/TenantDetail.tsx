import { CheckCircle, CircleNotch, WarningCircle } from "@phosphor-icons/react"
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react"

import { Badge, Banner, Button, PageHeader, PrimaryCell, Table } from "@/design/primitives"
import { CONNECTORS, type ConnectorKey } from "@/features/organization/model"
import { AdjustmentChange, ConnectorChange, InvitationChange, LiftStopChange, ModelsChange, ModuleChange, NetworkChange, ResearchChange, SeatsChange, SessionsChange, StopChange, ToolsChange } from "./Changes"
import {
	can,
	clockLabel,
	COST_EVIDENCE_LABEL,
	costSummary,
	deniedReason,
	INVITATION_STATUS_LABEL,
	LIFECYCLE_LABEL,
	maskEmail,
	missingModelTasks,
	moduleList,
	ownerBindingExpired,
	resendBlocked,
	setupGaps,
	usdLabel,
	MODULE_DETAIL,
	MODULE_LABEL,
	modelEffective,
	moduleEffective,
	NETWORK_LABEL,
	networkEffective,
	overCap,
	REASON_LABEL,
	RECEIPT_LABEL,
	RELEASE,
	researchEffective,
	seatCap,
	STOP_LABEL,
	toolsEffective,
	unitsLabel,
	type Lifecycle,
	type ModuleKey,
	type PlatformState,
	type Receipt,
	type ReceiptStatus,
	type StaffAction,
	type StopMode,
	type TenantState,
} from "./model"
import { useActor, useAdmin } from "./store"
import { ReplaceOwnerChange } from "./TenantCreate"

export const TENANT_TABS = ["access", "models", "modules", "usage", "operations", "history"] as const
export type TenantTab = (typeof TENANT_TABS)[number]
const TAB_LABEL: Record<TenantTab, string> = { access: "Access", models: "Models", modules: "Modules", usage: "Usage", operations: "Operations", history: "History" }

type Pending =
	| { kind: "module"; key: ModuleKey }
	| { kind: "seats" }
	| { kind: "models"; taskId: string }
	| { kind: "research" }
	| { kind: "network" }
	| { kind: "tools" }
	| { kind: "connector"; key: ConnectorKey }
	| { kind: "adjust" }
	| { kind: "stop"; preset?: StopMode }
	| { kind: "lift" }
	| { kind: "invitation"; id: string; mode: "resend" | "revoke" }
	| { kind: "sessions" }
	| { kind: "owner" }

/* A control this role can't use says what it needs, in its place. No disabled pretend editor (ADM-2), and nothing vanishes silently (D-059). */
export function Allowed({ action, children }: { action: StaffAction; children: ReactNode }) {
	const actor = useActor()
	return can(actor, action) ? <>{children}</> : <small className="adm-denied">{deniedReason(action)}</small>
}

/* Tabs follow the ARIA pattern: one tab stop, arrows and Home/End move between them and select. */
export function onTabKeys<T extends string>(event: KeyboardEvent<HTMLElement>, tabs: readonly T[], current: T, select: (tab: T) => void) {
	const index = tabs.indexOf(current)
	const next = event.key === "ArrowRight" ? tabs[(index + 1) % tabs.length] : event.key === "ArrowLeft" ? tabs[(index - 1 + tabs.length) % tabs.length] : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : null
	if (!next) return
	event.preventDefault()
	const list = event.currentTarget
	select(next)
	window.requestAnimationFrame?.(() => list.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
}

export const lifecycleTone = (lifecycle: Lifecycle) => lifecycle === "suspended" ? "danger" : lifecycle === "active" ? "neutral" : "warning"
export const receiptTone = (status: ReceiptStatus) => status === "applied" ? "positive" : status === "cleanup_pending" ? "warning" : "outline"

/* A control read back in layers, then its effective value and the reason that limits it, then the one action. */
function ControlRow({ title, detail, layers, value, reason, action, attention }: { title: ReactNode; detail?: ReactNode; layers?: ReactNode; value: ReactNode; reason: ReactNode; action?: ReactNode; attention?: ReactNode }) {
	return (
		<div className="org-row adm-control">
			<div className="org-row-main">
				<strong>{title}{attention}</strong>
				{detail ? <small>{detail}</small> : null}
				{layers ? <small className="adm-layers">{layers}</small> : null}
			</div>
			<div className="org-row-aside">
				<span className="org-value adm-effective">{value}<small>{reason}</small></span>
				{action}
			</div>
		</div>
	)
}

function Section({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
	return (
		<section className="org-section" aria-label={title}>
			<div className="org-section-head"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{actions}</div>
			<div className="org-rows">{children}</div>
		</section>
	)
}

/* The receipt this session just published, followed until enforcement reports. */
export function ReceiptLine({ receiptId }: { receiptId: string | null }) {
	const { receipts } = useAdmin()
	const receipt = receipts.find((item) => item.id === receiptId)
	return (
		<p className="adm-receipt" role="status" aria-live="polite">
			{receipt ? <>
				{receipt.status === "applied" ? <CheckCircle aria-hidden="true" weight="fill" className="is-applied" /> : <CircleNotch aria-hidden="true" className="adm-spin" />}
				<span><strong>{receipt.control}</strong> · revision {receipt.revision} {receipt.status === "published" ? "published; enforcement not yet reported" : receipt.status === "cleanup_pending" ? "applied locally; provider cleanup pending" : "published and applied"}</span>
			</> : null}
		</p>
	)
}

export function ReceiptTable({ receipts, label }: { receipts: Receipt[]; label: string }) {
	return (
		<Table aria-label={label} className="adm-receipts" columns={["Change", "Operator", "Reason", "Ticket", "Revision", "Status"]} template="minmax(0, 2.4fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, .9fr) minmax(0, .7fr) minmax(0, 1fr)">
			{receipts.length ? receipts.map((receipt) => (
				<article key={receipt.id} className="ds-table-row adm-static-row" aria-label={`${receipt.control} · ${RECEIPT_LABEL[receipt.status]}`}>
					<PrimaryCell title={receipt.control} meta={`${receipt.change} · ${receipt.at}`} />
					<span className="ds-cell">{receipt.operator}</span>
					<span className="ds-cell">{REASON_LABEL[receipt.reason]}</span>
					<span className="ds-cell adm-mono">{receipt.ticket || "—"}</span>
					<span className="ds-cell ds-cell-num">{receipt.revision}</span>
					<span className="ds-cell"><Badge tone={receiptTone(receipt.status)}>{RECEIPT_LABEL[receipt.status]}</Badge></span>
				</article>
			)) : <p className="adm-empty-line">No changes recorded yet.</p>}
		</Table>
	)
}

/* What a tenant created here still needs, each with its reason and its one action. */
function SetupSection({ tenant, open, onTab }: { tenant: TenantState; open: (pending: Pending) => void; onTab: (tab: TenantTab) => void }) {
	const setup = tenant.setup!
	const [now, setNow] = useState(() => Date.now())
	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 30_000)
		return () => window.clearInterval(timer)
	}, [])
	const expired = ownerBindingExpired(setup, now)
	const missing = missingModelTasks(tenant)
	const granted = (key: ModuleKey) => tenant.modules[key].override ?? tenant.modules[key].package
	return (
		<Section title="Setup" description={`Onboarding reference ${setup.onboardingReference}. The tenant stays Pending setup until its first Owner activates from their own session.`}>
			<ControlRow title="First Owner" attention={expired ? <Badge tone="warning">Expired</Badge> : null} detail="Share only the organization's activation page. It grants nothing by itself."
				layers={`Global user ${setup.firstOwner.globalUser} · binding ${setup.bindingRevision}`} value={expired ? "Binding expired" : "Waiting to activate"} reason={expired ? "Needs a new setup code" : `Binding expires ${clockLabel(setup.bindingExpiresAt)}`}
				action={<Allowed action="tenant.bootstrap"><Button size="sm" aria-label="Replace the first Owner binding" onClick={() => open({ kind: "owner" })}>Replace</Button></Allowed>} />
			<ControlRow title="Agreement" detail={`${tenant.packageName}, ${seatCap(tenant)} seats, ${moduleList({ discovery: granted("discovery"), agentix: granted("agentix"), voice: granted("voice") })}, ${unitsLabel(tenant.usage.allowance)} units, until ${setup.agreementEnd}.`}
				value={`Draft, version ${setup.agreementVersion}`} reason="No charging mode selected; it's chosen before activation" />
			<ControlRow title="Model routes" attention={missing.length ? <Badge tone="warning">{missing.length} missing</Badge> : null} detail={missing.length ? `Nothing is implied by the catalog. Publish routes for ${missing.map((task) => `${task.module} ${task.task.toLowerCase()}`).join(", ")}.` : "Routes are published for every granted module."}
				value={missing.length ? "Not published" : "Published"} reason={missing.length ? "New work can't start without them" : ""} action={missing.length ? <Button size="sm" onClick={() => onTab("models")}>Open Models</Button> : undefined} />
		</Section>
	)
}

function AccessTab({ tenant, platform, open, onTab }: { tenant: TenantState; platform: PlatformState; open: (pending: Pending) => void; onTab: (tab: TenantTab) => void }) {
	const cap = seatCap(tenant)
	const openInvitations = tenant.invitations.filter((invitation) => invitation.status === "pending" || invitation.status === "expired")
	return (
		<>
			{tenant.setup ? <SetupSection tenant={tenant} open={open} onTab={onTab} /> : null}
			<Section title="Modules" description="What the agreement grants, amended for this tenant. The customer may restrict a module further; staff use a stop, not a grant, to halt work.">
				{(["discovery", "agentix", "voice"] as ModuleKey[]).map((key) => {
					const entry = tenant.modules[key]
					const effective = moduleEffective(tenant, key, platform)
					const tenantLayer = entry.override === null ? "no override" : `${entry.override ? "granted" : "revoked"}${entry.expires ? ` until ${entry.expires}` : ""}`
					const customer = key === "voice" ? "no setting" : tenant.customerModes[key] === "read_only" ? "read-only" : "normal"
					return <ControlRow key={key} title={MODULE_LABEL[key]} detail={MODULE_DETAIL[key]} layers={`Package: ${entry.package ? "granted" : "not included"} (revision ${tenant.packageRevision}) · Tenant: ${tenantLayer} · Customer: ${customer}`} value={effective.value} reason={effective.reason} action={<Allowed action="tenant.change"><Button size="sm" aria-label={`Change ${MODULE_LABEL[key]}`} onClick={() => open({ kind: "module", key })}>Change</Button></Allowed>} />
				})}
			</Section>
			<Section title="Agreement" description="Seats come from the commercial agreement; pending invitations take no seat. Suspension rejects ordinary access across both modules and revokes sessions in the same step.">
				<ControlRow title="Seats" attention={overCap(tenant) ? <Badge tone="warning">Over cap</Badge> : null} detail={`Package ${tenant.seats.package}${tenant.seats.amendment ? `, amended ${tenant.seats.amendment > 0 ? "+" : ""}${tenant.seats.amendment} until ${tenant.seats.until}` : ", no amendment"}.`} layers={`Agreement revision ${tenant.packageRevision} · as of 09:40`} value={`${tenant.seats.used} of ${cap} used`} reason={overCap(tenant) ? "New joins are blocked; nobody was removed" : `${cap - tenant.seats.used} free`} action={<Allowed action="tenant.change"><Button size="sm" aria-label="Change seats" onClick={() => open({ kind: "seats" })}>Change</Button></Allowed>} />
				<ControlRow title="Lifecycle" detail={tenant.setup ? "Created by an authorized bootstrap. Setup is still open." : tenant.setupGap ?? (tenant.stop ? `${STOP_LABEL[tenant.stop.mode]} since ${tenant.stop.at} · ${REASON_LABEL[tenant.stop.reason]}` : "Created by an authorized bootstrap; setup published and verified.")} value={<Badge tone={lifecycleTone(tenant.lifecycle)}>{LIFECYCLE_LABEL[tenant.lifecycle]}</Badge>} reason={tenant.lifecycle === "cleanup_pending" ? "Offboarding reports its stages; nothing is deleted at once" : tenant.lifecycle === "pending" ? "Setup incomplete" : ""}
					action={tenant.lifecycle === "suspended" ? <Allowed action="tenant.stop"><Button size="sm" onClick={() => open({ kind: "lift" })}>Lift suspension</Button></Allowed> : tenant.lifecycle === "active" ? <Allowed action="tenant.stop"><Button size="sm" className="adm-danger" onClick={() => open({ kind: "stop", preset: "suspend_tenant" })}>Suspend tenant</Button></Allowed> : undefined} />
			</Section>
			<Section title="Invitations and sessions" description="Support and Platform Owners resend or revoke invitations. Staff see a masked address, never a message, and pending invitations take no seat.">
				{openInvitations.length ? openInvitations.map((invitation) => {
					const target = maskEmail(invitation.email)
					const blocked = resendBlocked(tenant, invitation)
					return (
						<ControlRow key={invitation.id} title={`${invitation.role} invitation`} detail={target} layers={`Invited by ${invitation.invitedBy} · link generation ${invitation.generation}`}
							value={INVITATION_STATUS_LABEL[invitation.status]} reason={invitation.status === "pending" ? `Expires in ${invitation.expiresInDays} day${invitation.expiresInDays === 1 ? "" : "s"}` : "The link no longer works"}
							action={<Allowed action="invitation.manage">
								{blocked ? <small className="adm-denied">{blocked}</small> : <Button size="sm" aria-label={`Resend the invitation to ${target}`} onClick={() => open({ kind: "invitation", id: invitation.id, mode: "resend" })}>Resend</Button>}
								{invitation.status === "pending" ? <Button size="sm" aria-label={`Revoke the invitation to ${target}`} onClick={() => open({ kind: "invitation", id: invitation.id, mode: "revoke" })}>Revoke</Button> : null}
							</Allowed>} />
					)
				}) : <p className="adm-empty-line">No open invitations.</p>}
				<ControlRow title="Customer sessions" detail="Revoking signs everyone in this organization out. It needs a reason and changes nothing else." value={`${tenant.sessions} active`} reason={tenant.sessions ? `As of ${tenant.work.asOf}` : "Nothing to revoke"}
					action={tenant.sessions ? <Allowed action="tenant.sessions"><Button size="sm" onClick={() => open({ kind: "sessions" })}>Revoke sessions</Button></Allowed> : undefined} />
			</Section>
		</>
	)
}

function ModelsTab({ tenant, platform, open }: { tenant: TenantState; platform: PlatformState; open: (pending: Pending) => void }) {
	return (
		<Section title="Model routes" description="MAXION grants exact routes per module and task. The customer chooses among them or narrows them; a route that isn't ready or is revoked is never swapped for another.">
			{tenant.models.map((task) => {
				const effective = modelEffective(task, platform)
				const customer = task.customerAllowed ? `only ${task.customerAllowed.join(", ")}, prefers ${task.customerPreferred}` : "no restriction"
				return (
					<ControlRow key={task.id} title={`${task.module} · ${task.task}`} attention={effective.preferred ? null : <Badge tone="warning">No eligible model</Badge>}
						layers={`Granted: ${task.granted.join(", ") || "none"} (platform revision ${platform.revision}) · Default ${task.defaultRoute}${task.fallback ? `, fallback ${task.fallback}` : ""} · Customer: ${customer}`}
						value={effective.preferred ?? "None"} reason={effective.reason} action={<Allowed action="tenant.change"><Button size="sm" aria-label={`Change ${task.module} ${task.task} models`} onClick={() => open({ kind: "models", taskId: task.id })}>Change</Button></Allowed>} />
				)
			})}
		</Section>
	)
}

function ModulesTab({ tenant, platform, open }: { tenant: TenantState; platform: PlatformState; open: (pending: Pending) => void }) {
	const research = researchEffective(tenant, platform)
	const network = networkEffective(tenant, platform)
	const tools = toolsEffective(tenant, platform)
	return (
		<>
			<Section title="Module controls" description="Typed controls the modules enforce at admission and dispatch.">
				<ControlRow title="Discovery web research" layers={`Platform: on, ${platform.blockedDomains} blocked domains · Tenant: ${tenant.research.tenant} · Customer: ${tenant.research.customer === "allowlist" ? `${tenant.research.domains} listed domains` : tenant.research.customer}`} value={research.value} reason={research.reason} action={<Allowed action="tenant.change"><Button size="sm" aria-label="Change Discovery web research" onClick={() => open({ kind: "research" })}>Change</Button></Allowed>} />
				<ControlRow title="Agentix sandbox network" layers={`Platform: ${NETWORK_LABEL[platform.network]} · Tenant: ${NETWORK_LABEL[tenant.network.tenant]} · Customer: ${tenant.network.customer ? NETWORK_LABEL[tenant.network.customer] : "no limit"}`} value={network.value} reason={network.reason} action={<Allowed action="tenant.change"><Button size="sm" aria-label="Change Agentix sandbox network" onClick={() => open({ kind: "network" })}>Change</Button></Allowed>} />
				<ControlRow title="Agentix tool classes" layers={`Platform: ${platform.tools.length} · Tenant: ${tenant.tools.tenant.length} · Customer: ${tenant.tools.customer ? tenant.tools.customer.length : "no restriction"}`} value={`${tools.classes.length} of ${platform.tools.length} classes`} reason={tools.reason} action={<Allowed action="tenant.change"><Button size="sm" aria-label="Change Agentix tool classes" onClick={() => open({ kind: "tools" })}>Change</Button></Allowed>} />
				<ControlRow title="Customer module modes" detail="The customer may set a module read-only. Staff halt work with a stop, so there is no staff control here." value={`Discovery ${tenant.customerModes.discovery === "read_only" ? "read-only" : "normal"} · Agentix ${tenant.customerModes.agentix === "read_only" ? "read-only" : "normal"}`} reason="Set by the customer" />
			</Section>
			<Section title="Connectors" description="Qualified connectors MAXION makes available to this tenant. Customers still connect their own accounts and grant projects; enabling never expands an existing agent design.">
				{CONNECTORS.map((connector) => {
					const qualified = connector.availability.state !== "not_qualified"
					const enabled = Boolean(tenant.connectors[connector.key])
					const ops = connector.operations.filter((operation) => operation.qualified).length
					return (
						<ControlRow key={connector.key} title={connector.name} layers={`${connector.route === "merge" ? "Through Merge" : "MAXION native adapter"} · ${connector.category} · ${ops} of ${connector.operations.length} operations qualified`}
							value={qualified ? (enabled ? "Enabled" : "Not enabled") : "Not qualified"} reason={qualified ? (enabled ? "Customers may connect it" : "Not offered to this tenant") : "Can't be enabled until it's qualified"}
							action={qualified ? <Allowed action="tenant.change"><Button size="sm" aria-label={`${enabled ? "Disable" : "Enable"} ${connector.name}`} onClick={() => open({ kind: "connector", key: connector.key })}>{enabled ? "Disable" : "Enable"}</Button></Allowed> : undefined} />
					)
				})}
			</Section>
		</>
	)
}

/*
 * Internal provider cost against customer usage. Simulated figures. Support's projection stops at
 * units (COM-1), so its view says so instead of showing nothing. No price is invented: rates stay
 * open and the charging mode is set on the agreement (D-129).
 */
function CostsSection({ tenant }: { tenant: TenantState }) {
	const actor = useActor()
	const { costs } = tenant
	const summary = costSummary(tenant)
	if (!can(actor, "cost.read")) {
		return <Section title="Costs"><ControlRow title="Provider cost" detail="Internal cost isn't part of the Support view. Units and reconciliation above are." value="Not shown" reason={deniedReason("cost.read")} /></Section>
	}
	const notes = [summary.estimateCents ? `Includes ${usdLabel(summary.estimateCents)} estimated` : "", summary.unknown ? `${summary.unknown} item${summary.unknown === 1 ? "" : "s"} unknown, so this isn't final` : ""].filter(Boolean).join("; ")
	return (
		<Section title="Costs" description="Simulated figures. Provider cost is MAXION's internal cost, kept apart from what a customer is charged. Unknown cost stays unknown, never zero, and a held reservation isn't spend.">
			<ControlRow title="Provider cost this cycle" attention={summary.unknown ? <Badge tone="warning">{summary.unknown} unknown</Badge> : null} detail={`Against ${unitsLabel(tenant.usage.used)} settled units. Source as of ${costs.asOf}.`}
				value={costs.lines.length ? `${usdLabel(summary.knownCents)} known` : "None recorded"} reason={costs.lines.length ? notes || "Every item is provider reported" : "No usage yet"} />
			{summary.perUnit !== null ? <ControlRow title="Cost per settled unit" value={`$${summary.perUnit.toFixed(3)}`} reason="Known cost over settled units; not a price" /> : null}
			<ControlRow title="Customer charge" detail="Rates aren't part of this view." value="Not calculated here" reason={tenant.setup ? "Charging mode not selected on the draft agreement" : "Charging mode is set on the agreement"} />
			<ControlRow title="Shared platform costs" detail="Azure, Temporal and other shared services." value="Not allocated" reason="Held at platform level; no tenant share is invented" />
			{costs.lines.length ? (
				<Table className="adm-cost-table" aria-label="Cost by source" columns={["Source", "Units", "Provider cost", "Evidence"]} template="minmax(0, 2.4fr) minmax(0, .9fr) minmax(0, .9fr) minmax(0, 1.2fr)">
					{costs.lines.map((line) => (
						<article key={line.id} className="ds-table-row adm-static-row" aria-label={line.source}>
							<PrimaryCell title={line.source} meta={line.meta} />
							<span className="ds-cell ds-cell-num">{line.held ? `${unitsLabel(line.held)} held` : line.evidence === "customer_key" ? "Not drawn down" : unitsLabel(line.units)}</span>
							<span className="ds-cell ds-cell-num">{line.cents !== null ? usdLabel(line.cents) : line.evidence === "customer_key" ? "Paid by customer" : "Unknown"}</span>
							<span className="ds-cell">{line.evidence === "unknown" ? <Badge tone="warning">{COST_EVIDENCE_LABEL[line.evidence]}</Badge> : COST_EVIDENCE_LABEL[line.evidence]}</span>
						</article>
					))}
				</Table>
			) : null}
		</Section>
	)
}

function UsageTab({ tenant, open }: { tenant: TenantState; open: (pending: Pending) => void }) {
	const { usage } = tenant
	const percent = Math.min(100, Math.round((usage.used / usage.allowance) * 100))
	return (
		<>
			<p className="adm-usage-figure"><strong>{percent}%</strong><span>{unitsLabel(usage.used)} of {unitsLabel(usage.allowance)} units settled this cycle · resets {usage.resets}</span></p>
			<span className="adm-meter" aria-hidden="true"><i style={{ width: `${percent}%` }} /></span>
			<Section title="This cycle" description="Reservations and settled usage come from the commercial ledger. Past consumption is never edited.">
				<ControlRow title="Allowance" layers={`${tenant.packageName} · agreement revision ${tenant.packageRevision}`} value={`${unitsLabel(usage.allowance)} units`} reason={usage.adjustments.length ? `Includes ${usage.adjustments.length} adjustment${usage.adjustments.length === 1 ? "" : "s"}` : "Package value"} />
				<ControlRow title="Settled usage" value={`${unitsLabel(usage.used)} units`} reason="Final, from provider usage" />
				<ControlRow title="Open reservations" detail="Held while a job runs; settled or released when it finishes." value={`${unitsLabel(usage.reservations)} units`} reason={`${usage.reservationJobs} job${usage.reservationJobs === 1 ? "" : "s"}`} />
				<ControlRow title="Reconciliation" attention={usage.reconciliation.length ? <Badge tone="warning">{usage.reconciliation.length} unresolved</Badge> : null} detail={usage.reconciliation[0] ?? "Every settled job matches its provider usage."} value={usage.reconciliation.length ? "Cost unknown" : "Reconciled"} reason={usage.reconciliation.length ? "Shown as unknown, never as zero" : "As of 09:41"} />
			</Section>
			<CostsSection tenant={tenant} />
			<Section title="Adjustments" description="Credits and debits are new entries with a reason and a ticket." actions={<Allowed action="tenant.change"><Button size="sm" onClick={() => open({ kind: "adjust" })}>Add compensating adjustment</Button></Allowed>}>
				{usage.adjustments.length ? usage.adjustments.map((adjustment) => <ControlRow key={adjustment.id} title={`${adjustment.units > 0 ? "+" : ""}${unitsLabel(adjustment.units)} units`} detail={adjustment.reason} value={adjustment.ticket || "—"} reason={adjustment.at} />) : <p className="adm-empty-line">No adjustments this cycle.</p>}
			</Section>
		</>
	)
}

function OperationsTab({ tenant, platform, open }: { tenant: TenantState; platform: PlatformState; open: (pending: Pending) => void }) {
	const connectors = Object.values(tenant.connectors).filter(Boolean).length
	const rows: Array<{ name: string; shipped: string; environment: string; rights: string; effective: { value: string; reason: string } }> = [
		...(["discovery", "agentix", "voice"] as ModuleKey[]).map((key) => {
			const entry = tenant.modules[key]
			const effective = moduleEffective(tenant, key, platform)
			return { name: MODULE_LABEL[key], shipped: "Yes", environment: platform.stops[key] ? "Stopped" : "Ready", rights: (entry.override ?? entry.package) ? "Granted" : "Not granted", effective }
		}),
		{ name: "Integrations", shipped: "Yes", environment: platform.stops.integrations ? "Stopped" : "Ready", rights: connectors ? `${connectors} connectors` : "None enabled", effective: platform.stops.integrations || tenant.stop ? { value: "Stopped", reason: "A stop is in effect" } : connectors ? { value: "Allowed", reason: "Through enabled connectors only" } : { value: "Unavailable", reason: "No connector enabled" } },
	]
	return (
		<>
			<Section title="Readiness" description={`Shipped support, environment readiness and this tenant's rights, resolved by the same evaluator the API and workers use. Evidence: release ${RELEASE}, tenant revision ${tenant.revision}, 09:41.`}>
				<Table aria-label="Readiness" columns={["Capability", "Shipped", "Environment", "Tenant rights", "Effective"]} template="minmax(0, 1.2fr) minmax(0, .6fr) minmax(0, .8fr) minmax(0, 1fr) minmax(0, 2fr)">
					{rows.map((row) => (
						<article key={row.name} className="ds-table-row adm-static-row" aria-label={row.name}>
							<span className="ds-cell adm-strong">{row.name}</span>
							<span className="ds-cell">{row.shipped}</span>
							<span className="ds-cell">{row.environment}</span>
							<span className="ds-cell">{row.rights}</span>
							<PrimaryCell title={row.effective.value} meta={row.effective.reason} />
						</article>
					))}
				</Table>
			</Section>
			<Section title="Stops" description="One short command: a reason, a confirmation and a current MFA. Deployment and rollback never reset a stop.">
				{tenant.stop ? (
					<ControlRow title={`${STOP_LABEL[tenant.stop.mode]} · ${tenant.stop.scope}`} attention={<Badge tone="danger">In effect</Badge>} detail={`Since ${tenant.stop.at} · ${REASON_LABEL[tenant.stop.reason]}`} value="Stopped" reason="New protected work is refused" action={<Allowed action="tenant.stop"><Button size="sm" onClick={() => open({ kind: "lift" })}>Lift stop</Button></Allowed>} />
				) : (
					<ControlRow title="No stop in effect" detail="Pause new work, make it read-only, block it, or suspend the tenant." value="Running" reason="Every other check still applies" action={<Allowed action="tenant.stop"><Button size="sm" className="adm-danger" onClick={() => open({ kind: "stop" })}>Emergency stop</Button></Allowed>} />
				)}
			</Section>
		</>
	)
}

export function TenantDetail({ tenant, platform, receipts, tab, onTab, initialReceiptId = null }: { tenant: TenantState; platform: PlatformState; receipts: Receipt[]; tab: TenantTab; onTab: (tab: TenantTab) => void; initialReceiptId?: string | null }) {
	const [pending, setPending] = useState<Pending | null>(null)
	const [receiptId, setReceiptId] = useState<string | null>(initialReceiptId)
	const gaps = setupGaps(tenant)
	const close = () => setPending(null)
	const props = { tenant, platform, onClose: close, onPublished: (receipt: Receipt) => setReceiptId(receipt.id) }
	return (
		<>
			<PageHeader title={tenant.name} description={`${tenant.packageName} · ${tenant.region} · tenant revision ${tenant.revision}`} actions={<Badge tone={lifecycleTone(tenant.lifecycle)}>{LIFECYCLE_LABEL[tenant.lifecycle]}</Badge>} />
			{gaps.length ? <Banner tone="warning" icon={<WarningCircle aria-hidden="true" />}>{tenant.setup ? `Setup is incomplete: ${gaps.join(" ")}` : gaps[0]}</Banner> : null}
			<ReceiptLine receiptId={receiptId} />
			<div className="ds-tabstrip org-tabs" role="tablist" aria-label={`${tenant.name} controls`} onKeyDown={(event) => onTabKeys(event, TENANT_TABS, tab, onTab)}>
				{TENANT_TABS.map((item) => <button key={item} type="button" role="tab" id={`tenant-tab-${item}`} aria-selected={tab === item} aria-controls="tenant-panel" tabIndex={tab === item ? 0 : -1} onClick={() => onTab(item)}>{TAB_LABEL[item]}</button>)}
			</div>
			<div id="tenant-panel" role="tabpanel" aria-labelledby={`tenant-tab-${tab}`}>
				{tab === "access" ? <AccessTab tenant={tenant} platform={platform} open={setPending} onTab={onTab} />
					: tab === "models" ? <ModelsTab tenant={tenant} platform={platform} open={setPending} />
					: tab === "modules" ? <ModulesTab tenant={tenant} platform={platform} open={setPending} />
					: tab === "usage" ? <UsageTab tenant={tenant} open={setPending} />
					: tab === "operations" ? <OperationsTab tenant={tenant} platform={platform} open={setPending} />
					: <Section title="Change history" description="Receipts for every staff change to this tenant. History is append-only; a rollback is a new change."><ReceiptTable label="Change history" receipts={receipts.filter((receipt) => receipt.scope === tenant.name)} /></Section>}
			</div>
			{pending?.kind === "module" ? <ModuleChange {...props} moduleKey={pending.key} /> : null}
			{pending?.kind === "seats" ? <SeatsChange {...props} /> : null}
			{pending?.kind === "models" ? <ModelsChange {...props} taskId={pending.taskId} /> : null}
			{pending?.kind === "research" ? <ResearchChange {...props} /> : null}
			{pending?.kind === "network" ? <NetworkChange {...props} /> : null}
			{pending?.kind === "tools" ? <ToolsChange {...props} /> : null}
			{pending?.kind === "connector" ? <ConnectorChange {...props} connectorKey={pending.key} /> : null}
			{pending?.kind === "adjust" ? <AdjustmentChange {...props} /> : null}
			{pending?.kind === "stop" ? <StopChange {...props} preset={pending.preset} /> : null}
			{pending?.kind === "lift" && tenant.stop ? <LiftStopChange {...props} /> : null}
			{pending?.kind === "invitation" ? <InvitationChange {...props} invitationId={pending.id} mode={pending.mode} /> : null}
			{pending?.kind === "sessions" ? <SessionsChange {...props} /> : null}
			{pending?.kind === "owner" && tenant.setup ? <ReplaceOwnerChange tenant={tenant} onClose={close} onPublished={props.onPublished} /> : null}
		</>
	)
}
