import {
	ArrowRight,
	Check,
	CheckCircle,
	Circle,
	CloudSlash,
	Compass,
	DotsThree,
	FileText,
	LinkSimple,
	Pause,
	Play,
	ShieldCheck,
	Sparkle,
	WarningCircle,
} from "@phosphor-icons/react"
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"

import type { DiscoveryOpenSignal, DiscoveryPackageRef } from "@/features/platform-prototype/contracts"

import { discoveryStateRepository } from "./discoveryRepository"
import {
	DISCOVERY_INPUT_LIMIT,
	discoveryReducer,
	selectActiveDiscoverySession,
	selectMountedEvidence,
	selectMountedTranscript,
	selectOpenDiscoveryGaps,
	selectPackageReady,
	type DiscoveryPermission,
	type DiscoverySession,
} from "./discoveryState"
import { SCENARIOS } from "./model"
import "./discover-workspace.css"

export type DiscoveryJump = "resume" | "decision" | "package"
export type DiscoveryJumpRecord = {
	id: string
	title: string
	status: "needs-input" | "in-progress" | "completed"
	statusLabel: string
	keywords: string
}

export function listDiscoveryJumpRecords(projectId?: string): DiscoveryJumpRecord[] {
	return discoveryStateRepository.load().value.sessions.filter((session) => !projectId || session.projectId === projectId).map((session) => {
		const needsInput = ["awaiting-answer", "insufficient-evidence", "offline", "recoverable-error"].includes(session.status)
		return {
			id: session.id,
			title: session.title,
			status: session.status === "complete" ? "completed" : needsInput ? "needs-input" : "in-progress",
			statusLabel: session.status === "complete" ? "Completed" : needsInput ? "Needs your input" : session.status === "paused" ? "Paused" : "Working autonomously",
			keywords: `${session.projectName} ${session.scenarioKey} ${session.status}`,
		}
	})
}

type DiscoverWorkspaceProps = {
	embedded?: boolean
	setupSignal?: number
	openSignal?: DiscoveryOpenSignal | null
	project?: { id: string; name: string; role: "Owner" | "Member" | "Viewer" } | null
	onPackageReady?: (packageRef: DiscoveryPackageRef) => void
	operationalPackages?: ReactNode
}

const STATUS_COPY: Record<DiscoverySession["status"], { label: string; detail: string }> = {
	new: { label: "New", detail: "Define the decision this Discovery must support." },
	active: { label: "Interview active", detail: "Evidence and answers are updating in place." },
	paused: { label: "Paused", detail: "Your transcript, sources, and draft are preserved." },
	"awaiting-answer": { label: "Your answer", detail: "MAX needs one bounded answer before continuing." },
	"insufficient-evidence": { label: "Evidence needed", detail: "Resolve the material gap before creating a package." },
	offline: { label: "Provider offline", detail: "No work was lost. Retry or continue manually." },
	"recoverable-error": { label: "Recovery needed", detail: "The last change was preserved in this session." },
	complete: { label: "Package ready", detail: "The versioned package is bound to Plan." },
	"read-only": { label: "View only", detail: "You can inspect evidence but cannot change this Discovery." },
}

function useDiscoveryState() {
	const loaded = useMemo(() => discoveryStateRepository.load(), [])
	const [state, dispatch] = useReducer(discoveryReducer, loaded.value)
	const [persistenceNotice, setPersistenceNotice] = useState(loaded.notice)
	useEffect(() => {
		const result = discoveryStateRepository.save(state)
		if (!result.ok) setPersistenceNotice(result.message)
	}, [state])
	return { state, dispatch, persistenceNotice, dismissPersistenceNotice: () => setPersistenceNotice(null) }
}

export function DiscoverWorkspace({ embedded = false, setupSignal = 0, openSignal = null, project = null, onPackageReady, operationalPackages }: DiscoverWorkspaceProps) {
	const { state, dispatch, persistenceNotice, dismissPersistenceNotice } = useDiscoveryState()
	const [setupOpen, setSetupOpen] = useState(false)
	const [brief, setBrief] = useState("")
	const [railView, setRailView] = useState<"evidence" | "facts" | "gaps">("evidence")
	const briefRef = useRef<HTMLTextAreaElement>(null)
	const newButtonRef = useRef<HTMLButtonElement>(null)
	const handledSetup = useRef(setupSignal)
	const handledOpen = useRef(0)
	const retryTimer = useRef<number | null>(null)
	const projectContext = useMemo<{ id: string; name: string; permission: DiscoveryPermission }>(() => ({
		id: project?.id ?? "erp-modernization",
		name: project?.name ?? "ERP modernization",
		permission: project?.role === "Viewer" ? "viewer" : project?.role === "Member" ? "member" : "owner",
	}), [project?.id, project?.name, project?.role])
	const session = selectActiveDiscoverySession(state)
	const isViewer = projectContext.permission === "viewer"

	useEffect(() => () => { if (retryTimer.current !== null) window.clearTimeout(retryTimer.current) }, [])
	const openSetup = useCallback(() => {
		if (isViewer) return
		setSetupOpen(true)
		window.setTimeout(() => briefRef.current?.focus(), 0)
	}, [isViewer])
	const closeSetup = useCallback(() => {
		setSetupOpen(false)
		window.setTimeout(() => newButtonRef.current?.focus(), 0)
	}, [])
	useEffect(() => {
		if (!setupOpen) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return
			event.preventDefault()
			closeSetup()
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [closeSetup, setupOpen])
	useEffect(() => {
		if (setupSignal === handledSetup.current) return
		handledSetup.current = setupSignal
		if (isViewer) return
		openSetup()
	}, [isViewer, openSetup, setupSignal])
	useEffect(() => {
		dispatch({ type: "project/selected", projectId: projectContext.id, permission: projectContext.permission })
	}, [dispatch, projectContext])
	useEffect(() => {
		if (!openSignal || handledOpen.current === openSignal.tick) return
		handledOpen.current = openSignal.tick
		dispatch({ type: "session/opened", sessionId: openSignal.recordId, projectId: projectContext.id })
		setSetupOpen(false)
		if (openSignal.jump === "decision") setRailView("gaps")
		if (openSignal.jump === "package") setRailView("facts")
	}, [dispatch, openSignal, projectContext.id])

	const startDiscovery = (event: FormEvent) => {
		event.preventDefault()
		if (!brief.trim() || isViewer) return
		dispatch({ type: "session/started", brief, projectId: projectContext.id, projectName: projectContext.name, permission: projectContext.permission })
		setBrief("")
		setSetupOpen(false)
	}

	const createPackage = () => {
		if (!session || !selectPackageReady(session)) return
		dispatch({ type: "package/created" })
		const next = discoveryReducer(state, { type: "package/created" })
		const packageRef = selectActiveDiscoverySession(next)?.packageRef
		if (packageRef) onPackageReady?.(packageRef)
	}

	const retryProvider = () => {
		dispatch({ type: "provider/retry-started" })
		if (retryTimer.current !== null) window.clearTimeout(retryTimer.current)
		retryTimer.current = window.setTimeout(() => dispatch({ type: "provider/recovered" }), 180)
	}

	if (!session) return <><section className="dws-empty"><Compass size={28} /><h1>No Discovery yet</h1><p>{isViewer ? "Viewers can inspect existing Discovery sessions but cannot start one." : "Start with the decision you need to make. MAX will shape the interview and evidence plan."}</p><button ref={newButtonRef} type="button" onClick={openSetup} disabled={isViewer}>Start a Discovery</button></section>{setupOpen ? <SetupDialog brief={brief} setBrief={setBrief} briefRef={briefRef} onClose={closeSetup} onSubmit={startDiscovery} disabled={isViewer} /> : null}</>

	return (
		<section className={`dws-root${embedded ? " is-embedded" : ""}`} aria-label="Discover interview workspace">
			<header className="dws-header">
				<div className="dws-heading"><span className="dws-mark"><Sparkle size={15} weight="fill" /></span><div><small>Discover · {session.projectName}</small><h1>{session.title}</h1></div></div>
				<div className="dws-header-actions">
					<span className={`dws-status is-${session.status}`} role="status"><i />{STATUS_COPY[session.status].label}</span>
					{session.status === "paused" ? <button type="button" onClick={() => dispatch({ type: "session/resumed" })}><Play size={15} />Resume</button> : session.status !== "complete" && session.status !== "read-only" ? <button type="button" onClick={() => dispatch({ type: "session/paused" })}><Pause size={15} />Pause</button> : null}
					<button ref={newButtonRef} type="button" className="dws-new" onClick={openSetup} disabled={isViewer}>New Discovery</button>
				</div>
			</header>

			{persistenceNotice ? <div className="dws-notice" role="status"><span>{persistenceNotice}</span><button type="button" onClick={dismissPersistenceNotice}>Dismiss</button></div> : null}

			<div className="dws-layout">
				<InterviewPlan session={session} operationalPackages={operationalPackages} />
				<InterviewWorkspace session={session} dispatch={dispatch} onRetry={retryProvider} onCreatePackage={createPackage} />
				<EvidenceRail session={session} view={railView} onViewChange={setRailView} dispatch={dispatch} />
			</div>

			{setupOpen ? <SetupDialog brief={brief} setBrief={setBrief} briefRef={briefRef} onClose={closeSetup} onSubmit={startDiscovery} disabled={isViewer} /> : null}
		</section>
	)
}

function SetupDialog({ brief, setBrief, briefRef, onClose, onSubmit, disabled }: { brief: string; setBrief: (value: string) => void; briefRef: React.RefObject<HTMLTextAreaElement>; onClose: () => void; onSubmit: (event: FormEvent) => void; disabled: boolean }) {
	return <div className="dws-setup-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="dws-setup" role="dialog" aria-modal="true" aria-labelledby="dws-setup-title" onSubmit={onSubmit}><small>New Discovery</small><h2 id="dws-setup-title">What decision should MAX support?</h2><p>{disabled ? "Viewer access can inspect but cannot create Discovery sessions." : "Describe the outcome. MAX will create a bounded interview and evidence plan."}</p><label htmlFor="dws-brief">Discovery brief</label><textarea ref={briefRef} id="dws-brief" value={brief} maxLength={DISCOVERY_INPUT_LIMIT} disabled={disabled} onChange={(event) => setBrief(event.target.value)} placeholder="For example, define the safest approval path for strategic vendor onboarding…" rows={5} /><div><span>{brief.length.toLocaleString("en-US")} / {DISCOVERY_INPUT_LIMIT.toLocaleString("en-US")}</span><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={disabled || !brief.trim()}>Start Discovery</button></div></form></div>
}

function InterviewPlan({ session, operationalPackages }: { session: DiscoverySession; operationalPackages?: ReactNode }) {
	const scenario = SCENARIOS[session.scenarioKey]
	return <aside className="dws-plan" aria-label="Interview plan"><header><small>Interview plan</small><strong>{scenario.interviewer}</strong><span>About 8 minutes · {session.questionIndex + 1} of {scenario.ownerInterview.length}</span></header><ol>{scenario.ownerInterview.map((question, index) => { const answered = session.interviewTurns[index]?.answer; const current = index === session.questionIndex && !answered; return <li key={question.topic} className={answered ? "is-complete" : current ? "is-current" : ""}>{answered ? <Check size={13} /> : current ? <span>{index + 1}</span> : <Circle size={13} />}<button type="button" disabled={!answered && !current} aria-current={current ? "step" : undefined}><strong>{question.topic}</strong><small>{answered ? "Answered" : current ? "In progress" : "Upcoming"}</small></button></li> })}</ol><footer><ShieldCheck size={16} /><p><strong>Planning authority only</strong><span>Interview answers cannot widen execution permissions.</span></p></footer>{operationalPackages ? <div className="dws-operational">{operationalPackages}</div> : null}</aside>
}

function InterviewWorkspace({ session, dispatch, onRetry, onCreatePackage }: { session: DiscoverySession; dispatch: React.Dispatch<Parameters<typeof discoveryReducer>[1]>; onRetry: () => void; onCreatePackage: () => void }) {
	const transcript = selectMountedTranscript(session)
	const scenario = SCENARIOS[session.scenarioKey]
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const canCompose = !["paused", "recoverable-error", "complete", "read-only"].includes(session.status) && (session.provider.status === "online" || session.provider.manualContinuation)
	const submit = () => {
		if (!session.draft.trim()) return
		dispatch({ type: "interview/answered", answer: session.draft })
		window.setTimeout(() => composerRef.current?.focus(), 0)
	}
	return <main className="dws-interview"><header><div><span className="dws-avatar">MR</span><p><strong>Maya Rao</strong><small>Vendor risk lead · owner interview</small></p></div><button type="button" aria-label="Interview options"><DotsThree size={18} /></button></header><div className="dws-progress"><span style={{ width: `${Math.max(8, ((session.questionIndex + 1) / scenario.ownerInterview.length) * 100)}%` }} /><small>{session.questionIndex + 1} of {scenario.ownerInterview.length} questions</small></div><section className="dws-transcript" aria-label="Discovery interview transcript" aria-live="polite">{transcript.omitted ? <p className="dws-window-note">Showing the latest {transcript.items.length} of {transcript.total.toLocaleString("en-US")} entries.</p> : null}{transcript.items.map((entry) => <article key={entry.id} className={`is-${entry.actor}`}><span>{entry.actor === "operator" ? "You" : entry.actor === "system" ? "System" : "MAX"}</span><p>{entry.text}</p><time>{new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</time></article>)}</section><StateRecovery session={session} dispatch={dispatch} onRetry={onRetry} onCreatePackage={onCreatePackage} />{session.status !== "complete" ? <div className="dws-composer"><label htmlFor="dws-answer">Answer MAX</label><textarea ref={composerRef} id="dws-answer" aria-label="Answer MAX" value={session.draft} maxLength={DISCOVERY_INPUT_LIMIT} disabled={!canCompose} onChange={(event) => dispatch({ type: "draft/changed", value: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder={session.status === "read-only" ? "View-only access" : session.status === "paused" ? "Resume to continue" : session.status === "offline" ? "Retry or continue manually" : "Answer with what you know. MAX will preserve uncertainty…"} rows={3} /><footer><span>{session.draft.length.toLocaleString("en-US")} / {DISCOVERY_INPUT_LIMIT.toLocaleString("en-US")}</span><button type="button" onClick={submit} disabled={!canCompose || !session.draft.trim()} aria-label="Send answer"><ArrowRight size={17} /></button></footer></div> : null}</main>
}

function StateRecovery({ session, dispatch, onRetry, onCreatePackage }: { session: DiscoverySession; dispatch: React.Dispatch<Parameters<typeof discoveryReducer>[1]>; onRetry: () => void; onCreatePackage: () => void }) {
	if (session.status === "paused") return <section className="dws-state-card"><Pause size={18} /><div><strong>Interview paused</strong><p>Your draft and evidence are preserved.</p></div><button type="button" onClick={() => dispatch({ type: "session/resumed" })}>Resume interview</button></section>
	if (session.provider.status === "retrying") return <section className="dws-state-card"><CloudSlash size={18} /><div><strong>Reconnecting</strong><p>Attempt {session.provider.attempt}. Your work remains editable after recovery.</p></div></section>
	if (session.status === "offline") return <section className="dws-state-card is-warning"><CloudSlash size={18} /><div><strong>{session.provider.manualContinuation ? "Manual continuation" : "Provider connection lost"}</strong><p>{session.provider.lastError} {session.provider.manualContinuation ? "Manual notes stay provisional until provider recovery." : "Your draft is still here."}</p></div>{!session.provider.manualContinuation ? <button type="button" onClick={() => dispatch({ type: "provider/manual-continuation" })}>Continue manually</button> : null}<button type="button" className="is-primary" onClick={onRetry}>Retry connection</button></section>
	if (session.status === "recoverable-error") return <section className="dws-state-card is-warning"><WarningCircle size={18} /><div><strong>That change needs recovery</strong><p>{session.provider.lastError}</p></div><button type="button" className="is-primary" onClick={() => dispatch({ type: "session/recovered" })}>Restore safe state</button></section>
	if (session.status === "read-only") return <section className="dws-state-card"><ShieldCheck size={18} /><div><strong>Read-only Discovery</strong><p>Ask a project owner for Member access to answer, resolve gaps, or create a package.</p></div></section>
	if (session.status === "complete" && session.packageRef) return <section className="dws-complete"><CheckCircle size={23} weight="fill" /><div><small>Discovery package v{session.packageRef.version}</small><strong>Evidence is ready for Plan</strong><p>{session.packageRef.provenance.length} source references · {session.packageRef.unresolvedGapIds.length} unresolved material gaps · authority: {session.packageRef.authority.boundedTo}</p></div></section>
	if (selectPackageReady(session)) return <section className="dws-state-card is-ready"><CheckCircle size={18} /><div><strong>Ready to hand off</strong><p>Evidence and authority checks pass. Create one versioned package for Plan.</p></div><button type="button" className="is-primary" onClick={onCreatePackage}>Create package for Plan</button></section>
	return null
}

function EvidenceRail({ session, view, onViewChange, dispatch }: { session: DiscoverySession; view: "evidence" | "facts" | "gaps"; onViewChange: (view: "evidence" | "facts" | "gaps") => void; dispatch: React.Dispatch<Parameters<typeof discoveryReducer>[1]> }) {
	const evidence = selectMountedEvidence(session)
	const gaps = selectOpenDiscoveryGaps(session)
	return <aside className="dws-evidence" aria-label="Evidence, facts, and gaps"><nav aria-label="Discovery evidence views">{(["evidence", "facts", "gaps"] as const).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => onViewChange(item)}>{item === "evidence" ? "Evidence" : item === "facts" ? "Facts" : `Gaps ${gaps.length}`}</button>)}</nav>{view === "evidence" ? <section><header><div><small>Source record</small><strong>{evidence.total.toLocaleString("en-US")} references</strong></div><span>{session.evidence.filter((item) => item.verified).length} verified</span></header>{evidence.items.map((item) => <article key={item.id}><span className={item.verified ? "is-verified" : ""}>{item.verified ? <Check size={12} /> : <LinkSimple size={12} />}</span><div><strong>{item.label}</strong><p>{item.source}</p><small>{item.locator}</small></div></article>)}</section> : null}{view === "facts" ? <section><header><div><small>Fact ledger</small><strong>{session.facts.length} findings</strong></div></header>{session.facts.length ? session.facts.map((fact) => <article key={fact.id}><span className={fact.confidence === "supported" ? "is-verified" : ""}>{fact.confidence === "supported" ? <Check size={12} /> : <FileText size={12} />}</span><div><strong>{fact.confidence === "supported" ? "Supported fact" : "Provisional fact"}</strong><p>{fact.statement}</p><small>{fact.evidenceIds.length ? `${fact.evidenceIds.length} linked source` : "Awaiting source support"}</small></div></article>) : <div className="dws-rail-empty"><FileText size={20} /><strong>No facts yet</strong><p>Answer the current question to create a provisional fact.</p></div>}</section> : null}{view === "gaps" ? <section><header><div><small>Gap queue</small><strong>{gaps.length ? "Needs resolution" : "No material gaps"}</strong></div></header>{gaps.length ? gaps.map((gap) => <article key={gap.id} className="is-gap"><span><WarningCircle size={13} /></span><div><strong>{gap.label}</strong><p>{gap.detail}</p><small>Material · blocks Plan package</small><button type="button" disabled={session.permission === "viewer" || session.provider.status !== "online"} onClick={() => dispatch({ type: "gap/resolved", gapId: gap.id })}>Resolve from policy source</button></div></article>) : <div className="dws-rail-empty"><CheckCircle size={20} /><strong>Evidence boundary closed</strong><p>Material gaps are resolved and retained in the package provenance.</p></div>}</section> : null}<footer><button type="button" onClick={() => dispatch({ type: "provider/offline", message: "The interview provider timed out before acknowledging the request." })} disabled={session.provider.status !== "online" || session.status === "complete" || session.permission === "viewer"}><CloudSlash size={14} />Test provider recovery</button></footer></aside>
}
