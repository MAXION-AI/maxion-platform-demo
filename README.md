# MAXION Platform Demo

A self-contained functional frontend prototype for the unified MAXION platform experience.

Hosted demo: [https://maxion-ai.github.io/maxion-platform-demo/](https://maxion-ai.github.io/maxion-platform-demo/)

The prototype mirrors the current MAXION portal shell and connects the product modules in one persistent workspace:

- Dashboard — workspace activity, project status, quick actions, and connected-system context
- Projects — searchable project library, creation, details, membership, and archive states
- Discovery — autonomous inquiry, interviews, evidence, exceptions, and verified packages
- Plan — evidence-linked delivery planning and architecture
- Execute — development-only engagements, approvals, implementation, testing, and verification
- Agentix — one persistent workspace for autonomous work, conversation, live agent status, inline decisions and verified outcomes
- Consult MAX — cross-platform explanation and routing
- Integrations — Nango, Merge Unified API, and native connection management with scopes and access history

The sidebar, account surfaces, responsive drawer, MAXION lockup, and spiral geometry use the current portal patterns and brand assets. Operational work is intentionally absent from Execute; it belongs in Agentix.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:4317/maxion-prototype](http://127.0.0.1:4317/maxion-prototype).

The legacy Agentix prototype URL remains available at [http://127.0.0.1:4317/agentix-prototype](http://127.0.0.1:4317/agentix-prototype) and opens the unified shell with Agentix selected.

The complete autonomous Discovery experience is also available directly at [http://127.0.0.1:4317/discovery-prototype](http://127.0.0.1:4317/discovery-prototype). The same experience is embedded intact inside the Discovery module of the unified shell.

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

Open Agentix to see an invoice team already working, with its conversation, activity and status together. Switch initiatives in the work list. Use the pinned composer to pause, resume, prioritize or hold notifications. Start new work from a brief or a Discovery design; review and activate the proposed scope in the same workspace. On Discovery's landing page, completed process designs are a secondary disclosure below the existing discoveries.

| Example | Team | Demonstrated boundary |
| --- | --- | --- |
| ServiceNow incident triage | One coordinator | Straight-through assignment and notification; no incident closure |
| ERP invoice exception resolution | Coordinator + invoice and receipt analysts | Parallel checks, exact $240 variance approval, decline path, no payment release |
| Employee onboarding | Coordinator + HR and IT specialists | Scoped context, missing permission, explicit human fulfillment |
| Inventory replenishment | Coordinator + demand and supply analysts | Scheduled trigger, spending cap, uncertain-write reconciliation without duplicate creation |

Agentix uses simulated Merge Agent Handler bindings only. The unrelated older Integrations demo is not evidence of current production connector availability. No real API, ERP, HRIS, email or Teams action is performed. Demo progress and drafts are stored under `maxion-agentix-workspace-v2` in browser local storage; work advances only while the page is open. Reloading restores the recorded stage, not a server-side worker. Prior demo storage is left untouched.

See the [walkthrough](docs/agentix-initiative-demo.md) and [UX contract](docs/agentix-workspace-ux.md).
