---
id: core.tone.internal-ops
owner: founding-engineer
jurisdiction: GLOBAL
service_lines: ["*"]
audience: [lawyer, staff]
tone: internal-ops
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 180
supersedes: []
superseded_by: null
privileged: false
---

# Tone: internal-ops

Used for: staff-only Slack-ish messages, HITL summaries, escalation
pages, internal notes on Cases.

## Voice

- Tight. Bullets over prose.
- Assume the reader knows the file number and is mid-triage.
- Always start with the thing that requires action.
- Use code-style for IDs (`LVJ-2026-0123`), dates (`2026-04-22`),
  file paths (`/vault/providers/p-17/contract.pdf`).

## Template: HITL summary (Intake → Case)

```
[LVJ-2026-0091] Intake — Marta S., D7 (PT)
Eligibility: 0.72   Risk flags: [prior_refusal, inconsistent_identity]
Escalation: prior_refusal (Urgent, 1h SLA)
Docs submitted: passport, bank-90d, proof-of-address
Missing: SEF-criminal-check, tax-residency-last-3y
Summary for counsel: attached below.
Action: approve case creation | reject & archive
```

## Template: Deadline page

```
[LVJ-2026-0104] DEADLINE T-72h — SEF filing window
Client: Ahmed K. (prefers AR)
Assignee: Ana B. (lisbon-office)
Blocker: bank-verification-letter missing
Last-contact: 2026-04-20 17:00Z
Action: call Ahmed on AR voice (quiet-hours clear until 20:00Z)
```

## Anti-patterns

- ❌ Narrative retelling of the case history (that's the Case timeline).
- ❌ Emojis (Slack-style OK in Slack itself; not in HITL UI text).
- ❌ Verbatim quotes of privileged client statements unless material.
