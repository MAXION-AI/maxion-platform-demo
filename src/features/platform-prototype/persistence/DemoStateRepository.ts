const DEMO_STATE_SCHEMA_VERSION = 1 as const
const DEMO_TENANT_ID = "maxion-demo"

const DEFAULT_MAX_BYTES = 512_000
const TENANT_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/
const SLICE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/

type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">

type StoredEnvelope = {
	schemaVersion: number
	tenantId: string
	slice: string
	value: unknown
}

export type StateCodec<T> = {
	parse: (value: unknown) => T | null
	migrate?: (version: number, value: unknown) => T | null
}

export type RepositoryLoad<T> = {
	value: T
	status: "empty" | "loaded" | "recovered" | "migrated"
	reason?: "storage-unavailable" | "oversized" | "malformed" | "wrong-tenant" | "wrong-slice" | "unsupported-version" | "invalid-value"
}

export type RepositorySave = {
	ok: boolean
	reason?: "storage-unavailable" | "oversized" | "write-failed"
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * The only browser-storage adapter used by the demo. Storage is a cache of
 * synthetic UI state, never an authority boundary: every read is tenant,
 * schema, size, and slice checked before a caller-provided codec sees it.
 */
class DemoStateRepository {
	private readonly storage: StoragePort | null

	constructor(
		private readonly tenantId: string,
		storage?: StoragePort | null,
	) {
		if (!TENANT_PATTERN.test(tenantId)) throw new Error("Invalid demo tenant id")
		if (storage !== undefined) this.storage = storage
		else {
			try {
				this.storage = typeof window === "undefined" ? null : window.localStorage
			} catch {
				this.storage = null
			}
		}
	}

	storageKey(slice: string) {
		this.assertSlice(slice)
		return `maxion-demo:${this.tenantId}:${slice}:v${DEMO_STATE_SCHEMA_VERSION}`
	}

	load<T>(slice: string, codec: StateCodec<T>, fallback: () => T, maxBytes = DEFAULT_MAX_BYTES, legacyKeys: readonly string[] = []): RepositoryLoad<T> {
		const key = this.storageKey(slice)
		if (!this.storage) return { value: fallback(), status: "recovered", reason: "storage-unavailable" }

		let raw: string | null
		try {
			raw = this.storage.getItem(key)
		} catch {
			return { value: fallback(), status: "recovered", reason: "storage-unavailable" }
		}
		if (raw === null) {
			const migrated = this.loadLegacy(slice, codec, fallback, maxBytes, legacyKeys)
			return migrated ?? { value: fallback(), status: "empty" }
		}
		if (raw.length > maxBytes) return this.recover(key, fallback, "oversized")

		let parsed: unknown
		try {
			parsed = JSON.parse(raw)
		} catch {
			return this.recover(key, fallback, "malformed")
		}
		if (!isRecord(parsed)) return this.recover(key, fallback, "malformed")
		if (parsed.tenantId !== this.tenantId) return this.recover(key, fallback, "wrong-tenant")
		if (parsed.slice !== slice) return this.recover(key, fallback, "wrong-slice")
		if (!Number.isInteger(parsed.schemaVersion)) return this.recover(key, fallback, "unsupported-version")

		if (parsed.schemaVersion === DEMO_STATE_SCHEMA_VERSION) {
			const value = codec.parse(parsed.value)
			return value === null ? this.recover(key, fallback, "invalid-value") : { value, status: "loaded" }
		}
		const migrated = codec.migrate?.(Number(parsed.schemaVersion), parsed.value) ?? null
		if (migrated === null) return this.recover(key, fallback, "unsupported-version")
		const saved = this.save(slice, migrated, maxBytes)
		return saved.ok
			? { value: migrated, status: "migrated" }
			: { value: migrated, status: "recovered", reason: saved.reason === "oversized" ? "oversized" : "storage-unavailable" }
	}

	save<T>(slice: string, value: T, maxBytes = DEFAULT_MAX_BYTES): RepositorySave {
		const key = this.storageKey(slice)
		if (!this.storage) return { ok: false, reason: "storage-unavailable" }
		let raw: string
		try {
			raw = JSON.stringify({ schemaVersion: DEMO_STATE_SCHEMA_VERSION, tenantId: this.tenantId, slice, value } satisfies StoredEnvelope)
		} catch {
			return { ok: false, reason: "write-failed" }
		}
		if (raw.length > maxBytes) return { ok: false, reason: "oversized" }
		try {
			this.storage.setItem(key, raw)
			return { ok: true }
		} catch {
			return { ok: false, reason: "write-failed" }
		}
	}

	private recover<T>(key: string, fallback: () => T, reason: RepositoryLoad<T>["reason"]): RepositoryLoad<T> {
		try {
			this.storage?.removeItem(key)
		} catch {
			// A denied cleanup is harmless; the untrusted value is never returned.
		}
		return { value: fallback(), status: "recovered", reason }
	}

	private loadLegacy<T>(slice: string, codec: StateCodec<T>, fallback: () => T, maxBytes: number, legacyKeys: readonly string[]): RepositoryLoad<T> | null {
		for (const legacyKey of legacyKeys) {
			let raw: string | null
			try {
				raw = this.storage?.getItem(legacyKey) ?? null
			} catch {
				return { value: fallback(), status: "recovered", reason: "storage-unavailable" }
			}
			if (raw === null) continue
			if (raw.length > maxBytes) return null

			let parsed: unknown
			try {
				parsed = JSON.parse(raw)
			} catch {
				return null
			}
			const value = codec.parse(parsed)
			if (value === null) return null
			const saved = this.save(slice, value, maxBytes)
			if (!saved.ok) return { value, status: "recovered", reason: saved.reason === "oversized" ? "oversized" : "storage-unavailable" }
			try {
				this.storage?.removeItem(legacyKey)
			} catch {
				// The tenant envelope is authoritative after a successful write. A denied
				// legacy cleanup is safe because future reads prefer the new key.
			}
			return { value, status: "migrated" }
		}
		return null
	}

	private assertSlice(slice: string) {
		if (!SLICE_PATTERN.test(slice)) throw new Error("Invalid demo state slice")
	}
}

export function createDemoStateRepository(tenantId: string, storage?: StoragePort | null) {
	return new DemoStateRepository(tenantId, storage)
}

export const demoStateRepository = createDemoStateRepository(DEMO_TENANT_ID)
