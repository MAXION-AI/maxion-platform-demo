import { CircleNotch, LockSimple } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"

import { Badge, Button, Dialog } from "@/design/primitives"
import type { ProviderKey } from "./model"
import { removeProviderKey, setProviderKey, useOrganization } from "./store"
import { ChangeSummary } from "./shared"

/*
 * Customer model-provider keys (D-089): an Anthropic key for Discovery and/or an OpenAI key for
 * Agentix, managed by the Owner only. Write-only: a saved key is never shown again, only its last
 * four characters, who added it and when, and its check. A no-cost check runs before saving. A
 * key that stops working pauses the affected work with the reason; nothing falls back to
 * MAXION's account. The composition is the live app's Secrets list: a lock tile, the name and its
 * state, the actions at the right edge.
 */

const PREFIX: Record<ProviderKey["provider"], string> = { anthropic: "sk-ant-", openai: "sk-" }

export function KeysTab() {
	const org = useOrganization()
	const [editing, setEditing] = useState<ProviderKey | null>(null)
	const [removing, setRemoving] = useState<ProviderKey | null>(null)
	const [message, setMessage] = useState("")
	return (
		<section className="org-section" aria-labelledby="keys-heading">
			<div className="org-section-head"><div><h2 id="keys-heading">Provider keys</h2><p>Run Discovery or Agentix on your own Anthropic or OpenAI account instead of MAXION's. Only the Owner can add, replace or remove a key, and every change is audited.</p></div></div>
			<div className="org-rows">
				{org.keys.map((key) => (
					<div key={key.provider} className="org-row">
						<div className="org-row-lead">
							<span className="org-person" aria-hidden="true"><LockSimple /></span>
							<div className="org-row-main">
								<strong>{key.name} · {key.module}{key.check?.state === "failed" ? <Badge tone="danger">Refused</Badge> : null}</strong>
								<small>{key.last4 ? `•••• ${key.last4} · added by ${key.addedBy} on ${key.addedAt} · check ${key.check?.state === "passed" ? `passed ${key.check.at.toLowerCase()}` : "failed"} · used by ${key.module}` : `Not set · ${key.module} uses MAXION's account`}</small>
							</div>
						</div>
						<div className="org-row-aside">
							{key.last4 ? <><Button size="xs" aria-label={`Replace ${key.name} key`} onClick={() => setEditing(key)}>Replace</Button><Button size="xs" aria-label={`Remove ${key.name} key`} onClick={() => setRemoving(key)}>Remove</Button></> : <Button size="xs" aria-label={`Add ${key.name} key`} onClick={() => setEditing(key)}>Add key</Button>}
						</div>
					</div>
				))}
			</div>
			<p className="org-note org-keys-note">With your key, the model provider processes that module's calls under your own contract and retention terms, and your spend limits apply. MAXION still chooses and qualifies the models.</p>
			<div className="mxp-live-message" aria-live="polite">{message}</div>
			{editing ? <KeyDialog key={editing.provider} target={editing} onClose={() => setEditing(null)} onSaved={(text) => setMessage(text)} /> : null}
			<Dialog
				open={removing !== null}
				title={removing ? `Remove the ${removing.name} key?` : ""}
				description="Before the key goes, MAXION finishes deleting the sessions and files it created with it."
				onClose={() => setRemoving(null)}
				footer={<><Button onClick={() => setRemoving(null)}>Keep key</Button><Button variant="primary" className="org-danger" onClick={() => { if (removing) { removeProviderKey(removing.provider); setMessage(`${removing.name} key removed. New ${removing.module} work uses MAXION's account.`) } setRemoving(null) }}>Remove key</Button></>}>
				{removing ? <ChangeSummary rows={[
					{ label: "Who pays", before: `${org.name}'s ${removing.name} account`, after: "MAXION, within your usage allowance" },
					{ label: "Where calls run", before: `Your ${removing.name} ${removing.provider === "openai" ? "project" : "organization"}`, after: "MAXION's account" },
				]} /> : null}
			</Dialog>
		</section>
	)
}

function KeyDialog({ target, onClose, onSaved }: { target: ProviderKey; onClose: () => void; onSaved: (text: string) => void }) {
	// The value lives only in this field until the check; the store keeps the last four characters.
	const [value, setValue] = useState("")
	const [checking, setChecking] = useState(false)
	const [refused, setRefused] = useState(false)
	// A check still running when the dialog closes is dropped: closing never saves a key.
	const timer = useRef<number | undefined>(undefined)
	useEffect(() => () => window.clearTimeout(timer.current), [])
	const check = () => {
		const key = value.trim()
		if (!key) return
		setChecking(true)
		setRefused(false)
		timer.current = window.setTimeout(() => {
			setChecking(false)
			if (!key.startsWith(PREFIX[target.provider]) || key.length < 24) { setRefused(true); return }
			setProviderKey(target.provider, key.slice(-4))
			setValue("")
			onSaved(`${target.name} key saved. ${target.module} uses it from its next call.`)
			onClose()
		}, 800)
	}
	return (
		<Dialog
			open
			title={target.last4 ? `Replace the ${target.name} key` : `Add an ${target.name} key`}
			description={`For ${target.module}. MAXION checks it can reach the qualified models, at no cost, before saving it. You won't see it again.`}
			onClose={onClose}
			footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!value.trim() || checking} onClick={check}>{checking ? <><CircleNotch className="spin" aria-hidden="true" />Checking</> : "Check and save"}</Button></>}>
			<form className="ds-field" onSubmit={(event) => { event.preventDefault(); check() }}>
				<label htmlFor="provider-key">{target.name} API key</label>
				<input id="provider-key" className="ds-input" type="password" autoComplete="off" spellCheck={false} value={value} aria-invalid={refused} aria-describedby="provider-key-hint" onChange={(event) => { setValue(event.target.value); setRefused(false) }} />
				<small id="provider-key-hint" className={refused ? "org-error" : undefined}>{refused ? `${target.name} refused this key. Check it's active and can use the models MAXION qualified, then try again.` : "Stored in a separate vault. Only the Discovery and Agentix workers can read it."}</small>
			</form>
			{target.last4 ? <p className="org-note">Replacing it: MAXION finishes deleting what it created with the old key first. Work running on the old key moves to the new one from a checkpoint.</p> : null}
		</Dialog>
	)
}
