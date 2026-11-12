import { describe, expect, it } from 'vitest'
import { partnerApplicantIntakeInput } from './partner-intake-validation'

const valid = {
  applicantEmail: 'applicant@example.com',
  applicantType: 'individual',
  applicantName: 'Example Applicant',
  phone: '+27123456789',
  category: 'equipment',
  assetTypeId: 'd2719a42-8c6e-4e0d-94b1-6a1a54f6f111',
}

describe('partner applicant starter intake validation', () => {
  it('accepts only the minimal non-sensitive referral fields', () => {
    expect(partnerApplicantIntakeInput.safeParse(valid).success).toBe(true)
  })

  it('rejects identity, address, income and bank details from partner input', () => {
    for (const field of ['idNumber', 'residentialAddress', 'monthlyIncome', 'bankStatement']) {
      expect(partnerApplicantIntakeInput.safeParse({ ...valid, [field]: 'not-allowed' }).success).toBe(false)
    }
  })

  it('rejects invalid email, missing applicant name and invalid asset identifiers', () => {
    expect(partnerApplicantIntakeInput.safeParse({ ...valid, applicantEmail: 'invalid' }).success).toBe(false)
    expect(partnerApplicantIntakeInput.safeParse({ ...valid, applicantName: ' ' }).success).toBe(false)
    expect(partnerApplicantIntakeInput.safeParse({ ...valid, assetTypeId: 'not-a-uuid' }).success).toBe(false)
  })
})
