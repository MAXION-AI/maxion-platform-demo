import { fireEvent, render, screen, within } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { activate, answerQuestion, decide, latest, receivePackage, tick } from "../engine/engine"
import { initialState } from "../engine/seed"
import { teamPresence, workSummary } from "../engine/selectors"
import { sendInstruction } from "../engine/steering"
import type { AgentixState } from "../engine/types"
import { Composer } from "../Conversation"
import { DashboardPreview } from "../ResultPreviews"
import { ResultsView } from "../ResultsView"
import { WorkDetail } from "../WorkDetail"
import { WorkView } from "../WorkView"
import { DemoControls } from "../Sheets"
import { DecisionCard } from "../Decisions"

const REV = "invoice"
const run = (state: AgentixState, until: (s: AgentixState) => boolean, max = 120) => {
	let current = state
	for (let i = 0; i < max && !until(current); i++) current = tick(current)
	if (!until(current)) throw new Error("condition not reached")
	return current
}
const item = (state: AgentixState, reference: string) => state.work.find(entry => entry.engagementId === REV && entry.reference === reference)!
const artifact = (state: AgentixState, key: string) => state.artifacts.find(entry => entry.id === `${REV}:${key}`)
const openDecision = (state: AgentixState, reference: string) => state.decisions.find(entry => entry.workItemId === item(state, reference)?.id && entry.status === "open")

function activated() {
	let state = receivePackage(initialState(), "pkg_revenue_v2", "discovery")
	state = answerQuestion(state, REV, "release", "approval")
	state = answerQuestion(state, REV, "testdata", "synthetic")
	return activate(state, REV)
}

describe("Work view facts", () => {
	it("attributes a decision wait to the specialist who continues after it, and says what is happening in one line", () => {
		const state = run(activated(), s => !!openDecision(s, "MS-1"))
		const data = teamPresence(state, REV).find(entry => entry.member.id === "data")!
		expect(data.state).toBe("decision")
		expect(data.sentence).toBe("Waiting on your decision · MS-1")
		expect(teamPresence(state, REV).find(entry => entry.member.id === "dashboard")!.sentence).toMatch(/Waiting for MS-2's validated schema/)
		expect(workSummary(state, state.engagements[REV])).toMatch(/waiting on other work.*need you; everything else continues on its own\.$/)
	})
})

describe("Work view", () => {
	it("marks recurring data stale when the last scheduled review hasn't verified, and fresh ones plainly", () => {
		const noop = vi.fn()
		const callbacks = { onOpenWork: noop, onOpenResult: noop, onDecide: noop, onTeam: noop, onRestore: noop }
		const { unmount } = render(<WorkView state={initialState()} engagementId="inventory" callbacks={callbacks} showHistory={false} onHistory={noop} />)
		expect(screen.getByText(/^Stale · Last review/)).toBeInTheDocument()
		unmount()
		render(<WorkView state={initialState()} engagementId="service" callbacks={callbacks} showHistory={false} onHistory={noop} />)
		expect(screen.queryByText(/Stale/)).not.toBeInTheDocument()
	})
})

describe("Work detail", () => {
	it("lists each tested version with what failed, and reads the release step from its release", () => {
		let state = run(activated(), s => !!openDecision(s, "MS-1"))
		state = decide(state, openDecision(state, "MS-1")!.id, "unassigned")
		state = run(state, s => !!openDecision(s, "MS-2"))
		const noop = vi.fn()
		render(<WorkDetail state={state} workId={item(state, "MS-2").id} callbacks={{ onDecide: noop, onFulfill: noop, onWork: noop, onRelease: noop, onRestore: noop, onReconnect: noop, onOpenResult: noop, onOpenWork: noop, onMessage: noop }} />)
		const runs = screen.getByRole("list", { name: "Test runs for Ingestion and transformation pipeline" })
		expect(within(runs).getByText(/v1/).closest("li")).toHaveTextContent("first build · 2 of 9 checks failed")
		expect(within(runs).getByText(/v2/).closest("li")).toHaveTextContent("automatic repair · 9 of 9 checks passed")
		const steps = screen.getByRole("region", { name: "Steps" })
		expect(steps).toHaveTextContent("Needs approval")
		expect(steps).not.toHaveTextContent("Releasing the tested version to the revenue schema")
		expect(screen.getByRole("button", { name: "Approve release" })).toBeInTheDocument()
	})
})

describe("Dashboard preview", () => {
	it("leaves invoices without a region out of the regional bars when the owner chose that", () => {
		let state = run(activated(), s => !!openDecision(s, "MS-1"))
		state = decide(state, openDecision(state, "MS-1")!.id, "exclude")
		state = run(state, s => !!artifact(s, "dashboard"))
		const dashboard = artifact(state, "dashboard")!
		render(<DashboardPreview state={state} artifact={dashboard} version={latest(dashboard)} />)
		const chart = screen.getByRole("list", { name: "Revenue by region" })
		expect(within(chart).queryByText("Unassigned")).not.toBeInTheDocument()
		expect(screen.getByText(/count in the company total but not in any regional bar/)).toBeInTheDocument()
	})
})

describe("Results", () => {
	it("follows production to the newly released version and labels the old one as previously live", () => {
		let state = run(activated(), s => !!openDecision(s, "MS-1"))
		state = decide(state, openDecision(state, "MS-1")!.id, "unassigned")
		state = run(state, s => !!openDecision(s, "MS-2"))
		state = decide(state, openDecision(state, "MS-2")!.id, "approve")
		state = run(state, s => s.engagements[REV].cycles === "daily")
		const id = artifact(state, "dashboard")!.id
		state = tick(sendInstruction(state, REV, { kind: "artifact", id }, "Add regional drill-down to this dashboard"))
		const callbacks = { onSelect: vi.fn(), onRequestChange: vi.fn(), onOpenWork: vi.fn() }
		const { rerender } = render(<ResultsView state={state} engagementId={REV} resultId={id} callbacks={callbacks} />)
		expect(screen.getByRole("heading", { name: /Revenue dashboard v1/ })).toBeInTheDocument()
		expect(screen.getByText("Latest is v2")).toBeInTheDocument()
		state = run(state, s => artifact(s, "dashboard")!.productionVersion === 2)
		rerender(<ResultsView state={state} engagementId={REV} resultId={id} callbacks={callbacks} />)
		expect(screen.getByRole("heading", { name: /Revenue dashboard v2/ })).toBeInTheDocument()
		expect(screen.getAllByText("Production").length).toBeGreaterThan(0)
		fireEvent.click(screen.getByRole("button", { name: "AMER" }))
		expect(screen.getByRole("list", { name: "AMER countries" })).toHaveTextContent("United States")
		fireEvent.click(screen.getByRole("button", { name: /^v1/ }))
		expect(screen.getAllByText("Previously in production").length).toBeGreaterThan(0)
	})
})

describe("Composer", () => {
	it("keeps an unsent draft on its own scope and offers to write about what you're viewing instead", () => {
		const state = initialState()
		const work = item(state, "INV-20842")
		const onScope = vi.fn()
		render(<Composer state={state} engagementId={REV} scope={{ kind: "work", id: work.id }} viewScope={{ kind: "engagement" }} draft="Hold this until Monday" inputRef={createRef()} onDraft={vi.fn()} onSend={vi.fn()} onScope={onScope} conversationOpen={false} onToggleConversation={vi.fn()} unread={0} />)
		expect(screen.getByText("Your unsent draft stays about INV-20842.")).toBeInTheDocument()
		expect(screen.getByLabelText(/Message Revenue coordinator about INV-20842/)).toHaveValue("Hold this until Monday")
		fireEvent.click(screen.getByRole("button", { name: "Write about Engagement instead" }))
		expect(onScope).toHaveBeenCalledWith({ kind: "engagement" })
		expect(screen.getByRole("button", { name: "Conversation" })).toBeInTheDocument()
	})

	it("drops its own conversation toggle once the conversation is open around it", () => {
		render(<Composer state={initialState()} engagementId={REV} scope={{ kind: "engagement" }} viewScope={{ kind: "engagement" }} draft="" inputRef={createRef()} onDraft={vi.fn()} onSend={vi.fn()} onScope={vi.fn()} conversationOpen onToggleConversation={vi.fn()} unread={0} />)
		expect(screen.queryByRole("button", { name: /^Conversation/ })).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Send to the accountable agent" })).toBeDisabled()
	})
})

describe("Controls", () => {
	it("falls back to an existing engagement when the one in focus no longer exists (after a reset)", () => {
		const noop = vi.fn()
		render(<DemoControls state={initialState()} titleId="t" focusId="eng-gone" onClose={noop} onTick={noop} onSkip={noop} onWindow={noop} onSchedule={noop} onIncoming={noop} onExpire={noop} onLosePermission={noop} onAckLoss={noop} onReset={noop} />)
		expect(screen.getByRole("heading", { name: "Controls" })).toBeInTheDocument()
		expect(screen.getByText("Run the next scheduled cycle now")).toBeInTheDocument()
	})
})

describe("Decision card", () => {
	it("asks before declining and returns focus to Decline when you back out with Escape", () => {
		const state = initialState()
		const decision = state.decisions.find(entry => entry.status === "open" && entry.template === "variance")!
		const onDecide = vi.fn()
		render(<DecisionCard state={state} decisionId={decision.id} onDecide={onDecide} />)
		const decline = screen.getByRole("button", { name: "Decline" })
		decline.focus()
		fireEvent.click(decline)
		const confirm = screen.getByRole("group", { name: "Confirm your choice" })
		expect(screen.getByRole("button", { name: "Keep reviewing" })).toHaveFocus()
		fireEvent.keyDown(confirm, { key: "Escape" })
		expect(screen.getByRole("button", { name: "Decline" })).toHaveFocus()
		expect(onDecide).not.toHaveBeenCalled()
	})
})
