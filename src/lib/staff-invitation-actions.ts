import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { auditEvents, authChallenges, authCredentials, roles, staffRoles, users } from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import { createOpaqueToken, hashOpaqueToken, hashPassword } from './cloudflare-auth-crypto'
import {
  assertOxfordAuthEmailConfigured,
  assertOxfordAuthEmailRecipientAllowed,
  sendOxfordAuthEmail,
} from './cloudflare-auth-email'

async function requireSuperAdmin() {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
    throw new Error('Only the authenticated Super Administrator can invite staff accounts.')
  }
  return session
}

function verifyOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || new URL(origin).origin !== new URL(request.url).origin ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new Error('This request could not be verified. Refresh the page and try again.')
  }
}

/** Return only active, non-reserved office roles that may be assigned to invited staff. */
export const getStaffInvitationRoles = createServerFn({ method: 'GET' }).handler(async () => {
  await requireSuperAdmin()
  return db.select({
    id: roles.id,
    key: roles.key,
    name: roles.name,
    description: roles.description,
  }).from(roles).where(and(
    eq(roles.audience, 'office'),
    eq(roles.isActive, true),
    eq(roles.isReserved, false),
  )).orderBy(roles.name)
})

/** Create a pending office account, assign its least-privilege role and send a one-time activation link. */
export const createStaffInvitation = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({
    email: z.string().trim().email().max(254),
    fullName: z.string().trim().min(2).max(120),
    roleId: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data }) => {
    const actor = await requireSuperAdmin()
    const request = getRequest()
    verifyOrigin(request)
    assertOxfordAuthEmailConfigured()

    const email = data.email.trim().toLowerCase()
    assertOxfordAuthEmailRecipientAllowed(email)
    const [role] = await db.select().from(roles).where(eq(roles.id, data.roleId)).limit(1)
    if (!role || role.audience !== 'office' || !role.isActive || role.isReserved || role.key === 'super_administrator') {
      throw new Error('Choose an active, non-reserved office role. Super Administrator access cannot be granted by invitation.')
    }

    const token = createOpaqueToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000)
    const [created] = await db.transaction(async (tx) => {
      const [account] = await tx.insert(users).values({
        email,
        displayName: data.fullName.trim(),
        accountType: 'office',
        status: 'invited',
      }).onConflictDoNothing().returning({ id: users.id })
      if (!account) throw new Error('An Oxford account already exists for this email address. Use account administration instead of creating a duplicate.')

      await tx.insert(staffRoles).values({
        userId: account.id,
        roleId: role.id,
        assignedBy: actor.user.id,
      })
      await tx.insert(authChallenges).values({
        userId: account.id,
        purpose: 'account_invitation',
        tokenHash: await hashOpaqueToken(token),
        expiresAt,
      })
      await tx.insert(auditEvents).values({
        actorUserId: actor.user.id,
        event: 'staff.invitation_created',
        resource: 'user',
        resourceId: account.id,
        details: { roleKey: role.key, recipientDomain: email.split('@')[1] ?? '', expiresAt: expiresAt.toISOString() },
      })
      return [account]
    })

    const invitationUrl = new URL('/staff-invitation', request.url)
    invitationUrl.searchParams.set('token', token)
    try {
      await sendOxfordAuthEmail({
        to: email,
        name: data.fullName.trim(),
        url: invitationUrl.toString(),
        purpose: 'staff_invitation',
      })
    } catch (error) {
      // Never leave a usable staff invitation behind when its delivery failed.
      await db.delete(users).where(eq(users.id, created.id))
      throw error
    }

    return { accepted: true as const, role: role.name, expiresAt: expiresAt.toISOString() }
  })

/** Consume a staff invitation exactly once and activate the invited office account. */
export const acceptStaffInvitation = createServerFn({ method: 'POST' })
  .validator((input: unknown) => z.object({
    token: z.string().min(32).max(128),
    password: z.string().min(12).max(1024),
  }).parse(input))
  .handler(async ({ data }) => {
    const request = getRequest()
    verifyOrigin(request)
    const credentials = await hashPassword(data.password)
    const now = new Date()

    await db.transaction(async (tx) => {
      const [challenge] = await tx.update(authChallenges).set({ consumedAt: now }).where(and(
        eq(authChallenges.tokenHash, await hashOpaqueToken(data.token)),
        eq(authChallenges.purpose, 'account_invitation'),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
      )).returning({ userId: authChallenges.userId })
      if (!challenge) throw new Error('This staff invitation is invalid, expired or has already been used.')

      const [account] = await tx.select({
        id: users.id,
        accountType: users.accountType,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
      }).from(users).where(eq(users.id, challenge.userId)).limit(1)
      if (!account || account.accountType !== 'office' || account.status !== 'invited' || account.emailVerifiedAt) {
        throw new Error('This invitation is not valid for an activatable staff account.')
      }

      const [assignment] = await tx.select({ id: staffRoles.id, roleActive: roles.isActive })
        .from(staffRoles).innerJoin(roles, eq(staffRoles.roleId, roles.id))
        .where(and(eq(staffRoles.userId, account.id), isNull(staffRoles.revokedAt), eq(roles.audience, 'office')))
        .limit(1)
      if (!assignment?.roleActive) throw new Error('The assigned staff role is no longer active. Contact the Oxford administrator.')

      await tx.insert(authCredentials).values({
        userId: account.id,
        passwordHash: credentials.hash,
        passwordSalt: credentials.salt,
        passwordAlgorithm: credentials.algorithm,
        passwordIterations: credentials.iterations,
        passwordChangedAt: now,
      })
      await tx.update(users).set({
        emailVerifiedAt: now,
        status: 'active',
        updatedAt: now,
      }).where(eq(users.id, account.id))
      await tx.insert(auditEvents).values({
        actorUserId: account.id,
        event: 'staff.invitation_accepted',
        resource: 'user',
        resourceId: account.id,
        details: { activatedAt: now.toISOString() },
      })
    })

    return { activated: true as const }
  })
