import { describe, expect, it } from 'vitest'
import { calculateOxfordFees, OXFORD_FEE_TERMS_VERSION } from './fee-calculation'
describe('public settlement fee gate', () => {
  it('does not publish confidential commercial rates', () => expect(OXFORD_FEE_TERMS_VERSION).toBe('pending-business-approval'))
  it('fails closed until approved terms are supplied through restricted configuration', () => {
    expect(() => calculateOxfordFees(10_000_000)).toThrow(/not been approved or configured/)
    expect(() => calculateOxfordFees(10_000_000, 9_000_000)).toThrow(/not been approved or configured/)
  })
})
