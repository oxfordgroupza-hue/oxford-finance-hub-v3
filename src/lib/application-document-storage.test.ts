import { describe, expect, it } from 'vitest'
import {
  applicantStoragePrefix,
  applicationDocumentStoragePath,
  documentStorageCategory,
  BUSINESS_DOCUMENT_FOLDERS,
  INDIVIDUAL_DOCUMENT_FOLDERS,
  sanitizeStorageFolderName,
} from './application-document-storage'

describe('application document storage layout', () => {
  it('creates separate Individual and Business applicant folders with references', () => {
    expect(applicantStoragePrefix({ applicantType: 'individual', applicantName: 'Ada Lovelace', applicationReference: 'OBG-261111-ABC123' }))
      .toBe('Individual/Ada Lovelace - OBG-261111-ABC123')
    expect(applicantStoragePrefix({ applicantType: 'business', applicantName: 'Oxford Trading (Pty) Ltd', applicationReference: 'OBG-261111-XYZ789' }))
      .toBe('Business/Oxford Trading (Pty) Ltd - OBG-261111-XYZ789')
  })

  it('maps uploaded checklist items into the required folders', () => {
    expect(documentStorageCategory('id')).toBe('identity')
    expect(documentStorageCategory('directors-id')).toBe('identity')
    expect(documentStorageCategory('address')).toBe('proof-of-address')
    expect(documentStorageCategory('bank')).toBe('income-bank-statements')
    expect(documentStorageCategory('cipc')).toBe('business-documents')
    expect(documentStorageCategory('quote')).toBe('quotations')
    expect(documentStorageCategory('motivation')).toBe('additional-documents')
    expect(documentStorageCategory('unexpected')).toBe('additional-documents')
  })

  it('includes the requested folder set for each applicant type', () => {
    expect(INDIVIDUAL_DOCUMENT_FOLDERS).toContain('application-pdf')
    expect(INDIVIDUAL_DOCUMENT_FOLDERS).not.toContain('business-documents')
    expect(BUSINESS_DOCUMENT_FOLDERS).toContain('business-documents')
  })

  it('removes path traversal and unsafe filename characters', () => {
    expect(sanitizeStorageFolderName('../../Ada/../Lovelace')).toBe('Ada Lovelace')
    expect(applicationDocumentStoragePath({
      applicantType: 'individual', applicantName: 'Ada Lovelace', applicationReference: 'OBG-123',
      documentType: 'id', fileName: '../../identity scan.pdf',
    })).toBe('Individual/Ada Lovelace - OBG-123/identity/identity-scan.pdf')
  })
})
