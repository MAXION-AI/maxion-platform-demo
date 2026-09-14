# Independent UX audit — hand-off prompt

Use this to start a **separate session** (Codex, or a fresh Claude Code context) that audits a built
screen against its reference sheet. The builder never runs this on their own work. Paste the prompt
below, replacing every input. A report label or session ID does not authenticate a person; the
coordinator remains responsible for actual separation from the builder.

---

You are the independent verifier for one manifest-declared acceptance scope in the Maxion platform.
You did not build it. For `phase-surfaces` or `all-surfaces`, decide whether the built screen set meets
its contract. For Phase 11 `package`, decide whether the non-visual adoption package is complete,
traceable, honest about its proof boundary, reversible, and safe to bootstrap.

Inputs:

- Phase: `<N>`
- Acceptance scope kind: `<phase-surfaces | all-surfaces | package>`
- Candidate commit: `<exact 40-character C>`
- Candidate source tree: `<exact C:src tree>`
- Reviewer label: `<reviewer>`; builder label: `<builder>`
- Verifier session ID: `<session-id>`; absolute detached worktree: `<absolute-path>`
- Reference sheet: `docs/operations/ux-reference-sheets/<sheet>.md`, or `[]` for `package`
- Running app: `<url or how to start the preview>`, or `N/A because package scope owns no UI`
- Canon: `docs/operations/ux-laws-policy.md` (laws, precedence, surface classes, interactivity floor)
  and `docs/operations/mobbin-ai-north-star.md` (references and the decisions they stand for)

Method for `phase-surfaces` and `all-surfaces` (do all of it; do not skip to opinions):

1. Read the sheet in full. Open every Mobbin link in §2 through the Mobbin connector and read the
   screens. Fetch the Figma frame named in §2 through the Figma connector.
2. Operate the live screen as the target user for each top job in §1. Trigger every state in §5:
   loading, empty, error, disabled, and the live run states. Use the browser tools; do not audit from
   source alone.
3. Put the built screen beside the Figma frame and beside each §2 reference. For every §2 decision,
   record whether the build implements it, in words.
4. Walk the §4 laws-check row by row. For each row, state PASS or FAIL with the measured number
   (target sizes, counts, timings on a throttled network) and the evidence (screenshot path).
5. Run the interactivity floor: try to act on every state the screen shows. Run the static-report
   test — if a screenshot could be printed to PDF with no loss of capability, it fails.
6. Check the look comes only from tokens: run `scripts/check_ux_tokens.py`; inspect computed styles
   on the primary controls and confirm they resolve to theme variables.
7. Run the accessibility check: keyboard-only through the top job, visible focus everywhere, Esc
   closes, reduced-motion honoured, contrast at AA.

Method for `package` (Phase 11 only):

1. Do not invent a user-facing surface audit. Do not fetch Figma or Mobbin, re-run the laws-check,
   claim browser interaction, or require reference sheets. The already accepted Phase 10 whole-surface
   review is the UI authority; this review is only for the immutable adoption package.
2. Prove **package integrity**: every declared demo surface, semantic state, token, primitive,
   route/address, object/event, evidence class, responsive rule, accessibility rule, and measured
   budget occurs exactly once or has an explicit, machine-checkable disposition.
3. Prove **traceability**: every package row binds its accepted Phase 10 source/hash/evidence and a
   production responsibility or explicit gap without claiming unverified MaxAI compatibility.
4. Prove the **proof boundary**: deterministic demo evidence is not represented as proof of MaxAI
   auth, tenancy, persistence, workers/providers, deployment, capacity, or production SLOs.
5. Prove **rollback** and **bootstrap**: the package can be reverted without changing the qualified
   demo, and the separate MaxAI stream starts from fetched `origin/main` with its own plan, ledger,
   reviewers, worktree, SHA chain, and mapping audit before implementation.

Surface/all-surfaces finding format (one finding per line; a finding without a law and a reference is
not a finding):

- **Where** — screen, state, element (screenshot path)
- **What the user experiences** — in human terms
- **Law violated** — from the canon; **Reference** — the §2 app and link it departs from
- **Fix** — a concrete, buildable change with the value
- **Severity** — blocker / major / polish, per the canon's map

Package finding format names the package file/row, which of the five integrity dimensions fails, the
exact missing/mismatched boundary, a concrete correction, and blocker/major/polish severity. It does
not attach an unrelated UX law or visual reference.

For a surface/all-surfaces report, end with:

- The laws-check table from §4 re-stated with PASS / FAIL per row and the measured numbers.
- The interactivity-floor verdict per state.
- The token-lint result and the accessibility result.
- A single verdict: **GATE PASS** only if no blocker or major is open; otherwise **GATE FAIL** with
  the list of what must change.

For a package report, end with PASS/FAIL plus committed evidence for each of `package-integrity`,
`traceability`, `proof-boundary`, `rollback`, and `bootstrap`, followed by the same single GATE verdict.
Do not add a laws table, interactivity verdict, token result, accessibility result, responsive result,
Figma/Mobbin evidence, or browser run.

The engineering QA report for a surface scope uses the same common identity keys with `role: "qa"`
and the ordered QA checklist from the acceptance protocol. Its `browserRuns` contains exactly three
records with keys `runId`, `runSha`, `command`, `startedAt`, `finishedAt`, `cleanBefore`, `cleanAfter`,
`browser`, `browserVersion`, `viewport`, `fixture`, `status`, `exitCode`, `artifactPath`, and
`artifactSha256`. Each record binds C, exact unfiltered `pnpm test:e2e`, UTC times, clean state before
and after, PASS/zero, and a distinct committed phase-scoped artifact. For Phase 10 `all-surfaces`, the
`browser-e2e` checklist evidence also names `strict-preview-runs.json`; that schema-v2 index binds C,
`C:src`, and exactly the same three ordered run records. A filtered or edited retry cannot satisfy it.

For either scope:

- Save detailed evidence under `artifacts/ux-audits/phase-<N>/`. Every checklist evidence
  path below must name a committed regular artifact in that directory.
- Emit exactly one machine-readable report at
  `artifacts/ux-audits/phase-<N>/independent-ux.json`. Use schema version 2 and exactly these keys;
  unknown keys fail the gate:

```json
{
  "schemaVersion": 2,
  "program": "maxion-platform-demo-ui-foundation",
  "phase": 0,
  "role": "ux",
  "reviewer": "<reviewer>",
  "builder": "<builder>",
  "candidateSha": "<C>",
  "sourceTreeSha1": "<C:src>",
  "sessionId": "<session-id>",
  "worktree": "<absolute-clean-detached-worktree>",
  "cleanCheckout": true,
  "scopeKind": "phase-surfaces",
  "referenceSheets": ["docs/operations/ux-reference-sheets/<sheet>.md"],
  "checks": [
    {"id": "figma-context", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-0/figma-context.json"]},
    {"id": "figma-screenshot", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-0/figma-comparison.png"]},
    {"id": "mobbin-references", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-0/mobbin-decisions.md"]},
    {"id": "laws-check", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-0/laws-check.json"]},
    {"id": "interactivity-floor", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-0/interactivity.json"]},
    {"id": "token-gate", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-0/token-gate.json"]},
    {"id": "accessibility", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-0/accessibility.json"]},
    {"id": "responsive-viewports", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-0/responsive.json"]}
  ],
  "verdict": "PASS"
}
```

For `package`, emit the same common keys with `"scopeKind": "package"`,
`"referenceSheets": []`, and exactly these ordered checks. The UX and QA reports use this same
package checklist; neither report contains `browserRuns`:

```json
{
  "schemaVersion": 2,
  "program": "maxion-platform-demo-ui-foundation",
  "phase": 11,
  "role": "ux",
  "reviewer": "<reviewer>",
  "builder": "<builder>",
  "candidateSha": "<C>",
  "sourceTreeSha1": "<C:src>",
  "sessionId": "<session-id>",
  "worktree": "<absolute-clean-detached-worktree>",
  "cleanCheckout": true,
  "scopeKind": "package",
  "referenceSheets": [],
  "checks": [
    {"id": "package-integrity", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-11/package-integrity.json"]},
    {"id": "traceability", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-11/traceability.json"]},
    {"id": "proof-boundary", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-11/proof-boundary.json"]},
    {"id": "rollback", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-11/rollback.json"]},
    {"id": "bootstrap", "status": "PASS", "evidence": ["artifacts/ux-audits/phase-11/bootstrap.json"]}
  ],
  "verdict": "PASS"
}
```

Replace every example `0` with the input phase. `referenceSheets` must equal the acceptance scope from
the candidate manifest: the phase-owned sheets normally, all 13 sheets in Phase 10, and `[]` for the
Phase 11 package scope. Use `scopeKind: "all-surfaces"` for Phase 10 and
`scopeKind: "phase-surfaces"` for ordinary UI phases. If any checklist item fails, do not fabricate
this PASS report; return GATE FAIL and leave the phase open.

Do not accept "it looks close". The sheet defines "exactly like it"; anything not on the sheet is a
finding, not a preference.
