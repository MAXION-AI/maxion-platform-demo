import { useEffect, useRef, type ReactNode } from "react"
import { useReducedMotion } from "motion/react"

import type { LevelRef } from "./audioLevel"
import "./voice.css"

/*
 * The voice orb, after the ElevenLabs agent orb: a soft, slowly moving body of MAXION teal
 * whose shape answers sound. It has one look per turn so you can tell who has the floor
 * without reading a label:
 *
 *   idle       breathes slowly; nobody is talking
 *   listening  the edge ripples with the owner's microphone level
 *   thinking   draws in, and a highlight circles it while MAX composes
 *   speaking   swells and settles with MAX's own voice
 *   off        grey and still; nothing can listen (blocked mic, ended call)
 *
 * It draws on a canvas from the design tokens (--ds-orb-*), reads its level from a ref on
 * each frame (so sound never re-renders React), and under reduced motion draws one still
 * frame per state. An optional ring around it shows the interview's topics.
 */

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "off"
export type RingSegment = { key: string; label: string; status: "done" | "gap" | "current" | "pending" }

const TAU = Math.PI * 2

function rgba(hex: string, alpha: number) {
	const value = hex.trim().replace("#", "")
	const full = value.length === 3 ? value.split("").map(char => char + char).join("") : value.slice(0, 6)
	const number = Number.parseInt(full, 16)
	if (!Number.isFinite(number)) return `rgba(16, 112, 112, ${alpha})`
	return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`
}

type Palette = { light: string; mid: string; deep: string; pale: string }
function palette(node: Element): Palette {
	const style = getComputedStyle(node)
	const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
	return { light: read("--ds-orb-1", "#5fd3cf"), deep: read("--ds-orb-2", "#107070"), pale: read("--ds-orb-3", "#d8f4f2"), mid: read("--ds-orb-4", "#2a9d9a") }
}

/* jsdom has no 2D context and logs when asked for one; the orb is decorative there. */
const canDraw = () => typeof navigator !== "undefined" && !/jsdom/i.test(navigator.userAgent)

function draw(context: CanvasRenderingContext2D, size: number, t: number, state: OrbState, level: number, colors: Palette) {
	const c = size / 2
	context.clearRect(0, 0, size, size)
	const speaking = state === "speaking" ? level : 0
	const listening = state === "listening" ? level : 0
	const breath = Math.sin(t * 0.9) * 0.018
	const base = size * 0.42 * (1 + breath + speaking * 0.11 - (state === "thinking" ? 0.05 + Math.sin(t * 2.2) * 0.012 : 0))
	// The edge: a few slow harmonics, louder while someone talks.
	const amp = 0.008 + listening * 0.07 + speaking * 0.03
	context.save()
	context.beginPath()
	const steps = 120
	const points: [number, number][] = []
	for (let index = 0; index < steps; index += 1) {
		const theta = (index / steps) * TAU
		const wobble = Math.sin(theta * 3 + t * 1.3) * amp + Math.sin(theta * 5 - t * 1.9 + 1.2) * amp * 0.6 + Math.sin(theta * 2 + t * 0.7 + 2.1) * amp * 0.8
		const radius = base * (1 + wobble)
		points.push([c + Math.cos(theta) * radius, c + Math.sin(theta) * radius])
	}
	for (let index = 0; index <= steps; index += 1) {
		const [x, y] = points[index % steps]
		const [nx, ny] = points[(index + 1) % steps]
		const mx = (x + nx) / 2, my = (y + ny) / 2
		if (index === 0) context.moveTo(mx, my)
		else context.quadraticCurveTo(x, y, mx, my)
	}
	context.closePath()
	context.clip()

	// Body: pale centre to deep edge.
	const body = context.createRadialGradient(c - base * 0.25, c - base * 0.3, base * 0.05, c, c, base * 1.05)
	body.addColorStop(0, colors.pale)
	body.addColorStop(0.45, colors.light)
	body.addColorStop(0.8, colors.mid)
	body.addColorStop(1, colors.deep)
	context.fillStyle = body
	context.fillRect(0, 0, size, size)

	// Currents: three soft lights that drift inside, faster while MAX talks.
	const pace = state === "speaking" ? 1.5 + speaking : state === "thinking" ? 2.2 : state === "listening" ? 1.1 : 0.6
	const lights: [string, number, number, number][] = [[colors.pale, 0.55, 0.0, 0.62], [colors.light, 0.42, 2.1, 0.55], [colors.deep, 0.5, 4.2, 0.35]]
	for (const [color, reach, phase, alpha] of lights) {
		const angle = t * 0.35 * pace + phase
		const x = c + Math.cos(angle) * base * reach
		const y = c + Math.sin(angle * 1.3) * base * reach * 0.8
		const glow = context.createRadialGradient(x, y, 0, x, y, base * 0.85)
		glow.addColorStop(0, rgba(color, alpha))
		glow.addColorStop(1, rgba(color, 0))
		context.fillStyle = glow
		context.fillRect(0, 0, size, size)
	}

	// Thinking: a highlight that circles the rim.
	if (state === "thinking") {
		const angle = t * 2.4
		const x = c + Math.cos(angle) * base * 0.72, y = c + Math.sin(angle) * base * 0.72
		const sweep = context.createRadialGradient(x, y, 0, x, y, base * 0.6)
		sweep.addColorStop(0, "rgba(255, 255, 255, 0.55)")
		sweep.addColorStop(1, "rgba(255, 255, 255, 0)")
		context.fillStyle = sweep
		context.fillRect(0, 0, size, size)
	}

	// Sheen and a darker rim, so it reads as a sphere rather than a disc.
	const sheen = context.createRadialGradient(c - base * 0.38, c - base * 0.42, 0, c - base * 0.38, c - base * 0.42, base * 0.7)
	sheen.addColorStop(0, "rgba(255, 255, 255, 0.5)")
	sheen.addColorStop(1, "rgba(255, 255, 255, 0)")
	context.fillStyle = sheen
	context.fillRect(0, 0, size, size)
	const rim = context.createRadialGradient(c, c, base * 0.62, c, c, base * 1.04)
	rim.addColorStop(0, rgba(colors.deep, 0))
	rim.addColorStop(1, rgba(colors.deep, 0.32))
	context.fillStyle = rim
	context.fillRect(0, 0, size, size)
	context.restore()
}

export function VoiceOrb({ state, level, size = "lg", ring, ringLabel, className, children }: {
	state: OrbState
	level?: LevelRef
	size?: "xs" | "sm" | "md" | "lg"
	ring?: RingSegment[]
	ringLabel?: string
	className?: string
	children?: ReactNode
}) {
	const reduced = useReducedMotion()
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const stateRef = useRef(state)
	stateRef.current = state

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas || !canDraw()) return
		const context = canvas.getContext("2d")
		if (!context) return
		const box = canvas.getBoundingClientRect().width || canvas.width
		const ratio = Math.min(2, window.devicePixelRatio || 1)
		canvas.width = Math.round(box * ratio)
		canvas.height = Math.round(box * ratio)
		context.setTransform(ratio, 0, 0, ratio, 0, 0)
		const colors = palette(canvas)
		const start = performance.now()
		// One frame now, so a paused clock or reduced motion still shows the orb.
		draw(context, box, 0.6, stateRef.current, 0, colors)
		if (reduced) return
		let id = 0
		let shown = 0
		const loop = (now: number) => {
			const value = level?.current ?? 0
			shown = shown * 0.6 + value * 0.4
			draw(context, box, (now - start) / 1000, stateRef.current, shown, colors)
			id = window.requestAnimationFrame(loop)
		}
		// An orb nobody can see (a hidden module, scrolled away) stops drawing until it is back.
		const run = () => { if (!id) id = window.requestAnimationFrame(loop) }
		const halt = () => { window.cancelAnimationFrame(id); id = 0 }
		const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) run(); else halt() })
		observer?.observe(canvas)
		run()
		return () => { halt(); observer?.disconnect() }
	}, [reduced, size, level])

	// Under reduced motion each state still gets its own still frame.
	useEffect(() => {
		if (!reduced) return
		const canvas = canvasRef.current
		const context = canvas && canDraw() ? canvas.getContext("2d") : null
		if (!canvas || !context) return
		const ratio = Math.min(2, window.devicePixelRatio || 1)
		draw(context, canvas.width / ratio, 0.6, state, state === "speaking" ? 0.4 : state === "listening" ? 0.3 : 0, palette(canvas))
	}, [reduced, state])

	const done = ring?.filter(segment => segment.status === "done").length ?? 0
	const gaps = ring?.filter(segment => segment.status === "gap").length ?? 0
	return (
		<div className={`vo vo--${size} is-${state}${className ? ` ${className}` : ""}`} data-orb-state={state}>
			<span className="vo-glow" aria-hidden="true" />
			<canvas ref={canvasRef} className="vo-canvas" aria-hidden="true" />
			{ring?.length ? (
				<svg className="vo-ring" viewBox="0 0 100 100" role="img" aria-label={ringLabel ?? `${done} of ${ring.length} topics captured${gaps ? `, ${gaps} kept open` : ""}`}>
					{ring.map((segment, index) => {
						const span = 360 / ring.length
						const gap = 5
						const from = index * span - 90 + gap / 2
						const to = from + span - gap
						const radius = 48.5
						const point = (degrees: number) => [50 + radius * Math.cos((degrees * Math.PI) / 180), 50 + radius * Math.sin((degrees * Math.PI) / 180)]
						const [x1, y1] = point(from), [x2, y2] = point(to)
						return <path key={segment.key} className={`vo-seg is-${segment.status}`} d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}><title>{segment.label}</title></path>
					})}
				</svg>
			) : null}
			{children ? <div className="vo-center">{children}</div> : null}
		</div>
	)
}
