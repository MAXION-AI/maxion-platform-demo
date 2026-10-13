/*
 * Motion kit. Small, reusable motion patterns in the manner of Aceternity UI's
 * components, built on motion.dev (`motion/react`) and the design tokens:
 *
 * - GeneratedWords: Aceternity's text-generate effect. Each newly revealed word
 *   resolves from a blur, so streamed agent text reads as it is written.
 * - Orb: the ElevenLabs voice orb, a slowly turning conic pinwheel with a glow.
 * - StepLoader: Aceternity's multi-step loader. A rolling list that keeps the
 *   current step centred and marks the finished ones.
 * - CyclingPlaceholder: the placeholder half of Aceternity's "placeholders and
 *   vanish input". Example prompts rise in and out of an empty field.
 * - MovingBorder: a conic sweep around whatever is currently working.
 *
 * Every pattern honours prefers-reduced-motion and renders the final state.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Check } from "@phosphor-icons/react"
import { useEffect, useState, type CSSProperties, type ReactNode } from "react"

import "./motion-kit.css"

const EASE = [0.2, 0, 0, 1] as const

/* Text generate: render the first `revealed` words; each enters from a blur. */
export function GeneratedWords({ text, revealed, className }: { text: string; revealed: number; className?: string }) {
	const reduced = useReducedMotion()
	const words = text.split(" ")
	const shown = Math.min(revealed, words.length)
	if (reduced) return <span className={className}>{words.slice(0, shown).join(" ")}</span>
	// Each word mounts once and plays a CSS entrance from a blur and a muted
	// ink. Opacity never dips, so contrast checks stay true mid-stream.
	return (
		<span className={className}>
			{words.slice(0, shown).map((word, index) => (
				<span key={index} className="mk-word">{word}{index < words.length - 1 ? " " : ""}</span>
			))}
		</span>
	)
}

/* Streams a reply into view a word at a time, resting briefly at sentence ends.
 * Pair with GeneratedWords. Reduced motion, or an inactive stream, shows it whole. */
export function useWordStream(text: string, active: boolean) {
	const reduced = useReducedMotion()
	const live = active && !reduced
	const [count, setCount] = useState(live ? 0 : Number.MAX_SAFE_INTEGER)
	useEffect(() => {
		if (!live) { setCount(Number.MAX_SAFE_INTEGER); return }
		const words = text.split(" ")
		let index = 0
		let timer = 0
		setCount(0)
		const step = () => {
			index += 1
			setCount(index)
			if (index >= words.length) return
			timer = window.setTimeout(step, /[.?!:]["”’)]?$/.test(words[index - 1] ?? "") ? 160 : 32)
		}
		timer = window.setTimeout(step, 32)
		return () => window.clearTimeout(timer)
	}, [text, live])
	return live ? count : Number.MAX_SAFE_INTEGER
}

/* A label that shimmers while work is in flight. */
export function ShimmerText({ children, className }: { children: ReactNode; className?: string }) {
	return <span className={`mk-shimmer${className ? ` ${className}` : ""}`}>{children}</span>
}

/* The voice orb. `active` breathes it while someone is speaking; `still` stops the
 * wheel and greys it out when nothing can listen (an error or an unsupported browser). */
export function Orb({ size = "md", active = false, still = false, className, children }: { size?: "sm" | "md" | "lg"; active?: boolean; still?: boolean; className?: string; children?: ReactNode }) {
	const reduced = useReducedMotion()
	const breathing = active && !still
	return (
		<div className={`mk-orb mk-orb--${size}${still ? " mk-orb--still" : ""}${className ? ` ${className}` : ""}`} aria-hidden={children ? undefined : true}>
			<span className="mk-orb-glow" />
			<motion.span
				className="mk-orb-core"
				animate={reduced ? undefined : { scale: breathing ? [1, 1.035, 0.99, 1.02, 1] : 1 }}
				transition={breathing ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4, ease: EASE }}>
				<span className="mk-orb-wheel" />
				<span className="mk-orb-sheen" />
			</motion.span>
			{children}
		</div>
	)
}

export type LoaderStep = { id: string; label: string; detail?: string }
export type LoaderStatus = "complete" | "current" | "pending"

/* Multi-step loader: finished steps carry a filled check, the current one a ring. */
export function StepLoader({ steps, current, label }: { steps: LoaderStep[]; current: number; label: string }) {
	const reduced = useReducedMotion()
	return (
		<ol className="mk-steps" aria-label={label}>
			{steps.map((step, index) => {
				const status: LoaderStatus = index < current ? "complete" : index === current ? "current" : "pending"
				return (
					<motion.li
						key={step.id}
						className={`mk-step is-${status}`}
						data-step={step.id}
						layout="position"
						transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}>
						<span className="mk-step-mark" aria-hidden="true">
							<AnimatePresence initial={false} mode="wait">
								{status === "complete" ? (
									<motion.span key="done" className="mk-step-check" initial={reduced ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 520, damping: 28 }}>
										<Check size={12} weight="bold" />
									</motion.span>
								) : status === "current" ? (
									<motion.span key="now" className="mk-step-ring" initial={reduced ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} />
								) : (
									<span key="later" className="mk-step-dot" />
								)}
							</AnimatePresence>
						</span>
						<span className="mk-step-text">
							<strong>{step.label}</strong>
							{step.detail ? <small>{step.detail}</small> : null}
						</span>
					</motion.li>
				)
			})}
		</ol>
	)
}

/* Placeholder cycling for an empty field. Purely visual; the field keeps its own label. */
export function CyclingPlaceholder({ items, active, interval = 3200 }: { items: string[]; active: boolean; interval?: number }) {
	const reduced = useReducedMotion()
	const [index, setIndex] = useState(0)
	useEffect(() => {
		if (!active || reduced || items.length < 2) return
		const timer = window.setInterval(() => setIndex(current => (current + 1) % items.length), interval)
		return () => window.clearInterval(timer)
	}, [active, reduced, items.length, interval])
	if (!active) return null
	return (
		<span className="mk-placeholder" aria-hidden="true">
			<span className="mk-placeholder-line">
				<AnimatePresence mode="wait" initial={false}>
					<motion.span
						key={index}
						initial={{ y: "110%", filter: "blur(3px)" }}
						animate={{ y: "0%", filter: "blur(0px)" }}
						exit={{ y: "-110%", filter: "blur(3px)" }}
						transition={{ duration: 0.34, ease: EASE }}>
						{items[index]}
					</motion.span>
				</AnimatePresence>
			</span>
		</span>
	)
}

/* A conic highlight that travels around the edge of whatever is working. */
export function MovingBorder({ active, children, className, style }: { active: boolean; children: ReactNode; className?: string; style?: CSSProperties }) {
	return <div className={`mk-moving-border${active ? " is-active" : ""}${className ? ` ${className}` : ""}`} style={style}>{children}</div>
}

/* Entrance used for turns, cards and list rows added after mount. Rows land by
 * moving and resolving from a blur, never by fading in, so text never sits at a
 * contrast the accessibility checks would reject. */
export const riseIn = {
	initial: { y: 10, filter: "blur(3px)" },
	animate: { y: 0, filter: "blur(0px)" },
	exit: { opacity: 0, y: -4 },
	transition: { duration: 0.3, ease: EASE },
} as const

/* riseIn for surfaces that also run under reduced motion: nothing moves then,
 * and rows leave at once instead of waiting on an exit that may never play. */
export function useRiseIn() {
	const reduced = useReducedMotion()
	return reduced ? {} : { ...riseIn, layout: "position" as const }
}

/* A side sheet sliding in from the right edge on the shared sheet spring. Under reduced
 * motion the sheet is in place on its first frame and leaves without an exit. */
export function useSheetMotion() {
	const reduced = useReducedMotion()
	return reduced
		? { initial: false as const }
		: { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" }, transition: { type: "spring" as const, stiffness: 420, damping: 42 } }
}
