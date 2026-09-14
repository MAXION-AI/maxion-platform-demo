import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react"

import type { MaxionModuleId, PlatformEvent, PlatformState } from "./contracts"
import {
	PLATFORM_STATE_SLICE,
	createInitialPlatformState,
	persistedPlatformStateCodec,
	platformReducer,
	selectPersistedPlatformState,
} from "./platformState"
import { createDemoStateRepository } from "./persistence/DemoStateRepository"

const platformStateRepository = createDemoStateRepository("maxion-demo")

const PlatformStateContext = createContext<PlatformState | null>(null)
const PlatformDispatchContext = createContext<Dispatch<PlatformEvent> | null>(null)

function initializeState(activeModule: MaxionModuleId) {
	const loaded = platformStateRepository.load(PLATFORM_STATE_SLICE, persistedPlatformStateCodec, () => undefined)
	const notice = loaded.status === "recovered" && loaded.reason !== "storage-unavailable"
		? "Saved demo state was invalid and has been safely reset. Other module work was preserved."
		: loaded.reason === "storage-unavailable"
			? "Browser storage is unavailable. Your work remains available in this session, but changes won't survive refresh."
			: null
	return createInitialPlatformState(activeModule, loaded.value, notice)
}

export function PlatformDemoProvider({ activeModule, children }: { activeModule: MaxionModuleId; children: ReactNode }) {
	const [state, dispatch] = useReducer(platformReducer, activeModule, initializeState)
	const { projects, handoffs } = state
	const persisted = useMemo(() => selectPersistedPlatformState({ projects, handoffs }), [projects, handoffs])

	useEffect(() => {
		const result = platformStateRepository.save(PLATFORM_STATE_SLICE, persisted)
		if (!result.ok) dispatch({ type: "persistence/failed" })
	}, [persisted])

	return (
		<PlatformDispatchContext.Provider value={dispatch}>
			<PlatformStateContext.Provider value={state}>{children}</PlatformStateContext.Provider>
		</PlatformDispatchContext.Provider>
	)
}

export function usePlatformDispatch() {
	const dispatch = useContext(PlatformDispatchContext)
	if (!dispatch) throw new Error("usePlatformDispatch must be used inside PlatformDemoProvider")
	return dispatch
}

export function usePlatformSelector<T>(selector: (state: PlatformState) => T): T {
	const state = useContext(PlatformStateContext)
	if (!state) throw new Error("usePlatformSelector must be used inside PlatformDemoProvider")
	return selector(state)
}
