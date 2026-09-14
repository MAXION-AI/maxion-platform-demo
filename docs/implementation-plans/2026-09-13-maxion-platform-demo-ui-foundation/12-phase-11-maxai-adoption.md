# Phase 11: Freeze the MaxAI adoption package

- **Parent:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Closes:** RC-17 | **Risk:** medium × high | **Status:** Not started
- **Depends on:** Phase 10 accepted demo merge SHA

## Objective and scope

Package the qualified demo UX contract into a complete, immutable, demo-owned handoff for a separate
`max-ai-platform` production-adoption program. This phase changes only this repository. It does not
create a MaxAI worktree, change MaxAI source, pilot production UI, deploy, or claim production
qualification. That work requires its own plan, base SHA, ledger, phase chain, reviewers, and PRs in
the MaxAI repository.

## Entry criteria and authority

- [ ] Phase 10 has a verified merge SHA M, clean-M post-merge qualification, and a checksum-valid
  external ledger record.
- [ ] All thirteen sheets are gated with exact semantic state IDs, three distinct sign-offs, and
  implementation evidence.
- [ ] Schema-v2 Figma map has current hashes, evidence paths, and a fresh remote connector attestation.

The reference sheet for each surface is the sole Mobbin authority. Figma frame and component ownership
comes only from the schema-v2 manifest and its remote attestation; this phase may not guess missing
component IDs.

## Architecture, scale, security, and reliability

Create a versioned adoption-package directory containing machine-readable and human-readable contracts.
It maps each demo token, primitive, route/address, semantic state, object/event, evidence class, authority
boundary, responsive rule, accessibility rule, and measured budget to the production responsibility it
will require. Production paths are recorded only as inspection targets, never asserted as compatible
without a fresh MaxAI audit. The package contains synthetic/redacted evidence only, has no secrets or
PII, and does not copy demo runtime code.

The package explicitly carries the demo's proof boundary: deterministic browser fixtures do not prove
10,000 concurrent users, API authorization, tenant isolation, databases, queues, providers, deployment,
or production SLOs. Those become mandatory MaxAI plan inputs.

## Ordered tasks

1. **Freeze demo inputs (11.1).** Record Phase 10 M, source tree, lockfile, schema-v2 manifest, every
   sheet hash, evidence index, bundle/performance results, and remote Figma attestation.
2. **Write the adoption contract (11.2).** Create
   `docs/operations/maxai-ui-foundation-adoption/{README.md,contract.json,traceability.md,open-gaps.md}`
   with one entry per surface/state/token/primitive/object/authority/evidence/responsive contract.
3. **Verify package integrity (11.3).** Add `scripts/check_maxai_adoption_package.py` plus negative
   tests for an omitted state, mismatched sheet hash, missing evidence, guessed component ID,
   unclassified API/auth/tenant gap, and demo-code import.
4. **Define the separate-stream bootstrap (11.4).** Document that the MaxAI coordinator fetches
   `max-ai-platform/origin/main`, creates a new external ledger and plan in that repository, audits
   real tokens/components/routes/queries/auth/tenancy, and maps every adoption-package row before code.
5. **Audit and close the package (11.5).** Independent UX and engineering reviewers audit clean C;
   evidence-only E and merge M follow the phase acceptance protocol; rerun clean-M package/program gates.

### Cold-executor contracts

| Task | Serves | Exact files/symbols | Prerequisite | Focused verification |
| --- | --- | --- | --- | --- |
| 11.1 | RC-16 and RC-17 via ADR-6 | `docs/operations/maxai-ui-foundation-adoption/contract.json#source`; `docs/operations/program-phase-ledger.json#phases[10]` | Accepted Phase 10 M and frozen demo evidence | `python3 scripts/program_ledger.py validate-tracked` |
| 11.2 | RC-03 and RC-17 via ADR-6 | `docs/operations/maxai-ui-foundation-adoption/contract.json#surfaces`; `docs/operations/maxai-ui-foundation-adoption/traceability.md#Surface-map` | Task 11.1 frozen inputs | `python3 scripts/check_maxai_adoption_package.py` |
| 11.3 | RC-16 and RC-17 via ADR-6 | `scripts/check_maxai_adoption_package.py#check_package`; `scripts/tests/test_maxai_adoption_package.py#MaxAIAdoptionPackageTests` | Task 11.2 complete package | `python3 -m unittest scripts.tests.test_maxai_adoption_package` |
| 11.4 | RC-17 and RC-18 via ADR-1 | `docs/operations/maxai-ui-foundation-adoption/README.md#Separate-production-adoption-stream`; `docs/operations/maxai-ui-foundation-adoption/open-gaps.md#Production-gaps` | Task 11.3 package integrity gate | `python3 scripts/check_maxai_adoption_package.py` |
| 11.5 | RC-01 and RC-17 via ADR-8 | `artifacts/ux-audits/phase-11/package-review.md`; `docs/operations/phase-acceptance-protocol.md#Evidence-only-closure` | Tasks 11.1 through 11.4 green at C | `python3 scripts/check_phase_acceptance.py --candidate "$C" --evidence "$E" --phase 11` |

## Files, outputs, commands, evidence, and PR closure

| Kind | Exact files / outputs / commands | Passing evidence |
| --- | --- | --- |
| Package | `docs/operations/maxai-ui-foundation-adoption/{README.md,contract.json,traceability.md,open-gaps.md}` | Every demo surface/state/contract maps to a production responsibility or explicit gap |
| Gate/tests | `scripts/check_maxai_adoption_package.py`; `scripts/tests/test_maxai_adoption_package.py`; register in `check_program_gates.sh` | All six negative fixtures fail for the intended reason; committed package passes |
| Evidence/commands | `artifacts/ux-audits/phase-11/**`; `pnpm check:program`; `pnpm build`; `pnpm audit --audit-level high`; package self-tests; `git diff --check` | C-bound UX/QA reports, hashes, exact exit codes, no demo runtime import |
| PR lifecycle | Verify Phase 10 M as B; isolated adoption-package branch/worktree; commit clean C; independent audits; commit required distinct evidence-only E; true B+E two-parent M; clean-M gates; atomic external-ledger close | Demo PR URL and B/C/E/M; protected-object equality; exact target ref; verified final demo M |

## Test, failure, and rollback

Package validation is deterministic and offline. A missing or mismatched row blocks completion; the
package never invents a production mapping. If MaxAI cannot satisfy a contract, `open-gaps.md` names
the missing UI, API, authorization, data, observability, capacity, migration, or release work and the
future production plan owns it.

Rollback is a reviewed revert PR for this package only. The Phase 10 qualified demo remains coherent and
unchanged. There is no production flag or deployment rollback in this phase.

## Definition of Done

- [ ] The adoption package covers all thirteen surfaces and every stable semantic state exactly once.
- [ ] All hashes/evidence/attestations point to Phase 10 M and no guessed Figma or production claim exists.
- [ ] Package negative tests and program/build/security/diff gates pass.
- [ ] Independent clean-C UX and engineering reports pass; demo PR is merged and clean-M verified.
- [ ] External demo ledger closes at M and names the separate MaxAI plan/ledger bootstrap without
  creating or modifying that stream.

## Hand-off

The demo repository is immutable after this accepted merge except for reviewed corrections. A new,
separately approved implementation plan in `max-ai-platform` consumes this package from a fetched
`origin/main` base. Its SHAs and PRs are unrelated to the demo ancestry chain.

### Structured acceptance hand-off

```json
{"schemaVersion":1,"phase":11,"nextPhase":null,"status":"pending","evidence":[],"reviewers":{"ux":"pending","qa":"pending"}}
```
