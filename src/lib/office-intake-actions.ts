import { createServerFn } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'
import { isIdentityEmailConfirmed } from './identity-verification'
import { createHash, randomBytes } from 'node:crypto'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import {
  applicationIntakes,
  assetCategories,
  assetIndustries,
  assetTypes,
  auditEvents,
  notifications,
  partnerRegistrations,
  customers,
  financeApplications,
  referrals,
  applicationStatusHistory,
  users,
} from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { createApplicationReference } from './application-reference'
import { decryptApplicantData, encryptApplicantData, fingerprintApplicantData } from './pii-crypto.server'
import { getOfficeIntakePreviewOrigin } from './office-intake-validation'
import { partnerApplicantIntakeInput } from './partner-intake-validation'
import { createOfficeInvitationToken } from './office-intake-security'
import { getOfficeInvitationClaimBlockReason } from './office-intake-security'
import { hashOfficeInvitationToken } from './office-intake-security'

const intakeInput = z.object({
  applicantEmail: z.string().trim().email().max(254),
  applicantType: z.enum(['individual', 'business']),
  applicantName: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional(),
  category: z.enum(['vehicle', 'equipment', 'commercial-asset', 'other']),
  assetTypeId: z.string().uuid().optional(),
  financeAmount: z.number().int().min(10000).max(2_000_000_000).optional(),
  partnerRegistrationId: z.string().uuid().optional(),
})

const idInput = z.object({ intakeId: z.string().uuid() })

async function requireIntakeOffice() {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'office' ||
      (!session.isSuperAdmin && !session.permissions.includes('applications.create'))) {
    throw new Error('An active Office or Super Administrator account with application-create permission is required.')
  }
  return session
}

function previewOrigin() {
  return getOfficeIntakePreviewOrigin(process.env.CONTEXT, process.env.DEPLOY_PRIME_URL)
}

function invitationUrl(token: string) {
  const url = new URL('/invitation', previewOrigin())
  url.searchParams.set('token', token)
  return url.toString()
}

type IntakePiiFields = {
  applicantEmail: string | null
  applicantName: string | null
  phone: string | null
  applicantPiiCiphertext: string | null
}

function readIntakeContact(row: IntakePiiFields) {
  const pii = row.applicantPiiCiphertext
    ? decryptApplicantData(row.applicantPiiCiphertext)
    : {
        // Compatibility path for records created before M22. Backfill before production release.
        email: row.applicantEmail ?? '',
        applicantName: row.applicantName ?? '',
        phone: row.phone ?? '',
      }
  return {
    email: typeof pii.email === 'string' ? pii.email.trim().toLowerCase() : '',
    applicantName: typeof pii.applicantName === 'string' ? pii.applicantName : '',
    phone: typeof pii.phone === 'string' ? pii.phone : '',
  }
}

async function queueInvitation(input: {
  recipient: string
  reference: string
  applicantName: string
  assetDescription: string
  partnerBusinessName: string
  url: string
  expiresAt: Date
}) {
  await db.insert(notifications).values({
    channel: 'email',
    template: 'office_applicant_invitation',
    status: 'queued',
    payload: {
      applicantPiiEnvelope: encryptApplicantData({ recipient: input.recipient, applicantName: input.applicantName }),
      reference: input.reference,
      assetDescription: input.assetDescription,
      partnerBusinessName: input.partnerBusinessName,
      invitationEnvelope: encryptApplicantData({ invitationUrl: input.url }),
      expiresAt: input.expiresAt.toISOString(),
    },
  })
}

export const createOfficeApplicantIntake = createServerFn({ method: 'POST' })
  .validator((input: unknown) => intakeInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireIntakeOffice()
    const email = data.applicantEmail.toLowerCase()
    let assetDescription = 'the selected finance asset'
    let industryName: string | null = null
    let categoryName: string | null = null
    if (data.assetTypeId) {
      const [asset] = await db.select({
        id: assetTypes.id,
        name: assetTypes.name,
        categoryId: assetCategories.id,
        categoryName: assetCategories.name,
        financeCategory: assetCategories.financeCategory,
        industryName: assetIndustries.name,
      }).from(assetTypes)
        .innerJoin(assetCategories, eq(assetTypes.categoryId, assetCategories.id))
        .innerJoin(assetIndustries, eq(assetCategories.industryId, assetIndustries.id))
        .where(and(
          eq(assetTypes.id, data.assetTypeId),
          eq(assetTypes.isActive, true),
          eq(assetCategories.isActive, true),
          eq(assetIndustries.isActive, true),
        )).limit(1)
      if (!asset || asset.financeCategory !== data.category) {
        throw new Error('Select an active asset that belongs to the chosen finance category.')
      }
      assetDescription = asset.name
      industryName = asset.industryName
      categoryName = asset.categoryName
    }

    let partner: { id: string; businessName: string; referralCode: string } | null = null
    if (data.partnerRegistrationId) {
      const [approved] = await db.select({
        id: partnerRegistrations.id,
        businessName: partnerRegistrations.businessName,
        referralCode: partnerRegistrations.referralCode,
        userId: partnerRegistrations.userId,
      }).from(partnerRegistrations)
        .innerJoin(users, eq(partnerRegistrations.userId, users.id))
        .where(and(
          eq(partnerRegistrations.id, data.partnerRegistrationId),
          eq(partnerRegistrations.status, 'Approved'),
          eq(users.accountType, 'partner'),
          eq(users.status, 'active'),
        )).limit(1)
      // Approved merchant partners must have a linked partner account and referral code.
      if (!approved?.referralCode || !approved.userId) throw new Error('Choose an approved merchant partner with an active linked partner account.')
      partner = { id: approved.id, businessName: approved.businessName, referralCode: approved.referralCode }
    }

    // Validate the encryption key before any applicant identity data is inserted.
    const applicantEmailFingerprint = fingerprintApplicantData({ email })
    const applicantPiiCiphertext = encryptApplicantData({ email, applicantName: data.applicantName, phone: data.phone?.trim() || '' })
    const { token, hash } = createOfficeInvitationToken()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
    const reference = createApplicationReference().replace('OBG-APP-', 'OBG-INTAKE-')
    const [intake] = await db.insert(applicationIntakes).values({
      reference,
      applicantEmail: null,
      applicantEmailFingerprint,
      applicantPiiCiphertext,
      applicantType: data.applicantType,
      applicantName: null,
      phone: null,
      category: data.category,
      assetTypeId: data.assetTypeId ?? null,
      industryNameSnapshot: industryName,
      assetCategoryNameSnapshot: categoryName,
      assetTypeNameSnapshot: data.assetTypeId ? assetDescription : null,
      financeAmount: data.financeAmount ?? null,
      partnerRegistrationId: partner?.id ?? null,
      creatorUserId: session.user.id,
      tokenHash: hash,
      tokenExpiresAt: expiresAt,
      status: 'pending_invitation',
    }).returning({ id: applicationIntakes.id })

    try {
      await queueInvitation({
        recipient: email,
        reference,
        applicantName: data.applicantName,
        assetDescription,
        partnerBusinessName: partner?.businessName ?? '',
        url: invitationUrl(token),
        expiresAt,
      })
      await db.update(applicationIntakes).set({
        status: 'invitation_sent',
        invitationSentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(applicationIntakes.id, intake.id))
    } catch (error) {
      await db.update(applicationIntakes).set({
        status: 'pending_invitation',
        updatedAt: new Date(),
      }).where(eq(applicationIntakes.id, intake.id))
      throw error
    }

    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: 'application_intake.created',
      resource: 'application_intake',
      resourceId: intake.id,
      details: {
        reference,
        recipientDomain: email.split('@')[1] ?? '',
        applicantType: data.applicantType,
        category: data.category,
        partnerRegistrationId: partner?.id ?? null,
      },
    })
    return { success: true, intakeId: intake.id, reference }
  })


async function requireIntakePartner() {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'partner' || !session.permissions.includes('partner_referrals.create')) {
    throw new Error('An active, approved merchant partner with referral-create permission is required.')
  }
  const [partner] = await db.select({
    id: partnerRegistrations.id,
    businessName: partnerRegistrations.businessName,
    referralCode: partnerRegistrations.referralCode,
  }).from(partnerRegistrations)
    .where(and(
      eq(partnerRegistrations.userId, session.user.id),
      eq(partnerRegistrations.status, 'Approved'),
    ))
    .orderBy(desc(partnerRegistrations.createdAt))
    .limit(1)
  if (!partner?.referralCode) {
    throw new Error('Your partner registration is not approved or does not have an active referral code.')
  }
  return { session, partner }
}

/** Partners create only a minimal starter intake; the verified applicant owns the resulting application. */
export const createPartnerApplicantIntake = createServerFn({ method: 'POST' })
  .validator((input: unknown) => partnerApplicantIntakeInput.parse(input))
  .handler(async ({ data }) => {
    const { session, partner } = await requireIntakePartner()
    const [asset] = await db.select({
      id: assetTypes.id,
      name: assetTypes.name,
      categoryName: assetCategories.name,
      financeCategory: assetCategories.financeCategory,
      industryName: assetIndustries.name,
    }).from(assetTypes)
      .innerJoin(assetCategories, eq(assetTypes.categoryId, assetCategories.id))
      .innerJoin(assetIndustries, eq(assetCategories.industryId, assetIndustries.id))
      .where(and(
        eq(assetTypes.id, data.assetTypeId),
        eq(assetTypes.isActive, true),
        eq(assetCategories.isActive, true),
        eq(assetIndustries.isActive, true),
        eq(assetCategories.financeCategory, data.category),
      )).limit(1)
    if (!asset) throw new Error('Select an active asset from the approved catalogue for this finance category.')

    const email = data.applicantEmail.toLowerCase()
    const applicantEmailFingerprint = fingerprintApplicantData({ email })
    const applicantPiiCiphertext = encryptApplicantData({ email, applicantName: data.applicantName, phone: data.phone?.trim() || '' })
    const { token, hash } = createOfficeInvitationToken()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
    const reference = createApplicationReference().replace('OBG-APP-', 'OBG-INTAKE-')
    const [intake] = await db.insert(applicationIntakes).values({
      reference,
      applicantEmail: null,
      applicantEmailFingerprint,
      applicantPiiCiphertext,
      applicantType: data.applicantType,
      applicantName: null,
      phone: null,
      category: data.category,
      assetTypeId: asset.id,
      industryNameSnapshot: asset.industryName,
      assetCategoryNameSnapshot: asset.categoryName,
      assetTypeNameSnapshot: asset.name,
      financeAmount: null,
      partnerRegistrationId: partner.id,
      creatorUserId: session.user.id,
      tokenHash: hash,
      tokenExpiresAt: expiresAt,
      status: 'pending_invitation',
    }).returning({ id: applicationIntakes.id })
    if (!intake) throw new Error('The applicant referral intake could not be created.')

    try {
      await queueInvitation({
        recipient: email,
        reference,
        applicantName: data.applicantName,
        assetDescription: asset.name,
        partnerBusinessName: partner.businessName,
        url: invitationUrl(token),
        expiresAt,
      })
      await db.update(applicationIntakes).set({
        status: 'invitation_sent',
        invitationSentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(applicationIntakes.id, intake.id))
    } catch (error) {
      await db.update(applicationIntakes).set({
        status: 'pending_invitation',
        updatedAt: new Date(),
      }).where(eq(applicationIntakes.id, intake.id))
      throw error
    }

    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: 'application_intake.partner_created',
      resource: 'application_intake',
      resourceId: intake.id,
      details: {
        reference,
        partnerRegistrationId: partner.id,
        recipientDomain: email.split('@')[1] ?? '',
        applicantType: data.applicantType,
        category: data.category,
        assetTypeId: asset.id,
        source: 'partner_referral',
        applicantSensitiveInformationCollected: false,
      },
    })
    return { success: true, intakeId: intake.id, reference, invitationExpiresAt: expiresAt.toISOString() }
  })

/** Partner-safe catalogue choices; no other partner registrations or applicant details are returned. */
export const getPartnerIntakeOptions = createServerFn({ method: 'GET' }).handler(async () => {
  await requireIntakePartner()
  const assets = await db.select({
    id: assetTypes.id,
    name: assetTypes.name,
    categoryName: assetCategories.name,
    financeCategory: assetCategories.financeCategory,
    industryName: assetIndustries.name,
  }).from(assetTypes)
    .innerJoin(assetCategories, eq(assetTypes.categoryId, assetCategories.id))
    .innerJoin(assetIndustries, eq(assetCategories.industryId, assetIndustries.id))
    .where(and(
      eq(assetTypes.isActive, true),
      eq(assetCategories.isActive, true),
      eq(assetIndustries.isActive, true),
    ))
    .orderBy(assetIndustries.sortOrder, assetCategories.sortOrder, assetTypes.sortOrder)
  return { assets }
})

export const getOfficeApplicantIntakes = createServerFn({ method: 'GET' }).handler(async () => {
  await requireIntakeOffice()
  const rows = await db.select({
    id: applicationIntakes.id,
    reference: applicationIntakes.reference,
    applicantEmail: applicationIntakes.applicantEmail,
    applicantEmailFingerprint: applicationIntakes.applicantEmailFingerprint,
    applicantPiiCiphertext: applicationIntakes.applicantPiiCiphertext,
    applicantType: applicationIntakes.applicantType,
    applicantName: applicationIntakes.applicantName,
    phone: applicationIntakes.phone,
    category: applicationIntakes.category,
    assetTypeName: applicationIntakes.assetTypeNameSnapshot,
    partnerRegistrationId: applicationIntakes.partnerRegistrationId,
    status: applicationIntakes.status,
    tokenExpiresAt: applicationIntakes.tokenExpiresAt,
    invitationSentAt: applicationIntakes.invitationSentAt,
    createdAt: applicationIntakes.createdAt,
  }).from(applicationIntakes).orderBy(desc(applicationIntakes.createdAt)).limit(100)
  const intakes = rows.map((row) => {
    const pii = readIntakeContact(row)
    return {
      ...row,
      applicantEmail: typeof pii.email === 'string' ? pii.email : '',
      applicantName: typeof pii.applicantName === 'string' ? pii.applicantName : '',
      phone: typeof pii.phone === 'string' ? pii.phone : '',
      applicantPiiCiphertext: undefined,
      applicantEmailFingerprint: undefined,
    }
  })
  return { intakes }
})

export const revokeOfficeApplicantIntake = createServerFn({ method: 'POST' })
  .validator((input: unknown) => idInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireIntakeOffice()
    const [row] = await db.update(applicationIntakes).set({
      status: 'revoked',
      revokedAt: new Date(),
      tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
      updatedAt: new Date(),
    }).where(and(
      eq(applicationIntakes.id, data.intakeId),
      isNull(applicationIntakes.claimedAt),
      isNull(applicationIntakes.revokedAt),
    )).returning({ id: applicationIntakes.id, reference: applicationIntakes.reference })
    if (!row) throw new Error('This intake is already claimed, revoked or unavailable.')
    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: 'application_intake.revoked',
      resource: 'application_intake',
      resourceId: row.id,
      details: { reference: row.reference },
    })
    return { success: true }
  })


export const getOfficeIntakeOptions = createServerFn({ method: 'GET' }).handler(async () => {
  await requireIntakeOffice()
  const [assets, partners] = await Promise.all([
    db.select({
      id: assetTypes.id,
      name: assetTypes.name,
      categoryName: assetCategories.name,
      financeCategory: assetCategories.financeCategory,
      industryName: assetIndustries.name,
    }).from(assetTypes)
      .innerJoin(assetCategories, eq(assetTypes.categoryId, assetCategories.id))
      .innerJoin(assetIndustries, eq(assetCategories.industryId, assetIndustries.id))
      .where(and(eq(assetTypes.isActive, true), eq(assetCategories.isActive, true), eq(assetIndustries.isActive, true)))
      .orderBy(assetIndustries.sortOrder, assetCategories.sortOrder, assetTypes.sortOrder),
    db.select({ id: partnerRegistrations.id, businessName: partnerRegistrations.businessName })
      .from(partnerRegistrations)
      .innerJoin(users, eq(partnerRegistrations.userId, users.id))
      .where(and(
        eq(partnerRegistrations.status, 'Approved'),
        eq(users.accountType, 'partner'),
        eq(users.status, 'active'),
      ))
      .orderBy(partnerRegistrations.businessName),
  ])
  return { assets, partners }
})


/** Rotate and resend an invitation without ever returning its raw token to staff. */
export const resendOfficeApplicantInvitation = createServerFn({ method: 'POST' })
  .validator((input: unknown) => idInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireIntakeOffice()
    const [row] = await db.select().from(applicationIntakes)
      .where(eq(applicationIntakes.id, data.intakeId)).limit(1)
    if (!row || row.claimedAt || row.revokedAt || row.status === 'claimed' || row.status === 'revoked') {
      throw new Error('This intake cannot be re-invited.')
    }
    const applicant = readIntakeContact(row)
    const [asset] = row.assetTypeId
      ? await db.select({ name: assetTypes.name }).from(assetTypes).where(eq(assetTypes.id, row.assetTypeId)).limit(1)
      : [undefined]
    const [partner] = row.partnerRegistrationId
      ? await db.select({ businessName: partnerRegistrations.businessName }).from(partnerRegistrations)
        .innerJoin(users, eq(partnerRegistrations.userId, users.id))
        .where(and(
          eq(partnerRegistrations.id, row.partnerRegistrationId),
          eq(partnerRegistrations.status, 'Approved'),
          eq(users.accountType, 'partner'),
          eq(users.status, 'active'),
        )).limit(1)
      : [undefined]
    const { token, hash } = createOfficeInvitationToken()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
    await db.transaction(async (tx) => {
      const [updated] = await tx.update(applicationIntakes).set({
        tokenHash: hash,
        tokenExpiresAt: expiresAt,
        status: 'pending_invitation',
        invitationSentAt: null,
        updatedAt: new Date(),
      }).where(and(
        eq(applicationIntakes.id, row.id),
        isNull(applicationIntakes.claimedAt),
        isNull(applicationIntakes.revokedAt),
      )).returning({ id: applicationIntakes.id })
      if (!updated) throw new Error('This intake has already been claimed or revoked.')
      await tx.insert(notifications).values({
        channel: 'email',
        template: 'office_applicant_invitation',
        status: 'queued',
        payload: {
          applicantPiiEnvelope: encryptApplicantData({ recipient: applicant.email, applicantName: applicant.applicantName }),
          reference: row.reference,
          assetDescription: asset?.name ?? 'the selected finance asset',
          partnerBusinessName: partner?.businessName ?? '',
          invitationEnvelope: encryptApplicantData({ invitationUrl: invitationUrl(token) }),
          expiresAt: expiresAt.toISOString(),
        },
      })
      await tx.update(applicationIntakes).set({
        status: 'invitation_sent',
        invitationSentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(applicationIntakes.id, row.id))
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'application_intake.invitation_resent',
        resource: 'application_intake',
        resourceId: row.id,
        details: { reference: row.reference },
      })
    })
    return { success: true, reference: row.reference }
  })

const claimInput = z.object({ token: z.string().min(32).max(128) })

/** Verified applicant-only claim. The intake row is locked to prevent double claims. */
export const claimOfficeApplicantIntake = createServerFn({ method: 'POST' })
  .validator((input: unknown) => claimInput.parse(input))
  .handler(async ({ data }) => {
    const identity = await getUser()
    const identityEmail = identity?.email?.trim().toLowerCase() ?? ''
    if (!identity?.id || !identityEmail ||
        !isIdentityEmailConfirmed(identity)) {
      throw new Error('Sign in and verify your email address before continuing with this invitation.')
    }

    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'customer' || session.user.email.trim().toLowerCase() !== identityEmail) {
      throw new Error('This invitation can only be claimed by its verified applicant customer account.')
    }

    const tokenHash = hashOfficeInvitationToken(data.token)
    return db.transaction(async (tx) => {
      await tx.execute(sql`select id from application_intakes where token_hash = ${tokenHash} for update`)
      const [intake] = await tx.select().from(applicationIntakes)
        .where(eq(applicationIntakes.tokenHash, tokenHash)).limit(1)
      if (!intake) throw new Error('This invitation is invalid or has already been used.')
      const applicant = readIntakeContact(intake)
      const emailMatches = intake.applicantEmailFingerprint
        ? intake.applicantEmailFingerprint === fingerprintApplicantData({ email: identityEmail })
        : intake.applicantEmail?.trim().toLowerCase() === identityEmail
      if (!emailMatches || applicant.email !== identityEmail) {
        throw new Error('The signed-in email address does not match the invited applicant.')
      }
      const claimBlockReason = getOfficeInvitationClaimBlockReason(intake)
      if (claimBlockReason === 'claimed') throw new Error('This invitation has already been claimed.')
      if (claimBlockReason === 'revoked') {
        throw new Error('This invitation has been revoked. Contact Oxford Business Group for assistance.')
      }
      if (claimBlockReason === 'expired') {
        throw new Error('This invitation has expired. Ask Oxford Business Group to send a new invitation.')
      }
      if (claimBlockReason === 'invalid_state') {
        throw new Error('This invitation is invalid or is no longer available.')
      }

      const [account] = await tx.select({ id: users.id, status: users.status, accountType: users.accountType })
        .from(users).where(eq(users.identityId, identity.id)).limit(1)
      if (!account || account.status !== 'active' || account.accountType !== 'customer') {
        throw new Error('Your customer account is not active. Contact Oxford Business Group for assistance.')
      }

      const [existingCustomer] = await tx.select().from(customers)
        .where(eq(customers.userId, account.id)).limit(1)
      const nameParts = String(applicant.applicantName ?? '').trim().split(/\s+/)
      const customerValues = {
        applicantType: intake.applicantType,
        firstName: null,
        lastName: null,
        businessName: null,
        phone: null,
        profile: {
          piiCiphertext: encryptApplicantData({
            firstName: intake.applicantType === 'individual' ? nameParts[0] ?? '' : '',
            lastName: intake.applicantType === 'individual' ? nameParts.slice(1).join(' ') : '',
            businessName: intake.applicantType === 'business' ? String(applicant.applicantName ?? '') : '',
            phone: typeof applicant.phone === 'string' ? applicant.phone : '',
            email: identityEmail,
          }),
          piiEncryptionVersion: 'aes-256-gcm-v1',
        },
      }
      const [customer] = existingCustomer
        ? await tx.update(customers).set(customerValues).where(eq(customers.id, existingCustomer.id)).returning()
        : await tx.insert(customers).values({ userId: account.id, ...customerValues }).returning()
      await tx.update(users).set({ displayName: null, updatedAt: new Date() }).where(eq(users.id, account.id))

      let referralCode: string | null = null
      let partnerUserId: string | null = null
      let partnerBusinessName: string | null = null
      if (intake.partnerRegistrationId) {
        const [partner] = await tx.select({
          userId: partnerRegistrations.userId,
          referralCode: partnerRegistrations.referralCode,
          businessName: partnerRegistrations.businessName,
        }).from(partnerRegistrations)
          .innerJoin(users, eq(partnerRegistrations.userId, users.id))
          .where(and(
            eq(partnerRegistrations.id, intake.partnerRegistrationId),
            eq(partnerRegistrations.status, 'Approved'),
            eq(users.accountType, 'partner'),
            eq(users.status, 'active'),
          )).limit(1)
        if (partner?.userId && partner.referralCode) {
          referralCode = partner.referralCode
          partnerUserId = partner.userId
          partnerBusinessName = partner.businessName
        } else {
          await tx.insert(auditEvents).values({
            actorUserId: account.id,
            event: 'application_intake.partner_attribution_skipped',
            resource: 'application_intake',
            resourceId: intake.id,
            details: {
              intakeReference: intake.reference,
              partnerRegistrationId: intake.partnerRegistrationId,
              reason: 'partner_account_inactive_or_unapproved',
            },
          })
        }
      }

      const reference = createApplicationReference()
      const assetDescription = intake.assetTypeNameSnapshot ?? 'Finance asset to be confirmed'
      const [application] = await tx.insert(financeApplications).values({
        reference,
        customerId: customer.id,
        creatorUserId: intake.creatorUserId,
        applicantType: intake.applicantType,
        category: intake.category,
        status: 'Draft',
        financeAmount: intake.financeAmount,
        assetDescription,
        assetTypeId: intake.assetTypeId,
        industryNameSnapshot: intake.industryNameSnapshot,
        assetCategoryNameSnapshot: intake.assetCategoryNameSnapshot,
        assetTypeNameSnapshot: intake.assetTypeNameSnapshot,
        referralCode,
        applicationData: {
          source: intake.partnerRegistrationId ? 'partner_referral_intake' : 'office_intake',
          intakeReference: intake.reference,
          piiCiphertext: encryptApplicantData({
            applicantName: applicant.applicantName,
            firstName: intake.applicantType === 'individual' ? nameParts[0] ?? '' : '',
            lastName: intake.applicantType === 'individual' ? nameParts.slice(1).join(' ') : '',
            businessName: intake.applicantType === 'business' ? applicant.applicantName : '',
            email: identityEmail,
            phone: applicant.phone ?? '',
          }),
          piiEncryptionVersion: 'aes-256-gcm-v1',
          partnerBusinessName,
          completionRequired: true,
        },
      }).returning({ id: financeApplications.id })

      await tx.insert(applicationStatusHistory).values({
        applicationId: application.id,
        fromStatus: null,
        toStatus: 'Draft',
        changedBy: account.id,
        note: intake.partnerRegistrationId
          ? 'Partner-originated starter intake claimed by the verified applicant.'
          : 'Office-created application claimed by the verified applicant.',
      })
      if (referralCode && partnerUserId) {
        await tx.insert(referrals).values({
          partnerUserId,
          code: referralCode,
          applicationId: application.id,
          metadata: { source: intake.partnerRegistrationId ? 'partner_referral_intake' : 'office_intake', intakeReference: intake.reference },
        })
        // Registration confirmation only; no applicant identity or document details.
        await tx.insert(notifications).values({
          userId: partnerUserId,
          channel: 'email',
          template: 'partner_referral_registered',
          status: 'queued',
          payload: { reference, assetDescription, partnerBusinessName },
        })
      }

      const [claimed] = await tx.update(applicationIntakes).set({
        status: 'claimed',
        claimedAt: new Date(),
        customerId: customer.id,
        applicationId: application.id,
        updatedAt: new Date(),
      }).where(and(
        eq(applicationIntakes.id, intake.id),
        eq(applicationIntakes.tokenHash, tokenHash),
        isNull(applicationIntakes.claimedAt),
        isNull(applicationIntakes.revokedAt),
      )).returning({ id: applicationIntakes.id })
      if (!claimed) throw new Error('This invitation was claimed by another session. Sign in to view your dashboard.')

      await tx.insert(auditEvents).values({
        actorUserId: account.id,
        event: 'application_intake.claimed',
        resource: 'application_intake',
        resourceId: intake.id,
        details: {
          intakeReference: intake.reference,
          applicationReference: reference,
          creatorUserId: intake.creatorUserId,
          partnerRegistrationId: intake.partnerRegistrationId,
        },
      })
      return { success: true, applicationId: application.id, reference, redirectTo: '/dashboard' }
    })
  })
