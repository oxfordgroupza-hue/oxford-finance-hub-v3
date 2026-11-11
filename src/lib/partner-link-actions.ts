import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { auditEvents, financeApplications, notifications, partnerRegistrations, referrals, users } from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { isActivePartnerAccount } from './partner-account-validation'

const inputSchema = z.object({
  applicationId: z.string().uuid(),
  partnerRegistrationId: z.string().uuid(),
})

/**
 * Register an approved merchant partner as the referrer for an existing
 * application. This creates a referral record and a registration notice only;
 * it deliberately grants no application or document permissions to the partner.
 */
export const linkMerchantPartnerToApplication = createServerFn({ method: 'POST' })
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' ||
        (!session.isSuperAdmin && (!session.permissions.includes('applications.edit') || !session.permissions.includes('partners.view')))) {
      throw new Error('An authorised Office or Super Admin account is required to link a merchant partner.')
    }

    return db.transaction(async (tx) => {
      const [application] = await tx.select({
        id: financeApplications.id,
        reference: financeApplications.reference,
        referralCode: financeApplications.referralCode,
        assetDescription: financeApplications.assetDescription,
      }).from(financeApplications)
        .where(eq(financeApplications.id, data.applicationId))
        .limit(1)
      if (!application) throw new Error('Application not found.')

      const [partner] = await tx.select({
        id: partnerRegistrations.id,
        userId: partnerRegistrations.userId,
        businessName: partnerRegistrations.businessName,
        referralCode: partnerRegistrations.referralCode,
        status: partnerRegistrations.status,
      }).from(partnerRegistrations)
        .where(eq(partnerRegistrations.id, data.partnerRegistrationId))
        .limit(1)

      if (!partner || partner.status !== 'Approved' || !partner.userId || !partner.referralCode) {
        throw new Error('Select an approved merchant partner with an active linked account and referral code.')
      }
      const [partnerAccount] = await tx.select({
        accountType: users.accountType,
        status: users.status,
      }).from(users).where(eq(users.id, partner.userId)).limit(1)
      if (!isActivePartnerAccount(partnerAccount)) {
        throw new Error('The selected merchant partner account is no longer active. Reactivate and verify the partner before linking applications.')
      }

      const [existingReferral] = await tx.select({
        id: referrals.id,
        partnerUserId: referrals.partnerUserId,
      }).from(referrals)
        .where(eq(referrals.applicationId, application.id))
        .limit(1)

      if (existingReferral) {
        if (existingReferral.partnerUserId === partner.userId) {
          return { success: true, alreadyLinked: true }
        }
        throw new Error('This application is already registered to another referring partner. A Super Admin must resolve the existing referral before changing it.')
      }

      if (application.referralCode && application.referralCode !== partner.referralCode) {
        throw new Error('This application already contains a different referral code. Review the existing referral before linking another partner.')
      }

      await tx.insert(referrals).values({
        partnerUserId: partner.userId,
        code: partner.referralCode,
        applicationId: application.id,
        metadata: { source: 'office_link', registeredBy: session.user.id },
      })

      await tx.update(financeApplications).set({
        referralCode: partner.referralCode,
        updatedAt: new Date(),
      }).where(eq(financeApplications.id, application.id))

      await tx.insert(notifications).values({
        userId: partner.userId,
        channel: 'email',
        template: 'partner_referral_registered',
        status: 'queued',
        payload: {
          reference: application.reference,
          assetDescription: application.assetDescription ?? '',
        },
      })

      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'application.partner_linked',
        resource: 'finance_application',
        resourceId: application.id,
        details: {
          reference: application.reference,
          partnerRegistrationId: partner.id,
          partnerBusinessName: partner.businessName,
          notification: 'referral_registration_only',
          privateDocumentAccessGranted: false,
        },
      })

      return { success: true, alreadyLinked: false }
    })
  })
