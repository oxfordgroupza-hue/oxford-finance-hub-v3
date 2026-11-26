> **Latest verified state — 26 November 2026:** `recovery/cloudflare-only-source-cleanup` at `4b73d469f515f3b8b5ac96de75a23a6d8874aed1` is pushed to GitHub and deployed to the Cloudflare Preview Worker. Deployment `2574fa91-7d2d-42b2-b1b9-a4cd0cad75fe` is serving 100% of Preview traffic. TypeScript, ESLint, 37 Vitest files / 237 tests, Cloudflare build, Wrangler dry-run and `git diff --check` passed. Live Preview routes and static assets return HTTP 200; HSTS, frame protection, MIME-sniff protection and Preview-only `X-Robots-Tag: noindex, nofollow, noarchive` are verified. Preview application submissions and document uploads are both `false`; the three existing secret bindings are present. Production was not redeployed or changed. A dedicated secret scanner is not installed, and authenticated end-to-end acceptance remains outstanding.

This latest state supersedes older branch, deployment and Preview-flag notes below. Production remains on its existing deployment; its public homepage, robots.txt and sitemap return HTTP 200. Production HSTS is currently absent and is recorded as an outstanding edge-security item; no Production configuration was changed.

## Current-state reconciliation — 26 November 2026

- Development branch HEAD: `d0fcc2cb61570b43bc6246187a7dc6ed8058d2ce`. Cloudflare Workers Build `1ed97f2d-b578-4c94-b81e-38ace98786cd` completed successfully for this test/documentation update on 26 November 2026. The configured Cloudflare Vite build, Wrangler type generation, TypeScript, Vitest and ESLint pipeline passed; the build record did not separately expose the final test count. The commit adds the seven-role permission-engine regression matrix and documentation only; runtime application code is unchanged. The last independently identified immutable runtime Preview URL remains `https://ec8f277b-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/`, built from functional source commit `045d5b1d6015ef02513e1694d660d9ea8823f23b`. Stable branch Preview: `https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/`. The latest build-list response did not expose a new immutable Preview URL.
- Earlier GET checks for `/`, `/apply` and `/login` returned HTTP 200 on the functional-source Preview. No forms were submitted.
- Production remains a restricted public shell on `finance.oxfordbusinessgroup.co.za`; application and document-upload flags are false.
- PR #9 was merged into `recovery/import-verified-baseline` on 26 November 2026 (merge commit `78fd5b978197ec0729bab0444a44b522300898ef`), not into `main`. The development branch has continued with subsequent reconciliation and test commits outside that merge. Do not reopen PR #9 or merge into `main` without explicit approval.

---

# Oxford Finance Hub V3 — Preview acceptance and release gate

**Last verified:** 25 November 2026, 07:57 UTC  
**Branch:** `work/v3-cloudflare-native-auth`  
**Branch HEAD:** `aebe9893af6cf4bd9e6d2b535575172ab8c6d064`  
**Stable Preview reference:** https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/  
**Latest immutable Preview deployment:** https://9d173fa4-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/  
**Production:** restricted public shell already deployed; applications/uploads disabled. PR #9 was merged into `recovery/import-verified-baseline` on 26 November 2026 (merge commit `78fd5b978197ec0729bab0444a44b522300898ef`), not into `main`. The development branch has ten subsequent reconciliation commits that are not part of that merge. Do not reopen or merge into `main` without explicit approval.

## Release decision

**NOT RELEASE READY.**

The latest full Preview build passes Vite, Wrangler type generation, TypeScript, all automated tests and ESLint. The image fix is included in deployment 61 and the four local image assets were emitted into the Cloudflare client asset bundle. Runtime health and route checks were completed on the preceding Preview deployment. The latest immutable deployment's secret bindings and flags are present.

Full authentication, Super Administrator bootstrap, all role isolation, eight application journeys, document upload/download security, transactional email delivery, backup/restore and qualified legal review have not completed end-to-end acceptance.

The approved target architecture is Cloudflare Workers + Oxford-owned Cloudflare-native authentication + Neon PostgreSQL + private Supabase Storage + Brevo transactional email. Cloudflare Workers is the sole supported application runtime. This does not authorise production cutover.

## Latest full Preview build — PASS

- Build ID: `dfeff3fd-211a-4a13-b8c0-ed46513f6056`
- Commit: `aebe9893af6cf4bd9e6d2b535575172ab8c6d064`
- Build outcome: **success**
- Preview deployment: **61**
- Deployment ID: `9d173fa4-2837-48a5-a5ce-5f9a4942d304`
- Immutable deployment URL: https://9d173fa4-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/
- Vite Cloudflare client/server build: passed.
- Wrangler runtime type generation: passed.
- TypeScript: passed.
- Vitest: **39 test files, 216 tests passed, 0 failed**.
- ESLint: **0 errors, 2 warnings**, both unused disable directives in generated `worker-configuration.d.ts`.
- Wrangler Preview deployment: succeeded.

The build emitted the locally bundled Oxford hero, vehicle, equipment and about image assets. The old external image URLs were removed from the category image map. The single-image category cards no longer use a fade animation that could hide the image.

A previous desktop/tablet/mobile smoke check found no horizontal overflow but did find broken external/public image paths. The code has since been corrected and the new deployment contains the bundled assets. Post-deployment visual confirmation is still pending because Cloudflare Browser Rendering is temporarily rate-limited. Do not mark visual acceptance complete until the new deployment's images have been viewed.

Prettier is not part of the build command. A previous repository-wide format check found 181 files with formatting differences. A changed-files-only format check remains outstanding.

## Runtime and provider evidence

A prior deployed health check returned HTTP 200 with:

- `configured=true`
- `bucketConfigured=true`
- `storageVerified=true`
- `encryptionConfigured=true`
- `documentUploadsEnabled=false`
- `liveApplicationsEnabled=false`
- `authoritativeDatabase=neon`

A same-origin unauthenticated POST to the document API returned **401 Sign in is required**. Origin-validation unit tests pass, including missing-Origin and cross-origin rejection.

The 17 public/protected routes were checked on the preceding Preview deployment. Public pages rendered; protected dashboard, Office, Admin and Partner routes redirected unauthenticated visitors to login. This is route/render verification, not authenticated workflow acceptance.

## Latest Preview configuration — verified from deployment metadata

Deployment 61 contains:

- Neon Hyperdrive binding `HYPERDRIVE`.
- Encrypted secret bindings: `BREVO_API_KEY`, `OXFORD_PII_ENCRYPTION_KEY`, `SUPABASE_SECRET_KEY`.
- `CONTEXT=cloudflare-preview`.
- `SUPABASE_URL=https://wgcnawtnkblivfirclvz.supabase.co`.
- `SUPABASE_BUCKET=oxford-customer-documents`.
- `OXFORD_APPLICATIONS_ENABLED=true`.
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`.
- `OXFORD_EMAIL_DELIVERY_ENABLED=true`.
- `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED=true`.
- Bootstrap and notification recipient restricted to the approved Oxford-owned Preview mailbox.
- Approved sender configuration.

Secret values were not read, logged or exposed. No verification email has been sent and no Super Administrator account has been created.

## Supabase private storage

Read-only inspection confirmed:

- Bucket `oxford-customer-documents` exists and `public=false`.
- Provider limit: 10 MiB.
- Allowed MIME types: PDF, JPEG and PNG.
- Object count: 0.
- Direct `anon` and `authenticated` client access is denied by the storage-object policy.
- The prior live health check reported `storageVerified=true`.

The application route remains stricter at 4 MiB and validates the file signature. The per-application maximum is 20 documents. Uploads remain disabled. No files have been uploaded. Upload/download, signed-link expiry, cleanup, retries, recovery and customer/partner isolation remain untested.

## Neon Preview database

- Project: `odd-field-47093538`
- Isolated branch: `br-autumn-rain-bgtzmfh8` (`cloudflare-preview`)
- Database: `oxford_finance_hub`
- Branch state: ready, non-primary and separate from default `main`.
- Roles: 7.
- Permission catalogue: 90.
- Stored role-permission assignments: 148.
- Finance products: 4.
- Asset categories: 30.
- Asset types: 75.
- Industries: 8.
- Users, credentials, sessions, challenges, finance applications, customers, partner registrations, application intakes, notifications and audit events: 0 rows at last inspection.

No synthetic login account or application was created during this verification pass. No real customer or application data was added.

No explicit Neon snapshot schedule was returned for the Preview branch or project default branch. The no-compute checkpoint branch `br-hidden-pine-bge4ifgv` is a Preview rollback checkpoint, not a verified backup. Backup/restore and recovery evidence remain required.

## Remaining acceptance gates

1. Synthetic Preview signup, email verification, login, recovery, password change, session expiry/rotation/revocation, logout, lockout and suspension.
2. Controlled Super Administrator verification/bootstrap to the approved mailbox, then visible controls and effective permissions.
3. Staff invitation/activation, 72-hour expiry, one-time token, matching verified email, role assignment, revocation and resend.
4. PBKDF2 runtime benchmark in the deployed Worker.
5. Seven-role direct-route and direct-server-function authorization matrix, including customer ownership, partner referral scope, reviewer assignment and support restrictions.
6. All eight Individual/Business × four finance-category application paths using synthetic Preview data.
7. Office-created intake, applicant claim, partner referral attribution, merchant linking and support workflows.
8. Dummy document upload/download, 4 MiB and 20-document limits, MIME/signature checks, checksums/idempotency, cross-customer/partner denial, signed URL expiry, retries, interrupted upload recovery, orphan cleanup and audit events.
9. Verification/recovery and queue/provider failure tests only to the approved Preview mailbox. No customer/partner emails or WhatsApp.
10. Approved fee/VAT rules, documentation-fee separation, immutable settlement/reconciliation/adjustment and partner own-net visibility. Keep payout execution fail-closed.
11. Verified Neon backup/restore and recovery procedure.
12. Changed-files-only formatting check, visual image verification, responsive/accessibility review and final security review.
13. Qualified POPIA, FICA, NCA, privacy, retention and complaints review. Do not claim legal compliance based on code.

## Release controls

- Synthetic identities/applications and dummy documents only in Preview.
- No real applicant documents, customer/partner notifications, WhatsApp, payments, settlements or payouts.
- Do not merge PR #9, change production Worker/secrets/database, alter `finance.oxfordbusinessgroup.co.za` or DNS, migrate production data, or alter the Cloudflare production deployment without separate explicit approval.
- Production domain attachment, production feature flags and live applicant processing require separate production cutover approval.
