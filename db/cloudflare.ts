import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from 'cloudflare:workers'
import * as schema from './schema'

type HyperdriveBinding = { connectionString: string }
type CloudflareEnv = { HYPERDRIVE?: HyperdriveBinding }

let database: ReturnType<typeof createDatabase> | undefined

function createDatabase() {
  const hyperdrive = (env as unknown as CloudflareEnv).HYPERDRIVE
  if (!hyperdrive?.connectionString) {
    throw new Error('Cloudflare Hyperdrive is not configured. Bind HYPERDRIVE to the existing Oxford PostgreSQL database before enabling authenticated workflows.')
  }

  // Hyperdrive owns the upstream connection pool. Keep a small client pool in
  // the Worker isolate and use prepared statements for Hyperdrive compatibility.
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
  database ??= createDatabase()
  return database
}

/**
 * Resolve the Cloudflare database only when a server function actually queries
 * it. Public pages can render without a configured database, while all data
 * access fails closed until Hyperdrive is connected.
 */
export const db = new Proxy({} as ReturnType<typeof createDatabase>, {
  get(_target, property) {
    const current = getDatabase()
    const value = Reflect.get(current, property, current)
    return typeof value === 'function' ? value.bind(current) : value
  },
})
