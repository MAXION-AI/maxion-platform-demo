import { CaretUpDown, Check } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"

import { Mark } from "@/design/primitives"
import { HOME_ORGANIZATION_ID, OTHER_ORGANIZATIONS, organizationMembership, selectProject, useScope } from "./scope"
import type { PortalProject } from "./model"

// The one place that says which customer and which project the screen belongs to. A consultant
// must never confuse two customers (doc 13), so both names stay on screen in the navigation.
export function ScopeSwitcher({ homeName, projects, collapsed, onSwitchOrganization }: { homeName: string; projects: PortalProject[]; collapsed: boolean; onSwitchOrganization: (organizationId: string) => void }) {
	const scope = useScope()
	const [open, setOpen] = useState(false)
	const [anchor, setAnchor] = useState({ top: 0, left: 0 })
	const rootRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const current = organizationMembership(scope.organizationId)
	const organizationName = current?.name ?? homeName
	const activeProjects = projects.filter((project) => project.status === "active")
	const project = activeProjects.find((item) => item.id === scope.projectId)
	const close = (returnFocus = true) => {
		setOpen(false)
		if (returnFocus) triggerRef.current?.focus({ preventScroll: true })
	}
	useEffect(() => {
		if (!open) return
		rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true })
		const onPointer = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
		const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close() } }
		document.addEventListener("pointerdown", onPointer)
		document.addEventListener("keydown", onKey)
		return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey) }
	}, [open])
	const row = (key: string, title: string, meta: string | null, checked: boolean, pick: () => void) => (
		<button key={key} type="button" role="menuitemradio" aria-checked={checked} className="mxp-scope-option" onClick={pick}>
			<span><strong>{title}</strong>{meta ? <small>{meta}</small> : null}</span>
			{checked ? <Check size={14} aria-hidden="true" /> : null}
		</button>
	)
	return (
		<div className="mxp-scope" ref={rootRef}>
			<button ref={triggerRef} type="button" className="mxp-scope-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={`Working in ${organizationName}, ${project ? project.name : "all projects"}. Change organization or project`} title={collapsed ? `${organizationName} · ${project ? project.name : "All projects"}` : undefined} onClick={() => {
				const rect = triggerRef.current?.getBoundingClientRect()
				if (rect) setAnchor({ top: rect.bottom + 4, left: rect.left })
				setOpen((value) => !value)
			}}>
				<Mark seed={scope.organizationId} size="xs" />
				<span className="mxp-scope-names"><strong>{organizationName}</strong><small>{project ? project.name : "All projects"}</small></span>
				<CaretUpDown size={14} aria-hidden="true" />
			</button>
			{open ? (
				<div className="mxp-scope-menu" role="menu" aria-label="Organization and project" style={anchor}>
					<div role="group" aria-label="Organization">
						<p className="mxp-scope-group">Organization</p>
						{row(HOME_ORGANIZATION_ID, homeName, "Owner", scope.organizationId === HOME_ORGANIZATION_ID, () => { close(); onSwitchOrganization(HOME_ORGANIZATION_ID) })}
						{OTHER_ORGANIZATIONS.map((organization) => row(organization.id, organization.name, organization.role, scope.organizationId === organization.id, () => { close(); onSwitchOrganization(organization.id) }))}
					</div>
					<div role="group" aria-label="Project">
						<p className="mxp-scope-group">Project</p>
						{row("all-projects", "All projects", null, scope.projectId === null, () => { selectProject(null); close() })}
						{activeProjects.map((item) => row(item.id, item.name, item.role, scope.projectId === item.id, () => { selectProject(item.id); close() }))}
					</div>
				</div>
			) : null}
		</div>
	)
}
