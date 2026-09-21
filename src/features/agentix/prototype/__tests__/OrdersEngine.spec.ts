import { describe, expect, it } from "vitest"
import { activate, activationBlockers, actOnEngagement, advanceSchedule, answerQuestion, awaitingCreation, decide, itemBy, latest, receivePackage, releaseWindowFor, tick, visiblePackage } from "../engine/engine"
import { SCENARIOS } from "../engine/scenarios"
import { demoInitialState } from "../engine/seed"
import { achievements, needsYou, teamPresence } from "../engine/selectors"
import type { AgentixState, WorkItem } from "../engine/types"

/*
 * The Salesforce–SAP customer demo's engagement, driven end to end from nothing: the package
 * arrives from Discovery, the owner answers the two questions it could not settle, the team is
 * created, and it maps, builds, is corrected by a failing check, releases under policy, publishes
 * and then runs every morning. Every figure here is the one the Discovery package quotes.
 */
const ORDERS = "orders"
const BASE = Date.parse("2026-11-23T10:30:00Z")
/* A gated design only arrives with the Discovery that produced it; this is that handoff. */
const LINK = { recordId: "demo-salesforce-sap-discovery", packetId: "HP-ORD812", title: "Salesforce–SAP order sync: customer master and posting integrity" }

const run = (state: AgentixState, until: (s: AgentixState) => boolean, max = 200) => {
	let current = state
	for (let i = 0; i < max && !until(current); i++) current = tick(current)
	if (!until(current)) throw new Error("condition not reached")
	return current
}
const item = (state: AgentixState, reference: string) => state.work.find(entry => entry.engagementId === ORDERS && entry.reference === reference) as WorkItem
const artifact = (state: AgentixState, key: string) => state.artifacts.find(entry => entry.id === `${ORDERS}:${key}`)!
const openDecision = (state: AgentixState, workId: string) => state.decisions.find(entry => entry.workItemId === workId && entry.status === "open")

/* The proposal the presenter walks: two questions, the read-only check, then activation. */
function activated() {
	let state = receivePackage(demoInitialState(BASE, ORDERS), "pkg_order_sync_v2", "discovery", "", LINK)
	state = answerQuestion(state, ORDERS, "release", "approval")
	state = answerQuestion(state, ORDERS, "testdata", "synthetic")
	expect(activationBlockers(state, ORDERS)).toContain("Run the readiness check.")
	state = actOnEngagement(state, ORDERS, "recheck")
	state = run(state, s => s.engagements[ORDERS].checked)
	expect(activationBlockers(state, ORDERS)).toEqual([])
	return activate(state, ORDERS)
}

describe("order sync: the engagement starts from nothing", () => {
	it("has no engagement to show until its Discovery sends the package", () => {
		const state = demoInitialState(BASE, ORDERS)
		const engagement = state.engagements[ORDERS]
		expect(engagement.status).toBe("draft")
		expect(engagement.packages).toEqual([])
		expect(awaitingCreation(engagement)).toBe(true)
		expect(state.work.filter(entry => entry.engagementId === ORDERS)).toEqual([])
		expect(visiblePackage(state, ORDERS)).toBeUndefined()
		expect(receivePackage(state, "pkg_order_sync_v2", "prompt")).toBe(state)
	})

	it("keeps the everyday backdrop but hides the other demos' engagements", () => {
		const state = demoInitialState(BASE, ORDERS)
		// Unrelated work continues behind the demo, so the fleet is not empty...
		for (const backdrop of ["service", "onboarding", "inventory"]) {
			expect(state.engagements[backdrop]?.status, backdrop).toBe("active")
			expect(state.work.some(entry => entry.engagementId === backdrop), backdrop).toBe(true)
		}
		// ...but another demo's subject is not backdrop: this presenter must not find the revenue
		// engagement running its own invoice work in the fleet, or leading the dashboard headline.
		for (const subject of ["invoice", "payables", "orders"].filter(id => id !== "orders")) {
			// Absent, or present only as an empty draft — which awaitingCreation hides from the
			// fleet, from what needs you and from the shell's work count. Either way it shows nothing.
			const other = state.engagements[subject]
			if (other) { expect(other.status, subject).toBe("draft"); expect(other.packages, subject).toEqual([]) }
			expect(state.work.some(entry => entry.engagementId === subject), subject).toBe(false)
			expect(state.decisions.some(entry => entry.engagementId === subject), subject).toBe(false)
		}
	})

	it("arrives as a new engagement, not an expansion of one that was already running", () => {
		const state = receivePackage(demoInitialState(BASE, ORDERS), "pkg_order_sync_v2", "discovery", "", LINK)
		expect(state.engagements[ORDERS].proposal?.kind).toBe("new")
		expect(state.engagements[ORDERS].proposal?.packageId).toBe("pkg_order_sync_v2")
		expect(receivePackage(state, "pkg_order_sync_v2", "discovery", "", LINK)).toBe(state)
	})

	it("creates four duties and exactly three milestones on activation", () => {
		const state = activated()
		expect(teamPresence(state, ORDERS).map(entry => entry.member.id)).toEqual(["coordinator", "analyst", "data", "dashboard"])
		expect(state.work.filter(entry => entry.engagementId === ORDERS).map(entry => entry.reference).sort()).toEqual(["MS-1", "MS-2", "MS-3"])
	})

	it("carries its own release window, not the revenue demo's", () => {
		// The package offers "Thursday 21:00"; every surface and the schedule must agree with it.
		expect(releaseWindowFor(ORDERS).label).toBe("Thursday 21:00")
		expect(releaseWindowFor("invoice").label).toBe("Saturday 02:00")
		expect(releaseWindowFor("payables").label).toBe("Wednesday 22:00")
		const option = SCENARIOS.orders.decisions.release.options.find(entry => entry.outcome === "release-window")
		expect(option?.label).toContain("Thursday 21:00")
	})
})

describe("order sync: the milestone arc", () => {
	it("asks the unmapped-SKU rule, fails on the wrong master, repairs, releases once and runs every morning", () => {
		let state = activated()

		// MS-1 stops at the catalogue rule the integration specialist will not choose for itself.
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		const material = openDecision(state, item(state, "MS-1").id)!
		expect(material.kind).toBe("question")
		expect(material.template).toBe("material")
		expect(SCENARIOS.orders.decisions.material.title).toContain("94")
		// The decision is bound to the artifact version it sits beside, not to the work reference.
		expect(material.binding).toContain("Customer and material mapping v")
		state = decide(state, material.id, "block")
		expect(latest(artifact(state, "mapping")).variant).toContain("material-block")
		state = run(state, s => item(s, "MS-1").status === "verified")

		// MS-2's first version resolves customers from Salesforce, which Discovery ruled out.
		state = run(state, s => !!artifact(s, "pipeline") && latest(artifact(s, "pipeline")).status === "failed")
		const v1 = latest(artifact(state, "pipeline"))
		expect(v1.checks.filter(check => check.status === "failed").map(check => check.id).sort()).toEqual(["pricing", "tax"])
		expect(v1.checks.find(check => check.id === "tax")!.detail).toContain("187")
		expect(v1.checks.find(check => check.id === "tax")!.detail).toContain("612,480.90")

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
		expect(needsYou(state, ORDERS).some(entry => entry.kind === "release")).toBe(true)
		state = decide(state, approval.id, "approve")
		state = run(state, s => s.releases.some(r => r.engagementId === ORDERS && (r.status === "applied" || r.status === "verified")))
		const pipelineReleases = state.releases.filter(r => r.engagementId === ORDERS && r.workItemId === item(state, "MS-2").id)
		expect(pipelineReleases).toHaveLength(1)
		expect(pipelineReleases[0].attempts).toBe(1)

		// Delivery is verified and the engagement moves into its daily operation.
		state = run(state, s => item(s, "MS-2").status === "verified" && item(s, "MS-3").status === "verified")
		expect(artifact(state, "pipeline").productionVersion).toBe(repaired.version)
		expect(artifact(state, "runbook")).toBeDefined()
		expect(state.engagements[ORDERS].cycles).toBe("daily")
		expect(achievements(state, ORDERS).length).toBeGreaterThan(0)

		// The next morning runs the work rather than building it, named for what it actually runs.
		state = advanceSchedule(state, ORDERS)
		const cycle = state.work.find(entry => entry.engagementId === ORDERS && entry.kind === "cycle")!
		expect(cycle.reference).toMatch(/^ORD-/)
		expect(cycle.title).toContain("Daily order sync")
		state = run(state, s => itemBy(s, cycle.id)!.status === "verified")
	})

	it("reconciles an uncertain release in its own words, not the revenue demo's", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "block")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		state = decide(state, openDecision(state, item(state, "MS-2").id)!.id, "approve")
		state = run(state, s => s.events.some(e => e.engagementId === ORDERS && e.text.includes("reconciled: read-back found")))
		const line = state.events.filter(e => e.engagementId === ORDERS && e.text.includes("reconciled: read-back found")).at(-1)!
		// The scripted acknowledgement loss fires for every engagement, so its wording must be theirs.
		expect(line.text).toContain("the posting service and the daily sync registered")
		expect(line.text).not.toContain("migration 0007")
		expect(line.text).not.toContain("nightly load")
	})

	it("holds the mapping check open until the unmapped-SKU rule is decided", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		const draft = latest(artifact(state, "mapping"))
		expect(draft.variant.some(entry => entry.startsWith("material-"))).toBe(false)
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "placeholder")
		expect(latest(artifact(state, "mapping")).variant).toContain("material-placeholder")
		state = run(state, s => item(s, "MS-1").status === "verified")
		expect(item(state, "MS-1").status).toBe("verified")
	})
})
