---
id: arabic-localization.skill.root
domain: arabic-localization
owner: platform-engineering
jurisdiction: PT, AE
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 90
review_ttl: 2026-07-22
supersedes: []
superseded_by: null
privileged: false
motivated_by:
  - PRD v0.3 §4.9 Arabic-first commitments item 8
  - Decision D-015 Arabic is first-class for v1
  - Complement to skills/i18n-rtl/SKILL.md (app shell) and
    skills/core/languages.md (locale contract)
---

# Arabic localization — RTL, typography, name transliteration

Operational patterns specific to **producing Arabic output that
holds up legally and culturally**, beyond the app-shell RTL
mechanics covered in `skills/i18n-rtl/`.

Applies to: AI Counsel AR answers, drafting-agent AR letters, AR
eligibility quiz, AR voice (ElevenLabs), AR notification
templates, AR marketing content.

## 1. What this skill owns vs. what it doesn't

**Owns.**

- Arabic **copy quality**: register, dialect choice, formality,
  honorifics, legal terminology that doesn't read as
  machine-translated.
- **Name transliteration** between Arabic script (ع ر ب ي ة) and
  Latin script for SEF/AIMA + GDRFA/ICA forms.
- **Date / number / calendar** conventions: Eastern Arabic
  numerals (٠-٩) vs. Western (0-9); Hijri ↔ Gregorian alongside;
  how to write case IDs and filing references.
- **Right-to-left editorial traps** that purely-layout RTL
  (covered by `i18n-rtl`) doesn't catch: bidi punctuation,
  mixed-script lines, digit shape, quote marks.
- **Cultural register** calibrated for immigration/legal audience
  (Gulf formal vs. Levantine vs. Maghrebi flavour decisions).

**Does NOT own.**

- App-shell RTL (`dir="rtl"`, mirrored navigation, logical CSS
  properties) — that's `skills/i18n-rtl/`.
- Generic translation mechanics, locale switcher wiring, message
  catalogues — `skills/core/languages.md`.
- Arabic typography token definitions (Amiri + IBM Plex Sans
  Arabic) — `Claude.md` §4.4 + globals.css.

## 2. Dialect + register — one choice, stated here

**Dialect.** Modern Standard Arabic (MSA, العربية الفصحى
المعاصرة). Every client-facing and staff-facing Arabic output.

**Rationale.**

- MSA is the only register comprehensible to every Arabic-speaking
  client across PT diaspora (Levantine, Gulf, Maghrebi,
  Egyptian).
- Regulatory forms (SEF/AIMA, GDRFA/ICA) accept MSA transliteration
  conventions.
- MSA is what Amiri + IBM Plex Sans Arabic are designed for.

**Register.** Formal (رسمي). For every surface except the
client-portal UI microcopy, which may use "formal-warm" (still
MSA, but short sentences, second-person singular "أنت/أنتِ" gender-
aware rather than plural "حضراتكم").

**Not allowed.** Colloquial/dialect Arabic (Levantine, Gulf,
Egyptian). Verbose court Arabic (عربية قضائية مبالغ فيها) —
sounds like overcompensation, not authority.

## 3. Name transliteration — Arabic ↔ Latin script

Every Arabic name that lands in a Portuguese or UAE immigration
form has to be transliterated both ways. The choice of scheme is
binding for the platform because SEF/AIMA matches documents on
exact-string comparison.

### Scheme: ALA-LC (Library of Congress) with PT + SEF adaptations

- **Client-facing + internal records:** store BOTH the
  Arabic-script name (as written on the passport / national ID)
  AND the Latin-script transliteration (as written on the
  passport MRZ / SEF filing).
- **Never transliterate from scratch.** Always copy the Latin
  spelling from the **passport machine-readable zone (MRZ)** or
  the client-provided ID. The platform's job is to preserve, not
  re-generate.
- **When MRZ is missing** (handwritten document, ID scan with
  unclear Latin line): fall back to ALA-LC simplified table
  (below) and flag the case for attorney review.

### ALA-LC simplified table (fallback only)

| Arabic | Latin (ALA-LC) | Common variants to map |
|---|---|---|
| ا | a / ā | a |
| ب | b | b |
| ت | t | t |
| ث | th | th, s (Gulf) |
| ج | j / ǧ | j, g (Egyptian) |
| ح | ḥ | h |
| خ | kh | kh, ch |
| د | d | d |
| ذ | dh / ḏ | dh, z |
| ر | r | r |
| ز | z | z |
| س | s | s |
| ش | sh | sh, ch |
| ص | ṣ | s |
| ض | ḍ | d, dh |
| ط | ṭ | t |
| ظ | ẓ | z, dh |
| ع | ʿ | '', apostrophe, absent |
| غ | gh | gh |
| ف | f | f |
| ق | q | q, k (Gulf) |
| ك | k | k |
| ل | l | l |
| م | m | m |
| ن | n | n |
| ه | h | h |
| و | w / ū | w, u, o |
| ي | y / ī | y, i, e |
| ء | ʾ | '', apostrophe, absent |

### Practical rules

1. **Diacritics (macrons, dots) are DROPPED on forms.** SEF/AIMA
   and GDRFA/ICA do not accept them. Store both forms; submit the
   no-diacritic one.
2. **Article "ال" (al-)** is written with a hyphen (`al-Aswad`,
   not `Alaswad` or `al Aswad`). Passport MRZ may omit it; mirror
   the passport exactly.
3. **"Ibn" / "bint"** in compound names follow the passport. Some
   documents omit them; match.
4. **Tā' marbūṭa (ة) at end of first name:** normally silent → "a"
   ("Fatima", not "Fatimah"). If the passport shows "-h", match it.
5. **Conflict resolution.** If two LVJ-held documents disagree on
   the Latin spelling, the passport wins.

### Data model implication

Every `Client`, `Partner`, `ServiceProvider`, `LeadContact` row
gets two name fields at creation time:

- `nameArabic: string` — Arabic-script form from passport / ID.
- `nameLatin: string` — Latin-script form, MRZ-verbatim when
  available.

Single-name-field records are a Sev-3 bug for any record created
after Sprint 0.5.

## 4. Numerals, dates, calendars

**Body copy.** Eastern Arabic numerals (٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩) in
Arabic running prose.

**Filing references, case IDs, dates on forms.** Western Arabic
numerals (0-9), Latin script. SEF/AIMA + GDRFA/ICA store them
that way; our UI mirrors.

**Dates.** Gregorian primary; Hijri parenthetical where useful
("15 يونيو 2026 (30 ذو القعدة 1447)"). Never Hijri alone on a
legal document — regulators file by Gregorian.

**Months.** Arabic calendar months are أشهر هجرية; Gregorian
months are Arabic-ordered names (يناير، فبراير، …). Use the
Gregorian Arabic names for all body text.

## 5. RTL editorial traps that layout-only RTL doesn't fix

1. **Bidi punctuation around Latin inclusions.** A case ID
   embedded in an Arabic sentence (`القضية رقم CASE-2026-001 جاهزة`)
   needs a Left-to-Right Mark (LRM) before `CASE-` if the next
   character is Arabic. Missing LRM → punctuation renders on the
   wrong side.
2. **Digit shape in mixed content.** Inside an Arabic sentence,
   a Gregorian date like `2026-06-15` stays in Western numerals
   but must be wrapped in LRM so the hyphens don't flip.
3. **Quotation marks.** Arabic uses «guillemets» (U+00AB / U+00BB)
   in formal writing. Never use Latin "double quotes" in Arabic
   body copy.
4. **Line-break in long list items.** Arabic words don't hyphenate.
   Don't apply `word-break: break-all` on AR content — it breaks
   mid-word and looks illiterate.
5. **Ellipsis.** Arabic ellipsis "…" is identical to Latin but
   renders RTL-first by default; no LRM needed.

## 6. Legal-register vocabulary — the hits

The terms below show up in every immigration drafting output and
are the top-5 mistranslation risks. Freeze them here; agents must
not paraphrase.

| English | Arabic (MSA) | Notes |
|---|---|---|
| Residency permit | تصريح الإقامة | Not إقامة alone — ambiguous. |
| Work visa | تأشيرة عمل | Not فيزا عمل (colloquial). |
| Golden visa (PT) | التأشيرة الذهبية | Keep the definite article. |
| Family reunification | لم الشمل العائلي | Standard term across PT + UAE. |
| Additional-evidence request | طلب أدلة إضافية | Pairs with SEF's "pedido de elementos adicionais". |
| Client Trust Account | حساب الأمانة الخاص بالعميل | Literal; never IOLTA-adjacent terminology. |
| Portuguese Bar (OA) | نقابة المحامين البرتغالية | Never "البار" (anglicism). |
| Deadline | الموعد النهائي | Not تاريخ التسليم (ambiguous). |
| Appeal | الطعن | Not استئناف (specific to trial court). |
| Denial | الرفض | Plain; no euphemism. |

## 7. HITL review requirements (D-015)

Every AR output with `advice_class ∈ {firm_process,
attorney_approved_advice}` MUST be reviewed by a **native
Arabic-speaking reviewer** in the marketing-HITL or legal-HITL
chain before publication. `general_information` is exempt but
sampled weekly per the A-011 KB freshness audit.

Native-reviewer coverage is a Sprint 13 + Org gap (see
`docs/EXECUTION_PLAN.md` §12.3).

## 8. Related skills + decisions

- `skills/i18n-rtl/SKILL.md` — app-shell RTL (dir attribute,
  logical CSS, locale switcher).
- `skills/core/languages.md` — locale contract (EN / AR / PT,
  locale cookie, Accept-Language resolution).
- `docs/DECISIONS.md` D-015 — Arabic is first-class for v1.
- `docs/PRD.md` §4.4 — Amiri + IBM Plex Sans Arabic typography.
- `docs/PRD.md` §4.9 — Arabic-first commitments (this skill is
  item 8).
- `skills/portugal-immigration/SKILL.md` — SEF/AIMA form
  conventions (where transliteration rules bind).
- `skills/uae-immigration/SKILL.md` — GDRFA/ICA conventions
  (v1.x).
