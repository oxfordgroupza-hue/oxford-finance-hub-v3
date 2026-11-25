import { getServerEnv } from './server-runtime-env'
import { getRequest } from '@tanstack/react-start/server'
import { isApprovedCloudflarePreviewRequest } from './document-storage-security'

type AuthEmailEnvironment = {
  BREVO_API_KEY?: string
  OXFORD_NOTIFICATION_FROM_EMAIL?: string
  OXFORD_NOTIFICATION_FROM_NAME?: string
  OXFORD_EMAIL_DELIVERY_ENABLED?: string
  OXFORD_NOTIFICATION_ADMIN_EMAIL?: string
  OXFORD_INITIAL_SUPER_ADMIN_EMAIL?: string
}

function configuration() {
  const runtime: AuthEmailEnvironment = {
    BREVO_API_KEY: getServerEnv('BREVO_API_KEY'),
    OXFORD_NOTIFICATION_FROM_EMAIL: getServerEnv('OXFORD_NOTIFICATION_FROM_EMAIL'),
    OXFORD_NOTIFICATION_FROM_NAME: getServerEnv('OXFORD_NOTIFICATION_FROM_NAME'),
    OXFORD_EMAIL_DELIVERY_ENABLED: getServerEnv('OXFORD_EMAIL_DELIVERY_ENABLED'),
    OXFORD_NOTIFICATION_ADMIN_EMAIL: getServerEnv('OXFORD_NOTIFICATION_ADMIN_EMAIL'),
    OXFORD_INITIAL_SUPER_ADMIN_EMAIL: getServerEnv('OXFORD_INITIAL_SUPER_ADMIN_EMAIL'),
  }
  // Fail closed: authentication emails must obey the same explicit preview/production
  // delivery switch as every other Oxford notification. Missing means disabled.
  if (runtime.OXFORD_EMAIL_DELIVERY_ENABLED !== 'true') {
    throw new Error('Oxford account email delivery is disabled for this environment.')
  }
  const apiKey = runtime.BREVO_API_KEY
  const sender = runtime.OXFORD_NOTIFICATION_FROM_EMAIL
  if (!apiKey || !sender || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) {
    throw new Error('Oxford account email delivery is not configured for this Cloudflare environment.')
  }
  return { apiKey, sender, senderName: runtime.OXFORD_NOTIFICATION_FROM_NAME || 'Oxford Finance Hub' }
}

export function assertOxfordAuthEmailConfigured() {
  configuration()
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

export async function sendOxfordAuthEmail(input: {
  to: string
  name: string
  url: string
  purpose: 'verification' | 'recovery'
}) {
  const config = configuration()
  const request = getRequest()
  const previewHost = 'work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev'
  if (isApprovedCloudflarePreviewRequest(request.url)) {
    const allowedRecipient = getServerEnv('OXFORD_NOTIFICATION_ADMIN_EMAIL')?.trim().toLowerCase()
    const bootstrapRecipient = getServerEnv('OXFORD_INITIAL_SUPER_ADMIN_EMAIL')?.trim().toLowerCase()
    if (!allowedRecipient || allowedRecipient !== bootstrapRecipient || input.to.trim().toLowerCase() !== allowedRecipient) {
      throw new Error('Preview email delivery is restricted to the configured Oxford test recipient.')
    }
    const requestedUrl = new URL(input.url)
    if (!isApprovedCloudflarePreviewRequest(requestedUrl.toString()) || requestedUrl.hostname !== previewHost) throw new Error('Preview account links must remain on the isolated preview host.')
  }
  const target = new URL(input.url)
  if (target.protocol !== 'https:' || target.username || target.password) {
    throw new Error('The Oxford account link is not a secure HTTPS URL.')
  }
  const recovery = input.purpose === 'recovery'
  const subject = recovery ? 'Oxford Finance Hub | Password recovery' : 'Verify your Oxford Finance Hub email'
  const heading = recovery ? 'Reset your Oxford Finance Hub password' : 'Verify your email address'
  const action = recovery ? 'Set a new password' : 'Verify email address'
  const message = recovery
    ? 'A password recovery request was received for your Oxford Finance Hub account. If you made this request, use the secure link below. If you did not request it, you can ignore this email.'
    : 'Please verify this email address to activate your Oxford Finance Hub customer account.'
  const htmlContent = `<!doctype html><html><body style="margin:0;background:#101010;color:#f4f1e9;font-family:Arial,sans-serif"><div style="max-width:600px;margin:32px auto;padding:32px;background:#181818;border:1px solid #8c713d"><p style="color:#d7b96f;letter-spacing:2px;font-size:12px">OXFORD FINANCE HUB</p><h1 style="font-size:25px">${heading}</h1><p>Hello ${escapeHtml(input.name)},</p><p style="line-height:1.6;color:#d0cec8">${message}</p><p style="margin:30px 0"><a href="${escapeHtml(target.toString())}" style="background:#c7a45a;color:#111;padding:14px 22px;text-decoration:none;font-weight:bold">${action}</a></p><p style="font-size:12px;color:#aaa">This link is single-use and expires shortly. If the button does not work, copy this address into your browser:<br>${escapeHtml(target.toString())}</p><p style="font-size:12px;color:#888">Oxford Business Group</p></div></body></html>`
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: config.sender, name: config.senderName },
      to: [{ email: input.to, name: input.name }],
      subject,
      htmlContent,
    }),
  })
  if (!response.ok) throw new Error(`Oxford account email could not be sent (provider status ${response.status}).`)
}
