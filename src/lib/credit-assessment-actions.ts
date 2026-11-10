import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import {
  assignments,
  auditEvents,
  creditAssessmentReports,
  creditAssessmentReportVersions,
  financeApplications,
  users,
} from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { buildCreditAssessmentReport, type CreditAssessmentReport } from './credit-assessment-report'
import { CREDIT_ASSESSMENT_WEIGHTS, type CreditAssessmentDimension } from './credit-assessment'

async function requireCreditAssessment(permission: 'credit_assessments.view' | 'credit_assessments.create' | 'credit_assessments.edit') {
  const session = await getAuthorizationSnapshot()
  // A session with a user id is only returned after Identity authentication and
  // database provisioning. Re-check the authoritative account row for office scope.
  if (!('user' in session) || !session.user?.id) {
    throw new Error('An authorised session is required.')
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
  return rows
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
  reversalReview: z.object({
    verifiedReversalCount: z.number().int().min(0),
    unverifiedCandidateCount: z.number().int().min(0),
    requiresManualReview: z.boolean(),
    explanation: z.string().max(4000).nullable(),
  }),
  overallReviewerSummary: z.string().max(8000),
})

export const saveCreditAssessmentReport = createServerFn({ method: 'POST' })
  .validator((input: unknown) => saveInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireCreditAssessment('credit_assessments.view')
    const application = await assertApplicationScope(data.applicationId, session)
    const dimensionKeys = Object.keys(CREDIT_ASSESSMENT_WEIGHTS)
    if (data.dimensions.some((item) => !dimensionKeys.includes(item.dimension))) {
      throw new Error('The assessment contains an unknown dimension.')
    }
    const report = buildCreditAssessmentReport({
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
      reversalReview: data.reversalReview,
      overallReviewerSummary: data.overallReviewerSummary,
    })

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
    const versions = report
      ? await db.select({
          version: creditAssessmentReportVersions.version,
          status: creditAssessmentReportVersions.status,
          savedBy: creditAssessmentReportVersions.savedBy,
          createdAt: creditAssessmentReportVersions.createdAt,
        }).from(creditAssessmentReportVersions)
          .where(eq(creditAssessmentReportVersions.reportId, report.id))
          .orderBy(desc(creditAssessmentReportVersions.version))
      : []
    const rawReport = report
      ? JSON.parse(JSON.stringify(report.report)) as CreditAssessmentReport
      : null
    const serializableReport = rawReport ? {
      applicationReference: rawReport.applicationReference,
      assessmentDate: rawReport.assessmentDate,
      reviewerName: rawReport.reviewerName,
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
    }
  })
