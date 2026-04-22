---
domain: onboarding
owner: platform-admin
jurisdiction: n/a
confidence: draft
review_ttl: 2026-07-22
motivated_by:
  - PRD v0.3 §3.1 goal 8 (self-serve onboarding)
  - PRD v0.3 §5.7 (new tenant time-to-onboard < 24h)
  - Decision D-019 Sprint priority (Sprint 8.5)
  - Decision D-016 Stripe Connect from day 1
---

# Self-serve Onboarding

Tenant + provider onboarding wizard. Target: **tenant #2 onboardable in
< 24h, fully self-serve** (PRD §3.1 goal 8; surfaced as metric in §5.7).

## Scope

- **Tenant signup.** Firm details, primary jurisdiction, contract
  acceptance (machine-readable fields + signed PDF into
  `/vault/tenants/<tenantId>/`).
- **Provider signup.** Category selection, credential upload
  (license / insurance), Stripe Connect Express onboarding per D-016.
- **Verification step.** Platform-Admin verification gate before the
  provider can receive LVJ-routed leads. Trial period before public
  directory eligibility (Risk R15 mitigation).
- **`OnboardingProgress`** row tracks wizard state per tenant /
  provider; resumable from any device.
- **Self-serve contract acceptance.** Machine-readable fields
  (`commissionPct = 25%` per D-007, `freeUntilDate` per D-009, `slaTier`,
  `exclusivity`, `disputeClause`, `terminationClause`) on the contract
  row; PDF in vault.
- **Locale.** Wizard EN + AR per D-015.

TODO: full content — credential-verification heuristics, Stripe Connect
Express flow, contract template.
