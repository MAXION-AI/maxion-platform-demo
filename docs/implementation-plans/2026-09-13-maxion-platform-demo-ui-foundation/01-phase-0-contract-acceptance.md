# Phase 0: Contract acceptance and missing-surface closure

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-01, RC-02; establishes RC-19 enforcement | **Risk:** high × medium | **Status:** Accepted candidate; PR pending
- **Depends on:** none

## Objective and scope

Accept or remediate the existing Phase 0/1 candidate, then create the missing screen contracts for
Projects, Settings, Integrations, My approvals, Usage, and Help before any of those surfaces are
treated as designed. It also makes dependency security and source integrity executable gates before
visual work continues. Runtime behavior may not change; removing proven-unreachable code and patching
development dependencies are permitted foundation work.

## Entry criteria

- [x] Worktree is exactly `/Users/abhinavshankar/GitHub_Repos/maxion-platform-demo-ux-system-20260913` on `codex/maxion-demo-ux-system-20260913`.
- [x] Owner checkout and `max-ai-platform` dirty paths are recorded and untouched.
- [x] `pnpm check:program`, `pnpm build`, the full unit suite, and the current E2E suite pass or failures are recorded before review; the planning-time Vitest non-completion was rerun in isolation and diagnosed rather than counted as a pass.

## Architecture and non-functional impact

- **Scale:** no runtime hot path changes. Reference states must include a 10,000-logical-row fixture and the bounded rendering rule used in Phase 10.
- **Robustness:** Figma access failure degrades to `BLOCKED`; no screen may proceed with a guessed node.
- **Threat surface:** no new runtime surface. Evidence uses synthetic data and contains no secrets or PII.
- **Source integrity:** critical/high dependency findings, unused TypeScript symbols, and the lack of a
  repeatable dead-code gate block the visual phases. Static findings are leads until route/import/runtime/
  test ownership confirms deletion.
- **UX:** no runtime UI changes. The existing program-wide laws table and every sheet's Section 4 are audited; each new sheet must include all 18 laws plus the interactivity floor with numbers.

## Ordered tasks

1. **Freeze the candidate identity (0.1).** Record branch, HEAD, dirty paths, commands, screenshots, Figma file/node IDs, and token baseline in `.impl-cadence/STATE.md`; verify with `git status`, `git diff --check`, and `pnpm check:program`.
2. **Independently audit the current foundation/shell (0.2).** Run `docs/operations/ux-independent-audit-prompt.md` from a separate session against the live 375, 768, 1280, and 1536 px states and Figma `UhLxGyXphdHHNLGMomBq6n:16:2`; record every finding by law and reference. Acceptance requires exactly seven large top destinations—Dashboard, Projects, Discover, Plan, Execute, Agentix, Consult—with 44 px rows and 20–24 px icons, a desktop product cluster occupying no more than half the rail, a flexible spacer of at least 24 px, and exactly five compact bottom destinations—Settings, Integrations, My approvals, Usage, Help—with 36 px rows.
3. **Expand the surface inventory (0.3).** Add Projects, Settings, Integrations, My approvals, Usage, and Help to `docs/operations/ux-surface-inventory.md`; verify every visible route has exactly one owner sheet.
4. **Create six missing reference sheets (0.4).** Use `ux-reference-sheet.template.md`, examined Mobbin decisions, full laws tables, state matrices, production-component mappings, and distinct owner/verifier/QA fields.
5. **Create and validate six missing Figma frames (0.5).** Use the local Figma variables/components, preserve the accepted two-tier shell, create working/empty/error states as required, add exact node IDs to the sheets and an initial `docs/operations/figma-code-map.json`, add `scripts/check_ux_contract_coverage.py` to the program gate, and run structural/screenshot validation. Phase 1 extends the same manifest with implementation symbols and evidence rather than creating a second authority.
6. **Establish the source-quality and dependency floor (0.6).** Patch critical/high vulnerable tooling
   without broad major-version churn; enable strict unused checks; add a pinned dead-code analyzer and a
   repository-owned `check:source-quality` entry point; classify findings against routes, imports, tests,
   timers, styles, and browser behavior; delete only proven-unreachable code. Record all remaining legacy
   ownership as open RC-19 work—no allowlist or suppression may silently convert a finding into a pass.

## Data and contracts

No schema/API change. Adds six reference-sheet contracts, six Figma node mappings, the initial
route→sheet→node manifest, and its coverage gate.

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
candidate SHA. Rollback reverts the Phase 0 dependency, source, documentation, gate, and Figma changes
together; it never resets or mutates the owner's dirty checkout.

## Definition of Done

- [x] Current foundation/shell has an independent pass or all findings are remediated and re-audited.
- [x] Inventory contains every user-facing route, including Projects and five administrative surfaces.
- [x] Every inventory row resolves to a valid sheet and exact accessible Figma node.
- [x] The coverage gate fails for a missing/duplicate route, sheet, or Figma node and is registered in `pnpm check:program`.
- [x] All sheet/token/program gates pass; no builder self-signs verifier or QA.
- [x] `pnpm audit --audit-level high` reports zero critical/high findings and strict TypeScript reports no unused symbols.
- [x] `pnpm check:source-quality` is deterministic, registered in the program gate, and has no unreviewed finding.
- [x] `.impl-cadence/STATE.md` records the accepted candidate evidence; the PR head and merged SHA are
  recorded immediately after Git creates them.

## Hand-off

Phase 1 starts only from the accepted Phase 0 SHA and re-runs this Definition of Done. No runtime
implementation is authorized by a candidate-only frame.
