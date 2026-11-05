import type { WorkflowId } from "@/features/agentix/prototype/initiatives"
import type { HeardSpec } from "@/features/discovery-autonomous/interview"
import type { ScenarioKey } from "@/features/discovery-autonomous/model"

/*
 * A customer demo is a script: which Discovery starts it, where its approved package goes, and the
 * beats the presenter walks. Most demos hand the package to Agentix, which creates an engagement
 * from it; a demo that maps how the organization works hands it to Knowledge instead. The harness
 * (session, progress, the dock and the guide) reads only this shape, so a new demo is a new script
 * rather than a new code path, and a new ending is the one place that adds beats.
 */

/*
 * The demos that exist. A demo is added here and registered in ./index in the same change —
 * the registry is typed `Record<DemoId, DemoScript>`, so an id without a script will not compile,
 * and an address naming anything else is simply not a demo.
 */
export type DemoId = "revenue" | "servicenow" | "salesforce-sap" | "s4hana" | "close-map"

/*
 * Every demo opens with the same seven Discovery beats: Discovery investigates (a person approves
 * each interviewer's brief) and decides, and a person approves one exact package version and
 * hands it over. What follows depends on where it went.
 */
export type DiscoveryStepId = "start" | "interview" | "briefs" | "decision" | "package" | "approve" | "handoff"
/*
 * To Agentix: an agent team is created from nothing, builds, is corrected by a failing check,
 * releases under policy, publishes, and then runs the work every morning. Fourteen beats in all.
 */
export type AgentixStepId = DiscoveryStepId | "proposal" | "mapping" | "pipeline" | "release" | "dashboard" | "cycle" | "close"
/*
 * To Knowledge: the package arrives as suggestions, and an Owner or Admin publishes them one by
 * one: the first reviewed, the corrected procedure, and the restricted one. Eleven beats in all.
 */
export type KnowledgeStepId = DiscoveryStepId | "suggestions" | "procedure" | "restricted" | "close"
export type DemoStepId = AgentixStepId | KnowledgeStepId

export type DemoStepCopy = {
	title: string
	/* What the presenter does, in the product's own words. */
	does: string
	/* What the presenter says while it happens. */
	says: string
}

/* One line on a stakeholder call MAX runs after the owner interview. */
export type CallLine = { by: "max" | "them"; text: string }
/* MAX's call with one stakeholder, as Autonomy replays it: a few lines, and what MAX took from it. */
export type StakeholderCall = { person: string; lines: readonly CallLine[]; insight: string }

type DemoScriptBase = {
	id: DemoId
	/* The sidebar row: "Revenue demo". */
	label: string
	/* The demo's subject, used in the guide's title and heading: "Revenue reconciliation". */
	name: string
	/* The dock's kicker, lower case: "Presenter · revenue demo". */
	kicker: string
	/* The Discovery template the presenter starts from. */
	templateName: string
	/* The Discovery this demo follows, and the package it hands over. */
	scenarioKey: ScenarioKey
	packageId: string
	/* The documents the setup selects; absent means the demo's usual eight (DEMO_OUTPUTS). */
	outputs?: readonly string[]
	/*
	 * How the setup names the Discovery a new one replaces: "replaces the earlier <this> Discovery".
	 * Written out rather than derived, so each demo reads the way a presenter would say it.
	 */
	replacesLabel: string
	/* What the presenter types during the owner interview, in order. */
	answers: readonly string[]
	/*
	 * What MAX says back to each scripted answer before its next question. Written to be heard as
	 * well as read: the call speaks them, and they are fixed so they can be pre-rendered. The
	 * second keeps the Thread's source-check sentence; the last closes the interview.
	 */
	replies: readonly string[]
	/* What MAX heard in each answer, for "What MAX heard". A `check` is read during the call; `open` stays a gap. */
	heard: readonly HeardSpec[]
	/* MAX's stakeholder calls after the owner interview, replayed in Autonomy. */
	calls: readonly StakeholderCall[]
	/* Where two stakeholders' answers disagree. It becomes the Discovery's one decision. */
	conflict: { between: readonly [string, string]; summary: string }
	/* The reason the presenter gives when approving the charter; absent when the demo selects no charter. */
	charterReason?: string
	handoffNote: string
}

/* A demo whose package goes to Agentix, which creates and runs an engagement from it. */
export type AgentixDemoScript = DemoScriptBase & {
	ending: "agentix"
	/* The Agentix engagement the package creates. */
	engagementId: WorkflowId
	/*
	 * The variant prefix MS-1's decision writes onto the mapping artifact. Reading it is how the
	 * progress reader knows the presenter answered the specialist rather than merely opened the work.
	 */
	decisionVariant: string
	/*
	 * The policy the dashboard publishes under, named in the tenth beat's live detail.
	 * Each engagement has its own; the revenue demo's is not everyone's.
	 */
	publishPolicy: string
	steps: Record<AgentixStepId, DemoStepCopy>
}

/* A demo whose package goes to Knowledge as suggestions an Owner or Admin publishes. */
export type KnowledgeDemoScript = DemoScriptBase & {
	ending: "knowledge"
	/* The suggestions the eighth to tenth beats wait on, by the ids the package sends them under. */
	suggestions: { procedure: string; restricted: string }
	steps: Record<KnowledgeStepId, DemoStepCopy>
}

export type DemoScript = AgentixDemoScript | KnowledgeDemoScript

export const DEMO_STEP_ORDER: AgentixStepId[] = [
	"start", "interview", "briefs", "decision", "package", "approve", "handoff", "proposal",
	"mapping", "pipeline", "release", "dashboard", "cycle", "close",
]
export const KNOWLEDGE_STEP_ORDER: KnowledgeStepId[] = [
	"start", "interview", "briefs", "decision", "package", "approve", "handoff",
	"suggestions", "procedure", "restricted", "close",
]
/* The beats a script's story walks, in order. */
export const stepOrder = (script: DemoScript): DemoStepId[] => script.ending === "knowledge" ? KNOWLEDGE_STEP_ORDER : DEMO_STEP_ORDER
