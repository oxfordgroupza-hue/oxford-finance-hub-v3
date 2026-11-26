export const EXPECTED_DOCUMENT_BUCKET = 'oxford-customer-documents'
export const EXPECTED_PREVIEW_DOCUMENT_BUCKET = 'oxford-preview-documents'
export const MAX_BUCKET_FILE_BYTES = 10 * 1024 * 1024
export const MAX_PREVIEW_BUCKET_FILE_BYTES = 4 * 1024 * 1024
export const ALLOWED_DOCUMENT_STORAGE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

export function getDocumentStoragePolicy(context: string | undefined) {
  if (context === 'cloudflare-preview') {
    return { bucket: EXPECTED_PREVIEW_DOCUMENT_BUCKET, maxFileBytes: MAX_PREVIEW_BUCKET_FILE_BYTES }
  }
  if (context === 'cloudflare-production') {
    return { bucket: EXPECTED_DOCUMENT_BUCKET, maxFileBytes: MAX_BUCKET_FILE_BYTES }
  }
  return null
}

export type StorageBucketDetails = {
  id?: unknown
  public?: unknown
  file_size_limit?: unknown
  allowed_mime_types?: unknown
}

export function isStorageBucketVerified(
  details: StorageBucketDetails,
  expectedBucket = EXPECTED_DOCUMENT_BUCKET,
  maxFileBytes = MAX_BUCKET_FILE_BYTES,
): boolean {
  const allowedTypes = Array.isArray(details.allowed_mime_types) ? details.allowed_mime_types : []
  return details.id === expectedBucket &&
    details.public === false &&
    Number(details.file_size_limit) === maxFileBytes &&
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

const APPROVED_CLOUDFLARE_PREVIEW_HOSTS = new Set([
  'oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev',
  'work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev',
  'recovery-import-verified-baseline-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev',
  'release-v3-production-2026-11-25-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev',
  'launch-v3-reconciled-2026-11-26-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev',
])

function isApprovedHttpsHost(requestUrl: string, hostname: string): boolean {
  try {
    const parsed = new URL(requestUrl)
    return parsed.protocol === 'https:' && !parsed.port && !parsed.username && !parsed.password &&
      parsed.hostname.toLowerCase() === hostname
  } catch {
    return false
  }
}

export function isApprovedCloudflarePreviewRequest(requestUrl: string): boolean {
  try {
    const parsed = new URL(requestUrl)
    return parsed.protocol === 'https:' && !parsed.port && !parsed.username && !parsed.password &&
      APPROVED_CLOUDFLARE_PREVIEW_HOSTS.has(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

export function isApprovedCloudflareProductionRequest(requestUrl: string): boolean {
  return isApprovedHttpsHost(requestUrl, 'finance.oxfordbusinessgroup.co.za')
}

export function isApprovedCloudflareRuntimeRequest(requestUrl: string, context: string | undefined): boolean {
  if (context === 'cloudflare-preview') return isApprovedCloudflarePreviewRequest(requestUrl)
  if (context === 'cloudflare-production') return isApprovedCloudflareProductionRequest(requestUrl)
  return false
}
