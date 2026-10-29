import { CheckCircle, CircleNotch } from "@phosphor-icons/react"
import { useState, type ReactNode } from "react"

import { Button, Dialog } from "@/design/primitives"
import {
	ENFORCED_RULES,
	NETWORK_DETAIL,
	NETWORK_LABEL,
	NETWORK_LEVELS,
	TOOL_CLASS_LABEL,
	type ModelPolicy,
	type ModuleMode,
	type NetworkLevel,
	type Policy,
	type PolicySource,
	type ToolClass,
} from "./model"
import { publishPolicy, requestSection, useOrganization } from "./store"
import { ChangeSummary, FreshSignInNote, Select, SettingRow, useFreshSignIn } from "./shared"

/*
 * Policy is ADM-4's customer layer: MAXION grants a set, the organization may narrow it and never
 * widen it. Each row says its effective value, where it comes from, and what limits it. A change
 * previews the exact before and after with its effect on running work; widening needs a sign-in
 * in the last 15 minutes and narrowing doesn't. Publishing saves a revision and says so; it only
 * says "applied" once enforcement reports back.
 */

type Family = { kind: "module"; module: "discovery" | "agentix" } | { kind: "model"; id: string } | { kind: "research" } | { kind: "tools" } | { kind: "network" } | { kind: "integrations" }

const BLOCKED_EXAMPLES = ["pastebin.com", "transfer.sh", "anonfiles.com"]
const DOMAIN = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/
const sourceText = (source: PolicySource) => source.kind === "inherited" ? "Inherited from MAXION" : `Set by ${source.by} · ${source.at}`
const MODE_LABEL: Record<ModuleMode, string> = { normal: "Normal", read_only: "Read-only" }
const NETWORK_REASONS = ["Operational need", "Security or privacy review", "Customer agreement", "Correcting a mistake"]

export function PolicyTab() {
	const org = useOrganization()
	const policy = org.policy
	const [editing, setEditing] = useState<Family | null>(null)
	const status = org.policyStatus
	const researchValue = policy.research.mode === "on" ? "On" : policy.research.mode === "off" ? "Off" : `Only ${policy.research.domains.length} listed ${policy.research.domains.length === 1 ? "domain" : "domains"}`
	return (
		<>
			<p className="org-facts">
				<span>Revision <strong>{policy.revision}</strong></span>
				<span>Your organization can narrow what MAXION grants, never widen it.</span>
				{status ? (
					<span className={`org-status${status.state === "applied" ? " is-applied" : ""}`} role="status">
						{status.state === "applied" ? <CheckCircle weight="fill" aria-hidden="true" /> : <CircleNotch className="spin" aria-hidden="true" />}
						{status.label}: {status.state === "applied" ? "applied to new work" : "saved; enforcement not yet reported"}
					</span>
				) : null}
			</p>

			<PolicySection title="Modules" detail="Read-only keeps history, reads and export, and stops new paid work and external effects.">
				{(["discovery", "agentix"] as const).map((module) => (
					<SettingRow key={module} title={module === "discovery" ? "Discover" : "Agentix"} detail={sourceText(policy.modules[module].source)}>
						<span className="org-value">{MODE_LABEL[policy.modules[module].mode]}</span>
						<Button size="sm" aria-label={`Change ${module === "discovery" ? "Discover" : "Agentix"} mode`} onClick={() => setEditing({ kind: "module", module })}>Change</Button>
					</SettingRow>
				))}
			</PolicySection>

			<PolicySection title="Models" detail="MAXION qualifies each model; you choose among them. Running work keeps the model it started with.">
				{policy.models.map((model) => (
					<SettingRow key={model.id} title={`${model.module} · ${model.task}`} detail={`${sourceText(model.source)}${model.allowed.length < model.granted.length ? ` · ${model.granted.length - model.allowed.length} of MAXION's ${model.granted.length} turned off here` : ""}${model.notReady?.length ? ` · ${model.notReady.join(", ")} not ready yet` : ""}`}>
						<span className="org-value">{model.preferred}{model.allowed.length > 1 ? <small>{model.allowed.length} allowed</small> : null}</span>
						<Button size="sm" aria-label={`Change models for ${model.module} ${model.task}`} onClick={() => setEditing({ kind: "model", id: model.id })}>Change</Button>
					</SettingRow>
				))}
			</PolicySection>

			<PolicySection title="Discovery web research" detail={`Discovery reads public web sources and labels them as such. MAXION's blocked list of ${policy.research.blocked} domains always applies.`}>
				<SettingRow title="Web research" detail={`${sourceText(policy.research.source)} · applies from the next Discovery session`}>
					<span className="org-value">{researchValue}</span>
					<Button size="sm" aria-label="Change web research" onClick={() => setEditing({ kind: "research" })}>Change</Button>
				</SettingRow>
			</PolicySection>

			<PolicySection title="Agentix" detail="What agent teams may do, within what MAXION allows for your organization.">
				<SettingRow title="Tool classes" detail={sourceText(policy.tools.source)}>
					<span className="org-value">{policy.tools.allowed.length === policy.tools.granted.length ? `All ${policy.tools.granted.length}` : `${policy.tools.allowed.length} of ${policy.tools.granted.length}`}</span>
					<Button size="sm" aria-label="Change tool classes" onClick={() => setEditing({ kind: "tools" })}>Change</Button>
				</SettingRow>
				<SettingRow title="Sandbox network" detail={`${sourceText(policy.network.source)} · MAXION allows up to ${NETWORK_LABEL[policy.network.ceiling].toLowerCase()} · Owner only`}>
					<span className="org-value">{NETWORK_LABEL[policy.network.value]}</span>
					<Button size="sm" aria-label="Change sandbox network" onClick={() => setEditing({ kind: "network" })}>Change</Button>
				</SettingRow>
			</PolicySection>

			<PolicySection title="Rules enforced as controls" detail="Rules in Knowledge that must never be broken are also platform controls. They're set with MAXION; Knowledge links each one here.">
				{ENFORCED_RULES.map((rule) => (
					<SettingRow key={rule.control} title={rule.control} detail={`${rule.enforces} From the rule “${rule.knowledge}” · since ${rule.since}`}>
						<span className="org-value">Enforced</span>
						<Button size="sm" aria-label={`Open the rule behind ${rule.control}`} onClick={() => requestSection({ section: "knowledge" })}>Knowledge</Button>
					</SettingRow>
				))}
			</PolicySection>

			<PolicySection title="Integrations" detail="The most any connection may do. Each connection's owner can narrow it further.">
				<SettingRow title="What connections may do" detail={sourceText(policy.integrations.source)}>
					<span className="org-value">{policy.integrations.classes === "read" ? "Reads only" : "Reads and approved writes"}</span>
					<Button size="sm" aria-label="Change what connections may do" onClick={() => setEditing({ kind: "integrations" })}>Change</Button>
				</SettingRow>
			</PolicySection>

			{editing ? <PolicyEditor key={JSON.stringify(editing)} family={editing} policy={policy} onClose={() => setEditing(null)} /> : null}
		</>
	)
}

function PolicySection({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
	return (
		<section className="org-section" aria-label={title}>
			<div className="org-section-head"><div><h2>{title}</h2><p>{detail}</p></div></div>
			<div className="org-rows">{children}</div>
		</section>
	)
}

/* One editor for every family: its controls, then the exact change, then publish. */
function PolicyEditor({ family, policy, onClose }: { family: Family; policy: Policy; onClose: () => void }) {
	const { fresh } = useFreshSignIn()
	const model = family.kind === "model" ? policy.models.find((item) => item.id === family.id) as ModelPolicy : null
	const [mode, setMode] = useState<ModuleMode>(family.kind === "module" ? policy.modules[family.module].mode : "normal")
	const [allowed, setAllowed] = useState<string[]>(model?.allowed ?? [])
	const [preferred, setPreferred] = useState(model?.preferred ?? "")
	const [research, setResearch] = useState(policy.research.mode)
	const [domains, setDomains] = useState(policy.research.domains.join("\n"))
	const [tools, setTools] = useState<ToolClass[]>(policy.tools.allowed)
	const [network, setNetwork] = useState<NetworkLevel>(policy.network.value)
	const [reason, setReason] = useState("")
	const [classes, setClasses] = useState(policy.integrations.classes)
	const organization = (): PolicySource => ({ kind: "organization", by: "Root Admin", at: "Today" })

	const domainList = domains.split(/[\s,]+/).map((item) => item.trim().toLowerCase()).filter(Boolean)
	const domainError = research !== "allowlist" ? null
		: domainList.length === 0 ? "Add at least one domain, or turn research off."
			: domainList.find((item) => !DOMAIN.test(item)) ? `“${domainList.find((item) => !DOMAIN.test(item))}” isn't a domain, such as example.com.`
				: domainList.find((item) => BLOCKED_EXAMPLES.includes(item)) ? `${domainList.find((item) => BLOCKED_EXAMPLES.includes(item))} is on MAXION's blocked list.`
					: domainList.length > 64 ? "List 64 domains or fewer." : null

	const spec = (() => {
		if (family.kind === "module") {
			const name = family.module === "discovery" ? "Discover" : "Agentix"
			const before = policy.modules[family.module].mode
			return {
				title: `${name} mode`, label: `${name} mode`, changed: mode !== before, needsFresh: before === "read_only" && mode === "normal",
				rows: [{ label: name, before: MODE_LABEL[before], after: MODE_LABEL[mode] }],
				effect: mode === "read_only" ? `Running ${name} work pauses at its next safe point. History, reads and export stay available.` : `New ${name} work can start again. Paused work resumes through its owner, never by replaying.`,
				apply: (current: Policy): Policy => ({ ...current, modules: { ...current.modules, [family.module]: { mode, source: organization() } } }),
				controls: (
					<fieldset className="org-choices">
						<legend className="ds-label">Mode</legend>
						{(["normal", "read_only"] as const).map((option) => <label key={option} className="org-choice"><input type="radio" name="module-mode" checked={mode === option} onChange={() => setMode(option)} /><span><strong>{MODE_LABEL[option]}</strong><small>{option === "normal" ? "Work runs as MAXION and your organization allow." : "No new paid generation, activation or external effects."}</small></span></label>)}
					</fieldset>
				),
			}
		}
		if (family.kind === "model" && model) {
			const added = allowed.filter((item) => !model.allowed.includes(item))
			const changedPreferred = preferred !== model.preferred
			return {
				title: `${model.module} models`, label: `${model.module} models`, changed: changedPreferred || allowed.length !== model.allowed.length || added.length > 0, needsFresh: added.length > 0 || changedPreferred,
				rows: [
					{ label: "Task", after: `${model.module} · ${model.task}` },
					{ label: "Allowed", before: model.allowed.join(", "), after: allowed.join(", ") || "None" },
					{ label: "Preferred", before: model.preferred, after: preferred || "None" },
				],
				effect: "New work uses the preferred model. Running work keeps the model it started with; a model you turn off isn't swapped silently.",
				apply: (current: Policy): Policy => ({ ...current, models: current.models.map((item) => item.id === model.id ? { ...item, allowed, preferred, source: organization() } : item) }),
				invalid: allowed.length === 0 ? "Keep at least one model, or put the module in read-only mode." : null,
				controls: (
					<>
						<fieldset className="org-choices">
							<legend className="ds-label">Allowed models</legend>
							{model.granted.map((option) => <label key={option} className="org-choice"><input type="checkbox" checked={allowed.includes(option)} onChange={() => { const next = allowed.includes(option) ? allowed.filter((item) => item !== option) : [...allowed, option]; setAllowed(next); if (!next.includes(preferred)) setPreferred(next[0] ?? "") }} /><span><strong>{option}</strong><small>Qualified by MAXION for this task</small></span></label>)}
							{(model.notReady ?? []).map((option) => <label key={option} className="org-choice is-disabled"><input type="checkbox" disabled checked={false} onChange={() => undefined} /><span><strong>{option}</strong><small>Granted by MAXION, not ready in production yet</small></span></label>)}
						</fieldset>
						<div className="ds-field"><label htmlFor="model-preferred">Preferred</label><Select id="model-preferred" className="is-field" value={preferred} onChange={(event) => setPreferred(event.target.value)}>{allowed.map((option) => <option key={option}>{option}</option>)}</Select></div>
					</>
				),
			}
		}
		if (family.kind === "research") {
			const before = policy.research.mode
			const label = (value: typeof research) => value === "on" ? "On" : value === "off" ? "Off" : `Only listed domains (${domainList.length})`
			return {
				title: "Discovery web research", label: "Web research", changed: research !== before || (research === "allowlist" && domainList.join() !== policy.research.domains.join()), needsFresh: (before === "off" && research !== "off") || (before === "allowlist" && research === "on") || (research === "allowlist" && domainList.some((item) => !policy.research.domains.includes(item))),
				rows: [{ label: "Web research", before: before === "allowlist" ? `Only listed domains (${policy.research.domains.length})` : label(before), after: label(research) }],
				effect: `Applies from the next Discovery session; running sessions keep their setting. MAXION's blocked list of ${policy.research.blocked} domains always applies.`,
				apply: (current: Policy): Policy => ({ ...current, research: { ...current.research, mode: research, domains: research === "allowlist" ? domainList : [], source: organization() } }),
				invalid: domainError,
				controls: (
					<>
						<fieldset className="org-choices">
							<legend className="ds-label">Web research</legend>
							<label className="org-choice"><input type="radio" name="research" checked={research === "on"} onChange={() => setResearch("on")} /><span><strong>On</strong><small>Public sources, labelled as public wherever they appear.</small></span></label>
							<label className="org-choice"><input type="radio" name="research" checked={research === "allowlist"} onChange={() => setResearch("allowlist")} /><span><strong>Only listed domains</strong><small>Discovery may read only the domains you list.</small></span></label>
							<label className="org-choice"><input type="radio" name="research" checked={research === "off"} onChange={() => setResearch("off")} /><span><strong>Off</strong><small>Discovery works from your sources and interviews only.</small></span></label>
						</fieldset>
						{research === "allowlist" ? (
							<div className="ds-field">
								<label htmlFor="research-domains">Domains</label>
								<textarea id="research-domains" className="ds-textarea" rows={3} value={domains} placeholder={"sec.gov\nifrs.org"} aria-invalid={Boolean(domainError)} aria-describedby="research-domains-hint" onChange={(event) => setDomains(event.target.value)} />
								<small id="research-domains-hint" className={domainError ? "org-error" : undefined}>{domainError ?? "One per line, up to 64."}</small>
							</div>
						) : null}
					</>
				),
			}
		}
		if (family.kind === "tools") {
			const added = tools.filter((item) => !policy.tools.allowed.includes(item))
			const removed = policy.tools.allowed.filter((item) => !tools.includes(item))
			return {
				title: "Agentix tool classes", label: "Tool classes", changed: added.length + removed.length > 0, needsFresh: added.length > 0,
				rows: [{ label: "Allowed", before: `${policy.tools.allowed.length} classes`, after: `${tools.length} classes` }, ...(removed.length ? [{ label: "Turned off", after: removed.map((item) => TOOL_CLASS_LABEL[item]).join(", ") }] : []), ...(added.length ? [{ label: "Turned on", after: added.map((item) => TOOL_CLASS_LABEL[item]).join(", ") }] : [])],
				effect: "Agent designs that need a class you turn off are flagged for review. Nothing running gains a class from this change.",
				apply: (current: Policy): Policy => ({ ...current, tools: { ...current.tools, allowed: tools, source: organization() } }),
				invalid: tools.length === 0 ? "Keep at least one class, or put Agentix in read-only mode." : null,
				controls: (
					<fieldset className="org-choices">
						<legend className="ds-label">Allowed</legend>
						{policy.tools.granted.map((option) => <label key={option} className="org-choice"><input type="checkbox" checked={tools.includes(option)} onChange={() => setTools((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option])} /><span><strong>{TOOL_CLASS_LABEL[option]}</strong></span></label>)}
					</fieldset>
				),
			}
		}
		if (family.kind === "network") {
			const before = policy.network.value
			const ceilingIndex = NETWORK_LEVELS.indexOf(policy.network.ceiling)
			return {
				// Owner only: any change to the ceiling, either way, needs a fresh sign-in and a reason (ADM-4).
				title: "Agentix sandbox network", label: "Sandbox network", changed: network !== before, needsFresh: network !== before,
				rows: [{ label: "Most open setting", before: NETWORK_LABEL[before], after: NETWORK_LABEL[network] }, { label: "MAXION allows", after: `Up to ${NETWORK_LABEL[policy.network.ceiling].toLowerCase()}` }],
				effect: NETWORK_LEVELS.indexOf(network) < NETWORK_LEVELS.indexOf(before) ? "A running sandbox above the new setting saves a checkpoint and restarts under it." : "Raising it never widens a running session; it applies to the next case that asks.",
				apply: (current: Policy): Policy => ({ ...current, network: { ...current.network, value: network, source: organization() } }),
				invalid: network !== before && !reason ? "Choose a reason." : null,
				controls: (
					<>
						<fieldset className="org-choices">
							<legend className="ds-label">Most open setting a design may use</legend>
							{NETWORK_LEVELS.map((option, index) => (
								<label key={option} className={`org-choice${index > ceilingIndex ? " is-disabled" : ""}`}>
									<input type="radio" name="network" checked={network === option} disabled={index > ceilingIndex} onChange={() => setNetwork(option)} />
									<span><strong>{NETWORK_LABEL[option]}</strong><small>{index > ceilingIndex ? `MAXION doesn't allow this for your organization.` : NETWORK_DETAIL[option]}</small></span>
								</label>
							))}
						</fieldset>
						<div className="ds-field"><label htmlFor="network-reason">Reason</label><Select id="network-reason" className="is-field" value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Choose a reason</option>{NETWORK_REASONS.map((option) => <option key={option}>{option}</option>)}</Select></div>
					</>
				),
			}
		}
		const before = policy.integrations.classes
		return {
			title: "What connections may do", label: "Integration classes", changed: classes !== before, needsFresh: before === "read" && classes === "read_write",
			rows: [{ label: "Connections may", before: before === "read" ? "Read" : "Read and write", after: classes === "read" ? "Read" : "Read and write" }],
			effect: classes === "read" ? "Writes stop at every connection's next use. Each connection keeps its own setting for later." : "Connections whose owner allowed writes can ask to write again, each write with its approval.",
			apply: (current: Policy): Policy => ({ ...current, integrations: { classes, source: organization() } }),
			controls: (
				<fieldset className="org-choices">
					<legend className="ds-label">Connections may</legend>
					<label className="org-choice"><input type="radio" name="integration-classes" checked={classes === "read_write"} onChange={() => setClasses("read_write")} /><span><strong>Read and write</strong><small>Writes still need the connection owner's choice and each write's approval.</small></span></label>
					<label className="org-choice"><input type="radio" name="integration-classes" checked={classes === "read"} onChange={() => setClasses("read")} /><span><strong>Read only</strong><small>No connection can write, whatever its own setting.</small></span></label>
				</fieldset>
			),
		}
	})()

	const invalid = "invalid" in spec ? spec.invalid : null
	const blocked = !spec.changed || Boolean(invalid) || (spec.needsFresh && !fresh)
	return (
		<Dialog
			open
			size="lg"
			title={`Change ${spec.title.replace(/^What/, "what")}`}
			description="Preview the exact change before it's published to your organization."
			onClose={onClose}
			footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={blocked} onClick={() => { publishPolicy(spec.label, spec.apply); onClose() }}>Publish change</Button></>}>
			{spec.controls}
			{spec.changed ? <ChangeSummary rows={spec.rows} /> : <p className="org-note">Nothing has changed yet.</p>}
			{spec.changed ? <p className="org-note">{spec.effect}</p> : null}
			{invalid && spec.changed ? <p className="org-error" role="alert">{invalid}</p> : null}
			{spec.needsFresh ? <FreshSignInNote /> : spec.changed ? <p className="org-fresh">Narrowing access doesn't need a fresh sign-in.</p> : null}
		</Dialog>
	)
}
