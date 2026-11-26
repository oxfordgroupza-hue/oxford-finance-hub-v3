> **Current-state correction — 26 November 2026 (supersedes stale branch/build statements below)**
>
> PR #9 is merged into `recovery/import-verified-baseline` at `78fd5b978197ec0729bab0444a44b522300898ef`.
>
> Cloudflare Workers Builds reports the merged recovery-branch build as successful:
> - Build ID: `3839af89-e136-466c-a175-1bcc564e561a`
> - Commit: `78fd5b978197ec0729bab0444a44b522300898ef`
> - Build command: `pnpm cf:build`
> - Deploy command: `npx wrangler preview`
> - Outcome: **success**, stopped at 06:04:40 UTC on 26 November 2026.
>
> Scope of this evidence: the configured Preview build/deploy command completed. It does **not** demonstrate that Wrangler type generation, TypeScript, Vitest, ESLint, browser/runtime acceptance or authenticated workflow tests passed. The Preview build trigger does not run the full quality pipeline. GitHub combined status and workflow-run queries for the merge commit returned no checks/runs.
>
> The older header below refers to branch HEAD `aebe9893...`, a historical Preview URL, and PR #9 as draft/open. Those statements are retained as historical evidence only and are not the current branch, merge or deployment status. Do not use the old immutable Preview URL as proof of the current merged source.
>
> The successful build does not authorise Production deployment. Production was not changed by PR #9 merge. Keep live applications and document uploads disabled. No end-to-end login, Super Administrator bootstrap, role matrix, application journey, document upload/download or transactional email acceptance is established by this build record.
>
> **Current release decision: NOT RELEASE READY.**

# Oxford Finance Hub V3 — Preview acceptance and release gate

**Last verified:** 25 November 2026, 07:57 UTC  
**Branch:** `work/v3-cloudflare-native-auth`  
**Branch HEAD:** `aebe9893af6cf4bd9e6d2b535575172ab8c6d064`  
**Stable Preview reference:** https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/  
**Latest immutable Preview deployment:** https://9d173fa4-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/  
**Production:** unchanged. Draft PR #9 remains open and unmerged.

## Release decision

**NOT RELEASE READY.**

The latest full Preview build passes Vite, Wrangler type generation, TypeScript, all automated tests and ESLint. The image fix is included in deployment 61 and the four local image assets were emitted into the Cloudflare client asset bundle. Runtime health and route checks were completed on the preceding Preview deployment. The latest immutable deployment's secret bindings and flags are present.

Full authentication, Super Administrator bootstrap, all role isolation, eight application journeys, document upload/download security, transactional email delivery, backup/restore and qualified legal review have not completed end-to-end acceptance.

The approved target architecture is Cloudflare Workers + Oxford-owned Cloudflare-native authentication + Neon PostgreSQL + private Supabase Storage + Brevo transactional email. Netlify remains rollback/reference only during migration. This does not authorise production cutover.

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
- Do not merge PR #9, change production Worker/secrets/database, alter `finance.oxfordbusinessgroup.co.za` or DNS, migrate production data, or remove the Netlify fallback without separate explicit approval.
- Production domain attachment, production feature flags and live applicant processing require separate production cutover approval.
