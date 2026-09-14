import { describe, expect, it } from "vitest"

import { INITIAL_PROJECTS } from "../model"
import {
	answerConsultQuestion,
	appendConsultExchange,
	buildConsultSourceIndex,
	persistConsultState,
	readConsultState,
	startConsultThread,
	type ConsultContext,
	type ConsultSource,
	type ConsultState,
} from "../consultState"

const MAX_CONSULT_SOURCES = 10_000
const MAX_MOUNTED_CONSULT_SOURCES = 200

const project = INITIAL_PROJECTS[0]
const context: ConsultContext = {
	tenantId: "maxion-demo",
	project,
	discoveryPackage: {
		version: 1,
		id: "discovery-package-1",
		projectId: project.id,
		projectName: project.name,
		discoveryId: "discovery-1",
		createdAt: "2026-09-14T12:00:00.000Z",
		provenance: [{ evidenceId: "evidence-1", source: "Salesforce", locator: "renewal-policy", evidenceClass: "connected-source" }],
		unresolvedGapIds: [],
		authority: { level: "project-owner", boundedTo: "planning-input" },
		evidenceClasses: ["connected-source"],
	},
	planArtifact: {
		version: 1,
		id: "plan-ref-1",
		artifactId: "rollout-plan",
		artifactVersion: 4,
		projectId: project.id,
		projectName: project.name,
		discoveryPackageId: "discovery-package-1",
		approvedAt: "2026-09-14T12:05:00.000Z",
		approvedByRole: "owner",
		sourceIds: ["evidence-1"],
		unresolvedGapIds: [],
		authority: { boundedTo: "execute-input" },
		contentDigest: "5b3f96863b3f43ff4f292b09d01aa3fa",
	},
	executeVerified: false,
	agentix: { count: 1, audience: false, approval: true },
	agentixProjectId: project.id,
}

function extraSource(index: number): ConsultSource {
	return {
		id: `extra-${index}`,
		objectId: `evidence-${index}`,
		projectId: project.id,
		module: "discovery",
		title: `Evidence ${index}`,
		detail: `Project evidence ${index}`,
		version: `v${index}`,
		status: "current",
		evidenceClass: "connected-source",
		environment: "development",
		authority: "planning-input",
	}
}

describe("Consult MAX state", () => {
	it("indexes ten thousand project sources in a bounded mounted set", () => {
		const additional = Array.from({ length: MAX_CONSULT_SOURCES + 20 }, (_, index) => extraSource(index))
		additional.push({ ...extraSource(20_000), id: "foreign", projectId: "customer-360" })

		const result = buildConsultSourceIndex(context, additional)

		expect(result.total).toBe(MAX_CONSULT_SOURCES)
		expect(result.mounted).toBe(MAX_MOUNTED_CONSULT_SOURCES)
		expect(result.omitted).toBe(MAX_CONSULT_SOURCES - MAX_MOUNTED_CONSULT_SOURCES)
		expect(result.sources.every(source => source.projectId === project.id)).toBe(true)
		expect(result.sources.some(source => source.id === "foreign")).toBe(false)
	})

	it("grounds the default decision and exposes one safe Plan route", () => {
		const index = buildConsultSourceIndex(context)
		const answer = answerConsultQuestion("Should we automate renewal exceptions now?", context, index.sources)

		expect(answer.status).toBe("grounded")
		expect(answer.citations).toHaveLength(4)
		expect(answer.citations[1]).toMatchObject({ objectId: "rollout-plan", version: "v4", projectId: project.id })
		expect(answer.route).toMatchObject({ module: "plan", projectId: project.id })
	})

	it("keeps historical citations pinned when an upstream version changes", () => {
		const answer = answerConsultQuestion("What is the current rollout status?", context, buildConsultSourceIndex(context).sources)
		const nextContext: ConsultContext = {
			...context,
			planArtifact: { ...context.planArtifact!, id: "plan-ref-2", artifactId: "rollout-plan-v5", artifactVersion: 5, contentDigest: "3f574963eef1f6d38ebd77a2353a140c" },
		}
		const currentPlan = buildConsultSourceIndex(nextContext).sources.find(source => source.module === "plan")!
		const historicalPlan = answer.citations.find(citation => citation.module === "plan")!

		expect(currentPlan).toMatchObject({ objectId: "rollout-plan-v5", version: "v5" })
		expect(historicalPlan).toMatchObject({ objectId: "rollout-plan", version: "v4" })
	})

	it("labels absent upstream objects as missing and never fabricates grounding", () => {
		const missingContext: ConsultContext = { ...context, discoveryPackage: null, planArtifact: null, executeVerified: true, agentixProjectId: "customer-360" }
		const index = buildConsultSourceIndex(missingContext)
		const answer = answerConsultQuestion("Should we automate renewal exceptions now?", missingContext, index.sources)

		expect(index.sources.map(source => source.status)).toEqual(["missing", "missing", "missing", "missing"])
		expect(answer.status).toBe("partial")
		expect(answer.citations).toEqual([])
	})

	it("denies cross-project questions before looking up records", () => {
		const answer = answerConsultQuestion("What changed in project:customer-360?", context, buildConsultSourceIndex(context).sources)

		expect(answer.status).toBe("denied")
		expect(answer.citations).toEqual([])
		expect(answer.route).toBeNull()
	})

	it("refuses to invent an answer for an unrelated question", () => {
		const answer = answerConsultQuestion("Write a poem about the ocean", context, buildConsultSourceIndex(context).sources)

		expect(answer.status).toBe("partial")
		expect(answer.summary).toMatch(/do not support a reliable answer/i)
		expect(answer.citations).toEqual([])
	})

	it("surfaces source conflicts instead of routing through them", () => {
		const sources = buildConsultSourceIndex(context).sources.map(source => source.module === "plan" ? { ...source, status: "conflict" as const } : source)
		const answer = answerConsultQuestion("What is the current rollout status?", context, sources)

		expect(answer.status).toBe("conflict")
		expect(answer.summary).toMatch(/sources disagree/i)
		expect(answer.route).toMatchObject({ module: "plan", projectId: project.id })
	})

	it("keeps an oversized question intact in the UI contract while refusing it", () => {
		const answer = answerConsultQuestion("x".repeat(2_001), context, buildConsultSourceIndex(context).sources)

		expect(answer.status).toBe("error")
		expect(answer.summary).toMatch(/limited to 2,000 characters/i)
		expect(answer.route).toBeNull()
	})

	it("applies conversation commands idempotently and bounds thread creation", () => {
		const sources = buildConsultSourceIndex(context).sources
		const answer = answerConsultQuestion("What needs approval?", context, sources)
		const initial: ConsultState = {
			version: 1,
			projectId: project.id,
			activeThreadId: "thread-1",
			processedCommands: [],
			threads: [{ id: "thread-1", title: "New conversation", updatedAt: 0, messages: [] }],
		}
		const once = appendConsultExchange(initial, "What needs approval?", answer, "command-1")
		const duplicate = appendConsultExchange(once, "What needs approval?", answer, "command-1")

		expect(duplicate).toBe(once)
		expect(once.threads[0].messages).toHaveLength(initial.threads[0].messages.length + 2)
		const withManyThreads = Array.from({ length: 30 }, (_, index) => index).reduce(
			(state, index) => startConsultThread(state, `thread-command-${index}`),
			once,
		)
		expect(withManyThreads.threads).toHaveLength(20)
	})

	it("rejects malformed persisted answers instead of rendering untrusted state", () => {
		localStorage.clear()
		const sources = buildConsultSourceIndex(context).sources
		const state = readConsultState(context, sources)
		expect(persistConsultState(state)).toBe(true)
		const storageKey = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).find(key => key?.includes(":consult-"))
		expect(storageKey).toBeTruthy()
		const envelope = JSON.parse(localStorage.getItem(storageKey!)!)
		envelope.value.threads[0].messages[1].answer.reasons = "not-an-array"
		localStorage.setItem(storageKey!, JSON.stringify(envelope))

		const recovered = readConsultState(context, sources)

		expect(recovered.threads[0].messages).toHaveLength(2)
		expect(localStorage.getItem(storageKey!)).toBeNull()
	})

	it("rejects a conversation copied into another project slice", () => {
		localStorage.clear()
		const sources = buildConsultSourceIndex(context).sources
		const state = readConsultState(context, sources)
		expect(persistConsultState(state)).toBe(true)
		const storageKey = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).find(key => key?.includes(":consult-"))!
		const envelope = JSON.parse(localStorage.getItem(storageKey)!)
		envelope.value.projectId = "customer-360"
		localStorage.setItem(storageKey, JSON.stringify(envelope))

		const recovered = readConsultState(context, sources)

		expect(recovered.projectId).toBe(project.id)
		expect(localStorage.getItem(storageKey)).toBeNull()
	})
})
