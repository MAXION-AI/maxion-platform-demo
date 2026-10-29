# Organization surfaces from the platform plan

**Date:** 2026-10-28. **Source plan:** `maxion-agent-platform` at `2b31a25b8` — docs 08 (integrations), 10 (auth and permissions), 13 (product experience), 21 (admin panel), 22 (organization context), and the program plans INT-1/INT-2, IAM-3/IAM-4, ADM-1/ADM-2/ADM-4 and EVD-4.

The plan names surfaces the demo didn't have, or had in a form the plan has since replaced. This change adds them in the demo's own design language, built on the primitives and measured against the density budget. Everything is simulated in the browser: no provider, identity system or database is touched.

## What was missing, and what was built

| Plan surface | What the demo had | What it has now | Plan source |
| --- | --- | --- | --- |
| Customer administration (Settings) | Two notification switches and a link to Integrations | **Settings** with General, Members, Policy, Provider keys and Audit log tabs | IAM-3, IAM-4, ADM-4, doc 13, D-089, D-092 |
| Integrations | A list of connections “through Nango, Merge or native” with a scope radio and a static access log | Personal connections with the plan's states, project grants, read/write classes, connect → verify → confirm, reconnect, tracked disconnect, unavailable connectors with their reason | Doc 08, INT-1, INT-2, D-032, D-056 |
| Organization knowledge | Nothing | **Knowledge**, beside Integrations: six sections, review queue, essentials budget, binding rules linked to controls, versions and where each item was used | Doc 22, EVD-4, D-088 |
| Connection selection before work | Nothing | A picker in Discover's mission review and Agentix's activation review | Doc 13 “Integration selection and steer chat”, D-056 |
| MAXION admin panel (tenant administration) | Nothing | A separate staff app at `/maxion-admin`: tenants, tenant detail (Access, Models, Modules, Usage, Operations, History), platform catalog and stops | Doc 21, ADM-1, ADM-2, D-027–D-030 |

“Tenant admin” covers two layers in the plan: the customer organization's own administration (doc 21 calls its holder “a tenant administrator”) and MAXION's staff panel, whose core is the tenant listing and tenant detail. Both are here, kept apart as the plan requires: customer roles never confer staff access, and the staff panel is its own route and its own code chunk.

## Settings (the organization's administration)

- **General:** organization name (rename), your role, seats from the commercial record (package 20 plus 5 agreed; pending invitations take no seat), agreement, links to Integrations and Knowledge, and offboarding through support.
- **Members:** fixed Owner, Admin and Member roles. Manage opens the role, suspend and remove, each confirmed with its exact before and after. The last active Owner can't be demoted, suspended or removed. Invitations expire after seven days; resend issues a new link.
- **Policy:** the customer layer over MAXION's grant, in five families — module mode, models per module and task, Discovery web research (on, off, or listed domains, with MAXION's blocked list always applied), Agentix tool classes and sandbox network ceiling (Owner only, with a reason), and what integrations may do. Each row shows its effective value, where it comes from and what limits it. Widening needs a sign-in in the last 15 minutes; narrowing doesn't. Publishing says “saved; enforcement not yet reported” until enforcement reports, then “applied to new work”.
- **Provider keys:** an Anthropic key for Discovery and an OpenAI key for Agentix. Write-only: after a no-cost check only the last four characters, who added it and when are kept and shown. Removing a key states who pays and where calls run afterwards.
- **Audit log:** metadata only — six columns, date range, type, person and search, refresh. Connection, membership, policy, key and sign-in events from this session appear live.

## Integrations

- Your connections, other members' connections (you see they exist, never their accounts), and connectors you can add.
- Connect: personal only (organization connections are shown as not available yet), the provider sign-in, account verification, then an explicit account confirmation within 30 minutes. A new connection starts with reads only and no projects.
- Manage: status and manual check, account and route (Merge or a MAXION native adapter), project grants (a project you only view can't be given the connection), the write switch (needs a fresh sign-in; off when the organization allows reads only or when the connector has no qualified writes), the operations list with each one's availability, and disconnect (“New use stops now. Work already sent completes. Provider cleanup is tracked.”).
- Unavailable connectors say why and offer one next step: NetSuite is not in the agreement (ask MAXION); the Outlook mailbox isn't qualified yet.
- The old “Access log” now opens Settings › Audit log filtered to connections, as INT-1 asks.

## Knowledge

Profile, Rules and policies, Compliance and regulations, Procedures, Brand kit and Glossary, with a review queue for member and Discovery suggestions and a conflict Agentix reported. Each item shows its kind (a binding rule links to its platform control), essentials, visibility, scope, version history and the Discovery and Agentix work that cited it. New items take section, title and content; secrets are refused; the essentials budget (8 items, 8,000 bytes) is enforced.

## Picking connections for new work

Discover's “Review the mission” and Agentix's activation review list the viewer's connections. Usable ones are picked by default; one that needs reconnecting can't be picked and says so; a link leads to Integrations. In Discover the mission's “Evidence sources” line follows the picks.

## MAXION admin panel

Staff identity and environment, tenants with lifecycle and seats, and per-tenant controls showing inherited value, override, customer restriction, effective value and limiting reason. Every change previews before it commits and asks for a reason code, a ticket and MFA within 15 minutes; the receipt moves from published to applied. Emergency stops are one short command. Seat changes below current use show over-cap and remove nobody.

## Deliberately not built

- Staff customer-content access, impersonation, a generic settings editor, a SQL console, a deploy button and secret values (excluded by doc 21).
- A Support-role view and a staff-access page in the admin panel; tenant bootstrap.
- Guest accounts, directory sync, custom roles and bulk invitations (IAM-3 exclusions).
- Context graphs (deferred by D-036).
- Persistence: the organization state lives for the tab, like each customer demo; a reload starts from the seed.

## How to see it

- Settings: `/maxion-prototype?section=settings`
- Integrations: `/maxion-prototype?section=integrations`
- Knowledge: `/maxion-prototype?section=knowledge`
- The picker: Discover → New Discovery → brief → Start autonomous Discovery
- Staff admin panel: `/maxion-admin` (deep links: `?tenant=northstar&tab=models`, `?view=platform`)

## Checks

Unit tests for every new page, end-to-end tests in `tests/e2e/organization-admin.spec.ts` (including axe and phone-width clipping), the design-token check (the new stylesheets are on its strict list) and the visual-density budget (eight new screens, all within budget).
