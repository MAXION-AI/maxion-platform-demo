// The decision package is the product of the Discovery, so each deliverable is
// written as a real consulting document rather than a summary card: an
// answer-first governing thought, a quantified case, exhibits that carry the
// analysis, and next steps with a named owner and a date.

export type ExhibitDatum = {
	label: string
	value: number
	note?: string
	emphasis?: boolean
}

export type ExhibitTone = "brand" | "muted" | "neutral" | "warn" | "danger"

export type ArchitectureNode = {
	id: string
	label: string
	detail?: string
	lane: number
	row: number
	tone?: ExhibitTone
}

export type ArchitectureEdge = {
	from: string
	to: string
	label?: string
	tone?: ExhibitTone
	dashed?: boolean
}

type ExhibitBase = {
	// Exhibit titles are action titles: they state the finding, not the topic.
	title: string
	caption: string
	source: string
}

export type Exhibit =
	| (ExhibitBase & { kind: "bar"; unit?: string; data: ExhibitDatum[] })
	| (ExhibitBase & { kind: "stack"; unit?: string; segments: Array<{ label: string; tone: ExhibitTone }>; rows: Array<{ label: string; values: number[]; note?: string }> })
	| (ExhibitBase & { kind: "waterfall"; unit?: string; steps: Array<{ label: string; value: number; role: "base" | "delta" | "total" }> })
	| (ExhibitBase & { kind: "line"; unit?: string; ticks: string[]; series: Array<{ label: string; points: number[]; tone?: ExhibitTone; dashed?: boolean }>; band?: { label: string; value: number } })
	| (ExhibitBase & { kind: "quadrant"; xAxis: [string, string]; yAxis: [string, string]; points: Array<{ label: string; x: number; y: number; emphasis?: boolean }> })
	| (ExhibitBase & { kind: "heatmap"; columns: string[]; rows: Array<{ label: string; values: number[] }>; scale: [string, string] })
	| (ExhibitBase & { kind: "table"; columns: string[]; rows: Array<{ cells: string[]; emphasis?: boolean }> })
	| (ExhibitBase & { kind: "architecture"; lanes: string[]; nodes: ArchitectureNode[]; edges: ArchitectureEdge[] })
	| (ExhibitBase & { kind: "sequence"; actors: string[]; steps: Array<{ from: number; to: number; label: string; note?: string; tone?: ExhibitTone }> })
	| (ExhibitBase & { kind: "timeline"; ticks: string[]; lanes: Array<{ label: string; bars: Array<{ label: string; start: number; span: number; tone?: ExhibitTone }> }>; markers?: Array<{ label: string; at: number }> })

export type DeliverableSection = {
	heading: string
	paragraphs: string[]
	bullets?: Array<{ label: string; detail: string }>
	exhibit?: Exhibit
}

export type DeliverableBody = {
	// The governing thought: the one sentence the rest of the document supports.
	heading: string
	lede: string
	// Quantified frame carried at the head of every document so the reader knows
	// the size of the thing before reading the argument for it.
	metrics: Array<{ value: string; label: string; note: string }>
	// The pyramid: three MECE arguments that hold the governing thought up.
	keyMessages: Array<{ label: string; detail: string }>
	sections: DeliverableSection[]
	findings: Array<{ label: string; detail: string }>
	nextSteps: Array<{ action: string; owner: string; due: string }>
	citations: string[]
}

// The manifest covers the three business-analysis services end to end: the
// business case and feasibility view (service 1), the charter and governance
// inputs (service 2), and requirements plus process analysis (service 3),
// alongside the technical, operating, governance, and delivery documents the
// decision itself needs.
export const DELIVERABLES = [
	{ name: "Executive decision brief", audience: "Executive sponsor", rationale: "Decision, trade-offs, and unresolved exposure" },
	{ name: "Business case and options appraisal", audience: "Investment authority", rationale: "Objectives, options, benefits, costs, and feasibility" },
	{ name: "Project charter and governance", audience: "Project manager and PMO", rationale: "Scope, objectives, stakeholders, RACI, and governance" },
	{ name: "As-Is / To-Be process analysis", audience: "Process owners", rationale: "Current-state maps, gap analysis, and target workflows" },
	{ name: "Requirements specification", audience: "Delivery team", rationale: "Requirements, use cases, acceptance criteria, and traceability" },
	{ name: "Technical assessment", audience: "Architecture and engineering", rationale: "Current-state analysis, target architecture, and quantified technical risk" },
	{ name: "Target operating model", audience: "Operating owners", rationale: "Decision rights, controls, roles, and handoffs" },
	{ name: "RAID register", audience: "Program governance", rationale: "Risks, assumptions, issues, decisions, and owners" },
	{ name: "Implementation roadmap", audience: "Transformation lead", rationale: "Sequenced work, dependencies, and checkpoints" },
] as const
