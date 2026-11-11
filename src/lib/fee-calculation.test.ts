import { describe, expect, it } from 'vitest'
import { calculateFinanceAmount, calculateOxfordFees, DOCUMENTATION_FEE_RATE_BPS, FINANCE_VAT_RATE_BPS } from './fee-calculation'

const partnerTerms = {
  termsVersion: 'partner-example-v1',
  facilitationRateBps: 200,
  adminFeeMode: 'percentage' as const,
  adminRateBps: 650,
  adminFixedAmountCents: null,
}

describe('finance amount calculation', () => {
  it('adds 1% documentation fee and 15% VAT to principal plus documentation fee', () => {
    const result = calculateFinanceAmount(100_000_000)

    expect(result).toEqual({
      principalLoanAmountCents: 100_000_000,
      documentationFeeRateBps: 100,
      documentationFeeCents: 1_000_000,
      vatRateBps: 1_500,
      vatBaseCents: 101_000_000,
      vatAmountCents: 15_150_000,
      totalFinanceAmountCents: 116_150_000,
    })
    expect(DOCUMENTATION_FEE_RATE_BPS).toBe(100)
    expect(FINANCE_VAT_RATE_BPS).toBe(1_500)
  })

  it('uses the VAT-inclusive finance amount as expected gross settlement while deducting documentation on principal', () => {
    const finance = calculateFinanceAmount(100_000_000)
    const result = calculateOxfordFees(100_000_000, finance.totalFinanceAmountCents, {
      termsVersion: 'partner-zero-fees-v1',
      facilitationRateBps: 0,
      adminFeeMode: 'percentage',
      adminRateBps: 0,
      adminFixedAmountCents: null,
    })

    expect(result.documentationFeeCents).toBe(1_000_000)
    expect(result.actualFunderSettlementAmountCents).toBe(116_150_000)
    expect(result.partnerGrossPayableCents).toBe(115_150_000)
    expect(result.oxfordTotalFeesCents).toBe(0)
    expect(result.partnerNetPayableCents).toBe(115_150_000)
  })

  it('rejects zero, negative and unsafe principal amounts', () => {
    expect(() => calculateFinanceAmount(0)).toThrow(/positive principal/)
    expect(() => calculateFinanceAmount(-100)).toThrow(/positive principal/)
    expect(() => calculateFinanceAmount(Number.MAX_SAFE_INTEGER + 1)).toThrow(/positive principal/)
  })
})

describe('partner-specific Oxford fee calculation', () => {
  it('deducts 1% documentation from approved principal, then calculates Oxford fees on partner gross without extra VAT', () => {
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

  it('calculates the 1% documentation deduction from approved principal even when the gross funder settlement differs', () => {
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
