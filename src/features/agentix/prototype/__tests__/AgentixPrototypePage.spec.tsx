import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { AgentixPrototypePage } from "../AgentixPrototypePage"

function renderPrototype() {
	return render(
		<MemoryRouter initialEntries={["/agentix-prototype"]}>
			<AgentixPrototypePage />
		</MemoryRouter>,
	)
}

describe("AgentixPrototypePage", () => {
	it("opens as a command-first workstream instead of a dashboard or product-type picker", () => {
		renderPrototype()

		expect(screen.getByRole("heading", { name: "Two decisions. Three agents working." })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: "Needs you" })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: "Live work" })).toBeInTheDocument()
		expect(screen.getByLabelText("Message Agentix")).toHaveAttribute("placeholder", "What should Agentix take care of?")
		expect(screen.queryByRole("button", { name: "Workflows" })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Roles" })).not.toBeInTheDocument()
	})

	it("resolves a material question inline and removes it from the shared attention queue", async () => {
		renderPrototype()

		fireEvent.click(screen.getByRole("button", { name: "Answer" }))
		await waitFor(() => expect(screen.getByRole("heading", { name: "Who may receive overdue reminders?" })).toBeInTheDocument())

		fireEvent.click(screen.getByRole("button", { name: "Use project team only" }))
		expect(screen.getByText("Audience resolved. The existing run resumed.")).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole("heading", { name: "Who may receive overdue reminders?" })).not.toBeInTheDocument())

		fireEvent.click(screen.getByRole("button", { name: "Today 1" }))
		await waitFor(() => expect(screen.getByRole("heading", { name: "One decision. Three agents working." })).toBeInTheDocument())
		expect(screen.queryByRole("button", { name: "Answer" })).not.toBeInTheDocument()
		expect(screen.getByText("Publishing the bounded steering brief")).toBeInTheDocument()
	})

	it("keeps exact approval in the finance workstream and moves directly into reconciliation", async () => {
		renderPrototype()

		fireEvent.click(screen.getByRole("button", { name: "Review effects" }))
		await waitFor(() => expect(screen.getByRole("heading", { name: "Finance close operator" })).toBeInTheDocument())
		fireEvent.click(screen.getByRole("button", { name: "Review exact effects" }))

		expect(screen.getByRole("dialog", { name: "July close effects" })).toBeInTheDocument()
		expect(screen.getByText("QuickBooks journal batch")).toBeInTheDocument()
		expect(screen.getByText("SAP inventory adjustments")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Approve exact effects" }))

		expect(screen.getByText("Approval recorded. Effects are reconciling.")).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole("heading", { name: "Post the validated July close effect set" })).not.toBeInTheDocument())
		expect(screen.getAllByText("Reconciling").length).toBeGreaterThan(0)
	})

	it("starts a blank Agent task, researches context, interviews only on boundaries, and activates", async () => {
		renderPrototype()

		fireEvent.click(screen.getByRole("button", { name: "New Agent ⌘K" }))
		await waitFor(() => expect(screen.getByRole("heading", { name: "What should this Agent own?" })).toBeInTheDocument())

		fireEvent.change(screen.getByLabelText("Message Agentix"), { target: { value: "Own the ERP modernization program and keep delivery risk current." } })
		fireEvent.click(screen.getByRole("button", { name: "Send to Agentix" }))
		expect(screen.getByRole("heading", { name: "Shape the operating model together" })).toBeInTheDocument()
		expect(screen.getByText("Research complete")).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: "Finish the operating boundaries" })).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Build operating model" }))
		await waitFor(() => expect(screen.getByRole("heading", { name: "Atlas program lead" })).toBeInTheDocument())
		expect(screen.getByText("Ready to activate")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Activate Agent" }))

		await waitFor(() => expect(screen.getByRole("heading", { name: "Atlas program lead" })).toBeInTheDocument())
		expect(screen.getByText("Atlas program lead activated as Agent v1.")).toBeInTheDocument()
	})

	it("lets the owner steer, interrupt, and resume the same active run", async () => {
		renderPrototype()

		fireEvent.click(screen.getByRole("button", { name: "RO Revenue operations partner Working" }))
		await waitFor(() => expect(screen.getByRole("heading", { name: "Revenue operations partner" })).toBeInTheDocument())
		const composer = screen.getByLabelText("Message Agentix")
		fireEvent.change(composer, { target: { value: "Prioritize renewals with open support cases." } })
		fireEvent.click(screen.getByRole("button", { name: "Send to Agentix" }))

		expect(screen.getByText("Prioritize renewals with open support cases.")).toBeInTheDocument()
		expect(screen.getByText(/I attached that to the active run/)).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Interrupt" }))
		expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Resume" }))
		expect(screen.getByRole("button", { name: "Interrupt" })).toBeInTheDocument()
	})

	it("keeps the command bar keyboard-accessible and exposes committed activity separately", async () => {
		renderPrototype()

		fireEvent.keyDown(window, { key: "k", metaKey: true })
		await waitFor(() => expect(screen.getByLabelText("Message Agentix")).toHaveFocus())
		fireEvent.click(screen.getByRole("button", { name: "Activity" }))
		await waitFor(() => expect(screen.getByRole("heading", { name: "Everything Agentix committed" })).toBeInTheDocument())
		expect(screen.getAllByText("Verified").length).toBeGreaterThan(0)
	})
})
