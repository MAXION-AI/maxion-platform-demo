import { render, screen, waitFor } from "@testing-library/react"
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
})
