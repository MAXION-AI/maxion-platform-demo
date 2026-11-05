import { SCENARIOS } from "@/features/discovery-autonomous/model"
import { CLOSE_MAP_PACKAGE, CLOSE_MAP_SUGGESTIONS } from "@/features/organization/discoverySuggestions"
import type { KnowledgeDemoScript } from "./types"

/*
 * Month-end close mapping: the customer demo that builds nothing. Northstar's Controller asks how
 * the close actually runs, and the approved package goes to Knowledge as suggestions she publishes
 * one by one, instead of to Agentix.
 *
 * The answers follow the Discovery interview in order and land on the figures the package and the
 * suggestions carry: the day-3 freeze she wrote, the $25,000 threshold the procedure still gets
 * wrong, the elimination only Hannah Brooks can run, and the Finance-only visibility she asks for
 * (which the elimination procedure arrives with).
 */
export const CLOSE_MAP_SCRIPT: KnowledgeDemoScript = {
	id: "close-map",
	ending: "knowledge",
	label: "Close mapping demo",
	name: "Month-end close mapping",
	kicker: "close mapping demo",
	templateName: "Month-end close mapping",
	scenarioKey: "closemap",
	packageId: CLOSE_MAP_PACKAGE,
	/*
	 * The platform plan's first-release five (doc 05, D-122) and the executive brief every customer
	 * demo tells its story from. The Use case catalog is the process map, as doc 05 places current-
	 * state maps there; there's no As-Is / To-Be analysis, because this mission has no to-be, and no
	 * charter, business case or roadmap, because nothing is being built.
	 */
	outputs: ["Executive decision brief", "Requirements specification", "Technical assessment", "RAID register", "Project plan and WBS", "Use case catalog"],
	suggestions: { procedure: CLOSE_MAP_SUGGESTIONS.procedure, restricted: CLOSE_MAP_SUGGESTIONS.elimination },
	replacesLabel: "close mapping",
	answers: [
		"All three, honestly. The written close says four days, we never make it, and when one person is out it slips again.",
		"Day 3 onwards. What happens between my review and the reporting pack is a guess on my part. Check the journal log; I suspect people post after the freeze.",
		"Hannah in New York. She runs the US intercompany eliminations, and I couldn’t tell you how.",
		"The day-3 freeze is binding; it’s my rule. The approval threshold moved to $25,000 on October 1, so anything that still says $10,000 is wrong.",
		"I approve what becomes our procedure, and it’s published in Knowledge for every project. The elimination steps stay with Finance: Hannah, Luca and me.",
		"Anyone on the team can open the procedure and it matches what we did last month, and the close survives a holiday.",
	],
	replies: [
		"So the written close and the real one have drifted apart, and the close leans on people more than on the procedure. That’s what I’ll map.",
		"Day 3 onwards is where you stop trusting it. You suspect posting after the freeze, so I’ll verify late postings in Journal entry log instead of asking you to guess. I’m reading it now.",
		"Hannah runs the US eliminations and nobody else knows how. I’ll ask her to walk me through it, and treat it as a key-person risk until it’s written down.",
		"The day-3 freeze is binding and it’s yours. The threshold is $25,000 since October 1, so I’ll flag anything that still says $10,000.",
		"You approve the procedure and it’s published in Knowledge for every project. The elimination steps stay visible to Hannah, Luca and you only.",
		"That’s the bar: the procedure matches last month’s close, anyone can follow it, and it survives a holiday.",
	],
	heard: [
		{ label: "Why now", value: "The written close says four days and is never met; it slips when one person is out" },
		{ label: "Late postings", value: "Day 3 onwards is suspect; she believes people post after the freeze", check: { finding: "146 manual journals posted after day 3 in 12 closes; 118 are day-4 intercompany true-ups" } },
		{ label: "Who holds it", value: "Hannah Brooks runs the US eliminations; nobody else knows how" },
		{ label: "Rules and habits", value: "The day-3 freeze is binding; the approval threshold is $25,000 since Oct 1" },
		{ label: "Publishing", value: "The Controller approves; the elimination steps stay with Hannah, Luca and Sarah" },
		{ label: "Success measure", value: "The procedure matches last month’s close, and the close survives a holiday" },
	],
	calls: [
		{ person: "sarah", lines: [{ by: "max", text: "Sarah, what does the day-3 freeze protect?" }, { by: "them", text: "The numbers I’ve reviewed. Nothing should move after my review." }], insight: "The freeze protects the Controller’s review" },
		{ person: "elena", lines: [{ by: "max", text: "Elena, does anything post to P41 after day 3?" }, { by: "them", text: "Intercompany, every month. FP&A posts the true-ups." }], insight: "Intercompany posts to P41 after day 3, every month" },
		{ person: "luca", lines: [{ by: "max", text: "Luca, when do the intercompany true-ups post?" }, { by: "them", text: "Day 4. We can’t post them before QuickBooks closes in New York." }, { by: "max", text: "And who approves them?" }, { by: "them", text: "Sarah reviews them afterwards." }], insight: "True-ups post on day 4 and are reviewed after the fact" },
		{ person: "hannah", lines: [{ by: "max", text: "Hannah, how does the US elimination run?" }, { by: "them", text: "From my workbook. Three macros, and a mapping tab only I update." }], insight: "The US elimination runs from one person’s workbook" },
	],
	conflict: { between: ["sarah", "luca"], summary: "The written rule freezes the ledger after day 3; Group FP&A posts intercompany true-ups on day 4. The journal log shows 118 of them across twelve closes, $4,812,330.17 gross." },
	handoffNote: "Start with the procedure and the elimination; the glossary can wait.",
	steps: {
		start: {
			title: "Start the Discovery",
			does: "In Discover, choose the Month-end close mapping template, start the Discovery, tick the authority review and create it. Six documents are selected, with the Use case catalog as the process map; there’s no charter, because nothing is being built.",
			says: "This isn’t a project to build anything. The outcome is a description of our close that’s true, owned and cited, and the brief says “current state only”, so MAX doesn’t drift into a design.",
		},
		interview: {
			title: "Answer the owner interview",
			does: "Answer MAX’s six questions. Fill answer puts the scripted reply in the composer; press Enter to send it.",
			says: "On the second answer I give MAX a suspicion, not a fact. It doesn’t write my guess down as the procedure; it goes and reads twelve closes of the journal log.",
		},
		briefs: {
			title: "Approve the interview briefs",
			does: "Choose Review briefs and show Hannah Brooks’ brief: what MAX wants to learn and the evidence her grant allows. Then choose Approve all. Interviews stay closed until you do.",
			says: "Most of what a company knows isn’t written down; it’s in people like Hannah. Before MAX asks her anything, I see exactly what the interviewer will hold, and a person approves it.",
		},
		decision: {
			title: "Let MAX map, then decide",
			does: "Open Autonomy while MAX reads the four sources and talks to the four people. When the decision arrives, choose Publish a controlled day-4 intercompany window.",
			says: "Both are real: the freeze is written and approved, and 118 day-4 true-ups are regular and reviewed. Which one Northstar publishes as its procedure is a control decision. MAX shows me the evidence; it doesn’t make the call.",
		},
		package: {
			title: "Watch the package land",
			does: "Open Package while MAX writes the six selected documents. There’s no charter to approve, so this step ends as soon as they land.",
			says: "Six documents chosen for a mapping: how the close runs and who does each step, which system holds each record, what could go wrong, the test the procedure has to pass and the plan to prove it on the next close. Nothing about what to build.",
		},
		approve: {
			title: "Read the package, then approve the version",
			does: "Show the Use case catalog’s close as performed (25 steps, 16 of them written nowhere), then the RAID register’s key-person risk. Choose Approve package: the dialog names the exact version, the manifest and each document’s hash; confirm it.",
			says: "This is the map a new controller would take a month to piece together, and every step names who does it, in which system and where MAX saw it. Approval binds this exact version, and publishes nothing in Knowledge yet.",
		},
		handoff: {
			title: "Send the findings to Knowledge",
			does: "In the package, choose Continue to Knowledge, add a note if you like, and confirm. Knowledge opens with eight suggestions waiting.",
			says: "The package is a document. Knowledge is what every future Discovery and agent run reads first. The two meet only through suggestions a person approves.",
		},
		suggestions: {
			title: "Review the suggestions",
			does: "In Waiting on you, open Key systems and who owns them: it cites the Technical assessment’s Systems of record and lists what changes from v2. Choose Approve and publish. If the sheet asks for a recent sign-in, choose Sign in again first.",
			says: "Nothing Discovery learns becomes what we know until an Owner or Admin approves it, and every item says exactly where it came from.",
		},
		procedure: {
			title: "Publish Month-end close v5",
			does: "Open the Month-end close suggestion. It’s v5 of the published procedure: 25 steps instead of 11, the day-4 window and the $25,000 threshold. Choose Approve and publish; the Two approval thresholds conflict settles with it.",
			says: "An edit applies to new work only. Anything already running keeps v4 pinned, and the next Discovery or agent run reads v5.",
		},
		restricted: {
			title: "Keep the sensitive part with Finance",
			does: "Open US intercompany elimination, a procedure that didn’t exist before today. Visibility shows only Sarah Liu, Luca Romano and Hannah Brooks. Choose Approve and publish.",
			says: "Restricted knowledge reaches an agent only when the person it works for may see it. And Hannah’s workbook is no longer the only copy of how the US elimination runs.",
		},
		close: {
			title: "Close the story",
			does: "Show the library: three items published today and five still waiting, each with its source one click away. For the next customer, open a new tab or restart.",
			says: "One Discovery, and Northstar’s close is written down the way it actually runs: owned, cited, and no longer resting on one person’s workbook. The Controller made one decision and approved what she chose; MAX did the rest and showed its sources.",
		},
	},
}

if (CLOSE_MAP_SCRIPT.answers.length !== SCENARIOS.closemap.ownerInterview.length) {
	throw new Error(`Close mapping demo: ${CLOSE_MAP_SCRIPT.answers.length} answers for ${SCENARIOS.closemap.ownerInterview.length} interview questions`)
}
