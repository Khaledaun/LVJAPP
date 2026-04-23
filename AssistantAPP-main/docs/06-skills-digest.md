# 06 — Skills Digest (reuse from `skills/`)

This repo built ~16 domain knowledge packs under `skills/`. Most rules are portable; some are Israeli-legal-specific. For `lvjapp`, copy the ones that match your domain and the pattern for the rest.

Each entry below: **skill → what to steal**, tagged (portable) / (RTL-specific) / (legal-specific).

## Portable, take directly

### `everything-claude-code` — coding standards + TDD
- Four pillars: Readability, KISS, DRY, YAGNI. Ban `any`. (portable)
- 80% test coverage minimum; unit + integration + E2E; mock Supabase. (portable)
- Zod validation on every input. No secrets in code. Rate-limit every write. (portable)
- Folders: `__tests__/` alongside source; `e2e/` for Playwright. (portable)

### `code-templates` — agents/commands/hooks/MCPs/settings layout
- `.claude/agents/` — Markdown front-matter agent definitions. (portable)
- `.claude/commands/` — slash commands. (portable)
- `.claude/hooks/` — pre-commit / post-task hooks. (portable)
- `.mcp.json` — MCP server registry. (portable)
- `skills/<name>/SKILL.md` ~1500–2000 words + `references/` + `scripts/` + `assets/`. (portable)

### `ai-agents` — agent orchestration
- Router → Domain → Authoritative → End-User memory; one wrapper, not four services. (portable)
- STM (last 10 msgs) + LTM (rolled summary). (portable)
- Validate LLM output for privilege leaks + over-confident claims before delivery. (portable)
- Rate-limit 50 req/hr per user as a sane default. (portable)

### `backend-api-security`
- Server-side input validation on every route. (portable)
- Centralized auth helpers (`requireAuth`, `requireRole`, `requireOwnership`). (portable)
- CSRF tokens on all mutations; no content-type exemption. (portable)
- JWT with short access + rotating refresh; 2FA-elevated claim for admin. (portable)

### `security-compliance`
- OWASP Top 10 checklist as a PR template. (portable)
- Data classification map for every table. (portable)
- DSR function that really deletes — test it. (portable)
- 72-hour breach notification template pre-written. (portable)

### `incident-response`
- P1–P4 classification with RTO targets. (portable)
- Five-phase recovery: assess → contain → recover → verify → communicate. (portable)
- Blameless post-mortem within a week; store in `docs/incidents/`. (portable)

### `llm-application-dev`
- `runAIRequest()` wrapper pattern. (portable)
- Consent + cost + circuit breaker + verifier as mandatory seams. (portable)
- Prompt versioning with commit + evals rerun. (portable)

### `langchain-architecture`
- If you use LangChain: `LangGraph StateGraph` over deprecated `initialize_agent`. (portable)
- Memory progression: `MemorySaver` (dev) → `PostgresSaver` (prod) → vector store (long-term). (portable)
- Pydantic/Zod schemas for every tool. Never trust raw model args. (portable)
- LangSmith tracing in prod. (portable)

### `billing` — money math
- Activity flagged billable/non-billable at entry; round to 0.1 h. (portable)
- Sequential invoice numbering by year. Due date auto-derived from payment terms. (portable)
- VAT (your local rate) extracted + re-calculated for cross-check. (portable)
- Templates in `public/templates/invoices/` with country-specific formats. (portable)

### `web-crawling`
- Respect robots.txt; ≥2 s between requests per domain. (portable)
- Sitemap-first; depth cap (3 default). (portable)
- Content chunks: 1000 chars, 200 overlap, hash for dedup. (portable)
- Store approved source list in config, not in code. (portable)

### `ocr-extraction`
- PDF strategy: native extraction first; fall back to rasterize-and-OCR if text is thin. (portable)
- Cloud (Google Vision / Azure) for accuracy; Tesseract for privacy/offline. (portable)
- Batch: concurrency 3, dedup by SHA-256. (portable)
- Tables: `ProcessedDocument` → `DocumentPage` → `DocumentAnalysis`. (portable)

### `legal-research` — adapt pattern, not content
- Knowledge schema: `category`, `practiceArea` (or your domain taxonomy), `embedding`. (portable pattern)
- FTS first, vector second. Ranking scoped by tenant. (portable)
- Citation parser/formatter helpers live next to the knowledge layer. (portable)

## RTL-specific, take if you need Hebrew/Arabic

### `hebrew-rtl`
- `<html lang="he" dir="rtl">` (or `ar`). Heebo primary, Inter secondary. (RTL-specific)
- Logical CSS only: `ms-*`, `me-*`, `text-start`. Ban physical props with ESLint. (RTL-specific)
- LTR islands for numbers/emails/URLs/phones: `<span dir="ltr" className="ltr tabular-nums">`. (RTL-specific)
- Directional icons flip via `transform: scaleX(-1)` scoped to `[dir="rtl"]`. (RTL-specific)
- Date format `DD.MM.YYYY`; currency stays LTR. (RTL-specific)
- Test in Chrome and Safari — they disagree on edge cases. (RTL-specific)

## Legal-domain-specific, skip or adapt

### `israeli-legal`
- Citation formats: `ע"א 1234/20 שם נ' שם, פ"ד X YYY` (case); `סעיף NNN לחוק {name}, התשXX-YYYY` (statute). (legal-specific)
- Deadline rules: 60 days defense / 15 days reply / 60 days appeal; exclude Friday-Saturday + פגרות. (legal-specific)
- Privilege detection: stop and flag if attorney-client content is detected. (legal-specific)
- IRAC method for memos; document framework scaffolded. (legal-specific)

### `legal-documents`
- Templates under `public/templates/{litigation,contracts,letters,court}/`. (legal-specific)
- Placeholders `{{client.name}}`, `{{case.number}}`. (portable pattern)
- David 12pt, 1.5 spacing, numbered paragraphs, gender agreement. (Hebrew-legal-specific)

### `claude-plugins`
- Manifest-driven plugin system. Three tiers: system / certified / community. (portable pattern, only if you want extensibility)
- Always set language context for output (`ctx.setLanguage('he')`). (RTL-specific)

## `.claude/` inventory worth replicating

On this repo:
- `.claude/agents/` — role-specific agent prompts (`billing-assistant`, `document-generator`, `legal-reviewer`, `research-assistant`).
- `.claude/settings.json` — model, system prompt, context files, RTL/language.
- (We do not yet have `commands/`, `hooks/`, or per-repo MCP entries beyond `.mcp.json` at the root. Worth adding in `lvjapp`.)

For `lvjapp`, start with:
- A `pre-commit` hook that runs typecheck + lint + a PII/secret scan.
- A `/preflight` slash command that runs `scripts/preflight.sh` and summarizes failures.
- A `/newmigration` command that scaffolds a Prisma migration with a checklist (down migration, seed update, RLS update).

## How to write a new skill

1. `skills/<name>/SKILL.md` — the top-level, 1.5–2k words. Must have: **Purpose**, **Core rules**, **Examples**, **Anti-patterns**, **References**.
2. `references/` — deeper dives loaded on demand by AI agents.
3. `scripts/` — runnable helpers (`calculate_something.ts`).
4. `assets/` — templates, sample inputs, expected outputs.

Pay the upfront cost; future you + any AI assistant working in the repo gets much sharper.
