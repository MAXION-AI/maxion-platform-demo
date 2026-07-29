import {
	ArrowLeft,
	ArrowRight,
	CaretDown,
	CaretRight,
	ChatCircleText,
	Check,
	CheckCircle,
	CirclesThree,
	Clock,
	ClockCounterClockwise,
	Database,
	DotsThree,
	Fingerprint,
	Lightning,
	LinkSimple,
	ListChecks,
	MagnifyingGlass,
	ShieldCheck,
	Crosshair,
	SpinnerGap,
	TreeStructure,
	Users,
	Warning,
	X,
} from "@phosphor-icons/react"
import { useEffect, useRef, useState, type CSSProperties } from "react"

import { MaxionSpiralMark } from "./PortalChrome"
import { PlanLibraryModule } from "./PortalReplicaModules"
import { type MaxionModuleId, type PortalProject } from "./model"

type PlanView = "plan" | "design" | "ledger"
type PlanLedgerSection = "decisions" | "history" | "sources"
type PlanArchitectureLevel = "L2" | "L3" | "L4"

type PlanDiagramLane = { x: number; width: number; label: string }

type PlanFlow = {
	id: string
	number: string
	key: string
	title: string
	summary: string
	owner: string
	evidence: string
	items: number
	dependsOn: string
	risk: string
	levels: Record<PlanArchitectureLevel, {
		name: string
		focus: string
		lanes?: readonly PlanDiagramLane[]
		edges?: readonly string[]
		returnEdge?: string
		nodes: ReadonlyArray<{
			title: string
			detail: string
			tone: "source" | "core" | "store" | "effect"
			team?: string
			artifact?: string
			packageId?: string
			x?: number
			y?: number
			width?: number
		}>
		guidance: readonly string[]
	}>
}

const PLAN_FLOWS: readonly PlanFlow[] = [
	{
		id: "authority", number: "01", key: "CMP-AUTH-01", title: "Mission authority and approval boundary", owner: "Platform architecture", evidence: "27 verified claims", items: 3, dependsOn: "Discovery decision D-14", risk: "High",
		summary: "Make authority explicit before any agent or integration can create an external financial effect.",
		levels: {
			L2: {
				name: "System context", focus: "Who can request, approve, and execute a governed mission.",
				lanes: [{ x: 2, width: 23, label: "BUSINESS REQUEST" }, { x: 27, width: 23, label: "MAXION AUTHORITY PLANE" }, { x: 52, width: 23, label: "APPROVAL AUTHORITY" }, { x: 77, width: 21, label: "EXECUTE" }],
				edges: ["Requested outcome", "AUTH-01 · scope evaluation", "AUTH-02 · signed grant"],
				nodes: [
					{ title: "Business owner", detail: "Requests outcome", tone: "source", team: "Requesting business", artifact: "Outcome request", x: 4, y: 42, width: 19 },
					{ title: "MAXION authority", detail: "Evaluates scope + policy", tone: "core", team: "Security platform team", artifact: "Policy decision point", x: 29, y: 42, width: 19 },
					{ title: "Approval owner", detail: "Grants bounded authority", tone: "store", team: "Named approver", artifact: "Approval ledger entry", x: 54, y: 42, width: 19 },
					{ title: "Execute", detail: "Receives signed mission", tone: "effect", team: "Execute platform team", artifact: "Signed mission intake", x: 79, y: 42, width: 17 },
				],
				guidance: ["Separate request intent from effect authority", "Fail closed when owner, tenant, or policy is absent", "Persist actor, source, scope, and approval provenance"],
			},
			L3: {
				name: "Service interaction", focus: "Services and contracts required to grant a runnable mission.",
				lanes: [{ x: 2, width: 23, label: "PLAN PRODUCT TEAM" }, { x: 27, width: 44, label: "SECURITY PLATFORM TEAM" }, { x: 73, width: 25, label: "EXECUTE PLATFORM TEAM" }],
				edges: ["AUTH-01 · MissionProposal v2", "Immutable decision write", "AUTH-02 · MissionGrant v1"],
				nodes: [
					{ title: "Plan API", detail: "Mission proposal", tone: "source", team: "Plan product team", artifact: "MissionProposal v2 endpoint", x: 4, y: 43, width: 19 },
					{ title: "Policy service", detail: "Tenant-scoped evaluation", tone: "core", team: "Security platform team", artifact: "Policy rules + evaluation", x: 29, y: 43, width: 19 },
					{ title: "Approval ledger", detail: "Immutable decision", tone: "store", team: "Security platform team", artifact: "Ledger transaction", x: 50, y: 43, width: 19 },
					{ title: "Execute API", detail: "Verified mission token", tone: "effect", team: "Execute platform team", artifact: "MissionGrant verifier", x: 77, y: 43, width: 19 },
				],
				guidance: ["Version the mission contract", "Authorize every read and mutation server-side", "Use an immutable approval ledger with correlation IDs"],
			},
			L4: {
				name: "Implementation sequence", focus: "Typed request, policy decision, durable approval, and verified handoff.",
				lanes: [{ x: 2, width: 23, label: "PLAN PRODUCT TEAM" }, { x: 27, width: 44, label: "SECURITY PLATFORM TEAM" }, { x: 73, width: 25, label: "EXECUTE PLATFORM TEAM" }],
				edges: ["Typed scope", "Idempotent transaction", "15m signed grant"],
				nodes: [
					{ title: "createMission()", detail: "Validate typed scope", tone: "source", team: "Plan product team", artifact: "PLAN-101 · schema + endpoint", packageId: "PLAN-101", x: 4, y: 23, width: 19 },
					{ title: "evaluatePolicy()", detail: "Resolve tenant + role", tone: "core", team: "Security platform team", artifact: "AUTH-201 · policy rules", packageId: "AUTH-201", x: 29, y: 23, width: 19 },
					{ title: "recordApproval()", detail: "Idempotent transaction", tone: "store", team: "Security platform team", artifact: "AUTH-201 · ledger write", packageId: "AUTH-201", x: 50, y: 23, width: 19 },
					{ title: "issueMission()", detail: "Short-lived signed grant", tone: "effect", team: "Execute platform team", artifact: "EXEC-301 · grant verifier", packageId: "EXEC-301", x: 77, y: 23, width: 19 },
				],
				guidance: ["Require an idempotency key on create and approve", "Cover cross-tenant IDs, expired grants, and replay attempts", "Acceptance: no runnable mission exists without durable approval"],
			},
		},
	},
	{
		id: "adapter", number: "02", key: "CMP-INT-02", title: "ServiceNow to Workday financial integration", owner: "Enterprise integration", evidence: "19 connector claims", items: 5, dependsOn: "CMP-AUTH-01", risk: "High",
		summary: "Move an approved financial change from ServiceNow into Workday Financials through a governed MuleSoft integration, with an auditable receipt returned to the originating record.",
		levels: {
			L2: {
				name: "Solution architecture", focus: "The business outcome, system boundaries, integration pattern, and delivery-team ownership.",
				lanes: [{ x: 2, width: 30, label: "SERVICENOW TEAM" }, { x: 35, width: 30, label: "MULESOFT TEAM" }, { x: 68, width: 30, label: "WORKDAY TEAM" }],
				edges: ["INT-01 · event", "INT-02 · journal"],
				returnEdge: "JournalReceipt v1 · status returned to ServiceNow",
				nodes: [
					{ title: "ServiceNow", detail: "Financial change workflow · source record", tone: "source", team: "ServiceNow team", artifact: "System of workflow", x: 5, y: 42, width: 22 },
					{ title: "MuleSoft", detail: "Validate, orchestrate, transform, and route", tone: "core", team: "MuleSoft team", artifact: "Integration control plane", x: 39, y: 42, width: 22 },
					{ title: "Workday Financials", detail: "Validate and post accounting journal", tone: "effect", team: "Workday team", artifact: "Financial system of record", x: 73, y: 42, width: 22 },
				],
				guidance: ["ServiceNow owns workflow intent; Workday owns the posted financial result", "MuleSoft is the only cross-system integration path", "A Workday journal ID and status return to the originating ServiceNow record"],
			},
			L3: {
				name: "Technical architecture", focus: "Deployable components, API contracts, security controls, data movement, and runtime failure behavior.",
				lanes: [{ x: 1, width: 17, label: "SERVICENOW TEAM" }, { x: 18, width: 68, label: "MULESOFT INTEGRATION TEAM" }, { x: 86, width: 13, label: "WORKDAY TEAM" }],
				edges: ["INT-01 · event", "validated", "queued · durable", "dequeue", "INT-02 · journal"],
				returnEdge: "JournalReceipt v1 · status returned to ServiceNow",
				nodes: [
					{ title: "Outbound Flow", detail: "Approved record trigger", tone: "source", team: "ServiceNow team", artifact: "Flow Designer", x: 2, y: 43, width: 14 },
					{ title: "Experience API", detail: "POST event · validate JWT", tone: "core", team: "MuleSoft team", artifact: "financial-change-api", x: 19, y: 43, width: 14 },
					{ title: "Process API", detail: "Map, authorize, orchestrate", tone: "core", team: "MuleSoft team", artifact: "finance-process-api", x: 36, y: 43, width: 14 },
					{ title: "Anypoint MQ", detail: "Durable retry + DLQ", tone: "store", team: "MuleSoft team", artifact: "finance-change-q", x: 53, y: 43, width: 14 },
					{ title: "System API", detail: "Workday OAuth + adapter", tone: "core", team: "MuleSoft team", artifact: "workday-finance-api", x: 70, y: 43, width: 14 },
					{ title: "Journal API", detail: "Validate and post journal", tone: "effect", team: "Workday team", artifact: "Accounting Journal", x: 87, y: 43, width: 11 },
				],
				guidance: ["Lock the versioned event and journal contracts before teams build in parallel", "Use OAuth 2.0, mTLS, correlation IDs, and field-level data classification", "Persist retries in Anypoint MQ and send terminal failures to a monitored dead-letter queue"],
			},
			L4: {
				name: "Build architecture", focus: "Team-owned work packages, dependency order, configuration artifacts, tests, and acceptance evidence.",
				lanes: [{ x: 1, width: 20, label: "SERVICENOW" }, { x: 20, width: 39, label: "MULESOFT" }, { x: 58, width: 20, label: "WORKDAY" }, { x: 78, width: 21, label: "JOINT GATE" }],
				edges: ["after INT-01", "after MULE-201", "after INT-02", "gate inputs"],
				returnEdge: "JournalReceipt v1 · status returned to ServiceNow",
				nodes: [
					{ title: "SNOW-101", detail: "Publish approved change event", tone: "source", team: "ServiceNow team", artifact: "Flow + REST message", packageId: "SNOW-101", x: 3, y: 23, width: 16 },
					{ title: "MULE-201", detail: "Build ingress contract", tone: "core", team: "MuleSoft team", artifact: "Experience API", packageId: "MULE-201", x: 22, y: 23, width: 16 },
					{ title: "MULE-202", detail: "Transform + orchestrate", tone: "core", team: "MuleSoft team", artifact: "Process + System APIs", packageId: "MULE-202", x: 41, y: 23, width: 16 },
					{ title: "WDAY-301", detail: "Secure journal endpoint", tone: "effect", team: "Workday team", artifact: "ISU + journal config", packageId: "WDAY-301", x: 60, y: 23, width: 16 },
					{ title: "INT-401", detail: "Prove end-to-end contract", tone: "store", team: "Joint delivery", artifact: "E2E evidence pack", packageId: "INT-401", x: 79, y: 23, width: 18 },
				],
				guidance: ["Each package names its owner, build artifact, prerequisite contract, and done condition", "Teams build in parallel only after INT-01 and INT-02 are baselined", "Acceptance: one approved ServiceNow change creates one Workday journal and returns one durable receipt"],
			},
		},
	},
	{
		id: "reconcile", number: "03", key: "CMP-REC-03", title: "Durable reconciliation and drift repair", owner: "Finance platform", evidence: "31 system claims", items: 3, dependsOn: "CMP-INT-02", risk: "High",
		summary: "Compare intended and observed provider state, then propose bounded repairs without silently widening authority.",
		levels: {
			L2: {
				name: "System context", focus: "How MAXION proves intended finance state matches provider reality.",
				lanes: [{ x: 2, width: 23, label: "FINANCE PLATFORM" }, { x: 27, width: 23, label: "RECONCILIATION PLANE" }, { x: 52, width: 23, label: "PROVIDER ESTATE" }, { x: 77, width: 21, label: "FINANCE CONTROLS" }],
				edges: ["REC-01 · expected state", "REC-02 · timed reads", "Classified drift · review"],
				nodes: [
					{ title: "Approved intent", detail: "Expected state", tone: "store", team: "Finance platform team", artifact: "Effect journal", x: 4, y: 42, width: 19 },
					{ title: "Reconciliation", detail: "Compare + classify", tone: "core", team: "Reconciliation engine", artifact: "Deterministic rules", x: 29, y: 42, width: 19 },
					{ title: "Provider state", detail: "SAP + QuickBooks", tone: "source", team: "Provider estate", artifact: "Read-only observation", x: 54, y: 42, width: 19 },
					{ title: "Finance owner", detail: "Reviews material drift", tone: "effect", team: "Finance controls team", artifact: "Material-drift review", x: 79, y: 42, width: 17 },
				],
				guidance: ["Keep intent and observation independently durable", "Classify benign, repairable, and blocking drift", "Never auto-repair outside the original mission boundary"],
			},
			L3: {
				name: "Service interaction", focus: "Journals, provider readers, drift evaluation, and repair planning.",
				lanes: [{ x: 2, width: 23, label: "FINANCE PLATFORM TEAM" }, { x: 27, width: 23, label: "PROVIDER INTEGRATION TEAM" }, { x: 52, width: 46, label: "FINANCE CONTROLS TEAM" }],
				edges: ["REC-01 · ExpectedState v1", "REC-02 · ObservedState v1", "Approval-bound proposal"],
				nodes: [
					{ title: "Effect journal", detail: "Expected receipts", tone: "store", team: "Finance platform team", artifact: "Journal reader + cursors", x: 4, y: 43, width: 19 },
					{ title: "Provider readers", detail: "Observed snapshots", tone: "source", team: "Provider integration team", artifact: "Paged ERP readers", x: 29, y: 43, width: 19 },
					{ title: "Drift engine", detail: "Policy classification", tone: "core", team: "Finance controls team", artifact: "Versioned drift rules", x: 54, y: 43, width: 19 },
					{ title: "Repair planner", detail: "Approval-bound action", tone: "effect", team: "Finance controls team", artifact: "Repair proposal service", x: 77, y: 43, width: 19 },
				],
				guidance: ["Page and checkpoint provider scans", "Make comparison deterministic and versioned", "Circuit-break failing providers without losing journal progress"],
			},
			L4: {
				name: "Implementation sequence", focus: "Checkpointed observation, deterministic comparison, and governed repair.",
				lanes: [{ x: 2, width: 23, label: "FINANCE PLATFORM TEAM" }, { x: 27, width: 23, label: "PROVIDER INTEGRATION TEAM" }, { x: 52, width: 46, label: "FINANCE CONTROLS TEAM" }],
				edges: ["Durable checkpoint", "Deterministic compare", "Bounded repair plan"],
				nodes: [
					{ title: "loadIntent()", detail: "Receipt + target", tone: "store", team: "Finance platform team", artifact: "FIN-101 · cursor model", packageId: "FIN-101", x: 4, y: 23, width: 19 },
					{ title: "observeProvider()", detail: "Timed read", tone: "source", team: "Provider integration team", artifact: "INT-201 · paged reader", packageId: "INT-201", x: 29, y: 23, width: 19 },
					{ title: "classifyDrift()", detail: "Pure rules", tone: "core", team: "Finance controls team", artifact: "CTL-301 · versioned rules", packageId: "CTL-301", x: 54, y: 23, width: 19 },
					{ title: "proposeRepair()", detail: "No implicit effect", tone: "effect", team: "Finance controls team", artifact: "CTL-301 · approval request", packageId: "CTL-301", x: 77, y: 23, width: 19 },
				],
				guidance: ["Store cursors and checkpoints outside process memory", "Test slow, partial, and contradictory provider responses", "Acceptance: repair plans remain idempotent and approval-bound"],
			},
		},
	},
	{
		id: "replay", number: "04", key: "CMP-SEC-04", title: "Tenant-safe retry and replay protection", owner: "Security engineering", evidence: "22 control claims", items: 3, dependsOn: "CMP-AUTH-01 · CMP-REC-03", risk: "Critical",
		summary: "Ensure retries, duplicate deliveries, and hostile identifiers cannot cross tenants or repeat an external effect.",
		levels: {
			L2: {
				name: "System context", focus: "Trust boundaries around every retried or replayed mission.",
				lanes: [{ x: 2, width: 23, label: "CALLING TENANT" }, { x: 27, width: 23, label: "AUTHORITY BOUNDARY" }, { x: 52, width: 23, label: "DURABLE LEDGER" }, { x: 77, width: 21, label: "PROVIDER EFFECT" }],
				edges: ["Tenant + idempotency key", "SEC-01 · atomic claim", "SEC-02 · one dispatch"],
				nodes: [
					{ title: "Caller", detail: "Tenant + idempotency key", tone: "source", team: "Tenant workload", artifact: "Canonical request", x: 4, y: 42, width: 19 },
					{ title: "Authority boundary", detail: "Authenticate + authorize", tone: "core", team: "Execute platform team", artifact: "Server-side scope check", x: 29, y: 42, width: 19 },
					{ title: "Replay ledger", detail: "Scoped uniqueness", tone: "store", team: "Security engineering", artifact: "Tenant/key uniqueness", x: 54, y: 42, width: 19 },
					{ title: "Provider effect", detail: "Exactly-once outcome", tone: "effect", team: "Provider integration team", artifact: "Immutable receipt", x: 79, y: 42, width: 17 },
				],
				guidance: ["Scope all identities and keys to tenant", "Reject user-supplied resource IDs from another tenant", "Return the retained receipt for valid duplicate requests"],
			},
			L3: {
				name: "Service interaction", focus: "Gateway, policy, idempotency, outbox, and receipt contracts.",
				lanes: [{ x: 2, width: 23, label: "EXECUTE PLATFORM TEAM" }, { x: 27, width: 44, label: "SECURITY ENGINEERING" }, { x: 73, width: 25, label: "PROVIDER INTEGRATION TEAM" }],
				edges: ["SEC-01 · EffectRequest v1", "Tenant/key unique claim", "SEC-02 · ClaimedEffect v1"],
				nodes: [
					{ title: "Execute gateway", detail: "JWT + request ID", tone: "source", team: "Execute platform team", artifact: "Request envelope", x: 4, y: 43, width: 19 },
					{ title: "Tenant policy", detail: "Resource ownership", tone: "core", team: "Security engineering", artifact: "Ownership evaluation", x: 29, y: 43, width: 19 },
					{ title: "Idempotency ledger", detail: "Tenant/key unique", tone: "store", team: "Security engineering", artifact: "Unique index + outbox", x: 50, y: 43, width: 19 },
					{ title: "Effect dispatcher", detail: "Receipt-aware call", tone: "effect", team: "Provider integration team", artifact: "Bounded provider call", x: 77, y: 43, width: 19 },
				],
				guidance: ["Use database uniqueness, not in-memory locks", "Bind stored responses to request fingerprints", "Audit denied cross-tenant access without sensitive payloads"],
			},
			L4: {
				name: "Implementation sequence", focus: "Atomic claim, safe dispatch, and replayed receipt response.",
				lanes: [{ x: 2, width: 23, label: "EXECUTE PLATFORM TEAM" }, { x: 27, width: 23, label: "SECURITY ENGINEERING" }, { x: 52, width: 46, label: "PROVIDER INTEGRATION TEAM" }],
				edges: ["Canonical fingerprint", "Single winner", "Immutable receipt"],
				nodes: [
					{ title: "authorizeTenant()", detail: "Server-side scope", tone: "source", team: "Execute platform team", artifact: "EXEC-101 · request envelope", packageId: "EXEC-101", x: 4, y: 23, width: 19 },
					{ title: "claimRequest()", detail: "Atomic insert", tone: "store", team: "Security engineering", artifact: "SEC-201 · unique index", packageId: "SEC-201", x: 29, y: 23, width: 19 },
					{ title: "dispatchEffect()", detail: "Timeout + retry policy", tone: "effect", team: "Provider integration team", artifact: "INT-301 · outbox worker", packageId: "INT-301", x: 54, y: 23, width: 19 },
					{ title: "retainReceipt()", detail: "Immutable result", tone: "store", team: "Provider integration team", artifact: "INT-301 · receipt store", packageId: "INT-301", x: 77, y: 23, width: 19 },
				],
				guidance: ["Hash the canonical request before comparing duplicates", "Exercise concurrent identical and conflicting requests", "Acceptance: 100 parallel retries produce one external effect"],
			},
		},
	},
	{
		id: "evidence", number: "05", key: "CMP-REL-05", title: "Release evidence and deployment approval", owner: "Release engineering", evidence: "25 governance claims", items: 3, dependsOn: "CMP-REC-03 · CMP-SEC-04", risk: "Medium",
		summary: "Assemble test, provenance, rollback, and authority evidence into one reviewable release decision.",
		levels: {
			L2: {
				name: "System context", focus: "How verified implementation becomes an owner-approved release.",
				lanes: [{ x: 2, width: 23, label: "EXECUTE WORKSPACES" }, { x: 27, width: 44, label: "RELEASE ENGINEERING" }, { x: 73, width: 25, label: "RELEASE OWNER" }],
				edges: ["REL-01 · pinned artifacts", "Deterministic manifest", "REL-02 · scoped decision"],
				nodes: [
					{ title: "Execute workspaces", detail: "Verified outputs", tone: "source", team: "Execute delivery teams", artifact: "Verified outputs", x: 4, y: 42, width: 19 },
					{ title: "Evidence assembler", detail: "Bind + validate", tone: "core", team: "Release engineering", artifact: "Integrity validation", x: 29, y: 42, width: 19 },
					{ title: "Release package", detail: "Immutable manifest", tone: "store", team: "Release engineering", artifact: "Signed manifest", x: 50, y: 42, width: 19 },
					{ title: "Release owner", detail: "Approve deployment", tone: "effect", team: "Release owner", artifact: "Deployment decision", x: 77, y: 42, width: 19 },
				],
				guidance: ["Bind every claim to a source fingerprint", "Include rollback before requesting approval", "Keep production authority separate from build completion"],
			},
			L3: {
				name: "Service interaction", focus: "Artifact registry, test evidence, provenance, and release policy.",
				lanes: [{ x: 2, width: 23, label: "EXECUTE DELIVERY TEAMS" }, { x: 27, width: 44, label: "RELEASE ENGINEERING" }, { x: 73, width: 25, label: "RELEASE OWNER" }],
				edges: ["REL-01 · WorkspaceEvidence v1", "Signed ReleaseManifest v1", "REL-02 · owner approval"],
				nodes: [
					{ title: "Artifact registry", detail: "Workspace outputs", tone: "source", team: "Execute delivery teams", artifact: "Pinned artifact refs", x: 4, y: 43, width: 19 },
					{ title: "Evidence service", detail: "Integrity validation", tone: "core", team: "Release engineering", artifact: "Checksum + gate checks", x: 29, y: 43, width: 19 },
					{ title: "Release manifest", detail: "Signed package", tone: "store", team: "Release engineering", artifact: "Content-addressed manifest", x: 50, y: 43, width: 19 },
					{ title: "Approval service", detail: "Owner decision", tone: "effect", team: "Release owner", artifact: "Approver RBAC", x: 77, y: 43, width: 19 },
				],
				guidance: ["Reject stale or mismatched source revisions", "Represent missing evidence explicitly", "Generate a stable, reviewable diff between release candidates"],
			},
			L4: {
				name: "Implementation sequence", focus: "Verify inputs, assemble manifest, sign, and request bounded approval.",
				lanes: [{ x: 2, width: 23, label: "EXECUTE DELIVERY TEAMS" }, { x: 27, width: 44, label: "RELEASE ENGINEERING" }, { x: 73, width: 25, label: "RELEASE OWNER" }],
				edges: ["Pinned revisions", "Verified checksums", "Exact-hash approval"],
				nodes: [
					{ title: "collectArtifacts()", detail: "Pinned revisions", tone: "source", team: "Execute delivery teams", artifact: "REL-101 · artifact hashes", packageId: "REL-101", x: 4, y: 23, width: 19 },
					{ title: "verifyEvidence()", detail: "Checksums + gates", tone: "core", team: "Release engineering", artifact: "REL-201 · integrity checks", packageId: "REL-201", x: 29, y: 23, width: 19 },
					{ title: "signManifest()", detail: "Immutable package", tone: "store", team: "Release engineering", artifact: "REL-201 · signed manifest", packageId: "REL-201", x: 50, y: 23, width: 19 },
					{ title: "requestRelease()", detail: "Approval only", tone: "effect", team: "Release owner", artifact: "OWN-301 · approval record", packageId: "OWN-301", x: 77, y: 23, width: 19 },
				],
				guidance: ["Make manifest generation deterministic", "Prove rollback instructions against the release candidate", "Acceptance: approval identifies exact artifact hashes and target scope"],
			},
		},
	},
] as const

type PlanExecutionBrief = {
	outcome: string
	pattern: string
	teams: ReadonlyArray<{ id: string; name: string; system: string; owns: string; delivers: string }>
	contracts: ReadonlyArray<{ id: string; from: string; to: string; transport: string; payload: string; security: string; failure: string }>
	mappings?: ReadonlyArray<{ source: string; target: string; rule: string }>
	workPackages: ReadonlyArray<{ id: string; team: string; title: string; artifact: string; dependsOn: string; doneWhen: string }>
	buildOrder: readonly string[]
}

const PLAN_LEVEL_QUESTIONS: Record<PlanArchitectureLevel, { question: string; audience: string; output: string }> = {
	L2: { question: "Is this the right solution boundary and operating model?", audience: "Solution architect · business and platform owners", output: "Approved systems, responsibilities, integration pattern, and business outcome" },
	L3: { question: "Can every team implement its interfaces without inventing a contract?", audience: "Technical architects · API, security, data, and operations leads", output: "Deployable components, versioned contracts, mappings, security, and failure behavior" },
	L4: { question: "Can each delivery team start building and prove completion?", audience: "Engineering leads · developers · QA and release", output: "Assigned work packages, artifacts, dependencies, tests, evidence, and handoff order" },
}

const PLAN_EXECUTION_BRIEFS: Record<string, PlanExecutionBrief> = {
	authority: {
		outcome: "Only a named approver can grant bounded build authority, and every issued mission can be traced to that decision.",
		pattern: "Policy decision point with an immutable approval ledger and signed short-lived handoff",
		teams: [
			{ id: "product", name: "Plan product team", system: "Plan API", owns: "Mission proposal and scope schema", delivers: "Versioned MissionProposal contract" },
			{ id: "security", name: "Security platform team", system: "Policy service", owns: "Tenant, role, and authority evaluation", delivers: "Policy decision and denial reason" },
			{ id: "execute", name: "Execute platform team", system: "Execute API", owns: "Signed mission verification and consumption", delivers: "Runnable mission receipt" },
		],
		contracts: [
			{ id: "AUTH-01", from: "Plan API", to: "Policy service", transport: "POST /v1/mission-decisions", payload: "MissionProposal v2", security: "Service JWT · tenant claim", failure: "Fail closed; no grant on timeout" },
			{ id: "AUTH-02", from: "Approval ledger", to: "Execute API", transport: "Signed mission token", payload: "MissionGrant v1", security: "EdDSA signature · 15m TTL", failure: "Reject stale, replayed, or wrong-tenant token" },
		],
		workPackages: [
			{ id: "PLAN-101", team: "Plan product team", title: "Create typed mission proposal", artifact: "MissionProposal v2 schema + endpoint", dependsOn: "Discovery decision D-14", doneWhen: "Invalid scopes return a stable 4xx contract" },
			{ id: "AUTH-201", team: "Security platform team", title: "Evaluate and record authority", artifact: "Policy rules + immutable ledger write", dependsOn: "AUTH-01", doneWhen: "Cross-tenant and expired grants are denied and audited" },
			{ id: "EXEC-301", team: "Execute platform team", title: "Verify mission at workspace start", artifact: "MissionGrant verifier", dependsOn: "AUTH-02", doneWhen: "No workspace runs without a current signed grant" },
		],
		buildOrder: ["Baseline MissionProposal and MissionGrant schemas", "Build policy evaluation and ledger transaction", "Integrate Execute verification", "Run replay and cross-tenant release gate"],
	},
	adapter: {
		outcome: "One approved ServiceNow financial change creates one valid Workday accounting journal and writes the Workday journal ID and status back to the source record.",
		pattern: "Asynchronous API-led integration through MuleSoft with durable queueing, idempotency, and status callback",
		teams: [
			{ id: "servicenow", name: "ServiceNow team", system: "ServiceNow", owns: "Approval trigger, source fields, outbound event, and status update", delivers: "ApprovedFinancialChange v1 event" },
			{ id: "mulesoft", name: "MuleSoft integration team", system: "Anypoint Platform", owns: "Ingress, validation, mapping, orchestration, queue, retry, and observability", delivers: "Financial change and Workday system APIs" },
			{ id: "workday", name: "Workday financials team", system: "Workday Financials", owns: "ISU security, journal validation, worktags, posting rules, and response", delivers: "Accounting journal endpoint and receipt" },
		],
		contracts: [
			{ id: "INT-01", from: "ServiceNow", to: "MuleSoft Experience API", transport: "POST /v1/financial-change-events · 202", payload: "ApprovedFinancialChange v1 · JSON", security: "OAuth 2.0 client credentials + mTLS", failure: "3 bounded retries; retain correlation ID; no duplicate event" },
			{ id: "INT-02", from: "MuleSoft System API", to: "Workday Financials", transport: "POST /financialManagement/v1/accountingJournals", payload: "AccountingJournal v1 · JSON", security: "Workday ISU + OAuth 2.0 · least privilege", failure: "15s timeout; exponential retry; terminal errors to DLQ" },
			{ id: "INT-03", from: "MuleSoft callback", to: "ServiceNow source record", transport: "PATCH /api/now/table/u_financial_change/{id}", payload: "JournalReceipt v1 · JSON", security: "Scoped integration user + correlation ID", failure: "Replay-safe update; reconciliation alert after exhaustion" },
		],
		mappings: [
			{ source: "number", target: "External_Reference_ID", rule: "Required · preserve unchanged" },
			{ source: "u_cost_center", target: "Worktags.Cost_Center", rule: "Lookup reference ID; reject unknown values" },
			{ source: "u_amount + u_currency", target: "Journal_Line.Amount + Currency", rule: "Decimal(18,2); ISO 4217; no implicit conversion" },
			{ source: "effective_date", target: "Accounting_Date", rule: "ISO 8601; open-period validation" },
		],
		workPackages: [
			{ id: "SNOW-101", team: "ServiceNow team", title: "Publish approved financial change", artifact: "Flow Designer flow, event schema, OAuth profile, outbound REST message", dependsOn: "INT-01 baselined", doneWhen: "Approval emits one signed event and stores its correlation ID" },
			{ id: "MULE-201", team: "MuleSoft integration team", title: "Build financial-change Experience API", artifact: "RAML/OAS spec, validation policy, ingress flow, audit metadata", dependsOn: "INT-01 baselined", doneWhen: "Valid request returns 202 after durable receipt; invalid schema returns actionable 4xx" },
			{ id: "MULE-202", team: "MuleSoft integration team", title: "Orchestrate and transform the journal", artifact: "Process API, DataWeave mapping, Anypoint MQ, DLQ, Workday System API", dependsOn: "MULE-201 + INT-02", doneWhen: "Retry is durable and the same correlation ID produces one Workday request" },
			{ id: "WDAY-301", team: "Workday financials team", title: "Expose the governed journal capability", artifact: "ISU, security group, OAuth client, validation rules, journal configuration", dependsOn: "INT-02 baselined", doneWhen: "Authorized journals post; invalid worktags and closed periods return classified errors" },
			{ id: "INT-401", team: "Joint delivery", title: "Prove the cross-team integration", artifact: "Contract fixtures, E2E test pack, replay test, DLQ runbook, trace evidence", dependsOn: "SNOW-101 + MULE-202 + WDAY-301", doneWhen: "One approved change creates one journal, updates ServiceNow, and survives duplicate delivery" },
		],
		buildOrder: ["Architects baseline INT-01, INT-02, field mappings, and error taxonomy", "ServiceNow, MuleSoft, and Workday teams build their owned packages in parallel", "Deploy to connected test tenants and exchange contract fixtures", "Run happy path, schema drift, timeout, duplicate, DLQ, and reconciliation tests", "Attach evidence and release the approved L3/L4 package to Execute"],
	},
	reconcile: {
		outcome: "Observed provider state is continuously compared with approved intent and material drift becomes a bounded, reviewable repair proposal.",
		pattern: "Checkpointed reconciliation with independently durable intent, observations, and approval-bound repairs",
		teams: [
			{ id: "finance", name: "Finance platform team", system: "Effect journal", owns: "Expected state and receipts", delivers: "Versioned reconciliation target" },
			{ id: "provider", name: "Provider integration team", system: "ERP readers", owns: "Paged provider observations", delivers: "Checkpointed provider snapshot" },
			{ id: "controls", name: "Finance controls team", system: "Repair planner", owns: "Drift policy and repair decision", delivers: "Approval-bound repair plan" },
		],
		contracts: [
			{ id: "REC-01", from: "Effect journal", to: "Drift engine", transport: "Paged internal API", payload: "ExpectedState v1", security: "Tenant service identity", failure: "Resume from durable checkpoint" },
			{ id: "REC-02", from: "Provider readers", to: "Drift engine", transport: "Timed provider reads", payload: "ObservedState v1", security: "Read-only provider scopes", failure: "Circuit-break and retain last confirmed cursor" },
		],
		workPackages: [
			{ id: "FIN-101", team: "Finance platform team", title: "Persist reconciliation targets", artifact: "Effect journal reader + cursor model", dependsOn: "CMP-INT-02", doneWhen: "Every expected effect is replayable from durable state" },
			{ id: "INT-201", team: "Provider integration team", title: "Read provider state safely", artifact: "Paged readers + timeout/circuit-breaker policies", dependsOn: "REC-02", doneWhen: "Slow and partial provider responses preserve progress" },
			{ id: "CTL-301", team: "Finance controls team", title: "Classify drift and propose repair", artifact: "Versioned rules + approval request", dependsOn: "REC-01 + REC-02", doneWhen: "No repair escapes the originating mission boundary" },
		],
		buildOrder: ["Lock expected and observed state schemas", "Build journal and provider readers", "Implement deterministic drift rules", "Prove checkpoint recovery and approval-bound repair"],
	},
	replay: {
		outcome: "Duplicate, concurrent, and hostile retries return the retained result without crossing tenants or creating another external effect.",
		pattern: "Tenant-scoped database uniqueness with request fingerprints, transactional outbox, and immutable receipts",
		teams: [
			{ id: "gateway", name: "Execute platform team", system: "Execute gateway", owns: "Authentication and request envelope", delivers: "Tenant-scoped request" },
			{ id: "security", name: "Security engineering", system: "Authority and replay ledger", owns: "Authorization, idempotency, and audit", delivers: "Unique effect claim" },
			{ id: "integration", name: "Provider integration team", system: "Effect dispatcher", owns: "Bounded provider call and receipt", delivers: "Immutable provider receipt" },
		],
		contracts: [
			{ id: "SEC-01", from: "Execute gateway", to: "Replay ledger", transport: "Transactional command", payload: "EffectRequest v1 + fingerprint", security: "Tenant JWT + server-side resource check", failure: "Conflicting duplicate returns 409; valid duplicate returns receipt" },
			{ id: "SEC-02", from: "Outbox", to: "Provider dispatcher", transport: "At-least-once queue", payload: "ClaimedEffect v1", security: "Scoped workload identity", failure: "Bounded retry; one retained effect receipt" },
		],
		workPackages: [
			{ id: "EXEC-101", team: "Execute platform team", title: "Canonicalize the request", artifact: "Request envelope + stable fingerprint", dependsOn: "Mission authority", doneWhen: "Semantically identical inputs hash identically" },
			{ id: "SEC-201", team: "Security engineering", title: "Claim idempotency atomically", artifact: "Tenant/key unique index + transaction", dependsOn: "SEC-01", doneWhen: "100 concurrent claims yield one winner" },
			{ id: "INT-301", team: "Provider integration team", title: "Dispatch and retain the receipt", artifact: "Outbox worker + provider receipt store", dependsOn: "SEC-02", doneWhen: "Retries return one immutable external-effect receipt" },
		],
		buildOrder: ["Baseline request canonicalization", "Add tenant-scoped uniqueness and transactions", "Wire outbox dispatch and receipts", "Run 100-way concurrency and cross-tenant hostile tests"],
	},
	evidence: {
		outcome: "A release owner receives one immutable package that proves what changed, why it is safe, how it was tested, and how it will be rolled back.",
		pattern: "Content-addressed evidence assembly with signed manifest and decision-specific approval routing",
		teams: [
			{ id: "execute", name: "Execute delivery teams", system: "Verified workspaces", owns: "Build and test outputs", delivers: "Pinned artifacts and test receipts" },
			{ id: "release", name: "Release engineering", system: "Evidence service", owns: "Integrity, manifest, and rollback package", delivers: "Signed release candidate" },
			{ id: "owner", name: "Release owner", system: "Approval service", owns: "Deployment decision", delivers: "Scoped release approval" },
		],
		contracts: [
			{ id: "REL-01", from: "Artifact registry", to: "Evidence service", transport: "Pinned artifact references", payload: "WorkspaceEvidence v1", security: "Workload identity + checksum", failure: "Reject missing or stale evidence" },
			{ id: "REL-02", from: "Evidence service", to: "Approval service", transport: "Signed manifest", payload: "ReleaseManifest v1", security: "Signing key + approver RBAC", failure: "No approval when rollback or hashes are absent" },
		],
		workPackages: [
			{ id: "REL-101", team: "Execute delivery teams", title: "Publish verified outputs", artifact: "Artifact hashes + test receipts", dependsOn: "All flow gates", doneWhen: "Every output references the exact source revision" },
			{ id: "REL-201", team: "Release engineering", title: "Assemble and sign release package", artifact: "Manifest + rollback + provenance", dependsOn: "REL-01", doneWhen: "Manifest generation is deterministic and signature verifies" },
			{ id: "OWN-301", team: "Release owner", title: "Decide the bounded deployment", artifact: "Approval record", dependsOn: "REL-02", doneWhen: "Decision names exact hashes, environment, and authority" },
		],
		buildOrder: ["Collect pinned workspace evidence", "Validate completeness and rollback", "Sign the deterministic manifest", "Route the exact release decision to its owner"],
	},
}

const PLAN_PACKAGE_COUNT = PLAN_FLOWS.reduce((total, flow) => total + PLAN_EXECUTION_BRIEFS[flow.id].workPackages.length, 0)
const PLAN_VIEW_COUNT = PLAN_FLOWS.length * 3

type PlanRevisionChange = { id: string; change: string }
type PlanRevision = {
	version: string
	pass: number
	time: string
	trigger: "Autonomous" | "Critic repair" | "Owner answer" | "Owner decision" | "Owner steering"
	title: string
	detail: string
	changes: readonly PlanRevisionChange[]
}

const PLAN_REVISION_HISTORY: readonly PlanRevision[] = [
	{ version: "v12", pass: 8, time: "14:21", trigger: "Autonomous", title: "Routed approvals and sealed traceability", detail: "Matched architecture, security, and program decisions to named approvers; every view now links L2 → L3 → L4 with zero orphans.", changes: [{ id: "APPROVALS", change: "Three evidence-scoped requests delivered to named owners" }, { id: "TRACE", change: `${PLAN_VIEW_COUNT} views linked with zero orphan artifacts` }] },
	{ version: "v11", pass: 7, time: "14:19", trigger: "Critic repair", title: "Delivery critic: rollback proof attached to the release flow", detail: "The release candidate could not previously prove its rollback instructions against the exact manifest.", changes: [{ id: "CMP-REL-05", change: "Rollback instructions proven against the release candidate" }, { id: "REL-201", change: "Done condition extended with rollback verification" }] },
	{ version: "v10", pass: 6, time: "14:17", trigger: "Critic repair", title: "Reliability critic: DLQ runbook and terminal-failure alerts added", detail: "Terminal Workday failures previously disappeared after retry exhaustion.", changes: [{ id: "INT-02", change: "15s timeout and exponential retry codified in the failure contract" }, { id: "MULE-202", change: "DLQ runbook and monitored alert attached" }] },
	{ version: "v9", pass: 6, time: "14:16", trigger: "Critic repair", title: "Security critic: replay fingerprints bound to stored responses", detail: "A replayed request with a mutated body could previously return another tenant-safe receipt.", changes: [{ id: "CMP-SEC-04", change: "Request fingerprint added to the idempotency claim" }, { id: "SEC-201", change: "Done condition now includes conflicting-duplicate 409" }] },
	{ version: "v8", pass: 5, time: "14:11", trigger: "Owner answer", title: "Closed accounting periods fail as classified, non-retryable errors", detail: "Marcus Lee (Workday owner) answered the open-period question; the error taxonomy and INT-02 now encode it.", changes: [{ id: "INT-02", change: "Classified non-retryable response added" }, { id: "WDAY-301", change: "Validation rules extended for closed periods" }, { id: "TESTS", change: "2 acceptance tests added" }] },
	{ version: "v7", pass: 4, time: "14:09", trigger: "Autonomous", title: "Callback ownership assigned to MuleSoft", detail: "The project RACI and integration catalogue disagreed on who owns the journal-status callback; the catalogue is authoritative.", changes: [{ id: "INT-03", change: "Callback contract assigned to MuleSoft" }, { id: "RACI", change: "Reconciled with the integration catalogue" }] },
	{ version: "v6", pass: 3, time: "14:07", trigger: "Autonomous", title: "Workday reference ID selected as canonical cost-center", detail: "ServiceNow samples and Workday metadata conflicted; Workday is the mastering system for cost centers.", changes: [{ id: "MAPPING", change: "u_cost_center → Worktags.Cost_Center via reference lookup" }, { id: "MULE-202", change: "DataWeave lookup added with unknown-value rejection" }] },
	{ version: "v5", pass: 2, time: "14:04", trigger: "Autonomous", title: "Initial decomposition: five flows through L2–L4", detail: "The verified Discovery package decomposed into five implementation flows with full level coverage.", changes: [{ id: "FLOWS", change: `5 flows · ${PLAN_VIEW_COUNT} architecture views` }, { id: "PACKAGES", change: `${PLAN_PACKAGE_COUNT} owned work packages` }] },
] as const

type PlanImpactArtifact = { id: string; kind: "contract" | "diagram" | "package" | "tests" | "mapping" | "approval"; change: string }
type PlanImpact = {
	scale: "contained" | "structural"
	headline: string
	summary: string
	artifacts: readonly PlanImpactArtifact[]
	boundaryNote?: string
}

function deriveSteeringImpact(rawText: string): PlanImpact {
	const text = rawText.toLowerCase()
	const namesReplacementPlatform = /(boomi|snaplogic|celigo|informatica|tibco|kafka|azure service bus)/.test(text)
	const displacesCurrentPlatform = /\b(replace|switch|swap|drop|remove|retire|migrate|instead of)\b/.test(text) && /(mulesoft|servicenow|workday|middleware|integration platform)/.test(text)
	if (namesReplacementPlatform || displacesCurrentPlatform) {
		return {
			scale: "structural",
			headline: "The integration control plane moves — 12 artifacts re-derive",
			summary: "This displaces the approved middleware boundary. Ingress, orchestration, queueing, and the Workday adapter change owner; every contract that names the current platform is re-authored before any team can build.",
			artifacts: [
				{ id: "INT-01", kind: "contract", change: "Transport and security re-authored for the replacement platform" },
				{ id: "INT-02", kind: "contract", change: "Journal call re-homed; timeout and retry behavior re-proven" },
				{ id: "INT-03", kind: "contract", change: "Callback ownership reassigned" },
				{ id: "CMP-INT-02 · L2–L4", kind: "diagram", change: "Integration control plane re-drawn across 3 views" },
				{ id: "MULE-201 · MULE-202", kind: "package", change: "Withdrawn and re-scoped to the replacement platform team" },
				{ id: "6 acceptance tests", kind: "tests", change: "Invalidated until the new contracts are baselined" },
			],
			boundaryNote: "This exceeds the approved implementation boundary. Applying reopens architecture approval (Priya Shah · AP-19) before Execute handoff.",
		}
	}
	if (/(retry|timeout|dlq|dead.?letter|backoff|circuit)/.test(text)) {
		return {
			scale: "contained",
			headline: "The failure contract on the Workday call tightens",
			summary: "The change lands inside the existing MuleSoft orchestration boundary. No team ownership or approved pattern moves.",
			artifacts: [
				{ id: "INT-02", kind: "contract", change: "Failure contract updated with the new retry behavior" },
				{ id: "MULE-202", kind: "package", change: "Retry and DLQ configuration re-scoped" },
				{ id: "3 acceptance tests", kind: "tests", change: "Re-derived for the new failure behavior" },
			],
		}
	}
	if (/(gateway|ingress|endpoint|jwt|mtls|api key|authentication)/.test(text)) {
		return {
			scale: "contained",
			headline: "The ingress contract absorbs the change",
			summary: "The change is contained to the Experience API boundary; downstream orchestration and the Workday call are untouched.",
			artifacts: [
				{ id: "INT-01", kind: "contract", change: "Ingress transport and security constraints updated" },
				{ id: "MULE-201", kind: "package", change: "Validation policy and ingress flow re-scoped" },
				{ id: "2 acceptance tests", kind: "tests", change: "Re-derived against the updated ingress contract" },
			],
		}
	}
	if (/(field|mapping|currency|cost.?center|worktag|accounting date|effective date)/.test(text)) {
		return {
			scale: "contained",
			headline: "The canonical field mapping updates",
			summary: "The mapping table is schema-owned by MuleSoft; Workday validation re-checks against the changed fields.",
			artifacts: [
				{ id: "FIELD MAPPING", kind: "mapping", change: "Canonical source-to-target rules updated" },
				{ id: "MULE-202", kind: "package", change: "DataWeave transformation re-scoped" },
				{ id: "WDAY-301", kind: "package", change: "Validation rules re-checked against the new mapping" },
			],
		}
	}
	if (/(atomic|partial|posting|journal|batch)/.test(text)) {
		return {
			scale: "contained",
			headline: "The journal posting policy re-checks",
			summary: "Posting behavior is governed by the resolved atomicity decision; affected contracts and the error taxonomy re-verify.",
			artifacts: [
				{ id: "INT-02", kind: "contract", change: "Posting semantics re-verified against the approved decision" },
				{ id: "WDAY-301", kind: "package", change: "Journal configuration re-checked" },
				{ id: "ERROR TAXONOMY", kind: "tests", change: "Classification re-validated" },
			],
		}
	}
	const contextMatch = rawText.match(/regarding (cmp-[a-z]+-\d+)/i)
	if (contextMatch) {
		const flow = PLAN_FLOWS.find((item) => item.key.toLowerCase() === contextMatch[1].toLowerCase())
		if (flow) {
			const brief = PLAN_EXECUTION_BRIEFS[flow.id]
			return {
				scale: "contained",
				headline: `${flow.title} absorbs the change`,
				summary: `The direction is scoped to ${flow.key}. Its interface contract and first affected work package re-derive; the other flows keep their baselines.`,
				artifacts: [
					{ id: brief.contracts[0].id, kind: "contract", change: "Interface contract re-derived for the new direction" },
					{ id: brief.workPackages[0].id, kind: "package", change: "Work package re-scoped with an updated done condition" },
					{ id: "2 acceptance tests", kind: "tests", change: "Re-derived for the changed behavior" },
				],
			}
		}
	}
	return {
		scale: "contained",
		headline: "The integration flow absorbs the change",
		summary: "The direction lands inside the approved integration boundary. Ownership and the approved pattern do not move.",
		artifacts: [
			{ id: "INT-02", kind: "contract", change: "Contract constraints re-checked against the direction" },
			{ id: "MULE-202", kind: "package", change: "Orchestration package re-scoped" },
			{ id: "2 acceptance tests", kind: "tests", change: "Re-derived for the changed behavior" },
		],
	}
}

function deriveSteeringAnswer(rawText: string, target: string) {
	const text = rawText.toLowerCase()
	if (/architecture|diagram|boundary|l2|l3|l4/.test(text) || /\bL[234]\b/.test(target)) {
		return `${target} shows the decision at the level your current reviewer needs: L2 fixes ownership and system boundaries, L3 fixes deployable components and versioned interfaces, and L4 assigns build packages with dependencies and done conditions. Every node traces to evidence and the next implementation artifact.`
	}
	if (/approval|approver|decision/.test(text) || target === "Approval routing") {
		return "MAX matched each bounded decision to the project RACI and policy owner, sent the exact evidence and rollback boundary they need, and retained every response with the plan snapshot. No blanket owner approval is being inferred."
	}
	if (/evidence|source|claim|why/.test(text) || target === "Evidence and provenance") {
		return "The current recommendation is grounded in 124 verified claims. MAX reconciled conflicting sources against the authoritative system, preserved the rationale, and linked each material claim to the architecture, contract, test, or approval it changed."
	}
	return "This plan is implementation-ready because the solution boundary, technical contracts, team-owned build packages, dependency order, acceptance evidence, and approval routing remain traceable as one versioned system."
}

type PlanThreadEntry =
	| { id: number; kind: "user"; text: string; target?: string }
	| { id: number; kind: "working" }
	| { id: number; kind: "queued"; text: string; target: string }
	| { id: number; kind: "answer"; text: string; target: string }
	| { id: number; kind: "impact"; impact: PlanImpact; status: "proposed" | "applied" | "discarded"; revision?: string }

const PLAN_EXPLANATION_PATTERN = /^(explain|why|what|how|show|summarize|which|where|who|does|is|can)\b|\?\s*$/

const PLAN_RUN_STAGES = [
	{ key: "reading", live: "Reading the operating context", done: "Read the operating context", detail: "Grounded the plan in 124 verified claims from Discovery, project decisions, ServiceNow, Workday, integration standards, and policy.", duration: 2400 },
	{ key: "reconciling", live: "Reconciling conflicts against authoritative sources", done: "Reconciled three conflicts without interrupting you", detail: "Resolved field ownership, callback responsibility, and retry-policy differences against authoritative sources and recorded the rationale.", duration: 2200 },
	{ key: "interviewing", live: "Interviewing the domain owners", done: "Interviewed the domain owners", detail: "Asked the Workday and MuleSoft owners two targeted questions, incorporated their answers, and preserved the transcripts with the affected contracts.", duration: 2200 },
	{ key: "designing", live: "Designing and challenging the implementation", done: "Designed and challenged the implementation", detail: `Generated five flows, ${PLAN_VIEW_COUNT} L2–L4 views, and ${PLAN_PACKAGE_COUNT} owned work packages; security, reliability, and delivery critics repaired three gaps.`, duration: 4200 },
	{ key: "routing", live: "Routing the work and its decisions", done: "Routed the work and its decisions", detail: "Matched architecture, security, finance, and program decisions to named approvers and delivered evidence-scoped requests.", duration: 1800 },
] as const

const PLAN_STAGE_TIMES = ["14:02", "14:06", "14:11", "14:17", "14:21"] as const
const PLAN_LIVE_TIMES = ["0:02", "0:05", "0:07", "0:09", "0:13"] as const

function prefersReducedMotion() {
	return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function useStreamedText(text: string, active: boolean) {
	const [count, setCount] = useState(active && !prefersReducedMotion() ? 0 : Number.MAX_SAFE_INTEGER)
	useEffect(() => {
		if (!active || prefersReducedMotion()) { setCount(Number.MAX_SAFE_INTEGER); return }
		setCount(0)
		const total = text.split(" ").length
		const timer = window.setInterval(() => {
			setCount((current) => {
				if (current >= total) { window.clearInterval(timer); return current }
				return current + 1
			})
		}, 26)
		return () => window.clearInterval(timer)
	}, [text, active])
	if (!active) return text
	const words = text.split(" ")
	return count >= words.length ? text : words.slice(0, count).join(" ")
}

function useCountUp(target: number, started: boolean, animate: boolean, duration = 1400) {
	const [value, setValue] = useState(started && !animate ? target : 0)
	useEffect(() => {
		if (!started) return
		if (!animate || prefersReducedMotion()) { setValue(target); return }
		let frame = 0
		const startedAt = performance.now()
		const tick = (now: number) => {
			const progress = Math.min(1, (now - startedAt) / duration)
			setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))))
			if (progress < 1) frame = requestAnimationFrame(tick)
		}
		frame = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(frame)
	}, [target, started, animate, duration])
	return started ? value : 0
}

export function PlanModule({
	projects,
	onCommand,
	onSendToExecute,
	onNavigate,
}: {
	projects: PortalProject[]
	onCommand: () => void
	onSendToExecute: (snapshot: string) => void
	onNavigate: (module: MaxionModuleId) => void
}) {
	const [workspace, setWorkspace] = useState<"closed" | "live" | "resume">("closed")
	if (workspace === "closed") {
		return <PlanLibraryModule projects={projects} onOpenPlan={() => setWorkspace("resume")} onStartPlan={() => setWorkspace("live")} onNavigate={onNavigate} />
	}
	return <PlanWorkspaceModule key={workspace} live={workspace === "live"} onBack={() => setWorkspace("closed")} onCommand={onCommand} onSendToExecute={onSendToExecute} />
}

function PlanWorkspaceModule({ live, onBack, onCommand, onSendToExecute }: { live: boolean; onBack: () => void; onCommand: () => void; onSendToExecute: (snapshot: string) => void }) {
	const [view, setView] = useState<PlanView>("plan")
	const [stage, setStage] = useState(live ? 0 : PLAN_RUN_STAGES.length)
	const [approved, setApproved] = useState(false)
	const [clarificationResolved, setClarificationResolved] = useState(false)
	const [selectedFlowId, setSelectedFlowId] = useState("adapter")
	const [level, setLevel] = useState<PlanArchitectureLevel>("L2")
	const [ledgerSection, setLedgerSection] = useState<PlanLedgerSection>("decisions")
	const [steer, setSteer] = useState("")
	const [steeringTarget, setSteeringTarget] = useState<string | null>(null)
	const [steerFocusTick, setSteerFocusTick] = useState(0)
	const [thread, setThread] = useState<PlanThreadEntry[]>([])
	const [revisions, setRevisions] = useState<readonly PlanRevision[]>(PLAN_REVISION_HISTORY)
	const [gatesOpen, setGatesOpen] = useState(false)
	const [dismissedReceiptId, setDismissedReceiptId] = useState(0)
	const entryIdRef = useRef(0)
	const impactTimerRef = useRef(0)
	const queueFlushTimerRef = useRef(0)

	const complete = stage >= PLAN_RUN_STAGES.length
	const selectedFlow = PLAN_FLOWS.find((flow) => flow.id === selectedFlowId)
	const snapshot = revisions[0].version
	const passCount = revisions[0].pass
	const unresolvedCount = Number(!clarificationResolved) + Number(!approved)
	const readyForExecute = complete && approved && clarificationResolved
	const defaultSteeringTarget: Record<PlanView, string> = {
		plan: "Entire implementation plan",
		design: selectedFlowId === "packages" ? "Implementation packages" : selectedFlowId === "system" ? "System blueprint" : selectedFlow ? `${level} · ${selectedFlow.title}` : `${level} architecture`,
		ledger: ledgerSection === "history" ? `Snapshot ${snapshot}` : ledgerSection === "sources" ? "Evidence and provenance" : "Current decisions",
	}
	const activeSteeringTarget = steeringTarget ?? defaultSteeringTarget[view]
	const latestSteeringEntry = [...thread].reverse().find((entry): entry is Exclude<PlanThreadEntry, { kind: "user" }> => entry.kind !== "user")
	const visibleSteeringEntry = latestSteeringEntry && latestSteeringEntry.id !== dismissedReceiptId ? latestSteeringEntry : undefined
	const latestSteeringRef = useRef(latestSteeringEntry)
	latestSteeringRef.current = latestSteeringEntry

	useEffect(() => {
		if (!live || complete) return
		const timer = window.setTimeout(() => setStage((current) => current + 1), PLAN_RUN_STAGES[stage].duration)
		return () => window.clearTimeout(timer)
	}, [live, stage, complete])

	useEffect(() => () => { window.clearTimeout(impactTimerRef.current); window.clearTimeout(queueFlushTimerRef.current) }, [])

	useEffect(() => setSteeringTarget(null), [view, selectedFlowId, level, ledgerSection])

	// Directions queued mid-run are folded in as soon as the pass lands.
	useEffect(() => {
		if (!complete) return
		const queued = thread.filter((entry): entry is Extract<PlanThreadEntry, { kind: "queued" }> => entry.kind === "queued")
		if (!queued.length) return
		setThread((current) => current.map((entry) => entry.kind === "queued" ? { id: entry.id, kind: "working" as const } : entry))
		queueFlushTimerRef.current = window.setTimeout(() => {
			setThread((current) => current.map((entry) => {
				const source = queued.find((item) => item.id === entry.id)
				if (!source || entry.kind !== "working") return entry
				return PLAN_EXPLANATION_PATTERN.test(source.text.toLowerCase())
					? { id: entry.id, kind: "answer" as const, text: deriveSteeringAnswer(source.text, source.target), target: source.target }
					: { id: entry.id, kind: "impact" as const, impact: deriveSteeringImpact(source.text), status: "proposed" as const }
			}))
		}, 1400)
	}, [complete, thread])

	// Terminal receipts fade on their own; a pending impact preview follows you until decided.
	useEffect(() => {
		if (!latestSteeringEntry || latestSteeringEntry.kind !== "impact" || latestSteeringEntry.status === "proposed") return
		const timer = window.setTimeout(() => setDismissedReceiptId(latestSteeringEntry.id), latestSteeringEntry.status === "applied" ? 8000 : 4000)
		return () => window.clearTimeout(timer)
	}, [latestSteeringEntry])

	useEffect(() => {
		const entry = latestSteeringRef.current
		if (entry && (entry.kind === "answer" || (entry.kind === "impact" && entry.status !== "proposed"))) setDismissedReceiptId(entry.id)
	}, [view])

	const addRevision = (trigger: PlanRevision["trigger"], title: string, detail: string, changes: readonly PlanRevisionChange[]) => {
		setRevisions((current) => [{ version: `v${Number(current[0].version.slice(1)) + 1}`, pass: current[0].pass + 1, time: "Just now", trigger, title, detail, changes }, ...current])
	}

	const openFlow = (flowId = selectedFlowId, nextLevel: PlanArchitectureLevel = level) => {
		setSelectedFlowId(flowId)
		setLevel(nextLevel)
		setView("design")
	}

	const openLedger = (section: PlanLedgerSection) => {
		setLedgerSection(section)
		setView("ledger")
	}

	const resolveClarification = () => {
		setClarificationResolved(true)
		addRevision("Owner decision", "Atomic journal posting approved as the contract", "The plan owner approved MAX's recommendation; posting is atomic and the affected artifacts re-checked.", [
			{ id: "INT-02", change: "Atomic posting semantics locked" },
			{ id: "MULE-202 · WDAY-301", change: "Orchestration and journal configuration re-checked" },
			{ id: "TESTS", change: "6 acceptance tests re-derived" },
		])
	}

	const submitSteer = () => {
		const direction = steer.trim()
		if (!direction) return
		const userId = ++entryIdRef.current
		const followUpId = ++entryIdRef.current
		if (!complete) {
			setThread((current) => [...current, { id: userId, kind: "user", text: direction, target: activeSteeringTarget }, { id: followUpId, kind: "queued", text: direction, target: activeSteeringTarget }])
			setSteer("")
			return
		}
		setThread((current) => [...current, { id: userId, kind: "user", text: direction, target: activeSteeringTarget }, { id: followUpId, kind: "working" }])
		setSteer("")
		const asksForExplanation = PLAN_EXPLANATION_PATTERN.test(direction.toLowerCase())
		const impact = deriveSteeringImpact(direction)
		impactTimerRef.current = window.setTimeout(() => {
			setThread((current) => current.map((entry) => entry.id === followUpId
				? asksForExplanation
					? { id: followUpId, kind: "answer", text: deriveSteeringAnswer(direction, activeSteeringTarget), target: activeSteeringTarget }
					: { id: followUpId, kind: "impact", impact, status: "proposed" }
				: entry))
		}, 1100)
	}

	const applyImpact = (entryId: number) => {
		const entry = thread.find((item): item is Extract<PlanThreadEntry, { kind: "impact" }> => item.id === entryId && item.kind === "impact")
		if (!entry) return
		const nextVersion = `v${Number(revisions[0].version.slice(1)) + 1}`
		setThread((current) => current.map((item) => item.id === entryId && item.kind === "impact" ? { ...item, status: "applied", revision: nextVersion } : item))
		addRevision("Owner steering", entry.impact.headline, entry.impact.summary, entry.impact.artifacts.map((artifact) => ({ id: artifact.id, change: artifact.change })))
		if (entry.impact.scale === "structural") setApproved(false)
	}

	const discardImpact = (entryId: number) => {
		setThread((current) => current.map((item) => item.id === entryId && item.kind === "impact" ? { ...item, status: "discarded" } : item))
	}

	const steerOnNode = (context: string) => {
		setSteeringTarget(context)
		setSteer("")
		setSteerFocusTick((tick) => tick + 1)
	}

	const primeSteer = (direction: string) => {
		setSteer(direction)
		setSteerFocusTick((tick) => tick + 1)
	}

	const tabs = [
		["plan", "Plan"],
		["design", "Design"],
		["ledger", "Ledger"],
	] as const

	return (
		<div className="apn-shell">
			<section className="apn-workspace">
				<header className="apn-topbar">
					<div><button type="button" className="apn-back" onClick={onBack}><ArrowLeft size={15} /><span>All plans</span></button><button type="button" className="apn-mobile-back" onClick={onBack}><ArrowLeft size={14} />Plans</button><div className="apn-topbar-title"><span>ERP modernization delivery plan</span><button type="button" className="apn-snapshot" onClick={() => { if (complete) openLedger("history") }}>Verified Discovery · snapshot {snapshot}</button></div></div>
					<div>
						<button type="button" className="apn-search-btn" aria-label="Search plan" title="Search the plan" onClick={onCommand}><MagnifyingGlass size={15} /></button>
						<span className={`apn-autonomy${!complete ? " is-working" : ""}`}><i />{complete ? "MAX maintaining this plan" : `MAX working · ${PLAN_RUN_STAGES[stage].live.toLowerCase()}`}</span>
						<button
							type="button"
							className={`apn-attention-route${complete && unresolvedCount === 0 ? " is-ready" : ""}`}
							disabled={!complete}
							aria-label={!complete ? "MAX is preparing decisions" : unresolvedCount ? `${unresolvedCount} decision${unresolvedCount === 1 ? " needs" : "s need"} you` : "Plan ready"}
							onClick={() => openLedger("decisions")}>
							{complete && unresolvedCount === 0 ? <CheckCircle size={15} weight="fill" /> : <ChatCircleText size={15} />}
							<span>{!complete ? "Preparing decisions" : unresolvedCount ? `${unresolvedCount} need${unresolvedCount === 1 ? "s" : ""} you` : "Plan ready"}</span>
						</button>
						<div className="apn-execute-wrap">
							<button type="button" className="apn-execute" disabled={!complete} aria-expanded={!readyForExecute && gatesOpen} title={!complete ? "The first pass has not finished" : readyForExecute ? "Send approved L3 and L4 artifacts to Execute" : "Review the remaining gates"} onClick={() => { if (readyForExecute) onSendToExecute(snapshot); else setGatesOpen((open) => !open) }}>Send to Execute{readyForExecute || !complete ? <ArrowRight size={14} /> : <CaretDown size={14} />}</button>
							{gatesOpen && complete && !readyForExecute ? (
								<>
									<button type="button" className="apn-gate-scrim" aria-label="Close gate summary" onClick={() => setGatesOpen(false)} />
									<div className="apn-gate-popover" role="dialog" aria-label="Execute readiness gates">
										<header><span>Before Execute</span><strong>{unresolvedCount} gate{unresolvedCount === 1 ? "" : "s"} open</strong></header>
										<ul>
											{[["Evidence grounded", "124 claims", true], ["Architecture complete", `${PLAN_VIEW_COUNT} views`, true], ["Implementation ready", `${PLAN_PACKAGE_COUNT} packages`, true], ["Critics passed", "3 repaired", true], ["Design decision", clarificationResolved ? "Resolved" : "Needs you", clarificationResolved], ["Boundary approval", approved ? "Recorded" : "Needs you", approved]].map(([label, value, done]) => (
												<li key={String(label)} className={done ? "is-done" : "is-open"}>{done ? <CheckCircle size={13} weight="fill" /> : <ChatCircleText size={13} />}<span>{label}</span><small>{value}</small></li>
											))}
										</ul>
										<button type="button" className="apn-gate-next" onClick={() => { setGatesOpen(false); openLedger("decisions") }}>Resolve in Ledger<ArrowRight size={13} /></button>
									</div>
								</>
							) : null}
						</div>
					</div>
				</header>
				<nav className="apn-tabs" aria-label="Plan workspace">
					{tabs.map(([id, label]) => (
						<button key={id} type="button" className={view === id ? "is-active" : ""} disabled={!complete && id !== "plan"} title={!complete && id !== "plan" ? "Available when this pass lands" : undefined} onClick={(event) => { event.currentTarget.blur(); setView(id) }}>
							{label}
							{id === "ledger" && complete && unresolvedCount > 0 ? <small>{unresolvedCount}</small> : null}
						</button>
					))}
				</nav>

				{view === "plan" ? <PlanHomeView live={live} stage={stage} complete={complete} passCount={passCount} onSkip={() => setStage(PLAN_RUN_STAGES.length)} clarificationResolved={clarificationResolved} approved={approved} onResolve={resolveClarification} thread={thread} onOpenFlow={(flowId) => openFlow(flowId, "L2")} onOpenDesign={() => openFlow("adapter", "L2")} onOpenDecisions={() => openLedger("decisions")} onOpenRevisions={() => openLedger("history")} onOpenContract={() => openFlow("adapter", "L3")} /> : null}
				{view === "design" ? <PlanDesignView selectedFlowId={selectedFlowId} level={level} onLevelChange={setLevel} onSelectFlow={setSelectedFlowId} onSteerNode={steerOnNode} /> : null}
				{view === "ledger" ? <PlanLedgerView section={ledgerSection} onSectionChange={setLedgerSection} revisions={revisions} clarificationResolved={clarificationResolved} approved={approved} onResolve={resolveClarification} onApprove={() => setApproved(true)} onOpenContract={() => openFlow("adapter", "L3")} /> : null}
				<PlanSteeringDock
					view={view}
					target={activeSteeringTarget}
					complete={complete}
					value={steer}
					focusTick={steerFocusTick}
					entry={visibleSteeringEntry}
					onChange={setSteer}
					onPrime={primeSteer}
					onSubmit={submitSteer}
					onApply={applyImpact}
					onDiscard={discardImpact}
					onDismiss={(entryId) => setDismissedReceiptId(entryId)}
					onOpenRevisions={() => openLedger("history")}
				/>
			</section>
		</div>
	)
}

function PlanDecisionCard({ resolved, onResolve, onOpenContract }: { resolved: boolean; onResolve: () => void; onOpenContract: () => void }) {
	const [answer, setAnswer] = useState("")
	return (
		<section className={`apn-primary-question${resolved ? " is-resolved" : ""}`} aria-label="Current Plan decision">
			<header><div><span>{resolved ? <CheckCircle size={17} weight="fill" /> : <ChatCircleText size={17} />}</span><div><small>{resolved ? "Decision recorded" : "Business authority required"}</small><h2>Should a Workday journal batch fail atomically or allow partial posting?</h2></div></div><i>{resolved ? "Resolved" : "Blocks INT-02"}</i></header>
			<p>ServiceNow approves the financial change as one business transaction, while Workday can return line-level errors. The knowledge base does not define whether valid lines may post when another line fails.</p>
			<section className="apn-evidence-conflict"><article><small>ServiceNow evidence</small><strong>Approval applies to the complete requested journal.</strong><span>Change policy FIN-18 · confidence 0.96</span></article><i>conflicts with</i><article><small>Workday capability</small><strong>The API can classify errors at individual journal-line level.</strong><span>Tenant metadata · confidence 0.99</span></article></section>
			<section className="apn-agent-recommendation"><span><MaxionSpiralMark variant="current" className="apn-inline-mark" /></span><div><small>MAX recommends</small><strong>Fail the batch atomically before posting any journal line.</strong><p>This preserves the ServiceNow approval boundary, avoids unapproved partial financial effects, and produces one replay-safe result. MAX will classify the error, return it to ServiceNow, and require a corrected approval before retry.</p><div><code>INT-02</code><code>MULE-202</code><code>WDAY-301</code><code>6 acceptance tests</code></div></div></section>
			{resolved ? <footer className="apn-question-decision"><span><CheckCircle size={15} weight="fill" />Atomic posting approved · affected artifacts re-checked</span><button type="button" onClick={onOpenContract}>Review updated L3 contract<ArrowRight size={14} /></button></footer> : <><form onSubmit={(event) => { event.preventDefault(); if (answer.trim()) onResolve() }}><label htmlFor="plan-clarification-answer">Use another decision</label><textarea id="plan-clarification-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Explain the required posting behavior or constraint…" rows={3} /><span>MAX will show which contracts and tests change before final handoff.</span><div><button type="button" onClick={onOpenContract}>Inspect affected contract</button><button type="submit" disabled={!answer.trim()}>Apply my decision</button></div></form><footer><span>Recommended path</span><button type="button" onClick={onResolve}><Check size={14} />Accept atomic posting</button></footer></>}
		</section>
	)
}

function PlanHomeView({ live, stage, complete, passCount, onSkip, clarificationResolved, approved, onResolve, thread, onOpenFlow, onOpenDesign, onOpenDecisions, onOpenRevisions, onOpenContract }: { live: boolean; stage: number; complete: boolean; passCount: number; onSkip: () => void; clarificationResolved: boolean; approved: boolean; onResolve: () => void; thread: PlanThreadEntry[]; onOpenFlow: (flowId: string) => void; onOpenDesign: () => void; onOpenDecisions: () => void; onOpenRevisions: () => void; onOpenContract: () => void }) {
	const blueprintReady = complete || stage > 3
	return (
		<main className="apn-main apn-home">
			<div className="apn-run-column">
				<section className={`apn-home-status${!complete ? " is-live" : ""}`} aria-label="Plan status">
					<span className="apn-home-badge"><i />{complete ? "MAX is maintaining this plan" : "MAX is running pass 1"}</span>
					<h1>{complete ? "MAX built the implementation plan." : "MAX is building the implementation plan."}</h1>
					{complete ? <small className="apn-home-meta">{passCount} passes · 18m · 124 claims · 3 conflicts resolved · 2 owners interviewed</small> : <small className="apn-home-meta">Reading the verified context, reconciling conflicts, and decomposing the work.</small>}
					{!complete ? <button type="button" className="apn-skip-run" onClick={onSkip}>Skip to the finished plan<ArrowRight size={13} /></button> : null}
				</section>

				{complete ? (
					<section className="apn-needs-you" aria-label="Work that needs you">
						<header><span>{clarificationResolved && approved ? "Nothing needs you" : "Needs you first"}</span>{!clarificationResolved || !approved ? <small>{Number(!clarificationResolved) + Number(!approved)} open</small> : null}</header>
						{!clarificationResolved ? <PlanDecisionCard resolved={false} onResolve={onResolve} onOpenContract={onOpenContract} /> : null}
						{clarificationResolved && !approved ? (
							<div className="apn-home-prompt">
								<div><ShieldCheck size={16} /><span><strong>Your approval is the last gate.</strong><small>Grant Execute the approved L3 and L4 scope — build authority only, no production effect.</small></span></div>
								<button type="button" onClick={onOpenDecisions}>Review and approve<ArrowRight size={14} /></button>
							</div>
						) : null}
						{clarificationResolved && approved ? (
							<div className="apn-home-prompt is-ready">
								<div><CheckCircle size={16} weight="fill" /><span><strong>Plan is ready for Execute.</strong><small>All decisions are recorded and approvals routed — use Send to Execute above.</small></span></div>
							</div>
						) : null}
					</section>
				) : null}

				<section className="apn-convo" aria-label="Conversation with MAX">
					<header><span>Conversation with MAX</span><small>{complete ? "Every direction is previewed before it changes the plan" : PLAN_RUN_STAGES[stage].live}</small></header>
					<div className="apn-agent-message"><MaxionSpiralMark /><div><strong>MAX</strong><p>{complete ? "I compared the verified Discovery package with connected-system metadata and project governance. I used the safest reversible assumption where the evidence agreed, contacted domain owners where they held the answer, and isolated one remaining decision that changes financial posting behavior." : "I'm comparing the verified Discovery package with connected-system metadata and project governance. Where the evidence agrees I take the safest reversible assumption; where a domain owner holds the answer I ask them directly."}</p></div></div>
					<details className="apn-agent-thread apn-convo-passes" open={!complete}>
						<summary><span>How this pass ran</span><small>{complete ? "5 stages · 3 conflicts reconciled · 2 owners interviewed" : PLAN_RUN_STAGES[stage].live}</small><CaretDown size={14} /></summary>
						<ol>
							{PLAN_RUN_STAGES.map((step, index) => {
								if (live && index > stage) return null
								const working = live && index === stage && !complete
								return (
									<li key={step.key} className={working ? "is-working" : "apn-step-entered"}>
										<span>{working ? <SpinnerGap className="apn-spin" size={12} /> : <Check size={12} />}</span>
										<div><strong>{working ? step.live : step.done}</strong>{working ? null : <p>{step.detail}</p>}</div>
										<time>{live ? PLAN_LIVE_TIMES[index] : PLAN_STAGE_TIMES[index]}</time>
									</li>
								)
							})}
						</ol>
					</details>
					<div className="apn-convo-thread" aria-live="polite">
						{thread.map((entry) => {
							if (entry.kind === "user") return <div className="apn-user-message" key={entry.id}><span>You · {entry.target ?? "Plan"}</span><p>{entry.text}</p></div>
							if (entry.kind === "working") return <div className="apn-agent-message is-working" key={entry.id}><MaxionSpiralMark /><div><strong>MAX</strong><p className="apn-working-line"><SpinnerGap className="apn-spin" size={13} />Reading the active context and checking contracts, diagrams, tests, and approvals…</p></div></div>
							if (entry.kind === "queued") return <div className="apn-thread-outcome is-queued" key={entry.id}><Clock size={13} /><span><strong>Queued for this pass</strong> · {entry.target}</span></div>
							if (entry.kind === "answer") return <div className="apn-agent-message is-response" key={entry.id}><MaxionSpiralMark /><div><strong>MAX · {entry.target}</strong><p>{entry.text}</p></div></div>
							return (
								<div className={`apn-thread-outcome is-${entry.status}`} key={entry.id}>
									{entry.status === "applied" ? <CheckCircle size={13} weight="fill" /> : entry.status === "discarded" ? <X size={13} /> : <Lightning size={13} weight="fill" />}
									<span><strong>{entry.status === "applied" ? `Impact applied · snapshot ${entry.revision}` : entry.status === "discarded" ? "Impact discarded" : "Impact preview awaiting your decision"}</strong> · {entry.impact.headline}</span>
									{entry.status === "applied" ? <button type="button" onClick={onOpenRevisions}>Open revisions<ArrowRight size={12} /></button> : null}
								</div>
							)
						})}
						{complete && thread.length === 0 ? <p className="apn-convo-empty"><ChatCircleText size={13} />Steer MAX below — ask it to explain, challenge, or change any part of the plan. Every direction is answered here.</p> : null}
					</div>
				</section>

				<section className="apn-home-blueprint" aria-label="What this plan builds">
					<header><div><span>What this plan builds</span><strong>{PLAN_EXECUTION_BRIEFS.adapter.outcome}</strong></div>{blueprintReady ? <button type="button" onClick={onOpenDesign}>Open the drafting table<ArrowRight size={13} /></button> : null}</header>
					{blueprintReady ? <PlanSystemBlueprint assembling={live && stage === 3} onOpenFlow={onOpenFlow} /> : <p className="apn-build-strip-waiting"><SpinnerGap className="apn-spin" size={14} />Decomposing the verified context into implementation flows…</p>}
					{blueprintReady ? <footer><span>ServiceNow · MuleSoft · Workday · SAP · QuickBooks</span><span>5 flows · {PLAN_VIEW_COUNT} views · {PLAN_PACKAGE_COUNT} packages · 124 claims</span></footer> : null}
				</section>
			</div>
		</main>
	)
}


function PlanSteeringAnswer({ entry, onDismiss }: { entry: Extract<PlanThreadEntry, { kind: "answer" }>; onDismiss: () => void }) {
	const streamed = useStreamedText(entry.text, true)
	return (
		<div className="apn-steering-receipt is-answer" role="status" aria-live="polite">
			<header><MaxionSpiralMark variant="current" className="apn-inline-mark is-answer" /><span><strong>MAX answered in context</strong><small>{entry.target}</small></span><button type="button" aria-label="Dismiss answer" onClick={onDismiss}><X size={14} /></button></header>
			<p className="apn-steering-answer">{streamed}</p>
		</div>
	)
}

function PlanSteeringDock({ view, target, complete, value, focusTick, entry, onChange, onPrime, onSubmit, onApply, onDiscard, onDismiss, onOpenRevisions }: { view: PlanView; target: string; complete: boolean; value: string; focusTick: number; entry?: Exclude<PlanThreadEntry, { kind: "user" }>; onChange: (value: string) => void; onPrime: (value: string) => void; onSubmit: () => void; onApply: (entryId: number) => void; onDiscard: (entryId: number) => void; onDismiss: (entryId: number) => void; onOpenRevisions: () => void }) {
	const composerRef = useRef<HTMLTextAreaElement>(null)
	const quickPrompts = view === "design"
		? ["Explain this architecture", "Challenge this assumption", "Add a technical constraint"]
		: view === "ledger"
			? ["Explain this decision", "Challenge the recommendation", "Add a constraint"]
			: ["Explain the current plan", "Challenge an assumption", "Add a constraint"]

	useEffect(() => {
		if (focusTick > 0) composerRef.current?.focus()
	}, [focusTick])

	return (
		<section className="apn-steering-dock" aria-label="Steer MAX">
			{entry?.kind === "working" ? (
				<div className="apn-steering-receipt is-working" role="status" aria-live="polite">
					<header><SpinnerGap className="apn-spin" size={13} /><span><strong>MAX is tracing that direction</strong><small>Contracts, diagrams, tests, and approvals are being checked.</small></span></header>
				</div>
			) : null}
			{entry?.kind === "queued" ? (
				<div className="apn-steering-receipt is-queued" role="status" aria-live="polite">
					<header><Clock size={14} /><span><strong>Direction queued for this pass</strong><small>MAX folds it in when the current pass lands.</small></span><button type="button" aria-label="Withdraw queued direction" onClick={() => onDismiss(entry.id)}><X size={14} /></button></header>
				</div>
			) : null}
			{entry?.kind === "answer" ? <PlanSteeringAnswer key={entry.id} entry={entry} onDismiss={() => onDismiss(entry.id)} /> : null}
			{entry?.kind === "impact" && entry.status !== "discarded" ? (
				<div className="apn-steering-impact" role="status" aria-live="polite">
					<PlanImpactCard key={entry.id} entry={entry} onApply={() => onApply(entry.id)} onDiscard={() => onDiscard(entry.id)} onDismiss={entry.status === "applied" ? () => onDismiss(entry.id) : undefined} onOpenRevisions={onOpenRevisions} />
				</div>
			) : null}
			{entry?.kind === "impact" && entry.status === "discarded" ? (
				<div className="apn-steering-receipt is-discarded" role="status" aria-live="polite">
					<header><X size={14} /><span><strong>Direction discarded</strong><small>No plan artifacts changed.</small></span><button type="button" aria-label="Dismiss" onClick={() => onDismiss(entry.id)}><X size={14} /></button></header>
				</div>
			) : null}
			<form onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
				<div className="apn-steering-target"><Crosshair size={14} /><span><small>Steering</small><strong>{target}</strong></span></div>
				<textarea ref={composerRef} aria-label="Steer the Plan agent" value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmit() } }} placeholder={complete ? "Tell MAX what to explain, challenge, or change…" : "Add direction while MAX works — MAX folds it into this pass before it lands…"} rows={1} />
				<button type="submit" disabled={!value.trim()} aria-label="Send Plan direction"><ArrowRight size={16} /></button>
			</form>
			<footer><div aria-label="Steering suggestions"><span>Try</span>{quickPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => onPrime(prompt)}>{prompt}</button>)}</div><span>Enter to send · impact is previewed first</span></footer>
		</section>
	)
}

function PlanImpactCard({ entry, onApply, onDiscard, onDismiss, onOpenRevisions }: { entry: Extract<PlanThreadEntry, { kind: "impact" }>; onApply: () => void; onDiscard: () => void; onDismiss?: () => void; onOpenRevisions: () => void }) {
	const { impact, status } = entry
	const summary = useStreamedText(impact.summary, status === "proposed")
	return (
		<article className={`apn-impact-card is-${impact.scale} is-${status}`} aria-label="Steering impact preview">
			<header>
				<span className="apn-impact-flag">{status === "proposed" ? <><Lightning size={13} weight="fill" />Impact preview · nothing applied yet</> : status === "applied" ? <><CheckCircle size={13} weight="fill" />Applied · snapshot {entry.revision}</> : <><X size={13} />Discarded · nothing changed</>}</span>
				<span className="apn-impact-header-side"><i className={`apn-impact-scale is-${impact.scale}`}>{impact.scale === "contained" ? "Contained change" : "Structural change"}</i>{onDismiss ? <button type="button" className="apn-impact-dismiss" aria-label="Dismiss receipt" onClick={onDismiss}><X size={13} /></button> : null}</span>
			</header>
			<strong>{impact.headline}</strong>
			<p>{summary}</p>
			{status !== "discarded" ? <ul>{impact.artifacts.map((artifact) => <li key={artifact.id}><code>{artifact.id}</code><span>{artifact.kind}</span><p>{artifact.change}</p></li>)}</ul> : null}
			{status !== "discarded" && impact.boundaryNote ? <div className="apn-impact-boundary"><Warning size={15} weight="fill" /><p>{impact.boundaryNote}</p></div> : null}
			{status === "proposed" ? <footer><button type="button" onClick={onDiscard}>Discard</button><button type="button" className="apn-impact-apply" onClick={onApply}><Check size={14} />Apply to plan</button></footer> : null}
			{status === "applied" ? <footer className="is-receipt"><span><CheckCircle size={14} weight="fill" />{impact.artifacts.length} artifacts updated · affected views re-checked{impact.scale === "structural" ? " · approval routing reopened" : ""}</span><button type="button" onClick={onOpenRevisions}>Open revisions<ArrowRight size={13} /></button></footer> : null}
		</article>
	)
}

type PlanDiagramNode = PlanFlow["levels"][PlanArchitectureLevel]["nodes"][number]

function PlanArchitectureDiagram({ level, flow, brief, selectedNodeTitle, onSelectNode }: { level: PlanArchitectureLevel; flow: PlanFlow; brief: PlanExecutionBrief; selectedNodeTitle: string; onSelectNode: (title: string) => void }) {
	const diagram = flow.levels[level]
	const nodes = diagram.nodes
	const model = level === "L2" ? "Solution and ownership" : level === "L3" ? "Components and contracts" : "Team build packages"
	const positionedNodes = nodes.map((node, index) => {
		const width = node.width ?? 18.5
		const available = 92 - width
		const x = node.x ?? (nodes.length === 1 ? 4 : 4 + (available * index) / (nodes.length - 1))
		const y = node.y ?? (level === "L4" ? 23 : 42)
		return { ...node, x, y, width }
	})
	const edgeLabels = diagram.edges ?? positionedNodes.slice(1).map(() => "")
	const laneLayout = diagram.lanes ?? brief.teams.map((team, index) => ({ x: 2 + (96 / brief.teams.length) * index, width: 94 / brief.teams.length, label: team.name.toUpperCase() }))
	return (
		<div className="apn-diagram-viewport">
			<div className={`apn-architecture-diagram is-${level.toLowerCase()}`} role="group" aria-label={`${level} diagram for ${flow.title}`}>
				<svg viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
					<defs>
						<marker id="apn-arrow" markerWidth="8" markerHeight="8" refX="6.4" refY="3.6" orient="auto"><path d="M0,0 L7,3.6 L0,7.2 Z" /></marker>
					</defs>
					<rect className="apn-diagram-boundary" x="14" y="20" width="972" height="320" rx="16" />
					<text className="apn-diagram-svg-label" x="32" y="47">{level === "L2" ? "SOLUTION OWNERSHIP AND SYSTEM BOUNDARIES" : level === "L3" ? "DEPLOYABLE COMPONENTS AND VERSIONED INTERFACES" : "TEAM BUILD PACKAGES AND DEPENDENCY ORDER"}</text>
					{laneLayout.map((lane, index) => <g key={lane.label}><rect className={`apn-diagram-zone ${index === 0 ? "is-entry" : index === laneLayout.length - 1 ? "is-effect" : "is-control"}`} x={lane.x * 10} y="66" width={lane.width * 10} height="244" rx="10" /><text className="apn-diagram-zone-label" x={(lane.x + 1.4) * 10} y="90">{lane.label}</text></g>)}
					{positionedNodes.slice(0, -1).map((node, index) => {
						const next = positionedNodes[index + 1]
						const startX = (node.x + node.width) * 10
						const endX = next.x * 10 - 5
						const startY = node.y * 3.6 + 45
						const endY = next.y * 3.6 + 45
						const midX = (startX + endX) / 2
						return <g key={`${node.title}-${next.title}`}><path className="apn-diagram-link" d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`} markerEnd="url(#apn-arrow)" />{edgeLabels[index] ? <text className="apn-diagram-edge-label" textAnchor="middle" x={midX} y={Math.min(startY, endY) - 9}>{edgeLabels[index]}</text> : null}</g>
					})}
					{diagram.returnEdge ? <><path className="apn-diagram-return" d="M 925 286 C 760 318, 250 318, 80 286" markerEnd="url(#apn-arrow)" /><text className="apn-diagram-edge-label" textAnchor="middle" x="500" y="306">{diagram.returnEdge}</text></> : null}
				</svg>
				<div className="apn-diagram-model"><span>{level}</span><strong>{model}</strong></div>
				{positionedNodes.map((node, index) => <button type="button" key={node.title} aria-pressed={selectedNodeTitle === node.title} aria-label={`Inspect ${node.title}`} onClick={() => onSelectNode(node.title)} style={{ left: `${node.x}%`, top: `${node.y}%`, width: `${node.width}%` }} className={`apn-diagram-node is-${node.tone}`}><span>{node.team ?? `${level} · ${String(index + 1).padStart(2, "0")}`}</span><strong>{node.title}</strong><small>{node.detail}</small>{node.artifact ? <em>{node.artifact}</em> : null}</button>)}
				<div className="apn-diagram-legend" aria-hidden="true"><span className="is-source">Source / request</span><span className="is-core">Integration / control</span><span className="is-store">Durable state / gate</span><span className="is-effect">System of record / effect</span></div>
			</div>
		</div>
	)
}

function PlanNodeBrief({ level, flow, node, nodeIndex, brief, onLevelChange, onOpenImplementation, onSteerNode }: { level: PlanArchitectureLevel; flow: PlanFlow; node: PlanDiagramNode; nodeIndex: number; brief: PlanExecutionBrief; onLevelChange: (level: PlanArchitectureLevel) => void; onOpenImplementation: () => void; onSteerNode: (context: string) => void }) {
	const relatedContract = brief.contracts[Math.min(nodeIndex, brief.contracts.length - 1)]
	const workPackage = (node.packageId ? brief.workPackages.find((item) => item.id === node.packageId) : undefined) ?? brief.workPackages.find((item) => item.id === node.title) ?? brief.workPackages[Math.min(nodeIndex, brief.workPackages.length - 1)]
	const owner = node.team ?? brief.teams[Math.min(nodeIndex, brief.teams.length - 1)]?.name ?? "Architecture owner"
	const nextAction = level === "L2" ? `Baseline ${relatedContract?.id ?? "the first interface"} with every owning team.` : level === "L3" ? `Create ${workPackage?.artifact ?? "the assigned build artifact"} against the locked contract.` : workPackage?.doneWhen ?? "Attach acceptance evidence before handoff."
	return (
		<section className="apn-node-brief" aria-label="Selected architecture node">
			<header><div><small>Selected node</small><h3>{node.title}</h3><p>{node.detail}</p></div><span>{level}</span></header>
			<div className="apn-node-brief-grid">
				<article><small>Owning team</small><strong>{owner}</strong></article>
				<article><small>Build artifact</small><strong>{node.artifact ?? workPackage?.artifact ?? "Architecture decision record"}</strong></article>
				<article><small>{level === "L4" ? "Starts after" : "Interface contract"}</small><strong>{level === "L4" ? workPackage?.dependsOn : relatedContract ? `${relatedContract.id} · ${relatedContract.transport}` : "Internal contract"}</strong></article>
				<article className="is-next"><small>{level === "L4" ? "Done when" : "What happens next"}</small><strong>{nextAction}</strong></article>
			</div>
			<footer><span><CheckCircle size={14} weight="fill" />Evidence and rationale are attached</span><div><button type="button" className="apn-node-steer" onClick={() => onSteerNode(`${flow.key} · ${level} · ${node.title}`)}><Crosshair size={13} />Steer MAX on this node</button>{level === "L2" ? <button type="button" onClick={() => onLevelChange("L3")}>Open technical contract<ArrowRight size={14} /></button> : level === "L3" ? <button type="button" onClick={() => onLevelChange("L4")}>Open build package<ArrowRight size={14} /></button> : <button type="button" onClick={onOpenImplementation}>Open implementation queue<ArrowRight size={14} /></button>}</div></footer>
		</section>
	)
}

function PlanExecutableHandoff({ level, flow, brief }: { level: PlanArchitectureLevel; flow: PlanFlow; brief: PlanExecutionBrief }) {
	const [teamFilter, setTeamFilter] = useState("all")
	const packages = teamFilter === "all" ? brief.workPackages : brief.workPackages.filter((item) => item.team === teamFilter)
	const title = level === "L2" ? "Solution decision and ownership" : level === "L3" ? "Interface contracts teams build against" : "Assigned build packages and completion gates"
	return (
		<section className={`apn-executable-handoff is-${level.toLowerCase()}`} aria-label={`${level} executable handoff`}>
			<header><div><span>Executable handoff</span><h3>{title}</h3><p>{PLAN_LEVEL_QUESTIONS[level].output}.</p></div><div className="apn-trace-chain" aria-label="Architecture traceability"><code>{flow.key}-L2</code><ArrowRight size={11} /><code>{flow.key}-L3</code><ArrowRight size={11} /><code>{flow.key}-L4</code></div></header>
			{level === "L2" ? <>
				<div className="apn-solution-summary"><article><small>Business outcome</small><strong>{brief.outcome}</strong></article><article><small>Approved integration pattern</small><strong>{brief.pattern}</strong></article></div>
				<div className="apn-team-ownership">{brief.teams.map((team) => <article key={team.id}><header><span>{team.name}</span><strong>{team.system}</strong></header><dl><div><dt>Owns</dt><dd>{team.owns}</dd></div><div><dt>Must deliver</dt><dd>{team.delivers}</dd></div></dl></article>)}</div>
			</> : null}
			{level === "L3" ? <>
				<div className="apn-contract-list">{brief.contracts.map((contract) => <article key={contract.id}><header><code>{contract.id}</code><span>{contract.from}<ArrowRight size={11} />{contract.to}</span></header><dl><div><dt>Transport</dt><dd>{contract.transport}</dd></div><div><dt>Payload</dt><dd>{contract.payload}</dd></div><div><dt>Security</dt><dd>{contract.security}</dd></div><div><dt>Failure contract</dt><dd>{contract.failure}</dd></div></dl></article>)}</div>
				{brief.mappings?.length ? <section className="apn-mapping-table" aria-label="Canonical field mapping"><header><span>Canonical field mapping</span><small>Source to target · schema-owned by MuleSoft</small></header><div className="apn-mapping-row is-heading"><span>ServiceNow</span><span>Workday Financials</span><span>Transformation rule</span></div>{brief.mappings.map((mapping) => <div className="apn-mapping-row" key={mapping.source}><code>{mapping.source}</code><code>{mapping.target}</code><span>{mapping.rule}</span></div>)}</section> : null}
			</> : null}
			{level === "L4" ? <>
				<div className="apn-team-filter" role="group" aria-label="Filter build packages by team"><button type="button" aria-pressed={teamFilter === "all"} onClick={() => setTeamFilter("all")}>All teams</button>{Array.from(new Set(brief.workPackages.map((item) => item.team))).map((team) => <button type="button" key={team} aria-pressed={teamFilter === team} onClick={() => setTeamFilter(team)}>{team.replace(" integration", "")}</button>)}</div>
				<div className="apn-work-package-list">{packages.map((item) => <article key={item.id}><header><code>{item.id}</code><span>{item.team}</span></header><h4>{item.title}</h4><dl><div><dt>Build artifact</dt><dd>{item.artifact}</dd></div><div><dt>Starts after</dt><dd>{item.dependsOn}</dd></div><div><dt>Done when</dt><dd>{item.doneWhen}</dd></div></dl></article>)}</div>
				<section className="apn-build-order"><header><span>Cross-team build order</span><small>MAX keeps blocked packages from starting early</small></header><ol>{brief.buildOrder.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></section>
			</> : null}
		</section>
	)
}

const PLAN_SYSTEM_NODES = [
	{ flowId: "authority", x: 4, y: 14, tone: "core" as const, note: "Grants bounded build authority" },
	{ flowId: "adapter", x: 39, y: 14, tone: "core" as const, note: "The governed financial integration" },
	{ flowId: "reconcile", x: 74, y: 14, tone: "store" as const, note: "Proves intent matches reality" },
	{ flowId: "replay", x: 21, y: 62, tone: "store" as const, note: "Makes every retry safe" },
	{ flowId: "evidence", x: 57, y: 62, tone: "effect" as const, note: "Turns proof into a release decision" },
]

function PlanSystemBlueprint({ onOpenFlow, assembling = false }: { onOpenFlow: (flowId: string) => void; assembling?: boolean }) {
	return (
		<div className="apn-diagram-viewport">
			<div className={`apn-architecture-diagram apn-blueprint${assembling ? " is-assembling" : ""}`} role="group" aria-label="System blueprint for the five implementation flows">
				<svg viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
					<defs>
						<marker id="apn-blueprint-arrow" markerWidth="8" markerHeight="8" refX="6.4" refY="3.6" orient="auto"><path d="M0,0 L7,3.6 L0,7.2 Z" /></marker>
					</defs>
					<rect className="apn-diagram-boundary" x="14" y="14" width="972" height="392" rx="16" />
					<text className="apn-diagram-svg-label" x="32" y="41">HOW THE FIVE FLOWS COMPOSE INTO ONE DELIVERY SYSTEM</text>
					<path className="apn-diagram-link" d={"M 270 105 C 310 105, 330 105, 375 105"} markerEnd="url(#apn-blueprint-arrow)" />
					<text className="apn-diagram-edge-label" textAnchor="middle" x="322" y="94">bounded authority</text>
					<path className="apn-diagram-link" d={"M 620 105 C 660 105, 680 105, 725 105"} markerEnd="url(#apn-blueprint-arrow)" />
					<text className="apn-diagram-edge-label" textAnchor="middle" x="672" y="94">effect receipts</text>
					<path className="apn-diagram-link" d={"M 130 150 C 130 220, 190 250, 250 278"} markerEnd="url(#apn-blueprint-arrow)" />
					<text className="apn-diagram-edge-label" textAnchor="middle" x="132" y="228">authority + keys</text>
					<path className="apn-diagram-link" d={"M 810 150 C 790 220, 500 250, 425 285"} markerEnd="url(#apn-blueprint-arrow)" />
					<text className="apn-diagram-edge-label" textAnchor="middle" x="640" y="240">journal state</text>
					<path className="apn-diagram-link" d={"M 855 150 C 870 240, 810 285, 770 297"} markerEnd="url(#apn-blueprint-arrow)" />
					<text className="apn-diagram-edge-label" textAnchor="middle" x="872" y="240">verified receipts</text>
					<path className="apn-diagram-link" d={"M 415 315 C 470 315, 500 315, 555 315"} markerEnd="url(#apn-blueprint-arrow)" />
					<text className="apn-diagram-edge-label" textAnchor="middle" x="485" y="304">exactly-once proof</text>
				</svg>
				{PLAN_SYSTEM_NODES.map((entry) => {
					const flow = PLAN_FLOWS.find((item) => item.id === entry.flowId)
					if (!flow) return null
					return (
						<button type="button" key={flow.id} className={`apn-diagram-node apn-blueprint-node is-${entry.tone}`} style={{ left: `${entry.x}%`, top: `${entry.y}%`, width: "22%" }} onClick={() => onOpenFlow(flow.id)} aria-label={`Open ${flow.title}`}>
							<span>{flow.number} · {flow.key}</span>
							<strong>{flow.title}</strong>
							<small>{entry.note}</small>
							<em>{PLAN_EXECUTION_BRIEFS[flow.id].workPackages.length} packages · depends on {flow.dependsOn}</em>
						</button>
					)
				})}
				<div className="apn-diagram-legend" aria-hidden="true"><span className="is-core">Authority + integration</span><span className="is-store">Assurance</span><span className="is-effect">Release decision</span></div>
			</div>
		</div>
	)
}

function PlanPackagesPanel({ onOpenFlow }: { onOpenFlow: (flowId: string, level: PlanArchitectureLevel) => void }) {
	const [teamFilter, setTeamFilter] = useState("All teams")
	const packages = PLAN_FLOWS.flatMap((flow) => PLAN_EXECUTION_BRIEFS[flow.id].workPackages.map((item) => ({ ...item, flow })))
	const teams = ["All teams", ...Array.from(new Set(packages.map((item) => item.team)))]
	const visiblePackages = teamFilter === "All teams" ? packages : packages.filter((item) => item.team === teamFilter)
	return (
		<section className="apn-diagram-panel apn-packages-panel">
			<header><div><span>ALL FLOWS</span><h2>Owned work packages</h2></div></header>
			<section className="apn-level-question"><div><small>This view answers</small><strong>Can each delivery team start building and prove completion?</strong></div><span><Users size={13} />Engineering leads · developers · QA and release</span></section>
			<section className="apn-implementation-intro" aria-label="Implementation starting point"><div><span>01</span><div><small>Start here</small><strong>Baseline the shared contracts before teams build in parallel.</strong><p>INT-01, INT-02, field mappings, and the error taxonomy are the only cross-team prerequisites. MAX will keep downstream packages visibly blocked until those contracts are accepted.</p></div></div><button type="button" onClick={() => onOpenFlow("adapter", "L3")}>Review shared contracts<ArrowRight size={14} /></button></section>
			<section className="apn-implementation-toolbar"><div><small>Show work for</small><div role="group" aria-label="Filter implementation packages by team">{teams.map((team) => <button type="button" key={team} aria-pressed={teamFilter === team} onClick={() => setTeamFilter(team)}>{team.replace(" integration", "")}</button>)}</div></div><span><CheckCircle size={14} weight="fill" />{visiblePackages.length} owned packages shown</span></section>
			<section className="apn-package-cockpit" aria-label="Implementation packages">
				{visiblePackages.map((item) => {
					const queued = item.dependsOn.includes(" + ") || item.dependsOn === "All flow gates"
					return <button key={`${item.flow.id}-${item.id}`} type="button" onClick={() => onOpenFlow(item.flow.id, "L4")}><header><code>{item.id}</code><span>{item.team}</span><i className={queued ? "is-queued" : "is-ready"}>{queued ? <Clock size={12} /> : <CheckCircle size={12} weight="fill" />}{queued ? "Sequenced" : "Ready"}</i></header><h2>{item.title}</h2><p>{item.flow.title}</p><dl><div><dt>Create</dt><dd>{item.artifact}</dd></div><div><dt>Starts after</dt><dd>{item.dependsOn}</dd></div><div><dt>Done when</dt><dd>{item.doneWhen}</dd></div></dl><footer><span>Open L4 package</span><ArrowRight size={14} /></footer></button>
				})}
			</section>
		</section>
	)
}

function PlanDesignView({ selectedFlowId, level, onLevelChange, onSelectFlow, onSteerNode }: { selectedFlowId: string; level: PlanArchitectureLevel; onLevelChange: (level: PlanArchitectureLevel) => void; onSelectFlow: (flowId: string) => void; onSteerNode: (context: string) => void }) {
	const isSystem = selectedFlowId === "system"
	const isPackages = selectedFlowId === "packages"
	const selectedFlow = PLAN_FLOWS.find((flow) => flow.id === selectedFlowId) ?? PLAN_FLOWS[0]
	const diagram = selectedFlow.levels[level]
	const brief = PLAN_EXECUTION_BRIEFS[selectedFlow.id]
	const [selectedNodeTitle, setSelectedNodeTitle] = useState(diagram.nodes[0]?.title ?? "")
	useEffect(() => setSelectedNodeTitle(diagram.nodes[0]?.title ?? ""), [diagram.nodes, level, selectedFlowId])
	const nodeIndex = Math.max(0, diagram.nodes.findIndex((node) => node.title === selectedNodeTitle))
	const selectedNode = diagram.nodes[nodeIndex] ?? diagram.nodes[0]
	return (
		<main className="apn-main apn-architecture-view">
			<header className="apn-view-heading"><div><span>Design</span><h1>See the system. Select a node. Know what to build.</h1><p>The diagram is the primary workspace. Start from the system blueprint, follow each flow left to right, select any node for its owner and contract, then move from L2 solution intent to L3 technical interfaces and L4 build packages without losing context.</p></div><div><strong>{PLAN_VIEW_COUNT} / {PLAN_VIEW_COUNT}</strong><small>traceable architecture views</small></div></header>
			<div className="apn-architecture-layout">
				<nav aria-label="Architecture flows">
					<span>Implementation flows</span>
					<button type="button" className={`apn-flow-system${isSystem ? " is-active" : ""}`} onClick={() => onSelectFlow("system")}><i><TreeStructure size={14} /></i><span><strong>System blueprint</strong><small>How the five flows compose</small></span><CaretRight size={14} /></button>
					{PLAN_FLOWS.map((flow) => <button key={flow.id} type="button" className={!isSystem && !isPackages && selectedFlow.id === flow.id ? "is-active" : ""} onClick={() => onSelectFlow(flow.id)}><i>{flow.number}</i><span><strong>{flow.title}</strong><small>{flow.key} · {PLAN_EXECUTION_BRIEFS[flow.id].teams.length} teams · {PLAN_EXECUTION_BRIEFS[flow.id].workPackages.length} build items</small></span><CheckCircle size={14} weight="fill" /></button>)}
					<button type="button" className={`apn-flow-system${isPackages ? " is-active" : ""}`} onClick={() => onSelectFlow("packages")} aria-label="All work packages"><i><ListChecks size={14} /></i><span><strong>All packages</strong><small>{PLAN_PACKAGE_COUNT} owned build items</small></span><CaretRight size={14} /></button>
				</nav>
				{isPackages ? (
					<PlanPackagesPanel onOpenFlow={(flowId, nextLevel) => { onSelectFlow(flowId); onLevelChange(nextLevel) }} />
				) : isSystem ? (
					<section className="apn-diagram-panel">
						<header><div><span>ERP-SYS</span><h2>System blueprint</h2></div></header>
						<section className="apn-level-question"><div><small>This view answers</small><strong>Does the delivery system hang together end to end?</strong></div><span><Users size={13} />Solution architect · program owners</span></section>
						<div className="apn-diagram-meta"><span>Composed delivery system</span><p>Authority gates the integration; the integration is reconciled, replay-protected, and released only with evidence. Select a flow to open its L2 view.</p><i><CheckCircle size={12} weight="fill" />Generated, traced, and critic-checked</i></div>
						<PlanSystemBlueprint onOpenFlow={(flowId) => { onSelectFlow(flowId); onLevelChange("L2") }} />
						<footer><span>What the composed system guarantees</span><div><p><Check size={12} />No external financial effect without named, bounded authority</p><p><Check size={12} />One approved change produces exactly one posted journal and one receipt</p><p><Check size={12} />Deployment happens only from owner-approved, evidence-backed releases</p></div></footer>
					</section>
				) : (
					<section className="apn-diagram-panel">
						<header><div><span>{selectedFlow.key}</span><h2>{selectedFlow.title}</h2></div><div role="group" aria-label="Architecture level">{(["L2", "L3", "L4"] as const).map((item) => <button key={item} type="button" aria-pressed={level === item} onClick={() => onLevelChange(item)}><strong>{item}</strong><small>{item === "L2" ? "Solution" : item === "L3" ? "Technical" : "Build"}</small></button>)}</div></header>
						<section className="apn-level-question"><div><small>This view answers</small><strong>{PLAN_LEVEL_QUESTIONS[level].question}</strong></div><span><Users size={13} />{PLAN_LEVEL_QUESTIONS[level].audience}</span></section>
						<div className="apn-diagram-meta"><span>{diagram.name}</span><p>{diagram.focus}</p><i><CheckCircle size={12} weight="fill" />Generated, traced, and critic-checked</i></div>
						<p className="apn-diagram-instruction"><Lightning size={14} weight="fill" />Select a node to see its owner, interface, build artifact, dependency, and completion condition.</p>
						<PlanArchitectureDiagram level={level} flow={selectedFlow} brief={brief} selectedNodeTitle={selectedNodeTitle} onSelectNode={setSelectedNodeTitle} />
						{selectedNode ? <PlanNodeBrief level={level} flow={selectedFlow} node={selectedNode} nodeIndex={nodeIndex} brief={brief} onLevelChange={onLevelChange} onOpenImplementation={() => onSelectFlow("packages")} onSteerNode={onSteerNode} /> : null}
						<footer><span>Architecture decisions shown in this view</span><div>{diagram.guidance.map((item) => <p key={item}><Check size={12} />{item}</p>)}</div></footer>
						<PlanExecutableHandoff key={`${selectedFlow.id}-${level}`} level={level} flow={selectedFlow} brief={brief} />
					</section>
				)}
			</div>
		</main>
	)
}


function PlanRevisionsView({ revisions, onOpenArchitecture }: { revisions: readonly PlanRevision[]; onOpenArchitecture: () => void }) {
	return (
		<section className="apn-ledger-section apn-revisions-view">
			<header className="apn-view-heading"><div><span>Revisions</span><h1>Every pass is recorded. Nothing changes silently.</h1><p>Each revision names what triggered it, what changed, and which artifacts re-derived. Steering you apply lands here with the same receipts as MAX's own passes.</p></div><div><strong>{revisions[0].version}</strong><small>current snapshot</small></div></header>
			<section className="apn-revision-timeline" aria-label="Plan revision history">
				{revisions.map((revision, index) => (
					<article key={revision.version} className={index === 0 ? "is-current" : ""}>
						<div className="apn-revision-marker"><code>{revision.version}</code>{index < revisions.length - 1 ? <i /> : null}</div>
						<div className="apn-revision-body">
							<header><i className={`apn-revision-trigger is-${revision.trigger.toLowerCase().replace(/ /g, "-")}`}>{revision.trigger}</i><span>Pass {revision.pass} · {revision.time}</span></header>
							<strong>{revision.title}</strong>
							<p>{revision.detail}</p>
							<ul>{revision.changes.map((change) => <li key={`${revision.version}-${change.id}`}><code>{change.id}</code><span>{change.change}</span></li>)}</ul>
						</div>
					</article>
				))}
			</section>
			<footer className="apn-revision-footer"><span><ShieldCheck size={14} />The revision log is immutable and travels with the Execute handoff.</span><button type="button" onClick={onOpenArchitecture}>Review current architecture<ArrowRight size={13} /></button></footer>
		</section>
	)
}

type PlanEvidenceClaim = { id: string; statement: string; confidence: number; fingerprint: string; influences: readonly string[]; excerpt: string }

const PLAN_EVIDENCE_SOURCES: ReadonlyArray<{ name: string; coverage: string; usedBy: string; detail: string; claims: readonly PlanEvidenceClaim[] }> = [
	{
		name: "Verified Discovery", coverage: "124 claims", usedBy: "All 5 flows", detail: "Snapshot v12 · decision source",
		claims: [
			{ id: "CLM-014", statement: "ServiceNow approval FIN-18 treats a financial change as one business transaction", confidence: 0.96, fingerprint: "sha256 · 8f31c2", influences: ["INT-02", "Posting decision"], excerpt: "“Approval applies to the complete requested journal, not to individual lines.” — Change policy FIN-18 §4.2" },
			{ id: "CLM-021", statement: "The October cutover is a hard program constraint", confidence: 0.92, fingerprint: "sha256 · 77aa19", influences: ["Build order", "CMP-REL-05"], excerpt: "“No financial posting changes may land inside the October cutover window.” — Program charter, delivery constraints" },
			{ id: "CLM-042", statement: "Cost centers are mastered in Workday, not ServiceNow", confidence: 0.94, fingerprint: "sha256 · 3d90b4", influences: ["FIELD MAPPING", "MULE-202"], excerpt: "“Workday is the system of record for the cost-center hierarchy.” — Finance data standards §2" },
		],
	},
	{
		name: "ServiceNow", coverage: "19 contracts", usedBy: "Flow 02", detail: "Schema + event samples",
		claims: [
			{ id: "CLM-058", statement: "Approved changes can emit a signed outbound REST event from Flow Designer", confidence: 0.97, fingerprint: "sha256 · 41be07", influences: ["INT-01", "SNOW-101"], excerpt: "Instance metadata: Flow Designer + outbound REST message with OAuth 2.0 profile available on u_financial_change." },
			{ id: "CLM-061", statement: "u_cost_center values are free-text and drift from the Workday hierarchy", confidence: 0.88, fingerprint: "sha256 · c2d914", influences: ["FIELD MAPPING", "Question Q-02"], excerpt: "Sample export: 7 of 200 records carry cost-center labels with no Workday reference match." },
		],
	},
	{
		name: "SAP and QuickBooks", coverage: "31 observations", usedBy: "Flows 03–05", detail: "Provider capability snapshots",
		claims: [
			{ id: "CLM-077", statement: "Provider reads are paged and rate-limited; full scans need durable cursors", confidence: 0.93, fingerprint: "sha256 · 5e88af", influences: ["REC-02", "INT-201"], excerpt: "Capability snapshot: 500-record pages, 40 req/min ceiling, cursor tokens expire after 15 minutes." },
			{ id: "CLM-081", statement: "Neither provider exposes a native idempotency key on journal writes", confidence: 0.95, fingerprint: "sha256 · 19d3c6", influences: ["CMP-SEC-04", "SEC-201"], excerpt: "API review: duplicate posting protection must be enforced on the MAXION side of the boundary." },
		],
	},
	{
		name: "Policy library", coverage: "14 controls", usedBy: "Flows 01, 04, 05", detail: "Authority + retention rules",
		claims: [
			{ id: "CLM-102", statement: "Architecture changes to financial integrations require AP-19 approval", confidence: 0.98, fingerprint: "sha256 · b04e71", influences: ["Approval routing", "Priya Shah"], excerpt: "“Material changes to financial integration architecture require Enterprise Architecture approval.” — AP-19 §1" },
			{ id: "CLM-108", statement: "Replay and idempotency controls fall under SEC-44 ownership", confidence: 0.97, fingerprint: "sha256 · f6a2d8", influences: ["CMP-SEC-04", "Elena Ortiz"], excerpt: "Control registry: SEC-44 — duplicate-effect prevention, owner: Security Controls Lead." },
		],
	},
	{
		name: "Project workspace", coverage: "8 decisions", usedBy: "All 5 flows", detail: "Goals, owners, and constraints",
		claims: [
			{ id: "CLM-115", statement: "Decision D-14 grants Plan the authority to propose bounded build missions", confidence: 0.99, fingerprint: "sha256 · 2c9b53", influences: ["CMP-AUTH-01", "Approval routing"], excerpt: "Project decision D-14: MAX may propose missions; effect authority requires a named approver." },
			{ id: "CLM-118", statement: "MuleSoft is the approved integration vendor for this program", confidence: 0.95, fingerprint: "sha256 · 9a71e0", influences: ["CMP-INT-02", "Integration pattern"], excerpt: "Approved-vendor register: MuleSoft Anypoint (integration), reviewed this fiscal year." },
		],
	},
]

function PlanEvidenceView() {
	const [openSource, setOpenSource] = useState<string | null>(PLAN_EVIDENCE_SOURCES[0].name)
	return (
		<section className="apn-ledger-section apn-evidence-view">
			<header className="apn-view-heading"><div><span>Evidence and provenance</span><h1>Every recommendation can explain itself.</h1><p>MAX retains the source, fingerprint, confidence, and exact plan artifacts influenced by every material claim. Open a source to read the claims themselves.</p></div><div><strong>100%</strong><small>material claims traced</small></div></header>
			<section className="apn-evidence-summary"><div><MaxionSpiralMark /><span><strong>Evidence graph is healthy</strong><p>No stale sources, unresolved contradictions, or ungrounded implementation decisions.</p></span></div><span><CheckCircle size={14} weight="fill" />Verified</span></section>
			<section className="apn-evidence-list">
				<header><span>Source</span><span>Coverage</span><span>Used by</span><span>State</span></header>
				{PLAN_EVIDENCE_SOURCES.map((source) => {
					const open = openSource === source.name
					return (
						<div key={source.name} className={`apn-evidence-source${open ? " is-open" : ""}`}>
							<button type="button" aria-expanded={open} onClick={() => setOpenSource(open ? null : source.name)}>
								<span><Database size={15} /><strong>{source.name}</strong></span>
								<span>{source.coverage}</span>
								<span><strong>{source.usedBy}</strong><small>{source.detail}</small></span>
								<span><Check size={12} />Current<CaretDown size={13} className="apn-evidence-caret" /></span>
							</button>
							{open ? (
								<div className="apn-claim-list">
									{source.claims.map((claim) => (
										<article key={claim.id}>
											<header><code>{claim.id}</code><i>confidence {claim.confidence.toFixed(2)}</i><span><Fingerprint size={12} />{claim.fingerprint}</span></header>
											<strong>{claim.statement}</strong>
											<blockquote>{claim.excerpt}</blockquote>
											<footer><span>Influences</span>{claim.influences.map((artifact) => <code key={artifact}>{artifact}</code>)}</footer>
										</article>
									))}
									<p className="apn-claim-more">Showing {source.claims.length} representative claims · the full set travels with the plan snapshot.</p>
								</div>
							) : null}
						</div>
					)
				})}
			</section>
		</section>
	)
}

function PlanDecisionsSection({ resolved, approved, onResolve, onApprove, onOpenContract }: { resolved: boolean; approved: boolean; onResolve: () => void; onApprove: () => void; onOpenContract: () => void }) {
	const resolvedItems = [
		["Which system owns the cost-center reference?", "MAX compared ServiceNow samples with Workday metadata and selected the Workday reference ID as canonical.", "Resolved from evidence"],
		["Who owns the journal-status callback?", "MAX reconciled the project RACI with the integration catalogue and assigned the callback contract to MuleSoft.", "Resolved from governance"],
		["How should closed accounting periods fail?", "MAX asked Marcus Lee, Workday owner, then added a classified non-retryable response to INT-02.", "Owner answered · 14:11"],
	] as const
	const requests = [
		{ id: "architecture", initials: "PS", name: "Priya Shah", role: "Director, Enterprise Architecture", scope: "L3 service contracts and the Execute build boundary", basis: "Project RACI · Architecture policy AP-19", channel: "Teams + email · delivered 14:19", status: "Approved" },
		{ id: "security", initials: "EO", name: "Elena Ortiz", role: "Security Controls Lead", scope: "Tenant isolation, replay protection, and evidence retention", basis: "Control owner registry · SEC-44", channel: "Teams + email · delivered 14:20", status: "Approved" },
		{ id: "program", initials: "RA", name: "Root Admin", role: "Program owner", scope: "Authorize Execute to build the approved L3 and L4 scope", basis: "Mission authority record · D-14", channel: "Teams + email · delivered 14:21", status: approved ? "Approved" : "Decision needed" },
	] as const
	return (
		<section className="apn-ledger-section apn-questions-view">
			<header className="apn-view-heading"><div><span>Decisions</span><h1>MAX asks only when the context cannot decide safely.</h1><p>It resolves factual gaps from evidence, asks domain owners for system knowledge, and escalates only consequential choices that require business authority. Every answer updates the affected diagrams, contracts, tests, and approvals.</p></div><div><strong>{Number(!resolved) + Number(!approved)}</strong><small>waiting for you</small></div></header>
			<section className="apn-question-autonomy" aria-label="Clarification work completed by MAX"><div><MaxionSpiralMark /><span><small>Before asking you</small><strong>MAX read 124 claims, reconciled three conflicts, and contacted two domain owners.</strong><p>Three questions were resolved without interrupting the plan owner. One policy decision remains because it changes the financial outcome.</p></span></div><span><CheckCircle size={14} weight="fill" />3 handled autonomously</span></section>
			<div className="apn-questions-layout">
				<PlanDecisionCard resolved={resolved} onResolve={onResolve} onOpenContract={onOpenContract} />
				<aside className="apn-resolved-questions" aria-label="Questions MAX resolved autonomously"><header><small>Handled without you</small><strong>Resolved questions</strong></header>{resolvedItems.map(([title, detail, source]) => <article key={title}><span><Check size={12} /></span><div><strong>{title}</strong><p>{detail}</p><small>{source}</small></div></article>)}</aside>
			</div>
			<div className="apn-approval-block">
				<header className="apn-ledger-subheading"><div><span>Approval routing</span><h2>MAX found the approvers and sent the work.</h2><p>Each request is matched to the project RACI and policy owner, then sent with the exact scope, architecture artifacts, evidence, and rollback boundary that person needs to decide.</p></div><div><strong>{approved ? "3 / 3" : "2 / 3"}</strong><small>{approved ? "approvals complete" : "acknowledged"}</small></div></header>
				<section className="apn-approval-summary"><div><MaxionSpiralMark /><span><strong>Approval messages are routed</strong><p>MAX used the decision-rights graph to avoid sending a blanket owner approval. The delivery record and response are retained with the plan.</p></span></div><span><CheckCircle size={14} weight="fill" />3 messages delivered</span></section>
				<section className="apn-approval-requests" aria-label="Approval requests">{requests.map((request) => <article key={request.id} className={request.status === "Decision needed" ? "is-pending" : ""}><header><span className="apn-approval-avatar">{request.initials}</span><div><strong>{request.name}</strong><small>{request.role}</small></div><i className={request.status === "Approved" ? "is-approved" : "is-pending"}>{request.status === "Approved" ? <CheckCircle size={13} weight="fill" /> : <ShieldCheck size={13} />}{request.status}</i></header><dl><div><dt>Approval requested</dt><dd>{request.scope}</dd></div><div><dt>Why this approver</dt><dd>{request.basis}</dd></div></dl><div className="apn-approval-message"><ChatCircleText size={16} /><p><strong>MAXION approval request</strong> — approve this bounded implementation scope. The message includes the L2 boundary, L3 contracts, L4 sequence, test gates, evidence, and rollback instructions.</p></div><footer><span>{request.channel}</span>{request.status === "Decision needed" ? <button type="button" onClick={onApprove}><ShieldCheck size={14} />Approve implementation boundary</button> : <span><CheckCircle size={13} weight="fill" />Decision recorded</span>}</footer></article>)}</section>
			</div>
			<section className="apn-scope-note apn-ledger-scope"><ShieldCheck size={14} /><p><strong>Authority stays bounded</strong><small>Build authority only · no provider writes · no deployment approval</small></p></section>
		</section>
	)
}

function PlanLedgerView({ section, onSectionChange, revisions, clarificationResolved, approved, onResolve, onApprove, onOpenContract }: { section: PlanLedgerSection; onSectionChange: (section: PlanLedgerSection) => void; revisions: readonly PlanRevision[]; clarificationResolved: boolean; approved: boolean; onResolve: () => void; onApprove: () => void; onOpenContract: () => void }) {
	const segments = [
		["decisions", "Decisions"],
		["history", "History"],
		["sources", "Sources"],
	] as const
	return (
		<main className="apn-main apn-ledger">
			<nav className="apn-ledger-segments" aria-label="Ledger sections">
				{segments.map(([id, label]) => <button key={id} type="button" aria-pressed={section === id} className={section === id ? "is-active" : ""} onClick={() => onSectionChange(id)}>{label}{id === "decisions" && (Number(!clarificationResolved) + Number(!approved)) > 0 ? <small>{Number(!clarificationResolved) + Number(!approved)}</small> : null}</button>)}
			</nav>
			{section === "decisions" ? <PlanDecisionsSection resolved={clarificationResolved} approved={approved} onResolve={onResolve} onApprove={onApprove} onOpenContract={onOpenContract} /> : null}
			{section === "history" ? <PlanRevisionsView revisions={revisions} onOpenArchitecture={onOpenContract} /> : null}
			{section === "sources" ? <PlanEvidenceView /> : null}
		</main>
	)
}
