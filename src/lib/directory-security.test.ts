import { describe, expect, it } from 'vitest'
import { canSearchInternalDirectoryUsers, identityNumberFromQuery, isSupportDirectoryOnly, maskIdentityNumber } from './directory-security'

describe('restricted directory identity handling', () => {
  it('masks every identity character except the last four', () => {
    expect(maskIdentityNumber('800101 5009-087')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u20229087')
    expect(maskIdentityNumber('AB123456')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u20223456')
    expect(maskIdentityNumber('1234')).toBe('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022')
  })

  it('does not let a directory-only custom role inherit the broad Support directory scope', () => {
    expect(isSupportDirectoryOnly(['directory.view'])).toBe(false)
    expect(isSupportDirectoryOnly(['directory.view', 'support.view'])).toBe(true)
    expect(isSupportDirectoryOnly(['directory.view', 'support.view', 'applications.view'])).toBe(false)
    expect(canSearchInternalDirectoryUsers(['directory.view'], false)).toBe(false)
    expect(canSearchInternalDirectoryUsers(['support.view'], false)).toBe(true)
    expect(canSearchInternalDirectoryUsers(['applications.assign'], false)).toBe(true)
  })

  it('requires an explicit ID or passport prefix so phone searches are not treated as identity lookups', () => {
    expect(identityNumberFromQuery('ID: 800101 5009-087')).toBe('800101 5009-087')
    expect(identityNumberFromQuery('passport: AB123456')).toBe('AB123456')
    expect(identityNumberFromQuery('0821234567')).toBeNull()
    expect(identityNumberFromQuery('Tshepo Hlanga')).toBeNull()
  })
})
