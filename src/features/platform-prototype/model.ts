export type MaxionModuleId =
	| "dashboard"
	| "projects"
	| "discovery"
	| "plan"
	| "execute"
	| "agentix"
	| "consult"
	| "settings"
	| "integrations"
	| "approvals"
	| "usage"
	| "help"

export type PortalProject = {
	id: string
	name: string
	description: string
	status: "active" | "archived"
	role: "Owner" | "Member" | "Viewer"
	updated: string
	plan?: string
	discovery?: string
	members: Array<{ initials: string; name: string }>
}

export type ExecuteLaunchIntent = {
	source: "prompt" | "plan"
	title: string
	brief: string
	autoStart: boolean
}

export const INITIAL_PROJECTS: PortalProject[] = [
	{
		id: "erp-modernization",
		name: "ERP modernization",
		description: "Modernize finance operations across SAP, QuickBooks, Salesforce, and ServiceNow.",
		status: "active",
		role: "Owner",
		updated: "12 minutes ago",
		plan: "ERP modernization delivery plan",
		discovery: "Third-party onboarding control redesign",
		members: [
			{ initials: "RA", name: "Root Admin" },
			{ initials: "AR", name: "Andre Reyes" },
			{ initials: "SL", name: "Sarah Liu" },
		],
	},
	{
		id: "northbridge",
		name: "NorthBridge acquisition",
		description: "Operating diligence and 100-day value-creation planning for NorthBridge Analytics.",
		status: "active",
		role: "Member",
		updated: "Yesterday",
		plan: "NorthBridge 100-day plan",
		discovery: "NorthBridge acquisition diligence",
		members: [
			{ initials: "EP", name: "Elena Park" },
			{ initials: "MR", name: "Marcus Reed" },
		],
	},
	{
		id: "customer-360",
		name: "Customer 360",
		description: "Unify account, support, and adoption data into an owned customer intelligence model.",
		status: "active",
		role: "Viewer",
		updated: "4 days ago",
		plan: "Customer data foundation",
		members: [
			{ initials: "JT", name: "Jordan Taylor" },
			{ initials: "KM", name: "Kai Morgan" },
		],
	},
	{
		id: "pricing-transformation",
		name: "Pricing transformation",
		description: "Completed pricing governance and commercial operating-model redesign.",
		status: "archived",
		role: "Owner",
		updated: "Jun 18",
		plan: "Pricing transformation roadmap",
		discovery: "Pricing transformation",
		members: [{ initials: "RA", name: "Root Admin" }],
	},
]

export const PLAN_WORKSTREAMS = [
	{ id: "foundation", name: "Mission authority foundation", owner: "Platform architecture", items: 18, status: "Ready", confidence: 94 },
	{ id: "integration", name: "ServiceNow and controls integration", owner: "Enterprise integration", items: 24, status: "In review", confidence: 87 },
	{ id: "controls", name: "Financial control migration", owner: "Finance operations", items: 16, status: "Ready", confidence: 91 },
	{ id: "adoption", name: "Operating model and adoption", owner: "Transformation office", items: 12, status: "Needs owner", confidence: 76 },
] as const

export const EXECUTE_TASKS = [
	{ id: "authority", title: "Build mission authority API", status: "Working", detail: "Implement typed policy and approval boundaries", files: 7 },
	{ id: "adapter", title: "Add ServiceNow event adapter", status: "Queued", detail: "Map approved financial-change events", files: 5 },
	{ id: "reconcile", title: "Implement durable reconciliation", status: "Queued", detail: "Detect and repair cross-system drift", files: 9 },
	{ id: "replay", title: "Prove tenant-safe replay", status: "Queued", detail: "Exercise hostile retries and duplicate-effect prevention", files: 6 },
	{ id: "evidence", title: "Prepare release evidence", status: "Queued", detail: "Assemble audit, rollback, and release-owner evidence", files: 8 },
] as const
