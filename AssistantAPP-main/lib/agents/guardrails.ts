/**
 * Post-LLM guardrail pipeline.
 * docs/AGENT_OS.md §7.2 (step list) and §8 (universal rules).
 *
 * Runs on every draft / client-facing string between the LLM response and
 * dispatch. Returns a structured GuardrailReport; callers decide whether to
 * block, redact, or require HITL. By convention:
 *   - outcomeGuaranteeHits.length > 0  → BLOCK
 *   - uplRisk == 'review_required'     → BLOCK unless a human gate covers it
 *   - piiLeaks.length > 0              → REDACT (replace) before send
 *   - bannedPhraseHits: caller-defined severity
 *
 * This module is pure TypeScript — no LLM calls. A second-pass LLM UPL
 * classifier can be plugged in by the caller via the `uplClassifier` option.
 */

export interface GuardrailOptions {
  bannedPhrases?: string[]          // agent-specific list, in addition to core
  allowedJurisdictions?: string[]   // iso country codes the firm practises in
  uplClassifier?: (text: string) => Promise<'none' | 'low' | 'review_required'>
}

export interface GuardrailReport {
  bannedPhraseHits: string[]
  outcomeGuaranteeHits: string[]
  piiLeaks: { kind: string; match: string }[]
  uplRisk: 'none' | 'low' | 'review_required'
  toneFlags: string[]
}

// Core outcome-guarantee patterns — hard blocks (§8.1 rule 2).
const OUTCOME_GUARANTEE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bwill\s+be\s+approved\b/i,          label: 'will be approved' },
  { re: /\bguaranteed\b/i,                    label: 'guaranteed' },
  { re: /\b100\s*%\s*(approval|success|sure|guarantee)\b/i, label: '100% guarantee' },
  { re: /\bcertain\s+to\s+(?:be\s+)?(?:approved|succeed|win)\b/i, label: 'certain to' },
  { re: /\bdefinitely\s+(?:get|win|approved|receive)\b/i, label: 'definitely get' },
  { re: /\bno\s+risk\b/i,                     label: 'no risk' },
  { re: /\bwill\s+(?:definitely\s+)?succeed\b/i, label: 'will succeed' },
  { re: /\bshould\s+not\s+fail\b/i,           label: 'should not fail' },
  { re: /\b100\s*%\b(?![^\s]*(?:complete|uploaded|progress))/i, label: '100%' },
]

// PII patterns — scrubbed on send and never logged raw. Not exhaustive;
// the pii-scrub worker adds contextual scrubbing.
const PII_PATTERNS: { re: RegExp; kind: string; replacement: string }[] = [
  { re: /\b[A-Z]{1,2}\d{6,9}\b/g,            kind: 'passport', replacement: '[passport-redacted]' },
  { re: /\b\d{3}-\d{2}-\d{4}\b/g,            kind: 'ssn',      replacement: '[ssn-redacted]' },
  { re: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g, kind: 'dob_iso', replacement: '[dob-redacted]' },
]

// Very rough tone check — marketing/casual signals in legal-formal output.
const TONE_SIGNALS = [
  /\bamazing\b/i,
  /\bawesome\b/i,
  /\bsuper\s+easy\b/i,
  /\btotally\b/i,
  /\b!!!+/,
]

export async function runGuardrails(
  output: string,
  options: GuardrailOptions = {},
): Promise<GuardrailReport> {
  const report: GuardrailReport = {
    bannedPhraseHits: [],
    outcomeGuaranteeHits: [],
    piiLeaks: [],
    uplRisk: 'none',
    toneFlags: [],
  }

  // Banned phrases (agent-specific).
  for (const p of options.bannedPhrases ?? []) {
    const re = new RegExp(`\\b${escapeRegex(p)}\\b`, 'i')
    if (re.test(output)) report.bannedPhraseHits.push(p)
  }

  // Outcome-guarantee scan.
  for (const { re, label } of OUTCOME_GUARANTEE_PATTERNS) {
    if (re.test(output)) report.outcomeGuaranteeHits.push(label)
  }

  // PII leak detection (for logging; caller redacts on send).
  for (const { re, kind } of PII_PATTERNS) {
    for (const m of output.matchAll(new RegExp(re.source, re.flags))) {
      report.piiLeaks.push({ kind, match: m[0] })
    }
  }

  // Tone flags.
  for (const re of TONE_SIGNALS) {
    const m = output.match(re)
    if (m) report.toneFlags.push(m[0])
  }

  // UPL classifier (optional second-pass LLM).
  if (options.uplClassifier) {
    try { report.uplRisk = await options.uplClassifier(output) }
    catch { /* classifier failure is non-fatal; leave as 'none' */ }
  }

  return report
}

/** Replace detected PII with safe tokens. Use this right before dispatch. */
export function redactPii(output: string): string {
  let out = output
  for (const { re, replacement } of PII_PATTERNS) {
    out = out.replace(new RegExp(re.source, re.flags), replacement)
  }
  return out
}

/**
 * Decision helper — is this report safe to send without HITL?
 * The calling agent's HITL gate is the final arbiter; this is a quick check.
 */
export function isBlockedBeforeSend(report: GuardrailReport): boolean {
  if (report.outcomeGuaranteeHits.length > 0) return true
  if (report.uplRisk === 'review_required') return true
  return false
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
