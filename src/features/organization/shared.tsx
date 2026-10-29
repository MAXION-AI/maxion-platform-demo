import { CaretDown, CaretRight, MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react"
import { useEffect, useState, type ReactNode, type SelectHTMLAttributes } from "react"

import { Button } from "@/design/primitives"
import { signedInMinutes, signInAgain, useOrganization } from "./store"
import "./organization.css"

/* The account pages' shared top bar: where the page sits, and the jump menu. */
export function AccountTopbar({ title, onCommand }: { title: string; onCommand?: () => void }) {
	return (
		<div className="ds-scope mxp-portal-top">
			<header className="ds-topbar">
				<div className="ds-topbar-start"><span className="mxp-portal-crumb">Account</span><CaretRight size={12} aria-hidden="true" className="mxp-portal-crumb-sep" /><span className="ds-topbar-title">{title}</span></div>
				<div className="ds-topbar-end">
					{onCommand ? <Button size="sm" className="wh-jump" onClick={onCommand}><MagnifyingGlass aria-hidden="true" />Jump to<kbd>⌘K</kbd></Button> : null}
				</div>
			</header>
		</div>
	)
}

/*
 * Privileged changes need a sign-in within the last 15 minutes (D-068). The note says how long
 * ago the viewer signed in, and once that is too long ago it offers the sign-in instead of
 * letting the change through. Narrowing access never needs it; callers decide when to ask.
 */
export function useFreshSignIn() {
	const { signedInAt } = useOrganization()
	const [now, setNow] = useState(() => Date.now())
	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 30_000)
		return () => window.clearInterval(timer)
	}, [])
	const minutes = signedInMinutes(Math.max(now, signedInAt))
	return { fresh: minutes < 15, minutes }
}

export function FreshSignInNote() {
	const { fresh, minutes } = useFreshSignIn()
	if (fresh) return <p className="org-fresh"><ShieldCheck aria-hidden="true" />Needs a sign-in in the last 15 minutes. You signed in {minutes === 0 ? "just now" : minutes === 1 ? "a minute ago" : `${minutes} minutes ago`}.</p>
	return (
		<div className="org-fresh is-stale" role="status">
			<p><ShieldCheck aria-hidden="true" />This change needs a sign-in in the last 15 minutes. You signed in {minutes} minutes ago.</p>
			<Button size="sm" onClick={signInAgain}>Sign in again</Button>
		</div>
	)
}

/* A native select drawn as the field primitive: the platform's own list, keyboard and screen reader. */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
	return <span className={`org-select${className ? ` ${className}` : ""}`}><select {...rest}>{children}</select><CaretDown aria-hidden="true" /></span>
}

/* A settings row as the live app's workspace settings set one: what it is, then its value and action at the right edge. */
export function SettingRow({ title, detail, children, id }: { title: ReactNode; detail?: ReactNode; children?: ReactNode; id?: string }) {
	return (
		<div className="org-row">
			<div className="org-row-main"><strong id={id}>{title}</strong>{detail ? <small>{detail}</small> : null}</div>
			{children ? <div className="org-row-aside">{children}</div> : null}
		</div>
	)
}

/* Before and after, as a confirmation shows them: the exact scope and what changes. */
export function ChangeSummary({ rows }: { rows: Array<{ label: string; before?: ReactNode; after: ReactNode }> }) {
	return (
		<dl className="org-change">
			{rows.map((row) => (
				<div key={row.label}>
					<dt>{row.label}</dt>
					<dd>{row.before !== undefined ? <><s>{row.before}</s><span aria-hidden="true">→</span><span className="sr-only">changes to</span></> : null}<strong>{row.after}</strong></dd>
				</div>
			))}
		</dl>
	)
}
