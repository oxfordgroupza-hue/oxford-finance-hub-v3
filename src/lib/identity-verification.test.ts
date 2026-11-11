import { describe, expect, it, vi } from 'vitest'
import { isIdentityEmailConfirmed, resolveIdentityEmailConfirmation, type IdentityConfirmationState } from './identity-verification'

const cases: Array<[IdentityConfirmationState | null | undefined, boolean]> = [
  [{ confirmedAt: '2026-11-10T10:00:00.000Z' }, true],
  [{ emailConfirmedAt: '2026-11-10T10:00:00.000Z' }, true],
  [{ confirmed_at: '2026-11-10T10:00:00.000Z' }, true],
  [{ email_confirmed_at: '2026-11-10T10:00:00.000Z' }, true],
  [{ confirmedAt: null, confirmed_at: null }, false],
  [null, false],
  [undefined, false],
]

describe('Netlify Identity email confirmation normalisation', () => {
  it.each(cases)('normalises %j to %s', (user, expected) => {
    expect(isIdentityEmailConfirmed(user)).toBe(expected)
  })
})


describe('authoritative Netlify Identity email confirmation', () => {
  it('uses an existing confirmation timestamp without an admin lookup', async () => {
    const lookup = vi.fn()
    await expect(resolveIdentityEmailConfirmation(
      { id: 'user-1', confirmedAt: '2026-11-10T10:00:00.000Z' }, lookup,
    )).resolves.toBe('confirmed')
    expect(lookup).not.toHaveBeenCalled()
  })

  it('checks the full Identity user when getUser returned token claims only', async () => {
    const lookup = vi.fn().mockResolvedValue({ confirmedAt: '2026-11-10T10:00:00.000Z' })
    await expect(resolveIdentityEmailConfirmation({ id: 'user-1' }, lookup)).resolves.toBe('confirmed')
    expect(lookup).toHaveBeenCalledWith('user-1')
  })

  it('only reports unconfirmed when the authoritative user record says so', async () => {
    await expect(resolveIdentityEmailConfirmation(
      { id: 'user-1' }, async () => ({ confirmedAt: null }),
    )).resolves.toBe('unconfirmed')
  })

  it('reports unavailable rather than falsely claiming the email is unverified', async () => {
    await expect(resolveIdentityEmailConfirmation(
      { id: 'user-1' }, async () => { throw new Error('Identity admin API unavailable') },
    )).resolves.toBe('unavailable')
  })
})
