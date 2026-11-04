import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { StakeholderInterviewPage } from "@/features/demo/StakeholderInterviewPage"
import { publishPolicy, resetOrganizationStore } from "@/features/organization/store"
import { DiscoveryAutonomousPrototypePage, listDiscoveryApprovals, type DiscoveryOpenSignal } from "../DiscoveryAutonomousPrototypePage"
import { DEFAULT_OUTPUTS, excludedFrom, newWork } from "../workState"

/*
 * The gates as a person operates them, on the real page: jsdom takes the page's instant paths, so
 * nothing here waits on a timer. Records are written to storage the way a saved run would be.
 */
const KEY = "maxion.prototype.discovery-records.v1"
// Role queries over the whole page are slow on a loaded machine; this bounds time, not behaviour.
vi.setConfig({ testTimeout: 180_000 })
type Saved = Record<string, unknown> & { id: string; title: string }

function seedRecords(): Saved[] {
	const first = render(<DiscoveryAutonomousPrototypePage />)
	first.unmount()
	return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Saved[]
}

/* A finished run nobody has approved yet: what a run that completes from now on looks like. */
function saveFinishedRun(patch: Record<string, unknown> = {}) {
	const records = seedRecords()
	const done = records.find(record => record.id === "seed-northbridge-diligence")!
	localStorage.setItem(KEY, JSON.stringify([{ ...done, id: "run", title: "Pending run", view: "package", work: newWork(), charterApproval: null, excludedOutputs: excludedFrom(DEFAULT_OUTPUTS), packageSelection: 5, ...patch }, ...records]))
}

const open = (title: RegExp) => fireEvent.click(screen.getByRole("button", { name: title }))
const header = () => document.querySelector<HTMLElement>(".workspace-header")!
const continueButton = () => within(header()).getByRole("button", { name: "Continue to Agentix" })
const toolbar = () => document.querySelector<HTMLElement>(".package-actions")!
const dialog = (name: string | RegExp) => screen.getByRole("dialog", { name })
const notice = (id: string) => document.querySelector<HTMLElement>(`[data-notice="${id}"]`)
const simulate = (label: string) => {
	fireEvent.click(screen.getByRole("button", { name: "More Discovery actions" }))
	fireEvent.click(screen.getByRole("menuitem", { name: label }))
}
const saved = () => (JSON.parse(localStorage.getItem(KEY) ?? "[]") as Array<Saved & { work?: ReturnType<typeof newWork> }>)
const runRecord = () => saved().find(record => record.id === "run")!

beforeEach(() => { localStorage.clear(); resetOrganizationStore() })
afterEach(() => { localStorage.clear() })

describe("package approval", () => {
	it("keeps Continue closed until one exact version is approved, then withdraw closes it again", () => {
		saveFinishedRun()
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Pending run, Needs your input/)
		expect(continueButton()).toBeDisabled()
		expect(screen.getByTestId("package-review-line")).toHaveTextContent("Package v1 · manifest v4 · 5 documents")

		fireEvent.click(within(toolbar()).getByRole("button", { name: "Approve package v1" }))
		const approval = dialog("Approve package v1")
		const bound = within(approval).getByTestId("package-bound")
		expect(bound).toHaveTextContent("Version 1")
		expect(bound.querySelectorAll("li")).toHaveLength(5)
		expect(bound.querySelectorAll("code")).toHaveLength(5)
		// Nothing is claimed before it is confirmed.
		expect(runRecord().work?.package.status).toBe("pending")
		fireEvent.click(within(approval).getByRole("button", { name: "Approve package v1" }))

		expect(runRecord().work?.package).toMatchObject({ status: "approved", approvedVersion: 1, approvedBy: "Root Admin" })
		expect(runRecord().work?.package.bound).toHaveLength(5)
		expect(continueButton()).toBeEnabled()
		expect(within(toolbar()).queryByRole("button", { name: /Approve package/ })).toBeNull()

		fireEvent.click(within(toolbar()).getByRole("button", { name: "Withdraw approval" }))
		fireEvent.click(within(dialog(/Withdraw approval of package v1/)).getByRole("button", { name: "Withdraw approval" }))
		expect(runRecord().work?.package.status).toBe("withdrawn")
		expect(continueButton()).toBeDisabled()
		expect(within(toolbar()).getByRole("button", { name: "Approve package v1" })).toBeInTheDocument()
	})

	it("refuses an approval when the version moved after the review opened, and leads to the new one", () => {
		saveFinishedRun()
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Pending run/)
		simulate("Simulate: a colleague edits")
		fireEvent.click(within(toolbar()).getByRole("button", { name: "Approve package v1" }))
		const approval = dialog("Approve package v1")
		fireEvent.click(within(approval).getByRole("button", { name: "Approve package v1" }))

		expect(within(approval).getByRole("alert")).toHaveTextContent("Package v1 can no longer be approved")
		expect(runRecord().work?.package.status).toBe("pending")
		expect(runRecord().work?.package.history.some(event => event.action === "refused")).toBe(true)
		fireEvent.click(within(approval).getByRole("button", { name: "Review v2" }))
		const current = dialog("Approve package v2")
		fireEvent.click(within(current).getByRole("button", { name: "Approve package v2" }))
		expect(runRecord().work?.package).toMatchObject({ status: "approved", approvedVersion: 2 })
	})

	it("returns with a reason and comes back as a new version to review", () => {
		saveFinishedRun()
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Pending run/)
		fireEvent.click(within(toolbar()).getByRole("button", { name: "Return to MAX" }))
		const returning = dialog("Return package v1 to MAX")
		const confirm = within(returning).getByRole("button", { name: "Return to MAX" })
		expect(confirm).toBeDisabled()
		fireEvent.change(within(returning).getByRole("textbox", { name: "What needs to change" }), { target: { value: "The RAID owner is wrong." } })
		fireEvent.click(confirm)
		const work = runRecord().work!
		expect(work.package).toMatchObject({ status: "pending", version: 2 })
		expect(work.package.history.map(event => event.action)).toEqual(["new-version", "returned"])
		expect(JSON.stringify(work.revisions)).toContain("The RAID owner is wrong")
		expect(within(toolbar()).getByRole("button", { name: "Approve package v2" })).toBeInTheDocument()
	})

	it("treats a seeded finished record as already approved, with a recorded approver", () => {
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume NorthBridge acquisition diligence, Completed/)
		fireEvent.click(screen.getByRole("button", { name: "Package" }))
		expect(screen.getByTestId("package-review-line")).toHaveTextContent("approved by Elena Park")
		expect(continueButton()).toBeEnabled()
		expect(screen.getAllByRole("navigation", { name: "Deliverable list" })[0].querySelectorAll("button")).toHaveLength(11)
	})
})

describe("document versions and the structured view", () => {
	it("switches to rows bound to the same version, and an edit makes a new one", () => {
		saveFinishedRun({ packageSelection: 9 })
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Pending run/)
		const reader = document.querySelector<HTMLElement>(".deliverable-reader")!
		const hash = () => reader.querySelector(".reader-verified-tag code")?.textContent
		const before = hash()
		fireEvent.click(within(reader).getByRole("button", { name: "Structured" }))
		expect(reader.querySelector('[data-row-id="WBS-1.1"]')).not.toBeNull()
		expect(reader.querySelector(".reader-structured-bound")).toHaveTextContent(`v1 · ${before}`)
		fireEvent.click(within(reader).getByRole("button", { name: "Readable" }))

		fireEvent.click(within(reader).getByRole("button", { name: "Edit" }))
		const edit = dialog("Edit Project plan and WBS")
		fireEvent.change(within(edit).getByRole("textbox", { name: "Section text" }), { target: { value: "A corrected statement of the work." } })
		fireEvent.click(within(edit).getByRole("button", { name: "Save version 2" }))

		expect(screen.getByTestId("document-version")).toHaveTextContent("Version 2")
		expect(hash()).not.toBe(before)
		expect(runRecord().work?.package.version).toBe(2)
		expect(within(toolbar()).getByRole("button", { name: "Approve package v2" })).toBeInTheDocument()

		fireEvent.click(within(reader).getByRole("button", { name: "History" }))
		const history = dialog("Project plan and WBS versions")
		fireEvent.click(within(history).getByRole("button", { name: "Compare with v2" }))
		expect(within(history).getByRole("region", { name: /Changes from v1 to v2/ })).toHaveTextContent("A corrected statement of the work.")
		fireEvent.click(within(history).getByRole("button", { name: "Read v1" }))
		expect(screen.getByTestId("document-version")).toHaveTextContent("Version 1 of 2")
		expect(hash()).toBe(before)
	})

	it("keeps the attempted text when the version moved underneath an edit", () => {
		saveFinishedRun({ packageSelection: 9 })
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Pending run/)
		simulate("Simulate: a colleague edits")
		fireEvent.click(within(document.querySelector<HTMLElement>(".deliverable-reader")!).getByRole("button", { name: "Edit" }))
		const edit = dialog("Edit Project plan and WBS")
		const text = within(edit).getByRole("textbox", { name: "Section text" })
		fireEvent.change(text, { target: { value: "My attempted text." } })
		fireEvent.click(within(edit).getByRole("button", { name: "Save version 2" }))
		expect(within(edit).getByRole("alert")).toHaveTextContent("moved to v2 while you were editing, so nothing was saved")
		expect(text).toHaveValue("My attempted text.")
		expect(JSON.stringify(runRecord().work?.revisions)).not.toContain("My attempted text.")
		fireEvent.click(within(edit).getByRole("button", { name: "Save on top of v2" }))
		expect(JSON.stringify(runRecord().work?.revisions)).toContain("My attempted text.")
		expect(screen.getByTestId("document-version")).toHaveTextContent("Version 3")
	})
})

describe("what holds a run", () => {
	it("pauses at the budget, keeps reads and hand edits, refuses regeneration, and resumes once raised", () => {
		saveFinishedRun({ packageSelection: 9 })
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Pending run/)
		simulate("Simulate: budget exhausted")
		expect(notice("budget")).toHaveTextContent("Budget reached: 240 of 240 work units for this Discovery")
		const reader = document.querySelector<HTMLElement>(".deliverable-reader")!
		expect(reader.querySelector(".reader-content")).not.toBeNull()
		fireEvent.click(within(reader).getByRole("button", { name: "Regenerate" }))
		const regenerate = dialog(/Regenerate part of/)
		expect(within(regenerate).getByRole("alert")).toHaveTextContent("can’t regenerate until the limit is raised")
		expect(within(regenerate).getByRole("button", { name: "Regenerate section" })).toBeDisabled()
		fireEvent.click(within(regenerate).getByRole("button", { name: "Cancel" }))

		fireEvent.click(within(notice("budget")!).getByRole("button", { name: "Raise the limit to 300 and resume" }))
		expect(notice("budget")).toBeNull()
		expect(runRecord().work?.fault).toBeNull()
		fireEvent.click(within(reader).getByRole("button", { name: "Regenerate" }))
		const after = dialog(/Regenerate part of/)
		fireEvent.change(within(after).getByRole("textbox", { name: /What MAX should change/ }), { target: { value: "Name the owner" } })
		fireEvent.click(within(after).getByRole("button", { name: "Regenerate section" }))
		expect(JSON.stringify(runRecord().work?.revisions)).toContain("Revised on request: Name the owner.")
	})

	it("names a revoked source and what it affects, and resumes after reconnecting", () => {
		saveFinishedRun()
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Pending run/)
		simulate("Simulate: connection revoked")
		expect(notice("connection")).toHaveTextContent("Virtual data room lost its connection")
		expect(notice("connection")).toHaveTextContent("Affected:")
		expect(within(notice("connection")!).getByRole("button", { name: "Open Integrations" })).toBeInTheDocument()
		fireEvent.click(within(notice("connection")!).getByRole("button", { name: "Reconnect OneDrive" }))
		expect(notice("connection")).toBeNull()
		expect(runRecord().work?.fault).toBeNull()
	})

	it("says the source is unhealthy in the Sources sheet instead of all healthy", () => {
		saveFinishedRun({ view: "autonomy" })
		render(<DiscoveryAutonomousPrototypePage openSignal={null} />)
		open(/Resume Pending run/)
		simulate("Simulate: connection revoked")
		fireEvent.click(screen.getByRole("button", { name: "Open setup" }))
		fireEvent.click(screen.getByRole("button", { name: "Open connected sources" }))
		const sheet = dialog("Connected sources")
		expect(sheet).toHaveTextContent("1 source needs reconnecting")
		expect(sheet).not.toHaveTextContent("All sources healthy")
		expect(sheet).toHaveTextContent("Reconnect needed")
	})
})

describe("interview briefs", () => {
	it("holds the run until they are approved, shows them as the interviewer receives them, and offers Approve all", () => {
		const records = seedRecords()
		const active = records.find(record => record.id === "seed-financial-integration")!
		localStorage.setItem(KEY, JSON.stringify([{ ...active, id: "run", title: "Brief run", phase: 2, invitesSent: false, view: "thread", work: undefined, interviewClosed: true }, ...records]))
		expect(listDiscoveryApprovals().filter(item => item.recordId === "run").map(item => item.kind)).toEqual(["brief", "brief", "brief", "brief"])
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Brief run, Needs your input/)
		expect(notice("briefs")).toHaveTextContent("4 interview briefs need your review")
		fireEvent.click(within(notice("briefs")!).getByRole("button", { name: "Review briefs" }))
		const sheet = dialog("Interview briefs")
		expect(sheet).toHaveTextContent("Everything the interviewer holds counts as shown to the participant.")
		for (const label of ["What to learn", "Questions", "Gaps and contradictions to probe", "Time budget", "Evidence the grant allows"]) expect(sheet).toHaveTextContent(label)

		// Adjusting one makes a new version that needs approving.
		fireEvent.click(within(sheet).getByRole("button", { name: "Adjust the brief for Ravi Menon" }))
		fireEvent.change(within(sheet).getByRole("textbox", { name: "What to learn" }), { target: { value: "Whether evidence capture survives an outage." } })
		fireEvent.click(within(sheet).getByRole("button", { name: "Save as brief v2" }))
		expect(sheet).toHaveTextContent("Whether evidence capture survives an outage.")
		expect(sheet.querySelector('[data-brief-person="ravi"]')).toHaveTextContent("brief v2")

		fireEvent.click(within(sheet).getByRole("button", { name: "Approve the brief for Ravi Menon" }))
		expect(runRecord().work?.briefs.filter(brief => brief.status === "draft")).toHaveLength(3)
		fireEvent.click(within(sheet).getByRole("button", { name: "Approve all" }))
		expect(runRecord().work?.briefs.every(brief => brief.status === "approved" && brief.approvedBy === "Root Admin")).toBe(true)
		expect(notice("briefs")).toBeNull()
	})

	it("opens one exact brief from My approvals", () => {
		const records = seedRecords()
		const active = records.find(record => record.id === "seed-financial-integration")!
		localStorage.setItem(KEY, JSON.stringify([{ ...active, id: "run", title: "Brief run", phase: 2, view: "thread", work: undefined, interviewClosed: true }, ...records]))
		const item = listDiscoveryApprovals().find(entry => entry.recordId === "run" && entry.kind === "brief")!
		expect(item.jump).toBe("brief:ravi")
		expect(item).toMatchObject({ target: "Brief run", version: "Brief v1" })
		const signal: DiscoveryOpenSignal = { tick: 1, recordId: item.recordId, jump: item.jump }
		render(<DiscoveryAutonomousPrototypePage openSignal={signal} />)
		expect(dialog("Interview briefs")).toBeInTheDocument()
	})
})

describe("My approvals", () => {
	it("lists what waits on the signed-in user, and each item opens its exact decision", () => {
		saveFinishedRun()
		const items = listDiscoveryApprovals()
		expect(items.find(item => item.kind === "decision")).toMatchObject({ recordId: "seed-tprm-control-redesign", jump: "decision" })
		const pending = items.find(item => item.recordId === "run")!
		expect(pending).toEqual({ id: "package:run:v1", recordId: "run", kind: "package", title: "Approve package v1", detail: "5 documents at manifest v4", target: "Pending run", version: "Package v1", jump: "package-approval:1" })
		// The seeded finished Discovery is approved, so it waits on nobody.
		expect(items.some(item => item.recordId === "seed-northbridge-diligence")).toBe(false)
		render(<DiscoveryAutonomousPrototypePage openSignal={{ tick: 1, recordId: "run", jump: pending.jump }} />)
		expect(dialog("Approve package v1")).toBeInTheDocument()
	})

	it("a stale link never approves the old version", () => {
		saveFinishedRun()
		render(<DiscoveryAutonomousPrototypePage openSignal={{ tick: 1, recordId: "run", jump: "package-approval:7" }} />)
		expect(dialog("Approve package v1")).toBeInTheDocument()
		expect(document.body).toHaveTextContent("Package v7 was replaced. Review v1.")
	})
})

describe("evidence", () => {
	const file = (name: string, size: number) => { const value = new File(["x"], name); Object.defineProperty(value, "size", { value: size }); return value }

	it("takes real files in the workspace: ready ones are evidence with a version and references, others say why not", () => {
		saveFinishedRun({ view: "autonomy" })
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Pending run/)
		fireEvent.click(screen.getByRole("button", { name: "Open setup" }))
		fireEvent.click(screen.getByRole("button", { name: "Open connected sources" }))
		const sheet = dialog("Connected sources")
		const input = within(sheet).getByLabelText("Upload documents")
		fireEvent.change(input, { target: { files: [file("controls.pdf", 700_000), file("macro.exe", 500), file("huge.pdf", 40 * 1024 * 1024)] } })
		const rows = () => Array.from(sheet.querySelectorAll("[data-file-state]"))
		expect(rows().map(row => row.getAttribute("data-file-state"))).toEqual(["ready", "refused", "refused"])
		expect(rows()[0]).toHaveTextContent("Uploaded · version 1 · p. 1 to p. 3")
		expect(rows()[1]).toHaveTextContent(".exe files aren’t supported")
		expect(rows()[2]).toHaveTextContent("over the 25.0 MB limit")
		fireEvent.drop(within(sheet).getByTestId("evidence-drop"), { dataTransfer: { files: [file("controls.pdf", 700_000)] } })
		expect(rows().at(-1)).toHaveTextContent("Uploaded · version 2")
		expect(runRecord().work?.files.filter(entry => entry.state === "ready")).toHaveLength(2)
	})

	it("labels public web sources, with URL and time, and gathers none when research is off", () => {
		saveFinishedRun({ view: "autonomy", work: { ...newWork(), research: { mode: "on", domains: [], at: "2026-10-30T09:00:00.000Z", sources: [{ id: "w1", title: "IFRS 15", url: "https://www.ifrs.org/x", retrievedAt: "2026-10-30T09:00:00.000Z", finding: "A finding." }] } } })
		render(<DiscoveryAutonomousPrototypePage />)
		open(/Resume Pending run/)
		fireEvent.click(screen.getByRole("button", { name: "Open setup" }))
		fireEvent.click(screen.getByRole("button", { name: "Open connected sources" }))
		const row = dialog("Connected sources").querySelector('[data-evidence="public-web"]')!
		expect(row).toHaveTextContent("Public web")
		expect(row).toHaveTextContent("https://www.ifrs.org/x")
		expect(row).toHaveTextContent("Retrieved")
	})

	it("a new mission reads the organization's setting: off says so and gathers nothing", async () => {
		act(() => publishPolicy("Web research", policy => ({ ...policy, research: { ...policy.research, mode: "off" } })))
		render(<DiscoveryAutonomousPrototypePage />)
		fireEvent.click(screen.getByRole("button", { name: "New Discovery" }))
		fireEvent.change(screen.getByRole("textbox", { name: "Discovery brief" }), { target: { value: "Decide whether we can automate vendor onboarding without weakening controls." } })
		fireEvent.change(screen.getByLabelText("Upload documents"), { target: { files: [file("vendor-policy.docx", 300_000)] } })
		expect(document.querySelector('[data-file-state="ready"]')).toHaveTextContent("vendor-policy.docx")
		fireEvent.click(screen.getByRole("button", { name: "Start autonomous Discovery" }))
		await screen.findByRole("heading", { name: "Review the mission" }, { timeout: 60_000 })
		expect(screen.getByText("Off for this organization. MAX gathers no public web sources.")).toBeInTheDocument()
		expect(screen.getByText(/1 uploaded/)).toBeInTheDocument()

		// The first release's five are selected; the others stay available.
		const outputs = screen.getByRole("region", { name: "Outputs for this mission" })
		const checked = within(outputs).getAllByRole("checkbox").filter(box => (box as HTMLInputElement).checked)
		expect(checked).toHaveLength(5)
		expect(outputs).toHaveTextContent("5 of 11 selected")
		fireEvent.click(within(outputs).getByRole("checkbox", { name: /Executive decision brief/ }))
		expect(outputs).toHaveTextContent("6 of 11 selected")

		fireEvent.click(screen.getByRole("checkbox", { name: "Mission authority reviewed" }))
		fireEvent.click(screen.getByRole("button", { name: "Create Discovery" }))
		await screen.findByRole("textbox", { name: "Message MAX" }, { timeout: 60_000 })
		await waitFor(() => expect(saved()[0].work?.files).toHaveLength(1))
		expect(saved()[0].excludedOutputs).toHaveLength(5)
		expect(saved()[0].work?.package.status).toBe("pending")

		const composer = screen.getByRole("textbox", { name: "Message MAX" })
		fireEvent.change(composer, { target: { value: "End the owner interview" } })
		fireEvent.keyDown(composer, { key: "Enter", code: "Enter" })
		await waitFor(() => expect(saved()[0].interviewClosed).toBe(true), { timeout: 60_000 })
		expect(saved()[0].work?.research).toMatchObject({ mode: "off", sources: [] })
		expect(saved()[0].work?.briefs.length).toBeGreaterThan(0)
		expect(saved()[0].phase).toBe(2)
		expect(notice("briefs")).not.toBeNull()
	})
})

describe("the stakeholder's link page (D-124)", () => {
	it("says the interviewer is an AI, what is kept and who sees it, and never promises anonymity", () => {
		render(<StakeholderInterviewPage />)
		expect(screen.getByText("MAX is an AI interviewer, not a person")).toBeInTheDocument()
		expect(screen.getByText(/Audio is never recorded or kept/)).toBeInTheDocument()
		expect(screen.getByText(/The Discovery owner and the project team/)).toBeInTheDocument()
		expect(document.body.textContent).not.toMatch(/anonymi/i)
	})
})
