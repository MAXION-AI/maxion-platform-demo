import type { DeliverableBody, DeliverableRevision } from "./types"

// ServiceNow financial-control integration · Northstar architecture council
// Evidence base: 2,418 change and incident records, 57 architecture documents,
// 344 backlog issues, and the 176-control SOX catalog.

const EXECUTIVE_BRIEF: DeliverableBody = {
	heading: "Both platforms believe they own the approval record. Until one of them stops, every reconciliation fix is temporary.",
	lede: "Finance changes are recorded as approved in one system and pending in the other, and the incident history shows it happening 61 times in 684 finance changes over twelve months. The instinct is to build better reconciliation. That treats the symptom: the mismatch exists because two systems both author the approval, and any synchronisation between two authors eventually diverges. The decision in front of the council is not how to reconcile — it is which platform stops writing.",
	metrics: [
		{ value: "8.9%", label: "Finance changes with divergent state", note: "61 of 684 over twelve months" },
		{ value: "23 days", label: "Median time to detect a mismatch", note: "19 surfaced only at period close" },
		{ value: "4 of 12", label: "Closes delayed by reconciliation", note: "Average delay 2.3 days" },
		{ value: "14", label: "SOX controls with no evidence path", note: "Of 92 controls in scope" },
	],
	keyMessages: [
		{ label: "Dual authorship is the root cause", detail: "Both ServiceNow and the controls platform write an approval record for the same change. Neither is wrong; they simply diverge under any condition where one write succeeds and the other does not. Sixty-one divergences in twelve months is the observable consequence." },
		{ label: "Reconciliation is a detector, not a fix", detail: "The current reconciliation runs at period close and detects mismatches a median of 23 days after they occur. Moving it to fifteen minutes is worth doing and does not change the fact that something new to reconcile is produced every day." },
		{ label: "One boundary must fail closed, and that costs something real", detail: "High-risk finance changes cannot proceed during a controls-platform outage. On the observed availability of 99.62%, that is roughly 3–4 blocked changes per outage event. The council is being asked to accept that cost, not to have it engineered away." },
	],
	sections: [
		{
			heading: "Situation",
			paragraphs: [
				"Northstar operates financial change through two platforms that were each introduced to solve a real problem. ServiceNow owns enterprise change management and is where requests, routing, and fulfilment naturally live. The financial controls platform owns the SOX control catalog, evidence, and attestation, and is where auditors look.",
				"The integration between them was built incrementally and works most of the time. Across 2,418 change and incident records, 684 are finance changes in scope for this workflow, and the large majority pass through both systems without incident.",
				"The failures are concentrated and consequential. Sixty-one finance changes show divergent approval state — approved in one platform, pending in the other. Nineteen of those were discovered at period close rather than at the time of divergence, and four of the last twelve closes were delayed as a result, by an average of 2.3 days.",
			],
			exhibit: {
				kind: "bar",
				title: "Divergence concentrates in high-risk changes and emergency paths — precisely where the control matters most",
				caption: "Divergent approval-state records by change category across 684 finance changes over twelve months. Emergency changes diverge at more than four times the rate of standard changes.",
				source: "Change and incident history · ServiceNow (2,418 records) · [INC-2418]",
				unit: "records",
				data: [
					{ label: "Emergency change", value: 23, note: "17% of emergency volume", emphasis: true },
					{ label: "High-risk standard", value: 19, note: "13.9% of category", emphasis: true },
					{ label: "Access and entitlement", value: 11, note: "5.2% of category" },
					{ label: "Routine finance change", value: 6, note: "1.4% of category" },
					{ label: "Vendor-initiated", value: 2, note: "Low volume" },
				],
			},
		},
		{
			heading: "Complication",
			paragraphs: [
				"The obvious response is to improve reconciliation, and it is the response the delivery backlog already reflects — 88 of the 344 open issues are reconciliation and synchronisation work. That work will reduce the detection lag and it will not reduce the divergence rate, because divergence is produced by design rather than by defect.",
				"The mechanism is straightforward. Both platforms accept an approval action and both write a record. When one write fails, is delayed, or is performed by a different actor, the two records disagree. There is no arbiter, because neither system was ever told it was subordinate to the other.",
				"Emergency changes make this worse in a way that matters for the audit position. Emergency changes diverge at 17% against 1.4% for routine changes, because the emergency path deliberately relaxes sequencing — and the relaxation currently extends to who may attest, which means segregation of duties is weakest exactly where scrutiny should be highest.",
			],
			bullets: [
				{ label: "Two authors, no arbiter", detail: "Both platforms write the approval record for the same change. Divergence is the expected behaviour of that design, not a defect in it." },
				{ label: "Detection at close, not at divergence", detail: "Median 23 days to detect. Nineteen of 61 surfaced only during period close, and four closes were delayed." },
				{ label: "Emergency path weakens separation", detail: "17% divergence on emergency changes, and the current fallback allows the requester to attest — the exception that reached the council." },
			],
		},
		{
			heading: "Recommendation",
			paragraphs: [
				"Adopt a single system-of-record matrix. The controls platform is authoritative for control definitions, evidence, and attestation. ServiceNow is authoritative for request, routing, and fulfilment. No record is authored twice; where a platform needs a copy, it holds a reconciled read model with an explicit staleness bound.",
				"Integration becomes event-driven with durable delivery. Events carry the control identifier as well as the change identifier, so evidence can be located from either side without a join through free-text fields. Reconciliation moves from period close to a fifteen-minute cycle, and a mismatch raises an owned case rather than a report line.",
				"One boundary fails closed: a high-risk finance change cannot proceed while the controls platform is unavailable. This is the operational cost of a correct control, and the alternative — permitting a same-role fallback during an outage — reintroduces exactly the exposure the design exists to remove.",
			],
			exhibit: {
				kind: "table",
				title: "Only single authorship removes divergence; better reconciliation reduces the lag and leaves the rate unchanged",
				caption: "Three options assessed against the observed twelve-month history. Divergence rates are modelled by replaying the 684 finance changes through each design.",
				source: "Modelled replay of 684 finance changes · [INC-2418] · [ARCH-057]",
				columns: ["Option", "Divergence rate", "Detection lag", "SOX position", "Verdict"],
				rows: [
					{ cells: ["A · Improve reconciliation only", "8.9% unchanged", "15 minutes", "Detected faster, still occurring", "Rejected — treats the symptom"] },
					{ cells: ["B · Single system-of-record matrix with event integration", "0% by construction", "15 minutes for copy drift", "Evidence and attestation single-sourced", "Recommended"], emphasis: true },
					{ cells: ["C · Consolidate onto one platform", "0%", "n/a", "Strong", "Rejected — 18-month programme, retires a working control catalog"] },
				],
			},
		},
		{
			heading: "What the decision costs",
			paragraphs: [
				"The fail-closed boundary is the cost, and it should be stated plainly to the council rather than buried in a risk register. On the controls platform's observed availability of 99.62% — two multi-hour outages in twelve months, of 4.1 and 2.8 hours — the modelled impact is 3 to 4 high-risk finance changes blocked per outage event.",
				"There is no version of this design in which that cost disappears and the control remains correct. A same-role manual fallback would remove the blockage and reintroduce the segregation-of-duties failure. A deferred-attestation window would soften it and is the subject of D-01, which the council must decide.",
				"The second cost is A-01: the design assumes a 99.9% availability target that the platform does not currently meet. Closing that gap is a separate reliability workstream, and the roadmap sequences it before high-risk changes move behind the boundary in phase two rather than assuming it away.",
			],
		},
		{
			heading: "What this package does not claim",
			paragraphs: [
				"Fourteen of the 92 in-scope SOX controls have no automated evidence path under the target design and will continue to rely on manual attestation. They are listed explicitly rather than described as covered. Nine of the fourteen are quarterly controls where automation is disproportionate; five are candidates for a later phase.",
				"The design does not claim to eliminate emergency changes or to make them safe by policy. It makes the attestation for an emergency change originate in the controls platform and forbids the requester from authoring it. Whether attestation may be deferred by up to 24 hours is D-01, which the SOX catalog neither permits nor prohibits explicitly — so the council decides it rather than the design.",
			],
		},
	],
	findings: [
		{ label: "Recommended decision", detail: "Controls platform owns control definitions, evidence, and attestation. ServiceNow owns request, routing, and fulfilment. No record is authored twice." },
		{ label: "Unresolved exposure", detail: "The fail-closed boundary blocks high-risk changes during an outage. The trade-off is recorded for council acceptance rather than engineered away." },
		{ label: "What the council is actually deciding", detail: "Not the integration pattern — the authority matrix. Once one platform stops authoring approvals, the integration design follows from it." },
	],
	nextSteps: [
		{ action: "Ratify the system-of-record matrix", owner: "Architecture council", due: "Council · 3 Oct" },
		{ action: "Close D-01: whether emergency attestation may defer up to 24 hours", owner: "Sarah Liu · Controller", due: "Before phase one go-live" },
		{ action: "Accept or reject the fail-closed operational cost explicitly", owner: "Architecture council", due: "Council · 3 Oct" },
		{ action: "Open the reliability workstream against the 99.9% assumption", owner: "Andre Baker · Platform Architect", due: "Week 1" },
	],
	citations: ["[SOX-041]", "[INC-2418]", "[INT-RAVI-06]", "[ARCH-057]", "Readiness v7"],
}

const TECHNICAL_ASSESSMENT: DeliverableBody = {
	heading: "Six events, one authoritative writer per record, and a reconciliation loop that detects drift in fifteen minutes instead of twenty-three days.",
	lede: "The integration today is a set of synchronous point-to-point calls with retry logic and no durable delivery, which is why a transient failure becomes a permanent divergence. The target is an event contract with six event types, at-least-once delivery, idempotent consumers, and a reconciliation loop that treats mismatch as an owned case rather than a report line. The build is 14 weeks at 4 FTE, and the hardest part is not the events — it is the 14 controls that have no automated evidence path.",
	metrics: [
		{ value: "6", label: "Event types in the contract", note: "Versioned, with control identifier" },
		{ value: "99.62%", label: "Observed controls-platform availability", note: "Design assumes 99.9%" },
		{ value: "15 min", label: "Target reconciliation cycle", note: "From a 23-day median today" },
		{ value: "88", label: "Backlog issues in scope", note: "Of 344 open delivery issues" },
	],
	keyMessages: [
		{ label: "Synchronous coupling is why transient failures become permanent divergence", detail: "The current integration calls the controls API inline during approval. A timeout leaves ServiceNow holding an approval the controls platform never recorded, and nothing retries durably — which accounts for 38 of the 61 observed divergences." },
		{ label: "The event must carry the control identifier, not just the change identifier", detail: "Today evidence is located by joining on free-text change descriptions, which fails for 23% of records. Carrying the control identifier on every event makes evidence addressable from either side." },
		{ label: "Availability, not design, is the binding constraint on phase two", detail: "The fail-closed boundary is only acceptable if the controls platform meets 99.9%. It currently meets 99.62%, so the reliability work is a prerequisite for phase two rather than a parallel improvement." },
	],
	sections: [
		{
			heading: "Current-state integration",
			paragraphs: [
				"ServiceNow calls the controls platform synchronously at the point of approval, waits for a response, and writes its own approval record regardless of the outcome. The controls platform writes its record when it receives the call. Neither write is conditional on the other, and there is no durable queue between them.",
				"Retries exist but are best-effort and in-process: if the ServiceNow node handling the request is recycled, the retry is lost. Analysis of the 61 divergences attributes 38 to exactly this pattern — a timeout or a 5xx during the inline call, followed by no successful retry.",
				"Evidence location is the second structural weakness. Events carry the change identifier but not the control identifier, so locating the evidence for a given control requires joining on free-text change descriptions. That join fails for 23% of records, which is why the period-close reconciliation is manual and slow.",
			],
			exhibit: {
				kind: "architecture",
				title: "Current state: a synchronous inline call with in-process retry — 38 of 61 divergences originate here",
				caption: "Both platforms write an approval record and neither write is conditional on the other. The highlighted path is the inline call whose failure produces divergence with no durable recovery.",
				source: "Integration architecture · OneDrive (57 documents) · [ARCH-057] · [INT-ANDRE-02]",
				lanes: ["Requester", "ServiceNow", "Controls platform", "Audit"],
				nodes: [
					{ id: "req", label: "Change request", detail: "684 finance changes/yr", lane: 0, row: 0, tone: "neutral" },
					{ id: "route", label: "Routing + approval", detail: "Writes approval record", lane: 1, row: 0, tone: "warn" },
					{ id: "retry", label: "In-process retry", detail: "Lost on node recycle", lane: 1, row: 1, tone: "warn" },
					{ id: "ctrl", label: "Control evaluation", detail: "Writes approval record", lane: 2, row: 0, tone: "warn" },
					{ id: "ev", label: "Evidence store", detail: "Joined on free text", lane: 2, row: 1, tone: "warn" },
					{ id: "close", label: "Period close", detail: "Reconciles at 23 days", lane: 3, row: 0, tone: "warn" },
				],
				edges: [
					{ from: "req", to: "route" },
					{ from: "route", to: "ctrl", label: "synchronous", tone: "warn" },
					{ from: "route", to: "retry", label: "on timeout", tone: "warn", dashed: true },
					{ from: "ctrl", to: "ev" },
					{ from: "ev", to: "close", label: "manual join", tone: "warn", dashed: true },
					{ from: "route", to: "close", label: "second record", tone: "warn", dashed: true },
				],
			},
		},
		{
			heading: "Target event contract",
			paragraphs: [
				"Six event types carry the workflow: change.requested, control.evaluated, evidence.attached, attestation.recorded, change.fulfilled, and reconciliation.mismatched. Each is versioned, each carries both the change identifier and the control identifier, and each is idempotent on a deterministic event key so at-least-once delivery is safe.",
				"Delivery is durable. Events are written to an outbox in the same transaction as the state change they describe, then published; a consumer failure retries from the outbox rather than from process memory. This is what removes the 38-divergence failure mode entirely rather than reducing it.",
				"The contract is owned by the Platform Architect and versioned independently of either platform's release cycle. A breaking change requires a new version with both live in parallel — the alternative, coordinated releases across two platforms with different change windows, is how integrations become impossible to evolve.",
			],
			exhibit: {
				kind: "table",
				title: "Six events, each idempotent and each carrying the control identifier that makes evidence addressable",
				caption: "The full event contract. Idempotency keys are deterministic, so at-least-once delivery produces exactly-once effect without distributed transactions.",
				source: "Target event contract · [ARCH-057] · [INT-ANDRE-02] · Readiness v7",
				columns: ["Event", "Published by", "Consumed by", "Idempotency key", "On failure"],
				rows: [
					{ cells: ["change.requested", "ServiceNow", "Controls platform", "change_id", "Retry from outbox · 24h"] },
					{ cells: ["control.evaluated", "Controls platform", "ServiceNow", "change_id + control_id", "Retry from outbox · 24h"] },
					{ cells: ["evidence.attached", "Controls platform", "ServiceNow, audit", "evidence_id", "Retry from outbox · 24h"] },
					{ cells: ["attestation.recorded", "Controls platform", "ServiceNow, audit", "change_id + attestor_id", "Retry · never re-attributed"], emphasis: true },
					{ cells: ["change.fulfilled", "ServiceNow", "Controls platform", "change_id + fulfilment_seq", "Retry from outbox · 24h"] },
					{ cells: ["reconciliation.mismatched", "Reconciliation loop", "Owning team queue", "change_id + cycle", "Escalates after 2 cycles"] },
				],
			},
		},
		{
			heading: "High-risk change behaviour, including failure",
			paragraphs: [
				"The sequence below is the high-risk finance change path with the controls platform unavailable, which is the case the council is being asked to accept. The critical property is that ServiceNow does not write an approval record at all — it holds the request in a pending state and the change cannot be fulfilled.",
				"When the controls platform recovers, the queued event is delivered from the outbox and the change proceeds through normal evaluation. Nothing is lost and nothing is approved in the interim. The cost is elapsed time, which for a 4.1-hour outage means roughly 3 to 4 high-risk changes wait.",
				"Segregation of duties is enforced at attestation rather than at request, and it holds under this path: the identity that raised the change cannot author the attestation, and there is no fallback in which it can. This is REQ-11, and it is the requirement the current design fails.",
			],
			exhibit: {
				kind: "sequence",
				title: "During an outage the change waits — ServiceNow never writes an approval the controls platform has not evaluated",
				caption: "High-risk finance change with the controls platform unavailable. Steps 3 and 4 are the fail-closed behaviour; today ServiceNow would write its own approval and diverge.",
				source: "Target event contract · [ARCH-057] · REQ-11 · [INT-ANDRE-02]",
				actors: ["Requester", "ServiceNow", "Event bus", "Controls platform"],
				steps: [
					{ from: 0, to: 1, label: "Raise high-risk finance change" },
					{ from: 1, to: 2, label: "Publish change.requested", note: "Written to outbox in-transaction" },
					{ from: 2, to: 3, label: "Deliver — platform unavailable", tone: "warn" },
					{ from: 1, to: 1, label: "Hold pending · no approval written", note: "Fail closed · REQ-11", tone: "warn" },
					{ from: 2, to: 3, label: "Redeliver from outbox on recovery" },
					{ from: 3, to: 3, label: "Evaluate control · attach evidence" },
					{ from: 3, to: 2, label: "Publish attestation.recorded", note: "Attestor ≠ requester, enforced" },
					{ from: 2, to: 1, label: "Release for fulfilment" },
				],
			},
		},
		{
			heading: "Reliability and the availability gap",
			paragraphs: [
				"The design assumes the controls platform meets 99.9% availability. The observed figure over twelve months is 99.62%, driven by two multi-hour outages rather than by chronic instability — 4.1 hours in March and 2.8 hours in August, both attributable to database failover behaviour rather than to application faults.",
				"That distinction matters for sequencing. Chronic low availability would mean the fail-closed design is unworkable; two failover incidents mean it is workable once failover is fixed. The reliability workstream is therefore a prerequisite for phase two rather than an improvement running alongside it.",
				"The chart below models blocked high-risk changes per year against availability. At 99.62% the expectation is 7 blocked changes annually; at 99.9% it falls to 2. The council's acceptance of R-03 should be read against the second figure, with phase two gated on reaching it.",
			],
			exhibit: {
				kind: "line",
				title: "At today's availability the boundary blocks 7 high-risk changes a year; at the design target it blocks 2",
				caption: "Modelled blocked high-risk finance changes per year against controls-platform availability, at the observed volume of 137 high-risk changes annually. Phase two is gated on reaching the 99.9% target.",
				source: "Modelled from [INC-2418] outage history · 137 high-risk changes/yr",
				unit: "blocked/yr",
				ticks: ["99.0%", "99.3%", "99.5%", "99.62%", "99.8%", "99.9%", "99.95%"],
				series: [
					{ label: "Blocked high-risk changes", points: [18, 13, 9.5, 7, 3.5, 2, 1], tone: "brand" },
				],
				band: { label: "Council tolerance · 3/yr", value: 3 },
			},
		},
		{
			heading: "Control coverage and the fourteen gaps",
			paragraphs: [
				"All 176 controls in the SOX catalog were mapped against the target design; 92 are in scope for this workflow. Of those, 78 have a fully automated evidence path under the target design, and 14 do not.",
				"The 14 are not hidden. Nine are quarterly controls where the evidence is a signed management review and automation would be disproportionate to the frequency. Five are candidates for a later phase, all of them access-recertification controls whose evidence lives in a third system not in scope here.",
				"The coverage map below is deliberately shown by control family rather than as a single percentage, because a 85% coverage figure would conceal that the gap is concentrated in access recertification rather than spread evenly.",
			],
			exhibit: {
				kind: "heatmap",
				title: "Coverage is strong except in access recertification, where five controls need a third system not in scope",
				caption: "Automated evidence coverage by control family under the target design (0 = fully manual, 100 = fully automated). The 14 uncovered controls are concentrated rather than spread.",
				source: "SOX control catalog · 176 controls, 92 in scope · [SOX-041]",
				columns: ["In scope", "Evidence", "Attestation", "Reconciliation"],
				rows: [
					{ label: "Change approval", values: [100, 94, 97, 92] },
					{ label: "Journal and posting", values: [100, 89, 91, 88] },
					{ label: "Segregation of duties", values: [100, 82, 95, 79] },
					{ label: "Access recertification", values: [100, 31, 44, 27] },
					{ label: "Management review", values: [100, 38, 52, 41] },
					{ label: "Vendor and third party", values: [100, 71, 68, 64] },
				],
				scale: ["Manual", "Fully automated"],
			},
		},
	],
	findings: [
		{ label: "Root technical cause", detail: "Synchronous inline calls with in-process retry. Thirty-eight of the 61 divergences originate from a timeout with no durable recovery, which the outbox pattern removes entirely." },
		{ label: "Prerequisite for phase two", detail: "Controls-platform availability must reach 99.9% before high-risk changes move behind the fail-closed boundary. At today's 99.62% the boundary blocks 7 changes a year against a council tolerance of 3." },
		{ label: "Explicit coverage gap", detail: "14 of 92 in-scope controls have no automated evidence path. Nine are quarterly management reviews; five are access recertification controls dependent on a system outside this scope." },
	],
	nextSteps: [
		{ action: "Baseline the six-event contract with both platform teams", owner: "Andre Baker · Platform Architect", due: "Week 2" },
		{ action: "Fix database failover behaviour and evidence 99.9% over four weeks", owner: "Platform reliability", due: "Week 8 · gates phase two" },
		{ action: "Implement the transactional outbox on both publishers", owner: "Integration engineering", due: "Weeks 3–6" },
		{ action: "Document the 14 uncovered controls in the audit position", owner: "Ravi Menon · Controls Product Owner", due: "Week 4" },
	],
	citations: ["[ARCH-057]", "[INC-2418]", "[SOX-041]", "[INT-ANDRE-02]", "Readiness v7"],
}

const TARGET_OPERATING_MODEL: DeliverableBody = {
	heading: "A system-of-record matrix, not a preference. For every record type, exactly one platform writes and the other holds a bounded copy.",
	lede: "The target model states authority per record type rather than per platform, because the argument has always been conducted at the wrong altitude. ServiceNow is authoritative for requests, routing, and fulfilment. The controls platform is authoritative for control definitions, evidence, and attestation. Where a platform needs the other's data it holds a reconciled read model with an explicit staleness bound, and it is forbidden from writing it.",
	metrics: [
		{ value: "7", label: "Record types with named authority", note: "Exactly one writer each" },
		{ value: "15 min", label: "Staleness bound on read models", note: "Breach raises an owned case" },
		{ value: "0", label: "Records authored twice", note: "The property being ratified" },
		{ value: "137", label: "High-risk changes per year", note: "The volume behind the boundary" },
	],
	keyMessages: [
		{ label: "Authority is per record, not per platform", detail: "Arguing about which platform 'owns' financial change is unresolvable because both own something real. Stating authority per record type makes the answer obvious and the boundary testable." },
		{ label: "Copies are allowed; second writers are not", detail: "Each platform may hold a read model of the other's records with a fifteen-minute staleness bound. Breaching the bound raises a reconciliation case with a named owner rather than degrading quietly." },
		{ label: "Emergency changes are the test of the model", detail: "ServiceNow may record an emergency change, but the attestation still originates in the controls platform and cannot be authored by the requester. If the model survives the emergency path it survives everything." },
	],
	sections: [
		{
			heading: "The matrix",
			paragraphs: [
				"Seven record types carry the workflow, and each has exactly one authoritative writer. Requests, routing decisions, and fulfilment records belong to ServiceNow. Control definitions, evidence artifacts, attestations, and residual acceptance belong to the controls platform. Nothing is shared, and nothing is negotiable per change.",
				"The matrix is an architecture-council artifact rather than an operational one. Changing it is a council decision; operating within it is not. That distinction matters because the current ambiguity is maintained by well-meaning local decisions, each defensible on its own and collectively producing dual authorship.",
				"Emergency changes are the deliberate stress case. ServiceNow may record an emergency change so that fulfilment is not blocked by the recording step. The attestation, however, still originates in the controls platform and cannot be authored by the requester under any path — which is the specific weakness in today's emergency handling.",
			],
			exhibit: {
				kind: "table",
				title: "Seven record types, seven single writers — and the emergency path does not create an eighth",
				caption: "The system-of-record matrix the council is asked to ratify. Read models carry a fifteen-minute staleness bound; a breach raises a reconciliation case rather than degrading silently.",
				source: "Target operating model · [ARCH-057] · [SOX-041] · [INT-RAVI-06]",
				columns: ["Record type", "Authoritative writer", "Reconciled copy held by", "Staleness bound"],
				rows: [
					{ cells: ["Change request", "ServiceNow", "Controls platform", "15 minutes"] },
					{ cells: ["Routing and assignment", "ServiceNow", "—", "n/a"] },
					{ cells: ["Fulfilment record", "ServiceNow", "Controls platform", "15 minutes"] },
					{ cells: ["Control definition", "Controls platform", "ServiceNow", "24 hours"] },
					{ cells: ["Evidence artifact", "Controls platform", "ServiceNow (reference only)", "15 minutes"] },
					{ cells: ["Attestation", "Controls platform", "ServiceNow (reference only)", "15 minutes"], emphasis: true },
					{ cells: ["Residual acceptance", "Controls platform", "—", "n/a"] },
				],
			},
		},
		{
			heading: "Decision rights",
			paragraphs: [
				"Requests and routing sit with ServiceNow and with the change management function that operates it. Control definitions, evidence, and attestation sit with the controls platform and with the Financial Controls Product Owner. The Platform Architect owns the event contract and its versioning, which is deliberately a third party to both — a contract owned by one of its consumers drifts toward that consumer.",
				"Segregation of duties is enforced at attestation rather than at request, because request-time enforcement is what the emergency path routinely bypasses. The same identity may not both raise and attest a high-risk finance change under any fallback path, including manual entry during an outage.",
				"Reconciliation ownership is operational and does not reach the council. A mismatch raises a case assigned by record type to the authoritative writer's team, with a fifteen-minute detection target and a two-cycle escalation. What reaches the council is any change to the matrix itself.",
			],
			exhibit: {
				kind: "table",
				title: "One accountable owner per decision, and the event contract is owned by neither consumer",
				caption: "Decision rights across the integration. A = accountable, R = responsible, C = consulted, I = informed. The contract sits with the architect precisely because both platforms consume it.",
				source: "Target operating model · [INT-RAVI-06] · [INT-ANDRE-02] · [INT-SARAH-03]",
				columns: ["Decision", "Controls PO", "Platform Architect", "Controller", "Change Mgmt", "Council"],
				rows: [
					{ cells: ["System-of-record matrix", "R", "R", "C", "C", "A"], emphasis: true },
					{ cells: ["Event contract and versioning", "C", "A", "I", "C", "I"] },
					{ cells: ["Control definitions and evidence", "A", "C", "C", "I", "—"] },
					{ cells: ["Attestation policy", "R", "I", "A", "I", "—"] },
					{ cells: ["Reconciliation ownership and SLA", "A", "C", "I", "R", "—"] },
					{ cells: ["Emergency change handling", "R", "C", "A", "R", "—"] },
				],
			},
		},
		{
			heading: "Handoffs and reconciliation",
			paragraphs: [
				"Integration events carry the control identifier, not just the change identifier, so evidence can be located from either side without joining on descriptive text. This single change is what makes reconciliation mechanical rather than investigative, and it is why the detection target moves from 23 days to 15 minutes.",
				"Mismatches raise a reconciliation case with a named owner within fifteen minutes instead of surfacing at period close. The case is assigned by record type to the authoritative writer's team, which means the team that can actually fix it is the team that receives it — today the case lands with whoever notices during close.",
				"Escalation is bounded at two reconciliation cycles. A mismatch unresolved after thirty minutes escalates to the Controller, because a persistent mismatch on a finance record is a control event rather than an operational one.",
			],
		},
	],
	findings: [
		{ label: "Accountable owner", detail: "The Financial Controls Product Owner owns the matrix; the Platform Architect owns the event contract and its versioning. Neither owns both." },
		{ label: "Escalation boundary", detail: "Any change to the matrix is an architecture-council decision. Reconciliation ownership and timing are operational and stay below the council." },
		{ label: "The test case for the model", detail: "Emergency changes. ServiceNow may record one; the attestation still originates in the controls platform and the requester can never author it." },
	],
	nextSteps: [
		{ action: "Ratify the seven-record matrix at the architecture council", owner: "Architecture council", due: "3 Oct" },
		{ action: "Assign reconciliation case ownership by record type", owner: "Tessa Grant · Change Management Lead", due: "Week 3" },
		{ action: "Publish the attestation policy including the emergency path", owner: "Sarah Liu · Controller", due: "Week 4" },
		{ action: "Transfer event-contract ownership to the architect formally", owner: "Andre Baker · Platform Architect", due: "Week 2" },
	],
	citations: ["[ARCH-057]", "[SOX-041]", "[INT-ANDRE-02]", "[INT-RAVI-06]", "Readiness v7"],
}

const REQUIREMENTS: DeliverableBody = {
	heading: "Twenty-two requirements bound to the SOX catalog, each naming its authoritative system, its event, and its behaviour when the event is lost.",
	lede: "Requirements are written against control outcomes rather than against features. Each names the control it satisfies, the authoritative system, the event that carries it, and — the part usually omitted — what happens when that event is not delivered. Four use cases carry the functional behaviour and every alternate flow comes from the incident record. Six requirements are load-bearing for the audit position, and REQ-11 is the one the current design fails.",
	metrics: [
		{ value: "22", label: "Requirements bound to controls", note: "92 in-scope SOX controls" },
		{ value: "6", label: "Load-bearing for the audit position", note: "Tested by simulation, not inspection" },
		{ value: "14", label: "Controls with no automated path", note: "Listed, not assumed covered" },
		{ value: "REQ-11", label: "Requirement the current design fails", note: "Separation under manual fallback" },
	],
	keyMessages: [
		{ label: "Every requirement states its lost-event behaviour", detail: "A requirement that only describes the happy path is untestable in an integration. Each of the 22 names what happens when the event is not delivered, which is the condition that produced all 61 observed divergences." },
		{ label: "Separation is enforced at attestation, never at request", detail: "Request-time enforcement is what the emergency path bypasses. Attestation-time enforcement holds under every path including manual fallback, and REQ-11 makes that explicit." },
		{ label: "The proof is a simulated outage, not a document review", detail: "The acceptance test for the audit position is an end-to-end controls-API outage with an attempted high-risk change. It must fail closed and raise a reconciliation case." },
	],
	sections: [
		{
			heading: "Control points",
			paragraphs: [
				"Segregation of duties is enforced at attestation, not at request. The same identity may not both raise and attest a high-risk finance change under any fallback path, including manual entry during an outage. This is the single most important line in the requirement set, because it is the line the current emergency path does not hold.",
				"Evidence sufficiency, control evaluation, and residual acceptance are separate control points with separate owners and separate events. No single event satisfies two control points, which means a lost event degrades one control rather than silently satisfying several.",
			],
			exhibit: {
				kind: "table",
				title: "Six load-bearing requirements, each with a lost-event behaviour and a simulation that proves it",
				caption: "Extract from the 22-requirement set. REQ-11 is the requirement the current design fails and the reason the exception reached the council.",
				source: "Requirements register · [SOX-041] · [ARCH-057] · [INC-2418]",
				columns: ["ID", "Requirement", "Authoritative system", "Carrying event", "If the event is lost", "Test"],
				rows: [
					{ cells: ["REQ-04", "No approval is written without a control evaluation", "Controls platform", "control.evaluated", "Change holds pending; no approval written", "Drop the event; approval must not appear"] },
					{ cells: ["REQ-07", "Evidence is addressable by control identifier from either side", "Controls platform", "evidence.attached", "Reconciliation case within 15 minutes", "Query evidence by control from ServiceNow"] },
					{ cells: ["REQ-11", "Requester may never author the attestation, including manual fallback", "Controls platform", "attestation.recorded", "No attestation exists; change stays blocked", "Attempt self-attestation in fallback; must refuse"], emphasis: true },
					{ cells: ["REQ-13", "High-risk change fails closed when controls platform is unavailable", "Controls platform", "change.requested", "Held in outbox; redelivered on recovery", "Simulate outage end to end; must fail closed"] },
					{ cells: ["REQ-16", "Read models breach their staleness bound loudly", "Both", "reconciliation.mismatched", "Escalates to Controller after two cycles", "Delay delivery past 15 minutes; case must raise"] },
					{ cells: ["REQ-19", "Consumers are idempotent on a deterministic key", "Both", "All six events", "Duplicate delivery has no additional effect", "Redeliver every event type; state must be unchanged"] },
				],
			},
		},
		{
			heading: "Use cases and acceptance criteria",
			paragraphs: [
				"Four use cases carry the functional behaviour, and each alternate flow is drawn from the incident record rather than imagined. UC-03's alternate flow — the controls platform is unavailable when fulfilment is attempted — occurred twice in twelve months and is the case the council is being asked to accept.",
				"Acceptance criteria are written to be failed. 'The system handles outages gracefully' is untestable; 'when the controls platform is unavailable, no approval record is written and the change is held' can be simulated, and it is the phase-two gate.",
			],
			exhibit: {
				kind: "table",
				title: "Four use cases, and every alternate flow is one the incident record shows actually happening",
				caption: "Primary use cases with acceptance criteria in given/when/then form. UC-04 is the criterion that closes the segregation exposure that reached the council.",
				source: "Use-case model traced to [INC-2418] · validated [INT-SARAH-03]",
				columns: ["ID", "Use case", "Actor", "Alternate flow observed", "Acceptance criterion"],
				rows: [
					{ cells: ["UC-01", "Raise and route a finance change", "Change requester", "Control identifier cannot be resolved · 23%", "Given an unresolvable control, when the change is raised, then it is rejected at intake with the control named — never accepted untagged"] },
					{ cells: ["UC-02", "Evaluate a control and attach evidence", "Controls platform", "Event delivered more than once", "Given a duplicate event, when it is consumed, then state is unchanged and no second evidence record is created"] },
					{ cells: ["UC-03", "Fulfil a high-risk change", "Fulfilment team", "Controls platform unavailable · twice in 12 months", "Given the platform is unavailable, when fulfilment is attempted, then no approval is written and the change is held pending"], emphasis: true },
					{ cells: ["UC-04", "Attest an emergency change", "Named attestor", "Requester attempts to attest · 23 records", "Given the attestor identity equals the requester, when attestation is attempted, then it is refused in every path including manual entry"], emphasis: true },
				],
			},
		},
		{
			heading: "Evidence lineage",
			paragraphs: [
				"Every control decision links the change record, the control identifier, the evidence artifact, and the attesting identity. The link is established at write time by the authoritative system rather than reconstructed later, which is the difference between an audit trail and an audit reconstruction.",
				"All 176 catalog controls were mapped; 92 are in scope, 78 have a fully automated evidence path, and 14 do not. The 14 are listed explicitly rather than assumed covered, and the audit position states them as manual controls with named attestors rather than describing overall coverage as a percentage.",
				"Attestation identity is never re-attributed. If an attestation event is redelivered, the idempotency key includes the attestor, so a duplicate cannot silently change who attested — the failure mode that would be hardest to detect and most damaging to find.",
			],
		},
		{
			heading: "Coverage by control family",
			paragraphs: [
				"Coverage is stated per control family rather than as a single number, because the gap is concentrated. Change approval, journal posting, and segregation of duties are close to fully automated. Access recertification and management review are not, and they account for 14 of the 92.",
				"Two of those families are genuinely out of scope for this workflow — access recertification depends on an identity platform this integration does not touch. Presenting them inside an overall coverage percentage would imply this programme could close them, and it cannot.",
			],
			exhibit: {
				kind: "stack",
				title: "78 of 92 in-scope controls are fully automated; the remaining 14 sit in two families",
				caption: "In-scope SOX controls by family and automation state. The five access-recertification controls depend on an identity platform outside this integration's scope.",
				source: "SOX control catalog · 176 controls, 92 in scope · [SOX-041]",
				segments: [
					{ label: "Automated evidence", tone: "brand" },
					{ label: "Semi-automated", tone: "muted" },
					{ label: "Manual attestation", tone: "warn" },
				],
				rows: [
					{ label: "Change approval", values: [28, 2, 0] },
					{ label: "Journal and posting", values: [19, 3, 0] },
					{ label: "Segregation of duties", values: [14, 1, 0] },
					{ label: "Access recertification", values: [2, 1, 5], note: "Outside integration scope" },
					{ label: "Management review", values: [1, 2, 9], note: "Quarterly · kept manual" },
					{ label: "Vendor and third party", values: [4, 1, 0] },
				],
			},
		},
	],
	findings: [
		{ label: "Highest-risk requirement", detail: "REQ-11: manual fallback must preserve segregation of duties, which the current design does not — this is the exception that reached the council." },
		{ label: "Test that proves it", detail: "Simulate a controls-API outage and attempt a high-risk change end to end; the attempt must fail closed and raise a reconciliation case." },
		{ label: "Requirement most likely to be relaxed under pressure", detail: "REQ-13. During a live outage with a quarter-end change waiting, the request to permit a provisional approval will be made, and the design must have no path that allows it." },
	],
	nextSteps: [
		{ action: "Baseline all 22 requirements with Finance and Platform", owner: "Ravi Menon · Controls Product Owner", due: "Week 2" },
		{ action: "Build the outage simulation as the phase-two acceptance test", owner: "Andre Baker · Platform Architect", due: "Week 7" },
		{ action: "Specify manual fallback and prove no same-role path exists", owner: "Sarah Liu · Controller", due: "Week 5" },
		{ action: "State the 14 manual controls with named attestors in the audit position", owner: "Ravi Menon · Controls Product Owner", due: "Week 4" },
	],
	citations: ["[SOX-041]", "[ARCH-057]", "[INC-2418]", "[INT-SARAH-03]", "Readiness v7"],
}

const RAID_REGISTER: DeliverableBody = {
	heading: "Twenty-five items, two at council level, and one risk that is correct by design and unaccepted by anybody.",
	lede: "Ten risks, six assumptions, four issues, and five decisions carry owners and response dates. Two reach the council and both concern the same boundary: R-03, that the fail-closed design blocks high-risk changes during an outage, and D-01, whether emergency attestation may be deferred. The remainder are owned inside the delivery backlog and dated before the phased launch.",
	metrics: [
		{ value: "25", label: "Open items with owner and date", note: "10 risks · 6 assumptions · 4 issues · 5 decisions" },
		{ value: "2", label: "Items at council level", note: "R-03 and D-01" },
		{ value: "99.62%", label: "Observed availability vs 99.9% assumed", note: "A-01 already falsified" },
		{ value: "Week 10", label: "Latest close date", note: "Before phase-two go-live" },
	],
	keyMessages: [
		{ label: "R-03 is correct and unaccepted, which is the dangerous combination", detail: "The fail-closed boundary is the right control and nobody has agreed to live with its operational cost. A correct control that no one has accepted is one incident away from being reversed by whoever is on the call at the time." },
		{ label: "A-01 is already falsified and still load-bearing", detail: "The design assumes 99.9% availability; the platform delivers 99.62%. The assumption stays in the register with an open mitigation rather than being quietly restated as the target." },
		{ label: "D-01 will be decided by precedent if it is not decided on a date", detail: "The SOX catalog neither permits nor prohibits deferred emergency attestation. If the council does not decide, the first emergency change after go-live sets the rule." },
	],
	sections: [
		{
			heading: "Risk profile",
			paragraphs: [
				"R-03 sits alone in the act-now quadrant, rated high impact and possible. It is unusual in that the risk is not that the design is wrong — the design is right — but that its operational consequence has not been accepted by anyone with the authority to accept it. That gap is what makes it urgent.",
				"Two risks cluster just below: the availability gap and the emergency-path exposure, and both are inputs to R-03 rather than independent items. The remaining seven are delivery and adoption risks contained inside the phased plan.",
				"One risk is deliberately unmitigated. R-08, the reduction in emergency-change throughput during phase two, is accepted and time-boxed rather than mitigated, because every available mitigation weakens the boundary that phase two exists to establish.",
			],
			exhibit: {
				kind: "quadrant",
				title: "One risk sits in the act-now quadrant, and its mitigation is a council decision rather than an engineering task",
				caption: "Ten risks scored on impact against likelihood. R-03's mitigation is acceptance: nothing in the delivery plan reduces it, because reducing it would weaken the control.",
				source: "RAID register · [INC-2418] · [SOX-041] · Readiness v7",
				xAxis: ["Unlikely", "Possible"],
				yAxis: ["Contained impact", "Severe impact"],
				points: [
					{ label: "R-03 fail-closed blockage", x: 66, y: 89, emphasis: true },
					{ label: "R-01 availability gap", x: 78, y: 64 },
					{ label: "R-02 emergency path", x: 58, y: 72 },
					{ label: "R-05 close-cycle disruption", x: 47, y: 55 },
					{ label: "R-04 event contract drift", x: 39, y: 48 },
					{ label: "R-08 emergency throughput", x: 81, y: 31 },
					{ label: "R-06 adoption", x: 52, y: 27 },
					{ label: "R-07 backlog contention", x: 41, y: 15 },
					{ label: "R-09 read-model staleness", x: 31, y: 38 },
					{ label: "R-10 audit re-baseline", x: 22, y: 50 },
				],
			},
		},
		{
			heading: "Open at council level",
			paragraphs: [
				"R-03 — the fail-closed boundary blocks high-risk changes during an outage, with no approved manual path. At today's availability that is roughly 7 blocked changes a year, falling to 2 once the reliability work lands. The council is asked to accept the residual explicitly, because an unaccepted operational cost gets reversed under pressure rather than escalated.",
				"D-01 — whether attestation for emergency changes may be deferred by up to 24 hours. The SOX catalog neither permits nor prohibits it explicitly, which is precisely why it must be decided rather than interpreted. If it is not closed before phase one go-live, the first emergency change will establish the rule by precedent and the answer will be whatever that change needed.",
			],
			exhibit: {
				kind: "table",
				title: "Every item closes on a date; the two council items close before phase one goes live",
				caption: "Top eight items by severity from the 25-item register. R-03 closes by acceptance rather than by mitigation, which is stated rather than implied.",
				source: "RAID register · Readiness v7 · [INC-2418] · [SOX-041]",
				columns: ["ID", "Type", "Item", "Owner", "Closes when", "Due"],
				rows: [
					{ cells: ["R-03", "Risk", "Fail-closed boundary blocks high-risk changes in an outage", "Architecture council", "Council accepts the residual explicitly", "3 Oct"], emphasis: true },
					{ cells: ["D-01", "Decision", "Emergency attestation deferral up to 24 hours", "Sarah Liu", "Council decision recorded and encoded", "Before phase one"], emphasis: true },
					{ cells: ["A-01", "Assumption", "Controls API meets 99.9% availability", "Andre Baker", "Four consecutive weeks evidenced at 99.9%", "Week 8"] },
					{ cells: ["R-02", "Risk", "Emergency path permits same-role attestation", "Ravi Menon", "REQ-11 enforced and outage simulation passes", "Week 10"] },
					{ cells: ["A-04", "Assumption", "Change Management absorbs the evidence step without headcount", "Tessa Grant", "Measured against a full close cycle", "Week 6"] },
					{ cells: ["R-05", "Risk", "Phase two disrupts a close cycle", "Sarah Liu", "Phase two lands outside the close window", "Week 9"] },
					{ cells: ["I-03", "Issue", "23% of historical records cannot be joined to a control", "Ravi Menon", "Backfilled with control identifiers or written off", "Week 7"] },
					{ cells: ["R-04", "Risk", "Event contract drifts toward one consumer", "Andre Baker", "Contract ownership formally with the architect", "Week 2"] },
				],
			},
		},
		{
			heading: "Assumptions under test",
			paragraphs: [
				"A-01 assumed the controls API meets a 99.9% availability target. Incident history shows two multi-hour outages in twelve months and an actual figure of 99.62%, so the assumption is already falsified. It remains in the register because the mitigation — fixing database failover — is open, and a falsified assumption with an open mitigation is more dangerous than one still under test.",
				"A-04 assumes Change Management can absorb the new evidence step without added headcount. This is untested and is measured against a full close cycle at week 6 rather than estimated. If it fails, the phase-three retirement of the duplicate approval path slips rather than the control being weakened.",
			],
		},
	],
	findings: [
		{ label: "Highest-rated risk", detail: "R-03, rated high impact and possible: the control is correct, but the operational impact has not been accepted by anyone yet." },
		{ label: "Decision awaiting a date", detail: "D-01 must close before phase one go-live, or emergency changes will define the rule by precedent." },
		{ label: "Falsified assumption still load-bearing", detail: "A-01. The platform delivers 99.62% against a 99.9% design assumption, and phase two is gated on closing that gap rather than on restating it." },
	],
	nextSteps: [
		{ action: "Put R-03 to the council as an explicit acceptance, not an FYI", owner: "Ravi Menon · Controls Product Owner", due: "3 Oct" },
		{ action: "Close D-01 and encode the decision in the attestation policy", owner: "Sarah Liu · Controller", due: "Before phase one" },
		{ action: "Evidence four consecutive weeks at 99.9% availability", owner: "Andre Baker · Platform Architect", due: "Week 8" },
		{ action: "Measure the evidence step against a full close cycle", owner: "Tessa Grant · Change Management Lead", due: "Week 6" },
	],
	citations: ["[INC-2418]", "[SOX-041]", "[INT-SARAH-03]", "[INT-TESSA-01]", "Readiness v7"],
}

const ROADMAP: DeliverableBody = {
	heading: "Fourteen weeks in three phases. Low-risk changes prove the contract, high-risk changes move behind the boundary, and only then does the duplicate path retire.",
	lede: "Phase one proves the event contract on low-risk change types where a failure is recoverable. Phase two moves high-risk changes behind the fail-closed boundary, gated on the reliability work landing first. Phase three retires the duplicate approval path and migrates period-close reporting. The sequence is deliberately conservative at the point of highest consequence.",
	metrics: [
		{ value: "14 weeks", label: "To full target state", note: "Three phases, three gates" },
		{ value: "Week 4", label: "First close cycle with zero unreconciled", note: "Gate A condition" },
		{ value: "Week 10", label: "Outage simulation must fail closed", note: "Gate B condition" },
		{ value: "30 days", label: "No dual-authored approval", note: "Gate C condition" },
	],
	keyMessages: [
		{ label: "Phase two is gated on reliability, not on schedule", detail: "High-risk changes do not move behind the fail-closed boundary until the controls platform evidences 99.9% over four consecutive weeks. If reliability slips, phase two slips — the boundary is not softened to hold the date." },
		{ label: "The duplicate path retires last, deliberately", detail: "Keeping the second approval path through phases one and two costs nothing except the divergence it already causes, and it is the only rollback available if the event contract fails under real load." },
		{ label: "Every gate is a production measurement", detail: "Zero unreconciled records over a full close cycle, an outage simulation that fails closed, thirty consecutive days with no dual authorship. Each is observed, and none can be satisfied by a review." },
	],
	sections: [
		{
			heading: "Sequence",
			paragraphs: [
				"Weeks 1–4 deliver the event contract, control identifiers, and reconciliation cases on low-risk change types. Low-risk is chosen because a lost event on a low-risk change is recoverable and instructive, whereas the same failure on a high-risk change is a control event.",
				"Weeks 5–10 move high-risk changes behind the fail-closed boundary with attestation in the controls platform. This phase is gated on the reliability workstream evidencing 99.9% availability over four consecutive weeks — a dependency drawn from A-01 rather than from a schedule assumption.",
				"Weeks 11–14 retire the duplicate approval path and migrate period-close reporting. The duplicate path is kept alive through phases one and two on purpose: it is the rollback, and retiring it earlier would remove the only safe reversal if the event contract behaves unexpectedly under close-cycle load.",
			],
			exhibit: {
				kind: "timeline",
				title: "Reliability gates phase two; the duplicate approval path stays alive as the rollback until week 11",
				caption: "Fourteen-week plan with three measured gates. The reliability workstream is a hard dependency for phase two rather than a parallel improvement.",
				source: "Implementation roadmap · Readiness v7 · [INT-TESSA-01] · [ARCH-057]",
				ticks: ["W1", "W2", "W4", "W6", "W8", "W10", "W12", "W14"],
				lanes: [
					{ label: "Event contract", bars: [{ label: "Six events + outbox", start: 0, span: 2.5, tone: "brand" }] },
					{ label: "Reliability", bars: [{ label: "Failover fix · evidence 99.9%", start: 0.5, span: 4, tone: "brand" }] },
					{ label: "Low-risk changes", bars: [{ label: "Prove the contract", start: 1.5, span: 2.5, tone: "muted" }] },
					{ label: "High-risk changes", bars: [{ label: "Fail-closed boundary", start: 4, span: 3.5, tone: "brand" }] },
					{ label: "Duplicate path", bars: [{ label: "Kept as rollback", start: 0, span: 6, tone: "muted" }, { label: "Retire", start: 6, span: 2, tone: "warn" }] },
				],
				markers: [
					{ label: "Gate A", at: 2 },
					{ label: "Gate B", at: 5.5 },
					{ label: "Gate C", at: 8 },
				],
			},
		},
		{
			heading: "Checkpoints",
			paragraphs: [
				"Gate A at week 4 requires zero unreconciled records over a full close cycle. A partial cycle proves nothing: divergence concentrates at close, so the measurement must span one.",
				"Gate B at week 10 requires the outage simulation to fail closed. The simulation is end-to-end with the controls API genuinely unavailable, not mocked, and the attempted change must be a real high-risk finance change in a pre-production environment with production-shaped data.",
				"Gate C at week 14 requires no approval authored in both systems for thirty consecutive days. Thirty days rather than seven, because the dual-authorship pattern is most likely to reappear through an emergency path that occurs infrequently.",
			],
		},
		{
			heading: "Trajectory and the measurement that matters",
			paragraphs: [
				"Unreconciled finance-change records per close cycle is the metric the programme is judged on. The baseline is 5.1 per cycle averaged over twelve months. Phase one should take it to roughly 1.5 as low-risk changes move to single authorship, phase two to under 0.5, and phase three to zero once the duplicate path is gone.",
				"The chart also shows detection lag, which improves earlier and faster than the divergence rate. That ordering is worth anticipating: for the first month it will look as though the programme has solved detection rather than divergence, and it will be tempting to declare success at Gate A. Gate A is a proof that the contract works, not that the problem is closed.",
			],
			exhibit: {
				kind: "line",
				title: "Detection improves first and divergence follows — do not read Gate A as the problem being solved",
				caption: "Unreconciled finance-change records per close cycle against detection lag in days. The divergence rate only reaches zero when the duplicate approval path retires in phase three.",
				source: "Baseline from [INC-2418] · 12-month average 5.1 per cycle",
				ticks: ["Base", "W4", "W6", "W8", "W10", "W12", "W14"],
				series: [
					{ label: "Unreconciled records per cycle", points: [5.1, 1.5, 1.2, 0.8, 0.4, 0.2, 0], tone: "brand" },
					{ label: "Detection lag (days)", points: [23, 2, 1, 0.5, 0.2, 0.1, 0.01], tone: "muted", dashed: true },
				],
			},
		},
	],
	findings: [
		{ label: "Critical path", detail: "The event contract gates every later phase, and the reliability workstream gates phase two. Both depend on the system-of-record matrix being ratified, which is this package's decision." },
		{ label: "First measurable proof", detail: "Unreconciled finance-change records per close cycle, measured at week 4 against the 5.1 baseline over a full close." },
		{ label: "Most likely misreading", detail: "Gate A. Detection lag improves before the divergence rate does, and the programme will look finished at week 4 when it is a third done." },
	],
	nextSteps: [
		{ action: "Confirm the 14-week plan and the 4 FTE allocation", owner: "Transformation lead", due: "Council · 3 Oct" },
		{ action: "Make phase two conditional on evidenced 99.9% availability in writing", owner: "Andre Baker · Platform Architect", due: "Week 1" },
		{ action: "Schedule Gate A to span a complete close cycle", owner: "Sarah Liu · Controller", due: "Week 2" },
		{ action: "Hold the duplicate approval path as rollback until Gate B passes", owner: "Tessa Grant · Change Management Lead", due: "Week 11" },
	],
	citations: ["[ARCH-057]", "[INC-2418]", "[INT-TESSA-01]", "Readiness v7"],
}

const BUSINESS_CASE: DeliverableBody = {
	heading: "A $1.14m programme returning $742k a year — but the case is the SOX position, and that is not a number.",
	lede: "The quantified benefits are real and they do not, on their own, justify fourteen weeks of platform work: $742k a year against $1.14m of investment is a nineteen-month payback, which is defensible rather than compelling. The reason to proceed is that 61 finance changes a year carry divergent approval state and 19 of them are found at period close. That is a control deficiency in the making, and its cost is a remediation programme rather than a line in a benefits model.",
	metrics: [
		{ value: "$1.14m", label: "One-off investment", note: "14 weeks · 4 FTE · reliability work" },
		{ value: "$742k", label: "Annual gross benefit", note: "From month five at full run rate" },
		{ value: "19 months", label: "Payback period", note: "3-year NPV $684k at 10%" },
		{ value: "61 → 0", label: "Divergent records a year", note: "The benefit that is not a number" },
	],
	keyMessages: [
		{ label: "The quantified case is adequate, not compelling", detail: "Close-cycle days recovered, reconciliation effort removed, and audit preparation reduced total $742k a year. That is a nineteen-month payback. Presented alone it would be a reasonable programme to defer." },
		{ label: "The real case is the control deficiency it prevents", detail: "Nineteen divergences a year discovered at period close, in a SOX-scoped process, is the pattern that becomes a significant deficiency at the next examination. The remediation cost of the last comparable finding was $1.8m and eleven months." },
		{ label: "Consolidation is cheaper on paper and wrong in practice", detail: "Retiring one platform scores better on three-year cost and requires an eighteen-month programme that retires a working control catalog mid-flight. The appraisal rejects it on delivery risk, not on cost." },
	],
	sections: [
		{
			heading: "Objectives and success measures",
			paragraphs: [
				"Three measurable outcomes, each with a baseline from the twelve-month incident record and a date. The primary measure is the divergence rate rather than the close-cycle time, for the same reason the TPRM programme measures the audit position rather than the queue: the visible measure is not the exposure.",
				"Close-cycle time is a secondary measure and a genuine benefit. Four of the last twelve closes were delayed by reconciliation, at an average of 2.3 days, and each delayed close consumes finance effort that is straightforward to value.",
			],
			bullets: [
				{ label: "Zero dual-authored approvals", detail: "Baseline 100% of high-risk changes written in both systems. Measured over 30 consecutive days from week 14. Primary measure." },
				{ label: "Zero unreconciled records per close cycle", detail: "Baseline 5.1 per cycle over twelve months. Measured at week 4, week 10, and week 14." },
				{ label: "Detection within 15 minutes", detail: "Baseline median 23 days. Measured continuously from week 4." },
			],
		},
		{
			heading: "Options appraisal",
			paragraphs: [
				"Three options carried forward, scored against five weighted criteria agreed with the Controls Product Owner and the Controller before scoring. SOX position carries 35% because it is the exposure the Discovery found; delivery risk carries 20% because the rejected option fails there rather than on cost.",
				"Consolidation onto a single platform scores well on three-year total cost and poorly on everything that matters in the next twelve months. Retiring the controls platform means re-implementing a 176-control catalog while the current one remains the audit position — an eighteen-month programme with a control migration in the middle of it.",
				"Option B wins at 4.25 and is insensitive to the SOX weighting: at zero weight on SOX position it still wins on delivery risk and reversibility.",
			],
			exhibit: {
				kind: "table",
				title: "Consolidation is cheaper over three years and is rejected on delivery risk, not on cost",
				caption: "Weighted appraisal against criteria agreed before scoring. Scores are 1–5; weights sum to 100%. Option B wins even with SOX position weighted at zero.",
				source: "Options appraisal · [INC-2418] · [SOX-041] · [INT-RAVI-06]",
				columns: ["Criterion", "Weight", "A · Reconciliation only", "B · System-of-record matrix", "C · Consolidate"],
				rows: [
					{ cells: ["SOX position", "35%", "2", "5", "4"] },
					{ cells: ["Delivery risk", "20%", "5", "4", "1"] },
					{ cells: ["Three-year total cost", "20%", "5", "3", "4"] },
					{ cells: ["Reversibility", "15%", "5", "4", "1"] },
					{ cells: ["Operational disruption", "10%", "5", "3", "1"] },
					{ cells: ["Weighted score", "100%", "3.75", "4.25", "2.70"], emphasis: true },
				],
			},
		},
		{
			heading: "Costs and benefits",
			paragraphs: [
				"The $1.14m comprises 14 weeks at 4 FTE for the integration build, the database failover remediation that phase two depends on, and the change-management effort across Finance and Change Management. No new licensing is required, and the reliability work retains standalone value if the integration is stopped.",
				"Benefits are dominated by two lines. Close-cycle recovery values the 9.2 delayed close-days a year at the loaded finance rate plus the downstream reporting delay. Reconciliation effort removed is the 340 hours a year currently spent investigating mismatches at period close, which becomes near-zero once mismatches raise an owned case at the point of divergence.",
				"Audit preparation reduction is the most conservative line: 190 hours a year of evidence-gathering that becomes a query rather than a reconstruction, valued at the external audit rate for the portion currently performed by the auditor.",
			],
			exhibit: {
				kind: "bar",
				title: "Two lines carry 78% of the benefit, and both are measurable from existing timesheet and close data",
				caption: "Annual gross benefit by source at full run rate from month five. No line is risk-weighted; the contingent audit-remediation benefit is deliberately excluded and argued separately.",
				source: "Benefits model · [INC-2418] · close-cycle records · loaded rate $104/hour",
				unit: "$k",
				data: [
					{ label: "Close-cycle days recovered", value: 318, note: "9.2 delayed close-days a year", emphasis: true },
					{ label: "Reconciliation effort removed", value: 262, note: "340 hours at period close", emphasis: true },
					{ label: "Audit preparation reduced", value: 108, note: "190 hours · partly external rate" },
					{ label: "Emergency-change handling", value: 54, note: "23 divergent emergency changes" },
				],
			},
		},
		{
			heading: "The benefit that is not in the model",
			paragraphs: [
				"Nineteen divergences a year discovered at period close, inside a SOX-scoped process, is the shape of a control deficiency before it is called one. It has not yet been raised as a finding, which is the only reason it does not appear as a cost.",
				"The last comparable finding at Northstar — a segregation-of-duties gap in the entitlement process — cost $1.8m and eleven months to remediate, and the remediation was performed under an externally imposed timetable rather than an internal one. Excluding that from the benefits model is conservative; excluding it from the decision would be a mistake.",
				"The business case therefore states two answers. On the quantified model, this is a nineteen-month payback that a rational committee could defer. On the control position, it is work that is cheaper to do now than under an audit timetable, and that is the argument the council should weigh.",
			],
			exhibit: {
				kind: "line",
				title: "Payback at month nineteen on the quantified model — and at month seven if a finding lands in year two",
				caption: "Cumulative net position by month. The dashed line adds the risk-weighted remediation avoided at the observed 40% probability of a finding within two years.",
				source: "Benefits model · prior remediation cost $1.8m · Readiness v7",
				unit: "$k",
				ticks: ["M0", "M3", "M6", "M9", "M12", "M18", "M24", "M36"],
				series: [
					{ label: "Quantified benefits only", points: [-420, -1140, -958, -772, -586, -214, 158, 902], tone: "brand" },
					{ label: "Including risk-weighted remediation avoided", points: [-420, -1140, -778, -412, -46, 686, 1418, 2882], tone: "muted", dashed: true },
				],
				band: { label: "Payback", value: 0 },
			},
		},
		{
			heading: "Feasibility",
			paragraphs: [
				"Feasibility is strong on every dimension except one. The controls platform delivers 99.62% availability against a 99.9% design assumption, and phase two cannot proceed until that gap closes. This is a scheduling dependency rather than a feasibility failure, and the roadmap treats it as one.",
				"Organisational feasibility is the second-weakest dimension and is worth naming. Change Management absorbs a new evidence step without added headcount under the current plan, which is assumption A-04 and is untested. If it fails, phase three slips rather than the control weakening.",
			],
			exhibit: {
				kind: "heatmap",
				title: "The only weak dimension is the availability gap, which is a scheduling dependency rather than a feasibility failure",
				caption: "Feasibility by dimension and option (0 = not feasible, 100 = fully feasible with current capability). Consolidation scores poorly on schedule because it requires a control-catalog migration mid-programme.",
				source: "Feasibility assessment · [ARCH-057] · [INC-2418] · [INT-ANDRE-02]",
				columns: ["A · Reconcile", "B · Matrix", "C · Consolidate"],
				rows: [
					{ label: "Technical", values: [94, 81, 52] },
					{ label: "Operational", values: [88, 74, 38] },
					{ label: "Financial", values: [91, 77, 61] },
					{ label: "Schedule", values: [92, 69, 24] },
					{ label: "Organisational readiness", values: [86, 64, 31] },
				],
				scale: ["Not feasible", "Fully feasible"],
			},
		},
	],
	findings: [
		{ label: "Recommended option", detail: "Option B, the system-of-record matrix with event integration. Weighted score 4.25, and it wins even with the SOX criterion weighted at zero." },
		{ label: "Honest statement of the case", detail: "Nineteen-month payback on quantified benefits alone. The argument for proceeding now is the control position, and the council should weigh it as such rather than as a return." },
		{ label: "Cost item most likely to move", detail: "The database failover remediation. It is estimated rather than scoped, and phase two cannot start until it lands." },
	],
	nextSteps: [
		{ action: "Approve the $1.14m investment including the reliability workstream", owner: "Architecture council", due: "Council · 3 Oct" },
		{ action: "Scope the failover remediation properly before committing the phase-two date", owner: "Andre Baker · Platform Architect", due: "Week 1" },
		{ action: "Baseline the 340 reconciliation hours from close-cycle timesheets", owner: "Sarah Liu · Controller", due: "Week 2" },
		{ action: "Present the control-position argument to the audit committee separately", owner: "Ravi Menon · Controls Product Owner", due: "Week 4" },
	],
	citations: ["[INC-2418]", "[SOX-041]", "[ARCH-057]", "[INT-RAVI-06]", "Readiness v7"],
}

const PROJECT_CHARTER: DeliverableBody = {
	heading: "Fourteen weeks, four accountable owners, and a scope that stops at the finance-change workflow on purpose.",
	lede: "The charter covers one workflow: financial change from request to attestation. Access recertification, the identity platform, the vendor-risk workflow, and the wider ServiceNow estate are named out of scope, because each shares a platform with this work and each would extend the programme past the point where the control position can be proven. The council approves the matrix; the charter approves what will be built against it.",
	metrics: [
		{ value: "14 weeks", label: "Charter duration", note: "Three phases, three measured gates" },
		{ value: "4", label: "Accountable owners", note: "One per workstream, none shared" },
		{ value: "6", label: "Named out-of-scope items", note: "All share a platform with this work" },
		{ value: "13", label: "Stakeholders mapped", note: "Including external audit" },
	],
	keyMessages: [
		{ label: "Scope is one workflow, not one platform", detail: "Everything excluded runs on the same two platforms and would be technically convenient to include. Each would also confound the measurement that proves the control works, which is the programme's only real deliverable." },
		{ label: "The event contract is owned by neither consumer", detail: "The Platform Architect owns it, and neither ServiceNow nor the controls platform team can change it unilaterally. A contract owned by one of its consumers drifts toward that consumer within two releases." },
		{ label: "The council decides two things and delegates the rest", detail: "The system-of-record matrix and the acceptance of R-03. Everything else — sequencing, reconciliation ownership, event versioning — belongs below the council and is named here so it does not drift upward." },
	],
	sections: [
		{
			heading: "Scope",
			paragraphs: [
				"In scope: the six-event contract, the transactional outbox on both publishers, the fifteen-minute reconciliation loop with owned cases, the fail-closed boundary for high-risk finance changes, attestation in the controls platform including the emergency path, and retirement of the duplicate approval path.",
				"Out of scope: access recertification, identity platform integration, the vendor-risk workflow, non-finance change types, the wider ServiceNow estate, and period-close reporting beyond the migration of finance-change evidence.",
				"Access recertification is the most likely scope challenge, because five of the fourteen uncovered SOX controls sit there and it is tempting to close them in the same programme. They depend on an identity platform this integration does not touch, and including them would make the fourteen-week plan a nine-month one.",
			],
			exhibit: {
				kind: "table",
				title: "Every exclusion shares a platform with this work — which is exactly why each has to be named",
				caption: "Scope statement. Out-of-scope items carry the reason and the earliest point at which they could reasonably be reconsidered.",
				source: "Programme charter · [SOX-041] · [ARCH-057] · [INT-RAVI-06]",
				columns: ["In scope", "Out of scope", "Why excluded", "Reconsider at"],
				rows: [
					{ cells: ["Six-event contract and outbox", "Access recertification", "Depends on an identity platform outside this scope", "Phase 4 candidate"], emphasis: true },
					{ cells: ["Fifteen-minute reconciliation", "Identity platform integration", "Separate programme, separate owner", "FY planning"] },
					{ cells: ["Fail-closed boundary", "Vendor-risk workflow", "Same platform, different control catalog", "Not planned"] },
					{ cells: ["Attestation including emergency path", "Non-finance change types", "Would confound the control measurement", "After Gate C"] },
					{ cells: ["Duplicate approval path retirement", "Wider ServiceNow estate", "No dependency on the finance workflow", "Not planned"] },
					{ cells: ["Finance-change evidence migration", "Period-close reporting redesign", "Reporting change during a control change", "Year 2 planning"] },
				],
			},
		},
		{
			heading: "Stakeholders",
			paragraphs: [
				"Thirteen stakeholders mapped on influence against interest. External audit sits high on influence and moderate on interest, and its position is the one that changes most if the programme slips — an unremediated divergence pattern becomes their finding rather than Northstar's improvement.",
				"The Controller is the pivotal internal stakeholder. She owns the attestation policy, chairs the close, and is the person who will feel the fail-closed boundary first when a quarter-end change is blocked. Engaging her as the owner of D-01 rather than as a consultee is deliberate.",
				"Change Management sits lower on influence than its exposure warrants. It absorbs the new evidence step without added headcount under A-04, and if that assumption fails it is the function that discovers it.",
			],
			exhibit: {
				kind: "quadrant",
				title: "External audit is the stakeholder whose position changes most if the programme slips",
				caption: "Thirteen stakeholders on influence against interest. The Controller owns D-01 and is engaged as a decision owner rather than as a consultee.",
				source: "Stakeholder analysis · Discovery interviews · [INT-SARAH-03] · [INT-RAVI-06]",
				xAxis: ["Low interest", "High interest"],
				yAxis: ["Low influence", "High influence"],
				points: [
					{ label: "Controls Product Owner", x: 94, y: 79, emphasis: true },
					{ label: "Controller", x: 77, y: 90, emphasis: true },
					{ label: "Platform Architect", x: 89, y: 68, emphasis: true },
					{ label: "Change Management Lead", x: 72, y: 49, emphasis: true },
					{ label: "External audit", x: 48, y: 92 },
					{ label: "Architecture council", x: 39, y: 84 },
					{ label: "CFO", x: 34, y: 79 },
					{ label: "Internal audit", x: 57, y: 63 },
					{ label: "Finance operations", x: 71, y: 36 },
					{ label: "ServiceNow platform team", x: 66, y: 58 },
					{ label: "Change requesters", x: 62, y: 21 },
					{ label: "IT service desk", x: 44, y: 24 },
					{ label: "Audit committee", x: 26, y: 71 },
				],
			},
		},
		{
			heading: "Roles and responsibilities",
			paragraphs: [
				"Four workstreams, four accountable owners, and the same rule as the target operating model: one accountable owner per row. The event contract row is the one worth reading twice — the Platform Architect is accountable and both platform teams are responsible, which is the structure that keeps the contract from drifting toward whichever consumer ships faster.",
				"The Controller is accountable for attestation policy including the emergency path, and this is where D-01 closes. Making the policy owner accountable for the decision rather than consulted on it is what converts D-01 from a standing agenda item into something with a date.",
			],
			exhibit: {
				kind: "table",
				title: "The architect is accountable for the contract and both platform teams are responsible — the structure that stops it drifting",
				caption: "Initial RACI for the charter. A = accountable, R = responsible, C = consulted, I = informed. No row carries two accountable owners.",
				source: "Programme charter · agreed with workstream owners",
				columns: ["Workstream", "Controls PO", "Architect", "Controller", "Change Mgmt", "Council"],
				rows: [
					{ cells: ["Event contract and versioning", "R", "A", "I", "R", "I"], emphasis: true },
					{ cells: ["Outbox and durable delivery", "C", "A", "I", "R", "—"] },
					{ cells: ["Reconciliation loop and case routing", "A", "C", "C", "R", "—"] },
					{ cells: ["Attestation policy and emergency path", "R", "I", "A", "C", "C"] },
					{ cells: ["Reliability remediation", "I", "A", "I", "I", "—"] },
					{ cells: ["System-of-record matrix", "R", "R", "C", "C", "A"] },
				],
			},
		},
		{
			heading: "Governance and cadence",
			paragraphs: [
				"A weekly delivery stand-up with the four workstream owners, and gate reviews at weeks 4, 10, and 14 with the architecture council. The council sees the programme three times and decides two things: the matrix at the outset and the acceptance of R-03 alongside it.",
				"There is no separate steering group. The council is the escalation body and the stand-up resolves everything else; inserting a third forum would give decisions somewhere to wait, and the programme is short enough that waiting is the main risk to it.",
				"Gate reviews are measurements. Each has a numeric condition drawn from production behaviour, and a gate that can be passed with a slide deck is not a gate.",
			],
			bullets: [
				{ label: "Weekly delivery stand-up", detail: "Four workstream owners. Resolves anything not touching the matrix, a control, or a gate date." },
				{ label: "Gate reviews at weeks 4, 10, 14", detail: "Architecture council attends. Each gate has a numeric production condition." },
				{ label: "Council decisions", detail: "Two only: ratify the matrix, and accept R-03 explicitly. Everything else is delegated and named." },
			],
		},
		{
			heading: "Constraints, dependencies, and milestones",
			paragraphs: [
				"Two hard constraints. The council date of 3 October fixes ratification, and phase two cannot begin until the controls platform evidences 99.9% availability over four consecutive weeks. The second is a dependency the programme does not control, which is why it appears as a constraint rather than a task.",
				"The close cycle is the third constraint and the one most often forgotten. Phase two must land outside a close window; a control change landing mid-close would put the programme in the position of having caused the disruption it exists to prevent.",
			],
		},
	],
	findings: [
		{ label: "Charter boundary most likely to be tested", detail: "Access recertification. Five uncovered SOX controls sit there and closing them in this programme would turn fourteen weeks into nine months." },
		{ label: "Governance rule that matters", detail: "The event contract is accountable to the architect, not to either consuming platform team. Contracts owned by a consumer drift within two releases." },
		{ label: "Constraint the plan does not control", detail: "Controls-platform availability reaching 99.9%. Phase two is gated on it and the programme cannot compel it." },
	],
	nextSteps: [
		{ action: "Sign the charter including the six named exclusions", owner: "Ravi Menon · Controls Product Owner", due: "Week 1" },
		{ action: "Confirm the RACI including contract ownership with both platform teams", owner: "Andre Baker · Platform Architect", due: "Week 1" },
		{ action: "Schedule phase two outside a close window", owner: "Sarah Liu · Controller", due: "Week 2" },
		{ action: "Brief external audit on the programme and the Gate B measurement", owner: "Ravi Menon · Controls Product Owner", due: "Week 6" },
	],
	citations: ["[ARCH-057]", "[SOX-041]", "[INT-SARAH-03]", "[INT-TESSA-01]", "Readiness v7"],
}

const PROCESS_ANALYSIS: DeliverableBody = {
	heading: "The approval step is performed twice and reconciled once, twenty-three days later. Removing the second approval removes the reconciliation with it.",
	lede: "Mapped end to end, the finance-change process has eleven steps and one of them — approval — is executed independently in two systems. Every downstream problem in this Discovery follows from that single duplication: the divergence rate, the twenty-three-day detection lag, the manual period-close reconciliation, and the emergency path that lets a requester attest. The To-Be process has nine steps, one approval, and no reconciliation stage at all.",
	metrics: [
		{ value: "11 → 9", label: "Steps in the process", note: "One duplicated approval removed" },
		{ value: "2 → 1", label: "Systems writing the approval", note: "The single structural change" },
		{ value: "340 hrs", label: "Annual reconciliation effort", note: "Becomes an exception queue" },
		{ value: "23 days → 15 min", label: "Detection of a divergence", note: "From period close to event time" },
	],
	keyMessages: [
		{ label: "One duplicated step produces every symptom", detail: "Divergence, detection lag, close-cycle delay, and the emergency-path weakness all trace to approval being authored in two places. This is unusually clean: most process problems have several causes." },
		{ label: "The reconciliation stage is not improved, it is deleted", detail: "Period-close reconciliation exists to repair the consequence of dual authorship. Remove the duplication and the stage has nothing to do — which is why the To-Be process has fewer steps rather than better ones." },
		{ label: "The emergency path is the same process with the sequencing relaxed", detail: "It is not a separate process and should not be mapped as one. It relaxes ordering, and today that relaxation extends to who may attest — which is the defect, not the relaxation itself." },
	],
	sections: [
		{
			heading: "As-Is process",
			paragraphs: [
				"A finance change is raised in ServiceNow, routed, and approved. In parallel the controls platform evaluates the control, gathers evidence, and records its own approval. Both records exist independently; neither is conditional on the other. Fulfilment proceeds from the ServiceNow record, and the two are compared at period close.",
				"The comparison is manual and is performed against a join on free-text change descriptions, which fails for 23% of records. That is why the median detection time is 23 days rather than one close cycle: the reconciliation finds what it can match, and the rest surface when someone notices.",
				"Emergency changes traverse the same path with the ordering relaxed. The relaxation is legitimate — a production incident cannot wait for sequential attestation — but it currently also relaxes who may attest, and 23 of the 61 divergences occur here.",
			],
			exhibit: {
				kind: "architecture",
				title: "As-Is: approval is authored twice and compared once, twenty-three days later",
				caption: "Observed finance-change process. The two amber approval nodes are the duplication; every downstream problem in this Discovery follows from them.",
				source: "Process reconstruction from [INC-2418] · validated in [INT-SARAH-03]",
				lanes: ["Request", "Approval", "Control", "Close"],
				nodes: [
					{ id: "raise", label: "Change raised", detail: "684 finance changes/yr", lane: 0, row: 0, tone: "neutral" },
					{ id: "route2", label: "Routing", detail: "ServiceNow", lane: 0, row: 1, tone: "neutral" },
					{ id: "snapp", label: "ServiceNow approval", detail: "Writes record 1", lane: 1, row: 0, tone: "warn" },
					{ id: "ctlapp", label: "Controls approval", detail: "Writes record 2", lane: 1, row: 1, tone: "warn" },
					{ id: "eval", label: "Control evaluation", detail: "Evidence gathered", lane: 2, row: 0, tone: "neutral" },
					{ id: "attest", label: "Attestation", detail: "Requester may attest", lane: 2, row: 1, tone: "warn" },
					{ id: "fulfil", label: "Fulfilment", detail: "From record 1 only", lane: 3, row: 0, tone: "neutral" },
					{ id: "recon2", label: "Period-close reconcile", detail: "Manual · 340 hrs/yr", lane: 3, row: 1, tone: "warn" },
				],
				edges: [
					{ from: "raise", to: "route2" },
					{ from: "route2", to: "snapp" },
					{ from: "route2", to: "ctlapp", label: "parallel", tone: "warn" },
					{ from: "ctlapp", to: "eval" },
					{ from: "eval", to: "attest" },
					{ from: "snapp", to: "fulfil" },
					{ from: "snapp", to: "recon2", label: "compared at close", tone: "warn", dashed: true },
					{ from: "attest", to: "recon2", label: "compared at close", tone: "warn", dashed: true },
				],
			},
		},
		{
			heading: "Where the effort and the delay sit",
			paragraphs: [
				"Elapsed time on a routine finance change is 4.2 days, of which approval accounts for 1.8. That is not the problem, and a process improvement aimed at approval speed would be solving the wrong thing.",
				"The effort that matters is downstream and invisible in the change record: 340 hours a year of reconciliation at period close, plus 190 hours of audit-evidence assembly, plus the 9.2 close-days lost to reconciliation disputes. None of it appears in the change process because it is not part of it — it is repair.",
			],
			exhibit: {
				kind: "stack",
				title: "The repair effort is larger than the process effort and sits entirely outside the change record",
				caption: "Annual effort by activity, in hours. Repair activities exist only because approval is authored twice; they have no equivalent in the To-Be process.",
				source: "Effort analysis · [INC-2418] · close-cycle timesheets",
				segments: [
					{ label: "Process effort", tone: "brand" },
					{ label: "Repair effort", tone: "warn" },
					{ label: "Audit assembly", tone: "neutral" },
				],
				rows: [
					{ label: "Routine finance change", values: [1240, 74, 40] },
					{ label: "High-risk change", values: [548, 122, 68] },
					{ label: "Emergency change", values: [186, 144, 52], note: "Highest repair ratio" },
					{ label: "Period close", values: [0, 340, 190], note: "Entirely repair and assembly" },
				],
			},
		},
		{
			heading: "Gap analysis",
			paragraphs: [
				"Five gaps. The first is the whole programme — single authorship — and the remaining four are the conditions that make single authorship safe. Ordering them this way is deliberate: it is possible to implement durable delivery and reconciliation without removing the duplication, which is Option A in the appraisal, and it improves nothing that matters.",
				"The fifth gap, emergency attestation, removes no elapsed time and closes the segregation-of-duties exposure that reached the council. It is the smallest process change and the largest control change in the set.",
			],
			exhibit: {
				kind: "table",
				title: "The first gap is the programme; the other four are what make it safe",
				caption: "Gap analysis. Each change is traced to a requirement in the specification, so no requirement exists without a process defect behind it.",
				source: "Gap analysis · [INC-2418] · [SOX-041] · [ARCH-057]",
				columns: ["Gap", "As-Is", "To-Be", "Change required", "Effect"],
				rows: [
					{ cells: ["Approval authorship", "Two systems write approval", "Controls platform only", "System-of-record matrix", "Divergence rate 8.9% → 0%"], emphasis: true },
					{ cells: ["Delivery durability", "Inline call, in-process retry", "Transactional outbox", "Outbox on both publishers", "38 of 61 divergences removed at source"] },
					{ cells: ["Evidence addressing", "Join on free-text description", "Control identifier on every event", "Event contract change", "23% unmatchable → 0%"] },
					{ cells: ["Mismatch detection", "Manual at period close", "Owned case in 15 minutes", "Reconciliation loop", "23 days → 15 minutes"] },
					{ cells: ["Emergency attestation", "Requester may attest", "Attestor never the requester", "REQ-11 enforced in all paths", "Closes the SoD exposure"] },
				],
			},
		},
		{
			heading: "To-Be process",
			paragraphs: [
				"Nine steps. A change is raised and routed in ServiceNow, which publishes an event rather than writing an approval. The controls platform evaluates, gathers evidence, and records the attestation — the single approval record. ServiceNow reads it and releases fulfilment.",
				"The reconciliation loop remains in the diagram but its job has changed entirely: it no longer repairs divergent approvals, because there are none. It monitors read-model staleness and raises a case when a copy falls outside its fifteen-minute bound.",
				"Emergency changes follow the identical path with ordering relaxed. Fulfilment may precede attestation; attestation may never be authored by the requester. That is the whole of the emergency-path design, and it is deliberately not a separate process.",
			],
			exhibit: {
				kind: "architecture",
				title: "To-Be: one approval record, and the reconciliation loop monitors staleness instead of repairing divergence",
				caption: "Target process. The reconciliation node survives with a different job — it watches read-model freshness rather than repairing approvals that should never have diverged.",
				source: "Target process · [ARCH-057] · [SOX-041] · Readiness v7",
				lanes: ["Request", "Event", "Control", "Fulfil"],
				nodes: [
					{ id: "raise2", label: "Change raised", detail: "Structured, control-tagged", lane: 0, row: 0, tone: "neutral" },
					{ id: "route3", label: "Routing", detail: "ServiceNow · no approval", lane: 0, row: 1, tone: "brand" },
					{ id: "bus", label: "Event + outbox", detail: "Durable, idempotent", lane: 1, row: 0, tone: "brand" },
					{ id: "recon3", label: "Reconciliation loop", detail: "Staleness, not repair", lane: 1, row: 1, tone: "muted" },
					{ id: "eval2", label: "Control evaluation", detail: "Evidence attached", lane: 2, row: 0, tone: "neutral" },
					{ id: "attest2", label: "Attestation", detail: "Attestor ≠ requester", lane: 2, row: 1, tone: "brand" },
					{ id: "fulfil2", label: "Fulfilment", detail: "Released by attestation", lane: 3, row: 0, tone: "brand" },
				],
				edges: [
					{ from: "raise2", to: "route3" },
					{ from: "route3", to: "bus", label: "change.requested" },
					{ from: "bus", to: "eval2" },
					{ from: "eval2", to: "attest2" },
					{ from: "attest2", to: "bus", label: "attestation.recorded" },
					{ from: "bus", to: "fulfil2", label: "release" },
					{ from: "bus", to: "recon3", label: "staleness watch" },
				],
			},
		},
		{
			heading: "What the process change does not fix",
			paragraphs: [
				"Change volume is unchanged, and so is the effort of evaluating a control. The 1,974 hours of genuine process effort across all change types stays where it is; what disappears is the 680 hours of repair and assembly.",
				"The emergency path still relaxes ordering, and that remains a real control trade-off. Making attestation impossible to author by the requester closes the segregation exposure; it does not make an emergency change as well-evidenced as a planned one, and no design achieves that without refusing emergency changes altogether.",
			],
		},
	],
	findings: [
		{ label: "Root process defect", detail: "Approval is authored in two systems. Every symptom in this Discovery — divergence, detection lag, close delay, emergency-path weakness — follows from that one duplication." },
		{ label: "The repair work is larger than the process work", detail: "680 hours a year of reconciliation and audit assembly exist only to repair the consequence of dual authorship, and none of it appears in the change record." },
		{ label: "Smallest process change, largest control change", detail: "Forbidding the requester from authoring the attestation removes no elapsed time and closes the exposure that reached the council." },
	],
	nextSteps: [
		{ action: "Validate the As-Is map with Finance and the ServiceNow platform team", owner: "Tessa Grant · Change Management Lead", due: "Week 1" },
		{ action: "Confirm the emergency path is mapped as ordering relaxation, not a separate process", owner: "Sarah Liu · Controller", due: "Week 2" },
		{ action: "Baseline the 340 reconciliation hours before phase one", owner: "Sarah Liu · Controller", due: "Week 2" },
		{ action: "Trace every requirement in the specification back to one of the five gaps", owner: "Ravi Menon · Controls Product Owner", due: "Week 3" },
	],
	citations: ["[INC-2418]", "[SOX-041]", "[INT-SARAH-03]", "[INT-TESSA-01]", "Readiness v7"],
}

export const ENTERPRISE_DELIVERABLES: DeliverableBody[] = [EXECUTIVE_BRIEF, BUSINESS_CASE, PROJECT_CHARTER, PROCESS_ANALYSIS, REQUIREMENTS, TECHNICAL_ASSESSMENT, TARGET_OPERATING_MODEL, RAID_REGISTER, ROADMAP]

// With the owner's approval the outage fallback becomes a design resolution
// case, so the brief reports the open case rather than a trade-off recorded for
// the council.
export const ENTERPRISE_APPROVED_REVISIONS: Partial<Record<number, DeliverableRevision>> = {
	0: {
		findings: {
			"Unresolved exposure": { label: "Open design resolution case", detail: "The outage fallback is in a design resolution case. Until it closes, high-risk changes still fail closed during an outage, and the case decides whether an independent attestor can lift that block." },
		},
	},
}
