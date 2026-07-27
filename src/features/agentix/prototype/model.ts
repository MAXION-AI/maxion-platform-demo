export type AgentixView = "overview" | "agents" | "work" | "approvals" | "artifacts"

export type AgentWorkspaceTab = "now" | "duties" | "activity" | "knowledge"

export type AgentStatus = "Active" | "Paused" | "Draft"

export type RunState = "Working" | "Waiting for input" | "Waiting for approval" | "Reconciling" | "Completed"

export interface AgentDuty {
	id: string
	name: string
	description: string
	cadence: string
	nextRun: string
	status: "Active" | "Paused"
	authority: "Automatic within bounds" | "Approval at threshold"
}

export interface AgentActivity {
	id: string
	title: string
	summary: string
	time: string
	status: "complete" | "working" | "waiting" | "verified"
	detail: string
	evidence?: string
}

export interface AgentMessage {
	id: string
	author: "You" | "Agentix"
	text: string
	time: string
	tone?: "default" | "question" | "system"
}

export interface AgentConnection {
	name: string
	principal: string
	capability: string
	state: "Healthy" | "Restricted" | "Under-scoped"
}

export interface AgentArtifact {
	id: string
	name: string
	type: string
	freshness: string
	verification: string
}

export interface AgentScenario {
	id: "tpm" | "revenue" | "finance"
	name: string
	shortName: string
	mission: string
	owner: string
	status: AgentStatus
	version: string
	health: string
	currentWork: string
	runState: RunState
	latestOutcome: string
	outcomeDetail: string
	outcomeMetric: string
	outcomeMetricLabel: string
	nextDuty: string
	needsAttention?: string
	duties: AgentDuty[]
	activity: AgentActivity[]
	messages: AgentMessage[]
	connections: AgentConnection[]
	artifacts: AgentArtifact[]
	sources: Array<{ name: string; detail: string; freshness: string }>
}

export const NEED_EXAMPLES = [
	{
		id: "tpm",
		label: "Own a program",
		detail: "Act as TPM for the ERP modernization",
		prompt:
			"Own the ERP modernization program as our TPM. Keep risks and dependencies current, prepare steering briefs, and follow up on overdue actions.",
	},
	{
		id: "revenue",
		label: "Protect renewals",
		detail: "Watch Salesforce and coordinate follow-through",
		prompt:
			"Every weekday, find at-risk Salesforce renewals, update bounded records, notify Revenue Operations in Teams, and email each account owner.",
	},
	{
		id: "finance",
		label: "Run month-end close",
		detail: "Coordinate QuickBooks, SAP, inventory, and reporting",
		prompt:
			"Run the July close: validate the QuickBooks journal, build the financial model, reconcile SAP inventory and GL, then notify Finance.",
	},
] as const

export const AGENT_SCENARIOS: AgentScenario[] = [
	{
		id: "tpm",
		name: "Atlas program lead",
		shortName: "AP",
		mission:
			"Keep the ERP modernization decision-ready, current, and moving without masking delivery risk.",
		owner: "Root Admin",
		status: "Active",
		version: "Agent v1",
		health: "Healthy",
		currentWork: "Preparing the first steering brief",
		runState: "Waiting for input",
		latestOutcome: "The critical dependency path is current",
		outcomeDetail:
			"Agentix reconciled Jira, the approved milestone plan, and architecture decisions. Three risks need an owner decision before Friday.",
		outcomeMetric: "3",
		outcomeMetricLabel: "decisions needed",
		nextDuty: "Risk refresh · tomorrow at 8:00 AM",
		duties: [
			{
				id: "risk-refresh",
				name: "Risk and dependency refresh",
				description: "Reconcile milestones, blockers, dependencies, and material changes.",
				cadence: "Weekdays · 8:00 AM ET",
				nextRun: "Tomorrow · 8:00 AM",
				status: "Active",
				authority: "Automatic within bounds",
			},
			{
				id: "steering-brief",
				name: "Steering brief",
				description: "Publish a decision-ready brief grounded in approved program sources.",
				cadence: "Thursdays · 3:00 PM ET",
				nextRun: "Thursday · 3:00 PM",
				status: "Active",
				authority: "Approval at threshold",
			},
			{
				id: "owner-followup",
				name: "Overdue action follow-up",
				description: "Prompt pre-authorized project owners when commitments become stale.",
				cadence: "After 2 business days",
				nextRun: "Watching continuously",
				status: "Active",
				authority: "Automatic within bounds",
			},
		],
		activity: [
			{
				id: "tpm-read",
				title: "Read authorized program context",
				summary: "5 sources read · 21 relevant memory items",
				time: "9:02 AM",
				status: "complete",
				detail:
					"Read the approved program brief, milestone plan, Jira project, architecture decisions, and project Teams channel. No unapproved source was accessed.",
				evidence: "Source coverage",
			},
			{
				id: "tpm-map",
				title: "Reconcile dependency and risk map",
				summary: "17 dependencies · 6 risks · 2 freshness conflicts resolved",
				time: "9:04 AM",
				status: "verified",
				detail:
					"Matched each dependency to its current owner and milestone. Two stale dates were retained as exceptions rather than silently overwritten.",
				evidence: "View diff and citations",
			},
			{
				id: "tpm-brief",
				title: "Prepare steering brief",
				summary: "Drafting decisions, options, and seven-day outlook",
				time: "Now",
				status: "waiting",
				detail:
					"The brief is ready except for the executive-audience decision requested in the conversation.",
			},
		],
		messages: [
			{
				id: "tpm-m1",
				author: "Agentix",
				text: "I reconciled the approved program sources. The vendor integration sits on the critical path, and three decisions need owners before Friday.",
				time: "9:05 AM",
			},
			{
				id: "tpm-m2",
				author: "Agentix",
				text: "Before I publish the steering brief: should overdue reminders include the executive sponsor, or stay with the project team? This changes the authorized audience.",
				time: "9:06 AM",
				tone: "question",
			},
		],
		connections: [
			{ name: "Jira", principal: "Root Admin", capability: "Read project · update issues", state: "Healthy" },
			{ name: "Microsoft Teams", principal: "Root Admin", capability: "Project channel only", state: "Restricted" },
			{ name: "Microsoft 365", principal: "Root Admin", capability: "Draft and send to project team", state: "Healthy" },
			{ name: "SharePoint", principal: "Root Admin", capability: "Approved program library", state: "Healthy" },
		],
		artifacts: [
			{ id: "dependency-map", name: "Dependency and risk map", type: "Live register", freshness: "Updated 4 min ago", verification: "17 cited records" },
			{ id: "steering-brief", name: "ERP steering brief", type: "Draft brief", freshness: "Updated now", verification: "12 cited claims" },
			{ id: "decision-log", name: "Decision and action register", type: "Governance register", freshness: "Updated 3 min ago", verification: "Source reconciled" },
		],
		sources: [
			{ name: "ERP program brief", detail: "SharePoint · approved source", freshness: "Current" },
			{ name: "ERP modernization", detail: "Jira project · 186 issues", freshness: "Read 4 min ago" },
			{ name: "Architecture decisions", detail: "12 signed ADRs", freshness: "Read 5 min ago" },
			{ name: "Program delivery memory", detail: "Tenant memory · scoped to Atlas", freshness: "21 items used" },
		],
	},
	{
		id: "revenue",
		name: "Revenue operations partner",
		shortName: "RO",
		mission: "Keep renewal risk current and make sure account owners act before revenue slips.",
		owner: "Aisha Rahman",
		status: "Active",
		version: "Agent v3",
		health: "Healthy",
		currentWork: "Weekday renewal watch · occurrence 37",
		runState: "Working",
		latestOutcome: "14 renewal records are current",
		outcomeDetail:
			"Four high-ARR renewals are held for approval. Teams and owner email follow-through will continue after the exact record set is decided.",
		outcomeMetric: "$842k",
		outcomeMetricLabel: "ARR reviewed",
		nextDuty: "Renewal watch · tomorrow at 8:00 AM",
		duties: [
			{
				id: "renewal-watch",
				name: "Renewal risk watch",
				description: "Find closing renewals with no activity for 14 days and coordinate follow-through.",
				cadence: "Weekdays · 8:00 AM ET",
				nextRun: "Tomorrow · 8:00 AM",
				status: "Active",
				authority: "Approval at threshold",
			},
			{
				id: "pipeline-hygiene",
				name: "Pipeline hygiene",
				description: "Resolve stale next steps and missing renewal owners inside bounded fields.",
				cadence: "Mondays · 9:00 AM ET",
				nextRun: "Monday · 9:00 AM",
				status: "Active",
				authority: "Automatic within bounds",
			},
		],
		activity: [
			{
				id: "rev-read",
				title: "Read renewal candidates",
				summary: "18 candidates across 11 account owners",
				time: "8:00 AM",
				status: "complete",
				detail: "Read only opportunities closing within 30 days and evaluated the activated 14-day inactivity rule.",
				evidence: "Salesforce query receipt",
			},
			{
				id: "rev-auto",
				title: "Apply bounded Salesforce updates",
				summary: "14 automatic · 4 held at ARR threshold",
				time: "8:03 AM",
				status: "verified",
				detail:
					"Set Renewal attention to Required on 14 records. Four records exceeded the activated $100,000 threshold and were not changed.",
				evidence: "14 provider read-backs",
			},
			{
				id: "rev-notify",
				title: "Coordinate account follow-through",
				summary: "Preparing Teams summary and owner emails",
				time: "Now",
				status: "working",
				detail: "Recipients are restricted to the pre-authorized Revenue Operations channel and current account owners.",
			},
		],
		messages: [
			{
				id: "rev-m1",
				author: "Agentix",
				text: "I found 18 renewal opportunities needing attention. Four exceed the $100,000 approval threshold; I updated the other 14 and verified each provider result.",
				time: "8:04 AM",
			},
		],
		connections: [
			{ name: "Salesforce", principal: "Aisha Rahman", capability: "Renewal fields · 25-record ceiling", state: "Restricted" },
			{ name: "Microsoft Teams", principal: "Aisha Rahman", capability: "Revenue Operations channel", state: "Healthy" },
			{ name: "Microsoft 365", principal: "Aisha Rahman", capability: "Current account owners", state: "Healthy" },
		],
		artifacts: [
			{ id: "renewal-brief", name: "Renewal attention brief", type: "Operational brief", freshness: "Updated now", verification: "18 records reconciled" },
			{ id: "renewal-receipts", name: "Salesforce effect receipts", type: "Evidence bundle", freshness: "Updated 2 min ago", verification: "14 confirmed" },
		],
		sources: [
			{ name: "Renewal opportunity view", detail: "Salesforce · activated field scope", freshness: "Read now" },
			{ name: "Revenue policy", detail: "Tenant policy v8", freshness: "Current" },
			{ name: "Account ownership", detail: "Salesforce account team", freshness: "Read now" },
		],
	},
	{
		id: "finance",
		name: "Finance close operator",
		shortName: "FC",
		mission: "Complete the monthly close with deterministic controls, exact approvals, and reconciled evidence.",
		owner: "Elena Torres",
		status: "Active",
		version: "Agent v2",
		health: "Needs owner action",
		currentWork: "July sandbox close",
		runState: "Waiting for approval",
		latestOutcome: "Journal and inventory are validated",
		outcomeDetail:
			"126 journal lines balance and 38 inventory adjustments passed controls. Posting is paused on one exact aggregate approval.",
		outcomeMetric: "$184k",
		outcomeMetricLabel: "effects awaiting approval",
		nextDuty: "Close readiness · July 31 at 6:00 PM",
		needsAttention: "Approve the exact journal and inventory effect set",
		duties: [
			{
				id: "close-readiness",
				name: "Month-end close readiness",
				description: "Validate journals, accounts, inventory evidence, and exception owners.",
				cadence: "Last business day · 6:00 PM ET",
				nextRun: "July 31 · 6:00 PM",
				status: "Active",
				authority: "Approval at threshold",
			},
		],
		activity: [
			{
				id: "fin-validate",
				title: "Validate close inputs",
				summary: "126 journal lines · 38 inventory adjustments",
				time: "5:42 PM",
				status: "verified",
				detail: "Balanced debits and credits, validated account mapping, and reconciled inventory quantities to the warehouse snapshot.",
				evidence: "Validator report",
			},
			{
				id: "fin-model",
				title: "Build management financial model",
				summary: "Fixed-function workbook · 7 material variances",
				time: "5:47 PM",
				status: "complete",
				detail: "Generated the approved close workbook with formula provenance, input hashes, and an immutable output checksum.",
				evidence: "Open workbook preview",
			},
			{
				id: "fin-wait",
				title: "Wait for aggregate approval",
				summary: "QuickBooks + SAP · exact effect set",
				time: "Now",
				status: "waiting",
				detail: "No provider write has occurred. Approval is bound to the exact journal lines, inventory adjustments, principals, and source versions.",
			},
		],
		messages: [
			{
				id: "fin-m1",
				author: "Agentix",
				text: "Validation is complete. The journal balances, the financial model is ready, and 38 inventory adjustments reconcile. I have not posted anything because the aggregate effect requires your approval.",
				time: "5:48 PM",
			},
		],
		connections: [
			{ name: "QuickBooks", principal: "Elena Torres", capability: "Sandbox journal batch", state: "Healthy" },
			{ name: "SAP", principal: "Finance shared service", capability: "Two cost centers · bounded inventory", state: "Restricted" },
			{ name: "Microsoft 365", principal: "Elena Torres", capability: "Controller + Finance Operations", state: "Healthy" },
		],
		artifacts: [
			{ id: "close-model", name: "July management model", type: "Verified workbook", freshness: "Updated 3 min ago", verification: "SHA-256 anchored" },
			{ id: "journal-pack", name: "Journal validation pack", type: "Evidence bundle", freshness: "Updated 5 min ago", verification: "126 lines balanced" },
			{ id: "inventory-pack", name: "Inventory reconciliation", type: "Reconciliation report", freshness: "Updated 5 min ago", verification: "38 adjustments validated" },
		],
		sources: [
			{ name: "July journal batch", detail: "QuickBooks sandbox · 126 lines", freshness: "Read 8 min ago" },
			{ name: "Inventory snapshot", detail: "SAP · warehouse valuation", freshness: "Read 7 min ago" },
			{ name: "Finance close policy", detail: "Tenant policy v12", freshness: "Current" },
		],
	},
]

export const WORK_ITEMS = [
	{ id: "w1", agentId: "revenue", title: "Weekday renewal watch", state: "Working", detail: "14 verified · 4 awaiting approval", time: "Started 8:00 AM" },
	{ id: "w2", agentId: "finance", title: "July sandbox close", state: "Waiting for approval", detail: "No provider writes dispatched", time: "Started 5:38 PM" },
	{ id: "w3", agentId: "tpm", title: "First steering brief", state: "Waiting for input", detail: "Executive audience needs owner decision", time: "Started 9:02 AM" },
	{ id: "w4", agentId: "tpm", title: "Dependency refresh · occurrence 12", state: "Completed", detail: "17 dependencies reconciled", time: "Yesterday" },
] as const
