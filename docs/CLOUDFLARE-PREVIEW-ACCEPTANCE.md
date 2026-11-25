# Cloudflare preview acceptance — Oxford Finance Hub V3

**Current branch:** `work/v3-cloudflare-native-auth`  
**Current preview:** `https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/`  
**Production status:** unchanged; no custom hostname or DNS cutover.

## Verified source and deployment state — 25 November 2026

- Cloudflare Worker preview build succeeded for commit `6494a3b5ddd66a1aa02c3d9a02f4dbc6e62e647b` (build `f7bb225f-d8ca-44bb-b581-281c69e1392f`).
- Preview feature flags in the branch's `wrangler.jsonc`: applications enabled for synthetic preview testing; document uploads disabled; email delivery enabled only after the dedicated Preview Brevo API key was stored; initial Super Administrator bootstrap enabled for the designated mailbox only. Email has not yet been sent.
- A shared origin validator now accepts only the exact HTTPS Cloudflare preview hostname, with no credentials or nonstandard port. It is used by the application route, application actions, applicant-intake invitation origin, authentication email guard, notification delivery, document API and initial administrator bootstrap.
- The live branch homepage displays the synthetic-preview notice and preview application calls to action. A header navigation button was found hard-coded as `Applications paused`; it has been corrected to `Apply for finance` in commit `7263228a83835affd32361647063d67cb280a65b`, pending its Preview build and runtime check. The application route and all server actions still enforce their own preview gates. Document uploads remain disabled.
- No administrator account has been created. No email has been sent. No application has been submitted. No document has been uploaded.
- A dedicated Brevo API key named `Oxford Finance Hub Preview` was securely added to the branch Preview with Wrangler. The key value was not exposed in chat or committed to source. Production Worker secrets were not copied or reused. The approved sender is active in Brevo.
- The preview database is isolated from production. Use synthetic data and dummy files only.

## Validation results

- Cloudflare Preview build succeeded for commit `46da11978176391c7842702f936b5b6a2617937a`.
- Local Cloudflare build succeeded on the validation worktree.
- Vitest: 39 test files and 212 tests passed after generating the route tree.
- TypeScript and ESLint passed on commit `74360df4e092d1c9cda5a4ab8d3c6b185d97fb4b` after running `wrangler types`.
- A subsequent change moved Preview-context checks to the Cloudflare runtime environment binding. Commit `30efa5bd02fdd80b009297d825f8813f291861fd` built successfully; the branch homepage now returns preview-enabled copy, but the `/apply` route, authenticated flows and latest source changes still require runtime verification. The complete suite has not been rerun on the current branch head.

## Acceptance still outstanding

1. **Initial Super Administrator:** choose and verify the single Oxford-owned test mailbox; align `OXFORD_NOTIFICATION_ADMIN_EMAIL` with `OXFORD_INITIAL_SUPER_ADMIN_EMAIL`; configure the preview-only sender/provider credentials securely; obtain approval before enabling preview email and the one-time bootstrap flag; complete registration, verification, bootstrap, login, role checks and sign-out. Never enable public staff registration.
2. **Staff invitations:** a separate Cloudflare-native staff invitation/activation workflow is not yet implemented. Applicant intake invitations are not staff invitations.
3. **Authentication:** test signup, email verification, login, password recovery, password change, session expiry/revocation, logout, CSRF/origin rejection, lockout and account suspension with synthetic accounts.
4. **RBAC:** test direct routes and direct server functions for all seven account roles, including customer ownership, partner own-referral scope, reviewer assignment, support restrictions and administrator controls.
5. **Applications:** test all eight Individual/Business × finance-category combinations with synthetic data, including validation, ownership, status history and PDF generation. The currently open browser form must not be submitted unless its contents are confirmed synthetic.
6. **Private documents:** verify the private Supabase bucket and PII encryption configuration, then test upload/download, file type/size limits, cross-customer and cross-partner denial, signed access, concurrency and interrupted-operation recovery using dummy files. Keep the upload flag false until the full matrix passes.
7. **Notifications:** test delivery only to the approved Oxford-owned preview mailbox, then test provider errors, retry limits and queue recovery. Keep email/WhatsApp disabled until explicitly approved.
8. **Password hashing:** benchmark the configured PBKDF2 work factor in the actual Cloudflare Worker runtime and document measured latency.
9. **Data resilience:** verify isolated preview migration state, backup/restore and recovery procedures.
10. **Release destination:** attach `finance.oxfordbusinessgroup.co.za` only after acceptance and separate approval for production DNS/custom-domain changes and cutover.

## Release controls

- Do not use real applicant identity, banking, income or financial information in the preview.
- Do not enable document uploads, outbound email/WhatsApp, settlement execution or payouts merely to make a test pass.
- Do not merge the draft pull request, change production Worker settings, alter production DNS, migrate production data or remove the legacy Netlify fallback without separate approval.
- Do not claim POPIA, FICA, NCA or other legal/regulatory compliance based only on implementation. Qualified professional review is required.
