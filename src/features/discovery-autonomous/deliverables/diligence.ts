import type { DeliverableBody } from "./types"

// NorthBridge Analytics acquisition diligence · Harborpeak investment committee
// Evidence base: 316 data-room documents, 92 diligence issues, 1,824 pipeline
// records, 18 ledger tables covering 24 months of actuals.

const EXECUTIVE_BRIEF: DeliverableBody = {
	heading: "Proceed, but reprice. The commercial thesis survives diligence; the definition of recurring revenue does not.",
	lede: "NorthBridge is a real business with a real growth engine, and nothing in 316 data-room documents contradicts the strategic case for owning it. What diligence does contradict is the number the price was built on. Management describes 94% recurring revenue; the ledger classifies 17% of the same contracts as implementation services. Reconciled, evidenced ARR is $41.5m rather than $50.0m — an 8.5m gap that, at the agreed 6.8× multiple, is worth $58m of purchase price.",
	metrics: [
		{ value: "$41.5m", label: "Evidenced ARR", note: "vs $50.0m claimed · 24-month ledger" },
		{ value: "$58m", label: "Value at stake on definition", note: "8.5m gap at the 6.8× multiple" },
		{ value: "38%", label: "ARR in the top five customers", note: "14% in the largest single account" },
		{ value: "$8.4m", label: "Platform modernization", note: "$3.1m unavoidable before day 100" },
	],
	keyMessages: [
		{ label: "The gap is a definition, not an error", detail: "Neither side miscalculated. Management counts multi-year implementation fees as recurring because they recur across the contract term; the ledger classifies them as services because they end. Both are defensible readings, which is exactly why it must be settled in the purchase agreement rather than in the first board pack after close." },
		{ label: "The growth engine is genuine", detail: "Net revenue retention of 112% on the reconciled base, 1,824 pipeline records showing a 23% year-on-year increase in qualified opportunities, and no evidence of pull-forward. The thesis is not the problem." },
		{ label: "Two costs arrive earlier than the model assumes", detail: "Platform modernization of $8.4m — of which $3.1m cannot wait past day 100 — and delivery capacity that constrains the growth plan before demand does. Neither breaks the deal; both need to sit in the integration budget rather than in a later surprise." },
	],
	sections: [
		{
			heading: "Situation",
			paragraphs: [
				"Harborpeak has agreed heads of terms at $340m, priced at 6.8× management's stated $50.0m of ARR. The investment thesis rests on three claims: durable recurring revenue, operating leverage as delivery scales, and a platform that can absorb 3× volume without material reinvestment.",
				"Diligence tested each claim against evidence rather than representation. All 316 data-room documents were indexed with provenance; 24 months of ledger actuals were re-derived across 18 tables; and 1,824 pipeline records were analysed for cohort behaviour rather than headline growth.",
				"Two of the three claims survive. Recurring revenue durability does not survive in the form presented, and the platform claim survives only if $8.4m of modernization is funded — which the current model does not do.",
			],
		},
		{
			heading: "Complication",
			paragraphs: [
				"The recurring-revenue gap is the single finding capable of changing the committee's answer. Reconciling the ledger against the contract set moves ARR from $50.0m to $41.5m, and the move is entirely compositional: $6.2m of implementation services counted as recurring, $1.8m of non-renewing pilots, $1.4m of one-time data migrations, partially offset by $0.9m of multi-year uplift that management had conservatively excluded.",
				"This is not an accusation. The CFO's classification is internally consistent and has been applied the same way for three years. But it is not the definition Harborpeak uses for its own portfolio reporting, and if the acquirer reports NorthBridge on the acquirer's definition after close, the same $8.5m gap reappears inside Harborpeak's numbers with no explanation attached to it.",
				"Concentration compounds the exposure. The top five customers hold 38% of reconciled ARR and the largest single account holds 14%. Under management's definition the concentration looks milder because implementation revenue is spread across a wider account base — so the definition question and the concentration question are the same question seen twice.",
			],
			exhibit: {
				kind: "waterfall",
				title: "Reconciled ARR is $41.5m — the $8.5m gap is composition, not calculation",
				caption: "Bridge from management's stated ARR to the ledger-evidenced figure across 24 months of actuals. Every step traces to a contract classification in the finance extract; none rests on a management representation.",
				source: "Finance extracts · NetSuite 24-month actuals (18 tables) · [LEDGER-24M] · [VDR-118]",
				unit: "$m",
				steps: [
					{ label: "Management ARR", value: 50.0, role: "base" },
					{ label: "Implementation services", value: -6.2, role: "delta" },
					{ label: "Non-renewing pilots", value: -1.8, role: "delta" },
					{ label: "One-time migrations", value: -1.4, role: "delta" },
					{ label: "Multi-year uplift", value: 0.9, role: "delta" },
					{ label: "Evidenced ARR", value: 41.5, role: "total" },
				],
			},
		},
		{
			heading: "Recommendation",
			paragraphs: [
				"Proceed at a revised price with a contractual definition of recurring revenue, and fund modernization from the integration budget rather than from the purchase price. That combination keeps the strategic case intact while moving both discovered costs into terms that can be negotiated rather than absorbed.",
				"The alternative of proceeding at the agreed price is not indefensible — the business is still worth owning at $340m if the growth case holds — but it asks the committee to approve a thesis whose largest line item is defined differently by the two sides of the table. That is a governance problem as much as a valuation one.",
				"Walking is disproportionate to the finding. Nothing in diligence suggests misrepresentation, the growth engine is evidenced, and a definition dispute settled in the agreement is an ordinary outcome of a thorough process.",
			],
			exhibit: {
				kind: "table",
				title: "Repricing is the only option that closes the definition gap before it becomes Harborpeak's problem",
				caption: "Three committee options assessed against the same evidence. Prices are indicative at the agreed 6.8× multiple applied to the relevant ARR basis.",
				source: "Committee model · [LEDGER-24M] · [VDR-118] · Readiness v7",
				columns: ["Option", "Indicative price", "Modernization funded by", "Residual exposure", "Verdict"],
				rows: [
					{ cells: ["Proceed as agreed", "$340m", "Unfunded", "$8.5m ARR gap surfaces in Harborpeak reporting post-close", "Not recommended"] },
					{ cells: ["Proceed at revised price with definition in the agreement", "$282–296m", "Integration budget", "Concentration only — hedged in the value plan", "Recommended"], emphasis: true },
					{ cells: ["Withdraw", "—", "—", "Forgoes an evidenced growth asset over a settleable definition", "Disproportionate"] },
				],
			},
		},
		{
			heading: "What the decision costs",
			paragraphs: [
				"Repricing requires reopening one term with the seller, and the seller will read it as a late-stage renegotiation. The mitigation is evidential rather than tactical: the reconciliation is reproducible from the seller's own ledger, and presenting it as a definition to be agreed rather than a discrepancy to be conceded is what keeps the conversation solvable.",
				"The second cost is timing. Settling the definition before signing adds an estimated two weeks. Against an IC date of 25 September, that is real but manageable; against the alternative of discovering the gap in the first post-close reporting cycle, it is trivial.",
			],
		},
		{
			heading: "What this package does not claim",
			paragraphs: [
				"The revenue classification conflict is disclosed, not resolved. No conclusion in this package rests on the management figure, and where the two definitions produce different answers, both are shown. The committee is being asked to choose a definition, not to accept one.",
				"Diligence did not obtain audited support for FY22, only management accounts. The reconciliation therefore covers 24 months of ledger actuals but cannot speak to the restated prior year. That limitation is carried in the RAID register as A-04 rather than smoothed over.",
			],
		},
	],
	findings: [
		{ label: "Recommended decision", detail: "Proceed at a revised price with a recurring-revenue definition written into the purchase agreement and modernization funded in the integration budget." },
		{ label: "Unresolved exposure", detail: "The revenue classification conflict is disclosed rather than resolved; no committee conclusion rests on the management figure." },
		{ label: "Single finding that could change the answer", detail: "If the seller refuses a contractual definition, the $8.5m gap becomes a permanent reporting inconsistency and the price basis cannot be defended internally." },
	],
	nextSteps: [
		{ action: "Table the reconciliation with the seller and propose the contractual definition", owner: "Elena Park · Deal Partner", due: "Before IC · 25 Sep" },
		{ action: "Close D-02: modernization funded from integration budget or price", owner: "Elena Park with Lauren Diaz", due: "Before agreement drafting" },
		{ action: "Model the concentration hedge for the top five accounts", owner: "Nate Brooks · COO", due: "Day 1–30" },
		{ action: "Secure retention terms for the two identified key roles", owner: "Elena Park · Deal Partner", due: "Pre-signing" },
	],
	citations: ["[VDR-118]", "[LEDGER-24M]", "[INT-MARCUS-02]", "[PIPE-1824]", "Readiness v7"],
}

const TECHNICAL_ASSESSMENT: DeliverableBody = {
	heading: "The platform can carry today's load and not the growth case. Modernization is $8.4m, and $3.1m of it cannot wait past day 100.",
	lede: "NorthBridge runs a single deployable application on managed infrastructure, and it runs it competently — availability is 99.94% and there is no evidence of systemic instability. The constraint is change, not uptime. Lead time is 14 days, change failure rate is 22%, and 61% of commits to the core service come from three engineers. The value plan assumes 3× volume through this platform in 30 months, and the platform in its current shape cannot absorb that without reinvestment that the model does not currently carry.",
	metrics: [
		{ value: "$8.4m", label: "Modernization over 30 months", note: "$3.1m before day 100" },
		{ value: "14 days", label: "Lead time to production", note: "Benchmark for the segment · 2 days" },
		{ value: "22%", label: "Change failure rate", note: "MTTR 6.5 hours · benchmark 1 hour" },
		{ value: "61%", label: "Core commits from three engineers", note: "Two are the identified key-person risk" },
	],
	keyMessages: [
		{ label: "Availability is not the problem; throughput of change is", detail: "The platform is stable and adequately operated. What it cannot do is absorb the release frequency the growth plan implies — 3 deploys a month against a plan that needs weekly, with a 22% failure rate that would compound at that cadence." },
		{ label: "The debt is concentrated, which makes it tractable", detail: "Three of nine domains carry 71% of the assessed debt: billing, tenant isolation, and the reporting pipeline. A domain-by-domain sequence retires the growth-blocking debt for $3.1m; the remaining $5.3m is elective and can follow revenue." },
		{ label: "Key-person exposure is structural, not cultural", detail: "61% of core-service commits from three engineers is not a retention problem to be solved with bonuses. It reflects a codebase where tenant isolation and billing logic are entangled, so only long-tenured engineers can change them safely." },
	],
	sections: [
		{
			heading: "Current-state architecture",
			paragraphs: [
				"NorthBridge runs a Rails-era monolith fronted by a managed load balancer, with a single Postgres primary, a read replica used for reporting, and a background worker fleet. Tenant separation is logical — a tenant identifier on every row — rather than physical. Analytics runs from the same primary through the replica, which is why heavy reporting periods coincide with the platform's slowest response times.",
				"This is a reasonable architecture for the business NorthBridge was and a constraining one for the business the thesis describes. Three specific properties bind: the reporting path shares the transactional database, billing logic is embedded in the monolith rather than isolated, and tenant isolation depends on query discipline instead of enforcement.",
				"None of these is a defect in the sense of being broken. Each is a decision that was correct at $12m of revenue and is expensive at $41.5m growing to $120m.",
			],
			exhibit: {
				kind: "architecture",
				title: "Reporting shares the transactional database, and billing lives inside the monolith — the two constraints that bind the growth case",
				caption: "Current state as evidenced in the data room and confirmed in technical interviews. Highlighted components are the three domains carrying 71% of assessed debt.",
				source: "Data room technical section · [VDR-204] · [INT-LAUREN-01]",
				lanes: ["Edge", "Application", "Data", "Consumers"],
				nodes: [
					{ id: "lb", label: "Managed load balancer", detail: "99.94% availability", lane: 0, row: 0, tone: "neutral" },
					{ id: "cdn", label: "CDN + static", detail: "No material risk", lane: 0, row: 1, tone: "neutral" },
					{ id: "mono", label: "Core monolith", detail: "3 deploys/month · 41% coverage", lane: 1, row: 0, tone: "warn" },
					{ id: "bill", label: "Billing logic", detail: "Embedded · no isolation", lane: 1, row: 1, tone: "warn" },
					{ id: "work", label: "Worker fleet", detail: "Shared queue, no priority", lane: 1, row: 2, tone: "neutral" },
					{ id: "pg", label: "Postgres primary", detail: "Single writer · logical tenancy", lane: 2, row: 0, tone: "warn" },
					{ id: "replica", label: "Read replica", detail: "Reporting + transactional", lane: 2, row: 1, tone: "warn" },
					{ id: "cust", label: "Customer app", detail: "1,824 accounts", lane: 3, row: 0, tone: "neutral" },
					{ id: "rep", label: "Analytics + reporting", detail: "Peaks degrade the platform", lane: 3, row: 1, tone: "warn" },
				],
				edges: [
					{ from: "lb", to: "mono" },
					{ from: "cdn", to: "cust", dashed: true },
					{ from: "mono", to: "bill" },
					{ from: "mono", to: "pg", label: "all writes" },
					{ from: "work", to: "pg" },
					{ from: "pg", to: "replica", label: "streaming" },
					{ from: "replica", to: "rep", label: "contended", tone: "warn" },
					{ from: "mono", to: "cust" },
				],
			},
		},
		{
			heading: "Engineering throughput against benchmark",
			paragraphs: [
				"Delivery metrics were derived from 18 months of repository and deployment history rather than from management's description, and they are consistent across the period — this is a stable operating pattern, not a bad quarter.",
				"Lead time from merge to production is 14 days against a segment benchmark of 2. Deployment frequency is 3 per month against a benchmark of 20. Change failure rate is 22% against 8%, and mean time to restore is 6.5 hours against 1. The last two matter most: at the release cadence the growth plan requires, a 22% failure rate produces roughly one customer-visible incident a week.",
				"The cause is visible in the same data. Test coverage on the core service is 41%, and the release process includes a manual regression pass that takes two engineer-days. Teams batch changes to avoid paying that cost, which lengthens lead time, which enlarges each release, which raises the failure rate — the loop is self-reinforcing and will not resolve with headcount alone.",
			],
			exhibit: {
				kind: "bar",
				title: "Every delivery metric sits 3–7× off benchmark, and the two that matter most are failure rate and restore time",
				caption: "NorthBridge against the segment benchmark for vertical SaaS at comparable scale, derived from 18 months of deployment and incident history. Values are shown as a multiple of benchmark — 1.0 would be at benchmark.",
				source: "Repository and deployment history · [VDR-204] · [INT-LAUREN-01]",
				unit: "× benchmark",
				data: [
					{ label: "Lead time to production", value: 7.0, note: "14 days vs 2", emphasis: true },
					{ label: "Change failure rate", value: 2.8, note: "22% vs 8%", emphasis: true },
					{ label: "Mean time to restore", value: 6.5, note: "6.5h vs 1h", emphasis: true },
					{ label: "Deployment frequency", value: 6.7, note: "3/month vs 20" },
					{ label: "Test coverage shortfall", value: 1.8, note: "41% vs 75% target" },
				],
			},
		},
		{
			heading: "Technical debt by domain",
			paragraphs: [
				"Debt was assessed across nine domains on four dimensions: coupling, test coverage, operational risk, and change cost. The result is unusually concentrated. Billing, tenant isolation, and the reporting pipeline carry 71% of the total assessed debt, and they are also the three domains the growth plan touches first.",
				"That concentration is good news for the investment case. A general modernization programme across nine domains would be a multi-year, unbudgetable commitment. A targeted programme against three domains has a defined scope, a defined cost, and a defined completion condition — which is what makes the $3.1m pre-day-100 figure credible rather than indicative.",
				"The six remaining domains are elective. They carry real debt, and none of it blocks the value plan within the hold period.",
			],
			exhibit: {
				kind: "heatmap",
				title: "Three of nine domains carry 71% of the debt — and they are the three the growth plan touches first",
				caption: "Assessed debt by domain and dimension (0 = healthy, 100 = blocking). Billing, tenant isolation, and reporting are the pre-day-100 scope; the remaining domains are elective within the hold period.",
				source: "Code and architecture assessment · [VDR-204] · 92 diligence issues · [INT-LAUREN-01]",
				columns: ["Coupling", "Coverage", "Ops risk", "Change cost"],
				rows: [
					{ label: "Billing and invoicing", values: [88, 76, 64, 91] },
					{ label: "Tenant isolation", values: [92, 71, 83, 87] },
					{ label: "Reporting pipeline", values: [74, 62, 88, 69] },
					{ label: "Identity and access", values: [46, 55, 41, 38] },
					{ label: "Ingestion", values: [39, 48, 52, 34] },
					{ label: "Notifications", values: [24, 31, 18, 22] },
					{ label: "Admin console", values: [31, 22, 14, 27] },
				],
				scale: ["Healthy", "Blocking"],
			},
		},
		{
			heading: "Modernization cost and sequence",
			paragraphs: [
				"The $8.4m estimate is built bottom-up from the three blocking domains plus the elective remainder, at loaded engineering cost over 30 months. It assumes the existing team plus 6 additional engineers, and it assumes no platform replacement — this is targeted extraction, not a rewrite.",
				"The $3.1m that cannot wait past day 100 is specific: separating the reporting path from the transactional database, and extracting billing from the monolith. Both are prerequisites for onboarding the enterprise cohort the growth plan depends on, because both are the reason enterprise security reviews currently take twelve weeks.",
				"The remaining $5.3m follows revenue and can be re-planned annually. If growth undershoots, it is deferrable without stranding the first $3.1m — that separability is deliberate and is what keeps the modernization from becoming an all-or-nothing commitment.",
			],
			exhibit: {
				kind: "waterfall",
				title: "$3.1m is unavoidable before day 100; the remaining $5.3m follows revenue and is deferrable",
				caption: "Bottom-up modernization estimate at loaded cost over 30 months. The first two bars are prerequisites for the enterprise cohort in the growth plan; the rest is elective and separable.",
				source: "Bottom-up estimate · [VDR-204] · [INT-LAUREN-01] · Readiness v7",
				unit: "$m",
				steps: [
					{ label: "Reporting separation", value: 1.7, role: "base" },
					{ label: "Billing extraction", value: 1.4, role: "delta" },
					{ label: "Tenant isolation", value: 2.2, role: "delta" },
					{ label: "Test and release", value: 1.8, role: "delta" },
					{ label: "Elective domains", value: 1.3, role: "delta" },
					{ label: "Total programme", value: 8.4, role: "total" },
				],
			},
		},
		{
			heading: "Security and compliance posture",
			paragraphs: [
				"Security posture is adequate for the current customer base and short of what the enterprise cohort will require. There is no evidence of a breach, no critical unpatched exposure at the time of assessment, and a functioning vulnerability management process.",
				"Two gaps are material to the thesis rather than to risk. Tenant isolation enforced by query discipline rather than by policy is the finding enterprise security reviews consistently fail — it is the single largest contributor to the twelve-week enterprise sales cycle. And the absence of SOC 2 Type II, currently in observation window, blocks three of the seven named enterprise targets in the pipeline outright.",
				"Both are on the modernization path already. The point for the committee is that they are commercial constraints wearing technical clothing: fixing them is how the enterprise cohort becomes addressable, not merely how risk is reduced.",
			],
			bullets: [
				{ label: "No critical exposure found", detail: "No breach evidence, no critical unpatched CVE at assessment, functioning patch cadence." },
				{ label: "Tenant isolation is the enterprise blocker", detail: "Logical separation by query discipline. Fails enterprise security review; drives the 12-week enterprise cycle." },
				{ label: "SOC 2 Type II in observation", detail: "Blocks 3 of 7 named enterprise targets until the window closes in month 7." },
			],
		},
	],
	findings: [
		{ label: "Root technical constraint", detail: "Change throughput, not availability. A 22% change failure rate and 14-day lead time cannot support the release cadence the value plan implies, and headcount alone does not fix the loop." },
		{ label: "Highest-value technical action", detail: "Separate reporting from the transactional database and extract billing — $3.1m, pre-day-100, and the precondition for the enterprise cohort." },
		{ label: "Key-person exposure", detail: "61% of core-service commits from three engineers, two of whom are the identified retention risks. This is a consequence of entangled billing and tenancy code, and it resolves as those domains are extracted." },
	],
	nextSteps: [
		{ action: "Fix the $8.4m modernization estimate as a diligence condition, not an estimate", owner: "Lauren Diaz · Technology Diligence Lead", due: "Pre-signing" },
		{ action: "Secure retention terms for the two key platform roles", owner: "Elena Park · Deal Partner", due: "Pre-signing" },
		{ action: "Sequence reporting separation and billing extraction into the 100-day plan", owner: "Lauren Diaz with Nate Brooks", due: "Day 1–45" },
		{ action: "Confirm the SOC 2 Type II observation window closing date", owner: "Lauren Diaz · Technology Diligence Lead", due: "Day 30" },
	],
	citations: ["[VDR-204]", "[INT-LAUREN-01]", "[VDR-118]", "Readiness v7"],
}

const TARGET_OPERATING_MODEL: DeliverableBody = {
	heading: "Delivery capacity, not demand, is the constraint. Day 1 authority concentrates in three named owners and nothing else moves.",
	lede: "The value plan assumes demand is the binding constraint. The pipeline does not support that: 1,824 records show qualified opportunity growing 23% year on year while delivery utilisation already runs at 87%. The operating model therefore concentrates Day 1 authority in three roles, defers every change that does not affect the first 100 days, and keeps finance reporting on the target's ledger until the revenue definition is settled in writing.",
	metrics: [
		{ value: "87%", label: "Delivery utilisation today", note: "Growth plan implies 118%" },
		{ value: "22 FTE", label: "Delivery capacity gap", note: "Hiring plan assumes 14" },
		{ value: "3", label: "Day 1 decision owners", note: "COO, Technology Lead, Deal Partner" },
		{ value: "112%", label: "Net revenue retention", note: "On the reconciled ARR base" },
	],
	keyMessages: [
		{ label: "Capacity binds before demand does", detail: "At 87% utilisation and 23% opportunity growth, the delivery organisation runs out of room in month 7 on the current hiring plan. The gap is 22 FTE against a plan for 14, and the shortfall is in implementation consultants rather than engineers." },
		{ label: "Authority is concentrated deliberately for 100 days", detail: "Three owners hold every material Day 1 decision. Distributed authority in the first 100 days produces consensus-seeking at exactly the moment speed matters, and the integration steering group is explicitly not a decision body." },
		{ label: "Reporting stays on the target's ledger until the definition is agreed", detail: "Migrating to the acquirer's definition before the contractual definition is settled would restate the same $8.5m conflict inside Harborpeak's numbers with no explanation attached." },
	],
	sections: [
		{
			heading: "Decision rights",
			paragraphs: [
				"The COO owns delivery capacity and the customer concentration response. This is the operating constraint with the shortest fuse, and it needs a single owner who can commit hiring and re-sequence customer onboarding without a committee.",
				"The Technology Diligence Lead owns platform debt sequencing through day 100, after which it transfers to a permanent CTO. Splitting that ownership earlier would put the modernization sequence in the hands of someone who did not do the assessment.",
				"The Deal Partner owns the value-creation plan and is the only role that can reopen a diligence conclusion. That constraint exists because the most common failure in the first 100 days is a diligence finding being quietly renegotiated by an operator who was not in the room when it was established.",
			],
			exhibit: {
				kind: "table",
				title: "Three owners, three domains, and one rule about reopening diligence conclusions",
				caption: "Day 1 decision rights. Anything not listed here defers past day 100 by default — the operating model is deliberately incomplete because completeness costs speed in the first quarter.",
				source: "Post-close operating model · [INT-NATE-05] · [VDR-204] · Readiness v7",
				columns: ["Domain", "Owner", "Decides without escalation", "Escalates to committee"],
				rows: [
					{ cells: ["Delivery capacity", "COO", "Hiring, sequencing, customer onboarding order", "Any change to the growth plan's revenue phasing"] },
					{ cells: ["Platform modernization", "Technology Diligence Lead", "Sequence and technical approach within the $3.1m", "Spend above the fixed envelope"], emphasis: true },
					{ cells: ["Value-creation plan", "Deal Partner", "Plan changes that do not touch diligence conclusions", "Anything touching the repricing assumptions"] },
					{ cells: ["Finance reporting", "Target CFO, interim", "Operational reporting on the target ledger", "Migration to the acquirer's definition"] },
				],
			},
		},
		{
			heading: "The capacity constraint",
			paragraphs: [
				"Delivery utilisation runs at 87% across the implementation organisation, measured over the trailing four quarters rather than at a point in time. The growth plan implies 118% on the current establishment — which is to say the plan is not deliverable as staffed, and the gap appears in month 7 rather than at the end of the horizon.",
				"The COO's own assessment is that hiring closes it. The evidence partially disagrees: the constraint is not headcount alone but ramp time, which averages 4.5 months for implementation consultants, and a tooling gap in the onboarding workflow that adds roughly 30% to each implementation. Hiring 22 FTE without addressing the tooling produces 22 people working at the same inefficiency.",
				"This is the specific reason A-02 in the RAID register is flagged: the assumption that capacity scales with hiring alone is the one the 100-day plan is most exposed to, and it can be tested by day 45 rather than discovered in month 7.",
			],
			exhibit: {
				kind: "line",
				title: "On the current hiring plan, delivery capacity runs out in month 7 — before demand does",
				caption: "Required versus available delivery capacity by month, in FTE. The gap opens at month 7 and reaches 22 FTE by month 12. Tooling improvement shifts the crossing point by roughly four months without additional hiring.",
				source: "Pipeline analysis (1,824 records) · [PIPE-1824] · [INT-NATE-05]",
				unit: "FTE",
				ticks: ["M1", "M3", "M5", "M7", "M9", "M12"],
				series: [
					{ label: "Required by pipeline", points: [64, 71, 79, 88, 97, 108], tone: "brand" },
					{ label: "Available · current plan", points: [64, 68, 74, 79, 83, 86], tone: "warn" },
					{ label: "Available · with tooling fix", points: [64, 70, 78, 87, 94, 101], tone: "muted", dashed: true },
				],
			},
		},
		{
			heading: "Handoffs and reporting",
			paragraphs: [
				"Finance integration runs on the target's ledger until the recurring-revenue definition is agreed in writing. Reporting on the acquirer's definition before that point would restate the same conflict inside the acquirer's numbers, and it would do so without the reconciliation attached — which is how a settled diligence finding becomes an unexplained variance six months later.",
				"Customer-facing handoffs are deliberately minimal in the first 100 days. The top five accounts hold 38% of ARR, and the concentration response is a retention exercise before it is a growth one: no account team changes, no platform migration commitments, and no contract renegotiations initiated by the acquirer inside the first quarter.",
			],
		},
	],
	findings: [
		{ label: "Accountable owner", detail: "The COO owns the 100-day plan; the Deal Partner owns the thesis and any change to it. No third role can reopen a diligence conclusion." },
		{ label: "Escalation boundary", detail: "Any variance touching the repricing assumptions returns to the committee, not to the integration steering group — which is explicitly not a decision body." },
		{ label: "Binding operating constraint", detail: "Delivery capacity at 87% utilisation with a 22 FTE gap by month 12. Hiring alone closes roughly two thirds of it; the tooling gap closes the rest." },
	],
	nextSteps: [
		{ action: "Name the three Day 1 owners and publish the deferral rule", owner: "Elena Park · Deal Partner", due: "Signing" },
		{ action: "Build the capacity plan against pipeline, not forecast", owner: "Nate Brooks · COO", due: "Day 1–45" },
		{ action: "Test A-02: does hiring alone close the capacity gap", owner: "Nate Brooks · COO", due: "Day 45" },
		{ action: "Hold finance reporting on the target ledger until the definition is signed", owner: "Marcus Reed · Target CFO, interim", due: "Until agreement" },
	],
	citations: ["[VDR-204]", "[INT-NATE-05]", "[PIPE-1824]", "Readiness v7"],
}

const REQUIREMENTS: DeliverableBody = {
	heading: "Fourteen conditions that can be tested before signing, rather than discovered after close.",
	lede: "Each requirement names the evidence, the owner, and the state it must reach before the committee's answer is safe. Four are pre-signing conditions, seven are day-1-to-45, and three run to day 100. Four operational use cases carry the post-close behaviour, and every acceptance criterion is written so a tester can fail it. No condition may be satisfied by management representation where a system of record exists — a rule that would have caught the recurring-revenue gap eleven weeks earlier than diligence did.",
	metrics: [
		{ value: "14", label: "Testable conditions", note: "4 pre-signing · 7 by day 45" },
		{ value: "316", label: "Data-room documents indexed", note: "With record-level provenance" },
		{ value: "0", label: "Conditions met by representation alone", note: "Where a system of record exists" },
		{ value: "REQ-04", label: "Highest-risk condition", note: "Recurring-revenue definition" },
	],
	keyMessages: [
		{ label: "Conditions are pre-signing wherever they can be", detail: "A condition that can only be tested after close is not a condition, it is a hope. Four of the fourteen are pre-signing precisely because their failure would change the price rather than the plan." },
		{ label: "Every conclusion resolves to a source", detail: "All 316 data-room documents were indexed with provenance, so a committee challenge resolves to a document, a ledger extract, or a pipeline record rather than to a recollection of a meeting." },
		{ label: "The tie-breaker is named in advance", detail: "Where management representation and system of record disagree, the system of record governs. Naming the tie-breaker before the disagreement arises is what makes REQ-04 enforceable." },
	],
	sections: [
		{
			heading: "Control points",
			paragraphs: [
				"Revenue classification, customer concentration disclosure, platform modernization cost, and key-person retention are separately evidenced, with separate owners and separate tests. They are separated deliberately: bundling them into a single 'diligence conditions' clause is how individual conditions get traded away in negotiation.",
				"No condition may be satisfied by management representation alone where a system of record exists. The recurring-revenue gap is the argument for this rule — it persisted for three years not because anyone concealed it but because nobody had tested the representation against the ledger.",
			],
			exhibit: {
				kind: "table",
				title: "Four conditions must clear before signing; failure of REQ-04 changes the price, not the plan",
				caption: "Extract from the 14-condition set. Pre-signing conditions are those whose failure would change the committee's answer rather than the integration sequence.",
				source: "Diligence conditions register · [VDR-118] · [LEDGER-24M] · [PIPE-1824]",
				columns: ["ID", "Condition", "Evidence", "Owner", "Test", "Gate"],
				rows: [
					{ cells: ["REQ-04", "Recurring revenue defined contractually with the ledger as tie-breaker", "24-month ledger", "Elena Park", "Re-run ledger under agreed definition; result must equal the committee model", "Pre-signing"], emphasis: true },
					{ cells: ["REQ-06", "Modernization cost fixed at $8.4m with $3.1m pre-day-100", "Bottom-up estimate", "Lauren Diaz", "Estimate re-derived independently within 10% variance", "Pre-signing"] },
					{ cells: ["REQ-08", "Retention terms executed for two named platform roles", "Employment terms", "Elena Park", "Signed terms in the disclosure schedule", "Pre-signing"] },
					{ cells: ["REQ-11", "Top-five concentration disclosed on the reconciled base", "Pipeline + ledger", "Marcus Reed", "Concentration restated at 38% on evidenced ARR", "Pre-signing"] },
					{ cells: ["REQ-02", "Delivery capacity plan evidenced against pipeline", "1,824 records", "Nate Brooks", "Capacity plan reconciles to qualified pipeline, not forecast", "Day 45"] },
					{ cells: ["REQ-09", "SOC 2 Type II observation window closing date confirmed", "Auditor letter", "Lauren Diaz", "Written confirmation of window close in month 7", "Day 30"] },
				],
			},
		},
		{
			heading: "Use cases and acceptance criteria",
			paragraphs: [
				"Four operational use cases carry the post-close requirements. They are written from the operator's perspective rather than the deal team's, because after day 100 the people using them will not have been in the diligence room and the criteria have to stand without that context.",
				"Each acceptance criterion is written so it can be failed. 'Reporting is accurate' cannot be tested; 'recurring share reported on the agreed definition equals the ledger re-run to within 0.5 percentage points' can, and it is the criterion that would have caught the classification gap three years earlier.",
			],
			exhibit: {
				kind: "table",
				title: "Four post-close use cases, each with a criterion that can actually be failed",
				caption: "Operational use cases the integration must support, with acceptance criteria in given/when/then form. UC-02 is the criterion that would have surfaced the revenue classification gap.",
				source: "Use-case model · [LEDGER-24M] · [PIPE-1824] · [INT-MARCUS-02]",
				columns: ["ID", "Use case", "Actor", "Alternate flow", "Acceptance criterion"],
				rows: [
					{ cells: ["UC-01", "Plan delivery capacity against pipeline", "COO", "Qualified pipeline changes mid-quarter", "Given a capacity plan, when qualified pipeline moves more than 10%, then the plan re-derives and the variance is reported within one week"] },
					{ cells: ["UC-02", "Report recurring revenue on the agreed definition", "Target CFO", "Contract classification is ambiguous", "Given the agreed definition, when recurring share is reported, then it equals the ledger re-run to within 0.5 percentage points"], emphasis: true },
					{ cells: ["UC-03", "Onboard an enterprise customer", "Delivery lead", "Security review requires tenant isolation", "Given an enterprise prospect, when security review runs, then isolation evidence exists or the opportunity is flagged as blocked, never as pending"] },
					{ cells: ["UC-04", "Escalate a concentration event", "COO", "A top-five account signals non-renewal", "Given a top-five renewal risk, when it is identified, then the committee is notified within five working days regardless of the reporting cycle"] },
				],
			},
		},
		{
			heading: "Evidence lineage",
			paragraphs: [
				"Every conclusion links to the data-room document, ledger extract, or pipeline record it rests on. The 316 documents were indexed with provenance at record level, which means a challenge in the committee resolves in seconds rather than becoming an action item.",
				"Where evidence is absent, that absence is recorded as a limitation rather than bridged by inference. Two such limitations exist: audited support for FY22 was not provided, and the vendor's own customer churn definition could not be reconciled to the pipeline for accounts below $50k ARR. Both are in the RAID register and neither is load-bearing for the recommendation.",
				"The one place inference was used is the modernization estimate, which is a bottom-up construction rather than an observed figure. REQ-06 therefore requires it to be re-derived independently within a 10% variance before signing — an estimate that cannot survive a second derivation should not be a condition of price.",
			],
		},
	],
	findings: [
		{ label: "Highest-risk requirement", detail: "REQ-04: recurring revenue must be defined contractually before signing, with the ledger classification as the tie-breaker." },
		{ label: "Test that proves it", detail: "Re-run the 24-month ledger under the agreed definition; the resulting recurring share must be the figure in the committee model." },
		{ label: "Condition most likely to be traded away", detail: "REQ-08, key-person retention terms. It is the cheapest condition to concede in negotiation and the most expensive to lose, given 61% of core commits sit with three engineers." },
	],
	nextSteps: [
		{ action: "Clear the four pre-signing conditions in order of price impact", owner: "Elena Park · Deal Partner", due: "Pre-signing" },
		{ action: "Commission the independent re-derivation of the $8.4m estimate", owner: "Lauren Diaz · Technology Diligence Lead", due: "Pre-signing" },
		{ action: "Restate concentration on the reconciled ARR base for the committee pack", owner: "Marcus Reed · Target CFO", due: "Before IC · 25 Sep" },
		{ action: "Record the two evidence limitations in the disclosure schedule", owner: "Deal team", due: "Pre-signing" },
	],
	citations: ["[VDR-118]", "[LEDGER-24M]", "[INT-LAUREN-01]", "[PIPE-1824]", "Readiness v7"],
}

const RAID_REGISTER: DeliverableBody = {
	heading: "Twenty-two items, three at committee level, and every one of them closes on a date before day 30.",
	lede: "Eleven risks, five assumptions, two issues, and four decisions carry owners and dates. Three items are committee-level and the rest belong to the integration plan. The register is scored on the same scale the portfolio uses post-close, so the first board pack inherits a live instrument rather than a diligence artifact that stops being updated the week after signing.",
	metrics: [
		{ value: "22", label: "Open items with owner and date", note: "11 risks · 5 assumptions · 2 issues · 4 decisions" },
		{ value: "3", label: "Items at committee level", note: "R-01, R-04, D-02" },
		{ value: "2", label: "Risks rated high and likely", note: "R-01 revenue quality · R-04 concentration" },
		{ value: "Day 30", label: "Latest close date in the register", note: "Nothing carries indefinitely" },
	],
	keyMessages: [
		{ label: "Revenue quality and concentration are the same risk twice", detail: "R-01 and R-04 both resolve from the definition question. Settling REQ-04 moves both, which is why the register treats them as a linked pair rather than as independent items." },
		{ label: "The assumptions are the exposure, not the risks", detail: "A-02 and A-05 carry more of the value plan than any single risk. Both are testable inside 45 days, and both currently read as management's view rather than as evidenced positions." },
		{ label: "Nothing carries past day 30 without a decision", detail: "Every item has a close date. An item without one becomes a standing agenda entry, and standing agenda entries are how diligence findings quietly become accepted conditions." },
	],
	sections: [
		{
			heading: "Risk profile",
			paragraphs: [
				"Two risks sit in the act-now quadrant. R-01, that recurring revenue quality is overstated under the acquirer's definition, is the single finding most capable of changing the committee's answer. R-04, that the top five customers represent a concentration the value plan does not hedge, is second and is partially a consequence of the first.",
				"Three risks sit in the monitor quadrant, including the platform modernization overrun risk, which is scored lower than instinct suggests because the estimate is separable — an overrun on the elective $5.3m does not compromise the $3.1m already committed.",
				"The technology risks that would normally dominate a diligence register are middling here, and deliberately so. NorthBridge's platform problem is a cost and a timing problem, both of which are quantified. It is the definitional and capacity questions that carry genuine uncertainty.",
			],
			exhibit: {
				kind: "quadrant",
				title: "Two risks demand action before signing; both resolve from the same definition question",
				caption: "Eleven risks scored on impact against likelihood. R-01 and R-04 are linked — settling the recurring-revenue definition moves both.",
				source: "RAID register · [LEDGER-24M] · [PIPE-1824] · Readiness v7",
				xAxis: ["Unlikely", "Likely"],
				yAxis: ["Contained impact", "Severe impact"],
				points: [
					{ label: "R-01 revenue quality", x: 84, y: 92, emphasis: true },
					{ label: "R-04 concentration", x: 69, y: 76, emphasis: true },
					{ label: "R-02 capacity gap", x: 72, y: 58 },
					{ label: "R-06 key person", x: 51, y: 71 },
					{ label: "R-03 modernization overrun", x: 44, y: 47 },
					{ label: "R-05 enterprise cycle", x: 61, y: 33 },
					{ label: "R-08 SOC 2 slip", x: 37, y: 42 },
					{ label: "R-07 churn definition", x: 28, y: 29 },
					{ label: "R-09 integration cost", x: 30, y: 16 },
					{ label: "R-10 tooling adoption", x: 53, y: 26 },
					{ label: "R-11 reporting migration", x: 22, y: 36 },
				],
			},
		},
		{
			heading: "Open at committee level",
			paragraphs: [
				"R-01 — recurring revenue quality is overstated under the acquirer's definition. Unresolved until REQ-04 is settled contractually; it is disclosed rather than mitigated because the mitigation is a negotiation, not an action.",
				"R-04 — the top five customers represent 38% of reconciled ARR, and the value plan does not currently hedge it. The hedge is a commercial plan rather than a diligence finding, which is why it belongs to the COO by day 30 rather than to the deal team now.",
				"D-02 — whether modernization is funded from the integration budget or the purchase price. This must close before the purchase agreement is drafted, or the $8.4m is either funded twice or not at all. It is the cleanest of the three because it is purely a structuring choice.",
			],
			exhibit: {
				kind: "table",
				title: "Every committee-level item has a named closing condition and a date before signing or day 30",
				caption: "Top eight items by severity from the 22-item register. Closing conditions are evidential; none closes on a review meeting.",
				source: "RAID register · Readiness v7 · [VDR-118] · [LEDGER-24M]",
				columns: ["ID", "Type", "Item", "Owner", "Closes when", "Due"],
				rows: [
					{ cells: ["R-01", "Risk", "Recurring revenue overstated under acquirer definition", "Elena Park", "REQ-04 definition executed in the agreement", "Pre-signing"], emphasis: true },
					{ cells: ["R-04", "Risk", "Top-five concentration unhedged in the value plan", "Nate Brooks", "Concentration response modelled and funded", "Day 30"], emphasis: true },
					{ cells: ["D-02", "Decision", "Modernization funded from integration budget or price", "Elena Park", "Structuring decision recorded before drafting", "Pre-signing"], emphasis: true },
					{ cells: ["A-02", "Assumption", "Delivery capacity scales with hiring alone", "Nate Brooks", "Day 45 capacity test against qualified pipeline", "Day 45"] },
					{ cells: ["A-05", "Assumption", "No key-person dependency in the platform team", "Lauren Diaz", "Contradicted for two roles; retention terms executed", "Pre-signing"] },
					{ cells: ["R-06", "Risk", "Two key engineers leave before extraction completes", "Lauren Diaz", "Retention terms plus billing extraction complete", "Day 100"] },
					{ cells: ["A-04", "Assumption", "FY22 management accounts are representative", "Marcus Reed", "Recorded as a limitation; no conclusion rests on FY22", "Closed as limitation"] },
					{ cells: ["I-01", "Issue", "Churn definition unreconcilable below $50k ARR", "Marcus Reed", "Definition agreed or scope of claim narrowed", "Day 30"] },
				],
			},
		},
		{
			heading: "Assumptions under test",
			paragraphs: [
				"A-02 assumes delivery capacity scales with hiring alone. The COO interview indicates a tooling constraint that hiring does not remove, and the capacity model shows the tooling fix moving the crossing point by roughly four months on its own. This assumption is testable by day 45 and is the one most likely to change the shape of the 100-day plan.",
				"A-05 assumed no key-person dependency in the platform team. The technology review contradicts it for two roles, and the assumption is therefore already falsified — it remains in the register because the mitigation (retention terms) is not yet executed, and an assumption known to be false with an open mitigation is more dangerous than one still being tested.",
			],
		},
	],
	findings: [
		{ label: "Highest-rated risk", detail: "R-01, rated high impact and likely: it is the single finding most capable of changing the committee's answer." },
		{ label: "Decision awaiting a date", detail: "D-02 must close before the purchase agreement is drafted, or modernization is funded twice or not at all." },
		{ label: "Falsified assumption still open", detail: "A-05 is contradicted by the technology review for two roles. It stays open until retention terms are executed rather than being quietly closed." },
	],
	nextSteps: [
		{ action: "Close D-02 before agreement drafting", owner: "Elena Park · Deal Partner", due: "Pre-signing" },
		{ action: "Execute retention terms and close A-05", owner: "Elena Park with Lauren Diaz", due: "Pre-signing" },
		{ action: "Run the day-45 capacity test against qualified pipeline", owner: "Nate Brooks · COO", due: "Day 45" },
		{ action: "Model and fund the concentration hedge", owner: "Nate Brooks · COO", due: "Day 30" },
	],
	citations: ["[VDR-204]", "[INT-NATE-05]", "[LEDGER-24M]", "Readiness v7"],
}

const ROADMAP: DeliverableBody = {
	heading: "Conditions that must be true before signing are separated from actions that can wait — so the committee approves a sequence, not an intention.",
	lede: "Three phases from signing to day 100. Pre-signing carries the four conditions whose failure changes the price. Days 1–45 carry delivery capacity and the concentration response. Days 46–100 start platform modernization and prepare the reporting migration. The revenue definition gates all three, which is why it appears first and alone.",
	metrics: [
		{ value: "4", label: "Conditions before signing", note: "Failure changes price, not plan" },
		{ value: "Day 45", label: "First evidenced checkpoint", note: "Capacity against pipeline, not forecast" },
		{ value: "$3.1m", label: "Modernization committed by day 100", note: "Budget committed, not merely planned" },
		{ value: "Day 100", label: "Reporting migration prepared", note: "Executed only after definition signs" },
	],
	keyMessages: [
		{ label: "The revenue definition is the true critical path", detail: "It gates the committee model, the purchase agreement, and the reporting migration. No other item can be sequenced around it, and every day it slips moves three workstreams." },
		{ label: "Day 45 is measured against pipeline, not forecast", detail: "Capacity plans validated against forecast are self-confirming. The day-45 checkpoint uses the 1,824 qualified pipeline records, which is the only capacity evidence that is not management's own projection." },
		{ label: "Modernization must be committed, not planned, by day 100", detail: "A modernization plan without a committed budget is deferred by the first quarter that misses. The checkpoint is budget commitment, deliberately, because that is the falsifiable version." },
	],
	sections: [
		{
			heading: "Sequence",
			paragraphs: [
				"Pre-signing: revenue definition agreed and executed, modernization cost fixed at $8.4m with $3.1m ring-fenced, retention terms for two key platform roles, and concentration restated on the reconciled base. These four are the price-relevant conditions and none of them can move past signing without changing what the committee approved.",
				"Days 1–45: the delivery capacity plan built against qualified pipeline, the concentration response modelled and funded, and the A-02 tooling assumption tested. This phase is deliberately operational — nothing structural happens in the first six weeks beyond establishing whether the capacity case holds.",
				"Days 46–100: reporting separation and billing extraction begin, consuming the ring-fenced $3.1m, and the reporting migration is prepared but not executed. Migration waits for the signed definition regardless of readiness, because migrating first would restate the diligence conflict inside Harborpeak's numbers.",
			],
			exhibit: {
				kind: "timeline",
				title: "The revenue definition gates three workstreams; everything else is sequenced around it",
				caption: "Signing to day 100. Darker bars are on the critical path. Reporting migration is prepared in phase three but executed only once the contractual definition is signed.",
				source: "100-day plan · Readiness v7 · [INT-MARCUS-02] · [INT-NATE-05]",
				ticks: ["Pre", "D1", "D15", "D30", "D45", "D60", "D75", "D100"],
				lanes: [
					{ label: "Deal conditions", bars: [{ label: "Definition · cost · retention", start: 0, span: 1, tone: "brand" }] },
					{ label: "Delivery capacity", bars: [{ label: "Plan against pipeline", start: 1, span: 3, tone: "brand" }, { label: "Hiring and ramp", start: 4, span: 4, tone: "muted" }] },
					{ label: "Concentration", bars: [{ label: "Model and fund the hedge", start: 1.5, span: 2.5, tone: "muted" }] },
					{ label: "Modernization", bars: [{ label: "Reporting separation + billing", start: 4, span: 4, tone: "brand" }] },
					{ label: "Reporting migration", bars: [{ label: "Prepare only", start: 5, span: 3, tone: "warn" }] },
				],
				markers: [
					{ label: "Signing", at: 1 },
					{ label: "Day 45", at: 4 },
					{ label: "Day 100", at: 8 },
				],
			},
		},
		{
			heading: "Checkpoints",
			paragraphs: [
				"Day 1 requires the agreed revenue definition present in the purchase agreement. Not agreed in principle, not scheduled for a side letter — present in the executed document. This is a binary condition and it is the one the committee should ask about first at every subsequent review.",
				"Day 45 requires delivery capacity evidenced against the pipeline rather than the forecast. The test is specific: does the capacity plan reconcile to the 1,824 qualified pipeline records, and does it hold if A-02's tooling assumption is false. A plan that only works if hiring alone suffices does not pass.",
				"Day 100 requires modernization underway with its budget already committed. The distinction between planned and committed is the whole point of the checkpoint: at 100 days a modernization programme that is merely planned has already been deferred once and will be deferred again.",
			],
		},
		{
			heading: "The measurement that proves the thesis",
			paragraphs: [
				"Recurring share reported on the agreed definition at day 45, compared against the diligence figure of $41.5m. If the reported figure differs materially, either the definition was not applied as agreed or the diligence reconciliation was wrong — and both are worth knowing at day 45 rather than at the first annual review.",
				"The secondary measure is delivery capacity utilisation, which should fall from 87% toward 80% as hiring lands. A utilisation figure that stays flat while headcount rises is the signature of the tooling constraint, and it would confirm A-02's falsification without waiting for the growth plan to miss.",
			],
		},
	],
	findings: [
		{ label: "Critical path", detail: "The revenue definition gates the committee model, the purchase agreement, and reporting migration — nothing else can be sequenced around it." },
		{ label: "First measurable proof", detail: "Recurring share reported on the agreed definition at day 45, compared to the $41.5m diligence figure." },
		{ label: "Checkpoint most likely to be softened", detail: "Day 100 modernization commitment. 'Planned' will be offered in place of 'committed'; the distinction is the checkpoint." },
	],
	nextSteps: [
		{ action: "Execute the revenue definition in the purchase agreement", owner: "Elena Park · Deal Partner", due: "Signing" },
		{ action: "Build and evidence the capacity plan against qualified pipeline", owner: "Nate Brooks · COO", due: "Day 45" },
		{ action: "Ring-fence and commit the $3.1m modernization budget", owner: "Elena Park with Lauren Diaz", due: "Day 60" },
		{ action: "Report recurring share on the agreed definition", owner: "Marcus Reed · Target CFO", due: "Day 45" },
	],
	citations: ["[VDR-118]", "[PIPE-1824]", "[INT-MARCUS-02]", "Readiness v7"],
}

const BUSINESS_CASE: DeliverableBody = {
	heading: "At $340m the deal returns 2.0× and misses the hurdle. At the repriced basis it returns 2.6× — the price is the whole business case.",
	lede: "The value-creation plan is the same under every option: grow ARR from $41.5m to roughly $100m over a five-year hold through new logo, expansion, and an enterprise cohort that modernization unlocks. What changes between options is the entry basis. At the agreed $340m the deal returns 2.0× and a 15% IRR against a 2.5× and 20% hurdle. Repriced to $290m with the definition settled and modernization funded from the integration budget, it returns 2.6× and 21%.",
	metrics: [
		{ value: "2.6×", label: "MOIC at the repriced basis", note: "2.0× at the agreed $340m" },
		{ value: "21%", label: "IRR over a five-year hold", note: "Hurdle 20% · 15% unrepriced" },
		{ value: "$100m", label: "Exit ARR in the base case", note: "From $41.5m evidenced today" },
		{ value: "$14.6m", label: "Total capital beyond price", note: "$8.4m modernization · $6.2m integration" },
	],
	keyMessages: [
		{ label: "The value plan is not in dispute; the entry price is", detail: "Every option models the same $100m exit ARR and the same 5.5× exit multiple. The options differ only in what Harborpeak pays to enter, which means the committee is deciding a price rather than a strategy." },
		{ label: "Only the repriced option clears the hurdle", detail: "At $340m the deal returns 2.0× and 15%. The earn-out structure returns 2.4× and 19% and still misses. Repricing to $290m is the only structure that clears both the MOIC and the IRR hurdle without assuming a better growth case." },
		{ label: "The plan needs $14.6m of capital beyond the price", detail: "$8.4m of modernization and $6.2m of integration and capacity investment. Neither is in the current model, and both are prerequisites for the enterprise cohort that carries $21m of the ARR bridge." },
	],
	sections: [
		{
			heading: "Objectives and investment thesis",
			paragraphs: [
				"The thesis is a vertical analytics platform with durable recurring revenue, growing into an enterprise cohort it currently cannot serve. Diligence tested three claims: revenue durability, operating leverage, and platform headroom. The first survives only under an agreed definition, the second is capacity-constrained, and the third requires funded modernization.",
				"None of those findings invalidates the thesis. They change what has to be true and what has to be paid, which is exactly what an investment case is for.",
			],
			bullets: [
				{ label: "Grow ARR from $41.5m to $100m", detail: "New logo $28m, expansion $14m at 112% NRR, enterprise cohort $21m, less $4.5m churn." },
				{ label: "Unlock the enterprise cohort by month 18", detail: "Requires tenant isolation and SOC 2 Type II. Three of seven named targets are blocked today." },
				{ label: "Hold delivery gross margin above 62%", detail: "Requires the implementation tooling fix; hiring alone holds it at 54%." },
			],
		},
		{
			heading: "The value bridge",
			paragraphs: [
				"The ARR bridge is built bottom-up from the 1,824 pipeline records and the reconciled contract base rather than from a growth rate applied to a headline. Each component has a different confidence and a different dependency, and the enterprise cohort is the one most exposed to execution.",
				"Expansion is the highest-confidence line: net revenue retention of 112% is measured on the reconciled base across 24 months and does not depend on anything the integration must deliver. New logo growth continues the observed 23% year-on-year increase in qualified opportunity, discounted for capacity.",
				"The enterprise cohort at $21m is the line that justifies the modernization spend, and it is contingent on it. If tenant isolation and SOC 2 do not land, that $21m does not arrive and the exit ARR falls to roughly $79m — which returns 2.0× even at the repriced basis. The modernization is not optional in the value case.",
			],
			exhibit: {
				kind: "waterfall",
				title: "The enterprise cohort is $21m of the bridge and is entirely contingent on the $8.4m modernization landing",
				caption: "Five-year ARR bridge from the evidenced base. Remove the enterprise cohort and exit ARR falls to $79m, which returns 2.0× even at the repriced entry.",
				source: "Value model · [PIPE-1824] · [LEDGER-24M] · [VDR-204]",
				unit: "$m",
				steps: [
					{ label: "Evidenced ARR", value: 41.5, role: "base" },
					{ label: "New logo", value: 28.0, role: "delta" },
					{ label: "Expansion at 112% NRR", value: 14.0, role: "delta" },
					{ label: "Enterprise cohort", value: 21.0, role: "delta" },
					{ label: "Churn", value: -4.5, role: "delta" },
					{ label: "Exit ARR", value: 100.0, role: "total" },
				],
			},
		},
		{
			heading: "Options appraisal",
			paragraphs: [
				"Four structures were modelled against the same value plan and the same $14.6m of additional capital. The earn-out option is included because it is the structure the seller is most likely to propose as an alternative to repricing, and it is worth having the answer ready.",
				"The earn-out fails for a reason worth stating precisely: it bridges the price gap by deferring payment against a revenue target measured under a definition that is itself the dispute. It converts a diligence finding into a post-close argument, at a return that still misses the hurdle.",
			],
			exhibit: {
				kind: "table",
				title: "Only repricing clears both hurdles; the earn-out defers the same dispute at a return that still misses",
				caption: "Four structures against an identical value plan. Hurdle is 2.5× MOIC and 20% IRR over a five-year hold. All figures assume the $14.6m of additional capital.",
				source: "Investment model · [LEDGER-24M] · [PIPE-1824] · Readiness v7",
				columns: ["Structure", "Entry", "MOIC", "IRR", "Clears hurdle", "Verdict"],
				rows: [
					{ cells: ["Proceed as agreed", "$340m", "2.0×", "15%", "No", "Rejected — misses on both measures"] },
					{ cells: ["Reprice with definition in the agreement", "$290m", "2.6×", "21%", "Yes", "Recommended"], emphasis: true },
					{ cells: ["Earn-out bridging the definition gap", "$310m + $30m earn-out", "2.4×", "19%", "No", "Rejected — defers the dispute, still misses"] },
					{ cells: ["Withdraw", "—", "—", "—", "n/a", "Disproportionate to a settleable definition"] },
				],
			},
		},
		{
			heading: "Sensitivity",
			paragraphs: [
				"Two variables move the answer. Exit multiple is the larger of the two and the one least within Harborpeak's control; at 4.5× rather than 5.5× the repriced deal returns 2.1× and misses the hurdle. Entry price is the variable the committee actually controls.",
				"The chart isolates that relationship. The recommendation is not that $290m is the correct price — it is that above roughly $302m the deal stops clearing the hurdle under the base value plan, and that is the number the negotiation should be anchored to.",
			],
			exhibit: {
				kind: "line",
				title: "Above roughly $302m the deal stops clearing the hurdle under the base value plan",
				caption: "MOIC against entry price at three exit multiples, holding the value plan constant. The hurdle line is 2.5×; the crossing point at the base 5.5× multiple is $302m.",
				source: "Investment model sensitivity · Readiness v7",
				unit: "×",
				ticks: ["$260m", "$275m", "$290m", "$302m", "$320m", "$340m"],
				series: [
					{ label: "Exit at 5.5× ARR", points: [2.95, 2.78, 2.6, 2.5, 2.28, 2.0], tone: "brand" },
					{ label: "Exit at 6.5× ARR", points: [3.42, 3.24, 3.05, 2.93, 2.68, 2.38], tone: "muted", dashed: true },
					{ label: "Exit at 4.5× ARR", points: [2.44, 2.3, 2.14, 2.06, 1.87, 1.64], tone: "warn" },
				],
				band: { label: "2.5× hurdle", value: 2.5 },
			},
		},
		{
			heading: "Feasibility",
			paragraphs: [
				"Feasibility was assessed on the value plan rather than on the transaction, because the transaction is straightforward and the plan is not. The weakest dimension across every option is delivery capacity, which is the operating constraint the diligence identified and which no structure of the deal changes.",
				"Technical feasibility is scored moderately rather than poorly. The modernization is bounded, estimated bottom-up, and separable — but it is being executed by a team with a 22% change failure rate, and that is a real execution risk rather than a scoping one.",
			],
			exhibit: {
				kind: "heatmap",
				title: "Delivery capacity is the weakest dimension under every structure — the deal cannot fix it",
				caption: "Feasibility of the value plan by dimension and structure (0 = not feasible, 100 = fully feasible). Withdrawal is scored as not applicable rather than zero.",
				source: "Feasibility assessment · [VDR-204] · [INT-NATE-05] · [INT-LAUREN-01]",
				columns: ["As agreed", "Repriced", "Earn-out"],
				rows: [
					{ label: "Commercial", values: [72, 84, 66] },
					{ label: "Delivery capacity", values: [46, 52, 44] },
					{ label: "Technical execution", values: [58, 71, 58] },
					{ label: "Financial", values: [41, 79, 55] },
					{ label: "Integration capacity", values: [63, 68, 61] },
				],
				scale: ["Not feasible", "Fully feasible"],
			},
		},
	],
	findings: [
		{ label: "Recommended structure", detail: "Reprice to approximately $290m with the recurring-revenue definition executed in the agreement and $8.4m of modernization funded from the integration budget." },
		{ label: "Walk-away anchor", detail: "$302m. Above that the base value plan no longer clears the 2.5× hurdle, which makes it the number the negotiation should be anchored to rather than the target price." },
		{ label: "The modernization is not discretionary", detail: "$21m of the ARR bridge is the enterprise cohort, which is contingent on tenant isolation and SOC 2. Without it the deal returns 2.0× even repriced." },
	],
	nextSteps: [
		{ action: "Approve the $302m walk-away anchor before the seller conversation", owner: "Investment committee", due: "IC meeting · 25 Sep" },
		{ action: "Fund $14.6m of additional capital in the deal model", owner: "Elena Park · Deal Partner", due: "Pre-signing" },
		{ action: "Stress the value bridge without the enterprise cohort for the IC pack", owner: "Deal team", due: "Before IC · 25 Sep" },
		{ action: "Confirm the 5.5× exit multiple against recent comparables", owner: "Elena Park · Deal Partner", due: "Before IC · 25 Sep" },
	],
	citations: ["[LEDGER-24M]", "[PIPE-1824]", "[VDR-204]", "[INT-MARCUS-02]", "Readiness v7"],
}

const PROJECT_CHARTER: DeliverableBody = {
	heading: "One hundred days, three accountable owners, and an explicit rule that the integration cannot reopen a diligence conclusion.",
	lede: "The charter covers signing to day 100 and no further. Scope is limited to the four things that must be true before the value plan can begin: capacity, concentration, modernization start, and reporting readiness. Everything else — systems consolidation, brand, procurement synergies, org design below the top two layers — is named out of scope, because integration programmes fail by doing too much in the first quarter rather than too little.",
	metrics: [
		{ value: "100 days", label: "Charter horizon", note: "Signing to day 100, then handover" },
		{ value: "3", label: "Accountable owners", note: "COO, Technology Lead, Deal Partner" },
		{ value: "7", label: "Named out-of-scope items", note: "Each deferred with a reconsideration point" },
		{ value: "14", label: "Stakeholders mapped", note: "Including two key-person retentions" },
	],
	keyMessages: [
		{ label: "The first quarter does four things and defers the rest", detail: "Capacity plan, concentration response, modernization start, reporting readiness. Every integration workstream that does not serve one of those four is deferred past day 100 by charter rather than by negotiation." },
		{ label: "Diligence conclusions are protected by governance", detail: "Only the Deal Partner can reopen a diligence conclusion. Operators inheriting a business routinely renegotiate findings they were not present for, and the charter closes that path explicitly." },
		{ label: "Two people are a governance item, not an HR item", detail: "61% of core-service commits come from three engineers. Retention for two of them is a charter milestone with the Deal Partner accountable, not a task delegated into the people workstream." },
	],
	sections: [
		{
			heading: "Scope",
			paragraphs: [
				"In scope: the delivery capacity plan evidenced against qualified pipeline, the customer concentration response for the top five accounts, the start of reporting separation and billing extraction, and preparation of the reporting migration pending the signed revenue definition.",
				"Out of scope for the first 100 days: systems consolidation, brand and go-to-market alignment, procurement synergies, org design below the top two layers, ERP migration, HR systems harmonisation, and any customer contract renegotiation initiated by the acquirer.",
				"The customer contract exclusion deserves emphasis. The top five accounts hold 38% of reconciled ARR, and the fastest way to convert a concentration risk into a concentration loss is to open commercial conversations with those accounts in the first quarter after an acquisition they did not ask for.",
			],
			exhibit: {
				kind: "table",
				title: "Seven exclusions, and the customer-contract exclusion is the one protecting 38% of ARR",
				caption: "Scope statement for signing to day 100. Each exclusion carries the reason and the earliest point at which it could reasonably be reconsidered.",
				source: "Integration charter · [INT-NATE-05] · [PIPE-1824] · Readiness v7",
				columns: ["In scope", "Out of scope", "Why excluded", "Reconsider at"],
				rows: [
					{ cells: ["Delivery capacity plan", "Customer contract renegotiation", "Converts concentration risk into concentration loss", "Day 180 at earliest"], emphasis: true },
					{ cells: ["Concentration response", "Systems consolidation", "No value-plan dependency in year one", "Year 2 planning"] },
					{ cells: ["Modernization start", "ERP migration", "Reporting stays on the target ledger by design", "After definition signs"] },
					{ cells: ["Reporting migration preparation", "Brand and go-to-market", "Customer-facing change during retention window", "Day 180"] },
					{ cells: ["Key-person retention", "Org design below top two layers", "Destabilises delivery during the capacity crunch", "Day 120"] },
					{ cells: ["Day-45 capacity test", "Procurement synergies", "Small value, high distraction", "Year 2 planning"] },
					{ cells: ["Definition execution tracking", "HR systems harmonisation", "No dependency; pure cost in quarter one", "Year 2 planning"] },
				],
			},
		},
		{
			heading: "Stakeholders",
			paragraphs: [
				"Fourteen stakeholders mapped on influence against interest. The two platform engineers identified as key-person risks appear high on influence despite holding no formal authority, because 61% of core-service commits pass through them and the modernization sequence depends on their continuity.",
				"The target CFO is the most delicate position on the map: high influence, high interest, and the person whose revenue classification the diligence has effectively challenged. The engagement approach treats the definition as a shared problem to be settled rather than a finding to be conceded, because the alternative is an adversarial relationship with the person who has to operate the reporting.",
				"The top five customers are mapped as a single stakeholder group with high influence and currently low interest — they do not yet know. That combination is stable only until announcement, which is why the retention plan precedes rather than follows the day-1 communication.",
			],
			exhibit: {
				kind: "quadrant",
				title: "Two engineers with no formal authority sit high on influence — and the plan depends on both",
				caption: "Fourteen stakeholders on influence against interest at signing. Positions shift materially at announcement, and the top-five customer group is the one that moves furthest.",
				source: "Stakeholder analysis · Discovery interviews · [INT-NATE-05] · [INT-LAUREN-01]",
				xAxis: ["Low interest", "High interest"],
				yAxis: ["Low influence", "High influence"],
				points: [
					{ label: "Deal Partner", x: 93, y: 93, emphasis: true },
					{ label: "COO", x: 74, y: 86, emphasis: true },
					{ label: "Target CFO", x: 94, y: 77, emphasis: true },
					{ label: "Technology Lead", x: 84, y: 66, emphasis: true },
					{ label: "Platform architect", x: 57, y: 76 },
					{ label: "Head of delivery", x: 67, y: 61 },
					{ label: "Investment committee", x: 34, y: 88 },
					{ label: "Top five customers", x: 21, y: 81 },
					{ label: "Seller shareholders", x: 78, y: 47 },
					{ label: "Implementation team", x: 72, y: 33 },
					{ label: "Portfolio ops", x: 47, y: 44 },
					{ label: "Sales leadership", x: 58, y: 38 },
					{ label: "Auditor", x: 29, y: 52 },
					{ label: "Enterprise prospects", x: 41, y: 22 },
				],
			},
		},
		{
			heading: "Roles and responsibilities",
			paragraphs: [
				"Three accountable owners across five workstreams. The rule that no row carries two accountable owners is applied here as strictly as in the target operating model, and for the same reason: shared accountability in an integration produces consensus-seeking at the moment speed matters most.",
				"The Deal Partner is accountable for the value-creation plan and for any change to a diligence conclusion. That second accountability is unusual to state in a RACI and it is the most important line in the table.",
			],
			exhibit: {
				kind: "table",
				title: "The Deal Partner alone can change a diligence conclusion — the least conventional line and the most important",
				caption: "Day 1 to day 100 RACI. A = accountable, R = responsible, C = consulted, I = informed. No row carries two accountable owners.",
				source: "Integration charter · agreed with workstream owners",
				columns: ["Workstream", "Deal Partner", "COO", "Technology Lead", "Target CFO", "IC"],
				rows: [
					{ cells: ["Delivery capacity plan", "C", "A", "I", "I", "I"] },
					{ cells: ["Concentration response", "C", "A", "I", "C", "I"] },
					{ cells: ["Modernization sequence", "C", "C", "A", "I", "I"] },
					{ cells: ["Revenue definition execution", "A", "I", "I", "R", "C"] },
					{ cells: ["Reporting migration readiness", "C", "I", "C", "A", "I"] },
					{ cells: ["Change to a diligence conclusion", "A", "I", "I", "I", "C"], emphasis: true },
				],
			},
		},
		{
			heading: "Governance and cadence",
			paragraphs: [
				"Two forums and one gate. A weekly integration stand-up with the three accountable owners, and a day-45 checkpoint with the investment committee. The integration steering group exists to coordinate and is explicitly not a decision body — anything requiring a decision goes to an accountable owner or to the committee.",
				"The committee sees the integration twice in the first 100 days: at day 45 against the capacity test, and at day 100 against the modernization commitment. Between those points the programme reports by exception, and the exception trigger is defined: any variance touching the repricing assumptions.",
			],
			bullets: [
				{ label: "Weekly integration stand-up", detail: "Three accountable owners. Coordination, not decisions." },
				{ label: "Day 45 committee checkpoint", detail: "Capacity plan evidenced against qualified pipeline, not forecast." },
				{ label: "Exception trigger", detail: "Any variance touching the repricing assumptions goes to the committee immediately, not at the next checkpoint." },
			],
		},
		{
			heading: "Milestones, constraints, and dependencies",
			paragraphs: [
				"Four charter milestones: revenue definition executed at signing, capacity plan evidenced at day 45, concentration response funded at day 30, and modernization budget committed at day 100. Each is binary and each is measured against evidence rather than against a status report.",
				"The binding constraint is that the reporting migration cannot proceed until the definition is signed, regardless of technical readiness. This is a deliberate dependency rather than a limitation — migrating first would restate the diligence conflict inside Harborpeak's own numbers with no reconciliation attached.",
			],
		},
	],
	findings: [
		{ label: "Charter boundary protecting the most value", detail: "No acquirer-initiated customer contract renegotiation before day 180. The top five accounts hold 38% of ARR and have not yet been told." },
		{ label: "Governance rule that matters", detail: "Only the Deal Partner can reopen a diligence conclusion, and the integration steering group is not a decision body." },
		{ label: "Milestone most likely to be reported as met when it is not", detail: "Modernization budget committed at day 100. 'Planned' will be offered in place of 'committed'; the milestone is binary." },
	],
	nextSteps: [
		{ action: "Sign the charter including the seven named exclusions", owner: "Elena Park · Deal Partner", due: "Signing" },
		{ action: "Confirm the three accountable owners and the RACI", owner: "Elena Park with Nate Brooks", due: "Day 1" },
		{ action: "Agree the exception trigger wording with the committee", owner: "Elena Park · Deal Partner", due: "Day 1" },
		{ action: "Schedule the day-45 and day-100 committee checkpoints", owner: "Integration PMO", due: "Day 1" },
	],
	citations: ["[VDR-204]", "[INT-NATE-05]", "[PIPE-1824]", "[INT-LAUREN-01]", "Readiness v7"],
}

const PROCESS_ANALYSIS: DeliverableBody = {
	heading: "An implementation takes 84 days and 312 consultant-hours. Ninety-four of those hours are tooling overhead, and hiring does not remove them.",
	lede: "Delivery capacity is the constraint on the value plan, and the capacity model assumes it is a headcount problem. Mapping the implementation process against 1,824 pipeline and delivery records says otherwise: 94 of the 312 consultant-hours per implementation are spent on configuration work that a templated approach removes, and six handoffs produce 2.4 rework loops per engagement. The To-Be process delivers in 52 days and 214 hours with the same team.",
	metrics: [
		{ value: "84 days", label: "Median implementation", note: "312 consultant-hours per engagement" },
		{ value: "30%", label: "Hours lost to tooling overhead", note: "94 of 312 hours, per implementation" },
		{ value: "6 → 3", label: "Handoffs in the process", note: "2.4 rework loops today" },
		{ value: "+22%", label: "Effective capacity from process alone", note: "Equivalent to 14 FTE, without hiring" },
	],
	keyMessages: [
		{ label: "The capacity gap is a process gap wearing a headcount costume", detail: "The plan needs 22 additional FTE and funds 14. Removing the 94 hours of tooling overhead per implementation releases the equivalent of 14 FTE at current volume, which closes most of the gap without hiring anyone." },
		{ label: "Rework originates at two handoffs, not across the process", detail: "The solution-design to configuration handoff and the configuration to data-migration handoff produce 2.1 of the 2.4 rework loops. Both are handoffs where the receiving team re-derives context the sending team already held." },
		{ label: "This is testable at day 45, before the hiring commitment lands", detail: "The A-02 assumption can be falsified with a single templated implementation run against a live engagement. If it holds, the hiring plan changes shape rather than size." },
	],
	sections: [
		{
			heading: "As-Is process",
			paragraphs: [
				"Implementation runs through six functions in sequence: sales handover, solution design, configuration, data migration, user acceptance, and go-live support. The median engagement takes 84 days and 312 consultant-hours, with the largest single block in configuration at 118 hours.",
				"Two handoffs dominate the rework. Solution design produces a document rather than a configuration artifact, so configuration re-derives the design decisions from it — and where the document is ambiguous, re-derives them differently. Data migration then discovers configuration choices that make the customer's data shape unworkable, and configuration is revisited.",
				"The process is competently run. Nothing in the map suggests poor execution; it suggests a process that grew by addition as the product grew, and was never re-cut once configuration became the dominant cost.",
			],
			exhibit: {
				kind: "architecture",
				title: "As-Is: six functions, two rework-generating handoffs, and configuration carrying 118 of the 312 hours",
				caption: "Observed implementation process across the delivery record. Amber handoffs are where the receiving team re-derives context the sending team already held.",
				source: "Delivery process reconstruction · [PIPE-1824] · [INT-NATE-05]",
				lanes: ["Handover", "Design", "Build", "Go-live"],
				nodes: [
					{ id: "sales", label: "Sales handover", detail: "18 hours · verbal context", lane: 0, row: 0, tone: "neutral" },
					{ id: "design", label: "Solution design", detail: "62 hours · document output", lane: 1, row: 0, tone: "warn" },
					{ id: "scope", label: "Scope confirmation", detail: "24 hours · customer sign-off", lane: 1, row: 1, tone: "neutral" },
					{ id: "config", label: "Configuration", detail: "118 hours · re-derives design", lane: 2, row: 0, tone: "warn" },
					{ id: "migrate", label: "Data migration", detail: "58 hours · finds config gaps", lane: 2, row: 1, tone: "warn" },
					{ id: "uat", label: "User acceptance", detail: "22 hours", lane: 3, row: 0, tone: "neutral" },
					{ id: "live", label: "Go-live support", detail: "10 hours", lane: 3, row: 1, tone: "neutral" },
				],
				edges: [
					{ from: "sales", to: "design" },
					{ from: "design", to: "scope" },
					{ from: "scope", to: "config", label: "document handoff", tone: "warn" },
					{ from: "config", to: "migrate" },
					{ from: "migrate", to: "config", label: "rework · 1.3 loops", tone: "warn", dashed: true },
					{ from: "config", to: "design", label: "rework · 0.8 loops", tone: "warn", dashed: true },
					{ from: "migrate", to: "uat" },
					{ from: "uat", to: "live" },
				],
			},
		},
		{
			heading: "Where the hours go",
			paragraphs: [
				"Decomposing the 312 hours separates work that creates customer value from work that exists because of how the process is shaped. Configuration is the largest block and also the one with the highest proportion of avoidable effort: 61 of its 118 hours are spent re-deriving decisions or repeating configuration that a template would carry.",
				"The 94 hours of overhead across the process is the number that matters for the capacity case. At the current run rate of roughly 96 implementations a year, that is 9,024 hours — the equivalent of 14 full-time implementation consultants doing work that a templated approach removes.",
			],
			exhibit: {
				kind: "stack",
				title: "94 of 312 hours is overhead — at current volume that is 14 FTE of avoidable work a year",
				caption: "Effort decomposition per implementation, in consultant-hours. Overhead is work that exists because of process shape rather than customer requirement.",
				source: "Delivery effort analysis · [PIPE-1824] · [INT-NATE-05]",
				segments: [
					{ label: "Customer-specific work", tone: "brand" },
					{ label: "Repeatable, templatable", tone: "muted" },
					{ label: "Overhead and rework", tone: "warn" },
				],
				rows: [
					{ label: "Sales handover", values: [11, 4, 3] },
					{ label: "Solution design", values: [34, 16, 12] },
					{ label: "Scope confirmation", values: [18, 4, 2] },
					{ label: "Configuration", values: [39, 18, 61], note: "Largest overhead block" },
					{ label: "Data migration", values: [29, 17, 12] },
					{ label: "UAT and go-live", values: [23, 5, 4] },
				],
			},
		},
		{
			heading: "Gap analysis",
			paragraphs: [
				"Five gaps, ordered by hours removed. The first two — configuration templating and design-as-artifact — account for 71 of the 98 hours removed and both address the same underlying defect: design intent is expressed as prose and has to be translated by hand into configuration.",
				"The fifth gap, sales handover context, removes only 4 hours but is included because it is the cheapest to close and it reduces the variance of solution design rather than its mean. Variance is what makes capacity planning unreliable, and the capacity plan is the reason this analysis exists.",
			],
			exhibit: {
				kind: "table",
				title: "Five gaps, and two of them remove 71 of the 98 hours",
				caption: "Gap analysis ordered by consultant-hours removed per implementation. Each change is traced to a specific process defect rather than to a general efficiency goal.",
				source: "Gap analysis · [PIPE-1824] · [INT-NATE-05] · [INT-LAUREN-01]",
				columns: ["Gap", "As-Is", "To-Be", "Change required", "Hours removed"],
				rows: [
					{ cells: ["Configuration approach", "Hand-built per customer", "Template plus customer delta", "Configuration template library", "42"], emphasis: true },
					{ cells: ["Design artifact", "Prose document", "Machine-readable config artifact", "Design tooling change", "29"], emphasis: true },
					{ cells: ["Migration sequencing", "After configuration", "Data shape validated at design", "Migration pre-check at design stage", "14"] },
					{ cells: ["Rework loops", "2.4 per engagement", "0.6 per engagement", "Removal of the two document handoffs", "9"] },
					{ cells: ["Sales handover", "Verbal context", "Structured handover record", "Handover template in CRM", "4"] },
				],
			},
		},
		{
			heading: "To-Be process",
			paragraphs: [
				"The target process has four stages and three handoffs. Solution design produces a configuration artifact rather than a document, so configuration begins from a machine-readable starting point and spends its hours on the customer-specific delta. Data shape is validated during design, which removes the migration-to-configuration return path entirely.",
				"The median implementation falls to 52 days and 214 hours. Neither figure assumes a more skilled team or a simpler customer; both come from removing translation and rework.",
				"Capacity effects follow directly. At 214 hours per implementation the existing establishment carries roughly 22% more volume, which converts the 22 FTE gap into an 8 FTE gap that the funded hiring plan covers comfortably.",
			],
			exhibit: {
				kind: "architecture",
				title: "To-Be: design produces a configuration artifact, which removes both rework paths at once",
				caption: "Target implementation process. Data-shape validation moves into design, which is what removes the migration-to-configuration return path rather than merely reducing it.",
				source: "Target process · [INT-NATE-05] · [VDR-204] · Readiness v7",
				lanes: ["Handover", "Design", "Build", "Go-live"],
				nodes: [
					{ id: "sales2", label: "Structured handover", detail: "15 hours · CRM record", lane: 0, row: 0, tone: "neutral" },
					{ id: "design2", label: "Design as config artifact", detail: "48 hours · machine-readable", lane: 1, row: 0, tone: "brand" },
					{ id: "shape", label: "Data shape validation", detail: "In design, not after build", lane: 1, row: 1, tone: "brand" },
					{ id: "config2", label: "Template + delta", detail: "57 hours · customer-specific only", lane: 2, row: 0, tone: "brand" },
					{ id: "migrate2", label: "Data migration", detail: "44 hours · no return path", lane: 2, row: 1, tone: "neutral" },
					{ id: "uat2", label: "UAT and go-live", detail: "50 hours combined", lane: 3, row: 0, tone: "neutral" },
				],
				edges: [
					{ from: "sales2", to: "design2" },
					{ from: "design2", to: "shape" },
					{ from: "design2", to: "config2", label: "config artifact" },
					{ from: "shape", to: "migrate2", label: "validated shape" },
					{ from: "config2", to: "migrate2" },
					{ from: "migrate2", to: "uat2" },
				],
			},
		},
		{
			heading: "What this does not claim",
			paragraphs: [
				"The template library does not exist and building it is real work: roughly 340 engineering hours plus 200 consultant hours to seed the first eight templates, which is inside the $6.2m integration budget but is not free.",
				"The analysis also does not claim the tooling fix removes the need to hire. It closes roughly two thirds of the capacity gap; the remaining 8 FTE are still required and the ramp time of 4.5 months still applies. The claim is narrower and more useful: hiring alone does not close the gap, and process alone does not either.",
			],
		},
	],
	findings: [
		{ label: "Root process defect", detail: "Design intent is expressed as prose and translated by hand into configuration. That single property produces 71 of the 98 avoidable hours and both rework paths." },
		{ label: "Capacity conclusion", detail: "Process change releases the equivalent of 14 FTE at current volume, converting a 22 FTE gap into 8 FTE that the funded plan covers." },
		{ label: "Testable before the hiring commitment", detail: "Run one templated implementation against a live engagement by day 45. It falsifies or confirms A-02 before the hiring plan is committed." },
	],
	nextSteps: [
		{ action: "Validate the As-Is effort decomposition with the delivery team", owner: "Nate Brooks · COO", due: "Day 15" },
		{ action: "Run one templated implementation as an A-02 test", owner: "Nate Brooks · COO", due: "Day 45" },
		{ action: "Budget the 340 engineering and 200 consultant hours for the template library", owner: "Lauren Diaz · Technology Diligence Lead", due: "Day 30" },
		{ action: "Re-plan hiring against the revised 8 FTE gap if the test holds", owner: "Nate Brooks · COO", due: "Day 60" },
	],
	citations: ["[PIPE-1824]", "[INT-NATE-05]", "[VDR-204]", "Readiness v7"],
}

export const DILIGENCE_DELIVERABLES: DeliverableBody[] = [EXECUTIVE_BRIEF, BUSINESS_CASE, PROJECT_CHARTER, PROCESS_ANALYSIS, REQUIREMENTS, TECHNICAL_ASSESSMENT, TARGET_OPERATING_MODEL, RAID_REGISTER, ROADMAP]
