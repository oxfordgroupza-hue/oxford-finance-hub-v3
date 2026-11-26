# Authoritative V3 source branch and Cloudflare-only cleanup audit

Review date: 26 November 2026
Repository: oxfordgroupza-hue/oxford-finance-hub-v3
Source branch: work/v3-cloudflare-native-auth
Production build source branch: release/v3-production-2026-11-25
Cleanup branch: recovery/cloudflare-only-source-cleanup

## Source discovery correction

The earlier recovery report inspected only main and the deployed compiled Worker and incorrectly concluded that maintainable application source was unavailable. The full editable V3 source is present on the production release branch and the active Cloudflare-native development branch. Main is only the initial README baseline.

The Cloudflare production Worker build configuration is connected to release/v3-production-2026-11-25. The active development source is work/v3-cloudflare-native-auth; its README records a successful Cloudflare Workers Build for commit d0fcc2cb61570b43bc6246187a7dc6ed8058d2ce.

## Confirmed current architecture

- Cloudflare Workers is the only supported application runtime.
- The Cloudflare Vite configuration routes server database imports to db/cloudflare.ts.
- db/cloudflare.ts uses Drizzle ORM, postgres-js and the Cloudflare HYPERDRIVE binding.
- Oxford-owned server authentication uses password hashes, one-time challenges and secure HttpOnly sessions.
- Neon PostgreSQL is the authoritative relational database; Supabase is private document storage only.

## Cleanup performed in this branch

- Removed legacy provider packages from package.json and regenerated the pnpm lockfile.
- Made the Cloudflare Vite configuration the default Vite entry point.
- Replaced the legacy database adapter entry point with the Cloudflare adapter.
- Moved the existing SQL migration history to drizzle/migrations without changing migration contents, then updated the Drizzle output path and migration-path tests.
- Removed obsolete legacy serverless functions, deployment configuration, identity SDK declarations, preview guards and their tests.
- Replaced legacy preview-origin test fixtures with the exact approved Cloudflare Workers Preview host.
- Preserved existing private-storage, authentication, authorization, encryption and production feature-gate logic.

## Safety boundary

This is an isolated development-branch cleanup. It does not alter the production Worker, its Git connection, custom domain, secrets, Neon data, Supabase bucket, feature flags or live applicant processing. Production application intake and document uploads remain disabled. No database migrations were executed and no customer data was used.

## Validation still required

Local validation completed successfully: Wrangler type generation, Cloudflare build, TypeScript, 37 Vitest files / 237 tests, ESLint with zero warnings, and Prettier checks for updated documentation/configuration and git diff --check. The branch has not been deployed. A final secret/PII scan and Cloudflare Workers Build on the pushed branch remain required. The branch must not be merged to the source baseline or deployed to production without the separately required release approval.
