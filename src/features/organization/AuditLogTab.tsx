import { ArrowClockwise, ListMagnifyingGlass } from "@phosphor-icons/react"
import { useState, type CSSProperties } from "react"

import { Button, EmptyState, SearchInput } from "@/design/primitives"
import { AUDIT_CATEGORY_LABEL, type AuditCategory, type AuditEvent } from "./model"
import { useOrganization } from "./store"
import { Select } from "./shared"

/*
 * The organization's audit log (D-092, IAM-4): who did what, as metadata only. Six columns at
 * most, filtered by date range, one person, one type and a literal search. Read-only: nothing
 * here edits, deletes or exports, and nothing shows content, prompts, invitation addresses,
 * domains or key characters. Filters stay in memory, never in the address or browser storage.
 */

const RANGES = [{ id: "1", label: "Last 24 hours", days: 1 }, { id: "7", label: "Last 7 days", days: 7 }, { id: "30", label: "Last 30 days", days: 30 }, { id: "90", label: "Last 90 days", days: 90 }] as const
const COLUMNS = ["Time", "Type", "Action", "Person", "Target", "Outcome"]
const TEMPLATE = "minmax(0, 8rem) minmax(0, 7rem) minmax(0, 1.2fr) minmax(0, 8rem) minmax(0, 1.3fr) minmax(0, 6rem)"

const clock = (date: Date) => date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
function when(at: number, now = Date.now()) {
	const date = new Date(at)
	const today = new Date(now)
	const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000)
	if (days === 0) return `Today ${clock(date)}`
	if (days === 1) return `Yesterday ${clock(date)}`
	return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export function AuditLogTab({ category, onCategory }: { category: AuditCategory | "all"; onCategory: (category: AuditCategory | "all") => void }) {
	const org = useOrganization()
	const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30")
	const [person, setPerson] = useState("all")
	const [query, setQuery] = useState("")
	const [refreshedAt, setRefreshedAt] = useState(() => Date.now())
	const [refreshing, setRefreshing] = useState(false)
	const days = RANGES.find((item) => item.id === range)?.days ?? 30
	const people = Array.from(new Set(org.audit.map((event) => event.actor))).sort()
	const q = query.trim().toLowerCase()
	const shown = org.audit.filter((event) =>
		event.at >= refreshedAt - days * 86_400_000 - 60_000 &&
		(category === "all" || event.category === category) &&
		(person === "all" || event.actor === person) &&
		(!q || `${event.action} ${event.target}`.toLowerCase().includes(q)))
	const refresh = () => { setRefreshing(true); window.setTimeout(() => { setRefreshedAt(Date.now()); setRefreshing(false) }, 500) }
	const filtered = category !== "all" || person !== "all" || q || range !== "30"
	return (
		<section className="org-section" aria-labelledby="audit-heading">
			<div className="org-section-head">
				<div><h2 id="audit-heading">Audit log</h2><p>Sign-ins, membership, approvals, connections, keys and settings in {org.name}. Metadata only, never content.</p></div>
				<span className="org-audit-refresh"><span className="org-source">Last refreshed {clock(new Date(refreshedAt))}</span><Button size="sm" disabled={refreshing} onClick={refresh}><ArrowClockwise aria-hidden="true" />{refreshing ? "Refreshing" : "Refresh"}</Button></span>
			</div>
			<div className="org-audit-filters">
				<SearchInput label="Search actions and targets" placeholder="Search actions and targets" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} />
				<Select aria-label="Date range" value={range} onChange={(event) => setRange(event.target.value as typeof range)}>{RANGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
				<Select aria-label="Type" value={category} onChange={(event) => onCategory(event.target.value as AuditCategory | "all")}><option value="all">All types</option>{(Object.keys(AUDIT_CATEGORY_LABEL) as AuditCategory[]).map((item) => <option key={item} value={item}>{AUDIT_CATEGORY_LABEL[item]}</option>)}</Select>
				<Select aria-label="Person" value={person} onChange={(event) => setPerson(event.target.value)}><option value="all">Everyone</option>{people.map((item) => <option key={item}>{item}</option>)}</Select>
			</div>
			{shown.length ? (
				<div className="ds-table org-audit" role="table" aria-label="Audit events" style={{ "--ds-table-cols": TEMPLATE } as CSSProperties}>
					<div className="ds-table-head" role="row">{COLUMNS.map((column) => <span key={column} role="columnheader">{column}</span>)}</div>
					{shown.map((event) => <AuditRow key={event.id} event={event} />)}
				</div>
			) : (
				<EmptyState icon={<ListMagnifyingGlass aria-hidden="true" />} title="No events match" action={filtered ? <Button onClick={() => { onCategory("all"); setPerson("all"); setQuery(""); setRange("30") }}>Clear filters</Button> : undefined}>
					<p>Nothing in this range matches these filters.</p>
				</EmptyState>
			)}
			<p className="org-note org-audit-foot">{shown.length} {shown.length === 1 ? "event" : "events"} · newest first · events can't be edited or deleted</p>
		</section>
	)
}

function AuditRow({ event }: { event: AuditEvent }) {
	return (
		<div className="ds-table-row org-audit-row" role="row">
			<span className="ds-cell" role="cell">{when(event.at)}</span>
			<span className="ds-cell org-audit-type" role="cell">{AUDIT_CATEGORY_LABEL[event.category]}</span>
			<span className="ds-cell ds-cell-primary" role="cell"><strong>{event.action}</strong></span>
			<span className="ds-cell" role="cell">{event.actor}</span>
			<span className="ds-cell org-audit-target" role="cell">{event.target}</span>
			<span className={`ds-cell${event.outcome !== "Succeeded" ? " is-attention" : ""}`} role="cell">{event.outcome}</span>
		</div>
	)
}
