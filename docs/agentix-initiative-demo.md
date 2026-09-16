# Agentix demo walkthrough

Updated 2026-09-11. The screen-by-screen “sample case” experience has been replaced by the [persistent Agentix workspace](agentix-workspace-ux.md).

Open `/agentix-prototype`. The same Agentix module is available from the MAXION sidebar. The default workspace contains an already-authorized invoice case: two analysts investigate while one coordinator owns the result. The list at left keeps all four initiatives accessible; conversation, activity, decisions and outcomes share one central stream. The composer stays reachable. Team status and outcome checks are visible at the right, or behind the labeled agent-context control on smaller screens.

## Four journeys

| Initiative | Team | What to try |
|---|---|---|
| Incident triage | One agent | Select it, choose “Triage this incident,” inspect the steps and verify that the incident was assigned but not closed. |
| Invoice exception resolution | Coordinator + invoice and receipt analysts | Inspect the parallel checks. Approve or decline the exact $240 variance. No payment is released. |
| Employee onboarding | Coordinator + HR and IT specialists | Review the proposed scope, activate it, and supply a payroll-owner fulfillment reference when requested. |
| Inventory replenishment | Coordinator + demand and supply analysts | Start the stock review. Observe automatic reconciliation of an uncertain ERP response and one requisition, not a duplicate write. |

## Steer, don't navigate a wizard

Type “pause,” “resume,” “make this high priority,” or “hold notifications.” These instructions change the simulation. A held notification remains an outstanding obligation until released; typing “continue” cannot approve a financial exception. Ask why a team was chosen, what needs you, what it can access, or what sources it used. Unsupported instructions are explicitly not applied.

Click the status in the workspace header to return to the current request or completed outcome after a long conversation. Expand individual activity steps, an agent's responsibility, Discovery sources, permissions or the decision record for detail.

“New work” accepts a brief or an approved Discovery design. Both prepare a scope in the same workspace, without a workflow-versus-persona category or model/effort settings. Reopening already-active work preserves it rather than silently creating a duplicate.

## Discovery handoff

Discovery's saved work, interviews, evidence workspaces and nine-document readers remain unchanged. On its landing page, expand “Process designs ready for Agentix” below the existing discoveries, open a design and choose “Send to Agentix.” This carries the evidence, target process, owner, limits and success checks into the proposed operating plan. Activation remains explicit. No existing Discovery is relabeled as a different use case.

## Honest demo boundary

All agents, source records, approvals and provider effects are simulated. Chat uses scripted responses, not a language model. No external API, ERP, HRIS, email or Teams action is performed. Merge Agent Handler is the intended integration boundary; this frontend does not prove provider coverage or production permissions.

Version2 browser state uses `maxion-agentix-workspace-v2`. It preserves selected work, progress, decisions, steering and composer drafts. The previous v1 key and existing Discovery storage are not deleted or migrated. Timers run only while the page is open; a recurring schedule is illustrated, not a backend scheduler.

See [the UX contract and validation matrix](agentix-workspace-ux.md) for the design rationale, test boundaries and rollback.
