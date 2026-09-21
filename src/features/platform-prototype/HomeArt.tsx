import { Mark, markTint } from "@/design/primitives"
import type { ReactNode } from "react"

import { NavGlyph, type NavGlyphName } from "./NavGlyphs"

/*
 * Illustrations for the Dashboard and Projects, in the manner of the ElevenLabs
 * Home tiles (mobbin ec8402ae): a small piece of product UI on the tile's grey
 * with one colourful badge that names the action. Everything is drawn from the
 * design tokens (see workspace-home.css), so the art follows the theme.
 */
export type ActionArtKind = "project" | "discovery" | "plan" | "execute" | "agentix" | "consult"

const Badge = ({ cx, cy, r = 11, tint, children }: { cx: number; cy: number; r?: number; tint: number; children: ReactNode }) => (
	<g className="ha-badge" data-tint={tint}>
		<circle cx={cx} cy={cy} r={r} />
		<g className="ha-badge-glyph">{children}</g>
	</g>
)

const Lines = ({ x, y, widths, gap = 8 }: { x: number; y: number; widths: number[]; gap?: number }) => (
	<>{widths.map((width, index) => <rect key={index} className={index === 0 ? "ha-line is-strong" : "ha-line"} x={x} y={y + index * gap} width={width} height={4} rx={2} />)}</>
)

const ART: Record<ActionArtKind, ReactNode> = {
	project: <>
		<rect className="ha-card is-back" x="24" y="20" width="60" height="44" rx="8" />
		<g className="ha-front">
			<rect className="ha-card" x="38" y="30" width="60" height="44" rx="8" />
			<Lines x={48} y={42} widths={[28, 40, 20]} />
		</g>
		<Badge cx={36} cy={72} tint={3}><path d="M36 67.5V76.5M31.5 72H40.5" /></Badge>
	</>,
	discovery: <>
		<g className="ha-front">
			<rect className="ha-card" x="22" y="26" width="70" height="48" rx="8" />
			<Lines x={32} y={38} widths={[34, 48, 26]} />
			<rect className="ha-soft" data-tint="5" x="64" y="56" width="20" height="10" rx="5" />
		</g>
		<Badge cx={90} cy={30} r={12} tint={5}><circle cx="90" cy="30" r="5" /><path d="M90 30L93.5 26.5" /></Badge>
	</>,
	plan: <>
		<path className="ha-route" d="M38 48C46 48 44 36 52 36M70 36C80 36 74 60 84 60" />
		<rect className="ha-card" x="16" y="38" width="22" height="20" rx="6" />
		<rect className="ha-soft is-node" data-tint="0" x="52" y="26" width="18" height="20" rx="6" />
		<rect className="ha-card" x="84" y="50" width="22" height="20" rx="6" />
		<Badge cx={61} cy={70} r={10} tint={0}><path d="M56.5 70.5L59.5 73.5L65.5 67" /></Badge>
	</>,
	execute: <>
		<g className="ha-front">
			<rect className="ha-card" x="20" y="22" width="80" height="52" rx="8" />
			<circle className="ha-dot" cx="29" cy="31" r="2" />
			<circle className="ha-dot" cx="36" cy="31" r="2" />
			<rect className="ha-soft" data-tint="4" x="30" y="42" width="22" height="4" rx="2" />
			<rect className="ha-line" x="56" y="42" width="26" height="4" rx="2" />
			<rect className="ha-soft" data-tint="1" x="36" y="51" width="30" height="4" rx="2" />
			<rect className="ha-line" x="30" y="60" width="18" height="4" rx="2" />
		</g>
		<Badge cx={94} cy={70} tint={4}><path className="is-fill" d="M91.5 65.5V74.5L98.5 70Z" /></Badge>
	</>,
	// The accountable agent (the badge carries the sidebar figure) routing work to two live duties.
	agentix: <>
		<path className="ha-route" data-tint="2" d="M52 25C58 25 60 29 60 35M60 61C60 67 62 73 70 73" />
		<g className="ha-front">
			<rect className="ha-card" x="12" y="18" width="40" height="14" rx="7" />
			<circle className="ha-live" data-tint="2" cx="21" cy="25" r="2.5" />
			<rect className="ha-line" x="27" y="23" width="18" height="4" rx="2" />
			<rect className="ha-card" x="70" y="66" width="40" height="14" rx="7" />
			<circle className="ha-live" data-tint="1" cx="79" cy="73" r="2.5" />
			<rect className="ha-line" x="85" y="71" width="18" height="4" rx="2" />
		</g>
		<Badge cx={60} cy={48} r={13} tint={2}>
			<path className="is-soft" d="M58.8 45.6L57.1 48.9M61.2 45.6L62.9 48.9" strokeWidth="1.4" />
			<circle className="is-fill" cx="60" cy="43.4" r="2.5" />
			<circle cx="55.6" cy="51.6" r="2.3" strokeWidth="1.6" />
			<circle cx="64.4" cy="51.6" r="2.3" strokeWidth="1.6" />
		</Badge>
	</>,
	consult: <>
		<g className="ha-front">
			<rect className="ha-card" x="16" y="24" width="58" height="22" rx="11" />
			<Lines x={26} y={33} widths={[34]} />
			<rect className="ha-soft" data-tint="5" x="44" y="54" width="60" height="22" rx="11" />
			<rect className="ha-line is-on-tint" x="54" y="63" width="36" height="4" rx="2" />
		</g>
		<g className="ha-orb">
			<circle cx="92" cy="28" r="12" />
			<circle className="ha-orb-sheen" cx="88" cy="24" r="5" />
		</g>
	</>,
}

export function ActionArt({ kind }: { kind: ActionArtKind }) {
	return <svg className="ha-art" viewBox="0 0 120 96" aria-hidden="true" focusable="false">{ART[kind]}</svg>
}

/* An activity avatar: the module's glyph on its tint, with a status dot like the Home library's badge. */
export type ActivityTone = "attention" | "live" | "success" | "info"
const MODULE_TINT: Partial<Record<NavGlyphName, number>> = { dashboard: 1, projects: 3, discovery: 5, plan: 0, execute: 4, agentix: 2 }
export function ActivityAvatar({ glyph, tone }: { glyph: NavGlyphName; tone: ActivityTone }) {
	return (
		<span className="ha-avatar" data-tint={MODULE_TINT[glyph] ?? "neutral"} aria-hidden="true">
			<NavGlyph name={glyph} />
			{tone !== "info" ? <i className={`ha-avatar-status is-${tone}`} /> : null}
		</span>
	)
}

/* Project artwork: the project's own tint, a document sheet and its logo. */
export function ProjectArt({ seed, compact = false }: { seed: string; compact?: boolean }) {
	return (
		<span className={`ha-project${compact ? " is-compact" : ""}`} data-tint={markTint(seed)} aria-hidden="true">
			<span className="ha-project-sheet">
				<i /><i /><i />
			</span>
			<Mark seed={seed} className="ha-project-mark" />
		</span>
	)
}
