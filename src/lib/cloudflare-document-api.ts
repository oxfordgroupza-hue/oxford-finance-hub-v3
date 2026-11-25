import { and, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import { db } from '../../db'
import {
  applicationDocuments,
  assignments,
  auditEvents,
  customers,
  financeApplications,
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
  'afs', 'resolution', 'quote', 'contracts', 'motivation',
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

function isApprovedCloudflareRequest(request: Request) {
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
      let databaseVerified = false
      try {
        await db.execute(sql`select 1 as ok`)
        databaseVerified = true
      } catch {
        databaseVerified = false
      }
      return json({
        configured: storageConfigured,
        bucketConfigured: getServerEnv('SUPABASE_BUCKET') === 'oxford-customer-documents',
        storageVerified,
        encryptionConfigured: Boolean(getServerEnv('OXFORD_PII_ENCRYPTION_KEY')),
        databaseVerified,
        documentUploadsEnabled: isApprovedCloudflareRequest(request) &&
          getServerEnv('OXFORD_DOCUMENT_UPLOADS_ENABLED') === 'true' && storageVerified,
        liveApplicationsEnabled: isApprovedCloudflareRequest(request) && getServerEnv('OXFORD_APPLICATIONS_ENABLED') === 'true',
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

    if (request.method === 'POST' && action === 'upload-document') {
      if (!isApprovedClo}
