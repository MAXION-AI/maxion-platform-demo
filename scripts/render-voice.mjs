#!/usr/bin/env node
/*
 * Pre-renders MAX's scripted lines with ElevenLabs text-to-speech, with the time each word starts,
 * into public/voice/ and public/voice/manifest.json. The app plays a rendered clip when one exists
 * for the exact line, and falls back to the browser's voice (then captions) when not.
 *
 * Usage:
 *   pnpm voice:render --dry-run                     list the lines and their size; no key needed
 *   ELEVENLABS_API_KEY=… ELEVENLABS_VOICE_ID=… pnpm voice:render [--only revenue] [--force]
 *
 * Optional: ELEVENLABS_MODEL_ID (default eleven_multilingual_v2: these clips are rendered once, so
 * the higher-quality model wins over the low-latency one the product streams with).
 * The key is read from the environment only; it is never written anywhere.
 */
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "vite"

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const force = args.includes("--force")
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null
const OUT = "public/voice"
const MANIFEST = `${OUT}/manifest.json`

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" })
const { voiceLines } = await server.ssrLoadModule("/src/components/voice/voiceLines.ts")
await server.close()
const lines = voiceLines().filter(line => !only || line.demo === only || line.demo === "all")
const characters = lines.reduce((total, line) => total + line.text.length, 0)

if (dryRun) {
	for (const line of lines) console.log(`${line.demo.padEnd(15)} ${line.kind.padEnd(12)} ${line.text.length.toString().padStart(4)}  ${line.text.slice(0, 96)}${line.text.length > 96 ? "…" : ""}`)
	console.log(`\n${lines.length} lines, ${characters.toLocaleString()} characters (ElevenLabs bills by character).`)
	process.exit(0)
}

const key = process.env.ELEVENLABS_API_KEY
const voiceId = process.env.ELEVENLABS_VOICE_ID
const model = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2"
if (!key || !voiceId) {
	console.error("Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (the voice MAX should use). Run with --dry-run to see the lines without a key.")
	process.exit(1)
}

mkdirSync(OUT, { recursive: true })
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { version: 1, lines: {} }
manifest.version = 1
manifest.model = model
manifest.voices = { ...(manifest.voices ?? {}), max: { voiceId } }

/* The character offset where each word ends, and the second it starts, from the character alignment. */
function marks(text, alignment) {
	const starts = alignment?.character_start_times_seconds ?? []
	const result = []
	const pattern = /\S+/g
	let match
	while ((match = pattern.exec(text))) {
		const start = starts[match.index]
		if (typeof start === "number") result.push([match.index + match[0].length, Math.round(start * 1000) / 1000])
	}
	return result
}

let rendered = 0, skipped = 0
for (const line of lines) {
	const id = `${line.voice}::${line.text}`
	const file = `voice/${createHash("sha1").update(id).digest("hex").slice(0, 12)}.mp3`
	if (!force && manifest.lines[id] && existsSync(`public/${manifest.lines[id].file}`)) { skipped += 1; continue }
	const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
		method: "POST",
		headers: { "xi-api-key": key, "content-type": "application/json" },
		body: JSON.stringify({ text: line.text, model_id: model, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true } }),
	})
	if (!response.ok) { console.error(`Failed (${response.status}) on: ${line.text.slice(0, 80)}…\n${await response.text()}`); process.exit(1) }
	const body = await response.json()
	writeFileSync(`public/${file}`, Buffer.from(body.audio_base64, "base64"))
	const alignment = body.normalized_alignment?.characters?.length === line.text.length ? body.normalized_alignment : body.alignment
	const ends = alignment?.character_end_times_seconds ?? []
	manifest.lines[id] = { file, duration: Math.round((ends.at(-1) ?? 0) * 1000) / 1000, marks: marks(line.text, alignment) }
	rendered += 1
	console.log(`rendered ${file}  ${line.demo} ${line.kind}`)
}
manifest.lines = Object.fromEntries(Object.entries(manifest.lines).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, "\t")}\n`)
console.log(`\n${rendered} rendered, ${skipped} already current. Manifest: ${MANIFEST}`)
