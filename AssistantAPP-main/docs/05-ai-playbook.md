# 05 — AI Playbook

What we learned trying to make Claude useful inside a real product, not a demo.

## Shape of an AI feature

Every AI feature in `lvjapp` should expose these seams so the next person can debug, cost-control, and audit it:

```
User action
  → consent check
  → rate limit + cost ceiling
  → PII redaction (input)
  → prompt build (system + context + memory)
  → model call (streaming where possible)
  → response validation (schema / hallucination / policy)
  → PII redaction (output if persisted)
  → audit + cost log
  → user
```

No AI code path should skip any of these. Put them in a single `runAIRequest()` wrapper and make bypassing it lint-error-level annoying.

## Prompt architecture (the "4-brain" in practice)

Don't literally build four services. Build one `runAIRequest()` with four composable context providers:

- **Router** (system prompt): classifies intent, picks which context providers to load, and sets output schema.
- **Domain context**: curated knowledge base lookup (FTS or vector), scoped to the user's tenant + public items. Return top-K with citations.
- **Authoritative context** (if you care about sources): separate RAG over external sources of truth (statutes, standards, product docs). Surfaced as quotable citations.
- **User memory**: short-term window (last 10 turns verbatim) + long-term summary (rolled every 20 turns). Scoped by `clientId` — no cross-client leakage, ever. Test this explicitly.

Start with FTS for domain context (it's free and works). Upgrade to pgvector + an embedding model when: users complain about misses, cross-language retrieval becomes a requirement, or the corpus exceeds ~10k items. See `docs/KNOWN_ISSUES.md` "Knowledge search strategy" for the exact decision tree from this project.

## Model choice

- Default to the best Claude model available (we used `@ai-sdk/anthropic`). Upgrade by changing one constant; never hardcode the model ID across files.
- Keep model ID, max tokens, temperature, and top-p in one `ai/config.ts`. Changing them is one PR, not 40.
- Use streaming for anything longer than 2 seconds. Users think it's broken otherwise.
- Tool use: define tools with Zod-derived JSON schemas from `packages/schemas`. Re-validate tool arguments server-side before executing; the model is untrusted.
- Prompt caching: cache the system prompt and any large static context blocks. Measurable cost savings once you have volume.

## Per-client memory pattern

```
conversations(id, user_id, client_id, started_at, ended_at, summary_ltm)
messages(id, conversation_id, role, content, tokens, model, cost, created_at)
```

- Short-term: last N messages verbatim, filtered by conversation_id.
- Long-term: rolling summary in `summary_ltm`, regenerated every N turns. Include only facts, not transient UI state.
- On each request, load STM + LTM + current user input. Cap total context so a long conversation can't blow the budget.
- **Memory isolation test:** write an integration test that uses user A's assistant, then switches to user B, and asserts B cannot recover any of A's content.

## Guardrails we actually use

- **Consent gate:** look up `consent(user_id, purpose='ai_processing')` first. No row → 403 with clear UI.
- **Cost ceiling:** daily + monthly caps per plan tier, enforced in middleware before the model call. Return `429` with a retry-after when exceeded.
- **Circuit breaker:** `{ state: CLOSED | OPEN | HALF_OPEN, failures, openedAt }` keyed by provider. Opens after 5 consecutive failures; half-open after 60 s; closes on first success.
- **Hallucination verifier:** any response with citations goes through `verifyCitations(response, corpus)`. Each citation gets `verified | partial | missing`. UI badge reflects it. Store the verdict with the response.
- **Policy filter:** a second, cheap model call (or rule set) scans the response for policy violations (disallowed legal advice framing, PII, prompt-injection echoes). Block or warn before render.
- **Non-definitive hedging:** for any answer to a legal-style question, enforce hedging via the system prompt AND post-check with a regex / classifier that the response includes appropriate disclaimers.

## Self-learning / feedback loops — handle with care

If you store past answers to improve future answers:

1. **Redact PII before storing.** Emails, phones, IDs, names. This is where data leaks happen.
2. **Tenant-scope the memory.** Never pull one tenant's stored answer into another tenant's prompt.
3. **Label source:** "model-generated" vs "human-authored". Don't let model outputs get treated as authoritative.
4. **Opt-in, explicit consent.** Not a buried setting.
5. **Deletable.** Part of the DSR pipeline.

We underbuilt this on the first pass and it caused real privacy findings. Build it in properly or don't build it at all.

## Streaming UI

- Render first token within 500 ms of request. Show a skeleton before that.
- Provide a stop button. Tie it to the stream abort.
- Show live cost estimate (tokens in/out × configured price). Finalize on stream close. Users love this; it also catches runaway prompts.

## Observability

Log, per request:

```
trace_id, user_id, tenant_id, model, feature, tokens_in, tokens_out,
prompt_hash, cache_hit, cost, latency_ms, verdict, error?, circuit_state
```

Aggregate daily: top features by cost, top users by cost, cache hit rate, verifier pass rate, error rate per model. Alert on anomalies (cost > 1.5× trailing 7-day average; verifier pass rate drops > 10 pts).

## Evals

- **Regression fixtures:** freeze 50–200 representative inputs per feature with "acceptable output" rubrics. Run on every `main` push via a scheduled workflow.
- **Red-team prompts:** known prompt-injection attempts, PII exfiltration attempts, cross-tenant probes. Run in CI.
- **Citation verification tests:** fixture inputs with known sources; assert the citations are correct and verified.
- **Latency + cost budgets:** fail CI if p95 latency > X or average cost per request > Y.

## Things we wish we had done sooner

- Put `runAIRequest()` in place on day 1, even for a toy feature. Retrofitting guards is hard once five features go direct-to-SDK.
- Version the system prompt. Every change gets a commit + evals rerun. "Who changed the prompt?" is a real incident category.
- Build the admin view of AI traces early. It pays for itself the first time a user says "the AI said X" — you can actually check.

---

**Shortest-useful version:** all AI goes through one wrapper; always PII-redact; always cost-cap; always consent-check; always verify citations; always scope memory to tenant; always log every call. If any of those five "always" is off for even one code path, you will eventually regret it.
