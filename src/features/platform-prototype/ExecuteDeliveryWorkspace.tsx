import {
	ArrowCounterClockwise,
	ArrowLeft,
	Check,
	CheckCircle,
	Clock,
	MagnifyingGlass,
	PaperPlaneTilt,
	Pause,
	Play,
	ShieldCheck,
	SpinnerGap,
	Stop,
	Warning,
	X,
} from "@phosphor-icons/react"
import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react"

import { executeRepository } from "@/features/execute-workspace/executeRepository"
import {
	executeReducer,
	selectActiveExecution,
	selectExecutionEvents,
	type ExecutionCommand,
	type ExecutionRole,
} from "@/features/execute-workspace/executeState"

import type { PlanArtifactRef } from "./contracts"

type Props = {
	onBack: () => void
	onPlatform: () => void
	onPlan: () => void
	onCommand: () => void
	planArtifact: PlanArtifactRef | null
	role: ExecutionRole
	onVerified: () => void
}

function commandMeta(runId: string, revision: number, action: string) {
	const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	return { expectedRevision: revision, idempotencyKey: `${runId}:${action}:${nonce}`, correlationId: `ui-${runId}:${action}:${nonce}` }
}

export function ExecuteDeliveryWorkspace({ onBack, onPlatform, onPlan, onCommand, planArtifact, role, onVerified }: Props) {
	const loaded = useMemo(() => executeRepository.load(), [])
	const [state, dispatch] = useReducer(executeReducer, loaded.value)
	const [persistenceNotice, setPersistenceNotice] = useState(loaded.notice)
	const [instruction, setInstruction] = useState("")
	const [inspector, setInspector] = useState<"tests" | "changes" | "audit">("tests")
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const reportedResultId = useRef<string | null>(null)
	const verifiedRef = useRef(onVerified)
	verifiedRef.current = onVerified

	useEffect(() => {
		if (planArtifact) dispatch({ type: "plan/ingested", planRef: planArtifact, actorRole: role })
	}, [planArtifact, role])
	useEffect(() => {
		const saved = executeRepository.save(state)
		if (!saved.ok) setPersistenceNotice(saved.message)
	}, [state])

	const run = selectActiveExecution(state)
	const currentStage = run?.stages.find((stage) => stage.id === run.activeStageId) ?? null
	const events = run ? selectExecutionEvents(run) : { items: [], total: 0, mounted: 0, omitted: 0 }
	const readOnly = !run || run.role === "viewer"

	useEffect(() => {
		if (run?.status === "completed" && run.resultRef && reportedResultId.current !== run.resultRef.id) {
			reportedResultId.current = run.resultRef.id
			verifiedRef.current()
		}
	}, [run?.resultRef, run?.status])

	useEffect(() => {
		if (!run || run.status !== "running" || !currentStage) return
		const expectedRevision = run.revision
		const operationId = `${run.id}:${currentStage.id}:${expectedRevision}`
		const timer = window.setTimeout(() => dispatch({ type: "run/advanced", actorRole: run.role, operationId, ...commandMeta(run.id, expectedRevision, "advance") }), 900)
		return () => window.clearTimeout(timer)
	}, [currentStage, run])

	const send = (type: Extract<ExecutionCommand, { expectedRevision: number }>["type"]) => {
		if (!run || type === "run/advanced" || type === "run/steered") return
		dispatch({ type, actorRole: run.role, ...commandMeta(run.id, run.revision, type) } as ExecutionCommand)
	}

	if (!planArtifact || !run) {
		return <section className="exw-empty" aria-label="Execute requires an approved Plan"><ShieldCheck size={32} /><small>EXECUTE</small><h1>Approved Plan required</h1><p>Execute starts only from an immutable Plan artifact. It won’t infer delivery authority from a prompt or route access.</p><div><button type="button" className="is-primary" onClick={onPlan}>Open Plan</button><button type="button" onClick={onPlatform}>Return to Dashboard</button></div></section>
	}

	const submitDirection = (event: FormEvent) => {
		event.preventDefault()
		const value = instruction.trim()
		if (!value || readOnly || !["running", "paused"].includes(run.status)) return
		dispatch({ type: "run/steered", text: value, actorRole: run.role, ...commandMeta(run.id, run.revision, "steer") })
		setInstruction("")
	}
	const primary = run.status === "idle" || run.status === "stopped" || run.status === "rolled-back"
		? <button type="button" className="is-primary" disabled={readOnly} onClick={() => send("run/started")}><Play />Start simulation</button>
		: run.status === "running"
			? <button type="button" className="is-primary" disabled={readOnly} onClick={() => send("run/paused")}><Pause />Pause safely</button>
			: run.status === "paused"
				? <button type="button" className="is-primary" disabled={readOnly} onClick={() => send("run/resumed")}><Play />Resume run</button>
				: run.status === "approval-held"
					? <button type="button" className="is-primary" disabled={run.role !== "owner"} onClick={() => send("run/approved")}><Check />Approve result</button>
					: null

	return <section className="exw-root" aria-label="Execute delivery workspace">
		<header className="exw-header"><button type="button" className="exw-back" onClick={onBack} aria-label="Back to Execute"><ArrowLeft /></button><div><small>EXECUTE</small><strong>{run.projectName} delivery</strong><span>Local simulation · Plan v{run.planRef.artifactVersion}</span></div><button type="button" className="exw-search" onClick={onCommand}><MagnifyingGlass /><span>Search or ask</span><kbd>⌘K</kbd></button>{run.status === "running" || run.status === "paused" ? <button type="button" className="exw-interrupt" disabled={run.role !== "owner"} onClick={() => send("run/stopped")}><Stop />Interrupt</button> : primary}</header>
		{persistenceNotice ? <div className="exw-notice" role="status"><span>{persistenceNotice}</span><button type="button" onClick={() => setPersistenceNotice(null)}>Dismiss</button></div> : null}
		<div className="exw-body">
			<div className="exw-title"><div><small>ENGAGEMENT / {run.id.slice(-12).toUpperCase()}</small><h1>Ship the approved {run.projectName} plan</h1><p>MAX is working inside the approved Plan and a local-only demonstration boundary.</p></div><div><span className={`exw-status is-${run.status}`}>{run.status.replace("-", " ")}</span>{primary}</div></div>
			<div className="exw-layout">
				<aside className="exw-stages" aria-label="Execution stages"><h2>Workspaces</h2>{run.stages.map((stage, index) => <article key={stage.id} className={stage.id === run.activeStageId ? "is-active" : ""}><header><span>{String(index + 1).padStart(2, "0")}</span><b>{stage.status}</b></header><strong>{stage.title}</strong><small>{stage.expectedSeconds}s expected</small></article>)}</aside>
				<main className="exw-canvas"><header><div><small>{currentStage ? `WORKSPACE ${String(run.stages.findIndex((stage) => stage.id === currentStage.id) + 1).padStart(2, "0")}` : "RUN"}</small><h2>{currentStage?.title ?? (run.status === "completed" ? "Simulation complete" : run.status === "approval-held" ? "Result awaiting approval" : "Ready to run")}</h2><p>{currentStage?.detail ?? "The approved Plan remains pinned while you decide the next action."}</p></div><span>{currentStage ? <><SpinnerGap className={run.status === "running" ? "exw-spin" : ""} />{run.status}</> : <><Clock />{run.status}</>}</span></header><section className="exw-activity" aria-label="Run activity">{events.items.slice(0, 6).map((item) => <article key={item.id}><time>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><div><strong>{item.label}</strong><small>{item.environment} · {item.evidenceClass}</small></div><CheckCircle /></article>)}</section><pre className="exw-terminal" aria-label="Simulation output"><code>$ maxion execute --environment local-simulation{"\n"}<span>✓ approved Plan {run.planRef.contentDigest}</span>{"\n"}<span>✓ tenant boundary {run.projectId}</span>{"\n"}{currentStage ? <span>• {currentStage.title.toLowerCase()} in progress</span> : <span>• no external effect requested</span>}</code></pre><form className="exw-composer" onSubmit={submitDirection}><textarea ref={composerRef} aria-label="Steer this run" value={instruction} onChange={(event) => setInstruction(event.target.value)} disabled={readOnly || !["running", "paused"].includes(run.status)} placeholder={readOnly ? "View-only access" : "Add a bounded direction; the Plan authority remains unchanged."} rows={2} /><footer><span>Steer this run · authority unchanged</span><button type="submit" disabled={!instruction.trim() || readOnly}><PaperPlaneTilt />Send</button></footer></form></main>
				<aside className="exw-inspector" aria-label="Run inspector"><h2>Run inspector</h2><nav>{(["tests", "changes", "audit"] as const).map((view) => <button key={view} type="button" aria-current={inspector === view ? "page" : undefined} onClick={() => setInspector(view)}>{view}</button>)}</nav>{inspector === "tests" ? <section><small>BREAK-IT GATE</small>{run.stages.map((stage) => <p key={stage.id}><span>{stage.title}</span><b>{stage.status}</b></p>)}</section> : null}{inspector === "changes" ? <section><small>SIMULATED ARTIFACT</small><p><span>Plan input</span><b>v{run.planRef.artifactVersion}</b></p><p><span>Source records</span><b>{run.planRef.sourceIds.length}</b></p><p><span>Environment</span><b>local only</b></p></section> : null}{inspector === "audit" ? <section><small>EVENT RECEIPTS</small>{events.items.slice(0, 8).map((item) => <p key={`audit-${item.id}`}><span>{item.type}</span><b>{item.evidenceClass}</b></p>)}</section> : null}<div className="exw-boundary"><Warning /><div><small>DEPLOYMENT BOUNDARY</small><p>Local simulation only. Production deploy requires a separate release path and approval.</p></div></div><div className="exw-controls">{run.status === "running" ? <button type="button" disabled={readOnly} onClick={() => send("run/failed")}><Warning />Simulate failure</button> : null}{run.status === "failed" ? <><button type="button" className="is-primary" disabled={readOnly} onClick={() => send("run/retried")}><Play />Retry stage</button><button type="button" disabled={run.role !== "owner"} onClick={() => send("run/rolled-back")}><ArrowCounterClockwise />Roll back</button></> : null}{run.status === "stopped" ? <button type="button" disabled={run.role !== "owner"} onClick={() => send("run/rolled-back")}><ArrowCounterClockwise />Roll back</button> : null}{run.status === "approval-held" ? primary : null}{run.resultRef ? <div className="exw-result"><CheckCircle /><div><strong>Simulation receipt ready</strong><small>{run.resultRef.id} · no production claim</small></div></div> : null}</div></aside>
			</div>
		</div>
		{run.notice ? <div className="exw-toast" role="alert"><Warning /><span>{run.notice}</span><button type="button" onClick={() => dispatch({ type: "notice/cleared" })}><X aria-label="Dismiss" /></button></div> : null}
	</section>
}
