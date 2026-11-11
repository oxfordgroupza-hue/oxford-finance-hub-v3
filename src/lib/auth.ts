import { createServerFn } from '@tanstack/react-start'
import { isIdentityEmailConfirmed } from './identity-verification'

/**
 * Resolve the current Netlify Identity session against the authoritative database.
 * The explicitly configured bootstrap identity may claim the reserved Super
 * Administrator role only in the approved V3 Deploy Preview after email verification
 * and a confirmed Identity email. Production bootstrap is disabled.
 */
export const getAuthorizationSnapshot = createServerFn({ method: 'GET' }).handler(async () => {
  const [
    { getUser },
    { and, eq, isNull },
    { db },
    schema,
    { canBootstrapInitialSuperAdmin, evaluateEffectivePermissions, isSuspended, permissionCatalogue, roleTemplates, SUPER_ADMIN_ROLE_KEY },
    { isApprovedV3DeployPreview },
  ] = await Promise.all([
    import('@netlify/identity'),
    import('drizzle-orm'),
    import('../../db/index'),
    import('../../db/schema'),
    import('./access-control'),
    import('./netlify-preview'),
  ])

  const {
    permissions,
    auditEvents,
    permissionAuditLog,
    rolePermissions,
    roles,
    staffRoles,
    userPermissionOverrides,
    userSuspensions,
    users,
  } = schema

  let identityUser: Awaited<ReturnType<typeof getUser>>
  try {
    identityUser = await getUser()
  } catch {
    return { authenticated: false as const, identityUnavailable: true as const }
  }

  if (!identityUser) return { authenticated: false as const }

  // Do not provision an account or grant workspace access until Identity confirms the email.
  if (!isIdentityEmailConfirmed(identityUser)) {
    return {
      authenticated: true as const,
      provisioned: false as const,
      email: identityUser.email?.trim().toLowerCase() || null,
      emailVerificationRequired: true as const,
    }
  }

  const email = identityUser.email?.trim().toLowerCase() ?? ''
  const bootstrapEmail = process.env.OXFORD_INITIAL_SUPER_ADMIN_EMAIL
  // Always repair the permission catalogue on an authenticated session. Identity
  // event hooks are best-effort; login must not depend on a signup/login hook having
  // completed successfully.
  await db.insert(permissions).values(permissionCatalogue.map((p) => ({
    key: p.key,
    resource: p.resource,
    action: p.action,
    scope: p.scope,
    label: p.label,
    accountTypes: [...p.accountTypes],
  }))).onConflictDoNothing()

  for (const template of roleTemplates) {
    await db.insert(roles).values({
      key: template.key,
      name: template.name,
      description: template.description,
      audience: template.audience,
      isSystem: true,
      isReserved: template.reserved,
      isActive: true,
    }).onConflictDoNothing()
  }

  // The reserved Super Administrator role is a security invariant. Repair stale
  // metadata left by earlier previews instead of trusting an old row's flags.
  const superAdminTemplate = roleTemplates.find((template) => template.key === SUPER_ADMIN_ROLE_KEY)
  if (superAdminTemplate) {
    await db.update(roles).set({
      name: superAdminTemplate.name,
      description: superAdminTemplate.description,
      audience: superAdminTemplate.audience,
      isSystem: true,
      isReserved: true,
      isActive: true,
    }).where(eq(roles.key, SUPER_ADMIN_ROLE_KEY))
  }

  const systemRoles = await db.select({ id: roles.id, key: roles.key })
    .from(roles).where(eq(roles.isSystem, true))
  const permissionRows = await db.select({ id: permissions.id, key: permissions.key }).from(permissions)
  const roleIds = new Map(systemRoles.map((r) => [r.key, r.id]))
  const permissionIds = new Map(permissionRows.map((p) => [p.key, p.id]))
  const catalogueAssignments = roleTemplates.filter((t) => !t.reserved).flatMap((t) =>
    t.permissions.map((key) => {
      const roleId = roleIds.get(t.key)
      const permissionId = permissionIds.get(key)
      if (!roleId || !permissionId) throw new Error(`Access-control catalogue incomplete: ${t.key} / ${key}`)
      return { roleId, permissionId }
    }),
  )
  if (catalogueAssignments.length) {
    await db.insert(rolePermissions).values(catalogueAssignments).onConflictDoNothing()
  }

  let [account] = await db.select().from(users)
    .where(eq(users.identityId, identityUser.id)).limit(1)

  // Self-heal customer and partner provisioning from the authenticated Identity
  // session. This covers missed Identity webhooks and legacy accounts. Email
  // conflicts are deliberately not auto-linked to avoid account takeover.
  if (!account && email) {
    await db.insert(users).values({
      identityId: identityUser.id,
      email,
      accountType: 'customer',
      status: 'active',
    }).onConflictDoNothing()

    ;[account] = await db.select().from(users)
      .where(eq(users.identityId, identityUser.id)).limit(1)
  }

  if (!account) {
    throw new Error('Your Identity email is already associated with a different Oxford account, or provisioning could not complete. Oxford must securely reconcile the account; automatic linking is disabled.')
  }

  const authorizationTime = new Date()
  const suspensions = await db.select({
    suspendedAt: userSuspensions.suspendedAt,
    endsAt: userSuspensions.endsAt,
    liftedAt: userSuspensions.liftedAt,
  }).from(userSuspensions).where(eq(userSuspensions.userId, account.id))

  // Bootstrap is strictly one-time: any previous Super Administrator assignment,
  // including a revoked one, closes the bootstrap path permanently. Disabled and
  // currently suspended accounts are never reactivated by logging in.
  const [superRole] = await db.select({ id: roles.id })
    .from(roles).where(eq(roles.key, SUPER_ADMIN_ROLE_KEY)).limit(1)
  if (!superRole) throw new Error('Reserved Super Administrator role is missing from the access-control catalogue.')
  const [superAdminAssignmentHistory] = await db.select({ id: staffRoles.id })
    .from(staffRoles)
    .where(and(
      eq(staffRoles.userId, account.id),
      eq(staffRoles.roleId, superRole.id),
    )).limit(1)

  const mayBootstrap = canBootstrapInitialSuperAdmin({
    email,
    bootstrapEmail,
    isDeployPreview: isApprovedV3DeployPreview(process.env.CONTEXT, process.env.DEPLOY_PRIME_URL),
    emailConfirmed: isIdentityEmailConfirmed(identityUser),
    accountStatus: account.status,
    hasSuperAdminAssignmentHistory: Boolean(superAdminAssignmentHistory),
    isSuspended: isSuspended(suspensions, authorizationTime),
  })

  if (mayBootstrap) {
    const needsPromotion = account.accountType !== 'office' || account.status !== 'active' || !superAdminAssignmentHistory
    await db.update(users).set({ accountType: 'office', status: 'active', email })
      .where(eq(users.id, account.id))
    await db.insert(staffRoles).values({ userId: account.id, roleId: superRole.id }).onConflictDoNothing()
    if (needsPromotion) {
      await db.insert(permissionAuditLog).values({
        actorUserId: null,
        affectedUserId: account.id,
        action: 'bootstrap_super_admin',
        resource: 'users',
        recordId: account.id,
        newValue: { roleKey: SUPER_ADMIN_ROLE_KEY },
        reason: 'One-time bootstrap of the designated administrator before any prior Super Administrator assignment.',
      })
      await db.insert(auditEvents).values({
        actorUserId: null,
        event: 'user.super_admin_bootstrapped',
        resource: 'user',
        resourceId: account.id,
        details: { roleKey: SUPER_ADMIN_ROLE_KEY, actor: 'system', reason: 'One-time initial Super Administrator bootstrap.' },
      })
    }
      ;[account] = await db.select().from(users).where(eq(users.id, account.id)).limit(1)
  }

  // Ensure every non-bootstrap account has its least-privilege baseline role,
  // even when the Identity webhook was missed. This never grants office access
  // to a customer or partner account.
  const baselineRoleKey = account.accountType === 'customer'
    ? 'customer'
    : account.accountType === 'partner'
      ? 'partner'
      : null

  if (baselineRoleKey) {
    const [baselineRole] = await db.select({ id: roles.id })
      .from(roles).where(eq(roles.key, baselineRoleKey)).limit(1)
    if (baselineRole) {
      await db.insert(staffRoles).values({ userId: account.id, roleId: baselineRole.id }).onConflictDoNothing()
    }
  }

  const assignments = await db.select({
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

  for (const row of assignments) {
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
    .where(eq(userPermissionOverrides.userId, account.id))

  const effective = evaluateEffectivePermissions({
    userId: account.id,
    accountType: account.accountType,
    status: account.status,
    roles: [...roleMap.values()],
    overrides,
    suspensions,
  }, authorizationTime)

  return {
    authenticated: true as const,
    provisioned: true as const,
    user: {
      id: account.id,
      email: identityUser.email ?? account.email,
      displayName: account.displayName,
      accountType: account.accountType,
      status: account.status,
    },
    permissions: [...effective.permissions],
    isSuperAdmin: effective.isSuperAdmin,
    blocked: effective.blocked,
  }
})
