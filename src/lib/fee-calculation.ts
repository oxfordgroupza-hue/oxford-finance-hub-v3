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
export function calculateOxfordFees(approvedFinanceAmountCents: number, actualFunderSettlementAmountCents?: number): OxfordFeeCalculation {
  // Keep the public function signature stable while settlement terms remain disabled.
  void approvedFinanceAmountCents
  void actualFunderSettlementAmountCents
  throw new Error('Oxford settlement terms have not been approved or configured. Settlement calculations are disabled.')
}
