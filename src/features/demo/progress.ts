import { validState } from "@/features/agentix/prototype/engine/storage"
import type { AgentixState } from "@/features/agentix/prototype/engine/types"
import { DEMO_STEP_ORDER, type DemoScript, type DemoStepId } from "./scripts"
import { DEMO_KEYS, demoKey } from "./session"

/*
 * Where the presenter is in a customer demo, read from what the demo itself saved: its
 * Discovery record and its Agentix state. The in-app dock and the second-screen guide both
 * read it this way, so they never disagree, and neither needs the page's React state.
 *
 * Every demo tells the same twelve-beat story against the same engine, so this reader is one
 * implementation: the script says which Discovery, which package, which engagement and which
 * decision variant to look for.
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
	handoff?: { id: string; createdAt: string; note: string; target?: string; packageId?: string; recordId?: string; title?: string } | null
	// Only who spoke last is read: an owner's answer MAX hasn't replied to yet.
	messages?: Array<{ actor?: unknown }>
	updatedAt: string
}

export type DemoSnapshot = { discovery: DemoDiscovery | null; agentix: AgentixState | null }

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
	if (!storage) return { discovery: null, agentix: null }
	const agentix = parse(storage.getItem(demoKey(DEMO_KEYS.agentix, script.id)))
	return { discovery: demoRecord(parse(storage.getItem(demoKey(DEMO_KEYS.discovery, script.id))), script.scenarioKey), agentix: validState(agentix) ? agentix : null }
}
function safeStorage(): Storage | null { try { return window.localStorage } catch { return null } }

export type DemoAction =
	| { kind: "discover" }
	| { kind: "fill"; text: string }
	| { kind: "discovery"; recordId: string; jump: "resume" | "decision" | "package" | "autonomy" }
	| { kind: "review" }
	| { kind: "engagement" }

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
	status: "done" | "current" | "upcoming"
}

export const demoStepCopy = (script: DemoScript, id: DemoStepId) => script.steps[id]

/* MAX is still composing its reply to the answer just sent; the saved question number moves only when it replies. */
export const awaitingReply = (discovery: DemoDiscovery | null) => Array.isArray(discovery?.messages) && discovery.messages.at(-1)?.actor === "user"

/* The scripted answer for the question MAX is asking now, when it is one of the six. */
export function nextAnswer(script: DemoScript, discovery: DemoDiscovery | null) {
	if (!discovery || discovery.interviewClosed || discovery.clarificationPending || awaitingReply(discovery)) return null
	return script.answers[discovery.interviewIndex] ?? null
}

/*
 * What Agentix has actually done, in the terms the twelve beats need. Every demo's engagement is
 * built from the same three artifacts and three milestones, so only the names come from the script.
 */
function agentixFacts(script: DemoScript, state: AgentixState | null) {
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
		cycleStarted: cycles.length > 0,
		cycled: cycles.some(item => item.status === "verified"),
		cycleRunning: cycles.some(item => item.status !== "verified" && item.status !== "scheduled"),
	}
}

/* Every step with its status; exactly one is current until the story is told. */
export function demoSteps(script: DemoScript, snapshot: DemoSnapshot): { steps: DemoStep[]; current: number } {
	const discovery = snapshot.discovery
	const facts = agentixFacts(script, snapshot.agentix)
	const handedOff = !!discovery?.handoff || facts.inReview || facts.activated
	const done: Record<DemoStepId, boolean> = {
		start: !!discovery || handedOff,
		interview: !!discovery?.interviewClosed || handedOff,
		decision: (!!discovery && discovery.decision !== "pending") || handedOff,
		// Reading the package ends when the presenter moves on to the handoff.
		package: ((discovery?.phase ?? 0) >= FINAL_PHASE && !!discovery?.charterApproval) || handedOff,
		handoff: handedOff,
		proposal: facts.activated,
		mapping: facts.ruleDecided,
		pipeline: facts.repaired,
		release: facts.released,
		// Showing the dashboard ends when the presenter starts the next cycle.
		dashboard: facts.published && facts.cycleStarted,
		cycle: facts.cycled,
		close: false,
	}
	const current = DEMO_STEP_ORDER.findIndex(id => !done[id])
	const steps = DEMO_STEP_ORDER.map((id, index): DemoStep => {
		const status = index < current ? "done" : index === current ? "current" : "upcoming"
		return { id, ...script.steps[id], status, ...status === "current" ? live(script, id, discovery, facts) : {} }
	})
	return { steps, current }
}

// The live detail and next action for the step the presenter is on.
function live(script: DemoScript, id: DemoStepId, discovery: DemoDiscovery | null, facts: ReturnType<typeof agentixFacts>): Pick<DemoStep, "detail" | "action"> {
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
			}
		}
		case "decision": {
			const waiting = (discovery?.phase ?? 0) >= 4
			return record ? { detail: waiting ? "The decision is waiting for you." : "MAX is investigating; the decision arrives in a few seconds.", action: waiting ? { label: "Open the decision", run: { kind: "discovery", recordId: record, jump: "decision" } } : { label: "Open Autonomy", run: { kind: "discovery", recordId: record, jump: "autonomy" } } } : {}
		}
		case "package": return record ? { detail: (discovery?.phase ?? 0) >= FINAL_PHASE ? "The nine documents are ready." : "MAX is writing the nine documents.", action: { label: "Open Package", run: { kind: "discovery", recordId: record, jump: "package" } } } : {}
		case "handoff": return record ? { detail: "Charter approved.", action: { label: "Open Package", run: { kind: "discovery", recordId: record, jump: "package" } } } : {}
		case "proposal": {
			// What still stands between the proposal and activation, in the order the page asks for it.
			const open = 2 - facts.answered
			const detail = !facts.inReview ? undefined : open > 0 ? `${open === 1 ? "One question" : "Two questions"} to answer.` : facts.checking ? "The read-only check is running." : !facts.checked ? "Run the read-only check next." : "Ready to activate."
			return { detail, action: { label: "Open the proposal", run: { kind: "review" } } }
		}
		case "mapping":
		case "pipeline":
		case "release": return { action: { label: "Open the engagement", run: { kind: "engagement" } } }
		case "dashboard": return { detail: facts.published ? `Published under ${script.publishPolicy}.` : "MS-3 is building and testing the dashboard.", action: { label: "Open the engagement", run: { kind: "engagement" } } }
		case "cycle": return { detail: facts.cycleRunning ? "The cycle is running" : undefined, action: { label: "Open the engagement", run: { kind: "engagement" } } }
		default: return { action: { label: "Open the engagement", run: { kind: "engagement" } } }
	}
}
