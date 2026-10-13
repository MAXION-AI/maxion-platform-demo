import { describe, expect, it } from "vitest"

import { DELIVERABLE_CONTENT, DELIVERABLES } from "../index"
import { BAR_GUTTER, BAR_VALUE_GAP, EXHIBIT_FRAME_MAX, EXHIBIT_FRAME_MIN, EXHIBIT_LINE, EXHIBIT_TEXT, barPlotEnd, formatValue, layoutArchitecture, layoutQuadrantLabels, layoutTimeline, lineAxis, waterfallLabelLines } from "../exhibitLayout"
import { figures, textWidth, wrapParts, wrapText } from "../textMetrics"
import type { Exhibit } from "../types"

type Box = { x: number; y: number; width: number; height: number }

const exhibitsOf = <K extends Exhibit["kind"]>(kind: K) => Object.entries(DELIVERABLE_CONTENT).flatMap(([scenario, bodies]) =>
	bodies.flatMap((body, index) => body.sections.flatMap((section) => section.exhibit?.kind === kind
		? [{ name: `${scenario} · ${DELIVERABLES[index].name} · ${section.exhibit.title.slice(0, 40)}`, exhibit: section.exhibit as Extract<Exhibit, { kind: K }> }]
		: [])))

// Exhibits are drawn at the plot's own width: the narrowest frame, the reader's
// widths at 1280 and 1440, and the widest.
// A sweep of every width from 650 to 720 passes; below 650 a quadrant label has
// nowhere left to go, which is why EXHIBIT_FRAME_MIN is 650.
const FRAMES = [EXHIBIT_FRAME_MIN, 654, 670, 690, EXHIBIT_FRAME_MAX]

const inside = (point: [number, number], box: Box, inset = 1) =>
	point[0] > box.x + inset && point[0] < box.x + box.width - inset && point[1] > box.y + inset && point[1] < box.y + box.height - inset
const intersects = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

// Every point along an orthogonal path, one unit apart.
function pathPoints(d: string) {
	const tokens = d.trim().split(/\s+/)
	const points: Array<[number, number]> = []
	let x = 0
	let y = 0
	for (let position = 0; position < tokens.length;) {
		const command = tokens[position]
		const walk = (nx: number, ny: number) => {
			const steps = Math.ceil(Math.max(Math.abs(nx - x), Math.abs(ny - y)))
			for (let step = 1; step <= steps; step += 1) points.push([x + ((nx - x) * step) / steps, y + ((ny - y) * step) / steps])
			x = nx
			y = ny
		}
		if (command === "M") { x = Number(tokens[position + 1]); y = Number(tokens[position + 2]); points.push([x, y]); position += 3 }
		else if (command === "H") { walk(Number(tokens[position + 1]), y); position += 2 }
		else if (command === "V") { walk(x, Number(tokens[position + 1])); position += 2 }
		else throw new Error(`Unexpected path command ${command}`)
	}
	return points
}

describe("exhibit text metrics", () => {
	it("wraps to the width it is given and keeps every word", () => {
		const lines = wrapText("Single writer · logical tenancy", 110, 12)
		expect(lines.every((line) => textWidth(line, 12) <= 110)).toBe(true)
		expect(lines.join(" ")).toBe("Single writer · logical tenancy")
	})

	it("breaks a detail line at its separators first", () => {
		expect(wrapParts("3 deploys/month · 41% coverage", 116, 12)).toEqual(["3 deploys/month", "41% coverage"])
		expect(wrapParts("22 hours", 116, 12)).toEqual(["22 hours"])
	})

	it("ends a clamped paragraph in an ellipsis that still fits", () => {
		const lines = wrapText("one two three four five six seven eight nine ten", 60, 12, 400, 2)
		expect(lines).toHaveLength(2)
		expect(lines[1].endsWith("…")).toBe(true)
		expect(textWidth(lines[1], 12)).toBeLessThanOrEqual(60)
	})
})

describe.each(FRAMES)("waterfall labels at %i", (frame) => {
	it.each(exhibitsOf("waterfall"))("fit their own column in $name", ({ exhibit }) => {
		const slot = (frame - 44) / exhibit.steps.length
		for (const step of exhibit.steps) {
			for (const line of waterfallLabelLines(step.label, slot)) expect(textWidth(line, EXHIBIT_TEXT, figures(400))).toBeLessThan(slot - 8)
		}
	})
})

const boxOfLabel = (x: number, baseline: number, width: number, anchor: "start" | "middle" | "end") => {
	const left = anchor === "start" ? x : anchor === "middle" ? x - width / 2 : x - width
	return { x: left, y: baseline - 11, width, height: 14 }
}

describe.each(FRAMES)("timeline labels at %i", (frame) => {
	it.each(exhibitsOf("timeline"))("never overlap a bar or each other in $name", ({ exhibit }) => {
		const layout = layoutTimeline(exhibit, { labelWidth: 150, plotEnd: frame - 20, top: 28, width: frame })
		const bars = layout.lanes.flatMap((lane) => lane.bars.map((bar) => ({ x: bar.x, y: bar.y, width: bar.width, height: 24 })))
		const labels = layout.lanes.flatMap((lane, laneIndex) => lane.bars.map((bar, barIndex) => {
			const text = exhibit.lanes[laneIndex].bars[barIndex].label
			const box = boxOfLabel(bar.label.x, bar.label.y, textWidth(text, EXHIBIT_TEXT, figures(bar.label.inside ? 600 : 500)), bar.label.anchor)
			return { text, box, inside: bar.label.inside, own: bars.findIndex((item) => item.x === bar.x && item.y === bar.y) }
		}))
		for (const label of labels) {
			expect(label.box.x, label.text).toBeGreaterThanOrEqual(0)
			expect(label.box.x + label.box.width, label.text).toBeLessThanOrEqual(frame)
			bars.forEach((bar, index) => {
				if (label.inside && index === label.own) {
					expect(label.box.x + label.box.width, `${label.text} inside its bar`).toBeLessThanOrEqual(bar.x + bar.width)
					return
				}
				expect(intersects(label.box, bar), `${label.text} clear of bar ${index}`).toBe(false)
			})
			for (const other of labels) if (other !== label) expect(intersects(label.box, other.box), `${label.text} clear of ${other.text}`).toBe(false)
		}
	})
})

describe.each(FRAMES)("quadrant labels at %i", (width) => {
	it.each(exhibitsOf("quadrant"))("never overlap a dot or each other in $name", ({ exhibit }) => {
		const frame = { left: 96, right: width - 60, top: 32, bottom: 320 }
		const labels = layoutQuadrantLabels(exhibit.points, frame)
		const dots = exhibit.points.map((point) => {
			const r = point.emphasis ? 8 : 6
			return { x: frame.left + (point.x / 100) * (frame.right - frame.left) - r, y: frame.bottom - (point.y / 100) * (frame.bottom - frame.top) - r, width: 2 * r, height: 2 * r }
		})
		const boxes = exhibit.points.map((point, index) => boxOfLabel(labels[index].x, labels[index].y, textWidth(point.label, EXHIBIT_TEXT, point.emphasis ? 600 : 400), labels[index].anchor))
		boxes.forEach((box, index) => {
			const name = exhibit.points[index].label
			expect(box.x, name).toBeGreaterThanOrEqual(frame.left)
			expect(box.x + box.width, name).toBeLessThanOrEqual(frame.right)
			expect(box.y, name).toBeGreaterThanOrEqual(frame.top)
			expect(box.y + box.height, name).toBeLessThanOrEqual(frame.bottom)
			for (const dot of dots) expect(intersects(box, dot), `${name} clear of a dot`).toBe(false)
			boxes.forEach((other, position) => { if (position !== index) expect(intersects(box, other), `${name} clear of ${exhibit.points[position].label}`).toBe(false) })
		})
	})
})

describe.each(FRAMES)("architecture layout at %i", (frame) => {
	it.each(exhibitsOf("architecture"))("keeps text, pills and edges apart in $name", ({ exhibit }) => {
		const layout = layoutArchitecture(exhibit, frame)
		expect(layout.width).toBe(frame)
		const nodes = layout.nodes

		for (const node of nodes) {
			expect(node.x).toBeGreaterThanOrEqual(0)
			expect(node.x + node.width).toBeLessThanOrEqual(layout.width)
			for (const [line, weight] of [...node.title.map((line) => [line, 500] as const), ...node.detail.map((line) => [line, 400] as const)]) {
				expect(14 + textWidth(line, EXHIBIT_TEXT, weight), `${line} fits ${node.node.id}`).toBeLessThanOrEqual(node.width - 8)
			}
			expect(20 + (node.title.length + node.detail.length) * EXHIBIT_LINE).toBeLessThanOrEqual(node.height)
			// No ellipsis in the shipped exhibits: every label reads in full.
			expect([...node.title, ...node.detail].some((line) => line.endsWith("…")), node.node.id).toBe(false)
		}
		for (let a = 0; a < nodes.length; a += 1) for (let b = a + 1; b < nodes.length; b += 1) expect(intersects(nodes[a], nodes[b])).toBe(false)

		const pills = layout.edges.flatMap((edge) => edge.pill ? [{ ...edge.pill, owner: edge }] : [])
		expect(pills).toHaveLength(exhibit.edges.filter((edge) => edge.label).length)
		for (const pill of pills) {
			expect(pill.x).toBeGreaterThanOrEqual(0)
			expect(pill.x + pill.width).toBeLessThanOrEqual(layout.width)
			for (const node of nodes) expect(intersects(pill, node), `${pill.label} clear of ${node.node.id}`).toBe(false)
			for (const other of pills) if (other !== pill) expect(intersects(pill, other), `${pill.label} clear of ${other.label}`).toBe(false)
			// The pill sits on its own edge.
			expect(pathPoints(pill.owner.d).some((point) => inside(point, pill, 0)), `${pill.label} on its edge`).toBe(true)
		}

		for (const edge of layout.edges) {
			const points = pathPoints(edge.d)
			for (const node of nodes) {
				expect(points.some((point) => inside(point, node)), `${edge.edge.from}→${edge.edge.to} crosses ${node.node.id}`).toBe(false)
			}
			for (const pill of pills) {
				if (pill.owner === edge) continue
				// A pill on one of a two-way pair labels the pair when the other line has no label.
				if (pill.owner.partner !== null && exhibit.edges[pill.owner.partner] === edge.edge && !edge.edge.label) continue
				// A line under, or grazing, another edge's label would read as labelled by it.
				expect(points.some((point) => inside(point, pill, -6)), `${edge.edge.from}→${edge.edge.to} runs under "${pill.label}"`).toBe(false)
			}
		}
		expect(layout.height).toBeGreaterThan(0)
	})
})

// The charts drawn without a layout pass keep their text apart through geometry
// alone; these checks use the renderer's own edges (DeliverableExhibit.tsx).
// Row and lane labels sit right-aligned in a fixed gutter, 12 units short of the plot.
describe("gutter labels", () => {
	const fits = (text: string, gutter: number, weight: 400 | 500 | 600) => expect(textWidth(text, EXHIBIT_TEXT, weight), text).toBeLessThanOrEqual(gutter - 12)
	it.each(exhibitsOf("bar"))("fit the bar gutter in $name", ({ exhibit }) => {
		for (const item of exhibit.data) { fits(item.label, BAR_GUTTER, item.emphasis ? 600 : 500); if (item.note) fits(item.note, BAR_GUTTER, 400) }
	})
	it.each(exhibitsOf("stack"))("fit the stack gutter in $name", ({ exhibit }) => {
		for (const row of exhibit.rows) { fits(row.label, 176, 500); if (row.note) fits(row.note, 176, 400) }
	})
	it.each(exhibitsOf("heatmap"))("fit the heatmap gutter in $name", ({ exhibit }) => {
		for (const row of exhibit.rows) fits(row.label, 218, 500)
	})
	it.each(exhibitsOf("timeline"))("fit the timeline gutter in $name", ({ exhibit }) => {
		for (const lane of exhibit.lanes) fits(lane.label, 150, 500)
	})
	it.each(exhibitsOf("line"))("fit the line value axis in $name", ({ exhibit }) => {
		const axis = lineAxis(exhibit)
		for (const line of axis.grid) expect(axis.left - 10 - textWidth(line.label, EXHIBIT_TEXT, figures(400)), line.label).toBeGreaterThanOrEqual(0)
	})
})

describe.each(FRAMES)("chart text at %i", (frame) => {
	it.each(exhibitsOf("bar"))("bar values end inside the frame in $name", ({ exhibit }) => {
		const plotEnd = barPlotEnd(exhibit, frame)
		const max = Math.max(...exhibit.data.map((item) => item.value), 1)
		for (const item of exhibit.data) {
			const bar = Math.max(2, (item.value / max) * (plotEnd - BAR_GUTTER))
			const label = formatValue(item.value, exhibit.unit)
			expect(BAR_GUTTER + bar + BAR_VALUE_GAP + textWidth(label, EXHIBIT_TEXT, figures(item.emphasis ? 600 : 500)), label).toBeLessThanOrEqual(frame)
		}
	})

	it.each(exhibitsOf("waterfall"))("waterfall values stay inside their column in $name", ({ exhibit }) => {
		const slot = (frame - 44) / exhibit.steps.length
		// Base and total columns show their value; a delta shows its change, signed.
		for (const step of exhibit.steps) {
			const label = `${step.role === "delta" && step.value > 0 ? "+" : ""}${formatValue(step.value, exhibit.unit)}`
			expect(textWidth(label, EXHIBIT_TEXT, figures(600)), label).toBeLessThan(slot - 4)
		}
	})

	it.each(exhibitsOf("heatmap"))("heatmap column headers fit their column in $name", ({ exhibit }) => {
		const cell = (frame - 20 - 218) / exhibit.columns.length
		for (const column of exhibit.columns) {
			const lines = wrapText(column, cell - 8, EXHIBIT_TEXT, figures(400))
			expect(lines.join(" "), column).toBe(column)
			expect(lines.length, column).toBeLessThanOrEqual(2)
			for (const line of lines) expect(textWidth(line, EXHIBIT_TEXT, figures(400)), line).toBeLessThanOrEqual(cell - 4)
		}
	})

	it.each(exhibitsOf("line"))("line ticks stay apart and inside the frame in $name", ({ exhibit }) => {
		const { left } = lineAxis(exhibit)
		const right = frame - 18
		const at = (index: number) => left + (index / Math.max(1, exhibit.ticks.length - 1)) * (right - left)
		const spans = exhibit.ticks.map((tick, index) => {
			const half = textWidth(tick, EXHIBIT_TEXT, figures(400)) / 2
			const centre = Math.min(frame - half, Math.max(half, at(index)))
			return { tick, from: centre - half, to: centre + half }
		})
		expect(spans[0].from).toBeGreaterThanOrEqual(0)
		expect(spans.at(-1)!.to).toBeLessThanOrEqual(frame)
		spans.slice(1).forEach((span, index) => expect(span.from - spans[index].to, `${spans[index].tick} and ${span.tick}`).toBeGreaterThanOrEqual(4))
	})

	it.each(exhibitsOf("sequence"))("sequence labels fit their heads and the frame in $name", ({ exhibit }) => {
		const column = frame / exhibit.actors.length
		const x = (index: number) => column * index + column / 2
		for (const actor of exhibit.actors) expect(textWidth(actor, EXHIBIT_TEXT, 600), actor).toBeLessThanOrEqual(column - 28)
		for (const step of exhibit.steps) {
			const warn = step.tone === "warn" || step.tone === "danger"
			const texts: Array<[string, 400 | 600]> = [[step.label, warn ? 600 : 400], ...(step.note ? [[step.note, 400] as [string, 400]] : [])]
			const widest = Math.max(...texts.map(([text, weight]) => textWidth(text, EXHIBIT_TEXT, weight)))
			// A self-call label runs right of its lifeline unless the frame is too narrow there.
			const left = x(step.from) + 42 + widest > frame - 4
			for (const [text, weight] of texts) {
				const width = textWidth(text, EXHIBIT_TEXT, weight)
				const [from, to] = step.from !== step.to
					? [(x(step.from) + x(step.to)) / 2 - width / 2, (x(step.from) + x(step.to)) / 2 + width / 2]
					: left ? [x(step.from) - 42 - width, x(step.from) - 42] : [x(step.from) + 42, x(step.from) + 42 + width]
				expect(from, text).toBeGreaterThanOrEqual(0)
				expect(to, text).toBeLessThanOrEqual(frame)
			}
		}
	})
})
