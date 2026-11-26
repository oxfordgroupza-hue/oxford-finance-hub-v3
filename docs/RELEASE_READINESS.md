> **Follow-up audit - 26 November 2026:** This entry supersedes the earlier Preview and backup observations below.
>
> - **Preview deployment:** Worker `oxford-finance-hub-v3-preview` is deployed at version `2c5e77fe-f734-4e25-b076-29cb90240246` (100% traffic). Canonical test URL: `https://oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/apply`. Its health endpoint reports storage configured and verified, encryption configured, document uploads enabled, and applications enabled. The older branch-preview alias `work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev` is stale and reports application and upload availability as false; use the canonical URL above.
> - **Production unchanged:** Worker `oxford-finance-hub-v3-production` remains at version `566723ac-df9a-42bd-8aab-dc77274de93c` (100% traffic). Its health endpoint still reports storage configured and verified, encryption configured, document uploads enabled, and applications enabled. No production deployment or setting was changed.
> - **Isolated Preview storage:** Preview now uses private bucket `oxford-preview-documents` with a 4 MiB file limit and only PDF/JPEG/PNG types. Production continues to use separate private bucket `oxford-customer-documents` with a 10 MiB limit. Supabase has policy `oxford_private_bucket_deny_client_access` for `anon` and `authenticated` roles across all object operations. Both buckets had zero objects at the end of the test.
> - **Preview authorization smoke test:** Unauthenticated requests to `create-application`, `upload-document`, and `upload-draft-document` each returned HTTP 401. Preview Neon branch currently contains 1 user and 0 customers, applications, drafts, or application-document records. No account, application, or document was created during this audit.
> - **Browser draft recovery test:** In an isolated temporary Chrome profile, a synthetic application draft was saved using the customer-facing Save draft action. IndexedDB contained an AES-GCM ciphertext record (12-byte IV and non-extractable key); the legacy localStorage metadata did not contain the synthetic name or email. After a page reload and in a second tab on the same Preview origin, the Step 2 values restored correctly. This verifies same-browser reload and cross-tab recovery; it does **not** prove the email-token click and full account-verification journey. No verification email was sent and no application was submitted. The temporary browser profile and its synthetic test data were deleted.
> - **Production recovery checkpoint:** Created ready, no-compute Neon branch `prod-safety-checkpoint-2026-11-26` from production branch `production-2026-11-25`. This is a point-in-time recovery branch, not a scheduled snapshot. Neon rejected branch protection because the current plan's protected-branch allowance is exhausted. Production has no automatic snapshot schedule. The existing manual snapshot is still on default branch `main`, not production. A recurring schedule has not been enabled because retained snapshots may incur storage charges and require approval.
> - **Automated QA after the Preview storage changes:** 40 Vitest files / 265 tests passed; TypeScript typecheck, ESLint, Vite client build, and SSR build passed. The existing non-blocking Vite future `configLoader: 'native'` warning remains.
> - **Still outstanding:** full email verification using the configured Oxford mailbox; authenticated Preview application submission and private upload/download round-trip; live acceptance checks for each signed-in role and partner ownership; an automated production snapshot schedule and restore drill. No live customer data or documents were used.
>
> ---
>
> **Live-state audit - 26 November 2026, 21:30 SAST:** This section supersedes earlier contradictory production-state statements in this document. The Cloudflare API was queried read-only. The production Worker `oxford-finance-hub-v3-production` currently has `CONTEXT=cloudflare-production`, `OXFORD_APPLICATIONS_ENABLED=true`, `OXFORD_DOCUMENT_UPLOADS_ENABLED=true`, `OXFORD_EMAIL_DELIVERY_ENABLED=true`, `OXFORD_NOTIFICATION_DELIVERY_ENABLED=true`, and `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED=false`. Therefore production intake and uploads are configured as enabled; do not describe production as paused or disabled. No Worker setting or production deployment was changed during this audit.
>
> - **Customer-facing copy correction:** local source now replaces obsolete paused notices and help text across the customer dashboard, partner portal, Support FAQs and application-readiness page. The customer dashboard now links directly to the application. These copy changes are included in the Preview deployment but are not deployed to production. The source is committed on local branch `release/v3-integrated-2026-11-26`.
> - **Automated quality checks:** 40 Vitest files / 263 tests passed; TypeScript typecheck passed; ESLint passed with zero reported warnings; Vite client and SSR build passed. Vite emitted a non-blocking future `configLoader: 'native'` import-extension warning.
> - **Email verification and draft recovery:** source persists the complete browser draft encrypted with AES-GCM in IndexedDB using a non-extractable CryptoKey, and separately saves account drafts through server actions. The browser restore path runs before autosave. Unit tests cover draft shaping and validation, but no complete live registration → email verification → return-to-form → restore → submission cycle has been accepted. Do not claim this end-to-end workflow is proven.
> - **Production health and intake:** earlier checks recorded HTTP 200 for the health endpoint and `/apply` serving the wizard. The current Windows-hosted repeat HTTP check stalled and was interrupted; this audit therefore relies on the direct Cloudflare configuration read for feature-flag state and does not claim a fresh end-to-end HTTP check.
> - **Supabase document storage:** project is `ACTIVE_HEALTHY`. Bucket `oxford-customer-documents` is private, permits PDF/JPEG/PNG, and has a 10 MiB provider limit. The bucket currently has zero objects. Application code applies its stricter upload limits and server-mediated access checks. No upload/download was attempted.
> - **Neon recovery:** production branch `production-2026-11-25` is currently unprotected and has no automatic snapshot schedule. None of the eight project branches has a scheduled snapshot. The project history retention is 21,600 seconds (six hours), and the only listed manual snapshot is the 25 November checkpoint on default branch `main`, not the production branch. This is **not an accepted production backup/restore plan**. No backup schedule or snapshot was created because retention/storage cost and operational policy have not been approved.
> - **Supabase advisories:** five legacy public tables have RLS enabled but no policies; prior inspection found them empty and Neon remains authoritative. Supabase reports these as informational. It also reports one unindexed legacy foreign key and four unused indexes; no schema changes were made.
> - **Authorization and document security:** existing automated suites include the seven-role effective-permission matrix, partner document permission checks, upload authorization, private-bucket validation, and origin/session security. These are code-level tests, not a completed authenticated role-by-role production acceptance test.
> - **Outstanding acceptance gates:** live email verification/draft recovery; synthetic submission in isolated Preview; full role/direct-route and partner ownership matrix; private document upload/download and isolation tests; backup schedule plus restore drill; and qualified legal review. Do not send real applications or files through a test cycle.
>
> ---
>
> **Cleanup branch update - 26 November 2026:** The isolated branch recovery/cloudflare-only-source-cleanup removes obsolete hosting/runtime adapters, moves the unchanged SQL history to drizzle/migrations, and makes Cloudflare the sole Vite/build path. Local validation passed: Wrangler type generation, Cloudflare build, TypeScript, 37 Vitest files / 237 tests, ESLint with zero warnings, and Prettier checks for updated documentation/configuration and git diff --check. This branch has not been deployed. Production Worker settings and application/upload gates remain unchanged.

## Current-state reconciliation — 26 November 2026

**Release verdict remains NOT READY for real applicant submissions or document uploads.** This update supersedes conflicting 25 November status statements below.

- **Production is active.** Cloudflare has an active `oxford-finance-hub-v3-production` Worker, version `566723ac-df9a-42bd-8aab-dc77274de93c` serving 100% of Worker traffic, with `finance.oxfordbusinessgroup.co.za` attached. Earlier checks recorded HTTP 200 for the public site and `/apply` serving the application wizard; the latest Windows-hosted repeat HTTP check stalled.
- **Current production flags (read directly from Cloudflare on 26 November 2026):** `OXFORD_APPLICATIONS_ENABLED=true`, `OXFORD_DOCUMENT_UPLOADS_ENABLED=true`, `OXFORD_EMAIL_DELIVERY_ENABLED=true`, `OXFORD_NOTIFICATION_DELIVERY_ENABLED=true`, and `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED=false`. The previous false/true flag values in this report were stale. This audit did not create accounts, submit forms, send emails or change production settings.
- The production Worker's Hyperdrive connection targets Neon branch `production-2026-11-25`, a child of `cloudflare-preview`; it is not the project's default `main` branch.
- **Latest local development branch head before this dashboard-copy change:** `90f77f0` (`fix: avoid repeated access catalogue writes on authenticated requests`) on `release/v3-integrated-2026-11-26`. The local dashboard-copy correction and this audit update are uncommitted. Do not merge to `main` or deploy to production as part of this audit. Earlier Preview URLs and build IDs below are historical and must be rechecked before reuse.
- Preview GET checks for `/`, `/apply` and `/login` returned HTTP 200. No application form was submitted.
- PR #9 was merged into `recovery/import-verified-baseline` on 26 November 2026 (merge commit `78fd5b978197ec0729bab0444a44b522300898ef`), not into `main`. The development branch has continued with subsequent reconciliation and test commits that are not part of that merge. Do not reopen or merge into `main` without explicit approval. Cloudflare Workers Builds is the active validation pipeline; do not buy GitHub Actions runners or paid CI.
- Current source review confirms customer registration and recovery challenge changes use database transactions, failed-login increments use an atomic SQL expression, and staff invitation creation/acceptance handlers plus the activation route exist. Cloudflare Preview intake is host-restricted and feature-flagged. The earlier review comment describing these items as absent is stale; full end-to-end acceptance remains outstanding.
- A seven-role permission-engine regression matrix is now included in the development branch, covering exact template permissions, role-audience mismatch, account-type ceilings and service-account restrictions. This is a unit-level safeguard only; the authenticated direct-route and direct-server-function matrix remains an open release gate until the current Cloudflare build and separate end-to-end tests pass.
- Neon has no automatic snapshot schedule on the production, Preview or default branch. One manual snapshot exists on default `main`; production safety/prelaunch checkpoint branches exist, but no independent backup or restore drill has been accepted.
- Supabase's `oxford-customer-documents` bucket is private and currently contains zero objects. The five legacy public tables have RLS enabled and zero rows; the security advisor's no-policy notices are informational for these unused legacy tables.

Production applications and document uploads are already configured as enabled. Do not change those flags, deploy new production code, or enable settlements or payouts without the separate release approval required by the project plan.

---

# Oxford Finance Hub V3 — release readiness report

**Assessment date:** 25 November 2026  
**Repository:** `oxfordgroupza-hue/oxford-finance-hub-v3`  
**Active branch:** `work/v3-cloudflare-native-auth`  
**Latest source commit:** `d238cd95dde7c5fac34e36e8200107accbff33a`  
**PR:** [#9 — Cloudflare-native authentication and private document API preview](https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3/pull/9)  
**Release verdict:** **NOT READY for public recruitment or real applicant submissions.**

This report distinguishes source implementation, automated test evidence, provider configuration and real end-to-end acceptance. A feature being present in the repository is not proof that the workflow is operational.

## 1. Approved architecture

- **Cloudflare Workers:** hosting and server-side application runtime.
- **Oxford-owned Cloudflare authentication:** registration, password hashing, verification, recovery, sessions and account lifecycle.
- **Neon PostgreSQL:** authoritative database for identities, roles, permissions, applications, referrals, audit events and workflow data.
- **Supabase Storage:** private application document objects only.
- **Brevo:** transactional email.

The public destination is `finance.oxfordbusinessgroup.co.za`. As of the 26 November reconciliation above, the production Worker and custom domain are already attached; applications and document uploads remain disabled. No further production changes are authorised without separate approval.

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
- Latest branch commit `d238cd95dde7c5fac34e36e8200107accbff33a` has manual Cloudflare Preview build `c0b3e2ef-106a-4209-967e-3d42004b1bcb`; outcome remains queued at the time this report was refreshed. The multipart parser regression test now runs in Vitest's Node Web API environment to avoid jsdom's incomplete multipart implementation.
- Do not treat the latest stream-parser changes as accepted until this exact build completes Vite, Wrangler type generation, TypeScript, the full Vitest suite and ESLint.

## 3. Provider and database verification

### Neon Preview

- Project: `odd-field-47093538`.
- Isolated non-primary Preview branch: `br-autumn-rain-bgtzmfh8`.
- Database: `oxford_finance_hub`.
- Seven roles, 90 permissions, 148 role-permission assignments and four finance products are present.
- Latest read-only inspection found zero users, customers, applications, partner registrations, documents and audit events.
- No migration-history table was found in the Neon Preview database. SQL migration files remain in the legacy `drizzle/migrations` path. A verified migration baseline and repeatable Neon migration procedure are outstanding.

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

| Capability                        | Preview state                      | Meaning                                                                                       |
| --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Public pages                      | Built                              | Public routes can be inspected                                                                |
| Application wizard                | Enabled on approved Preview host   | Synthetic test information only                                                               |
| Real/live applications            | Disabled                           | Do not submit real applicant information                                                      |
| Document uploads                  | Disabled                           | No real or dummy file upload acceptance yet                                                   |
| Transactional email               | Enabled with recipient restriction | Approved Oxford-owned Preview mailbox only; no email has been sent                            |
| Super Admin bootstrap             | Enabled on Preview                 | No account exists; bootstrap requires the account owner to register, verify email and sign in |
| Payments, settlements and payouts | Fail-closed                        | No execution or transfer is enabled                                                           |
| Production domain and data        | Unchanged                          | No production cutover has occurred                                                            |

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
