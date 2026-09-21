import { ArrowUpRight, ChatCircleText, CheckCircle, Clock, PushPin, PushPinSlash, Sparkle, X, XCircle } from "@phosphor-icons/react"
import { Button as DsButton, Mark } from "@/design/primitives"
import { WorkspaceComposer } from "@/components/workspace/WorkspaceComposer"
import { useEffect, useRef, type RefObject } from "react"
import { artifactBy, artifactSpec, itemBy, latest, releaseBy } from "./engine/engine"
import { accountable, shortTime } from "./engine/selectors"
import { sameScope, type AgentixState, type InstructionStatus, type Message, type ObjectRef, type ScopeRef } from "./engine/types"

const STATUS: Record<InstructionStatus, { label: string; tone: string; icon: typeof Clock }> = {
	received: { label: "Received", tone: "neutral", icon: Clock }, queued: { label: "Queued", tone: "live", icon: Clock }, awaiting: { label: "Waiting to apply", tone: "attention", icon: Clock },
	applied: { label: "Applied", tone: "positive", icon: CheckCircle }, failed: { label: "Couldn't apply", tone: "danger", icon: XCircle }, answered: { label: "Answered", tone: "neutral", icon: CheckCircle }, declined: { label: "Not applied", tone: "neutral", icon: XCircle },
}

export function scopeLabel(state: AgentixState, scope: ScopeRef) {
	if (scope.kind === "work") { const item = itemBy(state, scope.id); return item ? `${item.reference} · ${item.title}` : "Work item" }
	if (scope.kind === "artifact") { const artifact = artifactBy(state, scope.id); return artifact ? `${artifact.title} v${latest(artifact).version}` : "Result" }
	return "Whole engagement"
}
const shortScope = (state: AgentixState, scope: ScopeRef) => scope.kind === "work" ? itemBy(state, scope.id)?.reference ?? "Work item" : scope.kind === "artifact" ? artifactBy(state, scope.id)?.title ?? "Result" : "Engagement"

function refLabel(state: AgentixState, ref: ObjectRef) {
	if (ref.kind === "work") return itemBy(state, ref.id)?.reference ?? "Work item"
	if (ref.kind === "artifact") { const artifact = artifactBy(state, ref.id); return artifact ? `${artifact.title}${ref.version ? ` v${ref.version}` : ` v${latest(artifact).version}`}` : "Result" }
	if (ref.kind === "release") return releaseBy(state, ref.id)?.reference ?? "Release"
	return "Decision"
}

/* Starting points that fit the scope. They fill the composer; nothing is sent until you send it. */
export function suggestionsFor(state: AgentixState, engagementId: string, scope: ScopeRef): string[] {
	const engagement = state.engagements[engagementId]
	if (scope.kind === "work") {
		const item = itemBy(state, scope.id)
		if (!item) return []
		const failed = item.artifactIds.some(id => artifactBy(state, id)?.versions.some(version => version.checks.some(check => check.detail)))
		// Only release steps that are actually allowed are suggested: a hold defers an allowed release, a stop ends a waiting one.
		const releases = item.releaseIds.map(id => releaseBy(state, id)).filter(entry => !!entry)
		const holdable = releases.some(entry => entry!.status === "preparing" || entry!.status === "releasing")
		const stoppable = releases.some(entry => ["held", "awaiting_approval", "blocked"].includes(entry!.status))
		return [item.status === "waiting" ? "What is it waiting for?" : "What's the status?", ...failed ? ["Explain the failed check"] : [], ...holdable ? ["Hold this release until the agreed window"] : stoppable ? ["Stop this release"] : [], ...item.status === "verified" || item.status === "not_completed" ? [] : [item.kind === "case" ? "Prioritize this case" : "Pause this work item"]].slice(0, 3)
	}
	if (scope.kind === "artifact") {
		const artifact = artifactBy(state, scope.id)
		const spec = artifact ? artifactSpec(state, artifact) : undefined
		const amendments = spec?.amendments.filter(entry => !latest(artifact!).variant.includes(entry.variant))// The amendment says what it is; the suggestion is not one scenario's wording for all of them.
			.map(entry => entry.label) ?? []
		return [...amendments, "Explain the failed check", "What is it allowed to change?"].slice(0, 3)
	}
	return ["What needs me?", "What's happening now?", engagement.workflowId === "invoice" ? "Reconcile the August credit notes" : "Why this team?"]
}

export function Composer({ state, engagementId, scope, viewScope, draft, inputRef, onDraft, onSend, onScope, conversationOpen, onToggleConversation, unread }: {
	state: AgentixState; engagementId: string; scope: ScopeRef; viewScope: ScopeRef; draft: string; inputRef: RefObject<HTMLTextAreaElement>
	onDraft: (value: string) => void; onSend: () => void; onScope: (scope: ScopeRef) => void; conversationOpen: boolean; onToggleConversation: () => void; unread: number
}) {
	const lead = accountable(state.engagements[engagementId])
	const retarget = !sameScope(scope, viewScope)
	return (
		<div className="aop-composer">
			{scope.kind !== "engagement" || retarget ? (
				<div className="aop-composer-scope">
					{retarget && draft.trim() ? <span>Your unsent draft stays about {shortScope(state, scope)}.</span> : null}
					{retarget ? <button type="button" className="aop-scope-action" onClick={() => onScope(viewScope)}>Write about {shortScope(state, viewScope)}{draft.trim() ? " instead" : ""}</button> : null}
					{scope.kind !== "engagement" && !(retarget && viewScope.kind === "engagement") ? <button type="button" className="aop-scope-action" onClick={() => onScope({ kind: "engagement" })}>Use whole engagement</button> : null}
				</div>
			) : null}
			<WorkspaceComposer
				id="aop-composer-input"
				inputRef={inputRef}
				value={draft}
				onChange={onDraft}
				onSubmit={onSend}
				label={`Message ${lead.name} about ${scopeLabel(state, scope)}`}
				placeholder={scope.kind === "engagement" ? "Ask, steer or assign work…" : scope.kind === "artifact" ? "Ask about it or request a change…" : "Ask about it or steer it…"}
				sendLabel="Send to the accountable agent"
				maxLength={2000}
				context={<><Mark seed={`${state.engagements[engagementId].workflowId}:${lead.id}`} size="xs" /><span aria-live="polite"><span className="aop-composer-to">To {lead.name} · about </span><strong>{scopeLabel(state, scope)}</strong></span></>}
				tools={conversationOpen ? undefined : <button type="button" aria-pressed={conversationOpen} aria-label={`Conversation${unread && !conversationOpen ? `, ${unread} new` : ""}`} onClick={onToggleConversation}><ChatCircleText size={14} /><span className="aop-composer-tool-label">Conversation</span>{unread && !conversationOpen ? <span className="aop-unread">{unread}</span> : null}</button>} />
		</div>
	)
}

const RECENT = 5 * 60000

/* The latest exchange, one line above the composer while the conversation is collapsed. */
export function LatestReply({ state, engagementId, onOpen, onDismiss, onLink }: { state: AgentixState; engagementId: string; onOpen: () => void; onDismiss: () => void; onLink: (ref: ObjectRef) => void }) {
	const messages = state.messages.filter(message => message.engagementId === engagementId)
	// The latest reply to you; progress updates posted since don't hide it.
	const reply = [...messages].reverse().find(message => message.role === "agent" && !message.update)
	const asked = reply ? [...messages].reverse().find(message => message.role === "owner" && message.at <= reply.at) : undefined
	// Above the composer only while it's recent; older replies stay in the conversation, where their time is shown.
	if (!reply || state.clock - reply.at > RECENT) return null
	const status = asked?.instruction ? STATUS[asked.instruction.status] : undefined
	return (
		<div className="aop-latest" role="status">
			{status ? <span className={`aop-status is-${status.tone}`}><status.icon size={12} weight="bold" />{status.label}</span> : null}
			<p><time className="aop-latest-time">{shortTime(reply.at)}</time> {reply.text}</p>
			<span className="aop-latest-actions">
				{(reply.links ?? []).slice(0, 2).map(link => <button key={`${link.kind}:${link.id}`} type="button" className="aop-chip is-outline aop-link-chip" onClick={() => onLink(link)}>{refLabel(state, link)}</button>)}
				<button type="button" className="aop-scope-action" onClick={onOpen}>Open conversation</button>
				<button type="button" className="aop-icon-button" aria-label="Dismiss the latest reply" onClick={onDismiss}><X size={12} /></button>
			</span>
		</div>
	)
}

export function ConversationPanel({ state, engagementId, pinned, onPin, onClose, onLink, onAccept, onSuggest, scope, children }: {
	state: AgentixState; engagementId: string; pinned: boolean; onPin: () => void; onClose: () => void; onLink: (ref: ObjectRef) => void
	onAccept: (messageId: string) => void; onSuggest: (text: string) => void; scope: ScopeRef; children?: React.ReactNode
}) {
	const log = useRef<HTMLDivElement>(null)
	const engagement = state.engagements[engagementId]
	const lead = accountable(engagement)
	const messages = state.messages.filter(message => message.engagementId === engagementId)
	useEffect(() => { const node = log.current; if (node) node.scrollTop = node.scrollHeight }, [messages.length])
	return (
		<section className={`aop-conversation${pinned ? " is-pinned" : ""}`} aria-label="Conversation" onKeyDown={event => { if (event.key === "Escape" && !event.defaultPrevented) { event.stopPropagation(); onClose() } }}>
			<header className="aop-thread-head">
				<h2>Conversation</h2>
				<span className="aop-thread-sub">with {lead.name}</span>
				<button type="button" className="aop-icon-button" aria-pressed={pinned} aria-label={pinned ? "Unpin conversation" : "Pin conversation open"} title={pinned ? "Unpin" : "Keep open beside the work"} onClick={onPin}>{pinned ? <PushPinSlash size={16} /> : <PushPin size={16} />}</button>
				<button type="button" className="aop-icon-button" aria-label="Close conversation" onClick={onClose}><X size={16} /></button>
			</header>
			<div ref={log} className="aop-thread-log" role="log" aria-label="Messages" tabIndex={0}>
				{!messages.length ? (
					<div className="aop-thread-empty">
						<span className="aop-icon-tile" aria-hidden="true"><ChatCircleText size={16} /></span>
						<p><strong>Ask, steer or assign work</strong></p>
						<p>{lead.name} answers and coordinates the specialists. Decisions stay in their cards; chat can't approve them.</p>
						<div className="aop-suggestions">{suggestionsFor(state, engagementId, scope).map(text => <button key={text} type="button" className="aop-suggestion" onClick={() => onSuggest(text)}>{text}<ArrowUpRight size={12} /></button>)}</div>
					</div>
				) : messages.map(message => <MessageRow key={message.id} state={state} message={message} lead={lead.name} workflowId={engagement.workflowId} leadId={lead.id} onLink={onLink} onAccept={onAccept} />)}
			</div>
			{children}
			<p className="aop-thread-foot">Closing this doesn't pause anything. Work continues while MAXION is open.</p>
		</section>
	)
}

function MessageRow({ state, message, lead, leadId, workflowId, onLink, onAccept }: { state: AgentixState; message: Message; lead: string; leadId: string; workflowId: string; onLink: (ref: ObjectRef) => void; onAccept: (id: string) => void }) {
	const scope = message.scope.kind === "engagement" ? null : <span className="aop-chip">{shortScope(state, message.scope)}</span>
	if (message.role === "owner") {
		const status = message.instruction ? STATUS[message.instruction.status] : undefined
		return (
			<article className="aop-turn is-owner">
				<p className="aop-turn-speaker">You{scope}<time>{shortTime(message.at)}</time></p>
				<div className="aop-bubble"><p>{message.text}</p></div>
				{status ? <span className={`aop-status is-${status.tone}`}><status.icon size={12} weight="bold" />{status.label}</span> : null}
			</article>
		)
	}
	if (message.update) {
		return (
			<article className="aop-update">
				<Sparkle size={14} aria-hidden="true" />
				<p>{message.text}</p>
				{(message.links ?? []).length ? <span className="aop-chips">{message.links!.slice(0, 3).map(link => <button key={`${link.kind}:${link.id}`} type="button" className="aop-chip is-outline aop-link-chip" onClick={() => onLink(link)}>{refLabel(state, link)}</button>)}</span> : null}
				<time>{shortTime(message.at)}</time>
			</article>
		)
	}
	return (
		<article className="aop-turn">
			<p className="aop-turn-speaker"><Mark seed={`${workflowId}:${leadId}`} size="xs" /><span className="aop-turn-name">{lead}</span>{scope}<time>{shortTime(message.at)}</time></p>
			<div className="aop-bubble">
				<p>{message.text}</p>
				{(message.links ?? []).length ? <p className="aop-chips">{message.links!.slice(0, 4).map(link => <button key={`${link.kind}:${link.id}`} type="button" className="aop-chip is-outline aop-link-chip" onClick={() => onLink(link)}>{refLabel(state, link)}</button>)}</p> : null}
				{message.offer ? <div className="aop-offer"><DsButton size="sm" variant="primary" onClick={() => onAccept(message.id)}>Yes, go ahead</DsButton><span>Nothing happens unless you choose this.</span></div> : null}
			</div>
		</article>
	)
}
