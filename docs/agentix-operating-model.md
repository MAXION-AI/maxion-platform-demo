# Agentix operating model

The owner's guide to what Agentix is and how it receives work from Discovery,
recorded 2026-09-16. This is the target for the Agentix module. It describes a
worked simulation of the planned product, not a live execution: the employee,
the records and the timings are fictional, and the integrations it names would
need qualification before any of it could run.

The worked example is one employee's **digital onboarding**.

## 1. The customer states a business problem, with an explicit scope

> Employees frequently start without access to their applications. HR, IT and
> managers coordinate through email and ServiceNow. We want approved employees
> digitally ready before their start date.

In scope: HR record preparation, standard application access, ServiceNow
tracking, communications. Out of scope: hardware delivery, payroll, privileged
access.

That boundary is load-bearing. Agentix must never claim "onboarding completed"
when it has only completed the digital-access portion.

## 2. Discovery establishes the future process

Discovery reads authorized process documents, onboarding records, ServiceNow
cases, access policies and system information, and interviews people only where
evidence is missing or contradictory. It then proposes a future process and, just
as importantly, assigns responsibilities.

The rule that matters: **an existing system keeps its own responsibility.** The
identity system still performs provisioning; Agentix coordinates and verifies it.
Agentix never becomes a second system granting the same access.

An unresolved rule, such as which access bundle applies to contractors, stays a
recorded gap. It never becomes an assumption.

## 3. The handoff is a versioned package

The owner chooses **Send to Agentix**. That binds a versioned package holding the
approved process, requirements, technical assessment, system mappings, evidence,
decisions and remaining limitations.

Agentix receives references to the artifacts, not only a summary, and tracks which
required sections it has actually assessed. Material that is missing or
inaccessible can never silently become "understood".

The intake is idempotent. Reaching the same Discovery from inside Agentix lands on
the same draft, and a refresh, a duplicate click or an interrupted request does not
start a second agent-creation process.

## 4. Agentix proposes an operating design

Agentix separates the current manual process from the approved replacement and
proposes a deployed capability with one accountable owner and a small set of agent
duties. For digital onboarding:

| Duty | Responsibility | Boundary |
| --- | --- | --- |
| Coordinator | Owns each case, its deadlines, dependencies, ServiceNow status and communications | Cannot declare completion while a required obligation is unresolved |
| HR specialist | Validates the approved hire, maintains permitted onboarding fields | No hiring decisions, no compensation changes, no unrelated HR access |
| IT specialist | Selects the approved access bundle, invokes provisioning, verifies results | No invented entitlements, no privilege escalation |

**Three agents are justified by separate context and permissions, not by three
systems.** A smaller process uses one. Each duty gets its permitted tools, source
context, expected inputs and results, and escalation rules.

Agentix also builds a coverage map, for example:

> "Standard access must exist before the start date" → IT duty → approved
> provisioning operation → verified identity and application-access state →
> deadline check.

If a required Discovery outcome has no responsible duty or no verification method,
the design is not ready.

## 5. Readiness, and repairing a real gap

Readiness is a real check, not a formality. Suppose the ServiceNow connection can
read requests but cannot update onboarding status:

> **One connection needs attention.** ServiceNow status updates are not permitted
> for this connection. Resolve permission, then recheck.

An authorized administrator repairs it in Integrations and Agentix rechecks the
same proposal. If the update operation were genuinely unsupported, reconnecting
would not help: Agentix names it as a product or integration capability gap and
blocks activation of the promised outcome.

Agentix confirms the exact HR fields, access-bundle mapping, provisioning status
operation, notification recipients and verification methods itself. It never asks
the owner to configure an agent graph.

## 6. Activation creates an ongoing capability

The owner approves scope, boundaries and budget. Digital Onboarding is deployed and
stays active when the browser closes. Each new employee becomes an independent
case; nobody starts a new chat and rebuilds the agents per employee.

Activation defaults to new work from that point forward. Processing an existing
backlog takes an explicit, bounded selection.

## 7. One case, including a failure

Illustrative timings for fictional employee Maya Patel, starting Monday 09:00.

| Time | What happens |
| --- | --- |
| 09:00 | Case `ONB-1042` admitted. Checks for an existing case for the same request, binds the approved design version. |
| 09:01 | HR validation completes and returns structured results with evidence references. IT receives only what it needs, not the whole HR file. |
| 09:02 | IT selects the approved bundle and invokes provisioning through the governed broker. Authorization and operation limits are re-checked immediately before dispatch. |
| 09:03 | The provider times out. The request may already have been accepted, so Agentix does **not** resubmit. |
| 09:07 | The provider's status operation confirms completion. Agentix reads back the actual account and access state. |
| 09:09 | ServiceNow updated, manager update posted, employee email submitted. Each operation carries its own receipt. |

While an operation is uncertain the case reads "Waiting for provisioning
confirmation", conflicting writes to the affected target stay blocked, and every
other employee's case continues.

The owner can steer, for example "prioritize Maya's case and alert me if it risks
missing Monday". Steering changes permitted priority and escalation. It never
bypasses access policy and never repeats an uncertain request.

A successful workflow response is not sufficient evidence if the expected access is
absent. If email submission fails, the completed access is not undone and the
communication obligation stays outstanding.

## 8. Verification is evidence-bound

| Required result | Evidence checked |
| --- | --- |
| Correct employee onboarding record | HR record readback |
| Required standard access present | Identity and application readback |
| ServiceNow reflects the result | Request fields and linked evidence |
| Required communications completed | Teams post and email submission receipts |
| Completed before the deadline | Verified completion timestamps |

"Email submitted" is never reported as "the employee read the email". The evidence
has to support the precise claim. Only when every condition passes does the case
read **verified**. Access present with a notification unresolved stays partial or
pending, never a green "done".

## 9. The deployment keeps working, and value becomes measurable

The owner sees active cases, exceptions, deadlines and verified outcomes, can
inspect each agent's activity and evidence, and can steer one case without
affecting its siblings.

Over time Agentix measures completion before the start date, elapsed time, manual
interventions, failures and actual execution cost. It may claim improvement only
against a measured Discovery baseline. It never invents savings from one
successful case.

## Underlying division of labour

Reasoning and tool selection sit with the agent SDK, waits and coordination and
recovery sit with the durable workflow engine, external operations go through the
platform broker, and persistent records and evidence support verification. These
are shared services, not infrastructure provisioned per employee or per agent.

The owner's work concentrates at the meaningful decisions: approve the future
process, resolve genuine gaps, activate the operating boundaries. Routine cases
then run without anyone supervising a chat.

## Source contracts

Two contracts in `max-ai-platform-agentix-plan` were cited as normative, under
`docs/implementation/2026-09-11-agentix-deployed-operations/`:

- `05-discovery-intake-and-extension-contract.md` — the shared intake contract
- `02-architecture-and-contracts.md` — the outcome contract
