import { useEffect, useMemo, useRef, useState } from "react"
import { demoSteps, readDemoSnapshot, type DemoSnapshot } from "./progress"
import type { DemoScript } from "./scripts"
import { DEMO_CHANGE_EVENT, DEMO_KEYS, demoKey } from "./session"

const rawState = (script: DemoScript) => {
	try { return `${window.localStorage.getItem(demoKey(DEMO_KEYS.discovery, script.id)) ?? ""} ${window.localStorage.getItem(demoKey(DEMO_KEYS.agentix, script.id)) ?? ""}` } catch { return "" }
}

/*
 * The demo's progress, kept current: the demo tab announces its own writes,
 * and a second window hears them as storage events. Agentix saves on every
 * tick, so the saved text is compared first and parsed only when it changed.
 */
export function useDemoProgress(script: DemoScript) {
	const [snapshot, setSnapshot] = useState<DemoSnapshot>(() => readDemoSnapshot(script))
	const last = useRef(rawState(script))
	useEffect(() => {
		const refresh = () => {
			const raw = rawState(script)
			if (raw === last.current) return
			last.current = raw
			setSnapshot(readDemoSnapshot(script))
		}
		refresh()
		window.addEventListener(DEMO_CHANGE_EVENT, refresh)
		window.addEventListener("storage", refresh)
		return () => {
			window.removeEventListener(DEMO_CHANGE_EVENT, refresh)
			window.removeEventListener("storage", refresh)
		}
	}, [script])
	const progress = useMemo(() => demoSteps(script, snapshot), [script, snapshot])
	return { snapshot, ...progress }
}
