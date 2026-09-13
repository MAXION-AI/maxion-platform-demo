import { Component, type ErrorInfo, type ReactNode } from "react"

type ModuleErrorBoundaryProps = {
	children: ReactNode
	moduleName: string
	onReturnToDashboard: () => void
	resetKey: string
}

type ModuleErrorBoundaryState = {
	error: Error | null
	retry: number
}

/**
 * Keeps one module failure from taking down the persistent MAXION shell. The
 * fallback deliberately exposes recovery rather than internal exception text;
 * production telemetry can bind the stable error id to structured diagnostics.
 */
export class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
	state: ModuleErrorBoundaryState = { error: null, retry: 0 }

	static getDerivedStateFromError(error: Error): Partial<ModuleErrorBoundaryState> {
		return { error }
	}

	componentDidUpdate(previous: ModuleErrorBoundaryProps) {
		if (previous.resetKey !== this.props.resetKey && this.state.error) {
			this.setState({ error: null })
		}
	}

	componentDidCatch(_error: Error, _info: ErrorInfo) {
		// Intentionally no console output: production adapters should emit a
		// structured, redacted event keyed by MXP-UI-RECOVERY.
	}

	private retry = () => {
		this.setState((state) => ({ error: null, retry: state.retry + 1 }))
	}

	render() {
		if (this.state.error) {
			return (
				<section className="mxp-module-error" role="alert" aria-labelledby={`mxp-${this.props.moduleName.toLowerCase().replaceAll(" ", "-")}-error`}>
					<span>MXP-UI-RECOVERY</span>
					<h1 id={`mxp-${this.props.moduleName.toLowerCase().replaceAll(" ", "-")}-error`}>{this.props.moduleName} couldn't finish loading.</h1>
					<p>Your in-session work remains available. Retry this workspace, or return to the dashboard and continue elsewhere.</p>
					<div>
						<button type="button" className="mxp-primary" onClick={this.retry}>Try again</button>
						<button type="button" onClick={this.props.onReturnToDashboard}>Return to dashboard</button>
					</div>
				</section>
			)
		}

		return <div className="mxp-module-boundary" key={this.state.retry}>{this.props.children}</div>
	}
}
