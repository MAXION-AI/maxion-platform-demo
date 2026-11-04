# Plan gaps in the first-release journey

**Date:** 2026-10-30. **Source plan:** `maxion-agent-platform` at `2b31a25b8`, mainly docs 05, 06, 10, 12, 13, 15, 16 and 21, and the programs IAM-2 and ADM-2.

A comparison of the demo against the plan found five places where the demo contradicted the plan and eight missing pieces of the first-release journey (doc 16, "End-to-end release journey"). This change closes them. Everything is simulated in the browser: no provider, identity system or database is touched.

## Contradictions removed

| The demo did this | The plan says | Now |
| --- | --- | --- |
| Promised stakeholders "anonymised" answers, while deliverables cited them by name | Inputs are attributed, and the interviewer says it's an AI, what is kept and who sees it (D-124) | The link page and greeting say so |
| Offered Consult MAX in the navigation, the Dashboard, Help and the keyboard | Not in the first release (D-090) | Removed; `?section=consult` lands on the Dashboard |
| Showed Plan on projects and in activity | Plan is retired (D-002) | Projects link to their Discovery and Agentix work |
| Published dashboards to a hosted workspace, "in production" | Files only at launch (D-095) | They end as published file versions; governed effects keep their release flow |
| Showed the customer 108,000 units and staff 10,000 for one organization | One agreement | Staff figures read the customer's constants |

## What was added

- **Package approval (D-122):** approve, return or withdraw one exact version, bound to its document hashes. Only an approved version continues to Agentix. A version that changed underneath the review is refused. Decisions reach the customer audit log.
- **My approvals (D-091):** one inbox across Discovery and Agentix, naming the exact target and version. Each row opens its module's own decision, which checks the version again.
- **Publishing as files (D-095):** a real browser download, and save to OneDrive or SharePoint with honest preparing, saving and saved states. A connection that can't write says why and leads to Integrations.
- **Organization and project switching (D-010, D-026):** both names stay in the navigation. Switching organization remounts the modules, so nothing from the old one survives, and it clears the project. The second organization, Halden Logistics, explains each restricted module and who can change it. Picking a project narrows the Discovery hub and the Agentix lists, and new work started inside it stays with it.
- **Discovery inputs:** document upload (05), web research with sources labelled Public web and following the policy setting (D-107), and interview brief review before an interview opens (D-114).
- **Discovery outputs:** Project plan/WBS and Use Case Catalog for all seven scenarios (D-074), outputs selected per mission, a Readable / Structured switch (D-044), and per-document versions with edit, regenerate, compare and conflict handling.
- **Failure states (doc 16):** budget exhaustion and a revoked connection in Discovery; budget exhaustion, sandbox loss, a stale approval and an uncertain write that needs Investigate in Agentix. A presenter can trigger each one (Discovery: the ⋯ menu or ⌘K; Agentix: Controls).
- **Staff panel:** tenant and agreement creation bound to the first Owner's setup code, the Support role with a "View as" control, provider costs with unknown amounts stated, and a staff access page.

## Deliberately left

- **Customer demos stay in one fixed scope.** They have no switcher, and they select eight outputs so their scripts still work. Their step count is now 14.
- **Connectors beyond OneDrive and SharePoint** stay available, because the customer scenarios depend on them. Doc 15 adds them per customer.
- **The Provider keys tab** stays, although D-093 places it soon after the first release.
- **Smaller gaps from the same comparison** are not in this change: sign-in and session-expired screens, Help's support contact, per-role sandbox network settings, a real case stop distinct from pause, reviewed schedules, and pinning a case to a design version.

## Numbers that are demo choices, not the plan's

- The standard Agentix allowance of 20,000 units per engagement.
- Halden Logistics and its project.
- Provider costs in the staff panel.

## How to see it

- Switcher: the top of the sidebar on `/maxion-prototype`
- My approvals: `/maxion-prototype?section=approvals`
- Package approval: `/maxion-prototype?demo=revenue&start=package`
- Staff panel: `/maxion-admin`
