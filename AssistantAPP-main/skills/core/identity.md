---
id: core.identity
owner: founding-engineer
jurisdiction: GLOBAL
service_lines: ["*"]
audience: [lawyer, staff, client, public]
tone: internal-ops
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 180
supersedes: []
superseded_by: null
privileged: false
---

# Firm identity

Canonical facts about LVJ that every agent may cite without further
verification. **Any edit to this file must pass lawyer review** — the
firm name, address, and bar-admissions data are shown to clients.

## Platform vs. firm

- **LVJ Platform** — the operator of the multi-tenant SaaS at
  `app.lvj.law`. Not a law firm itself. Takes a flat 25%
  commission of fees routed through the marketplace (D-007).
- **LVJ-the-firm** — tenant #1 on the Platform. Portuguese immigration
  practice. Founder: Khaled Aun. All client representation and legal
  advice flow through a tenant (firm), never the Platform.

## Jurisdictions (per D-006)

- **Primary (v1):** Portugal. Regulators: SEF / AIMA. Conduct: Ordem
  dos Advogados (OA). Data: EU GDPR.
- **Secondary (v1.x):** United Arab Emirates. Regulators: GDRFA / ICA.
  Conduct: UAE Bar / MOJ. Data: UAE PDPL + DIFC/ADGM where applicable.
- **Out of scope:** United States immigration (D-006 supersedes the
  v3.2 US-immigration roadmap).

## Public-facing domains

- Marketing site: `www.lvj-visa.com` (Webflow CMS) with `/ar` and
  future `/pt` locales.
- App: `app.lvj.law`.
- Public provider directory: `www.lvj-visa.com/providers` (D-017).

## Support hours

Default **Europe/Lisbon** business hours: 09:00–18:00 Mon–Fri.
Per-actor availability windows (D-014) override. After-hours pager
routes Tier 2 (Urgent) and Tier 3 (Critical) HITL escalations only
(D-013).

## What agents may and may not say

- ✅ "LVJ AssistantApp" as the product name.
- ✅ "Ordem dos Advogados" for the Portuguese bar (not "Portuguese Bar
     Association" — not a recognised translation).
- ✅ "SEF/AIMA" for the Portuguese Immigration and Borders Service.
- ❌ Never assert the firm holds a bar admission outside Portugal /
     UAE without a D-NNN override. Cross-jurisdictional claims have
     UPL exposure (see `core/disclaimers/upl.md`).
- ❌ Never use the legacy label "LVJ Law Firm USA" — the US surface is
     explicitly out of scope per D-006.

## Trust-account language (per jurisdiction)

- Portugal: Portuguese Client Trust Account (CTA). Env var:
  `STRIPE_PT_CTA_ACCOUNT_ID`.
- UAE (v1.x): UAE escrow.
- The term **IOLTA** is US-only; banned in all Portugal/UAE output
  (A-004 jurisdiction audit flags hits).

## Licensing line

Every client-facing output that references "our counsel" or "our
lawyers" must be qualified by destination jurisdiction. Phrasings:

> *"Our Portuguese-licensed counsel can advise on D-visa strategy;
> for UAE-side questions our UAE-licensed counsel handles those
> matters directly."*

A lawyer **licensed in the matter's destination jurisdiction** is the
only role permitted to set `advice_class = attorney_approved_advice`
on an agent output (docs/AGENT_OS.md §8.1). The `invoke()` wrapper
enforces license-jurisdiction parity.
