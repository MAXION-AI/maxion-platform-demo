import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AgentixInitiativesPage } from "../AgentixInitiativesPage"
import { DiscoveryHandoffWorkspace } from "../DiscoveryHandoffWorkspace"
import { WORKFLOWS } from "../initiatives"
import { admitOccurrence, initialOperations, messageAgent, measures, nextSchedule, persistOperations, readOperations, readiness, setMapping, tickOperations, updateAgent, updateRun, DEMO_TICK_MS, type OperationsState } from "../operationsState"
import { demoStateRepository } from "@/features/platform-prototype/persistence/DemoStateRepository"

beforeEach(() => { localStorage.clear(); vi.useFakeTimers() })
afterEach(() => vi.useRealTimers())
const advance = (state: OperationsState, count = 1) => { for (let i = 0; i < count; i++) state = tickOperations(state); return state }
const run = (state: OperationsState, ref: string) => state.runs.find(r => r.reference === ref)!
const tick = (count = 1) => act(() => vi.advanceTimersByTime(DEMO_TICK_MS * count))
const ready = () => advance(updateAgent(setMapping(initialOperations(), "onboarding", "london-standard"), "onboarding", "recheck"))

describe("deployed operations state", () => {
  it("retains one single-agent and three coordinated responsibilities", () => {
    expect(WORKFLOWS.filter(w => w.team.length === 1)).toHaveLength(1)
    expect(WORKFLOWS.filter(w => w.team.length === 3)).toHaveLength(3)
  })
  it("progresses independent cases while one approval waits", () => {
    const state = advance(initialOperations(), 10)
    expect(run(state, "INV-20841").phase).toBe("approval")
    expect(run(state, "INV-20842").phase).toBe("verified")
    expect(run(state, "INV-20843").phase).toBe("verified")
    expect(state.agents.invoice.status).toBe("active")
  })
  it("pauses intake but preserves progress in admitted cases", () => {
    const state = advance(updateAgent(initialOperations(), "invoice", "pause-intake"), 10)
    expect(run(state, "INV-20842").phase).toBe("verified")
    expect(run(state, "INV-20845").phase).toBe("queued")
  })
  it("pauses only the selected case and cannot turn resume into approval", () => {
    let state = advance(updateRun(initialOperations(), "invoice:INV-20842", "pause"), 8)
    expect(run(state, "INV-20842").step).toBe(1)
    expect(run(state, "INV-20843").phase).toBe("verified")
    state = messageAgent(state, "invoice", "continue", "invoice:INV-20841")
    expect(run(state, "INV-20841").phase).toBe("approval")
    expect(run(updateRun(state, "invoice:INV-20842", "resume"), "INV-20842").phase).toBe("working")
  })
  it("requires mapping and successful recheck before idempotent deployment", () => {
    let state = initialOperations()
    expect(updateAgent(state, "onboarding", "deploy")).toBe(state)
    expect(setMapping(state, "onboarding", "privileged")).toBe(state)
    state = setMapping(state, "onboarding", "london-standard")
    expect(readiness(state.agents.onboarding)).toBe("repair")
    state = updateAgent(state, "onboarding", "recheck")
    expect(readiness(state.agents.onboarding)).toBe("checking")
    state = advance(state)
    expect(readiness(state.agents.onboarding)).toBe("ready")
    state = updateAgent(updateAgent(state, "onboarding", "deploy"), "onboarding", "deploy")
    expect(state.runs.filter(r => r.agentId === "onboarding")).toHaveLength(1)
  })
  it("never turns a support request into certification or silently drops a requirement", () => {
    let state = updateAgent(updateAgent(ready(), "onboarding", "request-payroll"), "onboarding", "support")
    expect(readiness(state.agents.onboarding)).toBe("unsupported")
    expect(updateAgent(state, "onboarding", "deploy")).toBe(state)
    state = updateAgent(state, "onboarding", "use-human-payroll")
    expect(readiness(state.agents.onboarding)).toBe("repair")
    state = advance(updateAgent(state, "onboarding", "recheck"))
    expect(readiness(state.agents.onboarding)).toBe("ready")
    expect(state.agents.onboarding.notes.join(" ")).toContain("not silently dropped")
  })
  it("separates applied writes from verification and resumes only unfinished obligations after repair", () => {
    let state = initialOperations()
    expect(run(state, "INV-20844").writes).toBe(1)
    expect(run(state, "INV-20844").phase).toBe("verifying")
    state = advance(updateAgent(state, "invoice", "expire"))
    expect(run(state, "INV-20844").phase).toBe("partial")
    state = advance(updateAgent(state, "invoice", "reconnect"), 5)
    expect(run(state, "INV-20844").phase).toBe("verified")
    expect(run(state, "INV-20844").writes).toBe(1)
  })
  it("preserves case-specific notification holds across an agent-wide release", () => {
    let state = updateRun(initialOperations(), "invoice:INV-20844", "hold")
    state = advance(updateAgent(state, "invoice", "hold-notifications"))
    state = updateAgent(state, "invoice", "release-notifications")
    expect(run(state, "INV-20844").held).toBe(true)
    expect(run(state, "INV-20844").phase).toBe("partial")
  })
  it("requires human fulfillment evidence and subsequent verification", () => {
    let state = advance(updateAgent(ready(), "onboarding", "deploy"), 5)
    expect(run(state, "JOIN-306").phase).toBe("human")
    state = updateRun(state, "onboarding:JOIN-306", "fulfill", " ")
    expect(run(state, "JOIN-306").phase).toBe("human")
    state = updateRun(state, "onboarding:JOIN-306", "fulfill", "PAYROLL-306")
    expect(run(state, "JOIN-306").phase).toBe("working")
    expect(run(state, "JOIN-306").humanReference).toBe("PAYROLL-306")
    expect(run(advance(state, 5), "JOIN-306").phase).toBe("verified")
  })
  it("records declined outcomes without writes or false completion", () => {
    const state = advance(updateRun(initialOperations(), "invoice:INV-20841", "decline"), 8)
    expect(run(state, "INV-20841").phase).toBe("not_completed")
    expect(run(state, "INV-20841").writes).toBe(0)
  })
  it("retains separate recurring outcomes and a missed cycle; occurrence admission is idempotent", () => {
    let state = nextSchedule(initialOperations())
    const count = state.runs.length
    state = admitOccurrence(state, "inventory", "2026-09-14T05:00:00Z", true)
    expect(state.runs).toHaveLength(count)
    state = nextSchedule(state)
    expect(state.runs).toHaveLength(count + 1)
    expect(run(state, "STOCK-901").phase).toBe("not_completed")
    expect(new Set(state.runs.filter(r => r.agentId === "inventory").map(r => r.occurrence)).size).toBe(state.runs.filter(r => r.agentId === "inventory").length)
  })
  it("bounds demo intake without deleting historical evidence", () => {
    let state = initialOperations()
    for (let i = 0; i < 210; i++) state = admitOccurrence(state, "service", "event-" + i)
    expect(state.runs).toHaveLength(200)
    expect(run(state, "STOCK-901")).toBeDefined()
    expect(admitOccurrence(state, "service", "over-cap")).toBe(state)
  })
  it("derives measurements from all outcomes, failures and costs", () => {
    const result = measures(initialOperations().runs.filter(r => r.agentId === "inventory"))
    expect(result).toMatchObject({ total: 4, verified: 2, eligible: 3, straightThrough: 2, cost: .66 })
  })
  it("admits periodic events independently of conversation", () => {
    expect(advance(initialOperations(), 12).runs.some(r => r.occurrence.startsWith("incoming:"))).toBe(true)
  })
  it("rejects malformed persisted state without modifying previous demo storage", () => {
    const operationsKey = demoStateRepository.storageKey("agentix-operations")
    localStorage.setItem("maxion-agentix-workspace-v2", "preserved")
    for (const input of ["bad", JSON.stringify({ version: 3 }), JSON.stringify({ ...initialOperations(), runs: [{ ...initialOperations().runs[0], trigger: 42 }] })]) {
      localStorage.setItem(operationsKey, input)
      expect(readOperations()).toEqual(initialOperations())
    }
    expect(localStorage.getItem("maxion-agentix-workspace-v2")).toBe("preserved")
    expect(persistOperations(initialOperations())).toBe(true)
    expect(readOperations()).toEqual(initialOperations())
  })
  it("does not turn questions, negations or cross-agent references into authority", () => {
    for (const input of ["What if I pause?", "Don't pause intake", "Give everyone admin access", "Why is this high priority?"]) {
      const state = messageAgent(initialOperations(), "invoice", input)
      expect(state.agents.invoice.status).toBe("active")
      expect(run(state, "INV-20842").priority).toBe("Normal")
    }
    const state = messageAgent(initialOperations(), "service", "pause", "invoice:INV-20842")
    expect(run(state, "INV-20842").phase).toBe("working")
    expect(state.agents.service.status).toBe("active")
  })
  it("keeps agent and case drafts separate when messages are sent", () => {
    let state = initialOperations()
    state.agents.invoice.draft = "Agent-wide unfinished message"
    state.agents.invoice.caseDrafts = { "invoice:INV-20842": "Case-only direction" }
    state = messageAgent(state, "invoice", "Prioritize this case", "invoice:INV-20842")
    expect(state.agents.invoice.draft).toBe("Agent-wide unfinished message")
    expect(state.agents.invoice.caseDrafts?.["invoice:INV-20842"]).toBe("")
    expect(run(state, "INV-20842").priority).toBe("High")
    expect(run(state, "INV-20843").priority).toBe("Normal")
  })
  it("prioritizes eligible queued work without bypassing the concurrency cap", () => {
    let state = initialOperations()
    state.runs = state.runs.filter(r => !["INV-20842", "INV-20843", "INV-20844"].includes(r.reference))
    state = admitOccurrence(state, "invoice", "priority-test")
    const latest = state.runs.at(-1)!
    state = updateRun(state, latest.id, "prioritize")
    state = advance(state)
    expect(state.runs[0].id).toBe(latest.id)
    expect(state.runs[0].phase).toBe("working")
    expect(state.runs.filter(r => r.agentId === "invoice" && ["working", "verifying", "recovering"].includes(r.phase)).length).toBeLessThanOrEqual(3)
  })
  it("approval completion and bulk notification release also respect execution capacity", () => {
    let state = updateRun(initialOperations(), "invoice:INV-20841", "approve")
    expect(run(state, "INV-20841").phase).toBe("queued")
    state = updateAgent(state, "invoice", "hold-notifications")
    state = advance(state, 10)
    state = updateAgent(state, "invoice", "release-notifications")
    for (let i = 0; i < 12; i++) {
      state = advance(state)
      expect(state.runs.filter(r => r.agentId === "invoice" && ["working", "verifying", "recovering"].includes(r.phase)).length).toBeLessThanOrEqual(3)
    }
    expect(run(state, "INV-20841").phase).toBe("verified")
  })
})

describe("agent-first workspace", () => {
  it("lands on agents without a chat composer or setup tour", () => {
    render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
    expect(screen.getByRole("heading", { name: "Deployed agents" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Deployed agents" }).querySelectorAll("button")).toHaveLength(4)
    expect(screen.queryByRole("textbox", { name: "Message this agent" })).not.toBeInTheDocument()
    expect(screen.queryByText(/sample run/i)).not.toBeInTheDocument()
  })
  it("shows concurrent cases and progresses without an open conversation", () => {
    render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /Invoice operations agent Resolve/ }))
    expect(screen.getByRole("region", { name: "Current work" }).querySelectorAll("button")).toHaveLength(5)
    tick(10)
    expect(readOperations().runs.find(r => r.reference === "INV-20842")?.phase).toBe("verified")
    expect(screen.getByRole("region", { name: "Current work" })).toHaveTextContent("Needs approval")
  })
  it("imports Discovery into a readiness proposal without starting work", () => {
    render(<AgentixInitiativesPage intentSignal={{ tick: 1, intent: { type: "import", id: "onboarding" } }} onOpenDiscovery={vi.fn()} />)
    expect(screen.getByRole("region", { name: "Proposed operating plan" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Deploy agent in demo" })).toBeDisabled()
    expect(readOperations().agents.onboarding.status).toBe("draft")
    fireEvent.click(screen.getByRole("button", { name: /Confirm mapping/ }))
    fireEvent.change(screen.getByLabelText(/London analyst/), { target: { value: "london-standard" } })
    fireEvent.click(screen.getByRole("button", { name: "Recheck readiness" }))
    tick()
    expect(screen.getByRole("button", { name: "Deploy agent in demo" })).toBeEnabled()
  })
  it("reuses a deployed responsibility when its Discovery is imported again", () => {
    render(<AgentixInitiativesPage intentSignal={{ tick: 1, intent: { type: "import", id: "invoice" } }} onOpenDiscovery={vi.fn()} />)
    expect(screen.getByRole("status")).toHaveTextContent("no duplicate agent")
    expect(readOperations().runs.filter(r => r.agentId === "invoice")).toHaveLength(7)
  })
  it("preserves unsupported natural-language input without fabricating a deployment", () => {
    render(<AgentixInitiativesPage onOpenDiscovery={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "New agent" }))
    fireEvent.change(screen.getByLabelText("Describe the responsibility"), { target: { value: "A completely different responsibility" } })
    fireEvent.click(screen.getByRole("button", { name: "Prepare agent" }))
    expect(screen.getByRole("status")).toHaveTextContent("Your brief is preserved")
    expect(screen.getByLabelText("Describe the responsibility")).toHaveValue("A completely different responsibility")
  })
  it("keeps the existing evidence handoff from Discovery", () => {
    const send = vi.fn()
    render(<DiscoveryHandoffWorkspace workflowId="onboarding" onBack={vi.fn()} onSend={send} />)
    fireEvent.click(screen.getByRole("button", { name: "Send to Agentix" }))
    expect(send).toHaveBeenCalledWith("onboarding")
  })
})
