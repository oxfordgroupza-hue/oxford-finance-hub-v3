# Production release readiness

## Current production posture
- Runtime: Cloudflare Worker `oxford-finance-hub-v3-production`.
- Production domain: https://finance.oxfordbusinessgroup.co.za
- Database: Neon production branch through Hyperdrive.
- Document storage: private Supabase bucket `oxford-customer-documents`.
- Application intake: disabled.
- Document uploads: disabled.
- Notification delivery: disabled.
- Authentication email delivery: configured by environment, but the live send path must be verified before account activation is attempted.
- Initial Super Administrator mailbox: `oxfordbusinessgroup@outlook.com`; the account remains unverified and does not yet have an active Super Administrator assignment.

## Required checks before enabling customer processing
1. Confirm the current Cloudflare build completes successfully using the configured production build and deploy commands.
2. Confirm the production Worker version, route, custom domain and 100% traffic allocation.
3. Run typecheck, all tests and lint against the exact release commit.
4. Verify the production Neon schema and migration history before applying any migration. No production migration should be inferred from a successful application deployment.
5. Verify the private storage bucket, access policies, size limits, MIME restrictions and authenticated download path.
6. Complete security review of authentication, account recovery, role permissions, audit history, document authorization and origin validation.
7. Complete the required POPIA, FICA and National Credit Act legal/compliance review with qualified advisers.
8. Verify transactional email and notification delivery with approved test recipients before any operational message is sent.
9. Obtain explicit release approval before enabling application intake, document uploads or notifications.

## Fail-closed release rule
If any check is incomplete, keep the related production feature flag disabled. A deployed Worker does not by itself mean the finance application workflow is ready for live customer use.
