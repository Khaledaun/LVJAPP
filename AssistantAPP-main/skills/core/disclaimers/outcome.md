---
id: core.disclaimers.outcome
owner: founding-engineer
jurisdiction: [PT, AE, GLOBAL]
service_lines: ["*"]
audience: [lawyer, staff, client, public]
tone: legal-formal
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 90
supersedes: []
superseded_by: null
privileged: false
---

# Outcome-guarantee hedging

Pairs with `core/disclaimers/upl.md` (which lists the banned
phrases). This article gives the **approved substitutions** — what
the drafter swaps in when a banned phrase would have landed.

**Review blocker:** lawyer sign-off required before promoting
`confidence` to `authoritative`.

## General principle

LVJ never guarantees an outcome. We can speak to:
- What a programme *requires* (from regulator-published sources).
- What our *process* looks like.
- Factors that *influence* an application's strength (without
  promising the result).

We cannot guarantee approval, predict a decision window, or claim
a "success rate" without the D-008 statistical gating (staff-internal
≥ 50 cases; client-facing ≥ 200 cases + CI ≤ ±15%).

## Banned → approved substitutions

| Banned phrase | Approved substitution |
|---|---|
| "Your visa will be approved" | "Your application meets the published eligibility criteria for [programme]." |
| "We guarantee approval" | "We prepare the strongest possible application; the final decision rests with SEF/AIMA." |
| "100% success rate" | "LVJ maintains an internal outcome log; specific numbers are shared case-by-case with our counsel." |
| "You will definitely get the Golden Visa" | "Based on the documents you've shared, a Golden Visa pathway appears feasible. Counsel will confirm after review." |
| "No risk" | "Every application carries regulatory risk; we mitigate known risks by [specific process]." |
| "SEF always approves these" | "SEF publishes decision statistics annually; our counsel can walk you through the 2025 breakdown." |

## Approved phrasings for probability conversations

Clients ask "what are my chances?" at intake and again after
document review. The Drafting agent never emits a raw probability
number without (a) the D-008 gate and (b) a lawyer having approved
the specific case's assessment. Use:

> *"Your documents tick the eligibility boxes published by SEF. The
> remaining risk factors are [list]; our counsel reviews those before
> we file."*

> *"I can't give you a percentage here — that would depend on
> patterns our counsel reviews individually. I've asked [name of
> lawyer] to look at your profile and share a gut feeling on a
> short call."*

> *"Our internal outcome log shows [programme] has a strong approval
> track record in profiles similar to yours, but every case turns
> on its specific facts."*

## When the client explicitly asks for a guarantee

Scripted handoff:

> *"I understand the certainty you're looking for — and to be clear,
> no immigration firm can guarantee a specific outcome. What we can
> do is minimise the known risks by [process]. If you'd like, I can
> schedule a 15-minute call with our counsel to walk through the
> specific risk profile of your case."*

This response routes the case into `escalation.distressed_client`
if the client pushes back three or more times (signals they may be
under pressure to relocate under a false promise from a competitor).

## Scanner contract

`lib/agents/guardrails.ts` matches the banned list in
`core/disclaimers/upl.md` and, on a hit:
1. Looks up the banned phrase in the substitution table above.
2. If a substitution is available AND the drafter's temperature was
   ≥ 0.3, attempts a re-draft with the substitution inserted.
3. Otherwise blocks and opens a HITL with the `guardrailReport`
   showing the hit.

Nothing auto-sends when any outcome-guarantee hit lands, even after
substitution — all substitutions surface to HITL for a lawyer sign-off
on first land.
