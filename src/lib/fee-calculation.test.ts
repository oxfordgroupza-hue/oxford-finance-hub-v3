import { describe, expect, it } from 'vitest'
import { calculateOxfordFees, DOCUMENTATION_FEE_RATE_BPS } from './fee-calculation'

const partnerTerms = {
  termsVersion: 'partner-example-v1',
  facilitationRateBps: 200,
  adminFeeMode: 'percentage' as const,
  adminRateBps: 650,
  adminFixedAmountCents: null,
}

describe('partner-specific Oxford fee calculation', () => {
  it('deducts 1% documentation from the approved amount, then calculates both Oxford fees on partner gross', () => {
    const result = calculateOxfordFees(100_000_000, 100_000_000, partnerTerms)

    expect(result).toEqual({
      termsVersion: 'partner-example-v1',
      approvedFinanceAmountCents: 100_000_000,
      actualFunderSettlementAmountCents: 100_000_000,
      documentationFeeRateBps: 100,
      documentationFeeCents: 1_000_000,
      partnerGrossPayableCents: 99_000_000,
      facilitationRateBps: 200,
      facilitationFeeCents: 1_980_000,
      adminFeeMode: 'percentage',
      adminRateBps: 650,
      adminFixedAmountCents: null,
      adminFeeCents: 6_435_000,
      partnerNetPayableCents: 90_585_000,
      oxfordTotalFeesCents: 8_415_000,
    })
    expect(DOCUMENTATION_FEE_RATE_BPS).toBe(100)
    expect(result).not.toHaveProperty('vat')
  })

  it('calculates the 1% documentation deduction from approved finance even when the gross funder settlement differs', () => {
    const result = calculateOxfordFees(100_000, 90_000, {
      termsVersion: 'partner-different-settlement-v1',
      facilitationRateBps: 0,
      adminFeeMode: 'percentage',
      adminRateBps: 0,
      adminFixedAmountCents: null,
    })

    expect(result.documentationFeeCents).toBe(1_000)
    expect(result.partnerGrossPayableCents).toBe(89_000)
    expect(result.partnerNetPayableCents).toBe(89_000)
  })

  it('uses the approved partner terms rather than a global default rate', () => {
    const result = calculateOxfordFees(10_000_000, 10_000_000, {
      ...partnerTerms,
      termsVersion: 'partner-example-v2',
      facilitationRateBps: 500,
      adminRateBps: 250,
    })

    expect(result.termsVersion).toBe('partner-example-v2')
    expect(result.facilitationFeeCents).toBe(495_000)
    expect(result.adminFeeCents).toBe(247_500)
  })

  it('supports a partner-specific fixed administration amount', () => {
    const result = calculateOxfordFees(100_000, 100_000, {
      termsVersion: 'partner-fixed-v1',
      facilitationRateBps: 200,
      adminFeeMode: 'fixed',
      adminRateBps: 0,
      adminFixedAmountCents: 5_000,
    })

    expect(result.documentationFeeCents).toBe(1_000)
    expect(result.partnerGrossPayableCents).toBe(99_000)
    expect(result.facilitationFeeCents).toBe(1_980)
    expect(result.adminFeeCents).toBe(5_000)
    expect(result.partnerNetPayableCents).toBe(92_020)
  })

  it('requires explicit partner-specific terms', () => {
    expect(() => calculateOxfordFees(100_000, 100_000, null as never)).toThrow(/partner-specific fee terms/)
  })

  it('rejects combined percentage fees above partner gross payable', () => {
    expect(() => calculateOxfordFees(100_000, 100_000, {
      ...partnerTerms,
      facilitationRateBps: 6_000,
      adminRateBps: 5_000,
    })).toThrow(/cannot exceed partner gross payable/)
  })

  it('rejects a fixed administration fee that exceeds partner gross payable', () => {
    expect(() => calculateOxfordFees(100_000, 100_000, {
      termsVersion: 'partner-fixed-v1',
      facilitationRateBps: 0,
      adminFeeMode: 'fixed',
      adminRateBps: 0,
      adminFixedAmountCents: 100_000,
    })).toThrow(/configured Oxford fees exceed/)
  })
})
