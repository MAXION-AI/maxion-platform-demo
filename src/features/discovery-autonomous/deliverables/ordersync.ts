import type { DeliverableBody, DeliverableRevision } from "./types"

// Salesforce–SAP order sync: customer master and posting integrity · Arcline Technologies
// Evidence base: 18,942 Salesforce orders and 17,602 SAP sales orders over twelve months,
// 1,340 integration failures, and a 2,418-account customer master extract from both systems.
// The figures are the ones the Agentix order-sync engagement later builds and tests against
// (engine/scenarios.ts ORDER_FIGURES and pkg_order_sync_v2), so a number quoted here is the
// number an agent checks there. All data is synthetic.

const FAILURE_CAUSES = [
	{ label: "Customer master mismatch", value: 512, note: "The two records disagree" },
	{ label: "SKU has no SAP material", value: 341, note: "Line cannot be posted" },
	{ label: "Tax or incoterms default", value: 236, note: "Resolved from the wrong record" },
	{ label: "Pricing or currency mismatch", value: 148, note: "Condition differs from the quote" },
	{ label: "Duplicate after a timeout", value: 103, note: "Post landed but was retried" },
]

const EXECUTIVE_BRIEF: DeliverableBody = {
	heading: "Orders fail on the way into SAP because two systems each believe they own the customer, and the quarter-end scramble is the bill for never deciding which one does.",
	lede: "Arcline books orders in Salesforce CPQ and posts them as SAP sales orders through a nightly job. Twelve months produced 1,340 failures against 18,942 booked orders, and the largest single cause is that 187 active accounts carry a different address and tax jurisdiction in each system. A failed order takes a median 4.2 days to fix, which is why $2,147,320.60 of bookings sat unbilled at the last quarter end and six of the last eight quarters needed a manual catch-up run. The recommendation is a daily agent-run sync that posts from one authoritative customer master, blocks what it cannot map rather than guessing, and never turns a timed-out post into a duplicate sales order.",
	metrics: [
		{ value: "1,340", label: "Order sync failures in twelve months", note: "7.1% of 18,942 booked orders" },
		{ value: "4.2 days", label: "Median time to fix a failed order", note: "Found by the customer as often as by us" },
		{ value: "$2,147,320.60", label: "Bookings unbilled at quarter end", note: "Waiting on a failed post, not on a customer" },
		{ value: "6 of 8", label: "Quarters needing a manual catch-up", note: "Weekend work, every time" },
	],
	keyMessages: [
		{ label: "One customer master ends the largest failure class", detail: "512 of the 1,340 failures are the same disagreement: Salesforce and SAP hold different addresses and tax jurisdictions for 187 active accounts. Tax was determined by whichever system posted first, across $612,480.90 of orders. Naming one master removes the class rather than retrying it." },
		{ label: "What cannot be mapped should stop, not guess", detail: "341 failures are Salesforce SKUs with no SAP material. Today they are fixed by hand, order by order, by someone choosing a material. That is a product decision, so the design blocks the order and raises it to the people who own the catalogue." },
		{ label: "A timed-out post must never become a second sales order", detail: "103 failures are duplicates created when a post timed out and was retried without checking what landed. Every posted order gets a deterministic idempotency key, and the coordinator reads SAP back before it ever posts again." },
	],
	sections: [
		{
			heading: "Situation",
			paragraphs: [
				"Arcline sells hardware and a subscription platform. Sales books orders in Salesforce CPQ, which is the system of record for the quote, the discount and the commercial terms. Finance bills from SAP S/4HANA, which is the system of record for the sales order, the delivery and the invoice.",
				"A nightly integration job posts each booked Salesforce order into SAP as a sales order. When the post succeeds, the SAP order number is written back onto the Salesforce record and sales can see it. When it fails, the order sits in the integration failure queue with a stack trace, and someone in revenue operations works it out.",
				"Twelve months produced 1,340 such failures against 18,942 booked orders. The median failure took 4.2 days to resolve, which is long enough that the order missed its billing run. At the last quarter end $2,147,320.60 of booked revenue was still unbilled for that reason alone.",
			],
			exhibit: {
				kind: "bar",
				title: "One disagreement about the customer causes more failures than every other cause",
				caption: "Integration failures in twelve months by root cause, 1,340 in total. The first is a policy question nobody has answered; the rest follow from it or from retrying blindly.",
				source: "Integration failure queue · 12 months · [INT-FAIL-12M]",
				unit: "failures",
				data: FAILURE_CAUSES.map((cause, index) => ({ ...cause, emphasis: index < 2 })),
			},
		},
		{
			heading: "Complication",
			paragraphs: [
				"The customer master was never decided. Salesforce Account is maintained by sales operations, who update an address when a customer tells them. SAP Business Partner is maintained by finance master data, who update it when a contract or a tax registration changes. Both are diligent; neither is authoritative.",
				"MAX reconciled the two extracts. 187 active accounts differ in address or tax jurisdiction, and tax on their orders was determined by whichever record the integration happened to read first — $612,480.90 of orders over twelve months.",
				"The retry behaviour compounds it. When a post times out, the job has no way to know whether SAP created the order, so it retries. 103 duplicate sales orders were created that way in twelve months, each of which had to be cancelled by hand, and a cancelled sales order in SAP leaves a trail finance has to explain at audit.",
			],
			exhibit: {
				kind: "table",
				title: "Both customer records are internally consistent, and they disagree on 187 accounts",
				caption: "The customer master extract compared across both systems. Which record is authoritative is a policy decision, not a data-quality fix.",
				source: "Customer master extract · Salesforce + SAP · 2,418 active accounts · [CUST-2418]",
				columns: ["Record", "Maintained by", "Updated when", "Accounts differing", "Orders affected"],
				rows: [
					{ cells: ["Salesforce Account", "Sales operations", "A customer tells us", "187", "$612,480.90"], emphasis: true },
					{ cells: ["SAP Business Partner", "Finance master data", "A contract or registration changes", "187", "$612,480.90"], emphasis: true },
					{ cells: ["Agreed master", "Undecided", "—", "—", "Tax set by whichever posted first"] },
				],
			},
		},
		{
			heading: "Resolution",
			paragraphs: [
				"An agent team reads the booked Salesforce orders every morning at 06:00, resolves each to one customer master, maps every line to a real SAP material, and posts the sales order under a deterministic idempotency key. The SAP order number is written back to Salesforce the same day.",
				"An order it cannot resolve is not guessed at. A line with no SAP material blocks the order and raises it to product operations; an order above $50,000 or outside the agreed terms goes to revenue operations with the comparison already prepared.",
				"Finance opens a verified order exception cockpit at 08:00 London: what posted, what is blocked and on whom, and what is at risk for the quarter. The cockpit publishes under policy ITGC-SOX-4, and changes reaching production SAP release only under the policy the owner sets in this package.",
			],
			exhibit: {
				kind: "stack",
				title: "The design removes two failure classes and routes the third to the people who own it",
				caption: "Failures in twelve months, by how they are resolved today and under the target design. Nothing is auto-posted that a person should decide.",
				source: "Integration failure queue · target operating model",
				unit: "failures",
				segments: [
					{ label: "Removed by one master and an idempotency key", tone: "brand" },
					{ label: "Blocked and raised to an owner", tone: "warn" },
					{ label: "Worked by revenue operations", tone: "muted" },
				],
				rows: [
					{ label: "Today", values: [0, 0, 1340], note: "All worked by hand" },
					{ label: "Target", values: [851, 341, 148], note: "Pricing still needs a person" },
				],
			},
		},
	],
	findings: [
		{ label: "The largest failure class is an undecided policy", detail: "512 of 1,340 failures come from 187 accounts whose address and tax jurisdiction differ between Salesforce and SAP." },
		{ label: "Tax was determined by whichever system posted first", detail: "$612,480.90 of orders over twelve months had their jurisdiction set by the integration's read order rather than by a rule." },
		{ label: "Retrying a timed-out post created 103 duplicate sales orders", detail: "Each had to be cancelled by hand, and a cancelled SAP sales order is an audit item finance must explain." },
		{ label: "341 orders could not be posted because a SKU has no SAP material", detail: "These were resolved by someone choosing a material by hand, which is a product decision made under delivery pressure." },
	],
	nextSteps: [
		{ action: "Decide whether the SAP business partner is the authoritative customer master", owner: "Gordon Achebe, Director of Internal Controls", due: "Before the package is handed to Agentix" },
		{ action: "Rule how orders with an unmapped SKU are treated", owner: "Nadia Fournier, VP Revenue Operations", due: "At the first milestone" },
		{ action: "Set the release policy for production SAP changes and confirm the change window", owner: "Mei Lin Tan, SAP Order-to-Cash Lead", due: "At engagement activation" },
		{ action: "Confirm the $50,000 escalation threshold with revenue operations", owner: "Nadia Fournier, VP Revenue Operations", due: "At engagement activation" },
	],
	citations: [
		"Salesforce order records · Salesforce CPQ · 18,942 orders over twelve months · [SFDC-ORD-12M]",
		"SAP sales order log · SAP S/4HANA · 17,602 sales orders over twelve months · [SAP-SO-12M]",
		"Integration failure queue · 1,340 failures over twelve months · [INT-FAIL-12M]",
		"Customer master extract · Salesforce + SAP · 2,418 active accounts · [CUST-2418]",
	],
}

const BUSINESS_CASE: DeliverableBody = {
	heading: "The case is the unbilled quarter: cash already earned, sitting behind a failed post, recovered inside one quarter.",
	lede: "Nothing here depends on selling more. Three measurable losses recur every quarter: bookings that miss their billing run, revenue-operations hours spent re-keying orders, and duplicate sales orders that finance has to cancel and explain. Three options were appraised against doing nothing. An agent-run sync from one authoritative master returns $781,400 a year and is the only option that also closes the customer-master question.",
	metrics: [
		{ value: "$781,400", label: "Annual benefit at steady state", note: "Working capital plus hours returned" },
		{ value: "$2,147,320.60", label: "Bookings released at quarter end", note: "Billed in their own quarter, not the next" },
		{ value: "3,180 hours", label: "Revenue-operations time returned", note: "1,340 failures at 2.4 hours each" },
		{ value: "Quarter 1", label: "Payback", note: "The first unblocked quarter end covers the build" },
	],
	keyMessages: [
		{ label: "The benefit is working capital, not a headcount saving", detail: "Bookings billed in their own quarter rather than the next is the largest line. It is measurable from the billing runs and needs no assumption about anyone's productivity." },
		{ label: "Revenue-operations hours are returned to the quarter, not removed", detail: "1,340 failures at a measured 2.4 hours each is 3,180 hours, most of it spent in the last week of a quarter. The team stays; the work moves from re-keying orders to the commercial exceptions that need judgement." },
		{ label: "Doing nothing gets worse as the catalogue grows", detail: "Unmapped-SKU failures rose 31% year on year with the hardware catalogue, and each new tax registration adds accounts to the 187 that already disagree." },
	],
	sections: [
		{
			heading: "Options appraised",
			paragraphs: [
				"Three options were tested against the same twelve-month evidence base and assessed on whether they close the customer-master question, the mapping question, or neither.",
				"Adding revenue-operations capacity scales cost with failure volume and closes neither. Hardening the existing nightly job closes the mapping and duplicate problems if the idempotency key is added, but leaves the master undecided, so the largest failure class persists. Only the agent-run design resolves the master on every order and tests tax against it.",
			],
			exhibit: {
				kind: "table",
				title: "Only the agent-run design closes the customer-master question",
				caption: "Options appraised against the same twelve-month evidence base. Benefit is annual at steady state.",
				source: "Business case model · Discovery workshop with revenue operations and finance",
				columns: ["Option", "Annual benefit", "Closes master question", "Ends duplicates", "Ongoing cost"],
				rows: [
					{ cells: ["Do nothing", "—", "No", "No", "Rises with the catalogue"] },
					{ cells: ["Add revenue-operations capacity", "$214,000", "No", "No", "Two roles"] },
					{ cells: ["Harden the nightly job", "$486,200", "No", "Yes", "Integration change budget"] },
					{ cells: ["Agent-run sync under policy", "$781,400", "Yes", "Yes", "Agent operation"], emphasis: true },
				],
			},
		},
		{
			heading: "Benefit build",
			paragraphs: [
				"The benefit is built bottom-up and held conservative: no benefit is claimed for the 148 pricing failures that still need a person, and no reduction in headcount is assumed.",
				"The working-capital line values only bookings that missed their billing run because of a failed post, at the company's cost of capital. The hours line values returned time at a loaded rate rather than as avoided salary.",
			],
			exhibit: {
				kind: "waterfall",
				title: "The benefit is two lines, and the larger one is revenue already booked",
				caption: "Annual benefit at steady state. No benefit is claimed for failures that still need a person, and no headcount reduction is assumed.",
				source: "SAP billing runs · [SAP-SO-12M]",
				unit: "USD",
				steps: [
					{ label: "Working capital released", value: 526200, role: "base" },
					{ label: "Hours returned", value: 255200, role: "delta" },
					{ label: "Annual benefit", value: 781400, role: "total" },
				],
			},
		},
		{
			heading: "Feasibility",
			paragraphs: [
				"No new platform is needed. Salesforce CPQ, SAP S/4HANA and the integration platform are in place, and SAP already accepts an external reference on a sales order, which is what the idempotency key uses.",
				"The one genuine dependency is the customer-master decision. Until it is made, no pipeline can be tested for correct tax determination, because there is no rule to test against. That is why it is the decision this Discovery stops at.",
			],
		},
	],
	findings: [
		{ label: "Benefit is concentrated in revenue already booked", detail: "$526,200 of the $781,400 is working capital released by billing orders in their own quarter." },
		{ label: "No headcount reduction is required for the case to hold", detail: "The case is positive on working capital alone; hours return to commercial exception work." },
		{ label: "Unmapped-SKU failures are growing", detail: "They rose 31% year on year as the hardware catalogue grew, so the cost of doing nothing rises." },
	],
	nextSteps: [
		{ action: "Confirm the cost of capital used in the working-capital line", owner: "Gordon Achebe, Director of Internal Controls", due: "Before investment sign-off" },
		{ action: "Decide the customer master so the pipeline has a rule to test", owner: "Gordon Achebe, Director of Internal Controls", due: "Before the first milestone" },
	],
	citations: [
		"SAP sales order log · billing runs and quarter-end unbilled balances · [SAP-SO-12M]",
		"Integration failure queue · failure duration and resolution · [INT-FAIL-12M]",
		"Business case model · Discovery workshop with revenue operations, finance systems and internal controls",
	],
}

const PROJECT_CHARTER: DeliverableBody = {
	heading: "An agent team posts orders under a written mandate: it may create a sales order, it may never change a price, and every exception stays with a named owner.",
	lede: "The charter fixes what the engagement may do, who decides what, and what is explicitly out of scope. It is the one document that must be approved before the package reaches Agentix, because it is the mandate the agent team runs under. The boundary is deliberately narrow: the team posts what sales already agreed, and the commercial terms stay exactly where they are.",
	metrics: [
		{ value: "1", label: "Engagement", note: "Salesforce to SAP order sync" },
		{ value: "4", label: "Named decision owners", note: "One per decision class" },
		{ value: "5", label: "Explicit exclusions", note: "What the team may never do" },
		{ value: "ITGC-SOX-4", label: "Publication policy", note: "Governs the exception cockpit" },
	],
	keyMessages: [
		{ label: "The mandate is to post agreed orders, not to agree them", detail: "The agent team creates the SAP sales order from a booked Salesforce order and writes the order number back. It has no permission to change a price, a discount, a quote or a contract, and no access to invoicing or collections." },
		{ label: "Every decision class has one named owner", detail: "Customer master sits with Internal Controls, catalogue and material mapping with Revenue Operations, platform change with the SAP lead, and order policy with the VP. A decision without a named owner is an open question for Agentix, not an assumption." },
		{ label: "SOX separation is enforced by permission", detail: "The duty that builds and tests the pipeline has no production credentials, and the duty that releases to production cannot decide an order's outcome. Internal Controls signs the release policy rather than the releases." },
	],
	sections: [
		{
			heading: "Scope and exclusions",
			paragraphs: [
				"In scope: reading booked Salesforce orders and both customer records, resolving each order to one customer master and every line to an SAP material, posting the sales order under an idempotency key, writing the SAP order number back to Salesforce, blocking and routing what cannot be resolved, and publishing the exception cockpit under ITGC-SOX-4.",
				"Out of scope, by decision: changing a price, discount or quote; creating or amending a contract; invoicing, dunning or collections; creating or amending a customer master record in either system; and anything touching credit limits.",
			],
			exhibit: {
				kind: "table",
				title: "Each decision class has a named owner and a stated escalation",
				caption: "The RACI the agent team runs under. A decision that does not appear here is an open question routed to Agentix rather than an assumption.",
				source: "Project charter workshop · Revenue Operations, Finance Systems, Internal Controls",
				columns: ["Decision class", "Owner", "Consulted", "Escalates to"],
				rows: [
					{ cells: ["Customer master authority", "Gordon Achebe, Internal Controls", "Finance master data", "CFO"], emphasis: true },
					{ cells: ["Catalogue and material mapping", "Nadia Fournier, Revenue Ops", "Product operations", "Internal Controls"] },
					{ cells: ["Production platform change", "Mei Lin Tan, SAP O2C", "Change board", "CIO"], emphasis: true },
					{ cells: ["Order policy and escalation", "Nadia Fournier, Revenue Ops", "Sales leadership", "CFO"] },
				],
			},
		},
		{
			heading: "Governance and evidence",
			paragraphs: [
				"Every sales order an agent posts carries its evidence: the Salesforce order it came from, the customer record it resolved to, the material mapping it used, and the idempotency key it posted under. An auditor opening a sales order sees why it exists without asking anyone.",
				"The cockpit publishes under ITGC-SOX-4, which already governs financial reporting to the finance group, so no new publication authority is created. Production changes release under the policy the owner sets at activation.",
			],
		},
	],
	findings: [
		{ label: "Commercial terms are untouched", detail: "The team posts what sales already agreed; it has no permission on price, discount, quote or contract." },
		{ label: "Publication reuses an existing policy", detail: "ITGC-SOX-4 already governs financial reporting to the finance group, so the cockpit needs no new authority." },
		{ label: "One decision is unresolved at charter approval", detail: "Who may approve a change reaching production SAP was not settled in the interview and is carried to Agentix as the engagement's first question." },
	],
	nextSteps: [
		{ action: "Approve the charter with a reason, releasing the package to Agentix", owner: "Gordon Achebe, Director of Internal Controls", due: "At handoff" },
		{ action: "Confirm the production change window with the change board", owner: "Mei Lin Tan, SAP Order-to-Cash Lead", due: "At engagement activation" },
	],
	citations: [
		"Project charter workshop · Revenue Operations, Finance Systems, Internal Controls",
		"Policy ITGC-SOX-4 · financial reporting to the finance group · [POL-ITGC-SOX-4]",
		"Customer master extract · Salesforce + SAP · [CUST-2418]",
	],
}

const PROCESS_ANALYSIS: DeliverableBody = {
	heading: "The current process discovers a failure a day after it happens and then asks a person to be the integration; the target process resolves the order at the moment it is booked.",
	lede: "Mapping the current state against the integration log shows where the 4.2 days go. The nightly job means a failure is a day old before anyone sees it, and the queue has no owner, so a failed order waits for whoever is free. The target process moves resolution to the moment of booking and gives every blocked order a named owner on arrival.",
	metrics: [
		{ value: "4.2 days", label: "Median time to fix a failed order", note: "From booking to a posted sales order" },
		{ value: "1 day", label: "Lost before anyone sees the failure", note: "The job is nightly" },
		{ value: "2.4 hours", label: "Work in a failed order", note: "Measured from queue timestamps" },
		{ value: "0", label: "Named owners on the failure queue today", note: "Worked by whoever is free" },
	],
	keyMessages: [
		{ label: "A nightly job makes every failure a day old", detail: "An order booked on Monday afternoon is not attempted until Monday night and is not seen as failed until Tuesday. That day is pure latency, and it is the first day of the 4.2." },
		{ label: "The queue has no owner, so it has no clock", detail: "Failures are worked by whoever has capacity, which in the last week of a quarter is nobody. 71% of the twelve-month backlog cleared in the final five days of a quarter." },
		{ label: "Resolution belongs at booking, not at failure", detail: "Every input the sync needs — the customer record, the material, the terms — exists when the order is booked. Resolving then means a failure is a decision waiting for a named person, not a stack trace waiting for a volunteer." },
	],
	sections: [
		{
			heading: "Current state",
			paragraphs: [
				"Sales books an order in Salesforce CPQ. Overnight, the integration job reads the day's booked orders, builds a sales order payload for each, and posts it to SAP. A successful post writes the SAP order number back to the Salesforce record.",
				"A failed post writes a row to the integration failure queue with the exception text. Nobody is paged. The next morning, someone in revenue operations opens the queue, reads the trace, works out which of the five causes it is, fixes the data by hand in one system or the other, and waits for the next night's run.",
				"If the post timed out rather than failed, the job cannot tell whether SAP created the order, so it retries. When SAP had in fact created it, that produces a duplicate sales order which finance cancels by hand.",
			],
			exhibit: {
				kind: "sequence",
				title: "A failed order waits a night to fail, a morning to be seen, and another night to retry",
				caption: "The current path for an order that fails on a customer-master mismatch. Only the 2.4 hours of fixing is work; the rest is the job's cadence.",
				source: "Integration failure queue · timestamps · [INT-FAIL-12M]",
				actors: ["Salesforce", "Nightly job", "Revenue ops", "SAP"],
				steps: [
					{ from: 0, to: 1, label: "Order booked", note: "Waits for tonight" },
					{ from: 1, to: 3, label: "Posts the sales order", note: "Fails on the customer record", tone: "warn" },
					{ from: 1, to: 2, label: "Row in the failure queue", note: "Seen next morning", tone: "warn" },
					{ from: 2, to: 2, label: "Fixes the data by hand", note: "2.4 hours" },
					{ from: 1, to: 3, label: "Retries tomorrow night", note: "Another day", tone: "warn" },
				],
			},
		},
		{
			heading: "Target state",
			paragraphs: [
				"The agent team reads booked orders at 06:00 and resolves each one immediately: the customer to the authoritative master, every line to an SAP material, the terms to the quote. An order that resolves is posted under its idempotency key and the SAP number is written back within the hour.",
				"An order that does not resolve is blocked with a named owner and the evidence already gathered: which line has no material, or which value disagrees with the quote. Product operations and revenue operations see their own blocked orders rather than a shared trace queue.",
				"A post that times out is never retried blindly. The coordinator reads SAP back by the idempotency key; if the order exists, it records the number and stops.",
			],
			exhibit: {
				kind: "stack",
				title: "The target path removes the cadence latency and gives what remains an owner",
				caption: "Median elapsed days for a failed order, current against target. The time a person needs to decide is unchanged by design.",
				source: "Integration failure queue timestamps · target operating model",
				unit: "days",
				segments: [
					{ label: "Waiting for the nightly job", tone: "warn" },
					{ label: "Waiting for someone free", tone: "neutral" },
					{ label: "Waiting for a named owner", tone: "muted" },
				],
				rows: [
					{ label: "Today", values: [2.1, 2.1, 0], note: "4.2 days median" },
					{ label: "Target", values: [0, 0, 0.4], note: "Same day, or owned" },
				],
			},
		},
	],
	findings: [
		{ label: "Half the elapsed time is the job's cadence", detail: "A nightly job costs a day before the failure is visible and another day before the retry." },
		{ label: "The backlog clears at quarter end, not when it arrives", detail: "71% of twelve months of failures were resolved in the last five days of a quarter." },
		{ label: "A timed-out post is indistinguishable from a failed one today", detail: "The job has no idempotency key to read back with, which is what turns a timeout into a duplicate." },
	],
	nextSteps: [
		{ action: "Agree the blocked-order owners for catalogue and commercial exceptions", owner: "Nadia Fournier, VP Revenue Operations", due: "At the first milestone" },
		{ action: "Confirm SAP accepts the external reference used as the idempotency key", owner: "Mei Lin Tan, SAP Order-to-Cash Lead", due: "Before the first milestone" },
	],
	citations: [
		"Integration failure queue · timestamps and resolution notes · [INT-FAIL-12M]",
		"SAP sales order log · post and cancellation records · [SAP-SO-12M]",
	],
}

const REQUIREMENTS: DeliverableBody = {
	heading: "The requirements say what an agent may post, what it must block, and what evidence every posted order has to carry.",
	lede: "Twenty-four requirements were drawn from the interview and the failure analysis, each with an acceptance criterion an agent's work can be tested against. They are written so a check can fail: every master requirement names the record it resolves against, and every posting requirement names the key it posts under.",
	metrics: [
		{ value: "24", label: "Requirements", note: "Each with an acceptance criterion" },
		{ value: "12", label: "Automated checks derived", note: "Run against every pipeline version" },
		{ value: "4", label: "Blocking triggers", note: "Where a person must decide" },
		{ value: "100%", label: "Posted orders carrying evidence", note: "Source, master, mapping and key" },
	],
	keyMessages: [
		{ label: "A requirement that cannot fail a check is not a requirement", detail: "Each master and posting requirement names the record, the field and the comparison, so it becomes a check the agent team runs on every version rather than a sentence someone interprets." },
		{ label: "Blocking is defined by amount, mapping, master and terms", detail: "Four triggers block an order: above $50,000, a line with no SAP material, a customer that resolves to more than one business partner, or terms that differ from the quote. Anything meeting a trigger is never posted regardless of its class." },
		{ label: "Idempotency is a requirement, not an implementation detail", detail: "Every post carries a deterministic key derived from the Salesforce order id and version. A retry must find the existing sales order and record it rather than create a second one — that is R-11, and it has its own check." },
	],
	sections: [
		{
			heading: "Functional requirements",
			paragraphs: [
				"The requirements divide into master resolution, mapping, posting integrity, evidence and publication. The table below carries the ones that drive automated checks; the full set is traced to the operating model.",
			],
			exhibit: {
				kind: "table",
				title: "Every master and posting requirement names what it is tested against",
				caption: "Requirements that become automated checks. The register column is what makes the requirement falsifiable.",
				source: "Requirements workshop · Revenue Operations and Finance Systems",
				columns: ["ID", "Requirement", "Tested against", "Acceptance"],
				rows: [
					{ cells: ["R-03", "Resolve the customer to the authoritative master", "SAP business partner", "One partner per order, recorded"], emphasis: true },
					{ cells: ["R-05", "Determine tax from the authoritative record", "Business partner jurisdiction", "No tax set from the other system"], emphasis: true },
					{ cells: ["R-08", "Map every line to a real SAP material", "SAP material master", "No order posted with a placeholder"] },
					{ cells: ["R-11", "Post under a deterministic idempotency key", "Salesforce order id and version", "A retry creates no second sales order"], emphasis: true },
					{ cells: ["R-19", "Attach source, master, mapping and key on post", "Sales order record", "Every posted order carries evidence"] },
				],
			},
		},
		{
			heading: "Non-functional requirements",
			paragraphs: [
				"The sync must complete before revenue operations start at 08:00 London, so the daily run is bounded at 30 minutes for a day's booked orders. The cockpit must publish by 08:00 for the morning stand-up.",
				"No requirement permits writing to Salesforce beyond the SAP order number and the block reason, and none permits changing a price or a customer record in either system. That is what keeps the commercial path outside the engagement's reach.",
			],
		},
	],
	findings: [
		{ label: "Twelve checks are derivable directly from the requirements", detail: "Each names a record, a field and a comparison, so a pipeline version either satisfies it or fails it without interpretation." },
		{ label: "Two requirements cannot be satisfied until the master is decided", detail: "R-03 and R-05 both resolve against the authoritative record; until one is named, neither has a rule to test." },
	],
	nextSteps: [
		{ action: "Sign off the twelve derived checks before the first pipeline version", owner: "Mei Lin Tan, SAP Order-to-Cash Lead", due: "At the second milestone" },
		{ action: "Confirm the 30-minute sync bound against a peak booking day", owner: "Ryan Castellanos, Salesforce Platform Lead", due: "At engagement activation" },
	],
	citations: [
		"Requirements workshop · Revenue Operations and Finance Systems",
		"Customer master extract · Salesforce + SAP · [CUST-2418]",
		"SAP sales order log · external reference behaviour · [SAP-SO-12M]",
	],
}

const TECHNICAL_ASSESSMENT: DeliverableBody = {
	heading: "Nothing new has to be bought; the work is reading one customer record instead of two and posting under a key SAP already supports.",
	lede: "The platform assessment found no capability gap. Salesforce CPQ exposes booked orders, SAP S/4HANA accepts an external reference on a sales order, and the integration platform already holds the credentials. The technical risk is concentrated in two places: the absence of an idempotency key today, and a production change window shared with the finance release train.",
	metrics: [
		{ value: "0", label: "New platforms required", note: "All three systems already in place" },
		{ value: "3", label: "Read integrations needed", note: "Orders, both customer records, material master" },
		{ value: "30 min", label: "Bounded sync duration", note: "Measured at 9 min 40 s on a peak day" },
		{ value: "1", label: "Weekly production change window", note: "Thursday 21:00–01:00 London" },
	],
	keyMessages: [
		{ label: "The only production write is the sales order itself", detail: "Everything else is a read. The team writes one SAP sales order and one Salesforce field — the order number or the block reason — which keeps the blast radius to objects the engagement is accountable for." },
		{ label: "SAP already supports the key the design needs", detail: "The sales order header accepts an external reference, and it is indexed. A deterministic key derived from the Salesforce order id and version makes a retry a read, not a second create. This is the single change that ends the duplicate class." },
		{ label: "The change window is shared with the finance release train", detail: "Production changes land Thursday 21:00–01:00 London alongside finance releases. A release that overruns must hold and reconcile rather than assume it applied, which is the failure the engagement is designed to survive." },
	],
	sections: [
		{
			heading: "Target architecture",
			paragraphs: [
				"The agent team works in an SAP S/4HANA sandbox seeded with a synthetic 30-day order sample and a copy of the material master. It builds and tests there, and nothing reaches production except a released, versioned transport.",
				"At run time the sync reads the day's booked Salesforce orders, resolves each against the authoritative customer record and the material master, posts the sales order under its idempotency key, writes the order number back to Salesforce, and publishes the cockpit under ITGC-SOX-4.",
			],
			exhibit: {
				kind: "architecture",
				title: "Three reads in, two writes out, and the commercial path stays outside the boundary",
				caption: "Target architecture. The dashed boundary is what the agent team may touch; pricing, contracts and invoicing sit deliberately outside it.",
				source: "Integration platform runbooks · target architecture workshop",
				lanes: ["Sources", "Agent boundary", "Outputs"],
				nodes: [
					{ id: "orders", label: "Booked orders", detail: "Salesforce CPQ · read", lane: 0, row: 0 },
					{ id: "master", label: "Customer master", detail: "SAP business partner · read", lane: 0, row: 1 },
					{ id: "material", label: "Material master", detail: "SAP S/4HANA · read", lane: 0, row: 2 },
					{ id: "sync", label: "Resolve and post", detail: "Master, mapping, key", lane: 1, row: 1, tone: "brand" },
					{ id: "so", label: "Sales order", detail: "SAP · write", lane: 2, row: 0, tone: "brand" },
					{ id: "cockpit", label: "Exception cockpit", detail: "ITGC-SOX-4", lane: 2, row: 2, tone: "brand" },
				],
				edges: [
					{ from: "orders", to: "sync", label: "Booked orders" },
					{ from: "master", to: "sync", label: "One customer" },
					{ from: "material", to: "sync", label: "Line mapping" },
					{ from: "sync", to: "so", label: "Post under a key" },
					{ from: "sync", to: "cockpit", label: "Publish" },
				],
			},
		},
		{
			heading: "Technical risk",
			paragraphs: [
				"Two risks carry a quantified exposure. Posting without an idempotency key turns any timeout into a possible duplicate sales order, which is the 103 the log already holds. A release that overruns the change window leaves a transport partially applied unless the coordinator reads the target state before acting.",
				"Both are designed against rather than accepted: every post is keyed, and a release that loses its acknowledgement holds and reconciles the sales order by key instead of posting again.",
			],
		},
	],
	findings: [
		{ label: "No new platform, licence or environment is required", detail: "Salesforce CPQ, SAP S/4HANA and the integration platform are in place, and the sandbox already exists for finance testing." },
		{ label: "Posting is not idempotent today", detail: "The job cannot tell a timeout from a failure, which produced 103 duplicate sales orders in twelve months." },
		{ label: "The production change window is shared and narrow", detail: "Thursday 21:00–01:00 London, alongside the finance release train, so a release must survive being cut short." },
	],
	nextSteps: [
		{ action: "Confirm the external reference field is free and indexed for the idempotency key", owner: "Mei Lin Tan, SAP Order-to-Cash Lead", due: "Before the first milestone" },
		{ action: "Provision the sandbox with the synthetic order sample and material master copy", owner: "Ryan Castellanos, Salesforce Platform Lead", due: "At engagement activation" },
	],
	citations: [
		"Integration platform runbooks · job schedule and credentials",
		"SAP sales order log · external reference and cancellation records · [SAP-SO-12M]",
		"Change calendar · finance release train · Thursday 21:00–01:00 London",
	],
}

const TARGET_OPERATING_MODEL: DeliverableBody = {
	heading: "Four agents with separate permissions do the work, and four people keep the decisions that change what a customer owes or who they are.",
	lede: "The operating model names every duty, the permission it carries, and the decision it is not allowed to make. The separation is SOX-relevant and deliberate: the agent that resolves a customer cannot release to production, and the agent that releases cannot decide an order's outcome. Each of the four human decision owners appears exactly where their authority already sits.",
	metrics: [
		{ value: "4", label: "Agent duties", note: "Separate permissions, one accountable" },
		{ value: "7", label: "Systems in scope", note: "Three read, two write, one change, one notify" },
		{ value: "4", label: "Human decision owners", note: "Named in the charter RACI" },
		{ value: "08:00", label: "Cockpit published", note: "London, daily" },
	],
	keyMessages: [
		{ label: "Permissions are split so no single duty can both decide and release", detail: "The order specialist resolves and tests; the exception analyst prepares blocked-order decisions; the release coordinator alone holds production change; the reporting agent publishes. No duty holds two of those." },
		{ label: "The daily rhythm is fixed and visible", detail: "06:00 sync, 07:00 write-back, 08:00 cockpit. Revenue operations know what posted and what is blocked before they start, and an overrun is visible rather than silent." },
		{ label: "Escalation always lands on a named person", detail: "Every blocked order resolves to one of the four decision owners in the charter. A block that cannot resolve is raised as an open question rather than parked in a queue." },
	],
	sections: [
		{
			heading: "Duties and permissions",
			paragraphs: [
				"The four duties below are the engagement's team. Each carries the narrowest permission that lets it finish its work, and the accountable duty is the one that answers for the outcome.",
			],
			exhibit: {
				kind: "table",
				title: "No duty both resolves a customer and releases to production",
				caption: "The agent team's duties and permissions. Separation of duties is enforced by permission, not by convention.",
				source: "Target operating model workshop · Revenue Operations, Finance Systems, Internal Controls",
				columns: ["Duty", "What it does", "Permission", "May not"],
				rows: [
					{ cells: ["Order specialist", "Resolve, map and post", "Read masters, write sales order", "Release, change a price"], emphasis: true },
					{ cells: ["Exception analyst", "Prepare blocked-order decisions", "Read orders and quotes", "Post or unblock an order"] },
					{ cells: ["Release coordinator", "Move transports to production", "Production change", "Decide an order outcome"], emphasis: true },
					{ cells: ["Reporting specialist", "Publish and report", "Write cockpit, notify", "Touch an order decision"] },
				],
			},
		},
		{
			heading: "Daily operation",
			paragraphs: [
				"The sync runs at 06:00 and is bounded at 30 minutes. The write-back to Salesforce follows at 07:00 so sales see order numbers at the start of the day, and the cockpit publishes by 08:00 under ITGC-SOX-4.",
				"Orders the model cannot resolve, orders above $50,000 and orders whose terms differ from the quote are handed to their named owner with the evidence already gathered. Revenue operations' queue is therefore smaller and better prepared, not merely shorter.",
			],
		},
	],
	findings: [
		{ label: "Separation of duties is enforced by permission", detail: "The duty that resolves and posts has no production change permission, and the duty with it cannot decide an order outcome." },
		{ label: "The remaining human queue is the commercial work", detail: "Pricing differences, above-threshold orders and catalogue gaps stay with people, with evidence attached before they arrive." },
	],
	nextSteps: [
		{ action: "Confirm the daily timings against the sales team's start of day", owner: "Nadia Fournier, VP Revenue Operations", due: "At engagement activation" },
		{ action: "Agree the escalation path for a sync that overruns its 30-minute bound", owner: "Ryan Castellanos, Salesforce Platform Lead", due: "At the third milestone" },
	],
	citations: [
		"Target operating model workshop · Revenue Operations, Finance Systems, Internal Controls",
		"Policy ITGC-SOX-4 · financial reporting to the finance group · [POL-ITGC-SOX-4]",
	],
}

const RAID_REGISTER: DeliverableBody = {
	heading: "Two decisions go to Agentix unresolved, and both are about authority rather than integration.",
	lede: "The register carries what the Discovery could not settle and what the engagement must watch. The two open decisions — who may approve a production SAP change, and how orders with an unmapped SKU are treated — are carried deliberately: each needs an owner in the room with the agent team, not a guess made in advance.",
	metrics: [
		{ value: "2", label: "Decisions open at handoff", note: "Carried to Agentix as questions" },
		{ value: "5", label: "Risks with a named owner", note: "Each with a mitigation in the design" },
		{ value: "3", label: "Assumptions to confirm", note: "Tested at the first milestone" },
		{ value: "1", label: "Issue live today", note: "103 duplicate sales orders on the books" },
	],
	keyMessages: [
		{ label: "The open decisions are authority questions, so they stay with people", detail: "Neither production release authority nor the treatment of unmapped SKUs can be derived from evidence. Both are carried to Agentix as the engagement's first questions rather than assumed." },
		{ label: "The duplicate sales orders are an issue today, not a risk tomorrow", detail: "103 duplicates were created and cancelled in twelve months. Each cancellation is an audit item, so it is recorded as a live issue with a named owner and a date." },
		{ label: "Every risk has a mitigation already built into the design", detail: "A duplicate post, a cut-short release, a wrong-master resolution and an overrunning sync each have a designed response, so the register is a list of things that are handled rather than feared." },
	],
	sections: [
		{
			heading: "Risks, assumptions, issues and decisions",
			paragraphs: [
				"The register below is the one Agentix receives. Decisions marked open become questions on the engagement proposal; risks become checks or designed behaviours in the milestones.",
			],
			exhibit: {
				kind: "table",
				title: "Both open decisions are about who may authorise, not about the integration",
				caption: "The RAID register handed to Agentix. Open decisions become the engagement's first questions.",
				source: "Discovery register · Revenue Operations, Finance Systems, Internal Controls",
				columns: ["Type", "Item", "Owner", "Status"],
				rows: [
					{ cells: ["Decision", "Who may approve a production SAP change", "Mei Lin Tan", "Open · to Agentix"], emphasis: true },
					{ cells: ["Decision", "How orders with an unmapped SKU are treated", "Nadia Fournier", "Open · to Agentix"], emphasis: true },
					{ cells: ["Issue", "103 duplicate sales orders cancelled in twelve months", "Gordon Achebe", "Live"], emphasis: true },
					{ cells: ["Risk", "A timed-out post creates a second sales order", "Mei Lin Tan", "Mitigated by idempotency key"] },
					{ cells: ["Risk", "Release cut short by the change window", "Mei Lin Tan", "Mitigated by hold and re-read"] },
					{ cells: ["Risk", "Tax determined from the wrong customer record", "Gordon Achebe", "Mitigated by master-first check"] },
					{ cells: ["Risk", "Sync overruns the 30-minute bound", "Ryan Castellanos", "Mitigated by bounded batch"] },
					{ cells: ["Assumption", "SAP external reference is free and indexed", "Mei Lin Tan", "Test at milestone one"] },
					{ cells: ["Assumption", "Material master is current for active SKUs", "Nadia Fournier", "Test at milestone one"] },
					{ cells: ["Assumption", "Sandbox mirrors production pricing procedures", "Mei Lin Tan", "Test at milestone one"] },
				],
			},
		},
	],
	findings: [
		{ label: "Two decisions are carried to Agentix rather than assumed", detail: "Production release authority and the unmapped-SKU treatment both need an owner present with the agent team." },
		{ label: "The duplicate issue is already an audit item", detail: "103 cancelled sales orders over twelve months, each of which finance has to explain." },
	],
	nextSteps: [
		{ action: "Answer both open decisions at the engagement proposal", owner: "Mei Lin Tan and Nadia Fournier", due: "At engagement activation" },
		{ action: "Close the duplicate issue by posting under an idempotency key", owner: "Mei Lin Tan, SAP Order-to-Cash Lead", due: "At the second milestone" },
	],
	citations: [
		"Discovery register · Revenue Operations, Finance Systems, Internal Controls",
		"SAP sales order log · cancellation records · [SAP-SO-12M]",
		"Customer master extract · Salesforce + SAP · [CUST-2418]",
	],
}

const ROADMAP: DeliverableBody = {
	heading: "Three milestones, each of which leaves something verifiable behind: one customer master, a tested pipeline that cannot duplicate, and a cockpit finance opens without asking anyone.",
	lede: "The sequence is ordered by dependency rather than by size. The mapping has to exist before anything can be posted against it, the pipeline has to pass its checks before anything reaches production SAP, and the cockpit only means something once orders are actually posting. Each milestone ends with evidence a person can read.",
	metrics: [
		{ value: "3", label: "Milestones", note: "MS-1 mapping, MS-2 pipeline, MS-3 cockpit" },
		{ value: "12", label: "Checks on the pipeline", note: "All must pass before release" },
		{ value: "1", label: "Production release", note: "Under the policy the owner sets" },
		{ value: "Daily", label: "Operation after MS-3", note: "06:00 sync, 08:00 cockpit" },
	],
	keyMessages: [
		{ label: "The mapping is first because everything else is tested against it", detail: "MS-1 resolves the customer master, maps materials and settles the unmapped-SKU rule. Nothing can be posted automatically until a customer and a line both resolve to exactly one thing." },
		{ label: "The pipeline is proved in isolation before it is released", detail: "MS-2 builds the sync in the sandbox against a synthetic order sample and runs twelve checks, including the retry that must not duplicate. A failing check sends the version back; only a version that passes all twelve is offered for release." },
		{ label: "The cockpit closes the loop for finance", detail: "MS-3 publishes under ITGC-SOX-4 and starts the daily operation. From that point the engagement is running work rather than building it." },
	],
	sections: [
		{
			heading: "Sequence and dependencies",
			paragraphs: [
				"The three milestones run in strict order. MS-2 depends on the master decision and the mapping from MS-1; MS-3 depends on a released pipeline from MS-2 because there is nothing to report until orders are posting.",
				"The production release sits at the boundary between MS-2 and MS-3 and is the engagement's one irreversible step, which is why it is the one the owner approves explicitly.",
			],
			exhibit: {
				kind: "timeline",
				title: "Each milestone ends with something a person can verify",
				caption: "The three milestones in dependency order, with the production release at the MS-2 boundary.",
				source: "Implementation roadmap · Discovery workshop",
				ticks: ["Week 1", "Week 2", "Week 3", "Week 4"],
				lanes: [
					{ label: "MS-1 Mapping", bars: [{ label: "Master, materials, SKU rule", start: 0, span: 1, tone: "brand" }] },
					{ label: "MS-2 Pipeline", bars: [{ label: "Build, test, twelve checks", start: 1, span: 2, tone: "brand" }] },
					{ label: "MS-3 Cockpit", bars: [{ label: "Publish under ITGC-SOX-4", start: 3, span: 1, tone: "brand" }] },
				],
				markers: [{ label: "Production release", at: 3 }],
			},
		},
	],
	findings: [
		{ label: "The release is the only irreversible step", detail: "Everything before it happens in the sandbox against synthetic data, so the owner approves exactly one thing that cannot be undone." },
		{ label: "MS-3 has no meaning without MS-2", detail: "A cockpit published before orders are posting would show an empty result and teach finance to distrust it." },
	],
	nextSteps: [
		{ action: "Confirm the four-week sequence against the finance release train", owner: "Mei Lin Tan, SAP Order-to-Cash Lead", due: "At engagement activation" },
		{ action: "Agree what revenue operations see on the cockpit at 08:00", owner: "Nadia Fournier, VP Revenue Operations", due: "At the third milestone" },
	],
	citations: [
		"Implementation roadmap · Discovery workshop with Revenue Operations and Finance Systems",
		"Change calendar · finance release train · Thursday 21:00–01:00 London",
	],
}

export const ORDERSYNC_DELIVERABLES: DeliverableBody[] = [EXECUTIVE_BRIEF, BUSINESS_CASE, PROJECT_CHARTER, PROCESS_ANALYSIS, REQUIREMENTS, TECHNICAL_ASSESSMENT, TARGET_OPERATING_MODEL, RAID_REGISTER, ROADMAP]

/*
 * Naming the SAP business partner as the customer master changes what these documents may say
 * about the conflict: the 187 accounts are corrected rather than reconciled, and the tax exposure
 * stops being carried. Only the passages describing that decision are replaced.
 */
export const ORDERSYNC_APPROVED_REVISIONS: Partial<Record<number, DeliverableRevision>> = {
	0: {
		findings: {
			"Tax was determined by whichever system posted first": {
				label: "Tax is now determined from the SAP business partner",
				detail: "The business partner is the customer master. The 187 disagreeing accounts are corrected at the first run and Salesforce syncs down from it, so the $612,480.90 exposure does not recur.",
			},
		},
	},
	7: {
		findings: {
			"Two decisions are carried to Agentix rather than assumed": {
				label: "One decision is carried to Agentix rather than assumed",
				detail: "The customer master was settled in the Discovery: the SAP business partner governs. Production release authority and the unmapped-SKU treatment remain open and go to Agentix as the engagement's first questions.",
			},
		},
	},
}
