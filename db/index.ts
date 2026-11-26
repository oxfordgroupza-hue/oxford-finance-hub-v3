import { db } from './cloudflare'

/** Cloudflare Hyperdrive-backed database, scoped to the current Worker request. */
export { db }
export type Database = typeof db
