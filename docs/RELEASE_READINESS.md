# Oxford Finance Hub V3 — release readiness

**Checked:** 26 November 2026  
**Production URL:** https://finance.oxfordbusinessgroup.co.za  
**Production Worker:** `oxford-finance-hub-v3-production`  
**Release commit:** `dd11597871109dd76af0cd7d30550cb410c6b783`  
**Latest confirmed deployment version:** `161b444b-08ac-4155-9ec0-784f76e5df00`  
**Release state:** Public application deployed; real application intake and document uploads remain disabled.

## Approved architecture

- Cloudflare Workers for hosting and server-side runtime.
- Oxford-owned authentication and role-based access control.
- Neon PostgreSQL as the authoritative relational database through Cloudflare Hyperdrive.
- Supabase Storage for private document objects only.
- Brevo for transactional email.
- Git-tracked SQL migrations under `db/migrations/`.

## Confirmed production state

The latest Cloudflare deployment completed successfully and the current Worker deployment reports 100% traffic on the confirmed version. The deployed Worker bindings were checked after release.

| Control | Production value |
|---|---|
| Application intake | Disabled |
| Document uploads | Disabled |
| Notification delivery | Disabled |
| Email delivery | Enabled, but end-to-end delivery is not accepted |
| Initial Super Administrator bootstrap | Enabled, but still subject to verified-email and one-time server-side checks |
| Private document bucket | Configured; no customer objects confirmed |
| Database | Existing production database retained; no migrations or customer records changed during this release |

No customer records, applications, passwords, role assignments, documents, or production database migrations were changed during the release. No email or WhatsApp messages were sent.

## Implemented in source

- Cloudflare-native authentication with password hashing, verification, recovery, logout and server-managed sessions.
- Role and permission catalogue with seven role templates.
- Individual and Business application journeys across Vehicle, Equipment, Commercial Asset and Other categories.
- Partner referrals, office workflows, application history and credit-assessment support.
- Neon-authoritative data access through request-scoped Hyperdrive connections.
- Server-mediated private storage API and file validation.
- Origin checks, access controls and fail-closed production feature gates.

## Remaining release blockers

1. The designated Super Administrator account is not verified and has no active Super Administrator assignment. Do not treat the account as active.
2. Authentication lifecycle and staff invitation workflows still need controlled end-to-end acceptance.
3. The seven-role direct-route and server-function authorization matrix is not fully accepted.
4. Individual and Business application workflows require synthetic acceptance testing before any future live enablement.
5. Private document upload/download, isolation, expiry, retry and recovery tests remain incomplete. Keep uploads disabled.
6. Transactional email delivery needs a verified end-to-end test. No live messages have been sent.
7. Neon migration history, repeatable migration execution, backups and restore testing need verification.
8. Credit assessment remains a human review aid. No automated approval, decline, bureau result or lender decision may be inferred.
9. POPIA, FICA, NCA, privacy, retention and complaints processes require qualified legal/compliance review.
10. Production applications, document uploads, notifications, settlements and payouts must remain fail-closed until separate acceptance and authorization.

## Migration catalogue

All 28 SQL migration files are stored under `db/migrations/`. Their original filenames and contents are preserved. Moving the files is a repository path correction only; it does not apply any migration to a database.

## Release rule

A successful build or deployment is not proof that customer workflows are operational. Do not enable production intake, document storage, notifications, settlements or payouts based solely on code presence or build success.
