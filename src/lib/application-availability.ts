import { isApprovedCloudflareRuntimeRequest } from './document-storage-security'

export type ApplicationMode = 'preview' | 'production'

/**
 * Public application access is enabled only by an explicit server-side flag
 * on the canonical host for the current Cloudflare environment.
 */
export function getApplicationMode(
  context: string | undefined,
  requestUrl: string,
  enabled: string | undefined,
): ApplicationMode | null {
  if (enabled !== 'true' || !isApprovedCloudflareRuntimeRequest(requestUrl, context)) return null
  if (context === 'cloudflare-preview') return 'preview'
  if (context === 'cloudflare-production') return 'production'
  return null
}
