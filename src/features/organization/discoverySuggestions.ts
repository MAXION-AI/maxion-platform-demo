import { GLOSSARY, TERMS_HEADING } from "@/features/discovery-autonomous/deliverables/closemap"
import type { KnowledgeCitation, KnowledgeSuggestion } from "./knowledge"

/*
 * What an approved Discovery package suggests for the Knowledge library, by package. Only a
 * Discovery that maps how Northstar works today sends its package here; a design for agents goes
 * to Agentix instead. Each suggestion waits for an Owner or Admin (doc 22) and cites one section
 * of one document in the approved version: never an interview or a decision on its own, because
 * those reach Knowledge only through what a person approved. The owner's decision at the
 * Discovery's exception changes what three of them say, and the cited passages say the same.
 *
 * The close-mapping figures are the ones its package and the demo runbook use: 25 steps against
 * the written 11, 118 intercompany true-ups posted on day 4, the binding $25,000 threshold, and an
 * elimination workbook only Hannah Brooks runs.
 */

export const CLOSE_MAP_PACKAGE = "pkg_close_map_v1"

/* The suggestions the close-mapping demo's beats wait on. */
export const CLOSE_MAP_SUGGESTIONS = {
	procedure: "s-close-v5",
	elimination: "s-us-elimination",
	systems: "s-key-systems-v3",
	freeze: "s-freeze-v2",
} as const

/* The finance people who may see how the US elimination runs, as the owner asked in the interview. */
const FINANCE_ONLY = ["Sarah Liu", "Luca Romano", "Hannah Brooks"]

type Path = "window" | "freeze"

const CLOSE_BODY: Record<Path, string> = {
	window: "Day 1: Finance Operations opens the close task list in ServiceNow, closes the AP and AR subledgers, checks the overnight bank feed and reconciles the group bank accounts. In New York, US Finance closes the US subledgers and reconciles the US bank accounts.\n\nDay 2: the group and US accruals post, then Group FP&A posts the intercompany recharges and reconciles intercompany balances.\n\nDay 3: the Controller reviews the group trial balance and signs off the close in the task list. Payments and credits above the binding approval threshold ($25,000) go to a Finance Director. Group FP&A sends the flash report to the CFO. In New York, the US period closes and the US elimination runs (see US intercompany elimination); its results go to Group FP&A.\n\nDay 4: Finance Systems keeps P41 open to intercompany postings only. Group FP&A posts the intercompany true-ups with the Controller's approval, and the period closes. Nothing else posts to the prior period after day 3.\n\nAfter the true-ups: Group FP&A prepares the reporting pack and reconciles the flash report to the final ledger, and the Controller sends the pack to the CFO.\n\nEach of the 25 steps names its owner, its system and where it is evidenced, in the close-mapping package (Use case catalog, S-01 to S-25). Over the last twelve closes the median close took 5.5 working days.",
	freeze: "Day 1: Finance Operations opens the close task list in ServiceNow, closes the AP and AR subledgers, checks the overnight bank feed and reconciles the group bank accounts. In New York, US Finance closes the US subledgers and reconciles the US bank accounts.\n\nDay 2: the group and US accruals post, then Group FP&A posts the intercompany recharges and reconciles intercompany balances.\n\nDay 3: the Controller reviews the group trial balance and signs off the close in the task list. Payments and credits above the binding approval threshold ($25,000) go to a Finance Director. Group FP&A sends the flash report to the CFO. In New York, the US period closes and the US elimination runs (see US intercompany elimination); its results go to Group FP&A.\n\nDay 4: Finance Systems keeps P41 open, Group FP&A posts the intercompany true-ups, and the Controller reviews them afterwards. Each true-up is an exception to the day-3 freeze, recorded in the RAID register and owned by Group FP&A. Then the period closes.\n\nAfter the true-ups: Group FP&A prepares the reporting pack and reconciles the flash report to the final ledger, and the Controller sends the pack to the CFO.\n\nEach of the 25 steps names its owner, its system and where it is evidenced, in the close-mapping package (Use case catalog, S-01 to S-25). Over the last twelve closes the median close took 5.5 working days.",
}

const FREEZE_BODY: Record<Path, string> = {
	window: "From the third working day of a month-end close until the controller signs off, nothing is posted to the prior period, with one exception: intercompany true-ups may post on day 4 with the Controller's approval. Corrections go to the current period with a note that references the original document.",
	freeze: "From the third working day of a month-end close until the controller signs off, nothing is posted to the prior period. Intercompany true-ups posted on day 4 are exceptions to this rule, each recorded in the RAID register and owned by Group FP&A. Corrections go to the current period with a note that references the original document.",
}

/* The package sections the suggestions cite, by the headings the package reader shows. */
const CITES = {
	performed: { document: "Use case catalog", section: "The close as performed" },
	elimination: { document: "Use case catalog", section: "UC-02: US entity close and elimination", via: "from Hannah Brooks’ interview" },
	systems: { document: "Technical assessment", section: "Systems of record" },
	decision: { document: "RAID register", section: "Decided in Discovery", via: "the Controller’s decision" },
	terms: { document: "Use case catalog", section: TERMS_HEADING },
} satisfies Record<string, KnowledgeCitation>

function closeMapSuggestions(path: Path): KnowledgeSuggestion[] {
	return [
		{
			id: CLOSE_MAP_SUGGESTIONS.procedure, section: "procedures", title: "Month-end close", revises: "k-close", resolves: ["c-threshold"],
			body: CLOSE_BODY[path],
			changes: [
				"25 steps, each with an owner, a system and a source, instead of 11",
				"The approval threshold now follows the binding rule: $25,000, not $10,000",
				path === "window" ? "Day 4 documents the controlled window for intercompany true-ups" : "Day 4 lists the intercompany true-ups as performed, each an exception to the freeze",
				"The US close and elimination run on day 3 in New York, as performed",
				"Drops two written steps that no longer happen: the manual bank upload (now the bank feed) and the paper sign-off sheet (now a task in ServiceNow)",
			],
			cites: CITES.performed,
		},
		{
			id: CLOSE_MAP_SUGGESTIONS.elimination, section: "procedures", title: "US intercompany elimination", visibility: FINANCE_ONLY,
			body: "How the US entity's intercompany balances are eliminated at close, written down from Hannah Brooks' interview and the workbook itself. It runs on day 3, New York time.\n\n1. Close the US period in QuickBooks Online (company 934771).\n2. Export the US trial balance into the Elimination workbook (SharePoint, Finance / Close / US).\n3. Update the mapping tab for any new intercompany accounts; it maps QuickBooks accounts to group accounts.\n4. Run the workbook's three macros, in order.\n5. Send the results to Group FP&A, who post them with the day-4 true-ups. Today this goes by email, so no system holds the hand-off.\n\nHannah Brooks ran it in 11 of the last 12 closes. Until someone else has run it, this is the only written copy of the steps.",
			cites: CITES.elimination,
		},
		{
			id: CLOSE_MAP_SUGGESTIONS.systems, section: "profile", title: "Key systems and who owns them", revises: "k-systems",
			body: "SAP S/4HANA (production P41): Finance Systems, owner Elena Ortiz.\nSalesforce: Sales Operations, owner Marcus Reed.\nServiceNow: IT and Finance Operations, owner Andre Reyes. It also holds the close task list.\nQuickBooks Online (company 934771): US Finance, owner Sarah Liu.\nElimination workbook (SharePoint, Finance / Close / US): the US intercompany elimination, owner Hannah Brooks.\nSharePoint and OneDrive: everyone; engagement sites are owned by the engagement lead.",
			changes: ["Adds the close task list in ServiceNow", "Adds the Elimination workbook and its owner"],
			cites: CITES.systems,
		},
		{
			id: CLOSE_MAP_SUGGESTIONS.freeze, section: "rules", title: "No ledger changes after day 3 of the close", revises: "k-freeze",
			body: FREEZE_BODY[path],
			changes: [path === "window" ? "Adds the controlled day-4 window for intercompany true-ups" : "Says the day-4 intercompany true-ups are exceptions, owned by Group FP&A"],
			cites: CITES.decision,
		},
		{
			id: "s-day3-freeze", section: "glossary", title: "Day-3 freeze",
			body: path === "window" ? GLOSSARY.freezeWindow : GLOSSARY.freeze,
			cites: CITES.terms,
		},
		{
			id: "s-true-up", section: "glossary", title: "Intercompany true-up",
			body: GLOSSARY.trueUp,
			cites: CITES.terms,
		},
		{
			id: "s-elimination-workbook", section: "glossary", title: "Elimination workbook",
			body: GLOSSARY.workbook,
			cites: CITES.terms,
		},
		{
			id: "s-flash-report", section: "glossary", title: "Flash report",
			body: GLOSSARY.flash,
			cites: CITES.terms,
		},
	]
}

/*
 * The documents a Knowledge package's suggestions cite. Discovery marks them Required for a
 * package that goes to Knowledge, as it marks the technical documents for one that goes to Agentix:
 * switching one off is an owner exception, and the suggestions that cite it aren't sent.
 */
export const KNOWLEDGE_CITED_DOCUMENTS: readonly string[] = [...new Set(closeMapSuggestions("window").map((suggestion) => suggestion.cites.document))]

/* Only suggestions whose cited document is in the package the packet carries; no list means all of them. */
export const sentWith = (suggestions: readonly KnowledgeSuggestion[], outputs: readonly string[] | undefined) =>
	outputs ? suggestions.filter((suggestion) => outputs.includes(suggestion.cites.document)) : [...suggestions]

/*
 * The suggestions an approved package sends, or null when the package isn't one that goes to
 * Knowledge. `decision` is the owner's choice at the exception: approved is the controlled day-4
 * window, anything else keeps the freeze as written.
 */
export function packageSuggestions(packageId: string | undefined, decision: string | undefined): KnowledgeSuggestion[] | null {
	if (packageId !== CLOSE_MAP_PACKAGE) return null
	return closeMapSuggestions(decision === "approved" ? "window" : "freeze")
}
