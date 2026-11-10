export const MAX_FUNCTION_UPLOAD_BYTES = 4 * 1024 * 1024

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const

export type AllowedDocumentMimeType = typeof ALLOWED_DOCUMENT_MIME_TYPES[number]

export type DocumentUploadValidation = {
  applicationId: string
  documentType: string
  fileSize: number
  mimeType: string
  signature: Uint8Array
}

export function validateDocumentUpload(input: DocumentUploadValidation): string | null {
  if (!/^[0-9a-f-]{36}$/i.test(input.applicationId)) return 'A valid application is required.'
  if (!input.documentType || input.documentType.length > 40) return 'Select a valid document checklist item.'
  if (!Number.isSafeInteger(input.fileSize) || input.fileSize < 1 || input.fileSize > MAX_FUNCTION_UPLOAD_BYTES) {
    return 'Files must be between 1 byte and 4 MB for secure server-mediated uploads.'
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(input.mimeType as AllowedDocumentMimeType)) {
    return 'Only PDF, JPEG and PNG files are accepted.'
  }

  const signature = input.signature
  const validSignature = input.mimeType === 'application/pdf'
    ? String.fromCharCode(...signature.slice(0, 5)) === '%PDF-'
    : input.mimeType === 'image/jpeg'
      ? signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
      : signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47

  return validSignature ? null : 'The file contents do not match the selected file type.'
}

export function sanitizeDocumentFilename(name: string): string {
  const leafName = name.split(/[\\/]/).pop() ?? ''
  return leafName.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 100) || 'document'
}
