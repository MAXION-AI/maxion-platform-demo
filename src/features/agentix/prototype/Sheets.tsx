import { ArrowUpRight, CaretRight, ClockCountdown, Flask, Info, Lightning, PlugsConnected, Scroll, ShieldCheck, UsersThree, X } from "@phosphor-icons/react"
import { Button as DsButton, Mark, SegmentedTabs, TextButton } from "@/design/primitives"
import { useState, type ReactNode } from "react"
import type { WorkflowId } from "./initiatives"
import { releaseWindowFor } from "./engine/engine"
import { packageFor, SCENARIOS } from "./engine/scenarios"
import { describeClock, policyNote, shortTime, teamOf, teamPresence } from "./engine/selectors"
import type { AgentixState } from "./engine/types"
import { Status } from "./OperationsViews"

export type DetailSection = "team" | "sources" | "connections" | "rules"

/*
 * Team, sources, connections and operating rules share one side sheet (the
 * ElevenLabs user sheet, mobbin b87b3a86), opened from the header or from any
 * inline mention, so none of them needs a full-time panel.
 */
export function DetailsSheet({ state, engagementId, section, titleId, onSection, onClose, onOpenDiscovery, onOpenDiscoveryRecord, onReconnect, onRestore }: {
	state: AgentixState; engagementId: string; section: DetailSection; titleId: string
	onSection: (section: DetailSection) => void; onClose: () => void; onOpenDiscovery: () => void; onReconnect: () => void; onRestore: () => void
	/* Opens the Discovery a packet came from; absent where no shell holds Discovery. */
	onOpenDiscoveryRecord?: (recordId: string) => void
}) {
	const engagement = state.engagements[engagementId]
	const scenario = SCENARIOS[engagement.workflowId]
	const presence = teamPresence(state, engagementId)
	// Only Discovery packages are listed as sources; an engagement made from a brief shows the brief itself.
	const packages = [...engagement.packages, ...engagement.proposal?.origin === "discovery" && engagement.proposal.packageId ? [engagement.proposal.packageId] : []].map(packageFor).filter((pkg): pkg is NonNullable<typeof pkg> => !!pkg)
	const brief = engagement.proposal?.origin === "prompt" ? engagement.proposal.brief : engagement.origin.kind === "prompt" ? engagement.brief : ""
	// The Discovery that handed over the package in review, or the one this version was activated from.
	const handedOver = engagement.proposal?.discovery ?? (engagement.origin.kind === "discovery" ? engagement.origin.discovery : undefined)
	const systems = scenario.systems.filter(system => !system.package || engagement.packages.includes(system.package) || engagement.proposal?.packageId === system.package)
	return (
		<>
			<header className="aop-sheet-head">
				<span className="aop-icon-tile" aria-hidden="true"><UsersThree size={16} /></span>
				<h2 id={titleId}>{engagement.name} details</h2>
				<button type="button" className="aop-sheet-close" aria-label="Close details" onClick={onClose}><X size={16} /></button>
			</header>
			<div className="aop-sheet-tabs"><SegmentedTabs label="Details section" value={section} onChange={value => onSection(value as DetailSection)} options={[{ value: "team", label: "Team" }, { value: "sources", label: "Sources" }, { value: "connections", label: "Connections" }, { value: "rules", label: "Rules" }]} /></div>
			<div className="aop-drawer-scroll">
				{section === "team" ? (
					<section className="aop-sheet-section" aria-label="Team">
						<p className="aop-sheet-desc">{scenario.teamReason}</p>
						<ul className="aop-duties" aria-label="Agent team">
							{teamOf(engagement).map(member => {
								const now = presence.find(entry => entry.member.id === member.id)
								return (
									<li key={member.id}>
										<details>
											<summary>
												<Mark seed={`${engagement.workflowId}:${member.id}`} size="sm" />
												<span className="aop-list-text"><strong>{member.name}{member.accountable ? <span className="aop-chip">Accountable</span> : null}</strong><small>{now?.sentence ?? "Ready for incoming work"}</small></span>
												<Status label={now?.state === "working" ? "Working" : now?.state === "recovering" ? "Recovering" : now?.state === "decision" ? "Waiting on you" : now?.state === "dependency" ? "Waiting" : "Ready"} tone={now?.state === "working" ? "live" : now?.state === "recovering" || now?.state === "decision" ? "attention" : now?.state === "dependency" ? "neutral" : "positive"} />
												<CaretRight size={14} className="aop-caret" aria-hidden="true" />
											</summary>
											<dl className="aop-rows is-stacked">
												<div><dt>Duty</dt><dd>{member.duty}</dd></div>
												<div><dt>Permitted tools</dt><dd>{member.tools}</dd></div>
												<div><dt>Scope</dt><dd>{member.scope}</dd></div>
												{member.package ? <div><dt>Added by</dt><dd>{packageFor(member.package)?.title} v{packageFor(member.package)?.version}</dd></div> : null}
											</dl>
										</details>
									</li>
								)
							})}
						</ul>
						<p className="aop-sheet-note">Specialists are reused for new work; none is created per case. No specialist can change production except through the coordinator's release.</p>
					</section>
				) : null}
				{section === "sources" ? (
					<section className="aop-sheet-section" aria-label="Sources">
						{packages.map(pkg => (
							<article key={pkg.id} className="aop-sheet-card">
								<h3>{pkg.title} <span className="aop-subtle">v{pkg.version}</span></h3>
								<p className="aop-sheet-note"><span className="aop-mono">{pkg.id}</span> · {engagement.packages.includes(pkg.id) ? "active" : "in review"}</p>
								<p>{pkg.summary}</p>
								<ul className="aop-source-list">{pkg.evidence.map(source => <li key={source.title}><Mark seed={source.title} size="xs" /><span className="aop-list-text"><strong>{source.title}</strong><small>{source.detail}</small></span></li>)}</ul>
								{pkg.criteria.length ? <details className="aop-inline-disclosure"><summary><CaretRight size={12} />Outcome criteria and who covers them</summary><ul className="aop-coverage-list">{pkg.criteria.map(criterion => <li key={criterion.id}><strong>{criterion.label}</strong><small>{scenario.team.find(member => member.id === criterion.duty)?.name} · verified by {criterion.verify.toLowerCase()}</small></li>)}</ul></details> : null}
								{pkg.limitations.length ? <p className="aop-sheet-note">Limitations: {pkg.limitations.join(" ")}</p> : null}
							</article>
						))}
						{brief ? (
							<article className="aop-sheet-card">
								<h3>Your brief</h3>
								<p className="aop-sheet-note">Written in Agentix · scripted scenario: {scenario.name} (demo)</p>
								<p>{brief}</p>
							</article>
						) : null}
						{handedOver ? (
							<article className="aop-sheet-card">
								<h3>Handed over by Discovery</h3>
								<p className="aop-sheet-note">Packet <span className="aop-mono">{handedOver.packetId}</span> · frozen when it was sent</p>
								<p>{handedOver.title}</p>
							</article>
						) : null}
						{handedOver && onOpenDiscoveryRecord ? <DsButton size="sm" onClick={() => onOpenDiscoveryRecord(handedOver.recordId)}>Open the Discovery<ArrowUpRight size={12} /></DsButton>
							: packages.length ? <DsButton size="sm" onClick={onOpenDiscovery}>Open the Discovery design<ArrowUpRight size={12} /></DsButton> : null}
					</section>
				) : null}
				{section === "connections" ? (
					<section className="aop-sheet-section" aria-label="Connections">
						<ul className="aop-list">
							{systems.map(system => {
								const expired = system.capability === "notify" && engagement.connection === "expired"
								const blocked = system.capability === "production" && engagement.permission === "lost"
								return (
									<li key={system.id} className="aop-list-row">
										<Mark seed={system.name} size="sm" />
										<span className="aop-list-text"><strong>{system.name}</strong><small>{system.access} · {system.detail}</small></span>
										{expired ? <DsButton size="sm" onClick={onReconnect}>Reconnect (demo)</DsButton> : blocked ? <DsButton size="sm" onClick={onRestore}>Restore (demo)</DsButton> : null}
										<Status label={expired ? "Expired" : blocked ? "Permission lost" : engagement.checking ? "Checking" : "Checked"} tone={expired || blocked ? "danger" : engagement.checking ? "live" : "positive"} />
									</li>
								)
							})}
						</ul>
						<p className="aop-sheet-note">Demo connections. Credentials never reach the agents; changes go through qualified operations and the release adapter.</p>
					</section>
				) : null}
				{section === "rules" ? (
					<section className="aop-sheet-section" aria-label="Operating rules">
						<dl className="aop-rows is-stacked">
							<div><dt>Boundary</dt><dd>{scenario.boundary}</dd></div>
							{engagement.answers.release ? <div><dt>Production releases</dt><dd>{engagement.answers.release === "window" ? `Pipeline releases go out in the ${releaseWindowFor(engagement.workflowId).label} window under policy.` : "Each pipeline release waits for your approval, with its target, checks and recovery limits."} {policyNote(engagement)}</dd></div> : null}
							{engagement.answers.testdata ? <div><dt>Test data</dt><dd>{engagement.answers.testdata === "synthetic" ? "Synthetic 30-day sample, redacted. No production credentials in tests." : "Masked production extract (needs the data owner's approval)."}</dd></div> : null}
							<div><dt>Intake</dt><dd>{engagement.status === "paused" ? "Paused by you. Admitted work continues." : `Active · ${scenario.trigger}`}</dd></div>
							{engagement.cycles !== "off" ? <div><dt>Schedule</dt><dd>{engagement.cycles === "weekdays" ? "Weekdays" : "Every day"} at 06:00 London · next {shortTime(Date.parse(engagement.nextOccurrence))}</dd></div> : null}
							<div><dt>Concurrency</dt><dd>Up to three cases or cycles at once. Delivery milestones have their own capacity.</dd></div>
							<div><dt>Notifications</dt><dd>{engagement.holdNotifications ? "Held for the engagement by you." : "Sent to the approved audience only."}</dd></div>
							<div><dt>Deployment</dt><dd>v{engagement.version} · {engagement.origin.kind === "discovery" ? `from Discovery ${engagement.origin.title} v${engagement.origin.version}` : "from your brief"}</dd></div>
						</dl>
						{engagement.notes.length ? <details className="aop-case-disclosure"><summary><span>Engagement record</span><CaretRight size={14} /></summary><ol className="aop-record">{engagement.notes.map((note, index) => <li key={index}>{note}</li>)}</ol></details> : null}
					</section>
				) : null}
			</div>
			<footer className="aop-sheet-foot"><span>Changing scope or authority needs a new review.</span><DsButton variant="primary" onClick={onClose}>Done</DsButton></footer>
		</>
	)
}

/*
 * The presenter's controls, kept apart from the product and labelled as such.
 * Nothing here is a customer action.
 */
export function DemoControls({ state, titleId, focusId, onClose, onTick, onSkip, onWindow, onSchedule, onIncoming, onExpire, onLosePermission, onAckLoss, onReset, onRestartCustomerDemo, demoName }: {
	state: AgentixState; titleId: string; focusId?: string; onClose: () => void; onTick: () => void; onSkip: () => void; onWindow: () => void
	onSchedule: (id: string) => void; onIncoming: (id: string) => void; onExpire: (id: string) => void; onLosePermission: (id: string) => void; onAckLoss: () => void; onReset: () => void
	/* In the customer demo a reset restarts the whole story, Discovery included, instead of Agentix alone. */
	onRestartCustomerDemo?: (start: "discovery" | "package") => void
	/* The running demo's own name: three demos share this sheet, so it must never name another one. */
	demoName?: string
}) {
	const [chosen, setChosen] = useState(focusId && state.engagements[focusId]?.status !== "draft" ? focusId : "invoice")
	const [confirm, setConfirm] = useState(false)
	// After a reset or a migration the chosen engagement can disappear; fall back to one that exists.
	const active = Object.values(state.engagements).filter(entry => entry.status !== "draft")
	const target = state.engagements[chosen] && state.engagements[chosen].status !== "draft" ? chosen : active[0]?.id ?? ""
	const setTarget = setChosen
	const engagement = state.engagements[target] as (typeof state.engagements)[string] | undefined
	const held = state.releases.some(release => release.status === "held" && release.holdUntil && release.holdUntil > state.clock)
	const row = (icon: ReactNode, title: string, detail: string, action: ReactNode) => <li className="aop-list-row">{icon}<span className="aop-list-text"><strong>{title}</strong><small>{detail}</small></span>{action}</li>
	return (
		<>
			<header className="aop-sheet-head">
				<span className="aop-icon-tile" aria-hidden="true"><Flask size={16} /></span>
				<h2 id={titleId}>Controls</h2>
				<button type="button" className="aop-sheet-close" aria-label="Close controls" onClick={onClose}><X size={16} /></button>
			</header>
			<p className="aop-sheet-lede">For presenting only. Everything in Agentix is a frontend simulation: no real email, ERP, SQL Server, AWS or Teams action happens, and work stops when the browser closes.</p>
			<div className="aop-drawer-scroll">
				<section className="aop-sheet-section" aria-label="Clock">
					<div className="aop-subhead"><h3>Clock</h3><span>{describeClock(state.clock)}</span></div>
					<ul className="aop-list">
						{row(<ClockCountdown size={16} />, "Advance one minute", "Every engagement moves one step; work also advances on its own every few seconds.", <DsButton size="sm" onClick={onTick}>Advance</DsButton>)}
						{row(<ClockCountdown size={16} />, "Skip five minutes", "Moves the whole demo forward five steps.", <DsButton size="sm" onClick={onSkip}>Skip</DsButton>)}
						{row(<ClockCountdown size={16} />, "Go to the release window", held && engagement ? `${releaseWindowFor(engagement.workflowId).label} London, where held releases apply.` : "No release is waiting for the window.", <DsButton size="sm" disabled={!held} onClick={onWindow}>Go</DsButton>)}
					</ul>
				</section>
				<section className="aop-sheet-section" aria-label="Engagement">
					<label className="aop-inline-select">Apply to
						<span className="aop-select"><select value={target} onChange={event => setTarget(event.target.value)}>{active.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></span>
					</label>
					<ul className="aop-list aop-demo-list">
						{row(<Lightning size={16} />, "Add incoming work", "A new case arrives through the engagement's approved trigger.", <DsButton size="sm" disabled={engagement?.status !== "active"} onClick={() => onIncoming(target)}>Add</DsButton>)}
						{row(<ClockCountdown size={16} />, "Run the next scheduled cycle now", !engagement || engagement.cycles === "off" ? "This engagement has no recurring cycle yet." : `Starts the ${shortTime(Date.parse(engagement.nextOccurrence))} occurrence early. The clock doesn't jump.`, <DsButton size="sm" disabled={!engagement || engagement.cycles === "off" || engagement.status !== "active"} onClick={() => onSchedule(target)}>Run</DsButton>)}
						{row(<PlugsConnected size={16} />, "Expire the notification connection", "Notifications wait; record changes already made are kept.", <DsButton size="sm" disabled={engagement?.connection === "expired"} onClick={() => onExpire(target)}>Expire</DsButton>)}
						{engagement && SCENARIOS[engagement.workflowId].delivery ? row(<ShieldCheck size={16} />, "Remove release permission", "The release adapter loses write access; releases block before applying.", <DsButton size="sm" disabled={engagement?.permission === "lost"} onClick={() => onLosePermission(target)}>Remove</DsButton>) : null}
						{row(<Scroll size={16} />, "Lose the next release acknowledgement", state.demo.ackLoss ? "Armed: the next release's outcome will be unknown." : "The next release applies but its acknowledgement is lost.", <DsButton size="sm" disabled={state.demo.ackLoss} onClick={onAckLoss}>{state.demo.ackLoss ? "Armed" : "Arm"}</DsButton>)}
					</ul>
				</section>
				<section className="aop-sheet-section" aria-label="Scenarios">
					<p className="aop-sheet-desc"><Info size={14} /> {Object.keys(SCENARIOS).length} scripted scenarios stand in for what a live agent would work out: {Object.values(SCENARIOS).map(entry => entry.name).join(", ")}. A brief is matched to one of them; no language model is connected. Choosing a scenario is a demo control, not an AI model setting.</p>
				</section>
				<section className="aop-sheet-section" aria-label="Reset">
					{onRestartCustomerDemo ? (confirm ? (
						<div className="aop-sheet-card">
							<p>Start the {demoName ?? "customer"} demo again? Its Discovery and Agentix work are cleared. The everyday prototype's data is untouched.</p>
							<div className="aop-actions"><DsButton onClick={() => setConfirm(false)}>Keep current state</DsButton><DsButton onClick={() => onRestartCustomerDemo("package")}>From the finished package</DsButton><DsButton variant="primary" onClick={() => onRestartCustomerDemo("discovery")}>From the beginning</DsButton></div>
						</div>
					) : <TextButton onClick={() => setConfirm(true)}>Restart the customer demo…</TextButton>) : confirm ? (
						<div className="aop-sheet-card">
							<p>Reset every Agentix engagement, work item and message? Saved Discovery work and earlier demo versions are kept.</p>
							<div className="aop-actions"><DsButton onClick={() => setConfirm(false)}>Keep current state</DsButton><DsButton variant="primary" onClick={() => { setConfirm(false); onReset() }}>Reset Agentix demo</DsButton></div>
						</div>
					) : <TextButton onClick={() => setConfirm(true)}>Reset the Agentix demo…</TextButton>}
				</section>
			</div>
		</>
	)
}

export const scenarioNames = (ids: WorkflowId[]) => ids.map(id => SCENARIOS[id].name)
