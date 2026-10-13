import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react"

import { ARCHITECTURE_TEXT, BAR_GUTTER, BAR_VALUE_GAP, EXHIBIT_FRAME_MAX, EXHIBIT_FRAME_MIN, EXHIBIT_LINE, EXHIBIT_TEXT, barPlotEnd, formatValue, layoutArchitecture, layoutQuadrantLabels, layoutTimeline, lineAxis, roundValue as round, waterfallLabelLines } from "./exhibitLayout"
import { figures, textWidth, wrapText } from "./textMetrics"
import type { Exhibit, ExhibitTone } from "./types"

// Exhibits are drawn as inline SVG against the workspace tokens so they stay
// legible in both themes and never depend on a charting library. Each plot is
// laid out at its own width in CSS pixels, one viewBox unit to a pixel, so its
// text renders at exactly the design system's 12px; a plot narrower than
// EXHIBIT_FRAME_MIN keeps that frame and scrolls inside its card. Every exhibit
// is announced as a single labelled image with its finding in the accessible
// name, and every numeric series is also written out in text so the analysis
// survives without the picture.

const TONE_FILL: Record<ExhibitTone, string> = {
	brand: "var(--exh-a)",
	muted: "var(--exh-b)",
	neutral: "var(--exh-c)",
	warn: "var(--exh-d)",
	danger: "var(--exh-e)",
}

const toneFill = (tone: ExhibitTone | undefined, fallback: ExhibitTone = "brand") => TONE_FILL[tone ?? fallback]

type Frame = { width: number }

function BarExhibit({ exhibit, width }: Frame & { exhibit: Extract<Exhibit, { kind: "bar" }> }) {
	const rowHeight = 38
	const labelWidth = BAR_GUTTER
	const plotEnd = barPlotEnd(exhibit, width)
	const height = exhibit.data.length * rowHeight + 12
	const max = Math.max(...exhibit.data.map((item) => item.value), 1)
	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
			<line x1={labelWidth} y1={4} x2={labelWidth} y2={height - 8} stroke="var(--exh-grid)" strokeWidth={1} />
			{exhibit.data.map((item, index) => {
				const y = index * rowHeight + 6
				const barWidth = Math.max(2, (item.value / max) * (plotEnd - labelWidth))
				return (
					<g key={item.label}>
						<text x={labelWidth - 12} y={y + 16} textAnchor="end" className={item.emphasis ? "exh-label is-emphasis" : "exh-label"}>{item.label}</text>
						{item.note ? <text x={labelWidth - 12} y={y + 31} textAnchor="end" className="exh-sub">{item.note}</text> : null}
						<rect x={labelWidth + 1} y={y + 4} width={plotEnd - labelWidth} height={17} rx={3} fill="var(--exh-track)" />
						<rect x={labelWidth + 1} y={y + 4} width={barWidth} height={17} rx={3} fill={item.emphasis ? "var(--exh-a)" : "var(--exh-b)"} />
						<text x={labelWidth + barWidth + BAR_VALUE_GAP} y={y + 17} className={item.emphasis ? "exh-value is-emphasis" : "exh-value"}>{formatValue(item.value, exhibit.unit)}</text>
					</g>
				)
			})}
		</svg>
	)
}

function StackExhibit({ exhibit, width }: Frame & { exhibit: Extract<Exhibit, { kind: "stack" }> }) {
	const rowHeight = 46
	const labelWidth = 176
	const plotEnd = width - 20
	const height = exhibit.rows.length * rowHeight + 10
	return (
		<>
			<ul className="exhibit-legend">
				{exhibit.segments.map((segment) => <li key={segment.label}><i style={{ background: toneFill(segment.tone) }} />{segment.label}</li>)}
			</ul>
			<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
				{exhibit.rows.map((row, rowIndex) => {
					const total = row.values.reduce((sum, value) => sum + value, 0) || 1
					const y = rowIndex * rowHeight + 6
					let cursor = labelWidth
					return (
						<g key={row.label}>
							<text x={labelWidth - 12} y={y + 18} textAnchor="end" className="exh-label">{row.label}</text>
							{row.note ? <text x={labelWidth - 12} y={y + 34} textAnchor="end" className="exh-sub">{row.note}</text> : null}
							{row.values.map((value, index) => {
								const segmentWidth = (value / total) * (plotEnd - labelWidth)
								const x = cursor
								cursor += segmentWidth
								return (
									<g key={exhibit.segments[index]?.label ?? index}>
										<rect x={x} y={y + 4} width={Math.max(0, segmentWidth - 1.5)} height={22} rx={2.5} fill={toneFill(exhibit.segments[index]?.tone)} />
										{segmentWidth > 46 ? <text x={x + segmentWidth / 2} y={y + 19} textAnchor="middle" className="exh-inset">{formatValue(round((value / total) * 100), "%")}</text> : null}
									</g>
								)
							})}
						</g>
					)
				})}
			</svg>
		</>
	)
}

function WaterfallExhibit({ exhibit, width }: Frame & { exhibit: Extract<Exhibit, { kind: "waterfall" }> }) {
	const top = 26
	const bottom = 206
	const left = 24
	const right = width - 20
	const slot = (right - left) / exhibit.steps.length
	const barWidth = Math.min(78, slot - 22)
	// Each category label wraps inside its own column, so neighbours never meet.
	const labels = exhibit.steps.map((step) => waterfallLabelLines(step.label, slot))
	const labelTop = bottom + 22
	const height = labelTop + (Math.max(...labels.map((lines) => lines.length)) - 1) * EXHIBIT_LINE + 10

	let running = 0
	const columns = exhibit.steps.map((step) => {
		if (step.role === "base") {
			running = step.value
			return { ...step, from: 0, to: running }
		}
		if (step.role === "total") {
			const column = { ...step, from: 0, to: step.value }
			running = step.value
			return column
		}
		const from = running
		running = round(running + step.value)
		return { ...step, from, to: running }
	})
	const values = columns.flatMap((column) => [column.from, column.to]).concat(0)
	const max = Math.max(...values)
	const min = Math.min(...values)
	const span = max - min || 1
	const y = (value: number) => bottom - ((value - min) / span) * (bottom - top)

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
			<line x1={left} y1={y(min)} x2={right} y2={y(min)} stroke="var(--exh-grid)" strokeWidth={1} />
			{columns.map((column, index) => {
				const x = left + index * slot + (slot - barWidth) / 2
				const topY = y(Math.max(column.from, column.to))
				const barHeight = Math.max(2, Math.abs(y(column.from) - y(column.to)))
				const fill = column.role === "delta" ? (column.value < 0 ? "var(--exh-d)" : "var(--exh-b)") : "var(--exh-a)"
				const next = columns[index + 1]
				return (
					<g key={`${column.label}-${index}`}>
						<rect x={x} y={topY} width={barWidth} height={barHeight} rx={2.5} fill={fill} />
						{next ? <line x1={x + barWidth} y1={y(column.to)} x2={x + slot} y2={y(column.to)} stroke="var(--exh-grid-strong)" strokeWidth={1} strokeDasharray="3 3" /> : null}
						<text x={x + barWidth / 2} y={topY - 8} textAnchor="middle" className={column.role === "delta" ? "exh-value" : "exh-value is-emphasis"}>
							{column.role === "delta" && column.value > 0 ? "+" : ""}{formatValue(column.role === "delta" ? column.value : column.to, exhibit.unit)}
						</text>
						<text x={x + barWidth / 2} y={labelTop} textAnchor="middle" className="exh-axis">
							{labels[index].map((line, position) => <tspan key={line} x={x + barWidth / 2} dy={position ? EXHIBIT_LINE : 0}>{line}</tspan>)}
						</text>
					</g>
				)
			})}
		</svg>
	)
}

function LineExhibit({ exhibit, width }: Frame & { exhibit: Extract<Exhibit, { kind: "line" }> }) {
	const height = 264
	const { min, span, grid, left } = lineAxis(exhibit)
	const right = width - 18
	const top = 20
	const bottom = 208
	const x = (index: number) => left + (index / Math.max(1, exhibit.ticks.length - 1)) * (right - left)
	const y = (value: number) => bottom - ((value - min) / span) * (bottom - top)
	// A tick label keeps its point's centre unless that would run it past the frame.
	const tickX = (tick: string, index: number) => {
		const half = textWidth(tick, EXHIBIT_TEXT, figures(400)) / 2
		return Math.min(width - half, Math.max(half, x(index)))
	}

	return (
		<>
			<ul className="exhibit-legend">
				{exhibit.series.map((series) => <li key={series.label}><i style={{ background: toneFill(series.tone) }} />{series.label}</li>)}
			</ul>
			<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
				{grid.map(({ value, label }) => (
					<g key={value}>
						<line x1={left} y1={y(value)} x2={right} y2={y(value)} stroke="var(--exh-grid)" strokeWidth={1} />
						<text x={left - 10} y={y(value) + 4} textAnchor="end" className="exh-axis">{label}</text>
					</g>
				))}
				{exhibit.band ? (
					<g>
						<line x1={left} y1={y(exhibit.band.value)} x2={right} y2={y(exhibit.band.value)} stroke="var(--exh-d)" strokeWidth={1.5} strokeDasharray="5 4" />
						<text x={right} y={y(exhibit.band.value) - 8} textAnchor="end" className="exh-band">{exhibit.band.label}</text>
					</g>
				) : null}
				{exhibit.series.map((series) => (
					<g key={series.label}>
						<polyline
							points={series.points.map((point, index) => `${x(index)},${y(point)}`).join(" ")}
							fill="none"
							stroke={toneFill(series.tone)}
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeDasharray={series.dashed ? "5 4" : undefined}
						/>
						{series.points.map((point, index) => <circle key={`${series.label}-${index}`} cx={x(index)} cy={y(point)} r={3} fill="var(--exh-plot-bg)" stroke={toneFill(series.tone)} strokeWidth={2} />)}
					</g>
				))}
				{exhibit.ticks.map((tick, index) => <text key={tick} x={tickX(tick, index)} y={bottom + 26} textAnchor="middle" className="exh-axis">{tick}</text>)}
			</svg>
		</>
	)
}

function QuadrantExhibit({ exhibit, width }: Frame & { exhibit: Extract<Exhibit, { kind: "quadrant" }> }) {
	const height = 392
	const left = 96
	const right = width - 60
	const top = 32
	const bottom = 320
	const x = (value: number) => left + (value / 100) * (right - left)
	const y = (value: number) => bottom - (value / 100) * (bottom - top)
	const labels = useMemo(() => layoutQuadrantLabels(exhibit.points, { left, right, top, bottom }), [exhibit.points, right])
	// The impact axis labels wrap to the margin rather than running off the frame.
	const [lowImpact, highImpact] = exhibit.yAxis.map((label) => wrapText(label, left - 20, EXHIBIT_TEXT, figures(400)))
	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
			<rect x={left} y={top} width={right - left} height={bottom - top} rx={4} fill="var(--exh-track)" stroke="var(--exh-grid)" />
			<rect x={x(50)} y={top} width={right - x(50)} height={y(50) - top} fill="var(--exh-quad)" />
			<line x1={x(50)} y1={top} x2={x(50)} y2={bottom} stroke="var(--exh-grid-strong)" strokeDasharray="4 4" />
			<line x1={left} y1={y(50)} x2={right} y2={y(50)} stroke="var(--exh-grid-strong)" strokeDasharray="4 4" />
			<text x={left} y={bottom + 24} className="exh-axis">{exhibit.xAxis[0]}</text>
			<text x={right} y={bottom + 24} textAnchor="end" className="exh-axis">{exhibit.xAxis[1]}</text>
			<text x={left - 14} y={bottom - (lowImpact.length - 1) * EXHIBIT_LINE} textAnchor="end" className="exh-axis">
				{lowImpact.map((line, position) => <tspan key={line} x={left - 14} dy={position ? EXHIBIT_LINE : 0}>{line}</tspan>)}
			</text>
			<text x={left - 14} y={top + 10} textAnchor="end" className="exh-axis">
				{highImpact.map((line, position) => <tspan key={line} x={left - 14} dy={position ? EXHIBIT_LINE : 0}>{line}</tspan>)}
			</text>
			{exhibit.points.map((point) => <circle key={point.label} cx={x(point.x)} cy={y(point.y)} r={point.emphasis ? 8 : 6} fill={point.emphasis ? "var(--exh-a)" : "var(--exh-b)"} stroke="var(--exh-plot-bg)" strokeWidth={2} />)}
			{exhibit.points.map((point, index) => (
				<text key={point.label} x={labels[index].x} y={labels[index].y} textAnchor={labels[index].anchor} className={point.emphasis ? "exh-point is-emphasis" : "exh-point"}>{point.label}</text>
			))}
		</svg>
	)
}

function HeatmapExhibit({ exhibit, width }: Frame & { exhibit: Extract<Exhibit, { kind: "heatmap" }> }) {
	const labelWidth = 218
	const cellHeight = 38
	const cellWidth = (width - 20 - labelWidth) / exhibit.columns.length
	// A header wraps inside its column; every header sits on the same bottom line.
	const headers = exhibit.columns.map((column) => wrapText(column, cellWidth - 8, EXHIBIT_TEXT, figures(400)))
	const headerLines = Math.max(...headers.map((lines) => lines.length))
	const headerHeight = 30 + (headerLines - 1) * EXHIBIT_LINE
	const height = headerHeight + exhibit.rows.length * cellHeight + 10
	return (
		<>
			<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
				{exhibit.columns.map((column, index) => {
					const x = labelWidth + index * cellWidth + cellWidth / 2
					const lines = headers[index]
					return (
						<text key={column} x={x} y={18 + (headerLines - lines.length) * EXHIBIT_LINE} textAnchor="middle" className="exh-axis">
							{lines.map((line, position) => <tspan key={line} x={x} dy={position ? EXHIBIT_LINE : 0}>{line}</tspan>)}
						</text>
					)
				})}
				{exhibit.rows.map((row, rowIndex) => (
					<g key={row.label}>
						<text x={labelWidth - 12} y={headerHeight + rowIndex * cellHeight + 24} textAnchor="end" className="exh-label">{row.label}</text>
						{row.values.map((value, columnIndex) => (
							<g key={`${row.label}-${exhibit.columns[columnIndex]}`}>
								<rect
									x={labelWidth + columnIndex * cellWidth + 2}
									y={headerHeight + rowIndex * cellHeight + 4}
									width={cellWidth - 4}
									height={cellHeight - 8}
									rx={3}
									className="exh-heat"
									style={{ "--exh-heat": value / 100 } as CSSProperties}
								/>
								<text
									x={labelWidth + columnIndex * cellWidth + cellWidth / 2}
									y={headerHeight + rowIndex * cellHeight + 24}
									textAnchor="middle"
									className="exh-cell"
								>
									{value}
								</text>
							</g>
						))}
					</g>
				))}
			</svg>
			<p className="exhibit-scale"><span>{exhibit.scale[0]}</span><i /><span>{exhibit.scale[1]}</span></p>
		</>
	)
}

function TableExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "table" }> }) {
	return (
		<div className="exhibit-table-scroll">
			<table className="exhibit-table">
				<caption className="visually-hidden">{exhibit.title}</caption>
				<thead>
					<tr>{exhibit.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
				</thead>
				<tbody>
					{exhibit.rows.map((row) => (
						<tr key={row.cells.join("|")} className={row.emphasis ? "is-emphasis" : undefined}>
							{row.cells.map((cell, index) => index === 0 ? <th key={cell} scope="row">{cell}</th> : <td key={`${cell}-${index}`}>{cell}</td>)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

const TONE_CLASS: Record<ExhibitTone, string> = { brand: "is-brand", muted: "is-muted", neutral: "is-neutral", warn: "is-warn", danger: "is-warn" }
const isWarn = (tone: ExhibitTone | undefined) => tone === "warn" || tone === "danger"

// Cards in lanes, joined by routed edges whose labels are pills in the channels
// between rows. All geometry, every wrap included, comes from layoutArchitecture.
function ArchitectureExhibit({ exhibit, width }: Frame & { exhibit: Extract<Exhibit, { kind: "architecture" }> }) {
	const layout = useMemo(() => layoutArchitecture(exhibit, width), [exhibit, width])
	return (
		<svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
			<defs>
				<marker id="exh-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--exh-edge)" />
				</marker>
				<marker id="exh-arrow-warn" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--exh-d)" />
				</marker>
			</defs>
			{layout.lanes.map((lane) => (
				<g key={lane.label}>
					<rect className="exh-lane-band" x={lane.x} y={lane.y} width={lane.width} height={lane.height} rx={8} />
					<text x={lane.x + lane.width / 2} y={ARCHITECTURE_TEXT.laneTitle} textAnchor="middle" className="exh-lane">{lane.label}</text>
				</g>
			))}
			{layout.edges.map(({ edge, d }) => (
				<path
					key={`path-${edge.from}-${edge.to}`}
					d={d}
					className={isWarn(edge.tone) ? "exh-edge is-warn" : "exh-edge"}
					strokeDasharray={edge.dashed ? "5 4" : undefined}
					markerEnd={isWarn(edge.tone) ? "url(#exh-arrow-warn)" : "url(#exh-arrow)"}
				/>
			))}
			{layout.nodes.map(({ node, x, y, width: nodeWidth, height, title, detail }) => {
				const tone = node.tone ?? "neutral"
				const textX = x + ARCHITECTURE_TEXT.padLeft
				const titleY = y + ARCHITECTURE_TEXT.padTop + 12
				return (
					<g key={node.id} data-node={node.id} className={`exh-node-card ${TONE_CLASS[tone]}`}>
						<rect className="exh-node-box" x={x} y={y} width={nodeWidth} height={height} rx={8} />
						{tone === "neutral" ? null : <rect className="exh-node-accent" x={x + 4} y={y + 10} width={3} height={height - 20} rx={1.5} />}
						<text x={textX} y={titleY} className="exh-node">
							{title.map((line, position) => <tspan key={line} x={textX} dy={position ? EXHIBIT_LINE : 0}>{line}</tspan>)}
						</text>
						{detail.length ? (
							<text x={textX} y={titleY + title.length * EXHIBIT_LINE + 2} className="exh-node-sub">
								{detail.map((line, position) => <tspan key={line} x={textX} dy={position ? EXHIBIT_LINE : 0}>{line}</tspan>)}
							</text>
						) : null}
					</g>
				)
			})}
			{layout.edges.map(({ edge, pill }) => pill ? (
				<g key={`pill-${edge.from}-${edge.to}`} className={isWarn(edge.tone) ? "exh-pill is-warn" : "exh-pill"}>
					<rect x={pill.x} y={pill.y} width={pill.width} height={pill.height} rx={pill.height / 2} />
					<text x={pill.x + pill.width / 2} y={pill.y + pill.height / 2 + 4} textAnchor="middle" className="exh-edge-label">{pill.label}</text>
				</g>
			) : null)}
		</svg>
	)
}

// A self-call's loop and label run right of its lifeline, or left of it when the frame has no room.
const SELF_CALL_LABEL = 42
const selfCallOnLeft = (step: { label: string; note?: string; tone?: ExhibitTone }, lifeline: number, width: number) =>
	lifeline + SELF_CALL_LABEL + Math.max(textWidth(step.label, EXHIBIT_TEXT, isWarn(step.tone) ? 600 : 400), step.note ? textWidth(step.note, EXHIBIT_TEXT) : 0) > width - 4

function SequenceExhibit({ exhibit, width }: Frame & { exhibit: Extract<Exhibit, { kind: "sequence" }> }) {
	const stepHeight = 52
	const headTop = 8
	const headHeight = 40
	const firstStep = headTop + headHeight + 40
	const height = firstStep + exhibit.steps.length * stepHeight
	const column = width / exhibit.actors.length
	const x = (index: number) => column * index + column / 2

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
			<defs>
				<marker id="exh-seq-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--exh-edge)" />
				</marker>
				<marker id="exh-seq-arrow-warn" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--exh-d)" />
				</marker>
			</defs>
			{exhibit.actors.map((actor, index) => (
				<g key={actor}>
					<rect x={x(index) - column / 2 + 10} y={headTop} width={column - 20} height={headHeight} rx={6} fill="var(--exh-node-bg)" stroke="var(--exh-grid-strong)" />
					<text x={x(index)} y={headTop + 25} textAnchor="middle" className="exh-actor">{actor}</text>
					<line x1={x(index)} y1={headTop + headHeight} x2={x(index)} y2={height - 8} stroke="var(--exh-grid-strong)" strokeDasharray="4 5" />
				</g>
			))}
			{exhibit.steps.map((step, index) => {
				const y = firstStep + index * stepHeight
				const warn = step.tone === "warn" || step.tone === "danger"
				const stroke = warn ? "var(--exh-d)" : "var(--exh-edge)"
				const marker = warn ? "url(#exh-seq-arrow-warn)" : "url(#exh-seq-arrow)"
				const selfCall = step.from === step.to
				const side = selfCall && selfCallOnLeft(step, x(step.from), width) ? -1 : 1
				const labelX = selfCall ? x(step.from) + side * SELF_CALL_LABEL : (x(step.from) + x(step.to)) / 2
				const anchor = selfCall ? (side > 0 ? "start" : "end") : "middle"
				return (
					<g key={`${step.label}-${index}`}>
						{selfCall ? (
							<path d={`M ${x(step.from)} ${y - 8} h ${side * 30} v 22 h ${side * -26}`} fill="none" stroke={stroke} strokeWidth={1.5} markerEnd={marker} />
						) : (
							<line x1={x(step.from)} y1={y} x2={x(step.to) + (step.to > step.from ? -6 : 6)} y2={y} stroke={stroke} strokeWidth={1.5} markerEnd={marker} strokeDasharray={step.tone === "muted" ? "5 4" : undefined} />
						)}
						<text x={labelX} y={y - 11} textAnchor={anchor} className={warn ? "exh-step is-warn" : "exh-step"}>{step.label}</text>
						{step.note ? <text x={labelX} y={y + 20} textAnchor={anchor} className="exh-step-note">{step.note}</text> : null}
					</g>
				)
			})}
		</svg>
	)
}

function TimelineExhibit({ exhibit, width }: Frame & { exhibit: Extract<Exhibit, { kind: "timeline" }> }) {
	const labelWidth = 150
	const plotEnd = width - 20
	const headerHeight = 28
	const unit = (plotEnd - labelWidth) / exhibit.ticks.length
	const layout = useMemo(() => layoutTimeline(exhibit, { labelWidth, plotEnd, top: headerHeight, width }), [exhibit, plotEnd, width])
	const hasMarkers = Boolean(exhibit.markers?.length)
	const height = layout.bottom + (hasMarkers ? 46 : 8)
	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
			{exhibit.ticks.map((tick, index) => (
				<g key={tick}>
					<text x={labelWidth + index * unit + unit / 2} y={16} textAnchor="middle" className="exh-axis">{tick}</text>
					<line x1={labelWidth + index * unit} y1={headerHeight - 6} x2={labelWidth + index * unit} y2={layout.bottom} stroke="var(--exh-grid)" />
				</g>
			))}
			{exhibit.lanes.map((lane, laneIndex) => {
				const laid = layout.lanes[laneIndex]
				return (
					<g key={lane.label}>
						<text x={labelWidth - 12} y={laid.top + 28} textAnchor="end" className="exh-label">{lane.label}</text>
						{lane.bars.map((bar, barIndex) => {
							const { x, y, width: barWidth, label } = laid.bars[barIndex]
							// Inside the bar the label takes the inset ink; outside it reads in ink.
							return (
								<g key={`${lane.label}-${bar.label}`}>
									<rect x={x} y={y} width={barWidth} height={24} rx={4} fill={toneFill(bar.tone, "muted")} />
									<text x={label.x} y={label.y} textAnchor={label.anchor} className={label.inside ? "exh-inset" : "exh-value"}>{bar.label}</text>
								</g>
							)
						})}
					</g>
				)
			})}
			{exhibit.markers?.map((marker) => {
				const x = labelWidth + marker.at * unit
				const y = layout.bottom
				return (
					<g key={marker.label}>
						<path d={`M ${x} ${y + 8} l 7 8 l -7 8 l -7 -8 z`} fill="var(--exh-a)" />
						{/* The last gate sits on the frame's edge, so its label ends at the diamond. */}
						<text x={x > width - 30 ? x + 7 : x} y={y + 38} textAnchor={x > width - 30 ? "end" : "middle"} className="exh-axis is-strong">{marker.label}</text>
					</g>
				)
			})}
		</svg>
	)
}

function ExhibitGraphic({ exhibit, width }: Frame & { exhibit: Exhibit }) {
	switch (exhibit.kind) {
		case "bar": return <BarExhibit exhibit={exhibit} width={width} />
		case "stack": return <StackExhibit exhibit={exhibit} width={width} />
		case "waterfall": return <WaterfallExhibit exhibit={exhibit} width={width} />
		case "line": return <LineExhibit exhibit={exhibit} width={width} />
		case "quadrant": return <QuadrantExhibit exhibit={exhibit} width={width} />
		case "heatmap": return <HeatmapExhibit exhibit={exhibit} width={width} />
		case "table": return <TableExhibit exhibit={exhibit} />
		case "architecture": return <ArchitectureExhibit exhibit={exhibit} width={width} />
		case "sequence": return <SequenceExhibit exhibit={exhibit} width={width} />
		case "timeline": return <TimelineExhibit exhibit={exhibit} width={width} />
	}
}

// The plot's own width, floored to whole pixels so text never scales below 12px.
// Before the first measurement (and without layout, as under test) it is the widest frame.
function usePlotFrame() {
	const ref = useRef<HTMLDivElement>(null)
	const [width, setWidth] = useState(EXHIBIT_FRAME_MAX)
	useLayoutEffect(() => {
		const plot = ref.current
		if (!plot) return
		const measure = () => {
			const available = Math.floor(plot.clientWidth)
			if (available > 0) setWidth(Math.min(EXHIBIT_FRAME_MAX, Math.max(EXHIBIT_FRAME_MIN, available)))
		}
		measure()
		if (typeof ResizeObserver === "undefined") return
		const observer = new ResizeObserver(measure)
		observer.observe(plot)
		return () => observer.disconnect()
	}, [])
	return [ref, width] as const
}

// Evidence identifiers read in mono; the rest of the source line is prose.
function sourceParts(source: string) {
	return source.split(/(\[[^\]]+\])/).filter(Boolean).map((part, position) => /^\[[^\]]+\]$/.test(part) ? <code key={position} className="exhibit-id">{part}</code> : part)
}

export function DeliverableExhibit({ exhibit, index }: { exhibit: Exhibit; index: number }) {
	const [plotRef, width] = usePlotFrame()
	return (
		<figure className="exhibit">
			<figcaption className="exhibit-head">
				<p className="exhibit-number">Exhibit {index}</p>
				<h5>{exhibit.title}</h5>
			</figcaption>
			<div ref={plotRef} className={`exhibit-plot is-${exhibit.kind}`} style={{ "--exh-frame-min": `${EXHIBIT_FRAME_MIN}px` } as CSSProperties}>
				<ExhibitGraphic exhibit={exhibit} width={width} />
			</div>
			<p className="exhibit-caption">{exhibit.caption}</p>
			<p className="exhibit-source">Source · {sourceParts(exhibit.source)}</p>
		</figure>
	)
}
