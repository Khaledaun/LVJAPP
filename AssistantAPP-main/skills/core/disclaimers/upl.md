---
id: core.disclaimers.upl
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

# Unauthorised Practice of Law (UPL) guardrails

**Review blocker:** this article MUST have a Portuguese-licensed
lawyer sign-off (and, for AR content, a native Arabic reviewer)
before `confidence` can be promoted to `authoritative`. The drafting
pipeline `lib/agents/guardrails.ts` already enforces the banned list
below; promoting `confidence` unlocks the phrasings marked ✅ for
unattended client send.

## Scope

Applies to every client-facing output (email, WhatsApp, SMS, voice
TTS, portal banner, PDF letter, public blog post) regardless of
channel. The scanner runs post-LLM, pre-send.

## Information vs. advice (D-006 / AGENT_OS §8.1.1)

Every output is tagged `advice_class ∈ {general_information,
firm_process, attorney_approved_advice}`.

- `general_information` — jurisdiction-agnostic facts, no guarantees.
  Example: *"D7 applications typically include proof of passive
  income."*
- `firm_process` — how LVJ handles things. Example: *"We'll request
  your Schengen history next and confirm receipt within one business
  day."*
- `attorney_approved_advice` — case-specific legal conclusion. ONLY
  a lawyer licensed in the matter's destination jurisdiction may set
  this, via the `/admin/approvals` queue.

Only `attorney_approved_advice` may leave the firm without a HITL
approval. General info and firm process can flow through automated
channels but must carry the "AI-generated — review before use"
badge (GR#7).

## Banned phrases (hard block — outcome guarantees)

Case-insensitive, word-boundary matched. A hit blocks send and
emits `drafting.banned_phrase_blocked` into the HITL queue:

- "will be approved"
- "will get approved"
- "guaranteed" (when modifying "approval", "visa", "outcome")
- "100%" (when modifying a probability claim)
- "certain to"
- "definitely get"
- "no risk"
- "will succeed"
- "can't be denied"
- "cannot be denied"
- "zero risk"
- "proved successful in every case"

## UPL risk patterns (hard block — cross-jurisdiction conclusions)

A hit sets `upl_risk = 'review_required'` and queues HITL:

- Any legal conclusion about a jurisdiction not on the firm's
  `Tenant.servedJurisdictions` list.
- Naming a specific visa type from a jurisdiction we do not serve
  without the `general_information` hedge (✅ phrasings below).
- Comparative legal advice ("you'd do better filing in Portugal
  than Spain") — always review_required.

## ✅ Approved hedging (for when a client asks a forbidden question)

When a client asks a question we cannot answer without attorney
sign-off, the drafter uses one of these responses:

> *"That's a good question — I want to make sure our
> Portuguese-licensed counsel weighs in before we commit to a
> direction. I'll flag it for them now and circle back within [SLA]."*

> *"I can share general background on that programme, but whether
> it's the right path for your specific situation is something our
> counsel would need to review. Shall we set up a short call?"*

> *"SEF/AIMA publishes the official requirements for [programme] at
> [official URL]. Your case's fit is something our Portuguese
> counsel will confirm after reviewing your documents."*

## ❌ Never do

- Quote fee structures of other firms, compare them, or speculate
  why their case went a certain way.
- Assert that "most" applications are approved (statistical
  assertions require D-008 gating + CI bound).
- Predict a specific timeline for a regulator ("SEF will respond in
  45 days" — they may or may not).
- Respond to a criminal-history disclosure in a client-facing reply
  — that triggers `escalation.criminal_history` (Critical tier).

## Arabic (D-015)

The banned-phrase list above MUST be mirrored in Arabic via
`messages/ar.json` → `drafting.banned_phrases_ar[]` (Sprint 13
deliverable). Until that mirror lands + a native AR reviewer
signs off, AR drafts from the agent are held in `PENDING_HITL`
regardless of scanner outcome.
