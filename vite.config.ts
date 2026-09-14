import { fileURLToPath, URL } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const githubRepositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "maxion-platform-demo"
const githubPagesBase = process.env.GITHUB_PAGES === "true" ? `/${githubRepositoryName}/` : "/"

export default defineConfig({
  base: githubPagesBase,
  plugins: [
    react(),
    {
      name: "maxion-build-revision",
      transformIndexHtml(html) {
        const revision = process.env.MAXION_BUILD_REVISION ?? "development-unpinned"
        return html.replace('id="root"', `id="root" data-build-revision="${revision}"`)
      },
    },
  ],
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
  build: {
    manifest: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    testTimeout: 60_000,
  },
})
