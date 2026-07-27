# MAXION Platform Prototype

A self-contained functional frontend prototype for the unified MAXION platform experience.

Hosted prototype: [https://maxion-ai.github.io/maxion-platform-prototype/](https://maxion-ai.github.io/maxion-platform-prototype/)

The prototype mirrors the current MAXION portal shell and connects the product modules in one persistent workspace:

- Dashboard — workspace activity, project status, quick actions, and connected-system context
- Projects — searchable project library, creation, details, membership, and archive states
- Discovery — autonomous inquiry, interviews, evidence, exceptions, and verified packages
- Plan — evidence-linked delivery planning and architecture
- Execute — development-only engagements, approvals, implementation, testing, and verification
- Agentix — ongoing operational and role-based agents
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

Pushes to `main` deploy the production build to GitHub Pages through `.github/workflows/deploy-pages.yml`. The Pages build sets the repository subpath automatically and uses hash routing so module links continue to work when refreshed without returning a GitHub Pages 404.

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
