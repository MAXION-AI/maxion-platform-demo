import { REVENUE_SCRIPT } from "./revenue"
import { S4HANA_SCRIPT } from "./s4hana"
import { SALESFORCE_SAP_SCRIPT } from "./salesforceSap"
import { SERVICENOW_SCRIPT } from "./servicenow"
import { SCENARIOS } from "@/features/discovery-autonomous/model"
import type { DemoId, DemoScript } from "./types"

export type { CallLine, DemoId, DemoScript, DemoStepCopy, DemoStepId, StakeholderCall } from "./types"
export { DEMO_STEP_ORDER } from "./types"

/*
 * Every customer demo the product can present. The address picks one (`?demo=<id>`); everything
 * else — storage, ownership, the presenter dock and the second-screen guide — reads the script.
 * Registering a script here is what makes its address a demo.
 */
export const DEMO_SCRIPTS: Record<DemoId, DemoScript> = {
	revenue: REVENUE_SCRIPT,
	servicenow: SERVICENOW_SCRIPT,
	"salesforce-sap": SALESFORCE_SAP_SCRIPT,
	s4hana: S4HANA_SCRIPT,
}

export const DEMO_IDS = Object.keys(DEMO_SCRIPTS) as DemoId[]
export const demoScript = (id: DemoId): DemoScript => DEMO_SCRIPTS[id]
export const isDemoId = (value: unknown): value is DemoId => typeof value === "string" && Object.hasOwn(DEMO_SCRIPTS, value)

/* A script filed under the wrong key would send the demo's storage and its guide to different places. */
for (const [key, script] of Object.entries(DEMO_SCRIPTS)) {
	if (script.id !== key) throw new Error(`Demo script "${script.id}" is registered as "${key}"`)
}

/* The call speaks one reply and records one fact per answer, and every call is with someone the Discovery mapped. */
for (const script of Object.values(DEMO_SCRIPTS)) {
	const people = SCENARIOS[script.scenarioKey].people.map(person => person.id)
	if (script.replies.length !== script.answers.length || script.heard.length !== script.answers.length) throw new Error(`Demo script "${script.id}": ${script.answers.length} answers, ${script.replies.length} replies, ${script.heard.length} facts`)
	for (const id of [...script.calls.map(call => call.person), ...script.conflict.between]) {
		if (!people.includes(id)) throw new Error(`Demo script "${script.id}" calls "${id}", who isn't in its Discovery`)
	}
}

/* The demo whose Discovery this is, when one is running for it. */
export const scriptForScenario = (scenarioKey: string, id: DemoId | undefined) => id && DEMO_SCRIPTS[id]?.scenarioKey === scenarioKey ? DEMO_SCRIPTS[id] : undefined
