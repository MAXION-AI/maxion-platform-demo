import { useEffect, useMemo, useState } from "react"
import { useReducedMotion } from "motion/react"
import { ArrowRight, ChatCircleText, CheckCircle, Microphone, UsersThree } from "@phosphor-icons/react"

import { Button as DsButton } from "@/design/primitives"
import { createLevel } from "@/components/voice/audioLevel"
import { VoiceOrb, type OrbState } from "@/components/voice/VoiceOrb"
import type { DemoScript } from "@/features/demo/scripts"
import type { Person } from "./model"
import "./stakeholder-calls.css"

/*
 * MAX's stakeholder interviews, shown while they happen. Before, they were a count that went from
 * 0 to 4 in a few seconds ("Stakeholder interviews · Done"); nobody saw MAX talk to anyone.
 *
 * One column per person: who they are, how MAX reaches them (voice, text or the workshop), the
 * exchange as it happens, and what MAX took from it. When two answers disagree, a line joins the
 * two people and names the disagreement, because that is where the Discovery's decision comes from.
 *
 * In a customer demo the exchanges are the script's; elsewhere the column shows what MAX is
 * covering with that person, never invented quotes. The demo replays interviews that in practice
 * run over days, compressed into the run's stakeholder stage, and says so.
 */

const LINE_MS = 1_500
const STAGGER_MS = 700

export function StakeholderCalls({ people, script, phase, paused, decisionPending, onOpenPeople, onJumpToDecision }: {
	people: Person[]
	script?: DemoScript
	phase: number
	paused: boolean
	decisionPending: boolean
	onOpenPeople: () => void
	onJumpToDecision: () => void
}) {
	const reduced = Boolean(useReducedMotion())
	const live = phase >= 2 && phase < 4
	const finished = phase >= 4
	// Time since the stakeholder stage began; each column's lines land on it.
	const [elapsed, setElapsed] = useState(finished || reduced ? Number.MAX_SAFE_INTEGER : 0)
	useEffect(() => {
		if (finished || reduced) { setElapsed(Number.MAX_SAFE_INTEGER); return }
		if (!live || paused) return
		const id = window.setInterval(() => setElapsed(value => value + 250), 250)
		return () => window.clearInterval(id)
	}, [finished, live, paused, reduced])
	const levels = useMemo(() => people.map(() => createLevel()), [people])
	const calls = people.slice(0, 4).map((person, index) => {
		const scripted = script?.calls.find(call => call.person === person.id)
		const lines = scripted?.lines ?? []
		const start = index * STAGGER_MS
		const shown = lines.length ? Math.max(0, Math.min(lines.length, Math.floor((elapsed - start) / LINE_MS) + 1)) : 0
		const done = finished || elapsed > start + Math.max(lines.length, 3) * LINE_MS
		const talking = !done && elapsed > start
		const lastBy = lines[shown - 1]?.by
		const state: OrbState = done ? "idle" : talking ? (lastBy === "them" ? "listening" : "speaking") : "idle"
		return { person, scripted, lines: lines.slice(0, shown), state, done, talking, waiting: !done && !talking }
	})
	// The orbs move with the conversation: a pulse for each landed line.
	useEffect(() => {
		calls.forEach((call, index) => { if (call.talking) levels[index].current = 0.55 })
		const id = window.setTimeout(() => levels.forEach(level => { level.current = 0 }), 600)
		return () => window.clearTimeout(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [calls.map(call => call.lines.length).join(",")])

	if (phase < 2) return null
	const conflict = script?.conflict
	const a = conflict ? calls.findIndex(call => call.person.id === conflict.between[0]) : -1
	const b = conflict ? calls.findIndex(call => call.person.id === conflict.between[1]) : -1
	const showConflict = conflict && a >= 0 && b >= 0 && calls[a].done && calls[b].done
	const talkingCount = calls.filter(call => call.talking).length
	const doneCount = calls.filter(call => call.done).length

	return (
		<section className="sc" aria-labelledby="sc-title">
			<header className="sc-head">
				<div>
					<h2 id="sc-title">{finished ? "What the stakeholders told MAX" : `MAX is talking to ${calls.length} stakeholders`}</h2>
					<p>{finished
						? `${doneCount} interviews done${showConflict ? ", and one disagreement found" : ""}. Every answer is tested against the sources before it counts.`
						: `${talkingCount} in conversation, ${doneCount} done. ${script ? "A replay: these interviews run over days in practice." : "Each interview adapts to what the records couldn’t answer."}`}</p>
				</div>
				<DsButton size="sm" onClick={onOpenPeople}><UsersThree size={14} />Stakeholder program</DsButton>
			</header>
			<ol className="sc-grid" style={{ ["--sc-cols" as string]: calls.length }}>
				{calls.map((call, index) => (
					<li key={call.person.id} className={`sc-call${call.done ? " is-done" : call.talking ? " is-talking" : " is-waiting"}${showConflict && (index === a || index === b) ? " is-conflict" : ""}`}>
						<div className="sc-who">
							<VoiceOrb state={call.state} level={levels[index]} size="xs" />
							<div>
								<strong>{call.person.name}</strong>
								<span>{call.person.role}</span>
							</div>
						</div>
						<p className="sc-channel">{call.person.channel === "Voice" ? <Microphone size={12} aria-hidden="true" /> : <ChatCircleText size={12} aria-hidden="true" />}{call.person.channel === "Voice" ? "Voice call" : call.person.channel === "Workshop" ? "Workshop" : "Text interview"} · {call.done ? "Done" : call.talking ? "In conversation" : "Waiting"}</p>
						{call.scripted ? (
							<ol className="sc-lines" aria-live="off">
								{call.lines.map((line, at) => <li key={at} className={line.by === "max" ? "is-max" : "is-them"}>{line.text}</li>)}
							</ol>
						) : (
							<p className="sc-focus">Covering {call.person.focus.replace(/\.$/, "").toLowerCase()}</p>
						)}
						{call.done && call.scripted ? <p className="sc-insight"><CheckCircle size={14} weight="fill" aria-hidden="true" />{call.scripted.insight}</p> : null}
					</li>
				))}
			</ol>
			{showConflict && conflict ? (
				<div className="sc-conflict" style={{ ["--sc-from" as string]: Math.min(a, b), ["--sc-to" as string]: Math.max(a, b), ["--sc-cols" as string]: calls.length }}>
					<span className="sc-bracket" aria-hidden="true" />
					<p><strong>{calls[a].person.name.split(" ")[0]} and {calls[b].person.name.split(" ")[0]} disagree.</strong> {conflict.summary}</p>
					{decisionPending ? <DsButton size="sm" variant="primary" onClick={onJumpToDecision}>Review the decision<ArrowRight size={14} /></DsButton> : null}
				</div>
			) : null}
		</section>
	)
}
