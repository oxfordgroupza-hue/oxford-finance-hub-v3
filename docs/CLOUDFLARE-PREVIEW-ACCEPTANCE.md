# Cloudflare Preview acceptance

## Architecture
The application runs on Cloudflare Workers, uses Neon PostgreSQL through Hyperdrive, stores documents in a private Supabase Storage bucket and uses Brevo for transactional email.

## Preview checks
- Confirm the preview Worker uses the isolated preview Neon branch.
- Confirm Preview and Production secrets and bindings are separate.
- Confirm preview hostname validation rejects unknown hosts and production-only routes.
- Confirm browser requests cannot import the server database client.
- Run `pnpm cf:build`, `pnpm typecheck`, `pnpm test` and `pnpm lint`.
- Test login, logout, account verification, recovery, role permissions and denied access with controlled test accounts.
- Test document upload/download authorization only in an isolated test environment with synthetic files.
- Confirm the bucket remains private and direct public object access is denied.
- Confirm all production-only features remain disabled in Preview unless a specific isolated test explicitly enables them.

## Email and notifications
Do not send live messages to customers during acceptance. Use only an explicitly approved test recipient and verify the configured host, origin and feature flags before testing delivery.

## Production boundary
Preview acceptance does not authorize a production database migration, customer intake, document uploads, notification delivery or a change to production feature flags.
