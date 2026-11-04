import { describe, expect, it } from "vitest"
import { DELIVERABLES, SCENARIOS, deliverableBodies } from "../model"
import {
	DEFAULT_OUTPUTS,
	MAX_UPLOAD_BYTES,
	addRevision,
	adjustBrief,
	advanceUpload,
	approveAllBriefs,
	approveBrief,
	approvePackage,
	bodyAtRevision,
	compareRevisions,
	connectionFault,
	contentHash,
	currentRevision,
	draftBriefs,
	excludedFrom,
	gatherResearch,
	newEvidenceFile,
	newPackageReview,
	nextPackageVersion,
	packageApproved,
	pendingBriefs,
	returnPackage,
	sectionRefs,
	seededWork,
	settleInterrupted,
	uploadRefusal,
	withdrawPackage,
} from "../workState"

const AT = "2026-10-30T10:00:00.000Z"
const documents = [{ name: "RAID register", revision: 1, hash: "abc12345" }]

describe("package approval binds one exact version", () => {
	it("records who approved what, and only that version continues", () => {
		const result = approvePackage(newPackageReview(), 1, documents, AT)
		expect(result.ok).toBe(true)
		expect(result.review).toMatchObject({ status: "approved", approvedVersion: 1, approvedBy: "Root Admin", approvedAt: AT, bound: documents })
		expect(packageApproved(result.review)).toBe(true)
	})

	it("refuses a stale approval in plain words, on the record, without approving anything", () => {
		const moved = nextPackageVersion(newPackageReview(), "RAID register v2", AT)
		const result = approvePackage(moved, 1, documents, AT)
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(result.message).toMatch(/Package v1 can no longer be approved.*now v2.*Nothing was approved/)
		expect(result.currentVersion).toBe(2)
		expect(result.review.status).toBe("pending")
		expect(result.review.history[0]).toMatchObject({ action: "refused", version: 1 })
		expect(packageApproved(result.review)).toBe(false)
	})

	it("a change invalidates an approval and keeps what it bound as history", () => {
		const approved = approvePackage(newPackageReview(), 1, documents, AT).review
		const changed = nextPackageVersion(approved, "RAID register v2", AT)
		expect(changed).toMatchObject({ status: "pending", version: 2, approvedVersion: 1, bound: documents })
		expect(packageApproved(changed)).toBe(false)
		expect(nextPackageVersion(approved, "selection", AT, "Root Admin", true).manifestVersion).toBe(5)
	})

	it("a returned version can't be approved, and a return of an old version is refused", () => {
		const returned = returnPackage(newPackageReview(), 1, "Wrong owner on the RAID", AT)
		expect(returned.ok && returned.review.status).toBe("returned")
		expect(approvePackage(returned.review, 1, documents, AT).ok).toBe(false)
		expect(returnPackage(nextPackageVersion(newPackageReview(), "x", AT), 1, "too late", AT).ok).toBe(false)
	})

	it("withdrawing stops the version continuing without erasing the record", () => {
		const approved = approvePackage(newPackageReview(), 1, documents, AT).review
		const withdrawn = withdrawPackage(approved, "Scope moved", AT)
		expect(withdrawn.status).toBe("withdrawn")
		expect(packageApproved(withdrawn)).toBe(false)
		expect(withdrawn.bound).toEqual(documents)
		expect(withdrawn.history.map(event => event.action)).toEqual(["withdrawn", "approved"])
		expect(withdrawPackage(newPackageReview(), "", AT).status).toBe("pending")
	})
})

describe("document revisions", () => {
	const body = deliverableBodies("revenue", "pending")[7]
	const section = body.sections[0].heading
	const entry = { kind: "edit" as const, by: "Root Admin", at: AT, note: "Fixed an owner", section, paragraphs: ["Edited text."] }

	it("adds a version, keeps the earlier one readable and changes the hash", () => {
		const first = addRevision({}, "RAID register", 1, entry)
		expect(first.ok).toBe(true)
		if (!first.ok) return
		expect(first.revision).toBe(2)
		expect(currentRevision(first.log, "RAID register")).toBe(2)
		const now = bodyAtRevision(body, first.log["RAID register"])
		expect(now.sections[0].paragraphs).toEqual(["Edited text."])
		expect(bodyAtRevision(body, first.log["RAID register"], 1)).toEqual(body)
		expect(contentHash("revenue", "pending", "RAID register", now)).not.toBe(contentHash("revenue", "pending", "RAID register", body))
		expect(compareRevisions(body, first.log["RAID register"], 1, 2)).toEqual([{ heading: section, before: body.sections[0].paragraphs, after: ["Edited text."] }])
	})

	it("reports a conflict when the version moved underneath, and saves nothing", () => {
		const first = addRevision({}, "RAID register", 1, entry)
		if (!first.ok) throw new Error("expected a revision")
		const late = addRevision(first.log, "RAID register", 1, { ...entry, paragraphs: ["Attempted text."] })
		expect(late.ok).toBe(false)
		if (late.ok) return
		expect(late.current).toBe(2)
		expect(late.latest?.note).toBe("Fixed an owner")
		expect(late.log).toBe(first.log)
	})
})

describe("interview briefs", () => {
	const scenario = SCENARIOS.revenue
	const briefs = draftBriefs(scenario, scenario.people, [{ topic: "Release authority", value: "Nobody owns it" }], { between: ["grace", "tom"], summary: "Posting date against invoice date." })

	it("drafts what to learn, questions, probes, a budget and a grant for each person", () => {
		expect(briefs).toHaveLength(scenario.people.length)
		for (const brief of briefs) {
			expect(brief.status).toBe("draft")
			expect(brief.learn).toContain(brief.personName)
			expect(brief.questions.length).toBeGreaterThan(0)
			expect(brief.minutes).toBeGreaterThanOrEqual(6)
			expect(brief.grant.length).toBeGreaterThan(0)
			// A grant never defaults to every source.
			expect(brief.grant.length).toBeLessThan(scenario.sources.length)
			expect(brief.probes.join(" ")).toContain("Release authority")
		}
		expect(briefs.find(brief => brief.personId === "grace")?.probes[0]).toMatch(/^Contradiction: Posting date/)
		expect(briefs.find(brief => brief.personId === "olivia")?.probes.join(" ")).not.toMatch(/Posting date against/)
	})

	it("adjusting makes a new version to approve, and evidence can only narrow", () => {
		const approved = approveAllBriefs(briefs, AT)
		expect(pendingBriefs(approved)).toHaveLength(0)
		const target = approved[0]
		const adjusted = adjustBrief(approved, target.personId, { learn: "Something narrower", evidence: [...target.grant, "A source outside the grant"] })[0]
		expect(adjusted).toMatchObject({ version: 2, status: "draft", learn: "Something narrower", approvedBy: undefined })
		expect(adjusted.evidence).toEqual(target.grant)
		expect(approveBrief([adjusted], target.personId, AT)[0]).toMatchObject({ status: "approved", approvedBy: "Root Admin", version: 2 })
	})
})

describe("uploads", () => {
	it("refuses unsupported, oversized and empty files with a reason", () => {
		expect(uploadRefusal("macro.exe", 10)).toMatch(/\.exe files aren’t supported/)
		expect(uploadRefusal("README", 10)).toMatch(/without a type/)
		expect(uploadRefusal("big.pdf", MAX_UPLOAD_BYTES + 1)).toMatch(/over the 25\.0 MB limit/)
		expect(uploadRefusal("empty.csv", 0)).toMatch(/empty/)
		expect(uploadRefusal("policy.DOCX", 1024)).toBeNull()
	})

	it("moves through its states, and the same name is the next version", () => {
		const first = newEvidenceFile([], "policy.pdf", 600_000, AT, "a")
		expect(first.state).toBe("uploading")
		const ready = advanceUpload(advanceUpload(first))
		expect(ready.state).toBe("ready")
		expect(ready.sections).toEqual(["p. 1", "p. 2", "p. 3"])
		expect(newEvidenceFile([ready], "policy.pdf", 600_000, AT, "b").version).toBe(2)
		expect(newEvidenceFile([first], "policy.pdf", 600_000, AT, "c").version).toBe(1)
		expect(sectionRefs("data.xlsx", 10)).toEqual(["Sheet 1", "Sheet 2"])
		expect(settleInterrupted(first)).toMatchObject({ state: "refused" })
	})
})

describe("web research follows the organization's setting, for every scenario", () => {
	it.each(Object.keys(SCENARIOS) as Array<keyof typeof SCENARIOS>)("%s", (key) => {
		const on = gatherResearch(key, { mode: "on", domains: [] }, AT)
		expect(on.sources.length).toBeGreaterThan(0)
		for (const source of on.sources) {
			expect(source.retrievedAt).toBe(AT)
			expect(new URL(source.url).protocol).toBe("https:")
		}
		expect(gatherResearch(key, { mode: "off", domains: [] }, AT).sources).toEqual([])
		expect(gatherResearch(key, { mode: "allowlist", domains: ["nothing-listed.invalid"] }, AT).sources).toEqual([])
		const listed = (host: string) => host === "example.com" || host.endsWith(".example.com")
		expect(gatherResearch(key, { mode: "allowlist", domains: ["example.com"] }, AT).sources.every(source => listed(new URL(source.url).hostname))).toBe(true)
		// A lookalike that only ends in the listed name is not that domain.
		expect(gatherResearch(key, { mode: "allowlist", domains: ["ample.com"] }, AT).sources).toEqual([])
	})
})

describe("selection and seeded records", () => {
	it("selects the first release's five by default, and they all exist", () => {
		expect(DEFAULT_OUTPUTS).toHaveLength(5)
		const names = DELIVERABLES.map(item => item.name as string)
		for (const name of DEFAULT_OUTPUTS) expect(names).toContain(name)
		expect(excludedFrom(DEFAULT_OUTPUTS)).toHaveLength(6)
	})

	it("reads a finished older record as approved with its approver and time", () => {
		const scenario = SCENARIOS.diligence
		const work = seededWork({ id: "seed-x", scenarioKey: "diligence", phase: 7, interviewClosed: true, people: scenario.people, createdAt: AT, updatedAt: AT }, () => documents)
		expect(packageApproved(work.package)).toBe(true)
		expect(work.package).toMatchObject({ approvedBy: scenario.people[0].name, approvedAt: AT, bound: documents })
		expect(pendingBriefs(work.briefs)).toHaveLength(0)
	})

	it("a run still before its interviews has drafts waiting", () => {
		const scenario = SCENARIOS.tprm
		const work = seededWork({ id: "x", scenarioKey: "tprm", phase: 2, interviewClosed: true, people: scenario.people, createdAt: AT, updatedAt: AT }, () => documents)
		expect(pendingBriefs(work.briefs)).toHaveLength(scenario.people.length)
		expect(packageApproved(work.package)).toBe(false)
	})

	it("a revoked connection names its source and the selected documents it affects", () => {
		const fault = connectionFault(SCENARIOS.revenue, ["RAID register", "Technical assessment"])
		expect(fault).toMatchObject({ kind: "connection", source: SCENARIOS.revenue.sources[0].name, system: SCENARIOS.revenue.sources[0].system })
		expect(fault.kind === "connection" && fault.affected).toEqual(["Technical assessment", "RAID register"])
	})
})
