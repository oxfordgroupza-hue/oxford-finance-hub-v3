import { describe, expect, it } from 'vitest'
import { isNotificationDeliveryEnabled } from './notification-delivery-security'

const previewUrl = 'https://recovery-import-verified-baseline-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/'
const productionUrl = 'https://finance.oxfordbusinessgroup.co.za/'

describe('transactional notification delivery isolation', () => {
  it('allows Preview delivery only on an approved branch host with the Preview email flag', () => {
    expect(isNotificationDeliveryEnabled({ requestUrl: previewUrl, context: 'cloudflare-preview', emailDeliveryEnabled: 'true', notificationDeliveryEnabled: undefined })).toBe(true)
    expect(isNotificationDeliveryEnabled({ requestUrl: previewUrl, context: 'cloudflare-preview', emailDeliveryEnabled: 'false', notificationDeliveryEnabled: 'true' })).toBe(false)
    expect(isNotificationDeliveryEnabled({ requestUrl: 'https://attacker.example/', context: 'cloudflare-preview', emailDeliveryEnabled: 'true', notificationDeliveryEnabled: undefined })).toBe(false)
  })

  it('requires a separate explicit Production notification flag and the canonical host', () => {
    expect(isNotificationDeliveryEnabled({ requestUrl: productionUrl, context: 'cloudflare-production', emailDeliveryEnabled: 'true', notificationDeliveryEnabled: undefined })).toBe(false)
    expect(isNotificationDeliveryEnabled({ requestUrl: productionUrl, context: 'cloudflare-production', emailDeliveryEnabled: 'true', notificationDeliveryEnabled: 'false' })).toBe(false)
    expect(isNotificationDeliveryEnabled({ requestUrl: productionUrl, context: 'cloudflare-production', emailDeliveryEnabled: 'false', notificationDeliveryEnabled: 'true' })).toBe(true)
    expect(isNotificationDeliveryEnabled({ requestUrl: 'https://attacker.example/', context: 'cloudflare-production', emailDeliveryEnabled: 'false', notificationDeliveryEnabled: 'true' })).toBe(false)
  })

  it('fails closed for unknown deployment contexts', () => {
    expect(isNotificationDeliveryEnabled({ requestUrl: productionUrl, context: 'development', emailDeliveryEnabled: 'true', notificationDeliveryEnabled: 'true' })).toBe(false)
  })
})
