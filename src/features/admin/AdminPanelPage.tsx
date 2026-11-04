import { CaretRight, List, SignOut, X } from "@phosphor-icons/react"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useSearchParams } from "react-router-dom"

import { Badge, Button, EmptyState, PageHeader, PrimaryCell, SearchInput, Table, TableRow } from "@/design/primitives"
import { useDocumentTitle } from "@/app/hooks/useDocumentTitle"
import { publicAsset } from "@/lib/publicAsset"
import { CONNECTORS } from "@/features/organization/model"
import { Select } from "@/features/organization/shared"
import { NavGlyph } from "@/features/platform-prototype/NavGlyphs"
import { PlatformStopChange } from "./Changes"
import { can, ENVIRONMENT, LIFECYCLE_LABEL, MODULE_LABEL, moduleEffective, overCap, REASON_LABEL, seatCap, STOP_LABEL, type ModuleKey, type PlatformState, type Receipt, type StaffMember, type TenantState } from "./model"
import { StaffAccessView } from "./StaffAccess"
import { useActor, useAdmin, viewAs } from "./store"
import { NewTenantChange } from "./TenantCreate"
import { Allowed, lifecycleTone, onTabKeys, ReceiptLine, ReceiptTable, TENANT_TABS, TenantDetail, type TenantTab } from "./TenantDetail"
import "@/features/organization/organization.css"
import "./admin.css"

/*
 * MAXION's staff admin panel (doc 21, ADM-2). In the product it is a separate app on its own
 * origin, runtime and staff sign-in; here it is its own route. It extends the customer shell's
 * visual language (D-057): the same sidebar construction, top bar and primitives, with the staff
 * identity and environment always in view and the tenant beside every action. Staff govern
 * policy; they never see customer content, impersonate, deploy or edit configuration freely.
 */
type View = { kind: "tenants" } | { kind: "tenant"; id: string; tab: TenantTab } | { kind: "platform"; tab: PlatformTab } | { kind: "staff" }
const PLATFORM_TABS = ["models", "connectors", "stops", "history"] as const
type PlatformTab = (typeof PLATFORM_TABS)[number]
const PLATFORM_TAB_LABEL: Record<PlatformTab, string> = { models: "Model catalog", connectors: "Connector catalog", stops: "Stops", history: "History" }

function readView(params: URLSearchParams): View {
	const tenant = params.get("tenant")
	if (tenant) {
		const tab = TENANT_TABS.find((item) => item === params.get("tab")) ?? "access"
		return { kind: "tenant", id: tenant, tab }
	}
	if (params.get("view") === "platform") return { kind: "platform", tab: PLATFORM_TABS.find((item) => item === params.get("tab")) ?? "models" }
	if (params.get("view") === "staff") return { kind: "staff" }
	return { kind: "tenants" }
}
const writeView = (view: View) => view.kind === "tenant" ? { tenant: view.id, tab: view.tab } : view.kind === "platform" ? { view: "platform", tab: view.tab } : view.kind === "staff" ? { view: "staff" } : ({} as Record<string, string>)

function AdminSidebar({ view, actor, onNavigate, mobileOpen, onMobileOpenChange }: { view: View; actor?: StaffMember; onNavigate: (view: View) => void; mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void }) {
	const item = (kind: "tenants" | "platform" | "staff", label: string, glyph: "projects" | "settings" | "approvals") => {
		const current = view.kind === kind || (kind === "tenants" && view.kind === "tenant")
		return (
			<li key={kind}>
				<button type="button" className="mxp-portal-nav-item ds-nav-item" aria-current={current ? "page" : undefined} onClick={() => { onNavigate(kind === "platform" ? { kind, tab: "models" } : { kind }); onMobileOpenChange(false) }}>
					<NavGlyph name={glyph} className="mxp-portal-nav-icon" /><span>{label}</span>
				</button>
			</li>
		)
	}
	return (
		<>
			<button type="button" className="mxp-mobile-nav-trigger" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => onMobileOpenChange(true)}><List size={20} /></button>
			{mobileOpen ? <button type="button" className="mxp-mobile-nav-scrim" aria-label="Close navigation" onClick={() => onMobileOpenChange(false)} /> : null}
			<aside className={`mxp-portal-sidebar ds-scope ds-sidebar adm-sidebar${mobileOpen ? " is-mobile-open" : ""}`} aria-label="Admin navigation">
				<div className="mxp-portal-brand">
					<button type="button" aria-label="MAXION admin, all tenants" onClick={() => onNavigate({ kind: "tenants" })}>
						<span className="mxp-brand-lockup" style={{ "--mxp-lockup": `url(${publicAsset("maxion-logo-lockup-white.svg")})` } as CSSProperties} role="img" aria-label="MAXION" />
					</button>
					<button type="button" className="mxp-mobile-nav-close" aria-label="Close navigation" onClick={() => onMobileOpenChange(false)}><X size={18} /></button>
				</div>
				<p className="adm-env"><span>Admin</span><Badge tone="outline" dot>{ENVIRONMENT}</Badge></p>
				<nav className="mxp-portal-sidebar-scroll" aria-label="Admin sections">
					<ul className="ds-nav">{item("tenants", "Tenants", "projects")}{item("platform", "Platform", "settings")}{item("staff", "Staff access", "approvals")}</ul>
				</nav>
				<footer className="mxp-portal-sidebar-footer">
					<div className="mxp-sidebar-user"><span>{actor?.initials}</span><div><strong>{actor?.name}</strong><small>Staff · MFA verified</small></div></div>
					<div className="mxp-sidebar-actions"><button type="button" aria-label="Sign out of MAXION admin"><SignOut size={14} /><span>Sign out</span></button></div>
				</footer>
			</aside>
		</>
	)
}

/* A demo control: the same panel as each staff member sees it. In the product the identity comes from staff sign-in. */
function StaffIdentity({ staff, actor }: { staff: StaffMember[]; actor?: StaffMember }) {
	return (
		<div className="adm-viewas">
			<span aria-hidden="true">View as</span>
			<Select aria-label="View as" value={actor?.id} onChange={(event) => viewAs(event.target.value)}>
				{staff.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.roles.join(", ") || "No staff role"}</option>)}
			</Select>
		</div>
	)
}

function AdminTopbar({ view, tenant, staff, actor, onNavigate }: { view: View; tenant?: TenantState; staff: StaffMember[]; actor?: StaffMember; onNavigate: (view: View) => void }) {
	return (
		<div className="ds-scope mxp-portal-top adm-top">
			<header className="ds-topbar">
				<nav className="ds-topbar-start" aria-label="Breadcrumb">
					{view.kind === "tenant" ? <>
						<button type="button" className="ds-crumb" onClick={() => onNavigate({ kind: "tenants" })}>Tenants</button>
						<CaretRight size={12} aria-hidden="true" className="mxp-portal-crumb-sep" />
						<span className="ds-topbar-title" aria-current="page">{tenant?.name ?? "Unknown tenant"}</span>
					</> : <span className="ds-topbar-title" aria-current="page">{view.kind === "platform" ? "Platform" : view.kind === "staff" ? "Staff access" : "Tenants"}</span>}
				</nav>
				<div className="ds-topbar-end"><StaffIdentity staff={staff} actor={actor} /><span className="adm-identity">{ENVIRONMENT}</span></div>
			</header>
		</div>
	)
}

function TenantsView({ tenants, platform, onOpen, onCreated }: { tenants: TenantState[]; platform: PlatformState; onOpen: (id: string) => void; onCreated: (id: string, receipt: Receipt) => void }) {
	const [query, setQuery] = useState("")
	const [creating, setCreating] = useState(false)
	const q = query.trim().toLowerCase()
	const shown = tenants.filter((tenant) => `${tenant.name} ${tenant.packageName} ${LIFECYCLE_LABEL[tenant.lifecycle]}`.toLowerCase().includes(q))
	const attention = tenants.filter((tenant) => tenant.lifecycle !== "active" || overCap(tenant)).length
	return (
		<>
			<PageHeader title="Tenants" description="Customer organizations, what their agreements grant, and the controls MAXION publishes for each." actions={<Allowed action="tenant.bootstrap"><Button variant="primary" onClick={() => setCreating(true)}>New tenant</Button></Allowed>} />
			<p className="org-facts"><span><strong>{tenants.length}</strong> tenants</span><span className={attention ? "is-attention" : undefined}><strong>{attention}</strong> need attention</span><span>Tenant listing is paginated and audited; no customer content is shown here.</span></p>
			<SearchInput className="adm-search" label="Search tenants" placeholder="Search tenants" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} />
			<Table aria-label="Tenants" columns={["Organization", "Package", "Lifecycle", "Modules", "Seats", "Updated", ""]} template="minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, .8fr) minmax(0, .8fr) auto">
				{shown.length ? shown.map((tenant) => {
					const modules = (["discovery", "agentix", "voice"] as ModuleKey[]).filter((key) => tenant.modules[key].override ?? tenant.modules[key].package)
					const stopped = (["discovery", "agentix"] as ModuleKey[]).some((key) => !moduleEffective(tenant, key, platform).allowed && (tenant.modules[key].override ?? tenant.modules[key].package))
					return (
						<TableRow key={tenant.id} aria-label={`${tenant.name} · ${LIFECYCLE_LABEL[tenant.lifecycle]}`} onClick={() => onOpen(tenant.id)}>
							<PrimaryCell title={tenant.name} meta={`${tenant.region} · revision ${tenant.revision}`} />
							<span className="ds-cell">{tenant.packageName}</span>
							<span className="ds-cell"><Badge tone={lifecycleTone(tenant.lifecycle)}>{LIFECYCLE_LABEL[tenant.lifecycle]}</Badge></span>
							<span className="ds-cell adm-truncate">{modules.map((key) => MODULE_LABEL[key].replace(" interviews", "")).join(" · ") || "None"}{stopped ? " · restricted" : ""}</span>
							<span className={`ds-cell ds-cell-num${overCap(tenant) ? " adm-over" : ""}`}>{tenant.seats.used} / {seatCap(tenant)}</span>
							<span className="ds-cell">{tenant.updated}</span>
							<span className="ds-cell ds-cell-end"><CaretRight aria-hidden="true" /></span>
						</TableRow>
					)
				}) : <EmptyState title="No tenant matches" action={<Button onClick={() => setQuery("")}>Show all tenants</Button>}><p>Search by organization, package or lifecycle.</p></EmptyState>}
			</Table>
			{creating ? <NewTenantChange tenants={tenants} onClose={() => setCreating(false)} onCreated={(id, receipt) => { setCreating(false); onCreated(id, receipt) }} /> : null}
		</>
	)
}

type PlatformPending = { kind: "capability"; key: keyof PlatformState["stops"] } | { kind: "model"; route: string }
const CAPABILITIES: Array<{ key: keyof PlatformState["stops"]; label: string; detail: string }> = [
	{ key: "discovery", label: "Discovery", detail: "Managed Agents sessions, research and deliverables" },
	{ key: "agentix", label: "Agentix", detail: "Agent sessions, case admission and governed tool dispatch" },
	{ key: "voice", label: "Voice interviews", detail: "Owner and stakeholder voice sessions" },
	{ key: "integrations", label: "Integrations", detail: "Merge-backed and native connector dispatch" },
]
const READINESS_LABEL = { qualified: "Qualified in Production", staging: "Staging only", not_qualified: "Not qualified" } as const

function PlatformView({ platform, receipts, tab, onTab }: { platform: PlatformState; receipts: Receipt[]; tab: PlatformTab; onTab: (tab: PlatformTab) => void }) {
	const actor = useActor()
	const [pending, setPending] = useState<PlatformPending | null>(null)
	const [receiptId, setReceiptId] = useState<string | null>(null)
	return (
		<>
			<PageHeader title="Platform" description={`Catalogs and stops that apply to every tenant. A tenant is narrowed below these, never above. Platform revision ${platform.revision}.`} />
			<ReceiptLine receiptId={receiptId} />
			<div className="ds-tabstrip org-tabs" role="tablist" aria-label="Platform controls" onKeyDown={(event) => onTabKeys(event, PLATFORM_TABS, tab, onTab)}>
				{PLATFORM_TABS.map((item) => <button key={item} type="button" role="tab" id={`platform-tab-${item}`} aria-selected={tab === item} aria-controls="platform-panel" tabIndex={tab === item ? 0 : -1} onClick={() => onTab(item)}>{PLATFORM_TAB_LABEL[item]}</button>)}
			</div>
			<div id="platform-panel" role="tabpanel" aria-labelledby={`platform-tab-${tab}`}>
				{tab === "models" ? (
					<Table aria-label="Model catalog" columns={["Route", "Used for", "Readiness", "Cost estimate", ""]} template="minmax(0, 1.4fr) minmax(0, 1.8fr) minmax(0, 1.1fr) minmax(0, 1.2fr) auto">
						{platform.models.map((model) => (
							<article key={model.route} className="ds-table-row adm-static-row" aria-label={model.route}>
								<PrimaryCell title={model.route} meta={model.provider} />
								<span className="ds-cell adm-truncate">{model.modules}</span>
								<span className="ds-cell">{model.stopped ? <Badge tone="danger">Stopped</Badge> : <Badge tone={model.readiness === "qualified" ? "neutral" : "warning"}>{READINESS_LABEL[model.readiness]}</Badge>}</span>
								<span className="ds-cell">{can(actor, "cost.read") ? model.cost ?? "Not yet measured" : "Not in this view"}</span>
								<span className="ds-cell ds-cell-end"><Allowed action="platform.control"><Button size="xs" aria-label={`${model.stopped ? "Resume" : "Stop"} ${model.route}`} onClick={() => setPending({ kind: "model", route: model.route })}>{model.stopped ? "Resume" : "Stop"}</Button></Allowed></span>
							</article>
						))}
					</Table>
				) : tab === "connectors" ? (
					<Table aria-label="Connector catalog" columns={["Connector", "Route", "Operations qualified", "Status"]} template="minmax(0, 1.4fr) minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.2fr)">
						{CONNECTORS.map((connector) => (
							<article key={connector.key} className="ds-table-row adm-static-row" aria-label={connector.name}>
								<PrimaryCell title={connector.name} meta={connector.category} />
								<span className="ds-cell">{connector.route === "merge" ? "Through Merge" : "MAXION native adapter"}</span>
								<span className="ds-cell ds-cell-num">{connector.operations.filter((operation) => operation.qualified).length} of {connector.operations.length}</span>
								<span className="ds-cell">{connector.availability.state === "not_qualified" ? <Badge tone="warning">Not qualified</Badge> : <Badge>Qualified</Badge>}</span>
							</article>
						))}
					</Table>
				) : tab === "stops" ? (
					<section className="org-section" aria-label="Platform stops">
						<div className="org-section-head"><div><h2>Platform stops</h2><p>One short command each. A platform stop wins over any older tenant grant and is never reset by a release.</p></div></div>
						<div className="org-rows">
							{CAPABILITIES.map((capability) => {
								const stop = platform.stops[capability.key]
								return (
									<div key={capability.key} className="org-row adm-control">
										<div className="org-row-main"><strong>{capability.label}{stop ? <Badge tone="danger">{STOP_LABEL[stop.mode]}</Badge> : null}</strong><small>{capability.detail}</small></div>
										<div className="org-row-aside">
											<span className="org-value adm-effective">{stop ? "Stopped" : "Running"}<small>{stop ? `Since ${stop.at} · ${REASON_LABEL[stop.reason]}` : "No platform stop"}</small></span>
											<Allowed action="platform.control"><Button size="sm" className={stop ? undefined : "adm-danger"} aria-label={`${stop ? "Resume" : "Stop"} ${capability.label} for every tenant`} onClick={() => setPending({ kind: "capability", key: capability.key })}>{stop ? "Resume" : "Stop"}</Button></Allowed>
										</div>
									</div>
								)
							})}
						</div>
					</section>
				) : <ReceiptTable label="Platform history" receipts={receipts.filter((receipt) => receipt.scope === "Platform")} />}
			</div>
			{pending ? <PlatformStopChange platform={platform} target={pending.kind === "model" ? { kind: "model", route: pending.route } : { kind: "capability", key: pending.key }} onClose={() => setPending(null)} onPublished={(receipt) => setReceiptId(receipt.id)} /> : null}
		</>
	)
}

/* One line saying what this role can't do here, ahead of the row-by-row reasons. */
const VIEW_NOTE: Partial<Record<"Operator" | "Support", string>> = {
	Operator: `You're viewing as an Operator. New tenants, platform stops and staff access need a Platform Owner.`,
	Support: `You're viewing as Support. Configuration is read-only: you can resend or revoke invitations and revoke sessions, and internal costs aren't shown.`,
}

export function AdminPanelPage() {
	useDocumentTitle("MAXION admin")
	const { tenants, platform, receipts, staff } = useAdmin()
	const actor = useActor()
	const [createdReceipt, setCreatedReceipt] = useState<string | null>(null)
	const [params, setParams] = useSearchParams()
	const view = readView(params)
	const [mobileOpen, setMobileOpen] = useState(false)
	const mainRef = useRef<HTMLDivElement>(null)
	const navigate = (next: View) => setParams(writeView(next))
	const tenant = view.kind === "tenant" ? tenants.find((item) => item.id === view.id) : undefined
	const viewNote = can(actor, "platform.control") ? null : actor?.roles.includes("Operator") ? VIEW_NOTE.Operator : actor?.roles.includes("Support") ? VIEW_NOTE.Support : null
	// A new view starts at its top, as a page load would.
	useEffect(() => { mainRef.current?.scrollTo?.({ top: 0 }) }, [view.kind, view.kind === "tenant" ? view.id : ""])
	return (
		<div className="adm-root ds-scope">
			<AdminSidebar view={view} actor={actor} onNavigate={navigate} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
			<div className="adm-frame">
				<AdminTopbar view={view} tenant={tenant} staff={staff} actor={actor} onNavigate={navigate} />
				<main ref={mainRef} className="adm-main" aria-label="MAXION admin">
					<div className="adm-page">
						{viewNote ? <p className="adm-view-note">{viewNote}</p> : null}
						{!actor?.roles.length ? <EmptyState title="No staff role"><p>{actor?.name} holds no staff role, so the panel shows no tenant data. A Platform Owner can grant one in Staff access.</p></EmptyState>
							: view.kind === "tenants" ? <TenantsView tenants={tenants} platform={platform} onOpen={(id) => navigate({ kind: "tenant", id, tab: "access" })} onCreated={(id, receipt) => { setCreatedReceipt(receipt.id); navigate({ kind: "tenant", id, tab: "access" }) }} />
							: view.kind === "staff" ? <StaffAccessView staff={staff} receipts={receipts} onBack={() => navigate({ kind: "tenants" })} />
							: view.kind === "platform" ? <PlatformView platform={platform} receipts={receipts} tab={view.tab} onTab={(tab) => navigate({ kind: "platform", tab })} />
							: tenant ? <TenantDetail key={tenant.id} tenant={tenant} platform={platform} receipts={receipts} tab={view.tab} onTab={(tab) => navigate({ ...view, tab })} initialReceiptId={createdReceipt} />
							: <EmptyState title="This tenant isn't in the listing" action={<Button onClick={() => navigate({ kind: "tenants" })}>All tenants</Button>}><p>It may have been offboarded, or the link is wrong.</p></EmptyState>}
					</div>
				</main>
			</div>
		</div>
	)
}
