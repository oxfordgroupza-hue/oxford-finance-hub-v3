import { describe, expect, it } from 'vitest'
import { isIdentityEmailConfirmed, type IdentityConfirmationState } from './identity-verification'

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
