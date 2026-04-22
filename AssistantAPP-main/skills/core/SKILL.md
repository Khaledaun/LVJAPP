---
id: core.skill.root
owner: founding-engineer
jurisdiction: GLOBAL
service_lines: ["*"]
audience: [lawyer, staff, client, public]
tone: internal-ops
confidence: authoritative
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 90
supersedes: []
superseded_by: null
privileged: false
---

# LVJ Core KB — SKILL root

This file is the entry point for the firm-wide Core KB. Every agent inherits
from this set. See `docs/AGENT_OS.md` §6.5 for the scope of v0.1 and the full
list of articles we must land before a workflow agent is allowed to ship.

## Articles in this KB

- `core/identity.md` — firm name, offices, service lines, hours.
- `core/roles.md` — 7-role RBAC matrix; mirrors `lib/rbac.ts`.
- `core/case-lifecycle.md` — canonical case statuses + transitions.
- `core/escalation/matrix.md` — events → role → SLA → channel.
- `core/disclaimers/upl.md` — banned phrases + required phrasings.
- `core/disclaimers/outcome.md` — no outcome guarantees.
- `core/privacy/consent.md` — per-channel consent templates.
- `core/privacy/retention.md` — data-class retention windows.
- `core/tone/legal-formal.md`
- `core/tone/empathetic-client.md`
- `core/tone/internal-ops.md`
- `core/tone/marketing.md`
- `core/languages.md` — v0.1 is EN only.

## Binding rules

1. Agents never `fs.readFile` this corpus. Retrieval is via
   `legalKb.retrieve()` (RAG) or `kb.get(id)` (exact lookup).
2. Articles with `confidence: authoritative` are the only ones eligible to
   flow into client-facing output.
3. Article YAML front-matter is mandatory; CI rejects articles missing it,
   past `reviewed_at + review_ttl_days`, or with a cycle in the supersedes
   graph.

## Staleness policy

Weekly sweep flags articles past TTL; 2× TTL downgrades `confidence` to
`draft` automatically — agents stop serving them as authoritative.

## Change control

KB edits are PRs. Front-matter diff must show a new `reviewed_at` and a
bumped `reviewed_by`. No self-review for `source_type: lawyer_memo`.
