export const MAX_FUNCTION_UPLOAD_BYTES = 4 * 1024 * 1024
// Allow bounded multipart fields and headers around the single 4 MB document.
export const MAX_DOCUMENT_REQUEST_BYTES = MAX_FUNCTION_UPLOAD_BYTES + 128 * 1024

export function validateDocumentRequestContentLength(contentLength: string | null): string | null {
  if (contentLength === null) return null
  if (!/^[0-9]+$/.test(contentLength)) return 'The upload request has an invalid content length.'
  const requestBytes = Number(contentLength)
  if (!Number.isSafeInteger(requestBytes) || requestBytes < 1) return 'The upload request has an invalid content length.'
  if (requestBytes > MAX_DOCUMENT_REQUEST_BYTES) return 'The upload request exceeds the secure upload limit.'
  return null
}

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

export function validateDocumentFileSize(fileSize: number): string | null {
  if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_FUNCTION_UPLOAD_BYTES) {
    return 'Files must be between 1 byte and 4 MB for secure server-mediated uploads.'
  }
  return null
}

export function validateDocumentUpload(input: DocumentUploadValidation): string | null {
  if (!/^[0-9a-f-]{36}$/i.test(input.applicationId)) return 'A valid application is required.'
  if (!input.documentType || input.documentType.length > 40) return 'Select a valid document checklist item.'
  const sizeError = validateDocumentFileSize(input.fileSize)
  if (sizeError) return sizeError
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


/**
 * Reads multipart bodies under a strict byte ceiling before parsing them.
 * This protects requests that omit Content-Length (for example, streamed HTTP/2 bodies).
 */
export async function parseBoundedDocumentFormData(request: Request): Promise<FormData> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    throw new Error('The upload request must use multipart form data.')
  }
  if (!request.body) throw new Error('The upload request is empty.')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_DOCUMENT_REQUEST_BYTES) {
        await reader.cancel()
        throw new RangeError('The upload request exceeds the secure upload limit.')
      }
      chunks.push(value)
    }
  } catch (error) {
    try { await reader.cancel() } catch { /* The stream may already be closed. */ }
    throw error
  }

  const body = new Blob(chunks, { type: contentType })
  return await new Response(body, { headers: { 'content-type': contentType } }).formData()
}
