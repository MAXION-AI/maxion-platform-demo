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

// Workspace units are one number with one denominator. The sidebar meter, the dashboard
// stat, and the Usage page all read this — a meter that disagrees with its own rows is the
// fastest way to lose a viewer's trust in everything else on the surface.
const WORKSPACE_USAGE_ROWS = [
	{ module: "Discovery", units: 12_480 },
	{ module: "Plan", units: 8_140 },
	{ module: "Execute", units: 14_620 },
	{ module: "Agentix", units: 6_320 },
] as const

export const WORKSPACE_UNIT_CAP = 108_000
export const WORKSPACE_UNITS_USED = WORKSPACE_USAGE_ROWS.reduce((sum, row) => sum + row.units, 0)
export const WORKSPACE_UNITS_PERCENT = Math.round((WORKSPACE_UNITS_USED / WORKSPACE_UNIT_CAP) * 100)
export const workspaceUnitsLabel = (units: number) => units.toLocaleString("en-US")
// The cycle closes with the calendar month, so the reset never drifts into the past.
export const WORKSPACE_CYCLE_RESET = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
	.format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
