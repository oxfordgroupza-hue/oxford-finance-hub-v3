/** Minimal identity data accepted from the authoritative server-side authorization snapshot. */
export type VerifiedSessionSnapshot = {
  authenticated: boolean
  provisioned?: boolean
  blocked?: boolean | string | null
  user?: { id: string; email?: string | null; accountType?: string }
}

/** A provisioned snapshot is returned only after Identity email confirmation and account resolution. */
export function getVerifiedSessionIdentity(session: VerifiedSessionSnapshot) {
  if (!session.authenticated || !session.provisioned || session.blocked || !session.user?.id) return null
  const email = session.user.email?.trim().toLowerCase()
  if (!email) return null
  return { userId: session.user.id, email, accountType: session.user.accountType ?? null }
}
