import type { WorkflowId } from "@/features/agentix/prototype/initiatives"
import type { ScenarioKey } from "@/features/discovery-autonomous/model"

/*
 * A customer demo is a script: which Discovery starts it, which package it hands to Agentix,
 * which engagement Agentix creates from that package, and the twelve beats the presenter walks.
 * The harness (session, progress, the dock and the guide) reads only this shape, so a new demo
 * is a new script rather than a new code path.
 */

/*
 * The demos that exist. A demo is added here and registered in ./index in the same change —
 * the registry is typed `Record<DemoId, DemoScript>`, so an id without a script will not compile,
 * and an address naming anything else is simply not a demo.
 */
export type DemoId = "revenue" | "servicenow" | "salesforce-sap" | "s4hana"

/*
 * Every demo tells the same twelve-beat story, so the dock, the guide and the progress
 * reader stay one implementation: Discovery investigates and decides, the package is
 * approved and handed over, and an agent team is created from nothing, builds, is corrected
 * by a failing check, releases under policy, publishes, and then runs the work every morning.
 */
export type DemoStepId =
	| "start" | "interview" | "decision" | "package" | "handoff" | "proposal"
	| "mapping" | "pipeline" | "release" | "dashboard" | "cycle" | "close"

export type DemoStepCopy = {
	title: string
	/* What the presenter does, in the product's own words. */
	does: string
	/* What the presenter says while it happens. */
	says: string
}

export type DemoScript = {
	id: DemoId
	/* The sidebar row: "Revenue demo". */
	label: string
	/* The demo's subject, used in the guide's title and heading: "Revenue reconciliation". */
	name: string
	/* The dock's kicker, lower case: "Presenter · revenue demo". */
	kicker: string
	/* The Discovery template the presenter starts from. */
	templateName: string
	/* The Discovery this demo follows, and the package it hands to Agentix. */
	scenarioKey: ScenarioKey
	packageId: string
	/* The Agentix engagement the package creates. */
	engagementId: WorkflowId
	/*
	 * The variant prefix MS-1's decision writes onto the mapping artifact. Reading it is how the
	 * progress reader knows the presenter answered the specialist rather than merely opened the work.
	 */
	decisionVariant: string
	/*
	 * The policy the dashboard publishes under, named in the tenth beat's live detail.
	 * Each engagement has its own; the revenue demo's is not everyone's.
	 */
	publishPolicy: string
	/*
	 * How the setup names the Discovery a new one replaces: "replaces the earlier <this> Discovery".
	 * Written out rather than derived, so each demo reads the way a presenter would say it.
	 */
	replacesLabel: string
	/* What the presenter types during the owner interview, in order. */
	answers: readonly string[]
	charterReason: string
	handoffNote: string
	steps: Record<DemoStepId, DemoStepCopy>
}

export const DEMO_STEP_ORDER: DemoStepId[] = [
	"start", "interview", "decision", "package", "handoff", "proposal",
	"mapping", "pipeline", "release", "dashboard", "cycle", "close",
]
