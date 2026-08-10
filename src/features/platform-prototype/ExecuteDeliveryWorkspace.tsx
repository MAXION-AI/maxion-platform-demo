import {
	ArrowLeft,
	ArrowRight,
	ArrowsClockwise,
	Bell,
	CaretRight,
	Check,
	CheckCircle,
	CirclesThree,
	Clock,
	Code,
	FileText,
	FlowArrow,
	GitBranch,
	Globe,
	ListChecks,
	LockKey,
	MagnifyingGlass,
	Paperclip,
	Pause,
	Play,
	RocketLaunch,
	ShareNetwork,
	ShieldCheck,
	Sparkle,
	SpinnerGap,
	Stack,
	TerminalWindow,
	UserPlus,
	Users,
	Warning,
	X,
} from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"

import { MaxionSpiralMark } from "./PortalChrome"
import type {
	ExecuteBlueprint,
	ExecuteLaunchIntent,
	ExecuteWorkspaceMember,
	ExecuteWorkspaceSpec,
} from "./model"

export type ExecuteDeliveryView = "topology" | "changes" | "tests" | "environments" | "plan" | "audit"
export type ExecuteDeliveryCommand =
	| { type: "workspace"; taskId: string }
	| { type: "view"; view: "topology" | "changes" | "tests" | "terminal" | "deploys" | "audit" }
	| { type: "run" }
	| { type: "interrupt" }
	| { type: "deploy" }
	| { type: "export-audit" }
	| { type: "focus-steer" }

type WorkspaceAgentState = "ready" | "working" | "testing" | "verified" | "paused" | "blocked"
type WorkspaceStage = "development" | "staging" | "production"
type E2EState = "waiting" | "ready" | "running" | "failed" | "repairing" | "ready-rerun" | "passed"
type ReleaseState = "locked" | "ready" | "deploying" | "released"

export type ExecuteWorkspaceDeliveryState = {
	agentState: WorkspaceAgentState
	stage: WorkspaceStage
	step: number
	artifact: string
	review: "open" | "approved"
	receipts: string[]
}

export type ExecuteDeliveryProgress = {
	runState: "idle" | "running" | "verified"
	steering: Record<string, string[]>
	deployRequested: boolean
	deployRequestedAt: string | null
	deployRequestedMs: number | null
	deployArtifact: string
	deployApproved: boolean
	auditExported: boolean
	workspaces?: Record<string, ExecuteWorkspaceDeliveryState>
	e2eState?: E2EState
	releaseState?: ReleaseState
	candidate?: string
	deviation?: "draft" | "proposed" | null
}

type Props = {
	onBack: () => void
	onPlatform: () => void
	onCommand: () => void
	onOpenApprovals: () => void
	engagement: ExecuteLaunchIntent
	blueprint: ExecuteBlueprint
	planSnapshot: string
	progress?: ExecuteDeliveryProgress
	onProgress: (next: ExecuteDeliveryProgress) => void
	onVerified: () => void
	registerCommands: (handler: ((command: ExecuteDeliveryCommand) => void) | null) => void
}

const WORKSPACE_ARTIFACTS: Record<string, string> = {
	orchestrator: "DLV-PL24.7",
	servicenow: "US-SNOW-101.8",
	mulesoft: "mule-journal-api:2.4.1",
	workday: "WDAY-JRN-301.5",
	verification: "RC-07",
}

const RELEASE_ORDER = ["mulesoft", "workday", "servicenow"] as const
const PLATFORM_WORKSPACES = ["servicenow", "mulesoft", "workday"] as const

const stateLabel: Record<WorkspaceAgentState, string> = {
	ready: "Ready",
	working: "Implementing",
	testing: "Verifying",
	verified: "Verified",
	paused: "Paused safely",
	blocked: "Needs evidence",
}

function reduceMotion() {
	return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
}

function nowLabel() {
	return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date())
}

function defaultDelivery(workspaces: readonly ExecuteWorkspaceSpec[], restored = false) {
	return Object.fromEntries(workspaces.map((workspace) => [workspace.id, {
		agentState: restored ? "verified" : workspace.kind === "orchestrator" ? "working" : "ready",
		stage: "development",
		step: restored ? 4 : workspace.kind === "orchestrator" ? 1 : 0,
		artifact: WORKSPACE_ARTIFACTS[workspace.id] ?? `artifact-${workspace.id}`,
		review: restored ? "approved" : "open",
		receipts: restored ? [`${WORKSPACE_ARTIFACTS[workspace.id] ?? workspace.id} verified against Plan`] : [],
	} satisfies ExecuteWorkspaceDeliveryState]))
}

function participantTone(member: ExecuteWorkspaceMember) {
	return member.presence === "online" ? "is-online" : member.presence === "away" ? "is-away" : ""
}

function workspaceIcon(workspace: ExecuteWorkspaceSpec) {
	if (workspace.kind === "orchestrator") return <MaxionSpiralMark />
	if (workspace.kind === "verification") return <ShieldCheck />
	return <Code />
}

function systemMonogram(workspace: ExecuteWorkspaceSpec) {
	if (workspace.id === "servicenow") return "SN"
	if (workspace.id === "mulesoft") return "MU"
	if (workspace.id === "workday") return "WD"
	if (workspace.id === "verification") return "E2E"
	return "MAX"
}

function normalizeView(view: "topology" | "changes" | "tests" | "terminal" | "deploys" | "audit"): ExecuteDeliveryView {
	if (view === "terminal") return "changes"
	if (view === "deploys") return "environments"
	return view
}

export function ExecuteDeliveryWorkspace({
	onBack,
	onPlatform,
	onCommand,
	onOpenApprovals,
	engagement,
	blueprint,
	planSnapshot,
	progress,
	onProgress,
	onVerified,
	registerCommands,
}: Props) {
	const workspaces = blueprint.workspaces
	const [selectedId, setSelectedId] = useState(workspaces.find((item) => item.kind === "orchestrator")?.id ?? workspaces[0].id)
	const [view, setView] = useState<ExecuteDeliveryView>("topology")
	const [delivery, setDelivery] = useState<Record<string, ExecuteWorkspaceDeliveryState>>(() => progress?.workspaces ?? defaultDelivery(workspaces, progress?.runState === "verified"))
	const [messages, setMessages] = useState<Record<string, string[]>>(progress?.steering ?? {})
	const [drafts, setDrafts] = useState<Record<string, string>>({})
	const [pendingReply, setPendingReply] = useState<string | null>(null)
	const [shareOpen, setShareOpen] = useState(false)
	const [shareScope, setShareScope] = useState("engagement")
	const [inviteEmail, setInviteEmail] = useState("")
	const [inviteSent, setInviteSent] = useState(false)
	const [previewPerson, setPreviewPerson] = useState("root-admin")
	const [promotionTarget, setPromotionTarget] = useState<string | null>(null)
	const [e2eState, setE2EState] = useState<E2EState>(progress?.e2eState ?? "waiting")
	const [releaseState, setReleaseState] = useState<ReleaseState>(progress?.releaseState ?? "locked")
	const [releaseStep, setReleaseStep] = useState(0)
	const [deviation, setDeviation] = useState<"draft" | "proposed" | null>(progress?.deviation ?? null)
	const [auditExported, setAuditExported] = useState(progress?.auditExported ?? false)
	const [deployRequested, setDeployRequested] = useState(progress?.deployRequested ?? false)
	const [deployRequestedAt, setDeployRequestedAt] = useState(progress?.deployRequestedAt ?? null)
	const [selectedFile, setSelectedFile] = useState(0)
	const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({})
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const threadRef = useRef<HTMLDivElement>(null)
	const timers = useRef<number[]>([])
	const verifiedReported = useRef(progress?.runState === "verified")
	const autoStarted = useRef(false)

	const workspace = workspaces.find((item) => item.id === selectedId) ?? workspaces[0]
	const workspaceState = delivery[workspace.id] ?? defaultDelivery([workspace])[workspace.id]
	const workspaceMessages = messages[workspace.id] ?? []
	const draft = drafts[workspace.id] ?? ""
	const traceExpanded = expandedTraces[workspace.id] ?? true
	const allMembers = useMemo(() => {
		const map = new Map<string, ExecuteWorkspaceMember>()
		for (const item of workspaces) for (const member of item.members ?? []) map.set(member.id, member)
		return [...map.values()]
	}, [workspaces])
	const implementationWorkspaceIds = useMemo(
		() => workspaces.filter((item) => item.kind !== "orchestrator" && item.kind !== "verification").map((item) => item.id),
		[workspaces],
	)
	const implementationTotal = implementationWorkspaceIds.length
	const platformVerified = implementationWorkspaceIds.filter((id) => delivery[id]?.agentState === "verified").length
	const platformStaged = implementationWorkspaceIds.filter((id) => delivery[id]?.stage === "staging" || delivery[id]?.stage === "production").length
	const anyWorking = Object.values(delivery).some((item) => item.agentState === "working" || item.agentState === "testing")
	const overallRunState: ExecuteDeliveryProgress["runState"] = implementationTotal > 0 && platformVerified === implementationTotal ? "verified" : anyWorking ? "running" : "idle"
	const canAssemble = platformStaged === implementationTotal
	const deployApproved = progress?.deployApproved ?? false
	const candidate = "RC-07"

	const patchWorkspace = (id: string, patch: Partial<ExecuteWorkspaceDeliveryState>) => {
		setDelivery((current) => ({ ...current, [id]: { ...current[id], ...patch } }))
	}

	const schedule = (callback: () => void, delay: number) => {
		const timer = window.setTimeout(callback, reduceMotion() ? Math.min(delay, 80) : delay)
		timers.current.push(timer)
	}

	const scrollToLatest = () => {
		window.requestAnimationFrame(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: reduceMotion() ? "auto" : "smooth" }))
	}

	const startWorkspace = (id: string) => {
		const target = workspaces.find((item) => item.id === id)
		if (!target || target.kind === "verification") return
		patchWorkspace(id, { agentState: "working", step: 1, review: "open" })
		schedule(() => patchWorkspace(id, { step: 2 }), 520)
		schedule(() => patchWorkspace(id, { agentState: "testing", step: 3 }), 1150)
		schedule(() => patchWorkspace(id, {
			agentState: "verified",
			step: 4,
			review: "approved",
			receipts: [`${WORKSPACE_ARTIFACTS[id] ?? id} built`, `${target.profile.tests} tests passed`, "Plan contract unchanged"],
		}), 2050)
	}

	const runAll = () => {
		if (delivery.orchestrator) patchWorkspace("orchestrator", { agentState: "working", step: 2 })
		implementationWorkspaceIds.forEach((id, index) => schedule(() => startWorkspace(id), index * 260))
		if (delivery.orchestrator) schedule(() => patchWorkspace("orchestrator", { agentState: "verified", step: 4, review: "approved", receipts: ["Five authority scopes bound", "Dependency graph verified", "Platform gates monitored"] }), 2750)
	}

	const interruptWorkspace = () => {
		if (workspaceState.agentState !== "working" && workspaceState.agentState !== "testing") return
		patchWorkspace(workspace.id, { agentState: "paused" })
	}

	const applyPromotion = () => {
		if (!promotionTarget) return
		const target = workspaces.find((item) => item.id === promotionTarget)
		patchWorkspace(promotionTarget, {
			stage: "staging",
			receipts: [...(delivery[promotionTarget]?.receipts ?? []), `Promoted ${delivery[promotionTarget]?.artifact} to ${target?.environment?.staging ?? "staging"} by Root Admin`],
		})
		setPromotionTarget(null)
		setView("environments")
	}

	const assembleCandidate = () => {
		if (!canAssemble) return
		setE2EState("ready")
		patchWorkspace("verification", { agentState: "ready", step: 1, artifact: candidate, receipts: ["Candidate manifest RC-07 sealed", "Exact staging artifacts pinned"] })
		setSelectedId("verification")
		setView("environments")
	}

	const runE2E = () => {
		if (e2eState !== "ready" && e2eState !== "ready-rerun") return
		const rerun = e2eState === "ready-rerun"
		setE2EState("running")
		patchWorkspace("verification", { agentState: "testing", step: rerun ? 3 : 2 })
		schedule(() => {
			if (rerun) {
				setE2EState("passed")
				setReleaseState("ready")
				patchWorkspace("verification", { agentState: "verified", step: 4, review: "approved", receipts: ["RC-07 manifest sealed", "41 scenarios passed", "Evidence EV-RC07-91 retained"] })
			} else {
				setE2EState("failed")
				patchWorkspace("verification", { agentState: "blocked", step: 2, receipts: ["40 scenarios passed", "Duplicate replay failed", "Defect routed to MuleSoft"] })
				patchWorkspace("mulesoft", { agentState: "blocked", receipts: [...(delivery.mulesoft?.receipts ?? []), "INT-401 duplicate replay defect assigned"] })
			}
		}, 1850)
	}

	const repairMuleSoft = () => {
		setE2EState("repairing")
		patchWorkspace("mulesoft", { agentState: "working", step: 2 })
		schedule(() => patchWorkspace("mulesoft", { agentState: "testing", step: 3 }), 700)
		schedule(() => {
			patchWorkspace("mulesoft", {
				agentState: "verified",
				step: 4,
				stage: "staging",
				artifact: "mule-journal-api:2.4.2",
				receipts: ["Duplicate replay guard repaired", "52 MUnit tests passed", "2.4.2 promoted to staging"],
			})
			setE2EState("ready-rerun")
			patchWorkspace("verification", { agentState: "ready", step: 2, receipts: ["RC-07.1 manifest resealed", "MuleSoft artifact advanced to 2.4.2", "Failure reproduction retained"] })
		}, 1650)
	}

	const requestRelease = () => {
		if (e2eState !== "passed" || deployRequested) return
		setDeployRequested(true)
		setDeployRequestedAt(nowLabel())
		// Persist the exact request before the approval surface unmounts this workspace.
		schedule(onOpenApprovals, 80)
	}

	const runRelease = () => {
		if (!deployApproved || releaseState !== "ready") return
		setReleaseState("deploying")
		setReleaseStep(0)
		RELEASE_ORDER.forEach((id, index) => schedule(() => {
			setReleaseStep(index + 1)
			patchWorkspace(id, { stage: "production", receipts: [...(delivery[id]?.receipts ?? []), `${delivery[id]?.artifact} deployed to production with rollback retained`] })
		}, 650 + index * 760))
		schedule(() => setReleaseState("released"), 3050)
	}

	const openWorkspace = (id: string) => {
		if (!workspaces.some((item) => item.id === id)) return
		setSelectedId(id)
		setSelectedFile(0)
		setView(id === "orchestrator" ? "topology" : id === "verification" ? "environments" : "changes")
		window.requestAnimationFrame(() => threadRef.current?.scrollTo({ top: 0, behavior: "auto" }))
	}

	const send = () => {
		const message = draft.trim()
		if (!message) return
		setMessages((current) => ({ ...current, [workspace.id]: [...(current[workspace.id] ?? []), message] }))
		setDrafts((current) => ({ ...current, [workspace.id]: "" }))
		setPendingReply(workspace.id)
		if (/(change|replace|extend).{0,60}\b(contract|schema|endpoint|architecture)\b|additional system|new integration|bypass/i.test(message)) {
			setDeviation("draft")
			implementationWorkspaceIds.forEach((id) => patchWorkspace(id, { agentState: delivery[id]?.agentState === "working" ? "paused" : delivery[id]?.agentState }))
		}
		if (/pause (mule|mulesoft)/i.test(message)) patchWorkspace("mulesoft", { agentState: "paused" })
		if (/resume (mule|mulesoft)/i.test(message)) startWorkspace("mulesoft")
		schedule(() => { setPendingReply(null); scrollToLatest() }, 680)
		scrollToLatest()
	}

	const replyFor = (message: string) => {
		if (/(change|replace|extend).{0,60}\b(contract|schema|endpoint|architecture)\b|additional system|new integration|bypass/i.test(message)) return "That changes the approved technical contract. I’ve contained the impact, left unaffected work running, and prepared Plan change proposal PLD-14 instead of silently diverging."
		if (workspace.kind === "orchestrator") {
			if (/status|where|progress/i.test(message)) return `${platformVerified} of ${implementationTotal} platform workspaces are verified and ${platformStaged} are staged. ${e2eState === "failed" ? "INT-401 classified one MuleSoft duplicate-replay defect; no other workspace is blocked." : "No unclassified delivery risk is open."}`
			if (/route|retry|duplicate|mule/i.test(message)) return "I routed the duplicate-replay concern to MuleSoft with the failing trace and reproduction seed. ServiceNow and Workday remain independent and can continue."
			return "I converted that into attributed workspace directions, checked the Plan boundary, and updated the candidate gate. I’ll return only if authority or a material design decision is required."
		}
		return `I applied that direction inside ${workspace.packages?.join(" + ") ?? workspace.title}, added a focused assertion, and kept every published contract unchanged.`
	}

	useEffect(() => () => {
		timers.current.forEach((timer) => window.clearTimeout(timer))
		timers.current = []
		// React development mode replays effects once. Reset the one-shot guard so an
		// autonomous launch is re-scheduled after that safety replay instead of idling.
		autoStarted.current = false
	}, [])

	useEffect(() => {
		if (engagement.autoStart && !autoStarted.current) { autoStarted.current = true; runAll() }
		// The initial launch intent is immutable for this mounted engagement.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		if (implementationTotal > 0 && platformVerified === implementationTotal && !verifiedReported.current) {
			verifiedReported.current = true
			onVerified()
		}
	}, [implementationTotal, onVerified, platformVerified])

	useEffect(() => {
		onProgress({
			runState: overallRunState,
			steering: messages,
			deployRequested,
			deployRequestedAt,
			deployRequestedMs: deployRequested ? Date.now() : null,
			deployArtifact: candidate,
			deployApproved,
			auditExported,
			workspaces: delivery,
			e2eState,
			releaseState,
			candidate,
			deviation,
		})
		// Parent state is a persistence seam; only user-visible delivery state reports upward.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [delivery, messages, deployRequested, deployRequestedAt, deployApproved, auditExported, e2eState, releaseState, deviation])

	useEffect(() => {
		registerCommands((command) => {
			if (command.type === "workspace") { openWorkspace(command.taskId); return }
			if (command.type === "view") { setView(normalizeView(command.view)); return }
			if (command.type === "run") { workspace.kind === "orchestrator" ? runAll() : startWorkspace(workspace.id); return }
			if (command.type === "interrupt") { interruptWorkspace(); return }
			if (command.type === "deploy") { setView("environments"); if (e2eState === "passed") requestRelease(); return }
			if (command.type === "export-audit") { setView("audit"); setAuditExported(true); return }
			composerRef.current?.focus()
		})
		return () => registerCommands(null)
	})

	const previewRole = (personId: string) => {
		setPreviewPerson(personId)
		const member = allMembers.find((item) => item.id === personId)
		if (!member || member.id === "root-admin") { openWorkspace("orchestrator"); return }
		const assigned = workspaces.find((item) => item.members?.some((itemMember) => itemMember.id === member.id && itemMember.scope !== "Staging and production"))
		if (assigned) openWorkspace(assigned.id)
		if (member.role === "Release approver") setView("environments")
	}

	const environmentSteps = [
		{ id: "development", label: "Development", detail: `${platformVerified}/${implementationTotal} verified`, active: true, complete: implementationTotal > 0 && platformVerified === implementationTotal },
		{ id: "staging", label: "Staging", detail: `${platformStaged}/${implementationTotal} promoted`, active: platformStaged > 0, complete: implementationTotal > 0 && platformStaged === implementationTotal },
		{ id: "e2e", label: "E2E", detail: e2eState === "passed" ? `${candidate} passed` : e2eState === "failed" ? "1 routed defect" : e2eState === "waiting" ? "Waiting" : candidate, active: e2eState !== "waiting", complete: e2eState === "passed" },
		{ id: "production", label: "Production", detail: releaseState === "released" ? "Verified" : deployApproved ? "Approved" : "Approval gated", active: releaseState !== "locked", complete: releaseState === "released" },
	]

	const inspectorViews: Array<{ id: ExecuteDeliveryView; label: string; icon: typeof CirclesThree }> = workspace.kind === "orchestrator"
		? [{ id: "topology", label: "Topology", icon: CirclesThree }, { id: "environments", label: "Environments", icon: RocketLaunch }, { id: "plan", label: "Plan context", icon: FlowArrow }, { id: "audit", label: "Audit", icon: ShieldCheck }]
		: [{ id: "changes", label: "Changes", icon: FileText }, { id: "tests", label: "Tests", icon: ListChecks }, { id: "environments", label: "Environments", icon: RocketLaunch }, { id: "plan", label: "Plan context", icon: FlowArrow }, { id: "audit", label: "Audit", icon: ShieldCheck }]

	const selectedCodeFile = workspace.profile.files[Math.min(selectedFile, Math.max(0, workspace.profile.files.length - 1))]
	const promotionWorkspace = workspaces.find((item) => item.id === promotionTarget)

	return (
		<div className="aex-app exd-app">
			<aside className="exd-rail" aria-label="Execute workspaces">
				<header>
					<button type="button" className="exd-brand" onClick={onPlatform} aria-label="Return to MAXION"><MaxionSpiralMark /><span><strong>Execute</strong><small>Delivery OS</small></span></button>
					<button type="button" className="exd-back" onClick={onBack}><ArrowLeft />Engagements</button>
				</header>
				<div className="exd-engagement-summary">
					<span><i className={anyWorking ? "is-live" : ""} />Active engagement</span>
					<strong>{engagement.title}</strong>
					<small>Plan {planSnapshot} · {workspaces.length} workspaces</small>
				</div>
				<nav aria-label="Plan-compiled delivery workspaces">
					<span className="exd-rail-label">Delivery organization</span>
					{workspaces.map((item) => {
						const itemState = delivery[item.id]
						return <button type="button" key={item.id} className={item.id === workspace.id ? "is-selected" : ""} aria-current={item.id === workspace.id ? "page" : undefined} onClick={() => openWorkspace(item.id)}>
							<span className={`exd-workspace-icon is-${item.kind ?? "system"}`}>{workspaceIcon(item)}</span>
							<span><strong>{item.title}</strong><small>{item.packages?.join(" + ") ?? "Generated package"}</small></span>
							<span className="exd-workspace-state"><i className={`is-${itemState?.agentState ?? "ready"}`} />{item.unread ? <b>{item.unread}</b> : null}</span>
						</button>
					})}
				</nav>
				<footer>
					<div className="exd-avatar-stack" aria-label={`${allMembers.length} engagement members`}>{allMembers.slice(0, 4).map((member) => <span key={member.id} className={participantTone(member)} title={`${member.name} · ${member.role}`}>{member.initials}</span>)}<b>+{Math.max(0, allMembers.length - 4)}</b></div>
					<button type="button" onClick={() => setShareOpen(true)}><ShareNetwork />Share</button>
				</footer>
			</aside>

			<section className="exd-stage">
				<header className="exd-header">
					<div className="exd-header-title"><button type="button" onClick={onBack} aria-label="Back to Execute engagements"><ArrowLeft /></button><span><strong>{engagement.title}</strong><small>{blueprint.key === "erp" ? "ServiceNow → MuleSoft → Workday Financials" : blueprint.scope}</small></span></div>
					<div className="exd-environment-rail" role="region" aria-label="Delivery environment progression">{environmentSteps.map((step, index) => <Fragment key={step.id}><div className={`${step.active ? "is-active" : ""}${step.complete ? " is-complete" : ""}`}><span>{step.complete ? <Check /> : index + 1}</span><p><strong>{step.label}</strong><small>{step.detail}</small></p></div>{index < environmentSteps.length - 1 ? <i /> : null}</Fragment>)}</div>
					<div className="exd-header-actions">
						<label className="exd-role-preview"><span className="sr-only">Preview role experience</span><Users /><select aria-label="Preview role experience" value={previewPerson} onChange={(event) => previewRole(event.target.value)}>{allMembers.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}</select></label>
						<button type="button" aria-label="Search Execute commands" onClick={onCommand}><MagnifyingGlass /><kbd>⌘K</kbd></button>
						<button type="button" aria-label="Open Execute decisions" onClick={onOpenApprovals}><Bell />{deployRequested && !deployApproved ? <i /> : null}</button>
						<button type="button" className="exd-share" onClick={() => setShareOpen(true)}><ShareNetwork />Share</button>
					</div>
				</header>

				<div className="exd-body">
					<main className="exd-thread">
						<div className="exd-thread-scroll" ref={threadRef}>
							<header className="exd-workspace-title">
								<div className={`exd-system-mark is-${workspace.kind ?? "system"}`}>{workspace.kind === "orchestrator" ? <MaxionSpiralMark /> : systemMonogram(workspace)}</div>
								<div><span>{workspace.system ?? workspace.title} · {workspace.team ?? "Delivery team"}</span><h1>{workspace.title}</h1><p>{workspace.detail}</p><div className="exd-package-row">{workspace.packages?.map((item) => <code key={item}>{item}</code>)}<span><GitBranch />{workspace.profile.branch}</span></div></div>
								<div className="exd-workspace-actions">
									<div className="exd-avatar-stack">{(workspace.members ?? []).map((member) => <span key={member.id} className={participantTone(member)} title={`${member.name} · ${member.role}`}>{member.initials}</span>)}</div>
									{workspaceState.agentState === "working" || workspaceState.agentState === "testing" ? <button type="button" onClick={interruptWorkspace}><Pause />Pause</button> : null}
									{workspace.kind === "orchestrator" ? <button type="button" className="exd-primary" disabled={implementationTotal > 0 && platformVerified === implementationTotal && !anyWorking} onClick={runAll}>{anyWorking ? <><SpinnerGap className="mxp-spin" />Coordinating</> : implementationTotal > 0 && platformVerified === implementationTotal ? <><Check />Workspaces verified</> : <><Play weight="fill" />Start implementation</>}</button> : (workspace.kind ?? "system") === "system" ? <button type="button" className="exd-primary" disabled={workspaceState.agentState === "working" || workspaceState.agentState === "testing" || workspaceState.agentState === "verified"} onClick={() => startWorkspace(workspace.id)}>{workspaceState.agentState === "verified" ? <><Check />Verified</> : <><Play weight="fill" />{workspaceState.agentState === "paused" ? "Resume agent" : "Run workspace"}</>}</button> : null}
								</div>
							</header>

							<button type="button" className="exd-plan-strip" onClick={() => setView("plan")}><FlowArrow /><span><strong>Bound to approved Plan snapshot {planSnapshot}</strong><small>{workspace.packages?.join(" + ") ?? blueprint.scope} · architecture and contracts are read-only here</small></span><CaretRight /></button>

							<section className="exd-autonomy" aria-label="Autonomous workspace status">
								<div className="is-now"><span>Now</span><strong>{workspaceState.agentState === "verified" ? "Monitoring for drift" : workspaceState.agentState === "blocked" ? "Containing a classified defect" : workspaceState.agentState === "paused" ? "Holding state safely" : workspace.kind === "orchestrator" ? "Coordinating five delivery boundaries" : stateLabel[workspaceState.agentState]}</strong><small>{workspaceState.agentState === "verified" ? "No contract divergence detected" : workspace.profile.steps[Math.min(workspaceState.step, 3)]}</small></div>
								<div><span>Handled</span><strong>{workspaceState.receipts.length || (workspace.kind === "orchestrator" ? 7 : 3)} autonomous actions</strong><small>Evidence and attribution retained</small></div>
								<div className={deviation || (e2eState === "failed" && workspace.id === "orchestrator") ? "is-attention" : ""}><span>Needs you</span><strong>{deviation ? "Plan boundary changed" : e2eState === "failed" && workspace.id === "orchestrator" ? "No decision—repair routed" : deployRequested && !deployApproved ? "Release authority" : "Nothing right now"}</strong><small>{deviation ? "Review bounded proposal PLD-14" : "MAX continues inside approved authority"}</small></div>
								<div><span>Next</span><strong>{workspaceState.agentState === "verified" && workspaceState.stage === "development" && (workspace.kind ?? "system") === "system" ? "Promote exact artifact" : (workspace.kind ?? "system") === "system" && workspaceState.stage === "staging" ? "Await pinned E2E candidate" : workspace.kind === "orchestrator" && platformVerified === implementationTotal ? e2eState === "passed" ? "Release exact candidate" : "Promote platform artifacts" : workspace.kind === "verification" ? e2eState === "passed" ? "Prepare production release" : "Complete INT-401" : "Keep implementation moving"}</strong><small>{workspaceState.artifact}</small></div>
							</section>

							<article className="exd-message is-human"><span>RA</span><div><header><strong>Root Admin</strong><time>Engagement start</time></header><p>{workspace.profile.seed}</p></div></article>
							<article className="exd-message is-max"><span><MaxionSpiralMark /></span><div><header><strong>MAX · {workspace.title}</strong><time>Now</time></header><p>{workspace.profile.agentIntro}</p></div></article>

							<section className={`exd-trace is-${workspaceState.agentState}`} aria-live="polite">
								<header><span>{workspaceState.agentState === "working" || workspaceState.agentState === "testing" ? <SpinnerGap className="mxp-spin" /> : workspaceState.agentState === "blocked" ? <Warning /> : <CheckCircle />}<strong>{workspaceState.agentState === "verified" ? "Workspace gate passed" : workspaceState.agentState === "blocked" ? "Agent stopped the affected path" : workspaceState.agentState === "paused" ? "Workspace paused safely" : "Autonomous implementation trace"}</strong></span><span className="exd-trace-controls"><small>{workspaceState.artifact}</small><button type="button" aria-expanded={traceExpanded} onClick={() => setExpandedTraces((current) => ({ ...current, [workspace.id]: !traceExpanded }))}>{traceExpanded ? "Collapse" : "Expand"}<CaretRight /></button></span></header>
								{traceExpanded ? <>{workspace.profile.steps.map((step, index) => { const complete = workspaceState.step > index; const current = workspaceState.step === index && (workspaceState.agentState === "working" || workspaceState.agentState === "testing"); return <div className={`exd-trace-step${complete ? " is-complete" : current ? " is-current" : ""}`} key={step}>{complete ? <Check /> : current ? <SpinnerGap className="mxp-spin" /> : <span>{index + 1}</span>}<div><strong>{step}</strong><small>{complete ? index === 1 ? `${workspace.profile.files.length} implementation artifacts changed` : index === 2 ? `${workspace.profile.tests} tests passed` : "Completed autonomously" : current ? "MAX is handling this now" : "Queued by dependency order"}</small></div><time>{complete ? `${(0.8 + index * 0.7).toFixed(1)}s` : "—"}</time></div>})}{workspaceState.agentState !== "ready" ? <div className="exd-tool-line"><TerminalWindow /><code>{workspace.profile.command}</code><span>{workspaceState.agentState === "verified" ? <><Check />{workspace.profile.tests} passed</> : workspaceState.agentState === "blocked" ? "Failure isolated" : "Running in scoped environment"}</span></div> : null}</> : null}
							</section>

							{e2eState === "failed" && (workspace.id === "orchestrator" || workspace.id === "verification") ? <motion.article className="exd-defect" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><span><Warning weight="fill" /></span><div><small>CLASSIFIED AND ROUTED · INT-401 / 06</small><h2>Duplicate replay produced a second Workday call</h2><p>MAX isolated the defect to MuleSoft idempotency-policy.xml. ServiceNow and Workday remain verified; no candidate effect left staging.</p><dl><div><dt>Owner</dt><dd>Mateo Ruiz · MuleSoft</dd></div><div><dt>Trace</dt><dd>TRC-91A7 · reproduction attached</dd></div><div><dt>Impact</dt><dd>RC-07 held; unrelated work continues</dd></div></dl><button type="button" onClick={() => openWorkspace("mulesoft")}>Open MuleSoft workspace<ArrowRight /></button></div></motion.article> : null}

							{workspace.id === "mulesoft" && (e2eState === "failed" || e2eState === "repairing") ? <article className="exd-repair"><span><ArrowsClockwise className={e2eState === "repairing" ? "mxp-spin" : ""} /></span><div><small>ROUTED BY ORCHESTRATOR · TRC-91A7</small><strong>{e2eState === "repairing" ? "MAX is repairing and re-verifying the replay boundary" : "Reproduction is ready inside this workspace"}</strong><p>The change is implementation-local. It does not alter the RAML, Workday schema, or Plan architecture.</p></div><button type="button" disabled={e2eState === "repairing"} onClick={repairMuleSoft}>{e2eState === "repairing" ? "Repairing…" : "Repair & verify"}</button></article> : null}

							{deviation ? <article className="exd-deviation"><span><FlowArrow /></span><div><small>PLAN DEVIATION · MATERIAL CONTRACT CHANGE</small><strong>{deviation === "proposed" ? "PLD-14 sent to Plan" : "MAX contained the impact before implementation diverged"}</strong><p>Original contract, new evidence, affected packages, and safely continuable work are packaged for the architects and named approvers.</p><div><code>SNOW-101</code><code>MULE-201</code><code>MULE-202</code><code>WDAY-301</code></div></div><button type="button" disabled={deviation === "proposed"} onClick={() => setDeviation("proposed")}>{deviation === "proposed" ? "Proposal created" : "Create Plan proposal"}</button></article> : null}

							{workspaceMessages.map((message, index) => <Fragment key={`${workspace.id}-message-${index}`}><article className="exd-message is-human"><span>RA</span><div><header><strong>Root Admin</strong><time>Now</time></header><p>{message}</p></div></article><article className="exd-message is-max"><span><MaxionSpiralMark /></span><div><header><strong>MAX · {workspace.title}</strong><time>Now</time></header><p>{pendingReply === workspace.id && index === workspaceMessages.length - 1 ? <><SpinnerGap className="mxp-spin" /> Evaluating authority, dependencies, and current evidence…</> : replyFor(message)}</p></div></article></Fragment>)}

							{workspaceState.agentState === "verified" ? <article className="exd-result"><CheckCircle weight="fill" /><div><strong>{workspace.profile.result}</strong><p>{workspace.id === "mulesoft" && workspaceState.artifact.endsWith("2.4.2") ? `52 tests passed · ${workspaceState.artifact} · duplicate replay repaired` : workspace.profile.resultMeta}</p><span>{workspaceState.receipts.map((receipt) => <small key={receipt}><Check />{receipt}</small>)}</span></div><button type="button" onClick={() => setView("tests")}>Inspect evidence<ArrowRight /></button></article> : null}
						</div>

						<form className="exd-composer" onSubmit={(event) => { event.preventDefault(); send() }}>
							<div className="exd-composer-scope"><span className={`exd-workspace-icon is-${workspace.kind ?? "system"}`}>{workspaceIcon(workspace)}</span><p><small>Steering</small><strong>{workspace.title}</strong></p><span><LockKey />{workspace.packages?.join(" + ") ?? "Approved scope"}</span></div>
							<textarea ref={composerRef} aria-label={`Steer ${workspace.title} agent`} value={draft} onChange={(event) => setDrafts((current) => ({ ...current, [workspace.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send() } }} rows={1} placeholder={workspace.kind === "orchestrator" ? "Ask for delivery status, route a concern, pause a workspace, or propose a change…" : "Steer this workspace agent or ask why it changed something…"} />
							<footer><button type="button" aria-label="Attach implementation context"><Paperclip /></button><span><ShieldCheck />Questions answer immediately · mutations preview impact</span><button type="submit" aria-label="Send direction" disabled={!draft.trim()}><ArrowRight /></button></footer>
						</form>
					</main>

					<aside className="exd-inspector" aria-label={`${workspace.title} inspector`}>
						<nav aria-label="Workspace evidence views">{inspectorViews.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} aria-label={item.label} aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}><Icon /><span>{item.label}</span>{item.id === "environments" && workspaceState.stage !== "development" ? <b>{workspaceState.stage === "production" ? "P" : "S"}</b> : null}</button> })}</nav>
						<AnimatePresence mode="wait" initial={false}>
							{view === "topology" ? <motion.section key="topology" className="exd-panel" tabIndex={0} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><header><small>LIVE DELIVERY GRAPH</small><h2>Five boundaries. One outcome.</h2><p>Select a workspace to converse with its agent, inspect evidence, or steer the work.</p></header><div className="exd-topology"><button type="button" className="is-source" onClick={() => openWorkspace("servicenow")}><span>SN</span><div><strong>ServiceNow</strong><small>{stateLabel[delivery.servicenow?.agentState ?? "ready"]} · {delivery.servicenow?.artifact}</small></div></button><i><ArrowRight /></i><button type="button" className="is-core" onClick={() => openWorkspace("mulesoft")}><span>MU</span><div><strong>MuleSoft</strong><small>{stateLabel[delivery.mulesoft?.agentState ?? "ready"]} · {delivery.mulesoft?.artifact}</small></div></button><i><ArrowRight /></i><button type="button" onClick={() => openWorkspace("workday")}><span>WD</span><div><strong>Workday</strong><small>{stateLabel[delivery.workday?.agentState ?? "ready"]} · {delivery.workday?.artifact}</small></div></button><button type="button" className="is-orchestrator" onClick={() => openWorkspace("orchestrator")}><MaxionSpiralMark /><div><strong>MAX Orchestrator</strong><small>Coordinates authority, evidence, and release</small></div></button><i className="is-down"><ArrowRight /></i><button type="button" className="is-verification" onClick={() => openWorkspace("verification")}><ShieldCheck /><div><strong>Integration verification</strong><small>{e2eState === "waiting" ? "Waiting on staged artifacts" : `${candidate} · ${e2eState}`}</small></div></button></div><div className="exd-panel-note"><ShieldCheck /><span><strong>Contract-safe orchestration</strong><small>The Orchestrator can coordinate every workspace, but cannot silently change their Plan contracts or production authority.</small></span></div></motion.section> : null}

							{view === "changes" ? <motion.section key="changes" className="exd-panel" tabIndex={0} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><header><small>{workspace.packages?.join(" + ")} · IMPLEMENTATION</small><h2>Changed artifacts</h2><p>{workspace.profile.files.length} files · exact diff retained on {workspace.profile.branch}</p></header><div className="exd-file-list">{workspace.profile.files.map((file, index) => <button type="button" key={file.name} className={selectedFile === index ? "is-selected" : ""} onClick={() => setSelectedFile(index)}><FileText /><span><strong>{file.name}</strong><small>{file.path}</small></span><b>+{file.added}</b></button>)}</div>{selectedCodeFile ? <pre className="exd-diff"><code><span>{selectedCodeFile.path}/{selectedCodeFile.name}</span>{"\n"}{selectedCodeFile.diff.map((line) => line.startsWith("+") ? <b key={line}>{line}{"\n"}</b> : <i key={line}>{line}{"\n"}</i>)}</code></pre> : null}<div className="exd-panel-note"><GitBranch /><span><strong>Review attributed to {workspace.members?.find((member) => member.role === "Contributor")?.name ?? "Root Admin"}</strong><small>{workspaceState.review === "approved" ? "Workspace review gate approved" : "Review opens after focused verification"}</small></span></div></motion.section> : null}

							{view === "tests" ? <motion.section key="tests" className="exd-panel" tabIndex={0} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><header><small>WORKSPACE EVIDENCE</small><h2>{workspace.profile.tests} focused checks</h2><p>Failures return to this workspace agent with the trace and reproduction context attached.</p></header><div className={`exd-test-summary is-${workspaceState.agentState}`}><CheckCircle /><span><strong>{workspaceState.agentState === "verified" ? "Gate passed" : workspaceState.agentState === "blocked" ? "One classified failure" : "Gate ready"}</strong><small>{workspaceState.agentState === "verified" ? `${workspace.profile.tests} passed · 0 failed · no flaky tests` : "No skipped checks are permitted"}</small></span></div><div className="exd-suite-list">{workspace.profile.suites.map(([name, count], index) => <div key={name}>{workspaceState.agentState === "verified" || index < workspaceState.step - 1 ? <Check /> : <Clock />}<span><strong>{name}</strong><small>{count} assertions</small></span><b>{workspaceState.agentState === "verified" ? "Passed" : workspaceState.agentState === "blocked" && name.includes("Duplicate") ? "Failed" : "Ready"}</b></div>)}</div><button type="button" className="exd-terminal-line"><TerminalWindow /><code>{workspace.profile.command}</code><span>{workspaceState.agentState === "verified" ? "exit 0" : "View trace"}</span></button></motion.section> : null}

							{view === "environments" ? <motion.section key="environments" className="exd-panel" tabIndex={0} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><header><small>GOVERNED DELIVERY</small><h2>Environments & release</h2><p>Every mutation names the exact artifact, target, evidence, actor, and rollback before it runs.</p></header><div className="exd-binding-list">{(["development", "staging", "production"] as const).map((stage) => <div key={stage} className={workspaceState.stage === stage ? "is-current" : ""}><span>{stage === "development" ? <Code /> : stage === "staging" ? <Stack /> : <Globe />}</span><div><small>{stage}</small><strong>{workspace.environment?.[stage] ?? `${stage} environment`}</strong></div>{workspaceState.stage === stage ? <b>Current</b> : null}</div>)}</div>{(workspace.kind ?? "system") === "system" ? <div className="exd-environment-action"><div><small>EXACT ARTIFACT</small><strong>{workspaceState.artifact}</strong><span>{workspace.profile.tests} tests · rollback generated · Plan {planSnapshot}</span></div><button type="button" className="exd-primary" disabled={workspaceState.agentState !== "verified" || workspaceState.stage !== "development"} onClick={() => setPromotionTarget(workspace.id)}>{workspaceState.stage === "development" ? "Propose staging" : "Staged"}<ArrowRight /></button></div> : null}{workspace.kind === "orchestrator" ? <><div className="exd-candidate"><header><span><LockKey /></span><div><small>IMMUTABLE CANDIDATE</small><strong>{e2eState === "waiting" ? "Ready when all platform artifacts are staged" : `${candidate} · ${e2eState.replace("-", " ")}`}</strong></div></header>{PLATFORM_WORKSPACES.map((id) => <div key={id}><span>{workspaces.find((item) => item.id === id)?.title}</span><code>{delivery[id]?.artifact}</code><b>{delivery[id]?.stage === "staging" || delivery[id]?.stage === "production" ? <><Check />Pinned</> : "Not staged"}</b></div>)}<button type="button" disabled={!canAssemble || e2eState !== "waiting"} onClick={assembleCandidate}><LockKey />{e2eState === "waiting" ? "Assemble RC-07" : "Candidate sealed"}</button></div>{e2eState === "passed" ? <div className="exd-release-sequence"><header><div><small>PRODUCTION RELEASE</small><strong>{releaseState === "released" ? "Cross-platform outcome verified" : deployApproved ? "Approved sequence ready" : "RC-07 passed · approval required"}</strong></div><span className={`is-${releaseState}`}>{releaseState}</span></header>{RELEASE_ORDER.map((id, index) => <div key={id} className={releaseStep > index || releaseState === "released" ? "is-complete" : releaseStep === index && releaseState === "deploying" ? "is-current" : ""}><span>{index + 1}</span><div><strong>{workspaces.find((item) => item.id === id)?.title}</strong><small>{delivery[id]?.artifact}</small></div>{releaseStep > index || releaseState === "released" ? <Check /> : releaseStep === index && releaseState === "deploying" ? <SpinnerGap className="mxp-spin" /> : <LockKey />}</div>)}{!deployApproved ? <button type="button" className="exd-primary" disabled={deployRequested} onClick={requestRelease}>{deployRequested ? "Awaiting Elena Ortiz" : "Request production approvals"}<ArrowRight /></button> : <button type="button" className="exd-primary" disabled={releaseState !== "ready"} onClick={runRelease}>{releaseState === "released" ? "Release verified" : releaseState === "deploying" ? "Deploying in Plan order…" : "Run governed release"}<RocketLaunch /></button>}</div> : null}</> : null}{workspace.kind === "verification" ? <div className={`exd-e2e-card is-${e2eState}`}><header><span><ShieldCheck /></span><div><small>INT-401 · {candidate}</small><strong>{e2eState === "waiting" ? "Waiting for a sealed candidate" : e2eState === "failed" ? "40 passed · 1 classified failure" : e2eState === "passed" ? "41 scenarios passed" : e2eState === "running" ? "Running request-to-receipt matrix" : e2eState === "ready-rerun" ? "Repair verified · rerun ready" : "Candidate ready"}</strong></div></header><div>{workspace.profile.suites.map(([name, count]) => <span key={name}><Check />{name}<b>{count}</b></span>)}</div><button type="button" className="exd-primary" disabled={!(["ready", "ready-rerun"] as E2EState[]).includes(e2eState)} onClick={runE2E}>{e2eState === "running" ? "Running…" : e2eState === "ready-rerun" ? "Rerun RC-07.1" : e2eState === "passed" ? "Evidence sealed" : "Run cross-platform E2E"}<ArrowRight /></button></div> : null}</motion.section> : null}

							{view === "plan" ? <motion.section key="plan" className="exd-panel" tabIndex={0} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><header><small>READ-ONLY IMPLEMENTATION CONTRACT</small><h2>Plan context</h2><p>Enough context to build correctly without recreating architecture inside Execute.</p></header><div className="exd-context-hero"><FlowArrow /><div><small>APPROVED SNAPSHOT</small><strong>{planSnapshot} · {workspace.packages?.join(" + ")}</strong><span>{workspace.context?.mission ?? engagement.brief}</span></div><b>Read only</b></div>{workspace.context ? <div className="exd-context-sections"><section><h3>Expected behavior</h3>{workspace.context.behavior.map((item) => <p key={item}><Check />{item}</p>)}</section><section><h3>Contracts to implement</h3>{workspace.context.contracts.map((item) => <p key={item}><LinkLine />{item}</p>)}</section><section><h3>Dependencies</h3>{workspace.context.dependencies.map((item) => <p key={item}><ArrowRight />{item}</p>)}</section><section><h3>Done when</h3>{workspace.context.doneWhen.map((item) => <p key={item}><ShieldCheck />{item}</p>)}</section><section className="is-wide"><h3>Bound evidence</h3>{workspace.context.evidence.map((item) => <code key={item}>{item}</code>)}</section></div> : <p className="exd-empty">This generated engagement carries its approved brief and source fingerprint as the implementation contract.</p>}<div className="exd-panel-note"><LockKey /><span><strong>{workspace.authority ?? "Workspace-scoped implementation authority"}</strong><small>Material changes return to Plan as a deviation proposal.</small></span></div></motion.section> : null}

							{view === "audit" ? <motion.section key="audit" className="exd-panel" tabIndex={0} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><header><small>ATTRIBUTED RECEIPTS</small><h2>Workspace history</h2><p>Directions, implementation, promotion, approval, deployment, and rollback stay bound to actor and artifact.</p></header><div className="exd-history-compare" role="region" aria-label="Artifact history comparison"><header><span><ArrowsClockwise /></span><div><small>COMPARE DELIVERY HISTORY</small><strong>Current artifact versus approved baseline</strong></div></header><div><section><small>CURRENT</small><strong>{workspaceState.artifact}</strong><span>Plan {planSnapshot} · {workspaceState.stage} · {workspace.profile.tests} checks</span></section><i><ArrowRight /></i><section><small>PREVIOUS</small><strong>Plan PL-24.6 baseline</strong><span>Rollback retained · contracts unchanged</span></section></div></div><div className="exd-audit-list"><div><span className="is-max"><MaxionSpiralMark /></span><time>Now</time><p><strong>MAX monitored Plan drift</strong><small>{planSnapshot} · no divergence · evidence retained</small></p></div>{workspaceState.receipts.map((receipt, index) => <div key={receipt}><span>{index % 2 ? "RA" : systemMonogram(workspace)}</span><time>{index ? `${index + 1}m` : "Now"}</time><p><strong>{receipt}</strong><small>{workspaceState.artifact} · {workspace.environment?.[workspaceState.stage] ?? workspaceState.stage}</small></p></div>)}{workspaceMessages.map((message, index) => <div key={`audit-${message}`}><span>RA</span><time>{index + 3}m</time><p><strong>Direction from Root Admin</strong><small>{message}</small></p></div>)}</div><button type="button" className="exd-panel-action" onClick={() => setAuditExported(true)}><FileText />{auditExported ? "Audit package ready · EV-AUD-204" : "Export evidence package"}</button></motion.section> : null}
						</AnimatePresence>
					</aside>
				</div>
			</section>

			<AnimatePresence>
				{shareOpen ? <motion.div className="exd-modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button type="button" className="exd-modal-scrim" aria-label="Close sharing" onClick={() => setShareOpen(false)} /><motion.section role="dialog" aria-modal="true" aria-labelledby="execute-share-title" className="exd-share-modal" initial={{ opacity: 0, y: 12, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}><header><span><ShareNetwork /></span><div><small>ACCESS FOLLOWS DELIVERY OWNERSHIP</small><h2 id="execute-share-title">Share the engagement</h2><p>Give each team only the workspace, conversation, artifacts, and environment authority they need.</p></div><button type="button" aria-label="Close sharing" onClick={() => setShareOpen(false)}><X /></button></header><div className="exd-share-scope" role="group" aria-label="Share scope"><button type="button" aria-pressed={shareScope === "engagement"} onClick={() => setShareScope("engagement")}><Stack /><span><strong>Entire engagement</strong><small>Orchestrator and assigned workspaces</small></span></button><button type="button" aria-pressed={shareScope === workspace.id} onClick={() => setShareScope(workspace.id)}><Code /><span><strong>{workspace.title} only</strong><small>{workspace.packages?.join(" + ")}</small></span></button></div><form onSubmit={(event) => { event.preventDefault(); if (inviteEmail.trim()) { setInviteSent(true); setInviteEmail("") } }}><label><span className="sr-only">Invite by email</span><UserPlus /><input value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); setInviteSent(false) }} placeholder="name@company.com" type="email" required /></label><select aria-label="Invite role" defaultValue="Contributor"><option>Contributor</option><option>Reviewer</option><option>Viewer</option><option>Orchestrator collaborator</option></select><button type="submit" disabled={!inviteEmail.trim()}>Invite</button></form>{inviteSent ? <p className="exd-invite-status" role="status"><CheckCircle />Invitation prepared with {shareScope === "engagement" ? "engagement" : workspace.title} scope.</p> : null}<div className="exd-member-list">{allMembers.map((member) => <div key={member.id}><span className={participantTone(member)}>{member.initials}</span><p><strong>{member.name}</strong><small>{member.scope}</small></p><select aria-label={`Role for ${member.name}`} defaultValue={member.role}><option>{member.role}</option>{member.role !== "Contributor" ? <option>Contributor</option> : null}{member.role !== "Reviewer" ? <option>Reviewer</option> : null}{member.role !== "Viewer" ? <option>Viewer</option> : null}</select></div>)}</div><footer><ShieldCheck /><span><strong>Least privilege is visible and enforced by workspace</strong><small>Provider credentials and conversations never inherit across platform boundaries.</small></span></footer></motion.section></motion.div> : null}

				{promotionWorkspace ? <motion.div className="exd-modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button type="button" className="exd-modal-scrim" aria-label="Discard staging proposal" onClick={() => setPromotionTarget(null)} /><motion.section role="dialog" aria-modal="true" aria-labelledby="promotion-title" className="exd-impact-modal" initial={{ opacity: 0, y: 12, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}><header><span><RocketLaunch /></span><div><small>IMPACT PREVIEW · ENVIRONMENT MUTATION</small><h2 id="promotion-title">Promote {promotionWorkspace.title} to staging</h2><p>Review the exact effect. Nothing changes until you apply it.</p></div><button type="button" aria-label="Discard staging proposal" onClick={() => setPromotionTarget(null)}><X /></button></header><dl><div><dt>Artifact</dt><dd>{delivery[promotionWorkspace.id]?.artifact}</dd></div><div><dt>Target</dt><dd>{promotionWorkspace.environment?.staging}</dd></div><div><dt>Evidence</dt><dd>{promotionWorkspace.profile.tests} tests passed · review approved</dd></div><div><dt>Candidate impact</dt><dd>{Math.min(platformStaged + 1, implementationTotal)}/{implementationTotal} artifacts eligible for RC-07</dd></div><div><dt>Rollback</dt><dd>Current staging version retained for one-click restore</dd></div><div><dt>Actor</dt><dd>Root Admin · Owner authority</dd></div></dl><div className="exd-impact-callout"><ShieldCheck /><span><strong>No production effect</strong><small>MAX will record the receipt and re-check candidate compatibility after promotion.</small></span></div><footer><button type="button" onClick={() => setPromotionTarget(null)}>Discard</button><button type="button" className="exd-primary" onClick={applyPromotion}>Apply promotion<ArrowRight /></button></footer></motion.section></motion.div> : null}
			</AnimatePresence>
		</div>
	)
}

function LinkLine() {
	return <FlowArrow />
}
