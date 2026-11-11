# M0 Initial Recovery Audit

Date: 10 November 2026
Status: Sanitised source snapshot imported; validation and Deploy Preview remain outstanding.

## Repository and source provenance

- V3 target: `oxfordgroupza-hue/oxford-finance-hub-v3`, public repository.
- Development branch: `recovery/import-verified-baseline`.
- V3 baseline commit: `3553c74388fb122a8497cd7fd878891497b60bec`.
- V2 recovery baseline: `183ea2117d4be9a587a1632f68e8245091a72897`.
- V2 advanced workflow source: `9c4ad86b27c30a7afe2366539b393ef51018afa5`.
- Imported the V2 advanced application source, database schema, migrations, tests, UI, Netlify functions, configuration and imagery as a snapshot. The original V2 and legacy repositories were not changed.
- Replaced V2-only repository instructions and roadmap with V3-specific documents.
- Excluded obsolete V2 Netlify setup, old site-ID guard, outdated Supabase database migration notes, WhatsApp setup notes and internal commercial workflow notes.
- No migrations have been run and no production deployment has been made.

## Focused corrections included in the import

1. Updated the PII encryption test to import the renamed server-only module `pii-crypto.server.ts`.
2. Restricted Partner role permissions: no `own_applications` or `own_documents`; retains own profile/support, own referrals and own payout view.
3. Restricted customer application and draft server actions to actual customer accounts, not partner accounts.
4. Removed customer application/draft loaders and the general applicant-document panel from the Partner portal. The dedicated, permission-controlled partner supplier-upload component remains.
5. Changed normal password login to use the server-resolved workspace redirect instead of always navigating to the customer dashboard.
6. Made failed Identity-to-Oxford provisioning explicit where an email conflict prevents safe auto-linking. No automatic account takeover/linking is performed.
7. Forced the initial Super Administrator bootstrap's production flag to false; the V3 bootstrap path is Deploy Preview-only.
8. Removed the V2 Netlify site ID and hard-coded V2 site URL from the API function; it now reads Netlify-provided deployment environment values.
9. Removed the V2 Netlify site-specific build allow-list. V3 builds are deliberately skipped until the dedicated V3 Netlify site ID is verified and the guard is updated.
10. Removed confidential commercial fee rates from the public V3 fee calculator and tests. The calculator fails closed pending approved restricted configuration. Settlement recording remains disabled.

These are source-level corrections only; they are not yet validated by a full build or tests.

## Outstanding high-priority work

- Run build, typecheck, tests and lint; fix any import/type/lint failures and add regression coverage.
- Verify customer-only access and partner referral isolation across every server action, document API and direct route.
- Complete partner referral starter-intake creation without collecting applicant-sensitive data.
- Credit assessment currently accepts debit-reversal summary counts from the browser. Persist transaction-level evidence and require server-side human verification before applying the greater-than-two manual-review gate.
- Audit provisioning and role mutations, including the bootstrap's one-time history checks and disabled/suspended account behavior.
- Complete full customer invitation claim, ownership, status, PDF, document upload/download, notification and audit end-to-end testing.
- Complete storage split-failure recovery, upload concurrency, signed URL expiry and server-side ownership tests.
- Add V3 Netlify project/site and database branch only after selecting the correct connected Netlify account. No V3 Netlify project has been created in this step.
- Review all migration files against the new V3 database before any preview migration. Never assume V2 database migration history applies to V3.

## Provider verification (read-only, previous audit)

- V2 Netlify feature flags for applications, document uploads and email delivery were disabled.
- V2 Netlify variable names for Supabase, PII encryption and Brevo were present; values were not recorded.
- Supabase project was active and healthy.
- `oxford-customer-documents` bucket was private, configured for PDF/JPEG/PNG, had a 10 MiB bucket limit and zero stored objects. Anon/authenticated storage-object access was denied by policy.
- Supabase also contained five empty public finance-related tables with RLS enabled and no client policies. They remain untouched and are not the authoritative application database.
- No provider configuration, production variables, production database records, bucket settings or V2 repositories were changed.

## Security and evidence limitations

- Previous V2 recovery Deploy Preview secret scan reported no matches across its scanned files.
- Previous static scan of V2 advanced text files found no obvious hard-coded API keys, private keys or literal tokens. Two test files contained ID-shaped synthetic values.
- The latest V2 advanced Deploy Preview failed during build with exit code 2. A stale PII test import was identified and corrected in V3, but the detailed Netlify log was not available to establish that as the sole failure cause.
- A local test runner was not available during this step: the connected Windows desktop device was offline. No V3 build, typecheck, test or lint command has yet been run.
- No V3 Netlify project has been created, so there is no V3 Deploy Preview or V3 build evidence yet.
- Source presence is not end-to-end acceptance. Login, ownership, partner isolation, invitations, storage, email, credit assessment, settlement and production workflows remain unverified.

## Changes made in V3

- Initial V3 README and recovery branch created.
- Sanitised application source snapshot imported into `recovery/import-verified-baseline`.
- V3-specific README, AGENTS, PLAN, architecture, environment and security documents added.
- No production deployment, database migration, provider configuration change or feature activation performed.

## Validation update — 11 November 2026

This dated update records evidence obtained after the initial 10 November import audit. It does not change the historical statements above about the import step.

- V3 working branch: `fix/v3-desktop-validation-baseline`. Latest tested application-code commit: `63f068c3f8ba785888bf8ce99dba23743709d40a`. The recovery plan, README, storage guide and environment evidence are updated in the current documentation revision. PR #2 remains open, draft and unmerged.
- V2 and legacy repositories remain unchanged. V3 remains the only repository being modified.
- High-confidence secret-pattern scan found no matches in the tracked working tree or reachable Git history; no tracked `.env` files were found. This is a focused static scan, not a complete security certification.
- Local validation passed: TypeScript, 130 automated tests across 23 files, ESLint, Prettier, Vite client/SSR build and `git diff --check`.
- V3 Deploy Preview `6af41e03be5840b641e7bbfc` is ready with three server functions. M20 migration `20261111150000_m20_configurable_credit_assessment_rules` is confirmed applied to the isolated `fix/v3-desktop-validation-baseline` database branch. No production migration was run.
- Eight public routes returned HTTP 200. The deployed credit-assessment route bundle returned HTTP 200 and contains the separate Individual/Business financial assessment and Super Administrator rules interface.
- The document API health endpoint returned HTTP 200 for the exact preview origin and HTTP 403 for an unrelated Deploy Preview origin.
- Current preview health reports the bucket is configured but not verified, encryption is not configured, document uploads are disabled and live applications are disabled. The existing bucket's private configuration was previously inspected read-only on 9 November; the current V3 server cannot verify storage without the missing Supabase server secret.
- Netlify Identity settings return HTTP 404 because Identity is not enabled for the V3 site. The Netlify environment-variable write returned HTTP 403, so the preview bootstrap flag and required server secrets remain externally blocked.
- The PII encryption key and Supabase server secret are absent. Brevo credentials are absent. Email and WhatsApp delivery, application submission, document upload/download, settlements and payouts remain disabled.
- The 100-point assessment rules are versioned and Super Administrator-configurable, but no active ruleset is seeded. The initial template weights are not Oxford policy and must be reviewed and explicitly approved before reviewers can save assessment reports.
- No real applicant data was used. No production deployment, live provider notification, customer document upload, settlement or payout was performed. Legal and regulatory readiness requires qualified professional review.
