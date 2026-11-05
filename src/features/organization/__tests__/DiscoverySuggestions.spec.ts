import { beforeEach, describe, expect, it } from "vitest"
import { CLOSE_MAP_PACKAGE, CLOSE_MAP_SUGGESTIONS, KNOWLEDGE_CITED_DOCUMENTS, packageSuggestions, sentWith } from "../discoverySuggestions"
import { approveSuggestion, ESSENTIALS_BUDGET, essentialsUse, readKnowledge, rejectSuggestion, resetKnowledgeStore, resolveConflict, reviewCount, saveItem, suggestedVersion, suggestFromDiscovery, withdrawItem } from "../knowledge"

/*
 * A Discovery that maps how Northstar works sends its approved package to Knowledge as
 * suggestions (doc 22): nothing is published by sending it, each item cites where it came from,
 * and an Owner or Admin publishes or rejects them one by one.
 */
const packet = { id: "HP-CLOSE1", work: "Month-end close: how it actually runs", recordId: "rec-close" }
const item = (id: string) => readKnowledge().items.find((entry) => entry.id === id)
const send = (decision = "approved") => suggestFromDiscovery(packet, packageSuggestions(CLOSE_MAP_PACKAGE, decision) ?? [])

describe("suggestions from a Discovery package", () => {
	beforeEach(() => resetKnowledgeStore())

	it("arrive as suggestions that cite their source, once per packet", () => {
		const before = reviewCount()
		expect(send()).toBe(8)
		const suggested = readKnowledge().items.filter((entry) => entry.origin?.kind === "discovery" && entry.origin.target === packet.recordId)
		expect(suggested).toHaveLength(8)
		for (const entry of suggested) {
			expect(entry.state).toBe("suggested")
			expect(entry.origin).toMatchObject({ kind: "discovery", work: packet.work })
			expect(entry.origin?.kind === "discovery" && entry.origin.source).toBeTruthy()
		}
		expect(reviewCount()).toBe(before + 8)
		// Opening the packet again adds nothing.
		expect(send()).toBe(0)
		expect(readKnowledge().items.filter((entry) => entry.state === "suggested" && entry.origin?.kind === "discovery" && entry.origin.target === packet.recordId)).toHaveLength(8)
		// A package that isn't a mapping sends nothing here.
		expect(packageSuggestions("pkg_revenue_v2", "approved")).toBeNull()
	})

	it("cites the document, section and package version each one came from", () => {
		suggestFromDiscovery({ ...packet, version: 2 }, packageSuggestions(CLOSE_MAP_PACKAGE, "approved") ?? [])
		expect(item(CLOSE_MAP_SUGGESTIONS.systems)?.origin).toMatchObject({ source: "Technical assessment, package v2 · Systems of record" })
		expect(item(CLOSE_MAP_SUGGESTIONS.procedure)?.origin).toMatchObject({ source: "Use case catalog, package v2 · The close as performed" })
		expect(item(CLOSE_MAP_SUGGESTIONS.elimination)?.origin).toMatchObject({ source: "Use case catalog, package v2 · UC-02: US entity close and elimination, from Hannah Brooks’ interview" })
		expect(item(CLOSE_MAP_SUGGESTIONS.freeze)?.origin).toMatchObject({ source: "RAID register, package v2 · Decided in Discovery, the Controller’s decision" })
		// A packet without a version is the first one.
		resetKnowledgeStore()
		send()
		expect(item("s-flash-report")?.origin).toMatchObject({ source: "Use case catalog, package v1 · Terms the close uses" })
	})

	it("publishes a suggested next version on the procedure it revises, and settles the conflict it corrects", () => {
		send()
		expect(item("k-close")?.version).toBe(4)
		expect(readKnowledge().conflicts.find((conflict) => conflict.id === "c-threshold")?.state).toBe("open")
		const suggestion = item(CLOSE_MAP_SUGGESTIONS.procedure)
		expect(suggestion).toMatchObject({ state: "suggested", revises: "k-close", version: 5 })
		expect(suggestion?.changes?.length).toBeGreaterThan(0)

		expect(approveSuggestion(CLOSE_MAP_SUGGESTIONS.procedure)).toEqual({ ok: true, id: "k-close", state: "published" })
		const close = item("k-close")
		expect(close?.version).toBe(5)
		expect(close?.body).toContain("above the binding approval threshold ($25,000)")
		expect(close?.body).toContain("Group FP&A posts the intercompany true-ups with the Controller's approval")
		expect(close?.body).not.toContain("$10,000")
		expect(close?.versions[0]).toMatchObject({ version: 5, author: "Discovery", approver: "Root Admin" })
		// What it cited is kept: work that pinned v4 still shows v4 in the history.
		expect(close?.uses.length).toBeGreaterThan(0)
		expect(item(CLOSE_MAP_SUGGESTIONS.procedure)).toBeUndefined()
		expect(readKnowledge().conflicts.find((conflict) => conflict.id === "c-threshold")?.state).toBe("resolved")
		expect(readKnowledge().decided[CLOSE_MAP_SUGGESTIONS.procedure]).toBe("approved")
	})

	it("writes what the owner decided: keeping the freeze records the day-4 true-ups as exceptions", () => {
		send("modified")
		approveSuggestion(CLOSE_MAP_SUGGESTIONS.procedure)
		approveSuggestion(CLOSE_MAP_SUGGESTIONS.freeze)
		expect(item("k-close")?.body).toContain("Each true-up is an exception to the day-3 freeze")
		expect(item("k-close")?.body).toContain("recorded in the RAID register and owned by Group FP&A")
		expect(item("k-freeze")?.body).not.toContain("may post on day 4")
		expect(item("k-freeze")?.version).toBe(2)
	})

	it("keeps the elimination procedure with Finance, as a new item", () => {
		send()
		const suggestion = item(CLOSE_MAP_SUGGESTIONS.elimination)
		expect(suggestion?.visibility).toEqual(["Sarah Liu", "Luca Romano", "Hannah Brooks"])
		expect(suggestion?.revises).toBeUndefined()
		expect(approveSuggestion(CLOSE_MAP_SUGGESTIONS.elimination)).toEqual({ ok: true, id: CLOSE_MAP_SUGGESTIONS.elimination, state: "published" })
		expect(item(CLOSE_MAP_SUGGESTIONS.elimination)).toMatchObject({ state: "published", version: 1, visibility: ["Sarah Liu", "Luca Romano", "Hannah Brooks"] })
	})

	it("keeps an essential item inside the essentials budget when its next version is published", () => {
		send()
		expect(item("k-systems")?.essential).toBe(true)
		expect(approveSuggestion(CLOSE_MAP_SUGGESTIONS.systems)).toMatchObject({ ok: true, id: "k-systems" })
		expect(item("k-systems")?.version).toBe(3)
		const use = essentialsUse()
		expect(use.items).toBeLessThanOrEqual(ESSENTIALS_BUDGET.items)
		expect(use.bytes).toBeLessThanOrEqual(ESSENTIALS_BUDGET.bytes)
	})

	it("publishes the next version of the item as it is now, when it moved after the suggestion arrived", () => {
		send()
		const arrived = item(CLOSE_MAP_SUGGESTIONS.procedure)!
		expect(suggestedVersion(arrived, readKnowledge().items)).toBe(5)
		// Publishing the conflict's correction makes the procedure v5 underneath the suggestion.
		resolveConflict("c-threshold", "correction")
		expect(item("k-close")?.version).toBe(5)
		expect(suggestedVersion(arrived, readKnowledge().items)).toBe(6)
		expect(approveSuggestion(CLOSE_MAP_SUGGESTIONS.procedure)).toMatchObject({ ok: true, id: "k-close" })
		expect(item("k-close")?.version).toBe(6)
		expect(item("k-close")?.versions.map((entry) => entry.version).slice(0, 2)).toEqual([6, 5])
	})

	it("brings a withdrawn original back as its next version, never a second item with its name", () => {
		send()
		withdrawItem("k-close")
		expect(approveSuggestion(CLOSE_MAP_SUGGESTIONS.procedure)).toEqual({ ok: true, id: "k-close", state: "published" })
		expect(readKnowledge().items.filter((entry) => entry.title === "Month-end close")).toHaveLength(1)
		expect(item("k-close")).toMatchObject({ state: "published", version: 5 })
	})

	it("gives a new item an id nothing in the library has, even when its counter is behind", () => {
		// A reload keeps a demo's library but starts the counter again; an item with the next id is already there.
		suggestFromDiscovery({ ...packet, id: "HP-OTHER" }, [{ id: "k-new-1", section: "glossary", title: "Close calendar", body: "When each close starts.", cites: { document: "Use case catalog", section: "Terms the close uses" } }])
		const saved = saveItem({ section: "glossary", title: "Flash pack", body: "The pack sent with the flash report.", kind: "guidance", essential: false, visibility: "everyone" }, "publish")
		expect(saved.ok && saved.id).toBe("k-new-2")
	})

	it("sends only the suggestions whose cited document is in the package", () => {
		const all = packageSuggestions(CLOSE_MAP_PACKAGE, "approved") ?? []
		const withoutRaid = sentWith(all, KNOWLEDGE_CITED_DOCUMENTS.filter((name) => name !== "RAID register"))
		expect(withoutRaid.map((suggestion) => suggestion.id)).not.toContain(CLOSE_MAP_SUGGESTIONS.freeze)
		expect(withoutRaid).toHaveLength(all.length - 1)
		expect(sentWith(all, undefined)).toHaveLength(all.length)
		expect([...KNOWLEDGE_CITED_DOCUMENTS].sort()).toEqual(["RAID register", "Technical assessment", "Use case catalog"])
	})

	it("records a rejection and drops the suggestion, without touching the published item", () => {
		send()
		rejectSuggestion(CLOSE_MAP_SUGGESTIONS.freeze)
		expect(item(CLOSE_MAP_SUGGESTIONS.freeze)).toBeUndefined()
		expect(item("k-freeze")?.version).toBe(1)
		expect(readKnowledge().decided[CLOSE_MAP_SUGGESTIONS.freeze]).toBe("rejected")
		// A decided suggestion can't be approved afterwards.
		expect(approveSuggestion(CLOSE_MAP_SUGGESTIONS.freeze)).toEqual({ ok: false, error: "content" })
	})
})
