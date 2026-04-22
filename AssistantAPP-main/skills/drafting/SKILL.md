---
id: drafting.skill.root
owner: founding-engineer
jurisdiction: US
service_lines: ["*"]
audience: [staff, lawyer, client]
tone: legal-formal
confidence: authoritative
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 60
supersedes: []
superseded_by: null
privileged: false
---

# Drafting Agent — SKILL root

Binding knowledge base for `agents/drafting/`. Drafting owns **intent**;
channel agents (Email / WhatsApp / Voice) own delivery — never let drafting
adapt outputs to channel-specific mechanics (delivery guarantees, receipt
confirmation, call consent). Channel concerns live in those agents.

## Required KB content (v0.1)

- `drafting/templates/retainer-follow-up.md`
- `drafting/templates/document-request.md`
- `drafting/templates/welcome-email.md`
- `drafting/templates/status-update.md`
- `drafting/banned-phrases.md` — machine-readable; linter enforced.
- `drafting/clause-library.md` — approved disclaimers, hedging language,
  signature blocks.
- `drafting/channel-rules.md` — length caps, link rules, tone by channel.

## Agent rules

1. Template-first. Drafting only instantiates approved templates — no
   freeform legal prose.
2. `reviewState` is always `draft`. Only a human lawyer may flip to
   `APPROVED`.
3. Outputs are PII-scrubbed via `lib/agents/guardrails.ts#redactPii`
   before persistence and send.
4. Guardrail hard-fails (outcome guarantees / UPL review_required) open a
   HITL row via the Orchestrator; the draft is not sent.
5. Do not cite legal authority unless the authority exists in the Legal
   KB corpus and has `confidence: authoritative`.

## KPIs

- `draft_acceptance_rate > 0.80`
- `avg_edit_distance < 0.20`
- `banned_phrase_incidents_per_1000 < 1`
- `upl_review_rate < 0.10`
