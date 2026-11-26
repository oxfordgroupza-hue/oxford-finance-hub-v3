import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerEnv } from './server-runtime-env'
import { getRequest } from '@tanstack/react-start/server'
import { isApprovedCloudflarePreviewRequest, isApprovedCloudflareProductionRequest } from './document-storage-security'
import { assertOxfordAuthEmailConfigured, assertOxfordAuthEmailRecipientAllowed, assertOxfordCustomerRegistrationAllowed } from './cloudflare-auth-email'

vi.mock('./server-runtime-env', () => ({ getServerEnv: vi.fn() }))
vi.mock('@tanstack/react-start/server', () => ({ getRequest: vi.fn() }))
vi.mock('./document-storage-security', () => ({
  isApprovedCloudflarePreviewRequest: vi.fn(),
  isApprovedCloudflareProductionRequest: vi.fn(),
}))

const values: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of Object.keys(values)) delete values[key]
  values.CONTEXT = 'cloudflare-preview'
  vi.mocked(getServerEnv).mockImplementation((name: string) => values[name])
  vi.mocked(getRequest).mockReturnValue(new Request('https://audit-production-cutover-candidate-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/'))
  vi.mocked(isApprovedCloudflarePreviewRequest).mockReturnValue(true)
  vi.mocked(isApprovedCloudflareProductionRequest).mockReturnValue(false)
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

  it('normalizes surrounding whitespace on provider credentials and sender values', () => {
    values.OXFORD_EMAIL_DELIVERY_ENABLED = 'true'
    values.BREVO_API_KEY = '  existing-test-key  '
    values.OXFORD_NOTIFICATION_FROM_EMAIL = ' sender@example.com '

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

  it('rejects every unapproved host in Preview context instead of bypassing recipient checks', () => {
    vi.mocked(isApprovedCloudflarePreviewRequest).mockReturnValue(false)

    expect(() => assertOxfordAuthEmailRecipientAllowed('customer@example.com')).toThrow(
      'Preview authentication email delivery is available only on an approved Oxford Preview Worker host.',
    )
  })

  it('allows normal recipient delivery only from the canonical Production host', () => {
    values.CONTEXT = 'cloudflare-production'
    vi.mocked(getRequest).mockReturnValue(new Request('https://finance.oxfordbusinessgroup.co.za/'))
    vi.mocked(isApprovedCloudflareProductionRequest).mockReturnValue(true)

    expect(() => assertOxfordAuthEmailRecipientAllowed('customer@example.com')).not.toThrow()
  })

  it('rejects authentication email delivery on unknown contexts and noncanonical Production hosts', () => {
    values.CONTEXT = 'unknown'
    expect(() => assertOxfordAuthEmailRecipientAllowed('customer@example.com')).toThrow(
      'Oxford authentication email delivery is unavailable on this runtime host.',
    )

    values.CONTEXT = 'cloudflare-production'
    vi.mocked(isApprovedCloudflareProductionRequest).mockReturnValue(false)
    expect(() => assertOxfordAuthEmailRecipientAllowed('customer@example.com')).toThrow(
      'Oxford authentication email delivery is unavailable on this runtime host.',
    )
  })
})

describe('Oxford customer registration gate', () => {
  it('allows only the designated mailbox during the one-time administrator window', () => {
    values.OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED = 'true'
    values.OXFORD_INITIAL_SUPER_ADMIN_EMAIL = 'oxfordbusinessgroup@outlook.com'
    values.OXFORD_APPLICATIONS_ENABLED = 'false'

    expect(() => assertOxfordCustomerRegistrationAllowed(' OXFORDBUSINESSGROUP@OUTLOOK.COM ')).not.toThrow()
    expect(() => assertOxfordCustomerRegistrationAllowed('other@example.com')).toThrow(
      'Initial Oxford registration is restricted to the designated administrator mailbox.',
    )
  })

  it('fails closed when the bootstrap mailbox is missing', () => {
    values.OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED = 'true'

    expect(() => assertOxfordCustomerRegistrationAllowed('oxfordbusinessgroup@outlook.com')).toThrow(
      'Initial Oxford registration is restricted to the designated administrator mailbox.',
    )
  })

  it('blocks public customer registration while applications are disabled', () => {
    values.OXFORD_APPLICATIONS_ENABLED = 'false'

    expect(() => assertOxfordCustomerRegistrationAllowed('customer@example.com')).toThrow(
      'Customer registration is not currently available.',
    )
  })

  it('allows ordinary customer registration after applications are enabled', () => {
    values.OXFORD_APPLICATIONS_ENABLED = 'true'

    expect(() => assertOxfordCustomerRegistrationAllowed('customer@example.com')).not.toThrow()
  })
})
