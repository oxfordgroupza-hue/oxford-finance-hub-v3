## Current-state addendum — 26 November 2026

Development branch HEAD: `d0fcc2cb61570b43bc6246187a7dc6ed8058d2ce`. Cloudflare Workers Build `1ed97f2d-b578-4c94-b81e-38ace98786cd` completed successfully for this test/documentation update on 26 November 2026. The configured Cloudflare Vite build, Wrangler type generation, TypeScript, Vitest and ESLint pipeline passed; the build record did not separately expose the final test count. The commit adds the seven-role permission-engine regression matrix and documentation only; runtime application code is unchanged.

The last independently identified immutable runtime Preview URL remains `https://ec8f277b-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/`, built from functional source commit `045d5b1d6015ef02513e1694d660d9ea8823f23b`. Stable branch Preview: `https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/`. The latest build-list response did not expose a new immutable Preview URL.

Earlier read-only GET checks of Preview `/`, `/apply` and `/login` returned HTTP 200 on the functional-source deployment. No application was submitted and no email was sent. Cloudflare Workers Builds remains the active validation pipeline; GitHub Actions was not used.

---


## Authorization regression coverage added — 26 November 2026

`src/lib/access-control-matrix.test.ts` adds table-driven unit coverage for all seven role templates. It checks each role's exact effective permission set, rejects role assignments whose audience does not match the account type, verifies account-type ceilings even when every catalogue permission is individually granted, and locks down the service-account restrictions.

This is permission-engine unit coverage, not the complete authorization acceptance gate. It does not exercise authenticated direct routes or server functions, database-loaded role assignments, reviewer assignment, customer ownership, or partner referral isolation. Those end-to-end checks remain outstanding. The Cloudflare Workers Build triggered by this commit must pass before this new suite is considered verified.

---

# V3 testing and acceptance evidence

## Full Preview build command

```sh
pnpm cf:build && pnpm exec wrangler types worker-configuration.d.ts && pnpm typecheck && pnpm test && pnpm lint
```

## Latest successful branch validation

Build `1ed97f2d-b578-4c94-b81e-38ace98786cd`, commit `d0fcc2cb61570b43bc6246187a7dc6ed8058d2ce`:
- Cloudflare Vite build: passed.
- Wrangler type generation: passed.
- TypeScript: passed.
- Vitest: passed, including `src/lib/access-control-matrix.test.ts`; the build record did not surface a test count.
- ESLint: passed.
- Cloudflare Preview build pipeline outcome: success.

The latest commit changes tests and documentation only. The last independently identified immutable runtime Preview remains `https://ec8f277b-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/`, based on functional source commit `045d5b1`.

## Runtime checks completed on the preceding Preview deployment

- Health endpoint: HTTP 200; Supabase configured, bucket configured, storage verified, PII encryption configured, Neon authoritative.
- Same-origin unauthenticated document API POST: HTTP 401 as expected.
- 17 routes checked: public routes render; unauthenticated dashboard/Office/Admin/Partner routes redirect to login.
- Desktop/tablet/mobile smoke check found no horizontal overflow on the tested routes.
- The initial visual smoke check found broken image paths. The source fix is built and deployed in deployment 61; post-deployment visual confirmation remains outstanding because the browser-rendering service is rate-limited.

## Still required

- Authentication lifecycle and one-time Super Administrator bootstrap.
- Staff invitation/activation.
- Seven-role direct-route and server-function authorization matrix.
- Eight Individual/Business × four finance-category application journeys.
- Office intake and partner referral/merchant workflows.
- Dummy document upload/download/isolation/recovery.
- Brevo delivery/failure tests to the approved Preview mailbox.
- PBKDF2 Worker benchmark.
- Backup/restore test.
- Changed-files-only Prettier check, accessibility and visual responsive acceptance.
- Final security and qualified legal/compliance review.

Use synthetic Preview identities and dummy documents only. No production or real customer data may be used in acceptance tests.
