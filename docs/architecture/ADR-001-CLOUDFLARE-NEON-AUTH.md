# ADR-001: Adopt Cloudflare-native application, authentication and Neon database

- **Status:** Accepted
- **Decision date:** 25 November 2026
- **Decision authority:** Oxford Business Group project owner
- **Scope:** Oxford Finance Hub V3 only

## Context

The V3 baseline originally specified Netlify Identity and Netlify Database as authoritative services. The project owner has now explicitly approved replacing both with Cloudflare-native authentication and Neon PostgreSQL while retaining Cloudflare as the application hosting platform.

## Decision

1. Cloudflare Workers is the target application hosting and server runtime.
2. Oxford Finance Hub V3 will own its authentication lifecycle: password hashing, email verification, password recovery, session creation/revocation, account status and login protections. Session cookies must remain secure, HttpOnly, SameSite and host-scoped.
3. Neon PostgreSQL is the authoritative V3 relational database for accounts, roles, permissions, applications, partners, audit events and workflow data.
4. Supabase Storage remains the private document-storage service. Buckets must remain private; access is mediated by authenticated, authorised server-side operations and short-lived signed access where appropriate.
5. Brevo remains the transactional email provider. Email delivery must remain explicitly gated and environment/recipient constrained.
6. Netlify remains available as a rollback/reference environment during migration. Netlify Identity and Netlify Database are not the target V3 authorities after this decision. Existing Netlify configuration and dependencies must not be removed until their rollback and compatibility implications have been reviewed.
7. Cloudflare Preview and its isolated Neon preview branch are the development and acceptance environment until release gates pass.

## Security and migration constraints

- Do not expose secrets, credentials, session tokens, applicant data or document contents in source control, logs or client bundles.
- Enforce server-side role and permission checks, partner data isolation, audit logging and least privilege.
- Keep document uploads and external notifications disabled unless explicitly enabled for the isolated preview acceptance test.
- Do not use production data in Preview. Any eventual production data migration requires a documented mapping, integrity checks, rollback plan and a separate production change approval.
- Do not merge the draft pull request, bind the production custom domain, change production DNS/secrets/database, or activate real customer processing under this architecture approval alone.
- Keep Netlify rollback viable until Cloudflare production acceptance and a separate cutover approval are complete.

## Consequences

The application must be validated end-to-end against Cloudflare Workers, Neon PostgreSQL, Supabase private storage and Brevo. The previous Netlify-specific documentation, environment assumptions, migrations and adapters must be classified as rollback-only, migration tooling or obsolete; they must not be deleted indiscriminately. The release checklist must be updated to reflect this accepted architecture.
