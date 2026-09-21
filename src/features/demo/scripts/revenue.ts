import { SCENARIOS } from "@/features/discovery-autonomous/model"
import type { DemoScript } from "./types"

/*
 * Revenue reconciliation: the first customer demo. A finance owner asks MAXION to reconcile
 * daily revenue between an on-prem SQL Server billing ledger and the AWS revenue schema.
 *
 * The answers follow the Discovery interview in order and are written to land on the figures the
 * Agentix engagement later works with: a $50 tolerance per region, $200 variances to the owner,
 * posting-date exchange rates, and a release authority nobody owns yet (which becomes the
 * proposal's first question).
 */
export const REVENUE_SCRIPT: DemoScript = {
	id: "revenue",
	label: "Revenue reconciliation",
	name: "Revenue reconciliation",
	kicker: "revenue reconciliation",
	templateName: "Revenue reconciliation",
	scenarioKey: "revenue",
	packageId: "pkg_revenue_v2",
	engagementId: "invoice",
	decisionVariant: "region-",
	publishPolicy: "FIN-DASH-2",
	replacesLabel: "revenue",
	answers: [
		"A number finance can’t explain. The close slips about two days most months while we chase differences by hand.",
		"Mostly EMEA and APAC, and the analysts only find it at month-end. Check the ledger; I suspect currency conversion.",
		"Within $50 per region each day. Anything above $200 comes to me before it’s posted.",
		"Posting date, with the posting-date exchange rate. That’s how the ledger closes.",
		"Nobody owns pipeline releases to production today, so treat that as open. Dashboard publishing to finance is already covered by policy FIN-DASH-2.",
		"The ledger and AWS agree every morning, and finance opens the dashboard at 07:00 without asking anyone to check it.",
	],
	charterReason: "Scope, owners and the five exclusions match what finance leadership agreed.",
	handoffNote: "Start with the mapping; the region rule is mine to decide.",
	steps: {
		start: {
			title: "Start the Discovery",
			does: "In Discover, choose the Revenue reconciliation template, start the Discovery, tick the authority review and create it.",
			says: "Everything starts from a business outcome, not a ticket. MAX drafts the mission from the brief and asks up front what it may do without asking.",
		},
		interview: {
			title: "Answer the owner interview",
			does: "Answer MAX’s six questions. Fill answer puts the scripted reply in the composer; press Enter to send it.",
			says: "MAX only asks for judgement the records can’t supply. On the second answer it doesn’t ask me to guess; it goes and checks the ledger.",
		},
		decision: {
			title: "Let MAX investigate, then decide",
			does: "Open Autonomy while MAX reads the four sources and interviews the four owners. When the decision arrives, choose Adopt posting-date rates.",
			says: "This is the part a consulting team spends weeks on. MAX found two honest conventions for converting currency, $126.24 apart on 14 invoices. That’s finance policy, so it stops and asks, and keeps every other branch moving.",
		},
		package: {
			title: "Read the package and approve the charter",
			does: "Open Package when the nine documents land. Show the executive brief, then the RAID register. Then choose Continue to Agentix and approve the project charter with a reason.",
			says: "Nine documents a senior consultant would sign, all tied to one set of numbers: 418 variances, 89% of them rules a pipeline can apply, a $50 tolerance and $200 escalation. The charter is the one thing that blocks the handoff.",
		},
		handoff: {
			title: "Hand the package to Agentix",
			does: "In the handoff, add a note if you like and choose Continue to Agentix.",
			says: "The packet is frozen, so the agents work from exactly what finance approved.",
		},
		proposal: {
			title: "Create the engagement in Agentix",
			does: "Answer the two questions (ask before each pipeline release; the synthetic sample), choose Run the read-only check, then Activate engagement.",
			says: "Nothing existed in Agentix for this until the handoff. Agentix turned the Discovery into an engagement: a team of four agents with separate permissions, the systems they may touch, three milestones and a daily operation. Discovery couldn’t confirm who approves production releases, so that’s the first question.",
		},
		mapping: {
			title: "Decide the missing-region rule",
			does: "Open MS-1 in Work. When the data specialist asks about 212 invoices without a region, choose Show them as Unassigned.",
			says: "The agent found what Discovery flagged: 4.4% of invoices have no region. It’s a business rule, so the specialist asks rather than choosing.",
		},
		pipeline: {
			title: "Watch a check fail and the repair",
			does: "Open MS-2. Its first version fails two checks, currency conversion and totals by region; open that version to show the 14 rows. The data specialist repairs the join and the checks pass. Use Controls, then Skip, to move faster.",
			says: "This is the Discovery decision paying off: posting-date rates became a test, and the test caught the pipeline copying the workbooks before anything reached production.",
		},
		release: {
			title: "Approve the production release",
			does: "Review the release: its target, checks and recovery limits. Choose Approve release. The adapter’s acknowledgement is lost on purpose; watch the coordinator read the target back.",
			says: "Nothing reaches the production revenue schema without the policy the owner chose. When the adapter times out, the agent doesn’t send the change twice; it checks what actually happened first.",
		},
		dashboard: {
			title: "Open the verified dashboard",
			does: "MS-3 publishes under policy FIN-DASH-2. Open Results, then the Revenue dashboard. When you are ready for the daily operation, open Controls and choose Run the next scheduled cycle now.",
			says: "Finance gets revenue by region, reconciled to the ledger to the cent, with the time of the last load on the dashboard.",
		},
		cycle: {
			title: "Run tomorrow morning",
			does: "The morning cycle is running: load, reconcile by region, refresh the dashboard and post the summary. Use Controls, then Skip, until it is verified.",
			says: "From here it’s operations: load at 05:30, reconcile at 06:00, dashboard by 07:00, and a person only for variances above $200.",
		},
		close: {
			title: "Close the story",
			does: "Open Activity to show the verified morning and its evidence. For the next customer, open a new tab or restart. A new revenue Discovery also starts Agentix again from zero.",
			says: "One Discovery, one package, and an agent team that went from nothing to running the work: built, tested, released and verified every morning. Finance made six decisions, each with its evidence in front of it; everything else ran on its own.",
		},
	},
}

if (REVENUE_SCRIPT.answers.length !== SCENARIOS.revenue.ownerInterview.length) {
	throw new Error(`Revenue demo: ${REVENUE_SCRIPT.answers.length} answers for ${SCENARIOS.revenue.ownerInterview.length} interview questions`)
}
