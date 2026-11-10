import { describe, expect, it } from 'vitest'
import {
  MAX_FUNCTION_UPLOAD_BYTES,
  sanitizeDocumentFilename,
  validateDocumentUpload,
} from './document-validation'

const base = {
  applicationId: '123e4567-e89b-12d3-a456-426614174000',
  documentType: 'id',
  fileSize: 128,
}

describe('validateDocumentUpload', () => {
  it('accepts PDF, JPEG and PNG files with matching signatures', () => {
    expect(validateDocumentUpload({ ...base, mimeType: 'application/pdf', signature: new TextEncoder().encode('%PDF-1.7') })).toBeNull()
    expect(validateDocumentUpload({ ...base, mimeType: 'image/jpeg', signature: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) })).toBeNull()
    expect(validateDocumentUpload({ ...base, mimeType: 'image/png', signature: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) })).toBeNull()
  })

  it('rejects MIME types outside the allow-list', () => {
    expect(validateDocumentUpload({ ...base, mimeType: 'text/plain', signature: new Uint8Array() })).toBe('Only PDF, JPEG and PNG files are accepted.')
  })

  it('rejects spoofed MIME types and mismatched file signatures', () => {
    expect(validateDocumentUpload({ ...base, mimeType: 'application/pdf', signature: new TextEncoder().encode('not a pdf') })).toBe('The file contents do not match the selected file type.')
    expect(validateDocumentUpload({ ...base, mimeType: 'image/jpeg', signature: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) })).toBe('The file contents do not match the selected file type.')
  })

  it('rejects empty, oversized and invalid file sizes', () => {
    expect(validateDocumentUpload({ ...base, fileSize: 0, mimeType: 'application/pdf', signature: new TextEncoder().encode('%PDF-') })).toContain('between 1 byte and 4 MB')
    expect(validateDocumentUpload({ ...base, fileSize: MAX_FUNCTION_UPLOAD_BYTES + 1, mimeType: 'application/pdf', signature: new TextEncoder().encode('%PDF-') })).toContain('between 1 byte and 4 MB')
    expect(validateDocumentUpload({ ...base, fileSize: Number.NaN, mimeType: 'application/pdf', signature: new TextEncoder().encode('%PDF-') })).toContain('between 1 byte and 4 MB')
  })

  it('rejects invalid application IDs and document keys', () => {
    expect(validateDocumentUpload({ ...base, applicationId: 'not-a-uuid', mimeType: 'application/pdf', signature: new TextEncoder().encode('%PDF-') })).toBe('A valid application is required.')
    expect(validateDocumentUpload({ ...base, documentType: '', mimeType: 'application/pdf', signature: new TextEncoder().encode('%PDF-') })).toBe('Select a valid document checklist item.')
  })
})

describe('sanitizeDocumentFilename', () => {
  it('removes path separators and unsafe characters', () => {
    expect(sanitizeDocumentFilename('../../private\\identity?.pdf')).toBe('identity_.pdf')
  })

  it('limits filename length and provides a safe fallback', () => {
    expect(sanitizeDocumentFilename('a'.repeat(150))).toHaveLength(100)
    expect(sanitizeDocumentFilename('...')).toBe('document')
  })
})
