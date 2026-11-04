import { useState } from "react"

import { TextButton } from "@/design/primitives"
import { Select } from "@/features/organization/shared"
import { CommitDialog, type Fact } from "./CommitDialog"
import {
	agreementEndLabel,
	clockLabel,
	draftProblems,
	MODULE_DETAIL,
	MODULE_LABEL,
	moduleList,
	normalizedName,
	OWNER_BINDING_MINUTES,
	packageFor,
	PACKAGES,
	RELEASE,
	resolveSetupCode,
	SETUP_CODE_MINUTES,
	unitsLabel,
	type FirstOwnerIdentity,
	type ModuleKey,
	type Receipt,
	type TenantDraft,
	type TenantState,
} from "./model"
import { createTenant, issueSetupCode, replaceOwnerBinding, useAdmin } from "./store"

const identityFacts = (identity: FirstOwnerIdentity): Fact[] => [
	{ label: "Global user", value: identity.globalUser },
	{ label: "Issuer", value: identity.issuer },
	{ label: "Subject", value: identity.subject },
	{ label: "Directory (tid)", value: identity.tid },
	{ label: "Object (oid)", value: identity.oid },
]

/*
 * The first Owner's only identifier (IAM-2). The person signs in and issues a one-use code in their
 * own session; staff enter it here and read back who it resolves to. There is deliberately no email
 * or name field: staff never look anyone up.
 */
function SetupCodeField({ id, code, error, onChange }: { id: string; code: string; error: string | null; onChange: (code: string) => void }) {
	const hintId = `${id}-hint`
	return (
		<div className="ds-field">
			<label htmlFor={id}>Setup code</label>
			<input id={id} className="ds-input" autoComplete="off" spellCheck={false} maxLength={64} value={code} aria-invalid={Boolean(error)} aria-describedby={hintId} onChange={(event) => onChange(event.target.value)} />
			<small id={hintId}>{error ?? `The person issues this from their own session and gives it to you. It works once, for ${SETUP_CODE_MINUTES} minutes.`}</small>
			<TextButton className="adm-simulate" onClick={() => onChange(issueSetupCode())}>Issue a simulated code</TextButton>
		</div>
	)
}

const fieldError = (value: string, problem?: string) => value.length ? problem : undefined

export function NewTenantChange({ tenants, onClose, onCreated }: { tenants: TenantState[]; onClose: () => void; onCreated: (tenantId: string, receipt: Receipt) => void }) {
	const { setupCodes } = useAdmin()
	const [draft, setDraft] = useState<TenantDraft>(() => ({ name: "", onboardingReference: "", packageName: PACKAGES[0].name, seats: String(PACKAGES[0].seats), allowance: String(PACKAGES[0].allowance), modules: { ...PACKAGES[0].modules }, agreementEnd: "" }))
	const [code, setCode] = useState("")
	const [refused, setRefused] = useState<string | null>(null)
	const set = (patch: Partial<TenantDraft>) => setDraft((current) => ({ ...current, ...patch }))
	const pack = packageFor(draft.packageName)
	const problems = draftProblems(draft, tenants)
	const resolved = code.trim() ? resolveSetupCode(setupCodes, code) : null
	const codeError = refused ?? (resolved && !resolved.ok ? resolved.error : null)
	const identity = resolved?.ok ? resolved.entry.identity : null
	const firstProblem = problems.name ?? problems.onboardingReference ?? (identity ? null : "Add a setup code that resolves to a person") ?? null
	const notReady = firstProblem ?? problems.seats ?? problems.allowance ?? problems.modules ?? problems.agreementEnd ?? ""
	const seats = problems.seats ? null : Number.parseInt(draft.seats, 10)
	const seatsDelta = seats === null ? 0 : seats - pack.seats
	const allowance = problems.allowance ? null : Number.parseInt(draft.allowance, 10)
	const moduleOverrides = (Object.keys(MODULE_LABEL) as ModuleKey[]).filter((key) => draft.modules[key] !== pack.modules[key])
	return (
		<CommitDialog title="New tenant" description="Creates the organization, its agreement and the binding for its first Owner. The tenant starts Pending setup, and nothing is granted beyond what you enter here." ready={!notReady} notReady={notReady}
			summary={[
				{ label: "Organization", after: problems.name ? "Not set" : normalizedName(draft.name) },
				{ label: "Lifecycle", after: "Pending setup" },
				{ label: "Agreement", after: `Draft, version 1 · ${pack.name}` },
				{ label: "Seats", after: seats === null ? "Not set" : String(seats) },
				{ label: "Modules", after: moduleList(draft.modules) },
				{ label: "Usage allowance", after: allowance === null ? "Not set" : `${unitsLabel(allowance)} units` },
			]}
			warning={identity ? undefined : "Nothing is committed until a setup code resolves to one person and you've read who that is."}
			facts={[
				...(identity ? identityFacts(identity) : [{ label: "First Owner", value: "Resolved from the setup code. Nobody is looked up by name or email." }]),
				...(resolved?.ok ? [{ label: "Code expires", value: clockLabel(resolved.expiresAt) }] : []),
				{ label: "Inherited", value: `${pack.seats} seats, ${unitsLabel(pack.allowance)} units and ${moduleList(pack.modules)} from ${pack.name} (package revision ${pack.revision})` },
				{ label: "Override", value: seatsDelta === 0 && !moduleOverrides.length ? "None: the package values apply" : [seatsDelta ? `${seatsDelta > 0 ? "+" : ""}${seatsDelta} seats` : "", ...moduleOverrides.map((key) => `${MODULE_LABEL[key]} ${draft.modules[key] ? "granted" : "not granted"}`)].filter(Boolean).join(", ") + (problems.agreementEnd ? "" : ` until ${agreementEndLabel(draft.agreementEnd)}`) },
				{ label: "Charging mode", value: "Not selected. It's set on the agreement, which stays a draft until then." },
				{ label: "Model routes", value: "None granted. Publish them for each module before new work can start." },
				{ label: "After publishing", value: `The code is used up. The person has ${OWNER_BINDING_MINUTES} minutes to activate from their own session, and their seat is taken then. Share only the organization's activation page; it grants nothing by itself.` },
				{ label: "Revision", value: `New tenant at revision 1, checked against the ${RELEASE} release manifest` },
			]}
			onPublish={(reason, ticket) => {
				const result = createTenant(draft, code, reason, ticket)
				if (result.ok) onCreated(result.tenantId, result.receipt)
				else setRefused(result.error)
			}}
			onClose={onClose}>
			<div className="adm-form-group">
				<h3>Organization</h3>
				<div className="adm-commit-fields">
					<div className="ds-field">
						<label htmlFor="tenant-name">Organization name</label>
						<input id="tenant-name" className="ds-input" maxLength={160} value={draft.name} aria-invalid={Boolean(fieldError(draft.name, problems.name))} onChange={(event) => set({ name: event.target.value })} />
						{fieldError(draft.name, problems.name) ? <small>{problems.name}</small> : null}
					</div>
					<div className="ds-field">
						<label htmlFor="tenant-reference">Onboarding reference</label>
						<input id="tenant-reference" className="ds-input" maxLength={128} value={draft.onboardingReference} placeholder="For example ONB-1042" onChange={(event) => set({ onboardingReference: event.target.value })} />
					</div>
				</div>
			</div>
			<div className="adm-form-group">
				<h3>First Owner</h3>
				<SetupCodeField id="tenant-setup-code" code={code} error={codeError} onChange={(next) => { setRefused(null); setCode(next) }} />
			</div>
			<div className="adm-form-group">
				<h3>Agreement</h3>
				<div className="ds-field">
					<label htmlFor="tenant-package">Package</label>
					<Select id="tenant-package" className="is-field" value={draft.packageName} onChange={(event) => { const next = packageFor(event.target.value); set({ packageName: next.name, seats: String(next.seats), allowance: String(next.allowance), modules: { ...next.modules } }) }}>
						{PACKAGES.map((item) => <option key={item.name}>{item.name}</option>)}
					</Select>
				</div>
				<div className="adm-commit-fields">
					<div className="ds-field">
						<label htmlFor="tenant-seats">Seats</label>
						<input id="tenant-seats" className="ds-input" inputMode="numeric" maxLength={6} value={draft.seats} aria-invalid={Boolean(problems.seats)} onChange={(event) => set({ seats: event.target.value.replace(/\D/g, "") })} />
						{problems.seats ? <small>{problems.seats}</small> : null}
					</div>
					<div className="ds-field">
						<label htmlFor="tenant-allowance">Usage allowance (units)</label>
						<input id="tenant-allowance" className="ds-input" inputMode="numeric" maxLength={9} value={draft.allowance} aria-invalid={Boolean(problems.allowance)} onChange={(event) => set({ allowance: event.target.value.replace(/\D/g, "") })} />
						{problems.allowance ? <small>{problems.allowance}</small> : null}
					</div>
				</div>
				<div className="ds-field">
					<label htmlFor="tenant-end">Agreement ends</label>
					<input id="tenant-end" className="ds-input" type="date" value={draft.agreementEnd} aria-invalid={Boolean(fieldError(draft.agreementEnd, problems.agreementEnd))} onChange={(event) => set({ agreementEnd: event.target.value })} />
					{fieldError(draft.agreementEnd, problems.agreementEnd) ? <small>{problems.agreementEnd}</small> : null}
				</div>
				<fieldset className="org-choices adm-editor">
					<legend className="ds-label">Modules</legend>
					{(Object.keys(MODULE_LABEL) as ModuleKey[]).map((key) => (
						<label key={key} className="org-choice">
							<input type="checkbox" checked={draft.modules[key]} onChange={(event) => set({ modules: { ...draft.modules, [key]: event.target.checked } })} />
							<span><strong>{MODULE_LABEL[key]}{pack.modules[key] ? " (in the package)" : ""}</strong><small>{MODULE_DETAIL[key]}</small></span>
						</label>
					))}
					{problems.modules ? <small className="adm-blocker">{problems.modules}</small> : null}
				</fieldset>
			</div>
		</CommitDialog>
	)
}

/* A binding that expired, or was issued to the wrong person, is replaced with a new code and a new confirmation. */
export function ReplaceOwnerChange({ tenant, onClose, onPublished }: { tenant: TenantState; onClose: () => void; onPublished: (receipt: Receipt) => void }) {
	const { setupCodes } = useAdmin()
	const [code, setCode] = useState("")
	const [refused, setRefused] = useState<string | null>(null)
	const setup = tenant.setup!
	const resolved = code.trim() ? resolveSetupCode(setupCodes, code) : null
	const identity = resolved?.ok ? resolved.entry.identity : null
	const sameOwner = identity?.globalUser === setup.firstOwner.globalUser
	return (
		<CommitDialog title={`First Owner for ${tenant.name}`} description="A new code replaces the binding. The old binding stops working at once." ready={Boolean(identity)} notReady="Add a setup code that resolves to a person"
			summary={[{ label: "Binding", before: String(setup.bindingRevision), after: String(setup.bindingRevision + 1) }, { label: "Global user", before: setup.firstOwner.globalUser, after: identity?.globalUser ?? "Not set" }]}
			warning={identity && !sameOwner ? "This is a different person from the current binding. Check that the customer appointed them." : undefined}
			facts={[...(identity ? identityFacts(identity) : []), { label: "After publishing", value: `The code is used up, and the person has ${OWNER_BINDING_MINUTES} minutes to activate.` }, { label: "Revision", value: `${tenant.revision} → ${tenant.revision + 1}` }]}
			onPublish={(reason, ticket) => {
				const result = replaceOwnerBinding(tenant.id, code, reason, ticket)
				if (result.ok) { onPublished(result.receipt); onClose() }
				else setRefused(result.error)
			}}
			onClose={onClose}>
			<SetupCodeField id="replace-setup-code" code={code} error={refused ?? (resolved && !resolved.ok ? resolved.error : null)} onChange={(next) => { setRefused(null); setCode(next) }} />
		</CommitDialog>
	)
}
