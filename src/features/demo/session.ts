/*
 * A customer demo runs as a session of its own, one demo per address:
 *
 *   /maxion-prototype?demo=<id>               the full journey, from a new Discovery
 *   /maxion-prototype?demo=<id>&start=package   from the finished Discovery package
 *   /demo                                     shorthand for the revenue demo's full journey
 *
 * `<id>` is a registered demo script (./scripts). Each demo keeps its own storage, its own
 * owner token and its own presenter channel, so two demos never mix — a ServiceNow run in one
 * tab and a revenue run in another are separate sessions, not one confused one.
 *
 * Its Discovery records and Agentix state live under their own storage keys, so
 * presenting never touches the everyday prototype, and a restart clears only
 * what the demo wrote. Opening the demo in a new tab starts it fresh; reloading
 * the same tab keeps where the presenter was.
 *
 * Only one tab owns the demo's saved state at a time: the tab that started it
 * most recently, or the one the presenter moved it to. Any other demo tab stops
 * saving and says where the demo went, so two tabs never mix one run.
 */

import { type DemoId, isDemoId } from "./scripts"

export type DemoStart = "discovery" | "package"
/* `tab` identifies the browser tab that runs this demo, across its reloads. */
export type DemoSession = { id: DemoId; start: DemoStart; startedAt: number; tab: string }
/* Which demo an address asks for, and where in its story it starts. */
export type DemoAddress = { id: DemoId; start: DemoStart }

/* `/demo` without an id is the revenue demo, the first one the product shipped. */
export const DEFAULT_DEMO: DemoId = "revenue"

export const DEMO_KEYS = { discovery: "maxion.prototype.discovery-records.v1", agentix: "maxion-agentix-operations-v4" } as const
/* Each demo's own copy of a module's storage, and its own ownership and presenter channel. */
const suffixFor = (id: DemoId) => `::demo-${id}`
// Tab-scoped: which start this tab's demo was prepared with, when, and the tab's own token.
const startedKey = (id: DemoId) => `maxion.demo.${id}.started`
// Shared: the token of the tab whose demo owns the saved state.
const ownerKey = (id: DemoId) => `maxion.demo.${id}.owner`
// Cross-window messages between a demo's tabs and the presenter guide.
export const demoChannel = (id: DemoId) => `maxion-demo-${id}`

let session: DemoSession | null = null
let resolved = false

const params = (location: Pick<Location, "search" | "hash" | "pathname">) => {
	// Deployed builds route inside the hash, so the query can live there too.
	const hashQuery = location.hash.includes("?") ? location.hash.slice(location.hash.indexOf("?")) : ""
	return new URLSearchParams(`${location.search}${hashQuery ? `&${hashQuery.slice(1)}` : ""}`)
}
const pathOf = (location: Pick<Location, "hash" | "pathname">) => location.hash.startsWith("#/") ? location.hash.slice(1).split("?")[0] : location.pathname

/* Which demo this address asks for, and where it starts; null when the address is not a demo. */
export function demoRequest(location: Pick<Location, "search" | "hash" | "pathname"> = window.location): DemoAddress | null {
	const query = params(location)
	const asked = query.get("demo")
	const path = pathOf(location)
	// The presenter guide names the demo it follows in its own address, but it is a window BESIDE
	// the demo, not a demo tab: if it started a session it would take the demo's saved state over
	// and the real demo tab would read "Continues in another tab" the moment the guide opened.
	// The stakeholder interview is the same: a window beside the demo showing what a stakeholder
	// receives, never a demo tab of its own.
	if (/\/(demo-guide|stakeholder-interview)\/?$/.test(path)) return null
	const shorthand = /\/demo\/?$/.test(path)
	// An unregistered id is not a demo: it opens the everyday prototype rather than a half-built one.
	const id: DemoId | null = isDemoId(asked) ? asked : asked === null && shorthand ? DEFAULT_DEMO : null
	if (!id) return null
	return { id, start: query.get("start") === "package" ? "package" : "discovery" }
}

const safeSession = (): Storage | null => { try { return window.sessionStorage } catch { return null } }
const safeLocal = (): Storage | null => { try { return window.localStorage } catch { return null } }
const token = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

function readStarted(id: DemoId): DemoSession | null {
	try {
		const raw = JSON.parse(safeSession()?.getItem(startedKey(id)) ?? "null") as Partial<DemoSession> | null
		if (raw && raw.id === id && (raw.start === "discovery" || raw.start === "package") && Number.isFinite(raw.startedAt) && typeof raw.tab === "string" && raw.tab.length <= 80) return raw as DemoSession
	} catch {
		// An unreadable flag means this tab hasn't started this demo.
	}
	return null
}
const saveStarted = (value: DemoSession) => { try { safeSession()?.setItem(startedKey(value.id), JSON.stringify(value)) } catch { /* the demo still runs; a reload starts it fresh */ } }

/*
 * Clears only what this demo wrote; the everyday prototype's storage, and every other demo's,
 * is never read or written.
 */
export function clearDemoStorage(id: DemoId, storage: Pick<Storage, "removeItem"> | null = safeLocal()) {
	try {
		for (const key of Object.values(DEMO_KEYS)) storage?.removeItem(`${key}${suffixFor(id)}`)
		storage?.removeItem(ownerKey(id))
	} catch {
		// Storage that can't be written holds nothing of the demo's either.
	}
	clearTabCopies(id)
}
/* This tab's private copy of its run, kept while another tab owns the demo. */
function clearTabCopies(id: DemoId) {
	try { for (const key of Object.values(DEMO_KEYS)) safeSession()?.removeItem(`${key}${suffixFor(id)}`) } catch { /* nothing kept */ }
}

/*
 * Resolves the session once per page load, before any module reads storage.
 * A tab that hasn't started this demo (or started it from another point)
 * begins from a clean slate and owns the demo from then on; a reload of a
 * started tab keeps its progress.
 */
export function prepareDemo(location: Pick<Location, "search" | "hash" | "pathname"> = window.location, now = Date.now()): DemoSession | null {
	resolved = true
	const address = demoRequest(location)
	if (!address) { session = null; return null }
	const { id, start } = address
	const started = readStarted(id)
	// `fresh=1` (the presenter window's Open buttons) starts clean even in a window that inherited a demo flag.
	const fresh = params(location).get("fresh") === "1"
	if (started && started.start === start && !fresh) { session = started; return session }
	clearDemoStorage(id)
	// Whole minutes keep the demo clock's labels tidy.
	session = { id, start, startedAt: Math.floor(now / 60000) * 60000, tab: token() }
	saveStarted(session)
	try { safeLocal()?.setItem(ownerKey(id), session.tab) } catch { /* without storage there is nothing to share */ }
	return session
}

export function demoSession(): DemoSession | null {
	if (!resolved && typeof window !== "undefined") prepareDemo()
	return session
}
export const demoActive = () => demoSession() !== null

/* Whether this tab may save the demo's state: it owns the run, or storage can't be shared anyway. */
export function demoOwnsStorage() {
	const current = demoSession()
	if (!current) return true
	const storage = safeLocal()
	if (!storage) return true
	try { return storage.getItem(ownerKey(current.id)) === current.tab } catch { return true }
}

/*
 * Where a module reads and saves. Outside the demo, and in the tab that owns it, that is
 * localStorage. While another tab owns the demo, this tab keeps its own run in its own session
 * storage instead, so neither tab overwrites the other and a reload here keeps this tab's place
 * (falling back to the shared run when this tab has saved nothing of its own yet).
 */
export function moduleStorage(): Pick<Storage, "getItem" | "setItem"> | undefined {
	const local = safeLocal()
	if (!local) return undefined
	const suffix = session ? suffixFor(session.id) : null
	const shared = (key: string) => !suffix || !key.endsWith(suffix) || demoOwnsStorage()
	return {
		getItem: (key) => shared(key) ? local.getItem(key) : safeSession()?.getItem(key) ?? local.getItem(key),
		setItem: (key, value) => { if (shared(key)) local.setItem(key, value); else safeSession()?.setItem(key, value) },
	}
}
/* Whether this browser lets the demo keep anything at all (a blocked or private mode can refuse). */
export function demoStorageAvailable() {
	try { safeLocal()?.getItem(ownerKey(session?.id ?? DEFAULT_DEMO)); return !!safeLocal() } catch { return false }
}

/* The storage key a module should use: its own, or the running demo's copy of it. */
export function storageKey(base: string, active = demoActive()) {
	return active && session ? `${base}${suffixFor(session.id)}` : base
}
/*
 * A named demo's copy of a key, whatever the current page is. The presenter guide runs outside the
 * demo session and reads the demo it is following this way.
 */
export const demoKey = (base: string, id: DemoId = session?.id ?? DEFAULT_DEMO) => `${base}${suffixFor(id)}`

/*
 * Goes to an address and always loads it. Changing only what follows `#` is a
 * same-document jump that would leave the demo's modules running, so it is
 * followed by a reload.
 */
function load(url: URL, replace = false) {
	const current = new URL(window.location.href)
	const sameDocument = url.origin === current.origin && url.pathname === current.pathname && url.search === current.search
	if (replace) window.location.replace(url.toString())
	else window.location.assign(url.toString())
	if (sameDocument) window.location.reload()
}

/* The demo's address in this build: on the path locally, inside the hash on GitHub Pages. `fresh` always starts clean. */
export function demoUrl(id: DemoId, start: DemoStart, from: string = window.location.href, fresh = false) {
	const url = new URL(from)
	const query = `?demo=${id}${start === "package" ? "&start=package" : ""}${fresh ? "&fresh=1" : ""}`
	if (import.meta.env.BASE_URL !== "/" || url.hash.startsWith("#/")) {
		url.search = ""
		url.hash = `#/maxion-prototype${query}`
	} else {
		url.pathname = "/maxion-prototype"
		url.search = query
		url.hash = ""
	}
	return url
}

/*
 * Starts the demo again from a chosen point: clears the demo's storage and loads it fresh in this
 * tab. The restart replaces the current history entry, so Back never returns to the run it cleared.
 */
export function restartDemo(start: DemoStart = session?.start ?? "discovery", id: DemoId = session?.id ?? DEFAULT_DEMO) {
	try { safeSession()?.removeItem(startedKey(id)) } catch { /* the load below still resets */ }
	clearDemoStorage(id)
	load(demoUrl(id, start), true)
}

/*
 * Leaves the demo for the everyday prototype. The demo keeps its place: going
 * back to the demo address in this tab resumes it, and only a new tab or a
 * restart starts it over.
 */
export function exitDemo() {
	const url = new URL(window.location.href)
	if (import.meta.env.BASE_URL !== "/" || url.hash.startsWith("#/")) { url.search = ""; url.hash = "#/maxion-prototype" }
	else { url.pathname = "/maxion-prototype"; url.search = ""; url.hash = "" }
	load(url)
}

/*
 * Moving between a demo address and an everyday one without a page load (Back or Forward on the
 * hash-routed build, or an edited hash) loads the page again, so the demo starts, resumes or stops
 * cleanly instead of running half-attached to the wrong address.
 */
export function watchDemoAddress() {
	if (typeof window === "undefined") return
	// A move between demos, between starts, or in or out of a demo all need the page to load again.
	const signature = (address: DemoAddress | null) => address ? `${address.id}:${address.start}` : ""
	const current = signature(session ? { id: session.id, start: session.start } : null)
	const check = () => { if (signature(demoRequest(window.location)) !== current) window.location.reload() }
	window.addEventListener("popstate", check)
	window.addEventListener("hashchange", check)
}

/*
 * Moves the demo back into this tab: it owns the saved state again and saves what it shows, so the
 * run the presenter was in continues here. The other tab notices and stops saving.
 */
export function takeOverDemo() {
	const current = demoSession()
	if (!current) return
	try { safeLocal()?.setItem(ownerKey(current.id), current.tab) } catch { /* nothing to take over */ }
	window.dispatchEvent(new Event(DEMO_OWNER_EVENT))
	window.dispatchEvent(new Event(DEMO_SAVE_EVENT))
	clearTabCopies(current.id)
}

/* After a `fresh=1` start the flag leaves the address, so a reload keeps the new run instead of starting another. */
export function dropFreshFlag() {
	if (typeof window === "undefined") return
	const url = new URL(window.location.href)
	const clean = (query: URLSearchParams) => { const had = query.get("fresh") === "1"; query.delete("fresh"); return had }
	const search = new URLSearchParams(url.search)
	let changed = clean(search)
	url.search = search.toString() ? `?${search}` : ""
	const hashAt = url.hash.indexOf("?")
	if (hashAt >= 0) {
		const hashQuery = new URLSearchParams(url.hash.slice(hashAt + 1))
		if (clean(hashQuery)) { changed = true; url.hash = `${url.hash.slice(0, hashAt)}${hashQuery.toString() ? `?${hashQuery}` : ""}` }
	}
	if (changed) window.history.replaceState(window.history.state, "", url.toString())
}

/*
 * Same-tab signals for the presenter dock. Storage events only reach other
 * windows, so the demo's own writers announce a change, and the dock (or the
 * guide window, through storage events) reads the saved state again.
 */
export const DEMO_CHANGE_EVENT = "maxion-demo-change"
export function notifyDemoChange() {
	if (typeof window !== "undefined" && demoActive()) window.dispatchEvent(new Event(DEMO_CHANGE_EVENT))
}
/* Fired when another tab takes the demo over, or this tab turns out to be a duplicate. */
export const DEMO_OWNER_EVENT = "maxion-demo-owner"
/* Asks this tab's modules to save what they show now (after the tab takes the demo back). */
export const DEMO_SAVE_EVENT = "maxion-demo-save"
/*
 * A new revenue Discovery in the customer demo starts Agentix again from zero, so every run shows the
 * engagement being created, built, released and operated from nothing.
 */
export const DEMO_AGENTIX_RESET_EVENT = "maxion-demo-agentix-reset"
export function resetDemoAgentix() {
	if (typeof window !== "undefined" && demoActive()) window.dispatchEvent(new Event(DEMO_AGENTIX_RESET_EVENT))
}
/* Puts a scripted answer in the Discovery composer; the presenter still sends it. */
export const DEMO_FILL_EVENT = "maxion-demo-fill"
export function fillDemoAnswer(text: string, recordId?: string) {
	if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DEMO_FILL_EVENT, { detail: { text, recordId } }))
}

/* What the guide window may ask the demo tab to do. Each carries an id so the tab can confirm it. */
export type DemoCommand = { type: "fill"; text: string; recordId?: string; id?: string } | { type: "restart"; start: DemoStart; id?: string }
export function isDemoCommand(value: unknown): value is DemoCommand {
	if (!value || typeof value !== "object") return false
	const command = value as Partial<DemoCommand> & { text?: unknown; start?: unknown; id?: unknown; recordId?: unknown }
	if (command.id !== undefined && (typeof command.id !== "string" || command.id.length > 80)) return false
	if (command.recordId !== undefined && (typeof command.recordId !== "string" || command.recordId.length > 200)) return false
	return (command.type === "fill" && typeof command.text === "string" && command.text.length <= 600)
		|| (command.type === "restart" && (command.start === "discovery" || command.start === "package"))
}
/* Presence and handshakes between demo tabs and the guide. */
type Presence =
	| { type: "hello"; tab: string; instance: string; at: number }
	| { type: "claimed"; instance: string }
	| { type: "who" }
	| { type: "here"; owner: boolean; tab: string }
	| { type: "ack"; id: string }

let channel: BroadcastChannel | null = null
const instance = token()
const loadedAt = Date.now()
const handlers = new Set<(command: DemoCommand) => void>()

/* The demo tab's handler for guide commands; restarts are handled here, everything else by the dock. */
export function onDemoCommand(handler: (command: DemoCommand) => void) {
	handlers.add(handler)
	return () => { handlers.delete(handler) }
}

function receive(data: unknown) {
	const current = session
	if (!current || !channel || !data || typeof data !== "object") return
	const message = data as Partial<Presence> & { tab?: unknown; instance?: unknown; at?: unknown }
	if (message.type === "hello" && message.tab === current.tab && typeof message.instance === "string" && message.instance !== instance && typeof message.at === "number") {
		// A duplicated tab inherits its source's session storage, so two live tabs can share a token. The one loaded first keeps it.
		if (loadedAt < message.at || (loadedAt === message.at && instance < message.instance)) channel.postMessage({ type: "claimed", instance: message.instance } satisfies Presence)
		return
	}
	if (message.type === "claimed" && message.instance === instance) {
		session = { ...current, tab: token() }
		saveStarted(session)
		window.dispatchEvent(new Event(DEMO_OWNER_EVENT))
		return
	}
	if (message.type === "who") { channel.postMessage({ type: "here", owner: demoOwnsStorage(), tab: current.tab } satisfies Presence); return }
	// Only the tab that owns the demo takes commands, so a stray tab never fills or restarts anything.
	if (!demoOwnsStorage() || !isDemoCommand(data)) return
	if (data.id) channel.postMessage({ type: "ack", id: data.id } satisfies Presence)
	if (data.type === "restart") restartDemo(data.start)
	else for (const handler of handlers) handler(data)
}

/* Joins the demo's channel once the page has a demo session (browser only; tests use prepareDemo alone). */
export function startDemoPresence() {
	if (!session || channel || typeof window === "undefined" || typeof BroadcastChannel === "undefined") return
	channel = new BroadcastChannel(demoChannel(session.id))
	channel.onmessage = (event: MessageEvent<unknown>) => receive(event.data)
	channel.postMessage({ type: "hello", tab: session.tab, instance, at: loadedAt } satisfies Presence)
	// An open presenter window hears this tab at once after a load or an ownership change, not at its next check.
	const announce = () => { if (session) channel?.postMessage({ type: "here", owner: demoOwnsStorage(), tab: session.tab } satisfies Presence) }
	announce()
	window.addEventListener(DEMO_OWNER_EVENT, announce)
	const owner = ownerKey(session.id)
	window.addEventListener("storage", (event) => { if (event.key === owner || event.key === null) window.dispatchEvent(new Event(DEMO_OWNER_EVENT)) })
}

/*
 * The guide window's side of the channel: whether a demo tab is open and owns the demo ("owner"),
 * is open but handed the demo to another tab ("other"), or none answers ("none"); and commands that
 * report whether the owning tab took them. Nothing it scheduled fires after it is closed.
 */
export type GuidePresence = "owner" | "other" | "none"
export function openGuideChannel(id: DemoId, onPresence: (presence: GuidePresence) => void) {
	if (typeof BroadcastChannel === "undefined") return { send: async (_command: DemoCommand) => false, close: () => undefined }
	const guide = new BroadcastChannel(demoChannel(id))
	const waiting = new Map<string, (taken: boolean) => void>()
	const timers = new Set<number>()
	let closed = false
	// What each demo tab said last, and when: a tab that hands the demo on stops counting as the owner at once.
	const tabs = new Map<string, { owner: boolean; at: number }>()
	const later = (run: () => void, ms: number) => { const timer = window.setTimeout(() => { timers.delete(timer); if (!closed) run() }, ms); timers.add(timer) }
	// Two missed checks in a row (a demo tab reloading answers well within one) before saying no tab is open.
	const report = () => {
		const fresh = [...tabs.values()].filter(entry => Date.now() - entry.at < 9000)
		onPresence(fresh.some(entry => entry.owner) ? "owner" : fresh.length ? "other" : "none")
	}
	guide.onmessage = (event: MessageEvent<unknown>) => {
		if (closed) return
		const message = event.data as (Partial<Presence> & { owner?: unknown; tab?: unknown }) | null
		if (message?.type === "here" && typeof message.tab === "string") { tabs.set(message.tab, { owner: message.owner === true, at: Date.now() }); report() }
		if (message?.type === "ack" && typeof message.id === "string") { report(); waiting.get(message.id)?.(true); waiting.delete(message.id) }
	}
	const ask = () => { guide.postMessage({ type: "who" } satisfies Presence); later(report, 1000) }
	ask()
	const interval = window.setInterval(ask, 4000)
	return {
		send: (command: DemoCommand) => new Promise<boolean>(resolve => {
			if (closed) { resolve(false); return }
			const id = token()
			waiting.set(id, resolve)
			guide.postMessage({ ...command, id })
			later(() => { if (waiting.delete(id)) resolve(false) }, 1200)
		}),
		close: () => {
			closed = true
			window.clearInterval(interval)
			for (const timer of timers) window.clearTimeout(timer)
			timers.clear()
			guide.close()
			for (const resolve of waiting.values()) resolve(false)
			waiting.clear()
		},
	}
}

/* The presenter's guide, as a second window beside the demo. */
export function guideUrl(id: DemoId = session?.id ?? DEFAULT_DEMO) {
	const url = new URL(window.location.href)
	// The guide runs outside the demo session, so its address names the demo it follows.
	const query = `?demo=${id}`
	// Deployed builds route inside the hash under their base path; the dev server routes on the path.
	if (import.meta.env.BASE_URL !== "/" || url.hash.startsWith("#/")) { url.search = ""; url.hash = `#/demo-guide${query}`; return url.toString() }
	return `${url.origin}/demo-guide${query}`
}

/* What a stakeholder receives: the interview MAX sends them, as its own window. */
export function stakeholderUrl(id: DemoId = session?.id ?? DEFAULT_DEMO, who?: string) {
	const url = new URL(window.location.href)
	const query = `?demo=${id}${who ? `&who=${who}` : ""}`
	if (import.meta.env.BASE_URL !== "/" || url.hash.startsWith("#/")) { url.search = ""; url.hash = `#/stakeholder-interview${query}`; return url.toString() }
	return `${url.origin}/stakeholder-interview${query}`
}

/* Which stakeholder an interview address is for; absent means the first one MAX would write to. */
export function stakeholderWho(location: Pick<Location, "search" | "hash"> = window.location) {
	return params(location as Pick<Location, "search" | "hash" | "pathname">).get("who") ?? undefined
}

/* Which demo a presenter-guide address follows; the bare address follows the first demo. */
export function guideDemo(location: Pick<Location, "search" | "hash"> = window.location): DemoId {
	const asked = params(location as Pick<Location, "search" | "hash" | "pathname">).get("demo")
	return isDemoId(asked) ? asked : DEFAULT_DEMO
}

/* For tests: forget the resolved session so the next read resolves again. */
export function resetDemoSessionForTests() { session = null; resolved = false }
