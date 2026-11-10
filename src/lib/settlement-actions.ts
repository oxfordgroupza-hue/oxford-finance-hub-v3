import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { auditEvents, financeApplications, partnerRegistrations, referrals, settlementAdjustments, settlementRecords } from '../../db/schema'
import { calculateOxfordFees } from './fee-calculation'
import { getAuthorizationSnapshot } from './auth'
import {
  assertSettlementAdjustmentSequence,
  calculateSettlementAdjustmentDelta,
  sumPartnerNetAdjustmentDeltas,
} from './settlement-adjustments'

// Partner payout distribution and the admin-fee tiers remain subject to Oxford's
// explicit commercial approval. Do not persist or display payable estimates yet.
const OXFORD_SETTLEMENT_TERMS_APPROVED = false

const settlementInput = z.object({
  applicationId: z.string().uuid(),
  settlementReference: z.string().trim().min(3).max(100),
  actualFunderSettlementAmount: z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter a valid ZAR amount with up to two decimal places.'),
  settledAt: z.string().datetime(),
})

function toCents(amount: string): number {
  const [whole, fraction = ''] = amount.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Settlement amount is outside the supported range.')
  return cents
}


const settlementAdjustmentInput = z.object({
  settlementId: z.string().uuid(),
  adjustmentType: z.enum(['reversal', 'correction']),
  adjustmentReference: z.string().trim().min(3).max(100),
  reason: z.string().trim().min(10).max(1000),
  correctedActualFunderSettlementAmount: z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/).optional(),
})

export const recordSettlementAdjustment = createServerFn({ method: 'POST' })
  .validator((input: unknown) => settlementAdjustmentInput.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' || !session.isSuperAdmin) {
      throw new Error('Only a Super Administrator may reverse or correct a confirmed settlement.')
    }

    const [original] = await db.select().from(settlementRecords)
      .where(eq(settlementRecords.id, data.settlementId)).limit(1)
    if (!original) throw new Error('The confirmed settlement could not be found.')

    const existing = await db.select().from(settlementAdjustments)
      .where(eq(settlementAdjustments.settlementId, original.id))
    assertSettlementAdjustmentSequence(
      existing.map((item) => item.adjustmentType as 'reversal' | 'correction'),
      data.adjustmentType,
    )

    const priorCorrection = existing.find((item) => item.adjustmentType === 'correction')
    if (data.adjustmentType === 'correction' && !data.correctedActualFunderSettlementAmount) {
      throw new Error('Enter the corrected actual funder settlement amount.')
    }
    if (data.adjustmentType === 'reversal' && data.correctedActualFunderSettlementAmount) {
      throw new Error('A reversal does not accept a replacement settlement amount.')
    }

    const delta = calculateSettlementAdjustmentDelta({
      original: {
        approvedFinanceAmountCents: original.approvedFinanceAmountCents,
        actual: original.actualFunderSettlementAmountCents,
        documentation: original.documentationFeeCents,
        gross: original.partnerGrossPayableCents,
        facilitation: original.facilitationFeeCents,
        admin: original.adminFeeCents,
        net: original.partnerNetPayableCents,
        oxford: original.oxfordTotalFeesCents,
      },
      priorCorrection: priorCorrection ? {
        actual: priorCorrection.actualFunderSettlementDeltaCents,
        documentation: priorCorrection.documentationFeeDeltaCents,
        gross: priorCorrection.partnerGrossDeltaCents,
        facilitation: priorCorrection.facilitationFeeDeltaCents,
        admin: priorCorrection.adminFeeDeltaCents,
        net: priorCorrection.partnerNetDeltaCents,
        oxford: priorCorrection.oxfordTotalFeesDeltaCents,
      } : null,
      adjustmentType: data.adjustmentType,
      correctedActualFunderSettlementAmountCents: data.adjustmentType === 'correction'
        ? toCents(data.correctedActualFunderSettlementAmount!)
        : undefined,
    })

    const result = await db.transaction(async (tx) => {
      const [record] = await tx.insert(settlementAdjustments).values({
        settlementId: original.id,
        applicationId: original.applicationId,
        partnerUserId: original.partnerUserId,
        adjustmentReference: data.adjustmentReference,
        adjustmentType: data.adjustmentType,
        reason: data.reason,
        actualFunderSettlementDeltaCents: delta.actual,
        documentationFeeDeltaCents: delta.documentation,
        partnerGrossDeltaCents: delta.gross,
        facilitationFeeDeltaCents: delta.facilitation,
        adminFeeDeltaCents: delta.admin,
        partnerNetDeltaCents: delta.net,
        oxfordTotalFeesDeltaCents: delta.oxford,
        recordedBy: session.user.id,
      }).returning({ id: settlementAdjustments.id })
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: data.adjustmentType === 'reversal' ? 'settlement.reversed' : 'settlement.corrected',
        resource: 'settlement_adjustment',
        resourceId: record.id,
        details: {
          settlementId: original.id,
          adjustmentReference: data.adjustmentReference,
          reason: data.reason,
          partnerUserId: original.partnerUserId,
        },
      })
      return record.id
    })
    return { success: true, adjustmentId: result }
  })

export const getSettlementWorkspaceData = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'office' ||
      (!session.isSuperAdmin && !session.permissions.includes('settlements.view'))) {
    throw new Error('You do not have permission to view settlement records.')
  }

  const eligibleApplications = await db.select({
    id: financeApplications.id,
    reference: financeApplications.reference,
    financeAmount: financeApplications.financeAmount,
    partnerBusinessName: partnerRegistrations.businessName,
  }).from(financeApplications)
    .innerJoin(referrals, eq(referrals.applicationId, financeApplications.id))
    .innerJoin(partnerRegistrations, and(
      eq(partnerRegistrations.userId, referrals.partnerUserId),
      eq(partnerRegistrations.referralCode, referrals.code),
    ))
    .where(and(
      eq(financeApplications.providerDecision, 'approved'),
      eq(partnerRegistrations.status, 'Approved'),
    ))
    .orderBy(desc(financeApplications.updatedAt))
    .limit(250)

  const [records, adjustments] = await Promise.all([
    db.select().from(settlementRecords).orderBy(desc(settlementRecords.settledAt)).limit(500),
    db.select().from(settlementAdjustments).orderBy(desc(settlementAdjustments.createdAt)).limit(1000),
  ])
  const alreadySettled = new Set(records.map((record) => record.applicationId))

  return {
    isSuperAdmin: session.isSuperAdmin,
    eligibleApplications: eligibleApplications.filter((application) => !alreadySettled.has(application.id)),
    records,
    adjustments,
  }
})

export const recordConfirmedSettlement = createServerFn({ method: 'POST' })
  .validator((input: unknown) => settlementInput.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' ||
        (!session.isSuperAdmin && !session.permissions.includes('settlements.create'))) {
      throw new Error('You do not have permission to record a confirmed settlement.')
    }
    if (!OXFORD_SETTLEMENT_TERMS_APPROVED) {
      throw new Error('Settlement recording is paused until Oxford approves the partner payout and administration fee terms.')
    }

    const [application] = await db.select({
      id: financeApplications.id,
      reference: financeApplications.reference,
      financeAmount: financeApplications.financeAmount,
      providerDecision: financeApplications.providerDecision,
      partnerUserId: referrals.partnerUserId,
      partnerRegistrationId: partnerRegistrations.id,
      partnerBusinessName: partnerRegistrations.businessName,
      partnerStatus: partnerRegistrations.status,
    }).from(financeApplications)
      .innerJoin(referrals, eq(referrals.applicationId, financeApplications.id))
      .innerJoin(partnerRegistrations, and(
        eq(partnerRegistrations.userId, referrals.partnerUserId),
        eq(partnerRegistrations.referralCode, referrals.code),
      ))
      .where(and(
        eq(financeApplications.id, data.applicationId),
        eq(financeApplications.providerDecision, 'approved'),
        eq(partnerRegistrations.status, 'Approved'),
      ))
      .limit(1)

    if (!application || !application.financeAmount || application.financeAmount <= 0) {
      throw new Error('An approved application linked to an approved merchant partner and a valid approved amount is required.')
    }

    const approvedFinanceAmountCents = application.financeAmount * 100
    if (!Number.isSafeInteger(approvedFinanceAmountCents)) {
      throw new Error('The approved finance amount exceeds the supported calculation range.')
    }
    const actualFunderSettlementAmountCents = toCents(data.actualFunderSettlementAmount)
    const settledAt = new Date(data.settledAt)
    if (!Number.isFinite(settledAt.getTime()) || settledAt.getTime() > Date.now()) {
      throw new Error('The funder settlement date must be valid and cannot be in the future.')
    }

    const fees = calculateOxfordFees(approvedFinanceAmountCents, actualFunderSettlementAmountCents)
    const settlementId = await db.transaction(async (tx) => {
      const [record] = await tx.insert(settlementRecords).values({
      applicationId: application.id,
      partnerRegistrationId: application.partnerRegistrationId,
      partnerUserId: application.partnerUserId,
      applicationReferenceSnapshot: application.reference,
      partnerBusinessNameSnapshot: application.partnerBusinessName,
      settlementReference: data.settlementReference,
      currency: 'ZAR',
      approvedFinanceAmountCents: fees.approvedFinanceAmountCents,
      actualFunderSettlementAmountCents,
      documentationFeeCents: fees.documentationFeeCents,
      partnerGrossPayableCents: fees.partnerGrossPayableCents,
      facilitationFeeCents: fees.facilitationFeeCents,
      adminFeeCents: fees.adminFeeCents,
      partnerNetPayableCents: fees.partnerNetPayableCents,
      oxfordTotalFeesCents: fees.oxfordTotalFeesCents,
      adminRateBps: fees.adminRateBps,
      termsVersion: fees.termsVersion,
      settledAt,
      recordedBy: session.user.id,
    }).returning({ id: settlementRecords.id })

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'settlement.confirmed_and_recorded',
        resource: 'settlement',
        resourceId: record.id,
        details: {
          applicationReference: application.reference,
          settlementReference: data.settlementReference,
          partnerUserId: application.partnerUserId,
          termsVersion: fees.termsVersion,
        },
      })
      return record.id
    })

    return { success: true, settlementId }
  })

export const getMyPartnerPayouts = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'partner' || !session.permissions.includes('own_payouts.view')) {
    throw new Error('You do not have permission to view partner payouts.')
  }

  // Only the signed-in partner's own net figures are returned. No Oxford fee
  // components, gross amounts or other partners' records leave the server.
  const [confirmed, approvedApplications, adjustments] = await Promise.all([
    db.select({
      id: settlementRecords.id,
      applicationId: settlementRecords.applicationId,
      settlementReference: settlementRecords.settlementReference,
      applicationReference: settlementRecords.applicationReferenceSnapshot,
      partnerNetPayableCents: settlementRecords.partnerNetPayableCents,
      currency: settlementRecords.currency,
      settledAt: settlementRecords.settledAt,
    }).from(settlementRecords)
      .where(eq(settlementRecords.partnerUserId, session.user.id))
      .orderBy(desc(settlementRecords.settledAt))
      .limit(250),
    db.select({
      id: financeApplications.id,
      reference: financeApplications.reference,
      financeAmount: financeApplications.financeAmount,
      approvedAt: financeApplications.updatedAt,
    }).from(financeApplications)
      .innerJoin(referrals, eq(referrals.applicationId, financeApplications.id))
      .where(and(
        eq(referrals.partnerUserId, session.user.id),
        eq(financeApplications.providerDecision, 'approved'),
      ))
      .orderBy(desc(financeApplications.updatedAt))
      .limit(250),
    db.select({
      settlementId: settlementAdjustments.settlementId,
      adjustmentReference: settlementAdjustments.adjustmentReference,
      adjustmentType: settlementAdjustments.adjustmentType,
      partnerNetDeltaCents: settlementAdjustments.partnerNetDeltaCents,
      createdAt: settlementAdjustments.createdAt,
    }).from(settlementAdjustments)
      .where(eq(settlementAdjustments.partnerUserId, session.user.id))
      .orderBy(desc(settlementAdjustments.createdAt))
      .limit(500),
  ])

  const adjustmentsBySettlement = sumPartnerNetAdjustmentDeltas(adjustments)
  const confirmedApplicationIds = new Set(confirmed.map((item) => item.applicationId))
  const expected = OXFORD_SETTLEMENT_TERMS_APPROVED ? approvedApplications
    .filter((item) => !confirmedApplicationIds.has(item.id) &&
      Number.isSafeInteger((item.financeAmount ?? 0) * 100) && (item.financeAmount ?? 0) > 0)
    .map((item) => ({
      applicationReference: item.reference,
      expectedNetPayableCents: calculateOxfordFees((item.financeAmount ?? 0) * 100).partnerNetPayableCents,
      approvedAt: item.approvedAt,
    })) : []

  return {
    termsPendingApproval: !OXFORD_SETTLEMENT_TERMS_APPROVED,
    expected,
    confirmed: confirmed.map((item) => ({
      settlementReference: item.settlementReference,
      applicationReference: item.applicationReference,
      partnerNetPayableCents: item.partnerNetPayableCents + (adjustmentsBySettlement.get(item.id) ?? 0),
      currency: item.currency,
      settledAt: item.settledAt,
    })),
  }
})
