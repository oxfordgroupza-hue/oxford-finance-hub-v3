import { createServerFn } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'
import { isIdentityEmailConfirmed } from './identity-verification'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { auditEvents, notifications, partnerRegistrations, supportRequests, users } from '../../db/schema'

const enquiryInput = z.object({
  kind: z.enum(['contact', 'support', 'complaint', 'partner']),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().default(''),
  message: z.string().trim().min(5).max(5000),
  fields: z.record(z.string().max(40), z.string().trim().max(500)).default({})
    .refine((fields) => Object.keys(fields).length <= 10, 'Too many additional fields were submitted.'),
})

export const submitEnquiry = createServerFn({ method: 'POST' })
  .validator((input: unknown) => enquiryInput.parse(input))
  .handler(async ({ data }) => {
    let linkedUserId: string | null = null
    let linkedEmail: string | null = null
    let linkedEmailVerified = false
    try {
      const identity = await getUser()
      if (identity?.id) {
        linkedEmail = identity.email?.trim().toLowerCase() ?? null
        linkedEmailVerified = isIdentityEmailConfirmed(identity)
        const [account] = await db.select({ id: users.id, status: users.status })
          .from(users).where(eq(users.identityId, identity.id)).limit(1)
        if (account?.status === 'active') linkedUserId = account.id
      }
    } catch {
      // Public enquiries remain available when no Identity session exists.
    }

    if (data.kind === 'partner') {
      if (!linkedUserId || !linkedEmailVerified) {
        throw new Error('Please sign in with an Oxford account that has a verified email address before submitting a partner registration.')
      }
      if (linkedEmail !== data.email.toLowerCase()) {
        throw new Error('Use the same email address as your signed-in Oxford account so the partner registration can be linked securely.')
      }
      const organisation = data.fields.organisation?.trim()
      const partnerType = data.fields.type?.trim()
      if (!organisation || !partnerType) throw new Error('Enter the organisation and partner type.')
      const [registration] = await db.insert(partnerRegistrations).values({
        userId: linkedUserId,
        businessName: organisation,
        contactName: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        status: 'Pending approval',
        details: { partnerType, message: data.message, additionalFields: data.fields },
      }).returning({ id: partnerRegistrations.id })
      await db.insert(notifications).values({
        userId: null, channel: 'email', template: 'new_partner_registration', status: 'queued',
        payload: { registrationId: registration.id, organisation, contactName: data.name, email: data.email },
      })
      await db.insert(auditEvents).values({
        actorUserId: linkedUserId,
        event: 'partner.registration_received',
        resource: 'partner_registration',
        resourceId: registration.id,
        details: { partnerType },
      })
      return { id: registration.id, kind: 'partner' as const }
    }

    const channel = data.kind === 'contact' ? 'Contact form' : data.kind === 'complaint' ? 'Complaint' : 'Support'
    const [request] = await db.insert(supportRequests).values({
      userId: linkedUserId,
      channel,
      status: 'Open',
      name: data.name,
      email: data.email.toLowerCase(),
      subject: data.fields.topic || data.fields.subject || (data.kind === 'complaint' ? 'Complaint received' : 'Website enquiry'),
      message: data.message,
    }).returning({ id: supportRequests.id })
    await db.insert(notifications).values({
      userId: null, channel: 'email', template: 'new_support_request', status: 'queued',
      payload: { requestId: request.id, channel, name: data.name, email: data.email },
    })
    await db.insert(auditEvents).values({
      actorUserId: linkedUserId,
      event: 'support.request_received',
      resource: 'support_request',
      resourceId: request.id,
      details: { channel },
    })
    return { id: request.id, kind: 'support' as const }
  })
