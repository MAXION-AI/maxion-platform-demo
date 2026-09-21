import { londonTime } from "../time"
import { activationBlockers, artifactBy, awaitingCreation, decisionBy, isTerminal, itemBy, latest, releaseBy, releaseWindowFor, scenarioOf, templateOf } from "./engine"
import { packageFor, SCENARIOS, type Specialist } from "./scenarios"
import type { AgentixState, Decision, Engagement, Release, Tone, WaitReason, WorkItem } from "./types"

/*
 * Everything the screens say about state, in the owner's words. One status
 * vocabulary (queued, working, waiting, needs you, verifying, verified,
 * partial, failed) is used in every list, detail, activity row and result.
 */

export const shortTime = (time: number) => new Date(time).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
export const dayLabel = (time: number) => new Date(time).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" })
export const clockLabel = (time: number) => new Date(time).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" })
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

export function memberName(state: AgentixState, engagementId: string, id: string) {
	if (id === "owner") return "You"
	if (id === "demo") return "Demo control"
	if (id === "agentix") return "Agentix"
	return scenarioOf(state, engagementId).team.find(member => member.id === id)?.name ?? "Accountable agent"
}

/* The specialists this engagement has activated: its founding duties plus any a package added. */
export function teamOf(engagement: Engagement): Specialist[] {
	return SCENARIOS[engagement.workflowId].team.filter(member => !member.package || engagement.packages.includes(member.package))
}
export const accountable = (engagement: Engagement) => SCENARIOS[engagement.workflowId].team.find(member => member.accountable) ?? SCENARIOS[engagement.workflowId].team[0]

export function decisionTitle(state: AgentixState, decision: Decision) {
	const spec = scenarioOf(state, decision.engagementId).decisions[decision.template]
	if (decision.template === "release") {
		const release = state.releases.find(entry => entry.decisionId === decision.id)
		const artifact = release ? artifactBy(state, release.artifactId) : undefined
		return artifact ? `Release ${artifact.title.toLowerCase()} v${release!.version} to production?` : spec?.title ?? "Release to production?"
	}
	return spec?.title ?? "Decision needed"
}

function waitSentence(state: AgentixState, item: WorkItem, wait: WaitReason): string {
	switch (wait.kind) {
		case "dependency": {
			const other = itemBy(state, wait.on)
			if (!other) return "Waiting for another work item"
			const step = templateOf(state, other)?.steps.find(entry => entry.id === wait.step)
			return step?.kind === "test" ? `Waiting for ${other.reference}'s validated ${other.template === "pipeline" ? "schema" : "result"}` : `Waiting for ${other.reference} · ${other.title}`
		}
		case "decision": { const decision = decisionBy(state, wait.decisionId); return decision ? `Needs your decision · ${decisionTitle(state, decision)}` : "Needs your decision" }
		case "human": return `${wait.owner} · fulfillment reference needed`
		case "slot": return "Queued · takes the next free slot"
		case "intake": return "Queued · starts when intake resumes"
		case "connection": return "Waiting for the notification connection"
		case "hold": {
			const release = item.releaseIds.map(id => releaseBy(state, id)).find(entry => entry && (entry.status === "declined" || entry.status === "stopped"))
			if (release) return release.status === "declined" ? `${release.reference} kept in test by you` : `${release.reference} stopped by you before it applied`
			return item.held ? "Notification held by you" : "Notifications held for the engagement"
		}
		case "window": return `Held for the release window · ${shortTime(wait.until)}`
		case "permission": return "Release blocked · deployment permission lost"
		case "release": { const release = releaseBy(state, wait.releaseId); return release ? `Waiting for ${release.reference} to apply` : "Waiting for the pipeline release" }
	}
}

/* What the item is doing right now, as one sentence with its owner. */
export function itemSentence(state: AgentixState, item: WorkItem): string {
	const template = templateOf(state, item)
	if (item.status === "verified") return item.kind === "cycle" ? "Every obligation for this cycle is evidenced" : "Every required outcome is evidenced"
	if (item.status === "not_completed") return item.flags.declined ? "Declined by you · nothing was posted" : item.notes.at(-1) ?? "Closed without the outcome"
	if (item.status === "paused") return "Paused before its next action · progress kept"
	if (item.status === "failed") {
		const artifact = item.artifactIds.map(id => artifactBy(state, id)).find(Boolean)
		const failed = artifact ? latest(artifact).checks.filter(check => check.status === "failed").length : 0
		return artifact ? `${artifact.title} v${latest(artifact).version} still fails ${failed} check${failed === 1 ? "" : "s"} · automatic repair stopped at its limit` : "A step failed · your next step is below"
	}
	if (item.status === "partial") return `Record work kept · notification outstanding${item.wait?.kind === "connection" ? " (connection expired)" : item.wait?.kind === "hold" ? " (held)" : ""}`
	if (item.status === "queued") return item.wait ? waitSentence(state, item, item.wait) : "Queued · starts shortly"
	if (item.status === "waiting" && item.wait) return waitSentence(state, item, item.wait)
	const index = item.steps.findIndex(step => step.status === "working" || step.status === "pending")
	const step = template?.steps[index]
	if (!step) return "Working"
	const who = memberName(state, item.engagementId, step.owner)
	if (step.kind === "test" && step.artifact) {
		const artifact = artifactBy(state, `${item.engagementId}:${step.artifact}`)
		const version = artifact ? latest(artifact) : undefined
		if (item.stage === "repairing") return `${who} · repairing a failed check automatically`
		if (version) return `${who} · ${version.source === "repair" ? "rechecking" : "testing"} ${artifact!.title.toLowerCase()} v${version.version} in isolation`
	}
	if (step.kind === "release" && step.artifact) {
		// The row speaks for the release itself; before one exists, it's being prepared, not released.
		const release = item.releaseIds.map(id => releaseBy(state, id)).filter(entry => entry && entry.status !== "superseded").at(-1)
		if (release?.status === "unknown") return `${who} · reconciling ${release.reference}: outcome unknown, nothing resent`
		if (release?.status === "releasing") return `${who} · releasing ${release.reference}`
		if (release && release.status !== "applied" && release.status !== "verified") return `${release.reference} · ${releaseSentence(state, release)}`
		const artifact = artifactBy(state, `${item.engagementId}:${step.artifact}`)
		if (!release && artifact) return `${who} · preparing the release of ${artifact.title.toLowerCase()} v${latest(artifact).version}`
	}
	if (item.stage === "reconciling") return `${who} · reconciling the original request · no duplicate sent`
	return `${who} · ${step.doing}`
}

export type StatusView = { label: string; tone: Tone; needsYou: boolean }
export function statusOf(state: AgentixState, item: WorkItem): StatusView {
	switch (item.status) {
		case "verified": return { label: "Verified", tone: "positive", needsYou: false }
		case "not_completed": return item.flags.declined ? { label: "Declined", tone: "neutral", needsYou: false } : { label: "Not completed", tone: "danger", needsYou: false }
		case "partial": return { label: "Partial", tone: state.engagements[item.engagementId]?.connection === "expired" ? "danger" : "attention", needsYou: item.wait?.kind === "hold" || state.engagements[item.engagementId]?.connection === "expired" }
		case "failed": return { label: "Failed", tone: "danger", needsYou: true }
		case "paused": return { label: "Paused", tone: "neutral", needsYou: false }
		case "queued": return { label: "Queued", tone: "neutral", needsYou: false }
		case "scheduled": return { label: "Scheduled", tone: "neutral", needsYou: false }
		case "verifying": return { label: "Verifying", tone: "live", needsYou: false }
		case "waiting": {
			const kind = item.wait?.kind
			if (kind === "decision" || kind === "human") return { label: "Needs you", tone: "attention", needsYou: true }
			if (kind === "permission") return { label: "Blocked", tone: "danger", needsYou: true }
			if (kind === "hold") {
				// A release you stopped or kept in test says so, rather than looking like a timed hold.
				const release = item.releaseIds.map(id => releaseBy(state, id)).filter(entry => entry && entry.status !== "superseded").at(-1)
				return { label: release?.status === "stopped" ? "Stopped" : release?.status === "declined" ? "Kept in test" : "Held", tone: "neutral", needsYou: false }
			}
			return { label: "Waiting", tone: "neutral", needsYou: false }
		}
		default: return { label: item.stage ? "Recovering" : "Working", tone: "live", needsYou: false }
	}
}

/* ---- The team ------------------------------------------------------------ */
export type Presence = { member: Specialist; state: "working" | "recovering" | "decision" | "dependency" | "ready"; sentence: string; workId?: string; more: number }
export function teamPresence(state: AgentixState, engagementId: string): Presence[] {
	const engagement = state.engagements[engagementId]
	if (!engagement) return []
	const open = state.work.filter(item => item.engagementId === engagementId && !isTerminal(item) && item.status !== "paused")
	return teamOf(engagement).map(member => {
		const mine: { item: WorkItem; state: Presence["state"]; sentence: string }[] = []
		for (const item of open) {
			const template = templateOf(state, item)
			if (!template) continue
			const active = item.steps.map((step, index) => ({ step, spec: template.steps[index] })).filter(({ step }) => step.status === "working" || step.status === "waiting")
			const firstPending = template.steps[item.steps.findIndex(step => step.status === "pending")]
			const own = active.find(({ spec }) => spec.owner === member.id)
			// While a person decides or confirms, the specialist who continues afterwards is the one waiting.
			const personal = active.find(({ spec }) => spec.owner === "owner")
			const at = personal ? template.steps.indexOf(personal.spec) : -1
			const continues = at >= 0 ? (template.steps.slice(at + 1).find(step => step.owner !== "owner") ?? [...template.steps.slice(0, at)].reverse().find(step => step.owner !== "owner"))?.owner : undefined
			const owns = !!own || continues === member.id || (!active.length && firstPending?.owner === member.id)
			if (!owns) continue
			const wait = item.wait
			if (item.stage) mine.push({ item, state: "recovering", sentence: itemSentence(state, item).replace(/^[^·]+· /, "") })
			else if ((item.status === "waiting" || item.status === "partial") && wait) {
				// Decisions, people and lost permissions wait on the owner; everything else waits on other work or a schedule.
				const owner = wait.kind === "decision" || wait.kind === "human" || wait.kind === "permission" || (item.status === "partial" && wait.kind === "connection")
				const sentence = wait.kind === "decision" ? `Waiting on your decision · ${item.reference}` : wait.kind === "human" ? `Waiting on the ${wait.owner.toLowerCase()} · ${item.reference}` : `${waitSentence(state, item, wait)} · ${item.reference}`
				mine.push({ item, state: owner ? "decision" : "dependency", sentence })
			}
			else if (item.status === "working" || item.status === "verifying") mine.push({ item, state: "working", sentence: `${own && own.step.status === "working" ? own.spec.doing : itemSentence(state, item).replace(/^[^·]+· /, "")} · ${item.reference}` })
		}
		const rank = { recovering: 0, working: 1, decision: 2, dependency: 3, ready: 4 }
		mine.sort((a, b) => rank[a.state] - rank[b.state])
		const lead = mine[0]
		if (!lead) return { member, state: "ready", sentence: engagement.status === "paused" ? "Intake paused · admitted work continues" : "Ready for incoming work", more: 0 }
		return { member, state: lead.state, sentence: lead.sentence, workId: lead.item.id, more: mine.length - 1 }
	})
}

/* ---- What needs the owner ----------------------------------------------- */
export type NeedsYouItem = { key: string; engagementId: string; workId?: string; decisionId?: string; releaseId?: string; title: string; detail: string; action: string; kind: "decision" | "question" | "release" | "human" | "failed" | "partial" | "permission" | "proposal" | "setup" }
export function needsYou(state: AgentixState, engagementId?: string): NeedsYouItem[] {
	const items: NeedsYouItem[] = []
	const within = (id: string) => !engagementId || id === engagementId
	for (const decision of state.decisions) {
		if (decision.status !== "open" || !within(decision.engagementId)) continue
		const item = itemBy(state, decision.workItemId)
		if (!item || isTerminal(item)) continue
		const kind = decision.kind === "release" ? "release" : decision.kind === "question" ? "question" : "decision"
		items.push({ key: decision.id, engagementId: decision.engagementId, workId: item.id, decisionId: decision.id, title: decisionTitle(state, decision), detail: `${item.reference} · ${item.title}`, action: kind === "release" ? "Review release" : kind === "question" ? "Answer" : "Review decision", kind })
	}
	for (const item of state.work) {
		if (!within(item.engagementId) || isTerminal(item)) continue
		if (item.status === "waiting" && item.wait?.kind === "human") items.push({ key: item.id, engagementId: item.engagementId, workId: item.id, title: `${item.reference} needs the payroll owner's confirmation`, detail: item.title, action: "Provide confirmation", kind: "human" })
		if (item.status === "failed") items.push({ key: item.id, engagementId: item.engagementId, workId: item.id, title: `${item.reference} needs a next step`, detail: itemSentence(state, item), action: "Choose next step", kind: "failed" })
		if (item.status === "partial" && statusOf(state, item).needsYou) items.push({ key: item.id, engagementId: item.engagementId, workId: item.id, title: `${item.reference}: notification outstanding`, detail: item.title, action: "Resolve notification", kind: "partial" })
	}
	for (const release of state.releases) {
		if (release.status !== "blocked" || !within(release.engagementId)) continue
		items.push({ key: release.id, engagementId: release.engagementId, workId: release.workItemId, releaseId: release.id, title: `${release.reference} is blocked: release permission lost`, detail: "Build and test continue; nothing was released", action: "Restore permission", kind: "permission" })
	}
	for (const engagement of Object.values(state.engagements)) {
		// An engagement its Discovery hasn't created yet has nothing to set up.
		if (!within(engagement.id) || awaitingCreation(engagement)) continue
		if (engagement.proposal && engagement.status !== "draft") {
			const pkg = engagement.proposal.packageId ? packageFor(engagement.proposal.packageId) : undefined
			items.push({ key: `${engagement.id}:proposal`, engagementId: engagement.id, title: `${pkg?.title ?? "New work"} is ready for your review`, detail: `${engagement.name} · ${engagement.proposal.origin === "discovery" ? `from Discovery${pkg ? ` · v${pkg.version}` : ""}` : "from your brief"}`, action: "Review proposal", kind: "proposal" })
		}
		if (engagement.status === "draft" && activationBlockers(state, engagement.id).length) items.push({ key: `${engagement.id}:setup`, engagementId: engagement.id, title: engagement.name, detail: `Setup · ${activationBlockers(state, engagement.id)[0]}`, action: "Finish setup", kind: "setup" })
	}
	return items
}

/* ---- The engagement at a glance ----------------------------------------- */
export function health(state: AgentixState, engagement: Engagement): { label: string; tone: Tone } {
	if (engagement.status === "draft") return activationBlockers(state, engagement.id).length ? { label: "Setup needs attention", tone: "attention" } : { label: "Ready to activate", tone: "positive" }
	if (engagement.status === "paused") return { label: "Intake paused", tone: "neutral" }
	if (engagement.connection === "expired") return { label: "Degraded", tone: "danger" }
	if (engagement.permission === "lost") return { label: "Release blocked", tone: "danger" }
	if (engagement.checking) return { label: "Rechecking", tone: "live" }
	if (needsYou(state, engagement.id).length) return { label: "Needs you", tone: "attention" }
	if (engagement.holdNotifications) return { label: "Notifications held", tone: "attention" }
	// Queued counts as open. An engagement activated a second ago has three milestones waiting to
	// start and nothing running yet; reading "Watching" there contradicts the activation itself.
	const open = state.work.some(item => item.engagementId === engagement.id && (item.status === "queued" || item.status === "working" || item.status === "verifying"))
	return open ? { label: "Active", tone: "live" } : { label: "Watching", tone: "positive" }
}

/* The one-line presence under the engagement's name: what's happening and whether it needs you. */
export function presenceLine(state: AgentixState, engagement: Engagement) {
	const team = teamPresence(state, engagement.id)
	const busy = team.filter(entry => entry.state === "working" || entry.state === "recovering")
	const waiting = team.filter(entry => entry.state === "dependency")
	const parts = busy.slice(0, 2).map(entry => `${entry.member.name} ${entry.state === "recovering" ? "is recovering" : "is working"}`)
	if (waiting[0]) parts.push(`${waiting[0].member.name} is waiting on a dependency`)
	const decisions = needsYou(state, engagement.id).length
	const lead = parts.length ? parts.join(" · ") : engagement.status === "paused" ? "Intake is paused; admitted work continues" : "Ready for incoming work"
	return decisions ? `${lead} · ${decisions} ${decisions === 1 ? "thing needs" : "things need"} you` : lead
}

/* What is happening, in one sentence: open work by what it is doing, then whether anything waits for the owner. */
export function workSummary(state: AgentixState, engagement: Engagement) {
	const open = state.work.filter(item => item.engagementId === engagement.id && !isTerminal(item))
	const count = (test: (item: WorkItem) => boolean) => open.filter(test).length
	const active = count(item => item.status === "working" || item.status === "verifying" || (item.status === "waiting" && item.wait?.kind === "release"))
	const dependent = count(item => item.status === "waiting" && item.wait?.kind === "dependency")
	const held = count(item => item.status === "paused" || (item.status === "waiting" && (item.wait?.kind === "hold" || item.wait?.kind === "window")))
	const queued = count(item => item.status === "queued" || item.status === "scheduled" || (item.status === "waiting" && (item.wait?.kind === "slot" || item.wait?.kind === "intake")))
	const needs = needsYou(state, engagement.id).filter(entry => entry.kind !== "proposal").length
	const parts = [active && `${active} in progress`, dependent && `${dependent} waiting on other work`, held && `${held} held`, queued && `${queued} queued`].filter(Boolean) as string[]
	if (engagement.status === "paused") parts.unshift("Intake paused")
	const lead = parts.length ? parts.join(" · ") : "Ready for incoming work"
	const tail = needs ? `${needs === 1 ? "One thing needs" : `${needs} things need`} you; everything else continues on its own.` : "Nothing needs you."
	return `${lead}. ${tail}`
}

export type Achievement = { key: string; title: string; detail: string; at: number; workId?: string; artifactId?: string }
export function achievements(state: AgentixState, engagementId: string, limit = 4): Achievement[] {
	const verified = state.work.filter(item => item.engagementId === engagementId && item.status === "verified").sort((a, b) => (b.finished ?? 0) - (a.finished ?? 0))
	const releases = state.releases.filter(release => release.engagementId === engagementId && release.status === "verified")
	const entries: Achievement[] = [
		...verified.map(item => ({ key: item.id, title: `${item.reference} verified`, detail: item.title, at: item.finished ?? item.started, workId: item.id })),
		...releases.map(release => { const artifact = artifactBy(state, release.artifactId); return { key: release.id, title: `${artifact?.title ?? "Release"} v${release.version} live`, detail: `${release.reference} · verified in ${release.target.split(" · ")[0]}`, at: release.verifiedAt ?? release.createdAt, artifactId: release.artifactId } }),
	]
	return entries.sort((a, b) => b.at - a.at).slice(0, limit)
}

export function measures(state: AgentixState, engagementId: string) {
	const finished = state.work.filter(item => item.engagementId === engagementId && isTerminal(item) && item.kind !== "milestone")
	const verified = finished.filter(item => item.status === "verified")
	const eligible = finished.filter(item => !item.flags.needsApproval && !item.humanReference)
	const durations = verified.map(item => Math.max(0, ((item.finished ?? item.started) - item.started) / 60000)).sort((a, b) => a - b)
	const cycles = state.work.filter(item => item.engagementId === engagementId && item.kind === "cycle" && item.status === "verified").sort((a, b) => (b.finished ?? 0) - (a.finished ?? 0))
	return {
		verified: verified.length, total: finished.length, eligible: eligible.length,
		autonomous: eligible.length ? eligible.filter(item => item.status === "verified").length : null,
		medianMinutes: durations.length ? Math.round((durations[Math.floor((durations.length - 1) / 2)] + durations[Math.floor(durations.length / 2)]) / 2) : null,
		lastCycle: cycles[0],
	}
}

/* ---- Readiness, split by what it permits -------------------------------- */
export type ReadinessRow = { id: "read" | "build" | "production"; label: string; state: "ready" | "attention" | "blocked" | "none"; detail: string }
/* Releases a policy pre-authorizes, named wherever release authority is described. */
export function policyNote(engagement: Engagement) {
	const policies = Object.values(SCENARIOS[engagement.workflowId].artifacts).filter(spec => spec.release?.authority === "policy").map(spec => spec.release!.policy).filter(Boolean)
	return policies.join(" ")
}

export function readinessSplit(state: AgentixState, engagement: Engagement): { rows: ReadinessRow[]; summary: string; full: boolean } {
	const pkg = engagement.proposal?.packageId ? packageFor(engagement.proposal.packageId) : undefined
	const answers = { ...engagement.answers, ...engagement.proposal?.answers }
	const systems = SCENARIOS[engagement.workflowId].systems.filter(system => !system.package || system.package === pkg?.id || engagement.packages.includes(system.package))
	const has = (capability: string) => systems.some(system => system.capability === capability)
	const read: ReadinessRow = { id: "read", label: "Read source systems", state: engagement.checking ? "attention" : "ready", detail: systems.filter(system => system.capability === "read").map(system => `${system.name} · ${system.access}`).join(" · ") || "Reads the systems in scope, read only" }
	const build: ReadinessRow = has("build")
		? { id: "build", label: "Build and test in isolation", state: answers.testdata === "masked" ? "blocked" : answers.testdata ? "ready" : "attention", detail: answers.testdata === "masked" ? "A masked production extract needs the data owner's approval first" : answers.testdata ? (systems.find(system => system.capability === "build")?.detail ?? "Isolated test workspace · synthetic data · no production credentials") : "Choose what data isolated tests may use" }
		: { id: "build", label: "Build and test in isolation", state: "none", detail: "This work doesn't build or test changes" }
	const production: ReadinessRow = !has("production") && !has("update")
		? { id: "production", label: "Change production", state: "none", detail: "No production changes in scope" }
		: engagement.permission === "lost" ? { id: "production", label: "Change production", state: "blocked", detail: "The release adapter's role lost write access; releases can't apply until it's restored" }
		: engagement.automaticPayroll ? { id: "production", label: "Change production", state: "blocked", detail: "Automatic payroll provisioning has no certified operation" }
		: !has("production") ? { id: "production", label: "Update business records", state: engagement.checked ? "ready" : "attention", detail: systems.filter(system => system.capability === "update").map(system => `${system.name} · ${system.access}`).join(" · ") }
		: answers.release ? { id: "production", label: "Change production", state: "ready", detail: `${answers.release === "window" ? `Tested pipeline versions release in the ${releaseWindowFor(engagement.workflowId).label} window under policy` : "Each pipeline release waits for your approval with its target, checks and recovery limits"}. ${policyNote(engagement)}`.trim() }
		: { id: "production", label: "Change production", state: "attention", detail: "Decide how production releases are authorized" }
	const rows = [read, build, production]
	const full = rows.every(row => row.state === "ready" || row.state === "none")
	const summary = full ? (production.state === "ready" && answers.release === "approval" ? `Ready to start. Build and test begin at once; each pipeline release still waits for your approval. ${policyNote(engagement)}`.trim() : "Ready to start within the approved boundary.")
		: production.state === "blocked" && build.state !== "blocked" ? `${build.state === "none" ? "Reading can start" : "Build and test can start"}. Production changes are blocked, so the full outcome isn't ready.`
		: "Answer the open questions before activation. Nothing runs yet."
	return { rows, summary, full }
}

/* ---- Releases ------------------------------------------------------------ */
export const releaseStatusLabel: Record<Release["status"], { label: string; tone: Tone }> = {
	preparing: { label: "Preparing", tone: "live" }, awaiting_approval: { label: "Needs approval", tone: "attention" }, held: { label: "Held", tone: "neutral" },
	blocked: { label: "Blocked", tone: "danger" }, releasing: { label: "Releasing", tone: "live" }, unknown: { label: "Reconciling", tone: "attention" },
	applied: { label: "Applied · verifying", tone: "live" }, verified: { label: "Verified", tone: "positive" }, stopped: { label: "Stopped", tone: "neutral" },
	superseded: { label: "Superseded", tone: "neutral" }, declined: { label: "Kept in test", tone: "neutral" },
}

export function releaseSentence(state: AgentixState, release: Release) {
	const artifact = artifactBy(state, release.artifactId)
	const name = `${artifact?.title.toLowerCase() ?? "version"} v${release.version}`
	switch (release.status) {
		case "preparing": return `Preparing ${name} for release`
		case "awaiting_approval": return `Waiting for your approval to release ${name}`
		case "held": {
			const approvedForWindow = release.decisionId ? decisionBy(state, release.decisionId)?.choice === "window" : false
			return `${release.ownerHold ? "Held by you" : approvedForWindow ? "Approved by you for the window · held" : "Held by policy"} until ${release.holdUntil ? shortTime(release.holdUntil) : "you release it"}`
		}
		case "blocked": return "Blocked: the release adapter's role lost write access. Nothing was released."
		case "releasing": return `Releasing ${name}`
		case "unknown": return "Outcome unknown after dispatch. Reconciling by reading back the target; no retry is sent."
		case "applied": return `Applied ${release.appliedAt ? shortTime(release.appliedAt) : ""} · verification running`
		case "verified": return `Live and verified since ${release.verifiedAt ? shortTime(release.verifiedAt) : "release"}`
		case "stopped": return "Stopped by you before it applied. Nothing was released."
		case "superseded": return "Superseded by a newer version before it applied"
		case "declined": return "Kept in test by you. Nothing was released."
	}
}

export const describeClock = (time: number) => londonTime(time)
