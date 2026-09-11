import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AgentixInitiativesPage, DiscoveryHandoffWorkspace } from "../AgentixInitiativesPage"
import { emptyInitiative, readInitiatives, STORAGE_KEY, transitionCase, WORKFLOWS, type WorkflowId } from "../initiatives"

beforeEach(() => localStorage.clear())
const workflow = (id: WorkflowId) => WORKFLOWS.find(w => w.id === id)!
function launch(id: WorkflowId) {
	const w = workflow(id)
	fireEvent.click(screen.getByRole("button", { name: new RegExp(`${w.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ${w.title}`) }))
	fireEvent.click(screen.getByRole("button", { name: "Import Discovery package" }))
	if (id === "onboarding") fireEvent.click(screen.getByRole("button", { name: "Keep payroll access as a human step" }))
	fireEvent.click(screen.getByRole("button", { name: "Activate initiative" }))
	fireEvent.click(screen.getByRole("button", { name: "Run sample case" }))
}

describe("Agentix initiative state machine", () => {
	it("contains exactly one single-agent and three multi-agent examples", () => {
		expect(WORKFLOWS.filter(w => w.team.length === 1)).toHaveLength(1)
		expect(WORKFLOWS.filter(w => w.team.length > 1)).toHaveLength(3)
		for (const w of WORKFLOWS) for (const step of w.steps) expect(step.actors.every(id => w.team.some(agent => agent.id === id))).toBe(true)
	})
	it("requires import and permission disposition before activation", () => {
		const w = workflow("onboarding")
		let s = emptyInitiative()
		expect(transitionCase(s, w, "activate").status).toBe("draft")
		s = transitionCase(s, w, "import")
		expect(transitionCase(s, w, "activate").status).toBe("draft")
		s = transitionCase(s, w, "human-fallback")
		expect(transitionCase(s, w, "activate").status).toBe("ready")
	})
	it("does not duplicate imports or bypass a financial decision", () => {
		const w = workflow("invoice")
		let s = transitionCase(emptyInitiative(), w, "import")
		expect(transitionCase(s, w, "import")).toBe(s)
		for (const action of ["activate", "start", "tick", "tick", "tick"] as const) s = transitionCase(s, w, action)
		expect(s.status).toBe("waiting")
		expect(transitionCase(s, w, "tick")).toBe(s)
		expect(transitionCase(s, w, "resume")).toBe(s)
		expect(transitionCase(s, w, "decline").status).toBe("declined")
		expect(transitionCase(s, w, "resolve").notes.at(-1)).toContain("$240")
	})
	it("preserves paused progress and reconciles before completion", () => {
		const w = workflow("inventory")
		let s = { ...emptyInitiative(), imported: true, status: "running" as const }
		const paused = transitionCase(s, w, "pause")
		expect(transitionCase(paused, w, "tick")).toBe(paused)
		let next = transitionCase(paused, w, "resume")
		for (let i = 0; i < 3; i++) next = transitionCase(next, w, "tick")
		expect(next.status).toBe("waiting")
		next = transitionCase(next, w, "resolve")
		for (let i = 0; i < 4; i++) next = transitionCase(next, w, "tick")
		expect(next.status).toBe("complete")
		expect(next.notes.some(note => note.includes("one create only"))).toBe(true)
	})
	it("recovers safely from malformed and incomplete browser storage", () => {
		localStorage.setItem(STORAGE_KEY, "not json")
		expect(readInitiatives().invoice.status).toBe("draft")
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ invoice: { ...emptyInitiative(), stage: 900 } }))
		expect(readInitiatives().invoice.stage).toBe(0)
	})
})

describe("Agentix initiative experience", () => {
	it("shows business outcomes without workflow/persona categories or model controls", () => {
		render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
		expect(screen.getByRole("heading", { name: "Put better processes to work." })).toBeInTheDocument()
		expect(within(screen.getByRole("region", { name: "Enterprise workflow examples" })).getAllByRole("button")).toHaveLength(4)
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
	})
	it("carries the selected Discovery package into Agentix, without silently activating", () => {
		const send = vi.fn()
		const { unmount } = render(<DiscoveryHandoffWorkspace workflowId="invoice" onBack={vi.fn()} onSend={send} />)
		expect(screen.getByText("Bind the approval to this invoice version and exact $240 variance.")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Send to Agentix" }))
		expect(send).toHaveBeenCalledWith("invoice")
		unmount()
		render(<AgentixInitiativesPage intentSignal={{ tick: 1, intent: { type: "import", id: "invoice" } }} onOpenDiscovery={vi.fn()} />)
		expect(screen.getByText("Discovery package INVOICE-v1")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Activate initiative" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Run sample case" })).not.toBeInTheDocument()
	})
	it("runs the single agent to verified outcome evidence", async () => {
		render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
		launch("service")
		await waitFor(() => expect(screen.getByRole("region", { name: "Verified outcome evidence" })).toBeInTheDocument(), { timeout: 10000 })
		expect(screen.getByText("INC-10482 · Workplace support · Open")).toBeInTheDocument()
	})
	it("waits for and can decline the exact invoice decision without claiming completion", async () => {
		const attention = vi.fn()
		render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} onAttentionChange={attention} />)
		launch("invoice")
		await screen.findByRole("button", { name: "Decline variance" }, { timeout: 10000 })
		expect(attention).toHaveBeenLastCalledWith({ count: 1, approval: true, audience: false })
		fireEvent.click(screen.getByRole("button", { name: "Decline variance" }))
		expect(screen.getByRole("heading", { name: "Variance declined. No ERP resolution was posted." })).toBeInTheDocument()
		expect(screen.queryByRole("region", { name: "Verified outcome evidence" })).not.toBeInTheDocument()
	})
	it("explains agent choice in chat and does not silently widen permission", () => {
		render(<AgentixInitiativesPage intentSignal={{ tick: 1, intent: { type: "import", id: "onboarding" } }} onOpenDiscovery={vi.fn()} />)
		expect(screen.getByRole("button", { name: "Activate initiative" })).toBeDisabled()
		fireEvent.change(screen.getByLabelText("Ask about this initiative"), { target: { value: "Why this team?" } })
		fireEvent.click(screen.getByRole("button", { name: "Send message to Agentix" }))
		expect(within(screen.getByRole("region", { name: "Initiative conversation" })).getByText(workflow("onboarding").teamReason)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Activate initiative" })).toBeDisabled()
	})
	it("matches natural language to examples and honestly rejects unsupported generation", () => {
		render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
		fireEvent.change(screen.getByLabelText("What should Agentix take care of?"), { target: { value: "   Do something completely new   " } })
		fireEvent.click(screen.getByRole("button", { name: "Explore operational need" }))
		expect(screen.getByRole("status")).toHaveTextContent("arbitrary task generation is not connected")
	})
})
