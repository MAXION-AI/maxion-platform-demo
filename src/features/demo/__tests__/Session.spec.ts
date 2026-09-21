import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DEMO_IDS } from "../scripts"
import { DEMO_KEYS, demoChannel, demoKey, demoOwnsStorage, demoRequest, demoSession, demoUrl, prepareDemo, resetDemoSessionForTests, storageKey } from "../session"
import { activate, actOnEngagement, answerQuestion, awaitingCreation, EPOCH, londonTimeOn, nextSixAm, nextWindow, packageAvailable, previousWeekdayMorning, receivePackage, tick, visiblePackage } from "@/features/agentix/prototype/engine/engine"
import { needsYou } from "@/features/agentix/prototype/engine/selectors"
import { demoInitialState, initialState } from "@/features/agentix/prototype/engine/seed"
import { readState, STORAGE_KEY, writeState } from "@/features/agentix/prototype/engine/storage"

const at = (iso: string) => Date.parse(iso)
const loc = (search = "", pathname = "/maxion-prototype", hash = "") => ({ search, pathname, hash })

describe("London schedules in any season", () => {
	it("keeps the summer answers the prototype has always shown", () => {
		expect(new Date(nextSixAm(EPOCH)).toISOString()).toBe("2026-09-12T05:00:00.000Z")
		expect(new Date(nextSixAm(EPOCH, true)).toISOString()).toBe("2026-09-14T05:00:00.000Z")
		expect(new Date(nextWindow(EPOCH)).toISOString()).toBe("2026-09-12T01:00:00.000Z")
		expect(new Date(previousWeekdayMorning(EPOCH, 3)).toISOString()).toBe("2026-09-08T05:00:00.000Z")
	})

	it("uses 06:00 and 02:00 London in winter, and across the October clock change", () => {
		const winter = at("2026-11-20T09:00:00Z")
		expect(new Date(nextSixAm(winter)).toISOString()).toBe("2026-11-21T06:00:00.000Z")
		expect(new Date(nextSixAm(winter, true)).toISOString()).toBe("2026-11-23T06:00:00.000Z")
		expect(new Date(nextWindow(winter)).toISOString()).toBe("2026-11-21T02:00:00.000Z")
		expect(new Date(nextSixAm(at("2026-10-24T09:00:00Z"))).toISOString()).toBe("2026-10-25T06:00:00.000Z")
		expect(new Date(londonTimeOn(at("2026-10-24T09:00:00Z"), 0, 6)).toISOString()).toBe("2026-10-24T05:00:00.000Z")
		// Monday: the previous weekday reviews are Friday, Thursday and Wednesday.
		const monday = at("2026-11-23T10:00:00Z")
		expect([1, 2, 3].map(back => new Date(previousWeekdayMorning(monday, back)).toISOString().slice(0, 10))).toEqual(["2026-11-20", "2026-11-19", "2026-11-18"])
	})
})

describe("the seeded world laid out from any start", () => {
	it("is unchanged at the everyday demo date", () => {
		const state = initialState()
		const titles = state.work.filter(item => item.engagementId === "inventory").map(item => `${item.reference} ${item.title} ${item.occurrence}`)
		expect(titles).toContain("STOCK-899 London warehouse · 8 Sep review 2026-09-08T05:00:00Z")
		expect(titles).toContain("STOCK-901 London warehouse · 10 Sep review 2026-09-10T05:00:00Z")
		expect(titles).toContain("STOCK-902 London warehouse · morning review 2026-09-11T05:00:00Z")
		expect(state.engagements.inventory.nextOccurrence).toBe("2026-09-14T05:00:00Z")
		expect(state.clock).toBe(EPOCH)
	})

	it("starts at the demo's own moment, with warehouse reviews on earlier weekdays", () => {
		const base = at("2026-11-23T10:30:00Z") // a Monday in winter
		const state = initialState(base)
		expect(state.clock).toBe(base)
		const reviews = state.work.filter(item => item.engagementId === "inventory" && item.reference !== "STOCK-902").map(item => item.title)
		expect(reviews).toEqual(["London warehouse · 18 Nov review", "London warehouse · 19 Nov review", "London warehouse · 20 Nov review"])
		expect(state.engagements.inventory.nextOccurrence).toBe("2026-11-24T06:00:00Z")
		expect(state.work.every(item => item.started <= base)).toBe(true)
		const northwind = state.work.find(item => item.reference === "INV-20841")!
		expect(base - northwind.started).toBe(14 * 60000)
	})
})

describe("the customer demo's Agentix", () => {
	it("starts revenue reconciliation from zero: no engagement, no history, until its Discovery creates it", () => {
		const base = at("2026-11-23T10:30:00Z")
		let state = demoInitialState(base)
		expect(awaitingCreation(state.engagements.invoice)).toBe(true)
		expect([...state.work, ...state.artifacts, ...state.decisions, ...state.events].some(entry => entry.engagementId === "invoice")).toBe(false)
		expect(needsYou(state).some(entry => entry.engagementId === "invoice")).toBe(false)
		expect(packageAvailable(state, "pkg_revenue_v2")).toBe(false)
		expect(visiblePackage(state, "invoice")).toBeUndefined()
		// The other engagements keep their seeded work, and intake stays quiet.
		expect(state.work.some(entry => entry.engagementId === "inventory")).toBe(true)
		const before = state.work.length
		for (let i = 0; i < 48; i++) state = tick(state)
		expect(state.work.length).toBe(before)
		// Only its Discovery sends the package, and it arrives as a new engagement.
		expect(receivePackage(state, "pkg_revenue_v2", "discovery")).toBe(state)
		state = receivePackage(state, "pkg_revenue_v2", "discovery", "", { recordId: "rec-1", packetId: "HP-ABC123", title: "Revenue reconciliation: SQL Server to AWS" })
		expect(state.engagements.invoice.proposal?.kind).toBe("new")
		expect(state.engagements.invoice.proposal?.discovery?.packetId).toBe("HP-ABC123")
		expect(awaitingCreation(state.engagements.invoice)).toBe(false)
		// Activation needs the two answers and the read-only check, then the milestones start with a team of four.
		state = answerQuestion(answerQuestion(state, "invoice", "release", "approval"), "invoice", "testdata", "synthetic")
		expect(activate(state, "invoice")).toBe(state)
		state = tick(actOnEngagement(state, "invoice", "recheck"))
		state = activate(state, "invoice")
		expect(state.engagements.invoice.status).toBe("active")
		expect(state.engagements.invoice.packages).toEqual(["pkg_revenue_v2"])
		expect(state.work.filter(item => item.engagementId === "invoice").map(item => item.reference)).toEqual(["MS-1", "MS-2", "MS-3"])
	})
})

describe("the demo session", () => {
	beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetDemoSessionForTests() })
	afterEach(() => { localStorage.clear(); sessionStorage.clear(); resetDemoSessionForTests() })

	it("recognises the demo address in the query, inside a hash route, or at /demo", () => {
		expect(demoRequest(loc("?demo=revenue"))).toEqual({ id: "revenue", start: "discovery" })
		expect(demoRequest(loc("?demo=revenue&start=package"))).toEqual({ id: "revenue", start: "package" })
		expect(demoRequest(loc("", "/maxion-platform-demo/", "#/maxion-prototype?demo=revenue&start=package"))).toEqual({ id: "revenue", start: "package" })
		// The bare shorthand stays the demo the product shipped first.
		expect(demoRequest(loc("", "/demo"))).toEqual({ id: "revenue", start: "discovery" })
		expect(demoRequest(loc("?demo=other"))).toBeNull()
		expect(demoRequest(loc(""))).toBeNull()
	})

	it("never treats the presenter guide's own address as a demo tab", () => {
		// The guide names the demo it follows (?demo=<id>); if that started a session the guide
		// would claim the owner token and displace the tab the presenter is actually showing.
		expect(demoRequest(loc("?demo=revenue", "/demo-guide"))).toBeNull()
		expect(demoRequest(loc("", "/maxion-platform-demo/", "#/demo-guide?demo=servicenow"))).toBeNull()
		expect(prepareDemo(loc("?demo=revenue", "/demo-guide"))).toBeNull()
		expect(storageKey(STORAGE_KEY)).toBe(STORAGE_KEY)
	})

	it("treats an unregistered demo id as no demo at all, rather than someone else's demo", () => {
		// A mistyped or not-yet-built id must open the everyday prototype, never another demo's storage.
		expect(demoRequest(loc("?demo=not-a-demo"))).toBeNull()
		expect(demoRequest(loc("?demo=REVENUE"))).toBeNull()
		expect(prepareDemo(loc("?demo=not-a-demo"))).toBeNull()
		expect(storageKey(STORAGE_KEY)).toBe(STORAGE_KEY)
		// Every registered demo is reachable at its own address.
		for (const id of DEMO_IDS) expect(demoRequest(loc(`?demo=${id}`))).toEqual({ id, start: "discovery" })
	})

	it("keeps each demo's storage, ownership and channel under its own name", () => {
		// The suffix, the started flag, the owner token and the channel are all derived from the id,
		// so a second demo can never read or clear the first one's run.
		for (const id of DEMO_IDS) {
			expect(demoKey(STORAGE_KEY, id)).toBe(`${STORAGE_KEY}::demo-${id}`)
			expect(demoChannel(id)).toBe(`maxion-demo-${id}`)
		}
		expect(new Set(DEMO_IDS.map(id => demoKey(STORAGE_KEY, id))).size).toBe(DEMO_IDS.length)
		expect(new Set(DEMO_IDS.map(demoChannel)).size).toBe(DEMO_IDS.length)
	})

	it("starts a fresh demo in a new tab, keeps progress on reload, and never touches the everyday keys", () => {
		localStorage.setItem(STORAGE_KEY, "everyday")
		localStorage.setItem(DEMO_KEYS.discovery, "everyday discovery")
		localStorage.setItem(demoKey(STORAGE_KEY), "stale demo")
		const first = prepareDemo(loc("?demo=revenue"), at("2026-11-23T10:30:42Z"))
		expect(first?.startedAt).toBe(at("2026-11-23T10:30:00Z"))
		expect(localStorage.getItem(demoKey(STORAGE_KEY))).toBeNull()
		expect(localStorage.getItem(STORAGE_KEY)).toBe("everyday")
		expect(localStorage.getItem(DEMO_KEYS.discovery)).toBe("everyday discovery")
		expect(storageKey(STORAGE_KEY)).toBe(demoKey(STORAGE_KEY))

		// The demo's Agentix starts at the demo's moment and saves under its own key.
		const state = readState()
		expect(state.clock).toBe(at("2026-11-23T10:30:00Z"))
		expect(state.demo.quiet).toBe(true)
		writeState(state)
		expect(localStorage.getItem(STORAGE_KEY)).toBe("everyday")

		// Reload: same tab, same start. Progress is kept.
		resetDemoSessionForTests()
		prepareDemo(loc("?demo=revenue"), at("2026-11-23T11:00:00Z"))
		expect(localStorage.getItem(demoKey(STORAGE_KEY))).not.toBeNull()
		expect(demoSession()?.startedAt).toBe(at("2026-11-23T10:30:00Z"))

		// Asking for the other start in this tab begins again.
		resetDemoSessionForTests()
		prepareDemo(loc("?demo=revenue&start=package"), at("2026-11-23T11:05:00Z"))
		expect(localStorage.getItem(demoKey(STORAGE_KEY))).toBeNull()
		expect(demoSession()?.start).toBe("package")

		// Without the demo address, everything reads the everyday keys again.
		resetDemoSessionForTests()
		expect(prepareDemo(loc(""))).toBeNull()
		expect(storageKey(STORAGE_KEY)).toBe(STORAGE_KEY)
	})

	it("lets only the newest demo tab save, and moves ownership only on request", () => {
		const first = prepareDemo(loc("?demo=revenue"), at("2026-11-23T10:30:00Z"))!
		expect(demoOwnsStorage()).toBe(true)
		const firstFlag = sessionStorage.getItem("maxion.demo.revenue.started")

		// Another tab (no flag of its own) starts the demo: it owns the saved state from now on.
		sessionStorage.clear()
		resetDemoSessionForTests()
		const second = prepareDemo(loc("?demo=revenue"), at("2026-11-23T10:40:00Z"))!
		expect(second.tab).not.toBe(first.tab)
		expect(demoOwnsStorage()).toBe(true)

		// The first tab reloads: it keeps its own place but no longer owns the demo, so it must not save.
		sessionStorage.setItem("maxion.demo.revenue.started", firstFlag!)
		resetDemoSessionForTests()
		expect(prepareDemo(loc("?demo=revenue"), at("2026-11-23T10:45:00Z"))?.tab).toBe(first.tab)
		expect(demoOwnsStorage()).toBe(false)

		// Outside the demo nothing is gated.
		resetDemoSessionForTests()
		prepareDemo(loc(""))
		expect(demoOwnsStorage()).toBe(true)
	})

	it("starts clean when asked with fresh=1, even in a window that carries a demo flag", () => {
		const first = prepareDemo(loc("?demo=revenue"), at("2026-11-23T10:30:00Z"))!
		localStorage.setItem(demoKey(STORAGE_KEY), "a run in progress")
		resetDemoSessionForTests()
		const fresh = prepareDemo(loc("?demo=revenue&fresh=1"), at("2026-11-23T10:50:00Z"))!
		expect(fresh.tab).not.toBe(first.tab)
		expect(localStorage.getItem(demoKey(STORAGE_KEY))).toBeNull()
		expect(demoOwnsStorage()).toBe(true)
		expect(demoUrl("revenue", "package", "http://127.0.0.1:4317/demo-guide", true).toString()).toBe("http://127.0.0.1:4317/maxion-prototype?demo=revenue&start=package&fresh=1")
	})

	it("builds the demo address for path and hash routing, dropping stray parameters", () => {
		expect(demoUrl("revenue", "discovery", "http://127.0.0.1:4317/agentix-prototype?x=1").toString()).toBe("http://127.0.0.1:4317/maxion-prototype?demo=revenue")
		expect(demoUrl("revenue", "package", "http://127.0.0.1:4317/maxion-prototype?demo=revenue#top").toString()).toBe("http://127.0.0.1:4317/maxion-prototype?demo=revenue&start=package")
		expect(demoUrl("revenue", "discovery", "https://maxion-ai.github.io/maxion-platform-demo/?demo=revenue#/demo-guide").toString()).toBe("https://maxion-ai.github.io/maxion-platform-demo/#/maxion-prototype?demo=revenue")
	})

	it("never migrates an old saved demo into the customer demo", () => {
		localStorage.setItem("maxion-agentix-operations-v3", JSON.stringify({ version: 3, clock: EPOCH, agents: {}, runs: [], messages: [], drafts: {} }))
		prepareDemo(loc("?demo=revenue"), at("2026-11-23T10:30:00Z"))
		expect(readState().clock).toBe(at("2026-11-23T10:30:00Z"))
		expect(localStorage.getItem("maxion-agentix-operations-v3")).not.toBeNull()
	})
})
