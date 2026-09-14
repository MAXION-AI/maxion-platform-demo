#!/usr/bin/env node

import { execFileSync, spawn, spawnSync } from "node:child_process"
import { createWriteStream, mkdirSync } from "node:fs"
import process from "node:process"

const cwd = process.cwd()
const port = process.env.MAXION_E2E_PORT ?? "4317"
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim()
const sourceTreeDirty = Boolean(
  execFileSync("git", ["status", "--porcelain=v1"], { cwd, encoding: "utf8" }).trim(),
)
const logDirectory = `${cwd}/test-results`
const logPath = `${logDirectory}/acceptance-server.jsonl`
const outputPath = `${logDirectory}/acceptance-server.log`
mkdirSync(logDirectory, { recursive: true })
const log = createWriteStream(logPath, { flags: "w" })
const output = createWriteStream(outputPath, { flags: "w" })
const record = (event, fields = {}) => {
  log.write(
    `${JSON.stringify({ event, at: new Date().toISOString(), pid: process.pid, cwd, revision, sourceTreeDirty, port, ...fields })}\n`,
  )
}

record("build-start")
const build = spawnSync("pnpm", ["build"], {
  cwd,
  env: { ...process.env, MAXION_BUILD_REVISION: revision },
  encoding: "utf8",
})
output.write(build.stdout ?? "")
output.write(build.stderr ?? "")
if (build.status !== 0) {
  record("build-failed", { exitCode: build.status })
  log.end()
  output.end()
  process.exit(build.status ?? 1)
}
record("build-complete")

const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", port, "--strictPort"],
  { cwd, env: { ...process.env, MAXION_BUILD_REVISION: revision }, stdio: ["ignore", "pipe", "pipe"] },
)
const serverStartedAt = Date.now()
record("server-start", { serverPid: server.pid })
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (data) => {
    process.stdout.write(data)
    output.write(data)
  })
}

const stop = (signal) => {
  record("server-stop-requested", { signal, serverPid: server.pid })
  server.kill(signal)
}
process.on("SIGTERM", () => stop("SIGTERM"))
process.on("SIGINT", () => stop("SIGINT"))
server.on("exit", (code, signal) => {
  record("server-exit", { exitCode: code, signal, serverPid: server.pid, lifetimeMs: Date.now() - serverStartedAt })
  output.end()
  log.end(() => process.exit(code ?? (signal ? 1 : 0)))
})
