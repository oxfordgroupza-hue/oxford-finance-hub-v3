import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerEnv } from './server-runtime-env'
import { getRequest } from '@tanstack/react-start/server'
import { isApprovedCloudflarePreviewRequest, isApprovedCloudflareProductionRequest } from './document-storage-security'
import { assertOxfordAuthEmailConfigured, assertOxfordAuthEmailRecipientAllowed, assertOxfordCustomerRegistrationAllowed } from './cloudflare-auth-email'

vi.mock('./server-runtime-env', () => ({ getServerEnv: vi.fn() }))
vi.mock('@tanstack/react-start/server', () => ({ getRequest: vi.fn() }))
vi.mock('./document-storage-security', () => ({ isApprovedCloudflarePreviewRequest: vi.fn(), isApprovedCloudflareProductionRequest: vi.fn() }))

const values: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of Object.keys(values)) delete values[key]
  vi.mocked(getServerEnv).mockImplementation((name: string) => values[name])
  vi.mocked(getRequest).mockReturnValue(new Request('https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/'))
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

  it('fails closed on immutable deployment URLs in Cloudflare Preview context', () => {
    values.CONTEXT = 'cloudflare-preview'
    vi.mocked(getRequest).mockReturnValue(new Request('https://83efb790-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/'))
    vi.mocked(isApprovedCloudflarePreviewRequest).mockReturnValue(false)

    expect(() => assertOxfordAuthEmailRecipientAllowed('other@example.com')).toThrow(
      'Preview authentication email delivery is available only on the approved branch Preview host.',
    )
  })

  it('allows Production recipients only when the request uses the canonical Finance Hub host', () => {
    values.CONTEXT = 'cloudflare-production'
    vi.mocked(getRequest).mockReturnValue(new Request('https://finance.oxfordbusinessgroup.co.za/'))
    vi.mocked(isApprovedCloudflarePreviewRequest).mockReturnValue(false)
    vi.mocked(isApprovedCloudflareProductionRequest).mockReturnValue(true)

    expect(() => assertOxfordAuthEmailRecipientAllowed('customer@example.com')).not.toThrow()
  })

  it('rejects Production authentication email requests on an unapproved host', () => {
    values.CONTEXT = 'cloudflare-production'
    vi.mocked(getRequest).mockReturnValue(new Request('https://attacker.example/'))
    vi.mocked(isApprovedCloudflarePreviewRequest).mockReturnValue(false)
    vi.mocked(isApprovedCloudflareProductionRequest).mockReturnValue(false)

    expect(() => assertOxfordAuthEmailRecipientAllowed('customer@example.com')).toThrow(
      'Production authentication email requests are available only on the canonical Oxford Finance Hub host.',
    )
  })
})


describe('Oxford customer registration gate', () => {
  it('restricts initial registration to the designated administrator mailbox', () => {
    values.OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED = 'true'
    values.OXFORD_INITIAL_SUPER_ADMIN_EMAIL = 'oxfordbusinessgroup@outlook.com'
    expect(() => assertOxfordCustomerRegistrationAllowed('oxfordbusinessgroup@outlook.com')).not.toThrow()
    expect(() => assertOxfordCustomerRegistrationAllowed('other@example.com')).toThrow(
      'Initial Oxford registration is restricted to the designated administrator mailbox.',
    )
  })

  it('keeps customer registration closed while application intake is disabled', () => {
    values.OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED = 'false'
    values.OXFORD_APPLICATIONS_ENABLED = 'false'
    expect(() => assertOxfordCustomerRegistrationAllowed('customer@example.com')).toThrow(
      'Customer registration is not currently available.',
    )
  })

  it('allows ordinary customer registration only after the application flag is enabled', () => {
    values.OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED = 'false'
    values.OXFORD_APPLICATIONS_ENABLED = 'true'
    expect(() => assertOxfordCustomerRegistrationAllowed('customer@example.com')).not.toThrow()
  })
})
