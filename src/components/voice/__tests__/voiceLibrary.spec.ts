import { afterEach, describe, expect, it, vi } from "vitest"
import { lineKey, normalizeLine, recordedLine, setVoiceManifest, speak } from "../voiceLibrary"

/*
 * MAX's voice degrades in order: a pre-rendered clip, the browser's voice, then captions alone.
 * jsdom has neither audio playback nor speech synthesis, so these tests drive the captions source
 * and the manifest lookup, which are the parts every machine relies on.
 */
afterEach(() => { setVoiceManifest(null); vi.useRealTimers() })

describe("the voice manifest", () => {
	it("matches a line by voice and text, whatever its whitespace", () => {
		expect(normalizeLine("  Hi,\n I’m   MAX. ")).toBe("Hi, I’m MAX.")
		setVoiceManifest({ version: 1, lines: { [lineKey("max", "Hi, I’m MAX.")]: { file: "voice/abc.mp3", duration: 1.2, marks: [[3, 0], [7, 0.3], [12, 0.6]] } } })
		expect(recordedLine("max", "Hi,  I’m MAX.")?.file).toBe("voice/abc.mp3")
		expect(recordedLine("grace", "Hi, I’m MAX.")).toBeNull()
	})
})

describe("speaking without a voice", () => {
	it("reveals the words at speaking pace and reports every one, then ends", async () => {
		vi.useFakeTimers()
		setVoiceManifest({ version: 1, lines: {} })
		const progress: number[] = []
		const speech = speak("One two three.", { silent: true, onProgress: spoken => progress.push(spoken) })
		await vi.advanceTimersByTimeAsync(5_000)
		await expect(speech.finished).resolves.toBe("ended")
		expect(speech.source()).toBe("captions")
		expect(progress).toEqual([3, 7, 14, 14])
	})

	it("ends at once under reduced motion, with the whole line shown", async () => {
		const progress: number[] = []
		const speech = speak("A whole line at once.", { silent: true, reduced: true, onProgress: spoken => progress.push(spoken) })
		await expect(speech.finished).resolves.toBe("ended")
		expect(progress.at(-1)).toBe("A whole line at once.".length)
	})

	it("stops when asked and says so", async () => {
		vi.useFakeTimers()
		const speech = speak("This line is interrupted part way through.", { silent: true })
		await vi.advanceTimersByTimeAsync(500)
		speech.stop()
		await expect(speech.finished).resolves.toBe("stopped")
	})

	it("never speaks aloud when the browser is automated", async () => {
		vi.useFakeTimers()
		const synth = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] }
		Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth })
		Object.defineProperty(navigator, "webdriver", { configurable: true, get: () => true })
		setVoiceManifest({ version: 1, lines: {} })
		const speech = speak("Test runs stay silent.")
		await vi.advanceTimersByTimeAsync(5_000)
		await speech.finished
		expect(synth.speak).not.toHaveBeenCalled()
		expect(speech.source()).toBe("captions")
		Object.defineProperty(navigator, "webdriver", { configurable: true, get: () => false })
		Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined })
	})
})
