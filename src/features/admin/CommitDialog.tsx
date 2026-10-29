import { ShieldCheck, WarningCircle } from "@phosphor-icons/react"
import { useEffect, useId, useState, type ReactNode } from "react"

import { Button, Dialog } from "@/design/primitives"
import { ChangeSummary, Select } from "@/features/organization/shared"
import { REASON_LABEL, type ReasonCode } from "./model"
import { mfaMinutes, useAdmin, verifyMfa } from "./store"

/* Staff MFA within the last 15 minutes (D-068); once it's older the command waits for a fresh check. */
export function useMfa() {
	const { mfaAt } = useAdmin()
	const [now, setNow] = useState(() => Date.now())
	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 30_000)
		return () => window.clearInterval(timer)
	}, [])
	const minutes = mfaMinutes(Math.max(now, mfaAt))
	return { fresh: minutes < 15, minutes }
}

function MfaNote() {
	const { fresh, minutes } = useMfa()
	if (fresh) return <p className="org-fresh"><ShieldCheck aria-hidden="true" />Needs MFA in the last 15 minutes. You verified {minutes === 0 ? "just now" : minutes === 1 ? "a minute ago" : `${minutes} minutes ago`}.</p>
	return (
		<div className="org-fresh is-stale" role="status">
			<p><ShieldCheck aria-hidden="true" />This command needs MFA in the last 15 minutes. You verified {minutes} minutes ago.</p>
			<Button size="sm" onClick={verifyMfa}>Verify with MFA</Button>
		</div>
	)
}

export type Fact = { label: string; value: ReactNode }

/*
 * Preview and commit in one dialog, as ADM-2 sets every staff command: the exact target, the old,
 * requested and effective values, where the inherited value comes from, the override and its
 * expiry, the work it reaches and when that was counted; then a reason code, a ticket and a
 * current MFA before Publish. An emergency stop is the same frame with the ticket optional.
 */
export function CommitDialog({ title, description, children, summary, facts, warning, ready, emergency = false, publishLabel = "Publish", onPublish, onClose }: {
	title: string
	description: string
	children?: ReactNode
	summary: Array<{ label: string; before?: ReactNode; after: ReactNode }>
	facts: Fact[]
	warning?: ReactNode
	ready: boolean
	emergency?: boolean
	publishLabel?: string
	onPublish: (reason: ReasonCode, ticket: string) => void
	onClose: () => void
}) {
	const id = useId()
	const [reason, setReason] = useState<ReasonCode | "">("")
	const [ticket, setTicket] = useState("")
	const { fresh } = useMfa()
	const ticketOk = emergency || ticket.trim().length > 0
	const blocker = !ready ? "Change a value to preview it" : !reason ? "Choose a reason" : !ticketOk ? "Add the ticket" : !fresh ? "Verify with MFA" : null
	return (
		<Dialog open size="lg" title={title} description={description} onClose={onClose}
			footer={<>
				<Button onClick={onClose}>Cancel</Button>
				<span className="adm-dialog-commit">
					{blocker ? <small className="adm-blocker">{blocker}</small> : null}
					<Button variant="primary" disabled={Boolean(blocker)} onClick={() => reason && onPublish(reason, ticket)}>{publishLabel}</Button>
				</span>
			</>}>
			{children}
			<section className="adm-preview" aria-label="Preview">
				<h3>Preview</h3>
				{/* A row whose value doesn't move reads as its value, not as a struck-through copy of itself. */}
				<ChangeSummary rows={summary.map((row) => typeof row.before === "string" && row.before === row.after ? { label: row.label, after: row.after } : row)} />
				{warning ? <p className="adm-warning"><WarningCircle aria-hidden="true" />{warning}</p> : null}
				<dl className="org-terms adm-facts">
					{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
				</dl>
			</section>
			<div className="adm-commit-fields">
				<div className="ds-field">
					<label htmlFor={`${id}-reason`}>Reason</label>
					<Select id={`${id}-reason`} className="is-field" value={reason} onChange={(event) => setReason(event.target.value as ReasonCode)}>
						<option value="" disabled>Choose a reason</option>
						{(Object.keys(REASON_LABEL) as ReasonCode[]).map((code) => <option key={code} value={code}>{REASON_LABEL[code]}</option>)}
					</Select>
				</div>
				<div className="ds-field">
					<label htmlFor={`${id}-ticket`}>Ticket{emergency ? " (optional)" : ""}</label>
					<input id={`${id}-ticket`} className="ds-input" maxLength={128} value={ticket} placeholder="For example SUP-8812" onChange={(event) => setTicket(event.target.value)} />
				</div>
			</div>
			<MfaNote />
		</Dialog>
	)
}
