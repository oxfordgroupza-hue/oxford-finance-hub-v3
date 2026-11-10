# M0 Initial Recovery Audit

Date: 10 November 2026
Status: Initial read-only audit; source import and full validation remain outstanding.

## Repository state

- V3 target: `oxfordgroupza-hue/oxford-finance-hub-v3` — public and initially empty.
- V2 recovery baseline: `183ea2117d4be9a587a1632f68e8245091a72897`.
- V2 advanced workflow head: `9c4ad86b27c30a7afe2366539b393ef51018afa5`.
- V2 advanced branch is four commits ahead of the recovery baseline; the comparison identifies three changed paths, including the move of applicant encryption into a server-only module.
- The V2 recovery Deploy Preview is Ready. The latest advanced-branch Deploy Preview failed during the build stage with exit code 2.
- The original legacy repository contains fewer tracked files than V2 advanced. Its unique files are old briefs/handoff material and the earlier non-server-only PII module; these are not preferred import sources.
- V2 PR #3 and PR #4 have not been modified or merged.

## Candidate baseline

Use the verified recovery baseline plus the approved server-only PII changes from the advanced branch. Do not use V2 main alone. Import as a documented V3 baseline snapshot because the empty V3 repository cannot reference V2 Git objects directly.

## Build defect found

The advanced branch renamed `src/lib/pii-crypto.ts` to `src/lib/pii-crypto.server.ts`, but `src/lib/pii-crypto.test.ts` still imports the deleted old path. The TypeScript configuration includes test files and the Netlify build runs typecheck and Vitest. Correct the test import in V3 and run the complete validation pipeline. The available Netlify deployment summary does not expose the detailed build log, so the stale import is a strong candidate cause, not a claim of confirmed exclusive cause.

## Security and business-rule corrections required before release

1. The V3 repository is public. Do not import internal commercial fee values or internal fee schedules from V2 source, tests or documentation. Keep the settlement gate closed and move approved terms to restricted server-side configuration. The public fee module must not contain Oxford's confidential rates.
2. Replace the V2 `AGENTS.md`, README, PLAN and Netlify setup instructions with V3-specific documentation. Do not carry over V2-only branch restrictions or obsolete OneDrive/Graph/Supabase-database migration instructions.
3. Remove the V2 Netlify site-ID ignore rule from V3. Configure a build guard only after the V3 Netlify site exists and its ID is verified.
4. Partner currently has `own_applications` and `own_documents` permissions; the Partner dashboard also loads personal applications/drafts and renders a generic document panel. Restrict Partner to referrals, profile, support and explicitly permitted supplier uploads/payouts.
5. The application server actions currently allow partner accounts through customer application/draft paths. Separate customer ownership from partner referral/upload operations.
6. Normal login navigates to `/dashboard`; that route does not redirect Partner to `/partner`. Fix role-aware navigation.
7. Provisioning silently ignores unique-email conflicts and may leave a confirmed Identity account unprovisioned. Detect and report conflicts without auto-linking identities.
8. Super Admin bootstrap code permits a production bootstrap when a special flag is enabled. V3 must enforce preview-only, one-time bootstrap.
9. Credit assessment includes the six weighted dimensions and debit-order reversal threshold logic, but the report currently accepts summary counts from the browser and does not persist the required transaction-level reversal evidence. Complete server-side evidence capture and verification.
10. Partner-originated starter-intake creation is not present in the current Partner actions; implement the approved referral-intake path without collecting applicant-sensitive data.

## Provider verification (read-only)

- V2 Netlify feature flags for applications, document uploads and email delivery are disabled.
- V2 Netlify environment variable names for the Supabase, PII-encryption and Brevo integrations are present. Values were not recorded in this report.
- The configured Supabase URL and bucket name match the documented project and bucket.
- Supabase project is active and healthy.
- `oxford-customer-documents` is private, has the documented 10 MiB bucket limit and allows PDF/JPEG/PNG. A deny-all policy applies to anon/authenticated roles for storage objects. The bucket currently contains zero objects.
- Supabase also contains five empty public finance-related tables with RLS enabled and no client policies. Do not use them as authoritative application tables; leave them untouched.
- No provider configuration, production variables, production database records, bucket settings or V2 repositories were changed.

## Evidence and limitations

- The recovery Deploy Preview secret scan reported no matches across its scanned files.
- A static scan of the advanced branch's text files found no obvious hard-coded API keys, private keys or literal tokens. Two test files contain ID-shaped synthetic test values that should remain clearly synthetic.
- The latest advanced Deploy Preview did not complete its Netlify validation scan because the build failed.
- Code presence is not end-to-end acceptance. Login, customer ownership, partner isolation, invitations, storage uploads/downloads, email delivery, credit assessment, settlement and production workflows remain unverified until their respective tests pass.

## Changes made in V3 so far

- Added a safe V3 recovery README on `main`.
- Created branch `recovery/import-verified-baseline`.
- No application source has been imported yet.
- No production deployment or feature activation has been performed.
