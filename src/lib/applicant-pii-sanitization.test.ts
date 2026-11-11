import { describe, expect, it } from 'vitest'
import { withoutApplicantPii } from './applicant-pii-sanitization'

describe('applicant PII sanitization', () => {
  it('removes applicant identity and financial fields while preserving workflow data', () => {
    const source = {
      reference: 'OBG-APP-20261111-ABC123',
      status: 'Submitted',
      firstName: 'Example',
      email: 'applicant@example.com',
      idNumber: '8001015009087',
      annualTurnover: 1200000,
      assetDescription: 'Commercial vehicle',
    }

    expect(withoutApplicantPii(source)).toEqual({
      reference: source.reference,
      status: source.status,
      assetDescription: source.assetDescription,
    })
    expect(source.firstName).toBe('Example')
  })
})
