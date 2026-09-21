import { ArrowUp } from "@phosphor-icons/react"
import { useLayoutEffect, useRef, type FormEvent, type ReactNode, type RefObject } from "react"

import "./workspace-composer.css"

type WorkspaceComposerProps = {
	id?: string
	value: string
	onChange: (value: string) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	label: string
	placeholder: string
	context?: ReactNode
	tools?: ReactNode
	inputRef?: RefObject<HTMLTextAreaElement>
	sendLabel?: string
	maxLength?: number
}

/*
 * One writing surface for every agent conversation: the ElevenLabs Test AI agent
 * composer (mobbin 8dbb547d). The field sits on top; the bar beneath carries the
 * scope on the left and the tools beside a filled Send on the right.
 */
export function WorkspaceComposer({ id, value, onChange, onSubmit, label, placeholder, context, tools, inputRef, sendLabel = "Send message", maxLength }: WorkspaceComposerProps) {
	const localRef = useRef<HTMLTextAreaElement>(null)
	const ref = inputRef ?? localRef
	useLayoutEffect(() => {
		const input = ref.current
		if (!input) return
		input.style.height = "auto"
		input.style.height = `${Math.min(160, input.scrollHeight)}px`
	}, [value, ref])
	return (
		<form className="ws-composer" onSubmit={event => { event.preventDefault(); if (value.trim()) onSubmit(event) }}>
			<textarea id={id} ref={ref} aria-label={label} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={1} maxLength={maxLength}
				onKeyDown={event => {
					if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
						event.preventDefault()
						if (value.trim()) event.currentTarget.form?.requestSubmit()
					}
				}} />
			<div className="ws-composer-bar">
				{context ? <div className="ws-composer-context">{context}</div> : <span />}
				<div className="ws-composer-tools">
					{tools}
					<button type="submit" className="ws-send" aria-label={sendLabel} disabled={!value.trim()}><ArrowUp size={14} weight="bold" /><span>Send</span></button>
				</div>
			</div>
		</form>
	)
}
