import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import {
  applicationDocuments,
  assignments,
  auditEvents,
  creditAssessmentReports,
  creditAssessmentReportVersions,
  creditAssessmentTransactionEvidence,
  creditAssessmentTransactionEvidenceReviews,
  financeApplications,
  users,
} from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { buildCreditAssessmentReport, type CreditAssessmentReport } from './credit-assessment-report'
import { assessDebitOrderReversals, CREDIT_ASSESSMENT_WEIGHTS, type CreditAssessmentDimension, type DebitOrderReversalEvidence } from './credit-assessment'
import { decryptApplicantData, encryptApplicantData, fingerprintApplicantData } from './pii-crypto.server'

async function requireCreditAssessment(permission: 'credit_assessments.view' | 'credit_assessments.create' | 'credit_assessments.edit') {
  const session = await getAuthorizationSnapshot()
  // Re-check authentication, provisioning, suspension and the authoritative
  // account row on every request. A blocked session must never reach this service.
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'office' || !session.user.id) {
    throw new Error('An active, authorised office account is required.')
  }
  const [account] = await db.select({
    accountType: users.accountType,
    status: users.status,
  }).from(users).where(eq(users.id, session.user.id)).limit(1)
  if (!account || account.accountType !== 'office' || account.status !== 'active') {
    throw new Error('An active, authorised office account is required.')
  }
  if (!session.isSuperAdmin && !session.permissions.includes('office.view')) {
    throw new Error('An active, authorised office account is required.')
  }
  if (!session.isSuperAdmin && !session.permissions.includes(permission)) {
    throw new Error(`Your account does not have the ${permission} permission.`)
  }
  return session
}

type CreditAssessmentSession = Awaited<ReturnType<typeof requireCreditAssessment>>

async function assertApplicationScope(
  applicationId: string,
  session: CreditAssessmentSession,
) {
  const [application] = await db.select({
    id: financeApplications.id,
    reference: financeApplications.reference,
  }).from(financeApplications).where(eq(financeApplications.id, applicationId)).limit(1)
  if (!application) throw new Error('Application not found.')
  if (!session.isSuperAdmin && !session.permissions.includes('applications.assign')) {
    const [assignment] = await db.select({ id: assignments.id })
      .from(assignments)
      .where(and(
        eq(assignments.applicationId, applicationId),
        eq(assignments.assignedTo, session.user.id),
        isNull(assignments.completedAt),
      )).limit(1)
    if (!assignment) throw new Error('You may only assess an application currently assigned to you.')
  }
  return application
}

export const getCreditAssessmentQueue = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await requireCreditAssessment('credit_assessments.view')
  const rows = await db.select({
    id: financeApplications.id,
    reference: financeApplications.reference,
    applicationStatus: financeApplications.status,
    reportStatus: creditAssessmentReports.status,
    updatedAt: creditAssessmentReports.updatedAt,
    latestVersion: creditAssessmentReports.latestVersion,
  }).from(financeApplications)
    .leftJoin(creditAssessmentReports, eq(creditAssessmentReports.applicationId, financeApplications.id))
    .where(session.isSuperAdmin || session.permissions.includes('applications.assign')
      ? undefined
      : sql`${financeApplications.id} in (
          select application_id from assignments
          where assigned_to = ${session.user.id} and completed_at is null
        )`)
    .orderBy(desc(financeApplications.createdAt))
  return {
    applications: rows,
    canCreate: session.isSuperAdmin || session.permissions.includes('credit_assessments.create'),
    canEdit: session.isSuperAdmin || session.permissions.includes('credit_assessments.edit'),
  }
})

const dimensionReviewInput = z.object({
  dimension: z.string(),
  score: z.number().int().nullable(),
  evidenceSummary: z.string().max(4000),
  missingInformation: z.string().max(4000),
  reviewerNote: z.string().max(4000),
})
const saveInput = z.object({
  applicationId: z.string().uuid(),
  assessmentDate: z.string(),
  dimensions: z.array(dimensionReviewInput).length(6),
  overallReviewerSummary: z.string().max(8000),
}).strict()

export const saveCreditAssessmentReport = createServerFn({ method: 'POST' })
  .validator((input: unknown) => saveInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireCreditAssessment('credit_assessments.view')
    const application = await assertApplicationScope(data.applicationId, session)
    const dimensionKeys = Object.keys(CREDIT_ASSESSMENT_WEIGHTS)
    if (data.dimensions.some((item) => !dimensionKeys.includes(item.dimension))) {
      throw new Error('The assessment contains an unknown dimension.')
    }
    return db.transaction(async (tx) => {
      // Lock the application row so first-time saves for the same application serialize.
      const [lockedApplication] = await tx.select({ id: financeApplications.id })
        .from(financeApplications)
        .where(eq(financeApplications.id, application.id))
        .for('update')
        .limit(1)
      if (!lockedApplication) throw new Error('Application not found.')
      const [existing] = await tx.select({
        id: creditAssessmentReports.id,
        latestVersion: creditAssessmentReports.latestVersion,
      }).from(creditAssessmentReports)
        .where(eq(creditAssessmentReports.applicationId, application.id))
        .for('update')
        .limit(1)

      const permission = existing ? 'credit_assessments.edit' : 'credit_assessments.create'
      if (!session.isSuperAdmin && !session.permissions.includes(permission)) {
        throw new Error(`Your account does not have the ${permission} permission.`)
      }

      // Derive reversal counts from persisted, reviewer-classified evidence while
      // the application row is locked. Browser-supplied counts are never trusted.
      const evidenceRows = await tx.select({
        id: creditAssessmentTransactionEvidence.id,
        sourceDocumentId: creditAssessmentTransactionEvidence.sourceDocumentId,
        sourceDocumentApplicationId: applicationDocuments.applicationId,
        sourceDocumentType: applicationDocuments.documentType,
        sourceDocumentStatus: applicationDocuments.status,
        statementPeriodStart: creditAssessmentTransactionEvidence.statementPeriodStart,
        statementPeriodEnd: creditAssessmentTransactionEvidence.statementPeriodEnd,
        transactionDetailsCiphertext: creditAssessmentTransactionEvidence.transactionDetailsCiphertext,
      }).from(creditAssessmentTransactionEvidence)
        .innerJoin(applicationDocuments, eq(applicationDocuments.id, creditAssessmentTransactionEvidence.sourceDocumentId))
        .where(eq(creditAssessmentTransactionEvidence.applicationId, application.id))

      const evidenceIds = evidenceRows.map((item) => item.id)
      const reviewRows = evidenceIds.length
        ? await tx.select({
            evidenceId: creditAssessmentTransactionEvidenceReviews.evidenceId,
            version: creditAssessmentTransactionEvidenceReviews.version,
            classification: creditAssessmentTransactionEvidenceReviews.classification,
            reviewedBy: creditAssessmentTransactionEvidenceReviews.reviewedBy,
            createdAt: creditAssessmentTransactionEvidenceReviews.createdAt,
          }).from(creditAssessmentTransactionEvidenceReviews)
            .where(inArray(creditAssessmentTransactionEvidenceReviews.evidenceId, evidenceIds))
            .orderBy(desc(creditAssessmentTransactionEvidenceReviews.version))
        : []
      const latestReviewByEvidence = new Map<string, (typeof reviewRows)[number]>()
      for (const review of reviewRows) {
        if (!latestReviewByEvidence.has(review.evidenceId)) latestReviewByEvidence.set(review.evidenceId, review)
      }
      const reversalEvidence: DebitOrderReversalEvidence[] = evidenceRows.map((item) => {
        const review = latestReviewByEvidence.get(item.id)
        const decrypted = decryptApplicantData(item.transactionDetailsCiphertext)
        const transactionDate = typeof decrypted.transactionDate === 'string' ? decrypted.transactionDate : ''
        const amountCents = typeof decrypted.amountCents === 'number' ? decrypted.amountCents : 0
        const description = typeof decrypted.description === 'string' ? decrypted.description : ''
        if (!isValidDateOnly(transactionDate) || !Number.isSafeInteger(amountCents) || amountCents <= 0 || !description) {
          throw new Error('Stored bank transaction evidence failed integrity validation.')
        }
        const statementStart = item.statementPeriodStart?.toISOString().slice(0, 10) ?? null
        const statementEnd = item.statementPeriodEnd?.toISOString().slice(0, 10) ?? null
        const statementPeriodValid = Boolean(statementStart && statementEnd && statementStart <= statementEnd && transactionDate >= statementStart && transactionDate <= statementEnd)
        return {
          transactionDate,
          amountCents,
          description,
          sourceDocumentId: item.sourceDocumentId,
          classification: item.sourceDocumentApplicationId === application.id &&
            item.sourceDocumentType === 'bank' && item.sourceDocumentStatus === 'Verified' && statementPeriodValid && review
            ? review.classification as DebitOrderReversalEvidence['classification']
            : 'needs_review',
          verified: item.sourceDocumentApplicationId === application.id &&
            item.sourceDocumentType === 'bank' && item.sourceDocumentStatus === 'Verified' && statementPeriodValid && Boolean(review),
        }
      })
      const reversalAssessment = assessDebitOrderReversals(reversalEvidence, data.assessmentDate)
      const evidenceSnapshot = evidenceRows.map((item) => {
        const review = latestReviewByEvidence.get(item.id)
        const details = decryptApplicantData(item.transactionDetailsCiphertext)
        const transactionDate = typeof details.transactionDate === 'string' ? details.transactionDate : ''
        const statementStart = item.statementPeriodStart?.toISOString().slice(0, 10) ?? null
        const statementEnd = item.statementPeriodEnd?.toISOString().slice(0, 10) ?? null
        const periodValid = Boolean(statementStart && statementEnd && statementStart <= statementEnd && transactionDate >= statementStart && transactionDate <= statementEnd)
        const sourceVerified = item.sourceDocumentApplicationId === application.id && item.sourceDocumentType === 'bank' && item.sourceDocumentStatus === 'Verified' && periodValid
        return {
          evidenceId: item.id,
          sourceDocumentId: item.sourceDocumentId,
          statementPeriodStart: statementStart,
          statementPeriodEnd: statementEnd,
          transactionDate,
          classification: sourceVerified && review ? review.classification as DebitOrderReversalEvidence['classification'] : 'needs_review' as const,
          reviewVersion: review?.version ?? 0,
          reviewerId: sourceVerified ? review?.reviewedBy ?? null : null,
          reviewedAt: sourceVerified ? review?.createdAt.toISOString() ?? null : null,
        }
      })
      const report = buildCreditAssessmentReport({
        evidenceSnapshot,
        applicationReference: application.reference,
        assessmentDate: data.assessmentDate,
        reviewerName: session.user.displayName || session.user.email,
        dimensions: data.dimensions as {
          dimension: CreditAssessmentDimension
          score: number | null
          evidenceSummary: string
          missingInformation: string
          reviewerNote: string
        }[],
        reversalReview: {
          periodStart: reversalAssessment.periodStart,
          periodEnd: reversalAssessment.periodEnd,
          verifiedReversalCount: reversalAssessment.verifiedReversalCount,
          unverifiedCandidateCount: reversalAssessment.unverifiedCandidates.length,
          requiresManualReview: reversalAssessment.requiresManualReview,
          explanation: reversalAssessment.reason,
        },
        overallReviewerSummary: data.overallReviewerSummary,
      })

      const version = (existing?.latestVersion ?? 0) + 1
      const [saved] = existing
        ? await tx.update(creditAssessmentReports).set({
            status: report.status,
            report: report as unknown as Record<string, unknown>,
            latestVersion: version,
            updatedBy: session.user.id,
            updatedAt: new Date(),
          }).where(eq(creditAssessmentReports.id, existing.id)).returning({ id: creditAssessmentReports.id })
        : await tx.insert(creditAssessmentReports).values({
            applicationId: application.id,
            status: report.status,
            report: report as unknown as Record<string, unknown>,
            latestVersion: version,
            createdBy: session.user.id,
            updatedBy: session.user.id,
          }).returning({ id: creditAssessmentReports.id })

      await tx.insert(creditAssessmentReportVersions).values({
        reportId: saved.id,
        applicationId: application.id,
        version,
        status: report.status,
        report: report as unknown as Record<string, unknown>,
        savedBy: session.user.id,
      })
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: existing ? 'credit_assessment.updated' : 'credit_assessment.created',
        resource: 'credit_assessment_report',
        resourceId: saved.id,
        details: {
          applicationReference: application.reference,
          version,
          status: report.status,
          completedDimensions: report.completedDimensions,
        },
      })
      return { success: true as const, reportId: saved.id, version, status: report.status }
    })
  })

function parsePositiveZarCents(value: string): number {
  const [whole, fraction = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error('Enter a transaction amount greater than zero.')
  }
  return cents
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const transactionEvidenceInput = z.object({
  applicationId: z.string().uuid(),
  sourceDocumentId: z.string().uuid(),
  statementPeriodStart: z.string().refine(isValidDateOnly, 'Enter a valid statement start date.'),
  statementPeriodEnd: z.string().refine(isValidDateOnly, 'Enter a valid statement end date.'),
  transactionDate: z.string().refine(isValidDateOnly, 'Enter a valid transaction date.'),
  amount: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter a valid ZAR amount with up to two decimal places.'),
  description: z.string().trim().min(3).max(1000),
})

/** Record a candidate from a verified bank statement; it is unverified by default. */
export const recordDebitOrderTransactionEvidence = createServerFn({ method: 'POST' })
  .validator((input: unknown) => transactionEvidenceInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireCreditAssessment('credit_assessments.create')
    const application = await assertApplicationScope(data.applicationId, session)
    const amountCents = parsePositiveZarCents(data.amount)
    if (data.statementPeriodStart > data.statementPeriodEnd || data.transactionDate < data.statementPeriodStart || data.transactionDate > data.statementPeriodEnd) {
      throw new Error('The transaction date must fall within the statement period, and the period start must not follow its end.')
    }
    const [sourceDocument] = await db.select({
      id: applicationDocuments.id,
    }).from(applicationDocuments).where(and(
      eq(applicationDocuments.id, data.sourceDocumentId),
      eq(applicationDocuments.applicationId, application.id),
      eq(applicationDocuments.documentType, 'bank'),
      eq(applicationDocuments.status, 'Verified'),
    )).limit(1)
    if (!sourceDocument) {
      throw new Error('Select a bank statement for this application that has already been verified by authorised staff.')
    }

    const normalizedDetails = {
      transactionDate: data.transactionDate,
      amountCents,
      description: data.description.trim().replace(/\s+/g, ' ').toUpperCase(),
    }
    const evidenceFingerprint = fingerprintApplicantData(normalizedDetails)
    const transactionDetailsCiphertext = encryptApplicantData({
      transactionDate: data.transactionDate,
      amountCents,
      description: data.description.trim(),
    })
    const evidenceId = await db.transaction(async (tx) => {
      const [saved] = await tx.insert(creditAssessmentTransactionEvidence).values({
        applicationId: application.id,
        sourceDocumentId: sourceDocument.id,
        statementPeriodStart: new Date(`${data.statementPeriodStart}T00:00:00.000Z`),
        statementPeriodEnd: new Date(`${data.statementPeriodEnd}T00:00:00.000Z`),
        initialClassification: 'needs_review',
        transactionDetailsCiphertext,
        evidenceFingerprint,
        createdBy: session.user.id,
      }).onConflictDoNothing().returning({ id: creditAssessmentTransactionEvidence.id })
      if (!saved) throw new Error('This transaction is already recorded against the selected bank statement.')
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'credit_assessment.transaction_evidence_recorded',
        resource: 'credit_assessment_transaction_evidence',
        resourceId: saved.id,
        details: {
          applicationReference: application.reference,
          sourceDocumentId: sourceDocument.id,
          statementPeriodStart: data.statementPeriodStart,
          statementPeriodEnd: data.statementPeriodEnd,
          initialClassification: 'needs_review',
        },
      })
      return saved.id
    })
    return { success: true as const, evidenceId }
  })

const reviewTransactionEvidenceInput = z.object({
  applicationId: z.string().uuid(),
  evidenceId: z.string().uuid(),
  classification: z.enum(['debit_order_reversal', 'not_a_debit_order_reversal']),
  reviewerNote: z.string().trim().min(5, 'Record the reason for this classification.').max(1000),
})

/** A human reviewer adds an immutable classification version; no client count is accepted. */
export const reviewDebitOrderTransactionEvidence = createServerFn({ method: 'POST' })
  .validator((input: unknown) => reviewTransactionEvidenceInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireCreditAssessment('credit_assessments.edit')
    const application = await assertApplicationScope(data.applicationId, session)
    return db.transaction(async (tx) => {
      const [evidence] = await tx.select({
        id: creditAssessmentTransactionEvidence.id,
      }).from(creditAssessmentTransactionEvidence)
        .innerJoin(applicationDocuments, eq(applicationDocuments.id, creditAssessmentTransactionEvidence.sourceDocumentId))
        .where(and(
          eq(creditAssessmentTransactionEvidence.id, data.evidenceId),
          eq(creditAssessmentTransactionEvidence.applicationId, application.id),
          eq(applicationDocuments.applicationId, application.id),
          eq(applicationDocuments.documentType, 'bank'),
          eq(applicationDocuments.status, 'Verified'),
        )).for('update').limit(1)
      if (!evidence) throw new Error('Transaction evidence not found for this application.')

      const [latest] = await tx.select({
        version: creditAssessmentTransactionEvidenceReviews.version,
        classification: creditAssessmentTransactionEvidenceReviews.classification,
      }).from(creditAssessmentTransactionEvidenceReviews)
        .where(eq(creditAssessmentTransactionEvidenceReviews.evidenceId, evidence.id))
        .orderBy(desc(creditAssessmentTransactionEvidenceReviews.version))
        .limit(1)
      const version = (latest?.version ?? 0) + 1
      const [review] = await tx.insert(creditAssessmentTransactionEvidenceReviews).values({
        evidenceId: evidence.id,
        version,
        classification: data.classification,
        reviewerNote: data.reviewerNote,
        reviewedBy: session.user.id,
      }).returning({ id: creditAssessmentTransactionEvidenceReviews.id })
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'credit_assessment.transaction_evidence_reviewed',
        resource: 'credit_assessment_transaction_evidence_review',
        resourceId: review.id,
        details: {
          applicationReference: application.reference,
          evidenceId: evidence.id,
          previousClassification: latest?.classification ?? 'needs_review',
          classification: data.classification,
          reviewerRationale: data.reviewerNote,
          version,
        },
      })
      return { success: true as const, reviewId: review.id, version }
    })
  })

const reportLookupInput = z.object({ applicationId: z.string().uuid() })

export const getCreditAssessmentReport = createServerFn({ method: 'GET' })
  .validator((input: unknown) => reportLookupInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireCreditAssessment('credit_assessments.view')
    const application = await assertApplicationScope(data.applicationId, session)
    const [report] = await db.select({
      id: creditAssessmentReports.id,
      status: creditAssessmentReports.status,
      report: creditAssessmentReports.report,
      latestVersion: creditAssessmentReports.latestVersion,
      updatedAt: creditAssessmentReports.updatedAt,
    }).from(creditAssessmentReports)
      .where(eq(creditAssessmentReports.applicationId, application.id))
      .limit(1)
    const [versions, bankStatementDocuments, evidenceRows] = await Promise.all([
      report
        ? db.select({
            version: creditAssessmentReportVersions.version,
            status: creditAssessmentReportVersions.status,
            savedBy: creditAssessmentReportVersions.savedBy,
            createdAt: creditAssessmentReportVersions.createdAt,
          }).from(creditAssessmentReportVersions)
            .where(eq(creditAssessmentReportVersions.reportId, report.id))
            .orderBy(desc(creditAssessmentReportVersions.version))
        : Promise.resolve([]),
      db.select({
        id: applicationDocuments.id,
        filename: applicationDocuments.originalName,
        uploadedAt: applicationDocuments.uploadedAt,
      }).from(applicationDocuments).where(and(
        eq(applicationDocuments.applicationId, application.id),
        eq(applicationDocuments.documentType, 'bank'),
        eq(applicationDocuments.status, 'Verified'),
      )).orderBy(desc(applicationDocuments.uploadedAt)),
      db.select({
        id: creditAssessmentTransactionEvidence.id,
        sourceDocumentId: creditAssessmentTransactionEvidence.sourceDocumentId,
        sourceDocumentName: applicationDocuments.originalName,
        sourceDocumentStatus: applicationDocuments.status,
        statementPeriodStart: creditAssessmentTransactionEvidence.statementPeriodStart,
        statementPeriodEnd: creditAssessmentTransactionEvidence.statementPeriodEnd,
        transactionDetailsCiphertext: creditAssessmentTransactionEvidence.transactionDetailsCiphertext,
        createdAt: creditAssessmentTransactionEvidence.createdAt,
      }).from(creditAssessmentTransactionEvidence)
        .innerJoin(applicationDocuments, eq(applicationDocuments.id, creditAssessmentTransactionEvidence.sourceDocumentId))
        .where(eq(creditAssessmentTransactionEvidence.applicationId, application.id))
        .orderBy(desc(creditAssessmentTransactionEvidence.createdAt)),
    ])
    const evidenceIds = evidenceRows.map((item) => item.id)
    const reviewRows = evidenceIds.length
      ? await db.select({
          evidenceId: creditAssessmentTransactionEvidenceReviews.evidenceId,
          version: creditAssessmentTransactionEvidenceReviews.version,
          classification: creditAssessmentTransactionEvidenceReviews.classification,
          reviewerNote: creditAssessmentTransactionEvidenceReviews.reviewerNote,
          reviewedBy: creditAssessmentTransactionEvidenceReviews.reviewedBy,
          createdAt: creditAssessmentTransactionEvidenceReviews.createdAt,
        }).from(creditAssessmentTransactionEvidenceReviews)
          .where(inArray(creditAssessmentTransactionEvidenceReviews.evidenceId, evidenceIds))
          .orderBy(desc(creditAssessmentTransactionEvidenceReviews.version))
      : []
    const reviewerIds = [...new Set(reviewRows.map((review) => review.reviewedBy))]
    const reviewerAccounts = reviewerIds.length
      ? await db.select({ id: users.id, displayName: users.displayName, email: users.email })
          .from(users).where(inArray(users.id, reviewerIds))
      : []
    const reviewerNameById = new Map(reviewerAccounts.map((reviewer) => [
      reviewer.id, reviewer.displayName?.trim() || reviewer.email,
    ]))
    const latestReviewByEvidence = new Map<string, (typeof reviewRows)[number]>()
    for (const review of reviewRows) {
      if (!latestReviewByEvidence.has(review.evidenceId)) latestReviewByEvidence.set(review.evidenceId, review)
    }
    const transactionEvidence = evidenceRows.map((item) => {
      const review = latestReviewByEvidence.get(item.id)
      const decrypted = decryptApplicantData(item.transactionDetailsCiphertext)
      const transactionDate = typeof decrypted.transactionDate === 'string' ? decrypted.transactionDate : ''
      const amountCents = typeof decrypted.amountCents === 'number' ? decrypted.amountCents : 0
      const description = typeof decrypted.description === 'string' ? decrypted.description : ''
      if (!isValidDateOnly(transactionDate) || !Number.isSafeInteger(amountCents) || amountCents <= 0 || !description) {
        throw new Error('Stored bank transaction evidence failed integrity validation.')
      }
      return {
        id: item.id,
        sourceDocumentId: item.sourceDocumentId,
        sourceDocumentName: item.sourceDocumentName,
        sourceDocumentStatus: item.sourceDocumentStatus,
        statementPeriodStart: item.statementPeriodStart?.toISOString().slice(0, 10) ?? null,
        statementPeriodEnd: item.statementPeriodEnd?.toISOString().slice(0, 10) ?? null,
        transactionDate,
        amountCents,
        description,
        classification: review?.classification ?? 'needs_review',
        latestReviewVersion: review?.version ?? 0,
        reviewerNote: review?.reviewerNote ?? '',
        reviewedBy: review ? (reviewerNameById.get(review.reviewedBy) ?? review.reviewedBy) : null,
        reviewedAt: review?.createdAt.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      }
    }).sort((left, right) => right.transactionDate.localeCompare(left.transactionDate))
    const rawReport = report
      ? JSON.parse(JSON.stringify(report.report)) as CreditAssessmentReport
      : null
    const serializableReport = rawReport ? {
      applicationReference: rawReport.applicationReference,
      assessmentDate: rawReport.assessmentDate,
      reviewerName: rawReport.reviewerName,
      evidenceSnapshot: rawReport.evidenceSnapshot,
      dimensions: rawReport.dimensions.map((item) => ({
        dimension: item.dimension,
        score: item.score,
        evidenceSummary: item.evidenceSummary,
        missingInformation: item.missingInformation,
        reviewerNote: item.reviewerNote,
      })),
      totalScore: rawReport.totalScore,
      maximumScore: rawReport.maximumScore,
      completedDimensions: rawReport.completedDimensions,
      missingInformation: [...rawReport.missingInformation],
      status: rawReport.status,
      reversalReview: {
        periodStart: rawReport.reversalReview.periodStart,
        periodEnd: rawReport.reversalReview.periodEnd,
        verifiedReversalCount: rawReport.reversalReview.verifiedReversalCount,
        unverifiedCandidateCount: rawReport.reversalReview.unverifiedCandidateCount,
        requiresManualReview: rawReport.reversalReview.requiresManualReview,
        explanation: rawReport.reversalReview.explanation,
      },
      overallReviewerSummary: rawReport.overallReviewerSummary,
      decisionNotice: rawReport.decisionNotice,
    } : null
    return {
      application: { id: application.id, reference: application.reference },
      report: report && serializableReport ? {
        id: report.id,
        status: report.status,
        report: serializableReport,
        latestVersion: report.latestVersion,
        updatedAt: report.updatedAt.toISOString(),
      } : null,
      versions: versions.map((version) => ({
        version: version.version,
        status: version.status,
        savedBy: version.savedBy,
        createdAt: version.createdAt.toISOString(),
      })),
      bankStatementDocuments: bankStatementDocuments.map((document) => ({
        id: document.id,
        filename: document.filename,
        uploadedAt: document.uploadedAt?.toISOString() ?? null,
      })),
      transactionEvidence,
    }
  })
