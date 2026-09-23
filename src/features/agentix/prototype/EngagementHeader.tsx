import { Clock, GitBranch, Lightning, Pause, Play, Plus, RocketLaunch, UserCircle, UsersThree } from "@phosphor-icons/react"
import { Button as DsButton, Mark } from "@/design/primitives"
import { packageFor, scheduleLabel } from "./engine/scenarios"
import { health, teamOf } from "./engine/selectors"
import type { AgentixState, Engagement } from "./engine/types"
import { Status } from "./OperationsViews"

/* Where the engagement's current scope came from, stated exactly: the Discovery that handed it over, a Discovery package and its version, or the owner's own brief. */
export function provenance(engagement: Engagement) {
	if (engagement.origin.kind === "discovery" && engagement.origin.discovery) return `From Discovery · ${engagement.origin.discovery.title} · packet ${engagement.origin.discovery.packetId}`
	if (engagement.origin.kind === "discovery") return `From Discovery · ${engagement.origin.title} v${engagement.origin.version}`
	return "From your brief"
}

/*
 * The engagement header is the ElevenLabs batch-call header (mobbin 567dc229):
 * the name with its identifier and exact provenance, grey pills for the facts,
 * and the few actions that apply to the whole engagement at the right.
 */
export function EngagementHeader({ state, engagement, onToggleIntake, onDetails, onAssign, resumeHint }: { state: AgentixState; engagement: Engagement; onToggleIntake: () => void; onDetails: () => void; onAssign: () => void; resumeHint?: string }) {
	const status = health(state, engagement)
	const team = teamOf(engagement)
	const resumeBlocked = engagement.status === "paused" && (engagement.connection === "expired" || engagement.checking || !engagement.checked)
	const draft = engagement.status === "draft"
	const pending = engagement.proposal?.packageId && !draft ? packageFor(engagement.proposal.packageId) : undefined
	return (
		<header className="aop-engagement-head">
			<div className="aop-engagement-title">
				<Mark seed={engagement.id} />
				<div>
					<h1 tabIndex={-1}>{engagement.name}</h1>
					{/* Where the work came from is what a viewer needs here; an internal slug ("agx_invoice") only read as noise. */}
					<p>{provenance(engagement)}{pending ? ` · v${pending.version} in review` : ""}</p>
				</div>
			</div>
			<div className="aop-actions aop-engagement-actions">
				{!draft ? (
					<DsButton onClick={onToggleIntake} disabled={resumeBlocked} aria-describedby={resumeBlocked && resumeHint ? resumeHint : undefined} title={resumeBlocked ? "Available once the connection check passes" : undefined}>
						{engagement.status === "paused" ? <Play size={14} /> : <Pause size={14} />}{engagement.status === "paused" ? "Resume intake" : "Pause intake"}
					</DsButton>
				) : null}
				<DsButton onClick={onDetails}><UsersThree size={14} />Details</DsButton>
				{!draft ? <DsButton onClick={onAssign}><Plus size={14} />Assign work</DsButton> : null}
			</div>
			<ul className="aop-pill-row aop-engagement-pills" aria-label="Engagement summary">
				<li><Status label={status.label} tone={status.tone} live={status.tone === "live"} /></li>
				<li className="aop-pill is-optional"><UserCircle size={12} />{engagement.owner || "No owner yet"}</li>
				<li className="aop-pill is-optional">{engagement.cycles !== "off" ? <Clock size={12} /> : <Lightning size={12} />}{engagement.cycles !== "off" ? scheduleLabel(engagement.workflowId, engagement.cycles) : engagement.trigger === "Assignment" ? "Assigned work" : "Incoming events"}</li>
				<li className="aop-pill is-optional"><UsersThree size={12} />{team.length === 1 ? "One agent" : `Team of ${team.length}`}</li>
				<li className="aop-pill"><RocketLaunch size={12} />{draft ? "Draft" : `Deployment v${engagement.version}`}</li>
				{engagement.packages.length > 1 ? <li className="aop-pill is-optional"><GitBranch size={12} />{engagement.packages.length} packages</li> : null}
			</ul>
		</header>
	)
}
