import { drizzle } from 'drizzle-orm/netlify-db'
import * as schema from './schema'

/**
 * Netlify Database selects the correct database branch for the current deploy
 * context. Do not instantiate this module in browser code.
 */
export const db = drizzle({ schema })
export type Database = typeof db
