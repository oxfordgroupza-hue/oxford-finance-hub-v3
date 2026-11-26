# Security baseline

## Runtime and identity
- Cloudflare Workers is the only application hosting runtime.
- Oxford-owned authentication is authoritative for customer, partner and staff accounts.
- Passwords use a salted, versioned password-hashing scheme; raw passwords and bearer tokens must never be stored or logged.
- Session tokens and one-time verification/recovery tokens are stored as hashes and have bounded lifetimes.
- Mutations require same-origin/CSRF protections and server-side authorization.
- Customer, partner and staff permissions are enforced on the server; client-side route hiding is not an authorization control.

## Data protection
- Neon PostgreSQL is authoritative for relational records.
- Hyperdrive connections are scoped to the current Worker request.
- Applicant identity data is encrypted by application-level controls.
- Supabase document storage must remain private. Access is server-mediated, ownership-checked and time-limited.
- Do not expose signed URLs, personal information, identity documents or secrets in logs or public responses.

## Fail-closed production controls
- `OXFORD_APPLICATIONS_ENABLED=false`
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`
- `OXFORD_NOTIFICATION_DELIVERY_ENABLED=false`

Keep these controls disabled until end-to-end security and operational acceptance is complete. Email delivery is configured but not accepted as operational.

## Operational requirements
- Maintain separate Preview and Production secrets.
- Review every schema migration before execution.
- Verify backups and restore procedures.
- Preserve append-only audit history for privileged actions.
- Do not grant Super Administrator access without verified identity, one-time bootstrap conditions and an audit record.
- Qualified legal/compliance review is still required for POPIA, FICA and NCA obligations.
