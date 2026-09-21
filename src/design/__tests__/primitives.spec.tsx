import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { Banner, Dialog, EmptyState, ListRow, Mark, SearchInput, Table, TableRow } from "../primitives"

function ReasonDialog({ onClose }: { onClose?: () => void }) {
	const [open, setOpen] = useState(false)
	const [reason, setReason] = useState("")
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>Approve charter</button>
			<Dialog
				open={open}
				title="Approve the project charter"
				description="Recorded in the handoff packet."
				onClose={() => { onClose?.(); setOpen(false) }}
				footer={<><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" disabled={reason.length < 20}>Approve</button></>}>
				<label htmlFor="reason">Approval reason</label>
				<textarea id="reason" data-autofocus value={reason} onChange={event => setReason(event.target.value)} />
			</Dialog>
		</>
	)
}

describe("Dialog", () => {
	it("focuses the [data-autofocus] field ahead of the close button", () => {
		render(<ReasonDialog />)
		fireEvent.click(screen.getByRole("button", { name: "Approve charter" }))
		expect(screen.getByRole("dialog", { name: "Approve the project charter" })).toHaveAccessibleDescription("Recorded in the handoff packet.")
		expect(screen.getByRole("textbox", { name: "Approval reason" })).toHaveFocus()
	})

	it("keeps focus and every keystroke while the parent re-renders with a new onClose", () => {
		render(<ReasonDialog />)
		fireEvent.click(screen.getByRole("button", { name: "Approve charter" }))
		const field = screen.getByRole("textbox", { name: "Approval reason" })
		let value = ""
		for (const letter of "committee") {
			value += letter
			fireEvent.change(field, { target: { value } })
			expect(field).toHaveFocus()
		}
		expect(field).toHaveValue("committee")
		expect(screen.getByRole("dialog")).toBeInTheDocument()
	})

	it("keeps Tab inside the panel, including when focus starts outside it", () => {
		render(<ReasonDialog />)
		const trigger = screen.getByRole("button", { name: "Approve charter" })
		fireEvent.click(trigger)
		const close = screen.getByRole("button", { name: "Close" })
		const cancel = screen.getByRole("button", { name: "Cancel" })
		cancel.focus()
		fireEvent.keyDown(cancel, { key: "Tab" })
		expect(close).toHaveFocus()
		fireEvent.keyDown(close, { key: "Tab", shiftKey: true })
		expect(cancel).toHaveFocus()
		trigger.focus()
		fireEvent.keyDown(trigger, { key: "Tab" })
		expect(close).toHaveFocus()
	})

	it("closes on Escape and hands focus back to its trigger only once it closes", () => {
		const onClose = vi.fn()
		render(<ReasonDialog onClose={onClose} />)
		const trigger = screen.getByRole("button", { name: "Approve charter" })
		trigger.focus()
		fireEvent.click(trigger)
		expect(trigger).not.toHaveFocus()
		fireEvent.keyDown(document.activeElement!, { key: "Escape" })
		expect(onClose).toHaveBeenCalledOnce()
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		expect(trigger).toHaveFocus()
	})
})

describe("slots", () => {
	it("ListRow carries a mark ahead of its title", () => {
		const { container } = render(<ListRow title="Review invoice variance" meta="INV-20841" mark={<Mark seed="northwind" size="sm" />} />)
		const row = container.querySelector(".ds-list-row")!
		expect(row.firstElementChild).toHaveClass("ds-list-row-mark")
		expect(row.querySelector(".ds-mark")).toBeInTheDocument()
	})

	it("EmptyState offers an action and passes attributes through", () => {
		const onClear = vi.fn()
		render(<EmptyState role="status" title="No engagements match this view." action={<button type="button" onClick={onClear}>Clear search</button>}>Try a different search.</EmptyState>)
		expect(screen.getByRole("status")).toHaveTextContent("No engagements match this view.Try a different search.")
		fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
		expect(onClear).toHaveBeenCalledOnce()
	})

	it("Banner can be dismissed", () => {
		const onDismiss = vi.fn()
		render(<Banner role="status" onDismiss={onDismiss} dismissLabel="Dismiss notice">Saved</Banner>)
		fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }))
		expect(onDismiss).toHaveBeenCalledOnce()
	})

	it("SearchInput shows a clear button only while there is a query", () => {
		const onClear = vi.fn()
		const { rerender } = render(<SearchInput label="Search engagements" value="" onChange={() => {}} onClear={onClear} />)
		expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument()
		rerender(<SearchInput label="Search engagements" value="zzz" onChange={() => {}} onClear={onClear} />)
		fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
		expect(onClear).toHaveBeenCalledOnce()
		expect(screen.getByRole("searchbox", { name: "Search engagements" })).toHaveFocus()
	})

	it("Table derives one phone row shape from its columns", () => {
		const { container } = render(<Table columns={["Name", "Status", "Stage", "Updated", ""]} template="1fr 1fr 1fr 1fr auto"><TableRow>Row</TableRow></Table>)
		const table = container.querySelector<HTMLElement>(".ds-table")!
		expect(table.style.getPropertyValue("--ds-table-phone-cols")).toBe("auto auto minmax(0, 1fr) auto")
		expect(table.style.getPropertyValue("--ds-table-phone-last")).toBe("3")
		const { container: plain } = render(<Table columns={["Name", "Updated"]} template="1fr auto" />)
		expect(plain.querySelector<HTMLElement>(".ds-table")!.style.getPropertyValue("--ds-table-phone-cols")).toBe("minmax(0, 1fr)")
	})
})
