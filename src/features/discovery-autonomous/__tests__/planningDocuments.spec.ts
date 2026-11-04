import { describe, expect, it } from "vitest"
import { DELIVERABLES, DELIVERABLE_CONTENT, DELIVERABLE_CATEGORY, SCENARIOS, type ScenarioKey } from "../model"
import { hasStructuredView, structuredRowCount, structuredTables } from "../deliverables"
import type { Exhibit } from "../deliverables/types"

const KEYS = Object.keys(SCENARIOS) as ScenarioKey[]
const WBS = DELIVERABLES.findIndex(item => item.name === "Project plan and WBS")
const CATALOG = DELIVERABLES.findIndex(item => item.name === "Use case catalog")
type TableExhibit = Extract<Exhibit, { kind: "table" }>
const tablesOf = (body: (typeof DELIVERABLE_CONTENT)[ScenarioKey][number]) => body.sections.flatMap(section => section.exhibit?.kind === "table" ? [{ heading: section.heading, table: section.exhibit as TableExhibit }] : [])

describe("the manifest", () => {
	it("holds eleven documents and every scenario writes them all", () => {
		expect(DELIVERABLES).toHaveLength(11)
		expect(DELIVERABLE_CATEGORY).toHaveLength(11)
		for (const key of KEYS) expect(DELIVERABLE_CONTENT[key]).toHaveLength(11)
	})
})

describe.each(KEYS)("%s planning documents", (key) => {
	const wbs = DELIVERABLE_CONTENT[key][WBS]
	const catalog = DELIVERABLE_CONTENT[key][CATALOG]

	it("has a WBS with stable IDs, owners and dependencies that resolve", () => {
		const breakdown = tablesOf(wbs).find(entry => entry.heading === "Work breakdown")?.table
		expect(breakdown?.columns).toEqual(["ID", "Work package", "Owner", "Depends on", "Due", "Exit criterion"])
		const rows = breakdown?.rows ?? []
		expect(rows.length).toBeGreaterThanOrEqual(8)
		const ids = rows.map(row => row.cells[0])
		expect(new Set(ids).size).toBe(ids.length)
		for (const id of ids) expect(id).toMatch(/^WBS-\d+\.\d+$/)
		rows.forEach(row => {
			expect(row.cells).toHaveLength(6)
			expect(row.cells[2].trim().length).toBeGreaterThan(0)
			expect(row.cells[5].trim().length).toBeGreaterThan(0)
			const depends = row.cells[3]
			if (depends !== "None") for (const dep of depends.match(/WBS-\d+\.\d+/g) ?? []) expect(ids).toContain(dep)
			// A package never waits on itself or on one listed after it.
			for (const dep of depends.match(/WBS-\d+\.\d+/g) ?? []) expect(ids.indexOf(dep)).toBeLessThan(ids.indexOf(row.cells[0]))
		})
		expect(wbs.sections.some(section => section.exhibit?.kind === "timeline")).toBe(true)
	})

	it("has a catalog whose every use case has its own stepped section", () => {
		const list = tablesOf(catalog).find(entry => entry.heading === "Catalog")?.table
		expect(list?.columns).toEqual(["ID", "Use case", "Trigger", "Accountable actor", "Status"])
		const rows = list?.rows ?? []
		expect(rows.length).toBeGreaterThanOrEqual(4)
		for (const row of rows) {
			expect(row.cells[0]).toMatch(/^UC-\d{2}$/)
			expect(["Current", "Proposed", "Selected", "Unresolved"]).toContain(row.cells[4])
			const detail = tablesOf(catalog).find(entry => entry.heading.startsWith(`${row.cells[0]}:`))?.table
			expect(detail?.columns).toEqual(["ID", "Actor", "Action", "Decision rule or output", "On exception"])
			expect(detail?.rows.length).toBeGreaterThanOrEqual(3)
			for (const step of detail?.rows ?? []) expect(step.cells[0].startsWith(`${row.cells[0]}.`)).toBe(true)
		}
	})

	it("names this scenario's own people or systems, not boilerplate", () => {
		const scenario = SCENARIOS[key]
		const text = JSON.stringify([wbs, catalog])
		const firstNames = scenario.people.map(person => person.name.split(" ")[0])
		expect(firstNames.some(name => text.includes(name)) || scenario.people.some(person => text.includes(person.role))).toBe(true)
		// Derived, not invented: it carries figures the scenario's own existing documents state.
		const existing = JSON.stringify(DELIVERABLE_CONTENT[key].slice(0, 9))
		const figures = [...new Set(text.match(/\$?\d[\d,.]*\d%?/g) ?? [])].filter(figure => figure.length >= 3 && existing.includes(figure))
		expect(figures.length).toBeGreaterThanOrEqual(3)
		for (const other of KEYS.filter(entry => entry !== key)) expect(JSON.stringify(DELIVERABLE_CONTENT[other][WBS])).not.toBe(JSON.stringify(wbs))
	})

	it("doesn't use a dash as sentence punctuation", () => {
		expect(JSON.stringify([wbs, catalog])).not.toMatch(/ [—–] /)
	})

	it("reads as structured rows carrying the same IDs and a row per statement", () => {
		const wbsTables = structuredTables(wbs, "Project plan and WBS")
		const rows = wbsTables.flatMap(table => table.rows.map(row => row.id))
		expect(rows).toContain("WBS-1.1")
		expect(new Set(rows).size).toBe(rows.length)
		expect(structuredRowCount(wbsTables)).toBe(rows.length)
		const catalogRows = structuredTables(catalog, "Use case catalog").flatMap(table => table.rows.map(row => row.id))
		expect(catalogRows).toContain("UC-01")
		expect(catalogRows).toContain("UC-01.1")
		const technical = structuredTables(DELIVERABLE_CONTENT[key][DELIVERABLES.findIndex(item => item.name === "Technical assessment")], "Technical assessment")
		expect(structuredRowCount(technical)).toBeGreaterThan(0)
		const requirements = structuredTables(DELIVERABLE_CONTENT[key][DELIVERABLES.findIndex(item => item.name === "Requirements specification")], "Requirements specification")
		expect(structuredRowCount(requirements)).toBeGreaterThan(0)
	})
})

describe("the structured view", () => {
	it("is offered for the four documents the plan names and no others", () => {
		expect(DELIVERABLES.filter(item => hasStructuredView(item.name)).map(item => item.name).sort()).toEqual(["Project plan and WBS", "Requirements specification", "Technical assessment", "Use case catalog"])
	})
})
