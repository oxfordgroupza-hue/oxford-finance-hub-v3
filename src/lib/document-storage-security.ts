export const EXPECTED_DOCUMENT_BUCKET = 'oxford-customer-documents'
export const MAX_BUCKET_FILE_BYTES = 10 * 1024 * 1024
export const ALLOWED_DOCUMENT_STORAGE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

export type StorageBucketDetails = {
  id?: unknown
  public?: unknown
  file_size_limit?: unknown
  allowed_mime_types?: unknown
}

export function isStorageBucketVerified(details: StorageBucketDetails): boolean {
  const allowedTypes = Array.isArray(details.allowed_mime_types) ? details.allowed_mime_types : []
  return details.id === EXPECTED_DOCUMENT_BUCKET &&
    details.public === false &&
    Number(details.file_size_limit) === MAX_BUCKET_FILE_BYTES &&
    ALLOWED_DOCUMENT_STORAGE_TYPES.length === allowedTypes.length &&
    ALLOWED_DOCUMENT_STORAGE_TYPES.every((type) => allowedTypes.includes(type))
}

export type NetlifyRuntimeContext = {
  site?: { id?: string }
  deploy?: { context?: string }
}

export function isApprovedDeployPreviewRequest(
  requestUrl: string,
  context: NetlifyRuntimeContext | undefined,
  expectedSiteId: string,
): boolean {
  let hostname: string
  try {
    const parsed = new URL(requestUrl)
    if (parsed.protocol !== 'https:' || parsed.port || parsed.username || parsed.password) return false
    hostname = parsed.hostname.toLowerCase()
  } catch {
    return false
  }
  return Boolean(expectedSiteId) &&
    context?.site?.id === expectedSiteId &&
    context?.deploy?.context === 'deploy-preview' &&
    /^deploy-preview-\d+--[a-z0-9-]+\.netlify\.app$/.test(hostname)
}
