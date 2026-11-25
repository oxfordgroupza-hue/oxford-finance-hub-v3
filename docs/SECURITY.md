# Security and privacy baseline

**Status:** engineering controls are implemented in source and partially covered by automated tests. Full end-to-end acceptance and qualified legal review remain outstanding.

## Authoritative boundaries

- Authentication: Oxford-owned Cloudflare-native authentication.
- Relational data and authorization records: Neon PostgreSQL.
- File bytes: private Supabase Storage only.
- Application runtime: Cloudflare Workers.
- Transactional email: Brevo, server-side and recipient-gated.
- Netlify remains a rollback/reference environment during migration.

## Authentication and sessions

- PBKDF2-HMAC-SHA-256 password hashing, 310,000 iterations and unique salts.
- Opaque session and challenge tokens are stored as hashes.
- Secure HttpOnly `__Host-oxford_session` cookie with bounded 12-hour session lifetime.
- Server-side session expiry/revocation and account status checks.
- Origin validation on state-changing document API requests.
- Login lockout fields and account suspension controls.
- Never log passwords, raw tokens, secret values or full provider error bodies.

The cryptographic helpers and origin-validation tests pass. Worker runtime PBKDF2 benchmarking and the full signup/verification/recovery/login/logout lifecycle still need acceptance.

## Authorization and isolation

- Every sensitive server function must derive permissions from the authenticated Neon account.
- Account-type ceilings prevent customer/partner accounts from acquiring Office permissions.
- Suspended/disabled accounts are blocked.
- Customer ownership, partner referral scope, Office assignment and effective permissions are enforced server-side.
- Super Administrator permissions derive from the Office permission catalogue; bootstrap is restricted to the designated verified Preview mailbox and Preview context.
- Audit sensitive permission, application, document and settlement operations without storing PII or secrets in audit payloads.

All seven role templates and the permission evaluator have unit coverage. The complete seven-role route/server-function matrix is not yet accepted.

## Document security

- Supabase bucket `oxford-customer-documents` is private.
- Direct client access is denied by the bucket's storage-object policy.
- Server validates ownership/assignment, document key, declared MIME, file signature, size and document count.
- Application upload route cap: 4 MiB. Per-application maximum: 20 documents.
- Downloads require server authorization and short-lived signed access.
- No public or permanent document URLs.

Runtime bucket verification passed. Uploads remain disabled until upload/download, isolation, expiry, retry and recovery tests pass.

## Data protection and compliance

Use synthetic Preview data only. Minimise applicant data, keep private documents out of ordinary email/WhatsApp, and define retention, deletion, export and recovery procedures before real data is accumulated.

This document describes engineering controls. It is not a POPIA, FICA, NCA or other legal certification. Qualified professional review is required before production use.
