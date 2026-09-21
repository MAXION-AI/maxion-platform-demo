import { useEffect, useState } from "react"
import { DEMO_OWNER_EVENT, demoOwnsStorage } from "./session"

/* Whether this tab still owns the demo's saved state; it changes when another tab takes the demo over. */
export function useDemoOwnership() {
	const [owns, setOwns] = useState(demoOwnsStorage)
	useEffect(() => {
		const check = () => setOwns(demoOwnsStorage())
		check()
		window.addEventListener(DEMO_OWNER_EVENT, check)
		return () => window.removeEventListener(DEMO_OWNER_EVENT, check)
	}, [])
	return owns
}
