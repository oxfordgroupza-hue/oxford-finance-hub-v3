# V3 known issues and release blockers

**Status:** Production hosting is on Cloudflare. Public pages are deployed; real application processing remains disabled.

## Runtime and integration
- Authentication code is implemented and unit-tested, but the complete signup, verification, recovery, login/logout, session revocation and bootstrap lifecycle still needs end-to-end acceptance.
- The designated Super Administrator account is unverified and has no active role assignment.
- PBKDF2 Worker runtime performance has not been benchmarked.
- Staff invitation and activation require end-to-end verification.
- The private document bucket is configured; uploads remain disabled and no customer documents have been uploaded.
- Email configuration exists, but production delivery has not passed an end-to-end test. Notification delivery remains disabled.
- Neon migration history and repeatable migration execution are not yet verified.
- Backup schedule, restore and recovery-point testing remain outstanding.

## Workflow acceptance
- Seven roles and 90 permission keys exist in the catalogue; the complete route and server-function isolation matrix is not accepted.
- Individual and Business application workflows need synthetic end-to-end tests.
- Office intake, partner referral attribution, merchant linking and customer claim lifecycle remain unverified.
- Fee, VAT and settlement calculations require business-term acceptance. Settlement and payout execution remain disabled.
- Credit assessment must remain a human review aid; no automated approval/decline or bureau claim is permitted.

## Quality and compliance
- The latest production Cloudflare build completed successfully.
- Preview acceptance for the current metadata and runtime cleanup changes is still required before merging.
- Responsive, accessibility and final visual review must be repeated after significant UI changes.
- Qualified review of POPIA, FICA, NCA, privacy notices, retention and complaints handling is outstanding.

## Production controls
Production applications and document uploads are disabled. Notification delivery is disabled. Do not enable live customer processing until the relevant technical, security, operational and compliance acceptance has been completed.
