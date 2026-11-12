/**
 * Netlify Identity v2 normalises user confirmation timestamps to camelCase.
 * Accept snake_case as a compatibility fallback for raw GoTrue payloads.
 */
export type IdentityConfirmationState = {
  confirmedAt?: string | Date | null
  emailConfirmedAt?: string | Date | null
  confirmed_at?: string | Date | null
  email_confirmed_at?: string | Date | null
}

export function isIdentityEmailConfirmed(user: IdentityConfirmationState | null | undefined): boolean {
  return Boolean(user && (
    user.confirmedAt ||
    user.emailConfirmedAt ||
    user.confirmed_at ||
    user.email_confirmed_at
  ))
}

export type IdentityVerificationResult = 'confirmed' | 'unconfirmed' | 'unavailable'

/**
 * Server-side getUser() may fall back to JWT claims when the Identity user API
 * cannot be reached. JWT claims intentionally omit confirmedAt, so an absent
 * timestamp is not proof that an address is unverified. Resolve the full user
 * through the Netlify Identity admin API before making that security decision.
 */
export async function resolveIdentityEmailConfirmation(
  user: IdentityConfirmationState & { id: string },
  lookupFullUser: (userId: string) => Promise<IdentityConfirmationState | null>,
): Promise<IdentityVerificationResult> {
  if (isIdentityEmailConfirmed(user)) return 'confirmed'
  try {
    const fullUser = await lookupFullUser(user.id)
    if (!fullUser) return 'unavailable'
    return isIdentityEmailConfirmed(fullUser) ? 'confirmed' : 'unconfirmed'
  } catch {
    return 'unavailable'
  }
}
