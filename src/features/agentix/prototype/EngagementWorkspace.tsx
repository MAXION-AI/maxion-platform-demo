import { ArrowLeft, BellSlash, CaretRight, FileArrowDown, PauseCircle, ShieldWarning, XCircle } from "@phosphor-icons/react"
import { Button as DsButton, Dialog } from "@/design/primitives"
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { actOnEngagement, actOnRelease, actOnWork, artifactBy, decide, fulfill, isTerminal, itemBy, releaseBy, decisionBy, assignWork, type ReleaseAction, type WorkAction } from "./engine/engine"
import { packageFor, SCENARIOS } from "./engine/scenarios"
import { needsYou } from "./engine/selectors"
import { acceptOffer, sendInstruction } from "./engine/steering"
import { sameScope, scopeKey, type AgentixState, type Nav, type ObjectRef, type ScopeRef, type View } from "./engine/types"
import { ActivityView } from "./ActivityView"
import { Composer, ConversationPanel, LatestReply } from "./Conversation"
import { EngagementHeader } from "./EngagementHeader"
import { ResultsView } from "./ResultsView"
import type { DetailSection } from "./Sheets"
import { WorkDetail } from "./WorkDetail"
import { WorkView } from "./WorkView"

type Update = (recipe: (state: AgentixState) => AgentixState) => void

const TABS: { id: View; label: string }[] = [{ id: "work", label: "Work" }, { id: "results", label: "Results" }, { id: "activity", label: "Activity" }]

/*
 * One engagement: a compact header, three stable destinations (Work, Results,
 * Activity) and one scoped composer. The conversation history opens beside the
 * work only when asked, and can be pinned there; it never takes a column while
 * it's empty. Work is the ElevenLabs agent page's layout (mobbin 9785c0b7);
 * the evidence-beside-the-work idea follows Devin's session view (d1c5a964).
 */
export function EngagementWorkspace({ state, engagementId, update, onDetails, onReview, onToast }: { state: AgentixState; engagementId: string; update: Update; onDetails: (section: DetailSection) => void; onReview: () => void; onToast: (text: string) => void }) {
	const engagement = state.engagements[engagementId]
	const nav = state.nav
	const [open, setOpen] = useState(state.ui.conversationPinned)
	const [seen, setSeen] = useState(() => state.messages.filter(message => message.engagementId === engagementId).length)
	const [dismissed, setDismissed] = useState<string | null>(null)
	const [assigning, setAssigning] = useState(false)
	const [showHistory, setShowHistory] = useState(false)
	const composer = useRef<HTMLTextAreaElement>(null)
	const scroll = useRef<HTMLDivElement>(null)
	const positions = useRef<Record<string, number>>({})
	const returnTo = useRef<string | null>(null)
	const pinned = state.ui.conversationPinned
	// Work assigned from the dialog opens once the store holds it.
	const assigned = useRef<Set<string> | null>(null)
	useEffect(() => {
		const before = assigned.current
		const created = before ? state.work.find(item => item.engagementId === engagementId && !before.has(item.id)) : undefined
		if (created) { assigned.current = null; openWork(created.id) }
	}, [state.work])

	const viewScope: ScopeRef = nav.view === "work" && nav.workId ? { kind: "work", id: nav.workId } : nav.view === "results" && nav.resultId && artifactBy(state, nav.resultId) ? { kind: "artifact", id: nav.resultId } : nav.view === "results" && nav.resultId && itemBy(state, nav.resultId) ? { kind: "work", id: nav.resultId } : { kind: "engagement" }
	const [scope, setScope] = useState<ScopeRef>(viewScope)
	const draft = state.drafts[scopeKey(engagementId, scope)] ?? ""
	// The composer follows navigation only while it's empty, so an unsent instruction is never retargeted.
	useEffect(() => { if (!draft.trim() && !sameScope(scope, viewScope)) setScope(viewScope) }, [viewScope.kind, (viewScope as { id?: string }).id])

	const messages = state.messages.filter(message => message.engagementId === engagementId)
	const unread = Math.max(0, messages.filter(message => message.role === "agent").length - messages.slice(0, seen).filter(message => message.role === "agent").length)
	useEffect(() => { if (open) setSeen(messages.length) }, [open, messages.length])

	const setNav = (patch: Partial<Nav>) => update(current => ({ ...current, nav: { ...current.nav, ...patch } }))
	const remember = () => { const key = `${nav.view}:${nav.view === "work" ? nav.workId ?? "list" : nav.view === "results" ? "results" : "activity"}`; if (scroll.current) positions.current[key] = scroll.current.scrollTop }
	const openWork = (id: string) => { remember(); const item = itemBy(state, id); returnTo.current = item?.reference ?? null; setNav({ view: "work", workId: id }) }
	const openResult = (id: string | undefined) => { remember(); setNav({ view: "results", resultId: id }) }
	// Back always returns focus to the row of the item you were viewing, however you reached it.
	const back = () => { const item = nav.workId ? itemBy(state, nav.workId) : undefined; returnTo.current = item?.reference ?? returnTo.current; remember(); setNav({ workId: undefined }) }
	const openRef = (ref: ObjectRef) => {
		if (ref.kind === "work") openWork(ref.id)
		else if (ref.kind === "artifact") openResult(ref.id)
		else if (ref.kind === "release") { const release = releaseBy(state, ref.id); if (release) openWork(release.workItemId) }
		else { const decision = decisionBy(state, ref.id); if (decision) openWork(decision.workItemId) }
		if (!pinned) setOpen(false)
	}
	// Returning to a list restores where it was scrolled, and focus goes back to the row that was opened.
	useLayoutEffect(() => {
		const node = scroll.current
		if (!node) return
		const key = `${nav.view}:${nav.view === "work" ? nav.workId ?? "list" : nav.view === "results" ? "results" : "activity"}`
		// A work item opens with the engagement header scrolled away, so its decision starts under the sticky tabs.
		const head = node.querySelector<HTMLElement>(".aop-eng-head")
		node.scrollTop = nav.workId && nav.view === "work" ? head?.offsetHeight ?? 0 : positions.current[key] ?? 0
		if (nav.view === "work" && !nav.workId && returnTo.current) {
			const row = node.querySelector<HTMLElement>(`[data-work="${returnTo.current}"]`)
			returnTo.current = null
			row?.focus({ preventScroll: true })
			if (row && !positions.current[key]) row.scrollIntoView({ block: "nearest" })
		}
	}, [nav.view, nav.workId])

	// The composer can move between the dock and the panel, so focus lands after the render that places it.
	const [focusRequest, setFocusRequest] = useState(0)
	useEffect(() => { if (focusRequest) composer.current?.focus({ preventScroll: true }) }, [focusRequest])
	const focusComposer = () => setFocusRequest(value => value + 1)
	const messageAbout = (next: ScopeRef) => { setScope(next); focusComposer() }
	const send = () => { if (!draft.trim()) return; update(current => sendInstruction(current, engagementId, scope, draft)); focusComposer() }
	const setDraft = (value: string) => update(current => { const drafts = { ...current.drafts }; const key = scopeKey(engagementId, scope); if (value) drafts[key] = value.slice(0, 2000); else delete drafts[key]; return { ...current, drafts } })
	const togglePanel = () => { setOpen(value => !value); focusComposer() }
	const pin = () => update(current => ({ ...current, ui: { ...current.ui, conversationPinned: !current.ui.conversationPinned } }))

	const decideWith = (decisionId: string, option: string) => {
		const decision = decisionBy(state, decisionId)
		update(current => decide(current, decisionId, option))
		if (decision) { const item = itemBy(state, decision.workItemId); onToast(option === "decline" ? `Declined for ${item?.reference}. Nothing was posted.` : option === "keep" ? "Kept in test. Nothing was released." : `Recorded your decision on ${item?.reference}.`) }
	}
	const workAction = (id: string, action: WorkAction) => update(current => actOnWork(current, id, action))
	const releaseAction = (id: string, action: ReleaseAction) => { update(current => actOnRelease(current, id, action)); if (action === "stop") onToast("Release stopped. Nothing was released.") }
	const restore = () => { update(current => actOnEngagement(current, engagementId, "restore-permission")); onToast("Release permission restored. Blocked releases continue under the same policy.") }
	const reconnect = () => { update(current => actOnEngagement(current, engagementId, "reconnect")); onToast("Reconnected. Rechecking before outstanding sends resume.") }

	const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return
		event.preventDefault()
		const next = event.key === "Home" ? TABS[0] : event.key === "End" ? TABS[TABS.length - 1] : TABS[(index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length]
		remember(); setNav({ view: next.id })
		document.getElementById(`aop-tab-${next.id}`)?.focus()
	}

	const open_ = state.work.filter(item => item.engagementId === engagementId && !isTerminal(item)).length
	const waiting = needsYou(state, engagementId).filter(entry => entry.kind !== "proposal").length
	const produced = state.artifacts.filter(artifact => artifact.engagementId === engagementId).length
	const verified = state.work.filter(item => item.engagementId === engagementId && item.status === "verified").length
	const selected = nav.workId ? itemBy(state, nav.workId) : undefined
	const pkg = engagement.proposal?.packageId ? packageFor(engagement.proposal.packageId) : undefined
	const latestAgent = messages.filter(message => message.role === "agent" && !message.update).at(-1)

	const composerEl = (
		<Composer state={state} engagementId={engagementId} scope={scope} viewScope={viewScope} draft={draft} inputRef={composer} onDraft={setDraft} onSend={send} onScope={next => { setScope(next); focusComposer() }} conversationOpen={open} onToggleConversation={togglePanel} unread={unread} />
	)
	return (
		<div className="aop-eng" data-panel={open ? (pinned ? "pinned" : "overlay") : "closed"}>
			<div className="aop-eng-main">
				<div className="aop-eng-scroll" ref={scroll}>
					<div className="aop-eng-head">
						<EngagementHeader state={state} engagement={engagement} onToggleIntake={() => update(current => actOnEngagement(current, engagementId, engagement.status === "paused" ? "resume-intake" : "pause-intake"))} onDetails={() => onDetails("team")} onAssign={() => setAssigning(true)} resumeHint="aop-status-note" />
						{pkg ? (
							<div className="aop-callout aop-strip">
								<FileArrowDown size={16} aria-hidden="true" />
								<p>{pkg.title} v{pkg.version} {engagement.proposal!.origin === "discovery" ? "from Discovery" : "from your brief"} is ready for your review. It reuses this team; nothing new runs until you activate it.</p>
								<DsButton size="sm" onClick={onReview}>Review proposal<CaretRight size={12} /></DsButton>
							</div>
						) : null}
						{engagement.status === "paused" || engagement.holdNotifications ? (
							<div className="aop-callout aop-strip aop-status-strip">
								{engagement.status === "paused" ? <PauseCircle size={16} aria-hidden="true" /> : <BellSlash size={16} aria-hidden="true" />}
								<p id="aop-status-note">{engagement.status === "paused" ? "Intake is paused: admitted work, milestones and releases continue; new cases wait." : "Notifications are held by you. Affected work stays incomplete until you release them."}</p>
								{engagement.holdNotifications ? <DsButton size="sm" onClick={() => update(current => actOnEngagement(current, engagementId, "release-notifications"))}>Release notifications</DsButton> : null}
							</div>
						) : null}
						{engagement.connection === "expired" || engagement.checking ? (
							<section className={`aop-callout aop-strip aop-runtime-repair ${engagement.checking ? "is-live" : "is-danger"}`} aria-label="Connection repair" aria-live="polite">
								{engagement.checking ? <span className="aop-live-dot aop-repair-dot" aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
								<div className="aop-callout-body">
									<h2 tabIndex={-1}>{engagement.checking ? "Rechecking the restored connection…" : "Notifications are waiting. Other permitted work continues."}</h2>
									<p>{engagement.checking ? "Only outstanding sends resume after the check; nothing already done repeats." : "The notification connection expired. Recorded changes are kept; no write will be repeated."}</p>
								</div>
								{engagement.checking ? null : <DsButton onClick={reconnect}>Reconnect notification account (demo)</DsButton>}
							</section>
						) : null}
						{engagement.permission === "lost" ? (
							<section className="aop-callout aop-strip is-danger" aria-label="Release permission">
								<ShieldWarning size={16} aria-hidden="true" />
								<p>Release permission lost. Build and test continue; production releases block before applying, and nothing is released.</p>
								<DsButton size="sm" onClick={restore}>Restore (demo)</DsButton>
							</section>
						) : null}
					</div>
					<div className="aop-eng-tabs" role="tablist" aria-label="Engagement">
						{TABS.map((tab, index) => (
							<button key={tab.id} id={`aop-tab-${tab.id}`} type="button" role="tab" aria-selected={nav.view === tab.id} aria-controls="aop-eng-panel" tabIndex={nav.view === tab.id ? 0 : -1} className="aop-tab" onKeyDown={event => onTabKey(event, index)} onClick={() => { remember(); setNav({ view: tab.id }) }}>
								{tab.label}
								<span className="aop-tab-count">{tab.id === "work" ? open_ : tab.id === "results" ? produced + verified : ""}</span>
								{tab.id === "work" && waiting ? <span className="aop-tab-flag">{waiting} need{waiting === 1 ? "s" : ""} you</span> : null}
								{nav.view === tab.id ? <span className="aop-tab-underline" /> : null}
							</button>
						))}
					</div>
					<div id="aop-eng-panel" role="tabpanel" aria-labelledby={`aop-tab-${nav.view}`} className="aop-eng-body">
						{nav.view === "work" && selected ? (
							<>
								<nav className="aop-work-crumbs" aria-label="Work item">
									<DsButton variant="ghost" size="sm" onClick={back}><ArrowLeft size={14} />Work</DsButton>
									<span aria-hidden="true"><CaretRight size={12} /></span>
									<span className="aop-crumb-now">{selected.reference} · {selected.title}</span>
								</nav>
								<WorkDetail state={state} workId={selected.id} callbacks={{
									onDecide: decideWith, onFulfill: reference => { update(current => fulfill(current, selected.id, reference)); onToast(`Owner confirmation attached to ${selected.reference}. Verification follows.`) },
									onWork: action => workAction(selected.id, action), onRelease: releaseAction, onRestore: restore, onReconnect: reconnect,
									onOpenResult: id => openResult(id), onOpenWork: openWork, onMessage: () => messageAbout({ kind: "work", id: selected.id }),
								}} />
							</>
						) : nav.view === "work" ? (
							<WorkView state={state} engagementId={engagementId} showHistory={showHistory} onHistory={setShowHistory} callbacks={{ onOpenWork: openWork, onOpenResult: id => openResult(id), onDecide: decideWith, onTeam: () => onDetails("team"), onRestore: restore }} />
						) : nav.view === "results" ? (
							<ResultsView state={state} engagementId={engagementId} resultId={nav.resultId} callbacks={{ onSelect: openResult, onRequestChange: id => messageAbout({ kind: "artifact", id }), onOpenWork: openWork }} />
						) : (
							<ActivityView state={state} engagementId={engagementId} filter={nav.activityFilter} onFilter={filter => setNav({ activityFilter: filter })} onOpen={openRef} />
						)}
					</div>
				</div>
				{open ? null : (
					<div className="aop-eng-dock">
						{latestAgent && latestAgent.id !== dismissed && unread ? <LatestReply state={state} engagementId={engagementId} onOpen={() => setOpen(true)} onDismiss={() => setDismissed(latestAgent.id)} onLink={openRef} /> : null}
						{composerEl}
					</div>
				)}
			</div>
			{open ? (
				<ConversationPanel state={state} engagementId={engagementId} pinned={pinned} onPin={pin} onClose={() => { setOpen(false); focusComposer() }} onLink={openRef} onAccept={id => update(current => acceptOffer(current, id))} onSuggest={text => { setDraft(text); focusComposer() }} scope={scope}>
					{composerEl}
				</ConversationPanel>
			) : null}
			<AssignDialog open={assigning} state={state} engagementId={engagementId} onClose={() => setAssigning(false)} onReview={() => { setAssigning(false); onReview() }} onAssign={(template, title) => {
				assigned.current = new Set(state.work.map(item => item.id))
				update(current => assignWork(current, engagementId, template, title))
				setAssigning(false)
				onToast(`Assigned “${title}”. The deployed team takes it; no new agent was created.`)
			}} />
		</div>
	)
}

/* Assign work to the deployed team: the same interpretation as the composer, confirmed explicitly. */
function AssignDialog({ open, state, engagementId, onClose, onAssign, onReview }: { open: boolean; state: AgentixState; engagementId: string; onClose: () => void; onAssign: (template: string, title: string) => void; onReview: () => void }) {
	const [text, setText] = useState("")
	const engagement = state.engagements[engagementId]
	const scenario = SCENARIOS[engagement.workflowId]
	const match = text.trim() ? scenario.assignments.find(entry => entry.pattern.test(text)) : undefined
	const owner = match ? scenario.team.find(member => member.id === match.owner) : undefined
	const pending = engagement.proposal?.packageId ? packageFor(engagement.proposal.packageId) : undefined
	// Each scenario's own assignment example, so the placeholder never suggests another engagement's work.
	const example = scenario.examples.assignment
	return (
		<Dialog open={open} title={`Assign work to ${engagement.name}`} description="The deployed team takes it on as its own work item. Nothing is rebuilt, and the engagement's authority doesn't change." onClose={onClose}
			footer={<><DsButton onClick={onClose}>Cancel</DsButton><DsButton variant="primary" disabled={!match} onClick={() => { if (match) { onAssign(match.template, match.title(text)); setText("") } }}>Assign</DsButton></>}>
			<div className="aop-field">
				<label htmlFor="aop-assign-text">What should the team take on?</label>
				<textarea id="aop-assign-text" className="ds-textarea" value={text} maxLength={500} rows={3} placeholder={`For example, “${example}”`} onChange={event => setText(event.target.value)} data-dialog-autofocus />
				{match && owner ? <p className="aop-hint" role="status">Becomes “{match.title(text)}” for the {owner.name.toLowerCase()}.</p>
					: text.trim() ? <p className="aop-brief-notice" role="status">This team can't take that on in the demo; your text is kept. It supports work like “{example}”.{pending ? <> The {pending.title.toLowerCase()} scope is in the proposal: <button type="button" className="aop-scope-action" onClick={onReview}>review it</button>.</> : null}</p>
					: <p className="aop-hint">Supported here: work like “{example}”.</p>}
			</div>
		</Dialog>
	)
}
