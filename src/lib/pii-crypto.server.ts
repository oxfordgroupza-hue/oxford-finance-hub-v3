import '@tanstack/react-start/server-only'

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

/**
 * Encrypt applicant identity and financial details before they enter JSONB.
 * OXFORD_PII_ENCRYPTION_KEY must be a server-only 32-byte hex key.
 */
function encryptionKey(): Buffer {
  const configured = process.env.OXFORD_PII_ENCRYPTION_KEY
  if (!configured || !/^[a-f0-9]{64}$/i.test(configured)) {
    throw new Error('Secure application storage is not configured. Please try again later.')
  }
  return Buffer.from(configured, 'hex')
}

/** Derive a separate HMAC key so fingerprint use is cryptographically domain-separated from AES encryption. */
function fingerprintKey(): Buffer {
  return createHmac('sha256', encryptionKey()).update('oxford-applicant-fingerprint-v1', 'utf8').digest()
}

/** Stable keyed fingerprint for duplicate detection without exposing low-entropy PII hashes. */
export function fingerprintApplicantData(value: Record<string, unknown>): string {
  return createHmac('sha256', fingerprintKey()).update(JSON.stringify(value), 'utf8').digest('hex')
}

/** Normalise an exact identity number before generating its non-reversible lookup fingerprint. */
export function fingerprintIdentityNumber(value: string): string {
  const normalised = value.normalize('NFKC').replace(/[\s-]/g, '').toUpperCase()
  if (normalised.length < 4 || normalised.length > 32 || !/^[A-Z0-9]+$/.test(normalised)) {
    throw new Error('Enter a valid complete ID or passport number.')
  }
  return fingerprintApplicantData({ identityNumber: normalised })
}

export function encryptApplicantData(value: Record<string, unknown>): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

/** Server-only decryption for permission-checked office document/application services. */
export function decryptApplicantData(envelope: string): Record<string, unknown> {
  const [version, ivText, tagText, payloadText] = envelope.split('.')
  if (version !== 'v1' || !ivText || !tagText || !payloadText) {
    throw new Error('The stored applicant data has an unsupported encryption format.')
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payloadText, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
  const parsed: unknown = JSON.parse(plaintext)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The stored applicant data could not be verified.')
  }
  return parsed as Record<string, unknown>
}
