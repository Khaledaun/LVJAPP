---
domain: availability
owner: platform-engineering
jurisdiction: n/a
confidence: draft
id: availability.skill.root
reviewed_at: 2026-04-22
review_ttl_days: 90
review_ttl: 2026-07-22
motivated_by:
  - Decision D-014 Quiet hours = per-provider availability
  - PRD v0.3 §4.3 (consent + quiet hours)
---

# Availability & Quiet Hours

Per-actor availability schedules respected by the lead-routing and
outbound-dispatcher pipelines. Per-recipient quiet hours (`Client`) are
separate from per-actor availability (`ServiceProvider`, `TeamMember`).

## Scope

- **`ServiceProvider.availabilityWindows`** — JSON (days of week +
  start / end in provider's local TZ). Platform default fallback:
  **21:00–08:00 client-local** quiet hours (per D-014).
- **`TeamMember.availabilitySchedule`** — analogous; used by
  orchestrator when routing HITL queue items.
- **`Client.quietHoursOverride`** — per-client override (nullable);
  respects client's expressed preference over provider's.
- **Lead-routing windows.** Orchestrator suppresses non-pager outbound
  to clients managed by a provider during that provider's off-hours.
- **Pager override.** HITL critical tier (D-013) ignores quiet hours —
  15-min SLA takes precedence.
- **`lib/scheduling.ts`** checks all three before dispatch.

TODO: full content — timezone handling, DST edge cases, override
precedence table.
