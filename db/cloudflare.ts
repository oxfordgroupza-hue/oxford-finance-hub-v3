import { getRequest } from '@tanstack/react-start/server'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from 'cloudflare:workers'
import * as schema from './schema'

type HyperdriveBinding = { connectionString: string }
type CloudflareEnv = { HYPERDRIVE?: HyperdriveBinding }
type CloudflareDatabase = ReturnType<typeof createDatabase>

// A database client is scoped to the current request. Cloudflare Workers may
// reuse an isolate for later requests, but sockets created by an earlier
// request cannot safely be reused in a new request's I/O context.
const databases = new WeakMap<Request, CloudflareDatabase>()

function createDatabase() {
  const hyperdrive = (env as unknown as CloudflareEnv).HYPERDRIVE
  if (!hyperdrive?.connectionString) {
    throw new Error('Cloudflare Hyperdrive is not configured. Bind HYPERDRIVE to the existing Oxford PostgreSQL database before enabling authenticated workflows.')
  }

  // Hyperdrive owns the upstream connection pool. Create a small client pool
  // for this request and retain prepared statements for Hyperdrive caching.
  const client = postgres(hyperdrive.connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    fetch_types: false,
    prepare: true,
  })

  return drizzle({ client, schema })
}

function getDatabase() {
  const request = getRequest()
  let database = databases.get(request)
  if (!database) {
    database = createDatabase()
    databases.set(request, database)
  }
  return database
}

/**
 * Resolve the Cloudflare database only when a server function actually queries
 * it. Public pages can render without a configured database, while all data
 * access fails closed until Hyperdrive is connected. The client is cached only
 * for this request, never globally across Worker invocations.
 */
export const db = new Proxy({} as CloudflareDatabase, {
  get(_target, property) {
    const current = getDatabase()
    const value = Reflect.get(current, property, current)
    return typeof value === 'function' ? value.bind(current) : value
  },
})
