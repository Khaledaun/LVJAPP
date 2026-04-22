/**
 * Sprint 0.7-bis · PII scrubber unit coverage.
 *
 * Exercised from agents / audit callers via scrubPii / scrubPiiDeep.
 * Every pattern should be caught even in narrative prose.
 */

import { scrubPii, scrubPiiDeep } from '../scripts/pii-scrub'

describe('scrubPii · primitives', () => {
  it('redacts email addresses', () => {
    const r = scrubPii('Contact jane.doe@example.co.uk about the case.')
    expect(r.scrubbed).toBe(true)
    expect(r.output).toContain('[REDACTED:email]')
    expect(r.output).not.toContain('jane.doe@example.co.uk')
  })

  it('redacts international phone numbers', () => {
    const r = scrubPii('Call +351 912 345 678 or (+971) 50 123 4567')
    expect(r.scrubbed).toBe(true)
    expect(r.hits.phone).toBeGreaterThanOrEqual(1)
  })

  it('redacts US SSN', () => {
    const r = scrubPii('SSN on file is 123-45-6789')
    expect(r.hits.ssn).toBe(1)
    expect(r.output).toContain('[REDACTED:ssn]')
  })

  it('redacts Portugal NIF', () => {
    const r = scrubPii('NIF 123456789 was provided by the client')
    expect(r.hits.nif).toBeGreaterThanOrEqual(1)
  })

  it('redacts IBAN', () => {
    const r = scrubPii('Transfer to PT50000201231234567890154')
    expect(r.hits.iban).toBe(1)
  })

  it('returns input unchanged when nothing matches', () => {
    const r = scrubPii('No PII in this sentence.')
    expect(r.scrubbed).toBe(false)
    expect(r.output).toBe('No PII in this sentence.')
    expect(r.hits).toEqual({})
  })

  it('handles empty input', () => {
    const r = scrubPii('')
    expect(r.output).toBe('')
    expect(r.scrubbed).toBe(false)
  })

  it('tracks multiple hits of the same kind', () => {
    const r = scrubPii('Emails: a@b.com, c@d.org, e@f.net')
    expect(r.hits.email).toBe(3)
  })
})

describe('scrubPiiDeep · nested values', () => {
  it('walks object trees and scrubs every string leaf', () => {
    const r = scrubPiiDeep({
      subject: 'Welcome',
      to: 'jane@example.com',
      body: 'Your SSN 123-45-6789 is on file.',
      meta: { sender: 'noreply@lvj.law', nested: { ip: '10.0.0.1' } },
    })
    const v = r.value as any
    expect(r.scrubbed).toBe(true)
    expect(v.to).toBe('[REDACTED:email]')
    expect(v.body).toContain('[REDACTED:ssn]')
    expect(v.meta.sender).toBe('[REDACTED:email]')
    expect(v.meta.nested.ip).toBe('[REDACTED:ip]')
    expect(r.hits.email).toBeGreaterThanOrEqual(2)
  })

  it('walks arrays', () => {
    const r = scrubPiiDeep(['a@b.com', { inner: '+351 912 000 000' }, 42, null])
    const v = r.value as any[]
    expect(v[0]).toBe('[REDACTED:email]')
    expect(v[1].inner).toContain('[REDACTED:phone]')
    expect(v[2]).toBe(42)
    expect(v[3]).toBeNull()
  })

  it('returns scrubbed=false when nothing matched anywhere', () => {
    const r = scrubPiiDeep({ a: 'hello', b: [1, 2, 3] })
    expect(r.scrubbed).toBe(false)
  })
})
