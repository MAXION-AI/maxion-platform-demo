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
	replies: [
		"Got it: the real cost is a number nobody can explain, and about two days lost at every close while it’s chased by hand. That’s the cost I’ll design against.",
		"EMEA and APAC, found only at month-end. You suspect currency conversion, so I’ll verify reconciliation gaps in Billing ledger sample instead of asking you to guess. I’m running a quick read of it now.",
		"$50 a region each day, and anything over $200 stops with you before it’s posted. That becomes the check the agents run every morning.",
		"Posting date, at the posting-date rate, the way the ledger closes. I’ll hold every conversion to that, and flag anything that converts differently.",
		"Understood: nobody owns production releases yet, so that stays open and goes to Agentix as its first question. Dashboard publishing is already covered by FIN-DASH-2.",
		"That’s a clear bar: the ledger and AWS agree every morning, and finance opens the dashboard at 07:00 without checking first.",
	],
	heard: [
		{ label: "Cost of failure", value: "A number nobody can explain; the close slips about 2 days" },
		{ label: "Where it breaks", value: "EMEA and APAC, found at month-end; suspects currency conversion", check: { finding: "612 of 4,812 sampled invoices are non-USD, and 212 have no region code" } },
		{ label: "Daily tolerance", value: "$50 per region per day; over $200 goes to you first" },
		{ label: "Recognition rule", value: "Posting date, at the posting-date exchange rate" },
		{ label: "Release authority", value: "Open: nobody owns production releases · dashboards under FIN-DASH-2", open: true },
		{ label: "Success measure", value: "Ledger and AWS agree every morning; dashboard trusted at 07:00" },
	],
	calls: [
		{ person: "olivia", lines: [{ by: "max", text: "Olivia, who decides a variance above $200 today?" }, { by: "them", text: "I do, but only once an analyst finds it, usually at month-end." }], insight: "Decides variances over $200, and finds them at month-end" },
		{ person: "grace", lines: [{ by: "max", text: "Grace, how does the ledger convert non-USD invoices?" }, { by: "them", text: "At the posting-date rate. That’s how the ledger has always closed." }, { by: "max", text: "And region codes?" }, { by: "them", text: "Some invoices reach the ledger with no region at all." }], insight: "The ledger converts at posting-date rates" },
		{ person: "sam", lines: [{ by: "max", text: "Sam, what has to be true before a change reaches the revenue schema?" }, { by: "them", text: "It’s tested in isolation, and someone signs the release. Today nobody does." }], insight: "Releases need an owner; nobody holds it today" },
		{ person: "tom", lines: [{ by: "max", text: "Tom, which exchange rate do the close workbooks use?" }, { by: "them", text: "The invoice-date rate. That’s how the workbooks were built." }], insight: "The close workbooks convert at invoice-date rates" },
	],
	conflict: { between: ["grace", "tom"], summary: "The ledger converts at posting-date rates; Tom’s close workbooks use invoice-date rates. 14 invoices, $126.24 apart." },
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
