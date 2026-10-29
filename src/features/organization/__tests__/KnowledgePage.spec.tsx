import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { resetKnowledgeStore } from "../knowledge"
import { KnowledgePage, useKnowledgeReviewCount } from "../KnowledgePage"
import { resetOrganizationStore } from "../store"

function ReviewCount() {
	return <output aria-label="Review count">{useKnowledgeReviewCount()}</output>
}

const library = () => screen.getByRole("region", { name: "Knowledge library" })
const rowNamed = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) })

describe("Knowledge", () => {
	beforeEach(() => {
		resetKnowledgeStore()
		resetOrganizationStore()
	})

	it("filters the library by section", () => {
		render(<KnowledgePage />)
		expect(within(library()).getByRole("button", { name: /^What Northstar does/ })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /^Glossary/ }))
		expect(within(library()).getByRole("button", { name: /^ARR/ })).toBeInTheDocument()
		expect(within(library()).queryByRole("button", { name: /^What Northstar does/ })).not.toBeInTheDocument()
	})

	it("opens an item and shows the work that used it, with a way into that work", () => {
		const onOpenAgentix = vi.fn()
		render(<KnowledgePage onOpenAgentix={onOpenAgentix} />)
		fireEvent.click(rowNamed("Payment approvals over \\$25,000"))
		const sheet = screen.getByRole("complementary", { name: /Payment approvals over \$25,000 need a Finance Director details/ })
		expect(within(sheet).getByText(/enforced by the platform control/)).toBeInTheDocument()
		expect(within(sheet).getByText("Where it was used")).toBeInTheDocument()
		fireEvent.click(within(sheet).getByRole("button", { name: "Open Revenue reconciliation" }))
		expect(onOpenAgentix).toHaveBeenCalledWith({ type: "engagement", id: "invoice" })
	})

	it("approving a suggestion publishes it and lowers the review count", () => {
		render(<><ReviewCount /><KnowledgePage /></>)
		expect(screen.getByLabelText("Review count")).toHaveTextContent("3")
		fireEvent.click(screen.getByRole("button", { name: "Review suggestion: Unbilled backlog" }))
		const sheet = screen.getByRole("complementary", { name: "Unbilled backlog details" })
		fireEvent.click(within(sheet).getByRole("button", { name: "Approve and publish" }))
		expect(screen.getByLabelText("Review count")).toHaveTextContent("2")
		expect(within(library()).getByRole("button", { name: /^Unbilled backlog · Published v1/ })).toBeInTheDocument()
	})

	it("refuses content that looks like a secret without echoing it", () => {
		render(<KnowledgePage />)
		fireEvent.click(screen.getByRole("button", { name: "New item" }))
		const dialog = screen.getByRole("dialog", { name: "New item" })
		fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "Ledger access" } })
		fireEvent.change(within(dialog).getByLabelText("Content"), { target: { value: "Use key sk-live-4f9a8b7c6d5e for the ledger" } })
		fireEvent.click(within(dialog).getByRole("button", { name: "Publish" }))
		const alert = within(dialog).getByRole("alert")
		expect(alert).toHaveTextContent("looks like a secret or credential")
		expect(alert).not.toHaveTextContent("sk-live")
		expect(within(library()).queryByRole("button", { name: /^Ledger access/ })).not.toBeInTheDocument()
	})

	it("refuses essentials over the budget and keeps the draft", () => {
		render(<KnowledgePage />)
		fireEvent.click(screen.getByRole("button", { name: "New item" }))
		const dialog = screen.getByRole("dialog", { name: "New item" })
		fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "Client list" } })
		fireEvent.change(within(dialog).getByLabelText("Content"), { target: { value: "Client and engagement summary. ".repeat(260) } })
		fireEvent.click(within(dialog).getByRole("checkbox", { name: /Include in every run/ }))
		fireEvent.click(within(dialog).getByRole("button", { name: "Publish" }))
		expect(within(dialog).getByRole("alert")).toHaveTextContent("Your draft was saved without essentials")
		fireEvent.click(within(dialog).getByRole("button", { name: "Done" }))
		expect(within(library()).getByRole("button", { name: /^Client list · Draft/ })).toBeInTheDocument()
	})

	it("resolves the reported conflict with a correction", () => {
		render(<><ReviewCount /><KnowledgePage /></>)
		fireEvent.click(screen.getByRole("button", { name: "Review conflict: Two approval thresholds" }))
		const sheet = screen.getByRole("complementary", { name: "Conflict: Two approval thresholds" })
		fireEvent.click(within(sheet).getByRole("button", { name: "Publish a correction to Month-end close" }))
		expect(screen.getByLabelText("Review count")).toHaveTextContent("2")
		expect(within(library()).getByRole("button", { name: /^Month-end close · Published v5/ })).toBeInTheDocument()
	})
})
