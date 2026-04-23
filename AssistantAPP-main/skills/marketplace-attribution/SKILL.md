---
domain: marketplace-attribution
owner: platform-admin
jurisdiction: n/a
confidence: draft
id: marketplace-attribution.skill.root
reviewed_at: 2026-04-22
review_ttl_days: 90
review_ttl: 2026-07-22
motivated_by:
  - PRD v0.3 §4.7 Marketplace & commercial
  - Decision D-007 Commission rate (flat 25%)
  - Decision D-016 Stripe Connect day 1
  - Architecture Decision #15 (attribution immutable; disputes via overrides)
---

# Marketplace Attribution & Commission

Lead → conversion → commission ledger, with immutable attribution and
override-row dispute workflow.

## Scope

- **`MarketingLead.originatedBy`** immutable at write. Enum:
  `LVJ_PLATFORM | TENANT_DIRECT | PROVIDER_REFERRAL | PUBLIC_DIRECT`.
- **Attribution classifier** (`AITask: attribution-classify`) routes
  Mistral large for cost-efficient classification at lead creation.
- **Commission rate:** flat **25%** across all categories per D-007.
  Versioning at the `ServiceProvider` row is out of scope for v1.
- **Commission ledger** (`CommissionLedger`) — per-conversion row.
  Provider sees own rows; Platform Admin sees cross-provider dashboard.
- **Settlement via Stripe Connect** (D-016). Monthly cron aggregates
  ledger rows into `CommissionPayout` and transfers.
- **Disputes via `AttributionOverride` rows** — never mutate the
  original lead. Override requires Platform Admin sign-off + audit row.

TODO: full content — classifier heuristics, ledger state diagrams,
payout cron schema, dispute workflow.
