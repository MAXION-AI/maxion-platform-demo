import { demoStateRepository } from "@/features/platform-prototype/persistence/DemoStateRepository"

import {
	DISCOVERY_STATE_MAX_BYTES,
	DISCOVERY_STATE_SLICE,
	LEGACY_DISCOVERY_STORAGE_KEYS,
	createInitialDiscoverySlice,
	discoveryStateCodec,
	type DiscoverySlice,
} from "./discoveryState"

export type DiscoveryStateRepository = {
	load: () => { value: DiscoverySlice; notice: string | null }
	save: (state: DiscoverySlice) => { ok: boolean; message: string | null }
}

function createDiscoveryStateRepository(): DiscoveryStateRepository {
	return {
		load: () => {
			const result = demoStateRepository.load(DISCOVERY_STATE_SLICE, discoveryStateCodec, createInitialDiscoverySlice, DISCOVERY_STATE_MAX_BYTES, LEGACY_DISCOVERY_STORAGE_KEYS)
			const quarantined = result.value.quarantine.length
			const notice = quarantined
				? `${quarantined} invalid saved Discovery ${quarantined === 1 ? "record was" : "records were"} quarantined. Valid work was preserved.`
				: result.status === "recovered" && result.reason === "storage-unavailable"
					? "Browser storage is unavailable. This Discovery will remain available until this tab closes."
					: result.status === "recovered"
						? "Saved Discovery state could not be restored. A safe workspace was opened."
						: null
			return { value: result.value.sessions.length ? result.value : createInitialDiscoverySlice(), notice }
		},
		save: (state) => {
			const result = demoStateRepository.save(DISCOVERY_STATE_SLICE, state, DISCOVERY_STATE_MAX_BYTES)
			return { ok: result.ok, message: result.ok ? null : "This change is safe in the current session, but could not be saved for refresh." }
		},
	}
}

export const discoveryStateRepository = createDiscoveryStateRepository()
