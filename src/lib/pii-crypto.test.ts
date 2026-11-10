import { afterEach, describe, expect, it } from 'vitest'
import { decryptApplicantData, encryptApplicantData } from './pii-crypto.server'

const previousKey = process.env.OXFORD_PII_ENCRYPTION_KEY

afterEach(() => {
  if (previousKey === undefined) delete process.env.OXFORD_PII_ENCRYPTION_KEY
  else process.env.OXFORD_PII_ENCRYPTION_KEY = previousKey
})

describe('applicant PII encryption', () => {
  it('refuses to store sensitive information when the server key is missing', () => {
    delete process.env.OXFORD_PII_ENCRYPTION_KEY
    expect(() => encryptApplicantData({ idNumber: '0000000000000' })).toThrow(/not configured/)
  })

  it('encrypts and authenticates applicant data without storing plaintext', () => {
    process.env.OXFORD_PII_ENCRYPTION_KEY = 'a'.repeat(64)
    const value = { idNumber: '0000000000000', address: 'Test address', annualTurnover: '1200000' }
    const envelope = encryptApplicantData(value)
    expect(envelope).not.toContain(value.idNumber)
    expect(envelope).not.toContain(value.address)
    expect(envelope.startsWith('v1.')).toBe(true)
    expect(decryptApplicantData(envelope)).toEqual(value)
  })

  it('rejects tampered ciphertext', () => {
    process.env.OXFORD_PII_ENCRYPTION_KEY = 'b'.repeat(64)
    const envelope = encryptApplicantData({ idNumber: '0000000000000' })
    const parts = envelope.split('.')
    parts[2] = 'AAAAAAAAAAAAAAAAAAAAAA'
    expect(() => decryptApplicantData(parts.join('.'))).toThrow()
  })
})
