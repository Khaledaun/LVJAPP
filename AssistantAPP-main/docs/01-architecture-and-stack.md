# 01 — Architecture & Stack (what to copy from this repo)

## Tech stack we would pick again

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 App Router | SSR + RSC + route handlers in one place |
| Language | TypeScript strict | Zero `any`; shared types across apps |
| DB | Postgres via Supabase | Managed, RLS, PITR, good free tier |
| ORM | Prisma | Migrations + type safety; singleton client |
| Auth | Supabase Auth | OAuth + email + JWT; pairs cleanly with RLS |
| Validation | Zod | Share schemas client ↔ server via `packages/schemas` |
| UI | Tailwind + Radix / shadcn pattern | Logical properties for RTL; accessible primitives |
| State | React Query + Zustand | Server cache vs UI state separation |
| Forms | React Hook Form + Zod | Same schema as API layer |
| Drag & drop | `dnd-kit` | Keyboard-accessible |
| Rich text | TipTap | Extensible, SSR-friendly |
| Docs | `docx` lib + template placeholders | See `skills/legal-documents/` |
| AI | `@ai-sdk/anthropic` (Claude) | Streaming, tool use |
| RAG | Start with Postgres FTS (`tsvector` + GIN), upgrade to pgvector only when warranted | See `docs/KNOWN_ISSUES.md` "Knowledge search strategy" for the real trade-off |
| Email | Resend | Cheap, reliable |
| Rate limit | Upstash Redis in prod | In-memory only for dev |
| Observability | Vercel Analytics + UptimeRobot + Sentry (optional) | Free tier covers MVP |

## Monorepo layout to copy

```
lvjapp/
├── apps/
│   ├── web/                # Public site
│   ├── dashboard/          # Authenticated app
│   └── mobile/             # (later)
├── packages/
│   ├── auth/               # Supabase helpers, session, RBAC
│   ├── db/                 # Prisma schema + singleton client
│   ├── schemas/            # Zod schemas shared across apps + AI tools
│   ├── env/                # Typed env loader; validates on import
│   ├── ui/                 # Shared design system
│   └── utils/              # Pure helpers (date, currency, i18n)
├── docs/                   # Product + engineering docs
├── skills/                 # Domain knowledge packs (SKILL.md per topic)
├── scripts/                # Preflight, migrate, seed, import tools
├── .claude/                # Agents, settings, hooks, commands
│   ├── agents/
│   ├── commands/
│   ├── hooks/
│   └── settings.json
├── .mcp.json               # MCP servers for the repo
├── CLAUDE.md               # Single source of truth for conventions
└── pnpm-workspace.yaml
```

This is close to what `nas-law-site/` evolved into inside this repo (it added `compliance/`, `email/`, `i18n/`, `result/` packages on top of the core four). Steal that shape.

## Key architectural decisions worth copying

- **One Prisma schema, one generated client, one singleton.** Export from `packages/db/index.ts` as `export const prisma = globalThis.__prisma ?? new PrismaClient(); if (!isProd) globalThis.__prisma = prisma;`. We had 14 instantiations leaking pool connections on this project — don't repeat it.
- **Shared Zod in `packages/schemas`.** Every API route calls `schema.safeParse(body)` with the same schema the client form used. No drift.
- **Typed env.** `packages/env` validates process env with Zod on import. Fail fast in dev if a required var is missing.
- **`@@map` matters.** Prisma model `User` maps to table `users`. Raw Supabase queries (`supabase.from(...)`) must use the TABLE name (`users`), not the model name (`User`). Add a comment at the top of each raw-query file to remind the next person.
- **RLS on every table that holds user data.** `user_id = auth.uid()` for private rows, plus an `is_public` column where relevant. The app layer assumes RLS is on; never bypass with `SUPABASE_SERVICE_ROLE_KEY` from user-facing routes.
- **Audit log table from day 1.** Every mutation writes `{ user_id, action, entity, entity_id, before, after, classification, ip, session_id, created_at }`. Expensive to retrofit.
- **Health endpoint on every app.** `/api/health` returns `{ ok, commit: process.env.VERCEL_GIT_COMMIT_SHA, dbLatency, timestamp }`. Used by UptimeRobot and smoke tests.

## The "4-brain architecture" in practical terms

We described a 4-brain AI setup in the business plan. In code it's much simpler than the name suggests — it's one Claude call with a context manager:

- **General (router):** system prompt that classifies the user query and decides which "brains" to consult.
- **Domestic (domain):** a knowledge-base lookup against curated legal references (for `lvjapp`, replace with your domain corpus).
- **Academic (citations):** an RAG lookup over external/authoritative sources, used to ground answers.
- **End-user (memory):** per-user / per-client conversation memory, scoped to a single `clientId` so contexts never cross.

Start simple: one Claude call, explicit routing in the system prompt, per-user memory table. Automate classification only after you have real traces to train against. The "parallel brains" pattern is an optimization; the separation of **domain context**, **authoritative sources**, and **per-user memory** is the real value.

## Skills layer

`skills/<name>/SKILL.md` holds portable knowledge the team (and AI agents) can reference. Format:

- 1500–2000 word main file (`SKILL.md`)
- `references/` — deeper, loaded on demand
- `scripts/` — runnable helpers
- `assets/` — templates, samples

Use it for anything that is "how we do X here": RTL rules, citation formats, deadline calculations, billing math. Pay this cost upfront and AI assistants become far more useful.

## Plugin / extensibility

If you expect third parties to extend the product, design a manifest-driven plugin system early (permissions, pricing, version, hooks). See `docs/PLUGIN_ARCHITECTURE.md`. If you don't expect third parties, skip it — this is the single largest YAGNI trap in our docs.

## What we would NOT do again

- **Ship features before Auth + RBAC are solid.** We had inconsistent API protection across routes and had to centralize `requireAuth`/`requireAdmin` later.
- **Ship Settings UI that doesn't persist.** Our Settings form submitted successfully but didn't write to DB. End-to-end "write → read-back" test every form before launching.
- **Defer multi-user RLS.** We built single-tenant first and retrofit RLS — costly. Turn RLS on at table-creation time, even for solo use.
- **Mix template generation with AI enhancement.** Template-first, AI-as-enhancement-layer; not the other way around. Separates reproducibility from model variance.
- **Let cron endpoints be unauthenticated.** All internal routes (`/api/cron/*`, admin tasks) need a shared secret or a service-role JWT check, enforced in middleware.
