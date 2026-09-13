# Hardening log — Maxion platform demo UI foundation plan

- **Plan:** [00-parent-roadmap.md](./00-parent-roadmap.md)
- **Started:** 2026-09-13
- **Status:** Phase 0 independently accepted; full-roadmap final hardening remains pending
- **Writer:** Primary Codex planning session

## Review protocol

Each round examines the complete roadmap and every phase document against four lenses:

1. Completeness and traceability: every RC, decision, state, test, failure, rollback, and handoff is owned.
2. Correctness and architecture: contracts, dependency order, authority, trust labels, production boundary, and NFRs are internally consistent.
3. Executability: a fresh implementation session can act without guessing at files, entry criteria, commands, evidence, or pass/fail criteria.
4. Final sign-off: an independent reviewer reopens the plan if any blocker/major ambiguity remains.

All blocker and major findings are resolved in the plan, not merely acknowledged here. Minor findings may
remain only when they do not change implementation behavior or acceptance and have a named owner.

## Round register

| Round | Reviewer lens | Blockers | Majors | Minors | Disposition |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Primary fresh-eyes completeness / correctness / executability | 0 | 4 | 1 | Four majors revised; one execution-baseline minor owned by Phase 0 |
| 2 | Primary clean rerun after revision | 0 | 0 | 1 | Clean for blocker/major; baseline minor remains explicitly owned |
| 3 | Primary traceability and contradiction rerun | 0 | 0 | 1 | Second consecutive blocker/major-clean self-review |
| C | Independent final sign-off | — | — | — | Not run for the full roadmap; separate UX and engineering reviewers accepted the Phase 0 slice only |

## Finding register

| ID | Severity | Finding and risk | Applied change | Verification |
| --- | --- | --- | --- | --- |
| H-01 | Major | Phase 11 used an unverified `maxion/main` ref although the inspected production checkout tracks `origin/main`; execution could pin the wrong source | Replaced it with a fresh fetched `origin/main` requirement and retained the dirty-owner-checkout prohibition | Repository text scan contains no `maxion/main` |
| H-02 | Major | Phase 0 expected an inventory/Figma coverage failure before any manifest/checker owner existed, while Phase 1 also claimed it would create that authority | Phase 0 now creates the initial route→sheet→node manifest and coverage gate; Phase 1 extends that same authority with code/evidence mappings | Task and DoD review shows one owner and no circular dependency |
| H-03 | Major | Verification and visual parity lacked executable commands, browser matrix ownership, and numeric tolerance | Added standard commands, candidate/evidence identity requirements, 2 px/1 px/1.5% visual tolerances, and explicit WebKit registration in Phase 10 | Structural scan and roadmap review pass |
| H-04 | Major | The user's sidebar requirement was described semantically but not measurable, allowing administrative destinations to drift into the primary module cluster | Added exact seven/five destinations, 44/36 px rows, 20–24 px primary icons, ≤50% product-cluster height, ≥24 px flexible spacer, mobile/focus checks, and the same production-pilot contract | Phase 0, program laws table, Phase 9, and Phase 11 agree |
| H-05 | Minor | The initial full Vitest command stopped producing progress for more than two minutes while the platform-page suite was active and was interrupted; it was not valid pass evidence | Recorded it in roadmap grounding, reran it without truncating or piping its exit status, and retained the slow-suite observation as Phase 1 performance debt | Post-audit `pnpm test` passes 3 files and 38 active-runtime tests in 370.97 seconds; no pass is inferred from the interrupted run |
| H-06 | Blocker | Default Knip treated a component imported only by its own unit test as reachable, allowing the manifest to falsely name a dead Agentix predecessor as runtime owner | Deleted the predecessor closure, remapped the run canvas to `DeployedAgentsPage` → `RunDetail`, added production-mode Knip classification, production-entry reachability validation, and two regression tests | Program gate passes; production source gate passes; 19/19 self-tests pass; full unit and browser suites pass |
| H-07 | Blocker | Mobile navigation did not receive or contain focus, ignored Escape, and left the obscured stage interactive | Added modal semantics, stage inertness, Tab/Shift+Tab containment, Escape dismissal, opener restoration, and a real 375 px browser regression | Independent UX rerun passes at 375/768/1280/1536 with zero WCAG A/AA Axe findings; full 45-test browser suite passes |

Structural review found 12 phase documents, 18 registered requirements, 18 uniquely mapped requirements,
and thirteen exact accessible Figma nodes in the editable program file. The placeholder/stale-ref scan is
clean. Current program gates pass: thirteen reference sheets, the 1,357-literal raw-colour ratchet,
nineteen gate self-tests, strict TypeScript, ESLint, default Knip, and production-source Knip. The
production build passes but confirms existing debt at 387.56 kB gzip JS and 85.90 kB gzip CSS against the
Phase 1 targets of 250/60 kB.

## Convergence rule

The plan is hardened only after two consecutive independent rounds report zero blocker and zero major
findings, followed by an independent final sign-off. The maximum is five revision rounds. This session
completed two consecutive blocker/major-clean self-review rounds, but that does not substitute for
independent review; the result remains `self-reviewed draft`, never `independently hardened`.
