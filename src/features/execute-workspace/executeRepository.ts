import { demoStateRepository } from "@/features/platform-prototype/persistence/DemoStateRepository"

import { EXECUTE_STATE_MAX_BYTES, EXECUTE_STATE_SLICE, createInitialExecuteSlice, executeStateCodec, type ExecuteSlice } from "./executeState"

export const executeRepository = {
	load() {
		const result = demoStateRepository.load(EXECUTE_STATE_SLICE, executeStateCodec, createInitialExecuteSlice, EXECUTE_STATE_MAX_BYTES)
		return { value: result.value, notice: result.status === "recovered" ? "Saved Execute state could not be restored. A safe workspace was opened." : null }
	},
	save(state: ExecuteSlice) {
		const result = demoStateRepository.save(EXECUTE_STATE_SLICE, state, EXECUTE_STATE_MAX_BYTES)
		return { ok: result.ok, message: result.ok ? null : "This run remains available in the current tab but could not be saved for refresh." }
	},
}
