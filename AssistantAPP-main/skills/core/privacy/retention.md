---
id: core.privacy.retention
owner: founding-engineer
jurisdiction: [PT, AE, GLOBAL]
service_lines: ["*"]
audience: [lawyer, staff]
tone: legal-formal
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 90
supersedes: []
superseded_by: null
privileged: false
---

# Data retention windows

**Review blocker:** DPO sign-off required (Sprint 16 pre-req).

Every log / data class has a retention window. The `cron/analytics-rollup`
job (Claude.md v4.0 §Phase 5 Sprint 16) sweeps and soft-deletes;
`cron/audit-cost-daily` flags anything past 2× its window.

## Windows

| Class | Retention | Trigger | Deletion target |
|---|---|---|---|
| `AuditLog` | 7 years | `createdAt` | Soft delete + tombstone |
| `AutomationLog` | 2 years | `startedAt` | Hard delete |
| `NotificationLog` | 2 years | `createdAt` | Hard delete |
| `VoiceCallLog` — with consent | 2 years | `startedAt` | Hard delete |
| `VoiceCallLog` — no recording consent | Session only | session end | Immediate hard delete |
| `AgentDraft` (unsent) | 90 days | `createdAt` | Hard delete (never used) |
| `EligibilityLead` — converted | 10 years (matches Case) | linked `Case.createdAt` | Archive with Case |
| `EligibilityLead` — not converted | 12 months | `createdAt` | Hard delete (GDPR Art. 6(1)(a) expired) |
| `MarketingLead` — converted | 10 years | linked `Case.createdAt` | Archive |
| `MarketingLead` — not converted | 12 months | `createdAt` | Hard delete |
| `MarketingTouch` | 24 months | `createdAt` | Aggregate-only after |
| `Case` + child docs | 10 years after `completed`/`archived` | terminal status | Vault archive + AuditLog tombstone |
| `/vault` files | Same as parent Case | `Document.createdAt` | GCS lifecycle rule |
| Lawyer work-product (privileged) | 10 years | terminal status | Tombstone + preserve encrypted blob |
| DSAR requests | 3 years after closure | `DSAR.closedAt` | Hard delete |
| Ingested Webflow webhook bodies | Never stored raw — audited by key only | n/a | n/a |

## Rules

- Nothing deletes without an `AuditLog action='retention.deleted'`
  row citing the article id and window.
- Hard delete must be irreversible: scrub from primary DB + replicas
  + backups that cross the window.
- Privileged work-product never leaves the encrypted vault; retention
  applies to metadata only.
- A DSAR erasure request (GDPR Art. 17) overrides all retention
  windows except the **legal hold** carve-out (active litigation).

## Legal-hold carve-out

When counsel marks a case `legalHold: true`, all retention sweeps
for that case suspend. `AuditLog action='legal_hold.enabled'` + the
memo from the lawyer are mandatory.

## Agent contract

Agents:
- ❌ never `delete` Prisma rows directly. Deletion is the retention
  cron's job.
- ✅ may `update(status: 'archived')` when a lead is abandoned — the
  retention sweep then picks it up per the window.
- ❌ never log raw PII (see `docs/EXECUTION_PLAN.md` §7.4 + C-019).
  The PII scrubber runs before any `AuditLog.diff` persistence.

## Cross-tenant note (D-018)

Retention windows are applied per-tenant, not globally. Platform
Admin aggregate analytics (anonymised, k-anonymity ≥ 5) use
`AnalyticsAggregate` rows that are *not* subject to the per-row
retention windows since they contain no PII.
