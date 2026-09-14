# MAXION platform demo — UX surface inventory

This inventory is the build boundary for the platform-wide UX system change. The route is a single
demo shell, but each top-level workspace has a distinct job, state model, and reference contract.
Nested dialogs and panels inherit the parent contract unless they introduce a new end-to-end job.

## Route and address ownership at Phase 0

- `/maxion-prototype` is the canonical shell route.
- `/agentix-prototype` is a classified compatibility alias. It selects Agentix but does not address
  an individual run; Phase 1 removes it after canonical shell URL-state exists.
- `/discovery-prototype` is a classified compatibility alias that bypasses the shell while rendering
  the same Discover owner. Phase 1 removes it after canonical shell URL-state exists.
- Agentix run canvas is currently interaction-only: enter Agentix, open a deployed responsibility,
  then open a case. It is not truthfully URL-addressable while `DeployedAgentsPage` initializes
  `panel=null`. Phase 1 must encode responsibility and case IDs in canonical shell URL state.
- `/` and `*` are redirects to `/maxion-prototype`.

Schema-v2 `figma-code-map.json` is the executable route/address/runtime/style/timer authority. Its
compatibility-alias and stale-selector baselines are disclosed Phase 0 debt, not zero-legacy proof;
both must be zero before Phase 1 can merge.

| Order | Surface id | Surface | Primary implementation | Reference sheet | Contract status | Frame status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | platform-shell-dashboard | Platform shell and operating dashboard | `MaxionPlatformPrototypePage`, `PortalChrome` | `platform-shell-dashboard.md` | contract | Candidate frame `16:2`; audit pending |
| 2 | projects-workspace | Projects workspace | `ProjectsModule` | `projects-workspace.md` | contract | Candidate frame `40:478`; audit pending |
| 3 | discover-workspace | Discover evidence workspace | `DiscoveryAutonomousPrototypePage` | `discover-workspace.md` | contract | Candidate frame `18:45`; audit pending |
| 4 | plan-workspace | Plan agentic workspace | `PlanModule` | `plan-workspace.md` | contract | Candidate frame `19:86`; audit pending |
| 5 | execute-workspace | Execute hub and delivery workspace | `ExecuteHubModule`, `ExecuteDeliveryWorkspace` | `execute-workspace.md` | contract | Candidate frame `20:125`; audit pending |
| 6 | agentix-operations | Agentix deployed agents and operations | `DeployedAgentsPage`, `OperationsViews` | `agentix-operations.md` | contract | Candidate frame `21:175`; audit pending |
| 7 | agentix-run-canvas | Agentix live run canvas | `DeployedAgentsPage`, `RunDetail` | `agentix-run-canvas.md` | contract | Candidate frame `46:933`; audit pending |
| 8 | consult-max-workspace | Consult MAX workspace | `ConsultModule` | `consult-max-workspace.md` | contract | Candidate frame `22:225`; audit pending |
| 9 | settings-workspace | Workspace settings | `AccountUtilityModule` | `settings-workspace.md` | contract | Candidate frame `43:559`; audit pending |
| 10 | integrations-workspace | Connected systems and integration health | `IntegrationsModule` | `integrations-workspace.md` | contract | Candidate frame `43:786`; audit pending |
| 11 | approvals-workspace | Approvals assigned to the current operator | `AccountUtilityModule` | `approvals-workspace.md` | contract | Candidate frame `43:1013`; audit pending |
| 12 | usage-workspace | Workspace unit usage and limits | `AccountUtilityModule` | `usage-workspace.md` | contract | Candidate frame `43:1234`; audit pending |
| 13 | help-workspace | Contextual help and recovery | `AccountUtilityModule` | `help-workspace.md` | contract | Candidate frame `43:1461`; audit pending |

## Shared acceptance boundary

- The product shell remains familiar: Dashboard, Projects, and the five product modules use the
  large upper navigation tier; units, Settings, Integrations, approvals, usage, and help use a
  compact bottom-anchored administrative tier above tenant identity. The shell keeps one dominant
  work area, command access, contextual attention, and an explicit route back.
- All module transitions use one in-session state model. No badge, card, or assistant answer may imply
  work has completed unless the responsible module state says it has.
- A screen cannot advance to `built` or `gated` without an independently accepted Figma file/node,
  attached evidence, all seven evidence checks passing, and three distinct sign-offs. Candidate frames
  now exist for every surface in the editable Maxion program file. Independent review, implementation
  evidence, and sign-off remain required.
- Existing raw color literals are debt under a ratchet: 13 files and 1,463 literals at the initial
  2026-09-13 baseline. The shared-system pass and removal of a retired commented theme reduced that
  to 10 files and 1,357 literals; new literals are forbidden and later module phases must continue
  shrinking it.

## Implementation order

1. Establish shared tokens, focus, motion, target sizing, page geometry, shell primitives, and the
   checked route-state-to-sheet-to-Figma map.
2. Qualify Dashboard and Projects, then Discover, Plan, and Execute so project and evidence state remain coherent.
3. Qualify Agentix operations and its run canvas, then Consult MAX against the lifted cross-module state.
4. Replace the administrative catch-all with Settings, Integrations, My approvals, Usage, and Help owners.
5. Run fresh desktop, tablet, and mobile journeys, accessibility checks, visual evidence, load checks,
   and the independent audit before any sheet is promoted beyond `contract`.
