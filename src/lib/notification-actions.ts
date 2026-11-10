import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, lt } from 'drizzle-orm'
import { db } from '../../db'
import { auditEvents, customerPreferences, customers, notifications, users } from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { decryptApplicantData } from './pii-crypto'
import { isNotificationRetryEligible } from './notification-retry-policy'

type AuthenticatedOfficeSession = Extract<Awaited<ReturnType<typeof getAuthorizationSnapshot>>, { authenticated: true; provisioned: true }>

function requireOfficeNotificationPermission(session: Awaited<ReturnType<typeof getAuthorizationSnapshot>>, permission: 'notifications.view' | 'notifications.manage'): AuthenticatedOfficeSession {
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'office' ||
      (!session.isSuperAdmin && !session.permissions.includes(permission))) {
    throw new Error(`You do not have permission to ${permission === 'notifications.view' ? 'view' : 'manage'} notifications.`)
  }
  return session
}

function deliveryEnabled() {
  // Feature flags may accidentally be scoped to all Netlify contexts. Require
  // both the build context and the exact preview hostname before any email
  // can be sent from this migration branch.
  const previewUrl = process.env.DEPLOY_PRIME_URL ?? ''
  const isExpectedDeployPreview = process.env.CONTEXT === 'deploy-preview' &&
    /^https:\/\/deploy-preview-\d+--oxford-finance-hub-v2\.netlify\.app\/?$/i.test(previewUrl)
  return isExpectedDeployPreview && process.env.OXFORD_EMAIL_DELIVERY_ENABLED === 'true'
}

function configured() {
  return Boolean(
    process.env.BREVO_API_KEY &&
    process.env.OXFORD_NOTIFICATION_FROM_EMAIL &&
    process.env.OXFORD_NOTIFICATION_ADMIN_EMAIL,
  )
}

export const getNotificationQueue = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAuthorizationSnapshot()
  requireOfficeNotificationPermission(session, 'notifications.view')
  const rows = await db.select({
    id: notifications.id,
    channel: notifications.channel,
    template: notifications.template,
    status: notifications.status,
    attempts: notifications.attempts,
    lastError: notifications.lastError,
    createdAt: notifications.createdAt,
    sentAt: notifications.sentAt,
  }).from(notifications).orderBy(desc(notifications.createdAt)).limit(100)
  return {
    notifications: rows,
    providerConfigured: configured(),
    deliveryEnabled: deliveryEnabled(),
  }
})

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character)
}

function validEmail(value: string | null | undefined) {
  const email = value?.trim() ?? ''
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

async function resolveRecipient(item: typeof notifications.$inferSelect) {
  const payload = item.payload ?? {}
  if (item.template === 'new_support_request' || item.template === 'new_partner_registration') {
    return validEmail(process.env.OXFORD_NOTIFICATION_ADMIN_EMAIL)
  }
  if (item.userId) {
    const [account] = await db.select({ email: users.email }).from(users).where(eq(users.id, item.userId)).limit(1)
    const accountEmail = validEmail(account?.email)
    if (!accountEmail) return null
    if (item.template === 'application_status_updated') {
      const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, item.userId)).limit(1)
      if (customer) {
        const [preferences] = await db.select({ value: customerPreferences.preferences })
          .from(customerPreferences).where(eq(customerPreferences.customerId, customer.id)).limit(1)
        if (preferences?.value?.statusEmails === false) return null
      }
    }
    return accountEmail
  }
  return typeof payload.recipient === 'string' ? validEmail(payload.recipient) : null
}

function emailContent(template: string, payload: Record<string, unknown>) {
  const reference = typeof payload.reference === 'string' ? payload.reference.replace(/[^A-Za-z0-9-]/g, '').slice(0, 40) || 'your application' : 'your application'
  const status = typeof payload.status === 'string' ? payload.status.replace(/[\r\n]/g, ' ').slice(0, 80) : ''
  const assetDescription = typeof payload.assetDescription === 'string'
    ? payload.assetDescription.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
    : ''
  const partnerBusinessName = typeof payload.partnerBusinessName === 'string'
    ? payload.partnerBusinessName.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
    : ''
  const applicantName = typeof payload.applicantName === 'string'
    ? payload.applicantName.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
    : ''
  if (template === 'application_received') {
    const applicationFor = assetDescription || 'your selected equipment or vehicle'
    const message = partnerBusinessName
      ? `${partnerBusinessName} has submitted your ${applicationFor} finance application to Oxford Business Group for review. Your application reference is ${reference}.`
      : `Oxford Business Group has received your ${applicationFor} finance application for review. Your application reference is ${reference}.`
    return {
      subject: `Oxford Finance Hub application received | ${reference}`,
      heading: applicantName ? `Thank you, ${applicantName}. Your application has been received` : 'Your application has been received',
      message,
    }
  }
  if (template === 'office_applicant_invitation') {
    const envelope = typeof payload.invitationEnvelope === 'string' ? payload.invitationEnvelope : ''
    const rawUrl = (() => {
      try {
        const secret = decryptApplicantData(envelope)
        return typeof secret.invitationUrl === 'string' ? secret.invitationUrl : ''
      } catch {
        throw new Error('The applicant invitation details could not be securely decrypted.')
      }
    })()
    const expectedOrigin = (process.env.DEPLOY_PRIME_URL ?? '').replace(/\/$/, '')
    let actionUrl = ''
    try {
      const parsed = new URL(rawUrl)
      if (process.env.CONTEXT === 'deploy-preview' &&
          /^https:\/\/deploy-preview-\d+--oxford-finance-hub-v2\.netlify\.app$/i.test(parsed.origin) &&
          parsed.origin === expectedOrigin && parsed.pathname === '/invitation') actionUrl = parsed.toString()
    } catch { actionUrl = '' }
    const expiresAt = typeof payload.expiresAt === 'string' ? new Date(payload.expiresAt) : null
    if (!actionUrl || !expiresAt || !Number.isFinite(expiresAt.getTime())) throw new Error('The applicant invitation details are invalid or expired.')
    const applicantName = typeof payload.applicantName === 'string' ? payload.applicantName.replace(/[\r\n\t]/g, ' ').slice(0, 120) : ''
    const asset = assetDescription || 'your selected finance asset'
    const partnerLine = partnerBusinessName ? ' Your referring merchant partner is ' + partnerBusinessName + '.' : ''
    const expiry = expiresAt.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' })
    return {
      subject: 'Oxford Finance Hub | Complete your application | ' + reference,
      heading: applicantName ? 'Hello ' + applicantName + ', Oxford has started your application' : 'Oxford has started your application',
      message: 'An Office representative has prepared an application intake for ' + asset + ' (reference ' + reference + ').' + partnerLine + ' Use the secure invitation link to create your own account or sign in, verify your email address and continue. This link expires on ' + expiry + '. Do not forward it to anyone.',
      actionUrl,
    }
  }
  if (template === 'application_status_updated') {
    return {
      subject: `Oxford Finance Hub update | ${reference}`,
      heading: 'There is an update to your application',
      message: `The status of application ${reference} is now: ${status}. Sign in to your Oxford Finance Hub dashboard to view the latest information.`,
    }
  }
  if (template === 'new_support_request') {
    return {
      subject: 'Oxford Finance Hub | New support request',
      heading: 'A new support request has been received',
      message: 'A new enquiry or support request has been saved to the office inbox. Sign in to the Oxford Finance Hub office workspace to review it.',
    }
  }
  if (template === 'new_partner_registration') {
    return {
      subject: 'Oxford Finance Hub | New partner registration',
      heading: 'A partner registration needs review',
      message: 'A new partner registration has been saved. Sign in to the Oxford Finance Hub office workspace to review and process it.',
    }
  }
  if (template === 'partner_referral_registered') {
    const applicationFor = assetDescription || 'the selected financed asset'
    return {
      subject: `Oxford Finance Hub | Referral registered | ${reference}`,
      heading: 'Your merchant referral has been registered',
      message: `Oxford Business Group has recorded your business as the referring merchant partner for ${applicationFor} (application reference ${reference}). This confirms referral registration only; it does not provide access to applicant documents or private information.`,
    }
  }
  throw new Error('This notification template is not supported.')
}

export const processNotificationQueue = createServerFn({ method: 'POST' }).handler(async () => {
  const session = requireOfficeNotificationPermission(await getAuthorizationSnapshot(), 'notifications.manage')
  if (!configured()) throw new Error('Brevo transactional email is not configured. Add the API key, verified sender and office notification address in Netlify.')
  if (!deliveryEnabled()) {
    throw new Error('Email delivery is disabled. Enable it only after the sender and preview test have been verified.')
  }

  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.OXFORD_NOTIFICATION_FROM_EMAIL
  const senderName = process.env.OXFORD_NOTIFICATION_FROM_NAME || 'Oxford Finance Hub'
  if (!apiKey || !senderEmail) throw new Error('Brevo sender configuration is incomplete.')

  // Recover messages left in "processing" after a timed-out function invocation.
  // The conditional claim below prevents two office users from sending the same row.
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000)
  await db.update(notifications).set({
    status: 'failed',
    lastError: 'Recovered an interrupted delivery attempt. It is eligible for a controlled retry.',
    updatedAt: new Date(),
  }).where(and(
    eq(notifications.channel, 'email'),
    eq(notifications.status, 'processing'),
    lt(notifications.updatedAt, staleBefore),
  ))

  const candidates = await db.select().from(notifications)
    .where(and(eq(notifications.channel, 'email'), inArray(notifications.status, ['queued', 'failed'])))
    .orderBy(notifications.createdAt)
    .limit(100)
  const now = Date.now()
  const pending = candidates.filter((item) => item.status === 'queued' ||
    isNotificationRetryEligible(item.attempts, item.updatedAt, now)).slice(0, 20)
  let sent = 0
  let failed = 0

  for (const item of pending) {
    if (item.attempts >= 5) continue
    const [claimed] = await db.update(notifications).set({
      status: 'processing',
      attempts: item.attempts + 1,
      updatedAt: new Date(),
    }).where(and(
      eq(notifications.id, item.id),
      eq(notifications.status, item.status),
    )).returning({ id: notifications.id })
    if (!claimed) continue

    try {
      const recipient = await resolveRecipient(item)
      if (!recipient) {
        await db.update(notifications).set({
          status: 'skipped',
          lastError: 'No eligible recipient was available for this notification.',
          updatedAt: new Date(),
        }).where(eq(notifications.id, item.id))
        continue
      }
      const content = emailContent(item.template, item.payload ?? {})
      const actionUrl = 'actionUrl' in content && typeof content.actionUrl === 'string' ? content.actionUrl : ''
      const actionLink = actionUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#c7a45a;color:#111;padding:13px 20px;text-decoration:none;font-weight:bold">Continue your application securely</a></p>` : ''
      const htmlContent = `<div style="background:#0b0b0b;color:#f5f1e8;padding:36px;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;border:1px solid #9e8248;padding:32px"><p style="color:#c7a45a;letter-spacing:3px;font-size:12px">OXFORD FINANCE HUB</p><h1 style="font-family:Georgia,serif;font-weight:400">${escapeHtml(content.heading)}</h1><p style="line-height:1.7;color:#d8d2c5">${escapeHtml(content.message)}</p>${actionLink}<p style="margin-top:32px;color:#c7a45a">Oxford Business Group</p><p style="font-size:12px;color:#aaa">Finance intermediary, not a bank or lender. All finance is subject to provider assessment.</p></div></div>`
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: recipient }],
          subject: content.subject,
          htmlContent,
          textContent: `${content.heading}\n\n${content.message}${actionUrl ? `\n\nContinue securely: ${actionUrl}` : ''}\n\nOxford Business Group`,
        }),
      })
      if (!response.ok) throw new Error(`Brevo delivery failed with HTTP ${response.status}.`)
      await db.update(notifications).set({
        status: 'sent',
        lastError: null,
        sentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(notifications.id, item.id))
      await db.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'notification.email_sent',
        resource: 'notification',
        resourceId: item.id,
        details: { template: item.template, recipientDomain: recipient.split('@')[1] ?? '' },
      })
      sent++
    } catch (error) {
      await db.update(notifications).set({
        status: 'failed',
        lastError: error instanceof Error ? error.message.slice(0, 180) : 'Email delivery failed.',
        updatedAt: new Date(),
      }).where(eq(notifications.id, item.id))
      failed++
    }
  }

  return { processed: sent + failed, sent, failed }
})
