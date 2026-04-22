---
domain: multi-tenancy
owner: platform-engineering
jurisdiction: n/a
confidence: draft
review_ttl: 2026-07-22
motivated_by:
  - PRD v0.3 §4.6 Multi-tenancy & data isolation
  - Decision D-019 Sprint priority (Sprint 0.5)
  - Golden Rule #9 (tenant isolation is absolute)
---

# Multi-tenancy

Single source of truth for how tenant isolation is modelled, enforced,
and tested in the LVJ AssistantApp. Every business model carries
`tenantId`; Prisma client middleware scopes reads and writes to the
caller's tenant by default, and `invoke()` checks tenant parity on every
tool call.

## Scope

- `Tenant` model + `tenantId` FK on every business row.
- Prisma client middleware for session-scoped enforcement.
- `assertTenantAccess()` helper (pairs with `assertCaseAccess()`).
- Cross-tenant access opt-in: `crossTenant: true` + audit row
  `action: cross_tenant_access`.
- Isolation test suite: adversarial matrix (tenant A queries / writes /
  deletes / exports tenant B's data through every code path).
- Tenant offboarding: GDPR Art. 20 export + verifiable deletion.

TODO: full content — patterns, code snippets, test fixtures.
