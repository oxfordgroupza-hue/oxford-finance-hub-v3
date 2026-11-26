import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

/**
 * Non-Worker fallback used by type analysis and browser-based tests.
 * The Cloudflare Vite resolver replaces server imports with db/cloudflare.ts
 * in the actual Worker build. Any accidental database access outside that
 * runtime fails closed.
 */
export const db = new Proxy({} as Database, {
  get() {
    throw new Error("Database access requires the Cloudflare Worker runtime.");
  },
});
