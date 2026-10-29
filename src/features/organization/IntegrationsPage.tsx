import { ArrowRight, CircleNotch, FileText, Plug, X } from "@phosphor-icons/react"
import { useEffect, useRef, useState, type RefObject } from "react"

import { Badge, Button, Dialog, EmptyState, Mark, PageHeader, SearchInput } from "@/design/primitives"
import { useSheetFocus } from "@/features/platform-prototype/useSheetFocus"
import "@/features/platform-prototype/account-pages.css"
import {
	CONNECTION_STATE_LABEL,
	CONNECTORS,
	connectorFor,
	grantableProjects,
	projectName,
	REASON_TEXT,
	VIEWER_ID,
	type Connection,
	type Connector,
	type ConnectorKey,
} from "./model"
import {
	abandonConnection,
	checkConnection,
	confirmConnection,
	consumeIntent,
	disconnect,
	reconnect,
	requestSection,
	setClasses,
	setGrants,
	startConnection,
	useOrganization,
} from "./store"
import { AccountTopbar, ChangeSummary, FreshSignInNote, useFreshSignIn } from "./shared"

/*
 * Integrations, as INT-1 plans the customer's connection management on top of the demo's own
 * page: personal connections that start with reads only and no projects, project grants and
 * read/write classes as separate deliberate steps, the provider sign-in followed by an explicit
 * account confirmation, reconnect that must return the same account, and a disconnect that stops
 * new use at once while the provider-side cleanup is tracked. Connectors that can't be connected
 * here say why and offer the one next step. Connection events go to the organization audit log.
 */

// What a connection may do is its own classes within the organization's ceiling.
const classesLabel = (connection: Connection, orgAllowsWrites = true) => !connection.classes.includes("write") ? "Read only" : !orgAllowsWrites ? "Read only (organization policy)" : connection.classes.includes("read") ? "Read and write" : "Write"
const projectsLabel = (count: number) => count === 0 ? "no projects yet" : count === 1 ? "1 project" : `${count} projects`
const routeLabel = (connector: Connector) => connector.route === "native" ? "A MAXION native adapter" : "Merge"

function stateBadge(connection: Connection) {
	if (connection.state === "active") return null
	const tone = connection.state === "needs_reconnect" || connection.state === "awaiting_confirmation" ? "warning" : connection.state === "failed" ? "danger" : "neutral"
	return <Badge tone={tone}>{CONNECTION_STATE_LABEL[connection.state]}</Badge>
}

export function IntegrationsPage({ onCommand }: { active?: boolean; onCommand?: () => void }) {
	const org = useOrganization()
	const [query, setQuery] = useState("")
	const [message, setMessage] = useState("")
	const [openId, setOpenId] = useState<string | null>(null)
	const [connecting, setConnecting] = useState<{ key: ConnectorKey; id: string | null } | null>(null)
	const sheetRef = useRef<HTMLElement>(null)
	useSheetFocus(openId !== null, () => setOpenId(null), sheetRef)

	// A link from Discover or Agentix ("Connect another account") opens that connector's dialog once.
	useEffect(() => {
		const intent = org.intent
		if (!intent || intent.section !== "integrations") return
		consumeIntent(intent.tick)
		if (intent.connect) setConnecting({ key: intent.connect, id: null })
	}, [org.intent])

	const q = query.trim().toLowerCase()
	const matches = (connector: Connector) => !q || `${connector.name} ${connector.category}`.toLowerCase().includes(q)
	const mine = org.connections.filter((connection) => connection.ownerId === VIEWER_ID && matches(connectorFor(connection.connector)))
	const others = org.connections.filter((connection) => connection.ownerId !== VIEWER_ID && matches(connectorFor(connection.connector)))
	const live = new Set(org.connections.filter((connection) => connection.ownerId === VIEWER_ID && connection.state !== "disconnected").map((connection) => connection.connector))
	const available = CONNECTORS.filter((connector) => !live.has(connector.key) && matches(connector))
	const active = org.connections.filter((connection) => connection.ownerId === VIEWER_ID && connection.state === "active").length
	const attention = org.connections.filter((connection) => connection.ownerId === VIEWER_ID && (connection.state === "needs_reconnect" || connection.state === "awaiting_confirmation")).length
	const opened = org.connections.find((connection) => connection.id === openId) ?? null
	const nothing = mine.length + others.length + available.length === 0

	const connectionRow = (connection: Connection) => {
		const connector = connectorFor(connection.connector)
		const meta = connection.state === "disconnected"
			? `Disconnected · provider cleanup ${connection.cleanup === "done" ? "done" : "pending"}`
			: `${connection.accountLabel} · ${classesLabel(connection, org.policy.integrations.classes === "read_write")} · ${projectsLabel(connection.projects.length)}`
		return (
			<article key={connection.id} className="acc-row" aria-label={`${connector.name}, ${CONNECTION_STATE_LABEL[connection.state]}`}>
				<Mark seed={connector.name} tone="neutral" />
				<span className="acc-row-main"><strong>{connector.name}{stateBadge(connection)}</strong><small>{meta}</small></span>
				<span className="acc-row-actions">
					{connection.state === "needs_reconnect" ? <Button size="xs" variant="primary" onClick={() => { reconnect(connection.id); setMessage(`Reconnecting ${connector.name}. It must return the same account.`) }}>Reconnect</Button> : null}
					{connection.state === "awaiting_confirmation" ? <Button size="xs" variant="primary" onClick={() => setConnecting({ key: connection.connector, id: connection.id })}>Confirm account</Button> : null}
					{connection.state === "verifying" ? <span className="org-status" role="status"><CircleNotch className="spin" aria-hidden="true" />Finishing</span> : null}
					{connection.state === "disconnected"
						? <Button size="xs" aria-label={`Details for ${connector.name}`} onClick={() => setOpenId(connection.id)}>Details</Button>
						: <Button size="xs" aria-label={`Manage ${connector.name}`} onClick={() => setOpenId(connection.id)}>Manage</Button>}
				</span>
			</article>
		)
	}

	return (
		<div className="ds-scope acc-frame">
			<AccountTopbar title="Integrations" onCommand={onCommand} />
			<div className="acc-page">
				<PageHeader
					title="Integrations"
					description="Connect your own accounts, then choose which projects may use each one. MAX never gets more access than the account already has."
					actions={<Button onClick={() => requestSection({ section: "settings", tab: "audit", auditCategory: "connections" })}><FileText aria-hidden="true" />Audit log</Button>} />
				<p className="org-facts">
					<span><strong>{active}</strong> active</span>
					{attention ? <span className="is-attention"><strong>{attention}</strong> {attention === 1 ? "needs" : "need"} you</span> : null}
					<span>Organization policy: {org.policy.integrations.classes === "read" ? "reads only" : "reads and approved writes"}</span>
				</p>
				<SearchInput className="acc-search" label="Search integrations" placeholder="Search integrations" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} />
				{nothing ? (
					<EmptyState icon={<Plug aria-hidden="true" />} title="No matching integrations" action={<Button onClick={() => setQuery("")}>Show all integrations</Button>}>
						<p>Try a system name such as SharePoint, or a category such as CRM.</p>
					</EmptyState>
				) : (
					<div className="acc-list">
						{mine.length ? (
							<section className="acc-group" aria-label="Your connections">
								<h2 className="acc-group-title">Your connections<span><span className="sr-only">, </span>Personal · only you can change them</span></h2>
								{mine.map(connectionRow)}
							</section>
						) : null}
						{others.length ? (
							<section className="acc-group" aria-label="Others in your organization">
								<h2 className="acc-group-title">Others in {org.name}<span><span className="sr-only">, </span>You see that they exist, never their accounts</span></h2>
								{others.map((connection) => {
									const connector = connectorFor(connection.connector)
									return (
										<article key={connection.id} className="acc-row" aria-label={`${connector.name}, ${connection.ownerName}`}>
											<Mark seed={connector.name} tone="neutral" />
											<span className="acc-row-main"><strong>{connector.name}{stateBadge(connection)}</strong><small>{connection.ownerName} · personal · {classesLabel(connection, org.policy.integrations.classes === "read_write")} · {connection.projects.map(projectName).join(", ") || "no projects"}</small></span>
										</article>
									)
								})}
							</section>
						) : null}
						{available.length ? (
							<section className="acc-group" aria-label="Add a connection">
								<h2 className="acc-group-title">Add a connection<span><span className="sr-only">, </span>Starts with reads only and no projects</span></h2>
								{available.map((connector) => {
									const blocked = connector.availability.state !== "available" ? connector.availability : null
									return (
										<article key={connector.key} className="acc-row" aria-label={connector.name}>
											<Mark seed={connector.name} tone="neutral" />
											<span className="acc-row-main">
												<strong>{connector.name}{blocked ? <Badge>{blocked.reason}</Badge> : null}</strong>
												<small>{blocked ? blocked.next : `${connector.category} · sign in with ${connector.signIn}`}</small>
											</span>
											<span className="acc-row-actions">
												{!blocked ? <Button size="xs" variant="primary" aria-label={`Connect ${connector.name}`} onClick={() => setConnecting({ key: connector.key, id: null })}>Connect</Button>
													: blocked.state === "not_entitled" ? <Button size="xs" onClick={() => setMessage(`Request for ${connector.name} recorded for your MAXION contact. Nothing changes until it's in your agreement.`)}>Ask MAXION</Button> : null}
											</span>
										</article>
									)
								})}
							</section>
						) : null}
					</div>
				)}
				<div className="mxp-live-message" aria-live="polite">{message}</div>
			</div>
			{opened ? <ConnectionSheet key={opened.id} connection={opened} sheetRef={sheetRef} onClose={() => setOpenId(null)} onMessage={setMessage} /> : null}
			<ConnectDialog
				state={connecting}
				onStarted={(id) => setConnecting((current) => current ? { ...current, id } : current)}
				onClose={() => setConnecting(null)}
				onChooseProjects={(id) => { setConnecting(null); setOpenId(id) }}
				onMessage={setMessage} />
		</div>
	)
}

/*
 * Connect is the ElevenLabs add dialog's composition: what it is, the choice that matters, then
 * one primary action. The provider's own sign-in happens away from MAXION; on return the account
 * is verified, then the person confirms that it is the account they meant.
 */
function ConnectDialog({ state, onStarted, onClose, onChooseProjects, onMessage }: {
	state: { key: ConnectorKey; id: string | null } | null
	onStarted: (id: string) => void
	onClose: () => void
	onChooseProjects: (id: string) => void
	onMessage: (text: string) => void
}) {
	const org = useOrganization()
	const connector = state ? connectorFor(state.key) : null
	const connection = state?.id ? org.connections.find((item) => item.id === state.id) ?? null : null
	if (!connector) return <Dialog open={false} title="" onClose={onClose}>{null}</Dialog>
	const phase = !connection ? "choose" : connection.state === "verifying" ? "verifying" : connection.state === "awaiting_confirmation" ? "confirm" : connection.state === "active" ? "done" : "choose"
	const cancel = () => {
		if (connection && connection.state !== "active") { abandonConnection(connection.id); onMessage(`${connector.name} wasn't connected. The sign-in was revoked.`) }
		onClose()
	}
	const reads = connector.operations.filter((operation) => operation.cls === "read")
	const writes = connector.operations.filter((operation) => operation.cls === "write")
	const title = phase === "done" ? `${connector.name} is connected` : phase === "confirm" ? "Confirm the account" : phase === "verifying" ? "Finishing the connection" : `Connect ${connector.name}`
	const description = phase === "done"
		? "It can read what this account can see, in no projects yet. Choose the projects that may use it."
		: phase === "confirm" ? `${connector.signIn} returned this account. Confirm it's the one you meant before anything can use it.`
			: phase === "verifying" ? `Checking the account ${connector.signIn} returned.`
				: `You'll sign in with ${connector.signIn}. MAX gets only what that account can already see, and only in the projects you choose.`
	const footer = phase === "choose"
		? <><Button onClick={cancel}>Cancel</Button><Button variant="primary" onClick={() => onStarted(startConnection(connector.key))}>Continue to {connector.signIn}<ArrowRight aria-hidden="true" /></Button></>
		: phase === "verifying" ? <Button onClick={cancel}>Cancel</Button>
			: phase === "confirm" ? <><Button onClick={cancel}>Not this account</Button><Button variant="primary" data-autofocus onClick={() => { if (connection) { confirmConnection(connection.id); onMessage(`${connector.name} connected with reads only and no projects.`) } }}>Confirm account</Button></>
				: <><Button onClick={onClose}>Later</Button><Button variant="primary" data-autofocus onClick={() => connection && onChooseProjects(connection.id)}>Choose projects<ArrowRight aria-hidden="true" /></Button></>
	return (
		<Dialog open title={title} description={description} onClose={cancel} footer={footer}>
			{phase === "choose" ? (
				<>
					<fieldset className="org-choices">
						<legend className="ds-label">Whose account</legend>
						<label className="org-choice"><input type="radio" name="connect-owner" defaultChecked /><span><strong>Personal</strong><small>Your own {connector.signIn} account. Only you can change or disconnect it.</small></span></label>
						<label className="org-choice is-disabled"><input type="radio" name="connect-owner" disabled /><span><strong>Organization</strong><small>A shared account for {org.name}. Organization connections aren't available yet.</small></span></label>
					</fieldset>
					<div>
						<p className="ds-label">What it can do</p>
						<ul className="org-ops">
							{[...reads, ...writes].map((operation) => (
								<li key={operation.label}><span>{operation.label}</span><small>{operation.cls === "read" ? "Read" : operation.qualified ? (operation.approval ?? "Write") : "Write · not available yet"}</small></li>
							))}
						</ul>
						<p className="org-note">New connections start with reads only. Writes are a separate choice afterwards, and every write still needs its approval.</p>
					</div>
				</>
			) : phase === "verifying" ? (
				<p className="org-status" role="status"><CircleNotch className="spin" aria-hidden="true" />Verifying the account with {connector.signIn}…</p>
			) : connection ? (
				<dl className="org-terms">
					<div><dt>Account</dt><dd>{connection.accountLabel}</dd></div>
					<div><dt>Owner</dt><dd>You · personal</dd></div>
					<div><dt>Projects</dt><dd>{phase === "done" ? "None yet" : "None until you choose"}</dd></div>
					{phase === "confirm" ? <div><dt>Confirm within</dt><dd>{connection.confirmMinutes ?? 30} minutes, or the sign-in is revoked</dd></div> : <div><dt>Can do</dt><dd>Read</dd></div>}
				</dl>
			) : null}
		</Dialog>
	)
}

/* One connection: its status, account, project grants, what it may do, and disconnect. */
function ConnectionSheet({ connection, sheetRef, onClose, onMessage }: { connection: Connection; sheetRef: RefObject<HTMLElement>; onClose: () => void; onMessage: (text: string) => void }) {
	const org = useOrganization()
	const connector = connectorFor(connection.connector)
	const { fresh } = useFreshSignIn()
	const [projects, setProjects] = useState(connection.projects)
	const [checking, setChecking] = useState(false)
	const [confirmWrites, setConfirmWrites] = useState(false)
	const [confirmDisconnect, setConfirmDisconnect] = useState(false)
	const orgAllowsWrites = org.policy.integrations.classes === "read_write"
	const writes = connection.classes.includes("write")
	const ended = connection.state === "disconnected"
	const changed = projects.length !== connection.projects.length || projects.some((project) => !connection.projects.includes(project))
	const toggleProject = (id: string) => setProjects((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
	const saveProjects = () => {
		setGrants(connection.id, projects)
		onMessage(projects.length ? `${connector.name} can now be used in ${projects.map(projectName).join(", ")}.` : `${connector.name} is no longer available to any project.`)
	}
	const operationState = (operation: Connector["operations"][number]) => {
		if (operation.cls === "read") return "Available"
		if (!operation.qualified) return "Not available yet"
		if (!orgAllowsWrites) return "Off · your organization allows reads only"
		if (!writes) return "Off · writes not allowed on this connection"
		return operation.approval ?? "Available"
	}
	return (
		<>
			<button type="button" className="acc-scrim" aria-label={`Close ${connector.name}`} onClick={onClose} />
			<aside ref={sheetRef} className="acc-panel org-sheet" aria-label={`${connector.name} connection`}>
				<header><div><small>Personal connection</small><h2>{connector.name}</h2></div><Button size="sm" icon variant="ghost" aria-label={`Close ${connector.name}`} onClick={onClose}><X aria-hidden="true" /></Button></header>
				<div className="org-sheet-body">
					<section className="org-sheet-section" aria-label="Status">
						<h3>Status</h3>
						<div className="org-rows">
							<div className="org-row">
								<div className="org-row-main"><strong>{CONNECTION_STATE_LABEL[connection.state]}{stateBadge(connection)}</strong><small>{ended ? `Provider cleanup ${connection.cleanup === "done" ? "done. MAXION no longer holds this sign-in." : "pending. New use already stopped."}` : connection.reason ? REASON_TEXT[connection.reason] : `Last checked ${connection.lastVerified.toLowerCase()}`}</small></div>
								<div className="org-row-aside">
									{connection.state === "needs_reconnect" ? <Button size="sm" variant="primary" onClick={() => { reconnect(connection.id); onMessage(`Reconnecting ${connector.name}.`) }}>Reconnect</Button> : null}
									{connection.state === "active" ? <Button size="sm" disabled={checking} onClick={() => { setChecking(true); checkConnection(connection.id, () => { setChecking(false); onMessage(`${connector.name} answered. The account and its access are unchanged.`) }) }}>{checking ? "Checking…" : "Check now"}</Button> : null}
								</div>
							</div>
						</div>
					</section>

					<section className="org-sheet-section" aria-label="Account">
						<h3>Account</h3>
						<dl className="org-terms">
							<div><dt>Account</dt><dd>{connection.accountLabel || "Removed when it was disconnected"}</dd></div>
							<div><dt>Owner</dt><dd>You · personal</dd></div>
							<div><dt>Sign-in</dt><dd>{connector.signIn}</dd></div>
							<div><dt>Runs through</dt><dd>{routeLabel(connector)}</dd></div>
						</dl>
					</section>

					{!ended ? (
						<section className="org-sheet-section" aria-label="Projects">
							<h3>Projects that may use it</h3>
							<p>Work in these projects can pick this connection. Removing a project stops new use there at once.</p>
							<div className="org-choices">
								{grantableProjects().map((project) => (
									<label key={project.id} className={`org-choice${project.grantable ? "" : " is-disabled"}`}>
										<input type="checkbox" disabled={!project.grantable} checked={projects.includes(project.id)} onChange={() => toggleProject(project.id)} />
										<span><strong>{project.name}</strong>{project.reason ? <small>{project.reason}, so you can't give it this connection.</small> : null}</span>
									</label>
								))}
							</div>
							<div className="org-sheet-actions"><Button size="sm" variant="primary" disabled={!changed} onClick={saveProjects}>Save projects</Button></div>
						</section>
					) : null}

					<section className="org-sheet-section" aria-label="What MAX may do">
						<h3>What MAX may do</h3>
						{!ended ? (
							<div className="org-rows">
								<div className="org-row"><div className="org-row-main"><strong id={`${connection.id}-read`}>Read</strong><small>Always on: what this account can already see.</small></div><div className="org-row-aside"><input type="checkbox" className="ds-switch" checked disabled aria-labelledby={`${connection.id}-read`} /></div></div>
								<div className="org-row">
									<div className="org-row-main"><strong id={`${connection.id}-write`}>Write</strong><small>{!orgAllowsWrites ? "Your organization allows reads only." : connector.operations.some((operation) => operation.cls === "write" && operation.qualified) ? "Each write still needs its approval before it runs." : "This connector has no writes available yet."}</small></div>
									<div className="org-row-aside">
										{!orgAllowsWrites ? <Button size="sm" onClick={() => requestSection({ section: "settings", tab: "policy" })}>Policy</Button> : null}
										<input type="checkbox" className="ds-switch" aria-labelledby={`${connection.id}-write`} checked={writes} disabled={!orgAllowsWrites || !connector.operations.some((operation) => operation.cls === "write" && operation.qualified)} onChange={() => writes ? (setClasses(connection.id, ["read"]), onMessage(`${connector.name} is back to reads only.`)) : setConfirmWrites(true)} />
									</div>
								</div>
							</div>
						) : null}
						<ul className="org-ops">
							{connector.operations.map((operation) => <li key={operation.label}><span>{operation.label}<small>{operation.detail}</small></span><small>{ended ? "Stopped" : operationState(operation)}</small></li>)}
						</ul>
					</section>

					{!ended ? (
						<section className="org-sheet-section" aria-label="Disconnect">
							<h3>Disconnect</h3>
							<p>New use stops at once. Work already sent completes, and MAXION tracks deleting the sign-in at {connector.signIn}.</p>
							<div className="org-sheet-actions"><Button size="sm" className="acc-danger" onClick={() => setConfirmDisconnect(true)}>Disconnect {connector.name}</Button></div>
						</section>
					) : null}
				</div>
			</aside>
			<Dialog
				open={confirmWrites}
				title={`Allow writes through ${connector.name}?`}
				description="Agents can then ask to write through this account. Nothing is written without the approval each write needs."
				onClose={() => setConfirmWrites(false)}
				footer={<><Button onClick={() => setConfirmWrites(false)}>Cancel</Button><Button variant="primary" disabled={!fresh} onClick={() => { setClasses(connection.id, ["read", "write"]); setConfirmWrites(false); onMessage(`${connector.name} may now write, with approval.`) }}>Allow writes</Button></>}>
				<ChangeSummary rows={[
					{ label: "Connection", after: `${connector.name} · ${connection.accountLabel}` },
					{ label: "May do", before: "Read", after: "Read and write" },
					{ label: "Projects", after: connection.projects.map(projectName).join(", ") || "None yet" },
				]} />
				<FreshSignInNote />
			</Dialog>
			<Dialog
				open={confirmDisconnect}
				title={`Disconnect ${connector.name}?`}
				description="New use stops now. Work already sent completes. Provider cleanup is tracked."
				onClose={() => setConfirmDisconnect(false)}
				footer={<><Button onClick={() => setConfirmDisconnect(false)}>Keep connected</Button><Button variant="primary" className="org-danger" onClick={() => { disconnect(connection.id); setConfirmDisconnect(false); onMessage(`${connector.name} disconnected. New use stopped; provider cleanup is tracked in the audit log.`) }}>Disconnect</Button></>}>
				<ChangeSummary rows={[
					{ label: "Account", after: connection.accountLabel },
					{ label: "Projects losing it", after: connection.projects.map(projectName).join(", ") || "None" },
				]} />
			</Dialog>
		</>
	)
}
