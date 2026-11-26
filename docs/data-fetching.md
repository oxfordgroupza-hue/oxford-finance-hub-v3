# Data fetching and server functions

Use TanStack Start server functions for database reads and mutations. Validate every input with a schema, enforce authorization inside the server function, and return only the fields required by the caller.

Worker request handlers use the request-scoped database adapter in `db/cloudflare.ts`. Browser code must never import a database driver or receive privileged credentials. The Vite Cloudflare database boundary maps browser-side server-function imports to the fail-closed client stub.

For mutations:
1. Validate input and request origin.
2. Resolve the authenticated session.
3. Check role, permission, account scope and suspension state.
4. Apply the database transaction.
5. Write the required audit event.
6. Return a minimal result and invalidate affected route data.

Local Node utilities may use `db/index.ts`, which requires an explicitly configured `DATABASE_URL`. Never use it inside a Worker request handler.
