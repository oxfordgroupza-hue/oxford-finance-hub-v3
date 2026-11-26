import { isApprovedCloudflarePreviewRequest, isApprovedCloudflareProductionRequest } from './document-storage-security'

export function isNotificationDeliveryEnabled(input: {
  requestUrl: string
  context: string | undefined
  emailDeliveryEnabled: string | undefined
  notificationDeliveryEnabled: string | undefined
}): boolean {
  if (input.context === 'cloudflare-preview') {
    return isApprovedCloudflarePreviewRequest(input.requestUrl) && input.emailDeliveryEnabled === 'true'
  }
  if (input.context === 'cloudflare-production') {
    return isApprovedCloudflareProductionRequest(input.requestUrl) && input.notificationDeliveryEnabled === 'true'
  }
  return false
}
