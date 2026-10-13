import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 45_000,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	webServer: {
		command: "pnpm dev",
		url: "http://127.0.0.1:4317/maxion-prototype",
		reuseExistingServer: true,
		timeout: 120_000,
	},
	use: {
		baseURL: "http://127.0.0.1:4317",
		headless: true,
		// The voice call speaks; a test run must never talk through the speakers.
		launchOptions: { args: ["--mute-audio"] },
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
		},
	],
})
