import { useSyncExternalStore } from "react"

/*
 * Organization knowledge (D-088, the EVD-4 plan): the curated layer of what agents need to know
 * about the organization. One library every project inherits; a project can add its own items but
 * never override a binding rule. Owners and Admins publish; members and agents suggest. Every
 * published version is attributed and pinned by the work that used it, so an edit applies to new
 * work only. Knowledge informs agents; it never grants a permission, a tool or an approval, so a
 * rule that must never be broken is also a platform control, and the item links to it.
 * In memory for the tab, like the organization store; nothing reaches a provider.
 */

export type KnowledgeSection = "profile" | "rules" | "compliance" | "procedures" | "brand" | "glossary"
export const SECTIONS: KnowledgeSection[] = ["profile", "rules", "compliance", "procedures", "brand", "glossary"]
export const SECTION_LABEL: Record<KnowledgeSection, string> = { profile: "Profile", rules: "Rules and policies", compliance: "Compliance and regulations", procedures: "Procedures", brand: "Brand kit", glossary: "Glossary" }
export const SECTION_TAB: Record<KnowledgeSection, string> = { profile: "Profile", rules: "Rules and policies", compliance: "Compliance", procedures: "Procedures", brand: "Brand kit", glossary: "Glossary" }
// Only profile, key-rule and tone items can join the essentials every run starts from.
export const ESSENTIAL_SECTIONS: KnowledgeSection[] = ["profile", "rules", "brand"]

/* The organization's essentials budget; a project adds four items and 4,000 bytes of its own. */
export const ESSENTIALS_BUDGET = { items: 8, bytes: 8_000 }
export const TITLE_LIMIT = 200
export const CONTENT_LIMIT = 65_536
export const FILE_LIMIT = 25 * 1024 * 1024
export const ACCEPTED_FILES = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".docx", ".xlsx"]
export const SECRET_WARNING = "Do not store secrets or credentials here. Included knowledge may be sent to model providers under your organization's data terms."

export type KnowledgeUse = { id: string; kind: "agentix" | "discovery"; work: string; detail: string; version: number; target: string }
export type KnowledgeVersion = { version: number; author: string; approver?: string; date: string; note: string }
export type KnowledgeOrigin = { kind: "member"; by: string; date: string } | { kind: "discovery" | "agentix"; work: string; target: string; source: string; date: string }

export type KnowledgeItem = {
	id: string
	section: KnowledgeSection
	title: string
	body: string
	kind: "binding" | "guidance"
	// The platform control that actually enforces a binding rule. Without one it can't publish as enforced.
	control?: string
	essential: boolean
	visibility: string[] | "everyone"
	project?: string
	effective: string
	state: "published" | "draft" | "suggested" | "withdrawn"
	version: number
	versions: KnowledgeVersion[]
	uses: KnowledgeUse[]
	files?: Array<{ name: string; detail: string }>
	origin?: KnowledgeOrigin
	// A draft of the next version of a published item.
	revises?: string
	updated: string
	updatedBy: string
}

export type ConflictDismissal = "not_a_conflict" | "duplicate_report" | "insufficient_evidence"
export const DISMISSAL_LABEL: Record<ConflictDismissal, string> = { not_a_conflict: "Not a conflict", duplicate_report: "Duplicate report", insufficient_evidence: "Insufficient evidence" }

export type KnowledgeConflict = {
	id: string
	title: string
	detail: string
	reportedBy: string
	target: string
	items: [string, string]
	citations: string[]
	state: "open" | "resolved" | "dismissed"
}

const v = (version: number, author: string, date: string, note: string, approver?: string): KnowledgeVersion => ({ version, author, approver, date, note })
const agentix = (id: string, work: string, target: string, version: number, detail: string): KnowledgeUse => ({ id, kind: "agentix", work, target, version, detail })
const discovery = (id: string, work: string, target: string, version: number, detail: string): KnowledgeUse => ({ id, kind: "discovery", work, target, version, detail })

// Seeded demo work these items were cited by: the everyday Agentix engagements and Discovery records.
const REVENUE = ["Revenue reconciliation", "invoice"] as const
const SERVICE = ["Service desk", "service"] as const
const ONBOARDING = ["Employee onboarding", "onboarding"] as const
const INVENTORY = ["Inventory operations", "inventory"] as const
const FINCTRL = ["ServiceNow financial-control integration", "seed-financial-integration"] as const
const TPRM = ["Third-party onboarding control redesign", "seed-tprm-control-redesign"] as const
const DILIGENCE = ["NorthBridge acquisition diligence", "seed-northbridge-diligence"] as const

const published = (item: Omit<KnowledgeItem, "state" | "kind" | "essential" | "visibility" | "uses"> & Partial<Pick<KnowledgeItem, "kind" | "essential" | "visibility" | "uses">>): KnowledgeItem =>
	({ kind: "guidance", essential: false, visibility: "everyone", uses: [], state: "published", ...item })

const initialItems = (): KnowledgeItem[] => [
	published({
		id: "k-profile", section: "profile", title: "What Northstar does", essential: true, version: 3, effective: "Sep 30", updated: "Sep 30", updatedBy: "Root Admin",
		body: "Northstar Consulting is a professional services firm of about 1,200 people. We run finance transformation, ERP modernization and post-merger integration programs for mid-market and enterprise clients.\n\nOur own finance operations run on SAP S/4HANA for the group, QuickBooks Online for the US entity, Salesforce for sales and ServiceNow for IT and finance case work. Engagement documents live in SharePoint.\n\nWe are accountable to our clients for evidence: every claim in a deliverable cites where it came from.",
		versions: [v(3, "Root Admin", "Sep 30", "Added the US entity and the evidence expectation."), v(2, "Andre Reyes", "Aug 14", "Updated headcount.", "Root Admin"), v(1, "Root Admin", "Jun 2", "First version.")],
		uses: [agentix("u1", ...REVENUE, 3, "In every run's essentials · 41 cases"), agentix("u2", ...SERVICE, 3, "In every run's essentials · 18 cases"), discovery("u3", ...FINCTRL, 2, "Session context, pinned before v3"), discovery("u4", ...DILIGENCE, 2, "Session context")],
	}),
	published({
		id: "k-systems", section: "profile", title: "Key systems and who owns them", essential: true, version: 2, effective: "Oct 6", updated: "Oct 6", updatedBy: "Andre Reyes",
		body: "SAP S/4HANA (production P41): Finance Systems, owner Elena Ortiz.\nSalesforce: Sales Operations, owner Marcus Reed.\nServiceNow: IT and Finance Operations, owner Andre Reyes.\nQuickBooks Online (company 934771): US Finance, owner Sarah Liu.\nSharePoint and OneDrive: everyone; engagement sites are owned by the engagement lead.",
		versions: [v(2, "Andre Reyes", "Oct 6", "ServiceNow ownership moved to IT and Finance Operations.", "Root Admin"), v(1, "Root Admin", "Jun 2", "First version.")],
		uses: [agentix("u5", ...REVENUE, 2, "In every run's essentials · 41 cases"), agentix("u6", ...INVENTORY, 2, "In every run's essentials · 9 cases"), discovery("u7", ...FINCTRL, 2, "Cited in the Technical Assessment")],
	}),
	published({
		id: "k-teams", section: "profile", title: "Teams and locations", essential: true, version: 1, effective: "Jun 2", updated: "Jun 2", updatedBy: "Root Admin",
		body: "Offices in London (headquarters), New York and Singapore. Finance Operations sits in London; the US entity's finance team is in New York. Working hours for approvals are 08:00 to 18:00 in the approver's own office.",
		versions: [v(1, "Root Admin", "Jun 2", "First version.")],
		uses: [agentix("u8", ...ONBOARDING, 1, "In every run's essentials · 7 cases")],
	}),
	published({
		id: "k-approvals", section: "rules", title: "Payment approvals over $25,000 need a Finance Director", kind: "binding", control: "Agentix approvals over $25,000", essential: true, version: 3, effective: "Oct 1", updated: "Oct 1", updatedBy: "Root Admin",
		body: "Any payment, credit or write-off above $25,000, or its equivalent in another currency on the day, needs a Finance Director's approval before it is released.\n\nAgentix prepares the case and the evidence and stops for the approval. Splitting one obligation into smaller amounts to stay under the threshold is not allowed.",
		versions: [v(3, "Root Admin", "Oct 1", "Threshold raised from $10,000 to $25,000 by the CFO's memo of Sep 28."), v(2, "Root Admin", "Jul 9", "Added the currency rule."), v(1, "Root Admin", "Jun 2", "First version.")],
		uses: [agentix("u9", ...REVENUE, 3, "Cited in 12 cases · enforced by its control"), agentix("u10", ...INVENTORY, 3, "Cited in 2 cases"), discovery("u11", ...FINCTRL, 2, "Cited in the Requirements Specification")],
	}),
	published({
		id: "k-recipients", section: "rules", title: "Allowed outside recipients", kind: "binding", control: "Allowed recipients for outside messages", essential: true, version: 2, effective: "Sep 12", updated: "Sep 12", updatedBy: "Elena Ortiz",
		body: "Agents may write to people outside Northstar only at the client and supplier domains on the approved list, and only from the connected mailbox of the person they work for. Everything else is drafted for a person to send.",
		versions: [v(2, "Elena Ortiz", "Sep 12", "Added supplier domains.", "Root Admin"), v(1, "Root Admin", "Jun 2", "First version.")],
		uses: [agentix("u12", ...SERVICE, 2, "Cited in 3 cases")],
	}),
	published({
		id: "k-freeze", section: "rules", title: "No ledger changes after day 3 of the close", version: 1, effective: "Jul 1", updated: "Jul 1", updatedBy: "Sarah Liu",
		body: "From the third working day of a month-end close until the controller signs off, nothing is posted to the prior period. Corrections go to the current period with a note that references the original document.",
		versions: [v(1, "Sarah Liu", "Jul 1", "First version.", "Root Admin")],
		uses: [agentix("u13", ...REVENUE, 1, "Cited in 5 cases")],
	}),
	published({
		id: "k-sox", section: "compliance", title: "SOX 404 IT general controls", version: 2, effective: "Aug 20", updated: "Aug 20", updatedBy: "Elena Ortiz",
		body: "Northstar follows SOX 404 for its US entity. Changes to finance systems need a ticket, a reviewer who did not make the change, and evidence kept for seven years. Agentix designs that touch SAP, QuickBooks or the billing ledger carry these as verification duties.",
		files: [{ name: "Northstar ITGC matrix 2026.pdf", detail: "PDF · 1.8 MB · text searchable" }],
		versions: [v(2, "Elena Ortiz", "Aug 20", "2026 control matrix attached.", "Root Admin"), v(1, "Elena Ortiz", "Jun 10", "First version.", "Root Admin")],
		uses: [discovery("u14", ...FINCTRL, 2, "Cited in the Technical Assessment and Use Case Catalog"), agentix("u15", ...REVENUE, 2, "Verification duty in the design")],
	}),
	published({
		id: "k-gdpr", section: "compliance", title: "GDPR records of processing", visibility: ["Root Admin", "Elena Ortiz", "Andre Reyes"], version: 1, effective: "Jul 15", updated: "Jul 15", updatedBy: "Elena Ortiz",
		body: "Northstar's records of processing for employee and client contact data, with the lawful basis and retention for each. Agents use this only for people who may see it.",
		files: [{ name: "Records of processing 2026.xlsx", detail: "XLSX · 240 KB" }],
		versions: [v(1, "Elena Ortiz", "Jul 15", "First version.", "Root Admin")],
		uses: [agentix("u16", ...ONBOARDING, 1, "Cited in 2 cases")],
	}),
	published({
		id: "k-close", section: "procedures", title: "Month-end close", version: 4, effective: "Aug 28", updated: "Aug 28", updatedBy: "Sarah Liu",
		body: "Day 1: subledgers close and bank reconciliations start. Day 2: accruals and intercompany. Day 3: the controller's review; payments and credits over $10,000 need a Finance Director's sign-off before the period closes. Day 4: reporting pack to the CFO.",
		versions: [v(4, "Sarah Liu", "Aug 28", "Moved the reporting pack to day 4.", "Root Admin"), v(3, "Sarah Liu", "Jul 2", "Added intercompany.", "Root Admin")],
		uses: [agentix("u17", ...REVENUE, 4, "Cited in 9 cases"), discovery("u18", ...FINCTRL, 4, "Cited in the process map")],
	}),
	published({
		id: "k-supplier", section: "procedures", title: "Supplier onboarding", project: "ERP modernization", version: 2, effective: "Oct 9", updated: "Oct 9", updatedBy: "Andre Reyes",
		body: "For the ERP modernization program: a new supplier needs a completed quality review, verified bank details by call-back, and a purchasing owner before its first purchase order. ServiceNow holds the onboarding case; SAP holds the business partner.",
		versions: [v(2, "Andre Reyes", "Oct 9", "Call-back step added.", "Root Admin"), v(1, "Andre Reyes", "Sep 3", "First version.", "Root Admin")],
		uses: [discovery("u19", ...TPRM, 2, "Cited in the current-state process"), agentix("u20", ...INVENTORY, 1, "Cited in 1 case")],
	}),
	published({
		id: "k-revexceptions", section: "procedures", title: "Revenue reconciliation exceptions", version: 1, effective: "Oct 14", updated: "Oct 14", updatedBy: "Sarah Liu",
		body: "An invoice that doesn't match its contract within 0.5% goes to the exception queue with the contract line, the invoice line and the difference. Timing differences under five days clear on their own at the next run.",
		versions: [v(1, "Sarah Liu", "Oct 14", "First version.", "Root Admin")],
		uses: [agentix("u21", ...REVENUE, 1, "Cited in 23 cases")],
	}),
	published({
		id: "k-brand", section: "brand", title: "Logo and colours", version: 2, effective: "Sep 1", updated: "Sep 1", updatedBy: "Root Admin",
		body: "Primary colours: Northstar Navy and Signal Teal, with white space doing most of the work. Use the full logo on covers and the mark alone inside documents. Fonts: Inter for documents, falling back to Arial.",
		files: [{ name: "northstar-logo.png", detail: "PNG · 84 KB" }, { name: "Northstar report template.docx", detail: "DOCX · 312 KB" }],
		versions: [v(2, "Root Admin", "Sep 1", "Report template added."), v(1, "Root Admin", "Jun 2", "First version.")],
		uses: [agentix("u22", ...REVENUE, 2, "Reconciliation pack and dashboard"), discovery("u23", ...DILIGENCE, 2, "Package documents")],
	}),
	published({
		id: "k-tone", section: "brand", title: "Tone of voice", essential: true, version: 2, effective: "Sep 1", updated: "Sep 1", updatedBy: "Root Admin",
		body: "Plain, specific and calm. Lead with the finding and the number, then the evidence. No hype, no exclamation marks, British spelling in documents for UK clients and American spelling for US clients.",
		versions: [v(2, "Root Admin", "Sep 1", "Spelling rule added."), v(1, "Root Admin", "Jun 2", "First version.")],
		uses: [agentix("u24", ...REVENUE, 2, "In every run's essentials · 41 cases"), agentix("u25", ...SERVICE, 2, "In every run's essentials · 18 cases"), discovery("u26", ...DILIGENCE, 2, "Session context")],
	}),
	published({
		id: "k-arr", section: "glossary", title: "ARR", version: 1, effective: "Jun 2", updated: "Jun 2", updatedBy: "Root Admin",
		body: "Annual recurring revenue: the annualised value of active subscription contracts on the last day of the month, excluding one-off services.",
		versions: [v(1, "Root Admin", "Jun 2", "First version.")],
		uses: [discovery("u27", ...DILIGENCE, 1, "Cited in the financial summary")],
	}),
	published({
		id: "k-block", section: "glossary", title: "Billing block", version: 1, effective: "Aug 4", updated: "Aug 4", updatedBy: "Elena Ortiz",
		body: "An SAP flag that stops an order from being billed until someone clears it, usually for a pricing or master-data problem.",
		versions: [v(1, "Elena Ortiz", "Aug 4", "First version.", "Root Admin")],
		uses: [agentix("u28", ...REVENUE, 1, "Cited in 6 cases")],
	}),
	published({
		id: "k-doa", section: "glossary", title: "DoA", version: 1, effective: "Jun 2", updated: "Jun 2", updatedBy: "Root Admin",
		body: "Delegation of authority: who may approve what, and up to which amount. The binding thresholds live under Rules and policies.",
		versions: [v(1, "Root Admin", "Jun 2", "First version.")],
	}),
	// Waiting on an Owner or Admin: one member's suggestion and one Discovery learned in an interview.
	{
		id: "k-s-backlog", section: "glossary", title: "Unbilled backlog", body: "Work delivered and accepted by the client that hasn't been invoiced yet, valued at contract rates.",
		kind: "guidance", essential: false, visibility: "everyone", effective: "Oct 27", state: "suggested", version: 1, versions: [], uses: [],
		origin: { kind: "member", by: "Marcus Reed", date: "Yesterday" }, updated: "Yesterday", updatedBy: "Marcus Reed",
	},
	{
		id: "k-s-credits", section: "rules", title: "Credit notes over $5,000 need the controller's review", body: "A credit note above $5,000 is reviewed by the controller before it is issued, whatever the reason for it.",
		kind: "guidance", essential: false, visibility: "everyone", effective: "Oct 28", state: "suggested", version: 1, versions: [], uses: [],
		origin: { kind: "discovery", work: FINCTRL[0], target: FINCTRL[1], source: "Interview with Sarah Liu, Controller · Oct 21 · her answer on credit approvals", date: "Today" }, updated: "Today", updatedBy: "Discovery",
	},
]

const initialConflicts = (): KnowledgeConflict[] => [
	{
		id: "c-threshold", title: "Two approval thresholds", reportedBy: "Agentix · Revenue reconciliation", target: "invoice", items: ["k-close", "k-approvals"], state: "open",
		detail: "Month-end close v4 says payments and credits over $10,000 need a Finance Director's sign-off. The binding rule says $25,000 since Oct 1. The agent followed the binding rule and stopped to report this.",
		citations: ["Month-end close v4 · day 3", "Payment approvals over $25,000 v3"],
	},
]

type KnowledgeState = { items: KnowledgeItem[]; conflicts: KnowledgeConflict[] }

let state: KnowledgeState = { items: initialItems(), conflicts: initialConflicts() }
const listeners = new Set<() => void>()
let sequence = 0
const emit = () => { for (const listener of listeners) listener() }
const update = (next: Partial<KnowledgeState>) => { state = { ...state, ...next }; emit() }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

export function useKnowledge(): KnowledgeState {
	return useSyncExternalStore(subscribe, () => state, () => state)
}
export const readKnowledge = () => state
export function resetKnowledgeStore() { state = { items: initialItems(), conflicts: initialConflicts() }; sequence = 0; emit() }

// ── Budget and guards ───────────────────────────────────────────────────────────────────────

export const itemBytes = (item: Pick<KnowledgeItem, "title" | "body">) => new TextEncoder().encode(`${item.title}\n${item.body}`).length
export const essentialsUse = (items = state.items) => {
	const essentials = items.filter((item) => item.essential && item.state === "published" && !item.project)
	return { items: essentials.length, bytes: essentials.reduce((sum, item) => sum + itemBytes(item), 0) }
}
export const formatKb = (bytes: number) => bytes % 1000 === 0 ? String(bytes / 1000) : (bytes / 1000).toFixed(1)

const SECRET = /sk-[A-Za-z0-9_-]{6,}|AKIA[0-9A-Z]{8,}|-----BEGIN|ghp_[A-Za-z0-9]{12,}|xox[bp]-[A-Za-z0-9-]{8,}/
export const looksLikeSecret = (...values: string[]) => values.some((value) => SECRET.test(value))

export const reviewCount = (current = state) => current.items.filter((item) => item.state === "suggested").length + current.conflicts.filter((conflict) => conflict.state === "open").length

// ── Saving ──────────────────────────────────────────────────────────────────────────────────

export type KnowledgeDraft = {
	section: KnowledgeSection
	title: string
	body: string
	kind: "binding" | "guidance"
	essential: boolean
	visibility: string[] | "everyone"
	file?: { name: string; detail: string }
}

export type SaveResult =
	| { ok: true; id: string; state: KnowledgeItem["state"] }
	| { ok: false; error: "secret" | "title" | "content" }
	| { ok: false; error: "essentials"; id: string; projected: { items: number; bytes: number } }

/*
 * Publish or save a draft. A secret-looking value is refused without being stored. Joining the
 * essentials beyond the budget is refused too, but the draft is kept (without essentials). A
 * binding rule saves as a draft until the platform control that enforces it exists.
 */
export function saveItem(draft: KnowledgeDraft, mode: "publish" | "draft", revises?: string): SaveResult {
	const title = draft.title.trim().replace(/\s+/g, " ")
	const body = draft.body.replace(/\r\n/g, "\n").trim()
	if (looksLikeSecret(title, body)) return { ok: false, error: "secret" }
	if (!title || title.length > TITLE_LIMIT) return { ok: false, error: "title" }
	if (!body || new TextEncoder().encode(body).length > CONTENT_LIMIT) return { ok: false, error: "content" }
	const original = revises ? state.items.find((item) => item.id === revises) : undefined
	// Saving over a draft replaces that draft in place; publishing it lands on the item it revises, if any.
	const editingDraft = original?.state === "draft" ? original : undefined
	const target = editingDraft ? (editingDraft.revises ? state.items.find((item) => item.id === editingDraft.revises) : undefined) : original
	const withoutDraft = (items: KnowledgeItem[]) => editingDraft ? items.filter((item) => item.id !== editingDraft.id) : items
	const essential = draft.essential && ESSENTIAL_SECTIONS.includes(draft.section)
	const binding = draft.section === "rules" && draft.kind === "binding"
	const control = target?.control ?? original?.control
	const publish = mode === "publish" && (!binding || Boolean(control))
	const base: KnowledgeItem = {
		id: editingDraft?.id ?? `k-new-${++sequence}`, section: draft.section, title, body, kind: draft.section === "rules" ? draft.kind : "guidance",
		essential, visibility: draft.visibility, effective: "Today", state: publish ? "published" : "draft",
		version: target ? target.version + 1 : 1, versions: [], uses: [], files: draft.file ? [draft.file] : original?.files,
		control, project: target?.project ?? original?.project, revises: publish ? undefined : target?.id, updated: "Just now", updatedBy: "Root Admin",
	}
	if (publish && essential) {
		const others = state.items.filter((item) => item.id !== target?.id && item.id !== editingDraft?.id)
		const projected = essentialsUse([...others, base])
		if (projected.items > ESSENTIALS_BUDGET.items || projected.bytes > ESSENTIALS_BUDGET.bytes) {
			// Over budget: keep the work as a draft without essentials, under the same id, so its sheet can say why.
			const kept = { ...base, essential: false, state: "draft" as const, revises: target?.id }
			update({ items: editingDraft ? state.items.map((item) => item.id === editingDraft.id ? kept : item) : [kept, ...state.items] })
			return { ok: false, error: "essentials", id: kept.id, projected }
		}
	}
	if (publish && target) {
		const next: KnowledgeItem = { ...target, title, body, essential, visibility: draft.visibility, files: base.files, version: base.version, state: "published", effective: "Today", updated: "Just now", updatedBy: "Root Admin", versions: [v(base.version, "Root Admin", "Today", "Edited and published."), ...target.versions] }
		update({ items: withoutDraft(state.items).map((item) => item.id === target.id ? next : item) })
		return { ok: true, id: target.id, state: "published" }
	}
	const item = publish ? { ...base, versions: [v(base.version, "Root Admin", "Today", "First version.")] } : base
	update({ items: editingDraft ? state.items.map((existing) => existing.id === editingDraft.id ? item : existing) : [item, ...state.items] })
	return { ok: true, id: item.id, state: item.state }
}

/* Publishing a draft goes through the same checks as publishing from the editor. */
export function publishDraft(id: string): SaveResult {
	const draft = state.items.find((item) => item.id === id)
	if (!draft || draft.state !== "draft") return { ok: false, error: "content" }
	return saveItem({ section: draft.section, title: draft.title, body: draft.body, kind: draft.kind, essential: draft.essential, visibility: draft.visibility, file: draft.files?.[0] }, "publish", draft.id)
}

export function discardDraft(id: string) { update({ items: state.items.filter((item) => item.id !== id || item.state !== "draft") }) }

/* New work stops using a withdrawn item; work already started keeps its pinned version. */
export function withdrawItem(id: string) { update({ items: state.items.map((item) => item.id === id ? { ...item, state: "withdrawn", essential: false, updated: "Just now", updatedBy: "Root Admin" } : item) }) }
export function reinstateItem(id: string) { update({ items: state.items.map((item) => item.id === id ? { ...item, state: "published", updated: "Just now", updatedBy: "Root Admin" } : item) }) }
export function showToEveryone(id: string) { update({ items: state.items.map((item) => item.id === id ? { ...item, visibility: "everyone", updated: "Just now", updatedBy: "Root Admin" } : item) }) }

export function approveSuggestion(id: string) {
	update({ items: state.items.map((item) => item.id === id && item.state === "suggested" ? { ...item, state: "published", effective: "Today", updated: "Just now", updatedBy: "Root Admin", versions: [v(1, item.origin?.kind === "member" ? item.origin.by : "Discovery", "Today", "Approved from a suggestion.", "Root Admin")] } : item) })
}
export function rejectSuggestion(id: string) {
	update({ items: state.items.filter((item) => item.id !== id || item.state !== "suggested") })
}

/* A correction publishes the next version of the procedure so it points at the binding rule. */
export function resolveConflict(id: string, resolution: "correction" | ConflictDismissal) {
	const conflict = state.conflicts.find((item) => item.id === id)
	if (!conflict || conflict.state !== "open") return
	let items = state.items
	if (resolution === "correction") {
		items = items.map((item) => item.id === "k-close" ? {
			...item,
			body: item.body.replace("payments and credits over $10,000 need a Finance Director's sign-off", "payments and credits above the binding approval threshold ($25,000) need a Finance Director's sign-off"),
			version: item.version + 1, effective: "Today", updated: "Just now", updatedBy: "Root Admin",
			versions: [v(item.version + 1, "Root Admin", "Today", "Points at the binding approval rule instead of repeating its amount."), ...item.versions],
		} : item)
	}
	update({ items, conflicts: state.conflicts.map((item) => item.id === id ? { ...item, state: resolution === "correction" ? "resolved" : "dismissed" } : item) })
}
