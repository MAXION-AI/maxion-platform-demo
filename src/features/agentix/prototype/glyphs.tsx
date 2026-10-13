import type { CSSProperties, ReactNode } from "react"
import "./glyphs.css"

/*
 * Agentix's own glyphs, drawn in the sidebar's grammar (NavGlyphs.tsx) rather than taken from a stock
 * set: a 24 grid, 2px round strokes, one outline shape, one solid accent and one faded back layer.
 * Statuses are seals: a soft disc in the status colour with the mark drawn over it, the way a
 * hierarchical symbol reads. Objects and capabilities are abstract figures: a result's board, a
 * pipeline's three nodes, a source's stacked slabs. Controls (chevrons, arrows, close, search,
 * play and pause, microphone) stay with the stock set; these are the things the floor talks about.
 *
 * Each glyph is exported under the name of the stock icon it replaces, so a call site reads the same
 * and takes the same props (size, weight, className). `weight="fill"` deepens a seal's disc.
 */
type GlyphProps = { size?: number | string; weight?: string; className?: string; style?: CSSProperties; color?: string; "aria-hidden"?: boolean | "true" | "false"; "aria-label"?: string }
export type Glyph = (props: GlyphProps) => JSX.Element

function glyph(name: string, figure: ReactNode): Glyph {
	const Component = ({ size = 16, weight, className, style, color, "aria-label": label, "aria-hidden": hidden }: GlyphProps) => (
		<svg
			className={`ax-glyph${weight === "fill" ? " is-fill" : ""}${className ? ` ${className}` : ""}`}
			data-glyph={name}
			viewBox="0 0 24 24"
			width={size}
			height={size}
			style={color ? { ...style, color } : style}
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : hidden ?? true}
			focusable="false">
			{figure}
		</svg>
	)
	Component.displayName = `Glyph(${name})`
	return Component
}

const disc = <circle className="ax-disc" cx="12" cy="12" r="10" />
const dot = (cx: number, cy: number) => <circle className="ax-solid" cx={cx} cy={cy} r="1.3" />

/* ---- Statuses: seals ------------------------------------------------------------------ */
export const CheckCircle = glyph("done", <>{disc}<path d="M7.8 12.4l2.9 2.9 5.5-5.7" /></>)
export const WarningCircle = glyph("attention", <>{disc}<path d="M12 7.2v5.4" />{dot(12, 16.5)}</>)
export const Warning = glyph("warning", <><path className="ax-disc" d="M10.3 3.9a2 2 0 0 1 3.4 0l8.1 14a2 2 0 0 1-1.7 3H3.9a2 2 0 0 1-1.7-3z" /><path d="M12 9v4.6" />{dot(12, 17.1)}</>)
export const XCircle = glyph("failed", <>{disc}<path d="M8.9 8.9l6.2 6.2M15.1 8.9l-6.2 6.2" /></>)
export const PauseCircle = glyph("paused", <>{disc}<path d="M10 8.6v6.8M14 8.6v6.8" /></>)
export const Clock = glyph("waiting", <>{disc}<path d="M12 7.2V12l3.2 2" /></>)
export const Hourglass = Clock
// Scheduled: the hour hand set, and the time it is waiting for marked on the dial.
export const ClockCountdown = glyph("scheduled", <>{disc}<path d="M12 7.6V12l-3 1.8" /><circle className="ax-solid" cx="16.6" cy="12" r="1.4" /></>)
export const Info = glyph("info", <>{disc}<path d="M12 11v5.2" />{dot(12, 7.7)}</>)
export const Prohibit = glyph("declined", <>{disc}<path d="M8 12h8" /></>)
export const MinusCircle = Prohibit
export const StopCircle = glyph("stopped", <>{disc}<rect className="ax-solid" x="8.6" y="8.6" width="6.8" height="6.8" rx="1.8" /></>)
export const Pulse = glyph("live", <>{disc}<circle className="ax-solid" cx="12" cy="12" r="3.4" /></>)
export const Question = glyph("question", <>{disc}<path d="M9.7 9.5a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .8-1 1.5v.3" />{dot(12, 16.7)}</>)
export const Circle = glyph("pending", <circle className="ax-back" cx="12" cy="12" r="8.5" />)

/* ---- Results: what the team builds --------------------------------------------------- */
// A board with its live measure raised.
export const ChartBar = glyph("dashboard", <><rect x="3" y="3.5" width="18" height="17" rx="4" /><path className="ax-back" d="M8 16.5v-3M16 16.5v-5" /><path className="ax-accent" d="M12 16.5v-8.5" /></>)
// Three stages in a line, the one at work solid.
export const TreeStructure = glyph("pipeline", <><rect x="2.5" y="7" width="5" height="10" rx="1.8" /><rect className="ax-solid ax-accent" x="9.5" y="7" width="5" height="10" rx="1.8" /><rect className="ax-back" x="16.5" y="7" width="5" height="10" rx="1.8" /></>)
// Fields on one side matched to fields on the other.
export const ArrowsLeftRight = glyph("mapping", <><path d="M4 6.5h4M4 12h4M4 17.5h4" /><path className="ax-back" d="M16 6.5h4M16 12h4M16 17.5h4" /><path className="ax-accent" d="M10.5 6.5c2.4 0 2.6 5.5 3.5 5.5" /><circle className="ax-solid ax-accent" cx="14" cy="12" r="1.6" /></>)
// A page, its first line written and the next begun.
const page = <><rect x="5" y="3" width="14" height="18" rx="3" /><path className="ax-accent" d="M8.5 8.5h7" /><path className="ax-back" d="M8.5 12.5h7M8.5 16.5h4" /></>
export const FileText = glyph("runbook", page)
export const Scroll = glyph("document", page)
// A choice: one path forking in two, the way taken solid.
export const Scales = glyph("decision", <><path d="M12 20v-6.5" /><path className="ax-back" d="M12 13.5L7 8.2" /><path className="ax-accent" d="M12 13.5l5-5.3" /><circle className="ax-back" cx="6" cy="6.8" r="2.3" /><circle className="ax-solid ax-accent" cx="18" cy="6.8" r="2.5" /></>)
// A record and its seal.
export const Receipt = glyph("evidence", <><rect x="4.5" y="3" width="13.5" height="18" rx="2.6" /><path className="ax-back" d="M8 8h6.5M8 12h4" /><circle className="ax-solid ax-accent ax-cut" cx="16.5" cy="17" r="3.4" /></>)
// A version branching from the line it came from.
export const GitBranch = glyph("version", <><path className="ax-back" d="M6.5 8v8" /><path className="ax-accent" d="M6.5 14c0-3.6 3.4-5.5 8-5.5" /><circle cx="6.5" cy="5.5" r="2.4" /><circle className="ax-back" cx="6.5" cy="18.5" r="2.4" /><circle className="ax-solid ax-accent" cx="17" cy="8.5" r="2.6" /></>)
// Packages layered, the newest on top.
export const Stack = glyph("packages", <><path className="ax-back" d="M4 16l8 4.5 8-4.5" /><path d="M4 12l8 4.5 8-4.5" /><path className="ax-solid ax-accent" d="M12 3l8 4.5-8 4.5-8-4.5z" /></>)
export const FileArrowDown = glyph("export", <><rect x="5" y="3" width="14" height="18" rx="2.6" /><path className="ax-back" d="M12 7.5v7.5" /><path className="ax-accent" d="M8.8 12.6l3.2 3.2 3.2-3.2" /></>)

/* ---- Capabilities: what the team may do at a system ---------------------------------- */
// A source of records: the cylinder, its top (where it is read) solid.
export const Database = glyph("read", <><ellipse className="ax-solid ax-accent" cx="12" cy="6" rx="7.5" ry="2.8" /><path d="M4.5 6v12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V6" /><path className="ax-back" d="M4.5 12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8" /></>)
// Something being built: two blocks laid, the next one going on.
export const Hammer = glyph("build", <><rect x="3" y="13" width="8" height="7.5" rx="2" /><rect className="ax-back" x="13" y="13" width="8" height="7.5" rx="2" /><rect className="ax-solid ax-accent" x="8" y="3.5" width="8" height="7.5" rx="2" /></>)
// Tried in isolation: the flask, and what is in it.
export const Flask = glyph("test", <><path d="M9 3.5h6M10 3.5v5.4L4.9 17.6a2 2 0 0 0 1.7 3h10.8a2 2 0 0 0 1.7-3L14 8.9V3.5" /><path className="ax-solid ax-accent" d="M7.4 15.5h9.2l1.3 2.2a.9.9 0 0 1-.8 1.3H6.9a.9.9 0 0 1-.8-1.3z" /></>)
// A live system: two units of a rack, the one in service lit.
export const Rocket = glyph("production", <><rect x="3.5" y="4" width="17" height="7" rx="2.4" /><rect className="ax-back" x="3.5" y="13" width="17" height="7" rx="2.4" /><circle className="ax-solid ax-accent" cx="16.5" cy="7.5" r="1.6" /><path className="ax-back" d="M7 7.5h4" /></>)
// A release leaving its pad.
export const RocketLaunch = glyph("release", <><rect className="ax-back" x="5" y="16.5" width="14" height="4" rx="2" /><path d="M12 16.5V11" /><path className="ax-solid ax-accent" d="M12 3.5l4.6 7.8H7.4z" /></>)
// A record being written: the pen, and the line it leaves.
export const PencilSimpleLine = glyph("update", <><path d="M4 20l1-4.2L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19z" /><path className="ax-solid ax-accent" d="M4 20l1-4.2 3.2 3.2z" /><path className="ax-back" d="M13 20h7" /></>)
// A message with its delivery mark.
export const Bell = glyph("notify", <><rect x="3.5" y="7" width="13" height="13" rx="3.8" /><path className="ax-back" d="M7.2 13.5h5.6" /><circle className="ax-solid ax-accent" cx="18" cy="6" r="2.8" /></>)
export const BellSlash = glyph("muted", <><rect className="ax-back" x="3.5" y="7" width="13" height="13" rx="3.8" /><path d="M4 4l16 16" /></>)
export const Lock = glyph("lock", <><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" /><rect className="ax-solid ax-accent" x="5.5" y="11" width="13" height="9.5" rx="2.6" /></>)
const shield = <path d="M12 3.2l7 2.8v5.2c0 4.3-2.9 7.7-7 9.6-4.1-1.9-7-5.3-7-9.6V6z" />
export const ShieldCheck = glyph("policy", <>{shield}<path className="ax-accent" d="M8.9 12.2l2.2 2.2 4-4.2" /></>)
export const ShieldWarning = glyph("policy-warning", <>{shield}<path className="ax-accent" d="M12 8.6v4" /><circle className="ax-solid ax-accent" cx="12" cy="15.8" r="1.2" /></>)

/* ---- The team and its day ---------------------------------------------------------------- */
// One accountable agent over the duties it hands work to (the sidebar's Agentix figure).
export const UsersThree = glyph("team", <><path className="ax-back" d="M10.3 9.4L7.8 13.9M13.7 9.4l2.5 4.5" /><circle className="ax-solid ax-accent" cx="12" cy="6.6" r="3.2" /><circle cx="6.2" cy="17.2" r="3.2" /><circle cx="17.8" cy="17.2" r="3.2" /></>)
export const UserCircle = glyph("owner", <>{disc}<circle className="ax-solid ax-accent" cx="12" cy="9.5" r="3.1" /><path d="M6.8 18.1c1.3-2.2 3.1-3.3 5.2-3.3s3.9 1.1 5.2 3.3" /></>)
// A conversation: one bubble, someone mid-sentence in it.
export const ChatCircleText = glyph("conversation", <><path d="M7 4.5h10a3.5 3.5 0 0 1 3.5 3.5v5.5A3.5 3.5 0 0 1 17 17h-6.5L6 20.5V17a3.5 3.5 0 0 1-2.5-3.5V8A3.5 3.5 0 0 1 7 4.5z" /><path className="ax-accent" d="M8.2 9.3h7.6" /><path className="ax-back" d="M8.2 12.7h4.6" /></>)
// Events arriving: one dropping into the tray that receives them.
export const Lightning = glyph("events", <><path d="M3.5 13.5h4.2l1.6 2.8h5.4l1.6-2.8h4.2v4.5a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5z" /><path className="ax-back" d="M12 3.5v7" /><path className="ax-accent" d="M8.9 8l3.1 3.1L15.1 8" /></>)
// Two systems linked.
export const PlugsConnected = glyph("systems", <><circle cx="9" cy="12" r="5.5" /><circle className="ax-accent" cx="15" cy="12" r="5.5" /></>)
export const FlagBanner = glyph("milestone", <><path d="M6 21V4" /><path className="ax-solid ax-accent" d="M7 4.5h11l-2.8 4 2.8 4H7z" /></>)
export const CalendarBlank = glyph("schedule", <><rect x="3.5" y="5" width="17" height="15.5" rx="3.5" /><path className="ax-back" d="M3.5 10h17M8 3v4M16 3v4" /><rect className="ax-solid ax-accent" x="13.5" y="13" width="3.8" height="3.8" rx="1.1" /></>)
// A voice: bars around a tall one.
export const Waveform = glyph("talk", <><path className="ax-back" d="M5 10.5v3M19 10.5v3" /><path d="M8.5 8v8M15.5 8v8" /><path className="ax-accent" d="M12 5v14" /></>)
// Said out loud: a source and its two rings.
export const SpeakerHigh = glyph("briefing", <><circle className="ax-solid ax-accent" cx="7" cy="12" r="3" /><path d="M12.5 8.5a5 5 0 0 1 0 7" /><path className="ax-back" d="M16 5.5a9.5 9.5 0 0 1 0 13" /></>)
// The record again, from the start.
export const ArrowsClockwise = glyph("replay", <><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path className="ax-accent" d="M19.5 4.5v4h-4" /><circle className="ax-solid ax-back" cx="12" cy="12" r="1.6" /></>)
