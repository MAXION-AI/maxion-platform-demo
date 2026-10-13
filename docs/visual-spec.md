# Visual spec

One page of numbers. This is the visual target for every Maxion demo surface: the
ElevenLabs web app as captured on Mobbin, with Maxion's own flows and content.
Values live in code in `src/design/tokens.css`; the primitive layer in
`src/design/primitives.css` consumes only those tokens; `pnpm check:design` enforces it.

## How these numbers were obtained

- **Type sizes**: cap heights and word widths measured on the 1920px Mobbin capture of
  the [Agents list](https://mobbin.com/screens/02042d42-1cb8-47ba-89d5-c8c99e719d7c)
  (a 1440px viewport at 1.333x), matched against Inter's canvas metrics for the same words.
- **Colors and tokens**: read from the app bundle's CSS variables and computed styles on the
  live sign-in page, 2026-09-16.
- **Derived** rows are Maxion decisions made to fit the system. They were not measured.

## Type

| Role | Size / line | Weight | Tracking | Color |
| --- | --- | --- | --- | --- |
| Page title | 22 / 28 | 600 | -0.025em | ink |
| Home greeting | 26 / 32 | 600 | -0.03em | ink |
| Card or panel title | 14 / 20 | 600 | 0 | ink |
| Row title, nav item, button, tab | 13 / 20 | 500 | 0 | ink |
| Body, table header, section label, placeholder, description | 13 / 20 | 400 | 0 | ink or subtle |
| Chip, badge, count, secondary line in a cell | 12 / 16 | 500 or 400 | 0 | ink or subtle |
| Chat composer text | 15 / 22 | 400 | 0 | ink |
| Create subtitle, document paragraphs | 16 / 24 (reader: 15 / 24) | 400 | 0 | subtle or ink |
| Conversation, panel, sheet and dialog titles; figure values | 17 / 24 | 500 or 600 | 0 | ink |
| Preparation headline | 34 / 40 | 600 | -0.03em | ink |

The larger rows were measured in September 2026 from the Test AI agent, the
conversation transcript, the create-agent flow, the voice-clone preparation
screen and the agents dashboard (cap heights on the 1920px captures; see
`docs/elevenlabs-reference-map.md`). ElevenLabs' Inter sets about 1% wider than
our build at the same cap height; the difference is below what the eye resolves
and is not corrected.

Typeface Inter, variable, self-hosted (`public/fonts/inter-variable.woff2`), antialiased,
no stylistic sets. Nothing under 12px. No uppercase tracked labels. Weights other than
400, 500 and 600 are forbidden. Numerals in tables are tabular.

## Ink and surfaces

| Token | Value | Source |
| --- | --- | --- |
| `--ds-fg` | #0f0f10 | `--foreground: 240 3% 6%` |
| `--ds-fg-subtle` | #696969 | gray-650 step, measured on table headers and section labels |
| `--ds-fg-nav` | #3f3f46 | `--sidebar-foreground: 240 5.3% 26.1%`; the active item uses ink |
| `--ds-fg-placeholder` | #8f8f8f | derived |
| `--ds-bg` | #ffffff | `--background` |
| `--ds-bg-sidebar` | #fafafa | `--sidebar-background: 0 0% 98%` |
| `--ds-bg-selected` | rgba(0,0,0,.045) | the selected nav row measures #efefef on the #fafafa rail |
| `--ds-bg-hover` | rgba(0,0,0,.04) | derived |
| `--ds-border` | rgba(0,0,0,.1) | `--border: gray-alpha-150`, measured #e5e5e5 on white |
| `--ds-primary` | #0f0f10 | the one filled button on a screen |
| `--ds-ring` | #3b82f6 | `--sidebar-ring: 217.2 91.2% 59.8%` |
| Status tints | positive #1a7f4b on #e7f6ec, warning #8a5a00 on #fff4d6, danger #b3261e on #fdecea | derived |
| Mark tints | six pairs, `--ds-tint-0..5-bg` / `-fg` | derived from the reference's coloured icon tiles |

Grays are pure neutral. No gradients and no shadows on tables or cards. The reference
lifts exactly four kinds of thing, and so do we: popovers (`--ds-shadow-popover`),
floating chat composers (`--ds-shadow-composer`), floating toolbars and prompts
(`--ds-shadow-float`), and dialogs and sheets (`--ds-shadow-dialog`, over a blurred
white or lightly darkened scrim). Measured fills: #f5f5f5 for callouts and the
person's own chat bubble (`--ds-bg-callout`), #fafafa for workflow bands, card trays
and sheet sections (`--ds-bg-inset`), and solid #a1a1aa for a disabled filled
button (`--ds-primary-disabled`). The one gradient is the voice orb and the thin
progress bars that borrow its teal. Colour appears at size in exactly one place, a mark tile,
which is how the reference uses it on its product and template tiles.

## Marks

A record that deserves a logo gets one from a closed set of eight abstract geometric marks
drawn from one vocabulary of circles, arcs and rounded rectangles, each duotone. The shape
and the tint are chosen by hashing a stable seed, so a record keeps its logo for good and a
new record gets one without anybody drawing it. They live in `src/design/primitives.tsx`.
A mark is decorative: it carries `aria-hidden` and never replaces a label.

## Shape and layout

| Token | Value | Source |
| --- | --- | --- |
| Radius: controls / cards / pills | 8px / 12px / full | `--radius: .5rem`, `--radius-xl: .75rem` |
| Radius: chat bubbles, dashboard card / composer, dialogs | 16px / 20px | measured |
| Message column / composer card | 824px / 648px | measured, Test AI agent |
| Metadata panel / Studio list / document column | 300px / 300px / 704px | measured |
| Create column / sheet / wide dialog | 612px / 560px / 1008px | measured |
| Sidebar width | 244px | measured, border included |
| Collapsed rail | 64px | derived |
| Collapsed rail count | 14px bubble, 10 / 14 semibold, raised 3px | derived |
| Sidebar padding | 12px | measured, nav icon lands at x=20 |
| Top bar height | 48px | measured 46 to 48 |
| Control height (button, input) | 36px | measured; 44px under 600px wide |
| Small control (segmented tab) | 28px | derived |
| Chip height | 24px | measured |
| Table row height | 52px | measured |
| Nav row height | 34px | measured |
| Page padding | 32px top, 48px sides | measured; 24 / 16 under 600px |
| Space scale | 4, 8, 12, 16, 20, 24, 32, 48 | derived, 4px base |
| Icon size | 16px | measured |

## Screen anatomy (Agents list)

Top bar with page name at 13/500 and quiet actions at the right. Title row with the
22/600 title at the left and one black button plus optional outlined button at the
right. An optional bordered card (12px radius, 20px padding, 14/600 title, 13 subtle
description) that can be dismissed. A full-width 36px search input. Small filter chips
or segmented tabs. A table with 13/400 subtle headers, 52px rows, hairline separators,
row hover in `--ds-bg-hover`, and a 13/500 title plus 12 subtle line in the first cell.
Status is a 20px pill with 12/500 text.

## Sidebar anatomy

A 244px rail at #fafafa with a 1px rgba(0,0,0,.1) right border and 12px padding.
Brand row on the rail itself, then one raised control, then nav groups. Nav rows are
30px tall on a 34px pitch, 13px medium, a 16px icon at x=20 and an 8px gap to the label.
An inactive row is #3f3f46; the selected row is near-black on a rgba(0,0,0,.045) pill
that spans the rail's padding box. Section labels are 13px sentence case in #696969,
never uppercase and never tracked. Anything raised on the rail, the search control and
the usage card, is white with the same hairline border, which is how the reference
treats its workspace switcher and its footer cards.
Collapsed to the 64px rail, rows keep only their glyph, and a count becomes a 14px
white bubble with the same hairline, pinned to the row's top-right corner and clear of
the glyph's own accent.

## Mapping to Maxion surfaces

| ElevenLabs pattern | Maxion surface |
| --- | --- |
| Agents list, Home tiles | Agentix engagements, as a grid of blocks (done) |
| Sidebar | The portal shell sidebar, shared by every module (done) |
| Agent detail with tab strip | Engagement workspace: Cases, Conversation, Scope, History; the Discovery cockpit (done) |
| Studio project | Discovery Package (done) |
| Test AI agent, transcript | Discovery Thread (done) |
| Analysis tab, dashboard, workflow | Discovery Autonomy (done) |
| Create-agent flow, voice clone preparing | Discovery Create and Preparation (done) |
| Tests list with info banner | Execute engagements |
| Home tiles and library rows | Dashboard |
| Knowledge base table | Projects, Integrations |

## Rebuild, never override

A surface only looks like the reference once its markup is rebuilt on
`src/design/primitives`. Token-based CSS layered over old markup keeps the old
structure and still reads as the previous product. The check is cheap: measure
what share of a screen's rendered elements carry a `ds-` class. The engagements
list sits near 60%. A screen near zero has not been migrated, whatever its
stylesheet says.

Delete the old rules as each surface moves. Two traps: a rule whose selector list
also covers another surface takes that one down with it, and a leftover
`grid-template-areas` silently fights the primitive's columns.

## Composition

Density is necessary and not sufficient. A screen can pass the budget and still
read as card soup, because grouping is being done with containers.

- Dissolve status panels into plain columns; let space separate them.
- Replace vertical rules between figures with a wide gap.
- Turn tile grids into rows separated by one hairline.
- Reserve a bordered surface for the one thing that needs the person, so it is
  the only emphasis on the screen.
- Never tint a whole panel for attention. Attention is a small pill and one
  filled button.
- The one exception is a failure the person has to fix. It uses the reference's
  own tinted "Connection failed" callout (mobbin e37ce067): amber for a setup
  fix, red for something a permission cannot fix, never a whole section.

## Density budget

Tokens alone never made a screen look like the reference; twice the result was
rejected while every value came from a token. The reference's real signature is
restraint, and it is measurable. On its own captures a whole screen carries five
to eight horizontal edges and covers 1.5% to 5.2% of its content area in
non-background pixels.

`pnpm check:density` drives the running app and holds each screen to a budget:
at most 10 panels, zero shadows, zero text below 12px, at most 6 distinct type
sizes and zero uppercase labels. A screen reported as migrated has to pass it.
A screen composed from reference screens that themselves carry more frames gets
that allowance, written next to it with the reason: Autonomy (dashboard tray,
workflow nodes, analysis column) allows 14 panels, and the Thread, the Agentix
engagement workspace and an Agentix case each allow the one floating composer
shadow. Agentix is measured on its engagements list, workspace, case, review and
start screens, and the Dashboard and Projects pages are measured too.

## Motion

Motion comes from motion.dev and Aceternity's patterns, in
`src/components/motion/MotionKit.tsx`: streamed agent text resolves word by word
from a blur and a muted ink, in-flight labels shimmer, preparation is a
multi-step loader, empty briefs cycle example prompts, the live workflow node is
traced by a moving border, the tab underline slides, and new rows rise into
place. Text never fades in from transparent, because a half-faded word fails
contrast checks. Every animation stops under reduced motion.

## One reference

ElevenLabs is the only visual reference. An earlier pass introduced a second one
and a per-app override layer; that layer is deleted and its tokens are re-homed
onto `src/design/tokens.css`. Do not add another override layer: a surface that
needs different values needs different tokens, not a competing system.

## Provenance and limits

Measured screens: Agents list, Agent tools, Home, Tests (Mobbin, ElevenLabs, web). The
page title measured 22px by width matching, which is not a Tailwind default and is likely
a custom size in their theme. Dark-mode tokens are derived, not measured, and are opt-in per surface (`.ds-auto-dark`) until the legacy style layers are gone.
