# ADR-001: Cloudflare runtime, Oxford authentication and Neon data

**Status:** Accepted

## Context

The platform requires a serverless runtime, Oxford-controlled identity and access management, a relational source of truth, private document storage and transactional communications. The architecture must support isolated Preview and Production environments without coupling authentication or database access to the hosting provider.

## Decision

1. Cloudflare Workers is the sole application runtime.
2. Oxford-owned authentication controls registration, password hashing, email verification, recovery, sessions and account lifecycle.
3. Neon PostgreSQL is the authoritative relational database, accessed through Cloudflare Hyperdrive.
4. Supabase Storage is used only for private document objects.
5. Brevo is used for transactional email after delivery acceptance.
6. Server-side RBAC and ownership checks protect all privileged operations.
7. Production applications, uploads, notifications, settlements and payouts remain fail-closed until independent acceptance.

## Consequences

- Runtime database connections are scoped to the current Worker request.
- Schema migrations are maintained in `db/migrations/` and reviewed before execution.
- Preview and Production use separate databases, secrets and feature flags.
- Existing account recovery requires verified account ownership; credentials must never be copied or disclosed.
- A build or deployment does not constitute workflow or compliance acceptance.
