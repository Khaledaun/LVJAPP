# LVJ AssistantApp — Claude Code Master Context
# Version 4.0 — Multi-Tenant Marketplace · Portugal-first · Marketing Automation · Arabic-friendly
# Read this file COMPLETELY before writing a single line of code.
# Then read docs/PRD.md (v0.3), docs/DECISIONS.md (D-007 → D-019),
# docs/EXECUTION_LOG.md, and docs/AGENT_OS.md.

> **What changed in v4.0.** Jurisdiction reset (US → **PT** primary,
> **AE** v1.x) per **D-006**. Multi-tenant from the ground up (every
> business model carries `tenantId`). Service Provider Pool as a
> first-class module (10 categories at launch, Platform-Admin
> extensible — incl. property management + hospitality). Marketing
> Automation module (Webflow Data API + webhooks) with a Public Service
> Provider Directory at `lvj-visa.com/providers` per **D-017**. Arabic
> + RTL are first-class in v1 per **D-015** (supersedes D-003). Stripe
> Connect from day 1 per **D-016**. Self-serve onboarding per **D-019**
> sprint priority. Full per-user / per-tenant analytics with
> k-anonymity guardrails per **D-018**. Thirteen decisions ratified
> (D-007 … D-019, with D-003 superseded and engineering decisions
> D-006 / D-007 renumbered to D-020 / D-021).

> **TOOLING POLICY**: Standard tools (Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch)
> are always available. MCP tools and Agent/Task tools with subagent_type are permitted —
> use Agent tools for parallelizable exploration and open-ended codebase search.
> Never let an agent mutate git state (commits, pushes, merges) or edit DEVLOG.md / ACTION_ITEMS.md.

---

## 🚀 Quick Start for Claude Code

You are building **LVJ AssistantApp** — a multi-tenant immigration &
relocation marketplace SaaS for law firms + service providers
(Portugal first, Dubai second). The founder is Khaled Aun. The
platform operator is LVJ; LVJ-the-firm is tenant #1. Before writing
any code:

0. **Read `docs/PRD.md` (v0.3) first**, then `docs/DECISIONS.md`
   `D-007` through `D-019`. The PRD is the product contract; decisions
   are the binding values. Where they conflict with this file, they
   win until the conflict is reconciled.
1. Read this entire file.
2. Read `docs/EXECUTION_LOG.md` — the rolling commit log; tells you
   what has already landed.
3. Read `docs/AGENT_OS.md` if the task touches any agent (§Phase 8).
4. Only after those reads: plan the task, then execute.

Sprint 0 (foundation) and AOS Phase 1 (runtime + Intake/Drafting/Email)
have already landed on `claude/phase-0-audit-NWzaW`. Do not
re-implement them — extend them. v4.0 is a documentation-only
re-baseline; the multi-tenant code changes start in Sprint 0.1 per
**D-019**.

---

## 🎯 Product Identity

| Property | Value |
|---|---|
| **App name** | LVJ AssistantApp |
| **Type** | Multi-tenant immigration & relocation marketplace SaaS for law firms + service providers (Portugal first, Dubai second) |
| **Current version** | v0.1.0 → targeting v1.0.0 |
| **Primary market** | MENA-source clients; **PT** + **AE** destination jurisdictions |
| **Tenancy** | Multi-tenant by default; LVJ-the-firm is tenant #1; LVJ-the-Platform is the operator |
| **Marketing surface** | Webflow CMS at `www.lvj-visa.com` — integrated via Webflow Data API + webhooks. Public Service Provider Directory at `/providers` per **D-017**. Not replaced. |
| **Languages** | **EN + AR active in v1** per **D-015** (RTL + Arabic-friendly UX). PT planned for v1.x. |
| **Stack** | Next.js 14 App Router + TypeScript + Prisma + PostgreSQL |
| **Deploy** | Vercel + GCS + Firebase |
| **Auth** | NextAuth.js v4 |
| **UI** | shadcn/ui + Tailwind CSS + Radix UI + Lucide icons; `components/lvj/*` for new screens |

---

## ⚠️ The Golden Rules (Never Break These)

1. **Never break existing functionality** — every PR must pass Jest + Playwright
2. **RBAC on every route** — no API route or Server Action without `assertCaseAccess()`
3. **No direct AI API calls in routes** — always route through `lib/ai-router.ts`
4. **Additive schema only** — never drop or rename existing Prisma columns
5. **Promise.allSettled() for multi-channel dispatch** — never Promise.all()
6. **No hardcoded strings** — use i18n keys (EN only for now, AR structure reserved)
7. **All AI outputs shown to users** must have a subtle "AI-generated" disclosure badge
8. **Attorney-client privilege** — documents in `/vault` encrypted at rest via `lib/crypto.ts`
9. **Tenant isolation is absolute.** Every business model carries `tenantId`; cross-tenant queries require explicit `crossTenant: true` and are audit-logged. Cross-tenant data leak = Sev-1 incident.

> Rule 6 context: the "EN only for now, AR structure reserved" wording
> is preserved for backwards compatibility with landed i18n keys, but is
> **superseded by D-015** — AR ships fully in v1 alongside EN. PT is
> planned v1.x.

---

## 📐 Architecture Decisions (Immutable)

1. No n8n, no Zapier, no external workflow tools — everything is native Next.js API routes
2. Event bus pattern: `lib/events.ts` dispatches to all channels via `Promise.allSettled()`
3. All AI calls go through `lib/ai-router.ts` (multi-model orchestration, see Phase 3)
4. All automation logged to `AutomationLog` model in Prisma
5. Twilio + ElevenLabs voice = GCS public audio URL injected into TwiML `<Play>` tag
6. Vercel Cron Jobs for scheduled tasks (not background workers)
7. Kaspo REST API via `fetch()` — no SDK, document every endpoint used
8. PostBridge REST API via `fetch()` — social scheduling only, not analytics
9. Mobile = Capacitor wrapper around the same Next.js app (not a separate codebase)
10. Multi-office data scoping via `officeId` FK on every staff-facing model (Office is now a child of Tenant — see #11).
11. **Multi-tenant via `tenantId` FK** on every business model; Prisma client middleware enforces session-scoped scoping. Cross-tenant reads require `crossTenant: true` + audit row (Golden Rule #9).
12. **Webflow Data API via raw `fetch()`** — no SDK. CMS create / update / publish + webhook receipt at `/api/webhooks/webflow` (HMAC-SHA256 verified with `WEBFLOW_WEBHOOK_SECRET`).
13. **Marketing content goes through HITL** (Platform Marketing role; **24h SLA per D-010**). Native AR reviewer required in the chain for AR content per D-015.
14. **Service Provider documents** (contracts, licenses, IDs, insurance) encrypted at rest in `/vault/providers/<providerId>/` per D-017 opt-in flow.
15. **Lead attribution computed at lead creation.** `MarketingLead.originatedBy` is immutable; disputes go through `AttributionOverride` rows, not mutations.
16. **`destinationJurisdiction ∈ {PT | AE | …}`** is a top-level field on `Case`, `ServiceType`, and `ContentArticle`. Drives forms, deadlines, regulator rules, language defaults.

---

## 🗂 Project Structure

```
AssistantAPP-main/
├── app/
│   ├── (auth)/              # Sign-in, magic link, role redirect
│   ├── (platform)/          # NEW — LVJ-Platform operator surfaces (cross-tenant)
│   │   ├── dashboard/
│   │   ├── tenants/
│   │   ├── providers/
│   │   ├── marketing/
│   │   ├── commission/
│   │   ├── analytics/
│   │   ├── approvals/
│   │   └── settings/
│   │       └── cost-limits/
│   ├── (staff)/             # Tenant staff/counsel — sidebar nav (tenant-scoped)
│   │   ├── dashboard/
│   │   ├── cases/
│   │   ├── intake/
│   │   ├── calendar/
│   │   ├── messages/
│   │   ├── notifications/
│   │   ├── reports/
│   │   ├── predictor/
│   │   ├── operations/
│   │   └── admin/
│   │       ├── service-types/
│   │       ├── team/
│   │       │   └── [id]/analytics/     # NEW — per-team-member analytics (D-018)
│   │       ├── settings/
│   │       ├── brand/
│   │       ├── marketing-approvals/    # NEW — marketing-HITL queue (D-010)
│   │       ├── tenants/                # NEW — Platform Admin only
│   │       └── providers/              # NEW
│   ├── (provider)/          # NEW — Service Provider portal
│   │   ├── dashboard/
│   │   │   └── analytics/
│   │   ├── cases/
│   │   ├── commission/
│   │   ├── team/
│   │   │   └── [id]/analytics/
│   │   └── listing/                    # Public-directory opt-in (D-017)
│   ├── (client)/            # Client portal — mobile-first bottom nav (EN + AR)
│   │   ├── my-case/
│   │   ├── documents/
│   │   ├── messages/
│   │   └── payments/
│   ├── (public)/            # Unauthenticated
│   │   ├── eligibility/     # Lead funnel quiz (EN + AR)
│   │   └── book/
│   └── api/
│       ├── ai/
│       ├── voice/
│       ├── whatsapp/
│       ├── social/
│       ├── webhooks/
│       │   ├── webflow/          # NEW — Webflow form + CMS webhook ingress
│       │   └── stripe/
│       ├── marketing/            # NEW — content publish / lead handlers
│       ├── commission/           # NEW — ledger + settlement
│       ├── tenants/              # NEW — onboarding + offboarding
│       ├── providers/            # NEW
│       ├── dsar/                 # NEW — GDPR Art.15 data-subject requests
│       └── cron/
│           ├── deadline-alert/
│           ├── marketing-hitl-escalate/    # NEW — 24h SLA sweep (D-010)
│           ├── commission-settle/          # NEW — monthly settlement cron (D-016)
│           └── analytics-rollup/           # NEW — daily aggregate (D-018)
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── lvj/                 # LVJ design-system primitives (canonical new library)
│   ├── cases/
│   ├── intake/
│   ├── client-portal/
│   ├── provider-portal/     # NEW
│   ├── marketing/           # NEW — content editor, approvals surface
│   └── shared/
├── lib/
│   ├── ai-router.ts
│   ├── events.ts
│   ├── rbac.ts
│   ├── tenants.ts           # NEW — assertTenantAccess(), tenant middleware
│   ├── webflow.ts           # NEW — Data API + webhook verification
│   ├── marketing-router.ts  # NEW — brief → draft → HITL → publish
│   ├── attribution.ts       # NEW — lead originatedBy classifier + overrides
│   ├── commission.ts        # NEW — 25% ledger (D-007)
│   ├── availability.ts      # NEW — per-actor windows (D-014)
│   ├── analytics.ts         # NEW — 3-tier analytics views (D-018)
│   ├── i18n-rtl.ts          # NEW — RTL helpers (D-015)
│   ├── twilio.ts
│   ├── elevenlabs.ts
│   ├── kaspo.ts
│   ├── postbridge.ts
│   ├── crypto.ts
│   ├── gcs-upload.ts
│   ├── notifications.ts
│   ├── email.ts
│   ├── audit.ts
│   └── deadline-engine.ts   # Now jurisdiction-aware (PT / AE), not USCIS (see D-006)
├── prisma/
│   └── schema.prisma
├── types/
├── messages/                # i18n — en.json + ar.json populated; pt.json scaffolded (D-015)
├── skills/
└── CLAUDE.md                # This file
```

---

## 🧠 Skills Reference

Domain-specific best practices live in `skills/`. Read the relevant
skill BEFORE implementing any feature in that domain.

| Skill file | Purpose |
|---|---|
| `skills/rbac/SKILL.md` | RBAC patterns, assertCaseAccess, role matrix |
| `skills/ai-router/SKILL.md` | Multi-LLM routing, fallback chains, caching |
| `skills/voice-ai/SKILL.md` | ElevenLabs + Twilio TwiML pipeline (EN + AR voices per D-015) |
| `skills/whatsapp/SKILL.md` | Kaspo API patterns, webhook verification |
| `skills/forms-automation/SKILL.md` | **SEF/AIMA portal forms, EU residence permit forms** (formerly USCIS / DS-160 per D-006) |
| `skills/deadline-engine/SKILL.md` | **SEF/AIMA + Schengen + EU residence permit timelines, per `destinationJurisdiction`** (formerly USCIS per D-006) |
| `skills/design-system/SKILL.md` | LVJ design tokens, typography rules, component patterns |
| `skills/client-portal/SKILL.md` | Mobile-first portal, Capacitor, push notifications |
| `skills/security/SKILL.md` | **EU GDPR + Portuguese OA Code of Conduct + UAE PDPL/MOJ** (replaces ABA Model Rule 1.6 per D-006). Tenant isolation + DSAR/Art.15 patterns. |
| `skills/outcome-predictor/SKILL.md` | ML data collection, approval-odds model, D-008 thresholds |
| **NEW** | |
| `skills/multi-tenancy/SKILL.md` | Tenant model, scoping middleware, isolation testing |
| `skills/marketing-automation/SKILL.md` | Webflow Data API patterns, content brief → draft → HITL → publish (24h SLA per D-010) |
| `skills/seo-aeo-geo/SKILL.md` | Structured-data schemas, E-E-A-T signals, citation-friendly content |
| `skills/webflow/SKILL.md` | Webflow CMS API, webhook signature verification, locale handling, draft state (D-011) |
| `skills/portugal-immigration/SKILL.md` | SEF/AIMA process, D1/D2/D3/D7/D8/Golden/Startup/Family rules, OA conduct, EU GDPR |
| `skills/uae-immigration/SKILL.md` | GDRFA/ICA, Golden/Investor/Employment visas, MOJ rules, PDPL — v1.x |
| `skills/service-provider-pool/SKILL.md` | 10-category onboarding incl. property-mgmt + hospitality (PRD §2.1), monitoring, archive |
| `skills/marketplace-attribution/SKILL.md` | Lead attribution, commission calculation (flat 25% per D-007), dispute workflow |
| `skills/provider-directory/SKILL.md` | D-017 public directory generation, schema.org, Webflow sync |
| `skills/i18n-rtl/SKILL.md` | D-015 RTL layout, paired type system, locale switching, AR voice |
| `skills/onboarding/SKILL.md` | Self-service tenant + provider wizard, credential verification (Sprint 8.5 per D-019) |
| `skills/availability/SKILL.md` | D-014 per-actor availability schedules, lead-routing windows, quiet hours overrides |
| `skills/cost-guard/SKILL.md` | D-012 per-tenant + platform cost caps, breach behaviour, agent classification |
| `skills/escalation/SKILL.md` | D-013 4-tier HITL escalation matrix, routing, SLA enforcement |
| `skills/arabic-localization/SKILL.md` | D-015 RTL patterns, typography, name transliteration for SEF/AIMA |

Create skill files as you build each module. They persist decisions
for future sessions. New v4.0 rows ship as scaffolds in this PR and
are fleshed out as the owning sprint lands.

---

## ═══════════════════════════════════════════
## PHASE 0 — MANDATORY AUDIT (Do Before Any Code)
## ═══════════════════════════════════════════

Run these commands. Note findings. Fix critical blockers before Sprint 1.

```bash
# 1. Ghost file cleanup — bad AI paste artifacts
ls AssistantAPP-main/ | grep -E "^(\{|\}|export|import|try|uploadUrl,|documentId,|objectName,|expiresIn_|userId_|const|next$)"

# 2. Find all TODO/stub/mock code
grep -r "TODO\|FIXME\|mock\|Mock\|stub\|Stub\|notImplemented\|throw new Error" \
  AssistantAPP-main/lib/ --include="*.ts" -l

# 3. Check RBAC stub completeness (and tenant stub after Sprint 0.5)
cat AssistantAPP-main/lib/rbac.ts
cat AssistantAPP-main/lib/tenants.ts 2>/dev/null || echo "tenants.ts lands Sprint 0.5"

# 4. Check notification stub
cat AssistantAPP-main/lib/notifications.ts

# 5. Check existing AI modules
ls AssistantAPP-main/module2-gemini/
ls AssistantAPP-main/module3-gpt5/

# 6. Check Prisma schema — list all models
grep "^model " AssistantAPP-main/prisma/schema.prisma

# 7. Check existing env vars
cat AssistantAPP-main/.env.example | grep -v "^#" | grep "="

# 8. Check test coverage
ls AssistantAPP-main/__tests__/ 2>/dev/null || echo "No tests directory"
ls AssistantAPP-main/e2e/ 2>/dev/null || echo "No e2e directory"

# 9. v4.0 jurisdiction audit — inventory every legacy US-immigration reference
grep -rin "USCIS\|RFE\|EB5\|H1B\|N400\|IOLTA\|DS-160\|ABA Model Rule 1\.6" \
  AssistantAPP-main/ --include="*.ts" --include="*.tsx" --include="*.md" \
  --include="*.prisma" --include="*.json" 2>/dev/null
```

### Audit Blockers (Fix in Sprint 0 Before Anything Else)
- [ ] Delete all ghost files in root
- [ ] Complete `assertCaseAccess()` in `lib/rbac.ts` (currently a stub)
- [ ] Complete `assertOrgAccess()` in `lib/rbac.ts` (currently a stub)
- [ ] Replace `lib/notifications.ts` mock with real event bus skeleton
- [ ] Run `npx prisma validate` — fix any schema errors
- [ ] Confirm all existing API routes have auth checks
- [ ] **Sprint 0.1 priority per D-019: close 11 unauthed legacy routes before any tenant work begins.**
- [ ] **Audit all routes for missing `assertTenantAccess()` once that helper exists** (Sprint 0.5).
- [ ] **Inventory every reference to `USCIS` / `RFE` / `EB5` / `H1B` / `N400` / `IOLTA` / `ABA Model Rule 1.6` / `DS-160` across the repo.** All must be re-targeted or removed in subsequent PRs per D-006.

---

## ═══════════════════════════════════════════
## PHASE 1 — RESEARCH (Do Before Writing UI)
## ═══════════════════════════════════════════

Use WebSearch and WebFetch to study these references. Save key
findings as comments at the top of the relevant skill files.

### Design References (UI/UX)
- Linear.app dashboard — gold standard for SaaS information density
- Stripe dashboard — typography hierarchy, table design, status badge patterns
- Clio (clio.com) — direct competitor, legal CRM, note their IA
- Lawmatics (lawmatics.com) — legal CRM, client-portal patterns
- **Portuguese-visa industry players:** Imin (imin.pt), Vista, Global Citizen Solutions — visual language for MENA-source PT-residency clients
- Search: "legal case management dashboard UI 2026 best practices"
- Search: "law firm SaaS design system typography serif mono combination"

### Technical References
- Search: "ElevenLabs Twilio outbound voice call Next.js 2026 TwiML Play GCS"
- Search: "Kaspo WhatsApp Business API Node.js TypeScript webhook 2026"
- Search: "PostBridge API documentation social media scheduling"
- Search: "next-intl App Router Server Components 2026 patterns"
- Search: "Capacitor Next.js iOS Android wrapper 2026"
- Search: "Vercel Cron Jobs Next.js App Router patterns"
- Fetch: https://www.twilio.com/docs/voice/twiml/play
- Fetch: https://elevenlabs.io/docs/api-reference/text-to-speech
- **Fetch: https://developers.webflow.com/data/ — Webflow Data API reference**
- Search: **"GEO / AEO 2026 best practices E-E-A-T structured data"**
- Search: **"Portugal SEF AIMA D-visa requirements 2026"**
- Search: **"OA Ordem dos Advogados Article 100 fee-sharing"**
- Search: **"GDPR DSAR Article 15 workflow implementation Next.js"**
- Search: **"Stripe Connect marketplace Express vs Standard 2026"**
- Search: **"Arabic typography pairing Tajawal Frank Ruhl Libre Amiri IBM Plex"**
- Search: **"Tailwind RTL logical properties dir=rtl best practices"**

### Awesome Lists to Mine
- Search: "awesome legal tech github immigration"
- Search: "awesome Next.js dashboard admin open source 2026"
- Search: "awesome Webflow integrations CMS marketplace"

---

## ═══════════════════════════════════════════
## PHASE 2 — DESIGN SYSTEM
## ═══════════════════════════════════════════

This is an immigration law firm marketplace. People's futures depend on
this software. The visual language must communicate: authority, trust,
precision, and care. It is NOT a startup SaaS. Avoid: gradient buttons,
colored side borders on cards, purple/violet schemes, emoji as icons,
centered-everything layouts.

### Design Tokens (globals.css) — preserved verbatim from v3.2

```css
/* LVJ Authority Design System v1.0 */
:root {
  /* === SURFACES — warm authority, not clinical white === */
  --color-bg:                 #F8F7F4;
  --color-surface:            #FFFFFF;
  --color-surface-2:          #F4F3F0;   /* cards — distinct from bg */
  --color-surface-offset:     #ECEAE5;   /* table rows, input bg */
  --color-surface-dynamic:    #E5E3DE;   /* hover states */
  --color-divider:            oklch(from #0F1B2D l c h / 0.08);
  --color-border:             oklch(from #0F1B2D l c h / 0.12);

  /* === TEXT — deep navy hierarchy === */
  --color-text:               #0F1B2D;
  --color-text-muted:         #4A5C6E;
  --color-text-faint:         #8FA0B0;
  --color-text-inverse:       #F8F7F4;

  /* === PRIMARY — LVJ Navy === */
  --color-primary:            #0F1B2D;
  --color-primary-hover:      #1A2E47;
  --color-primary-active:     #0A1220;
  --color-primary-highlight:  #D4DCE6;

  /* === ACCENT — Legal Gold (use sparingly: logo + financial figures only) === */
  --color-accent:             #B8901F;
  --color-accent-hover:       #9A7518;
  --color-accent-active:      #7D5C12;
  --color-accent-highlight:   #F2E8CC;

  /* === STATUS COLORS — case traffic light === */
  --color-approved:           #1A6B3C;
  --color-approved-bg:        #E8F4EE;
  --color-pending:            #994F00;
  --color-pending-bg:         #FDF3E3;
  --color-denied:             #8B1A1A;
  --color-denied-bg:          #FAEAEA;
  --color-review:             #1A4A8B;
  --color-review-bg:          #E8EEF8;
  --color-submitted:          #5B2D8B;
  --color-submitted-bg:       #F0EBF8;
  --color-draft:              #4A5C6E;
  --color-draft-bg:           #F0EEE9;

  /* === TYPOGRAPHY (Latin) === */
  --font-display:   'Cormorant Garamond', 'Playfair Display', 'Georgia', serif;
  --font-body:      'Inter', 'system-ui', sans-serif;
  --font-mono:      'JetBrains Mono', 'Fira Code', monospace;

  /* === TYPOGRAPHY (Arabic — D-015) === */
  --font-display-ar: 'Amiri', 'Frank Ruhl Libre', serif;
  --font-body-ar:    'IBM Plex Sans Arabic', 'Tajawal', sans-serif;
  /* Mono unchanged: JetBrains Mono renders Latin-script IDs + dates
     which stay Latin per SEF/AIMA convention. */

  /* RULE: --font-display is ONLY used at 18px (--text-lg) and above.
           Below 18px: always --font-body.
           Mono: case IDs, dates, file sizes, progress percentages. */

  /* === SPACING (4px base) === */
  --space-1: 0.25rem;   --space-2: 0.5rem;   --space-3: 0.75rem;
  --space-4: 1rem;      --space-6: 1.5rem;   --space-8: 2rem;
  --space-10: 2.5rem;   --space-12: 3rem;    --space-16: 4rem;
  --space-20: 5rem;     --space-24: 6rem;

  /* === RADIUS — conservative, law-firm appropriate === */
  --radius-sm:   2px;    --radius-md:   4px;
  --radius-lg:   6px;    --radius-full: 9999px;

  /* === SHADOWS — navy-tinted, not pure black === */
  --shadow-sm: 0 1px 2px oklch(0.15 0.06 230 / 0.05);
  --shadow-md: 0 4px 12px oklch(0.15 0.06 230 / 0.09);
  --shadow-lg: 0 12px 32px oklch(0.15 0.06 230 / 0.14);

  /* === TYPE SCALE (fluid) === */
  --text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.8rem);
  --text-sm:   clamp(0.8rem, 0.75rem + 0.35vw, 0.9rem);
  --text-base: clamp(0.9rem, 0.85rem + 0.25vw, 1rem);
  --text-lg:   clamp(1rem, 0.9rem + 0.5vw, 1.2rem);
  --text-xl:   clamp(1.2rem, 1rem + 1vw, 1.75rem);
  --text-2xl:  clamp(1.75rem, 1.2rem + 2vw, 2.75rem);
  --text-hero: clamp(2.5rem, 1.5rem + 4vw, 4rem);

  /* === CONTENT WIDTHS === */
  --content-narrow:  640px;
  --content-default: 960px;
  --content-wide:    1280px;
}

/* RTL font swap — D-015 */
[dir="rtl"] {
  --font-display: var(--font-display-ar);
  --font-body:    var(--font-body-ar);
}

/* Dark mode — unchanged from v3.2 */
[data-theme="dark"] { /* ... same tokens as v3.2 ... */ }
```

### Font Loading (app/layout.tsx)
```
Latin  : Cormorant Garamond (300/400/600 + italics) · Inter (300..700 variable) · JetBrains Mono (400/500)
Arabic : Amiri (400/700) · IBM Plex Sans Arabic (300..700) — D-015
```

### RTL Component Design Rules (D-015)
1. All padding/margin uses **logical properties** (`ms-*`, `me-*`, `ps-*`, `pe-*`) — never `ml-*` / `mr-*`.
2. **Icon flips.** Arrows + chevrons mirror under `dir="rtl"`; brand marks + status icons do not.
3. **Tables.** Column order preserved; alignment flips (`text-start` / `text-end`).
4. **Numerals.** Locale-aware via `Intl.NumberFormat(locale)`. Case IDs + dates remain Latin per SEF/AIMA.
5. **Locale switcher** persists across Webflow ↔ app ↔ portal; cookie-based, not localStorage.
6. **AppShell** accepts `rtl` prop; Amiri + IBM Plex Sans Arabic preloaded but only rendered under `[dir="rtl"]`.

### Component Design Rules (preserved)
1. **Tables** — dense by default, no zebra striping, row hover via `--color-surface-offset`
2. **Cards** — `--color-surface` background, `--color-border` border, `--shadow-sm`
3. **Status badges** — pill shape `--radius-full`, matching status color + bg pair
4. **KPI cards** — primary KPI (Active Cases) gets `--color-primary` background treatment
5. **Case timeline** — HORIZONTAL stepper at top of case detail, not vertical list
6. **Intake wizard** — connecting line between steps + checkmark on completed steps
7. **Right panel (case detail)** — "mission control" feel: counsel photo, caseload %, last activity
8. **Gold rule** — `--color-accent` used ONLY for: logo/brand marks, financial figures, HR dividers
9. **Notifications** — channel icon (WhatsApp/SMS/email/system) as left-edge indicator
10. **Client portal CTA** — single amber "Action required" banner when docs pending

> **Per-tenant brand override** (logo + accent color + custom domain)
> is post-v1; v1 ships LVJ-branded for all tenants.

---

## ═══════════════════════════════════════════
## PHASE 3 — MULTI-LLM AI ROUTER
## ═══════════════════════════════════════════

All AI calls go through `lib/ai-router.ts`. Never call model APIs
directly in routes.

### Model Routing Strategy

All tasks are **jurisdiction-aware via `AIRequest.context`** (accepts
`destinationJurisdiction: 'PT' | 'AE'`).

| Task type | Primary | Fallback | Rationale |
|---|---|---|---|
| `ocr-passport` | gemini-2.5-pro | gpt-4o | Vision + multilingual (EN / AR / Latinised) |
| `ocr-document` | gemini-2.5-pro | gpt-4o | Long context, vision |
| `additional-evidence-draft` | gpt-5 | claude-3-7-sonnet | Replaces `rfe-draft`. Jurisdiction-aware: SEF/AIMA *pedido de elementos adicionais* for PT; MOJ equivalent for AE. |
| `legal-analysis` | claude-3-7-sonnet | gpt-5 | Jurisdiction-aware complex reasoning |
| `approval-odds` | gpt-5 | gemini-2.5-pro | Structured output; gated by D-008 thresholds |
| `form-prefill` | gpt-5 | gemini-2.5-pro | JSON structured output |
| `eligibility-score` | gemini-2.5-pro | gpt-5 | Multilingual quiz (EN + AR) |
| `translation-check` | mistral-large | gemini-2.5-pro | Cost-efficient batch |
| `social-copy` | gpt-5 | claude-3-7-sonnet | Copywriting |
| `email-draft` | claude-3-7-sonnet | gpt-5 | Nuanced comms, per-locale |
| `batch-analysis` | mistral-large | gemini-2.5-pro | Cost optimisation |
| `deadline-check` | claude-3-7-sonnet | gpt-5 | Jurisdiction policy interpretation |
| **NEW — marketing & marketplace** | | | |
| `marketing-draft` | claude-3-7-sonnet | gpt-5 | Per-locale content drafting (EN / AR / PT) |
| `seo-structured-data` | gpt-5 | claude-3-7-sonnet | JSON-LD output for schema.org |
| `geo-content-optimize` | claude-3-7-sonnet | gpt-5 | E-E-A-T-compliant rewrite + citation shape |
| `attribution-classify` | mistral-large | gemini-2.5-pro | Cost-efficient lead-source classification |
| `arabic-translate` | claude-3-7-sonnet | gpt-5 | AR translation + cultural review (D-015; native reviewer still gates HITL) |
| `provider-listing-draft` | claude-3-7-sonnet | gpt-5 | D-017 directory profile generation |

> `rfe-draft` is retired. Legacy callers must migrate to
> `additional-evidence-draft` with an explicit
> `destinationJurisdiction`. D-006 references.

### Required packages
```bash
npm install @anthropic-ai/sdk @mistralai/mistralai ai
# ai = Vercel AI SDK for unified streaming interface
```

### lib/ai-router.ts skeleton
```typescript
export type AITask =
  | 'ocr-passport' | 'ocr-document' | 'additional-evidence-draft'
  | 'legal-analysis' | 'approval-odds' | 'form-prefill'
  | 'eligibility-score' | 'translation-check' | 'social-copy'
  | 'email-draft' | 'batch-analysis' | 'deadline-check'
  | 'marketing-draft' | 'seo-structured-data' | 'geo-content-optimize'
  | 'attribution-classify' | 'arabic-translate' | 'provider-listing-draft'

export interface AIRequest {
  task: AITask
  input: string | { text?: string; imageUrl?: string }
  locale?: 'en' | 'ar' | 'pt'
  context?: {
    tenantId?: string
    destinationJurisdiction?: 'PT' | 'AE'
    caseId?: string
    userId?: string
  }
  stream?: boolean
}

export interface AIResponse {
  output: string
  model: string
  tokensUsed?: number
  durationMs?: number
  cached?: boolean
}
```

---

## ═══════════════════════════════════════════
## PHASE 4 — DATA MODEL (Prisma)
## ═══════════════════════════════════════════

### Existing models (do not remove or rename fields — additive only)

Read `prisma/schema.prisma` first. Golden Rule #4 is preserved; v4.0
additions are strictly additive.

### Models gaining `tenantId` (additive column, backfilled to LVJ tenant)

`Case`, `Client`, `Office`, `Document`, `Notification`, `Invoice`,
`EligibilityLead`, `AuditLog`, `AutomationLog`, `VoiceCallLog`,
`CaseOutcome`, `HITLApproval`, `AgentDraft`, `CaseDeadline`.

`Case` and `ServiceType` also gain `destinationJurisdiction` (enum
`PT | AE`, default `PT` during v1; required for new rows).

`Office` is **demoted to a child of `Tenant`** (was top-level). New
`Office.tenantId` FK; all existing offices backfilled to LVJ.

### Partner → ServiceProvider semantic replacement

The `Partner` model is **not dropped** (Golden Rule #4); it is
deprecated via comment and its semantics are replaced by
`ServiceProvider`. New engagements use `ServiceProvider` +
`ProviderEngagement`.

### Per-actor availability (D-014)

- `ServiceProvider.availabilityWindows` — JSON (days of week +
  start/end in local TZ).
- `TeamMember.availabilitySchedule` — JSON analogous.
- `Client.quietHoursOverride` — JSON, nullable, per-client override.

### New models to add (Sprint 0.5 → Sprint 16)

```prisma
// --- Tenancy (Sprint 0.5) ---
model Tenant {
  id                              String   @id @default(cuid())
  name                            String
  slug                            String   @unique
  defaultDestinationJurisdiction  Jurisdiction  @default(PT)
  contractRowId                   String?
  contract                        TenantContract? @relation(fields: [contractRowId], references: [id])
  status                          TenantStatus  @default(ACTIVE)
  freeTierExpiresAt               DateTime?      // D-009
  createdAt                       DateTime @default(now())
  updatedAt                       DateTime @updatedAt
  offices                         Office[]
}

model TenantContract {
  id                   String   @id @default(cuid())
  tenantId             String
  version              Int
  commissionPctLegal   Float    @default(0.25)   // D-007
  freeUntilDate        DateTime?                 // D-009
  slaTier              String   @default("standard")
  signedPdfVaultKey    String                    // encrypted PDF in /vault
  machineReadable      Json                      // rate / exclusivity / dispute / termination
  createdAt            DateTime @default(now())
}

enum Jurisdiction  { PT AE }
enum TenantStatus  { ACTIVE SUSPENDED OFFBOARDING ARCHIVED }
```

```prisma
// --- Service Provider Pool (Sprint 10) ---
model ServiceProvider {
  id                   String   @id @default(cuid())
  tenantId             String?                       // nullable for cross-tenant providers
  name                 String
  category             ServiceCategory
  customCategoryId     String?
  country              String
  availabilityWindows  Json?                         // D-014
  status               ProviderStatus @default(PENDING)
  engagementCount      Int      @default(0)
  totalCommission      Float    @default(0)
  publicListingOptIn   Boolean  @default(false)     // D-017
  publicProfile        Json?                         // D-017
  publicListingId      String?
  contractId           String?
  freeTierExpiresAt    DateTime?                    // D-009
  createdAt            DateTime @default(now())
}

model ServiceProviderContract {
  id                 String  @id @default(cuid())
  providerId         String
  version            Int
  commissionPctOther Float   @default(0.25)         // D-007 flat
  signedPdfVaultKey  String
  machineReadable    Json
  createdAt          DateTime @default(now())
}

enum ServiceCategory {
  LAWYER_OTHER_JURISDICTION
  REALTOR
  ACCOUNTANT_TAX
  FUND_MANAGER
  TRANSLATOR
  APOSTILLE
  BANK_FACILITATOR
  RELOCATION_CONCIERGE
  PROPERTY_MANAGEMENT      // new in v0.3
  HOSPITALITY              // new in v0.3
  CUSTOM                   // Platform-Admin extensible (points to CustomCategory)
}

model CustomCategory {
  id               String @id @default(cuid())
  name             String @unique
  requirements     Json
  createdByUserId  String
  createdAt        DateTime @default(now())
}

enum ProviderStatus { PENDING VERIFIED ACTIVE SUSPENDED ARCHIVED }

model ProviderEngagement {
  id             String   @id @default(cuid())
  caseId         String
  providerId     String
  role           String
  status         EngagementStatus @default(INVITED)
  acceptedAt     DateTime?
  completedAt    DateTime?
  commissionPct  Float    @default(0.25)
  feeAmount      Float?
  createdAt      DateTime @default(now())
}

enum EngagementStatus { INVITED ACCEPTED DECLINED ACTIVE COMPLETED DISPUTED }
```

```prisma
// --- Public Directory (Sprint 10.5; D-017) ---
model ProviderListing {
  id              String @id @default(cuid())
  providerId      String @unique
  webflowItemId   String?
  slug            String @unique
  publicFields    Json
  schemaOrgType   String   // "Attorney" | "RealEstateAgent" | "FinancialService" | ...
  status          ListingStatus @default(DRAFT)
  createdAt       DateTime @default(now())
}

model ProviderTestimonial {
  id          String   @id @default(cuid())
  providerId  String
  clientId    String
  body        String
  rating      Int      // 1..5
  consentAt   DateTime
  createdAt   DateTime @default(now())
}

enum ListingStatus { DRAFT PENDING_HITL APPROVED PUBLISHED SUSPENDED }
```

```prisma
// --- Marketing Automation (Sprint 13) ---
model MarketingLead {
  id                   String   @id @default(cuid())
  tenantIdAttributed   String?
  providerIdAttributed String?
  originatedBy         LeadOrigin   // immutable at write
  sourceUrl            String?
  webflowFormId        String?
  quizPayload          Json?
  score                Float?
  targetLocale         String   @default("en")
  status               LeadStatus  @default(NEW)
  convertedCaseId      String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

enum LeadOrigin { LVJ_PLATFORM TENANT_DIRECT PROVIDER_REFERRAL PUBLIC_DIRECT }

model AttributionOverride {
  id                   String   @id @default(cuid())
  originalLeadId       String
  originalAttribution  Json
  newAttribution       Json
  reason               String
  approvedByUserId     String
  approvedAt           DateTime
}

model ContentArticle {
  id                   String   @id @default(cuid())
  webflowItemId        String?
  webflowCollectionId  String?
  targetLocale         String   // en | ar | pt
  targetJurisdiction   Jurisdiction
  targetVisa           String?
  status               ArticleStatus @default(DRAFT)
  lawyerReviewerId     String?
  seoFields            Json
  geoFields            Json
  version              Int      @default(1)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

enum ArticleStatus { DRAFT REVIEW STAGED PUBLISHED ARCHIVED }

model MarketingApproval {
  id                       String   @id @default(cuid())
  articleId                String
  reviewerId               String
  decision                 String   // APPROVED | REJECTED | REQUESTED_CHANGES
  expiresAt                DateTime  // createdAt + 24h per D-010
  arabicReviewerRequired   Boolean  @default(false)   // D-015
  createdAt                DateTime @default(now())
}

model MarketingTouch {
  id         String   @id @default(cuid())
  leadId     String?
  eventType  String   // page_view | form_submit | ai_citation_observed | ...
  sourceUrl  String?
  payload    Json
  createdAt  DateTime @default(now())
}

model MarketingMetric {
  id          String   @id @default(cuid())
  day         DateTime  // rolled up to UTC midnight
  metricKey   String
  metricValue Float
  dimensions  Json
  createdAt   DateTime @default(now())
}
```

```prisma
// --- Marketplace settlement (Sprint 15; D-016) ---
model CommissionLedger {
  id             String   @id @default(cuid())
  engagementId   String
  tenantId       String?
  providerId     String?
  originatingLeadId String?
  grossAmount    Float
  commissionPct  Float   @default(0.25)    // D-007
  commissionDue  Float
  status         LedgerStatus @default(PENDING)
  createdAt      DateTime @default(now())
}

model CommissionPayout {
  id                String   @id @default(cuid())
  month             String   // YYYY-MM
  providerId        String
  stripeConnectAccountId String
  amount            Float
  status            PayoutStatus @default(PENDING)
  createdAt         DateTime @default(now())
}

model StripeConnectAccount {
  id            String   @id @default(cuid())
  ownerType     String   // TENANT | PROVIDER
  ownerId       String
  stripeAcctId  String   @unique
  createdAt     DateTime @default(now())
}

enum LedgerStatus { PENDING SETTLED DISPUTED REVERSED }
enum PayoutStatus { PENDING IN_TRANSIT PAID FAILED }
```

```prisma
// --- GDPR / analytics / cost guard (Sprints 16, + cross-cutting) ---
model DSAR {
  id           String   @id @default(cuid())
  tenantId     String
  subjectEmail String
  kind         String   // ACCESS | ERASURE | PORTABILITY
  status       DSARStatus @default(OPEN)
  dueBy        DateTime  // <= 30 days per GDPR Art.12
  exportKey    String?   // vault path of prepared export
  createdAt    DateTime @default(now())
  closedAt     DateTime?
}

enum DSARStatus { OPEN IN_PROGRESS EXPORT_READY CLOSED ESCALATED }

model AnalyticsEvent {
  id          String   @id @default(cuid())
  tenantId    String
  actorUserId String?
  actorRole   String?
  eventType   String
  payload     Json
  createdAt   DateTime @default(now())
}

model AnalyticsAggregate {
  id          String   @id @default(cuid())
  day         DateTime
  tenantId    String?     // null for platform-wide
  metricKey   String
  metricValue Float
  dimensions  Json
}

model CostLimit {
  id           String   @id @default(cuid())
  scope        String   // TENANT:<id> | PLATFORM_MARKETING | PLATFORM
  softUsd      Float
  hardUsd      Float
  updatedByUserId String?
  updatedAt    DateTime @updatedAt
}

model OnboardingProgress {
  id            String   @id @default(cuid())
  ownerType     String   // TENANT | PROVIDER
  ownerId       String
  step          String
  payload       Json
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Extending existing additive models

- **`HITLApproval`** — add `tier: HITLTier` (`STANDARD | URGENT | CRITICAL | MARKETING`) per D-013.
- **`AutomationLog`** — add `tenantId` (nullable for platform-scope agents).

---

## ═══════════════════════════════════════════
## PHASE 5 — FEATURE IMPLEMENTATION PLAN
## ═══════════════════════════════════════════

Replaces the v3.2 14-sprint plan end-to-end. Aligns with PRD v0.3 §6.1
and D-019 sprint ordering.

### Phase A — Foundation + tenancy + AR

#### Sprint 0 — Foundation Cleanup (landed)
Already landed on `claude/phase-0-audit-NWzaW`. See EXECUTION_LOG.md.

#### Sprint 0.1 — Close 11 unauthed routes (NEW · D-019 priority #1)
- [ ] Enumerate the 11 legacy API routes without auth guards (Phase 0 audit §9).
- [ ] Wrap each with `assertCaseAccess()` / `assertOrgAccess()`; audit-log the close.
- [ ] Regression: adversarial Playwright suite hits each as unauthed and expects 401.
- **Gate:** no tenant work begins until this sprint is green.

#### Sprint 0.5 — Multi-tenancy foundation (NEW)
- [ ] `Tenant` + `TenantContract` models; seed LVJ as tenant #1.
- [ ] Prisma client middleware scopes every query by
      `session.user.tenantId`; `crossTenant: true` bypass writes
      `AuditLog action: cross_tenant_access`.
- [ ] `lib/tenants.ts#assertTenantAccess()` pairs with
      `assertCaseAccess()`.
- [ ] Backfill `tenantId` on all existing business models to LVJ.
- [ ] Adversarial isolation test suite (tenant A ↔ tenant B matrix).

#### Sprint 0.7 — AR + RTL into design system + i18n (NEW · D-015)
- [ ] Load Amiri + IBM Plex Sans Arabic via `next/font/google`.
- [ ] `dir="rtl"` + logical-property audit across
      `components/lvj/*`.
- [ ] Locale switcher persisted (cookie) across Webflow ↔ app ↔ portal.
- [ ] AR i18n keys populated for landed screens (dashboard, sign-in,
      cases, intake, notifications).

#### Sprint 1 — Auth + Navigation
Extended for tenant + locale context. Sidebar adapts to role
(`Platform`, `Tenant`, `Provider`, `Client`).

### Phase B — Core case management

#### Sprint 2 — Dashboard + KPIs (tenant-scoped, EN + AR)
#### Sprint 3 — Cases module (tenant-scoped, EN + AR; `destinationJurisdiction` on `Case`)
#### Sprint 4 — Intake wizard
- **Service-type defaults change** from EB5/H1B/N400 to **D1/D2/D3/D7/D8/Golden/Startup/Family Reunification** (D-006).
- Step 2 captures `destinationJurisdiction` explicitly; drives step-3 document checklist via `skills/portugal-immigration/`.

#### Sprint 5 — Comms Hub
- Twilio + ElevenLabs (incl. **`ELEVENLABS_VOICE_ID_AR`** per D-015), Kaspo, notifications EN + AR templates.

#### Sprint 6 — AI Counsel Copilot (jurisdiction-aware; EN + AR)
#### Sprint 7 — Eligibility quiz + lead funnel (EN + AR; embedded on Webflow EN + /ar)
#### Sprint 8 — Revenue + Billing
- Stripe integration; **Portuguese CTA flag** (replaces IOLTA per D-006).
- **Merge with Stripe Connect onboarding per D-016** — provider
  Express onboarding flows through the same wizard.

### Phase C — Marketplace + multi-tenant ops

#### Sprint 8.5 — Self-serve tenant + provider onboarding (NEW · D-019 / D-016)
- [ ] Signup + contract acceptance + Stripe Connect Express onboarding for providers.
- [ ] Platform-Admin verification gate before LVJ-routed leads flow (Risk R15).
- [ ] `OnboardingProgress` resumable state; EN + AR.

#### Sprint 9 — Multi-tenant operations view
- Split: `/platform/operations` (cross-tenant) + `/operations`
  (single-tenant).
- Add per-team-member analytics surface at
  `/admin/team/[id]/analytics` (D-018).

#### Sprint 10 — Service Provider Pool (REVISED · retitled from "Partner Network")
- 10-category onboarding (PRD §2.1) incl. **property management +
  hospitality**; Platform-Admin extensible via `CustomCategory`.
- Per-category document checklist; encrypted vault at
  `/vault/providers/<providerId>/`.
- `/provider/*` portal with availability windows + commission ledger.
- Monitoring dashboard (response SLA, satisfaction, dispute rate).

#### Sprint 10.5 — Public Service Provider Directory (NEW · D-017)
- Webflow CMS Collection mirror of `ProviderListing`.
- Opt-in flow → marketing-HITL → publish via Data API.
- `/providers` + `/providers/[slug]` pages; EN + AR (D-015).

#### Sprint 11 — Outcome predictor
- Gated thresholds per D-008: staff-internal ≥50 per
  `(jurisdiction × visa)`; client-facing ≥200 AND CI ≤ ±15%.

#### Sprint 12 — Service Types Admin
- Portuguese visa defaults (D1/D2/D3/D7/D8/Golden/Startup/Family
  Reunification); per-tenant overrides.

### Phase D — Marketing automation + mobile

#### Sprint 13 — Marketing Automation Module (REVISED + EXPANDED)
- Webflow Data API integration; webhook ingestion → `MarketingLead`.
- `ContentArticle` Prisma model + Webflow CMS Collection mirror.
- Marketing Drafting agent (per-locale EN + AR + PT, per-jurisdiction
  PT / AE).
- SEO/AEO+AIO/GEO structured-output skill (`skills/seo-aeo-geo/`).
- PostBridge social composer (LinkedIn / Instagram / Twitter /
  Facebook).
- Marketing-HITL via `/admin/marketing-approvals` — 24h SLA per
  D-010; **native AR reviewer required for AR content per D-015**.
- Includes **Public Service Provider Directory** publish surface
  (D-017 cross-link to Sprint 10.5).

#### Sprint 14 — Mobile (Capacitor)
- iOS + Android, Firebase push, **AR + RTL render correctness on
  mobile verified** per D-015.

### Phase E — Marketplace billing + GDPR

#### Sprint 15 — Marketplace billing closure (NEW)
- Stripe Connect provider payouts; monthly `commission-settle` cron.
- Commission-ledger UI for provider + Platform Admin.
- `AttributionOverride` dispute workflow.
- Free-tier expiry sweep (D-009): 30 days prior → subscription
  onboarding nudge.

#### Sprint 16 — GDPR / DPA tooling (NEW)
- DSAR workflow (Art. 15 / Art. 20 / Art. 17) per tenant.
- Per-tenant data export in machine-readable form; verifiable deletion.
- Audit-log retention policy per jurisdiction.
- Cookie + consent UI on Webflow + app (EN + AR).

---

## ═══════════════════════════════════════════
## PHASE 6 — ENVIRONMENT VARIABLES
## ═══════════════════════════════════════════

Add to `.env` and Vercel dashboard:

```bash
# === Multi-LLM ===
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
GOOGLE_AI_API_KEY=...
OPENAI_API_KEY=...

# === Voice (ElevenLabs + Twilio) ===
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
ELEVENLABS_API_KEY=xi_...
ELEVENLABS_VOICE_ID_EN=...
ELEVENLABS_VOICE_ID_AR=...         # NEW · D-015
ELEVENLABS_VOICE_ID_PT=...         # NEW · placeholder for v1.x
ELEVENLABS_MODEL=eleven_multilingual_v2

# === WhatsApp (Kaspo) ===
KASPO_API_KEY=...
KASPO_INSTANCE_ID=...
KASPO_WEBHOOK_SECRET=...

# === Social (PostBridge) ===
POSTBRIDGE_API_KEY=...
POSTBRIDGE_WORKSPACE_ID=...

# === Webflow (NEW · marketing automation + directory) ===
WEBFLOW_API_TOKEN=...
WEBFLOW_SITE_ID=...
WEBFLOW_WEBHOOK_SECRET=...          # HMAC-SHA256 signing

# === Storage ===
GCS_AUDIO_BUCKET=lvj-voice-audio
GCS_VAULT_BUCKET=lvj-docs-vault
GCS_PUBLIC_BUCKET=lvj-docs-public

# === Security ===
DOCUMENT_ENCRYPTION_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.lvj.law

# === Payments ===
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...     # NEW · D-016
STRIPE_PT_CTA_ACCOUNT_ID=acct_...   # NEW · replaces STRIPE_IOLTA_ACCOUNT_ID per D-006
# STRIPE_IOLTA_ACCOUNT_ID=...       # DEPRECATED · kept for legacy reads only

# === Notifications ===
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@lvj.law
FIREBASE_PROJECT_ID=...
FIREBASE_VAPID_KEY=...

# === Marketing / HITL routing (NEW) ===
MARKETING_HITL_REVIEWER_EMAIL=...        # default reviewer per D-010
MARKETING_HITL_AR_REVIEWER_EMAIL=...     # native-AR reviewer per D-015
PLATFORM_ADMIN_PAGE_NUMBER=+351...       # tier-3 escalation pager per D-013

# === Tenancy bootstrap (NEW) ===
DEFAULT_TENANT_SLUG=lvj                  # bootstrap tenant

# === Cost guard defaults (NEW · D-012) ===
COST_GUARD_DEFAULT_TENANT_DAILY_USD=50
COST_GUARD_DEFAULT_PLATFORM_MARKETING_DAILY_USD=30

# === Caching (optional but recommended) ===
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...
```

Deprecated per D-006 — remove after Sprint 8 Stripe migration lands:
any USCIS-specific keys; `STRIPE_IOLTA_ACCOUNT_ID` (replace with
`STRIPE_PT_CTA_ACCOUNT_ID`).

---

## ═══════════════════════════════════════════
## PHASE 7 — OUTPUT FORMAT (Every Feature)
## ═══════════════════════════════════════════

For every feature you implement, always provide in this order:

1. **Pre-flight** — what existing code does this touch? Any risks?
2. **Tenant impact** — does this change touch tenant scoping? If yes, list every model / route / agent / skill affected.
3. **Locale impact** — does this change affect EN + AR + PT rendering? If yes, what RTL / cultural considerations apply (per D-015)?
4. **Schema diff** — exact Prisma additions (additive only — no drops/renames)
5. **Migration** — `npx prisma migrate dev --name [kebab-case-name]`
6. **New files** — full relative paths
7. **Modified files** — full relative paths + what changes
8. **Complete TypeScript** — no TODOs, no `// implement this`, no placeholders
9. **Tests** — Jest unit test + Playwright E2E scenario (at least one each); tenant-isolation test when applicable
10. **ENV vars** — list any new `.env` keys
11. **Packages** — exact `npm install` command
12. **Rollback** — how to undo if something breaks in production

---

## ═══════════════════════════════════════════
## HOW TO USE THIS FILE IN A NEW SESSION
## ═══════════════════════════════════════════

**Option A — Start fresh (first time):**
> "Read `docs/PRD.md` v0.3 first, then `Claude.md` v4.0 completely.
>  Run the Phase 0 audit. Report findings."

**Option B — Resume a sprint:**
> "Read `Claude.md`. Sprint [N] is complete. Begin Sprint [N+1].
>  First task: [specific task]."

**Option C — Single feature:**
> "Read `Claude.md`. Build only: [feature name].
>  Full production code, no placeholders."

**Option D — Debug session:**
> "Read `Claude.md`. I have a bug: [description].
>  Relevant files: [list]. Do not add new features — fix only."

**Option E — Design system proof:**
> "Read `Claude.md` Phase 2. Build design-test.html using the LVJ
>  Authority tokens. Validate: surface layers, type specimen at all
>  sizes, all status-badge colours, light + dark mode, **EN + AR
>  rendering per D-015**."

**Option F — Marketing automation feature:**
> "Read `Claude.md` Phase 5 Sprint 13 +
>  `skills/marketing-automation/SKILL.md` +
>  `skills/webflow/SKILL.md` + `skills/seo-aeo-geo/SKILL.md` +
>  `skills/provider-directory/SKILL.md`. Build only [feature name]."

**Option G — Onboarding feature:**
> "Read Sprint 8.5 + `skills/onboarding/SKILL.md`.
>  Build only [feature name]."

---

*LVJ AssistantApp CLAUDE.md — v4.0 — April 2026*
*Architecture changes edit this file.
 Progress updates go to `docs/EXECUTION_LOG.md`.
 Scope / priority calls made in conversation go to `docs/DECISIONS.md`.
 Product contract lives in `docs/PRD.md` (v0.3).*

---

## ═══════════════════════════════════════════
## DOCUMENTATION DISCIPLINE (RULE — READ EVERY SESSION)
## ═══════════════════════════════════════════

Encoded from decision **D-005** in `docs/DECISIONS.md`. This is a
standing instruction — every future session inherits it.

1. **Every commit on the feature branch appends an entry to
   `docs/EXECUTION_LOG.md` in the same PR.** Short SHA, one-line title,
   5–15 lines of substantive detail. Never squash doc updates into a
   later commit.
2. **Every scope / priority / vendor / contract call the founder makes
   in conversation becomes a `D-NNN` entry in `docs/DECISIONS.md`.**
   Land it in the same PR that implements the consequence. Don't
   rewrite past decisions — add a new one and mark the old `superseded-
   by`.
3. **This file (`Claude.md`) is only edited when architecture shifts**
   — new phase, new golden rule, new architecture decision. Progress,
   commit summaries, and TODOs live in `EXECUTION_LOG.md`.
4. **After a commit that touches a long-lived contract**
   (`AGENT_OS.md`, the manifest schema, the guardrail pipeline, the
   RBAC model, the Prisma schema) — bump the version header on the
   affected doc and note the change at the top of `EXECUTION_LOG.md`.
5. **Before pushing,** run through the log and decisions doc one last
   time to confirm they reflect the commit. If they don't, amend (or
   add a fix-up commit in the same PR).
6. **If a session runs out of context mid-task,** the next session
   must reconstruct state by reading `EXECUTION_LOG.md` first — not
   by re-reading every source file. That's what the log exists for.

Short version: docs update with the code, not after it.

---

## ═══════════════════════════════════════════
## EXECUTION STATUS (SNAPSHOT)
## ═══════════════════════════════════════════

Point-in-time summary; the full history lives in
`docs/EXECUTION_LOG.md`. Update this block when it meaningfully changes.

**Active branch:** `claude/phase-0-audit-NWzaW` (code)
                  · `claude/rebaseline-claude-v4-tSN6g` (v4.0 docs re-baseline)

**What's landed** (commits, newest last)
- `a49d568` · Sprint 0 foundation — rbac / events / audit / crypto /
  ai-router / notifications / AuditLog + 6 more additive models.
- `6d42144` · Sprint 1 UI — tokens, fonts, `components/lvj/*`, sign-in,
  dashboard.
- `e8bf9ca` · Phase 8 — `docs/AGENT_OS.md`; `Claude.md` → v3.1.
- `42dde49` · Sprint 1 UI — Cases list, Case detail, Intake wizard,
  Notifications.
- `3e15819` · AOS Phase 1 runtime + Intake / Drafting / Email agents +
  `/admin/approvals`.
- `7fd44ad` · Documentation discipline: EXECUTION_LOG + DECISIONS +
  `Claude.md` v3.2.
- **v4.0 re-baseline** — this PR. Documentation-only; no source code
  touched. Lays the contract for Sprints 0.1 → 16 per D-019.

**What's armed but off**
- AOS agents feature-flagged OFF: `AGENT_INTAKE_ENABLED`,
  `AGENT_DRAFTING_ENABLED`, `AGENT_EMAIL_ENABLED`.
- `subscribeAgent()` not yet wired to bootstrap.

**What's blocked on external work**
- `npx prisma migrate dev` — sandbox has no DB.
- 11 legacy API routes still lack auth guards — Sprint 0.1.
- KB article bodies need lawyer review.
- **Portuguese-licensed lawyer review** needed for all PT skills + R13
  commission compliance opinion (Article 100 fee-sharing) before the
  first tenant contract is signed.
- **UAE-licensed lawyer** needed for v1.x.
- **Arabic-language QA reviewer** for D-015 marketing-HITL.
- **DPO + DPA template** for GDPR (Sprint 16 pre-req).

**What's to-be-redirected** (opened by PRD v0.3 / v4.0 re-baseline)
- All US-immigration KB articles, prompts, skills (RFE drafter, USCIS
  deadline engine, IOLTA flag, ABA disclaimers) need rewriting against
  PT-OA + SEF/AIMA + EU GDPR per D-006.
- Design system needs AR typography subsection ✅ (added in v4.0).
- 11 unauthed routes close ✅ (deferred to Sprint 0.1).

**Next natural sprint** (per D-019)
- **Sprint 0.1** (close 11 unauthed routes)
- → **Sprint 0.5** (multi-tenancy foundation)
- → **Sprint 0.7** (AR + RTL)
- → **AOS Phase 2** (deadline + channels + KB RAG + consent)
- → **Sprint 8.5** (onboarding)
- → **Sprint 8 / 15** (Stripe Connect billing + payouts)
- → **Sprint 13 / 10.5** (Marketing Automation incl. Provider Directory).
- Founder may rearrange; any re-ordering requires a superseding D-NNN.

---

## ═══════════════════════════════════════════
## PHASE 8 — AGENT OPERATING SYSTEM (AOS)
## ═══════════════════════════════════════════

Starting Sprint 5+, the feature surface (WhatsApp, voice, social,
multi-tenant operations, outcome prediction, portal automations,
marketing automation, drafting, deadline management) is too broad to
implement as independent route handlers. It needs a first-class **Agent
Operating System** — a thin, opinionated runtime on top of the Sprint 0
foundation (`lib/events.ts`, `lib/ai-router.ts`, `lib/audit.ts`,
`lib/rbac.ts`, `lib/tenants.ts`, `AuditLog`, `AutomationLog`).

**Full spec: [`docs/AGENT_OS.md`](docs/AGENT_OS.md)** — the binding
contract for every agent in the system. Jurisdiction-neutral runtime;
jurisdiction awareness flows through `AIRequest.context` and per-skill
KB governance.

### Executive summary

- **Not everything is an agent.** Four tiers: *Service* (Legal KB RAG,
  Orchestrator, HITL Gate, Cost Guard), *Workflow agent* (Intake,
  Drafting, Deadline, Eligibility, Documents, Billing, CRM, Growth,
  **Marketing drafters**, **Attribution Classifier**, **Provider
  Listing Generator**), *Channel agent* (Email, WhatsApp, Voice,
  Internal Messaging, **Webflow Publisher**), *Surface* (Client Portal,
  Mobile, CRM Dashboard, **Platform Dashboard**).
- **Manifest contract.** Every agent is `agents/<id>/` with
  `manifest.yaml` + `run.ts` + zod schemas + versioned prompt + golden
  fixtures + SKILL.md.
- **Hard tool allowlists.** The `invoke()` wrapper proxies every tool
  call.
- **Model routing via AITask only.**
- **HITL gates are positional and data-backed.**
- **Budgets enforced** — see D-012 below.
- **Guardrail pipeline post-LLM, pre-send.**
- **Knowledge base is versioned content.**
- **Observability is mandatory** — every invoke writes one
  `AutomationLog` row + one or more `AuditLog` rows with a shared
  `correlationId`.
- **Phased rollout.**

> **Tenant isolation is enforced by the `invoke()` wrapper.** Every
> tool call checks `tenantId` parity between the caller and the target
> rows. Cross-tenant tool calls require an explicit `crossTenant: true`
> capability declared in the agent manifest, granted only to
> Platform-level agents (e.g., the Marketing agent group, the Cost
> Guard, the Analytics roll-up cron).

### Additive Prisma models introduced by AOS

- `AgentDraft` — drafts produced by any workflow agent before HITL/send.
- `AutomationLog` — one row per agent invoke.
- `HITLApproval` — pending / approved / rejected / expired HITL decisions; **`tier` added in v4.0 per D-013**.
- `CaseDeadline` — typed deadlines owned by the Deadline agent.
- `SocialPost`, `ContentBrief`, `ReviewRequest`, `AgentQASample` — Phase 4–5.

### Phase 1 minimum viable loop (proves the runtime end-to-end)

```
public intake form
  → webhook ingest / Webflow form submit
  → tenant resolved from intake form's webflowSiteId mapping
  → EligibilityLead row (tenantId set)
  → orchestrator dispatches intake.submitted
  → Intake agent: classify service type + initial doc list + summary
  → escalates or emits drafting.request for welcome email
  → Drafting agent: instantiate template → guardrail pipeline
  → hitl.requested (LAWYER_ADMIN, 4h SLA — D-013 Standard tier)
  → /admin/approvals → APPROVED
  → Email agent: send via SendGrid, write NotificationLog
  → Full audit chain via correlationId across AuditLog + AutomationLog
```

### Phase 2.5 — Marketing automation agents (NEW)

Between current Phase 2 and Phase 3 of the AOS roll-out, a distinct
agent group powers the Marketing module. All Platform-scope (not
per-tenant) unless otherwise stated.

- **Marketing Drafting** (per-locale EN / AR / PT)
- **SEO Structurer** (emits JSON-LD)
- **GEO Optimizer** (E-E-A-T rewrite)
- **Webflow Publisher** (deterministic channel adapter; no LLM)
- **Marketing-HITL Gate** — 24h SLA per D-010; native AR reviewer in
  chain for AR content per D-015.
- **Attribution Classifier** — classifies `originatedBy` at lead
  creation.
- **Provider Listing Generator** — D-017 directory profile.
- **Arabic Translator + Cultural Reviewer** — AR translation agent
  gated by a native-speaker human reviewer in HITL per D-015.

### Binding constraints (summary — full text in `docs/AGENT_OS.md` §8–§10)

- Outputs carry an `advice_class ∈ {general_information | firm_process
  | attorney_approved_advice}`. **Only a lawyer licensed in the
  matter's destination jurisdiction** may set
  `attorney_approved_advice` on outputs targeting that jurisdiction.
  The `invoke()` wrapper checks license-jurisdiction parity.
- Outbound WhatsApp / SMS / voice require `Case.clientConsent.<channel>`.
- **Quiet hours.** Per-actor availability windows (D-014) override
  platform default (21:00–08:00 client-local). Tier 2 (Urgent) and
  Tier 3 (Critical) per D-013 override quiet hours.
- A `Case.autoPauseUntil` field halts all automated outbound until
  cleared.

### Budget enforcement (D-012)

|Scope             |Soft (warn + pause non-critical)|Hard (pause all)|
|------------------|--------------------------------|----------------|
|Per tenant        |$50/day                         |$100/day        |
|Platform marketing|$30/day                         |$75/day         |
|Platform-wide     |—                               |**$200/day**    |

Per-invoke ceiling: $5. Escalation override: $200 (Platform Admin only,
audit-logged). Reset UTC midnight. Per-tenant **and** platform-wide
enforcement, not one or the other.

### HITL tiers (D-013)

|Tier     |SLA                                   |Triggers                                                                               |
|---------|--------------------------------------|---------------------------------------------------------------------------------------|
|Standard |4h                                    |General advice review, routine outbound                                                |
|Urgent   |1h                                    |`escalation.urgent_deadline` (visa <72h, hearing <7d)                                  |
|Critical |15min business hours / pager off-hours|`escalation.adverse_notice` (denial), `escalation.criminal_history` (intake disclosure)|
|Marketing|24h                                   |All marketing content (D-010)                                                          |

### Availability (D-014)

Per-actor availability schedules respected by the lead-routing pipeline
and the outbound dispatcher. Per-recipient quiet hours
(`Client.quietHoursOverride`) separate from per-actor availability
(`ServiceProvider.availabilityWindows`, `TeamMember.availabilitySchedule`).
`lib/scheduling.ts` checks all three before dispatch; Tier 2 / 3
overrides apply only to internal pager, not to client-facing outbound.

Anything not in `docs/AGENT_OS.md` + this file + the D-NNN log is an
RFC, not an implementation.

---
