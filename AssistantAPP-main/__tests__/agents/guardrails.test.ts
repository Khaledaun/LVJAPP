/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals'
import { runGuardrails, redactPii, isBlockedBeforeSend } from '@/lib/agents/guardrails'

describe('guardrails — outcome-guarantee blocks', () => {
  const cases: string[] = [
    'Your EB-5 will be approved next month.',
    'Outcome is 100% guaranteed with our firm.',
    'You are certain to win this case.',
    'Definitely get your green card by July.',
    'There is no risk — your petition will succeed.',
    'With our help this should not fail.',
  ]
  for (const text of cases) {
    it(`blocks: ${text}`, async () => {
      const report = await runGuardrails(text)
      expect(report.outcomeGuaranteeHits.length).toBeGreaterThan(0)
      expect(isBlockedBeforeSend(report)).toBe(true)
    })
  }
})

describe('guardrails — safe hedged prose', () => {
  const cases: string[] = [
    'Your petition is now with USCIS. Typical adjudication for this category is 18–36 months, subject to review.',
    'We received your TEA letter. Thank you.',
  ]
  for (const text of cases) {
    it(`allows: ${text.slice(0, 40)}…`, async () => {
      const report = await runGuardrails(text)
      expect(report.outcomeGuaranteeHits).toEqual([])
      expect(isBlockedBeforeSend(report)).toBe(false)
    })
  }
})

describe('guardrails — banned phrases (agent-specific)', () => {
  it('flags a banned marketing phrase', async () => {
    const report = await runGuardrails('Act now to secure your consultation!', {
      bannedPhrases: ['act now'],
    })
    expect(report.bannedPhraseHits).toContain('act now')
    // agent-specific hits do NOT hard-block by default
    expect(isBlockedBeforeSend(report)).toBe(false)
  })
})

describe('guardrails — PII scrubbing', () => {
  it('detects SSN + passport + DOB', async () => {
    const text = 'SSN 123-45-6789 · Passport X1234567 · DOB 1990-05-11'
    const report = await runGuardrails(text)
    const kinds = report.piiLeaks.map(p => p.kind).sort()
    expect(kinds).toEqual(['dob_iso', 'passport', 'ssn'])
  })

  it('redactPii replaces matches with safe tokens', () => {
    const text = 'SSN 123-45-6789 and passport X1234567'
    const red = redactPii(text)
    expect(red).toContain('[ssn-redacted]')
    expect(red).toContain('[passport-redacted]')
    expect(red).not.toMatch(/\d{3}-\d{2}-\d{4}/)
  })
})

describe('guardrails — UPL classifier plug point', () => {
  it('blocks when classifier returns review_required', async () => {
    const report = await runGuardrails('You must argue that...', {
      uplClassifier: async () => 'review_required',
    })
    expect(report.uplRisk).toBe('review_required')
    expect(isBlockedBeforeSend(report)).toBe(true)
  })

  it('non-fatal when classifier throws', async () => {
    const report = await runGuardrails('Hello.', {
      uplClassifier: async () => { throw new Error('upstream down') },
    })
    expect(report.uplRisk).toBe('none')
  })
})
