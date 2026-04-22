import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from 'crypto'

/**
 * Document encryption for attorney-client privileged content (/vault).
 *
 * Golden Rule #8 (CLAUDE.md): documents in /vault must be encrypted at rest.
 *
 * Algorithm: AES-256-GCM (authenticated encryption).
 * Key:       DOCUMENT_ENCRYPTION_KEY env var — 32 bytes, hex-encoded (64 chars).
 *            In development, a deterministic key is derived from NEXTAUTH_SECRET
 *            so local runs work without extra setup. This MUST NOT be used in
 *            production — startup check below throws if the env is missing in prod.
 */

const ALG = 'aes-256-gcm' as const
const IV_LEN = 12           // GCM recommended IV length
const TAG_LEN = 16          // GCM auth tag length
const KEY_LEN = 32          // 256 bits

function resolveKey(): Buffer {
  const raw = process.env.DOCUMENT_ENCRYPTION_KEY
  if (raw) {
    const key = Buffer.from(raw, 'hex')
    if (key.length !== KEY_LEN) {
      throw new Error(`DOCUMENT_ENCRYPTION_KEY must be ${KEY_LEN} bytes hex (got ${key.length})`)
    }
    return key
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DOCUMENT_ENCRYPTION_KEY is required in production')
  }
  // Dev-only deterministic fallback, derived from NEXTAUTH_SECRET (or a constant).
  const seed = process.env.NEXTAUTH_SECRET || 'lvj-dev-insecure-seed'
  return createHash('sha256').update(seed).digest()
}

export interface EncryptedBlob {
  iv: string        // hex
  tag: string       // hex
  data: string      // hex
}

/** Encrypt a Buffer or string. Returns an envelope containing iv, auth tag, ciphertext. */
export function encrypt(plaintext: Buffer | string): EncryptedBlob {
  const key = resolveKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, key, iv)
  const input = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext
  const data = Buffer.concat([cipher.update(input), cipher.final()])
  const tag = cipher.getAuthTag()
  if (tag.length !== TAG_LEN) throw new Error('unexpected GCM tag length')
  return { iv: iv.toString('hex'), tag: tag.toString('hex'), data: data.toString('hex') }
}

/** Decrypt an envelope produced by encrypt(). Throws on tampering (GCM auth failure). */
export function decrypt(blob: EncryptedBlob): Buffer {
  const key = resolveKey()
  const iv = Buffer.from(blob.iv, 'hex')
  const tag = Buffer.from(blob.tag, 'hex')
  const data = Buffer.from(blob.data, 'hex')
  if (iv.length !== IV_LEN) throw new Error('invalid IV length')
  if (tag.length !== TAG_LEN) throw new Error('invalid tag length')
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()])
}

/** Convenience: encrypt a UTF-8 string and serialise as a single base64 token. */
export function sealString(plaintext: string): string {
  const { iv, tag, data } = encrypt(plaintext)
  return Buffer.from(JSON.stringify({ iv, tag, data }), 'utf8').toString('base64')
}

/** Convenience: decode a token produced by sealString. */
export function openString(token: string): string {
  const parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as EncryptedBlob
  return decrypt(parsed).toString('utf8')
}

/** Constant-time equality — use for HMAC / webhook signature verification. */
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}
