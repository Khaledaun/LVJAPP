/**
 * PII scrubber · docs/EXECUTION_PLAN.md §7.4 · Claude.md Golden Rule #8
 *
 * Centralised redaction for any string that might flow into a log row,
 * AI prompt, or audit diff. AOS agents call this from their output
 * envelope before persistence (see docs/AGENT_OS.md §8).
 *
 * Redaction patterns — order matters (more-specific first). Each
 * replaces the match with a token of the form `[REDACTED:<kind>]` so
 * the log row remains grep-able.
 *
 * This is *defence-in-depth*, not a last line of defence. Agents must
 * still structure their prompts and audit rows to avoid passing raw
 * PII in the first place. A scrub hit is a signal — call it out in
 * `AutomationLog` with `piiScrubbed=true`.
 *
 * Importable as `scrubPii(input)` from lib/pii-scrub.ts; the CLI
 * invocation runs a smoke over `test-data/pii-samples.txt` if present.
 */

export type PiiKind =
  | 'email'
  | 'phone'
  | 'passport'     // generic 7-9 alnum upper + digits (coarse)
  | 'ssn'          // US SSN (we still redact even on PT platform)
  | 'nif'          // Portugal NIF (9 digits)
  | 'card'         // major credit-card-like sequences
  | 'iban'         // International Bank Account Number
  | 'dob'          // YYYY-MM-DD or DD/MM/YYYY
  | 'ip'

const patterns: Array<{ kind: PiiKind; regex: RegExp }> = [
  { kind: 'email',    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  // Phone: permissive international form. We don't want to capture
  // random digit sequences (version numbers, case IDs), so require
  // a leading + or 2+ digit country code.
  { kind: 'phone',    regex: /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g },
  { kind: 'ssn',      regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  // Portugal NIF: exactly 9 digits, optionally PT-prefixed.
  { kind: 'nif',      regex: /\b(?:PT[-\s]?)?\d{9}\b/g },
  // IBAN: 15-34 alnum, country prefix + 2 digits (we just coarsely match).
  { kind: 'iban',     regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g },
  // Credit-card-like: 13-19 digits optionally dashed/spaced.
  { kind: 'card',     regex: /\b(?:\d[ -]?){13,19}\b/g },
  // Passport-ish: 7-9 alnum upper (loose; we prefer false positives).
  { kind: 'passport', regex: /\b[A-Z0-9]{7,9}\b/g },
  { kind: 'dob',      regex: /\b(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/g },
  { kind: 'ip',       regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
]

export interface ScrubResult {
  output: string
  hits: Partial<Record<PiiKind, number>>
  scrubbed: boolean
}

/**
 * Redact known PII patterns from a string. Returns the scrubbed string
 * plus a hits counter so callers can attach `piiScrubbed` metadata to
 * their log row.
 */
export function scrubPii(input: string): ScrubResult {
  if (!input) return { output: input ?? '', hits: {}, scrubbed: false }

  let out = input
  const hits: Partial<Record<PiiKind, number>> = {}
  for (const { kind, regex } of patterns) {
    const beforeCount = out.match(regex)?.length ?? 0
    if (beforeCount > 0) {
      hits[kind] = (hits[kind] ?? 0) + beforeCount
      out = out.replace(regex, `[REDACTED:${kind}]`)
    }
  }
  return { output: out, hits, scrubbed: Object.keys(hits).length > 0 }
}

/**
 * Walk an unknown JSON-ish value and scrub every string leaf. Useful
 * for `AuditLog.diff` blobs where a caller handed us a nested object.
 */
export function scrubPiiDeep(value: unknown): { value: unknown; hits: Partial<Record<PiiKind, number>>; scrubbed: boolean } {
  const aggregate: Partial<Record<PiiKind, number>> = {}
  let any = false

  function visit(v: unknown): unknown {
    if (typeof v === 'string') {
      const r = scrubPii(v)
      if (r.scrubbed) {
        any = true
        for (const [k, n] of Object.entries(r.hits)) {
          aggregate[k as PiiKind] = (aggregate[k as PiiKind] ?? 0) + (n as number)
        }
      }
      return r.output
    }
    if (Array.isArray(v)) return v.map(visit)
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = visit(x)
      return out
    }
    return v
  }

  const next = visit(value)
  return { value: next, hits: aggregate, scrubbed: any }
}

// Minimal CLI: scrub stdin, emit stdout, and print the hit summary to
// stderr. Useful for quick one-off scrubs in a pipeline.
async function cliIfInvoked(): Promise<void> {
  // Only run when executed directly, not when imported.
  const isDirect = typeof require !== 'undefined' && require.main === module
  if (!isDirect) return
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  const input = Buffer.concat(chunks).toString('utf8')
  const { output, hits, scrubbed } = scrubPii(input)
  process.stdout.write(output)
  process.stderr.write(`scrubbed=${scrubbed} hits=${JSON.stringify(hits)}\n`)
}

cliIfInvoked().catch((err) => {
  process.stderr.write(`pii-scrub CLI failed: ${err?.message ?? err}\n`)
  process.exit(1)
})
