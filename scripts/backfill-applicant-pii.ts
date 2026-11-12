import { and, eq, isNotNull, or, sql } from 'drizzle-orm'
import { db } from '../db'
import { applicationIntakes, customers, financeApplications, notifications, users } from '../db/schema'
import { decryptApplicantData, encryptApplicantData, fingerprintApplicantData } from '../src/lib/pii-crypto.server'
import { applicantPiiFields, withoutApplicantPii } from '../src/lib/applicant-pii-sanitization'

const apply = process.argv.includes('--apply')
const limitArg = process.argv.find((value) => value.startsWith('--limit='))
const requestedLimit = Number(limitArg?.split('=')[1] ?? 1000)
const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(5000, requestedLimit)) : 1000
const piiKeys: readonly string[] = applicantPiiFields

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function main() {
  // Fail closed before connecting or scanning if the server-only key is absent.
  encryptApplicantData({ backfillPreflight: true })

  const counts = {
    intakeRows: 0,
    customerProfiles: 0,
    applicationSnapshots: 0,
    notificationPayloads: 0,
    customerDisplayNames: 0,
  }

  await db.transaction(async (tx) => {
    const intakeRows = await tx.select().from(applicationIntakes)
      .where(or(
        isNotNull(applicationIntakes.applicantEmail),
        isNotNull(applicationIntakes.applicantName),
        isNotNull(applicationIntakes.phone),
      )).limit(limit)
    for (const row of intakeRows) {
      const existingPii = row.applicantPiiCiphertext ? decryptApplicantData(row.applicantPiiCiphertext) : {}
      const email = (row.applicantEmail?.trim() || (typeof existingPii.email === 'string' ? existingPii.email : '')).trim().toLowerCase()
      const applicantName = row.applicantName?.trim() || (typeof existingPii.applicantName === 'string' ? existingPii.applicantName : '')
      const phone = row.phone?.trim() || (typeof existingPii.phone === 'string' ? existingPii.phone : '')
      if (row.applicantEmail === null && row.applicantName === null && row.phone === null) continue
      const applicantEmailFingerprint = fingerprintApplicantData({ email })
      const applicantPiiCiphertext = encryptApplicantData({ ...existingPii, email, applicantName, phone })
      counts.intakeRows += 1
      if (apply) {
        await tx.update(applicationIntakes).set({
          applicantEmail: null,
          applicantName: null,
          phone: null,
          applicantEmailFingerprint,
          applicantPiiCiphertext,
          updatedAt: new Date(),
        }).where(eq(applicationIntakes.id, row.id))
      }
    }

    const customerRows = await tx.select().from(customers)
      .where(or(
        isNotNull(customers.firstName),
        isNotNull(customers.lastName),
        isNotNull(customers.businessName),
        isNotNull(customers.phone),
        sql`(${customers.profile} ? 'firstName' OR ${customers.profile} ? 'lastName' OR ${customers.profile} ? 'businessName' OR ${customers.profile} ? 'tradingName' OR ${customers.profile} ? 'email' OR ${customers.profile} ? 'phone' OR ${customers.profile} ? 'supplier' OR ${customers.profile} ? 'applicantName' OR ${customers.profile} ? 'contactName' OR ${customers.profile} ? 'comments' OR ${customers.profile} ? 'idType' OR ${customers.profile} ? 'idNumber' OR ${customers.profile} ? 'dateOfBirth' OR ${customers.profile} ? 'address' OR ${customers.profile} ? 'employmentStatus' OR ${customers.profile} ? 'employer' OR ${customers.profile} ? 'grossMonthlyIncome' OR ${customers.profile} ? 'netMonthlyIncome' OR ${customers.profile} ? 'registrationNumber' OR ${customers.profile} ? 'yearsTrading' OR ${customers.profile} ? 'industry' OR ${customers.profile} ? 'businessAddress' OR ${customers.profile} ? 'annualTurnover' OR ${customers.profile} ? 'directors')`,
      )).limit(limit)
    for (const row of customerRows) {
      const profile = isRecord(row.profile) ? row.profile : {}
      const existingPii = typeof profile.piiCiphertext === 'string' ? decryptApplicantData(profile.piiCiphertext) : {}
      const legacyProfilePii = Object.fromEntries(Object.entries(profile).filter(([key]) => piiKeys.includes(key)))
      const identity = {
        ...existingPii,
        ...legacyProfilePii,
        firstName: row.firstName?.trim() || (typeof legacyProfilePii.firstName === 'string' ? legacyProfilePii.firstName : typeof existingPii.firstName === 'string' ? existingPii.firstName : ''),
        lastName: row.lastName?.trim() || (typeof legacyProfilePii.lastName === 'string' ? legacyProfilePii.lastName : typeof existingPii.lastName === 'string' ? existingPii.lastName : ''),
        businessName: row.businessName?.trim() || (typeof legacyProfilePii.businessName === 'string' ? legacyProfilePii.businessName : typeof existingPii.businessName === 'string' ? existingPii.businessName : ''),
        phone: row.phone?.trim() || (typeof legacyProfilePii.phone === 'string' ? legacyProfilePii.phone : typeof existingPii.phone === 'string' ? existingPii.phone : ''),
      }
      if (row.firstName === null && row.lastName === null && row.businessName === null && row.phone === null && Object.keys(legacyProfilePii).length === 0) continue
      const piiCiphertext = encryptApplicantData(identity)
      const safeProfile = withoutApplicantPii(profile)
      counts.customerProfiles += 1
      if (apply) {
        await tx.update(customers).set({
          firstName: null,
          lastName: null,
          businessName: null,
          phone: null,
          profile: { ...safeProfile, piiCiphertext, piiEncryptionVersion: 'aes-256-gcm-v1' },
          updatedAt: new Date(),
        }).where(eq(customers.id, row.id))
      }
    }

    const applications = await tx.select({
      id: financeApplications.id,
      applicationData: financeApplications.applicationData,
    }).from(financeApplications)
      .where(sql`(${financeApplications.applicationData} ? 'firstName' OR ${financeApplications.applicationData} ? 'lastName' OR ${financeApplications.applicationData} ? 'businessName' OR ${financeApplications.applicationData} ? 'tradingName' OR ${financeApplications.applicationData} ? 'email' OR ${financeApplications.applicationData} ? 'phone' OR ${financeApplications.applicationData} ? 'supplier' OR ${financeApplications.applicationData} ? 'applicantName' OR ${financeApplications.applicationData} ? 'contactName' OR ${financeApplications.applicationData} ? 'comments' OR ${financeApplications.applicationData} ? 'idType' OR ${financeApplications.applicationData} ? 'idNumber' OR ${financeApplications.applicationData} ? 'dateOfBirth' OR ${financeApplications.applicationData} ? 'address' OR ${financeApplications.applicationData} ? 'employmentStatus' OR ${financeApplications.applicationData} ? 'employer' OR ${financeApplications.applicationData} ? 'grossMonthlyIncome' OR ${financeApplications.applicationData} ? 'netMonthlyIncome' OR ${financeApplications.applicationData} ? 'registrationNumber' OR ${financeApplications.applicationData} ? 'yearsTrading' OR ${financeApplications.applicationData} ? 'industry' OR ${financeApplications.applicationData} ? 'businessAddress' OR ${financeApplications.applicationData} ? 'annualTurnover' OR ${financeApplications.applicationData} ? 'directors')`)
      .limit(limit)
    for (const row of applications) {
      const data = isRecord(row.applicationData) ? { ...row.applicationData } : {}
      const legacyPii: Record<string, unknown> = {}
      let foundLegacyPiiKey = false
      for (const key of piiKeys) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          foundLegacyPiiKey = true
          if (data[key] !== undefined && data[key] !== null && data[key] !== '') legacyPii[key] = data[key]
          delete data[key]
        }
      }
      if (!foundLegacyPiiKey) continue
      const existingCiphertext = typeof data.piiCiphertext === 'string'
        ? decryptApplicantData(data.piiCiphertext)
        : {}
      const mergedPii = { ...existingCiphertext, ...legacyPii }
      if (Object.keys(mergedPii).length > 0) {
        data.piiCiphertext = encryptApplicantData(mergedPii)
        data.piiEncryptionVersion = 'aes-256-gcm-v1'
      }
      counts.applicationSnapshots += 1
      if (apply) {
        await tx.update(financeApplications).set({ applicationData: data, updatedAt: new Date() })
          .where(eq(financeApplications.id, row.id))
      }
    }

    const queuedNotifications = await tx.select().from(notifications)
      .where(sql`(${notifications.payload} ? 'recipient' OR ${notifications.payload} ? 'applicantName')`)
      .limit(limit)
    for (const row of queuedNotifications) {
      const payload = isRecord(row.payload) ? { ...row.payload } : {}
      const existingPii = typeof payload.applicantPiiEnvelope === 'string' ? decryptApplicantData(payload.applicantPiiEnvelope) : {}
      if (payload.recipient === undefined && payload.applicantName === undefined) continue
      const applicantPiiEnvelope = encryptApplicantData({
        ...existingPii,
        recipient: typeof payload.recipient === 'string' ? payload.recipient : typeof existingPii.recipient === 'string' ? existingPii.recipient : '',
        applicantName: typeof payload.applicantName === 'string' ? payload.applicantName : typeof existingPii.applicantName === 'string' ? existingPii.applicantName : '',
      })
      delete payload.recipient
      delete payload.applicantName
      payload.applicantPiiEnvelope = applicantPiiEnvelope
      counts.notificationPayloads += 1
      if (apply) {
        await tx.update(notifications).set({ payload, updatedAt: new Date() })
          .where(eq(notifications.id, row.id))
      }
    }

    const customerAccounts = await tx.select({ id: users.id, displayName: users.displayName }).from(users)
      .where(and(eq(users.accountType, 'customer')))
      .limit(limit)
    for (const account of customerAccounts) {
      if (account.displayName === null) continue
      counts.customerDisplayNames += 1
      if (apply) {
        await tx.update(users).set({ displayName: null, updatedAt: new Date() })
          .where(eq(users.id, account.id))
      }
    }
  })

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  process.stdout.write(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    limitPerTable: limit,
    counts,
    totalChanges: total,
    nextStep: apply && total === 0 ? 'No legacy applicant PII rows remain in the scanned tables; run the documented read-only PII audit queries before release.' : apply ? 'Repeat with --apply until all counts are zero, then verify with the PII audit queries.' : 'Review counts and rerun with --apply only after a database backup.',
  }, null, 2) + '\n')
}

main().catch((error: unknown) => {
  process.stderr.write((error instanceof Error ? error.message : 'Applicant PII backfill failed.') + '\n')
  process.exitCode = 1
})
