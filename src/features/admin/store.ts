import { useSyncExternalStore } from "react"

import { buildTenant, can, deniedReason, INITIAL_PLATFORM, INITIAL_STAFF, initialReceipts, initialTenants, moduleList, OWNER_BINDING_MINUTES, packageFor, resolveSetupCode, SETUP_CODE_MINUTES, type FirstOwnerIdentity, type PlatformState, type ReasonCode, type Receipt, type ReceiptStatus, type SetupCode, type StaffAction, type StaffMember, type TenantDraft, type TenantState } from "./model"

/*
 * The staff app's state for this tab. A change is published as a new revision with its receipt
 * in one step; the receipt then reports enforcement on its own (Published → Applied, or through
 * Cleanup pending). Nothing is called applied because a publish succeeded.
 */
export type AdminState = {
	tenants: TenantState[]
	platform: PlatformState
	receipts: Receipt[]
	// When the staff member last completed MFA. Privileged commands need it within 15 minutes.
	mfaAt: number
	staff: StaffMember[]
	staffRevision: number
	// Whose view this is. Every command rechecks this person's current roles when it commits.
	actorId: string
	setupCodes: SetupCode[]
}

const MFA_WINDOW_MINUTES = 15
const simulatedText = (alphabet: string, length: number) => Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")
const simulatedUuid = () => [8, 4, 4, 4, 12].map((length) => simulatedText("0123456789abcdef", length)).join("-")
const simulatedIdentity = (): FirstOwnerIdentity => {
	const tid = simulatedUuid()
	return { globalUser: simulatedUuid(), issuer: `https://login.microsoftonline.com/${tid}/v2.0`, subject: simulatedText("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 32), tid, oid: simulatedUuid() }
}
const simulatedCode = () => `${simulatedText("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", 21)}${simulatedText("AQgw", 1)}`

/** A code issued before the ten-minute window, so the expired path has something real to refuse. */
export const SEEDED_EXPIRED_CODE = "kT3vXq9LmP2sRw7ZbN4yAQ"

const initialState = (mfaMinutesAgo = 9): AdminState => ({
	tenants: initialTenants(), platform: INITIAL_PLATFORM, receipts: initialReceipts(), mfaAt: Date.now() - mfaMinutesAgo * 60_000,
	staff: INITIAL_STAFF, staffRevision: 3, actorId: INITIAL_STAFF[0].id,
	setupCodes: [{ code: SEEDED_EXPIRED_CODE, identity: simulatedIdentity(), issuedAt: Date.now() - (SETUP_CODE_MINUTES + 1) * 60_000, consumedAt: null }],
})

let state = initialState()
let sequence = 0
const listeners = new Set<() => void>()
const emit = () => { for (const listener of listeners) listener() }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const update = (next: Partial<AdminState>) => { state = { ...state, ...next }; emit() }

export function useAdmin(): AdminState {
	return useSyncExternalStore(subscribe, () => state, () => state)
}
export const readAdmin = () => state

/** Tests start from the seed, optionally with an older MFA. */
export function resetAdminStore(options: { mfaMinutesAgo?: number } = {}) { state = initialState(options.mfaMinutesAgo); sequence = 0; emit() }

export const readActor = () => state.staff.find((member) => member.id === state.actorId)
export function useActor(): StaffMember | undefined {
	const { staff, actorId } = useAdmin()
	return staff.find((member) => member.id === actorId)
}
/** The demo's identity control: the same panel as each staff member sees it. */
export function viewAs(id: string) { update({ actorId: id }) }

/* The customer's side of the first-Owner flow, simulated: the person signs in and issues their own code. */
export function issueSetupCode(): string {
	const code = simulatedCode()
	update({ setupCodes: [...state.setupCodes, { code, identity: simulatedIdentity(), issuedAt: Date.now(), consumedAt: null }] })
	return code
}

export const mfaMinutes = (now = Date.now()) => Math.max(0, Math.floor((now - state.mfaAt) / 60_000))
export const mfaFresh = (now = Date.now()) => mfaMinutes(now) < MFA_WINDOW_MINUTES
export function verifyMfa() { update({ mfaAt: Date.now() }) }

export type Publication = {
	// The named staff action this command is, rechecked against current roles at commit.
	action: StaffAction
	scope: string
	control: string
	change: string
	reason: ReasonCode
	ticket: string
	tenantId?: string
	applyTenant?: (tenant: TenantState) => TenantState
	applyPlatform?: (platform: PlatformState) => PlatformState
	applyStaff?: (staff: StaffMember[]) => StaffMember[]
	// The states enforcement reports after the publish, in order. Every change ends Applied.
	settle?: ReceiptStatus[]
}

const setReceipt = (id: string, status: ReceiptStatus) => update({ receipts: state.receipts.map((receipt) => receipt.id === id ? { ...receipt, status } : receipt) })

/* A preview reserves nothing: role and MFA are checked again when the command commits. */
function assertCurrent(action: StaffAction) {
	if (!can(readActor(), action)) throw new Error(`Refused: ${deniedReason(action)}`)
	if (!mfaFresh()) throw new Error("Refused: this command needs MFA in the last 15 minutes")
}

const followEnforcement = (receipt: Receipt, steps: ReceiptStatus[] = ["applied"]) => steps.forEach((status, index) => window.setTimeout(() => setReceipt(receipt.id, status), 1200 * (index + 1)))
const newReceipt = (fields: Pick<Receipt, "scope" | "control" | "change" | "reason" | "ticket" | "revision">): Receipt => ({ ...fields, id: `r-live-${++sequence}`, ticket: fields.ticket.trim(), operator: readActor()?.name ?? "Unknown", at: "Just now", status: "published" })

export function publish(publication: Publication): Receipt {
	assertCurrent(publication.action)
	const tenant = publication.tenantId ? state.tenants.find((item) => item.id === publication.tenantId) : undefined
	const nextStaff = publication.applyStaff?.(state.staff)
	if (nextStaff && !nextStaff.some((member) => member.roles.includes("Platform Owner"))) throw new Error("Refused: the last Platform Owner can't lose the role")
	const revision = tenant ? tenant.revision + 1 : nextStaff ? state.staffRevision + 1 : state.platform.revision + 1
	const tenants = tenant && publication.applyTenant
		? state.tenants.map((item) => item.id === tenant.id ? { ...publication.applyTenant!(item), revision, updated: "Just now" } : item)
		: state.tenants
	const platform = !tenant && !nextStaff && publication.applyPlatform ? { ...publication.applyPlatform(state.platform), revision } : state.platform
	const receipt = newReceipt({ scope: publication.scope, control: publication.control, change: publication.change, reason: publication.reason, ticket: publication.ticket, revision })
	update({ tenants, platform, receipts: [receipt, ...state.receipts], ...(nextStaff ? { staff: nextStaff, staffRevision: revision } : {}) })
	followEnforcement(receipt, publication.settle)
	return receipt
}

const uniqueTenantId = (name: string) => {
	const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tenant"
	let id = slug
	for (let suffix = 2; state.tenants.some((tenant) => tenant.id === id); suffix++) id = `${slug}-${suffix}`
	return id
}

const consume = (code: string, now: number) => state.setupCodes.map((item) => item.code === code ? { ...item, consumedAt: now } : item)

export type CommandResult = { ok: true; receipt: Receipt; tenantId: string } | { ok: false; error: string }

/*
 * The first-Owner authorization (IAM-2) and the agreement draft (COM-1) commit together, each with
 * its own receipt. The code is re-resolved here, so one that expired or was used after the preview
 * is refused and nothing changes. The code itself never reaches a receipt.
 */
export function createTenant(draft: TenantDraft, code: string, reason: ReasonCode, ticket: string): CommandResult {
	assertCurrent("tenant.bootstrap")
	const now = Date.now()
	const resolved = resolveSetupCode(state.setupCodes, code, now)
	if (!resolved.ok) return resolved
	const tenant = buildTenant(draft, resolved.entry.identity, uniqueTenantId(draft.name), now)
	const pack = packageFor(draft.packageName)
	const owner = newReceipt({ scope: tenant.name, control: "Organization and first Owner", change: `None → Pending setup, bound to global user ${resolved.entry.identity.globalUser}`, reason, ticket, revision: 1 })
	const agreement = newReceipt({ scope: tenant.name, control: "Agreement draft", change: `Version 1: ${pack.name}, ${draft.seats} seats, ${moduleList(draft.modules)}, ${Number.parseInt(draft.allowance, 10).toLocaleString("en-US")} units`, reason, ticket, revision: 1 })
	update({ tenants: [tenant, ...state.tenants], receipts: [owner, agreement, ...state.receipts], setupCodes: consume(resolved.entry.code, now) })
	followEnforcement(owner)
	followEnforcement(agreement)
	return { ok: true, receipt: owner, tenantId: tenant.id }
}

/* A fresh code and a fresh confirmation replace the binding; the old one stops working. */
export function replaceOwnerBinding(tenantId: string, code: string, reason: ReasonCode, ticket: string): CommandResult {
	assertCurrent("tenant.bootstrap")
	const now = Date.now()
	const tenant = state.tenants.find((item) => item.id === tenantId)
	if (!tenant?.setup) return { ok: false, error: "This tenant isn't waiting for a first Owner." }
	const resolved = resolveSetupCode(state.setupCodes, code, now)
	if (!resolved.ok) return resolved
	const setup = { ...tenant.setup, firstOwner: resolved.entry.identity, bindingRevision: tenant.setup.bindingRevision + 1, bindingExpiresAt: now + OWNER_BINDING_MINUTES * 60_000 }
	const receipt = publish({ action: "tenant.bootstrap", scope: tenant.name, tenantId, control: "First Owner binding", change: `Binding ${tenant.setup.bindingRevision} → ${setup.bindingRevision}, bound to global user ${resolved.entry.identity.globalUser}`, reason, ticket, applyTenant: (current) => ({ ...current, setup }) })
	update({ setupCodes: consume(resolved.entry.code, now) })
	return { ok: true, receipt, tenantId }
}
