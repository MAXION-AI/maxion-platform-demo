import { artifactBy, artifactSpec, isTerminal, latest, releaseBy, scenarioOf, templateOf } from "./engine/engine"
import { SCENARIOS, type Capability, type Specialist, type SystemLink } from "./engine/scenarios"
import { accountable, teamOf, teamPresence, type Presence } from "./engine/selectors"
import type { ActivityEvent, AgentixState, Engagement } from "./engine/types"

/*
 * The team floor's model: where everyone sits and what is moving between them right now, derived
 * from the same engine state every other view reads. Nothing here is configured by the owner; the
 * floor is a live view of the deployed team, never a graph to edit.
 *
 * Seating, top to bottom: the owner, because decisions travel up to them; the accountable agent;
 * the specialists in one row; the systems the team may use along the bottom, each under whoever
 * reaches it.
 */

export const INBOUND: Capability[] = ["read", "build"]
export type Point = { x: number; y: number }
export type SeatAgent = { id: string; member: Specialist; accountable: boolean }
export type SeatSystem = { id: string; link: SystemLink }
/* An agent may use a system: the capability is the link's. */
export type Reach = { agent: string; system: string; capability: Capability }
export type FloorPlan = { agents: SeatAgent[]; systems: SeatSystem[]; reach: Reach[] }

/* The systems this engagement has activated: its founding systems plus any a package added. */
export function systemsOf(engagement: Engagement): SystemLink[] {
	return SCENARIOS[engagement.workflowId].systems.filter(system => !system.package || engagement.packages.includes(system.package))
}

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9/]+/).filter(word => word.length > 2)
/* Which systems a step names: "SQL Server + AWS PostgreSQL" names two, "Dashboards" names the finance dashboards. */
export function systemsForStep(system: string | undefined, links: SystemLink[]): SystemLink[] {
	if (!system) return []
	const parts = system.split(/\s*\+\s*/).map(part => part.trim().toLowerCase()).filter(Boolean)
	return links.filter(link => {
		const name = link.name.toLowerCase()
		return parts.some(part => name.includes(part) || part.includes(name) || (words(part).length > 0 && words(part).every(word => name.includes(word))))
	})
}

/* Which systems a specialist reaches: those its steps name, and those its tools list names. */
export function reachOf(state: AgentixState, engagementId: string): Reach[] {
	const engagement = state.engagements[engagementId]
	const links = systemsOf(engagement)
	const scenario = scenarioOf(state, engagementId)
	const team = teamOf(engagement)
	const found = new Map<string, Reach>()
	const lead = accountable(engagement)
	// Production belongs to the accountable agent: a specialist's work there is a release the coordinator makes.
	const add = (agent: string, link: SystemLink) => {
		if (!team.some(member => member.id === agent)) return
		if (link.capability === "production" && agent !== lead.id) return
		found.set(`${agent}→${link.id}`, { agent, system: link.id, capability: link.capability })
	}
	for (const template of Object.values(scenario.templates)) {
		for (const step of template.steps) {
			if (step.owner === "owner") continue
			for (const link of systemsForStep(step.system, links)) add(step.owner, link)
		}
	}
	for (const member of team) {
		const tools = member.tools.toLowerCase()
		for (const link of links) {
			const key = words(link.name).slice(0, 2)
			if (key.length && key.every(word => tools.includes(word))) add(member.id, link)
		}
	}
	// A system nobody's steps name still belongs to the team: the accountable agent holds it.
	for (const link of links) if (![...found.values()].some(reach => reach.system === link.id)) add(lead.id, link)
	return [...found.values()]
}

/* Who sits on the floor: the accountable agent first, then the specialists, then the systems. */
export function floorPlan(state: AgentixState, engagementId: string): FloorPlan {
	const engagement = state.engagements[engagementId]
	const lead = accountable(engagement)
	const specialists = teamOf(engagement).filter(member => member.id !== lead.id)
	const links = systemsOf(engagement)
	return {
		agents: [{ id: lead.id, member: lead, accountable: true }, ...specialists.map(member => ({ id: member.id, member, accountable: false }))],
		systems: links.map(link => ({ id: link.id, link })),
		reach: reachOf(state, engagementId),
	}
}

/* ---- Seating in pixels ----------------------------------------------------------
 * One calm hierarchy, top to bottom and centred: you; the accountable agent; the specialists in one
 * row; the systems along the bottom. Seats widen to the room the floor has, and names wrap rather
 * than truncate. When the systems need a second row it sits in the first row's gaps, so a line to
 * it runs down a gap instead of under a seat. Lines only ever run in the space between tiers and in
 * the gaps between seats (see route()). */
export type Box = { x: number; y: number; width: number; height: number }
export type FloorLayout = {
	boxes: Record<string, Box>
	/* The connector between the accountable agent and the specialists. */
	busY: number | null
	/* Where lines to the systems run sideways: one track per agent, so two flows never share a line. */
	lanes: Record<string, number>
	/* Vertical channels past the specialists' row, for the accountable agent's lines to the systems. */
	channels: number[]
	/* A short floor gives agents a tighter seat (one line of what they're doing). */
	tight: boolean
	systems: boolean
	/* How many lines each seat's name takes at its width: names wrap rather than truncate. */
	lines: Record<string, number>
	/* Narrow systems drop their icon tile so their names keep the width. */
	systemTiles: boolean
}
/* How wide a name sets: the floor passes the real font's measure; the fallback is Inter's average advance. */
export type Measure = (text: string, kind: "agent" | "system") => number
const averageMeasure: Measure = (text, kind) => text.length * (kind === "agent" ? 7.2 : 6.6)
/* Lines a name takes when it wraps at word breaks inside a width. */
export function lineCount(text: string, width: number, kind: "agent" | "system", measure: Measure = averageMeasure) {
	let lines = 1, current = ""
	for (const word of text.split(/\s+/)) {
		const next = current ? `${current} ${word}` : word
		if (current && measure(next, kind) > width) { lines += 1; current = word } else current = next
	}
	return lines
}
export const SEAT = { owner: 44, agent: 104, tight: 84, system: 44, system3: 60 }
const PAD_X = 24
const PAD_Y = 16
const GAP_X = 16
const SYS_GAP = 12
const SEAT_MIN = 168
const SEAT_MAX = 248
const SPINE_MAX = 264
const SYS_MAX = 208
const GAPS = { owner: [16, 40], bus: [24, 48], lane: [24, 64], rows: 12 } as const

const specialistsOf = (plan: FloorPlan) => plan.agents.filter(agent => !agent.accountable)
const leadOf = (plan: FloorPlan) => plan.agents.find(agent => agent.accountable) ?? plan.agents[0]

/* The narrowest floor that still seats the specialists in one row and the systems in two, with the
 * canvas toolbar clear of your seat; below it (a phone) the floor becomes a list. */
export function floorMinWidth(plan: FloorPlan) {
	const n = Math.max(1, specialistsOf(plan).length)
	const p = Math.ceil((plan.systems.length + 1) / 2)
	return Math.max(560, 2 * PAD_X + n * SEAT_MIN + (n - 1) * GAP_X, 2 * PAD_X + p * 112 + (p - 1) * SYS_GAP)
}

/* How the systems fill the bottom: one row, or a second row in the first one's gaps (floorMinWidth
 * keeps two rows enough). */
function systemRows(count: number, inner: number) {
	const width = (perRow: number) => Math.min(SYS_MAX, Math.floor((inner - (perRow - 1) * SYS_GAP) / Math.max(1, perRow)))
	const perRow = Math.max(1, Math.floor((inner + SYS_GAP) / (136 + SYS_GAP)))
	if (count <= perRow) return { first: count, rows: count ? 1 : 0, width: width(count) }
	const first = Math.ceil((count + 1) / 2)
	return { first, rows: 2, width: width(first) }
}

export function layoutFloor(plan: FloorPlan, width: number, height: number, options: { systems?: boolean; measure?: Measure } = {}): FloorLayout {
	const boxes: Record<string, Box> = {}
	const lead = leadOf(plan)
	const specialists = specialistsOf(plan)
	const n = specialists.length
	const inner = Math.max(0, width - 2 * PAD_X)
	const cx = width / 2
	const seat = n ? Math.max(SEAT_MIN, Math.min(SEAT_MAX, Math.floor((inner - (n - 1) * GAP_X) / n))) : SEAT_MAX
	// You and the accountable agent share a width; over a single specialist, its width, so the column stays true.
	const spine = n === 1 ? seat : Math.max(SEAT_MIN, Math.min(SPINE_MAX, inner))
	const showSystems = options.systems !== false && plan.systems.length > 0
	const sys = systemRows(showSystems ? plan.systems.length : 0, inner)
	// Names: an agent's sits beside its mark and state dot; a system's beside its tile, which a narrow system drops.
	const measure = options.measure ?? averageMeasure
	const lines: Record<string, number> = {}
	// Widths inside the cards: padding, border, and the mark, dot or tile beside the name.
	for (const agent of plan.agents) lines[agent.id] = lineCount(agent.member.name, (agent.accountable ? spine : seat) - 2 * 12 - 2 - 20 - 8 - 8 - 8, "agent", measure)
	// Systems keep their icon tiles while every name still fits in two lines beside one.
	const systemLines = (tiles: boolean) => plan.systems.map(system => lineCount(system.link.name, sys.width - 2 - 16 - (tiles ? 24 + 8 : 0), "system", measure))
	const systemTiles = systemLines(true).every(count => count <= 2)
	systemLines(systemTiles).forEach((count, index) => { lines[`system:${plan.systems[index].id}`] = count })
	const systemH = plan.systems.some(system => lines[`system:${system.id}`] > 2) ? SEAT.system3 : SEAT.system
	const sysBlock = sys.rows ? sys.rows * systemH + (sys.rows - 1) * GAPS.rows : 0

	// Vertical rhythm: the minimum gaps first; spare height opens them, then centres the whole team.
	// A short floor first tightens the agents' seats, then the gaps.
	const needed = (agentH: number, squeeze = 1) => (PAD_Y * 2 + GAPS.owner[0] + (n ? GAPS.bus[0] : 0) + (sys.rows ? GAPS.lane[0] : 0)) * squeeze + SEAT.owner + agentH + (n ? agentH : 0) + sysBlock
	const tight = needed(SEAT.agent) > height
	const agentH = tight ? SEAT.tight : SEAT.agent
	const squeeze = needed(agentH) > height ? 0.5 : 1
	let spare = Math.max(0, height - needed(agentH, squeeze))
	const opened: number[] = []
	const open = (gap: readonly [number, number], share: number, used: boolean) => {
		if (!used) return 0
		const extra = Math.min(gap[1] - gap[0] * squeeze, spare * share)
		opened.push(extra)
		return gap[0] * squeeze + extra
	}
	const gapOwner = open(GAPS.owner, 0.25, true)
	const gapBus = open(GAPS.bus, 0.3, n > 0)
	const gapLane = open(GAPS.lane, 0.45, sys.rows > 0)
	spare -= opened.reduce((sum, value) => sum + value, 0)

	let y = PAD_Y * squeeze + Math.max(0, spare) / 2
	boxes.owner = { x: cx, y: y + SEAT.owner / 2, width: spine, height: SEAT.owner }
	y += SEAT.owner + gapOwner
	if (lead) boxes[lead.id] = { x: cx, y: y + agentH / 2, width: spine, height: agentH }
	y += agentH
	let busY: number | null = null
	const channels: number[] = []
	if (n) {
		busY = y + gapBus / 2
		y += gapBus
		const total = n * seat + (n - 1) * GAP_X
		const left = cx - total / 2
		specialists.forEach((agent, index) => { boxes[agent.id] = { x: left + seat / 2 + index * (seat + GAP_X), y: y + agentH / 2, width: seat, height: agentH } })
		// The accountable agent's lines pass the specialists in the gaps between them, or beside the row.
		const outside = Math.min(24, left / 2)
		if (outside >= 8) channels.push(left - outside)
		for (let index = 0; index < n - 1; index += 1) channels.push(left + (index + 1) * seat + index * GAP_X + GAP_X / 2)
		if (outside >= 8) channels.push(left + total + outside)
		y += agentH
	}
	const lanes: Record<string, number> = {}
	plan.agents.forEach((agent, index) => { lanes[agent.id] = y + (gapLane * (index + 1)) / (plan.agents.length + 1) })
	y += gapLane

	if (sys.rows) {
		// Each system sits under whoever reaches it, so the lines to it stay short and rarely cross.
		const home = (system: SeatSystem, index: number) => {
			const xs = plan.reach.filter(reach => reach.system === system.id).map(reach => boxes[reach.agent]?.x).filter((value): value is number => value !== undefined)
			return { system, x: xs.length ? xs.reduce((sum, value) => sum + value, 0) / xs.length : cx, index }
		}
		const ordered = plan.systems.map(home).sort((a, b) => a.x - b.x || a.index - b.index).map(entry => entry.system)
		const firstTotal = sys.first * sys.width + (sys.first - 1) * SYS_GAP
		const firstSlots = Array.from({ length: sys.first }, (_, index) => cx - firstTotal / 2 + sys.width / 2 + index * (sys.width + SYS_GAP))
		const slots: Point[] = firstSlots.map(x => ({ x, y: y + systemH / 2 }))
		let rest = ordered.length - sys.first
		for (let row = 1; row < sys.rows && rest > 0; row += 1) {
			// The second row sits in the gaps of the first.
			const gaps = firstSlots.slice(0, -1).map(x => x + (sys.width + SYS_GAP) / 2)
			const take = Math.min(rest, gaps.length)
			// Symmetric about the centre: a centred run of gaps, or every other gap when the counts don't allow one.
			const spaced = (gaps.length - take) % 2 === 1 && 2 * take - 1 <= gaps.length
			const step = spaced ? 2 : 1
			const start = Math.floor((gaps.length - (take - 1) * step - 1) / 2)
			for (let index = 0; index < take; index += 1) slots.push({ x: gaps[start + index * step], y: y + row * (systemH + GAPS.rows) + systemH / 2 })
			rest -= take
		}
		slots.sort((a, b) => a.x - b.x || a.y - b.y)
		ordered.forEach((system, index) => {
			const slot = slots[index]
			if (slot) boxes[`system:${system.id}`] = { x: slot.x, y: slot.y, width: sys.width, height: systemH }
		})
	}
	return { boxes, busY, lanes, channels, tight, systems: sys.rows > 0, lines, systemTiles }
}

/* ---- Lines between seats ----------------------------------------------------------
 * Every line is a short orthogonal route with rounded corners that runs only between tiers and through
 * gaps, never under a card: down from you to the accountable agent; from its foot along the team
 * connector to a specialist; and to a system along that agent's own track. A route through the
 * accountable agent is two runs (above it and below it), so nothing is drawn under its card. */
export type Route = Point[][]
const topOf = (box: Box): Point => ({ x: box.x, y: box.y - box.height / 2 })
const bottomOf = (box: Box): Point => ({ x: box.x, y: box.y + box.height / 2 })

export function route(layout: FloorLayout, plan: FloorPlan, from: string, to: string): Route | null {
	const forward = path(layout, plan, from, to)
	if (forward) return forward
	const back = path(layout, plan, to, from)
	return back ? back.slice().reverse().map(run => run.slice().reverse()) : null
}

function path(layout: FloorLayout, plan: FloorPlan, from: string, to: string): Route | null {
	const { boxes, busY } = layout
	const lead = leadOf(plan)?.id
	const a = boxes[from], b = boxes[to]
	if (!a || !b || from === to) return null
	const isAgent = (key: string) => plan.agents.some(agent => agent.id === key)
	if (to.startsWith("system:") && isAgent(from)) {
		const lane = layout.lanes[from]
		const end = topOf(b)
		if (from === lead && layout.channels.length) {
			// Past the specialists through the nearest gap. Well under the accountable agent, straight down from
			// its foot; well clear of its side, out of its side with a visible step; near its edge, down from a
			// point on its foot set in from the corner, with a short jog into the gap under the team connector.
			const offset = (x: number) => Math.abs(x - a.x) - a.width / 2
			const cost = (x: number) => Math.max(0, offset(x)) + Math.abs(x - b.x)
			const channel = layout.channels.reduce((best, x) => cost(x) < cost(best) ? x : best, layout.channels[0])
			const side = channel < a.x ? -1 : 1
			const foot = a.y + a.height / 2
			if (offset(channel) <= -24) return [[{ x: channel, y: foot }, { x: channel, y: lane }, { x: b.x, y: lane }, end]]
			if (offset(channel) >= 16) return [[{ x: a.x + side * a.width / 2, y: a.y }, { x: channel, y: a.y }, { x: channel, y: lane }, { x: b.x, y: lane }, end]]
			const top = Math.min(...plan.agents.filter(agent => !agent.accountable).map(agent => boxes[agent.id].y - boxes[agent.id].height / 2))
			const jog = busY === null ? (foot + top) / 2 : (busY + top) / 2
			const start = a.x + side * (a.width / 2 - 24)
			return [[{ x: start, y: foot }, { x: start, y: jog }, { x: channel, y: jog }, { x: channel, y: lane }, { x: b.x, y: lane }, end]]
		}
		return [[bottomOf(a), { x: a.x, y: lane }, { x: b.x, y: lane }, end]]
	}
	if (from === "owner" && to === lead) return [[bottomOf(a), topOf(b)]]
	if (busY === null || !isAgent(to) || to === lead) return null
	const leadBox = boxes[lead]
	const branch = (start: Point): Point[] => [start, { x: start.x, y: busY }, { x: b.x, y: busY }, topOf(b)]
	if (from === "owner") return [[bottomOf(a), topOf(leadBox)], branch(bottomOf(leadBox))]
	if (from === lead) return [branch(bottomOf(a))]
	if (isAgent(from)) return [branch(topOf(a))]
	return null
}

/* A route as an SVG path: each run with rounded corners. */
export function roundedPath(runs: Route, radius = 8) {
	return runs.map(points => runPath(points, radius)).filter(Boolean).join(" ")
}
function runPath(points: Point[], radius: number) {
	const p = points.filter((point, index) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y)
	if (p.length < 2) return ""
	const length = (u: Point, v: Point) => Math.hypot(v.x - u.x, v.y - u.y)
	const toward = (u: Point, v: Point, distance: number) => { const total = length(u, v) || 1; return { x: u.x + ((v.x - u.x) * distance) / total, y: u.y + ((v.y - u.y) * distance) / total } }
	let d = `M ${p[0].x} ${p[0].y}`
	for (let index = 1; index < p.length - 1; index += 1) {
		const previous = p[index - 1], corner = p[index], next = p[index + 1]
		const r = Math.min(radius, length(previous, corner) / 2, length(corner, next) / 2)
		const into = toward(corner, previous, r), out = toward(corner, next, r)
		d += ` L ${into.x} ${into.y} Q ${corner.x} ${corner.y} ${out.x} ${out.y}`
	}
	const last = p[p.length - 1]
	return `${d} L ${last.x} ${last.y}`
}

/* Where a route's label sits: the middle of its longest level run, when a label fits along it clear
 * of every card. A vertical run is a narrow gap between cards, so a route without such a run has no
 * label; the dot travelling along it says enough. */
export function labelPoint(runs: Route, boxes: Record<string, Box> = {}, fit = 120): Point | null {
	const clear = (at: Point) => Object.values(boxes).every(box => Math.abs(at.y - box.y) >= box.height / 2 + 14 || Math.abs(at.x - box.x) >= box.width / 2 + fit / 2 + 4)
	let best: { at: Point; length: number } | null = null
	for (const points of runs) for (let index = 1; index < points.length; index += 1) {
		const u = points[index - 1], v = points[index]
		const length = Math.abs(v.x - u.x)
		const at = { x: (u.x + v.x) / 2, y: u.y }
		if (u.y === v.y && length >= fit && clear(at) && (!best || length > best.length)) best = { at, length }
	}
	return best?.at ?? null
}

/* The system a release changes: the production link its target names. */
export function releaseTarget(target: string, links: SystemLink[]) {
	const wanted = target.toLowerCase()
	const production = links.filter(link => link.capability !== "read" && link.capability !== "build")
	return production.find(link => wanted.includes(link.name.toLowerCase()))
		?? production.find(link => words(link.name).slice(0, 2).every(word => wanted.includes(word)))
		?? production.find(link => link.capability === "production")
}

/* ---- What is moving now ---------------------------------------------------- */
export type FlowState = "active" | "readback" | "blocked" | "waiting"
export type Flow = { agent: string; system: string; direction: "in" | "out"; state: FlowState; label: string; pill?: string }

export function liveFlows(state: AgentixState, engagementId: string): Flow[] {
	const engagement = state.engagements[engagementId]
	const links = systemsOf(engagement)
	const flows = new Map<string, Flow>()
	const set = (flow: Flow) => { const key = `${flow.agent}→${flow.system}`; const current = flows.get(key); if (!current || current.state === "active") flows.set(key, flow) }
	for (const item of state.work) {
		if (item.engagementId !== engagementId || isTerminal(item) || item.status === "paused") continue
		const template = templateOf(state, item)
		if (!template) continue
		item.steps.forEach((step, index) => {
			const spec = template.steps[index]
			if (!spec || spec.owner === "owner" || step.status !== "working") return
			for (const link of systemsForStep(spec.system, links)) {
				// A specialist building something for production works in its sandbox, not in production.
				if (link.capability === "production" && spec.kind !== "release" && spec.owner !== accountable(engagement).id) continue
				set({ agent: spec.owner, system: link.id, direction: INBOUND.includes(link.capability) ? "in" : "out", state: "active", label: spec.doing })
			}
		})
		for (const id of item.releaseIds) {
			const release = releaseBy(state, id)
			if (!release) continue
			const target = releaseTarget(release.target, links)
			if (!target) continue
			const lead = accountable(engagement).id
			if (release.status === "unknown") set({ agent: lead, system: target.id, direction: "in", state: "readback", label: `${release.reference}: outcome unknown · reading the target back, nothing resent`, pill: "Reading back" })
			else if (release.status === "releasing") set({ agent: lead, system: target.id, direction: "out", state: "active", label: `Releasing ${release.reference}` })
			else if (release.status === "blocked") set({ agent: lead, system: target.id, direction: "out", state: "blocked", label: `${release.reference} blocked · release permission lost`, pill: "Blocked" })
			else if (release.status === "awaiting_approval" || release.status === "held") set({ agent: lead, system: target.id, direction: "out", state: "waiting", label: release.status === "held" ? `${release.reference} held for its window` : `${release.reference} waits for your approval`, pill: release.status === "held" ? "Held for its window" : "Awaits your approval" })
		}
	}
	return [...flows.values()]
}

/* The checks on what a specialist built, for the ring on its seat: passed, failed and total. */
export function checksOf(state: AgentixState, engagementId: string, agentId: string) {
	const owned = state.artifacts.filter(artifact => artifact.engagementId === engagementId && artifactSpec(state, artifact)?.owner === agentId)
	const testing = owned.map(artifact => ({ artifact, version: latest(artifact) })).filter(({ version }) => version.checks.length && (version.status === "testing" || version.status === "failed" || version.checks.some(check => check.status === "failed")))
	const current = testing.at(-1)
	if (!current) return null
	const passed = current.version.checks.filter(check => check.status === "passed").length
	const failed = current.version.checks.filter(check => check.status === "failed").length
	return { title: `${current.artifact.title} v${current.version.version}`, passed, failed, total: current.version.checks.length, repairing: current.version.source === "repair" }
}

/* ---- Things that just moved: the packets the floor animates ----------------- */
export type Packet = { id: string; from: string; to: string; label: string; tone: "neutral" | "attention" | "positive" }
const OWNER = "owner"

/* Turns new engine events into packets: work handed between specialists, decisions to and from the owner, releases to their target. */
export function packetsFor(state: AgentixState, engagementId: string, events: ActivityEvent[]): Packet[] {
	const engagement = state.engagements[engagementId]
	const lead = accountable(engagement).id
	const team = teamOf(engagement).map(member => member.id)
	const links = systemsOf(engagement)
	const packets: Packet[] = []
	for (const event of events) {
		if (event.kind === "handoff" && event.from && event.to) {
			const artifact = event.artifactId ? artifactBy(state, event.artifactId) : undefined
			packets.push({ id: event.id, from: event.from, to: event.to, label: artifact ? `${artifact.title} v${latest(artifact).version}` : "Work", tone: "neutral" })
		} else if (event.kind === "decision" && event.actor !== OWNER && event.tone === "attention") {
			packets.push({ id: event.id, from: team.includes(event.actor) ? event.actor : lead, to: OWNER, label: "Needs you", tone: "attention" })
		} else if (event.kind === "decision" && event.actor === OWNER) {
			const item = event.workItemId ? state.work.find(entry => entry.id === event.workItemId) : undefined
			const template = item ? templateOf(state, item) : undefined
			const next = item && template ? template.steps.find((spec, index) => spec.owner !== OWNER && item.steps[index]?.status !== "done" && item.steps[index]?.status !== "skipped")?.owner : undefined
			packets.push({ id: event.id, from: OWNER, to: next ?? lead, label: "Your decision", tone: "positive" })
		} else if (event.kind === "release" && event.releaseId) {
			const release = releaseBy(state, event.releaseId)
			const target = release ? releaseTarget(release.target, links) : undefined
			if (!release || !target) continue
			if (/applied:/.test(event.text)) packets.push({ id: event.id, from: lead, to: `system:${target.id}`, label: `${release.reference} applied`, tone: "positive" })
			else if (/reconciled:/.test(event.text)) packets.push({ id: event.id, from: `system:${target.id}`, to: lead, label: "Read back · applied once", tone: "positive" })
			else if (/outcome unknown/.test(event.text)) packets.push({ id: event.id, from: lead, to: `system:${target.id}`, label: "No acknowledgement", tone: "attention" })
		}
	}
	return packets
}

/* Each teammate's presence, keyed by id, for the seats. */
export function presenceById(state: AgentixState, engagementId: string): Record<string, Presence> {
	return Object.fromEntries(teamPresence(state, engagementId).map(entry => [entry.member.id, entry]))
}

/* The latest verified daily cycle, for the morning briefing. */
export function latestVerifiedCycle(state: AgentixState, engagementId: string) {
	return state.work.filter(item => item.engagementId === engagementId && item.kind === "cycle" && item.status === "verified").sort((a, b) => (b.finished ?? 0) - (a.finished ?? 0))[0]
}
