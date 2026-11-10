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
