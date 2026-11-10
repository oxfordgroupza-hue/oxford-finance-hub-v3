import { createServerFn } from '@tanstack/react-start'
import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import {
  auditEvents,
  financeApplications,
  partnerRegistrations,
  referrals,
  roles,
  staffRoles,
  users,
} from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'

export const getPartnerWorkspaceData = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'partner' || !session.permissions.includes('partner_referrals.view')) {
    throw new Error('An approved partner account is required to access this workspace.')
  }

  const [registration] = await db.select({
    id: partnerRegistrations.id,
    businessName: partnerRegistrations.businessName,
    contactName: partnerRegistrations.contactName,
    email: partnerRegistrations.email,
    phone: partnerRegistrations.phone,
    status: partnerRegistrations.status,
    referralCode: partnerRegistrations.referralCode,
    canUploadSupportingDocuments: partnerRegistrations.canUploadSupportingDocuments,
  }).from(partnerRegistrations)
    .where(eq(partnerRegistrations.userId, session.user.id))
    .orderBy(desc(partnerRegistrations.createdAt))
    .limit(1)
  if (!registration) throw new Error('Your partner account is not linked to a partner registration. Please contact Oxford Business Group.')

  const referredApplications = await db.select({
    id: referrals.id,
    applicationId: financeApplications.id,
    applicantType: financeApplications.applicantType,
    reference: financeApplications.reference,
    status: financeApplications.status,
    category: financeApplications.category,
    submittedAt: financeApplications.submittedAt,
    referredAt: referrals.referredAt,
  }).from(referrals)
    .innerJoin(financeApplications, eq(referrals.applicationId, financeApplications.id))
    .where(eq(referrals.partnerUserId, session.user.id))
    .orderBy(desc(referrals.referredAt))
    .limit(250)

  const siteUrl = process.env.DEPLOY_PRIME_URL || process.env.URL
  const referralUrl = registration.status === 'Approved' && registration.referralCode && siteUrl
    ? new URL(`/apply?ref=${encodeURIComponent(registration.referralCode)}`, siteUrl).toString()
    : null
  return {
    partner: registration,
    referrals: registration.status === 'Approved' ? referredApplications : [],
    referralUrl,
  }
})

const partnerDecisionInput = z.object({
  registrationId: z.string().uuid(),
  status: z.enum(['Approved', 'Declined', 'Suspended']),
})

export const decidePartnerRegistration = createServerFn({ method: 'POST' })
  .validator((input: unknown) => partnerDecisionInput.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' ||
        (!session.isSuperAdmin && !session.permissions.includes('partners.approve'))) {
      throw new Error('You do not have permission to approve or change partner registrations.')
    }
    const actorUserId = session.user.id

    const [registration] = await db.select().from(partnerRegistrations)
      .where(eq(partnerRegistrations.id, data.registrationId)).limit(1)
    if (!registration) throw new Error('Partner registration not found.')
    const registrationId = registration.id
    const previousStatus = registration.status

    if (data.status === 'Declined' && registration.status !== 'Pending approval') {
      throw new Error('Only pending partner registrations can be declined.')
    }
    if (data.status === 'Suspended' && registration.status !== 'Approved') {
      throw new Error('Only approved partners can be suspended.')
    }
    if (data.status === 'Approved' && registration.status === 'Declined') {
      throw new Error('A declined registration cannot be re-approved. Ask the applicant to submit a new registration.')
    }

    let referralCode = registration.referralCode
    if (data.status === 'Approved') {
      if (!registration.userId) {
        throw new Error('This registration is not linked to a signed-in applicant. The applicant must sign in and submit a new partner registration before approval.')
      }
      const [account] = await db.select({
        id: users.id,
        accountType: users.accountType,
        status: users.status,
        email: users.email,
      }).from(users).where(eq(users.id, registration.userId)).limit(1)
      if (!account || account.status !== 'active' || (account.accountType !== 'customer' && account.accountType !== 'partner')) {
        throw new Error('The linked applicant account is not active or cannot be converted to a partner account.')
      }
      if (account.email.trim().toLowerCase() !== registration.email.trim().toLowerCase()) {
        throw new Error('The partner registration email does not match the linked Oxford account. Ask the applicant to submit again while signed in with the registered email.')
      }
      if (!referralCode) referralCode = `OBG${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`
      const [partnerRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, 'partner')).limit(1)
      if (!partnerRole) throw new Error('The Partner role is not seeded. Sign in to the office workspace and try again.')
      const partnerRoleId = partnerRole.id
      const linkedAccountId = account.id
      const approvedReferralCode = referralCode

      await db.transaction(async (tx) => {
        if (account.accountType !== 'partner') {
          await tx.update(users).set({ accountType: 'partner', updatedAt: new Date() }).where(eq(users.id, linkedAccountId))
        }
        await tx.insert(staffRoles).values({
          userId: linkedAccountId,
          roleId: partnerRoleId,
          assignedBy: actorUserId,
        }).onConflictDoNothing()
        await tx.update(partnerRegistrations).set({
          status: 'Approved',
          referralCode: approvedReferralCode,
          updatedAt: new Date(),
        }).where(eq(partnerRegistrations.id, registrationId))
        await tx.insert(auditEvents).values({
          actorUserId,
          event: 'partner.registration_approved',
          resource: 'partner_registration',
          resourceId: registrationId,
          details: { partnerUserId: linkedAccountId, referralCode: approvedReferralCode },
        })
      })
      return { success: true, status: 'Approved' as const, referralCode: approvedReferralCode }
    }

    await db.transaction(async (tx) => {
      await tx.update(partnerRegistrations).set({
        status: data.status,
        updatedAt: new Date(),
      }).where(eq(partnerRegistrations.id, registrationId))
      await tx.insert(auditEvents).values({
        actorUserId,
        event: data.status === 'Declined' ? 'partner.registration_declined' : 'partner.registration_suspended',
        resource: 'partner_registration',
        resourceId: registrationId,
        details: { previousStatus },
      })
    })
    return { success: true, status: data.status, referralCode: null }
  })


const partnerDocumentPermissionInput = z.object({
  registrationId: z.string().uuid(),
  enabled: z.boolean(),
})

/** Super Admin alone controls whether a partner may upload supporting files to its own referrals. */
export const setPartnerSupportingDocumentPermission = createServerFn({ method: 'POST' })
  .validator((input: unknown) => partnerDocumentPermissionInput.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
      throw new Error('Only the Super Administrator may change partner document-upload permissions.')
    }

    const [registration] = await db.select({
      id: partnerRegistrations.id,
      userId: partnerRegistrations.userId,
      status: partnerRegistrations.status,
      canUploadSupportingDocuments: partnerRegistrations.canUploadSupportingDocuments,
    }).from(partnerRegistrations)
      .where(eq(partnerRegistrations.id, data.registrationId)).limit(1)
    if (!registration || registration.status !== 'Approved' || !registration.userId) {
      throw new Error('Only an approved partner linked to an active account can receive this permission.')
    }
    if (registration.canUploadSupportingDocuments === data.enabled) {
      return { success: true, enabled: data.enabled, unchanged: true }
    }

    await db.transaction(async (tx) => {
      await tx.update(partnerRegistrations).set({
        canUploadSupportingDocuments: data.enabled,
        updatedAt: new Date(),
      }).where(eq(partnerRegistrations.id, registration.id))
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: data.enabled ? 'partner.supporting_document_upload_enabled' : 'partner.supporting_document_upload_disabled',
        resource: 'partner_registration',
        resourceId: registration.id,
        details: {
          partnerUserId: registration.userId,
          previousValue: registration.canUploadSupportingDocuments,
          newValue: data.enabled,
        },
      })
    })
    return { success: true, enabled: data.enabled, unchanged: false }
  })

export const getPartnerDocumentPermissionSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
    throw new Error('Only the Super Administrator may view partner document-upload permissions.')
  }
  return db.select({
    id: partnerRegistrations.id,
    businessName: partnerRegistrations.businessName,
    contactName: partnerRegistrations.contactName,
    email: partnerRegistrations.email,
    status: partnerRegistrations.status,
    canUploadSupportingDocuments: partnerRegistrations.canUploadSupportingDocuments,
  }).from(partnerRegistrations)
    .where(eq(partnerRegistrations.status, 'Approved'))
    .orderBy(desc(partnerRegistrations.businessName))
})
