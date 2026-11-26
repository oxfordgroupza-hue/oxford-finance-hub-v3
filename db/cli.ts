import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required for one-off database maintenance scripts.')
}

const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 5,
  connect_timeout: 10,
  fetch_types: false,
  prepare: false,
})

export const db = drizzle({ client, schema })

export async function closeDb() {
  await client.end({ timeout: 5 })
}
