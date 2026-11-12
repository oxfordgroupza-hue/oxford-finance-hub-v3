import { describe, expect, it } from 'vitest'
import { assertSettlementAdjustmentSequence, calculateSettlementAdjustmentDelta, sumPartnerNetAdjustmentDeltas } from './settlement-adjustments'

const feeTerms = {
  termsVersion: 'partner-example-v1',
  facilitationRateBps: 200,
  adminFeeMode: 'percentage' as const,
  adminRateBps: 650,
  adminFixedAmountCents: null,
}

const original = {
  approvedFinanceAmountCents: 10_000_000,
  actual: 10_000_000,
  documentation: 100_000,
  gross: 9_900_000,
  facilitation: 198_000,
  admin: 643_500,
  net: 9_058_500,
  oxford: 841_500,
  feeTerms,
}

describe('settlement adjustment calculations', () => {
  it('reverses the original settlement exactly', () => {
    expect(calculateSettlementAdjustmentDelta({ original, adjustmentType: 'reversal' })).toEqual({
      actual: -original.actual,
      documentation: -original.documentation,
      gross: -original.gross,
      facilitation: -original.facilitation,
      admin: -original.admin,
      net: -original.net,
      oxford: -original.oxford,
    })
  })

  it('recalculates a correction using the original partner-specific terms snapshot', () => {
    expect(calculateSettlementAdjustmentDelta({
      original,
      adjustmentType: 'correction',
      correctedGrossFunderSettlementAmountCents: 9_000_000,
    })).toEqual({
      actual: -1_000_000,
      documentation: 0,
      gross: -1_000_000,
      facilitation: -20_000,
      admin: -65_000,
      net: -915_000,
      oxford: -85_000,
    })
  })
})

describe('settlement adjustment sequence', () => {
  it('allows one correction followed by one reversal', () => expect(() => assertSettlementAdjustmentSequence(['correction'], 'reversal')).not.toThrow())
  it('rejects a second correction', () => expect(() => assertSettlementAdjustmentSequence(['correction'], 'correction')).toThrow(/correction already exists/))
  it('rejects a duplicate reversal', () => expect(() => assertSettlementAdjustmentSequence(['reversal'], 'reversal')).toThrow(/already been reversed/))
  it('rejects a correction after reversal', () => expect(() => assertSettlementAdjustmentSequence(['reversal'], 'correction')).toThrow(/already been reversed/))
})

describe('partner payout adjustment aggregation', () => {
  it('aggregates only partner-net deltas by settlement', () => {
    const totals = sumPartnerNetAdjustmentDeltas([
      { settlementId: 'settlement-a', partnerNetDeltaCents: -1000 },
      { settlementId: 'settlement-a', partnerNetDeltaCents: 500 },
      { settlementId: 'settlement-b', partnerNetDeltaCents: -250 },
    ])
    expect(totals.get('settlement-a')).toBe(-500)
    expect(totals.get('settlement-b')).toBe(-250)
  })
})
