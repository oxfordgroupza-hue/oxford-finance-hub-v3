import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { supportRequests } from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'

export const getMySupportRequests = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      (session.user.accountType !== 'customer' && session.user.accountType !== 'partner')) {
    throw new Error('An active customer or partner account is required to view support requests.')
  }
  if (!session.permissions.includes('own_support.view')) return []

  return db.select({
    id: supportRequests.id,
    channel: supportRequests.channel,
    status: supportRequests.status,
    subject: supportRequests.subject,
    createdAt: supportRequests.createdAt,
    updatedAt: supportRequests.updatedAt,
  }).from(supportRequests)
    .where(eq(supportRequests.userId, session.user.id))
    .orderBy(desc(supportRequests.createdAt))
    .limit(50)
})
