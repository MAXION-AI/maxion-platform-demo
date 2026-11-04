import { TextButton, Button as DsButton } from "@/design/primitives"
import { requestSection } from "@/features/organization/store"
import { CaretRight } from "@phosphor-icons/react"
import { useEffect, useId, useRef, useState } from "react"
import { allowanceOf, artifactBy, BUDGET_TOP_UP, currentVersion, decisionBy, scenarioOf, spendOf, templateOf } from "./engine/engine"
import { shortTime, units } from "./engine/selectors"
import type { AgentixState, EffectState, WorkItem } from "./engine/types"
import { Status } from "./OperationsViews"

/*
 * The states a person has to be able to read and act on when work doesn't go to plan: a request that
 * changed under them, a write whose outcome is unknown, a lost sandbox, and a used-up allowance. Each
 * says what is confirmed, what isn't and the one thing to do. Grouped by whitespace and one hairline,
 * with attention carried by a pill and one filled button.
 */

/* A decision whose exact content changed while it waited: the old version can't be approved. */
export function ChangedRequest({ state, decisionId, onDecide, onReview }: { state: AgentixState; decisionId: string; onDecide: (option: string) => void; onReview?: () => void }) {
	const decision = decisionBy(state, decisionId)
	const headingId = useId()
	if (!decision?.changed) return null
	const spec = scenarioOf(state, decision.engagementId).decisions[decision.template]
	const primary = spec?.options.find(option => option.primary)
	const { from, reason, refused } = decision.changed
	return (
		<section className="aop-state" aria-labelledby={headingId}>
			<header className="aop-state-head">
				<h3 id={headingId}>This request changed</h3>
				<Status label={refused ? "Not approved" : "Changed"} tone="attention" />
			</header>
			<dl className="aop-rows is-stacked aop-state-rows">
				<div><dt>You were asked about</dt><dd>{from}</dd></div>
				<div><dt>It is now</dt><dd>{currentVersion(state, decision)}</dd></div>
				<div><dt>Why</dt><dd>{reason}</dd></div>
			</dl>
			{refused
				? <p className="aop-state-note" role="alert">Approval refused. {from} is no longer the request, so nothing was approved.</p>
				: <p className="aop-state-note">An approval of {from} no longer applies. Any decision has to be on the current version.</p>}
			<footer className="aop-actions">
				{!refused && primary ? <DsButton onClick={() => onDecide(primary.id)}>Approve the old version</DsButton> : null}
				{onReview ? <DsButton variant="primary" onClick={onReview}>Review the current version<CaretRight size={12} /></DsButton> : null}
			</footer>
		</section>
	)
}

/*
 * A write whose outcome is unknown. Confirmed results and what is unresolved are stated apart, the only
 * action is a read-back of the target, and a retry appears only once that read-back shows nothing landed.
 */
export function EffectBlock({ state, item, effect, onInvestigate, onRequestRelease, onResend }: { state: AgentixState; item: WorkItem; effect: EffectState; onInvestigate: () => void; onRequestRelease: () => void; onResend: () => void }) {
	const headingId = useId()
	const [confirming, setConfirming] = useState(false)
	const keep = useRef<HTMLButtonElement>(null)
	useEffect(() => { if (confirming) keep.current?.focus() }, [confirming])
	const template = templateOf(state, item)
	const met = item.obligations.filter(obligation => obligation.status === "met").map(obligation => template?.obligations.find(entry => entry.id === obligation.id)?.label ?? obligation.id)
	const open = item.obligations.filter(obligation => obligation.status !== "met").map(obligation => template?.obligations.find(entry => entry.id === obligation.id)?.label ?? obligation.id)
	const applied = item.effects.filter(entry => entry.id !== effect.id && (entry.status === "applied" || entry.status === "verified")).map(entry => `${entry.operation} on ${entry.system.split(" · ")[0]}`)
	const confirmed = [...applied, ...met]
	const system = effect.system.split(" · ")[0]
	const release = state.releases.find(entry => entry.effectId === effect.id)
	const missed = effect.status === "not_applied"
	const reading = !!effect.investigating
	const paused = item.status === "paused"
	return (
		<section className="aop-state" aria-labelledby={headingId}>
			<header className="aop-state-head">
				<h3 id={headingId}>{missed ? `Confirmed not applied: ${effect.operation.toLowerCase()}` : `Outcome unknown: ${effect.operation.toLowerCase()}`}</h3>
				<Status label={reading ? "Reading back" : missed ? "Not applied" : "Outcome unknown"} tone={reading ? "live" : "attention"} />
			</header>
			<dl className="aop-rows is-stacked aop-state-rows">
				<div><dt>Confirmed</dt><dd>{confirmed.length ? confirmed.join(" · ") : "Nothing else on this item is confirmed yet."}</dd></div>
				<div><dt>{missed ? "Read-back found" : "Unresolved"}</dt><dd>{missed ? effect.readBack?.detail : `${system} didn't acknowledge the 1 dispatch, so this may or may not have applied.`}{open.length ? ` Still open: ${open.join(" · ")}.` : ""}</dd></div>
				<div><dt>Next</dt><dd>{missed
					? release ? "Release it again. That makes a new release under your release policy; this one stays on record as not applied." : "Send it again as a new attempt. This one stays on record as not applied."
					: reading ? "The read-back only reads. Nothing is sent." : "Read the target back. It only reads. A retry isn't offered, because a second send could apply twice."}</dd></div>
			</dl>
			{paused ? <p className="aop-state-note">This work is paused. Resume it to read the target back.</p> : null}
			{confirming ? (
				<div className="aop-decision-confirm" role="group" aria-label="Confirm sending again">
					<p><strong>Send {effect.operation.toLowerCase()} to {system} again?</strong> It goes out once, as a new attempt with its own record. The earlier attempt stays on record as not applied.</p>
					<div className="aop-actions">
						<DsButton ref={keep} onClick={() => setConfirming(false)}>Not now</DsButton>
						<DsButton variant="primary" onClick={() => { setConfirming(false); onResend() }}>Send again</DsButton>
					</div>
				</div>
			) : (
				<footer className="aop-actions">
					{missed
						? release ? <DsButton variant="primary" onClick={onRequestRelease}>Request release again</DsButton> : <DsButton variant="primary" onClick={() => setConfirming(true)}>Send it again</DsButton>
						: <DsButton variant="primary" disabled={reading || paused} onClick={onInvestigate}>{reading ? "Reading back…" : "Investigate"}</DsButton>}
				</footer>
			)}
		</section>
	)
}

/* Output on its way to storage, the last confirmed checkpoint, and what a lost sandbox cost. */
export function SavingState({ state, item }: { state: AgentixState; item: WorkItem }) {
	const last = item.checkpoints?.at(-1)
	const saves = item.saves ?? []
	const recovery = item.recovery
	const lastArtifact = last ? artifactBy(state, last.artifactId) : undefined
	if (!last && !saves.length && !recovery) return null
	return (
		<section className="aop-case-section" aria-label="Saved progress">
			<div className="aop-subhead"><h3>Saved progress</h3><span>Session {item.session ?? 1}</span></div>
			{recovery ? (
				<div className="aop-state-recovery" role="status">
					<div className="aop-state-head">
						<strong>Sandbox lost in session {recovery.fromSession}</strong>
						<Status label={recovery.status === "resuming" ? "Resuming" : `Resumed in session ${recovery.toSession}`} tone={recovery.status === "resuming" ? "live" : "positive"} />
					</div>
					<dl className="aop-rows is-stacked aop-state-rows">
						<div><dt>Last confirmed</dt><dd>{recovery.lastConfirmed ? `${recovery.lastConfirmed}, checkpoint ${recovery.checkpoint}` : "No checkpoint had been confirmed yet"}</dd></div>
						{recovery.inFlight.length ? <div><dt>Not saved</dt><dd>{recovery.inFlight.join(" · ")} was still being transferred</dd></div> : null}
						<div><dt>To redo</dt><dd>{recovery.redo.length ? recovery.redo.join(" · ") : "Nothing"}</dd></div>
						<div><dt>Kept</dt><dd>Decisions and effects already recorded. Nothing is sent again.</dd></div>
					</dl>
				</div>
			) : null}
			<ul className="aop-criteria">
				{saves.map(save => {
					const artifact = artifactBy(state, save.artifactId)
					return <li key={save.id}><span className="aop-check-text"><span>{artifact?.title} v{save.version}</span><small>{save.phase === "preparing" ? "Collecting the output" : "Copying it across and verifying its bytes, length and hash"}</small></span><Status label={save.phase === "preparing" ? "Preparing" : "Transferring"} tone="live" /></li>
				})}
				{last ? <li><span className="aop-check-text"><span>{lastArtifact?.title} v{last.version}</span><small>Checkpoint {last.id} · {last.stepTitle} · {shortTime(last.at)} · checksum {last.hash}</small></span><Status label="Saved" tone="positive" /></li> : null}
			</ul>
		</section>
	)
}

/* The scoped limit, what's preserved, who can act and what may happen next. Reads and existing outputs stay available. */
export function BudgetBlock({ state, engagementId, onRequest, onGrant }: { state: AgentixState; engagementId: string; onRequest: () => void; onGrant: () => void }) {
	const engagement = state.engagements[engagementId]
	const headingId = useId()
	const requestedAt = engagement.budget?.requestedAt
	return (
		<section className="aop-state" aria-labelledby={headingId}>
			<header className="aop-state-head">
				<h3 id={headingId}>Paid work stopped at this engagement's limit</h3>
				<Status label="Limit reached" tone="danger" />
			</header>
			<dl className="aop-rows is-stacked aop-state-rows">
				<div><dt>Limit</dt><dd>{engagement.name}: {units(spendOf(state, engagementId))} of {allowanceOf(engagement).toLocaleString("en-US")} used this cycle. Other engagements keep their own allowance.</dd></div>
				<div><dt>Preserved</dt><dd>Progress, decisions, confirmed checkpoints and saved files. Reading results, downloading files and answering decisions stay available.</dd></div>
				<div><dt>Who can act</dt><dd>The organization Owner or an Admin can add units.</dd></div>
				<div><dt>Next</dt><dd>{requestedAt ? `Requested ${shortTime(requestedAt)}. Stopped work continues from where it was once units are added.` : "Ask for more units. Stopped work continues from where it was once they are added."}</dd></div>
			</dl>
			<footer className="aop-actions">
				{requestedAt ? <DsButton variant="primary" onClick={onGrant}>Add {BUDGET_TOP_UP.toLocaleString("en-US")} units (demo)</DsButton> : <DsButton variant="primary" onClick={onRequest}>Request more units</DsButton>}
				<TextButton onClick={() => requestSection({ section: "usage" })}>See Usage</TextButton>
			</footer>
		</section>
	)
}

/* Files published from what this work produced: its evidence that a version reached a real place. */
export function SavedFiles({ state, item }: { state: AgentixState; item: WorkItem }) {
	const files = (state.publications ?? []).filter(publication => item.artifactIds.includes(publication.artifactId) && publication.status === "saved")
	if (!files.length) return null
	return (
		<section className="aop-case-section" aria-label="Saved files">
			<div className="aop-subhead"><h3>Saved files</h3><span>{files.length}</span></div>
			<ul className="aop-criteria">
				{files.map(file => <li key={file.id}><span className="aop-check-text"><span>{file.fileName}</span><small>{file.location} · {file.savedAt ? shortTime(file.savedAt) : ""} · checksum {file.hash}</small></span><Status label={file.target === "download" ? "Downloaded" : "Saved"} tone="positive" /></li>)}
			</ul>
		</section>
	)
}

/* What the case has used so far, in the Usage page's word. */
export const spendLabel = (item: WorkItem) => `${units(item.costCents)} used`
