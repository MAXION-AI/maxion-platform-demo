import "@testing-library/jest-dom/vitest"

import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ModuleErrorBoundary } from "../ModuleErrorBoundary"

const preventExpectedRenderError = (event: ErrorEvent) => event.preventDefault()

beforeEach(() => {
	window.addEventListener("error", preventExpectedRenderError)
})

afterEach(() => {
	window.removeEventListener("error", preventExpectedRenderError)
	vi.restoreAllMocks()
})

describe("ModuleErrorBoundary", () => {
	it("contains a module crash and retries without exposing exception text", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined)
		let shouldFail = true
		const CrashingModule = () => {
			if (shouldFail) throw new Error("sensitive internal detail")
			return <p>Recovered workspace</p>
		}

		render(
			<ModuleErrorBoundary moduleName="Plan" resetKey="plan" onReturnToDashboard={vi.fn()}>
				<CrashingModule />
			</ModuleErrorBoundary>,
		)

		expect(screen.getByRole("alert")).toHaveTextContent("Plan couldn't finish loading")
		expect(screen.queryByText("sensitive internal detail")).not.toBeInTheDocument()
		shouldFail = false
		fireEvent.click(screen.getByRole("button", { name: "Try again" }))
		expect(screen.getByText("Recovered workspace")).toBeInTheDocument()
	})

	it("offers a deterministic route back to the dashboard", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined)
		const onReturnToDashboard = vi.fn()
		const CrashingModule = () => { throw new Error("render failed") }

		render(
			<ModuleErrorBoundary moduleName="Execute" resetKey="execute" onReturnToDashboard={onReturnToDashboard}>
				<CrashingModule />
			</ModuleErrorBoundary>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Return to dashboard" }))
		expect(onReturnToDashboard).toHaveBeenCalledOnce()
	})
})
