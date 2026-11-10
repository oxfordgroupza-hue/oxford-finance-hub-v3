import { describe, expect, it } from 'vitest'
import { isNotificationRetryEligible, notificationRetryDelayMs } from './notification-retry-policy'

describe('notification retry policy', () => {
  it('uses increasing retry delays and caps the delay at one hour', () => {
    expect(notificationRetryDelayMs(1)).toBe(5 * 60 * 1000)
    expect(notificationRetryDelayMs(2)).toBe(10 * 60 * 1000)
    expect(notificationRetryDelayMs(3)).toBe(20 * 60 * 1000)
    expect(notificationRetryDelayMs(4)).toBe(40 * 60 * 1000)
  })

  it('does not retry after the maximum attempt count', () => {
    expect(notificationRetryDelayMs(5)).toBe(Number.POSITIVE_INFINITY)
    expect(notificationRetryDelayMs(0)).toBe(Number.POSITIVE_INFINITY)
  })

  it('waits until the backoff period has elapsed', () => {
    const updatedAt = new Date('2026-11-10T10:00:00.000Z')
    const fiveMinutesLater = updatedAt.getTime() + 5 * 60 * 1000
    expect(isNotificationRetryEligible(1, updatedAt, fiveMinutesLater - 1)).toBe(false)
    expect(isNotificationRetryEligible(1, updatedAt, fiveMinutesLater)).toBe(true)
  })

  it('rejects invalid timestamps and exhausted attempts', () => {
    expect(isNotificationRetryEligible(1, new Date(Number.NaN), Date.now())).toBe(false)
    expect(isNotificationRetryEligible(5, new Date(0), Date.now())).toBe(false)
  })
})
