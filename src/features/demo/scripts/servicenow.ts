import { SCENARIOS } from "@/features/discovery-autonomous/model"
import type { DemoScript } from "./types"

/*
 * AP invoice exceptions: the ServiceNow customer demo. A head of accounts payable asks MAXION to
 * clear the invoice exception queue without losing control of who may approve what.
 *
 * The answers follow the Discovery interview in order and are written to land on the figures the
 * Agentix engagement later works with: a negotiated contract tolerance of ±1.5% against the
 * purchase order's ±2% or $25, a $5,000 escalation threshold, a delegation of authority nobody
 * has re-attested, and a production release authority nobody owns yet (which becomes the
 * proposal's first question).
 */
export const SERVICENOW_SCRIPT: DemoScript = {
	id: "servicenow",
	label: "AP invoice exceptions",
	name: "AP invoice exceptions",
	kicker: "AP invoice exceptions",
	templateName: "AP invoice exceptions",
	scenarioKey: "servicenow",
	packageId: "pkg_ap_exceptions_v2",
	engagementId: "payables",
	decisionVariant: "contract-",
	publishPolicy: "FIN-AP-7",
	replacesLabel: "AP invoice exceptions",
	answers: [
		"The days it sits. An exception takes twenty minutes of work and a week of calendar, and we lose the early-payment discount while it waits.",
		"Price inside a tolerance band, quantity rounding, freight coding and a wrong tax jurisdiction never need a question. Anything with no contract, or a supplier in dispute, always does.",
		"The contract wins. If procurement negotiated ±1.5% then ±1.5% is the number, whatever the purchase order was set up with.",
		"Anything above $5,000 comes to a named approver, and honestly we don’t know they still hold it. The authority matrix hasn’t been re-attested in two years.",
		"Nobody owns production ServiceNow changes today, so treat that as open. Dashboard publishing to the finance group is already covered by policy FIN-AP-7.",
		"Mechanical exceptions clear the same day, nothing above $5,000 clears on its own, and I open one dashboard at 08:00 instead of asking three analysts.",
	],
	charterReason: "Scope, owners and the five exclusions match what finance and procurement agreed.",
	handoffNote: "Start with the taxonomy; the no-contract rule is Procurement’s to decide.",
	steps: {
		start: {
			title: "Start the Discovery",
			does: "In Discover, choose the AP invoice exceptions template, start the Discovery, tick the authority review and create it.",
			says: "Everything starts from a business outcome, not a ticket. MAX drafts the mission from the brief and asks up front what it may do without asking.",
		},
		interview: {
			title: "Answer the owner interview",
			does: "Answer MAX’s six questions. Fill answer puts the scripted reply in the composer; press Enter to send it.",
			says: "MAX only asks for judgement the records can’t supply. On the second answer it doesn’t ask me to guess the mix; it goes and classifies twelve months of the queue.",
		},
		decision: {
			title: "Let MAX investigate, then decide",
			does: "Open Autonomy while MAX reads the four sources and interviews the four owners. When the decision arrives, choose Make the contract tolerance authoritative.",
			says: "This is the part a consulting team spends weeks on. MAX found two tolerance rules, each applied consistently, disagreeing on 240 invoices worth $84,310.55. That’s commercial policy, so it stops and asks, and keeps every other branch moving.",
		},
		package: {
			title: "Read the package and approve the charter",
			does: "Open Package when the nine documents land. Show the executive brief, then the RAID register. Then choose Continue to Agentix and approve the project charter with a reason.",
			says: "Nine documents a senior consultant would sign, all tied to one set of numbers: 22,180 exceptions, 61% of them rules a pipeline can apply, $412,880.40 of discounts forfeited. The charter is the one thing that blocks the handoff.",
		},
		handoff: {
			title: "Hand the package to Agentix",
			does: "In the handoff, add a note if you like and choose Continue to Agentix.",
			says: "The packet is frozen, so the agents work from exactly what finance and procurement approved.",
		},
		proposal: {
			title: "Create the engagement in Agentix",
			does: "Answer the two questions (ask before each pipeline release; the synthetic sweep), choose Run the read-only check, then Activate engagement.",
			says: "Nothing existed in Agentix for this until the handoff. Agentix turned the Discovery into an engagement: four agents with separate permissions, the systems they may touch, three milestones and a daily sweep. Discovery couldn’t confirm who approves production changes, so that’s the first question.",
		},
		mapping: {
			title: "Decide the no-contract rule",
			does: "Open MS-1 in Work. When the triage specialist asks about 318 exceptions with no contract on file, choose Route them to the category buyer.",
			says: "The agent found what Discovery flagged: one in six open cases has no negotiated terms to test against. It’s a commercial rule, so the specialist asks rather than choosing.",
		},
		pipeline: {
			title: "Watch a check fail and the repair",
			does: "Open MS-2. Its first version fails two checks, tolerance and discount capture; open that version to show the 240 cases. The triage specialist repairs the lookup and the checks pass. Use Controls, then Skip, to move faster.",
			says: "This is the Discovery decision paying off: the negotiated tolerance became a test, and the test caught the pipeline clearing against the purchase order before anything reached production.",
		},
		release: {
			title: "Approve the production release",
			does: "Review the release: its target, checks and recovery limits. Choose Approve release. The adapter’s acknowledgement is lost on purpose; watch the coordinator read the update set back.",
			says: "Nothing reaches the production instance without the policy the owner chose. When the adapter goes quiet, the agent doesn’t resubmit the update set; it reads back what actually applied first.",
		},
		dashboard: {
			title: "Open the verified dashboard",
			does: "MS-3 publishes under policy FIN-AP-7. Open Results, then the AP exception dashboard. When you are ready for the daily operation, open Controls and choose Run the next scheduled cycle now.",
			says: "Finance gets the queue by class and age, with what cleared, what is waiting and on whom, and the time of the last sweep on the dashboard.",
		},
		cycle: {
			title: "Run tomorrow morning",
			does: "The morning sweep is running: classify, test against contract terms, route what needs a person and refresh the dashboard. Use Controls, then Skip, until it is verified.",
			says: "From here it’s operations: sweep at 06:00, clear by 07:00, dashboard by 08:00, and a person only for what genuinely needs one.",
		},
		close: {
			title: "Close the story",
			does: "Open Activity to show the verified sweep and its evidence. For the next customer, open a new tab or restart. A new AP exceptions Discovery also starts Agentix again from zero.",
			says: "One Discovery, one package, and an agent team that went from nothing to running the work: built, tested, released and verified every morning. Finance made six decisions, each with its evidence in front of it; everything else ran on its own.",
		},
	},
}

if (SERVICENOW_SCRIPT.answers.length !== SCENARIOS.servicenow.ownerInterview.length) {
	throw new Error(`ServiceNow demo: ${SERVICENOW_SCRIPT.answers.length} answers for ${SCENARIOS.servicenow.ownerInterview.length} interview questions`)
}
