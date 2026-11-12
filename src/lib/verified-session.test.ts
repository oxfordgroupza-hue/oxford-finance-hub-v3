import { describe, expect, it } from 'vitest'
import { getVerifiedSessionIdentity } from './verified-session'

describe('authoritative verified session identity', () => {
  it('returns the normalized account identity for a provisioned, unblocked session', () => {
    expect(getVerifiedSessionIdentity({
      authenticated: true,
      provisioned: true,
      blocked: false,
      user: { id: 'user-1', email: ' Applicant@Example.com ', accountType: 'customer' },
    })).toEqual({ userId: 'user-1', email: 'applicant@example.com', accountType: 'customer' })
  })

  it.each([
    ['anonymous', { authenticated: false, provisioned: false }],
    ['unverified or unprovisioned', { authenticated: true, provisioned: false }],
    ['blocked', { authenticated: true, provisioned: true, blocked: true, user: { id: 'user-1', email: 'a@example.com' } }],
    ['missing user', { authenticated: true, provisioned: true, blocked: false }],
    ['missing email', { authenticated: true, provisioned: true, blocked: false, user: { id: 'user-1' } }],
  ] as const)('rejects %s sessions', (_label, session) => {
    expect(getVerifiedSessionIdentity(session)).toBeNull()
  })
})
