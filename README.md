# MAXION Platform Demo

A self-contained functional frontend prototype for the unified MAXION platform experience.

Hosted demo: [https://maxion-ai.github.io/maxion-platform-demo/](https://maxion-ai.github.io/maxion-platform-demo/)

The prototype mirrors the current MAXION portal shell and connects the product modules in one persistent workspace:

- Dashboard — workspace activity, project status, quick actions, and connected-system context
- Projects — searchable project library, creation, details, membership, and archive states
- Discovery — autonomous inquiry, interviews, evidence, exceptions, and verified packages
- Plan — evidence-linked delivery planning and architecture
- Execute — development-only engagements, approvals, implementation, testing, and verification
- Agentix — deployed agents with ongoing intake, concurrent cases, scoped steering, readiness/repair and verified outcomes
- Consult MAX — cross-platform explanation and routing
- Integrations — Nango, Merge Unified API, and native connection management with scopes and access history

The sidebar, account surfaces, responsive drawer, MAXION lockup, and spiral geometry use the current portal patterns and brand assets. Operational work is intentionally absent from Execute; it belongs in Agentix.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:4317/maxion-prototype](http://127.0.0.1:4317/maxion-prototype).

The direct Agentix prototype URL remains available at [http://127.0.0.1:4317/agentix-prototype](http://127.0.0.1:4317/agentix-prototype) and opens the unified shell with Agentix selected.

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
pnpm check:program
pnpm build
```

The browser suite covers the canonical platform shell, module transitions, Plan-to-Execute handoff, governed integration actions, autonomous brief-to-package journey, scenario-adaptive interviews, voice continuation, mobile layout, dark mode, runtime errors, and serious or critical accessibility violations.

`pnpm check:program` runs the UX reference-sheet contract, raw-color ratchet, gate self-tests, and
TypeScript check. Every user-facing workspace is listed in
[`docs/operations/ux-surface-inventory.md`](docs/operations/ux-surface-inventory.md); a sheet cannot
advance to built or gated without an approved Figma frame, evidence artifacts, and independent sign-off.
The editable candidate system and exact frame IDs are recorded in
[`docs/operations/figma-ux-reference-program-2026-09-13.md`](docs/operations/figma-ux-reference-program-2026-09-13.md).

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

Agentix uses simulated Merge Agent Handler bindings only. The unrelated older Integrations demo is not evidence of current production connector availability. No real API, ERP, HRIS, email or Teams action is performed. Deployment, independent cases, progress and scoped drafts are stored in the tenant-scoped, versioned `maxion-demo:maxion-demo:agentix-operations:v1` browser cache. A valid legacy `maxion-agentix-operations-v3` value is migrated once and removed only after the new envelope is saved; malformed legacy data is ignored. Work advances only while Agentix is visible, pauses when the module is hidden, and resumes from the stored in-session state on return. The demo cap is 200 retained cases; intake then stops without deleting history. Reloading restores the recorded stage, not a server-side worker.

See the [walkthrough](docs/agentix-initiative-demo.md) and [UX contract](docs/agentix-workspace-ux.md).
