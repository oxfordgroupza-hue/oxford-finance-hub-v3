import { createServerFn } from '@tanstack/react-start'
import { randomUUID } from 'node:crypto'
import { getUser } from '@netlify/identity'
import { isIdentityEmailConfirmed } from './identity-verification'
import { getAuthorizationSnapshot } from './auth'
import type { PermissionKey } from './access-control'
import { and, desc, eq, gt, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import {
  assetCategories,
  assetIndustries,
  assetTypes,
  auditEvents,
  consentRecords,
  customers,
  financeApplications,
  financeDrafts,
  financeProducts,
  integrationOperations,
  notifications,
  referrals,
  partnerRegistrations,
  applicationStatusHistory,
  users,
} from '../../db/schema'
import { createApplicationReference } from './application-reference'
import { calculateFinanceAmount } from './fee-calculation'
import { decryptApplicantData, encryptApplicantData } from './pii-crypto.server'

const submissionInput = z.object({
  idempotencyKey: z.string().uuid(),
  form: z.record(z.string(), z.unknown()),
  draftId: z.string().uuid().optional(),
  sourceApplicationId: z.string().uuid().optional(),
})

const value = (form: Record<string, unknown>, key: string) =>
  typeof form[key] === 'string' ? (form[key] as string).trim() : ''

const required = (form: Record<string, unknown>, key: string) => {
  const result = value(form, key)
  if (!result) throw new Error('Please complete all required application fields before submitting.')
  return result
}

type SerializableJson = string | number | boolean | null | SerializableJson[] | { [key: string]: SerializableJson }
type SerializableRecord = { [key: string]: SerializableJson }

const consentVersion = '2026-11-08-v1'

/**
 * Fail closed until the Netlify Database + Netlify Identity application flow,
 * private Supabase Storage integration and launch acceptance tests are complete.
 * This flag is server-only; browser code cannot enable application processing.
 */
function assertApplicationProcessingEnabled() {
  // Even an accidentally enabled production environment variable must never
  // activate live applicant intake. This code path is preview-only.
  if (process.env.CONTEXT !== 'deploy-preview' || process.env.OXFORD_APPLICATIONS_ENABLED !== 'true') {
    throw new Error('Online applications and saved drafts are temporarily unavailable while Oxford completes secure platform verification. Please contact Oxford Business Group for assistance.')
  }
}

/** Existing encrypted drafts may be edited only in Deploy Preview. This does not enable new intake or submission. */
function assertExistingDraftEditingEnabled() {
  if (process.env.CONTEXT !== 'deploy-preview') {
    throw new Error('Saved draft editing is available only in the secure Deploy Preview while Oxford completes platform verification.')
  }
}

async function requireVerifiedIdentity(): Promise<{ id: string; email: string }> {
  const identity = await getUser()
  const email = identity?.email?.trim()
  if (!identity?.id || !email) {
    throw new Error('Please sign in before submitting an application or saving a draft.')
  }
  if (!isIdentityEmailConfirmed(identity)) {
    throw new Error('Please verify your email address before submitting an application or saving a draft.')
  }
  return { id: identity.id, email }
}

async function requireCustomerPermission(permission: PermissionKey) {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked || session.user.accountType !== 'customer') {
    throw new Error('An active customer account is required for this operation.')
  }
  if (!session.permissions.includes(permission)) {
    throw new Error(`Your account does not have the ${permission} permission.`)
  }
  return session
}

/**
 * Persist a complete application. The authenticated Identity account is the
 * authority for customer ownership; browser-supplied user IDs are never trusted.
 */
export const submitFinanceApplication = createServerFn({ method: 'POST' })
  .validator((input: unknown) => submissionInput.parse(input))
  .handler(async ({ data }) => {
    assertApplicationProcessingEnabled()
    await requireCustomerPermission('own_applications.create')
    const identity = await requireVerifiedIdentity()

    const form = data.form
    const applicantType = required(form, 'applicantType')
    const category = required(form, 'category')
    if (!['individual', 'business'].includes(applicantType) ||
        !['vehicle', 'equipment', 'commercial-asset', 'other'].includes(category)) {
      throw new Error('The selected application type or finance category is invalid.')
    }

    const assetIndustryId = required(form, 'assetIndustryId')
    const assetCategoryId = required(form, 'assetCategoryId')
    const assetTypeId = required(form, 'assetTypeId')
    const [selectedIndustry] = await db.select({
      id: assetIndustries.id,
      name: assetIndustries.name,
      isActive: assetIndustries.isActive,
    }).from(assetIndustries).where(eq(assetIndustries.id, assetIndustryId)).limit(1)
    const [selectedAssetCategory] = await db.select({
      id: assetCategories.id,
      industryId: assetCategories.industryId,
      financeCategory: assetCategories.financeCategory,
      name: assetCategories.name,
      isActive: assetCategories.isActive,
    }).from(assetCategories).where(eq(assetCategories.id, assetCategoryId)).limit(1)
    const [selectedAssetType] = await db.select({
      id: assetTypes.id,
      categoryId: assetTypes.categoryId,
      name: assetTypes.name,
      isActive: assetTypes.isActive,
    }).from(assetTypes).where(eq(assetTypes.id, assetTypeId)).limit(1)

    if (!selectedIndustry?.isActive || !selectedAssetCategory?.isActive || !selectedAssetType?.isActive ||
        selectedAssetCategory.industryId !== selectedIndustry.id ||
        selectedAssetType.categoryId !== selectedAssetCategory.id ||
        selectedAssetCategory.financeCategory !== category) {
      throw new Error('The selected industry, category or equipment is no longer available. Refresh the catalogue and select again.')
    }
    const assetDescription = selectedAssetType.name
    const [configuredProduct] = await db.select({ isActive: financeProducts.isActive })
      .from(financeProducts).where(eq(financeProducts.category, category as 'vehicle' | 'equipment' | 'commercial-asset' | 'other')).limit(1)
    if (configuredProduct && !configuredProduct.isActive) {
      throw new Error('This finance category is temporarily unavailable. Please choose another category or contact Oxford Business Group.')
    }

    const email = required(form, 'email').toLowerCase()
    const identityEmail = typeof identity.email === 'string' ? identity.email.trim().toLowerCase() : ''
    if (!identityEmail || email !== identityEmail) {
      throw new Error('The application email must match the email address on your signed-in account.')
    }
    const phone = required(form, 'phone')
    if (!/^[+()\d\s-]{9,}$/.test(phone)) throw new Error('Enter a valid contact telephone number.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')

    if (applicantType === 'individual') {
      required(form, 'firstName')
      required(form, 'lastName')
      const idType = required(form, 'idType')
      const idNumber = required(form, 'idNumber')
      if (idType === 'sa-id' && !/^\d{13}$/.test(idNumber)) throw new Error('Enter a valid 13-digit South African ID number.')
      if (idType === 'passport' && idNumber.length < 4) throw new Error('Enter a valid passport number.')
      if (!['sa-id', 'passport'].includes(idType)) throw new Error('Select a valid identity document type.')
      required(form, 'dateOfBirth')
      required(form, 'address')
      required(form, 'employmentStatus')
      required(form, 'grossMonthlyIncome')
      required(form, 'netMonthlyIncome')
    } else {
      required(form, 'businessName')
      required(form, 'contactName')
      required(form, 'entityType')
      const entityType = required(form, 'entityType')
      if (entityType !== 'Sole proprietor') {
        required(form, 'registrationNumber')
        if (!Array.isArray(form.directors) || !form.directors.some((director: unknown) =>
          director && typeof director === 'object' && typeof (director as { name?: unknown }).name === 'string' &&
          (director as { name: string }).name.trim().length > 0)) {
          throw new Error('Add at least one director or authorised representative.')
        }
      }
      required(form, 'businessAddress')
      required(form, 'industry')
      required(form, 'yearsTrading')
      required(form, 'annualTurnover')
    }

    const financeAmount = Number(required(form, 'amount'))
    if (!Number.isSafeInteger(financeAmount) || financeAmount < 10000 || financeAmount > 2_000_000_000) {
      throw new Error('Enter a valid whole-rand principal loan amount of at least R10 000.')
    }
    const financeCalculation = calculateFinanceAmount(financeAmount * 100)
    for (const consent of ['consentAccuracy', 'consentProcessing', 'consentShareProviders', 'consentCreditCheck']) {
      if (form[consent] !== true) throw new Error('All required declarations and consents must be accepted.')
    }

    const sensitiveData: Record<string, unknown> = {}
    const sensitiveKeys = [
      'idType', 'idNumber', 'dateOfBirth', 'address', 'employmentStatus', 'employer',
      'grossMonthlyIncome', 'netMonthlyIncome', 'registrationNumber', 'yearsTrading',
      'industry', 'businessAddress', 'annualTurnover', 'directors', 'contactName', 'comments',
    ]
    for (const key of sensitiveKeys) {
      if (form[key] !== undefined && form[key] !== '') sensitiveData[key] = form[key]
    }
    const encryptedSensitiveData = encryptApplicantData(sensitiveData)

    const safeData: Record<string, unknown> = {
      applicantType,
      category,
      firstName: value(form, 'firstName'),
      lastName: value(form, 'lastName'),
      businessName: value(form, 'businessName'),
      tradingName: value(form, 'tradingName'),
      email,
      phone,
      entityType: value(form, 'entityType'),
      amount: financeAmount,
      financeCalculation: {
        principalLoanAmount: financeCalculation.principalLoanAmountCents / 100,
        documentationFee: financeCalculation.documentationFeeCents / 100,
        vatRateBps: financeCalculation.vatRateBps,
        vatBase: financeCalculation.vatBaseCents / 100,
        vatAmount: financeCalculation.vatAmountCents / 100,
        totalFinanceAmount: financeCalculation.totalFinanceAmountCents / 100,
      },
      term: value(form, 'term'),
      deposit: value(form, 'deposit'),
      assetDescription,
      assetIndustryId: selectedIndustry.id,
      industryName: selectedIndustry.name,
      assetCategoryId: selectedAssetCategory.id,
      assetCategoryName: selectedAssetCategory.name,
      assetTypeId: selectedAssetType.id,
      timing: value(form, 'timing'),
      supplier: value(form, 'supplier'),
      referralCode: value(form, 'referralCode'),
      piiCiphertext: encryptedSensitiveData,
      piiEncryptionVersion: 'aes-256-gcm-v1',
    }

    return db.transaction(async (tx) => {
      const [account] = await tx.select().from(users)
        .where(and(eq(users.identityId, identity.id), eq(users.status, 'active')))
        .limit(1)
      if (!account || account.accountType !== 'customer') {
        throw new Error('Your account is not enabled for customer applications. Please contact Oxford support.')
      }

      const [existingCustomer] = await tx.select().from(customers)
        .where(eq(customers.userId, account.id)).limit(1)
      const firstName = value(form, 'firstName')
      const lastName = value(form, 'lastName')
      const businessName = value(form, 'businessName')
      const customerValues = {
        applicantType: applicantType as 'individual' | 'business',
        firstName: firstName || null,
        lastName: lastName || null,
        businessName: businessName || null,
        phone,
      }
      const [customer] = existingCustomer
        ? await tx.update(customers).set(customerValues).where(eq(customers.id, existingCustomer.id)).returning()
        : await tx.insert(customers).values({ userId: account.id, ...customerValues }).returning()

      const [existingOperation] = await tx.select()
        .from(integrationOperations)
        .where(eq(integrationOperations.idempotencyKey, data.idempotencyKey))
        .limit(1)
      if (existingOperation) {
        if (existingOperation.requestMetadata?.customerId !== customer.id) {
          throw new Error('This submission key is already associated with another application.')
        }
        if (existingOperation.resultMetadata?.reference && existingOperation.resultMetadata.applicationId) {
          return {
            reference: String(existingOperation.resultMetadata.reference),
            applicationId: String(existingOperation.resultMetadata.applicationId),
            duplicate: true,
          }
        }
      }

      const [operation] = await tx.insert(integrationOperations).values({
        provider: 'internal',
        operation: 'submit_application',
        idempotencyKey: data.idempotencyKey,
        status: 'pending',
        requestMetadata: { applicantType, category, customerId: customer.id, userId: account.id },
      }).onConflictDoNothing().returning({ id: integrationOperations.id })

      if (!operation) {
        const [completed] = await tx.select()
          .from(integrationOperations)
          .where(eq(integrationOperations.idempotencyKey, data.idempotencyKey))
          .limit(1)
        if (completed?.requestMetadata?.customerId !== customer.id) {
          throw new Error('This submission key is already associated with another application.')
        }
        if (completed?.resultMetadata?.reference && completed.resultMetadata.applicationId) {
          return {
            reference: String(completed.resultMetadata.reference),
            applicationId: String(completed.resultMetadata.applicationId),
            duplicate: true,
          }
        }
        throw new Error('This application is already being processed. Please wait before retrying.')
      }

      let officeSourceApplication: typeof financeApplications.$inferSelect | null = null
      let referralCode = value(form, 'referralCode').toUpperCase()
      if (data.sourceApplicationId) {
        if (data.draftId) throw new Error('An Office-created application cannot be submitted as a separate saved draft.')
        const [sourceApplication] = await tx.select().from(financeApplications)
          .where(and(
            eq(financeApplications.id, data.sourceApplicationId),
            eq(financeApplications.customerId, customer.id),
            eq(financeApplications.status, 'Draft'),
          )).limit(1)
        if (!sourceApplication || sourceApplication.applicationData.source !== 'office_intake') {
          throw new Error('The Office-created application draft could not be found for your account.')
        }
        officeSourceApplication = sourceApplication
        const originalReferralCode = sourceApplication.referralCode ?? ''
        if (referralCode && referralCode !== originalReferralCode) {
          throw new Error('The partner referral linked by Oxford cannot be changed.')
        }
        referralCode = originalReferralCode
      } else if (data.draftId) {
        const [savedDraft] = await tx.select({ referralCode: financeDrafts.referralCode, expiresAt: financeDrafts.expiresAt })
          .from(financeDrafts)
          .where(and(
            eq(financeDrafts.id, data.draftId),
            eq(financeDrafts.customerId, customer.id),
          ))
          .limit(1)
        if (!savedDraft) throw new Error('The saved application draft could not be found for your account.')
        if (savedDraft.expiresAt && savedDraft.expiresAt <= new Date()) throw new Error('This saved application draft has expired. Please start a new application.')
        const savedReferralCode = savedDraft.referralCode ?? ''
        if (referralCode && referralCode !== savedReferralCode) {
          throw new Error('The referral attribution on this application draft cannot be changed.')
        }
        referralCode = savedReferralCode
      } else if (referralCode) {
        throw new Error('Save your secure application draft before applying a referral code.')
      }
      // Persist the authoritative draft attribution in the submitted application
      // snapshot as well as the dedicated referral relationship.
      safeData.referralCode = referralCode

      let referringPartnerUserId: string | null = null
      let referringPartnerBusinessName: string | null = null
      if (referralCode) {
        const [partner] = await tx.select({
          userId: partnerRegistrations.userId,
          businessName: partnerRegistrations.businessName,
        })
          .from(partnerRegistrations)
          .innerJoin(users, eq(partnerRegistrations.userId, users.id))
          .where(and(
            eq(partnerRegistrations.referralCode, referralCode),
            eq(partnerRegistrations.status, 'Approved'),
            eq(users.accountType, 'partner'),
            eq(users.status, 'active'),
          )).limit(1)
        if (!partner?.userId) throw new Error('The referral code is not recognised or is not active. Check the link or contact the referring partner.')
        referringPartnerUserId = partner.userId
        referringPartnerBusinessName = partner.businessName
      }

      const reference = officeSourceApplication?.reference ?? createApplicationReference()
      const [application] = officeSourceApplication
        ? await tx.update(financeApplications).set({
            applicantType: applicantType as 'individual' | 'business',
            category: category as 'vehicle' | 'equipment' | 'commercial-asset' | 'other',
            status: 'Submitted',
            financeAmount: Math.round(financeAmount),
            assetDescription,
            assetTypeId: selectedAssetType.id,
            industryNameSnapshot: selectedIndustry.name,
            assetCategoryNameSnapshot: selectedAssetCategory.name,
            assetTypeNameSnapshot: selectedAssetType.name,
            referralCode: referralCode || null,
            submittedAt: new Date(),
            applicationData: officeSourceApplication
              ? { ...officeSourceApplication.applicationData, ...safeData, source: 'office_intake' }
              : safeData,
            updatedAt: new Date(),
          }).where(and(
            eq(financeApplications.id, officeSourceApplication.id),
            eq(financeApplications.customerId, customer.id),
            eq(financeApplications.status, 'Draft'),
          )).returning({ id: financeApplications.id })
        : await tx.insert(financeApplications).values({
            reference,
            customerId: customer.id,
            applicantType: applicantType as 'individual' | 'business',
            category: category as 'vehicle' | 'equipment' | 'commercial-asset' | 'other',
            status: 'Submitted',
            financeAmount: Math.round(financeAmount),
            assetDescription,
            assetTypeId: selectedAssetType.id,
            industryNameSnapshot: selectedIndustry.name,
            assetCategoryNameSnapshot: selectedAssetCategory.name,
            assetTypeNameSnapshot: selectedAssetType.name,
            referralCode: referralCode || null,
            submittedAt: new Date(),
            applicationData: safeData,
          }).returning({ id: financeApplications.id })
      if (!application) throw new Error('This application draft has already been submitted or is no longer available.')

      await tx.insert(applicationStatusHistory).values({
        applicationId: application.id,
        fromStatus: officeSourceApplication ? 'Draft' : null,
        toStatus: 'Submitted',
        changedBy: account.id,
        note: officeSourceApplication
          ? 'Applicant completed and submitted the Office-created application.'
          : 'Application submitted by the authenticated customer.',
      })

      const consents = [
        ['accuracy', form.consentAccuracy === true],
        ['processing', form.consentProcessing === true],
        ['share_providers', form.consentShareProviders === true],
        ['credit_check', form.consentCreditCheck === true],
        ['marketing', form.consentMarketing === true],
      ] as const
      await tx.insert(consentRecords).values(consents.map(([consentType, accepted]) => ({
        applicationId: application.id,
        customerId: customer.id,
        consentType,
        accepted,
        wordingVersion: consentVersion,
      })))

      if (referralCode && referringPartnerUserId && !officeSourceApplication) {
        await tx.insert(referrals).values({
          partnerUserId: referringPartnerUserId,
          code: referralCode,
          applicationId: application.id,
          metadata: { source: 'application_form' },
        })
      }

      await tx.insert(notifications).values({
        userId: account.id,
        channel: 'email',
        template: 'application_received',
        status: 'queued',
        payload: {
          reference,
          recipient: email,
          applicantName: applicantType === 'business' ? businessName : [firstName, lastName].filter(Boolean).join(' '),
          partnerBusinessName: referringPartnerBusinessName,
          assetDescription,
        },
      })
      await tx.insert(auditEvents).values({
        actorUserId: account.id,
        event: 'application.submitted',
        resource: 'finance_application',
        resourceId: application.id,
        details: { reference, applicantType, category },
      })
      if (data.draftId) {
        await tx.delete(financeDrafts).where(and(eq(financeDrafts.id, data.draftId), eq(financeDrafts.customerId, customer.id)))
      }
      await tx.update(integrationOperations).set({
        status: 'completed',
        resultMetadata: { applicationId: application.id, reference },
      }).where(eq(integrationOperations.id, operation.id))

      return { reference, applicationId: application.id, duplicate: false }
    })
  })

/** Return only the authenticated customer's own application summaries. */
export const getMyFinanceApplications = createServerFn({ method: 'GET' }).handler(async () => {
  await requireCustomerPermission('own_applications.view')
  const identity = await getUser()
  if (!identity?.id) throw new Error('Please sign in to view your applications.')

  const [account] = await db.select({ id: users.id, status: users.status, accountType: users.accountType })
    .from(users).where(eq(users.identityId, identity.id)).limit(1)
  if (!account || account.status !== 'active' || account.accountType !== 'customer') {
    throw new Error('This account cannot access the customer application dashboard.')
  }
  const [customer] = await db.select({ id: customers.id }).from(customers)
    .where(eq(customers.userId, account.id)).limit(1)
  if (!customer) return []

  const applications = await db.select({
    id: financeApplications.id,
    reference: financeApplications.reference,
    applicantType: financeApplications.applicantType,
    category: financeApplications.category,
    status: financeApplications.status,
    financeAmount: financeApplications.financeAmount,
    assetDescription: financeApplications.assetDescription,
    submittedAt: financeApplications.submittedAt,
    updatedAt: financeApplications.updatedAt,
    applicationData: financeApplications.applicationData,
  }).from(financeApplications)
    .where(eq(financeApplications.customerId, customer.id))
    .orderBy(financeApplications.createdAt)

  if (applications.length === 0) return []
  const history = await db.select({
    applicationId: applicationStatusHistory.applicationId,
    fromStatus: applicationStatusHistory.fromStatus,
    toStatus: applicationStatusHistory.toStatus,
    createdAt: applicationStatusHistory.createdAt,
  }).from(applicationStatusHistory)
    .where(inArray(applicationStatusHistory.applicationId, applications.map((application) => application.id)))
    .orderBy(desc(applicationStatusHistory.createdAt))

  return applications.map((application) => ({
    id: application.id,
    reference: application.reference,
    applicantType: application.applicantType,
    category: application.category,
    status: application.status,
    financeAmount: application.financeAmount,
    assetDescription: application.assetDescription,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    isOfficeIntakeDraft: application.status === 'Draft' && application.applicationData.source === 'office_intake',
    statusHistory: history
      .filter((entry) => entry.applicationId === application.id)
      .map(({ fromStatus, toStatus, createdAt }) => ({ fromStatus, toStatus, createdAt })),
  }))
  })

const draftInput = z.object({
  draftId: z.string().uuid().optional(),
  applicantType: z.enum(['individual', 'business']),
  category: z.enum(['vehicle', 'equipment', 'commercial-asset', 'other']),
  stepIndex: z.number().int().min(0).max(6),
  form: z.record(z.string(), z.unknown()),
})

async function requireCustomerAccount(permission: PermissionKey) {
  await requireCustomerPermission(permission)
  const identity = await requireVerifiedIdentity()
  const [account] = await db.select().from(users)
    .where(and(eq(users.identityId, identity.id), eq(users.status, 'active'))).limit(1)
  if (!account || account.accountType !== 'customer') {
    throw new Error('An active customer account is required to save a server-side draft.')
  }
  let [customer] = await db.select().from(customers).where(eq(customers.userId, account.id)).limit(1)
  if (!customer) {
    ;[customer] = await db.insert(customers).values({
      userId: account.id, applicantType: 'individual',
    }).returning()
  }
  return { account, customer }
}

export const saveFinanceDraft = createServerFn({ method: 'POST' })
  .validator((input: unknown) => draftInput.parse(input))
  .handler(async ({ data }) => {
    if (data.draftId) assertExistingDraftEditingEnabled()
    else assertApplicationProcessingEnabled()
    const { customer } = await requireCustomerAccount(data.draftId ? 'own_applications.edit' : 'own_applications.create')
    const form = { ...data.form }
    if (data.draftId) {
      const [existingDraft] = await db.select({ referralCode: financeDrafts.referralCode, expiresAt: financeDrafts.expiresAt })
        .from(financeDrafts)
        .where(and(
          eq(financeDrafts.id, data.draftId),
          eq(financeDrafts.customerId, customer.id),
        ))
        .limit(1)
      if (!existingDraft) throw new Error('This saved draft could not be found for your account.')
      if (existingDraft.expiresAt && existingDraft.expiresAt <= new Date()) throw new Error('This saved application draft has expired. Please start a new application.')
      // Keep the encrypted form snapshot aligned with the immutable referral
      // attribution recorded when the server-side draft was first created.
      form.referralCode = existingDraft.referralCode ?? ''
    }
    delete form.idNumber
    const encryptedForm = encryptApplicantData(form)
    const draftData = { encryptedForm, stepIndex: data.stepIndex }
    if (data.draftId) {
      const [updated] = await db.update(financeDrafts).set({
        applicantType: data.applicantType,
        category: data.category,
        draftData,
        updatedAt: new Date(),
      }).where(and(eq(financeDrafts.id, data.draftId), eq(financeDrafts.customerId, customer.id)))
        .returning({ id: financeDrafts.id })
      if (!updated) throw new Error('This saved draft could not be found for your account.')
      return { id: updated.id }
    }
    const referralCode = typeof form.referralCode === 'string' ? form.referralCode.trim().toUpperCase() : ''
    if (referralCode) {
      const [partner] = await db.select({ userId: partnerRegistrations.userId })
        .from(partnerRegistrations)
        .where(and(
          eq(partnerRegistrations.referralCode, referralCode),
          eq(partnerRegistrations.status, 'Approved'),
        ))
        .limit(1)
      if (!partner?.userId) throw new Error('The referral code is not recognised or is not active.')
    }

    const [created] = await db.insert(financeDrafts).values({
      customerId: customer.id,
      idempotencyKey: randomUUID(),
      applicantType: data.applicantType,
      category: data.category,
      referralCode: referralCode || null,
      draftData,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }).returning({ id: financeDrafts.id })
    return { id: created.id }
  })

export const getMyFinanceDrafts = createServerFn({ method: 'GET' }).handler(async () => {
  const { customer } = await requireCustomerAccount('own_applications.view')
  const drafts = await db.select({
    id: financeDrafts.id,
    applicantType: financeDrafts.applicantType,
    category: financeDrafts.category,
    updatedAt: financeDrafts.updatedAt,
    expiresAt: financeDrafts.expiresAt,
    draftData: financeDrafts.draftData,
  }).from(financeDrafts)
    .where(and(eq(financeDrafts.customerId, customer.id), gt(financeDrafts.expiresAt, new Date())))
    .orderBy(desc(financeDrafts.updatedAt))
  return drafts.filter((draft) => !draft.expiresAt || draft.expiresAt > new Date()).map((draft) => ({
    id: draft.id,
    applicantType: draft.applicantType,
    category: draft.category,
    updatedAt: draft.updatedAt,
    stepIndex: typeof draft.draftData.stepIndex === 'number' ? draft.draftData.stepIndex : 0,
  }))
})

export const loadMyFinanceDraft = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ draftId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { customer } = await requireCustomerAccount('own_applications.edit')
    const [draft] = await db.select().from(financeDrafts)
      .where(and(
        eq(financeDrafts.id, data.draftId),
        eq(financeDrafts.customerId, customer.id),
        gt(financeDrafts.expiresAt, new Date()),
      ))
      .limit(1)
    if (!draft) throw new Error('Saved draft not found or expired.')
    if (draft.expiresAt && draft.expiresAt <= new Date()) throw new Error('This saved application draft has expired. Please start a new application.')
    const encryptedForm = draft.draftData.encryptedForm
    if (typeof encryptedForm !== 'string') throw new Error('Saved draft data is incomplete.')
    return {
      form: JSON.parse(JSON.stringify(decryptApplicantData(encryptedForm))) as SerializableRecord,
      stepIndex: typeof draft.draftData.stepIndex === 'number' ? draft.draftData.stepIndex : 0,
    }
  })

export const deleteMyFinanceDraft = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ draftId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { customer } = await requireCustomerAccount('own_applications.edit')
    await db.delete(financeDrafts).where(and(
      eq(financeDrafts.id, data.draftId),
      eq(financeDrafts.customerId, customer.id),
    ))
    return { success: true }
  })


const officeDraftInput = z.object({ applicationId: z.string().uuid() })
const officeDraftSaveInput = z.object({
  applicationId: z.string().uuid(),
  stepIndex: z.number().int().min(0).max(6),
  form: z.record(z.string(), z.unknown()),
})

/** Load an Office-created Draft only for its verified applicant account. */
export const loadMyOfficeApplicationDraft = createServerFn({ method: 'POST' })
  .validator((input: unknown) => officeDraftInput.parse(input))
  .handler(async ({ data }) => {
    assertExistingDraftEditingEnabled()
    const { customer } = await requireCustomerAccount('own_applications.edit')
    const [application] = await db.select().from(financeApplications)
      .where(and(
        eq(financeApplications.id, data.applicationId),
        eq(financeApplications.customerId, customer.id),
        eq(financeApplications.status, 'Draft'),
      )).limit(1)
    if (!application || application.applicationData.source !== 'office_intake') {
      throw new Error('This Office-created application draft is not available for your account.')
    }
    const [asset] = application.assetTypeId
      ? await db.select({
          industryId: assetIndustries.id,
          categoryId: assetCategories.id,
        }).from(assetTypes)
          .innerJoin(assetCategories, eq(assetTypes.categoryId, assetCategories.id))
          .innerJoin(assetIndustries, eq(assetCategories.industryId, assetIndustries.id))
          .where(eq(assetTypes.id, application.assetTypeId)).limit(1)
      : [undefined]
    const stored = application.applicationData
    const encrypted = typeof stored.piiCiphertext === 'string' ? stored.piiCiphertext : ''
    const privateData = encrypted ? decryptApplicantData(encrypted) : {}
    const applicantName = typeof stored.applicantName === 'string' ? stored.applicantName : ''
    const nameParts = applicantName.trim().split(/\s+/)
    const form: Record<string, unknown> = {
      applicantType: application.applicantType,
      category: application.category,
      firstName: typeof stored.firstName === 'string' ? stored.firstName : (nameParts[0] ?? ''),
      lastName: typeof stored.lastName === 'string' ? stored.lastName : nameParts.slice(1).join(' '),
      businessName: typeof stored.businessName === 'string' ? stored.businessName : (application.applicantType === 'business' ? applicantName : ''),
      tradingName: typeof stored.tradingName === 'string' ? stored.tradingName : '',
      entityType: typeof stored.entityType === 'string' ? stored.entityType : '',
      email: typeof stored.email === 'string' ? stored.email : '',
      phone: typeof stored.phone === 'string' ? stored.phone : '',
      amount: stored.amount === undefined ? (application.financeAmount === null ? '' : String(application.financeAmount)) : String(stored.amount),
      term: typeof stored.term === 'string' ? stored.term : '60',
      deposit: typeof stored.deposit === 'string' ? stored.deposit : '',
      assetDescription: typeof stored.assetDescription === 'string' ? stored.assetDescription : (application.assetDescription ?? ''),
      assetIndustryId: typeof stored.assetIndustryId === 'string' ? stored.assetIndustryId : (asset?.industryId ?? ''),
      assetCategoryId: typeof stored.assetCategoryId === 'string' ? stored.assetCategoryId : (asset?.categoryId ?? ''),
      assetTypeId: typeof stored.assetTypeId === 'string' ? stored.assetTypeId : (application.assetTypeId ?? ''),
      referralCode: application.referralCode ?? '',
      ...privateData,
    }
    return {
      // Server-function results must contain JSON-safe values. Decrypted
      // applicant data is converted through JSON before crossing the boundary.
      form: JSON.parse(JSON.stringify(form)) as SerializableRecord,
      stepIndex: typeof stored.completionStepIndex === 'number' ? stored.completionStepIndex : 0,
    }
  })

/** Save applicant completion to the same Office-created Draft; sensitive fields are encrypted. */
export const saveMyOfficeApplicationDraft = createServerFn({ method: 'POST' })
  .validator((input: unknown) => officeDraftSaveInput.parse(input))
  .handler(async ({ data }) => {
    assertExistingDraftEditingEnabled()
    const { customer } = await requireCustomerAccount('own_applications.edit')
    const [existing] = await db.select().from(financeApplications)
      .where(and(
        eq(financeApplications.id, data.applicationId),
        eq(financeApplications.customerId, customer.id),
        eq(financeApplications.status, 'Draft'),
      )).limit(1)
    if (!existing || existing.applicationData.source !== 'office_intake') {
      throw new Error('This Office-created application draft is not available for your account.')
    }
    const form = data.form
    const assetTypeId = required(form, 'assetTypeId')
    const [asset] = await db.select({
      id: assetTypes.id,
      name: assetTypes.name,
      categoryId: assetCategories.id,
      categoryName: assetCategories.name,
      industryId: assetIndustries.id,
      industryName: assetIndustries.name,
      financeCategory: assetCategories.financeCategory,
    }).from(assetTypes)
      .innerJoin(assetCategories, eq(assetTypes.categoryId, assetCategories.id))
      .innerJoin(assetIndustries, eq(assetCategories.industryId, assetIndustries.id))
      .where(and(
        eq(assetTypes.id, assetTypeId),
        eq(assetTypes.isActive, true),
        eq(assetCategories.isActive, true),
        eq(assetIndustries.isActive, true),
      )).limit(1)
    if (!asset || asset.financeCategory !== existing.category) {
      throw new Error('Select an active asset from the correct finance category.')
    }
    const amount = Number(required(form, 'amount'))
    if (!Number.isFinite(amount) || amount < 10000 || amount > 2_000_000_000) {
      throw new Error('Enter a valid finance amount of at least R10 000.')
    }
    const sensitiveKeys = [
      'idType', 'idNumber', 'dateOfBirth', 'address', 'employmentStatus', 'employer',
      'grossMonthlyIncome', 'netMonthlyIncome', 'registrationNumber', 'yearsTrading',
      'industry', 'businessAddress', 'annualTurnover', 'directors', 'contactName', 'comments',
    ]
    const privateData: Record<string, unknown> = {}
    for (const key of sensitiveKeys) {
      if (form[key] !== undefined && form[key] !== '') privateData[key] = form[key]
    }
    const safeData: Record<string, unknown> = {
      ...existing.applicationData,
      applicantType: existing.applicantType,
      category: existing.category,
      firstName: value(form, 'firstName'),
      lastName: value(form, 'lastName'),
      businessName: value(form, 'businessName'),
      tradingName: value(form, 'tradingName'),
      email: value(form, 'email').toLowerCase(),
      phone: value(form, 'phone'),
      entityType: value(form, 'entityType'),
      amount,
      term: value(form, 'term'),
      deposit: value(form, 'deposit'),
      assetDescription: asset.name,
      assetIndustryId: asset.industryId,
      industryName: asset.industryName,
      assetCategoryId: asset.categoryId,
      assetCategoryName: asset.categoryName,
      assetTypeId: asset.id,
      referralCode: existing.referralCode ?? '',
      piiCiphertext: encryptApplicantData(privateData),
      piiEncryptionVersion: 'aes-256-gcm-v1',
      completionStepIndex: data.stepIndex,
      completionRequired: true,
    }
    const [updated] = await db.update(financeApplications).set({
      financeAmount: Math.round(amount),
      assetDescription: asset.name,
      assetTypeId: asset.id,
      industryNameSnapshot: asset.industryName,
      assetCategoryNameSnapshot: asset.categoryName,
      assetTypeNameSnapshot: asset.name,
      applicationData: safeData,
      updatedAt: new Date(),
    }).where(and(
      eq(financeApplications.id, existing.id),
      eq(financeApplications.customerId, customer.id),
      eq(financeApplications.status, 'Draft'),
    )).returning({ id: financeApplications.id })
    if (!updated) throw new Error('This application draft was submitted or changed before your save completed.')
    return { success: true }
  })
