# Maxion platform demo — Figma UX reference program

- **Status:** contract-complete; Phase 0 PR merged; clean-SHA independent acceptance and built/gated evidence pending
- **Date:** 2026-09-13
- **Source worktree:** `/Users/abhinavshankar/GitHub_Repos/maxion-platform-demo-ux-system-20260913`
- **Branch:** `codex/maxion-demo-ux-system-20260913`
- **Historical build base:** `c381e7e50b6cc7e71138fbf4b9c348efc2194df9`
- **Historical Phase 0 PR head / merge:** `dfc0347c876b36dc9932808b786d219c2cb8c949` / `beae208b30ad31202c4ff92abbfbd6c1ef51af18`; these identify the runtime-contract lineage, not the eventual acceptance base.
- **Acceptance caveat:** existing reports audited a dirty pre-commit tree; they do not accept the PR
  head or merge SHA. The superseding hardening PR must receive fresh clean-C and clean-M independent reruns; its final accepted M becomes Phase 1 B.
- **Figma file:** [Maxion Platform Demo — UX Reference Program](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program)
- **Figma file key:** `UhLxGyXphdHHNLGMomBq6n`
- **Tracked ledger:** `docs/operations/program-phase-ledger.json`
- **Operational authority:** `/Users/abhinavshankar/.codex/program-ledgers/maxion-platform-demo-ui-foundation/ledger.json` under the atomic/hash-chain protocol

## Why a new file exists

The inherited Agentix reference file `IAwuMHHfqiATiecHV0SSyu` rejected writes and later stopped being
readable to the authenticated full-seat account. The editable Maxion program file therefore owns the
complete contract, including a replacement Agentix run-canvas frame. The inherited node `60:1249`
remains historical provenance only and is not a build or gate dependency.

## Foundations

The code theme in `src/styles.css` remains the source of truth. Figma mirrors it through four local
variable collections:

| Collection | Figma ID | Modes | Variables |
|---|---|---:|---:|
| Primitives | `VariableCollectionId:2:2` | Value | 48 |
| Color | `VariableCollectionId:2:3` | Light, Dark | 24 |
| Dimension | `VariableCollectionId:2:4` | Value | 13 |
| Motion | `VariableCollectionId:2:5` | Value | 7 |

All 48 semantic color mode assignments are aliases to local primitives. Validation found zero broken
aliases, zero `ALL_*` scopes, and zero missing web code syntax entries. The file also carries eight
Geist/Geist Mono text styles and six exact CSS-aligned elevation styles.

## Components

| Library asset | Figma ID | Variants | Contract |
|---|---|---:|---|
| Button | `12:33` | 12 | Primary/secondary plus default, hover, focus, active, disabled, loading; 44 px high |
| Nav item | `13:30` | 4 | Product destinations only; default, hover, focus, selected; 44 px row and 20 px icon |
| Utility nav item | `31:308` | 4 | Administrative destinations only; default, hover, focus, selected; 36 px row and 16 px icon |
| Badge | `13:45` | 6 | Neutral, accent, success, warning, danger, info with text labels |
| Card | `14:40` | 5 | Default, hover, selected, loading, recoverable error |
| Composer | `14:67` | 4 | Empty, drafting, submitting, recoverable error with preserved input |
| Sidebar administration | `33:6` | 1 | Bottom-anchored units, Settings, Integrations, My approvals, Usage, and Help composition |

The component validation found six component sets with 35 variants plus one composed component, no
missing descriptions, and no undersized Button or navigation target.

The Patterns page (`29:2`) documents four product-wide compositions: attached decision, live
progress, recoverable failure, and grounded answer. Final file validation found six documented pages
and no blank page.

## Reference frames

| Surface | Figma node | Purpose |
|---|---|---|
| Dashboard | [`16:2`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=16-2) | Operating overview with attached decisions and recent verified outcomes |
| Discover | [`18:45`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=18-45) | Active interview, evidence rail, and contextual composer |
| Plan | [`19:86`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=19-86) | Sectioned plan artifact, approval package, and open decision |
| Execute | [`20:125`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=20-125) | Live run, stage timeline, steering, gates, and explicit deployment boundary |
| Agentix | [`21:175`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=21-175) | Today view with attached approval/question, active agents, activity, and composer |
| Agentix run | [`46:933`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=46-933) | Live conversation timeline, plain-word actions, attached approval, evidence, steering, and run details |
| Consult Max | [`22:225`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=22-225) | Grounded cross-module answer, source scope, routed action, and composer |
| Projects | [`40:478`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=40-478) | Searchable project portfolio with attached state, actions, and a selected-project assistant |
| Settings | [`43:559`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-559) | Validated workspace defaults, security boundaries, save recovery, and audit context |
| Integrations | [`43:786`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-786) | Connected principals, scopes, health, expiry, and authority-preserving recovery |
| My approvals | [`43:1013`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-1013) | Assigned queue plus exact object, version, consequence, evidence, expiry, and decision |
| Usage | [`43:1234`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-1234) | Bounded unit usage by module with pace, alert, and record-level traceability |
| Help | [`43:1461`](https://www.figma.com/design/UhLxGyXphdHHNLGMomBq6n/Maxion-Platform-Demo-UX-Reference-Program?node-id=43-1461) | Context-ranked task guidance, direct recovery, service health, and support hand-off |

All thirteen frames are local, editable, and 1440 × 900. The sidebar in every frame has exactly seven product destinations in
the upper region — Dashboard, Projects, Discover, Plan, Execute, Agentix, and Consult MAX — followed
by a flexible gap. A distinct bottom-anchored administrative region contains Workspace units,
Settings, Integrations, My approvals, Usage, and Help above the tenant footer. Product rows are 44 px
with 20 px icons; administrative rows are 36 px with 16 px icons. Integrations is absent from product
navigation.

Structural validation found zero visible sidebar overflow and 324 shared component instances across
the thirteen local frames. Every frame has seven product rows and five utility rows; the eight product
screens select exactly one product row, and each administrative screen selects
exactly one utility row while leaving the product tier visually quiet. Every administrative group
starts at y=516, below the 450 px viewport midpoint, and ends at y=796 above the tenant identity block.

## Live implementation comparison

The browser comparison was run locally at 1440 × 900 against `/maxion-prototype`. The existing
Dashboard, Discover, Plan, Execute, Agentix, and Consult Max entry surfaces loaded and remained
interactive. The Figma frames intentionally represent high-value working and decision states while
the current entry surfaces retain their valid hub, empty, or fleet states. The reference sheets' state
matrices govern both; a single frame must not be misread as authorization to delete other required
states.

Local capture files for this run are `/tmp/maxion-live-dashboard.png`,
`/tmp/maxion-live-discover.png`, `/tmp/maxion-live-plan.png`, `/tmp/maxion-live-execute.png`,
`/tmp/maxion-live-agentix.png`, and `/tmp/maxion-live-consult.png`. The corrected live shell capture is
`/tmp/maxion-live-sidebar-refactor.png`; its matching Figma render is
`/tmp/maxion-sidebar-refactor-dashboard.png`. The Projects and administrative screenshots were
visually inspected after creation; they are candidate contract frames, not builder-certified proof.

## Current gate result

- `pnpm check:program`: PASS
- UX reference sheets: 13/13 pass at contract stage
- UX token ratchet: PASS at 10 baselined files and 1,342 literals at `34abf62aae1dbb47ded211fbf84a2146d8af0fa9`, with no growth
- Discovered gate self-test suite: PASS; the pinned CI run records the exact count for its SHA
- TypeScript: PASS
- Focused Playwright sidebar geometry, interaction timing, reduced motion, and axe check: PASS
- Independent Phase 0 UX audit: GATE PASS at 375, 768, 1280, and 1536 px with zero WCAG A/AA
  Axe violations; report `artifacts/ux-audits/phase-0-foundation-independent-ux-2026-09-13.md`.
- Module sheets remain at `contract`; later implementation phases must attach built/gated evidence and
  distinct sheet-level verifier/QA sign-offs.
