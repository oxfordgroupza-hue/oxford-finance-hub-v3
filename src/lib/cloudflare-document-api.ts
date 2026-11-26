import { and, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import { db } from '../../db'
import {
  applicationDocuments,
  assignments,
  auditEvents,
  customers,
  financeApplications,
  financeDrafts,
  integrationOperations,
  permissions,
  partnerRegistrations,
  referrals,
  rolePermissions,
  roles,
  staffRoles,
  userPermissionOverrides,
  userSuspensions,
  users,
  authSessions,
} from '../../db/schema'
import { evaluateEffectivePermissions } from '../../src/lib/access-control'
import { isPartnerDocumentTypeAllowed } from '../../src/lib/partner-document-permissions'
import { requiredDocumentUploadPermission } from '../../src/lib/document-upload-authorization'
import { applicationDocumentStoragePath } from '../../src/lib/application-document-storage'
import { decryptApplicantData } from '../../src/lib/pii-crypto.server'
import { sanitizeDocumentFilename, validateDocumentFileSize, validateDocumentRequestContentLength, parseBoundedDocumentFormData, validateDocumentUpload } from '../../src/lib/document-validation'
import { isSameOriginRequest } from '../../src/lib/origin-validation'
import { isApprovedCloudflareRuntimeRequest, isStorageBucketVerified } from '../../src/lib/document-storage-security'
import { hashOpaqueToken } from '../../src/lib/cloudflare-auth-crypto'
import { getServerEnv } from './server-runtime-env'


const MAX_DOCUMENTS_PER_APPLICATION = 20
const ALLOWED_DOCUMENT_KEYS = new Set([
  'id', 'payslips', 'bank', 'address', 'licence', 'cipc', 'directors-id',
  'afs', 'resolution', 'quote', 'contracts', 'motivation', 'income',
])

type IdentityUser = { id: string; email: string; emailVerifiedAt: Date }
type Row = Record<string, unknown>

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'strict-transport-security': 'max-age=31536000',
    },
  })
}

function supabaseSecretKey() {
  return getServerEnv('SUPABASE_SECRET_KEY')
}

function storageConfig() {
  const url = getServerEnv('SUPABASE_URL')
  const key = supabaseSecretKey()
  const bucket = getServerEnv('SUPABASE_BUCKET')
  if (!url || !key || !bucket) throw new HttpError('Private document storage is not configured.', 503)
  if (bucket !== 'oxford-customer-documents') throw new HttpError('The configured document bucket is not approved.', 503)
  return { url: url.replace(/\/$/, ''), key, bucket }
}

async function storage(path: string, init: RequestInit = {}) {
  const { url, key } = storageConfig()
  const response = await fetch(`${url}/storage/v1/${path}`, {
    ...init,
    // Supabase publishable/secret API keys are opaque API keys, not JWTs.
    // Send the secret key only in apikey; never mislabel it as a Bearer JWT.
    headers: {
      ...(init.headers || {}),
      apikey: key,
    },
    cache: 'no-store',
  })
  const body = await response.text()
  if (!response.ok) throw new HttpError(`Private storage operation failed (${response.status}).`, 502)
  if (!body) return null
  try { return JSON.parse(body) as Row } catch { return { message: body } }
}

async function authenticate(request: Request): Promise<IdentityUser> {
  const cookieHeader = request.headers.get('cookie') || ''
  const token = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('__Host-oxford_session='))?.slice('__Host-oxford_session='.length)
  if (!token) throw new HttpError('Sign in is required.', 401)
  let tokenDigest: string
  try { tokenDigest = await hashOpaqueToken(decodeURIComponent(token)) } catch { throw new HttpError('Your session is invalid or has expired. Please sign in again.', 401) }
  const [session] = await db.select({ id: users.id, email: users.email, emailVerifiedAt: users.emailVerifiedAt })
    .from(authSessions).innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, tokenDigest), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, new Date())))
    .limit(1)
  if (!session || !session.emailVerifiedAt) throw new HttpError('Your session is invalid or your email is not verified.', 401)
  return { id: session.id, email: session.email, emailVerifiedAt: session.emailVerifiedAt }
}

async function resolveAccount(identity: IdentityUser) {
  const [account] = await db.select().from(users)
    .where(eq(users.id, identity.id)).limit(1)
  if (!account || account.status !== 'active') throw new HttpError('Your Oxford account is not active.', 403)

  const roleRows = await db.select({
    key: roles.key,
    isActive: roles.isActive,
    isReserved: roles.isReserved,
    audience: roles.audience,
    permission: permissions.key,
  }).from(staffRoles)
    .innerJoin(roles, eq(staffRoles.roleId, roles.id))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(and(eq(staffRoles.userId, account.id), isNull(staffRoles.revokedAt)))

  const roleMap = new Map<string, {
    key: string
    isActive: boolean
    isReserved: boolean
    audience: typeof account.accountType
    permissions: string[]
  }>()
  for (const row of roleRows) {
    let role = roleMap.get(row.key)
    if (!role) {
      role = { key: row.key, isActive: row.isActive, isReserved: row.isReserved, audience: row.audience, permissions: [] }
      roleMap.set(row.key, role)
    }
    if (row.permission && !role.permissions.includes(row.permission)) role.permissions.push(row.permission)
  }

  const [overrides, suspensions] = await Promise.all([
    db.select({
      permission: permissions.key,
      effect: userPermissionOverrides.effect,
      expiresAt: userPermissionOverrides.expiresAt,
      revokedAt: userPermissionOverrides.revokedAt,
    }).from(userPermissionOverrides)
      .innerJoin(permissions, eq(userPermissionOverrides.permissionId, permissions.id))
      .where(eq(userPermissionOverrides.userId, account.id)),
    db.select({
      suspendedAt: userSuspensions.suspendedAt,
      endsAt: userSuspensions.endsAt,
      liftedAt: userSuspensions.liftedAt,
    }).from(userSuspensions).where(eq(userSuspensions.userId, account.id)),
  ])

  const effective = evaluateEffectivePermissions({
    userId: account.id,
    accountType: account.accountType,
    status: account.status,
    roles: [...roleMap.values()],
    overrides,
    suspensions,
  }, new Date())
  if (effective.blocked) throw new HttpError('Your Oxford account is temporarily unavailable.', 403)
  return { account, permissions: effective.permissions, isSuperAdmin: effective.isSuperAdmin }
}

async function customerFor(identity: IdentityUser, account: { id: string; accountType: string }) {
  if (account.accountType !== 'customer') {
    throw new HttpError('An active customer account is required.', 403)
  }
  if (!identity.email || !identity.emailVerifiedAt) {
    throw new HttpError('Your account must have a verified email address.', 403)
  }
  let [customer] = await db.select().from(customers).where(eq(customers.userId, account.id)).limit(1)
  if (!customer) {
    await db.insert(customers).values({ userId: account.id, applicantType: 'individual' }).onConflictDoNothing()
    ;[customer] = await db.select().from(customers).where(eq(customers.userId, account.id)).limit(1)
  }
  if (!customer) throw new HttpError('Your customer profile could not be loaded.', 500)
  return customer
}

async function applicationAccess(applicationId: string, account: Awaited<ReturnType<typeof resolveAccount>>, customerId: string | null) {
  const [application] = await db.select({
    id: financeApplications.id,
    reference: financeApplications.reference,
    customerId: financeApplications.customerId,
    applicantType: financeApplications.applicantType,
    category: financeApplications.category,
    profile: customers.profile,
    firstName: customers.firstName,
    lastName: customers.lastName,
    businessName: customers.businessName,
  }).from(financeApplications)
    .innerJoin(customers, eq(financeApplications.customerId, customers.id))
    .where(eq(financeApplications.id, applicationId)).limit(1)
  if (!application) throw new HttpError('Application not found or access denied.', 404)

  if (account.account.accountType === 'customer') {
    if (!account.permissions.has('own_documents.view') || !customerId || application.customerId !== customerId) {
      throw new HttpError('Application not found or access denied.', 404)
    }
  } else if (account.account.accountType === 'office') {
    if (!account.permissions.has('documents.view') && !account.isSuperAdmin) {
      throw new HttpError('Your office role does not permit document access.', 403)
    }
    if (!account.isSuperAdmin && !account.permissions.has('applications.assign')) {
      const [assigned] = await db.select({ id: assignments.id }).from(assignments)
        .where(and(
          eq(assignments.applicationId, application.id),
          eq(assignments.assignedTo, account.account.id),
          isNull(assignments.completedAt),
        )).limit(1)
      if (!assigned) throw new HttpError('Application not found or access denied.', 404)
    }
  } else {
    throw new HttpError('Your account cannot access application documents.', 403)
  }
  return application
}

async function verifyStorageBucket() {
  const { bucket } = storageConfig()
  const details = await storage(`bucket/${encodeURIComponent(bucket)}`) as Row
  return isStorageBucketVerified(details)
}

function storageObjectPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

// Storage operations require the canonical host for the current Cloudflare environment.
function isApprovedCloudflareRuntime(request: Request) {
  return isApprovedCloudflareRuntimeRequest(request.url, getServerEnv('CONTEXT'))
}

export async function handleCloudflareOxfordApi(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (!isSameOriginRequest(origin, request.url, request.method === 'POST', request.headers.get('sec-fetch-site'))) throw new HttpError('Origin not allowed.', 403)

    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    if (request.method === 'GET' && action === 'health') {
      const storageConfigured = Boolean(getServerEnv('SUPABASE_URL') && supabaseSecretKey() && getServerEnv('SUPABASE_BUCKET') === 'oxford-customer-documents')
      let storageVerified = false
      if (storageConfigured) {
        try { storageVerified = await verifyStorageBucket() } catch { storageVerified = false }
      }
      return json({
        configured: storageConfigured,
        bucketConfigured: getServerEnv('SUPABASE_BUCKET') === 'oxford-customer-documents',
        storageVerified,
        encryptionConfigured: Boolean(getServerEnv('OXFORD_PII_ENCRYPTION_KEY')),
        // Exact environment-host guard plus the explicit server-side upload flag.
        documentUploadsEnabled: isApprovedCloudflareRuntime(request) &&
          getServerEnv('OXFORD_DOCUMENT_UPLOADS_ENABLED') === 'true' && storageVerified,
        liveApplicationsEnabled: isApprovedCloudflareRuntime(request) && getServerEnv('OXFORD_APPLICATIONS_ENABLED') === 'true',
        authoritativeDatabase: 'neon',
      })
    }

    const identity = await authenticate(request)
    const account = await resolveAccount(identity)
    const isApplicant = account.account.accountType === 'customer'
    const customer = isApplicant ? await customerFor(identity, account.account) : null

    if (action === 'create-application') {
      throw new HttpError('Applications are submitted through the Oxford Finance Hub application wizard. The legacy parallel application endpoint is disabled.', 410)
    }

    if (request.method === 'GET' && action === 'list-draft-documents') {
      if (!isApplicant || !customer || !account.permissions.has('own_documents.view')) {
        throw new HttpError('Customer account required.', 403)
      }
      const draftId = url.searchParams.get('draftId') || ''
      if (!/^[0-9a-f-]{36}$/i.test(draftId)) throw new HttpError('A valid saved draft is required.', 400)
      const [draft] = await db.select({ id: financeDrafts.id }).from(financeDrafts)
        .where(and(eq(financeDrafts.id, draftId), eq(financeDrafts.customerId, customer.id), gt(financeDrafts.expiresAt, new Date())))
        .limit(1)
      if (!draft) throw new HttpError('Saved draft not found or expired.', 404)
      const rows = await db.select({
        requestMetadata: integrationOperations.requestMetadata,
        resultMetadata: integrationOperations.resultMetadata,
      }).from(integrationOperations).where(and(
        eq(integrationOperations.provider, 'supabase-storage'),
        eq(integrationOperations.operation, 'upload_draft_document'),
        eq(integrationOperations.status, 'completed'),
        sql`${integrationOperations.requestMetadata}->>'draftId' = ${draftId}`,
        sql`${integrationOperations.requestMetadata}->>'customerId' = ${customer.id}`,
      ))
      return json({
        documents: rows
          .filter((row) => typeof row.resultMetadata.storagePath === 'string')
          .map((row) => ({
            documentType: String(row.requestMetadata.documentType || ''),
            filename: String(row.requestMetadata.originalName || 'document'),
            contentType: String(row.requestMetadata.mimeType || ''),
            size: Number(row.requestMetadata.sizeBytes || 0),
            status: 'Received',
          })),
      })
    }

    if (request.method === 'POST' && action === 'upload-draft-document') {
      if (!isApprovedCloudflareRuntime(request) || getServerEnv('OXFORD_DOCUMENT_UPLOADS_ENABLED') !== 'true') {
        throw new HttpError('Secure document uploads are disabled until the full preview test matrix has passed.', 503)
      }
      if (!isApplicant || !customer || !account.permissions.has('own_documents.create')) {
        throw new HttpError('Your customer account does not have permission to upload application documents.', 403)
      }
      const requestLengthError = validateDocumentRequestContentLength(request.headers.get('content-length'))
      if (requestLengthError) throw new HttpError(requestLengthError, 413)
      let form: FormData
      try {
        form = await parseBoundedDocumentFormData(request)
      } catch (error) {
        if (error instanceof RangeError) throw new HttpError(error.message, 413)
        throw new HttpError('The multipart upload could not be parsed.', 400)
      }
      const draftId = String(form.get('draftId') || '')
      const rawType = String(form.get('documentKey') || '')
      const file = form.get('file')
      if (!(file instanceof File)) throw new HttpError('A valid saved draft and file are required.', 400)
      const documentType = rawType.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
      if (!ALLOWED_DOCUMENT_KEYS.has(documentType)) throw new HttpError('Select a valid document checklist item.', 400)
      const bytes = await file.arrayBuffer()
      const validationError = validateDocumentUpload({
        draftId,
        documentType,
        fileSize: file.size,
        mimeType: file.type,
        signature: new Uint8Array(bytes.slice(0, 8)),
      })
      if (validationError) throw new HttpError(validationError, 400)

      const [draft] = await db.select({ id: financeDrafts.id }).from(financeDrafts)
        .where(and(eq(financeDrafts.id, draftId), eq(financeDrafts.customerId, customer.id), gt(financeDrafts.expiresAt, new Date())))
        .limit(1)
      if (!draft) throw new HttpError('Saved draft not found or expired.', 404)

      const digest = await crypto.subtle.digest('SHA-256', bytes)
      const hash = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('')
      const idempotencyKey = `draft-document:${draftId}:${documentType}:${hash}`
      const existingWhere = and(
        eq(integrationOperations.idempotencyKey, idempotencyKey),
        eq(integrationOperations.provider, 'supabase-storage'),
        eq(integrationOperations.operation, 'upload_draft_document'),
      )
      const [existing] = await db.select().from(integrationOperations).where(existingWhere).limit(1)
      if (existing?.status === 'completed' && typeof existing.resultMetadata.storagePath === 'string') {
        return json({ filename: String(existing.requestMetadata.originalName || file.name), size: Number(existing.requestMetadata.sizeBytes || file.size), duplicate: true })
      }

      const allDraftUploads = await db.select({ id: integrationOperations.id }).from(integrationOperations).where(and(
        eq(integrationOperations.provider, 'supabase-storage'),
        eq(integrationOperations.operation, 'upload_draft_document'),
        eq(integrationOperations.status, 'completed'),
        sql`${integrationOperations.requestMetadata}->>'draftId' = ${draftId}`,
        sql`${integrationOperations.requestMetadata}->>'customerId' = ${customer.id}`,
      ))
      if (!existing && allDraftUploads.length >= MAX_DOCUMENTS_PER_APPLICATION) {
        throw new HttpError(`A saved application may contain no more than ${MAX_DOCUMENTS_PER_APPLICATION} documents.`, 400)
      }

      if (!(await verifyStorageBucket().catch(() => false))) {
        throw new HttpError('The private document bucket could not be verified. Uploads remain disabled.', 503)
      }
      const { bucket } = storageConfig()
      let operationId = existing?.id ?? null
      if (existing) {
        if (existing.status === 'pending' && existing.updatedAt < new Date(Date.now() - 15 * 60 * 1000)) {
          const [claimed] = await db.update(integrationOperations).set({
            attempts: existing.attempts + 1,
            lastError: 'Recovered an interrupted draft upload attempt.',
            updatedAt: new Date(),
          }).where(and(eq(integrationOperations.id, existing.id), eq(integrationOperations.status, 'pending'), lt(integrationOperations.updatedAt, new Date(Date.now() - 15 * 60 * 1000))))
            .returning({ id: integrationOperations.id })
          operationId = claimed?.id ?? null
        } else if (existing.status === 'failed' && existing.attempts < 5) {
          const [claimed] = await db.update(integrationOperations).set({
            status: 'pending',
            attempts: existing.attempts + 1,
            lastError: null,
            updatedAt: new Date(),
          }).where(and(eq(integrationOperations.id, existing.id), eq(integrationOperations.status, 'failed')))
            .returning({ id: integrationOperations.id })
          operationId = claimed?.id ?? null
        } else {
          throw new HttpError('This document is already being processed. Please wait before retrying.', 409)
        }
      } else {
        const [created] = await db.insert(integrationOperations).values({
          provider: 'supabase-storage',
          operation: 'upload_draft_document',
          idempotencyKey,
          status: 'pending',
          attempts: 1,
          requestMetadata: {
            draftId,
            customerId: customer.id,
            uploadedBy: account.account.id,
            documentType,
            originalName: sanitizeDocumentFilename(file.name),
            mimeType: file.type,
            sizeBytes: file.size,
            checksum: hash,
          },
        }).onConflictDoNothing().returning({ id: integrationOperations.id })
        operationId = created?.id ?? null
      }
      if (!operationId) throw new HttpError('This document is already being processed. Please retry shortly.', 409)

      const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/jpeg' ? 'jpg' : 'png'
      const path = `drafts/${customer.id}/${draftId}/${documentType}-${hash.slice(0, 24)}.${ext}`
      try {
        await storage(`object/${encodeURIComponent(bucket)}/${storageObjectPath(path)}`, {
          method: 'POST',
          headers: { 'content-type': file.type, 'x-upsert': 'true' },
          body: bytes,
        })
        await db.update(integrationOperations).set({
          status: 'completed',
          resultMetadata: { storagePath: path, checksum: hash, storageUploadSucceeded: true },
          updatedAt: new Date(),
        }).where(eq(integrationOperations.id, operationId))
        await db.insert(auditEvents).values({
          actorUserId: account.account.id,
          event: 'application.draft_document_uploaded',
          resource: 'finance_draft',
          resourceId: draftId,
          details: { documentType, sizeBytes: file.size, checksum: hash },
        })
        return json({ filename: sanitizeDocumentFilename(file.name), size: file.size, duplicate: false }, 201)
      } catch (error) {
        await storage(`object/${encodeURIComponent(bucket)}/${storageObjectPath(path)}`, { method: 'DELETE' }).catch(() => null)
        await db.update(integrationOperations).set({
          status: 'failed',
          lastError: 'Draft document upload or metadata persistence failed.',
          updatedAt: new Date(),
        }).where(eq(integrationOperations.id, operationId)).catch(() => null)
        throw error
      }
    }

    if (request.method === 'POST' && action === 'upload-document') {
      if (!isApprovedCloudflareRuntime(request) || getServerEnv('OXFORD_DOCUMENT_UPLOADS_ENABLED') !== 'true') {
        throw new HttpError('Secure document uploads are disabled until the full preview test matrix has passed.', 503)
      }
      // Partners use a narrower referral-ownership and document-type policy below.
      const requiredPermission = requiredDocumentUploadPermission(account.account.accountType as 'customer' | 'partner' | 'office')
      if (requiredPermission && !account.isSuperAdmin && !account.permissions.has(requiredPermission)) {
        throw new HttpError('Your account does not have permission to upload application documents.', 403)
      }

      // Reject known oversized multipart bodies before parsing FormData.
      const requestLengthError = validateDocumentRequestContentLength(request.headers.get('content-length'))
      if (requestLengthError) throw new HttpError(requestLengthError, 413)
      let form: FormData
      try {
        form = await parseBoundedDocumentFormData(request)
      } catch (error) {
        if (error instanceof RangeError) throw new HttpError(error.message, 413)
        throw new HttpError('The multipart upload could not be parsed.', 400)
      }
      const applicationId = String(form.get('applicationId') || '')
      const rawType = String(form.get('documentKey') || '')
      const file = form.get('file')
      if (!(file instanceof File)) throw new HttpError('A valid application and file are required.', 400)
      const sizeError = validateDocumentFileSize(file.size)
      if (sizeError) throw new HttpError(sizeError, 400)
      const documentType = rawType.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
      if (!ALLOWED_DOCUMENT_KEYS.has(documentType)) throw new HttpError('Select a valid document checklist item.', 400)
      const bytes = await file.arrayBuffer()
      const validationError = validateDocumentUpload({
        applicationId,
        documentType,
        fileSize: file.size,
        mimeType: file.type,
        signature: new Uint8Array(bytes.slice(0, 8)),
      })
      if (validationError) throw new HttpError(validationError, 400)

      let application: Awaited<ReturnType<typeof applicationAccess>>
      if (account.account.accountType === 'partner') {
        // Partners can always upload the supplier quotation to their own referral.
        // Super Admin may additionally enable non-sensitive supplier supporting files.
        // Neither path grants access to list or download the applicant's private documents.
        const [partnerApplication] = await db.select({
          id: financeApplications.id,
          reference: financeApplications.reference,
          customerId: financeApplications.customerId,
          applicantType: financeApplications.applicantType,
          category: financeApplications.category,
          canUploadSupportingDocuments: partnerRegistrations.canUploadSupportingDocuments,
          profile: customers.profile,
          firstName: customers.firstName,
          lastName: customers.lastName,
          businessName: customers.businessName,
        }).from(financeApplications)
          .innerJoin(customers, eq(financeApplications.customerId, customers.id))
          .innerJoin(referrals, eq(referrals.applicationId, financeApplications.id))
          .innerJoin(partnerRegistrations, eq(partnerRegistrations.userId, referrals.partnerUserId))
          .where(and(
            eq(financeApplications.id, applicationId),
            eq(referrals.partnerUserId, account.account.id),
            eq(partnerRegistrations.status, 'Approved'),
          )).limit(1)
        if (partnerApplication) {
          if (!isPartnerDocumentTypeAllowed(documentType, partnerApplication.canUploadSupportingDocuments)) {
            throw new HttpError('Your partner account is not permitted to upload this document type.', 403)
          }
          application = partnerApplication
        } else {
          throw new HttpError('Application not found or access denied.', 404)
        }
      } else {
        application = await applicationAccess(applicationId, account, customer?.id ?? null)
      }
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      const hash = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('')
      const idempotencyKey = `document:${application.id}:${documentType}:${hash}`
      const [existing] = await db.select({
        id: applicationDocuments.id,
        originalName: applicationDocuments.originalName,
        sizeBytes: applicationDocuments.sizeBytes,
      }).from(applicationDocuments).where(and(
        eq(applicationDocuments.applicationId, application.id),
        eq(applicationDocuments.documentType, documentType),
        eq(applicationDocuments.checksum, hash),
      )).limit(1)
      if (existing) return json({ id: existing.id, filename: existing.originalName, size: existing.sizeBytes, duplicate: true })

      const existingDocs = await db.select({ id: applicationDocuments.id }).from(applicationDocuments)
        .where(eq(applicationDocuments.applicationId, application.id)).limit(MAX_DOCUMENTS_PER_APPLICATION)
      if (existingDocs.length >= MAX_DOCUMENTS_PER_APPLICATION) {
        throw new HttpError(`An application may contain no more than ${MAX_DOCUMENTS_PER_APPLICATION} documents.`, 400)
      }

      const bucketVerified = await verifyStorageBucket().catch(() => false)
      if (!bucketVerified) throw new HttpError('The private document bucket could not be verified. Uploads remain disabled.', 503)
      const { bucket } = storageConfig()
      let operationId: string | null = null
      const [operation] = await db.insert(integrationOperations).values({
        provider: 'supabase-storage',
        operation: 'upload_application_document',
        idempotencyKey,
        status: 'pending',
        attempts: 1,
        requestMetadata: { applicationId: application.id, documentType, sizeBytes: file.size, checksum: hash },
      }).onConflictDoNothing().returning({ id: integrationOperations.id })
      if (operation) {
        operationId = operation.id
      } else {
        const [retry] = await db.select({
          id: integrationOperations.id,
          status: integrationOperations.status,
          attempts: integrationOperations.attempts,
          updatedAt: integrationOperations.updatedAt,
        }).from(integrationOperations).where(eq(integrationOperations.idempotencyKey, idempotencyKey)).limit(1)
        if (retry?.status === 'completed') {
          const [completed] = await db.select({
            id: applicationDocuments.id,
            originalName: applicationDocuments.originalName,
            sizeBytes: applicationDocuments.sizeBytes,
          }).from(applicationDocuments).where(and(
            eq(applicationDocuments.applicationId, application.id),
            eq(applicationDocuments.documentType, documentType),
            eq(applicationDocuments.checksum, hash),
          )).limit(1)
          if (completed) return json({ id: completed.id, filename: completed.originalName, size: completed.sizeBytes, duplicate: true })
        }
        const staleBefore = new Date(Date.now() - 15 * 60 * 1000)
        if (retry?.status === 'pending' && retry.attempts < 5 && retry.updatedAt < staleBefore) {
          const [claimed] = await db.update(integrationOperations).set({
            attempts: retry.attempts + 1,
            lastError: 'Recovered an interrupted upload attempt.',
            updatedAt: new Date(),
          }).where(and(
            eq(integrationOperations.id, retry.id),
            eq(integrationOperations.status, 'pending'),
            lt(integrationOperations.updatedAt, staleBefore),
          )).returning({ id: integrationOperations.id })
          operationId = claimed?.id ?? null
        }
        if (retry?.status === 'failed' && retry.attempts < 5) {
          const [claimed] = await db.update(integrationOperations).set({
            status: 'pending',
            attempts: retry.attempts + 1,
            lastError: null,
            updatedAt: new Date(),
          }).where(and(
            eq(integrationOperations.id, retry.id),
            eq(integrationOperations.status, 'failed'),
          )).returning({ id: integrationOperations.id })
          operationId = claimed?.id ?? null
        }
        if (!operationId) throw new HttpError('This document is already being processed. Please wait before retrying.', 409)
      }

      const activeOperationId = operationId
      if (!activeOperationId) throw new HttpError('This document is already being processed. Please wait before retrying.', 409)

      const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/jpeg' ? 'jpg' : 'png'
      const profile = application.profile ?? {}
      const pii = typeof profile.piiCiphertext === 'string' ? decryptApplicantData(profile.piiCiphertext) : {}
      const applicantName = [pii.firstName ?? application.firstName, pii.lastName ?? application.lastName].filter(Boolean).join(' ') || String(pii.contactName ?? application.businessName ?? 'Applicant')
      const path = applicationDocumentStoragePath({
        applicantType: application.applicantType,
        applicantName,
        applicationReference: application.reference,
        documentType,
        fileName: `${documentType}-${hash.slice(0, 24)}.${ext}`,
      })
      try {
        await storage(`object/${encodeURIComponent(bucket)}/${storageObjectPath(path)}`, {
          method: 'POST',
          headers: { 'content-type': file.type, 'x-upsert': 'true' },
          body: bytes,
        })

        let documentId = ''
        await db.transaction(async (tx) => {
          const [document] = await tx.insert(applicationDocuments).values({
            applicationId: application.id,
            customerId: application.customerId,
            documentType,
            originalName: sanitizeDocumentFilename(file.name),
            mimeType: file.type,
            sizeBytes: file.size,
            status: 'Received',
            provider: 'supabase-storage',
            storagePath: path,
            checksum: hash,
            uploadedAt: new Date(),
            metadata: { uploadedBy: account.account.id },
          }).returning({ id: applicationDocuments.id })
          if (!document) throw new Error('Document metadata could not be saved.')
          documentId = document.id
          await tx.update(integrationOperations).set({
            status: 'completed',
            resultMetadata: { documentId: document.id, storagePath: path },
            updatedAt: new Date(),
          }).where(eq(integrationOperations.id, activeOperationId))
          await tx.insert(auditEvents).values({
            actorUserId: account.account.id,
            event: 'application.document_uploaded',
            resource: 'application_document',
            resourceId: document.id,
            details: { applicationId: application.id, documentType, sizeBytes: file.size },
          })
        })
        return json({ id: documentId, filename: sanitizeDocumentFilename(file.name), size: file.size }, 201)
      } catch (error) {
        await storage(`object/${encodeURIComponent(bucket)}/${storageObjectPath(path)}`, { method: 'DELETE' }).catch(() => null)
        await db.update(integrationOperations).set({
          status: 'failed',
          lastError: 'Document upload or metadata persistence failed.',
          updatedAt: new Date(),
        }).where(eq(integrationOperations.id, activeOperationId)).catch(() => null)
        throw error
      }
    }

    if (request.method === 'GET' && action === 'list-documents') {
      const applicationId = url.searchParams.get('applicationId') || ''
      if (!/^[0-9a-f-]{36}$/i.test(applicationId)) throw new HttpError('A valid application ID is required.', 400)
      const application = await applicationAccess(applicationId, account, customer?.id ?? null)
      const rows = await db.select({
        id: applicationDocuments.id,
        documentType: applicationDocuments.documentType,
        filename: applicationDocuments.originalName,
        contentType: applicationDocuments.mimeType,
        size: applicationDocuments.sizeBytes,
        status: applicationDocuments.status,
        uploadedAt: applicationDocuments.uploadedAt,
      }).from(applicationDocuments).where(eq(applicationDocuments.applicationId, application.id))
        .orderBy(desc(applicationDocuments.createdAt))
      return json({ documents: rows })
    }

    if (request.method === 'POST' && action === 'download-document') {
      if (!isApplicant && !account.isSuperAdmin && !account.permissions.has('documents.download')) {
        throw new HttpError('Your office role does not permit document downloads.', 403)
      }
      if (isApplicant && !account.permissions.has('own_documents.download')) {
        throw new HttpError('Your account does not permit document downloads.', 403)
      }
      const body = await request.json() as Row
      const documentId = String(body.documentId || '')
      if (!/^[0-9a-f-]{36}$/i.test(documentId)) throw new HttpError('A valid document ID is required.', 400)
      const [document] = await db.select({
        id: applicationDocuments.id,
        applicationId: applicationDocuments.applicationId,
        customerId: applicationDocuments.customerId,
        storagePath: applicationDocuments.storagePath,
      }).from(applicationDocuments).where(eq(applicationDocuments.id, documentId)).limit(1)
      if (!document?.storagePath) throw new HttpError('Document not found.', 404)
      const application = await applicationAccess(document.applicationId, account, customer?.id ?? null)
      if (application.customerId !== document.customerId) throw new HttpError('Document not found or access denied.', 404)
      const { bucket, url: projectUrl } = storageConfig()
      const signed = await storage(`object/sign/${encodeURIComponent(bucket)}/${storageObjectPath(document.storagePath)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expiresIn: 60 }),
      }) as Row
      const signedUrl = signed.signedURL || signed.signedUrl
      if (typeof signedUrl !== 'string') throw new HttpError('Could not create a temporary document link.', 502)
      await db.insert(auditEvents).values({
        actorUserId: account.account.id,
        event: 'application.document_accessed',
        resource: 'application_document',
        resourceId: document.id,
        details: { applicationId: application.id },
      })
      return json({ url: signedUrl.startsWith('http') ? signedUrl : `${projectUrl}/storage/v1${signedUrl.startsWith('/') ? '' : '/'}${signedUrl}` })
    }

    if (request.method === 'GET' && action === 'my-applications') {
      if (!isApplicant || !customer || !account.permissions.has('own_applications.view')) {
        throw new HttpError('Customer account required.', 403)
      }
      const rows = await db.select({
        id: financeApplications.id,
        reference: financeApplications.reference,
        applicantType: financeApplications.applicantType,
        category: financeApplications.category,
        status: financeApplications.status,
        submittedAt: financeApplications.submittedAt,
        updatedAt: financeApplications.updatedAt,
      }).from(financeApplications).where(eq(financeApplications.customerId, customer.id))
        .orderBy(desc(financeApplications.submittedAt))
      return json({ applications: rows })
    }

    return json({ error: 'Unknown action.' }, 404)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof HttpError ? error.message : 'The requested document operation could not be completed.'
    return json({ error: message }, status)
  }
}
