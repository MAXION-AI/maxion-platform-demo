import type { ScenarioKey } from "../model"

import { DILIGENCE_DELIVERABLES } from "./diligence"
import { ENTERPRISE_DELIVERABLES } from "./enterprise"
import { TPRM_DELIVERABLES } from "./tprm"
import { DELIVERABLES as DELIVERABLES_MANIFEST } from "./types"
import type { DeliverableBody } from "./types"

export { DELIVERABLES } from "./types"
export type { DeliverableBody, DeliverableSection, Exhibit } from "./types"
export { DeliverableExhibit } from "./DeliverableExhibit"

// Each deliverable in the package reads as its own document. Bodies are indexed
// parallel to DELIVERABLES so the reader switches content, not just the header.
export const DELIVERABLE_CONTENT: Record<ScenarioKey, DeliverableBody[]> = {
	tprm: TPRM_DELIVERABLES,
	diligence: DILIGENCE_DELIVERABLES,
	enterprise: ENTERPRISE_DELIVERABLES,
}

// The reader maps a manifest entry to a body by index. A scenario that falls out
// of step would silently render the wrong document under the right title, so the
// mismatch is made loud at module load instead.
for (const [scenario, bodies] of Object.entries(DELIVERABLE_CONTENT)) {
	if (bodies.length !== DELIVERABLES_MANIFEST.length) {
		throw new Error(`Discovery package: ${scenario} has ${bodies.length} documents for ${DELIVERABLES_MANIFEST.length} manifest entries`)
	}
}
