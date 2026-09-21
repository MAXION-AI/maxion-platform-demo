import type { DeliverableBody, DeliverableRevision } from "./types"

// Third-party onboarding control redesign · Northstar
// Evidence base: 43 policy documents, 126 backlog issues, 284 register records,
// 68 contract approval decisions. Every figure below traces to one of those.

const EXECUTIVE_BRIEF: DeliverableBody = {
	heading: "Approve the risk-tiered gate. The exposure is the 32% of contracts signed with a review still open, not the cycle time.",
	lede: "Onboarding is slow, and that is the complaint you hear. It is not the finding. Of the 68 contract decisions in the approval record, 22 were signed while at least one mandatory review was still open — and in 19 of those the review never closed afterwards. The redesign makes tiering the first act of intake, collapses four serial reviews into parallel checks against one shared evidence record, and puts a single accountable owner on the gate. Cycle time falls as a by-product; the audit trail is what actually gets fixed.",
	metrics: [
		{ value: "32%", label: "Contracts signed with an open review", note: "22 of 68 decisions · 19 never closed" },
		{ value: "34 days", label: "Median intake to signature", note: "48 days for Tier 1 vendors" },
		{ value: "11", label: "Vendors with no register record", note: "Found only in contract approvals" },
		{ value: "$2.4m", label: "Contracted savings deferred", note: "11 strategic vendors in flight" },
	],
	keyMessages: [
		{ label: "The control does not fail — it is bypassed", detail: "No policy in the 43-document library permits signature before review closure. The bypass is structural: nothing in the approval path can block a signature, so the process depends on restraint under schedule pressure and does not survive it." },
		{ label: "Serial review is the cause, not the symptom", detail: "Security, Privacy, Legal, and Risk each re-establish the same facts from scratch. 61% of the questions asked in the four reviews are answered by an artifact another reviewer already holds. Parallel review against one evidence record removes the duplication without removing a control." },
		{ label: "One judgment stays with you; the rest is delegable", detail: "Only Tier 1 residual-risk acceptance and policy exceptions need executive authority. Under the target model that is an estimated 6 to 9 decisions a year, against the 57 exceptions that reached executives last year because no one else was empowered to close them." },
	],
	sections: [
		{
			heading: "Situation",
			paragraphs: [
				"Northstar onboards roughly 90 new third parties a year against a control framework written for a smaller and less data-intensive vendor base. The framework is not weak. Across 43 policy documents the requirements are consistent, the evidence standards are explicit, and the residual-risk language is defensible. Read on paper, this is a strong programme.",
				"The operating reality is different. The third-party register holds 284 active and pending vendors; reconciling it against contract approvals surfaced 11 vendors with an executed contract and no register record at all. Those 11 were not rejected or exempted — they were never entered, because register entry sits downstream of a review that the business had already routed around.",
				"Cycle time is the visible symptom. The median vendor takes 34 days from intake to signature and a Tier 1 vendor takes 48. Sponsors describe the gate as something to be managed rather than passed, and the backlog data agrees with them: 41 of the 126 open risk issues are onboarding items that have aged past their own SLA.",
			],
			exhibit: {
				kind: "bar",
				title: "Two thirds of elapsed time sits in reviews that ask overlapping questions",
				caption: "Median elapsed days by stage across 68 approval decisions. Security and Privacy together account for 20 of the 34 days, and 61% of their questions are answered by evidence another reviewer already holds.",
				source: "Contract approvals · SharePoint (68 decisions) · [SRC-088]",
				unit: "days",
				data: [
					{ label: "Intake and triage", value: 4, note: "Manual, no tiering" },
					{ label: "Security review", value: 11, note: "Serial, re-requests evidence", emphasis: true },
					{ label: "Privacy review", value: 9, note: "Waits on security output", emphasis: true },
					{ label: "Procurement close", value: 6, note: "Blocked on approval thread" },
					{ label: "Risk sign-off", value: 4, note: "Reconstructs the trail" },
				],
			},
		},
		{
			heading: "Complication",
			paragraphs: [
				"The 22 bypassed signatures are not distributed randomly. They cluster in vendors the business considers strategic and in the weeks before quarter end. Nineteen of the 22 involved a review that remained open after signature, which means the evidence was never produced at all — the control was not deferred, it was skipped.",
				"Two structural facts make this inevitable. First, no role in the current model can accept residual risk on behalf of the organisation below executive level, so every genuine trade-off escalates and the queue lengthens. Second, Procurement signs from an approval thread rather than from an evidence record, so a signature is technically possible whether or not the evidence exists. Restraint is the only control in the path.",
				"The interviews confirmed the mechanism rather than contradicting it. The Vendor Risk Lead described the gate as advisory in practice; the Procurement Director described the same gate as the reason deals miss quarter end. Both descriptions are accurate, and both follow from the same design.",
			],
			bullets: [
				{ label: "No fail-closed point", detail: "Signature is possible with an open review. Nothing in the system prevents it, and 32% of decisions took that path." },
				{ label: "No delegated acceptance", detail: "Residual risk cannot be accepted below executive level, so 57 exceptions reached executives last year, most of them routine." },
				{ label: "No shared evidence", detail: "Each reviewer rebuilds the same picture. The duplicated questions are 61% of the total asked." },
			],
		},
		{
			heading: "Recommendation",
			paragraphs: [
				"Approve Option B. Tiering is computed at intake from data class, access scope, and annual spend, and is immutable once the gate opens. Security and Privacy review in parallel against one shared evidence record. The Vendor Risk Lead owns the gate and the exception log. Procurement signs from the evidence record, which makes signature impossible while a required artifact is missing.",
				"Option A — enforce the current process without redesigning it — closes the bypass and makes the queue worse; the modelled median rises to 41 days and the pressure that produced the bypass simply relocates to the exception path. Option C — automate first — is attractive because the tooling exists, but it encodes the serial sequence into software and makes the eventual redesign more expensive, not less.",
				"Option B is the only path in which the audit trail and the cycle time move in the same direction, because both are downstream of the same change: one evidence record instead of four review threads.",
			],
			exhibit: {
				kind: "table",
				title: "Only the redesign improves the audit trail and the cycle time together",
				caption: "Three options assessed against the same evidence base. Modelled cycle times replay the 68 historical approvals through each design.",
				source: "Readiness snapshot v7 · modelled against [SRC-088] and [SRC-031]",
				columns: ["Option", "Median cycle", "Signatures with open review", "Executive decisions per year", "Verdict"],
				rows: [
					{ cells: ["A · Enforce today's process", "41 days", "0%", "57", "Rejected — queue absorbs the pressure and the exception path becomes the bypass"] },
					{ cells: ["B · Risk-tiered gate with parallel review", "18 days", "0%", "6–9", "Recommended — the only option where both measures improve"], emphasis: true },
					{ cells: ["C · Automate the current sequence", "27 days", "11% modelled", "44", "Rejected — encodes serial review into tooling and raises the cost of the eventual redesign"] },
				],
			},
		},
		{
			heading: "What the decision costs",
			paragraphs: [
				"One standing executive judgment remains: whether a strategic vendor may onboard on provisional evidence while Privacy completes retention review. That question cannot be delegated, because it trades a known control gap against a commercial commitment, and only you hold both sides of it.",
				"Everything below that threshold is delegated and does not return to you. Tier 3 residual risk is accepted by the Vendor Risk Lead alone. Tier 2 requires Risk and Security jointly. On last year's volume that boundary converts 57 executive exceptions into an estimated 6 to 9.",
				"The cost of the change itself is a defined 11-week programme and a temporary rise in intake friction while tiering is bedded in. The modelled cycle time gets worse for roughly three weeks before it improves, and the roadmap sequences that deliberately so the deterioration is expected rather than reported as failure.",
			],
			exhibit: {
				kind: "waterfall",
				title: "Cycle time falls to 18 days without removing a single control",
				caption: "Bridge from the current 34-day median to the target. Every reduction comes from removing duplication or waiting time; no review is deleted and no evidence requirement is relaxed.",
				source: "Modelled replay of 68 approval decisions · [SRC-088] · Readiness v7",
				unit: "days",
				steps: [
					{ label: "Today", value: 34, role: "base" },
					{ label: "Parallel review", value: -7, role: "delta" },
					{ label: "Tiering at intake", value: -6, role: "delta" },
					{ label: "Shared evidence record", value: -3, role: "delta" },
					{ label: "Target", value: 18, role: "total" },
				],
			},
		},
		{
			heading: "What this package does not claim",
			paragraphs: [
				"The vendor's data-retention commitment is not evidenced in any internal source. The policy library, the register, and the contract record were all searched; the commitment exists in none of them. It is carried as an explicit limitation rather than inferred from the contract template, and REQ-09 is written so that a Tier 1 vendor cannot reach signature without either that artifact or a time-bound, named exception.",
				"The modelled cycle times are replays of historical decisions through the target design, not forecasts. They assume review capacity holds at current levels; if Security capacity falls, the parallel design degrades gracefully to today's timing rather than failing, but the 18-day figure would not hold.",
			],
		},
	],
	findings: [
		{ label: "Recommended decision", detail: "Approve Option B. Require tiering, security evidence, and privacy terms live before the next strategic vendor is onboarded. Defer SLA automation to phase three." },
		{ label: "Unresolved exposure", detail: "The vendor's retention commitment is not evidenced in any internal source. It is carried as an explicit limitation rather than inferred, and REQ-09 fails closed without it." },
		{ label: "What changes for you", detail: "57 exceptions a year become 6 to 9. The judgment you keep is provisional onboarding for strategic vendors; everything else is owned and dated below you." },
	],
	nextSteps: [
		{ action: "Ratify the tiering thresholds and the residual-acceptance boundary", owner: "Maya Rao · Vendor Risk Lead", due: "Executive review · 18 Sep" },
		{ action: "Close D-05: fix the exception window at 15 or 30 days", owner: "Maya Rao with Priya Shah", due: "Before phase two · week 4" },
		{ action: "Enter the 11 unregistered vendors and re-tier them", owner: "Jordan Lee · Procurement Director", due: "Week 2" },
		{ action: "Confirm Security capacity for parallel review at current volume", owner: "Daniel Kim · Security Architect", due: "Week 1" },
	],
	citations: ["[SRC-014]", "[SRC-088]", "[INT-MAYA-08]", "[INT-JORDAN-04]", "[CASE-003]", "Readiness v7"],
}

const TECHNICAL_ASSESSMENT: DeliverableBody = {
	heading: "Four systems already hold the evidence. None of them holds the decision, which is why the gate cannot fail closed.",
	lede: "The onboarding estate is not missing data. ServiceNow holds the vendor, SharePoint holds the contract, Jira holds the remediation, and OneDrive holds the policy — and none of them holds a machine-readable record of whether a vendor passed the gate. Approval lives in email threads and document metadata, so no system can refuse a signature. The target design introduces one evidence record as the control plane, keeps every existing system of record intact, and makes gate state a first-class object that Procurement signs against.",
	metrics: [
		{ value: "4", label: "Systems in the onboarding path", note: "No shared vendor identifier across them" },
		{ value: "0", label: "Systems holding gate state", note: "Approval exists only in threads" },
		{ value: "17%", label: "Register records failing validation", note: "48 of 284 · missing tier inputs" },
		{ value: "11 wks", label: "Engineering effort to target state", note: "2.5 FTE · no new platform" },
	],
	keyMessages: [
		{ label: "The integration gap is identity, not connectivity", detail: "All four systems expose usable APIs and three are already integrated pairwise. What is missing is a stable third-party identifier that survives across them; 11 vendors exist in contracts with no register record precisely because nothing forces the key to be created first." },
		{ label: "Gate state must be an object, not a status field", detail: "A gate decision needs the tier, the evidence artifacts, the accepting identity, and the timestamp bound together and immutable. A status field on the vendor record cannot carry that and cannot be replayed for audit." },
		{ label: "No new platform is required", detail: "The target state is built from ServiceNow workflow, a control-plane record, and event delivery between existing systems. The estimate is 11 weeks at 2.5 FTE, and the highest-risk component is data remediation rather than build." },
	],
	sections: [
		{
			heading: "Current-state architecture",
			paragraphs: [
				"Four systems participate in onboarding and each is authoritative for something real. ServiceNow holds the third-party register and is the closest thing to a master record. SharePoint holds executed contracts and, incidentally, the only durable trace of who approved what. Jira holds security and risk remediation. OneDrive holds the policy library that defines what any of it means.",
				"The connections between them are point-to-point and one-directional. Contract metadata is copied into the register by hand at close. Jira issues reference vendors by free-text name, which is why 23 remediation issues could not be matched to a register record during reconciliation. Nothing writes back, so the register drifts from the moment a vendor is created.",
				"The consequence is the one the executive brief describes. Because approval state exists only as correspondence, no system in the path is capable of refusing a signature. The control is enforced socially and fails under schedule pressure, exactly as the 22 bypassed signatures show.",
			],
			exhibit: {
				kind: "architecture",
				title: "Current state: four systems of record, no control plane, approval carried in correspondence",
				caption: "Solid lines are automated flows; dashed lines are manual re-keying. The approval decision itself has no system — it exists in email and document metadata, so signature cannot be blocked programmatically.",
				source: "Integration architecture review · [SRC-014] · [SRC-047] · [INT-DANIEL-03]",
				lanes: ["Intake", "Review", "Systems of record", "Outcome"],
				nodes: [
					{ id: "req", label: "Sponsor request", detail: "Email or portal form", lane: 0, row: 0, tone: "neutral" },
					{ id: "triage", label: "Manual triage", detail: "No tier computed", lane: 0, row: 1, tone: "warn" },
					{ id: "sec", label: "Security review", detail: "Jira · 126 issues", lane: 1, row: 0, tone: "neutral" },
					{ id: "priv", label: "Privacy review", detail: "Email thread", lane: 1, row: 1, tone: "warn" },
					{ id: "reg", label: "Third-party register", detail: "ServiceNow · 284", lane: 2, row: 0, tone: "neutral" },
					{ id: "pol", label: "Policy library", detail: "OneDrive · 43 docs", lane: 2, row: 1, tone: "neutral" },
					{ id: "sign", label: "Contract signature", detail: "SharePoint · 68", lane: 3, row: 0, tone: "warn" },
				],
				edges: [
					{ from: "req", to: "triage" },
					{ from: "triage", to: "sec" },
					{ from: "sec", to: "priv", label: "serial" },
					{ from: "priv", to: "sign", label: "no gate check", tone: "warn", dashed: true },
					{ from: "sec", to: "reg", label: "manual", dashed: true },
					{ from: "pol", to: "priv", label: "reference", dashed: true },
					{ from: "sign", to: "reg", label: "re-keyed at close", tone: "warn", dashed: true },
				],
			},
		},
		{
			heading: "Data quality assessment",
			paragraphs: [
				"Tiering can only be computed at intake if the inputs exist at intake. Validating all 284 register records against the three tiering inputs — data classification, access scope, and annual spend — found 48 records (17%) missing at least one, and 12 missing two or more. Those records cannot be tiered without human input, which is the remediation task that gates phase one.",
				"The defect concentration matters more than the rate. Missing data classification accounts for 31 of the 48 and falls almost entirely in vendors onboarded before the 2023 policy revision. Spend data is present in 279 of 284 records but disagrees with the contract value in 34 cases, always because the register captured the first-year figure and the contract carried a multi-year total.",
				"None of this blocks the design. It does set the sequence: the register reconciliation must complete before tiering at intake can be switched on, which is why it sits on the critical path in the roadmap rather than running alongside it.",
			],
			exhibit: {
				kind: "stack",
				title: "Tiering inputs are complete for 83% of the register; the gap is concentrated in pre-2023 vendors",
				caption: "Field-level completeness across 284 register records for the three inputs the tiering rule requires. Records missing two or more inputs need sponsor confirmation and are the phase-one remediation queue.",
				source: "Third-party register · ServiceNow (284 records) · [SRC-031]",
				segments: [
					{ label: "Complete", tone: "brand" },
					{ label: "Derivable from contract", tone: "muted" },
					{ label: "Missing — needs sponsor input", tone: "warn" },
				],
				rows: [
					{ label: "Data classification", values: [212, 41, 31], note: "Worst field" },
					{ label: "Access scope", values: [241, 26, 17] },
					{ label: "Annual spend", values: [245, 34, 5], note: "34 disagree with contract" },
					{ label: "Legal entity mapping", values: [259, 14, 11], note: "11 have no register record" },
				],
			},
		},
		{
			heading: "Target architecture",
			paragraphs: [
				"The target introduces exactly one new component: an evidence and gate record that owns the onboarding decision. It does not own the vendor, the contract, the remediation, or the policy — those stay where they are. It owns the tier, the required evidence set for that tier, the artifacts satisfying it, the accepting identity, and the immutable decision.",
				"Intake computes the tier from register fields and writes it to the gate record, where it becomes immutable. Security and Privacy attach evidence to the same record in parallel rather than in sequence. Procurement's signature step reads the gate record and cannot proceed while a required artifact is absent — this is the fail-closed point that does not exist today.",
				"Event delivery is one-way into the gate record and one-way out to the register. Every vendor carries a stable identifier minted at intake, which is what resolves the 11 unregistered vendors and the 23 unmatchable Jira issues. Reconciliation runs on a fifteen-minute cycle and raises an owned case on mismatch rather than surfacing the drift at audit.",
			],
			exhibit: {
				kind: "architecture",
				title: "Target state: one gate record makes signature impossible without evidence",
				caption: "The gate record is the only new component. Existing systems keep their authority; what changes is that the decision now has somewhere to live and something to enforce it.",
				source: "Target architecture · [SRC-047] · [INT-DANIEL-03] · Readiness v7",
				lanes: ["Intake", "Gate record", "Evidence owners", "Signature"],
				nodes: [
					{ id: "intake", label: "Intake + tiering", detail: "Tier computed, immutable", lane: 0, row: 0, tone: "brand" },
					{ id: "id", label: "Third-party ID", detail: "Minted once, stable", lane: 0, row: 1, tone: "brand" },
					{ id: "gate", label: "Gate + evidence record", detail: "Tier · artifacts · acceptor", lane: 1, row: 0, tone: "brand" },
					{ id: "recon", label: "Reconciliation", detail: "15-minute cycle, owned case", lane: 1, row: 1, tone: "muted" },
					{ id: "sec2", label: "Security evidence", detail: "Parallel, attaches artifact", lane: 2, row: 0, tone: "neutral" },
					{ id: "priv2", label: "Privacy evidence", detail: "Parallel, attaches terms", lane: 2, row: 1, tone: "neutral" },
					{ id: "sign2", label: "Procurement signature", detail: "Reads gate · fails closed", lane: 3, row: 0, tone: "brand" },
				],
				edges: [
					{ from: "intake", to: "gate", label: "tier" },
					{ from: "id", to: "gate", label: "key" },
					{ from: "gate", to: "sec2" },
					{ from: "gate", to: "priv2" },
					{ from: "sec2", to: "sign2", label: "evidence" },
					{ from: "priv2", to: "sign2", label: "evidence" },
					{ from: "gate", to: "recon", label: "state" },
				],
			},
		},
		{
			heading: "Gate behaviour under load and failure",
			paragraphs: [
				"The sequence below is the Tier 1 path, which is the one that has to be right. The critical property is that the signature step queries gate state rather than trusting a status flag, so a missing privacy artifact produces a refusal at the point of signature rather than a finding at audit.",
				"The failure mode that matters is the evidence service being unavailable when Procurement attempts to sign. The design fails closed: signature is refused and a reconciliation case is raised with a named owner. This is a deliberate operational cost, and it is the same trade-off the RAID register carries as R-02 — the control is correct, but somebody has to accept that a strategic deal can be blocked by an outage.",
			],
			exhibit: {
				kind: "sequence",
				title: "Signature queries gate state, so a missing artifact refuses the signature instead of producing an audit finding",
				caption: "Tier 1 onboarding path. Steps 5 and 6 are the fail-closed behaviour that does not exist in the current design; today the signature would simply proceed.",
				source: "Target event contract · [SRC-047] · REQ-09 · [INT-DANIEL-03]",
				actors: ["Sponsor", "Intake", "Gate record", "Evidence owners", "Procurement"],
				steps: [
					{ from: 0, to: 1, label: "Raise onboarding request" },
					{ from: 1, to: 2, label: "Compute tier · mint ID", note: "Data class + access + spend" },
					{ from: 2, to: 3, label: "Request required evidence set", note: "Security and Privacy in parallel" },
					{ from: 3, to: 2, label: "Attach artifacts" },
					{ from: 4, to: 2, label: "Query gate state before signature" },
					{ from: 2, to: 4, label: "Refuse — retention artifact absent", note: "Fails closed · raises exception case", tone: "warn" },
					{ from: 3, to: 2, label: "Attach retention terms" },
					{ from: 2, to: 4, label: "Release signature · record decision" },
				],
			},
		},
		{
			heading: "Platform readiness and build estimate",
			paragraphs: [
				"Each capability the target needs was assessed against the platform that would provide it. The scores below are readiness against the specific requirement, not general platform maturity: ServiceNow scores high on workflow and low on immutable evidence retention, which is precisely why the gate record is a separate object rather than a set of fields on the vendor.",
				"The build is 11 weeks at 2.5 FTE with no new licensing. The largest single line is not the gate record — it is the register remediation and identifier backfill, at roughly 3.5 of those weeks, and it is the item most likely to slip because it depends on sponsor responses rather than engineering throughput.",
			],
			exhibit: {
				kind: "heatmap",
				title: "Existing platforms cover the target design except for immutable evidence, which is the one thing being built",
				caption: "Readiness of each platform against the capability the target architecture requires (0 = absent, 100 = production-ready today). The dark column is why a separate gate record exists.",
				source: "Platform assessment · [SRC-014] · [SRC-047] · [INT-DANIEL-03]",
				columns: ["Workflow", "Identity", "Evidence store", "Immutability", "Reporting"],
				rows: [
					{ label: "ServiceNow", values: [92, 74, 46, 22, 68] },
					{ label: "SharePoint", values: [31, 58, 81, 34, 40] },
					{ label: "Jira", values: [64, 29, 37, 18, 55] },
					{ label: "Gate record (new)", values: [55, 88, 90, 95, 82] },
				],
				scale: ["Absent", "Production-ready"],
			},
		},
	],
	findings: [
		{ label: "Root cause", detail: "Gate state has no system of record. Approval exists as correspondence, so no component in the signature path is capable of refusing a signature — which is what makes the 32% bypass possible." },
		{ label: "Critical technical dependency", detail: "A stable third-party identifier minted at intake. Without it the register cannot be reconciled, the 11 orphan vendors stay invisible, and 23 Jira issues remain unmatchable." },
		{ label: "Highest-risk build item", detail: "Register remediation for the 48 incomplete records — 3.5 of the 11 weeks, and the only item gated by sponsor response rather than engineering capacity." },
	],
	nextSteps: [
		{ action: "Ratify the gate record as a separate object rather than register fields", owner: "Daniel Kim · Security Architect", due: "Week 1" },
		{ action: "Mint third-party identifiers and backfill the 284 register records", owner: "Platform engineering with Vendor Risk", due: "Weeks 1–3" },
		{ action: "Resolve the 48 records missing tiering inputs with sponsors", owner: "Jordan Lee · Procurement Director", due: "Week 3 · gates phase one" },
		{ action: "Run the outage simulation against the fail-closed signature path", owner: "Daniel Kim · Security Architect", due: "Week 8 · Gate B" },
	],
	citations: ["[SRC-014]", "[SRC-031]", "[SRC-047]", "[INT-DANIEL-03]", "Readiness v7"],
}

const TARGET_OPERATING_MODEL: DeliverableBody = {
	heading: "Intake determines the tier, the tier determines the diligence, and no role both requests and accepts residual risk.",
	lede: "The target model replaces a single undifferentiated process with three, sized to the risk they carry. Risk owns the gate. Security and Privacy own their evidence. Procurement owns the commercial close and intake quality. Residual acceptance is separated from residual creation at every tier — the boundary the current model lacks, and the reason exceptions accumulate rather than close.",
	metrics: [
		{ value: "3", label: "Risk tiers replacing one path", note: "38 Tier 1 · 96 Tier 2 · 150 Tier 3" },
		{ value: "82%", label: "Vendors on the light path", note: "Tier 2 and 3 · 8-day target" },
		{ value: "6–9", label: "Executive decisions per year", note: "Down from 57 exceptions" },
		{ value: "0", label: "Roles that request and accept", note: "Separation enforced at acceptance" },
	],
	keyMessages: [
		{ label: "Depth of diligence follows data, access, and spend", detail: "Tiering uses three inputs available at intake and no judgment. 150 of 284 vendors qualify for the light path, which is where the cycle-time gain actually comes from — the heavy path barely moves." },
		{ label: "Accountability is singular at every gate", detail: "One accountable owner per gate, named. Security and Privacy are consulted and provide evidence; they do not hold the gate, which is why their reviews can run in parallel without creating a deadlock." },
		{ label: "Escalation is bounded by design, not by discipline", detail: "Only Tier 1 residual acceptance and policy exceptions leave the operating layer. The boundary is enforced by the gate record, so it cannot erode quietly the way an unwritten convention does." },
	],
	sections: [
		{
			heading: "The tiering rule",
			paragraphs: [
				"A vendor's tier is computed at intake from three inputs: the classification of data it will process, the scope of system access it requires, and annual contracted spend. Any single input at the highest level sets Tier 1; two at the middle level set Tier 2; everything else is Tier 3. The rule is deliberately mechanical — a tier that requires judgment at intake reintroduces the queue the redesign removes.",
				"Applied to the 284-record register, the rule produces 38 Tier 1 vendors, 96 Tier 2, and 150 Tier 3. That distribution is the economic case for the model: 82% of vendors move to a path with an eight-day target and no scheduled security review, releasing the review capacity that Tier 1 vendors currently compete for.",
				"The tier is immutable after gate entry. A vendor whose scope expands mid-process does not get re-tiered quietly; it exits and re-enters, which produces a visible event rather than a silent widening of access. This is the specific failure the reconciliation found in 7 of the 68 historical decisions.",
			],
			exhibit: {
				kind: "table",
				title: "Three tiers, three evidence standards, three named acceptors",
				caption: "The tiering rule applied to the register. Evidence requirements and acceptance authority are fixed per tier; nothing in the path is discretionary except the Tier 1 executive judgment.",
				source: "Target operating model · [SRC-014] · [SRC-031] · [INT-MAYA-08]",
				columns: ["Tier", "Vendors", "Trigger", "Required evidence", "Residual acceptance", "Target cycle"],
				rows: [
					{ cells: ["Tier 1", "38", "Restricted data, privileged access, or >$1m", "Full security assessment, privacy terms, retention artifact, continuity plan", "Executive committee", "18 days"], emphasis: true },
					{ cells: ["Tier 2", "96", "Confidential data or two mid-level inputs", "Security questionnaire, standard privacy terms, control attestation", "Risk and Security jointly", "12 days"] },
					{ cells: ["Tier 3", "150", "No regulated data, no system access", "Standard terms, self-attestation, annual re-check", "Vendor Risk Lead alone", "8 days"] },
				],
			},
		},
		{
			heading: "Decision rights",
			paragraphs: [
				"Decision rights are stated as acceptance authority, not as review participation, because the failure in the current model is not who looks at a vendor — it is who can say yes. Tier 3 residual risk is accepted by the Vendor Risk Lead alone. Tier 2 requires the Vendor Risk Lead and the Security Architect jointly. Tier 1 residual acceptance reaches the executive committee and only there.",
				"The separation rule sits above the tiering rule: the identity that requests an exception may not be the identity that accepts it, at any tier, including during manual fallback. In the current model this rule is stated in policy and unenforceable in practice; in the target it is a property of the gate record, which refuses an acceptance signed by the requesting identity.",
				"Procurement's role changes least in description and most in effect. It still owns commercial close, but it now signs from the evidence record. That single change converts Procurement from the last line of defence — a role it was never resourced for — into a consumer of a decision that has already been made.",
			],
			exhibit: {
				kind: "table",
				title: "Every gate has one accountable owner; consultation never blocks",
				caption: "Accountability matrix for the four gates. A = accountable and holds the gate, R = responsible for producing evidence, C = consulted, I = informed. Only one A appears per row, which is what allows parallel review.",
				source: "Target operating model · [INT-MAYA-08] · [INT-JORDAN-04] · [INT-PRIYA-06]",
				columns: ["Gate", "Vendor Risk", "Security", "Privacy", "Procurement", "Executive"],
				rows: [
					{ cells: ["Intake and tiering", "A", "I", "I", "R", "—"] },
					{ cells: ["Security evidence", "C", "A", "I", "I", "—"] },
					{ cells: ["Privacy and data terms", "C", "I", "A", "I", "—"] },
					{ cells: ["Residual acceptance · Tier 1", "R", "C", "C", "I", "A"], emphasis: true },
					{ cells: ["Commercial close", "I", "I", "I", "A", "—"] },
				],
			},
		},
		{
			heading: "Handoffs and the shared evidence record",
			paragraphs: [
				"The four serial reviews become parallel checks against one shared evidence record. Each owner attaches artifacts rather than producing an opinion, and the gate evaluates completeness rather than sentiment. This is what removes the 61% duplication: a security assessment attached once is visible to Privacy without being re-requested.",
				"Procurement signs from that record rather than from an approval thread, so the audit trail is a by-product of the process instead of a reconstruction after the fact. Every gate decision writes an immutable entry linking the tier, the artifacts, the accepting role, and the timestamp.",
				"Exceptions are time-bound and owned. An exception without an expiry date is not a control decision, it is a deferral, and 34 of last year's 57 exceptions had no expiry at all. The target model refuses to record one.",
			],
			bullets: [
				{ label: "Evidence is attached, not asserted", detail: "Reviewers contribute artifacts to a shared record. No owner can satisfy another owner's control point." },
				{ label: "Exceptions carry an owner and an expiry", detail: "The gate refuses an exception without both. 34 of 57 exceptions last year had neither." },
				{ label: "Re-entry, not re-tiering", detail: "Scope expansion after gate entry forces exit and re-entry, producing a visible event." },
			],
		},
		{
			heading: "Where the operating gain actually comes from",
			paragraphs: [
				"It is worth being precise about this, because the temptation will be to claim the redesign makes everything faster. It does not. Tier 1 vendors move from 48 days to 18 — a real gain, but driven mostly by parallel review rather than by reduced scrutiny, and the security assessment is unchanged in depth.",
				"The larger effect is compositional. Because 150 vendors leave the heavy path entirely, the queue that Tier 1 vendors sit in shortens by roughly 60%, and the review capacity released is what makes the parallel design feasible without added headcount. The model is sensitive to that assumption, which is why A-03 in the RAID register carries it explicitly.",
			],
		},
	],
	findings: [
		{ label: "Accountable owner", detail: "Vendor Risk Lead owns the gate and its exception log; Procurement owns cycle time and intake quality. Neither owns both, which is the separation the current model lacks." },
		{ label: "Escalation boundary", detail: "Only Tier 1 residual acceptance and policy exceptions leave the operating layer. Everything else is closed by the named owner at the tier." },
		{ label: "Load-bearing assumption", detail: "Security capacity holds at current levels once 150 vendors leave the heavy path. If it does not, the parallel design degrades to today's timing rather than failing." },
	],
	nextSteps: [
		{ action: "Ratify tiering thresholds for data class, access scope, and spend", owner: "Maya Rao · Vendor Risk Lead", due: "Week 1" },
		{ action: "Publish the acceptance matrix and revoke informal approval routes", owner: "Maya Rao with Jordan Lee", due: "Week 2" },
		{ action: "Re-tier the full 284-record register under the ratified rule", owner: "Vendor Risk operations", due: "Week 3" },
		{ action: "Confirm the released Security capacity assumption against Q4 volume", owner: "Daniel Kim · Security Architect", due: "Week 4 · Gate A" },
	],
	citations: ["[SRC-014]", "[SRC-031]", "[INT-JORDAN-04]", "[INT-MAYA-08]", "Readiness v7"],
}

const REQUIREMENTS: DeliverableBody = {
	heading: "Eighteen requirements, each naming its control, its system of record, and the test that proves it in production.",
	lede: "Requirements are written to be testable rather than agreeable. Each names the control it satisfies, the system that holds the evidence, and the production test that demonstrates it — including the replay test that proves the design would have blocked all 22 historical bypasses. Four use cases carry the functional behaviour, every alternate flow is one the evidence shows actually occurring, and each of the eighteen requirements traces back to a gap in the process analysis.",
	metrics: [
		{ value: "18", label: "Testable requirements", note: "6 load-bearing for audit" },
		{ value: "22", label: "Historical bypasses in the replay", note: "All must fail closed" },
		{ value: "4", label: "Separate control points", note: "No shared acceptor" },
		{ value: "100%", label: "Gate decisions writing evidence", note: "Immutable, replayable" },
	],
	keyMessages: [
		{ label: "Every requirement has a falsifiable test", detail: "A requirement that cannot fail in production is a statement of intent. Each of the 18 names the observable condition that proves or disproves it, and six are proven by replaying historical decisions rather than by inspection." },
		{ label: "Control points cannot share an acceptor", detail: "Tiering, security evidence, privacy terms, and residual acceptance are four separate control points with four separate owners. No single identity can satisfy two, including under manual fallback." },
		{ label: "Evidence lineage is immutable and versioned", detail: "Gate decisions link tier, artifacts, accepting identity, and timestamp. Records referencing a superseded policy version are flagged rather than silently re-pointed — the failure that made 9 historical decisions unauditable." },
	],
	sections: [
		{
			heading: "Control points and separation",
			paragraphs: [
				"Tiering is computed at intake from data class, access scope, and spend, and is immutable after gate entry. Security evidence, privacy terms, and residual acceptance are separate control points with separate owners; none can be satisfied by the same actor. The separation is enforced by the gate record rather than by policy language, which is the difference between a control and an expectation.",
				"The manual fallback path is where separation usually breaks, and it is specified explicitly rather than left to operational judgment. If the evidence service is unavailable, signature is refused. There is no same-role fallback, no provisional signature, and no retrospective attachment of evidence to a decision already made.",
			],
			exhibit: {
				kind: "table",
				title: "Six load-bearing requirements, each with the test that proves it in production",
				caption: "Extract from the 18-requirement set. REQ-09 is the highest-risk requirement because it is the one the business will most often ask to relax under commercial pressure.",
				source: "Requirements register · [SRC-014] · [SRC-088] · Readiness v7",
				columns: ["ID", "Requirement", "Control", "System of record", "Production test"],
				rows: [
					{ cells: ["REQ-03", "Tier computed at intake and immutable after gate entry", "Risk segmentation", "Gate record", "Attempt tier change post-entry; must be refused and force re-entry"] },
					{ cells: ["REQ-06", "Security evidence attached before residual acceptance", "Evidence sufficiency", "Gate record", "Accept residual with no security artifact; must fail closed"] },
					{ cells: ["REQ-09", "Tier 1 cannot reach signature without a retention artifact or a time-bound exception", "Privacy and data use", "Gate record", "Replay 68 approvals; all 22 open-review signatures must fail"], emphasis: true },
					{ cells: ["REQ-11", "Requesting identity may not accept residual risk", "Separation of duties", "Identity + gate record", "Sign acceptance as requester; must be refused including in fallback"] },
					{ cells: ["REQ-14", "Every exception carries a named owner and an expiry", "Exception handling", "Exception log", "Create exception without expiry; must be refused"] },
					{ cells: ["REQ-17", "Decisions referencing a superseded policy version are flagged", "Evidence lineage", "Policy library + gate record", "Supersede a policy; prior decisions must flag, not silently re-point"] },
				],
			},
		},
		{
			heading: "Use cases and acceptance criteria",
			paragraphs: [
				"Requirements are grounded in four primary use cases drawn from the observed process rather than from an idealised one. Each carries a trigger, an actor, a main flow, the alternate flows that actually occur, and acceptance criteria written so a tester can pass or fail them without interpretation.",
				"The alternate flows are where the value is. UC-01's alternate flow — the sponsor cannot supply a data classification at intake — occurs in 17% of requests today and is the single most common cause of triage rework. Specifying it as a first-class flow rather than an error condition is what stops it becoming an override.",
			],
			exhibit: {
				kind: "table",
				title: "Four use cases, and every alternate flow is one the evidence shows actually happening",
				caption: "Primary use cases with acceptance criteria in given/when/then form. Alternate-flow frequencies are measured from the 68 approval decisions and the 284-record register.",
				source: "Use-case model traced to [SRC-088] and [SRC-031] · validated [INT-JORDAN-04]",
				columns: ["ID", "Use case", "Actor", "Alternate flow observed", "Acceptance criterion"],
				rows: [
					{ cells: ["UC-01", "Raise and tier an onboarding request", "Business sponsor", "No data classification available · 17% of requests", "Given a request missing a tiering input, when it is submitted, then it is held at intake with the missing field named — never defaulted"], emphasis: true },
					{ cells: ["UC-02", "Attach evidence against a declared set", "Security or Privacy owner", "Artifact supersedes an earlier version · 9%", "Given a superseded artifact, when it is attached, then the prior version remains readable and the decision is re-evaluated"] },
					{ cells: ["UC-03", "Accept residual risk at a tier", "Named acceptor by tier", "Acceptor is also the requester · 4%", "Given the acceptor identity equals the requester, when acceptance is attempted, then it is refused in every path including fallback"] },
					{ cells: ["UC-04", "Sign the contract from the evidence record", "Procurement", "Required artifact absent · 32% historically", "Given an incomplete evidence set, when signature is attempted, then it is refused and the missing artifact is named"] },
				],
			},
		},
		{
			heading: "Evidence lineage",
			paragraphs: [
				"Every gate decision writes an immutable record linking the tier, the evidence artifacts, the accepting role, and the timestamp. The record is append-only; a correction produces a new decision that supersedes the old one, and both remain readable.",
				"Policy versioning is handled explicitly because it is the failure that made 9 historical decisions unauditable. When a policy is superseded, decisions referencing the prior version are flagged for review rather than silently re-pointed to the new one. Silent re-pointing produces an audit trail that appears complete and is not, which is worse than an obvious gap.",
				"The replay test is the proof point that matters to the audit committee. Running all 68 historical contract approvals through the target gate must produce 22 refusals, and each refusal must name the specific missing artifact. Anything less means the design permits the exposure it was built to close.",
			],
		},
		{
			heading: "Coverage against the tiering model",
			paragraphs: [
				"Not every control applies at every tier, and pretending otherwise is how control frameworks become theatre. The coverage map below states which control points are mandatory, conditional, or absent per tier, so that a Tier 3 vendor is not held to a Tier 1 standard and a Tier 1 vendor cannot quietly be treated as Tier 2.",
				"Two cells are worth attention. Continuity evidence is mandatory only at Tier 1, which is defensible given the access profile. Retention artifacts are mandatory at Tier 1 and conditional at Tier 2 — conditional on the vendor processing personal data at all — and the condition is evaluated from register fields rather than from reviewer judgment.",
			],
			exhibit: {
				kind: "heatmap",
				title: "Control depth tracks tier, so Tier 3 vendors are not held to a Tier 1 standard",
				caption: "Required control strength by tier (0 = not applicable, 100 = mandatory with evidence artifact). Conditional controls evaluate from register fields, never from reviewer discretion.",
				source: "Requirements register mapped to [SRC-014] policy library",
				columns: ["Tier 1", "Tier 2", "Tier 3"],
				rows: [
					{ label: "Security assessment", values: [100, 65, 20] },
					{ label: "Privacy terms", values: [100, 100, 45] },
					{ label: "Retention artifact", values: [100, 55, 0] },
					{ label: "Continuity evidence", values: [100, 25, 0] },
					{ label: "Annual re-attestation", values: [100, 100, 60] },
				],
				scale: ["Not applicable", "Mandatory with artifact"],
			},
		},
	],
	findings: [
		{ label: "Highest-risk requirement", detail: "REQ-09: a Tier 1 vendor cannot reach contract signature without a privacy retention artifact or an explicit, time-bound exception." },
		{ label: "Test that proves it", detail: "Replay the 68 historical contract approvals through the new gate; every one of the 22 that signed with an open review must fail closed and name the missing artifact." },
		{ label: "Requirement most likely to be challenged", detail: "REQ-11 under manual fallback. The operational pressure to allow a same-role signature during an outage is exactly the pressure that produced the current exposure." },
	],
	nextSteps: [
		{ action: "Baseline all 18 requirements with Security, Privacy, and Procurement", owner: "Daniel Kim with Priya Shah", due: "Week 2" },
		{ action: "Build the 68-decision replay harness as the acceptance test", owner: "Platform engineering", due: "Week 5" },
		{ action: "Specify manual fallback behaviour and confirm no same-role path", owner: "Daniel Kim · Security Architect", due: "Week 6" },
		{ action: "Flag the 9 decisions referencing superseded policy versions", owner: "Vendor Risk operations", due: "Week 7" },
	],
	citations: ["[SRC-014]", "[SRC-088]", "[INT-DANIEL-03]", "[INT-PRIYA-06]", "Readiness v7"],
}

const RAID_REGISTER: DeliverableBody = {
	heading: "Twenty-two open items. Two need you; the other twenty are owned, dated, and closing inside the operating layer.",
	lede: "Nine risks, four assumptions, three issues, and six decisions carry a named owner and a response date. The register is scored on impact against likelihood using the same scale the programme will use after launch, so the first governance meeting inherits a live instrument rather than a snapshot. Two items sit at executive level and both are decisions rather than risks — which is the correct shape.",
	metrics: [
		{ value: "22", label: "Open items with owner and date", note: "9 risks · 4 assumptions · 3 issues · 6 decisions" },
		{ value: "2", label: "Items at executive level", note: "R-02 and D-05" },
		{ value: "1", label: "Risks rated high and likely", note: "R-02 · retention gate" },
		{ value: "15 days", label: "Assumed exception window", note: "D-05 unresolved · roadmap assumes 15" },
	],
	keyMessages: [
		{ label: "The register is scored, not listed", detail: "Every risk carries an impact and likelihood score on a published scale, so the programme can show movement rather than restating the same list at each governance meeting." },
		{ label: "Two executive items, both decisions", detail: "R-02 and D-05 are the only items above the operating layer. Both are choices rather than uncertainties, which means they can be closed on a date rather than monitored indefinitely." },
		{ label: "Assumptions are under test, not asserted", detail: "Each of the four assumptions names the evidence that would falsify it and the checkpoint at which that evidence arrives. A-03 in particular carries the whole capacity case for parallel review." },
	],
	sections: [
		{
			heading: "Risk profile",
			paragraphs: [
				"Nine risks are scored on impact against likelihood. One sits in the act-now quadrant: R-02, the possibility that strategic vendors continue to onboard on provisional evidence while retention review completes. It is rated high impact and likely because the pressure that produced the current 32% bypass does not disappear when the gate is rebuilt — it relocates to the exception path unless D-05 fixes the window.",
				"Three risks sit in the monitor quadrant and are genuinely lower priority: they are real, but their impact is contained and the programme has time to observe them. The remaining five are plan-and-mitigate items already reflected in the roadmap sequence.",
				"The one risk deliberately not mitigated is R-06, the temporary rise in intake friction during phase one. Mitigating it would mean softening the tiering rule at exactly the moment it needs to bite. It is accepted, communicated, and time-boxed to three weeks instead.",
			],
			exhibit: {
				kind: "quadrant",
				title: "One risk requires action now; the rest are contained by the roadmap sequence",
				caption: "Nine risks scored on impact against likelihood. R-02 is the only item in the act-now quadrant and is the reason D-05 must close before phase two.",
				source: "RAID register · [SRC-031] · [CASE-003] · Readiness v7",
				xAxis: ["Unlikely", "Likely"],
				yAxis: ["Contained impact", "Severe impact"],
				points: [
					{ label: "R-02 retention gate", x: 78, y: 88, emphasis: true },
					{ label: "R-04 capacity", x: 54, y: 66 },
					{ label: "R-01 data quality", x: 71, y: 44 },
					{ label: "R-06 intake friction", x: 82, y: 26 },
					{ label: "R-03 tool adoption", x: 46, y: 38 },
					{ label: "R-05 policy drift", x: 33, y: 58 },
					{ label: "R-07 orphan vendors", x: 29, y: 71 },
					{ label: "R-08 SLA reporting", x: 24, y: 22 },
					{ label: "R-09 training gap", x: 47, y: 13 },
				],
			},
		},
		{
			heading: "Open at executive level",
			paragraphs: [
				"R-02 — strategic vendors may still onboard on provisional evidence while retention review completes. This is the residue of the exception the Discovery escalated, and it is unresolved by design: the trade-off between a known control gap and a commercial commitment is not delegable.",
				"D-05 — whether the exception window is 15 or 30 days remains undecided, and the roadmap assumes 15. This matters more than it sounds. An exception window is the effective control standard, because it defines how long a vendor can operate without complete evidence. If D-05 is not closed before phase two, the first exception will set the precedent and the answer will be whatever that vendor needed.",
			],
		},
		{
			heading: "Assumptions under test",
			paragraphs: [
				"A-01 assumes the third-party register is the authoritative vendor list. 284 records were reconciled and 11 were found only in contract approvals, so the assumption is already known to be imperfect; what it now asserts is that the reconciled register is authoritative going forward, which the identifier work in phase one is what makes true.",
				"A-03 assumes Security capacity supports parallel review at current volume once 150 vendors move to the light path. This is the load-bearing assumption for the entire cycle-time case. It is tested at Gate A in week 3, against real Q4 intake rather than modelled volume, and the roadmap has an explicit fallback if it fails: Tier 2 security review returns to a scheduled queue and the target cycle rises from 18 days to 24.",
			],
			exhibit: {
				kind: "table",
				title: "Every open item has an owner, a date, and a defined closing condition",
				caption: "Top eight items by severity from the 22-item register. Items are closed by evidence, not by review meeting — the closing condition is stated for each.",
				source: "RAID register · Readiness v7 · [SRC-031] · [SRC-088]",
				columns: ["ID", "Type", "Item", "Owner", "Closes when", "Due"],
				rows: [
					{ cells: ["R-02", "Risk", "Provisional onboarding while retention review completes", "Executive committee", "D-05 fixes the exception window and the gate enforces it", "Phase two"], emphasis: true },
					{ cells: ["D-05", "Decision", "Exception window: 15 or 30 days", "Maya Rao", "Window ratified and encoded in the gate record", "Week 4"], emphasis: true },
					{ cells: ["A-03", "Assumption", "Security capacity supports parallel review", "Daniel Kim", "Gate A shows 10 vendors tiered with no manual override", "Week 3"] },
					{ cells: ["R-04", "Risk", "Review capacity falls before the light path lands", "Daniel Kim", "Q4 intake measured against released capacity", "Week 6"] },
					{ cells: ["R-01", "Risk", "48 register records cannot be tiered", "Jordan Lee", "All 48 resolved or explicitly exempted", "Week 3"] },
					{ cells: ["A-01", "Assumption", "Reconciled register is the authoritative vendor list", "Vendor Risk ops", "Identifiers minted and 11 orphans entered", "Week 2"] },
					{ cells: ["I-02", "Issue", "9 decisions reference superseded policy versions", "Priya Shah", "All 9 flagged and re-reviewed under current policy", "Week 7"] },
					{ cells: ["R-07", "Risk", "New orphan vendors created during transition", "Jordan Lee", "Contract signature blocked without a register key", "Week 5"] },
				],
			},
		},
	],
	findings: [
		{ label: "Highest-rated risk", detail: "R-02, rated high impact and likely: without a hard retention gate, the audit trail breaks exactly where it is most often examined." },
		{ label: "Decision awaiting a date", detail: "D-05 must close before phase two, or the exception window becomes whatever the first exception sets." },
		{ label: "Assumption carrying the most weight", detail: "A-03. The entire 18-day target rests on released Security capacity, and it is tested against real intake at Gate A rather than assumed through launch." },
	],
	nextSteps: [
		{ action: "Close D-05 and encode the ratified exception window", owner: "Maya Rao · Vendor Risk Lead", due: "Week 4" },
		{ action: "Test A-03 against Q4 intake at Gate A", owner: "Daniel Kim · Security Architect", due: "Week 3" },
		{ action: "Resolve or exempt the 48 untierable register records", owner: "Jordan Lee · Procurement Director", due: "Week 3" },
		{ action: "Stand up monthly register review with movement, not restatement", owner: "Programme governance", due: "Week 5" },
	],
	citations: ["[SRC-031]", "[SRC-088]", "[CASE-003]", "[CASE-007]", "Readiness v7"],
}

const ROADMAP: DeliverableBody = {
	heading: "Eleven weeks in three phases. The gate is real for new vendors in three weeks; automation waits until the manual path is proven.",
	lede: "Phase one makes the gate real for new vendors, phase two migrates the in-flight backlog, and phase three automates SLA and exception reporting once the manual path has been proven under load. The sequence is driven by dependency rather than by convenience: register reconciliation gates tiering, tiering gates parallel review, and parallel review gates everything else.",
	metrics: [
		{ value: "11 weeks", label: "To full target state", note: "Three phases, three gates" },
		{ value: "3 weeks", label: "Until the gate is real", note: "New vendors only" },
		{ value: "126", label: "Backlog issues migrated", note: "41 onboarding items in phase two" },
		{ value: "Week 8", label: "First measurable proof", note: "Median cycle against 34-day baseline" },
	],
	keyMessages: [
		{ label: "Reconciliation is on the critical path, not beside it", detail: "Tiering at intake cannot switch on until the 48 incomplete records are resolved and identifiers are minted. Treating that as parallel work is the most likely way this plan slips." },
		{ label: "Automation is deliberately last", detail: "SLA instrumentation and the exception dashboard are phase three. Automating a process before its manual form is proven is how the current serial sequence became load-bearing in the first place." },
		{ label: "Each gate is a measurement, not a meeting", detail: "Gate A, B, and C each have a numeric condition drawn from production behaviour. A gate that can be passed by presentation is not a gate." },
	],
	sections: [
		{
			heading: "Sequence",
			paragraphs: [
				"Weeks 1–3 deliver tiering at intake and the shared evidence record, applied to new vendors only. This is the smallest change that makes the gate real, and restricting it to new intake avoids the migration problem while the design is still being proven.",
				"Weeks 4–8 bring parallel Security and Privacy review with the residual-acceptance boundary enforced, and migrate the 41 onboarding items in the existing backlog. This is the phase where cycle time actually moves and where the capacity assumption is tested against real volume.",
				"Weeks 9–11 deliver SLA instrumentation and the exception dashboard. By this point the manual path has run for eight weeks, so the automation encodes an observed process rather than an intended one.",
			],
			exhibit: {
				kind: "timeline",
				title: "Register reconciliation gates everything; automation deliberately comes last",
				caption: "Eleven-week plan with three measured gates. Bars in the darker tone are on the critical path — a slip there moves every downstream phase one for one.",
				source: "Implementation roadmap · Readiness v7 · [INT-JORDAN-04]",
				ticks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11"],
				lanes: [
					{ label: "Data remediation", bars: [{ label: "Identifiers + 48 records", start: 0, span: 3, tone: "brand" }] },
					{ label: "Gate record", bars: [{ label: "Build and tiering at intake", start: 0.5, span: 2.5, tone: "brand" }, { label: "Fail-closed signature", start: 3, span: 2, tone: "muted" }] },
					{ label: "Parallel review", bars: [{ label: "Security and Privacy in parallel", start: 3, span: 5, tone: "brand" }] },
					{ label: "Backlog migration", bars: [{ label: "41 onboarding items", start: 4, span: 4, tone: "muted" }] },
					{ label: "Automation", bars: [{ label: "SLA + exception dashboard", start: 8, span: 3, tone: "muted" }] },
				],
				markers: [
					{ label: "Gate A", at: 3 },
					{ label: "Gate B", at: 8 },
					{ label: "Gate C", at: 11 },
				],
			},
		},
		{
			heading: "Checkpoints",
			paragraphs: [
				"Gate A at week 3 requires ten vendors tiered without a manual override. The condition tests the tiering rule against reality: if intake staff are overriding the computed tier, the rule is wrong or the data is, and both are cheaper to fix at week 3 than at week 9.",
				"Gate B at week 8 requires zero contract signatures with an open review, measured over the preceding four weeks. This is the audit position, and it is the gate that determines whether the programme has achieved anything at all.",
				"Gate C at week 11 requires exception ageing to be visible to the committee without a report request. A control programme whose reporting depends on someone asking is a programme that stops being reported.",
			],
		},
		{
			heading: "Trajectory and the first honest measurement",
			paragraphs: [
				"Cycle time gets worse before it improves, and the plan says so in advance. Tiering at intake adds friction in weeks 1–3 while sponsors learn what the three inputs mean; the modelled median rises to 37 days before falling. Reporting that rise as a failure would be the fastest way to lose the programme, so it is forecast here explicitly.",
				"The first honest measurement is at week 8: median time from intake to gate decision, measured against the 34-day baseline and the 126-issue backlog. By week 11 the target is 18 days, with Tier 3 vendors at 8. The band on the chart is the target, not a forecast — the programme is judged against it rather than against its own projection.",
			],
			exhibit: {
				kind: "line",
				title: "Cycle time rises for three weeks before it falls — forecast now, so it is not reported as failure later",
				caption: "Modelled median intake-to-decision by week against the 18-day target band. The week 1–3 rise is the tiering learning curve and is expected; the week 8 reading is the first measurement the programme is held to.",
				source: "Modelled from [SRC-088] replay · baseline 34 days · Readiness v7",
				unit: "days",
				ticks: ["W0", "W2", "W3", "W5", "W6", "W8", "W9", "W11"],
				series: [
					{ label: "Modelled median cycle", points: [34, 37, 36, 31, 27, 23, 20, 18], tone: "brand" },
					{ label: "Tier 3 light path", points: [34, 30, 24, 17, 13, 10, 9, 8], tone: "muted", dashed: true },
				],
				band: { label: "18-day target", value: 18 },
			},
		},
	],
	findings: [
		{ label: "Critical path", detail: "Register reconciliation, then tiering at intake. Everything downstream depends on it and it is the only item gated by sponsor response rather than engineering capacity." },
		{ label: "First measurable proof", detail: "Median time from intake to gate decision, measured at week 8 against the 34-day baseline and the 126-issue backlog." },
		{ label: "Planned deterioration", detail: "The median rises to 37 days in weeks 1–3 as tiering beds in. It is forecast deliberately so it is read as the learning curve it is." },
	],
	nextSteps: [
		{ action: "Confirm the 11-week plan and the 2.5 FTE engineering allocation", owner: "Transformation lead", due: "Executive review · 18 Sep" },
		{ action: "Set the Gate A measurement: 10 vendors tiered, zero overrides", owner: "Maya Rao · Vendor Risk Lead", due: "Week 3" },
		{ action: "Publish the expected week 1–3 cycle-time rise to sponsors", owner: "Jordan Lee · Procurement Director", due: "Week 1" },
		{ action: "Agree the A-03 fallback: Tier 2 returns to scheduled review, target moves to 24 days", owner: "Daniel Kim with Maya Rao", due: "Week 4" },
	],
	citations: ["[SRC-031]", "[SRC-088]", "[INT-JORDAN-04]", "[CASE-007]", "Readiness v7"],
}

const BUSINESS_CASE: DeliverableBody = {
	heading: "A $412k programme returning $531k a year — and the benefit that justifies it is the audit position, not the cycle time.",
	lede: "The investment is small, the payback is under a year, and the quantified benefits are real but not what makes the case. Released review capacity, removed exception handling, and faster vendor value realisation total $531k a year against a $412k one-off and $48k of annual run cost. The finding that actually justifies proceeding is the 32% of contracts signed with an open review, whose cost is a contingent audit exposure rather than a line in a benefits table.",
	metrics: [
		{ value: "$412k", label: "One-off investment", note: "Plus $48k annual run cost" },
		{ value: "$531k", label: "Annual gross benefit", note: "Year 1 run rate from month 4" },
		{ value: "11 months", label: "Payback period", note: "3-year NPV $786k at 10%" },
		{ value: "2.4 : 1", label: "Benefit-cost ratio", note: "Excludes contingent audit exposure" },
	],
	keyMessages: [
		{ label: "The quantified case stands on its own", detail: "Even excluding every risk-weighted benefit, released capacity and removed exception handling alone return $303k a year against a $412k investment — a 16-month payback with no contingent assumptions in it." },
		{ label: "The strategic case is the audit position", detail: "Nineteen contracts were signed against reviews that never closed. That is not a cost until it is examined, at which point it is a remediation programme rather than a finding. The business case values it at a risk-weighted $136k a year and the executive brief argues it should be read as unbounded." },
		{ label: "Option B is the only option that is both cheapest to reverse and best scoring", detail: "On the weighted appraisal it scores 4.10 against 2.90 for enforcement-only and 2.35 for automate-first, and it is the only option whose first phase can be stopped at week 3 without stranding the spend." },
	],
	sections: [
		{
			heading: "Objectives and success measures",
			paragraphs: [
				"The business objective is a defensible vendor onboarding process, expressed as three measurable outcomes rather than as a description of a target process. Each has a baseline drawn from the evidence base and a date by which it is judged.",
				"Stating them this way matters because the programme will be tempted mid-flight to optimise for cycle time, which is the visible measure. The primary success measure is deliberately the audit one, so that a faster process which still permits bypass would be recorded as a failure.",
			],
			bullets: [
				{ label: "Zero signatures with an open review", detail: "Baseline 22 of 68 (32%). Measured over a rolling four weeks from week 8. This is the primary measure." },
				{ label: "Median intake to gate decision at 18 days", detail: "Baseline 34 days; Tier 3 at 8 days. Measured at week 11 against the 126-issue backlog." },
				{ label: "Executive exceptions below 10 a year", detail: "Baseline 57. Measured on a rolling twelve months from launch, with the acceptance boundary as the mechanism." },
			],
		},
		{
			heading: "Options appraisal",
			paragraphs: [
				"Four options were considered and three carried forward. The rejected fourth — outsourcing third-party diligence to a managed service — was excluded early because it moves the evidence outside the audit boundary without removing the dual-authorship problem in the approval path.",
				"The three remaining options were scored against five weighted criteria agreed with the Vendor Risk Lead and the Procurement Director before scoring began, so the weights were not fitted to a preferred answer. Audit position carries the largest weight at 35% because it is the exposure the Discovery actually found.",
				"Option B wins on the weighted score and would still win if audit position were weighted at zero, because it is the only option that improves cycle time without adding tooling cost. That insensitivity is worth stating: the recommendation does not depend on the weighting being right.",
			],
			exhibit: {
				kind: "table",
				title: "Option B scores 4.10 and would still win with the audit criterion removed entirely",
				caption: "Weighted appraisal against criteria agreed before scoring. Scores are 1–5; weights sum to 100%. The result is insensitive to the audit weighting, which is the criterion most open to challenge.",
				source: "Options appraisal · [SRC-088] · [INT-MAYA-08] · [INT-JORDAN-04]",
				columns: ["Criterion", "Weight", "A · Enforce today", "B · Risk-tiered gate", "C · Automate first"],
				rows: [
					{ cells: ["Audit position", "35%", "3", "5", "2"] },
					{ cells: ["Cycle time", "20%", "1", "5", "3"] },
					{ cells: ["Cost to implement", "15%", "5", "3", "2"] },
					{ cells: ["Change load on the business", "15%", "2", "3", "3"] },
					{ cells: ["Reversibility", "15%", "4", "3", "2"] },
					{ cells: ["Weighted score", "100%", "2.90", "4.10", "2.35"], emphasis: true },
				],
			},
		},
		{
			heading: "Costs and benefits",
			paragraphs: [
				"The $412k is a bottom-up estimate at loaded internal cost with no new licensing. Engineering is 2.5 FTE over 11 weeks; the register remediation is the second largest line and the one most likely to overrun, because it depends on sponsor responses rather than on engineering throughput.",
				"Benefits are stated at year-one run rate reached from month four, not at day one. Released review capacity is the largest single line and the most defensible: 1,240 review hours a year are recovered when 150 Tier 3 vendors stop consuming a scheduled security review, valued at the internal loaded rate.",
				"Two benefits are deliberately conservative. Faster value realisation counts only the 11 strategic vendors currently in flight rather than an annualised run rate, and avoided audit remediation is risk-weighted at 40% against the cost of the last comparable remediation programme.",
			],
			exhibit: {
				kind: "bar",
				title: "Released review capacity is the largest and most defensible benefit line",
				caption: "Annual gross benefit by source at year-one run rate. The two shaded lines are directly measurable from timesheet and register data; the others carry a stated risk weighting.",
				source: "Benefits model · [SRC-031] · [SRC-088] · loaded internal rate $92/hour",
				unit: "$k",
				data: [
					{ label: "Released review capacity", value: 214, note: "1,240 hours · 150 Tier 3 vendors", emphasis: true },
					{ label: "Avoided audit remediation", value: 136, note: "Risk-weighted at 40%" },
					{ label: "Exception handling removed", value: 89, note: "48 fewer exceptions × 6 hours", emphasis: true },
					{ label: "Faster vendor value realisation", value: 92, note: "11 in-flight vendors only" },
				],
			},
		},
		{
			heading: "Investment profile and payback",
			paragraphs: [
				"Cash-out is front-loaded across the eleven weeks and benefits begin at month four, once tiering is live and the light path is carrying real volume. Cumulative net benefit crosses zero at month eleven.",
				"The profile matters more than the headline ratio, because the programme has a natural stopping point. If Gate A fails at week 3 — ten vendors cannot be tiered without manual override — roughly $180k has been spent and the register remediation retains standalone value regardless of whether the gate proceeds.",
			],
			exhibit: {
				kind: "line",
				title: "Cumulative net benefit crosses zero at month eleven, with a real stopping point at week three",
				caption: "Cumulative cash position by month. The dashed line is the downside case in which released capacity lands at half the modelled rate; payback moves to month sixteen and the case still holds.",
				source: "Benefits model · Readiness v7 · discount rate 10%",
				unit: "$k",
				ticks: ["M0", "M2", "M4", "M6", "M9", "M12", "M18", "M24"],
				series: [
					{ label: "Base case", points: [-180, -412, -368, -280, -148, 42, 380, 720], tone: "brand" },
					{ label: "Downside · half capacity release", points: [-180, -412, -390, -340, -262, -170, 24, 218], tone: "muted", dashed: true },
				],
				band: { label: "Payback", value: 0 },
			},
		},
		{
			heading: "Feasibility",
			paragraphs: [
				"Feasibility was assessed across five dimensions for each option rather than for the recommendation alone, because an option that scores well and cannot be delivered is not a real alternative.",
				"Option B's weakest dimension is organisational readiness, and the reason is specific: intake staff must apply the tiering rule from day one and the sponsor community must accept a harder gate at the same time. That is a change-management load, and it is why the roadmap forecasts a three-week deterioration rather than pretending the transition is free.",
				"Nothing in the assessment is a blocker. The lowest score anywhere is organisational readiness at 58, which is a plan item rather than a feasibility failure.",
			],
			exhibit: {
				kind: "heatmap",
				title: "No dimension blocks the recommendation; the weakest is organisational readiness, which the roadmap treats as a plan item",
				caption: "Feasibility by dimension and option (0 = not feasible, 100 = fully feasible with current capability). Option C scores poorly on financial feasibility because its tooling spend precedes any proven process.",
				source: "Feasibility assessment · [SRC-014] · [INT-DANIEL-03] · [INT-JORDAN-04]",
				columns: ["A · Enforce", "B · Tiered gate", "C · Automate"],
				rows: [
					{ label: "Technical", values: [92, 84, 61] },
					{ label: "Operational", values: [44, 76, 58] },
					{ label: "Financial", values: [88, 79, 42] },
					{ label: "Schedule", values: [81, 72, 47] },
					{ label: "Organisational readiness", values: [39, 58, 55] },
				],
				scale: ["Not feasible", "Fully feasible"],
			},
		},
		{
			heading: "Assumptions and what would break the case",
			paragraphs: [
				"Three assumptions carry the benefits. Released capacity assumes 150 vendors qualify for the light path under the ratified tiering thresholds; if the thresholds are tightened during ratification and only 90 qualify, the largest benefit line falls by roughly 40% and payback moves from month eleven to month sixteen.",
				"The second is the loaded internal rate of $92 an hour, used for both capacity and exception benefits. It is Northstar's own published rate and is not contested.",
				"The third is that avoided audit remediation is a real benefit rather than an accounting convenience. It is risk-weighted at 40% and stated separately, so a reader who rejects it entirely can still read a positive case at 16 months.",
			],
		},
	],
	findings: [
		{ label: "Recommended option", detail: "Option B, the risk-tiered gate. Weighted score 4.10, payback at month eleven, and the only option that improves the audit position and cycle time together." },
		{ label: "Benefit most exposed to a decision not yet taken", detail: "Released review capacity depends on the ratified tiering thresholds admitting roughly 150 vendors to the light path. Tightening them during ratification moves payback to month sixteen." },
		{ label: "The case does not depend on the contingent benefit", detail: "Excluding avoided audit remediation entirely, the programme still returns $395k a year against $412k. The audit position is the reason to act, not the reason it pays." },
	],
	nextSteps: [
		{ action: "Approve the $412k investment and the $48k annual run cost", owner: "Executive sponsor", due: "Executive review · 18 Sep" },
		{ action: "Ratify tiering thresholds and confirm the light-path population", owner: "Maya Rao · Vendor Risk Lead", due: "Week 1" },
		{ action: "Baseline the 1,240 review hours from timesheet data before launch", owner: "Daniel Kim · Security Architect", due: "Week 2" },
		{ action: "Agree the benefits-realisation owner and the month-12 review", owner: "Jordan Lee · Procurement Director", due: "Week 4" },
	],
	citations: ["[SRC-031]", "[SRC-088]", "[INT-MAYA-08]", "[INT-JORDAN-04]", "Readiness v7"],
}

const PROJECT_CHARTER: DeliverableBody = {
	heading: "Eleven weeks, four accountable owners, and a scope boundary written to survive the first request to widen it.",
	lede: "The charter fixes what the programme will and will not do, who decides what, and how the work is governed. The scope statement is deliberately narrow: tiering, the shared evidence record, parallel review, and the acceptance boundary. Vendor performance management, contract lifecycle tooling, and the identity platform are named as out of scope explicitly, because each has already been proposed as a natural extension and each would double the timeline.",
	metrics: [
		{ value: "11 weeks", label: "Charter duration", note: "Three phases, three gates" },
		{ value: "4", label: "Accountable owners", note: "One per workstream, none shared" },
		{ value: "12", label: "Stakeholders mapped", note: "4 manage closely, 3 keep satisfied" },
		{ value: "6", label: "Named out-of-scope items", note: "Each already proposed as an extension" },
	],
	keyMessages: [
		{ label: "Scope is defined by exclusion as much as by inclusion", detail: "Every item on the out-of-scope list is a defensible idea that would extend the programme past the executive review date. Naming them now converts a future argument into a charter change request." },
		{ label: "Accountability is singular and named", detail: "Four workstreams, four accountable owners, no shared accountability anywhere in the RACI. Shared accountability is how the current onboarding process arrived at 57 exceptions." },
		{ label: "Governance is two forums and a gate, not a meeting series", detail: "A weekly delivery stand-up and a gate review at weeks 3, 8, and 11. The executive sponsor is engaged at gates and on exceptions only, which is the same boundary the target operating model applies to vendors." },
	],
	sections: [
		{
			heading: "Scope",
			paragraphs: [
				"The programme delivers a risk-tiered onboarding gate for third parties: tiering computed at intake, one shared evidence record, parallel Security and Privacy review, an enforced residual-acceptance boundary, and the reporting that makes exception ageing visible.",
				"It does not deliver vendor performance management, contract lifecycle tooling, an identity platform integration, or a re-write of the policy library. Each was raised during the Discovery and each is a reasonable next programme; none is required for the gate to work, and including any of them would move the delivery date past the executive review.",
				"The scope boundary is also a control. A gate programme that absorbs adjacent work loses the ability to prove that the gate itself worked, because the measurement gets confounded by everything else that changed at the same time.",
			],
			exhibit: {
				kind: "table",
				title: "Six named exclusions, each already proposed once — the charter converts them into change requests",
				caption: "Scope statement. Out-of-scope items carry the reason and the earliest phase at which they could reasonably be reconsidered.",
				source: "Project charter · [INT-MAYA-08] · [INT-JORDAN-04] · [INT-DANIEL-03]",
				columns: ["In scope", "Out of scope", "Why excluded", "Reconsider at"],
				rows: [
					{ cells: ["Tiering computed at intake", "Vendor performance management", "No dependency on the gate; separate data and owners", "Post-launch +1 quarter"] },
					{ cells: ["Shared evidence record", "Contract lifecycle tooling", "Procurement tooling replacement is a separate business case", "FY planning"] },
					{ cells: ["Parallel Security and Privacy review", "Identity platform integration", "Access recertification is owned outside this programme", "Phase 3 candidate"] },
					{ cells: ["Residual-acceptance boundary", "Policy library rewrite", "Policies are sound; the failure is enforcement, not wording", "Not planned"] },
					{ cells: ["Exception log with owner and expiry", "Offshore vendor tax and entity review", "Legal workstream, no shared artifacts", "Not planned"] },
					{ cells: ["SLA and exception reporting", "Existing vendor re-tiering beyond the register", "284 records are the agreed population", "Post-launch +2 quarters"] },
				],
			},
		},
		{
			heading: "Stakeholders",
			paragraphs: [
				"Twelve stakeholders were mapped on influence against interest. Four sit in manage-closely: the Vendor Risk Lead, the Security Architect, the Privacy Counsel, and the Procurement Director. Each owns a workstream and each was interviewed during the Discovery.",
				"The Audit Committee sits high on influence and, today, low on interest — which is precisely the combination that produces a late intervention. The engagement plan briefs them at Gate B rather than at launch, when there is a measured audit position to brief them on.",
				"Business sponsors are numerous, individually low-influence, and collectively the group most affected by the change. They are handled as a communication population rather than as individual stakeholders, with the week 1–3 cycle-time rise published to them in advance.",
			],
			exhibit: {
				kind: "quadrant",
				title: "The Audit Committee is high influence and currently low interest — the combination that produces a late intervention",
				caption: "Twelve stakeholders on influence against interest. Manage-closely stakeholders own a workstream each; the Audit Committee is briefed at Gate B when there is a measured position to brief.",
				source: "Stakeholder analysis · Discovery interviews · [INT-MAYA-08] · [INT-PRIYA-06]",
				xAxis: ["Low interest", "High interest"],
				yAxis: ["Low influence", "High influence"],
				points: [
					{ label: "Vendor Risk Lead", x: 93, y: 90, emphasis: true },
					{ label: "Security Architect", x: 74, y: 82, emphasis: true },
					{ label: "Privacy Counsel", x: 90, y: 73, emphasis: true },
					{ label: "Procurement Director", x: 70, y: 65, emphasis: true },
					{ label: "Audit Committee", x: 22, y: 91 },
					{ label: "CFO", x: 31, y: 78 },
					{ label: "CIO", x: 38, y: 66 },
					{ label: "Business sponsors", x: 81, y: 34 },
					{ label: "Legal operations", x: 58, y: 41 },
					{ label: "Vendor managers", x: 69, y: 27 },
					{ label: "Internal audit", x: 44, y: 54 },
					{ label: "Strategic vendors", x: 52, y: 18 },
				],
			},
		},
		{
			heading: "Roles and responsibilities",
			paragraphs: [
				"The initial RACI covers the four delivery workstreams and the three gates. One accountable owner appears per row and never two, which is the single rule the current onboarding process breaks and the reason exceptions accumulate.",
				"The Project Manager is accountable for delivery of the plan and is deliberately not accountable for any control decision. Control decisions belong to the control owners, and a project manager who can accept residual risk to hold a date is how a control programme quietly loses its control.",
			],
			exhibit: {
				kind: "table",
				title: "One accountable owner per workstream, and the Project Manager holds no control decision",
				caption: "Initial RACI for the charter. A = accountable, R = responsible, C = consulted, I = informed. The absence of a second A in any row is the rule being established.",
				source: "Project charter · agreed with workstream owners",
				columns: ["Workstream", "Project Manager", "Vendor Risk", "Security", "Privacy", "Procurement"],
				rows: [
					{ cells: ["Register remediation and identifiers", "R", "A", "I", "I", "C"] },
					{ cells: ["Tiering rule and thresholds", "I", "A", "C", "C", "C"] },
					{ cells: ["Evidence record and gate build", "R", "C", "A", "C", "I"] },
					{ cells: ["Privacy terms and retention artifact", "I", "C", "I", "A", "C"] },
					{ cells: ["Signature integration and close", "R", "C", "I", "I", "A"] },
					{ cells: ["Gate reviews A, B, C", "A", "R", "R", "R", "R"], emphasis: true },
				],
			},
		},
		{
			heading: "Governance and cadence",
			paragraphs: [
				"Two forums. A weekly delivery stand-up of thirty minutes with the four workstream owners and the Project Manager, which resolves anything that does not change scope, date, or a control. And a gate review at weeks 3, 8, and 11 with the executive sponsor, which is the only forum that can change any of those three.",
				"There is no steering committee. A third forum between the stand-up and the gate would become the place where decisions wait, and the programme is eleven weeks long — short enough that anything needing more than a week of deliberation should be escalated to the sponsor rather than scheduled.",
				"Exceptions interrupt rather than queue. A control decision that cannot be made inside the operating layer goes to the sponsor when it arises, not at the next gate. This mirrors the escalation behaviour the target operating model establishes for vendors, deliberately.",
			],
			bullets: [
				{ label: "Weekly delivery stand-up", detail: "30 minutes, four workstream owners plus PM. Resolves anything not touching scope, date, or a control." },
				{ label: "Gate review at weeks 3, 8, 11", detail: "Executive sponsor attends. The only forum that can change scope, date, or a control decision." },
				{ label: "Exception path", detail: "Control decisions that exceed the operating layer interrupt immediately rather than waiting for a gate." },
			],
		},
		{
			heading: "Constraints, dependencies, and milestones",
			paragraphs: [
				"Three constraints are fixed. The executive review on 18 September is immovable and sets the ratification date. Engineering capacity is 2.5 FTE and is not expandable within the window. And the register remediation depends on sponsor responses, which the programme can chase but cannot compel.",
				"The single external dependency is the vendor retention artifact that the Discovery could not evidence internally. It is not on the critical path — REQ-09 fails closed without it — but it determines whether the first Tier 1 vendor through the new gate passes or becomes the first exception.",
			],
		},
	],
	findings: [
		{ label: "Charter boundary most likely to be tested", detail: "Contract lifecycle tooling. It is the most frequently proposed extension and the one with the strongest surface logic; the charter answers it with a named reconsideration point rather than a refusal." },
		{ label: "Governance rule that matters", detail: "The Project Manager is accountable for the plan and for no control decision. Without that line, schedule pressure converts into control relaxation." },
		{ label: "Stakeholder risk", detail: "The Audit Committee is high influence and low current interest. Briefing them at Gate B with a measured position avoids a late intervention against an unmeasured one." },
	],
	nextSteps: [
		{ action: "Sign the charter including the six named exclusions", owner: "Executive sponsor with Project Manager", due: "Week 1" },
		{ action: "Confirm the RACI with all four workstream owners", owner: "Project Manager", due: "Week 1" },
		{ action: "Schedule Gate A, B, and C with the sponsor before kickoff", owner: "Project Manager", due: "Week 1" },
		{ action: "Brief the Audit Committee on the Gate B measurement in advance", owner: "Maya Rao · Vendor Risk Lead", due: "Week 6" },
	],
	citations: ["[SRC-014]", "[INT-MAYA-08]", "[INT-PRIYA-06]", "[INT-JORDAN-04]", "Readiness v7"],
}

const PROCESS_ANALYSIS: DeliverableBody = {
	heading: "Nine handoffs become four, and the two that carried 61% of the duplicated work disappear entirely.",
	lede: "The current onboarding process has nine handoffs across five functions, four of them returning work to a function that has already touched it. Mapping it against the 68 approval decisions shows where elapsed time and rework actually sit: not in the reviews themselves, but in the waiting and re-requesting between them. The To-Be process has four handoffs, no returns, and one evidence record that every function reads from and writes to.",
	metrics: [
		{ value: "9 → 4", label: "Handoffs in the process", note: "Four current handoffs return work" },
		{ value: "61%", label: "Review questions duplicated", note: "Answered by another reviewer's artifact" },
		{ value: "3.2", label: "Average rework loops per vendor", note: "5.8 for Tier 1 vendors" },
		{ value: "20 of 34", label: "Days spent waiting, not reviewing", note: "Queue time, not effort" },
	],
	keyMessages: [
		{ label: "The reviews are not slow; the waiting is", detail: "Actual review effort across all four functions averages 9.4 hours per vendor. The elapsed time is 34 days. Everything between those two numbers is queue, handoff, and re-request." },
		{ label: "Rework is caused by sequence, not by quality", detail: "Privacy cannot start until Security finishes, so Privacy discovers missing information Security could have collected. That single ordering produces 3.2 rework loops per vendor and 5.8 for Tier 1." },
		{ label: "One evidence record removes four handoffs without removing a check", detail: "Every function keeps its review. What disappears is the act of passing work between them and re-establishing context, which is where the 61% duplication lives." },
	],
	sections: [
		{
			heading: "As-Is process",
			paragraphs: [
				"The current process runs serially through five functions. A sponsor raises a request, Procurement triages it manually with no tier assigned, Security reviews, Privacy reviews after Security, Legal reviews the contract, Risk signs off, and Procurement closes. Each transition is a handoff, and four of them return work upstream when information is found to be missing.",
				"Two properties of the map are worth naming. First, there is no point at which the process can refuse to proceed — every step can be skipped under pressure because the next step does not check that the previous one completed. Second, the tier is never established, so a $40k Tier 3 vendor and a $4m Tier 1 vendor traverse identical steps.",
				"The map below is drawn from the 68 approval decisions rather than from the documented procedure, so it shows the process as it runs rather than as it is written. The documented procedure has seven steps; the observed process has eleven.",
			],
			exhibit: {
				kind: "architecture",
				title: "As-Is: nine handoffs, four of them returning work, and no point at which the process can refuse to proceed",
				caption: "Observed process across 68 approval decisions. Amber nodes are where rework originates; the dashed return paths are the four handoffs that send work back upstream.",
				source: "Process reconstruction from [SRC-088] and [SRC-031] · validated in [INT-JORDAN-04]",
				lanes: ["Request", "Triage", "Serial review", "Close"],
				nodes: [
					{ id: "spon", label: "Sponsor request", detail: "Free-form, no tier", lane: 0, row: 0, tone: "neutral" },
					{ id: "intake", label: "Manual triage", detail: "4 days · no tiering", lane: 1, row: 0, tone: "warn" },
					{ id: "sec", label: "Security review", detail: "11 days · re-requests", lane: 2, row: 0, tone: "warn" },
					{ id: "priv", label: "Privacy review", detail: "9 days · waits on Security", lane: 2, row: 1, tone: "warn" },
					{ id: "legal", label: "Legal and contract", detail: "Parallel in name only", lane: 2, row: 2, tone: "neutral" },
					{ id: "risk", label: "Risk sign-off", detail: "4 days · rebuilds trail", lane: 3, row: 0, tone: "warn" },
					{ id: "close", label: "Procurement close", detail: "Signs from thread", lane: 3, row: 1, tone: "warn" },
				],
				edges: [
					{ from: "spon", to: "intake" },
					{ from: "intake", to: "sec" },
					{ from: "sec", to: "priv", label: "serial" },
					{ from: "priv", to: "legal" },
					{ from: "legal", to: "risk" },
					{ from: "risk", to: "close" },
					{ from: "priv", to: "intake", label: "rework", tone: "warn", dashed: true },
					{ from: "risk", to: "sec", label: "rework", tone: "warn", dashed: true },
					{ from: "close", to: "legal", label: "rework", tone: "warn", dashed: true },
				],
			},
		},
		{
			heading: "Where the time goes",
			paragraphs: [
				"Separating effort from elapsed time is what makes the redesign obvious. Total review effort is 9.4 hours per vendor. Total elapsed time is 34 days. Queue time — work sitting in a function's inbox before anyone touches it — is 20 of those days.",
				"Rework adds a further 4.1 days on average and 9.6 days for Tier 1 vendors. Every rework loop traces to information that a downstream function needed and an upstream function did not know to collect, which is a sequencing defect rather than a diligence failure.",
			],
			exhibit: {
				kind: "stack",
				title: "Only 9.4 hours of the 34 days is actual review effort — the rest is queue and rework",
				caption: "Decomposition of elapsed time per vendor by stage, in days. Queue time is work waiting untouched; rework is time spent re-establishing information a prior stage did not collect.",
				source: "Elapsed-time analysis across 68 approvals · [SRC-088]",
				segments: [
					{ label: "Active review effort", tone: "brand" },
					{ label: "Queue time", tone: "neutral" },
					{ label: "Rework", tone: "warn" },
				],
				rows: [
					{ label: "Intake and triage", values: [0.4, 3.1, 0.5] },
					{ label: "Security review", values: [0.6, 8.2, 2.2], note: "Largest queue" },
					{ label: "Privacy review", values: [0.3, 7.5, 1.2] },
					{ label: "Legal and contract", values: [0.2, 4.4, 0.2] },
					{ label: "Risk and close", values: [0.3, 4.8, 0.4] },
				],
			},
		},
		{
			heading: "Gap analysis",
			paragraphs: [
				"Each gap states the current behaviour, the target behaviour, the change required to close it, and the benefit that closing it produces. Gaps are ordered by the elapsed time they remove, not by how easy they are to fix.",
				"Two gaps account for most of the improvement: parallel review and tiering at intake. The remaining four are individually small and collectively necessary, because leaving any of them open reintroduces a return path and the rework that comes with it.",
			],
			exhibit: {
				kind: "table",
				title: "Six gaps, and the top two account for 13 of the 16 days removed",
				caption: "Gap analysis ordered by elapsed time removed. Each gap names the change required, so the requirements specification can be traced back to a specific process defect.",
				source: "Gap analysis · [SRC-088] · [SRC-031] · [INT-JORDAN-04]",
				columns: ["Gap", "As-Is", "To-Be", "Change required", "Days removed"],
				rows: [
					{ cells: ["Review sequencing", "Privacy waits for Security", "Both review in parallel", "Shared evidence record", "7.0"], emphasis: true },
					{ cells: ["Risk segmentation", "All vendors identical path", "Tier set at intake", "Tiering rule on register fields", "6.0"], emphasis: true },
					{ cells: ["Evidence duplication", "Each function re-requests", "Attach once, visible to all", "Evidence record with artifact links", "3.0"] },
					{ cells: ["Approval authority", "All residual risk escalates", "Delegated by tier", "Acceptance matrix enforced in gate", "1.5"] },
					{ cells: ["Signature control", "Signs from approval thread", "Signs from evidence record", "Gate query before signature", "0.5"] },
					{ cells: ["Exception handling", "No expiry, no owner", "Owner and expiry mandatory", "Exception log validation", "0.0"] },
				],
			},
		},
		{
			heading: "To-Be process",
			paragraphs: [
				"The target process has four handoffs and no return paths. Intake computes the tier and mints the identifier. The gate record requests the evidence set for that tier. Security and Privacy attach artifacts in parallel. Procurement queries the gate and signs, or is refused.",
				"Legal review does not disappear — it moves inside the evidence set rather than sitting as a sequential stage, so contract terms are an artifact attached to the record rather than a stage that must complete before the next one starts.",
				"The rework paths are removed structurally rather than procedurally. A downstream function cannot discover missing information late, because the required evidence set is declared by the tier at the beginning and the gate shows what is outstanding at all times.",
			],
			exhibit: {
				kind: "architecture",
				title: "To-Be: four handoffs, no returns, and the gate shows what is outstanding at every moment",
				caption: "Target process. Legal review becomes an artifact inside the evidence set rather than a sequential stage, which is what removes the third rework path.",
				source: "Target process · Readiness v7 · [INT-MAYA-08] · [INT-DANIEL-03]",
				lanes: ["Request", "Gate", "Parallel evidence", "Close"],
				nodes: [
					{ id: "spon2", label: "Sponsor request", detail: "Structured intake form", lane: 0, row: 0, tone: "neutral" },
					{ id: "tier", label: "Tier + identifier", detail: "Computed, immutable", lane: 1, row: 0, tone: "brand" },
					{ id: "gate2", label: "Evidence set declared", detail: "By tier, visible to all", lane: 1, row: 1, tone: "brand" },
					{ id: "sec2", label: "Security evidence", detail: "Parallel · attaches artifact", lane: 2, row: 0, tone: "neutral" },
					{ id: "priv2", label: "Privacy + retention", detail: "Parallel · attaches terms", lane: 2, row: 1, tone: "neutral" },
					{ id: "legal2", label: "Contract terms", detail: "Artifact, not a stage", lane: 2, row: 2, tone: "neutral" },
					{ id: "sign2", label: "Signature", detail: "Queries gate · fails closed", lane: 3, row: 0, tone: "brand" },
				],
				edges: [
					{ from: "spon2", to: "tier" },
					{ from: "tier", to: "gate2" },
					{ from: "gate2", to: "sec2" },
					{ from: "gate2", to: "priv2" },
					{ from: "gate2", to: "legal2" },
					{ from: "sec2", to: "sign2" },
					{ from: "priv2", to: "sign2" },
					{ from: "legal2", to: "sign2" },
				],
			},
		},
		{
			heading: "What the process change does not fix",
			paragraphs: [
				"Review effort itself is unchanged. A Tier 1 security assessment still takes the same hours it takes today, and the redesign makes no claim otherwise. If the ambition were to reduce review depth, that would be a different recommendation with a different risk profile.",
				"Intake quality is improved but not solved. The structured intake form removes the ambiguity that causes triage rework, but a sponsor who describes a vendor's data access inaccurately will still produce the wrong tier. The mitigation is that the tier is visible and challengeable rather than implicit, not that it is guaranteed correct.",
			],
		},
	],
	findings: [
		{ label: "Root process defect", detail: "Sequential review with no shared evidence. It produces 20 days of queue against 9.4 hours of effort, and 3.2 rework loops per vendor." },
		{ label: "Highest-value single change", detail: "Parallel review against one evidence record — 7.0 of the 16 days removed, and it eliminates two of the four return paths on its own." },
		{ label: "Explicitly unchanged", detail: "Review effort and depth. The redesign removes waiting and duplication, not scrutiny, and any claim that it reduces diligence would be false." },
	],
	nextSteps: [
		{ action: "Validate the As-Is map with all five functions before build", owner: "Project Manager with Jordan Lee", due: "Week 1" },
		{ action: "Design the structured intake form against the three tiering inputs", owner: "Maya Rao · Vendor Risk Lead", due: "Week 2" },
		{ action: "Confirm Legal accepts contract terms as an artifact rather than a stage", owner: "Priya Shah · Privacy Counsel", due: "Week 2" },
		{ action: "Baseline queue time per stage so the week 8 measurement is comparable", owner: "Project Manager", due: "Week 3" },
	],
	citations: ["[SRC-088]", "[SRC-031]", "[INT-JORDAN-04]", "[INT-MAYA-08]", "Readiness v7"],
}

export const TPRM_DELIVERABLES: DeliverableBody[] = [EXECUTIVE_BRIEF, BUSINESS_CASE, PROJECT_CHARTER, PROCESS_ANALYSIS, REQUIREMENTS, TECHNICAL_ASSESSMENT, TARGET_OPERATING_MODEL, RAID_REGISTER, ROADMAP]

// With the owner's approval the vendor's privacy counsel is asked for the
// retention terms, so the brief reports a pending confirmation instead of a
// recorded limitation.
export const TPRM_APPROVED_REVISIONS: Partial<Record<number, DeliverableRevision>> = {
	0: {
		sections: {
			"What this package does not claim": [
				"The vendor's data-retention commitment is not yet evidenced. No internal source holds it: the policy library, the register, and the contract record were all searched. With your approval, MAX requested one scoped interview with the vendor's privacy counsel, so retention is pending confirmation rather than inferred from the contract template. Until that interview is recorded, REQ-09 keeps a Tier 1 vendor from signature without either the artifact or a time-bound, named exception.",
				"The modelled cycle times are replays of historical decisions through the target design, not forecasts. They assume review capacity holds at current levels; if Security capacity falls, the parallel design degrades gracefully to today's timing rather than failing, but the 18-day figure would not hold.",
			],
		},
		findings: {
			"Unresolved exposure": { label: "Pending confirmation", detail: "Vendor counsel interview requested with your approval. Retention stays pending confirmation until the interview is recorded, and REQ-09 fails closed without it." },
		},
	},
}
