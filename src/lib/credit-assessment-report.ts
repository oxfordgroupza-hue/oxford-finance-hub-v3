import { CREDIT_ASSESSMENT_WEIGHTS, type CreditAssessmentDimension } from './credit-assessment'

export type CreditAssessmentReviewStatus = 'not_started' | 'in_progress' | 'ready_for_human_decision'

export interface CreditAssessmentDimensionReview {
  dimension: CreditAssessmentDimension
  score: number | null
  evidenceSummary: string
  missingInformation: string
  reviewerNote: string
}

export interface CreditAssessmentEvidenceSnapshot {
  evidenceId: string
  sourceDocumentId: string
  statementPeriodStart: string | null
  statementPeriodEnd: string | null
  transactionDate: string
  classification: 'needs_review' | 'debit_order_reversal' | 'not_a_debit_order_reversal'
  reviewVersion: number
  reviewerId: string | null
  reviewedAt: string | null
}

export interface CreditAssessmentReportInput {
  evidenceSnapshot?: CreditAssessmentEvidenceSnapshot[]
  applicationReference: string
  assessmentDate: string
  reviewerName: string
  dimensions: CreditAssessmentDimensionReview[]
  reversalReview: {
    periodStart: string
    periodEnd: string
    verifiedReversalCount: number
    unverifiedCandidateCount: number
    requiresManualReview: boolean
    explanation: string | null
  }
  overallReviewerSummary: string
}

export interface CreditAssessmentReport {
  applicationReference: string
  assessmentDate: string
  reviewerName: string
  dimensions: CreditAssessmentDimensionReview[]
  totalScore: number | null
  maximumScore: 100
  completedDimensions: number
  missingInformation: string[]
  status: CreditAssessmentReviewStatus
  reversalReview: CreditAssessmentReportInput['reversalReview']
  evidenceSnapshot: CreditAssessmentEvidenceSnapshot[]
  overallReviewerSummary: string
  decisionNotice: string
}

/**
 * Builds a transparent reviewer worksheet. Scores are entered by an authorised
 * human; this function never infers scores or recommends approval/decline.
 */
export function buildCreditAssessmentReport(
  input: CreditAssessmentReportInput,
): CreditAssessmentReport {
  if (!/^OBG-[A-Z0-9-]{4,40}$/i.test(input.applicationReference.trim())) {
    throw new Error('A valid Oxford application reference is required.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.assessmentDate) ||
      Number.isNaN(Date.parse(`${input.assessmentDate}T00:00:00.000Z`)) ||
      new Date(`${input.assessmentDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== input.assessmentDate) {
    throw new Error('The assessment date must be a valid YYYY-MM-DD date.')
  }
  if (!input.reviewerName.trim()) throw new Error('The reviewer name is required.')

  for (const [field, value] of [
    ['verified reversal count', input.reversalReview.verifiedReversalCount],
    ['unverified reversal candidate count', input.reversalReview.unverifiedCandidateCount],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`The ${field} must be a non-negative whole number.`)
    }
  }

  const dimensions = Object.keys(CREDIT_ASSESSMENT_WEIGHTS) as CreditAssessmentDimension[]
  const byDimension = new Map(input.dimensions.map((item) => [item.dimension, item]))
  if (byDimension.size !== dimensions.length || input.dimensions.length !== dimensions.length ||
      dimensions.some((key) => !byDimension.has(key))) {
    throw new Error('Provide exactly one review entry for each assessment dimension.')
  }

  const reviewed = dimensions.map((dimension) => {
    const item = byDimension.get(dimension)!
    const maximum = CREDIT_ASSESSMENT_WEIGHTS[dimension]
    if (item.score !== null && (!Number.isInteger(item.score) || item.score < 0 || item.score > maximum)) {
      throw new Error(`The score for ${dimension} must be between 0 and ${maximum}.`)
    }
    return {
      ...item,
      evidenceSummary: item.evidenceSummary.trim(),
      missingInformation: item.missingInformation.trim(),
      reviewerNote: item.reviewerNote.trim(),
    }
  })

  const completedDimensions = reviewed.filter((item) => item.score !== null).length
  const allEvidenceSummarised = reviewed.every((item) => item.evidenceSummary.length > 0)
  const missingInformation = reviewed
    .filter((item) => item.missingInformation.length > 0)
    .map((item) => `${item.dimension}: ${item.missingInformation}`)
  const scoreComplete = completedDimensions === dimensions.length
  // The reversal threshold is a hard review gate even if a caller accidentally
  // supplies an inconsistent requiresManualReview flag.
  const reversalNeedsReview = input.reversalReview.requiresManualReview ||
    input.reversalReview.unverifiedCandidateCount > 0 ||
    input.reversalReview.verifiedReversalCount > 2
  const status: CreditAssessmentReviewStatus = !completedDimensions
    ? 'not_started'
    : scoreComplete && allEvidenceSummarised && !missingInformation.length && !reversalNeedsReview
      ? 'ready_for_human_decision'
      : 'in_progress'

  return {
    applicationReference: input.applicationReference.trim(),
    assessmentDate: input.assessmentDate,
    reviewerName: input.reviewerName.trim(),
    dimensions: reviewed,
    totalScore: scoreComplete
      ? reviewed.reduce((total, item) => total + (item.score ?? 0), 0)
      : null,
    maximumScore: 100,
    completedDimensions,
    missingInformation,
    status,
    reversalReview: {
      ...input.reversalReview,
      explanation: input.reversalReview.explanation?.trim() || null,
    },
    evidenceSnapshot: input.evidenceSnapshot ?? [],
    overallReviewerSummary: input.overallReviewerSummary.trim(),
    decisionNotice: 'This is an internal evidence summary only. It does not approve, decline, pre-approve or guarantee finance. A separately authorised human decision is required.',
  }
}
