---
domain: escalation
owner: platform-engineering
jurisdiction: n/a
confidence: draft
id: escalation.skill.root
reviewed_at: 2026-04-22
review_ttl_days: 90
review_ttl: 2026-07-22
motivated_by:
  - Decision D-013 HITL escalation tiers
  - Decision D-010 Marketing-HITL SLA
  - PRD v0.3 §4.5 HITL SLA tiers
---

# Escalation Matrix

Four-tier HITL escalation routing for the `HITLApproval` queue.
`services/orchestrator.ts` sets `HITLApproval.tier` based on
`escalation.*` event type; `/admin/approvals` UI sorts by tier.

## Scope

- **Tiers (D-013):**

  | Tier      | SLA                                       | Triggers                                                                                         |
  |-----------|-------------------------------------------|--------------------------------------------------------------------------------------------------|
  | Standard  | 4h                                        | General advice review, routine outbound                                                          |
  | Urgent    | 1h                                        | `escalation.urgent_deadline` (visa < 72h, hearing within 7d)                                     |
  | Critical  | 15 min business hours / paged off-hours   | `escalation.adverse_notice` (denial received), `escalation.criminal_history` (intake disclosure) |
  | Marketing | 24h                                       | All marketing content (per D-010)                                                                |

- **Pager.** Off-hours pager fires on `critical` tier only. Per-tenant
  rotation. Escalates to `PLATFORM_ADMIN_PAGE_NUMBER` if no Tenant
  approver responds in 15 min.
- **Quiet hours override.** Tier 2 (urgent) / Tier 3 (critical) both
  ignore per-actor quiet hours (D-014 fallback for client-comms does
  not apply to internal pager).
- **License parity.** Advice-class approvers must be licensed in the
  case's `destinationJurisdiction` — `invoke()` wrapper enforces.
- **Native AR reviewer** required in the chain for AR marketing
  content (per D-015).

TODO: full content — event-type catalogue, per-tenant pager rotation
configuration.
