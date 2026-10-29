import { useSyncExternalStore } from "react"

import { INITIAL_PLATFORM, initialReceipts, initialTenants, type PlatformState, type ReasonCode, type Receipt, type ReceiptStatus, type TenantState } from "./model"

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
}

const MFA_WINDOW_MINUTES = 15
const initialState = (mfaMinutesAgo = 9): AdminState => ({ tenants: initialTenants(), platform: INITIAL_PLATFORM, receipts: initialReceipts(), mfaAt: Date.now() - mfaMinutesAgo * 60_000 })

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

export const mfaMinutes = (now = Date.now()) => Math.max(0, Math.floor((now - state.mfaAt) / 60_000))
export const mfaFresh = (now = Date.now()) => mfaMinutes(now) < MFA_WINDOW_MINUTES
export function verifyMfa() { update({ mfaAt: Date.now() }) }

export type Publication = {
	scope: string
	control: string
	change: string
	reason: ReasonCode
	ticket: string
	tenantId?: string
	applyTenant?: (tenant: TenantState) => TenantState
	applyPlatform?: (platform: PlatformState) => PlatformState
	// The states enforcement reports after the publish, in order. Every change ends Applied.
	settle?: ReceiptStatus[]
}

const setReceipt = (id: string, status: ReceiptStatus) => update({ receipts: state.receipts.map((receipt) => receipt.id === id ? { ...receipt, status } : receipt) })

export function publish(publication: Publication): Receipt {
	const tenant = publication.tenantId ? state.tenants.find((item) => item.id === publication.tenantId) : undefined
	const revision = tenant ? tenant.revision + 1 : state.platform.revision + 1
	const tenants = tenant && publication.applyTenant
		? state.tenants.map((item) => item.id === tenant.id ? { ...publication.applyTenant!(item), revision, updated: "Just now" } : item)
		: state.tenants
	const platform = !tenant && publication.applyPlatform ? { ...publication.applyPlatform(state.platform), revision } : state.platform
	const receipt: Receipt = { id: `r-live-${++sequence}`, scope: publication.scope, control: publication.control, change: publication.change, operator: "Maya Chen", reason: publication.reason, ticket: publication.ticket.trim(), revision, at: "Just now", status: "published" }
	update({ tenants, platform, receipts: [receipt, ...state.receipts] })
	const steps = publication.settle ?? ["applied"]
	steps.forEach((status, index) => window.setTimeout(() => setReceipt(receipt.id, status), 1200 * (index + 1)))
	return receipt
}
