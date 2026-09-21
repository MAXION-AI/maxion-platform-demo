import type { WorkflowId } from "../initiatives"
import { packageFor, packageScenario, SCENARIOS, type ArtifactSpec, type ReleaseWindow, type Scenario, type StepTemplate, type WorkTemplate } from "./scenarios"
import type { ActivityEvent, AgentixState, Artifact, ArtifactVersion, Decision, DiscoveryLink, Engagement, ObjectRef, Release, ScopeRef, WaitReason, WorkItem } from "./types"

/*
 * The one transition authority. Every change to Agentix state, whether it
 * comes from the demo clock, a button, a decision card or the composer, goes
 * through a function in this file, so the work list, the result previews, the
 * activity log and the conversation always describe the same objects.
 */

export const MINUTE = 60_000
export const DAY = 24 * 60 * MINUTE
export const TICK_MS = 4000
export const EPOCH = Date.parse("2026-09-11T09:00:00Z")
export const LIMITS = { work: 240, events: 600, messages: 400, notes: 40, engagements: 50 }
/* Cases and cycles an engagement runs at once. Milestones have their own capacity. */
export const SLOTS = 3

export const isTerminal = (item: WorkItem) => item.status === "verified" || item.status === "not_completed"
export const scenarioOf = (state: AgentixState, engagementId: string): Scenario => SCENARIOS[state.engagements[engagementId].workflowId]
export const templateOf = (state: AgentixState, item: WorkItem): WorkTemplate | undefined => scenarioOf(state, item.engagementId)?.templates[item.template]
export const latest = (artifact: Artifact) => artifact.versions[artifact.versions.length - 1]
export const artifactSpec = (state: AgentixState, artifact: Artifact): ArtifactSpec | undefined => scenarioOf(state, artifact.engagementId)?.artifacts[artifact.key]
export const itemBy = (state: AgentixState, id: string) => state.work.find(item => item.id === id)
export const releaseBy = (state: AgentixState, id: string) => state.releases.find(item => item.id === id)
export const artifactBy = (state: AgentixState, id: string) => state.artifacts.find(item => item.id === id)
export const decisionBy = (state: AgentixState, id: string) => state.decisions.find(item => item.id === id)

/* A deep copy to change; the original stays as it was, so a rejected command can return it untouched. */
export function produce(state: AgentixState, recipe: (draft: AgentixState) => void): AgentixState {
	const draft = structuredClone(state)
	recipe(draft)
	return draft
}

const addNote = (notes: string[], text: string) => { notes.push(text); if (notes.length > LIMITS.notes) notes.splice(0, notes.length - LIMITS.notes) }

function linksOf(event: Pick<ActivityEvent, "workItemId" | "artifactId" | "releaseId" | "decisionId">): ObjectRef[] {
	return [
		event.decisionId ? { kind: "decision" as const, id: event.decisionId } : null,
		event.releaseId ? { kind: "release" as const, id: event.releaseId } : null,
		event.artifactId ? { kind: "artifact" as const, id: event.artifactId } : null,
		event.workItemId ? { kind: "work" as const, id: event.workItemId } : null,
	].filter((link): link is ObjectRef => link !== null)
}

export function post(draft: AgentixState, engagementId: string, scope: ScopeRef, text: string, links: ObjectRef[] = [], update = false) {
	draft.seq++
	draft.messages.push({ id: `m-${draft.seq}`, engagementId, scope, role: "agent", text, at: draft.clock, links, update })
	if (draft.messages.length > LIMITS.messages) draft.messages.splice(0, draft.messages.length - LIMITS.messages)
}

export function log(draft: AgentixState, event: Omit<ActivityEvent, "id" | "at">): ActivityEvent {
	draft.seq++
	const entry: ActivityEvent = { ...event, id: `ev-${draft.seq}`, at: draft.clock }
	draft.events.push(entry)
	if (draft.events.length > LIMITS.events) draft.events.splice(0, draft.events.length - LIMITS.events)
	if (event.material) post(draft, event.engagementId, { kind: "engagement" }, event.text, linksOf(event), true)
	return entry
}

/* ---- Time --------------------------------------------------------------- */
/*
 * Schedules are London wall-clock times, whatever the season: 06:00 London is
 * 05:00 UTC in summer and 06:00 UTC in winter. The demo can start on any date,
 * so every schedule is computed in London time rather than a fixed UTC hour.
 */
const LONDON_PARTS = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23", weekday: "short" })
export function londonParts(at: number) {
	const parts = Object.fromEntries(LONDON_PARTS.formatToParts(new Date(at)).map(part => [part.type, part.value]))
	return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute), weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday) }
}
const londonOffset = (at: number) => { const p = londonParts(at); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(at / 60000) * 60000 }
/* The instant a London wall-clock time happens on the London calendar day `days` after the day of `from`. */
export function londonTimeOn(from: number, days: number, hour: number, minute = 0) {
	const p = londonParts(from)
	const wall = Date.UTC(p.year, p.month - 1, p.day + days, hour, minute)
	const guess = wall - londonOffset(wall)
	return wall - londonOffset(guess)
}
export function nextSixAm(after: number, weekdaysOnly = false, hour = 6) {
	for (let days = 0; days < 14; days++) {
		const at = londonTimeOn(after, days, hour)
		if (at <= after) continue
		if (weekdaysOnly && [0, 6].includes(londonParts(at).weekday)) continue
		return at
	}
	return after + DAY
}
/* The most recent weekday 06:00 London at or before `at`, `back` weekdays earlier. */
export function previousWeekdayMorning(at: number, back = 0) {
	let found = -1
	for (let days = 0; days > -21; days--) {
		const morning = londonTimeOn(at, days, 6)
		if (morning > at || [0, 6].includes(londonParts(morning).weekday)) continue
		if (++found === back) return morning
	}
	return at
}
/* The agreed release window: Saturday 02:00 London. */
export const DEFAULT_RELEASE_WINDOW: ReleaseWindow = { label: "Saturday 02:00", weekday: 6, hour: 2 }
/* The window a scenario declared, or the product default. */
export const releaseWindowFor = (workflowId: WorkflowId | undefined): ReleaseWindow =>
	(workflowId && SCENARIOS[workflowId]?.releaseWindow) || DEFAULT_RELEASE_WINDOW
export const releaseWindowOf = (state: AgentixState, engagementId: string): ReleaseWindow =>
	releaseWindowFor(state.engagements[engagementId]?.workflowId)

export function nextWindow(after: number, window: ReleaseWindow = DEFAULT_RELEASE_WINDOW) {
	for (let days = 0; days < 14; days++) {
		const at = londonTimeOn(after, days, window.hour)
		if (at > after && londonParts(at).weekday === window.weekday) return at
	}
	return after + 7 * DAY
}

/* ---- Creation ------------------------------------------------------------ */
export interface ItemOptions {
	reference: string; title: string; trigger?: WorkItem["trigger"]; occurrence?: string; status?: WorkItem["status"]
	dependsOn?: WorkItem["dependsOn"]; flags?: WorkItem["flags"]; priority?: WorkItem["priority"]; started?: number
}
export function newItem(draft: AgentixState, engagementId: string, template: string, options: ItemOptions): WorkItem | null {
	const engagement = draft.engagements[engagementId]
	const spec = engagement && SCENARIOS[engagement.workflowId].templates[template]
	const id = `${engagementId}:${options.reference}`
	if (!spec || draft.work.some(item => item.id === id) || draft.work.length >= LIMITS.work) return null
	const flags = options.flags ?? {}
	const item: WorkItem = {
		id, engagementId, template, kind: spec.kind, reference: options.reference, title: options.title,
		status: options.status ?? "queued", steps: spec.steps.map(step => ({ id: step.id, status: "pending", ticks: 0 })),
		dependsOn: options.dependsOn ?? [], priority: options.priority ?? "Normal", trigger: options.trigger ?? "Event",
		occurrence: options.occurrence ?? options.reference, started: options.started ?? draft.clock,
		// An exception without a variance has no decision to evidence.
		obligations: spec.obligations.filter(obligation => obligation.id !== "decision" || flags.needsApproval).map(obligation => ({ id: obligation.id, status: "pending" })),
		effects: [], artifactIds: [], releaseIds: [], held: false, costCents: 0, flags, notes: [],
	}
	draft.work.push(item)
	return item
}

/* References continue each series (INV-20845 is followed by INV-20846); new series start from a readable base. */
const REFERENCE_BASE: Record<string, number> = { REC: 1000, CHG: 100, BKF: 200 }
export function nextReference(draft: AgentixState, engagementId: string, prefix: string) {
	const numbers = draft.work.filter(item => item.reference.startsWith(`${prefix}-`)).map(item => Number(item.reference.slice(prefix.length + 1))).filter(Number.isFinite)
	let number = (numbers.length ? Math.max(...numbers) : REFERENCE_BASE[prefix] ?? 30000) + 1
	while (draft.work.some(item => item.id === `${engagementId}:${prefix}-${number}`)) number++
	return `${prefix}-${number}`
}

const applicableChecks = (spec: ArtifactSpec, variant: string[]) => spec.checks.filter(check => !check.dependsOn || spec.dependsOn.includes(check.dependsOn) || variant.includes(check.dependsOn))

function addVersion(draft: AgentixState, artifact: Artifact, version: Omit<ArtifactVersion, "version" | "createdAt" | "checks" | "status"> & { status?: ArtifactVersion["status"] }): ArtifactVersion {
	const spec = artifactSpec(draft, artifact)!
	const entry: ArtifactVersion = { ...version, version: artifact.versions.length + 1, createdAt: draft.clock, status: version.status ?? "draft", checks: applicableChecks(spec, version.variant).map(check => ({ id: check.id, status: "pending" })) }
	for (const older of artifact.versions) if (older.status !== "released" && older.version !== artifact.productionVersion) older.status = "superseded"
	artifact.versions.push(entry)
	return entry
}

export function ensureArtifact(draft: AgentixState, item: WorkItem, key: string): Artifact | null {
	const spec = scenarioOf(draft, item.engagementId).artifacts[key]
	if (!spec) return null
	const id = `${item.engagementId}:${key}`
	let artifact = draft.artifacts.find(entry => entry.id === id)
	if (!artifact) {
		artifact = { id, engagementId: item.engagementId, kind: spec.kind, key, title: spec.title, workItemId: item.id, versions: [], dependsOn: spec.dependsOn.map(dep => `${item.engagementId}:${dep}`) }
		draft.artifacts.push(artifact)
		addVersion(draft, artifact, { author: spec.owner, summary: spec.summary, changes: spec.changes, variant: [...spec.variant], source: "build" })
	}
	if (!item.artifactIds.includes(id)) item.artifactIds.push(id)
	return artifact
}

/* ---- Queries -------------------------------------------------------------- */
function dependencyMet(draft: AgentixState, engagementId: string, dependency: WorkItem["dependsOn"][number]) {
	const other = draft.work.find(item => item.id === dependency.id && item.engagementId === engagementId)
	if (!other) return true
	if (!dependency.step) return other.status === "verified"
	return other.steps.find(step => step.id === dependency.step)?.status === "done"
}
function currentSteps(template: WorkTemplate, item: WorkItem) {
	const first = item.steps.findIndex(step => step.status !== "done" && step.status !== "skipped")
	if (first < 0) return []
	const group = template.steps[first].group
	if (!group) return [first]
	return template.steps.map((step, index) => step.group === group && item.steps[index].status !== "done" && item.steps[index].status !== "skipped" ? index : -1).filter(index => index >= 0)
}
const meet = (item: WorkItem, id: string | undefined, evidence?: string) => {
	const obligation = id ? item.obligations.find(entry => entry.id === id) : undefined
	if (obligation) { obligation.status = "met"; if (evidence) obligation.evidence = evidence }
}
export const occupying = (item: WorkItem) => item.kind !== "milestone" && (item.status === "working" || item.status === "verifying")

/* ---- The work loop ---------------------------------------------------- */
type StepResult = { kind: "done" } | { kind: "working" } | { kind: "wait"; reason: WaitReason } | { kind: "partial"; reason: WaitReason } | { kind: "failed" }

function complete(draft: AgentixState, item: WorkItem, template: StepTemplate, index: number, text = template.done) {
	const step = item.steps[index]
	step.status = "done"; step.doneAt = draft.clock
	item.costCents += 3
	if (template.obligation && template.kind !== "notify") meet(item, template.obligation, template.evidence?.[0] ?? `${template.system ?? "Agentix"} · ${item.reference}`)
	log(draft, { engagementId: item.engagementId, workItemId: item.id, actor: template.owner, kind: "step", text: `${item.reference}: ${text}.`, tone: "positive", operations: template.tools })
}

function runTest(draft: AgentixState, item: WorkItem, template: StepTemplate, index: number): StepResult {
	const step = item.steps[index]
	const artifact = ensureArtifact(draft, item, template.artifact!)!
	const spec = artifactSpec(draft, artifact)!
	const version = latest(artifact)
	if (step.status === "pending" || step.status === "failed") { step.status = "working"; step.startedAt ??= draft.clock; step.ticks = 0 }
	if (item.stage === "repairing") {
		const failing = version.checks.find(check => check.status === "failed" && spec.repair?.[check.id])
		const fix = failing ? spec.repair![failing.id] : undefined
		item.stage = undefined
		if (!fix) return { kind: "working" }
		const attempt = artifact.versions.filter(entry => entry.source === "repair").length + 1
		// A repair supersedes the variant that caused the failure, whichever scenario declared it.
		const next = addVersion(draft, artifact, { author: spec.owner, summary: fix.summary, changes: [fix.change], variant: [...version.variant.filter(value => value !== fix.replaces), fix.variant], source: "repair" })
		step.ticks = 0
		log(draft, { engagementId: item.engagementId, workItemId: item.id, artifactId: artifact.id, actor: spec.owner, kind: "repair", text: `${item.reference}: repaired automatically (attempt ${attempt} of 2): ${fix.change}. Built ${artifact.title.toLowerCase()} v${next.version}; checks run again.`, tone: "live", operations: [`Change set · ${fix.change}`] })
		return { kind: "working" }
	}
	if (version.checks.every(check => check.status === "pending" || check.status === "invalidated")) {
		for (const check of version.checks) check.status = "running"
		version.status = "testing"
		step.ticks = 0
		return { kind: "working" }
	}
	if (version.checks.some(check => check.status === "running")) {
		step.ticks++
		if (step.ticks < (template.ticks ?? 1)) return { kind: "working" }
		for (const check of version.checks) {
			if (check.status !== "running") continue
			const failure = spec.fails?.(version.variant, check.id) ?? null
			check.status = failure ? "failed" : "passed"
			check.detail = failure ?? undefined
		}
		item.costCents += 4
	}
	const failed = version.checks.filter(check => check.status === "failed")
	const scope = spec.checks[0]?.scope.replace(/^Isolated test · /, "") ?? "isolated test"
	const operations = version.checks.map(check => `${check.status === "passed" ? "Passed" : "Failed"} · ${spec.checks.find(entry => entry.id === check.id)?.label ?? check.id}${check.detail ? ` — ${check.detail}` : ""}`)
	if (!failed.length) {
		version.status = "tested"
		complete(draft, item, template, index, `${artifact.title} v${version.version} passed ${version.checks.length} of ${version.checks.length} checks in isolation`)
		log(draft, { engagementId: item.engagementId, workItemId: item.id, artifactId: artifact.id, actor: spec.owner, kind: "check", text: `${artifact.title} v${version.version} passed all ${version.checks.length} isolated checks (${scope}). A passed test isn't a production result.`, tone: "positive", operations, material: true })
		return { kind: "done" }
	}
	version.status = "failed"
	const repairs = artifact.versions.filter(entry => entry.source === "repair").length
	const fixable = failed.some(check => spec.repair?.[check.id])
	log(draft, { engagementId: item.engagementId, workItemId: item.id, artifactId: artifact.id, actor: spec.owner, kind: "check", text: `${artifact.title} v${version.version} failed ${failed.length} of ${version.checks.length} isolated checks. ${fixable && repairs < 2 ? "Repairing automatically within its limit." : "Automatic repair has reached its limit."}`, tone: fixable && repairs < 2 ? "attention" : "danger", operations, material: !(fixable && repairs < 2) })
	if (fixable && repairs < 2) { item.stage = "repairing"; step.ticks = 0; return { kind: "working" } }
	step.status = "failed"
	return { kind: "failed" }
}

function createRelease(draft: AgentixState, engagement: Engagement, item: WorkItem, artifact: Artifact, version: ArtifactVersion): Release {
	const spec = artifactSpec(draft, artifact)!
	const count = draft.releases.filter(entry => entry.engagementId === engagement.id).length + 1
	const authority: Release["authority"] = spec.release?.authority === "policy" ? "policy" : spec.release?.authority === "answer" && engagement.answers.release === "window" ? "policy" : "approval"
	const windowOnly = spec.release?.authority === "answer" && engagement.answers.release === "window"
	const release: Release = { id: `${engagement.id}:REL-${count}`, reference: `REL-${count}`, engagementId: engagement.id, workItemId: item.id, artifactId: artifact.id, version: version.version, target: spec.release?.target ?? artifact.title, status: "preparing", authority, windowOnly, attempts: 0, effectId: `${engagement.id}:REL-${count}:apply`, createdAt: draft.clock }
	draft.releases.push(release)
	item.releaseIds.push(release.id)
	return release
}

/* A release applies only under a pre-authorizing policy or a resolved approval. Holds, chat and demo controls never stand in for approval. */
export function releaseAuthorized(state: AgentixState, release: Release) {
	if (release.authority === "policy") return true
	const decision = release.decisionId ? decisionBy(state, release.decisionId) : undefined
	return decision?.status === "resolved" && (decision.choice === "approve" || decision.choice === "window")
}

function applyRelease(draft: AgentixState, release: Release, artifact: Artifact) {
	const previous = artifact.productionVersion
	release.status = "applied"; release.appliedAt = draft.clock
	artifact.productionVersion = release.version
	for (const version of artifact.versions) {
		if (version.version === release.version) version.status = "released"
		else if (version.version === previous) version.status = "superseded"
	}
}

/* A release that must follow another item's step (the dashboard after the pipeline's release) waits until that step is done. */
function releaseAfter(draft: AgentixState, item: WorkItem, template: StepTemplate): WaitReason | undefined {
	const after = template.after
	if (!after) return undefined
	// Once this item's own release has been dispatched it can't be un-sent, so it never waits again.
	const own = item.releaseIds.map(id => releaseBy(draft, id)).filter(entry => entry && entry.status !== "superseded").at(-1)
	if (own && (own.status === "releasing" || own.status === "unknown" || own.status === "applied" || own.status === "verified")) return undefined
	const others = draft.work.filter(entry => entry.engagementId === item.engagementId && entry.template === after.template)
	if (others.some(entry => entry.steps.find(step => step.id === after.step)?.status === "done")) return undefined
	// What this release really needs is a live version of the other artifact; a newer version still in test doesn't block it.
	if (others.some(entry => entry.artifactIds.some(id => artifactBy(draft, id)?.productionVersion !== undefined))) return undefined
	// Name what is actually pending: a release still in progress, or the other item's step. Stopped or kept-in-test releases aren't pending.
	const pending = others.flatMap(entry => entry.releaseIds).map(id => releaseBy(draft, id)).filter(entry => entry && !["superseded", "applied", "verified", "stopped", "declined"].includes(entry.status)).at(-1)
	if (pending) return { kind: "release", releaseId: pending.id }
	const other = others.at(-1)
	return other ? { kind: "dependency", on: other.id, step: after.step } : { kind: "release", releaseId: "" }
}

function runRelease(draft: AgentixState, item: WorkItem, template: StepTemplate, index: number): StepResult {
	const step = item.steps[index]
	const engagement = draft.engagements[item.engagementId]
	const blocked = releaseAfter(draft, item, template)
	if (blocked) return { kind: "wait", reason: blocked }
	const artifact = ensureArtifact(draft, item, template.artifact!)!
	const version = latest(artifact)
	if (version.status !== "tested" && version.status !== "released") {
		// A change after testing sends the item back to test the new version.
		const test = templateOf(draft, item)!.steps.findIndex(entry => entry.kind === "test" && entry.artifact === template.artifact)
		if (test >= 0) for (let at = test; at < item.steps.length; at++) item.steps[at] = { id: item.steps[at].id, status: "pending", ticks: 0 }
		return { kind: "working" }
	}
	if (step.status === "pending") { step.status = "working"; step.startedAt = draft.clock }
	let release = draft.releases.find(entry => entry.workItemId === item.id && entry.artifactId === artifact.id && entry.version === version.version && entry.status !== "superseded")
	if (!release) release = createRelease(draft, engagement, item, artifact, version)
	const refs = { engagementId: item.engagementId, workItemId: item.id, artifactId: artifact.id, releaseId: release.id }
	switch (release.status) {
		case "preparing": {
			if (engagement.permission === "lost") {
				release.status = "blocked"
				log(draft, { ...refs, actor: "coordinator", kind: "release", text: `${release.reference} is blocked: the release adapter's role lost write access to the target. Nothing was released; the tested version is kept.`, tone: "danger", material: true })
				return { kind: "wait", reason: { kind: "permission", system: release.target } }
			}
			if (release.authority === "approval" && !release.decisionId) {
				const decision = openDecision(draft, item, "release", `${release.reference} · ${artifact.title} v${version.version}`)
				release.decisionId = decision.id; release.status = "awaiting_approval"
				log(draft, { ...refs, decisionId: decision.id, actor: "coordinator", kind: "decision", text: `Release approval needed: ${artifact.title.toLowerCase()} v${version.version} to production.`, tone: "attention", material: true })
				return { kind: "wait", reason: { kind: "decision", decisionId: decision.id } }
			}
			if (release.windowOnly) {
				const window = releaseWindowOf(draft, release.engagementId)
				release.status = "held"; release.holdUntil = nextWindow(draft.clock, window); release.ownerHold = false
				log(draft, { ...refs, actor: "coordinator", kind: "release", text: `${release.reference} waits for the ${window.label} window under your release policy.`, tone: "neutral" })
				return { kind: "wait", reason: { kind: "window", until: release.holdUntil } }
			}
			release.status = "releasing"
			return { kind: "working" }
		}
		case "blocked":
			if (engagement.permission === "lost") return { kind: "wait", reason: { kind: "permission", system: release.target } }
			release.status = "preparing"
			log(draft, { ...refs, actor: "coordinator", kind: "release", text: `${release.reference}: release permission is back. Continuing under the same policy.`, tone: "live" })
			return { kind: "working" }
		case "awaiting_approval":
			return { kind: "wait", reason: { kind: "decision", decisionId: release.decisionId! } }
		case "held":
			if (release.holdUntil && draft.clock >= release.holdUntil) {
				release.ownerHold = false
				if (releaseAuthorized(draft, release)) { release.status = "releasing"; return { kind: "working" } }
				// Reaching the window isn't approval: an unapproved release asks again.
				release.status = "preparing"; release.decisionId = undefined; release.holdUntil = undefined
				return { kind: "working" }
			}
			return { kind: "wait", reason: release.holdUntil ? { kind: "window", until: release.holdUntil } : { kind: "hold" } }
		case "stopped":
		case "declined":
			return { kind: "wait", reason: { kind: "hold" } }
		case "releasing": {
			if (engagement.permission === "lost") {
				release.status = "blocked"
				log(draft, { ...refs, actor: "coordinator", kind: "release", text: `${release.reference} stopped before applying: the release adapter's role lost write access. Nothing was released.`, tone: "danger", material: true })
				return { kind: "wait", reason: { kind: "permission", system: release.target } }
			}
			release.attempts++
			item.effects.push({ id: release.effectId, system: release.target, operation: `Apply ${artifact.title.toLowerCase()} v${version.version}`, sends: 1, status: "unknown" })
			const scripted = artifact.key === "pipeline" && !draft.releases.some(entry => entry.artifactId === artifact.id && entry.id !== release!.id && ["applied", "verified"].includes(entry.status))
			if (draft.demo.ackLoss || scripted) {
				draft.demo.ackLoss = false
				release.status = "unknown"; item.stage = "reconciling"; step.ticks = 0
				log(draft, { ...refs, actor: "coordinator", kind: "release", text: `${release.reference} outcome unknown: the release adapter timed out after dispatch. It may have applied, so nothing is resent; reconciling first.`, tone: "attention", material: true, operations: ["Release adapter · apply (1 dispatch) · no acknowledgement"] })
				return { kind: "working" }
			}
			applyRelease(draft, release, artifact)
			const effect = item.effects.find(entry => entry.id === release!.effectId)!
			effect.status = "applied"
			complete(draft, item, template, index, `released ${artifact.title.toLowerCase()} v${version.version}; applied once`)
			log(draft, { ...refs, actor: "coordinator", kind: "release", text: `${release.reference} applied: ${artifact.title.toLowerCase()} v${version.version} is live in ${release.target.split(" (")[0]}. Verification follows.`, tone: "positive", material: true })
			return { kind: "done" }
		}
		case "unknown": {
			// Reconciliation reads the target back before anything else happens; it never resends.
			step.ticks++
			if (step.ticks < 3) return { kind: "working" }
			applyRelease(draft, release, artifact)
			const effect = item.effects.find(entry => entry.id === release!.effectId)
			// What the read-back found is this engagement's own release target, never another demo's.
			const readBack = SCENARIOS[draft.engagements[item.engagementId].workflowId].delivery?.releaseReadBack
			if (effect) { effect.status = "applied"; effect.reference = artifact.key === "pipeline" && readBack ? readBack.reference : `v${version.version}` }
			item.stage = undefined
			complete(draft, item, template, index, `reconciled ${release.reference}; applied once, no retry`)
			log(draft, { ...refs, actor: "coordinator", kind: "release", text: `${release.reference} reconciled: read-back found ${artifact.key === "pipeline" && readBack ? readBack.found : `v${version.version} published`}. Applied once; no retry was sent.`, tone: "positive", material: true, operations: ["Read back target version", "Dispatches: 1 · duplicates: 0"] })
			return { kind: "done" }
		}
		default:
			if (step.status !== "done") complete(draft, item, template, index)
			return { kind: "done" }
	}
}

export function openDecision(draft: AgentixState, item: WorkItem, template: string, binding: string): Decision {
	const existing = draft.decisions.find(entry => entry.workItemId === item.id && entry.template === template && entry.status === "open")
	if (existing) return existing
	draft.seq++
	const spec = scenarioOf(draft, item.engagementId).decisions[template]
	const decision: Decision = { id: `${item.id}:${template}:${draft.seq}`, engagementId: item.engagementId, workItemId: item.id, kind: spec?.kind ?? "question", template, status: "open", binding }
	draft.decisions.push(decision)
	return decision
}

function runStep(draft: AgentixState, item: WorkItem, template: StepTemplate, index: number): StepResult {
	const step = item.steps[index]
	const engagement = draft.engagements[item.engagementId]
	switch (template.kind) {
		case "test": return runTest(draft, item, template, index)
		case "release": return runRelease(draft, item, template, index)
		case "decision": {
			if (template.decision === "variance" && !item.flags.needsApproval) { step.status = "skipped"; return { kind: "done" } }
			const decided = draft.decisions.find(entry => entry.workItemId === item.id && entry.template === template.decision && entry.status === "resolved")
			if (decided) { if (step.status !== "done") complete(draft, item, template, index); return { kind: "done" } }
			// A decision binds to the artifact it names, or to the wording its scenario declared —
			// never to a decision template's name, which differs in every scenario.
			const decisionSpec = scenarioOf(draft, item.engagementId).decisions[template.decision!]
			const artifact = decisionSpec?.artifact ? ensureArtifact(draft, item, decisionSpec.artifact) : null
			const binding = artifact ? `${artifact.title} v${latest(artifact).version}` : decisionSpec?.binding ? `${item.reference} ${decisionSpec.binding}` : item.reference
			const fresh = !draft.decisions.some(entry => entry.workItemId === item.id && entry.template === template.decision)
			const decision = openDecision(draft, item, template.decision!, binding)
			step.status = "waiting"
			if (fresh) {
				const spec = decisionSpec
				log(draft, { engagementId: item.engagementId, workItemId: item.id, decisionId: decision.id, artifactId: artifact?.id, actor: spec?.kind === "approval" ? "analyst" : "data", kind: "decision", text: `Decision needed on ${item.reference}: ${spec?.title ?? template.title}`, tone: "attention", material: true })
			}
			return { kind: "wait", reason: { kind: "decision", decisionId: decision.id } }
		}
		case "human":
			if (item.humanReference) { complete(draft, item, template, index, `owner confirmation ${item.humanReference} attached`); meet(item, template.obligation, item.humanReference); return { kind: "done" } }
			step.status = "waiting"
			return { kind: "wait", reason: { kind: "human", owner: "Payroll owner" } }
		case "write": {
			const id = `${item.id}:${template.id}`
			let effect = item.effects.find(entry => entry.id === id)
			if (step.status === "pending") { step.status = "working"; step.startedAt = draft.clock }
			if (!effect) {
				effect = { id, system: template.system ?? "System", operation: template.title, sends: 1, status: item.flags.writeTimeout && !item.flags.reconciled ? "unknown" : "applied" }
				item.effects.push(effect)
				item.costCents += 4
				if (effect.status === "unknown") {
					item.stage = "reconciling"
					log(draft, { engagementId: item.engagementId, workItemId: item.id, actor: template.owner, kind: "effect", text: `${item.reference}: ${template.system} didn't confirm the ${template.kind === "write" ? "update" : "request"}. It may have succeeded, so nothing is resent; reconciling the original request.`, tone: "attention", operations: [`${template.system} · 1 dispatch · no acknowledgement`] })
					return { kind: "working" }
				}
				complete(draft, item, template, index)
				return { kind: "done" }
			}
			if (effect.status === "unknown") {
				effect.status = "applied"; effect.reference = engagement.workflowId === "inventory" ? "REQ-72018" : `EXC-${item.reference.replace(/^\D+-/, "")}`
				item.flags.reconciled = true; item.stage = undefined
				complete(draft, item, template, index, `original request found (${effect.reference}); one ${engagement.workflowId === "inventory" ? "create" : "write"}, no duplicate`)
				return { kind: "done" }
			}
			if (step.status !== "done") complete(draft, item, template, index)
			return { kind: "done" }
		}
		case "notify": {
			const obligation = item.obligations.find(entry => entry.id === "notified")
			const reason: WaitReason | null = engagement.connection === "expired" ? { kind: "connection", system: template.system ?? "Microsoft Teams" } : engagement.holdNotifications || item.held ? { kind: "hold" } : null
			if (reason) {
				if (obligation && obligation.status !== "outstanding") {
					obligation.status = "outstanding"
					log(draft, { engagementId: item.engagementId, workItemId: item.id, actor: template.owner, kind: "notice", text: `${item.reference}: record work is kept; the notification is outstanding because ${reason.kind === "connection" ? "the notification connection expired" : "notifications are held"}. Nothing will be repeated.`, tone: "attention" })
				}
				step.status = "waiting"
				return { kind: "partial", reason }
			}
			complete(draft, item, template, index)
			meet(item, "notified", `${template.system} acceptance receipt`)
			return { kind: "done" }
		}
		default: {
			if (step.status === "pending") { step.status = "working"; step.startedAt = draft.clock; step.ticks = 0 }
			step.ticks++
			if (step.ticks < (template.ticks ?? 1)) return { kind: "working" }
			if (template.kind === "build" && template.artifact) ensureArtifact(draft, item, template.artifact)
			complete(draft, item, template, index)
			return { kind: "done" }
		}
	}
}

function finish(draft: AgentixState, item: WorkItem) {
	for (const obligation of item.obligations) if (obligation.status === "pending") obligation.status = "met"
	const open = item.obligations.filter(obligation => obligation.status !== "met")
	if (open.length) { item.status = "partial"; return }
	item.status = "verified"; item.finished = draft.clock; item.wait = undefined
	for (const id of item.releaseIds) { const release = releaseBy(draft, id); if (release?.status === "applied") { release.status = "verified"; release.verifiedAt = draft.clock } }
	const material = item.kind !== "case"
	log(draft, { engagementId: item.engagementId, workItemId: item.id, actor: "coordinator", kind: item.kind === "cycle" ? "cycle" : "step", text: `${item.reference} verified: ${item.title}. Every required outcome has evidence.`, tone: "positive", material })
	onVerified(draft, item)
}

/* Scenario hooks: what a verified milestone or cycle adds to the engagement. */
function onVerified(draft: AgentixState, item: WorkItem) {
	const engagement = draft.engagements[item.engagementId]
	const delivery = SCENARIOS[engagement.workflowId].delivery
	if (!delivery) return
	if (item.template === "pipeline" || item.template === "cycle") {
		const evidence = ensureArtifact(draft, item, "reconciliation")!
		// A cycle reconciles the ledger day before its occurrence; the first load reconciles the day before it ran.
		const basis = item.template === "cycle" && item.occurrence && Number.isFinite(Date.parse(item.occurrence)) ? Date.parse(item.occurrence) : draft.clock
		const day = new Date(basis - DAY).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" })
		const record = (version: number, basis: string) => log(draft, { engagementId: engagement.id, workItemId: item.id, artifactId: evidence.id, actor: "analyst", kind: "check", text: delivery.evidence.text(version, basis, day), tone: "positive", operations: delivery.evidence.operations })
		if (item.template === "pipeline" && evidence.versions.length === 1) { evidence.versions[0].summary = delivery.evidence.summary(day, item.reference, true); evidence.versions[0].status = "released"; evidence.productionVersion = 1; record(1, `${item.reference}'s first production load`) }
		else if (item.template === "cycle") { const version = addVersion(draft, evidence, { author: "analyst", summary: delivery.evidence.summary(day, item.reference, false), changes: [], variant: [], source: "build", status: "released" }); evidence.productionVersion = version.version; record(version.version, item.reference) }
	}
	if (item.template === "dashboard") {
		const runbook = ensureArtifact(draft, item, "runbook")
		const live = artifactBy(draft, `${item.engagementId}:dashboard`)?.productionVersion
		const dashboardChanges = artifactBy(draft, `${item.engagementId}:dashboard`)?.versions.find(entry => entry.version === live)?.changes ?? []
		if (runbook && runbook.productionVersion !== undefined && live && live > 1 && !latest(runbook).summary.includes(`dashboard v${live}`)) {
			const next = addVersion(draft, runbook, { author: "coordinator", summary: `Updated for ${delivery.dashboardNoun} v${live}`, changes: dashboardChanges.length ? dashboardChanges : [`Follows ${delivery.dashboardNoun} v${live}`], variant: [...latest(runbook).variant], source: "build", status: "released" })
			runbook.productionVersion = next.version
			log(draft, { engagementId: engagement.id, workItemId: item.id, artifactId: runbook.id, actor: "coordinator", kind: "version", text: `Operating runbook v${next.version} written for ${delivery.dashboardNoun} v${live}: ${dashboardChanges.join("; ").toLowerCase() || "what changed on the dashboard"}.`, tone: "positive" })
		} else if (runbook && runbook.productionVersion === undefined) {
			latest(runbook).status = "released"; runbook.productionVersion = latest(runbook).version
			log(draft, { engagementId: engagement.id, workItemId: item.id, artifactId: runbook.id, actor: "coordinator", kind: "version", text: `Operating runbook v${runbook.productionVersion} written from the verified delivery: daily schedule, what is verified, what needs a person and recovery.`, tone: "positive", operations: [`Based on ${item.reference} and the released pipeline`] })
		}
	}
	const delivered = ["pipeline", "dashboard"].every(template => draft.work.some(entry => entry.engagementId === engagement.id && entry.template === template && entry.status === "verified"))
	if (delivered && engagement.cycles === "off") {
		engagement.cycles = "daily"
		engagement.nextOccurrence = new Date(nextSixAm(draft.clock, false, delivery.cycle.hour)).toISOString()
		log(draft, { engagementId: engagement.id, actor: "coordinator", kind: "cycle", text: `Delivery verified. ${engagement.name} now runs a daily ${delivery.cycle.noun} at ${String(delivery.cycle.hour).padStart(2, "0")}:00 London; the first cycle is ${new Date(engagement.nextOccurrence).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`, tone: "positive", material: true })
	}
}

function advanceItem(draft: AgentixState, item: WorkItem, busy: Record<string, number>) {
	const engagement = draft.engagements[item.engagementId]
	const template = engagement ? SCENARIOS[engagement.workflowId].templates[item.template] : undefined
	if (!engagement || !template || engagement.status === "draft" || isTerminal(item) || item.status === "paused" || item.status === "scheduled" || item.status === "failed") return
	const counts = item.kind !== "milestone"
	if (item.status === "queued") {
		if (counts && engagement.status === "paused") { item.wait = { kind: "intake" }; return }
		if (counts && (busy[engagement.id] ?? 0) >= SLOTS) { item.wait = { kind: "slot" }; return }
	}
	if (item.steps.every(step => step.status === "pending")) {
		const unmet = item.dependsOn.find(dependency => !dependencyMet(draft, item.engagementId, dependency))
		if (unmet) { item.status = "waiting"; item.wait = { kind: "dependency", on: unmet.id, step: unmet.step }; return }
	}
	if (item.status === "queued" || (item.status === "waiting" && item.wait?.kind === "dependency")) {
		if (item.status === "waiting") log(draft, { engagementId: item.engagementId, workItemId: item.id, actor: template.steps[0].owner, kind: "step", text: `${item.reference} can start: its dependency is ready.`, tone: "live" })
		item.status = "working"; item.wait = undefined
		if (counts) busy[engagement.id] = (busy[engagement.id] ?? 0) + 1
		if (item.steps.every(step => step.status === "pending")) item.started = draft.clock
		return
	}
	const indexes = currentSteps(template, item)
	if (!indexes.length) { finish(draft, item); return }
	let wait: WaitReason | undefined
	let partial = false
	for (const index of indexes) {
		const result = runStep(draft, item, template.steps[index], index)
		if (result.kind === "failed") { item.status = "failed"; item.wait = undefined; return }
		if (result.kind === "wait") wait ??= result.reason
		if (result.kind === "partial") { partial = true; wait ??= result.reason }
	}
	const next = currentSteps(template, item)
	if (!next.length) { finish(draft, item); return }
	if (partial) { item.status = "partial"; item.wait = wait; return }
	wait ??= template.steps[next[0]].kind === "release" && item.steps[next[0]].status === "pending" ? releaseAfter(draft, item, template.steps[next[0]]) : undefined
	// A decision that comes next is raised in the same minute, so no screen says the work waits for
	// the owner before the owner has anything to answer.
	if (!wait && template.steps[next[0]].kind === "decision" && item.steps[next[0]].status === "pending") {
		const result = runStep(draft, item, template.steps[next[0]], next[0])
		if (result.kind === "wait") wait = result.reason
	}
	if (wait) { item.status = "waiting"; item.wait = wait; return }
	item.status = template.steps[next[0]].kind === "verify" || template.steps[next[0]].kind === "notify" ? "verifying" : "working"
	item.wait = undefined
}

/* ---- The demo clock ---------------------------------------------------- */
function admitScheduled(draft: AgentixState) {
	for (const engagement of Object.values(draft.engagements)) {
		if (engagement.status !== "active" || engagement.cycles === "off") continue
		const due = Date.parse(engagement.nextOccurrence)
		if (!Number.isFinite(due) || due > draft.clock) continue
		admitCycle(draft, engagement.id)
	}
}

export function admitCycle(draft: AgentixState, engagementId: string, early = false) {
	const engagement = draft.engagements[engagementId]
	const scenario = SCENARIOS[engagement.workflowId]
	const occurrence = engagement.nextOccurrence
	if (!scenario.cycleTemplate || draft.work.some(item => item.engagementId === engagementId && item.occurrence === occurrence)) return
	const reference = nextReference(draft, engagementId, engagement.workflowId === "invoice" ? "REC" : scenario.prefix)
	const day = new Date(occurrence).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" })
	// A scheduled cycle is named for the operation this engagement actually runs.
	const cycleNoun = SCENARIOS[engagement.workflowId].delivery?.cycle.noun
	const title = cycleNoun ? `Daily ${cycleNoun} · ${day}` : `${engagement.id === engagement.workflowId ? "London warehouse" : engagement.name} · ${day} review`
	const item = newItem(draft, engagementId, scenario.cycleTemplate, { reference, title, trigger: "Schedule", occurrence })
	engagement.nextOccurrence = new Date(nextSixAm(Date.parse(occurrence), engagement.cycles === "weekdays")).toISOString()
	const when = new Date(occurrence).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
	if (item) log(draft, { engagementId, workItemId: item.id, actor: "coordinator", kind: "cycle", text: early ? `${reference} started early from Demo controls for the ${when} occurrence: ${title}.` : `${reference} started on schedule: ${title}.`, tone: "live" })
}

function admitIncoming(draft: AgentixState, engagementId: string) {
	const engagement = draft.engagements[engagementId]
	// A notification outage holds only notifications; new work is still accepted.
	if (!engagement || engagement.status !== "active") return
	const scenario = SCENARIOS[engagement.workflowId]
	const waiting = draft.work.filter(item => item.engagementId === engagementId && !isTerminal(item) && (item.status === "waiting" || item.status === "partial" || (item.flags.needsApproval && !item.flags.approved))).length
	if (waiting >= 3) return
	const count = draft.work.filter(item => item.engagementId === engagementId).length
	const reference = nextReference(draft, engagementId, scenario.prefix)
	const title = scenario.incoming[count % scenario.incoming.length]
	const item = newItem(draft, engagementId, scenario.caseTemplate, { reference, title, trigger: "Event", occurrence: `incoming:${draft.clock}`, // A case needs the owner where its own template stops for an approval decision.
		flags: scenario.templates[scenario.caseTemplate].steps.some(step => step.kind === "decision") ? { needsApproval: true } : {} })
	if (item) log(draft, { engagementId, workItemId: item.id, actor: "coordinator", kind: "assignment", text: `${reference} arrived: ${title}.`, tone: "neutral" })
}

export function tick(state: AgentixState): AgentixState {
	return produce(state, draft => {
		draft.clock += MINUTE
		for (const engagement of Object.values(draft.engagements)) {
			if (!engagement.checking) continue
			engagement.checking = false
			engagement.checked = !!(engagement.workflowId !== "onboarding" || engagement.mapping) && !engagement.automaticPayroll && engagement.connection === "ready"
			log(draft, { engagementId: engagement.id, actor: "coordinator", kind: "notice", text: engagement.checked ? "Read-only recheck passed. Scope, mapping and verification path are current." : "Recheck finished; something still needs attention.", tone: engagement.checked ? "positive" : "attention", material: engagement.status !== "draft" })
		}
		applyPending(draft)
		admitScheduled(draft)
		const busy: Record<string, number> = {}
		for (const item of draft.work) if (occupying(item)) busy[item.engagementId] = (busy[item.engagementId] ?? 0) + 1
		const order = [...draft.work].filter(item => !isTerminal(item)).sort((a, b) => Number(b.priority === "High") - Number(a.priority === "High"))
		for (const item of order) advanceItem(draft, item, busy)
		const minutes = Math.round((draft.clock - EPOCH) / MINUTE)
		// In the customer demo, intake is quiet: new work arrives only when the presenter adds it.
		if (minutes % 12 === 0 && !draft.demo.quiet) {
			const invoice = minutes % 24 === 0
			for (const engagement of Object.values(draft.engagements)) {
				if (engagement.trigger !== "Event" || engagement.status !== "active") continue
				if (engagement.id.startsWith("eng-") || engagement.id === (invoice ? "invoice" : "service")) admitIncoming(draft, engagement.id)
			}
		}
	})
}

/* Changes a composer instruction queued: amendments and assignments take effect on the next demo minute, so "queued" and "applied" are observably different. */
function applyPending(draft: AgentixState) {
	for (const message of draft.messages) {
		const waiting = message.instruction?.status === "queued" || message.instruction?.status === "awaiting"
		const pending = waiting ? message.instruction!.pending : undefined
		if (!pending || !message.instruction) continue
		if (pending.kind === "amend") {
			const outcome = amendInDraft(draft, pending.artifactId, pending.change, message.id)
			if (outcome.locked) {
				if (message.instruction.status !== "awaiting") { message.instruction.status = "awaiting"; post(draft, message.engagementId, message.scope, outcome.text, outcome.links) }
				continue
			}
			message.instruction.status = outcome.ok ? "applied" : "failed"
			message.instruction.links = outcome.links
			post(draft, message.engagementId, message.scope, outcome.text, outcome.links)
		} else {
			const item = assignInDraft(draft, message.engagementId, pending.template, pending.title)
			message.instruction.status = item ? "applied" : "failed"
			message.instruction.links = item ? [{ kind: "work", id: item.id }] : []
			post(draft, message.engagementId, message.scope, item ? `Assigned ${item.reference}: ${item.title}. ${ownerName(draft, item)} took it on; no new agent was created.` : "I couldn't create that work item: the demo's work limit is reached or the engagement isn't active. Your instruction is kept above.", message.instruction.links)
		}
	}
}

const ownerName = (draft: AgentixState, item: WorkItem) => {
	const scenario = scenarioOf(draft, item.engagementId)
	const owner = scenario.templates[item.template]?.steps[0]?.owner
	return scenario.team.find(member => member.id === owner)?.name ?? "The accountable agent"
}

/* ---- Owner actions ------------------------------------------------------ */
export type WorkAction = "pause" | "resume" | "prioritize" | "hold" | "release-hold" | "request-release" | "retry"
export function actOnWork(state: AgentixState, id: string, action: WorkAction): AgentixState {
	const item = itemBy(state, id)
	if (!item) return state
	const allowed = action === "pause" ? !isTerminal(item) && item.status !== "paused" && item.status !== "failed"
		: action === "resume" ? item.status === "paused"
		: action === "prioritize" ? !isTerminal(item) && item.priority !== "High"
		: action === "hold" ? !isTerminal(item) && !item.held
		: action === "release-hold" ? item.held
		: action === "request-release" ? state.releases.some(release => release.workItemId === id && (release.status === "declined" || release.status === "stopped"))
		: item.status === "failed"
	if (!allowed) return state
	return produce(state, draft => {
		const target = itemBy(draft, id)!
		const refs = { engagementId: target.engagementId, workItemId: target.id, actor: "owner" }
		if (action === "pause") { target.pausedFrom = target.status; target.status = "paused"; log(draft, { ...refs, kind: "instruction", text: `You paused ${target.reference} before its next action. Its progress is kept; other work continues.`, tone: "neutral" }) }
		if (action === "resume") { target.status = target.pausedFrom === "partial" ? "partial" : "queued"; target.pausedFrom = undefined; log(draft, { ...refs, kind: "instruction", text: `You resumed ${target.reference}. It continues from its checkpoint.`, tone: "live" }) }
		if (action === "prioritize") { target.priority = "High"; log(draft, { ...refs, kind: "instruction", text: `You prioritized ${target.reference}. Priority affects its place in the queue, not its authority.`, tone: "neutral" }) }
		if (action === "hold") { target.held = true; log(draft, { ...refs, kind: "instruction", text: `You held ${target.reference}'s notification. It stays incomplete until you release it; completed sends can't be recalled.`, tone: "neutral" }) }
		if (action === "release-hold") { target.held = false; log(draft, { ...refs, kind: "instruction", text: `You released ${target.reference}'s notification hold.`, tone: "live" }) }
		if (action === "request-release") {
			for (const release of draft.releases) if (release.workItemId === id && (release.status === "declined" || release.status === "stopped")) release.status = "superseded"
			const step = templateOf(draft, target)!.steps.findIndex(entry => entry.kind === "release")
			if (step >= 0) target.steps[step] = { id: target.steps[step].id, status: "pending", ticks: 0 }
			target.status = "working"; target.wait = undefined
			log(draft, { ...refs, kind: "release", text: `You asked for ${target.reference}'s release again. It follows your release policy.`, tone: "live" })
		}
		if (action === "retry") {
			const step = target.steps.findIndex(entry => entry.status === "failed")
			if (step >= 0) target.steps[step].status = "pending"
			target.status = "working"; target.stage = undefined
			log(draft, { ...refs, kind: "repair", text: `You asked ${ownerName(draft, target)} to try the failed step again.`, tone: "live" })
		}
	})
}

export type ReleaseAction = "hold-window" | "release-now" | "stop" | "resume"
export function actOnRelease(state: AgentixState, id: string, action: ReleaseAction): AgentixState {
	const release = releaseBy(state, id)
	if (!release) return state
	// A hold only defers a release that is already allowed to proceed; it never replaces an approval.
	const allowed = action === "hold-window" ? release.status === "preparing" || release.status === "releasing"
		: action === "release-now" ? release.status === "held" && !!release.ownerHold
		: action === "stop" ? ["preparing", "releasing", "held", "awaiting_approval", "blocked"].includes(release.status)
		: release.status === "stopped"
	if (!allowed) return state
	return produce(state, draft => {
		const target = releaseBy(draft, id)!
		const refs = { engagementId: target.engagementId, workItemId: target.workItemId, releaseId: target.id, actor: "owner" }
		if (action === "hold-window") {
			const window = releaseWindowOf(draft, target.engagementId)
			target.ownerHold = true; target.holdUntil = nextWindow(draft.clock, window); target.status = "held"
			log(draft, { ...refs, kind: "instruction", text: `You held ${target.reference} until the ${window.label} window. Nothing is released before then.`, tone: "neutral" })
		}
		if (action === "release-now") {
			// Lifting your hold returns the release to its policy: the window policy waits for the window; approval policy asks first.
			const authorized = releaseAuthorized(draft, target) && !target.windowOnly
			target.ownerHold = false; target.holdUntil = undefined; target.status = authorized ? "releasing" : "preparing"
			if (!authorized && !target.windowOnly) target.decisionId = undefined
			log(draft, { ...refs, kind: "instruction", text: `You lifted your hold on ${target.reference}. ${target.windowOnly ? `It waits for the ${releaseWindowOf(draft, target.engagementId).label} window under your policy.` : authorized ? "It releases under your policy." : "It asks for your approval first."}`, tone: "live" })
		}
		if (action === "stop") {
			target.status = "stopped"
			const decision = target.decisionId ? decisionBy(draft, target.decisionId) : undefined
			if (decision?.status === "open") decision.status = "withdrawn"
			const owner = itemBy(draft, target.workItemId)
			if (owner && !isTerminal(owner) && owner.status !== "paused") { owner.status = "waiting"; owner.wait = { kind: "hold" } }
			log(draft, { ...refs, kind: "instruction", text: `You stopped ${target.reference} before it applied. Nothing was released; the tested version is kept.`, tone: "neutral" })
		}
		if (action === "resume") {
			const owner = itemBy(draft, target.workItemId)
			if (owner && !isTerminal(owner) && owner.status !== "paused") { owner.status = "working"; owner.wait = undefined }
			target.status = "preparing"; target.decisionId = undefined; target.holdUntil = undefined; target.ownerHold = false; log(draft, { ...refs, kind: "instruction", text: `You resumed ${target.reference}. It follows your release policy again${target.authority === "approval" ? ", so it asks for your approval first" : target.windowOnly ? `, so it waits for the ${releaseWindowOf(draft, target.engagementId).label} window` : ""}.`, tone: "live" })
		}
	})
}

export type EngagementAction = "pause-intake" | "resume-intake" | "hold-notifications" | "release-notifications" | "expire" | "reconnect" | "lose-permission" | "restore-permission" | "recheck" | "use-human-payroll" | "request-payroll" | "support"
export function actOnEngagement(state: AgentixState, id: string, action: EngagementAction): AgentixState {
	const engagement = state.engagements[id]
	if (!engagement) return state
	const allowed = action === "pause-intake" ? engagement.status === "active"
		: action === "resume-intake" ? engagement.status === "paused" && engagement.connection === "ready" && !engagement.checking && engagement.checked
		: action === "hold-notifications" ? !engagement.holdNotifications
		: action === "release-notifications" ? engagement.holdNotifications
		: action === "expire" ? engagement.status !== "draft" && engagement.connection === "ready"
		: action === "reconnect" ? engagement.connection === "expired"
		: action === "lose-permission" ? engagement.status !== "draft" && engagement.permission === "ready"
		: action === "restore-permission" ? engagement.permission === "lost"
		: action === "recheck" ? !engagement.checking && engagement.connection === "ready" && !engagement.automaticPayroll && (engagement.workflowId !== "onboarding" || !!engagement.mapping)
		: action === "use-human-payroll" || action === "request-payroll" ? engagement.status === "draft"
		: !engagement.supportRequested
	if (!allowed) return state
	return produce(state, draft => {
		const target = draft.engagements[id]
		const note = (text: string, tone: ActivityEvent["tone"] = "neutral", material = false) => { addNote(target.notes, text); log(draft, { engagementId: id, actor: "owner", kind: "notice", text, tone, material }) }
		if (action === "pause-intake") { target.status = "paused"; note("You paused intake. Admitted work and milestones continue; nothing already done is recalled.") }
		if (action === "resume-intake") { target.status = "active"; note("You resumed intake.", "live") }
		if (action === "hold-notifications") { target.holdNotifications = true; note("You held outbound notifications for this engagement. Affected work stays incomplete until you release them.") }
		if (action === "release-notifications") { target.holdNotifications = false; note("You released the engagement's notification hold. Held sends resume; case-specific holds stay.", "live") }
		if (action === "expire") { target.connection = "expired"; target.checked = false; log(draft, { engagementId: id, actor: "demo", kind: "notice", text: "The notification connection expired. Record changes already made are kept; only notifications wait.", tone: "danger", material: true }) }
		if (action === "reconnect") { target.connection = "ready"; target.checking = true; note("Notification account reconnected. Rechecking before outstanding sends resume.", "live") }
		if (action === "lose-permission") { target.permission = "lost"; log(draft, { engagementId: id, actor: "demo", kind: "notice", text: "The release adapter's role lost write access to the revenue schema. Build and test continue; production releases can't apply until it's restored.", tone: "danger", material: true }) }
		if (action === "restore-permission") { target.permission = "ready"; note("Release permission restored by the integration administrator.", "live", true) }
		if (action === "recheck") { target.checking = true; target.checked = false }
		if (action === "use-human-payroll") { target.automaticPayroll = false; target.checked = false; note("You kept payroll with its owner; automatic payroll provisioning is excluded, not silently dropped.") }
		if (action === "request-payroll") { target.automaticPayroll = true; target.checked = false }
		if (action === "support") { target.supportRequested = true; note("Demonstration support request AGX-104 recorded. The capability is still unsupported.") }
	})
}

export function decide(state: AgentixState, decisionId: string, optionId: string): AgentixState {
	const decision = decisionBy(state, decisionId)
	const spec = decision ? scenarioOf(state, decision.engagementId).decisions[decision.template] : undefined
	const option = spec?.options.find(entry => entry.id === optionId)
	if (!decision || decision.status !== "open" || !option) return state
	return produce(state, draft => {
		const target = decisionBy(draft, decisionId)!
		const item = itemBy(draft, target.workItemId)!
		const paused = item.status === "paused"
		target.status = "resolved"; target.choice = option.id; target.resolvedAt = draft.clock
		const refs = { engagementId: target.engagementId, workItemId: item.id, decisionId: target.id, actor: "owner" }
		const step = templateOf(draft, item)!.steps.findIndex(entry => entry.decision === target.template || (target.template === "release" && entry.kind === "release"))
		if (option.outcome === "approve") {
			item.flags.approved = true
			meet(item, "decision", target.binding)
			if (step >= 0) { item.steps[step].status = "done"; item.steps[step].doneAt = draft.clock }
			item.status = "queued"; item.wait = undefined
			log(draft, { ...refs, kind: "decision", text: `You approved ${target.binding} only. No payment release.`, tone: "positive" })
		}
		if (option.outcome === "decline") {
			item.flags.declined = true; item.status = "not_completed"; item.finished = draft.clock; item.wait = undefined
			const obligation = item.obligations.find(entry => entry.id === "decision"); if (obligation) obligation.status = "not_met"
			log(draft, { ...refs, kind: "decision", text: `You declined ${target.binding}. The ERP exception stays open; nothing was posted.`, tone: "neutral" })
		}
		if (option.outcome === "variant" && option.variant) {
			const artifact = ensureArtifact(draft, item, scenarioOf(draft, item.engagementId).decisions[target.template].artifact ?? "")
			if (artifact) {
				const current = latest(artifact)
				const version = addVersion(draft, artifact, { author: artifactSpec(draft, artifact)!.owner, summary: option.variant.summary, changes: [option.variant.summary], variant: [...current.variant.filter(value => !value.startsWith("region-")), option.variant.add], source: "decision" })
				log(draft, { ...refs, artifactId: artifact.id, kind: "decision", text: `You decided: ${option.label.toLowerCase()}. ${artifact.title} v${version.version} carries the rule; tests run on it next.`, tone: "positive", material: true })
			}
			if (step >= 0) { item.steps[step].status = "done"; item.steps[step].doneAt = draft.clock }
			item.status = "working"; item.wait = undefined
		}
		if (option.outcome === "release" || option.outcome === "release-window" || option.outcome === "keep-in-test") {
			const release = draft.releases.find(entry => entry.decisionId === target.id)
			if (release) {
				if (option.outcome === "release") { release.status = release.ownerHold && release.holdUntil ? "held" : "releasing" }
				if (option.outcome === "release-window") { release.status = "held"; release.holdUntil = nextWindow(draft.clock, releaseWindowOf(draft, release.engagementId)) }
				if (option.outcome === "keep-in-test") release.status = "declined"
				// Kept in test, the item waits on your hold right away rather than looking busy for a tick.
				if (option.outcome === "keep-in-test") { item.status = "waiting"; item.wait = { kind: "hold" } }
				log(draft, { ...refs, releaseId: release.id, kind: "decision", text: option.outcome === "release" ? `You approved ${release.reference}${release.status === "held" ? "; it still waits for the window you set" : ""}.` : option.outcome === "release-window" ? `You approved ${release.reference} for the ${releaseWindowOf(draft, release.engagementId).label} window.` : `You kept ${release.reference} in test. Nothing is released; the tested version stays ready.`, tone: option.outcome === "keep-in-test" ? "neutral" : "positive" })
			}
			if (option.outcome !== "keep-in-test") { item.status = "working"; item.wait = undefined }
		}
		// Deciding never resumes paused work: the decision is recorded and the item waits for your resume.
		if (paused && !isTerminal(item)) {
			item.pausedFrom = item.status === "paused" ? item.pausedFrom : item.status
			item.status = "paused"; item.wait = undefined
			log(draft, { ...refs, kind: "notice", text: `Decision recorded for ${item.reference}. It stays paused until you resume it.`, tone: "neutral" })
		}
	})
}

export function fulfill(state: AgentixState, workId: string, reference: string): AgentixState {
	const item = itemBy(state, workId)
	const text = reference.trim().slice(0, 120)
	if (!item || item.status !== "waiting" || item.wait?.kind !== "human" || !text) return state
	return produce(state, draft => {
		const target = itemBy(draft, workId)!
		target.humanReference = text; target.status = "queued"; target.wait = undefined
		log(draft, { engagementId: target.engagementId, workItemId: target.id, actor: "owner", kind: "decision", text: `Owner confirmation ${text} attached to ${target.reference}. Verification still follows.`, tone: "positive" })
	})
}

/* ---- Artifact amendment --------------------------------------------------- */
type AmendOutcome = { ok: boolean; locked?: boolean; text: string; links: ObjectRef[] }
function amendInDraft(draft: AgentixState, artifactId: string, amendmentId: string, instructionId?: string): AmendOutcome {
	const artifact = artifactBy(draft, artifactId)
	const spec = artifact ? artifactSpec(draft, artifact) : undefined
	const amendment = spec?.amendments.find(entry => entry.id === amendmentId)
	if (!artifact || !spec || !amendment) return { ok: false, text: "That change isn't available for this artifact in the demo. Nothing changed.", links: [] }
	const current = latest(artifact)
	const links: ObjectRef[] = [{ kind: "artifact", id: artifact.id }]
	if (current.variant.includes(amendment.variant)) return { ok: false, text: `${artifact.title} v${current.version} already ${amendment.summary.toLowerCase()}. Nothing changed.`, links }
	// Nothing changes under a release that is applying or being reconciled, including releases of the artifacts this change would rebuild.
	const affected = new Set([artifact.id])
	for (let grew = true; grew;) { grew = false; for (const entry of draft.artifacts) if (!affected.has(entry.id) && entry.dependsOn.some(id => affected.has(id))) { affected.add(entry.id); grew = true } }
	const locked = draft.releases.find(release => affected.has(release.artifactId) && (release.status === "releasing" || release.status === "unknown"))
	if (locked) return { ok: false, locked: true, text: `Waiting to apply: ${amendment.label.toLowerCase()} changes the ${artifact.title.toLowerCase()}, and ${locked.reference} is ${locked.status === "unknown" ? "being reconciled" : "applying"}. It applies on its own once ${locked.reference} settles; nothing else changes meanwhile.`, links: [...links, { kind: "release", id: locked.id }] }
	const production = artifact.productionVersion
	// An unreleased version's results no longer qualify it for release. A deployed version keeps its record untouched.
	const deployed = (target: Artifact, version: ArtifactVersion) => version.version === target.productionVersion || version.status === "released"
	if (!deployed(artifact, current)) for (const check of current.checks) if (check.status !== "pending") check.status = "invalidated"
	const version = addVersion(draft, artifact, { author: spec.owner, summary: amendment.summary, changes: amendment.changes, variant: [...current.variant, amendment.variant], source: "amendment", instructionId })
	const invalidated = reopenFor(draft, artifact, `${amendment.label}`)
	// Dependents with their own checks are rebuilt and retested. Evidence and the runbook are regenerated when the new version is verified.
	const dependents = draft.artifacts.filter(entry => entry.dependsOn.includes(artifact.id) && (artifactSpec(draft, entry)?.checks.length ?? 0) > 0)
	for (const dependent of dependents) {
		const dependentSpec = artifactSpec(draft, dependent)!
		const base = latest(dependent)
		if (!deployed(dependent, base)) for (const check of base.checks) if (dependentSpec.checks.find(entry => entry.id === check.id)?.dependsOn === artifact.key && check.status !== "pending") check.status = "invalidated"
		const rebuilt = addVersion(draft, dependent, { author: dependentSpec.owner, summary: `Rebuilt for ${artifact.title.toLowerCase()} v${version.version}`, changes: [`Follows ${artifact.title.toLowerCase()} v${version.version}: ${amendment.summary.toLowerCase()}`], variant: [...base.variant], source: "amendment", instructionId })
		invalidated.push(...reopenFor(draft, dependent, `rebuilt for ${artifact.title.toLowerCase()} v${version.version}`))
		links.push({ kind: "artifact", id: dependent.id, version: rebuilt.version })
	}
	links.push(...invalidated.map(id => ({ kind: "work" as const, id })))
	log(draft, { engagementId: artifact.engagementId, artifactId: artifact.id, workItemId: artifact.workItemId, actor: spec.owner, kind: "version", text: `${artifact.title} v${version.version}: ${amendment.summary.toLowerCase()}.${dependents.length ? ` ${dependents.map(entry => entry.title.toLowerCase()).join(" and ")} must be retested.` : ""}${production ? ` Production stays on v${production} until v${version.version} passes its checks and is released.` : ""}`, tone: "live", material: true })
	return { ok: true, text: `Applied: ${artifact.title} v${version.version} ${amendment.summary.toLowerCase()}. Its checks${dependents.length ? " and the dependent " + dependents.map(entry => entry.title.toLowerCase()).join(" and ") + " checks" : ""} run again before any release.${production ? ` Production is still on v${production}.` : ""}`, links }
}

/* The work that must retest an artifact after it changes: its open item, or a follow-up change when that item is finished. */
function reopenFor(draft: AgentixState, artifact: Artifact, reason: string): string[] {
	for (const release of draft.releases) {
		if (release.artifactId !== artifact.id || !["preparing", "awaiting_approval", "held", "blocked", "stopped", "declined"].includes(release.status)) continue
		release.status = "superseded"
		const decision = release.decisionId ? decisionBy(draft, release.decisionId) : undefined
		if (decision?.status === "open") decision.status = "withdrawn"
	}
	const owner = itemBy(draft, artifact.workItemId)
	const template = owner ? templateOf(draft, owner) : undefined
	if (!owner || !template) return []
	const test = template.steps.findIndex(step => step.kind === "test" && step.artifact === artifact.key)
	if (!isTerminal(owner)) {
		if (test >= 0 && owner.steps.slice(test).some(step => step.status !== "pending")) {
			for (let index = test; index < owner.steps.length; index++) owner.steps[index] = { id: owner.steps[index].id, status: "pending", ticks: 0 }
			for (const obligation of owner.obligations) obligation.status = "pending"
			if (owner.status !== "paused") { owner.status = "working"; owner.wait = undefined }
		}
		return [owner.id]
	}
	// A finished milestone keeps its record; the change becomes its own follow-up work for the same specialist.
	const reference = nextReference(draft, artifact.engagementId, "CHG")
	const change = newItem(draft, artifact.engagementId, owner.template, { reference, title: `${artifact.title}: ${reason}`, trigger: "Assignment" })
	if (!change) return []
	change.status = "working"
	for (let index = 0; index < change.steps.length; index++) {
		const kind = template.steps[index].kind
		if (index < (test >= 0 ? test : 0) && kind !== "release") { change.steps[index].status = "done"; change.steps[index].doneAt = draft.clock }
	}
	change.artifactIds.push(artifact.id)
	artifact.workItemId = change.id
	log(draft, { engagementId: artifact.engagementId, workItemId: change.id, artifactId: artifact.id, actor: artifactSpec(draft, artifact)!.owner, kind: "assignment", text: `${reference} opened to test and release ${artifact.title.toLowerCase()} after it changed. The same specialist takes it; ${owner.reference} keeps its verified record.`, tone: "live" })
	return [change.id]
}

export function amendArtifact(state: AgentixState, artifactId: string, amendmentId: string): AgentixState {
	return produce(state, draft => { amendInDraft(draft, artifactId, amendmentId) })
}

/* ---- Assignment ---------------------------------------------------------- */
function assignInDraft(draft: AgentixState, engagementId: string, template: string, title: string): WorkItem | null {
	const engagement = draft.engagements[engagementId]
	if (!engagement || engagement.status === "draft") return null
	const scenario = SCENARIOS[engagement.workflowId]
	const kind = scenario.templates[template]?.kind
	const prefix = kind === "cycle" && engagement.workflowId === "invoice" ? "REC" : template === "backfill" ? "BKF" : scenario.prefix
	const named = title.match(new RegExp(`\\b${prefix}-\\d{1,6}\\b`, "i"))?.[0].toUpperCase()
	const reference = named && !draft.work.some(item => item.reference === named) ? named : nextReference(draft, engagementId, prefix)
	// When the brief names the item's own reference, it becomes the reference instead of appearing twice.
	const stripped = named === reference ? title.replace(new RegExp(`\\b${prefix}-\\d{1,6}\\s*·?\\s*`, "i"), "").trim() : title
	const item = newItem(draft, engagementId, template, { reference, title: (stripped ? stripped[0].toUpperCase() + stripped.slice(1) : title).slice(0, 120), trigger: "Assignment", flags: template === "exception" ? { needsApproval: true } : {} })
	if (item) log(draft, { engagementId, workItemId: item.id, actor: "coordinator", kind: "assignment", text: `${reference} assigned: ${item.title}. ${ownerName(draft, item)} takes it on as part of this engagement.`, tone: "live", material: false })
	return item
}

export function assignWork(state: AgentixState, engagementId: string, template: string, title: string): AgentixState {
	return produce(state, draft => { assignInDraft(draft, engagementId, template, title) })
}

/* ---- Intake: Discovery packages and briefs -------------------------------- */
export type IntakeResult = "proposal" | "in-review" | "live" | "unknown"
export function intakeStatus(state: AgentixState, packageId: string): IntakeResult {
	const workflowId = packageScenario(packageId)
	const engagement = workflowId ? state.engagements[workflowId] : undefined
	if (!engagement) return "unknown"
	if (engagement.packages.includes(packageId)) return "live"
	if (engagement.proposal?.packageId === packageId) return "in-review"
	return "proposal"
}

/* A package the demo holds back until its Discovery sends it. Everywhere else every package is available. */
export const packageAvailable = (state: AgentixState, packageId: string) => !(state.demo.gated ?? []).includes(packageId)

/*
 * An engagement that doesn't exist yet: the customer demo keeps the revenue engagement as an empty
 * draft until its Discovery hands over, so Agentix builds it from zero in front of the customer.
 * Lists, counts and the inbox leave it out until then.
 */
export const awaitingCreation = (engagement: Engagement | undefined) => !!engagement && engagement.status === "draft" && !engagement.proposal

/* The package a list should show for a workflow: its latest, or while that one waits for its Discovery, the one already live. None when every package is held back and nothing is live. */
export function visiblePackage(state: AgentixState, workflowId: WorkflowId) {
	const packages = SCENARIOS[workflowId].packages
	const live = state.engagements[workflowId]?.packages ?? []
	return [...packages].reverse().find(pkg => packageAvailable(state, pkg.id)) ?? [...packages].reverse().find(pkg => live.includes(pkg.id))
}

/* Receiving the same package twice lands on the same proposal; a package already live changes nothing. */
export function receivePackage(state: AgentixState, packageId: string, origin: "discovery" | "prompt", brief = "", discovery?: DiscoveryLink): AgentixState {
	const workflowId = packageScenario(packageId)
	const pkg = packageFor(packageId)
	const engagement = workflowId ? state.engagements[workflowId] : undefined
	if (!pkg || !engagement || engagement.packages.includes(packageId)) return state
	// A package already in review keeps its first provenance and answers; arriving again changes nothing.
	if (engagement.proposal?.packageId === packageId) return state
	// Only its Discovery releases a held-back package.
	if (!packageAvailable(state, packageId) && !discovery) return state
	return produce(state, draft => {
		if (draft.demo.gated) draft.demo.gated = draft.demo.gated.filter(id => id !== packageId)
		const target = draft.engagements[engagement.id]
		const kind = target.status === "draft" ? "new" : "expansion"
		target.proposal = { origin, packageId, brief: brief.trim().slice(0, 2000), kind, answers: target.proposal?.packageId === packageId ? target.proposal.answers : {}, receivedAt: draft.clock, ...discovery ? { discovery } : {} }
		log(draft, { engagementId: target.id, actor: "coordinator", kind: "notice", text: `${origin === "discovery" ? `Discovery package ${pkg.title} v${pkg.version}${discovery ? ` (handoff packet ${discovery.packetId})` : ""}` : "Your brief"} received for review. ${kind === "new" ? "Nothing runs until you activate it." : "Nothing new runs until you activate it; current work continues."}`, tone: "neutral", material: !!discovery })
	})
}

/* Moves the demo clock forward to a wall-clock time without running any work in between (the customer demo keeps Agentix on today's time). */
export function syncClock(state: AgentixState, now: number): AgentixState {
	const to = Math.floor(now / MINUTE) * MINUTE
	return to > state.clock ? produce(state, draft => { draft.clock = to }) : state
}

export function answerQuestion(state: AgentixState, engagementId: string, questionId: string, optionId: string): AgentixState {
	const engagement = state.engagements[engagementId]
	const pkg = engagement?.proposal?.packageId ? packageFor(engagement.proposal.packageId) : undefined
	const question = pkg?.questions.find(entry => entry.id === questionId)
	if (!engagement?.proposal || !question?.options.some(option => option.id === optionId)) return state
	return produce(state, draft => {
		draft.engagements[engagementId].proposal!.answers[questionId] = optionId
		if (questionId === "mapping") { draft.engagements[engagementId].mapping = optionId; draft.engagements[engagementId].checked = false }
	})
}

export function withdrawProposal(state: AgentixState, engagementId: string): AgentixState {
	if (!state.engagements[engagementId]?.proposal || state.engagements[engagementId].status === "draft") return state
	return produce(state, draft => { draft.engagements[engagementId].proposal = undefined; log(draft, { engagementId, actor: "owner", kind: "notice", text: "You set the proposal aside. Nothing was activated; current work is unchanged.", tone: "neutral" }) })
}

/* What still stands between a proposal and activation, in the owner's words. */
export function activationBlockers(state: AgentixState, engagementId: string): string[] {
	const engagement = state.engagements[engagementId]
	const pkg = engagement?.proposal?.packageId ? packageFor(engagement.proposal.packageId) : undefined
	if (!engagement) return ["This engagement no longer exists."]
	const blockers: string[] = []
	if (pkg) for (const question of pkg.questions) if (!engagement.proposal!.answers[question.id]) blockers.push(`Answer: ${question.label}`)
	if (engagement.proposal?.answers.testdata === "masked") blockers.push("A masked production extract needs the data owner's approval first; choose the synthetic sample to start now.")
	if (engagement.status === "draft") {
		if (!engagement.name.trim() || !engagement.owner.trim() || !engagement.scope.trim()) blockers.push("Complete the engagement details.")
		if (engagement.automaticPayroll) blockers.push("Automatic payroll provisioning is unsupported; keep payroll with its owner.")
		else if (engagement.checking) blockers.push("The readiness check is running.")
		else if (!engagement.checked) blockers.push(engagement.workflowId === "onboarding" && !engagement.mapping ? "Confirm the London access-package mapping." : "Run the readiness check.")
	}
	return blockers
}

export function activate(state: AgentixState, engagementId: string): AgentixState {
	const engagement = state.engagements[engagementId]
	if (!engagement || activationBlockers(state, engagementId).length || (!engagement.proposal && engagement.status !== "draft")) return state
	return produce(state, draft => {
		const target = draft.engagements[engagementId]
		const proposal = target.proposal
		const pkg = proposal?.packageId ? packageFor(proposal.packageId) : undefined
		const expansion = target.status !== "draft"
		if (expansion) target.version++
		if (pkg && proposal?.origin === "discovery" && !target.packages.includes(pkg.id)) target.packages.push(pkg.id)
		target.origin = proposal?.origin === "discovery" && pkg ? { kind: "discovery", packageId: pkg.id, version: pkg.version, title: pkg.title, ...proposal.discovery ? { discovery: proposal.discovery } : {} } : proposal ? { kind: "prompt" } : target.origin
		target.answers = { ...target.answers, ...proposal?.answers }
		target.proposal = undefined
		target.status = "active"
		const ids: Record<string, string> = {}
		for (const milestone of pkg?.milestones ?? []) {
			const item = newItem(draft, engagementId, milestone.template, { reference: milestone.reference, title: milestone.title, trigger: "Setup", dependsOn: (milestone.dependsOn ?? []).map(dependency => ({ id: ids[dependency.reference] ?? `${engagementId}:${dependency.reference}`, step: dependency.step })) })
			if (item) ids[milestone.reference] = item.id
		}
		const milestones = pkg?.milestones.length ?? 0
		// This engagement's own window and its own preauthorized publishing policy, never another's.
		const window = releaseWindowFor(target.workflowId).label
		const published = Object.values(SCENARIOS[target.workflowId].artifacts).find(spec => spec.release?.authority === "policy")?.release?.policy
		const publishing = published ? ` ${published}` : ""
		const release = target.answers.release === "window" ? `Pipeline releases wait for the ${window} window.${publishing}` : pkg?.questions.some(question => question.id === "release") ? `Each pipeline release waits for your approval.${publishing}` : ""
		const team = SCENARIOS[target.workflowId].team.filter(member => !member.package || target.packages.includes(member.package)).length
		log(draft, { engagementId, actor: "owner", kind: "notice", text: expansion ? `You activated v${target.version}: ${milestones} milestone${milestones === 1 ? "" : "s"} start now with the same team, reused. ${release} Existing work continues unchanged.`
			: milestones ? `You activated ${target.name}: a team of ${team} starts ${milestones} milestone${milestones === 1 ? "" : "s"} now. ${release}`.trim()
			: `You activated ${target.name}. New work is accepted from now on; an existing backlog is only processed if you assign it.`, tone: "positive", material: true })
		if (!expansion && target.workflowId === "onboarding" && !draft.work.some(item => item.engagementId === engagementId)) newItem(draft, engagementId, "joiner", { reference: nextReference(draft, engagementId, "JOIN"), title: "London analyst · day-one readiness" })
	})
}

/* ---- Briefs and separate engagements ----------------------------------- */
const AUTOMATIC_PAYROLL = /automat.*payroll|payroll.*automat/i
export function createEngagement(state: AgentixState, id: string, workflowId: WorkflowId, brief: string): AgentixState {
	const text = brief.trim()
	if (!/^eng-[a-z0-9-]{1,64}$/.test(id) || Object.hasOwn(state.engagements, id) || Object.keys(state.engagements).length >= LIMITS.engagements || !text || text.length > 2000) return state
	const scenario = SCENARIOS[workflowId]
	const pkg = scenario.packages[0]
	return produce(state, draft => {
		const count = Object.values(draft.engagements).filter(entry => entry.workflowId === workflowId).length + 1
		draft.engagements[id] = {
			id, workflowId, name: `${scenario.name} ${count}`, owner: scenario.owner, scope: text, trigger: workflowId === "inventory" ? "Schedule" : "Event", status: "draft", version: 1,
			origin: { kind: "prompt" }, brief: text, packages: [], answers: {}, proposal: { origin: "prompt", packageId: pkg.id, brief: text, kind: "new", answers: {}, receivedAt: draft.clock },
			mapping: "", checked: false, checking: false, automaticPayroll: workflowId === "onboarding" && AUTOMATIC_PAYROLL.test(text), supportRequested: false,
			connection: "ready", permission: "ready", holdNotifications: false, cycles: workflowId === "inventory" ? "weekdays" : "off",
			nextOccurrence: new Date(nextSixAm(draft.clock, workflowId === "inventory")).toISOString(), notes: ["Separate local demo engagement. The scenario's authority is the maximum permitted scope; no live connections or effects."],
		}
		log(draft, { engagementId: id, actor: "owner", kind: "notice", text: "A separate engagement draft was created from your brief. Nothing runs until you activate it.", tone: "neutral" })
	})
}

export type DefinitionPatch = Partial<Pick<Engagement, "name" | "owner" | "scope" | "trigger">>
export function editEngagement(state: AgentixState, id: string, patch: DefinitionPatch): AgentixState {
	const engagement = state.engagements[id]
	if (!engagement || engagement.status !== "draft") return state
	const next = { name: patch.name ?? engagement.name, owner: patch.owner ?? engagement.owner, scope: patch.scope ?? engagement.scope, trigger: patch.trigger ?? engagement.trigger }
	if (next.name.length > 80 || next.owner.length > 80 || next.scope.length > 2000 || !["Event", "Schedule", "Assignment"].includes(next.trigger)) return state
	return produce(state, draft => {
		const target = draft.engagements[id]
		// Only the facts a check covers void it: renaming or reassigning the owner does not.
		const voided = target.checked && (next.scope !== target.scope || next.trigger !== target.trigger)
		Object.assign(target, next)
		if (voided) { target.checked = false; addNote(target.notes, `${next.scope !== engagement.scope ? "Scope" : "Trigger"} changed after the readiness check. Recheck before activating.`) }
	})
}

/* ---- Demo controls -------------------------------------------------------- */
export function advanceSchedule(state: AgentixState, engagementId: string): AgentixState {
	const engagement = state.engagements[engagementId]
	if (!engagement || engagement.status !== "active" || engagement.cycles === "off") return state
	const due = Date.parse(engagement.nextOccurrence)
	if (!Number.isFinite(due)) return state
	// The presenter starts the next occurrence now. The clock doesn't jump, so nothing else is backfilled or rewritten.
	return produce(state, draft => admitCycle(draft, engagementId, true))
}

/* Jumps the demo clock to the agreed release window, so a held release can apply. */
export function advanceToWindow(state: AgentixState): AgentixState {
	const held = state.releases.filter(release => release.status === "held" && release.holdUntil && release.holdUntil > state.clock)
	if (!held.length) return state
	const until = Math.min(...held.map(release => release.holdUntil!))
	return produce(state, draft => {
		draft.clock = until
		log(draft, { engagementId: held[0].engagementId, actor: "demo", kind: "notice", text: `Demo clock moved to the ${releaseWindowOf(draft, held[0].engagementId).label} release window. Recorded times are unchanged.`, tone: "neutral" })
	})
}

export function addIncoming(state: AgentixState, engagementId: string): AgentixState {
	const engagement = state.engagements[engagementId]
	if (!engagement || engagement.status !== "active") return state
	return produce(state, draft => admitIncoming(draft, engagementId))
}

export function armFailure(state: AgentixState, failure: "ackLoss"): AgentixState {
	return state.demo[failure] ? state : produce(state, draft => { draft.demo[failure] = true })
}

/* ---- Direct entry ---------------------------------------------------------- */
/*
 * Where a typed brief goes. The same brief never creates a second copy of work
 * that already runs: it becomes new work for the deployed team, the review of a
 * package that expands it, or (only when chosen) a separate engagement.
 */
export type BriefRoute =
	| { kind: "none" }
	| { kind: "assign"; engagementId: string; template: string; title: string; owner: string }
	| { kind: "package"; engagementId: string; packageId: string }
	| { kind: "existing"; engagementId: string }
	/* The customer demo: this work starts from its Discovery, so Agentix doesn't create it from a brief. */
	| { kind: "discovery"; engagementId: string }
export function routeBrief(state: AgentixState, text: string, scenario: WorkflowId | null): BriefRoute {
	const brief = text.trim()
	if (!brief || !scenario) return { kind: "none" }
	const definition = SCENARIOS[scenario]
	const engagement = state.engagements[scenario]
	if (!engagement) return { kind: "none" }
	if (awaitingCreation(engagement)) return { kind: "discovery", engagementId: engagement.id }
	const assignment = engagement.status !== "draft" ? definition.assignments.find(entry => entry.pattern.test(brief)) : undefined
	const pending = definition.packages.find(pkg => pkg.kind === "expansion" && !engagement.packages.includes(pkg.id) && packageAvailable(state, pkg.id))
	// An expansion that names its own condition is only offered when the brief asks for that work.
	if (pending && (!pending.offeredWhen || pending.offeredWhen.test(brief))) return { kind: "package", engagementId: engagement.id, packageId: pending.id }
	if (assignment) return { kind: "assign", engagementId: engagement.id, template: assignment.template, title: assignment.title(brief), owner: definition.team.find(member => member.id === assignment.owner)?.name ?? "the accountable agent" }
	return { kind: "existing", engagementId: engagement.id }
}
