import { describe, expect, it } from 'vitest'
import { isTransactionalEmailDeliveryEnabled } from './notification-delivery-policy'

const preview = 'https://audit-reconciled-production-release-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/'
const production = 'https://finance.oxfordbusinessgroup.co.za/'

describe('transactional email delivery policy', () => {
  it('allows enabled delivery from the approved Preview Worker host', () => {
    expect(isTransactionalEmailDeliveryEnabled(preview, 'cloudflare-preview', 'true')).toBe(true)
  })

  it('allows enabled delivery from the canonical Production host', () => {
    expect(isTransactionalEmailDeliveryEnabled(production, 'cloudflare-production', 'true')).toBe(true)
  })

  it('fails closed when delivery is disabled', () => {
    expect(isTransactionalEmailDeliveryEnabled(preview, 'cloudflare-preview', 'false')).toBe(false)
    expect(isTransactionalEmailDeliveryEnabled(production, 'cloudflare-production', undefined)).toBe(false)
  })

  it('rejects noncanonical hosts and unknown runtime contexts', () => {
    expect(isTransactionalEmailDeliveryEnabled('https://other.example/', 'cloudflare-preview', 'true')).toBe(false)
    expect(isTransactionalEmailDeliveryEnabled(preview, 'cloudflare-production', 'true')).toBe(false)
    expect(isTransactionalEmailDeliveryEnabled(production, 'cloudflare-preview', 'true')).toBe(false)
    expect(isTransactionalEmailDeliveryEnabled(production, undefined, 'true')).toBe(false)
  })
})
