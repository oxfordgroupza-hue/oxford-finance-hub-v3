import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, max } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { auditEvents, financeApplications, partnerCommercialTerms, partnerRegistrations, referrals, settlementAdjustments, settlementRecords, users } from '../../db/schema'
import { calculateOxfordFees, type PartnerCommercialFeeTerms } from './fee-calculation'
import { getAuthorizationSnapshot } from './auth'
import {
  assertSettlementAdjustmentSequence,
  calculateSettlementAdjustmentDelta,
  sumPartnerNetAdjustmentDeltas,
} from './settlement-adjustments'

// No global rates are used. Settlement calculations require an active, approved
// terms version belonging to the linked merchant partner.

const settlementInput = z.object({
  applicationId: z.string().uuid(),
  settlementReference: z.string().trim().min(3).max(100),
  grossFunderSettlementAmount: z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter a valid gross ZAR settlement amount with up to two decimal places.'),
  settledAt: z.string().datetime(),
})

function toCents(amount: string): number {
  const [whole, fraction = ''] = amount.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Settlement amount is outside the supported range.')
  return cents
}

function feeTermsFromSettlement(record: typeof settlementRecords.$inferSelect): PartnerCommercialFeeTerms | undefined {
  if (!record.partnerCommercialTermsId || record.facilitationRateBps === null ||
      (record.adminFeeMode !== 'percentage' && record.adminFeeMode !== 'fixed')) return undefined
  return {
    termsVersion: record.termsVersion,
    facilitationRateBps: record.facilitationRateBps,
    adminFeeMode: record.adminFeeMode,
    adminRateBps: record.adminRateBps,
    adminFixedAmountCents: record.adminFixedAmountCents,
  }
}

const settlementAdjustmentInput = z.object({
  settlementId: z.string().uuid(),
  adjustmentType: z.enum(['reversal', 'correction']),
  adjustmentReference: z.string().trim().min(3).max(100),
  reason: z.string().trim().min(10).max(1000),
  correctedGrossFunderSettlementAmount: z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/).optional(),
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
    if (data.adjustmentType === 'correction' && !data.correctedGrossFunderSettlementAmount) {
      throw new Error('Enter the corrected gross funder settlement amount before the documentation deduction.')
    }
    if (data.adjustmentType === 'reversal' && data.correctedGrossFunderSettlementAmount) {
      throw new Error('A reversal does not accept a replacement settlement amount.')
    }

    const delta = calculateSettlementAdjustmentDelta({
      original: {
        approvedFinanceAmountCents: original.approvedFinanceAmountCents,
        feeTerms: feeTermsFromSettlement(original),
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
      correctedGrossFunderSettlementAmountCents: data.adjustmentType === 'correction'
        ? toCents(data.correctedGrossFunderSettlementAmount!)
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

const partnerCommercialTermsDraftInput = z.object({
  partnerRegistrationId: z.string().uuid(),
  facilitationRateBps: z.number().int().min(0).max(10_000),
  adminFeeMode: z.enum(['percentage', 'fixed']),
  adminRateBps: z.number().int().min(0).max(10_000),
  adminFixedAmountCents: z.number().int().min(0).nullable().refine((value) => value === null || Number.isSafeInteger(value)),
  rationale: z.string().trim().min(10).max(1000),
}).superRefine((value, context) => {
  if (value.adminFeeMode === 'percentage') {
    if (value.adminFixedAmountCents !== null) {
      context.addIssue({ code: 'custom', path: ['adminFixedAmountCents'], message: 'Percentage terms cannot include a fixed administration amount.' })
    }
    if (value.facilitationRateBps + value.adminRateBps > 10_000) {
      context.addIssue({ code: 'custom', path: ['adminRateBps'], message: 'Combined Oxford percentage fees cannot exceed 100%.' })
    }
  } else {
    if (value.adminRateBps !== 0 || value.adminFixedAmountCents === null) {
      context.addIssue({ code: 'custom', path: ['adminFixedAmountCents'], message: 'Fixed administration terms require a fixed amount and a zero percentage rate.' })
    }
  }
})

export const createPartnerCommercialTermsDraft = createServerFn({ method: 'POST' })
  .validator((input: unknown) => partnerCommercialTermsDraftInput.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' || !session.isSuperAdmin) {
      throw new Error('Only a Super Administrator may configure partner-specific commercial terms.')
    }

    const [partner] = await db.select({
      id: partnerRegistrations.id,
      status: partnerRegistrations.status,
      userStatus: users.status,
      accountType: users.accountType,
    }).from(partnerRegistrations)
      .innerJoin(users, eq(users.id, partnerRegistrations.userId))
      .where(eq(partnerRegistrations.id, data.partnerRegistrationId))
      .limit(1)

    if (!partner || partner.status !== 'Approved' || partner.userStatus !== 'active' || partner.accountType !== 'partner') {
      throw new Error('Commercial terms can only be prepared for an approved, active merchant partner.')
    }

    const [latest] = await db.select({ version: max(partnerCommercialTerms.version) })
      .from(partnerCommercialTerms)
      .where(eq(partnerCommercialTerms.partnerRegistrationId, data.partnerRegistrationId))
    const version = (latest?.version ?? 0) + 1

    const result = await db.transaction(async (tx) => {
      const [draft] = await tx.insert(partnerCommercialTerms).values({
        partnerRegistrationId: data.partnerRegistrationId,
        version,
        status: 'draft',
        facilitationRateBps: data.facilitationRateBps,
        adminFeeMode: data.adminFeeMode,
        adminRateBps: data.adminRateBps,
        adminFixedAmountCents: data.adminFixedAmountCents,
        rationale: data.rationale,
        createdBy: session.user.id,
      }).returning({ id: partnerCommercialTerms.id })

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'partner.commercial_terms.draft_created',
        resource: 'partner_commercial_terms',
        resourceId: draft.id,
        details: {
          partnerRegistrationId: data.partnerRegistrationId,
          version,
          facilitationRateBps: data.facilitationRateBps,
          adminFeeMode: data.adminFeeMode,
          adminRateBps: data.adminRateBps,
          adminFixedAmountCents: data.adminFixedAmountCents,
        },
      })
      return draft.id
    })

    return { success: true, termsId: result, version }
  })

const activatePartnerCommercialTermsInput = z.object({ termsId: z.string().uuid() })

export const activatePartnerCommercialTerms = createServerFn({ method: 'POST' })
  .validator((input: unknown) => activatePartnerCommercialTermsInput.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' || !session.isSuperAdmin) {
      throw new Error('Only a Super Administrator may approve and activate partner commercial terms.')
    }

    const [draft] = await db.select().from(partnerCommercialTerms)
      .where(eq(partnerCommercialTerms.id, data.termsId)).limit(1)
    if (!draft || draft.status !== 'draft') {
      throw new Error('Only a saved draft can be approved and activated.')
    }

    const [partner] = await db.select({
      status: partnerRegistrations.status,
      userStatus: users.status,
      accountType: users.accountType,
    }).from(partnerRegistrations)
      .innerJoin(users, eq(users.id, partnerRegistrations.userId))
      .where(eq(partnerRegistrations.id, draft.partnerRegistrationId))
      .limit(1)
    if (!partner || partner.status !== 'Approved' || partner.userStatus !== 'active' || partner.accountType !== 'partner') {
      throw new Error('The merchant partner must remain approved and active before terms can be activated.')
    }

    const approvedAt = new Date()
    await db.transaction(async (tx) => {
      const [current] = await tx.select({
        id: partnerCommercialTerms.id,
        version: partnerCommercialTerms.version,
      }).from(partnerCommercialTerms)
        .where(and(
          eq(partnerCommercialTerms.partnerRegistrationId, draft.partnerRegistrationId),
          eq(partnerCommercialTerms.status, 'active'),
        ))
        .limit(1)

      if (current && draft.version <= current.version) {
        throw new Error('An older partner terms version cannot replace a newer active version. Create a new draft instead.')
      }
      if (current) {
        await tx.update(partnerCommercialTerms)
          .set({ status: 'superseded' })
          .where(and(
            eq(partnerCommercialTerms.id, current.id),
            eq(partnerCommercialTerms.status, 'active'),
          ))
      }

      const [activated] = await tx.update(partnerCommercialTerms).set({
        status: 'active',
        approvedBy: session.user.id,
        approvedAt,
      }).where(and(
        eq(partnerCommercialTerms.id, draft.id),
        eq(partnerCommercialTerms.status, 'draft'),
      )).returning({ id: partnerCommercialTerms.id })
      if (!activated) {
        throw new Error('This draft has already been activated or is no longer available.')
      }

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'partner.commercial_terms.activated',
        resource: 'partner_commercial_terms',
        resourceId: draft.id,
        details: {
          partnerRegistrationId: draft.partnerRegistrationId,
          previousVersion: current?.version ?? null,
          activeVersion: draft.version,
        },
      })
    })

    return { success: true, termsId: draft.id, version: draft.version }
  })

export const getSettlementWorkspaceData = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'office' ||
      (!session.isSuperAdmin && !session.permissions.includes('settlements.view'))) {
    throw new Error('You do not have permission to view settlement records.')
  }

  const [eligibleApplications, records, adjustments, activeTerms, approvedPartners, partnerTerms] = await Promise.all([
    db.select({
      id: financeApplications.id,
      reference: financeApplications.reference,
      financeAmount: financeApplications.financeAmount,
      partnerRegistrationId: partnerRegistrations.id,
      partnerBusinessName: partnerRegistrations.businessName,
    }).from(financeApplications)
      .innerJoin(referrals, eq(referrals.applicationId, financeApplications.id))
      .innerJoin(partnerRegistrations, and(
        eq(partnerRegistrations.userId, referrals.partnerUserId),
        eq(partnerRegistrations.referralCode, referrals.code),
      ))
      .innerJoin(users, eq(users.id, partnerRegistrations.userId))
      .where(and(
        eq(financeApplications.providerDecision, 'approved'),
        eq(partnerRegistrations.status, 'Approved'),
        eq(users.status, 'active'),
        eq(users.accountType, 'partner'),
      ))
      .orderBy(desc(financeApplications.updatedAt))
      .limit(250),
    db.select().from(settlementRecords).orderBy(desc(settlementRecords.settledAt)).limit(500),
    db.select().from(settlementAdjustments).orderBy(desc(settlementAdjustments.createdAt)).limit(1000),
    db.select({ partnerRegistrationId: partnerCommercialTerms.partnerRegistrationId })
      .from(partnerCommercialTerms)
      .where(eq(partnerCommercialTerms.status, 'active')),
    session.isSuperAdmin
      ? db.select({
          id: partnerRegistrations.id,
          businessName: partnerRegistrations.businessName,
        }).from(partnerRegistrations)
          .innerJoin(users, eq(users.id, partnerRegistrations.userId))
          .where(and(
            eq(partnerRegistrations.status, 'Approved'),
            eq(users.status, 'active'),
            eq(users.accountType, 'partner'),
          ))
      : Promise.resolve([]),
    session.isSuperAdmin
      ? db.select({
          id: partnerCommercialTerms.id,
          partnerRegistrationId: partnerCommercialTerms.partnerRegistrationId,
          partnerBusinessName: partnerRegistrations.businessName,
          version: partnerCommercialTerms.version,
          status: partnerCommercialTerms.status,
          facilitationRateBps: partnerCommercialTerms.facilitationRateBps,
          adminFeeMode: partnerCommercialTerms.adminFeeMode,
          adminRateBps: partnerCommercialTerms.adminRateBps,
          adminFixedAmountCents: partnerCommercialTerms.adminFixedAmountCents,
          rationale: partnerCommercialTerms.rationale,
          createdAt: partnerCommercialTerms.createdAt,
          approvedAt: partnerCommercialTerms.approvedAt,
        }).from(partnerCommercialTerms)
          .innerJoin(partnerRegistrations, eq(partnerRegistrations.id, partnerCommercialTerms.partnerRegistrationId))
          .orderBy(desc(partnerCommercialTerms.createdAt))
          .limit(500)
      : Promise.resolve([]),
  ])

  const activePartnerIds = new Set(activeTerms.map((terms) => terms.partnerRegistrationId))
  const alreadySettled = new Set(records.map((record) => record.applicationId))

  return {
    isSuperAdmin: session.isSuperAdmin,
    approvedPartners,
    partnerTerms,
    eligibleApplications: eligibleApplications.filter((application) =>
      !alreadySettled.has(application.id) && activePartnerIds.has(application.partnerRegistrationId)),
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

    const [application] = await db.select({
      id: financeApplications.id,
      reference: financeApplications.reference,
      financeAmount: financeApplications.financeAmount,
      partnerUserId: referrals.partnerUserId,
      partnerRegistrationId: partnerRegistrations.id,
      partnerBusinessName: partnerRegistrations.businessName,
    }).from(financeApplications)
      .innerJoin(referrals, eq(referrals.applicationId, financeApplications.id))
      .innerJoin(partnerRegistrations, and(
        eq(partnerRegistrations.userId, referrals.partnerUserId),
        eq(partnerRegistrations.referralCode, referrals.code),
      ))
      .innerJoin(users, eq(users.id, partnerRegistrations.userId))
      .where(and(
        eq(financeApplications.id, data.applicationId),
        eq(financeApplications.providerDecision, 'approved'),
        eq(partnerRegistrations.status, 'Approved'),
        eq(users.status, 'active'),
        eq(users.accountType, 'partner'),
      ))
      .limit(1)

    if (!application || !application.financeAmount || application.financeAmount <= 0) {
      throw new Error('An approved application linked to an approved, active merchant partner and a valid approved amount is required.')
    }

    const [terms] = await db.select().from(partnerCommercialTerms)
      .where(and(
        eq(partnerCommercialTerms.partnerRegistrationId, application.partnerRegistrationId),
        eq(partnerCommercialTerms.status, 'active'),
      ))
      .limit(1)
    if (!terms) {
      throw new Error('This merchant partner has no active approved commercial terms. A Super Administrator must configure and activate partner-specific terms first.')
    }

    const feeTerms: PartnerCommercialFeeTerms = {
      termsVersion: `partner-${application.partnerRegistrationId}-v${terms.version}`,
      facilitationRateBps: terms.facilitationRateBps,
      adminFeeMode: terms.adminFeeMode as PartnerCommercialFeeTerms['adminFeeMode'],
      adminRateBps: terms.adminRateBps,
      adminFixedAmountCents: terms.adminFixedAmountCents,
    }
    const approvedFinanceAmountCents = application.financeAmount * 100
    if (!Number.isSafeInteger(approvedFinanceAmountCents)) {
      throw new Error('The approved finance amount exceeds the supported calculation range.')
    }
    // This input is the gross funder settlement before the 1% documentation deduction.
    const grossFunderSettlementAmountCents = toCents(data.grossFunderSettlementAmount)
    const settledAt = new Date(data.settledAt)
    if (!Number.isFinite(settledAt.getTime()) || settledAt.getTime() > Date.now()) {
      throw new Error('The funder settlement date must be valid and cannot be in the future.')
    }

    const fees = calculateOxfordFees(approvedFinanceAmountCents, grossFunderSettlementAmountCents, feeTerms)
    const settlementId = await db.transaction(async (tx) => {
      const [record] = await tx.insert(settlementRecords).values({
        applicationId: application.id,
        partnerRegistrationId: application.partnerRegistrationId,
        partnerCommercialTermsId: terms.id,
        partnerUserId: application.partnerUserId,
        applicationReferenceSnapshot: application.reference,
        partnerBusinessNameSnapshot: application.partnerBusinessName,
        settlementReference: data.settlementReference,
        currency: 'ZAR',
        approvedFinanceAmountCents: fees.approvedFinanceAmountCents,
        actualFunderSettlementAmountCents: grossFunderSettlementAmountCents,
        documentationFeeRateBps: fees.documentationFeeRateBps,
        documentationFeeCents: fees.documentationFeeCents,
        partnerGrossPayableCents: fees.partnerGrossPayableCents,
        facilitationRateBps: fees.facilitationRateBps,
        facilitationFeeCents: fees.facilitationFeeCents,
        adminFeeMode: fees.adminFeeMode,
        adminFixedAmountCents: fees.adminFixedAmountCents,
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
          partnerCommercialTermsId: terms.id,
          termsVersion: fees.termsVersion,
          documentationFeeRateBps: fees.documentationFeeRateBps,
          facilitationRateBps: fees.facilitationRateBps,
          adminFeeMode: fees.adminFeeMode,
          adminRateBps: fees.adminRateBps,
          adminFixedAmountCents: fees.adminFixedAmountCents,
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
  const [confirmed, approvedApplications, adjustments, activeTerms] = await Promise.all([
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
    db.select({
      partnerRegistrationId: partnerCommercialTerms.partnerRegistrationId,
      version: partnerCommercialTerms.version,
      facilitationRateBps: partnerCommercialTerms.facilitationRateBps,
      adminFeeMode: partnerCommercialTerms.adminFeeMode,
      adminRateBps: partnerCommercialTerms.adminRateBps,
      adminFixedAmountCents: partnerCommercialTerms.adminFixedAmountCents,
    }).from(partnerCommercialTerms)
      .innerJoin(partnerRegistrations, eq(partnerRegistrations.id, partnerCommercialTerms.partnerRegistrationId))
      .where(and(
        eq(partnerRegistrations.userId, session.user.id),
        eq(partnerRegistrations.status, 'Approved'),
        eq(partnerCommercialTerms.status, 'active'),
      ))
      .limit(1),
  ])

  const adjustmentsBySettlement = sumPartnerNetAdjustmentDeltas(adjustments)
  const confirmedApplicationIds = new Set(confirmed.map((item) => item.applicationId))
  const activeTermsRow = activeTerms[0]
  const feeTerms: PartnerCommercialFeeTerms | undefined = activeTermsRow ? {
    termsVersion: `partner-${activeTermsRow.partnerRegistrationId}-v${activeTermsRow.version}`,
    facilitationRateBps: activeTermsRow.facilitationRateBps,
    adminFeeMode: activeTermsRow.adminFeeMode as PartnerCommercialFeeTerms['adminFeeMode'],
    adminRateBps: activeTermsRow.adminRateBps,
    adminFixedAmountCents: activeTermsRow.adminFixedAmountCents,
  } : undefined
  const expected = feeTerms ? approvedApplications
    .filter((item) => !confirmedApplicationIds.has(item.id) &&
      Number.isSafeInteger((item.financeAmount ?? 0) * 100) && (item.financeAmount ?? 0) > 0)
    .map((item) => {
      const approvedAmountCents = (item.financeAmount ?? 0) * 100
      try {
        return {
          applicationReference: item.reference,
          expectedNetPayableCents: calculateOxfordFees(approvedAmountCents, approvedAmountCents, feeTerms).partnerNetPayableCents,
          approvedAt: item.approvedAt,
        }
      } catch {
        return {
          applicationReference: item.reference,
          expectedNetPayableCents: null,
          approvedAt: item.approvedAt,
        }
      }
    }) : []

  return {
    termsPendingApproval: !feeTerms,
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
