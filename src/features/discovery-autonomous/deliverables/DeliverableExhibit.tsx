import type { CSSProperties } from "react"

import type { ArchitectureEdge, ArchitectureNode, Exhibit, ExhibitTone } from "./types"

// Exhibits are drawn as inline SVG against the workspace tokens so they stay
// legible in both themes, scale with the reader column, and never depend on a
// charting library. Every exhibit is announced as a single labelled image with
// its finding in the accessible name, and every numeric series is also written
// out in text so the analysis survives without the picture.

const TONE_FILL: Record<ExhibitTone, string> = {
	brand: "var(--exh-a)",
	muted: "var(--exh-b)",
	neutral: "var(--exh-c)",
	warn: "var(--exh-d)",
	danger: "var(--exh-e)",
}

const toneFill = (tone: ExhibitTone | undefined, fallback: ExhibitTone = "brand") => TONE_FILL[tone ?? fallback]

const round = (value: number) => Math.round(value * 100) / 100

// Currency reads as a prefix ($8.4m), ratios and percentages as a suffix with no
// space (2.6×, 32%), and everything else as a value with its unit after it.
const CURRENCY_UNIT = /^([$€£])(k|m|bn)?$/

const formatValue = (value: number, unit?: string) => {
	const body = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)
	if (!unit) return body
	if (unit === "%") return `${body}%`
	if (unit === "×") return `${body}×`
	const currency = CURRENCY_UNIT.exec(unit)
	if (currency) return `${currency[1]}${body}${currency[2] ?? ""}`
	return `${body} ${unit}`
}

function BarExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "bar" }> }) {
	const rowHeight = 38
	const labelWidth = 214
	const plotEnd = 636
	const width = 720
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
						{item.note ? <text x={labelWidth - 12} y={y + 29} textAnchor="end" className="exh-sub">{item.note}</text> : null}
						<rect x={labelWidth + 1} y={y + 4} width={plotEnd - labelWidth} height={17} rx={3} fill="var(--exh-track)" />
						<rect x={labelWidth + 1} y={y + 4} width={barWidth} height={17} rx={3} fill={item.emphasis ? "var(--exh-a)" : "var(--exh-b)"} />
						<text x={labelWidth + barWidth + 10} y={y + 17} className={item.emphasis ? "exh-value is-emphasis" : "exh-value"}>{formatValue(item.value, exhibit.unit)}</text>
					</g>
				)
			})}
		</svg>
	)
}

function StackExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "stack" }> }) {
	const rowHeight = 46
	const labelWidth = 176
	const plotEnd = 700
	const width = 720
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
							{row.note ? <text x={labelWidth - 12} y={y + 31} textAnchor="end" className="exh-sub">{row.note}</text> : null}
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

function WaterfallExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "waterfall" }> }) {
	const width = 720
	const height = 268
	const top = 26
	const bottom = 206
	const left = 24
	const right = 700
	const slot = (right - left) / exhibit.steps.length
	const barWidth = Math.min(78, slot - 22)

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
						<text x={x + barWidth / 2} y={bottom + 22} textAnchor="middle" className="exh-axis">{column.label.split(" ").slice(0, 2).join(" ")}</text>
						{column.label.split(" ").length > 2 ? <text x={x + barWidth / 2} y={bottom + 35} textAnchor="middle" className="exh-axis">{column.label.split(" ").slice(2).join(" ")}</text> : null}
					</g>
				)
			})}
		</svg>
	)
}

function LineExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "line" }> }) {
	const width = 720
	const height = 264
	const left = 58
	const right = 702
	const top = 20
	const bottom = 208
	const allPoints = exhibit.series.flatMap((series) => series.points).concat(exhibit.band ? [exhibit.band.value] : [])
	const max = Math.max(...allPoints)
	const min = Math.min(...allPoints, 0)
	const span = max - min || 1
	const x = (index: number) => left + (index / Math.max(1, exhibit.ticks.length - 1)) * (right - left)
	const y = (value: number) => bottom - ((value - min) / span) * (bottom - top)
	const gridValues = [0, 0.25, 0.5, 0.75, 1].map((step) => min + step * span)

	return (
		<>
			<ul className="exhibit-legend">
				{exhibit.series.map((series) => <li key={series.label}><i style={{ background: toneFill(series.tone) }} />{series.label}</li>)}
			</ul>
			<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
				{gridValues.map((value) => (
					<g key={value}>
						<line x1={left} y1={y(value)} x2={right} y2={y(value)} stroke="var(--exh-grid)" strokeWidth={1} />
						<text x={left - 10} y={y(value) + 4} textAnchor="end" className="exh-axis">{formatValue(round(value), exhibit.unit)}</text>
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
				{exhibit.ticks.map((tick, index) => <text key={tick} x={x(index)} y={bottom + 26} textAnchor="middle" className="exh-axis">{tick}</text>)}
			</svg>
		</>
	)
}

function QuadrantExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "quadrant" }> }) {
	const width = 720
	const height = 392
	const left = 96
	const right = 660
	const top = 32
	const bottom = 320
	const x = (value: number) => left + (value / 100) * (right - left)
	const y = (value: number) => bottom - (value / 100) * (bottom - top)
	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
			<rect x={left} y={top} width={right - left} height={bottom - top} rx={4} fill="var(--exh-track)" stroke="var(--exh-grid)" />
			<rect x={x(50)} y={top} width={right - x(50)} height={y(50) - top} fill="var(--exh-quad)" />
			<line x1={x(50)} y1={top} x2={x(50)} y2={bottom} stroke="var(--exh-grid-strong)" strokeDasharray="4 4" />
			<line x1={left} y1={y(50)} x2={right} y2={y(50)} stroke="var(--exh-grid-strong)" strokeDasharray="4 4" />
			<text x={left} y={bottom + 24} className="exh-axis">{exhibit.xAxis[0]}</text>
			<text x={right} y={bottom + 24} textAnchor="end" className="exh-axis">{exhibit.xAxis[1]}</text>
			<text x={left - 14} y={bottom} textAnchor="end" className="exh-axis">{exhibit.yAxis[0]}</text>
			<text x={left - 14} y={top + 10} textAnchor="end" className="exh-axis">{exhibit.yAxis[1]}</text>
			{exhibit.points.map((point) => {
				// Near an edge the label anchors inward so it stays on the plot.
				const anchor = point.x > 80 ? "end" : point.x < 20 ? "start" : "middle"
				const labelX = x(point.x) + (anchor === "end" ? 9 : anchor === "start" ? -9 : 0)
				return (
					<g key={point.label}>
						<circle cx={x(point.x)} cy={y(point.y)} r={point.emphasis ? 8 : 6} fill={point.emphasis ? "var(--exh-a)" : "var(--exh-b)"} stroke="var(--exh-plot-bg)" strokeWidth={2} />
						<text x={labelX} y={y(point.y) - 14} textAnchor={anchor} className={point.emphasis ? "exh-point is-emphasis" : "exh-point"}>{point.label}</text>
					</g>
				)
			})}
		</svg>
	)
}

function HeatmapExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "heatmap" }> }) {
	const width = 720
	const labelWidth = 218
	const cellHeight = 38
	const headerHeight = 30
	const height = headerHeight + exhibit.rows.length * cellHeight + 10
	const cellWidth = (700 - labelWidth) / exhibit.columns.length
	return (
		<>
			<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
				{exhibit.columns.map((column, index) => <text key={column} x={labelWidth + index * cellWidth + cellWidth / 2} y={18} textAnchor="middle" className="exh-axis">{column}</text>)}
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

const LANE_WIDTH = 164
const LANE_GAP = 62
const NODE_HEIGHT = 64
const ROW_GAP = 26

const nodeX = (node: ArchitectureNode) => 16 + node.lane * (LANE_WIDTH + LANE_GAP)
const nodeY = (node: ArchitectureNode) => 56 + node.row * (NODE_HEIGHT + ROW_GAP)

function ArchitectureExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "architecture" }> }) {
	const rows = Math.max(...exhibit.nodes.map((node) => node.row)) + 1
	const width = 16 + exhibit.lanes.length * (LANE_WIDTH + LANE_GAP) - LANE_GAP + 16
	const height = 56 + rows * (NODE_HEIGHT + ROW_GAP) + 8
	const byId = new Map(exhibit.nodes.map((node) => [node.id, node]))

	const edgePath = (edge: ArchitectureEdge) => {
		const from = byId.get(edge.from)
		const to = byId.get(edge.to)
		if (!from || !to) return null
		const fromY = nodeY(from) + NODE_HEIGHT / 2
		const toY = nodeY(to) + NODE_HEIGHT / 2
		if (from.lane === to.lane) {
			const x = nodeX(from) + LANE_WIDTH / 2
			const startY = fromY < toY ? nodeY(from) + NODE_HEIGHT : nodeY(from)
			const endY = fromY < toY ? nodeY(to) - 7 : nodeY(to) + NODE_HEIGHT + 7
			return { d: `M ${x} ${startY} L ${x} ${endY}`, labelX: x, labelY: (startY + endY) / 2 }
		}
		const forward = to.lane > from.lane
		const startX = forward ? nodeX(from) + LANE_WIDTH : nodeX(from)
		const endX = forward ? nodeX(to) - 7 : nodeX(to) + LANE_WIDTH + 7
		const midX = (startX + endX) / 2
		return { d: `M ${startX} ${fromY} H ${midX} V ${toY} H ${endX}`, labelX: midX, labelY: (fromY + toY) / 2 }
	}

	const routed = exhibit.edges.flatMap((edge) => {
		const path = edgePath(edge)
		if (!path) return []
		return [{ edge, path, sameLane: byId.get(edge.from)?.lane === byId.get(edge.to)?.lane }]
	})

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
			<defs>
				<marker id="exh-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--exh-edge)" />
				</marker>
				<marker id="exh-arrow-warn" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--exh-d)" />
				</marker>
			</defs>
			{exhibit.lanes.map((lane, index) => (
				<g key={lane}>
					<rect x={16 + index * (LANE_WIDTH + LANE_GAP) - 12} y={30} width={LANE_WIDTH + 24} height={height - 36} rx={6} fill="var(--exh-track)" />
					<text x={16 + index * (LANE_WIDTH + LANE_GAP) + LANE_WIDTH / 2} y={20} textAnchor="middle" className="exh-lane">{lane}</text>
				</g>
			))}
			{routed.map(({ edge, path }) => (
				<path
					key={`path-${edge.from}-${edge.to}-${edge.label ?? ""}`}
					d={path.d}
					fill="none"
					stroke={edge.tone === "warn" || edge.tone === "danger" ? "var(--exh-d)" : "var(--exh-edge)"}
					strokeWidth={1.5}
					strokeDasharray={edge.dashed ? "5 4" : undefined}
					markerEnd={edge.tone === "warn" || edge.tone === "danger" ? "url(#exh-arrow-warn)" : "url(#exh-arrow)"}
				/>
			))}
			{exhibit.nodes.map((node) => {
				const x = nodeX(node)
				const y = nodeY(node)
				const tone = node.tone ?? "neutral"
				return (
					<g key={node.id}>
						<rect
							x={x}
							y={y}
							width={LANE_WIDTH}
							height={NODE_HEIGHT}
							rx={7}
							fill="var(--exh-node-bg)"
							stroke={tone === "brand" ? "var(--exh-a)" : tone === "warn" ? "var(--exh-d)" : "var(--exh-grid-strong)"}
							strokeWidth={tone === "neutral" ? 1 : 1.6}
						/>
						<rect x={x} y={y} width={4} height={NODE_HEIGHT} rx={2} fill={tone === "neutral" ? "var(--exh-c)" : toneFill(tone)} />
						<text x={x + 16} y={node.detail ? y + 26 : y + 37} className="exh-node">{node.label}</text>
						{node.detail ? <text x={x + 16} y={y + 43} className="exh-node-sub">{node.detail}</text> : null}
					</g>
				)
			})}
			{routed.map(({ edge, path, sameLane }) => edge.label ? (
				<text
					key={`label-${edge.from}-${edge.to}-${edge.label}`}
					x={path.labelX}
					y={path.labelY - 7}
					textAnchor="middle"
					className={sameLane ? "exh-edge-label is-inlane" : "exh-edge-label"}
				>
					{edge.label}
				</text>
			) : null)}
		</svg>
	)
}

function SequenceExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "sequence" }> }) {
	const width = 720
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
				return (
					<g key={`${step.label}-${index}`}>
						{selfCall ? (
							<path d={`M ${x(step.from)} ${y - 8} h 30 v 22 h -26`} fill="none" stroke={stroke} strokeWidth={1.5} markerEnd={marker} />
						) : (
							<line x1={x(step.from)} y1={y} x2={x(step.to) + (step.to > step.from ? -6 : 6)} y2={y} stroke={stroke} strokeWidth={1.5} markerEnd={marker} strokeDasharray={step.tone === "muted" ? "5 4" : undefined} />
						)}
						<text x={selfCall ? x(step.from) + 42 : (x(step.from) + x(step.to)) / 2} y={y - 11} textAnchor={selfCall ? "start" : "middle"} className={warn ? "exh-step is-warn" : "exh-step"}>{step.label}</text>
						{step.note ? <text x={selfCall ? x(step.from) + 42 : (x(step.from) + x(step.to)) / 2} y={y + 20} textAnchor={selfCall ? "start" : "middle"} className="exh-step-note">{step.note}</text> : null}
					</g>
				)
			})}
		</svg>
	)
}

function TimelineExhibit({ exhibit }: { exhibit: Extract<Exhibit, { kind: "timeline" }> }) {
	const width = 720
	const labelWidth = 150
	const plotEnd = 700
	const laneHeight = 46
	const headerHeight = 28
	const hasMarkers = Boolean(exhibit.markers?.length)
	const height = headerHeight + exhibit.lanes.length * laneHeight + (hasMarkers ? 46 : 8)
	const unit = (plotEnd - labelWidth) / exhibit.ticks.length
	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="exhibit-svg" role="img" aria-label={exhibit.title}>
			{exhibit.ticks.map((tick, index) => (
				<g key={tick}>
					<text x={labelWidth + index * unit + unit / 2} y={16} textAnchor="middle" className="exh-axis">{tick}</text>
					<line x1={labelWidth + index * unit} y1={headerHeight - 6} x2={labelWidth + index * unit} y2={headerHeight + exhibit.lanes.length * laneHeight} stroke="var(--exh-grid)" />
				</g>
			))}
			{exhibit.lanes.map((lane, laneIndex) => (
				<g key={lane.label}>
					<text x={labelWidth - 12} y={headerHeight + laneIndex * laneHeight + 28} textAnchor="end" className="exh-label">{lane.label}</text>
					{lane.bars.map((bar) => {
						const barWidth = Math.max(10, bar.span * unit - 4)
						const barX = labelWidth + bar.start * unit + 2
						const baseline = headerHeight + laneIndex * laneHeight + 28
						// A label that will not fit inside the bar is written beside it in
						// ink; the inset colour is only legible against the bar fill.
						const fits = bar.label.length * 5.4 + 18 <= barWidth
						return (
							<g key={`${lane.label}-${bar.label}`}>
								<rect x={barX} y={headerHeight + laneIndex * laneHeight + 12} width={barWidth} height={24} rx={4} fill={toneFill(bar.tone, "muted")} />
								<text x={fits ? barX + 10 : barX + barWidth + 8} y={baseline} className={fits ? "exh-inset" : "exh-value"}>{bar.label}</text>
							</g>
						)
					})}
				</g>
			))}
			{exhibit.markers?.map((marker) => {
				const x = labelWidth + marker.at * unit
				const y = headerHeight + exhibit.lanes.length * laneHeight
				return (
					<g key={marker.label}>
						<path d={`M ${x} ${y + 8} l 7 8 l -7 8 l -7 -8 z`} fill="var(--exh-a)" />
						<text x={x} y={y + 38} textAnchor="middle" className="exh-axis is-strong">{marker.label}</text>
					</g>
				)
			})}
		</svg>
	)
}

function ExhibitGraphic({ exhibit }: { exhibit: Exhibit }) {
	switch (exhibit.kind) {
		case "bar": return <BarExhibit exhibit={exhibit} />
		case "stack": return <StackExhibit exhibit={exhibit} />
		case "waterfall": return <WaterfallExhibit exhibit={exhibit} />
		case "line": return <LineExhibit exhibit={exhibit} />
		case "quadrant": return <QuadrantExhibit exhibit={exhibit} />
		case "heatmap": return <HeatmapExhibit exhibit={exhibit} />
		case "table": return <TableExhibit exhibit={exhibit} />
		case "architecture": return <ArchitectureExhibit exhibit={exhibit} />
		case "sequence": return <SequenceExhibit exhibit={exhibit} />
		case "timeline": return <TimelineExhibit exhibit={exhibit} />
	}
}

export function DeliverableExhibit({ exhibit, index }: { exhibit: Exhibit; index: number }) {
	return (
		<figure className="exhibit">
			<figcaption className="exhibit-head">
				<p className="exhibit-number">Exhibit {index}</p>
				<h5>{exhibit.title}</h5>
			</figcaption>
			<div className={`exhibit-plot is-${exhibit.kind}`}>
				<ExhibitGraphic exhibit={exhibit} />
			</div>
			<p className="exhibit-caption">{exhibit.caption}</p>
			<p className="exhibit-source">Source · {exhibit.source}</p>
		</figure>
	)
}
