import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readOrganization, resetOrganizationStore, setClasses } from "@/features/organization/store"
import { acknowledgeChange, actOnEngagement, actOnWork, activate, addIncoming, answerQuestion, armFailure, armSaveFailure, budgetExhausted, changePendingRequest, checkFileSave, decide, investigateEffect, latest, loseSandbox, pendingRequest, publishesFiles, receivePackage, recordDownload, requestFileSave, retryFileSave, sandboxCase, spendOf, tick, type FileDestination } from "../engine/engine"
import { fileFor, publishBlock } from "../engine/files"
import { initialState } from "../engine/seed"
import { achievements, changedRequests, custodyOf, needsYou, pendingBinding, readinessSplit, releaseSentence, releaseView, statusOf } from "../engine/selectors"
import { validState } from "../engine/storage"
import type { AgentixState, EffectState, WorkItem } from "../engine/types"
import { DecisionCard } from "../Decisions"
import { saveRoute } from "../PublishFiles"
import { ResultsView, type ResultCallbacks } from "../ResultsView"
import { DemoControls } from "../Sheets"
import { WorkDetail, type DetailCallbacks } from "../WorkDetail"

const REV = "invoice"
const run = (state: AgentixState, until: (s: AgentixState) => boolean, max = 150) => {
	let current = state
	for (let i = 0; i < max && !until(current); i++) current = tick(current)
	if (!until(current)) throw new Error("condition not reached")
	return current
}
const item = (state: AgentixState, reference: string, engagementId = REV) => state.work.find(entry => entry.engagementId === engagementId && entry.reference === reference) as WorkItem
const artifact = (state: AgentixState, key: string) => state.artifacts.find(entry => entry.id === `${REV}:${key}`)!
const openDecision = (state: AgentixState, workId: string) => state.decisions.find(entry => entry.workItemId === workId && entry.status === "open")
const unknownEffect = (entry: WorkItem): EffectState | undefined => entry.effects.find(effect => effect.status === "unknown")

function activated(release: "approval" | "window" = "approval") {
	let state = receivePackage(initialState(), "pkg_revenue_v2", "discovery")
	state = answerQuestion(state, REV, "release", release)
	state = answerQuestion(state, REV, "testdata", "synthetic")
	return activate(state, REV)
}
/* Up to the moment the pipeline release asks for approval. */
function atReleaseApproval() {
	let state = activated()
	state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
	state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
	return run(state, s => !!openDecision(s, item(s, "MS-2").id))
}
/* Approved, dispatched, and stopped at an unknown outcome. */
function atUnknownOutcome() {
	const state = atReleaseApproval()
	return run(decide(state, openDecision(state, item(state, "MS-2").id)!.id, "approve"), s => s.releases.some(release => release.status === "unknown"))
}
const settle = (state: AgentixState) => { const ms2 = item(state, "MS-2"); return investigateEffect(state, ms2.id, unknownEffect(ms2)!.id) }
/* The whole delivery, read-back included. */
function delivered() {
	const state = settle(atUnknownOutcome())
	return run(state, s => item(s, "MS-3").status === "verified" && item(s, "MS-2").status === "verified")
}
/* The seeded read-back settles first, then the next record write loses its acknowledgement. */
function lostWrite() {
	const settled = run(initialState(), s => item(s, "STOCK-902", "inventory").flags.reconciled === true)
	return run(armFailure(settled, "writeLoss"), s => s.work.some(entry => !!unknownEffect(entry)))
}
const SHAREPOINT: FileDestination = { target: "sharepoint", connectionId: "conn-sharepoint", location: "northstar.sharepoint.com/Agentix/Revenue reconciliation" }

describe("generated apps publish only as files (D-095)", () => {
	it("ends a dashboard as a published file version, and a governed effect keeps its release", () => {
		const state = delivered()
		const dashboard = artifact(state, "dashboard")
		const release = state.releases.find(entry => entry.artifactId === dashboard.id)!
		expect(publishesFiles(state, dashboard)).toBe(true)
		expect(release.target).toBe("Versioned files · Revenue dashboard")
		expect(releaseView(state, release).label).toBe("Published")
		expect(releaseSentence(state, release)).toMatch(/^Published file version/)
		expect(achievements(state, REV, 10).map(entry => entry.title)).toContain(`Revenue dashboard v${release.version} published`)
		const pipeline = state.releases.find(entry => entry.artifactId === artifact(state, "pipeline").id)!
		expect(publishesFiles(state, artifact(state, "pipeline"))).toBe(false)
		expect(pipeline.target).toMatch(/^AWS PostgreSQL revenue schema/)
		expect(state.events.map(event => event.text).join(" ")).not.toMatch(/finance workspace|is live in versioned/i)
	})

	it("doesn't need the release adapter to publish a file", () => {
		let state = settle(atUnknownOutcome())
		state = run(state, s => artifact(s, "pipeline").productionVersion !== undefined)
		expect(artifact(state, "dashboard").productionVersion).toBeUndefined()
		state = actOnEngagement(state, REV, "lose-permission")
		state = run(state, s => artifact(s, "dashboard")?.productionVersion !== undefined)
		expect(state.releases.filter(entry => entry.status === "blocked")).toHaveLength(0)
	})
})

describe("files generated from a version", () => {
	it("makes a mapping a CSV, a dashboard a self-contained page and a pipeline a Markdown document", () => {
		const state = delivered()
		const mapping = fileFor(state, artifact(state, "mapping"), latest(artifact(state, "mapping")))
		expect(mapping.name).toMatch(/^source-to-target-mapping-v\d+\.csv$/)
		expect(mapping.content.split("\n")[0]).toContain("Rule")
		expect(mapping.content).toContain("region")
		const page = fileFor(state, artifact(state, "dashboard"), latest(artifact(state, "dashboard")))
		expect(page.format).toBe("html")
		expect(page.content).toContain("<!doctype html>")
		expect(page.content).toContain("AMER")
		expect(page.content).toContain("does not update")
		const pipeline = fileFor(state, artifact(state, "pipeline"), latest(artifact(state, "pipeline")))
		expect(pipeline.format).toBe("md")
		expect(pipeline.content).toContain("Passed: Row counts match the ledger")
		expect(pipeline.bytes).toBe(new TextEncoder().encode(pipeline.content).length)
		expect(fileFor(state, artifact(state, "runbook"), latest(artifact(state, "runbook"))).content).toContain("What needs a person")
		expect(fileFor(state, artifact(state, "reconciliation"), latest(artifact(state, "reconciliation"))).content).toContain("Company total")
	})

	it("refuses a version that isn't tested, and says why", () => {
		const state = run(activated(), s => !!openDecision(s, item(s, "MS-1").id))
		const mapping = artifact(state, "mapping")
		expect(publishBlock(state, mapping, latest(mapping))).toMatch(/hasn't finished its checks/)
		expect(requestFileSave(state, mapping.id, 1, SHAREPOINT)).toBe(state)
		expect(recordDownload(state, mapping.id, 1)).toBe(state)
		let failing = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		failing = run(failing, s => !!s.artifacts.find(entry => entry.key === "pipeline") && latest(artifact(s, "pipeline")).status === "failed")
		const pipeline = artifact(failing, "pipeline")
		expect(publishBlock(failing, pipeline, latest(pipeline))).toMatch(/failed 2 of 9 checks: .*Only a tested version can be published/)
	})
})

describe("saving a version to OneDrive or SharePoint", () => {
	const ready = () => { const state = delivered(); const dashboard = artifact(state, "dashboard"); return { state: run(state, s => !publishBlock(s, artifact(s, "dashboard"), latest(artifact(s, "dashboard")))), id: dashboard.id, version: dashboard.productionVersion! } }

	it("reads preparing, then saving, and saved only once the destination confirms it", () => {
		const { state, id, version } = ready()
		let next = requestFileSave(state, id, version, SHAREPOINT)
		const publication = () => next.publications!.find(entry => entry.artifactId === id)!
		expect(publication().status).toBe("preparing")
		next = tick(next)
		expect(publication().status).toBe("saving")
		expect(publication().savedAt).toBeUndefined()
		next = tick(next)
		expect(publication()).toMatchObject({ status: "saved", attempts: 1 })
		expect(publication().location).toBe(`northstar.sharepoint.com/Agentix/Revenue reconciliation/${publication().fileName}`)
		const events = next.events.filter(event => event.artifactId === id && event.text.includes("saved to"))
		expect(events).toHaveLength(1)
		expect(events[0].workItemId).toBeDefined()
		expect(validState(next)).toBe(true)
	})

	it("never makes a second copy when asked twice", () => {
		const { state, id, version } = ready()
		const once = requestFileSave(state, id, version, SHAREPOINT)
		expect(requestFileSave(once, id, version, SHAREPOINT)).toBe(once)
		const saved = tick(tick(once))
		expect(requestFileSave(saved, id, version, SHAREPOINT)).toBe(saved)
		expect(saved.publications!.filter(entry => entry.artifactId === id)).toHaveLength(1)
	})

	it("offers a retry after a refusal, where nothing was written", () => {
		const { state, id, version } = ready()
		let next = armSaveFailure(requestFileSave(state, id, version, SHAREPOINT), "refused")
		next = tick(tick(next))
		const failed = next.publications![0]
		expect(failed).toMatchObject({ status: "failed", retrySafe: true })
		expect(failed.failure).toMatch(/refused/)
		next = retryFileSave(next, failed.id)
		expect(next.publications![0]).toMatchObject({ status: "preparing", attempts: 2 })
		next = tick(tick(next))
		expect(next.publications![0].status).toBe("saved")
		expect(next.publications).toHaveLength(1)
	})

	it("doesn't offer a retry after a timeout until the destination is checked", () => {
		const { state, id, version } = ready()
		let next = armSaveFailure(requestFileSave(state, id, version, SHAREPOINT), "timeout")
		next = tick(tick(next))
		const uncertain = next.publications![0]
		expect(uncertain).toMatchObject({ status: "uncertain", retrySafe: false })
		expect(retryFileSave(next, uncertain.id)).toBe(next)
		for (let i = 0; i < 5; i++) next = tick(next)
		expect(next.publications![0].status).toBe("uncertain")
		next = checkFileSave(next, uncertain.id)
		expect(next.publications![0].status).toBe("checking")
		next = tick(next)
		expect(next.publications![0].status).toBe("saved")
	})

	it("offers a retry once the check confirms nothing landed", () => {
		const { state, id, version } = ready()
		let next = armSaveFailure(requestFileSave(state, id, version, SHAREPOINT), "timeout")
		next = armFailure(tick(tick(next)), "readBackMiss")
		next = tick(checkFileSave(next, next.publications![0].id))
		expect(next.publications![0]).toMatchObject({ status: "failed", retrySafe: true })
	})

	it("records a download as a real event each time, on one record", () => {
		const { state, id, version } = ready()
		let next = recordDownload(state, id, version)
		next = recordDownload(next, id, version)
		expect(next.publications).toHaveLength(1)
		expect(next.publications![0]).toMatchObject({ target: "download", status: "saved", downloads: 2 })
		expect(next.events.filter(event => event.text.includes("downloaded from"))).toHaveLength(2)
	})

	describe("which connection can write", () => {
		beforeEach(() => resetOrganizationStore())
		it("uses an active connection with write access, and explains every other case", () => {
			const org = readOrganization()
			const sharepoint = saveRoute(org, "sharepoint", "Revenue reconciliation")
			expect(sharepoint).toMatchObject({ ok: true, location: "northstar.sharepoint.com/Agentix/Revenue reconciliation" })
			// The seeded OneDrive connection is someone else's.
			expect(saveRoute(org, "onedrive", "x")).toMatchObject({ ok: false, connect: true, reason: expect.stringContaining("Andre Reyes") })
			const expired = { ...org, connections: org.connections.map(entry => entry.connector === "sharepoint" ? { ...entry, state: "needs_reconnect" as const } : entry) }
			expect(saveRoute(expired, "sharepoint", "x")).toMatchObject({ ok: false, reason: expect.stringContaining("expired") })
			const readOnly = { ...org, connections: org.connections.map(entry => entry.connector === "sharepoint" ? { ...entry, classes: ["read" as const] } : entry) }
			expect(saveRoute(readOnly, "sharepoint", "x")).toMatchObject({ ok: false, reason: expect.stringContaining("read only") })
			const policy = { ...org, policy: { ...org.policy, integrations: { ...org.policy.integrations, classes: "read" as const } } }
			expect(saveRoute(policy, "sharepoint", "x")).toMatchObject({ ok: false, reason: expect.stringContaining("policy") })
		})
	})
})

describe("a request that changed while it waited", () => {
	it("withdraws a release approval, refuses the old version on the record and asks again on the new one", () => {
		let state = atReleaseApproval()
		const ms2 = item(state, "MS-2").id
		const old = openDecision(state, ms2)!
		const oldVersion = latest(artifact(state, "pipeline")).version
		state = changePendingRequest(state, REV)
		const changed = state.decisions.find(entry => entry.id === old.id)!
		expect(changed.status).toBe("withdrawn")
		expect(changed.changed).toMatchObject({ from: old.binding, to: `Ingestion and transformation pipeline v${oldVersion + 1}` })
		expect(changedRequests(state, ms2)).toHaveLength(1)
		expect(needsYou(state, REV).some(entry => entry.kind === "changed" && entry.title.startsWith("This request changed"))).toBe(true)
		// The late approval changes nothing and says so.
		const late = decide(state, old.id, "approve")
		expect(late).not.toBe(state)
		expect(late.decisions.find(entry => entry.id === old.id)!.changed!.refused).toMatchObject({ option: "approve" })
		expect(late.events.at(-1)!.text).toMatch(/^Approval refused\./)
		expect(late.releases.find(entry => entry.decisionId === old.id)!.status).toBe("superseded")
		expect(artifact(late, "pipeline").productionVersion).toBeUndefined()
		// The new version is tested and asks for its own approval.
		const again = run(late, s => !!openDecision(s, ms2))
		const next = openDecision(again, ms2)!
		expect(next.id).not.toBe(old.id)
		expect(next.binding).toContain(`v${oldVersion + 1}`)
		expect(latest(artifact(again, "pipeline")).status).toBe("tested")
		// Its replacement takes over in the inbox, and reviewing clears the notice.
		expect(needsYou(again, REV).some(entry => entry.kind === "changed")).toBe(false)
		expect(changedRequests(acknowledgeChange(again, old.id), ms2)).toHaveLength(0)
	})

	it("revises a request with no artifact at once, and only the revision can be approved", () => {
		let state = initialState()
		const work = item(state, "INV-20841")
		const old = openDecision(state, work.id)!
		state = changePendingRequest(state, REV, old.id)
		const next = openDecision(state, work.id)!
		expect(next.id).not.toBe(old.id)
		expect(next.binding).toBe(`${old.binding} · revision 2`)
		expect(next.revision?.number).toBe(2)
		expect(item(state, "INV-20841").wait).toEqual({ kind: "decision", decisionId: next.id })
		const late = decide(state, old.id, "approve")
		expect(item(late, "INV-20841").flags.approved).toBeFalsy()
		const approved = decide(state, next.id, "approve")
		expect(item(approved, "INV-20841").flags.approved).toBe(true)
	})

	it("refuses an answer given against a version that isn't the one on the table", () => {
		const state = initialState()
		const open = openDecision(state, item(state, "INV-20841").id)!
		const refused = decide(state, open.id, "approve", "INV-20841 v1 · $200")
		expect(refused.decisions.find(entry => entry.id === open.id)!.status).toBe("open")
		expect(refused.events.at(-1)!.text).toMatch(/^Not recorded\. INV-20841 v1 · \$200/)
		expect(decide(state, open.id, "approve", open.binding).decisions.find(entry => entry.id === open.id)!.status).toBe("resolved")
	})

	it("re-asks a question bound to an artifact on its new version", () => {
		let state = run(activated(), s => !!openDecision(s, item(s, "MS-1").id))
		const question = openDecision(state, item(state, "MS-1").id)!
		expect(question.binding).toBe("Source-to-target mapping v1")
		state = changePendingRequest(state, REV, question.id)
		state = tick(state)
		const next = openDecision(state, item(state, "MS-1").id)!
		expect(next.binding).toBe("Source-to-target mapping v2")
		expect(item(state, "MS-1").wait).toEqual({ kind: "decision", decisionId: next.id })
	})
})

describe("an uncertain write", () => {
	it("stops at an unknown outcome until a person asks, and never resends", () => {
		let state = atUnknownOutcome()
		const release = state.releases.find(entry => entry.status === "unknown")!
		for (let i = 0; i < 25; i++) state = tick(state)
		expect(state.releases.find(entry => entry.id === release.id)!.status).toBe("unknown")
		const ms2 = item(state, "MS-2")
		expect(ms2.status).toBe("waiting")
		expect(ms2.wait).toEqual({ kind: "effect", effectId: release.effectId })
		expect(statusOf(state, ms2)).toMatchObject({ label: "Outcome unknown", needsYou: true })
		expect(needsYou(state, REV).find(entry => entry.kind === "effect")).toMatchObject({ action: "Investigate" })
		expect(ms2.effects.filter(effect => effect.id === release.effectId)).toEqual([expect.objectContaining({ sends: 1, status: "unknown" })])
		expect(artifact(state, "pipeline").productionVersion).toBeUndefined()
	})

	it("settles as applied once when the read-back finds it", () => {
		let state = settle(atUnknownOutcome())
		const release = state.releases.find(entry => entry.status === "unknown")!
		expect(item(state, "MS-2").stage).toBe("reconciling")
		state = run(state, s => s.releases.find(entry => entry.id === release.id)!.status !== "unknown")
		expect(state.releases.find(entry => entry.id === release.id)).toMatchObject({ status: "applied", attempts: 1 })
		expect(item(state, "MS-2").effects.find(effect => effect.id === release.effectId)).toMatchObject({ sends: 1, status: "applied", readBack: { finding: "applied" } })
		expect(state.events.some(event => /reconciled: read-back found .* no retry was sent/i.test(event.text))).toBe(true)
	})

	it("settles as confirmed not applied, and only a governed new release goes again", () => {
		let state = settle(armFailure(atUnknownOutcome(), "readBackMiss"))
		const release = state.releases.find(entry => entry.status === "unknown")!
		state = run(state, s => s.releases.find(entry => entry.id === release.id)!.status !== "unknown")
		expect(state.releases.find(entry => entry.id === release.id)!.status).toBe("not_applied")
		expect(item(state, "MS-2").effects.find(effect => effect.id === release.effectId)).toMatchObject({ status: "not_applied", sends: 1, readBack: { finding: "not_applied" } })
		expect(artifact(state, "pipeline").productionVersion).toBeUndefined()
		for (let i = 0; i < 10; i++) state = tick(state)
		expect(state.releases.filter(entry => entry.status === "applied")).toHaveLength(0)
		expect(item(state, "MS-2").wait?.kind).toBe("effect")
		state = actOnWork(state, item(state, "MS-2").id, "request-release")
		state = run(state, s => !!openDecision(s, item(s, "MS-2").id))
		const approval = openDecision(state, item(state, "MS-2").id)!
		expect(approval.binding).toMatch(/^REL-2/)
		state = decide(state, approval.id, "approve")
		state = run(state, s => s.releases.some(entry => entry.status === "applied" || entry.status === "verified"))
		const effects = item(state, "MS-2").effects.filter(effect => effect.id.includes("REL-"))
		expect(effects.map(effect => effect.status).sort()).toEqual(["applied", "not_applied"])
		expect(effects.every(effect => effect.sends === 1)).toBe(true)
		expect(validState(state)).toBe(true)
	})

	it("holds a record write the same way, and sends it again only when told", () => {
		let state = lostWrite()
		const work = state.work.find(entry => !!unknownEffect(entry))!
		const effect = unknownEffect(work)!
		expect(state.demo.writeLoss).toBe(false)
		for (let i = 0; i < 8; i++) state = tick(state)
		expect(unknownEffect(state.work.find(entry => entry.id === work.id)!)).toBeDefined()
		state = armFailure(investigateEffect(state, work.id, effect.id), "readBackMiss")
		state = run(state, s => s.work.find(entry => entry.id === work.id)!.effects.some(entry => entry.status === "not_applied"))
		expect(state.work.find(entry => entry.id === work.id)!.wait).toEqual({ kind: "effect", effectId: effect.id })
		for (let i = 0; i < 5; i++) state = tick(state)
		expect(state.work.find(entry => entry.id === work.id)!.effects).toHaveLength(1)
		state = actOnWork(state, work.id, "resend-write")
		state = run(state, s => s.work.find(entry => entry.id === work.id)!.effects.some(entry => entry.status === "applied"))
		const effects = state.work.find(entry => entry.id === work.id)!.effects
		expect(effects.map(entry => entry.status).sort()).toEqual(["applied", "not_applied"])
		expect(effects.every(entry => entry.sends === 1)).toBe(true)
		expect(validState(state)).toBe(true)
	})

	it("ignores a read-back of anything that isn't unknown", () => {
		const state = initialState()
		expect(investigateEffect(state, "missing", "missing")).toBe(state)
		const ms2 = item(atReleaseApproval(), "MS-2")
		expect(investigateEffect(state, ms2.id, "nope")).toBe(state)
	})

	it("lets the seeded read-back that was already asked for settle", () => {
		const state = run(initialState(), s => item(s, "STOCK-902", "inventory").flags.reconciled === true)
		expect(item(state, "STOCK-902", "inventory").effects[0]).toMatchObject({ sends: 1, status: "applied", reference: "REQ-72018", readBack: { finding: "applied" } })
	})
})

describe("confirmed saving and a lost sandbox", () => {
	it("shows output as being prepared and transferred before it's saved, and only then commits a checkpoint", () => {
		let state = run(activated(), s => !!item(s, "MS-1").saves?.length)
		const mapping = artifact(state, "mapping")
		expect(custodyOf(state, mapping, latest(mapping)).state).toBe("preparing")
		expect(item(state, "MS-1").checkpoints ?? []).toHaveLength(0)
		expect(publishBlock(state, mapping, { ...latest(mapping), checks: [], status: "tested" })).toMatch(/still being saved/)
		state = tick(state)
		expect(custodyOf(state, artifact(state, "mapping"), latest(artifact(state, "mapping"))).state).toBe("transferring")
		expect(item(state, "MS-1").checkpoints ?? []).toHaveLength(0)
		state = tick(state)
		const saved = latest(artifact(state, "mapping"))
		expect(custodyOf(state, artifact(state, "mapping"), saved).state).toBe("saved")
		expect(saved.hash).toMatch(/^[0-9a-f]{8}$/)
		expect(item(state, "MS-1").checkpoints?.[0]).toMatchObject({ id: "CP-1", version: 1, session: 1 })
		expect(validState(state)).toBe(true)
	})

	it("names what survived and what's redone, and resumes in a new session under the same case", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => item(s, "MS-2").steps[1].status === "working" && (item(s, "MS-2").checkpoints?.length ?? 0) > 0)
		const before = item(state, "MS-2")
		expect(before.checkpoints!.at(-1)).toMatchObject({ stepTitle: "Build the pipeline" })
		expect(sandboxCase(state, REV, before.id)?.id).toBe(before.id)
		const reference = before.reference
		state = loseSandbox(state, REV, before.id)
		const lost = item(state, reference)
		expect(lost.id).toBe(before.id)
		expect(lost.session).toBe(2)
		expect(lost.recovery).toMatchObject({ status: "resuming", fromSession: 1, toSession: 2, lastConfirmed: expect.stringContaining("pipeline v"), checkpoint: expect.stringMatching(/^CP-/), redo: ["Test in isolation"] })
		expect(lost.steps[0].status).toBe("done")
		expect(lost.steps[1]).toMatchObject({ status: "pending", ticks: 0 })
		const event = state.events.at(-1)!.text
		expect(event).toMatch(/the sandbox for session 1 was lost\. Last confirmed: .*checkpoint CP-\d+\./)
		expect(event).toMatch(/To redo: Test in isolation\./)
		state = tick(state)
		expect(item(state, reference).recovery!.status).toBe("resumed")
		expect(state.events.some(entry => /resumed in session 2 from checkpoint CP-/.test(entry.text))).toBe(true)
		state = run(state, s => latest(artifact(s, "pipeline")).status === "tested")
		expect(latest(artifact(state, "pipeline")).checks.every(check => check.status === "passed")).toBe(true)
		expect(validState(state)).toBe(true)
	})

	it("says there's no checkpoint when none was confirmed, and keeps an open decision", () => {
		let state = run(activated(), s => !!openDecision(s, item(s, "MS-1").id))
		expect(item(state, "MS-1").checkpoints ?? []).toHaveLength(0)
		const question = openDecision(state, item(state, "MS-1").id)!
		state = loseSandbox(state, REV, item(state, "MS-1").id)
		expect(item(state, "MS-1").recovery).toMatchObject({ redo: ["Profile the data and draft the mapping"], inFlight: [expect.stringContaining("mapping v1")] })
		expect(item(state, "MS-1").recovery!.lastConfirmed).toBeUndefined()
		expect(state.events.at(-1)!.text).toMatch(/No checkpoint was confirmed yet/)
		expect(state.decisions.find(entry => entry.id === question.id)!.status).toBe("open")
		state = run(state, s => item(s, "MS-1").steps[1].status === "done")
		expect(openDecision(state, item(state, "MS-1").id)?.id).toBe(question.id)
	})

	it("leaves case work that uses no sandbox alone", () => {
		const state = initialState()
		expect(sandboxCase(state, REV)).toBeUndefined()
		expect(loseSandbox(state, REV)).toBe(state)
	})
})

describe("the paid work allowance", () => {
	it("stops paid work at the limit, keeps reads and what's saved, and picks up where it stopped", () => {
		let state = atReleaseApproval()
		const spent = spendOf(state, REV)
		expect(spent).toBeGreaterThan(0)
		expect(budgetExhausted(state, REV)).toBe(false)
		state = addIncoming(state, REV)
		state = actOnEngagement(state, REV, "exhaust-budget")
		expect(budgetExhausted(state, REV)).toBe(true)
		state = tick(tick(state))
		const stopped = state.work.filter(entry => entry.engagementId === REV && entry.wait?.kind === "budget")
		expect(stopped.length).toBeGreaterThan(0)
		expect(statusOf(state, stopped[0])).toMatchObject({ label: "Limit reached", needsYou: true })
		const used = spendOf(state, REV)
		for (let i = 0; i < 8; i++) state = tick(state)
		expect(spendOf(state, REV)).toBe(used)
		const inbox = needsYou(state, REV).find(entry => entry.kind === "budget")!
		expect(inbox.detail).toContain("units")
		// Other engagements keep going, and decisions and downloads still work.
		expect(budgetExhausted(state, "service")).toBe(false)
		const dashboardFree = openDecision(state, item(state, "MS-2").id)
		expect(dashboardFree).toBeDefined()
		const readiness = readinessSplit(state, state.engagements.invoice)
		expect(readiness.rows.find(row => row.id === "budget")).toMatchObject({ state: "blocked" })
		expect(readiness.summary).toMatch(/allowance is used up/)
		state = actOnEngagement(state, REV, "request-budget")
		expect(state.engagements.invoice.budget?.requestedAt).toBeDefined()
		expect(budgetExhausted(state, REV)).toBe(true)
		state = actOnEngagement(state, REV, "grant-budget")
		expect(budgetExhausted(state, REV)).toBe(false)
		state = tick(state)
		expect(state.work.filter(entry => entry.wait?.kind === "budget")).toHaveLength(0)
		const after = spendOf(state, REV)
		state = run(state, s => spendOf(s, REV) > after)
		expect(validState(state)).toBe(true)
	})

	it("still lets a read-back through at the limit", () => {
		let state = actOnEngagement(atUnknownOutcome(), REV, "exhaust-budget")
		state = settle(state)
		const release = state.releases.find(entry => entry.status === "unknown")!
		state = run(state, s => s.releases.find(entry => entry.id === release.id)!.status !== "unknown")
		expect(state.releases.find(entry => entry.id === release.id)!.status).toBe("applied")
	})
})

describe("what My approvals receives", () => {
	it("names the exact target and version a decision binds", () => {
		const state = atReleaseApproval()
		const entry = needsYou(state, REV).find(value => value.kind === "release")!
		expect(pendingBinding(state, entry)).toEqual({ target: expect.stringMatching(/^AWS PostgreSQL revenue schema/), version: expect.stringMatching(/^Ingestion and transformation pipeline v\d+$/) })
		const seeded = initialState()
		const variance = needsYou(seeded, REV).find(value => value.kind === "decision")!
		expect(pendingBinding(seeded, variance)).toEqual({ target: "ERP · Record the resolution in ERP", version: "INV-20841 v2 · $240" })
	})

	it("gives the current version once a request has changed", () => {
		const state = changePendingRequest(atReleaseApproval(), REV)
		const entry = needsYou(state, REV).find(value => value.kind === "changed")!
		expect(pendingBinding(state, entry).version).toBe(`Ingestion and transformation pipeline v${latest(artifact(state, "pipeline")).version}`)
	})
})

describe("saved state", () => {
	it("accepts a session saved before any of this existed", () => {
		const state = initialState()
		const old = JSON.parse(JSON.stringify(state)) as AgentixState
		delete old.publications
		for (const entry of old.work) { delete entry.saves; delete entry.checkpoints; delete entry.session; delete entry.recovery }
		expect(validState(old)).toBe(true)
		expect(validState(tick(old))).toBe(true)
	})

	it("carries a release an earlier version left reconciling onto the person's read-back", () => {
		let state = atUnknownOutcome()
		const ms2 = item(state, "MS-2")
		// An earlier version kept the item working with the stage set; the first tick hands it to a person.
		state = { ...state, work: state.work.map(entry => entry.id === ms2.id ? { ...entry, status: "working" as const, stage: "reconciling" as const, wait: undefined } : entry) }
		state = tick(state)
		expect(item(state, "MS-2")).toMatchObject({ status: "waiting", stage: undefined, wait: { kind: "effect" } })
	})

	it("rejects a malformed publication", () => {
		const state = initialState()
		expect(validState({ ...state, publications: [{ id: "x" }] })).toBe(false)
		expect(validState({ ...state, engagements: { ...state.engagements, invoice: { ...state.engagements.invoice, budget: { allowance: -1 } } } })).toBe(false)
	})
})

describe("on screen", () => {
	const detail = (overrides: Partial<DetailCallbacks> = {}): DetailCallbacks => ({ onDecide: vi.fn(), onFulfill: vi.fn(), onWork: vi.fn(), onRelease: vi.fn(), onRestore: vi.fn(), onReconnect: vi.fn(), onOpenResult: vi.fn(), onOpenWork: vi.fn(), onMessage: vi.fn(), onReviewChange: vi.fn(), onInvestigate: vi.fn(), onBudget: vi.fn(), ...overrides })
	const results = (update: ResultCallbacks["update"] = vi.fn()): ResultCallbacks => ({ onSelect: vi.fn(), onRequestChange: vi.fn(), onOpenWork: vi.fn(), focusRequest: { current: null }, update })

	beforeEach(() => resetOrganizationStore())
	afterEach(() => vi.restoreAllMocks())

	it("shows a changed request with both versions, and refuses the old one in place", () => {
		let state = changePendingRequest(atReleaseApproval(), REV)
		const ms2 = item(state, "MS-2").id
		const old = changedRequests(state, ms2)[0]
		const onDecide = vi.fn((id: string, option: string) => { state = decide(state, id, option) })
		const onReviewChange = vi.fn()
		const { rerender } = render(<WorkDetail state={state} workId={ms2} callbacks={detail({ onDecide, onReviewChange })} />)
		const card = screen.getByRole("region", { name: "This request changed" })
		expect(card).toHaveTextContent(old.binding)
		expect(card).toHaveTextContent(`Ingestion and transformation pipeline v${latest(artifact(state, "pipeline")).version}`)
		fireEvent.click(within(card).getByRole("button", { name: "Approve the old version" }))
		expect(onDecide).toHaveBeenCalledWith(old.id, "approve")
		rerender(<WorkDetail state={state} workId={ms2} callbacks={detail({ onDecide, onReviewChange })} />)
		expect(screen.getByRole("alert")).toHaveTextContent(/Approval refused\..*nothing was approved/)
		expect(screen.queryByRole("button", { name: "Approve the old version" })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /Review the current version/ }))
		expect(onReviewChange).toHaveBeenCalledWith(old.id)
	})

	it("renders a withdrawn decision as changed wherever a decision card is shown", () => {
		const state = changePendingRequest(initialState(), REV, openDecision(initialState(), item(initialState(), "INV-20841").id)!.id)
		const withdrawn = state.decisions.find(entry => entry.status === "withdrawn")!
		render(<DecisionCard state={state} decisionId={withdrawn.id} onDecide={vi.fn()} compact onOpen={vi.fn()} />)
		expect(screen.getByRole("heading", { name: "This request changed" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Approve $240 variance" })).not.toBeInTheDocument()
	})

	it("offers only a read-back while an outcome is unknown, with what's confirmed and unresolved", () => {
		const state = atUnknownOutcome()
		const ms2 = item(state, "MS-2")
		const onInvestigate = vi.fn()
		render(<WorkDetail state={state} workId={ms2.id} callbacks={detail({ onInvestigate })} />)
		const block = screen.getByRole("region", { name: /^Outcome unknown:/ })
		expect(block).toHaveTextContent("Confirmed")
		expect(block).toHaveTextContent("Unresolved")
		expect(screen.queryByRole("button", { name: /retry|send it again|try again/i })).not.toBeInTheDocument()
		fireEvent.click(within(block).getByRole("button", { name: "Investigate" }))
		expect(onInvestigate).toHaveBeenCalledWith(unknownEffect(ms2)!.id)
	})

	it("offers the governed next step once a read-back confirms nothing applied", () => {
		let state = settle(armFailure(atUnknownOutcome(), "readBackMiss"))
		state = run(state, s => s.releases.some(entry => entry.status === "not_applied"))
		const onWork = vi.fn()
		render(<WorkDetail state={state} workId={item(state, "MS-2").id} callbacks={detail({ onWork })} />)
		fireEvent.click(within(screen.getByRole("region", { name: /^Confirmed not applied:/ })).getByRole("button", { name: "Request release again" }))
		expect(onWork).toHaveBeenCalledWith("request-release")
	})

	it("asks before sending a write again", () => {
		let state = lostWrite()
		const work = state.work.find(entry => !!unknownEffect(entry))!
		state = armFailure(investigateEffect(state, work.id, unknownEffect(work)!.id), "readBackMiss")
		state = run(state, s => s.work.find(entry => entry.id === work.id)!.effects.some(entry => entry.status === "not_applied"))
		const onWork = vi.fn()
		render(<WorkDetail state={state} workId={work.id} callbacks={detail({ onWork })} />)
		fireEvent.click(screen.getByRole("button", { name: "Send it again" }))
		expect(onWork).not.toHaveBeenCalled()
		expect(screen.getByRole("button", { name: "Not now" })).toHaveFocus()
		fireEvent.click(screen.getByRole("button", { name: "Send again" }))
		expect(onWork).toHaveBeenCalledWith("resend-write")
	})

	it("shows a case's spend, the limit, what's preserved and who can act", () => {
		const state = tick(actOnEngagement(atReleaseApproval(), REV, "exhaust-budget"))
		const stopped = state.work.find(entry => entry.engagementId === REV && entry.wait?.kind === "budget")!
		const onBudget = vi.fn()
		render(<WorkDetail state={state} workId={stopped.id} callbacks={detail({ onBudget })} />)
		expect(screen.getByText(new RegExp(`^${stopped.costCents} units? used$`))).toBeInTheDocument()
		const block = screen.getByRole("region", { name: /Paid work stopped/ })
		expect(block).toHaveTextContent(`of ${spendOf(state, REV).toLocaleString("en-US")} used`)
		expect(block).toHaveTextContent("Preserved")
		expect(block).toHaveTextContent("Who can act")
		fireEvent.click(within(block).getByRole("button", { name: "Request more units" }))
		expect(onBudget).toHaveBeenCalledWith("request-budget")
		expect(block).not.toHaveTextContent(/\$/)
	})

	it("shows a lost sandbox's recovery and the saved progress on the case", () => {
		let state = run(activated(), s => (item(s, "MS-1").checkpoints?.length ?? 0) > 0)
		state = tick(loseSandbox(state, REV, item(state, "MS-1").id))
		render(<WorkDetail state={state} workId={item(state, "MS-1").id} callbacks={detail()} />)
		const progress = screen.getByRole("region", { name: "Saved progress" })
		expect(progress).toHaveTextContent("Sandbox lost in session 1")
		expect(progress).toHaveTextContent("Resumed in session 2")
		expect(progress).toHaveTextContent("Last confirmed")
		expect(progress).toHaveTextContent("Source-to-target mapping v1")
	})

	it("downloads a real file from a tested version and records it", () => {
		const state = delivered()
		const id = artifact(state, "dashboard").id
		const created: Blob[] = []
		const createObjectURL = vi.fn((blob: Blob) => { created.push(blob); return "blob:demo" })
		Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
		const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
		const update = vi.fn()
		render(<ResultsView state={state} engagementId={REV} resultId={id} callbacks={results(update)} />)
		const files = screen.getByRole("region", { name: "Publish as files" })
		fireEvent.click(within(files).getByRole("button", { name: "Download" }))
		expect(click).toHaveBeenCalledTimes(1)
		expect(created[0].type).toContain("text/html")
		expect(created[0].size).toBeGreaterThan(200)
		expect(update).toHaveBeenCalledTimes(1)
		const next = update.mock.calls[0][0](state) as AgentixState
		expect(next.publications![0]).toMatchObject({ target: "download", artifactId: id })
	})

	it("confirms a save with its exact place and consequence, and explains a connection that can't write", () => {
		const state = delivered()
		const id = artifact(state, "dashboard").id
		const update = vi.fn()
		render(<ResultsView state={state} engagementId={REV} resultId={id} callbacks={results(update)} />)
		const files = screen.getByRole("region", { name: "Publish as files" })
		expect(within(files).getByRole("button", { name: "Save to OneDrive" })).toBeDisabled()
		expect(files).toHaveTextContent("belongs to Andre Reyes")
		expect(within(files).getByRole("button", { name: "Open Integrations" })).toBeInTheDocument()
		fireEvent.click(within(files).getByRole("button", { name: "Save to SharePoint" }))
		const confirm = within(files).getByRole("group", { name: "Confirm saving to SharePoint" })
		expect(confirm).toHaveTextContent("northstar.sharepoint.com/Agentix/Revenue reconciliation")
		expect(confirm).toHaveTextContent("never overwrites")
		expect(update).not.toHaveBeenCalled()
		fireEvent.click(within(confirm).getByRole("button", { name: "Save to SharePoint" }))
		expect(update).toHaveBeenCalledTimes(1)
		const next = update.mock.calls[0][0](state) as AgentixState
		expect(next.publications![0]).toMatchObject({ status: "preparing", target: "sharepoint", connectionId: "conn-sharepoint" })
	})

	it("takes write access away from a connection as soon as Integrations does", () => {
		const state = delivered()
		render(<ResultsView state={state} engagementId={REV} resultId={artifact(state, "dashboard").id} callbacks={results()} />)
		const files = screen.getByRole("region", { name: "Publish as files" })
		expect(within(files).getByRole("button", { name: "Save to SharePoint" })).toBeEnabled()
		act(() => setClasses("conn-sharepoint", ["read"]))
		expect(within(files).getByRole("button", { name: "Save to SharePoint" })).toBeDisabled()
		expect(files).toHaveTextContent("read only")
	})

	it("keeps the last confirmed file on screen when a later save fails, and offers a retry only if it's safe", () => {
		let state = delivered()
		const dashboard = artifact(state, "dashboard")
		state = run(state, s => !publishBlock(s, artifact(s, "dashboard"), latest(artifact(s, "dashboard"))))
		state = tick(tick(requestFileSave(state, dashboard.id, dashboard.productionVersion!, SHAREPOINT)))
		const second = { ...SHAREPOINT, connectionId: "conn-other" }
		state = tick(tick(armSaveFailure(requestFileSave(state, dashboard.id, dashboard.productionVersion!, second), "timeout")))
		render(<ResultsView state={state} engagementId={REV} resultId={dashboard.id} callbacks={results()} />)
		const files = screen.getByRole("region", { name: "Publish as files" })
		expect(files).toHaveTextContent("Outcome unknown")
		expect(within(files).getByRole("alert")).toHaveTextContent(/Last confirmed: revenue-dashboard-v\d+\.html/)
		expect(within(files).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument()
		expect(within(files).getByRole("button", { name: "Check SharePoint" })).toBeInTheDocument()
	})

	it("explains why a failed version can't be published", () => {
		let state = activated()
		state = run(state, s => !!openDecision(s, item(s, "MS-1").id))
		state = decide(state, openDecision(state, item(state, "MS-1").id)!.id, "unassigned")
		state = run(state, s => !!s.artifacts.find(entry => entry.key === "pipeline") && latest(artifact(s, "pipeline")).status === "failed")
		render(<ResultsView state={state} engagementId={REV} resultId={artifact(state, "pipeline").id} callbacks={results()} />)
		const files = screen.getByRole("region", { name: "Publish as files" })
		expect(files).toHaveTextContent(/failed 2 of 9 checks/)
		expect(within(files).queryByRole("button", { name: "Download" })).not.toBeInTheDocument()
	})

	it("gives a presenter a control for each thing that can go wrong", () => {
		const state = atReleaseApproval()
		const calls = { onChangeRequest: vi.fn(), onWriteLoss: vi.fn(), onReadBackMiss: vi.fn(), onSandboxLoss: vi.fn(), onExhaust: vi.fn(), onSaveFailure: vi.fn() }
		const noop = vi.fn()
		render(<DemoControls state={state} titleId="t" focusId={REV} onClose={noop} onTick={noop} onSkip={noop} onWindow={noop} onSchedule={noop} onIncoming={noop} onExpire={noop} onLosePermission={noop} onAckLoss={noop} onReset={noop} {...calls} />)
		const section = screen.getByRole("region", { name: "What can go wrong" })
		expect(section).toHaveTextContent(pendingRequest(state, REV)!.binding)
		fireEvent.click(within(section).getByRole("button", { name: "Change" }))
		expect(calls.onChangeRequest).toHaveBeenCalledWith(REV)
		fireEvent.click(within(section).getByRole("button", { name: "Lose" }))
		expect(calls.onSandboxLoss).toHaveBeenCalledWith(REV)
		fireEvent.click(within(section).getByRole("button", { name: "Use up" }))
		expect(calls.onExhaust).toHaveBeenCalledWith(REV)
	})
})
