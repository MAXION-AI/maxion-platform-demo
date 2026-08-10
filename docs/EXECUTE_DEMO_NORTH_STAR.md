# Execute Demo North Star

## Status and boundary

This document is the experience contract for the unified MAXION frontend demo. It defines what the Execute module must demonstrate to prospects and what the future product implementation should build toward.

The demo is intentionally frontend-only. Agent runs, collaboration, environment changes, approvals, and provider effects are simulated, but the interface must remain internally consistent and must not imply authority that has not been granted.

Discovery and Plan remain the upstream sources of truth:

- Discovery owns business context, evidence, stakeholders, interviews, conflicts, requirements, controls, risks, decisions, and the verified Discovery package.
- Plan owns executable behavior, L2 solution architecture, L3 technical contracts, L4 build packages, dependencies, completion gates, technical clarification, implementation-boundary approvals, and the versioned Execute handoff.
- Execute consumes those approved artifacts. It owns collaborative implementation, workspace agents, repositories and configuration, verification, staging, cross-platform E2E, release preparation, production deployment, rollback evidence, and implementation deviations.

Execute must not recreate interviews, RAID management, requirements authoring, architecture authoring, implementation planning, or approver discovery. Upstream artifacts appear as versioned, read-only implementation context with links back to their source.

## Product thesis

Execute is not a single-user coding assistant. It is a governed delivery operating system that replaces the implementation coordination, development, integration, QA, and release functions normally supplied by a systems integrator.

The experience must show one approved Plan becoming a coordinated implementation engagement containing:

- An interactive Orchestrator workspace.
- System and delivery-team workspaces compiled from Plan L4 packages.
- Human members with workspace-specific roles and authority.
- A specialized agent in every workspace.
- A governed repository set in every workspace, spanning any mix of GitHub, GitLab, and Bitbucket repositories.
- Independent implementation, test, review, and environment state per workspace.
- A version-locked cross-platform E2E candidate.
- Coordinated, evidence-backed production release.
- A governed path for deviations that require Plan changes.

The north-star promise is:

> Execute turns an approved Plan into a governed, multi-team implementation engagement and autonomously carries it from workspace-level development through cross-platform production deployment, while asking people only for authority, material design changes, or decisions that cannot be inferred safely.

## Flagship demo scenario

The flagship engagement implements an approved ServiceNow-to-Workday Financials integration through MuleSoft.

Plan compiles the work into the following delivery workspaces:

| Workspace | Plan packages | Primary responsibility |
|---|---|---|
| Orchestrator | Entire approved snapshot | Coordinate agents, dependencies, candidates, decisions, and release |
| ServiceNow | SNOW-101 | Publish approved financial changes and retain delivery status |
| MuleSoft | MULE-201, MULE-202 | Validate, transform, queue, orchestrate, retry, and call Workday |
| Workday Financials | WDAY-301 | Secure, validate, and post the governed journal |
| Integration verification | INT-401 | Prove the complete request-to-receipt behavior and release evidence |

Workspace boundaries follow system and delivery ownership. A workspace is not a repository. It is the durable collaboration and authority boundary for one delivery team, and it may coordinate any number of existing or newly provisioned repositories needed to deliver its assigned Plan packages.

For example, the MuleSoft workspace can create `maxion/mule-journal-orchestration`, update the existing `maxion/mule-shared-policies`, and retain both change requests as one cross-repository change set. The Workday workspace can do the equivalent in Bitbucket, while a ServiceNow workspace can remain on GitHub. Provider choice does not change the workspace interaction model.

## Personas and authority

| Role | Default surface | Authority |
|---|---|---|
| Engagement owner | Orchestrator | All workspaces, sharing, coordination, candidate assembly, approval requests |
| Orchestrator collaborator | Orchestrator | Cross-workspace conversation and coordination within granted scope |
| Workspace contributor | Assigned workspace | Chat, steer, inspect, implement, test, and request staging |
| Workspace reviewer | Assigned workspace | Review changes, tests, evidence, and workspace gate |
| Release approver | Release decision | Approve exact artifacts for a named environment |
| Viewer | Assigned surfaces | Read-only context and evidence |

Project membership supplies the candidate identity pool. Execute adds workspace-scoped membership so access to one platform does not imply access to another platform's repository, credentials, configuration, or conversation.

## Experience architecture

### Persistent engagement header

The header must show:

- Engagement and customer outcome.
- Approved Plan snapshot.
- Development to staging to E2E to production progression.
- Current candidate version.
- Active participants.
- Share action.
- Search and command menu.
- One consolidated attention state.

### Workspace rail

The left rail lists Orchestrator first, followed by system workspaces and integration verification. Each row shows only the information needed to choose where to work:

- Workspace name and system.
- Agent state.
- Assigned people.
- Blocker or next gate.
- Current environment state.
- Unread directions or review requests.

### Conversation and live work

The center is the primary surface. It combines the human-and-agent conversation with streamed implementation activity:

- Current autonomous objective.
- Meaningful tool actions and changed artifacts.
- Tests and repairs.
- Decisions made inside approved authority.
- Questions that genuinely require a person.
- One obvious next action.

Routine logs collapse into expandable traces. The user sees the value of autonomous work without reading terminal noise.

### Contextual inspector

Inspector priority is:

1. Repositories
2. Changes
3. Tests
4. Environments
5. Plan context
6. Audit

Topology is the Orchestrator's primary inspector view. Workspace contributors see their implementation evidence first.

## Required capabilities

### 1. Plan-compiled domain workspaces

- Generate workspaces from the approved Plan's ownership, workspace keys, and L4 packages.
- Preserve the exact Plan snapshot and package identifiers in every workspace.
- Group packages by system/team authority rather than arbitrary technical slices.
- Show mission, owned behavior, contracts, dependencies, done conditions, tests, and evidence in a read-only context drawer.

### 2. Sharing and collaboration

- Default sharing to the current workspace; make entire-engagement access a deliberate escalation.
- Add a suggested development team in one decision rather than assigning people and roles one row at a time.
- Offer three plain-language authority templates: Developer, Reviewer, and Viewer.
- Preserve individual email invitations and compact role management as secondary paths.
- Confirm exactly which team, people count, workspace, and steering authority were granted.
- Show real participant names and attribution in messages and audit events.
- Represent presence, mentions, unread state, review requests, and handoffs.
- Keep access visibly scoped to the selected workspace.

### 3. Multi-repository workspaces

- Treat a workspace as a repository set, never as a single repository binding.
- Attach existing repositories or create new ones across GitHub, GitLab, and Bitbucket.
- Show provider, repository purpose, working branch, default branch, owner team, write authority, allowed paths, checks, changed files, and change request for every binding.
- Attribute every changed file to its repository and retain linked PR or MR evidence.
- Coordinate a single implementation objective across all repository worktrees without collapsing their histories or credentials.
- Pin repository SHAs and provider receipts into staging and E2E candidates.
- Make provider credentials non-transferable when a workspace is shared; collaborators receive workspace authority, not raw credentials.
- Allow the Orchestrator to observe repository-set status without silently widening a platform workspace's path or write authority.

### 4. Interactive Orchestrator

- Open and converse with the Orchestrator like any other workspace.
- Ask for complete delivery status or a specific blocker.
- Coordinate other workspace agents.
- Pause or resume workspaces.
- Request missing evidence.
- Route defects to the owning workspace.
- Assemble staging and E2E candidates.
- Prepare promotion and release proposals.
- Never silently mutate another workspace or change approved architecture.

### 5. Independent workspace lifecycle

Every workspace tracks its own:

- Agent and implementation state.
- Repository set, branches, worktrees, path scopes, and linked change requests.
- Plan package version.
- Dependencies and blockers.
- Changes, tests, and review state.
- Development, staging, E2E, and production artifacts.
- Promotion history and rollback reference.

### 6. Staging promotion

- A verified workspace may propose promotion of an exact artifact to staging.
- Show impact before the mutation and require Apply or Discard.
- Record who initiated and approved the promotion.
- Keep workspace staging independent while preserving candidate compatibility.

### 7. Version-locked cross-platform E2E

- Assemble one immutable candidate from exact ServiceNow, MuleSoft, and Workday versions.
- Require all Plan dependency gates before assembly.
- Run happy path, schema, authentication, timeout, retry, duplicate, DLQ, callback, and reconciliation scenarios.
- Classify failures and route them to the correct workspace with trace and reproduction evidence.
- Retain a complete evidence pack for the candidate.

### 8. Coordinated production release

- Pin exact approved artifacts and environment bindings.
- Follow Plan dependency order.
- Route each production decision to the correct approver.
- Keep provider credentials workspace-scoped.
- Attach rollback instructions and evidence.
- Track each platform deployment and the complete cross-platform outcome.

### 9. Runtime deviations

- Repair implementation-local defects inside Execute when they do not change the approved contract.
- Detect contract, scope, system-boundary, security, or operating-model deviations.
- Produce a Plan change proposal containing original contract, new evidence, affected artifacts, impacted workspaces, proposed alternative, and work that can safely continue.
- Resume affected work only after a new approved Plan snapshot is published.

### 10. Receipts and history

- Attribute every direction, change, test, promotion, approval, deployment, and rollback.
- Show artifact hashes, environment, Plan snapshot, actor, timestamp, and retained evidence.
- Make release and workspace history easy to compare without turning the interface into an audit dashboard.

### 11. Role-specific experience

- Engagement owners land in Orchestrator with cross-team progress and exact decisions.
- Contributors deep-link to their assigned workspace and implementation context.
- Reviewers land on changes and evidence.
- Approvers see one bounded decision naming artifact, environment, impact, evidence, and rollback.

## Interaction model

The same composer accepts questions, directions, coordination, and mutations.

- Questions receive immediate contextual answers.
- Safe implementation directions are applied within the current workspace and recorded.
- Cross-workspace directions are coordinated by the Orchestrator and attributed.
- Environment mutations show an impact preview with Apply and Discard.
- Architecture-changing directions create a Plan deviation instead of silently changing implementation truth.

The interface should make the autonomous behavior visible through four stable concepts:

- **Now** — what the agent is currently handling.
- **Handled** — work completed without interrupting the user.
- **Needs you** — exact authority or material judgment required.
- **Next** — one recommended action when intervention is useful.

## Visual and interaction bar

The Execute demo must feel calmer, faster, and more legible than a typical enterprise console while retaining serious delivery depth.

- Dark-first, warm near-black surfaces with one restrained teal accent.
- One type system, one radius system, one motion vocabulary, and a strict 4px spacing grid.
- A semantic Execute type scale: 10px captions, 11px metadata, 12px controls, 13px body copy, 18px panel headings, and 24–34px workspace titles. Font size follows content role, never the component that happened to render it.
- Conversation-first composition inspired by the focus and speed of Claude Code and Codex, without copying either product.
- Information density through alignment and progressive disclosure, not boxes inside boxes.
- Immediate feedback under 100ms; standard transitions between 200 and 300ms.
- Motion only for attention, continuity, or latency masking.
- Complete hover, focus-visible, active, disabled, loading, selected, empty, and error states.
- Full keyboard operation, clear accessible names, reduced-motion behavior, and WCAG 2.1 AA contrast.
- Desktop, tablet, and mobile layouts with no horizontal overflow or lost core action.

## Demo journey

The prospect journey must be navigable without explanation:

1. Open the approved engagement and see MAX coordinating the implementation.
2. Open MuleSoft and see one workspace coordinating a new application repository and an existing shared-policy repository.
3. Attach an existing repository or create a new one on another provider without leaving the workspace.
4. Share the MuleSoft workspace with the suggested integration team in one decision and see exactly how five people can steer MAX.
5. Converse with the Orchestrator and direct a cross-workspace concern.
6. Enter ServiceNow, MuleSoft, and Workday workspaces and watch implementation, tests, and repair occur independently.
7. Review the inherited Plan context without leaving Execute.
8. Promote exact workspace artifacts to staging using an impact preview.
9. Assemble a version-locked E2E candidate.
10. Watch the E2E suite run, classify a failure, route it to MuleSoft, repair it, and rerun.
11. Review the passed candidate, approvals, evidence, rollback, and production sequence.
12. Deploy each platform in the governed order and see the cross-platform outcome verified.
13. Raise a contract-changing direction and see Execute create a bounded Plan deviation rather than silently diverge.

## Roadmap and acceptance contract

### P0 — vision-critical

- Plan packages compile into system/team workspaces.
- Workspace membership, roles, sharing, and attribution are present.
- Every workspace exposes a multi-provider repository set with existing and new repository bindings.
- Team sharing is one decision with a workspace-first default and visible steering authority.
- Orchestrator is a real conversational workspace.
- Every workspace has independent state.
- Development and staging lifecycle is navigable.
- Version-locked cross-platform E2E is represented and operable.
- Coordinated production release is represented and operable.

### P1 — enterprise credibility

- Persistent multi-user threads, mentions, presence, and review requests.
- Plan deviation and snapshot-rebase workflow.
- Exact artifact, environment, approval, and rollback receipts.
- Failure classification and automatic defect routing.
- Workspace-specific environment bindings and authority.
- Cross-repository change sets, linked PR or MR receipts, path scopes, and pinned repository SHAs.
- Production verification and release history.

### P2 — frontier experience

- Role-specific default views.
- Compact environment rail.
- Expandable autonomous-work traces.
- Cross-workspace command palette.
- Purposeful transitions and streamed progress.
- Empty, blocked, error, and recovery states.
- Historical workspace and release comparison.
- Semantic typography contract verified through computed styles in desktop and mobile layouts.

The demo is complete only when every item above is visible, reachable, internally consistent, keyboard-accessible, covered by component tests where appropriate, and exercised through Playwright in desktop and mobile layouts.
