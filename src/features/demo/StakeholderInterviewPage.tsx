import { ArrowSquareOut, Briefcase, CheckCircle, Clock, PaperPlaneRight, ShieldCheck } from "@phosphor-icons/react"
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useDocumentTitle } from "@/app/hooks/useDocumentTitle"
import { publicAsset } from "@/lib/publicAsset"
import { Button as DsButton, TextButton } from "@/design/primitives"
import { SCENARIOS, type Person } from "@/features/discovery-autonomous/model"
import { demoScript } from "./scripts"
import { guideDemo, stakeholderWho } from "./session"
import "./demo.css"

/*
 * What a stakeholder receives. MAX interviews the owner inside the Discovery; everyone else is
 * interviewed through a link of their own, and this is the page at the end of it. It is a window
 * BESIDE the demo, like the presenter guide: it reads nothing the demo saved and writes nothing
 * back, so opening it never disturbs a run in progress.
 *
 * The interview is the scenario's own. A stakeholder's focus in the scenario names the ground MAX
 * has to cover with them, so each phrase in it becomes one topic, and the answers are theirs to
 * give -- the presenter speaks as the stakeholder, or uses the answer MAX suggests to keep moving.
 */

type Turn = { id: string; from: "max" | "stakeholder"; text: string }

/* The lockup, painted through a mask so it takes the page's foreground, as in the sidebar. */
const Lockup = () => (
	<span
		className="mxd-si-brand"
		style={{ "--mxp-lockup": `url(${publicAsset("maxion-logo-lockup-white.svg")})` } as CSSProperties}
		role="img"
		aria-label="MAXION"
	/>
)


/* Each phrase of a stakeholder's focus is one thing MAX has to cover with them. */
function topicsFor(person: Person) {
	return person.focus.split(/,\s*/).map(topic => topic.trim()).filter(Boolean)
}

/* MAX says why it is here once, not before every question. */
function greetingFor(person: Person, title: string, count: number) {
	const first = person.name.split(" ")[0]
	return `${first}, thank you for the time. I am MAX, running the Discovery on ${title}. ${count} question${count === 1 ? "" : "s"} on your ground, then I will leave you to it. Nothing here is attributed to you by name.`
}

/* The topic is written as the scenario wrote it: a proper noun stays a proper noun. */
function questionFor(topic: string, index: number, last: boolean) {
	if (index === 0) return `Start with ${topic}. How does it work today, and where does it go wrong?`
	if (last) return `Last one: ${topic}. Who decides when it is contested, and what would you change?`
	return `Now ${topic}. What does the record not show that I would need to know?`
}

/* A plausible answer in the stakeholder's own voice, so a presenter is never stuck for words. */
function suggestionFor(topic: string, index: number, last: boolean) {
	if (index === 0) return `It works until month-end. Volume triples, we go from a rule to memory, and that is where ${topic} slips.`
	if (last) return `It comes to me informally today. I would rather it were written down and owned by one named person, rather than whoever happens to be on the close.`
	return `The record shows what was decided, never why. Nobody writes the judgement down, so it reads cleaner than it is.`
}

export function StakeholderInterviewPage() {
	// Unlike the presenter guide, this page follows its address rather than fixing to the window it
	// opened in: a presenter moving between two stakeholders in one window must see the second one.
	// The deployed build routes inside the hash, so the address can change without a remount.
	const [address, setAddress] = useState(() => `${window.location.search}${window.location.hash}`)
	useEffect(() => {
		const read = () => setAddress(`${window.location.search}${window.location.hash}`)
		window.addEventListener("hashchange", read)
		window.addEventListener("popstate", read)
		return () => { window.removeEventListener("hashchange", read); window.removeEventListener("popstate", read) }
	}, [])
	const script = useMemo(() => demoScript(guideDemo()), [address])
	const scenario = SCENARIOS[script.scenarioKey]
	const asked = useMemo(() => stakeholderWho(), [address])
	// A named stakeholder, or the one MAX would write to first.
	const person = scenario.people.find(candidate => candidate.id === asked) ?? scenario.people[0]
	const topics = useMemo(() => topicsFor(person), [person])
	useDocumentTitle(`Stakeholder interview · ${scenario.title}`)

	const [view, setView] = useState<"landing" | "interview" | "closed">("landing")
	const [closing, setClosing] = useState<{ title: string; detail: string } | null>(null)
	const [consent, setConsent] = useState(false)
	const [turns, setTurns] = useState<Turn[]>([])
	const [asking, setAsking] = useState(0)
	const [draft, setDraft] = useState("")
	const composer = useRef<HTMLTextAreaElement>(null)
	const thread = useRef<HTMLDivElement>(null)

	const answered = turns.filter(turn => turn.from === "stakeholder").length
	const done = answered >= topics.length
	const current = topics[Math.min(asking, topics.length - 1)]

	// MAX opens with its first question, then asks the next one after each answer.
	useEffect(() => {
		if (view !== "interview") return
		if (turns.length && turns.at(-1)!.from === "max") return
		if (answered >= topics.length) return
		const index = answered
		const last = index === topics.length - 1
		const id = window.setTimeout(() => {
			setTurns(list => [
				...list,
				...index === 0 ? [{ id: "max-hello", from: "max" as const, text: greetingFor(person, scenario.title, topics.length) }] : [],
				{ id: `max-${index}`, from: "max" as const, text: questionFor(topics[index], index, last) },
			])
			setAsking(index)
		}, turns.length ? 700 : 0)
		return () => window.clearTimeout(id)
	}, [answered, person, scenario.title, topics, turns, view])

	useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight }) }, [turns])
	// A new address is a new interview: no answers, consent or closing state carry across.
	useEffect(() => { setView("landing"); setClosing(null); setConsent(false); setTurns([]); setAsking(0); setDraft("") }, [address])

	const send = (text: string) => {
		const said = text.trim()
		if (!said) return
		setTurns(list => [...list, { id: `me-${list.length}`, from: "stakeholder", text: said }])
		setDraft("")
		composer.current?.focus()
	}
	const close = (title: string, detail: string) => { setClosing({ title, detail }); setView("closed") }

	if (view === "closed" && closing) {
		return (
			<div className="mxd-guide ds-scope">
				<main className="mxd-si-closed">
					<Lockup />
					<CheckCircle size={28} weight="fill" aria-hidden="true" />
					<h1>{closing.title}</h1>
					<p>{closing.detail}</p>
					<TextButton onClick={() => { setClosing(null); setView("landing"); setTurns([]); setAsking(0); setConsent(false) }}>Show it again from the invitation</TextButton>
				</main>
			</div>
		)
	}

	if (view === "landing") {
		return (
			<div className="mxd-guide ds-scope">
				<main className="mxd-si-landing">
					<header className="mxd-si-head">
						<Lockup />
						<p className="mxd-kicker">Stakeholder interview</p>
						<h1>{scenario.title}</h1>
						<p>You have been invited to take part in a stakeholder interview.</p>
						<p className="mxd-detail">Decision deadline · {scenario.deadline}</p>
					</header>

					<section className="mxd-si-context" aria-label="Interview context">
						<div><Briefcase size={18} aria-hidden="true" /><span><small>Your role</small><strong>{person.role}, {person.department}</strong></span></div>
						<div><Clock size={18} aria-hidden="true" /><span><small>Estimated time</small><strong>~{Math.max(6, topics.length * 3)} minutes</strong></span></div>
						<div className="is-wide"><ShieldCheck size={18} aria-hidden="true" /><span><small>Confidentiality</small><strong>Your answers are anonymised in every deliverable</strong></span></div>
						<div className="is-wide"><span><small>Interview focus</small><strong className="mxd-si-focus">{scenario.objective}</strong></span></div>
					</section>

					<section className="mxd-si-topics" aria-label="What MAX will ask about">
						<p className="mxd-kicker">What MAX will ask you about</p>
						<ul>{topics.map(topic => <li key={topic}>{topic}</li>)}</ul>
					</section>

					<label className="mxd-si-consent">
						<input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />
						<span>I understand my answers inform this Discovery, and I consent to take part.</span>
					</label>

					<div className="mxd-actions">
						<DsButton variant="primary" disabled={!consent} onClick={() => setView("interview")}>Start the interview</DsButton>
						<DsButton onClick={() => close("Saved for later", "Your place is kept. The same link brings you back to where you stopped.")}>Save for later</DsButton>
						<TextButton onClick={() => close("Thank you for saying so", "MAX will ask the Discovery owner who holds this instead. Nothing else is needed from you.")}>I am not the right person</TextButton>
					</div>
				</main>
			</div>
		)
	}

	return (
		<div className="mxd-guide ds-scope">
			<main className="mxd-si-chat">
				<header className="mxd-si-chat-head">
					<div>
						<Lockup />
						<p className="mxd-kicker">Stakeholder interview · {person.name}</p>
						<h1>{scenario.title}</h1>
					</div>
					<p className="mxd-si-progress" role="status">{Math.min(answered, topics.length)} of {topics.length} topics{done ? " · ready to submit" : current ? ` · on ${current.toLowerCase()}` : ""}</p>
				</header>

				<div className="mxd-si-thread" ref={thread}>
					{turns.map((turn, index) => (
						<div key={turn.id} className={`mxd-si-turn is-${turn.from}`}>
							{/* One name per run of turns: the same speaker twice does not introduce itself twice. */}
							{turns[index - 1]?.from === turn.from ? null : <span className="mxd-si-who">{turn.from === "max" ? "MAX" : person.name}</span>}
							<p>{turn.text}</p>
						</div>
					))}
					{done ? <p className="mxd-si-complete"><CheckCircle size={14} weight="fill" aria-hidden="true" /> That covers everything MAX needed from you. Submit when you are ready.</p> : null}
				</div>

				<form className="mxd-si-composer" onSubmit={event => { event.preventDefault(); send(draft) }}>
					<textarea
						ref={composer}
						aria-label="Your answer"
						placeholder={done ? "Add anything else you want on the record…" : "Answer in your own words…"}
						value={draft}
						rows={2}
						onChange={event => setDraft(event.target.value)}
						onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(draft) } }}
					/>
					<div className="mxd-si-composer-foot">
						{done ? <span className="mxd-detail">Every topic is covered.</span> : <TextButton onClick={() => { setDraft(suggestionFor(current, asking, asking === topics.length - 1)); composer.current?.focus() }}>Suggest an answer</TextButton>}
						<div className="mxd-actions">
							<DsButton onClick={() => close("Progress saved", "The same link brings you back to this interview with your answers intact.")}>Continue later</DsButton>
							<DsButton type="submit" disabled={!draft.trim()}>Send<PaperPlaneRight size={13} /></DsButton>
							<DsButton variant="primary" disabled={!answered} onClick={() => close("Submitted", "Thank you. Your answers went to MAX, anonymised, and the Discovery continues without you having to chase it.")}>Finish and submit</DsButton>
						</div>
					</div>
				</form>
			</main>
		</div>
	)
}

/* The invitation a stakeholder would receive, for a presenter who wants to show the mail first. */
export function stakeholderInvitation(scenarioTitle: string, person: Person, link: string) {
	return `${person.name} — MAX is running a Discovery on ${scenarioTitle}. It needs 10 minutes on ${person.focus}. Your interview: ${link}`
}

export const StakeholderLink = ({ href }: { href: string }) => (
	<a className="mxd-si-link" href={href} target="_blank" rel="noreferrer">Open the stakeholder interview<ArrowSquareOut size={12} /></a>
)
