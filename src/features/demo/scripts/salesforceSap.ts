import { SCENARIOS } from "@/features/discovery-autonomous/model"
import type { DemoScript } from "./types"

/*
 * Salesforce–SAP order sync: the third customer demo. A VP of revenue operations asks MAXION to
 * stop booked Salesforce orders failing on the way into SAP, and to settle which system owns the
 * customer.
 *
 * The answers follow the Discovery interview in order and are written to land on the figures the
 * Agentix engagement later works with: one authoritative customer master, a $50,000 escalation
 * threshold, a posting rule that forbids duplicates, and a production release authority nobody
 * owns yet (which becomes the proposal's first question).
 */
export const SALESFORCE_SAP_SCRIPT: DemoScript = {
	id: "salesforce-sap",
	label: "Salesforce–SAP order sync",
	name: "Salesforce–SAP order sync",
	kicker: "Salesforce–SAP order sync",
	templateName: "Salesforce–SAP order sync",
	scenarioKey: "ordersync",
	packageId: "pkg_order_sync_v2",
	engagementId: "orders",
	decisionVariant: "material-",
	publishPolicy: "ITGC-SOX-4",
	replacesLabel: "Salesforce–SAP order sync",
	answers: [
		"The bookings sitting unbilled. Two million dollars of signed business missed its billing run last quarter because a post failed, and we found out at quarter end.",
		"Anything where the data is simply wrong in one system, they fix without asking. Anything where a SKU doesn’t exist in SAP, or the price doesn’t match the quote, always needs someone to decide. Check the Salesforce order records; I suspect the customer master is behind most of it.",
		"SAP wins. The business partner is what we bill and pay tax against, so if Salesforce disagrees, Salesforce is the one that’s wrong.",
		"We must never create a second sales order. Cancelling a duplicate leaves a trail we have to explain at audit, so if a post times out, check before you post again.",
		"Nobody owns production SAP changes today, so treat that as open. Cockpit publishing to the finance group is already covered by policy ITGC-SOX-4.",
		"Every booked order has an SAP number the same day, nothing above $50,000 posts without me, and I stop hearing about duplicates entirely.",
	],
	replies: [
		"So the cost is billing you can’t see: two million dollars of signed business missed its run last quarter, and you found out at quarter end. That’s what I’ll design against.",
		"Wrong data in one system gets fixed without asking; a missing SKU or a price that doesn’t match the quote needs a decision. You suspect the customer master, so I’ll verify the failure mix in Salesforce order records instead of asking you to guess. I’m reading them now.",
		"SAP wins: the business partner is what you bill and pay tax against, so Salesforce gets corrected to match it.",
		"Never a second sales order. If a post times out, the agents check SAP before they post again, and that becomes a test the pipeline has to pass.",
		"Understood: production SAP changes have no owner yet, so that goes to Agentix as an open question. Cockpit publishing is already covered by ITGC-SOX-4.",
		"That’s the bar: an SAP number for every booked order the same day, nothing over $50,000 without you, and no more duplicates.",
	],
	heard: [
		{ label: "Cost of failure", value: "Signed bookings sit unbilled until quarter end" },
		{ label: "Failure mix", value: "Data fixes are mechanical; a missing SKU or a price mismatch needs a decision", check: { finding: "512 of 1,340 sync failures trace to the customer master" } },
		{ label: "Master authority", value: "The SAP business partner wins over Salesforce" },
		{ label: "Posting integrity", value: "Never a second sales order; check SAP after a timeout" },
		{ label: "Release authority", value: "Open: nobody owns production SAP changes · cockpit under ITGC-SOX-4", open: true },
		{ label: "Success measure", value: "Same-day SAP number per order; nothing over $50,000 alone; no duplicates" },
	],
	calls: [
		{ person: "nadia", lines: [{ by: "max", text: "Nadia, when do you find out an order didn’t bill?" }, { by: "them", text: "At quarter end, when the catch-up starts. Six of the last eight quarters." }], insight: "A manual catch-up in 6 of the last 8 quarters" },
		{ person: "ryan", lines: [{ by: "max", text: "Ryan, where does Salesforce take a customer’s tax jurisdiction from?" }, { by: "them", text: "From the account in Salesforce. Sales keeps it current, so we trust it." }, { by: "max", text: "And when SAP disagrees?" }, { by: "them", text: "Whichever system posts first sets the tax." }], insight: "Salesforce trusts its own account record" },
		{ person: "meilin", lines: [{ by: "max", text: "Mei Lin, which record does SAP bill against?" }, { by: "them", text: "The business partner. On some accounts it doesn’t match Salesforce at all." }], insight: "SAP bills against the business partner" },
		{ person: "gordon", lines: [{ by: "max", text: "Gordon, what does audit see when a duplicate order is cancelled?" }, { by: "them", text: "A cancellation we have to explain. We had a hundred and three last year." }], insight: "103 cancelled duplicates to explain at audit" },
	],
	conflict: { between: ["ryan", "meilin"], summary: "187 accounts carry a different address and tax jurisdiction in Salesforce than in the SAP business partner, across $612,480.90 of orders." },
	charterReason: "Scope, owners and the five exclusions match what revenue operations and internal controls agreed.",
	handoffNote: "Start with the mapping; the unmapped-SKU rule is product operations’ to decide.",
	steps: {
		start: {
			title: "Start the Discovery",
			does: "In Discover, choose the Salesforce–SAP order sync template, start the Discovery, tick the authority review and create it.",
			says: "Everything starts from a business outcome, not a ticket. MAX drafts the mission from the brief and asks up front what it may do without asking.",
		},
		interview: {
			title: "Answer the owner interview",
			does: "Answer MAX’s six questions. Fill answer puts the scripted reply in the composer; press Enter to send it.",
			says: "MAX only asks for judgement the records can’t supply. On the second answer it doesn’t ask me to guess the mix; it goes and classifies twelve months of failures.",
		},
		decision: {
			title: "Let MAX investigate, then decide",
			does: "Open Autonomy while MAX reads the four sources and interviews the four owners. When the decision arrives, choose Make the SAP business partner authoritative.",
			says: "This is the part a consulting team spends weeks on. MAX found two customer records, each internally consistent, disagreeing on 187 accounts across $612,480.90 of orders. That’s finance policy, so it stops and asks, and keeps every other branch moving.",
		},
		package: {
			title: "Read the package and approve the charter",
			does: "Open Package when the nine documents land. Show the executive brief, then the RAID register. Then choose Continue to Agentix and approve the project charter with a reason.",
			says: "Nine documents a senior consultant would sign, all tied to one set of numbers: 1,340 failures, 4.2 days to fix each one, $2,147,320.60 of bookings unbilled at quarter end. The charter is the one thing that blocks the handoff.",
		},
		handoff: {
			title: "Hand the package to Agentix",
			does: "In the handoff, add a note if you like and choose Continue to Agentix.",
			says: "The packet is frozen, so the agents work from exactly what revenue operations and internal controls approved.",
		},
		proposal: {
			title: "Create the engagement in Agentix",
			does: "Answer the two questions (ask before each pipeline release; the synthetic order sample), choose Run the read-only check, then Activate engagement.",
			says: "Nothing existed in Agentix for this until the handoff. Agentix turned the Discovery into an engagement: four agents with separate permissions, the systems they may touch, three milestones and a daily sync. Discovery couldn’t confirm who approves production SAP changes, so that’s the first question.",
		},
		mapping: {
			title: "Decide the unmapped-SKU rule",
			does: "Open MS-1 in Work. When the integration specialist asks about 94 SKUs with no SAP material, choose Block the order and raise it to product ops.",
			says: "The agent found what Discovery flagged: 94 products we sell that SAP has never heard of. Posting them against a placeholder would bill the wrong thing, so the specialist asks rather than choosing.",
		},
		pipeline: {
			title: "Watch a check fail and the repair",
			does: "Open MS-2. Its first version resolves customers from Salesforce, so two of its twelve checks fail, tax determination and pricing; open that version to show the 187 accounts. The integration specialist repairs the resolution and the checks pass. Use Controls, then Skip, to move faster.",
			says: "This is the Discovery decision paying off: the customer master became a test, and the test caught the pipeline taxing against the wrong address before anything reached production SAP.",
		},
		release: {
			title: "Approve the production release",
			does: "Review the release: its target, checks and recovery limits. Choose Approve release. The adapter times out after posting on purpose; watch the coordinator check the idempotency key instead of posting again.",
			says: "Nothing reaches production SAP without the policy the owner chose. When the adapter goes quiet after a post, the agent doesn’t create a second sales order; it reads back what actually landed.",
		},
		dashboard: {
			title: "Open the verified cockpit",
			does: "MS-3 publishes under policy ITGC-SOX-4. Open Results, then the order exception cockpit. When you are ready for the daily operation, open Controls and choose Run the next scheduled cycle now.",
			says: "Revenue operations get what posted, what is blocked and on whom, and what is at risk for the quarter, with the time of the last sync on the cockpit.",
		},
		cycle: {
			title: "Run tomorrow morning",
			does: "The morning sync is running: read the booked orders, resolve each one, post under its key and refresh the cockpit. Use Controls, then Skip, until it is verified.",
			says: "From here it’s operations: sync at 06:00, order numbers back in Salesforce by 07:00, cockpit by 08:00, and a person only for what genuinely needs one.",
		},
		close: {
			title: "Close the story",
			does: "Open Activity to show the verified sync and its evidence. For the next customer, open a new tab or restart. A new order sync Discovery also starts Agentix again from zero.",
			says: "One Discovery, one package, and an agent team that went from nothing to running the work: built, tested, released and verified every morning. Revenue operations made six decisions, each with its evidence in front of them; everything else ran on its own.",
		},
	},
}

if (SALESFORCE_SAP_SCRIPT.answers.length !== SCENARIOS.ordersync.ownerInterview.length) {
	throw new Error(`Order sync demo: ${SALESFORCE_SAP_SCRIPT.answers.length} answers for ${SCENARIOS.ordersync.ownerInterview.length} interview questions`)
}
