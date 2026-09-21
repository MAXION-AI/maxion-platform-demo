> Superseded on 2026-09-16. The Devin reference was removed at the owner's
> direction and ElevenLabs is now the only visual reference; see
> docs/visual-spec.md. This file is kept only as a record of that earlier pass.

# Devin-only rebuild

Scope: `maxion-platform-demo`, not `max-ai-platform`. Latest owner direction:
focus on Discovery and Agentix; stop Execute work. Earlier Plan, Execute,
Projects and Dashboard edits remain preserved, not a claim of acceptance.
Existing uncommitted work is preserved. No Figma, deployment, PR or merge in this
local design pass. The owner subsequently reauthorized the updated `frontend-design`,
`frontier-frontend` and `premium-ux` skills. They are used as one workflow: preserve
the product contracts, implement from the examined Devin images, then separately
check rendered composition and exercised interactions. No new Figma gate.

## Examined reference

One app: Devin. The user explicitly replaced the old multi-app/Figma program.
Screens originally obtained through the connected Mobbin tool on 2026-09-15;
the saved workspace/composer images were examined again during this remediation:

- [Composer and contextual actions](https://mobbin.com/screens/635a7f18-3f3f-4f43-b65a-fcf4e3ea290c)
- [Repository context](https://mobbin.com/screens/cb506f20-a571-438c-9897-b3cc43b20345)
- [Dense session management](https://mobbin.com/screens/9cd37913-d61d-4807-af23-f2e9f3647df8)
- [Session flow, especially the workspace in screen 6](https://mobbin.com/flows/b122b4f4-967e-4569-a4f7-7a126bf1535a)

Adopt: neutral light surfaces, quiet sidebar, compact type, aligned rows,
conversation with collapsible work records, contextual tools around a single
composer, explicit artifact destinations. Do not copy Devin branding or
software-engineering semantics into business operations. Other apps returned
by search were excluded.

## Product requirements and laws check

Product surface. Top jobs: resume work, resolve the next decision, inspect results.
One visual reference does not mean identical task layouts: a Plan diagram remains
a canvas, Discovery remains an investigation, and Agentix remains deployed operations.

| Law | Requirement |
| --- | --- |
| Hick | 1 primary action per local decision; at most 5 composer controls. |
| Fitts | 32px desktop controls; 44px touch; no target below 24px. |
| Jakob | Devin only; familiar sidebar, lists, composer, Enter/Shift+Enter and Escape. |
| Proximity | 4–8px within controls; 16–24px between groups. |
| Miller | 7 primary modules; administration separated at the bottom. |
| Doherty | Local actions acknowledged within 400ms; existing async progress preserved. |
| Von Restorff | 1 dark primary control, no decorative color strips or tinted card grids. |
| Serial position | Current work before metrics; approval and composer both visible at 1280×720. |
| Peak-end | Completion links to all 9 Discovery deliverables with their source context. |
| Zeigarnik | 3 engagement setup steps; drafts survive return and refresh. Discovery retains N/8 demo stages. |
| Pragnanz | Up to 3 content regions; Discovery conversation dominant over 264px context; Agentix work dominant over a 300–360px thread. Mobile switches between 2 views. |
| Similarity | 1 composer implementation; one token family across all modules. |
| Connectedness | Each receipt/decision belongs to 1 specific run or Discovery. |
| Tesler | 0 manual ID management; each new engagement gets its own saved definition, conversation and cases. Read-only status questions cause 0 outbound actions. |
| Postel | Whitespace accepted, blank send prevented, IME Enter preserved, multiline drafts retained. |
| Parkinson | Brief and 1 operating-model choice, then 4 editable definition fields; resume an existing Discovery in 1 click. |
| Occam | Remove repeated summaries and duplicate module navigation, not business capabilities. |
| Pareto | Resume, decide and inspect are the 3 privileged jobs. |
| Interactivity | Contextual messaging, review actions and evidence links stay operational. |

## Engineering boundary

This remains a client-side interactive demo. No new endpoints, provider actions,
secrets, dependencies or authentication changes. This pass cannot establish
10,000-user production readiness. Agentix creation is bounded at 50 engagements,
case storage at 200, and concurrent work at 3 cases per engagement. The existing
version-3 persistence key is preserved with missing definition fields filled on
read; existing cases and drafts are not replaced. Browser storage failure still
reports itself. The composer does not inject HTML or add external calls.

Verification: typecheck, existing journey tests, focused composer/state tests,
rendered 1440×900, 1280×720 and 375×812 screens, keyboard/focus and empty-input checks. Independent
review uses one auditor; implementer is the root agent. Passing code tests is
not a visual quality score. Capture results and remaining defects below.

Rollback: local scoped patches only; preserve all earlier owner changes. No broad
git reset, no replacement of persistent demo data, no deployed rollback needed.

## Status

Discovery/Agentix remediation, 2026-09-15. Local branch
`codex/agentix-deployed-agents-20260911`, base HEAD
`c381e7e50b6cc7e71138fbf4b9c348efc2194df9`; changes remain uncommitted.

- Agentix starts at Engagements with an actionable Needs you inbox. New engagement
  is available both there and inside a workspace. Setup shows Define the work,
  Review & connect, and Activate; supported responsibilities are visible.
- New engagement creates a distinct saved draft from one of four explicit demo
  operating models. Name, accountable owner, operating scope and trigger can be
  edited before checking readiness and activating. Returning and refreshing preserve
  those fields. The existing engagement is not silently reused. This is not arbitrary
  agent generation or live integration provisioning.
- The previously unstyled review fields now use a labeled grid, with supporting
  readiness beside the primary form and explicit activation below. The fleet uses
  compact 64px desktop rows and aligned status/count columns. Setup is no longer
  repeated both in Needs you and in the engagement list.
- Agentix has a dominant case/work area beside a persistent, narrower conversation.
  Selecting a case keeps its proposal, approval and evidence in the work area;
  messages and drafts remain scoped to that case. Mobile Work/Conversation switching
  preserves the draft and focus. Scope inspection does not discard the selected case.
- The exact $240 approval and conversation composer fit fully at 1280×720 and
  on the exercised 375px phone view. History and outcome reporting remain available.
- Discovery exposes Thread, Autonomy and Deliverables, including planned outputs
  before synthesis. New-brief return preserves the unstarted draft for the session.
  ERP and ServiceNow templates remain visible. Export all downloads all nine
  completed documents, their evidence and next steps as Markdown.
- Discovery no longer repeats the current operation across header, Thread and
  Context. Current work precedes supporting metrics; the mission is collapsible.
  Mobile progress and long ambient activity lines are contained inside their panels.
- Discovery status questions and negative instructions are answered in Thread;
  they do not become sponsor-send commands. Explicit demo sends state that no real
  message was sent outside this demo.
- Mobile navigation resets to the engagement heading. Tablet layout now respects
  the shell's overlay-sidebar breakpoint instead of shrinking the page to 208px.

Current evidence: 24 rendered screenshots in
`/Users/abhinavshankar/.codex/visualizations/2026/09/13/01a09b3e-93c7-7290-a0a1-dd91f874d2fa/app-direct/workspace-remediation`.
They cover fleet, review, work, selected case, conversation, Discovery Thread,
Autonomy and planned deliverables at all three viewport sizes. One read-only
auditor exercised the changed flows and reported concrete visual defects, which
were corrected and rechecked. Final verdict: scoped visual and interaction pass
for the reviewed Discovery/Agentix changes; no reported defects remain in that
review. The final activity-line check verified readable 12px/18px text with
containment at 375×812 and 1280×720. This is not a whole-product or 9+ visual sign-off.
The existing normalization stylesheet remains during migration; no completed
legacy-code retirement is claimed.

Verified locally: 23 existing focused Playwright checks (Agentix regression,
first-group layout, and engagement/Discovery navigation), 7 new workspace
regressions, 3 additional fleet/mobile layout checks, and the complete Discovery
brief-to-deliverables journey; 36 state/composer unit tests; TypeScript and Vite
production build. Accessibility assertions cover serious/critical findings at
320, 375, 768, 1280 and 1440px. The build still reports its pre-existing large
JavaScript chunk warning; this pass is not a production performance qualification.
