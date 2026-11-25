# Oxford Finance Hub V3 — Preview acceptance and release gate

**Last verified:** 25 November 2026, 07:46 UTC  
**Branch:** `work/v3-cloudflare-native-auth`  
**Branch HEAD:** `26c693231afd394f5b74b907a0f3d50df8e803f8`  
**Stable Preview:** https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/  
**Latest immutable Preview deployment:** https://fb5654c9-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/  
**Production:** unchanged. Draft PR #9 remains open and unmerged.

## Release decision

<**NOT RELEASE READY**>

The latest Preview build and automated suite pass, the live Supabase health check succeeds, and public/protected route behaviour has been checked. The application is not accepted end-to-end: authentication lifecycle, administrator bootstrap, real account sessions, all application combinations, document upload/download isolation, provider notifications, backup/restore and legal/compliance review remain open.

The approved target architecture is Cloudflare Workers + Oxford-owned Cloudflare-native authentication + Neon PostgreSQL + private Supabase Storage + Brevo transactional email. Netlify remains rollback/reference only during migration. This does not authorise production cutover.

## Latest full Preview validation — PASS

- Cloudflare Preview build: `3f1b78c4-f4ac-4954-9672-8c982a1e2ce9`
- Build outcome: **success**
- Build completed: `2026-11-25T07:45:51.637Z`
- Preview deployment: **57**
- Preview deployment ID: `fb5654c9-458b-4cc7-b9bf-7c623b91e97f`
- Commit tag: `26c6932`
- Build command: `pnpm cf:build && pnpm exec wrangler types worker-configuration.d.ts && pnpm typecheck && pnpm test && pnpm lint`
- Vite Cloudflare client/server build: passed.
- Wrangler runtime type generation: passed.
- TypeScript: passed.
- Vitest: **39 test files, 216 tests passed, 0 failed**.
- ESLint: **0 errors, 2 warnings**, both unused disable directives in generated `worker-configuration.d.ts`.
- Wrangler Preview deployment: succeeded.

Prettier is not part of this command. A previous repository-wide format check found 181 files with formatting differences. A changed-files-only format check has not been verified on this exact branch head and remains an open quality item.

## Runtime Preview verification — PASS

The deployed health endpoint returned HTTP 200:

`/api/oxford-api?action=health`

Response:
- `configured=true`
- `bucketConfigured=true`
- `storageVerified=true`
- `encryptionConfigured=true`
- `documentUploadsEnabled=false`
- `liveApplicationsEnabled=false`
- `authoritativeDatabase=neon`

A same-origin browser POST to the document API without an authenticated session returned **401 Sign in is required**, confirming the deployed POST route is reachable and does not allow anonymous document operations. Origin-validation unit tests also pass, including missing-Origin and cross-origin rejection cases.

The following 17 routes were checked in the deployed Preview:
- Public pages: `/`, `/solutions`, `/partners`, `/about`, `/contact`, `/apply`, `/login`, `/readiness`, `/privacy`, `/popia`, `/terms`, `/complaints`, `/support`.
- Protected pages: `/dashboard`, `/office`, `/admin`, `/partner`.

All returned HTTP 200. Protected routes correctly redirected unauthenticated visitors to `/login`. This is route/render verification, not authenticated workflow acceptance.

## Preview deployment configuration — verified

The latest branch Preview deployment contains:
- `CONTEXT=cloudflare-preview`
- Neon Hyperdrive binding `HYPERDRIVE` pointing to the isolated Preview connection.
- Encrypted secret bindings present: `BREVO_API_KEY`, `OXFORD_PII_ENCRYPTION_KEY`, `SUPABASE_SECRET_KEY`.
- `OXFORD_APPLICATIONS_ENABLED=true`
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`
- `OXFORD_EMAIL_DELIVERY_ENABLED=true`
- `SUPABASE_URL=https://wgcnawtnkblivfirclvz.supabase.co`
- `SUPABASE_BUCKET=oxford-customer-documents`
- `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED=true`
- Initial Super Administrator and notification recipient restricted to the approved Oxford-owned Preview mailbox.
- Approved sender name/address configured.

Secret values were not read, logged or exposed. Email delivery is restricted to the approved Preview recipient. No verification email has been sent and no Super Administrator account has been created.

## Supabase private storage — configuration and health verified

Read-only database inspection confirmed:
- Bucket `oxford-customer-documents` exists.
- `public=false`.
- Provider limit: 10 MiB.
- Allowed MIME types: PDF, JPEG and PNG.
- Object count: 0.
- The `storage.objects` policy denies direct `anon` and `authenticated` client access to this bucket.
- Live Worker health check reports `storageVerified=true`.

The application upload route is stricter at 4 MiB and validates the file signature. This is intentional. Do not increase the route limit without a separately reviewed design. No file has been uploaded. Upload/download, signed-link expiry, cleanup, retry/recovery and customer/partner access-isolation tests remain outstanding; uploads stay disabled.

## Neon Preview database — verified

- Project: `odd-field-47093538`
- Isolated branch: `br-autumn-rain-bgtzmfh8` (`cloudflare-preview`)
- Database: `oxford_finance_hub`
- Branch state: ready; non-primary, separate from default `main`.
- Roles: 7.
- Permission catalogue: 90.
- Stored role-permission assignments: 148.
- Finance products: 4.
- Asset categories: 30.
- Asset types: 75.
- Industries: 8.
- Super Administrator assignment rows: 0 (its permissions are derived dynamically from the office catalogue).
- Users, credentials, sessions, challenges, finance applications, customers, partner registrations, application intakes, notifications and audit events: 0 rows at last inspection.

No synthetic login account or application was created during this verification pass. No real customer or application data was added.

No explicit Neon snapshot schedule was returned for the Preview branch or project default branch. The existing no-compute checkpoint branch `br-hidden-pine-bge4ifgv` is a Preview rollback checkpoint, not a verified backup. Backup/restore and recovery evidence remain required.

## Source implementation and automated-test coverage

The branch contains implementations for:
- Cloudflare-native customer registration, password login, logout, email verification and password recovery.
- PBKDF2-HMAC-SHA-256 password hashing at 310,000 iterations, unique salts, hashed opaque sessions/challenges and secure HttpOnly session cookie.
- One-time Super Administrator bootstrap logic restricted to the designated verified email and Preview context.
- Seven role templates and server-side permission evaluation/account-type ceilings.
- Staff invitation and activation workflow.
- Application and office-intake actions, referral/partner workflows, audit records, fee/settlement logic, credit-assessment modules and PDF pack generation.
- Private document API and Supabase server-mediated storage implementation.
- Brevo email and notification queue implementation.

Source presence and passing unit tests do not establish the full provider or user lifecycle. The following are still not end-to-end accepted.

## Remaining acceptance gates

1. **Authentication lifecycle:** synthetic Preview signup, email verification, login, recovery, password change, session expiry/rotation/revocation, logout, lockout, suspension and origin/CSRF tests.
2. **Super Administrator bootstrap:** controlled verification and one-time bootstrap to the approved mailbox; then verify Super Admin permissions and visible controls. Keep production untouched.
3. **Staff invitations:** end-to-end invite, 72-hour expiry, one-time token, matching verified email, activation, role assignment, revocation and resend.
4. **PBKDF2 runtime benchmark:** measure the 310,000-iteration implementation in the deployed Cloudflare Worker runtime.
5. **RBAC/isolation:** direct-route and direct-server-function matrix for all seven roles, including partner referral scope, customer ownership, reviewer assignment, support restrictions and administrator limits.
6. **Application acceptance:** all eight Individual/Business × four finance-category paths using synthetic Preview data; validation, consent, idempotency, drafts, ownership, status history, PDF contents and office processing.
7. **Office/partner workflows:** office-created applicant invitation/claim, partner referral attribution, merchant linking, registration-only notifications, supplier document controls and support handling.
8. **Document acceptance:** dummy-file upload/download, 4 MiB and 20-document limits, MIME/signature checks, checksums/idempotency, cross-customer and cross-partner denial, signed URL expiry, retries, interrupted upload recovery, orphan cleanup and audit events.
9. **Notification acceptance:** verification/recovery and queue/provider failure tests only to the approved Preview mailbox. No WhatsApp or customer/partner notifications without separate approval.
10. **Commercial/settlement acceptance:** approved fee/VAT rules, documentation-fee separation, immutable settlement/reconciliation/adjustment and partner own-net visibility. Keep terms approval and settlement/payout execution fail-closed; the application must not initiate payments.
11. **Data resilience:** verified backup/restore and recovery procedure for the selected Cloudflare/Neon architecture.
12. **Quality and UX:** changed-files-only format check, detailed responsive desktop/tablet/mobile acceptance, accessibility review and final security review.
13. **Legal/compliance:** qualified review of POPIA, FICA, NCA, privacy notices, retention, complaints and actual operating processes. Do not claim legal compliance or certification based on code alone.

## Release controls

- Synthetic identities, applications and dummy documents only in Preview.
- No real applicant applications/documents, customer or partner notifications, WhatsApp, payments, settlements or payouts.
- Do not merge PR #9, change production Worker/secrets/database, alter `finance.oxfordbusinessgroup.co.za` or DNS, migrate production data, or remove the Netlify fallback without separate explicit approval.
- Production domain attachment, production feature flags and live applicant processing require separate production cutover approval after acceptance.

