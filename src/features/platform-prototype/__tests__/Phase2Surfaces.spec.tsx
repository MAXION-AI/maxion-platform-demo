import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PlatformDemoProvider, usePlatformDispatch } from "../PlatformDemoProvider"
import { ProjectsModule } from "../ProjectsModule"

function ProjectsStateHarness({ mode }: { mode: "ready" | "loading" | "error" }) {
	const dispatch = usePlatformDispatch()
	useEffect(() => {
		if (mode === "loading") dispatch({ type: "projects/load-started" })
		if (mode === "error") dispatch({ type: "projects/load-failed", message: "The project snapshot timed out." })
	}, [dispatch, mode])
	return <ProjectsModule onNavigate={vi.fn()} />
}

function renderProjects(mode: "ready" | "loading" | "error" = "ready") {
	return render(<PlatformDemoProvider activeModule="projects"><ProjectsStateHarness mode={mode} /></PlatformDemoProvider>)
}

describe("Phase 2 surface states", () => {
	beforeEach(() => localStorage.clear())

	it("renders bounded loading geometry without a blank flash", async () => {
		renderProjects("loading")
		expect(await screen.findByRole("status", { name: "Loading projects" })).toHaveAttribute("aria-label", "Loading projects")
		expect(document.querySelectorAll(".mxp-project-loading > i")).toHaveLength(5)
	})

	it("explains a project load failure and recovers the last safe records", async () => {
		renderProjects("error")
		const error = await screen.findByRole("alert")
		expect(error).toHaveTextContent("The project snapshot timed out")
		screen.getByRole("button", { name: "Retry projects" }).click()
		await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
		expect(screen.getByRole("button", { name: /Open ERP modernization/ })).toBeInTheDocument()
	})

	it("turns an empty persisted portfolio into a create path", () => {
		localStorage.setItem("maxion-demo:maxion-demo:platform-shell:v1", JSON.stringify({
			schemaVersion: 1,
			tenantId: "maxion-demo",
			slice: "platform-shell",
			value: { projects: [], selectedProjectId: null, discoveryReady: false, planSent: false, planSnapshot: "v12", executeVerified: false },
		}))
		renderProjects()
		expect(screen.getByRole("heading", { name: "Create your first project" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument()
	})

	it("separates All from Active and reports the selected filter honestly", () => {
		renderProjects()
		expect(screen.getByRole("button", { name: "Active 3" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByRole("button", { name: "All 4" })).toHaveAttribute("aria-pressed", "false")
		expect(screen.getByRole("heading", { name: "Active projects" })).toBeInTheDocument()
		expect(screen.queryByText("Pricing transformation")).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "All 4" }))
		expect(screen.getByRole("button", { name: "All 4" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.getByRole("button", { name: "Active 3" })).toHaveAttribute("aria-pressed", "false")
		expect(screen.getByRole("heading", { name: "All projects" })).toBeInTheDocument()
		expect(screen.getByText("Pricing transformation")).toBeInTheDocument()
	})

	it("restores create-dialog focus to its explicit opener on every close path", async () => {
		renderProjects()
		const opener = screen.getByRole("button", { name: "New project" })
		const expectRestored = async () => waitFor(() => expect(opener).toHaveFocus())

		fireEvent.click(opener)
		fireEvent.click(screen.getByRole("button", { name: "Close create project dialog" }))
		await expectRestored()

		fireEvent.click(opener)
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
		await expectRestored()

		fireEvent.click(opener)
		fireEvent.keyDown(window, { key: "Escape" })
		await expectRestored()

		fireEvent.click(opener)
		fireEvent.mouseDown(document.querySelector(".mxp-dialog-layer")!)
		await expectRestored()

		fireEvent.click(opener)
		fireEvent.change(screen.getByLabelText(/Project name/), { target: { value: "Focus-safe project" } })
		fireEvent.click(screen.getByRole("button", { name: "Review project" }))
		fireEvent.click(screen.getByRole("button", { name: "Create project" }))
		await expectRestored()
	})
})
