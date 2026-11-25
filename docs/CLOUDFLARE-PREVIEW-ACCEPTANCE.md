# Cloudflare preview acceptance — Oxford Finance Hub V3

**Current branch:** `work/v3-cloudflare-native-auth`  
**Current preview:** `https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/`  
**Production status:** unchanged; no custom hostname or DNS cutover.

## Verified source and deployment state — 25 November 2026

- Cloudflare Worker preview build succeeded for commit `6494a3b5ddd66a1aa02c3d9a02f4dbc6e62e647b` (build `f7bb225f-d8ca-44bb-b581-281c69e1392f`).
- Preview feature flags in the branch's `wrangler.jsonc`: applications enabled for synthetic preview testing; document uploads disabled; email delivery disabled; initial Super Administrator bootstrap disabled.
- A shared origin validator now accepts only the exact HTTPS Cloudflare preview hostname, with no credentials or nonstandard port. It is used by the application route, application actions, applicant-intake invitation origin, authentication email guard, notification delivery, document API and initial administrator bootstrap.
- The homepage and application page now identify the preview correctly and state that document uploads remain disabled.
- No administrator account has been created. No email has been sent. No application has been submitted. No document has been uploaded.
- The preview database is isolated from production. Use synthetic data and dummy files only.

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
