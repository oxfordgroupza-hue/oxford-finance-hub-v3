import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerEnv } from './server-runtime-env'
import { getRequest } from '@tanstack/react-start/server'
import { isApprovedCloudflarePreviewRequest } from './document-storage-security'
import { assertOxfordAuthEmailConfigured, assertOxfordAuthEmailRecipientAllowed } from './cloudflare-auth-email'

vi.mock('./server-runtime-env', () => ({ getServerEnv: vi.fn() }))
vi.mock('@tanstack/react-start/server', () => ({ getRequest: vi.fn() }))
vi.mock('./document-storage-security', () => ({ isApprovedCloudflarePreviewRequest: vi.fn() }))

const values: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of Object.keys(values)) delete values[key]
  vi.mocked(getServerEnv).mockImplementation((name: string) => values[name])
  vi.mocked(getRequest).mockReturnValue(new Request('https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/'))
  vi.mocked(isApprovedCloudflarePreviewRequest).mockReturnValue(true)
})

describe('Oxford authentication email delivery gate', () => {
  it('fails closed when the delivery flag is missing', () => {
    values.BREVO_API_KEY = 'test-key'
    values.OXFORD_NOTIFICATION_FROM_EMAIL = 'sender@example.com'

    expect(() => assertOxfordAuthEmailConfigured()).toThrow(
      'Oxford account email delivery is disabled for this environment.',
    )
  })

  it('fails closed when the delivery flag is not exactly true', () => {
    values.OXFORD_EMAIL_DELIVERY_ENABLED = 'false'
    values.BREVO_API_KEY = 'test-key'
    values.OXFORD_NOTIFICATION_FROM_EMAIL = 'sender@example.com'

    expect(() => assertOxfordAuthEmailConfigured()).toThrow(
      'Oxford account email delivery is disabled for this environment.',
    )
  })

  it('requires provider credentials after the delivery flag is enabled', () => {
    values.OXFORD_EMAIL_DELIVERY_ENABLED = 'true'

    expect(() => assertOxfordAuthEmailConfigured()).toThrow(
      'Oxford account email delivery is not configured for this Cloudflare environment.',
    )
  })

  it('accepts a valid explicitly enabled configuration', () => {
    values.OXFORD_EMAIL_DELIVERY_ENABLED = 'true'
    values.BREVO_API_KEY = 'test-key'
    values.OXFORD_NOTIFICATION_FROM_EMAIL = 'sender@example.com'

    expect(() => assertOxfordAuthEmailConfigured()).not.toThrow()
  })
})

describe('Oxford authentication email recipient restrictions', () => {
  it('allows only the designated Oxford mailbox in the isolated preview', () => {
    values.OXFORD_NOTIFICATION_ADMIN_EMAIL = 'oxfordbusinessgroup@outlook.com'
    values.OXFORD_INITIAL_SUPER_ADMIN_EMAIL = 'oxfordbusinessgroup@outlook.com'

    expect(() => assertOxfordAuthEmailRecipientAllowed('oxfordbusinessgroup@outlook.com')).not.toThrow()
    expect(() => assertOxfordAuthEmailRecipientAllowed('other@example.com')).toThrow(
      'Preview email delivery is restricted to the configured Oxford test recipient.',
    )
  })

  it('fails closed when the notification and bootstrap recipients differ', () => {
    values.OXFORD_NOTIFICATION_ADMIN_EMAIL = 'admin@example.com'
    values.OXFORD_INITIAL_SUPER_ADMIN_EMAIL = 'bootstrap@example.com'

    expect(() => assertOxfordAuthEmailRecipientAllowed('admin@example.com')).toThrow(
      'Preview email delivery is restricted to the configured Oxford test recipient.',
    )
  })

  it('does not apply the preview mailbox restriction outside the approved preview host', () => {
    vi.mocked(isApprovedCloudflarePreviewRequest).mockReturnValue(false)

    expect(() => assertOxfordAuthEmailRecipientAllowed('customer@example.com')).not.toThrow()
  })
})
