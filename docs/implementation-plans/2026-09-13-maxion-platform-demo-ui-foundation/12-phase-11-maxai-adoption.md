# Phase 11: MaxAI adoption contract and production-native pilot

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-17 | **Risk:** high × high | **Status:** Not started
- **Depends on:** Phase 10 accepted demo SHA

## Objective and scope

Translate the qualified demo contract into an adoption map for `max-ai-platform`, then pilot only the
shared shell, Dashboard, and Projects inside `apps/max-user-portal` using production-native tokens,
components, routing, queries, authentication, authorization, and tenant boundaries. The production portal
must not import demo React, CSS, storage, scenarios, or simulated authority. Product-module ports require
their own later production plans and are outside this phase.

## Entry criteria and UX contract

- [ ] Phase 10 independently qualifies one pinned demo SHA with explicit proof limitations.
- [ ] Fetch `max-ai-platform` and create a fresh isolated worktree from the then-current `origin/main`; record remote, branch, SHA, dirty state, and listener identity before interpretation.
- [ ] Do not use or modify the current owner checkout, which was behind `origin/main` and contained owner untracked paths at planning time.
- [ ] Reinspect production `theme.css`, `tailwind.css`, `PortalSidebar.tsx`, `PortalHeader`, `ContentWrapper`, `ModuleWorkspace`, `components/ui/*`, `usePortalCommands.ts`, `App.tsx`, API client, and query provider at the pinned SHA.

The shell, Dashboard, and Projects are **product** surfaces. Their accepted demo sheets and Figma nodes
remain the behavioral/visual source, while MaxAI's current accessibility, security, auth, tenancy, and
component contracts take precedence. The rail must retain large top-half destinations only for Dashboard,
Projects, and product modules; Settings, Integrations, My approvals, Usage, and Help remain compact below
the spacer. Page actions retain 44 px targets and <400 ms acknowledgement; existing portal keyboard,
command-menu, and navigation conventions cannot regress.

## Architecture, scale, security, and reliability

Create `docs/operations/maxion-demo-ui-adoption-map.md` mapping every accepted demo token, primitive,
route/state, Figma node, and object/event concept to a production-native owner or an explicit gap. Implement
the pilot behind the repository's existing feature-flag mechanism, default off; if the pinned revision has
no suitable mechanism, add one explicit environment/configuration flag with typed parsing, default-off
behavior, and tests rather than inventing an implicit toggle. Data stays in existing
React Query/API seams; authorization remains server-side; every query, cache key, and route is tenant-
scoped. No new endpoint or schema is authorized here. If a required `/v1/` contract, pagination field,
authorization rule, audit event, or observability seam is missing, stop that behavior and open a separate
backend plan rather than mocking it in production.

The pilot must retain existing production SLOs for 10,000 concurrent users: paginated queries, bounded
client rendering, request timeouts/retry policy, correlation IDs, graceful optional-service degradation,
and no unbounded dashboard/project fetch. Any new dependency requires a pinned version, license/CVE review,
and measured bundle justification.

## Ordered tasks

1. **Pin and baseline production (11.1).** Fetch, create the fresh worktree, record identities, run current portal gates, and capture off-path UI/performance/API/query behavior before changes.
2. **Write the adoption map (11.2).** Map qualified demo decisions to production tokens, primitives, routes, commands, queries, auth/tenant checks, observability, Figma nodes, and proof; classify every gap as UI, API, authorization, data, or operations.
3. **Create the production-native shared seam (11.3).** Add only necessary token/primitive/layout adaptations behind the existing default-off flag; preserve the flag-off DOM, behavior, and bundle path.
4. **Port the sidebar and shell (11.4).** Implement the accepted top/bottom information architecture with existing portal navigation, command menu, account/balance behavior, responsive overlay, keyboard, and focus semantics.
5. **Port Dashboard and Projects (11.5).** Rebuild accepted interactions on real production queries and server-authorized actions; include pagination, loading/empty/error/permission/degraded states, and audit/correlation behavior already supported by the backend.
6. **Break security, scale, and rollback (11.6).** Test tenant-ID substitution, unauthorized routes/actions, stale query/cache, 429/timeout/5xx, 10,000-user load assumptions against existing service evidence, large datasets, flag transitions, dependency outage, and rollback.
7. **Qualify the pilot independently (11.7).** Run unit/integration/E2E/security/accessibility/responsive/performance/visual gates, compare exact frames and accepted demo behaviors, deploy locally only, exercise flag on/off, and require separate production reviewer/QA sign-off.

## Contracts, observability, and migration

The UI may add view models and adapters but cannot change public API fields. It reuses versioned `/v1/`
contracts, production request/correlation IDs, structured logging, auth refresh, tenant keys, pagination,
and query invalidation. Sensitive mutations must use existing server audit logging; absence is a blocker.
No database migration is planned. If one is required after inspection, it needs a separate backward-
compatible migration/release plan and is not smuggled into the pilot.

## Test and failure plan

Unit tests cover adapters, feature-flag selection, route mapping, pagination view models, and safe error
copy. Integration tests cover real query/auth/tenant seams with mocked transport, 401/403/404/409/429/5xx,
timeouts, retries, stale data, and cancellation. Local Playwright covers flag off/on, shell navigation,
Dashboard attention, Projects create/search/filter/resume/permission states, keyboard/mobile/reduced motion,
and tenant isolation. Load and query evidence must confirm bounded pagination/caches; current service proof
is reused only when pinned to compatible endpoints and revision.

| Failure | Required fallback |
| --- | --- |
| Required production API/auth/audit contract is absent | Block that behavior and create a separate backend plan; do not fake it |
| Flag-on shell or route fails | Default-off flag returns users to the unchanged production path |
| Optional query/service is unavailable | Preserve primary navigation/work; show scoped retry/degraded state |
| Tenant or permission validation fails | Fail closed server-side and verify no inaccessible metadata is revealed |
| Local pilot cannot meet bundle/performance/accessibility budget | Do not promote the flag; remediate or revert the pilot |

Rollback is the tested default-off feature flag plus a clean revert of the isolated pilot commits. The
flag-off path must remain behaviorally equivalent to the production baseline; no deploy outside the local
environment is authorized by this plan.

## Definition of Done

- [ ] The adoption map covers every pilot route/state/token/primitive/object/query/security/observability seam with no implicit code-copy dependency.
- [ ] Sidebar, Dashboard, and Projects match the accepted UX contract using production-native code and real authorized query paths.
- [ ] Flag off restores the unchanged baseline; rollback is exercised locally and recorded.
- [ ] Unit, integration, security, tenant-isolation, E2E, responsive, accessibility, performance, bundle, visual, and local-deployment gates pass.
- [ ] Independent production reviewer and QA report no blocker/major finding; no module beyond the pilot scope is changed.

## Hand-off

The accepted pilot and adoption map become inputs to separate, one-module-at-a-time MaxAI production
plans for Discover, Plan, Execute, Agentix, Consult, and administration. Demo acceptance alone never
authorizes those ports or substitutes for their backend/release qualification.
