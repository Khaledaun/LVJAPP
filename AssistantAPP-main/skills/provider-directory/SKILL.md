---
domain: provider-directory
owner: platform-marketing
jurisdiction: n/a
confidence: draft
id: provider-directory.skill.root
reviewed_at: 2026-04-22
review_ttl_days: 90
review_ttl: 2026-07-22
motivated_by:
  - Decision D-017 Public Service Provider Directory in v1
  - PRD v0.3 §4.8 Marketing & content
---

# Public Service Provider Directory

Opt-in public listing surface at `lvj-visa.com/providers` (and
`/providers/[slug]`) that mirrors approved `ServiceProvider` rows into a
Webflow CMS Collection.

## Scope

- **Opt-in flow:** provider flips `publicListingOptIn = true` in
  `/provider/settings`. Blocks at marketing-HITL (24h SLA per D-010)
  before publish.
- **Listing generator** (`AITask: provider-listing-draft`) composes
  profile copy from `ServiceProvider.publicProfile` JSON.
- **schema.org markup.** `Attorney`, `RealEstateAgent`,
  `FinancialService`, `LocalBusiness` (per category) with
  `areaServed` + `availableLanguage` (AR badge per D-015).
- **Webflow sync.** Prisma is source of truth; `ProviderListing` row
  owns the `webflowItemId`. Publish / unpublish / suspend round-trip
  via Data API.
- **Public pages.** EN + AR (RTL) per D-015; PT planned v1.x.
- **Spam / abuse mitigation** (Risk R13): marketing-HITL per listing +
  Platform-Admin suspension power.

TODO: full content — listing templates, schema.org JSON-LD, suspension
playbook.
