# Agentix initiative demo

Updated 2026-09-11. Product surface, not a marketing page. All examples, source evidence, approvals and provider effects are frontend simulations.

## Experience contract

The owner’s three jobs are to understand the business outcome, activate a safely mapped process, and resolve material exceptions while inspecting activity when needed. There is one Agent abstraction; a coordinator can use scoped specialists. There is no workflow-versus-persona category choice or model/effort control.

Discovery → approved current/future-state package → Agentix draft → operating model and capability review → owner activation → case execution → verified outcome.

The primary examples are one single-agent ServiceNow triage case and three multi-agent cases: ERP invoice exceptions, employee onboarding, inventory replenishment. Each multi-agent case has one coordinator and two specialists doing independent evidence work. Only the coordinator owns the resulting cross-system effect. A human approver is not an AI agent.

Discovery’s existing autonomous interviews, evidence workspaces and deliverable readers remain intact. Four illustrative operational packages are added to its index. No existing package is relabeled as one of these examples.

## Functional behavior

- Import is idempotent and does not activate or reset a running initiative.
- Onboarding activation is blocked until the unavailable payroll operation is explicitly mapped to a human step. No connection permissions are changed.
- Invoice approval is bound to the sample invoice version and exact variance. Decline preserves an open exception and never creates a verified-success state.
- Inventory demonstrates an uncertain submission followed by read-back of the original request. The recovery button is labeled as a simulation control, not a business approval.
- All cases support inspectable steps, scoped agent inputs/outputs, pause/resume, contextual chat, a decision/recovery record and a persistent completion view.
- Progress is local browser state. It survives refresh and module navigation but is not a durable backend scheduler; timers run only while the page is open.
- The four bindings use Merge Agent Handler conceptually. This demo proves neither provider coverage nor production permissions.

## UX laws check

| Law | Requirement and acceptance | Verification |
| --- | --- | --- |
| Hick’s | Four example choices; three initiative views; one primary activation/run/decision action | Browser journey |
| Fitts’s | New buttons at least 44px high; adjacent actions separated by at least 8px | CSS tokens + responsive inspection |
| Jakob’s | Existing sidebar retained; conventional buttons, disclosures and navigation; Cmd/Ctrl+K focuses the composer only in visible Agentix | Keyboard browser test |
| Proximity | Related copy separated by 4–8px; sections by 24–32px | CSS + screenshot |
| Miller’s | Four initiatives; three team members maximum per example; source groups of three | Fixture assertions |
| Doherty | State changes acknowledge immediately; stage state shown before the simulation timer; no blocking loading overlay | Browser interaction |
| Von Restorff | One filled accent CTA; other actions neutral | Screenshot + CSS |
| Serial position | Outcome first; activation after the operating boundary; evidence on completion | Browser journey |
| Peak-End | Completion shows concrete output records and scope limitations, not a transient toast | Four completion journeys |
| Zeigarnik | Fixed stage count; completion derived from state; declined/waiting work never receives a success state | State tests + progress assertions |
| Prägnanz | Shell, workspace and optional detail sections; no always-visible three-pane canvas | Screenshot |
| Similarity | One button/badge/status system across all four examples | Shared components |
| Uniform connectedness | Agent cards describe one responsibility; parallel stage explicitly joins at coordinator | Team and mapping review |
| Tesler’s | Team and tool method are proposed from package; user resolves only authority or unavailable operation | Onboarding and invoice tests |
| Postel’s | Free text trims whitespace; unknown needs stay intact and get an honest supported-example explanation | Unit test |
| Parkinson’s | About 30 seconds stated for a sample run; one optional text field; explicit demo checkpoints | Browser journey |
| Occam’s | No agent graph editor, framework chooser, model picker or second workflow taxonomy | Component inventory |
| Pareto | Outcome, activation and exceptions receive priority; logs and detailed tool scopes are disclosures | Browser journey |

## Verification scope

Unit coverage checks topology counts, source import, activation guards, approval/rejection, paused-state preservation, recovery, malformed storage and contextual conversation. Browser coverage exercises all four workflows, the actual cross-module handoff, refresh persistence, shell attention, keyboard ownership, 320/375/768/1280px layouts, reduced motion and dark-mode accessibility.

No backend, tenant data, provider credentials, cloud infrastructure, production process or deployed website is modified by this demo work. The platform’s existing single-bundle build warning is a separate performance limitation; successful build is not runtime qualification.

Rollback: revert this branch’s demo changes. Existing Discovery records use their original storage key and are not migrated. The new Agentix simulation uses only `maxion-agentix-initiatives-v1`.
