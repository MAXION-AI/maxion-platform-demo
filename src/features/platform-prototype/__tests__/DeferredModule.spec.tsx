import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DeferredModule } from "../system/DeferredModule"

function LoadedModule({ label }: { label: string }) {
	return <h1>{label}</h1>
}

describe("DeferredModule", () => {
	it("shows a stable skeleton until the requested module resolves", async () => {
		let resolve: ((module: { default: typeof LoadedModule }) => void) | undefined
		const load = () => new Promise<{ default: typeof LoadedModule }>((done) => { resolve = done })
		render(<DeferredModule load={load} moduleName="Agentix" moduleProps={{ label: "Deployed agents" }} onReturnToDashboard={() => undefined} />)
		expect(screen.getByRole("status", { name: "Loading Agentix" })).toBeInTheDocument()
		resolve?.({ default: LoadedModule })
		expect(await screen.findByRole("heading", { name: "Deployed agents" })).toBeInTheDocument()
	})

	it("contains a failed chunk and retries without taking down the shell", async () => {
		const load = vi.fn()
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValueOnce({ default: LoadedModule })
		const onReturnToDashboard = vi.fn()
		render(<DeferredModule load={load} moduleName="Discover" moduleProps={{ label: "Continue where MAX left off." }} onReturnToDashboard={onReturnToDashboard} />)
		expect(await screen.findByRole("alert")).toHaveTextContent("Discover couldn't finish loading")
		fireEvent.click(screen.getByRole("button", { name: "Try again" }))
		expect(await screen.findByRole("heading", { name: "Continue where MAX left off." })).toBeInTheDocument()
		expect(load).toHaveBeenCalledTimes(2)
	})
})
