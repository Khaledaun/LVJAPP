---
domain: cost-guard
owner: platform-engineering
jurisdiction: n/a
confidence: draft
id: cost-guard.skill.root
reviewed_at: 2026-04-22
review_ttl_days: 90
review_ttl: 2026-07-22
motivated_by:
  - Decision D-012 LLM cost caps
  - PRD v0.3 §4.5 Operational & cost
---

# Cost Guard

Per-scope LLM / automation cost enforcement. `services/cost-guard.ts`
reads the rolling 24h `AutomationLog.costUsd` sum per scope; emits
`cost.threshold.warn` and `cost.threshold.pause` events.

## Scope

- **Caps (D-012):**

  | Scope              | Soft (warn + pause non-critical) | Hard (pause all) |
  |--------------------|----------------------------------|------------------|
  | Per tenant         | $50/day                          | $100/day         |
  | Platform marketing | $30/day                          | $75/day          |
  | Platform-wide      | —                                | **$200/day**     |

- **Reset** UTC midnight. **Override** Platform Admin only,
  audit-logged with reason (`AuditLog action: cost_cap_override`).
- **Agent classification.** `critical` agents (`deadline`,
  `orchestrator`, `hitl-gate`) bypass the soft-cap freeze; everything
  else pauses until the window resets.
- **Breach event.** `cost.threshold.pause` halts agent subscribe /
  invoke; surfaces on `/platform/health` + pages the Platform Admin at
  hard-cap breach.
- **Per-tenant + platform enforcement** (not one or the other).

TODO: full content — cap overrides, per-agent classification table,
runbook for a breach.
