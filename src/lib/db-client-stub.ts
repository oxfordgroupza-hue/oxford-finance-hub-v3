/**
 * Browser-side guard for the server-only Cloudflare database adapter.
 * Server functions execute against the real Cloudflare database adapter on the server.
 */
export const db = new Proxy(Object.create(null) as Record<string, unknown>, {
  get() {
    throw new Error(
      "Database access is server-only and cannot run in the browser.",
    );
  },
});
