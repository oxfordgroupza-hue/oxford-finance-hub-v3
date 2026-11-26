# Oxford Finance Hub V3 — Cloudflare-native authentication

Status: Implemented in the active development source; end-to-end release acceptance remains incomplete.

## Current architecture

- Cloudflare Worker server functions own registration, login, logout, session validation, email verification, password recovery and invitation acceptance.
- Neon PostgreSQL stores Oxford users, credentials, opaque sessions, one-time verification/recovery challenges, roles, permissions, suspensions and audit history.
- Passwords are stored only as PBKDF2-HMAC-SHA-256 hashes with per-account salts and versioned parameters.
- Session and challenge tokens are high-entropy opaque values. Only their hashes are stored in Neon.
- Sessions use a Secure, HttpOnly, SameSite=Lax, host-scoped cookie with server-side expiry and revocation.
- Supabase Storage remains private document storage only. It is not the identity or relational database authority.
- Brevo remains the transactional email provider, subject to explicit environment and recipient gates.

## Security requirements

1. Keep password verification, token generation, token hashing, account state and session operations server-side.
2. Use generic public login/recovery responses to reduce account enumeration.
3. Consume verification/recovery challenges transactionally and reject expired, wrong-purpose, revoked or replayed tokens.
4. Enforce same-origin/CSRF protections on every mutation. Never rely on client-side route guards.
5. Revoke sessions on logout, password reset, account suspension and relevant privilege changes.
6. Block suspended, disabled, unverified and unprovisioned accounts from protected server functions.
7. Keep initial Super Administrator bootstrap one-time, explicitly gated and tied to the verified designated account. Never bypass ownership verification or assignment-history checks.
8. Enforce every role and permission on the server. Partner access is limited to the partner own-referral scope; partners never receive applicant private-document access.
9. Do not expose passwords, tokens, applicant PII or secret values in logs, browser bundles, fixtures or documentation.
10. Keep applications, uploads, outbound notifications, settlements and payouts fail-closed until independent release gates pass.

## Required regression and acceptance tests

- Registration, duplicate-email handling and no account takeover through email collision.
- Password hashing, generic invalid-credential responses and no plaintext password/token persistence.
- Verification/recovery token expiry, single-use, wrong-purpose and replay rejection.
- Session expiry, rotation, revocation, logout and cookie attributes.
- Origin/CSRF rejection, account suspension and disabled-account enforcement.
- Seven-role direct-route and direct-server-function authorization matrix.
- Customer ownership, partner referral isolation, reviewer assignment and support-role restrictions.
- One-time Super Administrator bootstrap cannot run without verified email or if assignment history exists.
- Cloudflare Worker build, Wrangler type generation, TypeScript, full Vitest suite, ESLint and formatting checks.

## Release controls

Develop on a dedicated V3 feature/recovery branch. Validate against the isolated Cloudflare Preview and Neon Preview branch. Do not alter production Worker configuration, production database, secrets, DNS, customer data or feature flags without the separate production release approval. Do not use real applicant information or documents in Preview.
