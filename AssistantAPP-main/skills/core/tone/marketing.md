---
id: core.tone.marketing
owner: founding-engineer
jurisdiction: [PT, AE, GLOBAL]
service_lines: ["*"]
audience: [public]
tone: marketing
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 90
supersedes: []
superseded_by: null
privileged: false
---

# Tone: marketing

Used for: Webflow blog posts, eligibility-quiz copy, Public Service
Provider Directory listings, social posts, explainer articles on
`/ar` Webflow locale.

**Review blocker:** lawyer + native-AR reviewer sign-off per D-015 +
D-010 (24h marketing-HITL SLA) before `confidence: authoritative`.

## Voice

- Clear, not cutesy. We advise people on serious life decisions.
- Lead with the reader's question, not LVJ's product.
- Cite regulator sources (SEF, OA, MOJ) by name and link.
- Zero outcome guarantees (see `core/disclaimers/outcome.md`).

## Structured-data contract (D-011, SEO/AEO/GEO)

Every article ships with:
- `Article` schema.org JSON-LD with `author` (firm), `reviewedBy`
  (lawyer name + bar admission + date), `inLanguage`.
- FAQ `schema.org/FAQPage` block for any Q&A patterns.
- Freshness timestamp surfaces as `dateModified`.
- Jurisdiction tag renders as a visible chip ("Portugal / D7 Visa")
  — E-E-A-T signal for generative search.

## Banned in marketing output

- "Guaranteed approval" / "100% success" — hard block (C-017).
- Comparison-advertising of other firms — banned under OA conduct.
- Case-specific advice — marketing is general-info only. Anything
  case-specific requires a consultation booking.
- Before/after photos of clients (immigration category — consent
  + lookalike-identity issues).

## AR marketing copy

AR content is NEVER auto-published. Path:
1. Drafting agent produces AR draft.
2. Guardrails scan (banned phrases mirrored per D-015).
3. `MarketingApproval` row created with
   `arabicReviewerRequired: true` per D-015.
4. Native AR reviewer approves → English reviewer approves → publish.

## Example approved openings

> EN: *"If you're from the Gulf and thinking about moving your
> family to Portugal, the D6 family-reunification route is the one
> most people ask about — here's how it actually works in 2026."*
>
> AR: *"إذا كنت من دول الخليج وتفكّر في نقل عائلتك إلى البرتغال،
> فإن مسار D6 للمّ شمل العائلة هو الأكثر طلباً — وفيما يلي كيفية
> عمله فعلياً في 2026."*

> EN: *"SEF publishes D7 requirements every year — the practical
> threshold most of our clients miss is the passive-income stability
> proof. Let's unpack it."*
>
> AR: *"تنشر SEF متطلبات تأشيرة D7 سنوياً — والعتبة العملية التي
> يتجاوزها معظم عملائنا هي إثبات استقرار الدخل السلبي. دعنا نحلّلها."*
