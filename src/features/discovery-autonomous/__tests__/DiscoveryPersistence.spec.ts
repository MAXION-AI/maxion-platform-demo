import { beforeEach, describe, expect, it } from "vitest"

import { demoStateRepository } from "@/features/platform-prototype/persistence/DemoStateRepository"

import { listDiscoveryJumpRecords } from "../DiscoveryAutonomousPrototypePage"

const legacyKey = "maxion.prototype.discovery-records.v1"
const storageKey = demoStateRepository.storageKey("discovery-records")

const validRecord = {
	id: "legacy-discovery",
	title: "Legacy migration proof",
	brief: "Validate the legacy Discovery migration boundary.",
	scenarioKey: "tprm",
	view: "overview",
	phase: 4,
	paused: false,
	decision: "pending",
	people: [{
		id: "owner-1",
		name: "Priya Shah",
		initials: "PS",
		role: "Control owner",
		department: "Finance",
		email: "priya@example.com",
		influence: "High",
		focus: "Retention evidence",
		channel: "Text",
	}],
	messages: [{
		id: "message-1",
		actor: "max",
		text: "Evidence review is complete.",
		trace: ["Read source evidence"],
		prompt: "Confirm the retention boundary.",
		question: { current: 1, total: 2, topic: "Retention" },
	}],
	interviewIndex: 0,
	interviewClosed: true,
	clarificationPending: false,
	packageSelection: 0,
	invitesSent: false,
	createdAt: "2026-09-14T12:00:00.000Z",
	updatedAt: "2026-09-14T12:05:00.000Z",
}

function storeEnvelope(value: unknown) {
	localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 1, tenantId: "maxion-demo", slice: "discovery-records", value }))
}

describe("Discovery persistence", () => {
	beforeEach(() => localStorage.clear())

	it("migrates a deeply valid legacy record into the tenant envelope", () => {
		localStorage.setItem(legacyKey, JSON.stringify([validRecord]))

		expect(listDiscoveryJumpRecords()).toEqual([expect.objectContaining({ id: "legacy-discovery", title: "Legacy migration proof" })])
		expect(localStorage.getItem(legacyKey)).toBeNull()
		expect(localStorage.getItem(storageKey)).not.toBeNull()
	})

	it.each([
		["a null record", [null]],
		["a null person", [{ ...validRecord, people: [null] }]],
		["a null message", [{ ...validRecord, messages: [null] }]],
		["an oversized nested person", [{ ...validRecord, people: [{ ...validRecord.people[0], focus: "x".repeat(4_001) }] }]],
		["an oversized nested message", [{ ...validRecord, messages: [{ ...validRecord.messages[0], text: "x".repeat(12_001) }] }]],
		["an invalid nested question bound", [{ ...validRecord, messages: [{ ...validRecord.messages[0], question: { current: 3, total: 2, topic: "Retention" } }] }]],
		["an invalid date", [{ ...validRecord, updatedAt: "not-a-date" }]],
		["an out-of-range phase", [{ ...validRecord, phase: 999 }]],
	])("rejects %s without overwriting another slice", (_label, hostileValue) => {
		expect(demoStateRepository.save("preserved", "keep").ok).toBe(true)
		storeEnvelope(hostileValue)

		const records = listDiscoveryJumpRecords()
		expect(records.some((record) => record.id === "legacy-discovery")).toBe(false)
		expect(demoStateRepository.load("preserved", { parse: (value) => typeof value === "string" ? value : null }, () => "lost").value).toBe("keep")
	})

	it("does not migrate or delete invalid legacy records", () => {
		const raw = JSON.stringify([{ ...validRecord, people: [null] }])
		localStorage.setItem(legacyKey, raw)

		expect(listDiscoveryJumpRecords().some((record) => record.id === "legacy-discovery")).toBe(false)
		expect(localStorage.getItem(legacyKey)).toBe(raw)
		expect(localStorage.getItem(storageKey)).toBeNull()
	})
})
