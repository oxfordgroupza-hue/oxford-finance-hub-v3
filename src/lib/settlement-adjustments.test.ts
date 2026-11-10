import { describe, expect, it } from 'vitest'
import { assertSettlementAdjustmentSequence, calculateSettlementAdjustmentDelta, sumPartnerNetAdjustmentDeltas } from './settlement-adjustments'
const original = { approvedFinanceAmountCents: 10_000_000, actual: 10_000_000, documentation: 0, gross: 10_000_000, facilitation: 0, admin: 0, net: 10_000_000, oxford: 0 }
describe('settlement adjustment calculations', () => {
  it('reverses the original settlement exactly', () => {
    expect(calculateSettlementAdjustmentDelta({ original, adjustmentType: 'reversal' })).toEqual({
      actual: -original.actual, documentation: -original.documentation, gross: -original.gross,
      facilitation: -original.facilitation, admin: -original.admin, net: -original.net, oxford: -original.oxford,
    })
  })
  it('does not calculate a correction until commercial terms are approved', () => {
    expect(() => calculateSettlementAdjustmentDelta({ original, adjustmentType: 'correction', correctedActualFunderSettlementAmountCents: 9_000_000 })).toThrow(/not been approved or configured/)
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
