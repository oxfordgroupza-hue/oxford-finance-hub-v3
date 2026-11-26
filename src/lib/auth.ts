import { getServerEnv } from './server-runtime-env'
import { createServerFn } from '@tanstack/react-start'
import { getCookies, getRequest, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import { verifyPassword, hashPassword, createOpaqueToken, hashOpaqueToken } from './cloudflare-auth-crypto'
import { isApprovedCloudflarePreviewRequest, isApprovedCloudflareProductionRequest } from './document-storage-security'

function verifyRequestOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) throw new Error('This request could not be verified. Refresh the page and try again.')
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new Error('Cross-site requests are not permitted.')
}

/**
 * Authenticate against Oxford credentials and establish a Cloudflare-native session.
 */
export const loginWithPassword = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ email: z.string().trim().email().max(254), password: z.string().min(12).max(1024) }).parse(input))
  .handler(async ({ data }) => {
    verifyRequestOrigin(getRequest())
    const [{ db }, { and, eq, gt, isNull, sql }, schema] = await Promise.all([import('../../db/index'), import('drizzle-orm'), import('../../db/schema')])
    const email = data.email.trim().toLowerCase()
    const [record] = await db.select({ userId: schema.users.id, status: schema.users.status, emailVerifiedAt: schema.users.emailVerifiedAt,
      passwordHash: schema.authCredentials.passwordHash, passwordSalt: schema.authCredentials.passwordSalt,
      passwordAlgorithm: schema.authCredentials.passwordAlgorithm, passwordIterations: schema.authCredentials.passwordIterations,
      failedAttempts: schema.authCredentials.failedAttempts, lockedUntil: schema.authCredentials.lockedUntil,
    }).from(schema.users).innerJoin(schema.authCredentials, eq(schema.authCredentials.userId, schema.users.id)).where(eq(schema.users.email, email)).limit(1)
    const failure = 'Sign-in could not be completed. Check your details or use account recovery.'
    if (!record) throw new Error(failure)
    const now = new Date()
    if (record.lockedUntil && record.lockedUntil > now) throw new Error(failure)
    const valid = await verifyPassword(data.password, { algorithm: record.passwordAlgorithm, iterations: record.passwordIterations, salt: record.passwordSalt, hash: record.passwordHash })
    if (!valid) {
      await db.update(schema.authCredentials).set({
        failedAttempts: sql`${schema.authCredentials.failedAttempts} + 1`,
        lockedUntil: sql`CASE WHEN ${schema.authCredentials.failedAttempts} + 1 >= 8 THEN ${new Date(now.getTime()+15*60*1000)} ELSE NULL END`,
        updatedAt: now,
      }).where(eq(schema.authCredentials.userId, record.userId))
      throw new Error(failure)
    }
    if (record.status !== 'active' || !record.emailVerifiedAt) throw new Error('Your Oxford account is not yet active and email-verified. Use secure account activation or recovery.')
    await db.update(schema.authCredentials).set({ failedAttempts: 0, lockedUntil: null, updatedAt: now }).where(eq(schema.authCredentials.userId, record.userId))
    await db.update(schema.authSessions).set({ revokedAt: now }).where(and(eq(schema.authSessions.userId, record.userId), isNull(schema.authSessions.revokedAt), gt(schema.authSessions.expiresAt, now)))
    const token=createOpaqueToken()
    await db.insert(schema.authSessions).values({ userId: record.userId, tokenHash: await hashOpaqueToken(token), expiresAt: new Date(now.getTime()+12*60*60*1000), lastSeenAt: now })
    setCookie('__Host-oxford_session',token,{path:'/',secure:true,httpOnly:true,sameSite:'lax',maxAge:12*60*60})
    await db.update(schema.users).set({lastLoginAt:now,updatedAt:now}).where(eq(schema.users.id,record.userId))
    return {authenticated:true as const}
  })

export const logoutOxfordSession = createServerFn({ method: 'POST' }).handler(async () => {
  verifyRequestOrigin(getRequest())
  const token=getCookies()['__Host-oxford_session']
  if(token){const [{db},{and,eq,isNull},schema]=await Promise.all([import('../../db/index'),import('drizzle-orm'),import('../../db/schema')]);await db.update(schema.authSessions).set({revokedAt:new Date()}).where(and(eq(schema.authSessions.tokenHash,await hashOpaqueToken(token)),isNull(schema.authSessions.revokedAt)))}
  setCookie('__Host-oxford_session','',{path:'/',secure:true,httpOnly:true,sameSite:'lax',maxAge:0})
  return {authenticated:false as const}
})


/** Create a customer account without linking or modifying any existing Oxford account. */
export const registerCustomer = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ email: z.string().trim().email().max(254), fullName: z.string().trim().min(2).max(120), password: z.string().min(12).max(1024) }).parse(input))
  .handler(async ({ data }) => {
    const request=getRequest();verifyRequestOrigin(request)
    const {assertOxfordAuthEmailConfigured,assertOxfordAuthEmailRecipientAllowed,sendOxfordAuthEmail}=await import('./cloudflare-auth-email');assertOxfordAuthEmailConfigured()
    const email=data.email.trim().toLowerCase()
    assertOxfordAuthEmailRecipientAllowed(email)
    const [{db},{users,authCredentials,authChallenges}]=await Promise.all([import('../../db/index'),import('../../db/schema')])
    const credentials=await hashPassword(data.password)
    const token=createOpaqueToken();const now=new Date()
    const account=await db.transaction(async (tx) => {
      const [created]=await tx.insert(users).values({email,displayName:data.fullName.trim(),accountType:'customer',status:'invited'}).onConflictDoNothing().returning({id:users.id})
      if(!created)return null
      await tx.insert(authCredentials).values({userId:created.id,passwordHash:credentials.hash,passwordSalt:credentials.salt,passwordAlgorithm:credentials.algorithm,passwordIterations:credentials.iterations})
      await tx.insert(authChallenges).values({userId:created.id,purpose:'email_verification',tokenHash:await hashOpaqueToken(token),expiresAt:new Date(now.getTime()+30*60*1000)})
      return created
    })
    if(!account)return {accepted:true as const}
    const verificationUrl=new URL('/login',request.url);verificationUrl.searchParams.set('verify',token)
    await sendOxfordAuthEmail({to:email,name:data.fullName.trim(),url:verificationUrl.toString(),purpose:'verification'})
    return {accepted:true as const}
  })

/** Request recovery using a generic response to avoid disclosing registered addresses. */
export const requestPasswordRecovery = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ email: z.string().trim().email().max(254) }).parse(input))
  .handler(async ({ data }) => {
    const request=getRequest();verifyRequestOrigin(request)
    const {assertOxfordAuthEmailConfigured,assertOxfordAuthEmailRecipientAllowed,sendOxfordAuthEmail}=await import('./cloudflare-auth-email')
    assertOxfordAuthEmailConfigured()
    const email=data.email.trim().toLowerCase()
    assertOxfordAuthEmailRecipientAllowed(email)
    const [{db},{and,eq,isNull},{users,authChallenges}]=await Promise.all([import('../../db/index'),import('drizzle-orm'),import('../../db/schema')])
    const [account]=await db.select({id:users.id,email:users.email,displayName:users.displayName,status:users.status,accountType:users.accountType}).from(users).where(eq(users.email,email)).limit(1)
    if(account&&(account.status==='active'||(account.status==='invited'&&account.accountType==='customer'))){
      const purpose=account.status==='active'?'password_recovery':'email_verification'
      const token=createOpaqueToken();const now=new Date()
      await db.transaction(async (tx) => {
        await tx.update(authChallenges).set({consumedAt:now}).where(and(eq(authChallenges.userId,account.id),eq(authChallenges.purpose,purpose),isNull(authChallenges.consumedAt)))
        await tx.insert(authChallenges).values({userId:account.id,purpose,tokenHash:await hashOpaqueToken(token),expiresAt:new Date(now.getTime()+30*60*1000)})
      })
      const actionUrl=new URL('/login',request.url)
      if(purpose==='password_recovery'){actionUrl.searchParams.set('reset','1');actionUrl.searchParams.set('token',token)}
      else actionUrl.searchParams.set('verify',token)
      await sendOxfordAuthEmail({to:account.email,name:account.displayName||'Oxford Finance Hub user',url:actionUrl.toString(),purpose:purpose==='password_recovery'?'recovery':'verification'})
    }
    return {accepted:true as const}
  })

/** Consume a one-time recovery challenge and replace credentials without changing account roles. */
export const completePasswordRecovery = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ token:z.string().min(32).max(128),password:z.string().min(12).max(1024) }).parse(input))
  .handler(async ({data})=>{
    const request=getRequest();verifyRequestOrigin(request)
    const [{db},{and,eq,gt,isNull},{users,authChallenges,authCredentials,authSessions}]=await Promise.all([import('../../db/index'),import('drizzle-orm'),import('../../db/schema')])
    const now=new Date();const credentials=await hashPassword(data.password)
    await db.transaction(async (tx) => {
      const [challenge] = await tx.update(authChallenges).set({ consumedAt: now }).where(and(
        eq(authChallenges.tokenHash, await hashOpaqueToken(data.token)),
        eq(authChallenges.purpose, 'password_recovery'),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
      )).returning({ userId: authChallenges.userId })
      if (!challenge) throw new Error('This recovery link is invalid or has expired. Request a new one.')
      await tx.insert(authCredentials).values({
        userId: challenge.userId, passwordHash: credentials.hash, passwordSalt: credentials.salt,
        passwordAlgorithm: credentials.algorithm, passwordIterations: credentials.iterations,
        passwordChangedAt: now, failedAttempts: 0, lockedUntil: null,
      }).onConflictDoUpdate({ target: authCredentials.userId, set: {
        passwordHash: credentials.hash, passwordSalt: credentials.salt, passwordAlgorithm: credentials.algorithm,
        passwordIterations: credentials.iterations, passwordChangedAt: now, failedAttempts: 0,
        lockedUntil: null, updatedAt: now,
      } })
      await tx.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, challenge.userId))
      await tx.update(authSessions).set({ revokedAt: now }).where(and(
        eq(authSessions.userId, challenge.userId), isNull(authSessions.revokedAt),
      ))
    })
    return {updated:true as const}
  })

/** Verify a new customer's email using a short-lived, single-use challenge. */
export const verifyCustomerEmail = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({ token:z.string().min(32).max(128) }).parse(input))
  .handler(async ({data})=>{
    const request=getRequest();verifyRequestOrigin(request)
    const [{db},{and,eq,gt,isNull},{users,authChallenges}]=await Promise.all([import('../../db/index'),import('drizzle-orm'),import('../../db/schema')])
    const now=new Date()
    await db.transaction(async (tx) => {
      const [challenge] = await tx.update(authChallenges).set({ consumedAt: now }).where(and(
        eq(authChallenges.tokenHash, await hashOpaqueToken(data.token)),
        eq(authChallenges.purpose, 'email_verification'),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
      )).returning({ userId: authChallenges.userId })
      if (!challenge) throw new Error('This verification link is invalid or has expired.')
      const [activated] = await tx.update(users).set({ emailVerifiedAt: now, status: 'active', updatedAt: now }).where(and(
        eq(users.id, challenge.userId), eq(users.accountType, 'customer'), eq(users.status, 'invited'),
      )).returning({ id: users.id })
      if (!activated) throw new Error('This customer account cannot be activated with the supplied verification link.')
    })
    return {verified:true as const}
  })

export const getAuthorizationSnapshot = createServerFn({ method: 'GET' }).handler(async () => {
  const [
    { and, eq, gt, isNull, ne },
    { db },
    schema,
    { canBootstrapInitialSuperAdmin, evaluateEffectivePermissions, isSuspended, permissionCatalogue, roleTemplates, SUPER_ADMIN_ROLE_KEY },
  ] = await Promise.all([
    import('drizzle-orm'),
    import('../../db/index'),
    import('../../db/schema'),
    import('./access-control'),
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

  const token=getCookies()['__Host-oxford_session']
  if(!token)return {authenticated:false as const}
  const [activeSession]=await db.select({userId:users.id,email:users.email,emailVerifiedAt:users.emailVerifiedAt})
    .from(schema.authSessions).innerJoin(users,eq(schema.authSessions.userId,users.id))
    .where(and(eq(schema.authSessions.tokenHash,await hashOpaqueToken(token)),isNull(schema.authSessions.revokedAt),gt(schema.authSessions.expiresAt,new Date()))).limit(1)
  if(!activeSession)return {authenticated:false as const}
  if(!activeSession.emailVerifiedAt)return {authenticated:true as const,provisioned:false as const,email:activeSession.email,emailVerificationRequired:true as const}
  const sessionUser={id:activeSession.userId,email:activeSession.email,confirmed_at:activeSession.emailVerifiedAt.toISOString()}

  const email = sessionUser.email?.trim().toLowerCase() ?? ''
  const bootstrapEmail = getServerEnv('OXFORD_INITIAL_SUPER_ADMIN_EMAIL')
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
    .where(eq(users.id, sessionUser.id)).limit(1)

  // Sessions resolve only to an existing Oxford user row; no email-based account linking.

  if (!account) {
    throw new Error('The Oxford account record for this session could not be found. Access is denied; automatic account linking is disabled.')
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

  const [activeSuperAdminAssignment] = await db.select({ userId: staffRoles.userId })
    .from(staffRoles)
    .where(and(
      eq(staffRoles.roleId, superRole.id),
      isNull(staffRoles.revokedAt),
      ne(staffRoles.userId, account.id),
    ))
    .limit(1)
  const mayBootstrap = canBootstrapInitialSuperAdmin({
    bootstrapEnabled: getServerEnv('OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED') === 'true',
    email,
    bootstrapEmail,
    isDeployPreview: isApprovedCloudflarePreviewRequest(getRequest().url),
    isProduction: getServerEnv('CONTEXT') === 'cloudflare-production' &&
      isApprovedCloudflareProductionRequest(getRequest().url),
    hasActiveSuperAdminElsewhere: Boolean(activeSuperAdminAssignment),
    emailConfirmed: Boolean(account.emailVerifiedAt),
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
      email: sessionUser.email ?? account.email,
      displayName: account.displayName,
      accountType: account.accountType,
      status: account.status,
    },
    permissions: [...effective.permissions],
    isSuperAdmin: effective.isSuperAdmin,
    blocked: effective.blocked,
  }
})
