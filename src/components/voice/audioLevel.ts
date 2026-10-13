/*
 * Audio levels for the voice orb. Three sources feed one number between 0 and 1:
 *
 * - a playing <audio> element (MAX's pre-rendered voice), measured with an AnalyserNode;
 * - the owner's microphone, measured the same way while the call is listening;
 * - a synthetic envelope, pulsed once per spoken word, for the browser voice and for
 *   simulated speech, where the page has no audio stream it is allowed to measure.
 *
 * Every meter writes into a LevelRef the orb reads on its own animation frame, so nothing
 * here re-renders React. Each opener returns a stop function that releases what it took.
 */

export type LevelRef = { current: number }
export const createLevel = (): LevelRef => ({ current: 0 })

type AudioContextConstructor = typeof AudioContext
let sharedContext: AudioContext | null = null

/* One AudioContext per page, created on the user's gesture (browsers start it suspended otherwise). */
export function audioContext(): AudioContext | null {
	if (sharedContext) return sharedContext
	if (typeof window === "undefined") return null
	const Context = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext) as AudioContextConstructor | undefined
	if (!Context) return null
	try { sharedContext = new Context() } catch { sharedContext = null }
	return sharedContext
}

const frame = (callback: () => void) => typeof window !== "undefined" && typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame(callback) : 0
const cancelFrame = (id: number) => { if (id && typeof window !== "undefined") window.cancelAnimationFrame?.(id) }

/* RMS of the analyser's time-domain data, eased so the orb never jitters. */
function meter(analyser: AnalyserNode, level: LevelRef, gain: number) {
	const data = new Uint8Array(analyser.fftSize)
	let id = 0
	let running = true
	const read = () => {
		if (!running) return
		analyser.getByteTimeDomainData(data)
		let sum = 0
		for (let index = 0; index < data.length; index += 1) { const value = (data[index] - 128) / 128; sum += value * value }
		const rms = Math.min(1, Math.sqrt(sum / data.length) * gain)
		level.current = level.current * 0.72 + rms * 0.28
		id = frame(read)
	}
	id = frame(read)
	return () => { running = false; cancelFrame(id); level.current = 0 }
}

/* Measures an <audio> element as it plays. The element must be same-origin. */
const meteredElements = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>()
export function meterElement(element: HTMLMediaElement, level: LevelRef): () => void {
	const context = audioContext()
	if (!context) return () => { level.current = 0 }
	try {
		if (context.state === "suspended") void context.resume()
		let source = meteredElements.get(element)
		if (!source) { source = context.createMediaElementSource(element); meteredElements.set(element, source) }
		const analyser = context.createAnalyser()
		analyser.fftSize = 512
		source.connect(analyser)
		analyser.connect(context.destination)
		const stop = meter(analyser, level, 3.2)
		return () => { stop(); try { source!.disconnect(); analyser.disconnect() } catch { /* already gone */ } }
	} catch {
		return () => { level.current = 0 }
	}
}

export type MicIssue = "blocked" | "no-mic" | "unsupported" | "start"

/* Opens the microphone for its level only; speech-to-text runs separately. */
export async function openMicMeter(level: LevelRef): Promise<{ stop: () => void } | { issue: MicIssue }> {
	if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return { issue: "unsupported" }
	let stream: MediaStream
	try {
		stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
	} catch (error) {
		const name = (error as { name?: string })?.name
		return { issue: name === "NotAllowedError" || name === "SecurityError" ? "blocked" : name === "NotFoundError" ? "no-mic" : "start" }
	}
	const context = audioContext()
	if (!context) { stream.getTracks().forEach(track => track.stop()); return { issue: "unsupported" } }
	if (context.state === "suspended") void context.resume()
	const source = context.createMediaStreamSource(stream)
	const analyser = context.createAnalyser()
	analyser.fftSize = 512
	source.connect(analyser)
	const stop = meter(analyser, level, 4.5)
	return { stop: () => { stop(); try { source.disconnect() } catch { /* already gone */ } stream.getTracks().forEach(track => track.stop()) } }
}

/*
 * A synthetic envelope: each pulse lifts the level, and it decays between pulses the way a
 * voice does between syllables. Used where there is nothing real to measure.
 */
export function createEnvelope(level: LevelRef) {
	let id = 0
	let running = true
	let target = 0
	const decay = () => {
		if (!running) return
		level.current = level.current * 0.8 + target * 0.2
		target *= 0.86
		id = frame(decay)
	}
	id = frame(decay)
	return {
		pulse(strength = 0.6) { target = Math.min(1, Math.max(target, strength)) },
		stop() { running = false; cancelFrame(id); level.current = 0 },
	}
}
