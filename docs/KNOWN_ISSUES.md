# V3 known issues and release blockers

**Release status: not ready for production.**

## Runtime and integration

- Cloudflare-native auth code is present and unit-tested, but signup, email verification, recovery, login/logout, session revocation and bootstrap have not completed end-to-end acceptance.
- No Super Administrator account exists in Preview. The initial bootstrap is allow-listed to the approved Oxford-owned mailbox.
- PBKDF2 Worker runtime performance has not been benchmarked.
- Staff invitation/activation requires end-to-end verification.
- Supabase health and private bucket verification pass; uploads remain disabled and no files have been uploaded.
- Brevo secret/sender configuration exists in Preview; no email has been sent.
- Neon backup/restore has not been tested; no explicit snapshot schedule was found.

## Workflow acceptance

- Seven roles and 90 permission keys exist in the catalogue; the full route/server-function isolation matrix is not accepted.
- The eight Individual/Business × four finance-category application combinations have not completed end-to-end tests.
- Office-created intake, partner referral attribution, merchant linking and customer claim lifecycle remain unverified.
- Fee/VAT/settlement calculations require final business-term acceptance; no settlement or payout execution is enabled.
- Credit assessment must remain a human review aid; no automated approval/decline or bureau claim is permitted.

## Quality

- Latest source build before the image remediation passed 39 test files / 216 tests, TypeScript and ESLint (0 errors, 2 generated-file warnings).
- Changed-files-only Prettier check remains outstanding.
- Responsive smoke checks found no horizontal overflow, but finance imagery was missing in Preview. The source now bundles local assets; verify the new build before marking this fixed.
- Legal/compliance review of POPIA, FICA, NCA, privacy notices, retention and complaints is outstanding.

## Production controls

PR #9 remains draft and unmerged. Production Worker, secrets, database, DNS, `finance.oxfordbusinessgroup.co.za`, Netlify rollback and live processing remain untouched. Production release requires separate explicit approval.
