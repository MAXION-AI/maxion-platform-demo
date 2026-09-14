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

	it("migrates valid raw legacy JSON without changing another slice", () => {
		const repository = createDemoStateRepository("tenant-a", localStorage)
		repository.save("preserved", "keep")
		localStorage.setItem("legacy-shell", JSON.stringify("legacy"))

		expect(repository.load("shell", stringCodec, () => "fallback", undefined, ["legacy-shell"])).toEqual({ value: "legacy", status: "migrated" })
		expect(localStorage.getItem("legacy-shell")).toBeNull()
		expect(repository.load("shell", stringCodec, () => "fallback")).toEqual({ value: "legacy", status: "loaded" })
		expect(repository.load("preserved", stringCodec, () => "lost").value).toBe("keep")
	})

	it("leaves invalid legacy data and unrelated slices untouched", () => {
		const repository = createDemoStateRepository("tenant-a", localStorage)
		repository.save("preserved", "keep")
		for (const raw of ["not-json", JSON.stringify({ value: "wrong shape" }), JSON.stringify("x".repeat(21))]) {
			localStorage.setItem("legacy-shell", raw)
			expect(repository.load("shell", stringCodec, () => "fallback", undefined, ["legacy-shell"])).toEqual({ value: "fallback", status: "empty" })
			expect(localStorage.getItem("legacy-shell")).toBe(raw)
			expect(localStorage.getItem(repository.storageKey("shell"))).toBeNull()
		}
		expect(repository.load("preserved", stringCodec, () => "lost").value).toBe("keep")
	})

	it("removes a legacy key only after the tenant envelope is saved", () => {
		const values = new Map<string, string>([["legacy-shell", JSON.stringify("legacy")]])
		const storage = {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: () => { throw new Error("quota denied") },
			removeItem: (key: string) => { values.delete(key) },
		}
		const repository = createDemoStateRepository("tenant-a", storage)

		expect(repository.load("shell", stringCodec, () => "fallback", undefined, ["legacy-shell"])).toMatchObject({ value: "legacy", status: "recovered" })
		expect(values.has("legacy-shell")).toBe(true)
	})
})
