import { fileURLToPath, URL } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const githubRepositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "maxion-platform-demo"
const githubPagesBase = process.env.GITHUB_PAGES === "true" ? `/${githubRepositoryName}/` : "/"

export default defineConfig({
  base: githubPagesBase,
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4317,
  },
  preview: {
    host: "127.0.0.1",
    port: 4317,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    testTimeout: 60_000,
  },
})
