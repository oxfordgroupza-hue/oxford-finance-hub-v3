# Oxford Finance Hub V3 — Preview acceptance and release gate

**Last verified:** 25 November 2026  
**Branch:** `work/v3-cloudflare-native-auth`  
**Branch HEAD:** `d0768fafc31dba1eb85feb929e878b2817ceb7f1`  
**Preview:** https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/  
**Latest immutable deployment:** https://5996df01-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/  
**Production:** unchanged. Draft PR #9 remains unmerged.

## Current decision

**NOT RELEASE READY.** The current source builds and deploys successfully, but a successful build and unit suite are not evidence of end-to-end finance workflow readiness. This document supersedes older historical status notes below and records the latest verified state.

The approved target architecture is Cloudflare Workers + Oxford-owned Cloudflare-native authentication + Neon PostgreSQL + private Supabase Storage + Brevo transactional email. Netlify remains rollback/reference only during migration. This approval does not authorise production cutover.

## Latest automated build — PASS

- Cloudflare Build: `18870e2a-51c8-4b88-aeaf-87bc23e37537`
- Preview deployment number: `39`
- Preview deployment ID: `5996df01-0133-4485-921a-1a77fbb21698`
- Commit tag: `d0768fa`
- Vite Cloudflare production bundle: passed.
- Wrangler Worker type generation: passed.
- TypeScript: passed.
- Vitest: **39 test files, 215 tests passed, 0 failed**.
- ESLint: **0 errors, 2 warnings** (unused disable directives).
- Wrangler Preview deployment: succeeded.

Prettier is not part of this build command. A previous repository-wide format check reported 181 files with formatting differences. A changed-files-only format check has not yet been verified on this exact branch head; formatting therefore remains an open quality gate.

## Preview deployment configuration — verified

The latest Preview deployment's own environment (not the separate Production or Previews Base settings page) contains:

- `CONTEXT=cloudflare-preview`
- Neon Hyperdrive binding `HYPERDRIVE` pointing to the isolated Preview connection.
- Secret binding `BREVO_API_KEY` present; value remains encrypted and was not read or exposed.
- `OXFORD_APPLICATIONS_ENABLED=true`
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`
- `OXFORD_EMAIL_DELIVERY_ENABLED=true`
- `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED=true`
- Initial Super Administrator and notification recipient both restricted to the approved Oxford-owned Preview mailbox.
- Approved sender name/address configured.

The latest Preview deployment does **not** contain these required bindings:

- `SUPABASE_SECRET_KEY` (the only remaining required Supabase binding)

Preview-only remediation applied on deployment 44: a newly generated 32-byte PII encryption key is installed as an encrypted secret, and the correct Supabase project URL and private bucket name are configured. The existing Brevo secret and Hyperdrive binding were preserved. The remaining missing binding is the Supabase secret/service key. The upload feature flag remains off until that key is added and end-to-end authorization tests pass. Do not copy production or legacy Netlify secrets into Preview.

No verification email has been sent and no Super Administrator has been created. The approved mailbox is allow-listed, but the actual verification/bootstrap path remains untested.

## Neon Preview database — verified

- Project: `odd-field-47093538`
- Isolated branch: `br-autumn-rain-bgtzmfh8` (`cloudflare-preview`)
- Database: `oxford_finance_hub`
- Branch state: ready; non-primary branch, separate from the default `main` branch.
- Roles: 7.
- Permission catalogue rows: 90.
- Stored role-permission assignments: 148.
- Reserved Super Administrator role: present; its permissions are derived dynamically from the office catalogue, so it has no stored role-permission rows.
- Active Super Administrator assignments: 0.
- Users, credentials, sessions, challenges, finance applications, customers, partner registrations, application intakes, notifications and audit events: all 0 rows at the time of inspection.

No explicit Neon snapshot schedule was returned for either the Preview branch or the project's default branch. Backup/restore and recovery evidence is still required before release; do not infer that recovery has been tested.

## Supabase private storage — configuration verified, application integration unverified

Read-only inspection confirmed the existing `oxford-customer-documents` bucket:

- Private (`public=false`).
- 10 MiB bucket maximum.
- Allowed MIME types: PDF, JPEG and PNG.
- A restrictive `storage.objects` policy denies direct client access by `anon` and `authenticated` roles for this bucket.

The application route's current server-mediated upload validation is stricter at 4 MiB and checks the file signature. This is intentional; do not raise it to the bucket limit without a separately reviewed upload design. No file has been uploaded. Because the Preview Worker is missing its Supabase and PII secrets, upload, download, signed access, cleanup and recovery have not been tested.

Supabase advisory checks returned informational RLS-enabled/no-policy notices for five public tables, one unindexed foreign key on `application_documents.customer_id`, and four unused indexes. The restrictive storage policy is deny-by-default for direct client access. Reassess the advisory findings after synthetic traffic and before production.

## Implemented in source / automated tests, but not yet end-to-end verified

- Cloudflare-native customer registration, password login, logout, email verification and password recovery handlers.
- PBKDF2-HMAC-SHA-256 password hashing configured at 310,000 iterations, unique salts, hashed opaque sessions/challenges and 12-hour secure HttpOnly session cookie.
- One-time Super Administrator bootstrap logic restricted to the designated verified email and Preview context.
- Seven role templates and server-side permission evaluation/account-type ceilings.
- Application and office-intake server actions, referral/partner workflows, audit records, fee/settlement logic, credit-assessment modules and PDF pack generation.
- Private document API and Supabase server-mediated storage implementation.
- Brevo email and notification queue implementation.

Unit tests passing do not establish the live provider integrations or the full lifecycle of these features.

## Release blockers

1. **Staff account invitations:** a Cloudflare-native staff invitation and activation workflow has now been implemented on the feature branch. It creates a pending office account, assigns only an active non-reserved office role, sends a single-use 72-hour invitation and activates the account after password creation. The new workflow has not yet passed its build or end-to-end email acceptance test. Applicant intake invitations are a different workflow.
2. **Preview secrets:** securely configure the dedicated Preview PII encryption key and Supabase URL, service secret key and bucket name. Do not expose secret values in source, logs, documentation or chat.
3. **Authentication E2E:** test signup, email verification, login, recovery, password change, session expiry/rotation/revocation, logout, origin/CSRF rejection, lockout, suspension and the one-time Super Administrator bootstrap.
4. **PBKDF2 runtime benchmark:** measure the 310,000-iteration implementation in the deployed Cloudflare Worker runtime and record latency.
5. **RBAC and isolation:** run the direct-route and direct-server-function matrix for all seven roles, including partner-only referral scope, customer ownership, reviewer assignment, support restrictions and administrator limits.
6. **Application acceptance:** test all eight Individual/Business × four finance-category combinations with synthetic data, including validation, consent, idempotency, drafts, ownership, status history, PDF pack contents and office processing.
7. **Office/partner workflows:** verify office-created applicant invitation/claim, partner referral attribution, merchant linking, registration-only notifications, supplier document controls and support handling.
8. **Document acceptance:** after the dedicated secrets are configured, test file limits/signatures, 20-document concurrency limit, metadata/checksum, upload/download authorisation, cross-customer and cross-partner denial, signed URL expiry, retries, interrupted uploads, orphan cleanup and audit events. Use dummy files only.
9. **Notification acceptance:** test verification/recovery and queue/provider failure behaviour only to the approved Preview mailbox. No WhatsApp or external customer notifications without separate approval.
10. **Commercial and settlement acceptance:** verify approved fee/VAT rules, documentation-fee separation, immutable settlement/reconciliation/adjustment and partner own-net visibility. Keep terms approval and settlement/payout execution fail-closed; the application must not initiate payments.
11. **Data resilience:** Neon automatic snapshot scheduling is not enabled for this project, and manual snapshots are not permitted on the isolated non-root Preview branch. A verified backup/restore procedure and production recovery plan are still required; do not change the root/production branch or upgrade billing without separate approval.
12. **Quality and UX:** complete changed-files formatting checks, responsive desktop/tablet/mobile acceptance and final security review.
13. **Legal/compliance:** obtain qualified review of POPIA, FICA, NCA, privacy notices, retention, complaints and actual operating processes. Do not claim certification or legal compliance based on code alone.

## Release controls

- Synthetic data and dummy documents only in Preview.
- Do not submit real applications, upload real applicant documents, send customer/partner emails or WhatsApp, execute payments, settlements or payouts.
- Do not merge PR #9, change production Worker settings/secrets, alter production DNS/custom domains, migrate production data, or remove the Netlify fallback without separate explicit approval.
- Production domain attachment and live feature flags require a separate production cutover approval after the above gates pass.


## Remediation activity — 25 November 2026

- Preview deployment 44 (`71794f88-11da-4a1c-adaf-6e87b13174f3`) was created with an encrypted, newly generated PII encryption key and the Supabase URL/bucket settings. The Brevo secret remained present.
- Staff invitation actions, the Super Administrator invitation-management page, the staff activation page and a dedicated email template were added to `work/v3-cloudflare-native-auth`.
- Build `c9f04dd4-5790-44af-971a-4d9dcbf5158b` was queued for validation. It has not yet started in the build service at the time of this note.
- Supabase secret/service key is not exposed by the connected Supabase management integration; only publishable/anon keys are available. Do not substitute a publishable key because the storage bucket intentionally denies direct client access.
- No staff invitation email was sent, no staff account was created, and no customer or application data was added.
