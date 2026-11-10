import { and, eq } from 'drizzle-orm'
import { isIdentityEmailConfirmed } from '../../src/lib/identity-verification'
import { db } from '../../db/index'
import {
  permissionAuditLog,
  permissions,
  rolePermissions,
  roles,
  staffRoles,
  users,
  userSuspensions,
} from '../../db/schema'
import { canBootstrapInitialSuperAdmin, isSuspended, permissionCatalogue, roleTemplates, SUPER_ADMIN_ROLE_KEY } from '../../src/lib/access-control'

interface IdentityUserEvent {
  user: {
    id: string
    email?: string
    confirmedAt?: string | Date | null
    emailConfirmedAt?: string | Date | null
    confirmed_at?: string | null
    email_confirmed_at?: string | null
    userMetadata?: Record<string, unknown>
  }
}

async function ensureAccessControlCatalogue() {
  await db.insert(permissions).values(permissionCatalogue.map((permission) => ({
    key: permission.key,
    resource: permission.resource,
    action: permission.action,
    scope: permission.scope,
    label: permission.label,
    accountTypes: [...permission.accountTypes],
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

  const systemRoles = await db.select({ id: roles.id, key: roles.key })
    .from(roles)
    .where(eq(roles.isSystem, true))
  const permissionRows = await db.select({ id: permissions.id, key: permissions.key }).from(permissions)
  const roleIds = new Map(systemRoles.map((role) => [role.key, role.id]))
  const permissionIds = new Map(permissionRows.map((permission) => [permission.key, permission.id]))

  const assignments = roleTemplates
    .filter((template) => !template.reserved)
    .flatMap((template) => template.permissions.map((permissionKey) => {
      const roleId = roleIds.get(template.key)
      const permissionId = permissionIds.get(permissionKey)
      if (!roleId || !permissionId) throw new Error(`Access-control catalogue incomplete: ${template.key} / ${permissionKey}`)
      return { roleId, permissionId }
    }))

  if (assignments.length) {
    await db.insert(rolePermissions).values(assignments).onConflictDoNothing()
  }
}

async function assignBaselineRole(userId: string, roleKey: string) {
  const [role] = await db.select({ id: roles.id })
    .from(roles)
    .where(eq(roles.key, roleKey))
    .limit(1)
  if (!role) return
  await db.insert(staffRoles).values({ userId, roleId: role.id }).onConflictDoNothing()
}

/**
 * One-time bootstrap of the explicitly designated administrator on Deploy
 * Previews only. Never reactivate a disabled/suspended account or restore a
 * Super Administrator assignment that has previously been revoked.
 */
async function bootstrapInitialAdministrator(userId: string, email: string, emailConfirmed: boolean) {
  const configuredEmail = process.env.OXFORD_INITIAL_SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  // Defence in depth: never run the bootstrap on production, even if the
  // Netlify variable was accidentally given an all-context scope.
  const deployPrimeUrl = process.env.DEPLOY_PRIME_URL ?? ''
  const isDeployPreview = process.env.CONTEXT === 'deploy-preview'
    || /^https:\/\/deploy-preview-\d+--/i.test(deployPrimeUrl)
  if (!isDeployPreview || !configuredEmail || email !== configuredEmail) return false

  const [account] = await db.select({ status: users.status })
    .from(users).where(eq(users.id, userId)).limit(1)
  if (!account) return false

  const [role] = await db.select({ id: roles.id })
    .from(roles)
    .where(eq(roles.key, SUPER_ADMIN_ROLE_KEY))
    .limit(1)
  if (!role) throw new Error('Reserved Super Administrator role is missing from the access-control catalogue.')

  const [assignmentHistory] = await db.select({ id: staffRoles.id })
    .from(staffRoles)
    .where(and(eq(staffRoles.userId, userId), eq(staffRoles.roleId, role.id)))
    .limit(1)

  const suspensions = await db.select({
    suspendedAt: userSuspensions.suspendedAt,
    endsAt: userSuspensions.endsAt,
    liftedAt: userSuspensions.liftedAt,
  }).from(userSuspensions).where(eq(userSuspensions.userId, userId))
  const mayBootstrap = canBootstrapInitialSuperAdmin({
    email,
    bootstrapEmail: configuredEmail,
    isDeployPreview,
    productionBootstrapEnabled: false,
    emailConfirmed,
    accountStatus: account.status,
    hasSuperAdminAssignmentHistory: Boolean(assignmentHistory),
    isSuspended: isSuspended(suspensions, new Date()),
  })
  if (!mayBootstrap) return false

  await db.update(users).set({ accountType: 'office', status: 'active' }).where(eq(users.id, userId))
  await db.insert(staffRoles).values({ userId, roleId: role.id }).onConflictDoNothing()
  await db.insert(permissionAuditLog).values({
    actorUserId: null,
    affectedUserId: userId,
    action: 'bootstrap_super_admin',
    resource: 'users',
    recordId: userId,
    newValue: { roleKey: SUPER_ADMIN_ROLE_KEY },
    reason: 'One-time bootstrap of the designated administrator before any prior Super Administrator assignment.',
  })
  return true
}

function baselineRoleFor(accountType: string) {
  // Customer and partner accounts receive least-privilege self-service roles.
  // Office access must always be explicitly assigned by an administrator.
  if (accountType === 'customer' || accountType === 'partner') return accountType
  return null
}

/**
 * Public signups are customers by default. Office roles are granted only by
 * explicit administrative assignment or the one-time initial-admin bootstrap.
 */
export default {
  async userSignup(event: IdentityUserEvent) {
    const identityId = event.user.id
    const email = event.user.email?.trim().toLowerCase()
    if (!identityId || !email) return

    await ensureAccessControlCatalogue()

    const fullName = typeof event.user.userMetadata?.full_name === 'string'
      ? event.user.userMetadata.full_name.trim()
      : null

    await db.insert(users).values({
      identityId,
      email,
      displayName: fullName || null,
      accountType: 'customer',
      status: 'active',
    }).onConflictDoNothing()

    const [account] = await db
      .select({ id: users.id, accountType: users.accountType })
      .from(users)
      .where(eq(users.identityId, identityId))
      .limit(1)

    if (!account) return

    // Never grant office privileges during signup: Netlify may emit this hook
    // before the user has completed the required email-confirmation step.
    const roleKey = baselineRoleFor(account.accountType)
    if (roleKey) await assignBaselineRole(account.id, roleKey)
  },

  async userLogin(event: IdentityUserEvent) {
    const identityId = event.user.id
    const email = event.user.email?.trim().toLowerCase()
    if (!identityId) return

    await ensureAccessControlCatalogue()

    const fullName = typeof event.user.userMetadata?.full_name === 'string'
      ? event.user.userMetadata.full_name.trim()
      : undefined

    await db.update(users).set({
      ...(email ? { email } : {}),
      ...(fullName ? { displayName: fullName } : {}),
      lastLoginAt: new Date(),
    }).where(eq(users.identityId, identityId))

    if (!email) return
    const [account] = await db
      .select({ id: users.id, accountType: users.accountType })
      .from(users)
      .where(eq(users.identityId, identityId))
      .limit(1)
    if (!account) return

    if (await bootstrapInitialAdministrator(account.id, email, isIdentityEmailConfirmed(event.user))) return

    const roleKey = baselineRoleFor(account.accountType)
    if (roleKey) await assignBaselineRole(account.id, roleKey)
  },
}
