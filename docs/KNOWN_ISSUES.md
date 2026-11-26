## Current-state addendum — 25 November 2026

The authoritative, detailed current release assessment is [RELEASE_READINESS.md](RELEASE_READINESS.md). Additional blockers confirmed in this pass:

- The latest bounded multipart streaming parser has not yet passed its Cloudflare build; do not enable uploads.
- Neon Preview has no migration-history table. SQL migration files are stored under `db/migrations/`; a verified Neon baseline/repeatable migration process is required.
- No explicit Neon snapshot schedule was found for the Preview or default branch; no snapshot or restore test was verified.
- Neon Preview has zero users. The owner-controlled Super Administrator registration, email verification and first sign-in/bootstrap have not happened.
- Preview email is limited to the approved Oxford-owned mailbox. It is not a production staff-recruitment mail configuration.
- The current Preview application form is for synthetic testing only. Real submissions and documents remain unavailable.

---

# V3 known issues and release blockers

**Release status: not ready for production.**

## Runtime and integration

- Cloudflare-native auth code is present and unit-tested, but signup, email verification, recovery, login/logout, session revocation and bootstrap have not completed end-to-end acceptance.
- No Super Administrator account exists in Preview. Initial bootstrap is allow-listed to the approved Oxford-owned mailbox.
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

- Latest source build passed 39 test files / 216 tests, TypeScript and ESLint (0 errors, 2 generated-file warnings).
- Changed-files-only Prettier check remains outstanding.
- Responsive smoke checks found no horizontal overflow. The prior image paths were broken; source now imports local assets and deployment 61 includes the bundled files. Final browser visual confirmation remains outstanding due temporary browser-rendering service rate limiting.
- Qualified legal/compliance review of POPIA, FICA, NCA, privacy notices, retention and complaints is outstanding.

## Production controls

PR #9 remains draft and unmerged. Production Worker, secrets, database, DNS, `finance.oxfordbusinessgroup.co.za`, live processing remains disabled; the production database, secrets and DNS were not changed. Production release requires separate explicit approval.
