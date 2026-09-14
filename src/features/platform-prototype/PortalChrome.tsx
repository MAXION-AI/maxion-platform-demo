import {
	ChartBar,
	CaretLeft,
	CaretRight,
	Command,
	Compass,
	Cube,
	FlowArrow,
	GearSix,
	List,
	Plug,
	Question,
	ShieldCheck,
	SignOut,
	Pulse,
	SquaresFour,
	Stack,
	X,
} from "@phosphor-icons/react"
import { useEffect, useId, useRef, useState } from "react"

import { publicAsset } from "@/lib/publicAsset"

import { WORKSPACE_UNITS_PERCENT, type MaxionModuleId } from "./model"

const PETAL = "M 2 -26 Q -3.5 -18 -0.5 -10 Q 3 -14 2 -26 Z"
const PETAL_COUNT = 18
const FOCUSABLE_SELECTOR = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"

type MaxionSpiralMarkProps = {
	variant?: "gradient" | "current"
	className?: string
	"aria-label"?: string
}

export function MaxionSpiralMark({
	variant = "gradient",
	className,
	"aria-label": ariaLabel,
}: MaxionSpiralMarkProps) {
	const gradientId = useId()
	const fill = variant === "gradient" ? `url(#${gradientId})` : "currentColor"
	return (
		<svg
			viewBox="0 0 64 64"
			className={className}
			role={ariaLabel ? "img" : undefined}
			aria-label={ariaLabel}
			aria-hidden={ariaLabel ? undefined : true}>
			{variant === "gradient" ? (
				<defs>
					<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="var(--mxp-accent-highlight)" />
						<stop offset="1" stopColor="var(--mxp-accent-hover)" />
					</linearGradient>
				</defs>
			) : null}
			<g transform="translate(32 32)" fill={fill}>
				{Array.from({ length: PETAL_COUNT }).map((_, index) => (
					<path key={index} d={PETAL} transform={`rotate(${index * 20}) rotate(20 -0.5 -10)`} />
				))}
			</g>
		</svg>
	)
}

type NavigationItem = {
	id: MaxionModuleId
	label: string
	icon?: typeof SquaresFour
	spiral?: boolean
	badge?: number
}

export const PRODUCT_NAVIGATION: NavigationItem[] = [
	{ id: "dashboard", label: "Dashboard", icon: SquaresFour },
	{ id: "projects", label: "Projects", icon: Stack },
	{ id: "discovery", label: "Discover", icon: Compass },
	{ id: "plan", label: "Plan", icon: FlowArrow },
	{ id: "execute", label: "Execute", icon: Cube, badge: 1 },
	{ id: "agentix", label: "Agentix", icon: Pulse, badge: 2 },
	{ id: "consult", label: "Consult Max", spiral: true },
]

export const ADMINISTRATION_NAVIGATION: NavigationItem[] = [
	{ id: "settings", label: "Settings", icon: GearSix },
	{ id: "integrations", label: "Integrations", icon: Plug },
	// No seeded number here: the approvals badge is only ever the count the approvals
	// surface itself can show, passed down as a live badge override.
	{ id: "approvals", label: "My approvals", icon: ShieldCheck },
	{ id: "usage", label: "Usage", icon: ChartBar },
	{ id: "help", label: "Help", icon: Question },
]

type PortalSidebarProps = {
	active: MaxionModuleId
	onNavigate: (module: MaxionModuleId) => void
	onCommand: () => void
	mobileOpen: boolean
	onMobileOpenChange: (open: boolean) => void
	collapsed: boolean
	onCollapsedChange: (collapsed: boolean) => void
	// Live module attention, lifted into the shell. A module that reports its own count
	// overrides the seeded badge; everything else keeps the static one.
	badges?: Partial<Record<MaxionModuleId, number>>
}

export function PortalSidebar({
	active,
	onNavigate,
	onCommand,
	mobileOpen,
	onMobileOpenChange,
	collapsed,
	onCollapsedChange,
	badges,
}: PortalSidebarProps) {
	const [notice, setNotice] = useState("")
	const mobileTriggerRef = useRef<HTMLButtonElement>(null)
	const mobileCloseRef = useRef<HTMLButtonElement>(null)
	const sidebarRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!mobileOpen) return
		const sidebar = sidebarRef.current
		const mobileTrigger = mobileTriggerRef.current
		const stage = document.querySelector<HTMLElement>(".mxp-stage")
		if (!sidebar) return
		stage?.setAttribute("inert", "")
		stage?.setAttribute("aria-hidden", "true")
		mobileCloseRef.current?.focus()

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault()
				onMobileOpenChange(false)
				return
			}
			if (event.key !== "Tab") return
			const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
			if (focusable.length === 0) {
				event.preventDefault()
				sidebar.focus()
				return
			}
			const first = focusable[0]
			const last = focusable[focusable.length - 1]
			const activeElement = document.activeElement
			if (event.shiftKey && (activeElement === first || activeElement === sidebar)) {
				event.preventDefault()
				last.focus()
			} else if (!event.shiftKey && activeElement === last) {
				event.preventDefault()
				first.focus()
			} else if (!(activeElement instanceof HTMLElement) || !sidebar.contains(activeElement)) {
				event.preventDefault()
				first.focus()
			}
		}

		document.addEventListener("keydown", onKeyDown)
		return () => {
			document.removeEventListener("keydown", onKeyDown)
			stage?.removeAttribute("inert")
			stage?.removeAttribute("aria-hidden")
			mobileTrigger?.focus()
		}
	}, [mobileOpen, onMobileOpenChange])

	const navigate = (module: MaxionModuleId) => {
		onNavigate(module)
		onMobileOpenChange(false)
	}
	const renderItem = (item: NavigationItem, tier: "product" | "administration") => {
		const Icon = item.icon
		const isActive = item.id === active
		const badge = badges?.[item.id] ?? item.badge
		const isAdministration = tier === "administration"
		return (
			<li key={item.id}>
				<button
					type="button"
					className={`mxp-portal-nav-item is-${tier}${isAdministration ? " is-compact" : ""}${isActive ? " is-active" : ""}`}
					data-navigation-tier={tier}
					data-navigation-id={item.id}
					aria-current={isActive ? "page" : undefined}
					title={collapsed ? item.label : undefined}
					onClick={() => navigate(item.id)}>
					{item.spiral ? (
						<MaxionSpiralMark variant={isActive ? "gradient" : "current"} className="mxp-portal-nav-icon" />
					) : Icon ? (
						<Icon className="mxp-portal-nav-icon" weight={isActive ? "fill" : "regular"} aria-hidden="true" />
					) : null}
					<span>{item.label}</span>
					{badge ? <b aria-label={`${badge} pending`}>{badge}</b> : null}
				</button>
			</li>
		)
	}

	return (
		<>
			<button
				ref={mobileTriggerRef}
				type="button"
				className="mxp-mobile-nav-trigger"
				aria-label="Open navigation"
				aria-controls="portal-sidebar"
				aria-expanded={mobileOpen}
				onClick={() => onMobileOpenChange(true)}>
				<List size={20} />
			</button>
			{mobileOpen ? (
				<button
					type="button"
					className="mxp-mobile-nav-scrim"
					aria-label="Close navigation"
					onClick={() => onMobileOpenChange(false)}
				/>
			) : null}
			<div
				ref={sidebarRef}
				id="portal-sidebar"
				className={`mxp-portal-sidebar${mobileOpen ? " is-mobile-open" : ""}${collapsed ? " is-collapsed" : ""}`}
				role={mobileOpen ? "dialog" : "complementary"}
				aria-modal={mobileOpen ? "true" : undefined}
				aria-label="Main navigation">
				<div className="mxp-portal-brand">
					<button type="button" onClick={() => navigate("dashboard")} aria-label="Open MAXION dashboard" title="Open MAXION dashboard">
						<img src={publicAsset("maxion-logo-lockup-white.svg")} alt="MAXION" width="176" height="51" />
						<MaxionSpiralMark variant="current" className="mxp-portal-brand-mark" />
					</button>
					<button
						type="button"
						className="mxp-sidebar-collapse"
						aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
						title={collapsed ? "Expand navigation" : "Collapse navigation"}
						aria-pressed={collapsed}
						onClick={() => onCollapsedChange(!collapsed)}>
						{collapsed ? <CaretRight size={15} /> : <CaretLeft size={15} />}
					</button>
					<button ref={mobileCloseRef} type="button" className="mxp-mobile-nav-close" aria-label="Close navigation" onClick={() => onMobileOpenChange(false)}>
						<X size={18} />
					</button>
				</div>

				<nav className="mxp-portal-sidebar-scroll" aria-label="Portal sections">
					<section className="mxp-product-nav" aria-label="Product navigation">
						<ul aria-label="Product destinations">{PRODUCT_NAVIGATION.map((item) => renderItem(item, "product"))}</ul>
					</section>
					<section className="mxp-account-nav mxp-administration-nav" aria-labelledby="mxp-administration-navigation-title">
						<div className="mxp-account-divider"><span id="mxp-administration-navigation-title">Account</span><i /></div>
						<button type="button" className="mxp-unit-balance" onClick={() => navigate("usage")}>
							<span><strong>Workspace units</strong><small>{WORKSPACE_UNITS_PERCENT}% used this cycle</small></span>
							<span className="mxp-unit-track"><i style={{ width: `${WORKSPACE_UNITS_PERCENT}%` }} /></span>
						</button>
						<ul aria-label="Administrative destinations">{ADMINISTRATION_NAVIGATION.map((item) => renderItem(item, "administration"))}</ul>
					</section>
				</nav>

				<footer className="mxp-portal-sidebar-footer">
					<div className="mxp-sidebar-user" title={collapsed ? "Root Admin · Enterprise workspace" : undefined}><span>RA</span><div><strong>Root Admin</strong><small>Enterprise workspace</small></div></div>
					<div className="mxp-sidebar-actions">
						<button type="button" aria-label="Logout" title={collapsed ? "Logout" : undefined} onClick={() => setNotice("Prototype session remains active.")}><SignOut size={14} /><span>Logout</span></button>
						<button type="button" aria-label="Open command menu" onClick={onCommand}><Command size={14} /><kbd>⌘K</kbd></button>
					</div>
					<span className="mxp-sidebar-notice" aria-live="polite">{notice}</span>
				</footer>
			</div>
		</>
	)
}
