/**
 * useDocumentTitle — per-page browser titles (UI plan T1.6), so history,
 * tabs and bookmarks can tell an audit ledger from a deploy queue.
 * Restores the previous title on unmount; null/empty leaves it untouched.
 */
import { useEffect } from "react"

export function useDocumentTitle(title: string | null | undefined) {
	useEffect(() => {
		if (typeof document === "undefined") return
		const trimmed = (title ?? "").trim()
		if (!trimmed) return
		const previous = document.title
		document.title = trimmed
		return () => {
			document.title = previous
		}
	}, [title])
}
