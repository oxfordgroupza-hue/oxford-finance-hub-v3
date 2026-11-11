export type AdminFeeMode = 'percentage' | 'fixed'

export interface PartnerCommercialFeeTerms {
  termsVersion: string
  facilitationRateBps: number
  adminFeeMode: AdminFeeMode
  adminRateBps: number
  adminFixedAmountCents: number | null
}

export interface OxfordFeeCalculation {
  termsVersion: string
  approvedFinanceAmountCents: number
  actualFunderSettlementAmountCents: number
  documentationFeeRateBps: number
  documentationFeeCents: number
  partnerGrossPayableCents: number
  facilitationRateBps: number
  facilitationFeeCents: number
  adminFeeMode: AdminFeeMode
  adminRateBps: number
  adminFixedAmountCents: number | null
  adminFeeCents: number
  partnerNetPayableCents: number
  oxfordTotalFeesCents: number
}

export const DOCUMENTATION_FEE_RATE_BPS = 100

function assertSafeNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number of cents or basis points.`)
  }
}

function percentageCents(baseCents: number, rateBps: number): number {
  const rounded = (BigInt(baseCents) * BigInt(rateBps) + 5_000n) / 10_000n
  const result = Number(rounded)
  if (!Number.isSafeInteger(result)) {
    throw new Error('The calculated fee exceeds the supported monetary range.')
  }
  return result
}

/**
 * Calculates the settlement from the approved finance amount and the gross
 * funder settlement amount before the fixed documentation deduction.
 *
 * The funder documentation fee is 1% of the approved finance amount.
 * Partner-specific facilitation and administration fees are both deducted
 * from partner gross payable. No additional VAT is added.
 *
 * No default partner rates exist: an approved partner terms snapshot is required.
 */
export function calculateOxfordFees(
  approvedFinanceAmountCents: number,
  grossFunderSettlementAmountCents: number,
  terms: PartnerCommercialFeeTerms,
): OxfordFeeCalculation {
  if (!Number.isSafeInteger(approvedFinanceAmountCents) || approvedFinanceAmountCents <= 0) {
    throw new Error('A valid approved finance amount is required.')
  }
  if (!Number.isSafeInteger(grossFunderSettlementAmountCents) || grossFunderSettlementAmountCents <= 0) {
    throw new Error('A valid gross funder settlement amount is required.')
  }
  if (!terms || typeof terms.termsVersion !== 'string' || !terms.termsVersion.trim()) {
    throw new Error('Approved partner-specific fee terms are required.')
  }

  assertSafeNonNegativeInteger(terms.facilitationRateBps, 'Facilitation rate')
  assertSafeNonNegativeInteger(terms.adminRateBps, 'Administration rate')
  if (terms.facilitationRateBps > 10_000 || terms.adminRateBps > 10_000) {
    throw new Error('A percentage fee rate cannot exceed 100%.')
  }

  if (terms.adminFeeMode === 'percentage') {
    if (terms.adminFixedAmountCents !== null) {
      throw new Error('Percentage administration terms cannot include a fixed administration amount.')
    }
    if (terms.facilitationRateBps + terms.adminRateBps > 10_000) {
      throw new Error('Combined Oxford percentage fees cannot exceed partner gross payable.')
    }
  } else if (terms.adminFeeMode === 'fixed') {
    if (terms.adminRateBps !== 0 || terms.adminFixedAmountCents === null) {
      throw new Error('Fixed administration terms require a fixed amount and a zero percentage rate.')
    }
    assertSafeNonNegativeInteger(terms.adminFixedAmountCents, 'Fixed administration fee')
  } else {
    throw new Error('A valid administration fee mode is required.')
  }

  const documentationFeeCents = percentageCents(approvedFinanceAmountCents, DOCUMENTATION_FEE_RATE_BPS)
  if (documentationFeeCents >= grossFunderSettlementAmountCents) {
    throw new Error('The gross funder settlement must exceed the documentation fee.')
  }

  const partnerGrossPayableCents = grossFunderSettlementAmountCents - documentationFeeCents
  const facilitationFeeCents = percentageCents(partnerGrossPayableCents, terms.facilitationRateBps)
  const adminFeeCents = terms.adminFeeMode === 'percentage'
    ? percentageCents(partnerGrossPayableCents, terms.adminRateBps)
    : terms.adminFixedAmountCents!

  if (facilitationFeeCents + adminFeeCents > partnerGrossPayableCents) {
    throw new Error('The configured Oxford fees exceed partner gross payable.')
  }

  const partnerNetPayableCents = partnerGrossPayableCents - facilitationFeeCents - adminFeeCents

  return {
    termsVersion: terms.termsVersion,
    approvedFinanceAmountCents,
    actualFunderSettlementAmountCents: grossFunderSettlementAmountCents,
    documentationFeeRateBps: DOCUMENTATION_FEE_RATE_BPS,
    documentationFeeCents,
    partnerGrossPayableCents,
    facilitationRateBps: terms.facilitationRateBps,
    facilitationFeeCents,
    adminFeeMode: terms.adminFeeMode,
    adminRateBps: terms.adminRateBps,
    adminFixedAmountCents: terms.adminFixedAmountCents,
    adminFeeCents,
    partnerNetPayableCents,
    oxfordTotalFeesCents: facilitationFeeCents + adminFeeCents,
  }
}
