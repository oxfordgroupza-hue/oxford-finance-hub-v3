> **Latest verified state — 26 November 2026:** `recovery/cloudflare-only-source-cleanup` at `4b73d469f515f3b8b5ac96de75a23a6d8874aed1` is pushed and deployed to the Cloudflare Preview Worker (deployment `2574fa91-7d2d-42b2-b1b9-a4cd0cad75fe`, 100% Preview traffic). TypeScript, ESLint, 37 Vitest files / 237 tests, Cloudflare build, Wrangler dry-run and `git diff --check` passed. Preview routes/assets return HTTP 200; HSTS, frame protection, MIME-sniff protection and Preview-only noindex headers are verified. Preview applications and document uploads remain disabled. Production was not redeployed or changed. A dedicated secret scanner is not installed; authenticated end-to-end acceptance, backup/restore evidence and qualified legal review remain outstanding. Production HSTS is absent and requires a separately approved Cloudflare edge configuration change.

This latest state supersedes older branch and deployment notes below. Do not merge to `main`, enable application submissions/uploads, or change Production without the separate release approval.

## Current-state reconciliation — 26 November 2026

**Release verdict remains NOT READY for real applicant submissions or document uploads.** This update supersedes conflicting 25 November status statements below.

- **Production is not untouched.** Cloudflare has an active `oxford-finance-hub-v3-production` Worker, version 15 serving 100% of Worker traffic, with `finance.oxfordbusinessgroup.co.za` attached. The public homepage returns HTTP 200 and displays the paused-application notice.
- Production flags are deliberately restrictive: `OXFORD_APPLICATIONS_ENABLED=false` and `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`. `OXFORD_EMAIL_DELIVERY_ENABLED=true` and `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED=true` are configured. This audit did not create accounts, submit forms, send emails or change production settings.
- The production Worker's Hyperdrive connection targets Neon branch `production-2026-11-25`, a child of `cloudflare-preview`; it is not the project's default `main` branch.
- **Latest development branch head:** `d0fcc2cb61570b43bc6246187a7dc6ed8058d2ce`; Cloudflare Workers Build `1ed97f2d-b578-4c94-b81e-38ace98786cd` completed successfully for the test/documentation update. The configured build, Wrangler type generation, TypeScript, Vitest and ESLint pipeline passed; the test count was not separately surfaced. The last independently identified immutable runtime Preview remains `https://ec8f277b-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/` from functional source commit `045d5b1`. Stable branch Preview: `https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/`.
- Preview GET checks for `/`, `/apply` and `/login` returned HTTP 200. No application form was submitted.
- PR #9 was merged into `recovery/import-verified-baseline` on 26 November 2026 (merge commit `78fd5b978197ec0729bab0444a44b522300898ef`), not into `main`. The development branch has continued with subsequent reconciliation and test commits that are not part of that merge. Do not reopen or merge into `main` without explicit approval. Cloudflare Workers Builds is the active validation pipeline; do not buy GitHub Actions runners or paid CI.
- Current source review confirms customer registration and recovery challenge changes use database transactions, failed-login increments use an atomic SQL expression, and staff invitation creation/acceptance handlers plus the activation route exist. Cloudflare Preview intake is host-restricted and feature-flagged. The earlier review comment describing these items as absent is stale; full end-to-end acceptance remains outstanding.
- A seven-role permission-engine regression matrix is now included in the development branch, covering exact template permissions, role-audience mismatch, account-type ceilings and service-account restrictions. This is a unit-level safeguard only; the authenticated direct-route and direct-server-function matrix remains an open release gate until the current Cloudflare build and separate end-to-end tests pass.
- Neon has no automatic snapshot schedule on the production, Preview or default branch. One manual snapshot exists on default `main`; production safety/prelaunch checkpoint branches exist, but no independent backup or restore drill has been accepted.
- Supabase's `oxford-customer-documents` bucket is private and currently contains zero objects. The five legacy public tables have RLS enabled and zero rows; the security advisor's no-policy notices are informational for these unused legacy tables.

Do not enable live applications, document uploads, settlements or payouts, or make further production changes without the separate release approval required by the project plan.

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

- Live Neon inspection on 26 November 2026 found a **6-hour PITR/history-retention window** (21,600 seconds), one manual snapshot on default branch `main` (created 25 November 2026 at 08:49:42 UTC), and no automatic snapshot schedule.
- The production branch and all five other project branches currently report `protected=false`.
- Production checkpoint branches are same-project branch clones, not independent backups; no restore drill has been completed.
- Backup, restore and recovery-point verification remain release blockers. Increasing retention, enabling branch protection or creating independent backups may affect plan cost and requires approval.

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
