# LVJ AssistantApp — Product Requirements Document

*Version 0.3 — April 2026 · Owner: Khaled Aun (founder) · Maintainers: Khaled + Claude (chat) + Claude Code*

> **What changed from v0.2.** Founder ratified open questions →
> decisions `D-007` through `D-019` (see §7.2). Three of those decisions
> materially expand scope:
> 
> 1. **Arabic is first-class for v1, not deferred.** Full RTL, Arabic
>    typography pairing, AR throughout app + AI Counsel + voice +
>    notifications + eligibility quiz.
> 1. **Public Service Provider Directory** ships in v1 on
>    `lvj-visa.com/providers`. Approved providers opt in; Webflow CMS
>    mirrors the `ServiceProvider` model.
> 1. **Two new provider categories:** property management + hospitality.
>    Category list is Platform-Admin extensible. Commission is a flat
>    **25% across all categories**.
> 
> All v0.2 changes (multi-tenancy, Portugal-first jurisdiction,
> marketing automation layer, Webflow as marketing surface) are
> preserved.
> 
> **Companion documents** — `Claude.md` (engineering contract; pending
> re-baseline to v4.0), `docs/AGENT_OS.md`, `docs/EXECUTION_LOG.md`,
> `docs/DECISIONS.md`. Where this PRD and `Claude.md` v3.2 conflict,
> this PRD wins until `Claude.md` is re-baselined.

-----

## 1. Problem

### 1.1 Market problem

Cross-border immigration into Portugal (and shortly Dubai) for MENA + global clients is a **multi-stakeholder, multi-jurisdictional, regulated workflow** with no purpose-built coordination layer. A single Portuguese D-visa case typically pulls in:

- A Portuguese immigration lawyer (filing, OA-regulated)
- A realtor (rental/purchase contract — proof of accommodation)
- An accountant or tax advisor (NIF, NHR/IFICI tax regime)
- A bank facilitator (Portuguese bank account opening)
- A translator + apostille service (document chain-of-custody)
- For Golden Visa / D2 / Startup: a fund manager or business plan consultant
- For Family Reunification: a second lawyer in the country of origin
- **Property management** for clients buying or renting before arrival
- **Hospitality providers** for soft-landing accommodation during transition

Today these stakeholders coordinate over WhatsApp, email, and personal spreadsheets. The client experiences fragmentation. The lawyer carries the regulatory risk for everyone else’s mistakes. Lead origination is invisible — nobody can prove which marketing channel produced which closed case.

Existing legal CRMs (Clio, Lawmatics) are US/EU-firm-centric and do not model the **Service Provider** as a first-class case participant. No tool ties the **public-facing marketing surface** to the **case-management backend** to the **commission ledger** in one auditable system.

**Arabic-speaking clients are systematically underserved.** Most legal-tech is English-first with bolt-on translation. For LVJ’s MENA-source market, Arabic is the primary language of trust. RTL, native typography, AR-fluent AI Counsel, AR voice are baseline expectations, not premium features.

### 1.2 Internal problem (LVJ)

LVJ has:

- A Webflow marketing site at `www.lvj-visa.com` (Portuguese visa programs: D1, D2, D3, D7, D8, Golden, Startup, Family Reunification — plus an Arabic locale at `/ar`).
- A founder-led network across Portugal that can plausibly seed the first tenant firm + first realtor.
- No system of record. No lead → revenue attribution. No way to onboard a second firm or service provider without rebuilding from scratch.

LVJ’s commercial wedge: it owns the lead funnel (Webflow + AI-driven content + social) and brings clients to providers in exchange for a per-conversion fee. The platform must make this attribution defensible.

### 1.3 Why now

- **Generative search reshaping discovery.** ChatGPT / Perplexity / Google AI Overviews intercept ~30% of high-consideration query intent. Brands cited inside AI answers convert at ~4× organic. GEO/AEO is a one-time land-grab.
- **Webflow Data API mature** for full programmatic CMS publishing + webhook ingestion.
- **Multi-LLM routing** is production-viable.
- **Portugal residency demand peak** — post-2024 Golden Visa changes pushed demand into D2 / D7 / D8 / Startup.
- **Arabic LLM quality at parity** with English on instruction-following + document understanding for the first time (Claude 3.7, Gemini 2.5, GPT-5). AR-first product is finally buildable without a quality penalty.

-----

## 2. Users

### 2.1 Tenancy hierarchy

The system is multi-tenant by default. Every business entity carries `tenantId`.

```
Platform (LVJ as operator)
  └── Tenant — a law firm hosted on the platform (LVJ-the-firm = tenant #1)
        └── Office — physical location of that tenant
              └── TeamMember — staff, counsel, admin
        └── Case — a client matter
        └── Client — the end user (the applicant)
  └── ServiceProvider — non-firm participant
        ├── Categories: lawyer (additional jurisdictions), realtor,
        │   accountant/tax, fund manager, translator, apostille,
        │   bank facilitator, relocation/concierge,
        │   property management, hospitality
        ├── Public listing opt-in → mirrored to Webflow /providers
        └── ProviderEngagement — provider's role on a specific Case
  └── PublicVisitor — unauthenticated marketing/funnel traffic
```

### 2.2 Roles (RBAC)

The 7-role matrix in `Claude.md` v3.2 is **superseded**:

|Role                               |Surface                                        |Scope                    |Key jobs                                                                                                                |
|-----------------------------------|-----------------------------------------------|-------------------------|------------------------------------------------------------------------------------------------------------------------|
|**Platform Admin** (LVJ ops)       |`/platform/*`                                  |Cross-tenant             |Onboard tenants + providers; commission ledger; platform health; cost guardrails                                        |
|**Platform Marketing** (LVJ growth)|`/platform/marketing/*`                        |Marketing only           |Run content/SEO/GEO agents; review marketing drafts; manage Webflow CMS                                                 |
|**Tenant Admin** (firm partner)    |`/admin/*`                                     |Single tenant            |Firm settings, team, billing, service-type catalogue, agent flags                                                       |
|**Tenant Lawyer / Counsel**        |`/cases/*` + AI Counsel                        |Tenant-scoped            |Strategy, drafting, AI-assisted analysis, HITL approver                                                                 |
|**Tenant Paralegal / Intake**      |`/dashboard`, `/intake/*`, `/cases/*`          |Tenant + office          |Intake wizard, document gathering, routine comms                                                                        |
|**Tenant Office Manager**          |`/operations`                                  |Single office            |Caseload, capacity, office KPIs                                                                                         |
|**Service Provider Manager**       |`/provider/*`                                  |Single provider org      |Accept/decline LVJ-routed leads; manage team; commission ledger; **set availability windows**; **manage public listing**|
|**Service Provider Operator**      |`/provider/cases/*`                            |Assigned engagements only|Execute provider’s portion of a case                                                                                    |
|**End Client / Applicant**         |`/my-case` (Capacitor, **EN + AR**)            |Own case only            |Progress, upload docs, pay, message                                                                                     |
|**Public Visitor**                 |`/eligibility`, `/book`, Webflow site (EN + AR)|None                     |Self-screen, book, browse provider directory                                                                            |

### 2.3 Persona pressure points

- **Platform Admin (Khaled).** Single-pane view: active tenants, active providers per category, marketing funnel health, commission ledger, platform cost burn.
- **Tenant Admin.** Trusts LVJ enough to take the free tier; will defect on any tenant-isolation breach.
- **Service Provider (realtor, property manager, hospitality op).** Lives on WhatsApp. Wants LVJ-routed leads there + commission visibility + control over availability windows.
- **End Client (Arabic-speaking, MENA-based).** Mobile-first, RTL. Trusts native AR > translated AR. Reads AR notifications, expects AR voice messages, wants AI Counsel to respond fluently in AR.
- **Tenant Counsel (Portuguese-licensed).** OA + GDPR compliance-anxious. Needs HITL queue with tiered SLAs (`D-013`).

-----

## 3. Goals

### 3.1 Product goals (v1.0.0)

1. **Single multi-tenant system of record** — Tenant + Office + Case + Client + Provider + Engagement + Marketing-touch in one Postgres + GCS + audit chain, strict tenant isolation.
1. **Arabic-first, English-equal** — full RTL UI, native AR typography, AR throughout AI Counsel, AR voice via ElevenLabs multilingual, AR notification templates per channel, AR eligibility quiz. *(See §4.9.)*
1. **AI-native, lawyer-supervised** — every customer-facing AI output classified by `advice_class` and gated by HITL with tiered SLAs (`D-013`).
1. **Multi-channel native** — Email, SMS, WhatsApp (Kaspo), Voice (ElevenLabs + Twilio), Push (Firebase), In-App, dispatched via `lib/events.ts` with `Promise.allSettled()`. Webhook ingress from Webflow.
1. **Multi-tenant, multi-destination** — `tenantId` on every business model; `destinationJurisdiction` (PT, AE, expand later) drives forms, deadlines, regulator rules, language defaults.
1. **Service Provider Pool with public directory** — 10 categories at launch (extensible), per-category requirements, monitoring (response SLA, satisfaction, dispute rate), encrypted vault for contracts + IDs, **opt-in public listing on `lvj-visa.com/providers`**.
1. **Marketing Automation** — Webflow stays. Content / SEO / AEO+AIO / GEO / social agents draft → marketing-HITL (24h SLA, `D-010`) → publish via Webflow Data API. Form submissions → `MarketingLead`. Social via PostBridge.
1. **Self-serve onboarding** — tenants and providers sign up, accept contract, pay (when applicable), and start using the platform with no concierge step.
1. **Mobile parity for clients** — same Next.js routes power browser + Capacitor wrapper.
1. **Defensible by design** — encrypted vault, RBAC + tenant isolation, audit chain via shared `correlationId`, tenant-isolation breach count = 0.
1. **Self-improving** — every case outcome → `CaseOutcome`; every marketing touchpoint → `MarketingTouch` with attribution.

### 3.2 Business goals (v1.0.0)

1. **First 5 providers live on free 12-month tier** (`D-009`) — 1 Portuguese law firm + 1 realtor confirmed; 3 slots open across the other 8 categories.
1. **First commissioned conversion** end-to-end attribution defensible in audit log.
1. **Marketing funnel measurable:** Webflow inbound → `MarketingLead` → consultation booked → case opened → revenue.
1. **Replace internal tools** for first 5 providers.
1. **Tenant #2 onboardable in <24h, fully self-serve** (`D-019`).
1. **Public provider directory live** with ≥5 listings at launch.

### 3.3 Non-goals (v1.0.0)

Replacing Webflow. Active Google SSO. Custom-trained LLMs. Separate native mobile codebase. External workflow tools (n8n, Zapier, Make). Replacing vendor APIs. US immigration support. Tenant white-labelling beyond logo + accent.

-----

## 4. Constraints

Hard constraints. Violation = defect, not trade-off.

### 4.1 Technical (8 Golden Rules — preserved + 1 added)

1–8 from `Claude.md` v3.2 unchanged.
9. **Tenant isolation is absolute.** Every business model carries `tenantId`; cross-tenant queries require explicit `crossTenant: true` opt-in and are audit-logged. Cross-tenant leak = Sev-1.

### 4.2 Architecture (10 immutable + 6 added)

**Preserved:** No external workflow tools · Event bus · All AI through `lib/ai-router.ts` · `AutomationLog` for every automation · ElevenLabs→GCS→Twilio voice · Vercel Cron · Kaspo + PostBridge via raw `fetch()` · Capacitor · Multi-office via `officeId`.

**Added:**
11. Multi-tenant via `tenantId` FK + Prisma client middleware.
12. Webflow Data API via raw `fetch()`. CMS create/update/publish + webhook receipt.
13. Marketing content goes through HITL (separate reviewer set: Platform Marketing).
14. Service Provider documents (contracts, licenses, IDs, insurance) encrypted at rest in `/vault/providers/<providerId>/`.
15. Lead attribution computed at lead creation; `MarketingLead.originatedBy` immutable; disputes via `AttributionOverride` rows.
16. `destinationJurisdiction ∈ {PT | AE | …}` is a top-level field on `Case`, `ServiceType`, `ContentArticle`.

### 4.3 Legal & compliance

**Portugal (primary)**

- Regulator: SEF/AIMA. Visa types: D1, D2, D3, D7, D8, Golden, Startup, Family Reunification.
- Conduct: Ordem dos Advogados (OA) — confidentiality, advertising, UPL.
- Trust accounting: Portuguese Client Trust Account (CTA) per OA.
- Data: EU GDPR — DPA per tenant + per provider, lawful-basis tracking, right-to-erasure, DSAR workflow.
- Marketing: EU consumer protection + Portuguese advertising standards. No outcome guarantees, no comparison advertising without substantiation.

**UAE (v1.x)**

- Regulators: GDRFA / ICA; MOJ + DLA for legal practice.
- Visa types: Golden, Investor, Employment, Family.
- Conduct: UAE Bar / MOJ; license per Emirate.
- Trust: UAE escrow.
- Data: UAE PDPL + DIFC/ADGM where applicable.

**Cross-cutting**

- UPL: `advice_class ∈ {general_information | firm_process | attorney_approved_advice}`. Only `attorney_approved_advice` may leave the firm without HITL, and only a lawyer **licensed in the matter’s destination jurisdiction** may set it.
- Consent: outbound WhatsApp/SMS/Voice require `Case.clientConsent.<channel>` (GDPR-compliant capture).
- Quiet hours: per-provider availability windows (`D-014`); platform default 21:00–08:00 client-local if unset.
- Auto-pause: `Case.autoPauseUntil` halts automated outbound until cleared.

### 4.4 Design language (LVJ Authority + Arabic typography)

LVJ Authority Design System tokens preserved (Cormorant Garamond ≥18px / Inter / JetBrains Mono / LVJ Navy / Legal Gold accent / conservative radius / no gradients / no purple/violet / no emoji icons).

**Arabic typography pairing (`D-015`):**

- **AR display (≥18px):** **Amiri** — serif, classical, pairs with Cormorant Garamond’s authority register.
- **AR body:** **IBM Plex Sans Arabic** — pairs with Inter’s geometric clarity.
- **AR mono:** Latin **JetBrains Mono** for IDs (case IDs and dates remain Latin script per SEF/AIMA convention).
- **RTL:** full bidi handling, mirrored navigation, RTL-aware shadcn/ui components, mirrored icons where directional.
- Locale switcher persists across surfaces (Webflow ↔ app ↔ portal).

### 4.5 Operational & cost

Per-agent budgets (`max_cost_usd` / `max_duration_ms` / `max_llm_calls`). Tool allowlists. Manifest validation. KB freshness via `review_ttl`.

**Cost caps (`D-012`):**

|Scope             |Soft (warn + pause non-critical)|Hard (pause all)|
|------------------|--------------------------------|----------------|
|Per tenant        |$50/day                         |$100/day        |
|Platform marketing|$30/day                         |$75/day         |
|Platform-wide     |—                               |$200/day        |

Reset UTC midnight. Override: Platform Admin only, audit-logged.

**HITL SLA tiers (`D-013`):**

|Tier     |SLA                                   |Triggers                                                                               |
|---------|--------------------------------------|---------------------------------------------------------------------------------------|
|Standard |4h                                    |General advice review, routine outbound                                                |
|Urgent   |1h                                    |`escalation.urgent_deadline` (visa <72h, hearing <7d)                                  |
|Critical |15min business hours / pager off-hours|`escalation.adverse_notice` (denial), `escalation.criminal_history` (intake disclosure)|
|Marketing|24h                                   |All marketing content (`D-010`)                                                        |

Off-hours pager: critical-tier only.

### 4.6 Multi-tenancy & data isolation

- `tenantId` mandatory on every business model.
- Prisma middleware enforces session-scoped `tenantId`; bypass requires `crossTenant: true`, audit-logged.
- Tenants cannot read each other’s data via any code path. `invoke()` checks tenant parity on every tool call.
- Platform Admin cross-tenant access produces `AuditLog action: cross_tenant_access`; affected Tenant Admin gets monthly summary.
- Backups separated per tenant; restore granularity = single tenant.
- Tenant offboarding: full data export (GDPR Art. 20) + verifiable deletion within contract SLA.

### 4.7 Marketplace & commercial

**Commission (`D-007`):** Flat **25% of fees** across all categories, all providers.

**Free tier (`D-009`):** First **5 providers free for 12 months**. After 12 months → per-seat / package SaaS subscription **plus** 25% commission (subscription does not displace commission).

**Attribution:** `MarketingLead.originatedBy ∈ {LVJ_PLATFORM | TENANT_DIRECT | PROVIDER_REFERRAL | PUBLIC_DIRECT}` immutable at write. Disputes via `AttributionOverride` rows.

**Settlement:** Stripe Connect from day 1 (`D-016`). Monthly settlement cron. Provider sees own commission ledger; Platform Admin sees cross-provider dashboard.

**Tenant ↔ Platform contract:** Stored in encrypted vault with version history. Machine-readable fields (rate, free-tier expiry, SLA, exclusivity, dispute, termination) on the row; signed PDF in vault.

### 4.8 Marketing & content

- **Webflow stays.** Webflow Data API + webhooks are the integration surface.
- **Webflow CMS as content store** for blog posts, visa explainers, country guides, FAQ items, **and the public Service Provider Directory**. Each Collection mirrors a Prisma row.
- **Webflow form submissions** → webhook → `/api/webhooks/webflow` → `MarketingLead` → orchestrator dispatches `marketing.lead.received` → eligibility scoring → routing decision → outbound welcome (HITL-gated for first send).
- **Public Service Provider Directory (`D-017`):** new Webflow Collection mirroring `ServiceProvider` rows where `publicListingOptIn = true`. Provider opts in → marketing-HITL approves listing copy → published via Data API. Pages at `lvj-visa.com/providers` and `/providers/[slug]`. Listing fields: name, category, jurisdictions served, languages spoken (incl. AR badge), photo, bio, optionally aggregate ratings.
- **Content engine:** Marketing Drafting agent generates drafts → marketing-HITL → publish. Each article carries `destinationJurisdiction`, `targetVisa`, `targetLocale ∈ {EN, AR, PT}`, `lawyerReviewer`.
- **SEO + AEO+AIO + GEO outputs:**
  - SEO: keyword targeting, internal linking, meta tags, sitemap.
  - AEO+AIO: FAQ schema, HowTo schema, table-formatted answers, Google AI Overviews optimization.
  - GEO: E-E-A-T signals (lawyer attribution, jurisdiction disclaimers, citations to SEF/AIMA + EU sources), structured data, list/quote-friendly formatting for ChatGPT/Perplexity/Claude/Gemini citation.
- **Per-locale content:** Webflow’s locale system handles EN + AR (live) + PT (planned). Translation-check agent reviews before AR/PT publish. **Native Arabic speaker** in marketing-HITL chain for any AR content (`D-015`).
- **Webflow staging (`D-011`):** Use Webflow’s draft state on the live site (no separate staging site). Marketing-HITL is the safety net.
- **Marketing analytics:** Google Search Console + Plausible + per-LLM citation monitoring → `MarketingMetric` rows.

### 4.9 Arabic-first commitments (`D-015`)

1. **Full RTL layout** throughout app + portal (proper bidi handling, mirrored navigation, RTL-aware components).
1. **Arabic typography** per §4.4: Amiri display + IBM Plex Sans Arabic body.
1. **AR throughout AI surface** — AI Counsel chat, AR document OCR (Gemini), AR drafting (client letters, additional-evidence responses, etc.).
1. **AR voice** — `ELEVENLABS_VOICE_ID_AR` configured, `eleven_multilingual_v2`, native-speaker-reviewed voice scripts.
1. **AR notification templates** for all channels (email, SMS, WhatsApp, push, in-app).
1. **AR eligibility quiz** at `/eligibility` and embedded on Webflow `/ar`.
1. **Native Arabic reviewer** in marketing-HITL chain for AR content.
1. **Skill: `skills/arabic-localization/SKILL.md`** — RTL patterns, typography, transliteration of names (Arabic ↔ Latin script for SEF/AIMA forms).
1. **Locale routing** — every URL has `/ar` equivalent; user’s locale persists across Webflow ↔ app ↔ portal.

### 4.10 Analytics & cross-tenant data access (`D-018`)

- **Per-user + per-tenant analytics:** full granularity, available to Tenant Admin for their own data.
- **Platform Marketing cross-tenant view:** aggregated + anonymised + min 5-case k-anonymity (no individual case identifiable). Used for content targeting only.
- **Platform Admin cross-tenant view:** full PII access. Every cross-tenant PII access logged; affected Tenant Admin receives monthly access summary.

-----

## 5. Success Metrics

> Metrics marked **(proposed)** require founder ratification as a `D-NNN` before they bind.

### 5.1 Engineering quality gates (binary, must-pass)

- AOS Phase 1 minimum viable loop green in CI + staging.
- Multi-tenancy isolation suite green: 0 leaks across tenant boundaries in adversarial test set.
- 100% of API routes under `assertTenantAccess()` + `assertCaseAccess()` (11 legacy routes closed).
- AR + RTL acceptance suite green (every screen rendered EN + AR; no layout breakage).
- Webflow webhook → `MarketingLead` end-to-end test green.
- Public provider directory: provider opt-in → Webflow publish round-trip test green.
- Every PR updates `docs/EXECUTION_LOG.md`.

### 5.2 Product KPIs (proposed)

|Metric                      |Definition                                    |Target                                         |
|----------------------------|----------------------------------------------|-----------------------------------------------|
|Active Cases (per tenant)   |Status ∉ {APPROVED, DENIED, WITHDRAWN}        |Trend                                          |
|Awaiting Docs               |Cases missing required docs                   |Reduce 20% MoM                                 |
|Approved (30d)              |Moved to APPROVED in trailing 30d             |Trend up                                       |
|Avg Resolution              |Mean days intake → terminal, by service type  |Reduce vs baseline                             |
|Service Provider attach rate|% of cases with ≥1 active `ProviderEngagement`|Marketplace health signal                      |
|**AR locale share**         |% of client portal sessions in AR             |Track baseline; expected ≥40% given MENA-source|

### 5.3 AOS / AI quality KPIs (proposed)

|Metric               |Definition                                           |Target                                       |
|---------------------|-----------------------------------------------------|---------------------------------------------|
|HITL standard SLA    |% resolved within 4h                                 |≥ 95%                                        |
|HITL urgent SLA      |% resolved within 1h                                 |≥ 95%                                        |
|HITL critical SLA    |% resolved within 15min business / paged off-hours   |≥ 99%                                        |
|Marketing-HITL SLA   |% resolved within 24h                                |≥ 90%                                        |
|Guardrail catch rate |% of agent drafts rejected                           |Track baseline                               |
|Predictor calibration|Mean abs error, predicted vs actual                  |< 0.15 once N ≥ 200 per (jurisdiction × visa)|
|Cost per case        |Sum `AutomationLog.cost_usd` per case                |< tenant-set ceiling                         |
|Agent breach rate    |% of invocations hitting budget cap                  |< 1%                                         |
|**AR output quality**|Native-speaker review pass rate on sampled AR outputs|≥ 90%                                        |

### 5.4 Growth & revenue KPIs (proposed)

|Metric                           |Definition                                                |Target                      |
|---------------------------------|----------------------------------------------------------|----------------------------|
|MarketingLead → Case conversion  |LVJ-originated leads converted                            |Track baseline              |
|Time-to-first-touch              |Webflow form submit → first outbound                      |< 10 min                    |
|LVJ-originated revenue per tenant|Closed-case revenue tagged `LVJ_PLATFORM`                 |Surface per tenant per month|
|Commission collected per month   |Sum across all conversions @ 25%                          |Trend up                    |
|Provider response SLA            |% of LVJ-routed leads accepted within 2h                  |≥ 90%                       |
|Channel mix                      |Inbound across web direct / AI-search / partner / WhatsApp|Surface                     |
|**Public directory CTR**         |Profile views → contact-form submissions                  |Surface; per provider       |

### 5.5 Compliance KPIs

|Metric                                |Target                              |
|--------------------------------------|------------------------------------|
|Tenant isolation breaches             |**0**                               |
|Unauthenticated route count           |**0**                               |
|Encrypted vault coverage              |**100%**                            |
|Audit chain completeness              |**100%**                            |
|UPL guardrail bypasses                |**0**                               |
|GDPR DSAR turnaround                  |< 30 days legal max; target < 7 days|
|Cross-tenant access audit completeness|**100%**                            |

### 5.6 Marketing & content KPIs (proposed)

|Metric                      |Definition                              |Target              |
|----------------------------|----------------------------------------|--------------------|
|Content velocity            |Articles published / week / locale      |≥ 3 EN + 2 AR + 1 PT|
|Time-to-publish             |Brief → live                            |< 48h               |
|AI citation share           |% of monitored target queries citing LVJ|Track baseline; grow|
|SEO impressions / CTR       |Google Search Console                   |Trend up            |
|Webflow form conversion rate|Submissions / page views, per visa type |Trend up            |
|E-E-A-T pass rate           |Marketing-HITL first-pass approval      |≥ 80%               |

### 5.7 Marketplace KPIs (proposed)

|Metric                                       |Definition                                             |Target              |
|---------------------------------------------|-------------------------------------------------------|--------------------|
|Active tenants                               |Tenants with ≥1 case opened in 30d                     |Grow per quarter    |
|Active providers per category per destination|Coverage map                                           |Targets per category|
|Public directory listings                    |Providers with `publicListingOptIn = true` and approved|≥ 5 at launch       |
|New tenant time-to-onboard                   |Self-serve signup → first case opened                  |< 24h (`D-019`)     |
|Provider satisfaction (NPS)                  |Quarterly survey                                       |≥ +30               |
|Attribution disputes                         |Per quarter                                            |< 5% of conversions |

-----

## 6. Scope

### 6.1 Phased delivery

**Phase A — Foundation + tenancy + AR**

- Sprint 0: Foundation cleanup. *Largely landed.*
- **Sprint 0.1 (NEW):** Close 11 unauthed routes (`D-019`).
- **Sprint 0.5 (NEW):** Multi-tenancy foundation. `Tenant` model, `tenantId` middleware, `assertTenantAccess()`, isolation test suite.
- **Sprint 0.7 (NEW):** AR + RTL into design system + i18n. Amiri + IBM Plex Sans Arabic loading, RTL component audit, locale switcher, AR i18n key structure.
- Sprint 1: Auth + nav (extended for tenant + locale context).

**Phase B — Core case management**

- Sprint 2: Dashboard + KPIs (tenant-scoped, EN + AR).
- Sprint 3: Cases module (tenant-scoped, EN + AR; `destinationJurisdiction`).
- Sprint 4: Intake wizard (Portuguese visa types; EN + AR).
- Sprint 5: Comms hub (Twilio, ElevenLabs incl. AR voice, Kaspo, notifications EN + AR templates).
- Sprint 6: AI Counsel copilot (jurisdiction-aware; EN + AR).
- Sprint 7: Eligibility quiz + lead funnel (EN + AR; embedded on Webflow EN + /ar).
- Sprint 8: Revenue + billing (Stripe; Portuguese CTA flag; per-case invoicing).

**Phase C — Marketplace + multi-tenant ops**

- **Sprint 8.5 (NEW):** Self-serve tenant + provider onboarding. Signup, contract acceptance, Stripe Connect onboarding for providers.
- Sprint 9: Multi-tenant operations view. `/platform/operations` (cross-tenant) + `/operations` (single-tenant).
- **Sprint 10 (REVISED):** Service Provider Pool — full module. 10 categories, extensible. Per-category onboarding + document checklist. `/provider/*` portal with availability windows + commission ledger. Monitoring dashboard. Encrypted vault for contracts + IDs.
- **Sprint 10.5 (NEW):** Public Service Provider Directory. Webflow CMS Collection mirror, opt-in flow, marketing-HITL approval, `/providers` + `/providers/[slug]` pages, AR locale.
- Sprint 11: Outcome predictor (gated thresholds: ≥50 per (jurisdiction × visa) for staff-internal; ≥200 + CI ≤ ±15% for client-facing — `D-008`).
- Sprint 12: Service Types Admin (Portuguese visa defaults; per-tenant overrides).

**Phase D — Marketing automation + social**

- **Sprint 13 (REVISED):** Marketing Automation Module — full scope. Webflow Data API integration, webhook ingestion → `MarketingLead`, `ContentArticle` Prisma model + Webflow CMS Collection mirror, Marketing Drafting agent (per-locale, per-jurisdiction, EN + AR + PT), SEO/AEO/GEO structured-output skill, PostBridge social composer, Marketing-HITL via `/admin/marketing-approvals` (24h SLA, native AR reviewer required for AR content).
- Sprint 14: Mobile (Capacitor) — iOS + Android, Firebase push, AR throughout.

**Phase E — Marketplace billing + GDPR**

- **Sprint 15 (NEW):** Stripe Connect provider payouts; commission ledger UI; monthly settlement cron; `AttributionOverride` workflow.
- **Sprint 16 (NEW):** GDPR/DPA tooling. DSAR workflow; per-tenant data export; audit log retention policy; cookie + consent UI on Webflow + app (EN + AR).

### 6.2 Current status snapshot

*(Living truth: `docs/EXECUTION_LOG.md`.)*

**Active branch:** `claude/phase-0-audit-NWzaW`

**Landed**

- Sprint 0 foundation (rbac/events/audit/crypto/ai-router + 6 additive models).
- Sprint 1 UI (tokens, fonts, sign-in, dashboard).
- Sprint 1 UI extension (Cases list/detail, Intake, Notifications).
- AOS Phase 1 (runtime + intake/drafting/email + 4 services).
- Phase 8 docs (`docs/AGENT_OS.md`).

**Armed but off** — feature flags default OFF; `subscribeAgent()` not yet wired to bootstrap.

**Blocked**

- `npx prisma migrate dev` pending live DB.
- 11 legacy routes still lack auth guards.
- KB articles need Portuguese-licensed lawyer review.

**Known to-be-redirected** (open as a result of v0.3)

- All US-immigration KB articles, prompts, skills (RFE drafter, USCIS deadline engine, IOLTA flag, ABA disclaimers) need rewriting against PT-OA + SEF/AIMA + EU GDPR.
- Design system needs AR typography subsection.
- `Claude.md` needs re-baselining to v4.0 (see `docs/prompts/CLAUDE_MD_REBASELINE_v4.md`).

### 6.3 Out of scope (v1.0.0)

US immigration. Custom marketing site. Active Google SSO. Custom-trained LLMs. External workflow tools. Native mobile codebase. Vendor replacements. Tenant-level white-labelling beyond logo + accent.

### 6.4 Future / post-v1

Voice inbound (call → transcript → case note). Document version diffing in vault. Public marketing-site CMS replacement (only if Webflow blocks). Slack staff integration. Predictive caseload balancing. Native iPad attorney workspace. Tenant-level white-labelling. Additional destinations (Spain, Greece, Cyprus, Malta).

-----

## 7. Risks & Open Questions

### 7.1 Risks

|#  |Risk                                                       |Severity      |Mitigation                                                                                                                                                             |
|---|-----------------------------------------------------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|R1 |UPL exposure if guardrail misclassifies                    |**High**      |`attorney_approved_advice` set only by jurisdiction-licensed lawyer; jurisdiction-aware UPL classifier; full audit                                                     |
|R2 |Privilege leak via agent tool misuse                       |**High**      |Tool allowlists; `invoke()` proxies; tenant parity check                                                                                                               |
|R3 |Cross-tenant data leak                                     |**High**      |Prisma middleware; adversarial isolation suite in CI; quarterly external pen test                                                                                      |
|R4 |LLM cost overrun                                           |Medium        |Per-tenant + per-platform caps (`D-012`); Cost Guard pauses non-critical                                                                                               |
|R5 |Vendor lock-in (Kaspo / PostBridge / Webflow)              |Medium        |All via raw `fetch()`; channel agents abstract; CMS data mirrored as `ContentArticle` rows                                                                             |
|R6 |Doc drift between PRD ↔ `Claude.md` ↔ AGENT_OS.md          |Medium        |`D-005` discipline; PRD wins until re-baseline                                                                                                                         |
|R7 |Outcome predictor exposed before enough data               |Medium        |Gated thresholds per `D-008`                                                                                                                                           |
|R8 |Consent model not enforced before Phase 2 channels         |**High**      |`Case.clientConsent` lands before whatsapp/voice agents go live                                                                                                        |
|R9 |Marketing content trips advertising / UPL rules            |**High**      |Marketing-HITL with E-E-A-T checks; banned-phrase linter; Portuguese-licensed reviewer for PT content; jurisdiction disclaimer required                                |
|R10|Attribution dispute escalates to legal/contractual conflict|Medium        |Immutable `originatedBy`; `AttributionOverride`; contract dispute clause                                                                                               |
|R11|Provider misbehaviour reflects on LVJ Platform brand       |Medium        |Provider monitoring KPIs + SLA; offboarding workflow; client review feedback loop                                                                                      |
|R12|GDPR DSAR not actionable in time                           |**High**      |Sprint 16 ships DSAR tooling before second tenant onboards                                                                                                             |
|R13|**Public provider directory becomes spam target**          |Medium (NEW)  |Marketing-HITL approval per listing; reviewable opt-in; Platform-Admin can suspend listing                                                                             |
|R14|**AR output quality regression unnoticed**                 |**High (NEW)**|Native AR speaker in marketing-HITL chain; AR output quality KPI sampled weekly; AR-specific golden fixtures in agent test suite                                       |
|R15|**Self-serve onboarding lets bad-actor providers in**      |Medium (NEW)  |License/insurance document upload required at signup; Platform-Admin verification step before any LVJ-routed lead lands; trial period before public listing eligibility|

### 7.2 Decisions ratified in this revision (`D-007` … `D-019`)

|ID   |Decision                                                                                                                                                                                    |
|-----|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|D-007|Commission rate: flat 25% across all categories                                                                                                                                             |
|D-008|Predictor thresholds: ≥50 per (jurisdiction × visa) for staff-internal; ≥200 + CI ≤ ±15% for client-facing                                                                                  |
|D-009|Free tier: first 5 providers free for 12 months; thereafter per-seat/package SaaS subscription **plus** 25% commission                                                                      |
|D-010|Marketing-HITL SLA: 24h                                                                                                                                                                     |
|D-011|Webflow staging: use draft state on live site                                                                                                                                               |
|D-012|LLM cost caps: $50/$100 per tenant; $30/$75 platform marketing; $200 platform hard cap                                                                                                      |
|D-013|HITL escalation tiers: Standard 4h / Urgent 1h / Critical 15min business + paged off-hours / Marketing 24h                                                                                  |
|D-014|Quiet hours: per-provider availability windows; default 21:00–08:00 client-local if unset                                                                                                   |
|D-015|Arabic is first-class for v1: full RTL, Amiri + IBM Plex Sans Arabic, AR throughout app + AI + voice + notifications + quiz; native AR reviewer in marketing-HITL                           |
|D-016|Stripe Connect from day 1 for provider payouts                                                                                                                                              |
|D-017|Public Service Provider Directory in v1 (Webflow CMS mirror; opt-in; marketing-HITL approval)                                                                                               |
|D-018|Analytics: full per-user + per-tenant; Platform Marketing sees aggregated + anonymised + 5-case k-anonymity; Platform Admin sees full PII with audit trail surfaced to affected Tenant Admin|
|D-019|Sprint priority: 11 unauthed routes → multi-tenancy foundation → AR/RTL → self-serve onboarding → Webflow webhook → AOS Phase 2 → Stripe Connect → Service Provider Pool                    |

### 7.3 Open questions remaining

1. **Tenant + provider contract template content** — commission %, SLA, exclusivity, dispute, termination clauses. Founder said “still don’t have.” Needs legal review before first tenant onboards.
1. **Provider category extensibility UX** — Platform Admin can add categories, but workflow for retrofitting requirements + monitoring rules. Defer to first time we need it.
1. **AR voice model selection** — `eleven_multilingual_v2` is the right base, but specific `ELEVENLABS_VOICE_ID_AR` needs founder selection (recommend testing 3 candidates with native speakers).
1. **PT app localization** — Webflow `/ar` exists; app needs PT eventually. Defer to v1.x?
1. **Public directory ratings** — show aggregate ratings on directory listings, or hide until enough data? If shown, who can rate (clients only, or anyone)?

### 7.4 Known dependencies on external work

- Live Postgres for `npx prisma migrate dev`.
- **Portuguese-licensed lawyer** review of PT skills + escalation matrix + advice_class taxonomy.
- **Native Arabic speaker reviewer** for marketing-HITL chain (staff or contractor).
- UAE-licensed lawyer for v1.x.
- Vendor accounts: Kaspo, PostBridge, ElevenLabs voice IDs (EN + AR), **Stripe Connect**, Firebase VAPID, **Webflow API token + webhook signing secret**.
- DPO named for GDPR; DPA template approved by counsel.

-----

## 8. Glossary

|Term                            |Meaning                                                                                                                                                                                   |
|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**AOS**                         |Agent Operating System (`docs/AGENT_OS.md`)                                                                                                                                               |
|**HITL**                        |Human-in-the-loop                                                                                                                                                                         |
|**RBAC**                        |Role-based access control                                                                                                                                                                 |
|**UPL**                         |Unauthorized practice of law                                                                                                                                                              |
|**Tenant**                      |A law firm hosted on the LVJ Platform                                                                                                                                                     |
|**Service Provider**            |Non-firm participant: lawyer (other jurisdictions), realtor, accountant, fund manager, translator, apostille, bank facilitator, relocation/concierge, **property management, hospitality**|
|**ProviderEngagement**          |Provider’s role on a specific case                                                                                                                                                        |
|**MarketingLead**               |Lead originated through marketing surface                                                                                                                                                 |
|**`originatedBy`**              |Immutable lead-attribution: `LVJ_PLATFORM                                                                                                                                                 |
|**`destinationJurisdiction`**   |Top-level field: `PT                                                                                                                                                                      |
|**SEF / AIMA**                  |Portuguese immigration regulator                                                                                                                                                          |
|**OA**                          |Ordem dos Advogados (Portuguese Bar)                                                                                                                                                      |
|**CTA**                         |Client Trust Account (PT equivalent of IOLTA)                                                                                                                                             |
|**D1 / D2 / D3 / D7 / D8**      |Portuguese long-stay visa types                                                                                                                                                           |
|**Golden Visa (PT)**            |Investment-based PT residency                                                                                                                                                             |
|**GDRFA / ICA**                 |UAE immigration regulators                                                                                                                                                                |
|**MOJ**                         |UAE Ministry of Justice                                                                                                                                                                   |
|**GDPR**                        |EU General Data Protection Regulation                                                                                                                                                     |
|**PDPL**                        |UAE Personal Data Protection Law                                                                                                                                                          |
|**DSAR**                        |Data Subject Access Request (GDPR Art. 15)                                                                                                                                                |
|**DPA**                         |Data Processing Agreement (GDPR)                                                                                                                                                          |
|**DPO**                         |Data Protection Officer (GDPR Art. 37)                                                                                                                                                    |
|**k-anonymity**                 |Privacy guarantee: each row indistinguishable from at least k–1 others                                                                                                                    |
|**SEO / AEO / AIO / GEO / LLMO**|Search-discipline acronyms                                                                                                                                                                |
|**E-E-A-T**                     |Experience, Expertise, Authoritativeness, Trustworthiness                                                                                                                                 |
|**Webflow Data API**            |REST API for programmatic CMS + form-submission ingestion                                                                                                                                 |
|**PostBridge / Kaspo**          |Social scheduler / WhatsApp API (raw `fetch()`)                                                                                                                                           |
|**Capacitor**                   |Native wrapper shipping Next.js as iOS + Android                                                                                                                                          |
|**Stripe Connect**              |Stripe’s marketplace payout product                                                                                                                                                       |
|**`advice_class`**              |Output classification: `general_information                                                                                                                                               |
|**`correlationId`**             |ID linking `AutomationLog` + `AuditLog` for one logical action                                                                                                                            |
|**RTL / bidi**                  |Right-to-left layout / bidirectional text handling                                                                                                                                        |
|**Amiri**                       |Open-source Arabic serif typeface                                                                                                                                                         |
|**IBM Plex Sans Arabic**        |Open-source Arabic geometric sans-serif                                                                                                                                                   |

-----

## 9. How this document gets used

- **Founder (Khaled).** Reviews §5 (metrics), §7.1 (risks), §7.3 (remaining open questions); resolves into `docs/DECISIONS.md`.
- **Claude (chat).** Refers to this PRD for scope; surfaces conflicts with `Claude.md` rather than silently picking one.
- **Claude Code.** Reads `Claude.md` first (engineering contract; pending re-baseline to v4.0), this PRD second, then `EXECUTION_LOG.md` and `DECISIONS.md`.
- **New collaborators.** Read this doc first for the *what + why*, then `Claude.md` for the *how*.

### Update rules

- Edit when scope, users, goals, constraints, or metrics change — not for progress (those go to `EXECUTION_LOG.md`).
- A `D-NNN` decision can supersede any line; mark old text + reference the decision.
- Bump version header on substantive change.

-----

## 10. Companion: `Claude.md` re-baseline prompt

Lives in `docs/prompts/CLAUDE_MD_REBASELINE_v4.md` (delivered alongside this PRD). Run that prompt in a Claude Code session once this PRD is in the repo.

-----

*PRD v0.3 — Arabic-first commitment, public Service Provider Directory, decisions D-007 through D-019 ratified.
Open questions in §7.3 are residual; main blockers are now contracts (legal) and the v4.0 re-baseline (engineering).*
