import { REVENUE_SCRIPT } from "./revenue"
import { S4HANA_SCRIPT } from "./s4hana"
import { SALESFORCE_SAP_SCRIPT } from "./salesforceSap"
import { SERVICENOW_SCRIPT } from "./servicenow"
import type { DemoId, DemoScript } from "./types"

export type { DemoId, DemoScript, DemoStepCopy, DemoStepId } from "./types"
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
