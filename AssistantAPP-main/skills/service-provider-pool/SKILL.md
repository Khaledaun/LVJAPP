---
domain: service-provider-pool
owner: platform-admin
jurisdiction: n/a
confidence: draft
id: service-provider-pool.skill.root
reviewed_at: 2026-04-22
review_ttl_days: 90
review_ttl: 2026-07-22
motivated_by:
  - PRD v0.3 §2.1 Tenancy hierarchy
  - PRD v0.3 §4.7 Marketplace & commercial
  - PRD v0.3 "What changed from v0.2" (property-mgmt + hospitality added)
---

# Service Provider Pool

Onboarding, monitoring, and offboarding patterns for the 10-category
Service Provider Pool. Category list is Platform-Admin extensible (a
`CustomCategory` table stores additions at runtime).

## Scope

- **Categories at launch (10):** lawyer (non-primary jurisdictions),
  realtor, accountant / tax, fund manager, translator, apostille, bank
  facilitator, relocation / concierge, **property management**,
  **hospitality**.
- **Per-category document checklist:** license, insurance,
  corporate-structure proof, references. Vault path:
  `/vault/providers/<providerId>/` (encrypted at rest per architecture
  decision #14).
- **Monitoring KPIs.** Response SLA, client satisfaction, dispute rate,
  engagement completion. Surface in `/platform/providers`.
- **Availability** (D-014): per-provider windows + quiet-hours
  fallback. Cross-ref `skills/availability/`.
- **Offboarding.** Suspend → archive → verifiable document deletion
  per tenant's DPA. Past engagements remain in the audit chain.

TODO: full content — category-by-category onboarding scripts, KPI
definitions, suspension criteria.
