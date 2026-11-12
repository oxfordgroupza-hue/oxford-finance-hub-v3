import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decryptApplicantData, encryptApplicantData, fingerprintApplicantData, fingerprintIdentityNumber } from './pii-crypto.server'

const originalKey = process.env.OXFORD_PII_ENCRYPTION_KEY
const testKey = 'a'.repeat(64)

describe('server-side applicant PII cryptography', () => {
  beforeEach(() => {
    process.env.OXFORD_PII_ENCRYPTION_KEY = testKey
  })

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OXFORD_PII_ENCRYPTION_KEY
    else process.env.OXFORD_PII_ENCRYPTION_KEY = originalKey
  })

  it('encrypts identity and financial fields with an authenticated envelope', () => {
    const value = {
      firstName: 'Example',
      email: 'applicant@example.com',
      idNumber: '8001015009087',
      monthlyIncome: 42000,
    }
    const envelope = encryptApplicantData(value)
    expect(envelope).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(envelope).not.toContain(value.email)
    expect(envelope).not.toContain(value.idNumber)
    expect(decryptApplicantData(envelope)).toEqual(value)
  })

  it('uses a fresh IV for each encryption of the same data', () => {
    const value = { email: 'applicant@example.com' }
    expect(encryptApplicantData(value)).not.toBe(encryptApplicantData(value))
  })

  it('creates stable keyed fingerprints without exposing the email', () => {
    const value = { email: 'applicant@example.com' }
    const fingerprint = fingerprintApplicantData(value)
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(fingerprint).not.toContain(value.email)
    expect(fingerprintApplicantData(value)).toBe(fingerprint)
    expect(fingerprintApplicantData({ email: 'other@example.com' })).not.toBe(fingerprint)
  })

  it('creates a normalised, non-reversible exact identity lookup fingerprint', () => {
    const fingerprint = fingerprintIdentityNumber('800101 5009-087')
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(fingerprintIdentityNumber('8001015009087')).toBe(fingerprint)
    expect(fingerprint).not.toContain('8001015009087')
    expect(() => fingerprintIdentityNumber('abc')).toThrow('Enter a valid complete ID or passport number.')
  })

  it('fails closed when the server-only encryption key is absent or malformed', () => {
    delete process.env.OXFORD_PII_ENCRYPTION_KEY
    expect(() => encryptApplicantData({ name: 'Example' })).toThrow('Secure application storage is not configured.')
    process.env.OXFORD_PII_ENCRYPTION_KEY = 'not-a-hex-key'
    expect(() => fingerprintApplicantData({ email: 'applicant@example.com' })).toThrow('Secure application storage is not configured.')
  })

  it('rejects tampered ciphertext instead of returning unverified plaintext', () => {
    const envelope = encryptApplicantData({ email: 'applicant@example.com' })
    const parts = envelope.split('.')
    parts[3] = parts[3].slice(0, -2) + 'AA'
    expect(() => decryptApplicantData(parts.join('.'))).toThrow()
  })
})
