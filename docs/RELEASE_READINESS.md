# Oxford Finance Hub V3 — release readiness report

**Assessment date:** 25 November 2026  
**Repository:** `oxfordgroupza-hue/oxford-finance-hub-v3`  
**Active branch:** `work/v3-cloudflare-native-auth`  
**Latest source commit:** `fc6d21ce54897901f5cb0305005151623edc2f10`  
**PR:** [#9 — Cloudflare-native authentication and private document API preview](https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3/pull/9)  
**Release verdict:** **NOT READY for public recruitment or real applicant submissions.**

This report distinguishes source implementation, automated test evidence, provider configuration and real end-to-end acceptance. A feature being present in the repository is not proof that the workflow is operational.

## 1. Approved architecture

- **Cloudflare Workers:** hosting and server-side application runtime.
- **Oxford-owned Cloudflare authentication:** registration, password hashing, verification, recovery, sessions and account lifecycle.
- **Neon PostgreSQL:** authoritative database for identities, roles, permissions, applications, referrals, audit events and workflow data.
- **Supabase Storage:** private application document objects only.
- **Brevo:** transactional email.
- **Netlify:** retained rollback/reference environment during migration; not the V3 identity or database authority.

The intended public destination is `finance.oxfordbusinessgroup.co.za`. Production Worker settings, production database, DNS, secrets and domain attachment have not been changed.

## 2. Current code and build state

The latest branch source includes:
- Cloudflare-native authentication and 12-hour secure HttpOnly sessions.
- PBKDF2-HMAC-SHA-256 password hashing and hashed one-time challenge/session tokens.
- Email verification, password recovery, logout, account suspension and one-time Super Administrator bootstrap logic.
- Seven role templates and a 90-key permission catalogue.
- Individual and Business finance application flows across Vehicle, Equipment, Commercial Asset and Other.
- Office intake, partner referral, customer ownership, fee calculation, credit-assessment and settlement modules.
- Neon-authoritative data and server-mediated private Supabase document API.
- Origin and cross-site request validation.
- Pre-parse multipart stream size enforcement, including requests without a Content-Length header.

**Build evidence:**
- Last completed full build before the bounded-stream parser: Cloudflare build `b89bab04-9fec-4121-b1f0-860eb171b9df`, commit `4e46a48da1460f61e090fcbcae4db9624d47f4eb`, outcome success.
- Latest source commit `fc6d21ce54897901f5cb0305005151623edc2f10` has Cloudflare build `4a544f8b-3ffd-43b0-b8f1-4ba316f1f1eb`; outcome is pending at the time this report was prepared.
- Do not treat the latest stream-parser changes as accepted until this exact build completes Vite, Wrangler type generation, TypeScript, the full Vitest suite and ESLint.

## 3. Provider and database verification

### Neon Preview
- Project: `odd-field-47093538`.
- Isolated non-primary Preview branch: `br-autumn-rain-bgtzmfh8`.
- Database: `oxford_finance_hub`.
- Seven roles, 90 permissions, 148 role-permission assignments and four finance products are present.
- Latest read-only inspection found zero users, customers, applications, partner registrations, documents and audit events.
- No migration-history table was found in the Neon Preview database. SQL migration files remain in the legacy `netlify/database/migrations` path. A verified migration baseline and repeatable Neon migration procedure are outstanding.

### Supabase
- Bucket `oxford-customer-documents` exists and is private (`public=false`).
- Provider limit is 10 MiB; accepted types are PDF, JPEG and PNG.
- Object count is zero.
- Application code has a stricter 4 MiB limit and a 20-document-per-application limit.
- Five legacy Supabase relational tables are RLS-enabled with no policies and contain zero rows. Neon is authoritative; broad client policies were not added.
- No real or dummy applicant documents have been uploaded.

### Backups
- No explicit Neon snapshot schedule was returned for either the Preview branch or the project default branch.
- No Neon snapshots were listed.
- The existing no-compute Preview checkpoint branch is not an independent backup.
- Backup, restore and recovery-point verification remain release blockers.

## 4. Preview feature gates

| Capability | Preview state | Meaning |
|---|---|---|
| Public pages | Built | Public routes can be inspected |
| Application wizard | Enabled on approved Preview host | Synthetic test information only |
| Real/live applications | Disabled | Do not submit real applicant information |
| Document uploads | Disabled | No real or dummy file upload acceptance yet |
| Transactional email | Enabled with recipient restriction | Approved Oxford-owned Preview mailbox only; no email has been sent |
| Super Admin bootstrap | Enabled on Preview | No account exists; bootstrap requires the account owner to register, verify email and sign in |
| Payments, settlements and payouts | Fail-closed | No execution or transfer is enabled |
| Production domain and data | Unchanged | No production cutover has occurred |

## 5. What is not yet accepted

1. **First Super Administrator:** no user exists. The account owner must create their own password through the Preview registration flow, verify the approved mailbox and sign in. The one-time bootstrap is designed to grant the reserved Super Administrator role after that verified sign-in. Do not create or disclose a random administrator password.
2. **Authentication lifecycle:** registration, email verification, login, recovery, password change, session expiry/rotation/revocation, logout, lockout and suspension have not passed end-to-end tests.
3. **Staff recruitment:** invitation, activation, role assignment, expiry, revocation and resend need end-to-end testing. Preview email restrictions permit only the approved test mailbox; real staff invitations require separately configured and accepted Production email.
4. **Authorization:** the seven-role direct-route and direct-server-function matrix is not complete. Customer ownership, partner own-referral scope, reviewer assignment and support restrictions need synthetic acceptance tests.
5. **Applications:** all eight Individual/Business × four finance-category paths need synthetic end-to-end tests, including drafts, submissions, consents, PDF pack generation, status history and notifications.
6. **Office and partner workflows:** assisted intake, applicant claim, referral attribution, merchant linking and customer ownership need acceptance tests.
7. **Documents:** upload/download, file signature and MIME checks, 4 MiB and 20-file limits, checksums/idempotency, customer/partner isolation, signed URL expiry, retries, interrupted-upload recovery, orphan cleanup and audit events remain untested. Keep uploads disabled.
8. **Email:** verification, recovery, staff invitation, queue/provider failures and retry behavior need tests to the approved Preview mailbox. No customer/partner communications or WhatsApp tests are authorised.
9. **Credit assessment:** keep as a human review aid. No automated approval/decline, bureau result or lender decision may be inferred.
10. **Commercial workflows:** final business approval is required for fee/VAT/settlement rules, reconciliation, adjustments and partner net visibility. Payout execution stays disabled.
11. **Operational resilience:** Neon migration history, backup/restore, recovery runbook, monitoring/alerting and incident response need verification.
12. **Quality:** changed-files-only formatting, visual image verification, accessibility/responsive review and final security review remain outstanding.
13. **Legal:** qualified review of POPIA, FICA, NCA, privacy notices, retention, complaints and the actual business operating model remains required. Code does not establish legal compliance.

## 6. Recruitment and launch decision

**Do not yet use this Preview as the live recruitment or applicant portal.** It is a controlled test environment and must contain synthetic information only.

The first owner-controlled action after the latest build passes is to register the approved Oxford test mailbox, choose a private password in the form, verify the email and sign in so the Preview-only one-time Super Administrator bootstrap can complete. The account owner must do this personally; passwords and verification tokens must not be shared in chat.

After that, the remaining synthetic acceptance matrix and operational gates must pass before a production release is considered. Production release requires a separate approval for the Worker, production secrets, Neon migration/data, Supabase storage, Brevo delivery, DNS and `finance.oxfordbusinessgroup.co.za`.

## 7. Safeguards

- Synthetic identities and applications only in Preview.
- No real applicant identity, banking, financial or personal data in Preview.
- No real applicant documents, customer/partner email or WhatsApp.
- No payment, settlement transfer or payout execution.
- Do not merge PR #9 or change production resources without separate explicit approval.
- Do not claim POPIA, FICA or NCA compliance without qualified professional review.
