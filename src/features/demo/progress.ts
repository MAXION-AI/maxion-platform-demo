import { validState } from "@/features/agentix/prototype/engine/storage"
import type { AgentixState } from "@/features/agentix/prototype/engine/types"
import { packageSuggestions } from "@/features/organization/discoverySuggestions"
import { validKnowledgeState, type KnowledgeState } from "@/features/organization/knowledge"
import { DEMO_STEP_ORDER, KNOWLEDGE_STEP_ORDER, type AgentixDemoScript, type AgentixStepId, type DemoScript, type DemoStepCopy, type DemoStepId, type DiscoveryStepId, type KnowledgeDemoScript, type KnowledgeStepId } from "./scripts"
import { DEMO_KEYS, demoKey } from "./session"

/*
 * Where the presenter is in a customer demo, read from what the demo itself saved: its
 * Discovery record, its Agentix state and its Knowledge library. The in-app dock and the
 * second-screen guide both read it this way, so they never disagree, and neither needs the
 * page's React state.
 *
 * Every demo opens with the same seven Discovery beats; an Agentix demo then tells the same
 * fourteen-beat story against the same engine, and a Knowledge demo its eleven against the same
 * library. So this reader is one implementation per ending: the script says which Discovery,
 * which package, and which engagement or suggestions to look for.
 */

const FINAL_PHASE = 7

/* The fields of a saved Discovery record the guide reads; the page owns the full shape. */
export type DemoDiscovery = {
	id: string
	title: string
	scenarioKey: string
	phase: number
	decision: string
	interviewIndex: number
	interviewClosed: boolean
	clarificationPending: boolean
	charterApproval?: unknown
	excludedOutputs?: string[]
	// The gates this reader follows; records from before them simply have none waiting.
	work?: { package?: { status?: string; version?: number }; briefs?: Array<{ status?: string }> }
	handoff?: { id: string; createdAt: string; note: string; target?: string; packageId?: string; recordId?: string; title?: string } | null
	// Only who spoke last is read: an owner's answer MAX hasn't replied to yet.
	messages?: Array<{ actor?: unknown }>
	updatedAt: string
}

export type DemoSnapshot = { discovery: DemoDiscovery | null; agentix: AgentixState | null; knowledge: KnowledgeState | null }

const parse = (raw: string | null): unknown => { try { return raw ? JSON.parse(raw) : null } catch { return null } }

function demoRecord(raw: unknown, scenarioKey: string): DemoDiscovery | null {
	if (!Array.isArray(raw)) return null
	const records = raw.filter((entry): entry is DemoDiscovery => !!entry && typeof entry === "object"
		&& (entry as DemoDiscovery).scenarioKey === scenarioKey && typeof (entry as DemoDiscovery).id === "string"
		&& Number.isFinite((entry as DemoDiscovery).phase) && Number.isFinite((entry as DemoDiscovery).interviewIndex))
	// The most recently worked Discovery of this demo's scenario is the one being presented.
	return records.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null
}

/* Reads a demo's saved state wherever it runs: the demo tab, or the presenter's guide window. */
export function readDemoSnapshot(script: DemoScript, storage: Pick<Storage, "getItem"> | null = safeStorage()): DemoSnapshot {
	if (!storage) return { discovery: null, agentix: null, knowledge: null }
	const agentix = parse(storage.getItem(demoKey(DEMO_KEYS.agentix, script.id)))
	const knowledge = parse(storage.getItem(demoKey(DEMO_KEYS.knowledge, script.id)))
	return {
		discovery: demoRecord(parse(storage.getItem(demoKey(DEMO_KEYS.discovery, script.id))), script.scenarioKey),
		agentix: validState(agentix) ? agentix : null,
		knowledge: validKnowledgeState(knowledge) ? knowledge : null,
	}
}
function safeStorage(): Storage | null { try { return window.localStorage } catch { return null } }

export type DemoAction =
	| { kind: "discover" }
	| { kind: "fill"; text: string }
	| { kind: "call"; recordId: string }
	| { kind: "discovery"; recordId: string; jump: "resume" | "decision" | "package" | "autonomy" | "briefs" | "package-approval" }
	| { kind: "review" }
	| { kind: "engagement" }
	// Opens Knowledge, on one suggestion's sheet when the beat is about it.
	| { kind: "knowledge"; item?: string }

export type DemoStep = {
	id: DemoStepId
	title: string
	/* What the presenter does, in the product's own words. */
	does: string
	/* What the presenter says while it happens. */
	says: string
	/* Live detail for the current step ("Question 3 of 6"). */
	detail?: string
	/* The one button that moves the presenter on, when there is one. */
	action?: { label: string; run: DemoAction }
	/* A quieter second way to do the same step: the owner interview can be a call. */
	secondary?: { label: string; run: DemoAction }
	status: "done" | "current" | "upcoming"
}

export const demoStepCopy = (script: DemoScript, id: DemoStepId): DemoStepCopy | undefined => (script.steps as Partial<Record<DemoStepId, DemoStepCopy>>)[id]

/* MAX is still composing its reply to the answer just sent; the saved question number moves only when it replies. */
export const awaitingReply = (discovery: DemoDiscovery | null) => Array.isArray(discovery?.messages) && discovery.messages.at(-1)?.actor === "user"

/* The scripted answer for the question MAX is asking now, when it is one of the six. */
export function nextAnswer(script: DemoScript, discovery: DemoDiscovery | null) {
	if (!discovery || discovery.interviewClosed || discovery.clarificationPending || awaitingReply(discovery)) return null
	return script.answers[discovery.interviewIndex] ?? null
}

/*
 * What Agentix has actually done, in the terms the fourteen beats need. Every demo's engagement is
 * built from the same three artifacts and three milestones, so only the names come from the script.
 */
function agentixFacts(script: AgentixDemoScript, state: AgentixState | null) {
	const engagementId = script.engagementId
	const engagement = state?.engagements[engagementId]
	const activated = !!engagement?.packages.includes(script.packageId)
	const inReview = engagement?.proposal?.packageId === script.packageId
	const artifact = (key: string) => state?.artifacts.find(entry => entry.id === `${engagementId}:${key}`)
	const mapping = artifact("mapping"), pipeline = artifact("pipeline"), dashboard = artifact("dashboard")
	const milestone = (reference: string) => state?.work.find(item => item.engagementId === engagementId && item.reference === reference)
	const ruleDecided = !!mapping?.versions.some(version => version.variant.some(entry => entry.startsWith(script.decisionVariant))) || milestone("MS-1")?.status === "verified"
	const repaired = !!pipeline?.versions.some(version => version.source === "repair" && (version.status === "tested" || version.status === "released")) || pipeline?.productionVersion !== undefined
	const cycles = state?.work.filter(item => item.engagementId === engagementId && item.kind === "cycle") ?? []
	return {
		activated, inReview, ruleDecided, repaired,
		answered: Object.keys(engagement?.proposal?.answers ?? {}).length,
		checking: !!engagement?.checking,
		checked: !!engagement?.checked,
		released: pipeline?.productionVersion !== undefined,
		published: dashboard?.productionVersion !== undefined && milestone("MS-3")?.status === "verified",
		uncertain: !!state?.releases.some(release => release.engagementId === engagementId && release.status === "unknown"),
		cycleStarted: cycles.length > 0,
		cycled: cycles.some(item => item.status === "verified"),
		cycleRunning: cycles.some(item => item.status !== "verified" && item.status !== "scheduled"),
	}
}

const CHARTER_NAME = "Project charter and governance"
const briefsWaiting = (discovery: DemoDiscovery | null) => discovery?.work?.briefs?.filter(brief => brief.status === "draft").length ?? 0

/* The seven Discovery beats every demo opens with. Once the package has gone, all of them are done. */
function discoveryDone(discovery: DemoDiscovery | null, handedOff: boolean): Record<DiscoveryStepId, boolean> {
	return {
		start: !!discovery || handedOff,
		interview: !!discovery?.interviewClosed || handedOff,
		// The briefs are done once none waits; interviews can't open before that.
		briefs: (!!discovery?.interviewClosed && !briefsWaiting(discovery)) || handedOff,
		decision: (!!discovery && discovery.decision !== "pending") || handedOff,
		// Reading the package ends when the charter is approved, or was never selected.
		package: ((discovery?.phase ?? 0) >= FINAL_PHASE && (!!discovery?.charterApproval || !!discovery?.excludedOutputs?.includes(CHARTER_NAME))) || handedOff,
		// Only the record saying "approved" ends this step: nothing here assumes it.
		approve: discovery?.work?.package?.status === "approved" || handedOff,
		handoff: handedOff,
	}
}

type Live = Pick<DemoStep, "detail" | "action" | "secondary">

/* Every step with its status; exactly one is current until the story is told. */
function walk<Id extends DemoStepId>(order: readonly Id[], done: Record<Id, boolean>, copy: Record<Id, DemoStepCopy>, live: (id: Id) => Live): { steps: DemoStep[]; current: number } {
	const current = order.findIndex(id => !done[id])
	const steps = order.map((id, index): DemoStep => {
		const status = index < current ? "done" : index === current ? "current" : "upcoming"
		return { id, ...copy[id], status, ...status === "current" ? live(id) : {} }
	})
	return { steps, current }
}

export function demoSteps(script: DemoScript, snapshot: DemoSnapshot): { steps: DemoStep[]; current: number } {
	return script.ending === "knowledge" ? knowledgeSteps(script, snapshot) : agentixSteps(script, snapshot)
}

function agentixSteps(script: AgentixDemoScript, snapshot: DemoSnapshot) {
	const discovery = snapshot.discovery
	const facts = agentixFacts(script, snapshot.agentix)
	const handedOff = !!discovery?.handoff || facts.inReview || facts.activated
	const done: Record<AgentixStepId, boolean> = {
		...discoveryDone(discovery, handedOff),
		proposal: facts.activated,
		mapping: facts.ruleDecided,
		pipeline: facts.repaired,
		release: facts.released,
		// Showing the dashboard ends when the presenter starts the next cycle.
		dashboard: facts.published && facts.cycleStarted,
		cycle: facts.cycled,
		close: false,
	}
	return walk(DEMO_STEP_ORDER, done, script.steps, id => live(script, id, discovery, facts))
}

/*
 * What the presenter has done in Knowledge, in the terms the eleven beats need: whether the
 * package's suggestions arrived, and which of them an Owner or Admin has decided. A rejection is a
 * decision too, as either answer is at an Agentix demo's decision, so it ends its beat rather than
 * leaving the story waiting on a suggestion that is gone; the last beat says what was rejected.
 */
function knowledgeFacts(script: KnowledgeDemoScript, state: KnowledgeState | null) {
	const suggestions = packageSuggestions(script.packageId, undefined) ?? []
	const ids = suggestions.map(suggestion => suggestion.id)
	const decided = state?.decided ?? {}
	const arrived = !!state && ids.some(id => id in decided || state.items.some(item => item.id === id))
	const told = [script.suggestions.procedure, script.suggestions.restricted]
	return {
		arrived,
		reviewed: ids.some(id => id in decided),
		waiting: state ? ids.filter(id => state.items.some(item => item.id === id && item.state === "suggested")).length : 0,
		procedure: script.suggestions.procedure in decided,
		restricted: script.suggestions.restricted in decided,
		rejected: suggestions.filter(suggestion => told.includes(suggestion.id) && decided[suggestion.id] === "rejected").map(suggestion => suggestion.title),
	}
}

function knowledgeSteps(script: KnowledgeDemoScript, snapshot: DemoSnapshot) {
	const discovery = snapshot.discovery
	const facts = knowledgeFacts(script, snapshot.knowledge)
	const handedOff = !!discovery?.handoff || facts.arrived
	const done: Record<KnowledgeStepId, boolean> = {
		...discoveryDone(discovery, handedOff),
		suggestions: facts.reviewed,
		procedure: facts.procedure,
		restricted: facts.restricted,
		close: false,
	}
	const waiting = facts.waiting ? `${facts.waiting} suggestion${facts.waiting === 1 ? "" : "s"} waiting in Knowledge.` : undefined
	return walk(KNOWLEDGE_STEP_ORDER, done, script.steps, (id): Live => {
		switch (id) {
			case "suggestions": return { detail: waiting, action: { label: "Open Knowledge", run: { kind: "knowledge" } } }
			case "procedure": return { detail: waiting, action: { label: "Open the procedure", run: { kind: "knowledge", item: script.suggestions.procedure } } }
			case "restricted": return { detail: waiting, action: { label: "Open the restricted procedure", run: { kind: "knowledge", item: script.suggestions.restricted } } }
			case "close": {
				const rejected = facts.rejected.length ? `You rejected ${facts.rejected.join(" and ")}; restart from the finished package to show ${facts.rejected.length === 1 ? "it" : "them"} published.` : undefined
				return { detail: [waiting, rejected].filter(Boolean).join(" ") || undefined, action: { label: "Open Knowledge", run: { kind: "knowledge" } } }
			}
			default: return discoveryLive(script, id, discovery)
		}
	})
}

// The live detail and next action for the step the presenter is on.
function live(script: AgentixDemoScript, id: AgentixStepId, discovery: DemoDiscovery | null, facts: ReturnType<typeof agentixFacts>): Live {
	switch (id) {
		case "proposal": {
			// What still stands between the proposal and activation, in the order the page asks for it.
			const open = 2 - facts.answered
			const detail = !facts.inReview ? undefined : open > 0 ? `${open === 1 ? "One question" : "Two questions"} to answer.` : facts.checking ? "The read-only check is running." : !facts.checked ? "Run the read-only check next." : "Ready to activate."
			return { detail, action: { label: "Open the proposal", run: { kind: "review" } } }
		}
		case "mapping":
		case "pipeline": return { action: { label: "Open the engagement", run: { kind: "engagement" } } }
		case "release": return { detail: facts.uncertain ? "Outcome unknown. Open MS-2 and choose Investigate." : undefined, action: { label: "Open the engagement", run: { kind: "engagement" } } }
		case "dashboard": return { detail: facts.published ? `Published under ${script.publishPolicy}.` : "MS-3 is building and testing the dashboard.", action: { label: "Open the engagement", run: { kind: "engagement" } } }
		case "cycle": return { detail: facts.cycleRunning ? "The cycle is running" : undefined, action: { label: "Open the engagement", run: { kind: "engagement" } } }
		case "close": return { action: { label: "Open the engagement", run: { kind: "engagement" } } }
		default: return discoveryLive(script, id, discovery)
	}
}

// The seven Discovery beats read the same in every demo, whatever happens to the package next.
function discoveryLive(script: DemoScript, id: DiscoveryStepId, discovery: DemoDiscovery | null): Live {
	const record = discovery?.id
	switch (id) {
		case "start": return { action: { label: "Open Discover", run: { kind: "discover" } } }
		case "interview": {
			const answer = nextAnswer(script, discovery)
			const question = Math.min((discovery?.interviewIndex ?? 0) + 1, script.answers.length)
			// While MAX is replying there is nothing to fill; opening the Discovery also lets MAX answer
			// an answer a reload interrupted.
			return {
				detail: awaitingReply(discovery) ? "MAX is replying…" : discovery?.clarificationPending ? "MAX asked a follow-up. Answer it in your own words, or say who would know." : `Question ${question} of ${script.answers.length}`,
				action: answer ? { label: "Fill answer", run: { kind: "fill", text: answer } } : record ? { label: "Open the Discovery", run: { kind: "discovery", recordId: record, jump: "resume" } } : undefined,
				// The interview is a call by choice: Fill answer then speaks the answer on the call.
				secondary: record && !discovery?.interviewClosed ? { label: "Start the call", run: { kind: "call", recordId: record } } : undefined,
			}
		}
		case "briefs": {
			const waiting = briefsWaiting(discovery)
			return record ? { detail: waiting ? `${waiting} interview brief${waiting === 1 ? "" : "s"} waiting for you.` : "MAX is drafting the interview briefs.", action: { label: "Open the briefs", run: { kind: "discovery", recordId: record, jump: "briefs" } } } : {}
		}
		case "decision": {
			const waiting = (discovery?.phase ?? 0) >= 4
			return record ? { detail: waiting ? "The decision is waiting for you." : "MAX is investigating; the decision arrives in a few seconds.", action: waiting ? { label: "Open the decision", run: { kind: "discovery", recordId: record, jump: "decision" } } : { label: "Open Autonomy", run: { kind: "discovery", recordId: record, jump: "autonomy" } } } : {}
		}
		case "package": return record ? { detail: (discovery?.phase ?? 0) >= FINAL_PHASE ? "The selected documents are ready." : "MAX is writing the selected documents.", action: { label: "Open Package", run: { kind: "discovery", recordId: record, jump: "package" } } } : {}
		case "approve": {
			const review = discovery?.work?.package
			const version = review?.version ?? 1
			return record ? { detail: review?.status === "returned" ? `Package v${version} is back with MAX; a new version is coming.` : review?.status === "withdrawn" ? `The approval of package v${version} was withdrawn.` : `Package v${version} is waiting for your approval.`, action: { label: "Open the approval", run: { kind: "discovery", recordId: record, jump: "package-approval" } } } : {}
		}
		case "handoff": return record ? { detail: `Package v${discovery?.work?.package?.version ?? 1} approved.`, action: { label: "Open Package", run: { kind: "discovery", recordId: record, jump: "package" } } } : {}
		default: return {}
	}
}
