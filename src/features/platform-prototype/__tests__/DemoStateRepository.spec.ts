import { beforeEach, describe, expect, it } from "vitest"

import { createDemoStateRepository, type StateCodec } from "../persistence/DemoStateRepository"

const stringCodec: StateCodec<string> = {
	parse: (value) => typeof value === "string" && value.length <= 20 ? value : null,
	migrate: (version, value) => version === 0 && typeof value === "string" ? value.slice(0, 20) : null,
}

describe("DemoStateRepository", () => {
	beforeEach(() => localStorage.clear())

	it("round-trips only versioned, tenant-keyed slices", () => {
		const repository = createDemoStateRepository("tenant-a", localStorage)
		expect(repository.save("shell", "ready")).toEqual({ ok: true })
		expect(repository.load("shell", stringCodec, () => "fallback")).toEqual({ value: "ready", status: "loaded" })
		expect(repository.storageKey("shell")).toBe("maxion-demo:tenant-a:shell:v1")
	})

	it("rejects malformed, oversized, and cross-tenant values without affecting another slice", () => {
		const repository = createDemoStateRepository("tenant-a", localStorage)
		repository.save("preserved", "keep")
		const key = repository.storageKey("shell")
		localStorage.setItem(key, "not-json")
		expect(repository.load("shell", stringCodec, () => "fallback")).toMatchObject({ value: "fallback", status: "recovered", reason: "malformed" })
		localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, tenantId: "tenant-b", slice: "shell", value: "poison" }))
		expect(repository.load("shell", stringCodec, () => "fallback")).toMatchObject({ reason: "wrong-tenant" })
		localStorage.setItem(key, "x".repeat(32))
		expect(repository.load("shell", stringCodec, () => "fallback", 16)).toMatchObject({ reason: "oversized" })
		expect(repository.load("preserved", stringCodec, () => "lost").value).toBe("keep")
	})

	it("migrates a supported prior envelope and refuses unsafe keys or writes", () => {
		const repository = createDemoStateRepository("tenant-a", localStorage)
		const key = repository.storageKey("shell")
		localStorage.setItem(key, JSON.stringify({ schemaVersion: 0, tenantId: "tenant-a", slice: "shell", value: "legacy-value-that-is-long" }))
		expect(repository.load("shell", stringCodec, () => "fallback")).toEqual({ value: "legacy-value-that-is", status: "migrated" })
		expect(repository.save("shell", "x".repeat(200), 32)).toEqual({ ok: false, reason: "oversized" })
		expect(() => repository.storageKey("../other-tenant")).toThrow("Invalid demo state slice")
		expect(() => createDemoStateRepository("INVALID", localStorage)).toThrow("Invalid demo tenant id")
	})
})
