import { calculateOxfordFees, type PartnerCommercialFeeTerms } from './fee-calculation'

export interface SettlementTotals {
  actual: number
  documentation: number
  gross: number
  facilitation: number
  admin: number
  net: number
  oxford: number
}

export type SettlementAdjustmentDelta = SettlementTotals

export type SettlementAdjustmentType = 'reversal' | 'correction'

export function assertSettlementAdjustmentSequence(
  existingTypes: readonly SettlementAdjustmentType[],
  nextType: SettlementAdjustmentType,
): void {
  if (existingTypes.includes('reversal')) {
    throw new Error('This settlement has already been reversed.')
  }
  if (nextType === 'correction' && existingTypes.includes('correction')) {
    throw new Error('A correction already exists. Reverse the settlement and record a new settlement instead.')
  }
}

export function calculateSettlementAdjustmentDelta(input: {
  original: SettlementTotals & {
    approvedFinanceAmountCents: number
    feeTerms?: PartnerCommercialFeeTerms
  }
  priorCorrection?: SettlementAdjustmentDelta | null
  adjustmentType: SettlementAdjustmentType
  correctedGrossFunderSettlementAmountCents?: number
}): SettlementAdjustmentDelta {
  const { original, priorCorrection, adjustmentType } = input
  const current: SettlementTotals = {
    actual: original.actual + (priorCorrection?.actual ?? 0),
    documentation: original.documentation + (priorCorrection?.documentation ?? 0),
    gross: original.gross + (priorCorrection?.gross ?? 0),
    facilitation: original.facilitation + (priorCorrection?.facilitation ?? 0),
    admin: original.admin + (priorCorrection?.admin ?? 0),
    net: original.net + (priorCorrection?.net ?? 0),
    oxford: original.oxford + (priorCorrection?.oxford ?? 0),
  }

  if (adjustmentType === 'reversal') {
    return {
      actual: -current.actual,
      documentation: -current.documentation,
      gross: -current.gross,
      facilitation: -current.facilitation,
      admin: -current.admin,
      net: -current.net,
      oxford: -current.oxford,
    }
  }

  const correctedGrossAmount = input.correctedGrossFunderSettlementAmountCents
  if (!Number.isSafeInteger(correctedGrossAmount) || (correctedGrossAmount ?? 0) <= 0) {
    throw new Error('A valid corrected gross funder settlement amount is required.')
  }
  if (!original.feeTerms) {
    throw new Error('This settlement has no partner-specific terms snapshot and cannot be recalculated.')
  }
  const fees = calculateOxfordFees(original.approvedFinanceAmountCents, correctedGrossAmount!, original.feeTerms)
  return {
    actual: fees.actualFunderSettlementAmountCents - current.actual,
    documentation: fees.documentationFeeCents - current.documentation,
    gross: fees.partnerGrossPayableCents - current.gross,
    facilitation: fees.facilitationFeeCents - current.facilitation,
    admin: fees.adminFeeCents - current.admin,
    net: fees.partnerNetPayableCents - current.net,
    oxford: fees.oxfordTotalFeesCents - current.oxford,
  }
}

export function sumPartnerNetAdjustmentDeltas(
  adjustments: readonly { settlementId: string; partnerNetDeltaCents: number }[],
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const adjustment of adjustments) {
    totals.set(adjustment.settlementId,
      (totals.get(adjustment.settlementId) ?? 0) + adjustment.partnerNetDeltaCents)
  }
  return totals
}
