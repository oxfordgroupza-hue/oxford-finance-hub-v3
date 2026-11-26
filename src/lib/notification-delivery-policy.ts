import { isApprovedCloudflareRuntimeRequest } from './document-storage-security'

/** Allow transactional delivery only when the explicit flag and runtime host both match. */
export function isTransactionalEmailDeliveryEnabled(
  requestUrl: string,
  context: string | undefined,
  enabled: string | undefined,
): boolean {
  return enabled === 'true' && isApprovedCloudflareRuntimeRequest(requestUrl, context)
}
