# ADR-001: Cloudflare Workers, Neon and Oxford-owned authentication

Status: Accepted.

## Decision
Run the Oxford Finance Hub application on Cloudflare Workers. Use Neon PostgreSQL as the authoritative relational database, accessed through Cloudflare Hyperdrive. Use Oxford-owned authentication and authorization in the application. Store applicant documents in a private Supabase Storage bucket. Use Brevo for transactional email.

## Consequences
- Worker request handlers use the request-scoped Cloudflare database adapter.
- Local Node utilities use an explicitly configured PostgreSQL connection string.
- Authentication, session management, email verification, password recovery, role permissions and audit history remain under Oxford application control.
- Preview and Production are isolated environments.
- SQL migrations are stored in `db/migrations/` and retain their original timestamps and order.
- Sensitive features remain disabled until their release gates pass.

## Security invariants
No automatic email-based account linking, no public document bucket, no customer access to another customer's records, no partner access beyond their own portfolio, and no production feature activation without explicit approval.
