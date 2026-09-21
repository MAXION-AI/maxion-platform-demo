import { ArrowSquareOut, CaretRight, CheckCircle, Circle, PresentationChart, WarningCircle, X } from "@phosphor-icons/react"
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { Button as DsButton, TextButton } from "@/design/primitives"
import type { DemoAction, DemoSnapshot, DemoStep } from "./progress"
import type { DemoScript } from "./scripts"
import { demoStorageAvailable, exitDemo, guideUrl, onDemoCommand, restartDemo, stakeholderUrl, takeOverDemo, type DemoStart } from "./session"
import { useDemoOwnership } from "./useDemoOwnership"
import { useDemoProgress } from "./useDemoProgress"
import "./demo.css"

/*
 * The presenter's quiet companion inside the product: one sidebar row that says
 * which step of the running demo's story it is on, and a panel with what to do,
 * what to say, the one action that moves the story on, and restart. The talk
 * track lives in the second-screen guide as well, for presenters who share
 * only this tab. The panel is placed on the page itself, so the sidebar's
 * drawer never clips it at narrow widths.
 */
export function PresenterDock({ script, collapsed, onRun }: { script: DemoScript; collapsed: boolean; onRun: (action: DemoAction, snapshot: DemoSnapshot) => void }) {
	const { snapshot, steps, current } = useDemoProgress(script)
	const owns = useDemoOwnership()
	const [open, setOpen] = useState(false)
	const [restarting, setRestarting] = useState(false)
	const [top, setTop] = useState(0)
	const trigger = useRef<HTMLButtonElement>(null)
	const panel = useRef<HTMLDivElement>(null)
	const heading = useRef<HTMLHeadingElement>(null)
	const restartButton = useRef<HTMLButtonElement>(null)
	const firstRestart = useRef<HTMLButtonElement>(null)
	const focusAfterSwitch = useRef<"restart" | "options" | null>(null)
	const panelId = useId()
	const titleId = useId()
	const step: DemoStep | undefined = steps[current] ?? steps.at(-1)
	const number = current < 0 ? steps.length : current + 1
	// Without storage the demo still runs, but this row can't follow it.
	const [tracking] = useState(demoStorageAvailable)

	// The guide window can fill an answer in this tab (only the tab that owns the demo hears it).
	const run = useRef(onRun)
	run.current = onRun
	const latest = useRef(snapshot)
	latest.current = snapshot
	useEffect(() => onDemoCommand(command => { if (command.type === "fill") run.current({ kind: "fill", text: command.text }, latest.current) }), [])

	const close = useCallback((restoreFocus = true) => {
		setOpen(false)
		setRestarting(false)
		if (restoreFocus) trigger.current?.focus({ preventScroll: true })
	}, [])
	// The panel sits beside the row that opened it and never runs off the bottom of the window.
	useLayoutEffect(() => {
		if (!open) return
		const place = () => {
			const rect = trigger.current?.getBoundingClientRect()
			const height = panel.current?.offsetHeight ?? 0
			if (rect) setTop(Math.max(8, Math.min(rect.top, window.innerHeight - height - 8)))
		}
		place()
		// Opening "All steps" or the restart choice changes the panel's height; it keeps to the window.
		const observer = typeof ResizeObserver !== "undefined" && panel.current ? new ResizeObserver(place) : null
		if (panel.current) observer?.observe(panel.current)
		window.addEventListener("resize", place)
		return () => { observer?.disconnect(); window.removeEventListener("resize", place) }
	}, [open, current, restarting, owns])
	useEffect(() => { if (open) heading.current?.focus({ preventScroll: true }) }, [open])
	// Switching the footer between its options and the restart choice keeps focus inside the panel.
	useEffect(() => {
		const target = focusAfterSwitch.current
		focusAfterSwitch.current = null
		if (target === "restart") firstRestart.current?.focus()
		else if (target === "options") restartButton.current?.focus()
	}, [restarting])
	useEffect(() => {
		if (!open) return
		const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); close() } }
		const onPointer = (event: PointerEvent) => {
			const target = event.target as Node
			if (!panel.current?.contains(target) && !trigger.current?.contains(target)) close(false)
		}
		window.addEventListener("keydown", onKey, true)
		window.addEventListener("pointerdown", onPointer, true)
		return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("pointerdown", onPointer, true) }
	}, [open, close])
	// The panel sits at the end of the page but reads as part of the row: Shift+Tab from its first
	// control returns to the row, Tab from its last goes on to whatever follows the row, and either
	// way the panel closes. Focus that leaves by pointer closes it too.
	const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Tab" || !panel.current) return
		const controls = Array.from(panel.current.querySelectorAll<HTMLElement>("button:not(:disabled), summary, a[href], [tabindex]:not([tabindex='-1'])")).filter(node => node.getClientRects().length > 0)
		const first = controls[0], last = controls.at(-1)
		const active = document.activeElement
		if (event.shiftKey && (active === first || active === heading.current)) { event.preventDefault(); close() }
		else if (!event.shiftKey && active === last) {
			event.preventDefault()
			const order = Array.from(document.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex]:not([tabindex='-1'])")).filter(node => node.getClientRects().length > 0 && !panel.current?.contains(node))
			const after = order[order.indexOf(trigger.current as HTMLElement) + 1]
			close(false)
			;(after ?? trigger.current)?.focus()
		}
	}
	const onBlur = (event: FocusEvent<HTMLDivElement>) => {
		const next = event.relatedTarget as Node | null
		if (next && (panel.current?.contains(next) || trigger.current?.contains(next))) return
		if (next) close(false)
	}
	// Taking the demo back replaces this panel's content; the row keeps focus.
	const continueHere = () => { takeOverDemo(); close() }

	const showRestart = (value: boolean) => { focusAfterSwitch.current = value ? "restart" : "options"; setRestarting(value) }
	const restart = (start: DemoStart) => restartDemo(start, script.id)
	// The panel steps aside for the product: a filled answer is in the composer, with focus, ready for Enter.
	const act = (action: DemoAction) => { close(false); onRun(action, snapshot) }
	const restartChoice = (
		<div className="mxd-restart" role="group" aria-label="Restart">
			<p>Start again? Everything this run did is cleared; the everyday workspace is untouched.</p>
			<div className="mxd-restart-actions">
				<DsButton ref={firstRestart} size="sm" variant="primary" onClick={() => restart("discovery")}>From the beginning</DsButton>
				<DsButton size="sm" onClick={() => restart("package")}>From the finished package</DsButton>
				<TextButton onClick={() => showRestart(false)}>Cancel</TextButton>
			</div>
		</div>
	)

	const body = !owns ? (
		<>
			<header className="mxd-panel-head">
				<p className="mxd-kicker">Presenter · {script.kicker}</p>
				<button type="button" className="mxd-close" aria-label="Close presenter panel" onClick={() => close()}><X size={14} /></button>
			</header>
			<h2 id={titleId} ref={heading} tabIndex={-1}>Continues in another tab</h2>
			<p className="mxd-detail">Another tab started this run or took it over, so this tab has stopped saving. Carry on in that tab, or bring it back here.</p>
			<div className="mxd-actions"><DsButton size="sm" variant="primary" onClick={continueHere}>Continue here</DsButton></div>
			<footer className="mxd-panel-foot">
				{restarting ? restartChoice : <>
					<TextButton ref={restartButton} onClick={() => showRestart(true)}>Restart here…</TextButton>
					<TextButton onClick={exitDemo}>Exit</TextButton>
				</>}
			</footer>
		</>
	) : step ? (
		<>
			<header className="mxd-panel-head">
				<p className="mxd-kicker">Presenter · step {number} of {steps.length}</p>
				<button type="button" className="mxd-close" aria-label="Close presenter panel" onClick={() => close()}><X size={14} /></button>
			</header>
			<h2 id={titleId} ref={heading} tabIndex={-1}>{step.title}</h2>
			{tracking ? null : <p className="mxd-detail">This browser blocks storage, so this panel can’t follow along. The run itself continues; follow the steps from the runbook.</p>}
			{step.detail ? <p className="mxd-detail" aria-live="polite">{step.detail}</p> : null}
			<dl className="mxd-script">
				<div><dt>Do</dt><dd>{step.does}</dd></div>
				<div><dt>Say</dt><dd className="mxd-say">{step.says}</dd></div>
			</dl>
			{step.action ? <div className="mxd-actions"><DsButton size="sm" variant="primary" onClick={() => step.action && act(step.action.run)}>{step.action.label}<CaretRight size={12} /></DsButton></div> : null}
			<details className="mxd-steps">
				<summary><CaretRight size={12} className="mxd-caret" aria-hidden="true" />All steps</summary>
				<ol>
					{steps.map((entry, index) => (
						<li key={entry.id} className={`is-${entry.status}`} aria-current={entry.status === "current" ? "step" : undefined}>
							{entry.status === "done" ? <CheckCircle size={14} weight="fill" aria-hidden="true" /> : <Circle size={14} weight={entry.status === "current" ? "fill" : "regular"} aria-hidden="true" />}
							<span>{index + 1}. {entry.title}</span>
						</li>
					))}
				</ol>
			</details>
			<footer className="mxd-panel-foot">
				{restarting ? restartChoice : <>
					<TextButton onClick={() => window.open(guideUrl(script.id), `maxion-demo-guide-${script.id}`, "popup,width=520,height=860,noopener")}>Presenter window<ArrowSquareOut size={12} /></TextButton>
					{/* What a stakeholder receives. Its own window, so the demo tab keeps the demo. */}
					<TextButton onClick={() => window.open(stakeholderUrl(script.id), `maxion-stakeholder-${script.id}`, "popup,width=900,height=900,noopener")}>Stakeholder interview<ArrowSquareOut size={12} /></TextButton>
					<TextButton ref={restartButton} onClick={() => showRestart(true)}>Restart…</TextButton>
					<TextButton onClick={exitDemo} title="Leaves this run; going back to its address in this tab resumes it">Exit</TextButton>
				</>}
			</footer>
		</>
	) : null

	return (
		<div className={`mxd-dock${collapsed ? " is-collapsed" : ""}${owns ? "" : " is-elsewhere"}`}>
			<button ref={trigger} type="button" className="mxd-dock-row" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} title={collapsed ? (owns ? `Presenter · step ${number} of ${steps.length}` : "Presenter · continues in another tab") : undefined} onClick={() => open ? close() : setOpen(true)}>
				{owns ? <PresentationChart size={16} aria-hidden="true" className="mxd-dock-icon" /> : <WarningCircle size={16} aria-hidden="true" className="mxd-dock-icon" />}
				<span className="mxd-dock-text"><strong>{script.label}</strong><small>{!owns ? "Continues in another tab" : tracking ? step?.title : "Can’t follow: storage blocked"}</small></span>
				{owns ? <b className="mxd-dock-count" aria-label={`Step ${number} of ${steps.length}`}>{number}/{steps.length}</b> : null}
			</button>
			{open && body ? createPortal(
				<div ref={panel} id={panelId} className={`mxd-panel ds-scope${collapsed ? " is-collapsed" : ""}`} role="dialog" aria-labelledby={titleId} onBlur={onBlur} onKeyDown={onKeyDown} style={{ "--mxd-top": `${top}px` } as CSSProperties}>
					{body}
				</div>,
				document.body,
			) : null}
		</div>
	)
}
