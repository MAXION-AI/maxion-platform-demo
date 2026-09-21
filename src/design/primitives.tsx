import { MagnifyingGlass, X } from "@phosphor-icons/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { forwardRef, useEffect, useId, useRef } from "react"
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react"

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ")

/*
 * Marks: a closed set of abstract geometric logos drawn from one vocabulary of
 * circles, arcs and rounded rectangles, picked deterministically from a seed so
 * a record keeps the same logo for good. Each is duotone: `ds-mark-back` recedes.
 */
const MARKS: ReactNode[] = [
	<><circle className="ds-mark-back" cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><circle cx="12" cy="12" r="4" /></>,
	<><circle className="ds-mark-back" cx="12" cy="13" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><circle cx="12" cy="4" r="3.4" /></>,
	<><circle className="ds-mark-back" cx="8.5" cy="12" r="7.5" /><circle cx="15.5" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.2" /></>,
	<><path className="ds-mark-back" d="M3 21A18 18 0 0 1 21 3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M9.5 21A11.5 11.5 0 0 1 21 9.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></>,
	<><rect className="ds-mark-back" x="3" y="5" width="18" height="3.6" rx="1.8" /><rect x="3" y="10.2" width="12" height="3.6" rx="1.8" /><rect className="ds-mark-back" x="3" y="15.4" width="7" height="3.6" rx="1.8" /></>,
	<><path className="ds-mark-back" d="M3.5 15A8.5 8.5 0 0 1 20.5 15Z" /><rect x="3.5" y="17.4" width="17" height="3.4" rx="1.7" /></>,
	<><rect className="ds-mark-back" x="3" y="4" width="7" height="16" rx="3.5" /><circle cx="16.5" cy="12" r="4.8" /></>,
	<><rect className="ds-mark-back" x="3.6" y="3.6" width="16.8" height="16.8" rx="4.6" fill="none" stroke="currentColor" strokeWidth="2.2" /><rect x="8.8" y="8.8" width="6.4" height="6.4" rx="2.2" /></>,
]
const TINTS = 6
const avalanche = (h: number) => { h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; return (h ^ (h >>> 16)) >>> 0 }
const hash = (value: string, seed: number) => { let h = seed >>> 0; for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619) >>> 0; return avalanche(h) }

/* Seeds 4 and 2 give the four seeded engagements four different shapes and tints. */
/* The tint a seed's Mark wears, so a surface can sit in the same colour as its logo. */
export const markTint = (seed: string) => hash(seed, 2) % TINTS

export function Mark({ seed, size, className }: { seed: string; size?: "sm" | "xs"; className?: string }) {
	return <span className={cx("ds-mark", size && `ds-mark--${size}`, className)} data-tint={markTint(seed)} aria-hidden="true"><svg viewBox="0 0 24 24">{MARKS[hash(seed, 4) % MARKS.length]}</svg></span>
}

export function TileGrid({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
	return <section className={cx("ds-tile-grid", className)} {...rest}>{children}</section>
}

type TileProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & { mark?: ReactNode; aside?: ReactNode; title: ReactNode; meta?: ReactNode; footer?: ReactNode }
/* A tile is named by its title and meta, so a list of them reads by name; its status and figures describe it. */
export function Tile({ mark, aside, title, meta, footer, className, type = "button", ...rest }: TileProps) {
	const id = useId()
	const label = [`${id}-title`, meta ? `${id}-meta` : ""].filter(Boolean).join(" ")
	const description = [aside ? `${id}-aside` : "", footer ? `${id}-footer` : ""].filter(Boolean).join(" ") || undefined
	return <button type={type} className={cx("ds-tile", className)} aria-labelledby={label} aria-describedby={description} {...rest}>{mark || aside ? <span className="ds-tile-top" id={aside ? `${id}-aside` : undefined}>{mark}{aside}</span> : null}<span className="ds-tile-heading"><strong id={`${id}-title`}>{title}</strong>{meta ? <small id={`${id}-meta`}>{meta}</small> : null}</span>{footer ? <span className="ds-tile-footer" id={`${id}-footer`}>{footer}</span> : null}</button>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; size?: "sm"; icon?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", size, icon = false, className, type = "button", ...rest }, ref) {
	return <button ref={ref} type={type} className={cx("ds-button", variant !== "secondary" && `ds-button--${variant}`, size && `ds-button--${size}`, icon && "ds-button--icon", className)} {...rest} />
})

export const TextButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function TextButton({ className, type = "button", ...rest }, ref) {
	return <button ref={ref} type={type} className={cx("ds-text-button", className)} {...rest} />
})

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "positive" | "warning" | "danger" | "outline"; dot?: boolean }
export function Badge({ tone = "neutral", dot = false, className, children, ...rest }: BadgeProps) {
	return <span className={cx("ds-badge", tone !== "neutral" && `ds-badge--${tone}`, className)} {...rest}>{dot ? <span className="ds-badge-dot" aria-hidden="true" /> : null}{children}</span>
}

export function Count({ children, className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
	return <span className={cx("ds-count", className)} {...rest}>{children}</span>
}

type PageHeaderProps = { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string; titleTabIndex?: number }
export function PageHeader({ title, description, actions, className, titleTabIndex }: PageHeaderProps) {
	return <div className={cx("ds-page-header", className)}><div><h1 className="ds-page-title" tabIndex={titleTabIndex}>{title}</h1>{description ? <p className="ds-page-desc">{description}</p> : null}</div>{actions ? <div className="ds-page-actions">{actions}</div> : null}</div>
}

/* The field draws the one focus ring. `onClear` adds a quiet clear button while there is a query. */
type SearchInputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; onClear?: () => void; clearLabel?: string }
export function SearchInput({ label, onClear, clearLabel = "Clear search", className, ...rest }: SearchInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const filled = rest.value !== undefined && String(rest.value).length > 0
	return <label className={cx("ds-search", className)}><MagnifyingGlass aria-hidden="true" /><input ref={inputRef} type="search" aria-label={label} {...rest} />{onClear && filled ? <button type="button" className="ds-search-clear" aria-label={clearLabel} onClick={() => { onClear(); inputRef.current?.focus() }}><X aria-hidden="true" /></button> : null}</label>
}

type SegmentedTabsProps<T extends string> = { label: string; value: T; onChange: (value: T) => void; options: Array<{ value: T; label: ReactNode; count?: number }>; className?: string }
export function SegmentedTabs<T extends string>({ label, value, onChange, options, className }: SegmentedTabsProps<T>) {
	return <div className={cx("ds-tabs", className)} role="group" aria-label={label}>{options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}{option.count !== undefined ? <Count>{option.count}</Count> : null}</button>)}</div>
}

/* On phones every row takes one shape: the first column on top beside an unlabelled last
 * column (the row's action or chevron), then the middle columns on one meta line whose
 * last cell truncates. The column list and the last meta column are derived here. */
const phoneLayout = (columns: ReactNode[]) => {
	const last = columns[columns.length - 1]
	const action = columns.length > 1 && (last === "" || last === null || last === undefined)
	const meta = Math.max(columns.length - 1 - (action ? 1 : 0), 0)
	const tracks = [...Array.from({ length: Math.max(meta - 1, 0) }, () => "auto"), "minmax(0, 1fr)", ...(action ? ["auto"] : [])]
	return { "--ds-table-phone-cols": tracks.join(" "), "--ds-table-phone-last": Math.max(meta, 1) }
}
type TableProps = HTMLAttributes<HTMLElement> & { columns: ReactNode[]; template: string }
export function Table({ columns, template, className, style, children, ...rest }: TableProps) {
	return <section className={cx("ds-table", className)} style={{ "--ds-table-cols": template, ...phoneLayout(columns), ...style } as CSSProperties} {...rest}><div className="ds-table-head" aria-hidden="true">{columns.map((column, index) => <span key={index}>{column}</span>)}</div>{children}</section>
}
export function TableRow({ className, type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
	return <button type={type} className={cx("ds-table-row", className)} {...rest} />
}
export function PrimaryCell({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
	return <span className="ds-cell ds-cell-primary"><strong>{title}</strong>{meta ? <small>{meta}</small> : null}</span>
}
export function NumberCell({ label, children }: { label: string; children: ReactNode }) {
	return <span className="ds-cell ds-cell-num"><small>{label}</small>{children}</span>
}
/* Sits on the content edge, never indented; `action` offers the way back (for example "Clear search"). */
type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & { title: ReactNode; icon?: ReactNode; action?: ReactNode }
export function EmptyState({ title, icon, action, className, children, ...rest }: EmptyStateProps) {
	return <div className={cx("ds-empty", className)} {...rest}>{icon ? <span className="ds-empty-icon" aria-hidden="true">{icon}</span> : null}<strong>{title}</strong>{children}{action ? <span className="ds-empty-action">{action}</span> : null}</div>
}

type CardProps = HTMLAttributes<HTMLElement> & { title?: ReactNode; description?: ReactNode; count?: number; actions?: ReactNode }
export function Card({ title, description, count, actions, className, children, ...rest }: CardProps) {
	return <section className={cx("ds-card", className)} {...rest}>{title || actions ? <header className="ds-card-header"><div>{title ? <div className="ds-card-title"><h2 className="ds-card-heading">{title}</h2>{count !== undefined ? <Count>{count}</Count> : null}</div> : null}{description ? <p className="ds-card-desc">{description}</p> : null}</div>{actions ? <div className="ds-page-actions">{actions}</div> : null}</header> : null}{children ? <div className="ds-card-body">{children}</div> : null}</section>
}

/* `mark` takes the entity's logo (a <Mark />) ahead of the title. */
type ListRowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & { title: ReactNode; meta?: ReactNode; action?: ReactNode; mark?: ReactNode }
export function ListRow({ title, meta, action, mark, className, type = "button", ...rest }: ListRowProps) {
	return <button type={type} className={cx("ds-list-row", className)} {...rest}>{mark ? <span className="ds-list-row-mark">{mark}</span> : null}<span className="ds-list-row-main"><strong>{title}</strong>{meta ? <small>{meta}</small> : null}</span>{action ? <span className="ds-list-row-action">{action}</span> : null}</button>
}

type BannerProps = HTMLAttributes<HTMLParagraphElement> & { tone?: "neutral" | "warning"; icon?: ReactNode; onDismiss?: () => void; dismissLabel?: string }
export function Banner({ tone = "neutral", icon, onDismiss, dismissLabel = "Dismiss", className, children, ...rest }: BannerProps) {
	return <p className={cx("ds-banner", tone !== "neutral" && `ds-banner--${tone}`, className)} {...rest}>{icon}<span>{children}</span>{onDismiss ? <button type="button" className="ds-banner-dismiss" aria-label={dismissLabel} onClick={onDismiss}><X aria-hidden="true" /></button> : null}</p>
}

/*
 * Dialog: the ElevenLabs review dialog (mobbin ff16450b). A 20px-radius panel
 * over a blurred white scrim, a title with a close button, a body and a footer
 * whose secondary action sits left and primary action right. On open it focuses
 * the [data-autofocus] element, else the first field, else the panel; it keeps
 * Tab inside, closes on Escape and hands focus back to its trigger once it
 * closes. Only the scrim fades: the panel lands by moving and scaling, so its
 * text never passes through transparent. Under reduced motion nothing animates
 * and nothing waits on an exit.
 */
const DIALOG_FIELDS = "input:not(:disabled):not([type=hidden]), textarea:not(:disabled), select:not(:disabled)"
const DIALOG_FOCUSABLE = "a[href], button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex=\"-1\"])"
const DIALOG_EASE = [0.2, 0, 0, 1] as const
type DialogProps = { open: boolean; title: ReactNode; description?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: "sm" | "lg"; labelledBy?: string; className?: string }
export function Dialog({ open, title, description, onClose, children, footer, size = "sm", className }: DialogProps) {
	const panelRef = useRef<HTMLDivElement>(null)
	const returnRef = useRef<HTMLElement | null>(null)
	// Callers pass an inline onClose; reading it through a ref keeps a parent
	// re-render from re-running the focus effect below.
	const closeRef = useRef(onClose)
	useEffect(() => { closeRef.current = onClose })
	const reduced = useReducedMotion()
	const titleId = useId()
	const descriptionId = useId()
	useEffect(() => {
		const panel = panelRef.current
		if (!open || !panel) return
		const active = document.activeElement
		if (active instanceof HTMLElement && !panel.contains(active)) returnRef.current = active
		const first = panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel.querySelector<HTMLElement>(DIALOG_FIELDS)
		;(first ?? panel).focus({ preventScroll: true })
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); return }
			if (event.key !== "Tab") return
			// Skip controls that are not rendered (a closed disclosure); without layout (jsdom) keep all.
			const laidOut = panel.getClientRects().length > 0
			const focusable = Array.from(panel.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE)).filter(element => !laidOut || element.getClientRects().length > 0)
			if (!focusable.length) { event.preventDefault(); panel.focus({ preventScroll: true }); return }
			const head = focusable[0], tail = focusable[focusable.length - 1]
			const current = document.activeElement
			// Focus that sits outside the panel, on the panel itself or on an element Tab
			// cannot reach re-enters at the matching end instead of walking the page.
			if (!(current instanceof HTMLElement) || !focusable.includes(current)) { event.preventDefault(); (event.shiftKey ? tail : head).focus(); return }
			if (event.shiftKey && current === head) { event.preventDefault(); tail.focus() }
			else if (!event.shiftKey && current === tail) { event.preventDefault(); head.focus() }
		}
		document.addEventListener("keydown", onKey, true)
		return () => {
			document.removeEventListener("keydown", onKey, true)
			// Runs only when `open` turns false or the dialog unmounts.
			const trigger = returnRef.current
			returnRef.current = null
			if (trigger?.isConnected) trigger.focus({ preventScroll: true })
		}
	}, [open])
	return (
		<AnimatePresence>
			{open ? (
				<motion.div key="ds-dialog" className="ds-dialog-layer">
					<motion.button
						type="button"
						className="ds-dialog-scrim"
						aria-label="Close dialog"
						tabIndex={-1}
						onClick={() => closeRef.current()}
						initial={reduced ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={reduced ? undefined : { opacity: 0 }}
						transition={{ duration: reduced ? 0 : 0.18, ease: DIALOG_EASE }} />
					<motion.div
						ref={panelRef}
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						aria-describedby={description ? descriptionId : undefined}
						tabIndex={-1}
						className={cx("ds-dialog", `ds-dialog--${size}`, className)}
						initial={reduced ? false : { y: 12, scale: 0.98 }}
						animate={{ y: 0, scale: 1 }}
						exit={reduced ? undefined : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14, ease: DIALOG_EASE } }}
						transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}>
						<header className="ds-dialog-head">
							<div><h2 id={titleId}>{title}</h2>{description ? <p id={descriptionId}>{description}</p> : null}</div>
							<button type="button" className="ds-dialog-close" aria-label="Close" onClick={() => closeRef.current()}><X size={16} /></button>
						</header>
						<div className="ds-dialog-body">{children}</div>
						{footer ? <footer className="ds-dialog-foot">{footer}</footer> : null}
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	)
}
