import { describe, expect, it } from "vitest"
import { activate, answerQuestion, decide, receivePackage, tick } from "../engine/engine"
import { SCENARIOS } from "../engine/scenarios"
import { initialState } from "../engine/seed"
import { previewInstruction, sendInstruction, sendToAgent } from "../engine/steering"
import type { AgentixState, WorkItem } from "../engine/types"
import { floorMinWidth, floorPlan, handsOff, LABEL_H, labelPoint, layoutFloor, liveFlows, packetsFor, reachOf, route, systemsForStep, systemsOf, teamLines, teamPath, type Box } from "../floor"

/*
 * The team floor reads the same engine state as every other view. These tests pin what it shows:
 * where everyone sits (never overlapping), which systems each agent may reach, what is moving now,
 * the handoff events the engine now records, and how talking to one teammate is routed.
 */
const REV = "invoice"
const run = (state: AgentixState, until: (s: AgentixState) => boolean, max = 160) => {
	let current = state
	for (let i = 0; i < max && !until(current); i++) current = tick(current)
	if (!until(current)) throw new Error("condition not reached")
	return current
}
const item = (state: AgentixState, reference: string) => state.work.find(entry => entry.engagementId === REV && entry.reference === reference) as WorkItem
function activated() {
	let state = receivePackage(initialState(), "pkg_revenue_v2", "discovery")
	state = answerQuestion(state, REV, "release", "approval")
	state = answerQuestion(state, REV, "testdata", "synthetic")
	return activate(state, REV)
}

describe("seating", () => {
	it("puts the accountable agent first, then the specialists, then every activated system", () => {
		const state = activated()
		const plan = floorPlan(state, REV)
		expect(plan.agents.map(agent => agent.id)).toEqual(["coordinator", "analyst", "data", "dashboard"])
		expect(plan.agents[0].accountable).toBe(true)
		expect(plan.systems.map(system => system.link.name)).toEqual(expect.arrayContaining(["SQL Server billing ledger", "AWS test workspace", "AWS PostgreSQL revenue schema", "Microsoft Teams"]))
	})

	it("gives every system at least one agent who may reach it, and production only to the coordinator", () => {
		const state = activated()
		const reach = reachOf(state, REV)
		for (const link of systemsOf(state.engagements[REV])) expect(reach.some(entry => entry.system === link.id)).toBe(true)
		const production = reach.filter(entry => entry.capability === "production")
		// The dashboard specialist publishes only through the coordinator's release.
		expect(production.every(entry => entry.agent === "coordinator")).toBe(true)
		expect(reach.some(entry => entry.agent === "data" && entry.capability === "read")).toBe(true)
	})

	it("names the systems a step's text refers to, including a pair joined by +", () => {
		const links = SCENARIOS.invoice.systems
		expect(systemsForStep("SQL Server + AWS PostgreSQL", links).map(link => link.id).sort()).toEqual(["ledger", "schema"])
		expect(systemsForStep("Dashboards", links).map(link => link.id)).toEqual(["dash"])
		expect(systemsForStep(undefined, links)).toEqual([])
	})

	// The sizes the floor actually gets: 1440 and 1280 windows, with and without a room, and the narrowest seated floor.
	const SIZES = [[1130, 524], [790, 524], [970, 424], [630, 424], [630, 400], [1130, 400]] as const
	const apart = (one: Box, two: Box) => Math.abs(one.x - two.x) >= (one.width + two.width) / 2 || Math.abs(one.y - two.y) >= (one.height + two.height) / 2
	const fits = (boxes: Record<string, Box>, width: number, height: number) => {
		const entries = Object.entries(boxes)
		for (const [id, box] of entries) {
			expect(box.x - box.width / 2, id).toBeGreaterThanOrEqual(0)
			expect(box.x + box.width / 2, id).toBeLessThanOrEqual(width)
			expect(box.y - box.height / 2, id).toBeGreaterThanOrEqual(0)
			expect(box.y + box.height / 2, id).toBeLessThanOrEqual(height + 1)
		}
		for (let a = 0; a < entries.length; a++) for (let b = a + 1; b < entries.length; b++) expect(apart(entries[a][1], entries[b][1]), `${entries[a][0]} overlaps ${entries[b][0]}`).toBe(true)
	}

	it.each(SIZES)("seats everyone apart and inside the floor at %ipx × %ipx", (width, height) => {
		const plan = floorPlan(activated(), REV)
		const layout = layoutFloor(plan, width, height)
		fits(layout.boxes, width, height)
		// One hierarchy: you over the accountable agent over the specialists over the systems.
		const lead = layout.boxes.coordinator, specialists = ["analyst", "data", "dashboard"].map(id => layout.boxes[id])
		expect(layout.boxes.owner.x).toBe(lead.x)
		expect(layout.boxes.owner.y).toBeLessThan(lead.y)
		for (const seat of specialists) expect(seat.y).toBeGreaterThan(lead.y)
		for (const system of plan.systems) expect(layout.boxes[`system:${system.id}`].y).toBeGreaterThan(specialists[0].y)
		// Every specialist gets the same seat, wide enough that names wrap at most once.
		expect(new Set(specialists.map(seat => seat.width)).size).toBe(1)
		expect(specialists[0].width).toBeGreaterThanOrEqual(168)
	})

	it("uses the room it has: seats widen on a wide floor and the floor centres them", () => {
		const plan = floorPlan(activated(), REV)
		const wide = layoutFloor(plan, 1130, 524), narrow = layoutFloor(plan, 630, 424)
		expect(wide.boxes.analyst.width).toBeGreaterThan(narrow.boxes.analyst.width)
		const xs = ["analyst", "data", "dashboard"].map(id => wide.boxes[id].x)
		expect((xs[0] + xs[2]) / 2).toBeCloseTo(1130 / 2, 0)
	})

	it("puts a second row of systems in the first row's gaps, so lines to it never run under a seat", () => {
		const plan = floorPlan(activated(), REV)
		const layout = layoutFloor(plan, 630, 424)
		const systems = plan.systems.map(system => layout.boxes[`system:${system.id}`])
		const rows = [...new Set(systems.map(box => box.y))].sort((a, b) => a - b)
		expect(rows).toHaveLength(2)
		const first = systems.filter(box => box.y === rows[0]), second = systems.filter(box => box.y === rows[1])
		for (const box of second) expect(first.every(above => Math.abs(above.x - box.x) >= above.width / 2 + 4)).toBe(true)
		// Both rows are centred on the floor.
		const centre = (boxes: Box[]) => (Math.min(...boxes.map(box => box.x)) + Math.max(...boxes.map(box => box.x))) / 2
		expect(centre(first)).toBeCloseTo(315, 0)
		expect(centre(second)).toBeCloseTo(315, 0)
	})

	it("routes every line between tiers and through gaps, never under a seat it doesn't belong to", () => {
		for (const [width, height] of SIZES) {
			const plan = floorPlan(activated(), REV)
			const layout = layoutFloor(plan, width, height)
			const specialists = plan.agents.filter(agent => !agent.accountable).map(agent => agent.id)
			// Every route the floor draws or sends something along: the team, decisions both ways, handoffs, reach and flows.
			const pairs: [string, string][] = [
				["owner", "coordinator"], ["coordinator", "owner"],
				...specialists.flatMap(id => [["coordinator", id], [id, "coordinator"], ["owner", id], [id, "owner"]] as [string, string][]),
				["analyst", "dashboard"], ["dashboard", "data"],
				...plan.reach.flatMap(reach => [[reach.agent, `system:${reach.system}`], [`system:${reach.system}`, reach.agent]] as [string, string][]),
			]
			for (const [from, to] of pairs) {
				const runs = route(layout, plan, from, to)
				expect(runs, `${from} → ${to}`).not.toBeNull()
				for (const [id, box] of Object.entries(layout.boxes)) {
					if (id === from || id === to) continue
					for (const points of runs!) for (let index = 1; index < points.length; index++) {
						const u = points[index - 1], v = points[index]
						// An axis-aligned segment crosses a seat when it overlaps the seat's inside.
						const inside = Math.max(u.x, v.x) > box.x - box.width / 2 + 1 && Math.min(u.x, v.x) < box.x + box.width / 2 - 1 && Math.max(u.y, v.y) > box.y - box.height / 2 + 1 && Math.min(u.y, v.y) < box.y + box.height / 2 - 1
						expect(inside, `${from} → ${to} runs under ${id} at ${width}×${height}`).toBe(false)
					}
				}
				// A label sits only on a level run long enough to hold it, never on a card.
				const at = labelPoint(runs!, layout.boxes)
				if (at) for (const [id, box] of Object.entries(layout.boxes)) expect(Math.abs(at.y - box.y) >= box.height / 2 + 10 || Math.abs(at.x - box.x) >= box.width / 2 + 60, `${from} → ${to} label on ${id}`).toBe(true)
			}
			// The accountable agent's lines leave from its foot set in from the corner, or step clear of its side
			// first, and never detour round the whole row when a gap is near.
			const lead = layout.boxes.coordinator
			for (const reach of plan.reach.filter(entry => entry.agent === "coordinator")) {
				const [start, next] = route(layout, plan, "coordinator", `system:${reach.system}`)![0]
				if (start.y === lead.y) expect(Math.abs(next.x - start.x)).toBeGreaterThanOrEqual(16)
				else expect(Math.abs(start.x - lead.x)).toBeLessThanOrEqual(lead.width / 2 - 24)
				// A system under the specialists' row is reached down a gap between them, not round the outside.
				const points = route(layout, plan, "coordinator", `system:${reach.system}`)![0]
				const target = layout.boxes[`system:${reach.system}`].x, descent = points[points.length - 3].x
				if (layout.channels.length > 2 && target > layout.channels[1] && target < layout.channels.at(-2)!) expect(layout.channels.slice(1, -1)).toContain(descent)
			}
		}
	})

	it("draws the team as curves within the gap between tiers, each labelled clear of the cards and of each other", () => {
		for (const [width, height] of SIZES) {
			const plan = floorPlan(activated(), REV)
			const layout = layoutFloor(plan, width, height)
			const lines = teamLines(layout, plan)
			expect(lines.map(line => line.to)).toEqual(["coordinator", "analyst", "data", "dashboard"])
			const labels: Box[] = []
			for (const line of lines) {
				const source = layout.boxes[line.from], target = layout.boxes[line.to]
				const numbers = line.d.match(/-?\d+(\.\d+)?/g)!.map(Number)
				const points = Array.from({ length: numbers.length / 2 }, (_, index) => ({ x: numbers[index * 2], y: numbers[index * 2 + 1] }))
				// A curve leaves its source's foot and lands on its target's head; every point it is drawn through stays in that gap.
				expect(points[0].y, `${line.from} → ${line.to}`).toBeCloseTo(source.y + source.height / 2, 5)
				expect(points.at(-1)!.y).toBeCloseTo(target.y - target.height / 2, 5)
				for (const point of points) expect(point.y >= points[0].y - 0.01 && point.y <= points.at(-1)!.y + 0.01, `${line.from} → ${line.to} at ${width}×${height}`).toBe(true)
				if (!line.at) continue
				// A label holds its gap with room to spare, and never covers a card or another label.
				const label = { x: line.at.x, y: line.at.y, width: line.room, height: LABEL_H }
				expect(points.at(-1)!.y - points[0].y).toBeGreaterThanOrEqual(LABEL_H + 8)
				for (const [id, box] of Object.entries(layout.boxes)) expect(apart(label, box), `${line.from} → ${line.to} label on ${id} at ${width}×${height}`).toBe(true)
				for (const other of labels) expect(apart(label, other), `labels overlap at ${width}×${height}`).toBe(true)
				labels.push(label)
			}
			// Things travel along the team's curves between any two of the team; a system keeps its routed line.
			for (const [from, to] of [["owner", "analyst"], ["dashboard", "owner"], ["analyst", "data"], ["coordinator", "dashboard"]]) expect(teamPath(layout, plan, from, to), `${from} → ${to}`).toMatch(/^M /)
			expect(teamPath(layout, plan, "coordinator", `system:${plan.systems[0].id}`)).toBeNull()
		}
	})

	it("labels each specialist's line with the step it is handed", () => {
		const state = activated()
		const plan = floorPlan(state, REV)
		for (const agent of plan.agents.filter(entry => !entry.accountable)) {
			const steps = Object.values(SCENARIOS[state.engagements[REV].workflowId].templates).flatMap(template => template.steps.filter(step => step.owner === agent.id).map(step => step.title))
			expect(steps).toContain(handsOff(state, REV, agent.id))
		}
	})

	it("seats every scenario's team, however many systems it has, down to the narrowest seated floor", () => {
		const state = initialState()
		for (const id of Object.keys(state.engagements)) {
			const plan = floorPlan(state, id)
			expect(plan.agents.length).toBeGreaterThan(0)
			fits(layoutFloor(plan, 1130, 524).boxes, 1130, 524)
			fits(layoutFloor(plan, floorMinWidth(plan), 400).boxes, floorMinWidth(plan), 400)
		}
	})

	it("lets the systems rest while you talk to the team, keeping its people in view", () => {
		const plan = floorPlan(activated(), REV)
		const layout = layoutFloor(plan, 630, 280, { systems: false })
		expect(layout.systems).toBe(false)
		expect(Object.keys(layout.boxes).some(key => key.startsWith("system:"))).toBe(false)
		fits(layout.boxes, 630, 280)
	})
})

describe("what moves", () => {
	it("lights the edge between a working specialist and the system its step uses", () => {
		let state = activated()
		state = run(state, s => item(s, "MS-1").steps.some(step => step.status === "working"))
		const flows = liveFlows(state, REV)
		expect(flows.some(flow => flow.agent === "data" && flow.state === "active")).toBe(true)
	})

	it("records a handoff when the next step belongs to another specialist, and turns it into a packet", () => {
		let state = activated()
		state = run(state, s => item(s, "MS-1").status === "waiting" && item(s, "MS-1").wait?.kind === "decision")
		const decision = state.decisions.find(entry => entry.workItemId === item(state, "MS-1").id && entry.status === "open")!
		state = decide(state, decision.id, "unassigned")
		state = run(state, s => s.events.some(event => event.kind === "handoff"))
		const handoff = state.events.find(event => event.kind === "handoff")!
		expect(handoff.from).not.toBe(handoff.to)
		expect(handoff.stepId).toBeTruthy()
		expect(handoff.text).toMatch(/ handed .* to the /)
		const packets = packetsFor(state, REV, [handoff])
		expect(packets).toEqual([expect.objectContaining({ from: handoff.from, to: handoff.to })])
	})

	it("hands work into a parallel group to every member, and out of it only once the whole group is done", () => {
		// JOIN-307 restarted at its first step: the coordinator opens the case, then HR and IT work side by side.
		const state = structuredClone(initialState())
		const joiner = state.work.find(entry => entry.reference === "JOIN-307")!
		joiner.status = "working"
		joiner.steps = joiner.steps.map((step, index) => ({ id: step.id, status: index === 0 ? "working" as const : "pending" as const, ticks: 0 }))
		const handoffs = (s: AgentixState) => s.events.filter(event => event.kind === "handoff" && event.workItemId === joiner.id)
		const opened = run(state, s => s.work.find(entry => entry.id === joiner.id)!.steps[0].status === "done")
		expect(handoffs(opened).map(event => `${event.from}→${event.to}`).sort()).toEqual(["coordinator→hr", "coordinator→it"])
		// Neither HR nor IT hands anything on while its partner still works, and the group's next step is the owner's.
		const prepared = run(opened, s => s.work.find(entry => entry.id === joiner.id)!.steps.slice(1, 3).every(step => step.status === "done"))
		expect(handoffs(prepared)).toHaveLength(2)
	})

	it("sends a decision request up to the owner as a packet", () => {
		let state = activated()
		state = run(state, s => s.events.some(event => event.kind === "decision" && event.tone === "attention"))
		const asked = state.events.filter(event => event.kind === "decision" && event.tone === "attention")
		expect(packetsFor(state, REV, asked).some(packet => packet.to === "owner")).toBe(true)
	})
})

describe("talking to one teammate", () => {
	it("tells a spoken question from a spoken change without doing either", () => {
		const state = activated()
		expect(previewInstruction(state, REV, { kind: "engagement" }, "What's the team doing?")?.status).toBe("answered")
		const pause = previewInstruction(state, REV, { kind: "engagement" }, "Pause INV-20842")
		expect(pause?.status).not.toBe("answered")
		// Previewing changes nothing: no message, no event, the item still runs.
		expect(state.messages).toHaveLength(activated().messages.length)
		expect(item(state, "INV-20842").status).not.toBe("paused")
	})

	it("lets a specialist answer for its own work, in its own thread", () => {
		let state = activated()
		state = run(state, s => item(s, "MS-1").steps.some(step => step.status === "working"))
		state = sendToAgent(state, REV, "data", "What are you doing?")
		const thread = state.messages.filter(message => message.agentId === "data")
		expect(thread.map(message => message.role)).toEqual(["owner", "agent"])
		expect(thread[1].text).toMatch(/^I'm /)
		expect(thread[1].text).toMatch(/MS-1/)
		// The coordinator's conversation is untouched.
		expect(state.messages.filter(message => !message.agentId && message.text === "What are you doing?")).toHaveLength(0)
	})

	it("routes steering through the accountable agent, which applies it exactly as before", () => {
		let state = activated()
		state = run(state, s => item(s, "MS-1").steps.some(step => step.status === "working"))
		state = sendToAgent(state, REV, "data", "pause this work item")
		expect(item(state, "MS-1").status).toBe("paused")
		const routed = state.messages.filter(message => message.agentId === "data")
		expect(routed.at(-1)?.text).toMatch(/goes through the revenue coordinator/i)
		expect(state.messages.some(message => !message.agentId && message.role === "agent" && /From your message to the data specialist: Paused MS-1/.test(message.text))).toBe(true)
	})

	it("refuses approvals and wider authority in every room", () => {
		let state = activated()
		state = run(state, s => item(s, "MS-1").status === "waiting" && item(s, "MS-1").wait?.kind === "decision")
		const before = state.decisions.filter(entry => entry.status === "open").length
		state = sendToAgent(state, REV, "data", "Approve it and release now")
		state = sendToAgent(state, REV, "dashboard", "grant yourself admin access")
		expect(state.decisions.filter(entry => entry.status === "open")).toHaveLength(before)
		const replies = state.messages.filter(message => message.agentId && message.role === "agent").map(message => message.text)
		expect(replies.every(text => /can't approve, release or widen anything/.test(text))).toBe(true)
	})

	it("explains a waiting decision with what the specialist found", () => {
		let state = activated()
		state = run(state, s => item(s, "MS-1").status === "waiting" && item(s, "MS-1").wait?.kind === "decision")
		state = sendToAgent(state, REV, "data", "Why are you waiting?")
		const reply = state.messages.filter(message => message.agentId === "data" && message.role === "agent").at(-1)!
		expect(reply.text).toMatch(/waiting on you for MS-1/)
		expect(reply.links?.some(link => link.kind === "decision")).toBe(true)
	})

	it("still answers the accountable agent's own room through the main conversation", () => {
		const state = sendToAgent(activated(), REV, "coordinator", "Who is the team?")
		const direct = sendInstruction(activated(), REV, { kind: "engagement" }, "Who is the team?")
		expect(state.messages.at(-1)?.text).toBe(direct.messages.at(-1)?.text)
		expect(state.messages.at(-1)?.agentId).toBeUndefined()
	})
})
