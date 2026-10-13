import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WorkspaceComposer } from "./WorkspaceComposer"

describe("WorkspaceComposer", () => {
	it("does not submit empty input, including whitespace", () => {
		const onSubmit = vi.fn()
		render(<WorkspaceComposer value="   " onChange={() => {}} onSubmit={onSubmit} label="Message" placeholder="Guide the work" />)
		expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled()
		fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" })
		expect(onSubmit).not.toHaveBeenCalled()
	})
	it("submits with Enter but not Shift+Enter or IME composition", () => {
		const onSubmit = vi.fn()
		render(<WorkspaceComposer value="Review the evidence" onChange={() => {}} onSubmit={onSubmit} label="Message" placeholder="Guide the work" />)
		const input = screen.getByRole("textbox")
		fireEvent.keyDown(input, { key: "Enter", shiftKey: true })
		fireEvent.keyDown(input, { key: "Enter", isComposing: true })
		expect(onSubmit).not.toHaveBeenCalled()
		fireEvent.keyDown(input, { key: "Enter" })
		expect(onSubmit).toHaveBeenCalledTimes(1)
	})
	it("context actions do not send or clear the draft", () => {
		const onSubmit = vi.fn(), onContext = vi.fn(), onChange = vi.fn()
		render(<WorkspaceComposer value={"A draft\nwith context"} onChange={onChange} onSubmit={onSubmit} label="Message" placeholder="Guide the work" tools={<button type="button" onClick={onContext}>Sources</button>} />)
		fireEvent.click(screen.getByRole("button", { name: "Sources" }))
		expect(onContext).toHaveBeenCalledOnce()
		expect(onSubmit).not.toHaveBeenCalled()
		expect(onChange).not.toHaveBeenCalled()
		expect(screen.getByRole("textbox")).toHaveValue("A draft\nwith context")
	})
})
