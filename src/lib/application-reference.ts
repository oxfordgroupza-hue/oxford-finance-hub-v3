import { randomBytes } from 'node:crypto'

/**
 * Generate a non-sequential public application reference.
 * The exact historical OBG reference format still requires confirmation against
 * the original source export; this is the proposed OBG-APP-YYYY-XXXXXXXX format.
 *
 * Call only on the server. The database unique constraint remains the final
 * collision guard; callers should retry if an insert hits that constraint.
 */
export function createApplicationReference(now = new Date()): string {
  const year = now.getUTCFullYear()
  const suffix = randomBytes(4).toString('hex').toUpperCase()
  return `OBG-APP-${year}-${suffix}`
}
