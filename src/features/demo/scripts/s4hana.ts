import { SCENARIOS } from "@/features/discovery-autonomous/model"
import type { DemoScript } from "./types"

/*
 * S/4HANA conversion: the fourth customer demo, and the one a system integrator recognises. An IT
 * director asks MAXION which of 11,842 custom objects survive an ECC to S/4HANA conversion, which
 * SAP now does as standard, and which have to be kept because the business depends on how they
 * behave.
 *
 * The answers follow the Discovery interview in order and are written to land on the figures the
 * Agentix conversion engagement later works with: a twenty-execution archive threshold, the 38
 * behaviour exceptions, a nightly readiness gate, and a production transport authority nobody owns
 * yet (which becomes the proposal's first question).
 */
export const S4HANA_SCRIPT: DemoScript = {
	id: "s4hana",
	label: "S/4HANA conversion",
	name: "S/4HANA conversion",
	kicker: "S/4HANA conversion",
	templateName: "S/4HANA conversion",
	scenarioKey: "s4hana",
	packageId: "pkg_s4_conversion_v2",
	engagementId: "conversion",
	decisionVariant: "material-",
	publishPolicy: "ITGC-SAP-3",
	replacesLabel: "S/4HANA conversion",
	answers: [
		"The estimate. Six thousand person-days of remediation was priced off the ATC findings, and I have no idea how much of that code anyone still runs.",
		"Anything with no execution behind it they would retire without asking. Anything where SAP standard does the job differently always needs a decision. Check the custom code inventory; I suspect most of the estate is dead.",
		"Finance decides. If standard calculates something differently from the way we do it today, that is a business change, not a technical one, and it is not the developers’ call.",
		"If it has not run in a year, archive it. Under twenty executions in twelve months I would rather archive it and keep a way to bring it back than argue about it object by object.",
		"Nobody owns production S/4HANA transports today, so treat that as open. Dashboard publishing to the programme board is already covered by policy ITGC-SAP-3.",
		"Every transport is clean before it reaches the queue, nothing above the threshold is archived without me, and the board opens one dashboard at 07:00 instead of asking three people.",
	],
	replies: [
		"So the worry is the estimate itself: six thousand person-days priced off findings, with no idea how much of that code still runs. That’s the number I’ll test.",
		"Unused code gets retired without asking; anything standard does differently needs a decision. You suspect most of the estate is dead, so I’ll verify the object mix in Custom code inventory instead of asking you to guess. I’m reading it now.",
		"Finance decides: when standard calculates differently, that’s a business change, not the developers’ call.",
		"Not run in a year means archive, and under twenty runs in twelve months you’d rather archive with a way back. That’s the threshold the disposition map applies.",
		"Understood: production transports have no owner yet, so that goes to Agentix as an open question. Board dashboards are already covered by ITGC-SAP-3.",
		"That’s the bar: every transport clean before it reaches the queue, nothing above the threshold archived without you, and one dashboard at 07:00.",
	],
	heard: [
		{ label: "Decision pressure", value: "A 6,000 person-day estimate with unknown real usage" },
		{ label: "Object mix", value: "Unused code retires; anything that differs from standard needs a decision", check: { finding: "8,232 of 11,842 custom objects never ran in twelve months" } },
		{ label: "Standard adoption", value: "Finance decides when standard behaves differently" },
		{ label: "Archive tolerance", value: "Archive under 20 runs in 12 months, with a way back" },
		{ label: "Release authority", value: "Open: nobody owns production transports · dashboards under ITGC-SAP-3", open: true },
		{ label: "Success measure", value: "Clean transports; nothing above the threshold archived alone; one 07:00 dashboard" },
	],
	calls: [
		{ person: "anja", lines: [{ by: "max", text: "Anja, what did the 6,140 person-day estimate assume?" }, { by: "them", text: "That every object with a finding gets remediated. Nobody checked usage." }], insight: "The estimate assumed every finding is remediated" },
		{ person: "stefan", lines: [{ by: "max", text: "Stefan, which custom objects have a standard equivalent now?" }, { by: "them", text: "About four hundred. Most behave the same, so I’d switch them all." }, { by: "max", text: "All of them?" }, { by: "them", text: "If standard does the job, yes." }], insight: "412 standard equivalents; would switch them all" },
		{ person: "rosa", lines: [{ by: "max", text: "Rosa, does the credit check behave the same in standard?" }, { by: "them", text: "No. Ours counts open orders from quotation; standard counts from order entry." }], insight: "Credit check counts from quotation; standard from order entry" },
		{ person: "damian", lines: [{ by: "max", text: "Damian, how often do transports drift from what was tested?" }, { by: "them", text: "More than we’d like. Two hundred and fourteen in two years." }], insight: "214 drifting transports in 24 months" },
	],
	conflict: { between: ["stefan", "rosa"], summary: "38 custom objects behave differently from SAP standard; on the credit check alone, €2,412,880.40 of orders a month would block differently." },
	charterReason: "Scope, owners and the five exclusions match what the programme board and Finance Systems agreed.",
	handoffNote: "Start with the disposition map; the ownerless objects are the Development Lead’s to decide.",
	steps: {
		start: {
			title: "Start the Discovery",
			does: "In Discover, choose the S/4HANA conversion template, start the Discovery, tick the authority review and create it.",
			says: "Everything starts from a business outcome, not a ticket. MAX drafts the mission from the brief and asks up front what it may do without asking.",
		},
		interview: {
			title: "Answer the owner interview",
			does: "Answer MAX’s six questions. Fill answer puts the scripted reply in the composer; press Enter to send it.",
			says: "MAX only asks for judgement the records can’t supply. On the second answer it doesn’t ask me to guess how much code is live; it goes and reads twelve months of usage statistics.",
		},
		decision: {
			title: "Let MAX investigate, then decide",
			does: "Open Autonomy while MAX reads the four sources and interviews the four owners. When the decision arrives, choose Adopt SAP standard and change the process.",
			says: "This is the part an SI bills six weeks for. MAX found 412 objects that SAP now does as standard, proved 374 behave identically, and isolated the 38 that don’t. That last group changes what the business sees, so it stops and asks, and keeps every other branch moving.",
		},
		package: {
			title: "Read the package and approve the charter",
			does: "Open Package when the nine documents land. Show the executive brief, then the business case. Then choose Continue to Agentix and approve the project charter with a reason.",
			says: "Nine documents a senior consultant would sign, all tied to one set of numbers: 11,842 objects, 3,610 of them executed in a year, and 4,660 person-days that come out of the estimate on evidence rather than on optimism. The charter is the one thing that blocks the handoff.",
		},
		handoff: {
			title: "Hand the package to Agentix",
			does: "In the handoff, add a note if you like and choose Continue to Agentix.",
			says: "The packet is frozen, so the agents work from exactly what the programme board approved.",
		},
		proposal: {
			title: "Create the engagement in Agentix",
			does: "Answer the two questions (ask before each pipeline release; the sandbox copy of the repository), choose Run the read-only check, then Activate engagement.",
			says: "Nothing existed in Agentix for this until the handoff. Agentix turned the Discovery into an engagement: four agents with separate permissions, the systems they may touch, three milestones and a nightly sweep. Discovery couldn’t confirm who approves production transports, so that’s the first question.",
		},
		mapping: {
			title: "Decide the ownerless objects",
			does: "Open MS-1 in Work. When the remediation specialist asks about 212 objects in use with no named owner, choose Hold them for the Development Lead.",
			says: "The agent found what Discovery flagged: 212 objects the system runs that nobody will claim. Remediating them quietly would carry someone else’s debt into S/4HANA, so the specialist asks rather than choosing.",
		},
		pipeline: {
			title: "Watch a check fail and the repair",
			does: "Open MS-2. Its first version dispositions the exceptions in bulk, so two of its twelve checks fail, behaviour and credit exposure; open that version to show the 38 objects. The remediation specialist repairs the rule and the checks pass. Use Controls, then Skip, to move faster.",
			says: "This is the Discovery decision paying off: the 38 exceptions became a test, and the test caught the pipeline applying the standard credit rule to €2,412,880.40 of monthly exposure before anything reached production.",
		},
		release: {
			title: "Approve the production release",
			does: "Review the release: its target, checks and recovery limits. Choose Approve release. The adapter times out after the transport on purpose; watch the coordinator read the transport back instead of releasing it again.",
			says: "Nothing reaches production S/4HANA without the policy the owner chose. When the adapter goes quiet after a release, the agent doesn’t send the transport twice; it reads back what actually landed.",
		},
		dashboard: {
			title: "Open the verified dashboard",
			does: "MS-3 publishes under policy ITGC-SAP-3. Open Results, then the conversion readiness dashboard. When you are ready for the nightly operation, open Controls and choose Run the next scheduled cycle now.",
			says: "The programme board gets what is dispositioned, what drifted and on whom, and what remains before cutover, with the time of the last sweep on the dashboard.",
		},
		cycle: {
			title: "Run tonight’s sweep",
			does: "The nightly sweep is running: read the day’s transports, test each against the readiness variant, block what drifts and refresh the dashboard. Use Controls, then Skip, until it is verified.",
			says: "From here it’s operations: the sweep at 22:00, a refusal in the developer’s hands by 23:00, the board’s dashboard by 07:00, and a person only for what genuinely needs one.",
		},
		close: {
			title: "Close the story",
			does: "Open Activity to show the verified sweep and its evidence. For the next customer, open a new tab or restart. A new S/4HANA conversion Discovery also starts Agentix again from zero.",
			says: "One Discovery, one package, and an agent team that went from nothing to running the work: dispositioned, remediated, released and verified every night. The programme made six decisions, each with its evidence in front of them; everything else ran on its own.",
		},
	},
}

if (S4HANA_SCRIPT.answers.length !== SCENARIOS.s4hana.ownerInterview.length) {
	throw new Error(`S/4HANA demo: ${S4HANA_SCRIPT.answers.length} answers for ${SCENARIOS.s4hana.ownerInterview.length} interview questions`)
}
