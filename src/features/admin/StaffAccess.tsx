import { useState } from "react"

import { Badge, Button, EmptyState, PageHeader, PrimaryCell, Table } from "@/design/primitives"
import { CommitDialog } from "./CommitDialog"
import { can, deniedReason, isLastPlatformOwner, ROLE_DETAIL, STAFF_ROLES, type Receipt, type StaffMember, type StaffRole } from "./model"
import { publish, useActor, useAdmin } from "./store"
import { ReceiptLine, ReceiptTable } from "./TenantDetail"

/* Fixed roles only, granted by a Platform Owner (doc 21, ADM-2). There is no role builder and no way to remove the last Platform Owner. */
function RolesChange({ member, onClose, onPublished }: { member: StaffMember; onClose: () => void; onPublished: (receipt: Receipt) => void }) {
	const { staff, staffRevision } = useAdmin()
	const [roles, setRoles] = useState<StaffRole[]>(member.roles)
	const ordered = STAFF_ROLES.filter((role) => roles.includes(role))
	const list = (items: StaffRole[]) => items.join(", ") || "No staff role"
	const changed = ordered.join() !== STAFF_ROLES.filter((role) => member.roles.includes(role)).join()
	const lost = member.roles.filter((role) => !roles.includes(role))
	const lastOwner = isLastPlatformOwner(staff, member.id)
	return (
		<CommitDialog title={`Staff roles for ${member.name}`} description="Takes effect at once. A role that's removed stops working on the next request, and that person's staff sessions end." ready={changed}
			summary={[{ label: "Roles", before: list(member.roles), after: list(ordered) }]}
			warning={lost.length ? `${member.name} loses ${lost.join(" and ")} now.` : undefined}
			facts={[{ label: "Scope", value: member.scope }, { label: "Customer roles", value: "Never confer staff access, and staff roles grant no customer content" }, { label: "Revision", value: `${staffRevision} → ${staffRevision + 1}` }]}
			onPublish={(reason, ticket) => {
				onPublished(publish({ action: "staff.manage", scope: "Staff access", control: `Staff roles · ${member.name}`, change: `${list(member.roles)} → ${list(ordered)}`, reason, ticket, applyStaff: (current) => current.map((item) => item.id === member.id ? { ...item, roles: ordered, granted: "Just now" } : item) }))
				onClose()
			}}
			onClose={onClose}>
			<fieldset className="org-choices adm-editor">
				<legend className="ds-label">Roles</legend>
				{STAFF_ROLES.map((role) => {
					const locked = role === "Platform Owner" && lastOwner
					return (
						<label key={role} className={`org-choice${locked ? " is-disabled" : ""}`}>
							<input type="checkbox" disabled={locked} checked={roles.includes(role)} onChange={(event) => setRoles((current) => event.target.checked ? [...current, role] : current.filter((item) => item !== role))} />
							<span><strong>{role}</strong><small>{locked ? "The last Platform Owner can't lose this role. Grant it to someone else first." : ROLE_DETAIL[role]}</small></span>
						</label>
					)
				})}
			</fieldset>
		</CommitDialog>
	)
}

export function StaffAccessView({ staff, receipts, onBack }: { staff: StaffMember[]; receipts: Receipt[]; onBack: () => void }) {
	const actor = useActor()
	const [managing, setManaging] = useState<string | null>(null)
	const [receiptId, setReceiptId] = useState<string | null>(null)
	const member = staff.find((item) => item.id === managing)
	if (!can(actor, "staff.manage")) {
		return <EmptyState title="Staff access is for Platform Owners" action={<Button onClick={onBack}>All tenants</Button>}><p>{deniedReason("staff.manage")}. Ask one if someone's role needs to change.</p></EmptyState>
	}
	return (
		<>
			<PageHeader title="Staff access" description="Who holds which fixed staff role. Customer Owner and Admin roles never confer any of these." />
			<ReceiptLine receiptId={receiptId} />
			<Table aria-label="Staff" columns={["Person", "Roles", "Scope", "Granted", ""]} template="minmax(0, 1.2fr) minmax(0, 1.6fr) minmax(0, .8fr) minmax(0, 1.2fr) auto">
				{staff.map((item) => (
					<article key={item.id} className="ds-table-row adm-static-row" aria-label={item.name}>
						<PrimaryCell title={item.name} meta={item.id === actor?.id ? "Your view" : undefined} />
						<span className="ds-cell adm-badges">{item.roles.length ? item.roles.map((role) => <Badge key={role}>{role}</Badge>) : "No staff role"}</span>
						<span className="ds-cell">{item.scope}</span>
						<span className="ds-cell">{item.granted}</span>
						<span className="ds-cell ds-cell-end"><Button size="xs" aria-label={`Manage ${item.name}`} onClick={() => setManaging(item.id)}>Manage</Button></span>
					</article>
				))}
			</Table>
			<section className="org-section" aria-label="What each role does">
				<div className="org-section-head"><div><h2>What each role does</h2></div></div>
				<div className="org-rows">
					{STAFF_ROLES.map((role) => <div key={role} className="org-row"><div className="org-row-main"><strong>{role}</strong><small>{ROLE_DETAIL[role]}</small></div></div>)}
				</div>
			</section>
			<section className="org-section" aria-label="Staff access history">
				<div className="org-section-head"><div><h2>History</h2><p>Every grant and revocation, append-only.</p></div></div>
				<ReceiptTable label="Staff access history" receipts={receipts.filter((receipt) => receipt.scope === "Staff access")} />
			</section>
			{member ? <RolesChange member={member} onClose={() => setManaging(null)} onPublished={(receipt) => setReceiptId(receipt.id)} /> : null}
		</>
	)
}
