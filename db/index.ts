import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

/** Node-only database adapter for local maintenance scripts. Worker requests use db/cloudflare.ts. */
const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required for local database utilities.')

const client = postgres(connectionString, { max: 1, prepare: false })
export const db = drizzle({ client, schema })
export type Database = typeof db
