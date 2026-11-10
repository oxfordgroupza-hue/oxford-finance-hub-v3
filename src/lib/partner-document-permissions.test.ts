import { describe, expect, it } from 'vitest'
import { isPartnerDocumentTypeAllowed } from './partner-document-permissions'

describe('partner document upload permissions', () => {
  it('always allows a supplier quotation for the partner own referral', () => {
    expect(isPartnerDocumentTypeAllowed('quote', false)).toBe(true)
    expect(isPartnerDocumentTypeAllowed('quote', true)).toBe(true)
  })

  it('allows supplier contracts and motivation only when Super Admin enables the partner', () => {
    for (const type of ['contracts', 'motivation']) {
      expect(isPartnerDocumentTypeAllowed(type, false)).toBe(false)
      expect(isPartnerDocumentTypeAllowed(type, true)).toBe(true)
    }
  })

  it('never allows applicant identity, address, income or bank documents', () => {
    for (const type of ['id', 'address', 'bank', 'payslips', 'cipc', 'directors-id', 'afs', 'resolution']) {
      expect(isPartnerDocumentTypeAllowed(type, false)).toBe(false)
      expect(isPartnerDocumentTypeAllowed(type, true)).toBe(false)
    }
  })

  it('rejects unknown and empty document types', () => {
    expect(isPartnerDocumentTypeAllowed('unknown', true)).toBe(false)
    expect(isPartnerDocumentTypeAllowed('', true)).toBe(false)
  })
})
