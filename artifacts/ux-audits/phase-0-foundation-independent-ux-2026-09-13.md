# Phase 0 foundation — independent UX audit

- **Date:** 2026-09-13
- **Final verdict:** **GATE PASS**
- **Verifier:** Codex task `/root/phase0_ux_verifier`, acting only as the independent UX verifier
- **Separation of duties:** This verifier did not build or remediate the candidate. The builder was the root implementation session; QA is a separate role.
- **Worktree:** `/Users/abhinavshankar/GitHub_Repos/maxion-platform-demo-ux-system-20260913`
- **Branch:** `codex/maxion-demo-ux-system-20260913`
- **Base / current uncommitted HEAD:** `c381e7e50b6cc7e71138fbf4b9c348efc2194df9`
- **Remote:** `https://github.com/MAXION-AI/maxion-platform-demo.git`
- **Candidate state:** Dirty, uncommitted Phase 0 candidate layered over the base above
- **Audit surface:** `/maxion-prototype`, the platform shell/dashboard foundation, and the Phase 0 reference-contract set
- **Primary Figma frame:** file `UhLxGyXphdHHNLGMomBq6n`, node `16:2`

## Scope and verdict boundary

This is an independent UX acceptance of the current Phase 0 foundation candidate. It accepts the
two-tier sidebar, shell accessibility, contract coverage, and the availability of the exact Figma
frames required by Phase 0.

It does **not** promote any reference sheet beyond `contract`, certify later module implementation,
replace final QA, or establish an immutable accepted SHA. The evidence and sign-off cells that are
allowed to remain pending while a sheet is at `contract` must be completed by the later build and gate
phases before those screens can be called built or gated. Phase 0 also remains without an accepted
commit SHA until the owner records one after the full implementation and QA gates.

## References applied

The shell was audited against `docs/operations/ux-reference-sheets/platform-shell-dashboard.md`,
`docs/operations/ux-laws-policy.md`, `docs/operations/mobbin-ai-north-star.md`, and the independent
audit method in `docs/operations/ux-independent-audit-prompt.md`.

The shell sheet's examined references were:

| App | Examined screen | Decision checked |
| --- | --- | --- |
| Cursor | https://mobbin.com/screens/b0eb16b6-7038-4d01-a59b-3a1e8a602dd4 | Short, concrete starting jobs and direct routing |
| Microsoft Copilot | https://mobbin.com/screens/79f6aa12-4967-46a0-b6fa-43462f8c8294 | Familiar rail, greeting, composer, and suggested-action hierarchy |
| v0 | https://mobbin.com/screens/f14348f9-fcff-40bc-ab20-be39fa45ad95 | One unmistakable primary intent with quiet secondary destinations |

## Initial independent findings

The first audit returned **GATE FAIL**. It found the following issues before remediation:

1. **Blocker — mobile drawer keyboard containment and dismissal.** At 375 and 768 px, opening the
   drawer left focus on the visually hidden opener. Escape did not close it. After the eighteenth
   focus stop, Tab entered controls in the visually obscured dashboard while the drawer remained
   open. This violated accessibility precedence, Jakob's Law, and the interactivity floor relative
   to the familiar Microsoft Copilot drawer behavior.
2. **Major — state-matrix claims were not executable or accurately scoped.** The contract described
   disabled, loading, empty, and error states for synchronous fixed navigation without explaining
   whether those states could actually occur. That prevented an honest state-by-state audit.
3. **Polish — the primary stage was not exposed as a named landmark.** Axe reported a moderate
   `region` finding because the module stage was labelled but not represented as a landmark.

A possible contrast issue observed during an earlier intermediate run did not reproduce against the
then-current candidate and was withdrawn before the pre-fix verdict. It is not carried as a finding.

## Remediation independently rechecked

The builder applied remediation and this verifier repeated the live checks against the updated source,
not the stale pre-fix preview bundle.

| Remediation | Independent result |
| --- | --- |
| Transfer focus into the opened mobile drawer | PASS — focus lands on the visible `Close navigation` control |
| Expose mobile drawer as a modal dialog | PASS — `role="dialog"` and `aria-modal="true"` are present while open |
| Remove the underlying workspace from interaction and the accessibility tree | PASS — `.mxp-stage` receives both `inert` and `aria-hidden="true"` |
| Contain forward and reverse keyboard traversal | PASS — Tab wraps last-to-first; Shift+Tab wraps first-to-last; 28 consecutive Tab presses stayed inside |
| Support conventional dismissal | PASS — Escape closes at both 375 and 768 px |
| Restore state after dismissal | PASS — `inert` and `aria-hidden` are removed and focus returns to `Open navigation` |
| Honor reduced-motion preference | PASS — computed transition duration was `0.00001s`; animation name was `none` |
| Give the module stage landmark semantics | PASS — `.mxp-stage` is a named `region`; the Axe `region` finding is gone |
| Make the contract-stage state matrix honest | PASS — synchronous/fixed states now carry explicit `N/A because ...` rationales; real empty and recovery states are named |

No console error or uncaught page error occurred during the post-remediation mobile exercise.

## Viewport measurements

Measurements were collected from the rendered DOM after the responsive drawer transition completed.
The flexible spacer is the blank separation between the 400 px product-cluster boundary and the start
of the account/administration region. The larger final column includes the account label and workspace
units control before the first administrative destination.

| Viewport | Sidebar | Product destinations | Product cluster | Flexible spacer | First admin destination | Admin destinations | Overflow |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1536 × 900 | 248 × 900 px | 7 × 44 px; 20 px icons | y=80–400 | 96 px | y=592 | 5 × 36 px; 16 px icons | 0 px document X; 0 px rail Y |
| 1280 × 900 | 248 × 900 px | 7 × 44 px; 20 px icons | y=80–400 | 96 px | y=592 | 5 × 36 px; 16 px icons | 0 px document X; 0 px rail Y |
| 768 × 1024 | 286 × 1024 px | 7 × 44 px; 20 px icons | y=80–400 | 220 px | y=716 | 5 × 36 px; 16 px icons | 0 px document X; 0 px rail Y |
| 375 × 844 | 286 × 844 px | 7 × 44 px; 20 px icons | y=80–400 | 40 px | y=536 | 5 × 36 px; 16 px icons | 0 px document X; 0 px rail Y |

The product destinations are exactly Dashboard, Projects, Discover, Plan, Execute, Agentix, and
Consult Max. The administrative destinations are exactly Settings, Integrations, My approvals,
Usage, and Help. The desktop product cluster occupies less than half of the 900 px rail. At every
audited width, administration begins in the lower half and the flexible spacer exceeds the 24 px
minimum.

All twelve destinations were activated in the initial pass and received `aria-current="page"` when
selected. Observed visual acknowledgement ranged from 24.7 ms to 305 ms, below the 400 ms Doherty
threshold.

## Laws check

| Law | Verdict | Measured evidence |
| --- | --- | --- |
| Hick's | PASS | Exactly 7 product choices and 5 separately grouped administration choices |
| Fitts's | PASS | Product rows are 44 px with 20 px icons; administration rows are 36 px with 16 px icons; no audited target is below 24 px |
| Jakob's | PASS | Familiar persistent desktop rail and modal mobile drawer; Escape, focus entry, containment, and restoration now behave conventionally |
| Proximity | PASS | Items are grouped with compact within-group spacing and a flexible 40–220 px inter-group spacer across audited widths |
| Miller's | PASS | Two bounded chunks contain 7 and 5 destinations; neither exceeds 7 |
| Doherty | PASS | Navigation acknowledgement measured 24.7–305 ms, below 400 ms |
| Von Restorff | PASS | Exactly one current route receives the dominant active treatment |
| Serial Position | PASS | Product work is first; account and administrative work is last |
| Peak-End | PASS | No completion journey belongs to the Phase 0 navigation-foundation slice; later module completion states remain contract-stage obligations |
| Zeigarnik | PASS | Live attention badges and workspace-unit progress keep incomplete work visible |
| Law of Prägnanz | PASS | One dominant module region is supported by one quiet navigation rail |
| Law of Similarity | PASS | Exactly two role-specific treatments distinguish product from administration |
| Uniform Connectedness | PASS | Related destinations remain enclosed by their labelled product or administration section |
| Tesler's | PASS | Entering a registered destination requires one bounded user decision; module complexity remains behind the route |
| Postel's | PASS | Fixed registered routes accept every declared destination; fallible text-input behavior remains owned by the later module contracts |
| Parkinson's | PASS | Each shell destination begins its top job in one action |
| Occam's Razor | PASS | No duplicate primary destination appears in the rail |
| Pareto | PASS | Dashboard, Projects, and all five principal modules remain immediately reachable in the first viewport |
| Interactivity floor | PASS | Navigation, attention, units, and command entry are actionable; badges are live; mobile keyboard operation has no dead end |

## State-matrix boundary

The initial state-matrix concern does not remain a Phase 0 major. Phase 0 intentionally establishes
contracts and Figma authority while the module sheets remain at `contract`. The revised shell matrix
now distinguishes impossible states from applicable states:

- Registered navigation is never disabled or empty, and its local route transition is synchronous,
  so those cells explain why disabled/loading/empty are inapplicable.
- Navigation-owned errors preserve an operable rail and Dashboard recovery through the module error
  boundary.
- Attention genuinely has an empty state and explains when nothing needs the operator.
- The bounded local command registry has a real no-match state and no network-backed loading/error
  state.

Those explanations are sufficient for Phase 0 contract acceptance. The sheet's pending Section 7
artifacts still block later promotion beyond `contract`; this audit does not waive that future gate.

## Accessibility evidence

An Axe WCAG 2 A/AA and WCAG 2.1 A/AA run returned zero violations in each audited state:

| State | Axe violations |
| --- | --- |
| 1536 × 900, desktop shell | 0 |
| 1280 × 900, desktop shell | 0 |
| 768 × 1024, mobile drawer open | 0 |
| 375 × 844, mobile drawer open | 0 |

Keyboard-only interaction, visible focus, Escape dismissal, focus restoration, background inertness,
and reduced motion were also checked manually because automated Axe analysis does not prove those
behaviors.

## Figma evidence

The Figma connector resolved every exact node in `docs/operations/figma-code-map.json`. Each root is a
1440 × 900 product frame with the shared two-tier sidebar. Dashboard and Agentix run-canvas screenshots
were additionally inspected visually.

| Surface | Figma node |
| --- | --- |
| Platform shell/dashboard | `16:2` |
| Projects | `40:478` |
| Discover | `18:45` |
| Plan | `19:86` |
| Execute | `20:125` |
| Agentix operations | `21:175` |
| Agentix run canvas | `46:933` |
| Consult Max | `22:225` |
| Settings | `43:559` |
| Integrations | `43:786` |
| My approvals | `43:1013` |
| Usage | `43:1234` |
| Help | `43:1461` |

## Gate evidence

The independent verifier ran the following read-only checks against the remediated working tree:

| Check | Result |
| --- | --- |
| `python3 scripts/check_ux_reference_sheet.py --all` | PASS — 13 sheets |
| `python3 scripts/check_ux_contract_coverage.py` | PASS — 13 surfaces |
| `python3 scripts/check_ux_tokens.py` | PASS — 10 baselined files, 1,357 literals, none new |
| `python3 -m unittest discover -s scripts/tests -p 'test_ux_gates.py'` | PASS — 19 tests |
| `git diff --check` | PASS |
| Exact browser keyboard scenario at 375 and 768 px | PASS |
| Axe at 375, 768, 1280, and 1536 px | PASS — zero A/AA violations |

Builder-owned evidence reported separately from this independent pass:

- `pnpm check:program` passed after the retired commented CSS theme was removed.
- The full Chromium suite passed 44/44 before the focused accessibility remediation.
- The builder's added 375 × 812 focus-containment regression passed after remediation.

## Final verdict

**GATE PASS — Phase 0 independent UX acceptance.**

The exact sidebar hierarchy, target sizes, responsive placement, navigation feedback, keyboard
behavior, accessibility semantics, Figma-node availability, laws contract, and interactivity floor
meet the Phase 0 acceptance boundary. No blocker or major finding remains.

This verdict applies to the current dirty candidate over base
`c381e7e50b6cc7e71138fbf4b9c348efc2194df9`. It is not an accepted SHA, final QA, deployment evidence,
or approval to treat the module sheets as anything beyond `contract`.
