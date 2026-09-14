import { useEffect, type RefObject } from "react"

const FOCUSABLE_SELECTOR = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"

/** Keeps modal focus contained and restores the element that opened it. */
export function useDialogFocus(panelRef: RefObject<HTMLElement | null>, open: boolean, returnFocusRef: RefObject<HTMLElement | null>) {
	useEffect(() => {
		if (!open) return
		const panel = panelRef.current
		if (!panel) return
		const returnTarget = returnFocusRef.current
		if (!panel.contains(document.activeElement)) panel.focus()
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return
			const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
			if (focusable.length === 0) { event.preventDefault(); return }
			const first = focusable[0]
			const last = focusable[focusable.length - 1]
			const active = document.activeElement
			if (event.shiftKey && (active === first || active === panel)) { event.preventDefault(); last.focus() }
			else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
			else if (!(active instanceof HTMLElement) || !panel.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
		}
		panel.addEventListener("keydown", onKeyDown)
		return () => {
			panel.removeEventListener("keydown", onKeyDown)
			if (returnTarget?.isConnected) returnTarget.focus()
		}
	}, [panelRef, returnFocusRef, open])
}
