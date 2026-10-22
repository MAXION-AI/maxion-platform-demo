import { useEffect, useRef, type RefObject } from "react"

/*
 * A side sheet opened from a button: focus moves to its first control, Escape closes it, and focus
 * goes back to whatever opened it. Synchronous focus (no requestAnimationFrame), so it also holds
 * under the paused Playwright clock.
 */
export function useSheetFocus(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
	const opener = useRef<HTMLElement | null>(null)
	const close = useRef(onClose)
	close.current = onClose
	useEffect(() => {
		if (!open) return
		opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
		panelRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus({ preventScroll: true })
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return
			event.preventDefault()
			close.current()
		}
		document.addEventListener("keydown", onKeyDown)
		return () => {
			document.removeEventListener("keydown", onKeyDown)
			if (opener.current?.isConnected) opener.current.focus({ preventScroll: true })
		}
	}, [open, panelRef])
}
