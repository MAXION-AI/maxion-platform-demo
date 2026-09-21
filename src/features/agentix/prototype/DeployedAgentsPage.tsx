import { ArrowLeft, ArrowRight, CaretDown, CheckCircle, Flask, Plus, WarningCircle } from "@phosphor-icons/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Banner, Button as DsButton, Count, Mark, PageHeader, SearchInput, SegmentedTabs, TextButton } from "@/design/primitives"
import { useRiseIn } from "@/components/motion/MotionKit"
import { Component, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"
import type { AgentixAttention, AgentixIntentSignal, AgentixOrigin, AgentixPendingCase } from "./AgentixInitiativesPage"
import type { WorkflowId } from "./initiatives"
import { activate, actOnEngagement, addIncoming, advanceSchedule, advanceToWindow, answerQuestion, armFailure, artifactBy, assignWork, awaitingCreation, createEngagement, editEngagement, itemBy, receivePackage, syncClock, tick, TICK_MS, visiblePackage, withdrawProposal, type BriefRoute } from "./engine/engine"
import { packageScenario, SCENARIOS } from "./engine/scenarios"
import { demoInitialState, initialState } from "./engine/seed"
import { demoScript } from "@/features/demo/scripts"
import { DEMO_AGENTIX_RESET_EVENT, DEMO_OWNER_EVENT, DEMO_SAVE_EVENT, demoActive, demoSession, notifyDemoChange, restartDemo } from "@/features/demo/session"
import { useDemoOwnership } from "@/features/demo/useDemoOwnership"
import { needsYou, teamOf, type NeedsYouItem } from "./engine/selectors"
import { readState, writeState } from "./engine/storage"
import type { AgentixState, DiscoveryLink, Nav } from "./engine/types"
import { EngagementStart } from "./EngagementStart"
import { EngagementWorkspace } from "./EngagementWorkspace"
import { Fleet } from "./OperationsViews"
import { ProposalReview } from "./ProposalReview"
import { DemoControls, DetailsSheet, type DetailSection } from "./Sheets"
import "./operations.css"
import "./engagement.css"

type Sheet = { kind: "details"; section: DetailSection } | { kind: "demo" } | null
const INBOX_LIMIT = 4
const KIND_ACTION: Record<NeedsYouItem["kind"], string> = { decision: "Review decision", question: "Answer", release: "Review release", human: "Provide confirmation", failed: "Choose next step", partial: "Resolve notification", permission: "Restore permission", proposal: "Review proposal", setup: "Finish setup" }

/*
 * A view that fails to render shows a way back instead of blanking the MAXION
 * shell. Saved engagements and their work are untouched.
 */
class ViewBoundary extends Component<{ resetKey: string; onRecover: () => void; action: string; children: ReactNode }, { failed: string | null }> {
	state = { failed: null as string | null }
	static getDerivedStateFromError() { return { failed: "failed" } }
	componentDidCatch(error: unknown) { console.error("Agentix view failed to render", error) }
	componentDidUpdate(previous: { resetKey: string }) { if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: null }) }
	render() {
		if (!this.state.failed) return this.props.children
		return (
			<div className="aop-view-error" role="alert">
				<WarningCircle size={18} aria-hidden="true" />
				<div>
					<h2>This view couldn't be shown.</h2>
					<p>Your engagements and their work are kept. Go back and continue from there.</p>
					<DsButton variant="primary" onClick={() => { this.setState({ failed: null }); this.props.onRecover() }}>{this.props.action}</DsButton>
				</div>
			</div>
		)
	}
}

/* Needs you across every engagement: one warning line, then one hairline row per thing, each with the one thing to do. */
function NeedsYou({ state, items, onOpen }: { state: AgentixState; items: NeedsYouItem[]; onOpen: (item: NeedsYouItem) => void }) {
	const [expanded, setExpanded] = useState(false)
	const rise = useRiseIn()
	const folded = items.length > INBOX_LIMIT && !expanded
	const shown = folded ? items.slice(0, INBOX_LIMIT - 1) : items
	if (!items.length) return <p className="aop-inbox-clear"><CheckCircle size={16} weight="fill" aria-hidden="true" />You're up to date. Every engagement is handling its current work.</p>
	return (
		<section className="aop-owner-inbox" aria-label="Your next actions">
			<header className="aop-inbox-head"><WarningCircle size={16} weight="fill" aria-hidden="true" /><h2>Needs you</h2><Count>{items.length}</Count><span className="aop-inbox-note">Everything else continues on its own.</span></header>
			<div className="aop-inbox-list">
				<AnimatePresence initial={false}>
					{shown.map(item => (
						<motion.button key={item.key} type="button" className="aop-inbox-row" {...rise} onClick={() => onOpen(item)}>
							<Mark seed={item.engagementId} size="xs" />
							<span className="aop-inbox-title">{item.title}</span>
							<span className="aop-inbox-meta">{state.engagements[item.engagementId]?.name} · {item.detail}</span>
							<span className="aop-inbox-action">{KIND_ACTION[item.kind]}<ArrowRight size={14} aria-hidden="true" /></span>
						</motion.button>
					))}
				</AnimatePresence>
			</div>
			{items.length > INBOX_LIMIT ? <TextButton className="aop-inbox-more" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Show fewer" : `Show ${items.length - shown.length} more`}<CaretDown size={12} aria-hidden="true" /></TextButton> : null}
		</section>
	)
}

export function DeployedAgentsPage({ intentSignal, onAttentionChange, onOpenDiscovery, onOpenDiscoveryRecord, active = true }: {
	intentSignal?: AgentixIntentSignal | null; onAttentionChange?: (attention: AgentixAttention) => void; onOpenDiscovery: (id: WorkflowId, origin?: AgentixOrigin) => void
	/* Opens the Discovery a handoff packet came from, at its package. */
	onOpenDiscoveryRecord?: (recordId: string) => void
	/* False while the shell shows another module. The customer demo's clock only runs while Agentix is on screen. */
	active?: boolean
}) {
	const [state, setState] = useState(readState)
	const [query, setQuery] = useState("")
	const [filter, setFilter] = useState("all")
	const [sheet, setSheet] = useState<Sheet>(null)
	const [sheetShown, setSheetShown] = useState<Sheet>(null)
	const [toast, setToast] = useState("")
	const [storageError, setStorageError] = useState(false)
	const [focusRequest, setFocusRequest] = useState(0)
	const reduced = useReducedMotion()
	const root = useRef<HTMLDivElement>(null)
	const dialog = useRef<HTMLDialogElement>(null)
	const returnFocus = useRef<HTMLElement | null>(null)
	// Work assigned from a brief opens once the store holds it.
	const assigned = useRef<{ before: Set<string>; engagementId: string } | null>(null)
	const reported = useRef("")
	const seen = useRef(0)
	const sheetTitle = useId()
	const update = useCallback((recipe: (current: AgentixState) => AgentixState) => setState(recipe), [])
	const setNav = (patch: Partial<Nav>) => setState(current => ({ ...current, nav: { ...current.nav, ...patch } }))
	const nav = state.nav
	const engagement = nav.engagementId ? state.engagements[nav.engagementId] : undefined
	const reviewing = nav.reviewing ? state.engagements[nav.reviewing] : engagement?.status === "draft" ? engagement : undefined

	// A customer demo moved to another tab saves this tab's run privately (see moduleStorage), never over
	// that tab's; taking the demo back saves what this tab shows to the shared run.
	const stateRef = useRef(state)
	stateRef.current = state
	const save = useCallback(() => { try { writeState(stateRef.current); setStorageError(false); notifyDemoChange() } catch { setStorageError(true) } }, [])
	useEffect(() => { save() }, [state, save])
	// Saving again when ownership moves keeps a displaced tab's run in its own copy, so a reload there loses nothing.
	useEffect(() => {
		window.addEventListener(DEMO_SAVE_EVENT, save)
		window.addEventListener(DEMO_OWNER_EVENT, save)
		return () => { window.removeEventListener(DEMO_SAVE_EVENT, save); window.removeEventListener(DEMO_OWNER_EVENT, save) }
	}, [save])
	// The everyday prototype keeps working in the background. The customer demo pauses while another module is on
	// screen, so Agentix's time stays close to the presenter's and a Discovery takes as long as it takes.
	const owns = useDemoOwnership()
	// A new revenue Discovery in the customer demo starts Agentix again from zero, at that moment.
	useEffect(() => {
		const reset = () => { const demo = demoSession(); assigned.current = null; setSheet(null); setToast(""); setState(demoInitialState(Math.floor(Date.now() / 60000) * 60000, demo ? demoScript(demo.id).engagementId : undefined)) }
		window.addEventListener(DEMO_AGENTIX_RESET_EVENT, reset)
		return () => window.removeEventListener(DEMO_AGENTIX_RESET_EVENT, reset)
	}, [])
	const running = (active || !demoActive()) && owns
	useEffect(() => { if (!running) return; const timer = window.setInterval(() => setState(tick), TICK_MS); return () => window.clearInterval(timer) }, [running])
	useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), Math.max(3200, toast.length * 55)); return () => window.clearTimeout(timer) }, [toast])

	// The shell hears decisions and setup separately, with the work items and engagements it can name.
	useEffect(() => {
		if (!onAttentionChange) return
		const items = needsYou(state)
		const byWork = new Map<string, AgentixPendingCase>()
		for (const entry of items) {
			if (!entry.workId || entry.kind === "proposal" || entry.kind === "setup" || byWork.has(entry.workId)) continue
			const item = itemBy(state, entry.workId)
			const owner = state.engagements[entry.engagementId]
			if (!item || !owner) continue
			byWork.set(entry.workId, { id: item.id, agentId: owner.id, workflowId: owner.workflowId, engagement: owner.name, reference: item.reference, title: item.title, phase: entry.kind === "human" ? "human" : entry.kind === "partial" ? "partial" : "approval", label: entry.kind === "release" ? `Review ${entry.title.replace(/\?$/, "").replace(/^Release /, "").toLowerCase()} release` : entry.kind === "question" ? `Answer: ${entry.title}` : undefined })
		}
		const pending = [...byWork.values()]
		const setup = items.filter(entry => entry.kind === "proposal" || entry.kind === "setup").length
		const engagements = Object.values(state.engagements).filter(entry => !awaitingCreation(entry)).map(entry => ({ id: entry.id, name: entry.name, workflowId: entry.workflowId, status: entry.status, duties: teamOf(entry).length, category: SCENARIOS[entry.workflowId].category }))
		const attention: AgentixAttention = { count: pending.length + setup, approval: pending.some(entry => entry.phase === "approval"), audience: pending.some(entry => entry.phase === "human"), reported: true, decisions: pending.length, setup, pending, engagements }
		const signature = JSON.stringify(attention)
		if (signature === reported.current) return
		reported.current = signature
		onAttentionChange(attention)
	}, [state, onAttentionChange])

	const showLanding = () => { setNav({ engagementId: null, workId: undefined, resultId: undefined, creating: false, reviewing: undefined }); setFocusRequest(count => count + 1) }
	const openEngagement = (id: string, patch: Partial<Nav> = {}) => { setNav({ engagementId: id, creating: false, reviewing: undefined, workId: undefined, resultId: undefined, view: "work", ...patch }); setFocusRequest(count => count + 1) }
	const openWork = (id: string) => { const item = itemBy(state, id); if (item) openEngagement(item.engagementId, { view: "work", workId: id }) }
	useEffect(() => {
		const pending = assigned.current
		if (!pending) return
		assigned.current = null
		const created = state.work.find(item => item.engagementId === pending.engagementId && !pending.before.has(item.id))
		if (created) openWork(created.id)
		else openEngagement(pending.engagementId)
	}, [state.work])
	const openReview = (id: string) => { setNav({ engagementId: id, reviewing: id, creating: false, workId: undefined }); setFocusRequest(count => count + 1) }
	const importPackage = (packageId: string, origin: "discovery" | "prompt" = "discovery", brief = "") => {
		const workflowId = packageScenario(packageId)
		if (!workflowId) return
		const current = state.engagements[workflowId]
		if (current.packages.includes(packageId)) { setToast(`Already live in ${current.name}. No duplicate engagement was created.`); openEngagement(workflowId); return }
		update(value => receivePackage(value, packageId, origin, brief))
		openReview(workflowId)
	}
	// A Discovery packet: received once with its provenance (the customer demo also brings Agentix to the
	// packet's moment), and opened again, not received again, when the Discovery asks for it later.
	const receiveHandoff = (packageId: string, discovery: DiscoveryLink, note: string) => {
		const workflowId = packageScenario(packageId)
		if (!workflowId) { showLanding(); return }
		const current = state.engagements[workflowId]
		if (current.packages.includes(packageId)) { setToast(`${current.name} already runs this package. No duplicate engagement was created.`); openEngagement(workflowId); return }
		const fresh = current.proposal?.packageId !== packageId
		update(value => { const received = receivePackage(value, packageId, "discovery", note, discovery); return demoActive() ? syncClock(received, Date.now()) : received })
		openReview(workflowId)
		if (fresh) setToast(`Received from Discovery · ${discovery.packetId}. Nothing runs until you activate it.`)
	}
	const openItem = (entry: NeedsYouItem) => {
		if (entry.kind === "proposal") openReview(entry.engagementId)
		else if (entry.kind === "setup") openReview(entry.engagementId)
		else if (entry.workId) openWork(entry.workId)
		else openEngagement(entry.engagementId)
	}

	useEffect(() => {
		if (!intentSignal || intentSignal.tick === seen.current) return
		seen.current = intentSignal.tick
		const intent = intentSignal.intent
		setSheet(null)
		if (intent.type === "workflow") openEngagement(intent.id)
		else if (intent.type === "engagement") { if (Object.hasOwn(state.engagements, intent.id)) openEngagement(intent.id); else showLanding() }
		else if (intent.type === "import") { const pkg = visiblePackage(state, intent.id); if (pkg) importPackage(pkg.id); else showLanding() }
		else if (intent.type === "handoff") receiveHandoff(intent.packageId, intent.discovery, intent.note ?? "")
		else if (intent.type === "create") {
			// A Discovery without a prebuilt design still arrives here: its brief opens the setup.
			if (intent.brief) update(current => ({ ...current, drafts: { ...current.drafts, new: intent.brief!.slice(0, 2000) } }))
			setNav({ creating: true, engagementId: null, reviewing: undefined })
		}
		else if (intent.type === "decision") {
			const target = intent.runId && itemBy(state, intent.runId) ? intent.runId : needsYou(state).find(entry => entry.workId && (intent.id === "audience" ? entry.kind === "human" : entry.kind !== "human"))?.workId
			if (target) openWork(target); else { showLanding(); setFilter("attention") }
		}
		else { showLanding(); setFilter(intent.id === "today" ? "attention" : "all") }
		setFocusRequest(count => count + 1)
	}, [intentSignal])

	// A new view puts focus on its title, unless an open work item or result has taken it.
	useEffect(() => {
		const node = root.current
		if (!node || node.closest("[hidden]")) return
		const title = node.querySelector<HTMLElement>("#aop-work-title, #aop-result-title") ?? node.querySelector<HTMLElement>(".aop-engagement-head h1, .aop-create-head h1, h1.ds-page-title")
		title?.focus({ preventScroll: true })
	}, [nav.engagementId, nav.creating, nav.reviewing, focusRequest])

	useEffect(() => {
		const node = dialog.current
		if (!node) return
		if (sheet && !node.open) { returnFocus.current = document.activeElement as HTMLElement; setSheetShown(sheet); node.showModal() }
		else if (sheet) setSheetShown(sheet)
		else if (!sheet && node.open) { node.close(); if (reduced) setSheetShown(null); if (returnFocus.current?.isConnected) returnFocus.current.focus() }
	}, [sheet, reduced])
	const onDialogKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); event.stopPropagation(); return }
		if (event.key !== "Tab") return
		const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')).filter(element => element.getClientRects().length > 0)
		const first = controls[0], last = controls.at(-1)
		if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
		else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
	}
	const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
		if (event.target !== event.currentTarget) return
		const box = event.currentTarget.getBoundingClientRect()
		if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setSheet(null)
	}

	const route = (next: BriefRoute) => {
		// The brief found a Discovery package, so the proposal is that package's; the brief is kept beside it.
		if (next.kind === "package") importPackage(next.packageId, "discovery", state.drafts.new ?? "")
		else if (next.kind === "assign") {
			assigned.current = { before: new Set(state.work.map(item => item.id)), engagementId: next.engagementId }
			update(current => { const value = assignWork(current, next.engagementId, next.template, next.title); return { ...value, drafts: { ...value.drafts, new: "" } } })
			setToast(`Assigned “${next.title}” to ${state.engagements[next.engagementId].name}. No new agent was created.`)
		} else if (next.kind === "existing") openEngagement(next.engagementId)
	}
	const separate = (workflowId: WorkflowId) => {
		const id = `eng-${crypto.randomUUID()}`
		const brief = state.drafts.new ?? ""
		update(current => { const value = createEngagement(current, id, workflowId, brief); return value === current ? current : { ...value, drafts: { ...value.drafts, new: "" } } })
		openReview(id)
	}
	const activateReview = (id: string) => {
		const target = state.engagements[id]
		update(current => activate(current, id))
		const milestones = target.proposal?.packageId ? SCENARIOS[target.workflowId].packages.find(pkg => pkg.id === target.proposal?.packageId)?.milestones.length ?? 0 : 0
		setToast(target.status === "draft" ? (milestones ? `${target.name} is active. Its team starts ${milestones === 1 ? "the first milestone" : `${milestones} milestones`} now.` : `${target.name} is active. New work starts from now on.`) : `${target.name} v${target.version + 1} is active. The same team starts the new milestones; existing work continues.`)
		openEngagement(id)
	}

	const inbox = needsYou(state)
	const attentionCount = Object.values(state.engagements).filter(entry => inbox.some(item => item.engagementId === entry.id)).length
	const current = nav.workId ? itemBy(state, nav.workId) : undefined
	const result = nav.resultId ? artifactBy(state, nav.resultId) ?? itemBy(state, nav.resultId) : undefined
	const crumb = engagement && !reviewing && !nav.creating ? (nav.view === "work" && current ? current.reference : nav.view === "results" && result ? ("title" in result && "versions" in result ? result.title : (result as { reference: string }).reference) : null) : null

	return (
		<div className="aop-root ds-scope" ref={root}>
			<header className="ds-topbar aop-topbar">
				<div className="ds-topbar-start">
					{engagement || nav.creating
						? <button type="button" className="ds-crumb aop-breadcrumb" onClick={showLanding} aria-label="All engagements" title="All engagements"><ArrowLeft size={14} aria-hidden="true" /><span className="aop-crumb-label">Engagements</span></button>
						: <span className="ds-topbar-title">Agentix</span>}
					{nav.creating ? <><span className="ds-crumb-sep">/</span><span className="ds-crumb-current">Assign work</span></> : null}
					{engagement && !nav.creating ? <>
						<span className="ds-crumb-sep">/</span><Mark seed={engagement.id} size="xs" className="aop-crumb-mark" />
						{crumb || reviewing ? <button type="button" className="ds-crumb aop-crumb-engagement" onClick={() => openEngagement(engagement.id, { view: nav.view })}>{engagement.name}</button> : <span className="ds-crumb-current">{engagement.name}</span>}
						{reviewing ? <><span className="ds-crumb-sep">/</span><span className="ds-crumb-current">Proposal</span></> : null}
						{crumb ? <><span className="ds-crumb-sep">/</span><span className="ds-crumb-current">{crumb}</span></> : null}
					</> : null}
				</div>
				<div className="ds-topbar-end">
					<button type="button" className="aop-demo-button" onClick={() => setSheet({ kind: "demo" })} aria-haspopup="dialog"><Flask size={14} aria-hidden="true" />Controls</button>
				</div>
			</header>
			<main className={`aop-main${engagement && !reviewing && !nav.creating ? " aop-main--operating" : ""}${nav.creating || reviewing ? " aop-main--setup" : ""}${!engagement && !nav.creating ? " ds-page" : ""}`} aria-label="Agentix workspace">
				{storageError ? <Banner tone="warning" icon={<WarningCircle aria-hidden="true" />} role="alert">Browser storage is unavailable. Work remains usable, but changes won't survive a refresh.</Banner> : null}
				<ViewBoundary resetKey={`${nav.engagementId ?? ""}:${nav.view}:${nav.creating ? "new" : ""}:${nav.reviewing ?? ""}`} onRecover={showLanding} action="Back to engagements">
				{nav.creating ? (
					<EngagementStart state={state} brief={state.drafts.new ?? ""} scenario={state.demo.scenario} onBrief={value => update(current => ({ ...current, drafts: { ...current.drafts, new: value.slice(0, 2000) } }))} onScenario={value => update(current => ({ ...current, demo: { ...current.demo, scenario: value } }))} onRoute={route} onSeparate={separate} onImport={packageId => importPackage(packageId)} onOpen={id => openEngagement(id)} onCancel={showLanding} />
				) : reviewing ? (
					<ProposalReview state={state} engagement={reviewing}
						onAnswer={(question, option) => update(current => answerQuestion(current, reviewing.id, question, option))}
						onEdit={patch => update(current => editEngagement(current, reviewing.id, patch))}
						onAction={action => update(current => actOnEngagement(current, reviewing.id, action))}
						onActivate={() => activateReview(reviewing.id)}
						onBack={() => reviewing.status === "draft" ? setNav({ creating: true, engagementId: null, reviewing: undefined }) : openEngagement(reviewing.id)}
						onSetAside={() => { update(current => withdrawProposal(current, reviewing.id)); openEngagement(reviewing.id); setToast("Proposal set aside. Nothing was activated.") }}
						onOpenDiscoveryRecord={onOpenDiscoveryRecord} />
				) : engagement ? (
					<EngagementWorkspace key={engagement.id} state={state} engagementId={engagement.id} update={update} onDetails={section => setSheet({ kind: "details", section })} onReview={() => openReview(engagement.id)} onToast={setToast} />
				) : (
					<>
						<PageHeader titleTabIndex={-1} title="Engagements" description="Agents that own ongoing work. See what they're doing, decide what needs you, and use what they've verified." actions={<DsButton variant="primary" onClick={() => setNav({ creating: true })}><Plus size={16} />Assign work</DsButton>} />
						<NeedsYou state={state} items={inbox} onOpen={openItem} />
						<div className="aop-landing-list">
							<div className="aop-list-tools"><SearchInput label="Search engagements" value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery("")} placeholder="Search engagements, systems or owners…" /><SegmentedTabs label="Engagement filter" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "attention", label: "Needs attention", count: attentionCount }]} /></div>
							<Fleet state={state} query={query} filter={filter} onOpen={id => openEngagement(id)} onReset={() => { setQuery(""); setFilter("all") }} />
							<p className="aop-footnote aop-landing-note">{demoActive() ? "Work advances while Agentix is on screen" : "Work advances while MAXION is open"} and stops when the browser closes.</p>
						</div>
					</>
				)}
				</ViewBoundary>
			</main>
			<dialog className="aop-drawer" ref={dialog} onKeyDown={onDialogKeyDown} onClick={onDialogClick} onCancel={event => { event.preventDefault(); setSheet(null) }} onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === "translate" && !event.currentTarget.open) setSheetShown(null) }} aria-labelledby={sheetTitle}>
				<ViewBoundary resetKey={sheetShown?.kind ?? ""} onRecover={() => setSheet(null)} action="Close this panel">
				{sheetShown?.kind === "details" && engagement ? <DetailsSheet state={state} engagementId={engagement.id} section={sheetShown.section} titleId={sheetTitle} onSection={section => setSheet({ kind: "details", section })} onClose={() => setSheet(null)} onOpenDiscovery={() => { setSheet(null); onOpenDiscovery(engagement.workflowId, { engagementId: engagement.id, name: engagement.name }) }} onOpenDiscoveryRecord={onOpenDiscoveryRecord ? recordId => { setSheet(null); onOpenDiscoveryRecord(recordId) } : undefined} onReconnect={() => update(current => actOnEngagement(current, engagement.id, "reconnect"))} onRestore={() => update(current => actOnEngagement(current, engagement.id, "restore-permission"))} /> : null}
				{sheetShown?.kind === "demo" ? <DemoControls state={state} titleId={sheetTitle} focusId={engagement?.id} onClose={() => setSheet(null)}
					onTick={() => update(tick)} onSkip={() => update(current => { let value = current; for (let i = 0; i < 5; i++) value = tick(value); return value })}
					onWindow={() => update(advanceToWindow)} onSchedule={id => update(current => advanceSchedule(current, id))} onIncoming={id => update(current => addIncoming(current, id))}
					onExpire={id => update(current => actOnEngagement(current, id, "expire"))} onLosePermission={id => update(current => actOnEngagement(current, id, "lose-permission"))} onAckLoss={() => update(current => armFailure(current, "ackLoss"))}
					onReset={() => { setState(initialState()); setSheet(null); setToast("The Agentix demo was reset. Discovery work and earlier demo versions are untouched.") }}
					onRestartCustomerDemo={demoActive() ? start => restartDemo(start) : undefined} /> : null}
				</ViewBoundary>
			</dialog>
			<div className="aop-toast-region" aria-live="polite" role={toast ? "status" : undefined}>
				<AnimatePresence>
					{toast ? <motion.p key={toast} className="aop-toast" initial={reduced ? false : { y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={reduced ? undefined : { opacity: 0, y: 8 }} transition={{ type: "spring", stiffness: 480, damping: 36 }}><CheckCircle size={16} weight="fill" />{toast}</motion.p> : null}
				</AnimatePresence>
			</div>
		</div>
	)
}
