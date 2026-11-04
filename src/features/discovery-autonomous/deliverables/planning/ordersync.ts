import type { DeliverableBody } from "../types"

// Project plan and use case catalog for the Salesforce to SAP order sync at Arcline Technologies.
// Derived from the implementation roadmap, requirements, process analysis, RAID register and charter
// in ../ordersync.ts: the same milestones, figures, systems and owners. All data is synthetic.

export const WBS: DeliverableBody = {
	heading: "Twelve work packages deliver the three roadmap milestones in four weeks, and only one of them, the production release, cannot be undone.",
	lede: "This plan breaks the roadmap's MS-1 mapping, MS-2 pipeline and MS-3 cockpit into packages with one owner, a dependency and an exit a person can check. The order comes from dependency: nothing can be tested until the customer and every line resolve to one thing, nothing reaches production SAP until all twelve checks pass, and the cockpit means nothing until orders are posting.",
	metrics: [
		{ value: "3", label: "Milestones", note: "MS-1 mapping, MS-2 pipeline, MS-3 cockpit" },
		{ value: "12", label: "Checks on the pipeline", note: "All must pass before release" },
		{ value: "1", label: "Production release", note: "The only irreversible step" },
	],
	keyMessages: [
		{ label: "MS-1 sets the rules everything else is tested against", detail: "WBS-1.4 and WBS-1.5 give R-03, R-05 and R-08 a rule to test. Until they close, the twelve checks in WBS-2.1 cannot be signed." },
		{ label: "MS-2 happens entirely in the sandbox until its last package", detail: "The build and the checks run against the synthetic 30-day order sample. Only WBS-2.4 touches production SAP, inside the Thursday 21:00 to 01:00 London window." },
		{ label: "MS-3 starts only when orders are posting", detail: "The cockpit depends on the release because a cockpit published before orders post would show an empty result and teach finance to distrust it." },
	],
	sections: [
		{
			heading: "Work breakdown",
			paragraphs: [
				"WBS-1 is MS-1, WBS-2 is MS-2 and WBS-3 is MS-3. Packages due at activation sit in WBS-1 because MS-1 cannot finish without them.",
				"The owner is the person accountable for the exit. The agent duties in the target operating model do the sandbox work, and no agent duty owns a package here.",
			],
			exhibit: {
				kind: "table",
				title: "Every package ends in a check a person can read, and the release has no named approver yet",
				caption: "Work packages in dependency order, with owners and dues taken from the next steps in the source documents.",
				source: "Implementation roadmap · Requirements specification · RAID register",
				columns: ["ID", "Work package", "Owner", "Depends on", "Due", "Exit criterion"],
				rows: [
					{ cells: ["WBS-1.1", "Answer the release-approval and unmapped-SKU questions", "Mei Lin Tan, Nadia Fournier", "None", "At activation", "Both open decisions in the RAID table carry a recorded answer"] },
					{ cells: ["WBS-1.2", "Provision the sandbox and confirm the 30-minute sync bound", "Ryan Castellanos", "None", "At activation", "30-day synthetic sample and material copy loaded; peak day runs within 30 minutes"] },
					{ cells: ["WBS-1.3", "Test the external reference and sandbox pricing assumptions", "Mei Lin Tan", "WBS-1.2", "Week 1", "Reference is free and indexed; sandbox pricing procedures match production"] },
					{ cells: ["WBS-1.4", "Write the customer master rule into R-03 and R-05", "Gordon Achebe", "None", "Week 1", "Both requirements have a rule to test; the 187 disagreeing accounts are listed"], emphasis: true },
					{ cells: ["WBS-1.5", "Map active SKUs to SAP materials and write the unmapped-SKU rule", "Nadia Fournier", "WBS-1.1", "Week 1", "R-08 is testable: each active SKU maps to one material or follows the rule"] },
					{ cells: ["WBS-1.6", "Confirm the $50,000 threshold and name blocked-order owners", "Nadia Fournier", "WBS-1.5", "Week 1", "$50,000 confirmed; each of the four blocking triggers names one owner"] },
					{ cells: ["WBS-2.1", "Sign off the twelve derived checks", "Mei Lin Tan", "WBS-1.4, WBS-1.6", "Week 2", "Twelve checks signed before the first pipeline version exists"] },
					{ cells: ["WBS-2.2", "Build the sync in the sandbox: resolve, map, post under a key", "Mei Lin Tan", "WBS-1.2, WBS-1.3, WBS-2.1", "Week 3", "A retry on the synthetic sample creates no second sales order (R-11)"] },
					{ cells: ["WBS-2.3", "Run the twelve checks on one pipeline version", "Mei Lin Tan", "WBS-2.2", "Week 3", "All twelve pass on the same version; any failure sends the version back"] },
					{ cells: ["WBS-2.4", "Release the passing version to production SAP", "Mei Lin Tan; approver open", "WBS-1.1, WBS-2.3", "Week 3 to 4 boundary", "Transport applied in a Thursday window and the target state read back"], emphasis: true },
					{ cells: ["WBS-3.1", "Agree the escalation path for a sync over its 30-minute bound", "Ryan Castellanos", "WBS-2.3", "Week 4", "A run past 30 minutes reaches a named person by a written path"] },
					{ cells: ["WBS-3.2", "Agree the 08:00 view, publish the cockpit, start the daily run", "Nadia Fournier", "WBS-2.4, WBS-3.1", "Week 4", "Cockpit published by 08:00 London under ITGC-SOX-4 with posted orders in it"] },
				],
			},
		},
		{
			heading: "Sequence",
			paragraphs: [
				"The milestones run in strict order over the roadmap's four weeks. The roadmap puts the release at the boundary between MS-2 and MS-3 and does not name the Thursday, so that date is open until Mei Lin Tan confirms the sequence against the finance release train.",
			],
			exhibit: {
				kind: "timeline",
				title: "Nothing touches production SAP until three weeks of sandbox work have passed twelve checks",
				caption: "The three milestones in dependency order, with activation at the start and the production release at the MS-2 boundary.",
				source: "Implementation roadmap · Discovery workshop",
				ticks: ["Week 1", "Week 2", "Week 3", "Week 4"],
				lanes: [
					{ label: "MS-1 Mapping", bars: [{ label: "Master, materials, SKU rule", start: 0, span: 1, tone: "brand" }] },
					{ label: "MS-2 Pipeline", bars: [{ label: "Sign off, build, run twelve checks", start: 1, span: 2, tone: "brand" }] },
					{ label: "MS-3 Cockpit", bars: [{ label: "Publish under ITGC-SOX-4", start: 3, span: 1, tone: "brand" }] },
				],
				markers: [{ label: "Activation", at: 0 }, { label: "Production release", at: 3 }],
			},
		},
		{
			heading: "What the plan depends on",
			paragraphs: [
				"Three of these are decisions held by a named person. The rest are facts to confirm in Week 1 or at activation.",
			],
			bullets: [
				{ label: "The decision recorded in the RAID register", detail: "Which record governs the customer. WBS-1.4 waits on it, and through WBS-2.1 so do WBS-2.2, WBS-2.3, WBS-2.4 and MS-3. Gordon Achebe owns it." },
				{ label: "Who may approve a production SAP change", detail: "Open, with Mei Lin Tan to answer at activation (WBS-1.1). WBS-2.4 cannot run without it, whatever the checks show." },
				{ label: "How orders with an unmapped SKU are treated", detail: "Open, with Nadia Fournier to answer (WBS-1.1). WBS-1.5 and WBS-1.6 wait on it, and it covers the class behind 341 failures." },
				{ label: "The external reference on the sales order header", detail: "An assumption tested in WBS-1.3. R-11 and the end of the 103-duplicate issue rest on it, and it does not wait on any decision." },
				{ label: "The shared change window", detail: "Thursday 21:00 to 01:00 London, alongside the finance release train. A release that overruns holds and reconciles by key rather than assuming it applied." },
				{ label: "What does not wait", detail: "The sandbox, the sync bound and the external reference test can all start at activation, whichever way the decision recorded in the RAID register goes." },
			],
		},
	],
	findings: [
		{ label: "One rule holds up everything after MS-1", detail: "R-03 and R-05 have no rule to test until the decision recorded in the RAID register is written into WBS-1.4, and the twelve checks cannot be signed before then." },
		{ label: "The release is the only irreversible step", detail: "Everything before WBS-2.4 runs in the sandbox against synthetic data, so the approver is asked for exactly one thing that cannot be undone." },
		{ label: "Two sources give different dates for the unmapped-SKU rule", detail: "The executive brief says the first milestone and the RAID register says activation. The plan uses the earlier date, and Nadia Fournier confirms it." },
	],
	nextSteps: [
		{ action: "Write the outcome of the decision recorded in the RAID register into R-03 and R-05", owner: "Gordon Achebe, Director of Internal Controls", due: "Before the first milestone" },
		{ action: "Confirm the four-week sequence and the release Thursday against the finance release train", owner: "Mei Lin Tan, SAP Order-to-Cash Lead", due: "At engagement activation" },
		{ action: "Answer how orders with an unmapped SKU are treated", owner: "Nadia Fournier, VP Revenue Operations", due: "At engagement activation" },
	],
	citations: [
		"Implementation roadmap · Discovery workshop with Revenue Operations and Finance Systems",
		"Requirements workshop · Revenue Operations and Finance Systems",
		"Discovery register · Revenue Operations, Finance Systems, Internal Controls",
		"Change calendar · finance release train · Thursday 21:00 to 01:00 London",
	],
}

export const CATALOG: DeliverableBody = {
	heading: "Six use cases cover order sync: one is how it fails today, three are proposed, and two cannot be finished until a named person decides who has authority.",
	lede: "The catalog separates what happens now from what the target process proposes and from what nobody has settled yet. Each use case has one accountable actor, a stated trigger and steps whose decision rules come from the requirements. Where the source has no rule, the step says Open and names who settles it.",
	metrics: [
		{ value: "1,340", label: "Failures behind UC-01", note: "Twelve months, 18,942 booked orders" },
		{ value: "4", label: "Blocking triggers in UC-03", note: "Where a person must decide" },
		{ value: "$612,480.90", label: "Orders behind UC-05", note: "Tax set by whichever record was read first" },
	],
	keyMessages: [
		{ label: "The current use case has no accountable actor", detail: "The failure queue has zero named owners, so a failed order waits for whoever is free. Every proposed use case replaces that with a named person." },
		{ label: "The proposed use cases split posting from deciding", detail: "UC-02 posts what resolves, UC-03 stops what meets a trigger, and UC-04 makes a timeout a read instead of a second create. None of them changes a price or a customer record." },
		{ label: "The unresolved use cases are about authority", detail: "UC-05 waits on the decision recorded in the RAID register, and UC-06 waits on who may approve a production SAP change. Evidence cannot settle either one." },
	],
	sections: [
		{
			heading: "Catalog",
			paragraphs: [
				"Status shows where each use case stands at handoff. Current is today's process, Proposed is the target process and Unresolved waits on a decision.",
			],
			exhibit: {
				kind: "table",
				title: "Two of the six use cases cannot be closed until someone with authority decides",
				caption: "Every use case in the order sync engagement, with its trigger and the actor accountable for its outcome.",
				source: "As-Is / To-Be process analysis · Requirements specification · RAID register",
				columns: ["ID", "Use case", "Trigger", "Accountable actor", "Status"],
				rows: [
					{ cells: ["UC-01", "Repair a failed order by hand", "Nightly post fails", "None named today", "Current"] },
					{ cells: ["UC-02", "Post a booked order the same day", "Booked order read at 06:00", "Nadia Fournier", "Proposed"] },
					{ cells: ["UC-03", "Block an order and route it to its owner", "One of four blocking triggers is met", "Nadia Fournier", "Proposed"] },
					{ cells: ["UC-04", "Recover a timed-out post by its key", "A post to SAP times out", "Mei Lin Tan", "Proposed"] },
					{ cells: ["UC-05", "Settle which customer record governs", "Records disagree on address or tax jurisdiction", "Gordon Achebe", "Unresolved"], emphasis: true },
					{ cells: ["UC-06", "Release a pipeline version to production SAP", "A version passes all twelve checks", "Mei Lin Tan", "Unresolved"], emphasis: true },
				],
			},
		},
		{
			heading: "UC-01: Repair a failed order by hand",
			paragraphs: [
				"Starts when sales books an order in Salesforce CPQ and ends when a later nightly run posts it to SAP. Inputs are the booked order, the failure queue row and the exception text. Outputs are data fixed by hand in one system or the other, and sometimes a duplicate sales order.",
				"This is the path behind the 4.2-day median: 2.4 hours of work, and the rest is waiting.",
			],
			exhibit: {
				kind: "table",
				title: "A person becomes the integration only after the failure is a day old",
				caption: "The current path for an order that fails, as read from queue timestamps and resolution notes.",
				source: "As-Is / To-Be process analysis · Integration failure queue [INT-FAIL-12M]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-01.1", "Sales", "Books the order in Salesforce CPQ", "Order waits for tonight's job", "No check runs at booking"] },
					{ cells: ["UC-01.2", "Nightly job", "Posts the sales order to SAP", "Success writes the SAP number back to Salesforce", "Failure writes a queue row and nobody is paged"] },
					{ cells: ["UC-01.3", "Revenue operations", "Reads the trace, finds which of five causes, fixes data by hand", "2.4 hours of work; no rule says who picks it up", "Waits; 71% of the backlog cleared in a quarter's last five days"] },
					{ cells: ["UC-01.4", "Nightly job", "Retries the next night", "Cannot tell a timeout from a failure, so it retries", "A post that landed becomes a duplicate; 103 cancelled by hand"] },
				],
			},
		},
		{
			heading: "UC-02: Post a booked order the same day",
			paragraphs: [
				"Starts when the agent team reads the day's booked Salesforce orders at 06:00 and ends when the SAP order number is on the Salesforce record and the order is on the 08:00 cockpit. Inputs are the booked order, the customer record, the SAP material master and the quote. Outputs are one SAP sales order, its evidence and one Salesforce field.",
			],
			exhibit: {
				kind: "table",
				title: "An order posts only when its customer and every line resolve to exactly one thing",
				caption: "The target path for an order that meets no blocking trigger, with the requirement behind each rule.",
				source: "Requirements specification · Target operating model",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-02.1", "Order specialist", "Reads the day's booked orders at 06:00", "Run bounded at 30 minutes", "Open: overrun path, Ryan Castellanos agrees it at MS-3"] },
					{ cells: ["UC-02.2", "Order specialist", "Resolves the customer and every line", "One business partner (R-03), one real SAP material per line (R-08)", "Any blocking trigger hands the order to UC-03"] },
					{ cells: ["UC-02.3", "Order specialist", "Posts under the idempotency key", "Key derives from the Salesforce order id and version (R-11)", "A timeout goes to UC-04, never to a blind retry"] },
					{ cells: ["UC-02.4", "Order specialist", "Attaches evidence on post", "Source, master, mapping and key on every order (R-19)", "An order missing any of the four fails R-19"] },
					{ cells: ["UC-02.5", "Agent team", "Writes back to Salesforce at 07:00", "Only the SAP order number or the block reason", "No other Salesforce write is permitted"] },
					{ cells: ["UC-02.6", "Reporting specialist", "Publishes the exception cockpit", "By 08:00 London under ITGC-SOX-4", "Open: a late cockpit has no path, Nadia Fournier settles it"] },
				],
			},
		},
		{
			heading: "UC-03: Block an order and route it to its owner",
			paragraphs: [
				"Starts when an order meets any of the four blocking triggers and ends when its named owner has decided. Until then the order stays out of SAP. Inputs are the order, the quote and the evidence gathered. Outputs are the block reason on the Salesforce record, a prepared decision for the owner and a line on the cockpit.",
			],
			exhibit: {
				kind: "table",
				title: "Four triggers stop an order, and each one lands on a named person with the evidence attached",
				caption: "How a blocked order reaches its owner; a trigger applies whatever the order's class.",
				source: "Requirements specification · Project charter and governance · Target operating model",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-03.1", "Order specialist", "Tests the order against the four triggers", "Above $50,000, no SAP material, over one partner, or terms differ from quote", "Any one met: the order is never posted"] },
					{ cells: ["UC-03.2", "Exception analyst", "Prepares the evidence", "Which line has no material, or which value disagrees with the quote", "May not post or unblock the order"] },
					{ cells: ["UC-03.3", "Product operations", "Receives a line with no SAP material", "Open: treatment of an unmapped SKU, Nadia Fournier settles it", "Order stays blocked; escalates to Internal Controls"] },
					{ cells: ["UC-03.4", "Revenue operations", "Decides an order above $50,000 or outside the quote", "Open: $50,000 awaits confirmation by Nadia Fournier at activation", "Escalates to the CFO"] },
					{ cells: ["UC-03.5", "Gordon Achebe", "Decides a customer with more than one business partner", "One partner per order, recorded (R-03)", "A block that cannot resolve becomes an open question"] },
				],
			},
		},
		{
			heading: "UC-04: Recover a timed-out post by its key",
			paragraphs: [
				"Starts when a post to SAP times out and the sync does not know whether the order landed. Ends when the order's state is known and recorded. The input is the idempotency key, and the output is the SAP order number or a stated next step.",
				"The source covers the case where the order is found and does not cover the case where it is not, so that branch is open.",
			],
			exhibit: {
				kind: "table",
				title: "A timeout becomes a read, so it can no longer become one of the 103 duplicates",
				caption: "The designed response to a timed-out post, tested by the R-11 check.",
				source: "As-Is / To-Be process analysis · Technical assessment · RAID register",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-04.1", "Order specialist", "Stops when the post is not acknowledged", "Timeout is treated as unknown, not as a failure", "No blind retry"] },
					{ cells: ["UC-04.2", "Release coordinator", "Reads SAP back by the idempotency key", "Key sits in the external reference on the sales order header", "Open: a failed read-back, Mei Lin Tan settles it"] },
					{ cells: ["UC-04.3", "Release coordinator", "Records the result when the order exists", "Order found: record the number and stop", "No second sales order is created (R-11)"] },
					{ cells: ["UC-04.4", "Release coordinator", "Handles an order that is not found", "Open: the source does not state this case, Mei Lin Tan settles it", "Order stays unposted until she does"] },
				],
			},
		},
		{
			heading: "UC-05: Settle which customer record governs",
			paragraphs: [
				"Starts when an order's customer differs between the Salesforce Account and the SAP Business Partner, which is true of 187 of 2,418 active accounts. Ends when one rule says which record governs, so R-03 and R-05 can be tested. Inputs are the customer master extract and twelve months of posted orders. The output is that rule.",
				"Each system is internally consistent, so evidence cannot pick the winner. This catalog does not state the outcome: it is the decision recorded in the RAID register.",
			],
			exhibit: {
				kind: "table",
				title: "The mismatch is measured, and the rule that ends it belongs to one named owner",
				caption: "What is known and what stays open until the customer master rule exists.",
				source: "RAID register · Project charter and governance · Customer master extract [CUST-2418]",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-05.1", "MAX", "Reconciles the two customer extracts", "187 accounts differ; tax on $612,480.90 of orders set by read order", "Evidence alone cannot name the master"] },
					{ cells: ["UC-05.2", "Gordon Achebe", "Decides which record governs", "Open: the decision recorded in the RAID register, Gordon Achebe settles it", "Escalates to the CFO"], emphasis: true },
					{ cells: ["UC-05.3", "Order specialist", "Resolves each customer under the rule", "One partner per order, recorded (R-03)", "More than one partner blocks the order (UC-03)"] },
					{ cells: ["UC-05.4", "Order specialist", "Determines tax from the authoritative record", "No tax set from the other system (R-05)", "Open until UC-05.2: there is no rule to test"] },
				],
			},
		},
		{
			heading: "UC-06: Release a pipeline version to production SAP",
			paragraphs: [
				"Starts when one version passes all twelve checks in the sandbox and ends when its transport is applied and the target state has been read back. The input is the released, versioned transport and the output is the sync running in production SAP.",
				"Internal Controls signs the release policy rather than the releases. The duty that builds and tests has no production credentials, and the duty that releases cannot decide an order's outcome.",
			],
			exhibit: {
				kind: "table",
				title: "The one irreversible step has a window and a recovery rule but no named approver",
				caption: "The path to production, with the approval still carried as an open question.",
				source: "Implementation roadmap · Technical assessment · RAID register",
				columns: ["ID", "Actor", "Action", "Decision rule or output", "On exception"],
				rows: [
					{ cells: ["UC-06.1", "Release coordinator", "Offers one version for release", "All twelve checks pass on that version", "A failing check sends the version back"] },
					{ cells: ["UC-06.2", "Mei Lin Tan", "Establishes who approves", "Open: who may approve a production SAP change, Mei Lin Tan answers", "No release until it is answered"], emphasis: true },
					{ cells: ["UC-06.3", "Release coordinator", "Moves the transport in the window", "Thursday 21:00 to 01:00 London, shared with the finance release train", "An overrun holds rather than assumes it applied"] },
					{ cells: ["UC-06.4", "Release coordinator", "Reads the target state before acting again", "Lost acknowledgement: reconcile the sales order by key", "Never posts a second time"] },
				],
			},
		},
	],
	findings: [
		{ label: "Today's process has no accountable actor", detail: "The queue has zero named owners, so 71% of twelve months of failures cleared in the last five days of a quarter." },
		{ label: "The two unresolved use cases need a person, not more evidence", detail: "UC-05 and UC-06 both turn on authority. Nothing else in the catalog stops a proposed use case from being tested." },
		{ label: "Three rules are missing from the sources", detail: "A failed read-back, an order not found after a timeout and a late cockpit have no stated path. Each step names who settles it." },
	],
	nextSteps: [
		{ action: "Settle the customer master so UC-05 can be tested", owner: "Gordon Achebe, Director of Internal Controls", due: "Before the first milestone" },
		{ action: "Answer who may approve a production SAP change, and rule on the UC-04 open branches", owner: "Mei Lin Tan, SAP Order-to-Cash Lead", due: "At engagement activation" },
		{ action: "Rule on unmapped SKUs and confirm the $50,000 threshold in UC-03", owner: "Nadia Fournier, VP Revenue Operations", due: "At engagement activation" },
	],
	citations: [
		"Integration failure queue · timestamps and resolution notes · [INT-FAIL-12M]",
		"SAP sales order log · post and cancellation records · [SAP-SO-12M]",
		"Customer master extract · Salesforce + SAP · [CUST-2418]",
		"Requirements workshop · Revenue Operations and Finance Systems",
		"Discovery register · Revenue Operations, Finance Systems, Internal Controls",
		"Implementation roadmap · Discovery workshop with Revenue Operations and Finance Systems",
	],
}
