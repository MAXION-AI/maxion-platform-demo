import { DELIVERABLES, SCENARIOS, type DeliverableBody, type OperationPerson, type Scenario, type ScenarioKey } from "./model"

/*
 * What a Discovery keeps beyond its conversation: the package under review, the revisions of its
 * documents, the interview briefs, the uploaded evidence, the public web sources and whatever is
 * holding the run. It is one object on the saved record, and every change to it goes through the
 * pure functions here, so the rules (a stale approval is refused, an edit that lost a race keeps
 * its text, a change invalidates a pending approval) can be read and tested without the page.
 *
 * All of it is simulated in the browser. Nothing here is sent anywhere.
 */

/* Who is signed in, as the organization store records it. */
export const SIGNED_IN_USER = "Root Admin"

/* ── Package review (D-122) ─────────────────────────────────────────────────────────────── */

export type PackageStatus = "pending" | "approved" | "returned" | "withdrawn"
export type BoundDocument = { name: string; revision: number; hash: string }
export type PackageEvent = { id: string; at: string; by: string; action: "approved" | "returned" | "withdrawn" | "new-version" | "refused"; version: number; detail: string }
export type PackageReview = {
	status: PackageStatus
	/* The package version as it stands now. Any content or selection change makes a new one. */
	version: number
	manifestVersion: number
	/* The exact version an approval binds, and what it bound. Kept on withdrawal as history. */
	approvedVersion?: number
	approvedBy?: string
	approvedAt?: string
	bound?: BoundDocument[]
	returnReason?: string
	history: PackageEvent[]
}

export const newPackageReview = (): PackageReview => ({ status: "pending", version: 1, manifestVersion: 4, history: [] })

let eventSequence = 0
const eventId = (at: string) => `pkg-${Date.parse(at) || 0}-${++eventSequence}`
const withEvent = (review: PackageReview, event: Omit<PackageEvent, "id">): PackageEvent[] => [{ ...event, id: eventId(event.at) }, ...review.history]

export type ReviewResult = { ok: true; review: PackageReview } | { ok: false; review: PackageReview; message: string; currentVersion: number }

const staleMessage = (opened: number, current: number) => `Package v${opened} can no longer be approved. Its content changed while this review was open, so the package is now v${current}. Nothing was approved. Review v${current} instead.`

/*
 * Approving binds one exact version. If the package moved after the review opened, the approval is
 * refused and the refusal is on the record; nothing is ever approved optimistically (13:59).
 */
export function approvePackage(review: PackageReview, openedVersion: number, documents: BoundDocument[], at: string, by = SIGNED_IN_USER): ReviewResult {
	if (openedVersion !== review.version) {
		return {
			ok: false,
			currentVersion: review.version,
			message: staleMessage(openedVersion, review.version),
			review: { ...review, history: withEvent(review, { at, by, action: "refused", version: openedVersion, detail: `Approval refused: the package had moved to v${review.version}` }) },
		}
	}
	if (review.status === "returned") return { ok: false, currentVersion: review.version, message: `Package v${review.version} was returned to MAX, so it can't be approved. MAX is preparing a new version.`, review }
	return {
		ok: true,
		review: {
			...review,
			status: "approved",
			approvedVersion: review.version,
			approvedBy: by,
			approvedAt: at,
			bound: documents,
			returnReason: undefined,
			history: withEvent(review, { at, by, action: "approved", version: review.version, detail: `Approved ${documents.length} document${documents.length === 1 ? "" : "s"} at manifest v${review.manifestVersion}` }),
		},
	}
}

/* Return sends this version back to MAX with the reason; MAX answers with a new version. */
export function returnPackage(review: PackageReview, openedVersion: number, reason: string, at: string, by = SIGNED_IN_USER): ReviewResult {
	if (openedVersion !== review.version) return { ok: false, currentVersion: review.version, message: `Package v${openedVersion} has already moved to v${review.version}. Review v${review.version} before returning it.`, review }
	return { ok: true, review: { ...review, status: "returned", returnReason: reason, history: withEvent(review, { at, by, action: "returned", version: review.version, detail: `Returned to MAX: ${reason}` }) } }
}

/* Withdrawal blocks new use of the approved version; it never rewrites what was bound (05:112). */
export function withdrawPackage(review: PackageReview, reason: string, at: string, by = SIGNED_IN_USER): PackageReview {
	if (review.status !== "approved") return review
	return { ...review, status: "withdrawn", history: withEvent(review, { at, by, action: "withdrawn", version: review.version, detail: reason ? `Approval withdrawn: ${reason}` : "Approval withdrawn" }) }
}

/* A change to content or selection makes a new version and invalidates any approval of the old one. */
export function nextPackageVersion(review: PackageReview, detail: string, at: string, by = SIGNED_IN_USER, manifestChanged = false): PackageReview {
	const version = review.version + 1
	return { ...review, status: "pending", version, manifestVersion: review.manifestVersion + (manifestChanged ? 1 : 0), returnReason: undefined, history: withEvent(review, { at, by, action: "new-version", version, detail }) }
}

/* Continue to Agentix is only ever available for the version that was approved. */
export const packageApproved = (review: PackageReview) => review.status === "approved" && review.approvedVersion === review.version

export const packageStatusLabel = (review: PackageReview) => {
	const version = `v${review.version}`
	if (review.status === "approved") return `Approved ${version}`
	if (review.status === "returned") return `${version} returned · MAX is preparing a new version`
	if (review.status === "withdrawn") return `${version} withdrawn · waiting for your approval`
	return `${version} waiting for your approval`
}

/* ── Document revisions (13:29, 05:52) ──────────────────────────────────────────────────── */

export type DocumentRevision = {
	revision: number
	kind: "edit" | "regenerate" | "return" | "colleague"
	by: string
	at: string
	note: string
	section: string
	paragraphs: string[]
}
/* Revisions after the generated first version, by document name. The first version is the body itself. */
export type RevisionLog = Record<string, DocumentRevision[]>

export const currentRevision = (log: RevisionLog, name: string) => (log[name]?.at(-1)?.revision ?? 1)

/* A document as it read at a revision: the generated body with each later section change applied. */
export function bodyAtRevision(body: DeliverableBody, revisions: readonly DocumentRevision[] = [], upTo = Number.MAX_SAFE_INTEGER): DeliverableBody {
	const applied = revisions.filter(entry => entry.revision <= upTo)
	if (!applied.length) return body
	return { ...body, sections: body.sections.map(section => {
		const last = [...applied].reverse().find(entry => entry.section === section.heading)
		return last ? { ...section, paragraphs: last.paragraphs } : section
	}) }
}

export type RevisionResult = { ok: true; log: RevisionLog; revision: number } | { ok: false; log: RevisionLog; conflict: true; current: number; latest: DocumentRevision | null }

/*
 * A revision is written against the version the person was looking at. If the document moved
 * underneath them, nothing is saved and the caller keeps the attempted text (13:48).
 */
export function addRevision(log: RevisionLog, name: string, baseRevision: number, entry: Omit<DocumentRevision, "revision">): RevisionResult {
	const current = currentRevision(log, name)
	if (baseRevision !== current) return { ok: false, conflict: true, log, current, latest: log[name]?.at(-1) ?? null }
	const revision = current + 1
	return { ok: true, revision, log: { ...log, [name]: [...(log[name] ?? []), { ...entry, revision }] } }
}

/* Sections that differ between two revisions, for Compare. */
export function compareRevisions(body: DeliverableBody, revisions: readonly DocumentRevision[] = [], from: number, to: number) {
	const before = bodyAtRevision(body, revisions, from), after = bodyAtRevision(body, revisions, to)
	return before.sections.flatMap((section, index) => {
		const next = after.sections[index]
		return section.paragraphs.join("\n") === next.paragraphs.join("\n") ? [] : [{ heading: section.heading, before: section.paragraphs, after: next.paragraphs }]
	})
}

/* The fingerprint of exactly what a reader sees, so a new revision is a new hash. */
export function contentHash(scenarioKey: ScenarioKey, decision: string, name: string, body: DeliverableBody) {
	const source = `${scenarioKey}:${decision}:${name}:${JSON.stringify([body.heading, body.lede, body.keyMessages, body.sections.map(section => [section.heading, section.paragraphs, section.bullets, section.exhibit]), body.findings, body.nextSteps])}`
	let hash = 0x811c9dc5
	for (let position = 0; position < source.length; position += 1) hash = Math.imul(hash ^ source.charCodeAt(position), 16777619) >>> 0
	return hash.toString(16).padStart(8, "0")
}

/* MAX's answer to a scoped regeneration: the section, re-read against the instruction and the evidence. */
export function regeneratedParagraphs(current: string[], instruction: string, evidence: string[]) {
	const asked = instruction.trim()
	const read = evidence.length ? ` MAX re-read ${listOf(evidence)} for this revision.` : ""
	return [...current, `${asked ? `Revised on request: ${asked.replace(/[.\s]+$/, "")}.` : "Regenerated against the current evidence."}${read}`]
}

const listOf = (items: string[]) => items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`

/* ── Output selection (05:68, D-074, D-122) ─────────────────────────────────────────────── */

/* The first release's set: the three technical deliverables plus the project plan and RAID log. */
export const DEFAULT_OUTPUTS: readonly string[] = ["Technical assessment", "Use case catalog", "Requirements specification", "Project plan and WBS", "RAID register"]
/* The customer demos also tell the story from the executive brief, the business case and the charter. */
export const DEMO_OUTPUTS: readonly string[] = [...DEFAULT_OUTPUTS, "Executive decision brief", "Business case and options appraisal", "Project charter and governance"]
export const excludedFrom = (selected: readonly string[]) => DELIVERABLES.map(item => item.name as string).filter(name => !selected.includes(name))

/* ── Interview briefs (D-110, D-114) ────────────────────────────────────────────────────── */

export type InterviewBrief = {
	personId: string
	personName: string
	role: string
	version: number
	status: "draft" | "approved"
	learn: string
	questions: string[]
	probes: string[]
	minutes: number
	/* What the participant's grant allows the interviewer to hold, and what the member kept in. */
	grant: string[]
	evidence: string[]
	approvedBy?: string
	approvedAt?: string
}

export type BriefGap = { topic: string; value: string }

/* What this person's grant allows: sources their ground touches, and never every source by default. */
function grantFor(scenario: Scenario, person: OperationPerson, position: number) {
	const words = `${person.focus} ${person.department} ${person.role}`.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 3)
	const matched = scenario.sources.filter(source => words.some(word => `${source.name} ${source.scope}`.toLowerCase().includes(word)))
	const allowed = matched.length ? matched : [scenario.sources[position % scenario.sources.length]]
	return allowed.slice(0, Math.max(1, scenario.sources.length - 1)).map(source => source.name)
}

const sentenceCase = (text: string) => text ? `${text[0].toUpperCase()}${text.slice(1)}` : text

/* MAX's draft, from the mission and evidence the inviting member may see. */
export function draftBrief(scenario: Scenario, person: OperationPerson, position: number, gaps: readonly BriefGap[] = [], conflict?: { between: readonly string[]; summary: string }): InterviewBrief {
	const topics = person.focus.split(/,\s*/).map(topic => topic.trim()).filter(Boolean)
	const grant = grantFor(scenario, person, position)
	const raised = scenario.exception.trigger.includes(person.name)
	const probes = [
		...(conflict?.between.includes(person.id) ? [`Contradiction: ${conflict.summary}`] : []),
		...(raised ? [`Contradiction: ${scenario.exception.trigger}`] : []),
		...gaps.map(gap => `Gap from the owner interview: ${gap.topic}. ${gap.value}.`),
	]
	return {
		personId: person.id,
		personName: person.name,
		role: person.role,
		version: 1,
		status: "draft",
		learn: `How ${topics.map(topic => topic.toLowerCase()).join(", ")} work today, from ${person.name} as ${person.role}, so MAX can test them against ${grant.join(" and ")}.`,
		questions: topics.map(topic => `${sentenceCase(topic)}: how does it work today, and where does it go wrong?`),
		probes: probes.length ? probes : [`No contradiction is on record for ${person.name.split(" ")[0]} yet. Compare the answers with ${grant[0]}.`],
		minutes: Math.max(6, topics.length * 3),
		grant,
		evidence: grant,
	}
}

export const draftBriefs = (scenario: Scenario, people: readonly OperationPerson[], gaps: readonly BriefGap[] = [], conflict?: { between: readonly string[]; summary: string }) =>
	people.map((person, position) => draftBrief(scenario, person, position, gaps, conflict))

export const pendingBriefs = (briefs: readonly InterviewBrief[]) => briefs.filter(brief => brief.status === "draft")

export function approveBrief(briefs: readonly InterviewBrief[], personId: string, at: string, by = SIGNED_IN_USER): InterviewBrief[] {
	return briefs.map(brief => brief.personId === personId && brief.status === "draft" ? { ...brief, status: "approved", approvedBy: by, approvedAt: at } : brief)
}
export const approveAllBriefs = (briefs: readonly InterviewBrief[], at: string, by = SIGNED_IN_USER): InterviewBrief[] =>
	briefs.map(brief => brief.status === "draft" ? { ...brief, status: "approved", approvedBy: by, approvedAt: at } : brief)

/* Adjusting makes a new version, which needs approving again. The grant is a ceiling: evidence can only narrow. */
export function adjustBrief(briefs: readonly InterviewBrief[], personId: string, patch: Partial<Pick<InterviewBrief, "learn" | "questions" | "probes" | "minutes" | "evidence">>): InterviewBrief[] {
	return briefs.map(brief => {
		if (brief.personId !== personId) return brief
		const evidence = (patch.evidence ?? brief.evidence).filter(name => brief.grant.includes(name))
		return { ...brief, ...patch, evidence, version: brief.version + 1, status: "draft", approvedBy: undefined, approvedAt: undefined }
	})
}

/* ── Uploaded evidence (05:44, 05:56) ───────────────────────────────────────────────────── */

export type UploadState = "uploading" | "processing" | "ready" | "refused"
export type EvidenceFile = {
	id: string
	name: string
	size: number
	state: UploadState
	reason?: string
	version: number
	/* Section references the evidence can be cited by. */
	sections: string[]
	addedAt: string
	addedBy: string
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const UPLOAD_KINDS: Record<string, "pages" | "sheets" | "slides" | "sections"> = { pdf: "pages", doc: "sections", docx: "sections", txt: "sections", md: "sections", csv: "sheets", xls: "sheets", xlsx: "sheets", ppt: "slides", pptx: "slides" }

export const formatBytes = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`

/* Why a file can't be taken, or null when it can. Only its name and size are read. */
export function uploadRefusal(name: string, size: number) {
	const extension = name.includes(".") ? name.split(".").at(-1)!.toLowerCase() : ""
	if (!UPLOAD_KINDS[extension]) return `${extension ? `.${extension} files aren’t` : "Files without a type aren’t"} supported. Use PDF, Word, Excel, PowerPoint, CSV, text or Markdown.`
	if (size > MAX_UPLOAD_BYTES) return `${formatBytes(size)} is over the ${formatBytes(MAX_UPLOAD_BYTES)} limit for one file.`
	if (size === 0) return "This file is empty."
	return null
}

/* Section references, scaled from the file's size since its content is never read here. */
export function sectionRefs(name: string, size: number) {
	const extension = name.split(".").at(-1)?.toLowerCase() ?? ""
	const kind = UPLOAD_KINDS[extension] ?? "sections"
	const count = Math.max(2, Math.min(12, Math.ceil(size / (256 * 1024))))
	const label = kind === "pages" ? "p." : kind === "sheets" ? "Sheet" : kind === "slides" ? "Slide" : "§"
	return Array.from({ length: count }, (_, index) => label === "§" ? `§${index + 1}` : `${label} ${index + 1}`)
}

/* The same name again is the next version of that document, not a second document. */
export function newEvidenceFile(existing: readonly EvidenceFile[], name: string, size: number, at: string, id: string, by = SIGNED_IN_USER): EvidenceFile {
	const reason = uploadRefusal(name, size)
	const version = reason ? 1 : existing.filter(file => file.name === name && file.state === "ready").length + 1
	return { id, name, size, state: reason ? "refused" : "uploading", ...(reason ? { reason } : {}), version, sections: reason ? [] : sectionRefs(name, size), addedAt: at, addedBy: by }
}

export const advanceUpload = (file: EvidenceFile): EvidenceFile => file.state === "uploading" ? { ...file, state: "processing" } : file.state === "processing" ? { ...file, state: "ready" } : file
/* A file caught mid-way by a reload did not finish; it says so rather than claiming it did. */
export const settleInterrupted = (file: EvidenceFile): EvidenceFile => file.state === "uploading" || file.state === "processing" ? { ...file, state: "refused", reason: "The page reloaded before this finished. Add it again." } : file

/* ── Web research (D-107, D-156) ────────────────────────────────────────────────────────── */

export type ResearchPolicy = { mode: "on" | "off" | "allowlist"; domains: string[] }
export type WebSource = { id: string; title: string; url: string; retrievedAt: string; finding: string }
export type ResearchRecord = { mode: ResearchPolicy["mode"]; domains: string[]; sources: WebSource[]; at: string }

type WebCandidate = Omit<WebSource, "retrievedAt" | "id">
/*
 * What each mission's research finds. The well-known public standards keep their real addresses;
 * everything else is fictional and lives on example.com, so nothing here claims a page that isn't there.
 */
const WEB_CANDIDATES: Record<ScenarioKey, WebCandidate[]> = {
	tprm: [
		{ title: "NIST SP 800-161: supply chain risk management", url: "https://csrc.nist.gov/pubs/sp/800/161/r1/final", finding: "Tiering depth by criticality matches the proposed risk-tiered intake." },
		{ title: "ISO/IEC 27001 overview", url: "https://www.iso.org/standard/27001", finding: "Supplier relationship controls are a named requirement to evidence." },
		{ title: "Vendor retention terms survey (example)", url: "https://research.example.com/vendor-retention-terms-2026", finding: "Retention commitments vary by vendor, so they can't be inferred from policy." },
	],
	diligence: [
		{ title: "IFRS 15: revenue from contracts with customers", url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/", finding: "Implementation services are recognised separately from recurring revenue where distinct." },
		{ title: "SaaS revenue quality benchmarks (example)", url: "https://benchmarks.example.com/saas-revenue-quality-2026", finding: "Peer implementation share frames how far the 94% claim is from the extract." },
	],
	enterprise: [
		{ title: "PCAOB AS 2201: audit of internal control", url: "https://pcaobus.org/oversight/standards/auditing-standards/details/AS2201", finding: "Segregation of duties is tested as a control over financial change." },
		{ title: "Event-driven controls reference (example)", url: "https://architecture.example.com/event-driven-financial-controls", finding: "Durable reconciliation is the usual companion to a fail-closed boundary." },
	],
	revenue: [
		{ title: "IFRS 15: revenue from contracts with customers", url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/", finding: "Recognition timing frames the posting-date rule the owner stated." },
		{ title: "Exchange-rate conventions in ledger closes (example)", url: "https://finance-notes.example.com/fx-conventions-at-close", finding: "Posting-date and invoice-date conventions are both in common use, so this is a policy choice." },
	],
	servicenow: [
		{ title: "ServiceNow product documentation", url: "https://www.servicenow.com/docs/", finding: "Provider documentation for the fields and approval rules the assessment names." },
		{ title: "AP exception benchmarks (example)", url: "https://benchmarks.example.com/ap-exception-handling-2026", finding: "Rule-based closure shares frame the mechanical share in the queue." },
	],
	ordersync: [
		{ title: "SAP Help Portal", url: "https://help.sap.com/", finding: "Provider documentation for sales-order posting and customer master fields." },
		{ title: "Salesforce Help", url: "https://help.salesforce.com/", finding: "Provider documentation for order objects and integration limits." },
		{ title: "Customer master ownership patterns (example)", url: "https://architecture.example.com/customer-master-ownership", finding: "One mastering system is the usual pattern; which one is a policy decision." },
	],
	s4hana: [
		{ title: "SAP Help Portal: SAP S/4HANA", url: "https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE", finding: "Provider documentation for conversion and the simplification items it names." },
		{ title: "Custom code retirement field notes (example)", url: "https://field-notes.example.com/s4-custom-code-retirement", finding: "Usage-based retirement is the common first cut of a custom estate." },
	],
}

const hostOf = (url: string) => { try { return new URL(url).hostname.toLowerCase() } catch { return "" } }
const allowedBy = (url: string, domains: readonly string[]) => {
	const host = hostOf(url)
	return domains.some(domain => { const clean = domain.trim().toLowerCase().replace(/^\*\./, ""); return !!clean && (host === clean || host.endsWith(`.${clean}`)) })
}

/* One rule for every scenario: what the effective setting lets this mission gather. */
export function gatherResearch(key: ScenarioKey, policy: ResearchPolicy, at: string): ResearchRecord {
	const candidates = policy.mode === "off" ? [] : policy.mode === "allowlist" ? WEB_CANDIDATES[key].filter(candidate => allowedBy(candidate.url, policy.domains)) : WEB_CANDIDATES[key]
	return { mode: policy.mode, domains: policy.domains, at, sources: candidates.map((candidate, index) => ({ ...candidate, id: `web-${key}-${index + 1}`, retrievedAt: at })) }
}

/* The setting said in words, for the mission review and the Sources sheet. */
export function researchSummary(policy: ResearchPolicy) {
	if (policy.mode === "off") return "Off for this organization. MAX gathers no public web sources."
	if (policy.mode === "allowlist") return `Limited to ${policy.domains.length ? policy.domains.join(", ") : "no listed domains"}. Each source is labelled Public web.`
	return "On. Each public source is labelled Public web, with its URL and retrieval time."
}
export function researchActivity(record: ResearchRecord | null) {
	if (!record) return "Web research hasn’t started."
	if (record.mode === "off") return "Web research is off for this organization, so MAX gathered no public web sources."
	if (!record.sources.length) return `No public source on the listed domains (${record.domains.join(", ") || "none listed"}) applied, so MAX gathered none.`
	return `Searched the public web and recorded ${record.sources.length} labelled source${record.sources.length === 1 ? "" : "s"}, kept apart from customer evidence.`
}

/* ── What can hold a run (13:50, 05:302, 05:306) ────────────────────────────────────────── */

export type RunFault =
	| { kind: "budget"; scope: string; limit: number; used: number; unit: string }
	| { kind: "connection"; source: string; system: string; scope: string; affected: string[]; reconnecting?: boolean }

export function budgetFault(scenario: Scenario): RunFault {
	return { kind: "budget", scope: `this Discovery · ${scenario.shortLabel}`, limit: 240, used: 240, unit: "work units" }
}

/* The source a revoked connection takes with it, and which selected documents read from it. */
export function connectionFault(scenario: Scenario, included: readonly string[]): RunFault {
	const source = scenario.sources[0]
	const reading = DELIVERABLES.map(item => item.name as string).filter(name => included.includes(name) && ["Technical assessment", "Requirements specification", "Use case catalog", "RAID register", "Executive decision brief"].includes(name))
	return { kind: "connection", source: source.name, system: source.system, scope: source.scope, affected: reading.length ? reading : [...included].slice(0, 3) }
}

/* The next admission: a bounded raise, within what the owner may grant here. */
export const raisedBudget = (fault: Extract<RunFault, { kind: "budget" }>) => fault.limit + 60

/* ── The whole object, and how older records read ───────────────────────────────────────── */

export type DiscoveryWork = {
	package: PackageReview
	revisions: RevisionLog
	briefs: InterviewBrief[]
	files: EvidenceFile[]
	research: ResearchRecord | null
	fault: RunFault | null
	/* Written once the owner has raised the limit, so the budget line stays honest. */
	budgetLimit?: number
}

export const newWork = (): DiscoveryWork => ({ package: newPackageReview(), revisions: {}, briefs: [], files: [], research: null, fault: null })

const FINAL_PHASE = 7

/*
 * Records saved before these gates existed, and the seeded ones, read as the work they already are:
 * a finished package counts as approved with a recorded approver and time, and interviews already
 * running have their briefs approved. A run that completes from now on waits for a person.
 */
export function seededWork(record: { scenarioKey: ScenarioKey; phase: number; interviewClosed: boolean; people: readonly OperationPerson[]; createdAt: string; updatedAt: string; id: string }, documents: () => BoundDocument[], policy: ResearchPolicy = { mode: "on", domains: [] }): DiscoveryWork {
	const scenario = SCENARIOS[record.scenarioKey]
	const work = newWork()
	const finished = record.phase >= FINAL_PHASE
	if (finished) {
		const by = record.id.startsWith("seed-") ? scenario.people[0].name : SIGNED_IN_USER
		const bound = documents()
		work.package = { ...work.package, status: "approved", approvedVersion: 1, approvedBy: by, approvedAt: record.updatedAt, bound, history: [{ id: `seed-${record.id}`, at: record.updatedAt, by, action: "approved", version: 1, detail: `Approved ${bound.length} documents at manifest v4` }] }
	}
	if (record.interviewClosed) {
		const drafts = draftBriefs(scenario, record.people)
		work.briefs = record.phase >= 3 ? approveAllBriefs(drafts, record.createdAt, SIGNED_IN_USER) : drafts
	}
	if (record.phase >= 2) work.research = gatherResearch(record.scenarioKey, policy, record.createdAt)
	return work
}

export function isDiscoveryWork(value: unknown): value is DiscoveryWork {
	if (!value || typeof value !== "object") return false
	const work = value as Partial<DiscoveryWork>
	return !!work.package && typeof work.package === "object" && typeof work.package.version === "number" && typeof work.package.status === "string" && Array.isArray(work.package.history)
		&& !!work.revisions && typeof work.revisions === "object" && Array.isArray(work.briefs) && Array.isArray(work.files)
}
