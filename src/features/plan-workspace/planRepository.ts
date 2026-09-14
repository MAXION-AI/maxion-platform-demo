import { demoStateRepository } from "@/features/platform-prototype/persistence/DemoStateRepository"

import { PLAN_STATE_MAX_BYTES, PLAN_STATE_SLICE, createInitialPlanSlice, planStateCodec, type PlanSlice } from "./planState"

export type PlanRepositoryResult = { value: PlanSlice; notice: string | null }

export const planRepository = {
	load(): PlanRepositoryResult {
		const result = demoStateRepository.load(PLAN_STATE_SLICE, planStateCodec, createInitialPlanSlice, PLAN_STATE_MAX_BYTES)
		const quarantined = result.value.quarantine.length
		return {
			value: result.value,
			notice: quarantined
				? `${quarantined} invalid saved Plan ${quarantined === 1 ? "record was" : "records were"} quarantined. Valid work was preserved.`
				: result.status === "recovered" ? "Saved Plan state could not be restored. A safe workspace was opened." : null,
		}
	},
	save(state: PlanSlice) {
		const result = demoStateRepository.save(PLAN_STATE_SLICE, state, PLAN_STATE_MAX_BYTES)
		return { ok: result.ok, message: result.ok ? null : "This Plan remains safe in the current tab, but could not be saved for refresh." }
	},
}
