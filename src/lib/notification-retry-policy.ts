const MAX_ATTEMPTS = 5
const BASE_RETRY_DELAY_MS = 5 * 60 * 1000
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000

export function notificationRetryDelayMs(attempts: number): number {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts >= MAX_ATTEMPTS) {
    return Number.POSITIVE_INFINITY
  }
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempts - 1), MAX_RETRY_DELAY_MS)
}

export function isNotificationRetryEligible(
  attempts: number,
  updatedAt: Date,
  now = Date.now(),
): boolean {
  if (!(updatedAt instanceof Date) || !Number.isFinite(updatedAt.getTime())) return false
  const delay = notificationRetryDelayMs(attempts)
  return Number.isFinite(delay) && now - updatedAt.getTime() >= delay
}
