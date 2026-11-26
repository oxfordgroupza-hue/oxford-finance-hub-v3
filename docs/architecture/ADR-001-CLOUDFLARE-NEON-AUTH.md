# ADR-001: Cloudflare-native application, authentication and Neon database

- Status: Accepted and current
- Decision date: 25 November 2026; reaffirmed 26 November 2026
- Decision authority: Oxford Business Group project owner
- Scope: Oxford Finance Hub V3 only

## Decision

1. Cloudflare Workers is the sole application hosting and server runtime.
2. Oxford Finance Hub owns its authentication lifecycle: password hashing, email verification, password recovery, secure sessions, account status and login protections.
3. Neon PostgreSQL via Cloudflare Hyperdrive is the authoritative relational database for accounts, credentials, roles, permissions, applications, partners, referrals, audit events and workflow data.
4. Supabase Storage is used only for private customer/application documents. Buckets remain private and all access is mediated by authenticated, authorised server-side operations.
5. Brevo is the transactional email provider. Email delivery remains explicitly gated and environment/recipient constrained.
6. The repository must not contain legacy hosting adapters, identity SDKs, database drivers, deployment configuration or preview guards. Cloudflare is the only supported deployment path.
7. Cloudflare Preview and its isolated Neon branch are the development and acceptance environment. Production resources remain protected by separate release gates.

## Security and migration constraints

- Do not expose secrets, credentials, session tokens, applicant data or document contents in source control, logs or client bundles.
- Enforce server-side role and permission checks, partner data isolation, audit logging and least privilege.
- Keep document uploads, outbound notifications, settlements and payouts disabled until their specified tests and approvals are complete.
- Do not use production data in Preview. Production schema/data changes require a documented mapping, integrity checks, rollback plan and separate approval.
- Preserve the Cloudflare production custom domain and current fail-closed application/upload settings during repository cleanup.
- Never auto-approve or decline finance, infer a lender decision, grant permissions or execute payouts using AI.

## Consequences

The application is validated against Cloudflare Workers, Neon PostgreSQL, Supabase private storage and Brevo. SQL migration history is maintained in the repository-owned drizzle/migrations directory. The Cloudflare build is the sole supported application build path. Any attempt to add another hosting or identity provider requires a new explicit architecture decision.
