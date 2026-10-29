import { ArrowRight } from "@phosphor-icons/react"
import { useState } from "react"

import { TextButton } from "@/design/primitives"
import { CONNECTION_STATE_LABEL, connectorFor, type Connection } from "./model"
import { requestSection, selectableConnections, useOrganization } from "./store"
import "./organization.css"

/*
 * D-056: before Discovery or Agentix work starts, the person picks which of their existing
 * connections it may use. Picking makes a connection available to the work; it never widens what
 * the account, its classes or its project grants allow, and every write still needs its approval.
 * A connection that can't be used says why, and a missing one leads to Integrations.
 */
// Usable for new work: active and granted to at least one project (INT-1 selection is per project).
const usable = (connection: Connection) => connection.state === "active" && connection.projects.length > 0

/* What a new piece of work starts with: every connection of the viewer's that can be used now. */
export const defaultPicked = () => selectableConnections().filter(usable).map((connection) => connection.id)
/* The picked connections that can still be used, by name, for a summary line. */
export const pickedNames = (ids: string[], connections: Connection[]) =>
	connections.filter((connection) => ids.includes(connection.id) && usable(connection)).map((connection) => connectorFor(connection.connector).name)

export function ConnectionPicker({ work, headingLevel = 2, picked: controlled, onPickedChange }: { work: "Discovery" | "engagement"; headingLevel?: 2 | 3; picked?: string[]; onPickedChange?: (ids: string[]) => void }) {
	const org = useOrganization()
	const connections = selectableConnections(org.connections)
	const [own, setOwn] = useState<string[]>(defaultPicked)
	const picked = controlled ?? own
	const setPicked = (next: (current: string[]) => string[]) => { const value = next(picked); setOwn(value); onPickedChange?.(value) }
	const Heading = headingLevel === 2 ? "h2" : "h3"
	const chosen = picked.filter((id) => connections.some((connection) => connection.id === id && usable(connection)))
	return (
		<section className="ds-scope org-picker" aria-labelledby={`picker-${work}`}>
			<div className="org-picker-head">
				<Heading id={`picker-${work}`}>Connections this {work} may use</Heading>
				<p>MAX reads through the accounts you pick, and only what each one already allows. Writes still need their approval. {chosen.length} of {connections.length} picked.</p>
			</div>
			<div className="org-choices">
				{connections.map((connection) => {
					const connector = connectorFor(connection.connector)
					const ok = usable(connection)
					return (
						<label key={connection.id} className={`org-choice${ok ? "" : " is-disabled"}`}>
							<input type="checkbox" disabled={!ok} checked={ok && picked.includes(connection.id)} onChange={() => setPicked((current) => current.includes(connection.id) ? current.filter((id) => id !== connection.id) : [...current, connection.id])} />
							<span>
								<strong>{connector.name}</strong>
								<small>{ok ? `${connection.accountLabel} · ${connection.classes.includes("write") && org.policy.integrations.classes === "read_write" ? "read and write" : "read only"}` : connection.state === "active" ? "Not given to any project yet · choose its projects in Integrations" : `${CONNECTION_STATE_LABEL[connection.state]} · can't be used until it's fixed in Integrations`}</small>
							</span>
						</label>
					)
				})}
			</div>
			<TextButton className="org-picker-link" onClick={() => requestSection({ section: "integrations" })}>Connect or fix an account in Integrations<ArrowRight aria-hidden="true" /></TextButton>
		</section>
	)
}
