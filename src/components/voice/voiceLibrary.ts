import { publicAsset } from "@/lib/publicAsset"
import { createEnvelope, meterElement, type LevelRef } from "./audioLevel"

/*
 * How MAX (and anyone else on a call) speaks. One function, three sources, best first:
 *
 * 1. recorded  a clip rendered ahead of time with ElevenLabs text-to-speech, listed in
 *              public/voice/manifest.json with the time each word starts
 *              (`pnpm voice:render`, see scripts/render-voice.mjs);
 * 2. browser   the browser's own speech synthesis, for lines nobody rendered (anything
 *              composed from live state, or a demo whose clips haven't been rendered yet);
 * 3. captions  no audio at all: the words are revealed at speaking pace, so captions,
 *              the orb and turn-taking behave the same on a machine with no voices.
 *
 * Every source reports progress as "characters spoken so far", which the caption uses to
 * mark the words already said, and pulses or measures a LevelRef for the orb. Under
 * reduced motion the captions source completes at once (the words are shown whole).
 */

export type SpeechSource = "recorded" | "browser" | "captions"
export type SpeakOptions = {
	/* Which voice says it: "max" for MAX, or a stakeholder's id on their call. */
	voice?: string
	level?: LevelRef
	reduced?: boolean
	onStart?: (source: SpeechSource) => void
	/* Characters of `text` spoken so far. */
	onProgress?: (spoken: number) => void
	/* Skip the recorded clip and the browser voice: captions only (a muted call). */
	silent?: boolean
}
export type Speech = { stop: () => void; finished: Promise<"ended" | "stopped">; source: () => SpeechSource | null }

/* [character offset where a word ends, second it starts], in spoken order. */
type Mark = [number, number]
type ManifestLine = { file: string; duration: number; marks: Mark[] }
export type VoiceManifest = { version: 1; model?: string; voices?: Record<string, { voiceId: string; name?: string }>; lines: Record<string, ManifestLine> }

/* Lines are matched by voice and text, whitespace-insensitive, so a reflowed string still finds its clip. */
export const normalizeLine = (text: string) => text.replace(/\s+/g, " ").trim()
export const lineKey = (voice: string, text: string) => `${voice}::${normalizeLine(text)}`

let manifest: VoiceManifest | null | undefined
let loading: Promise<VoiceManifest | null> | null = null

export function loadVoiceManifest(): Promise<VoiceManifest | null> {
	if (manifest !== undefined) return Promise.resolve(manifest)
	if (loading) return loading
	if (typeof fetch !== "function" || typeof window === "undefined") { manifest = null; return Promise.resolve(null) }
	loading = fetch(publicAsset("voice/manifest.json"), { cache: "no-cache" })
		.then(response => response.ok ? response.json() as Promise<VoiceManifest> : null)
		.then(data => (manifest = data && data.version === 1 && data.lines ? data : null))
		.catch(() => (manifest = null))
	return loading
}

/* For tests and the render script's preview: replace what the page believes is rendered. */
export function setVoiceManifest(next: VoiceManifest | null) { manifest = next; loading = null }

export function recordedLine(voice: string, text: string): ManifestLine | null {
	return manifest?.lines[lineKey(voice, text)] ?? null
}

/* The browser voice that sounds least like a computer, preferring the higher-quality variants. */
const QUALITY = /(premium|enhanced|natural|neural|siri)/i
const NAMED = /(ava|zoe|allison|samantha|serena|daniel|google us english|google uk english female)/i
function pickVoice(): SpeechSynthesisVoice | undefined {
	if (typeof window === "undefined" || !window.speechSynthesis) return undefined
	const voices = window.speechSynthesis.getVoices().filter(voice => /^en(-|_|$)/i.test(voice.lang))
	return voices.find(voice => QUALITY.test(voice.name) && /en-(US|GB)/i.test(voice.lang))
		?? voices.find(voice => NAMED.test(voice.name))
		?? voices.find(voice => voice.default)
		?? voices[0]
}

/* Words with the offset where each ends, and a speaking pace that rests at sentence ends. */
function wordEnds(text: string) {
	const ends: { end: number; pause: number }[] = []
	const pattern = /\S+/g
	let match: RegExpExecArray | null
	while ((match = pattern.exec(text))) {
		const word = match[0]
		ends.push({ end: match.index + word.length, pause: /[.?!]["”’)]?$/.test(word) ? 300 : /[,;:—]["”’)]?$/.test(word) ? 140 : 0 })
	}
	return ends
}
/* About 165 words a minute, the pace of a calm interviewer. */
export const WORD_MS = 330

/*
 * A browser driven by automation (tests, screenshot scripts) never speaks aloud: on a Mac the
 * browser voice is the operating system's synthesizer, so a headless test run would talk through
 * the speakers. It gets captions, which keep the same timing, turns and orb.
 */
const automated = () => typeof navigator !== "undefined" && navigator.webdriver === true

export function speak(text: string, options: SpeakOptions = {}): Speech {
	const voice = options.voice ?? "max"
	if (automated()) options = { ...options, silent: true }
	const spoken = normalizeLine(text)
	let current: SpeechSource | null = null
	let stopped = false
	let settle: (outcome: "ended" | "stopped") => void = () => undefined
	const finished = new Promise<"ended" | "stopped">(resolve => { settle = resolve })
	const cleanups: (() => void)[] = []
	const cleanup = () => { while (cleanups.length) { try { cleanups.pop()!() } catch { /* already released */ } } }
	const end = (outcome: "ended" | "stopped") => {
		if (outcome === "ended" && !stopped) options.onProgress?.(spoken.length)
		cleanup()
		settle(outcome)
	}
	const begin = (source: SpeechSource) => { current = source; options.onStart?.(source) }

	const captions = () => {
		if (stopped) return
		begin("captions")
		// Shown whole, so reported whole at once; the line still ends after the caller has its handle.
		if (options.reduced || !spoken) { options.onProgress?.(spoken.length); window.setTimeout(() => end("ended"), 0); return }
		const envelope = options.level ? createEnvelope(options.level) : null
		if (envelope) cleanups.push(envelope.stop)
		const ends = wordEnds(spoken)
		let index = 0
		let timer = 0
		const next = () => {
			if (stopped) return
			if (index >= ends.length) { end("ended"); return }
			const word = ends[index]
			options.onProgress?.(word.end)
			envelope?.pulse(0.45 + ((index * 37) % 10) / 25)
			index += 1
			timer = window.setTimeout(next, WORD_MS + word.pause)
		}
		timer = window.setTimeout(next, 120)
		cleanups.push(() => window.clearTimeout(timer))
	}

	const browser = () => {
		if (stopped) return
		const synthesis = typeof window !== "undefined" ? window.speechSynthesis : undefined
		if (options.silent || !synthesis || typeof window.SpeechSynthesisUtterance !== "function" || !spoken) { captions(); return }
		let started = false
		let fellBack = false
		const fallBack = () => { if (fellBack || stopped) return; fellBack = true; synthesis.cancel(); cleanup(); captions() }
		try {
			const utterance = new SpeechSynthesisUtterance(spoken)
			const chosen = pickVoice()
			if (chosen) utterance.voice = chosen
			utterance.rate = 1
			utterance.pitch = 1
			const envelope = options.level ? createEnvelope(options.level) : null
			if (envelope) cleanups.push(envelope.stop)
			utterance.onstart = () => {
				if (stopped || fellBack) return
				started = true
				begin("browser")
				// Some voices never fire onend; a line can't outlast a generous reading of it.
				const limit = window.setTimeout(() => end("ended"), 4_000 + spoken.split(" ").length * 600)
				cleanups.push(() => window.clearTimeout(limit))
			}
			utterance.onboundary = event => {
				if (stopped || fellBack) return
				options.onProgress?.(event.charIndex + (event.charLength || 0))
				envelope?.pulse(0.7)
			}
			utterance.onend = () => { if (!fellBack) end(stopped ? "stopped" : "ended") }
			utterance.onerror = () => { if (!started) fallBack(); else if (!fellBack) end(stopped ? "stopped" : "ended") }
			cleanups.push(() => { if (!fellBack) synthesis.cancel() })
			synthesis.cancel()
			synthesis.speak(utterance)
			// A voice that hasn't started by now never will (no voices installed, a headless browser).
			const watchdog = window.setTimeout(() => { if (!started) fallBack() }, 1_600)
			cleanups.push(() => window.clearTimeout(watchdog))
		} catch {
			fallBack()
		}
	}

	const recorded = (line: ManifestLine) => {
		if (stopped) return
		let audio: HTMLAudioElement
		try { audio = new Audio(publicAsset(line.file)) } catch { browser(); return }
		audio.preload = "auto"
		let fellBack = false
		const fallBack = () => { if (fellBack || stopped) return; fellBack = true; audio.pause(); cleanup(); browser() }
		if (options.level) cleanups.push(meterElement(audio, options.level))
		let poll = 0
		const track = () => {
			const at = audio.currentTime
			let chars = 0
			for (const [charEnd, start] of line.marks) { if (start <= at) chars = charEnd; else break }
			options.onProgress?.(chars)
		}
		audio.addEventListener("playing", () => { if (current !== "recorded") begin("recorded"); window.clearInterval(poll); poll = window.setInterval(track, 50) })
		audio.addEventListener("ended", () => { if (!fellBack) end("ended") })
		audio.addEventListener("error", fallBack)
		cleanups.push(() => { window.clearInterval(poll); audio.pause(); audio.src = "" })
		audio.play().catch(fallBack)
	}

	const run = async () => {
		if (options.silent) { captions(); return }
		if (manifest === undefined) await Promise.race([loadVoiceManifest(), new Promise(resolve => window.setTimeout(resolve, 600))])
		if (stopped) return
		const line = recordedLine(voice, spoken)
		if (line) recorded(line)
		else browser()
	}
	if (typeof window === "undefined") { settle("ended") } else { void run() }

	return {
		stop: () => { if (stopped) return; stopped = true; end("stopped") },
		finished,
		source: () => current,
	}
}
