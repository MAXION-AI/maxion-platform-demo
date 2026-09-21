import type { WorkflowId } from "../initiatives"

/*
 * The Agentix demo's one state model (version 4). An engagement owns a business
 * objective; its specialists own ongoing duties; a work item is a case, a
 * scheduled cycle or a bounded milestone; an artifact is something a specialist
 * produced, in versions; a release applies one tested version to a named
 * target. They are distinct records that refer to each other, so a status is
 * stored once and every surface (work, results, activity, conversation) reads
 * the same object.
 */

export type Tone = "positive" | "live" | "attention" | "danger" | "neutral"

/* One vocabulary for work in every list, detail, activity row and result. */
export type WorkStatus =
	| "scheduled" // a future occurrence of a recurring cycle
	| "queued" // accepted; waiting for intake or a free slot
	| "working" // a specialist is acting on a named step
	| "waiting" // blocked on something named in `wait`
	| "verifying" // effect applied; evidence being read back
	| "verified" // every obligation is evidenced
	| "partial" // some obligations met, others outstanding; nothing is undone
	| "failed" // a step failed and needs a precise next step
	| "not_completed" // closed without the outcome (declined, missed)
	| "paused" // paused by the owner before its next action

export type WaitReason =
	| { kind: "dependency"; on: string; step?: string }
	| { kind: "decision"; decisionId: string }
	| { kind: "human"; owner: string }
	| { kind: "slot" }
	| { kind: "intake" }
	| { kind: "connection"; system: string }
	| { kind: "hold" }
	| { kind: "window"; until: number }
	| { kind: "permission"; system: string }
	| { kind: "release"; releaseId: string }

export type StepKind = "read" | "analyze" | "build" | "test" | "repair" | "decision" | "human" | "write" | "release" | "verify" | "notify" | "refresh"
export type StepStatus = "pending" | "working" | "done" | "waiting" | "failed" | "skipped"

export interface StepState { id: string; status: StepStatus; ticks: number; startedAt?: number; doneAt?: number }

export interface ObligationState { id: string; status: "pending" | "met" | "outstanding" | "not_met"; evidence?: string }

/* A change the work made (or tried to make) in another system. `sends` counts dispatches, so a duplicate is visible. */
export interface EffectState { id: string; system: string; operation: string; sends: number; status: "applied" | "unknown" | "verified" | "failed"; reference?: string }

export type Flag = "needsApproval" | "approved" | "declined" | "writeTimeout" | "reconciled" | "missed" | "humanDone" | "released"

export interface WorkItem {
	id: string
	engagementId: string
	template: string
	kind: "case" | "cycle" | "milestone"
	reference: string
	title: string
	status: WorkStatus
	wait?: WaitReason
	steps: StepState[]
	dependsOn: { id: string; step?: string }[]
	priority: "Normal" | "High"
	trigger: "Event" | "Schedule" | "Assignment" | "Setup"
	occurrence: string
	started: number
	finished?: number
	obligations: ObligationState[]
	effects: EffectState[]
	artifactIds: string[]
	releaseIds: string[]
	held: boolean
	pausedFrom?: WorkStatus
	/* A sub-stage of the current step: repairing a failed check, or reconciling an uncertain effect. */
	stage?: "repairing" | "reconciling"
	costCents: number
	humanReference?: string
	flags: Partial<Record<Flag, boolean>>
	notes: string[]
}

export type ArtifactKind = "mapping" | "pipeline" | "dashboard" | "reconciliation" | "runbook"
export type CheckStatus = "pending" | "running" | "passed" | "failed" | "invalidated"
export interface CheckState { id: string; status: CheckStatus; detail?: string }

export interface ArtifactVersion {
	version: number
	createdAt: number
	author: string
	summary: string
	changes: string[]
	/* Scenario content switches: what this version actually contains. */
	variant: string[]
	status: "draft" | "testing" | "failed" | "tested" | "released" | "superseded"
	checks: CheckState[]
	source: "build" | "repair" | "amendment" | "decision"
	instructionId?: string
}

export interface Artifact {
	id: string
	engagementId: string
	kind: ArtifactKind
	key: string
	title: string
	workItemId: string
	versions: ArtifactVersion[]
	/* The version live in the (simulated) production target, if any. */
	productionVersion?: number
	dependsOn: string[]
}

export type ReleaseStatus = "preparing" | "awaiting_approval" | "held" | "blocked" | "releasing" | "unknown" | "applied" | "verified" | "stopped" | "superseded" | "declined"

export interface Release {
	id: string
	reference: string
	engagementId: string
	workItemId: string
	artifactId: string
	version: number
	target: string
	status: ReleaseStatus
	authority: "policy" | "approval"
	holdUntil?: number
	/* Held by the owner's instruction rather than by policy. */
	ownerHold?: boolean
	/* Pre-authorized only for the Saturday window: every return to "preparing" holds it for the next window again. */
	windowOnly?: boolean
	attempts: number
	effectId: string
	decisionId?: string
	createdAt: number
	appliedAt?: number
	verifiedAt?: number
}

export type DecisionKind = "approval" | "question" | "release" | "human" | "repair"
export interface Decision {
	id: string
	engagementId: string
	workItemId: string
	kind: DecisionKind
	template: string
	status: "open" | "resolved" | "withdrawn"
	choice?: string
	resolvedAt?: number
	/* What the decision is bound to, so a changed object can't inherit it. */
	binding: string
}

export type ObjectRef = { kind: "work"; id: string } | { kind: "artifact"; id: string; version?: number } | { kind: "release"; id: string } | { kind: "decision"; id: string }

export interface ActivityEvent {
	id: string
	at: number
	engagementId: string
	workItemId?: string
	artifactId?: string
	releaseId?: string
	decisionId?: string
	actor: string
	kind: "step" | "check" | "repair" | "decision" | "instruction" | "release" | "effect" | "notice" | "cycle" | "assignment" | "version"
	text: string
	tone: Tone
	operations?: string[]
	evidence?: string[]
	/* Worth a line in the conversation. */
	material?: boolean
}

export type ScopeRef = { kind: "engagement" } | { kind: "work"; id: string } | { kind: "artifact"; id: string }
export type InstructionIntent = "question" | "steer" | "assign" | "amend" | "clarify" | "refuse" | "unsupported"
export type InstructionStatus = "received" | "queued" | "awaiting" | "applied" | "failed" | "answered" | "declined"

export type PendingChange =
	| { kind: "amend"; artifactId: string; change: string }
	| { kind: "assign"; template: string; title: string }

export interface Message {
	id: string
	engagementId: string
	scope: ScopeRef
	role: "owner" | "agent"
	text: string
	at: number
	/* On an owner's message: what the instruction became. */
	instruction?: { intent: InstructionIntent; status: InstructionStatus; pending?: PendingChange; links: ObjectRef[] }
	/* On an agent's message: the objects it concerns. */
	links?: ObjectRef[]
	/* An offer the owner can accept explicitly (a question never starts work by itself). */
	offer?: PendingChange
	/* A progress update posted from the activity log. */
	update?: boolean
}

/* The Discovery a package came from: its saved record and the handoff packet it froze. */
export type DiscoveryLink = { recordId: string; packetId: string; title: string }
export type Origin = { kind: "discovery"; packageId: string; version: number; title: string; discovery?: DiscoveryLink } | { kind: "prompt" }

export interface Proposal {
	origin: "discovery" | "prompt"
	packageId?: string
	brief: string
	kind: "new" | "expansion"
	answers: Record<string, string>
	receivedAt: number
	discovery?: DiscoveryLink
}

export interface Engagement {
	id: string
	workflowId: WorkflowId
	name: string
	owner: string
	scope: string
	trigger: "Event" | "Schedule" | "Assignment"
	status: "draft" | "active" | "paused"
	version: number
	origin: Origin
	brief: string
	/* Discovery packages whose scope this engagement has activated. */
	packages: string[]
	/* A package or brief being prepared for this engagement: a new draft, or an expansion of a live one. */
	proposal?: Proposal
	/* Answers to a package's focused questions, kept once activated (for example, release authority). */
	answers: Record<string, string>
	/* Recurring cycles: none yet, weekday mornings, or every morning. */
	cycles: "off" | "weekdays" | "daily"
	mapping: string
	checked: boolean
	checking: boolean
	automaticPayroll: boolean
	supportRequested: boolean
	connection: "ready" | "expired"
	permission: "ready" | "lost"
	holdNotifications: boolean
	nextOccurrence: string
	notes: string[]
}

export type View = "work" | "results" | "activity"
export interface Nav {
	engagementId: string | null
	view: View
	workId?: string
	resultId?: string
	activityFilter: "all" | "decisions" | "operations" | "instructions"
	workFilter: "all" | "attention"
	creating: boolean
	/* Which engagement's proposal is open for review, when one is. */
	reviewing?: string
}

export interface AgentixState {
	version: 4
	clock: number
	seq: number
	engagements: Record<string, Engagement>
	work: WorkItem[]
	artifacts: Artifact[]
	releases: Release[]
	decisions: Decision[]
	events: ActivityEvent[]
	messages: Message[]
	drafts: Record<string, string>
	nav: Nav
	ui: { conversationPinned: boolean }
	/* Demo-only switches: a failure armed for the next release, and the scripted scenario a brief is matched to. */
	/*
	 * Demo-only switches: a failure armed for the next release, the scripted scenario a brief is matched to,
	 * and, in the customer demo, quiet intake (the presenter adds work) and packages that must come from their Discovery first.
	 */
	demo: { ackLoss: boolean; scenario: WorkflowId | ""; quiet?: boolean; gated?: string[] }
}

export const scopeKey = (engagementId: string, scope: ScopeRef) => scope.kind === "engagement" ? `eng:${engagementId}` : `${scope.kind}:${scope.id}`
export const sameScope = (a: ScopeRef, b: ScopeRef) => a.kind === b.kind && (a.kind === "engagement" || (a as { id: string }).id === (b as { id: string }).id)
