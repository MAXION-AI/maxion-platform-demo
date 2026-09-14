# Phase 0: Contract acceptance, bounded shell remediation, and missing-surface closure

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-02; advances RC-01 and RC-19 | **Risk:** high × medium | **Status:** pending
- **Depends on:** none

## Objective and scope

Accept or remediate the existing Phase 0/1 candidate, including only the shell/dashboard defects that
block this phase's independent UX acceptance, then create the missing screen contracts for
Projects, Settings, Integrations, My approvals, Usage, and Help before any of those surfaces are
treated as designed. It also makes dependency security and source integrity executable gates before
visual work continues. The only runtime UI work authorized here is the measured two-tier rail,
Figma-16:2 dashboard composition/readability, and transition-safe contrast required by rejected Phase 0
reviews. General Dashboard/Projects state implementation remains RC-06/Phase 2. Removing
proven-unreachable code and patching development dependencies are permitted foundation work.

## Entry criteria

- [ ] The executor records its exact clean worktree, branch, B, and C before review; no saved path or branch name in this plan is authority.
- [ ] Owner checkouts and `max-ai-platform` paths are inventoried read-only and remain untouched.
- [ ] `pnpm check:program`, `pnpm build`, the full unit suite, and the current E2E suite pass at exact clean C or failures remain recorded and the phase stays open.

## Architecture and non-functional impact

- **Scale:** the bounded shell remediation adds no data or network hot path. Reference states must include a 10,000-logical-row fixture and the bounded rendering rule used in Phase 10.
- **Robustness:** Figma access failure degrades to `BLOCKED`; no screen may proceed with a guessed node.
- **Threat surface:** no new route, authority, persistence, or provider surface. Evidence uses synthetic data and contains no secrets or PII.

## Immutable acceptance rerun required

Earlier merged runtime-contract lineage and dirty-tree reports are historical only and cannot authorize
Phase 1. The current Phase 0 implementation must create a new clean C, required distinct evidence-only
E, and final M. Fresh independent UX and engineering sessions audit detached C under
`docs/operations/phase-acceptance-protocol.md`; the coordinator separately qualifies clean M during
append. Phase 1 uses only the externally accepted final M as B. Until then RC-01 and Phase 0 remain open.
- **Source integrity:** critical/high dependency findings, unused TypeScript symbols, and the lack of a
  repeatable dead-code gate block the visual phases. Static findings are leads until route/import/runtime/
  test ownership confirms deletion.
- **UX:** the bounded shell/dashboard acceptance remediation owns exactly three rejected-contract gaps:
  product/admin rail tiering and short-height visibility; Figma-16:2 dashboard header, Needs you, and
  Recent outcomes composition/readability; and transition contrast. The existing program-wide laws
  table and every sheet's Section 4 are audited; each new sheet includes all 18 laws plus the
  interactivity floor with numbers. No other Phase 2 dashboard/project capability moves into Phase 0.
- **RC and state ownership:** Phase 0 advances only RC-01 and the bounded shell portion of RC-15. RC-06
  and the reducer/fixture/evidence implementation for `shell.attention`, `shell.clear`,
  `shell.destination-error`, and `shell.mobile-navigation` remain Phase 2 work. This remediation may
  exercise those currently reachable states to prove the rail and chrome remain operable, but may not
  add, remove, rename, or reinterpret their semantic state contracts.

## Ordered tasks

1. **Freeze the candidate identity (0.1).** At C, record branch/B/C, dirty-path census, commands,
   screenshots, Figma file/node IDs, token baseline, and `candidatePhase: 0`. The tracked ledger remains
   an explicitly lagging export through Phase -1; it cannot claim this phase's E/M. After a required
   distinct evidence-only E and true merge M exist, append their verified identities only to the
   external authority defined by `docs/operations/phase-acceptance-protocol.md`; verify with
   `git status`, `git diff --check`, and `pnpm check:program`.
2. **Remediate and independently audit the bounded foundation/shell slice (0.2).** Change only
   `PortalChrome`, `DashboardModule`, their existing shared styles, transition styles, and their direct
   unit/Playwright contracts. Run `docs/operations/ux-independent-audit-prompt.md` from a separate
   session against live 375 × 812, 768 × 900, 1280 × 720/900, and 1536 × 864/900 states and Figma
   `UhLxGyXphdHHNLGMomBq6n:16:2`; record every finding by law and reference. Acceptance requires exactly
   seven large top destinations—Dashboard, Projects, Discover, Plan, Execute, Agentix, Consult—with
   44 px rows, 24 px icons, 14 px labels, and 4 px gaps; a flexible product/admin gap of at least 24 px;
   and exactly five bottom destinations—Settings, Integrations, My approvals, Usage, Help—with 36 px
   desktop rows, 44 px mobile rows, 16 px icons, and 2 px gaps. All five admin rows remain initially
   visible and bottom-anchored within 0–16 px at both short desktop heights. The dashboard binds the
   72 px header, 190 × 36 px Search or ask, 132 × 44 px Open Agentix/Needs you actions, 20/26 px panel
   headings, 14/21 px row titles/actions, and 12/16 px evidence/support copy; entrance contrast remains
   AA at every sampled frame.
3. **Expand the surface inventory (0.3).** Add Projects, Settings, Integrations, My approvals, Usage, and Help to `docs/operations/ux-surface-inventory.md`; verify every visible route has exactly one owner sheet.
4. **Create six missing reference sheets (0.4).** Use `ux-reference-sheet.template.md`, examined Mobbin decisions, full laws tables, state matrices, production-component mappings, and distinct owner/verifier/QA fields.
5. **Create and validate six missing Figma frames (0.5).** Use the local Figma variables/components, preserve the accepted two-tier shell, create working/empty/error states as required, add exact node IDs to the sheets and an initial `docs/operations/figma-code-map.json`, add `scripts/check_ux_contract_coverage.py` to the program gate, and run structural/screenshot validation. Phase 1 extends the same manifest with implementation symbols and evidence rather than creating a second authority.
6. **Establish the source-quality and dependency floor (0.6).** Patch critical/high vulnerable tooling
   without broad major-version churn; enable strict unused checks; add a pinned dead-code analyzer and a
   repository-owned `check:source-quality` entry point; classify findings against routes, imports, tests,
   timers, styles, and browser behavior; delete only proven-unreachable code. Record all remaining legacy
   ownership as open RC-19 work—no allowlist or suppression may silently convert a finding into a pass.

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 0.1 | RC-01 via ADR-8 | `docs/operations/program-phase-ledger.json#candidatePhase`; `docs/operations/phase-acceptance-protocol.md#Identities` | Read-only target-ref and ledger verification | `python3 scripts/program_ledger.py validate-tracked` |
| 0.2 | RC-01 and bounded RC-15 acceptance via ADR-2 | `src/features/platform-prototype/PortalChrome.tsx#PortalSidebar`; `src/features/platform-prototype/PortalReplicaModules.tsx#DashboardModule`; `src/features/platform-prototype/portal-replica.css#mxp-portal-sidebar-scroll`; `src/features/platform-prototype/maxion-platform-prototype.css#mxp-root`; `tests/e2e/maxion-platform-shell.spec.ts#accepted-shell`; `artifacts/ux-audits/phase-0/independent-qa.json` | Task 0.1 candidate identity; rejected Phase 0 findings only | `pnpm exec playwright test tests/e2e/maxion-platform-shell.spec.ts` |
| 0.3 | RC-02 and RC-16 via ADR-2 | `docs/operations/ux-surface-inventory.md#Route-and-address-ownership-at-Phase-0`; `docs/operations/figma-code-map.json#surfaces` | Task 0.2 audit findings | `python3 scripts/check_ux_contract_coverage.py` |
| 0.4 | RC-02 via ADR-2 | `docs/operations/ux-reference-sheets/settings-workspace.md#5.1`; `docs/operations/ux-reference-sheets/help-workspace.md#5.1` | Task 0.3 complete inventory | `python3 scripts/check_ux_reference_sheet.py docs/operations/ux-reference-sheets` |
| 0.5 | RC-02 and RC-16 via ADR-2 | `docs/operations/figma-code-map.json#schemaVersion`; `scripts/check_ux_contract_coverage.py#check_contract` | Task 0.4 complete sheets and approved Figma frames | `python3 -m unittest scripts.tests.test_ux_gates.ContractCoverageGateTests` |
| 0.6 | RC-03 and RC-19 via ADR-7 | `scripts/check_production_sources.py#check_sources`; `package.json#check:source-quality` | Task 0.5 complete contract map | `pnpm check:source-quality` |

## Data and contracts

No schema/API change. Adds six reference-sheet contracts, six Figma node mappings, the initial
route→sheet→node manifest, and its coverage gate. The bounded shell change alters only presentation
and navigation composition; it adds no Phase 2 project/dashboard state contract and leaves the four
shell semantic-state owners scheduled for Phase 2.

## Break-it tests

- Gate a sheet with a missing frame, placeholder, empty law row, bare N/A, or duplicate sign-off and assert failure.
- Delete one surface from the inventory-to-sheet map and assert the coverage checker fails.
- Corrupt one Figma node ID in the exported manifest and assert the contract check fails.
- Render all frames at 1440 × 900 and assert no overflow, target under 24 px, or product/admin hierarchy drift.
- Add an unused export, dependency, and TypeScript local in fixtures and assert the source-quality gate fails.
- Traverse every registered route after removal and assert the active screen, timers, keyboard path, and
  recovery behavior still work.

## Failure modes

| Failure | Detection | Degraded behavior |
| --- | --- | --- |
| Figma node inaccessible | connector read fails | mark phase BLOCKED; retain last verified evidence without guessing |
| Independent audit finds blocker | audit report | remediate candidate only; do not start Phase 1 |
| Owner checkout changes during review | identity check | stop and re-pin the isolated worktree; never overwrite owner state |

## Observability and rollback

The disk record is the inventory, sheets, Figma ledger, source-quality evidence, audit report, and
candidate SHA. Rollback is a reviewed revert of the Phase 0 PR, including the bounded rail/dashboard/
transition files above, returning to the prior merge as one coherent UI owner; it does not preserve a
hidden predecessor shell, absorb general Phase 2 work, or reset/mutate the owner's dirty checkout.

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Historical lineage | Prior merged/runtime reports | Context only; never Phase 1 B or current acceptance evidence |
| Current candidate | Clean C, required distinct evidence-only E, and final M | C/E/M ancestry, semantic evidence-only gate, hosted PR-head checks, clean-M rerun |
| Evidence-only closure | Phase-scoped UX/QA/command JSON reports, owned-sheet evidence/sign-off cells, and the Phase 0 structured hand-off only; no ledger/source/test/script/contract change | C→E protected objects unchanged and exact allowlist diff passes |
| PR lifecycle | Open the current PR from B through E; if review exposes a defect, create a new C on that branch and restart clean-C review | Verified final M and atomic external-ledger successor pin |

## Definition of Done

- [ ] Independent UX and engineering reports accept exact clean C; coordinator qualification accepts final clean M.
- [ ] The bounded shell slice matches Figma 16:2 typography/geometry, preserves AA through transitions,
  and keeps all five bottom admin rows initially visible at 1280 × 720 and 1536 × 864 without shrinking
  the 44/36 px navigation contracts.
- [x] Inventory contains every user-facing route, including Projects and five administrative surfaces.
- [x] Every inventory row resolves to a valid sheet and exact accessible Figma node.
- [x] The coverage gate fails for a missing/duplicate route, sheet, or Figma node and is registered in `pnpm check:program`.
- [x] All sheet/token/program gates pass; no builder self-signs verifier or QA.
- [x] `pnpm audit --audit-level high` reports zero critical/high findings and strict TypeScript reports no unused symbols.
- [x] `pnpm check:source-quality` is deterministic, registered in the program gate, and has no unreviewed finding.
- [ ] PR URL, E, M, audit paths, hashes, canonical command reports, and Figma inventory are recorded in
  the external authority; the tracked ledger remains a truthful lagging snapshot and is exported only
  by a later candidate.

## Hand-off

Phase 1 starts only from Phase 0's externally accepted final M and re-runs this Definition of Done. No runtime
implementation is authorized by a candidate-only frame.

### Structured acceptance hand-off

```json
{"schemaVersion":1,"phase":0,"nextPhase":1,"status":"pending","evidence":[],"reviewers":{"ux":"pending","qa":"pending"}}
```
