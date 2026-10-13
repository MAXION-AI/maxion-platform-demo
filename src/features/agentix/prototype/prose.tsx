import { Fragment, type ReactNode } from "react"

/*
 * Text the agents write, set for reading. A work or release reference ("MS-2", "INV-20842", "REL-1")
 * is one word: it never breaks at its hyphen across two lines.
 */
const REFERENCE = /([A-Z]{2,6}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)/g

export function Prose({ text }: { text: string }): ReactNode {
	const parts = text.split(REFERENCE)
	if (parts.length === 1) return text
	return parts.map((part, index) => index % 2 === 1 ? <span key={index} className="aop-keep">{part}</span> : <Fragment key={index}>{part}</Fragment>)
}

/* An event's sentence without the work reference it opens with ("MS-3: built dashboard v1" reads "Built
 * dashboard v1" where the reference is already shown), capitalised. */
export function withoutReference(text: string, reference?: string) {
	const rest = reference && text.startsWith(`${reference}: `) ? text.slice(reference.length + 2) : reference === undefined ? text.replace(/^[A-Z]{2,6}-[A-Za-z0-9-]+: /, "") : text
	return rest.replace(/^./, char => char.toUpperCase())
}

