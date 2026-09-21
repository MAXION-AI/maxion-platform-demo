import { actOnEngagement, actOnRelease, actOnWork, artifactBy, artifactSpec, decisionBy, isTerminal, itemBy, latest, post, produce, releaseWindowOf, scenarioOf, templateOf } from "./engine"
import { SCENARIOS } from "./scenarios"
import { decisionTitle, itemSentence, needsYou, presenceLine, releaseSentence, statusOf, teamPresence } from "./selectors"
import { scopeKey, type AgentixState, type InstructionIntent, type InstructionStatus, type ObjectRef, type PendingChange, type Release, type ScopeRef, type WorkItem } from "./types"

/*
 * The composer's interpreter. No language model is connected: instructions are
 * matched against what this demo can really do, and anything else is answered
 * honestly with the input kept. The accountable agent answers; it coordinates
 * the specialists, so the owner never manages separate agent chats.
 *
 * Every instruction ends in one visible, recorded outcome:
 *   answered  a question; nothing changed
 *   applied   a state change made now (pause, priority, holds)
 *   queued    a change that applies on the next demo minute (amendments, assignments)
 *   declined  refused or unsupported; the text stays in the composer
 */

type Outcome = { state: AgentixState; intent: InstructionIntent; status: InstructionStatus; reply: string; links: ObjectRef[]; pending?: PendingChange; offer?: PendingChange }

/* Sentences joined from parts can end in "?." or ".."; a reply reads as written prose. */
const tidy = (text: string) => text.replace(/([?!])\.(?=\s|$)/g, "$1").replace(/(?<!\.)\.\.(?!\.)/g, ".")
const plain = (text: string) => text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim()
const QUESTION = /^(what|what's|whats|why|how|when|where|which|who|whose|is|are|was|were|does|do|did|can|could|would|should|will|has|have|may|might)\b/
const EXPLAIN = /^(explain|tell me|show me|describe|summari[sz]e|walk me through|help me understand|remind me)\b/
const NEGATION = /\b(don't|dont|do not|never|no need to|not now|stop asking)\b/
const NEGATED_START = /^(please )?(no,? )?(don't|dont|do not|never|no need to)\b/
const APPROVE = /\b(approve|authori[sz]e|sign[ -]off|green[ -]?light|go ahead and (release|deploy|approve)|release (it |this )?now|deploy (it |this )?now|push (it |this )?to prod(uction)?|ship it)\b/
const WIDEN = /\b(give (yourself|it|the agents?)|grant|more (access|permissions?)|admin (access|rights)|elevate|escalate (your )?(privileges|access)|bypass|skip (the )?(approval|checks?|tests?|policy|review))\b/
const REFERENCE = /\b([a-z]{2,6}-\d{1,6})\b/gi
// Politeness and timing words around a command don't change it: "pause it please", "pause this case now".
const TAIL = "(?: (?:now|right now|for now|for a (?:bit|moment|while)|please|thanks|thank you))*"
const OBJECT = "(?: (?:this|it|that|the))?(?: (?:work item|work|case|milestone|cycle|item|one|[a-z]{2,6}-\\d{1,6}))?"
const PAUSE = new RegExp(`^(?:please )?(?:pause|halt|suspend|stop working on)${OBJECT}${TAIL}$|^(?:please )?stop (?:this|it|that|the) (?:work item|work|case|milestone|cycle|item)${TAIL}$`)
const RESUME = new RegExp(`^(?:please )?(?:resume|continue|unpause|restart|carry on|carry on with)${OBJECT}${TAIL}$`)
const PRIORITY = /\b(prioriti[sz]e|expedite|fast[- ]track|rush|make (this|it) (a )?(high|top|urgent) priority|high priority)\b/
const HOLD_RELEASE = /\bhold (this |the )?release\b.*\b(window|saturday|agreed|02:00|until)\b|\bhold (this |the )?release\b$/
const STOP_RELEASE = /\b(stop|cancel|abort) (this |the )?release\b/
const HOLD_NOTIFY = /^(hold|pause|mute) (the |this |all |its |pending )*notifications?\b/
const RELEASE_NOTIFY = /^(release|resume|unhold|unmute|send) (the |this |all |its |held )*notifications?\b/
const INTAKE = /\b(pause|stop|halt) (the |new |all )*intake\b|\b(resume|restart|reopen) (the |new )*intake\b/
const CHANGE_WORDS = /^(please )?(add|change|remove|include|exclude|drop|rename|make|update|use only|use just|only use|switch|replace|show)\b/
const ASSIGN_WORDS = /^(please )?(also )?(take on|assign|start|begin|handle|reconcile|triage|onboard|review|run|process|investigate|backfill|look into)\b/

/* ---- Answers -------------------------------------------------------------- */
function failedChecks(state: AgentixState, engagementId: string, scope: ScopeRef) {
	const artifacts = state.artifacts.filter(artifact => artifact.engagementId === engagementId && (scope.kind === "engagement" || (scope.kind === "artifact" && artifact.id === scope.id) || (scope.kind === "work" && itemBy(state, scope.id)?.artifactIds.includes(artifact.id))))
	for (const artifact of artifacts) {
		const spec = artifactSpec(state, artifact)
		const failedVersion = [...artifact.versions].reverse().find(version => version.checks.some(check => check.status === "failed" || (check.detail && check.status === "invalidated")))
		if (!failedVersion || !spec) continue
		const failed = failedVersion.checks.filter(check => check.detail)
		const now = latest(artifact)
		const passed = now.checks.length && now.checks.every(check => check.status === "passed")
		const lines = failed.map(check => `${spec.checks.find(entry => entry.id === check.id)?.label ?? check.id}: ${check.detail}`)
		const scopeText = spec.checks.find(entry => entry.id === failed[0]?.id)?.scope.replace(/^Isolated test · /, "") ?? "isolated test"
		const after = now.version === failedVersion.version ? `Automatic repair ${now.source === "repair" ? "has run" : "is next, up to two attempts"}; nothing reaches production until every check passes.`
			: `${spec.title} v${now.version}${now.source === "repair" ? ` (${now.changes[0]?.toLowerCase() ?? "repaired"})` : ""} ${passed ? `passed all ${now.checks.length} checks` : "is being tested"}. A passed test isn't a production result.`
		return { text: `${artifact.title} v${failedVersion.version} failed ${failed.length} check${failed.length === 1 ? "" : "s"} in the isolated test (${scopeText}): ${lines.join(" ")} ${after}`, links: [{ kind: "artifact" as const, id: artifact.id }, { kind: "work" as const, id: artifact.workItemId }] }
	}
	return null
}

function itemStatus(state: AgentixState, item: WorkItem) {
	const status = statusOf(state, item)
	const met = item.obligations.filter(obligation => obligation.status === "met").length
	const release = item.releaseIds.map(id => state.releases.find(entry => entry.id === id)).filter((entry): entry is Release => !!entry).at(-1)
	const next = status.needsYou ? " It needs you: the decision is in the work area, and chat can't approve it." : ""
	return `${item.reference} · ${status.label}. ${itemSentence(state, item)}. ${met} of ${item.obligations.length} required outcomes evidenced.${release ? ` ${release.reference}: ${releaseSentence(state, release)}.` : ""}${next}`
}

function artifactStatus(state: AgentixState, artifactId: string) {
	const artifact = artifactBy(state, artifactId)!
	const version = latest(artifact)
	const passed = version.checks.filter(check => check.status === "passed").length
	const production = artifact.productionVersion ? `Production is on v${artifact.productionVersion}.` : "Nothing is in production yet."
	return `${artifact.title} v${version.version}: ${version.summary.toLowerCase()}. ${version.checks.length ? `${passed} of ${version.checks.length} checks passed${version.status === "testing" ? " so far" : ""}. ` : ""}${production}`
}

function engagementStatus(state: AgentixState, engagementId: string) {
	const engagement = state.engagements[engagementId]
	const waiting = needsYou(state, engagementId)
	const open = state.work.filter(item => item.engagementId === engagementId && !isTerminal(item)).length
	return `${presenceLine(state, engagement)}. ${open} open work item${open === 1 ? "" : "s"}.${waiting[0] ? ` First for you: ${waiting[0].title} (${waiting[0].detail}).` : " Nothing needs a decision from you right now."}`
}

function boundary(state: AgentixState, engagementId: string, scope: ScopeRef) {
	const scenario = scenarioOf(state, engagementId)
	if (scope.kind === "work") {
		const item = itemBy(state, scope.id)
		const owner = item ? templateOf(state, item)?.steps.find(step => step.owner !== "owner")?.owner : undefined
		const member = scenario.team.find(entry => entry.id === owner)
		if (item && isTerminal(item)) return `${item.reference} is ${statusOf(state, item).label.toLowerCase()}, so it can't change anything further. ${scenario.boundary}`
		return `${member ? `${member.name}: ${member.scope} ` : ""}${scenario.boundary}`
	}
	return scenario.boundary
}

function question(state: AgentixState, engagementId: string, scope: ScopeRef, text: string, original = text): Outcome {
	const answer = (reply: string, links: ObjectRef[] = []): Outcome => ({ state, intent: "question", status: "answered", reply, links })
	if (WIDEN.test(text)) return answer(WIDEN_REPLY)
	if (APPROVE.test(text)) {
		const open = needsYou(state, engagementId).find(item => item.decisionId && (scope.kind !== "work" || item.workId === scope.id))
		return answer(`I can't approve anything from chat.${open ? ` The open decision is “${open.title}”; decide it in its card.` : ""}`, open?.decisionId ? [{ kind: "decision", id: open.decisionId }] : [])
	}
	if (/\b(fail|failed|failing|failure|broke|broken)\b/.test(text)) {
		const found = failedChecks(state, engagementId, scope) ?? (scope.kind !== "engagement" ? failedChecks(state, engagementId, { kind: "engagement" }) : null)
		return found ? answer(found.text, found.links) : answer("No check has failed in this scope. Everything tested so far has passed, and nothing reaches production without passing.")
	}
	if (/\b(why|what).*\b(wait|waiting|blocked|stuck|holding)\b|\bwaiting (for|on)\b/.test(text) && scope.kind === "work") {
		const item = itemBy(state, scope.id)!
		return answer(`${item.reference}: ${itemSentence(state, item)}.${item.wait?.kind === "dependency" ? " It starts on its own once that's ready; other work continues." : ""}`, [{ kind: "work", id: item.id }])
	}
	if (/\b(allowed|permission|permitted|scope|boundar|authori[st]y|may it|can it change)\b/.test(text)) return answer(boundary(state, engagementId, scope))
	if (/\b(team|specialists?|who is|who's|how many agents|why (this|these) (agents?|team))\b/.test(text)) {
		const people = teamPresence(state, engagementId).map(entry => `${entry.member.name}: ${entry.sentence}.`).join(" ")
		return answer(`${scenarioOf(state, engagementId).teamReason} ${people}`)
	}
	if (/\brelease|deploy|production|live\b/.test(text)) {
		const releases = state.releases.filter(release => release.engagementId === engagementId && release.status !== "superseded" && (scope.kind === "engagement" || (scope.kind === "work" && release.workItemId === scope.id) || (scope.kind === "artifact" && release.artifactId === scope.id)))
		const last = releases.at(-1)
		return last ? answer(`${last.reference}: ${releaseSentence(state, last)}.`, [{ kind: "release", id: last.id }]) : answer("Nothing has been released in this scope yet. Tested versions release under your release policy.")
	}
	// A question that describes work or a change becomes an offer, never the work itself.
	const offer = scope.kind !== "work" ? amendmentFor(state, engagementId, scope, text) : null
	if (offer) {
		const artifact = artifactBy(state, offer.artifactId)!
		return { state, intent: "clarify", status: "answered", reply: `I can: ${offer.label.toLowerCase()} on the ${artifact.title.toLowerCase()} would make v${artifact.versions.length + 1}, retested before any release. Production stays as it is. Should I make that change?`, links: [{ kind: "artifact", id: artifact.id }], offer: { kind: "amend", artifactId: offer.artifactId, change: offer.id } }
	}
	const assignment = assignmentFor(state, engagementId, text, original)
	if (assignment) return { state, intent: "clarify", status: "answered", reply: `I can take that on as new work for the ${assignment.owner.toLowerCase()}: “${assignment.title}”. It would be its own work item in this engagement. Should I assign it?`, links: [], offer: { kind: "assign", template: assignment.template, title: assignment.title } }
	if (scope.kind === "work") return answer(itemStatus(state, itemBy(state, scope.id)!), [{ kind: "work", id: scope.id }])
	if (scope.kind === "artifact") return answer(artifactStatus(state, scope.id), [{ kind: "artifact", id: scope.id }])
	return answer(engagementStatus(state, engagementId))
}

const WIDEN_REPLY = "Authority can't be widened from chat. A broader scope or new permissions need a new review of the engagement (Details → Rules shows what it may do today). Nothing changed."

/* ---- Matching work and changes ------------------------------------------- */
function amendmentFor(state: AgentixState, engagementId: string, scope: ScopeRef, text: string) {
	const candidates = state.artifacts.filter(artifact => artifact.engagementId === engagementId && (scope.kind === "engagement" || (scope.kind === "artifact" && artifact.id === scope.id) || (scope.kind === "work" && itemBy(state, scope.id)?.artifactIds.includes(artifact.id))))
	for (const artifact of candidates) {
		const amendment = artifactSpec(state, artifact)?.amendments.find(entry => entry.pattern.test(text))
		if (amendment) return { artifactId: artifact.id, id: amendment.id, label: amendment.label }
	}
	return null
}

function assignmentFor(state: AgentixState, engagementId: string, text: string, original = text) {
	const scenario = SCENARIOS[state.engagements[engagementId].workflowId]
	const match = scenario.assignments.find(entry => entry.pattern.test(text))
	if (!match) return null
	// Titles come from what was typed, so names keep their capitals.
	return { template: match.template, title: match.title(original.trim()), owner: scenario.team.find(member => member.id === match.owner)?.name ?? "accountable agent" }
}

function releaseIn(state: AgentixState, engagementId: string, scope: ScopeRef): Release[] {
	const open = (release: Release) => release.engagementId === engagementId && !["applied", "verified", "superseded"].includes(release.status)
	if (scope.kind === "work") return state.releases.filter(release => open(release) && release.workItemId === scope.id)
	if (scope.kind === "artifact") return state.releases.filter(release => open(release) && release.artifactId === scope.id)
	return state.releases.filter(open)
}

/* ---- Interpretation ------------------------------------------------------ */
function interpret(state: AgentixState, engagementId: string, scope: ScopeRef, input: string): Outcome {
	const text = plain(input)
	const engagement = state.engagements[engagementId]
	const scenario = SCENARIOS[engagement.workflowId]
	const declined = (reply: string, links: ObjectRef[] = [], intent: InstructionIntent = "unsupported"): Outcome => ({ state, intent, status: "declined", reply, links })
	const applied = (next: AgentixState, reply: string, links: ObjectRef[] = []): Outcome => ({ state: next, intent: "steer", status: next === state ? "declined" : "applied", reply, links })

	const references = [...input.matchAll(REFERENCE)].map(match => match[1].toUpperCase())
	let scoped = scope.kind === "work" ? itemBy(state, scope.id) : undefined
	const named = references.map(reference => state.work.find(item => item.engagementId === engagementId && item.reference === reference)).find(item => !!item)
	const foreign = references.map(reference => state.work.find(item => item.engagementId === engagementId && item.reference === reference)).find(item => item && item.id !== scoped?.id)
	const bare = text.replace(/[.!]+$/, "")

	// A negated instruction changes nothing, even when it begins like a question ("do not pause…").
	if (NEGATED_START.test(bare)) return { state, intent: "question", status: "answered", reply: `Understood. Nothing changed${named ? `; ${named.reference} continues as it was` : ""}.`, links: named ? [{ kind: "work", id: named.id }] : [] }
	// Questions only read, so a question about a named item is answered about that item, whatever the scope.
	if (QUESTION.test(bare) || EXPLAIN.test(bare) || text.endsWith("?")) return question(state, engagementId, named ? { kind: "work", id: named.id } : scope, bare, input)
	// A change never leaks across a scoped conversation into other work.
	if (scoped && foreign) return declined(`That names ${foreign.reference}, but this conversation is about ${scoped.reference}. Nothing changed; open ${foreign.reference} to steer it.`, [{ kind: "work", id: foreign.id }], "refuse")
	if (scope.kind === "engagement" && foreign) { scope = { kind: "work", id: foreign.id }; scoped = foreign }
	if (NEGATION.test(bare)) return { state, intent: "question", status: "answered", reply: "Understood. Nothing changed.", links: [] }
	if (WIDEN.test(bare)) return declined(WIDEN_REPLY, [], "refuse")
	if (APPROVE.test(bare)) {
		const open = needsYou(state, engagementId).find(item => item.decisionId && (scope.kind !== "work" || item.workId === scope.id))
		return declined(`I can't approve or release from chat. Decisions stay with you in their card${open ? `: “${open.title}”` : ""}. Nothing changed.`, open?.decisionId ? [{ kind: "decision", id: open.decisionId }] : [], "refuse")
	}

	// Releases
	if (HOLD_RELEASE.test(text) || STOP_RELEASE.test(text)) {
		const releases = releaseIn(state, engagementId, scope)
		if (!releases.length) return declined("There's no release waiting in this scope to hold or stop. Applied releases can't be undone from chat. Nothing changed.", [], "steer")
		if (releases.length > 1) return declined(`More than one release is waiting (${releases.map(release => release.reference).join(", ")}). Open the work item to hold or stop the one you mean. Nothing changed.`, releases.map(release => ({ kind: "release" as const, id: release.id })), "clarify")
		const release = releases[0]
		const stop = STOP_RELEASE.test(text)
		const next = actOnRelease(state, release.id, stop ? "stop" : "hold-window")
		const updated = next.releases.find(entry => entry.id === release.id)!
		const links: ObjectRef[] = [{ kind: "release", id: release.id }]
		if (next === state) {
			const why = release.status === "awaiting_approval" ? `${release.reference} still needs your approval, and chat can't give it. ${stop ? "To stop it, choose “Keep in test” on its card." : `To release it in the ${releaseWindowOf(state, release.engagementId).label} window, choose “Approve for ${releaseWindowOf(state, release.engagementId).label}” on its card.`}`
				: release.status === "stopped" || release.status === "declined" ? `${release.reference} was ${release.status === "stopped" ? "stopped" : "kept in test"}. ${stop ? "It's already not releasing." : `To release it, use “${release.authority === "approval" || release.status === "declined" ? "Request release again" : "Resume release"}” on its card; ${release.authority === "approval" ? "that asks for your approval again" : "it follows your release policy again"}.`}`
				: release.status === "blocked" && !stop ? `${release.reference} is blocked: release permission was lost. Restore permission first.`
				: release.status === "held" ? `${release.reference} is already held until ${releaseSentence(state, release).replace(/^Held (by you|by policy) until /, "")}.`
				: `${release.reference}: ${releaseSentence(state, release)}`
			return declined(`${why.replace(/\.$/, "")}. Nothing changed.`, links, "steer")
		}
		return applied(next, `${release.reference}: ${releaseSentence(next, updated).replace(/\.$/, "")}.${updated.status === "held" ? " It won't release before the window. Stopping it is still possible until then." : " The tested version is kept."}`, links)
	}

	// The work item in scope
	if (PAUSE.test(bare) || RESUME.test(bare)) {
		const pause = PAUSE.test(bare)
		if (!scoped) return declined(scope.kind === "artifact" ? `${pause ? "Pausing" : "Resuming"} applies to work, not to an artifact. Open the work item that owns it, or say “${pause ? "pause" : "resume"} intake” for the whole engagement. Nothing changed.` : `To ${pause ? "pause" : "resume"} one work item, open it or name it (for example “${pause ? "pause" : "resume"} INV-20843”). For the whole engagement, say “${pause ? "pause" : "resume"} intake”${pause ? "; admitted work keeps going" : ""}. Nothing changed.`, [], "steer")
		const next = actOnWork(state, scoped.id, pause ? "pause" : "resume")
		const decisionWait = scoped.status === "waiting" && scoped.wait?.kind === "decision"
		const reason = isTerminal(scoped) ? `${scoped.reference} is ${statusOf(state, scoped).label.toLowerCase()}, so there's nothing to ${pause ? "pause" : "resume"}.` : pause ? `${scoped.reference} is already paused.` : `${scoped.reference} isn't paused. ${itemSentence(state, scoped)}.${decisionWait ? " Chat can't approve it; decide in its card." : ""}`
		return applied(next, next === state ? `${reason} Nothing changed.` : pause ? `Paused ${scoped.reference} before its next action. Its progress is kept and other work continues. Pausing doesn't recall anything already done.` : `Resumed ${scoped.reference} from its checkpoint.`, [{ kind: "work", id: scoped.id }])
	}
	if (PRIORITY.test(text)) {
		if (!scoped) return declined("Priority applies to one work item at a time. Open it, or name it (for example “prioritize INV-20843”). Nothing changed.", [], "steer")
		const next = actOnWork(state, scoped.id, "prioritize")
		return applied(next, next === state ? `${scoped.reference} ${isTerminal(scoped) ? "is finished, so priority no longer applies" : "is already high priority"}. Nothing changed.` : `${scoped.reference} is now high priority: it's admitted ahead of normal work. Its authority is unchanged. ${itemSentence(next, itemBy(next, scoped.id)!)}.`, [{ kind: "work", id: scoped.id }])
	}
	if (HOLD_NOTIFY.test(text) || RELEASE_NOTIFY.test(text)) {
		const hold = HOLD_NOTIFY.test(text)
		if (scoped) {
			const next = actOnWork(state, scoped.id, hold ? "hold" : "release-hold")
			return applied(next, next === state ? `${scoped.reference} ${hold ? "has its notification held already or has finished" : "has no hold of its own"}.${!hold && engagement.holdNotifications ? " Notifications are held for the whole engagement; release them there." : ""} Nothing changed.` : hold ? `Held ${scoped.reference}'s notification. It stays incomplete until you release it; completed sends can't be recalled.` : `Released ${scoped.reference}'s notification hold.${engagement.holdNotifications ? " The engagement-wide hold still applies." : ""}`, [{ kind: "work", id: scoped.id }])
		}
		const next = actOnEngagement(state, engagementId, hold ? "hold-notifications" : "release-notifications")
		return applied(next, next === state ? `Notifications ${hold ? "are already held" : "aren't held"} for this engagement. Nothing changed.` : hold ? "Held outbound notifications for this engagement. Affected work stays incomplete until you release them." : "Released the engagement's notification hold. Case-specific holds stay.")
	}
	if (INTAKE.test(text)) {
		const pause = /\b(pause|stop|halt)\b/.test(text)
		const next = actOnEngagement(state, engagementId, pause ? "pause-intake" : "resume-intake")
		return applied(next, next === state ? pause ? "Intake isn't active, so there's nothing to pause. Nothing changed." : engagement.status === "active" ? "Intake is already active." : "Intake can't resume until the connection check passes. Nothing changed." : pause ? "Paused intake. Admitted work and milestones continue; nothing already done is recalled." : "Resumed intake.")
	}

	// Changes to what the agents produced
	const amendment = amendmentFor(state, engagementId, scope, text)
	if (amendment) {
		const artifact = artifactBy(state, amendment.artifactId)!
		return { state, intent: "amend", status: "queued", pending: { kind: "amend", artifactId: artifact.id, change: amendment.id }, reply: `Queued: ${amendment.label.toLowerCase()} on the ${artifact.title.toLowerCase()}. It becomes v${artifact.versions.length + 1} on the next demo minute and is retested before any release.${artifact.productionVersion ? ` Production stays on v${artifact.productionVersion}.` : ""}`, links: [{ kind: "artifact", id: artifact.id }] }
	}
	if (CHANGE_WORDS.test(text)) {
		const target = scope.kind === "artifact" ? artifactBy(state, scope.id) : state.artifacts.find(artifact => artifact.engagementId === engagementId && text.includes(artifact.key))
		const supported = target ? artifactSpec(state, target)?.amendments.map(entry => `“${entry.label.toLowerCase()}”`) ?? [] : []
		return declined(target ? `I can't make that change to the ${target.title.toLowerCase()}.${supported.length ? ` Supported here: ${supported.join(", ")}.` : " It has no changes I can apply."} Your instruction is kept in the composer; nothing changed.` : `I can't make that change here. Changes are made to a specific result; open it in Results to see what's supported. Your instruction is kept; nothing changed.`, target ? [{ kind: "artifact", id: target.id }] : [])
	}

	// New work for a deployed specialist
	const assignment = assignmentFor(state, engagementId, text, input)
	if (assignment && ASSIGN_WORDS.test(text)) {
		if (engagement.status === "draft") return declined(`${engagement.name} isn't active yet. Activate it first; your instruction is kept.`, [], "assign")
		return { state, intent: "assign", status: "queued", pending: { kind: "assign", template: assignment.template, title: assignment.title }, reply: `Queued: “${assignment.title}” for the ${assignment.owner.toLowerCase()}. It becomes its own work item on the next demo minute. The deployed team takes it; nothing is rebuilt.`, links: [] }
	}

	const can = scope.kind === "work" ? "pause or resume it, prioritize it, hold its notification or release, or explain it" : scope.kind === "artifact" ? `request a supported change${artifactSpec(state, artifactBy(state, scope.id)!)?.amendments.length ? "" : " (this one has none scripted)"}, or explain its checks` : `pause intake, hold notifications, assign ${scenario.assignments.length ? "supported new work" : "work"} or explain what's happening`
	return declined(`I can't do that here. In this scope I can ${can}. Your instruction is kept in the composer; nothing changed.`)
}

function scopeIn(state: AgentixState, engagementId: string, scope: ScopeRef): ScopeRef {
	if (scope.kind === "work" && itemBy(state, scope.id)?.engagementId === engagementId) return scope
	if (scope.kind === "artifact" && artifactBy(state, scope.id)?.engagementId === engagementId) return scope
	return { kind: "engagement" }
}

export function sendInstruction(state: AgentixState, engagementId: string, requested: ScopeRef, input: string): AgentixState {
	const text = input.trim().slice(0, 2000)
	if (!text || !state.engagements[engagementId]) return state
	const scope = scopeIn(state, engagementId, requested)
	const outcome = interpret(state, engagementId, scope, text)
	return produce(outcome.state, draft => {
		draft.seq++
		const id = `m-${draft.seq}`
		draft.messages.push({ id, engagementId, scope, role: "owner", text, at: draft.clock, instruction: { intent: outcome.intent, status: outcome.status, pending: outcome.pending, links: outcome.links } })
		post(draft, engagementId, scope, tidy(outcome.reply), outcome.links)
		if (outcome.offer) draft.messages[draft.messages.length - 1].offer = outcome.offer
		// A declined instruction stays in the composer so it can be edited; anything else clears it.
		const key = scopeKey(engagementId, scope)
		if (outcome.status === "declined") draft.drafts[key] = text
		else delete draft.drafts[key]
		if (outcome.status !== "answered") draft.events.push({ id: `ev-${++draft.seq}`, at: draft.clock, engagementId, workItemId: scope.kind === "work" ? scope.id : undefined, artifactId: scope.kind === "artifact" ? scope.id : undefined, actor: "owner", kind: "instruction", text: `Instruction ${outcome.status}: “${text.length > 90 ? `${text.slice(0, 87)}…` : text}”`, tone: outcome.status === "declined" ? "neutral" : "live" })
	})
}

/* The owner explicitly accepts an offer the agent made in answer to a question. */
export function acceptOffer(state: AgentixState, messageId: string): AgentixState {
	const message = state.messages.find(entry => entry.id === messageId)
	if (!message?.offer) return state
	const offer = message.offer
	return produce(state, draft => {
		const target = draft.messages.find(entry => entry.id === messageId)!
		target.offer = undefined
		draft.seq++
		const label = offer.kind === "amend" ? `Yes, make that change.` : `Yes, assign “${offer.title}”.`
		draft.messages.push({ id: `m-${draft.seq}`, engagementId: message.engagementId, scope: message.scope, role: "owner", text: label, at: draft.clock, instruction: { intent: offer.kind === "amend" ? "amend" : "assign", status: "queued", pending: offer, links: offer.kind === "amend" ? [{ kind: "artifact", id: offer.artifactId }] : [] } })
		post(draft, message.engagementId, message.scope, offer.kind === "amend" ? "Queued. It applies on the next demo minute." : "Queued. It becomes its own work item on the next demo minute.")
	})
}

export const describeDecision = (state: AgentixState, id: string) => { const decision = decisionBy(state, id); return decision ? decisionTitle(state, decision) : "" }
