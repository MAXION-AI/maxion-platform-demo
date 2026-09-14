import { defineConfig, devices } from "@playwright/test"
import process from "node:process"

const acceptancePort = process.env.MAXION_E2E_PORT ?? "4317"
const acceptanceBaseUrl = `http://127.0.0.1:${acceptancePort}`
const rawProgramPhase = process.env.MAXION_PROGRAM_PHASE ?? "0"
if (!/^\d+$/.test(rawProgramPhase)) {
	throw new Error("MAXION_PROGRAM_PHASE must be a non-negative integer")
}
const programPhase = Number.parseInt(rawProgramPhase, 10)

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 45_000,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	webServer: {
		command: "pnpm acceptance:server",
		url: `${acceptanceBaseUrl}/maxion-prototype`,
		reuseExistingServer: false,
		timeout: 120_000,
		gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
	},
	use: {
		baseURL: acceptanceBaseUrl,
		headless: true,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
		},
		...(programPhase >= 10 ? [{
			name: "webkit",
			use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 720 } },
		}] : []),
	],
})
