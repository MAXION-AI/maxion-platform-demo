import type { DiscoveryPackageEvidenceClass, DiscoveryPackageRef, PlanArtifactRef } from "@/features/platform-prototype/contracts"
import type { StateCodec } from "@/features/platform-prototype/persistence/DemoStateRepository"

export const PLAN_STATE_SLICE = "plan-workspace"
export const PLAN_STATE_MAX_BYTES = 3_500_000
const PLAN_SECTION_LIMIT = 1_000
const PLAN_MOUNT_LIMIT = 200
const PLAN_REVISION_LIMIT = 12
const PLAN_TEXT_LIMIT = 20_000
const PLAN_IDEMPOTENCY_LIMIT = 500

export type PlanRole = "owner" | "member" | "viewer"
export type PlanSectionStatus = "draft" | "in-review" | "approved"
export type PlanGeneration = {
	status: "idle" | "running" | "proposed" | "failed"
	proposedBody: string | null
	error: string | null
	operationId: string | null
	baseVersion: number | null
}
export type PlanSourceRef = { id: string; source: string; locator: string; evidenceClass: DiscoveryPackageEvidenceClass; verified: boolean }
export type PlanSection = {
	id: string
	title: string
	body: string
	status: PlanSectionStatus
	provenance: "generated" | "human"
	sourceIds: string[]
	generation: PlanGeneration
}
export type PlanRevision = {
	id: string
	version: number
	status: "draft" | "approved" | "superseded"
	createdAt: string
	createdBy: PlanRole
	reason: string
	sections: PlanSection[]
}
export type PlanApproval = {
	id: string
	version: number
	actorRole: "owner"
	createdAt: string
	correlationId: string
	consequence: "execute-input-created"
}
export type PlanComment = { id: string; sectionId: string; body: string; actorRole: PlanRole; createdAt: string }
export type PlanAuditEvent = {
	id: string
	type: string
	objectId: string
	version: number
	actorRole: PlanRole
	correlationId: string
	idempotencyKey: string
	consequence: string
	createdAt: string
}
export type PlanArtifact = {
	id: string
	projectId: string
	projectName: string
	title: string
	discoveryPackageId: string | null
	authorityBoundary: "planning-input" | null
	sources: PlanSourceRef[]
	unresolvedGapIds: string[]
	gapResolutions: Record<string, string>
	revisions: PlanRevision[]
	currentVersion: number
	approvedVersion: number | null
	approval: PlanApproval | null
	artifactRef: PlanArtifactRef | null
	comments: PlanComment[]
	drafts: Record<string, string>
	idempotencyKeys: string[]
	audit: PlanAuditEvent[]
	notice: string | null
}
export type PlanQuarantine = { path: string; reason: string }
export type PlanSlice = { version: 1; activeProjectId: string | null; artifacts: PlanArtifact[]; projectRoles: Record<string, PlanRole>; quarantine: PlanQuarantine[] }

export type PlanCommand =
	| { type: "discovery/ingested"; packageRef: DiscoveryPackageRef; actorRole: PlanRole }
	| { type: "artifact/opened"; projectId: string }
	| { type: "section/edit-started"; projectId: string; sectionId: string; actorRole: PlanRole }
	| { type: "section/draft-changed"; projectId: string; sectionId: string; value: string; actorRole: PlanRole }
	| { type: "section/edit-cancelled"; projectId: string; sectionId: string; actorRole: PlanRole }
	| { type: "section/saved"; projectId: string; sectionId: string; baseVersion: number; actorRole: PlanRole; idempotencyKey: string; correlationId: string }
	| { type: "section/regeneration-started"; projectId: string; sectionId: string; baseVersion: number; operationId: string; actorRole: PlanRole; idempotencyKey: string; correlationId: string }
	| { type: "section/regeneration-failed"; projectId: string; sectionId: string; baseVersion: number; operationId: string; message: string; actorRole: PlanRole }
	| { type: "section/regeneration-proposed"; projectId: string; sectionId: string; baseVersion: number; operationId: string; body: string; actorRole: PlanRole }
	| { type: "section/regeneration-accepted"; projectId: string; sectionId: string; baseVersion: number; operationId: string; actorRole: PlanRole; idempotencyKey: string; correlationId: string }
	| { type: "section/regeneration-rejected"; projectId: string; sectionId: string; baseVersion: number; operationId: string; actorRole: PlanRole }
	| { type: "comment/added"; projectId: string; sectionId: string; body: string; actorRole: PlanRole; idempotencyKey: string; correlationId: string }
	| { type: "revision/reverted"; projectId: string; targetVersion: number; baseVersion: number; actorRole: PlanRole; idempotencyKey: string; correlationId: string }
	| { type: "gap/resolved"; projectId: string; gapId: string; sourceId: string; actorRole: PlanRole; idempotencyKey: string; correlationId: string }
	| { type: "artifact/approved"; projectId: string; baseVersion: number; actorRole: PlanRole; idempotencyKey: string; correlationId: string }
	| { type: "notice/cleared"; projectId: string }

const SECTION_BLUEPRINTS = [
	["outcome", "Outcome and constraints", "Establish the customer outcome, operating boundary, and measurable release conditions."],
	["workstreams", "Workstreams", "Sequence the control plane before automation. Establish shared ownership and readback before any agent-assisted effect."],
	["dependencies", "Dependencies", "Bind provider capability, data migration, and owner availability to explicit readiness checks."],
	["risks", "Risks and controls", "Fail closed on missing authority, stale evidence, and unreconciled legacy readers or writers."],
	["gates", "Release gates", "Require source integrity, security review, capacity evidence, rollback, and accountable approval."],
	["rollback", "Rollback", "Keep the approved prior version readable and preserve a reversible dual-read transition."],
] as const

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)
const boundedText = (value: unknown, max = PLAN_TEXT_LIMIT) => typeof value === "string" && value.length <= max ? value : null
const roleOf = (value: unknown): PlanRole | null => value === "owner" || value === "member" || value === "viewer" ? value : null
const now = () => new Date().toISOString()
const cloneSections = (sections: readonly PlanSection[]) => sections.map((section) => ({ ...section, sourceIds: [...section.sourceIds], generation: { ...section.generation } }))
const currentRevision = (artifact: PlanArtifact) => artifact.revisions.find((revision) => revision.version === artifact.currentVersion) ?? artifact.revisions[artifact.revisions.length - 1]
const commandAllowed = (artifact: PlanArtifact, projectId: string, assertedRole: PlanRole, authoritativeRole: PlanRole) => artifact.projectId === projectId && assertedRole === authoritativeRole && authoritativeRole !== "viewer"
const duplicate = (artifact: PlanArtifact, key: string) => artifact.idempotencyKeys.includes(key)
const remember = (artifact: PlanArtifact, key: string) => [...artifact.idempotencyKeys, key].slice(-PLAN_IDEMPOTENCY_LIMIT)

function fingerprint(input: string) {
	let hash = 2166136261
	for (let index = 0; index < input.length; index += 1) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619)
	return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`
}

function createPlanArtifact(packageRef: DiscoveryPackageRef, actorRole: PlanRole): PlanArtifact {
	const sources = packageRef.provenance.slice(0, PLAN_SECTION_LIMIT).map((item) => ({
		id: item.evidenceId,
		source: item.source,
		locator: item.locator,
		evidenceClass: item.evidenceClass,
		verified: item.evidenceClass !== "synthetic-demo",
	}))
	const sections = SECTION_BLUEPRINTS.map(([id, title, body]) => ({
		id,
		title,
		body,
		status: id === "outcome" ? "approved" as const : id === "workstreams" ? "in-review" as const : "draft" as const,
		provenance: "generated" as const,
		sourceIds: sources.slice(0, 3).map((source) => source.id),
		generation: { status: "idle" as const, proposedBody: null, error: null, operationId: null, baseVersion: null },
	}))
	const createdAt = packageRef.createdAt
	return {
		id: `plan-${packageRef.projectId}`,
		projectId: packageRef.projectId,
		projectName: packageRef.projectName,
		title: `${packageRef.projectName} rollout`,
		discoveryPackageId: packageRef.id,
		authorityBoundary: packageRef.authority.boundedTo,
		sources,
		unresolvedGapIds: [...packageRef.unresolvedGapIds],
		gapResolutions: {},
		revisions: [{ id: `plan-${packageRef.projectId}-v1`, version: 1, status: "draft", createdAt, createdBy: actorRole, reason: "Discovery package ingested", sections }],
		currentVersion: 1,
		approvedVersion: null,
		approval: null,
		artifactRef: null,
		comments: [],
		drafts: {},
		idempotencyKeys: [],
		audit: [],
		notice: null,
	}
}

export function createInitialPlanSlice(): PlanSlice {
	return { version: 1, activeProjectId: null, artifacts: [], projectRoles: {}, quarantine: [] }
}

function notice(artifact: PlanArtifact, message: string) {
	return { ...artifact, notice: message }
}

function appendAudit(artifact: PlanArtifact, command: { actorRole: PlanRole; idempotencyKey: string; correlationId: string }, type: string, consequence: string, version = artifact.currentVersion) {
	const event: PlanAuditEvent = {
		id: `${type}-${command.idempotencyKey}`,
		type,
		objectId: artifact.id,
		version,
		actorRole: command.actorRole,
		correlationId: command.correlationId.slice(0, 160),
		idempotencyKey: command.idempotencyKey.slice(0, 160),
		consequence,
		createdAt: now(),
	}
	return { ...artifact, audit: [...artifact.audit, event].slice(-PLAN_IDEMPOTENCY_LIMIT), idempotencyKeys: remember(artifact, command.idempotencyKey), notice: null }
}

function forkDraft(artifact: PlanArtifact, actorRole: PlanRole, reason: string, sections?: PlanSection[]): PlanArtifact {
	const source = currentRevision(artifact)
	if (!source) return artifact
	const nextVersion = Math.max(...artifact.revisions.map((revision) => revision.version), 0) + 1
	const revisions: PlanRevision[] = artifact.revisions.map((revision) => revision.status === "draft" ? { ...revision, status: "superseded" } : revision)
	const nextRevision: PlanRevision = { id: `${artifact.id}-v${nextVersion}`, version: nextVersion, status: "draft", createdAt: now(), createdBy: actorRole, reason, sections: cloneSections(sections ?? source.sections) }
	return {
		...artifact,
		revisions: [...revisions, nextRevision].slice(-PLAN_REVISION_LIMIT),
		currentVersion: nextVersion,
		artifactRef: null,
		notice: null,
	}
}

function mutateArtifact(state: PlanSlice, projectId: string, mutation: (artifact: PlanArtifact) => PlanArtifact): PlanSlice {
	const index = state.artifacts.findIndex((artifact) => artifact.projectId === projectId)
	if (index < 0) return state
	return { ...state, artifacts: state.artifacts.map((artifact, artifactIndex) => artifactIndex === index ? mutation(artifact) : artifact) }
}

function withMutableRevision(artifact: PlanArtifact, actorRole: PlanRole, reason: string): PlanArtifact {
	const current = currentRevision(artifact)
	return current?.status === "approved" ? forkDraft(artifact, actorRole, reason) : artifact
}

function updateSection(artifact: PlanArtifact, sectionId: string, update: (section: PlanSection) => PlanSection): PlanArtifact {
	const revision = currentRevision(artifact)
	if (!revision) return artifact
	return { ...artifact, revisions: artifact.revisions.map((item) => item.version === revision.version ? { ...item, sections: item.sections.map((section) => section.id === sectionId ? update(section) : section) } : item) }
}

function generationMatches(artifact: PlanArtifact, sectionId: string, operationId: string, baseVersion: number) {
	const generation = currentRevision(artifact)?.sections.find((section) => section.id === sectionId)?.generation
	return generation?.operationId === operationId && generation.baseVersion === baseVersion
}

export function selectPlanReadiness(artifact: PlanArtifact) {
	const revision = currentRevision(artifact)
	const requiredSectionsMissing = SECTION_BLUEPRINTS.some(([id]) => !revision?.sections.some((section) => section.id === id))
	const missingSources = artifact.sources.length === 0 || revision?.sections.some((section) => section.sourceIds.length === 0 || section.sourceIds.some((id) => !artifact.sources.some((source) => source.id === id && source.verified))) !== false
	const incomplete = !revision || revision.sections.length === 0 || revision.sections.some((section) => !section.body.trim() || section.generation.status === "running" || section.generation.status === "failed")
	const reasons = [
		artifact.discoveryPackageId ? null : "A verified Discovery package is required.",
		artifact.authorityBoundary === "planning-input" ? null : "Discovery authority is missing.",
		artifact.unresolvedGapIds.length ? `${artifact.unresolvedGapIds.length} material evidence gap remains.` : null,
		requiredSectionsMissing ? "The required plan structure is incomplete." : null,
		missingSources ? "Every section needs a valid evidence source." : null,
		incomplete ? "Every plan section must be complete and recoverable." : null,
	].filter((item): item is string => Boolean(item))
	return { ready: reasons.length === 0, reasons }
}

export function selectPlanArtifact(state: PlanSlice, projectId: string | null) {
	return projectId ? state.artifacts.find((artifact) => artifact.projectId === projectId) ?? null : null
}

export function selectPlanSections(artifact: PlanArtifact, query = "", limit = PLAN_MOUNT_LIMIT) {
	const revision = currentRevision(artifact)
	const normalized = query.trim().toLocaleLowerCase()
	const matches = (revision?.sections ?? []).filter((section) => !normalized || `${section.title} ${section.body}`.toLocaleLowerCase().includes(normalized))
	const mounted = matches.slice(0, Math.min(Math.max(limit, 1), PLAN_MOUNT_LIMIT))
	return { items: mounted, total: matches.length, mounted: mounted.length, omitted: Math.max(matches.length - mounted.length, 0) }
}

export function selectPlanRevision(artifact: PlanArtifact, version = artifact.currentVersion) {
	return artifact.revisions.find((revision) => revision.version === version) ?? null
}

export function planReducer(state: PlanSlice, command: PlanCommand): PlanSlice {
	if (command.type === "discovery/ingested") {
		const existing = state.artifacts.find((artifact) => artifact.projectId === command.packageRef.projectId && artifact.discoveryPackageId === command.packageRef.id)
		const projectRoles = { ...state.projectRoles, [command.packageRef.projectId]: command.actorRole }
		if (existing) return { ...state, activeProjectId: existing.projectId, projectRoles }
		if (command.actorRole === "viewer") {
			return {
				...state,
				projectRoles,
				artifacts: state.artifacts.map((artifact) => artifact.projectId === command.packageRef.projectId ? notice(artifact, "This plan is read-only for your project role.") : artifact),
			}
		}
		const artifact = createPlanArtifact(command.packageRef, command.actorRole)
		const projectIndex = state.artifacts.findIndex((item) => item.projectId === command.packageRef.projectId)
		return { ...state, activeProjectId: command.packageRef.projectId, projectRoles, artifacts: projectIndex < 0 ? [...state.artifacts, artifact].slice(-100) : state.artifacts.map((item, index) => index === projectIndex ? artifact : item) }
	}
	if (command.type === "artifact/opened") return state.artifacts.some((artifact) => artifact.projectId === command.projectId) ? { ...state, activeProjectId: command.projectId } : state
	return mutateArtifact(state, command.projectId, (original) => {
		if (command.type === "notice/cleared") return { ...original, notice: null }
		const authoritativeRole = state.projectRoles[command.projectId] ?? "viewer"
		if ("actorRole" in command && !commandAllowed(original, command.projectId, command.actorRole, authoritativeRole)) return notice(original, "This plan is read-only for your project role.")
		if ("idempotencyKey" in command && duplicate(original, command.idempotencyKey)) return original
		if ("baseVersion" in command && command.baseVersion !== original.currentVersion) return notice(original, `This command targeted version ${command.baseVersion}; version ${original.currentVersion} is current. Your draft was preserved.`)

		switch (command.type) {
			case "section/edit-started": {
				const section = currentRevision(original)?.sections.find((item) => item.id === command.sectionId)
				return section ? { ...original, drafts: { ...original.drafts, [section.id]: section.body }, notice: null } : notice(original, "That section is no longer available.")
			}
			case "section/draft-changed": return command.value.length <= PLAN_TEXT_LIMIT ? { ...original, drafts: { ...original.drafts, [command.sectionId]: command.value } } : notice(original, `Section content is limited to ${PLAN_TEXT_LIMIT.toLocaleString("en-US")} characters.`)
			case "section/edit-cancelled": {
				const drafts = { ...original.drafts }
				delete drafts[command.sectionId]
				return { ...original, drafts }
			}
			case "section/saved": {
				const body = original.drafts[command.sectionId]?.trim()
				if (!body) return notice(original, "Enter section content before saving.")
				let artifact = withMutableRevision(original, command.actorRole, `Edited ${command.sectionId}`)
				artifact = updateSection(artifact, command.sectionId, (section) => ({ ...section, body, provenance: "human", status: "in-review", generation: { status: "idle", proposedBody: null, error: null, operationId: null, baseVersion: null } }))
				const drafts = { ...artifact.drafts }
				delete drafts[command.sectionId]
				return appendAudit({ ...artifact, drafts }, command, "section.saved", "draft-revision-updated")
			}
			case "section/regeneration-started": {
				const artifact = updateSection(original, command.sectionId, (section) => ({ ...section, generation: { status: "running", proposedBody: null, error: null, operationId: command.operationId, baseVersion: command.baseVersion } }))
				return appendAudit(artifact, command, "section.regeneration-started", "prior-content-preserved")
			}
			case "section/regeneration-failed": return generationMatches(original, command.sectionId, command.operationId, command.baseVersion) ? updateSection(original, command.sectionId, (section) => ({ ...section, generation: { ...section.generation, status: "failed", proposedBody: null, error: command.message.slice(0, 240) || "Generation failed." } })) : original
			case "section/regeneration-proposed": return command.body.trim() && generationMatches(original, command.sectionId, command.operationId, command.baseVersion) ? updateSection(original, command.sectionId, (section) => ({ ...section, generation: { ...section.generation, status: "proposed", proposedBody: command.body.trim().slice(0, PLAN_TEXT_LIMIT), error: null } })) : original
			case "section/regeneration-accepted": {
				if (!generationMatches(original, command.sectionId, command.operationId, command.baseVersion)) return original
				let artifact = withMutableRevision(original, command.actorRole, `Accepted regeneration for ${command.sectionId}`)
				artifact = updateSection(artifact, command.sectionId, (section) => section.generation.proposedBody ? { ...section, body: section.generation.proposedBody, provenance: "generated", status: "in-review", generation: { status: "idle", proposedBody: null, error: null, operationId: null, baseVersion: null } } : section)
				return appendAudit(artifact, command, "section.regeneration-accepted", "draft-revision-updated")
			}
			case "section/regeneration-rejected": return generationMatches(original, command.sectionId, command.operationId, command.baseVersion) ? updateSection(original, command.sectionId, (section) => ({ ...section, generation: { status: "idle", proposedBody: null, error: null, operationId: null, baseVersion: null } })) : original
			case "comment/added": {
				const body = command.body.trim()
				if (!body) return notice(original, "Enter a review comment first.")
				const comment: PlanComment = { id: `comment-${command.idempotencyKey}`, sectionId: command.sectionId, body: body.slice(0, 2_000), actorRole: command.actorRole, createdAt: now() }
				return appendAudit({ ...original, comments: [...original.comments, comment].slice(-500) }, command, "comment.added", "review-note-recorded")
			}
			case "revision/reverted": {
				const target = original.revisions.find((revision) => revision.version === command.targetVersion)
				if (!target) return notice(original, "That revision is no longer available.")
				return appendAudit(forkDraft(original, command.actorRole, `Reverted from version ${target.version}`, target.sections), command, "revision.reverted", "new-draft-created")
			}
			case "gap/resolved": {
				const source = original.sources.find((item) => item.id === command.sourceId && item.verified)
				if (!source) return notice(original, "A verified source is required to resolve this evidence gap.")
				if (!original.unresolvedGapIds.includes(command.gapId)) return notice(original, "That evidence gap is no longer open.")
				return appendAudit({ ...original, unresolvedGapIds: original.unresolvedGapIds.filter((gap) => gap !== command.gapId), gapResolutions: { ...original.gapResolutions, [command.gapId]: source.id } }, command, "gap.resolved", "verified-source-linked")
			}
			case "artifact/approved": {
				if (command.actorRole !== "owner") return notice(original, "Only a project owner can approve an Execute handoff.")
				const readiness = selectPlanReadiness(original)
				if (!readiness.ready) return notice(original, readiness.reasons[0] ?? "This plan is not ready for approval.")
				const revision = currentRevision(original)
				if (!revision) return notice(original, "The current plan version is missing.")
				const approvedAt = now()
				const approval: PlanApproval = { id: `approval-${command.idempotencyKey}`, version: revision.version, actorRole: "owner", createdAt: approvedAt, correlationId: command.correlationId.slice(0, 160), consequence: "execute-input-created" }
				const sourceIds = [...new Set(revision.sections.flatMap((section) => section.sourceIds))]
				const artifactRef: PlanArtifactRef = {
					version: 1,
					id: `${original.id}-approved-v${revision.version}`,
					artifactId: original.id,
					artifactVersion: revision.version,
					projectId: original.projectId,
					projectName: original.projectName,
					discoveryPackageId: original.discoveryPackageId as string,
					approvedAt,
					approvedByRole: "owner",
					sourceIds,
					unresolvedGapIds: [],
					authority: { boundedTo: "execute-input" },
					contentDigest: fingerprint(`${original.id}:${revision.version}:${revision.sections.map((section) => `${section.id}:${section.body}`).join("|")}`),
				}
				const artifact = { ...original, revisions: original.revisions.map((item) => item.version === revision.version ? { ...item, status: "approved" as const } : item), approvedVersion: revision.version, approval, artifactRef }
				return appendAudit(artifact, command, "artifact.approved", "immutable-execute-input-created", revision.version)
			}
			default: return original
		}
	})
}

function parseStringArray(value: unknown, limit: number, maxLength = 200) {
	if (!Array.isArray(value)) return null
	return value.slice(0, limit).map((item) => boundedText(item, maxLength)).filter((item): item is string => item !== null)
}

function parseGeneration(value: unknown): PlanGeneration | null {
	if (!isRecord(value) || !["idle", "running", "proposed", "failed"].includes(String(value.status))) return null
	const proposedBody = value.proposedBody === null ? null : boundedText(value.proposedBody)
	const error = value.error === null ? null : boundedText(value.error, 240)
	const operationId = value.operationId === null ? null : boundedText(value.operationId, 160)
	const baseVersion = value.baseVersion === null ? null : Number.isInteger(value.baseVersion) && Number(value.baseVersion) >= 1 ? Number(value.baseVersion) : null
	if (proposedBody === null && value.proposedBody !== null || error === null && value.error !== null || operationId === null && value.operationId !== null || baseVersion === null && value.baseVersion !== null) return null
	const status = value.status as PlanGeneration["status"]
	if (status === "idle" && (operationId !== null || baseVersion !== null)) return null
	if (status !== "idle" && (!operationId || baseVersion === null)) return null
	return { status, proposedBody, error, operationId, baseVersion }
}

function parseSection(value: unknown): PlanSection | null {
	if (!isRecord(value)) return null
	const id = boundedText(value.id, 160), title = boundedText(value.title, 240), body = boundedText(value.body)
	const sourceIds = parseStringArray(value.sourceIds, PLAN_SECTION_LIMIT, 160)
	const generation = parseGeneration(value.generation)
	if (!id || !title || body === null || !sourceIds || !generation || !["draft", "in-review", "approved"].includes(String(value.status)) || !["generated", "human"].includes(String(value.provenance))) return null
	return { id, title, body, status: value.status as PlanSectionStatus, provenance: value.provenance as PlanSection["provenance"], sourceIds, generation }
}

function parseRevision(value: unknown, path: string, quarantine: PlanQuarantine[]): PlanRevision | null {
	if (!isRecord(value) || !Array.isArray(value.sections)) return null
	const id = boundedText(value.id, 160), createdAt = boundedText(value.createdAt, 80), reason = boundedText(value.reason, 500), createdBy = roleOf(value.createdBy)
	if (!id || !Number.isInteger(value.version) || Number(value.version) < 1 || !createdAt || !Number.isFinite(Date.parse(createdAt)) || !reason || !createdBy || !["draft", "approved", "superseded"].includes(String(value.status))) return null
	const sections: PlanSection[] = []
	for (const [index, raw] of value.sections.slice(0, PLAN_SECTION_LIMIT).entries()) {
		const parsed = parseSection(raw)
		if (parsed) sections.push(parsed)
		else quarantine.push({ path: `${path}.sections[${index}]`, reason: "invalid-section" })
	}
	if (!sections.length) return null
	return { id, version: Number(value.version), status: value.status as PlanRevision["status"], createdAt, createdBy, reason, sections }
}

function parseSource(value: unknown): PlanSourceRef | null {
	if (!isRecord(value)) return null
	const id = boundedText(value.id, 160), source = boundedText(value.source, 240), locator = boundedText(value.locator, 1_000)
	if (!id || !source || locator === null || typeof value.verified !== "boolean" || !["connected-source", "operator-statement", "synthetic-demo"].includes(String(value.evidenceClass))) return null
	return { id, source, locator, verified: value.verified, evidenceClass: value.evidenceClass as DiscoveryPackageEvidenceClass }
}

function parseApproval(value: unknown): PlanApproval | null {
	if (!isRecord(value)) return null
	const id = boundedText(value.id, 160), createdAt = boundedText(value.createdAt, 80), correlationId = boundedText(value.correlationId, 160)
	if (!id || !createdAt || !Number.isFinite(Date.parse(createdAt)) || !correlationId || !Number.isInteger(value.version) || Number(value.version) < 1 || value.actorRole !== "owner" || value.consequence !== "execute-input-created") return null
	return { id, version: Number(value.version), actorRole: "owner", createdAt, correlationId, consequence: "execute-input-created" }
}

function parseArtifactRef(value: unknown, artifactId: string, projectId: string): PlanArtifactRef | null {
	if (!isRecord(value)) return null
	const id = boundedText(value.id, 180), parsedArtifactId = boundedText(value.artifactId, 160), parsedProjectId = boundedText(value.projectId, 160), projectName = boundedText(value.projectName, 240), discoveryPackageId = boundedText(value.discoveryPackageId, 160), approvedAt = boundedText(value.approvedAt, 80), contentDigest = boundedText(value.contentDigest, 160)
	const sourceIds = parseStringArray(value.sourceIds, PLAN_SECTION_LIMIT, 160)
	if (value.version !== 1 || !id || parsedArtifactId !== artifactId || parsedProjectId !== projectId || !projectName || !discoveryPackageId || !approvedAt || !Number.isFinite(Date.parse(approvedAt)) || value.approvedByRole !== "owner" || !Number.isInteger(value.artifactVersion) || Number(value.artifactVersion) < 1 || !sourceIds?.length || !Array.isArray(value.unresolvedGapIds) || value.unresolvedGapIds.length !== 0 || !isRecord(value.authority) || value.authority.boundedTo !== "execute-input" || !contentDigest) return null
	return { version: 1, id, artifactId, artifactVersion: Number(value.artifactVersion), projectId, projectName, discoveryPackageId, approvedAt, approvedByRole: "owner", sourceIds, unresolvedGapIds: [], authority: { boundedTo: "execute-input" }, contentDigest }
}

function parseComment(value: unknown): PlanComment | null {
	if (!isRecord(value)) return null
	const id = boundedText(value.id, 180), sectionId = boundedText(value.sectionId, 160), body = boundedText(value.body, 2_000), actorRole = roleOf(value.actorRole), createdAt = boundedText(value.createdAt, 80)
	return id && sectionId && body && actorRole && createdAt && Number.isFinite(Date.parse(createdAt)) ? { id, sectionId, body, actorRole, createdAt } : null
}

function parseAudit(value: unknown): PlanAuditEvent | null {
	if (!isRecord(value)) return null
	const id = boundedText(value.id, 180), type = boundedText(value.type, 160), objectId = boundedText(value.objectId, 160), actorRole = roleOf(value.actorRole), correlationId = boundedText(value.correlationId, 160), idempotencyKey = boundedText(value.idempotencyKey, 160), consequence = boundedText(value.consequence, 240), createdAt = boundedText(value.createdAt, 80)
	if (!id || !type || !objectId || !actorRole || !correlationId || !idempotencyKey || !consequence || !createdAt || !Number.isFinite(Date.parse(createdAt)) || !Number.isInteger(value.version) || Number(value.version) < 1) return null
	return { id, type, objectId, version: Number(value.version), actorRole, correlationId, idempotencyKey, consequence, createdAt }
}

function parseArtifact(value: unknown, path: string, quarantine: PlanQuarantine[]): PlanArtifact | null {
	if (!isRecord(value) || !Array.isArray(value.sources) || !Array.isArray(value.revisions)) return null
	const id = boundedText(value.id, 160), projectId = boundedText(value.projectId, 160), projectName = boundedText(value.projectName, 240), title = boundedText(value.title, 240)
	if (!id || !projectId || !projectName || !title) return null
	const sources: PlanSourceRef[] = []
	for (const [index, raw] of value.sources.slice(0, PLAN_SECTION_LIMIT).entries()) {
		const parsed = parseSource(raw)
		if (parsed) sources.push(parsed)
		else quarantine.push({ path: `${path}.sources[${index}]`, reason: "invalid-source" })
	}
	const revisions: PlanRevision[] = []
	for (const [index, raw] of value.revisions.slice(-PLAN_REVISION_LIMIT).entries()) {
		const parsed = parseRevision(raw, `${path}.revisions[${index}]`, quarantine)
		if (parsed) revisions.push(parsed)
		else quarantine.push({ path: `${path}.revisions[${index}]`, reason: "invalid-revision" })
	}
	if (!revisions.length) return null
	const requestedVersion = Number(value.currentVersion)
	const current = revisions.find((revision) => revision.version === requestedVersion) ?? revisions[revisions.length - 1]
	const unresolvedGapIds = parseStringArray(value.unresolvedGapIds, PLAN_SECTION_LIMIT, 160) ?? []
	const gapResolutions = isRecord(value.gapResolutions) ? Object.fromEntries(Object.entries(value.gapResolutions).flatMap(([gapId, rawSourceId]) => {
		const sourceId = boundedText(rawSourceId, 160)
		return gapId.length <= 160 && sourceId && sources.some((source) => source.id === sourceId && source.verified) ? [[gapId, sourceId]] : []
	})) : {}
	const discoveryPackageId = value.discoveryPackageId === null ? null : boundedText(value.discoveryPackageId, 160)
	const drafts = isRecord(value.drafts) ? Object.fromEntries(Object.entries(value.drafts).flatMap(([key, raw]) => { const parsed = boundedText(raw); return parsed === null ? [] : [[key.slice(0, 160), parsed]] })) : {}
	const idempotencyKeys = parseStringArray(value.idempotencyKeys, PLAN_IDEMPOTENCY_LIMIT, 160) ?? []
	const approval = value.approval === null || value.approval === undefined ? null : parseApproval(value.approval)
	if (value.approval !== null && value.approval !== undefined && approval === null) quarantine.push({ path: `${path}.approval`, reason: "invalid-approval" })
	const artifactRef = value.artifactRef === null || value.artifactRef === undefined ? null : parseArtifactRef(value.artifactRef, id, projectId)
	if (value.artifactRef !== null && value.artifactRef !== undefined && artifactRef === null) quarantine.push({ path: `${path}.artifactRef`, reason: "invalid-artifact-ref" })
	const comments: PlanComment[] = []
	for (const [index, raw] of (Array.isArray(value.comments) ? value.comments : []).slice(-500).entries()) {
		const parsed = parseComment(raw)
		if (parsed) comments.push(parsed)
		else quarantine.push({ path: `${path}.comments[${index}]`, reason: "invalid-comment" })
	}
	const audit: PlanAuditEvent[] = []
	for (const [index, raw] of (Array.isArray(value.audit) ? value.audit : []).slice(-PLAN_IDEMPOTENCY_LIMIT).entries()) {
		const parsed = parseAudit(raw)
		if (parsed) audit.push(parsed)
		else quarantine.push({ path: `${path}.audit[${index}]`, reason: "invalid-audit" })
	}
	const approvedVersion = Number.isInteger(value.approvedVersion) && revisions.some((revision) => revision.version === value.approvedVersion && revision.status === "approved") ? Number(value.approvedVersion) : null
	const validArtifactRef = artifactRef && artifactRef.artifactVersion === approvedVersion ? artifactRef : null
	return {
		id,
		projectId,
		projectName,
		title,
		discoveryPackageId,
		authorityBoundary: value.authorityBoundary === "planning-input" ? "planning-input" : null,
		sources,
		unresolvedGapIds,
		gapResolutions,
		revisions,
		currentVersion: current.version,
		approvedVersion,
		approval: approval && approval.version === approvedVersion ? approval : null,
		artifactRef: validArtifactRef,
		comments,
		drafts,
		idempotencyKeys,
		audit,
		notice: boundedText(value.notice, 500),
	}
}

export const planStateCodec: StateCodec<PlanSlice> = {
	parse: (value) => {
		if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.artifacts)) return null
		const quarantine: PlanQuarantine[] = []
		const artifacts: PlanArtifact[] = []
		for (const [index, raw] of value.artifacts.slice(0, 100).entries()) {
			const parsed = parseArtifact(raw, `artifacts[${index}]`, quarantine)
			if (parsed) artifacts.push(parsed)
			else quarantine.push({ path: `artifacts[${index}]`, reason: "invalid-artifact" })
		}
		const activeProjectId = value.activeProjectId === null ? null : boundedText(value.activeProjectId, 160)
		const projectRoles = isRecord(value.projectRoles) ? Object.fromEntries(Object.entries(value.projectRoles).flatMap(([projectId, rawRole]) => {
			const role = roleOf(rawRole)
			return projectId.length <= 160 && role ? [[projectId, role]] : []
		})) : {}
		for (const artifact of artifacts) if (!projectRoles[artifact.projectId]) projectRoles[artifact.projectId] = "viewer"
		return { version: 1, activeProjectId: activeProjectId && artifacts.some((artifact) => artifact.projectId === activeProjectId) ? activeProjectId : artifacts[0]?.projectId ?? null, artifacts, projectRoles, quarantine }
	},
	migrate: (version, value) => version === 0 ? planStateCodec.parse(value) : null,
}
