import type { WorkflowId } from "../initiatives"
import type { ArtifactKind, DecisionKind, StepKind } from "./types"

/*
 * The showcase engagements as typed, scripted scenarios. Every name, count
 * and figure here is synthetic. The engine reads these definitions; it never
 * branches on a scenario by name except through the hooks they declare.
 */

export interface Specialist {
	id: string
	name: string
	duty: string
	tools: string
	scope: string
	accountable?: boolean
	/* The package that adds this duty to the engagement; absent for founding duties. */
	package?: string
}

export type Capability = "read" | "build" | "production" | "update" | "notify"
export interface SystemLink { id: string; name: string; capability: Capability; access: string; detail: string; package?: string }

export interface StepTemplate {
	id: string
	title: string
	owner: string
	kind: StepKind
	/* Steps sharing a group run in parallel; the item moves on when all of them are done. */
	group?: string
	ticks?: number
	doing: string
	done: string
	tools?: string[]
	evidence?: string[]
	artifact?: string
	decision?: string
	obligation?: string
	system?: string
	/* A release step that has to wait for another item's release to be applied. */
	after?: { template: string; step: string }
}

export interface WorkTemplate { id: string; kind: "case" | "cycle" | "milestone"; steps: StepTemplate[]; obligations: { id: string; label: string; evidence: string }[] }

export interface CheckSpec { id: string; label: string; scope: string; dependsOn?: string }
export interface AmendmentSpec { id: string; pattern: RegExp; label: string; variant: string; summary: string; changes: string[] }
export interface ArtifactSpec {
	key: string
	kind: ArtifactKind
	title: string
	owner: string
	checks: CheckSpec[]
	dependsOn: string[]
	variant: string[]
	summary: string
	changes: string[]
	/* A failing check names what went wrong for this variant, or null when it passes. */
	fails?: (variant: string[], check: string) => string | null
	/* How a failed check is repaired: the variant the fix adds, and the one it supersedes. */
	repair?: Record<string, { variant: string; replaces?: string; summary: string; change: string }>
	amendments: AmendmentSpec[]
	release?: { target: string; authority: "policy" | "approval" | "answer"; policy?: string; changes: (version: number, variant: string[]) => string[]; impact: string; recovery: string }
}

export interface DecisionOption { id: string; label: string; primary?: boolean; consequence: string; outcome: "approve" | "decline" | "variant" | "release" | "release-window" | "keep-in-test"; variant?: { add: string; remove?: string; summary: string } }
export interface DecisionTemplate {
	id: string
	kind: DecisionKind
	title: string
	detail: string
	facts: { label: string; value: string }[]
	options: DecisionOption[]
	/* The artifact the decision sits beside; a decision with one binds to its current version. */
	artifact?: string
	/* What a decision without an artifact is bound to, after the work item's reference. */
	binding?: string
	boundary?: string
}

export interface Question { id: string; label: string; detail: string; options: { id: string; label: string; recommended?: boolean; effect: string }[] }
export interface PackageSpec {
	id: string
	version: number
	title: string
	kind: "new" | "expansion"
	summary: string
	outcome: string
	evidence: { title: string; detail: string }[]
	criteria: { id: string; label: string; duty: string; verify: string }[]
	limitations: string[]
	inScope: string[]
	outScope: string[]
	questions: Question[]
	milestones: { template: string; reference: string; title: string; dependsOn?: { reference: string; step?: string }[] }[]
	needs: string[]
	/* An expansion only offered when the brief asks for this kind of work. Absent means always. */
	offeredWhen?: RegExp
}

export interface Assignment { id: string; pattern: RegExp; template: string; title: (text: string) => string; owner: string }

/*
 * What a verified delivery produces, in this engagement's own words: the evidence a verified
 * pipeline or cycle records, what the runbook follows, and the daily operation it moves into.
 * A scenario without one produces no evidence artifact and never takes on a schedule.
 */
export interface DeliverySpec {
	evidence: {
		/* The evidence version's summary: the first production run, then one per cycle. */
		summary: (day: string, reference: string, first: boolean) => string
		/* The activity line recorded with it. */
		text: (version: number, basis: string, day: string) => string
		operations: string[]
	}
	/* How the runbook names the thing it follows: "revenue dashboard v3". */
	dashboardNoun: string
	/* The recurring operation, the hour it runs at, and the zone that hour is stated in. */
	cycle: { noun: string; hour: number; zone?: string }
	/* What a read-back finds after an uncertain pipeline release, in this engagement's own terms. */
	releaseReadBack: { reference: string; found: string }
}

/* ---- What the result previews show, per scenario -------------------------- */
/*
 * The previews in Results are the beat the demo builds to, so their content is scenario data,
 * not component code. Every string a customer reads there comes from here.
 */
export type MappingRow = { source: string; target: string; rule: (variant: string[]) => string; approved: boolean }

export interface PreviewSpec {
	mapping: {
		/* "18 billing fields map to the AWS revenue schema." */
		lede: (rows: number, hasUnapproved: boolean) => string
		sourceHeader: string
		targetHeader: string
		rows: MappingRow[]
		/* The row the milestone decision is about: flagged until the owner decides. */
		decisionTarget: string
		/* The variant prefix that decision writes, so the row stops being flagged once it is answered. */
		decisionPrefix: string
		/* The three rows the compact card shows beside that decision. */
		compactTargets: string[]
		technical: (version: number, variant: string[], rows: MappingRow[]) => string
	}
	pipeline: {
		lede: (variant: string[]) => string
		stages: Array<{ name: string; detail: string }>
		rows: (variant: string[]) => Array<{ label: string; value: string }>
		technical: (version: number, variant: string[]) => string
	}
	reconciliation: {
		lede: (summary: string) => string
		columns: [string, string, string, string]
		totalLabel: string
		/* Money for one engagement, case counts for another: each scenario says how to read its numbers. */
		format: (value: number) => string
		rows: Array<{ name: string; value: number }>
		total: number
		/* An optional extra row the milestone decision can remove, with its footnote. */
		optionalRow?: { name: string; value: number; removedBy: string; footnote: (value: string) => string }
		exceptionsTitle: string
		emptyLabel: string
	}
	dashboard: {
		/* "Revenue", "AP exceptions", "Orders" — what the header and the chart are about. */
		subject: string
		chartLabel: string
		format: (value: number) => string
		tiles: (context: { exceptions: number; loaded: string }) => Array<{ label: string; value: string; note: string }>
		rows: Array<{ name: string; value: number; children?: Array<[string, number]> }>
		/* The amendment variant that turns the rows into openable groups, and what it adds. */
		drillVariant: string
		drillNote: string
		childrenLabel: (row: string) => string
		optionalRow?: { name: string; value: number; removedBy: string; footnote: (value: string) => string }
	}
	runbook: {
		lede: string
		daily: (drill: boolean) => string
		verified: string
		needsPerson: (release: string) => string
		recovery: string
	}
	/* What the header calls the synthetic day before anything is in production. */
	sampleDay: string
	/* How the preview labels unreleased data, and the variant that trims it to agreed rows. */
	testDataLabel: string
	approvedOnlyVariant: string
	/* Variant slugs a customer would otherwise see raw in a version comparison. */
	variantText?: Record<string, string>
}

/*
 * The change window a held release goes out in. `weekday` is 0=Sunday..6=Saturday, matching
 * londonParts(). The label is what every surface says, so the words and the schedule cannot drift.
 */
export interface ReleaseWindow { label: string; weekday: number; hour: number }

export interface Scenario {
	id: WorkflowId
	name: string
	title: string
	category: string
	description: string
	outcome: string
	owner: string
	trigger: string
	boundary: string
	teamReason: string
	team: Specialist[]
	systems: SystemLink[]
	templates: Record<string, WorkTemplate>
	artifacts: Record<string, ArtifactSpec>
	decisions: Record<string, DecisionTemplate>
	packages: PackageSpec[]
	assignments: Assignment[]
	/* What this engagement's cases are called on screen: "Exception cases", "Joiners", "Incidents". */
	caseLabel: string
	/* Terms that route a written brief here. Longer terms win, so overlaps resolve by specificity. */
	match: string[]
	/* The template an incoming event or assignment starts from. */
	caseTemplate: string
	cycleTemplate?: string
	delivery?: DeliverySpec
	/* Absent means the product default, Saturday 02:00 London. */
	releaseWindow?: ReleaseWindow
	/* What Results shows for this engagement. Absent means the previews have nothing to draw. */
	preview?: PreviewSpec
	incoming: string[]
	prefix: string
	examples: { brief: string; detail: string; assignment: string }
}

const notify = (owner: string, doing: string, done: string, system = "Microsoft Teams"): StepTemplate => ({ id: "notify", title: "Notify the approved audience", owner, kind: "notify", doing, done, system, obligation: "notified", tools: [`${system} · post to approved channel`] })

/* ---- Revenue reconciliation (the flagship; evolved from invoice exceptions) ---- */
/* Synthetic figures that add up: regions and countries sum to the company total. */
const REGIONS = [
	{ region: "AMER", ledger: 588409.12, countries: [["United States", 412337.1], ["Canada", 101982.44], ["Brazil", 74089.58]] as [string, number][] },
	{ region: "EMEA", ledger: 497215.33, countries: [["United Kingdom", 231904.51], ["Germany", 158322.07], ["France", 106988.75]] as [string, number][] },
	{ region: "APAC", ledger: 157477.37, countries: [["Japan", 71260.14], ["Australia", 55810.92], ["Singapore", 30406.31]] as [string, number][] },
]
/* Money as every preview shows it. */
const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" })
/* Counts as the case and order previews show them. */
const count = (value: number) => value.toLocaleString("en-US")

export const REVENUE_FIGURES = {
	// The synthetic test data is a 30-day sample; its last day is the one tests replay and preview.
	day: "Sample day 30",
	ledgerTotal: 1284310.42,
	regions: REGIONS,
	sampleInvoices: 4812,
	// Over the 30-day sample: 212 invoices without a region, 3.2% of its revenue.
	missingRegion: 212,
	missingRegionSampleValue: 1236258.92,
	// On one day: the part of the company total with no region, shown as Unassigned.
	missingRegionValue: 41208.6,
	fxRows: 14,
	fxDelta: 126.24,
}

const revenue: Scenario = {
	id: "invoice",
	name: "Revenue reconciliation",
	title: "Revenue reconciliation & data engineering",
	category: "Finance · Data engineering",
	description: "Reconcile billing and revenue every day, resolve exceptions within policy, and keep a verified dashboard finance can use.",
	outcome: "Daily revenue reconciled between the on-prem billing ledger and the AWS revenue schema, exceptions resolved within policy, and a verified dashboard finance can use.",
	owner: "Revenue operations owner",
	trigger: "Daily 06:00 London · plus ERP exception events",
	boundary: "May read the billing ledger, build and test changes in an isolated environment, release tested versions under policy and record approved exception resolutions. A variance above $200 needs the revenue owner. No ledger edits, payment release or customer messages.",
	teamReason: "Building a pipeline, validating a dashboard and investigating exceptions need different tools and permissions. The coordinator owns decisions, releases and the only ERP write, so no specialist can change production on its own.",
	team: [
		{ id: "coordinator", name: "Revenue coordinator", accountable: true, duty: "Owns each outcome, the decisions, production releases and the single ERP write-back.", tools: "ERP exception update · release adapter · Teams finance channel", scope: "Cannot edit the billing ledger, release payments or message customers." },
		{ id: "analyst", name: "Reconciliation analyst", duty: "Investigates invoice, receipt and ledger evidence and prepares exception decisions.", tools: "ERP, receiving and billing ledger · read only", scope: "Read only. Prepares decisions; never posts them." },
		{ id: "data", name: "Data specialist", package: "pkg_revenue_v2", duty: "Maps billing fields, then builds and tests the ingestion and transformation pipeline in isolation.", tools: "SQL Server billing ledger · read only (existing gateway) · isolated AWS test workspace · private change set", scope: "No production credentials. Test data is synthetic and redacted." },
		{ id: "dashboard", name: "Dashboard specialist", package: "pkg_revenue_v2", duty: "Builds and validates the revenue dashboard on the validated schema.", tools: "Dashboard authoring · reconciled schema read only", scope: "Publishes only through the coordinator's release." },
	],
	systems: [
		{ id: "ledger", name: "SQL Server billing ledger", capability: "read", access: "Read only · existing secure gateway", detail: "dbo.Invoices, dbo.InvoiceLines, dbo.Credits, dbo.FxRates", package: "pkg_revenue_v2" },
		{ id: "sandbox", name: "AWS test workspace", capability: "build", access: "Build and test · isolated", detail: "Disposable runs, synthetic 30-day sample, no production credentials", package: "pkg_revenue_v2" },
		{ id: "schema", name: "AWS PostgreSQL revenue schema", capability: "production", access: "Release adapter · per release policy", detail: "Production target; migrations and the nightly load job", package: "pkg_revenue_v2" },
		{ id: "dash", name: "Finance workspace dashboards", capability: "production", access: "Publish · preauthorized for the finance group", detail: "Policy FIN-DASH-2", package: "pkg_revenue_v2" },
		{ id: "erp", name: "ERP accounts payable", capability: "update", access: "One governed update per exception", detail: "Exception status and resolution note" },
		{ id: "teams", name: "Microsoft Teams", capability: "notify", access: "Notification only", detail: "Finance channel and the AP owner" },
	],
	templates: {
		exception: {
			id: "exception", kind: "case",
			obligations: [
				{ id: "decision", label: "Decision bound to this invoice version", evidence: "Decision record" },
				{ id: "recorded", label: "Resolution recorded in ERP", evidence: "ERP read-back" },
				{ id: "notified", label: "AP owner notified", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "open", title: "Open the exception", owner: "coordinator", kind: "read", doing: "Opening the exception with invoice v2 and its purchase order", done: "Bound invoice v2, PO-7204 and AP policy v5", system: "ERP", tools: ["ERP · read exception and invoice v2", "AP policy v5 · read"] },
				{ id: "investigate", title: "Investigate invoice and receipt evidence", owner: "analyst", kind: "analyze", ticks: 2, doing: "Checking invoice arithmetic against receiving evidence", done: "Quantities reconcile; price variance isolated", system: "ERP + Receiving", tools: ["Invoice and PO lines · read only", "Goods receipts · read only"] },
				{ id: "decide", title: "Obtain the exact financial decision", owner: "owner", kind: "decision", decision: "variance", doing: "Waiting for the revenue owner's decision", done: "Decision recorded", obligation: "decision" },
				{ id: "record", title: "Record the resolution in ERP", owner: "coordinator", kind: "write", doing: "Recording the approved resolution in ERP", done: "Resolution recorded; one write", system: "ERP", obligation: "recorded", tools: ["ERP · update exception status (one governed write)"] },
				{ id: "verify", title: "Read back the ERP record", owner: "coordinator", kind: "verify", ticks: 2, doing: "Reading back the exception status", done: "ERP read-back matches the resolution", system: "ERP", tools: ["ERP · read back exception"] },
				notify("coordinator", "Sending the decision packet to the AP owner", "AP owner notified; acceptance receipt kept"),
			],
		},
		mapping: {
			id: "mapping", kind: "milestone",
			obligations: [
				{ id: "mapped", label: "Every approved field has a target and a rule", evidence: "Mapping version" },
				{ id: "tested", label: "Mapping rules pass isolated checks", evidence: "Check results" },
			],
			steps: [
				{ id: "catalog", title: "Read the source schema", owner: "data", kind: "read", doing: "Reading the billing ledger schema through the existing gateway", done: "Read 4 tables and 31 columns, read only", system: "SQL Server", tools: ["SQL Server · INFORMATION_SCHEMA.COLUMNS (read only)", "Gateway session gw-114 · no write grants"] },
				{ id: "profile", title: "Profile the data and draft the mapping", owner: "data", kind: "build", ticks: 2, artifact: "mapping", doing: "Profiling 30 days of invoices against the target model", done: "Profiled 4,812 invoices; drafted mapping v1", system: "AWS test workspace", tools: ["Isolated run · profile 4,812 synthetic invoices", "Null and cardinality scan · 31 columns"] },
				{ id: "region", title: "Resolve missing region codes", owner: "owner", kind: "decision", decision: "region", doing: "Waiting for your decision on missing region codes", done: "Region rule decided" },
				{ id: "test", title: "Test the mapping rules", owner: "data", kind: "test", artifact: "mapping", doing: "Testing mapping rules in the isolated workspace", done: "Mapping checks passed", obligation: "tested", system: "AWS test workspace" },
				{ id: "publish", title: "Publish the mapping for the build", owner: "coordinator", kind: "verify", doing: "Publishing the tested mapping to the pipeline build", done: "Mapping published for the build", obligation: "mapped" },
			],
		},
		pipeline: {
			id: "pipeline", kind: "milestone",
			obligations: [
				{ id: "tested", label: "Pipeline passes every isolated check", evidence: "Check results bound to the version" },
				{ id: "released", label: "Tested version released to the revenue schema", evidence: "Release record and read-back" },
				{ id: "loaded", label: "First production load matches the ledger", evidence: "Reconciliation read-back" },
			],
			steps: [
				{ id: "build", title: "Build the pipeline", owner: "data", kind: "build", ticks: 2, artifact: "pipeline", doing: "Building the landing, transformation and load from the mapping", done: "Built pipeline v1", system: "AWS test workspace", tools: ["Change set cs-218 · 6 files (private)", "Glue job definition · isolated workspace"] },
				{ id: "test", title: "Test in isolation", owner: "data", kind: "test", ticks: 2, artifact: "pipeline", doing: "Running the pipeline against the synthetic 30-day sample", done: "Pipeline checks passed", obligation: "tested", system: "AWS test workspace" },
				{ id: "release", title: "Release to the revenue schema", owner: "coordinator", kind: "release", artifact: "pipeline", doing: "Releasing the tested version to the revenue schema", done: "Release applied", obligation: "released", system: "AWS PostgreSQL" },
				{ id: "verify", title: "Verify the first production load", owner: "coordinator", kind: "verify", ticks: 2, doing: "Comparing the first production load with the ledger", done: "Production totals match the ledger", obligation: "loaded", system: "AWS PostgreSQL + SQL Server", tools: ["Read back revenue.region_totals", "Ledger totals · read only"] },
			],
		},
		dashboard: {
			id: "dashboard", kind: "milestone",
			obligations: [
				{ id: "tested", label: "Dashboard tiles match reconciled totals in test", evidence: "Check results bound to the version" },
				{ id: "released", label: "Published to the finance group", evidence: "Release record" },
				{ id: "verified", label: "Production tiles match the reconciled totals", evidence: "Tile read-back" },
			],
			steps: [
				{ id: "build", title: "Build the dashboard", owner: "dashboard", kind: "build", ticks: 2, artifact: "dashboard", doing: "Building revenue tiles and the regional view on the validated schema", done: "Built dashboard v1", system: "Dashboards", tools: ["Dataset · revenue.region_totals (test schema)", "Dashboard draft · finance workspace sandbox"] },
				{ id: "test", title: "Test against reconciled totals", owner: "dashboard", kind: "test", artifact: "dashboard", doing: "Checking tiles against the reconciled test totals", done: "Dashboard checks passed", obligation: "tested", system: "Dashboards" },
				{ id: "release", title: "Publish to the finance group", owner: "coordinator", kind: "release", artifact: "dashboard", after: { template: "pipeline", step: "release" }, doing: "Publishing the tested dashboard", done: "Dashboard published", obligation: "released", system: "Dashboards" },
				{ id: "verify", title: "Verify production tiles", owner: "dashboard", kind: "verify", ticks: 2, doing: "Reading back production tiles against the reconciled totals", done: "Production tiles match the reconciled totals", obligation: "verified", system: "Dashboards" },
			],
		},
		cycle: {
			id: "cycle", kind: "cycle",
			obligations: [
				{ id: "loaded", label: "Yesterday's ledger loaded", evidence: "Load read-back" },
				{ id: "matched", label: "Totals agree within $50 per region", evidence: "Reconciliation read-back" },
				{ id: "fresh", label: "Dashboard refreshed by 07:00", evidence: "Refresh timestamp" },
				{ id: "notified", label: "Daily summary posted to finance", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "load", title: "Load yesterday's ledger", owner: "data", kind: "refresh", doing: "Loading yesterday's ledger through the released pipeline", done: "Ledger loaded", obligation: "loaded", system: "AWS PostgreSQL", tools: ["Nightly load job · pipeline in production", "Row count read-back"] },
				{ id: "reconcile", title: "Reconcile totals by region", owner: "analyst", kind: "analyze", ticks: 2, doing: "Reconciling ledger totals with the revenue schema by region", done: "Totals agree within tolerance", obligation: "matched", system: "SQL Server + AWS PostgreSQL", tools: ["Ledger totals · read only", "revenue.region_totals · read only"] },
				{ id: "refresh", title: "Refresh the dashboard", owner: "dashboard", kind: "refresh", doing: "Refreshing the dashboard with verified totals", done: "Dashboard refreshed", obligation: "fresh", system: "Dashboards" },
				notify("coordinator", "Posting the daily summary to the finance channel", "Daily summary posted; acceptance receipt kept"),
				{ id: "verify", title: "Verify the cycle", owner: "coordinator", kind: "verify", doing: "Checking every obligation for this cycle", done: "Cycle verified" },
			],
		},
		backfill: {
			id: "backfill", kind: "case",
			obligations: [
				{ id: "matched", label: "Credit notes matched to their invoices", evidence: "Match report" },
				{ id: "notified", label: "Result shared with the revenue owner", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "read", title: "Read the credit notes", owner: "analyst", kind: "read", doing: "Reading the credit notes for the period", done: "Read the credit notes, read only", system: "SQL Server", tools: ["dbo.Credits · read only"] },
				{ id: "match", title: "Match credits to invoices", owner: "analyst", kind: "analyze", ticks: 2, doing: "Matching each credit note to its original invoice", done: "Credits matched; unmatched ones listed", obligation: "matched" },
				notify("coordinator", "Sharing the match report with the revenue owner", "Match report shared"),
			],
		},
	},
	artifacts: {
		mapping: {
			key: "mapping", kind: "mapping", title: "Source-to-target mapping", owner: "data", dependsOn: [],
			variant: ["candidate-fields"], summary: "Drafted from 30 days of billing rows", changes: ["18 source fields mapped to the revenue schema", "2 fields requested in the finance interview kept to isolated tests (not on the approved list)"],
			checks: [
				{ id: "keys", label: "Invoice keys are unique", scope: "Isolated test · synthetic 30-day sample (4,812 invoices)" },
				{ id: "types", label: "Source and target types are compatible", scope: "Isolated test · schema only" },
				{ id: "required", label: "Required columns have values", scope: "Isolated test · synthetic 30-day sample (4,812 invoices)" },
				{ id: "region", label: "Missing regions follow the decided rule", scope: "Isolated test · 212 invoices without a region" },
			],
			fails: (variant, check) => check === "region" && !variant.some(v => v.startsWith("region-")) ? "No rule decided for 212 invoices without a region." : null,
			amendments: [
				{ id: "approved-fields", pattern: /(only|just)\b.*\bapproved\b.*\b(source )?(fields?|columns?)\b|approved (source )?(fields?|columns?) only|(drop|remove|exclude)\b.*\b(unapproved|not approved)\b/i, label: "Use only the approved source fields", variant: "approved-fields", summary: "Uses only the approved source fields", changes: ["Removes CustomerEmail and SalesRepNote", "Pipeline checks that read the mapping need a rerun"] },
			],
		},
		pipeline: {
			key: "pipeline", kind: "pipeline", title: "Ingestion and transformation pipeline", owner: "data", dependsOn: ["mapping"],
			variant: ["fx-invoice-date"], summary: "Landing, transformation and load built from the mapping", changes: ["Lands dbo.Invoices, dbo.Credits and dbo.FxRates in S3", "Transforms to revenue.daily_invoices and revenue.region_totals", "Registers a 05:30 London nightly load"],
			checks: [
				{ id: "rows", label: "Row counts match the ledger", scope: "Isolated test · synthetic 30-day sample (4,812 invoices)" },
				{ id: "totals", label: "Totals by region match the ledger", scope: "Isolated test · synthetic 30-day sample (4,812 invoices)" },
				{ id: "fx", label: "Currency conversion uses posting-date rates", scope: "Isolated test · 612 non-USD invoices" },
				{ id: "idempotent", label: "Re-running a day loads no duplicates", scope: "Isolated test · replay of sample day 30" },
				{ id: "credits", label: "Late credit notes adjust their original day", scope: "Isolated test · 37 late credits" },
				{ id: "schema", label: "Target tables match the mapping", scope: "Isolated test · schema only", dependsOn: "mapping" },
				{ id: "nulls", label: "Required columns have no nulls", scope: "Isolated test · synthetic 30-day sample (4,812 invoices)", dependsOn: "mapping" },
				{ id: "regions", label: "Missing regions follow the decided rule", scope: "Isolated test · 212 invoices without a region", dependsOn: "mapping" },
				{ id: "runtime", label: "Daily load finishes within 20 minutes", scope: "Isolated test · 6 min 12 s measured" },
			],
			fails: (variant, check) => variant.includes("fx-invoice-date") && check === "fx" ? `${REVENUE_FIGURES.fxRows} rows differ by $${REVENUE_FIGURES.fxDelta.toFixed(2)} in total: rates were looked up by invoice date, the ledger uses posting date.`
				: variant.includes("fx-invoice-date") && check === "totals" ? `EMEA and APAC differ from the ledger by $${REVENUE_FIGURES.fxDelta.toFixed(2)} in total (same ${REVENUE_FIGURES.fxRows} rows).`
				: null,
			repair: { fx: { variant: "fx-posting-date", replaces: "fx-invoice-date", summary: "Looks up exchange rates by posting date", change: "FX lookup joins dbo.FxRates on PostingDate instead of InvoiceDate" } },
			amendments: [],
			release: {
				target: "AWS PostgreSQL revenue schema · migration 0007 and the nightly load", authority: "answer",
				changes: version => [`Pipeline v${version}`, "Creates revenue.daily_invoices and revenue.region_totals", "Registers the 05:30 London nightly load"],
				impact: "Adds two tables and one scheduled job. No existing table changes. The dashboard reads the new tables after it is released.",
				recovery: "Tables can be dropped and the job disabled. Loaded rows can be deleted and reloaded, but anything a downstream reader already used can't be recalled. The ledger is never changed.",
			},
		},
		dashboard: {
			key: "dashboard", kind: "dashboard", title: "Revenue dashboard", owner: "dashboard", dependsOn: ["pipeline"],
			variant: [], summary: "Verified revenue by region with exceptions", changes: ["Tiles: revenue for the day, ledger variance, open exceptions", "Revenue by region", "Load time shown on the dashboard"],
			checks: [
				{ id: "tiles", label: "Tiles match reconciled totals", scope: "Test schema · synthetic sample day 30" },
				{ id: "sum", label: "Regions add up to the company total", scope: "Test schema · synthetic sample day 30" },
				{ id: "fresh", label: "The dashboard shows when it was loaded", scope: "Test schema" },
				{ id: "access", label: "Only the finance group can view it", scope: "Test workspace · access policy" },
				{ id: "drill", label: "Country drill-down adds up to its region", scope: "Test schema · synthetic sample day 30", dependsOn: "region-drilldown" },
			],
			amendments: [
				{ id: "region-drilldown", pattern: /\b(region(al)?)\b.*\b(drill|breakdown|break down)|\bdrill[- ]?down\b.*\bregion/i, label: "Add regional drill-down", variant: "region-drilldown", summary: "Adds drill-down from region to country", changes: ["Each region opens its countries", "New check: country totals add up to their region"] },
			],
			release: {
				target: "Finance workspace · Revenue dashboard", authority: "policy", policy: "Dashboard publishing to the finance group is preauthorized (policy FIN-DASH-2).",
				changes: (version, variant) => [`Dashboard v${version}`, ...variant.includes("region-drilldown") ? ["Adds drill-down from region to country"] : ["Revenue tiles, regional view and exceptions"]],
				impact: "Finance group viewers see this version. No data changes.",
				recovery: "The previous version can be republished. Anyone who viewed this version has already seen it.",
			},
		},
		reconciliation: { key: "reconciliation", kind: "reconciliation", title: "Reconciliation evidence", owner: "analyst", dependsOn: ["pipeline"], variant: [], summary: "Ledger and revenue schema compared by region", changes: [], checks: [], amendments: [] },
		runbook: { key: "runbook", kind: "runbook", title: "Operating runbook", owner: "coordinator", dependsOn: ["pipeline", "dashboard"], variant: [], summary: "How the daily operation runs, what is verified and what needs a person", changes: ["Daily schedule and its checks", "Decisions that need the revenue owner", "Recovery without repeating effects"], checks: [], amendments: [] },
	},
	decisions: {
		variance: {
			id: "variance", kind: "approval", title: "Approve the $240 price variance?", detail: "Outside automatic authority. Only this case waits; other work continues.", binding: "v2 · $240",
			facts: [{ label: "Record", value: "Invoice version 2" }, { label: "Receiving", value: "120 units matched" }, { label: "Decision", value: "$240 price variance outside policy" }],
			options: [
				{ id: "approve", label: "Approve $240 variance", primary: true, consequence: "Records the approved resolution in ERP. No payment release.", outcome: "approve" },
				{ id: "decline", label: "Decline", consequence: "The ERP exception stays open and this case closes as declined.", outcome: "decline" },
			],
			boundary: "No payment release or bank-detail changes.",
		},
		region: {
			id: "region", kind: "question", artifact: "mapping", title: "212 invoices have no region code. How should they appear?", detail: "Found while profiling. It's a business rule, so the data specialist won't choose it for you.",
			facts: [{ label: "Missing", value: "212 of 4,812 invoices (4.4%)" }, { label: "Value", value: "$1,236,258.92 over 30 days (3.2%)" }, { label: "Source", value: "dbo.Invoices.RegionCode is empty" }],
			options: [
				{ id: "unassigned", label: "Show them as Unassigned", primary: true, consequence: "They stay in company totals under an Unassigned region.", outcome: "variant", variant: { add: "region-unassigned", summary: "Missing regions shown as Unassigned" } },
				{ id: "exclude", label: "Leave them out of regional views", consequence: "Company totals keep them; regional views won't add up to the total.", outcome: "variant", variant: { add: "region-excluded", summary: "Missing regions left out of regional views" } },
			],
		},
		release: {
			id: "release", kind: "release", title: "Release pipeline to production?", detail: "Your release policy asks for approval before each pipeline release.",
			facts: [], artifact: "pipeline",
			options: [
				{ id: "approve", label: "Approve release", primary: true, consequence: "Released now through the release adapter.", outcome: "release" },
				{ id: "window", label: "Release in the Saturday 02:00 window", consequence: "Released in the agreed window.", outcome: "release-window" },
				{ id: "keep", label: "Keep in test", consequence: "Nothing is released. The tested version stays ready.", outcome: "keep-in-test" },
			],
		},
	},
	packages: [
		{
			id: "pkg_invoice_v1", version: 1, title: "Invoice exception resolution", kind: "new", summary: "Resolve three-way-match exceptions without losing financial control.",
			outcome: "An evidence-backed invoice exception decision, recorded in ERP.",
			evidence: [{ title: "AP exception sample · 24 cases", detail: "Illustrative invoice, PO and receiving records" }, { title: "AP control policy v5", detail: "Price variance approval retained; payment release excluded" }],
			criteria: [{ id: "decision", label: "Variances above $200 decided by the revenue owner", duty: "coordinator", verify: "Decision record bound to the invoice version" }],
			limitations: [], inScope: ["Invoice exceptions"], outScope: ["Payment release"], questions: [], milestones: [], needs: ["ERP exception update", "Teams notification"],
		},
		{
			id: "pkg_revenue_v2", version: 2, title: "Revenue data engineering", kind: "expansion",
			summary: "Move daily revenue from the on-prem billing ledger into the existing AWS data platform, reconcile it every morning and give finance a verified dashboard.",
			outcome: "Daily ledger totals and the AWS revenue schema agree within $50 per region, and finance sees verified revenue by region by 07:00 London.",
			evidence: [
				{ title: "Billing ledger schema extract", detail: "dbo.Invoices, dbo.InvoiceLines, dbo.Credits, dbo.FxRates · read only" },
				{ title: "30-day reconciliation sample", detail: "4,812 invoices · synthetic and redacted" },
				{ title: "Finance interviews", detail: "Revenue is recognised on posting date; regional views are used daily" },
				{ title: "AWS data platform assessment", detail: "Existing ingestion account and PostgreSQL revenue schema" },
				{ title: "Revenue close policy v3", detail: "Variance tolerance $50 per region; variances above $200 need the owner" },
			],
			criteria: [
				{ id: "agree", label: "Ledger and revenue schema agree within $50 per region", duty: "analyst", verify: "Daily reconciliation read-back" },
				{ id: "dashboard", label: "Verified revenue by region by 07:00 London", duty: "dashboard", verify: "Tile totals and refresh time" },
				{ id: "tested", label: "Pipeline changes tested in isolation first", duty: "data", verify: "Checks bound to each version" },
				{ id: "released", label: "Production changes released only under policy", duty: "coordinator", verify: "Release record and read-back" },
				{ id: "exceptions", label: "Variances above $200 routed to the revenue owner", duty: "coordinator", verify: "Decision record" },
			],
			limitations: ["Some historical invoices have no region code (4.4% of the Discovery sample).", "Discovery could not confirm who authorizes production releases.", "Credit notes before 2024 are out of scope."],
			inScope: ["Billing ledger to AWS revenue schema", "Daily reconciliation", "Revenue dashboard", "Exception routing"],
			outScope: ["Ledger edits", "Payment release", "Customer communication", "Tax reporting"],
			questions: [
				{ id: "release", label: "How should pipeline releases to production be authorized?", detail: "Discovery couldn't confirm this. Testing never needs it. Dashboard publishing to the finance group is already pre-authorized by policy FIN-DASH-2.", options: [{ id: "approval", label: "Ask me before each pipeline release", recommended: true, effect: "Each pipeline release waits for your approval with its target, checks and recovery limits." }, { id: "window", label: "Release the pipeline in the Saturday 02:00 window", effect: "Tested pipeline versions release in the window under policy, without a separate approval." }] },
				{ id: "testdata", label: "What data may isolated tests use?", detail: "Tests run away from production either way.", options: [{ id: "synthetic", label: "The synthetic 30-day sample", recommended: true, effect: "Ready now. Results say they come from synthetic data." }, { id: "masked", label: "A masked production extract", effect: "Needs the data owner's approval before build and test can start." }] },
			],
			milestones: [
				{ template: "mapping", reference: "MS-1", title: "Source-to-target mapping" },
				{ template: "pipeline", reference: "MS-2", title: "Ingestion and transformation pipeline", dependsOn: [{ reference: "MS-1" }] },
				{ template: "dashboard", reference: "MS-3", title: "Revenue dashboard", dependsOn: [{ reference: "MS-2", step: "test" }] },
			],
			needs: ["Read the billing ledger through the existing gateway", "An isolated AWS test workspace with synthetic data", "The release adapter for the revenue schema and dashboards", "A daily 06:00 London schedule once delivery is verified"],
			offeredWhen: /\b(pipeline|dashboard|sql server|aws|data platform|ingest|etl|warehouse|schema|reconcil\w* revenue|revenue reconcil\w*)\b/i,
		},
	],
	assignments: [
		{ id: "credits", pattern: /credit[- ]?notes?/i, template: "backfill", owner: "analyst", title: text => `Credit-note reconciliation${/\b(aug|august)\b/i.test(text) ? " · August" : /\b(sep|september)\b/i.test(text) ? " · September" : ""}` },
	],
	caseTemplate: "exception",
	cycleTemplate: "cycle",
	delivery: {
		evidence: {
			summary: (day, reference, first) => first ? `First production load · ${day} ledger compared with the revenue schema` : `${reference} · ${day} ledger compared with the revenue schema`,
			text: (version, basis, day) => `Reconciliation evidence v${version} recorded from ${basis}: ${day} ledger totals and the revenue schema agree in every region within $50.`,
			operations: ["Ledger totals by region · SQL Server · read only", "revenue.region_totals · AWS PostgreSQL · read only", "Compared 4 regions and the company total"],
		},
		dashboardNoun: "revenue dashboard",
		cycle: { noun: "reconciliation", hour: 6 },
		releaseReadBack: { reference: "migration 0007", found: "migration 0007 and the nightly load registered" },
	},
	releaseWindow: { label: "Saturday 02:00", weekday: 6, hour: 2 },
	preview: {
		mapping: {
			lede: (rows, hasUnapproved) => `${rows} billing fields map to the AWS revenue schema. ${hasUnapproved ? "Two fields requested in the finance interview are kept to isolated tests because they aren't on the approved field list." : "Only approved fields are mapped."}`,
			sourceHeader: "SQL Server field", targetHeader: "Revenue schema",
			decisionTarget: "region", decisionPrefix: "region-", compactTargets: ["region", "net_amount_usd", "posting_date"],
			rows: [
				{ source: "dbo.Invoices.InvoiceId", target: "invoice_id", rule: () => "Key · unique", approved: true },
				{ source: "InvoiceNumber", target: "invoice_number", rule: () => "Copy", approved: true },
				{ source: "CustomerId", target: "customer_id", rule: () => "Copy", approved: true },
				{ source: "CustomerName", target: "customer_name", rule: () => "Trim spaces", approved: true },
				{ source: "RegionCode", target: "region", rule: variant => variant.includes("region-unassigned") ? "Empty → “Unassigned”" : variant.includes("region-excluded") ? "Empty → left out of regional views" : "Empty on 212 invoices · your decision", approved: true },
				{ source: "PostingDate", target: "posting_date", rule: () => "Date · London", approved: true },
				{ source: "InvoiceDate", target: "invoice_date", rule: () => "Date · London", approved: true },
				{ source: "CurrencyCode", target: "currency", rule: () => "ISO 4217", approved: true },
				{ source: "NetAmount", target: "net_amount_usd", rule: () => "× FX rate on posting date", approved: true },
				{ source: "TaxAmount", target: "tax_amount_usd", rule: () => "× FX rate on posting date", approved: true },
				{ source: "InvoiceTotal", target: "total_amount_usd", rule: () => "× FX rate on posting date", approved: true },
				{ source: "Status", target: "status", rule: () => "P → posted · V → void", approved: true },
				{ source: "dbo.Credits.CreditAmount", target: "credit_amount_usd", rule: () => "Sum per invoice, by posting date", approved: true },
				{ source: "dbo.InvoiceLines.Quantity", target: "line_quantity", rule: () => "Sum per invoice", approved: true },
				{ source: "dbo.FxRates.Rate", target: "fx_rate", rule: () => "Rate on posting date", approved: true },
				{ source: "ModifiedAt", target: "source_modified_at", rule: () => "Watermark for incremental loads", approved: true },
				{ source: "CustomerEmail", target: "customer_email", rule: () => "Isolated tests only", approved: false },
				{ source: "SalesRepNote", target: "notes", rule: () => "Isolated tests only", approved: false },
			],
			technical: (version, variant, rows) => `-- Generated from mapping v${version}\nCREATE TABLE revenue.daily_invoices (\n  invoice_id        bigint PRIMARY KEY,\n  region            text NOT NULL, -- ${variant.includes("region-excluded") ? "NULL region rows kept out of regional views" : "COALESCE(RegionCode, 'UNASSIGNED')"}\n  posting_date      date NOT NULL,\n  net_amount_usd    numeric(14,2) NOT NULL,\n  total_amount_usd  numeric(14,2) NOT NULL${rows.some(row => !row.approved) ? ",\n  customer_email    text, -- isolated tests only\n  notes             text  -- isolated tests only" : ""}\n);`,
		},
		pipeline: {
			lede: variant => `Every night at 05:30 London the pipeline copies yesterday's billing rows into the existing AWS data platform, converts them to USD on ${variant.includes("fx-invoice-date") ? "invoice-date" : "posting-date"} rates and publishes the regional totals the dashboard reads. Bulk data stays in your AWS account.`,
			stages: [
				{ name: "SQL Server billing ledger", detail: "On-prem · read through the existing gateway" },
				{ name: "S3 landing", detail: "Existing ingestion account" },
				{ name: "Transform", detail: "revenue_transform job" },
				{ name: "AWS PostgreSQL", detail: "Tables daily_invoices and region_totals" },
				{ name: "Revenue dashboard", detail: "Finance workspace" },
			],
			rows: variant => [
				{ label: "Exchange rates", value: variant.includes("fx-invoice-date") ? "Looked up by invoice date (fails the ledger check)" : "Looked up by posting date, as the ledger does" },
				{ label: "Schedule", value: "Nightly 05:30 London · about 6 minutes in test" },
			],
			technical: (version, variant) => `-- revenue_transform · pipeline v${version}\nINSERT INTO revenue.daily_invoices\nSELECT i.InvoiceId, COALESCE(i.RegionCode, 'UNASSIGNED'), i.PostingDate,\n       i.NetAmount * fx.Rate, i.InvoiceTotal * fx.Rate\nFROM landing.invoices i\nJOIN landing.fx_rates fx\n  ON fx.CurrencyCode = i.CurrencyCode\n AND fx.RateDate = i.${variant.includes("fx-invoice-date") ? "InvoiceDate" : "PostingDate"}\nON CONFLICT (invoice_id) DO UPDATE SET total_amount_usd = EXCLUDED.total_amount_usd;`,
		},
		reconciliation: {
			lede: summary => `${summary}. The ledger and the revenue schema agree in every region within the $50 tolerance.`,
			columns: ["Region", "Billing ledger", "Revenue schema", "Difference"],
			totalLabel: "Company total", format: usd,
			rows: REGIONS.map(entry => ({ name: entry.region, value: entry.ledger })),
			total: REVENUE_FIGURES.ledgerTotal,
			optionalRow: { name: "Unassigned", value: REVENUE_FIGURES.missingRegionValue, removedBy: "region-excluded", footnote: value => `${value} from invoices without a region is in the company total but not in a region, as you decided.` },
			exceptionsTitle: "Exceptions routed", emptyLabel: "No open exceptions",
		},
		dashboard: {
			subject: "Revenue", chartLabel: "Revenue by region", format: usd,
			tiles: ({ exceptions, loaded }) => [
				{ label: "Revenue", value: usd(REVENUE_FIGURES.ledgerTotal), note: loaded },
				{ label: "Ledger variance", value: "$0.00", note: "Within $50 per region" },
				{ label: "Open exceptions", value: String(exceptions), note: "Above $200 go to the owner" },
			],
			rows: REGIONS.map(entry => ({ name: entry.region, value: entry.ledger, children: entry.countries })),
			drillVariant: "region-drilldown", drillNote: "Drill-down: open a region to see its countries. Country totals add up to their region.",
			childrenLabel: row => `${row} countries`,
			optionalRow: { name: "Unassigned", value: REVENUE_FIGURES.missingRegionValue, removedBy: "region-excluded", footnote: value => `Invoices without a region (${value}) count in the company total but not in any regional bar, as you decided on MS-1.` },
		},
		runbook: {
			lede: "How Revenue reconciliation runs from now on. Written by the Revenue coordinator from the verified delivery.",
			daily: drill => `At 05:30 London the released pipeline loads yesterday's billing rows. At 06:00 the reconciliation cycle compares ledger and revenue schema by region, routes exceptions and refreshes the dashboard by 07:00, then posts a summary to the finance channel.${drill ? " On the dashboard, each region opens to its country totals, which add up to the region." : ""}`,
			verified: "Each cycle is verified only when the load read-back, the regional totals within $50, the dashboard refresh time and the channel receipt all have evidence. A missing receipt leaves the cycle partial; nothing else is repeated.",
			needsPerson: release => `Variances above $200 go to the revenue owner. Pipeline releases go out ${release}. Dashboard publishing to the finance group is pre-authorized by policy FIN-DASH-2. Region and source-field rules are business decisions and are never chosen by a specialist.`,
			recovery: "An uncertain release or write is reconciled by reading the target back before any retry. Schema objects can be dropped and the job disabled; rows a downstream reader already used can't be recalled. The billing ledger is never changed.",
		},
		sampleDay: REVENUE_FIGURES.day, testDataLabel: "Test data · synthetic 30-day sample", approvedOnlyVariant: "approved-fields",
		variantText: {
			"fx-invoice-date": "Exchange rates by invoice date", "fx-posting-date": "Exchange rates by posting date",
			"region-unassigned": "Missing regions shown as Unassigned", "region-excluded": "Missing regions left out of regional views",
			"approved-fields": "Approved source fields only", "candidate-fields": "Includes 2 fields not on the approved list", "region-drilldown": "Drill-down from region to country",
		},
	},
	caseLabel: "Exception cases",
	// "invoice" alone still reaches this engagement, as it always has; the AP scenario's longer
	// terms ("invoice exception", "accounts payable") outscore it when a brief is really about them.
	match: ["revenue reconciliation", "reconcile revenue", "billing ledger", "revenue schema", "revenue dashboard", "posting date", "sql server", "revenue", "ledger", "invoice"],
	incoming: ["Tailspin", "Litware", "Proseware", "Adatum", "Woodgrove", "Trey Research", "Coho Winery", "Lucerne Publishing"].map(supplier => `${supplier} · $240 price variance`),
	prefix: "INV",
	examples: { brief: "Reconcile revenue between our SQL Server billing ledger and AWS every morning, and give finance a dashboard they can trust. Ask me before production changes.", detail: "Pipeline, reconciliation & dashboard", assignment: "Reconcile the August credit notes" },
}

/* ---- AP invoice exceptions (the ServiceNow customer demo) ---- */
/* Synthetic figures that add up: the seven causes total the twelve-month volume. */
export const AP_FIGURES = {
	/* The synthetic sample the isolated tests replay: one sweep of the open queue. */
	day: "Sample sweep 30",
	openCases: 1904,
	twelveMonths: 22180,
	mechanical: 13530,
	/* The tolerance conflict Discovery decided: the contract band is narrower than the PO band. */
	toleranceRows: 240,
	toleranceValue: 84310.55,
	/* Exceptions with no active contract to test against. */
	noContract: 318,
	noContractValue: 1204772.18,
	discountsForfeited: 412880.4,
	routedWithoutAuthority: 2140,
	sweepMinutes: 45,
}

const payables: Scenario = {
	id: "payables",
	name: "AP invoice exceptions",
	title: "AP exception triage & approval authority",
	category: "Finance · Accounts payable",
	description: "Clear mechanical invoice exceptions the same day, route every approval to someone who currently holds the authority, and keep a verified exception dashboard.",
	outcome: "Mechanical AP exceptions cleared within the day against negotiated contract terms, every remaining approval routed to a person the delegation of authority names today, and a verified dashboard by 08:00 London.",
	owner: "Head of accounts payable",
	trigger: "Daily 06:00 London sweep · plus ServiceNow exception events",
	boundary: "May read the exception queue, the contract register and the delegation of authority, build and test in an isolated sub-production instance, release tested update sets under policy, and close cases with their evidence. Anything above $5,000 or outside tolerance needs a named approver. No payment release, supplier master change or purchase-order amendment.",
	teamReason: "Testing a tolerance, resolving who may approve, and moving an update set to production need different permissions. The coordinator owns decisions and the only production change, so no specialist can reach the production instance on its own.",
	team: [
		{ id: "coordinator", name: "Exception coordinator", accountable: true, duty: "Owns each outcome, the decisions, production releases and the single case write-back.", tools: "ServiceNow case update · release adapter · Teams finance channel", scope: "Cannot release a payment, change a supplier master or amend a purchase order." },
		{ id: "analyst", name: "Exception analyst", duty: "Investigates invoice, receipt and contract evidence and prepares exception decisions.", tools: "ServiceNow queue, purchase orders and goods receipts · read only", scope: "Read only. Prepares decisions; never posts them." },
		{ id: "data", name: "Triage specialist", package: "pkg_ap_exceptions_v2", duty: "Classifies the exception queue, then builds and tests the triage and routing pipeline in isolation.", tools: "ServiceNow Finance Operations · read only · isolated sub-production instance · private update set", scope: "No production credentials. Test data is a synthetic sweep." },
		{ id: "dashboard", name: "Reporting specialist", package: "pkg_ap_exceptions_v2", duty: "Builds and validates the AP exception dashboard on the triaged queue.", tools: "Dashboard authoring · triaged queue read only", scope: "Publishes only through the coordinator's release." },
	],
	systems: [
		{ id: "queue", name: "ServiceNow Finance Operations", capability: "read", access: "Read only · integration user", detail: "fin_exception, fin_case_evidence, sys_user_delegate", package: "pkg_ap_exceptions_v2" },
		{ id: "contracts", name: "SAP Ariba contract register", capability: "read", access: "Read only · integration user", detail: "212 active contracts and their negotiated tolerances", package: "pkg_ap_exceptions_v2" },
		{ id: "subprod", name: "ServiceNow sub-production", capability: "build", access: "Build and test · isolated", detail: "Disposable update sets, synthetic sweep of 1,904 cases, no production credentials", package: "pkg_ap_exceptions_v2" },
		{ id: "prod", name: "ServiceNow production", capability: "production", access: "Release adapter · per release policy", detail: "Production target; update sets land in the Wednesday window", package: "pkg_ap_exceptions_v2" },
		{ id: "dash", name: "Finance workspace dashboards", capability: "production", access: "Publish · preauthorized for the finance group", detail: "Policy FIN-AP-7", package: "pkg_ap_exceptions_v2" },
		{ id: "case", name: "ServiceNow case record", capability: "update", access: "One governed update per exception", detail: "Closure code, rule applied and evidence" },
		{ id: "teams", name: "Microsoft Teams", capability: "notify", access: "Notification only", detail: "Finance channel and the AP owner" },
	],
	templates: {
		exception: {
			id: "exception", kind: "case",
			obligations: [
				{ id: "decision", label: "Decision bound to this invoice version", evidence: "Decision record" },
				{ id: "recorded", label: "Resolution recorded on the case", evidence: "Case read-back" },
				{ id: "notified", label: "AP owner notified", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "open", title: "Open the exception", owner: "coordinator", kind: "read", doing: "Opening the case with the invoice and its purchase order", done: "Bound invoice v2, PO-4471 and the supplier contract", system: "ServiceNow", tools: ["ServiceNow · read case and invoice v2", "Contract register · read only"] },
				{ id: "investigate", title: "Investigate invoice and contract evidence", owner: "analyst", kind: "analyze", ticks: 2, doing: "Checking the invoice against the receipt and the negotiated tolerance", done: "Quantities reconcile; the price sits outside the contract band", system: "ServiceNow + Ariba", tools: ["Invoice and PO lines · read only", "Goods receipts · read only", "Negotiated tolerance · read only"] },
				{ id: "decide", title: "Obtain the exact approval", owner: "owner", kind: "decision", decision: "variance", doing: "Waiting for the named approver's decision", done: "Decision recorded", obligation: "decision" },
				{ id: "record", title: "Record the resolution on the case", owner: "coordinator", kind: "write", doing: "Recording the approved resolution and its evidence", done: "Resolution recorded; one write", system: "ServiceNow", obligation: "recorded", tools: ["ServiceNow · close case with evidence (one governed write)"] },
				{ id: "verify", title: "Read back the case record", owner: "coordinator", kind: "verify", ticks: 2, doing: "Reading back the closure code and evidence", done: "Case read-back matches the resolution", system: "ServiceNow", tools: ["ServiceNow · read back case"] },
				notify("coordinator", "Sending the decision packet to the AP owner", "AP owner notified; acceptance receipt kept"),
			],
		},
		mapping: {
			id: "mapping", kind: "milestone",
			obligations: [
				{ id: "mapped", label: "Every exception class has a rule and a closure code", evidence: "Taxonomy version" },
				{ id: "tested", label: "Classification passes isolated checks", evidence: "Check results" },
			],
			steps: [
				{ id: "catalog", title: "Read the exception queue", owner: "data", kind: "read", doing: "Reading the open exception queue through the integration user", done: "Read 1,904 open cases and 7 closure codes, read only", system: "ServiceNow", tools: ["ServiceNow · fin_exception (read only)", "Integration user snow-int-04 · no write grants"] },
				{ id: "profile", title: "Classify the queue and draft the taxonomy", owner: "data", kind: "build", ticks: 2, artifact: "mapping", doing: "Classifying twelve months of exceptions against the draft taxonomy", done: "Classified 22,180 exceptions; drafted taxonomy v1", system: "ServiceNow sub-production", tools: ["Isolated run · classify a synthetic sweep of 1,904 cases", "Cause and closure-code scan · 7 classes"] },
				{ id: "contract", title: "Resolve exceptions with no contract", owner: "owner", kind: "decision", decision: "contract", doing: "Waiting for your decision on exceptions with no contract on file", done: "No-contract rule decided" },
				{ id: "test", title: "Test the classification rules", owner: "data", kind: "test", artifact: "mapping", doing: "Testing classification rules in the isolated instance", done: "Classification checks passed", obligation: "tested", system: "ServiceNow sub-production" },
				{ id: "publish", title: "Publish the taxonomy for the build", owner: "coordinator", kind: "verify", doing: "Publishing the tested taxonomy to the pipeline build", done: "Taxonomy published for the build", obligation: "mapped" },
			],
		},
		pipeline: {
			id: "pipeline", kind: "milestone",
			obligations: [
				{ id: "tested", label: "Pipeline passes every isolated check", evidence: "Check results bound to the version" },
				{ id: "released", label: "Tested version released to production", evidence: "Release record and read-back" },
				{ id: "loaded", label: "First production sweep clears within policy", evidence: "Sweep read-back" },
			],
			steps: [
				{ id: "build", title: "Build the triage pipeline", owner: "data", kind: "build", ticks: 2, artifact: "pipeline", doing: "Building classification, tolerance testing and routing from the taxonomy", done: "Built pipeline v1", system: "ServiceNow sub-production", tools: ["Update set us-311 · 9 records (private)", "Flow definition · isolated instance"] },
				{ id: "test", title: "Test in isolation", owner: "data", kind: "test", ticks: 2, artifact: "pipeline", doing: "Running the pipeline against the synthetic sweep", done: "Pipeline checks passed", obligation: "tested", system: "ServiceNow sub-production" },
				{ id: "release", title: "Release to the production instance", owner: "coordinator", kind: "release", artifact: "pipeline", doing: "Releasing the tested update set into the change window", done: "Release applied", obligation: "released", system: "ServiceNow production" },
				{ id: "verify", title: "Verify the first production sweep", owner: "coordinator", kind: "verify", ticks: 2, doing: "Comparing the first production sweep against the tested result", done: "Production sweep clears within policy", obligation: "loaded", system: "ServiceNow production", tools: ["Read back fin_exception closure codes", "Contract register · read only"] },
			],
		},
		dashboard: {
			id: "dashboard", kind: "milestone",
			obligations: [
				{ id: "tested", label: "Dashboard tiles match the triaged queue in test", evidence: "Check results bound to the version" },
				{ id: "released", label: "Published to the finance group", evidence: "Release record" },
				{ id: "verified", label: "Production tiles match the triaged queue", evidence: "Tile read-back" },
			],
			steps: [
				{ id: "build", title: "Build the dashboard", owner: "dashboard", kind: "build", ticks: 2, artifact: "dashboard", doing: "Building exception tiles and the ageing view on the triaged queue", done: "Built dashboard v1", system: "Dashboards", tools: ["Dataset · fin_exception triaged (test instance)", "Dashboard draft · finance workspace sandbox"] },
				{ id: "test", title: "Test against the triaged queue", owner: "dashboard", kind: "test", artifact: "dashboard", doing: "Checking tiles against the triaged test queue", done: "Dashboard checks passed", obligation: "tested", system: "Dashboards" },
				{ id: "release", title: "Publish to the finance group", owner: "coordinator", kind: "release", artifact: "dashboard", after: { template: "pipeline", step: "release" }, doing: "Publishing the tested dashboard", done: "Dashboard published", obligation: "released", system: "Dashboards" },
				{ id: "verify", title: "Verify production tiles", owner: "dashboard", kind: "verify", ticks: 2, doing: "Reading back production tiles against the triaged queue", done: "Production tiles match the triaged queue", obligation: "verified", system: "Dashboards" },
			],
		},
		cycle: {
			id: "cycle", kind: "cycle",
			obligations: [
				{ id: "loaded", label: "Overnight exceptions swept", evidence: "Sweep read-back" },
				{ id: "matched", label: "Mechanical cases cleared against contract terms", evidence: "Closure read-back" },
				{ id: "fresh", label: "Dashboard refreshed by 08:00", evidence: "Refresh timestamp" },
				{ id: "notified", label: "Daily summary posted to finance", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "load", title: "Sweep the overnight exceptions", owner: "data", kind: "refresh", doing: "Sweeping the open queue through the released pipeline", done: "Queue swept", obligation: "loaded", system: "ServiceNow production", tools: ["Scheduled sweep · pipeline in production", "Case count read-back"] },
				{ id: "reconcile", title: "Clear the mechanical cases", owner: "analyst", kind: "analyze", ticks: 2, doing: "Testing each mechanical case against its negotiated tolerance", done: "Mechanical cases cleared within policy", obligation: "matched", system: "ServiceNow + Ariba", tools: ["Contract register · read only", "fin_exception · read only"] },
				{ id: "refresh", title: "Refresh the dashboard", owner: "dashboard", kind: "refresh", doing: "Refreshing the dashboard with the cleared queue", done: "Dashboard refreshed", obligation: "fresh", system: "Dashboards" },
				notify("coordinator", "Posting the daily summary to the finance channel", "Daily summary posted; acceptance receipt kept"),
				{ id: "verify", title: "Verify the cycle", owner: "coordinator", kind: "verify", doing: "Checking every obligation for this cycle", done: "Cycle verified" },
			],
		},
		attestation: {
			id: "attestation", kind: "case",
			obligations: [
				{ id: "matched", label: "Approver rows reconciled against current records", evidence: "Attestation report" },
				{ id: "notified", label: "Result shared with the Controller", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "read", title: "Read the authority matrix", owner: "analyst", kind: "read", doing: "Reading the delegation of authority rows", done: "Read 84 rows, read only", system: "SharePoint", tools: ["Delegation of authority · read only"] },
				{ id: "match", title: "Reconcile rows against current records", owner: "analyst", kind: "analyze", ticks: 2, doing: "Checking each row against the leaver record and its threshold", done: "Rows reconciled; unresolved approvers listed", obligation: "matched" },
				notify("coordinator", "Sharing the attestation report with the Controller", "Attestation report shared"),
			],
		},
	},
	artifacts: {
		mapping: {
			key: "mapping", kind: "mapping", title: "Exception taxonomy and routing map", owner: "data", dependsOn: [],
			variant: ["candidate-classes"], summary: "Drafted from twelve months of exceptions", changes: ["7 exception classes mapped to closure codes and rules", "4 classes cleared by rule; 3 routed to a named approver"],
			checks: [
				{ id: "keys", label: "Every case maps to exactly one class", scope: "Isolated test · synthetic sweep (1,904 cases)" },
				{ id: "types", label: "Closure codes exist for every class", scope: "Isolated test · schema only" },
				{ id: "required", label: "Routed classes name an approver source", scope: "Isolated test · synthetic sweep (1,904 cases)" },
				{ id: "contract", label: "Exceptions with no contract follow the decided rule", scope: "Isolated test · 318 cases with no active contract" },
			],
			fails: (variant, check) => check === "contract" && !variant.some(v => v.startsWith("contract-")) ? "No rule decided for 318 exceptions with no contract on file." : null,
			amendments: [
				{ id: "approved-classes", pattern: /(only|just)\b.*\b(agreed|approved)\b.*\b(class(es)?|codes?)\b|(agreed|approved) (class(es)?|codes?) only/i, label: "Use only the agreed classes", variant: "approved-classes", summary: "Uses only the agreed exception classes", changes: ["Removes the provisional Duplicate-suspected class", "Pipeline checks that read the taxonomy need a rerun"] },
			],
		},
		pipeline: {
			key: "pipeline", kind: "pipeline", title: "Triage and routing pipeline", owner: "data", dependsOn: ["mapping"],
			variant: ["tolerance-purchase-order"], summary: "Classification, tolerance testing and routing built from the taxonomy", changes: ["Classifies each open case against the taxonomy", "Tests price against the applicable tolerance and closes or routes", "Registers a 06:00 London daily sweep"],
			checks: [
				{ id: "rows", label: "Every open case is classified", scope: "Isolated test · synthetic sweep (1,904 cases)" },
				{ id: "tolerance", label: "Price is tested against the negotiated contract", scope: "Isolated test · 212 active contracts" },
				{ id: "discount", label: "Cases clear inside the early-payment window", scope: "Isolated test · synthetic sweep (1,904 cases)" },
				{ id: "authority", label: "Routing resolves a current approver", scope: "Isolated test · 84 authority rows" },
				{ id: "threshold", label: "Nothing above $5,000 clears automatically", scope: "Isolated test · synthetic sweep (1,904 cases)" },
				{ id: "idempotent", label: "Re-running a sweep closes no case twice", scope: "Isolated test · replay of sample sweep 30" },
				{ id: "evidence", label: "Every closed case carries its rule and comparison", scope: "Isolated test · synthetic sweep (1,904 cases)" },
				{ id: "schema", label: "Closure codes match the taxonomy", scope: "Isolated test · schema only", dependsOn: "mapping" },
				{ id: "classes", label: "Routed classes reach a named approver", scope: "Isolated test · synthetic sweep (1,904 cases)", dependsOn: "mapping" },
				{ id: "contracts", label: "Exceptions with no contract follow the decided rule", scope: "Isolated test · 318 cases with no active contract", dependsOn: "mapping" },
				{ id: "runtime", label: "Daily sweep finishes within 45 minutes", scope: "Isolated test · 11 min 40 s measured" },
			],
			fails: (variant, check) => variant.includes("tolerance-purchase-order") && check === "tolerance" ? `${AP_FIGURES.toleranceRows} cases cleared on the purchase-order band of ±2% or $25: the negotiated contract is ±1.5%, $${AP_FIGURES.toleranceValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in total.`
				: variant.includes("tolerance-purchase-order") && check === "discount" ? `The same ${AP_FIGURES.toleranceRows} cases reopen after the early-payment window closes, so the discount is lost twice.`
				: null,
			repair: { tolerance: { variant: "tolerance-contract", replaces: "tolerance-purchase-order", summary: "Tests price against the negotiated contract first", change: "Tolerance lookup reads the Ariba contract register, falling back to the purchase order only with no active contract" } },
			amendments: [],
			release: {
				target: "ServiceNow production · update set and the daily sweep", authority: "answer",
				changes: version => [`Pipeline v${version}`, "Adds the triage flow and closure codes", "Registers the 06:00 London daily sweep"],
				impact: "Adds one flow and one scheduled job. No existing case is changed. The dashboard reads the triaged queue after it is released.",
				recovery: "The flow can be disabled and the update set backed out. Cases already closed can be reopened, but an approver who was already notified can't be un-notified. No payment is ever released.",
			},
		},
		dashboard: {
			key: "dashboard", kind: "dashboard", title: "AP exception dashboard", owner: "dashboard", dependsOn: ["pipeline"],
			variant: [], summary: "Verified exception queue by class, age and approver", changes: ["Tiles: cleared today, waiting on a person, oldest open case", "Exceptions by class", "Sweep time shown on the dashboard"],
			checks: [
				{ id: "tiles", label: "Tiles match the triaged queue", scope: "Test instance · synthetic sweep 30" },
				{ id: "sum", label: "Classes add up to the open queue", scope: "Test instance · synthetic sweep 30" },
				{ id: "fresh", label: "The dashboard shows when it was swept", scope: "Test instance" },
				{ id: "access", label: "Only the finance group can view it", scope: "Test workspace · access policy" },
				{ id: "drill", label: "Approver drill-down adds up to its class", scope: "Test instance · synthetic sweep 30", dependsOn: "approver-drilldown" },
			],
			amendments: [
				{ id: "approver-drilldown", pattern: /\b(approver|authority)\b.*\b(drill|breakdown|break down)|\bdrill[- ]?down\b.*\b(approver|authority)/i, label: "Add approver drill-down", variant: "approver-drilldown", summary: "Adds drill-down from class to approver", changes: ["Each class opens the approvers waiting on it", "New check: approver totals add up to their class"] },
			],
			release: {
				target: "Finance workspace · AP exception dashboard", authority: "policy", policy: "Dashboard publishing to the finance group is preauthorized (policy FIN-AP-7).",
				changes: (version, variant) => [`Dashboard v${version}`, ...variant.includes("approver-drilldown") ? ["Adds drill-down from class to approver"] : ["Exception tiles, class view and ageing"]],
				impact: "Finance group viewers see this version. No case data changes.",
				recovery: "The previous version can be republished. Anyone who viewed this version has already seen it.",
			},
		},
		reconciliation: { key: "reconciliation", kind: "reconciliation", title: "Clearance evidence", owner: "analyst", dependsOn: ["pipeline"], variant: [], summary: "Cleared cases compared against their negotiated terms", changes: [], checks: [], amendments: [] },
		runbook: { key: "runbook", kind: "runbook", title: "Operating runbook", owner: "coordinator", dependsOn: ["pipeline", "dashboard"], variant: [], summary: "How the daily sweep runs, what is verified and what needs a person", changes: ["Daily schedule and its checks", "Decisions that need a named approver", "Recovery without repeating effects"], checks: [], amendments: [] },
	},
	decisions: {
		variance: {
			id: "variance", kind: "approval", title: "Approve the $1,840 price difference?", detail: "Outside the negotiated tolerance. Only this case waits; other work continues.", binding: "v2 · $1,840",
			facts: [{ label: "Record", value: "Invoice version 2" }, { label: "Receiving", value: "400 units matched" }, { label: "Decision", value: "$1,840 above the contract band of ±1.5%" }],
			options: [
				{ id: "approve", label: "Approve $1,840 difference", primary: true, consequence: "Records the approved resolution on the case. No payment release.", outcome: "approve" },
				{ id: "decline", label: "Decline", consequence: "The case stays open with the supplier and closes as declined.", outcome: "decline" },
			],
			boundary: "No payment release or supplier bank-detail changes.",
		},
		contract: {
			id: "contract", kind: "question", artifact: "mapping", title: "318 exceptions have no contract on file. How should they be treated?", detail: "Found while classifying the queue. It's a commercial rule, so the triage specialist won't choose it for you.",
			facts: [{ label: "Affected", value: "318 of 1,904 open cases (16.7%)" }, { label: "Value", value: "$1,204,772.18 across the open queue" }, { label: "Source", value: "No active Ariba contract for the supplier" }],
			options: [
				{ id: "buyer", label: "Route them to the category buyer", primary: true, consequence: "Each goes to the buyer who owns the supplier, with the evidence attached.", outcome: "variant", variant: { add: "contract-buyer", summary: "No-contract exceptions routed to the category buyer" } },
				{ id: "hold", label: "Hold them as unmatched", consequence: "They stay in the queue as unmatched until a contract is loaded.", outcome: "variant", variant: { add: "contract-hold", summary: "No-contract exceptions held as unmatched" } },
			],
		},
		release: {
			id: "release", kind: "release", title: "Release the pipeline to production?", detail: "Your release policy asks for approval before each pipeline release.",
			facts: [], artifact: "pipeline",
			options: [
				{ id: "approve", label: "Approve release", primary: true, consequence: "Released now through the release adapter.", outcome: "release" },
				{ id: "window", label: "Release in the Wednesday 22:00 window", consequence: "Released in the agreed change window.", outcome: "release-window" },
				{ id: "keep", label: "Keep in test", consequence: "Nothing is released. The tested version stays ready.", outcome: "keep-in-test" },
			],
		},
	},
	packages: [
		{
			id: "pkg_ap_exceptions_v2", version: 2, title: "AP exception triage and approval authority", kind: "new",
			summary: "Clear mechanical invoice exceptions against negotiated terms and route every remaining approval to someone who currently holds the authority.",
			outcome: "Mechanical exceptions clear within the day, nothing above $5,000 clears automatically, and finance sees a verified exception dashboard by 08:00 London.",
			evidence: [
				{ title: "Invoice exception queue", detail: "1,904 open cases · 22,180 over twelve months · read only" },
				{ title: "Synthetic sweep sample", detail: "1,904 cases · synthetic and redacted" },
				{ title: "Finance interviews", detail: "Negotiated contract terms govern price; approvals stay with a person" },
				{ title: "Contract register assessment", detail: "212 active contracts; 318 open cases have no active contract" },
				{ title: "Delegation of authority matrix", detail: "84 rows; 2,140 approvals in twelve months routed without current authority" },
			],
			criteria: [
				{ id: "agree", label: "Mechanical exceptions clear against negotiated terms", duty: "analyst", verify: "Daily closure read-back" },
				{ id: "dashboard", label: "Verified exception dashboard by 08:00 London", duty: "dashboard", verify: "Tile totals and sweep time" },
				{ id: "tested", label: "Pipeline changes tested in isolation first", duty: "data", verify: "Checks bound to each version" },
				{ id: "released", label: "Production changes released only under policy", duty: "coordinator", verify: "Release record and read-back" },
				{ id: "exceptions", label: "Anything above $5,000 routed to a named approver", duty: "coordinator", verify: "Decision record" },
			],
			limitations: ["318 open cases have no active contract to test against (16.7% of the open queue).", "Discovery could not confirm who authorizes production ServiceNow changes.", "The delegation of authority matrix is two years stale until it is re-attested."],
			inScope: ["Exception classification", "Tolerance testing against contracts", "Approval routing", "Exception dashboard"],
			outScope: ["Payment release", "Supplier master changes", "Purchase-order amendment", "Payroll and expenses"],
			questions: [
				{ id: "release", label: "How should production ServiceNow changes be authorized?", detail: "Discovery couldn't confirm this. Testing never needs it. Dashboard publishing to the finance group is already pre-authorized by policy FIN-AP-7.", options: [{ id: "approval", label: "Ask me before each pipeline release", recommended: true, effect: "Each pipeline release waits for your approval with its target, checks and recovery limits." }, { id: "window", label: "Release in the Wednesday 22:00 change window", effect: "Tested pipeline versions release in the window under policy, without a separate approval." }] },
				{ id: "testdata", label: "What data may isolated tests use?", detail: "Tests run away from production either way.", options: [{ id: "synthetic", label: "The synthetic sweep of 1,904 cases", recommended: true, effect: "Ready now. Results say they come from synthetic data." }, { id: "masked", label: "A masked production extract", effect: "Needs the data owner's approval before build and test can start." }] },
			],
			milestones: [
				{ template: "mapping", reference: "MS-1", title: "Exception taxonomy and routing map" },
				{ template: "pipeline", reference: "MS-2", title: "Triage and routing pipeline", dependsOn: [{ reference: "MS-1" }] },
				{ template: "dashboard", reference: "MS-3", title: "AP exception dashboard", dependsOn: [{ reference: "MS-2", step: "test" }] },
			],
			needs: ["Read the exception queue and the contract register through the integration user", "An isolated sub-production instance with a synthetic sweep", "The release adapter for the production instance and dashboards", "A daily 06:00 London schedule once delivery is verified"],
		},
	],
	assignments: [
		{ id: "attest", pattern: /attest|delegation of authority|authority matrix/i, template: "attestation", owner: "analyst", title: () => "Delegation of authority attestation" },
	],
	caseTemplate: "exception",
	cycleTemplate: "cycle",
	delivery: {
		evidence: {
			summary: (day, reference, first) => first ? `First production sweep · ${day} queue cleared against negotiated terms` : `${reference} · ${day} queue cleared against negotiated terms`,
			text: (version, basis, day) => `Clearance evidence v${version} recorded from ${basis}: every ${day} case cleared inside its negotiated tolerance, and nothing above $5,000 cleared on its own.`,
			operations: ["Closure codes · ServiceNow · read only", "Negotiated tolerances · SAP Ariba · read only", "Compared 7 exception classes and the open queue"],
		},
		dashboardNoun: "AP exception dashboard",
		cycle: { noun: "sweep", hour: 6 },
		releaseReadBack: { reference: "update set us-311", found: "the triage flow and the daily sweep registered" },
	},
	releaseWindow: { label: "Wednesday 22:00", weekday: 3, hour: 22 },
	preview: {
		mapping: {
			lede: (rows, hasUnapproved) => `${rows} exception classes map to closure codes and rules. ${hasUnapproved ? "One provisional class is kept to isolated tests because the analysts have not agreed it." : "Only agreed classes are used."}`,
			sourceHeader: "Exception class", targetHeader: "Closure code",
			decisionTarget: "ROUTE-BUY", decisionPrefix: "contract-", compactTargets: ["ROUTE-BUY", "AUTO-TOL", "ROUTE-DOA"],
			rows: [
				{ source: "Price within a tolerance band", target: "AUTO-TOL", rule: () => "Contract band first; the purchase order only with no contract", approved: true },
				{ source: "Quantity or unit rounding", target: "AUTO-QTY", rule: () => "Within 0.5 unit · the goods receipt wins", approved: true },
				{ source: "Freight or surcharge coding", target: "AUTO-FRT", rule: () => "Recode to the agreed freight line", approved: true },
				{ source: "Tax jurisdiction default", target: "AUTO-TAX", rule: () => "Ship-to address determines the jurisdiction", approved: true },
				{ source: "Missing or expired contract", target: "ROUTE-BUY", rule: variant => variant.includes("contract-buyer") ? "Route to the category buyer who owns the supplier" : variant.includes("contract-hold") ? "Hold as unmatched until a contract is loaded" : "318 open cases · your decision", approved: true },
				{ source: "Approval authority unresolved", target: "ROUTE-DOA", rule: () => "Resolve against the authority matrix and the leaver record", approved: true },
				{ source: "Duplicate or disputed invoice", target: "HOLD-DISP", rule: () => "Hold for the supplier conversation", approved: true },
				{ source: "Duplicate-suspected (provisional)", target: "HOLD-PROV", rule: () => "Isolated tests only", approved: false },
			],
			technical: (version, variant, rows) => `-- Generated from taxonomy v${version}\nUPDATE fin_exception SET\n  closure_code = :code,       -- ${variant.includes("contract-buyer") ? "ROUTE-BUY routes to the category buyer" : variant.includes("contract-hold") ? "ROUTE-BUY holds as unmatched" : "ROUTE-BUY awaits your decision"}\n  rule_applied = :rule,\n  evidence_ref = :comparison\nWHERE state = 'open'\n  AND class IN (${rows.filter(row => row.approved).length} agreed classes${rows.some(row => !row.approved) ? " + 1 provisional, isolated tests only" : ""});`,
		},
		pipeline: {
			lede: variant => `Every morning at 06:00 London the pipeline classifies the open exception queue, tests each price against ${variant.includes("tolerance-purchase-order") ? "the purchase-order band" : "the negotiated contract"} and either closes the case with its evidence or routes it to a named approver. No payment is ever released.`,
			stages: [
				{ name: "ServiceNow Finance Operations", detail: "Open exception queue · read only" },
				{ name: "Classification", detail: "Seven classes from the taxonomy" },
				{ name: "Tolerance test", detail: "SAP Ariba contract register" },
				{ name: "Close or route", detail: "Closure code and evidence on the case" },
				{ name: "AP exception dashboard", detail: "Finance workspace" },
			],
			rows: variant => [
				{ label: "Price tolerance", value: variant.includes("tolerance-purchase-order") ? "Tested against the purchase order (fails the contract check)" : "Tested against the negotiated contract, as procurement agreed" },
				{ label: "Schedule", value: "Daily 06:00 London · about 12 minutes in test" },
			],
			technical: (version, variant) => `-- triage flow · pipeline v${version}\nSELECT c.number, c.invoice_id, t.band, t.source\nFROM fin_exception c\nJOIN ${variant.includes("tolerance-purchase-order") ? "purchase_order po ON po.id = c.po_id" : "ariba_contract t ON t.supplier_id = c.supplier_id"}\nWHERE c.state = 'open'\n  AND abs(c.price_delta) <= ${variant.includes("tolerance-purchase-order") ? "greatest(po.tolerance_pct * c.po_value, 25)" : "t.tolerance_pct * c.po_value"}\n  AND c.gross_value <= 5000;`,
		},
		reconciliation: {
			lede: summary => `${summary}. Every case cleared inside its negotiated tolerance, and nothing above $5,000 cleared on its own.`,
			columns: ["Exception class", "Raised", "Cleared", "Difference"],
			totalLabel: "Mechanical total", format: count,
			rows: [
				{ name: "Price within a tolerance band", value: 6214 },
				{ name: "Quantity or unit rounding", value: 3908 },
				{ name: "Freight or surcharge coding", value: 2190 },
				{ name: "Tax jurisdiction default", value: 1218 },
			],
			total: AP_FIGURES.mechanical,
			exceptionsTitle: "Cases routed to a person", emptyLabel: "No cases waiting on a person",
		},
		dashboard: {
			subject: "AP exceptions", chartLabel: "Exceptions by class", format: count,
			tiles: ({ exceptions, loaded }) => [
				{ label: "Cleared today", value: count(1586), note: loaded },
				{ label: "Outside tolerance", value: "0", note: "Contract band, not the purchase order" },
				{ label: "Waiting on a person", value: String(exceptions), note: "Above $5,000 or no contract" },
			],
			rows: [
				{ name: "Price tolerance", value: 6214, children: [["Within 1.5%", 4102], ["Within 0.5%", 1488], ["Exact", 624]] },
				{ name: "Quantity", value: 3908, children: [["Unit conversion", 2240], ["Part shipment", 1120], ["Rounding", 548]] },
				{ name: "Freight coding", value: 2190, children: [["Surcharge line", 1310], ["Freight line", 880]] },
				{ name: "Tax jurisdiction", value: 1218, children: [["Ship-to state", 742], ["Ship-to country", 476]] },
			],
			drillVariant: "approver-drilldown", drillNote: "Drill-down: open a class to see the approvers waiting on it. Approver totals add up to their class.",
			childrenLabel: row => `${row} approvers`,
		},
		runbook: {
			lede: "How AP invoice exceptions run from now on. Written by the Exception coordinator from the verified delivery.",
			daily: drill => `At 06:00 London the released pipeline sweeps the open exception queue. Mechanical cases are tested against the negotiated contract and closed with their evidence; everything else routes to an approver resolved against the authority matrix, and the dashboard refreshes by 08:00.${drill ? " On the dashboard, each class opens to the approvers waiting on it." : ""}`,
			verified: "Each sweep is verified only when the queue read-back, the closure evidence on every cleared case, the dashboard refresh time and the channel receipt all have evidence. A missing receipt leaves the sweep partial; no case is closed twice.",
			needsPerson: release => `Anything above $5,000, outside the applicable tolerance, or with no contract on file goes to a named approver. Pipeline releases go out ${release}. Dashboard publishing to the finance group is pre-authorized by policy FIN-AP-7. Tolerance authority and the no-contract rule are commercial decisions and are never chosen by a specialist.`,
			recovery: "An uncertain release or write is reconciled by reading the case back before any retry. The flow can be disabled and the update set backed out; an approver who was already notified can't be un-notified. No payment is ever released.",
		},
		sampleDay: AP_FIGURES.day, testDataLabel: "Test data · synthetic sweep of 1,904 cases", approvedOnlyVariant: "approved-classes",
		variantText: {
			"candidate-classes": "Includes one provisional class", "approved-classes": "Agreed exception classes only",
			"contract-buyer": "No-contract exceptions routed to the category buyer", "contract-hold": "No-contract exceptions held as unmatched",
			"tolerance-purchase-order": "Price tested against the purchase order", "tolerance-contract": "Price tested against the negotiated contract",
			"approver-drilldown": "Drill-down from class to approver",
		},
	},
	caseLabel: "Exception cases",
	match: ["invoice exception", "accounts payable", "ap exception", "three-way match", "delegation of authority", "price tolerance", "supplier invoice", "payable"],
	incoming: ["Brightwell", "Kestrel Metals", "Harbour Freight Co", "Vantage Components", "Delmar Supply", "Ravenna Tooling", "Ironbridge Plant", "Calder Logistics"].map(supplier => `${supplier} · $1,840 above contract tolerance`),
	prefix: "AP",
	examples: { brief: "Clear our AP invoice exceptions in ServiceNow against the negotiated contract terms, and route every approval to someone who actually holds the authority. Ask me before production changes.", detail: "Triage, routing & exception dashboard", assignment: "Attest the delegation of authority" },
}

/* ---- Salesforce to SAP order sync (the third customer demo) ---- */
/* Synthetic figures that add up: the five causes total the twelve-month failure count. */
export const ORDER_FIGURES = {
	/* The synthetic sample the isolated tests replay: one day of booked orders. */
	day: "Sample day 30",
	bookedOrders: 18942,
	failures: 1340,
	/* The master conflict Discovery decided: the two systems disagree on these accounts. */
	masterAccounts: 187,
	masterValue: 612480.9,
	/* Salesforce SKUs with no SAP material to post against. */
	unmappedSkus: 94,
	unmappedOrders: 341,
	duplicates: 103,
	unbilledAtQuarterEnd: 2147320.6,
	syncMinutes: 30,
}

const orders: Scenario = {
	id: "orders",
	name: "Salesforce–SAP order sync",
	title: "Order sync & posting integrity",
	category: "Revenue operations · Order to cash",
	description: "Post every booked Salesforce order into SAP the same day, from one customer master, without ever creating a duplicate sales order.",
	outcome: "Every booked Salesforce order posted into SAP the same day from the authoritative customer master, nothing above $50,000 posted without a person, and a verified order exception cockpit by 08:00 London.",
	owner: "Revenue operations owner",
	trigger: "Daily 06:00 London sync · plus booked-order events",
	boundary: "May read booked orders, both customer records and the material master, build and test in an isolated SAP sandbox, release tested transports under policy, and post a sales order under a deterministic idempotency key. Anything above $50,000, unmapped, or differing from the quote is blocked for a named owner. No price, discount, quote or contract change, and no invoicing or collections.",
	teamReason: "Resolving a customer, preparing a commercial exception and moving a transport to production need different permissions. The coordinator owns decisions and the only production change, so no specialist can reach production SAP on its own.",
	team: [
		{ id: "coordinator", name: "Order sync coordinator", accountable: true, duty: "Owns each outcome, the decisions, production releases and the single Salesforce write-back.", tools: "Salesforce order update · release adapter · Teams revenue channel", scope: "Cannot change a price, a quote or a contract, or touch invoicing." },
		{ id: "analyst", name: "Order exception analyst", duty: "Investigates order, quote and customer evidence and prepares blocked-order decisions.", tools: "Salesforce orders and quotes · SAP sales orders · read only", scope: "Read only. Prepares decisions; never posts them." },
		{ id: "data", name: "Integration specialist", package: "pkg_order_sync_v2", duty: "Maps customers and materials, then builds and tests the order sync pipeline in isolation.", tools: "Salesforce CPQ · read only · isolated SAP sandbox · private transport", scope: "No production credentials. Test data is a synthetic 30-day order sample." },
		{ id: "dashboard", name: "Reporting specialist", package: "pkg_order_sync_v2", duty: "Builds and validates the order exception cockpit on the posted orders.", tools: "Cockpit authoring · posted orders read only", scope: "Publishes only through the coordinator's release." },
	],
	systems: [
		{ id: "sfdc", name: "Salesforce CPQ", capability: "read", access: "Read only · integration user", detail: "Booked orders, order lines, quotes and account records", package: "pkg_order_sync_v2" },
		{ id: "master", name: "SAP business partner and material master", capability: "read", access: "Read only · integration user", detail: "2,418 active accounts and the material master", package: "pkg_order_sync_v2" },
		{ id: "sandbox", name: "SAP S/4HANA sandbox", capability: "build", access: "Build and test · isolated", detail: "Disposable transports, synthetic 30-day order sample, no production credentials", package: "pkg_order_sync_v2" },
		{ id: "prod", name: "SAP S/4HANA production", capability: "production", access: "Release adapter · per release policy", detail: "Production target; transports land in the Thursday window", package: "pkg_order_sync_v2" },
		{ id: "cockpit", name: "Finance workspace dashboards", capability: "production", access: "Publish · preauthorized for the finance group", detail: "Policy ITGC-SOX-4", package: "pkg_order_sync_v2" },
		{ id: "sfdcwrite", name: "Salesforce order record", capability: "update", access: "One governed update per order", detail: "SAP order number, or the block reason" },
		{ id: "teams", name: "Microsoft Teams", capability: "notify", access: "Notification only", detail: "Revenue channel and the order owner" },
	],
	templates: {
		exception: {
			id: "exception", kind: "case",
			obligations: [
				{ id: "decision", label: "Decision bound to this order version", evidence: "Decision record" },
				{ id: "recorded", label: "Resolution recorded on the order", evidence: "Salesforce read-back" },
				{ id: "notified", label: "Order owner notified", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "open", title: "Open the blocked order", owner: "coordinator", kind: "read", doing: "Opening the order with its quote and customer record", done: "Bound order v2, quote Q-8815 and the business partner", system: "Salesforce", tools: ["Salesforce · read order and quote", "SAP business partner · read only"] },
				{ id: "investigate", title: "Investigate order and quote evidence", owner: "analyst", kind: "analyze", ticks: 2, doing: "Checking the order against its quote and the agreed terms", done: "Lines reconcile; the pricing condition differs from the quote", system: "Salesforce + SAP", tools: ["Order and quote lines · read only", "SAP pricing conditions · read only"] },
				{ id: "decide", title: "Obtain the exact approval", owner: "owner", kind: "decision", decision: "variance", doing: "Waiting for revenue operations' decision", done: "Decision recorded", obligation: "decision" },
				{ id: "record", title: "Record the resolution on the order", owner: "coordinator", kind: "write", doing: "Recording the approved resolution and its evidence", done: "Resolution recorded; one write", system: "Salesforce", obligation: "recorded", tools: ["Salesforce · update order with the outcome (one governed write)"] },
				{ id: "verify", title: "Read back the order record", owner: "coordinator", kind: "verify", ticks: 2, doing: "Reading back the order outcome and evidence", done: "Order read-back matches the resolution", system: "Salesforce", tools: ["Salesforce · read back order"] },
				notify("coordinator", "Sending the decision packet to the order owner", "Order owner notified; acceptance receipt kept"),
			],
		},
		mapping: {
			id: "mapping", kind: "milestone",
			obligations: [
				{ id: "mapped", label: "Every customer and line resolves to exactly one record", evidence: "Mapping version" },
				{ id: "tested", label: "Mapping rules pass isolated checks", evidence: "Check results" },
			],
			steps: [
				{ id: "catalog", title: "Read both customer records", owner: "data", kind: "read", doing: "Reading the Salesforce accounts and SAP business partners through the integration user", done: "Read 2,418 accounts in both systems, read only", system: "Salesforce + SAP", tools: ["Salesforce · Account (read only)", "SAP · business partner and material master (read only)"] },
				{ id: "profile", title: "Reconcile the masters and draft the mapping", owner: "data", kind: "build", ticks: 2, artifact: "mapping", doing: "Reconciling both customer records and mapping order lines to SAP materials", done: "Reconciled 2,418 accounts; drafted mapping v1", system: "SAP sandbox", tools: ["Isolated run · reconcile 2,418 accounts", "Material lookup · 94 SKUs with no match"] },
				{ id: "material", title: "Resolve unmapped SKUs", owner: "owner", kind: "decision", decision: "material", doing: "Waiting for your decision on SKUs with no SAP material", done: "Unmapped-SKU rule decided" },
				{ id: "test", title: "Test the mapping rules", owner: "data", kind: "test", artifact: "mapping", doing: "Testing mapping rules in the isolated sandbox", done: "Mapping checks passed", obligation: "tested", system: "SAP sandbox" },
				{ id: "publish", title: "Publish the mapping for the build", owner: "coordinator", kind: "verify", doing: "Publishing the tested mapping to the pipeline build", done: "Mapping published for the build", obligation: "mapped" },
			],
		},
		pipeline: {
			id: "pipeline", kind: "milestone",
			obligations: [
				{ id: "tested", label: "Pipeline passes every isolated check", evidence: "Check results bound to the version" },
				{ id: "released", label: "Tested version released to production", evidence: "Release record and read-back" },
				{ id: "loaded", label: "First production sync posts without a duplicate", evidence: "Sales order read-back" },
			],
			steps: [
				{ id: "build", title: "Build the sync pipeline", owner: "data", kind: "build", ticks: 2, artifact: "pipeline", doing: "Building resolution, mapping and posting from the mapping", done: "Built pipeline v1", system: "SAP sandbox", tools: ["Transport ARC-4471 · 11 objects (private)", "Posting service · isolated sandbox"] },
				{ id: "test", title: "Test in isolation", owner: "data", kind: "test", ticks: 2, artifact: "pipeline", doing: "Running the pipeline against the synthetic order sample", done: "Pipeline checks passed", obligation: "tested", system: "SAP sandbox" },
				{ id: "release", title: "Release to production SAP", owner: "coordinator", kind: "release", artifact: "pipeline", doing: "Releasing the tested transport into the change window", done: "Release applied", obligation: "released", system: "SAP S/4HANA" },
				{ id: "verify", title: "Verify the first production sync", owner: "coordinator", kind: "verify", ticks: 2, doing: "Reading back the posted sales orders by idempotency key", done: "Every order posted once; no duplicate", obligation: "loaded", system: "SAP S/4HANA", tools: ["Read back sales orders by external reference", "Salesforce order numbers · read only"] },
			],
		},
		dashboard: {
			id: "dashboard", kind: "milestone",
			obligations: [
				{ id: "tested", label: "Cockpit tiles match the posted orders in test", evidence: "Check results bound to the version" },
				{ id: "released", label: "Published to the finance group", evidence: "Release record" },
				{ id: "verified", label: "Production tiles match the posted orders", evidence: "Tile read-back" },
			],
			steps: [
				{ id: "build", title: "Build the cockpit", owner: "dashboard", kind: "build", ticks: 2, artifact: "dashboard", doing: "Building posted, blocked and at-risk tiles on the posted orders", done: "Built cockpit v1", system: "Dashboards", tools: ["Dataset · posted orders (sandbox)", "Cockpit draft · finance workspace sandbox"] },
				{ id: "test", title: "Test against the posted orders", owner: "dashboard", kind: "test", artifact: "dashboard", doing: "Checking tiles against the posted test orders", done: "Cockpit checks passed", obligation: "tested", system: "Dashboards" },
				{ id: "release", title: "Publish to the finance group", owner: "coordinator", kind: "release", artifact: "dashboard", after: { template: "pipeline", step: "release" }, doing: "Publishing the tested cockpit", done: "Cockpit published", obligation: "released", system: "Dashboards" },
				{ id: "verify", title: "Verify production tiles", owner: "dashboard", kind: "verify", ticks: 2, doing: "Reading back production tiles against the posted orders", done: "Production tiles match the posted orders", obligation: "verified", system: "Dashboards" },
			],
		},
		cycle: {
			id: "cycle", kind: "cycle",
			obligations: [
				{ id: "loaded", label: "Yesterday's booked orders read", evidence: "Order count read-back" },
				{ id: "matched", label: "Each order posted once, under its key", evidence: "Sales order read-back" },
				{ id: "fresh", label: "Cockpit refreshed by 08:00", evidence: "Refresh timestamp" },
				{ id: "notified", label: "Daily summary posted to revenue operations", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "load", title: "Read yesterday's booked orders", owner: "data", kind: "refresh", doing: "Reading the day's booked orders through the released pipeline", done: "Booked orders read", obligation: "loaded", system: "Salesforce", tools: ["Scheduled sync · pipeline in production", "Order count read-back"] },
				{ id: "reconcile", title: "Post each order once", owner: "analyst", kind: "analyze", ticks: 2, doing: "Posting each resolved order under its idempotency key", done: "Every order posted once; blocked orders routed", obligation: "matched", system: "SAP S/4HANA", tools: ["Sales orders by external reference · read only", "Business partner · read only"] },
				{ id: "refresh", title: "Refresh the cockpit", owner: "dashboard", kind: "refresh", doing: "Refreshing the cockpit with the posted orders", done: "Cockpit refreshed", obligation: "fresh", system: "Dashboards" },
				notify("coordinator", "Posting the daily summary to the revenue channel", "Daily summary posted; acceptance receipt kept"),
				{ id: "verify", title: "Verify the cycle", owner: "coordinator", kind: "verify", doing: "Checking every obligation for this cycle", done: "Cycle verified" },
			],
		},
		backfill: {
			id: "backfill", kind: "case",
			obligations: [
				{ id: "matched", label: "Duplicate sales orders identified against their source", evidence: "Match report" },
				{ id: "notified", label: "Result shared with internal controls", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "read", title: "Read the cancelled sales orders", owner: "analyst", kind: "read", doing: "Reading the cancelled sales orders for the period", done: "Read the cancellations, read only", system: "SAP S/4HANA", tools: ["Sales order cancellations · read only"] },
				{ id: "match", title: "Match duplicates to their source order", owner: "analyst", kind: "analyze", ticks: 2, doing: "Matching each duplicate to the Salesforce order it came from", done: "Duplicates matched; unmatched ones listed", obligation: "matched" },
				notify("coordinator", "Sharing the match report with internal controls", "Match report shared"),
			],
		},
	},
	artifacts: {
		mapping: {
			key: "mapping", kind: "mapping", title: "Customer and material mapping", owner: "data", dependsOn: [],
			variant: ["candidate-mapping"], summary: "Drafted from both customer records and the material master", changes: ["2,418 accounts reconciled across Salesforce and SAP", "94 SKUs found with no SAP material"],
			checks: [
				{ id: "keys", label: "Every customer resolves to one business partner", scope: "Isolated test · 2,418 active accounts" },
				{ id: "types", label: "Order and sales-order field types are compatible", scope: "Isolated test · schema only" },
				{ id: "required", label: "Required order fields have values", scope: "Isolated test · synthetic 30-day order sample" },
				{ id: "material", label: "Unmapped SKUs follow the decided rule", scope: "Isolated test · 94 SKUs with no SAP material" },
			],
			fails: (variant, check) => check === "material" && !variant.some(v => v.startsWith("material-")) ? "No rule decided for 94 SKUs with no SAP material." : null,
			amendments: [
				{ id: "active-only", pattern: /(only|just)\b.*\b(active|current)\b.*\b(accounts?|customers?)\b|active (accounts?|customers?) only/i, label: "Map only active accounts", variant: "active-only", summary: "Maps only accounts with an active contract", changes: ["Removes 214 dormant accounts from the mapping", "Pipeline checks that read the mapping need a rerun"] },
			],
		},
		pipeline: {
			key: "pipeline", kind: "pipeline", title: "Order sync pipeline", owner: "data", dependsOn: ["mapping"],
			variant: ["master-salesforce"], summary: "Resolution, mapping and posting built from the mapping", changes: ["Resolves each order to one customer and every line to an SAP material", "Posts the sales order under a deterministic idempotency key", "Registers a 06:00 London daily sync"],
			checks: [
				{ id: "rows", label: "Every booked order is attempted", scope: "Isolated test · synthetic 30-day order sample" },
				{ id: "tax", label: "Tax is determined from the authoritative master", scope: "Isolated test · 2,418 active accounts" },
				{ id: "pricing", label: "Pricing conditions match the quote", scope: "Isolated test · synthetic 30-day order sample" },
				{ id: "idempotent", label: "A retried post creates no duplicate sales order", scope: "Isolated test · replay of sample day 30" },
				{ id: "threshold", label: "Nothing above $50,000 posts automatically", scope: "Isolated test · synthetic 30-day order sample" },
				{ id: "incoterms", label: "Incoterms and payment terms carry from the quote", scope: "Isolated test · synthetic 30-day order sample" },
				{ id: "currency", label: "Order currency matches the contract", scope: "Isolated test · 612 non-USD orders" },
				{ id: "evidence", label: "Every posted order carries its source, master and key", scope: "Isolated test · synthetic 30-day order sample" },
				{ id: "writeback", label: "The SAP order number reaches Salesforce", scope: "Isolated test · synthetic 30-day order sample" },
				{ id: "schema", label: "Field mapping matches the agreed contract", scope: "Isolated test · schema only", dependsOn: "mapping" },
				{ id: "materials", label: "Unmapped SKUs follow the decided rule", scope: "Isolated test · 94 SKUs with no SAP material", dependsOn: "mapping" },
				{ id: "runtime", label: "Daily sync finishes within 30 minutes", scope: "Isolated test · 9 min 40 s measured" },
			],
			fails: (variant, check) => variant.includes("master-salesforce") && check === "tax" ? `${ORDER_FIGURES.masterAccounts} accounts resolve their tax jurisdiction from the Salesforce address: the SAP business partner disagrees, across $${ORDER_FIGURES.masterValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of orders.`
				: variant.includes("master-salesforce") && check === "pricing" ? `The same ${ORDER_FIGURES.masterAccounts} accounts price against the wrong jurisdiction, so the condition differs from the quote.`
				: null,
			repair: { tax: { variant: "master-sap", replaces: "master-salesforce", summary: "Resolves the customer from the SAP business partner", change: "Customer resolution reads the SAP business partner, and Salesforce syncs down from it" } },
			amendments: [],
			release: {
				target: "SAP S/4HANA production · transport and the daily sync", authority: "answer",
				changes: version => [`Pipeline v${version}`, "Adds the posting service and the idempotency key", "Registers the 06:00 London daily sync"],
				impact: "Adds one posting service and one scheduled job. No existing sales order is changed. The cockpit reads the posted orders after it is released.",
				recovery: "The service can be disabled and the transport backed out. A sales order already posted can be cancelled, but a cancelled SAP sales order stays on the books as an audit item. No invoice is ever raised.",
			},
		},
		dashboard: {
			key: "dashboard", kind: "dashboard", title: "Order exception cockpit", owner: "dashboard", dependsOn: ["pipeline"],
			variant: [], summary: "Verified orders by state, age and owner", changes: ["Tiles: posted today, blocked and on whom, at risk for the quarter", "Orders by block reason", "Sync time shown on the cockpit"],
			checks: [
				{ id: "tiles", label: "Tiles match the posted orders", scope: "Sandbox · synthetic sample day 30" },
				{ id: "sum", label: "Block reasons add up to the blocked total", scope: "Sandbox · synthetic sample day 30" },
				{ id: "fresh", label: "The cockpit shows when it was synced", scope: "Sandbox" },
				{ id: "access", label: "Only the finance group can view it", scope: "Sandbox · access policy" },
				{ id: "drill", label: "Owner drill-down adds up to its block reason", scope: "Sandbox · synthetic sample day 30", dependsOn: "owner-drilldown" },
			],
			amendments: [
				{ id: "owner-drilldown", pattern: /\b(owner|assignee)\b.*\b(drill|breakdown|break down)|\bdrill[- ]?down\b.*\b(owner|assignee)/i, label: "Add owner drill-down", variant: "owner-drilldown", summary: "Adds drill-down from block reason to owner", changes: ["Each block reason opens the owners waiting on it", "New check: owner totals add up to their reason"] },
			],
			release: {
				target: "Finance workspace · Order exception cockpit", authority: "policy", policy: "Cockpit publishing to the finance group is preauthorized (policy ITGC-SOX-4).",
				changes: (version, variant) => [`Cockpit v${version}`, ...variant.includes("owner-drilldown") ? ["Adds drill-down from block reason to owner"] : ["Order tiles, block reasons and quarter risk"]],
				impact: "Finance group viewers see this version. No order data changes.",
				recovery: "The previous version can be republished. Anyone who viewed this version has already seen it.",
			},
		},
		reconciliation: { key: "reconciliation", kind: "reconciliation", title: "Posting evidence", owner: "analyst", dependsOn: ["pipeline"], variant: [], summary: "Posted sales orders compared with their Salesforce source", changes: [], checks: [], amendments: [] },
		runbook: { key: "runbook", kind: "runbook", title: "Operating runbook", owner: "coordinator", dependsOn: ["pipeline", "dashboard"], variant: [], summary: "How the daily sync runs, what is verified and what needs a person", changes: ["Daily schedule and its checks", "Decisions that need a named owner", "Recovery without repeating effects"], checks: [], amendments: [] },
	},
	decisions: {
		variance: {
			id: "variance", kind: "approval", title: "Approve the $6,310 pricing difference?", detail: "The order prices differently from its quote. Only this order waits; other work continues.", binding: "v2 · $6,310",
			facts: [{ label: "Record", value: "Order version 2" }, { label: "Quote", value: "Q-8815 · 18 lines matched" }, { label: "Decision", value: "$6,310 above the quoted total" }],
			options: [
				{ id: "approve", label: "Approve $6,310 difference", primary: true, consequence: "Records the approved resolution on the order. No price change.", outcome: "approve" },
				{ id: "decline", label: "Decline", consequence: "The order stays blocked with sales and closes as declined.", outcome: "decline" },
			],
			boundary: "No price, quote or contract change, and no invoicing.",
		},
		material: {
			id: "material", kind: "question", artifact: "mapping", title: "94 SKUs have no SAP material. How should their orders be treated?", detail: "Found while mapping. It's a catalogue decision, so the integration specialist won't choose it for you.",
			facts: [{ label: "Affected", value: "94 SKUs across 341 orders" }, { label: "Value", value: "$1,884,210.40 of booked orders" }, { label: "Source", value: "No material in the SAP material master" }],
			options: [
				{ id: "block", label: "Block the order and raise it to product ops", primary: true, consequence: "The order is not posted; product operations get it with the missing SKU named.", outcome: "variant", variant: { add: "material-block", summary: "Unmapped SKUs block the order and raise it to product ops" } },
				{ id: "placeholder", label: "Post with a placeholder material", consequence: "The order posts and bills, but the line is not the real product until someone corrects it.", outcome: "variant", variant: { add: "material-placeholder", summary: "Unmapped SKUs post against a placeholder material" } },
			],
		},
		release: {
			id: "release", kind: "release", title: "Release the pipeline to production?", detail: "Your release policy asks for approval before each pipeline release.",
			facts: [], artifact: "pipeline",
			options: [
				{ id: "approve", label: "Approve release", primary: true, consequence: "Released now through the release adapter.", outcome: "release" },
				{ id: "window", label: "Release in the Thursday 21:00 window", consequence: "Released in the agreed change window.", outcome: "release-window" },
				{ id: "keep", label: "Keep in test", consequence: "Nothing is released. The tested version stays ready.", outcome: "keep-in-test" },
			],
		},
	},
	packages: [
		{
			id: "pkg_order_sync_v2", version: 2, title: "Order sync and posting integrity", kind: "new",
			summary: "Post every booked Salesforce order into SAP from one authoritative customer master, without ever creating a duplicate sales order.",
			outcome: "Orders post the same day they are booked, nothing above $50,000 posts on its own, and finance sees a verified order exception cockpit by 08:00 London.",
			evidence: [
				{ title: "Salesforce order records", detail: "18,942 booked orders over twelve months · read only" },
				{ title: "Synthetic order sample", detail: "One 30-day sample · synthetic and redacted" },
				{ title: "Revenue interviews", detail: "One customer master governs; a timed-out post must never duplicate" },
				{ title: "Customer master extract", detail: "2,418 active accounts; 187 disagree between the two systems" },
				{ title: "Integration failure queue", detail: "1,340 failures over twelve months, 103 of them duplicates" },
			],
			criteria: [
				{ id: "agree", label: "Every order posts once, under its idempotency key", duty: "analyst", verify: "Sales order read-back by external reference" },
				{ id: "dashboard", label: "Verified order exception cockpit by 08:00 London", duty: "dashboard", verify: "Tile totals and sync time" },
				{ id: "tested", label: "Pipeline changes tested in isolation first", duty: "data", verify: "Checks bound to each version" },
				{ id: "released", label: "Production changes released only under policy", duty: "coordinator", verify: "Release record and read-back" },
				{ id: "exceptions", label: "Anything above $50,000 routed to a named owner", duty: "coordinator", verify: "Decision record" },
			],
			limitations: ["94 Salesforce SKUs have no SAP material to post against (341 orders in the sample year).", "Discovery could not confirm who authorizes production SAP changes.", "Cancelled duplicate sales orders already on the books stay as audit items."],
			inScope: ["Customer master resolution", "Material mapping", "Order posting under an idempotency key", "Order exception cockpit"],
			outScope: ["Price, discount or quote change", "Contract amendment", "Invoicing and collections", "Credit limits"],
			questions: [
				{ id: "release", label: "How should production SAP changes be authorized?", detail: "Discovery couldn't confirm this. Testing never needs it. Cockpit publishing to the finance group is already pre-authorized by policy ITGC-SOX-4.", options: [{ id: "approval", label: "Ask me before each pipeline release", recommended: true, effect: "Each pipeline release waits for your approval with its target, checks and recovery limits." }, { id: "window", label: "Release in the Thursday 21:00 change window", effect: "Tested pipeline versions release in the window under policy, without a separate approval." }] },
				{ id: "testdata", label: "What data may isolated tests use?", detail: "Tests run away from production either way.", options: [{ id: "synthetic", label: "The synthetic 30-day order sample", recommended: true, effect: "Ready now. Results say they come from synthetic data." }, { id: "masked", label: "A masked production extract", effect: "Needs the data owner's approval before build and test can start." }] },
			],
			milestones: [
				{ template: "mapping", reference: "MS-1", title: "Customer and material mapping" },
				{ template: "pipeline", reference: "MS-2", title: "Order sync pipeline", dependsOn: [{ reference: "MS-1" }] },
				{ template: "dashboard", reference: "MS-3", title: "Order exception cockpit", dependsOn: [{ reference: "MS-2", step: "test" }] },
			],
			needs: ["Read booked orders and both customer records through the integration user", "An isolated SAP sandbox with a synthetic order sample", "The release adapter for production SAP and the cockpit", "A daily 06:00 London schedule once delivery is verified"],
		},
	],
	assignments: [
		{ id: "duplicates", pattern: /duplicate|cancelled sales order|cancellation/i, template: "backfill", owner: "analyst", title: () => "Duplicate sales order review" },
	],
	caseTemplate: "exception",
	cycleTemplate: "cycle",
	delivery: {
		evidence: {
			summary: (day, reference, first) => first ? `First production sync · ${day} orders posted under their keys` : `${reference} · ${day} orders posted under their keys`,
			text: (version, basis, day) => `Posting evidence v${version} recorded from ${basis}: every ${day} order posted exactly once under its idempotency key, and nothing above $50,000 posted without a person.`,
			operations: ["Sales orders by external reference · SAP · read only", "Booked orders · Salesforce · read only", "Compared 5 block reasons and the posted total"],
		},
		dashboardNoun: "order exception cockpit",
		cycle: { noun: "order sync", hour: 6 },
		releaseReadBack: { reference: "transport ARC-4471", found: "the posting service and the daily sync registered" },
	},
	releaseWindow: { label: "Thursday 21:00", weekday: 4, hour: 21 },
	preview: {
		mapping: {
			lede: (rows, hasUnapproved) => `${rows} quote and account fields map to the SAP sales order. ${hasUnapproved ? "One field is kept to isolated tests because finance has not agreed it carries." : "Only agreed fields are mapped."}`,
			sourceHeader: "Salesforce field", targetHeader: "SAP sales order",
			decisionTarget: "MATNR", decisionPrefix: "material-", compactTargets: ["MATNR", "KUNNR", "MWSKZ"],
			rows: [
				{ source: "Order.Id", target: "ZZEXTREF", rule: () => "Idempotency key · order id and version", approved: true },
				{ source: "Order.AccountId", target: "KUNNR", rule: () => "Resolved to one SAP business partner", approved: true },
				{ source: "Account.BillingAddress", target: "ADRNR", rule: variant => variant.includes("master-salesforce") ? "From the Salesforce address (fails the master check)" : "From the SAP business partner, as finance decided", approved: true },
				{ source: "Account.TaxJurisdiction", target: "MWSKZ", rule: variant => variant.includes("master-salesforce") ? "Determined from Salesforce (fails tax determination)" : "Determined from the business partner", approved: true },
				{ source: "OrderItem.Product2.StockKeepingUnit", target: "MATNR", rule: variant => variant.includes("material-block") ? "No SAP material → block and raise to product ops" : variant.includes("material-placeholder") ? "No SAP material → post against a placeholder" : "94 SKUs have no material · your decision", approved: true },
				{ source: "OrderItem.Quantity", target: "KWMENG", rule: () => "Copy · order unit", approved: true },
				{ source: "OrderItem.UnitPrice", target: "KBETR", rule: () => "Pricing condition from the quote", approved: true },
				{ source: "Order.CurrencyIsoCode", target: "WAERK", rule: () => "ISO 4217 · must match the contract", approved: true },
				{ source: "Quote.Incoterms__c", target: "INCO1", rule: () => "Carried from the quote", approved: true },
				{ source: "Quote.PaymentTerms__c", target: "ZTERM", rule: () => "Carried from the quote", approved: true },
				{ source: "Order.EffectiveDate", target: "AUDAT", rule: () => "Date · London", approved: true },
				{ source: "Order.QuoteId", target: "BSTNK", rule: () => "Customer reference · the quote number", approved: true },
				{ source: "Order.TotalAmount", target: "NETWR", rule: () => "Checked against the sum of conditions", approved: true },
				{ source: "Order.OwnerId", target: "ZZOWNER", rule: () => "Named owner for a blocked order", approved: true },
				{ source: "Order.SalesNote__c", target: "BEZEI", rule: () => "Isolated tests only", approved: false },
			],
			technical: (version, variant, rows) => `-- Generated from mapping v${version}\nCALL BAPI_SALESORDER_CREATEFROMDAT2(\n  ZZEXTREF  => :order_id || '-' || :order_version,  -- idempotency key\n  KUNNR     => ${variant.includes("master-salesforce") ? ":salesforce_account_id" : ":sap_business_partner"},\n  MWSKZ     => ${variant.includes("master-salesforce") ? ":salesforce_tax_jurisdiction" : ":business_partner_tax_jurisdiction"},\n  MATNR     => ${variant.includes("material-placeholder") ? ":sap_material OR 'PLACEHOLDER'" : ":sap_material"}  -- ${variant.includes("material-block") ? "blocks when unmapped" : variant.includes("material-placeholder") ? "placeholder when unmapped" : "awaits your decision"}${rows.some(row => !row.approved) ? ",\n  BEZEI     => :sales_note  -- isolated tests only" : ""}\n);`,
		},
		pipeline: {
			lede: variant => `Every morning at 06:00 London the pipeline reads the day's booked Salesforce orders, resolves each to ${variant.includes("master-salesforce") ? "the Salesforce account" : "one SAP business partner"} and every line to an SAP material, and posts the sales order under a deterministic idempotency key. A timed-out post is read back, never re-posted.`,
			stages: [
				{ name: "Salesforce CPQ", detail: "Booked orders · read only" },
				{ name: "Customer resolution", detail: "SAP business partner and material master" },
				{ name: "Post sales order", detail: "Under the idempotency key" },
				{ name: "Write back", detail: "SAP order number onto the Salesforce order" },
				{ name: "Order exception cockpit", detail: "Finance workspace" },
			],
			rows: variant => [
				{ label: "Customer master", value: variant.includes("master-salesforce") ? "Resolved from Salesforce (fails tax determination)" : "Resolved from the SAP business partner, as finance decided" },
				{ label: "Schedule", value: "Daily 06:00 London · about 10 minutes in test" },
			],
			technical: (version, variant) => `-- order sync · pipeline v${version}\nSELECT o.Id, o.AccountId, bp.PartnerId, bp.TaxJurisdiction\nFROM salesforce.booked_orders o\nJOIN sap.business_partner bp\n  ON bp.external_id = o.AccountId\nWHERE o.Status = 'Booked'\n  AND NOT EXISTS (\n    SELECT 1 FROM sap.sales_order s\n     WHERE s.external_ref = o.Id || '-' || o.Version   -- never post twice\n  )\n  AND tax_source = '${variant.includes("master-salesforce") ? "SALESFORCE" : "BUSINESS_PARTNER"}';`,
		},
		reconciliation: {
			lede: summary => `${summary}. Every booked order posted exactly once, and nothing above $50,000 posted without a person.`,
			columns: ["Order state", "Booked", "Posted", "Difference"],
			totalLabel: "Booked total", format: count,
			rows: [
				{ name: "Posted same day", value: 1489 },
				{ name: "Posted after a block cleared", value: 62 },
				{ name: "Read back after a timeout", value: 9 },
			],
			total: 1560,
			exceptionsTitle: "Orders blocked for a person", emptyLabel: "No blocked orders",
		},
		dashboard: {
			subject: "Orders", chartLabel: "Blocked orders by reason", format: count,
			tiles: ({ exceptions, loaded }) => [
				{ label: "Posted today", value: count(1560), note: loaded },
				{ label: "Duplicates created", value: "0", note: "Every post carries its key" },
				{ label: "Blocked on a person", value: String(exceptions), note: "Above $50,000 or unmapped" },
			],
			rows: [
				{ name: "Customer", value: 512, children: [["Address differs", 318], ["Tax jurisdiction differs", 194]] },
				{ name: "Unmapped", value: 341, children: [["No material", 227], ["Discontinued", 114]] },
				{ name: "Tax", value: 236, children: [["Jurisdiction", 148], ["Incoterms", 88]] },
				{ name: "Pricing", value: 148, children: [["Condition differs", 96], ["Currency differs", 52]] },
				{ name: "Duplicates", value: 103, children: [["Read back", 103]] },
			],
			drillVariant: "owner-drilldown", drillNote: "Drill-down: open a reason to see the owners waiting on it. Owner totals add up to their reason.",
			childrenLabel: row => `${row} owners`,
		},
		runbook: {
			lede: "How Salesforce–SAP order sync runs from now on. Written by the Order sync coordinator from the verified delivery.",
			daily: drill => `At 06:00 London the released pipeline reads the day's booked Salesforce orders, resolves each to one SAP business partner and every line to a material, and posts the sales order under its idempotency key. The SAP order number is written back by 07:00 and the cockpit refreshes by 08:00.${drill ? " On the cockpit, each block reason opens to the owners waiting on it." : ""}`,
			verified: "Each sync is verified only when the order read-back by external reference, the write-back to Salesforce, the cockpit refresh time and the channel receipt all have evidence. A timed-out post is reconciled by key; no order is ever posted twice.",
			needsPerson: release => `Anything above $50,000, with an unmapped SKU, or priced differently from its quote is blocked for a named owner. Pipeline releases go out ${release}. Cockpit publishing to the finance group is pre-authorized by policy ITGC-SOX-4. The customer master and the unmapped-SKU rule are business decisions and are never chosen by a specialist.`,
			recovery: "An uncertain post is reconciled by reading SAP back on the idempotency key before any retry. The posting service can be disabled and the transport backed out; a sales order already posted can be cancelled, but a cancelled order stays on the books as an audit item. No invoice is ever raised.",
		},
		sampleDay: ORDER_FIGURES.day, testDataLabel: "Test data · synthetic 30-day order sample", approvedOnlyVariant: "active-only",
		variantText: {
			"candidate-mapping": "Includes one field not yet agreed", "active-only": "Active accounts only",
			"material-block": "Unmapped SKUs block the order", "material-placeholder": "Unmapped SKUs post against a placeholder",
			"master-salesforce": "Customer resolved from Salesforce", "master-sap": "Customer resolved from the SAP business partner",
			"owner-drilldown": "Drill-down from block reason to owner",
		},
	},
	caseLabel: "Blocked orders",
	match: ["order sync", "sales order", "quote-to-cash", "order-to-cash", "business partner", "customer master", "salesforce", "s/4hana", "cpq"],
	incoming: ["Halvorsen Group", "Pinewood Logistics", "Castellan Energy", "Arden Biosciences", "Fenwick Retail", "Stelmar Marine", "Orrell Aerospace", "Bramley Foods"].map(customer => `${customer} · $6,310 above the quoted total`),
	prefix: "ORD",
	examples: { brief: "Post our booked Salesforce orders into SAP the same day from one customer master, and never create a duplicate sales order. Ask me before production changes.", detail: "Mapping, posting & exception cockpit", assignment: "Review the cancelled duplicate orders" },
}

/* ---- ECC to S/4HANA conversion (the fourth customer demo) ---- */
/* Synthetic figures that add up: the dispositions total the repository count. */
export const S4_FIGURES = {
	/* The synthetic sample the isolated tests replay: one sandbox copy of the repository. */
	day: "Sandbox copy 12",
	objects: 11842,
	used: 3610,
	archived: 9352,
	/* The standard equivalents Discovery decided on: 412 objects, 38 of which behave differently. */
	standardEquivalents: 412,
	exceptions: 38,
	exposure: 2412880.4,
	/* Objects in use that no owner claims. */
	ownerless: 212,
	blockingFindings: 1180,
	sweepMinutes: 40,
}

const conversion: Scenario = {
	id: "conversion",
	name: "S/4HANA conversion",
	title: "Custom code disposition & readiness",
	category: "Enterprise IT · SAP programme",
	description: "Disposition all 11,842 custom objects on evidence of use, remediate what carries forward, and keep the estate conversion-clean every night.",
	outcome: "Every custom object dispositioned against the agreed rules, the 604 conversion blockers remediated first, and the programme board seeing a verified readiness dashboard by 07:00 CET.",
	owner: "SAP programme owner",
	trigger: "Nightly 22:00 CET readiness sweep · plus transport events",
	boundary: "May read the repository, the usage statistics and the readiness findings, build and test remediation in an isolated S/4HANA sandbox, release tested transports under policy, and block a transport that reintroduces a removed pattern. Anything that changes a disposition, adopts standard where behaviour differs, or reaches production without a release is held for a named owner. No business data change, no authorisation change, and no cutover decision.",
	teamReason: "Classifying an object, remediating it and moving a transport to production need different permissions. The coordinator owns decisions and the only production change, so no specialist can reach production S/4HANA on its own.",
	team: [
		{ id: "coordinator", name: "Conversion coordinator", accountable: true, duty: "Owns each outcome, the decisions, production releases and the single transport call.", tools: "CTS release adapter · Teams programme channel", scope: "Cannot edit code or change a disposition." },
		{ id: "analyst", name: "Custom code analyst", duty: "Reads the repository, usage and findings, and prepares the disposition of each object.", tools: "ECC repository · usage statistics · ATC findings · read only", scope: "Read only. Prepares dispositions; never transports them." },
		{ id: "data", name: "Remediation specialist", package: "pkg_s4_conversion_v2", duty: "Builds and tests remediation against the disposition map in an isolated sandbox.", tools: "ECC repository · read only · isolated S/4HANA sandbox · private transport", scope: "No production credentials. Test data is a sandbox copy of the repository." },
		{ id: "dashboard", name: "Readiness dashboard specialist", package: "pkg_s4_conversion_v2", duty: "Builds and validates the conversion readiness dashboard on the sweep results.", tools: "Dashboard authoring · sweep results read only", scope: "Publishes only through the coordinator's release." },
	],
	systems: [
		{ id: "ecc", name: "SAP ECC repository", capability: "read", access: "Read only · analysis user", detail: "11,842 custom objects and twelve months of usage statistics", package: "pkg_s4_conversion_v2" },
		{ id: "atc", name: "SAP ATC readiness findings", capability: "read", access: "Read only · analysis user", detail: "27,415 findings across 4,102 objects", package: "pkg_s4_conversion_v2" },
		{ id: "sandbox", name: "SAP S/4HANA sandbox", capability: "build", access: "Build and test · isolated", detail: "Disposable transports, a sandbox copy of the repository, no production credentials", package: "pkg_s4_conversion_v2" },
		{ id: "prod", name: "SAP S/4HANA production", capability: "production", access: "Release adapter · per release policy", detail: "Production target; transports land in the Thursday window", package: "pkg_s4_conversion_v2" },
		{ id: "board", name: "Programme workspace dashboards", capability: "production", access: "Publish · preauthorized for the programme board", detail: "Policy ITGC-SAP-3", package: "pkg_s4_conversion_v2" },
		{ id: "cts", name: "SAP CTS transport queue", capability: "update", access: "One governed block per transport", detail: "A refusal, and the reason on the transport" },
		{ id: "teams", name: "Microsoft Teams", capability: "notify", access: "Notification only", detail: "Programme channel and the object owner" },
	],
	templates: {
		exception: {
			id: "exception", kind: "case",
			obligations: [
				{ id: "decision", label: "Decision bound to this transport version", evidence: "Decision record" },
				{ id: "recorded", label: "Outcome recorded on the transport", evidence: "CTS read-back" },
				{ id: "notified", label: "Developer notified", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "open", title: "Open the blocked transport", owner: "coordinator", kind: "read", doing: "Opening the transport with its objects and findings", done: "Bound transport HLD-9117 and its 4 objects", system: "SAP CTS", tools: ["CTS · read transport and objects", "ATC findings · read only"] },
				{ id: "investigate", title: "Investigate the reintroduced pattern", owner: "analyst", kind: "analyze", ticks: 2, doing: "Checking each object against the readiness variant", done: "One object reintroduces a removed pattern; three are clean", system: "SAP ATC", tools: ["ATC readiness variant · read only", "Repository · read only"] },
				{ id: "decide", title: "Obtain the exact approval", owner: "owner", kind: "decision", decision: "variance", doing: "Waiting for the programme's decision", done: "Decision recorded", obligation: "decision" },
				{ id: "record", title: "Record the outcome on the transport", owner: "coordinator", kind: "write", doing: "Recording the decision and its evidence on the transport", done: "Outcome recorded; one write", system: "SAP CTS", obligation: "recorded", tools: ["CTS · record the outcome (one governed write)"] },
				{ id: "verify", title: "Read back the transport", owner: "coordinator", kind: "verify", ticks: 2, doing: "Reading back the transport state and evidence", done: "Transport read-back matches the decision", system: "SAP CTS", tools: ["CTS · read back transport"] },
				notify("coordinator", "Sending the decision packet to the developer", "Developer notified; acceptance receipt kept"),
			],
		},
		mapping: {
			id: "mapping", kind: "milestone",
			obligations: [
				{ id: "mapped", label: "Every object resolves to exactly one disposition", evidence: "Map version" },
				{ id: "tested", label: "Disposition rules pass isolated checks", evidence: "Check results" },
			],
			steps: [
				{ id: "catalog", title: "Read the repository and its usage", owner: "data", kind: "read", doing: "Reading the custom objects and twelve months of usage through the analysis user", done: "Read 11,842 objects and their usage, read only", system: "SAP ECC", tools: ["ECC · SE80 repository (read only)", "ECC · UPL usage statistics (read only)"] },
				{ id: "profile", title: "Match the evidence and draft the map", owner: "data", kind: "build", ticks: 2, artifact: "mapping", doing: "Matching usage, findings and simplification items to every object", done: "Placed 11,630 objects; drafted map v1", system: "SAP S/4HANA sandbox", tools: ["Isolated run · 11,842 objects", "Owner lookup · 212 objects with no owner"] },
				{ id: "material", title: "Resolve objects with no owner", owner: "owner", kind: "decision", decision: "material", doing: "Waiting for your decision on objects nobody claims", done: "Ownerless-object rule decided" },
				{ id: "test", title: "Test the disposition rules", owner: "data", kind: "test", artifact: "mapping", doing: "Testing the disposition rules in the isolated sandbox", done: "Disposition checks passed", obligation: "tested", system: "SAP S/4HANA sandbox" },
				{ id: "publish", title: "Publish the map for the build", owner: "coordinator", kind: "verify", doing: "Publishing the tested map to the remediation build", done: "Map published for the build", obligation: "mapped" },
			],
		},
		pipeline: {
			id: "pipeline", kind: "milestone",
			obligations: [
				{ id: "tested", label: "Pipeline passes every isolated check", evidence: "Check results bound to the version" },
				{ id: "released", label: "Tested version released to production", evidence: "Release record and read-back" },
				{ id: "loaded", label: "First nightly sweep blocks what it should", evidence: "Transport read-back" },
			],
			steps: [
				{ id: "build", title: "Build the remediation pipeline", owner: "data", kind: "build", ticks: 2, artifact: "pipeline", doing: "Building remediation, adoption and the readiness gate from the map", done: "Built pipeline v1", system: "SAP S/4HANA sandbox", tools: ["Transport HLD-9042 · 14 objects (private)", "Readiness variant · isolated sandbox"] },
				{ id: "test", title: "Test in isolation", owner: "data", kind: "test", ticks: 2, artifact: "pipeline", doing: "Running the pipeline against the sandbox copy of the repository", done: "Pipeline checks passed", obligation: "tested", system: "SAP S/4HANA sandbox" },
				{ id: "release", title: "Release to production S/4HANA", owner: "coordinator", kind: "release", artifact: "pipeline", doing: "Releasing the tested transport into the change window", done: "Release applied", obligation: "released", system: "SAP S/4HANA" },
				{ id: "verify", title: "Verify the first nightly sweep", owner: "coordinator", kind: "verify", ticks: 2, doing: "Reading back the swept transports and what was blocked", done: "Every drifting transport blocked; nothing clean refused", obligation: "loaded", system: "SAP CTS", tools: ["Read back transports by readiness result", "CTS queue · read only"] },
			],
		},
		dashboard: {
			id: "dashboard", kind: "milestone",
			obligations: [
				{ id: "tested", label: "Dashboard tiles match the sweep results in test", evidence: "Check results bound to the version" },
				{ id: "released", label: "Published to the programme board", evidence: "Release record" },
				{ id: "verified", label: "Production tiles match the sweep results", evidence: "Tile read-back" },
			],
			steps: [
				{ id: "build", title: "Build the readiness dashboard", owner: "dashboard", kind: "build", ticks: 2, artifact: "dashboard", doing: "Building remaining, blocked and drift tiles on the sweep results", done: "Built dashboard v1", system: "Dashboards", tools: ["Dataset · sweep results (sandbox)", "Dashboard draft · programme workspace sandbox"] },
				{ id: "test", title: "Test against the sweep results", owner: "dashboard", kind: "test", artifact: "dashboard", doing: "Checking tiles against the tested sweep results", done: "Dashboard checks passed", obligation: "tested", system: "Dashboards" },
				{ id: "release", title: "Publish to the programme board", owner: "coordinator", kind: "release", artifact: "dashboard", after: { template: "pipeline", step: "release" }, doing: "Publishing the tested dashboard", done: "Dashboard published", obligation: "released", system: "Dashboards" },
				{ id: "verify", title: "Verify production tiles", owner: "dashboard", kind: "verify", ticks: 2, doing: "Reading back production tiles against the sweep results", done: "Production tiles match the sweep results", obligation: "verified", system: "Dashboards" },
			],
		},
		cycle: {
			id: "cycle", kind: "cycle",
			obligations: [
				{ id: "loaded", label: "The day's transports read", evidence: "Transport count read-back" },
				{ id: "matched", label: "Each transport tested against the readiness variant", evidence: "Transport read-back" },
				{ id: "fresh", label: "Dashboard refreshed by 07:00", evidence: "Refresh timestamp" },
				{ id: "notified", label: "Nightly summary posted to the programme", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "load", title: "Read the day's transports", owner: "data", kind: "refresh", doing: "Reading the day's transports through the released pipeline", done: "Transports read", obligation: "loaded", system: "SAP CTS", tools: ["Scheduled sweep · pipeline in production", "Transport count read-back"] },
				{ id: "reconcile", title: "Test each transport for drift", owner: "analyst", kind: "analyze", ticks: 2, doing: "Running the readiness variant against each transport", done: "Drifting transports blocked; clean ones released", obligation: "matched", system: "SAP ATC", tools: ["Readiness variant · read only", "Disposition map · read only"] },
				{ id: "refresh", title: "Refresh the dashboard", owner: "dashboard", kind: "refresh", doing: "Refreshing the dashboard with the sweep results", done: "Dashboard refreshed", obligation: "fresh", system: "Dashboards" },
				notify("coordinator", "Posting the nightly summary to the programme channel", "Nightly summary posted; acceptance receipt kept"),
				{ id: "verify", title: "Verify the cycle", owner: "coordinator", kind: "verify", doing: "Checking every obligation for this cycle", done: "Cycle verified" },
			],
		},
		backfill: {
			id: "backfill", kind: "case",
			obligations: [
				{ id: "matched", label: "Revived objects identified against their disposition", evidence: "Match report" },
				{ id: "notified", label: "Result shared with the programme", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "read", title: "Read the revive requests", owner: "analyst", kind: "read", doing: "Reading the requests to revive an archived object", done: "Read the requests, read only", system: "SAP ECC", tools: ["Revive requests · read only"] },
				{ id: "match", title: "Match each request to its disposition", owner: "analyst", kind: "analyze", ticks: 2, doing: "Matching each request to the evidence that archived the object", done: "Requests matched; unsupported ones listed", obligation: "matched" },
				notify("coordinator", "Sharing the match report with the programme", "Match report shared"),
			],
		},
	},
	artifacts: {
		mapping: {
			key: "mapping", kind: "mapping", title: "Object disposition map", owner: "data", dependsOn: [],
			variant: ["candidate-map"], summary: "Drafted from the repository, its usage and the readiness findings", changes: ["11,842 objects matched to usage and findings", "212 objects found in use with no named owner"],
			checks: [
				{ id: "keys", label: "Every object resolves to one disposition", scope: "Isolated test · 11,842 objects" },
				{ id: "types", label: "Object types are compatible with the readiness variant", scope: "Isolated test · schema only" },
				{ id: "required", label: "Every disposition carries its evidence", scope: "Isolated test · sandbox copy of the repository" },
				{ id: "material", label: "Ownerless objects follow the decided rule", scope: "Isolated test · 212 objects with no owner" },
			],
			fails: (variant, check) => check === "material" && !variant.some(v => v.startsWith("material-")) ? "No rule decided for 212 objects in use with no named owner." : null,
			amendments: [
				{ id: "used-only", pattern: /(only|just)\b.*\b(used|executed|active)\b.*\bobjects?\b|used objects? only/i, label: "Map only executed objects", variant: "used-only", summary: "Maps only objects with an execution in twelve months", changes: ["Removes 8,232 never-executed objects from the map", "Pipeline checks that read the map need a rerun"] },
			],
		},
		pipeline: {
			key: "pipeline", kind: "pipeline", title: "Remediation and readiness pipeline", owner: "data", dependsOn: ["mapping"],
			variant: ["disposition-bulk"], summary: "Remediation, standard adoption and the readiness gate built from the map", changes: ["Remediates the objects the map carries forward", "Adopts standard for the objects with an equivalent", "Registers a 22:00 CET nightly readiness sweep"],
			checks: [
				{ id: "rows", label: "Every object in the map is attempted", scope: "Isolated test · sandbox copy of the repository" },
				{ id: "behaviour", label: "The behaviour exceptions keep the decided rule", scope: "Isolated test · 38 exception objects" },
				{ id: "exposure", label: "Credit exposure matches the decided rule", scope: "Isolated test · twelve months of orders" },
				{ id: "blockers", label: "All 1,180 error-priority findings are cleared", scope: "Isolated test · 604 objects" },
				{ id: "archive", label: "Nothing below the threshold enters remediation", scope: "Isolated test · 9,352 archived objects" },
				{ id: "gate", label: "A transport reintroducing a removed pattern is refused", scope: "Isolated test · 214 historic transports" },
				{ id: "clean", label: "A clean transport is never refused", scope: "Isolated test · 4,104 historic transports" },
				{ id: "evidence", label: "Every disposition carries its usage and finding evidence", scope: "Isolated test · sandbox copy of the repository" },
				{ id: "revive", label: "An archived object can be revived by a named decision", scope: "Isolated test · 9,352 archived objects" },
				{ id: "schema", label: "Disposition fields match the agreed map", scope: "Isolated test · schema only", dependsOn: "mapping" },
				{ id: "owners", label: "Ownerless objects follow the decided rule", scope: "Isolated test · 212 objects with no owner", dependsOn: "mapping" },
				{ id: "runtime", label: "Nightly sweep finishes within 40 minutes", scope: "Isolated test · 18 min 20 s measured" },
			],
			fails: (variant, check) => variant.includes("disposition-bulk") && check === "behaviour" ? `${S4_FIGURES.exceptions} objects are dispositioned to standard in bulk: each of them behaves differently from its successor, and the map says so.`
				: variant.includes("disposition-bulk") && check === "exposure" ? `The custom credit-exposure check is among them, so €${S4_FIGURES.exposure.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of orders a month would block on the wrong rule.`
				: null,
			repair: { behaviour: { variant: "disposition-exception", replaces: "disposition-bulk", summary: "Applies the decided rule to each of the 38 exceptions", change: "The 38 behaviour exceptions are dispositioned individually, and each is tested against the rule the owner chose" } },
			amendments: [],
			release: {
				target: "SAP S/4HANA production · transport and the nightly sweep", authority: "answer",
				changes: version => [`Pipeline v${version}`, "Adds the readiness gate and the disposition record", "Registers the 22:00 CET nightly sweep"],
				impact: "Adds one scheduled job and one gate on the transport queue. No existing object is changed by the release itself. The dashboard reads the sweep results after it is released.",
				recovery: "The gate can be disabled and the transport backed out. A transport already blocked stays blocked until someone releases it; nothing that was blocked has reached production.",
			},
		},
		dashboard: {
			key: "dashboard", kind: "dashboard", title: "Conversion readiness dashboard", owner: "dashboard", dependsOn: ["pipeline"],
			variant: [], summary: "Readiness by disposition, drift and owner", changes: ["Tiles: cleared tonight, blocked and on whom, remaining before cutover", "Findings by disposition", "Sweep time shown on the dashboard"],
			checks: [
				{ id: "tiles", label: "Tiles match the sweep results", scope: "Sandbox · sandbox copy 12" },
				{ id: "sum", label: "Dispositions add up to the repository total", scope: "Sandbox · sandbox copy 12" },
				{ id: "fresh", label: "The dashboard shows when it was swept", scope: "Sandbox" },
				{ id: "access", label: "Only the programme board can view it", scope: "Sandbox · access policy" },
				{ id: "drill", label: "Owner drill-down adds up to its disposition", scope: "Sandbox · sandbox copy 12", dependsOn: "owner-drilldown" },
			],
			amendments: [
				{ id: "owner-drilldown", pattern: /\b(owner|developer)\b.*\b(drill|breakdown|break down)|\bdrill[- ]?down\b.*\b(owner|developer)/i, label: "Add owner drill-down", variant: "owner-drilldown", summary: "Adds drill-down from disposition to owner", changes: ["Each disposition opens the owners waiting on it", "New check: owner totals add up to their disposition"] },
			],
			release: {
				target: "Programme workspace · Conversion readiness dashboard", authority: "policy", policy: "Dashboard publishing to the programme board is preauthorized (policy ITGC-SAP-3).",
				changes: (version, variant) => [`Dashboard v${version}`, ...variant.includes("owner-drilldown") ? ["Adds drill-down from disposition to owner"] : ["Disposition tiles, drift and remaining work"]],
				impact: "Programme board viewers see this version. No object or transport changes.",
				recovery: "The previous version can be republished. Anyone who viewed this version has already seen it.",
			},
		},
		reconciliation: { key: "reconciliation", kind: "reconciliation", title: "Disposition evidence", owner: "analyst", dependsOn: ["pipeline"], variant: [], summary: "Dispositioned objects compared with the repository", changes: [], checks: [], amendments: [] },
		runbook: { key: "runbook", kind: "runbook", title: "Operating runbook", owner: "coordinator", dependsOn: ["pipeline", "dashboard"], variant: [], summary: "How the nightly sweep runs, what is verified and what needs a person", changes: ["Nightly schedule and its checks", "Decisions that need a named owner", "Recovery without repeating effects"], checks: [], amendments: [] },
	},
	decisions: {
		variance: {
			id: "variance", kind: "approval", title: "Release the blocked transport anyway?", detail: "One object in this transport reintroduces a pattern the conversion removes. Only this transport waits; other work continues.", binding: "HLD-9117 · 1 of 4 objects",
			facts: [{ label: "Record", value: "Transport HLD-9117" }, { label: "Objects", value: "4 · 3 clean" }, { label: "Decision", value: "ZFI_POST_EXIT reintroduces a removed pattern" }],
			options: [
				{ id: "approve", label: "Release with the exception recorded", primary: true, consequence: "The transport releases and the exception is recorded against the object. No disposition changes.", outcome: "approve" },
				{ id: "decline", label: "Keep it blocked", consequence: "The transport stays blocked and returns to the developer with the finding.", outcome: "decline" },
			],
			boundary: "No disposition change, no business data change, and no cutover decision.",
		},
		material: {
			id: "material", kind: "question", artifact: "mapping", title: "212 objects are in use and nobody owns them. How should they be dispositioned?", detail: "Found while mapping. It's a business rule, so the remediation specialist won't choose it for you.",
			facts: [{ label: "Affected", value: "212 objects, all executed in twelve months" }, { label: "Findings", value: "2,000 across the group" }, { label: "Source", value: "No owner in the repository or the programme tracker" }],
			options: [
				{ id: "block", label: "Hold them for the Development Lead", primary: true, consequence: "They stay out of remediation until an owner is named, and the Development Lead gets them as one list.", outcome: "variant", variant: { add: "material-hold", summary: "Ownerless objects are held for the Development Lead" } },
				{ id: "placeholder", label: "Remediate them with the estate", consequence: "They are remediated and carried forward, and an owner is found later or never.", outcome: "variant", variant: { add: "material-carry", summary: "Ownerless objects are remediated with the estate" } },
			],
		},
		release: {
			id: "release", kind: "release", title: "Release the pipeline to production?", detail: "Your release policy asks for approval before each pipeline release.",
			facts: [], artifact: "pipeline",
			options: [
				{ id: "approve", label: "Approve release", primary: true, consequence: "Released now through the release adapter.", outcome: "release" },
				{ id: "window", label: "Release in the Thursday 20:00 window", consequence: "Released in the agreed change window.", outcome: "release-window" },
				{ id: "keep", label: "Keep in test", consequence: "Nothing is released. The tested version stays ready.", outcome: "keep-in-test" },
			],
		},
	},
	packages: [
		{
			id: "pkg_s4_conversion_v2", version: 2, title: "Custom code disposition and conversion readiness", kind: "new",
			summary: "Disposition all 11,842 custom objects on evidence of use, remediate what carries forward, and stop the estate drifting back.",
			outcome: "Every object dispositioned against the agreed rules, the 604 conversion blockers remediated first, and the programme board seeing a verified readiness dashboard by 07:00 CET.",
			evidence: [
				{ title: "Custom code inventory", detail: "11,842 objects with twelve months of usage · read only" },
				{ title: "Sandbox copy of the repository", detail: "One copy · synthetic and redacted" },
				{ title: "Programme interviews", detail: "Archive below twenty executions; the 38 exceptions are the business's call" },
				{ title: "Readiness findings", detail: "27,415 findings; 1,180 of them block the conversion" },
				{ title: "Transport history", detail: "4,318 transports over twenty-four months, 214 of them drifting" },
			],
			criteria: [
				{ id: "agree", label: "Every object carries one disposition and its evidence", duty: "analyst", verify: "Disposition read-back against the repository" },
				{ id: "dashboard", label: "Verified readiness dashboard by 07:00 CET", duty: "dashboard", verify: "Tile totals and sweep time" },
				{ id: "tested", label: "Remediation tested in isolation first", duty: "data", verify: "Checks bound to each version" },
				{ id: "released", label: "Production changes released only under policy", duty: "coordinator", verify: "Release record and read-back" },
				{ id: "exceptions", label: "Behaviour exceptions tested against the decided rule", duty: "coordinator", verify: "Decision record" },
			],
			limitations: ["212 objects are in use with no named owner.", "Discovery could not confirm who authorizes production S/4HANA transports.", "Archived objects stay in the repository and can be revived by a named decision."],
			inScope: ["Object disposition", "Remediation of what carries forward", "Standard adoption", "Nightly readiness sweep and dashboard"],
			outScope: ["Master data and business partner conversion", "Authorisation and role redesign", "Non-SAP interfaces", "Fiori adoption", "Cutover decisions"],
			questions: [
				{ id: "release", label: "How should production S/4HANA changes be authorized?", detail: "Discovery couldn't confirm this. Testing never needs it. Dashboard publishing to the programme board is already pre-authorized by policy ITGC-SAP-3.", options: [{ id: "approval", label: "Ask me before each pipeline release", recommended: true, effect: "Each pipeline release waits for your approval with its target, checks and recovery limits." }, { id: "window", label: "Release in the Thursday 20:00 change window", effect: "Tested pipeline versions release in the window under policy, without a separate approval." }] },
				{ id: "testdata", label: "What data may isolated tests use?", detail: "Tests run away from production either way.", options: [{ id: "synthetic", label: "The sandbox copy of the repository", recommended: true, effect: "Ready now. Results say they come from a sandbox copy." }, { id: "masked", label: "A masked production extract", effect: "Needs the data owner's approval before build and test can start." }] },
			],
			milestones: [
				{ template: "mapping", reference: "MS-1", title: "Object disposition map" },
				{ template: "pipeline", reference: "MS-2", title: "Remediation and readiness pipeline", dependsOn: [{ reference: "MS-1" }] },
				{ template: "dashboard", reference: "MS-3", title: "Conversion readiness dashboard", dependsOn: [{ reference: "MS-2", step: "test" }] },
			],
			needs: ["Read the repository, usage statistics and readiness findings through the analysis user", "An isolated S/4HANA sandbox with a copy of the repository", "The release adapter for production S/4HANA and the dashboard", "A nightly 22:00 CET schedule once delivery is verified"],
		},
	],
	assignments: [
		{ id: "revive", pattern: /revive|archived object|restore object/i, template: "backfill", owner: "analyst", title: () => "Archived object revive review" },
	],
	caseTemplate: "exception",
	cycleTemplate: "cycle",
	delivery: {
		evidence: {
			summary: (day, reference, first) => first ? `First nightly sweep · ${day} transports tested` : `${reference} · ${day} transports tested`,
			text: (version, basis, day) => `Disposition evidence v${version} recorded from ${basis}: every ${day} transport tested against the readiness variant, and nothing reintroducing a removed pattern reached the queue.`,
			operations: ["Transports by readiness result · CTS · read only", "Disposition map · read only", "Compared 3 findings groups and the repository total"],
		},
		dashboardNoun: "conversion readiness dashboard",
		cycle: { noun: "readiness sweep", hour: 22, zone: "CET" },
		releaseReadBack: { reference: "transport HLD-9042", found: "the readiness gate and the nightly sweep registered" },
	},
	releaseWindow: { label: "Thursday 20:00", weekday: 4, hour: 20 },
	preview: {
		mapping: {
			lede: (rows, hasUnapproved) => `${rows} object classes carry a disposition. ${hasUnapproved ? "One class is kept to isolated tests because the programme has not agreed it carries." : "Only agreed classes are dispositioned."}`,
			sourceHeader: "Custom object class", targetHeader: "Disposition",
			decisionTarget: "HOLD", decisionPrefix: "material-", compactTargets: ["HOLD", "EXCEPTION", "STANDARD"],
			rows: [
				{ source: "Z* · no execution in 24 months", target: "ARCHIVE", rule: () => "Below the threshold · blocked from transport", approved: true },
				{ source: "Z* · no execution in 12 months", target: "ARCHIVE", rule: () => "Below the threshold · blocked from transport", approved: true },
				{ source: "Z* · under 20 executions", target: "ARCHIVE", rule: () => "Below the threshold the owner set", approved: true },
				{ source: "Z* · standard equivalent, same behaviour", target: "STANDARD", rule: () => "374 objects · successor functionality", approved: true },
				{ source: "Z* · standard equivalent, behaviour differs", target: "EXCEPTION", rule: variant => variant.includes("disposition-bulk") ? "38 objects dispositioned in bulk, ZFI_CREDIT_EXP among them (fails behaviour and exposure)" : "38 objects tested individually, ZFI_CREDIT_EXP against the decided rule", approved: true },
				{ source: "Z* · error-priority findings", target: "REMEDIATE", rule: () => "604 objects · sequenced first", approved: true },
				{ source: "Z* · warning findings, in use", target: "REMEDIATE", rule: () => "Carried into S/4HANA", approved: true },
				{ source: "Z* · in use, no named owner", target: "HOLD", rule: variant => variant.includes("material-hold") ? "Held for the Development Lead" : variant.includes("material-carry") ? "Remediated with the estate" : "212 objects have no owner · your decision", approved: true },
				{ source: "Y* · legacy namespace", target: "ARCHIVE", rule: () => "No execution in 24 months", approved: true },
				{ source: "Z* tables · no reader", target: "ARCHIVE", rule: () => "Data retained, code removed", approved: true },
				{ source: "Z* · enhancement implementations", target: "REMEDIATE", rule: () => "Re-pointed at the S/4HANA BAdI", approved: true },
				{ source: "Z* · called only by archived code", target: "ARCHIVE", rule: () => "Caller archived · usage not inherited", approved: true },
				{ source: "Z* · sandbox-only experiments", target: "ARCHIVE", rule: () => "Never transported to production", approved: true },
				{ source: "Z* · shadow reporting copies", target: "REVIEW", rule: () => "Isolated tests only", approved: false },
			],
			technical: (version, variant, rows) => `-- Generated from disposition map v${version}\nSELECT obj.name, obj.type, disposition\nFROM repository obj\nLEFT JOIN usage u ON u.object = obj.name\nLEFT JOIN simplification s ON s.object = obj.name\nWHERE disposition = CASE\n  WHEN COALESCE(u.executions, 0) < 20            THEN 'ARCHIVE'\n  WHEN s.successor IS NOT NULL AND s.behaviour_differs\n       THEN ${variant.includes("disposition-bulk") ? "'STANDARD'  -- bulk: fails the behaviour check" : "'EXCEPTION' -- tested individually, as decided"}\n  WHEN s.successor IS NOT NULL                    THEN 'STANDARD'\n  WHEN obj.owner IS NULL                          THEN ${variant.includes("material-hold") ? "'HOLD'" : variant.includes("material-carry") ? "'REMEDIATE'" : "'HOLD' -- awaits your decision"}\n  ELSE 'REMEDIATE'\nEND${rows.some(row => !row.approved) ? "\n  -- shadow reporting copies: isolated tests only" : ""};`,
		},
		pipeline: {
			lede: variant => `Every night at 22:00 CET the pipeline reads the day's transports, tests each one against the readiness variant, and refuses any that reintroduce a pattern the conversion removes. The 38 behaviour exceptions are ${variant.includes("disposition-bulk") ? "dispositioned in bulk to standard" : "tested individually against the rule the owner decided"}.`,
			stages: [
				{ name: "SAP CTS", detail: "The day's transports · read only" },
				{ name: "Readiness variant", detail: "ATC on the sandbox" },
				{ name: "Disposition check", detail: "Against the published map" },
				{ name: "Block or release", detail: "One governed write per transport" },
				{ name: "Readiness dashboard", detail: "Programme workspace" },
			],
			rows: variant => [
				{ label: "Behaviour exceptions", value: variant.includes("disposition-bulk") ? "Dispositioned in bulk (fails the behaviour check)" : "Tested individually, as the owner decided" },
				{ label: "Schedule", value: "Nightly 22:00 CET · about 18 minutes in test" },
			],
			technical: (version, variant) => `-- conversion readiness · pipeline v${version}\nSELECT t.transport, o.object, atc.finding\nFROM cts.transport t\nJOIN cts.transport_object o ON o.transport = t.transport\nLEFT JOIN atc.readiness atc ON atc.object = o.object\nWHERE t.released_on = CURRENT_DATE\n  AND atc.priority = 'ERROR'\n  AND o.object NOT IN (\n    SELECT object FROM disposition WHERE disposition = 'ARCHIVE'\n  )\n  AND exception_rule = '${variant.includes("disposition-bulk") ? "BULK_STANDARD" : "PER_OBJECT"}';`,
		},
		reconciliation: {
			lede: summary => `${summary}. Every transport tested against the readiness variant, and nothing reintroducing a removed pattern reached the queue.`,
			columns: ["Transport state", "Read", "Tested", "Difference"],
			totalLabel: "Transports read", format: count,
			rows: [
				{ name: "Clean, released", value: 46 },
				{ name: "Blocked on a finding", value: 5 },
				{ name: "Held for a named owner", value: 3 },
			],
			total: 54,
			exceptionsTitle: "Transports blocked for a person", emptyLabel: "No blocked transports",
		},
		dashboard: {
			subject: "Readiness", chartLabel: "Findings by disposition", format: count,
			tiles: ({ exceptions, loaded }) => [
				{ label: "Objects dispositioned", value: count(11842), note: loaded },
				{ label: "Drifting transports", value: "0", note: "Blocked before the queue" },
				{ label: "Blocked on a person", value: String(exceptions), note: "Reintroduces a removed pattern" },
			],
			rows: [
				{ name: "Archive", value: 16098, children: [["No 24-month use", 11204], ["No 12-month use", 3004], ["Under threshold", 1890]] },
				{ name: "Remediate", value: 8403, children: [["Error priority", 966], ["Warning", 5104], ["Information", 2333]] },
				{ name: "Standard", value: 2914, children: [["Same behaviour", 2486], ["Behaviour differs", 428]] },
			],
			drillVariant: "owner-drilldown", drillNote: "Drill-down: open a disposition to see the owners waiting on it. Owner totals add up to their disposition.",
			childrenLabel: row => `${row} owners`,
		},
		runbook: {
			lede: "How S/4HANA conversion readiness runs from now on. Written by the Conversion coordinator from the verified delivery.",
			daily: drill => `At 22:00 CET the released pipeline reads the day's transports, tests each against the readiness variant and the published disposition map, and refuses any that reintroduce a removed pattern. The refusal reaches the developer by 23:00 and the dashboard refreshes by 07:00.${drill ? " On the dashboard, each disposition opens to the owners waiting on it." : ""}`,
			verified: "Each sweep is verified only when the transport read-back, the block record in CTS, the dashboard refresh time and the channel receipt all have evidence. A transport is refused before it enters the queue, never after.",
			needsPerson: release => `Any transport reintroducing a removed pattern, any change to a disposition, and any object in use with no named owner are held for a named owner. Pipeline releases go out ${release}. Dashboard publishing to the programme board is pre-authorized by policy ITGC-SAP-3. The archive threshold and the behaviour exceptions are business decisions and are never chosen by a specialist.`,
			recovery: "The gate can be disabled and the transport backed out. A transport already blocked stays blocked until someone releases it, and nothing that was blocked has reached production. An archived object is revived by a named decision, not by a silent restore.",
		},
		sampleDay: S4_FIGURES.day, testDataLabel: "Test data · sandbox copy of the repository", approvedOnlyVariant: "used-only",
		variantText: {
			"candidate-map": "Includes one class not yet agreed", "used-only": "Executed objects only",
			"material-hold": "Ownerless objects held for the Development Lead", "material-carry": "Ownerless objects remediated with the estate",
			"disposition-bulk": "Exceptions dispositioned in bulk", "disposition-exception": "Exceptions tested individually",
			"owner-drilldown": "Drill-down from disposition to owner",
		},
	},
	caseLabel: "Blocked transports",
	match: ["s/4hana conversion", "custom code", "z-code", "atc", "simplification item", "conversion readiness", "custom object", "brownfield", "transport gate", "code remediation"],
	incoming: ["HLD-9117", "HLD-9118", "HLD-9121", "HLD-9124", "HLD-9126", "HLD-9130", "HLD-9133", "HLD-9137"].map(transport => `${transport} · reintroduces a removed pattern`),
	prefix: "CNV",
	examples: { brief: "Disposition our custom objects for the S/4HANA conversion on evidence of use, and stop any transport reintroducing a pattern the conversion removes. Ask me before production changes.", detail: "Disposition, remediation & readiness", assignment: "Review the archived object revive requests" },
}

/* ---- Service desk (one agent) ---- */
const service: Scenario = {
	id: "service", name: "Service desk", title: "Incident triage", category: "IT service management · Incident",
	description: "Get every incident to the right team, with the context to act.",
	outcome: "A correctly assigned incident, verified in ServiceNow, with the on-call team informed.",
	owner: "Service desk manager", trigger: "New ServiceNow incident in the payroll support queue",
	boundary: "May classify, assign and notify. Cannot close incidents, change access or run a remediation.",
	teamReason: "One bounded decision, one authoritative record, one tool scope. Another agent would add handoffs without improving the outcome.",
	team: [{ id: "coordinator", name: "Incident coordinator", accountable: true, duty: "Classifies each incident, resolves the owning team and verifies the handoff.", tools: "ServiceNow incident read/update · Teams channel notification", scope: "Cannot close incidents, change access or run a remediation." }],
	systems: [
		{ id: "servicenow", name: "ServiceNow", capability: "update", access: "One governed update per incident", detail: "Assignment group and triage note" },
		{ id: "teams", name: "Microsoft Teams", capability: "notify", access: "Notification only", detail: "On-call channel" },
	],
	templates: {
		incident: {
			id: "incident", kind: "case",
			obligations: [
				{ id: "assigned", label: "Assignment matches the routing policy", evidence: "ServiceNow read-back" },
				{ id: "notified", label: "On-call team informed", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "read", title: "Read the incident and routing policy", owner: "coordinator", kind: "read", doing: "Reading the incident and routing policy v3", done: "Incident and routing policy v3 read", system: "ServiceNow", tools: ["ServiceNow · read incident", "Routing policy v3"] },
				{ id: "classify", title: "Choose the responsible team", owner: "coordinator", kind: "analyze", doing: "Matching the service to its owning team", done: "Owning team chosen from the approved mapping", system: "Policy" },
				{ id: "update", title: "Assign the incident", owner: "coordinator", kind: "write", doing: "Setting the assignment group and triage note", done: "Incident assigned; one write", obligation: "assigned", system: "ServiceNow", tools: ["ServiceNow · update assignment group (one governed write)"] },
				notify("coordinator", "Posting the handoff to the on-call channel", "On-call team informed; receipt kept"),
				{ id: "verify", title: "Verify the handoff", owner: "coordinator", kind: "verify", ticks: 2, doing: "Reading back the assignment and channel receipt", done: "Handoff verified; incident stays open", system: "ServiceNow + Teams" },
			],
		},
	},
	artifacts: {}, decisions: {},
	packages: [{ id: "pkg_service_v1", version: 1, title: "Incident triage", kind: "new", summary: "Route incidents with evidence and verify each handoff.", outcome: "A correctly assigned incident, verified in ServiceNow.", evidence: [{ title: "Incident sample · 40 records", detail: "Illustrative ticket history and assignment changes" }, { title: "Service ownership matrix v3", detail: "Payroll service → Workplace support" }], criteria: [{ id: "assigned", label: "Assignment matches the routing policy", duty: "coordinator", verify: "ServiceNow read-back" }], limitations: ["Triage doesn't imply resolution; the incident stays open."], inScope: ["Classify, assign, notify"], outScope: ["Close incidents", "Change access", "Run remediation"], questions: [], milestones: [], needs: ["ServiceNow incident update", "Teams on-call channel"] }],
	assignments: [{ id: "incident", pattern: /\b(triage|incident|inc-\d+)\b/i, template: "incident", owner: "coordinator", title: text => { const named = text.match(/inc-\d+/i)?.[0]?.toUpperCase(); return named ? `${named} · assigned incident triage` : "Assigned incident · triage" } }],
	caseTemplate: "incident",
	incoming: ["Expense app sign-in loop", "Shared mailbox access request", "MFA reset after a phone change", "Teams meeting audio failure", "Printer queue offline · Floor 3", "VPN drops on hotel Wi-Fi", "Laptop encryption warning", "Payroll portal timeout"],
	caseLabel: "Incidents",
	match: ["incident", "service desk", "triage"],
	prefix: "INC",
	examples: { brief: "Triage new ServiceNow incidents, identify the responsible team and verify the handoff. Keep incident resolution with the assigned team.", detail: "Triage incidents & verify handoff", assignment: "Triage INC-10490" },
}

/* ---- Employee onboarding (a team) ---- */
const onboarding: Scenario = {
	id: "onboarding", name: "Employee onboarding", title: "Employee onboarding", category: "HR · IT service management",
	description: "Get every approved hire digitally ready before day one.",
	outcome: "A day-one readiness packet with equipment reserved, standard access verified and payroll access confirmed by its owner.",
	owner: "People operations owner", trigger: "Approved new-hire record reaches the onboarding window",
	boundary: "Uses the approved role package only. No privileged access, payroll data edits or compensation shared with IT.",
	teamReason: "HR and IT need different sensitive context and work in parallel. The coordinator receives readiness results, not copies of personnel records.",
	team: [
		{ id: "coordinator", name: "Onboarding coordinator", accountable: true, duty: "Tracks dependencies, obtains the owner's confirmation and verifies readiness.", tools: "Onboarding case · Teams updates", scope: "Cannot declare readiness while an obligation is open." },
		{ id: "hr", name: "HR specialist", duty: "Validates the approved hire and required documents.", tools: "HRIS onboarding fields · read only", scope: "No hiring decisions or compensation changes." },
		{ id: "it", name: "IT specialist", duty: "Reserves equipment and requests the approved standard access package.", tools: "ServiceNow requests · approved access package", scope: "No invented entitlements or privilege escalation." },
	],
	systems: [
		{ id: "hris", name: "HRIS", capability: "read", access: "Read only", detail: "Approved hire and documents" },
		{ id: "servicenow", name: "ServiceNow", capability: "update", access: "Approved requests", detail: "Equipment and standard access" },
		{ id: "teams", name: "Microsoft Teams", capability: "notify", access: "Notification only", detail: "Hiring manager" },
	],
	templates: {
		joiner: {
			id: "joiner", kind: "case",
			obligations: [
				{ id: "hr", label: "Approved hire and documents checked", evidence: "HRIS read-back" },
				{ id: "access", label: "Device and standard access verified", evidence: "ServiceNow receipts" },
				{ id: "payroll", label: "Payroll owner's confirmation attached", evidence: "Fulfillment reference" },
				{ id: "notified", label: "Hiring manager informed", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "open", title: "Open the joiner case", owner: "coordinator", kind: "read", doing: "Reading the approved hire and pinned role package", done: "Hire and role package read", system: "HRIS" },
				{ id: "hr", title: "Validate the hire", owner: "hr", kind: "analyze", group: "prep", ticks: 2, doing: "Checking the approved hire and required documents", done: "HR checks complete", obligation: "hr", system: "HRIS", tools: ["HRIS · read onboarding fields (scoped)"] },
				{ id: "it", title: "Reserve equipment and request access", owner: "it", kind: "write", group: "prep", ticks: 2, doing: "Reserving a laptop and requesting standard access", done: "Laptop reserved; standard access requested", obligation: "access", system: "ServiceNow", tools: ["ServiceNow · equipment request", "ServiceNow · standard access request"] },
				{ id: "payroll", title: "Payroll owner fulfillment", owner: "owner", kind: "human", doing: "Waiting for the payroll owner's fulfillment reference", done: "Owner confirmation attached", obligation: "payroll" },
				{ id: "verify", title: "Verify readiness", owner: "coordinator", kind: "verify", doing: "Checking HR, equipment, access and payroll evidence", done: "Readiness verified" },
				notify("coordinator", "Sharing the readiness summary with the hiring manager", "Hiring manager informed"),
			],
		},
	},
	artifacts: {}, decisions: {},
	packages: [{ id: "pkg_onboarding_v1", version: 1, title: "Employee onboarding", kind: "new", summary: "Coordinate day-one readiness across HR, equipment and access.", outcome: "Approved hires digitally ready before their start date.", evidence: [{ title: "Joiner process v4", detail: "Approved dependencies and day-one readiness" }, { title: "IT access assessment", detail: "Standard package available; automated payroll provisioning not certified" }], criteria: [{ id: "access", label: "Standard access exists before the start date", duty: "it", verify: "Identity and application read-back" }, { id: "payroll", label: "Payroll readiness confirmed by its owner", duty: "coordinator", verify: "Fulfillment reference" }], limitations: ["Automatic payroll provisioning isn't certified; it stays with its owner."], inScope: ["HR record preparation", "Standard access", "ServiceNow tracking", "Communications"], outScope: ["Hardware delivery", "Payroll edits", "Privileged access"], questions: [{ id: "mapping", label: "Which access package applies to London analysts?", detail: "The catalog has two labels for the London office.", options: [{ id: "london-standard", label: "UK · London analyst · standard access v4", recommended: true, effect: "IT requests this package for London analysts." }] }], milestones: [], needs: ["HRIS read", "ServiceNow requests", "Teams manager updates"] }],
	assignments: [{ id: "joiner", pattern: /\b(onboard|joiner|new hire|starts?|starting)\b/i, template: "joiner", owner: "coordinator", title: text => { const name = text.match(/\b(?:[Oo]nboard|[Ff]or)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)/)?.[1]; return `${name ?? "New joiner"} · day-one readiness` } }],
	caseTemplate: "joiner",
	incoming: ["Manchester engineer", "Leeds support analyst", "Edinburgh designer", "London finance associate", "Bristol data analyst", "Glasgow HR advisor"].map(joiner => `${joiner} · day-one readiness`),
	caseLabel: "Joiners",
	match: ["onboard", "employee", "new hire", "joiner", "payroll provisioning"],
	prefix: "JOIN",
	examples: { brief: "Coordinate onboarding for every approved new hire. Arrange standard IT access and equipment, and ask the payroll owner to confirm readiness before the start date.", detail: "Access, equipment & owner confirmation", assignment: "Onboard Priya Shah starting Monday" },
}

/* ---- Inventory operations (a team, scheduled cycles) ---- */
const inventory: Scenario = {
	id: "inventory", name: "Inventory operations", title: "Inventory replenishment", category: "ERP · Supply chain",
	description: "Turn a stock risk into a controlled replenishment action.",
	outcome: "One verified replenishment requisition within the approved limit, with the purchasing owner updated.",
	owner: "Supply chain owner", trigger: "Weekday 06:00 warehouse stock review · Europe/London",
	boundary: "May create one requisition up to the approved $5,000 cap. Cannot release a purchase order, change supplier terms or post stock adjustments.",
	teamReason: "Demand and supplier availability are separate investigations with a shared join point. One coordinator owns quantity and the single requisition to prevent duplicate purchasing.",
	team: [
		{ id: "coordinator", name: "Replenishment coordinator", accountable: true, duty: "Combines findings, enforces the cap and verifies one requisition.", tools: "ERP requisition create/read · Teams notification", scope: "One requisition per cycle, up to $5,000." },
		{ id: "demand", name: "Demand analyst", duty: "Checks stock, reservations and recent consumption.", tools: "Inventory and demand history · read only", scope: "Read only." },
		{ id: "supply", name: "Supply analyst", duty: "Checks approved supplier availability and lead time.", tools: "Supplier catalogue and open orders · read only", scope: "Read only." },
	],
	systems: [
		{ id: "erp", name: "ERP", capability: "update", access: "One governed create per cycle", detail: "Requisitions up to $5,000" },
		{ id: "inventory", name: "Inventory", capability: "read", access: "Read only", detail: "Stock, reservations and demand" },
		{ id: "catalogue", name: "Supplier catalogue", capability: "read", access: "Read only", detail: "Availability and lead time" },
		{ id: "teams", name: "Microsoft Teams", capability: "notify", access: "Notification only", detail: "Purchasing owner" },
	],
	templates: {
		cycle: {
			id: "cycle", kind: "cycle",
			obligations: [
				{ id: "reconciled", label: "Demand, stock and open orders reconciled", evidence: "Joined findings" },
				{ id: "requisition", label: "Exactly one requisition within the cap", evidence: "ERP read-back" },
				{ id: "notified", label: "Purchasing owner updated", evidence: "Teams acceptance receipt" },
			],
			steps: [
				{ id: "start", title: "Start the stock review", owner: "coordinator", kind: "read", doing: "Loading the warehouse snapshot and purchasing policy v6", done: "Snapshot and policy loaded", system: "ERP" },
				{ id: "demand", title: "Check demand", owner: "demand", kind: "analyze", group: "check", ticks: 2, doing: "Checking stock, reservations and consumption", done: "Recommends 200 units", obligation: "reconciled", system: "Inventory" },
				{ id: "supply", title: "Check supply", owner: "supply", kind: "analyze", group: "check", ticks: 2, doing: "Checking supplier availability and lead time", done: "200 units available at $4,200", system: "Supplier catalogue" },
				{ id: "requisition", title: "Create one requisition", owner: "coordinator", kind: "write", doing: "Creating one requisition within the $5,000 cap", done: "Requisition created; one create", obligation: "requisition", system: "ERP", tools: ["ERP · create requisition (one governed create)"] },
				{ id: "verify", title: "Verify the requisition", owner: "coordinator", kind: "verify", doing: "Reading back the requisition", done: "Requisition verified", system: "ERP" },
				notify("coordinator", "Updating the purchasing owner", "Purchasing owner updated"),
			],
		},
	},
	artifacts: {}, decisions: {},
	packages: [{ id: "pkg_inventory_v1", version: 1, title: "Inventory replenishment", kind: "new", summary: "Weekday stock reviews that end in one verified requisition.", outcome: "One verified requisition within the approved limit.", evidence: [{ title: "Stock review sample · 30 days", detail: "Illustrative inventory and demand history" }, { title: "Purchasing policy v6", detail: "$5,000 requisition cap; PO release excluded" }], criteria: [{ id: "one", label: "Exactly one requisition within the cap", duty: "coordinator", verify: "ERP read-back" }], limitations: ["An ERP submission can time out after it's accepted."], inScope: ["Stock review", "Requisition", "Owner update"], outScope: ["Purchase-order release", "Supplier terms"], questions: [], milestones: [], needs: ["ERP requisition create/read", "Inventory read", "Teams"] }],
	assignments: [{ id: "review", pattern: /\b(review|sku-\d+|stock|replenish)\b/i, template: "cycle", owner: "coordinator", title: text => `${text.match(/sku-\d+/i)?.[0]?.toUpperCase() ?? "Assigned"} · stock review` }],
	caseTemplate: "cycle", cycleTemplate: "cycle",
	incoming: ["SKU-212 below reorder point", "SKU-534 cover under five days", "SKU-778 reservation spike", "SKU-119 supplier lead time slipped"],
	caseLabel: "Cases",
	match: ["inventory", "stock", "replenish", "requisition"],
	prefix: "STOCK",
	examples: { brief: "Review inventory every morning, flag shortages and verify permitted replenishment within the approved purchasing policy.", detail: "Monitor stock & review replenishment", assignment: "Review SKU-212 stock" },
}

export const SCENARIOS: Record<WorkflowId, Scenario> = { invoice: revenue, payables, orders, conversion, service, onboarding, inventory }
/*
 * Every scripted scenario, for looking one up and for finding the scenario a package belongs to.
 */
export const WORKFLOW_IDS: WorkflowId[] = ["invoice", "payables", "orders", "conversion", "service", "onboarding", "inventory"]
/*
 * The engagements the workspace starts with. `payables` is deliberately absent: it belongs to the
 * ServiceNow customer demo, which creates it from zero when its Discovery hands the package over,
 * so the everyday workspace keeps the four engagements it has always had.
 */
export const SCENARIO_ORDER: WorkflowId[] = ["invoice", "service", "onboarding", "inventory"]
/* The engagement each customer demo is about. A demo hides the other demos' subjects entirely. */
export const DEMO_SUBJECTS: WorkflowId[] = ["invoice", "payables", "orders", "conversion"]
export const scenarioFor = (id: WorkflowId) => SCENARIOS[id]
/*
 * How an engagement's schedule reads. The hour and its zone come from the scenario: an engagement
 * that sweeps at 22:00 CET must not be described with the revenue engagement's 06:00 London.
 */
export function scheduleLabel(workflowId: WorkflowId, cycles: "daily" | "weekdays") {
	const cycle = SCENARIOS[workflowId].delivery?.cycle
	const hour = String(cycle?.hour ?? 6).padStart(2, "0")
	return `${cycles === "weekdays" ? "Weekdays" : "Daily"} ${hour}:00 ${cycle?.zone ?? "London"}`
}

export const packageFor = (id: string) => WORKFLOW_IDS.flatMap(key => SCENARIOS[key].packages).find(item => item.id === id)
export const packageScenario = (id: string) => WORKFLOW_IDS.find(key => SCENARIOS[key].packages.some(item => item.id === id))
/* The newest package a scenario offers from Discovery. */
export const latestPackage = (id: WorkflowId) => SCENARIOS[id].packages.at(-1)!
export const systemNames = (id: WorkflowId) => SCENARIOS[id].systems.map(system => system.name)
export const specialist = (id: WorkflowId, member: string) => SCENARIOS[id].team.find(item => item.id === member)

/* Which scripted scenario a free-text brief describes. A scenario, not an AI model. */
/*
 * Route a written brief to the scenario whose own terms it names. Scored by total matched length,
 * so "invoice exception" reaches the payables engagement rather than the revenue one that also
 * knows the word "invoice". A brief naming nothing matches nothing.
 */
export function matchScenario(text: string): WorkflowId | null {
	const lower = text.toLowerCase()
	let best: WorkflowId | null = null
	let bestScore = 0
	for (const id of WORKFLOW_IDS) {
		const score = SCENARIOS[id].match.reduce((total, term) => lower.includes(term) ? total + term.length : total, 0)
		if (score > bestScore) { bestScore = score; best = id }
	}
	return best
}
