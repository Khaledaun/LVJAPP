---
id: intake.skill.root
owner: founding-engineer
jurisdiction: US
service_lines: ["*"]
audience: [staff, lawyer]
tone: internal-ops
confidence: authoritative
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 60
supersedes: []
superseded_by: null
privileged: false
---

# Intake Agent — SKILL root

Binding knowledge base for `agents/intake/`. The agent retrieves from this
KB plus the Core KB; no other content is authoritative for intake output.

## Scope

- Lead → matter triage, not legal advice.
- Service-type classification over the v0.1 code vocabulary
  (see `prompts/intake/v1.md` → "Service-type vocabulary").
- Document-request starter pack generation per service type.
- Risk-flag detection that maps to typed escalation events
  (see Core KB `escalation/matrix.md`).

## Required KB content (v0.1)

- `intake/questionnaires/<service-code>.md` — per-service intake questions
  + required-doc list. Land at least: `eb5`, `o1`, `h1b`, `n400`, `i601`,
  `asylum`.
- `intake/routing-rules.md` — office and counsel assignment rules.
- `intake/duplicate-detection.md` — (email, phone) match window policy.

## Agent rules

1. Never state outcome. `eligibilityScore` is a private signal for human
   reviewers only — it must not appear in any client-facing text.
2. If service-type confidence < 0.75, return `UNKNOWN` + alternatives.
3. `riskFlags` are structured tokens (see Core escalation matrix). Do not
   emit free-form risk prose.
4. `summaryForCounsel` ≤ 120 words, factual, neutral, no advice.

## KPIs

- `lead_to_case_conversion_rate > 0.35`
- `intake_completeness_pct > 0.90`
- `time_to_first_human_touch_minutes < 60`
- `hallucination_rate_per_100_runs < 0.5`
