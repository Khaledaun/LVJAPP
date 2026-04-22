---
id: core.languages
owner: founding-engineer
jurisdiction: [PT, AE, GLOBAL]
service_lines: ["*"]
audience: [lawyer, staff, client]
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

# Languages & locales

Binding contract for which locales agents produce, which go through
HITL, and which stay behind a feature flag.

## Shipped in v1 (per D-015 supersedes D-003)

| Locale | UI | AI Counsel | Drafting agent | Voice | Marketing |
|---|---|---|---|---|---|
| `en` | ✅ | ✅ | ✅ | ✅ (Twilio + EN voice id) | ✅ |
| `ar` | ✅ (RTL) | ✅ | ✅ | ✅ (ELEVENLABS_VOICE_ID_AR) | ✅ (native AR reviewer gate per D-015) |
| `pt` | 🟡 stub | ❌ v1.x | ❌ v1.x | ❌ v1.x | ❌ v1.x |

PT is **planned** for v1.x. The `messages/pt.json` stub exists so
the i18n loader does not crash when the locale is forced; no
production surface shows Portuguese copy until Portuguese counsel
signs off on the translation + OA regulatory phrasings.

## Out of scope (never ship without a new D-NNN)

- Any language we cannot source a native reviewer for.
- Any language without a bar-admitted attorney in the supported
  jurisdictions who can speak it to a client (UPL risk).

## Locale precedence (see `lib/i18n.ts`)

1. Explicit URL path segment (`/ar/...`, `/en/...`, `/pt/...`).
2. `lvj_locale` cookie.
3. `Accept-Language` header (first supported).
4. `DEFAULT_LOCALE = 'en'`.

## Agent schemas

`IntakeInputSchema.locale` and `DraftingInputSchema.locale` accept
`'en' | 'ar' | 'pt'`. Drafting output into PT is blocked at the
`confidence: authoritative` gate until the PT sprint.

## Identifiers stay Latin

Case IDs, file numbers, ISO dates, fee amounts with currency codes
all render in Latin script regardless of locale — matches SEF/AIMA
convention. `lib/i18n-rtl.ts` `formatNumber(value, locale, 'identifier')`
enforces.

## Arabic review chain (D-015)

Every client-facing AR output passes through a native Arabic
reviewer in marketing-HITL:

```
AR Drafting → AR guardrails scan → MarketingApproval
  { arabicReviewerRequired: true }
 → native AR reviewer (24h SLA per D-010)
 → English reviewer (if content is dual-locale)
 → publish
```

The gate is hard: no AR client-facing content ships without the
native AR reviewer's approval, even if the English reviewer has
signed off.

## Name transliteration

Client names stay in the script the client provided. We DO NOT
transliterate a name from Arabic to Latin unless:
- The regulator requires it (SEF/AIMA forms use the passport's
  MRZ transliteration — which is itself Latin).
- The client explicitly confirms the transliteration in writing
  (captured in the intake wizard's name-field with a tooltip).

When both scripts are needed ("name as on passport" field), store
both on the `Client` row and never treat one as canonical.
