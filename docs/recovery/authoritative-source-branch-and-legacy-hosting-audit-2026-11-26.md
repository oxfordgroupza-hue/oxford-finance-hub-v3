# Authoritative V3 source branch discovery and legacy hosting residue audit

**Review date:** 26 November 2026  
**Repository:** `oxfordgroupza-hue/oxford-finance-hub-v3`  
**Read-only source branches:** `release/v3-production-2026-11-25` and `work/v3-cloudflare-native-auth`  
**Development source head recorded in branch README:** `d0fcc2cb61570b43bc6246187a7dc6ed8058d2ce`  
**Production Worker Git connection:** `release/v3-production-2026-11-25`  
**Destination for follow-up work:** dedicated V3 branch only.

## Correction to the earlier recovery finding

The earlier source-recovery audit inspected V3 `main` and the deployed compiled Worker, and concluded that the V3 repository did not contain the maintainable application source. That conclusion was incomplete: `main` contains only the initial README, but the repository has other branches with the full editable application tree.

Read-only inspection confirmed:
- Cloudflare's Git build configuration for `oxford-finance-hub-v3-production` is connected to repository `oxfordgroupza-hue/oxford-finance-hub-v3`, branch `release/v3-production-2026-11-25`.
- That release branch contains a complete application project, including `package.json`, `pnpm-lock.yaml`, `db/schema.ts`, Vite/Cloudflare configuration, Wrangler configuration, routes, server functions, tests, and documentation.
- The active development branch `work/v3-cloudflare-native-auth` also contains the application source. Its README records a successful Cloudflare Workers Build for head `d0fcc2cb61570b43bc6246187a7dc6ed8058d2ce` and identifies a Cloudflare-native authentication implementation.
- The production release branch and the development branch are distinct. The development branch must be treated as the current source-recovery and improvement base; the production branch must not be overwritten or deployed from during this audit.

Therefore, the original editable V3 application source is available in Git. The remaining problem is not a missing source archive; it is reconciling and cleaning the available source while preserving the currently deployed Cloudflare runtime and the accepted V3 security gates.

## Confirmed Cloudflare/Neon architecture in the development source

- Cloudflare Workers and the Cloudflare Vite plugin are the application runtime/build target.
- `vite.cloudflare.config.ts` routes server database imports to `db/cloudflare.ts`.
- `db/cloudflare.ts` uses Drizzle ORM with `postgres-js` and the Cloudflare `HYPERDRIVE` binding.
- The authentication implementation in `src/lib/auth.ts` uses Oxford-owned credentials, password hashing, verification/recovery challenges and secure HttpOnly session cookies.
- Neon remains the authoritative relational database; Supabase is private document storage only.
- Production application submission and document uploads remain disabled. Do not change production configuration or deploy during this source cleanup.

## Confirmed obsolete Netlify residue in the development branch

The branch tree and source files still contain:
- `@netlify/database` and `@netlify/identity` in runtime dependencies in `package.json`.
- `@netlify/vite-plugin-tanstack-start` in development dependencies.
- A legacy `vite.config.ts` that imports the Netlify Vite plugin and describes Netlify deploy context.
- `db/index.ts` importing `drizzle-orm/netlify-db`.
- `netlify.toml`.
- `netlify/functions/identity.mts` and `netlify/functions/oxford-api.ts`.
- `src/lib/netlify-preview.ts`, its tests, `src/types/netlify-identity.d.ts`, and Netlify-specific identity-verification comments/logic.
- Drizzle migration output still configured as `./netlify/database/migrations`, with the SQL migration history stored under that directory.
- Netlify-related references in README, contributor instructions and migration documentation.

The Cloudflare build uses `vite.cloudflare.config.ts`, not the legacy `vite.config.ts`. That Cloudflare config replaces server database imports with `db/cloudflare.ts`; therefore, the presence of legacy files does not by itself prove the production Worker uses Netlify. It does prove the source repository is not yet clean and that the old paths/dependencies need deliberate removal or migration.

## Required cleanup plan

1. Use `work/v3-cloudflare-native-auth` as the verified application source baseline, with this dedicated branch as the isolated cleanup workspace. Preserve all existing user work and use expected-SHA updates.
2. Inventory every import/reference to the legacy Netlify adapter, Identity hooks, preview guards, migration paths and documentation before deleting anything.
3. Preserve the SQL migration history, but move it to a neutral V3-owned path such as `drizzle/migrations`; update Drizzle configuration and verify no runtime or migration tooling still expects the old directory.
4. Remove the unused Netlify Vite/Database/Identity packages and legacy Netlify-only functions/adapters only after confirming no Cloudflare build, typecheck, test or runtime path depends on them.
5. Regenerate the package lockfile with the repository's pinned pnpm version; do not hand-edit package resolution data.
6. Replace or remove the legacy default Vite config so the Cloudflare build is the single supported application build path.
7. Remove obsolete Netlify preview helpers and tests only after Cloudflare equivalents and their regression coverage are verified.
8. Update all current V3 documentation and CI checks so obsolete hosting references cannot reappear. Keep necessary historical provenance only in explicitly labelled archival notes if the project owner permits it.
9. Run the complete Cloudflare build, Wrangler type generation, TypeScript, all Vitest tests, ESLint, formatting and source/secret/PII scans on the cleanup branch.
10. Do not merge to `main`, change the production Worker Git connection, alter production secrets/DNS/database, deploy, or enable application/upload flags without the separate production release approval required by the repository's current instructions.

## Source status

**Editable source found.** The prior missing-source conclusion is superseded by this report. The source contains active Cloudflare-native application code plus legacy Netlify residue. Cleanup has not yet been performed by this audit; no application code, database, secrets, feature flags or production resources were changed.
