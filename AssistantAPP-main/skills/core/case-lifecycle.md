---
id: core.case-lifecycle
owner: founding-engineer
jurisdiction: GLOBAL
service_lines: ["*"]
audience: [lawyer, staff, client]
tone: internal-ops
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 180
supersedes: []
superseded_by: null
privileged: false
---

# Case lifecycle

Canonical statuses on the `Case` Prisma model and their transitions.
Any state transition writes an `AuditLog` row with the old + new
status and the `correlationId` of the triggering run.

## Statuses (traffic-light mapping)

| Status | Traffic light | Meaning | Next allowed |
|---|---|---|---|
| `lead` | draft (neutral) | Captured via eligibility quiz or Webflow; no engagement yet | `intake_in_progress`, `archived` |
| `intake_in_progress` | pending (amber) | Intake wizard started; HITL not yet reached | `intake_awaiting_hitl`, `archived` |
| `intake_awaiting_hitl` | review (blue) | Intake agent requested lawyer approval before case creation | `active`, `archived` |
| `active` | approved (green) | Engagement letter signed; case is under representation | `documents_pending`, `submitted`, `paused`, `denied`, `completed` |
| `documents_pending` | pending (amber) | Waiting on client uploads (passport copy, NIF, bank statements, …) | `active`, `submitted`, `paused` |
| `submitted` | submitted (purple) | Filed with SEF/AIMA / MOJ | `awaiting_decision`, `denied`, `approved` |
| `awaiting_decision` | review (blue) | Regulator has the filing; we wait | `approved`, `denied`, `additional_evidence_requested` |
| `additional_evidence_requested` | pending (amber) | Equivalent of US "RFE" — jurisdiction-aware label per D-006 | `submitted`, `denied` |
| `approved` | approved (green) | Application approved | `completed` |
| `denied` | denied (red) | Application denied | `appeal_pending`, `completed` |
| `appeal_pending` | review (blue) | Appeal filed; awaiting decision | `approved`, `denied`, `completed` |
| `paused` | draft (neutral) | `Case.autoPauseUntil` set; automated outbound suspended | `active`, `archived` |
| `completed` | approved (green) | All work finished; final invoice settled | (terminal) |
| `archived` | inactive (grey) | Closed without completion (client withdrew, duplicate lead, etc.) | (terminal) |

## Transition rules

- Every transition that involves a legal conclusion (e.g.
  `active → denied`) requires a HITL approval at tier Urgent or
  Critical (see `core/escalation/matrix.md`).
- `Case.autoPauseUntil` halts all automated outbound; transitions
  to `active` must clear this field.
- `submitted → approved` and `submitted → denied` write a
  `CaseOutcome` row (feeds the Outcome Predictor per D-008).
- Only a lawyer licensed in the case's `destinationJurisdiction`
  may transition to `approved` / `denied` / `appeal_pending`.

## Who sees what status

Clients see the subset listed in `core/roles.md`:
`active`, `documents_pending`, `submitted`, `awaiting_decision`,
`additional_evidence_requested` (labelled gently — "We need a bit
more information from you"), `approved`, `denied`, `completed`.
They do NOT see `intake_awaiting_hitl`, `paused`, or `archived`.

## Banned transitions (enforced in `lib/events.ts`)

- `lead → approved` (must pass intake + active + submitted first).
- `active → completed` without a terminal `approved` or `denied`.
- Any transition into `submitted` without a `Case.destinationJurisdiction` set.
