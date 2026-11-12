/**
 * Oxford's first-stage, bureau-independent credit assessment primitives.
 *
 * This module deliberately does not issue credit decisions or infer a bureau
 * score. It evaluates verified evidence supplied for a specific application.
 * Raw bank-statement extraction and human verification are handled separately.
 */

export const CREDIT_ASSESSMENT_WEIGHTS = {
  verifiedIncomeAndStability: 20,
  affordabilityAndDisposableIncome: 30,
  existingFinancialCommitments: 15,
  bankStatementBehaviour: 15,
  employmentOrBusinessStability: 10,
  documentConsistencyAndVerification: 10,
} as const

export type CreditAssessmentDimension = keyof typeof CREDIT_ASSESSMENT_WEIGHTS
export type CreditAssessmentWeights = Record<CreditAssessmentDimension, number>

export type BankTransactionClassification =
  | 'debit_order_reversal'
  | 'not_a_debit_order_reversal'
  | 'needs_review'

export interface DebitOrderReversalEvidence {
  /** ISO calendar date (YYYY-MM-DD) shown on the bank statement. */
  transactionDate: string
  /** Positive amount in cents; never use floating-point currency values. */
  amountCents: number
  /** Original transaction narrative from the statement. */
  description: string
  /** Internal document identifier, not a filename or personal identifier. */
  sourceDocumentId: string
  classification: BankTransactionClassification
  /** True only after an authorised reviewer has confirmed the classification. */
  verified: boolean
}

export interface DebitOrderReversalAssessment {
  periodStart: string
  periodEnd: string
  verifiedReversalCount: number
  verifiedReversals: DebitOrderReversalEvidence[]
  unverifiedCandidates: DebitOrderReversalEvidence[]
  thresholdExceeded: boolean
  requiresManualReview: boolean
  reason: string | null
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed
}

function subtractCalendarMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const targetMonthStart = new Date(Date.UTC(year, month - months, 1))
  const lastDayOfTargetMonth = new Date(Date.UTC(
    targetMonthStart.getUTCFullYear(),
    targetMonthStart.getUTCMonth() + 1,
    0,
  )).getUTCDate()
  targetMonthStart.setUTCDate(Math.min(day, lastDayOfTargetMonth))
  return targetMonthStart
}

/** Return the latest three-calendar-month window, inclusive of the as-of date. */
export function getThreeMonthAssessmentWindow(asOfDate: string) {
  const end = parseDateOnly(asOfDate)
  if (!end) throw new Error('The assessment date must be a valid YYYY-MM-DD date.')
  return {
    start: subtractCalendarMonths(end, 3).toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

/**
 * Counts only verified debit-order reversals within the latest three months.
 * Unverified candidates trigger human review but are not silently counted.
 * More than two verified reversals triggers Oxford's additional review rule;
 * this rule never automatically declines an applicant.
 */
export function assessDebitOrderReversals(
  evidence: DebitOrderReversalEvidence[],
  asOfDate: string,
): DebitOrderReversalAssessment {
  const window = getThreeMonthAssessmentWindow(asOfDate)
  const inWindow = evidence.filter((item) => {
    const date = parseDateOnly(item.transactionDate)
    return date !== null && item.transactionDate >= window.start && item.transactionDate <= window.end
  })

  const verifiedReversals = inWindow.filter((item) =>
    item.classification === 'debit_order_reversal' && item.verified,
  )
  const unverifiedCandidates = inWindow.filter((item) =>
    item.classification === 'needs_review' ||
    (item.classification === 'debit_order_reversal' && !item.verified),
  )
  const thresholdExceeded = verifiedReversals.length > 2
  const requiresManualReview = thresholdExceeded || unverifiedCandidates.length > 0

  return {
    periodStart: window.start,
    periodEnd: window.end,
    verifiedReversalCount: verifiedReversals.length,
    verifiedReversals,
    unverifiedCandidates,
    thresholdExceeded,
    requiresManualReview,
    reason: thresholdExceeded
      ? 'More than two verified debit-order reversals were recorded in the latest three months.'
      : unverifiedCandidates.length > 0
        ? 'One or more possible debit-order reversals require human verification.'
        : null,
  }
}
