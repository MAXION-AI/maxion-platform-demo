# MAXION Platform Demo

A self-contained functional frontend prototype for the unified MAXION platform experience.

Hosted demo: [https://maxion-ai.github.io/maxion-platform-demo/](https://maxion-ai.github.io/maxion-platform-demo/)

The prototype mirrors the current MAXION portal shell and connects the product modules in one persistent workspace:

- Dashboard — workspace activity, project status, quick actions, and connected-system context
- Projects — searchable project library, creation, details, membership, and archive states
- Discovery — autonomous inquiry, interviews, evidence, exceptions, and verified packages
- Agentix — deployed agents with ongoing intake, concurrent cases, scoped steering, readiness/repair and verified outcomes
- Consult MAX — cross-platform explanation and routing
- Integrations — Nango, Merge Unified API, and native connection management with scopes and access history

The sidebar, account surfaces, responsive drawer, MAXION lockup, and spiral geometry use the current portal patterns and brand assets. A Discovery's package goes straight to Agentix, which builds, releases and runs the work; Plan and Execute are disabled and unreachable, and their code stays only so restoring their navigation entries would bring them back.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:4317/maxion-prototype](http://127.0.0.1:4317/maxion-prototype).

The legacy Agentix prototype URL remains available at [http://127.0.0.1:4317/agentix-prototype](http://127.0.0.1:4317/agentix-prototype) and opens the unified shell with Agentix selected.

The complete autonomous Discovery experience is also available directly at [http://127.0.0.1:4317/discovery-prototype](http://127.0.0.1:4317/discovery-prototype). The same experience is embedded intact inside the Discovery module of the unified shell.

## Customer demos

Each demo runs one story end to end, from a new Discovery to an Agentix agent team that builds, releases and runs the work. They share one harness, so each starts clean in a new tab, keeps your place on reload, never touches the everyday prototype, and keeps its own storage — you can run two of them in two tabs at once.

MAX interviews the owner inside the Discovery; every other stakeholder receives a link of their own. `/stakeholder-interview?demo=<id>` is the page at the end of that link, so a presenter can show a stakeholder's side of the same Discovery. It opens in its own window and never touches the demo's saved state.

### Revenue reconciliation

One repeatable demo runs the whole story, from a new revenue Discovery to an Agentix agent team that builds, releases and runs the daily reconciliation:

- Full demo: [http://127.0.0.1:4317/maxion-prototype?demo=revenue](http://127.0.0.1:4317/maxion-prototype?demo=revenue) (or `/demo`)
- From the finished Discovery package: [http://127.0.0.1:4317/maxion-prototype?demo=revenue&start=package](http://127.0.0.1:4317/maxion-prototype?demo=revenue&start=package)
- Presenter guide for a second screen: [http://127.0.0.1:4317/demo-guide](http://127.0.0.1:4317/demo-guide)

Each new tab starts clean, a reload keeps your place, and the demo never reads or writes the everyday prototype's saved data. Agentix has no revenue engagement until the Discovery hands its package over, and each new revenue Discovery in the demo starts Agentix again from zero, so the whole process runs again. The step-by-step talk track, scripted answers and recovery tips are in the [presenter runbook](docs/demo-revenue-reconciliation.md).

### AP invoice exceptions (ServiceNow)

Calder Industrial's accounts payable queue: 22,180 exceptions in twelve months, 61% of them rules a pipeline can apply, and a delegation of authority nobody has re-attested.

- Full demo: [http://127.0.0.1:4317/maxion-prototype?demo=servicenow](http://127.0.0.1:4317/maxion-prototype?demo=servicenow)
- From the finished Discovery package: [http://127.0.0.1:4317/maxion-prototype?demo=servicenow&start=package](http://127.0.0.1:4317/maxion-prototype?demo=servicenow&start=package)
- Presenter guide for a second screen: [http://127.0.0.1:4317/demo-guide?demo=servicenow](http://127.0.0.1:4317/demo-guide?demo=servicenow)

Agentix has no AP exceptions engagement until the Discovery hands its package over, and each new AP invoice exceptions Discovery starts it again from zero. The talk track, scripted answers and figures are in the [presenter runbook](docs/demo-servicenow-ap-exceptions.md).

### Salesforce–SAP order sync

Arcline Technologies' quote-to-cash: 1,340 order sync failures in twelve months, $2,147,320.60 of bookings unbilled at quarter end, and two systems that each believe they own the customer.

- Full demo: [http://127.0.0.1:4317/maxion-prototype?demo=salesforce-sap](http://127.0.0.1:4317/maxion-prototype?demo=salesforce-sap)
- From the finished Discovery package: [http://127.0.0.1:4317/maxion-prototype?demo=salesforce-sap&start=package](http://127.0.0.1:4317/maxion-prototype?demo=salesforce-sap&start=package)
- Presenter guide for a second screen: [http://127.0.0.1:4317/demo-guide?demo=salesforce-sap](http://127.0.0.1:4317/demo-guide?demo=salesforce-sap)

Agentix has no order sync engagement until the Discovery hands its package over, and each new order sync Discovery starts it again from zero. The talk track, scripted answers and figures are in the [presenter runbook](docs/demo-salesforce-sap-order-sync.md).

## Deploy

Build and publish locally; pushing source code to `main` does not deploy the site.

```bash
GITHUB_PAGES=true GITHUB_REPOSITORY=MAXION-AI/maxion-platform-demo pnpm build
```

Publish the generated `dist/` contents to the root of the `gh-pages` branch using a separate temporary checkout. Include an empty `.nojekyll` file and a copy of `index.html` named `404.html`. Preserve the preceding release's hashed assets during CDN propagation so cached HTML can still load. GitHub Pages serves this prebuilt branch; there is no repository-authored Actions deployment workflow.

The Pages build sets the repository subpath automatically and uses hash routing so module links continue to work when refreshed. Verify the live HTML references the new build's asset hashes and smoke-test the hosted Agentix and Discovery journeys before calling a release complete. A rollback republishes the preceding Pages commit's tree as a new commit; it must not rewrite branch history.

## Verify

```bash
pnpm test
pnpm test:e2e
pnpm check-types
pnpm build
```

The browser suite covers the canonical platform shell, module transitions, Plan-to-Execute handoff, governed integration actions, autonomous brief-to-package journey, scenario-adaptive interviews, voice continuation, mobile layout, dark mode, runtime errors, and serious or critical accessibility violations.

## Scope

This repository is a frontend prototype. Agent runs, external-system actions, and provider effects are simulated; it does not contain the future Agentix backend or production integration credentials.

## Discovery → Agentix examples

Open Agentix to see deployed agents, not a chat workspace. Open an agent for concurrent cases, exceptions, cycle history and outcome performance. One contextual drawer exposes case decisions, activity/evidence, team/scope or scoped conversation. Onboarding demonstrates readiness, guided repair and an explicitly unsupported operation before deployment. New agent accepts a brief or Discovery design; existing responsibilities are reused. Discovery's completed designs remain below its existing discoveries.

| Example | Team | Demonstrated boundary |
| --- | --- | --- |
| ServiceNow incident triage | One coordinator | Straight-through assignment and notification; no incident closure |
| ERP invoice exception resolution | Coordinator + invoice and receipt analysts | Parallel checks, exact $240 variance approval, decline path, no payment release |
| Employee onboarding | Coordinator + HR and IT specialists | Operation readiness, guided mapping repair, unsupported automation and explicit human fulfillment |
| Inventory replenishment | Coordinator + demand and supply analysts | Scheduled trigger, spending cap, uncertain-write reconciliation without duplicate creation |

Agentix uses simulated Merge Agent Handler bindings only. The unrelated older Integrations demo is not evidence of current production connector availability. No real API, ERP, HRIS, email or Teams action is performed. Engagements, work, results and drafts are stored under `maxion-agentix-operations-v4` in browser local storage (an older `-v3` record is migrated once and left in place); work advances only while the page is open, including while another module is visible. The customer demo keeps its own copy and advances only while Agentix is on screen. The demo retains up to 240 work items; intake then stops without deleting history. Reloading restores the recorded stage, not a server-side worker.

See the [walkthrough](docs/agentix-initiative-demo.md) and [UX contract](docs/agentix-workspace-ux.md).
