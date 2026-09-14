import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import process from "node:process"

import { expect, test } from "@playwright/test"

test("serves the recorded checkout revision from the isolated acceptance server", async ({ page }, testInfo) => {
	const revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
	const sourceTreeDirty = Boolean(execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }).trim())
	const expectedPort = new URL(String(testInfo.project.use.baseURL)).port
	await page.goto("/maxion-prototype")
	await expect(page.locator("#root")).toHaveAttribute("data-build-revision", revision)
	await expect.poll(() => {
		const records = readFileSync("test-results/acceptance-server.jsonl", "utf8")
			.split("\n")
			.filter(Boolean)
			.map(line => JSON.parse(line) as Record<string, unknown>)
		const started = records.reverse().find(record => record.event === "server-start")
		return started && {
			cwd: started.cwd,
			port: started.port,
			revision: started.revision,
			sourceTreeDirty: started.sourceTreeDirty,
			pidRecorded: Number(started.pid) > 0,
			serverPidRecorded: Number(started.serverPid) > 0,
		}
	}).toEqual({
		cwd: process.cwd(),
		port: expectedPort,
		revision,
		sourceTreeDirty,
		pidRecorded: true,
		serverPidRecorded: true,
	})
})
