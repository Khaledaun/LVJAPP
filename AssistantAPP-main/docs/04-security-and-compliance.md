# 04 — Security & Compliance

This project handled legal-privileged data in Israel. Even if `lvjapp` is in a different domain, the patterns below are worth stealing — most are domain-agnostic.

## Baseline controls (day-1 must-haves)

- **Auth:** Supabase Auth with email+password and OAuth where needed. Passwords via provider (bcrypt/argon2); never roll your own.
- **Session:** HTTP-only, `Secure`, `SameSite=Lax` cookies. Short access token, refresh token rotated on use.
- **2FA:** TOTP. Enforce for admin-tier routes. Store a "2FA-elevated" claim in the session; middleware checks it on sensitive endpoints.
- **CSRF:** double-submit cookie or synchronizer token. **No content-type exemption.** JSON POSTs are still CSRF-guarded.
- **Input validation:** every API route runs `schema.safeParse(body)` using the shared Zod schema from `packages/schemas`.
- **Output encoding:** React handles most of this; sanitize HTML if you ever render user-authored HTML (DOMPurify on the server before storing).
- **Rate limiting:** Upstash Redis in prod. Key by user ID first, IP second. Take the **rightmost** `X-Forwarded-For` entry or prefer `x-real-ip`.
- **Secrets:** env vars only. Never in source. Service-role Supabase key is server-only — route handlers/edge functions, not client.
- **CORS:** allowlist, not wildcard. Only your own origins.
- **Security headers:** CSP (report-only first, enforce after a week of clean reports), HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying what you don't need.

## Authorization

- **Centralized:** `requireAuth()`, `requireRole(role)`, `requireOwnership(entity, userId)` from `packages/auth`. Every route calls one of these.
- **RLS on every user-data table.** The app assumes RLS is on; raw service-role bypass is the exception, tightly scoped and logged.
- **Principle of least privilege** for keys: separate anon key (client), service role (server, admin-only), restricted publishable keys for specific operations.
- **Cron/admin endpoints:** `CRON_SECRET` header check in middleware; 401 at the edge if missing or wrong.

## Audit logging (do this on day 1)

Every mutation writes a row:

```ts
// packages/audit/audit.ts
type AuditEntry = {
  userId: string | null
  action: 'create' | 'update' | 'delete' | 'read-sensitive' | string
  entity: string         // e.g. 'Client', 'Case'
  entityId: string
  before: Json | null
  after: Json | null
  classification: 'public' | 'internal' | 'confidential' | 'restricted'
  ip: string
  sessionId: string | null
  userAgent: string
  createdAt: Date
}
```

- Immutable (append-only table; no `UPDATE` grants).
- Classification drives retention and who can read it.
- Sensitive reads (export, admin view of another user's data) also get logged.
- Retained long enough to cover the privacy regime you're under. Israeli Amendment 13 implies 7-year retention for records related to personal-data processing.

## PII & privacy

- **Data inventory:** one doc mapping every table/column to a classification (`public` / `internal` / `confidential` / `restricted`) and a retention period. Keep it in `docs/DATA_INVENTORY.md`.
- **Consent gating:** explicit consent per purpose (analytics, AI processing, marketing). Default off. Store in a dedicated table; check before every use. We retrofitted this as `PRIV-03` — painful.
- **Right to deletion (DSR):** a single function that deletes / anonymizes the user across every table, including backups' next cycle. We hit gaps here (`PRIV-02`). Ship the DSR function early.
- **PII redaction before AI:** any text that will hit an LLM with retention must be pre-scrubbed. Emails, phones, national IDs, case numbers, addresses, names. Keep a shared regex pack in `packages/utils/pii.ts`.
- **Breach notification:** 72-hour window (Amendment 13; similar to GDPR). Pre-draft the notice template. Pre-list the regulator contact.

## AI-specific guardrails

- **Consent + purpose limitation:** store "may I use AI on this user's data for purpose X" as a signed consent record. Deny the call otherwise.
- **Cost ceiling:** daily + monthly spend caps per tier. Middleware rejects with `429`/`402` when exceeded; surfaces a clear message.
- **Circuit breaker:** N consecutive provider errors → breaker opens; serve "AI temporarily unavailable, your data is safe"; half-open on a timer.
- **Hallucination detection:** every response that cites a source goes through a verifier (does the source exist? does the cited section match?). Surface a green/yellow/red badge to the user. Never silently "trust the model".
- **PII redaction on both sides** (input to the LLM, output stored to memory).
- **No cross-tenant memory leak:** per-user/per-client memory scoping. Test this with a dedicated assertion.
- **Prompt injection handling:** treat model output as untrusted. Never execute tool calls based on raw model output without server-side re-validation.
- **Model / prompt / response logging:** store `model`, `prompt_hash`, `tokens_in`, `tokens_out`, `cost`, `latency`, `user_id`, `trace_id`. Useful for both cost and safety postmortems.

## Common OWASP traps we hit

- **A01 Broken access control** — centralize `requireAuth`/`requireRole`; don't trust `user.role` from the client.
- **A02 Cryptographic failures** — never hand-roll crypto; use `crypto.randomUUID`, Argon2 via provider, AES-256-GCM for at-rest app-layer encryption.
- **A03 Injection** — parameterized queries via Prisma; never string-concat SQL; sanitize HTML before storing rich text.
- **A05 Security misconfiguration** — CSP report-only → enforce; disable `x-powered-by`; verify `NODE_ENV=production` in prod build.
- **A07 Auth failures** — 2FA elevation for admin actions; session fixation prevention (rotate on login); short-lived tokens.
- **A09 Logging failures** — structured JSON logs, include `request_id`; no PII in logs; retention policy.

## Compliance shape (tailor to your jurisdiction)

- **Israeli Privacy Law Amendment 13 (2024)** — applies if you process personal data on Israeli residents: lawful basis, DSR, breach reporting, DPO for higher-risk processing, documented security program. This is what drove most of our policy.
- **GDPR** — if any EU users: same muscle group, slightly different paperwork.
- **SOC 2 Type II** — if you'll sell to enterprise: plan the controls now (audit log, backups, access reviews, SDL) so the audit is a documentation exercise, not a re-engineering exercise.

## Pentest / SDL cadence

- **Static analysis** in CI (ESLint security rules, `pnpm audit`, Semgrep if you can).
- **Dependency updates** weekly via Dependabot/Renovate; auto-merge low-risk.
- **Secret scanning** on push (GitHub native + Gitleaks).
- **External pentest** before first enterprise sale; yearly after. See `docs/PENTEST_GUIDE.md` for scope.
- **Red team of one:** every quarter, spend a day trying to break your own product. Cheaper than the real thing.

---

**Shortest-useful version of this page:** central `requireAuth`, RLS everywhere, audit-log every mutation, CSRF with no exemptions, rate-limit on rightmost XFF, PII-scrub before any LLM call, cost ceiling + circuit breaker on AI routes, and a DSR function that really deletes the user.
