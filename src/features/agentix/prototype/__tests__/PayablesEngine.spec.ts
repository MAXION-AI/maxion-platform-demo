import { describe, expect, it } from "vitest"
import { activate, activationBlockers, actOnEngagement, advanceSchedule, answerQuestion, awaitingCreation, decide, itemBy, latest, receivePackage, tick, visiblePackage } from "../engine/engine"
import { demoInitialState } from "../engine/seed"
import { achievements, needsYou, teamPresence } from "../engine/selectors"
import { SCENARIOS } from "../engine/scenarios"
import type { AgentixState, WorkItem } from "../engine/types"

/*
 * The ServiceNow customer demo's engagement, driven end to end from nothing: the package arrives
 * from Discovery, the owner answers the two questions it could not settle, the team is created,
 * and it maps, builds, is corrected by a failing check, releases under policy, publishes and then
 * runs every morning. Every figure here is the one the Discovery package quotes.
 */
const AP = "payables"
const BASE = Date.parse("2026-11-23T10:30:00Z")
/* A gated design only arrives with the Discovery that produced it; this is that handoff. */
const LINK = { recordId: "demo-servicenow-discovery", packetId: "HP-AP7742", title: "AP invoice exceptions: ServiceNow triage and approval authority" }

const run = (state: AgentixState, until: (s: AgentixState) => boolean, max = 200) => {
	let current = state
	for (let i = 0; i < max && !until(current); i++) current = tick(current)
	if (!until(current)) throw new Error("condition not reached")
	return current
}
const item = (state: AgentixState, reference: string) => state.work.find(entry => entry.engagementId === AP && entry.reference === reference) as WorkItem
const artifact = (state: AgentixState, key: string) => state.artifacts.find(entry => entry.id === `${AP}:${key}`)!
const openDecision = (state: AgentixState, workId: string) => state.decisions.find(entry => entry.workItemId === workId && entry.status === "open")

/* The proposal the presenter walks: two questions, the read-only check, then activation. */
function activated() {
	let state = receivePackage(demoInitialState(BASE, AP), "pkg_ap_exceptions_v2", "discovery", "", LINK)
	state = answerQuestion(state, AP, "release", "approval")
	state = answerQuestion(state, AP, "testdata", "synthetic")
	// A draft engagement will not activate until its read-only check has run.
	expect(activationBlockers(state, AP)).toContain("Run the readiness check.")
	state = actOnEngagement(state, AP, "recheck")
	state = run(state, s => s.engagements[AP].checked)
	expect(activationBlockers(state, AP)).toEqual([])
	return activate(state, AP)
}

describe("AP exceptions: the engagement starts from nothing", () => {
	it("has no engagement to show until its Discovery sends the package", () => {
		const state = demoInitialState(BASE, AP)
		const engagement = state.engagements[AP]
		expect(engagement.status).toBe("draft")
		expect(engagement.packages).toEqual([])
		expect(awaitingCreation(engagement)).toBe(true)
		expect(state.work.filter(entry => entry.engagementId === AP)).toEqual([])
		expect(state.artifacts.filter(entry => entry.id.startsWith(`${AP}:`))).toEqual([])
		// The design is held back: nothing offers it until the Discovery hands it over, and a
		// package that arrives without one is refused rather than quietly accepted.
		expect(visiblePackage(state, AP)).toBeUndefined()
		expect(receivePackage(state, "pkg_ap_exceptions_v2", "prompt")).toBe(state)
	})

	it("keeps the everyday backdrop but hides the other demos' engagements", () => {
		const state = demoInitialState(BASE, AP)
		// Unrelated work continues behind the demo, so the fleet is not empty...
		for (const backdrop of ["service", "onboarding", "inventory"]) {
			expect(state.engagements[backdrop]?.status, backdrop).toBe("active")
			expect(state.work.some(entry => entry.engagementId === backdrop), backdrop).toBe(true)
		}
		// ...but another demo's subject is not backdrop: this presenter must not find the revenue
		// engagement running its own invoice work in the fleet, or leading the dashboard headline.
		for (const subject of ["invoice", "payables", "orders"].filter(id => id !== "payables")) {
			// Absent, or present only as an empty draft — which awaitingCreation hides from the
			// fleet, from what needs you and from the shell's work count. Either way it shows nothing.
			const other = state.engagements[subject]
			if (other) { expect(other.status, subject).toBe("draft"); expect(other.packages, subject).toEqual([]) }
			expect(state.work.some(entry => entry.engagementId === subject), subject).toBe(false)
			expect(state.decisions.some(entry => entry.engagementId === subject), subject).toBe(false)
		}
	})

	it("arrives as a new engagement, not an expansion of one that was already running", () => {
		const state = receivePackage(demoInitialState(BASE, AP), "pkg_ap_exceptions_v2", "discovery", "", LINK)
		expect(state.engagements[AP].proposal?.kind).toBe("new")
		expect(state.engagements[AP].proposal?.packageId).toBe("pkg_ap_exceptions_v2")
		// Receiving the same package again lands on the same proposal.
		expect(receivePackage(state, "pkg_ap_exceptions_v2", "discovery", "", LINK)).toBe(state)
	})

	it("creates four duties and exactly three milestones on activation", () => {
		const state = activated()
		expect(teamPresence(state, AP).map(entry => entry.member.id)).toEqual(["coordinator", "analyst", "data", "dashboard"])
		expect(state.work.filter(entry => entry.engagementId === AP).map(entry => entry.reference).sort()).toEqual(["MS-1", "MS-2", "MS-3"])
	})
})

describe("AP exceptions: the milestone arc", () => {
	it("asks the no-contract rule, fails on the wrong tolerance, repairs, releases once and runs every morning", () => {
		let state = activated()

		// MS-1 stops at the commercial rule the triage specialist will not choose for itself.
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		const contract = openDecision(state, item(state, "MS-1").id)!
		expect(contract.kind).toBe("question")
		expect(contract.template).toBe("contract")
		// The question the owner reads names the 318 cases the Discovery package flagged.
		expect(SCENARIOS.payables.decisions.contract.title).toContain("318")
		state = decide(state, contract.id, "buyer")
		expect(latest(artifact(state, "mapping")).variant).toContain("contract-buyer")
		state = run(state, s => item(s, "MS-1").status === "verified")

		// MS-2's first version tests price against the purchase order, which Discovery ruled out.
		state = run(state, s => !!artifact(s, "pipeline") && latest(artifact(s, "pipeline")).status === "failed")
		const v1 = latest(artifact(state, "pipeline"))
		expect(v1.checks.filter(check => check.status === "failed").map(check => check.id).sort()).toEqual(["discount", "tolerance"])
		expect(v1.checks.find(check => check.id === "tolerance")!.detail).toContain("240")
		expect(v1.checks.find(check => check.id === "tolerance")!.detail).toContain("84,310.55")

		// The specialist repairs it inside its own bound and every check passes.
		state = run(state, s => latest(artifact(s, "pipeline")).status === "tested")
		const repaired = latest(artifact(state, "pipeline"))
		expect(repaired.source).toBe("repair")
		expect(repaired.checks.every(check => check.status === "passed")).toBe(true)
		expect(artifact(state, "pipeline").productionVersion).toBeUndefined()

		// Nothing reaches production until the owner approves it, as they answered at activation.
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		const approval = openDecision(state, item(state, "MS-2").id)!
		expect(approval.kind).toBe("release")
		expect(needsYou(state, AP).some(entry => entry.kind === "release")).toBe(true)
		state = decide(state, approval.id, "approve")
		state = run(state, s => s.releases.some(r => r.engagementId === AP && (r.status === "applied" || r.status === "verified")))
		// The pipeline is released once and only once; the dashboard releases separately under FIN-AP-7.
		const pipelineReleases = state.releases.filter(r => r.engagementId === AP && r.workItemId === item(state, "MS-2").id)
		expect(pipelineReleases).toHaveLength(1)
		expect(pipelineReleases[0].attempts).toBe(1)

		// Delivery is verified and the engagement moves into its daily operation.
		state = run(state, s => item(s, "MS-2").status === "verified" && item(s, "MS-3").status === "verified")
		expect(artifact(state, "pipeline").productionVersion).toBe(repaired.version)
		expect(artifact(state, "runbook")).toBeDefined()
		expect(state.engagements[AP].cycles).toBe("daily")
		expect(achievements(state, AP).length).toBeGreaterThan(0)

		// The next morning runs the work rather than building it.
		state = advanceSchedule(state, AP)
		const cycle = state.work.find(entry => entry.engagementId === AP && entry.kind === "cycle")!
		expect(cycle.reference).toMatch(/^AP-/)
		state = run(state, s => itemBy(s, cycle.id)!.status === "verified")
	})

	it("holds the taxonomy check open until the no-contract rule is decided", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		// The mapping cannot pass its own check while the rule it depends on is unanswered.
		const draft = latest(artifact(state, "mapping"))
		expect(draft.variant.some(entry => entry.startsWith("contract-"))).toBe(false)
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "hold")
		expect(latest(artifact(state, "mapping")).variant).toContain("contract-hold")
		state = run(state, s => item(s, "MS-1").status === "verified")
		expect(item(state, "MS-1").status).toBe("verified")
	})
})
