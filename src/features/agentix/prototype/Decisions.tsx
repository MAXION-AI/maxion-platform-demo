import { ArrowRight, CalendarBlank, CaretRight, Pause, Play, Question, RocketLaunch, Scales, ShieldCheck, StopCircle, UserCircle, WarningCircle } from "@phosphor-icons/react"
import { Button as DsButton } from "@/design/primitives"
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { artifactBy, artifactSpec, decisionBy, itemBy, latest, releaseWindowOf, scenarioOf } from "./engine/engine"
import { decisionTitle, releaseSentence, releaseStatusLabel, shortTime } from "./engine/selectors"
import type { ReleaseAction } from "./engine/engine"
import type { AgentixState, Release } from "./engine/types"
import { Status } from "./OperationsViews"

/*
 * Decisions read like the ElevenLabs conversation overview's decision card
 * (mobbin 0ce2e993 family): a title, the facts it is bound to, and one filled
 * action. A choice that closes something asks once, in place.
 */
export function DecisionCard({ state, decisionId, onDecide, compact = false, context, onOpen }: {
	state: AgentixState; decisionId: string; onDecide: (option: string) => void; compact?: boolean; context?: ReactNode; onOpen?: () => void
}) {
	const decision = decisionBy(state, decisionId)
	const [confirming, setConfirming] = useState<string | null>(null)
	const keep = useRef<HTMLButtonElement>(null)
	const root = useRef<HTMLElement>(null)
	const asked = useRef<string | null>(null)
	const [returnFocus, setReturnFocus] = useState(0)
	const headingId = useId()
	useEffect(() => { if (confirming) keep.current?.focus() }, [confirming])
	// Leaving a confirmation puts focus back on the choice that opened it; that button is re-created, so it's found by its option.
	useEffect(() => { if (returnFocus && asked.current) root.current?.querySelector<HTMLButtonElement>(`[data-option="${asked.current}"]`)?.focus() }, [returnFocus])
	if (!decision) return null
	const spec = scenarioOf(state, decision.engagementId).decisions[decision.template]
	const item = itemBy(state, decision.workItemId)
	const release = decision.template === "release" ? state.releases.find(entry => entry.decisionId === decision.id) : undefined
	if (!spec || !item) return null
	const primary = spec.options.find(option => option.primary)!
	const secondary = spec.options.filter(option => !option.primary)
	const closing = (outcome: string) => outcome === "decline" || outcome === "keep-in-test"
	const icon = decision.kind === "question" ? <Question size={16} /> : decision.kind === "release" ? <RocketLaunch size={16} /> : <Scales size={16} />
	const choose = (option: string, outcome: string) => { if (closing(outcome) && confirming !== option) { asked.current = option; setConfirming(option); return } setConfirming(null); onDecide(option) }
	const back = () => { setConfirming(null); setReturnFocus(value => value + 1) }
	const cancel = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); back() } }
	const facts = release ? releaseFacts(state, release) : spec.facts.map(fact => fact.label === "Record" ? { ...fact, value: `${item.reference} · ${fact.value.toLowerCase()}` } : fact)
	const pending = confirming ? spec.options.find(option => option.id === confirming) : undefined
	return (
		<section ref={root} className={`aop-decision${compact ? " is-compact" : ""}`} aria-labelledby={headingId}>
			<header className="aop-decision-head">
				<span className="aop-icon-tile is-warning" aria-hidden="true">{icon}</span>
				<div>
					<p className="aop-decision-kicker">{decision.kind === "release" ? "Release approval" : decision.kind === "question" ? "Your decision" : "Approval"} · <span className="aop-mono">{item.reference}</span></p>
					<h3 id={headingId}>{decisionTitle(state, decision)}</h3>
					<p>{release ? `Your release policy asks for approval before each pipeline release. ${waitingOn(state, release)}` : spec.detail}</p>
				</div>
			</header>
			{item.status === "paused" ? <p className="aop-decision-facts">This work is paused. Your decision is recorded now; the work continues when you resume it.</p> : null}
			{context}
			{compact ? null : (
				<dl className="aop-rows">
					{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
				</dl>
			)}
			{compact && facts.length ? (
				<dl className="aop-decision-facts">
					{(release ? facts.filter(fact => fact.label === "Target" || fact.label === "Checks") : facts.slice(0, 3)).map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
				</dl>
			) : null}
			<footer className="aop-decision-foot">
				{pending ? (
					<div className="aop-decision-confirm" role="group" aria-label="Confirm your choice" onKeyDown={cancel}>
						<p><strong>{pending.label}?</strong> {pending.consequence}</p>
						<div className="aop-actions">
							<DsButton ref={keep} onClick={back}>Keep reviewing</DsButton>
							<DsButton variant="primary" onClick={() => choose(pending.id, pending.outcome)}>{pending.label}</DsButton>
						</div>
					</div>
				) : (
					<>
						<small>{spec.boundary ? <><ShieldCheck size={14} />{spec.boundary}</> : <>{primary.consequence}</>}</small>
						<div className="aop-actions">
							{compact && onOpen ? <DsButton variant="ghost" onClick={onOpen}>Review details<CaretRight size={12} /></DsButton> : null}
							{secondary.map(option => <DsButton key={option.id} data-option={option.id} onClick={() => choose(option.id, option.outcome)}>{option.label}</DsButton>)}
							<DsButton variant="primary" data-option={primary.id} onClick={() => choose(primary.id, primary.outcome)}>{primary.label}</DsButton>
						</div>
					</>
				)}
			</footer>
		</section>
	)
}

export function releaseFacts(state: AgentixState, release: Release) {
	const artifact = artifactBy(state, release.artifactId)
	const spec = artifact ? artifactSpec(state, artifact) : undefined
	const version = artifact?.versions.find(entry => entry.version === release.version)
	const passed = version?.checks.filter(check => check.status === "passed").length ?? 0
	const scope = spec?.checks[0]?.scope.replace(/^Isolated test · |^Test schema · /, "") ?? "isolated test"
	const engagement = state.engagements[release.engagementId]
	return [
		{ label: "Target", value: release.target },
		{ label: "Changes", value: spec?.release?.changes(release.version, version?.variant ?? []).join(" · ") ?? `${artifact?.title} v${release.version}` },
		{ label: "Impact", value: spec?.release?.impact ?? "—" },
		{ label: "Checks", value: version?.checks.length ? `${passed} of ${version.checks.length} passed in isolation (${scope}). A passed test isn't a production result.` : "No checks recorded" },
		{ label: "Authority", value: release.authority === "approval" ? "Your policy: approval before each pipeline release" : spec?.release?.policy ?? (engagement.answers.release === "window" ? `Your policy: release in the ${releaseWindowOf(state, release.engagementId).label} window` : "Preauthorized") },
		{ label: "Recovery", value: spec?.release?.recovery ?? "—" },
	]
}

/* A release that isn't waiting on approval: what it is, where it stands, and the controls that still apply. */
/* Whether other work waits for this release, said plainly on its approval card. */
function waitingOn(state: AgentixState, release: Release) {
	const waiting = state.work.filter(item => item.wait?.kind === "release" && item.wait.releaseId === release.id || (item.wait?.kind === "dependency" && item.wait.on === release.workItemId && item.wait.step === "release"))
	return waiting.length ? `${waiting.map(item => item.reference).join(" and ")} ${waiting.length === 1 ? "waits" : "wait"} for it; everything else continues.` : "Nothing else waits on it."
}

/* One name for bringing a stopped or kept-in-test release back; with approval authority it asks again. */
export const restartLabel = (release: Release) => release.authority === "approval" || release.status === "declined" ? "Request release again" : "Resume release"

export function ReleaseCard({ state, release, onAction, onRequestAgain, onRestore }: { state: AgentixState; release: Release; onAction: (action: ReleaseAction) => void; onRequestAgain: () => void; onRestore: () => void }) {
	const artifact = artifactBy(state, release.artifactId)
	const status = releaseStatusLabel[release.status]
	const headingId = useId()
	const settled = ["applied", "verified", "unknown", "superseded"].includes(release.status)
	return (
		<section className={`aop-release is-${status.tone}`} aria-labelledby={headingId}>
			<header className="aop-release-head">
				<span className={`aop-icon-tile${status.tone === "live" ? " is-live" : status.tone === "attention" ? " is-warning" : ""}`} aria-hidden="true"><RocketLaunch size={16} /></span>
				<div>
					<p className="aop-decision-kicker"><span className="aop-mono">{release.reference}</span> · {artifact?.title} v{release.version}</p>
					<h3 id={headingId}>{releaseSentence(state, release)}</h3>
				</div>
				<Status label={status.label} tone={status.tone} live={release.status === "releasing"} />
			</header>
			{release.status === "unknown" ? <p className="aop-callout is-warning" role="status"><WarningCircle size={16} />The adapter timed out after dispatch, so the release may already have applied. Agentix reads the target back before doing anything else; it never retries blindly.</p> : null}
			{release.status === "blocked" ? (
				<div className="aop-callout is-danger">
					<WarningCircle size={16} />
					<div className="aop-callout-body">
						<p>The release adapter's role lost write access to the release target. Nothing was released, and the tested version is kept. Build and test continue.</p>
						<p className="aop-callout-meta">Owner: integration administrator · after it's restored, this release continues under the same policy.</p>
						<div className="aop-callout-actions"><DsButton variant="primary" onClick={onRestore}>Restore release permission (demo)</DsButton></div>
					</div>
				</div>
			) : null}
			<details className="aop-inline-disclosure aop-release-facts">
				<summary><CaretRight size={12} />Target, changes, checks and recovery</summary>
				<dl className="aop-rows is-stacked">
					{releaseFacts(state, release).map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
				</dl>
			</details>
			{settled || release.status === "blocked" ? null : (
				<footer className="aop-actions aop-release-actions">
					{release.status === "held" && release.ownerHold ? <DsButton onClick={() => onAction("release-now")}><Play size={14} />Lift your hold</DsButton> : null}
					{(release.status === "preparing" || release.status === "releasing") && !release.windowOnly ? <DsButton onClick={() => onAction("hold-window")}><CalendarBlank size={14} />Hold until {releaseWindowOf(state, release.engagementId).label}</DsButton> : null}
					{release.status === "stopped" ? <DsButton onClick={() => onAction("resume")}><Play size={14} />{restartLabel(release)}</DsButton> : null}
					{release.status === "declined" ? <DsButton onClick={onRequestAgain}><ArrowRight size={14} />{restartLabel(release)}</DsButton> : null}
					{release.status !== "stopped" && release.status !== "declined" ? <DsButton onClick={() => onAction("stop")}><StopCircle size={14} />Stop release</DsButton> : null}
				</footer>
			)}
		</section>
	)
}

/* A human-owned step: the owner does it in their system and supplies a reference; Agentix can't grant itself access. */
export function HumanFulfillment({ reference, onAttach }: { reference: string; onAttach: (value: string) => void }) {
	const [value, setValue] = useState("")
	const [error, setError] = useState("")
	const field = useRef<HTMLInputElement>(null)
	const id = useId()
	const attach = () => { if (!value.trim()) { setError("Enter the owner's fulfillment reference."); field.current?.focus(); return } setError(""); onAttach(value) }
	return (
		<section className="aop-decision" aria-labelledby={`${id}-title`}>
			<header className="aop-decision-head">
				<span className="aop-icon-tile is-warning" aria-hidden="true"><UserCircle size={16} /></span>
				<div>
					<p className="aop-decision-kicker">Owner confirmation · <span className="aop-mono">{reference}</span></p>
					<h3 id={`${id}-title`}>Payroll owner confirmation needed</h3>
					<p>HR and IT work is kept. The payroll owner fulfills access in their system and gives a reference; the agent can't grant itself access.</p>
				</div>
			</header>
			<div className="aop-field">
				<label htmlFor={`${id}-input`}>Fulfillment reference</label>
				<input ref={field} id={`${id}-input`} className="ds-input" value={value} onChange={event => { setValue(event.target.value); if (error) setError("") }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); attach() } }} maxLength={120} placeholder="For example, PAYROLL-306" aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} />
				{error ? <p id={`${id}-error`} className="aop-field-error" role="alert"><WarningCircle size={14} />{error}</p> : null}
				<small id={`${id}-hint`}>Due before the hire's start date. A demo attestation, not provider proof; verification still follows.</small>
			</div>
			<footer className="aop-decision-foot"><DsButton variant="primary" onClick={attach}>Attach owner confirmation</DsButton></footer>
		</section>
	)
}

/* A failed step past its automatic-repair limit: what failed and the precise next step. */
export function FailedStep({ state, workId, onRetry, onMessage }: { state: AgentixState; workId: string; onRetry: () => void; onMessage: () => void }) {
	const item = itemBy(state, workId)
	const artifact = item?.artifactIds.map(id => artifactBy(state, id)).find(Boolean)
	const version = artifact ? latest(artifact) : undefined
	const spec = artifact ? artifactSpec(state, artifact) : undefined
	const failed = version?.checks.filter(check => check.status === "failed") ?? []
	return (
		<section className="aop-callout is-danger" aria-label="Failed step">
			<WarningCircle size={18} />
			<div className="aop-callout-body">
				<h3>{artifact ? `${artifact.title} v${version!.version} still fails ${failed.length} check${failed.length === 1 ? "" : "s"}` : "A step failed"}</h3>
				{failed.map(check => <p key={check.id}>{spec?.checks.find(entry => entry.id === check.id)?.label}: {check.detail}</p>)}
				<p className="aop-callout-meta">Automatic repair stopped at its limit of two attempts. Nothing reached production. Other work continues.</p>
				<div className="aop-callout-actions">
					<DsButton variant="primary" onClick={onRetry}>Ask the specialist to try again</DsButton>
					<DsButton variant="ghost" onClick={onMessage}><Pause size={14} />Discuss in conversation</DsButton>
				</div>
			</div>
		</section>
	)
}

export const heldUntil = (release: Release) => release.holdUntil ? shortTime(release.holdUntil) : ""
