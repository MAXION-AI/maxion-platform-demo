import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useReducedMotion } from "motion/react"
import { Play } from "@phosphor-icons/react"
import { ArrowsClockwise, Bell, Database, Hammer, Lock, PencilSimpleLine, Rocket, SpeakerHigh, UserCircle, Waveform } from "./glyphs"

import { Button as DsButton, Mark } from "@/design/primitives"
import { MINUTE } from "./engine/engine"
import { SCENARIOS, type Capability } from "./engine/scenarios"
import { accountable, clockLabel, needsYou, shortTime } from "./engine/selectors"
import type { AgentixState } from "./engine/types"
import { checksOf, floorMinWidth, floorPlan, labelPoint, layoutFloor, liveFlows, latestVerifiedCycle, packetsFor, presenceById, roundedPath, route, type FloorPlan, type Measure, type Packet } from "./floor"
import { AgentRoom, type RoomSelection } from "./AgentRoom"
import { FloorTalk, briefingFor } from "./FloorTalk"
import "./team-floor.css"

/*
 * The team floor: the deployed team as a live view. Before, the deployed engagement opened on a
 * list (Now, Delivery, Exceptions) with the team as four text rows in an aside; clicking a
 * teammate opened its milestone, and every message went to the accountable agent.
 *
 * Here the team reads as one calm hierarchy: you at the top, the accountable agent under you, the
 * specialists in a row, and the systems they may use along the bottom. Only the team's own lines
 * are always drawn. What the engine is doing right now draws on top: a line to a system runs while a
 * step uses it, work handed between specialists travels along the team's lines, a decision climbs
 * to you, a failed check marks the seat that built it, and a lost release acknowledgement is read
 * back rather than resent. Looking at an agent shows where it may reach. Selecting a seat opens
 * that teammate's room, where the owner can talk to it.
 *
 * It is a view, not an editor: nothing is wired or configured here (the operating model's rule).
 */

type Size = { width: number; height: number }
/* Engagements whose team has already assembled on screen this session. */
const assembled = new Set<string>()

const CAPABILITY: Record<Capability, { label: string; icon: JSX.Element }> = {
	read: { label: "Read only", icon: <Database size={14} /> },
	build: { label: "Build and test", icon: <Hammer size={14} /> },
	production: { label: "Production", icon: <Rocket size={14} /> },
	update: { label: "Record update", icon: <PencilSimpleLine size={14} /> },
	notify: { label: "Notify", icon: <Bell size={14} /> },
}

export function TeamFloor({ state, engagementId, update, onDecide, onOpenWork, onOpenResult, onToast }: {
	state: AgentixState
	engagementId: string
	update: (recipe: (state: AgentixState) => AgentixState) => void
	onDecide: (decisionId: string, option: string) => void
	onOpenWork: (id: string) => void
	onOpenResult: (id: string) => void
	onToast: (text: string) => void
}) {
	const reduced = Boolean(useReducedMotion())
	const markers = useId().replace(/:/g, "")
	const engagement = state.engagements[engagementId]
	const lead = accountable(engagement)
	const plan = useMemo(() => floorPlan(state, engagementId), [state.engagements, engagementId])
	const flows = liveFlows(state, engagementId)
	const presence = presenceById(state, engagementId)
	const waiting = needsYou(state, engagementId).filter(entry => entry.kind !== "proposal")
	const canvasRef = useRef<HTMLDivElement>(null)
	const talkRef = useRef<HTMLDivElement>(null)
	const [size, setSize] = useState<Size>({ width: 0, height: 0 })
	const [talkHeight, setTalkHeight] = useState(0)
	// The list view draws no lines, so nothing is sent along them (read by effects declared before it is computed).
	const compactRef = useRef(false)
	// A room opens when a seat is chosen, and yours opens by itself when something waits on you;
	// otherwise the floor has the whole width.
	const [selected, setSelected] = useState<RoomSelection | null>(() => waiting.length ? { kind: "owner" } : null)
	const asks = waiting.map(entry => entry.key).join("|")
	const asked = useRef(asks)
	useEffect(() => {
		const before = new Set(asked.current.split("|").filter(Boolean))
		asked.current = asks
		if (asks.split("|").some(key => key && !before.has(key))) setSelected(current => current?.kind === "agent" ? current : { kind: "owner" })
	}, [asks])
	const [hovered, setHovered] = useState<string | null>(null)
	const [packets, setPackets] = useState<(Packet & { key: string })[]>([])
	const [spotlight, setSpotlight] = useState<string[]>([])
	const [talkOpen, setTalkOpen] = useState(false)
	// Closing a room or the talk bar puts focus back on what opened it, after the render that removes it.
	const sectionRef = useRef<HTMLElement>(null)
	const [returnTo, setReturnTo] = useState<string | null>(null)
	useEffect(() => {
		if (!returnTo) return
		sectionRef.current?.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(returnTo)}"]`)?.focus({ preventScroll: true })
		setReturnTo(null)
	}, [returnTo])
	const closeRoom = () => { if (selected) setReturnTo(selected.kind === "owner" ? "owner" : selected.id); setSelected(null) }
	const [briefing, setBriefing] = useState<string | null>(null)
	const [replay, setReplay] = useState<{ index: number; ids: string[] } | null>(null)
	const [arriving] = useState(() => {
		// The team assembles on the floor once, the first time it is shown after activation.
		const activated = state.events.find(event => event.engagementId === engagementId && event.actor === "owner" && event.kind === "notice" && /^You activated/.test(event.text))
		const fresh = !!activated && state.clock - activated.at <= 3 * MINUTE && !assembled.has(engagementId)
		assembled.add(engagementId)
		return fresh && !reduced
	})

	// The canvas lays itself out to whatever room it has; while talking, the talk dock takes the bottom.
	useLayoutEffect(() => {
		const node = canvasRef.current
		if (!node) return
		const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight })
		measure()
		const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
		observer?.observe(node)
		return () => observer?.disconnect()
	}, [])
	useLayoutEffect(() => {
		const node = talkRef.current
		if (!talkOpen || !node) { setTalkHeight(0); return }
		const measure = () => setTalkHeight(node.offsetHeight)
		measure()
		const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
		observer?.observe(node)
		return () => observer?.disconnect()
	}, [talkOpen])
	// Names are measured in the floor's own font, so the layout knows which wrap and how far; once the
	// web font has loaded the floor measures again.
	const [fonts, setFonts] = useState(0)
	useEffect(() => { let live = true; void document.fonts?.ready.then(() => { if (live) setFonts(value => value + 1) }); return () => { live = false } }, [])
	const measure = useMemo<Measure | undefined>(() => {
		const context = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null
		if (!context) return undefined
		return (text, kind) => {
			const family = canvasRef.current ? getComputedStyle(canvasRef.current).fontFamily : "Inter, sans-serif"
			context.font = `600 ${kind === "agent" ? 13 : 12}px ${family}`
			return context.measureText(text).width
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fonts])
	// Talking is about the team: the floor keeps its people in view and lets the systems rest.
	const layout = useMemo(() => layoutFloor(plan, size.width, Math.max(0, size.height - talkHeight), { systems: !talkOpen, measure }), [plan, size.width, size.height, talkHeight, talkOpen, measure])
	const { boxes } = layout

	// New engine events become packets travelling along the floor's lines.
	const seen = useRef<number>(Number(state.events.filter(event => event.engagementId === engagementId).at(-1)?.id.replace(/\D/g, "") ?? 0))
	useEffect(() => {
		const fresh = state.events.filter(event => event.engagementId === engagementId && Number(event.id.replace(/\D/g, "")) > seen.current)
		if (!fresh.length) return
		seen.current = Math.max(...fresh.map(event => Number(event.id.replace(/\D/g, ""))))
		if (reduced) return
		// Only what has a line to travel on: nothing waits off screen to fly in late.
		const next = packetsFor(state, engagementId, fresh).filter(packet => !compactRef.current && route(layout, plan, packet.from, packet.to)).map(packet => ({ ...packet, key: `${packet.id}:${Math.random().toString(36).slice(2, 7)}` }))
		if (next.length) setPackets(current => [...current, ...next].slice(-4))
		// The log is capped, so its length can stop changing; its newest id never does.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.events.at(-1)?.id])

	useEffect(() => { setPackets(current => current.filter(packet => !compactRef.current && route(layout, plan, packet.from, packet.to))) }, [layout, plan])

	// The assembly: the package arrives with the accountable agent, then each milestone goes to its first specialist.
	useEffect(() => {
		if (!arriving) return
		const first = state.work.filter(item => item.engagementId === engagementId && item.kind === "milestone")
		const timers: number[] = []
		timers.push(window.setTimeout(() => setPackets(current => [...current, { id: "intro-package", key: "intro-package", from: "owner", to: lead.id, label: "Discovery package", tone: "neutral" as const }]), 700))
		first.forEach((item, index) => {
			const owner = firstSpecialist(state, engagementId, item.template)
			timers.push(window.setTimeout(() => setPackets(current => [...current, { id: `intro-${item.id}`, key: `intro-${item.id}`, from: lead.id, to: owner, label: item.reference, tone: "neutral" as const }].slice(-4)), 2_000 + index * 700))
		})
		return () => timers.forEach(window.clearTimeout)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [arriving])

	// Replay: the engagement's own record, one event at a time, lighting who did it.
	const record = useMemo(() => state.events.filter(event => event.engagementId === engagementId && event.kind !== "instruction").sort((a, b) => a.at - b.at || Number(a.id.replace(/\D/g, "")) - Number(b.id.replace(/\D/g, ""))), [state.events, engagementId])
	useEffect(() => {
		if (!replay) return
		if (replay.index >= replay.ids.length) { const id = window.setTimeout(() => setReplay(null), 1_200); return () => window.clearTimeout(id) }
		const event = record.find(entry => entry.id === replay.ids[replay.index])
		if (event && !reduced) {
			const packet = packetsFor(state, engagementId, [event])[0]
			if (packet && route(layout, plan, packet.from, packet.to)) setPackets(current => [...current, { ...packet, key: `${packet.id}:replay:${replay.index}` }].slice(-4))
		}
		const id = window.setTimeout(() => setReplay(current => current ? { ...current, index: current.index + 1 } : current), reduced ? 900 : 650)
		return () => window.clearTimeout(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [replay?.index, replay?.ids])
	const replayEvent = replay ? record.find(entry => entry.id === replay.ids[Math.min(replay.index, replay.ids.length - 1)]) : undefined
	const startReplay = () => setReplay(current => current ? null : { index: 0, ids: record.slice(-40).map(event => event.id) })

	const cycle = latestVerifiedCycle(state, engagementId)
	const playBriefing = () => { setBriefing(briefingFor(state, engagementId)); setTalkOpen(true); setSelected(null) }
	const toggleTalk = () => { setBriefing(null); setTalkOpen(value => !value); setSelected(null) }

	const lit = new Set([...spotlight, ...(replayEvent ? [replayEvent.actor] : [])])
	const focus = hovered ?? (selected?.kind === "agent" ? selected.id : null)
	const reached = focus ? new Set(plan.reach.filter(reach => reach.agent === focus).map(reach => reach.system)) : null
	const ready = size.width > 0
	// Too narrow for a floor: the seats stack in a column, with the systems listed after them.
	const compact = ready && size.width < floorMinWidth(plan)
	compactRef.current = compact
	const place = (key: string): CSSProperties => {
		const box = boxes[key]
		if (compact) return {}
		if (!box) return { display: "none" }
		return { left: box.x - box.width / 2, top: box.y - box.height / 2, width: box.width, height: box.height }
	}
	const line = (from: string, to: string) => { const runs = route(layout, plan, from, to); return runs ? { d: roundedPath(runs), at: labelPoint(runs, boxes) } : null }

	// The team's lines: you to the accountable agent, and the accountable agent to each specialist.
	const team = [line("owner", lead.id), ...plan.agents.filter(agent => !agent.accountable).map(agent => line(lead.id, agent.id))].filter(Boolean)
	// Who waits on you: their line up to your seat turns amber (your seat says how many).
	const askers = Object.values(presence).filter(entry => entry.state === "decision" && boxes[entry.member.id]).map(entry => entry.member.id)
	// The toolbar keeps its words while it has room beside your seat, then keeps only Talk's, then none.
	const room = boxes.owner ? (size.width - boxes.owner.width) / 2 - 24 : 0
	const labels = compact || room >= 360 ? "all" : room >= 190 ? "talk" : "none"
	const toolbar = (
		<div className={`tf-tools is-${labels}`} role="toolbar" aria-label="Floor">
			{cycle ? <DsButton size="sm" aria-label="Morning briefing" title="Morning briefing" onClick={playBriefing}><SpeakerHigh size={14} /><span className="tf-tool-label">Morning briefing</span></DsButton> : null}
			<DsButton size="sm" aria-label="Replay" title="Replay" aria-pressed={!!replay} onClick={startReplay}><ArrowsClockwise size={14} /><span className="tf-tool-label">Replay</span></DsButton>
			<DsButton size="sm" className="is-talk" data-focus-key="talk" aria-label="Talk to the team" title="Talk to the team" aria-pressed={talkOpen} onClick={toggleTalk}><Waveform size={14} /><span className="tf-tool-label">Talk to the team</span></DsButton>
		</div>
	)
	const ownerSeat = (
		<button type="button" className={`tf-seat tf-owner${selected?.kind === "owner" ? " is-selected" : ""}${waiting.length ? " is-asking" : ""}`} style={place("owner")} data-focus-key="owner" onClick={() => setSelected({ kind: "owner" })} aria-label={`You, ${engagement.owner}${waiting.length ? `, ${waiting.length} waiting on you` : ""}`}>
			<UserCircle size={20} aria-hidden="true" />
			<span className="tf-seat-text"><strong>You</strong><small>{engagement.owner}</small></span>
			{waiting.length ? <span className="tf-count" aria-hidden="true">{waiting.length}</span> : null}
		</button>
	)

	const seatOf = (agent: FloorPlan["agents"][number], index: number) => {
		const entry = presence[agent.id]
		const checks = checksOf(state, engagementId, agent.id)
		const item = entry?.workId ? state.work.find(work => work.id === entry.workId) : undefined
		// The reference sits in its own tag, so the sentence doesn't repeat it.
		const sentence = (entry?.sentence ?? "Ready for incoming work").replace(item ? new RegExp(`\\s·\\s${item.reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) : /$^/, "").replace(/^./, char => char.toUpperCase())
		return (
			<button
				key={agent.id}
				type="button"
				className={`tf-seat tf-agent is-${entry?.state ?? "ready"}${selected?.kind === "agent" && selected.id === agent.id ? " is-selected" : ""}${lit.has(agent.id) ? " is-lit" : ""}`}
				style={{ ...place(agent.id), "--tf-delay": `${260 + index * 140}ms` } as CSSProperties}
				data-focus-key={agent.id}
				data-lines={compact ? undefined : Math.min(2, layout.lines[agent.id] ?? 1)}
				onClick={() => setSelected({ kind: "agent", id: agent.id })}
				onMouseEnter={() => setHovered(agent.id)}
				onMouseLeave={() => setHovered(null)}
				onFocus={() => setHovered(agent.id)}
				onBlur={() => setHovered(null)}
				aria-label={`${agent.member.name}${agent.accountable ? ", accountable" : ""}: ${entry?.sentence ?? "ready"}. Open its room.`}>
				<span className="tf-agent-head">
					<Mark seed={`${engagement.workflowId}:${agent.id}`} size="xs" />
					<strong>{agent.member.name}</strong>
					<span className={`tf-state is-${entry?.state ?? "ready"}`} aria-hidden="true" />
				</span>
				<span className="tf-agent-now">{sentence}</span>
				<span className="tf-agent-meta">
					{agent.accountable ? <span className="tf-role">Accountable</span> : null}
					{item ? <span className="tf-tag is-mono">{item.reference}</span> : null}
					{checks ? <span className={`tf-tag${checks.failed ? " is-danger" : ""}`}>{checks.failed ? `${checks.failed} of ${checks.total} failed` : `${checks.passed} of ${checks.total} checks`}{checks.repairing ? " · repaired" : ""}</span> : null}
				</span>
			</button>
		)
	}
	const systemOf = (system: FloorPlan["systems"][number], index: number) => {
		const flow = flows.find(entry => entry.system === system.id)
		const capability = CAPABILITY[system.link.capability]
		return (
			<div key={system.id} className={`tf-system${flow ? ` is-${flow.state}` : ""}${reached && !reached.has(system.id) ? " is-quiet" : ""}`} style={{ ...place(`system:${system.id}`), "--tf-delay": `${760 + index * 90}ms` } as CSSProperties} data-lines={compact ? undefined : Math.min(3, layout.lines[`system:${system.id}`] ?? 1)} title={`${system.link.access} · ${system.link.detail}`}>
				{compact || layout.systemTiles ? <span className="tf-system-icon" aria-hidden="true">{system.link.capability === "production" ? <Lock size={14} /> : capability.icon}</span> : null}
				<span className="tf-seat-text"><strong>{system.link.name}</strong><small>{capability.label}</small></span>
				{/* A release's state is said in words on the system it concerns, never by colour alone. */}
				{flow?.pill ? <span className={`tf-status is-${flow.state === "blocked" ? "danger" : "attention"}`}>{flow.pill}</span> : null}
			</div>
		)
	}

	return (
		<section ref={sectionRef} className={`tf${arriving ? " is-arriving" : ""}${talkOpen ? " is-talking" : ""}`} aria-label="Team floor">
			<div className={`tf-body${selected ? " has-room" : ""}`}>
				<div className={`tf-canvas${compact ? " is-compact" : ""}${layout.tight && !compact ? " is-tight" : ""}`} ref={canvasRef}>
					{ready && !compact ? (
						<>
							<svg className="tf-edges" width={size.width} height={size.height} aria-hidden="true">
								<defs>
									{(["line", "flow", "ask"] as const).map(tone => (
										<marker key={tone} id={`${markers}-${tone}`} className={`tf-arrow is-${tone}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0.5 L 7 4 L 0 7.5 z" /></marker>
									))}
								</defs>
								{team.map((edge, index) => <path key={`team-${index}`} className="tf-edge" d={edge!.d} markerEnd={`url(#${markers}-line)`} />)}
								{/* Where the agent you are looking at may reach: shown for that agent only. */}
								{focus ? plan.reach.filter(reach => reach.agent === focus && !flows.some(flow => flow.agent === reach.agent && flow.system === reach.system)).map(reach => {
									const edge = line(reach.agent, `system:${reach.system}`)
									return edge ? <path key={`reach-${reach.system}`} className={`tf-edge is-reach is-${reach.capability}`} d={edge.d} /> : null
								}) : null}
								{askers.map(id => { const edge = line(id, "owner"); return edge ? <path key={`ask-${id}`} className="tf-edge is-ask" d={edge.d} markerEnd={`url(#${markers}-ask)`} /> : null })}
								{/* What is moving now: reads come in to the agent, writes go out to the system. */}
								{flows.map(flow => {
									const edge = flow.direction === "in" ? line(`system:${flow.system}`, flow.agent) : line(flow.agent, `system:${flow.system}`)
									if (!edge) return null
									return (
										<g key={`${flow.agent}-${flow.system}`} className={`tf-reach is-active is-${flow.state} is-${flow.direction}`}>
											<path className="tf-edge is-live" d={edge.d} markerEnd={`url(#${markers}-flow)`} />
											<path className="tf-flow" d={edge.d} />
										</g>
									)
								})}
							</svg>

							{/* Packets travel along the lines, under the seats, so they pass behind whoever they go through. */}
							{packets.map(packet => {
								const edge = line(packet.from, packet.to)
								if (!edge) return null
								return <span key={packet.key} className={`tf-travel is-${packet.tone}`} style={{ offsetPath: `path("${edge.d}")` }} onAnimationEnd={() => setPackets(current => current.filter(entry => entry.key !== packet.key))} aria-hidden="true" />
							})}

							{ownerSeat}
							{plan.agents.map(seatOf)}
							{layout.systems ? plan.systems.map(systemOf) : null}

							{/* Labels sit on the lines, as the reference's edge pills do, and only where one fits clear of the cards. */}
							{packets.map(packet => {
								const edge = line(packet.from, packet.to)
								return edge?.at ? <span key={`label-${packet.key}`} className={`tf-pill is-travelling is-${packet.tone}`} style={{ left: edge.at.x, top: edge.at.y }} aria-hidden="true">{packet.label}</span> : null
							})}

							{toolbar}
						</>
					) : ready ? (
						<>
							{toolbar}
							{ownerSeat}
							{plan.agents.map(seatOf)}
							{plan.systems.length ? <p className="tf-list-label">Systems</p> : null}
							{plan.systems.map(systemOf)}
						</>
					) : null}
					{talkOpen ? (
						<div className="tf-talk-dock" ref={talkRef}>
							<FloorTalk
								state={state}
								engagementId={engagementId}
								update={update}
								script={briefing}
								onSpotlight={setSpotlight}
								onClose={() => { setTalkOpen(false); setBriefing(null); setSpotlight([]); setReturnTo("talk") }} />
						</div>
					) : null}
				</div>
				{selected ? <AgentRoom
					state={state}
					engagementId={engagementId}
					selection={selected}
					update={update}
					onSelect={setSelected}
					onClose={closeRoom}
					onDecide={onDecide}
					onOpenWork={onOpenWork}
					onOpenResult={onOpenResult}
					onToast={onToast} /> : null}
			</div>
			<FloorTimeline state={state} engagementId={engagementId} replaying={replayEvent ?? null} />
		</section>
	)
}

/* The specialist who takes a milestone first: the owner of its first step that isn't the owner's. */
function firstSpecialist(state: AgentixState, engagementId: string, template: string) {
	return SCENARIOS[state.engagements[engagementId].workflowId].templates[template]?.steps.find(step => step.owner !== "owner")?.owner ?? accountable(state.engagements[engagementId]).id
}

/* The engagement's record on a line: each event a tick, the next scheduled cycle ahead. During a
 * replay the line says what is being replayed, where the record is. */
function FloorTimeline({ state, engagementId, replaying }: { state: AgentixState; engagementId: string; replaying: AgentixState["events"][number] | null }) {
	const events = state.events.filter(event => event.engagementId === engagementId && event.kind !== "instruction")
	if (!events.length) return null
	const first = Math.min(...events.map(event => event.at))
	const span = Math.max(MINUTE, state.clock - first)
	const engagement = state.engagements[engagementId]
	return (
		<div className="tf-timeline" aria-label="Engagement timeline">
			{replaying ? <p className="tf-replay" role="status"><Play size={12} weight="fill" aria-hidden="true" /><time>{shortTime(replaying.at)}</time><span>{replaying.text}</span></p> : <span className="tf-time">{clockLabel(first)}</span>}
			<div className="tf-track">
				{events.slice(-80).map(event => (
					<span key={event.id} className={`tf-tick is-${event.kind}${event.tone === "attention" || event.tone === "danger" ? ` is-${event.tone}` : ""}${replaying?.id === event.id ? " is-now" : ""}`} style={{ left: `${((event.at - first) / span) * 100}%` }} title={`${clockLabel(event.at)} · ${event.text}`} />
				))}
			</div>
			<span className="tf-time">Now {clockLabel(state.clock)}{engagement.cycles !== "off" && engagement.nextOccurrence ? ` · next ${shortTime(Date.parse(engagement.nextOccurrence))}` : ""}</span>
		</div>
	)
}
