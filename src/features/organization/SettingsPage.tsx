import { ArrowRight } from "@phosphor-icons/react"
import { useEffect, useRef, useState, type KeyboardEvent } from "react"

import { Button, PageHeader } from "@/design/primitives"
import type { MaxionModuleId } from "@/features/platform-prototype/model"
import "@/features/platform-prototype/account-pages.css"
import { ORGANIZATION, ROLE_DETAIL, SEATS, VIEWER_ID, type AuditCategory } from "./model"
import { consumeIntent, renameOrganization, seatsUsed, useOrganization, type SectionIntent } from "./store"
import { AccountTopbar, SettingRow } from "./shared"
import { MembersTab } from "./MembersTab"
import { PolicyTab } from "./PolicyTab"
import { KeysTab } from "./KeysTab"
import { AuditLogTab } from "./AuditLogTab"

/*
 * Settings is the customer organization's own administration, as IAM-4, IAM-3 and ADM-4 plan it:
 * one container whose children are General, Members (with invitations), Policy (the customer
 * layer over what MAXION grants), Provider keys and the Audit log. The composition is the live
 * ElevenLabs Workspace settings page: a title, an underline tab strip, then label-and-description
 * rows with the value and its action at the right edge. Customer roles never confer MAXION staff
 * access; MAXION's own controls live in the separate admin panel.
 */

type SettingsTab = NonNullable<SectionIntent["tab"]>
const TABS: Array<{ id: SettingsTab; label: string }> = [
	{ id: "general", label: "General" },
	{ id: "members", label: "Members" },
	{ id: "policy", label: "Policy" },
	{ id: "keys", label: "Provider keys" },
	{ id: "audit", label: "Audit log" },
]

export function SettingsPage({ onCommand, onNavigate }: { onCommand?: () => void; onNavigate: (module: MaxionModuleId) => void }) {
	const org = useOrganization()
	const [tab, setTab] = useState<SettingsTab>("general")
	const [auditCategory, setAuditCategory] = useState<AuditCategory | "all">("all")
	const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
	const viewer = org.members.find((member) => member.id === VIEWER_ID)

	// Integrations' "Audit log" and Knowledge's control links arrive here with the tab they asked for.
	useEffect(() => {
		const intent = org.intent
		if (!intent || intent.section !== "settings") return
		consumeIntent(intent.tick)
		if (intent.tab) setTab(intent.tab)
		if (intent.auditCategory) setAuditCategory(intent.auditCategory)
	}, [org.intent])

	// The strip is one tab stop; arrows move along it, as a tab list does.
	const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
		const index = TABS.findIndex((item) => item.id === tab)
		const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : event.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : -1
		if (next < 0) return
		event.preventDefault()
		setTab(TABS[next].id)
		tabRefs.current[TABS[next].id]?.focus()
	}

	return (
		<div className="ds-scope acc-frame">
			<AccountTopbar title="Settings" onCommand={onCommand} />
			<div className="acc-page">
				<PageHeader title="Settings" description={`${org.name} · you're ${viewer?.role === "Member" ? "a Member" : `an ${viewer?.role ?? "Owner"}`}. Changes here apply to everyone in the organization.`} />
				<div className="ds-tabstrip org-tabs" role="tablist" aria-label="Settings sections">
					{TABS.map((item) => (
						<button
							key={item.id}
							ref={(node) => { tabRefs.current[item.id] = node }}
							type="button"
							role="tab"
							id={`settings-tab-${item.id}`}
							aria-selected={tab === item.id}
							aria-controls={`settings-panel-${item.id}`}
							tabIndex={tab === item.id ? 0 : -1}
							onKeyDown={onTabKey}
							onClick={() => setTab(item.id)}>
							{item.label}
						</button>
					))}
				</div>
				<div role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`}>
					{tab === "general" ? <GeneralTab onNavigate={onNavigate} onMembers={() => setTab("members")} />
						: tab === "members" ? <MembersTab />
							: tab === "policy" ? <PolicyTab />
								: tab === "keys" ? <KeysTab />
									: <AuditLogTab category={auditCategory} onCategory={setAuditCategory} />}
				</div>
			</div>
		</div>
	)
}

function GeneralTab({ onNavigate, onMembers }: { onNavigate: (module: MaxionModuleId) => void; onMembers: () => void }) {
	const org = useOrganization()
	const [editing, setEditing] = useState(false)
	const [name, setName] = useState(org.name)
	const [message, setMessage] = useState("")
	const viewer = org.members.find((member) => member.id === VIEWER_ID)
	const used = seatsUsed(org.members)
	const cap = SEATS.package + SEATS.amendment
	const clean = name.trim().replace(/\s+/g, " ")
	const nameError = !clean ? "Enter a name." : clean.length > 120 ? "Use 120 characters or fewer." : null
	const connections = org.connections.filter((connection) => connection.state !== "disconnected").length
	const save = () => {
		if (nameError) return
		renameOrganization(clean)
		setEditing(false)
		setMessage(`Renamed to ${clean}. Everyone sees the new name on their next page load.`)
	}
	return (
		<section className="org-section" aria-label="General">
			<div className="org-rows">
				{editing ? (
					<form className="org-row org-row-edit" onSubmit={(event) => { event.preventDefault(); save() }}>
						<div className="ds-field org-row-field">
							<label htmlFor="org-name">Organization name</label>
							<input id="org-name" className="ds-input" value={name} maxLength={160} autoFocus aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "org-name-error" : undefined} onChange={(event) => setName(event.target.value)} />
							{nameError ? <small id="org-name-error" className="org-error">{nameError}</small> : null}
						</div>
						<div className="org-row-aside"><Button size="sm" onClick={() => { setName(org.name); setEditing(false) }}>Cancel</Button><Button size="sm" variant="primary" type="submit" disabled={Boolean(nameError) || clean === org.name}>Save</Button></div>
					</form>
				) : (
					<SettingRow title="Organization name" detail={org.name}><Button size="sm" onClick={() => { setName(org.name); setEditing(true) }}>Rename</Button></SettingRow>
				)}
				<SettingRow title="Your role" detail={`${viewer?.role ?? "Owner"}. ${ROLE_DETAIL[viewer?.role ?? "Owner"]}`} />
				<SettingRow title="Seats" detail={`${used} of ${cap} used · ${SEATS.package} in your package and ${SEATS.amendment} agreed with MAXION · pending invitations don't take a seat · as of ${SEATS.asOf}`}>
					<Button size="sm" onClick={onMembers}>Members</Button>
				</SettingRow>
				<SettingRow title="Agreement" detail={`${ORGANIZATION.package} · Discovery, Agentix and voice interviews`}>
					<Button size="sm" onClick={() => onNavigate("usage")}>Usage</Button>
				</SettingRow>
				<SettingRow title="Connections" detail={`${connections} connected accounts in ${org.name}. Each person manages their own.`}>
					<Button size="sm" onClick={() => onNavigate("integrations")}>Integrations<ArrowRight aria-hidden="true" /></Button>
				</SettingRow>
				<SettingRow title="Organization knowledge" detail="What agents should know about the organization: profile, rules, procedures and brand.">
					<Button size="sm" onClick={() => onNavigate("knowledge")}>Knowledge<ArrowRight aria-hidden="true" /></Button>
				</SettingRow>
				<SettingRow title="Close the organization" detail="Offboarding goes through MAXION support, who confirm what is kept and deleted. Nothing changes from here.">
					<Button size="sm" onClick={() => onNavigate("help")}>Contact support</Button>
				</SettingRow>
			</div>
			<div className="mxp-live-message" aria-live="polite">{message}</div>
		</section>
	)
}
