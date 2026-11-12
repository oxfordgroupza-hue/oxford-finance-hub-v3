import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gt, ilike, inArray, isNull, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { assignments, customers, financeApplications, partnerRegistrations, permissionAuditLog, referrals, supportRequests, users } from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { decryptApplicantData, fingerprintIdentityNumber } from './pii-crypto.server'
import { canSearchInternalDirectoryUsers, canSearchOwnRecords, identityNumberFromQuery, isSupportDirectoryOnly, maskIdentityNumber } from './directory-security'

const directorySearchInput = z.object({ query: z.string().trim().min(2).max(100) })
const myRecordsSearchInput = z.object({ query: z.string().trim().min(2).max(100) })


type DirectoryEntry = {
  id: string
  group: 'Applicant / customer' | 'Support enquiry' | 'Partner' | 'Internal user'
  name: string
  email: string
  phone: string
  reference: string
  status: string
  identityNumber: string
}

function contains(value: unknown, query: string): boolean {
  return typeof value === 'string' && value.toLocaleLowerCase().includes(query.toLocaleLowerCase())
}

function identityFingerprintForSearch(value: string): string {
  try { return fingerprintIdentityNumber(value) } catch {
    throw new Error('ID/passport search is unavailable until the secure PII encryption key is configured for this Deploy Preview.')
  }
}

function piiFromApplication(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  return typeof record.piiCiphertext === 'string' ? decryptApplicantData(record.piiCiphertext) : {}
}

const directoryBackfillInput = z.object({ afterId: z.string().uuid().optional() })

/** Super Administrator-only, cursor-based, idempotent index backfill. */
export const backfillDirectoryIdentityIndex = createServerFn({ method: 'POST' })
  .validator((input: unknown) => directoryBackfillInput.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
      throw new Error('Only the Super Administrator can rebuild the restricted identity search index.')
    }
    try { fingerprintIdentityNumber('0000000000000') } catch {
      throw new Error('Identity search cannot be enabled until the secure PII encryption key is configured for this Deploy Preview.')
    }
    const rows = await db.select({ id: financeApplications.id, applicationData: financeApplications.applicationData })
      .from(financeApplications)
      .where(data.afterId
        ? and(isNull(financeApplications.idNumberFingerprint), gt(financeApplications.id, data.afterId))
        : isNull(financeApplications.idNumberFingerprint))
      .orderBy(financeApplications.id)
      .limit(100)
    let updated = 0
    for (const row of rows) {
      let pii: Record<string, unknown>
      try { pii = piiFromApplication(row.applicationData) } catch {
        // Invalid legacy envelopes are skipped; raw identity data is never logged.
        continue
      }
      if (typeof pii.idNumber !== 'string' || !pii.idNumber.trim()) continue
      let idNumberFingerprint: string
      try { idNumberFingerprint = fingerprintIdentityNumber(pii.idNumber) } catch { continue }
      await db.update(financeApplications).set({ idNumberFingerprint })
        .where(and(eq(financeApplications.id, row.id), isNull(financeApplications.idNumberFingerprint)))
      updated += 1
    }
    if (rows.length) {
      await db.insert(permissionAuditLog).values({
        actorUserId: session.user.id,
        action: 'directory.identity_index_backfill',
        resource: 'directory',
        reason: `Identity lookup index backfill batch completed. Scanned ${rows.length}; indexed ${updated}. No identity values retained.`,
      })
    }
    return { scanned: rows.length, indexed: updated, nextCursor: rows.at(-1)?.id ?? null, hasMore: rows.length === 100 }
  })

/**
 * Customer and partner self-service lookup. Customers are limited to their own
 * applications; partners are limited to applications referred by their own account.
 * Partner results intentionally omit applicant contact details and all financial/doc data.
 */
export const searchMyRecords = createServerFn({ method: 'POST' })
  .validator((input: unknown) => myRecordsSearchInput.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked) {
      throw new Error('Please sign in to search your Oxford records.')
    }
    const isCustomer = session.user.accountType === 'customer' && session.permissions.includes('own_applications.view')
    if (!canSearchOwnRecords(session.user.accountType, session.permissions)) {
      throw new Error('Your account is not authorised to search these records.')
    }

    const query = data.query.trim()
    const identityQuery = identityNumberFromQuery(query)
    const identityFingerprint = identityQuery ? identityFingerprintForSearch(identityQuery) : null
    if (identityFingerprint) {
      const recentSearches = await db.select({ total: count() }).from(permissionAuditLog).where(and(
        eq(permissionAuditLog.actorUserId, session.user.id),
        eq(permissionAuditLog.action, 'directory.identity_search'),
        gt(permissionAuditLog.createdAt, new Date(Date.now() - 60_000)),
      ))
      if ((recentSearches[0]?.total ?? 0) >= 10) {
        throw new Error('Too many ID/passport searches in a short period. Please wait a minute and try again.')
      }
    }

    const ownCustomer = isCustomer
      ? (await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.user.id)).limit(1))[0]
      : null
    const rows = isCustomer
      ? ownCustomer
        ? await db.select({ id: financeApplications.id, reference: financeApplications.reference, category: financeApplications.category, status: financeApplications.status, applicationData: financeApplications.applicationData, idNumberFingerprint: financeApplications.idNumberFingerprint })
            .from(financeApplications).where(eq(financeApplications.customerId, ownCustomer.id)).orderBy(desc(financeApplications.createdAt)).limit(250)
        : []
      : await db.select({ id: financeApplications.id, reference: financeApplications.reference, category: financeApplications.category, status: financeApplications.status, applicationData: financeApplications.applicationData, idNumberFingerprint: financeApplications.idNumberFingerprint })
          .from(referrals).innerJoin(financeApplications, eq(referrals.applicationId, financeApplications.id))
          .where(and(eq(referrals.partnerUserId, session.user.id), eq(referrals.applicationId, financeApplications.id)))
          .orderBy(desc(referrals.referredAt)).limit(250)

    const normalizedQuery = query.toLocaleLowerCase()
    const matches = rows.flatMap((row) => {
      let pii: Record<string, unknown> = {}
      try { pii = piiFromApplication(row.applicationData) } catch { /* Reference and keyed identity matches remain usable without legacy PII. */ }
      const identityNumber = typeof pii.idNumber === 'string' ? pii.idNumber : ''
      const matched = row.reference.toLocaleLowerCase().includes(normalizedQuery) ||
        (identityFingerprint !== null && row.idNumberFingerprint === identityFingerprint) ||
        [pii.firstName, pii.lastName, pii.businessName, pii.email, pii.phone].some((value) => contains(value, query))
      if (!matched) return []
      return [{
        reference: row.reference,
        category: row.category,
        status: row.status,
        identityNumber: identityNumber ? maskIdentityNumber(identityNumber) : '',
      }]
    }).slice(0, 50)

    if (identityFingerprint) {
      await db.insert(permissionAuditLog).values({
        actorUserId: session.user.id,
        action: 'directory.identity_search',
        resource: 'directory',
        reason: 'Self-service exact identity lookup completed; query value intentionally not retained.',
      })
    }
    return { entries: matches }
  })

/**
 * Restricted directory search. This deliberately returns a small DTO and never
 * exposes application amounts, assessments, documents, or packs. Full identity numbers
 * are returned only to roles with the separate identity_records.view permission.
 */
export const searchRestrictedDirectory = createServerFn({ method: 'POST' })
  .validator((input: unknown) => directorySearchInput.parse(input))
  .handler(async ({ data }) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' ||
        (!session.isSuperAdmin && !session.permissions.includes('directory.view'))) {
      throw new Error('Your account is not authorised to use the restricted people directory.')
    }

    // Support-only directory roles can find people across the organisation but
    // receive only the limited DTO below. Application reviewers are restricted
    // to applications currently assigned to them; staff with assignment rights
    // and administrators have office-wide applicant search.
    const supportDirectoryOnly = isSupportDirectoryOnly(session.permissions)
    const canViewAllApplicantDirectory = session.isSuperAdmin ||
      session.permissions.includes('applications.assign') || supportDirectoryOnly
    let scopedApplicationIds: string[] | null = null
    let scopedCustomerIds: string[] | null = null
    if (!canViewAllApplicantDirectory) {
      const assignedRows = await db.select({ applicationId: assignments.applicationId })
        .from(assignments)
        .where(and(eq(assignments.assignedTo, session.user.id), isNull(assignments.completedAt)))
      scopedApplicationIds = assignedRows.map((row) => row.applicationId)
      if (scopedApplicationIds.length) {
        const customerRows = await db.select({ customerId: financeApplications.customerId })
          .from(financeApplications).where(inArray(financeApplications.id, scopedApplicationIds))
        scopedCustomerIds = [...new Set(customerRows.map((row) => row.customerId))]
      } else {
        scopedCustomerIds = []
      }
    }

    const rawQuery = data.query.trim()
    const escaped = rawQuery.replace(/[%_]/g, '')
    const pattern = `%${escaped}%`
    let identityFingerprint: string | null = null
    const identityQuery = identityNumberFromQuery(rawQuery)
    if (identityQuery) identityFingerprint = identityFingerprintForSearch(identityQuery)
    if (identityFingerprint) {
      const recentSearches = await db.select({ total: count() }).from(permissionAuditLog).where(and(
        eq(permissionAuditLog.actorUserId, session.user.id),
        eq(permissionAuditLog.action, 'directory.identity_search'),
        gt(permissionAuditLog.createdAt, new Date(Date.now() - 60_000)),
      ))
      if ((recentSearches[0]?.total ?? 0) >= 10) {
        throw new Error('Too many ID/passport searches in a short period. Please wait a minute and try again.')
      }
    }
    const entries: DirectoryEntry[] = []
    const seen = new Set<string>()

    const add = (entry: DirectoryEntry) => {
      if (seen.has(entry.id) || entries.length >= 50) return
      seen.add(entry.id)
      entries.push(entry)
    }

    // Contact enquiries can exist before a person creates an Oxford account.
    const enquiryRows = session.permissions.includes('support.view') || session.isSuperAdmin
      ? await db.select({
          id: supportRequests.id, name: supportRequests.name, email: supportRequests.email,
          phone: supportRequests.phone, subject: supportRequests.subject, status: supportRequests.status,
        }).from(supportRequests)
          .where(or(ilike(supportRequests.name, pattern), ilike(supportRequests.email, pattern), ilike(supportRequests.phone, pattern), ilike(supportRequests.subject, pattern)))
          .orderBy(desc(supportRequests.createdAt)).limit(15)
      : []
    for (const row of enquiryRows) add({
      id: `support:${row.id}`, group: 'Support enquiry', name: row.name,
      email: row.email, phone: row.phone ?? '', reference: '', status: row.status, identityNumber: '',
    })

    // Partner directory: only registration/contact fields, never commercial terms or referrals.
    const partnerRows = supportDirectoryOnly || session.permissions.includes('partners.view') || session.isSuperAdmin
      ? await db.select({
          id: partnerRegistrations.id, businessName: partnerRegistrations.businessName,
          contactName: partnerRegistrations.contactName, email: partnerRegistrations.email,
          phone: partnerRegistrations.phone, status: partnerRegistrations.status,
        }).from(partnerRegistrations)
          .where(or(
            ilike(partnerRegistrations.businessName, pattern),
            ilike(partnerRegistrations.contactName, pattern),
            ilike(partnerRegistrations.email, pattern),
            ilike(partnerRegistrations.phone, pattern),
          )).orderBy(desc(partnerRegistrations.createdAt)).limit(15)
      : []
    for (const row of partnerRows) add({
      id: `partner:${row.id}`, group: 'Partner', name: row.contactName || row.businessName,
      email: row.email, phone: row.phone ?? '', reference: row.businessName, status: row.status, identityNumber: '',
    })

    // Internal users and registered account contact details. Account roles and permissions are not returned.
    const canSearchInternalUsers = canSearchInternalDirectoryUsers(session.permissions, session.isSuperAdmin)
    const visibleAccountTypes = canSearchInternalUsers ? ['office', 'service'] as const : []
    const userRows = visibleAccountTypes.length
      ? await db.select({
          id: users.id, displayName: users.displayName, email: users.email,
          accountType: users.accountType, status: users.status,
        }).from(users)
          .where(and(or(ilike(users.displayName, pattern), ilike(users.email, pattern)), inArray(users.accountType, [...visibleAccountTypes])))
          .orderBy(users.displayName).limit(25)
      : []
    for (const row of userRows) {
      add({
        id: `user:${row.id}`,
        group: row.accountType === 'office' || row.accountType === 'service' ? 'Internal user' : 'Applicant / customer',
        name: row.displayName || 'Oxford user', email: row.email, phone: '',
        reference: '', status: row.status, identityNumber: '',
      })
    }

    // Customer names and phone numbers are encrypted at rest. Decrypt only on
    // the server, compare in memory, and return no private profile fields.
    const customerQuery = db.select({
      customerId: customers.id, userId: customers.userId, profile: customers.profile,
      applicantType: customers.applicantType, userEmail: users.email, displayName: users.displayName,
      userStatus: users.status,
    }).from(customers).innerJoin(users, eq(customers.userId, users.id))
    const customerRows = scopedCustomerIds === null
      ? await customerQuery.orderBy(desc(customers.updatedAt))
      : scopedCustomerIds.length
        ? await customerQuery.where(inArray(customers.id, scopedCustomerIds)).orderBy(desc(customers.updatedAt))
        : []

    for (const row of customerRows) {
      let pii: Record<string, unknown> = {}
      try {
        const profile = row.profile && typeof row.profile === 'object' ? row.profile as Record<string, unknown> : {}
        if (typeof profile.piiCiphertext === 'string') pii = decryptApplicantData(profile.piiCiphertext)
      } catch {
        // A damaged PII envelope must not break directory search or expose ciphertext.
        continue
      }
      const name = [pii.firstName, pii.lastName].filter((part): part is string => typeof part === 'string' && Boolean(part)).join(' ')
        || (typeof pii.businessName === 'string' ? pii.businessName : '')
        || row.displayName || row.userEmail
      const email = typeof pii.email === 'string' ? pii.email : row.userEmail
      const phone = typeof pii.phone === 'string' ? pii.phone : ''
      if (contains(name, rawQuery) || contains(email, rawQuery) || contains(phone, rawQuery)) {
        add({
          id: `customer:${row.customerId}`, group: 'Applicant / customer', name,
          email, phone, reference: '', status: row.userStatus, identityNumber: '',
        })
      }
    }

    // Search by exact application reference or exact ID/passport fingerprint.
    const applicationQuery = db.select({
      id: financeApplications.id, reference: financeApplications.reference,
      customerId: financeApplications.customerId, idNumberFingerprint: financeApplications.idNumberFingerprint,
      applicationData: financeApplications.applicationData,
      status: financeApplications.status, profile: customers.profile, applicantType: customers.applicantType,
      userEmail: users.email, displayName: users.displayName, userStatus: users.status,
    }).from(financeApplications)
      .innerJoin(customers, eq(financeApplications.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
    const applicationSearchCondition = or(
      ilike(financeApplications.reference, pattern),
      ...(identityFingerprint ? [eq(financeApplications.idNumberFingerprint, identityFingerprint)] : []),
    )
    const applicationRows = scopedApplicationIds === null
      ? await applicationQuery.where(applicationSearchCondition).orderBy(desc(financeApplications.createdAt)).limit(15)
      : scopedApplicationIds.length
        ? await applicationQuery.where(and(applicationSearchCondition, inArray(financeApplications.id, scopedApplicationIds)))
            .orderBy(desc(financeApplications.createdAt)).limit(15)
        : []

    let identitySearchMatched = false
    for (const row of applicationRows) {
      const profile = row.profile && typeof row.profile === 'object' ? row.profile as Record<string, unknown> : {}
      let pii: Record<string, unknown> = {}
      try {
        if (typeof profile.piiCiphertext === 'string') pii = decryptApplicantData(profile.piiCiphertext)
      } catch { /* Keep the result limited to the account's safe fallback fields. */ }
      const name = [pii.firstName, pii.lastName].filter((part): part is string => typeof part === 'string' && Boolean(part)).join(' ')
        || (typeof pii.businessName === 'string' ? pii.businessName : '')
        || row.displayName || row.userEmail
      const matchedByIdentity = Boolean(identityFingerprint && row.idNumberFingerprint === identityFingerprint)
      if (matchedByIdentity) identitySearchMatched = true
      let applicationPii: Record<string, unknown> = {}
      try { applicationPii = piiFromApplication(row.applicationData) } catch { /* Do not expose or fail on an invalid encrypted envelope. */ }
      const storedIdentityNumber = typeof applicationPii.idNumber === 'string' ? applicationPii.idNumber : ''
      const canViewIdentityNumber = session.isSuperAdmin || session.permissions.includes('identity_records.view')
      const identityNumber = storedIdentityNumber
        ? canViewIdentityNumber ? storedIdentityNumber : maskIdentityNumber(storedIdentityNumber)
        : ''
      add({
        id: `application:${row.id}`, group: 'Applicant / customer', name,
        email: typeof pii.email === 'string' ? pii.email : row.userEmail,
        phone: typeof pii.phone === 'string' ? pii.phone : '',
        reference: row.reference, status: row.status, identityNumber,
      })
    }

    // Audit exact identity-number lookups. Never retain the supplied number.
    if (identityFingerprint) {
      await db.insert(permissionAuditLog).values({
        actorUserId: session.user.id,
        action: 'directory.identity_search',
        resource: 'directory',
        reason: identitySearchMatched ? 'Exact identity lookup completed; query value intentionally not retained.' : 'Exact identity lookup completed with no match; query value intentionally not retained.',
      })
    }

    return { entries: entries.slice(0, 50), identitySearchAvailable: true }
  })
