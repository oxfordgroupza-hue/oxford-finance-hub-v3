import { createServerFn } from '@tanstack/react-start'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import {
  applicationDocuments,
  applicationPacks,
  assignments,
  auditEvents,
  consentRecords,
  customers,
  financeApplications,
  users,
} from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { decryptApplicantData } from './pii-crypto.server'
import { formatZAR } from './format'
import { calculateFinanceAmount } from './fee-calculation'

function pdfText(value: unknown) {
  const text = String(value ?? '—').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  return text.replace(/[^\x20-\x7E]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function renderPdf(lines: string[]) {
  const pages: string[][] = []
  for (let index = 0; index < lines.length; index += 48) pages.push(lines.slice(index, index + 48))
  if (!pages.length) pages.push(['Oxford Finance Hub'])

  const objects: string[] = []
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  const pageIds = pages.map((_, index) => 4 + index * 2)
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`

  pages.forEach((page, index) => {
    const pageId = pageIds[index]
    const streamId = pageId + 1
    const commands = ['BT', '/F1 15 Tf', '50 790 Td', `(${pdfText(page[0] ?? 'Oxford Finance Hub')}) Tj`, '/F1 9 Tf']
    for (const line of page.slice(1)) commands.push('0 -14 Td', `(${pdfText(line)}) Tj`)
    commands.push('ET')
    const stream = commands.join('\n')
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`
    objects[streamId] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`
  })

  let output = '%PDF-1.4\n'
  const offsets = [0]
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(output, 'ascii')
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(output, 'ascii')
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id++) output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(output, 'ascii').toString('base64')
}



/**
 * Store generated application packs in the private Supabase bucket.
 * This is server-only: the secret key is never returned to the browser.
 */
async function persistPrivatePdf(applicationId: string, fileName: string, base64: string) {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const key = process.env.SUPABASE_SECRET_KEY
  const bucket = process.env.SUPABASE_BUCKET
  if (!url || !key || bucket !== 'oxford-customer-documents') {
    throw new Error('Private application-pack storage is not configured.')
  }

  const bucketResponse = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
    headers: { apikey: key },
    cache: 'no-store',
  })
  if (!bucketResponse.ok) throw new Error('The private document bucket could not be verified.')
  const details = await bucketResponse.json() as {
    id?: string
    public?: boolean
    file_size_limit?: number
    allowed_mime_types?: string[]
  }
  if (details.id !== bucket || details.public !== false ||
      !Array.isArray(details.allowed_mime_types) ||
      !details.allowed_mime_types.includes('application/pdf')) {
    throw new Error('The configured document bucket is not private or does not accept PDF files.')
  }

  const bytes = Buffer.from(base64, 'base64')
  const limit = Number(details.file_size_limit)
  if (!Number.isFinite(limit) || bytes.length < 1 || bytes.length > limit) {
    throw new Error('The generated application pack exceeds the private storage limit.')
  }

  const objectKey = `application-packs/${applicationId}/${randomUUID()}-${fileName}`
  const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/')
  const upload = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedKey}`, {
    method: 'POST',
    headers: {
      apikey: key,
      'content-type': 'application/pdf',
      'x-upsert': 'false',
    },
    body: bytes,
    cache: 'no-store',
  })
  if (!upload.ok) throw new Error('The generated application pack could not be saved to private storage.')
  return { objectKey, bytes: bytes.length, url }
}

async function removePrivatePdf(storageUrl: string, objectKey: string) {
  const key = process.env.SUPABASE_SECRET_KEY
  const bucket = process.env.SUPABASE_BUCKET
  if (!key || bucket !== 'oxford-customer-documents') return
  const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/')
  await fetch(`${storageUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedKey}`, {
    method: 'DELETE',
    headers: { apikey: key },
    cache: 'no-store',
  }).catch(() => undefined)
}

export const generateApplicationPack = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ applicationId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' ||
        (!session.isSuperAdmin && (!session.permissions.includes('pdf_packs.create') || !session.permissions.includes('pdf_packs.download')))) {
      throw new Error('You do not have permission to generate and download application packs.')
    }

    const [application] = await db.select({
      id: financeApplications.id,
      reference: financeApplications.reference,
      applicantType: financeApplications.applicantType,
      category: financeApplications.category,
      status: financeApplications.status,
      financeAmount: financeApplications.financeAmount,
      assetDescription: financeApplications.assetDescription,
      submittedAt: financeApplications.submittedAt,
      createdAt: financeApplications.createdAt,
      applicationData: financeApplications.applicationData,
      customerId: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      businessName: customers.businessName,
      phone: customers.phone,
      email: users.email,
    }).from(financeApplications)
      .innerJoin(customers, eq(financeApplications.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .where(eq(financeApplications.id, data.applicationId))
      .limit(1)
    if (!application) throw new Error('Application not found.')
    if (application.status === 'Draft' || !application.submittedAt) {
      throw new Error('An application pack can only be generated after the applicant has submitted the application.')
    }

    if (!session.isSuperAdmin && !session.permissions.includes('applications.assign')) {
      const [assigned] = await db.select({ id: assignments.id }).from(assignments)
        .where(and(
          eq(assignments.applicationId, application.id),
          eq(assignments.assignedTo, session.user.id),
          isNull(assignments.completedAt),
        )).limit(1)
      if (!assigned) throw new Error('You can only generate packs for applications currently assigned to you.')
    }

    const safe = application.applicationData ?? {}
    const encrypted = typeof safe.piiCiphertext === 'string' ? safe.piiCiphertext : null
    const sensitive = encrypted ? decryptApplicantData(encrypted) : {}
    const [consents, documents] = await Promise.all([
      db.select({
        consentType: consentRecords.consentType,
        accepted: consentRecords.accepted,
        wordingVersion: consentRecords.wordingVersion,
        recordedAt: consentRecords.recordedAt,
      }).from(consentRecords).where(eq(consentRecords.applicationId, application.id)).orderBy(desc(consentRecords.recordedAt)),
      db.select({
        documentType: applicationDocuments.documentType,
        originalName: applicationDocuments.originalName,
        mimeType: applicationDocuments.mimeType,
        sizeBytes: applicationDocuments.sizeBytes,
        status: applicationDocuments.status,
        uploadedAt: applicationDocuments.uploadedAt,
      }).from(applicationDocuments).where(eq(applicationDocuments.applicationId, application.id)).orderBy(desc(applicationDocuments.createdAt)),
    ])

    const applicant = application.applicantType === 'business'
      ? application.businessName || safe.businessName || 'Business applicant'
      : [application.firstName || safe.firstName, application.lastName || safe.lastName].filter(Boolean).join(' ') || 'Individual applicant'
    const financeCalculation = application.financeAmount && application.financeAmount > 0
      ? calculateFinanceAmount(application.financeAmount * 100)
      : null
    const lines = [
      'OXFORD FINANCE HUB - CONFIDENTIAL APPLICATION PACK',
      `Application reference: ${application.reference}`,
      `Generated: ${new Date().toISOString()}`,
      ' ',
      'APPLICANT',
      `Applicant type: ${application.applicantType}`,
      `Applicant / business: ${applicant}`,
      `Email: ${application.email}`,
      `Telephone: ${application.phone ?? safe.phone ?? '—'}`,
      `Identity type: ${sensitive.idType ?? 'Not recorded'}`,
      `Identity number: ${sensitive.idNumber ?? 'Not recorded'}`,
      `Date of birth: ${sensitive.dateOfBirth ?? 'Not recorded'}`,
      `Residential address: ${sensitive.address ?? 'Not recorded'}`,
      `Business registration: ${sensitive.registrationNumber ?? 'Not recorded'}`,
      `Business address: ${sensitive.businessAddress ?? 'Not recorded'}`,
      `Entity type: ${safe.entityType ?? '—'}`,
      `Industry: ${sensitive.industry ?? '—'}`,
      `Directors / representatives: ${Array.isArray(sensitive.directors) ? sensitive.directors.map((d) => typeof d === 'object' && d && 'name' in d ? String(d.name) : '').filter(Boolean).join('; ') : '—'}`,
      ' ',
      'FINANCE REQUIREMENT',
      `Category: ${application.category}`,
      `Principal loan amount: ${application.financeAmount == null ? 'Not recorded' : formatZAR(application.financeAmount)}`,
      `Documentation fee (1%): ${financeCalculation ? formatZAR(financeCalculation.documentationFeeCents / 100) : 'Not calculated'}`,
      `VAT base (principal + documentation): ${financeCalculation ? formatZAR(financeCalculation.vatBaseCents / 100) : 'Not calculated'}`,
      `VAT (15%): ${financeCalculation ? formatZAR(financeCalculation.vatAmountCents / 100) : 'Not calculated'}`,
      `Total finance amount: ${financeCalculation ? formatZAR(financeCalculation.totalFinanceAmountCents / 100) : 'Not calculated'}`,
      `Term: ${safe.term ?? '—'} months`,
      `Deposit: ${safe.deposit ?? '—'}`,
      `Asset / requirement: ${application.assetDescription ?? '—'}`,
      `Supplier: ${safe.supplier ?? '—'}`,
      `Timing: ${safe.timing ?? '—'}`,
      `Referral code: ${safe.referralCode ?? '—'}`,
      ' ',
      'APPLICATION STATUS',
      `Status: ${application.status}`,
      `Submitted: ${application.submittedAt?.toISOString() ?? application.createdAt.toISOString()}`,
      ' ',
      'DECLARATIONS AND CONSENTS',
      ...consents.map((consent) => `${consent.consentType}: ${consent.accepted ? 'Accepted' : 'Not accepted'} | wording ${consent.wordingVersion} | ${consent.recordedAt.toISOString()}`),
      ' ',
      'DOCUMENT CHECKLIST / RECEIVED FILES',
      ...(documents.length ? documents.map((doc) => `${doc.documentType}: ${doc.originalName} | ${doc.status} | ${Math.round(doc.sizeBytes / 1024)} KB`) : ['No supporting documents are recorded.']),
      ' ',
      'IMPORTANT',
      'Oxford Business Group is a finance intermediary, not a bank or lender.',
      'Any finance decision is made by the relevant finance provider. No approval is guaranteed.',
      'This pack contains confidential personal information. Handle and store it securely.',
    ]

    const fileName = `OBG-APP-${application.reference}.pdf`
    const base64 = renderPdf(lines)
    const generatedAt = new Date()
    const stored = await persistPrivatePdf(application.id, fileName, base64)
    try {
      await db.transaction(async (tx) => {
        await tx.insert(applicationPacks).values({
          applicationId: application.id,
          fileName,
          storageKey: stored.objectKey,
          generatedAt,
          metadata: {
            generatedBy: session.user.id,
            generatedAt: generatedAt.toISOString(),
            bytes: stored.bytes,
            format: 'application/pdf',
            storageProvider: 'supabase-storage',
            storageBucket: 'oxford-customer-documents',
          },
        })
        await tx.insert(auditEvents).values({
          actorUserId: session.user.id,
          event: 'application.pack_generated',
          resource: 'finance_application',
          resourceId: application.id,
          details: { fileName, storageProvider: 'supabase-storage', bytes: stored.bytes },
        })
      })
    } catch (error) {
      await removePrivatePdf(stored.url, stored.objectKey)
      throw error
    }
    // Never return applicant PDF bytes to the browser. Downloads use the audited, short-lived signed-link action below.
    return { fileName, contentType: 'application/pdf', bytes: stored.bytes }
  })

/**
 * Issue a short-lived download link only after checking office permissions
 * and the application's assignment boundary on the server.
 */
export const downloadApplicationPack = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ applicationId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' ||
        (!session.isSuperAdmin && !session.permissions.includes('pdf_packs.download'))) {
      throw new Error('You do not have permission to download application packs.')
    }

    const [application] = await db.select({
      id: financeApplications.id,
      reference: financeApplications.reference,
    }).from(financeApplications)
      .where(eq(financeApplications.id, data.applicationId))
      .limit(1)
    if (!application) throw new Error('Application not found.')

    if (!session.isSuperAdmin && !session.permissions.includes('applications.assign')) {
      const [assigned] = await db.select({ id: assignments.id }).from(assignments)
        .where(and(
          eq(assignments.applicationId, application.id),
          eq(assignments.assignedTo, session.user.id),
          isNull(assignments.completedAt),
        )).limit(1)
      if (!assigned) throw new Error('You can only download packs for applications currently assigned to you.')
    }

    const [pack] = await db.select({
      id: applicationPacks.id,
      fileName: applicationPacks.fileName,
      storageKey: applicationPacks.storageKey,
    }).from(applicationPacks)
      .where(eq(applicationPacks.applicationId, application.id))
      .orderBy(desc(applicationPacks.generatedAt))
      .limit(1)
    if (!pack?.storageKey || !pack.storageKey.startsWith(`application-packs/${application.id}/`)) {
      throw new Error('No securely stored application pack is available.')
    }

    const url = process.env.SUPABASE_URL?.replace(/\/+$/, '')
    const key = process.env.SUPABASE_SECRET_KEY
    const bucket = process.env.SUPABASE_BUCKET
    if (!url || !key || bucket !== 'oxford-customer-documents') {
      throw new Error('Private application-pack storage is not configured.')
    }
    const encodedKey = pack.storageKey.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(`${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedKey}`, {
      method: 'POST',
      headers: { apikey: key, 'content-type': 'application/json' },
      body: JSON.stringify({ expiresIn: 60 }),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('A temporary private download link could not be created.')
    const signed = await response.json() as { signedURL?: string; signedUrl?: string }
    const signedPath = signed.signedURL || signed.signedUrl
    if (typeof signedPath !== 'string') throw new Error('The private storage provider returned an invalid download link.')
    const downloadUrl = signedPath.startsWith('http')
      ? signedPath
      : `${url}/storage/v1${signedPath.startsWith('/') ? '' : '/'}${signedPath}`

    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: 'application.pack_accessed',
      resource: 'application_pack',
      resourceId: pack.id,
      details: { applicationId: application.id, fileName: pack.fileName },
    })
    return { fileName: pack.fileName, contentType: 'application/pdf', url: downloadUrl, expiresIn: 60 }
  })



/** Customers may download only the latest pack for an application they own. */
export const downloadMyApplicationPack = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ applicationId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'customer' ||
        !session.permissions.includes('own_applications.view')) {
      throw new Error('An active applicant account is required to download your application pack.')
    }

    const [application] = await db.select({
      id: financeApplications.id,
      customerId: financeApplications.customerId,
    }).from(financeApplications)
      .innerJoin(customers, eq(financeApplications.customerId, customers.id))
      .where(and(
        eq(financeApplications.id, data.applicationId),
        eq(customers.userId, session.user.id),
      )).limit(1)
    if (!application) throw new Error('Application not found or access denied.')

    const [pack] = await db.select({
      id: applicationPacks.id,
      fileName: applicationPacks.fileName,
      storageKey: applicationPacks.storageKey,
    }).from(applicationPacks)
      .where(eq(applicationPacks.applicationId, application.id))
      .orderBy(desc(applicationPacks.generatedAt))
      .limit(1)
    if (!pack?.storageKey || !pack.storageKey.startsWith(`application-packs/${application.id}/`)) {
      throw new Error('Your application pack has not yet been generated by Oxford.')
    }

    const url = process.env.SUPABASE_URL?.replace(/\/+$/, '')
    const key = process.env.SUPABASE_SECRET_KEY
    const bucket = process.env.SUPABASE_BUCKET
    if (!url || !key || bucket !== 'oxford-customer-documents') {
      throw new Error('Private application-pack storage is not configured.')
    }
    const encodedKey = pack.storageKey.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(`${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedKey}`, {
      method: 'POST',
      headers: { apikey: key, 'content-type': 'application/json' },
      body: JSON.stringify({ expiresIn: 60 }),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('A temporary private download link could not be created.')
    const signed = await response.json() as { signedURL?: string; signedUrl?: string }
    const signedPath = signed.signedURL || signed.signedUrl
    if (typeof signedPath !== 'string') throw new Error('The private storage provider returned an invalid download link.')
    const downloadUrl = signedPath.startsWith('http')
      ? signedPath
      : `${url}/storage/v1${signedPath.startsWith('/') ? '' : '/'}${signedPath}`

    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: 'application.pack_accessed',
      resource: 'application_pack',
      resourceId: pack.id,
      details: { applicationId: application.id, fileName: pack.fileName, audience: 'applicant' },
    })
    return { fileName: pack.fileName, contentType: 'application/pdf', url: downloadUrl, expiresIn: 60 }
  })
