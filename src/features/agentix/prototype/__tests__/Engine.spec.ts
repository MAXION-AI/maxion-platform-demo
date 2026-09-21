import { beforeEach, describe, expect, it } from "vitest"
import { activate, activationBlockers, actOnEngagement, actOnRelease, actOnWork, addIncoming, advanceSchedule, advanceToWindow, answerQuestion, decide, fulfill, itemBy, latest, receivePackage, tick } from "../engine/engine"
import { initialState } from "../engine/seed"
import { achievements, needsYou, readinessSplit, statusOf, teamPresence } from "../engine/selectors"
import { acceptOffer, sendInstruction } from "../engine/steering"
import type { AgentixState, WorkItem } from "../engine/types"

const REV = "invoice"
const run = (state: AgentixState, until: (s: AgentixState) => boolean, max = 120) => {
	let current = state
	for (let i = 0; i < max && !until(current); i++) current = tick(current)
	if (!until(current)) throw new Error("condition not reached")
	return current
}
const item = (state: AgentixState, reference: string, engagementId = REV) => state.work.find(entry => entry.engagementId === engagementId && entry.reference === reference) as WorkItem
const artifact = (state: AgentixState, key: string) => state.artifacts.find(entry => entry.id === `${REV}:${key}`)!
const openDecision = (state: AgentixState, workId: string) => state.decisions.find(entry => entry.workItemId === workId && entry.status === "open")

/* Discovery → proposal → activation, answering the two focused questions. */
function activated(release: "approval" | "window" = "approval") {
	let state = receivePackage(initialState(), "pkg_revenue_v2", "discovery")
	state = answerQuestion(state, REV, "release", release)
	state = answerQuestion(state, REV, "testdata", "synthetic")
	return activate(state, REV)
}

describe("seeded demo", () => {
	it("starts with four live engagements, one single-agent and three teams, and two things that need the owner", () => {
		const state = initialState()
		expect(Object.values(state.engagements).map(e => [e.id, e.status])).toEqual([["invoice", "active"], ["service", "active"], ["onboarding", "active"], ["inventory", "active"]])
		expect(teamPresence(state, "service")).toHaveLength(1)
		expect(teamPresence(state, "onboarding").length).toBeGreaterThan(1)
		expect(needsYou(state).map(entry => entry.kind).sort()).toEqual(["decision", "human"])
		expect(state.engagements.invoice.name).toBe("Revenue reconciliation")
	})

	it("continues each reference series for incoming work", () => {
		let state = addIncoming(initialState(), REV)
		state = addIncoming(state, "inventory")
		expect(state.work.filter(entry => entry.engagementId === REV).map(entry => entry.reference)).toContain("INV-20846")
		expect(state.work.filter(entry => entry.engagementId === "inventory").map(entry => entry.reference)).toContain("STOCK-903")
	})
})

describe("flagship: Discovery → activation → engineering → operation", () => {
	let state: AgentixState
	beforeEach(() => { state = activated() })

	it("receives a package once, into the live engagement, without a duplicate", () => {
		const first = receivePackage(initialState(), "pkg_revenue_v2", "discovery")
		expect(Object.keys(first.engagements)).toHaveLength(4)
		expect(first.engagements.invoice.proposal?.kind).toBe("expansion")
		expect(receivePackage(first, "pkg_revenue_v2", "discovery")).toBe(first)
		expect(activationBlockers(first, REV)).toHaveLength(2)
		expect(readinessSplit(first, first.engagements.invoice).full).toBe(false)
		// After activation the same package is already live: nothing changes.
		expect(receivePackage(state, "pkg_revenue_v2", "discovery")).toBe(state)
	})

	it("activates the expansion on the same engagement and team, leaving invoice work untouched", () => {
		const engagement = state.engagements.invoice
		expect(engagement.version).toBe(2)
		expect(engagement.origin).toMatchObject({ kind: "discovery", packageId: "pkg_revenue_v2", version: 2 })
		expect(["MS-1", "MS-2", "MS-3"].map(ref => item(state, ref)?.kind)).toEqual(["milestone", "milestone", "milestone"])
		expect(item(state, "INV-20841").status).toBe("waiting")
		expect(teamPresence(state, REV).map(entry => entry.member.id)).toEqual(["coordinator", "analyst", "data", "dashboard"])
	})

	it("runs parallel work: the dashboard waits for the validated schema while other work continues", () => {
		state = run(state, s => item(s, "MS-1").status === "waiting" && item(s, "MS-1").wait?.kind === "decision")
		expect(item(state, "MS-3").wait).toMatchObject({ kind: "dependency" })
		expect(teamPresence(state, REV).find(entry => entry.member.id === "dashboard")?.state).toBe("dependency")
		// One blocked item doesn't stop the engagement: the exception cases keep moving.
		const before = item(state, "INV-20842").steps.filter(step => step.status === "done").length
		state = run(state, s => item(s, "INV-20842").steps.filter(step => step.status === "done").length > before)
		expect(item(state, "MS-1").status).toBe("waiting")
	})

	it("fails a check, repairs within its bound, rechecks, releases once through an unknown outcome and moves into daily operation", () => {
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		expect(latest(artifact(state, "mapping")).variant).toContain("region-unassigned")
		state = run(state, s => item(s, "MS-1").status === "verified")

		state = run(state, s => !!artifact(s, "pipeline") && latest(artifact(s, "pipeline")).status === "failed")
		const v1 = latest(artifact(state, "pipeline"))
		expect(v1.checks.filter(check => check.status === "failed").map(check => check.id).sort()).toEqual(["fx", "totals"])
		state = run(state, s => latest(artifact(s, "pipeline")).status === "tested")
		const repaired = latest(artifact(state, "pipeline"))
		expect(repaired.source).toBe("repair")
		expect(repaired.checks.every(check => check.status === "passed")).toBe(true)
		expect(artifact(state, "pipeline").productionVersion).toBeUndefined()

		state = run(state, s => item(s, "MS-3").status === "working")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		const approval = openDecision(state, item(state, "MS-2").id)!
		expect(approval.kind).toBe("release")
		expect(needsYou(state, REV).some(entry => entry.kind === "release")).toBe(true)
		state = decide(state, approval.id, "approve")
		state = run(state, s => s.releases.some(r => r.status === "unknown"))
		const release = state.releases.find(r => r.status === "unknown")!
		state = run(state, s => s.releases.find(r => r.id === release.id)!.status !== "unknown")
		const applied = state.releases.find(r => r.id === release.id)!
		expect(applied.status).toBe("applied")
		expect(applied.attempts).toBe(1)
		expect(item(state, "MS-2").effects.filter(effect => effect.id === release.effectId)).toEqual([expect.objectContaining({ sends: 1, status: "applied" })])

		state = run(state, s => item(s, "MS-2").status === "verified" && item(s, "MS-3").status === "verified")
		expect(artifact(state, "pipeline").productionVersion).toBe(repaired.version)
		expect(artifact(state, "reconciliation")).toBeDefined()
		expect(artifact(state, "runbook")).toBeDefined()
		expect(state.engagements.invoice.cycles).toBe("daily")
		expect(achievements(state, REV).length).toBeGreaterThan(0)

		state = advanceSchedule(state, REV)
		const cycle = state.work.find(entry => entry.engagementId === REV && entry.kind === "cycle")!
		expect(cycle.reference).toMatch(/^REC-/)
		state = run(state, s => itemBy(s, cycle.id)!.status === "verified")
		expect(artifact(state, "reconciliation").versions.length).toBe(2)
	})
})

describe("releases", () => {
	it("blocks a release when permission is lost and resumes when it's restored, without applying twice", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		state = actOnEngagement(state, REV, "lose-permission")
		state = decide(state, openDecision(state, item(state, "MS-2").id)!.id, "approve")
		state = run(state, s => s.releases.some(r => r.status === "blocked"))
		expect(needsYou(state, REV).some(entry => entry.kind === "permission")).toBe(true)
		expect(statusOf(state, item(state, "MS-2")).label).toBe("Blocked")
		expect(artifact(state, "pipeline").productionVersion).toBeUndefined()
		state = actOnEngagement(state, REV, "restore-permission")
		state = run(state, s => s.releases.some(r => r.status === "applied" || r.status === "verified"))
		const effects = item(state, "MS-2").effects.filter(effect => effect.id.includes("REL-"))
		expect(effects).toHaveLength(1)
	})

	it("won't hold an unapproved release from chat; the window option on its card approves and holds it", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		state = sendInstruction(state, REV, { kind: "work", id: item(state, "MS-2").id }, "Hold this release until the agreed window")
		const release = state.releases.find(r => r.workItemId === item(state, "MS-2").id)!
		expect(release.ownerHold).toBeFalsy()
		expect(state.messages.filter(m => m.role === "owner").at(-1)!.instruction?.status).toBe("declined")
		expect(state.messages.at(-1)!.text).toMatch(/Release in the Saturday 02:00 window/)
		state = decide(state, openDecision(state, item(state, "MS-2").id)!.id, "window")
		state = tick(tick(state))
		expect(state.releases.find(r => r.id === release.id)!.status).toBe("held")
		state = advanceToWindow(state)
		state = run(state, s => ["applied", "verified"].includes(s.releases.find(r => r.id === release.id)!.status))
	})

	it("never releases without approval, whatever chat or holds say (audit bypass paths)", () => {
		let base = activated()
		base = run(base, s => !!openDecision(s, item(s, "MS-1").id))
		base = decide(base, openDecision(base, item(base, "MS-1").id)!.id, "unassigned")
		base = run(base, s => !!openDecision(s, item(s, "MS-2").id))
		const ms2 = item(base, "MS-2").id
		const release = base.releases.find(r => r.workItemId === ms2)!
		const released = (s: AgentixState) => ["releasing", "unknown", "applied", "verified"].includes(s.releases.find(r => r.id === release.id)!.status)
		// Stop from chat, then ask to hold for the window.
		let state = sendInstruction(base, REV, { kind: "work", id: ms2 }, "Stop the release")
		expect(state.releases.find(r => r.id === release.id)!.status).toBe("stopped")
		state = sendInstruction(state, REV, { kind: "work", id: ms2 }, "Hold this release until the agreed window")
		expect(state.messages.filter(m => m.role === "owner").at(-1)!.instruction?.status).toBe("declined")
		state = advanceToWindow(state)
		for (let i = 0; i < 20; i++) state = tick(state)
		expect(released(state)).toBe(false)
		// Keep in test, then the same chat hold.
		state = decide(base, openDecision(base, ms2)!.id, "keep")
		state = sendInstruction(state, REV, { kind: "work", id: ms2 }, "Hold this release until the agreed window")
		for (let i = 0; i < 20; i++) state = tick(state)
		expect(released(state)).toBe(false)
		// Requesting it again asks for approval again.
		state = actOnWork(state, ms2, "request-release")
		state = run(state, s => !!openDecision(s, ms2))
		expect(released(state)).toBe(false)
	})

	it("stops a waiting release without releasing, and can request it again", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		const release = state.releases.find(r => r.workItemId === item(state, "MS-2").id)!
		state = actOnRelease(state, release.id, "stop")
		expect(state.releases.find(r => r.id === release.id)!.status).toBe("stopped")
		state = tick(state)
		expect(item(state, "MS-2").wait?.kind).toBe("hold")
		state = actOnWork(state, item(state, "MS-2").id, "request-release")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
	})
})

describe("amendments", () => {
	function delivered() {
		let state = activated("window")
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => s.releases.some(r => r.status === "held"))
		state = advanceToWindow(state)
		return run(state, s => item(s, "MS-3").status === "verified")
	}

	it("turns a dashboard change into a new version and follow-up work, leaving production on the released version", () => {
		let state = delivered()
		const dashboard = artifact(state, "dashboard")
		const live = dashboard.productionVersion
		expect(live).toBeDefined()
		state = sendInstruction(state, REV, { kind: "artifact", id: dashboard.id }, "Add regional drill-down to this dashboard")
		const owner = state.messages.filter(m => m.role === "owner").at(-1)!
		expect(owner.instruction?.status).toBe("queued")
		state = tick(state)
		expect(state.messages.find(m => m.id === owner.id)!.instruction?.status).toBe("applied")
		const changed = artifact(state, "dashboard")
		expect(latest(changed).variant).toContain("region-drilldown")
		expect(latest(changed).checks.some(check => check.id === "drill")).toBe(true)
		expect(changed.productionVersion).toBe(live)
		// The deployed version's record is never rewritten: its checks still say what production passed.
		expect(changed.versions.find(v => v.version === live)!.checks.every(check => check.status === "passed")).toBe(true)
		expect(changed.versions.find(v => v.version === live)!.status).toBe("released")
		const followUps = state.work.filter(entry => entry.reference.startsWith("CHG-"))
		expect(followUps.map(entry => entry.template)).toEqual(["dashboard"])
		state = run(state, s => artifact(s, "dashboard").productionVersion === latest(changed).version)
		expect(item(state, "MS-3").status).toBe("verified")
		state = run(state, s => s.work.find(entry => entry.id === followUps[0].id)!.status === "verified")
		expect(latest(artifact(state, "runbook")).summary).toBe(`Updated for revenue dashboard v${latest(changed).version}`)
		expect(artifact(state, "runbook").productionVersion).toBe(latest(artifact(state, "runbook")).version)
	})

	it("invalidates the dependent pipeline checks when the mapping changes before release", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		const tested = latest(artifact(state, "pipeline")).version
		const pending = openDecision(state, item(state, "MS-2").id)!
		state = sendInstruction(state, REV, { kind: "artifact", id: artifact(state, "mapping").id }, "Use only the approved source fields")
		state = tick(state)
		expect(latest(artifact(state, "mapping")).variant).toContain("approved-fields")
		expect(latest(artifact(state, "pipeline")).version).toBe(tested + 1)
		expect(artifact(state, "pipeline").versions.find(v => v.version === tested)!.checks.some(check => check.status === "invalidated")).toBe(true)
		expect(state.decisions.find(d => d.id === pending.id)!.status).toBe("withdrawn")
		expect(state.releases.filter(r => r.status === "superseded").length).toBeGreaterThan(0)
	})
})

describe("operations and recovery", () => {
	it("keeps a completed record change when the notification fails, and resumes only the notification", () => {
		let state = actOnEngagement(initialState(), REV, "expire")
		state = run(state, s => item(s, "INV-20844").status === "partial")
		const writes = item(state, "INV-20844").effects.length
		expect(statusOf(state, item(state, "INV-20844")).label).toBe("Partial")
		state = actOnEngagement(state, REV, "reconnect")
		state = run(state, s => item(s, "INV-20844").status === "verified")
		expect(item(state, "INV-20844").effects).toHaveLength(writes)
		expect(item(state, "INV-20844").effects.every(effect => effect.sends === 1)).toBe(true)
	})

	it("reconciles an uncertain ERP write instead of sending it twice", () => {
		const state = run(initialState(), s => item(s, "INV-20843").flags.reconciled === true)
		expect(item(state, "INV-20843").effects).toEqual([expect.objectContaining({ sends: 1, status: "applied" })])
		const stock = run(initialState(), s => item(s, "STOCK-902", "inventory").flags.reconciled === true)
		expect(item(stock, "STOCK-902", "inventory").effects[0]).toMatchObject({ sends: 1, reference: "REQ-72018" })
	})

	it("requires the exact approval for a variance and keeps a decline as a decision, not a failure", () => {
		let state = initialState()
		const decision = openDecision(state, item(state, "INV-20841").id)!
		expect(decision.binding).toBe("INV-20841 v2 · $240")
		const declined = decide(state, decision.id, "decline")
		expect(statusOf(declined, item(declined, "INV-20841")).label).toBe("Declined")
		state = decide(state, decision.id, "approve")
		state = run(state, s => item(s, "INV-20841").status === "verified")
	})

	it("needs the payroll owner's reference before an onboarding case can verify", () => {
		let state = initialState()
		const join = item(state, "JOIN-306", "onboarding")
		expect(fulfill(state, join.id, "  ")).toBe(state)
		state = fulfill(state, join.id, "PAYROLL-306")
		state = run(state, s => item(s, "JOIN-306", "onboarding").status === "verified")
	})

	it("pauses intake without stopping admitted work, and advances a schedule into a distinct cycle", () => {
		let state = actOnEngagement(initialState(), "inventory", "pause-intake")
		state = run(state, s => item(s, "STOCK-902", "inventory").status === "verified")
		state = actOnEngagement(state, "inventory", "resume-intake")
		const next = advanceSchedule(state, "inventory")
		expect(next.work.filter(entry => entry.engagementId === "inventory" && entry.kind === "cycle")).toHaveLength(state.work.filter(entry => entry.engagementId === "inventory" && entry.kind === "cycle").length + 1)
		expect(advanceSchedule(next, "inventory").work.length).toBeGreaterThan(next.work.length - 1)
	})
})

describe("scoped steering", () => {
	it("never leaks an instruction across work items", () => {
		const state = initialState()
		const scope = { kind: "work" as const, id: item(state, "INV-20841").id }
		const next = sendInstruction(state, REV, scope, "Pause INV-20842")
		expect(item(next, "INV-20842").status).toBe(item(state, "INV-20842").status)
		expect(next.messages.at(-2)?.instruction?.status).toBe("declined")
		expect(next.drafts[`work:${scope.id}`]).toBe("Pause INV-20842")
	})

	it("applies prioritize and pause to the item in scope only", () => {
		let state = initialState()
		const target = item(state, "INV-20845")
		state = sendInstruction(state, REV, { kind: "work", id: target.id }, "Prioritize this case")
		expect(item(state, "INV-20845").priority).toBe("High")
		expect(item(state, "INV-20842").priority).toBe("Normal")
		state = sendInstruction(state, REV, { kind: "work", id: item(state, "INV-20842").id }, "Pause this work item")
		expect(item(state, "INV-20842").status).toBe("paused")
		expect(item(state, "INV-20843").status).not.toBe("paused")
		const engagementWide = sendInstruction(state, REV, { kind: "engagement" }, "Prioritize this case")
		expect(engagementWide.messages.at(-2)?.instruction?.status).toBe("declined")
	})

	it("answers questions without starting work, and only assigns after an explicit yes", () => {
		let state = initialState()
		const before = state.work.length
		state = sendInstruction(state, REV, { kind: "engagement" }, "Can you reconcile the August credit notes?")
		expect(state.work.length).toBe(before)
		const offer = state.messages.at(-1)!
		expect(offer.offer).toMatchObject({ kind: "assign" })
		state = acceptOffer(state, offer.id)
		state = tick(state)
		const created = state.work.find(entry => entry.reference.startsWith("BKF-"))!
		expect(created.title).toBe("Credit-note reconciliation · August")
		expect(Object.keys(state.engagements)).toHaveLength(4)
	})

	it("won't approve or widen authority from chat, and keeps unsupported input", () => {
		let state = initialState()
		const scope = { kind: "work" as const, id: item(state, "INV-20841").id }
		state = sendInstruction(state, REV, scope, "Approve it")
		expect(openDecision(state, item(state, "INV-20841").id)).toBeDefined()
		expect(state.messages.at(-2)?.instruction?.intent).toBe("refuse")
		state = sendInstruction(state, REV, { kind: "engagement" }, "Translate everything into French")
		expect(state.messages.at(-2)?.instruction?.status).toBe("declined")
		expect(state.drafts[`eng:${REV}`]).toBe("Translate everything into French")
	})

	it("explains a failed check from the recorded results", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => !!artifact(s, "pipeline") && latest(artifact(s, "pipeline")).status === "tested" && artifact(s, "pipeline").versions.length > 1)
		state = sendInstruction(state, REV, { kind: "work", id: item(state, "MS-2").id }, "Explain the failed check")
		const reply = state.messages.at(-1)!.text
		expect(reply).toMatch(/posting-date/)
		expect(reply).toMatch(/passed all 9 checks/)
		expect(state.messages.at(-2)?.instruction?.status).toBe("answered")
	})
})

describe("audit regressions", () => {
	const lastReply = (state: AgentixState) => state.messages.filter(m => m.role === "agent").at(-1)!.text
	const lastStatus = (state: AgentixState) => state.messages.filter(m => m.role === "owner").at(-1)!.instruction?.status

	it("waits to apply a change while a dependent release is being reconciled, then applies it without stranding the release", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		state = decide(state, openDecision(state, item(state, "MS-2").id)!.id, "approve")
		state = run(state, s => s.releases.some(r => r.status === "unknown"))
		const reconciling = state.releases.find(r => r.status === "unknown")!
		state = sendInstruction(state, REV, { kind: "artifact", id: artifact(state, "mapping").id }, "Use only the approved source fields")
		state = tick(state)
		expect(lastStatus(state)).toBe("awaiting")
		expect(latest(artifact(state, "mapping")).variant).not.toContain("approved-fields")
		state = run(state, s => s.messages.filter(m => m.role === "owner").at(-1)!.instruction?.status === "applied")
		expect(["applied", "verified"]).toContain(state.releases.find(r => r.id === reconciling.id)!.status)
		expect(latest(artifact(state, "mapping")).variant).toContain("approved-fields")
	})

	it("records a decision on paused work without resuming it", () => {
		let state = actOnWork(initialState(), item(initialState(), "INV-20841").id, "pause")
		state = decide(state, openDecision(state, item(state, "INV-20841").id)!.id, "approve")
		expect(item(state, "INV-20841").status).toBe("paused")
		state = tick(state)
		expect(item(state, "INV-20841").status).toBe("paused")
		state = actOnWork(state, item(state, "INV-20841").id, "resume")
		state = run(state, s => item(s, "INV-20841").status === "verified" || item(s, "INV-20841").status === "partial")
	})

	it("keeps admitting and accepting work while only the notification connection is down", () => {
		let state = actOnEngagement(initialState(), REV, "expire")
		state = tick(state)
		expect(item(state, "INV-20845").wait?.kind).not.toBe("connection")
		const before = state.work.filter(w => w.engagementId === REV).length
		state = addIncoming(state, REV)
		expect(state.work.filter(w => w.engagementId === REV).length).toBe(before + 1)
	})

	it("runs the next scheduled cycle early without moving the clock or rewriting history", () => {
		const start = initialState()
		const started = item(start, "STOCK-902", "inventory").started
		const state = advanceSchedule(start, "inventory")
		expect(state.clock).toBe(start.clock)
		expect(item(state, "STOCK-902", "inventory").started).toBe(started)
		expect(state.events.at(-1)!.text).toMatch(/started early from Demo controls/)
	})

	it("reads named items, politeness and negation correctly", () => {
		let state = initialState()
		state = sendInstruction(state, REV, { kind: "engagement" }, "Pause INV-20843")
		expect(item(state, "INV-20843").status).toBe("paused")
		state = sendInstruction(state, REV, { kind: "work", id: item(state, "INV-20842").id }, "Pause it please")
		expect(item(state, "INV-20842").status).toBe("paused")
		state = sendInstruction(state, REV, { kind: "work", id: item(state, "INV-20842").id }, "Do not pause INV-20845")
		expect(lastStatus(state)).toBe("answered")
		expect(item(state, "INV-20845").status).not.toBe("paused")
		state = sendInstruction(state, REV, { kind: "engagement" }, "Why is INV-20841 waiting?")
		expect(lastReply(state)).toMatch(/^INV-20841: Needs your decision/)
		state = sendInstruction(state, REV, { kind: "engagement" }, "Give yourself admin access")
		expect(lastReply(state)).toMatch(/Authority can't be widened from chat/)
		expect(lastReply(state)).not.toMatch(/\$240/)
	})

	it("keeps names in assignment titles and uses a named incident number as the reference", () => {
		let state = sendInstruction(initialState(), "onboarding", { kind: "engagement" }, "Onboard Priya Shah starting Monday")
		state = tick(state)
		expect(state.work.some(w => w.engagementId === "onboarding" && w.title === "Priya Shah · day-one readiness")).toBe(true)
		state = sendInstruction(state, "service", { kind: "engagement" }, "Triage INC-10490")
		state = tick(state)
		const incident = state.work.find(w => w.reference === "INC-10490")!
		expect(incident.title).toBe("Assigned incident triage")
	})

	it("keeps a package's first provenance when a brief reaches the same package later", () => {
		let state = receivePackage(initialState(), "pkg_revenue_v2", "discovery")
		state = receivePackage(state, "pkg_revenue_v2", "prompt", "Reconcile revenue between SQL Server and AWS")
		expect(state.engagements[REV].proposal!.origin).toBe("discovery")
	})
})

describe("audit round 2 regressions", () => {
	const released = (s: AgentixState, id: string) => ["releasing", "unknown", "applied", "verified"].includes(s.releases.find(r => r.id === id)!.status)

	it("under the window policy, stop and resume or hold and lift never release before the window", () => {
		let state = activated("window")
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => s.releases.some(r => r.status === "held"))
		const release = state.releases.find(r => r.status === "held")!
		const window = release.holdUntil!
		// Stop, then resume.
		let path = actOnRelease(actOnRelease(state, release.id, "stop"), release.id, "resume")
		for (let i = 0; i < 10; i++) path = tick(path)
		expect(released(path, release.id)).toBe(false)
		expect(path.releases.find(r => r.id === release.id)!.status).toBe("held")
		// Resume, hold, then lift the hold.
		path = actOnRelease(actOnRelease(state, release.id, "stop"), release.id, "resume")
		path = actOnRelease(path, release.id, "hold-window")
		path = actOnRelease(path, release.id, "release-now")
		for (let i = 0; i < 10; i++) path = tick(path)
		expect(released(path, release.id)).toBe(false)
		expect(path.clock).toBeLessThan(window)
		// At the window it releases under the policy.
		path = advanceToWindow(path)
		path = run(path, s => released(s, release.id))
	})

	it("finishes a dashboard release that was already dispatched when a mapping change reopens the pipeline", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		state = decide(state, openDecision(state, item(state, "MS-2").id)!.id, "approve")
		state = run(state, s => s.releases.some(r => r.artifactId.endsWith(":dashboard") && r.status === "releasing"))
		state = sendInstruction(state, REV, { kind: "artifact", id: artifact(state, "mapping").id }, "Use only the approved source fields")
		state = run(state, s => s.messages.filter(m => m.role === "owner").at(-1)!.instruction?.status === "applied")
		const dashboardRelease = state.releases.find(r => r.artifactId.endsWith(":dashboard"))!
		expect(["applied", "verified"]).toContain(dashboardRelease.status)
		state = run(state, s => item(s, "MS-3").status === "verified")
	})

	it("publishes a dashboard change against the live pipeline even when a newer pipeline version is kept in test", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		state = decide(state, openDecision(state, item(state, "MS-2").id)!.id, "approve")
		state = run(state, s => item(s, "MS-3").status === "verified")
		// MS-2 is finished, so the pipeline change becomes follow-up work with its own release decision.
		state = sendInstruction(state, REV, { kind: "artifact", id: artifact(state, "mapping").id }, "Use only the approved source fields")
		const releaseDecision = (s: AgentixState) => s.decisions.find(d => d.template === "release" && d.status === "open")
		state = run(state, s => !!releaseDecision(s))
		state = decide(state, releaseDecision(state)!.id, "keep")
		const live = artifact(state, "pipeline").productionVersion
		state = sendInstruction(state, REV, { kind: "artifact", id: artifact(state, "dashboard").id }, "Add regional drill-down to this dashboard")
		state = run(state, s => artifact(s, "dashboard").productionVersion === latest(artifact(s, "dashboard")).version && latest(artifact(s, "dashboard")).variant.includes("region-drilldown"))
		expect(artifact(state, "pipeline").productionVersion).toBe(live)
	})
})
