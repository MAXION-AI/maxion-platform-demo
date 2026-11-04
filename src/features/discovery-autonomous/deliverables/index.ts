import type { ScenarioKey } from "../model"

import { DILIGENCE_APPROVED_REVISIONS, DILIGENCE_DELIVERABLES } from "./diligence"
import { ENTERPRISE_APPROVED_REVISIONS, ENTERPRISE_DELIVERABLES } from "./enterprise"
import { ORDERSYNC_APPROVED_REVISIONS, ORDERSYNC_DELIVERABLES } from "./ordersync"
import { S4HANA_APPROVED_REVISIONS, S4HANA_DELIVERABLES } from "./s4hana"
import { REVENUE_APPROVED_REVISIONS, REVENUE_DELIVERABLES } from "./revenue"
import { SERVICENOW_APPROVED_REVISIONS, SERVICENOW_DELIVERABLES } from "./servicenow"
import { TPRM_APPROVED_REVISIONS, TPRM_DELIVERABLES } from "./tprm"
import * as DILIGENCE_PLANNING from "./planning/diligence"
import * as ENTERPRISE_PLANNING from "./planning/enterprise"
import * as ORDERSYNC_PLANNING from "./planning/ordersync"
import * as REVENUE_PLANNING from "./planning/revenue"
import * as S4HANA_PLANNING from "./planning/s4hana"
import * as SERVICENOW_PLANNING from "./planning/servicenow"
import * as TPRM_PLANNING from "./planning/tprm"
import { DELIVERABLES as DELIVERABLES_MANIFEST } from "./types"
import type { DeliverableBody, DeliverableRevision } from "./types"

export { DELIVERABLES } from "./types"
export type { DeliverableBody, DeliverableRevision, DeliverableSection, Exhibit } from "./types"
export { DeliverableExhibit } from "./DeliverableExhibit"
export { hasStructuredView, structuredRowCount, structuredTables, type StructuredTable } from "./structured"

// Each deliverable in the package reads as its own document. Bodies are indexed
// parallel to DELIVERABLES so the reader switches content, not just the header.
export const DELIVERABLE_CONTENT: Record<ScenarioKey, DeliverableBody[]> = {
	tprm: [...TPRM_DELIVERABLES, TPRM_PLANNING.WBS, TPRM_PLANNING.CATALOG],
	diligence: [...DILIGENCE_DELIVERABLES, DILIGENCE_PLANNING.WBS, DILIGENCE_PLANNING.CATALOG],
	enterprise: [...ENTERPRISE_DELIVERABLES, ENTERPRISE_PLANNING.WBS, ENTERPRISE_PLANNING.CATALOG],
	revenue: [...REVENUE_DELIVERABLES, REVENUE_PLANNING.WBS, REVENUE_PLANNING.CATALOG],
	servicenow: [...SERVICENOW_DELIVERABLES, SERVICENOW_PLANNING.WBS, SERVICENOW_PLANNING.CATALOG],
	ordersync: [...ORDERSYNC_DELIVERABLES, ORDERSYNC_PLANNING.WBS, ORDERSYNC_PLANNING.CATALOG],
	s4hana: [...S4HANA_DELIVERABLES, S4HANA_PLANNING.WBS, S4HANA_PLANNING.CATALOG],
}

// The reader maps a manifest entry to a body by index. A scenario that falls out
// of step would silently render the wrong document under the right title, so the
// mismatch is made loud at module load instead.
for (const [scenario, bodies] of Object.entries(DELIVERABLE_CONTENT)) {
	if (bodies.length !== DELIVERABLES_MANIFEST.length) {
		throw new Error(`Discovery package: ${scenario} has ${bodies.length} documents for ${DELIVERABLES_MANIFEST.length} manifest entries`)
	}
}

export type DeliverableDecision = "pending" | "approved" | "modified"

const APPROVED_REVISIONS: Record<ScenarioKey, Partial<Record<number, DeliverableRevision>>> = {
	tprm: TPRM_APPROVED_REVISIONS,
	diligence: DILIGENCE_APPROVED_REVISIONS,
	enterprise: ENTERPRISE_APPROVED_REVISIONS,
	revenue: REVENUE_APPROVED_REVISIONS,
	servicenow: SERVICENOW_APPROVED_REVISIONS,
	ordersync: ORDERSYNC_APPROVED_REVISIONS,
	s4hana: S4HANA_APPROVED_REVISIONS,
}

function revise(body: DeliverableBody, revision: DeliverableRevision | undefined): DeliverableBody {
	if (!revision) return body
	const sections = body.sections.map((section) => {
		const paragraphs = revision.sections?.[section.heading]
		return paragraphs ? { ...section, paragraphs } : section
	})
	const findings = body.findings.map((finding) => revision.findings?.[finding.label] ?? finding)
	return { ...body, sections, findings }
}

// Built once, so a document keeps its identity between renders.
const APPROVED_CONTENT = Object.fromEntries(
	Object.entries(DELIVERABLE_CONTENT).map(([scenario, bodies]) => [scenario, bodies.map((body, index) => revise(body, APPROVED_REVISIONS[scenario as ScenarioKey][index]))]),
) as Record<ScenarioKey, DeliverableBody[]>

// A revision that names a passage the document no longer has would silently
// leave the approved path describing the other outcome.
for (const [scenario, revisions] of Object.entries(APPROVED_REVISIONS)) {
	for (const [index, revision] of Object.entries(revisions)) {
		const body = DELIVERABLE_CONTENT[scenario as ScenarioKey][Number(index)]
		const missing = [
			...Object.keys(revision?.sections ?? {}).filter((heading) => !body?.sections.some((section) => section.heading === heading)),
			...Object.keys(revision?.findings ?? {}).filter((label) => !body?.findings.some((finding) => finding.label === label)),
		]
		if (missing.length) throw new Error(`Discovery package: ${scenario} document ${index} has no passage for ${missing.join(", ")}`)
	}
}

// The documents as written for the path the owner chose at the exception.
export function deliverableBodies(scenario: ScenarioKey, decision: DeliverableDecision): DeliverableBody[] {
	return decision === "approved" ? APPROVED_CONTENT[scenario] : DELIVERABLE_CONTENT[scenario]
}
