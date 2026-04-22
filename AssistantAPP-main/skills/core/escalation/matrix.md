---
id: core.escalation.matrix
owner: founding-engineer
jurisdiction: GLOBAL
service_lines: ["*"]
audience: [lawyer, staff]
tone: internal-ops
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 90
supersedes: []
superseded_by: null
privileged: false
---

# Escalation matrix

Binding mapping of typed `escalation.*` events to the role that
approves them, the SLA (D-013 tiers), and the notification channel
on a failed SLA. The orchestrator reads this to build HITL rows; do
not hand-wire per-agent escalation logic.

## Tier definitions (D-013)

| Tier | SLA | Triggers | Off-hours? |
|---|---|---|---|
| Standard | 4h | General advice review, routine outbound | No (office hours only) |
| Urgent | 1h | `escalation.urgent_deadline` (visa <72h, hearing <7d) | Yes (staff pager) |
| Critical | 15 min (business) / pager (off-hours) | `escalation.adverse_notice` (denial), `escalation.criminal_history` (intake disclosure) | Yes (partner pager) |
| Marketing | 24h | All marketing content (D-010) | No |

## Event → routing

| Event | Routed to | Pauses on case | SLA tier | Notes |
|---|---|---|---|---|
| `escalation.criminal_history` | `LAWYER_ADMIN` | Intake only | Critical | Written disclosure; Critical in case of material charges |
| `escalation.prior_refusal` | `LAWYER_ADMIN` | Intake only | Urgent | Prior visa denial disclosed at intake |
| `escalation.urgent_deadline` | `LAWYER_ADMIN` + partner pager | All auto | Urgent | <72h to filing, <7d to hearing |
| `escalation.adverse_notice` | `LAWYER_ADMIN` | All auto | Critical | Denial / adverse decision received from regulator |
| `escalation.distressed_client` | On-call counsel | Voice + WA | Critical | Voice-AI or message triggered "distressed" classifier |
| `escalation.fraud_indicator` | `LAWYER_ADMIN` + compliance | All auto | Critical | Document mismatch, identity inconsistency |
| `escalation.fee_dispute` | Billing + `LAWYER_ADMIN` | Billing | Urgent | Client disputes an invoice |
| `escalation.inconsistent_identity` | Intake reviewer | Intake | Urgent | OCR vs. typed-name mismatch beyond tolerance |
| `escalation.marketing_content` | Platform Marketing + native AR reviewer (if AR) | Publish | Marketing | 24h SLA per D-010; native AR reviewer gate per D-015 |
| `escalation.cross_tenant_data_leak` | Platform Admin | All platform | Critical | Sev-1 bug — also appends to `docs/BUGS.md` |

## "Pauses" column semantics

- **Intake** — the intake agent stops emitting `case.created` until
  the HITL row is APPROVED or REJECTED.
- **All auto** — Orchestrator sets `Case.autoPauseUntil = now + 7d`;
  no automated outbound until the pause is cleared. Manual staff
  outbound is still allowed.
- **Voice + WA** — voice and WhatsApp agents are muted for this case
  until a human lawyer clears the flag.
- **Billing** — billing agents stop outbound reminders for the case.
- **Publish** — marketing-HITL holds the article / listing in
  `PENDING_HITL` status until approval.
- **All platform** — platform-level kill switch; agents other than
  deadline + escalation stop system-wide until incident is closed.

## Notification channel on SLA miss

| Tier | Primary | Secondary (2× SLA) | Tertiary (3× SLA) |
|---|---|---|---|
| Standard | In-app + email | Email reminder | Ops digest |
| Urgent | In-app + email + SMS | Partner pager | Platform Admin |
| Critical | Partner pager | Platform Admin | Founder |
| Marketing | In-app + email | Platform Marketing email | Platform Admin |

## How agents emit escalations

```ts
// Inside an agent's run.ts — do NOT emit these strings as prose.
await emit('escalation.urgent_deadline', {
  caseId,
  correlationId,
  reason: 'visa_72h_filing_window',
  metadata: { deadline: '2026-04-25' },
})
```

The orchestrator creates the `HITLApproval` row, sets
`autoPauseUntil` on the case if the matrix requires, and routes to
the approver role. The agent does NOT write the approval row
directly — always goes through `emit`.
