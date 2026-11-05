import { useEffect, useId, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react"
import { CheckCircle, Globe, UploadSimple, Warning } from "@phosphor-icons/react"

import { Badge, Banner, Button, Dialog, Mark, TextButton } from "@/design/primitives"

import { DELIVERABLES, type DeliverableBody, type HandoffDestination } from "./model"
import { structuredRowCount, type StructuredTable } from "./deliverables"
import {
	DEFAULT_OUTPUTS,
	advanceUpload,
	compareRevisions,
	formatBytes,
	newEvidenceFile,
	type BoundDocument,
	type DocumentRevision,
	type EvidenceFile,
	type InterviewBrief,
	type PackageReview,
	type ResearchRecord,
	type RevisionResult,
} from "./workState"
import "./gates.css"

/*
 * The controls behind the plan's gates: uploads, brief review, package approval, document versions
 * and the notices a held run shows. They hold no record state of their own: the page owns the work,
 * and each control reports what the person decided.
 */

const formatMoment = (at: string) => {
	const date = new Date(at)
	return Number.isFinite(date.getTime()) ? date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "just now"
}

/* ── Uploads ────────────────────────────────────────────────────────────────────────────── */

const UPLOAD_STEP_MS = 700
type SetFiles = (update: (files: EvidenceFile[]) => EvidenceFile[]) => void

/* Each file moves through its own states; under reduced motion it lands at once, on no timer. */
export function useUploads(setFiles: SetFiles, reduced: boolean, onSettled?: (name: string, ready: boolean) => void) {
	const sequence = useRef(0)
	return (list: FileList | readonly File[]) => {
		const incoming = Array.from(list)
		if (!incoming.length) return
		const at = new Date().toISOString()
		const ids = incoming.map(() => `file-${Date.now().toString(36)}-${++sequence.current}`)
		setFiles(files => {
			let next = files
			incoming.forEach((file, index) => {
				const entry = newEvidenceFile(next, file.name, file.size, at, ids[index])
				next = [...next, reduced && entry.state === "uploading" ? advanceUpload(advanceUpload(entry)) : entry]
			})
			return next
		})
		incoming.forEach((file, index) => {
			if (reduced) { onSettled?.(file.name, true); return }
			const id = ids[index]
			const step = () => setFiles(files => files.map(entry => entry.id === id ? advanceUpload(entry) : entry))
			window.setTimeout(step, UPLOAD_STEP_MS)
			window.setTimeout(() => { step(); onSettled?.(file.name, true) }, UPLOAD_STEP_MS * 2)
		})
	}
}

const UPLOAD_STATE: Record<EvidenceFile["state"], { label: string; tone: "neutral" | "positive" | "warning" }> = {
	uploading: { label: "Uploading", tone: "neutral" },
	processing: { label: "Processing", tone: "neutral" },
	ready: { label: "Ready", tone: "positive" },
	refused: { label: "Refused", tone: "warning" },
}

export function EvidenceFileRow({ file, onRemove }: { file: EvidenceFile; onRemove?: (id: string) => void }) {
	const state = UPLOAD_STATE[file.state]
	const refs = file.sections.length > 2 ? `${file.sections[0]} to ${file.sections.at(-1)}` : file.sections.join(", ")
	return (
		<li className="source-row" data-file-state={file.state}>
			<Mark tone="neutral" seed={file.name} size="sm" />
			<div>
				<strong>{file.name}</strong>
				<span>{file.state === "refused" ? file.reason : file.state === "ready" ? `Uploaded · version ${file.version} · ${refs}` : `${formatBytes(file.size)} · ${state.label.toLowerCase()}`}</span>
				{file.state === "ready" ? <small>{formatBytes(file.size)} · added by {file.addedBy}, {formatMoment(file.addedAt)}</small> : null}
			</div>
			<span className="ev-file-end">
				<Badge tone={state.tone} dot={file.state === "uploading" || file.state === "processing"}>{state.label}</Badge>
				{onRemove && file.state === "refused" ? <TextButton onClick={() => onRemove(file.id)}>Remove<span className="visually-hidden"> {file.name}</span></TextButton> : null}
			</span>
		</li>
	)
}

/* A real file control: the picker and drag and drop reach the same place. Nothing is sent anywhere. */
export function EvidenceUpload({ files, onAdd, onRemove, heading = "Add documents" }: { files: readonly EvidenceFile[]; onAdd: (list: FileList | readonly File[]) => void; onRemove?: (id: string) => void; heading?: string }) {
	const input = useRef<HTMLInputElement>(null)
	const [over, setOver] = useState(false)
	const hintId = useId()
	const onDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault()
		setOver(false)
		if (event.dataTransfer.files.length) onAdd(event.dataTransfer.files)
	}
	return (
		<section className="ev-upload" aria-label={heading}>
			<div
				className={`ev-drop${over ? " is-over" : ""}`}
				data-testid="evidence-drop"
				onDragEnter={event => { event.preventDefault(); setOver(true) }}
				onDragOver={event => { event.preventDefault(); setOver(true) }}
				onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false) }}
				onDrop={onDrop}>
				<div className="ev-drop-text">
					<strong>{heading}</strong>
					<span id={hintId}>Drag files here, or choose them. PDF, Word, Excel, PowerPoint, CSV, text or Markdown, up to 25 MB each. This demo reads each file’s name and size; the content stays on your device.</span>
				</div>
				<Button size="sm" aria-describedby={hintId} onClick={() => input.current?.click()}><UploadSimple size={14} />Choose files</Button>
				<input
					ref={input}
					type="file"
					multiple
					tabIndex={-1}
					aria-label="Upload documents"
					className="visually-hidden"
					onChange={event => { if (event.target.files?.length) onAdd(event.target.files); event.target.value = "" }} />
			</div>
			{files.length ? <ul className="sheet-list ev-files" aria-label="Uploaded documents">{files.map(file => <EvidenceFileRow key={file.id} file={file} onRemove={onRemove} />)}</ul> : null}
		</section>
	)
}

/* ── Public web evidence ────────────────────────────────────────────────────────────────── */

/* The one way a public source appears, wherever evidence appears: labelled, with its URL and time. */
export function PublicWebRow({ source }: { source: ResearchRecord["sources"][number] }) {
	return (
		<li className="source-row" data-evidence="public-web">
			<span className="ev-web-mark" aria-hidden="true"><Globe size={16} /></span>
			<div>
				<strong>{source.title}</strong>
				<span><a href={source.url} target="_blank" rel="noreferrer">{source.url}</a></span>
				<small>Retrieved {formatMoment(source.retrievedAt)} · {source.finding}</small>
			</div>
			<Badge>Public web</Badge>
		</li>
	)
}

/* ── Output selection ───────────────────────────────────────────────────────────────────── */

/* 05:68: outputs are chosen by mission; what isn't selected stays visible and selectable later. */
export function OutputPicker({ selected, onChange }: { selected: readonly string[]; onChange: (next: string[]) => void }) {
	const titleId = useId()
	const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter(item => item !== name) : [...selected, name])
	return (
		<section className="org-picker ev-outputs" aria-labelledby={titleId}>
			<div className="org-picker-head">
				<h2 id={titleId}>Outputs for this mission</h2>
				<p>{selected.length} of {DELIVERABLES.length} selected. The rest stay in the manifest, so you can add one later.</p>
			</div>
			<div className="org-choices">
				{DELIVERABLES.map(item => {
					const on = selected.includes(item.name)
					return (
						<label key={item.name} className="org-choice">
							<input type="checkbox" checked={on} disabled={on && selected.length === 1} onChange={() => toggle(item.name)} />
							<span>
								<strong>{item.name}{DEFAULT_OUTPUTS.includes(item.name) ? <Badge>Recommended</Badge> : null}</strong>
								<small>{item.audience} · {item.rationale}</small>
							</span>
						</label>
					)
				})}
			</div>
		</section>
	)
}

/* ── Interview briefs ───────────────────────────────────────────────────────────────────── */

type BriefDraft = { learn: string; questions: string; probes: string; minutes: string; evidence: string[] }
const toDraft = (brief: InterviewBrief): BriefDraft => ({ learn: brief.learn, questions: brief.questions.join("\n"), probes: brief.probes.join("\n"), minutes: String(brief.minutes), evidence: brief.evidence })
const lines = (text: string) => text.split("\n").map(line => line.trim()).filter(Boolean)

function BriefCard({ brief, focused, frozen, onApprove, onAdjust }: {
	brief: InterviewBrief
	focused: boolean
	frozen: boolean
	onApprove: (personId: string) => void
	onAdjust: (personId: string, patch: Partial<Pick<InterviewBrief, "learn" | "questions" | "probes" | "minutes" | "evidence">>) => void
}) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(() => toDraft(brief))
	const row = useRef<HTMLLIElement>(null)
	const adjustRef = useRef<HTMLButtonElement>(null)
	const firstField = useRef<HTMLTextAreaElement>(null)
	const backToAdjust = useRef(false)
	const baseId = useId()
	useEffect(() => { if (focused) row.current?.scrollIntoView?.({ block: "nearest" }) }, [focused])
	useEffect(() => {
		if (editing) { firstField.current?.focus(); return }
		if (backToAdjust.current) { backToAdjust.current = false; adjustRef.current?.focus() }
	}, [editing])
	const finish = () => { backToAdjust.current = true; setEditing(false) }
	const save = () => {
		const minutes = Number(draft.minutes)
		onAdjust(brief.personId, { learn: draft.learn.trim(), questions: lines(draft.questions), probes: lines(draft.probes), minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : brief.minutes, evidence: draft.evidence })
		finish()
	}
	const canSave = draft.learn.trim().length > 0 && lines(draft.questions).length > 0 && draft.evidence.length > 0
	const approved = brief.status === "approved"
	return (
		<li ref={row} className="brief-card" data-brief-person={brief.personId} data-brief-status={brief.status}>
			<div className="brief-card-head">
				<div>
					<strong>{brief.personName}</strong>
					<span>{brief.role} · brief v{brief.version}</span>
				</div>
				<Badge tone={approved ? "positive" : "warning"}>{approved ? `Approved v${brief.version}` : "Needs your approval"}</Badge>
			</div>
			{editing ? (
				<form className="brief-form" onSubmit={event => { event.preventDefault(); if (canSave) save() }}>
					<div className="ds-field"><label htmlFor={`${baseId}-learn`}>What to learn</label><textarea id={`${baseId}-learn`} ref={firstField} className="ds-textarea" rows={2} value={draft.learn} onChange={event => setDraft({ ...draft, learn: event.target.value })} /></div>
					<div className="ds-field"><label htmlFor={`${baseId}-questions`}>Questions, one per line</label><textarea id={`${baseId}-questions`} className="ds-textarea" rows={3} value={draft.questions} onChange={event => setDraft({ ...draft, questions: event.target.value })} /></div>
					<div className="ds-field"><label htmlFor={`${baseId}-probes`}>Gaps and contradictions to probe, one per line</label><textarea id={`${baseId}-probes`} className="ds-textarea" rows={3} value={draft.probes} onChange={event => setDraft({ ...draft, probes: event.target.value })} /></div>
					<div className="ds-field"><label htmlFor={`${baseId}-minutes`}>Time budget in minutes</label><input id={`${baseId}-minutes`} className="ds-input" inputMode="numeric" value={draft.minutes} onChange={event => setDraft({ ...draft, minutes: event.target.value })} /></div>
					<fieldset className="brief-evidence">
						<legend>Evidence the interviewer may hold</legend>
						<p>This participant’s grant sets the limit. You can narrow it here, never widen it.</p>
						{brief.grant.map(name => (
							<label key={name}><input type="checkbox" checked={draft.evidence.includes(name)} onChange={() => setDraft({ ...draft, evidence: draft.evidence.includes(name) ? draft.evidence.filter(item => item !== name) : [...draft.evidence, name] })} /><span>{name}</span></label>
						))}
					</fieldset>
					<div className="brief-actions">
						<Button size="sm" onClick={finish}>Cancel</Button>
						<Button size="sm" variant="primary" type="submit" disabled={!canSave}>Save as brief v{brief.version + 1}</Button>
					</div>
				</form>
			) : (
				<>
					<dl className="brief-facts">
						<div><dt>What to learn</dt><dd>{brief.learn}</dd></div>
						<div><dt>Questions</dt><dd><ol>{brief.questions.map(question => <li key={question}>{question}</li>)}</ol></dd></div>
						<div><dt>Gaps and contradictions to probe</dt><dd><ul>{brief.probes.map(probe => <li key={probe}>{probe}</li>)}</ul></dd></div>
						<div><dt>Time budget</dt><dd>{brief.minutes} minutes</dd></div>
						<div><dt>Evidence the grant allows</dt><dd>{brief.evidence.join(", ")}. Other participants’ answers stay out.</dd></div>
					</dl>
					{frozen ? <p className="brief-note">This interview has opened with brief v{brief.version}{brief.approvedBy ? `, approved by ${brief.approvedBy}` : ""}.</p> : (
						<div className="brief-actions">
							<Button ref={adjustRef} size="sm" aria-label={`Adjust the brief for ${brief.personName}`} onClick={() => { setDraft(toDraft(brief)); setEditing(true) }}>Adjust</Button>
							{approved ? null : <Button size="sm" aria-label={`Approve the brief for ${brief.personName}`} onClick={() => onApprove(brief.personId)}>Approve</Button>}
						</div>
					)}
				</>
			)}
		</li>
	)
}

export function BriefSheet({ briefs, focus, frozen, onApprove, onAdjust }: {
	briefs: readonly InterviewBrief[]
	focus: string | null
	frozen: boolean
	onApprove: (personId: string) => void
	onAdjust: (personId: string, patch: Partial<Pick<InterviewBrief, "learn" | "questions" | "probes" | "minutes" | "evidence">>) => void
}) {
	const waiting = briefs.filter(brief => brief.status === "draft").length
	return (
		<div className="brief-sheet">
			<p className="sheet-status is-adjusted"><Warning size={14} weight="fill" aria-hidden="true" />Everything the interviewer holds counts as shown to the participant.</p>
			<p className="brief-lede" aria-live="polite">{waiting ? `${waiting} of ${briefs.length} briefs wait for you. An interview opens only once its brief is approved.` : `All ${briefs.length} briefs are approved.`}</p>
			{briefs.length ? <ul className="brief-list">{briefs.map(brief => <BriefCard key={brief.personId} brief={brief} focused={focus === brief.personId} frozen={frozen && brief.status === "approved"} onApprove={onApprove} onAdjust={onAdjust} />)}</ul> : <p className="brief-note">MAX drafts the briefs when your owner interview closes.</p>}
		</div>
	)
}

/* ── Package approval ───────────────────────────────────────────────────────────────────── */

/* What an approval binds, as exact rows: never a summary of it. */
function BoundRows({ version, manifestVersion, documents }: { version: number; manifestVersion: number; documents: readonly BoundDocument[] }) {
	return (
		<div className="handoff-compare" data-testid="package-bound">
			<div className="handoff-row"><span className="handoff-key">Package</span><span>Version {version}</span></div>
			<div className="handoff-row"><span className="handoff-key">Manifest</span><span>Version {manifestVersion}</span></div>
			<div className="handoff-row is-list">
				<span className="handoff-key">Documents</span>
				<ul>
					{documents.map(item => <li key={item.name}><Mark tone="neutral" seed={item.name} size="xs" /><span className="handoff-name">{item.name}</span><span className="handoff-state"><Badge>v{item.revision}</Badge></span><code>{item.hash}</code></li>)}
				</ul>
			</div>
		</div>
	)
}

export function PackageApproveDialog({ open, version, manifestVersion, documents, charterBlocked, refusal, destination = "Agentix", onApproveCharter, onClose, onConfirm, onReviewCurrent }: {
	open: boolean
	// Where the package goes once it is approved; approving sends it nowhere.
	destination?: HandoffDestination
	version: number
	manifestVersion: number
	documents: readonly BoundDocument[]
	charterBlocked: boolean
	refusal: { message: string; current: number } | null
	onApproveCharter: () => void
	onClose: () => void
	onConfirm: () => void
	onReviewCurrent: () => void
}) {
	return (
		<Dialog
			open={open}
			size="lg"
			onClose={onClose}
			title={`Approve package v${version}`}
			description={`You approve exactly the versions below, and your name and the time go on the record. Approving doesn’t ${destination === "Knowledge" ? "publish anything in Knowledge" : "activate anything in Agentix"} and sends nothing.`}
			footer={refusal ? <>
				<Button onClick={onClose}>Close</Button>
				<Button variant="primary" data-autofocus onClick={onReviewCurrent}>Review v{refusal.current}</Button>
			</> : <>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="primary" disabled={charterBlocked} onClick={onConfirm}>Approve package v{version}</Button>
			</>}>
			{refusal ? <Banner tone="warning" role="alert" icon={<Warning size={16} weight="fill" />}>{refusal.message}</Banner> : null}
			{charterBlocked && !refusal ? (
				<div className="handoff-compare">
					<div className="handoff-row is-blocked">
						<span className="handoff-key">Blockers</span>
						<span className="handoff-blocker">
							<Warning size={16} weight="fill" aria-hidden="true" />
							<span>The project charter needs your approval with a reason.</span>
							<Button size="sm" onClick={onApproveCharter}>Approve charter</Button>
						</span>
					</div>
				</div>
			) : null}
			<BoundRows version={version} manifestVersion={manifestVersion} documents={documents} />
		</Dialog>
	)
}

const RETURN_REASON_MIN = 10

export function PackageReturnDialog({ open, version, onClose, onConfirm }: { open: boolean; version: number; onClose: () => void; onConfirm: (reason: string) => void }) {
	const [reason, setReason] = useState("")
	useEffect(() => { if (open) setReason("") }, [open])
	const length = reason.trim().length
	const enough = length >= RETURN_REASON_MIN
	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={`Return package v${version} to MAX`}
			description={`MAX prepares a new version from your reason. v${version} stays in the history and can’t be approved afterwards.`}
			footer={<>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="primary" disabled={!enough} onClick={() => onConfirm(reason.trim())}>Return to MAX</Button>
			</>}>
			<div className="ds-field">
				<label htmlFor="package-return-reason">What needs to change</label>
				<textarea id="package-return-reason" className="ds-textarea" data-autofocus rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Which finding or document is wrong, and what you expected" />
				<span className={`ds-field-count${enough ? "" : " is-short"}`}>{enough ? `${length} characters` : `${length}/${RETURN_REASON_MIN} minimum`}</span>
			</div>
		</Dialog>
	)
}

export function PackageWithdrawDialog({ open, review, destination = "Agentix", onClose, onConfirm }: { open: boolean; review: PackageReview; destination?: HandoffDestination; onClose: () => void; onConfirm: (reason: string) => void }) {
	const [reason, setReason] = useState("")
	useEffect(() => { if (open) setReason("") }, [open])
	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={`Withdraw approval of package v${review.approvedVersion ?? review.version}`}
			description={`Continue to ${destination} stops being available for this version until someone approves it again. What was approved stays in the history.`}
			footer={<>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="primary" onClick={() => onConfirm(reason.trim())}>Withdraw approval</Button>
			</>}>
			{review.approvedBy ? <p className="brief-note">Approved by {review.approvedBy}, {formatMoment(review.approvedAt ?? "")}.</p> : null}
			<div className="ds-field">
				<label htmlFor="package-withdraw-reason">Reason (optional)</label>
				<textarea id="package-withdraw-reason" className="ds-textarea" data-autofocus rows={2} value={reason} onChange={event => setReason(event.target.value)} />
			</div>
		</Dialog>
	)
}

const EVENT_LABEL: Record<PackageReview["history"][number]["action"], string> = { approved: "Approved", returned: "Returned", withdrawn: "Withdrawn", "new-version": "New version", refused: "Refused" }

export function PackageRecordDialog({ open, review, documents, onClose }: { open: boolean; review: PackageReview; documents: readonly BoundDocument[]; onClose: () => void }) {
	return (
		<Dialog open={open} size="lg" onClose={onClose} title={`What package v${review.version} binds`} description={review.status === "approved" ? `Approved by ${review.approvedBy ?? "the owner"}, ${formatMoment(review.approvedAt ?? "")}.` : "Nothing is bound until someone approves this version."} footer={<Button variant="primary" data-autofocus onClick={onClose}>Done</Button>}>
			<BoundRows version={review.version} manifestVersion={review.manifestVersion} documents={documents} />
			{review.history.length ? (
				<section aria-label="Package history" className="version-history">
					<h3>History</h3>
					<ol>
						{review.history.map(event => <li key={event.id}><strong>{EVENT_LABEL[event.action]} · v{event.version}</strong><span>{event.detail}</span><small>{event.by}, {formatMoment(event.at)}</small></li>)}
					</ol>
				</section>
			) : null}
		</Dialog>
	)
}

/* ── Document versions (13:29, 13:48) ───────────────────────────────────────────────────── */

export function DocumentEditDialog({ open, name, body, revision, openedRevision, onClose, onSave }: {
	open: boolean
	name: string
	body: DeliverableBody
	/* The version the document stands at now, which can move while this is open. */
	revision: number
	/* The version on screen when the edit opened: what this edit is written against. */
	openedRevision: number
	onClose: () => void
	onSave: (base: number, section: string, paragraphs: string[], note: string) => RevisionResult
}) {
	const [base, setBase] = useState(openedRevision)
	const [section, setSection] = useState("")
	const [text, setText] = useState("")
	const [note, setNote] = useState("")
	const [conflict, setConflict] = useState<{ current: number; latest: DocumentRevision | null } | null>(null)
	const firstSection = body.sections[0]?.heading ?? ""
	useEffect(() => {
		if (!open) return
		setBase(openedRevision)
		setSection(firstSection)
		setText(body.sections[0]?.paragraphs.join("\n\n") ?? "")
		setNote("")
		setConflict(null)
		// The draft starts once, from the version that was on screen when the edit opened.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open])
	const pick = (heading: string) => {
		setSection(heading)
		setText(body.sections.find(item => item.heading === heading)?.paragraphs.join("\n\n") ?? "")
	}
	const paragraphs = text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean)
	const unchanged = paragraphs.join("\n") === (body.sections.find(item => item.heading === section)?.paragraphs.join("\n") ?? "")
	const save = (against: number) => {
		const result = onSave(against, section, paragraphs, note.trim())
		if (result.ok) { setConflict(null); onClose(); return }
		setConflict({ current: result.current, latest: result.latest })
	}
	return (
		<Dialog
			open={open}
			size="lg"
			onClose={onClose}
			title={`Edit ${name}`}
			description={`Saving makes a new version for review and invalidates any approval of the package. Version ${base} stays in the history.`}
			footer={conflict ? <>
				<Button onClick={onClose}>Discard my text</Button>
				<Button variant="primary" disabled={!paragraphs.length} onClick={() => save(conflict.current)}>Save on top of v{conflict.current}</Button>
			</> : <>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="primary" disabled={!paragraphs.length || unchanged} onClick={() => save(base)}>Save version {base + 1}</Button>
			</>}>
			{conflict ? (
				<Banner tone="warning" role="alert" icon={<Warning size={16} weight="fill" />}>
					This document moved to v{conflict.current} while you were editing, so nothing was saved. Your text is kept below.{conflict.latest ? ` ${conflict.latest.by} changed “${conflict.latest.section}”: ${conflict.latest.note}` : ""}
				</Banner>
			) : null}
			<div className="ds-field">
				<label htmlFor="document-edit-section">Section</label>
				<select id="document-edit-section" className="ds-input" value={section} disabled={!!conflict} onChange={event => pick(event.target.value)}>
					{body.sections.map(item => <option key={item.heading}>{item.heading}</option>)}
				</select>
			</div>
			<div className="ds-field">
				<label htmlFor="document-edit-text">Section text</label>
				<textarea id="document-edit-text" className="ds-textarea" data-autofocus rows={8} value={text} onChange={event => setText(event.target.value)} />
			</div>
			<div className="ds-field">
				<label htmlFor="document-edit-note">What changed (optional)</label>
				<input id="document-edit-note" className="ds-input" value={note} onChange={event => setNote(event.target.value)} />
			</div>
		</Dialog>
	)
}

export function DocumentRegenerateDialog({ open, name, body, revision, refusal, onClose, onConfirm }: {
	open: boolean
	name: string
	body: DeliverableBody
	revision: number
	/* Regenerating spends budget, so a held run says why it can't. */
	refusal: string | null
	onClose: () => void
	onConfirm: (section: string, instruction: string) => void
}) {
	const [section, setSection] = useState("")
	const [instruction, setInstruction] = useState("")
	useEffect(() => { if (open) { setSection(body.sections[0]?.heading ?? ""); setInstruction("") } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open])
	return (
		<Dialog
			open={open}
			size="lg"
			onClose={onClose}
			title={`Regenerate part of ${name}`}
			description={`MAX rewrites one section from the current evidence and makes version ${revision + 1} for review. Other sections and documents keep their versions, and any approval of the package is invalidated.`}
			footer={<>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="primary" disabled={!!refusal} onClick={() => onConfirm(section, instruction.trim())}>Regenerate section</Button>
			</>}>
			{refusal ? <Banner tone="warning" role="alert" icon={<Warning size={16} weight="fill" />}>{refusal}</Banner> : null}
			<div className="ds-field">
				<label htmlFor="document-regenerate-section">Section</label>
				<select id="document-regenerate-section" className="ds-input" value={section} onChange={event => setSection(event.target.value)}>
					{body.sections.map(item => <option key={item.heading}>{item.heading}</option>)}
				</select>
			</div>
			<div className="ds-field">
				<label htmlFor="document-regenerate-instruction">What MAX should change (optional)</label>
				<textarea id="document-regenerate-instruction" className="ds-textarea" data-autofocus rows={3} value={instruction} onChange={event => setInstruction(event.target.value)} />
			</div>
		</Dialog>
	)
}

const REVISION_KIND: Record<DocumentRevision["kind"], string> = { edit: "Edited", regenerate: "Regenerated", return: "Revised after a return", colleague: "Edited" }

export function DocumentHistoryDialog({ open, name, body, revisions, viewing, hashOf, onRead, onClose }: {
	open: boolean
	name: string
	body: DeliverableBody
	revisions: readonly DocumentRevision[]
	viewing: number
	hashOf: (revision: number) => string
	onRead: (revision: number) => void
	onClose: () => void
}) {
	const current = revisions.at(-1)?.revision ?? 1
	const [comparing, setComparing] = useState<number | null>(null)
	useEffect(() => { if (open) setComparing(null) }, [open])
	const changes = useMemo(() => comparing === null ? [] : compareRevisions(body, revisions, comparing, current), [body, comparing, current, revisions])
	const entries = [...revisions].reverse().map(entry => ({ revision: entry.revision, title: `${REVISION_KIND[entry.kind]}: ${entry.section}`, detail: entry.note, by: entry.by, at: entry.at }))
	return (
		<Dialog open={open} size="lg" onClose={onClose} title={`${name} versions`} description="Every version stays readable. Editing or regenerating adds one and never rewrites an earlier one." footer={<Button variant="primary" data-autofocus onClick={onClose}>Done</Button>}>
			<ul className="sheet-list version-list" aria-label="Versions">
				{entries.map(entry => (
					<li key={entry.revision} className="version-row">
						<div>
							<strong>v{entry.revision}{entry.revision === current ? <Badge tone="positive">Current</Badge> : null}{entry.revision === viewing && entry.revision !== current ? <Badge>Reading</Badge> : null}</strong>
							<span>{entry.title}{entry.detail ? ` · ${entry.detail}` : ""}</span>
							<small>{entry.by}, {formatMoment(entry.at)} · <code>{hashOf(entry.revision)}</code></small>
						</div>
						<span className="version-actions">
							{entry.revision === current ? <TextButton onClick={() => onRead(entry.revision)}>Read</TextButton> : <TextButton onClick={() => onRead(entry.revision)}>Read v{entry.revision}</TextButton>}
							{entry.revision === current ? null : <TextButton onClick={() => setComparing(entry.revision)}>Compare with v{current}</TextButton>}
						</span>
					</li>
				))}
				<li className="version-row">
					<div>
						<strong>v1{current === 1 ? <Badge tone="positive">Current</Badge> : null}{viewing === 1 && current !== 1 ? <Badge>Reading</Badge> : null}</strong>
						<span>Generated by MAX from the readiness snapshot</span>
						<small><code>{hashOf(1)}</code></small>
					</div>
					<span className="version-actions">
						<TextButton onClick={() => onRead(1)}>{current === 1 ? "Read" : "Read v1"}</TextButton>
						{current === 1 ? null : <TextButton onClick={() => setComparing(1)}>Compare with v{current}</TextButton>}
					</span>
				</li>
			</ul>
			{comparing !== null ? (
				<section className="version-compare" aria-label={`Changes from v${comparing} to v${current}`} aria-live="polite">
					<h3>From v{comparing} to v{current}</h3>
					{changes.length ? changes.map(change => (
						<div key={change.heading} className="version-change">
							<h4>{change.heading}</h4>
							<div className="version-change-grid">
								<div><em>v{comparing}</em>{change.before.map(paragraph => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div>
								<div><em>v{current}</em>{change.after.map(paragraph => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div>
							</div>
						</div>
					)) : <p className="brief-note">These versions read the same.</p>}
				</section>
			) : null}
		</Dialog>
	)
}

/* The same content version as rows, bound to the version the header shows (D-044). */
export function StructuredView({ tables, name, revision, hash }: { tables: readonly StructuredTable[]; name: string; revision: number; hash: string }) {
	return (
		<article className="reader-structured" aria-label={`${name}, structured rows`}>
			<p className="reader-structured-bound"><CheckCircle size={14} weight="fill" aria-hidden="true" />Same content as the readable document · v{revision} · <code>{hash}</code> · {structuredRowCount(tables)} rows</p>
			{tables.map(table => (
				<section className="reader-next-steps" key={table.title} aria-label={table.title}>
					<h4>{table.title}</h4>
					<div className="reader-table-scroll">
						<table>
							<thead><tr><th scope="col">ID</th>{table.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
							<tbody>{table.rows.map(row => <tr key={row.id} data-row-id={row.id}><th scope="row"><code>{row.id}</code></th>{row.cells.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
						</table>
					</div>
				</section>
			))}
		</article>
	)
}

/* ── Notices a held run shows ───────────────────────────────────────────────────────────── */

export type WorkspaceNotice = {
	id: string
	tone: "neutral" | "warning"
	title: string
	detail: ReactNode
	actions: Array<{ label: string; onClick: () => void; primary?: boolean; disabled?: boolean }>
}

export function WorkspaceNotices({ notices }: { notices: readonly WorkspaceNotice[] }) {
	if (!notices.length) return null
	return (
		<div className="workspace-notices">
			{notices.map(notice => (
				<Banner key={notice.id} tone={notice.tone} role={notice.tone === "warning" ? "alert" : "status"} data-notice={notice.id} icon={notice.tone === "warning" ? <Warning size={16} weight="fill" /> : undefined}>
					<span className="notice-body">
						<span className="notice-text"><strong>{notice.title}</strong> {notice.detail}</span>
						<span className="notice-actions">{notice.actions.map(action => <Button key={action.label} size="sm" variant={action.primary ? "primary" : "secondary"} disabled={action.disabled} onClick={action.onClick}>{action.label}</Button>)}</span>
					</span>
				</Banner>
			))}
		</div>
	)
}
