import { describe, expect, it } from 'vitest'
import {
  assessDebitOrderReversals,
  CREDIT_ASSESSMENT_WEIGHTS,
  getThreeMonthAssessmentWindow,
  type DebitOrderReversalEvidence,
} from './credit-assessment'

const reversal = (transactionDate: string, overrides: Partial<DebitOrderReversalEvidence> = {}): DebitOrderReversalEvidence => ({
  transactionDate,
  amountCents: 125000,
  description: 'DEBIT ORDER RETURNED',
  sourceDocumentId: 'document-1',
  classification: 'debit_order_reversal',
  verified: true,
  ...overrides,
})

describe('Oxford credit assessment foundations', () => {
  it('uses the exact six-dimension 100-point framework in the 10 November master specification', () => {
    expect(CREDIT_ASSESSMENT_WEIGHTS).toEqual({
      verifiedIncomeAndStability: 20,
      affordabilityAndDisposableIncome: 30,
      existingFinancialCommitments: 15,
      bankStatementBehaviour: 15,
      employmentOrBusinessStability: 10,
      documentConsistencyAndVerification: 10,
    })
    expect(Object.values(CREDIT_ASSESSMENT_WEIGHTS).reduce((total, weight) => total + weight, 0)).toBe(100)
  })

  it('calculates a three-calendar-month window and handles month-end dates', () => {
    expect(getThreeMonthAssessmentWindow('2026-11-10')).toEqual({
      start: '2026-08-10',
      end: '2026-11-10',
    })
    expect(getThreeMonthAssessmentWindow('2026-05-31').start).toBe('2026-02-28')
  })

  it('does not trigger the Oxford threshold for two verified reversals', () => {
    const result = assessDebitOrderReversals([
      reversal('2026-09-01'),
      reversal('2026-10-01'),
    ], '2026-11-10')

    expect(result.verifiedReversalCount).toBe(2)
    expect(result.thresholdExceeded).toBe(false)
    expect(result.requiresManualReview).toBe(false)
  })

  it('flags three or more verified reversals for manual review, not automatic decline', () => {
    const result = assessDebitOrderReversals([
      reversal('2026-09-01'),
      reversal('2026-10-01'),
      reversal('2026-11-01'),
    ], '2026-11-10')

    expect(result.verifiedReversalCount).toBe(3)
    expect(result.thresholdExceeded).toBe(true)
    expect(result.requiresManualReview).toBe(true)
    expect(result.reason).toContain('More than two')
  })

  it('does not count transactions outside the latest three months', () => {
    const result = assessDebitOrderReversals([
      reversal('2026-08-09'),
      reversal('2026-08-10'),
      reversal('2026-11-11'),
    ], '2026-11-10')

    expect(result.verifiedReversalCount).toBe(1)
    expect(result.thresholdExceeded).toBe(false)
  })

  it('does not count unverified candidates but sends them for human review', () => {
    const result = assessDebitOrderReversals([
      reversal('2026-10-01', { verified: false }),
      reversal('2026-10-15', { classification: 'needs_review', verified: false }),
    ], '2026-11-10')

    expect(result.verifiedReversalCount).toBe(0)
    expect(result.unverifiedCandidates).toHaveLength(2)
    expect(result.thresholdExceeded).toBe(false)
    expect(result.requiresManualReview).toBe(true)
  })

  it('ignores refunds and other transactions that are not debit-order reversals', () => {
    const result = assessDebitOrderReversals([
      reversal('2026-09-01', { classification: 'not_a_debit_order_reversal' }),
    ], '2026-11-10')

    expect(result.verifiedReversalCount).toBe(0)
    expect(result.requiresManualReview).toBe(false)
  })

  it('rejects an invalid assessment date', () => {
    expect(() => getThreeMonthAssessmentWindow('10-11-2026')).toThrow()
  })
})
