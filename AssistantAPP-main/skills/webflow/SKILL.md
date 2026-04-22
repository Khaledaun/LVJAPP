---
domain: webflow
owner: platform-marketing
jurisdiction: n/a
confidence: draft
review_ttl: 2026-07-22
motivated_by:
  - PRD v0.3 §4.8 Marketing & content
  - Decision D-011 Webflow staging = draft state on live site
  - Decision D-017 Public Service Provider Directory
  - Architecture Decision #12 (Webflow Data API via raw fetch())
---

# Webflow Data API

Integration patterns for the Webflow Data API used by the Marketing
Automation module and the Public Service Provider Directory.

## Scope

- **CMS create / update / publish** via raw `fetch()` (no SDK — per
  architecture decision #12).
- **Webhook signature verification** on `/api/webhooks/webflow`:
  HMAC-SHA256 over raw body with `WEBFLOW_WEBHOOK_SECRET`.
- **Locale handling.** Webflow's multi-locale site structure mirrors
  `targetLocale ∈ {EN, AR, PT}`. RTL on `/ar` surfaces.
- **Draft state on live site** (D-011): `publishDraft()` uses Webflow's
  unpublished flag; `approvePublish()` flips to published after
  marketing-HITL approval.
- **Rate limits + retry** with exponential backoff on 429 / 5xx.
- **Collections mirrored:** `ContentArticle`, `ProviderListing`,
  `ProviderTestimonial`. Single source of truth = Prisma; Webflow is a
  render layer.

TODO: full content — endpoint catalogue, auth, error shapes.
