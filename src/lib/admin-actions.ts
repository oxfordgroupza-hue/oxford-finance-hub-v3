import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import {
  auditEvents,
  permissionAuditLog,
  permissions,
  rolePermissions,
  roles,
  staffRoles,
  userPermissionOverrides,
  userSuspensions,
  users,
} from '../../db/schema'
import {
  assertGuard,
  checkAssignRole,
  checkSaveCustomRole,
  checkSetRoleActive,
  checkReinstateUser,
  checkRevokeRole,
  checkSetOverride,
  checkRevokeOverride,
  checkSuspendUser,
  isSuspended,
  permissionCatalogue,
  roleTemplates,
  type AuthorizationSubject,
  type RoleRecord,
} from './access-control'
import { getAuthorizationSnapshot } from './auth'

async function requireSuperAdmin() {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
    throw new Error('Only the authenticated Super Administrator can manage accounts and roles.')
  }
  return session
}

async function loadSubject(userId: string): Promise<AuthorizationSubject> {
  const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!account) throw new Error('Account not found.')
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
    .where(and(eq(staffRoles.userId, userId), isNull(staffRoles.revokedAt)))
  const roleMap = new Map<string, {
    key: string; isActive: boolean; isReserved: boolean; audience: typeof account.accountType; permissions: string[]
  }>()
  for (const row of roleRows) {
    let role = roleMap.get(row.key)
    if (!role) {
      role = { key: row.key, isActive: row.isActive, isReserved: row.isReserved, audience: row.audience, permissions: [] }
      roleMap.set(row.key, role)
    }
    if (row.permission && !role.permissions.includes(row.permission)) role.permissions.push(row.permission)
  }
  const overrides = await db.select({
    permission: permissions.key,
    effect: userPermissionOverrides.effect,
    expiresAt: userPermissionOverrides.expiresAt,
    revokedAt: userPermissionOverrides.revokedAt,
  }).from(userPermissionOverrides)
    .innerJoin(permissions, eq(userPermissionOverrides.permissionId, permissions.id))
    .where(eq(userPermissionOverrides.userId, userId))
  const suspensions = await db.select({
    suspendedAt: userSuspensions.suspendedAt,
    endsAt: userSuspensions.endsAt,
    liftedAt: userSuspensions.liftedAt,
  }).from(userSuspensions).where(eq(userSuspensions.userId, userId))
  return {
    userId: account.id,
    accountType: account.accountType,
    status: account.status,
    roles: [...roleMap.values()],
    overrides,
    suspensions,
  }
}

async function activeSuperAdminCount(now: Date) {
  const rows = await db.select({ userId: users.id, status: users.status })
    .from(staffRoles)
    .innerJoin(roles, eq(staffRoles.roleId, roles.id))
    .innerJoin(users, eq(staffRoles.userId, users.id))
    .where(and(eq(roles.key, 'super_administrator'), eq(roles.isActive, true), isNull(staffRoles.revokedAt)))
  const suspensions = await db.select({
    userId: userSuspensions.userId,
    suspendedAt: userSuspensions.suspendedAt,
    endsAt: userSuspensions.endsAt,
    liftedAt: userSuspensions.liftedAt,
  }).from(userSuspensions)
  return rows.filter((row) => row.status === 'active' &&
    !isSuspended(suspensions.filter((s) => s.userId === row.userId), now)).length
}

export const getAdminConsoleData = createServerFn({ method: 'GET' }).handler(async () => {
  await requireSuperAdmin()
  const [accountRows, roleRows, assignmentsRows, overrideRows, suspensionRows, rolePermissionRows] = await Promise.all([
    db.select({
      id: users.id, email: users.email, displayName: users.displayName, accountType: users.accountType,
      status: users.status, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
    }).from(users).orderBy(users.createdAt),
    db.select().from(roles).orderBy(roles.name),
    db.select({
      userId: staffRoles.userId, roleId: roles.id, roleKey: roles.key, roleName: roles.name,
      isReserved: roles.isReserved, revokedAt: staffRoles.revokedAt,
    }).from(staffRoles).innerJoin(roles, eq(staffRoles.roleId, roles.id)),
    db.select({
      id: userPermissionOverrides.id,
      userId: userPermissionOverrides.userId,
      permission: permissions.key,
      effect: userPermissionOverrides.effect,
      reason: userPermissionOverrides.reason,
      expiresAt: userPermissionOverrides.expiresAt,
      revokedAt: userPermissionOverrides.revokedAt,
    }).from(userPermissionOverrides)
      .innerJoin(permissions, eq(userPermissionOverrides.permissionId, permissions.id)),
    db.select({ userId: userSuspensions.userId, suspendedAt: userSuspensions.suspendedAt, endsAt: userSuspensions.endsAt, liftedAt: userSuspensions.liftedAt })
      .from(userSuspensions),
    db.select({ roleId: rolePermissions.roleId, key: permissions.key })
      .from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id)),
  ])
  return {
    users: accountRows,
    roles: roleRows,
    assignments: assignmentsRows,
    overrides: overrideRows,
    suspensions: suspensionRows,
    rolePermissions: rolePermissionRows,
    permissions: permissionCatalogue,
    templates: roleTemplates,
  }
})

const roleInput = z.object({ userId: z.string().uuid(), roleId: z.string().uuid() })

export const assignUserRole = createServerFn({ method: 'POST' })
  .validator((input: unknown) => roleInput.parse(input))
  .handler(async ({ data }) => {
    const actorSession = await requireSuperAdmin()
    const now = new Date()
    const [target, roleRow] = await Promise.all([
      loadSubject(data.userId),
      db.select().from(roles).where(eq(roles.id, data.roleId)).limit(1).then((rows) => rows[0]),
    ])
    if (!roleRow) throw new Error('Role not found.')
    const rolePermissionsRows = await db.select({ key: permissions.key })
      .from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleRow.id))
    const role: RoleRecord = {
      key: roleRow.key, isSystem: roleRow.isSystem, isReserved: roleRow.isReserved,
      isActive: roleRow.isActive, audience: roleRow.audience, permissions: rolePermissionsRows.map((p) => p.key),
    }
    const actor = await loadSubject(actorSession.user.id)
    const ctx = { now, activeSuperAdminCount: await activeSuperAdminCount(now) }
    assertGuard(checkAssignRole(actor, target, role, ctx))
    await db.insert(staffRoles).values({ userId: data.userId, roleId: data.roleId, assignedBy: actorSession.user.id }).onConflictDoNothing()
    await db.insert(permissionAuditLog).values({
      actorUserId: actorSession.user.id, affectedUserId: data.userId, action: 'assign_role',
      resource: 'staff_roles', recordId: data.roleId, newValue: { roleKey: roleRow.key },
    })
    await db.insert(auditEvents).values({
      actorUserId: actorSession.user.id, event: 'user.role_assigned', resource: 'user',
      resourceId: data.userId, details: { roleKey: roleRow.key },
    })
    return { success: true, note: 'Database-backed permissions are re-evaluated on each protected request.' }
  })

export const revokeUserRole = createServerFn({ method: 'POST' })
  .validator((input: unknown) => roleInput.parse(input))
  .handler(async ({ data }) => {
    const actorSession = await requireSuperAdmin()
    const now = new Date()
    const [target, roleRow] = await Promise.all([
      loadSubject(data.userId),
      db.select().from(roles).where(eq(roles.id, data.roleId)).limit(1).then((rows) => rows[0]),
    ])
    if (!roleRow) throw new Error('Role not found.')
    const rolePermissionsRows = await db.select({ key: permissions.key })
      .from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleRow.id))
    const role: RoleRecord = {
      key: roleRow.key, isSystem: roleRow.isSystem, isReserved: roleRow.isReserved,
      isActive: roleRow.isActive, audience: roleRow.audience, permissions: rolePermissionsRows.map((p) => p.key),
    }
    const actor = await loadSubject(actorSession.user.id)
    const ctx = { now, activeSuperAdminCount: await activeSuperAdminCount(now) }
    assertGuard(checkRevokeRole(actor, target, role, ctx))
    await db.update(staffRoles).set({ revokedAt: now })
      .where(and(eq(staffRoles.userId, data.userId), eq(staffRoles.roleId, data.roleId), isNull(staffRoles.revokedAt)))
    await db.insert(permissionAuditLog).values({
      actorUserId: actorSession.user.id, affectedUserId: data.userId, action: 'revoke_role',
      resource: 'staff_roles', recordId: data.roleId, previousValue: { roleKey: roleRow.key },
    })
    await db.insert(auditEvents).values({
      actorUserId: actorSession.user.id, event: 'user.role_revoked', resource: 'user',
      resourceId: data.userId, details: { roleKey: roleRow.key },
    })
    return { success: true, note: 'Database-backed permissions are re-evaluated on each protected request.' }
  })

const accountInput = z.object({ userId: z.string().uuid(), reason: z.string().trim().min(5).max(1000) })

export const suspendUserAccount = createServerFn({ method: 'POST' })
  .validator((input: unknown) => accountInput.parse(input))
  .handler(async ({ data }) => {
    const actorSession = await requireSuperAdmin()
    const now = new Date()
    const [actor, target] = await Promise.all([loadSubject(actorSession.user.id), loadSubject(data.userId)])
    const ctx = { now, activeSuperAdminCount: await activeSuperAdminCount(now) }
    assertGuard(checkSuspendUser(actor, target, ctx))
    await db.insert(userSuspensions).values({ userId: data.userId, reason: data.reason, suspendedBy: actorSession.user.id })
    await db.update(users).set({ status: 'disabled', updatedAt: now }).where(eq(users.id, data.userId))
    await db.insert(permissionAuditLog).values({
      actorUserId: actorSession.user.id, affectedUserId: data.userId, action: 'suspend_user',
      resource: 'users', recordId: data.userId, previousValue: { status: target.status }, newValue: { status: 'disabled' }, reason: data.reason,
    })
    await db.insert(auditEvents).values({
      actorUserId: actorSession.user.id, event: 'user.suspended', resource: 'user',
      resourceId: data.userId, details: { reason: data.reason },
    })
    return { success: true }
  })

export const reinstateUserAccount = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const actorSession = await requireSuperAdmin()
    const now = new Date()
    const [actor, target] = await Promise.all([loadSubject(actorSession.user.id), loadSubject(data.userId)])
    const [activeSuspension] = await db.select({ id: userSuspensions.id }).from(userSuspensions)
      .where(and(eq(userSuspensions.userId, data.userId), isNull(userSuspensions.liftedAt))).limit(1)
    if (!activeSuspension) throw new Error('This account has no active suspension to lift.')
    const ctx = { now, activeSuperAdminCount: await activeSuperAdminCount(now) }
    assertGuard(checkReinstateUser(actor, target, ctx))
    await db.update(userSuspensions).set({ liftedAt: now, liftedBy: actorSession.user.id })
      .where(and(eq(userSuspensions.userId, data.userId), isNull(userSuspensions.liftedAt)))
    await db.update(users).set({ status: 'active', updatedAt: now }).where(eq(users.id, data.userId))
    await db.insert(permissionAuditLog).values({
      actorUserId: actorSession.user.id, affectedUserId: data.userId, action: 'reinstate_user',
      resource: 'users', recordId: data.userId, previousValue: { status: target.status }, newValue: { status: 'active' },
    })
    await db.insert(auditEvents).values({
      actorUserId: actorSession.user.id, event: 'user.reinstated', resource: 'user',
      resourceId: data.userId, details: {},
    })
    return { success: true }
  })

const permissionOverrideInput = z.object({
  userId: z.string().uuid(),
  permission: z.string().min(3).max(128),
  effect: z.enum(['grant', 'deny']),
  reason: z.string().trim().min(5).max(500),
})

export const setUserPermissionOverride = createServerFn({ method: 'POST' })
  .validator((input: unknown) => permissionOverrideInput.parse(input))
  .handler(async ({ data }) => {
    const actorSession = await requireSuperAdmin()
    const [actor, target] = await Promise.all([
      loadSubject(actorSession.user.id),
      loadSubject(data.userId),
    ])
    const now = new Date()
    assertGuard(checkSetOverride(actor, target, { permission: data.permission, effect: data.effect }, {
      now,
      activeSuperAdminCount: await activeSuperAdminCount(now),
    }))
    const [permissionRow] = await db.select({ id: permissions.id })
      .from(permissions).where(eq(permissions.key, data.permission)).limit(1)
    if (!permissionRow) throw new Error('Permission not found.')

    await db.transaction(async (tx) => {
      const previous = await tx.select({
        id: userPermissionOverrides.id,
        effect: userPermissionOverrides.effect,
      }).from(userPermissionOverrides).where(and(
        eq(userPermissionOverrides.userId, data.userId),
        eq(userPermissionOverrides.permissionId, permissionRow.id),
        isNull(userPermissionOverrides.revokedAt),
      ))
      if (previous.length) {
        await tx.update(userPermissionOverrides).set({ revokedAt: now, updatedAt: now })
          .where(inArray(userPermissionOverrides.id, previous.map((row) => row.id)))
        for (const row of previous) {
          await tx.insert(permissionAuditLog).values({
            actorUserId: actorSession.user.id,
            affectedUserId: data.userId,
            action: 'revoke_permission_override',
            resource: 'user_permission_overrides',
            recordId: row.id,
            previousValue: { permission: data.permission, effect: row.effect },
            reason: 'Replaced by a newer permission override.',
          })
        }
      }
      const [created] = await tx.insert(userPermissionOverrides).values({
        userId: data.userId,
        permissionId: permissionRow.id,
        effect: data.effect,
        reason: data.reason,
        grantedBy: actorSession.user.id,
      }).returning({ id: userPermissionOverrides.id })
      await tx.insert(permissionAuditLog).values({
        actorUserId: actorSession.user.id,
        affectedUserId: data.userId,
        action: data.effect === 'grant' ? 'grant_permission_override' : 'deny_permission_override',
        resource: 'user_permission_overrides',
        recordId: created.id,
        newValue: { permission: data.permission, effect: data.effect },
        reason: data.reason,
      })
      await tx.insert(auditEvents).values({
        actorUserId: actorSession.user.id,
        event: 'user.permission_override_set',
        resource: 'user',
        resourceId: data.userId,
        details: { permission: data.permission, effect: data.effect },
      })
    })
    return { success: true }
  })

export const revokeUserPermissionOverride = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ overrideId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const actorSession = await requireSuperAdmin()
    const [override] = await db.select({
      id: userPermissionOverrides.id,
      userId: userPermissionOverrides.userId,
      permission: permissions.key,
      effect: userPermissionOverrides.effect,
      revokedAt: userPermissionOverrides.revokedAt,
    }).from(userPermissionOverrides)
      .innerJoin(permissions, eq(userPermissionOverrides.permissionId, permissions.id))
      .where(eq(userPermissionOverrides.id, data.overrideId)).limit(1)
    if (!override || override.revokedAt) throw new Error('Active permission override not found.')
    const [actor, target] = await Promise.all([
      loadSubject(actorSession.user.id),
      loadSubject(override.userId),
    ])
    const now = new Date()
    assertGuard(checkRevokeOverride(actor, target, {
      permission: override.permission,
      effect: override.effect,
    }, {
      now,
      activeSuperAdminCount: await activeSuperAdminCount(now),
    }))
    await db.transaction(async (tx) => {
      await tx.update(userPermissionOverrides).set({ revokedAt: now, updatedAt: now })
        .where(and(eq(userPermissionOverrides.id, override.id), isNull(userPermissionOverrides.revokedAt)))
      await tx.insert(permissionAuditLog).values({
        actorUserId: actorSession.user.id,
        affectedUserId: override.userId,
        action: 'revoke_permission_override',
        resource: 'user_permission_overrides',
        recordId: override.id,
        previousValue: { permission: override.permission, effect: override.effect },
      })
      await tx.insert(auditEvents).values({
        actorUserId: actorSession.user.id,
        event: 'user.permission_override_revoked',
        resource: 'user',
        resourceId: override.userId,
        details: { permission: override.permission, effect: override.effect },
      })
    })
    return { success: true }
  })

const customRoleInput = z.object({
  roleId: z.string().uuid().optional(),
  key: z.string().regex(/^[a-z][a-z0-9_]{2,48}$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).default(''),
  audience: z.enum(['office', 'customer', 'partner', 'service']),
  permissions: z.array(z.string()).max(200),
})

export const saveCustomRole = createServerFn({ method: 'POST' })
  .validator((input: unknown) => customRoleInput.parse(input))
  .handler(async ({ data }) => {
    const actorSession = await requireSuperAdmin()
    const actor = await loadSubject(actorSession.user.id)
    const existing = data.roleId
      ? await db.select().from(roles).where(eq(roles.id, data.roleId)).limit(1).then((rows) => rows[0] ?? null)
      : null
    if (data.roleId && !existing) throw new Error('Role not found.')
    const existingPermissions = existing
      ? await db.select({ key: permissions.key }).from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(eq(rolePermissions.roleId, existing.id))
      : []
    const proposed = { key: data.key, audience: data.audience, permissions: data.permissions }
    const existingRecord: RoleRecord | null = existing ? {
      key: existing.key, isSystem: existing.isSystem, isReserved: existing.isReserved,
      isActive: existing.isActive, audience: existing.audience,
      permissions: existingPermissions.map((permission) => permission.key),
    } : null
    const now = new Date()
    assertGuard(checkSaveCustomRole(actor, proposed, existingRecord, {
      now, activeSuperAdminCount: await activeSuperAdminCount(now),
    }))
    const permissionRows = await db.select({ id: permissions.id, key: permissions.key })
      .from(permissions).where(inArray(permissions.key, data.permissions))
    if (permissionRows.length !== new Set(data.permissions).size) {
      throw new Error('One or more selected permissions are not in the permission catalogue.')
    }
    const roleId = await db.transaction(async (tx) => {
      const saved = existing
        ? await tx.update(roles).set({
            key: data.key, name: data.name, description: data.description, updatedAt: now,
          }).where(eq(roles.id, existing.id)).returning({ id: roles.id })
        : await tx.insert(roles).values({
            key: data.key, name: data.name, description: data.description, audience: data.audience,
            isSystem: false, isReserved: false, isActive: true,
          }).returning({ id: roles.id })
      const id = saved[0].id
      if (existing) await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
      if (permissionRows.length) {
        await tx.insert(rolePermissions).values(permissionRows.map((permission) => ({
          roleId: id, permissionId: permission.id,
        })))
      }
      await tx.insert(permissionAuditLog).values({
        actorUserId: actorSession.user.id, action: existing ? 'edit_custom_role' : 'create_custom_role',
        resource: 'roles', recordId: id,
        previousValue: existing ? { key: existing.key, permissions: existingPermissions.map((p) => p.key) } : null,
        newValue: { key: data.key, audience: data.audience, permissions: data.permissions },
      })
      await tx.insert(auditEvents).values({
        actorUserId: actorSession.user.id, event: existing ? 'role.custom_role_updated' : 'role.custom_role_created',
        resource: 'role', resourceId: id, details: { key: data.key, audience: data.audience },
      })
      return id
    })
    return { success: true, roleId }
  })

export const setCustomRoleActive = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ roleId: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const actorSession = await requireSuperAdmin()
    const [roleRow] = await db.select().from(roles).where(eq(roles.id, data.roleId)).limit(1)
    if (!roleRow) throw new Error('Role not found.')
    const rolePermissionsRows = await db.select({ key: permissions.key })
      .from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleRow.id))
    const role: RoleRecord = {
      key: roleRow.key, isSystem: roleRow.isSystem, isReserved: roleRow.isReserved,
      isActive: roleRow.isActive, audience: roleRow.audience, permissions: rolePermissionsRows.map((p) => p.key),
    }
    const actor = await loadSubject(actorSession.user.id)
    const now = new Date()
    assertGuard(checkSetRoleActive(actor, role, data.active, {
      now, activeSuperAdminCount: await activeSuperAdminCount(now),
    }))
    await db.update(roles).set({ isActive: data.active, updatedAt: now }).where(eq(roles.id, roleRow.id))
    await db.insert(permissionAuditLog).values({
      actorUserId: actorSession.user.id, action: data.active ? 'activate_role' : 'deactivate_role',
      resource: 'roles', recordId: roleRow.id, previousValue: { isActive: roleRow.isActive }, newValue: { isActive: data.active },
    })
    await db.insert(auditEvents).values({
      actorUserId: actorSession.user.id, event: data.active ? 'role.activated' : 'role.deactivated',
      resource: 'role', resourceId: roleRow.id, details: { key: roleRow.key },
    })
    return { success: true }
  })
