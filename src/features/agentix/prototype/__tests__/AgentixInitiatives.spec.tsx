import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AgentixInitiativesPage, DiscoveryHandoffWorkspace } from "../AgentixInitiativesPage"
import { WORKFLOWS } from "../initiatives"
import { changeWork, initialWorkspace, newWork, readWorkspace, steerWork, STEP_INTERVAL, WORKSPACE_KEY, workFor } from "../workspaceState"

beforeEach(() => { localStorage.clear(); vi.useFakeTimers() })
afterEach(() => vi.useRealTimers())
const tick = (count = 1) => act(() => { vi.advanceTimersByTime(STEP_INTERVAL * count) })
const send = (text: string) => { fireEvent.change(screen.getByLabelText("Message Agentix"), { target: { value: text } }); fireEvent.click(screen.getByRole("button", { name: "Send message to Agentix" })) }

describe("Agentix work state", () => {
	it("keeps exactly one single-agent and three multi-agent use cases", () => {
		expect(WORKFLOWS.filter(w => w.team.length === 1)).toHaveLength(1)
		expect(WORKFLOWS.filter(w => w.team.length === 3)).toHaveLength(3)
		for (const w of WORKFLOWS) for (const step of w.steps) expect(step.actors.every(id => w.team.some(a => a.id === id))).toBe(true)
	})
	it("never turns generic resume into approval", () => {
		const w = workFor("invoice")
		let state = initialWorkspace().works.invoice
		state = changeWork(changeWork(state, w, "tick"), w, "tick")
		expect(state.waitingFor).toBe("approval")
		expect(changeWork(state, w, "resume")).toBe(state)
		expect(steerWork(state, w, "continue").status).toBe("waiting")
		expect(changeWork(state, w, "approve").notes.at(-1)).toContain("$240")
		expect(changeWork(state, w, "decline").status).toBe("declined")
	})
	it("holds notifications without claiming a complete outcome, then resumes only that step", () => {
		const w = workFor("service")
		let state = steerWork(newWork("running"), w, "don't send notifications")
		for (let i = 0; i < 5; i++) state = changeWork(state, w, "tick")
		expect(state.status).toBe("waiting")
		expect(state.waitingFor).toBe("notification")
		expect(state.stage).toBe(3)
		state = changeWork(state, w, "release-notification")
		expect(changeWork(state, w, "tick").status).toBe("complete")
	})
	it("reconciles an unknown ERP outcome autonomously instead of making the user click recovery", () => {
		const w = workFor("inventory")
		let state = newWork("running")
		for (let i = 0; i < 5; i++) state = changeWork(state, w, "tick")
		expect(state.status).toBe("complete")
		expect(state.notes.join(" ")).toContain("one create only")
	})
	it("requires and retains an explicit human fulfillment reference", () => {
		const w = workFor("onboarding")
		const state = { ...newWork("waiting"), stage: 2, waitingFor: "human" as const }
		expect(changeWork(state, w, "fulfill")).toBe(state)
		expect(changeWork(state, w, "fulfill", "PAYROLL-306/OWNER-2").notes.at(-1)).toContain("PAYROLL-306/OWNER-2")
	})
	it("recovers malformed storage and never interprets unknown chat as a successful action", () => {
		localStorage.setItem(WORKSPACE_KEY, "invalid")
		expect(readWorkspace()).toEqual(initialWorkspace())
		const state = steerWork(newWork("ready"), workFor("service"), "Give everyone administrator access")
		expect(state.status).toBe("ready")
		expect(state.messages.at(-1)?.text).toContain("haven’t applied")
	})
	it("does not mistake questions or negated instructions for authority to act", () => {
		const state = newWork("running")
		expect(steerWork(state, workFor("service"), "What happens if I pause?").status).toBe("running")
		expect(steerWork(state, workFor("service"), "Don't pause the work").status).toBe("running")
		expect(steerWork(state, workFor("service"), "Why is this high priority?").priority).toBe("Normal")
	})
})

describe("Agentix common workspace", () => {
	it("starts with real work, an agent team, activity and a reachable composer", () => {
		render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
		expect(screen.getByRole("main", { name: "Agentix workspace" })).toBeInTheDocument()
		expect(screen.getByRole("region", { name: "Agent team" })).toHaveTextContent("AP coordinator")
		expect(screen.getByRole("region", { name: "Agent activity" })).toHaveTextContent("1 of 5 steps complete")
		expect(screen.getByLabelText("Message Agentix")).toBeInTheDocument()
		expect(screen.queryByText(/sample run/i)).not.toBeInTheDocument()
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
	})
	it("steers in place, preserves drafts and selected work across refresh", () => {
		const { unmount } = render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
		send("Pause this work")
		tick(3)
		expect(screen.getByRole("button", { name: "Resume work" })).toBeInTheDocument()
		expect(screen.getByRole("region", { name: "Agent activity" })).toHaveTextContent("1 of 5")
		send("Make this high priority")
		expect(screen.getByRole("navigation", { name: "Initiatives" })).toHaveTextContent("↑")
		fireEvent.change(screen.getByLabelText("Message Agentix"), { target: { value: "Keep this unfinished message" } })
		unmount()
		render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
		expect(screen.getByLabelText("Message Agentix")).toHaveValue("Keep this unfinished message")
		expect(screen.getByRole("button", { name: "Resume work" })).toBeInTheDocument()
	})
	it("keeps approval in the conversation and reports accurate shell attention", () => {
		const attention = vi.fn()
		render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} onAttentionChange={attention} />)
		tick(2)
		expect(attention).toHaveBeenLastCalledWith({ count: 1, approval: true, audience: false })
		fireEvent.click(screen.getByRole("button", { name: "Approve $240 variance" }))
		tick(4)
		expect(screen.getByRole("region", { name: "Verified outcome evidence" })).toHaveTextContent("Payment controls preserved")
		expect(attention).toHaveBeenLastCalledWith({ count: 0, approval: false, audience: false })
	})
	it("imports a Discovery draft into the same workspace without authority to act", () => {
		const sendDesign = vi.fn()
		const { unmount } = render(<DiscoveryHandoffWorkspace workflowId="onboarding" onBack={vi.fn()} onSend={sendDesign} />)
		fireEvent.click(screen.getByRole("button", { name: "Send to Agentix" }))
		expect(sendDesign).toHaveBeenCalledWith("onboarding")
		unmount()
		render(<AgentixInitiativesPage intentSignal={{ tick: 1, intent: { type: "import", id: "onboarding" } }} onOpenDiscovery={vi.fn()} />)
		expect(screen.getByRole("region", { name: "Proposed operating plan" })).toHaveTextContent("Human dependency")
		expect(screen.getByRole("button", { name: "Activate and start" })).toBeInTheDocument()
		expect(readWorkspace().works.onboarding.status).toBe("draft")
	})
	it("makes unsupported creation honest without losing the brief", () => {
		render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
		fireEvent.click(screen.getByRole("button", { name: "New work" }))
		fireEvent.change(screen.getByLabelText("Describe your operational need"), { target: { value: "  Something completely new  " } })
		fireEvent.click(screen.getByRole("button", { name: "Prepare operating plan" }))
		expect(screen.getByRole("status")).toHaveTextContent("Arbitrary agent creation isn’t connected")
		expect(screen.getByLabelText("Describe your operational need")).toHaveValue("  Something completely new  ")
	})
})
