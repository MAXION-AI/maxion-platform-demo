import { ArrowLeft, ArrowRight, CaretRight, CheckCircle, FileArrowDown, PauseCircle, Stack, UserCircle, WarningCircle } from "@phosphor-icons/react"
import { useEffect, useRef, useState, type RefObject } from "react"
import { Badge, Button as DsButton, Mark } from "@/design/primitives"
import type { WorkflowId } from "./initiatives"
import { intakeStatus, visiblePackage, type IntakeResult } from "./engine/engine"
import { SCENARIOS, WORKFLOW_IDS, type PackageSpec } from "./engine/scenarios"
import type { DiscoveryLink } from "./engine/types"
import { readState } from "./engine/storage"
import { DeployedAgentsPage } from "./DeployedAgentsPage"
import "./handoff.css"

/* One work item that is waiting on its owner, as reported to the shell. `label` names a decision that isn't a variance. */
export type AgentixPendingCase = { id: string; agentId: string; workflowId: WorkflowId; engagement: string; reference: string; title: string; phase: "approval" | "human" | "partial"; label?: string }
/* One engagement, as reported to the shell for search and routing. */
export type AgentixEngagementSummary = { id: string; name: string; workflowId: WorkflowId; status: "draft" | "active" | "paused"; duties: number; category: string }
export type AgentixAttention = {
	count: number; audience: boolean; approval: boolean
	/* Filled by Agentix once it has reported; absent on the shell's first render. */
	reported?: boolean
	decisions?: number
	setup?: number
	pending?: AgentixPendingCase[]
	engagements?: AgentixEngagementSummary[]
}
/* Where a Discovery design page was opened from, so it can lead back. */
export type AgentixOrigin = { engagementId: string; name: string }
export type AgentixIntent = { type: "workflow"; id: WorkflowId } | { type: "engagement"; id: string } | { type: "import"; id: WorkflowId } | { type: "surface"; id: "today" | "activity" } | { type: "decision"; id: "audience" | "approval"; runId?: string }
	/* Start an engagement, optionally from a Discovery that has no prebuilt operating design. */
	| { type: "create"; brief?: string; discovery?: DiscoveryLink }
	/* A Discovery handed its operating package to Agentix: receive it with the packet it came in, and open its review. */
	| { type: "handoff"; packageId: string; discovery: DiscoveryLink; note?: string }
export type AgentixIntentSignal = { tick: number; intent: AgentixIntent }

/*
 * How each Discovery design stands in Agentix: the package a list should show (its latest, unless the
 * customer demo is holding that one back for its own Discovery), and whether it's ready, in review or live.
 */
export type DesignDeployment = { status: IntakeResult; name: string; version: number; paused: boolean; pkg: PackageSpec }
/* A workflow whose every package is held back (the customer demo's revenue design, before its Discovery) has no entry. */
type Deployments = Partial<Record<WorkflowId, DesignDeployment>>
const readDeployments = (): Deployments => {
	const state = readState()
	// An engagement a demo has not created yet has no deployment to show.
	return Object.fromEntries(WORKFLOW_IDS.flatMap(id => { const pkg = visiblePackage(state, id); const engagement = state.engagements[id]; return pkg && engagement ? [[id, { status: intakeStatus(state, pkg.id), name: engagement.name, version: engagement.version, paused: engagement.status === "paused", pkg }]] : [] })) as Deployments
}
const sameDeployment = (a?: DesignDeployment, b?: DesignDeployment) => a === b || (!!a && !!b && a.status === b.status && a.name === b.name && a.version === b.version && a.paused === b.paused && a.pkg.id === b.pkg.id)
const sameDeployments = (a: Deployments, b: Deployments) => WORKFLOW_IDS.every(id => sameDeployment(a[id], b[id]))
const STATE_LABEL: Record<IntakeResult, string> = { proposal: "Ready to send", "in-review": "In review in Agentix", live: "Live in Agentix", unknown: "Unavailable" }

/*
 * Discovery pages stay mounted while hidden, so the saved Agentix state is read
 * again whenever the surface is shown again (a hidden node measures zero) and
 * when another tab changes it.
 */
function useDeployments(ref: RefObject<HTMLElement | null>, onShown?: () => void) {
	const [deployments, setDeployments] = useState(readDeployments)
	const shown = useRef(onShown)
	shown.current = onShown
	useEffect(() => {
		const refresh = () => setDeployments(current => { const next = readDeployments(); return sameDeployments(current, next) ? current : next })
		window.addEventListener("storage", refresh)
		const node = ref.current
		let visible = !!node && node.getClientRects().length > 0
		const observer = node && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
			const now = node.getClientRects().length > 0
			if (now && !visible) { refresh(); shown.current?.() }
			visible = now
		}) : null
		if (node) observer?.observe(node)
		return () => { window.removeEventListener("storage", refresh); observer?.disconnect() }
	}, [ref])
	return deployments
}
/* Set by a design page's back crumb, so the hub can return focus to the card that opened it. */
let returningDesign: WorkflowId | null = null

/* Completed process designs, shown on the Discovery hub as a quiet disclosure of marked cards. */
export function OperationalDiscoveryEntry({ onOpen }: { onOpen: (id: WorkflowId) => void }) {
	const root = useRef<HTMLElement>(null)
	const deployments = useDeployments(root, () => {
		const id = returningDesign
		returningDesign = null
		if (id) root.current?.querySelector<HTMLButtonElement>(`[data-design="${id}"]`)?.focus()
	})
	const shown = WORKFLOW_IDS.filter(id => deployments[id])
	const count = (status: IntakeResult) => shown.filter(id => deployments[id]!.status === status).length
	const live = count("live"), review = count("in-review"), ready = count("proposal")
	return (
		<section className="agw-discovery-packages" aria-label="Operational redesign packages" ref={root}>
			<details>
				<summary>
					<CaretRight size={14} className="agw-caret" aria-hidden="true" />
					<strong>Process designs for Agentix</strong>
					<span className="agw-count">{[live && `${live} live`, review && `${review} in review`, ready && `${ready} ready to send`].filter(Boolean).join(" · ")}</span>
				</summary>
				<p>Review an approved process design, then carry its evidence, criteria and limitations into Agentix.</p>
				<div className="agw-package-grid">
					{shown.map(id => {
						const pkg = deployments[id]!.pkg
						const state = deployments[id]!.status
						return (
							<button type="button" key={id} data-design={id} onClick={() => onOpen(id)}>
								<Mark seed={id} size="sm" />
								<span className="agw-package-text">
									<strong>{pkg.title} <span className="agw-version">v{pkg.version}</span></strong>
									<small title={`${STATE_LABEL[state]} · ${SCENARIOS[id].category}`}><span className="agw-package-state" data-state={state === "live" ? "active" : "draft"}>{STATE_LABEL[state]}</span> · {SCENARIOS[id].category}</small>
								</span>
								<ArrowRight size={14} aria-hidden="true" />
							</button>
						)
					})}
				</div>
			</details>
		</section>
	)
}

/* The design as a reading page, in the Studio document manner (mobbin 0462ca01). */
function PackageEvidence({ pkg }: { pkg: PackageSpec }) {
	return <>
		<section className="axi-section" aria-label="Target outcome"><h2>Target outcome</h2><p className="axi-lede">{pkg.outcome}</p></section>
		<section className="axi-section" aria-label="Outcome criteria">
			<h2>Outcome criteria</h2>
			<ul className="axi-checks">{pkg.criteria.map(criterion => <li key={criterion.id}><CheckCircle size={16} weight="fill" />{criterion.label}</li>)}</ul>
		</section>
		<section className="axi-section" aria-label="Supporting evidence">
			<h2>Supporting evidence</h2>
			<ul className="axi-sources">
				{pkg.evidence.map(source => (
					<li key={source.title}>
						<details>
							<summary><Mark seed={source.title} size="xs" /><span className="axi-source-title">{source.title}</span><CaretRight size={12} className="axi-caret" aria-hidden="true" /></summary>
							<p>{source.detail}</p>
							<small>Illustrative source · <span className="axi-mono">{pkg.id}</span> · read-only snapshot</small>
						</details>
					</li>
				))}
			</ul>
		</section>
		<section className="axi-section" aria-label="Scope">
			<h2>Scope</h2>
			<p className="axi-lede">In scope: {pkg.inScope.join(", ")}. Out of scope: {pkg.outScope.join(", ")}.</p>
		</section>
	</>
}

/*
 * The handoff is the ElevenLabs Review Changes panel (mobbin ff16450b) laid in
 * a reading column: what Agentix receives, row by row, with the recorded
 * limitations called out and the one filled action at the foot. A package
 * already live says so, and its action opens the running engagement.
 */
type DesignPageProps = { workflowId: WorkflowId; onBack: () => void; onSend: (id: WorkflowId) => void; origin?: AgentixOrigin | null; onBackToOrigin?: () => void }
export function DiscoveryHandoffWorkspace(props: DesignPageProps) {
	const root = useRef<HTMLDivElement>(null)
	const deployment = useDeployments(root)[props.workflowId]
	if (deployment) return <DesignDetail {...props} root={root} deployment={deployment} />
	// The customer demo holds this design back until its own Discovery sends it.
	return (
		<div className="axi-root agw-discovery-detail ds-scope" ref={root}>
			<header className="ds-topbar axi-topbar">
				<div className="ds-topbar-start"><button type="button" className="ds-crumb" onClick={props.onBack} aria-label="All discoveries" title="All discoveries"><ArrowLeft size={14} /><span>Discoveries</span></button></div>
			</header>
			<main className="axi-main"><div className="axi-column"><p className="axi-lede">This process design isn’t available yet. It comes from its own Discovery.</p></div></main>
		</div>
	)
}

function DesignDetail({ workflowId, onBack, onSend, origin, onBackToOrigin, root, deployment }: DesignPageProps & { root: RefObject<HTMLDivElement>; deployment: DesignDeployment }) {
	const heading = useRef<HTMLHeadingElement>(null)
	const scenario = SCENARIOS[workflowId]
	const pkg = deployment.pkg
	const returnTo = origin && onBackToOrigin ? origin : null
	useEffect(() => { if (!root.current?.closest("[hidden]")) heading.current?.focus({ preventScroll: true }) }, [workflowId])
	const team = scenario.team.filter(member => !member.package || member.package === pkg.id)
	const manifest = [
		{ label: "Outcome criteria", value: `${pkg.criteria.length} criteria, each with a duty and a check` },
		{ label: "Operating design", value: `${team.length} ${team.length === 1 ? "duty" : "duties"} · one accountable owner${pkg.kind === "expansion" ? " · reuses the deployed team" : ""}` },
		{ label: "Milestones", value: pkg.milestones.length ? pkg.milestones.map(milestone => milestone.title).join(", ") : "Ongoing cases only" },
		{ label: "Systems", value: scenario.systems.filter(system => !system.package || system.package === pkg.id).map(system => system.name).join(", ") },
		{ label: "Evidence", value: `${pkg.evidence.length} sources, referenced not summarised` },
	]
	const action = deployment.status === "live" ? "Open in Agentix" : deployment.status === "in-review" ? "Continue review in Agentix" : "Send to Agentix"
	return (
		<div className="axi-root agw-discovery-detail ds-scope" ref={root}>
			<header className="ds-topbar axi-topbar">
				<div className="ds-topbar-start">
					{returnTo
						? <button type="button" className="ds-crumb" onClick={onBackToOrigin} aria-label={`Back to ${returnTo.name}`} title={`Back to ${returnTo.name} in Agentix`}><ArrowLeft size={14} /><span>{returnTo.name}</span></button>
						: <button type="button" className="ds-crumb" onClick={() => { returningDesign = workflowId; onBack() }} aria-label="All discoveries" title="All discoveries"><ArrowLeft size={14} /><span>Discoveries</span></button>}
					<span className="ds-crumb-sep">/</span>
					<Mark seed={workflowId} size="xs" className="axi-crumb-mark" />
					<span className="ds-crumb-current">{pkg.title}</span>
				</div>
				<div className="ds-topbar-end" />
			</header>
			<main className="axi-main">
				<div className="axi-column">
					<header className="axi-head">
						<Mark seed={workflowId} />
						<div>
							<p className="axi-kicker">Discovery · Completed process design · v{pkg.version}</p>
							<h1 ref={heading} tabIndex={-1}>{pkg.title}</h1>
							<p>{pkg.summary}</p>
						</div>
					</header>
					<ul className="axi-pills" aria-label="Design summary">
						{deployment.status === "live" ? <li className="axi-pill is-positive">{deployment.paused ? <PauseCircle size={12} /> : <span className="axi-live-dot" aria-hidden="true" />}{deployment.paused ? "Paused" : "Live"} in Agentix · {deployment.name}</li>
							: deployment.status === "in-review" ? <li className="axi-pill"><FileArrowDown size={12} />In review in Agentix · {deployment.name}</li>
							: <li className="axi-pill is-positive"><CheckCircle size={12} weight="fill" />Ready for handoff</li>}
						<li className="axi-pill"><UserCircle size={12} />{scenario.owner}</li>
						<li className="axi-pill"><Stack size={12} />{scenario.category}</li>
					</ul>
					<section className="axi-package" aria-label="Handoff package">
						<header><h2>Handoff package</h2><span className="axi-mono">{pkg.id}</span></header>
						<p>{deployment.status === "live" ? `${deployment.name} runs from this package. Sending it again changes nothing.` : pkg.kind === "expansion" ? `Expands ${deployment.name}, which is already running. The deployed team is reused; you review the outcome, boundary and open questions before anything new runs.` : "Agentix receives a reference to each artifact and checks readiness before anything runs. A completed Discovery is not permission to act."}</p>
						<dl className="axi-manifest">
							{manifest.map(item => <div key={item.label}><dt><CheckCircle size={16} weight="fill" />{item.label}</dt><dd>{item.value}</dd></div>)}
							{pkg.limitations.map(limitation => <div key={limitation} className="is-gap"><dt><WarningCircle size={16} weight="fill" />Recorded limitation</dt><dd>{limitation}</dd></div>)}
						</dl>
						<footer>
							<small>{deployment.status === "live" ? `Already live as ${deployment.name} v${deployment.version}. No second engagement is created.` : deployment.status === "in-review" ? "The proposal is open in Agentix. Sending again reopens the same review." : `Opens a review for ${deployment.name}. Nothing runs until you activate it.`}</small>
							<DsButton variant="primary" onClick={() => onSend(workflowId)}>{action}<ArrowRight size={14} /></DsButton>
						</footer>
					</section>
					<PackageEvidence pkg={pkg} />
				</div>
			</main>
		</div>
	)
}

export const AgentixInitiativesPage = DeployedAgentsPage
