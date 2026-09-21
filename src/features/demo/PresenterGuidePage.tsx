import { ArrowCounterClockwise, CheckCircle, Circle, Copy, PaperPlaneRight } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import { useDocumentTitle } from "@/app/hooks/useDocumentTitle"
import { Button as DsButton, TextButton } from "@/design/primitives"
import { nextAnswer } from "./progress"
import { demoScript } from "./scripts"
import { demoStorageAvailable, demoUrl, guideDemo, openGuideChannel, type DemoCommand, type DemoStart, type GuidePresence } from "./session"
import { useDemoProgress } from "./useDemoProgress"
import "./demo.css"

type Channel = ReturnType<typeof openGuideChannel>

/*
 * The presenter's second screen for the demo its address names. It follows that
 * demo tab live (both read the demo's saved state), shows the talk track and
 * the scripted answers, and can send an answer or a restart to the demo tab,
 * which confirms it took them. It never starts, clears or changes the demo's
 * saved state itself.
 */
export function PresenterGuidePage() {
	// Fixed for this window: the guide follows the demo its address named when it opened.
	const [script] = useState(() => demoScript(guideDemo()))
	useDocumentTitle(`Presenter guide · ${script.name} demo`)
	const { snapshot, steps, current } = useDemoProgress(script)
	const [copied, setCopied] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	const [confirmRestart, setConfirmRestart] = useState(false)
	// Which demo tabs answered recently; null until the first answer (or silence) arrives.
	const [presence, setPresence] = useState<GuidePresence | null>(null)
	const live = presence === null ? null : presence === "owner"
	const channel = useRef<Channel | null>(null)
	useEffect(() => {
		channel.current = openGuideChannel(script.id, setPresence)
		return () => { channel.current?.close(); channel.current = null }
	}, [script])
	useEffect(() => { if (!copied && !notice) return; const timer = window.setTimeout(() => { setCopied(null); setNotice(null) }, 3200); return () => window.clearTimeout(timer) }, [copied, notice])

	const send = async (command: DemoCommand, done: string) => {
		const taken = await (channel.current?.send(command) ?? Promise.resolve(false))
		setNotice(taken ? done : presence === "other" ? "The open demo tab handed the demo to another tab. Use Continue here in it, then try again." : "No demo tab answered. Open the demo below, then try again.")
	}
	const copy = async (text: string) => {
		try { await navigator.clipboard.writeText(text); setCopied(text) } catch { setNotice("Copying isn't allowed in this window; select the text instead.") }
	}
	const restart = (start: DemoStart) => { setConfirmRestart(false); void send({ type: "restart", start }, start === "package" ? "The demo tab restarted from the finished package." : "The demo tab restarted from the beginning.") }
	// A demo opened from here always starts clean, even though this window may carry the demo tab's session flag.
	const openDemo = (start: DemoStart) => window.open(demoUrl(script.id, start, window.location.href, true).toString(), "_blank", "noopener")
	const step = steps[current] ?? steps.at(-1)
	const answer = nextAnswer(script, snapshot.discovery)
	const saved = !!snapshot.discovery || !!snapshot.agentix
	const [tracking] = useState(demoStorageAvailable)

	return (
		<div className="mxd-guide ds-scope">
			<main className="mxd-guide-main">
				<header className="mxd-guide-head">
					<p className="mxd-kicker">Presenter guide · keep this window off the shared screen</p>
					<h1>{script.name}, Discovery to Agentix</h1>
					<p>Follows the demo tab as you go. Everything shown to the customer is simulated: no real ledger, AWS, ERP or Teams action happens.</p>
					{tracking ? null : <p className="mxd-detail">This browser blocks storage, so the guide can’t follow the demo’s steps. Fill and Restart still reach the demo tab.</p>}
					<p className="mxd-guide-status" role="status">{presence === "owner" ? "Connected to the demo tab." : presence === "other" ? "A demo tab is open but has handed the demo to another tab. Use Continue here in it to carry on." : presence === "none" ? (saved ? "No demo tab is open. Showing where the last demo in this browser stopped." : "No demo tab is open.") : "Looking for the demo tab…"}{notice ? ` ${notice}` : ""}</p>
				</header>

				{presence === "none" ? (
					<section className="mxd-guide-current" aria-label="Start the demo">
						<h2>{saved ? "Open the demo again" : "Start the demo"}</h2>
						<p className="mxd-detail">A new tab always starts clean. To pick up the last demo instead, go back to its tab, or reopen the demo address in that same tab.</p>
						<div className="mxd-actions">
							<DsButton size="sm" variant="primary" onClick={() => openDemo("discovery")}>Open the full demo</DsButton>
							<DsButton size="sm" onClick={() => openDemo("package")}>Open from the finished package</DsButton>
						</div>
					</section>
				) : null}

				{saved && step ? (
					<section className="mxd-guide-current" aria-label="Current step">
						<p className="mxd-kicker">Step {Math.min(current < 0 ? steps.length : current + 1, steps.length)} of {steps.length}{step.detail ? ` · ${step.detail}` : ""}</p>
						<h2>{step.title}</h2>
						<dl className="mxd-script">
							<div><dt>Do</dt><dd>{step.does}</dd></div>
							<div><dt>Say</dt><dd className="mxd-say">{step.says}</dd></div>
						</dl>
						{step.id === "interview" && answer ? (
							<div className="mxd-guide-answer">
								<p>{answer}</p>
								<div className="mxd-actions">
									<DsButton size="sm" variant="primary" disabled={live === false} onClick={() => void send({ type: "fill", text: answer, recordId: snapshot.discovery?.id }, "Filled in the demo. Press Enter there to send it.")}><PaperPlaneRight size={14} />Fill in the demo</DsButton>
									<DsButton size="sm" onClick={() => copy(answer)}><Copy size={14} />{copied === answer ? "Copied" : "Copy"}</DsButton>
								</div>
							</div>
						) : null}
					</section>
				) : null}

				<section className="mxd-guide-section" aria-label="All steps">
					<h2>The story, step by step</h2>
					<ol className="mxd-guide-list">
						{steps.map((entry, index) => (
							<li key={entry.id} className={`is-${entry.status}`} aria-current={entry.status === "current" ? "step" : undefined}>
								{entry.status === "done" ? <CheckCircle size={16} weight="fill" aria-hidden="true" /> : <Circle size={16} weight={entry.status === "current" ? "fill" : "regular"} aria-hidden="true" />}
								<div><strong>{index + 1}. {entry.title}</strong><p>{entry.does}</p></div>
							</li>
						))}
					</ol>
				</section>

				<section className="mxd-guide-section" aria-label="Interview answers">
					<h2>The six interview answers</h2>
					<ol className="mxd-guide-answers">
						{script.answers.map(text => (
							<li key={text} className={text === answer ? "is-next" : undefined}>
								<span>{text}</span>
								<TextButton onClick={() => copy(text)} aria-label={`Copy: ${text}`}><Copy size={12} />{copied === text ? "Copied" : "Copy"}</TextButton>
							</li>
						))}
					</ol>
					<p className="mxd-detail">Charter approval reason: “{script.charterReason}” <TextButton onClick={() => copy(script.charterReason)}><Copy size={12} />{copied === script.charterReason ? "Copied" : "Copy"}</TextButton></p>
				</section>

				<footer className="mxd-guide-foot">
					{confirmRestart ? (
						<>
							<span className="mxd-detail">Restart the open demo tab? Its Discovery and Agentix work are cleared.</span>
							<DsButton size="sm" variant="primary" onClick={() => restart("discovery")}>From the beginning</DsButton>
							<DsButton size="sm" onClick={() => restart("package")}>From the finished package</DsButton>
							<TextButton onClick={() => setConfirmRestart(false)}>Cancel</TextButton>
						</>
					) : <DsButton size="sm" disabled={live === false} onClick={() => setConfirmRestart(true)}><ArrowCounterClockwise size={14} />Restart…</DsButton>}
				</footer>
			</main>
		</div>
	)
}
