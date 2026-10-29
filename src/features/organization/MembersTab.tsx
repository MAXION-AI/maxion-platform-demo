import { UserPlus } from "@phosphor-icons/react"
import { useState } from "react"

import { Badge, Button, Dialog } from "@/design/primitives"
import { ORG_ROLES, ROLE_DETAIL, SEATS, VIEWER_ID, type Invitation, type Member, type OrgRole } from "./model"
import { changeRole, inviteMember, isLastOwner, removeMember, resendInvitation, revokeInvitation, seatsUsed, setMemberStatus, useOrganization } from "./store"
import { ChangeSummary, FreshSignInNote, useFreshSignIn } from "./shared"

/*
 * Members and invitations together, as IAM-3 plans its one membership child. Fixed Owner, Admin
 * and Member roles; an Owner manages owners, an Admin everyone else. Every role, status and
 * invitation change shows its exact scope, needs a sign-in in the last 15 minutes and is audited.
 * The last active Owner can't be demoted, suspended or removed.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type MemberAction = { member: Member; kind: "role"; role: OrgRole } | { member: Member; kind: "suspend" | "restore" | "remove" }
type InvitationAction = { invitation: Invitation; kind: "resend" | "revoke" }

export function MembersTab() {
	const org = useOrganization()
	const [managing, setManaging] = useState<Member | null>(null)
	const [memberAction, setMemberAction] = useState<MemberAction | null>(null)
	const [invitationAction, setInvitationAction] = useState<InvitationAction | null>(null)
	const [inviting, setInviting] = useState(false)
	const [message, setMessage] = useState("")
	const { fresh } = useFreshSignIn()
	const cap = SEATS.package + SEATS.amendment
	const suspended = org.members.filter((member) => member.status === "suspended").length
	const open = org.invitations.filter((invitation) => invitation.status === "pending" || invitation.status === "expired")

	const runMemberAction = (action: MemberAction) => {
		if (action.kind === "role") { changeRole(action.member.id, action.role); setMessage(`${action.member.name} is now ${action.role === "Admin" || action.role === "Owner" ? `an ${action.role}` : "a Member"}.`) }
		if (action.kind === "suspend") { setMemberStatus(action.member.id, "suspended"); setMessage(`${action.member.name} is suspended. Their sessions ended and their seat is free.`) }
		if (action.kind === "restore") { setMemberStatus(action.member.id, "active"); setMessage(`${action.member.name} can sign in again.`) }
		if (action.kind === "remove") { removeMember(action.member.id); setMessage(`${action.member.name} was removed and their seat freed. Their work stays with its projects.`) }
		setMemberAction(null)
		setManaging(null)
	}
	const runInvitationAction = (action: InvitationAction) => {
		if (action.kind === "resend") { resendInvitation(action.invitation.id); setMessage(`A new link went to ${action.invitation.email}. The earlier link no longer works.`) }
		else { revokeInvitation(action.invitation.id); setMessage(`The invitation to ${action.invitation.email} was revoked.`) }
		setInvitationAction(null)
	}

	return (
		<>
			<section className="org-section" aria-labelledby="members-heading">
				<div className="org-section-head">
					<div><h2 id="members-heading">Members</h2><p>{org.members.length} people{suspended ? ` · ${suspended} suspended` : ""} · {seatsUsed(org.members)} of {cap} seats</p></div>
					<Button variant="primary" onClick={() => setInviting(true)}><UserPlus aria-hidden="true" />Invite member</Button>
				</div>
				<div className="org-rows">
					{org.members.map((member) => (
						<div key={member.id} className="org-row">
							<div className="org-row-lead">
								<span className="org-person" aria-hidden="true">{member.initials}</span>
								<div className="org-row-main"><strong>{member.name}{member.id === VIEWER_ID ? <span className="org-source">You</span> : null}{member.status === "suspended" ? <Badge tone="warning">Suspended</Badge> : null}</strong><small>{member.email} · active {member.lastActive.toLowerCase()}</small></div>
							</div>
							<div className="org-row-aside"><span className="org-value">{member.role}</span><Button size="xs" aria-label={`Manage ${member.name}`} onClick={() => setManaging(member)}>Manage</Button></div>
						</div>
					))}
				</div>
			</section>

			{open.length ? (
				<section className="org-section" aria-labelledby="invitations-heading">
					<div className="org-section-head"><div><h2 id="invitations-heading">Invitations</h2><p>Links expire after seven days. A resend issues a new link and the old one stops working.</p></div></div>
					<div className="org-rows">
						{open.map((invitation) => (
							<div key={invitation.id} className="org-row">
								<div className="org-row-main"><strong>{invitation.email}{invitation.status === "expired" ? <Badge>Expired</Badge> : null}</strong><small>{invitation.role} · invited by {invitation.invitedBy} · {invitation.status === "expired" ? "the link no longer works" : `expires in ${invitation.expiresInDays} days`}</small></div>
								<div className="org-row-aside">
									<Button size="xs" aria-label={`Resend invitation to ${invitation.email}`} onClick={() => setInvitationAction({ invitation, kind: "resend" })}>Resend</Button>
									{invitation.status === "pending" ? <Button size="xs" aria-label={`Revoke invitation to ${invitation.email}`} onClick={() => setInvitationAction({ invitation, kind: "revoke" })}>Revoke</Button> : null}
								</div>
							</div>
						))}
					</div>
				</section>
			) : null}
			<div className="mxp-live-message" aria-live="polite">{message}</div>

			<ManageDialog key={managing?.id ?? "none"} member={managing} onClose={() => setManaging(null)} onAction={(action) => { setManaging(null); setMemberAction(action) }} />
			<Dialog
				open={memberAction !== null}
				title={memberAction ? memberActionTitle(memberAction) : ""}
				description={memberAction ? memberActionDetail(memberAction) : undefined}
				onClose={() => setMemberAction(null)}
				footer={<><Button onClick={() => setMemberAction(null)}>Cancel</Button><Button variant="primary" className={memberAction?.kind === "remove" ? "org-danger" : undefined} disabled={!fresh} onClick={() => memberAction && runMemberAction(memberAction)}>{memberAction ? MEMBER_ACTION_LABEL[memberAction.kind] : "Confirm"}</Button></>}>
				{memberAction ? <ChangeSummary rows={[
					{ label: "Member", after: `${memberAction.member.name} · ${memberAction.member.email}` },
					memberAction.kind === "role" ? { label: "Role", before: memberAction.member.role, after: memberAction.role } : { label: "Status", before: memberAction.member.status === "suspended" ? "Suspended" : "Active", after: memberAction.kind === "remove" ? "Removed" : memberAction.kind === "suspend" ? "Suspended" : "Active" },
				]} /> : null}
				<FreshSignInNote />
			</Dialog>
			<Dialog
				open={invitationAction !== null}
				title={invitationAction?.kind === "revoke" ? "Revoke this invitation?" : "Send a new link?"}
				description={invitationAction?.kind === "revoke" ? "The link stops working now. You can invite them again later." : "The new link expires in seven days. The recipient and role stay the same."}
				onClose={() => setInvitationAction(null)}
				footer={<><Button onClick={() => setInvitationAction(null)}>Cancel</Button><Button variant="primary" disabled={!fresh} onClick={() => invitationAction && runInvitationAction(invitationAction)}>{invitationAction?.kind === "revoke" ? "Revoke" : "Send new link"}</Button></>}>
				{invitationAction ? <ChangeSummary rows={[{ label: "Recipient", after: invitationAction.invitation.email }, { label: "Role", after: invitationAction.invitation.role }]} /> : null}
				<FreshSignInNote />
			</Dialog>
			<InviteDialog open={inviting} onClose={() => setInviting(false)} onSent={(email, role) => setMessage(`Invitation to ${email} as ${role} is on its way. Delivery can take a minute.`)} />
		</>
	)
}

const MEMBER_ACTION_LABEL: Record<MemberAction["kind"], string> = { role: "Change role", suspend: "Suspend", restore: "Restore", remove: "Remove" }
const memberActionTitle = (action: MemberAction) =>
	action.kind === "role" ? `Change ${action.member.name}'s role?` : action.kind === "suspend" ? `Suspend ${action.member.name}?` : action.kind === "restore" ? `Restore ${action.member.name}?` : `Remove ${action.member.name}?`
const memberActionDetail = (action: MemberAction) =>
	action.kind === "role" ? ROLE_DETAIL[action.role]
		: action.kind === "suspend" ? "Their sessions end now and they can't sign in. Their seat is released; their projects and work are kept."
			: action.kind === "restore" ? "They can sign in again with the access they had. Restoring takes a seat."
				: "They lose access now and their seat is freed. Work they did stays with its projects."

/* One person: the role, suspension and removal, each with the reason it isn't allowed when it isn't. */
function ManageDialog({ member, onClose, onAction }: { member: Member | null; onClose: () => void; onAction: (action: MemberAction) => void }) {
	const org = useOrganization()
	const [role, setRole] = useState<OrgRole>(member?.role ?? "Member")
	const current = member ? org.members.find((item) => item.id === member.id) ?? member : null
	const lastOwner = Boolean(current && isLastOwner(current, org.members))
	const self = current?.id === VIEWER_ID
	const noSeat = seatsUsed(org.members) >= SEATS.package + SEATS.amendment
	return (
		<Dialog
			open={member !== null}
			title={current ? `Manage ${current.name}` : ""}
			description={current ? `${current.email} · ${current.role}` : undefined}
			onClose={onClose}
			footer={<Button onClick={onClose}>Done</Button>}>
			{current ? (
				<>
					<fieldset className="org-choices" key={current.id}>
						<legend className="ds-label">Role</legend>
						{ORG_ROLES.map((option) => (
							<label key={option} className={`org-choice${lastOwner && option !== "Owner" ? " is-disabled" : ""}`}>
								<input type="radio" name="member-role" checked={role === option} disabled={lastOwner && option !== "Owner"} onChange={() => setRole(option)} />
								<span><strong>{option}</strong><small>{ROLE_DETAIL[option]}</small></span>
							</label>
						))}
					</fieldset>
					{lastOwner ? <p className="org-note">{self ? "You're" : `${current.name} is`} the only Owner. Make someone else an Owner first.</p> : self ? <p className="org-note">You can't suspend or remove yourself; another Owner or Admin can.</p> : null}
					{current.status === "suspended" && noSeat ? <p className="org-note">Every seat is taken, so restoring {current.name} needs a free seat first.</p> : null}
					<div className="org-sheet-actions">
						<Button size="sm" variant="primary" disabled={role === current.role} onClick={() => onAction({ member: current, kind: "role", role })}>Change role</Button>
						{current.status === "active"
							? <Button size="sm" disabled={lastOwner || self} onClick={() => onAction({ member: current, kind: "suspend" })}>Suspend</Button>
							: <Button size="sm" disabled={noSeat} onClick={() => onAction({ member: current, kind: "restore" })}>Restore</Button>}
						<Button size="sm" className="acc-danger" disabled={lastOwner || self} onClick={() => onAction({ member: current, kind: "remove" })}>Remove</Button>
					</div>
				</>
			) : null}
		</Dialog>
	)
}

/* The ElevenLabs Invite Member dialog: an address, then the role with what each one may do. */
function InviteDialog({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: (email: string, role: OrgRole) => void }) {
	const org = useOrganization()
	const { fresh } = useFreshSignIn()
	const [email, setEmail] = useState("")
	const [role, setRole] = useState<OrgRole>("Member")
	const [touched, setTouched] = useState(false)
	const clean = email.trim().toLowerCase()
	const member = org.members.find((item) => item.email === clean)
	const pending = org.invitations.find((item) => item.email === clean && item.status === "pending")
	const error = !clean ? null : !EMAIL.test(clean) ? (touched ? "Enter a complete email address." : null) : member ? `${member.name} is already a member.` : pending ? "There's already a pending invitation to this address. Resend it instead." : null
	const valid = EMAIL.test(clean) && !member && !pending
	const close = () => { setEmail(""); setRole("Member"); setTouched(false); onClose() }
	const send = () => { if (!valid || !fresh) return; inviteMember(clean, role); onSent(clean, role); close() }
	return (
		<Dialog
			open={open}
			title="Invite a member"
			description={`They join ${org.name} with the role you choose. The link expires in seven days, and a pending invitation doesn't take a seat.`}
			onClose={close}
			footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!valid || !fresh} onClick={send}>Send invitation</Button></>}>
			<form className="ds-field" onSubmit={(event) => { event.preventDefault(); send() }}>
				<label htmlFor="invite-email">Email address</label>
				<input id="invite-email" className="ds-input" type="email" autoComplete="off" value={email} aria-invalid={Boolean(error)} aria-describedby={error ? "invite-email-error" : undefined} onBlur={() => setTouched(true)} onChange={(event) => setEmail(event.target.value)} />
				{error ? <small id="invite-email-error" className="org-error">{error}</small> : null}
			</form>
			<fieldset className="org-choices">
				<legend className="ds-label">Role</legend>
				{ORG_ROLES.map((option) => (
					<label key={option} className="org-choice">
						<input type="radio" name="invite-role" checked={role === option} onChange={() => setRole(option)} />
						<span><strong>{option}</strong><small>{ROLE_DETAIL[option]}</small></span>
					</label>
				))}
			</fieldset>
			<FreshSignInNote />
		</Dialog>
	)
}
