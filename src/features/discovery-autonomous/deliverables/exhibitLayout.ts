import { figures, textWidth, wrapParts, wrapText } from "./textMetrics"
import type { ArchitectureEdge, ArchitectureNode, Exhibit } from "./types"

/*
 * Geometry for the exhibits whose text has to fit shapes: waterfall category
 * labels under their bars, and architecture diagrams with node cards and
 * labelled edges. Everything is computed from measured text widths in viewBox
 * units, so a label wraps before it meets its neighbour, node text never leaves
 * its card, and an edge label never sits on a card or on another edge.
 */

export const EXHIBIT_TEXT = 12
export const EXHIBIT_LINE = 16

/* — Values — */

export const roundValue = (value: number) => Math.round(value * 100) / 100

// Currency reads as a prefix ($8.4m), ratios and percentages as a suffix with no
// space (2.6×, 32%), and everything else as a value with its unit after it.
const CURRENCY_UNIT = /^([$€£])(k|m|bn)?$/

export function formatValue(value: number, unit?: string): string {
	// A negative amount carries its sign ahead of the currency: −$6.2m, not $-6.2m.
	if (value < 0) return `−${formatValue(-value, unit)}`
	const body = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)
	if (!unit) return body
	if (unit === "%") return `${body}%`
	if (unit === "×") return `${body}×`
	const currency = CURRENCY_UNIT.exec(unit)
	if (currency) return `${currency[1]}${body}${currency[2] ?? ""}`
	return `${body} ${unit}`
}

/* — Bars —
 * Labels sit in a fixed gutter; the plot ends where the widest value label still
 * fits after the longest bar, and never later than 84 units from the edge. */

export const BAR_GUTTER = 214
export const BAR_VALUE_GAP = 10

export function barPlotEnd(exhibit: Extract<Exhibit, { kind: "bar" }>, width: number) {
	const widest = Math.max(...exhibit.data.map((item) => textWidth(formatValue(item.value, exhibit.unit), EXHIBIT_TEXT, figures(item.emphasis ? 600 : 500))))
	return Math.min(width - 84, width - BAR_VALUE_GAP - 2 - widest)
}

/* — Lines —
 * Five gridlines from the lowest value (or zero) to the highest, and a value
 * axis as wide as its widest label. */

export function lineAxis(exhibit: Extract<Exhibit, { kind: "line" }>) {
	const all = exhibit.series.flatMap((series) => series.points).concat(exhibit.band ? [exhibit.band.value] : [])
	const max = Math.max(...all)
	const min = Math.min(...all, 0)
	const span = max - min || 1
	const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
		const value = min + step * span
		return { value, label: formatValue(roundValue(value), exhibit.unit) }
	})
	const widest = Math.max(...grid.map((line) => textWidth(line.label, EXHIBIT_TEXT, figures(400))))
	return { min, span, grid, left: Math.max(58, Math.ceil(widest) + 12) }
}

/* — Waterfall — */

// Category labels wrap inside their own column, one word per line if need be.
export function waterfallLabelLines(label: string, slot: number) {
	return wrapText(label, slot - 12, EXHIBIT_TEXT, figures(400))
}

/* — Timeline —
 * A bar's label sits inside the bar when it fits there, beside it when the lane
 * has room before the next bar or the frame's edge, and otherwise under the bar,
 * in a lane made taller for it. No label is ever cut short. */

const TIMELINE_LANE = 46
const TIMELINE_BELOW = 18
const TIMELINE_GAP = 8

export type TimelineBarLayout = { x: number; y: number; width: number; label: { x: number; y: number; anchor: "start" | "end"; inside: boolean } }
export type TimelineLayout = { lanes: Array<{ top: number; height: number; bars: TimelineBarLayout[] }>; bottom: number }

export function layoutTimeline(exhibit: Extract<Exhibit, { kind: "timeline" }>, frame: { labelWidth: number; plotEnd: number; top: number; width: number }): TimelineLayout {
	const unit = (frame.plotEnd - frame.labelWidth) / exhibit.ticks.length
	let top = frame.top
	const lanes = exhibit.lanes.map((lane) => {
		const spans = lane.bars.map((bar) => ({ x: frame.labelWidth + bar.start * unit + 2, width: Math.max(10, bar.span * unit - 4) }))
		const order = spans.map((_, index) => index).sort((a, b) => spans[a].x - spans[b].x)
		const placed = lane.bars.map((bar, index) => {
			const { x, width } = spans[index]
			const rank = order.indexOf(index)
			const nextStart = rank < order.length - 1 ? spans[order[rank + 1]].x : frame.width
			const previousEnd = rank > 0 ? spans[order[rank - 1]].x + spans[order[rank - 1]].width : frame.labelWidth
			// Inside a bar the label is set as .exh-inset (600), beside or below it as .exh-value (500); both use tabular figures.
			const beside = textWidth(bar.label, EXHIBIT_TEXT, figures(500))
			if (textWidth(bar.label, EXHIBIT_TEXT, figures(600)) + 20 <= width) return { x, width, place: "inside" as const, labelX: x + 10, anchor: "start" as const }
			if (x + width + TIMELINE_GAP + beside <= nextStart - TIMELINE_GAP) return { x, width, place: "beside" as const, labelX: x + width + TIMELINE_GAP, anchor: "start" as const }
			if (x - TIMELINE_GAP - beside >= previousEnd + TIMELINE_GAP) return { x, width, place: "beside" as const, labelX: x - TIMELINE_GAP, anchor: "end" as const }
			const fitsFromStart = x + beside <= frame.width - 2
			return { x, width, place: "below" as const, labelX: fitsFromStart ? x : x + width, anchor: fitsFromStart ? "start" as const : "end" as const }
		})
		const height = TIMELINE_LANE + (placed.some((bar) => bar.place === "below") ? TIMELINE_BELOW : 0)
		const laneTop = top
		top += height
		return {
			top: laneTop,
			height,
			bars: placed.map((bar) => ({
				x: bar.x,
				y: laneTop + 12,
				width: bar.width,
				label: { x: bar.labelX, y: bar.place === "below" ? laneTop + 36 + 15 : laneTop + 28, anchor: bar.anchor, inside: bar.place === "inside" },
			})),
		}
	})
	return { lanes, bottom: top }
}

/* — Quadrant —
 * Each point's label takes the first free spot around its dot: above, below,
 * beside, then diagonally, inside the plot and clear of every other label and
 * dot. The emphasised points choose first. */

export type QuadrantLabel = { x: number; y: number; anchor: "start" | "middle" | "end" }

export function layoutQuadrantLabels(points: Array<{ label: string; x: number; y: number; emphasis?: boolean }>, frame: { left: number; right: number; top: number; bottom: number }): QuadrantLabel[] {
	const cx = (value: number) => frame.left + (value / 100) * (frame.right - frame.left)
	const cy = (value: number) => frame.bottom - (value / 100) * (frame.bottom - frame.top)
	const radius = (point: { emphasis?: boolean }) => (point.emphasis ? 8 : 6)
	const dots = points.map((point) => ({ x0: cx(point.x) - radius(point) - 2, x1: cx(point.x) + radius(point) + 2, y0: cy(point.y) - radius(point) - 2, y1: cy(point.y) + radius(point) + 2 }))
	type Box = { x0: number; x1: number; y0: number; y1: number }
	const hits = (a: Box, b: Box, margin = 0) => a.x0 < b.x1 + margin && b.x0 < a.x1 + margin && a.y0 < b.y1 + margin && b.y0 < a.y1 + margin
	const taken: Box[] = []
	const result: QuadrantLabel[] = points.map(() => ({ x: 0, y: 0, anchor: "middle" }))
	const order = points.map((_, index) => index).sort((a, b) => Number(Boolean(points[b].emphasis)) - Number(Boolean(points[a].emphasis)) || a - b)
	for (const index of order) {
		const point = points[index]
		const x = cx(point.x)
		const y = cy(point.y)
		const r = radius(point)
		const width = textWidth(point.label, EXHIBIT_TEXT, point.emphasis ? 600 : 400)
		const candidates: QuadrantLabel[] = [
			{ x, y: y - r - 6, anchor: "middle" },
			{ x, y: y + r + 15, anchor: "middle" },
			{ x: x + r + 6, y: y + 4, anchor: "start" },
			{ x: x - r - 6, y: y + 4, anchor: "end" },
			{ x: x - r, y: y - r - 6, anchor: "start" },
			{ x: x + r, y: y - r - 6, anchor: "end" },
			{ x: x - r, y: y + r + 15, anchor: "start" },
			{ x: x + r, y: y + r + 15, anchor: "end" },
		]
		const boxOf = (candidate: QuadrantLabel): Box => {
			const x0 = candidate.anchor === "start" ? candidate.x : candidate.anchor === "middle" ? candidate.x - width / 2 : candidate.x - width
			return { x0: x0 - 2, x1: x0 + width + 2, y0: candidate.y - 11, y1: candidate.y + 3 }
		}
		const inside = (box: Box) => box.x0 >= frame.left + 2 && box.x1 <= frame.right - 2 && box.y0 >= frame.top + 2 && box.y1 <= frame.bottom - 2
		const free = (box: Box) => inside(box) && taken.every((other) => !hits(box, other, 2)) && dots.every((dot) => !hits(box, dot))
		const chosen = candidates.find((candidate) => free(boxOf(candidate)))
			?? candidates.find((candidate) => inside(boxOf(candidate)) && taken.every((other) => !hits(boxOf(candidate), other)))
			?? candidates[0]
		taken.push(boxOf(chosen))
		result[index] = chosen
	}
	return result
}

/* — Architecture —
 * Lanes are equal columns across the exhibit's frame, the plot's own width in
 * CSS pixels, so the text renders at the size of every other exhibit's text.
 * Nodes are cards and each row takes the height of its tallest card. Edge
 * labels are pills, as on the reference's workflow canvas, and a pill only ever
 * sits in a channel: the band above the first row, between two rows, or below
 * the last. A channel gains one track per pill or crossing run that needs its
 * own line, and every order of the labels is tried so the tightest layout wins. */

/* The widest frame an exhibit is drawn at, and the narrowest before its plot
 * scrolls inside its card. Below 650 a quadrant label runs out of free places. */
export const EXHIBIT_FRAME_MAX = 720
export const EXHIBIT_FRAME_MIN = 650
const LANE_GAP = 32
const BAND_PAD = 8
const HEAD = 28
const NODE_PAD_LEFT = 14
const NODE_PAD_RIGHT = 10
const NODE_PAD_Y = 10
const NODE_MIN = 44
// A channel between rows is always at least one track tall, so row spacing stays even.
const TRACK = 26
const TRACK_PAD = 6
const CHANNEL_MIN = TRACK + 2 * TRACK_PAD
const PILL_HEIGHT = 18
const PILL_PAD = 8
const PILL_CLEARANCE = 6
const RUN_CLEARANCE = 4
const DROP_CLEARANCE = 8
const STUB = 7
const SLOT = 8
const STEP = 2
// How far from a card's centre a loop to its neighbour may leave or enter it.
const ATTACH = [16, 28, 40, 52]
const MAX_TRACKS = 4
const MAX_ORDERINGS = 720
const DETOUR_COST = 1.5
const FALLBACK_COST = 1000

type Interval = { from: number; to: number }
// A vertical run's reach through one channel, in tracks.
type Reach = { channel: number; first: number; last: number }
type Drop = { x: number; reach: Reach }
type Ends = [number, number]

export type LaidNode = { node: ArchitectureNode; x: number; y: number; width: number; height: number; title: string[]; detail: string[] }
export type LaidPill = { x: number; y: number; width: number; height: number; label: string }
export type LaidEdge = { edge: ArchitectureEdge; d: string; pill: LaidPill | null; partner: number | null }
export type ArchitectureLayout = {
	width: number
	height: number
	lanes: Array<{ label: string; x: number; y: number; width: number; height: number }>
	nodes: LaidNode[]
	edges: LaidEdge[]
}

// How an edge travels between cards.
// lane: straight down or up inside one lane. step: across one gap between rows;
// when its label cannot sit on the gap line, it may hook into the channel beside
// its target and enter the card from above or below. straight: across one gap in
// one row. loop: to the neighbouring card in the same row by way of the channel
// above or below it. across: over one or more lanes by way of a channel.
type Route =
	| { kind: "lane"; x: number; channels: number[] }
	| { kind: "step"; x: number; channels: number[]; hook: { channel: number; ends: Ends[] } }
	| { kind: "straight" }
	| { kind: "loop"; channels: number[]; ends: Ends[] }
	| { kind: "across"; channels: number[]; ends: Ends[] }

type Plan = { index: number; edge: ArchitectureEdge; from: ArchitectureNode; to: ArchitectureNode; route: Route; pillWidth: number; preferred: number; partner: number | null }
type Choice = { channel: number; track: number; center: number; ends: Ends | null }
type Placed = {
	index: number
	source: string
	choice: Choice | null
	pill: { channel: number; track: number; span: Interval } | null
	run: { channel: number; track: number; span: Interval; start: number } | null
	drops: Drop[]
}

const overlaps = (a: Interval, b: Interval, margin = 0) => a.from < b.to + margin && b.from < a.to + margin
// A line passing a pill keeps a clear margin from its edge.
const within = (x: number, span: Interval) => x > span.from - DROP_CLEARANCE && x < span.to + DROP_CLEARANCE
const reaches = (reach: Reach, channel: number, track: number) => reach.channel === channel && track >= reach.first && track <= reach.last
const full = (channel: number): Reach => ({ channel, first: 0, last: Infinity })

// A vertical run from a card in `row` to a track in `channel`. Channel k sits
// above row k, so a run into a channel below its card enters from the top.
function runTo(x: number, row: number, channel: number, track: number): Drop[] {
	const reach: Reach[] = []
	if (channel > row) {
		for (let passed = row + 1; passed < channel; passed += 1) reach.push(full(passed))
		reach.push({ channel, first: 0, last: track })
	} else {
		for (let passed = channel + 1; passed <= row; passed += 1) reach.push(full(passed))
		reach.push({ channel, first: track, last: Infinity })
	}
	return reach.map((item) => ({ x, reach: item }))
}

export function layoutArchitecture(exhibit: Extract<Exhibit, { kind: "architecture" }>, frame = EXHIBIT_FRAME_MAX): ArchitectureLayout {
	const laneCount = exhibit.lanes.length
	const band = (frame - (laneCount - 1) * LANE_GAP) / laneCount
	const nodeWidth = band - 2 * BAND_PAD
	const textRoom = nodeWidth - NODE_PAD_LEFT - NODE_PAD_RIGHT
	const bandLeft = (lane: number) => lane * (band + LANE_GAP)
	const nodeLeft = (node: ArchitectureNode) => bandLeft(node.lane) + BAND_PAD
	const nodeCenter = (node: ArchitectureNode) => nodeLeft(node) + nodeWidth / 2
	const gapCenter = (leftLane: number) => bandLeft(leftLane) + band + LANE_GAP / 2
	const byId = new Map(exhibit.nodes.map((node) => [node.id, node]))
	const rowCount = Math.max(...exhibit.nodes.map((node) => node.row)) + 1
	const channelList = Array.from({ length: rowCount + 1 }, (_, channel) => channel)

	const text = new Map(exhibit.nodes.map((node) => {
		const title = wrapText(node.label, textRoom, EXHIBIT_TEXT, 500, 2)
		const detail = node.detail ? wrapParts(node.detail, textRoom, EXHIBIT_TEXT, 400, 3) : []
		const height = Math.max(NODE_MIN, 2 * NODE_PAD_Y + (title.length + detail.length) * EXHIBIT_LINE + (detail.length ? 2 : 0))
		return [node.id, { title, detail, height }]
	}))
	const rowHeight = channelList.slice(0, rowCount).map((row) => Math.max(NODE_MIN, ...exhibit.nodes.filter((node) => node.row === row).map((node) => text.get(node.id)!.height)))

	const edges = exhibit.edges.flatMap((edge, index) => {
		const from = byId.get(edge.from)
		const to = byId.get(edge.to)
		return from && to ? [{ edge, index, from, to }] : []
	})

	// Runs through the same gap get their own x where their reach overlaps, except
	// runs leaving the same card, which share a line like a bus. A run across
	// lanes may detour through any channel, so it is given the whole height.
	const gapRuns = new Map<number, Array<{ key: string; group: string; low: number; high: number }>>()
	const claimGap = (leftLane: number, key: string, group: string, low: number, high: number) => {
		gapRuns.set(leftLane, [...(gapRuns.get(leftLane) ?? []), { key, group, low, high }])
	}
	for (const { edge, index, from, to } of edges) {
		const laneStep = Math.abs(to.lane - from.lane)
		if (laneStep === 1 && from.row !== to.row) claimGap(Math.min(from.lane, to.lane), `${index}`, edge.from, Math.min(from.row, to.row), Math.max(from.row, to.row))
		if (laneStep > 1) {
			const forward = to.lane > from.lane
			claimGap(forward ? from.lane : from.lane - 1, `${index}:out`, edge.from, -1, rowCount)
			claimGap(forward ? to.lane - 1 : to.lane, `${index}:in`, `into:${edge.to}`, -1, rowCount)
		}
	}
	const slotX = new Map<string, number>()
	for (const [leftLane, runs] of gapRuns) {
		const slots: Array<typeof runs> = []
		const assigned = [...runs].sort((a, b) => a.low - b.low || a.high - b.high).map((run) => {
			let slot = slots.findIndex((taken) => taken.every((other) => other.group === run.group || other.high < run.low || run.high < other.low))
			if (slot < 0) slot = slots.push([]) - 1
			slots[slot].push(run)
			return { key: run.key, slot }
		})
		for (const { key, slot } of assigned) slotX.set(key, gapCenter(leftLane) + (slot - (slots.length - 1) / 2) * SLOT)
	}

	const between = (a: number, b: number) => Array.from({ length: Math.abs(a - b) }, (_, step) => Math.min(a, b) + step + 1)
	const plans: Plan[] = edges.map(({ edge, index, from, to }) => {
		const pillWidth = edge.label ? Math.ceil(textWidth(edge.label, EXHIBIT_TEXT, 500)) + 2 * PILL_PAD : 0
		const partnerEdge = edges.find((other) => other.edge.from === edge.to && other.edge.to === edge.from)
		const base = { index, edge, from, to, pillWidth, partner: partnerEdge?.index ?? null }
		if (from.lane === to.lane) {
			// A pair running both ways between two cards keeps its lines apart.
			const x = nodeCenter(from) + (partnerEdge ? (from.row < to.row ? -SLOT : SLOT) : 0)
			return { ...base, route: { kind: "lane", x, channels: between(from.row, to.row) }, preferred: x }
		}
		const forward = to.lane > from.lane
		if (Math.abs(to.lane - from.lane) === 1) {
			if (from.row !== to.row) {
				const x = slotX.get(`${index}`)!
				const channel = from.row < to.row ? to.row : to.row + 1
				// The hook enters its card on the half nearer the gap it came from.
				const towardGap = forward ? -1 : 1
				const hook = { channel, ends: ATTACH.map((offset): Ends => [x, nodeCenter(to) + towardGap * offset]) }
				return { ...base, route: { kind: "step", x, channels: between(from.row, to.row), hook }, preferred: x }
			}
			if (!edge.label) return { ...base, route: { kind: "straight" }, preferred: 0 }
			const ends = ATTACH.map((offset): Ends => [nodeCenter(from) + (forward ? offset : -offset), nodeCenter(to) + (forward ? -offset : offset)])
			return { ...base, route: { kind: "loop", channels: [from.row + 1, from.row], ends }, preferred: gapCenter(Math.min(from.lane, to.lane)) }
		}
		const ends: Ends = [slotX.get(`${index}:out`)!, slotX.get(`${index}:in`)!]
		const home = from.row === to.row ? from.row + 1 : Math.max(from.row, to.row)
		const channels = [...channelList].sort((a, b) => Math.abs(a - home) - Math.abs(b - home) || b - a)
		return { ...base, route: { kind: "across", channels, ends: [ends] }, preferred: (ends[0] + ends[1]) / 2 }
	})
	const planOf = new Map(plans.map((plan) => [plan.index, plan]))

	const dropsFor = (plan: Plan, choice: Choice | null): Drop[] => {
		const { route, from, to } = plan
		if (route.kind === "lane" || (route.kind === "step" && !choice?.ends)) return route.channels.map((channel) => ({ x: route.x, reach: full(channel) }))
		if (!choice?.ends) return []
		return [...runTo(choice.ends[0], from.row, choice.channel, choice.track), ...runTo(choice.ends[1], to.row, choice.channel, choice.track)]
	}

	const flexible = plans.filter((plan) => plan.route.kind === "loop" || plan.route.kind === "across")
	const labelledFixed = plans.filter((plan) => plan.edge.label && (plan.route.kind === "lane" || plan.route.kind === "step"))
	const toPlace = [...labelledFixed, ...flexible]

	const place = (order: Plan[]) => {
		const placed = new Map<number, Placed>()
		for (const plan of plans) {
			if (plan.route.kind === "lane" || plan.route.kind === "step") placed.set(plan.index, { index: plan.index, source: plan.edge.from, choice: null, pill: null, run: null, drops: dropsFor(plan, null) })
		}
		// An unlabelled partner's line runs beside a pill by design: the pill labels the pair.
		const others = (plan: Plan) => [...placed.values()].filter((item) => item.index !== plan.index && !(item.index === plan.partner && !planOf.get(item.index)!.edge.label))
		const pillFree = (plan: Plan, channel: number, track: number, span: Interval) => span.from >= 0 && span.to <= frame && others(plan).every((item) =>
			(!item.pill || item.pill.channel !== channel || item.pill.track !== track || !overlaps(item.pill.span, span, PILL_CLEARANCE))
			&& (!item.run || item.run.channel !== channel || item.run.track !== track || !overlaps(item.run.span, span, RUN_CLEARANCE))
			&& item.drops.every((drop) => !reaches(drop.reach, channel, track) || !within(drop.x, span)))
		const runFree = (plan: Plan, choice: Choice, span: Interval, drops: Drop[]) => others(plan).every((item) => {
			const sharesBus = item.source === plan.edge.from && item.run?.start === choice.ends![0]
			return (!item.run || item.run.channel !== choice.channel || item.run.track !== choice.track || !overlaps(item.run.span, span, RUN_CLEARANCE) || sharesBus)
				&& (!item.pill || ((item.pill.channel !== choice.channel || item.pill.track !== choice.track || !overlaps(item.pill.span, span, RUN_CLEARANCE))
					&& drops.every((drop) => !reaches(drop.reach, item.pill!.channel, item.pill!.track) || !within(drop.x, item.pill!.span))))
		})

		let cost = 0
		for (const plan of order) {
			const { route } = plan
			const half = plan.pillWidth / 2
			let chosen: Choice | null = null
			let fallback: Choice
			// Candidate runs through a channel: a loop's or a crossing's own, or a step's hook.
			const runs: Array<{ channel: number; ends: Ends }> = route.kind === "loop" || route.kind === "across"
				? route.channels.flatMap((channel) => route.ends.map((ends) => ({ channel, ends })))
				: route.kind === "step" ? route.hook.ends.map((ends) => ({ channel: route.hook.channel, ends })) : []
			if (route.kind === "lane" || route.kind === "step") {
				const middle = (route.channels[0] + route.channels[route.channels.length - 1]) / 2
				const channels = [...route.channels].sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))
				fallback = { channel: channels[0], track: MAX_TRACKS - 1, center: route.x, ends: null }
				search: for (let track = 0; track < MAX_TRACKS; track += 1) {
					for (const channel of channels) {
						if (pillFree(plan, channel, track, { from: route.x - half, to: route.x + half })) { chosen = { channel, track, center: route.x, ends: null }; break search }
					}
				}
			} else fallback = { channel: runs[0].channel, track: MAX_TRACKS - 1, center: plan.preferred, ends: runs[0].ends }
			if (!chosen && runs.length) {
				const preferred = route.kind === "step" ? (runs[0].ends[0] + runs[0].ends[1]) / 2 : plan.preferred
				search: for (let track = 0; track < MAX_TRACKS; track += 1) {
					for (const { channel, ends } of runs) {
						const probe: Choice = { channel, track, center: preferred, ends }
						const span = { from: Math.min(...ends), to: Math.max(...ends) }
						if (!runFree(plan, probe, span, dropsFor(plan, probe))) continue
						if (!plan.pillWidth) { chosen = probe; break search }
						// The pill's centre stays on its own run, nearest the preferred spot first.
						for (let shift = 0; shift <= span.to - span.from; shift += STEP) {
							for (const center of shift ? [preferred - shift, preferred + shift] : [preferred]) {
								if (center < span.from || center > span.to) continue
								if (pillFree(plan, channel, track, { from: center - half, to: center + half })) { chosen = { ...probe, center }; break search }
							}
						}
					}
				}
			}
			const choice = chosen ?? fallback
			if (!chosen) cost += FALLBACK_COST
			const entry: Placed = placed.get(plan.index) ?? { index: plan.index, source: plan.edge.from, choice: null, pill: null, run: null, drops: [] }
			entry.choice = choice
			if (choice.ends) {
				entry.run = { channel: choice.channel, track: choice.track, span: { from: Math.min(...choice.ends), to: Math.max(...choice.ends) }, start: choice.ends[0] }
				entry.drops = dropsFor(plan, choice)
				// A step's hook is a detour; so is any channel but a route's first choice.
				const channelRank = route.kind === "loop" || route.kind === "across" ? route.channels.indexOf(choice.channel) : 1
				cost += channelRank * DETOUR_COST
			}
			if (plan.pillWidth) {
				entry.pill = { channel: choice.channel, track: choice.track, span: { from: choice.center - half, to: choice.center + half } }
				cost += Math.abs(choice.center - plan.preferred) / 100
			}
			cost += choice.track / 10
			placed.set(plan.index, entry)
		}
		const tracks = new Map<number, number>()
		for (const item of placed.values()) {
			for (const used of [item.pill, item.run]) if (used) tracks.set(used.channel, Math.max(tracks.get(used.channel) ?? 0, used.track + 1))
		}
		cost += [...tracks.values()].reduce((sum, count) => sum + count, 0)
		return { placed, tracks, cost }
	}

	const orders: Plan[][] = []
	const permute = (rest: Plan[], prefix: Plan[]) => {
		if (orders.length >= MAX_ORDERINGS) return
		if (!rest.length) { orders.push(prefix); return }
		rest.forEach((plan, position) => permute([...rest.slice(0, position), ...rest.slice(position + 1)], [...prefix, plan]))
	}
	permute(toPlace, [])
	const best = orders.map(place).reduce((winner, candidate) => (candidate.cost < winner.cost ? candidate : winner))

	// With the tracks known, every channel has a height and every run a y.
	const channelHeight = (channel: number) => {
		const count = best.tracks.get(channel) ?? 0
		const needed = count ? count * TRACK + 2 * TRACK_PAD : 0
		return channel === 0 || channel === rowCount ? needed || BAND_PAD : Math.max(CHANNEL_MIN, needed)
	}
	const rowTop: number[] = []
	for (let row = 0; row < rowCount; row += 1) rowTop.push((row === 0 ? HEAD : rowTop[row - 1] + rowHeight[row - 1]) + channelHeight(row))
	const rowBottom = (row: number) => rowTop[row] + rowHeight[row]
	const middle = (row: number) => rowTop[row] + rowHeight[row] / 2
	const channelTop = (channel: number) => (channel === 0 ? HEAD : rowBottom(channel - 1))
	const trackY = (channel: number, track: number) => channelTop(channel) + TRACK_PAD + TRACK / 2 + track * TRACK
	const bandBottom = rowBottom(rowCount - 1) + channelHeight(rowCount)
	// A loop leaves and enters its cards on the side facing its channel.
	const faceOf = (row: number, channel: number) => (channel > row ? rowBottom(row) : rowTop[row])
	const arrivalAt = (row: number, channel: number) => (channel > row ? rowBottom(row) + STUB : rowTop[row] - STUB)

	const laidEdges: LaidEdge[] = plans.map((plan) => {
		const { edge, from, to, route } = plan
		const entry = best.placed.get(plan.index)
		const choice = entry?.choice ?? null
		const forward = to.lane > from.lane
		const sideOut = forward ? nodeLeft(from) + nodeWidth : nodeLeft(from)
		const sideIn = forward ? nodeLeft(to) - STUB : nodeLeft(to) + nodeWidth + STUB
		let d = `M ${sideOut} ${middle(from.row)} H ${sideIn}`
		if (route.kind === "lane") {
			const down = to.row > from.row
			d = `M ${route.x} ${down ? rowBottom(from.row) : rowTop[from.row]} V ${down ? rowTop[to.row] - STUB : rowBottom(to.row) + STUB}`
		} else if (route.kind === "step" && !choice?.ends) {
			d = `M ${sideOut} ${middle(from.row)} H ${route.x} V ${middle(to.row)} H ${sideIn}`
		} else if (route.kind === "step" && choice?.ends) {
			d = `M ${sideOut} ${middle(from.row)} H ${choice.ends[0]} V ${trackY(choice.channel, choice.track)} H ${choice.ends[1]} V ${arrivalAt(to.row, choice.channel)}`
		} else if (choice?.ends) {
			const [x1, x2] = choice.ends
			const y = trackY(choice.channel, choice.track)
			d = route.kind === "loop"
				? `M ${x1} ${faceOf(from.row, choice.channel)} V ${y} H ${x2} V ${arrivalAt(to.row, choice.channel)}`
				: `M ${sideOut} ${middle(from.row)} H ${x1} V ${y} H ${x2} V ${middle(to.row)} H ${sideIn}`
		}
		const pill = edge.label && entry?.pill ? {
			x: entry.pill.span.from,
			y: trackY(entry.pill.channel, entry.pill.track) - PILL_HEIGHT / 2,
			width: plan.pillWidth,
			height: PILL_HEIGHT,
			label: edge.label,
		} : null
		return { edge, d, pill, partner: plan.partner }
	})

	return {
		width: frame,
		height: bandBottom + 2,
		lanes: exhibit.lanes.map((label, lane) => ({ label, x: bandLeft(lane), y: HEAD, width: band, height: bandBottom - HEAD })),
		nodes: exhibit.nodes.map((node) => {
			const measured = text.get(node.id)!
			return { node, x: nodeLeft(node), y: rowTop[node.row], width: nodeWidth, height: rowHeight[node.row], title: measured.title, detail: measured.detail }
		}),
		edges: laidEdges,
	}
}

export const ARCHITECTURE_TEXT = { padLeft: NODE_PAD_LEFT, padTop: NODE_PAD_Y, laneTitle: 18 } as const
