import type { ReactNode } from "react"

/*
 * Sidebar glyphs. One abstract figure per module, drawn from the same
 * vocabulary as the Mark logos (rings, arcs, rounded blocks) instead of stock
 * pictograms. Each figure has a receding back layer (`nv-back`), an accent
 * (`nv-accent`) that takes the module's tint on hover and when the module is
 * open, and a moving part (`nv-move`) with a small, reduced-motion-safe hover
 * gesture. Styles live in portal-shell.css.
 */
export type NavGlyphName = "dashboard" | "projects" | "discovery" | "plan" | "execute" | "agentix" | "settings" | "integrations" | "approvals" | "usage" | "help"

const FIGURES: Record<NavGlyphName, ReactNode> = {
	// Overview: a composed board, one tall panel beside two tiles, the live one filled.
	dashboard: <>
		<rect x="3" y="3" width="8" height="18" rx="2.6" />
		<rect className="nv-solid nv-accent nv-pop" x="14" y="3" width="7" height="7.5" rx="2.2" />
		<rect className="nv-back" x="14" y="13.5" width="7" height="7.5" rx="2.2" />
	</>,
	// Work kept together: two offset layers with a marker on the front one.
	projects: <>
		<rect className="nv-back" x="3" y="3" width="12.5" height="12.5" rx="3.5" />
		<g className="nv-move">
			<rect x="8.5" y="8.5" width="12.5" height="12.5" rx="3.5" />
			<rect className="nv-solid nv-accent" x="12.75" y="12.75" width="4" height="4" rx="1.2" />
		</g>
	</>,
	// Discovery: a radar whose sweep has just found a signal.
	discovery: <>
		<circle cx="12" cy="12" r="8.5" />
		<g className="nv-move">
			<path className="nv-wedge nv-accent" d="M12 12L12 3.5A8.5 8.5 0 0 1 18.01 5.99Z" />
			<path className="nv-accent" d="M12 12L18.01 5.99" />
		</g>
		<circle className="nv-solid" cx="12" cy="12" r="1.6" />
		<circle className="nv-solid nv-back" cx="7.4" cy="15.4" r="1.5" />
	</>,
	// Plan: a route from a start point to a goal.
	plan: <>
		<path className="nv-accent nv-draw" d="M5.5 15.7C5.5 9 18.5 15 18.5 8.3" pathLength={1} />
		<circle className="nv-solid" cx="5.5" cy="18.3" r="2.6" />
		<rect className="nv-back" x="15.9" y="2.9" width="5.2" height="5.2" rx="1.6" />
	</>,
	// Execute: a block being built inside its frame.
	execute: <>
		<path className="nv-back nv-move" d="M12 2.8L21.2 12L12 21.2L2.8 12Z" />
		<rect className="nv-solid nv-accent" x="8.6" y="8.6" width="6.8" height="6.8" rx="2" />
	</>,
	// Agentix: one accountable agent over the duties it hands work to.
	agentix: <>
		<path className="nv-back nv-draw" d="M10.3 9.4L7.8 13.9" pathLength={1} />
		<path className="nv-back nv-draw" d="M13.7 9.4L16.2 13.9" pathLength={1} />
		<circle className="nv-solid nv-accent nv-pop" cx="12" cy="6.6" r="3.2" />
		<circle cx="6.2" cy="17.2" r="3.2" />
		<circle cx="17.8" cy="17.2" r="3.2" />
	</>,
	// Settings: two sliders set to different positions.
	settings: <>
		<path className="nv-back" d="M4 8H20M4 16H20" />
		<circle className="nv-solid nv-accent nv-move" cx="9" cy="8" r="2.5" />
		<circle className="nv-solid nv-move nv-move-back" cx="15" cy="16" r="2.5" />
	</>,
	// Integrations: two systems linked.
	integrations: <>
		<circle className="nv-move" cx="9" cy="12" r="5.5" />
		<circle className="nv-accent nv-move nv-move-back" cx="15" cy="12" r="5.5" />
	</>,
	// Approvals: a stamp and the mark it leaves.
	approvals: <>
		<g className="nv-move">
			<circle cx="12" cy="6.2" r="2.7" />
			<path d="M12 8.9V12.4" />
			<rect x="4.8" y="12.4" width="14.4" height="4.2" rx="1.8" />
		</g>
		<path className="nv-accent" d="M5.5 20.5H18.5" />
	</>,
	// Usage: consumption rising through the cycle.
	usage: <>
		<rect className="nv-solid nv-back nv-grow" x="4" y="12" width="4" height="8" rx="1.5" />
		<rect className="nv-solid nv-back nv-grow" x="10" y="8" width="4" height="12" rx="1.5" />
		<rect className="nv-solid nv-accent nv-grow" x="16" y="4" width="4" height="16" rx="1.5" />
	</>,
	// Help: a ring buoy.
	help: <>
		<circle className="nv-back" cx="12" cy="12" r="8.5" />
		<circle cx="12" cy="12" r="3.6" />
		<path className="nv-accent nv-move" d="M6 6L9.45 9.45M18 6L14.55 9.45M18 18L14.55 14.55M6 18L9.45 14.55" />
	</>,
}

export function NavGlyph({ name, className }: { name: NavGlyphName; className?: string }) {
	return (
		<svg className={`mxp-nav-glyph${className ? ` ${className}` : ""}`} data-glyph={name} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			{FIGURES[name]}
		</svg>
	)
}
