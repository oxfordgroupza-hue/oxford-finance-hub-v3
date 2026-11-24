import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerEnv } from './server-runtime-env'
import { assertOxfordAuthEmailConfigured } from './cloudflare-auth-email'

vi.mock('./server-runtime-env', () => ({ getServerEnv: vi.fn() }))

const values: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of Object.keys(values)) delete values[key]
  vi.mocked(getServerEnv).mockImplementation((name: string) => values[name])
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
