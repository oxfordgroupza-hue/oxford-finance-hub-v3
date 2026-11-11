import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { auditEvents, customerPreferences, customers, users } from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { decryptApplicantData, encryptApplicantData } from './pii-crypto.server'
import { withoutApplicantPii } from './applicant-pii-sanitization'

async function requireProfilePermission(permission: 'own_profile.view' | 'own_profile.edit') {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      (session.user.accountType !== 'customer' && session.user.accountType !== 'partner')) {
    throw new Error('An active customer or partner account is required.')
  }
  if (!session.permissions.includes(permission)) {
    throw new Error(`Your account does not have the ${permission} permission.`)
  }
  return session
}

async function getOrCreateCustomer(userId: string) {
  const rows = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1)
  if (rows[0]) return rows[0]
  await db.insert(customers).values({ userId, applicantType: 'individual' }).onConflictDoNothing()
  const created = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1)
  if (!created[0]) throw new Error('Your customer profile could not be loaded. Please try again.')
  return created[0]
}

export const getCustomerProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await requireProfilePermission('own_profile.view')
  const customer = await getOrCreateCustomer(session.user.id)
  const preferenceRows = await db.select({ preferences: customerPreferences.preferences })
    .from(customerPreferences).where(eq(customerPreferences.customerId, customer.id)).limit(1)
  const preferences: Record<string, unknown> = preferenceRows[0]?.preferences ?? {}
  const storedProfile = customer.profile ?? {}
  const privateProfile = typeof storedProfile.piiCiphertext === 'string'
    ? decryptApplicantData(storedProfile.piiCiphertext)
    : {}
  const firstName = typeof privateProfile.firstName === 'string' ? privateProfile.firstName : customer.firstName ?? ''
  const lastName = typeof privateProfile.lastName === 'string' ? privateProfile.lastName : customer.lastName ?? ''
  const phone = typeof privateProfile.phone === 'string' ? privateProfile.phone : customer.phone ?? ''
  return {
    name: [firstName, lastName].filter(Boolean).join(' ') || session.user.displayName || '',
    email: session.user.email,
    phone,
    statusEmails: preferences.statusEmails !== false,
    marketing: preferences.marketing === true,
    preferredContact: preferences.preferredContact === 'Phone' ? 'Phone' as const : 'Email' as const,
    canEdit: session.permissions.includes('own_profile.edit'),
  }
})

const updateProfileInput = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).default(''),
  statusEmails: z.boolean(),
  marketing: z.boolean(),
  preferredContact: z.enum(['Email', 'Phone']),
})

export const updateCustomerProfile = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateProfileInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireProfilePermission('own_profile.edit')
    if (data.phone && !/^[+()\d\s-]{9,40}$/.test(data.phone)) {
      throw new Error('Enter a valid contact telephone number.')
    }
    const nameParts = data.name.trim().split(/\s+/)
    const firstName = nameParts.shift() ?? ''
    const lastName = nameParts.join(' ')
    if (!firstName || !lastName) throw new Error('Enter your first name and surname.')

    const customer = await getOrCreateCustomer(session.user.id)
    const now = new Date()
    const preferences = {
      statusEmails: data.statusEmails,
      marketing: data.marketing,
      preferredContact: data.preferredContact,
    }
    const storedProfile = customer.profile ?? {}
    const existingPii = typeof storedProfile.piiCiphertext === 'string'
      ? decryptApplicantData(storedProfile.piiCiphertext)
      : {}
    const encryptedProfile = encryptApplicantData({
      ...existingPii,
      firstName,
      lastName,
      phone: data.phone,
    })

    await db.transaction(async (tx) => {
      await tx.update(customers).set({
        firstName: null,
        lastName: null,
        businessName: null,
        phone: null,
        profile: { ...withoutApplicantPii(storedProfile), piiCiphertext: encryptedProfile, piiEncryptionVersion: 'aes-256-gcm-v1' },
        updatedAt: now,
      }).where(eq(customers.id, customer.id))
      await tx.update(users).set({ displayName: null, updatedAt: now })
        .where(eq(users.id, session.user.id))
      const existingRows = await tx.select({ id: customerPreferences.id })
        .from(customerPreferences).where(eq(customerPreferences.customerId, customer.id)).limit(1)
      if (existingRows[0]) {
        await tx.update(customerPreferences).set({ preferences, updatedAt: now })
          .where(eq(customerPreferences.id, existingRows[0].id))
      } else {
        await tx.insert(customerPreferences).values({ customerId: customer.id, preferences })
      }
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'customer.profile_updated',
        resource: 'customer',
        resourceId: customer.id,
        details: { fields: ['name', 'phone', 'communication_preferences'] },
      })
    })

    return {
      name: data.name.trim(),
      email: session.user.email,
      phone: data.phone,
      statusEmails: data.statusEmails,
      marketing: data.marketing,
      preferredContact: data.preferredContact,
      canEdit: true,
    }
  })
