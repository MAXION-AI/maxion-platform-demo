import type { DeliverableBody, DeliverableRevision } from "./types"

// AP invoice exceptions: ServiceNow triage and approval authority · Calder Industrial
// Evidence base: 1,904 open cases in the ServiceNow Finance Operations exception
// queue, 22,180 exceptions raised in twelve months, 212 active supplier contracts,
// an 84-row delegation of authority matrix and 38,410 invoices across twelve months
// of SAP payment runs. The figures are the ones the Agentix AP exception engagement
// later builds and tests against (engine/scenarios.ts AP_FIGURES and
// pkg_ap_exceptions_v2), so a number quoted here is the number an agent checks
// there. All data is synthetic.

const EXCEPTION_CAUSES = [
	{ label: "Price within a tolerance band", value: 6214, note: "PO and invoice differ inside a rule" },
	{ label: "Quantity or unit rounding", value: 3908, note: "Receipt and invoice units differ" },
	{ label: "Freight or surcharge coding", value: 2190, note: "Charge posted to the wrong line" },
	{ label: "Tax jurisdiction default", value: 1218, note: "Ship-to resolves to the wrong code" },
	{ label: "Missing or expired contract", value: 3806, note: "No negotiated terms on file" },
	{ label: "Approval authority unresolved", value: 2884, note: "Router found no current approver" },
	{ label: "Duplicate or disputed invoice", value: 1960, note: "Supplier or receipt in dispute" },
]

const EXECUTIVE_BRIEF: DeliverableBody = {
	heading: "Most AP exceptions are arithmetic the queue should never have raised, and the ones that matter are waiting on an approver the routing table can no longer find.",
	lede: "Calder Industrial raises every failed three-way match as a ServiceNow Finance Operations case. Twelve months produced 22,180 of them, and three analysts closed 61% by applying a rule anyone could have written down. The median case sat 6.4 days, long enough to forfeit $412,880.40 of early-payment discounts, and 2,140 approvals routed to someone who had left or never held the threshold. The recommendation is a daily agent-run triage that clears the mechanical exceptions inside the day, tests every tolerance against the negotiated contract rather than the purchase order, and routes each remaining approval to a person the delegation of authority names today.",
	metrics: [
		{ value: "22,180", label: "Exceptions raised in twelve months", note: "61% resolved by a rule, not a judgement" },
		{ value: "6.4 days", label: "Median time to close an exception", note: "Against 30-day payment terms" },
		{ value: "$412,880.40", label: "Early-payment discounts forfeited", note: "Discount window missed while the case sat" },
		{ value: "2,140", label: "Approvals routed without authority", note: "5.6% of twelve months of payment runs" },
	],
	keyMessages: [
		{ label: "Three in five exceptions are mechanical and should clear the same day", detail: "Price differences inside a tolerance band, quantity and unit rounding, freight coding and tax-jurisdiction defaults account for 13,530 of the 22,180 cases. Each is a written rule applied by hand, one case at a time, by an analyst who is not deciding anything." },
		{ label: "The tolerance the queue applies is not the tolerance the company negotiated", detail: "ServiceNow clears to the purchase-order rule of ±2% or $25. The 212 active supplier contracts negotiate a flat ±1.5%. The two disagree on 240 invoices worth $84,310.55, which clear today against terms procurement never agreed to." },
		{ label: "Approval routing has to be checked against authority, not against a saved table", detail: "The delegation of authority matrix was last reviewed two years ago. Routing sends work to names in it, so 2,140 approvals went to someone who had left or sat below the threshold. Every approval an agent routes must resolve against the matrix and the leaver record at the moment it routes." },
	],
	sections: [
		{
			heading: "Situation",
			paragraphs: [
				"Calder Industrial receives supplier invoices into SAP S/4HANA and matches each against its purchase order and goods receipt. A failed match raises a case on the ServiceNow Finance Operations queue, where three analysts in Manchester work it to closure before the weekly payment run.",
				"The queue holds 1,904 open cases. Twelve months produced 22,180, and the analysts closed all but the current backlog by hand: opening the case, reading the purchase order, deciding whether the difference is inside a rule, and either releasing the invoice or asking someone to approve it.",
				"The cost is not the analysts' time alone. The median case sits 6.4 days against 30-day terms, so the 2% early-payment window closes while it waits. Over twelve months that forfeited $412,880.40 of discounts on invoices that were never actually in dispute.",
			],
			exhibit: {
				kind: "bar",
				title: "Four mechanical causes raise 13,530 of the 22,180 exceptions",
				caption: "Exceptions raised in twelve months by root cause. The first four are rules an agent can apply the same way every morning; the last three need a person, and the design keeps them with one.",
				source: "Invoice exception queue · ServiceNow Finance Operations · [FINOPS-EXC-12M]",
				unit: "exceptions",
				data: EXCEPTION_CAUSES.map((cause, index) => ({ ...cause, emphasis: index < 4 })),
			},
		},
		{
			heading: "Complication",
			paragraphs: [
				"The rules the analysts apply are not written in one place. ServiceNow holds the purchase-order tolerance of ±2% or $25, inherited from the ERP defaults at implementation. Procurement holds 212 active supplier contracts that negotiate a flat ±1.5% on the same suppliers.",
				"Nobody reconciled the two. MAX did: they disagree on 240 invoices worth $84,310.55 in the sample year. Those invoices cleared automatically under the wider purchase-order rule, against terms the company had negotiated tighter.",
				"Approval routing has the same shape of problem. The delegation of authority matrix has 84 rows and a review date two years past. Routing reads it as if it were current, and 2,140 approvals in twelve months went to a person who had left the company or sat below the threshold for the amount they approved.",
			],
			exhibit: {
				kind: "table",
				title: "Two tolerance rules are each applied consistently, and they disagree on 240 invoices",
				caption: "The purchase-order rule is what ServiceNow enforces; the contract rule is what procurement negotiated. Which is authoritative is a commercial policy decision, not a calculation.",
				source: "Supplier contracts · SAP Ariba · [ARIBA-CTR-212] · ServiceNow tolerance configuration",
				columns: ["Rule", "Band", "Where it is enforced", "Invoices affected", "Value"],
				rows: [
					{ cells: ["Purchase order", "±2% or $25", "ServiceNow auto-clear", "240 cleared", "$84,310.55"], emphasis: true },
					{ cells: ["Supplier contract", "±1.5% flat", "212 active contracts", "240 would raise", "$84,310.55"], emphasis: true },
					{ cells: ["No contract on file", "Purchase order only", "318 open cases", "318", "$1,204,772.18"] },
				],
			},
		},
		{
			heading: "Resolution",
			paragraphs: [
				"An agent team reads the exception queue every morning at 06:00, classifies each case against the taxonomy above, and clears the mechanical ones under a written rule with the evidence attached to the case. The team never releases a payment; it closes the exception and hands a clean invoice back to the payment run.",
				"Every tolerance decision is tested against the negotiated contract register first and the purchase order only where no contract exists. Anything above $5,000, outside tolerance, or lacking a contract routes to an approver resolved against the delegation of authority matrix and the leaver record at the moment of routing.",
				"Finance opens a verified exception dashboard at 08:00 London: what came in, what cleared, what is waiting and on whom. The dashboard publishes under policy FIN-AP-7, and changes to the production ServiceNow instance release only under the policy the owner sets in this package.",
			],
			exhibit: {
				kind: "stack",
				title: "The design moves 61% of the queue out of a person's day without moving a single approval",
				caption: "Exceptions in twelve months, by who resolves them today and under the target design. Approvals do not move to an agent; they move to the right person, faster.",
				source: "Invoice exception queue · ServiceNow Finance Operations · target operating model",
				unit: "exceptions",
				segments: [
					{ label: "Cleared by an agent under a rule", tone: "brand" },
					{ label: "Routed to a named approver", tone: "warn" },
					{ label: "Worked by an analyst", tone: "muted" },
				],
				rows: [
					{ label: "Today", values: [0, 2884, 19296], note: "Analysts work every case" },
					{ label: "Target", values: [13530, 2884, 5766], note: "Analysts keep the disputes" },
				],
			},
		},
	],
	findings: [
		{ label: "61% of exceptions are resolved by a rule, not a judgement", detail: "13,530 of 22,180 cases closed on price tolerance, quantity rounding, freight coding or tax defaults. None required a decision only a person could make." },
		{ label: "The enforced tolerance is wider than the negotiated one", detail: "240 invoices worth $84,310.55 cleared under the purchase-order rule of ±2% or $25 against contracts negotiated at ±1.5%." },
		{ label: "Routing cannot see who currently holds authority", detail: "2,140 of 38,410 payment-run invoices were approved by someone who had left or sat below the threshold, because the matrix is read as a static table." },
		{ label: "318 open cases have no contract to test against", detail: "The register holds no active terms for these suppliers, so no tolerance rule can be applied without a commercial decision on how to treat them." },
	],
	nextSteps: [
		{ action: "Decide whether the negotiated contract tolerance is authoritative over the purchase order", owner: "David Osei, Financial Controller", due: "Before the package is handed to Agentix" },
		{ action: "Re-attest the 84-row delegation of authority matrix against current HR records", owner: "David Osei, Financial Controller", due: "Within two weeks of go-live" },
		{ action: "Set the release policy for production ServiceNow changes and confirm the change window", owner: "Marcus Bell, ServiceNow Platform Owner", due: "At engagement activation" },
		{ action: "Rule how the 318 no-contract exceptions are treated", owner: "Inés Duarte, Procurement Contracts Manager", due: "At the first milestone" },
	],
	citations: [
		"Invoice exception queue · ServiceNow Finance Operations · 1,904 open, 22,180 in twelve months · [FINOPS-EXC-12M]",
		"Supplier contracts · SAP Ariba · 212 active contracts, top 200 suppliers · [ARIBA-CTR-212]",
		"Delegation of authority matrix · SharePoint Finance/Controls · 84 rows, last reviewed 2024-09 · [DOA-84]",
		"Payment run history · SAP S/4HANA · 38,410 invoices across twelve months · [AP-RUN-12M]",
	],
}

const BUSINESS_CASE: DeliverableBody = {
	heading: "Clearing the mechanical exceptions pays for the work in the first quarter, and the discount recovery alone is larger than the build.",
	lede: "The case does not rest on headcount. It rests on three quantified losses the current process produces every month: discounts forfeited while a case waits, analyst hours spent applying rules, and payments approved by someone without the authority to approve them. Two options were appraised against doing nothing. Automating triage inside ServiceNow under an agent team returns $602,410 a year against a one-off build, and is the only option that also closes the authority gap.",
	metrics: [
		{ value: "$602,410", label: "Annual benefit at steady state", note: "Discounts recovered plus analyst hours returned" },
		{ value: "$412,880.40", label: "Discounts recoverable", note: "Cases closed inside the discount window" },
		{ value: "4,470 hours", label: "Analyst time returned each year", note: "13,530 cases at 19.8 minutes each" },
		{ value: "Quarter 1", label: "Payback", note: "Benefit exceeds build inside the first quarter" },
	],
	keyMessages: [
		{ label: "The recoverable discount is the largest single line and the easiest to verify", detail: "Every forfeited discount is an invoice that was paid late for a reason the queue can remove. Closing a mechanical exception the same day keeps the invoice inside its 2% window; the payment run history shows $412,880.40 of windows missed in twelve months." },
		{ label: "Analyst time is returned, not removed", detail: "13,530 mechanical cases at a measured 19.8 minutes each is 4,470 hours. The three analysts stay: they keep the disputes, the missing contracts and the supplier conversations, which is the work that actually needs them." },
		{ label: "Doing nothing has a rising cost, not a flat one", detail: "Exception volume grew 14% year on year as supplier count grew. The authority gap compounds with every leaver the matrix does not record, and each unapproved payment is an audit finding waiting to be raised." },
	],
	sections: [
		{
			heading: "Options appraised",
			paragraphs: [
				"Three options were tested against the same evidence base. Each was costed on build effort and assessed on whether it closes the tolerance gap, the authority gap, or neither.",
				"Adding analysts scales the cost with the volume and closes neither gap. A ServiceNow workflow rebuild closes the tolerance gap if the contract register is wired in, but leaves routing reading a stale matrix. Only the agent-run design resolves authority at the moment of routing, because only it re-reads the matrix and the leaver record per case.",
			],
			exhibit: {
				kind: "table",
				title: "Only the agent-run design closes both the tolerance gap and the authority gap",
				caption: "Options appraised against the same twelve-month evidence base. Benefit is annual at steady state.",
				source: "Business case model · Discovery workshop with Finance Operations",
				columns: ["Option", "Annual benefit", "Closes tolerance gap", "Closes authority gap", "Ongoing cost"],
				rows: [
					{ cells: ["Do nothing", "—", "No", "No", "Rises 14% a year"] },
					{ cells: ["Add two AP analysts", "$186,000", "No", "No", "Two salaries"] },
					{ cells: ["Rebuild the ServiceNow workflow", "$441,200", "Yes", "No", "Platform change budget"] },
					{ cells: ["Agent-run triage under policy", "$602,410", "Yes", "Yes", "Agent operation"], emphasis: true },
				],
			},
		},
		{
			heading: "Benefit build",
			paragraphs: [
				"The benefit is built bottom-up from the two measurable losses and held deliberately conservative: no benefit is claimed for the 8,650 judgement cases, and no reduction in headcount is assumed.",
				"The discount line counts only invoices whose exception was mechanical and whose discount window was still open when the case was raised. The analyst line values returned hours at a loaded rate rather than as avoided salary.",
			],
			exhibit: {
				kind: "waterfall",
				title: "The benefit is two lines, and the larger one is cash the company already negotiated",
				caption: "Annual benefit at steady state. No benefit is claimed for judgement cases and no headcount reduction is assumed.",
				source: "Payment run history · SAP S/4HANA · [AP-RUN-12M]",
				unit: "USD",
				steps: [
					{ label: "Discounts recovered", value: 412880, role: "base" },
					{ label: "Analyst hours returned", value: 189530, role: "delta" },
					{ label: "Annual benefit", value: 602410, role: "total" },
				],
			},
		},
		{
			heading: "Feasibility",
			paragraphs: [
				"Nothing in the design needs a new platform. ServiceNow Finance Operations already holds the cases, SAP Ariba already holds the contract register, and the payment run already reads a cleared invoice the same way whether a person or an agent closed the exception.",
				"The one genuine dependency is the delegation of authority matrix. It must be re-attested against HR records before routing can rely on it, and that is a finance task rather than a technical one. Until it is, the design routes to the matrix and flags any row whose owner no longer resolves.",
			],
		},
	],
	findings: [
		{ label: "Benefit is concentrated in cash already negotiated", detail: "$412,880.40 of the $602,410 is early-payment discount the company contracted for and forfeited while cases waited." },
		{ label: "No headcount reduction is required for the case to hold", detail: "The case is positive on discount recovery alone; analyst hours are returned to dispute and supplier work." },
		{ label: "Exception volume is growing", detail: "Volume rose 14% year on year with supplier count, so the cost of doing nothing rises rather than holds." },
	],
	nextSteps: [
		{ action: "Confirm the loaded analyst rate used in the benefit model", owner: "Priya Raman, Head of Accounts Payable", due: "Before investment sign-off" },
		{ action: "Re-attest the delegation of authority matrix so routing can rely on it", owner: "David Osei, Financial Controller", due: "Before the first production release" },
	],
	citations: [
		"Payment run history · SAP S/4HANA · discount windows and approval records · [AP-RUN-12M]",
		"Invoice exception queue · ServiceNow Finance Operations · case duration and closure codes · [FINOPS-EXC-12M]",
		"Business case model · Discovery workshop with Finance Operations, Procurement and the Controller",
	],
}

const PROJECT_CHARTER: DeliverableBody = {
	heading: "An agent team clears AP exceptions under a written mandate: it may close a case, it may never release a payment, and every approval stays with a person the matrix names.",
	lede: "The charter fixes what the engagement may do, who decides what, and what is explicitly out of scope. It is the one document that must be approved before the package reaches Agentix, because it is the mandate the agent team runs under. The boundary is deliberately narrow: the team works the exception queue, and the payment run stays exactly where it is.",
	metrics: [
		{ value: "1", label: "Engagement", note: "AP invoice exception triage and routing" },
		{ value: "4", label: "Named decision owners", note: "One per decision class" },
		{ value: "5", label: "Explicit exclusions", note: "What the team may never do" },
		{ value: "FIN-AP-7", label: "Publication policy", note: "Governs the exception dashboard" },
	],
	keyMessages: [
		{ label: "The mandate is to close exceptions, not to pay invoices", detail: "The agent team closes a case in ServiceNow and returns a clean invoice to the existing payment run. It has no permission to release, schedule or alter a payment, and no access to the banking path." },
		{ label: "Every decision class has one named owner", detail: "Tolerance authority sits with the Controller, contract terms with Procurement, platform change with the ServiceNow owner, and queue policy with the Head of AP. A decision without a named owner is an open question for Agentix, not an assumption." },
		{ label: "The exclusions are as binding as the scope", detail: "Five things are out of scope by decision rather than by omission: payment release, supplier master changes, purchase-order amendment, contract negotiation and anything touching payroll." },
	],
	sections: [
		{
			heading: "Scope and exclusions",
			paragraphs: [
				"In scope: reading the ServiceNow Finance Operations exception queue, classifying cases against the agreed taxonomy, clearing mechanical exceptions under written rules with evidence attached, routing the remainder to an approver resolved against the delegation of authority, and publishing the exception dashboard under FIN-AP-7.",
				"Out of scope, by decision: releasing or scheduling any payment; creating or amending a supplier master record; amending a purchase order; negotiating or varying contract terms; and any workflow touching payroll or employee expenses.",
			],
			exhibit: {
				kind: "table",
				title: "Each decision class has a named owner and a stated escalation",
				caption: "The RACI the agent team runs under. A decision that does not appear here is an open question routed to Agentix rather than an assumption.",
				source: "Project charter workshop · Finance Operations, Procurement, Enterprise Systems",
				columns: ["Decision class", "Owner", "Consulted", "Escalates to"],
				rows: [
					{ cells: ["Tolerance authority", "David Osei, Controller", "Procurement", "Finance leadership"], emphasis: true },
					{ cells: ["Contract terms and no-contract cases", "Inés Duarte, Procurement", "Category buyers", "Controller"] },
					{ cells: ["Production platform change", "Marcus Bell, ServiceNow", "Change board", "CIO"], emphasis: true },
					{ cells: ["Queue policy and escalation", "Priya Raman, Head of AP", "Analysts", "Controller"] },
				],
			},
		},
		{
			heading: "Governance and evidence",
			paragraphs: [
				"Every case an agent closes carries its evidence: the rule applied, the contract or purchase order it tested against, and the values compared. An auditor opening a closed case sees why it closed without asking anyone.",
				"Production changes release under the policy the owner sets at activation. The dashboard publishes under FIN-AP-7, which already governs finance reporting to the finance group, so no new publication authority is created by this engagement.",
			],
		},
	],
	findings: [
		{ label: "The payment path is untouched", detail: "The team closes exceptions and hands clean invoices back; it has no permission on the payment run or the banking path." },
		{ label: "Publication reuses an existing policy", detail: "FIN-AP-7 already governs finance reporting to the finance group, so the dashboard needs no new authority." },
		{ label: "One decision is unresolved at charter approval", detail: "Who may approve a change that reaches the production ServiceNow instance was not settled in the interview and is carried to Agentix as the engagement's first question." },
	],
	nextSteps: [
		{ action: "Approve the charter with a reason, releasing the package to Agentix", owner: "David Osei, Financial Controller", due: "At handoff" },
		{ action: "Confirm the production change window with the change board", owner: "Marcus Bell, ServiceNow Platform Owner", due: "At engagement activation" },
	],
	citations: [
		"Project charter workshop · Finance Operations, Procurement, Enterprise Systems",
		"Policy FIN-AP-7 · finance reporting to the finance group · [POL-FIN-AP-7]",
		"Delegation of authority matrix · SharePoint Finance/Controls · [DOA-84]",
	],
}

const PROCESS_ANALYSIS: DeliverableBody = {
	heading: "The current process spends its time deciding whether a difference matters; the target process answers that question with a rule and keeps people for the cases where it genuinely does not.",
	lede: "Mapping the current state against the queue's own timestamps shows where the 6.4 days go. Only 19.8 minutes of a mechanical case is work. The rest is waiting: for an analyst to reach the case, for an approver to answer, and for the next weekly payment run. The target process removes two of those three waits without changing who approves anything.",
	metrics: [
		{ value: "19.8 min", label: "Work in a mechanical case", note: "Measured from queue timestamps" },
		{ value: "6.4 days", label: "Elapsed time for the same case", note: "99.8% of it waiting" },
		{ value: "3 waits", label: "In the current path", note: "Analyst, approver, payment run" },
		{ value: "1 wait", label: "In the target path", note: "Approver only, where one is needed" },
	],
	keyMessages: [
		{ label: "The elapsed time is queueing, not effort", detail: "A mechanical case takes under twenty minutes of anyone's attention and 6.4 days of calendar. The gap is three sequential waits, and two of them exist only because a person has to reach the case before anything happens." },
		{ label: "The target path splits the queue at the moment of arrival", detail: "Classification happens when the case is raised, not when an analyst opens it. Mechanical cases clear inside the day; the rest are routed immediately to the person who has to decide, with the evidence already gathered." },
		{ label: "Approval time is the one wait the design does not remove", detail: "Where a person must approve, they still must. The design shortens what precedes it and makes sure the request reaches someone who actually holds the authority, so it is not waited on twice." },
	],
	sections: [
		{
			heading: "Current state",
			paragraphs: [
				"An invoice fails three-way match in SAP and raises a ServiceNow case. The case joins a single undifferentiated queue ordered by age. An analyst reaches it a median of 2.9 days later, reads the purchase order and the invoice, and decides whether the difference is inside a rule.",
				"If it is, the analyst closes the case and the invoice waits for the next weekly payment run. If it is not, the analyst emails an approver chosen from the delegation of authority matrix, and the case waits a median of 2.1 days for an answer that arrives outside ServiceNow and is pasted back into the case.",
			],
			exhibit: {
				kind: "sequence",
				title: "A mechanical exception waits three times and is worked once",
				caption: "The current path for an exception that turns out to be inside tolerance. Only the analyst's twenty minutes is work; the rest is queueing.",
				source: "Invoice exception queue · ServiceNow case timestamps · [FINOPS-EXC-12M]",
				actors: ["SAP", "ServiceNow queue", "AP analyst", "Payment run"],
				steps: [
					{ from: 0, to: 1, label: "Three-way match fails", note: "Case raised" },
					{ from: 1, to: 2, label: "Waits for an analyst", note: "2.9 days median", tone: "warn" },
					{ from: 2, to: 2, label: "Reads PO, applies the rule", note: "19.8 minutes" },
					{ from: 2, to: 1, label: "Closes the case" },
					{ from: 1, to: 3, label: "Waits for the weekly run", note: "3.5 days median", tone: "warn" },
				],
			},
		},
		{
			heading: "Target state",
			paragraphs: [
				"The agent team reads the queue at 06:00 and classifies every case on arrival against the taxonomy. A mechanical case is tested against the contract register, cleared with its evidence attached, and returned to the payment run the same day.",
				"A case needing judgement is routed at 07:00 to an approver resolved against the delegation of authority and the leaver record, with the purchase order, contract and comparison already attached. The approver answers in ServiceNow rather than email, so the evidence stays with the case.",
				"Anything the rules cannot classify, and anything with no contract on file, stays with the analysts. That is the work the design deliberately leaves with people.",
			],
			exhibit: {
				kind: "stack",
				title: "The target path removes the analyst wait and the payment-run wait, not the approval",
				caption: "Median elapsed days for a mechanical exception, current against target. Approval time is unchanged by design where an approval is needed at all.",
				source: "ServiceNow case timestamps · target operating model",
				unit: "days",
				segments: [
					{ label: "Waiting for an analyst", tone: "warn" },
					{ label: "Waiting for an approver", tone: "neutral" },
					{ label: "Waiting for the payment run", tone: "muted" },
				],
				rows: [
					{ label: "Today", values: [2.9, 0, 3.5], note: "6.4 days median" },
					{ label: "Target", values: [0, 0, 0.3], note: "Cleared the same day" },
				],
			},
		},
	],
	findings: [
		{ label: "Effort is 0.2% of elapsed time on a mechanical case", detail: "19.8 minutes of work inside 6.4 days. The process is a queueing problem, not a capacity problem." },
		{ label: "Approvals leave the system of record today", detail: "Approvers answer by email and the reply is pasted back into the case, so the audit trail depends on an analyst remembering to paste it." },
		{ label: "The weekly payment run adds a wait the exception did not need", detail: "A case closed on Tuesday waits a median 3.5 days for the run, which is why same-day closure is what recovers the discount." },
	],
	nextSteps: [
		{ action: "Agree the exception taxonomy and its closure codes with the analysts", owner: "Priya Raman, Head of Accounts Payable", due: "At the first milestone" },
		{ action: "Move approver responses into ServiceNow so evidence stays with the case", owner: "Marcus Bell, ServiceNow Platform Owner", due: "With the routing release" },
	],
	citations: [
		"Invoice exception queue · ServiceNow case timestamps, 22,180 cases · [FINOPS-EXC-12M]",
		"Payment run history · SAP S/4HANA · run cadence and discount windows · [AP-RUN-12M]",
	],
}

const REQUIREMENTS: DeliverableBody = {
	heading: "The requirements say what an agent may close, what it must escalate, and what evidence it has to leave behind for each.",
	lede: "Twenty-one requirements were drawn from the interview and the queue analysis, each with an acceptance criterion an agent's work can be tested against. They are written so a check can fail: every tolerance requirement names the register it tests against, and every routing requirement names what makes an approver valid at the moment of routing.",
	metrics: [
		{ value: "21", label: "Requirements", note: "Each with an acceptance criterion" },
		{ value: "11", label: "Automated checks derived", note: "Run against every pipeline version" },
		{ value: "4", label: "Escalation triggers", note: "Where a person must decide" },
		{ value: "100%", label: "Cases carrying evidence", note: "Rule, comparison and source attached" },
	],
	keyMessages: [
		{ label: "A requirement that cannot fail a check is not a requirement", detail: "Each tolerance and routing requirement names the register, the field and the comparison, so it becomes a check the agent team runs on every version rather than a sentence someone interprets." },
		{ label: "Escalation is defined by amount, tolerance, contract and dispute", detail: "Four triggers send a case to a person: above $5,000, outside the applicable tolerance, no contract on file, or an open supplier dispute. Anything meeting a trigger is never auto-cleared regardless of its class." },
		{ label: "Evidence is a requirement, not a by-product", detail: "A closed case must carry the rule applied, the register it tested against, both values compared and the source records. A case without them fails the check even when the outcome was correct." },
	],
	sections: [
		{
			heading: "Functional requirements",
			paragraphs: [
				"The requirements divide into classification, tolerance testing, routing, evidence and publication. The table below carries the ones that drive automated checks; the full set is traced to the operating model.",
			],
			exhibit: {
				kind: "table",
				title: "Every tolerance and routing requirement names what it is tested against",
				caption: "Requirements that become automated checks. The register column is what makes the requirement falsifiable.",
				source: "Requirements workshop · Finance Operations and Procurement",
				columns: ["ID", "Requirement", "Tested against", "Acceptance"],
				rows: [
					{ cells: ["R-04", "Test price difference against negotiated terms first", "SAP Ariba contract register", "Contract rule applied where a contract exists"], emphasis: true },
					{ cells: ["R-05", "Fall back to the purchase order only with no contract", "Purchase order", "Fallback recorded on the case"] },
					{ cells: ["R-09", "Resolve the approver at the moment of routing", "DoA matrix + leaver record", "No routing to a leaver or below threshold"], emphasis: true },
					{ cells: ["R-12", "Escalate above $5,000 regardless of class", "Invoice gross value", "No auto-clear above the threshold"] },
					{ cells: ["R-17", "Attach rule, comparison and sources on close", "Case record", "Every closed case carries evidence"] },
				],
			},
		},
		{
			heading: "Non-functional requirements",
			paragraphs: [
				"The sweep must complete before the analysts start at 07:00 London, so the daily run is bounded at 45 minutes for the full open queue. Publication must complete by 08:00 for the dashboard to be useful at the morning stand-up.",
				"No requirement permits writing to SAP. The agent team reads the payment run history and writes only to the ServiceNow case and the dashboard, which is what keeps the payment path outside the engagement's reach.",
			],
		},
	],
	findings: [
		{ label: "Eleven checks are derivable directly from the requirements", detail: "Each names a register, a field and a comparison, so a pipeline version either satisfies it or fails it without interpretation." },
		{ label: "One requirement cannot be satisfied until the matrix is re-attested", detail: "R-09 resolves against the delegation of authority and the leaver record; until the matrix is re-attested it will flag rows rather than route to them." },
	],
	nextSteps: [
		{ action: "Sign off the eleven derived checks before the first pipeline version", owner: "Priya Raman, Head of Accounts Payable", due: "At the second milestone" },
		{ action: "Confirm the 45-minute sweep bound against the open queue size", owner: "Marcus Bell, ServiceNow Platform Owner", due: "At engagement activation" },
	],
	citations: [
		"Requirements workshop · Finance Operations and Procurement",
		"Supplier contracts · SAP Ariba · negotiated tolerance terms · [ARIBA-CTR-212]",
		"Delegation of authority matrix · SharePoint Finance/Controls · [DOA-84]",
	],
}

const TECHNICAL_ASSESSMENT: DeliverableBody = {
	heading: "Nothing new has to be built or bought; the work is reading two registers ServiceNow cannot currently see and writing the result back onto the case.",
	lede: "The platform assessment found no capability gap. ServiceNow Finance Operations holds the cases and the flows, SAP Ariba exposes the contract register through an existing integration user, and the payment run already accepts a cleared invoice. The technical risk is concentrated in two places: the change window on the production instance, and the absence of an idempotency key on case closure.",
	metrics: [
		{ value: "0", label: "New platforms required", note: "All three systems already in place" },
		{ value: "2", label: "Read integrations needed", note: "Contract register and leaver record" },
		{ value: "45 min", label: "Bounded sweep duration", note: "Full open queue, measured at 1,904 cases" },
		{ value: "1", label: "Weekly production change window", note: "Wednesday 22:00–02:00 London" },
	],
	keyMessages: [
		{ label: "The integrations are reads, which keeps the blast radius small", detail: "The contract register and the leaver record are read-only. The only writes are to the ServiceNow case and the dashboard table, both inside the platform the engagement already governs." },
		{ label: "Case closure needs an idempotency key it does not have today", detail: "A retried close could post a second closure comment and a second evidence attachment. The design adds a deterministic key per case and version so a retry is visibly the same action rather than a new one." },
		{ label: "The change window is narrow and shared", detail: "Production changes land Wednesday 22:00–02:00 London alongside other platform work. A release that overruns must hold and re-read the change state rather than assume it applied, which is the failure the engagement is designed to survive." },
	],
	sections: [
		{
			heading: "Target architecture",
			paragraphs: [
				"The agent team works in an isolated ServiceNow sub-production instance seeded with a synthetic 30-day sample of the exception queue. It builds and tests there, and nothing reaches the production instance except a released, versioned update set.",
				"At run time the triage reads the open queue, resolves each case against the contract register and the delegation of authority, writes the closure or the routing decision onto the case, and publishes the dashboard table under FIN-AP-7.",
			],
			exhibit: {
				kind: "architecture",
				title: "Two reads in, two writes out, and the payment path stays outside the boundary",
				caption: "Target architecture. The dashed boundary is what the agent team may touch; the payment run and the banking path sit deliberately outside it.",
				source: "Data platform runbooks · Enterprise Systems · target architecture workshop",
				lanes: ["Sources", "Agent boundary", "Outputs"],
				nodes: [
					{ id: "queue", label: "Exception queue", detail: "ServiceNow · read", lane: 0, row: 0 },
					{ id: "contracts", label: "Contract register", detail: "SAP Ariba · read", lane: 0, row: 1 },
					{ id: "doa", label: "DoA + leaver record", detail: "SharePoint · read", lane: 0, row: 2 },
					{ id: "triage", label: "Triage and routing", detail: "Classify, test, decide", lane: 1, row: 1, tone: "brand" },
					{ id: "case", label: "Case closure", detail: "ServiceNow · write", lane: 2, row: 0, tone: "brand" },
					{ id: "dash", label: "Exception dashboard", detail: "FIN-AP-7", lane: 2, row: 2, tone: "brand" },
				],
				edges: [
					{ from: "queue", to: "triage", label: "Open cases" },
					{ from: "contracts", to: "triage", label: "Negotiated terms" },
					{ from: "doa", to: "triage", label: "Current authority" },
					{ from: "triage", to: "case", label: "Close or route" },
					{ from: "triage", to: "dash", label: "Publish" },
				],
			},
		},
		{
			heading: "Technical risk",
			paragraphs: [
				"Two risks carry a quantified exposure. A retried closure without an idempotency key duplicates evidence on the case, which an auditor reads as two decisions. A release that overruns the change window leaves the update set partially applied unless the coordinator re-reads the change state before acting.",
				"Both are designed against rather than accepted: closure is keyed per case and version, and a release that loses its acknowledgement holds and reconciles the target state instead of resubmitting.",
			],
		},
	],
	findings: [
		{ label: "No new platform, licence or environment is required", detail: "ServiceNow, SAP Ariba and SAP S/4HANA are in place, and the sub-production instance already exists for platform work." },
		{ label: "Case closure is not idempotent today", detail: "A retry posts a second closure comment and attachment; the design adds a deterministic key per case and version." },
		{ label: "The production change window is shared and narrow", detail: "Wednesday 22:00–02:00 London, alongside other platform releases, so a release must survive being cut short." },
	],
	nextSteps: [
		{ action: "Provision the read-only integration user for the contract register", owner: "Marcus Bell, ServiceNow Platform Owner", due: "Before the first milestone" },
		{ action: "Confirm the sub-production instance is seeded with the synthetic sample", owner: "Marcus Bell, ServiceNow Platform Owner", due: "At engagement activation" },
	],
	citations: [
		"Data platform runbooks · Enterprise Systems · ServiceNow instance topology",
		"Supplier contracts · SAP Ariba · integration user and register schema · [ARIBA-CTR-212]",
		"Change calendar · Enterprise Systems · production window Wednesday 22:00–02:00 London",
	],
}

const TARGET_OPERATING_MODEL: DeliverableBody = {
	heading: "Four agents with separate permissions do the work, and four people keep the decisions that change what the company owes or who may approve it.",
	lede: "The operating model names every duty, the permission it carries, and the decision it is not allowed to make. The separation is deliberate: the agent that tests tolerance cannot release to production, and the agent that releases cannot decide what a tolerance is. Each of the four human decision owners appears exactly where their authority already sits.",
	metrics: [
		{ value: "4", label: "Agent duties", note: "Separate permissions, one accountable" },
		{ value: "6", label: "Systems in scope", note: "Three read, two write, one notify" },
		{ value: "4", label: "Human decision owners", note: "Named in the charter RACI" },
		{ value: "08:00", label: "Dashboard published", note: "London, daily" },
	],
	keyMessages: [
		{ label: "Permissions are split so no single duty can both decide and release", detail: "The exception specialist tests and classifies; the routing specialist resolves authority; the release coordinator alone holds production change; the operations agent publishes and reports. No duty holds two of those." },
		{ label: "The daily rhythm is fixed and visible", detail: "06:00 sweep, 06:45 tolerance testing, 07:00 routing, 08:00 dashboard. Finance knows what is true and when, and an overrun is visible rather than silent." },
		{ label: "Escalation always lands on a named person", detail: "Every escalation path resolves to one of the four decision owners in the charter. An escalation that cannot resolve is raised as an open question rather than parked." },
	],
	sections: [
		{
			heading: "Duties and permissions",
			paragraphs: [
				"The four duties below are the engagement's team. Each carries the narrowest permission that lets it finish its work, and the accountable duty is the one that answers for the outcome.",
			],
			exhibit: {
				kind: "table",
				title: "No duty both decides a tolerance and releases to production",
				caption: "The agent team's duties and permissions. Separation of duties is enforced by permission, not by convention.",
				source: "Target operating model workshop · Finance Operations and Enterprise Systems",
				columns: ["Duty", "What it does", "Permission", "May not"],
				rows: [
					{ cells: ["Exception specialist", "Classify and test tolerance", "Read queue, contracts", "Release, route approvals"], emphasis: true },
					{ cells: ["Routing specialist", "Resolve approver authority", "Read DoA, write case", "Change a tolerance"] },
					{ cells: ["Release coordinator", "Move update sets to production", "Production change", "Decide a case outcome"], emphasis: true },
					{ cells: ["Operations agent", "Publish and report", "Write dashboard, notify", "Touch a case decision"] },
				],
			},
		},
		{
			heading: "Daily operation",
			paragraphs: [
				"The sweep runs at 06:00 and is bounded at 45 minutes. Tolerance testing follows at 06:45, routing at 07:00 so approvers have the day, and the dashboard publishes by 08:00 under FIN-AP-7.",
				"Variances the model cannot classify, cases above $5,000 and cases with no contract on file are handed to the analysts with the evidence already gathered. The analysts' queue is therefore smaller and better prepared, not merely shorter.",
			],
		},
	],
	findings: [
		{ label: "Separation of duties is enforced by permission", detail: "The duty that tests tolerance has no production permission, and the duty with production permission cannot decide a case outcome." },
		{ label: "The analysts' remaining queue is the judgement work", detail: "Disputes, missing contracts and above-threshold cases stay with people, with evidence attached before they arrive." },
	],
	nextSteps: [
		{ action: "Confirm the daily timings against the analysts' shift start", owner: "Priya Raman, Head of Accounts Payable", due: "At engagement activation" },
		{ action: "Agree the escalation path for a sweep that overruns its 45-minute bound", owner: "Marcus Bell, ServiceNow Platform Owner", due: "At the third milestone" },
	],
	citations: [
		"Target operating model workshop · Finance Operations and Enterprise Systems",
		"Policy FIN-AP-7 · finance reporting to the finance group · [POL-FIN-AP-7]",
	],
}

const RAID_REGISTER: DeliverableBody = {
	heading: "Two decisions go to Agentix unresolved, and both are about authority rather than arithmetic.",
	lede: "The register carries what the Discovery could not settle and what the engagement must watch. The two open decisions — who may approve a production change, and how the 318 no-contract exceptions are treated — are carried deliberately: each needs an owner in the room with the agent team, not a guess made in advance.",
	metrics: [
		{ value: "2", label: "Decisions open at handoff", note: "Carried to Agentix as questions" },
		{ value: "5", label: "Risks with a named owner", note: "Each with a mitigation in the design" },
		{ value: "3", label: "Assumptions to confirm", note: "Tested at the first milestone" },
		{ value: "1", label: "Issue live today", note: "The matrix is two years stale" },
	],
	keyMessages: [
		{ label: "The open decisions are authority questions, so they stay with people", detail: "Neither production release authority nor the treatment of no-contract exceptions can be derived from evidence. Both are carried to Agentix as the engagement's first questions rather than assumed." },
		{ label: "The stale matrix is an issue today, not a risk tomorrow", detail: "2,140 approvals in twelve months already routed to someone without current authority. It is recorded as a live issue with a named owner and a date, not as a risk that might occur." },
		{ label: "Every risk has a mitigation already built into the design", detail: "Duplicate closure, a cut-short release, a wrong-rule clearance and an overrunning sweep each have a designed response, so the register is a list of things that are handled rather than feared." },
	],
	sections: [
		{
			heading: "Risks, assumptions, issues and decisions",
			paragraphs: [
				"The register below is the one Agentix receives. Decisions marked open become questions on the engagement proposal; risks become checks or designed behaviours in the milestones.",
			],
			exhibit: {
				kind: "table",
				title: "Both open decisions are about who may authorise, not about what the numbers say",
				caption: "The RAID register handed to Agentix. Open decisions become the engagement's first questions.",
				source: "Discovery register · Finance Operations, Procurement, Enterprise Systems",
				columns: ["Type", "Item", "Owner", "Status"],
				rows: [
					{ cells: ["Decision", "Who may approve a production ServiceNow change", "Marcus Bell", "Open · to Agentix"], emphasis: true },
					{ cells: ["Decision", "How the 318 no-contract exceptions are treated", "Inés Duarte", "Open · to Agentix"], emphasis: true },
					{ cells: ["Issue", "DoA matrix two years stale; 2,140 approvals affected", "David Osei", "Live"], emphasis: true },
					{ cells: ["Risk", "Retried closure duplicates case evidence", "Marcus Bell", "Mitigated by idempotency key"] },
					{ cells: ["Risk", "Release cut short by the change window", "Marcus Bell", "Mitigated by hold and re-read"] },
					{ cells: ["Risk", "A case cleared under the wrong tolerance rule", "David Osei", "Mitigated by contract-first check"] },
					{ cells: ["Risk", "Sweep overruns the 45-minute bound", "Marcus Bell", "Mitigated by bounded batch"] },
					{ cells: ["Assumption", "Contract register is current for active suppliers", "Inés Duarte", "Test at milestone one"] },
					{ cells: ["Assumption", "Payment run accepts an agent-closed case unchanged", "Priya Raman", "Test at milestone one"] },
					{ cells: ["Assumption", "Sub-production instance mirrors production flows", "Marcus Bell", "Test at milestone one"] },
				],
			},
		},
	],
	findings: [
		{ label: "Two decisions are carried to Agentix rather than assumed", detail: "Production release authority and the no-contract treatment both need an owner present with the agent team." },
		{ label: "The authority issue is already causing harm", detail: "2,140 approvals routed without current authority over twelve months; the matrix re-attestation has a named owner and a date." },
	],
	nextSteps: [
		{ action: "Answer both open decisions at the engagement proposal", owner: "Marcus Bell and Inés Duarte", due: "At engagement activation" },
		{ action: "Close the matrix issue by re-attestation against HR records", owner: "David Osei, Financial Controller", due: "Within two weeks of go-live" },
	],
	citations: [
		"Discovery register · Finance Operations, Procurement, Enterprise Systems",
		"Payment run history · SAP S/4HANA · approval records · [AP-RUN-12M]",
		"Delegation of authority matrix · SharePoint Finance/Controls · [DOA-84]",
	],
}

const ROADMAP: DeliverableBody = {
	heading: "Three milestones, each of which leaves something verifiable behind: a taxonomy, a tested pipeline, and a dashboard finance opens without asking anyone.",
	lede: "The sequence is ordered by dependency rather than by size. The taxonomy has to exist before anything can be tested against it, the pipeline has to pass its checks before anything reaches production, and the dashboard only means something once the first two are true. Each milestone ends with evidence a person can read.",
	metrics: [
		{ value: "3", label: "Milestones", note: "MS-1 taxonomy, MS-2 pipeline, MS-3 dashboard" },
		{ value: "11", label: "Checks on the pipeline", note: "All must pass before release" },
		{ value: "1", label: "Production release", note: "Under the policy the owner sets" },
		{ value: "Daily", label: "Operation after MS-3", note: "06:00 sweep, 08:00 dashboard" },
	],
	keyMessages: [
		{ label: "The taxonomy is first because everything else is tested against it", detail: "MS-1 agrees the exception classes, their closure codes and the treatment of the 318 no-contract cases. Nothing can be cleared automatically until a class and a rule exist for it." },
		{ label: "The pipeline is proved in isolation before it is released", detail: "MS-2 builds the triage in the sub-production instance against a synthetic sample and runs eleven checks. A failing check sends the version back; only a version that passes all eleven is offered for release." },
		{ label: "The dashboard closes the loop for finance", detail: "MS-3 publishes under FIN-AP-7 and starts the daily operation. From that point the engagement is running work rather than building it." },
	],
	sections: [
		{
			heading: "Sequence and dependencies",
			paragraphs: [
				"The three milestones run in strict order. MS-2 depends on the taxonomy and the no-contract decision from MS-1; MS-3 depends on a released pipeline from MS-2 because there is nothing to publish until cases are being cleared.",
				"The production release sits at the boundary between MS-2 and MS-3 and is the engagement's one irreversible step, which is why it is the one the owner approves explicitly.",
			],
			exhibit: {
				kind: "timeline",
				title: "Each milestone ends with something a person can verify",
				caption: "The three milestones in dependency order, with the production release at the MS-2 boundary.",
				source: "Implementation roadmap · Discovery workshop",
				ticks: ["Week 1", "Week 2", "Week 3", "Week 4"],
				lanes: [
					{ label: "MS-1 Taxonomy", bars: [{ label: "Classes, codes, no-contract rule", start: 0, span: 1, tone: "brand" }] },
					{ label: "MS-2 Pipeline", bars: [{ label: "Build, test, eleven checks", start: 1, span: 2, tone: "brand" }] },
					{ label: "MS-3 Dashboard", bars: [{ label: "Publish under FIN-AP-7", start: 3, span: 1, tone: "brand" }] },
				],
				markers: [{ label: "Production release", at: 3 }],
			},
		},
	],
	findings: [
		{ label: "The release is the only irreversible step", detail: "Everything before it happens in the sub-production instance against synthetic data, so the owner approves exactly one thing that cannot be undone." },
		{ label: "MS-3 has no meaning without MS-2", detail: "A dashboard published before cases are cleared would show an empty result and teach finance to distrust it." },
	],
	nextSteps: [
		{ action: "Confirm the four-week sequence against the change calendar", owner: "Marcus Bell, ServiceNow Platform Owner", due: "At engagement activation" },
		{ action: "Agree what finance sees on the dashboard at 08:00", owner: "Priya Raman, Head of Accounts Payable", due: "At the third milestone" },
	],
	citations: [
		"Implementation roadmap · Discovery workshop with Finance Operations and Enterprise Systems",
		"Change calendar · Enterprise Systems · production window Wednesday 22:00–02:00 London",
	],
}

export const SERVICENOW_DELIVERABLES: DeliverableBody[] = [EXECUTIVE_BRIEF, BUSINESS_CASE, PROJECT_CHARTER, PROCESS_ANALYSIS, REQUIREMENTS, TECHNICAL_ASSESSMENT, TARGET_OPERATING_MODEL, RAID_REGISTER, ROADMAP]

/*
 * Making the contract tolerance authoritative changes what these documents may say about the
 * conflict: the band narrows, 240 invoices become exceptions at the first run, and the leakage
 * stops being accepted. Only the passages describing that decision are replaced.
 */
export const SERVICENOW_APPROVED_REVISIONS: Partial<Record<number, DeliverableRevision>> = {
	0: {
		findings: {
			"The enforced tolerance is wider than the negotiated one": {
				label: "The negotiated tolerance is now authoritative",
				detail: "The contract rule of ±1.5% supersedes the purchase-order rule of ±2% or $25. The 240 invoices worth $84,310.55 become exceptions at the first run and are tested against the contract register from then on.",
			},
		},
	},
	7: {
		findings: {
			"Two decisions are carried to Agentix rather than assumed": {
				label: "One decision is carried to Agentix rather than assumed",
				detail: "Tolerance authority was settled in the Discovery: the negotiated contract governs. Production release authority and the no-contract treatment remain open and go to Agentix as the engagement's first questions.",
			},
		},
	},
}
