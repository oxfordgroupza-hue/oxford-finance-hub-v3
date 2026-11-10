/** Public settlement calculator placeholder. Confidential commercial terms are not published in this repository. */
export const OXFORD_FEE_TERMS_VERSION = 'pending-business-approval'
export interface OxfordFeeCalculation {
  termsVersion: string
  approvedFinanceAmountCents: number
  actualFunderSettlementAmountCents: number
  documentationFeeCents: number
  partnerGrossPayableCents: number
  facilitationFeeCents: number
  adminFeeCents: number
  partnerNetPayableCents: number
  oxfordTotalFeesCents: number
  adminRateBps: number
}
export function calculateOxfordFees(_approvedFinanceAmountCents: number, _actualFunderSettlementAmountCents?: number): OxfordFeeCalculation {
  throw new Error('Oxford settlement terms have not been approved or configured. Settlement calculations are disabled.')
}
