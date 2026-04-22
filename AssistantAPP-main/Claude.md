# LVJ Immigration App — Claude Code Master Context
# Version 3.2 — Enhanced Architecture + Full Feature Spec + Agent Operating System
# Read this file COMPLETELY before writing a single line of code.
# Then read docs/EXECUTION_LOG.md to see the current state of the tree,
# and docs/DECISIONS.md to see every scope / priority call made in conversation.

> **TOOLING POLICY**: Standard tools (Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch)
> are always available. MCP tools and Agent/Task tools with subagent_type are permitted —
> use Agent tools for parallelizable exploration and open-ended codebase search.
> Never let an agent mutate git state (commits, pushes, merges) or edit DEVLOG.md / ACTION_ITEMS.md.

---

## 🚀 Quick Start for Claude Code

You are building **LVJ AssistantApp** — a full-stack immigration law firm case management
SaaS. The founder is Khaled Aun. Before writing any code:

1. Read this entire file
2. Read `docs/EXECUTION_LOG.md` — the rolling commit log; tells you what has already landed
3. Read `docs/DECISIONS.md` — every scope / priority call the founder has already made
4. Read `docs/AGENT_OS.md` if the task touches any agent (§Phase 8)
5. Only after those four reads: plan the task, then execute

Sprint 0 (foundation) and AOS Phase 1 (runtime + Intake/Drafting/Email) have already
landed on `claude/phase-0-audit-NWzaW`. Do not re-implement them — extend them.

---

## 🎯 Product Identity

| Property | Value |
|---|---|
| **App name** | LVJ AssistantApp |
| **Type** | Immigration law firm case management SaaS |
| **Current version** | v0.1.0 → targeting v1.0.0 |
| **Primary market** | MENA (English first, Arabic deferred) |
| **Stack** | Next.js 14 App Router + TypeScript + Prisma + PostgreSQL |
| **Deploy** | Vercel + GCS + Firebase |
| **Auth** | NextAuth.js v4 |
| **UI** | shadcn/ui + Tailwind CSS + Radix UI + Lucide icons |

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
10. Multi-office data scoping via `officeId` FK on every staff-facing model

---

## 🗂 Project Structure

```
AssistantAPP-main/
├── app/
│   ├── (auth)/              # Sign-in, magic link, role redirect
│   ├── (staff)/             # Staff/counsel layout — sidebar nav
│   │   ├── dashboard/
│   │   ├── cases/           # List + detail + tabs
│   │   ├── intake/          # 4-step wizard
│   │   ├── calendar/
│   │   ├── messages/
│   │   ├── notifications/   # NEW — first-class feed screen
│   │   ├── reports/
│   │   ├── predictor/       # NEW — outcome predictor
│   │   ├── partners/        # NEW — partner network
│   │   ├── operations/      # NEW — global/multi-office view
│   │   └── admin/
│   │       ├── service-types/
│   │       ├── team/
│   │       ├── settings/
│   │       └── brand/       # NEW — internal design system governance
│   ├── (client)/            # Client portal — mobile-first bottom nav
│   │   ├── my-case/
│   │   ├── documents/
│   │   ├── messages/
│   │   └── payments/
│   ├── (public)/            # Unauthenticated
│   │   ├── eligibility/     # Lead funnel quiz
│   │   └── book/            # Appointment booking
│   └── api/
│       ├── ai/              # All AI endpoints
│       ├── voice/           # Twilio + ElevenLabs webhooks
│       ├── whatsapp/        # Kaspo webhooks
│       ├── social/          # PostBridge
│       ├── cron/            # Vercel cron handlers
│       └── webhooks/        # Stripe, Firebase, etc.
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── cases/               # Case-specific components
│   ├── intake/              # Intake wizard steps
│   ├── client-portal/       # Client-facing components
│   └── shared/              # Cross-domain shared components
├── lib/
│   ├── ai-router.ts         # Multi-LLM orchestration (BUILD FIRST)
│   ├── events.ts            # Event bus
│   ├── rbac.ts              # RBAC guards (COMPLETE STUBS FIRST)
│   ├── twilio.ts            # SMS + Voice
│   ├── elevenlabs.ts        # TTS voice generation
│   ├── kaspo.ts             # WhatsApp via Kaspo
│   ├── postbridge.ts        # Social media scheduling
│   ├── crypto.ts            # Document encryption (attorney-client privilege)
│   ├── gcs-upload.ts        # GCS (existing — do not break)
│   ├── notifications.ts     # Multi-channel dispatcher (replace stub)
│   ├── email.ts             # SendGrid (replace stub)
│   ├── audit.ts             # Audit log writer
│   └── deadline-engine.ts   # USCIS deadline calculation
├── prisma/
│   └── schema.prisma        # Single source of truth for data
├── types/                   # TypeScript interfaces
├── messages/                # i18n (en.json — AR structure reserved)
├── skills/                  # Claude Code skill files (see below)
└── CLAUDE.md                # This file
```

---

## 🧠 Skills Reference

Domain-specific best practices live in `skills/`. Read the relevant skill BEFORE
implementing any feature in that domain.

| Skill file | Purpose |
|---|---|
| `skills/rbac/SKILL.md` | RBAC patterns, assertCaseAccess, 7-role matrix |
| `skills/ai-router/SKILL.md` | Multi-LLM routing, fallback chains, caching |
| `skills/voice-ai/SKILL.md` | ElevenLabs + Twilio TwiML pipeline |
| `skills/whatsapp/SKILL.md` | Kaspo API patterns, webhook verification |
| `skills/forms-automation/SKILL.md` | USCIS form pre-fill, pdf-lib, DS-160 |
| `skills/deadline-engine/SKILL.md` | USCIS deadline rules, Vercel cron patterns |
| `skills/design-system/SKILL.md` | LVJ design tokens, typography rules, component patterns |
| `skills/client-portal/SKILL.md` | Mobile-first portal, Capacitor, push notifications |
| `skills/security/SKILL.md` | Encryption, audit logging, OWASP, attorney-client privilege |
| `skills/outcome-predictor/SKILL.md` | ML data collection, approval odds model |

Create these skill files as you build each module. They persist your decisions for
future Claude Code sessions.

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

# 3. Check RBAC stub completeness
cat AssistantAPP-main/lib/rbac.ts

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
```

### Audit Blockers (Fix in Sprint 0 Before Anything Else)
- [ ] Delete all ghost files in root
- [ ] Complete `assertCaseAccess()` in `lib/rbac.ts` (currently a stub)
- [ ] Complete `assertOrgAccess()` in `lib/rbac.ts` (currently a stub)
- [ ] Replace `lib/notifications.ts` mock with real event bus skeleton
- [ ] Run `npx prisma validate` — fix any schema errors
- [ ] Confirm all existing API routes have auth checks

---

## ═══════════════════════════════════════════
## PHASE 1 — RESEARCH (Do Before Writing UI)
## ═══════════════════════════════════════════

Use WebSearch and WebFetch to study these references. Save key findings
as comments at the top of the relevant skill files.

### Design References (UI/UX)
- Linear.app dashboard — gold standard for SaaS information density
- Stripe dashboard — typography hierarchy, table design, status badge patterns
- Clio (clio.com) — direct competitor, immigration/legal CRM, note their IA
- Lawmatics (lawmatics.com) — immigration CRM, client portal patterns
- Search: "legal case management dashboard UI 2025 best practices"
- Search: "law firm SaaS design system typography serif mono combination"

### Technical References
- Search: "ElevenLabs Twilio outbound voice call Next.js 2025 TwiML Play GCS"
- Search: "Kaspo WhatsApp Business API Node.js TypeScript webhook 2025"
- Search: "PostBridge API documentation social media scheduling"
- Search: "next-intl App Router Server Components 2025 patterns"
- Search: "Capacitor Next.js iOS Android wrapper 2025"
- Search: "Vercel Cron Jobs Next.js App Router patterns"
- Fetch: https://www.twilio.com/docs/voice/twiml/play
- Fetch: https://elevenlabs.io/docs/api-reference/text-to-speech

### Awesome Lists to Mine
- Search: "awesome legal tech github immigration"
- Search: "awesome Next.js dashboard admin open source 2025"
- Search: "USCIS form automation pdf-lib typescript"

---

## ═══════════════════════════════════════════
## PHASE 2 — DESIGN SYSTEM
## ═══════════════════════════════════════════

This is an immigration law firm. People's futures depend on this software.
The visual language must communicate: authority, trust, precision, and care.
It is NOT a startup SaaS. Avoid: gradient buttons, colored side borders on cards,
purple/violet schemes, emoji as icons, centered-everything layouts.

### Design Tokens (globals.css)

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
  --color-approved:           #1A6B3C;   /* forest green — authority, not startup */
  --color-approved-bg:        #E8F4EE;
  --color-pending:            #994F00;   /* deep amber */
  --color-pending-bg:         #FDF3E3;
  --color-denied:             #8B1A1A;   /* deep red */
  --color-denied-bg:          #FAEAEA;
  --color-review:             #1A4A8B;   /* deep blue */
  --color-review-bg:          #E8EEF8;
  --color-submitted:          #5B2D8B;   /* deep purple */
  --color-submitted-bg:       #F0EBF8;
  --color-draft:              #4A5C6E;   /* neutral muted */
  --color-draft-bg:           #F0EEE9;

  /* === TYPOGRAPHY === */
  --font-display:   'Cormorant Garamond', 'Playfair Display', 'Georgia', serif;
  --font-body:      'Inter', 'system-ui', sans-serif;
  --font-mono:      'JetBrains Mono', 'Fira Code', monospace;

  /* RULE: --font-display is ONLY used at 18px (--text-lg) and above.
           Below 18px: always --font-body.
           Mono: case IDs, dates, file sizes, progress percentages. */

  /* === SPACING (4px base) === */
  --space-1: 0.25rem;   --space-2: 0.5rem;   --space-3: 0.75rem;
  --space-4: 1rem;      --space-6: 1.5rem;   --space-8: 2rem;
  --space-10: 2.5rem;   --space-12: 3rem;    --space-16: 4rem;
  --space-20: 5rem;     --space-24: 6rem;

  /* === RADIUS — conservative, law-firm appropriate === */
  --radius-sm:   2px;    /* badges, table rows */
  --radius-md:   4px;    /* cards, inputs */
  --radius-lg:   6px;    /* modals, panels */
  --radius-full: 9999px; /* pills */

  /* === SHADOWS — navy-tinted, not pure black === */
  --shadow-sm: 0 1px 2px oklch(0.15 0.06 230 / 0.05);
  --shadow-md: 0 4px 12px oklch(0.15 0.06 230 / 0.09);
  --shadow-lg: 0 12px 32px oklch(0.15 0.06 230 / 0.14);

  /* === TYPE SCALE (fluid) === */
  --text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.8rem);    /* 12-13px: mono labels */
  --text-sm:   clamp(0.8rem, 0.75rem + 0.35vw, 0.9rem);    /* 13-14px: nav, buttons */
  --text-base: clamp(0.9rem, 0.85rem + 0.25vw, 1rem);      /* 14-16px: body */
  --text-lg:   clamp(1rem, 0.9rem + 0.5vw, 1.2rem);        /* 16-19px: subheadings */
  --text-xl:   clamp(1.2rem, 1rem + 1vw, 1.75rem);         /* 19-28px: section heads */
  --text-2xl:  clamp(1.75rem, 1.2rem + 2vw, 2.75rem);      /* 28-44px: page titles */
  --text-hero: clamp(2.5rem, 1.5rem + 4vw, 4rem);          /* hero only */

  /* === CONTENT WIDTHS === */
  --content-narrow:  640px;
  --content-default: 960px;
  --content-wide:    1280px;
}

/* Dark mode */
[data-theme="dark"] {
  --color-bg:            #080E18;
  --color-surface:       #0D1827;
  --color-surface-2:     #111E30;
  --color-surface-offset: #152238;
  --color-text:          #E2EAF2;
  --color-text-muted:    #7A9AB5;
  --color-text-faint:    #3A5470;
  --color-accent:        #D4AF3A;
  --color-primary:       #4A8EC4;
  --shadow-sm: 0 1px 2px oklch(0 0 0 / 0.3);
  --shadow-md: 0 4px 12px oklch(0 0 0 / 0.45);
  --shadow-lg: 0 12px 32px oklch(0 0 0 / 0.55);
}
```

### Font Loading (app/layout.tsx)
```html
<!-- Load in <head> via next/font/google or CDN link -->
Cormorant Garamond: weights 300, 400, 600 (italic variants)
Inter: weights 300..700 (variable)
JetBrains Mono: weights 400, 500
```

### Component Design Rules
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

---

## ═══════════════════════════════════════════
## PHASE 3 — MULTI-LLM AI ROUTER
## ═══════════════════════════════════════════

All AI calls go through `lib/ai-router.ts`. Never call model APIs directly in routes.

### Model Routing Strategy

| Task type | Primary model | Fallback | Rationale |
|---|---|---|---|
| `ocr-passport` | gemini-2.5-pro | gpt-4o | Vision + multilingual |
| `ocr-document` | gemini-2.5-pro | gpt-4o | Long context, vision |
| `rfe-draft` | gpt-5 | claude-3-7-sonnet | Legal writing |
| `legal-analysis` | claude-3-7-sonnet | gpt-5 | Complex reasoning |
| `approval-odds` | gpt-5 | gemini-2.5-pro | Structured output |
| `form-prefill` | gpt-5 | gemini-2.5-pro | JSON structured output |
| `eligibility-score` | gemini-2.5-pro | gpt-5 | Multilingual quiz |
| `translation-check` | mistral-large | gemini-2.5-pro | Cost-efficient batch |
| `social-copy` | gpt-5 | claude-3-7-sonnet | Copywriting |
| `email-draft` | claude-3-7-sonnet | gpt-5 | Nuanced communication |
| `batch-analysis` | mistral-large | gemini-2.5-pro | Cost optimization |
| `deadline-check` | claude-3-7-sonnet | gpt-5 | Policy interpretation |

### Required packages
```bash
npm install @anthropic-ai/sdk @mistralai/mistralai ai
# ai = Vercel AI SDK for unified streaming interface
```

### lib/ai-router.ts skeleton
```typescript
export type AITask =
  | 'ocr-passport' | 'ocr-document' | 'rfe-draft' | 'legal-analysis'
  | 'approval-odds' | 'form-prefill' | 'eligibility-score'
  | 'translation-check' | 'social-copy' | 'email-draft'
  | 'batch-analysis' | 'deadline-check'

export interface AIRequest {
  task: AITask
  input: string | { text?: string; imageUrl?: string }
  locale?: 'en' | 'ar' | 'pt'
  caseId?: string
  userId?: string
  stream?: boolean
}

export interface AIResponse {
  output: string
  model: string
  tokensUsed?: number
  durationMs?: number
  cached?: boolean
}

// Route → try primary → fallback → log to AutomationLog → return
export async function routeAI(req: AIRequest): Promise<AIResponse>
```

---

## ═══════════════════════════════════════════
## PHASE 4 — DATA MODEL (Prisma)
## ═══════════════════════════════════════════

### Existing models (do not remove or rename fields — additive only)
Read `prisma/schema.prisma` first. The following additions are needed:

### New models to add

```prisma
// Multi-office support
model Office {
  id          String   @id @default(cuid())
  name        String
  city        String
  country     String
  timezone    String
  region      String   // MENA | Americas | Europe
  flag        String?
  isHQ        Boolean  @default(false)
  cases       Case[]
  teamMembers TeamMember[]
  createdAt   DateTime @default(now())
}

// Partner network
model Partner {
  id             String   @id @default(cuid())
  name           String
  type           PartnerType  // REFERRAL_AGENCY | RC_OPERATOR | LEGAL_AID | CO_COUNSEL
  contactEmail   String
  contactPhone   String?
  commissionPct  Float    @default(0)
  totalReferrals Int      @default(0)
  totalRevenue   Float    @default(0)
  referralCode   String   @unique @default(cuid())
  cases          Case[]   @relation("PartnerCase")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

// Service type catalogue
model ServiceType {
  id               String   @id @default(cuid())
  code             String   @unique  // EB5, H1B, N400, etc.
  name             String
  category         String   // Investor | Work | Family | Citizenship | Asylum | Waiver
  typicalTimeline  String?  // "8-14 months"
  baseFee          Float
  governmentFee    Float    @default(0)
  requiredForms    String[] // ["I-526E", "I-485"]
  counselPool      TeamMember[] @relation("ServiceTypeCounsel")
  cases            Case[]
  createdAt        DateTime @default(now())
}

// Outcome predictor data collection
model CaseOutcome {
  id              String   @id @default(cuid())
  caseId          String   @unique
  case            Case     @relation(fields: [caseId], references: [id])
  serviceCode     String
  officerLocation String?
  filingDate      DateTime?
  adjudicationDate DateTime?
  outcome         OutcomeResult  // APPROVED | DENIED | WITHDRAWN | PENDING
  rfeIssued       Boolean  @default(false)
  rfeResponseDays Int?
  approvalOddsPredicted Float?
  approvalOddsActual    Float?
  createdAt       DateTime @default(now())
}

// Eligibility quiz leads
model EligibilityLead {
  id           String   @id @default(cuid())
  email        String
  phone        String?
  name         String?
  answers      Json     // quiz answers
  score        Float    // eligibility score 0-100
  visaCategory String?  // best match visa type
  status       LeadStatus @default(NEW)  // NEW | CONTACTED | CONVERTED | ARCHIVED
  caseId       String?  // set when converted to case
  source       String?  // utm_source
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// Notification channel feed
model NotificationLog {
  id         String   @id @default(cuid())
  caseId     String?
  userId     String
  channel    NotifChannel  // EMAIL | SMS | WHATSAPP | PUSH | IN_APP
  subject    String?
  body       String
  status     NotifStatus   // QUEUED | SENT | DELIVERED | FAILED | READ
  externalId String?  // Twilio SID, Kaspo message ID, etc.
  readAt     DateTime?
  createdAt  DateTime @default(now())
}

// Voice call log (ElevenLabs + Twilio)
model VoiceCallLog {
  id          String   @id @default(cuid())
  caseId      String?
  userId      String
  twilioSid   String?
  direction   String   // OUTBOUND | INBOUND
  status      String   // queued | ringing | in-progress | completed | failed
  duration    Int?     // seconds
  audioGcsUrl String?  // ElevenLabs TTS audio stored in GCS
  transcript  String?
  locale      String   @default("en")
  createdAt   DateTime @default(now())
}

enum PartnerType   { REFERRAL_AGENCY RC_OPERATOR LEGAL_AID CO_COUNSEL }
enum OutcomeResult { APPROVED DENIED WITHDRAWN PENDING }
enum LeadStatus    { NEW CONTACTED CONVERTED ARCHIVED }
enum NotifChannel  { EMAIL SMS WHATSAPP PUSH IN_APP }
enum NotifStatus   { QUEUED SENT DELIVERED FAILED READ }
```

---

## ═══════════════════════════════════════════
## PHASE 5 — FEATURE IMPLEMENTATION PLAN
## ═══════════════════════════════════════════

### Sprint 0 — Foundation Cleanup (Do First, ~2h)
- [ ] Delete ghost files in root
- [ ] Complete `assertCaseAccess(officeId, caseId, userId, role)` in `lib/rbac.ts`
- [ ] Complete `assertOrgAccess(orgId, userId, role)` in `lib/rbac.ts`
- [ ] Create `lib/events.ts` event bus (Promise.allSettled dispatcher)
- [ ] Create `lib/audit.ts` with `logAuditEvent(caseId, userId, action, detail)`
- [ ] Create `lib/crypto.ts` for document encryption (AES-256-GCM)
- [ ] Scaffold `lib/ai-router.ts` (Phase 3)
- [ ] Run `npx prisma migrate dev --name sprint0-foundation`
- [ ] Add Office + Partner + ServiceType + CaseOutcome + EligibilityLead + NotificationLog + VoiceCallLog models
- [ ] Write Jest unit tests for rbac.ts, events.ts, audit.ts

### Sprint 1 — Authentication + Navigation (~3h)
- [ ] Two-panel sign-in screen: left = form, right = brand (LVJ navy + gold mark)
  - Email/password login
  - Magic link option
  - Role detection: client → `/my-case`, staff → `/dashboard`
  - SSO prep (Google Workspace) — wire but don't activate
- [ ] Protected route middleware with role-based redirect
- [ ] Navigation: staff sidebar (7 groups matching design), client bottom-tab nav
- [ ] Light/dark mode toggle (persisted in cookie, not localStorage)
- [ ] Topbar: breadcrumb + search (Cmd+K) + notification bell + messages icon

### Sprint 2 — Dashboard + KPIs (~3h)
- [ ] Dashboard page `/dashboard`
  - Dynamic greeting: "Good morning, [first name]." with day/date subline
  - KPI row: Active Cases (primary/navy), Awaiting Docs (amber), Approved 30d (green), Avg Resolution
  - PRIMARY KPI gets navy background treatment — larger, dominant visual weight
  - "Cases needing attention" table (top 5 by urgency)
  - "Upcoming deadlines" calendar strip (next 7 days)
  - Status pulse mini chart (approval trend, last 12 weeks)
- [ ] All KPI data from real Prisma queries (not mock data)
- [ ] Cron: `/api/cron/deadline-alert` — runs daily, flags cases due in <5 days

### Sprint 3 — Cases Module (~4h)
- [ ] Case list `/cases`
  - Filter chips: by status, service type, counsel, office
  - Density toggle: compact / comfortable (table row height)
  - Column sort: due date, status, counsel, opened date
  - Bulk select + bulk status update
  - CSV export (generates signed GCS URL)
- [ ] Case detail `/cases/[id]`
  - Header: case title (serif 44px), status badge, case ID (mono), quick actions
  - HORIZONTAL stepper at top: case journey steps with connecting line + check on done
  - Two-column layout:
    - Left (1.5fr): Documents binder, AI Counsel panel, Notes/RFE drafter
    - Right (1fr): "Mission Control" — counsel team (photo + caseload % + last activity),
      applicant card (compact), audit log feed
  - Tabs: Overview | Documents | Communications | Billing | AI Counsel
  - Floating "Action required" amber banner when documents are missing

### Sprint 4 — Intake Wizard (~3h)
- [ ] 4-step intake wizard `/intake/new`
  - Step indicator: connected line + checkmark on completed steps (not just background inversion)
  - Step 1: Applicant — name, email, phone, nationality, DOB
  - Step 2: Matter — service type, priority, target filing, summary for counsel
  - Step 3: Documents — upload checklist (required docs by service type, auto-populated)
  - Step 4: Review — summary + retainer fee + e-signature block
  - Auto-save every field on blur to localStorage (resume from any device)
  - On submit: create Case + Applicant + notify assigned counsel via lib/events.ts

### Sprint 5 — Communications Hub (~4h)
- [ ] `lib/twilio.ts` — SMS (status updates, reminders) + outbound voice
- [ ] `lib/elevenlabs.ts` — TTS audio generation, upload to GCS, return public URL
- [ ] Voice call pipeline:
  1. Staff triggers call from case detail
  2. ElevenLabs generates personalized audio (client name + case status + next step)
  3. Audio uploaded to GCS public bucket
  4. Twilio `<Play>` TwiML with GCS URL
  5. Call logged to VoiceCallLog
  6. Transcript stored on call completion webhook
- [ ] `lib/kaspo.ts` — WhatsApp via Kaspo REST API
  - Send message with template
  - Receive inbound (webhook `/api/whatsapp/inbound`)
  - All messages stored in existing Messages model
- [ ] Notifications first-class screen `/notifications`
  - Feed by channel — left-edge channel icon (WhatsApp green, SMS blue, email gray, system gear)
  - Filter: All | Unread | By channel | By case
  - Bulk mark-read, resend failed
  - Real-time via Server-Sent Events or polling (30s interval)

### Sprint 6 — AI Counsel Copilot (~4h)
- [ ] Tab: "AI Counsel" within case detail
  - Sidebar chat UI (streaming via Vercel AI SDK)
  - Context: entire case history, all documents (summarized), applicant profile
  - Quick prompts: "Draft RFE response", "Check eligibility", "Summarize documents",
    "Identify missing evidence", "Estimate approval odds"
- [ ] Document OCR: upload image/PDF → Gemini vision → extract fields → pre-fill form
- [ ] RFE drafter: GPT-5 with USCIS RFE template + case facts → full response draft
- [ ] Approval odds: GPT-5 structured output → probability gauge + comparable cases
- [ ] All AI outputs: "AI-generated — review before use" disclosure badge

### Sprint 7 — Eligibility Quiz + Lead Funnel (~2h)
- [ ] Public quiz `/eligibility` (no auth required)
  - Step-by-step wizard: 8-12 questions, conditional branching by visa type
  - Score calculation → eligibility percentage + recommended visa category
  - Lead capture: email + name after score reveal (gated)
  - On submit: create EligibilityLead → trigger SendGrid welcome sequence
  - CRM view for staff: `/admin/leads` — filter by score, status, source

### Sprint 8 — Revenue + Billing (~3h)
- [ ] Stripe integration
  - One-time retainer payment
  - Installment plans (3/6/12 month)
  - IOLTA trust accounting flag (funds held in trust vs. earned)
  - Payment link generator (email/WhatsApp)
- [ ] Invoice generation: pdf-lib → store in GCS → email/WhatsApp to client
- [ ] Billing tab on case detail: invoices, payments, balance, next due date

### Sprint 9 — Multi-Office Operations (~2h)
- [ ] Global operations `/operations`
  - Office cards: city, flag, active cases, 30d revenue, team size
  - Region filter: All | MENA | Americas | Europe
  - Firm-wide KPIs: total active, combined revenue, global team
  - Migration corridors visualization (which offices handle which visa types)
- [ ] Office scoping: all case queries filter by officeId based on user's office
- [ ] Cross-office case transfer: counsel reassignment with audit log

### Sprint 10 — Partner Network (~2h)
- [ ] Partners screen `/partners`
  - Partner cards: name, type, referrals sent, revenue generated, commission %
  - Partner detail: case list, commission history, referral link
  - New partner form + referral code generation
- [ ] Referral link tracking: UTM params → EligibilityLead.source → Partner attribution
- [ ] Commission calculation cron: monthly, generates payout summary

### Sprint 11 — Outcome Predictor (~3h)
- [ ] Predictor screen `/predictor`
  - Input: service type, nationality, officer location, filing date, RFE history
  - Output: approval probability gauge (0-100%), confidence interval
  - Comparable cases table: similar past cases + their outcomes
  - Data collection: every case outcome auto-saved to CaseOutcome model
- [ ] GPT-5 structured output: approval odds based on case attributes + historical data

### Sprint 12 — Service Types Admin (~1h)
- [ ] `/admin/service-types` — full CRUD
  - Service code, name, category, typical timeline
  - Required forms checklist
  - Base fee + government fee
  - Assigned counsel pool

### Sprint 13 — Social Media Automation (~2h)
- [ ] `lib/postbridge.ts` — schedule posts via PostBridge API
- [ ] Social post composer in `/admin/marketing`
  - Templates: case win announcement, visa tip, firm update
  - GPT-5 generates copy → human reviews → PostBridge schedules
  - Platforms: LinkedIn, Instagram, Twitter/X, Facebook

### Sprint 14 — Mobile (Capacitor) (~2h)
- [ ] Capacitor wrapper: `npm install @capacitor/core @capacitor/cli`
- [ ] iOS + Android config: app name "LVJ", splash screen, icons
- [ ] Client portal (`/my-case` and children) = mobile-first bottom-tab nav
- [ ] Push notifications via Firebase + Capacitor plugin
- [ ] "Action required" banner with haptic feedback on doc request

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
ELEVENLABS_VOICE_ID_EN=...    # Professional, authoritative English voice
ELEVENLABS_MODEL=eleven_multilingual_v2

# === WhatsApp (Kaspo) ===
KASPO_API_KEY=...
KASPO_INSTANCE_ID=...
KASPO_WEBHOOK_SECRET=...

# === Social (PostBridge) ===
POSTBRIDGE_API_KEY=...
POSTBRIDGE_WORKSPACE_ID=...

# === Storage ===
GCS_AUDIO_BUCKET=lvj-voice-audio      # Must be public read for Twilio
GCS_VAULT_BUCKET=lvj-docs-vault       # Private — encrypted documents
GCS_PUBLIC_BUCKET=lvj-docs-public

# === Security ===
DOCUMENT_ENCRYPTION_KEY=...           # 32-byte AES-256-GCM key (hex)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.lvj.law

# === Payments ===
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_IOLTA_ACCOUNT_ID=acct_...

# === Notifications ===
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@lvj.law
FIREBASE_PROJECT_ID=...
FIREBASE_VAPID_KEY=...

# === Caching (optional but recommended) ===
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...
```

---

## ═══════════════════════════════════════════
## PHASE 7 — OUTPUT FORMAT (Every Feature)
## ═══════════════════════════════════════════

For every feature you implement, always provide in this order:

1. **Pre-flight** — what existing code does this touch? Any risks?
2. **Schema diff** — exact Prisma additions (additive only — no drops/renames)
3. **Migration** — `npx prisma migrate dev --name [kebab-case-name]`
4. **New files** — full relative paths
5. **Modified files** — full relative paths + what changes
6. **Complete TypeScript** — no TODOs, no `// implement this`, no placeholders
7. **Tests** — Jest unit test + Playwright E2E scenario (at least one each)
8. **ENV vars** — list any new `.env` keys
9. **Packages** — exact `npm install` command
10. **Rollback** — how to undo if something breaks in production

---

## ═══════════════════════════════════════════
## HOW TO USE THIS FILE IN A NEW SESSION
## ═══════════════════════════════════════════

**Option A — Start fresh (first time):**
> "Read CLAUDE.md completely. Run the Phase 0 audit. Report findings.
>  Then begin Sprint 0."

**Option B — Resume a sprint:**
> "Read CLAUDE.md. Sprint [N] is complete. Begin Sprint [N+1].
>  First task: [specific task]."

**Option C — Single feature:**
> "Read CLAUDE.md. Build only: [feature name].
>  Full production code, no placeholders."

**Option D — Debug session:**
> "Read CLAUDE.md. I have a bug: [description].
>  Relevant files: [list]. Do not add new features — fix only."

**Option E — Design system proof:**
> "Read CLAUDE.md Phase 2. Build design-test.html using the LVJ Authority
>  tokens. Validate: surface layers, type specimen at all sizes,
>  all status badge colours, light + dark mode."

---

*LVJ AssistantApp CLAUDE.md — v3.2 — Updated April 2026*
*Architecture changes edit this file.
 Progress updates go to `docs/EXECUTION_LOG.md`.
 Scope / priority calls made in conversation go to `docs/DECISIONS.md`.*

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

**Active branch:** `claude/phase-0-audit-NWzaW`

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

**What's armed but off**
- AOS agents are registered but feature flags default OFF:
  `AGENT_INTAKE_ENABLED`, `AGENT_DRAFTING_ENABLED`, `AGENT_EMAIL_ENABLED`.
- `subscribeAgent()` is not called from a bootstrap handler yet — the
  triggers-to-events wiring is dormant.

**What's blocked on external work**
- `npx prisma migrate dev` — sandbox has no DB + the Prisma binaries
  CDN was 503ing. Pending `--name sprint0-foundation` and
  `--name aos-phase1` on a live dev DB.
- 11 legacy API routes still lack auth guards (Phase 0 audit §9).
- KB article bodies (`skills/core/disclaimers/*`, tone guides,
  escalation matrix) need lawyer review before flipping to
  `confidence: authoritative`.

**Next natural sprint**
- AOS Phase 2: `deadline` agent, `whatsapp` + `voice` + `internal-msg`
  channels, full Legal KB RAG service, consent model on `Case`.
- OR the "never-ship list" check: finish the durable event-bus /
  orchestrator bootstrap and close the 11 unauth'd routes, since the
  loop is only safe to arm once that's done.

---

---

## ═══════════════════════════════════════════
## PHASE 8 — AGENT OPERATING SYSTEM (AOS)
## ═══════════════════════════════════════════

Starting Sprint 5+, the feature surface (WhatsApp, voice, social, multi-office,
outcome prediction, portal automations, CRM pipeline, drafting, deadline
management) is too broad to implement as independent route handlers. It needs
a first-class **Agent Operating System** — a thin, opinionated runtime on top
of the Sprint 0 foundation (`lib/events.ts`, `lib/ai-router.ts`, `lib/audit.ts`,
`lib/rbac.ts`, `AuditLog`, `AutomationLog`).

**Full spec: [`docs/AGENT_OS.md`](docs/AGENT_OS.md)** — 15 sections, ~1200 lines,
the binding contract for every agent in the system. That document is part of
the execution plan; sprint work referencing agents must conform to it.

### Executive summary

- **Not everything is an agent.** Four tiers: *Service* (Legal KB RAG,
  Orchestrator, HITL Gate, Cost Guard), *Workflow agent* (Intake, Drafting,
  Deadline, Eligibility, Documents, Billing, CRM, Growth), *Channel agent*
  (Email, WhatsApp, Voice, Internal Messaging), *Surface* (Client Portal,
  Mobile, CRM Dashboard). Misclassification is how agent projects fail.
- **Manifest contract.** Every agent is `agents/<id>/` with `manifest.yaml`
  + `run.ts` + zod schemas + versioned prompt + golden fixtures + SKILL.md.
  `scripts/validate-agents.ts` enforces the contract in CI.
- **Hard tool allowlists.** The `invoke()` wrapper proxies every tool call;
  anything not declared in `tools_allowed` throws. No agent can call
  `prisma.case.delete` unless explicitly granted.
- **Model routing via AITask only.** Agents declare `models: [intake, drafting,
  …]` — they cannot name raw provider model IDs. `lib/ai-router.ts` picks
  primary+fallback (Golden Rule #3 preserved).
- **HITL gates are positional and data-backed.** New additive Prisma model
  `HITLApproval` + `/admin/approvals` UI. Approval chain is auditable.
- **Budgets enforced, not requested.** Per-agent `max_cost_usd` /
  `max_duration_ms` / `max_llm_calls`. Cost Guard service enforces a daily
  firm-wide cap; breach pauses non-critical agents until UTC midnight.
- **Guardrail pipeline post-LLM, pre-send.** Banned-phrase linter, outcome-
  guarantee scanner, UPL classifier, PII scrub, tone check. Hard-fail on UPL
  or outcome-guarantee hits. Protects Golden Rule #7 and §ABA Model Rule 1.6.
- **Knowledge base is versioned content.** `skills/<domain>/*.md` with YAML
  front-matter (owner, jurisdiction, confidence, review_ttl). CI rejects
  stale/expired articles; weekly staleness sweep opens issues.
- **Observability is mandatory.** Every invoke writes one `AutomationLog`
  row + one or more `AuditLog` rows with a shared `correlationId`.
- **Phased rollout.** Phase 1 ships *only* the runtime + `intake` +
  `drafting` + `email` + the four services. The remaining 17 units are
  staged over Phases 2–5.

### Additive Prisma models introduced by AOS (migration lands with Phase 1)

- `AgentDraft` — drafts produced by any workflow agent before HITL/send.
- `AutomationLog` — one row per agent invoke (cost, latency, model, outcome).
- `HITLApproval` — pending/approved/rejected/expired HITL decisions.
- `CaseDeadline` — typed deadlines owned by the Deadline agent.
- `SocialPost`, `ContentBrief`, `ReviewRequest`, `AgentQASample` — Phase 4–5.

All strictly additive (Golden Rule #4). Existing models untouched.

### Phase 1 minimum viable loop (proves the runtime end-to-end)

```
public intake form
  → EligibilityLead row
  → orchestrator dispatches intake.submitted
  → Intake agent: classify service type + initial doc list + summary
  → escalates or emits drafting.request for welcome email
  → Drafting agent: instantiate template → guardrail pipeline
  → hitl.requested (LAWYER_ADMIN, 4h SLA)
  → /admin/approvals → APPROVED
  → Email agent: send via SendGrid, write NotificationLog
  → Full audit chain via correlationId across AuditLog + AutomationLog
```

Until this loop is green in CI + staging, no other agent work ships.

### Binding constraints (summary — full text in `docs/AGENT_OS.md` §8–§10)

- Outputs carry an `advice_class ∈ {general_information | firm_process |
  attorney_approved_advice}`. Only `attorney_approved_advice` may leave the
  firm without a HITL, and only a human lawyer can set that tag.
- Outbound WhatsApp / SMS / voice require `Case.clientConsent.<channel>`.
- Quiet hours 21:00–08:00 client-local for non-pager outbound.
- A `Case.autoPauseUntil` field halts all automated outbound until cleared.
- Structured escalation events (`escalation.criminal_history`,
  `escalation.urgent_deadline`, `escalation.adverse_notice`, …) route per
  `skills/core/escalation/matrix.md` with fixed SLAs.

Anything not in that matrix is an RFC, not an implementation.

---
