import type { DeliverableBody } from "./types"

/*
 * D-044: one content source, two ways to read it. The structured view is not a second document: it
 * is computed from the same body the reader shows, at the same revision, so the two can never
 * disagree. Rows keep the IDs the document already gives them (WBS-1.1, UC-01.2); anything without
 * one gets a stable ID from its section's name and its place in it, which an edit to a paragraph
 * never moves.
 */
export type StructuredTable = { title: string; columns: string[]; rows: Array<{ id: string; cells: string[] }> }

export const STRUCTURED_DOCUMENTS: Record<string, string> = {
	"Technical assessment": "TA",
	"Use case catalog": "UC",
	"Requirements specification": "REQ",
	"Project plan and WBS": "WBS",
}
export const hasStructuredView = (name: string) => Object.hasOwn(STRUCTURED_DOCUMENTS, name)

const ID_PATTERN = /^[A-Z]{1,5}-?\d+(?:\.\d+)?$/
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 3).map(word => word[0]).join("").toUpperCase() || "S"

export function structuredTables(body: DeliverableBody, name: string): StructuredTable[] {
	const prefix = STRUCTURED_DOCUMENTS[name] ?? "DOC"
	const tables: StructuredTable[] = []
	const other: StructuredTable = { title: "Statements", columns: ["Kind", "Item", "Detail"], rows: [] }
	for (const section of body.sections) {
		const code = slug(section.heading)
		const exhibit = section.exhibit
		if (exhibit?.kind === "table") {
			const identified = exhibit.rows.length > 0 && exhibit.rows.every(row => ID_PATTERN.test(row.cells[0]?.trim() ?? ""))
			tables.push({
				title: section.heading,
				columns: identified ? exhibit.columns.slice(1) : exhibit.columns,
				rows: exhibit.rows.map((row, index) => identified
					? { id: row.cells[0].trim(), cells: row.cells.slice(1) }
					: { id: `${prefix}-${code}-${index + 1}`, cells: row.cells }),
			})
		}
		section.bullets?.forEach((bullet, index) => other.rows.push({ id: `${prefix}-${code}-B${index + 1}`, cells: [section.heading, bullet.label, bullet.detail] }))
	}
	body.findings.forEach((finding, index) => other.rows.push({ id: `${prefix}-F${index + 1}`, cells: ["Finding", finding.label, finding.detail] }))
	body.nextSteps.forEach((step, index) => other.rows.push({ id: `${prefix}-N${index + 1}`, cells: ["Next step", step.action, `${step.owner} · ${step.due}`] }))
	return other.rows.length ? [...tables, other] : tables
}

export const structuredRowCount = (tables: readonly StructuredTable[]) => tables.reduce((total, table) => total + table.rows.length, 0)
