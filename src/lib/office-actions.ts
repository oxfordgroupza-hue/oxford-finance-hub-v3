import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import {
  applicationStatusHistory,
  assignments,
  auditEvents,
  permissionAuditLog,
  customers,
  financeApplications,
  officeNotes,
  notifications,
  partnerRegistrations,
  supportRequests,
  users,
  staffRoles,
  roles,
  rolePermissions,
  permissions,
  userPermissionOverrides,
} from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { applicationStatuses, canTransitionApplicationStatus } from './domain'
import { decryptApplicantData } from './pii-crypto.server'
import type { PermissionKey } from './access-control'

async function getAssignableStaff() {
  const rows = await db.select({
    id: users.id,
    name: users.displayName,
    email: users.email,
    roleKey: roles.key,
    permission: permissions.key,
  }).from(users)
    .innerJoin(staffRoles, and(eq(staffRoles.userId, users.id), isNull(staffRoles.revokedAt)))
    .innerJoin(roles, and(eq(roles.id, staffRoles.roleId), eq(roles.isActive, true), eq(roles.audience, 'office')))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(eq(users.accountType, 'office'), eq(users.status, 'active')))
    .orderBy(users.displayName)

  const byUser = new Map<string, { id: string; name: string | null; email: string; roleKeys: Set<string>; permissionKeys: Set<string> }>()
  for (const row of rows) {
    const item = byUser.get(row.id) ?? { id: row.id, name: row.name, email: row.email, roleKeys: new Set<string>(), permissionKeys: new Set<string>() }
    item.roleKeys.add(row.roleKey)
    if (row.permission) item.permissionKeys.add(row.permission)
    byUser.set(row.id, item)
  }

  const candidates = [...byUser.values()].filter((item) =>
    item.roleKeys.has('super_administrator') || (item.permissionKeys.has('applications.view') && item.permissionKeys.has('applications.edit')),
  )
  if (!candidates.length) return []

  const denied = await db.select({ userId: userPermissionOverrides.userId, permission: permissions.key, expiresAt: userPermissionOverrides.expiresAt })
    .from(userPermissionOverrides)
    .innerJoin(permissions, eq(permissions.id, userPermissionOverrides.permissionId))
    .where(and(
      inArray(userPermissionOverrides.userId, candidates.map((item) => item.id)),
      eq(userPermissionOverrides.effect, 'deny'),
      isNull(userPermissionOverrides.revokedAt),
    ))
  const deniedByUser = new Map<string, Set<string>>()
  for (const item of denied) {
    if (item.expiresAt && item.expiresAt <= new Date()) continue
    const keys = deniedByUser.get(item.userId) ?? new Set<string>()
    keys.add(item.permission)
    deniedByUser.set(item.userId, keys)
  }
  return candidates.filter((item) => item.roleKeys.has('super_administrator') ||
    (!deniedByUser.get(item.id)?.has('applications.view') && !deniedByUser.get(item.id)?.has('applications.edit')))
    .map(({ id, name, email }) => ({ id, name, email }))
}
async function requireOffice(permission: PermissionKey) {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'office' || !session.permissions.includes('office.view')) {
    throw new Error('An active, authorised office account is required.')
  }
  if (!session.isSuperAdmin && !session.permissions.includes(permission)) {
    throw new Error(`Your account does not have the ${permission} permission.`)
  }
  return session
}

export const getOfficeWorkspaceData = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await requireOffice('office.view')
  const canViewApplications = session.isSuperAdmin || session.permissions.includes('applications.view')
  const canViewCustomerDetails = session.isSuperAdmin || session.permissions.includes('customers.view')
  // Users who can assign work have office-wide application visibility. Reviewers
  // without that permission are restricted to applications actively assigned to them.
  const canViewAllApplications = session.isSuperAdmin || session.permissions.includes('applications.assign')
  const assignedRows = canViewApplications && !canViewAllApplications
    ? await db.select({ applicationId: assignments.applicationId })
        .from(assignments)
        .where(and(eq(assignments.assignedTo, session.user.id), isNull(assignments.completedAt)))
    : []
  const scopedApplicationIds = assignedRows.map((row) => row.applicationId)

  const allApplicationsQuery = () => db.select({
    id: financeApplications.id,
    reference: financeApplications.reference,
    applicantType: financeApplications.applicantType,
    category: financeApplications.category,
    status: financeApplications.status,
    priority: financeApplications.priority,
    financeAmount: financeApplications.financeAmount,
    assetDescription: financeApplications.assetDescription,
    referralCode: financeApplications.referralCode,
    partnerBusinessName: partnerRegistrations.businessName,
    submittedAt: financeApplications.submittedAt,
    createdAt: financeApplications.createdAt,
    firstName: canViewCustomerDetails ? customers.firstName : sql<string | null>`null`,
    lastName: canViewCustomerDetails ? customers.lastName : sql<string | null>`null`,
    businessName: canViewCustomerDetails ? customers.businessName : sql<string | null>`null`,
    phone: canViewCustomerDetails ? customers.phone : sql<string | null>`null`,
    profile: canViewCustomerDetails ? customers.profile : sql<Record<string, unknown> | null>`null`,
    email: canViewCustomerDetails ? users.email : sql<string | null>`null`,
  }).from(financeApplications)
    .innerJoin(customers, eq(financeApplications.customerId, customers.id))
    .innerJoin(users, eq(customers.userId, users.id))
    .leftJoin(partnerRegistrations, eq(financeApplications.referralCode, partnerRegistrations.referralCode))

  const [applications, partners, support, audit, securityAudit, staff, notes, assignmentRows, history] = await Promise.all([
    !canViewApplications
      ? Promise.resolve([])
      : canViewAllApplications
        ? allApplicationsQuery().orderBy(desc(financeApplications.createdAt))
        : scopedApplicationIds.length
          ? allApplicationsQuery().where(inArray(financeApplications.id, scopedApplicationIds)).orderBy(desc(financeApplications.createdAt))
          : Promise.resolve([]),
    session.permissions.includes('partners.view') || session.isSuperAdmin
      ? db.select({
          id: partnerRegistrations.id,
          businessName: partnerRegistrations.businessName,
          contactName: partnerRegistrations.contactName,
          email: partnerRegistrations.email,
          phone: partnerRegistrations.phone,
          linkedUserId: partnerRegistrations.userId,
          status: partnerRegistrations.status,
          referralCode: partnerRegistrations.referralCode,
          createdAt: partnerRegistrations.createdAt,
        }).from(partnerRegistrations).orderBy(desc(partnerRegistrations.createdAt))
      : Promise.resolve([]),
    session.permissions.includes('support.view') || session.isSuperAdmin
      ? db.select({
          id: supportRequests.id,
          channel: supportRequests.channel,
          status: supportRequests.status,
          name: supportRequests.name,
          email: supportRequests.email,
          subject: supportRequests.subject,
          message: supportRequests.message,
          createdAt: supportRequests.createdAt,
        }).from(supportRequests).orderBy(desc(supportRequests.createdAt))
      : Promise.resolve([]),
    session.permissions.includes('audit_log.view') || session.isSuperAdmin
      ? db.select({
          id: auditEvents.id,
          actorUserId: auditEvents.actorUserId,
          actorName: sql<string | null>`${users.displayName}`,
          actorEmail: sql<string | null>`${users.email}`,
          event: auditEvents.event,
          resource: auditEvents.resource,
          resourceId: auditEvents.resourceId,
          details: sql<string>`${auditEvents.details}::text`,
          createdAt: auditEvents.createdAt,
        }).from(auditEvents).leftJoin(users, eq(auditEvents.actorUserId, users.id)).orderBy(desc(auditEvents.createdAt)).limit(100)
      : Promise.resolve([]),
    session.isSuperAdmin
      ? db.select({
          id: permissionAuditLog.id,
          actorUserId: permissionAuditLog.actorUserId,
          actorName: users.displayName,
          actorEmail: users.email,
          affectedUserId: permissionAuditLog.affectedUserId,
          action: permissionAuditLog.action,
          resource: permissionAuditLog.resource,
          recordId: permissionAuditLog.recordId,
          previousValue: sql<string | null>`${permissionAuditLog.previousValue}::text`,
          newValue: sql<string | null>`${permissionAuditLog.newValue}::text`,
          reason: permissionAuditLog.reason,
          createdAt: permissionAuditLog.createdAt,
        }).from(permissionAuditLog).leftJoin(users, eq(permissionAuditLog.actorUserId, users.id))
          .orderBy(desc(permissionAuditLog.createdAt)).limit(100)
      : Promise.resolve([]),
    session.permissions.includes('applications.assign') || session.isSuperAdmin
      ? getAssignableStaff()
      : Promise.resolve([]),
    session.permissions.includes('notes.view') && canViewApplications
      ? canViewAllApplications
        ? db.select({ id: officeNotes.id, applicationId: officeNotes.applicationId, body: officeNotes.body, authorUserId: officeNotes.authorUserId, createdAt: officeNotes.createdAt })
            .from(officeNotes).where(eq(officeNotes.isInternal, true)).orderBy(desc(officeNotes.createdAt)).limit(250)
        : scopedApplicationIds.length
          ? db.select({ id: officeNotes.id, applicationId: officeNotes.applicationId, body: officeNotes.body, authorUserId: officeNotes.authorUserId, createdAt: officeNotes.createdAt })
              .from(officeNotes).where(and(eq(officeNotes.isInternal, true), inArray(officeNotes.applicationId, scopedApplicationIds)))
              .orderBy(desc(officeNotes.createdAt)).limit(250)
          : Promise.resolve([])
      : Promise.resolve([]),
    canViewApplications
      ? canViewAllApplications
        ? db.select({
            applicationId: assignments.applicationId, assignedTo: assignments.assignedTo,
            assignedAt: assignments.assignedAt, completedAt: assignments.completedAt,
            name: users.displayName, email: users.email,
          }).from(assignments).innerJoin(users, eq(assignments.assignedTo, users.id))
            .where(isNull(assignments.completedAt)).orderBy(desc(assignments.assignedAt))
        : scopedApplicationIds.length
          ? db.select({
              applicationId: assignments.applicationId, assignedTo: assignments.assignedTo,
              assignedAt: assignments.assignedAt, completedAt: assignments.completedAt,
              name: users.displayName, email: users.email,
            }).from(assignments).innerJoin(users, eq(assignments.assignedTo, users.id))
              .where(and(isNull(assignments.completedAt), inArray(assignments.applicationId, scopedApplicationIds)))
              .orderBy(desc(assignments.assignedAt))
          : Promise.resolve([])
      : Promise.resolve([]),
    canViewApplications
      ? canViewAllApplications
        ? db.select({
            id: applicationStatusHistory.id, applicationId: applicationStatusHistory.applicationId,
            fromStatus: applicationStatusHistory.fromStatus, toStatus: applicationStatusHistory.toStatus,
            changedBy: applicationStatusHistory.changedBy, note: applicationStatusHistory.note,
            createdAt: applicationStatusHistory.createdAt,
          }).from(applicationStatusHistory).orderBy(desc(applicationStatusHistory.createdAt)).limit(500)
        : scopedApplicationIds.length
          ? db.select({
              id: applicationStatusHistory.id, applicationId: applicationStatusHistory.applicationId,
              fromStatus: applicationStatusHistory.fromStatus, toStatus: applicationStatusHistory.toStatus,
              changedBy: applicationStatusHistory.changedBy, note: applicationStatusHistory.note,
              createdAt: applicationStatusHistory.createdAt,
            }).from(applicationStatusHistory).where(inArray(applicationStatusHistory.applicationId, scopedApplicationIds))
              .orderBy(desc(applicationStatusHistory.createdAt)).limit(500)
          : Promise.resolve([])
      : Promise.resolve([]),
  ])
  const visibleApplications = applications.map((application) => {
    const { profile, ...safeApplication } = application
    const privateProfile = profile && typeof profile.piiCiphertext === 'string'
      ? decryptApplicantData(profile.piiCiphertext)
      : {}
    return {
      ...safeApplication,
      firstName: typeof privateProfile.firstName === 'string' ? privateProfile.firstName : application.firstName,
      lastName: typeof privateProfile.lastName === 'string' ? privateProfile.lastName : application.lastName,
      businessName: typeof privateProfile.businessName === 'string' ? privateProfile.businessName : application.businessName,
      phone: typeof privateProfile.phone === 'string' ? privateProfile.phone : application.phone,
    }
  })
  return {
    applications: visibleApplications,
    partners,
    support,
    audit,
    securityAudit,
    staff,
    notes,
    assignments: assignmentRows,
    history,
    permissions: session.permissions,
    isSuperAdmin: session.isSuperAdmin,
    administratorEmail: session.user.email,
  }
})

const statusInput = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(applicationStatuses),
  note: z.string().trim().max(2000).optional(),
  providerDecision: z.enum(['approved', 'declined', 'withdrawn']).optional(),
})

export const updateApplicationStatus = createServerFn({ method: 'POST' })
  .validator((input: unknown) => statusInput.parse(input))
  .handler(async ({ data }) => {
    const requiresApproval = data.status === 'Provider decision received' || data.status === 'Closed'
    const session = await requireOffice(requiresApproval ? 'applications.approve' : 'applications.edit')
    if (data.status === 'Provider decision received' && !data.providerDecision) {
      throw new Error('Record the finance provider decision before moving this application to that status.')
    }
    if (data.providerDecision && data.status !== 'Provider decision received') {
      throw new Error('A finance provider decision can only be recorded with the Provider decision received status.')
    }
    return db.transaction(async (tx) => {
      const [application] = await tx.select({
        id: financeApplications.id,
        reference: financeApplications.reference,
        status: financeApplications.status,
        providerDecision: financeApplications.providerDecision,
        customerUserId: customers.userId,
      }).from(financeApplications)
        .innerJoin(customers, eq(financeApplications.customerId, customers.id))
        .where(eq(financeApplications.id, data.applicationId)).limit(1)
      if (!application) throw new Error('Application not found.')
      if (!canTransitionApplicationStatus(application.status, data.status)) {
        throw new Error(`The application cannot move from ${application.status} to ${data.status}.`)
      }
      if (!session.isSuperAdmin && !session.permissions.includes('applications.assign')) {
        const [activeAssignment] = await tx.select({ id: assignments.id })
          .from(assignments)
          .where(and(
            eq(assignments.applicationId, data.applicationId),
            eq(assignments.assignedTo, session.user.id),
            isNull(assignments.completedAt),
          )).limit(1)
        if (!activeAssignment) throw new Error('You can only update applications currently assigned to you.')
      }
      const [updated] = await tx.update(financeApplications).set({
        status: data.status,
        providerDecision: data.status === 'Provider decision received' ? data.providerDecision ?? null : null,
        updatedAt: new Date(),
      }).where(and(
        eq(financeApplications.id, data.applicationId),
        eq(financeApplications.status, application.status),
      )).returning({ id: financeApplications.id })
      if (!updated) throw new Error('The application changed while you were updating it. Refresh and try again.')
      await tx.insert(applicationStatusHistory).values({
        applicationId: data.applicationId,
        fromStatus: application.status,
        toStatus: data.status,
        changedBy: session.user.id,
        note: data.note || null,
      })
      await tx.insert(notifications).values({
        userId: application.customerUserId,
        channel: 'email',
        template: 'application_status_updated',
        status: 'queued',
        payload: { reference: application.reference, status: data.status },
      })
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'application.status_changed',
        resource: 'finance_application',
        resourceId: data.applicationId,
        details: {
          from: application.status,
          to: data.status,
          previousProviderDecision: application.providerDecision ?? null,
          providerDecision: data.status === 'Provider decision received' ? data.providerDecision ?? null : null,
        },
      })
      return { success: true }
    })
  })

const assignmentInput = z.object({
  applicationId: z.string().uuid(),
  assignedTo: z.string().uuid(),
})

export const assignApplication = createServerFn({ method: 'POST' })
  .validator((input: unknown) => assignmentInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireOffice('applications.assign')
    return db.transaction(async (tx) => {
      const eligibleStaff = await getAssignableStaff()
      const target = eligibleStaff.find((person) => person.id === data.assignedTo)
      if (!target) throw new Error('The selected account is not an active staff member with application review permissions.')
      const [application] = await tx.select({ id: financeApplications.id })
        .from(financeApplications).where(eq(financeApplications.id, data.applicationId)).limit(1)
      if (!application) throw new Error('Application not found.')
      await tx.update(assignments).set({ completedAt: new Date() })
        .where(and(eq(assignments.applicationId, data.applicationId), isNull(assignments.completedAt)))
      await tx.insert(assignments).values({
        applicationId: data.applicationId,
        assignedTo: data.assignedTo,
        assignedBy: session.user.id,
      })
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'application.assigned',
        resource: 'finance_application',
        resourceId: data.applicationId,
        details: { assignedTo: data.assignedTo },
      })
      return { success: true }
    })
  })

const noteInput = z.object({
  applicationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
})

export const createOfficeNote = createServerFn({ method: 'POST' })
  .validator((input: unknown) => noteInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireOffice('notes.create')
    await db.transaction(async (tx) => {
      const [application] = await tx.select({ id: financeApplications.id })
        .from(financeApplications)
        .where(eq(financeApplications.id, data.applicationId))
        .limit(1)
      if (!application) throw new Error('Application not found.')
      if (!session.isSuperAdmin && !session.permissions.includes('applications.assign')) {
        const [activeAssignment] = await tx.select({ id: assignments.id })
          .from(assignments)
          .where(and(
            eq(assignments.applicationId, data.applicationId),
            eq(assignments.assignedTo, session.user.id),
            isNull(assignments.completedAt),
          )).limit(1)
        if (!activeAssignment) throw new Error('You can only add notes to applications currently assigned to you.')
      }
      await tx.insert(officeNotes).values({
        applicationId: data.applicationId,
        authorUserId: session.user.id,
        body: data.body,
        isInternal: true,
      })
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'application.internal_note_added',
        resource: 'finance_application',
        resourceId: data.applicationId,
        details: { characterCount: data.body.length },
      })
    })
    return { success: true }
  })

const supportStatusInput = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['Open', 'Awaiting customer', 'Resolved']),
})

export const updateSupportRequestStatus = createServerFn({ method: 'POST' })
  .validator((input: unknown) => supportStatusInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireOffice('support.edit')
    await db.transaction(async (tx) => {
      const [updated] = await tx.update(supportRequests)
        .set({ status: data.status, updatedAt: new Date() })
        .where(eq(supportRequests.id, data.requestId))
        .returning({ id: supportRequests.id })
      if (!updated) throw new Error('Support request not found.')
      await tx.insert(auditEvents).values({
        actorUserId: session.user.id,
        event: 'support.status_changed',
        resource: 'support_request',
        resourceId: data.requestId,
        details: { status: data.status },
      })
    })
    return { success: true }
  })
