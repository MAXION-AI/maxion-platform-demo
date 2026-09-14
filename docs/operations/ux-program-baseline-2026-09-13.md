# UX program baseline — 2026-09-13

## Checkout identity

- Worktree: `/Users/abhinavshankar/GitHub_Repos/maxion-platform-demo-ux-system-20260913`
- Branch: `codex/maxion-demo-ux-system-20260913`
- Starting revision: `c381e7e50b6cc7e71138fbf4b9c348efc2194df9`
- Source: the exact tracked diff plus six relevant untracked source/test files from the owner checkout.
- Preservation: the owner checkout was not reset, stashed, edited, committed, or cleaned. Its local
  `.claude/launch.json` was deliberately not copied.

## Reproducible command baseline

| Check | Command | Result |
| --- | --- | --- |
| Dependency install | `pnpm install --frozen-lockfile` | PASS; lockfile honored; existing ignored esbuild build-script warning |
| Production bundle | `pnpm build` | PASS; CSS 524.36 kB, JS 1,345.47 kB; Vite warns the main chunk exceeds 500 kB |
| Type safety | `pnpm check-types` | PASS |
| UX gate self-tests | `pnpm test:ux-gates` | PASS; 12 tests |
| Reference contracts | `pnpm check:ux:sheets` | PASS; 7 contract-stage sheets |
| Raw-color ratchet | `pnpm check:ux:tokens` | PASS against inherited baseline; 13 files / 1,463 literals; none new |
| Browser journeys | `pnpm test:e2e` | PASS; 43 tests in 3.3 minutes after installing the locked Playwright Chromium |
| Platform unit file | `pnpm exec vitest run src/features/platform-prototype/__tests__/MaxionPlatformPrototypePage.spec.tsx --reporter=verbose` | PASS; 10 tests in 297.93 seconds |
| Agentix deployed-agent unit file | targeted Vitest run | PASS; 25 tests in 2.6 seconds |
| Agentix canvas unit file | targeted Vitest run | PASS; 6 tests in 6.3 seconds |
| Complete inherited unit suite | `pnpm test -- --reporter=verbose` | PASS; 41 tests in 275.63 seconds; the new recovery-boundary tests run separately in 1.35 seconds |
| Post-foundation production bundle | `pnpm build` | PASS; CSS 529.11 kB, JS 1,347.71 kB (380.57 kB gzip); inherited large-chunk warning remains |
| Post-audit-remediation program gate | `pnpm check:program` | Historical PASS at its recorded revision; 13 sheets, token ratchet at 10 files / 1,357 literals, the then-discovered gate self-test suite, strict TypeScript, ESLint, default Knip, and production-source Knip |
| Post-audit-remediation complete unit suite | `pnpm test` | PASS; 3 files and 38 active-runtime tests in 370.97 seconds after deleting six tests that only mounted an unreachable predecessor |
| Post-audit-remediation complete browser suite | `pnpm test:e2e` | PASS; 45 tests in 3.3 minutes, including modal mobile navigation, shell laws, reduced-motion, and Axe checks |
| Static source and patch checks | `rg` source scan and `git diff --check` | PASS; no `console.log`, `debugger`, `TODO`, or `FIXME`; no whitespace errors |

The first browser run failed before application execution because Chromium was absent. Installing the
Playwright-pinned browser fixed the environment; all 43 journeys then passed. That first failure is not
classified as a product regression.

The first post-foundation browser run passed 43 of 44 journeys and exposed one serious dark-mode
contrast violation in Discovery metadata (3.56–3.66:1 versus the 4.5:1 requirement). The semantic
dark-text token replaced the inherited value and the exact Playwright/axe test then passed. The final
complete browser rerun passed 44 of 44 journeys. The shared token pass reduced the ratchet to 10 files
and 1,364 literals. Removing the remaining commented-out retired theme reduced the then-current
ratchet to 1,357 literals; later candidate cleanup leaves 1,342 literals in 10 files at
`34abf62aae1dbb47ded211fbf84a2146d8af0fa9`.

## Visual baseline

The dashboard was captured before shared-shell implementation at 375×812, 768×1024, 1280×720, and
1536×960 under `artifacts/ux-audits/baseline/`. The current 375 px view exposes the most important
baseline issue: the primary action set wraps into five equally weighted buttons before the operating
state, increasing choice cost and pushing attention below the fold.

## Scale assessment

This repository is a deterministic browser demo, not a horizontally scaled service. Ten thousand
concurrent users would each run isolated client state, but the demo does not prove backend concurrency,
distributed persistence, authorization, rate limiting, or provider capacity. UI work must still keep
DOM growth bounded, virtualize any future unbounded collection, lazy-load module bundles, cancel timers
on unmount, and avoid render loops. Release language must never promote this into production scale proof.

## Security review

The demo must not introduce credentials, external writes, unsafe HTML, client-side authorization claims,
or PII logging. Cross-module state is illustrative and tenant-like, but it is not a security boundary.
Links and user input remain React-escaped; approvals remain explicit controls; no local deployment may
be described as a production effect. A production port still requires server-side tenant authorization,
immutable audit events, CSP/CORS, rate limits, and versioned APIs.

## Failure modes and degraded behavior

- A module render failure must produce a useful recovery boundary, preserve the shell, and offer retry or
  return-to-dashboard rather than a blank page.
- Simulated async work must acknowledge input immediately, retain user text until accepted, expose stop or
  retry, and clear timers on navigation.
- A missing Figma frame blocks `built` and `gated` sheet stages. The checker deliberately accepts an exact
  missing-frame reason only at `contract` stage.
- A browser-tool installation failure blocks browser evidence but not source qualification; the environment
  failure and product result are recorded separately.

## Dependencies

No runtime package was added. The implementation stays on React, React Router, Phosphor Icons, Motion,
Anime.js, Vitest, Playwright, and axe already locked in the repository. UX gates use Python's standard
library and support the host Python 3.7 runtime.

## Rollback

All work is isolated on `codex/maxion-demo-ux-system-20260913`. Before integration, rollback is deleting
that branch/worktree after preserving any desired commits. During implementation, each phase should land
as its own commit so the last accepted phase can be reverted without discarding later owner work. No
deployment, database migration, remote API mutation, or remote push is part of this program.
