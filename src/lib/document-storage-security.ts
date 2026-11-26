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

/**
 * Cloudflare assigns a branch-specific workers.dev hostname to every Preview
 * deployment. Accept only hosts belonging to this exact Preview Worker service;
 * production uses a separate canonical custom domain and a separate context.
 */
export function isApprovedCloudflarePreviewRequest(requestUrl: string): boolean {
  try {
    const parsed = new URL(requestUrl)
    return parsed.protocol === 'https:' && !parsed.port && !parsed.username && !parsed.password &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*-oxford-finance-hub-v3-preview\.oxfordbusinessgroup\.workers\.dev$/.test(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

/** Accept production-only requests from the dedicated Finance Hub hostname. */
export function isApprovedCloudflareProductionRequest(requestUrl: string): boolean {
  try {
    const parsed = new URL(requestUrl)
    return parsed.protocol === 'https:' && !parsed.port && !parsed.username && !parsed.password &&
      parsed.hostname.toLowerCase() === 'finance.oxfordbusinessgroup.co.za'
  } catch {
    return false
  }
}

export function isApprovedCloudflareRuntimeRequest(requestUrl: string, context: string | undefined): boolean {
  if (context === 'cloudflare-preview') return isApprovedCloudflarePreviewRequest(requestUrl)
  if (context === 'cloudflare-production') return isApprovedCloudflareProductionRequest(requestUrl)
  return false
}
