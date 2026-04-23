---
domain: marketing-automation
owner: platform-marketing
jurisdiction: EU-PT primary; UAE secondary
confidence: draft
id: marketing-automation.skill.root
reviewed_at: 2026-04-22
review_ttl_days: 90
review_ttl: 2026-07-22
motivated_by:
  - PRD v0.3 §4.8 Marketing & content
  - Decision D-010 Marketing-HITL 24h SLA
  - Decision D-011 Webflow staging = draft state on live site
  - Decision D-017 Public Service Provider Directory
---

# Marketing Automation

Drafting → marketing-HITL → publish pipeline for LVJ marketing content
and the Public Service Provider Directory (D-017). Uses Webflow Data API
as the render surface; Prisma (`ContentArticle`, `ProviderListing`) is
the source of truth.

## Scope

- Content brief → draft (per-locale, per-destination-jurisdiction).
- Marketing-HITL gate (`HITLApproval.tier = 'MARKETING'`, 24h SLA per
  D-010). Native AR reviewer in the chain for AR content (D-015).
- Webflow publish: `lib/webflow.ts#publishDraft()` → marketing-HITL →
  `approvePublish()`.
- Banned-phrase linter + E-E-A-T compliance check before HITL.
- Jurisdiction disclaimer required on every article
  (SEF/AIMA / OA / UAE MOJ).
- Per-locale content (EN / AR / PT) handled via Webflow locale system.

TODO: full content — draft templates, HITL routing, publish API patterns.
