import { Check, CheckCircle, Clock, MagnifyingGlass, Minus, Pause, WarningCircle, X, XCircle } from "@phosphor-icons/react"
import { motion, useReducedMotion } from "motion/react"
import { Badge, Button as DsButton, EmptyState, Mark, Tile, TileGrid } from "@/design/primitives"
import { riseIn } from "@/components/motion/MotionKit"
import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { awaitingCreation, isTerminal } from "./engine/engine"
import { SCENARIOS } from "./engine/scenarios"
import { accountable, achievements, health, needsYou, presenceLine, statusOf, teamOf, type ReadinessRow } from "./engine/selectors"
import type { AgentixState, Tone, WorkItem } from "./engine/types"

/*
 * Status pills are the ElevenLabs batch-call pills (mobbin 567dc229): a tinted
 * capsule with a small glyph and a word. Colour never carries the meaning on its
 * own; the word does.
 */
export type { Tone }
export function Status({ label, tone = "neutral", live = false, icon }: { label: string; tone?: Tone; live?: boolean; icon?: ReactNode }) {
	const glyph = icon ?? (live || tone === "live" ? <span className="aop-live-dot" />
		: tone === "positive" ? <Check size={12} weight="bold" />
		: tone === "attention" ? <WarningCircle size={12} weight="bold" />
		: tone === "danger" ? <X size={12} weight="bold" />
		: <Clock size={12} weight="bold" />)
	return <span className={`aop-status is-${tone}`}>{glyph}{label}</span>
}

export function WorkStatus({ state, item }: { state: AgentixState; item: WorkItem }) {
	const status = statusOf(state, item)
	const icon = item.status === "paused" ? <Pause size={12} weight="bold" /> : item.flags.declined ? <Minus size={12} weight="bold" /> : undefined
	return <Status label={status.label} tone={status.tone} icon={icon} />
}

export const workIcon = (state: AgentixState, item: WorkItem) => {
	const tone = statusOf(state, item).tone
	return item.status === "verified" ? <CheckCircle size={16} weight="fill" />
		: tone === "attention" ? <WarningCircle size={16} weight="fill" />
		: tone === "danger" ? <XCircle size={16} weight="fill" />
		: item.status === "paused" ? <Pause size={16} weight="fill" />
		: tone === "live" ? <span className="aop-live-dot" />
		: <Clock size={16} />
}

const BADGE_TONE = { positive: "positive", attention: "warning", danger: "danger", live: "neutral", neutral: "neutral" } as const

/*
 * The engagements landing: one tile per engagement with its accountable
 * specialist, what it's doing, whether it needs you and its latest verified
 * result, so the list answers the three questions before anything is opened.
 */
export function Fleet({ state, query, filter, onOpen, onReset }: { state: AgentixState; query: string; filter: string; onOpen: (id: string) => void; onReset: () => void }) {
	const term = query.trim().toLowerCase()
	const engagements = Object.values(state.engagements).filter(engagement => {
		// The customer demo's revenue engagement appears once its Discovery creates it.
		if (awaitingCreation(engagement)) return false
		const scenario = SCENARIOS[engagement.workflowId]
		const text = `${engagement.name} ${engagement.owner} ${scenario.category} ${scenario.systems.map(system => system.name).join(" ")}`.toLowerCase()
		return text.includes(term) && (filter !== "attention" || needsYou(state, engagement.id).length > 0 || health(state, engagement).tone === "danger")
	})
	if (!engagements.length) {
		return (
			<TileGrid className="aop-fleet" aria-label="Engagements">
				<EmptyState role="status" icon={term ? <MagnifyingGlass /> : <CheckCircle />} title={term ? "No engagements match this search." : "Nothing needs your attention."} action={<DsButton size="sm" onClick={onReset}>{term ? "Clear search" : "Show all engagements"}</DsButton>}>
					<p>{term ? `Nothing matches “${query.trim()}”${filter === "attention" ? " among engagements that need attention" : ""}.` : "Every engagement is up to date and its work continues on its own."}</p>
				</EmptyState>
			</TileGrid>
		)
	}
	return (
		<TileGrid className="aop-fleet" aria-label="Engagements">
			{engagements.map(engagement => {
				const lead = accountable(engagement)
				const team = teamOf(engagement).length
				const status = health(state, engagement)
				const waiting = needsYou(state, engagement.id).length
				const latestResult = achievements(state, engagement.id, 1)[0]
				const open = state.work.filter(item => item.engagementId === engagement.id && !isTerminal(item)).length
				return (
					<Tile
						key={engagement.id}
						className="aop-agent-card"
						onClick={() => onOpen(engagement.id)}
						mark={<Mark seed={engagement.id} />}
						aside={<Badge tone={BADGE_TONE[status.tone]}>{status.label}</Badge>}
						title={engagement.name}
						meta={team > 1 ? `${lead.name} + ${team - 1} specialist${team === 2 ? "" : "s"}` : `${lead.name} · one agent`}
						footer={engagement.status === "draft" ? <span className="ds-tile-stats">Set up to activate</span> : (
							<span className="aop-tile-foot">
								<span className="aop-tile-activity">{presenceLine(state, engagement)}</span>
								<span className="aop-tile-line">
									<span className="ds-tile-stats"><span><b>{open}</b> open</span><span><b>{waiting}</b> {waiting === 1 ? "needs" : "need"} you</span></span>
									{latestResult ? <span className="aop-tile-result"><CheckCircle size={12} weight="fill" aria-hidden="true" /><span>{latestResult.title}</span></span> : null}
								</span>
							</span>
						)} />
				)
			})}
		</TileGrid>
	)
}

/*
 * A block whose height eases to fit what it holds, so content below moves in
 * the normal flow instead of jumping. Under reduced motion it simply fits.
 */
export function EasedHeight({ className, contentKey, children }: { className?: string; contentKey: string; children: ReactNode }) {
	const reduced = useReducedMotion()
	const inner = useRef<HTMLDivElement>(null)
	const [height, setHeight] = useState<number | "auto">("auto")
	useLayoutEffect(() => {
		const node = inner.current
		if (!node || reduced || typeof ResizeObserver === "undefined") { setHeight("auto"); return }
		const observer = new ResizeObserver(() => setHeight(node.offsetHeight))
		observer.observe(node)
		return () => observer.disconnect()
	}, [reduced, contentKey])
	const enter = reduced ? {} : { initial: riseIn.initial, animate: riseIn.animate, transition: riseIn.transition }
	return (
		<motion.div className={className} initial={false} animate={{ height }} transition={riseIn.transition} style={reduced ? undefined : { overflow: "hidden" }}>
			<motion.div key={contentKey} ref={inner} {...enter}>{children}</motion.div>
		</motion.div>
	)
}

/* Readiness, split by what it permits: reading, building and testing, changing production. */
const ROW_STATUS: Record<ReadinessRow["state"], { label: string; tone: Tone }> = { ready: { label: "Ready", tone: "positive" }, attention: { label: "Needs an answer", tone: "attention" }, blocked: { label: "Blocked", tone: "danger" }, none: { label: "Not needed", tone: "neutral" } }
export function ReadinessRows({ rows }: { rows: ReadinessRow[] }) {
	return (
		<ul className="aop-list aop-readiness-rows" aria-label="Readiness by capability">
			{rows.map(row => (
				<li key={row.id} className="aop-list-row">
					<span className="aop-list-text"><strong>{row.label}</strong><small>{row.detail}</small></span>
					<Status {...ROW_STATUS[row.state]} icon={row.state === "none" ? <Minus size={12} weight="bold" /> : undefined} />
				</li>
			))}
		</ul>
	)
}

export const systemsOf = (workflowId: keyof typeof SCENARIOS) => SCENARIOS[workflowId].systems
