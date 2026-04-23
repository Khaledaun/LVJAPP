---
domain: i18n-rtl
owner: platform-engineering
jurisdiction: n/a
confidence: draft
id: i18n-rtl.skill.root
reviewed_at: 2026-04-22
review_ttl_days: 90
review_ttl: 2026-07-22
motivated_by:
  - Decision D-015 Arabic is first-class for v1
  - PRD v0.3 §4.4 Design language (Arabic typography)
  - PRD v0.3 §4.9 Arabic-first commitments
---

# i18n · RTL · Arabic-friendly UX

Operational patterns for delivering EN / AR / PT content with full
right-to-left support. Arabic is first-class in v1 per D-015; no
"EN-first, AR-later" workaround.

## Scope

- **Locale routing.** Every URL has an `/ar` equivalent; locale persists
  across Webflow ↔ app ↔ portal.
- **Typography.** Display: **Amiri** (pairs Cormorant Garamond).
  Body: **IBM Plex Sans Arabic** (pairs Inter). Mono: JetBrains Mono
  (Latin for IDs — SEF/AIMA convention).
- **RTL layout rules.**
  - All margin / padding uses logical properties (`ms-*`, `me-*`,
    `ps-*`, `pe-*`).
  - Icon flips: arrows + chevrons mirror; brand marks + status icons
    do not.
  - Tables: column order preserved; alignment flips.
  - Numerals: locale-aware via `Intl.NumberFormat`.
  - CSS attribute selector swaps `--font-display` → `--font-display-ar`
    and `--font-body` → `--font-body-ar` under `[dir="rtl"]`.
- **Transliteration.** Arabic ↔ Latin for SEF/AIMA forms (legal names
  must be in Latin script on Portuguese filings).
- **Quality bar.** Native AR reviewer in marketing-HITL for AR content;
  weekly AR sampling KPI (≥90% pass rate).

TODO: full content — component audit checklist, golden fixtures.
