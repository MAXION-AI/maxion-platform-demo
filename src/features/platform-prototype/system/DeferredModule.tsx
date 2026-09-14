import { useEffect, useState, type ComponentType } from "react"

import { ModuleErrorBoundary } from "../ModuleErrorBoundary"

type DeferredModuleProps<Props extends object> = {
	load: () => Promise<{ default: ComponentType<Props> }>
	moduleName: string
	moduleProps: Props
	onReturnToDashboard: () => void
}

/** Loads a module only after its route is visited and contains chunk failures. */
export function DeferredModule<Props extends object>({ load, moduleName, moduleProps, onReturnToDashboard }: DeferredModuleProps<Props>) {
	const [attempt, setAttempt] = useState(0)
	const [Loaded, setLoaded] = useState<ComponentType<Props> | null>(null)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		let current = true
		setFailed(false)
		load().then(
			(module) => { if (current) setLoaded(() => module.default) },
			() => { if (current) setFailed(true) },
		)
		return () => { current = false }
	}, [attempt, load])

	if (failed) {
		return (
			<section className="mxp-module-error" role="alert" aria-labelledby={`mxp-${moduleName.toLowerCase()}-load-error`}>
				<span>MXP-UI-RECOVERY</span>
				<h1 id={`mxp-${moduleName.toLowerCase()}-load-error`}>{moduleName} couldn't finish loading.</h1>
				<p>Your in-session work remains available. Retry this workspace, or return to the dashboard and continue elsewhere.</p>
				<div>
					<button type="button" className="mxp-primary" onClick={() => { setLoaded(null); setAttempt((value) => value + 1) }}>Try again</button>
					<button type="button" onClick={onReturnToDashboard}>Return to dashboard</button>
				</div>
			</section>
		)
	}

	if (!Loaded) {
		return <section className="mxp-module-loading" role="status" aria-label={`Loading ${moduleName}`}><span /><span /><span /><p>Loading {moduleName}…</p></section>
	}

	return <ModuleErrorBoundary moduleName={moduleName} resetKey={`${moduleName}-${attempt}`} onReturnToDashboard={onReturnToDashboard}><Loaded {...moduleProps} /></ModuleErrorBoundary>
}
