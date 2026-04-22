/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals'
import { encrypt, decrypt, sealString, openString, constantTimeEqual } from '@/lib/crypto'

describe('lib/crypto — AES-256-GCM document encryption', () => {
  it('round-trips a UTF-8 string through encrypt/decrypt', () => {
    const plaintext = 'Attorney-client privileged: EB-5 investor declaration.'
    const blob = encrypt(plaintext)
    expect(blob.iv).toMatch(/^[0-9a-f]{24}$/)
    expect(blob.tag).toMatch(/^[0-9a-f]{32}$/)
    expect(blob.data).toMatch(/^[0-9a-f]+$/)
    expect(decrypt(blob).toString('utf8')).toBe(plaintext)
  })

  it('produces a fresh random IV for each encryption', () => {
    const a = encrypt('same secret')
    const b = encrypt('same secret')
    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
  })

  it('rejects ciphertext tampering (GCM auth tag must match)', () => {
    const blob = encrypt('do not tamper')
    // Flip a byte in the ciphertext
    const tampered = {
      ...blob,
      data: blob.data.replace(/^./, c => (c === '0' ? '1' : '0')),
    }
    expect(() => decrypt(tampered)).toThrow()
  })

  it('sealString / openString round-trip via a single base64 token', () => {
    const token = sealString('case-file-12345')
    expect(openString(token)).toBe('case-file-12345')
  })

  it('constantTimeEqual matches identical strings and rejects different-length', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true)
    expect(constantTimeEqual('abc', 'abd')).toBe(false)
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
  })
})
