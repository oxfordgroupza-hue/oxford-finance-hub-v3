# Data fetching and mutations

Use TanStack Start server functions for privileged reads and writes. Keep database access on the server and route it through the Cloudflare Hyperdrive-backed database module.

- Validate mutation input with a schema before processing.
- Derive the authenticated user and permissions on the server; never trust client-supplied identity or role fields.
- Apply row ownership and tenant scope in the database query itself.
- Use transactions for multi-record operations and append-only audit events for privileged changes.
- Invalidate affected route data after successful mutations.
- Keep public pages independent of database availability where possible.
- Do not expose private application or document data in loader responses unless the authenticated user is authorized to receive it.
