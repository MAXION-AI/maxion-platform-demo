import { ArrowRight, CaretRight, FileText, Plus, WarningCircle, X } from "@phosphor-icons/react"
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react"

import { Badge, Button, Dialog, EmptyState, PageHeader, PrimaryCell, SearchInput, SegmentedTabs, Table, TableRow } from "@/design/primitives"
import type { AgentixIntent } from "@/features/agentix/prototype/AgentixInitiativesPage"
import { useSheetFocus } from "@/features/platform-prototype/useSheetFocus"
import "@/features/platform-prototype/account-pages.css"
import {
	ACCEPTED_FILES,
	approveSuggestion,
	CONTENT_LIMIT,
	discardDraft,
	DISMISSAL_LABEL,
	ESSENTIAL_SECTIONS,
	ESSENTIALS_BUDGET,
	essentialsUse,
	FILE_LIMIT,
	formatKb,
	itemBytes,
	publishDraft,
	reinstateItem,
	rejectSuggestion,
	resolveConflict,
	reviewCount,
	saveItem,
	SECRET_WARNING,
	SECTION_LABEL,
	SECTION_TAB,
	SECTIONS,
	showToEveryone,
	TITLE_LIMIT,
	useKnowledge,
	withdrawItem,
	type ConflictDismissal,
	type KnowledgeConflict,
	type KnowledgeItem,
	type KnowledgeSection,
	type KnowledgeUse,
	type SaveResult,
} from "./knowledge"
import { AccountTopbar, FreshSignInNote, Select, useFreshSignIn } from "./shared"
import { requestSection, useOrganization } from "./store"
import "./knowledge.css"

type Filter = "all" | KnowledgeSection
type Open = { kind: "item"; id: string } | { kind: "conflict"; id: string } | null
type Editor = { revises?: string } | null

/* Suggestions and conflicts waiting on an Owner or Admin, for the sidebar badge. */
export function useKnowledgeReviewCount() {
	return reviewCount(useKnowledge())
}

const visibilityLabel = (item: KnowledgeItem) => item.visibility === "everyone" ? "Everyone in Northstar" : `Restricted to ${item.visibility.length} ${item.visibility.length === 1 ? "person" : "people"}`
const usedLabel = (item: KnowledgeItem) => item.uses.length ? `Cited in ${item.uses.length} ${item.uses.length === 1 ? "run" : "runs"}` : "Not used yet"
const originLabel = (item: KnowledgeItem) =>
	item.origin?.kind === "member" ? `Suggested by ${item.origin.by}` : item.origin ? `Suggested by ${item.origin.kind === "discovery" ? "Discovery" : "Agentix"} · ${item.origin.work}` : ""
const itemMeta = (item: KnowledgeItem) => [
	SECTION_LABEL[item.section],
	item.kind === "binding" ? "Binding rule" : "",
	item.essential ? "Essential" : "",
	item.project ? `${item.project} project` : "",
	item.visibility === "everyone" ? "" : visibilityLabel(item),
].filter(Boolean).join(" · ")

function StatusCell({ item }: { item: KnowledgeItem }) {
	if (item.state === "draft") return <span className="ds-cell"><Badge>Draft · v{item.version}</Badge></span>
	if (item.state === "withdrawn") return <span className="ds-cell"><Badge tone="outline">Withdrawn</Badge></span>
	return <span className="ds-cell kn-cell-text">Published · v{item.version}</span>
}

export function KnowledgePage({ onCommand, onOpenAgentix, onOpenDiscoveryRecord }: { onCommand?: () => void; onOpenAgentix?: (intent: AgentixIntent) => void; onOpenDiscoveryRecord?: (recordId: string) => void }) {
	const { items, conflicts } = useKnowledge()
	const [filter, setFilter] = useState<Filter>("all")
	const [query, setQuery] = useState("")
	const [open, setOpen] = useState<Open>(null)
	const [editor, setEditor] = useState<Editor>(null)
	const [message, setMessage] = useState("")
	const library = items.filter((item) => item.state !== "suggested")
	const suggestions = items.filter((item) => item.state === "suggested")
	const openConflicts = conflicts.filter((conflict) => conflict.state === "open")
	const waiting = suggestions.length + openConflicts.length
	const q = query.trim().toLowerCase()
	const shown = library.filter((item) => (filter === "all" || item.section === filter) && (!q || `${item.title} ${item.body} ${SECTION_LABEL[item.section]}`.toLowerCase().includes(q)))
	const essentials = essentialsUse(items)
	const published = library.filter((item) => item.state === "published").length
	const counts = useMemo(() => Object.fromEntries(SECTIONS.map((section) => [section, library.filter((item) => item.section === section).length])) as Record<KnowledgeSection, number>, [library])
	const openWork = (use: KnowledgeUse) => {
		if (use.kind === "agentix") onOpenAgentix?.({ type: "engagement", id: use.target })
		else onOpenDiscoveryRecord?.(use.target)
	}
	const announce = (text: string) => setMessage(text)
	return (
		<div className="ds-scope acc-frame kn-root">
			<AccountTopbar title="Knowledge" onCommand={onCommand} />
			<div className="acc-page">
				<PageHeader
					title="Knowledge"
					description="What agents should know about Northstar. Every Discovery and Agentix run starts from the essentials; everything else is looked up when relevant and cited."
					actions={<Button variant="primary" onClick={() => setEditor({})}><Plus aria-hidden="true" />New item</Button>} />
				<p className="org-facts">
					<span><strong>{published}</strong> published</span>
					{waiting ? <span className="is-attention"><strong>{waiting}</strong> waiting on you</span> : null}
					<span>Essentials <strong>{essentials.items} of {ESSENTIALS_BUDGET.items}</strong> items · <strong>{formatKb(essentials.bytes)} of {formatKb(ESSENTIALS_BUDGET.bytes)}</strong> KB</span>
				</p>

				{waiting ? (
					<section className="kn-waiting" aria-labelledby="kn-waiting-title">
						<h2 id="kn-waiting-title">Waiting on you</h2>
						{openConflicts.map((conflict) => (
							<div key={conflict.id} className="kn-waiting-row">
								<span className="kn-waiting-main"><strong>{conflict.title}<Badge tone="warning">Conflict</Badge></strong><small>Reported by {conflict.reportedBy}</small></span>
								<Button size="xs" aria-label={`Review conflict: ${conflict.title}`} onClick={() => setOpen({ kind: "conflict", id: conflict.id })}>Review</Button>
							</div>
						))}
						{suggestions.map((item) => (
							<div key={item.id} className="kn-waiting-row">
								<span className="kn-waiting-main"><strong>{item.title}<Badge>Suggestion</Badge></strong><small>{SECTION_LABEL[item.section]} · {originLabel(item)}</small></span>
								<Button size="xs" aria-label={`Review suggestion: ${item.title}`} onClick={() => setOpen({ kind: "item", id: item.id })}>Review</Button>
							</div>
						))}
					</section>
				) : null}

				<SearchInput className="kn-search" label="Search knowledge" placeholder="Search knowledge" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} />
				<SegmentedTabs<Filter>
					className="kn-filter"
					label="Section"
					value={filter}
					onChange={setFilter}
					options={[{ value: "all", label: "All", count: library.length }, ...SECTIONS.map((section) => ({ value: section as Filter, label: SECTION_TAB[section], count: counts[section] }))]} />

				{shown.length ? (
					<Table className="kn-table" columns={["Name", "Status", "Used in", "Updated", ""]} template="minmax(0, 1fr) minmax(0, 9rem) minmax(0, 8rem) minmax(0, 9rem) var(--ds-icon)" aria-label="Knowledge library">
						{shown.map((item) => (
							<TableRow key={item.id} aria-label={`${item.title} · ${item.state === "published" ? `Published v${item.version}` : item.state === "draft" ? "Draft" : "Withdrawn"}`} onClick={() => setOpen({ kind: "item", id: item.id })}>
								<PrimaryCell title={item.title} meta={itemMeta(item)} />
								<StatusCell item={item} />
								<span className="ds-cell kn-cell-text">{usedLabel(item)}</span>
								<span className="ds-cell kn-cell-text">{item.updated} · {item.updatedBy}</span>
								<span className="ds-cell ds-cell-end"><CaretRight aria-hidden="true" /></span>
							</TableRow>
						))}
					</Table>
				) : (
					<EmptyState
						icon={<FileText aria-hidden="true" />}
						title={q ? `Nothing in ${filter === "all" ? "knowledge" : SECTION_LABEL[filter]} matches “${query.trim()}”` : `No ${SECTION_LABEL[filter as KnowledgeSection]?.toLowerCase() ?? "items"} yet`}
						action={q || filter !== "all" ? <Button onClick={() => { setQuery(""); setFilter("all") }}>Show all knowledge</Button> : <Button variant="primary" onClick={() => setEditor({})}>New item</Button>}>
						<p>{q ? "Try a word from the item's text, or another section." : "Add what agents should know, or wait for a suggestion from your team."}</p>
					</EmptyState>
				)}
				<div className="org-live" aria-live="polite">{message}</div>
			</div>

			{open?.kind === "item" ? <ItemSheet id={open.id} onClose={() => setOpen(null)} onOpenWork={openWork} onEdit={(revises) => { setOpen(null); setEditor({ revises }) }} onAnnounce={announce} /> : null}
			{open?.kind === "conflict" ? <ConflictSheet id={open.id} onClose={() => setOpen(null)} onOpenItem={(id) => setOpen({ kind: "item", id })} onAnnounce={announce} /> : null}
			<ItemEditor editor={editor} onClose={() => setEditor(null)} onSaved={(text) => { announce(text); setEditor(null) }} />
		</div>
	)
}

// ── The item sheet ──────────────────────────────────────────────────────────────────────────

function Sheet({ label, kicker, title, onClose, children }: { label: string; kicker: string; title: string; onClose: () => void; children: ReactNode }) {
	const ref = useRef<HTMLElement>(null)
	useSheetFocus(true, onClose, ref)
	return (
		<>
			<button type="button" className="acc-scrim" aria-label={`Close ${label}`} onClick={onClose} />
			<aside ref={ref} className="acc-panel org-sheet kn-sheet" aria-label={label}>
				<header><div><small>{kicker}</small><h2>{title}</h2></div><Button size="sm" icon variant="ghost" aria-label={`Close ${label}`} onClick={onClose}><X aria-hidden="true" /></Button></header>
				<div className="org-sheet-body">{children}</div>
			</aside>
		</>
	)
}

function ItemSheet({ id, onClose, onOpenWork, onEdit, onAnnounce }: { id: string; onClose: () => void; onOpenWork: (use: KnowledgeUse) => void; onEdit: (revises: string) => void; onAnnounce: (text: string) => void }) {
	const { items } = useKnowledge()
	const { fresh } = useFreshSignIn()
	const [confirm, setConfirm] = useState<"withdraw" | "reject" | null>(null)
	const [error, setError] = useState("")
	const item = items.find((entry) => entry.id === id)
	useEffect(() => { if (!item) onClose() }, [item, onClose])
	if (!item) return null
	const needsFresh = item.state === "suggested" || item.state === "withdrawn" || item.state === "draft" || item.visibility !== "everyone"
	const finish = (text: string) => { onAnnounce(text); onClose() }
	const publish = () => {
		const result = publishDraft(item.id)
		if (result.ok && result.state === "published") finish(`${item.title} published.`)
		else setError(saveError(result))
	}
	return (
		<Sheet label={`${item.title} details`} kicker={SECTION_LABEL[item.section]} title={item.title} onClose={onClose}>
			{item.state === "suggested" ? (
				<section className="org-sheet-section">
					<h3>{originLabel(item)}</h3>
					<p>{item.origin?.kind === "member" ? `${item.origin.by} drafted this and submitted it for review ${item.origin.date.toLowerCase()}.` : item.origin ? `Cited source: ${item.origin.source}.` : null} It stays a suggestion until an Owner or Admin publishes it.</p>
				</section>
			) : null}

			<section className="org-sheet-section">
				<h3>{item.section === "glossary" ? "Meaning" : "Content"}</h3>
				<div className="kn-body">{item.body.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
				{item.files?.length ? <ul className="kn-files">{item.files.map((file) => <li key={file.name}><FileText aria-hidden="true" /><span><strong>{file.name}</strong><small>{file.detail}</small></span></li>)}</ul> : null}
			</section>

			<section className="org-sheet-section">
				<h3>How agents use it</h3>
				<dl className="org-terms">
					<div><dt>Kind</dt><dd>{item.kind === "binding" ? (
						item.control
							? <>Binding rule, enforced by the platform control <button type="button" className="kn-link" onClick={() => { requestSection({ section: "settings", tab: "policy" }); onClose() }}>{item.control}<ArrowRight aria-hidden="true" /></button></>
							: "Binding rule. It publishes as enforced once its platform control exists; until then it's a draft."
					) : "Guidance. Agents read it; it never grants a permission or approves anything."}</dd></div>
					<div><dt>Essentials</dt><dd>{item.essential ? "In every run's starting context" : "Looked up when relevant, and cited"}</dd></div>
					<div><dt>Visibility</dt><dd>{item.visibility === "everyone" ? "Everyone in Northstar" : <>Only {item.visibility.join(", ")}. An agent uses it only for someone who may see it.</>}</dd></div>
					<div><dt>Scope</dt><dd>{item.project ? `${item.project} project. Adds to the organization's items; it can't override a binding rule.` : "Organization. Every project inherits it."}</dd></div>
					<div><dt>Effective</dt><dd>{item.effective} · version {item.version}{item.state === "draft" && item.revises ? " (draft of the next version)" : ""}</dd></div>
				</dl>
			</section>

			{item.state !== "suggested" ? (
				<section className="org-sheet-section">
					<h3>Where it was used</h3>
					{item.uses.length ? (
						<>
							<div className="org-rows">
								{item.uses.map((use) => (
									<div key={use.id} className="org-row">
										<div className="org-row-main"><strong>{use.work}</strong><small>{use.kind === "agentix" ? "Agentix" : "Discovery"} · pinned v{use.version} · {use.detail}</small></div>
										<div className="org-row-aside"><Button size="xs" aria-label={`Open ${use.work}`} onClick={() => { onOpenWork(use); onClose() }}>Open</Button></div>
									</div>
								))}
							</div>
							<p className="kn-hint">Each run pins the version it used. A new version applies to new work only.</p>
						</>
					) : <p>No run has cited it yet.</p>}
				</section>
			) : null}

			{item.versions.length ? (
				<section className="org-sheet-section">
					<h3>Version history</h3>
					<ol className="kn-versions">
						{item.versions.map((version) => <li key={version.version}><strong>v{version.version}</strong><span>{version.note}<small>{version.author}{version.approver ? ` · approved by ${version.approver}` : ""} · {version.date}</small></span></li>)}
					</ol>
				</section>
			) : null}

			<section className="org-sheet-section kn-actions" aria-label="Actions">
				{needsFresh ? <FreshSignInNote /> : null}
				{error ? <p className="kn-error" role="alert"><WarningCircle aria-hidden="true" />{error}</p> : null}
				{item.state === "suggested" ? (
					confirm === "reject" ? <RejectForm onCancel={() => setConfirm(null)} onReject={() => { rejectSuggestion(item.id); finish(`Suggestion rejected: ${item.title}.`) }} disabled={!fresh} />
						: <div className="org-sheet-actions"><Button variant="primary" disabled={!fresh} onClick={() => { approveSuggestion(item.id); finish(`${item.title} published.`) }}>Approve and publish</Button><Button disabled={!fresh} onClick={() => setConfirm("reject")}>Reject</Button></div>
				) : item.state === "draft" ? (
					<div className="org-sheet-actions">
						{item.kind === "binding" && !item.control ? <p className="kn-hint">It publishes as enforced once MAXION configures its platform control; until then it stays a draft.</p> : <Button variant="primary" disabled={!fresh} onClick={publish}>Publish</Button>}
						<Button onClick={() => onEdit(item.id)}>Edit</Button>
						<Button className="acc-danger" onClick={() => { discardDraft(item.id); finish(`Draft discarded: ${item.title}.`) }}>Discard draft</Button>
					</div>
				) : item.state === "withdrawn" ? (
					<div className="org-sheet-actions"><Button variant="primary" disabled={!fresh} onClick={() => { reinstateItem(item.id); finish(`${item.title} reinstated.`) }}>Reinstate</Button></div>
				) : confirm === "withdraw" ? (
					<div className="acc-confirm kn-confirm" role="group" aria-label={`Confirm withdrawing ${item.title}`}>
						<small>New work stops using it. Work already started keeps its pinned version.</small>
						<Button size="sm" onClick={() => setConfirm(null)}>Keep it</Button>
						<Button size="sm" className="acc-danger" onClick={() => { withdrawItem(item.id); finish(`${item.title} withdrawn.`) }}>Withdraw</Button>
					</div>
				) : (
					<div className="org-sheet-actions">
						<Button onClick={() => onEdit(item.id)}>Edit</Button>
						{item.visibility !== "everyone" ? <Button disabled={!fresh} onClick={() => { showToEveryone(item.id); onAnnounce(`${item.title} is now visible to everyone in Northstar.`) }}>Show to everyone</Button> : null}
						<Button className="acc-danger" onClick={() => setConfirm("withdraw")}>Withdraw</Button>
					</div>
				)}
			</section>
		</Sheet>
	)
}

function RejectForm({ onCancel, onReject, disabled }: { onCancel: () => void; onReject: () => void; disabled: boolean }) {
	const id = useId()
	const [reason, setReason] = useState("")
	return (
		<div className="kn-reject">
			<div className="ds-field">
				<label htmlFor={id}>Reason <span className="kn-optional">(optional)</span></label>
				<textarea id={id} className="ds-textarea" rows={2} maxLength={2048} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Shown to the person who suggested it" />
			</div>
			<div className="org-sheet-actions"><Button onClick={onCancel}>Cancel</Button><Button variant="primary" disabled={disabled} onClick={onReject}>Reject suggestion</Button></div>
		</div>
	)
}

function ConflictSheet({ id, onClose, onOpenItem, onAnnounce }: { id: string; onClose: () => void; onOpenItem: (id: string) => void; onAnnounce: (text: string) => void }) {
	const { items, conflicts } = useKnowledge()
	const { fresh } = useFreshSignIn()
	const [dismissal, setDismissal] = useState<ConflictDismissal>("not_a_conflict")
	const conflict = conflicts.find((entry) => entry.id === id) as KnowledgeConflict | undefined
	if (!conflict) return null
	const cited = conflict.items.map((itemId) => items.find((item) => item.id === itemId)).filter((item): item is KnowledgeItem => Boolean(item))
	const done = (text: string) => { onAnnounce(text); onClose() }
	return (
		<Sheet label={`Conflict: ${conflict.title}`} kicker="Conflict" title={conflict.title} onClose={onClose}>
			<section className="org-sheet-section">
				<h3>Reported by {conflict.reportedBy}</h3>
				<p>{conflict.detail}</p>
			</section>
			<section className="org-sheet-section">
				<h3>The items it cites</h3>
				<div className="org-rows">
					{cited.map((item) => (
						<div key={item.id} className="org-row">
							<div className="org-row-main"><strong>{item.title}</strong><small>{SECTION_LABEL[item.section]} · v{item.version}{item.kind === "binding" ? " · binding rule" : ""}</small></div>
							<div className="org-row-aside"><Button size="xs" aria-label={`Open ${item.title}`} onClick={() => onOpenItem(item.id)}>Open</Button></div>
						</div>
					))}
				</div>
				<p className="kn-hint">Nothing changes on its own: a conflict is settled by a person.</p>
			</section>
			{conflict.state === "open" ? (
				<section className="org-sheet-section kn-actions" aria-label="Resolve">
					<FreshSignInNote />
					<div className="org-sheet-actions"><Button variant="primary" disabled={!fresh} onClick={() => { resolveConflict(conflict.id, "correction"); done("Correction published: Month-end close now points at the binding approval rule.") }}>Publish a correction to Month-end close</Button></div>
					<div className="kn-dismiss">
						<Select aria-label="Reason to dismiss" value={dismissal} onChange={(event) => setDismissal(event.target.value as ConflictDismissal)}>
							{(Object.keys(DISMISSAL_LABEL) as ConflictDismissal[]).map((reason) => <option key={reason} value={reason}>{DISMISSAL_LABEL[reason]}</option>)}
						</Select>
						<Button disabled={!fresh} onClick={() => { resolveConflict(conflict.id, dismissal); done(`Conflict dismissed: ${DISMISSAL_LABEL[dismissal].toLowerCase()}.`) }}>Dismiss</Button>
					</div>
				</section>
			) : <p className="kn-hint">{conflict.state === "resolved" ? "Resolved with a correction." : "Dismissed."}</p>}
		</Sheet>
	)
}

// ── New item and edit ───────────────────────────────────────────────────────────────────────

const saveError = (result: SaveResult) => {
	if (result.ok) return ""
	if (result.error === "secret") return "This looks like a secret or credential, so it wasn't saved. Remove it and try again."
	if (result.error === "title") return `Give it a title of up to ${TITLE_LIMIT} characters.`
	if (result.error !== "essentials") return "Add the content, up to 64 KiB."
	return `That would take the essentials to ${result.projected.items} items and ${formatKb(result.projected.bytes)} KB, over the organization's ${ESSENTIALS_BUDGET.items} items and ${formatKb(ESSENTIALS_BUDGET.bytes)} KB. Your draft was saved without essentials.`
}

type FileState = { state: "idle" } | { state: "checking"; name: string } | { state: "ready"; name: string; detail: string } | { state: "refused"; reason: string }
const fileDetail = (file: File) => `${file.name.split(".").pop()?.toUpperCase()} · ${file.size >= 1_000_000 ? `${(file.size / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1000))} KB`}`

function ItemEditor({ editor, onClose, onSaved }: { editor: Editor; onClose: () => void; onSaved: (text: string) => void }) {
	const { items } = useKnowledge()
	const { members } = useOrganization()
	const { fresh } = useFreshSignIn()
	const ids = { section: useId(), title: useId(), body: useId(), warn: useId() }
	const original = editor?.revises ? items.find((item) => item.id === editor.revises) : undefined
	const [section, setSection] = useState<KnowledgeSection>("profile")
	const [title, setTitle] = useState("")
	const [body, setBody] = useState("")
	const [kind, setKind] = useState<"guidance" | "binding">("guidance")
	const [essential, setEssential] = useState(false)
	const [restricted, setRestricted] = useState<string[] | null>(null)
	const [file, setFile] = useState<FileState>({ state: "idle" })
	const [error, setError] = useState("")
	const [kept, setKept] = useState(false)
	const fileTimer = useRef<number | null>(null)
	useEffect(() => {
		if (!editor) return
		setSection(original?.section ?? "profile")
		setTitle(original?.title ?? "")
		setBody(original?.body ?? "")
		setKind(original?.kind ?? "guidance")
		setEssential(original?.essential ?? false)
		setRestricted(original && original.visibility !== "everyone" ? original.visibility : null)
		setFile({ state: "idle" })
		setError("")
		setKept(false)
		// Editing reads the item once when the editor opens; later store changes don't reset the form.
	}, [editor])
	useEffect(() => () => { if (fileTimer.current) window.clearTimeout(fileTimer.current) }, [])
	const glossary = section === "glossary"
	const binding = section === "rules" && kind === "binding" && !original?.control
	const canEssential = ESSENTIAL_SECTIONS.includes(section)
	const essentials = essentialsUse(items)
	const bytes = new TextEncoder().encode(body).length
	const ready = title.trim().length > 0 && body.trim().length > 0 && file.state !== "checking"
	const draft = () => ({ section, title, body, kind: section === "rules" ? kind : "guidance" as const, essential: canEssential && essential, visibility: restricted ?? "everyone" as const, file: file.state === "ready" ? { name: file.name, detail: file.detail } : undefined })
	const save = (mode: "publish" | "draft") => {
		const result = saveItem(draft(), mode, original?.id)
		if (result.ok) { onSaved(result.state === "published" ? `${title.trim()} published.` : `Draft saved: ${title.trim()}.`); return }
		setError(saveError(result))
		if (result.error === "essentials") setKept(true)
	}
	const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
		const picked = event.target.files?.[0]
		if (!picked) return
		const extension = `.${picked.name.split(".").pop()?.toLowerCase()}`
		if (!ACCEPTED_FILES.includes(extension)) { setFile({ state: "refused", reason: `${extension.toUpperCase().slice(1)} files aren't accepted. Use PNG, JPEG, GIF or WebP images, or PDF, DOCX or XLSX documents; SVG and font files can't be added.` }); return }
		if (picked.size > FILE_LIMIT) { setFile({ state: "refused", reason: "Files can be up to 25 MiB." }); return }
		setFile({ state: "checking", name: picked.name })
		fileTimer.current = window.setTimeout(() => setFile({ state: "ready", name: picked.name, detail: fileDetail(picked) }), 900)
	}
	const toggleMember = (name: string) => setRestricted((current) => current?.includes(name) ? current.filter((entry) => entry !== name) : [...(current ?? []), name])
	return (
		<Dialog
			open={editor !== null}
			size="lg"
			className="kn-editor"
			title={original ? `Edit ${original.title}` : "New item"}
			description={original ? `Saving makes version ${original.version + 1}. Work already started keeps version ${original.version}.` : "What agents should know. Owners and Admins publish; anything else stays a draft."}
			onClose={onClose}
			footer={kept ? <Button variant="primary" onClick={onClose}>Done</Button> : (
				<>
					<Button onClick={onClose}>Cancel</Button>
					<span className="kn-editor-actions">
						<Button disabled={!ready} onClick={() => save("draft")}>Save draft</Button>
						{binding ? null : <Button variant="primary" disabled={!ready || !fresh} onClick={() => save("publish")}>Publish</Button>}
					</span>
				</>
			)}>
			<div className="ds-field">
				<label htmlFor={ids.section}>Section</label>
				<Select id={ids.section} className="is-field" value={section} disabled={Boolean(original)} onChange={(event) => setSection(event.target.value as KnowledgeSection)}>
					{SECTIONS.map((entry) => <option key={entry} value={entry}>{SECTION_LABEL[entry]}</option>)}
				</Select>
			</div>
			<div className="ds-field">
				<label htmlFor={ids.title}>{glossary ? "Term" : "Title"}</label>
				<input id={ids.title} className="ds-input" maxLength={TITLE_LIMIT} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={glossary ? "For example: Billing block" : "For example: Payment approvals over $25,000"} />
			</div>
			<div className="ds-field">
				<label htmlFor={ids.body}>{glossary ? "Meaning" : "Content"}</label>
				<small id={ids.warn}>{SECRET_WARNING}</small>
				<textarea id={ids.body} className="ds-textarea" rows={6} aria-describedby={ids.warn} value={body} onChange={(event) => setBody(event.target.value)} placeholder={glossary ? "What the term means at Northstar" : "Plain text. Agents cite it where they use it."} />
				{bytes > CONTENT_LIMIT * 0.8 ? <small>{bytes.toLocaleString("en-US")} of {CONTENT_LIMIT.toLocaleString("en-US")} bytes</small> : null}
			</div>

			{section === "rules" && !original?.control ? (
				<fieldset className="kn-group">
					<legend>How agents treat it</legend>
					<div className="org-choices">
						<label className="org-choice"><input type="radio" name="kn-kind" checked={kind === "guidance"} onChange={() => setKind("guidance")} /><span><strong>Guidance</strong><small>Agents follow it and cite it. It doesn't enforce anything on its own.</small></span></label>
						<label className="org-choice"><input type="radio" name="kn-kind" checked={kind === "binding"} onChange={() => setKind("binding")} /><span><strong>Binding rule</strong><small>Must never be broken, so a platform control enforces it. It saves as a draft until MAXION configures that control.</small></span></label>
					</div>
				</fieldset>
			) : null}

			{canEssential ? (
				<fieldset className="kn-group">
					<legend>Essentials</legend>
					<label className="org-choice"><input type="checkbox" checked={essential} onChange={(event) => setEssential(event.target.checked)} /><span><strong>Include in every run</strong><small>{essentials.items} of {ESSENTIALS_BUDGET.items} items and {formatKb(essentials.bytes)} of {formatKb(ESSENTIALS_BUDGET.bytes)} KB used.{title.trim() || body.trim() ? ` This item is ${formatKb(itemBytes({ title, body }))} KB.` : ""}</small></span></label>
				</fieldset>
			) : null}

			{section === "brand" ? (
				<fieldset className="kn-group">
					<legend>File</legend>
					<label className="kn-file">
						<input type="file" accept={ACCEPTED_FILES.join(",")} onChange={pickFile} aria-describedby="kn-file-rules" />
						<span id="kn-file-rules">Logos as PNG, JPEG, GIF or WebP; templates as PDF, DOCX or XLSX. Up to 25 MiB. No SVG or font files.</span>
					</label>
					{file.state === "checking" ? <p className="kn-file-state" role="status">Checking {file.name}…</p> : null}
					{file.state === "ready" ? <p className="kn-file-state" role="status">Ready · {file.name} · {file.detail}</p> : null}
					{file.state === "refused" ? <p className="kn-error" role="alert"><WarningCircle aria-hidden="true" />{file.reason}</p> : null}
				</fieldset>
			) : null}

			<fieldset className="kn-group">
				<legend>Who can see it</legend>
				<div className="org-choices">
					<label className="org-choice"><input type="radio" name="kn-visibility" checked={restricted === null} onChange={() => setRestricted(null)} /><span><strong>Everyone in Northstar</strong></span></label>
					<label className="org-choice"><input type="radio" name="kn-visibility" checked={restricted !== null} onChange={() => setRestricted(restricted ?? [])} /><span><strong>Only named people</strong><small>An agent uses it only for someone on this list.</small></span></label>
				</div>
				{restricted !== null ? (
					<div className="kn-people" role="group" aria-label="People who can see it">
						{members.filter((member) => member.status === "active").map((member) => <label key={member.id} className="org-choice"><input type="checkbox" checked={restricted.includes(member.name)} onChange={() => toggleMember(member.name)} /><span><strong>{member.name}</strong></span></label>)}
					</div>
				) : null}
			</fieldset>

			{binding ? <p className="kn-hint">A binding rule saves as a draft until its platform control exists.</p> : <FreshSignInNote />}
			{error ? <p className="kn-error" role="alert"><WarningCircle aria-hidden="true" />{error}</p> : null}
		</Dialog>
	)
}
